import { useState } from 'react';
import { FlatRecord } from '../types';
import { getFlatOverallProgress, getMilestoneProgress } from '../utils';
import { SUPERVISORS, DOOR_TYPES, TOWERS_LIST } from '../data/mockData';
import { Search, Filter, Plus, ChevronRight, Hash, ArrowUpDown, ChevronDown, Check, CheckSquare } from 'lucide-react';

interface FlatListTableProps {
  flats: FlatRecord[];
  onSelectFlat: (flat: FlatRecord) => void;
  onAddNewFlat: () => void;
  selectedTower: string | null;
  selectedFloor: number | null;
  selectedMilestoneFilter: string | null;
  onClearGridFilters: () => void;
  onBulkApproveFlat?: (flatId: string) => void;
  onUpdateFlats?: (updatedList: FlatRecord[]) => void;
}

type SortField = 'id' | 'flatNo' | 'floor' | 'progress';
type SortOrder = 'asc' | 'desc';

export default function FlatListTable({
  flats,
  onSelectFlat,
  onAddNewFlat,
  selectedTower,
  selectedFloor,
  selectedMilestoneFilter,
  onClearGridFilters,
  onBulkApproveFlat,
  onUpdateFlats
}: FlatListTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewFinderQuery, setViewFinderQuery] = useState('');
  const [towerFilter, setTowerFilter] = useState<string>('all');
  const [floorFilter, setFloorFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('flatNo');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Bulk operation states
  const [selectedFlatIds, setSelectedFlatIds] = useState<string[]>([]);
  const [bulkContractorName, setBulkContractorName] = useState<string>('');
  const [bulkSelectedStageIds, setBulkSelectedStageIds] = useState<string[]>([]);

  // Contractor stage-wise state filters
  const [contractorSearch, setContractorSearch] = useState('');
  const [contractorStage, setContractorStage] = useState<'any' | 'frameFixing' | 'doorFixing' | 'hardwareFixing' | 'painting' | 'handover'>('any');

  // Dynamically derive towers list from flats
  const dynamicTowers = Array.from(new Set(flats.map(f => f.towerId))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  // Multi-level filtering!
  const filteredFlats = flats.filter(flat => {
    // Search query matches
    const matchesSearch = 
      flat.flatNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flat.oaNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flat.doorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flat.id.toLowerCase().includes(searchQuery.toLowerCase());

    // Spatial filter overlays from TowerFloorHeatmap or custom selectors
    const matchesGridTower = selectedTower ? flat.towerId === selectedTower : true;
    const matchesGridFloor = selectedFloor !== null ? flat.floor === selectedFloor : true;

    // Table controls filters
    const matchesTowerSelect = towerFilter === 'all' ? true : flat.towerId === towerFilter;
    const matchesFloorSelect = floorFilter === 'all' ? true : flat.floor === parseInt(floorFilter);

    // Progress level filters
    const overallPct = getFlatOverallProgress(flat);
    let matchesStatus = true;
    if (statusFilter === 'completed') {
      matchesStatus = overallPct === 100;
    } else if (statusFilter === 'wip') {
      matchesStatus = overallPct > 0 && overallPct < 100;
    } else if (statusFilter === 'notstarted') {
      matchesStatus = overallPct === 0;
    }

    // Contractor stage-wise filter matches
    let matchesContractor = true;
    if (contractorSearch.trim()) {
      const q = contractorSearch.toLowerCase();
      if (contractorStage === 'any') {
        const c1 = (flat.frameFixing?.contractor || '').toLowerCase();
        const c2 = (flat.doorFixing?.contractor || '').toLowerCase();
        const c3 = (flat.hardwareFixing?.contractor || '').toLowerCase();
        const c4 = (flat.painting?.contractor || '').toLowerCase();
        const c5 = (flat.handover?.contractor || '').toLowerCase();
        matchesContractor = c1.includes(q) || c2.includes(q) || c3.includes(q) || c4.includes(q) || c5.includes(q);
      } else {
        const targetSection = flat[contractorStage];
        const stageC = (targetSection?.contractor || '').toLowerCase();
        matchesContractor = stageC.includes(q);
      }
    }

    return matchesSearch && matchesGridTower && matchesGridFloor && matchesTowerSelect && matchesFloorSelect && matchesStatus && matchesContractor;
  });

  // Sorting
  const sortedFlats = [...filteredFlats].sort((a, b) => {
    let multiplier = sortOrder === 'asc' ? 1 : -1;
    
    if (sortField === 'id') {
      return a.id.localeCompare(b.id) * multiplier;
    }
    if (sortField === 'flatNo') {
      // Natural sorting for flat numbers if possible
      const aNum = parseInt(a.flatNo) || 0;
      const bNum = parseInt(b.flatNo) || 0;
      return (aNum - bNum) * multiplier;
    }
    if (sortField === 'floor') {
      return (a.floor - b.floor) * multiplier;
    }
    if (sortField === 'progress') {
      return (getFlatOverallProgress(a) - getFlatOverallProgress(b)) * multiplier;
    }
    return 0;
  });

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Extract floor options from existing dataset
  const availableFloors = Array.from(new Set(flats.map(f => f.floor))).sort((a, b) => a - b);

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden space-y-4 p-4 sm:p-6">
      
      {/* Table Head Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="font-bold text-base sm:text-lg text-zinc-900 tracking-tight flex flex-wrap items-center gap-2">
            <span>Room Openings Matrix Log</span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-500 font-mono">
              {sortedFlats.length} of {flats.length} listed
            </span>
          </h3>
          <p className="text-xs sm:text-sm text-zinc-500 font-medium">
            Search, filter, and inspect checklist progressions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Active spatial overlay banner */}
          {(selectedTower || selectedFloor !== null) && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border bg-indigo-50 border-indigo-200 text-indigo-900 text-xs font-semibold">
              <span className="truncate max-w-[200px]">Grid Filter Active: {selectedTower ? selectedTower : ''} {selectedFloor !== null ? `Floor ${selectedFloor}` : ''}</span>
              <button onClick={onClearGridFilters} className="text-[10px] font-black underline hover:text-indigo-950 uppercase cursor-pointer shrink-0">
                Clear
              </button>
            </div>
          )}

          <button
            onClick={onAddNewFlat}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-zinc-900 border border-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Opening Record
          </button>
        </div>
      </div>

      {/* Inputs Filtering Bar */}
      <div className="space-y-3 bg-zinc-50 p-3 sm:p-4 rounded-xl border border-zinc-100">
        
        {/* Dedicated View Finder bar */}
        <div className="space-y-1.5 pb-2 border-b border-zinc-200/50">
          <label className="block text-[10px] font-bold text-indigo-750 uppercase tracking-wider">
            🔍 View Finder / Unique ID Lookup
          </label>
          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-indigo-500 font-mono text-[11px] font-bold select-none">ID:</span>
            <input
              type="text"
              placeholder="Paste exact Door ID or scan QR code (e.g., SO-387026/Tower 01/1st Floor/101/Main Door)..."
              value={viewFinderQuery}
              onChange={(e) => setViewFinderQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 bg-white border border-indigo-200 focus:border-indigo-500 rounded-xl text-xs font-semibold text-zinc-850 focus:outline-none transition-all placeholder:text-zinc-400 focus:ring-1 focus:ring-indigo-500"
            />
            {viewFinderQuery && (
              <button 
                onClick={() => setViewFinderQuery('')}
                className="absolute right-3 top-2.5 text-[10px] font-bold text-zinc-400 hover:text-zinc-600 uppercase"
              >
                Clear
              </button>
            )}
          </div>
          
          {/* View Finder Match Banner */}
          {(() => {
            const q = viewFinderQuery.trim().toLowerCase();
            if (!q) return null;
            const match = flats.find(f => f.id.toLowerCase() === q || f.id.toLowerCase().includes(q));
            if (!match) {
              return (
                <p className="text-[10px] text-amber-600 font-semibold italic">
                  ⚠ No matching record found. Ensure the SO prefix, tower spelling, and floor match the ID layout exactly.
                </p>
              );
            }
            return (
              <div className="mt-1.5 p-2 px-3 bg-emerald-50/80 border border-emerald-150 text-xs font-bold rounded-lg flex items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-2 text-emerald-950 truncate">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full shrink-0"></span>
                  <span className="truncate">🎯 <strong>Found record!</strong> Tower {match.towerId}, Level {match.floor}, Flat {match.flatNo} ({match.doorName})</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onSelectFlat(match);
                    setViewFinderQuery('');
                  }}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[10px] font-black uppercase transition shrink-0 shadow-3xs cursor-pointer"
                >
                  Open Checklist
                </button>
              </div>
            );
          })()}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 w-4.5 h-4.5 text-zinc-400" />
            <input
              type="text"
              placeholder="Search flat no, OA, door..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-zinc-500 font-medium"
            />
          </div>

          {/* Tower Selector */}
          <div className="relative flex items-center">
            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 absolute left-3 select-none">Tower:</span>
            <select
              value={towerFilter}
              onChange={(e) => setTowerFilter(e.target.value)}
              className="w-full pl-16 pr-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-zinc-500 font-semibold text-zinc-700"
            >
              <option value="all">ALL TOWERS</option>
              {dynamicTowers.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Floor selector */}
          <div className="relative flex items-center">
            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 absolute left-3 select-none">Floor:</span>
            <select
              value={floorFilter}
              onChange={(e) => setFloorFilter(e.target.value)}
              className="w-full pl-16 pr-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-zinc-500 font-semibold text-zinc-700"
            >
              <option value="all">ALL FLOORS</option>
              {availableFloors.map(fl => <option key={fl} value={fl}>Level {fl}</option>)}
            </select>
          </div>

          {/* Status filter */}
          <div className="relative flex items-center">
            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 absolute left-3 select-none">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full pl-16 pr-3 py-2 bg-white border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-zinc-500 font-semibold text-zinc-700"
            >
              <option value="all">ALL PROGRESS</option>
              <option value="completed">COMPLETE (100%)</option>
              <option value="wip">IN PROGRESS (1-99%)</option>
              <option value="notstarted">NOT STARTED (0%)</option>
            </select>
          </div>
        </div>

        {/* Contractor Specific Filters */}
        <div className="pt-2.5 border-t border-zinc-200/60 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative bg-white rounded-xl border border-zinc-200 flex items-center">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Filter by Stage Contractor Name..."
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
              <option value="painting">TOUCH-UP & PAINTING CONTRACTOR</option>
              <option value="handover">HANDOVER CONTRACTOR</option>
            </select>
          </div>
        </div>

      </div>

      {/* Bulk Action Controls */}
      {selectedFlatIds.length > 0 && (
        <div className="bg-zinc-900 text-white rounded-2xl p-5 shadow-lg border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-6 animate-fadeIn">
          <div className="space-y-1 md:max-w-xs shrink-0">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-indigo-400 shrink-0" />
              <h4 className="font-extrabold text-sm tracking-tight text-white">Bulk Contractor Update</h4>
            </div>
            <p className="text-[11px] text-zinc-400 font-medium">
              Assign contractor to <strong>{selectedFlatIds.length} selected door openings</strong>.
            </p>
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Contractor Name */}
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Contractor Name</label>
              <input
                type="text"
                placeholder="e.g. Prabir Dhol, Contractor A"
                value={bulkContractorName}
                onChange={(e) => setBulkContractorName(e.target.value)}
                className="w-full px-3 py-1.5 bg-zinc-800 border border-zinc-700 text-white placeholder-zinc-500 rounded-lg text-xs font-semibold focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
              />
            </div>

            {/* Stage Checklist Checkboxes */}
            <div className="space-y-1 lg:col-span-2">
              <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block mb-1">
                Milestone Stages to Update (Multi-select)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'frameFixing', label: 'Frame' },
                  { id: 'doorFixing', label: 'Shutter' },
                  { id: 'hardwareFixing', label: 'Hardware' },
                  { id: 'painting', label: 'Painting' },
                  { id: 'handover', label: 'Handover' }
                ].map((stg) => {
                  const isChecked = bulkSelectedStageIds.includes(stg.id);
                  return (
                    <label 
                      key={stg.id} 
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-bold cursor-pointer transition ${
                        isChecked 
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-2xs' 
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-750'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setBulkSelectedStageIds(bulkSelectedStageIds.filter(id => id !== stg.id));
                          } else {
                            setBulkSelectedStageIds([...bulkSelectedStageIds, stg.id]);
                          }
                        }}
                      />
                      <span>{stg.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setSelectedFlatIds([]);
                setBulkSelectedStageIds([]);
                setBulkContractorName('');
              }}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-350 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (!bulkContractorName.trim()) {
                  alert('Please enter a contractor name.');
                  return;
                }
                if (bulkSelectedStageIds.length === 0) {
                  alert('Please select at least one milestone stage.');
                  return;
                }
                
                // Perform update on parent flats array
                const name = bulkContractorName.trim();
                const updatedList = flats.map(flat => {
                  if (!selectedFlatIds.includes(flat.id)) return flat;
                  
                  const updated = { ...flat };
                  bulkSelectedStageIds.forEach(stg => {
                    if (updated[stg]) {
                      updated[stg] = {
                        ...updated[stg],
                        contractor: name
                      };
                    }
                  });
                  
                  // Also update top-level contractor if fallback is appropriate
                  updated.contractor = name;
                  
                  return updated;
                });

                if (onUpdateFlats) {
                  onUpdateFlats(updatedList);
                }
                
                // Clear state
                setSelectedFlatIds([]);
                setBulkSelectedStageIds([]);
                setBulkContractorName('');
              }}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black shadow-sm transition cursor-pointer"
            >
              Apply Bulk Rules
            </button>
          </div>
        </div>
      )}

      {/* Table grid wrapper */}
      <div className="overflow-x-auto border border-zinc-100 rounded-xl">
        <table className="w-full text-left border-collapse table-auto">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200/50 text-xs font-bold text-zinc-500 tracking-wide">
              {/* Checkbox Header */}
              <th className="p-4 w-12 text-center">
                <input 
                  type="checkbox" 
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                  checked={sortedFlats.length > 0 && selectedFlatIds.length === sortedFlats.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedFlatIds(sortedFlats.map(f => f.id));
                    } else {
                      setSelectedFlatIds([]);
                    }
                  }}
                />
              </th>

              <th className="p-4 cursor-pointer hover:bg-zinc-100/60" onClick={() => toggleSort('id')}>
                <div className="flex items-center gap-1">
                  <span>ID</span>
                  <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                </div>
              </th>
              
              <th className="p-4 cursor-pointer hover:bg-zinc-100/60 font-medium" onClick={() => toggleSort('flatNo')}>
                <div className="flex items-center gap-1">
                  <span>Flat No / Tower</span>
                  <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                </div>
              </th>

              <th className="p-4">Door Specification</th>
              
              {/* Miles progressive checklists */}
              <th className="p-4 text-center">Frame Fixing</th>
              <th className="p-4 text-center">Door Fixing</th>
              <th className="p-4 text-center">Hardware Fixing</th>
              <th className="p-4 text-center">Touch-up & Painting</th>
              <th className="p-4 text-center">Handover</th>

              <th className="p-4 text-right cursor-pointer hover:bg-zinc-100/60" onClick={() => toggleSort('progress')}>
                <div className="flex items-center justify-end gap-1">
                  <span>Completeness</span>
                  <ArrowUpDown className="w-3 h-3 text-zinc-400" />
                </div>
              </th>
              
              <th className="p-4 text-center font-bold text-zinc-500 uppercase tracking-wide">Quick Action</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-zinc-100 text-sm font-medium text-zinc-800">
            {sortedFlats.length === 0 ? (
              <tr>
                <td colSpan={12} className="text-center py-10 text-zinc-400 font-semibold text-xs">
                  No matching door opening records found in current filters.
                </td>
              </tr>
            ) : (
              sortedFlats.map((flat) => {
                const overallPct = getFlatOverallProgress(flat);
                const ffPct = getMilestoneProgress(flat, 'frameFixing');
                const dfPct = getMilestoneProgress(flat, 'doorFixing');
                const hwPct = getMilestoneProgress(flat, 'hardwareFixing');
                const ptPct = getMilestoneProgress(flat, 'painting');
                const hoPct = getMilestoneProgress(flat, 'handover');

                // Color generators for milestones
                const getMilestoneColor = (pct: number) => {
                  if (pct === 100) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
                  if (pct > 0) return 'text-amber-600 bg-amber-50 border-amber-100';
                  return 'text-zinc-400 bg-zinc-50/50 border-zinc-200/60';
                };

                return (
                  <tr 
                    key={flat.id}
                    onClick={() => onSelectFlat(flat)}
                    className="hover:bg-zinc-50/50 transition cursor-pointer"
                  >
                    {/* Checkbox column */}
                    <td className="p-4 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                      <input 
                        type="checkbox" 
                        className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        checked={selectedFlatIds.includes(flat.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFlatIds([...selectedFlatIds, flat.id]);
                          } else {
                            setSelectedFlatIds(selectedFlatIds.filter(id => id !== flat.id));
                          }
                        }}
                      />
                    </td>

                    {/* ID column */}
                    <td className="p-4 font-mono text-[11px] font-bold text-zinc-400">
                      {flat.id}
                    </td>

                    {/* Flat No details */}
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <div className="text-sm font-bold text-zinc-900 leading-none">
                          Flat {flat.flatNo}
                        </div>
                        <div className="text-xs text-zinc-500 font-medium">
                          {flat.towerId} • Lvl {flat.floor}
                        </div>
                      </div>
                    </td>

                    {/* Door type */}
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <div className="text-xs font-semibold text-zinc-800 line-clamp-1 max-w-[180px]">
                          {flat.doorName}
                        </div>
                        <div className="text-[10px] font-medium font-mono text-zinc-400">
                          {flat.oaNo}
                        </div>
                      </div>
                    </td>

                    {/* Frame Fixing Milestone status */}
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-bold font-mono ${getMilestoneColor(ffPct)}`}>
                          {ffPct}%
                        </div>
                        {flat.frameFixing?.contractor && (
                          <span className="text-[9px] text-zinc-400 font-extrabold max-w-[80px] truncate" title={flat.frameFixing.contractor}>
                            {flat.frameFixing.contractor}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Door Fixing Milestone status */}
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-bold font-mono ${getMilestoneColor(dfPct)}`}>
                          {dfPct}%
                        </div>
                        {flat.doorFixing?.contractor && (
                          <span className="text-[9px] text-zinc-400 font-extrabold max-w-[80px] truncate" title={flat.doorFixing.contractor}>
                            {flat.doorFixing.contractor}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Hardware Fixing Milestone status */}
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-bold font-mono ${getMilestoneColor(hwPct)}`}>
                          {hwPct}%
                        </div>
                        {flat.hardwareFixing?.contractor && (
                          <span className="text-[9px] text-zinc-400 font-extrabold max-w-[80px] truncate" title={flat.hardwareFixing.contractor}>
                            {flat.hardwareFixing.contractor}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Touch-up & Painting Milestone status */}
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-bold font-mono ${getMilestoneColor(ptPct)}`}>
                          {ptPct}%
                        </div>
                        {flat.painting?.contractor && (
                          <span className="text-[9px] text-zinc-400 font-extrabold max-w-[80px] truncate" title={flat.painting.contractor}>
                            {flat.painting.contractor}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Handover Milestone status */}
                    <td className="p-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`inline-block px-2.5 py-0.5 rounded-full border text-[10px] font-bold font-mono ${getMilestoneColor(hoPct)}`}>
                          {hoPct}%
                        </div>
                        {flat.handover?.contractor && (
                          <span className="text-[9px] text-zinc-400 font-extrabold max-w-[80px] truncate" title={flat.handover.contractor}>
                            {flat.handover.contractor}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Overall Completion Progress */}
                    <td className="p-4 text-right">
                      <div className="flex flex-col items-end gap-1 justify-center h-full">
                        <span className="text-xs font-bold font-mono text-zinc-900">
                          {overallPct}%
                        </span>
                        
                        {/* Inline tiny progress track */}
                        <div className="h-1.5 w-16 bg-zinc-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              overallPct === 100 
                                ? 'bg-emerald-500' 
                                : overallPct >= 50 
                                  ? 'bg-blue-500' 
                                  : 'bg-amber-400'
                            }`}
                            style={{ width: `${overallPct}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>

                    {/* Quick Bulk Action column */}
                    <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                      {overallPct === 100 ? (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>100% APPROVED</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => onBulkApproveFlat?.(flat.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 active:bg-indigo-800 text-white text-[10.5px] font-extrabold rounded-xl transition shadow-3xs cursor-pointer select-none uppercase tracking-wide"
                          title="Instantly set every checklist item across all stages to Approved (100%)"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          <span>Approve All Stages</span>
                        </button>
                      )}
                    </td>

                    {/* Launch editor trigger */}
                    <td className="p-4 text-center">
                      <div className="p-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-500 group-hover:text-zinc-800 transition">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      
    </div>
  );
}
