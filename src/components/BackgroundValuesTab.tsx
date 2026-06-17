import React, { useState } from 'react';
import { FlatRecord } from '../types';
import { SUPERVISORS, DOOR_TYPES, DOOR_MAP } from '../data/mockData';
import { Settings, Plus, LayoutGrid, CheckCircle2, Sliders, AlertCircle, Trash2, ShieldCheck, Hammer, HelpCircle, FileCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface BackgroundValuesTabProps {
  flats: FlatRecord[];
  onGenerateFlats: (config: {
    salesOrderNo: string;
    towerId: string;
    totalFloors: number;
    flatsPerFloor: number;
    doorTypesToGenerate: string[];
    defaultPrice?: number;
  }) => void;
  onClearTower: (towerId: string) => void;
  onWipeAll?: () => void;
}

export default function BackgroundValuesTab({ flats, onGenerateFlats, onClearTower, onWipeAll }: BackgroundValuesTabProps) {
  // exact state corresponding to the supervisor form in the screenshot
  const [salesOrderNo, setSalesOrderNo] = useState('');
  const [towerId, setTowerId] = useState('');
  const [totalFloors, setTotalFloors] = useState('');
  const [flatsPerFloor, setFlatsPerFloor] = useState('');
  const [defaultPrice, setDefaultPrice] = useState('5000');

  const [customDoorCodes, setCustomDoorCodes] = useState('A, B, C');
  const [useCustomCodes, setUseCustomCodes] = useState(true);

  const [selectedDoors, setSelectedDoors] = useState<string[]>([
    "Main Door (MD)",
    "Bedroom 1 (BR1)"
  ]);

  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Custom non-blocking confirmation states
  const [towerToWipe, setTowerToWipe] = useState<string | null>(null);
  const [confirmWipeAll, setConfirmWipeAll] = useState(false);

  // Group current loaded data to show "Fetched Background Values"
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

  const handleCancel = () => {
    setSalesOrderNo('');
    setTowerId('');
    setTotalFloors('');
    setFlatsPerFloor('');
    setDefaultPrice('5000');
    setFormError(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validations
    if (!salesOrderNo || salesOrderNo.trim().length !== 6 || isNaN(Number(salesOrderNo))) {
      setFormError("Enter Sales Order No (Must be exactly 6 numeric digits)*");
      return;
    }

    if (!towerId.trim()) {
      setFormError("Tower ID/ Name is required*");
      return;
    }

    const floorsNum = parseInt(totalFloors);
    if (isNaN(floorsNum) || floorsNum <= 0 || floorsNum > 30) {
      setFormError("Total Floors must be a valid number between 1 and 30*");
      return;
    }

    const flatsPerFloorNum = parseInt(flatsPerFloor);
    if (isNaN(flatsPerFloorNum) || flatsPerFloorNum <= 0 || flatsPerFloorNum > 12) {
      setFormError("Flats per Floor must be a valid number between 1 and 12*");
      return;
    }

    // Select which door names or codes to send
    const doorTypesToGenerate = useCustomCodes 
      ? customDoorCodes.split(',').map(item => item.trim()).filter(Boolean)
      : selectedDoors;

    if (doorTypesToGenerate.length === 0) {
      setFormError("Must specify at least one door code or selection for generation*");
      return;
    }

    // Call save generation
    onGenerateFlats({
      salesOrderNo: `SO-${salesOrderNo}`,
      towerId: towerId.trim(),
      totalFloors: floorsNum,
      flatsPerFloor: flatsPerFloorNum,
      doorTypesToGenerate: doorTypesToGenerate,
      defaultPrice: parseFloat(defaultPrice) || 5000
    });

    setSuccessBanner(`Fetched Background Values! Created structure config for ${towerId} successfully.`);
    handleCancel();

    setTimeout(() => {
      setSuccessBanner(null);
    }, 5000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      {/* LEFT COLUMN: Exactly replicated supervisor Input Form card matching the attached screenshot */}
      <div className="lg:col-span-5 flex justify-center">
        <div className="w-full max-w-sm bg-white rounded-xl shadow-lg border border-zinc-200 overflow-hidden flex flex-col" style={{ minHeight: '520px' }}>
          
          {/* Replicated Image Header */}
          <div className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between bg-white select-none">
            <div className="flex items-center gap-3">
              <button type="button" className="text-zinc-600 hover:text-zinc-900">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
                </svg>
              </button>
              
              {/* Gear setup icon matching visual design */}
              <div className="flex items-center gap-1 text-amber-500">
                <Settings className="w-5 h-5 fill-amber-100" />
              </div>

              <span className="font-semibold text-zinc-700 tracking-tight text-base font-sans selection:bg-indigo-100">
                User Input
              </span>
            </div>

            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
          </div>

          {/* Form Scroll Container */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 custom-scroll-area">
            
            {formError && (
              <div className="p-2.5 bg-rose-50 border border-rose-100 text-[11px] text-rose-700 rounded-lg flex items-center gap-1.5 font-semibold">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                <span>{formError}</span>
              </div>
            )}

            {/* Field A: Sales Order (Exactly matching labels/asterisks) */}
            <div className="space-y-1.5">
              <label className="block text-[13px] font-semibold text-zinc-600 font-sans">
                Enter Sales Order No(6 Digits)<span className="text-blue-500">*</span>
              </label>
              <input
                type="text"
                maxLength={6}
                value={salesOrderNo}
                onChange={(e) => setSalesOrderNo(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 504128"
                className="w-full px-3.5 py-2.5 bg-white border border-zinc-300 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                required
              />
            </div>

            {/* Field B: Tower ID/ Name */}
            <div className="space-y-1.5">
              <label className="block text-[13px] font-semibold text-zinc-600 font-sans">
                Tower ID/ Name<span className="text-blue-500">*</span>
              </label>
              <input
                type="text"
                value={towerId}
                onChange={(e) => setTowerId(e.target.value)}
                placeholder="e.g. Tower 05"
                className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                required
              />
            </div>

            {/* Field C: Total Floors */}
            <div className="space-y-1.5">
              <label className="block text-[13px] font-semibold text-zinc-600 font-sans">
                Total Floors
              </label>
              <input
                type="text"
                value={totalFloors}
                onChange={(e) => setTotalFloors(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 5"
                className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>

            {/* Field D: Flats per Floor */}
            <div className="space-y-1.5">
              <label className="block text-[13px] font-semibold text-zinc-600 font-sans">
                Flats per Floor
              </label>
              <input
                type="text"
                value={flatsPerFloor}
                onChange={(e) => setFlatsPerFloor(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 4"
                className="w-full px-3.5 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm font-medium focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              />
            </div>

            {/* Field E: Contract Price per Door */}
            <div className="space-y-1.5">
              <label className="block text-[13px] font-semibold text-zinc-600 font-sans">
                Price per Opening (₹)<span className="text-blue-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-zinc-400 font-bold font-mono">₹</span>
                <input
                  type="text"
                  value={defaultPrice}
                  onChange={(e) => setDefaultPrice(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 5000"
                  className="w-full pl-7 pr-3.5 py-2.5 bg-white border border-zinc-200 rounded-lg text-sm font-semibold font-mono text-zinc-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Generative Add-on: Selected doors to auto generate */}
            <div className="pt-3 border-t border-zinc-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="block text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Specification Matrix Set
                </span>
                
                {/* Mode Selector */}
                <div className="flex rounded-md bg-zinc-100 p-0.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setUseCustomCodes(true)}
                    className={`px-2 py-1 rounded font-bold transition-all ${
                      useCustomCodes 
                        ? "bg-white shadow-xs text-indigo-600" 
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    AppSheet Codes
                  </button>
                  <button
                    type="button"
                    onClick={() => setUseCustomCodes(false)}
                    className={`px-2 py-1 rounded font-bold transition-all ${
                      !useCustomCodes 
                        ? "bg-white shadow-xs text-indigo-600" 
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    Manual Preset
                  </button>
                </div>
              </div>

              {useCustomCodes ? (
                <div className="space-y-2.5 animate-fadeIn">
                  <p className="text-[11px] text-zinc-500 leading-normal">
                    Specify comma-separated codes (such as <code className="bg-zinc-100 px-1 py-0.5 rounded text-indigo-600 font-bold font-mono">A, B, C</code>) to match AppSheet EnumList.
                  </p>
                  
                  <input
                    type="text"
                    value={customDoorCodes}
                    onChange={(e) => setCustomDoorCodes(e.target.value)}
                    placeholder="e.g. A, B, C"
                    className="w-full px-3.5 py-2 bg-white border border-zinc-300 focus:border-blue-500 rounded-lg text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors placeholder:text-zinc-300 font-mono"
                  />

                  {/* Interactive Live Conversion Mapped View */}
                  <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 space-y-1.5 shadow-2xs">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-wider text-zinc-400">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Live AppScript Map Preview</span>
                    </div>
                    
                    <div className="divide-y divide-zinc-200/50 max-h-36 overflow-y-auto custom-scroll-area">
                      {customDoorCodes.split(',').map(item => item.trim()).filter(Boolean).map((code, index) => {
                        const mappedVal = DOOR_MAP[code] || code;
                        const isOriginalCode = !!DOOR_MAP[code];
                        return (
                          <div key={index} className="flex items-center justify-between py-1.5 text-xs">
                            <span className="font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold text-[10px] border border-indigo-100">
                              Code {code}
                            </span>
                            <span className={`font-semibold ${isOriginalCode ? 'text-zinc-805 text-[11px]' : 'text-amber-700 text-[11px]'}`}>
                              {mappedVal} {!isOriginalCode && " (Custom)"}
                            </span>
                          </div>
                        );
                      })}
                      {customDoorCodes.split(',').map(item => item.trim()).filter(Boolean).length === 0 && (
                        <div className="text-[11px] text-zinc-400 font-semibold py-1">
                          No active door code parsed yet.
                        </div>
                      )}
                    </div>

                    {/* Mappings Reference Sheet */}
                    <div className="pt-2 mt-1 border-t border-zinc-200 grid grid-cols-2 gap-x-3 gap-y-1 text-[9px] font-mono text-zinc-400">
                      {Object.entries(DOOR_MAP).map(([k, v]) => (
                        <div key={k} className="flex gap-1" title={v}>
                          <span className="text-zinc-600 font-bold">{k}:</span>
                          <span className="truncate max-w-[100px] text-zinc-500">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 animate-fadeIn">
                  <p className="text-[11px] text-zinc-500 leading-snug">
                    Select door types to pre-populate for every room flat configuration.
                  </p>
                  
                  <div className="space-y-1.5 text-xs max-h-36 overflow-y-auto pt-1 custom-scroll-area">
                    {DOOR_TYPES.map(door => {
                      const isChecked = selectedDoors.includes(door);
                      return (
                        <button
                          type="button"
                          key={door}
                          onClick={() => handleToggleDoorSelection(door)}
                          className={`w-full text-left px-2.5 py-2 rounded-lg border flex items-center justify-between font-medium transition ${
                            isChecked 
                              ? "bg-indigo-50/50 border-indigo-200 text-indigo-950" 
                              : "bg-white border-zinc-200 text-zinc-500 hover:bg-zinc-50"
                          }`}
                        >
                          <span>{door}</span>
                          <span className={`w-3.5 h-3.5 rounded border-2 flex items-center justify-center ${
                            isChecked ? "bg-indigo-600 border-indigo-600 text-white" : "border-zinc-300"
                          }`}>
                            {isChecked && "✓"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Bottom Action Footer (Exactly matching layouts from the attached image) */}
          <div className="px-6 py-4 border-t border-zinc-200 bg-white flex items-center justify-between text-base">
            <button
              type="button"
              onClick={handleCancel}
              className="text-zinc-600 hover:text-zinc-900 font-medium cursor-pointer transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              type="button"
              className="text-blue-600 hover:text-blue-800 font-bold tracking-wide cursor-pointer text-[15px] transition"
            >
              Save
            </button>
          </div>

        </div>
      </div>

      {/* RIGHT COLUMN: Supervisor Background Database Status list */}
      <div className="lg:col-span-7 space-y-6">
        
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-zinc-900 tracking-tight">Supervisor Background Settings</h3>
              <p className="text-sm text-zinc-500 font-medium">Fetched site parameters and initialized specifications.</p>
            </div>
          </div>

          {successBanner && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{successBanner}</span>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                Active Tower Structure Parameters
              </div>
              {onWipeAll && flats.length > 0 && (
                <button
                  type="button"
                  onClick={() => setConfirmWipeAll(true)}
                  className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-500 rounded-md border border-rose-200 hover:border-transparent transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Wipe All Records
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.keys(towerBreakdown).length === 0 ? (
                <div className="col-span-2 text-center py-6 border border-dashed border-zinc-200 rounded-xl text-zinc-400 text-xs font-semibold">
                  No active tower segments configured. Use the form on the left to initialize.
                </div>
              ) : (
                Object.keys(towerBreakdown).map(towerName => {
                  const item = towerBreakdown[towerName];
                  const floorsSorted = [...item.floors].sort((a,b)=>a-b);
                  return (
                    <div 
                      key={towerName} 
                      className="border border-zinc-200 hover:border-zinc-300 rounded-2xl p-5 bg-zinc-50/50 hover:bg-zinc-50 transition space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-zinc-400">
                            Segment Identity
                          </span>
                          <h4 className="font-extrabold text-base text-zinc-900 leading-tight">
                            {towerName}
                          </h4>
                        </div>
                        
                        {/* Remove whole tower - permanently visible */}
                        <button
                          type="button"
                          onClick={() => setTowerToWipe(towerName)}
                          className="p-1 px-2 text-xs font-bold text-rose-600 hover:text-white hover:bg-rose-500 rounded-lg border border-rose-100 hover:border-transparent transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs bg-white"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Wipe
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-zinc-200/50">
                        <div>
                          <span className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider leading-none">Registered SOs</span>
                          <span className="font-mono font-bold text-zinc-700">
                            {item.oaCodes.length > 0 ? item.oaCodes.join(", ") : "None"}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider leading-none">Total Floors</span>
                          <span className="font-semibold text-zinc-700">
                            {floorsSorted.length} ({floorsSorted[0]} - {floorsSorted[floorsSorted.length-1]})
                          </span>
                        </div>
                      </div>

                      <div className="pt-2">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-zinc-500">Checking Openings</span>
                          <span className="text-indigo-600 font-bold font-mono">{item.flatsCount} rooms</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Informative Guidance card */}
        <div className="bg-gradient-to-br from-blue-50/80 to-blue-100/50 border border-blue-100 rounded-2xl p-5 flex gap-4">
          <div className="p-2 bg-white rounded-xl text-blue-600 shrink-0 border border-blue-100">
            <Hammer className="w-5 h-5" />
          </div>
          <div className="space-y-1.5 text-xs text-blue-900/80">
            <h4 className="font-bold text-blue-950 uppercase tracking-wide leading-none">Generative Automation Blueprint</h4>
            <p className="leading-relaxed">
              Supervisors can automate compliance sheet creation: Entering the configuration generates the full set of rooms and selected door specifications at once.
            </p>
            <p className="leading-relaxed font-semibold">
              E.g. entering Sales Order 202645, Tower ID &quot;Tower 05&quot;, Floors &quot;3&quot;, Flats-per-floor &quot;4&quot; generates 12 complete flats instantly.
            </p>
          </div>
        </div>

      </div>

      {/* Custom Modal Confirmation for Single Tower Wipe */}
      {towerToWipe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-[2px] animate-fadeIn">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-[2px] animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-zinc-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-650">
              <div className="p-2 bg-rose-50 rounded-xl border border-rose-100">
                <Trash2 className="w-5 h-5 text-rose-650" />
              </div>
              <h3 className="font-extrabold text-zinc-900 text-base leading-tight">Wipe All Records?</h3>
            </div>
            
            <p className="text-xs text-zinc-500 leading-relaxed">
              Are you sure you want to WIPE all tower settings, doors, and checklists? This action is absolutely destructive and <span className="font-bold text-rose-600">permanently deletes</span> everything!
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
