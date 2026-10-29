"""
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

        # Hardwarová akcelerace: detekce CUDA GPU vs CPU
        self.device = self._detect_hardware_device()
        self.is_half_precision = (self.device != "cpu")

        # Načtení YOLOv8 modelu na zjištěné hardwarové zařízení
        logger.info(f"[Detector] Načítám YOLO model '{Config.YOLO_MODEL_PATH}' na zařízení '{self.device}'...")
        from ultralytics import YOLO
        self.model = YOLO(Config.YOLO_MODEL_PATH)
        self.model.to(self.device)

        # Příprava polygonů pro OpenCV (int32 array)
        self.road_polygon = np.array(Config.ROAD_ZONE, np.int32)
        self.gate_polygon = np.array(Config.GATE_ZONE, np.int32)

        # Paměť pro cooldown / deduplikaci
        # plate_text -> timestamp posledního zaznamenání
        self.plate_cooldowns: Dict[str, float] = {}
        # timestamp posledního zachycení osoby u branky
        self.last_person_capture_time: float = 0.0

        # Počítadlo zpracovaných snímků pro frame skipping
        self.frame_counter: int = 0

    def _detect_hardware_device(self) -> str:
        """Detekuje a inicializuje nejlepší dostupné výpočetní zařízení (CUDA GPU vs CPU)."""
        pref = Config.DEVICE_PREFERENCE.lower()
        if pref == "cpu":
            logger.info("[Hardware] Vynuceno výpočetní zařízení: CPU.")
            return "cpu"

        try:
            import torch
            if torch.cuda.is_available():
                gpu_count = torch.cuda.device_count()
                gpu_name = torch.cuda.get_device_name(0)
                logger.info(
                    f"[Hardware Akcelerace] Nalezena NVIDIA CUDA GPU: {gpu_name} "
                    f"(Počet jednotek: {gpu_count}). Aktivuji hardwarovou akceleraci FP16."
                )
                return "cuda:0"
            else:
                logger.info("[Hardware Akcelerace] CUDA GPU není k dispozici. Použije se optimalizovaný CPU běh.")
                return "cpu"
        except Exception as e:
            logger.warning(f"[Hardware] Chyba při detekci CUDA: {e}. Fallback na CPU.")
            return "cpu"

    def process_frame(self, frame: np.ndarray) -> np.ndarray:
        """
        Zpracuje jeden snímek: detekuje vozidla v ROAD_ZONE a osoby v GATE_ZONE.
        Vrací anotovaný snímek s vykreslenými zónami a detekcemi pro náhled/web.
        """
        self.frame_counter += 1
        current_time = time.time()

        # Vyčištění expirovaných SPZ z paměti cooldownu
        self._cleanup_expired_cooldowns(current_time)

        # Volitelné noční IR předzpracování (CLAHE a odšumění)
        detection_input = frame
        if Config.ENABLE_IR_NIGHT_ENHANCEMENT:
            if self.preprocessor.is_night_or_ir_scene(frame):
                detection_input = self.preprocessor.enhance_ir_frame(frame, apply_denoise=True)

        # 1. Spuštění YOLO detekce
        results = self.model(
            detection_input,
            conf=Config.DETECTION_CONF_THRESHOLD,
            classes=[Config.PERSON_CLASS_ID] + Config.VEHICLE_CLASS_IDS,
            device=self.device,
            half=self.is_half_precision,
            verbose=False
        )

        detections = results[0].boxes if len(results) > 0 else []

        # Příprava anotovaného snímku pro operátora a webový stream
        annotated_frame = frame.copy()
        self._draw_zones(annotated_frame)

        if detections is None or len(detections) == 0:
            return annotated_frame

        # Procházení nalezených bounding boxů
        for box in detections:
            cls_id = int(box.cls[0].item())
            conf = float(box.conf[0].item())
            x1, y1, x2, y2 = map(int, box.xyxy[0].tolist())

            # Spodní střed bounding boxu (reprezentuje dotyk objektu se zemí pro zónový test)
            bottom_center = (int((x1 + x2) / 2), y2)

            # -----------------------------------------------------------------
            # A) DETEKCE OSOBY V ZÓNĚ BRANKY (GATE_ZONE)
            # -----------------------------------------------------------------
            if cls_id == Config.PERSON_CLASS_ID:
                is_in_gate = cv2.pointPolygonTest(self.gate_polygon, bottom_center, False) >= 0

                if is_in_gate:
                    # Vykreslení zvýrazněného boxu u branky
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.putText(
                        annotated_frame,
                        f"Osoba u branky ({conf*100:.0f}%)",
                        (x1, max(20, y1 - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.55,
                        (0, 255, 0),
                        2
                    )

                    # Ověření Cooldownu pro osobu u branky
                    if (current_time - self.last_person_capture_time) >= Config.PERSON_COOLDOWN_SEC:
                        self._handle_person_capture(frame, x1, y1, x2, y2, conf)
                        self.last_person_capture_time = current_time

            # -----------------------------------------------------------------
            # B) DETEKCE VOZIDLA V ZÓNĚ SILNICE (ROAD_ZONE) & ANPR
            # -----------------------------------------------------------------
            elif cls_id in Config.VEHICLE_CLASS_IDS:
                is_in_road = cv2.pointPolygonTest(self.road_polygon, bottom_center, False) >= 0

                if is_in_road:
                    v_type = self._get_vehicle_type_name(cls_id)
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (255, 165, 0), 2)
                    cv2.putText(
                        annotated_frame,
                        f"{v_type.capitalize()} ({conf*100:.0f}%)",
                        (x1, max(20, y1 - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.55,
                        (255, 165, 0),
                        2
                    )

                    # Výřez vozidla pro ANPR
                    vehicle_crop = self._safe_crop(frame, x1, y1, x2, y2)
                    if vehicle_crop is not None:
                        plate_text, ocr_conf, _ = self.anpr.extract_license_plate(vehicle_crop)

                        if plate_text:
                            # Kontrola cooldownu pro danou konkrétní SPZ
                            last_seen = self.plate_cooldowns.get(plate_text, 0.0)
                            if (current_time - last_seen) >= Config.ANPR_COOLDOWN_SEC:
                                self._handle_vehicle_capture(frame, vehicle_crop, plate_text, ocr_conf, v_type)
                                self.plate_cooldowns[plate_text] = current_time

                            # Popisek SPZ na obrazovce
                            cv2.putText(
                                annotated_frame,
                                f"SPZ: {plate_text}",
                                (x1, y2 + 20),
                                cv2.FONT_HERSHEY_SIMPLEX,
                                0.65,
                                (0, 255, 255),
                                2
                            )

        return annotated_frame

    def _handle_person_capture(
        self,
        full_frame: np.ndarray,
        x1: int,
        y1: int,
        x2: int,
        y2: int,
        confidence: float
    ) -> None:
        """Vyřízne postavu s dynamickým paddingem, uloží do JPEG a zaloguje."""
        # Aplikace dynamického okraje (padding)
        pad = Config.PERSON_CROP_PADDING_PX
        h, w = full_frame.shape[:2]
        crop_x1 = max(0, x1 - pad)
        crop_y1 = max(0, y1 - pad)
        crop_x2 = min(w, x2 + pad)
        crop_y2 = min(h, y2 + pad)

        person_crop = full_frame[crop_y1:crop_y2, crop_x1:crop_x2]
        if person_crop.size == 0:
            return

        # Formát názvu souboru podle požadavků: person_YYYYMMDD_HHMMSS.jpg
        now_dt = datetime.now()
        timestamp_str = now_dt.strftime("%Y%m%d_%H%M%S")
        filename = f"person_{timestamp_str}.jpg"
        save_path = str(Config.PERSON_CAPTURES_DIR / filename)

        # Uložení ve vysoké JPEG kvalitě (95%)
        cv2.imwrite(save_path, person_crop, [int(cv2.IMWRITE_JPEG_QUALITY), 95])
        logger.info(f"[Detector] Uložena fotografie osoby: {filename}")

        # Zápis do SQLite databáze
        human_ts = now_dt.strftime("%Y-%m-%d %H:%M:%S")
        self.db.log_person(confidence=confidence, image_path=save_path, timestamp=human_ts)

        # Odeslání Telegram notifikace s fotografií (asynchronně bez blokování smyčky)
        self.notifier.notify_person_at_gate(save_path, confidence)

    def _handle_vehicle_capture(
        self,
        full_frame: np.ndarray,
        vehicle_crop: np.ndarray,
        plate_text: str,
        confidence: float,
        vehicle_type: str
    ) -> None:
        """Uloží snímek vozidla a záznam o SPZ."""
        now_dt = datetime.now()
        timestamp_str = now_dt.strftime("%Y%m%d_%H%M%S")
        filename = f"vehicle_{timestamp_str}_{plate_text}.jpg"
        save_path = str(Config.VEHICLE_CAPTURES_DIR / filename)

        # Uložíme výřez vozidla
        cv2.imwrite(save_path, vehicle_crop, [int(cv2.IMWRITE_JPEG_QUALITY), 92])
        logger.info(f"[Detector] Zaznamenána nová SPZ: {plate_text} ({vehicle_type})")

        human_ts = now_dt.strftime("%Y-%m-%d %H:%M:%S")
        self.db.log_vehicle(
            plate_text=plate_text,
            confidence=confidence,
            image_path=save_path,
            vehicle_type=vehicle_type,
            timestamp=human_ts
        )

        # Asynchronní notifikace na Telegram
        self.notifier.notify_vehicle_anpr(plate_text, confidence, vehicle_type)

    def _draw_zones(self, frame: np.ndarray) -> None:
        """Vykreslí poloprůhledné výplně a obrysy polygonálních zón."""
        overlay = frame.copy()

        # ROAD_ZONE (Modrá barva)
        cv2.fillPoly(overlay, [self.road_polygon], (230, 100, 30))
        cv2.polylines(frame, [self.road_polygon], True, (255, 120, 40), 2)

        # GATE_ZONE (Zelená barva)
        cv2.fillPoly(overlay, [self.gate_polygon], (40, 180, 50))
        cv2.polylines(frame, [self.gate_polygon], True, (60, 220, 70), 2)

        # Smíchání s průhledností alpha = 0.22
        cv2.addWeighted(overlay, 0.22, frame, 0.78, 0, frame)

        # Textové štítky zón
        if len(Config.ROAD_ZONE) > 0:
            rx, ry = Config.ROAD_ZONE[0]
            cv2.putText(frame, "ROAD_ZONE (ANPR)", (rx + 10, ry + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

        if len(Config.GATE_ZONE) > 0:
            gx, gy = Config.GATE_ZONE[0]
            cv2.putText(frame, "GATE_ZONE (Osoby)", (gx + 10, gy + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2)

    def _safe_crop(self, img: np.ndarray, x1: int, y1: int, x2: int, y2: int) -> Optional[np.ndarray]:
        """Bezpečně ořízne snímek s ošetřením mezí matice."""
        h, w = img.shape[:2]
        x1_c, y1_c = max(0, x1), max(0, y1)
        x2_c, y2_c = min(w, x2), min(h, y2)
        if x2_c > x1_c and y2_c > y1_c:
            return img[y1_c:y2_c, x1_c:x2_c]
        return None

    def _cleanup_expired_cooldowns(self, current_time: float) -> None:
        """Odstraní záznamy starší než dvojnásobek ANPR_COOLDOWN_SEC z paměti pro ušetření RAM."""
        expired = [p for p, t in self.plate_cooldowns.items() if (current_time - t) > Config.ANPR_COOLDOWN_SEC * 2]
        for p in expired:
            del self.plate_cooldowns[p]

    @staticmethod
    def _get_vehicle_type_name(cls_id: int) -> str:
        mapping = {2: "auto", 3: "motocykl", 5: "autobus", 7: "nákladní auto"}
        return mapping.get(cls_id, "vozidlo")
