import React, { useState } from 'react';
import JSZip from 'jszip';
import { Navbar, TabType } from '@/src/components/Navbar';
import { LiveSimulatorTab } from '@/src/components/LiveSimulatorTab';
import { ZoneCalibratorTab } from '@/src/components/ZoneCalibratorTab';
import { VehiclesTab } from '@/src/components/VehiclesTab';
import { PersonsTab } from '@/src/components/PersonsTab';
import { CodeHubTab } from '@/src/components/CodeHubTab';
import { GuideTab } from '@/src/components/GuideTab';
import { INITIAL_VEHICLES, INITIAL_PERSONS, VehicleRecord, PersonRecord } from '@/src/data/sampleData';
import { PYTHON_PROJECT_FILES } from '@/src/data/pythonCodeFiles';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('simulator');
  const [vehicles, setVehicles] = useState<VehicleRecord[]>(INITIAL_VEHICLES);
  const [persons, setPersons] = useState<PersonRecord[]>(INITIAL_PERSONS);
  const [isDownloadingZip, setIsDownloadingZip] = useState<boolean>(false);

  const handleAddVehicle = (newVehicle: VehicleRecord) => {
    setVehicles((prev) => [newVehicle, ...prev]);
  };

  const handleAddPerson = (newPerson: PersonRecord) => {
    setPersons((prev) => [newPerson, ...prev]);
  };

  const handleDeleteVehicle = (id: number) => {
    setVehicles((prev) => prev.filter((v) => v.id !== id));
  };

  const handleDeletePerson = (id: number) => {
    setPersons((prev) => prev.filter((p) => p.id !== id));
  };

  // Generate and download ready-to-run ZIP archive with all Python files
  const handleDownloadZip = async () => {
    setIsDownloadingZip(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder('visionguard-camera-ai');

      // Add all project Python scripts and configs
      PYTHON_PROJECT_FILES.forEach((f) => {
        folder?.file(f.name, f.code);
      });

      // Add HTML template for FastAPI
      const templatesFolder = folder?.folder('templates');
      templatesFolder?.file(
        'index.html',
        `<!DOCTYPE html>
<html lang="cs" class="h-full bg-slate-950 text-slate-100">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VisionGuard AI Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="min-h-full bg-slate-950 text-slate-200">
  <header class="border-b border-slate-800 bg-slate-900 px-6 py-4 flex justify-between items-center">
    <div class="text-lg font-bold text-white">VisionGuard AI</div>
    <div class="text-xs text-emerald-400">Systém aktivní</div>
  </header>
  <main class="max-w-7xl mx-auto px-6 py-8 space-y-6">
    <h1 class="text-xl font-bold">Přehled Detekcí</h1>
    <p class="text-sm text-slate-400">Otevřete dashboard v prohlížeči po spuštění python dashboard.py</p>
  </main>
</body>
</html>`
      );

      // Create data folders
      folder?.folder('data/captures/persons');
      folder?.folder('data/captures/vehicles');

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'visionguard-camera-ai.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Chyba při vytváření ZIP archivu:', error);
    } finally {
      setIsDownloadingZip(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-neutral-200 font-sans antialiased selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Top Bar Contract Navigation */}
      <Navbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onDownloadZip={handleDownloadZip}
        isDownloadingZip={isDownloadingZip}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'simulator' && (
          <LiveSimulatorTab
            vehicles={vehicles}
            persons={persons}
            onAddVehicle={handleAddVehicle}
            onAddPerson={handleAddPerson}
          />
        )}

        {activeTab === 'calibrator' && <ZoneCalibratorTab />}

        {activeTab === 'vehicles' && (
          <VehiclesTab vehicles={vehicles} onDeleteVehicle={handleDeleteVehicle} />
        )}

        {activeTab === 'persons' && (
          <PersonsTab persons={persons} onDeletePerson={handleDeletePerson} />
        )}

        {activeTab === 'code' && (
          <CodeHubTab
            onDownloadZip={handleDownloadZip}
            isDownloadingZip={isDownloadingZip}
          />
        )}

        {activeTab === 'guide' && <GuideTab />}
      </main>

      {/* Clean quiet footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-6 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            VisionGuard AI · OpenCV, YOLOv8, EasyOCR & FastAPI Kamerový Monitorovací Systém
          </div>
          <div className="flex items-center gap-4 text-neutral-400">
            <span>SQLite WAL</span>
            <span>·</span>
            <span>RTSP Watchdog</span>
            <span>·</span>
            <span>Telegram Bot API</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
