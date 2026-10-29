# VisionGuard AI - Inteligentní Kamerový Dohled, ANPR & Zabezpečený Hub

Produkční Python systém pro nepřetržité (24/7) monitorování RTSP video streamu z IP kamer s využitím počítačového vidění (OpenCV), YOLOv8 detekce s CUDA GPU akcelerací (s CPU fallbackem), ANPR čtení SPZ (EasyOCR), zónové detekce osob u branky, asynchronních Telegram notifikací, automatické retence dat a zabezpečeného webového dashboardu (FastAPI s HTTP Basic Auth a MJPEG streamem s nulovou latencí).

---

## 📁 Struktura Projektu

```text
python_app/
├── config.py             # Centrální konfigurace, polygonální zóny, cooldowny a zabezpečení
├── .env.example          # Šablona konfiguračních proměnných (RTSP, Basic Auth, Retence)
├── requirements.txt      # Požadované Python balíčky
├── stream_reader.py      # Thread-safe RTSP čteč s aktivním Watchdogem a TCP transportem
├── preprocessor.py       # Noční IR předzpracování (CLAHE kontrast & odšumění)
├── frame_hub.py          # Thread-safe FrameHub pro MJPEG stream (Zero Lag Buffer, dropping queue)
├── retention_worker.py   # Automatická retence dat (mazání fotek a záznamů starších než RETENTION_DAYS)
├── anpr_engine.py        # OCR extrakce a validace registračních značek (SPZ)
├── detector.py           # Jádro VisionProcessor (YOLO + CUDA/CPU + Polygony + Cooldown + Crop)
├── notifier.py           # Asynchronní Telegram Bot notifikace (fotky + text bez blokování)
├── db.py                 # SQLite databáze s WAL režimem pro bezpečný souběh čtení a zápisu
├── calibrate_zones.py    # Interaktivní GUI kalibrátor zón (naklikání bodů ROAD_ZONE & GATE_ZONE)
├── main.py               # Hlavní detekční démon (běží na pozadí 24/7)
├── dashboard.py          # Zabezpečený Webový Dashboard (FastAPI server na portu 8000 s Basic Auth)
└── templates/
    └── index.html        # Responzivní webové rozhraní (Tailwind CSS, živý stream, modal)
```

---

## 🚀 Rychlá Instalace a Spuštění

### 1. Klonování a vytvoření virtuálního prostředí
```bash
# Vytvoření virtuálního prostředí
python3 -m venv venv
source venv/bin/activate  # Na Windows: venv\Scripts\activate

# Instalace závislostí
pip install -r requirements.txt
```

*Tip pro GPU akceleraci (NVIDIA CUDA):*
Systém automaticky detekuje přítomnost grafické karty a zvolí CUDA GPU (s FP16 přesností pro maximální FPS). Pokud CUDA není nalezena, provede hladký fallback na CPU.
Pro plné využití NVIDIA GPU:
```bash
pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
```

### 2. Nastavení konfigurace (.env)
Zkopírujte šablonu `.env.example` na `.env`:
```bash
cp .env.example .env
nano .env
```
Nastavte klíčové proměnné:
- `RTSP_URL`: RTSP adresa kamery (např. `rtsp://admin:Heslo123@192.168.1.108:554/h264Preview_01_main`)
- `FRAME_SKIP`: Zpracovávat každý N-tý snímek (výchozí 3 = ~8 FPS při 25 FPS streamu, šetří 65 % výpočetního výkonu)
- `RETENTION_DAYS`: Počet dní uchovávání fotografií a záznamů (výchozí 14 dní)
- `DASHBOARD_USERNAME` & `DASHBOARD_PASSWORD`: Přihlašovací údaje pro webový dashboard
- `TELEGRAM_BOT_TOKEN` & `TELEGRAM_CHAT_ID`: Telegram notifikace

---

## 🎯 Jak zkalibrovat zóny (ROAD_ZONE a GATE_ZONE)

Spusťte pomocný kalibrační nástroj:
```bash
python calibrate_zones.py
```
1. Otevře se okno s obrazem z vaší kamery.
2. **Klávesou `r`** aktivujete kalibraci `ROAD_ZONE` (silnice). Klikáním myší označte 4 rohy vozovky.
3. **Klávesou `g`** přepnete na `GATE_ZONE` (branka). Označte prostor před vstupem.
4. **Klávesou `s`** program vypíše přesné Python souřadnice do konzole.
5. Vložte vypsané pole do souboru `config.py`.

---

## 🖥️ Spuštění Služeb

Architektura striktně odděluje detekční proces od webového dashboardu a zaručuje absolutní thread-safety:

### A) Spuštění detekčního procesu:
```bash
python main.py
```
*Detekční proces se připojí přes TCP na RTSP stream, spustí frame skipping, analyzuje objekty, zapisuje události do SQLite WAL, asynchronně odesílá Telegram notifikace a thread-safe publikuje snímky do FrameHubu.*

### B) Spuštění webového Dashboardu:
```bash
python dashboard.py
```
*Zabezpečený Dashboard nastartuje na: `http://localhost:8000`. Prohlížeč si vyžádá jméno a heslo nastavené v `.env`.*

---

## 🛡️ Thread-Safety & Nízkolatentní MJPEG Stream

- Propojení mezi detekční smyčkou OpenCV a webovým serverem **nepoužívá žádné globální proměnné**.
- Využívá třídu `ThreadSafeFrameHub` s individuálními frontami `queue.Queue(maxsize=1)` pro každého připojeného klienta.
- Při zpoždění sítě nebo klienta se starý snímek okamžitě zahodí (**drop-oldest pattern**). Tím je zaručeno, že video netrpí zpožděním (lag accumulation) ani rozpadem obrazu (tearing).

---

## 🧹 Automatická Retence Dat (Data Cleanup)

- Vlákno `DataRetentionWorker` na pozadí pravidelně (každých 6 hodin a při startu) kontroluje stáří souborů.
- Záznamy a fotografie starší než `RETENTION_DAYS` (např. 14 dní) jsou automaticky smazány z disku i z databáze.
- V dashboardu je rovněž k dispozici tlačítko pro **manuální spuštění retence**.
