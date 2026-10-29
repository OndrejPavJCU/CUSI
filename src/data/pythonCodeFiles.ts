export interface PythonFileItem {
  name: string;
  category: 'core' | 'config' | 'web' | 'tools' | 'docs';
  description: string;
  code: string;
}

export const PYTHON_PROJECT_FILES: PythonFileItem[] = [
  {
    name: 'config.py',
    category: 'config',
    description: 'Centrální konfigurace, RTSP parametry, souřadnice polygonů ROAD_ZONE & GATE_ZONE, Basic Auth a retence dat.',
    code: `"""
VisionGuard AI - Centrální konfigurace aplikace
Načítá proměnné z .env a definuje parametry detekce, polygonových zón, cooldown intervalů,
autentizace do webového dashboardu a automatické retence dat.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Načtení proměnných prostředí z .env souboru
BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")


class Config:
    # -------------------------------------------------------------------------
    # 1. ZPRACOVÁNÍ VIDEOSTREAMU & RTSP
    # -------------------------------------------------------------------------
    RTSP_URL: str = os.getenv(
        "RTSP_URL",
        "rtsp://admin:HesloKamer123@192.168.1.108:554/h264Preview_01_main"
    )

    # Frame skipping: zpracovávat každý N-tý snímek (např. 3 = při 25 fps zpracujeme ~8 fps, šetří 65 % výkonu)
    FRAME_SKIP: int = int(os.getenv("FRAME_SKIP", "3"))

    # Automatické znovupřipojení při výpadku spojení (Watchdog interval v sekundách)
    RECONNECT_TIMEOUT_SEC: float = float(os.getenv("RECONNECT_TIMEOUT_SEC", "5.0"))
    WATCHDOG_FREEZE_TIMEOUT_SEC: float = float(os.getenv("WATCHDOG_FREEZE_TIMEOUT_SEC", "8.0"))

    # Zda zobrazovat lokální OpenCV okno na obrazovce
    ENABLE_WINDOW_DISPLAY: bool = os.getenv("ENABLE_WINDOW_DISPLAY", "false").lower() == "true"

    # Pre-processing obrazu pro noční IR režim (CLAHE a odšumění)
    ENABLE_IR_NIGHT_ENHANCEMENT: bool = os.getenv("ENABLE_IR_NIGHT_ENHANCEMENT", "true").lower() == "true"

    # -------------------------------------------------------------------------
    # 2. DETEKČNÍ MODELY (YOLO & OCR) & HARDWAROVÁ AKCELERACE
    # -------------------------------------------------------------------------
    YOLO_MODEL_PATH: str = os.getenv("YOLO_MODEL_PATH", "yolov8n.pt")
    DEVICE_PREFERENCE: str = os.getenv("DEVICE_PREFERENCE", "auto")
    DETECTION_CONF_THRESHOLD: float = float(os.getenv("DETECTION_CONF_THRESHOLD", "0.45"))

    PERSON_CLASS_ID: int = 0
    VEHICLE_CLASS_IDS: list[int] = [2, 3, 5, 7]  # car, motorcycle, bus, truck
    OCR_LANGUAGES: list[str] = ["en", "cs"]
    PLATE_MIN_LENGTH: int = 5
    PLATE_MAX_LENGTH: int = 8

    # -------------------------------------------------------------------------
    # 3. DEFINICE POLYGONÁLNÍCH ZÓN (X, Y souřadnice v pixelech)
    # -------------------------------------------------------------------------
    ROAD_ZONE: list[tuple[int, int]] = [
        (40, 220),
        (520, 230),
        (580, 720),
        (20, 720),
    ]

    GATE_ZONE: list[tuple[int, int]] = [
        (650, 310),
        (960, 310),
        (980, 720),
        (640, 720),
    ]

    # -------------------------------------------------------------------------
    # 4. DEBOUNCE / COOLDOWN LOGIKA (v sekundách)
    # -------------------------------------------------------------------------
    ANPR_COOLDOWN_SEC: int = int(os.getenv("ANPR_COOLDOWN_SEC", "180"))  # 3 minuty
    PERSON_COOLDOWN_SEC: int = int(os.getenv("PERSON_COOLDOWN_SEC", "120"))  # 2 minuty
    PERSON_CROP_PADDING_PX: int = 25

    # -------------------------------------------------------------------------
    # 5. ULOŽIŠTĚ, DATABÁZE & RETENCE DAT (DATA CLEANUP)
    # -------------------------------------------------------------------------
    DATA_DIR: Path = BASE_DIR / "data"
    CAPTURES_DIR: Path = DATA_DIR / "captures"
    PERSON_CAPTURES_DIR: Path = CAPTURES_DIR / "persons"
    VEHICLE_CAPTURES_DIR: Path = CAPTURES_DIR / "vehicles"
    DB_PATH: Path = DATA_DIR / "visionguard.db"
    LIVE_FRAME_PATH: Path = CAPTURES_DIR / "live_frame.jpg"

    # Automatická retence dat: smazat záznamy a fotografie starší než N dní
    RETENTION_DAYS: int = int(os.getenv("RETENTION_DAYS", "14"))
    RETENTION_CHECK_INTERVAL_HOURS: int = int(os.getenv("RETENTION_CHECK_INTERVAL_HOURS", "6"))

    # -------------------------------------------------------------------------
    # 6. TELEGRAM NOTIFIKACE
    # -------------------------------------------------------------------------
    ENABLE_TELEGRAM: bool = os.getenv("ENABLE_TELEGRAM", "true").lower() == "true"
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_CHAT_ID: str = os.getenv("TELEGRAM_CHAT_ID", "")

    # -------------------------------------------------------------------------
    # 7. ZABEZPEČENÝ WEBOVÝ DASHBOARD (FastAPI + HTTP Basic Auth)
    # -------------------------------------------------------------------------
    DASHBOARD_HOST: str = os.getenv("DASHBOARD_HOST", "0.0.0.0")
    DASHBOARD_PORT: int = int(os.getenv("DASHBOARD_PORT", "8000"))
    DASHBOARD_USERNAME: str = os.getenv("DASHBOARD_USERNAME", "admin")
    DASHBOARD_PASSWORD: str = os.getenv("DASHBOARD_PASSWORD", "VisionGuard2026!")

    MJPEG_FPS: int = int(os.getenv("MJPEG_FPS", "15"))
    MJPEG_MAX_CLIENTS: int = int(os.getenv("MJPEG_MAX_CLIENTS", "8"))

    @classmethod
    def ensure_directories(cls) -> None:
        """Vytvoří potřebné složky pro ukládání dat a ořezů snímků."""
        cls.DATA_DIR.mkdir(parents=True, exist_ok=True)
        cls.CAPTURES_DIR.mkdir(parents=True, exist_ok=True)
        cls.PERSON_CAPTURES_DIR.mkdir(parents=True, exist_ok=True)
        cls.VEHICLE_CAPTURES_DIR.mkdir(parents=True, exist_ok=True)
`
  },
  {
    name: '.env.example',
    category: 'config',
    description: 'Šablona proměnných prostředí pro RTSP kameru, Basic Auth heslo, retenci dat a Telegram.',
    code: `# ============================================================
# VISIONGUARD AI - KONFIGURAČNÍ PROMĚNNÉ PROSTŘEDÍ (.env)
# ============================================================

# RTSP Stream z IP kamery (nebo '0' pro lokální webkameru)
RTSP_URL="rtsp://admin:HesloKamer123@192.168.1.108:554/h264Preview_01_main"

# Frame skipping: zpracovávat každý N-tý snímek (3 = ~8 FPS při 25 FPS streamu, šetří 65 % výkonu)
FRAME_SKIP=3

# Reconnect a Watchdog timeout v sekundách při zamrznutí nebo výpadku RTSP streamu
RECONNECT_TIMEOUT_SEC=5.0
WATCHDOG_FREEZE_TIMEOUT_SEC=8.0

# Hardwarová akcelerace: 'auto' (detekuje CUDA GPU, jinak fallback na CPU), 'cuda', nebo 'cpu'
DEVICE_PREFERENCE="auto"

# Pre-processing obrazu pro noční IR režim (CLAHE vyrovnání kontrastu a odšumění)
ENABLE_IR_NIGHT_ENHANCEMENT=true

# Cooldown / Debounce intervaly (v sekundách)
ANPR_COOLDOWN_SEC=180
PERSON_COOLDOWN_SEC=120

# Údržba a automatická retence dat (Data Cleanup)
# Smazat záznamy a soubory starší než definovaný počet dní (chrání disk před zaplněním)
RETENTION_DAYS=14
RETENTION_CHECK_INTERVAL_HOURS=6

# Telegram Bot Integrace
TELEGRAM_BOT_TOKEN="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
TELEGRAM_CHAT_ID="987654321"
ENABLE_TELEGRAM=true

# Lokální grafické okno s OpenCV (true / false)
ENABLE_WINDOW_DISPLAY=false

# Zabezpečený Webový Dashboard (FastAPI)
DASHBOARD_HOST="0.0.0.0"
DASHBOARD_PORT=8000
DASHBOARD_USERNAME="admin"
DASHBOARD_PASSWORD="VisionGuard2026!"
`
  },
  {
    name: 'stream_reader.py',
    category: 'core',
    description: 'Nízko-latenční čtení RTSP streamu s aktivním Watchdogem proti zamrznutí a TCP transportem.',
    code: `"""
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

        source = int(self.rtsp_url) if self.rtsp_url.isdigit() else self.rtsp_url

        try:
            if isinstance(source, str) and source.startswith("rtsp://"):
                os.environ["OPENCV_FFMPEG_CAPTURE_OPTIONS"] = (
                    "rtsp_transport;tcp|analyzeduration;5000000|probesize;5000000|stimeout;5000000"
                )
                self.cap = cv2.VideoCapture(source, cv2.CAP_FFMPEG)
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
            if not self.is_connected:
                self.reconnect_count += 1
                success = self._open_capture()
                if not success:
                    time.sleep(self.reconnect_timeout)
                    continue

            ret, frame = False, None
            try:
                if self.cap:
                    ret, frame = self.cap.read()
            except Exception as e:
                logger.warning(f"[StreamReader] Chyba při čtení snímku: {e}")
                ret = False

            now = time.time()
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

            with self._lock:
                self.latest_frame = frame
                self.last_frame_time = now
                self.is_connected = True
                self.frames_received += 1

            time.sleep(0.001)

        if self.cap is not None:
            try:
                self.cap.release()
            except Exception:
                pass
            self.cap = None
        self.is_connected = False

    def get_latest_frame(self) -> Tuple[bool, Optional[np.ndarray], float]:
        """Vrátí nejčerstvější dostupný snímek bez blokování."""
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
`
  },
  {
    name: 'preprocessor.py',
    category: 'core',
    description: 'Předzpracování obrazu pro noční IR režim: CLAHE ekvalizace jasu na LAB L-kanálu a odšumění.',
    code: `"""
VisionGuard AI - Modul předzpracování obrazu (Image Preprocessor)
Zajišťuje vylepšení kontrastu, adaptivní ekvalizaci histogramu (CLAHE)
a odšumění pro spolehlivou detekci v nočním infračerveném (IR) režimu kamer.
"""

import cv2
import numpy as np
import logging
from typing import Tuple

logger = logging.getLogger("VisionGuard.Preprocessor")


class ImageEnhancer:
    """Třída pro předzpracování obrazu a noční IR adaptaci."""

    def __init__(self, clip_limit: float = 2.5, tile_grid_size: Tuple[int, int] = (8, 8)):
        self.clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)

    def enhance_ir_frame(self, frame: np.ndarray, apply_denoise: bool = True) -> np.ndarray:
        """
        Aplikuje CLAHE vyrovnání jasu na L-kanál (LAB prostor) a volitelně mírné odšumění.
        Zvyšuje kontrast textu SPZ a obrysů postav v nočních podmínkách bez přepálení.
        """
        if frame is None or frame.size == 0:
            return frame

        try:
            lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
            l_channel, a_channel, b_channel = cv2.split(lab)
            enhanced_l = self.clahe.apply(l_channel)
            merged_lab = cv2.merge((enhanced_l, a_channel, b_channel))
            enhanced_frame = cv2.cvtColor(merged_lab, cv2.COLOR_LAB2BGR)

            if apply_denoise:
                enhanced_frame = cv2.GaussianBlur(enhanced_frame, (3, 3), 0)

            return enhanced_frame

        except Exception as e:
            logger.warning(f"[Preprocessor] Chyba při úpravě kontrastu: {e}")
            return frame

    def is_night_or_ir_scene(self, frame: np.ndarray, saturation_threshold: float = 25.0, brightness_threshold: float = 85.0) -> bool:
        """Heuristicky detekuje, zda kamera běží v nočním IR režimu."""
        try:
            hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
            mean_saturation = np.mean(hsv[:, :, 1])
            mean_value = np.mean(hsv[:, :, 2])
            return bool(mean_saturation < saturation_threshold and mean_value < brightness_threshold)
        except Exception:
            return False
`
  },
  {
    name: 'frame_hub.py',
    category: 'core',
    description: 'Thread-Safe Frame Hub a MJPEG broadcaster s dropováním snímků pro prevenci latence a tearingu.',
    code: `"""
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
    """Centrální thread-safe distributor JPEG snímků pro MJPEG streamy."""

    def __init__(self, disk_cache_path: Optional[Path] = None):
        self._lock = threading.Lock()
        self._subscribers: Set[queue.Queue] = set()
        self._latest_jpeg: Optional[bytes] = None
        self._disk_cache_path = disk_cache_path

    def subscribe(self, max_buffer_size: int = 1) -> queue.Queue:
        """Zaregistruje nového webového klienta pro příjem MJPEG snímků."""
        client_queue: queue.Queue = queue.Queue(maxsize=max_buffer_size)
        with self._lock:
            self._subscribers.add(client_queue)
            if self._latest_jpeg is not None:
                try:
                    client_queue.put_nowait(self._latest_jpeg)
                except queue.Full:
                    pass
        return client_queue

    def unsubscribe(self, client_queue: queue.Queue) -> None:
        """Odregistruje webového klienta a uvolní jeho frontu."""
        with self._lock:
            self._subscribers.discard(client_queue)

    def publish_frame(self, jpeg_bytes: bytes) -> None:
        """
        Publikuje nový JPEG snímek všem odběratelům v thread-safe režimu.
        Pokud je fronta klienta plná, starý snímek se zahodí (drop) a nahradí novým.
        """
        if not jpeg_bytes:
            return

        with self._lock:
            self._latest_jpeg = jpeg_bytes

            for q in list(self._subscribers):
                try:
                    q.put_nowait(jpeg_bytes)
                except queue.Full:
                    try:
                        q.get_nowait()
                    except queue.Empty:
                        pass
                    try:
                        q.put_nowait(jpeg_bytes)
                    except queue.Full:
                        pass

        if self._disk_cache_path is not None:
            self._write_atomic_disk_cache(jpeg_bytes)

    def get_latest_frame(self) -> Optional[bytes]:
        with self._lock:
            return self._latest_jpeg

    def _write_atomic_disk_cache(self, jpeg_bytes: bytes) -> None:
        try:
            target_path = Path(self._disk_cache_path)
            target_path.parent.mkdir(parents=True, exist_ok=True)
            temp_path = target_path.with_suffix(".tmp")
            with open(temp_path, "wb") as f:
                f.write(jpeg_bytes)
            os.replace(temp_path, target_path)
        except Exception:
            pass


frame_hub = ThreadSafeFrameHub()
`
  },
  {
    name: 'retention_worker.py',
    category: 'core',
    description: 'Automatická retence dat na pozadí: pravidelné mazání starých fotografií a SQLite záznamů.',
    code: `"""
VisionGuard AI - Modul údržby a retence dat (Data Retention Worker)
Spouští samostatné vlákno na pozadí, které pravidelně kontroluje stáří záznamů
a odstraňuje staré fotografie z disku a odpovídající řádky z SQLite databáze.
Zabraňuje zaplnění úložiště (SSD/eMMC) na kamerovém serveru.
"""

import time
import logging
import threading
from typing import Optional
from config import Config
from db import DatabaseManager

logger = logging.getLogger("VisionGuard.Retention")


class DataRetentionWorker:
    """Pracovník na pozadí zajišťující automatický úklid fotografií a databázových záznamů."""

    def __init__(self, db: DatabaseManager, retention_days: Optional[int] = None, interval_hours: Optional[int] = None):
        self.db = db
        self.retention_days = retention_days or Config.RETENTION_DAYS
        self.interval_seconds = (interval_hours or Config.RETENTION_CHECK_INTERVAL_HOURS) * 3600
        
        self.is_running = False
        self._thread: Optional[threading.Thread] = None

    def start(self) -> "DataRetentionWorker":
        if self.is_running:
            return self

        self.is_running = True
        self._thread = threading.Thread(target=self._run_loop, name="DataRetentionThread", daemon=True)
        self._thread.start()
        logger.info(
            f"[Retention] Služba retence dat spuštěna (Lhůta: {self.retention_days} dní, "
            f"perioda: {self.interval_seconds / 3600:.1f}h)"
        )
        return self

    def _run_loop(self) -> None:
        time.sleep(10.0)
        self.run_cleanup_now()

        while self.is_running:
            for _ in range(int(self.interval_seconds / 5)):
                if not self.is_running:
                    break
                time.sleep(5)

            if self.is_running:
                self.run_cleanup_now()

    def run_cleanup_now(self) -> dict[str, int]:
        try:
            logger.info(f"[Retention] Kontrola dat starších než {self.retention_days} dní...")
            result = self.db.purge_old_records(self.retention_days)
            logger.info(
                f"[Retention] Úklid dokončen: Smazáno {result.get('deleted_vehicles', 0)} vozidel, "
                f"{result.get('deleted_persons', 0)} osob, "
                f"{result.get('deleted_files', 0)} souborů fotografií."
            )
            return result
        except Exception as e:
            logger.error(f"[Retention] Chyba při úklidu starých dat: {e}")
            return {"deleted_vehicles": 0, "deleted_persons": 0, "deleted_files": 0}

    def stop(self) -> None:
        self.is_running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)
        logger.info("[Retention] Vlákno retence dat zastaveno.")
`
  },
  {
    name: 'detector.py',
    category: 'core',
    description: 'Jádro VisionProcessor: YOLO s auto CUDA/CPU akcelerací, zóny, dynamický ořez osob a debounce.',
    code: `"""
VisionGuard AI - Jádro detekce a počítačového vidění (VisionProcessor)
Spojuje hardwarově akcelerovanou YOLO detekci objektů (s CUDA auto-detekcí a fallbackem na CPU),
polygonální testování zón (cv2.pointPolygonTest), noční IR předzpracování (CLAHE),
ANPR extrakci SPZ s debounce cooldownem, dynamický ořez osob u branky a bezpečné ukládání událostí.
"""

import cv2
import time
import logging
from datetime import datetime
from typing import Optional, Dict
import numpy as np

from config import Config
from db import DatabaseManager
from anpr_engine import ANPREngine
from notifier import TelegramNotifier
from preprocessor import ImageEnhancer

logger = logging.getLogger("VisionGuard.Detector")


class VisionProcessor:
    """Hlavní procesor počítačového vidění pro analýzu snímků z kamery."""

    def __init__(self, db: DatabaseManager, notifier: TelegramNotifier, anpr: ANPREngine):
        self.db = db
        self.notifier = notifier
        self.anpr = anpr
        self.preprocessor = ImageEnhancer()

        self.device = self._detect_hardware_device()
        self.is_half_precision = (self.device != "cpu")

        logger.info(f"[Detector] Načítám YOLO model '{Config.YOLO_MODEL_PATH}' na zařízení '{self.device}'...")
        from ultralytics import YOLO
        self.model = YOLO(Config.YOLO_MODEL_PATH)
        self.model.to(self.device)

        self.road_polygon = np.array(Config.ROAD_ZONE, np.int32)
        self.gate_polygon = np.array(Config.GATE_ZONE, np.int32)

        self.plate_cooldowns: Dict[str, float] = {}
        self.last_person_capture_time: float = 0.0
        self.frame_counter: int = 0

    def _detect_hardware_device(self) -> str:
        pref = Config.DEVICE_PREFERENCE.lower()
        if pref == "cpu":
            return "cpu"

        try:
            import torch
            if torch.cuda.is_available():
                gpu_name = torch.cuda.get_device_name(0)
                logger.info(f"[Hardware Akcelerace] Nalezena CUDA GPU: {gpu_name}. Aktivuji FP16.")
                return "cuda:0"
            else:
                logger.info("[Hardware Akcelerace] CUDA GPU není k dispozici. Použije se CPU.")
                return "cpu"
        except Exception:
            return "cpu"

    def process_frame(self, frame: np.ndarray) -> np.ndarray:
        self.frame_counter += 1
        current_time = time.time()
        self._cleanup_expired_cooldowns(current_time)

        detection_input = frame
        if Config.ENABLE_IR_NIGHT_ENHANCEMENT and self.preprocessor.is_night_or_ir_scene(frame):
            detection_input = self.preprocessor.enhance_ir_frame(frame, apply_denoise=True)

        results = self.model(
            detection_input,
            conf=Config.DETECTION_CONF_THRESHOLD,
            classes=[Config.PERSON_CLASS_ID] + Config.VEHICLE_CLASS_IDS,
            device=self.device,
            half=self.is_half_precision,
            verbose=False
        )

        detections = results[0].boxes if len(results) > 0 else []
        annotated_frame = frame.copy()
        self._draw_zones(annotated_frame)

        if detections is None or len(detections) == 0:
            return annotated_frame

        for box in detections:
            cls_id = int(box.cls[0].item())
            conf = float(box.conf[0].item())
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())
            bottom_center = (int((x1 + x2) / 2), y2)

            # Osoba u branky
            if cls_id == Config.PERSON_CLASS_ID:
                if cv2.pointPolygonTest(self.gate_polygon, bottom_center, False) >= 0:
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.putText(annotated_frame, f"Osoba u branky ({conf*100:.0f}%)", (x1, max(20, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 0), 2)

                    if (current_time - self.last_person_capture_time) >= Config.PERSON_COOLDOWN_SEC:
                        self._handle_person_capture(frame, x1, y1, x2, y2, conf)
                        self.last_person_capture_time = current_time

            # Vozidlo na silnici (ANPR)
            elif cls_id in Config.VEHICLE_CLASS_IDS:
                if cv2.pointPolygonTest(self.road_polygon, bottom_center, False) >= 0:
                    v_type = self._get_vehicle_type_name(cls_id)
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (255, 165, 0), 2)
                    cv2.putText(annotated_frame, f"{v_type.capitalize()} ({conf*100:.0f}%)", (x1, max(20, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 165, 0), 2)

                    vehicle_crop = self._safe_crop(frame, x1, y1, x2, y2)
                    if vehicle_crop is not None:
                        plate_text, ocr_conf, _ = self.anpr.extract_license_plate(vehicle_crop)
                        if plate_text:
                            last_seen = self.plate_cooldowns.get(plate_text, 0.0)
                            if (current_time - last_seen) >= Config.ANPR_COOLDOWN_SEC:
                                self._handle_vehicle_capture(frame, vehicle_crop, plate_text, ocr_conf, v_type)
                                self.plate_cooldowns[plate_text] = current_time

                            cv2.putText(annotated_frame, f"SPZ: {plate_text}", (x1, y2 + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.65, (0, 255, 255), 2)

        return annotated_frame

    def _handle_person_capture(self, full_frame: np.ndarray, x1: int, y1: int, x2: int, y2: int, confidence: float) -> None:
        pad = Config.PERSON_CROP_PADDING_PX
        h, w = full_frame.shape[:2]
        crop_x1 = max(0, x1 - pad)
        crop_y1 = max(0, y1 - pad)
        crop_x2 = min(w, x2 + pad)
        crop_y2 = min(h, y2 + pad)

        person_crop = full_frame[crop_y1:crop_y2, crop_x1:crop_x2]
        if person_crop.size == 0:
            return

        now_dt = datetime.now()
        timestamp_str = now_dt.strftime("%Y%m%d_%H%M%S")
        filename = f"person_{timestamp_str}.jpg"
        save_path = str(Config.PERSON_CAPTURES_DIR / filename)

        cv2.imwrite(save_path, person_crop, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
        human_ts = now_dt.strftime("%Y-%m-%d %H:%M:%S")
        self.db.log_person(confidence=confidence, image_path=save_path, timestamp=human_ts)
        self.notifier.notify_person_at_gate(save_path, confidence)

    def _handle_vehicle_capture(self, full_frame: np.ndarray, vehicle_crop: np.ndarray, plate_text: str, confidence: float, vehicle_type: str) -> None:
        now_dt = datetime.now()
        timestamp_str = now_dt.strftime("%Y%m%d_%H%M%S")
        filename = f"vehicle_{timestamp_str}_{plate_text}.jpg"
        save_path = str(Config.VEHICLE_CAPTURES_DIR / filename)

        cv2.imwrite(save_path, vehicle_crop, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
        human_ts = now_dt.strftime("%Y-%m-%d %H:%M:%S")
        self.db.log_vehicle(plate_text=plate_text, confidence=confidence, image_path=save_path, vehicle_type=vehicle_type, timestamp=human_ts)
        self.notifier.notify_vehicle_anpr(plate_text, confidence, vehicle_type)

    def _draw_zones(self, frame: np.ndarray) -> None:
        overlay = frame.copy()
        cv2.fillPoly(overlay, [self.road_polygon], (230, 100, 30))
        cv2.polylines(frame, [self.road_polygon], True, (255, 120, 40), 2)
        cv2.fillPoly(overlay, [self.gate_polygon], (40, 180, 50))
        cv2.polylines(frame, [self.gate_polygon], True, (60, 220, 70), 2)
        cv2.addWeighted(overlay, 0.22, frame, 0.78, 0, frame)

        if len(Config.ROAD_ZONE) > 0:
            rx, ry = Config.ROAD_ZONE[0]
            cv2.putText(frame, "ROAD_ZONE (ANPR)", (rx + 10, ry + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)
        if len(Config.GATE_ZONE) > 0:
            gx, gy = Config.GATE_ZONE[0]
            cv2.putText(frame, "GATE_ZONE (Osoby)", (gx + 10, gy + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

    def _safe_crop(self, img: np.ndarray, x1: int, y1: int, x2: int, y2: int) -> Optional[np.ndarray]:
        h, w = img.shape[:2]
        x1_c, y1_c = max(0, x1), max(0, y1)
        x2_c, y2_c = min(w, x2), min(h, y2)
        if x2_c > x1_c and y2_c > y1_c:
            return img[y1_c:y2_c, x1_c:x2_c]
        return None

    def _cleanup_expired_cooldowns(self, current_time: float) -> None:
        expired = [p for p, t in self.plate_cooldowns.items() if (current_time - t) > Config.ANPR_COOLDOWN_SEC * 2]
        for p in expired:
            del self.plate_cooldowns[p]

    @staticmethod
    def _get_vehicle_type_name(cls_id: int) -> str:
        mapping = {2: "auto", 3: "motocykl", 5: "autobus", 7: "nákladní auto"}
        return mapping.get(cls_id, "vozidlo")
`
  },
  {
    name: 'anpr_engine.py',
    category: 'core',
    description: 'EasyOCR rozpoznávání registračních značek (SPZ), normalizace znaků a validace formátu.',
    code: `"""
VisionGuard AI - ANPR & OCR Modul pro rozpoznávání registračních značek (SPZ)
Zpracovává výřez vozidla, provádí optické rozpoznání textu (EasyOCR) s CUDA akcelerací,
normalizaci znaků a validaci českých/evropských formátů SPZ.
"""

import re
import cv2
import numpy as np
import logging
from typing import Optional, Tuple
from config import Config

logger = logging.getLogger("VisionGuard.ANPR")


class ANPREngine:
    """Třída zajišťující lokalizaci a čtení textu SPZ z výřezu vozidla."""

    def __init__(self):
        self.reader = None
        self._init_ocr()

    def _init_ocr(self) -> None:
        """Inicializuje EasyOCR čtečku s automatickou detekcí GPU (CUDA)."""
        try:
            import easyocr
            import torch
            use_gpu = torch.cuda.is_available() and Config.DEVICE_PREFERENCE.lower() != "cpu"
            logger.info(f"[ANPR] Načítám EasyOCR model (GPU akcelerace: {use_gpu})...")
            self.reader = easyocr.Reader(Config.OCR_LANGUAGES, gpu=use_gpu, verbose=False)
            logger.info("[ANPR] EasyOCR model úspěšně inicializován.")
        except ImportError:
            logger.warning("[ANPR] Knihovna 'easyocr' není nainstalována.")
        except Exception as e:
            logger.error(f"[ANPR] Chyba při startu EasyOCR: {e}")

    def extract_license_plate(self, vehicle_crop: np.ndarray) -> Tuple[Optional[str], float, Optional[np.ndarray]]:
        if vehicle_crop is None or vehicle_crop.size == 0:
            return None, 0.0, None

        h, w = vehicle_crop.shape[:2]
        lower_half_crop = vehicle_crop[int(h * 0.45):, :]
        if lower_half_crop.size == 0:
            lower_half_crop = vehicle_crop

        if self.reader is not None:
            try:
                results = self.reader.readtext(
                    lower_half_crop,
                    paragraph=False,
                    detail=1,
                    allowlist="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ",
                    width_ths=0.7,
                    height_ths=0.5
                )

                best_plate: Optional[str] = None
                best_conf: float = 0.0

                for (bbox, raw_text, conf) in results:
                    cleaned = self._clean_plate_text(raw_text)
                    if self._is_valid_plate(cleaned) and conf > best_conf:
                        best_plate = cleaned
                        best_conf = float(conf)

                if best_plate:
                    return best_plate, best_conf, lower_half_crop

            except Exception as e:
                logger.error(f"[ANPR] Chyba při OCR čtení: {e}")

        return None, 0.0, None

    @staticmethod
    def _clean_plate_text(raw_text: str) -> str:
        return re.sub(r"[^A-Za-z0-9]", "", raw_text).upper()

    @staticmethod
    def _is_valid_plate(text: str) -> bool:
        if not text:
            return False
        length = len(text)
        if not (Config.PLATE_MIN_LENGTH <= length <= Config.PLATE_MAX_LENGTH):
            return False
        has_digit = any(c.isdigit() for c in text)
        has_alpha = any(c.isalpha() for c in text)
        return has_digit and has_alpha
`
  },
  {
    name: 'notifier.py',
    category: 'core',
    description: 'Asynchronní Telegram notifikace: odesílání fotografií osob a textu SPZ bez blokování detekce.',
    code: `"""
VisionGuard AI - Telegram Notifikační Modul
Odesílá okamžité výstrahy (textové zprávy a fotografie ve vysokém rozlišení) na Telegram.
Všechny síťové požadavky běží asynchronně ve frontě na pozadí, takže nezpomalují detekční smyčku OpenCV.
"""

import os
import queue
import logging
import threading
from typing import Optional
import requests
from config import Config

logger = logging.getLogger("VisionGuard.Telegram")


class TelegramNotifier:
    """Asynchronní odesílatel Telegram notifikací."""

    def __init__(self, token: Optional[str] = None, chat_id: Optional[str] = None):
        self.token = token or Config.TELEGRAM_BOT_TOKEN
        self.chat_id = chat_id or Config.TELEGRAM_CHAT_ID
        self.enabled = Config.ENABLE_TELEGRAM and bool(self.token) and bool(self.chat_id)

        self._queue: queue.Queue = queue.Queue(maxsize=100)
        self._worker_thread = threading.Thread(target=self._process_queue, name="TelegramWorker", daemon=True)
        self._worker_thread.start()

        if self.enabled:
            logger.info("[Telegram] Notifikace jsou aktivní a připravené k odesílání.")
        else:
            logger.warning("[Telegram] Notifikace jsou vypnuté nebo chybí token/chat_id.")

    def notify_vehicle_anpr(self, plate_text: str, confidence: float, vehicle_type: str = "car") -> None:
        if not self.enabled:
            return

        message = (
            f"🚗 *Detekováno vozidlo v zóně silnice*\\n"
            f"━━━━━━━━━━━━━━━━━━━\\n"
            f"🔹 *SPZ:* \`{plate_text}\`\\n"
            f"🔹 *Typ:* {vehicle_type.capitalize()}\\n"
            f"🔹 *Jistota OCR:* {confidence * 100:.1f} %\\n"
            f"⏰ *Čas:* \`{self._get_current_time()}\`"
        )
        self._queue.put({"type": "message", "text": message})

    def notify_person_at_gate(self, photo_path: str, confidence: float) -> None:
        if not self.enabled:
            return

        caption = (
            f"🚶‍♂️ *Pozor: Detekována osoba u branky!*\\n"
            f"━━━━━━━━━━━━━━━━━━━\\n"
            f"🔹 *Zóna:* GATE_ZONE (Vstup)\\n"
            f"🔹 *Spolehlivost:* {confidence * 100:.1f} %\\n"
            f"⏰ *Čas:* \`{self._get_current_time()}\`"
        )
        self._queue.put({"type": "photo", "path": photo_path, "caption": caption})

    def _process_queue(self) -> None:
        while True:
            try:
                task = self._queue.get()
                if task is None:
                    break

                if task["type"] == "message":
                    self._send_text_direct(task["text"])
                elif task["type"] == "photo":
                    self._send_photo_direct(task["path"], task["caption"])

                self._queue.task_done()
            except Exception as e:
                logger.error(f"[Telegram] Chyba ve frontě notifikací: {e}")

    def _send_text_direct(self, text: str) -> bool:
        url = f"https://api.telegram.org/bot{self.token}/sendMessage"
        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": "Markdown",
            "disable_web_page_preview": True,
        }
        try:
            resp = requests.post(url, json=payload, timeout=8.0)
            return resp.status_code == 200
        except Exception as e:
            logger.error(f"[Telegram] Výjimka při odesílání: {e}")
            return False

    def _send_photo_direct(self, photo_path: str, caption: str) -> bool:
        if not os.path.exists(photo_path):
            return False

        url = f"https://api.telegram.org/bot{self.token}/sendPhoto"
        data = {
            "chat_id": self.chat_id,
            "caption": caption,
            "parse_mode": "Markdown",
        }
        try:
            with open(photo_path, "rb") as f:
                files = {"photo": f}
                resp = requests.post(url, data=data, files=files, timeout=12.0)
                return resp.status_code == 200
        except Exception as e:
            logger.error(f"[Telegram] Výjimka při odesílání fotky: {e}")
            return False

    @staticmethod
    def _get_current_time() -> str:
        from datetime import datetime
        return datetime.now().strftime("%d.%m.%Y %H:%M:%S")
`
  },
  {
    name: 'db.py',
    category: 'core',
    description: 'SQLite databáze s WAL režimem pro bezpečný souběh a funkcí purge_old_records pro retenci dat.',
    code: `"""
VisionGuard AI - Databázový modul (SQLite)
Poskytuje bezpečné a thread-safe ukládání záznamů o detekcích vozidel (SPZ) a osob u branky.
Používá WAL (Write-Ahead Logging) režim pro bezproblémový souběh čtení z Dashboardu a zápisu z detektoru.
Obsahuje metodu purge_old_records pro automatickou i manuální retenci a úklid disku.
"""

import sqlite3
import os
from datetime import datetime, timedelta
from typing import Optional, Any
from pathlib import Path
from config import Config


class DatabaseManager:
    """Správce SQLite databáze pro ukládání, dotazování a retenci událostí."""

    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or Config.DB_PATH
        Config.ensure_directories()
        self.init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(str(self.db_path), timeout=15.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        return conn

    def init_db(self) -> None:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS vehicle_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    plate_text TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    vehicle_type TEXT DEFAULT 'car',
                    image_path TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            """)

            cursor.execute("""
                CREATE TABLE IF NOT EXISTS person_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    image_path TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            """)

            cursor.execute("CREATE INDEX IF NOT EXISTS idx_vehicle_plate ON vehicle_logs(plate_text);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_vehicle_timestamp ON vehicle_logs(timestamp);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_person_timestamp ON person_logs(timestamp);")
            conn.commit()

    def log_vehicle(self, plate_text: str, confidence: float, image_path: str, vehicle_type: str = "car", timestamp: Optional[str] = None) -> int:
        ts = timestamp or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO vehicle_logs (timestamp, plate_text, confidence, vehicle_type, image_path)
                VALUES (?, ?, ?, ?, ?)
            """, (ts, plate_text.upper().strip(), float(confidence), vehicle_type, image_path))
            conn.commit()
            return cursor.lastrowid or 0

    def log_person(self, confidence: float, image_path: str, timestamp: Optional[str] = None) -> int:
        ts = timestamp or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO person_logs (timestamp, confidence, image_path)
                VALUES (?, ?, ?)
            """, (ts, float(confidence), image_path))
            conn.commit()
            return cursor.lastrowid or 0

    def get_vehicles(self, limit: int = 50, offset: int = 0, plate_query: Optional[str] = None, date_from: Optional[str] = None, date_to: Optional[str] = None) -> list[dict[str, Any]]:
        query = "SELECT * FROM vehicle_logs WHERE 1=1"
        params: list[Any] = []
        if plate_query:
            query += " AND plate_text LIKE ?"
            params.append(f"%{plate_query.strip().upper()}%")
        if date_from:
            query += " AND timestamp >= ?"
            params.append(f"{date_from} 00:00:00")
        if date_to:
            query += " AND timestamp <= ?"
            params.append(f"{date_to} 23:59:59")
        query += " ORDER BY id DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

    def get_persons(self, limit: int = 50, offset: int = 0, date_from: Optional[str] = None, date_to: Optional[str] = None) -> list[dict[str, Any]]:
        query = "SELECT * FROM person_logs WHERE 1=1"
        params: list[Any] = []
        if date_from:
            query += " AND timestamp >= ?"
            params.append(f"{date_from} 00:00:00")
        if date_to:
            query += " AND timestamp <= ?"
            params.append(f"{date_to} 23:59:59")
        query += " ORDER BY id DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(query, params)
            return [dict(row) for row in cursor.fetchall()]

    def delete_vehicle(self, record_id: int) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT image_path FROM vehicle_logs WHERE id = ?", (record_id,))
            row = cursor.fetchone()
            if row and row["image_path"]:
                self._safe_delete_file(row["image_path"])
            cursor.execute("DELETE FROM vehicle_logs WHERE id = ?", (record_id,))
            conn.commit()
            return cursor.rowcount > 0

    def delete_person(self, record_id: int) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT image_path FROM person_logs WHERE id = ?", (record_id,))
            row = cursor.fetchone()
            if row and row["image_path"]:
                self._safe_delete_file(row["image_path"])
            cursor.execute("DELETE FROM person_logs WHERE id = ?", (record_id,))
            conn.commit()
            return cursor.rowcount > 0

    def purge_old_records(self, retention_days: int) -> dict[str, int]:
        cutoff_dt = datetime.now() - timedelta(days=retention_days)
        cutoff_str = cutoff_dt.strftime("%Y-%m-%d %H:%M:%S")
        deleted_vehicles = 0
        deleted_persons = 0
        deleted_files = 0

        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id, image_path FROM person_logs WHERE timestamp < ?", (cutoff_str,))
            for row in cursor.fetchall():
                if row["image_path"] and self._safe_delete_file(row["image_path"]):
                    deleted_files += 1
            cursor.execute("DELETE FROM person_logs WHERE timestamp < ?", (cutoff_str,))
            deleted_persons = cursor.rowcount

            cursor.execute("SELECT id, image_path FROM vehicle_logs WHERE timestamp < ?", (cutoff_str,))
            for row in cursor.fetchall():
                if row["image_path"] and self._safe_delete_file(row["image_path"]):
                    deleted_files += 1
            cursor.execute("DELETE FROM vehicle_logs WHERE timestamp < ?", (cutoff_str,))
            deleted_vehicles = cursor.rowcount
            conn.commit()

        return {
            "deleted_vehicles": deleted_vehicles,
            "deleted_persons": deleted_persons,
            "deleted_files": deleted_files,
            "cutoff_timestamp": cutoff_str,
        }

    def get_statistics(self) -> dict[str, int]:
        today_prefix = datetime.now().strftime("%Y-%m-%d")
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) FROM vehicle_logs WHERE timestamp LIKE ?", (f"{today_prefix}%",))
            vehicles_today = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM person_logs WHERE timestamp LIKE ?", (f"{today_prefix}%",))
            persons_today = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM vehicle_logs")
            total_vehicles = cursor.fetchone()[0]
            cursor.execute("SELECT COUNT(*) FROM person_logs")
            total_persons = cursor.fetchone()[0]
            return {
                "vehicles_today": vehicles_today,
                "persons_today": persons_today,
                "total_vehicles": total_vehicles,
                "total_persons": total_persons,
            }

    @staticmethod
    def _safe_delete_file(path_str: str) -> bool:
        try:
            p = Path(path_str)
            if p.exists() and p.is_file():
                p.unlink()
                return True
        except Exception:
            pass
        return False
`
  },
  {
    name: 'calibrate_zones.py',
    category: 'tools',
    description: 'Interaktivní GUI kalibrátor: naklikání polygonálních zón ROAD_ZONE a GATE_ZONE přímo na kameře.',
    code: `"""
VisionGuard AI - Interaktivní kalibrační nástroj pro zaměření zón (calibrate_zones.py)
Umožňuje snadno naklikat body polygonů ROAD_ZONE a GATE_ZONE přímo na živém obraze z kamery
a automaticky vygenerovat kód souřadnic pro vložení do config.py.
"""

import cv2
import numpy as np
from config import Config

current_mode = "road"
road_points = list(Config.ROAD_ZONE)
gate_points = list(Config.GATE_ZONE)


def mouse_callback(event, x, y, flags, param):
    global road_points, gate_points, current_mode
    if event == cv2.EVENT_LBUTTONDOWN:
        if current_mode == "road":
            road_points.append((x, y))
            print(f"[ROAD_ZONE] Přidán bod: ({x}, {y})")
        else:
            gate_points.append((x, y))
            print(f"[GATE_ZONE] Přidán bod: ({x}, {y})")


def print_coordinates():
    print("\\n" + "=" * 60)
    print("  VYGENEROVANÉ SOUŘADNICE PRO VLOŽENÍ DO config.py:")
    print("=" * 60)
    print("ROAD_ZONE = [")
    for pt in road_points:
        print(f"    ({pt[0]}, {pt[1]}),")
    print("]\\n")

    print("GATE_ZONE = [")
    for pt in gate_points:
        print(f"    ({pt[0]}, {pt[1]}),")
    print("]")
    print("=" * 60 + "\\n")


def main():
    global current_mode, road_points, gate_points
    print("=" * 60)
    print("  VisionGuard AI - Kalibrátor polygonálních zón")
    print("=" * 60)

    source = int(Config.RTSP_URL) if Config.RTSP_URL.isdigit() else Config.RTSP_URL
    cap = cv2.VideoCapture(source)

    if not cap.isOpened():
        print(f"[Chyba] Nelze otevřít stream {Config.RTSP_URL}.")
        return

    ret, frame = cap.read()
    if not ret or frame is None:
        print("[Chyba] Nepodařilo se přečíst snímek z kamery.")
        cap.release()
        return

    window_name = "VisionGuard - Kalibrator Zon ('r'=Road, 'g'=Gate, 'c'=Clear, 's'=Save, 'q'=Quit)"
    cv2.namedWindow(window_name, cv2.WINDOW_NORMAL)
    cv2.setMouseCallback(window_name, mouse_callback)

    while True:
        ret, frame_live = cap.read()
        display_frame = (frame_live if ret and frame_live is not None else frame).copy()

        if len(road_points) > 1:
            pts = np.array(road_points, np.int32)
            cv2.polylines(display_frame, [pts], isClosed=True, color=(255, 140, 0), thickness=2)
        for pt in road_points:
            cv2.circle(display_frame, pt, 5, (255, 140, 0), -1)

        if len(gate_points) > 1:
            pts = np.array(gate_points, np.int32)
            cv2.polylines(display_frame, [pts], isClosed=True, color=(0, 255, 0), thickness=2)
        for pt in gate_points:
            cv2.circle(display_frame, pt, 5, (0, 255, 0), -1)

        mode_text = f"AKTIVNI MOD: {'[R] ROAD_ZONE (Silnice/SPZ)' if current_mode == 'road' else '[G] GATE_ZONE (Branka/Osoby)'}"
        mode_color = (255, 140, 0) if current_mode == "road" else (0, 255, 0)
        cv2.putText(display_frame, mode_text, (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.75, mode_color, 2)
        cv2.putText(display_frame, "Klavesy: [R] Road | [G] Gate | [C] Vymazat | [S] Vypsat | [Q] Konec", (20, 70), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (220, 220, 220), 1)

        cv2.imshow(window_name, display_frame)
        key = cv2.waitKey(30) & 0xFF

        if key == ord("q") or key == 27:
            break
        elif key == ord("r"):
            current_mode = "road"
        elif key == ord("g"):
            current_mode = "gate"
        elif key == ord("c"):
            if current_mode == "road":
                road_points.clear()
            else:
                gate_points.clear()
        elif key == ord("s"):
            print_coordinates()

    cap.release()
    cv2.destroyAllWindows()
    print_coordinates()


if __name__ == "__main__":
    main()
`
  },
  {
    name: 'main.py',
    category: 'core',
    description: 'Hlavní detekční démon: RTSP smyčka, frame skipping, thread-safe FrameHub a DataRetentionWorker.',
    code: `"""
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
        self.retention_worker = DataRetentionWorker(self.db).start()

        frame_hub._disk_cache_path = Config.LIVE_FRAME_PATH
        self.running = False
        self._setup_signals()

    def _setup_signals(self) -> None:
        signal.signal(signal.SIGINT, self._handle_exit)
        signal.signal(signal.SIGTERM, self._handle_exit)

    def _handle_exit(self, signum, frame) -> None:
        logger.info("\\n[Main] Zachycen signál ukončení. Probíhá vypnutí...")
        self.running = False

    def run(self) -> None:
        self.running = True
        self.stream_reader.start()

        logger.info(f"[Main] Nastaven Frame Skipping: každý {Config.FRAME_SKIP}. snímek.")
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
                    time.sleep(0.08)
                    continue

                frame_count += 1
                fps_counter += 1

                if time.time() - fps_timer >= 15.0:
                    current_fps = fps_counter / (time.time() - fps_timer)
                    logger.info(f"[Main Status] Stream stabilní. Rychlost: {current_fps:.1f} FPS")
                    fps_timer = time.time()
                    fps_counter = 0

                if frame_count % Config.FRAME_SKIP != 0:
                    time.sleep(0.004)
                    continue

                annotated = self.detector.process_frame(frame)

                # Thread-safe publikování do FrameHubu (žádné globální proměnné)
                try:
                    ret, jpeg = cv2.imencode(".jpg", annotated, [int(cv2.IMWRITE_JPEG_QUALITY), 80])
                    if ret:
                        frame_hub.publish_frame(jpeg.tobytes())
                except Exception:
                    pass

                if Config.ENABLE_WINDOW_DISPLAY:
                    cv2.imshow("VisionGuard AI - Live Monitor", annotated)
                    if cv2.waitKey(1) & 0xFF == ord("q"):
                        break

                time.sleep(0.004)

        except Exception as e:
            logger.error(f"[Main] Chyba v běhu: {e}", exc_info=True)
        finally:
            self.shutdown()

    def shutdown(self) -> None:
        logger.info("[Main] Uvolňuji zdroje...")
        self.stream_reader.stop()
        self.retention_worker.stop()
        if Config.ENABLE_WINDOW_DISPLAY:
            cv2.destroyAllWindows()
        logger.info("[Main] Služba byla bezpečně ukončena.")


if __name__ == "__main__":
    service = VisionGuardService()
    service.run()
`
  },
  {
    name: 'dashboard.py',
    category: 'web',
    description: 'Zabezpečený FastAPI dashboard s HTTP Basic Auth, nízkolatentním MJPEG streamem a retencí.',
    code: `"""
VisionGuard AI - Zabezpečený Webový Dashboard (FastAPI + HTML/Tailwind)
Přehledné webové rozhraní pro prohlížení průjezdů vozidel (ANPR),
galerie zachycených osob u branky s možností zvětšení, živého MJPEG náhledu,
manuálního smazání starých záznamů a spuštění retence dat.
Chráněno heslem (HTTP Basic Auth) načítaným z .env souboru.
"""

import os
import time
import secrets
import asyncio
from pathlib import Path
from datetime import datetime
from typing import Optional, AsyncGenerator

from fastapi import FastAPI, Request, Query, HTTPException, Depends, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.responses import HTMLResponse, StreamingResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import uvicorn

from config import Config
from db import DatabaseManager
from frame_hub import frame_hub

app = FastAPI(title="VisionGuard AI Secured Dashboard", version="1.1.0")

Config.ensure_directories()
db = DatabaseManager()

app.mount("/captures", StaticFiles(directory=str(Config.CAPTURES_DIR)), name="captures")
TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"
TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

security = HTTPBasic()


def verify_credentials(credentials: HTTPBasicCredentials = Depends(security)) -> str:
    """Ověří přihlašovací jméno a heslo pomocí timing-safe porovnání."""
    correct_username = secrets.compare_digest(credentials.username, Config.DASHBOARD_USERNAME)
    correct_password = secrets.compare_digest(credentials.password, Config.DASHBOARD_PASSWORD)

    if not (correct_username and correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Neplatné přihlašovací údaje",
            headers={"WWW-Authenticate": "Basic realm='VisionGuard AI Dashboard'"},
        )
    return credentials.username


@app.get("/api/stats")
async def get_stats(_user: str = Depends(verify_credentials)):
    return db.get_statistics()


@app.get("/api/vehicles")
async def api_get_vehicles(
    query: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    _user: str = Depends(verify_credentials)
):
    items = db.get_vehicles(limit=limit, offset=offset, plate_query=query, date_from=date_from, date_to=date_to)
    for item in items:
        item["web_image_url"] = _to_web_url(item["image_path"])
    return items


@app.get("/api/persons")
async def api_get_persons(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    _user: str = Depends(verify_credentials)
):
    items = db.get_persons(limit=limit, offset=offset, date_from=date_from, date_to=date_to)
    for item in items:
        item["web_image_url"] = _to_web_url(item["image_path"])
    return items


@app.delete("/api/vehicles/{record_id}")
async def api_delete_vehicle(record_id: int, _user: str = Depends(verify_credentials)):
    success = db.delete_vehicle(record_id)
    if not success:
        raise HTTPException(status_code=404, detail="Záznam nebyl nalezen")
    return {"status": "success", "deleted_id": record_id}


@app.delete("/api/persons/{record_id}")
async def api_delete_person(record_id: int, _user: str = Depends(verify_credentials)):
    success = db.delete_person(record_id)
    if not success:
        raise HTTPException(status_code=404, detail="Záznam nebyl nalezen")
    return {"status": "success", "deleted_id": record_id}


@app.post("/api/maintenance/cleanup")
async def api_trigger_retention(_user: str = Depends(verify_credentials)):
    result = db.purge_old_records(Config.RETENTION_DAYS)
    return {
        "status": "success",
        "message": f"Retence dat dokončena (lhůta: {Config.RETENTION_DAYS} dní)",
        "stats": result
    }


async def mjpeg_stream_generator() -> AsyncGenerator[bytes, None]:
    client_queue = frame_hub.subscribe(max_buffer_size=1)
    frame_interval = 1.0 / max(1, Config.MJPEG_FPS)
    try:
        while True:
            jpeg_bytes = None
            try:
                jpeg_bytes = client_queue.get_nowait()
            except Exception:
                if Config.LIVE_FRAME_PATH.exists():
                    try:
                        jpeg_bytes = Config.LIVE_FRAME_PATH.read_bytes()
                    except Exception:
                        pass

            if jpeg_bytes is not None:
                yield (
                    b"--frame\\r\\n"
                    b"Content-Type: image/jpeg\\r\\n\\r\\n" + jpeg_bytes + b"\\r\\n"
                )
            await asyncio.sleep(frame_interval)
    finally:
        frame_hub.unsubscribe(client_queue)


@app.get("/api/stream/live")
async def live_stream(_user: str = Depends(verify_credentials)):
    return StreamingResponse(
        mjpeg_stream_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@app.get("/", response_class=HTMLResponse)
async def dashboard_page(
    request: Request,
    plate: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    _user: str = Depends(verify_credentials)
):
    stats = db.get_statistics()
    vehicles = db.get_vehicles(limit=30, plate_query=plate, date_from=date_from, date_to=date_to)
    persons = db.get_persons(limit=18, date_from=date_from, date_to=date_to)

    for v in vehicles:
        v["web_image_url"] = _to_web_url(v["image_path"])
    for p in persons:
        p["web_image_url"] = _to_web_url(p["image_path"])

    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "stats": stats,
            "vehicles": vehicles,
            "persons": persons,
            "filter_plate": plate or "",
            "filter_date_from": date_from or "",
            "filter_date_to": date_to or "",
            "config": Config,
            "username": _user
        }
    )


def _to_web_url(local_path: str) -> str:
    try:
        p = Path(local_path)
        rel = p.relative_to(Config.CAPTURES_DIR)
        return f"/captures/{rel.as_posix()}"
    except Exception:
        return f"/captures/{os.path.basename(local_path)}"


if __name__ == "__main__":
    print(f"VisionGuard AI Dashboard běží na http://{Config.DASHBOARD_HOST}:{Config.DASHBOARD_PORT}")
    uvicorn.run("dashboard:app", host=Config.DASHBOARD_HOST, port=Config.DASHBOARD_PORT, reload=False)
`
  },
  {
    name: 'requirements.txt',
    category: 'config',
    description: 'Seznam Python závislostí včetně OpenCV, Ultralytics YOLO, EasyOCR, PyTorch a FastAPI.',
    code: `# Computer Vision & Deep Learning
opencv-python-headless>=4.8.0.76
ultralytics>=8.1.0
easyocr>=1.7.1
torch>=2.0.0
torchvision>=0.15.0
numpy>=1.24.0
Pillow>=10.0.0

# Web Dashboard & API
fastapi>=0.110.0
uvicorn[standard]>=0.28.0
jinja2>=3.1.3
python-multipart>=0.0.9

# Utility & Networking
requests>=2.31.0
pydantic>=2.6.0
python-dotenv>=1.0.1
`
  },
  {
    name: 'README.md',
    category: 'docs',
    description: 'Kompletní dokumentace k instalaci, CUDA akceleraci, kalibraci zón, Basic Auth a retenci dat.',
    code: `# VisionGuard AI - Inteligentní Kamerový Dohled, ANPR & Zabezpečený Hub

Produkční Python systém pro nepřetržité (24/7) monitorování RTSP video streamu z IP kamer s využitím počítačového vidění (OpenCV), YOLOv8 detekce s CUDA GPU akcelerací (s CPU fallbackem), ANPR čtení SPZ (EasyOCR), zónové detekce osob u branky, asynchronních Telegram notifikací, automatické retence dat a zabezpečeného webového dashboardu (FastAPI s HTTP Basic Auth a MJPEG streamem s nulovou latencí).

## Rychlé spuštění
\`\`\`bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python main.py
\`\`\`
`
  }
];
