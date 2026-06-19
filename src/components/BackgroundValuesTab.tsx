import React, { useState, useEffect } from 'react';
import { FlatRecord, SavedProject } from '../types';
import { SUPERVISORS, DOOR_TYPES, DOOR_MAP } from '../data/mockData';
import { getProjectAnalysis } from '../utils';
import { 
  Settings, 
  Plus, 
  LayoutGrid, 
  CheckCircle2, 
  Sliders, 
  AlertCircle, 
  Trash2, 
  ShieldCheck, 
  Hammer, 
  HelpCircle, 
  FileCheck, 
  Lock, 
  Coins, 
  Info,
  Layers,
  Sparkles,
  History,
  FolderOpen
} from 'lucide-react';
import { motion } from 'motion/react';

interface BackgroundValuesTabProps {
  flats: FlatRecord[];
  onGenerateProject: (config: {
    salesOrderNo: string;
    soDetails?: string;
    numTowers: number;
    totalFloors: number;
    flatsPerFloor: number;
    doorTypesToGenerate: string[];
    doorPrices: { [code: string]: number };
  }) => void;
  doorPrices: { [code: string]: number };
  onUpdateDoorPrices: (newPrices: { [code: string]: number }) => void;
  onClearTower: (towerId: string) => void;
  onWipeAll?: () => void;
  savedProjects: SavedProject[];
  onLoadProject: (soNo: string) => void;
  onDeleteProject: (soNo: string) => void;
}

export default function BackgroundValuesTab({ 
  flats, 
  onGenerateProject, 
  doorPrices,
  onUpdateDoorPrices,
  onClearTower, 
  onWipeAll,
  savedProjects = [],
  onLoadProject,
  onDeleteProject
}: BackgroundValuesTabProps) {
  
  // State for One-Time Project Creation
  const [purchaseOrderNo, setPurchaseOrderNo] = useState('');
  const [soDetails, setSoDetails] = useState('');
  const [numTowers, setNumTowers] = useState('2');
  const [totalFloors, setTotalFloors] = useState('5');
  const [flatsPerFloor, setFlatsPerFloor] = useState('4');

  // Specs & Master opening codes custom state
  const [customDoorCodes, setCustomDoorCodes] = useState('A, B, C, D');
  const [useCustomCodes, setUseCustomCodes] = useState(true);

  // Manual doors selected fallback 
  const [selectedDoors, setSelectedDoors] = useState<string[]>([
    "Main Door (MD)",
    "Bedroom 1 (BR1)",
    "Toilet 1 (T1)"
  ]);

  // Pricing structure local edit values
  const [editingPrices, setEditingPrices] = useState<{ [code: string]: string }>(() => {
    const pricesObj: { [code: string]: string } = {};
    Object.entries(doorPrices).forEach(([k, v]) => {
      pricesObj[k] = String(v);
    });
    return pricesObj;
  });

  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [priceSuccessBanner, setPriceSuccessBanner] = useState<string | null>(null);

  // Confirmation modally triggered states
  const [towerToWipe, setTowerToWipe] = useState<string | null>(null);
  const [confirmWipeAll, setConfirmWipeAll] = useState(false);

  // Derived current metrics to inspect
  const isProjectInitialized = flats.length > 0;

  // Sync edits state with props when props update
  useEffect(() => {
    const pricesObj: { [code: string]: string } = {};
    Object.entries(doorPrices).forEach(([k, v]) => {
      pricesObj[k] = String(v);
    });
    setEditingPrices(pricesObj);
  }, [doorPrices]);

  // Group current loaded data to show "Active Tower Map Breakdown"
  const getTowerBreakdown = () => {
    const breakdown: { [tower: string]: { flatsCount: number; floors: number[]; oaCodes: string[] } } = {};
    flats.forEach(f => {
      if (!breakdown[f.towerId]) {
        breakdown[f.towerId] = { flatsCount: 0, floors: [], oaCodes: [] };
      }
      breakdown[f.towerId].flatsCount += 1;
      if (!breakdown[f.towerId].floors.includes(f.floor)) {
        breakdown[f.towerId].floors.push(f.floor);
      }
      if (!breakdown[f.towerId].oaCodes.includes(f.oaNo)) {
        breakdown[f.towerId].oaCodes.push(f.oaNo);
      }
    });
    return breakdown;
  };

  const towerBreakdown = getTowerBreakdown();

  const handleToggleDoorSelection = (door: string) => {
    if (selectedDoors.includes(door)) {
      if (selectedDoors.length > 1) {
        setSelectedDoors(selectedDoors.filter(d => d !== door));
      }
    } else {
      setSelectedDoors([...selectedDoors, door]);
    }
  };

  // Live total calculation logic helper
  const getParsedDoorsList = () => {
    return useCustomCodes 
      ? customDoorCodes.split(',').map(item => item.trim().toUpperCase()).filter(Boolean)
      : selectedDoors;
  };

  const parsedDoors = getParsedDoorsList();
  const calculatedTotalOpenings = 
    (parseInt(numTowers) || 0) * 
    (parseInt(totalFloors) || 0) * 
    (parseInt(flatsPerFloor) || 0) * 
    parsedDoors.length;

  const handleUpdateMasterPrices = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedPrices: { [code: string]: number } = {};
    Object.entries(editingPrices).forEach(([k, v]) => {
      updatedPrices[k] = Math.max(0, parseFloat(v as string) || 0);
    });
    onUpdateDoorPrices(updatedPrices);
    setPriceSuccessBanner("Project master rates successfully overwritten & updated!");
    setTimeout(() => {
      setPriceSuccessBanner(null);
    }, 4000);
  };

  const handlePriceFieldChange = (code: string, val: string) => {
    setEditingPrices(prev => ({
      ...prev,
      [code]: val.replace(/\D/g, '')
    }));
  };

  const handleInitializeProject = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validate if it matches either raw 6 digits OR "SO-" followed by 6 digits (case-insensitive)
    const cleanedSONo = purchaseOrderNo.trim().toUpperCase();
    const isValidSO = /^(SO-)?\d{6}$/i.test(cleanedSONo);
    if (!isValidSO) {
      setFormError("Sales Order No must be exactly 6 digits (optionally with prefix 'SO-', e.g. SO-387026)*");
      return;
    }

    // Extract raw digits & format back to "SO-XXXXXX"
    const digitsOnly = cleanedSONo.replace('SO-', '');
    const formattedSO = `SO-${digitsOnly}`;

    const tNum = parseInt(numTowers);
    if (isNaN(tNum) || tNum <= 0 || tNum > 10) {
      setFormError("Number of towers must be set between 1 and 10*");
      return;
    }

    const floorsNum = parseInt(totalFloors);
    if (isNaN(floorsNum) || floorsNum <= 0 || floorsNum > 30) {
      setFormError("Total Floors must be set between 1 and 30*");
      return;
    }

    const flatsPerFloorNum = parseInt(flatsPerFloor);
    if (isNaN(flatsPerFloorNum) || flatsPerFloorNum <= 0 || flatsPerFloorNum > 12) {
      setFormError("Flats per Floor must be set between 1 and 12*");
      return;
    }

    if (parsedDoors.length === 0) {
      setFormError("Must check or specify at least one opening code specification*");
      return;
    }

    // Initialize the whole multi-tower map using multiplier
    onGenerateProject({
      salesOrderNo: formattedSO,
      soDetails: soDetails.trim(),
      numTowers: tNum,
      totalFloors: floorsNum,
      flatsPerFloor: flatsPerFloorNum,
      doorTypesToGenerate: parsedDoors,
      doorPrices: doorPrices
    });

    setSuccessBanner(`Successfully generated project metadata map with ${calculatedTotalOpenings} checklists!`);
    
    // Clear form
    setPurchaseOrderNo('');
    setSoDetails('');
    
    setTimeout(() => {
      setSuccessBanner(null);
    }, 6000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* LEFT COLUMN: One-Time Project Setup Configuration Card */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col relative">
          
          {/* Card header */}
          <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/70 select-none">
            <div className="flex items-center gap-2.5">
              <div className="p-1 px-2.5 rounded-lg bg-indigo-50 border border-indigo-150 text-indigo-700 flex items-center gap-1.5 text-xs font-bold font-mono">
                <Sparkles className="w-3.5 h-3.5" />
                SO REGISTRATION
              </div>
              <h3 className="font-extrabold text-zinc-805 text-base font-sans leading-tight">
                Project Initialization
              </h3>
            </div>
            
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
          </div>

          {/* Form / Status container */}
          <div className="p-6 space-y-5">
            {/* Active initialization form - Always open to receive another supervisor input */}
            <form onSubmit={handleInitializeProject} className="space-y-5 animate-fadeIn">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-[11px] text-rose-700 rounded-xl flex items-center gap-1.5 font-bold">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 6 Digit SO identifier */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wide">
                  6-Digit SO Identifier (Sales Order No)<span className="text-red-500">*</span>
                </label>
                  <input
                    type="text"
                    maxLength={9}
                    value={purchaseOrderNo}
                    onChange={(e) => setPurchaseOrderNo(e.target.value.replace(/[^a-zA-Z0-9-]/g, ''))}
                    placeholder="e.g. SO-387026"
                    className="w-full px-3.5 py-2.5 bg-white border border-zinc-250 rounded-xl text-xs font-bold font-mono focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    required
                  />
                  <p className="text-[10px] text-zinc-400 leading-normal">
                    The Sales Order layout accepts a 6-digit numeric identification, which can be entered directly or with its official prefix. Example: <strong className="text-zinc-500">SO-387026</strong>.
                  </p>
                </div>

              {/* SO Details */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wide">
                  SO Details / Client Description
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={soDetails}
                  onChange={(e) => setSoDetails(e.target.value)}
                  placeholder="e.g. Godrej Woods - Wooden Fire Doors"
                  className="w-full px-3.5 py-2.5 bg-white border border-zinc-250 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                />
                <p className="text-[10px] text-zinc-400 leading-normal">
                  Brief spec/details about this Sales Order. This string will be embedded in each door log and populate the combined sheets summaries.
                </p>
              </div>

                {/* Number of Towers */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wide">
                    Number of Towers<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={numTowers}
                    onChange={(e) => setNumTowers(e.target.value)}
                    placeholder="e.g. 2"
                    className="w-full px-3.5 py-2.5 bg-white border border-zinc-205 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 transition"
                    required
                  />
                  <p className="text-[10px] text-zinc-400">Towers will be named Tower 01, Tower 02 etc.</p>
                </div>

                {/* Floors Count */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wide">
                    Total Floors per Tower
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={totalFloors}
                    onChange={(e) => setTotalFloors(e.target.value)}
                    placeholder="e.g. 5"
                    className="w-full px-3.5 py-2.5 bg-white border border-zinc-205 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                {/* Flats per Floor */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wide">
                    Flats per Floor
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="12"
                    value={flatsPerFloor}
                    onChange={(e) => setFlatsPerFloor(e.target.value)}
                    placeholder="e.g. 4"
                    className="w-full px-3.5 py-2.5 bg-white border border-zinc-205 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                {/* Select Doors/Openings codes to allocate */}
                <div className="pt-3 border-t border-zinc-150 space-y-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="block text-xs font-bold text-zinc-650 uppercase tracking-wide">
                        Doors per Flat (Openings per Flat)
                      </span>
                      
                      {/* Mode selector */}
                      <div className="flex rounded-md bg-zinc-150 p-0.5 text-[9px] font-bold">
                        <button
                          type="button"
                          onClick={() => setUseCustomCodes(true)}
                          className={`px-1.5 py-0.5 rounded transition ${
                            useCustomCodes 
                              ? "bg-white shadow-2xs text-indigo-600" 
                              : "text-zinc-500 hover:text-zinc-700"
                          }`}
                        >
                          Codes A-F
                        </button>
                        <button
                          type="button"
                          onClick={() => setUseCustomCodes(false)}
                          className={`px-1.5 py-0.5 rounded transition ${
                            !useCustomCodes 
                              ? "bg-white shadow-2xs text-indigo-600" 
                              : "text-zinc-500 hover:text-zinc-700"
                          }`}
                        >
                          Generic Names
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-500 font-medium leading-relaxed">
                      Select or type the openings to create for each flat. The total number of items here determines the <span className="font-bold text-zinc-700">Doors per Flat multiplier</span>.
                    </p>
                  </div>

                  {useCustomCodes ? (
                    <div className="space-y-2">
                      <p className="text-[10px] text-zinc-400 font-semibold">
                        Comma-separated opening codes (e.g. A, B, C, D represents 4 doors per flat):
                      </p>
                      <input
                        type="text"
                        value={customDoorCodes}
                        onChange={(e) => setCustomDoorCodes(e.target.value)}
                        placeholder="e.g. A, B, C, D"
                        className="w-full px-3 py-2 bg-white border border-zinc-250 rounded-xl text-xs font-bold font-mono text-indigo-700 focus:outline-none focus:border-indigo-500"
                      />

                      {/* Map preview */}
                      <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-200/60 divide-y divide-zinc-200/50 text-xs text-zinc-650 space-y-1">
                        {parsedDoors.map((code) => {
                          const nameMapping = DOOR_MAP[code] || code;
                          const standardPrice = doorPrices[code] ?? 5000;
                          return (
                            <div key={code} className="flex justify-between items-center py-1 text-[11px]">
                              <span className="font-mono font-bold text-indigo-600">{code}</span>
                              <span className="truncate max-w-[130px] font-medium text-zinc-600">{nameMapping}</span>
                              <span className="font-mono text-zinc-500">₹{standardPrice.toLocaleString()}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-40 overflow-y-auto pt-1 custom-scroll-area">
                      {DOOR_TYPES.slice(0, 6).map(doorName => {
                        const isChecked = selectedDoors.includes(doorName);
                        return (
                          <button
                            type="button"
                            key={doorName}
                            onClick={() => handleToggleDoorSelection(doorName)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-xl border flex items-center justify-between font-semibold text-xs transition ${
                              isChecked 
                                ? "bg-indigo-50/50 border-indigo-200 text-indigo-950" 
                                : "bg-white border-zinc-205 text-zinc-500 hover:bg-zinc-50"
                            }`}
                          >
                            <span>{doorName}</span>
                            <span className={`w-3.5 h-3.5 rounded-md border flex items-center justify-center text-[10px] uppercase ${
                              isChecked ? "bg-indigo-600 border-indigo-600 text-white" : "border-zinc-300 bg-white"
                            }`}>
                              {isChecked ? "✓" : ""}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Calculation breakdown: Live multiplying multiplier values */}
                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1.5 text-xs text-indigo-900/80">
                  <div className="flex items-center gap-1 font-extrabold text-indigo-950 text-xs">
                    <Info className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span>Project Layout Map Multiply Preview</span>
                  </div>
                  <p className="font-medium text-[11px] leading-relaxed">
                    Total generated openings count is derived using the standard formula multiplier:
                  </p>
                  <div className="font-mono text-center font-bold text-zinc-800 bg-white py-2 rounded-lg border border-indigo-200 text-[11px]">
                    {numTowers || "0"} Towers × {totalFloors || "0"} Floors × {flatsPerFloor || "0"} Rooms × {parsedDoors.length} Doors = <span className="text-indigo-700 font-extrabold">{calculatedTotalOpenings} Openings</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-medium">
                    This triggers complete database map initialization. After creation, spatial dimensions are frozen for quality control.
                  </p>
                </div>

                {/* Save initialization actions */}
                <div className="flex gap-2.5 pt-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-extrabold transition shadow-md active:scale-98 cursor-pointer tracking-wider uppercase text-center flex items-center justify-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Initialize Project Map
                  </button>
                </div>
              </form>
          </div>

        </div>

        {/* Sales Order Registry & History Status Card */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <History className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-zinc-800 tracking-tight">Sales Order Registry</h3>
              <p className="text-xs text-zinc-500 font-semibold font-sans">Switch dashboards between saved orders.</p>
            </div>
          </div>

          <div className="space-y-3">
            {savedProjects.length === 0 ? (
              <div className="p-4 border border-dashed border-zinc-200 rounded-xl text-center">
                <p className="text-xs text-zinc-400 font-semibold">No historical Sales Orders found.</p>
              </div>
            ) : (
              savedProjects.map((project) => {
                const analysis = getProjectAnalysis(project.flats);
                const isActive = flats.length > 0 && flats[0].oaNo === project.salesOrderNo;
                const uniqueFlatsCount = project.flats.length;
                
                // Get unique towers
                const towers = Array.from(new Set(project.flats.map(f => f.towerId)));
                // Doors per Flat (Openings) - is unique door names in the list
                const doorsCount = Array.from(new Set(project.flats.map(f => f.doorName))).length;

                return (
                  <div 
                    key={project.salesOrderNo}
                    className={`p-3.5 border rounded-xl transition flex flex-col gap-2.5 ${
                      isActive 
                        ? "border-indigo-500 bg-indigo-50/20 shadow-xs animate-pulseFast" 
                        : "border-zinc-200 hover:border-zinc-300 bg-zinc-50/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className="font-mono font-black text-xs text-zinc-900 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-md">
                          {project.salesOrderNo}
                        </span>
                        {isActive && (
                          <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Active Dashboard
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onLoadProject(project.salesOrderNo)}
                          disabled={isActive}
                          className={`p-1.5 rounded-lg border text-[10px] font-bold transition flex items-center gap-1 ${
                            isActive 
                              ? "bg-zinc-150 border-zinc-200/60 text-zinc-400 cursor-not-allowed" 
                              : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100 hover:border-zinc-350 cursor-pointer"
                          }`}
                        >
                          <FolderOpen className="w-3.5 h-3.5 shrink-0" />
                          Load SO Status
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete ${project.salesOrderNo} and all its installation compliance records?`)) {
                              onDeleteProject(project.salesOrderNo);
                            }
                          }}
                          className="p-1.5 bg-rose-50 hover:bg-rose-500 hover:text-white border border-rose-150 hover:border-transparent text-rose-600 rounded-lg text-xs transition cursor-pointer"
                          title="Delete Order History"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[10px] text-zinc-500 font-semibold border-t border-b border-zinc-100 py-2 bg-white/40 rounded px-1.5">
                      <div>
                        <div className="text-zinc-400">Total Checklists</div>
                        <div className="font-mono text-xs font-bold text-zinc-800">{uniqueFlatsCount}</div>
                      </div>
                      <div>
                        <div className="text-zinc-400">Towers Count</div>
                        <div className="font-mono text-xs font-bold text-zinc-850">{towers.length} ({towers.join(", ")})</div>
                      </div>
                      <div>
                        <div className="text-zinc-400">Doors per Flat</div>
                        <div className="font-mono text-xs font-bold text-indigo-700">{doorsCount} Openings</div>
                      </div>
                    </div>

                    {/* Progress slider bar status */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-zinc-400 uppercase tracking-wider">Installation Completion</span>
                        <span className="font-mono text-zinc-805 font-bold bg-zinc-100 px-1 py-0.2 rounded-sm">{analysis.overallProgress}%</span>
                      </div>
                      <div className="w-full bg-zinc-100 h-2 rounded-full overflow-hidden border border-zinc-200/50">
                        <div 
                          className="bg-indigo-600 h-full transition-all duration-500 rounded-full"
                          style={{ width: `${analysis.overallProgress}%` }}
                        />
                      </div>
                    </div>

                    <div className="text-[9px] text-zinc-450 font-medium flex items-center justify-between">
                      <span>Last Modified:</span>
                      <span className="font-mono font-bold text-zinc-500">
                        {new Date(project.timestamp).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Master Prices / Opening Codes & Active Tower Lists */}
      <div className="lg:col-span-7 space-y-6 animate-fadeIn">
        
        {/* Card: Master Cost Structure Configuration - Overwriteable */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
              <Coins className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-zinc-805 tracking-tight">Project Master Cost Structure</h3>
              <p className="text-xs text-zinc-500 font-semibold font-sans">
                Set and overwrite default target budget values assigned to standard opening codes (A, B, C, D, E, F).
              </p>
            </div>
          </div>

          {priceSuccessBanner && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold rounded-xl flex items-center gap-1.5">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
              <span>{priceSuccessBanner}</span>
            </div>
          )}

          <form onSubmit={handleUpdateMasterPrices} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {['A', 'B', 'C', 'D', 'E', 'F'].map((code) => {
                const specName = DOOR_MAP[code] || "Opening Specification";
                return (
                  <div key={code} className="p-3 border border-zinc-200 rounded-xl bg-zinc-50/40 hover:bg-zinc-50 transition space-y-1.5 relative">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="font-bold text-[10px] uppercase font-mono bg-indigo-50 border border-indigo-100 text-indigo-700 rounded px-1.5 py-0.5">
                        Code {code}
                      </span>
                      <span className="text-[9px] text-zinc-400 font-semibold truncate max-w-[60px]" title={specName}>
                        {specName}
                      </span>
                    </div>
                    
                    <div className="relative">
                      <span className="absolute left-2.5 top-2 text-xs font-bold text-zinc-400 font-mono">₹</span>
                      <input
                        type="text"
                        value={editingPrices[code] || ''}
                        onChange={(e) => handlePriceFieldChange(code, e.target.value)}
                        className="w-full pl-6 pr-2 py-1 bg-white border border-zinc-200 rounded-lg text-xs font-bold font-mono focus:outline-none focus:border-indigo-500"
                        placeholder="e.g. 5000"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-zinc-100">
              <p className="text-[10px] text-zinc-400 font-semibold leading-normal max-w-sm">
                *Assigning specific costs here pre-populates target budgets. Alterations automatically register for new generations. To rewrite existing, use the modal inside compliance grid.
              </p>
              <button
                type="submit"
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-extrabold transition shadow-xs cursor-pointer inline-flex items-center gap-1 shrink-0"
              >
                Overwrite Presets
              </button>
            </div>
          </form>
        </div>

        {/* Card: Active Tower Parameters & Destructive Wipes */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-zinc-905 tracking-tight">Supervisor Active Project Map</h3>
              <p className="text-xs text-zinc-500 font-semibold font-sans">Active segments, registered PO indices, and structure controls.</p>
            </div>
          </div>

          {successBanner && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-extrabold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successBanner}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-405">
                Configured Tower Slots Info
              </div>
              {onWipeAll && flats.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmWipeAll(true)}
                  className="px-3 py-1.5 text-xs font-extrabold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-500 rounded-lg border border-rose-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Wipe All Records
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(towerBreakdown).length === 0 ? (
                <div className="col-span-2 text-center py-6 border border-dashed border-zinc-205 rounded-xl text-zinc-400 text-xs font-semibold space-y-1.5 bg-zinc-50/50">
                  <p>No project parameters configured yet.</p>
                  <p className="text-[10px] text-zinc-650 font-normal">Use the registration block on the left to initialize towers and rooms.</p>
                </div>
              ) : (
                Object.keys(towerBreakdown).map(towerName => {
                  const item = towerBreakdown[towerName];
                  const floorsSorted = [...item.floors].sort((a,b)=>a-b);
                  return (
                    <div 
                      key={towerName} 
                      className="border border-zinc-200 hover:border-zinc-250 rounded-2xl p-4.5 bg-zinc-50/45 hover:bg-zinc-50 transition space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-zinc-400">
                            Spatial Identity
                          </span>
                          <h4 className="font-black text-zinc-800 text-sm leading-tight">
                            {towerName}
                          </h4>
                        </div>
                        
                        <button
                          type="button"
                          onClick={() => setTowerToWipe(towerName)}
                          className="p-1 px-2 text-[10px] font-bold text-rose-600 hover:text-white hover:bg-rose-500 rounded-lg border border-rose-100 hover:border-transparent transition flex items-center gap-1 shrink-0 cursor-pointer shadow-3xs bg-white"
                        >
                          <Trash2 className="w-3 h-3" />
                          Wipe
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-zinc-200/50">
                        <div>
                          <span className="block text-[9px] text-zinc-450 font-bold uppercase tracking-wider leading-none">Registered PO</span>
                          <span className="font-mono font-bold text-zinc-700 text-[11px]">
                            {item.oaCodes.length > 0 ? item.oaCodes.join(", ") : "None"}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[9px] text-zinc-450 font-bold uppercase tracking-wider leading-none">Total Floors</span>
                          <span className="font-semibold text-zinc-700">
                            {floorsSorted.length} ({floorsSorted[0]} - {floorsSorted[floorsSorted.length-1]})
                          </span>
                        </div>
                      </div>

                      <div className="pt-1 select-none">
                        <div className="flex items-center justify-between text-xs font-semibold pt-1">
                          <span className="text-zinc-500">Checking Openings</span>
                          <span className="text-indigo-650 font-extrabold font-mono text-[11px]">{item.flatsCount} rooms</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-gradient-to-br from-indigo-50/50 to-blue-50 border border-indigo-100/50 rounded-2xl p-5 flex gap-4">
          <div className="p-2.5 bg-white rounded-xl text-indigo-600 shrink-0 border border-indigo-100 shadow-2xs">
            <Hammer className="w-5 h-5 animate-pulse" />
          </div>
          <div className="space-y-1 text-xs text-indigo-950/80 font-medium leading-relaxed">
            <h4 className="font-black text-indigo-950 uppercase tracking-wider text-[11px]">Precision Compliance Framework</h4>
            <p>
              In compliance setups, spatial map directories are treated as absolute structures locked during project creation. This guarantees that checklists don&apos;t shift under contractors.
            </p>
            <p className="font-bold text-indigo-900">
              Formula: Towers ({numTowers || "0"}) × Floors ({totalFloors || "0"}) × Flats/Floor ({flatsPerFloor || "0"}) × Selected Openings ({parsedDoors.length}) = {calculatedTotalOpenings} checklists.
            </p>
          </div>
        </div>

      </div>

      {/* Custom Modal Confirmation for Single Tower Wipe */}
      {towerToWipe && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-[2px] animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-zinc-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-650">
              <div className="p-2 bg-rose-50 rounded-xl border border-rose-100">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="font-extrabold text-zinc-900 text-base leading-tight">Wipe Tower Openings?</h3>
            </div>
            
            <p className="text-xs text-zinc-500 leading-relaxed">
              Are you sure you want to delete ALL openings checklists generated for <strong className="text-zinc-800">{towerToWipe}</strong>? This action cannot be undone.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  onClearTower(towerToWipe);
                  setTowerToWipe(null);
                }}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs rounded-xl transition duration-150 shadow-sm cursor-pointer"
              >
                Yes, Wipe Tower
              </button>
              <button
                type="button"
                onClick={() => setTowerToWipe(null)}
                className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 font-bold text-xs rounded-xl border border-zinc-200 transition duration-150 cursor-pointer"
              >
                No, Keep It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Modal Confirmation for Wiping All Records */}
      {confirmWipeAll && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-[2px] animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-zinc-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-650">
              <div className="p-2 bg-rose-50 rounded-xl border border-rose-100">
                <Trash2 className="w-5 h-5 text-rose-650" />
              </div>
              <h3 className="font-extrabold text-zinc-900 text-base leading-tight">Wipe All Records?</h3>
            </div>
            
            <p className="text-xs text-zinc-500 leading-relaxed">
              Are you sure you want to WIPE all project settings, doors, and checklists? This action is absolutely destructive and <span className="font-bold text-rose-600">permanently deletes</span> everything!
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (onWipeAll) onWipeAll();
                  setConfirmWipeAll(false);
                }}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs rounded-xl transition duration-150 shadow-sm cursor-pointer"
              >
                Yes, Wipe Everything
              </button>
              <button
                type="button"
                onClick={() => setConfirmWipeAll(false)}
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
