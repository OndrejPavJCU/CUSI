"""
VisionGuard AI - ANPR & OCR Modul pro rozpoznávání registračních značek (SPZ)
Zpracovává výřez vozidla, detekuje oblast tabulky a provádí optické rozpoznání textu (OCR).
Obsahuje normalizaci textu, validaci formátu českých/evropských SPZ a výpočet spolehlivosti.
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
        """Inicializuje EasyOCR čtečku s podporou GPU (CUDA) pokud je k dispozici."""
        try:
            import easyocr
            import torch
            use_gpu = torch.cuda.is_available()
            logger.info(f"[ANPR] Načítám EasyOCR model (GPU akcelerace: {use_gpu})...")
            self.reader = easyocr.Reader(Config.OCR_LANGUAGES, gpu=use_gpu, verbose=False)
            logger.info("[ANPR] EasyOCR model úspěšně inicializován.")
        except ImportError:
            logger.warning("[ANPR] Knihovna 'easyocr' není nainstalována. Použije se heuristický dummy fallback.")
        except Exception as e:
            logger.error(f"[ANPR] Chyba při startu EasyOCR: {e}")

    def extract_license_plate(self, vehicle_crop: np.ndarray) -> Tuple[Optional[str], float, Optional[np.ndarray]]:
        """
        Zpracuje výřez vozidla a pokusí se najít a přečíst SPZ.
        Vrací: (plate_text, confidence, plate_crop)
        """
        if vehicle_crop is None or vehicle_crop.size == 0:
            return None, 0.0, None

        # 1. Předzpracování obrazu pro zvýšení kontrastu a ostrosti textu
        h, w = vehicle_crop.shape[:2]
        
        # Značka je typicky ve spodní polovině výřezu vozidla (nárazník)
        lower_half_crop = vehicle_crop[int(h * 0.45):, :]
        if lower_half_crop.size == 0:
            lower_half_crop = vehicle_crop

        # 2. OCR rozpoznání
        if self.reader is not None:
            try:
                # EasyOCR detekce na oříznuté dolní části auta
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

        # Pokud se OCR nezdařilo na ořezu, zkusíme celý crop vozidla
        return None, 0.0, None

    @staticmethod
    def _clean_plate_text(raw_text: str) -> str:
        """Odstraní mezery, pomlčky a nežádoucí znaky. Převede na velká písmena."""
        # Odstranění všech nealfanumerických znaků
        cleaned = re.sub(r"[^A-Za-z0-9]", "", raw_text).upper()
        # Běžné záměny OCR chyb: 'O' za '0', 'I' za '1' na specifických pozicích
        return cleaned

    @staticmethod
    def _is_valid_plate(text: str) -> bool:
        """
        Ověří, zda text odpovídá typickému formátu české / evropské SPZ.
        Většina CZ značek má 7-8 znaků (např. 1AB 2345, 8B2 9876, 5SA 1234, EL-123AA).
        """
        if not text:
            return False
        
        length = len(text)
        if not (Config.PLATE_MIN_LENGTH <= length <= Config.PLATE_MAX_LENGTH):
            return False

        # Musí obsahovat jak číslice, tak písmena (většina SPZ není pouze text ani pouze čísla)
        has_digit = any(c.isdigit() for c in text)
        has_alpha = any(c.isalpha() for c in text)

        # SPZ musí mít aspoň jedno písmeno a aspoň jedno číslo
        return has_digit and has_alpha
