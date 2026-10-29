"""
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
        # Inicializace CLAHE pro adaptivní vyrovnání jasu
        self.clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid_size)

    def enhance_ir_frame(self, frame: np.ndarray, apply_denoise: bool = True) -> np.ndarray:
        """
        Aplikuje CLAHE vyrovnání jasu na L-kanál (LAB prostor) a volitelně mírné odšumění.
        Zvyšuje kontrast textu SPZ a obrysů postav v nočních podmínkách bez přepálení.
        """
        if frame is None or frame.size == 0:
            return frame

        try:
            # Převod do barevného prostoru LAB (oddělení jasu L od barvonosných složek A, B)
            lab = cv2.cvtColor(frame, cv2.COLOR_BGR2LAB)
            l_channel, a_channel, b_channel = cv2.split(lab)

            # Aplikace adaptivního vyrovnání jasu pouze na L kanál
            enhanced_l = self.clahe.apply(l_channel)

            # Sloučení kanálů zpět a převod do BGR
            merged_lab = cv2.merge((enhanced_l, a_channel, b_channel))
            enhanced_frame = cv2.cvtColor(merged_lab, cv2.COLOR_LAB2BGR)

            # Volitelné rychlé odšumění (Gaussovský filtr s malým jádrem pro zachování hran)
            if apply_denoise:
                enhanced_frame = cv2.GaussianBlur(enhanced_frame, (3, 3), 0)

            return enhanced_frame

        except Exception as e:
            logger.warning(f"[Preprocessor] Chyba při úpravě kontrastu: {e}")
            return frame

    def is_night_or_ir_scene(self, frame: np.ndarray, saturation_threshold: float = 25.0, brightness_threshold: float = 85.0) -> bool:
        """
        Heuristicky detekuje, zda kamera běží v nočním IR režimu
        (IR režim se vyznačuje téměř nulovou saturací barev a specifickou distribucí jasu).
        """
        try:
            hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
            mean_saturation = np.mean(hsv[:, :, 1])
            mean_value = np.mean(hsv[:, :, 2])
            return bool(mean_saturation < saturation_threshold and mean_value < brightness_threshold)
        except Exception:
            return False
