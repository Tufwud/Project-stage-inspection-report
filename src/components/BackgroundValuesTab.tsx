import React, { useState, useEffect } from 'react';
import { FlatRecord, SavedProject } from '../types';
import { SUPERVISORS, DOOR_TYPES, DOOR_MAP } from '../data/mockData';
import { getProjectAnalysis } from '../utils';
import { getAccessToken, googleSignIn, syncErpPdfToDrive } from '../lib/googleSheets';
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
  FolderOpen,
  Users,
  BookOpen,
  Paperclip,
  FileText,
  Download
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
    supervisor?: string;
    contractor?: string;
  }) => void;
  doorPrices: { [code: string]: number };
  doorNames: { [code: string]: string };
  onUpdateDoorPrices: (newNames: { [code: string]: string }, newPrices: { [code: string]: number }) => void;
  onUpdateFlats?: (newList: FlatRecord[]) => void;
  onClearTower: (towerId: string) => void;
  onWipeAll?: () => void;
  savedProjects: SavedProject[];
  onLoadProject: (soNo: string) => void;
  onDeleteProject: (soNo: string) => void;
  onClearHistory?: () => void;
  supervisors?: string[];
  onAddSupervisor?: (name: string) => void;
  onRemoveSupervisor?: (name: string) => void;
}

export default function BackgroundValuesTab({ 
  flats, 
  onGenerateProject, 
  doorPrices,
  doorNames,
  onUpdateDoorPrices,
  onUpdateFlats,
  onClearTower, 
  onWipeAll,
  savedProjects = [],
  onLoadProject,
  onDeleteProject,
  onClearHistory,
  supervisors = [],
  onAddSupervisor,
  onRemoveSupervisor
}: BackgroundValuesTabProps) {
  
  // State for One-Time Project Creation
  const [purchaseOrderNo, setPurchaseOrderNo] = useState('');
  const [soDetails, setSoDetails] = useState('');
  const [numTowers, setNumTowers] = useState('2');
  const [totalFloors, setTotalFloors] = useState('5');
  const [flatsPerFloor, setFlatsPerFloor] = useState('4');
  const [supervisor, setSupervisor] = useState('');
  const [contractor, setContractor] = useState('');

  const supervisorList = supervisors.length > 0 ? supervisors : SUPERVISORS.filter(s => s !== "Nagesh Yadav" && s !== "Nagesh Jadav");

  useEffect(() => {
    if (!supervisor && supervisorList.length > 0) {
      setSupervisor(supervisorList[0]);
    }
  }, [supervisorList, supervisor]);

  // Specs & Master opening codes custom state
  const [customDoorCodes, setCustomDoorCodes] = useState('A, B, C, D');
  const [customGenericNames, setCustomGenericNames] = useState('Main Door (MD), Bedroom 1 (BR1), Bedroom 2 (BR2), Toilet 1 (T1), Toilet 2 (T2), Balcony');
  const [useCustomCodes, setUseCustomCodes] = useState(true);

  // Manual doors selected fallback 
  const [selectedDoors, setSelectedDoors] = useState<string[]>([
    "Main Door (MD)",
    "Bedroom 1 (BR1)",
    "Toilet 1 (T1)"
  ]);

  // Configuration Sub Tab ('openings' | 'payment' | 'contractors' | 'supervisors' | 'erp_upload')
  const [configSubTab, setConfigSubTab] = useState<'openings' | 'payment' | 'contractors' | 'supervisors' | 'erp_upload'>('openings');

  // Pricing structure local edit values
  const [editingPrices, setEditingPrices] = useState<{ [code: string]: string }>(() => {
    const pricesObj: { [code: string]: string } = {};
    Object.entries(doorPrices).forEach(([k, v]) => {
      pricesObj[k] = String(v);
    });
    return pricesObj;
  });

  // Name structure local edit values
  const [editingNames, setEditingNames] = useState<{ [code: string]: string }>(() => {
    const namesObj: { [code: string]: string } = {};
    Object.entries(doorNames).forEach(([k, v]) => {
      namesObj[k] = v;
    });
    return namesObj;
  });

  // Stage-wise payment percentages state
  const [stagePercentages, setStagePercentages] = useState<{ [stageId: string]: number }>(() => {
    try {
      const saved = localStorage.getItem("door_quality_compliance_dashboard_stage_percentages");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      frame_install: 20,
      shutter_install: 30,
      hardware: 20,
      architrave: 10,
      seals_foams: 10,
      handover: 10
    };
  });

  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [priceSuccessBanner, setPriceSuccessBanner] = useState<string | null>(null);

  // --- ERP Work Order PDF State ---
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isUploadingErp, setIsUploadingErp] = useState(false);
  const [erpUploadError, setErpUploadError] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const token = await getAccessToken();
        setGoogleToken(token);
      } catch (err) {
        console.warn("Failed to get Google Token:", err);
      }
    };
    if (configSubTab === 'erp_upload') {
      fetchToken();
    }
  }, [configSubTab]);

  // Confirmation modally triggered states
  const [towerToWipe, setTowerToWipe] = useState<string | null>(null);
  const [confirmWipeAll, setConfirmWipeAll] = useState(false);
  const [confirmClearAllHistory, setConfirmClearAllHistory] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);

  // --- CONTRACTOR RULES STATE & HANDLERS ---
  interface ContractorRule {
    id: string;
    towerFrom: number;
    towerTo: number;
    stageId: 'any' | 'frameFixing' | 'doorFixing' | 'hardwareFixing' | 'handover';
    contractorName: string;
  }

  const [contractorRules, setContractorRules] = useState<ContractorRule[]>(() => {
    try {
      const saved = localStorage.getItem("door_quality_compliance_dashboard_contractor_rules");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: '1', towerFrom: 1, towerTo: 10, stageId: 'any', contractorName: 'Contractor A' },
      { id: '2', towerFrom: 11, towerTo: 20, stageId: 'any', contractorName: 'Contractor B' },
      { id: '3', towerFrom: 1, towerTo: 100, stageId: 'frameFixing', contractorName: 'Frame Masters Ltd' },
      { id: '4', towerFrom: 1, towerTo: 100, stageId: 'doorFixing', contractorName: 'Shutter Tech Co' }
    ];
  });

  const [newRuleTowerFrom, setNewRuleTowerFrom] = useState('1');
  const [newRuleTowerTo, setNewRuleTowerTo] = useState('10');
  const [newRuleStageId, setNewRuleStageId] = useState<'any' | 'frameFixing' | 'doorFixing' | 'hardwareFixing' | 'handover'>('any');
  const [newRuleContractorName, setNewRuleContractorName] = useState('');

  const handleAddContractorRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleContractorName.trim()) return;

    const fromNum = parseInt(newRuleTowerFrom) || 1;
    const toNum = parseInt(newRuleTowerTo) || 1;

    const rule: ContractorRule = {
      id: Date.now().toString(),
      towerFrom: Math.min(fromNum, toNum),
      towerTo: Math.max(fromNum, toNum),
      stageId: newRuleStageId,
      contractorName: newRuleContractorName.trim()
    };

    const updated = [...contractorRules, rule];
    setContractorRules(updated);
    localStorage.setItem("door_quality_compliance_dashboard_contractor_rules", JSON.stringify(updated));
    setNewRuleContractorName('');
    
    setPriceSuccessBanner("Contractor assignment rule added! Tap 'Apply Contractor Mapping Rules' to run it on active checklists.");
    setTimeout(() => {
      setPriceSuccessBanner(null);
    }, 4000);
  };

  const handleDeleteContractorRule = (id: string) => {
    const updated = contractorRules.filter(r => r.id !== id);
    setContractorRules(updated);
    localStorage.setItem("door_quality_compliance_dashboard_contractor_rules", JSON.stringify(updated));
  };

  const handleApplyContractorRules = () => {
    if (!onUpdateFlats || flats.length === 0) {
      setPriceSuccessBanner("No active checklists to update!");
      setTimeout(() => setPriceSuccessBanner(null), 3500);
      return;
    }

    const updated = flats.map(flat => {
      // Extract numeric tower number from towerId, e.g. "Tower 03" -> 3
      const towerMatch = flat.towerId.match(/\d+/);
      const towerNum = towerMatch ? parseInt(towerMatch[0], 10) : 1;

      // Create a shallow copy of the sections we want to update
      const newFlat = { ...flat };
      
      // Let's copy each stage to avoid mutating references
      newFlat.frameFixing = { ...flat.frameFixing };
      newFlat.doorFixing = { ...flat.doorFixing };
      newFlat.hardwareFixing = { ...flat.hardwareFixing };
      newFlat.handover = { ...flat.handover };

      // Find rules that apply to this flat's tower and stage
      contractorRules.forEach(rule => {
        const isTowerInRange = towerNum >= rule.towerFrom && towerNum <= rule.towerTo;
        if (isTowerInRange) {
          const name = rule.contractorName.trim();
          if (name) {
            if (rule.stageId === 'any') {
              newFlat.frameFixing.contractor = name;
              newFlat.doorFixing.contractor = name;
              newFlat.hardwareFixing.contractor = name;
              newFlat.handover.contractor = name;
              newFlat.contractor = name; // Top-level flat contractor as fallback
            } else if (rule.stageId === 'frameFixing') {
              newFlat.frameFixing.contractor = name;
            } else if (rule.stageId === 'doorFixing') {
              newFlat.doorFixing.contractor = name;
            } else if (rule.stageId === 'hardwareFixing') {
              newFlat.hardwareFixing.contractor = name;
            } else if (rule.stageId === 'handover') {
              newFlat.handover.contractor = name;
            }
          }
        }
      });

      return newFlat;
    });

    onUpdateFlats(updated);
    setPriceSuccessBanner("Contractor mapping rules successfully applied to all active tower checklists!");
    setTimeout(() => {
      setPriceSuccessBanner(null);
    }, 4000);
  };

  // Derived current metrics to inspect
  const isProjectInitialized = flats.length > 0;

  // Sync edits state with props when props update
  useEffect(() => {
    const pricesObj: { [code: string]: string } = {};
    Object.entries(doorPrices).forEach(([k, v]) => {
      pricesObj[k] = String(v);
    });
    setEditingPrices(pricesObj);

    const namesObj: { [code: string]: string } = {};
    Object.entries(doorNames).forEach(([k, v]) => {
      namesObj[k] = v;
    });
    setEditingNames(namesObj);
  }, [doorPrices, doorNames]);

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
      : customGenericNames.split(',').map(item => item.trim()).filter(Boolean);
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
    const updatedNames: { [code: string]: string } = {};
    
    Object.entries(editingPrices).forEach(([k, v]) => {
      updatedPrices[k] = Math.max(0, parseFloat(v as string) || 0);
    });
    
    Object.entries(editingNames).forEach(([k, v]) => {
      updatedNames[k] = (v as string).trim() || k;
    });

    onUpdateDoorPrices(updatedNames, updatedPrices);
    setPriceSuccessBanner("Project opening names & master rates successfully aligned and updated!");
    setTimeout(() => {
      setPriceSuccessBanner(null);
    }, 4000);
  };

  const activeOaNo = flats.length > 0 ? flats[0].oaNo : '387026';
  const activeErp = flats.find(f => f.erpWorkOrder)?.erpWorkOrder;
  const numericParts = activeOaNo.replace(/\D/g, '');
  const oaNo4Digit = numericParts.substring(0, 4) || '3870';

  const handleConnectGoogle = async () => {
    try {
      setErpUploadError(null);
      setIsUploadingErp(true);
      const res = await googleSignIn();
      if (res?.accessToken) {
        setGoogleToken(res.accessToken);
      }
    } catch (err: any) {
      setErpUploadError(err?.message || "Failed to authenticate with Google");
    } finally {
      setIsUploadingErp(false);
    }
  };

  const handleErpPdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (flats.length === 0) {
      setErpUploadError("No active checklists found! Initialize a project map first before uploading an ERP Work Order.");
      return;
    }

    setErpUploadError(null);
    setIsUploadingErp(true);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const localErp = {
          name: file.name,
          date: new Date().toLocaleDateString('en-GB'),
          size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
          url: reader.result as string
        };

        let finalErp = localErp;

        if (googleToken) {
          try {
            // Upload directly to Google Drive Site Supervisor Folder
            finalErp = await syncErpPdfToDrive(googleToken, activeOaNo, localErp);
          } catch (driveErr: any) {
            console.error("Failed to sync to Google Drive:", driveErr);
            // Non-blocking, fallback to local state
            setErpUploadError("Note: Saved in local state, but failed to sync directly to Google Drive. Keep Google authenticated and try again.");
          }
        }

        // Save this erpWorkOrder to ALL active flats
        if (onUpdateFlats) {
          const updated = flats.map(flat => ({
            ...flat,
            erpWorkOrder: finalErp
          }));
          onUpdateFlats(updated);
        }

        setPriceSuccessBanner("ERP Work Order PDF successfully registered to all checklists in this project!");
        setTimeout(() => setPriceSuccessBanner(null), 4000);
      } catch (err: any) {
        setErpUploadError(err?.message || "Failed to process PDF upload");
      } finally {
        setIsUploadingErp(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveErpPdf = () => {
    if (window.confirm("Are you sure you want to remove the ERP Work Order PDF from all checklists in this project?")) {
      if (onUpdateFlats) {
        const updated = flats.map(flat => {
          const u = { ...flat };
          delete u.erpWorkOrder;
          return u;
        });
        onUpdateFlats(updated);
      }
      setPriceSuccessBanner("ERP Work Order removed from all active checklists.");
      setTimeout(() => setPriceSuccessBanner(null), 4500);
    }
  };

  const handleSavePaymentPlan = (e: React.FormEvent) => {
    e.preventDefault();
    const totalPctSum = Object.values(stagePercentages).reduce((sum: number, v: any) => sum + (v as number), 0);
    if (totalPctSum !== 100) {
      setPriceSuccessBanner(`Error: Total percentage must sum to exactly 100%! Currently it is ${totalPctSum}%.`);
      setTimeout(() => {
        setPriceSuccessBanner(null);
      }, 5000);
      return;
    }

    try {
      localStorage.setItem("door_quality_compliance_dashboard_stage_percentages", JSON.stringify(stagePercentages));
      setPriceSuccessBanner("Stage-wise payment percentages successfully saved!");
      setTimeout(() => {
        setPriceSuccessBanner(null);
      }, 4000);
    } catch (e) {
      // safe fallback
    }
  };

  const handlePriceFieldChange = (code: string, val: string) => {
    setEditingPrices(prev => ({
      ...prev,
      [code]: val.replace(/\D/g, '')
    }));
  };

  const handleNameFieldChange = (code: string, val: string) => {
    setEditingNames(prev => ({
      ...prev,
      [code]: val
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

    const tNum = parseInt(numTowers) || 1;

    const floorsNum = parseInt(totalFloors);
    if (isNaN(floorsNum) || floorsNum <= 0 || floorsNum > 150) {
      setFormError("Total Floors must be set between 1 and 150*");
      return;
    }

    const flatsPerFloorNum = parseInt(flatsPerFloor);
    if (isNaN(flatsPerFloorNum) || flatsPerFloorNum <= 0 || flatsPerFloorNum > 50) {
      setFormError("Flats per Floor must be set between 1 and 50*");
      return;
    }

    if (parsedDoors.length === 0) {
      setFormError("Must check or specify at least one opening code specification*");
      return;
    }

    if (parsedDoors.length > 30) {
      setFormError("The doors multiplier cannot exceed 30 doors per flat*");
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
      doorPrices: doorPrices,
      supervisor: supervisor.trim() || undefined,
      contractor: contractor.trim() || undefined
    });

    setSuccessBanner(`Successfully generated project metadata map with ${calculatedTotalOpenings} checklists!`);
    
    // Clear form
    setPurchaseOrderNo('');
    setSoDetails('');
    setSupervisor('');
    setContractor('');
    
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

              {/* Default Supervisor and Contractor */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wide">
                    Supervisor <span className="text-[9px] text-zinc-400 font-medium">(Optional)</span>
                  </label>
                  <select
                    value={supervisor}
                    onChange={(e) => setSupervisor(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-zinc-250 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 transition"
                  >
                    <option value="">-- Select Supervisor --</option>
                    {supervisorList.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wide">
                    Contractor <span className="text-[9px] text-zinc-400 font-medium">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={contractor}
                    onChange={(e) => setContractor(e.target.value)}
                    placeholder="e.g. Prabir Dhol"
                    className="w-full px-3.5 py-2.5 bg-white border border-zinc-250 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

                {/* Number of Towers */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wide">
                    Number of Towers<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={numTowers}
                    onChange={(e) => setNumTowers(e.target.value)}
                    placeholder="e.g. 2"
                    className="w-full px-3.5 py-2.5 bg-white border border-zinc-205 rounded-xl text-xs font-bold focus:outline-none focus:border-indigo-500 transition"
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
                    max="150"
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
                    max="50"
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
                    <div className="space-y-2">
                      <p className="text-[10px] text-zinc-400 font-semibold">
                        Comma-separated opening names (e.g. Main Door, Bedroom 1, Toilet):
                      </p>
                      <input
                        type="text"
                        value={customGenericNames}
                        onChange={(e) => setCustomGenericNames(e.target.value)}
                        placeholder="e.g. Main Door, Bedroom 1, Toilet"
                        className="w-full px-3 py-2 bg-white border border-zinc-250 rounded-xl text-xs font-semibold text-zinc-800 focus:outline-none focus:border-indigo-500"
                      />

                      {/* Map preview */}
                      <div className="bg-zinc-50 p-2.5 rounded-xl border border-zinc-200/60 divide-y divide-zinc-200/50 text-xs text-zinc-650 space-y-1 max-h-40 overflow-y-auto">
                        {parsedDoors.map((name, idx) => {
                          const standardPrice = doorPrices[name] ?? 5000;
                          return (
                            <div key={idx} className="flex justify-between items-center py-1 text-[11px]">
                              <span className="font-mono font-bold text-zinc-400">#{idx + 1}</span>
                              <span className="truncate max-w-[150px] font-semibold text-zinc-700">{name}</span>
                              <span className="font-mono text-zinc-500 font-medium">₹{standardPrice.toLocaleString()}</span>
                            </div>
                          );
                        })}
                      </div>
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
          <div className="flex items-center justify-between gap-2 border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                <History className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-zinc-800 tracking-tight">Sales Order Registry</h3>
                <p className="text-xs text-zinc-500 font-semibold font-sans">Switch dashboards between saved orders.</p>
              </div>
            </div>
            {savedProjects.length > 0 && onClearHistory && (
              <button
                type="button"
                onClick={() => setConfirmClearAllHistory(true)}
                className="p-1.5 px-3 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white rounded-lg text-[11px] font-extrabold transition border border-rose-150 hover:border-transparent cursor-pointer flex items-center gap-1.5 shrink-0 animate-fadeIn"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </button>
            )}
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
                          onClick={() => setProjectToDelete(project.salesOrderNo)}
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
          {/* Card: Master Cost Structure & Stage-wise Payment Configuration */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-50 rounded-xl text-amber-600">
                <Coins className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-zinc-850 tracking-tight">Project Budget & Stage-wise Planning</h3>
                <p className="text-xs text-zinc-500 font-semibold font-sans">
                  Configure custom opening codes or adjust milestone payment percentages.
                </p>
              </div>
            </div>

            {/* Sub-tab switcher */}
            <div className="flex flex-wrap bg-zinc-100 p-1 rounded-xl text-[11px] font-bold self-start sm:self-auto gap-1">
              <button
                type="button"
                onClick={() => setConfigSubTab('openings')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  configSubTab === 'openings'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                1. Custom Openings (A-J)
              </button>
              <button
                type="button"
                onClick={() => setConfigSubTab('payment')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  configSubTab === 'payment'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                2. Stage Payment % Planning
              </button>
              <button
                type="button"
                onClick={() => setConfigSubTab('contractors')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  configSubTab === 'contractors'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                3. Bulk Contractor Rules
              </button>
              <button
                type="button"
                onClick={() => setConfigSubTab('supervisors')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  configSubTab === 'supervisors'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                4. Manage Supervisors
              </button>
              <button
                type="button"
                onClick={() => setConfigSubTab('erp_upload')}
                className={`px-3 py-1.5 rounded-lg transition ${
                  configSubTab === 'erp_upload'
                    ? 'bg-white text-indigo-700 shadow-2xs'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                5. ERP Work Order (PDF)
              </button>
            </div>
          </div>

          {priceSuccessBanner && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold rounded-xl flex items-center gap-1.5">
              <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
              <span>{priceSuccessBanner}</span>
            </div>
          )}

          {configSubTab === 'openings' && (
            <form onSubmit={handleUpdateMasterPrices} className="space-y-4">
              <div className="text-[11px] text-zinc-500 font-semibold bg-zinc-50 p-3 rounded-xl border border-zinc-150 leading-relaxed">
                💡 <strong>Editable Fields:</strong> Modify the specific descriptive names and target budget installation costs for codes A to J below. Any changes saved will automatically overwrite the planned structure and align any active checklist records.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[380px] overflow-y-auto pr-1">
                {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].map((code) => {
                  const currentName = editingNames[code] || '';
                  const currentPrice = editingPrices[code] || '';
                  return (
                    <div key={code} className="p-3.5 border border-zinc-200 rounded-xl bg-zinc-50/20 hover:bg-zinc-50 transition space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[10px] uppercase font-mono bg-indigo-50 border border-indigo-100 text-indigo-700 rounded px-1.5 py-0.5">
                          Code {code}
                        </span>
                        <span className="text-[9px] text-zinc-400 font-bold font-mono">ID: {code}</span>
                      </div>
                      
                      <div className="space-y-2">
                        {/* Name overwrite field */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-zinc-450 font-bold uppercase">Specification Name</span>
                          <input
                            type="text"
                            value={currentName}
                            onChange={(e) => handleNameFieldChange(code, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-800 focus:outline-none focus:border-indigo-500"
                            placeholder={`e.g. Specification ${code}`}
                          />
                        </div>

                        {/* Price overwrite field */}
                        <div className="space-y-1">
                          <span className="text-[10px] text-zinc-450 font-bold uppercase">Installation Cost (planned)</span>
                          <div className="relative">
                            <span className="absolute left-2.5 top-1.5 text-xs font-bold text-zinc-400 font-mono">₹</span>
                            <input
                              type="text"
                              value={currentPrice}
                              onChange={(e) => handlePriceFieldChange(code, e.target.value)}
                              className="w-full pl-6 pr-2 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-bold font-mono focus:outline-none focus:border-indigo-500"
                              placeholder="e.g. 5000"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
                <p className="text-[10px] text-zinc-450 font-semibold leading-normal max-w-sm">
                  *Aligns checklist door prices/names automatically. To update historical projects, reload them from history first.
                </p>
                <button
                  type="submit"
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg text-xs font-extrabold transition shadow-xs cursor-pointer inline-flex items-center gap-1 shrink-0"
                >
                  Overwrite Presets
                </button>
              </div>
            </form>
          )}

          {configSubTab === 'payment' && (
            <form onSubmit={handleSavePaymentPlan} className="space-y-5">
              <div className="text-[11px] text-zinc-500 font-semibold bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 leading-relaxed">
                🎯 <strong>Stage-wise Payment % Planning:</strong> Divide the total contract budget of a door across its six physical milestones. The total sum must equal exactly <strong>100%</strong> to register.
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { id: 'frame_install', label: 'Frame Installation', defaultPct: 20 },
                  { id: 'shutter_install', label: 'Shutter Installation', defaultPct: 30 },
                  { id: 'hardware', label: 'Hardware Fitting', defaultPct: 20 },
                  { id: 'architrave', label: 'Architrave Fixing', defaultPct: 10 },
                  { id: 'seals_foams', label: 'Seals/Foams/Desnagging', defaultPct: 10 },
                  { id: 'handover', label: 'Handover', defaultPct: 10 }
                ].map((stage) => {
                  const curPct = stagePercentages[stage.id] ?? stage.defaultPct;
                  return (
                    <div key={stage.id} className="p-3 border border-zinc-200 rounded-xl bg-zinc-50/40 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-zinc-750">{stage.label}</span>
                        <span className="text-[9px] text-zinc-400 font-mono font-bold">Default: {stage.defaultPct}%</span>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={curPct}
                          onChange={(e) => {
                            const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                            setStagePercentages(prev => ({
                              ...prev,
                              [stage.id]: val
                            }));
                          }}
                          className="w-full pr-8 pl-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-extrabold font-mono focus:outline-none focus:border-indigo-500"
                        />
                        <span className="absolute right-3 top-1.5 text-xs font-bold text-zinc-400 font-mono">%</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Summary of sums */}
              {(() => {
                const totalPctSum = Object.values(stagePercentages).reduce((sum: number, v: any) => sum + (v as number), 0);
                const isCorrect = totalPctSum === 100;
                return (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-zinc-150 bg-zinc-50">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-zinc-700">Planned Allocation:</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-black font-mono ${
                        isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {totalPctSum}% / 100%
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {!isCorrect && (
                        <span className="text-[10px] text-rose-600 font-bold">
                          ⚠️ Sum must equal exactly 100%!
                        </span>
                      )}
                      <button
                        type="submit"
                        disabled={!isCorrect}
                        className={`px-4 py-2 text-white rounded-lg text-xs font-extrabold transition shadow-xs cursor-pointer ${
                          isCorrect 
                            ? 'bg-indigo-600 hover:bg-indigo-700 cursor-pointer' 
                            : 'bg-zinc-300 text-zinc-500 cursor-not-allowed'
                        }`}
                      >
                        Save Payment Plan
                      </button>
                    </div>
                  </div>
                );
              })()}
            </form>
          )}

          {configSubTab === 'contractors' && (
            <div className="space-y-5 animate-fadeIn">
              {/* Guidance Document Block */}
              <div className="bg-amber-50/40 border border-amber-200/60 rounded-xl p-4.5 space-y-3">
                <div className="flex items-center gap-2 text-amber-800">
                  <BookOpen className="w-5 h-5 text-amber-600" />
                  <h4 className="font-extrabold text-sm tracking-tight">Contractor Mapping Guidance & Best Practices</h4>
                </div>
                
                <div className="text-xs text-zinc-650 leading-relaxed space-y-2">
                  <p>
                    By default, the system initializes all checklists with a single general contractor (e.g., <strong>Prabir Dhol</strong>). However, real-world sites assign specialized teams to different stages or specific tower groupings.
                  </p>
                  <p className="font-bold text-zinc-700">
                    With these Bulk Mapping Rules, you can assign different contractors in a few clicks:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-zinc-600">
                    <li>
                      <strong>Stage-wise Assignment:</strong> Assign one team for <span className="font-semibold text-zinc-800 font-mono">Frame Fixing / Installation</span>, another for <span className="font-semibold text-zinc-800 font-mono">Door / Shutter Installation</span>, another for <span className="font-semibold text-zinc-800 font-mono">Hardware Fitting</span>, and another for <span className="font-semibold text-zinc-800 font-mono">De-snagging & Handover</span>.
                    </li>
                    <li>
                      <strong>Tower-wise Grouping:</strong> Assign <span className="font-semibold text-zinc-800 font-mono">Contractor A</span> to Towers 1 to 10, and <span className="font-semibold text-zinc-800 font-mono">Contractor B</span> to Towers 11 to 20.
                    </li>
                    <li>
                      <strong>Automatic App Integration:</strong> Rules are stored locally. They are automatically applied during <strong>new project initialization</strong>, and can also be <strong>retroactively applied</strong> to all existing active tower checklists instantly using the sync tool below!
                    </li>
                  </ul>
                </div>
              </div>

              {/* Add Rule Form & Current Rules Grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Form column */}
                <form onSubmit={handleAddContractorRule} className="md:col-span-5 bg-zinc-50 border border-zinc-150 rounded-xl p-4 space-y-3">
                  <h4 className="font-bold text-xs text-zinc-850 uppercase tracking-wider">Add Mapping Rule</h4>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-550 font-bold uppercase">Tower From</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={newRuleTowerFrom}
                        onChange={(e) => setNewRuleTowerFrom(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500"
                        placeholder="1"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-zinc-550 font-bold uppercase">Tower To</label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={newRuleTowerTo}
                        onChange={(e) => setNewRuleTowerTo(e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500"
                        placeholder="10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-550 font-bold uppercase">Milestone Stage</label>
                    <select
                      value={newRuleStageId}
                      onChange={(e: any) => setNewRuleStageId(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500"
                    >
                      <option value="any">All Milestone Stages (General)</option>
                      <option value="frameFixing">Frame Fixing / Installation</option>
                      <option value="doorFixing">Door / Shutter Installation</option>
                      <option value="hardwareFixing">Hardware Fitting</option>
                      <option value="handover">De-snagging & Handover</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-550 font-bold uppercase">Contractor Name</label>
                    <input
                      type="text"
                      value={newRuleContractorName}
                      onChange={(e) => setNewRuleContractorName(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500"
                      placeholder="e.g. Aarav Projects Ltd"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-extrabold transition shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add Rule
                  </button>
                </form>

                {/* Rules List Column */}
                <div className="md:col-span-7 space-y-3">
                  <h4 className="font-bold text-xs text-zinc-850 uppercase tracking-wider flex items-center justify-between">
                    <span>Active Mapping Rules ({contractorRules.length})</span>
                    <span className="text-[10px] text-zinc-450 lowercase font-semibold italic">Applied bottom-to-top</span>
                  </h4>

                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {contractorRules.length === 0 ? (
                      <div className="p-6 border border-dashed border-zinc-200 rounded-xl text-center text-xs text-zinc-400 font-semibold">
                        No custom rules configured. Defaulting to main contractor.
                      </div>
                    ) : (
                      contractorRules.map((rule) => {
                        const stageLabel = 
                          rule.stageId === 'any' ? 'All Stages' :
                          rule.stageId === 'frameFixing' ? 'Frame Fixing' :
                          rule.stageId === 'doorFixing' ? 'Shutter Fixing' :
                          rule.stageId === 'hardwareFixing' ? 'Hardware Fitting' : 'Handover';

                        return (
                          <div key={rule.id} className="flex items-center justify-between p-2.5 border border-zinc-150 rounded-xl bg-white hover:bg-zinc-50/50 transition gap-2">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg font-mono">
                                  Towers {rule.towerFrom}-{rule.towerTo}
                                </span>
                                <span className="text-[10px] font-bold bg-zinc-100 text-zinc-700 px-2 py-0.5 rounded-lg font-mono">
                                  {stageLabel}
                                </span>
                              </div>
                              <p className="text-xs font-extrabold text-zinc-800">
                                Assigned: {rule.contractorName}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteContractorRule(rule.id)}
                              className="p-1.5 hover:bg-rose-50 hover:text-rose-600 text-zinc-400 rounded-lg transition shrink-0"
                              title="Delete rule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Bulk update trigger */}
                  {isProjectInitialized && (
                    <div className="p-3 bg-indigo-50/50 border border-indigo-150 rounded-xl space-y-2.5">
                      <div className="text-[10px] text-indigo-800 font-semibold leading-relaxed">
                        ⚡ <strong>Bulk Assignment Tool:</strong> Apply these {contractorRules.length} rules to override and align all {flats.length} active checklist items now.
                      </div>
                      <button
                        type="button"
                        onClick={handleApplyContractorRules}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-black transition shadow-xs cursor-pointer inline-flex items-center justify-center gap-1.5"
                      >
                        <Users className="w-4 h-4" />
                        Apply Contractor Mapping Rules to Active Project
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {configSubTab === 'supervisors' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="bg-indigo-50/40 border border-indigo-200/60 rounded-xl p-4.5 space-y-3">
                <div className="flex items-center gap-2 text-indigo-900">
                  <Users className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-extrabold text-sm tracking-tight">Supervisor Management & Workflow Integration</h4>
                </div>
                <p className="text-xs text-zinc-650 leading-relaxed">
                  Manage the official site supervisors list. Adding or removing names here dynamically updates both the <strong>Project Initialization dropdown</strong> and the <strong>individual stage inspector dropdowns</strong> across all flats.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                {/* Add Supervisor Form */}
                <div className="md:col-span-5 bg-zinc-50 border border-zinc-150 rounded-xl p-4 space-y-3">
                  <h4 className="font-bold text-xs text-zinc-850 uppercase tracking-wider">Add New Supervisor</h4>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Kumar"
                      id="new-supervisor-name-input"
                      className="w-full px-2.5 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-500"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (val && onAddSupervisor) {
                            onAddSupervisor(val);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById('new-supervisor-name-input') as HTMLInputElement;
                        const val = input?.value.trim();
                        if (val && onAddSupervisor) {
                          onAddSupervisor(val);
                          input.value = '';
                        }
                      }}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-extrabold transition shadow-2xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Add Supervisor
                    </button>
                  </div>
                </div>

                {/* Supervisor List */}
                <div className="md:col-span-7 space-y-3">
                  <h4 className="font-bold text-xs text-zinc-850 uppercase tracking-wider">
                    Active Supervisors ({supervisorList.length})
                  </h4>
                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {supervisorList.length === 0 ? (
                      <div className="p-6 border border-dashed border-zinc-200 rounded-xl text-center text-xs text-zinc-400 font-semibold">
                        No supervisors registered. Please add one.
                      </div>
                    ) : (
                      supervisorList.map((sup) => (
                        <div key={sup} className="flex items-center justify-between p-2.5 border border-zinc-150 rounded-xl bg-white hover:bg-zinc-50/50 transition gap-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                            <span className="text-xs font-bold text-zinc-850">{sup}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemoveSupervisor && onRemoveSupervisor(sup)}
                            className="p-1.5 hover:bg-rose-50 hover:text-rose-600 text-zinc-400 rounded-lg transition shrink-0 cursor-pointer"
                            title="Remove supervisor"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {configSubTab === 'erp_upload' && (
            <div className="space-y-5 animate-fadeIn">
              <div className="bg-indigo-50/40 border border-indigo-200/60 rounded-xl p-4.5 space-y-3">
                <div className="flex items-center gap-2 text-indigo-900">
                  <Paperclip className="w-5 h-5 text-indigo-600" />
                  <h4 className="font-extrabold text-sm tracking-tight">Project-Wide ERP Work Order (PDF)</h4>
                </div>
                <p className="text-xs text-zinc-650 leading-relaxed">
                  Upload an ERP Work Order PDF for this active project. Saving a work order here will link it to <strong>all room checklist records</strong> across all towers in the project. It will be synced directly to the designated Google Drive Site Supervisor folder.
                </p>
              </div>

              {erpUploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-2 font-mono">
                  <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  <span>{erpUploadError}</span>
                </div>
              )}

              {/* Upload Interface */}
              <div className="bg-zinc-50/50 rounded-2xl border border-zinc-200 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                  <span className="text-xs font-bold text-zinc-700 uppercase tracking-tight flex items-center gap-1.5 font-mono">
                    Active SO: #{activeOaNo}
                  </span>
                  {googleToken ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Google Drive Sync Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] font-extrabold bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      Local-Only Mode
                    </span>
                  )}
                </div>

                {!googleToken && (
                  <div className="bg-amber-50/50 border border-amber-200/50 rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <p className="text-[10px] text-amber-850 font-semibold leading-relaxed">
                      Connect to Google Drive to automatically organize folders and upload this document directly into the supervisor folder.
                    </p>
                    <button
                      type="button"
                      onClick={handleConnectGoogle}
                      disabled={isUploadingErp}
                      className="w-full sm:w-auto px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-extrabold transition shrink-0 shadow-3xs cursor-pointer whitespace-nowrap disabled:opacity-50"
                    >
                      {isUploadingErp ? "Connecting..." : "🔗 Connect Google"}
                    </button>
                  </div>
                )}

                {/* Dropzone / Upload button */}
                {!activeErp ? (
                  <div className="border-2 border-dashed border-zinc-300 rounded-2xl p-8 text-center hover:bg-zinc-100/50 transition relative bg-white">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleErpPdfUpload}
                      disabled={isUploadingErp}
                      className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      id="erp-pdf-bulk-upload"
                    />
                    <div className="space-y-2">
                      <div className="inline-flex items-center justify-center p-3 bg-zinc-100 text-zinc-500 rounded-full border border-zinc-200 shadow-3xs">
                        <FileText className="w-6 h-6 text-indigo-500" />
                      </div>
                      <p className="text-sm font-bold text-zinc-800">
                        {isUploadingErp ? "Processing & Uploading..." : "Click or Drag to Upload ERP Work Order"}
                      </p>
                      <p className="text-xs text-zinc-400 font-semibold font-mono uppercase">PDF Format Only</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-3xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100 shrink-0">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-bold text-zinc-900 truncate font-mono">{activeErp.name}</p>
                        <p className="text-[10px] text-zinc-400 font-bold font-mono">
                          {activeErp.size} &bull; {activeErp.date}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 sm:self-center">
                      <a
                        href={activeErp.url}
                        download={activeErp.name}
                        className="p-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-650 hover:text-indigo-650 transition cursor-pointer shadow-3xs"
                        title="Download ERP PDF"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        onClick={handleRemoveErpPdf}
                        className="p-2 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-500 transition cursor-pointer shadow-3xs"
                        title="Remove Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Path display matching Supervisor Folder */}
                <div className="bg-zinc-150/40 p-3 rounded-xl border border-zinc-200/50 space-y-1">
                  <span className="block text-[9px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Target Drive Path:</span>
                  <p className="text-[10px] text-zinc-600 leading-normal font-mono">
                    📂 {oaNo4Digit === '4027' ? (
                      <>
                        <a href="https://drive.google.com/drive/u/0/folders/1xcRODlPVO19nbHIlbF3tomz1ruSnaRFz" target="_blank" rel="noopener noreferrer" className="text-indigo-650 font-extrabold hover:underline">4027 - Site Supervisor Folder</a> / ERP_Work_Order.pdf
                      </>
                    ) : (
                      <>
                        <a href="https://drive.google.com/drive/u/0/folders/133DwBuxmLdK9PozyOfJS8XkRrAxJxi8-" target="_blank" rel="noopener noreferrer" className="text-indigo-650 font-extrabold hover:underline">Google Drive (Shared Master)</a> / {oaNo4Digit} / {oaNo4Digit} - Site Supervisor Folder / ERP_Work_Order.pdf
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          )}
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

      {/* Custom Modal Confirmation for Clearing All History */}
      {confirmClearAllHistory && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-[2px] animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-zinc-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-650">
              <div className="p-2 bg-rose-50 rounded-xl border border-rose-100">
                <Trash2 className="w-5 h-5 text-rose-650" />
              </div>
              <h3 className="font-extrabold text-zinc-900 text-base leading-tight">Clear All Registry History?</h3>
            </div>
            
            <p className="text-xs text-zinc-500 leading-relaxed">
              Are you sure you want to permanently delete all registered Sales Orders from history? This action is absolutely irreversible and clears all saved projects.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (onClearHistory) onClearHistory();
                  setConfirmClearAllHistory(false);
                }}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs rounded-xl transition duration-150 shadow-sm cursor-pointer"
              >
                Yes, Clear All
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearAllHistory(false)}
                className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 font-bold text-xs rounded-xl border border-zinc-200 transition duration-150 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Modal Confirmation for Deleting a Single Project */}
      {projectToDelete && (
        <div className="fixed inset-0 z-55 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-[2px] animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-zinc-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-650">
              <div className="p-2 bg-rose-50 rounded-xl border border-rose-100">
                <Trash2 className="w-5 h-5 text-rose-650" />
              </div>
              <h3 className="font-extrabold text-zinc-900 text-base leading-tight">Delete Sales Order?</h3>
            </div>
            
            <p className="text-xs text-zinc-500 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-zinc-900 font-mono">#{projectToDelete}</span> and all its associated installation compliance records from history?
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  onDeleteProject(projectToDelete);
                  setProjectToDelete(null);
                }}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs rounded-xl transition duration-150 shadow-sm cursor-pointer"
              >
                Yes, Delete
              </button>
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
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
