"""
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

# Inicializace databáze a složek
Config.ensure_directories()
db = DatabaseManager()

# Mount statických složek s fotografiemi
app.mount("/captures", StaticFiles(directory=str(Config.CAPTURES_DIR)), name="captures")

# Šablony Jinja2
TEMPLATES_DIR = Path(__file__).resolve().parent / "templates"
TEMPLATES_DIR.mkdir(parents=True, exist_ok=True)
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

# HTTP Basic Auth zabezpečení
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


# -----------------------------------------------------------------------------
# REST API ENDPOINTY (ZABEZPEČENÉ)
# -----------------------------------------------------------------------------

@app.get("/api/stats")
async def get_stats(_user: str = Depends(verify_credentials)):
    """Vrátí aktuální souhrnné statistiky."""
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
    """Vrátí filtrovaný seznam průjezdů vozidel v JSON formátu."""
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
    """Vrátí seznam zachycených osob v JSON formátu."""
    items = db.get_persons(limit=limit, offset=offset, date_from=date_from, date_to=date_to)
    for item in items:
        item["web_image_url"] = _to_web_url(item["image_path"])
    return items


@app.delete("/api/vehicles/{record_id}")
async def api_delete_vehicle(record_id: int, _user: str = Depends(verify_credentials)):
    """Smaže záznam o vozidle a příslušný soubor fotografie z disku."""
    success = db.delete_vehicle(record_id)
    if not success:
        raise HTTPException(status_code=404, detail="Záznam nebyl nalezen")
    return {"status": "success", "deleted_id": record_id}


@app.delete("/api/persons/{record_id}")
async def api_delete_person(record_id: int, _user: str = Depends(verify_credentials)):
    """Smaže záznam o osobě a soubor fotografie z disku."""
    success = db.delete_person(record_id)
    if not success:
        raise HTTPException(status_code=404, detail="Záznam nebyl nalezen")
    return {"status": "success", "deleted_id": record_id}


@app.post("/api/maintenance/cleanup")
async def api_trigger_retention(_user: str = Depends(verify_credentials)):
    """Manuálně spustí retenci dat a pročištění starých souborů."""
    result = db.purge_old_records(Config.RETENTION_DAYS)
    return {
        "status": "success",
        "message": f"Retence dat dokončena (lhůta: {Config.RETENTION_DAYS} dní)",
        "stats": result
    }


# -----------------------------------------------------------------------------
# MJPEG ŽIVÝ STREAM (THREAD-SAFE & ZERO LATENCY BUFFER)
# -----------------------------------------------------------------------------

async def mjpeg_stream_generator() -> AsyncGenerator[bytes, None]:
    """Generátor multipart MJPEG streamu napojený na ThreadSafeFrameHub."""
    client_queue = frame_hub.subscribe(max_buffer_size=1)
    frame_interval = 1.0 / max(1, Config.MJPEG_FPS)

    try:
        while True:
            jpeg_bytes = None
            try:
                # Pokusíme se vyzvednout snímek z in-process fronty
                jpeg_bytes = client_queue.get_nowait()
            except Exception:
                # Pokud ještě ve frontě nic není nebo běží main.py jako separátní proces,
                # zkontrolujeme atomický soubor na disku
                if Config.LIVE_FRAME_PATH.exists():
                    try:
                        jpeg_bytes = Config.LIVE_FRAME_PATH.read_bytes()
                    except Exception:
                        pass

            if jpeg_bytes is not None:
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" + jpeg_bytes + b"\r\n"
                )

            await asyncio.sleep(frame_interval)
    finally:
        frame_hub.unsubscribe(client_queue)


@app.get("/api/stream/live")
async def live_stream(_user: str = Depends(verify_credentials)):
    """Poskytuje živý MJPEG video stream z kamery s nízkou latencí."""
    return StreamingResponse(
        mjpeg_stream_generator(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


# -----------------------------------------------------------------------------
# HTML STRÁNKY (DASHBOARD)
# -----------------------------------------------------------------------------

@app.get("/", response_class=HTMLResponse)
async def dashboard_page(
    request: Request,
    plate: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    _user: str = Depends(verify_credentials)
):
    """Hlavní zabezpečená stránka webového rozhraní."""
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


# -----------------------------------------------------------------------------
# POMOCNÉ FUNKCE
# -----------------------------------------------------------------------------

def _to_web_url(local_path: str) -> str:
    """Převede lokální diskovou cestu na webovou URL adresu začínající /captures/..."""
    try:
        p = Path(local_path)
        rel = p.relative_to(Config.CAPTURES_DIR)
        return f"/captures/{rel.as_posix()}"
    except Exception:
        return f"/captures/{os.path.basename(local_path)}"


if __name__ == "__main__":
    print("=" * 65)
    print(f"  VisionGuard AI - Zabezpečený Dashboard")
    print(f"  Adresa: http://{Config.DASHBOARD_HOST}:{Config.DASHBOARD_PORT}")
    print(f"  Přihlašovací jméno: {Config.DASHBOARD_USERNAME}")
    print("=" * 65)
    uvicorn.run(
        "dashboard:app",
        host=Config.DASHBOARD_HOST,
        port=Config.DASHBOARD_PORT,
        reload=False,
        log_level="info"
    )
