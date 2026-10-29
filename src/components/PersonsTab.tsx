import React, { useState } from 'react';
import { Trash2, Maximize2, X, Download, ShieldAlert } from 'lucide-react';
import { PersonRecord } from '@/src/data/sampleData';

interface PersonsTabProps {
  persons: PersonRecord[];
  onDeletePerson: (id: number) => void;
}

export const PersonsTab: React.FC<PersonsTabProps> = ({ persons, onDeletePerson }) => {
  const [selectedPerson, setSelectedPerson] = useState<PersonRecord | null>(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-xl bg-neutral-900 border border-neutral-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-400" />
            <span>Galerie zachycených osob u branky (GATE_ZONE)</span>
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Automatické vyříznutí postavy s dynamickým okrajem (padding 25 px) a uložením JPEG ve vysoké kvalitě (95%)
          </p>
        </div>

        <div className="text-xs text-neutral-400 font-mono">
          Celkem zachyceno: <strong className="text-emerald-400 tabular-nums">{persons.length}</strong>
        </div>
      </div>

      {/* Grid of captures */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {persons.map((person) => (
          <div
            key={person.id}
            className="group rounded-xl border border-neutral-800 bg-neutral-900 overflow-hidden flex flex-col shadow-sm hover:border-neutral-700 transition-colors"
          >
            {/* Image Preview with Hover Overlay */}
            <div
              className="relative aspect-[3/4] bg-neutral-950 overflow-hidden cursor-pointer"
              onClick={() => setSelectedPerson(person)}
            >
              <img
                src={person.image_url}
                alt="Zachycená osoba u branky"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                referrerPolicy="no-referrer"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />

              {/* Watermark badge on photo */}
              <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-[11px] text-white">
                <span className="font-mono bg-black/60 px-2 py-0.5 rounded border border-white/10">
                  {person.confidence ? `${(person.confidence * 100).toFixed(0)}% shoda` : 'Osoba'}
                </span>
                <span className="font-mono text-emerald-400 text-[10px]">GATE_ZONE</span>
              </div>

              {/* Click to inspect button icon */}
              <div className="absolute top-2.5 right-2.5 p-1.5 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                <Maximize2 className="w-3.5 h-3.5" />
              </div>
            </div>

            {/* Metadata Footer */}
            <div className="p-3 text-xs flex flex-col justify-between flex-1 gap-2">
              <div>
                <div className="font-mono font-medium text-white truncate text-[11px]" title={person.filename}>
                  {person.filename}
                </div>
                <div className="text-[11px] text-neutral-400 font-mono tabular-nums mt-0.5">
                  {person.timestamp}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80">
                <button
                  onClick={() => setSelectedPerson(person)}
                  className="text-neutral-400 hover:text-white text-[11px] font-medium"
                >
                  Zvětšit detail
                </button>

                <button
                  onClick={() => onDeletePerson(person.id)}
                  className="text-neutral-500 hover:text-red-400 p-1 transition-colors"
                  title="Smazat snímek"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {persons.length === 0 && (
          <div className="col-span-full py-16 text-center text-neutral-500 text-xs">
            V zóně branky zatím nebyla detekována žádná osoba.
          </div>
        )}
      </div>

      {/* Modal for inspection */}
      {selectedPerson && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedPerson(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-neutral-900 border border-neutral-700 rounded-xl overflow-hidden p-4 space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono font-semibold text-white text-sm">{selectedPerson.filename}</div>
                <div className="text-xs text-neutral-400 font-mono tabular-nums">{selectedPerson.timestamp} · GATE_ZONE</div>
              </div>
              <button
                onClick={() => setSelectedPerson(null)}
                className="p-1.5 rounded-full bg-neutral-800 text-neutral-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-lg overflow-hidden bg-black max-h-[65vh] flex items-center justify-center">
              <img
                src={selectedPerson.image_url}
                alt="Plný detail osoby"
                className="max-h-[60vh] w-auto object-contain"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex items-center justify-between pt-2 text-xs text-neutral-400">
              <span>Dynamický okraj: 25 px padding · JPEG komprese 95%</span>
              <button
                onClick={() => {
                  onDeletePerson(selectedPerson.id);
                  setSelectedPerson(null);
                }}
                className="text-red-400 hover:text-red-300 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Smazat záznam z disku</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
