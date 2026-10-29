import React, { useState } from 'react';
import { Eye, EyeOff, Play, Send, RefreshCw, AlertCircle, CheckCircle2, Moon, Sun, Cpu, Zap, WifiOff, Trash2 } from 'lucide-react';
import cctvImage from '@/src/assets/images/cctv_driveway_gate_1792943436467.jpg';
import { VehicleRecord, PersonRecord } from '@/src/data/sampleData';

interface LiveSimulatorTabProps {
  vehicles: VehicleRecord[];
  persons: PersonRecord[];
  onAddVehicle: (record: VehicleRecord) => void;
  onAddPerson: (record: PersonRecord) => void;
}

export const LiveSimulatorTab: React.FC<LiveSimulatorTabProps> = ({
  vehicles,
  persons,
  onAddVehicle,
  onAddPerson,
}) => {
  const [showRoadZone, setShowRoadZone] = useState<boolean>(true);
  const [showGateZone, setShowGateZone] = useState<boolean>(true);
  const [showBBoxes, setShowBBoxes] = useState<boolean>(true);

  // Night IR Mode simulation with CLAHE contrast enhancement
  const [isNightIrMode, setIsNightIrMode] = useState<boolean>(false);

  // Frame skipping state
  const [frameSkip, setFrameSkip] = useState<number>(3);

  // Hardware acceleration mode
  const [hardwareMode, setHardwareMode] = useState<'cuda' | 'cpu'>('cuda');

  // Watchdog RTSP reconnect simulation state
  const [isStreamInterrupted, setIsStreamInterrupted] = useState<boolean>(false);
  const [reconnectCountdown, setReconnectCountdown] = useState<number>(0);

  // Simulated visual detection states
  const [isCarVisible, setIsCarVisible] = useState<boolean>(true);
  const [isPersonVisible, setIsPersonVisible] = useState<boolean>(true);

  // Cooldown timers simulation
  const [anprCooldown, setAnprCooldown] = useState<number>(0);
  const [gateCooldown, setGateCooldown] = useState<number>(0);

  // Notifications feed
  const [logs, setLogs] = useState<Array<{ id: string; time: string; text: string; type: 'vehicle' | 'person' | 'system' }>>([
    {
      id: 'log-1',
      time: '08:45:10',
      text: 'RTSP Stream stabilní (1920x1080 @ 25 FPS, TCP mód). Watchdog OK.',
      type: 'system',
    },
    {
      id: 'log-2',
      time: '08:41:09',
      text: 'GATE_ZONE: Osoba detekována. Ořez person_20261025_084109.jpg odeslán na Telegram.',
      type: 'person',
    },
    {
      id: 'log-3',
      time: '08:34:12',
      text: 'ROAD_ZONE: Detekováno vozidlo, EasyOCR extrahována SPZ: 1AB 8245 (94.2%).',
      type: 'vehicle',
    },
  ]);

  const addLog = (text: string, type: 'vehicle' | 'person' | 'system') => {
    const timeStr = new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs((prev) => [{ id: Math.random().toString(), time: timeStr, text, type }, ...prev.slice(0, 24)]);
  };

  // Trigger simulated vehicle passage
  const handleSimulateVehicle = () => {
    if (anprCooldown > 0) {
      addLog(`[COOLDOWN] Vozidlo se stejnou SPZ odmítnuto z debounce paměti (zbývá ${anprCooldown}s).`, 'system');
      return;
    }

    const samplePlates = ['3AH 5521', '5SA 9014', '7B8 3349', '1AK 4812', '6M2 7701', '2SC 0199'];
    const chosenPlate = samplePlates[Math.floor(Math.random() * samplePlates.length)];
    const types: ('car' | 'van' | 'truck')[] = ['car', 'van', 'car', 'car'];
    const chosenType = types[Math.floor(Math.random() * types.length)];
    const conf = 0.88 + Math.random() * 0.1;

    setIsCarVisible(true);
    const now = new Date();
    const ts = now.toISOString().replace('T', ' ').slice(0, 19);

    const newRec: VehicleRecord = {
      id: Date.now(),
      timestamp: ts,
      plate_text: chosenPlate,
      confidence: conf,
      vehicle_type: chosenType,
      image_path: `/captures/vehicles/vehicle_${now.getTime()}_${chosenPlate.replace(' ', '')}.jpg`,
      speed_estimate: `${Math.floor(24 + Math.random() * 15)} km/h`,
    };

    onAddVehicle(newRec);
    addLog(`ROAD_ZONE: Nové vozidlo ${chosenType.toUpperCase()} s SPZ [${chosenPlate}], OCR: ${(conf * 100).toFixed(1)}%. Telegram odeslán!`, 'vehicle');

    setAnprCooldown(15);
    const timer = setInterval(() => {
      setAnprCooldown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  // Trigger simulated person at gate
  const handleSimulatePerson = () => {
    if (gateCooldown > 0) {
      addLog(`[COOLDOWN] Osoba u branky odmítnuta z debounce paměti (zbývá ${gateCooldown}s).`, 'system');
      return;
    }

    setIsPersonVisible(true);
    const now = new Date();
    const ts = now.toISOString().replace('T', ' ').slice(0, 19);
    const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
    const hms = ts.slice(11).replace(/:/g, '');
    const filename = `person_${ymd}_${hms}.jpg`;
    const conf = 0.91 + Math.random() * 0.07;

    const newRec: PersonRecord = {
      id: Date.now(),
      timestamp: ts,
      filename,
      confidence: conf,
      zone: 'GATE_ZONE',
      image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    };

    onAddPerson(newRec);
    addLog(`GATE_ZONE: Detekována osoba (${(conf * 100).toFixed(0)}%). Ořez s paddingem 25px uložen do ${filename} a odeslán na Telegram!`, 'person');

    setGateCooldown(12);
    const timer = setInterval(() => {
      setGateCooldown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  // Simulate RTSP Network Drop & Watchdog Reconnect
  const handleSimulateWatchdogDrop = () => {
    if (isStreamInterrupted) return;
    setIsStreamInterrupted(true);
    setReconnectCountdown(4);
    addLog('[WATCHDOG ALERT] Ztráta signálu z RTSP kamery! Spouštím auto-reconnect proceduru...', 'system');

    let left = 4;
    const interval = setInterval(() => {
      left -= 1;
      setReconnectCountdown(left);
      if (left <= 0) {
        clearInterval(interval);
        setIsStreamInterrupted(false);
        addLog('[WATCHDOG RECOVERY] Spojení s RTSP kamerou úspěšně obnoveno (TCP socket navázán, buffer: 1 rámec).', 'system');
      }
    }, 1000);
  };

  // Simulate Data Retention Cleanup
  const handleSimulateRetention = () => {
    addLog('[DATA RETENTION] Spuštěna retence dat (Lhůta: 14 dní). Zkontrolováno SQLite WAL.', 'system');
    addLog('[DATA RETENTION DOKONČENO] Smazáno 0 expirovaných souborů (úložiště je čisté, zbývá 87 % volného místa).', 'system');
  };

  // Effective processing FPS calculation
  const inputFps = 25;
  const processedFps = (inputFps / frameSkip).toFixed(1);
  const cpuSaving = Math.round((1 - 1 / frameSkip) * 100);

  return (
    <div className="space-y-6">
      {/* 4-column KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="text-xs text-neutral-400 font-medium">Vozidla dnes (ROAD_ZONE)</div>
          <div className="text-2xl font-bold text-white mt-1 font-mono tabular-nums">{vehicles.length}</div>
          <div className="text-[11px] text-neutral-500 mt-1">YOLOv8 + EasyOCR ANPR</div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="text-xs text-neutral-400 font-medium">Osoby u branky (GATE_ZONE)</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1 font-mono tabular-nums">{persons.length}</div>
          <div className="text-[11px] text-neutral-500 mt-1">Dynamický padding 25px (JPEG 95%)</div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="text-xs text-neutral-400 font-medium">RTSP Watchdog & TCP</div>
          <div className="text-lg font-bold text-white mt-1.5 flex items-center gap-1.5">
            {isStreamInterrupted ? (
              <>
                <AlertCircle className="w-4 h-4 text-rose-400 animate-pulse" />
                <span className="font-mono text-xs text-rose-300">Obnova: {reconnectCountdown}s</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="font-mono text-sm">Připojeno / {inputFps} FPS</span>
              </>
            )}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">Zero Lag Buffer (drop-oldest)</div>
        </div>

        <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800">
          <div className="text-xs text-neutral-400 font-medium">Hardwarová Akcelerace</div>
          <div className="text-lg font-bold text-sky-400 mt-1.5 flex items-center gap-1.5">
            {hardwareMode === 'cuda' ? (
              <>
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="font-mono text-xs">CUDA GPU (FP16)</span>
              </>
            ) : (
              <>
                <Cpu className="w-4 h-4 text-neutral-400" />
                <span className="font-mono text-xs">CPU Fallback</span>
              </>
            )}
          </div>
          <div className="text-[11px] text-neutral-500 mt-1">
            {hardwareMode === 'cuda' ? 'Inference: ~11 ms' : 'Inference: ~62 ms'}
          </div>
        </div>
      </div>

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: CCTV Camera Viewport */}
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden shadow-lg">
            {/* Camera header bar */}
            <div className="px-4 py-3 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-white">KAMERA 01 - Příjezd & Branka</span>
                <span className="text-neutral-500 font-mono hidden sm:inline">rtsp://192.168.1.108:554/h264</span>
              </div>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span className="text-neutral-400">Vstup: {inputFps} FPS</span>
                <span className="text-amber-400">Zpracování: ~{processedFps} FPS (Skip {frameSkip})</span>
                {isNightIrMode && (
                  <span className="px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 text-[10px]">
                    IR CLAHE
                  </span>
                )}
                <span className={isStreamInterrupted ? 'text-rose-400 font-bold animate-pulse' : 'text-emerald-400 font-semibold'}>
                  {isStreamInterrupted ? 'WATCHDOG RECONNECT' : 'ŽIVÝ MJPEG'}
                </span>
              </div>
            </div>

            {/* Video Canvas Container */}
            <div className="relative aspect-video bg-black overflow-hidden select-none">
              {/* CCTV Feed Image with optional Night IR & CLAHE filter */}
              <img
                src={cctvImage}
                alt="CCTV Camera Surveillance Feed"
                className={`w-full h-full object-cover transition-all duration-300 ${
                  isNightIrMode ? 'filter grayscale contrast-150 brightness-90 saturate-50' : ''
                }`}
                referrerPolicy="no-referrer"
              />

              {/* Watermark Overlay */}
              <div className="absolute top-3 left-3 bg-black/75 px-2.5 py-1 text-xs font-mono text-white tracking-widest rounded border border-white/10 pointer-events-none flex items-center gap-2">
                <span>2026-10-25 08:48:00 CAM-01 [TCP]</span>
                {isNightIrMode && <span className="text-indigo-400 text-[10px]">IR-NIGHT</span>}
              </div>

              {/* Watchdog Stream Interrupted Warning Overlay */}
              {isStreamInterrupted && (
                <div className="absolute inset-0 bg-black/85 flex flex-col items-center justify-center text-center p-6 space-y-3 z-20">
                  <WifiOff className="w-12 h-12 text-rose-400 animate-pulse" />
                  <div className="text-base font-bold text-white">Signál z RTSP kamery přerušen</div>
                  <div className="text-xs text-neutral-400 max-w-sm">
                    Watchdog detekoval výpadek paketu. Provádí bezpečný reset OpenCV spojení s TCP flagem...
                  </div>
                  <div className="text-xs font-mono text-emerald-400 bg-neutral-900 px-3 py-1.5 rounded-full border border-neutral-700">
                    Opětné připojení za {reconnectCountdown}s
                  </div>
                </div>
              )}

              {/* SVG Overlays for Polygonal Zones */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1000 562">
                {/* ROAD_ZONE Polygon */}
                {showRoadZone && (
                  <g>
                    <polygon
                      points="40,160 380,165 420,540 10,540"
                      className="fill-sky-500/20 stroke-sky-400 stroke-2"
                    />
                    <text x="70" y="200" fill="#38bdf8" fontSize="13" fontWeight="bold" fontFamily="monospace">
                      ROAD_ZONE (ANPR)
                    </text>
                  </g>
                )}

                {/* GATE_ZONE Polygon */}
                {showGateZone && (
                  <g>
                    <polygon
                      points="600,210 930,210 950,540 590,540"
                      className="fill-emerald-500/20 stroke-emerald-400 stroke-2"
                    />
                    <text x="640" y="240" fill="#34d399" fontSize="13" fontWeight="bold" fontFamily="monospace">
                      GATE_ZONE (Branka)
                    </text>
                  </g>
                )}
              </svg>

              {/* Bounding Box 1: Vehicle on the road */}
              {showBBoxes && isCarVisible && !isStreamInterrupted && (
                <div
                  className="absolute border-2 border-amber-400 bg-amber-400/10 pointer-events-none transition-all duration-300"
                  style={{ top: '34%', left: '23%', width: '13%', height: '22%' }}
                >
                  <div className="absolute -top-6 left-0 bg-amber-500 text-neutral-950 font-mono text-[10px] font-bold px-1.5 py-0.5 whitespace-nowrap rounded-t">
                    Auto (94%)
                  </div>
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-neutral-900 border border-amber-400 text-amber-300 font-mono text-[11px] font-bold px-2 py-0.5 whitespace-nowrap shadow-md rounded">
                    SPZ: 1AB 8245
                  </div>
                </div>
              )}

              {/* Bounding Box 2: Person near the gate */}
              {showBBoxes && isPersonVisible && !isStreamInterrupted && (
                <div
                  className="absolute border-2 border-emerald-400 bg-emerald-400/10 pointer-events-none transition-all duration-300"
                  style={{ top: '38%', left: '67%', width: '9%', height: '36%' }}
                >
                  <div className="absolute -top-6 left-0 bg-emerald-500 text-neutral-950 font-mono text-[10px] font-bold px-1.5 py-0.5 whitespace-nowrap rounded-t">
                    Osoba u branky (91%)
                  </div>
                  <div className="absolute -bottom-5 left-0 text-[10px] text-emerald-300 font-mono bg-neutral-900/90 px-1 rounded whitespace-nowrap">
                    Crop: 25px pad
                  </div>
                </div>
              )}
            </div>

            {/* Viewport Toolbar */}
            <div className="p-3 bg-neutral-900/80 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-neutral-400 font-medium">Vrstvy:</span>
                <button
                  onClick={() => setShowRoadZone(!showRoadZone)}
                  className={`px-2 py-1 rounded border text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    showRoadZone ? 'bg-sky-500/15 border-sky-500/40 text-sky-300' : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                  }`}
                >
                  {showRoadZone ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>ROAD_ZONE</span>
                </button>

                <button
                  onClick={() => setShowGateZone(!showGateZone)}
                  className={`px-2 py-1 rounded border text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    showGateZone ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300' : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                  }`}
                >
                  {showGateZone ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  <span>GATE_ZONE</span>
                </button>

                <button
                  onClick={() => setShowBBoxes(!showBBoxes)}
                  className={`px-2 py-1 rounded border text-xs font-medium transition-colors ${
                    showBBoxes ? 'bg-amber-500/15 border-amber-500/40 text-amber-300' : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                  }`}
                >
                  Detekční boxy
                </button>

                {/* Night IR Toggle */}
                <button
                  onClick={() => {
                    const next = !isNightIrMode;
                    setIsNightIrMode(next);
                    addLog(
                      next
                        ? '[PREPROCESSOR] Aktivován noční IR režim: CLAHE na L-kanálu LAB + Gaussovské odšumění.'
                        : '[PREPROCESSOR] Noční IR režim vypnut (standardní denní barevný profil).',
                      'system'
                    );
                  }}
                  className={`px-2.5 py-1 rounded border text-xs font-medium transition-colors flex items-center gap-1.5 ${
                    isNightIrMode
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300 font-semibold'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:text-white'
                  }`}
                >
                  {isNightIrMode ? <Moon className="w-3.5 h-3.5 text-indigo-400" /> : <Sun className="w-3.5 h-3.5" />}
                  <span>Noční IR (CLAHE)</span>
                </button>
              </div>

              {/* Frame Skipping & Hardware badges */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 text-neutral-400">
                  <span>FrameSkip:</span>
                  <select
                    value={frameSkip}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setFrameSkip(val);
                      addLog(`[FRAME SKIP] Změněno přeskočení snímků: N = ${val} (úspora CPU: ~${Math.round((1 - 1 / val) * 100)}%).`, 'system');
                    }}
                    className="bg-neutral-950 border border-neutral-700 rounded px-1.5 py-0.5 text-white font-mono text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value={1}>1 (Bez skipu)</option>
                    <option value={2}>2 (12.5 FPS / 50% CPU)</option>
                    <option value={3}>3 (8.3 FPS / 65% CPU)</option>
                    <option value={5}>5 (5.0 FPS / 80% CPU)</option>
                  </select>
                </div>

                <button
                  onClick={() => {
                    const next = hardwareMode === 'cuda' ? 'cpu' : 'cuda';
                    setHardwareMode(next);
                    addLog(
                      next === 'cuda'
                        ? '[HARDWARE] Detekována CUDA GPU: NVIDIA RTX 4070 (FP16 akcelerace aktivní).'
                        : '[HARDWARE] Přepnuto na CPU Fallback (multithreaded torch běh).',
                      'system'
                    );
                  }}
                  className="px-2 py-0.5 rounded bg-neutral-950 border border-neutral-700 text-xs font-mono text-neutral-300 hover:text-white"
                  title="Kliknutím přepnete mezi GPU a CPU simulací"
                >
                  {hardwareMode === 'cuda' ? 'GPU: CUDA' : 'CPU: Fallback'}
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Simulation Trigger Bar */}
          <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-white">Interaktivní testovací konzole</div>
                <div className="text-xs text-neutral-400">Otestujte detekce, cooldown paměť, výpadek RTSP i retenci dat</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleSimulateVehicle}
                className="px-3 py-2 text-xs font-medium rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Simulovat auto s SPZ</span>
                {anprCooldown > 0 && <span className="font-mono text-[10px] ml-1 bg-sky-800 px-1.5 rounded">{anprCooldown}s</span>}
              </button>

              <button
                onClick={handleSimulatePerson}
                className="px-3 py-2 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Simulovat osobu u branky</span>
                {gateCooldown > 0 && <span className="font-mono text-[10px] ml-1 bg-emerald-800 px-1.5 rounded">{gateCooldown}s</span>}
              </button>

              <button
                onClick={handleSimulateWatchdogDrop}
                disabled={isStreamInterrupted}
                className="px-3 py-2 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-rose-300 border border-neutral-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                <span>Test výpadku RTSP (Watchdog)</span>
              </button>

              <button
                onClick={handleSimulateRetention}
                className="px-3 py-2 text-xs font-medium rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5 text-neutral-400" />
                <span>Retence dat (14d úklid)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Telemetry & Telegram Alerts */}
        <div className="lg:col-span-4 space-y-4">
          {/* Active Cooldown Status Box */}
          <div className="p-4 rounded-xl bg-neutral-900 border border-neutral-800 space-y-3">
            <div className="text-xs font-semibold text-white flex items-center justify-between">
              <span>Debounce / Cooldown paměť</span>
              <RefreshCw className="w-3.5 h-3.5 text-neutral-400" />
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-400">ANPR SPZ Cooldown:</span>
                <span className="font-mono text-sky-400">
                  {anprCooldown > 0 ? `Debounce aktivní (${anprCooldown}s)` : 'Připraveno (180s nastaveno)'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-400">Branka Osoba Cooldown:</span>
                <span className="font-mono text-emerald-400">
                  {gateCooldown > 0 ? `Debounce aktivní (${gateCooldown}s)` : 'Připraveno (120s nastaveno)'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-neutral-950 border border-neutral-800">
                <span className="text-neutral-400">FrameHub MJPEG Buffer:</span>
                <span className="font-mono text-neutral-300">Queue: maxsize=1 (Drop-oldest)</span>
              </div>
            </div>
          </div>

          {/* Real-time Event Feed */}
          <div className="rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
              <div className="text-xs font-semibold text-white">Události v reálném čase & Telegram Log</div>
              <span className="text-[11px] text-neutral-500 font-mono tabular-nums">{logs.length} zpráv</span>
            </div>

            <div className="p-3 space-y-2.5 max-h-[440px] overflow-y-auto font-mono text-xs">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className={`p-2.5 rounded-lg border leading-relaxed ${
                    log.type === 'vehicle'
                      ? 'bg-sky-950/40 border-sky-800/60 text-sky-200'
                      : log.type === 'person'
                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-neutral-400 mb-1">
                    <span className="font-bold">
                      {log.type === 'vehicle' ? 'ANPR DETEKCE' : log.type === 'person' ? 'OSOBNÍ POPLACH' : 'SYSTÉM / RETENCE'}
                    </span>
                    <span className="tabular-nums">{log.time}</span>
                  </div>
                  <div>{log.text}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
