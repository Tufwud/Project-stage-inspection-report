import React, { useState } from 'react';
import { FlatRecord } from '../types';
import { 
  getFlatBasePrice, 
  getFlatTotalCompletedCost, 
  getFinancialStageEarned, 
  getFinancialStageProgress,
  FINANCIAL_STAGES 
} from '../utils';
import { 
  DollarSign, 
  Download, 
  FileSpreadsheet, 
  Search, 
  Layers, 
  CheckCircle2, 
  Building, 
  Coins, 
  Filter, 
  ArrowUpDown 
} from 'lucide-react';

interface FinancialReportsTabProps {
  flats: FlatRecord[];
}

type SortField = 'id' | 'flatNo' | 'price' | 'earned' | 'progress';
type SortOrder = 'asc' | 'desc';

export default function FinancialReportsTab({ flats }: FinancialReportsTabProps) {
  // State for Report A (Detailed Door List) Filtering and Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTower, setSelectedTower] = useState('All');
  const [selectedFloor, setSelectedFloor] = useState('All');
  const [sortField, setSortField] = useState<SortField>('flatNo');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Contractor stage-wise state filters for Detailed report
  const [contractorSearch, setContractorSearch] = useState('');
  const [contractorStage, setContractorStage] = useState<'any' | 'frameFixing' | 'doorFixing' | 'hardwareFixing' | 'handover'>('any');

  if (flats.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-zinc-200 p-12 text-center max-w-lg mx-auto shadow-md space-y-6">
        <div className="w-16 h-16 bg-zinc-50 border border-zinc-100 rounded-2xl flex items-center justify-center mx-auto text-zinc-400">
          <Building className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="font-extrabold text-lg text-zinc-900 tracking-tight">No Financial Data Available</h3>
          <p className="text-sm text-zinc-500 leading-relaxed font-medium">
            Generate tower slots or import checklist spreadsheet parameters first from the Background settings panel to perform real-time costing computations.
          </p>
        </div>
      </div>
    );
  }

  // List of unique towers and floors for filters
  const uniqueTowers = Array.from(new Set(flats.map(f => f.towerId)));
  const uniqueFloors = Array.from(new Set(flats.map(f => f.floor))).sort((a, b) => a - b);

  // Group current loaded data to gather Tower stats (Report B & C)
  const getTowerStats = () => {
    const stats: { 
      [towerId: string]: { 
        towerName: string;
        totalDoors: number;
        completedDoors: number;
        totalProgressSum: number;
        totalBudget: number;
        totalEarned: number;
        stageEarnedSums: { [stageId: string]: number };
      } 
    } = {};

    flats.forEach(flat => {
      const towerId = flat.towerId;
      const basePrice = getFlatBasePrice(flat);
      const completedCost = getFlatTotalCompletedCost(flat);
      
      const frameDone = flat.frameFixing.fastenerFixing && flat.frameFixing.frameLockAreaFinish && flat.frameFixing.outsideArchitraveFixing && flat.frameFixing.insideArchitraveFixing;
      const doorDone = flat.doorFixing.shutterEdgeFinishing && flat.doorFixing.gapBetweenFrameAndShutter && flat.doorFixing.iSealFixing && flat.doorFixing.visionGlassBeatFinishing;
      const hwDone = flat.hardwareFixing.hingeFitting && flat.hardwareFixing.lockWithHandleFitting && flat.hardwareFixing.eyeviewInstallation && flat.hardwareFixing.towerBoltInstallation && flat.hardwareFixing.doorCloserInstallation && flat.hardwareFixing.autoDropSealInstallation;
      const handoverDone = flat.handover.frameCarpatchFillingSanding && flat.handover.frameTouchUp && flat.handover.shutterEdgeFinishing && flat.handover.lockSlotAreaFinishing && flat.handover.shutterTouchUp && flat.handover.hardwareCleaning && flat.handover.plasticCoverRemoval && flat.handover.keysHandover;
      
      const isCompleted = frameDone && doorDone && hwDone && handoverDone;

      if (!stats[towerId]) {
        // Initialize stages map
        const initialStages: { [stageId: string]: number } = {};
        FINANCIAL_STAGES.forEach(s => {
          initialStages[s.id] = 0;
        });

        stats[towerId] = {
          towerName: towerId,
          totalDoors: 0,
          completedDoors: 0,
          totalProgressSum: 0,
          totalBudget: 0,
          totalEarned: 0,
          stageEarnedSums: initialStages
        };
      }

      stats[towerId].totalDoors += 1;
      if (isCompleted) {
        stats[towerId].completedDoors += 1;
      }
      
      // We calculate overall progress by average check-point completeness
      let activeChecks = 0;
      activeChecks += Number(flat.frameFixing.fastenerFixing) + Number(flat.frameFixing.frameLockAreaFinish) + Number(flat.frameFixing.outsideArchitraveFixing) + Number(flat.frameFixing.insideArchitraveFixing);
      activeChecks += Number(flat.doorFixing.shutterEdgeFinishing) + Number(flat.doorFixing.gapBetweenFrameAndShutter) + Number(flat.doorFixing.iSealFixing) + Number(flat.doorFixing.visionGlassBeatFinishing);
      activeChecks += Number(flat.hardwareFixing.hingeFitting) + Number(flat.hardwareFixing.lockWithHandleFitting) + Number(flat.hardwareFixing.eyeviewInstallation) + Number(flat.hardwareFixing.towerBoltInstallation) + Number(flat.hardwareFixing.doorCloserInstallation) + Number(flat.hardwareFixing.autoDropSealInstallation);
      activeChecks += Number(flat.handover.frameCarpatchFillingSanding) + Number(flat.handover.frameTouchUp) + Number(flat.handover.shutterEdgeFinishing) + Number(flat.handover.lockSlotAreaFinishing) + Number(flat.handover.shutterTouchUp) + Number(flat.handover.hardwareCleaning) + Number(flat.handover.plasticCoverRemoval) + Number(flat.handover.keysHandover);
      
      const progressPct = Math.round((activeChecks / 22) * 100);
      stats[towerId].totalProgressSum += progressPct;
      stats[towerId].totalBudget += basePrice;
      stats[towerId].totalEarned += completedCost;

      // Accumulate stages pricing split
      FINANCIAL_STAGES.forEach(stage => {
        const earned = getFinancialStageEarned(flat, stage.id);
        stats[towerId].stageEarnedSums[stage.id] += earned;
      });
    });

    return Object.values(stats);
  };

  const projectTowerSummaries = getTowerStats();

  // Grand totals across all projects
  const grandTotalDoors = projectTowerSummaries.reduce((sum, s) => sum + s.totalDoors, 0);
  const grandCompletedDoors = projectTowerSummaries.reduce((sum, s) => sum + s.completedDoors, 0);
  const grandBudget = projectTowerSummaries.reduce((sum, s) => sum + s.totalBudget, 0);
  const grandEarned = projectTowerSummaries.reduce((sum, s) => sum + s.totalEarned, 0);
  const grandFinancialProgress = grandBudget > 0 ? Math.round((grandEarned / grandBudget) * 100) : 0;

  const grandStageEarned: { [stageId: string]: number } = {};
  FINANCIAL_STAGES.forEach(stage => {
    grandStageEarned[stage.id] = projectTowerSummaries.reduce((sum, s) => sum + s.stageEarnedSums[stage.id], 0);
  });

  // Handle Sort for Detailed List (Report A)
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Filter and sort detailed records list (Report A)
  const filteredAndSortedFlats = flats
    .filter(flat => {
      const matchSearch = 
        flat.flatNo.toLowerCase().includes(searchTerm.toLowerCase()) || 
        flat.doorName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        flat.oaNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        flat.id.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchTower = selectedTower === 'All' || flat.towerId === selectedTower;
      const matchFloor = selectedFloor === 'All' || flat.floor === parseInt(selectedFloor);

      let matchContractor = true;
      if (contractorSearch.trim()) {
        const q = contractorSearch.toLowerCase();
        if (contractorStage === 'any') {
          const c1 = (flat.frameFixing?.contractor || '').toLowerCase();
          const c2 = (flat.doorFixing?.contractor || '').toLowerCase();
          const c3 = (flat.hardwareFixing?.contractor || '').toLowerCase();
          const c4 = (flat.handover?.contractor || '').toLowerCase();
          matchContractor = c1.includes(q) || c2.includes(q) || c3.includes(q) || c4.includes(q);
        } else {
          const targetSection = flat[contractorStage];
          const stageC = (targetSection?.contractor || '').toLowerCase();
          matchContractor = stageC.includes(q);
        }
      }

      return matchSearch && matchTower && matchFloor && matchContractor;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortField === 'id') {
        comparison = a.id.localeCompare(b.id);
      } else if (sortField === 'flatNo') {
        // Human-friendly natural sorting for flat numbers
        comparison = a.flatNo.localeCompare(b.flatNo, undefined, { numeric: true, sensitivity: 'base' });
      } else if (sortField === 'price') {
        comparison = getFlatBasePrice(a) - getFlatBasePrice(b);
      } else if (sortField === 'earned') {
        comparison = getFlatTotalCompletedCost(a) - getFlatTotalCompletedCost(b);
      } else if (sortField === 'progress') {
        // Recalculate percent count for sorting
        let aChecks = 0, bChecks = 0;
        aChecks += Number(a.frameFixing.fastenerFixing) + Number(a.frameFixing.frameLockAreaFinish) + Number(a.frameFixing.outsideArchitraveFixing) + Number(a.frameFixing.insideArchitraveFixing);
        aChecks += Number(a.doorFixing.shutterEdgeFinishing) + Number(a.doorFixing.gapBetweenFrameAndShutter) + Number(a.doorFixing.iSealFixing) + Number(a.doorFixing.visionGlassBeatFinishing);
        aChecks += Number(a.hardwareFixing.hingeFitting) + Number(a.hardwareFixing.lockWithHandleFitting) + Number(a.hardwareFixing.eyeviewInstallation) + Number(a.hardwareFixing.towerBoltInstallation) + Number(a.hardwareFixing.doorCloserInstallation) + Number(a.hardwareFixing.autoDropSealInstallation);
        aChecks += Number(a.handover.frameCarpatchFillingSanding) + Number(a.handover.frameTouchUp) + Number(a.handover.shutterEdgeFinishing) + Number(a.handover.lockSlotAreaFinishing) + Number(a.handover.shutterTouchUp) + Number(a.handover.hardwareCleaning) + Number(a.handover.plasticCoverRemoval) + Number(a.handover.keysHandover);
        
        bChecks += Number(b.frameFixing.fastenerFixing) + Number(b.frameFixing.frameLockAreaFinish) + Number(b.frameFixing.outsideArchitraveFixing) + Number(b.frameFixing.insideArchitraveFixing);
        bChecks += Number(b.doorFixing.shutterEdgeFinishing) + Number(b.doorFixing.gapBetweenFrameAndShutter) + Number(b.doorFixing.iSealFixing) + Number(b.doorFixing.visionGlassBeatFinishing);
        bChecks += Number(b.hardwareFixing.hingeFitting) + Number(b.hardwareFixing.lockWithHandleFitting) + Number(b.hardwareFixing.eyeviewInstallation) + Number(b.hardwareFixing.towerBoltInstallation) + Number(b.hardwareFixing.doorCloserInstallation) + Number(b.hardwareFixing.autoDropSealInstallation);
        bChecks += Number(b.handover.frameCarpatchFillingSanding) + Number(b.handover.frameTouchUp) + Number(b.handover.shutterEdgeFinishing) + Number(b.handover.lockSlotAreaFinishing) + Number(b.handover.shutterTouchUp) + Number(b.handover.hardwareCleaning) + Number(b.handover.plasticCoverRemoval) + Number(b.handover.keysHandover);
        
        comparison = aChecks - bChecks;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const filteredBudgetSum = filteredAndSortedFlats.reduce((sum, f) => sum + getFlatBasePrice(f), 0);
  const filteredEarnedSum = filteredAndSortedFlats.reduce((sum, f) => sum + getFlatTotalCompletedCost(f), 0);

  // Helper function to export Report A (Doors list) to CSV/Excel
  const handleExportDoorsReport = () => {
    const csvRows = [
      ['DETAILED DOOR CHECKLIST AND COSTING REPORT'],
      ['Generated:', new Date().toLocaleString()],
      ['Filters applied:', `Tower: ${selectedTower}`, `Floor: ${selectedFloor}`],
      [],
      ['Ref ID', 'Sales OA No', 'Tower Name', 'Floor Location', 'Flat No', 'Door Specification', 'Contract Price (INR)', 'Completion Rate (%)', 'Earned Amount (INR)', 'Outstanding Checklist Tasks']
    ];

    filteredAndSortedFlats.forEach(flat => {
      // Find open checklists count
      let checks = 22;
      checks -= Number(flat.frameFixing.fastenerFixing) + Number(flat.frameFixing.frameLockAreaFinish) + Number(flat.frameFixing.outsideArchitraveFixing) + Number(flat.frameFixing.insideArchitraveFixing);
      checks -= Number(flat.doorFixing.shutterEdgeFinishing) + Number(flat.doorFixing.gapBetweenFrameAndShutter) + Number(flat.doorFixing.iSealFixing) + Number(flat.doorFixing.visionGlassBeatFinishing);
      checks -= Number(flat.hardwareFixing.hingeFitting) + Number(flat.hardwareFixing.lockWithHandleFitting) + Number(flat.hardwareFixing.eyeviewInstallation) + Number(flat.hardwareFixing.towerBoltInstallation) + Number(flat.hardwareFixing.doorCloserInstallation) + Number(flat.hardwareFixing.autoDropSealInstallation);
      checks -= Number(flat.handover.frameCarpatchFillingSanding) + Number(flat.handover.frameTouchUp) + Number(flat.handover.shutterEdgeFinishing) + Number(flat.handover.lockSlotAreaFinishing) + Number(flat.handover.shutterTouchUp) + Number(flat.handover.hardwareCleaning) + Number(flat.handover.plasticCoverRemoval) + Number(flat.handover.keysHandover);
      
      let activeChecksDone = 22 - checks;
      const progress = Math.round((activeChecksDone / 22) * 100);

      csvRows.push([
        flat.id,
        flat.oaNo,
        flat.towerId,
        flat.floor.toString(),
        flat.flatNo,
        flat.doorName,
        getFlatBasePrice(flat).toString(),
        `${progress}%`,
        getFlatTotalCompletedCost(flat).toString(),
        checks.toString()
      ]);
    });

    // Add Sum Total Row at the bottom
    csvRows.push([]);
    csvRows.push(['TOTALS', '', '', '', '', `${filteredAndSortedFlats.length} Checklists`, filteredBudgetSum.toString(), `${filteredAndSortedFlats.length > 0 ? Math.round((filteredEarnedSum / filteredBudgetSum) * 100) : 0}%`, filteredEarnedSum.toString()]);

    downloadCSVFile(csvRows, `door_costing_detailed_report_${selectedTower}.csv`);
  };

  // Helper function to export Report B (Towers Summary) to CSV/Excel
  const handleExportTowersReport = () => {
    const csvRows = [
      ['PROJECT TOWERS COMPLIANCE AND COST SUMMARY'],
      ['Generated:', new Date().toLocaleString()],
      [],
      ['Project/Tower Name', 'Total Setup Doors', 'Completed 100% Doors', 'Avg Opening Completion (%)', 'Total Project Budget (INR)', 'Completed Project Cost / Earned Amount (INR)', 'Financial Delivery Rate (%)', 'Unbilled Target Variance (INR)']
    ];

    projectTowerSummaries.forEach(t => {
      const avgProgress = Math.round(t.totalProgressSum / t.totalDoors);
      const deliveryRate = t.totalBudget > 0 ? Math.round((t.totalEarned / t.totalBudget) * 100) : 0;
      const variance = t.totalBudget - t.totalEarned;
      csvRows.push([
        t.towerName,
        t.totalDoors.toString(),
        t.completedDoors.toString(),
        `${avgProgress}%`,
        t.totalBudget.toString(),
        t.totalEarned.toString(),
        `${deliveryRate}%`,
        variance.toString()
      ]);
    });

    csvRows.push([]);
    csvRows.push([
      'GRAND TOTAL',
      grandTotalDoors.toString(),
      grandCompletedDoors.toString(),
      `${grandTotalDoors > 0 ? Math.round(projectTowerSummaries.reduce((sum, s) => sum + s.totalProgressSum, 0) / grandTotalDoors) : 0}%`,
      grandBudget.toString(),
      grandEarned.toString(),
      `${grandFinancialProgress}%`,
      (grandBudget - grandEarned).toString()
    ]);

    downloadCSVFile(csvRows, `project_tower_costing_summary.csv`);
  };

  // Helper function to export Report C (Stage-wise Cost Breakdown) to CSV/Excel
  const handleExportStagesReport = () => {
    const stageHeaderCols = FINANCIAL_STAGES.map(s => `${s.label} Earned Cost (INR)`);
    const csvRows = [
      ['PROJECT STAGE-WISE BREAKDOWN COSTING MATRIX'],
      ['Generated:', new Date().toLocaleString()],
      [],
      ['Project Tower', 'Total Unit Doors', ...stageHeaderCols, 'Grand Earned Cost (INR)', 'Delivery %']
    ];

    projectTowerSummaries.forEach(t => {
      const stageVals = FINANCIAL_STAGES.map(s => t.stageEarnedSums[s.id].toString());
      const deliveryPct = t.totalBudget > 0 ? Math.round((t.totalEarned / t.totalBudget) * 100) : 0;
      csvRows.push([
        t.towerName,
        t.totalDoors.toString(),
        ...stageVals,
        t.totalEarned.toString(),
        `${deliveryPct}%`
      ]);
    });

    // Add Grand Total row
    const grandStageVals = FINANCIAL_STAGES.map(s => grandStageEarned[s.id].toString());
    csvRows.push([]);
    csvRows.push([
      'GRAND TOTALS',
      grandTotalDoors.toString(),
      ...grandStageVals,
      grandEarned.toString(),
      `${grandFinancialProgress}%`
    ]);

    downloadCSVFile(csvRows, `project_stagewise_breakdown_costing.csv`);
  };

  // Safe file downloader
  const downloadCSVFile = (rows: string[][], filename: string) => {
    const content = rows.map(r => r.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 select-none">
      
      {/* 1. REPORT C / EXECUTIVE SUMMARY BENTO DECK */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs flex items-center gap-4.5">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Accumulated Budget</span>
            <span className="text-xl font-black text-zinc-900 font-mono tracking-tight">
              ₹{grandBudget.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs flex items-center gap-4.5">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Earned Realized Cost</span>
            <span className="text-xl font-black text-emerald-650 font-mono tracking-tight">
              ₹{grandEarned.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs flex items-center gap-4.5">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Financial Ratio</span>
            <span className="text-xl font-black text-amber-650 font-mono tracking-tight">
              {grandFinancialProgress}%
            </span>
          </div>
        </div>

        <div className="bg-white border border-zinc-200/80 rounded-2xl p-5 shadow-xs flex items-center gap-4.5">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Unfinished Headroom</span>
            <span className="text-xl font-black text-zinc-800 font-mono tracking-tight">
              ₹{(grandBudget - grandEarned).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* REPORT C: STAGE-WISE BREAKDOWN MATRIX */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50/20">
          <div className="space-y-1">
            <h3 className="font-bold text-sm sm:text-base text-zinc-900 tracking-tight flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 bg-zinc-200 rounded text-[11px] font-bold font-mono text-zinc-650 uppercase">REPORT C</span>
              <span>Stage-wise Completed Cost (Project Towers)</span>
            </h3>
            <p className="text-xs text-zinc-500 font-medium font-sans">Reconciles progressive payouts splitting contractual price per task milestones.</p>
          </div>
          <button
            onClick={handleExportStagesReport}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-zinc-850 hover:bg-black text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Download Excel Matrix</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-100/60 text-zinc-500 font-bold uppercase border-b border-zinc-200 text-[10px] tracking-wider">
                <th className="px-6 py-3.5">Project Tower</th>
                <th className="px-4 py-3.5 text-center">Doors</th>
                {FINANCIAL_STAGES.map(stage => (
                  <th key={stage.id} className="px-4 py-3.5 text-right font-mono">
                    {stage.label} ({stage.pct}%)
                  </th>
                ))}
                <th className="px-6 py-3.5 text-right font-bold text-zinc-800">Total Earned</th>
                <th className="px-6 py-3.5 text-center">Ratio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 font-medium text-zinc-700">
              {projectTowerSummaries.map(t => {
                const deliveryPct = t.totalBudget > 0 ? Math.round((t.totalEarned / t.totalBudget) * 100) : 0;
                return (
                  <tr key={t.towerName} className="hover:bg-zinc-50/50 transition">
                    <td className="px-6 py-4 font-bold text-zinc-950">{t.towerName}</td>
                    <td className="px-4 py-4 text-center text-zinc-500 font-mono">{t.totalDoors}</td>
                    {FINANCIAL_STAGES.map(s => (
                      <td key={s.id} className="px-4 py-4 text-right font-mono text-zinc-600">
                        ₹{t.stageEarnedSums[s.id].toLocaleString('en-IN')}
                      </td>
                    ))}
                    <td className="px-6 py-4 text-right font-bold font-mono text-emerald-650">
                      ₹{t.totalEarned.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded-sm font-bold text-[10px] font-mono border border-emerald-100">
                        {deliveryPct}%
                      </span>
                    </td>
                  </tr>
                );
              })}
              
              {/* Grand Total Row */}
              <tr className="bg-zinc-100/50 font-black text-zinc-900 border-t-2 border-zinc-200">
                <td className="px-6 py-4.5 font-black uppercase text-zinc-900">GRAND TOTALS</td>
                <td className="px-4 py-4.5 text-center font-mono">{grandTotalDoors}</td>
                {FINANCIAL_STAGES.map(stage => (
                  <td key={stage.id} className="px-4 py-4.5 text-right font-mono">
                    ₹{grandStageEarned[stage.id].toLocaleString('en-IN')}
                  </td>
                ))}
                <td className="px-6 py-4.5 text-right font-mono text-emerald-700 text-sm font-black">
                  ₹{grandEarned.toLocaleString('en-IN')}
                </td>
                <td className="px-6 py-4.5 text-center">
                  <span className="px-2.5 py-0.5 bg-indigo-600 text-white rounded-full font-black text-[10px] font-mono">
                    {grandFinancialProgress}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. REPORT B: PROJECT COMPLIANCE AND COST SUMMARY */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50/20">
          <div className="space-y-1">
            <h3 className="font-bold text-sm sm:text-base text-zinc-900 tracking-tight flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 bg-zinc-200 rounded text-[11px] font-bold font-mono text-zinc-650 uppercase">REPORT B</span>
              <span>Completed Project / Tower Cost Summary</span>
            </h3>
            <p className="text-xs text-zinc-500 font-medium font-sans">Core aggregates illustrating total budgets face-to-face with work certified payout values.</p>
          </div>
          <button
            onClick={handleExportTowersReport}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-zinc-850 hover:bg-black text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Download Summary Excel</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-100/60 text-zinc-500 font-bold uppercase border-b border-zinc-200 text-[10px] tracking-wider">
                <th className="px-6 py-3.5">Segment Tower</th>
                <th className="px-4 py-3.5 text-center">Total Openings</th>
                <th className="px-4 py-3.5 text-center">100% Handed Over</th>
                <th className="px-4 py-3.5 text-center">Work Handover %</th>
                <th className="px-6 py-3.5 text-right font-mono">Total Budget (INR)</th>
                <th className="px-6 py-3.5 text-right font-mono">Realized Earned (INR)</th>
                <th className="px-6 py-3.5 text-center">Variance (INR)</th>
                <th className="px-6 py-3.5 text-center">Financial Delivery %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 font-medium text-zinc-700">
              {projectTowerSummaries.map(t => {
                const avgProgress = Math.round(t.totalProgressSum / t.totalDoors);
                const deliveryRate = t.totalBudget > 0 ? Math.round((t.totalEarned / t.totalBudget) * 100) : 0;
                const variance = t.totalBudget - t.totalEarned;
                return (
                  <tr key={t.towerName} className="hover:bg-zinc-50/50 transition">
                    <td className="px-6 py-4 font-bold text-zinc-950 flex items-center gap-2">
                      <Building className="w-4 h-4 text-zinc-400 shrink-0" />
                      <span>{t.towerName}</span>
                    </td>
                    <td className="px-4 py-4 text-center text-zinc-500 font-mono">{t.totalDoors} units</td>
                    <td className="px-4 py-4 text-center font-bold text-emerald-600 font-mono">{t.completedDoors} units</td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-mono text-zinc-600">{avgProgress}%</span>
                        <div className="w-12 h-2 bg-zinc-100 rounded-full overflow-hidden shrink-0 hidden md:block">
                          <div className="h-full bg-indigo-650" style={{ width: `${avgProgress}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-zinc-900 font-semibold">
                      ₹{t.totalBudget.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-emerald-650 font-bold">
                      ₹{t.totalEarned.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-zinc-500">
                      ₹{variance.toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="px-2.5 py-0.5 bg-zinc-900 text-white rounded-md font-bold text-[10px] font-mono whitespace-nowrap">
                        {deliveryRate}% Complete
                      </span>
                    </td>
                  </tr>
                );
              })}

              <tr className="bg-zinc-100/50 font-black text-zinc-900 border-t-2 border-zinc-200">
                <td className="px-6 py-4.5 font-black uppercase text-zinc-900">GRAND SUMMARY</td>
                <td className="px-4 py-4.5 text-center font-mono">{grandTotalDoors} units</td>
                <td className="px-4 py-4.5 text-center font-bold text-emerald-700 font-mono">{grandCompletedDoors} units</td>
                <td className="px-4 py-4.5 text-center font-mono font-bold">
                  {grandTotalDoors > 0 ? Math.round(projectTowerSummaries.reduce((sum, s) => sum + s.totalProgressSum, 0) / grandTotalDoors) : 0}% Avg
                </td>
                <td className="px-6 py-4.5 text-right font-mono text-zinc-950 text-sm">
                  ₹{grandBudget.toLocaleString('en-IN')}
                </td>
                <td className="px-6 py-4.5 text-right font-mono text-emerald-700 text-sm">
                  ₹{grandEarned.toLocaleString('en-IN')}
                </td>
                <td className="px-6 py-4.5 text-right font-mono text-zinc-500">
                  ₹{(grandBudget - grandEarned).toLocaleString('en-IN')}
                </td>
                <td className="px-6 py-4.5 text-center">
                  <span className="px-3 py-1 bg-emerald-600 text-white rounded-full font-black text-[10px] font-mono">
                    {grandFinancialProgress}% REALIZED
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. REPORT A: DETAILED DOOR-LEVEL CHECKLISTS & COSTING REPORT */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        <div className="px-4 py-4 sm:px-6 sm:py-5 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50/20">
          <div className="space-y-1">
            <h3 className="font-bold text-sm sm:text-base text-zinc-900 tracking-tight flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 bg-zinc-200 rounded text-[11px] font-bold font-mono text-zinc-650 uppercase">REPORT A</span>
              <span>Door-level Checklist & Cost Details</span>
            </h3>
            <p className="text-xs text-zinc-500 font-medium font-sans">Granular lookup of compliance state matched with assigned pricing values for every opening.</p>
          </div>
          <button
            onClick={handleExportDoorsReport}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-zinc-850 hover:bg-black text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Download Doors Excel</span>
          </button>
        </div>

        {/* Search & Filtration Bar */}
        <div className="px-4 py-4 sm:px-6 sm:py-4 border-b border-zinc-200 bg-zinc-50/20 space-y-3">
          <div className="flex flex-col lg:flex-row items-center gap-3">
            <div className="w-full lg:flex-1 relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search by Flat ID, Flat No, Door Spec..."
                className="w-full text-xs font-semibold pl-10 pr-4 py-2.5 bg-white border border-zinc-250 hover:border-zinc-350 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl transition shadow-2xs text-zinc-800"
              />
            </div>

            <div className="w-full lg:w-auto flex flex-row items-center gap-2 self-stretch lg:self-auto">
              <div className="flex items-center gap-1 shrink-0 text-[11px] font-bold text-zinc-400 uppercase tracking-wider font-mono mr-1">
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Filters</span>
              </div>
              
              {/* Tower Filter */}
              <select
                value={selectedTower}
                onChange={e => setSelectedTower(e.target.value)}
                className="flex-1 lg:flex-none py-2 px-2.5 text-xs font-bold bg-white border border-zinc-200 rounded-xl text-zinc-700 cursor-pointer shadow-2xs focus:ring-1 focus:ring-indigo-500"
              >
                <option value="All">All Towers</option>
                {uniqueTowers.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              {/* Floor Filter */}
              <select
                value={selectedFloor}
                onChange={e => setSelectedFloor(e.target.value)}
                className="flex-1 lg:flex-none py-2 px-2.5 text-xs font-bold bg-white border border-zinc-200 rounded-xl text-zinc-700 cursor-pointer shadow-2xs focus:ring-1 focus:ring-indigo-500"
              >
                <option value="All">All Floors</option>
                {uniqueFloors.map(f => (
                  <option key={f} value={f.toString()}>Floor {f}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Detailed Stage Contractor Filters */}
          <div className="pt-2 border-t border-zinc-200/60 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative bg-white rounded-xl border border-zinc-200 flex items-center">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="Search Stage Contractor Name e.g. Fine Wood Ltd..."
                value={contractorSearch}
                onChange={(e) => setContractorSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-transparent text-xs focus:outline-none font-medium text-zinc-750 placeholder-zinc-400"
              />
            </div>

            <div className="relative flex items-center bg-white rounded-xl border border-zinc-200">
              <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 absolute left-3 select-none">Stage:</span>
              <select
                value={contractorStage}
                onChange={(e) => setContractorStage(e.target.value as any)}
                className="w-full pl-16 pr-3 py-2 bg-transparent text-xs focus:outline-none font-bold text-zinc-700 font-sans"
              >
                <option value="any">ANY STAGE CONTRACTOR</option>
                <option value="frameFixing">FRAME INSTALLATION CONTRACTOR</option>
                <option value="doorFixing">SHUTTER INSTALLATION CONTRACTOR</option>
                <option value="hardwareFixing">HARDWARE FITTING CONTRACTOR</option>
                <option value="handover">HARDWARE CLEANING / HANDOVER CONTRACTOR</option>
              </select>
            </div>
          </div>
        </div>

        {/* Detailed Grid Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-100/60 text-zinc-500 font-bold uppercase border-b border-zinc-200 text-[10px] tracking-wider">
                <th className="px-6 py-3.5">
                  <button onClick={() => handleSort('id')} className="flex items-center gap-1 hover:text-zinc-800 font-bold">
                    Ref ID
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3.5">Tower ID</th>
                <th className="px-4 py-3.5">
                  <button onClick={() => handleSort('flatNo')} className="flex items-center gap-1 hover:text-zinc-800 font-bold">
                    Flat Location
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-4 py-3.5">Door Specification</th>
                <th className="px-6 py-3.5 text-right">
                  <button onClick={() => handleSort('price')} className="flex items-center gap-1 hover:text-zinc-800 font-bold ml-auto">
                    Base Cost
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-3.5 text-center">
                  <button onClick={() => handleSort('progress')} className="flex items-center gap-1 hover:text-zinc-800 font-bold mx-auto">
                    Progress
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-3.5 text-right font-bold text-zinc-800">
                  <button onClick={() => handleSort('earned')} className="flex items-center gap-1 hover:text-zinc-800 font-bold ml-auto">
                    Earned Amount
                    <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className="px-6 py-3.5 text-center">Open Tasks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 font-medium text-zinc-700">
              {filteredAndSortedFlats.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-zinc-400 font-semibold">
                    No door records found matching search and filtration tags.
                  </td>
                </tr>
              ) : (
                filteredAndSortedFlats.map(flat => {
                  let checks = 22;
                  checks -= Number(flat.frameFixing.fastenerFixing) + Number(flat.frameFixing.frameLockAreaFinish) + Number(flat.frameFixing.outsideArchitraveFixing) + Number(flat.frameFixing.insideArchitraveFixing);
                  checks -= Number(flat.doorFixing.shutterEdgeFinishing) + Number(flat.doorFixing.gapBetweenFrameAndShutter) + Number(flat.doorFixing.iSealFixing) + Number(flat.doorFixing.visionGlassBeatFinishing);
                  checks -= Number(flat.hardwareFixing.hingeFitting) + Number(flat.hardwareFixing.lockWithHandleFitting) + Number(flat.hardwareFixing.eyeviewInstallation) + Number(flat.hardwareFixing.towerBoltInstallation) + Number(flat.hardwareFixing.doorCloserInstallation) + Number(flat.hardwareFixing.autoDropSealInstallation);
                  checks -= Number(flat.handover.frameCarpatchFillingSanding) + Number(flat.handover.frameTouchUp) + Number(flat.handover.shutterEdgeFinishing) + Number(flat.handover.lockSlotAreaFinishing) + Number(flat.handover.shutterTouchUp) + Number(flat.handover.hardwareCleaning) + Number(flat.handover.plasticCoverRemoval) + Number(flat.handover.keysHandover);
                  
                  let activeChecksDone = 22 - checks;
                  const progressPct = Math.round((activeChecksDone / 22) * 100);

                  return (
                    <tr key={flat.id} className="hover:bg-zinc-50/50 transition">
                      <td className="px-6 py-3.5 font-mono text-[11px] text-zinc-500 font-bold">{flat.id}</td>
                      <td className="px-4 py-3.5 font-bold text-zinc-900">{flat.towerId}</td>
                      <td className="px-4 py-3.5 text-zinc-700">
                        Floor {flat.floor} — <span className="font-bold">Flat {flat.flatNo}</span>
                      </td>
                      <td className="px-4 py-3.5 text-zinc-700 font-semibold">{flat.doorName}</td>
                      <td className="px-6 py-3.5 text-right font-mono">
                        ₹{getFlatBasePrice(flat).toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="font-mono text-zinc-800 font-bold text-[11px] bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-200">
                            {progressPct}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono font-bold text-emerald-650">
                        ₹{getFlatTotalCompletedCost(flat).toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        {checks === 0 ? (
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-bold text-[10px] uppercase tracking-wide border border-emerald-150">
                            Fully Handed Over
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded font-semibold text-[11px] font-mono">
                            {checks} tasks remaining
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}

              {/* Filtering total row */}
              {filteredAndSortedFlats.length > 0 && (
                <tr className="bg-zinc-50 font-bold text-zinc-900 border-t border-zinc-200">
                  <td className="px-6 py-4" colSpan={4}>
                    SUBTOTAL FOR FILTERED RECORDS ({filteredAndSortedFlats.length} of {flats.length} checklists)
                  </td>
                  <td className="px-6 py-4 text-right font-mono">
                    ₹{filteredBudgetSum.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-center font-mono font-extrabold text-xs">
                    {Math.round((filteredEarnedSum / filteredBudgetSum) * 100)}% Avg
                  </td>
                  <td className="px-6 py-4 text-right font-mono text-emerald-700">
                    ₹{filteredEarnedSum.toLocaleString('en-IN')}
                  </td>
                  <td className="px-6 py-4 text-center text-zinc-400 font-semibold">
                    ₹{(filteredBudgetSum - filteredEarnedSum).toLocaleString('en-IN')} unearned
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
