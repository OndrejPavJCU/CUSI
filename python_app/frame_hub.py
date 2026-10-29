"""
VisionGuard AI - Thread-Safe Frame Hub & MJPEG Broadcaster
Zajišťuje bezpečné sdílení snímků mezi detekční smyčkou OpenCV a webovým serverem.
Zabraňuje chybám souběhu (race conditions), memory leakům a zpoždění obrazu (tearing/lag).
Každý webový klient má vlastní malou frontu (queue.Queue); při zaplnění se starý snímek
okamžitě zahodí (drop-oldest), čímž je zaručena nulová latence a absolutní thread-safety.
"""

import os
import queue
import threading
import logging
from typing import Set, Optional
from pathlib import Path

logger = logging.getLogger("VisionGuard.FrameHub")


class ThreadSafeFrameHub:
    """
    Centrální thread-safe distributor JPEG snímků pro MJPEG streamy.
    Podporuje jak in-process vlákna, tak multi-process sdílení přes atomický soubor.
    """

    def __init__(self, disk_cache_path: Optional[Path] = None):
        self._lock = threading.Lock()
        self._subscribers: Set[queue.Queue] = set()
        self._latest_jpeg: Optional[bytes] = None
        self._disk_cache_path = disk_cache_path

    def subscribe(self, max_buffer_size: int = 1) -> queue.Queue:
        """
        Zaregistruje nového webového klienta pro příjem MJPEG snímků.
        Vrací dedikovanou frontu s omezenou velikostí bufferu (default: 1 snímek).
        """
        client_queue: queue.Queue = queue.Queue(maxsize=max_buffer_size)
        with self._lock:
            self._subscribers.add(client_queue)
            # Pokud již máme čerstvý snímek, ihned ho klientovi poskytneme
            if self._latest_jpeg is not None:
                try:
                    client_queue.put_nowait(self._latest_jpeg)
                except queue.Full:
                    pass
        logger.debug(f"[FrameHub] Připojen nový MJPEG klient (aktivních odběratelů: {len(self._subscribers)})")
        return client_queue

    def unsubscribe(self, client_queue: queue.Queue) -> None:
        """Odregistruje webového klienta a uvolní jeho frontu."""
        with self._lock:
            self._subscribers.discard(client_queue)
        logger.debug(f"[FrameHub] Odpojen MJPEG klient (zbývá odběratelů: {len(self._subscribers)})")

    def publish_frame(self, jpeg_bytes: bytes) -> None:
        """
        Publikuje nový JPEG snímek všem odběratelům v thread-safe režimu.
        Pokud je fronta klienta plná, starý snímek se zahodí (drop) a nahradí novým.
        """
        if not jpeg_bytes:
            return

        with self._lock:
            self._latest_jpeg = jpeg_bytes

            # Rozeslání do všech front odběratelů
            for q in list(self._subscribers):
                try:
                    # Pokus o vložení bez blokování
                    q.put_nowait(jpeg_bytes)
                except queue.Full:
                    # Fronta je plná (pomalý klient nebo síťové zpoždění)
                    # Zahodíme starý snímek a vložíme nejnovější (prevence latence)
                    try:
                        q.get_nowait()
                    except queue.Empty:
                        pass
                    try:
                        q.put_nowait(jpeg_bytes)
                    except queue.Full:
                        pass

        # Volitelný atomický zápis na disk pro nezávislý dashboard proces
        if self._disk_cache_path is not None:
            self._write_atomic_disk_cache(jpeg_bytes)

    def get_latest_frame(self) -> Optional[bytes]:
        """Vrátí kopii nejnovějšího JPEG snímku nebo None."""
        with self._lock:
            return self._latest_jpeg

    def _write_atomic_disk_cache(self, jpeg_bytes: bytes) -> None:
        """Zapíše snímek atomicky (přes dočasný soubor a rename) pro bezpečné meziprocesové čtení."""
        try:
            target_path = Path(self._disk_cache_path)
            target_path.parent.mkdir(parents=True, exist_ok=True)
            temp_path = target_path.with_suffix(".tmp")

            with open(temp_path, "wb") as f:
                f.write(jpeg_bytes)
            
            # Atomické nahrazení cílového souboru v OS
            os.replace(temp_path, target_path)
        except Exception:
            pass


# Singleton instance sdíleného FrameHubu
frame_hub = ThreadSafeFrameHub()
