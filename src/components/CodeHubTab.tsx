import React, { useState } from 'react';
import { Download, Copy, Check, FileCode, Folder, Terminal } from 'lucide-react';
import { PYTHON_PROJECT_FILES, PythonFileItem } from '@/src/data/pythonCodeFiles';

interface CodeHubTabProps {
  onDownloadZip: () => void;
  isDownloadingZip: boolean;
}

export const CodeHubTab: React.FC<CodeHubTabProps> = ({ onDownloadZip, isDownloadingZip }) => {
  const [selectedFile, setSelectedFile] = useState<PythonFileItem>(PYTHON_PROJECT_FILES[0]);
  const [copied, setCopied] = useState<boolean>(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedFile.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Download Button */}
      <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileCode className="w-5 h-5 text-emerald-400" />
            <span>Kompletní Python Kód Aplikace (Produkční Repozitář)</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Čistá OOP architektura, oddělení detekce a webového rozhraní, SQLite WAL, multi-threading RTSP a async Telegram.
          </p>
        </div>

        <button
          onClick={onDownloadZip}
          disabled={isDownloadingZip}
          className="px-4 py-2 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors flex items-center gap-2 shrink-0 disabled:opacity-50 shadow-sm"
        >
          <Download className="w-4 h-4" />
          <span>{isDownloadingZip ? 'Vytvářím ZIP balíček...' : 'Stáhnout kompletní projekt (.ZIP)'}</span>
        </button>
      </div>

      {/* Main Grid: File Explorer Sidebar (4 cols) + Code Viewer (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: File Explorer */}
        <div className="lg:col-span-4 rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between text-xs font-semibold text-neutral-300">
            <span className="flex items-center gap-1.5">
              <Folder className="w-4 h-4 text-emerald-400" />
              <span>Soubory projektu ({PYTHON_PROJECT_FILES.length})</span>
            </span>
          </div>

          <div className="p-2 space-y-1">
            {PYTHON_PROJECT_FILES.map((file) => {
              const isSelected = selectedFile.name === file.name;
              return (
                <button
                  key={file.name}
                  onClick={() => setSelectedFile(file)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-mono transition-colors flex flex-col gap-0.5 ${
                    isSelected
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{file.name}</span>
                    <span className="text-[10px] uppercase tracking-wider text-neutral-500">
                      {file.category}
                    </span>
                  </div>
                  <div className="text-[11px] font-sans text-neutral-400 truncate">
                    {file.description}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Code Viewer */}
        <div className="lg:col-span-8 rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-sm">
          {/* File bar */}
          <div className="px-4 py-3 bg-neutral-950 border-b border-neutral-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-mono">
              <span className="font-bold text-white">{selectedFile.name}</span>
              <span className="text-neutral-500">·</span>
              <span className="text-neutral-400 font-sans text-xs">{selectedFile.description}</span>
            </div>

            <button
              onClick={handleCopy}
              className="px-3 py-1.5 text-xs font-medium bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition-colors flex items-center gap-1.5 border border-neutral-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Zkopírováno' : 'Kopírovat'}</span>
            </button>
          </div>

          {/* Syntax text */}
          <div className="p-4 bg-neutral-950 overflow-x-auto max-h-[640px] text-xs font-mono text-neutral-300 leading-relaxed">
            <pre>
              {selectedFile.code.split('\n').map((line, idx) => (
                <div key={idx} className="table-row">
                  <span className="table-cell select-none pr-4 text-right text-neutral-600 font-mono text-[11px] tabular-nums">
                    {idx + 1}
                  </span>
                  <span className="table-cell">{line}</span>
                </div>
              ))}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
