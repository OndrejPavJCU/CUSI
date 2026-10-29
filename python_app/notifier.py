"""
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
            logger.warning("[Telegram] Notifikace jsou vypnuté nebo chybí TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID.")

    def notify_vehicle_anpr(self, plate_text: str, confidence: float, vehicle_type: str = "car") -> None:
        """Zařadí textové upozornění o vjezdu/průjezdu vozidla do fronty k odeslání."""
        if not self.enabled:
            return

        message = (
            f"🚗 *Detekováno vozidlo v zóně silnice*\n"
            f"━━━━━━━━━━━━━━━━━━━\n"
            f"🔹 *SPZ:* `{plate_text}`\n"
            f"🔹 *Typ:* {vehicle_type.capitalize()}\n"
            f"🔹 *Jistota OCR:* {confidence * 100:.1f} %\n"
            f"⏰ *Čas:* `{self._get_current_time()}`"
        )
        self._queue.put({"type": "message", "text": message})

    def notify_person_at_gate(self, photo_path: str, confidence: float) -> None:
        """Zařadí odeslání fotografie zachycené osoby u branky s popiskem do fronty."""
        if not self.enabled:
            return

        caption = (
            f"🚶‍♂️ *Pozor: Detekována osoba u branky!*\n"
            f"━━━━━━━━━━━━━━━━━━━\n"
            f"🔹 *Zóna:* GATE_ZONE (Vstup)\n"
            f"🔹 *Spolehlivost:* {confidence * 100:.1f} %\n"
            f"⏰ *Čas:* `{self._get_current_time()}`"
        )
        self._queue.put({"type": "photo", "path": photo_path, "caption": caption})

    def _process_queue(self) -> None:
        """Pracovní smyčka na pozadí, která odebírá úlohy z fronty a volá Telegram API."""
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
        """Odešle zprávu přímo přes HTTP POST na Telegram Bot API."""
        url = f"https://api.telegram.org/bot{self.token}/sendMessage"
        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": "Markdown",
            "disable_web_page_preview": True,
        }
        try:
            resp = requests.post(url, json=payload, timeout=8.0)
            if resp.status_code == 200:
                logger.info("[Telegram] Textová zpráva úspěšně odeslána.")
                return True
            else:
                logger.error(f"[Telegram] Chyba API {resp.status_code}: {resp.text}")
        except Exception as e:
            logger.error(f"[Telegram] Výjimka při odesílání: {e}")
        return False

    def _send_photo_direct(self, photo_path: str, caption: str) -> bool:
        """Odešle fotografii jako soubor multipart/form-data na Telegram Bot API."""
        if not os.path.exists(photo_path):
            logger.warning(f"[Telegram] Soubor neexistuje: {photo_path}")
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
                if resp.status_code == 200:
                    logger.info(f"[Telegram] Fotografie {os.path.basename(photo_path)} úspěšně odeslána.")
                    return True
                else:
                    logger.error(f"[Telegram] Chyba API při odesílání fotky: {resp.status_code} - {resp.text}")
        except Exception as e:
            logger.error(f"[Telegram] Výjimka při odesílání fotky: {e}")
        return False

    @staticmethod
    def _get_current_time() -> str:
        from datetime import datetime
        return datetime.now().strftime("%d.%m.%Y %H:%M:%S")
