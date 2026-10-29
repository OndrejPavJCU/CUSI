"""
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
        """Spustí úklidové vlákno na pozadí (daemon)."""
        if self.is_running:
            return self

        self.is_running = True
        self._thread = threading.Thread(target=self._run_loop, name="DataRetentionThread", daemon=True)
        self._thread.start()
        logger.info(
            f"[Retention] Služba retence dat spuštěna (Lhůta: {self.retention_days} dní, "
            f"perioda kontroly: {self.interval_seconds / 3600:.1f}h)"
        )
        return self

    def _run_loop(self) -> None:
        """Hlavní smyčka vlákna retence dat."""
        # 1. První kontrola při startu služby
        time.sleep(10.0)  # Krátká prodleva pro dokončení inicializace DB
        self.run_cleanup_now()

        # 2. Periodická kontrola v definovaném intervalu
        while self.is_running:
            # Spánek rozdělený na krátké úseky pro rychlou reakci při zastavení služby
            for _ in range(int(self.interval_seconds / 5)):
                if not self.is_running:
                    break
                time.sleep(5)

            if self.is_running:
                self.run_cleanup_now()

    def run_cleanup_now(self) -> dict[str, int]:
        """Provede okamžitý úklid dat starších než RETENTION_DAYS."""
        try:
            logger.info(f"[Retention] Spouštím kontrolu expirovaných dat starších než {self.retention_days} dní...")
            result = self.db.purge_old_records(self.retention_days)
            logger.info(
                f"[Retention] Úklid dokončen: Smazáno {result.get('deleted_vehicles', 0)} záznamů vozidel, "
                f"{result.get('deleted_persons', 0)} záznamů osob, "
                f"{result.get('deleted_files', 0)} souborů fotografií."
            )
            return result
        except Exception as e:
            logger.error(f"[Retention] Chyba při úklidu starých dat: {e}")
            return {"deleted_vehicles": 0, "deleted_persons": 0, "deleted_files": 0}

    def stop(self) -> None:
        """Zastaví úklidové vlákno."""
        self.is_running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2.0)
        logger.info("[Retention] Vlákno retence dat zastaveno.")
