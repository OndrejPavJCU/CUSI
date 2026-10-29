import React, { useState, useRef } from 'react';
import { Copy, Check, RotateCcw, Trash2, Crosshair, Upload, Info } from 'lucide-react';
import cctvImage from '@/src/assets/images/cctv_driveway_gate_1792943436467.jpg';

interface Point {
  x: number;
  y: number;
}

export const ZoneCalibratorTab: React.FC = () => {
  const [selectedZone, setSelectedZone] = useState<'road' | 'gate'>('road');
  const [roadPoints, setRoadPoints] = useState<Point[]>([
    { x: 40, y: 160 },
    { x: 380, y: 165 },
    { x: 420, y: 540 },
    { x: 10, y: 540 },
  ]);
  const [gatePoints, setGatePoints] = useState<Point[]>([
    { x: 600, y: 210 },
    { x: 930, y: 210 },
    { x: 950, y: 540 },
    { x: 590, y: 540 },
  ]);

  const [customImage, setCustomImage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // SVG dimensions normalized to 1000 x 562
  const SVG_WIDTH = 1000;
  const SVG_HEIGHT = 562;

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = Math.round(((e.clientX - rect.left) / rect.width) * SVG_WIDTH);
    const clickY = Math.round(((e.clientY - rect.top) / rect.height) * SVG_HEIGHT);

    if (selectedZone === 'road') {
      setRoadPoints((prev) => [...prev, { x: clickX, y: clickY }]);
    } else {
      setGatePoints((prev) => [...prev, { x: clickX, y: clickY }]);
    }
  };

  const handleResetDefaults = () => {
    setRoadPoints([
      { x: 40, y: 160 },
      { x: 380, y: 165 },
      { x: 420, y: 540 },
      { x: 10, y: 540 },
    ]);
    setGatePoints([
      { x: 600, y: 210 },
      { x: 930, y: 210 },
      { x: 950, y: 540 },
      { x: 590, y: 540 },
    ]);
  };

  const handleClearCurrent = () => {
    if (selectedZone === 'road') {
      setRoadPoints([]);
    } else {
      setGatePoints([]);
    }
  };

  const handleUndoLastPoint = () => {
    if (selectedZone === 'road') {
      setRoadPoints((prev) => prev.slice(0, -1));
    } else {
      setGatePoints((prev) => prev.slice(0, -1));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setCustomImage(url);
    }
  };

  // Generate python code
  const generatePythonCode = () => {
    const roadTuples = roadPoints.map((p) => `        (${p.x}, ${p.y}),`).join('\n');
    const gateTuples = gatePoints.map((p) => `        (${p.x}, ${p.y}),`).join('\n');

    return `# =====================================================================
# ZKOPÍRUJTE TYTO SOUŘADNICE DO SOUBORU config.py:
# =====================================================================

ROAD_ZONE: list[tuple[int, int]] = [
${roadTuples || '        # Žádné body'}
]

GATE_ZONE: list[tuple[int, int]] = [
${gateTuples || '        # Žádné body'}
]`;
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatePythonCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header & Instructions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl bg-neutral-900 border border-neutral-800">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-emerald-400" />
            <span>Interaktivní Zónový Kalibrátor (Polygon Zone Calibrator)</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Klikáním na snímek označte obvodové body zón pro detekci silnice (ANPR) a branky (osoby).
            Můžete nahrát i snímek z vaší vlastní IP kamery!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Nahrát snímek z mé kamery</span>
          </button>

          <button
            onClick={handleResetDefaults}
            className="px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Výchozí zóny</span>
          </button>
        </div>
      </div>

      {/* Editor & Generated Code Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive Canvas (8 cols) */}
        <div className="lg:col-span-8 space-y-3">
          {/* Active zone switcher */}
          <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-neutral-400 font-medium mr-1">Kalibrovaná zóna:</span>
              <button
                onClick={() => setSelectedZone('road')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                  selectedZone === 'road'
                    ? 'bg-sky-500 text-neutral-950 shadow-sm'
                    : 'bg-neutral-800 text-neutral-300 hover:text-white'
                }`}
              >
                <span>ROAD_ZONE (Silnice / ANPR)</span>
                <span className="text-[11px] opacity-80">({roadPoints.length} bodů)</span>
              </button>

              <button
                onClick={() => setSelectedZone('gate')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                  selectedZone === 'gate'
                    ? 'bg-emerald-400 text-neutral-950 shadow-sm'
                    : 'bg-neutral-800 text-neutral-300 hover:text-white'
                }`}
              >
                <span>GATE_ZONE (Branka / Osoby)</span>
                <span className="text-[11px] opacity-80">({gatePoints.length} bodů)</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleUndoLastPoint}
                className="px-2.5 py-1 text-xs text-neutral-400 hover:text-white bg-neutral-800 rounded transition-colors"
                title="Vrátit poslední bod"
              >
                Zpět
              </button>
              <button
                onClick={handleClearCurrent}
                className="px-2.5 py-1 text-xs text-red-400 hover:text-red-300 bg-neutral-800 rounded transition-colors flex items-center gap-1"
                title="Vymazat aktivní zónu"
              >
                <Trash2 className="w-3 h-3" />
                <span>Vymazat</span>
              </button>
            </div>
          </div>

          {/* Interactive Clickable Area */}
          <div className="relative rounded-xl border border-neutral-800 bg-black overflow-hidden shadow-xl aspect-video select-none">
            <img
              src={customImage || cctvImage}
              alt="CCTV Calibration Background"
              className="w-full h-full object-cover pointer-events-none"
              referrerPolicy="no-referrer"
            />

            <svg
              className="absolute inset-0 w-full h-full cursor-crosshair"
              viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
              onClick={handleSvgClick}
            >
              {/* ROAD_ZONE polygon */}
              {roadPoints.length > 1 && (
                <polygon
                  points={roadPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                  className="fill-sky-500/25 stroke-sky-400 stroke-2"
                />
              )}
              {roadPoints.map((p, idx) => (
                <g key={`road-${idx}`}>
                  <circle cx={p.x} cy={p.y} r="5" className="fill-sky-400 stroke-white stroke-1" />
                  <text x={p.x + 8} y={p.y - 8} fill="#38bdf8" fontSize="12" fontWeight="bold" fontFamily="monospace">
                    R{idx + 1}
                  </text>
                </g>
              ))}

              {/* GATE_ZONE polygon */}
              {gatePoints.length > 1 && (
                <polygon
                  points={gatePoints.map((p) => `${p.x},${p.y}`).join(' ')}
                  className="fill-emerald-500/25 stroke-emerald-400 stroke-2"
                />
              )}
              {gatePoints.map((p, idx) => (
                <g key={`gate-${idx}`}>
                  <circle cx={p.x} cy={p.y} r="5" className="fill-emerald-400 stroke-white stroke-1" />
                  <text x={p.x + 8} y={p.y - 8} fill="#34d399" fontSize="12" fontWeight="bold" fontFamily="monospace">
                    G{idx + 1}
                  </text>
                </g>
              ))}
            </svg>

            {/* Click instruction banner overlay */}
            <div className="absolute bottom-2 left-2 right-2 bg-neutral-950/80 backdrop-blur px-3 py-1.5 rounded-lg border border-neutral-800 text-[11px] text-neutral-300 flex items-center justify-between">
              <span>Klikněte do obrazu pro přidání bodu k: <strong className="text-white uppercase">{selectedZone === 'road' ? 'ROAD_ZONE' : 'GATE_ZONE'}</strong></span>
              <span className="text-neutral-500 font-mono">Souřadnicový systém: [0,0] vlevo nahoře</span>
            </div>
          </div>
        </div>

        {/* Right: Code Generator Output & Guide (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-xl bg-neutral-900 border border-neutral-800 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-white">Vygenerovaný Python Kód</span>
              <button
                onClick={handleCopyCode}
                className="px-3 py-1 text-xs font-medium bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-md transition-colors flex items-center gap-1.5"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Zkopírováno!' : 'Kopírovat'}</span>
              </button>
            </div>

            <pre className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-[11px] font-mono text-neutral-300 overflow-x-auto leading-relaxed max-h-[300px]">
              {generatePythonCode()}
            </pre>
          </div>

          {/* Quick tips card */}
          <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 text-xs text-neutral-400 space-y-2">
            <div className="font-semibold text-white flex items-center gap-1.5">
              <Info className="w-4 h-4 text-sky-400" />
              <span>Jak nastavit zóny v reálné kameře:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1.5 text-neutral-300 leading-relaxed text-[11px]">
              <li>Spusťte přiložený skript <code className="text-white font-mono bg-neutral-800 px-1 py-0.5 rounded">python calibrate_zones.py</code>, který se připojí přímo k vaší RTSP adrese.</li>
              <li>Nebo uložte jeden snímek z kamery a nahrajte jej sem tlačítkem nahoře.</li>
              <li>Označte 4 až 8 bodů po obvodu prostoru silnice a vchodu.</li>
              <li>Klikněte na <strong>Kopírovat</strong> a vložte pole do souboru <code className="text-white font-mono bg-neutral-800 px-1 py-0.5 rounded">config.py</code>.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
