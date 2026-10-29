import React, { useState, useMemo } from 'react';
import { Search, Trash2, Maximize2, X, Filter } from 'lucide-react';
import { VehicleRecord } from '@/src/data/sampleData';
import cctvImage from '@/src/assets/images/cctv_driveway_gate_1792943436467.jpg';

interface VehiclesTabProps {
  vehicles: VehicleRecord[];
  onDeleteVehicle: (id: number) => void;
}

export const VehiclesTab: React.FC<VehiclesTabProps> = ({ vehicles, onDeleteVehicle }) => {
  const [searchPlate, setSearchPlate] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const matchPlate = !searchPlate || v.plate_text.toLowerCase().includes(searchPlate.toLowerCase().replace(/\s+/g, ''));
      const matchType = selectedType === 'all' || v.vehicle_type === selectedType;
      const matchDate = !selectedDate || v.timestamp.startsWith(selectedDate);
      return matchPlate && matchType && matchDate;
    });
  }, [vehicles, searchPlate, selectedType, selectedDate]);

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Deník průjezdů vozidel & Rozpoznané SPZ (ANPR)</h2>
            <p className="text-xs text-neutral-400 mt-0.5">
              Záznamy zóny ROAD_ZONE s automatickou OCR extrakcí a deduplikací (cooldown 180s)
            </p>
          </div>

          <div className="text-xs text-neutral-400 font-mono">
            Zobrazeno: <strong className="text-white tabular-nums">{filteredVehicles.length}</strong> z {vehicles.length}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-2 border-t border-neutral-800">
          {/* Search by plate */}
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Vyhledat SPZ (např. 1AB, 7AK, 2BA...)"
              value={searchPlate}
              onChange={(e) => setSearchPlate(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Type filter */}
          <div className="sm:col-span-4">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Všechny typy vozidel</option>
              <option value="car">Osobní automobily</option>
              <option value="van">Dodávky & MPV</option>
              <option value="truck">Nákladní vozy</option>
              <option value="motorcycle">Motocykly</option>
            </select>
          </div>

          {/* Date filter */}
          <div className="sm:col-span-3">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Table view */}
      <div className="rounded-xl bg-neutral-900 border border-neutral-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-950/80 text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
              <tr>
                <th className="px-5 py-3 font-medium">Čas detekce</th>
                <th className="px-5 py-3 font-medium">Registrační značka (SPZ)</th>
                <th className="px-5 py-3 font-medium">Typ vozidla</th>
                <th className="px-5 py-3 font-medium">Jistota OCR</th>
                <th className="px-5 py-3 font-medium">Odhad rychlosti</th>
                <th className="px-5 py-3 font-medium">Náhled</th>
                <th className="px-5 py-3 font-medium text-right">Akce</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/70">
              {filteredVehicles.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-800/40 transition-colors">
                  <td className="px-5 py-3.5 text-neutral-300 font-mono tabular-nums whitespace-nowrap">
                    {item.timestamp}
                  </td>

                  {/* Realistická česká/evropská SPZ tabulka */}
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <div className="inline-flex items-center h-8 bg-white border border-neutral-400 rounded shadow-sm overflow-hidden select-none">
                      {/* Modrý EU pruh */}
                      <div className="w-5 h-full bg-[#003399] flex flex-col items-center justify-between py-1 text-[8px] font-bold text-white shrink-0">
                        <span className="text-[7px] leading-none text-yellow-300">★★★</span>
                        <span className="leading-none tracking-tighter">CZ</span>
                      </div>
                      {/* Text SPZ */}
                      <span className="px-2.5 font-mono font-black text-sm tracking-widest text-neutral-950">
                        {item.plate_text}
                      </span>
                    </div>
                  </td>

                  <td className="px-5 py-3.5 text-neutral-300 capitalize">
                    {item.vehicle_type === 'car' ? 'Osobní auto' : item.vehicle_type === 'van' ? 'Dodávka' : item.vehicle_type === 'truck' ? 'Nákladní auto' : 'Motocykl'}
                  </td>

                  <td className="px-5 py-3.5 font-mono tabular-nums text-neutral-200">
                    {(item.confidence * 100).toFixed(1)} %
                  </td>

                  <td className="px-5 py-3.5 font-mono tabular-nums text-neutral-400">
                    {item.speed_estimate || '28 km/h'}
                  </td>

                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => setSelectedImage(cctvImage)}
                      className="group relative w-14 h-9 rounded bg-neutral-800 border border-neutral-700 overflow-hidden flex items-center justify-center hover:border-neutral-500 transition-colors"
                    >
                      <img
                        src={cctvImage}
                        alt="Crop"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Maximize2 className="w-3.5 h-3.5 text-white" />
                      </div>
                    </button>
                  </td>

                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => onDeleteVehicle(item.id)}
                      className="text-neutral-400 hover:text-red-400 transition-colors p-1"
                      title="Smazat záznam"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredVehicles.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-neutral-500">
                    Nebyly nalezeny žádné záznamy odpovídající zadaným kritériím.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail zoom modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] bg-neutral-900 rounded-xl overflow-hidden border border-neutral-700 p-2">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-neutral-950/80 text-white hover:bg-neutral-800"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedImage}
              alt="Detail vozidla"
              className="max-h-[80vh] w-auto object-contain rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};
