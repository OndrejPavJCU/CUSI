import React from 'react';
import { Terminal, Shield, Cpu, MessageSquare, Video, Settings, CheckCircle2 } from 'lucide-react';

export const GuideTab: React.FC = () => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Intro */}
      <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 space-y-2">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Terminal className="w-5 h-5 text-emerald-400" />
          <span>Kompletní Průvodce Instalací & Nasazením Systému</span>
        </h2>
        <p className="text-sm text-neutral-400 leading-relaxed">
          Tento návod vás provede instalací Python prostředí, připojením IP kamery, nastavením Telegram Bota
          a spuštěním jak detekčního démona, tak webového dashboardu pro 24/7 provoz.
        </p>
      </div>

      {/* Step 1: Python venv & dependencies */}
      <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold font-mono text-sm">
            1
          </div>
          <h3 className="text-base font-semibold text-white">Příprava virtuálního prostředí & instalace závislostí</h3>
        </div>

        <p className="text-xs text-neutral-300 leading-relaxed">
          Doporučujeme Python 3.10 nebo 3.11. Vytvořte izolované virtuální prostředí, aby nedocházelo ke kolizím knihoven:
        </p>

        <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-xs text-neutral-200 space-y-1">
          <div className="text-neutral-500"># 1. Vytvoření a aktivace prostředí v Linuxu / macOS:</div>
          <div>python3 -m venv venv</div>
          <div>source venv/bin/activate</div>
          <div className="text-neutral-500 pt-1"># Pro Windows (cmd/PowerShell):</div>
          <div>venv\Scripts\activate</div>
          <div className="text-neutral-500 pt-1"># 2. Instalace balíčků:</div>
          <div>pip install -r requirements.txt</div>
        </div>

        <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300 flex items-start gap-2">
          <Cpu className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <strong>Tip pro GPU akceleraci (NVIDIA CUDA):</strong> Pokud váš počítač nebo server disponuje grafickou kartou NVIDIA,
            nainstalujte PyTorch s podporou CUDA před spuštěním detektoru příkazem:
            <code className="block mt-1 bg-black/40 px-2 py-1 rounded font-mono text-emerald-200">
              pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
            </code>
            Tím dosáhnete až 10× vyšší rychlosti zpracování snímků oproti čistému CPU.
          </div>
        </div>
      </div>

      {/* Step 2: RTSP Stream format */}
      <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold font-mono text-sm">
            2
          </div>
          <h3 className="text-base font-semibold text-white">Připojení RTSP streamu z vaší IP kamery</h3>
        </div>

        <p className="text-xs text-neutral-300 leading-relaxed">
          V souboru <code className="text-white font-mono bg-neutral-800 px-1 py-0.5 rounded">.env</code> nastavte proměnnou <code className="text-white font-mono bg-neutral-800 px-1 py-0.5 rounded">RTSP_URL</code>. Příklady URL adres pro nejrozšířenější výrobce:
        </p>

        <div className="space-y-2 text-xs font-mono">
          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
            <span className="text-neutral-500 font-sans text-[11px] block mb-1">Dahua / IMOU:</span>
            <span className="text-sky-400">rtsp://admin:Heslo@192.168.1.108:554/cam/realmonitor?channel=1&subtype=0</span>
          </div>

          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
            <span className="text-neutral-500 font-sans text-[11px] block mb-1">Hikvision / Hilook:</span>
            <span className="text-sky-400">rtsp://admin:Heslo@192.168.1.108:554/Streaming/Channels/101</span>
          </div>

          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
            <span className="text-neutral-500 font-sans text-[11px] block mb-1">Reolink:</span>
            <span className="text-sky-400">rtsp://admin:Heslo@192.168.1.108:554/h264Preview_01_main</span>
          </div>

          <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800">
            <span className="text-neutral-500 font-sans text-[11px] block mb-1">Lokální USB webkamera (pro test na notebooku):</span>
            <span className="text-emerald-400">0</span>
          </div>
        </div>
      </div>

      {/* Step 3: Telegram Bot setup */}
      <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold font-mono text-sm">
            3
          </div>
          <h3 className="text-base font-semibold text-white">Nastavení Telegram Bota (Notifikace za 2 minuty)</h3>
        </div>

        <ol className="list-decimal list-inside space-y-2 text-xs text-neutral-300 leading-relaxed">
          <li>
            Otevřete v Telegramu vyhledávání a najděte oficiálního robota <strong className="text-white">@BotFather</strong>.
          </li>
          <li>
            Odešlete zprávu <code className="text-white font-mono bg-neutral-800 px-1 py-0.5 rounded">/newbot</code> a zadejte jméno (např. <em>MujKamerovyDohledBot</em>).
          </li>
          <li>
            BotFather vám vypíše API token ve formátu:
            <code className="text-sky-400 font-mono bg-neutral-950 px-1.5 py-0.5 rounded ml-1">123456789:ABCdefGhIJKlmNo...</code>. Zkopírujte jej do proměnné <code className="text-white font-mono">TELEGRAM_BOT_TOKEN</code>.
          </li>
          <li>
            Zjistěte své Chat ID: Napište robotovi <strong className="text-white">@userinfobot</strong> na Telegramu – obratem vám napíše vaše číselné ID (např. <code className="text-emerald-400 font-mono">987654321</code>), které vložte do <code className="text-white font-mono">TELEGRAM_CHAT_ID</code>.
          </li>
        </ol>
      </div>

      {/* Step 4: Calibrating zones */}
      <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold font-mono text-sm">
            4
          </div>
          <h3 className="text-base font-semibold text-white">Zaměření a kalibrace zón (ROAD_ZONE a GATE_ZONE)</h3>
        </div>

        <p className="text-xs text-neutral-300 leading-relaxed">
          Spusťte pomocný interaktivní nástroj:
        </p>

        <div className="p-3.5 rounded-lg bg-neutral-950 border border-neutral-800 font-mono text-xs text-neutral-200">
          python calibrate_zones.py
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-sky-950/20 border border-sky-800/40 space-y-1">
            <span className="font-semibold text-sky-300">ROAD_ZONE (Silnice/Vozovka):</span>
            <p className="text-neutral-400 text-[11px]">
              Klávesa <strong className="text-white font-mono">R</strong> aktivuje silniční zónu. Naklikejte myší rohy vozovky, kudy projíždějí vozidla. V této oblasti model automaticky spouští ANPR OCR pro čtení SPZ.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 space-y-1">
            <span className="font-semibold text-emerald-300">GATE_ZONE (Branka/Vstup):</span>
            <p className="text-neutral-400 text-[11px]">
              Klávesa <strong className="text-white font-mono">G</strong> aktivuje zónu branky. Naklikejte prostor přímo před brankou nebo zvonkem. Jakmile sem vstoupí postava, systém provede ořez s dynamickým paddingem a pošle fotku.
            </p>
          </div>
        </div>

        <p className="text-xs text-neutral-400">
          Stiskem klávesy <strong className="text-white font-mono">S</strong> program vypíše přesné souřadnice do terminálu. Vložte je do <code className="text-white font-mono">config.py</code>.
        </p>
      </div>

      {/* Step 5: Running detection & dashboard */}
      <div className="p-6 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold font-mono text-sm">
            5
          </div>
          <h3 className="text-base font-semibold text-white">Spuštění systému (Detektor + Webový Dashboard)</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="font-sans font-semibold text-white">A) Spuštění detekce (Konzole 1):</div>
            <div className="text-sky-400">python main.py</div>
            <p className="font-sans text-[11px] text-neutral-400">
              Připojí se k RTSP streamu, zahájí analýzu objektů s frame skippingem, loguje do SQLite a odesílá Telegram zprávy.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800 space-y-2">
            <div className="font-sans font-semibold text-white">B) Spuštění Webového Dashboardu (Konzole 2):</div>
            <div className="text-emerald-400">python dashboard.py</div>
            <p className="font-sans text-[11px] text-neutral-400">
              Spustí webový server na <strong className="text-white">http://localhost:8000</strong> s přehledem průjezdů, galerií a vyhledáváním.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
