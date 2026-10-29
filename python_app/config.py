"""
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
    # RTSP URL kamery (nebo '0' pro lokální webkameru, případně cesta k testovacímu mp4)
    RTSP_URL: str = os.getenv(
        "RTSP_URL",
        "rtsp://admin:HesloKamer123@192.168.1.108:554/h264Preview_01_main"
    )

    # Frame skipping: zpracovávat každý N-tý snímek (např. 3 = při 25 fps zpracujeme ~8 fps,
    # což šetří 65 % výpočetního výkonu CPU/GPU při zachování 100% spolehlivosti)
    FRAME_SKIP: int = int(os.getenv("FRAME_SKIP", "3"))

    # Automatické znovupřipojení při výpadku spojení (Watchdog interval v sekundách)
    RECONNECT_TIMEOUT_SEC: float = float(os.getenv("RECONNECT_TIMEOUT_SEC", "5.0"))
    WATCHDOG_FREEZE_TIMEOUT_SEC: float = float(os.getenv("WATCHDOG_FREEZE_TIMEOUT_SEC", "8.0"))

    # Zda zobrazovat lokální OpenCV okno na obrazovce (vhodné pro ladění na PC s monitorem)
    ENABLE_WINDOW_DISPLAY: bool = os.getenv("ENABLE_WINDOW_DISPLAY", "false").lower() == "true"

    # Pre-processing obrazu pro noční IR režim (CLAHE a odšumění)
    ENABLE_IR_NIGHT_ENHANCEMENT: bool = os.getenv("ENABLE_IR_NIGHT_ENHANCEMENT", "true").lower() == "true"

    # -------------------------------------------------------------------------
    # 2. DETEKČNÍ MODELY (YOLO & OCR) & HARDWAROVÁ AKCELERACE
    # -------------------------------------------------------------------------
    # YOLOv8 model - nano 'yolov8n.pt' pro edge zařízení / CPU, nebo 'yolov8s.pt' pro vyšší přesnost
    YOLO_MODEL_PATH: str = os.getenv("YOLO_MODEL_PATH", "yolov8n.pt")

    # Preferovaná grafická karta (např. '0' nebo 'cuda:0', případně 'cpu' pro vynucení CPU)
    # Systém automaticky detekuje dostupnost CUDA a provede bezpečný fallback
    DEVICE_PREFERENCE: str = os.getenv("DEVICE_PREFERENCE", "auto")

    # Minimální práh spolehlivosti detekce (Confidence threshold)
    DETECTION_CONF_THRESHOLD: float = float(os.getenv("DETECTION_CONF_THRESHOLD", "0.45"))

    # COCO ID tříd objektů:
    # 0: person, 2: car, 3: motorcycle, 5: bus, 7: truck
    PERSON_CLASS_ID: int = 0
    VEHICLE_CLASS_IDS: list[int] = [2, 3, 5, 7]

    # Jazyky pro EasyOCR (české/evropské značky používají latinku a čísla)
    OCR_LANGUAGES: list[str] = ["en", "cs"]

    # Minimální délka a regex pro validní SPZ (typická CZ/EU SPZ: 5 až 8 alfanumerických znaků)
    PLATE_MIN_LENGTH: int = 5
    PLATE_MAX_LENGTH: int = 8

    # -------------------------------------------------------------------------
    # 3. DEFINICE POLYGONÁLNÍCH ZÓN (X, Y souřadnice v pixelech)
    # Poznámka: Tyto body lze snadno získat a zkalibrovat spuštěním calibrate_zones.py
    # -------------------------------------------------------------------------
    # ROAD_ZONE: Polygon vozovky, kde sledujeme průjezdy vozidel a SPZ
    ROAD_ZONE: list[tuple[int, int]] = [
        (40, 220),
        (520, 230),
        (580, 720),
        (20, 720),
    ]

    # GATE_ZONE: Polygon prostoru před vstupní brankou / vchodem
    GATE_ZONE: list[tuple[int, int]] = [
        (650, 310),
        (960, 310),
        (980, 720),
        (640, 720),
    ]

    # -------------------------------------------------------------------------
    # 4. DEBOUNCE / COOLDOWN LOGIKA (v sekundách)
    # -------------------------------------------------------------------------
    # Stejná SPZ se nezaloguje ani nenotifikuje znovu dříve než po tomto čase
    ANPR_COOLDOWN_SEC: int = int(os.getenv("ANPR_COOLDOWN_SEC", "180"))  # 3 minuty

    # Osoba stojící před brankou nespustí lavinu fotografií, min. interval mezi záznamy
    PERSON_COOLDOWN_SEC: int = int(os.getenv("PERSON_COOLDOWN_SEC", "120"))  # 2 minuty

    # Dynamický okraj (padding) v pixelech při ořezu postavy u branky
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

    # Perioda kontroly retence dat v hodinách (např. každých 6 hodin)
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

    # Zabezpečení přihlášení (HTTP Basic Auth) načítané z .env
    DASHBOARD_USERNAME: str = os.getenv("DASHBOARD_USERNAME", "admin")
    DASHBOARD_PASSWORD: str = os.getenv("DASHBOARD_PASSWORD", "VisionGuard2026!")

    # MJPEG stream konfigurace
    MJPEG_FPS: int = int(os.getenv("MJPEG_FPS", "15"))
    MJPEG_MAX_CLIENTS: int = int(os.getenv("MJPEG_MAX_CLIENTS", "8"))

    @classmethod
    def ensure_directories(cls) -> None:
        """Vytvoří potřebné složky pro ukládání dat a ořezů snímků."""
        cls.DATA_DIR.mkdir(parents=True, exist_ok=True)
        cls.CAPTURES_DIR.mkdir(parents=True, exist_ok=True)
        cls.PERSON_CAPTURES_DIR.mkdir(parents=True, exist_ok=True)
        cls.VEHICLE_CAPTURES_DIR.mkdir(parents=True, exist_ok=True)
