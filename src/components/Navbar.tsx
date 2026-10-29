import React from 'react';
import { Download, ShieldCheck, Video, Crosshair, Car, Users, Code, BookOpen } from 'lucide-react';

export type TabType = 'simulator' | 'calibrator' | 'vehicles' | 'persons' | 'code' | 'guide';

interface NavbarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  onDownloadZip: () => void;
  isDownloadingZip: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  onDownloadZip,
  isDownloadingZip,
}) => {
  return (
    <header className="border-b border-neutral-800 bg-neutral-950/90 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand title, one line */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
            VisionGuard AI
          </span>
          <span className="text-xs text-neutral-400 font-mono hidden xl:inline">
            · RTSP & ANPR Hub
          </span>
        </div>

        {/* Zone 2: Navigation Links (single line text links) */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-neutral-400">
          <button
            onClick={() => onTabChange('simulator')}
            className={`whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'simulator' ? 'text-white font-semibold' : 'hover:text-neutral-200'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Živý Dohled & Simulace</span>
          </button>

          <button
            onClick={() => onTabChange('calibrator')}
            className={`whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'calibrator' ? 'text-white font-semibold' : 'hover:text-neutral-200'
            }`}
          >
            <Crosshair className="w-4 h-4" />
            <span>Zónový Kalibrátor</span>
          </button>

          <button
            onClick={() => onTabChange('vehicles')}
            className={`whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'vehicles' ? 'text-white font-semibold' : 'hover:text-neutral-200'
            }`}
          >
            <Car className="w-4 h-4" />
            <span>Deník SPZ</span>
          </button>

          <button
            onClick={() => onTabChange('persons')}
            className={`whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'persons' ? 'text-white font-semibold' : 'hover:text-neutral-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Galerie Branka</span>
          </button>

          <button
            onClick={() => onTabChange('code')}
            className={`whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'code' ? 'text-white font-semibold' : 'hover:text-neutral-200'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Python Kód</span>
          </button>

          <button
            onClick={() => onTabChange('guide')}
            className={`whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'guide' ? 'text-white font-semibold' : 'hover:text-neutral-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Návod k Instalaci</span>
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onDownloadZip}
            disabled={isDownloadingZip}
            className="px-4 py-2 text-xs font-semibold text-neutral-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 disabled:opacity-50 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isDownloadingZip ? 'Balím ZIP...' : 'Stáhnout Python (.ZIP)'}</span>
          </button>
        </div>
      </div>

      {/* Mobile nav drawer / subheader */}
      <div className="lg:hidden flex items-center gap-1 px-4 py-2 border-t border-neutral-800/80 overflow-x-auto text-xs">
        <button
          onClick={() => onTabChange('simulator')}
          className={`px-2.5 py-1.5 rounded-md whitespace-nowrap ${
            activeTab === 'simulator' ? 'bg-neutral-800 text-white' : 'text-neutral-400'
          }`}
        >
          Dohled
        </button>
        <button
          onClick={() => onTabChange('calibrator')}
          className={`px-2.5 py-1.5 rounded-md whitespace-nowrap ${
            activeTab === 'calibrator' ? 'bg-neutral-800 text-white' : 'text-neutral-400'
          }`}
        >
          Kalibrátor
        </button>
        <button
          onClick={() => onTabChange('vehicles')}
          className={`px-2.5 py-1.5 rounded-md whitespace-nowrap ${
            activeTab === 'vehicles' ? 'bg-neutral-800 text-white' : 'text-neutral-400'
          }`}
        >
          Deník SPZ
        </button>
        <button
          onClick={() => onTabChange('persons')}
          className={`px-2.5 py-1.5 rounded-md whitespace-nowrap ${
            activeTab === 'persons' ? 'bg-neutral-800 text-white' : 'text-neutral-400'
          }`}
        >
          Galerie
        </button>
        <button
          onClick={() => onTabChange('code')}
          className={`px-2.5 py-1.5 rounded-md whitespace-nowrap ${
            activeTab === 'code' ? 'bg-neutral-800 text-white' : 'text-neutral-400'
          }`}
        >
          Kód
        </button>
        <button
          onClick={() => onTabChange('guide')}
          className={`px-2.5 py-1.5 rounded-md whitespace-nowrap ${
            activeTab === 'guide' ? 'bg-neutral-800 text-white' : 'text-neutral-400'
          }`}
        >
          Návod
        </button>
      </div>
    </header>
  );
};
