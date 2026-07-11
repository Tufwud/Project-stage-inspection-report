import { useState, useEffect } from 'react';
import { FlatRecord, MilestoneKey, SavedProject, MILESTONES } from './types';
import { DEFAULT_FLATS, DOOR_MAP } from './data/mockData';
import { getProjectAnalysis } from './utils';
import { TufwudLogo } from './components/TufwudLogo';

// Import Components
import OverviewStats from './components/OverviewStats';
import MilestoneBreakdown from './components/MilestoneBreakdown';
import TowerFloorHeatmap from './components/TowerFloorHeatmap';
import FlatListTable from './components/FlatListTable';
import FlatDetailModal from './components/FlatDetailModal';
import CsvDataActions from './components/CsvDataActions';
import BackgroundValuesTab from './components/BackgroundValuesTab';
import GoogleSheetsTab from './components/GoogleSheetsTab';
import FinancialReportsTab from './components/FinancialReportsTab';

import { Building2, ClipboardCheck, LayoutDashboard, Plus, RefreshCw, Layers, Settings, FileSpreadsheet, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const LOCAL_STORAGE_KEY = "door_quality_compliance_dashboard_records";

const getOrdinalSuffix = (num: number) => {
  if (num % 10 === 1 && num % 100 !== 11) return 'st';
  if (num % 10 === 2 && num % 100 !== 12) return 'nd';
  if (num % 10 === 3 && num % 100 !== 13) return 'rd';
  return 'th';
};

export default function App() {
  const [flats, setFlats] = useState<FlatRecord[]>([]);
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneKey | null>(null);
  const [activeTab, setActiveTab] = useState<'matrix' | 'background' | 'sheets' | 'reports'>('matrix');
  
  // Historical Registry of Projects/Sales Orders
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);

  // Master Cost Structure for Opening Codes (A, B, C, D, etc. - Editable & Overwriteable)
  const [doorPrices, setDoorPrices] = useState<{ [code: string]: number }>({
    A: 5000,
    B: 5000,
    C: 5000,
    D: 5000,
    E: 5000,
    F: 5000,
    G: 5000,
    H: 5000,
    I: 5000,
    J: 5000
  });

  // Master custom names for Opening Codes (A to J - Editable & Overwriteable)
  const [doorNames, setDoorNames] = useState<{ [code: string]: string }>(() => {
    try {
      const saved = localStorage.getItem("door_quality_compliance_dashboard_door_names");
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      A: "Main Door (MD)",
      B: "Bedroom 1 (BR1)",
      C: "Bedroom 2 (BR2)",
      D: "Toilet 1 (T1)",
      E: "Toilet 2 (T2)",
      F: "Balcony",
      G: "NA",
      H: "NA",
      I: "NA",
      J: "NA"
    };
  });

  // Manage list of supervisors dynamically, persisting in localStorage
  const [supervisors, setSupervisors] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("door_quality_compliance_dashboard_supervisors");
      if (saved) {
        // Filter out Nagesh Yadav/Jadav to fulfill the user's specific removal request
        const list: string[] = JSON.parse(saved);
        return list.filter(s => s !== "Nagesh Yadav" && s !== "Nagesh Jadav");
      }
    } catch (e) {}
    return [
      "Aarif Taslim",
      "Vivek Laxman",
      "Sandip Vishwakarma",
      "Surya Pratap Singh",
      "Radheshyam",
      "Rahul Sharma",
      "Ramanpreet Singh",
      "Arunava Samadder",
      "Niranjan Das",
      "Indraj Meghwal"
    ];
  });

  const handleAddSupervisor = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setSupervisors(prev => {
      if (prev.includes(trimmed)) return prev;
      const updated = [...prev, trimmed];
      try {
        localStorage.setItem("door_quality_compliance_dashboard_supervisors", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleRemoveSupervisor = (name: string) => {
    setSupervisors(prev => {
      const updated = prev.filter(s => s !== name);
      try {
        localStorage.setItem("door_quality_compliance_dashboard_supervisors", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Grid filters
  const [selectedTower, setSelectedTower] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);

  // Editing modal state
  const [editingFlat, setEditingFlat] = useState<FlatRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // One-Time Project & Tower Configuration Generator based on user inputs
  const handleGenerateProject = (config: {
    salesOrderNo: string;
    soDetails?: string;
    numTowers: number;
    totalFloors: number;
    flatsPerFloor: number;
    doorTypesToGenerate: string[];
    doorPrices: { [code: string]: number };
    supervisor?: string;
    contractor?: string;
  }) => {
    // Sync current project to history first before overriding
    if (flats.length > 0) {
      syncCurrentToHistory(flats);
    }

    const generated: FlatRecord[] = [];

    const supervisorVal = config.supervisor?.trim() || "Aarif Taslim";
    const contractorVal = config.contractor?.trim() || "Prabir Dhol";

    // Calculate total openings: Multiplying Towers * Floors * Flats/Floor * Doors/Flat
    for (let t = 1; t <= config.numTowers; t++) {
      const towerId = `Tower ${String(t).padStart(2, '0')}`;
      
      for (let floor = 1; floor <= config.totalFloors; floor++) {
        const floorName = floor + getOrdinalSuffix(floor) + ' Floor';
        
        for (let flatIdx = 1; flatIdx <= config.flatsPerFloor; flatIdx++) {
          const flatNumber = floor * 100 + flatIdx;
          const flatNo = `${flatNumber}`;

          config.doorTypesToGenerate.forEach(doorCodeOrName => {
            // CONVERT CODE TO NAME (Lookup in doorNames then fallbacks)
            let realName = doorNames[doorCodeOrName] || DOOR_MAP[doorCodeOrName] || doorCodeOrName;

            const normName = realName.trim().toUpperCase();
            if (!realName.trim() || normName === 'NA' || normName === 'N/A' || normName === 'NOT APPLICABLE') {
              // Skip generating this unassigned/disabled opening code
              return;
            }

            // Retrieve the spec cost mapped to this opening code
            let price = config.doorPrices[doorCodeOrName];
            if (price === undefined) {
              const matchedCode = Object.keys(doorNames).find(code => doorNames[code] === realName)
                || Object.keys(DOOR_MAP).find(code => DOOR_MAP[code] === realName);
              if (matchedCode) {
                price = config.doorPrices[matchedCode];
              }
            }
            if (price === undefined) {
              price = 5000;
            }

            // Unique ID Format: OA/Tower/Floor/Flat/DoorName (exactly matching user's AppScript)
            const uniqueID = `${config.salesOrderNo}/${towerId}/${floorName}/${flatNumber}/${realName}`;

            generated.push({
              id: uniqueID,
              oaNo: config.salesOrderNo,
              soDetails: config.soDetails || '',
              towerId: towerId,
              flatsPerFloor: config.flatsPerFloor,
              floor: floor,
              flatNo: flatNo,
              doorName: realName,
              price: price,
              numTowers: config.numTowers,
              totalFloors: config.totalFloors,
              doorsPerFlat: config.doorTypesToGenerate.join(', '),
              frameFixing: { fastenerFixing: 'not_started', frameLockAreaFinish: 'not_started', outsideArchitraveFixing: 'not_started', insideArchitraveFixing: 'not_started', doneBy: supervisorVal, timestamp: "", contractor: contractorVal },
              doorFixing: { shutterEdgeFinishing: 'not_started', gapBetweenFrameAndShutter: 'not_started', iSealFixing: 'not_started', visionGlassBeatFinishing: 'not_started', doneBy: supervisorVal, timestamp: "", contractor: contractorVal },
              hardwareFixing: { hingeFitting: 'not_started', lockWithHandleFitting: 'not_started', eyeviewInstallation: 'not_started', towerBoltInstallation: 'not_started', doorCloserInstallation: 'not_started', autoDropSealInstallation: 'not_started', doneBy: supervisorVal, timestamp: "", contractor: contractorVal },
              painting: { frameCarpatchFillingSanding: 'not_started', frameTouchUp: 'not_started', shutterEdgeFinishing: 'not_started', lockSlotAreaFinishing: 'not_started', shutterTouchUp: 'not_started', timestamp: "", contractor: contractorVal, doneBy: supervisorVal },
              handover: { hardwareCleaning: 'not_started', plasticCoverRemoval: 'not_started', keysHandover: 'not_started', timestamp: "", contractor: contractorVal, doneBy: supervisorVal },
              supervisor: supervisorVal,
              contractor: contractorVal
            });
          });
        }
      }
    }

    // Apply any bulk contractor assignment rules automatically
    try {
      const savedRules = localStorage.getItem("door_quality_compliance_dashboard_contractor_rules");
      if (savedRules) {
        const rules = JSON.parse(savedRules);
        if (Array.isArray(rules) && rules.length > 0) {
          generated.forEach(flat => {
            const towerMatch = flat.towerId.match(/\d+/);
            const towerNum = towerMatch ? parseInt(towerMatch[0], 10) : 1;
            
            rules.forEach((rule: any) => {
              const isTowerInRange = towerNum >= rule.towerFrom && towerNum <= rule.towerTo;
              if (isTowerInRange) {
                const name = rule.contractorName?.trim();
                if (name) {
                  const stageIds = rule.stageIds || (rule.stageId ? [rule.stageId] : []);
                  if (stageIds.includes('any')) {
                    flat.frameFixing.contractor = name;
                    flat.doorFixing.contractor = name;
                    flat.hardwareFixing.contractor = name;
                    flat.painting.contractor = name;
                    flat.handover.contractor = name;
                    flat.contractor = name;
                  } else {
                    if (stageIds.includes('frameFixing')) {
                      flat.frameFixing.contractor = name;
                    }
                    if (stageIds.includes('doorFixing')) {
                      flat.doorFixing.contractor = name;
                    }
                    if (stageIds.includes('hardwareFixing')) {
                      flat.hardwareFixing.contractor = name;
                    }
                    if (stageIds.includes('painting')) {
                      flat.painting.contractor = name;
                    }
                    if (stageIds.includes('handover')) {
                      flat.handover.contractor = name;
                    }
                  }
                }
              }
            });
          });
        }
      }
    } catch (e) {
      // safe fallback
    }

    // Save newly generated flats
    saveFlats(generated, config.doorPrices, config.salesOrderNo);
  };

  const handleClearTower = (towerId: string) => {
    const untouched = flats.filter(f => f.towerId.toLowerCase() !== towerId.toLowerCase());
    saveFlats(untouched);
  };

  const handleUpdateDoorNamesAndPrices = (newNames: { [code: string]: string }, newPrices: { [code: string]: number }) => {
    setDoorNames(newNames);
    setDoorPrices(newPrices);
    try {
      localStorage.setItem("door_quality_compliance_dashboard_door_names", JSON.stringify(newNames));
      localStorage.setItem("door_quality_compliance_dashboard_door_prices", JSON.stringify(newPrices));
    } catch (e) {}

    // Align existing flats in the active project
    if (flats.length > 0) {
      const updatedFlats = flats.map(flat => {
        let matchedCode = "";
        for (const [code, oldName] of Object.entries(doorNames)) {
          if (flat.doorName === oldName) {
            matchedCode = code;
            break;
          }
        }
        
        let finalDoorName = flat.doorName;
        let finalPrice = flat.price;
        if (matchedCode) {
          finalDoorName = newNames[matchedCode] || flat.doorName;
          finalPrice = newPrices[matchedCode] ?? flat.price;
        }

        const normName = finalDoorName.trim().toUpperCase();
        if (!finalDoorName || normName === 'NA' || normName === 'N/A' || normName === 'NOT APPLICABLE') {
          return {
            ...flat,
            doorName: '',
            price: finalPrice
          };
        }

        const floorName = flat.floor + getOrdinalSuffix(flat.floor) + ' Floor';
        const newID = `${flat.oaNo}/${flat.towerId}/${floorName}/${flat.flatNo}/${finalDoorName}`;

        return {
          ...flat,
          id: newID,
          doorName: finalDoorName,
          price: finalPrice
        };
      });

      const seenIds = new Set<string>();
      const alignedFlats = updatedFlats.filter(f => {
        const normName = (f.doorName || '').trim().toUpperCase();
        if (!f.doorName || normName === 'NA' || normName === 'N/A' || normName === 'NOT APPLICABLE') {
          return false;
        }
        if (seenIds.has(f.id)) {
          return false;
        }
        seenIds.add(f.id);
        return true;
      });

      saveFlats(alignedFlats, newPrices);
    }
  };

  // Synchronize dynamic flats to history
  const syncCurrentToHistory = (currentFlats: FlatRecord[], currentPrices?: { [code: string]: number }, activeSOOveride?: string) => {
    if (currentFlats.length === 0) return;
    const activeSO = activeSOOveride || currentFlats[0]?.oaNo || "Unknown SO";
    const prices = currentPrices || doorPrices;

    setSavedProjects(prev => {
      const existingIdx = prev.findIndex(p => p.salesOrderNo === activeSO);
      
      const numTowers = new Set(currentFlats.map(f => f.towerId)).size;
      const totalFloors = Math.max(...currentFlats.map(f => f.floor), 0);
      const flatsPerFloor = currentFlats[0]?.flatsPerFloor || 4;
      const doorTypes = Array.from(new Set(currentFlats.map(f => f.doorName)));

      const updatedRecord: SavedProject = {
        salesOrderNo: activeSO,
        soDetails: currentFlats[0]?.soDetails || '',
        flats: currentFlats,
        timestamp: new Date().toISOString(),
        numTowers,
        totalFloors,
        flatsPerFloor,
        doorTypesToGenerate: doorTypes,
        doorPrices: prices
      };

      let updated: SavedProject[] = [];
      if (existingIdx > -1) {
        updated = [...prev];
        updated[existingIdx] = updatedRecord;
      } else {
        updated = [updatedRecord, ...prev];
      }

      try {
        localStorage.setItem("door_quality_compliance_dashboard_history", JSON.stringify(updated));
      } catch (err) {
        console.warn("Storage Quota Exceeded. Failed to write history to localStorage. Working with local state instead.", err);
      }
      return updated;
    });
  };

  // Switch/Load historical project to active screen
  const handleLoadProjectFromHistory = (soNo: string) => {
    // Sync current active project back into history first
    if (flats.length > 0) {
      syncCurrentToHistory(flats);
    }

    const target = savedProjects.find(p => p.salesOrderNo === soNo);
    if (target) {
      setFlats(target.flats);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(target.flats));
      } catch (e) {}

      if (target.doorPrices) {
        setDoorPrices(target.doorPrices);
        try {
          localStorage.setItem("door_quality_compliance_dashboard_door_prices", JSON.stringify(target.doorPrices));
        } catch (e) {}
      }

      // Clear layout filters
      setSelectedTower(null);
      setSelectedFloor(null);
    }
  };

  // Delete historical project from list
  const handleDeleteProjectFromHistory = (soNo: string) => {
    const updated = savedProjects.filter(p => p.salesOrderNo !== soNo);
    setSavedProjects(updated);
    try {
      localStorage.setItem("door_quality_compliance_dashboard_history", JSON.stringify(updated));
    } catch (e) {}

    // If deleting the active project, load the next available or clear active
    if (flats.length > 0 && flats[0]?.oaNo === soNo) {
      if (updated.length > 0) {
        const nextProj = updated[0];
        setFlats(nextProj.flats);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextProj.flats));
        } catch (e) {}
        if (nextProj.doorPrices) {
          setDoorPrices(nextProj.doorPrices);
          try {
            localStorage.setItem("door_quality_compliance_dashboard_door_prices", JSON.stringify(nextProj.doorPrices));
          } catch (e) {}
        }
      } else {
        setFlats([]);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([]));
        } catch (e) {}
      }
      setSelectedTower(null);
      setSelectedFloor(null);
    }
  };

  const handleClearAllHistory = () => {
    setSavedProjects([]);
    try {
      localStorage.setItem("door_quality_compliance_dashboard_history", JSON.stringify([]));
    } catch (e) {}
  };

  const handleImportProjects = (importedProjects: SavedProject[], activateSalesOrderNo?: string) => {
    setSavedProjects(prev => {
      const updated = [...prev];
      importedProjects.forEach(imp => {
        const idx = updated.findIndex(p => p.salesOrderNo === imp.salesOrderNo);
        if (idx > -1) {
          updated[idx] = {
            ...updated[idx],
            ...imp,
            flats: imp.flats
          };
        } else {
          updated.unshift(imp);
        }
      });
      try {
        localStorage.setItem("door_quality_compliance_dashboard_history", JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    if (activateSalesOrderNo) {
      const target = importedProjects.find(p => p.salesOrderNo === activateSalesOrderNo);
      if (target) {
        setFlats(target.flats);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(target.flats));
        } catch (e) {}
        if (target.doorPrices) {
          setDoorPrices(target.doorPrices);
          try {
            localStorage.setItem("door_quality_compliance_dashboard_door_prices", JSON.stringify(target.doorPrices));
          } catch (e) {}
        }
        setSelectedTower(null);
        setSelectedFloor(null);
      }
    }
  };

  // Load from local storage on mount
  useEffect(() => {
    let initialFlats: FlatRecord[] = [];
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        initialFlats = JSON.parse(saved);
        if (Array.isArray(initialFlats)) {
          const seenIds = new Set<string>();
          initialFlats = initialFlats.filter(flat => {
            const normName = (flat.doorName || '').trim().toUpperCase();
            if (!flat.doorName || normName === 'NA' || normName === 'N/A' || normName === 'NOT APPLICABLE') {
              return false;
            }
            if (seenIds.has(flat.id)) {
              return false;
            }
            seenIds.add(flat.id);
            return true;
          }).map(flat => {
            // Guarantee painting and handover properties exist to avoid backfire on historical records
            const clone = { ...flat };
            if (!clone.painting) {
              clone.painting = {
                frameCarpatchFillingSanding: 'not_started',
                frameTouchUp: 'not_started',
                shutterEdgeFinishing: 'not_started',
                lockSlotAreaFinishing: 'not_started',
                shutterTouchUp: 'not_started',
                timestamp: '',
                contractor: '',
                doneBy: ''
              };
            }
            if (!clone.handover) {
              clone.handover = {
                hardwareCleaning: 'not_started',
                plasticCoverRemoval: 'not_started',
                keysHandover: 'not_started',
                timestamp: '',
                contractor: '',
                doneBy: ''
              };
            }
            return clone;
          });
        }
        setFlats(initialFlats);
      } else {
        initialFlats = DEFAULT_FLATS;
        setFlats(DEFAULT_FLATS);
      }
    } catch (e) {
      initialFlats = DEFAULT_FLATS;
      setFlats(DEFAULT_FLATS);
    }

    try {
      const savedPrices = localStorage.getItem("door_quality_compliance_dashboard_door_prices");
      if (savedPrices) {
        setDoorPrices(JSON.parse(savedPrices));
      }
    } catch (e) {
      // safe fallback
    }

    // Load or initialize Saved Projects history registry
    try {
      const savedHistory = localStorage.getItem("door_quality_compliance_dashboard_history");
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);
        if (Array.isArray(parsedHistory)) {
          const cleanedHistory = parsedHistory.map((proj: SavedProject) => {
            const seenIds = new Set<string>();
            const cleanedFlats = (proj.flats || []).filter(flat => {
              const normName = (flat.doorName || '').trim().toUpperCase();
              if (!flat.doorName || normName === 'NA' || normName === 'N/A' || normName === 'NOT APPLICABLE') {
                return false;
              }
              if (seenIds.has(flat.id)) {
                return false;
              }
              seenIds.add(flat.id);
              return true;
            }).map(flat => {
              const clone = { ...flat };
              if (!clone.painting) {
                clone.painting = {
                  frameCarpatchFillingSanding: 'not_started',
                  frameTouchUp: 'not_started',
                  shutterEdgeFinishing: 'not_started',
                  lockSlotAreaFinishing: 'not_started',
                  shutterTouchUp: 'not_started',
                  timestamp: '',
                  contractor: '',
                  doneBy: ''
                };
              }
              if (!clone.handover) {
                clone.handover = {
                  hardwareCleaning: 'not_started',
                  plasticCoverRemoval: 'not_started',
                  keysHandover: 'not_started',
                  timestamp: '',
                  contractor: '',
                  doneBy: ''
                };
              }
              return clone;
            });
            return {
              ...proj,
              flats: cleanedFlats
            };
          });
          setSavedProjects(cleanedHistory);
        }
      } else {
        // Preinstall current loaded flats into the history registry
        const activeSO = initialFlats[0]?.oaNo || "OA-2026-9041";
        const dummyHistoryRecord: SavedProject = {
          salesOrderNo: activeSO,
          flats: initialFlats,
          timestamp: new Date().toISOString(),
          numTowers: 1,
          totalFloors: 3,
          flatsPerFloor: 4,
          doorTypesToGenerate: Array.from(new Set(initialFlats.map(f => f.doorName))),
          doorPrices: {
            A: 5000,
            B: 5000,
            C: 5000,
            D: 5000,
            E: 5000,
            F: 5000,
            G: 5000,
            H: 5000,
            I: 5000,
            J: 5000
          }
        };
        const initialHistoryList = [dummyHistoryRecord];
        setSavedProjects(initialHistoryList);
        localStorage.setItem("door_quality_compliance_dashboard_history", JSON.stringify(initialHistoryList));
      }
    } catch (e) {
      // safe fallback
    }
  }, []);

  // Save to local storage on changes
  const saveFlats = (newList: FlatRecord[], customPrices?: { [code: string]: number }, activeSOOveride?: string) => {
    setFlats(newList);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newList));
      if (newList.length > 0) {
        syncCurrentToHistory(newList, customPrices, activeSOOveride);
      }
    } catch (e) {
      // safe fallback
    }
  };


  // Stats calculation
  const projectAnalysis = getProjectAnalysis(flats);

  const handleSelectFlat = (flat: FlatRecord) => {
    setEditingFlat(flat);
    setIsModalOpen(true);
  };

  const handleAddNewFlat = () => {
    const defaultNew: FlatRecord = {
      id: `REC-${Date.now().toString().slice(-4)}`,
      oaNo: "OA-2026-9000",
      towerId: selectedTower || "Tower 01",
      flatsPerFloor: 4,
      floor: selectedFloor !== null ? selectedFloor : 1,
      flatNo: "",
      doorName: "Main Entrance (Teak Wood)",
      price: 5000,
      frameFixing: { fastenerFixing: 'not_started', frameLockAreaFinish: 'not_started', outsideArchitraveFixing: 'not_started', insideArchitraveFixing: 'not_started', doneBy: "Aarif Taslim", timestamp: "", contractor: "Prabir Dhol" },
      doorFixing: { shutterEdgeFinishing: 'not_started', gapBetweenFrameAndShutter: 'not_started', iSealFixing: 'not_started', visionGlassBeatFinishing: 'not_started', doneBy: "Aarif Taslim", timestamp: "", contractor: "Prabir Dhol" },
      hardwareFixing: { hingeFitting: 'not_started', lockWithHandleFitting: 'not_started', eyeviewInstallation: 'not_started', towerBoltInstallation: 'not_started', doorCloserInstallation: 'not_started', autoDropSealInstallation: 'not_started', doneBy: "Aarif Taslim", timestamp: "", contractor: "Prabir Dhol" },
      painting: { frameCarpatchFillingSanding: 'not_started', frameTouchUp: 'not_started', shutterEdgeFinishing: 'not_started', lockSlotAreaFinishing: 'not_started', shutterTouchUp: 'not_started', timestamp: "", contractor: "Prabir Dhol", doneBy: "Aarif Taslim" },
      handover: { hardwareCleaning: 'not_started', plasticCoverRemoval: 'not_started', keysHandover: 'not_started', timestamp: "", contractor: "Prabir Dhol", doneBy: "Aarif Taslim" }
    };

    setEditingFlat(defaultNew);
    setIsModalOpen(true);
  };

  const handleSaveFlat = (updated: FlatRecord) => {
    // If editing, locate via original editing ID to allow updating/regenerating the unique ID itself safely
    const originalId = editingFlat?.id || updated.id;
    const index = flats.findIndex(f => f.id === originalId);
    let updatedList: FlatRecord[] = [];
    
    // Dynamically regenerate ID to maintain strict structural integrity of the lookup keys
    const floorName = updated.floor + getOrdinalSuffix(updated.floor) + ' Floor';
    const cleanDoorName = updated.doorName || "Main Door (MD)";
    const newID = `${updated.oaNo || 'SO'}/${updated.towerId}/${floorName}/${updated.flatNo}/${cleanDoorName}`;
    
    const finalizedRecord = {
      ...updated,
      id: newID
    };
    
    if (index > -1) {
      // Edit
      updatedList = [...flats];
      updatedList[index] = finalizedRecord;
    } else {
      // Create new
      updatedList = [finalizedRecord, ...flats];
    }
    
    saveFlats(updatedList);
  };

  const handleBulkApproveFlat = (flatId: string) => {
    const updatedList = flats.map(flat => {
      if (flat.id !== flatId) return flat;
      const updated = { ...flat };
      
      const getLocalTimestamp = () => {
        const d = new Date();
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        const hr = String(d.getHours()).padStart(2, '0');
        const min = String(d.getMinutes()).padStart(2, '0');
        return `${day}/${month}/${year} ${hr}:${min}`;
      };
      
      const currentTimestamp = getLocalTimestamp();
      const currentSupervisor = supervisors[0] || "Aarif Taslim";
      
      MILESTONES.forEach(meta => {
        const milestoneKey = meta.key;
        if (milestoneKey === 'handover') {
          // Handover will not be flashfilled
          return;
        }
        const currentMilestone = { ...(updated[milestoneKey] || {}) } as any;
        
        Object.keys(meta.subtaskLabels).forEach(taskKey => {
          currentMilestone[taskKey] = 'approved';
        });
        
        if (!currentMilestone.doneBy) {
          currentMilestone.doneBy = currentSupervisor;
        }
        if (!currentMilestone.timestamp) {
          currentMilestone.timestamp = currentTimestamp;
        }
        
        updated[milestoneKey] = currentMilestone;
      });
      
      return updated;
    });
    
    saveFlats(updatedList);
  };

  const handleDeleteFlat = (id: string) => {
    const updatedList = flats.filter(f => f.id !== id);
    saveFlats(updatedList);
  };

  const handleDataImport = (importedList: FlatRecord[]) => {
    saveFlats(importedList);
  };

  const handleResetData = () => {
    saveFlats(DEFAULT_FLATS);
  };

  const handleWipeAll = () => {
    saveFlats([]);
  };

  const handleGridFilterChange = (tower: string | null, floor: number | null) => {
    setSelectedTower(tower);
    setSelectedFloor(floor);
  };

  const handleClearGridFilters = () => {
    setSelectedTower(null);
    setSelectedFloor(null);
  };

  return (
    <div className="bg-zinc-50 min-h-screen font-sans flex flex-col antialiased">
      
      {/* Prime Header Block */}
      <header className="bg-white border-b border-zinc-200 py-6 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 shrink-0 rounded-xl border border-zinc-200/80 shadow-2xs overflow-hidden bg-[#a14730]">
              <TufwudLogo className="w-full h-full" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 uppercase tracking-widest leading-none font-mono">
                  project-stage-inspection
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>
              <h1 className="text-2xl font-black text-zinc-900 tracking-tight">
                Project Stage Inspection
              </h1>
              <p className="text-xs text-zinc-500 font-medium font-sans">
                Dynamic tracking of installation completion stages, checkpoint checks, and quality compliance logs.
              </p>
            </div>
          </div>

          {/* Core overview meter */}
          <div className="flex items-center gap-4 bg-zinc-50 p-3 rounded-2xl border border-zinc-200/60 shadow-inner">
            <div className="space-y-0.5 text-right">
              <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider font-mono">Global Fulfillment</div>
              <div className="text-xs text-zinc-600 font-medium">
                {projectAnalysis.completedFlatsCount} of {projectAnalysis.totalFlats} Rooms Done
              </div>
            </div>
            
            <div className="relative flex items-center justify-center">
              <svg className="w-12 h-12 transform -rotate-90">
                <circle 
                  cx="24" cy="24" r="20" 
                  className="text-zinc-200" 
                  strokeWidth="3.5" stroke="currentColor" fill="transparent" 
                />
                <circle 
                  cx="24" cy="24" r="20" 
                  className="text-indigo-600 transition-all duration-700" 
                  strokeWidth="3.5" 
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  strokeDashoffset={`${2 * Math.PI * 20 * (1 - projectAnalysis.overallProgress / 100)}`}
                  strokeLinecap="round" stroke="currentColor" fill="transparent" 
                />
              </svg>
              <div className="absolute text-[11px] font-black font-mono text-zinc-800">
                {projectAnalysis.overallProgress}%
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Primary Dashboard Space */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
        
        {/* Modern Segmented Navigation Tabs */}
        <div className="grid grid-cols-2 sm:flex sm:flex-row items-center gap-1 border border-zinc-200/60 bg-white p-1 rounded-xl shadow-xs">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              activeTab === 'matrix'
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Compliance Grid</span>
          </button>
          
          <button
            onClick={() => setActiveTab('background')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              activeTab === 'background'
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
            }`}
          >
            <Settings className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate hidden xs:inline">Project Setup & Specs</span>
            <span className="truncate xs:hidden">Setup & Specs</span>
          </button>

          <button
            onClick={() => setActiveTab('sheets')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              activeTab === 'sheets'
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Sheets Sync</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center justify-center gap-1.5 py-2.5 px-2 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              activeTab === 'reports'
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
            }`}
          >
            <Coins className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Reports</span>
          </button>
        </div>

        {activeTab === 'matrix' ? (
          <div className="space-y-8">
            {/* Stage 1: KPI Panels */}
            <OverviewStats 
              analysis={projectAnalysis}
              onSelectMilestone={setSelectedMilestone}
              selectedMilestone={selectedMilestone}
            />

            {/* Stage 2: Spatial Floor/Tower Grid Matrix Heatmap */}
            <TowerFloorHeatmap 
              flats={flats}
              selectedTower={selectedTower}
              selectedFloor={selectedFloor}
              onFilterChange={handleGridFilterChange}
            />

            {/* Stage 3: Milestone Sub-checkpoint Rates & Insights */}
            <MilestoneBreakdown 
              analysis={projectAnalysis}
              selectedMilestone={selectedMilestone}
              onSelectMilestone={setSelectedMilestone}
            />

            {/* Stage 4: Interactive Room Openings Matrix Log Table */}
            <FlatListTable 
              flats={flats}
              onSelectFlat={handleSelectFlat}
              onAddNewFlat={handleAddNewFlat}
              selectedTower={selectedTower}
              selectedFloor={selectedFloor}
              selectedMilestoneFilter={selectedMilestone}
              onClearGridFilters={handleClearGridFilters}
              onBulkApproveFlat={handleBulkApproveFlat}
              onUpdateFlats={saveFlats}
            />

            {/* Stage 5: CSV Synchronization Operations */}
            <CsvDataActions 
              onDataImport={handleDataImport}
              onResetData={handleResetData}
              onWipeData={handleWipeAll}
              flats={flats}
            />
          </div>
        ) : activeTab === 'background' ? (
          <div className="pt-2 animate-fadeIn">
            <BackgroundValuesTab 
              flats={flats}
              onGenerateProject={handleGenerateProject}
              doorPrices={doorPrices}
              doorNames={doorNames}
              onUpdateDoorPrices={handleUpdateDoorNamesAndPrices}
              onUpdateFlats={(newList) => saveFlats(newList, doorPrices)}
              onClearTower={handleClearTower}
              onWipeAll={handleWipeAll}
              savedProjects={savedProjects}
              onLoadProject={handleLoadProjectFromHistory}
              onDeleteProject={handleDeleteProjectFromHistory}
              onClearHistory={handleClearAllHistory}
              supervisors={supervisors}
              onAddSupervisor={handleAddSupervisor}
              onRemoveSupervisor={handleRemoveSupervisor}
            />
          </div>
        ) : activeTab === 'sheets' ? (
          <div className="pt-2 animate-fadeIn">
            <GoogleSheetsTab 
              flats={flats} 
              savedProjects={savedProjects} 
              onImportProjects={handleImportProjects}
            />
          </div>
        ) : (
          <div className="pt-2 animate-fadeIn">
            <FinancialReportsTab flats={flats} />
          </div>
        )}

      </main>

      {/* Footer credits boundary */}
      <footer className="bg-white border-t border-zinc-200 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-zinc-400 text-xs font-semibold gap-4">
          <div>
            Door Quality Compliance Monitor System © 2026
          </div>
          <div className="flex items-center gap-1">
            <span>Engineering Status: </span>
            <span className="text-emerald-500 font-mono font-bold leading-none">● System Active</span>
          </div>
        </div>
      </footer>

      {/* Drawer Editor Panel Overlay */}
      <AnimatePresence>
        {isModalOpen && (
          <FlatDetailModal 
            flat={editingFlat}
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingFlat(null);
            }}
            onSave={handleSaveFlat}
            onDelete={handleDeleteFlat}
            supervisors={supervisors}
          />
        )}
      </AnimatePresence>
      
    </div>
  );
}
