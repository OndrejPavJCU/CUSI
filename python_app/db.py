"""
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
        """Vrátí nové spojení s nastaveným timeoutem a formátem řádků jako slovník."""
        conn = sqlite3.connect(str(self.db_path), timeout=15.0)
        conn.row_factory = sqlite3.Row
        # WAL režim umožňuje souběžné čtení a zápis bez zamykání databáze
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA synchronous=NORMAL;")
        return conn

    def init_db(self) -> None:
        """Inicializace schématu databáze."""
        with self._get_connection() as conn:
            cursor = conn.cursor()

            # Tabulka detekcí vozidel a SPZ (ANPR)
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

            # Tabulka detekcí osob u branky
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS person_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    confidence REAL NOT NULL,
                    image_path TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            """)

            # Indexy pro rychlé vyhledávání podle SPZ a data
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_vehicle_plate ON vehicle_logs(plate_text);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_vehicle_timestamp ON vehicle_logs(timestamp);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_person_timestamp ON person_logs(timestamp);")

            conn.commit()

    def log_vehicle(
        self,
        plate_text: str,
        confidence: float,
        image_path: str,
        vehicle_type: str = "car",
        timestamp: Optional[str] = None
    ) -> int:
        """Uloží záznam o průjezdu vozidla a rozpoznané SPZ."""
        ts = timestamp or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO vehicle_logs (timestamp, plate_text, confidence, vehicle_type, image_path)
                VALUES (?, ?, ?, ?, ?)
            """, (ts, plate_text.upper().strip(), float(confidence), vehicle_type, image_path))
            conn.commit()
            return cursor.lastrowid or 0

    def log_person(
        self,
        confidence: float,
        image_path: str,
        timestamp: Optional[str] = None
    ) -> int:
        """Uloží záznam o zachycení osoby u branky."""
        ts = timestamp or datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO person_logs (timestamp, confidence, image_path)
                VALUES (?, ?, ?)
            """, (ts, float(confidence), image_path))
            conn.commit()
            return cursor.lastrowid or 0

    def get_vehicles(
        self,
        limit: int = 50,
        offset: int = 0,
        plate_query: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None
    ) -> list[dict[str, Any]]:
        """Získá záznamy o vozidlech s volitelným fulltextovým vyhledáváním a filtrem."""
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

    def get_persons(
        self,
        limit: int = 50,
        offset: int = 0,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None
    ) -> list[dict[str, Any]]:
        """Získá záznamy o osobách zachycených u branky."""
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
        """Smaže záznam vozidla včetně uloženého souboru fotografie z disku."""
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
        """Smaže záznam osoby včetně uložené fotografie z disku."""
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
        """
        Automatická retence dat (Data Cleanup):
        Vyhledá a smaže fotografie i databázové záznamy starší než definovaný počet dní.
        Vrací statistiku smazaných položek.
        """
        cutoff_dt = datetime.now() - timedelta(days=retention_days)
        cutoff_str = cutoff_dt.strftime("%Y-%m-%d %H:%M:%S")

        deleted_vehicles = 0
        deleted_persons = 0
        deleted_files = 0

        with self._get_connection() as conn:
            cursor = conn.cursor()

            # 1. Vyhledání a smazání starých fotografií osob
            cursor.execute("SELECT id, image_path FROM person_logs WHERE timestamp < ?", (cutoff_str,))
            old_persons = cursor.fetchall()
            for row in old_persons:
                if row["image_path"] and self._safe_delete_file(row["image_path"]):
                    deleted_files += 1

            cursor.execute("DELETE FROM person_logs WHERE timestamp < ?", (cutoff_str,))
            deleted_persons = cursor.rowcount

            # 2. Vyhledání a smazání starých fotografií vozidel
            cursor.execute("SELECT id, image_path FROM vehicle_logs WHERE timestamp < ?", (cutoff_str,))
            old_vehicles = cursor.fetchall()
            for row in old_vehicles:
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
        """Vrátí souhrnné statistiky (dnes a celkem)."""
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
        """Bezpečně smaže soubor z disku, pokud existuje."""
        try:
            p = Path(path_str)
            if p.exists() and p.is_file():
                p.unlink()
                return True
        except Exception as e:
            print(f"[DB] Chyba při mazání souboru '{path_str}': {e}")
        return False
