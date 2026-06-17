import { useState, useEffect } from 'react';
import { FlatRecord, MilestoneKey } from './types';
import { DEFAULT_FLATS, DOOR_MAP } from './data/mockData';
import { getProjectAnalysis } from './utils';

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

export default function App() {
  const [flats, setFlats] = useState<FlatRecord[]>([]);
  const [selectedMilestone, setSelectedMilestone] = useState<MilestoneKey | null>(null);
  const [activeTab, setActiveTab] = useState<'matrix' | 'background' | 'sheets' | 'reports'>('matrix');
  
  // Grid filters
  const [selectedTower, setSelectedTower] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);

  // Editing modal state
  const [editingFlat, setEditingFlat] = useState<FlatRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Automatic Background Generator for Supervisors
  const handleGenerateFlats = (config: {
    salesOrderNo: string;
    towerId: string;
    totalFloors: number;
    flatsPerFloor: number;
    doorTypesToGenerate: string[];
    defaultPrice?: number;
  }) => {
    const generated: FlatRecord[] = [];
    
    const getOrdinalSuffix = (num: number) => {
      if (num % 10 === 1 && num % 100 !== 11) return 'st';
      if (num % 10 === 2 && num % 100 !== 12) return 'nd';
      if (num % 10 === 3 && num % 100 !== 13) return 'rd';
      return 'th';
    };

    const initialPrice = config.defaultPrice !== undefined ? config.defaultPrice : 5000;

    for (let floor = 1; floor <= config.totalFloors; floor++) {
      const floorName = floor + getOrdinalSuffix(floor) + ' Floor';
      
      for (let flatIdx = 1; flatIdx <= config.flatsPerFloor; flatIdx++) {
        const flatNumber = floor * 100 + flatIdx;
        const flatNo = `${flatNumber}`;

        config.doorTypesToGenerate.forEach(doorCodeOrName => {
          // CONVERT CODE TO NAME (Lookup in DOOR_MAP)
          const realName = DOOR_MAP[doorCodeOrName] || doorCodeOrName;

          // Unique ID Format: OA/Tower/Floor/Flat/DoorName (exactly matching user's AppScript)
          const uniqueID = `${config.salesOrderNo}/${config.towerId}/${floorName}/${flatNumber}/${realName}`;

          generated.push({
            id: uniqueID,
            oaNo: config.salesOrderNo,
            towerId: config.towerId,
            flatsPerFloor: config.flatsPerFloor,
            floor: floor,
            flatNo: flatNo,
            doorName: realName,
            price: initialPrice,
            frameFixing: { fastenerFixing: 'not_started', frameLockAreaFinish: 'not_started', outsideArchitraveFixing: 'not_started', insideArchitraveFixing: 'not_started', doneBy: "", timestamp: "" },
            doorFixing: { shutterEdgeFinishing: 'not_started', gapBetweenFrameAndShutter: 'not_started', iSealFixing: 'not_started', visionGlassBeatFinishing: 'not_started', doneBy: "", timestamp: "" },
            hardwareFixing: { hingeFitting: 'not_started', lockWithHandleFitting: 'not_started', eyeviewInstallation: 'not_started', towerBoltInstallation: 'not_started', doorCloserInstallation: 'not_started', autoDropSealInstallation: 'not_started', doneBy: "", timestamp: "" },
            handover: { frameCarpatchFillingSanding: 'not_started', frameTouchUp: 'not_started', shutterEdgeFinishing: 'not_started', lockSlotAreaFinishing: 'not_started', shutterTouchUp: 'not_started', hardwareCleaning: 'not_started', plasticCoverRemoval: 'not_started', keysHandover: 'not_started', timestamp: "" }
          });
        });
      }
    }

    // Replace entire tower setup if already exists or merge
    const untouched = flats.filter(f => f.towerId.toLowerCase() !== config.towerId.toLowerCase());
    saveFlats([...generated, ...untouched]);
  };

  const handleClearTower = (towerId: string) => {
    const untouched = flats.filter(f => f.towerId.toLowerCase() !== towerId.toLowerCase());
    saveFlats(untouched);
  };

  // Load from local storage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        setFlats(JSON.parse(saved));
      } else {
        setFlats(DEFAULT_FLATS);
      }
    } catch (e) {
      setFlats(DEFAULT_FLATS);
    }
  }, []);

  // Save to local storage on changes
  const saveFlats = (newList: FlatRecord[]) => {
    setFlats(newList);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newList));
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
      frameFixing: { fastenerFixing: 'not_started', frameLockAreaFinish: 'not_started', outsideArchitraveFixing: 'not_started', insideArchitraveFixing: 'not_started', doneBy: "", timestamp: "" },
      doorFixing: { shutterEdgeFinishing: 'not_started', gapBetweenFrameAndShutter: 'not_started', iSealFixing: 'not_started', visionGlassBeatFinishing: 'not_started', doneBy: "", timestamp: "" },
      hardwareFixing: { hingeFitting: 'not_started', lockWithHandleFitting: 'not_started', eyeviewInstallation: 'not_started', towerBoltInstallation: 'not_started', doorCloserInstallation: 'not_started', autoDropSealInstallation: 'not_started', doneBy: "", timestamp: "" },
      handover: { frameCarpatchFillingSanding: 'not_started', frameTouchUp: 'not_started', shutterEdgeFinishing: 'not_started', lockSlotAreaFinishing: 'not_started', shutterTouchUp: 'not_started', hardwareCleaning: 'not_started', plasticCoverRemoval: 'not_started', keysHandover: 'not_started', timestamp: "" }
    };

    setEditingFlat(defaultNew);
    setIsModalOpen(true);
  };

  const handleSaveFlat = (updated: FlatRecord) => {
    const index = flats.findIndex(f => f.id === updated.id);
    let updatedList: FlatRecord[] = [];
    
    if (index > -1) {
      // Edit
      updatedList = [...flats];
      updatedList[index] = updated;
    } else {
      // Create new
      // Check if ID was a temporary NEW indicator
      if (updated.id.startsWith('NEW') || !updated.id) {
        updated.id = `REC-${Date.now().toString().slice(-4)}`;
      }
      updatedList = [updated, ...flats];
    }
    
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
        <div className="flex items-center gap-1 border-b border-zinc-200 bg-white p-1 rounded-xl shadow-xs overflow-x-auto scrollbar-none whitespace-nowrap scroll-smooth">
          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2.5 px-3 sm:px-6 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer shrink-0 ${
              activeTab === 'matrix'
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
            }`}
          >
            <LayoutDashboard className="w-4 h-4 shrink-0" />
            <span>Compliance Matrix</span>
          </button>
          
          <button
            onClick={() => setActiveTab('background')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2.5 px-3 sm:px-6 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer shrink-0 ${
              activeTab === 'background'
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
            }`}
          >
            <Settings className="w-4 h-4 shrink-0" />
            <span>Background Settings</span>
          </button>

          <button
            onClick={() => setActiveTab('sheets')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2.5 px-3 sm:px-6 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer shrink-0 ${
              activeTab === 'sheets'
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span>Google Sheets Sync</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2.5 px-3 sm:px-6 text-[11px] sm:text-xs font-bold uppercase tracking-wider rounded-lg transition-all cursor-pointer shrink-0 ${
              activeTab === 'reports'
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
            }`}
          >
            <Coins className="w-4 h-4 shrink-0" />
            <span>Financial Costing & Reports</span>
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
              onGenerateFlats={handleGenerateFlats}
              onClearTower={handleClearTower}
              onWipeAll={handleWipeAll}
            />
          </div>
        ) : activeTab === 'sheets' ? (
          <div className="pt-2 animate-fadeIn">
            <GoogleSheetsTab flats={flats} />
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
          />
        )}
      </AnimatePresence>
      
    </div>
  );
}
