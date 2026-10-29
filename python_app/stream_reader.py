"""
VisionGuard AI - Modul čtení RTSP streamu s Auto-reconnect Watchdogem
Zajišťuje spolehlivé nízko-latenční čtení video streamu z IP kamer v samostatném vlákně.
Při výpadku sítě nebo zamrznutí kamery automaticky provede opětovné připojení (Watchdog).
"""

import os
import cv2
import time
import logging
import threading
from typing import Optional, Tuple, Dict, Any
import numpy as np
from config import Config

logger = logging.getLogger("VisionGuard.StreamReader")


class RTSPStreamReader:
    """
    Spolehlivý čteč RTSP streamu běžící ve vlastním vlákně.
    Zabraňuje zpoždění (frame lagging) v interní frontě OpenCV a provádí auto-reconnect.
    Obsahuje aktivní Watchdog monitorující čas posledního přijatého snímku proti zamrznutí.
    """

    def __init__(
        self,
        rtsp_url: Optional[str] = None,
        reconnect_timeout: Optional[float] = None,
        freeze_timeout: Optional[float] = None
    ):
        self.rtsp_url = rtsp_url or Config.RTSP_URL
        self.reconnect_timeout = reconnect_timeout or Config.RECONNECT_TIMEOUT_SEC
        self.freeze_timeout = freeze_timeout or Config.WATCHDOG_FREEZE_TIMEOUT_SEC

        self.cap: Optional[cv2.VideoCapture] = None
        self.latest_frame: Optional[np.ndarray] = None
        self.last_frame_time: float = 0.0
        self.is_running: bool = False
        self.is_connected: bool = False
        self.reconnect_count: int = 0
        self.frames_received: int = 0

        self._lock = threading.Lock()
        self._thread: Optional[threading.Thread] = None

    def start(self) -> "RTSPStreamReader":
        """Spustí vlákno čtení streamu."""
        if self.is_running:
            return self

        self.is_running = True
        self._thread = threading.Thread(target=self._capture_loop, name="RTSPReaderThread", daemon=True)
        self._thread.start()
        logger.info(f"[StreamReader] Spuštěno čtení pro kameru: {self._mask_url(self.rtsp_url)}")
        return self

    def _open_capture(self) -> bool:
        """Pokusí se otevřít VideoCapture spojení s optimalizovanými flagy pro TCP a nízkou latenci."""
        if self.cap is not None:
            try:
                self.cap.release()
            except Exception:
                pass
            self.cap = None

        # Podpora pro index lokální webkamery (např. '0')
        source = int(self.rtsp_url) if self.rtsp_url.isdigit() else self.rtsp_url

        try:
            if isinstance(source, str) and source.startswith("rtsp://"):
                # Nastavení systémových proměnných FFmpeg pro vynucení TCP transportu
                # TCP eliminuje ztrátu paketů a šedé/poškozené bloky v obraze
                os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = (
                    "rtsp_transport;tcp|analyzeduration;5000000|probesize;5000000|stimeout;5000000"
                )
                self.cap = cv2.VideoCapture(source, cv2.CAP_FFMPEG)
                # Nastavení minimálního bufferu (1 snímek) pro eliminaci zpoždění
                self.cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            else:
                self.cap = cv2.VideoCapture(source)

            if self.cap and self.cap.isOpened():
                ret, frame = self.cap.read()
                if ret and frame is not None:
                    with self._lock:
                        self.latest_frame = frame
                        self.last_frame_time = time.time()
                        self.is_connected = True
                        self.frames_received += 1
                    logger.info("[StreamReader] Spojení s kamerou úspěšně navázáno.")
                    return True

        except Exception as e:
            logger.error(f"[StreamReader] Výjimka při otevírání spojení: {e}")

        logger.warning(f"[StreamReader] Spojení selhalo. Další pokus za {self.reconnect_timeout:.1f}s...")
        return False

    def _capture_loop(self) -> None:
        """Hlavní smyčka vlákna: kontinuální čtení a aktivní Watchdog dohled."""
        while self.is_running:
            # Pokud není spojení navázáno, pokusíme se o reconnect
            if not self.is_connected:
                self.reconnect_count += 1
                success = self._open_capture()
                if not success:
                    time.sleep(self.reconnect_timeout)
                    continue

            # Čtení snímku z VideoCapture
            ret, frame = False, None
            try:
                if self.cap:
                    ret, frame = self.cap.read()
            except Exception as e:
                logger.warning(f"[StreamReader] Chyba při čtení snímku: {e}")
                ret = False

            now = time.time()

            # Kontrola výpadku čtení nebo překročení Watchdog freeze timeoutu
            time_since_last_frame = now - self.last_frame_time
            if not ret or frame is None or (time_since_last_frame > self.freeze_timeout and self.last_frame_time > 0):
                logger.warning(
                    f"[StreamReader Watchdog] Detekována ztráta signálu nebo zamrznutí streamu "
                    f"(poslední snímek před {time_since_last_frame:.1f}s). Restartuji RTSP spojení..."
                )
                with self._lock:
                    self.is_connected = False
                time.sleep(self.reconnect_timeout)
                continue

            # Úspěšně načtený čerstvý snímek -> přepsat starý v paměti
            with self._lock:
                self.latest_frame = frame
                self.last_frame_time = now
                self.is_connected = True
                self.frames_received += 1

            # Krátký spánek pro uvolnění CPU (1 ms)
            time.sleep(0.001)

        # Úklid při ukončení
        if self.cap is not None:
            try:
                self.cap.release()
            except Exception:
                pass
            self.cap = None
        self.is_connected = False

    def get_latest_frame(self) -> Tuple[bool, Optional[np.ndarray], float]:
        """
        Vrátí nejčerstvější dostupný snímek bez blokování.
        Vrací: (is_connected, frame, last_timestamp)
        """
        with self._lock:
            if not self.is_connected or self.latest_frame is None:
                return False, None, 0.0
            return True, self.latest_frame.copy(), self.last_frame_time

    def get_health_status(self) -> Dict[str, Any]:
        """Vrátí přehled o stavu a stabilitě streamu pro monitoring."""
        with self._lock:
            time_since_frame = time.time() - self.last_frame_time if self.last_frame_time > 0 else -1.0
            return {
                "connected": self.is_connected,
                "reconnect_count": self.reconnect_count,
                "frames_received": self.frames_received,
                "seconds_since_last_frame": round(time_since_frame, 2),
                "rtsp_url_masked": self._mask_url(self.rtsp_url),
            }

    def stop(self) -> None:
        """Zastaví čteč a uvolní zdroje."""
        self.is_running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)
        logger.info("[StreamReader] Vlákno streamu bezpečně zastaveno.")

    @staticmethod
    def _mask_url(url: str) -> str:
        """Zamaskuje heslo v RTSP URL pro bezpečné logování."""
        try:
            if "@" in url and "://" in url:
                proto, rest = url.split("://", 1)
                creds, host = rest.split("@", 1)
                if ":" in creds:
                    user, _ = creds.split(":", 1)
                    return f"{proto}://{user}:*****@{host}"
        except Exception:
            pass
        return url
