import { FlatRecord } from '../types';
import { getFlatOverallProgress } from '../utils';
import { Layers, Grid2X2 } from 'lucide-react';

interface TowerFloorHeatmapProps {
  flats: FlatRecord[];
  selectedTower: string | null;
  selectedFloor: number | null;
  onFilterChange: (tower: string | null, floor: number | null) => void;
}

export default function TowerFloorHeatmap({ flats, selectedTower, selectedFloor, onFilterChange }: TowerFloorHeatmapProps) {
  // Extract unique towers and floors present in the data to build our responsive grid dynamic matrix
  const uniqueTowers = Array.from(new Set(flats.map(f => f.towerId))).sort();
  const uniqueFloors = Array.from(new Set(flats.map(f => f.floor))).sort((a, b) => b - a); // high floor first (descending Y axis)

  // Compute average metrics per matrix block
  const getCellStats = (towerId: string, floor: number) => {
    const matching = flats.filter(f => f.towerId === towerId && f.floor === floor);
    if (matching.length === 0) return null;

    const totalProgress = matching.reduce((sum, flat) => sum + getFlatOverallProgress(flat), 0);
    const avg = Math.round(totalProgress / matching.length);
    return {
      avg,
      count: matching.length
    };
  };

  // Color generator based on completion avg
  const getCellColorClass = (avg: number, isActive: boolean) => {
    let bg = "bg-zinc-100 hover:bg-zinc-200 border-zinc-200 text-zinc-500";
    if (avg === 100) {
      bg = isActive 
        ? "bg-emerald-600 border-emerald-700 text-white ring-2 ring-emerald-300 ring-offset-1" 
        : "bg-emerald-500/95 hover:bg-emerald-600 border-emerald-600 text-white";
    } else if (avg >= 70) {
      bg = isActive
        ? "bg-blue-600 border-blue-700 text-white ring-2 ring-blue-300 ring-offset-1"
        : "bg-blue-100 hover:bg-blue-200 border-blue-300 text-blue-900";
    } else if (avg >= 35) {
      bg = isActive
        ? "bg-amber-600 border-amber-700 text-white ring-2 ring-amber-300 ring-offset-1"
        : "bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-900";
    } else if (avg > 0) {
      bg = isActive
        ? "bg-rose-600 border-rose-700 text-white ring-2 ring-rose-300 ring-offset-1"
        : "bg-rose-100 hover:bg-rose-200 border-rose-300 text-rose-900";
    } else {
      bg = isActive
        ? "bg-zinc-600 border-zinc-700 text-white ring-2 ring-zinc-500 ring-offset-1"
        : "bg-zinc-100 hover:bg-zinc-200/80 border-zinc-300 text-zinc-700";
    }
    return bg;
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-zinc-100">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <Grid2X2 className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-zinc-900 tracking-tight">Floor & Tower Heatmap</h3>
            <p className="text-sm text-zinc-500 font-medium">Visual average of overall completion percentage per floor level.</p>
          </div>
        </div>
        
        {/* Reset active cell button */}
        {(selectedTower || selectedFloor) && (
          <button
            onClick={() => onFilterChange(null, null)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition"
          >
            Clear Grid Filter
          </button>
        )}
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="min-w-[600px] space-y-3">
          {/* Header Row (Towers) */}
          <div className="grid gap-2" style={{ gridTemplateColumns: `80px repeat(${uniqueTowers.length}, 1fr)` }}>
            {/* Corner label */}
            <div className="flex items-center justify-end pr-2 text-[10px] font-bold tracking-wider text-zinc-400 uppercase font-mono">
              LEVEL
            </div>
            
            {uniqueTowers.map(tower => (
              <button
                key={tower}
                onClick={() => onFilterChange(tower === selectedTower ? null : tower, null)}
                className={`py-2 px-1 text-center rounded-lg border text-xs font-bold transition uppercase tracking-wider ${
                  selectedTower === tower && !selectedFloor
                    ? "bg-zinc-900 text-white border-zinc-900"
                    : "bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-700"
                }`}
              >
                {tower}
              </button>
            ))}
          </div>

          {/* Matrix Rows (Floors) */}
          {uniqueFloors.map(floor => (
            <div key={floor} className="grid gap-2" style={{ gridTemplateColumns: `80px repeat(${uniqueTowers.length}, 1fr)` }}>
              {/* Floor Label */}
              <button
                onClick={() => onFilterChange(null, floor === selectedFloor ? null : floor)}
                className={`flex items-center justify-end pr-3 font-semibold text-xs border rounded-lg transition ${
                  selectedFloor === floor && !selectedTower
                    ? "bg-zinc-900 border-zinc-900 text-white font-bold"
                    : "bg-zinc-50 hover:bg-zinc-100 border-zinc-200 text-zinc-600"
                }`}
              >
                Lvl {floor}
              </button>

              {/* Grid Cells */}
              {uniqueTowers.map(tower => {
                const stats = getCellStats(tower, floor);
                const isActive = selectedTower === tower && selectedFloor === floor;
                
                if (!stats) {
                  return (
                    <div
                      key={tower + floor}
                      className="aspect-video bg-zinc-50/50 border border-dashed border-zinc-200 rounded-xl flex items-center justify-center text-[10px] font-mono text-zinc-300 font-medium select-none"
                    >
                      Empty
                    </div>
                  );
                }

                return (
                  <button
                    key={tower + floor}
                    onClick={() => onFilterChange(isActive ? null : tower, isActive ? null : floor)}
                    className={`aspect-video rounded-xl border p-2 flex flex-col justify-between transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-zinc-400 group relative ${getCellColorClass(stats.avg, isActive)}`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] font-bold font-mono tracking-tight opacity-75">
                        {stats.count} {stats.count === 1 ? 'door' : 'doors'}
                      </span>
                      <span className="text-xs font-bold leading-none font-sans">
                        {stats.avg}%
                      </span>
                    </div>

                    <div className="h-1 w-full bg-black/10 rounded-full overflow-hidden mt-2">
                      <div 
                        className="h-full bg-white/70 rounded-full transition-all duration-300" 
                        style={{ width: `${stats.avg}%` }}
                      ></div>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Grid Legend */}
      <div className="mt-6 pt-4 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 text-xs text-zinc-400 font-bold tracking-wide font-mono uppercase">
          <span>Active Filter: </span>
          <span className="text-zinc-600">
            {selectedTower || selectedFloor 
              ? `${selectedTower || ''} ${selectedFloor !== null ? `Floor Lvl ${selectedFloor}` : ''}`.trim()
              : "Entire Site Scope"}
          </span>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-zinc-600">
            <span className="w-3.5 h-3.5 rounded bg-zinc-100 border border-zinc-300"></span>
            <span>No inspection</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-zinc-600">
            <span className="w-3.5 h-3.5 rounded bg-rose-100 border border-rose-300"></span>
            <span>0-34% (Started)</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-zinc-600">
            <span className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-300"></span>
            <span>35-69% (WIP)</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-zinc-600">
            <span className="w-3.5 h-3.5 rounded bg-blue-100 border border-blue-300"></span>
            <span>70-99% (Advancing)</span>
          </div>
          <div className="flex items-center gap-1.5 font-medium text-zinc-600">
            <span className="w-3.5 h-3.5 rounded bg-emerald-500 border border-emerald-600"></span>
            <span>100% Handover Complete</span>
          </div>
        </div>
      </div>
    </div>
  );
}
