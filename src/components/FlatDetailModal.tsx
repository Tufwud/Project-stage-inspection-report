import React, { useState, useEffect } from 'react';
import { FlatRecord, MILESTONES, MilestoneKey } from '../types';
import { SUPERVISORS, DOOR_TYPES, TOWERS_LIST } from '../data/mockData';
import { getMilestoneProgress } from '../utils';
import { X, Calendar, User, Save, Trash2, CheckSquare, Square, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface FlatDetailModalProps {
  flat: FlatRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: FlatRecord) => void;
  onDelete?: (id: string) => void;
}

export default function FlatDetailModal({ flat, isOpen, onClose, onSave, onDelete }: FlatDetailModalProps) {
  const [formData, setFormData] = useState<FlatRecord | null>(null);
  const [activeTab, setActiveTab] = useState<MilestoneKey>('frameFixing');

  // Sync state with selected flat
  useEffect(() => {
    if (flat) {
      setFormData(JSON.parse(JSON.stringify(flat))); // Deep clone
    } else {
      setFormData(null);
    }
  }, [flat, isOpen]);

  if (!isOpen || !formData) return null;

  const handleMetaChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [name]: name === 'floor' || name === 'flatsPerFloor' ? parseInt(value) || 0 : value
      };
    });
  };

  // Toggle subtask within a milestone
  const handleToggleSubtask = (milestoneKey: MilestoneKey, subtaskKey: string) => {
    setFormData(prev => {
      if (!prev) return null;
      const milestone = { ...prev[milestoneKey] } as any;
      const nextVal = !milestone[subtaskKey];
      milestone[subtaskKey] = nextVal;
      
      // Auto assign Done By and timestamp if it is toggled to TRUE and currently blank
      if (nextVal) {
        if (!milestone.doneBy) {
          milestone.doneBy = SUPERVISORS[0]; 
        }
        if (!milestone.timestamp) {
          milestone.timestamp = new Date().toISOString().substring(0, 16); // format for local datetime-local input
        }
      }

      return {
        ...prev,
        [milestoneKey]: milestone
      };
    });
  };

  // Bulk update checklist for active stage
  const handleStageBulkUpdate = (milestoneKey: MilestoneKey, complete: boolean) => {
    setFormData(prev => {
      if (!prev) return null;
      const meta = MILESTONES.find(m => m.key === milestoneKey);
      if (!meta) return prev;

      const updatedMilestone = { ...prev[milestoneKey] } as any;
      Object.keys(meta.subtaskLabels).forEach(key => {
        updatedMilestone[key] = complete;
      });

      if (complete) {
        if (!updatedMilestone.doneBy) updatedMilestone.doneBy = SUPERVISORS[0];
        if (!updatedMilestone.timestamp) updatedMilestone.timestamp = new Date().toISOString().substring(0, 16);
      } else {
        updatedMilestone.timestamp = "";
      }

      return {
        ...prev,
        [milestoneKey]: updatedMilestone
      };
    });
  };

  const handleWorkerChange = (milestoneKey: MilestoneKey, value: string) => {
    setFormData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [milestoneKey]: {
          ...prev[milestoneKey],
          doneBy: value
        }
      };
    });
  };

  const handleTimestampChange = (milestoneKey: MilestoneKey, value: string) => {
    setFormData(prev => {
      if (!prev) return null;
      return {
        ...prev,
        [milestoneKey]: {
          ...prev[milestoneKey],
          timestamp: value
        }
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData) {
      onSave(formData);
      onClose();
    }
  };

  const stageProgress = formData ? getMilestoneProgress(formData, activeTab) : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />

      {/* Drawer Content */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 220 }}
        className="relative w-full max-w-xl bg-white h-screen flex flex-col shadow-2xl z-10"
      >
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-zinc-400 font-mono tracking-wider font-bold text-[10px] uppercase">
              Inspection record
            </span>
            <h2 className="text-xl font-bold text-zinc-900 tracking-tight">
              {formData.id === 'NEW' ? 'Create New Opening' : `Edit Record ${formData.id}`}
            </h2>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 transition text-zinc-500 hover:text-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Section 1: Spatial Metadata */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Spatial & Location Identifiers</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">OA Number</label>
                <input
                  type="text"
                  name="oaNo"
                  value={formData.oaNo}
                  onChange={handleMetaChange}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-500 font-medium"
                  placeholder="e.g. OA-2026-1049"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">Tower ID</label>
                <select
                  name="towerId"
                  value={formData.towerId}
                  onChange={handleMetaChange}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-500 font-medium"
                >
                  {TOWERS_LIST.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">Floor Level</label>
                <input
                  type="number"
                  name="floor"
                  value={formData.floor}
                  onChange={handleMetaChange}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-500 font-medium"
                  min="0"
                  max="50"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 mb-1">Flat / Flat No</label>
                <input
                  type="text"
                  name="flatNo"
                  value={formData.flatNo}
                  onChange={handleMetaChange}
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-500 font-medium font-mono"
                  placeholder="e.g. 104"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Door Specification / Name</label>
              <select
                name="doorName"
                value={formData.doorName}
                onChange={handleMetaChange}
                className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-500 font-medium"
              >
                {DOOR_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* Section 2: Interactive Milestone Quality Toggles */}
          <div className="space-y-4 pt-4 border-t border-zinc-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Quality Checkpoint Stages</h3>
              <span className="text-xs font-semibold text-zinc-500 font-mono">Stage: {stageProgress}% Completed</span>
            </div>

            {/* Stage Selector tabs */}
            <div className="flex border-b border-zinc-100 gap-1 overflow-x-auto pb-1">
              {MILESTONES.map(milestone => {
                const isSelected = activeTab === milestone.key;
                const completionVal = getMilestoneProgress(formData, milestone.key);
                return (
                  <button
                    key={milestone.key}
                    type="button"
                    onClick={() => setActiveTab(milestone.key)}
                    className={`px-3 py-2 text-xs font-bold rounded-lg border transition whitespace-nowrap flex items-center gap-1.5 ${
                      isSelected 
                        ? "bg-zinc-900 border-zinc-900 text-white" 
                        : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
                    }`}
                  >
                    <span>{milestone.label}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${isSelected ? "bg-white/20 text-white" : "bg-zinc-200/85 text-zinc-600"}`}>
                      {completionVal}%
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Stage Checkpoints List */}
            <div className="bg-zinc-50/70 border border-zinc-100 rounded-2xl p-5 space-y-4">
              
              {/* Checkpoint checklist group */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-200/50">
                  <span className="text-xs font-bold text-zinc-800 uppercase tracking-tight">Requirement Toggles</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleStageBulkUpdate(activeTab, true)}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 uppercase"
                    >
                      Fill All
                    </button>
                    <span className="text-zinc-300">|</span>
                    <button
                      type="button"
                      onClick={() => handleStageBulkUpdate(activeTab, false)}
                      className="text-[10px] font-bold text-zinc-500 hover:text-zinc-800 uppercase"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                {(() => {
                  const meta = MILESTONES.find(m => m.key === activeTab);
                  if (!meta) return null;
                  
                  const activeStageData = formData[activeTab] as any;

                  return Object.keys(meta.subtaskLabels).map(taskKey => {
                    const isPassed = activeStageData[taskKey] === true;
                    return (
                      <button
                        key={taskKey}
                        type="button"
                        onClick={() => handleToggleSubtask(activeTab, taskKey)}
                        className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                          isPassed 
                            ? "bg-emerald-50/50 border-emerald-200 hover:bg-emerald-50 text-emerald-950" 
                            : "bg-white border-zinc-200 hover:bg-zinc-50 text-zinc-700"
                        }`}
                        style={{ minHeight: '44px' }} // Touch safe
                      >
                        <span className="text-xs font-semibold leading-relaxed">
                          {meta.subtaskLabels[taskKey]}
                        </span>
                        
                        <div>
                          {isPassed ? (
                            <div className="p-1 rounded-full bg-emerald-500 text-white">
                              <CheckSquare className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="text-zinc-300">
                              <Square className="w-5 h-5" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  });
                })()}
              </div>

              {/* Personnel Assigned & Timestamps */}
              <div className="pt-4 border-t border-zinc-200/50 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-600 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                    Inspected By
                  </label>
                  <select
                    value={formData[activeTab].doneBy}
                    onChange={(e) => handleWorkerChange(activeTab, e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-zinc-500 bg-white font-medium"
                  >
                    <option value="">-- Unassigned --</option>
                    {SUPERVISORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-600 mb-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    Timestamp Log
                  </label>
                  <input
                    type="datetime-local"
                    value={formData[activeTab].timestamp ? formData[activeTab].timestamp.substring(0, 16) : ""}
                    onChange={(e) => handleTimestampChange(activeTab, e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-zinc-500 bg-white font-medium font-mono"
                  />
                </div>
              </div>

            </div>
          </div>
        </form>

        {/* Action Buttons */}
        <div className="p-6 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between gap-4">
          <div>
            {formData.id !== 'NEW' && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this flat opening log?")) {
                    onDelete(formData.id);
                    onClose();
                  }
                }}
                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-500 bg-white hover:bg-zinc-50 transition"
            >
              Cancel
            </button>
            
            <button
              onClick={handleSubmit}
              className="px-5 py-2 bg-zinc-900 border border-zinc-900 text-white rounded-xl text-xs font-bold hover:bg-zinc-805 hover:shadow transition flex items-center gap-1.5 whitespace-nowrap"
            >
              <Save className="w-4 h-4" />
              Save Record
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
