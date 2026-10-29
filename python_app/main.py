"""
VisionGuard AI - Hlavní spouštěcí skript detekčního servisu (main.py)
Spouští RTSP stream reader, cyklus zpracování snímků s frame skippingem,
thread-safe distribuci snímků přes FrameHub (pro MJPEG live stream bez globálních proměnných),
automatickou retenci dat (DataRetentionWorker) a obsluhu signálů pro korektní ukončení.
"""

import cv2
import time
import signal
import logging
from typing import Optional

from config import Config
from db import DatabaseManager
from stream_reader import RTSPStreamReader
from anpr_engine import ANPREngine
from notifier import TelegramNotifier
from detector import VisionProcessor
from frame_hub import frame_hub
from retention_worker import DataRetentionWorker

# Nastavení formátu logování do konzole
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("VisionGuard.Main")


class VisionGuardService:
    """Hlavní orchestrátor monitorovací služby."""

    def __init__(self):
        logger.info("=" * 65)
        logger.info("  VisionGuard AI - Inteligentní Kamerový Monitorovací Systém")
        logger.info("=" * 65)

        Config.ensure_directories()
        self.db = DatabaseManager()
        self.notifier = TelegramNotifier()
        self.anpr = ANPREngine()
        self.detector = VisionProcessor(self.db, self.notifier, self.anpr)
        self.stream_reader = RTSPStreamReader(Config.RTSP_URL, Config.RECONNECT_TIMEOUT_SEC)

        # Spuštění automatické údržby a retence dat na pozadí (čistí data > RETENTION_DAYS)
        self.retention_worker = DataRetentionWorker(self.db).start()

        # Konfigurace atomického diskového zápisu frame hubu pro nezávislý dashboard proces
        frame_hub._disk_cache_path = Config.LIVE_FRAME_PATH

        self.running = False
        self._setup_signals()

    def _setup_signals(self) -> None:
        """Registrace zachycení Ctrl+C a signálů ukončení (SIGINT, SIGTERM)."""
        signal.signal(signal.SIGINT, self._handle_exit)
        signal.signal(signal.SIGTERM, self._handle_exit)

    def _handle_exit(self, signum, frame) -> None:
        logger.info("\n[Main] Zachycen signál ukončení. Probíhá korektní vypnutí...")
        self.running = False

    def run(self) -> None:
        """Spustí hlavní smyčku zpracování video streamu."""
        self.running = True
        self.stream_reader.start()

        logger.info(f"[Main] Nastaven Frame Skipping: zpracovává se každý {Config.FRAME_SKIP}. snímek.")
        logger.info(f"[Main] Sledované zóny: ROAD_ZONE ({len(Config.ROAD_ZONE)} bodů), GATE_ZONE ({len(Config.GATE_ZONE)} bodů)")
        logger.info(f"[Main] Automatická retence dat aktivní (Lhůta: {Config.RETENTION_DAYS} dní)")
        logger.info("[Main] Systém je aktivní a monitoruje prostor...")

        frame_count = 0
        fps_timer = time.time()
        fps_counter = 0

        try:
            while self.running:
                is_connected, frame, _ = self.stream_reader.get_latest_frame()

                if not is_connected or frame is None:
                    # Kamera není připojena (čeká na reconnect v stream_readeru)
                    time.sleep(0.08)
                    continue

                frame_count += 1
                fps_counter += 1

                # Měření a výpis FPS každých 15 sekund
                if time.time() - fps_timer >= 15.0:
                    current_fps = fps_counter / (time.time() - fps_timer)
                    logger.info(f"[Main Status] Stream je stabilní. Průměrná rychlost: {current_fps:.1f} FPS")
                    fps_timer = time.time()
                    fps_counter = 0

                # Frame skipping pro úsporu výpočetního výkonu
                if frame_count % Config.FRAME_SKIP != 0:
                    time.sleep(0.004)
                    continue

                # Zpracování snímku detektorem (YOLO + Zóny + ANPR)
                annotated = self.detector.process_frame(frame)

                # Thread-safe publikování do FrameHubu pro webový MJPEG stream (žádné globální proměnné!)
                try:
                    ret, jpeg = cv2.imencode(".jpg", annotated, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
                    if ret:
                        frame_hub.publish_frame(jpeg.tobytes())
                except Exception as e:
                    logger.debug(f"[Main] Chyba při kódování JPEG do FrameHubu: {e}")

                # Lokální grafické okno na monitoru (pokud je zapnuto v config.py)
                if Config.ENABLE_WINDOW_DISPLAY:
                    cv2.imshow("VisionGuard AI - Live Monitor", annotated)
                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        break

                # Krátký spánek pro zachování stability cyklu
                time.sleep(0.004)

        except Exception as e:
            logger.error(f"[Main] Neočekávaná chyba v běhu: {e}", exc_info=True)
        finally:
            self.shutdown()

    def shutdown(self) -> None:
        """Uvolní všechny prostředky při ukončení."""
        logger.info("[Main] Uvolňuji zdroje streamu, detektoru a retence dat...")
        self.stream_reader.stop()
        self.retention_worker.stop()
        if Config.ENABLE_WINDOW_DISPLAY:
            cv2.destroyAllWindows()
        logger.info("[Main] Služba byla bezpečně ukončena.")


if __name__ == "__main__":
    service = VisionGuardService()
    service.run()
