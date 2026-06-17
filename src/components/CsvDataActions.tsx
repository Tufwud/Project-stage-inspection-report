import React, { useRef, useState } from 'react';
import { FlatRecord } from '../types';
import { convertToCSV, parseCSVToFlats } from '../utils';
import { Download, Upload, RotateCcw, HelpCircle, CheckCircle2, ChevronRight, Trash2 } from 'lucide-react';

interface CsvDataActionsProps {
  onDataImport: (imported: FlatRecord[]) => void;
  onResetData: () => void;
  onWipeData?: () => void;
  flats: FlatRecord[];
}

export default function CsvDataActions({ onDataImport, onResetData, onWipeData, flats }: CsvDataActionsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Custom non-blocking modal confirmation states
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [confirmingWipe, setConfirmingWipe] = useState(false);

  const handleExport = () => {
    try {
      const csvContent = convertToCSV(flats);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `door_installation_tracker_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      triggerToast("Checklist CSV compiled & exported successfully!");
    } catch (e) {
      setErrorMsg("Failed to compile CSV file. Check data records.");
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseCSVToFlats(text);
        if (parsed.length === 0) {
          setErrorMsg("Could not parse any valid door checkpoint rows. Verify column headers.");
          return;
        }
        onDataImport(parsed);
        triggerToast(`Successfully parsed and loaded ${parsed.length} openings records!`);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err) {
        setErrorMsg("Parsing failure. Confirm the file matches the standard spreadsheet schema.");
      }
    };
    reader.readAsText(file);
  };

  const triggerToast = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => {
      setSuccessMsg(null);
    }, 4500);
  };

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-bold text-lg text-zinc-900 tracking-tight">Data Sync & Integrations</h3>
          <p className="text-sm text-zinc-500 font-medium">Export current status as standard quality spreadsheet or migrate existing checklist records.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Export */}
          <button
            onClick={handleExport}
            className="px-4 py-2 border border-zinc-200 text-zinc-700 bg-white hover:bg-zinc-50 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-sm"
          >
            <Download className="w-4.5 h-4.5" />
            Export Spreadsheet (.CSV)
          </button>

          {/* Import file setup */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 border border-zinc-200 text-zinc-700 bg-white hover:bg-zinc-50 font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-sm"
          >
            <Upload className="w-4.5 h-4.5" />
            Import (.CSV)
          </button>

          {/* Reset button */}
          <button
            onClick={() => setConfirmingReset(true)}
            className="px-4 py-2 text-zinc-600 hover:text-zinc-705 hover:bg-zinc-50 border border-transparent rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
          >
            <RotateCcw className="w-4.5 h-4.5" />
            Reset presets
          </button>

          {/* Wipe Clean button */}
          {onWipeData && (
            <button
              onClick={() => setConfirmingWipe(true)}
              className="px-4 py-2 text-rose-650 hover:text-white hover:bg-rose-500 border border-rose-200 hover:border-transparent rounded-xl text-xs font-black transition flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              <Trash2 className="w-4.5 h-4.5" />
              Wipe Clean
            </button>
          )}
        </div>
      </div>

      {/* Pop Notifications */}
      {successMsg && (
        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckSquare className="w-4.5 h-4.5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2">
          <span>⚠️ {errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-auto font-black cursor-pointer hover:underline text-[10px] uppercase">
            dismiss
          </button>
        </div>
      )}

      {/* Structural schema guidelines help card */}
      <div className="mt-6 bg-zinc-50/50 border border-zinc-100 rounded-xl p-4 flex gap-3.5 items-start">
        <HelpCircle className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
        <div className="space-y-1 text-xs text-zinc-500 font-medium">
          <p className="font-bold text-zinc-700">File Structure Protocol</p>
          <p className="leading-relaxed">
            Imported spreadsheets must match the precise columnar pattern starting with:
            <code className="block bg-zinc-100 p-2 rounded text-[11px] font-mono whitespace-nowrap overflow-x-auto text-zinc-600 mt-1">
              ID,OA No,Tower ID,Flats/Floor,Floor,Flat No,Door Name,Frame Fixing - Fastener fixing,...
            </code>
            Toggles should be formatted as simple <code className="bg-zinc-100 px-1 rounded font-mono text-[11px]">Y</code> or <code className="bg-zinc-100 px-1 rounded font-mono text-[11px]">N</code> notations.
          </p>
        </div>
      </div>

      {/* Custom Modal Confirmation for presets reset */}
      {confirmingReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-[2px] animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-zinc-200 space-y-4">
            <div className="flex items-center gap-3 text-indigo-600">
              <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-100">
                <RotateCcw className="w-5 h-5 text-indigo-600" />
              </div>
              <h3 className="font-extrabold text-zinc-900 text-base leading-tight font-sans">Reset presets?</h3>
            </div>
            
            <p className="text-xs text-zinc-500 leading-relaxed">
              Are you sure you want to reset current records back to mock dashboard presets? This will wipe all local modifications.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  onResetData();
                  triggerToast("Dataset reset to simulation factory presets successfully.");
                  setConfirmingReset(false);
                }}
                className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs rounded-xl transition duration-150 shadow-sm cursor-pointer"
              >
                Yes, Reset Data
              </button>
              <button
                type="button"
                onClick={() => setConfirmingReset(false)}
                className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 font-bold text-xs rounded-xl border border-zinc-200 transition duration-150 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Modal Confirmation for main DB Wipe */}
      {confirmingWipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-[2px] animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-zinc-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-650">
              <div className="p-2 bg-rose-50 rounded-xl border border-rose-100">
                <Trash2 className="w-5 h-5 text-rose-650" />
              </div>
              <h3 className="font-extrabold text-zinc-900 text-base leading-tight font-sans">Wipe Database?</h3>
            </div>
            
            <p className="text-xs text-zinc-500 leading-relaxed">
              Are you sure you want to WIPE the current database? This permanently deletes all door records, and cannot be undone.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (onWipeData) {
                    onWipeData();
                  }
                  triggerToast("Database wiped clean successfully. Ready for custom tower input.");
                  setConfirmingWipe(false);
                }}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs rounded-xl transition duration-150 shadow-sm cursor-pointer"
              >
                Yes, Wipe Clean
              </button>
              <button
                type="button"
                onClick={() => setConfirmingWipe(false)}
                className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 font-bold text-xs rounded-xl border border-zinc-200 transition duration-150 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Simple fallback icon import safety
function CheckSquare({ className }: { className?: string }) {
  return <CheckCircle2 className={className} />;
}
