import React, { useState, useEffect } from 'react';
import { FlatRecord, MILESTONES, MilestoneKey, QUALITATIVE_CHOICES, QualitativeState } from '../types';
import { SUPERVISORS, DOOR_TYPES, TOWERS_LIST } from '../data/mockData';
import { 
  getMilestoneProgress, 
  getSubtaskState, 
  getFinancialStageProgress, 
  getFinancialStageEarned, 
  getFlatTotalCompletedCost, 
  getFlatBasePrice,
  getFinancialStagePct
} from '../utils';
import { X, Calendar, User, Save, Trash2, CheckSquare, Square, Clock, Download, Hammer, Camera, Image, FileText, Paperclip } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getAccessToken, googleSignIn, syncPhotosToDrive, syncErpPdfToDrive } from '../lib/googleSheets';

// Helper to get local timestamp in YYYY-MM-DDTHH:mm format
const getLocalTimestamp = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

interface FlatDetailModalProps {
  flat: FlatRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: FlatRecord) => void;
  onDelete?: (id: string) => void;
  supervisors?: string[];
}

export default function FlatDetailModal({ flat, isOpen, onClose, onSave, onDelete, supervisors }: FlatDetailModalProps) {
  const supervisorList = supervisors || SUPERVISORS.filter(s => s !== "Nagesh Yadav" && s !== "Nagesh Jadav");
  const [formData, setFormData] = useState<FlatRecord | null>(null);
  const [activeTab, setActiveTab] = useState<MilestoneKey>('frameFixing');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [zoomedPhoto, setZoomedPhoto] = useState<{ url: string; name: string } | null>(null);

  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      try {
        const token = await getAccessToken();
        setGoogleToken(token);
      } catch (err) {
        console.warn("Failed to get Google Token:", err);
      }
    };
    if (isOpen) {
      fetchToken();
    }
  }, [isOpen]);

  const handleConnectGoogle = async () => {
    try {
      setSyncError(null);
      setIsSyncing(true);
      const res = await googleSignIn();
      if (res?.accessToken) {
        setGoogleToken(res.accessToken);
      }
    } catch (err: any) {
      setSyncError(err?.message || "Failed to authenticate with Google");
    } finally {
      setIsSyncing(false);
    }
  };

  // ERP PDF Upload logic
  const handleErpPdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          erpWorkOrder: {
            name: file.name,
            date: new Date().toLocaleDateString('en-GB'),
            size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
            url: reader.result as string
          }
        };
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveErpPdf = () => {
    setFormData(prev => {
      if (!prev) return null;
      const updated = { ...prev };
      delete updated.erpWorkOrder;
      return updated;
    });
  };

  // Stage-wise Photo Upload logic
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, isCamera: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFormData(prev => {
        if (!prev) return null;
        const currentPhotos = prev.photos || {};
        const stagePhotos = currentPhotos[activeTab] || [];
        
        // short stage mapping
        const stageShortMap: { [key: string]: string } = {
          frameFixing: 'FF',
          doorFixing: 'DF',
          hardwareFixing: 'HF',
          painting: 'PT',
          handover: 'HO'
        };
        const shortStage = stageShortMap[activeTab] || 'STG';
        
        // picture index is current length + 1
        const pictureIndex = stagePhotos.length + 1;
        
        // Date format: DDMMYY
        const d = new Date();
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = String(d.getFullYear()).substring(2);
        const dateStr = `${day}${month}${year}`;
        
        // Nomenclature: {flatNo}_{shortStage}_P{number}_{dateStr}
        const nomenclatureName = `${prev.flatNo || 'FLAT'}_${shortStage}_P${pictureIndex}_${dateStr}`;
        
        const newPhotoItem = {
          id: `photo_${Date.now()}`,
          name: nomenclatureName,
          url: reader.result as string,
          date: d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          isCamera
        };

        return {
          ...prev,
          photos: {
            ...currentPhotos,
            [activeTab]: [...stagePhotos, newPhotoItem]
          }
        };
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (photoId: string) => {
    setFormData(prev => {
      if (!prev) return null;
      const currentPhotos = prev.photos || {};
      const stagePhotos = currentPhotos[activeTab] || [];
      const updatedPhotos = stagePhotos.filter(p => p.id !== photoId);
      
      // Renumber remaining photos to maintain correct sequential nomenclature name
      const renumberedPhotos = updatedPhotos.map((p, idx) => {
        const stageShortMap: { [key: string]: string } = {
          frameFixing: 'FF',
          doorFixing: 'DF',
          hardwareFixing: 'HF',
          painting: 'PT',
          handover: 'HO'
        };
        const shortStage = stageShortMap[activeTab] || 'STG';
        const pictureIndex = idx + 1;
        
        // extract or regenerate date part
        const parts = p.name.split('_');
        const dateStr = parts.length >= 4 ? parts[3] : parts[parts.length - 1] || 'DATE';
        const nomenclatureName = `${prev.flatNo || 'FLAT'}_${shortStage}_P${pictureIndex}_${dateStr}`;
        return {
          ...p,
          name: nomenclatureName
        };
      });

      return {
        ...prev,
        photos: {
          ...currentPhotos,
          [activeTab]: renumberedPhotos
        }
      };
    });
  };

  // Sync state with selected flat
  useEffect(() => {
    if (flat) {
      const cloned = JSON.parse(JSON.stringify(flat));
      // Ensure painting is defined
      if (!cloned.painting) {
        cloned.painting = {
          frameCarpatchFillingSanding: 'not_started',
          frameTouchUp: 'not_started',
          shutterEdgeFinishing: 'not_started',
          lockSlotAreaFinishing: 'not_started',
          shutterTouchUp: 'not_started',
          doneBy: 'Aarif Taslim',
          contractor: 'Prabir Dhol',
          timestamp: ''
        };
      }
      // Ensure contractor defaults to "Prabir Dhol" and Inspector/doneBy to "Aarif Taslim" if blank but editable
      ['frameFixing', 'doorFixing', 'hardwareFixing', 'painting', 'handover'].forEach(key => {
        if (cloned[key]) {
          if (!cloned[key].contractor) {
            cloned[key].contractor = "Prabir Dhol";
          }
          if (!cloned[key].doneBy) {
            cloned[key].doneBy = "Aarif Taslim";
          }
        }
      });
      setFormData(cloned);
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

  // Change individual checkpoint dropdown option
  const handleDropdownChange = (milestoneKey: MilestoneKey, subtaskKey: string, newValue: string) => {
    setFormData(prev => {
      if (!prev) return null;
      const milestone = { ...prev[milestoneKey] } as any;
      milestone[subtaskKey] = newValue;
      
      // Auto assign Done By and timestamp if it is updated to something other than not_started
      if (newValue !== 'not_started') {
        if (!milestone.doneBy) {
          milestone.doneBy = SUPERVISORS[0]; 
        }
        if (!milestone.timestamp) {
          milestone.timestamp = getLocalTimestamp(); // format for local datetime-local input
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
        updatedMilestone[key] = complete ? 'approved' : 'not_started';
      });

      if (complete) {
        if (!updatedMilestone.doneBy) updatedMilestone.doneBy = SUPERVISORS[0];
        if (!updatedMilestone.timestamp) updatedMilestone.timestamp = getLocalTimestamp();
      } else {
        updatedMilestone.timestamp = "";
      }

      return {
        ...prev,
        [milestoneKey]: updatedMilestone
      };
    });
  };

  // Bulk update all checkpoints across all stages (milestones) to approved at once
  const handleAllStagesBulkApproved = () => {
    setFormData(prev => {
      if (!prev) return null;
      const updated = { ...prev };
      
      MILESTONES.forEach(meta => {
        const milestoneKey = meta.key;
        const currentMilestone = { ...(updated[milestoneKey] || {}) } as any;
        
        Object.keys(meta.subtaskLabels).forEach(taskKey => {
          currentMilestone[taskKey] = 'approved';
        });
        
        if (!currentMilestone.doneBy) {
          currentMilestone.doneBy = supervisorList[0] || SUPERVISORS[0];
        }
        if (!currentMilestone.timestamp) {
          currentMilestone.timestamp = getLocalTimestamp();
        }
        
        updated[milestoneKey] = currentMilestone;
      });
      
      return updated;
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

  const handleDownloadReport = () => {
    if (!formData) return;
    const totalCost = getFlatTotalCompletedCost(formData);
    const basePrice = getFlatBasePrice(formData);
    const overallProgress = formData ? Math.round((getTotalSubtaskScore(formData) / 22) * 100) : 0;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to download this report.");
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Inspection Report - OA# ${formData.oaNo} - Flat ${formData.flatNo}</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1e293b; padding: 40px; line-height: 1.5; }
          .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #0f172a; }
          .meta-grid { display: grid; grid-template-cols: repeat(4, 1fr); gap: 20px; background: #f1f5f9; padding: 20px; border-radius: 12px; margin-bottom: 30px; }
          .meta-item { display: flex; flex-direction: column; }
          .meta-label { font-size: 10px; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 4px; }
          .meta-val { font-size: 14px; font-weight: bold; color: #0f172a; }
          .financials { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 35px; }
          .fin-card { flex: 1; border: 1px solid #e2e8f0; border-radius: 12px; padding: 15px 20px; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
          .fin-title { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-bottom: 6px; }
          .fin-val { font-size: 20px; font-weight: bold; color: #2563eb; }
          .stage { margin-bottom: 25px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
          .stage-header { background: #f8fafc; padding: 12px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
          .stage-title { font-size: 13px; font-weight: bold; color: #01172a; }
          .stage-pct { font-size: 12px; font-weight: bold; color: #2563eb; }
          .checkpoint-list { padding: 15px 20px; display: grid; grid-template-cols: 1fr 1fr; gap: 12px; background: #fff; }
          .checkpoint-item { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; font-size: 11px; }
          .checkpoint-name { color: #475569; }
          .checkpoint-status { font-weight: bold; font-size: 10px; padding: 3px 8px; border-radius: 8px; text-transform: uppercase; }
          .not_started { background: #cbd5e1; color: #334155; }
          .completed { background: #dbeafe; color: #1e40af; }
          .approved { background: #d1fae5; color: #065f46; }
          .approved_remarks { background: #ccfbf1; color: #0f766e; }
          .repair_reqd { background: #fef3c7; color: #92400e; }
          .rework_needed { background: #ffedd5; color: #9a3412; }
          .not_approved { background: #fee2e2; color: #991b1b; }
          .rejected { background: #fca5a5; color: #7f1d1d; }
          .handed_over { background: #ede9fe; color: #5b21b6; }
          .footer { text-align: center; color: #94a3b8; font-size: 10px; margin-top: 50px; border-top: 1px solid #f1f5f9; padding-top: 15px; }
          @media print {
            body { padding: 0; font-size: 10pt; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div style="display:flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <button onclick="window.print()" style="background:#0f172a; color:#fff; border:none; padding:10px 20px; font-weight:bold; border-radius:8px; cursor:pointer;">Print / Save PDF</button>
          <button onclick="window.close()" style="background:#fff; color:#0f172a; border:1px solid #ccc; padding:10px 20px; font-weight:bold; border-radius:8px; cursor:pointer;">Close Tab</button>
        </div>
        <div class="header">
          <div>
            <div style="font-size: 11px; font-weight: bold; color: #2563eb; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 5px;">Tufwud Door Installation Systems</div>
            <div class="title">Opening Inspection Certificate</div>
          </div>
          <div style="text-align: right; font-style: italic; font-size: 11px; color: #64748b;">
            Generated: ${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-item"><span class="meta-label">OA Number</span><span class="meta-val">${formData.oaNo}</span></div>
          <div class="meta-item"><span class="meta-label">Tower ID</span><span class="meta-val">${formData.towerId}</span></div>
          <div class="meta-item"><span class="meta-label">Floor / Flat</span><span class="meta-val">Level ${formData.floor} / Room ${formData.flatNo}</span></div>
          <div class="meta-item"><span class="meta-label">Door Specification</span><span class="meta-val">${formData.doorName}</span></div>
        </div>

        <div class="financials">
          <div class="fin-card">
            <div class="fin-title">Overall Quality Compliance Progress</div>
            <div class="fin-val" style="color:#10b981">${overallProgress}%</div>
          </div>
          <div class="fin-card">
            <div class="fin-title">Contract Cost (Base target)</div>
            <div class="fin-val">₹${basePrice.toLocaleString()}</div>
          </div>
          <div class="fin-card">
            <div class="fin-title">Earned Progress Value</div>
            <div class="fin-val" style="color:#2563eb">₹${totalCost.toLocaleString()}</div>
          </div>
        </div>

        <div style="font-size:14px; font-weight:bold; margin-bottom:15px; color:#0f172a; text-transform: uppercase;">Checkpoint Compliance Details</div>

        ${MILESTONES.map(milestone => {
          const mProgress = getMilestoneProgress(formData, milestone.key);
          const activeStageData = (formData[milestone.key] || {}) as any;
          return `
            <div class="stage">
              <div class="stage-header">
                <span class="stage-title">${milestone.label}</span>
                <span class="stage-pct">Substage Completion: ${mProgress}% &bull; Inspector: ${activeStageData.doneBy || 'Unassigned'}</span>
              </div>
              <div class="checkpoint-list">
                ${Object.keys(milestone.subtaskLabels).map(taskKey => {
                  const stateKey = getSubtaskState(activeStageData[taskKey]);
                  const optionDetails = QUALITATIVE_CHOICES[stateKey] || QUALITATIVE_CHOICES['not_started'];
                  const label = milestone.subtaskLabels[taskKey];
                  return `
                    <div class="checkpoint-item">
                      <span class="checkpoint-name">${label}</span>
                      <span class="checkpoint-status" style="background:${optionDetails.color.includes('bg-emerald') ? '#d1fae5' : optionDetails.color.includes('bg-blue') ? '#dbeafe' : optionDetails.color.includes('bg-indigo') ? '#ede9fe' : optionDetails.color.includes('bg-amber') ? '#fef3c7' : optionDetails.color.includes('bg-orange') ? '#ffedd5' : optionDetails.color.includes('bg-rose-100') ? '#fee2e2' : '#f1f5f9'}; color:${optionDetails.color.includes('text-emerald') ? '#065f46' : optionDetails.color.includes('text-blue') ? '#1e40af' : optionDetails.color.includes('text-indigo') ? '#5b21b6' : optionDetails.color.includes('text-amber') ? '#92400e' : optionDetails.color.includes('text-orange') ? '#9a3412' : optionDetails.color.includes('text-rose') ? '#991b1b' : '#334155'};">${optionDetails.label}</span>
                    </div>
                  `;
                }).join("")}
              </div>
            </div>
          `;
        }).join("")}

        <div class="footer">
          Official Inspection Certificate &copy; ${new Date().getFullYear()} Tufwud. Validated digitally.
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Helper score calculator purely for layout checks
  const getTotalSubtaskScore = (f: FlatRecord): number => {
    const fetchWeight = (val: any) => {
      if (val === undefined || val === null) return 0;
      if (typeof val === 'boolean') return val ? 1.0 : 0.0;
      const chc = QUALITATIVE_CHOICES[val as QualitativeState];
      return chc ? chc.weight : 0;
    };
    let score = 0;
    MILESTONES.forEach(milestone => {
      const activeStageData = (f[milestone.key] || {}) as any;
      Object.keys(milestone.subtaskLabels).forEach(subKey => {
        score += fetchWeight(activeStageData[subKey]);
      });
    });
    return Math.max(0, score);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    if (googleToken) {
      setIsSyncing(true);
      setSyncError(null);
      try {
        const photosToSync = formData.photos || {};
        let hasBase64Photos = false;
        for (const key of Object.keys(photosToSync)) {
          if (photosToSync[key]?.some(p => p.url.startsWith('data:'))) {
            hasBase64Photos = true;
            break;
          }
        }

        const hasBase64ErpPdf = !!(formData.erpWorkOrder && formData.erpWorkOrder.url.startsWith('data:'));

        let updatedFormData = { ...formData };

        if (hasBase64Photos) {
          const syncedPhotos = await syncPhotosToDrive(googleToken, formData.oaNo || '387026', photosToSync);
          updatedFormData.photos = syncedPhotos;
        }

        if (hasBase64ErpPdf && formData.erpWorkOrder) {
          const syncedPdf = await syncErpPdfToDrive(googleToken, formData.oaNo || '387026', formData.erpWorkOrder);
          updatedFormData.erpWorkOrder = syncedPdf;
        }

        onSave(updatedFormData);
        onClose();
      } catch (err: any) {
        console.error("Failed to sync media to Google Drive during save:", err);
        const errMsg = err.message || err;
        setSyncError(`Sync failed: ${errMsg}. Saved changes locally offline.`);
        
        // Automatically proceed with offline save so that user data is never lost due to network errors
        setTimeout(() => {
          onSave(formData);
          onClose();
        }, 3000);
      } finally {
        setIsSyncing(false);
      }
    } else {
      onSave(formData);
      onClose();
    }
  };

  const stageProgress = formData ? getMilestoneProgress(formData, activeTab) : 0;
  const oaNoFull = formData?.oaNo || '387026';
  const numericParts = oaNoFull.replace(/\D/g, '');
  const oaNo4Digit = numericParts.substring(0, 4) || '3870';

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
        {isSyncing && (
          <div className="absolute inset-0 bg-white/90 backdrop-blur-xs z-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
            <h3 className="text-base font-extrabold text-zinc-950 font-sans tracking-tight">Active Syncing in Progress</h3>
            <p className="text-xs text-zinc-650 max-w-xs mt-1 leading-relaxed">
              Auto-creating folders for SO <strong className="text-zinc-900 font-mono">#{oaNo4Digit}</strong> and uploading installation photographs directly to your Google Drive directory.
            </p>
            <p className="text-[10px] text-zinc-400 font-mono mt-4">Please do not close this window...</p>
          </div>
        )}

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
            type="button"
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
                  className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-500 font-medium bg-white"
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

              {/* SECTION: Put Price Setup */}
              <div className="col-span-2">
                <label className="block text-xs font-bold text-zinc-600 mb-1">Opening Budget / Contract Price (₹)</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-xs text-zinc-400 font-bold font-mono">₹</span>
                  <input
                    type="number"
                    value={formData.price !== undefined ? formData.price : 5000}
                    onChange={(e) => {
                      const val = Math.max(0, parseFloat(e.target.value) || 0);
                      setFormData(prev => {
                        if (!prev) return null;
                        return { ...prev, price: val };
                      });
                    }}
                    className="w-full pl-8 pr-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-500 font-bold font-mono text-zinc-800"
                    placeholder="e.g. 5000"
                    min="0"
                  />
                </div>
              </div>

              {/* SECTION: ERP Work Order PDF Upload */}
              <div className="col-span-2 bg-zinc-50/50 rounded-2xl border border-zinc-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-700 uppercase tracking-tight flex items-center gap-1.5">
                    <Paperclip className="w-4 h-4 text-zinc-500" />
                    ERP Work Order (PDF)
                  </span>
                  {formData.erpWorkOrder && (
                    <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                      Costing Verified
                    </span>
                  )}
                </div>

                {!formData.erpWorkOrder ? (
                  <div className="border border-dashed border-zinc-300 rounded-xl p-4 text-center hover:bg-zinc-100/50 transition relative">
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={handleErpPdfUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      id="erp-pdf-file-upload"
                    />
                    <div className="space-y-1">
                      <div className="inline-flex items-center justify-center p-2 bg-zinc-100 text-zinc-500 rounded-full border border-zinc-200">
                        <FileText className="w-5 h-5 text-indigo-500" />
                      </div>
                      <p className="text-xs font-bold text-zinc-700">Click or Drag to Upload ERP Work Order</p>
                      <p className="text-[10px] text-zinc-400 font-semibold font-mono uppercase">PDF Format Only</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white border border-zinc-200 rounded-xl p-3 flex items-center justify-between gap-3 shadow-3xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-100 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-zinc-900 truncate font-mono">{formData.erpWorkOrder.name}</p>
                        <p className="text-[10px] text-zinc-400 font-bold font-mono">
                          {formData.erpWorkOrder.size} &bull; {formData.erpWorkOrder.date}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={formData.erpWorkOrder.url}
                        download={formData.erpWorkOrder.name}
                        className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-500 hover:text-indigo-650 transition cursor-pointer"
                        title="Download ERP PDF"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                      <button
                        type="button"
                        onClick={handleRemoveErpPdf}
                        className="p-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-500 transition cursor-pointer"
                        title="Remove Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
                
                <p className="text-[9px] text-zinc-400 leading-normal font-semibold font-mono uppercase bg-zinc-100 p-2 rounded-lg border border-zinc-200/55">
                  📂 Path: {oaNo4Digit === '4027' ? (
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

            <div>
              <label className="block text-xs font-semibold text-zinc-600 mb-1">Door Specification / Name</label>
              <select
                name="doorName"
                value={formData.doorName}
                onChange={handleMetaChange}
                className="w-full px-3 py-2 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:border-zinc-500 font-medium bg-white"
              >
                {DOOR_TYPES.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          {/* New Financial Breakdowns list per Flat (Visual Aid) */}
          <div className="mt-4 bg-zinc-50 border border-zinc-200 rounded-2xl p-4 space-y-2">
            <div className="flex justify-between items-center text-xs font-extrabold text-zinc-800 uppercase tracking-tight pb-1.5 border-b border-zinc-200">
              <span>Financial Stages Breakdown (Percentage)</span>
              <span className="font-mono text-indigo-700">₹{getFlatTotalCompletedCost(formData).toLocaleString()} Earned</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: "frame_install", label: `Frame Install (${getFinancialStagePct("frame_install", 20)}%)`, color: "bg-emerald-500" },
                { id: "shutter_install", label: `Shutter Install (${getFinancialStagePct("shutter_install", 30)}%)`, color: "bg-blue-500" },
                { id: "hardware", label: `Hardware Fitting (${getFinancialStagePct("hardware", 20)}%)`, color: "bg-pink-500" },
                { id: "architrave", label: `Architrave Fixing (${getFinancialStagePct("architrave", 10)}%)`, color: "bg-amber-500" },
                { id: "seals_foams", label: `Seals/Foams/Desnagging (${getFinancialStagePct("seals_foams", 10)}%)`, color: "bg-teal-500" },
                { id: "handover", label: `Handover (${getFinancialStagePct("handover", 10)}%)`, color: "bg-indigo-500" }
              ].map(stg => {
                const pctVal = getFinancialStageProgress(formData, stg.id);
                const earnedPrice = getFinancialStageEarned(formData, stg.id);
                return (
                  <div key={stg.id} className="bg-white p-2 border border-zinc-150 rounded-xl space-y-1">
                    <div className="flex justify-between text-[10px] font-bold text-zinc-650">
                      <span className="truncate">{stg.label}</span>
                      <span className="font-mono text-zinc-900">{pctVal}%</span>
                    </div>
                    <div className="w-full bg-zinc-100 h-1 rounded-full overflow-hidden">
                      <div className={`h-full ${stg.color}`} style={{ width: `${pctVal}%` }} />
                    </div>
                    <div className="text-[9px] text-indigo-600 text-right font-black font-mono">
                      ₹{earnedPrice.toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Interactive Milestone Quality Toggles */}
          <div className="space-y-4 pt-4 border-t border-zinc-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50 border border-zinc-200 p-4 rounded-2xl">
              <div>
                <h3 className="text-xs font-extrabold text-zinc-500 uppercase tracking-wider">Quality Checkpoint Stages</h3>
                <span className="text-xs font-semibold text-zinc-700 font-mono">Current Tab Progress: {stageProgress}% Completed</span>
              </div>
              <button
                type="button"
                onClick={handleAllStagesBulkApproved}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-650 hover:bg-indigo-700 active:bg-indigo-800 text-white text-[10.5px] font-extrabold rounded-xl transition shadow-3xs cursor-pointer select-none tracking-wider uppercase shrink-0"
                title="Instantly set every checklist item across all 5 quality stages to 100% Approved"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>All Stages Approved (100%)</span>
              </button>
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
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleStageBulkUpdate(activeTab, true)}
                      className="text-[10px] font-bold text-indigo-650 hover:text-indigo-800 uppercase"
                      title="Approve all items in current tab only"
                    >
                      Fill Active Approved
                    </button>
                    <span className="text-zinc-300">|</span>
                    <button
                      type="button"
                      onClick={handleAllStagesBulkApproved}
                      className="text-[10px] font-extrabold text-emerald-650 hover:text-emerald-800 uppercase bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"
                      title="Approve all items in ALL stages at once"
                    >
                      FILL ALL APPROVED (ALL STAGES)
                    </button>
                    <span className="text-zinc-300">|</span>
                    <button
                      type="button"
                      onClick={() => handleStageBulkUpdate(activeTab, false)}
                      className="text-[10px] font-bold text-zinc-500 hover:text-zinc-800 uppercase"
                      title="Clear items in current tab"
                    >
                      Clear Active
                    </button>
                  </div>
                </div>

                {(() => {
                  const meta = MILESTONES.find(m => m.key === activeTab);
                  if (!meta) return null;
                  
                  const activeStageData = (formData[activeTab] || {}) as any;

                  return Object.keys(meta.subtaskLabels).map(taskKey => {
                    const currentStateKey = getSubtaskState(activeStageData[taskKey]);
                    const currentChoice = QUALITATIVE_CHOICES[currentStateKey] || QUALITATIVE_CHOICES['not_started'];
                    
                    // Format score representation label
                    const getMetricLabel = (chc: any) => {
                      if (chc.key === 'not_started') return '0%';
                      if (chc.key === 'not_approved') return '0%';
                      if (chc.key === 'rework_needed') return '50%';
                      if (chc.key === 'repair_reqd') return '60%';
                      if (chc.key === 'approved_remarks') return '80%';
                      if (chc.key === 'approved') return '100%';
                      if (chc.key === 'handed_over') return '100% (1)';
                      if (chc.key === 'rejected') return '-50%';
                      return `${Math.round(chc.weight * 100)}%`;
                    };

                    const getMetricColor = (chc: any) => {
                      if (chc.weight >= 1.0) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
                      if (chc.weight >= 0.8) return 'bg-teal-100 text-teal-850 border-teal-200';
                      if (chc.weight >= 0.5) return 'bg-amber-100 text-amber-800 border-amber-200';
                      if (chc.weight === 0.0) return 'bg-zinc-100 text-zinc-650 border-zinc-250';
                      if (chc.weight < 0.0) return 'bg-rose-100 text-rose-800 border-rose-200';
                      return 'bg-zinc-100 border-zinc-200 text-zinc-650';
                    };

                    return (
                      <div
                        key={taskKey}
                        className="p-3.5 rounded-xl border bg-white border-zinc-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:border-zinc-300 transition"
                      >
                        <span className="text-xs font-semibold text-zinc-700 leading-relaxed max-w-xs md:max-w-md">
                          {meta.subtaskLabels[taskKey]}
                        </span>
                        
                        <div className="flex items-center gap-1.5 xs:gap-2 self-start sm:self-auto shrink-0">
                          {/* Compliance Score Badge */}
                          <div className={`hidden xs:inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-black font-mono shrink-0 shadow-3xs ${getMetricColor(currentChoice)}`}>
                            <span className="text-zinc-400 font-semibold uppercase tracking-wider text-[8px]">Value:</span>
                            {getMetricLabel(currentChoice)}
                          </div>

                          <select
                            value={currentStateKey}
                            onChange={(e) => handleDropdownChange(activeTab, taskKey, e.target.value)}
                            className={`w-full sm:w-auto max-w-[170px] xs:max-w-[210px] sm:max-w-[250px] md:max-w-xs truncate px-3 py-1.5 border rounded-xl text-xs font-bold focus:outline-none focus:ring-1 focus:ring-zinc-400 cursor-pointer ${currentChoice.color}`}
                          >
                            {Object.values(QUALITATIVE_CHOICES).map(choice => (
                              <option key={choice.key} value={choice.key} className="bg-white text-zinc-800 font-medium">
                                ({getMetricLabel(choice)}) {choice.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>

              {/* Personnel Assigned, Contractor & Timestamps */}
              <div className="pt-4 border-t border-zinc-200/50 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-bold text-zinc-600 mb-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                    Inspected By
                  </label>
                  <select
                    value={formData[activeTab].doneBy || ""}
                    onChange={(e) => handleWorkerChange(activeTab, e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-zinc-500 bg-white font-medium"
                  >
                    <option value="">-- Unassigned --</option>
                    {supervisorList.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-600 mb-1 flex items-center gap-1">
                    <Hammer className="w-3.5 h-3.5 text-zinc-400" />
                    Contractor Name
                  </label>
                  <input
                    type="text"
                    value={formData[activeTab].contractor || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(prev => {
                        if (!prev) return null;
                        return {
                          ...prev,
                          [activeTab]: {
                            ...prev[activeTab],
                            contractor: val
                          }
                        };
                      });
                    }}
                    placeholder="e.g. Fine Wood Ltd"
                    className="w-full mt-1 px-3 py-1.5 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-zinc-500 bg-white font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-600 mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                      Timestamp Log
                    </span>
                    <button
                      type="button"
                      onClick={() => handleTimestampChange(activeTab, getLocalTimestamp())}
                      className="text-[10px] text-indigo-600 hover:text-indigo-800 font-extrabold transition-colors cursor-pointer"
                    >
                      Set Current Time
                    </button>
                  </label>
                  <input
                    type="datetime-local"
                    value={formData[activeTab].timestamp ? formData[activeTab].timestamp.substring(0, 16) : ""}
                    onChange={(e) => handleTimestampChange(activeTab, e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-zinc-500 bg-white font-medium font-mono cursor-pointer"
                  />
                </div>
              </div>

              {/* Site Installation Photos & Verification */}
              <div className="pt-5 border-t border-zinc-200/50 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-zinc-800 uppercase tracking-tight flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-zinc-500" />
                      Site Installation Photos
                    </span>
                    <p className="text-[10px] text-zinc-500 font-medium">Verify work progress with high-res photographs</p>
                  </div>
                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.5 rounded-full font-mono uppercase shrink-0">
                    Auto-Nomenclature: ON
                  </span>
                </div>

                {/* Upload Buttons Row */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Camera Upload Button */}
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handlePhotoUpload(e, true)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      id="camera-upload-input"
                    />
                    <label
                      htmlFor="camera-upload-input"
                      className="flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100/80 active:bg-indigo-200 text-indigo-750 text-xs font-bold rounded-xl border border-indigo-200 transition-all cursor-pointer shadow-3xs w-full text-center"
                    >
                      <Camera className="w-4 h-4 shrink-0" />
                      <span>Take Photo (Camera)</span>
                    </label>
                  </div>

                  {/* Gallery Upload Button */}
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, false)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      id="gallery-upload-input"
                    />
                    <label
                      htmlFor="gallery-upload-input"
                      className="flex items-center justify-center gap-2 px-3 py-2.5 bg-zinc-100 hover:bg-zinc-200/85 active:bg-zinc-300 text-zinc-700 text-xs font-bold rounded-xl border border-zinc-200 transition-all cursor-pointer shadow-3xs w-full text-center"
                    >
                      <Image className="w-4 h-4 shrink-0" />
                      <span>Upload from Gallery</span>
                    </label>
                  </div>
                </div>

                {/* Photos Grid Display */}
                {(() => {
                  const stagePhotos = (formData.photos || {})[activeTab] || [];
                  if (stagePhotos.length === 0) {
                    return (
                      <div className="bg-white border border-zinc-200 border-dashed rounded-xl p-6 text-center text-zinc-400 space-y-1">
                        <Image className="w-6 h-6 text-zinc-300 mx-auto" />
                        <p className="text-[11px] font-bold text-zinc-500">No installation photos uploaded yet</p>
                        <p className="text-[10px] text-zinc-400 font-medium leading-relaxed">
                          The <code className="font-mono bg-zinc-100 text-zinc-650 px-1 py-0.5 rounded border border-zinc-200">Site_Installation_Photos</code> folder will be <strong className="text-zinc-650">automatically created</strong> inside your Google Drive directory.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-2 gap-3 pt-1">
                      {stagePhotos.map((photo, pIdx) => (
                        <div
                          key={photo.id}
                          className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-3xs group relative flex flex-col justify-between"
                        >
                          {/* Image Thumbnail Container */}
                          <div className="relative aspect-4/3 bg-zinc-950 overflow-hidden group/img cursor-pointer" onClick={() => setZoomedPhoto({ url: photo.url, name: photo.name })}>
                            <img
                              src={photo.url}
                              alt={photo.name}
                              className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-200"
                            />
                            {/* Camera Icon Overlay indicator if taken via camera */}
                            {photo.isCamera && (
                              <span className="absolute top-2 left-2 bg-zinc-900/75 text-white p-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 backdrop-blur-xs">
                                <Camera className="w-3 h-3" />
                                Camera
                              </span>
                            )}
                          </div>

                          {/* Details & Action Bar */}
                          <div className="p-2 space-y-1.5 border-t border-zinc-100">
                            <div className="min-w-0">
                              <p className="text-[10px] font-black font-mono text-zinc-900 truncate" title={photo.name}>
                                {photo.name}
                              </p>
                              <p className="text-[9px] text-zinc-400 font-bold font-mono">
                                {photo.date}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <a
                                href={photo.url}
                                download={`${photo.name}.jpg`}
                                className="flex-1 py-1 px-1.5 border border-zinc-200 hover:border-zinc-300 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition cursor-pointer"
                                title="Download image with proper nomenclature"
                              >
                                <Download className="w-3 h-3 text-zinc-500" />
                                <span>Download</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(photo.id)}
                                className="py-1 px-1.5 border border-rose-100 hover:border-rose-200 bg-rose-50/55 hover:bg-rose-50 text-rose-600 rounded-lg text-[10px] font-bold flex items-center justify-center transition cursor-pointer"
                                title="Delete Photo"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Google Drive Interactive Directory Tree */}
                <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 space-y-2.5 shadow-3xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold text-zinc-500 uppercase tracking-wider font-mono">
                      Google Drive Sync Target
                    </span>
                    {googleToken ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active Sync: Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold bg-amber-55 text-amber-850 border border-amber-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        Offline / Local State
                      </span>
                    )}
                  </div>

                  {!googleToken && (
                    <div className="bg-amber-50/50 border border-amber-200/50 rounded-lg p-2.5 flex flex-col sm:flex-row items-center justify-between gap-3">
                      <p className="text-[10px] text-amber-850 font-medium leading-relaxed">
                        Connect Google Drive to auto-create folder hierarchies & upload installation photos on save.
                      </p>
                      <button
                        type="button"
                        onClick={handleConnectGoogle}
                        disabled={isSyncing}
                        className="w-full sm:w-auto px-2.5 py-1.5 bg-amber-600 hover:bg-amber-750 text-white rounded-lg text-[10px] font-extrabold transition shrink-0 shadow-3xs cursor-pointer whitespace-nowrap disabled:opacity-50"
                      >
                        {isSyncing ? "Connecting..." : "🔗 Connect Google"}
                      </button>
                    </div>
                  )}

                  {googleToken ? (
                    <div className="text-[9.5px] bg-indigo-50/50 text-indigo-900 border border-indigo-150 p-2 rounded-lg leading-relaxed font-semibold">
                      💡 <strong>Permissions Update:</strong> If you see duplicate SO folders (like for 4068, 4109), please <strong>Sign Out</strong> in the main <strong>Google Sheets Tab</strong> and sign back in to authorize the new shared folder search permission.
                    </div>
                  ) : null}

                  {syncError && (
                    <p className="text-[9.5px] text-rose-600 font-bold font-mono bg-rose-50 border border-rose-100 p-2 rounded-lg">
                      ⚠️ {syncError}
                    </p>
                  )}

                  {/* Directory Tree */}
                  {oaNo4Digit === '4027' ? (
                    <div className="font-mono text-[10px] text-zinc-600 bg-white border border-zinc-200 rounded-lg p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <span>📁</span> <a href="https://drive.google.com/drive/u/0/folders/1xcRODlPVO19nbHIlbF3tomz1ruSnaRFz" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-650 hover:underline">4027 - Site Supervisor Folder</a>
                      </div>
                      <div className="flex items-center justify-between pl-3 text-indigo-700">
                        <div className="flex items-center gap-1.5">
                          <span>└── 📁</span> <span className="font-extrabold text-indigo-850">Site_Installation_Photos</span>
                        </div>
                        <span className="text-[8px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100/70 px-1.5 py-0.5 rounded-sm uppercase tracking-wide font-mono scale-90">
                          Auto-Creates
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="font-mono text-[10px] text-zinc-600 bg-white border border-zinc-200 rounded-lg p-3 space-y-1">
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <span>📁</span> <a href="https://drive.google.com/drive/u/0/folders/133DwBuxmLdK9PozyOfJS8XkRrAxJxi8-" target="_blank" rel="noopener noreferrer" className="font-bold text-indigo-650 hover:underline">Google Drive (Shared Master)</a>
                      </div>
                      <div className="flex items-center gap-1.5 pl-3 text-zinc-500">
                        <span>└── 📁</span> <span className="font-bold text-zinc-700">{oaNo4Digit}</span>
                      </div>
                      <div className="flex items-center gap-1.5 pl-6 text-zinc-650">
                        <span>└── 📁</span> <span className="font-bold text-zinc-800">{oaNo4Digit} - Site Supervisor Folder</span>
                      </div>
                      <div className="flex items-center justify-between pl-9 text-indigo-700">
                        <div className="flex items-center gap-1.5">
                          <span>└── 📁</span> <span className="font-extrabold text-indigo-850">Site_Installation_Photos</span>
                        </div>
                        <span className="text-[8px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100/70 px-1.5 py-0.5 rounded-sm uppercase tracking-wide font-mono scale-90">
                          Auto-Creates
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Open in Drive action */}
                  <div className="flex items-center justify-between gap-3 pt-0.5">
                    <p className="text-[9px] text-zinc-400 font-semibold leading-normal uppercase">
                      Automatic sequential nomenclature upload target
                    </p>
                    <a
                      href={oaNo4Digit === '4027' ? "https://drive.google.com/drive/u/0/folders/1xcRODlPVO19nbHIlbF3tomz1ruSnaRFz" : "https://drive.google.com/drive/u/0/folders/133DwBuxmLdK9PozyOfJS8XkRrAxJxi8-"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-[10px] font-extrabold rounded-lg transition shrink-0 shadow-sm cursor-pointer"
                    >
                      <span>{oaNo4Digit === '4027' ? 'Open Supervisor Folder' : 'Open Shared Drive'}</span>
                      <span className="text-indigo-200 font-normal">→</span>
                    </a>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </form>

        {/* Action Buttons */}
        <div className="p-4 sm:p-6 border-t border-zinc-100 bg-zinc-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Left/Secondary Actions */}
            <div className="flex flex-row items-center gap-2 order-2 sm:order-1 w-full sm:w-auto">
              {formData.id !== 'NEW' && onDelete && (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition-colors cursor-pointer min-h-[44px] sm:min-h-[38px]"
                >
                  <Trash2 className="w-4 h-4 text-rose-550" />
                  <span>Remove</span>
                </button>
              )}

              {formData.id !== 'NEW' && (
                <button
                  type="button"
                  onClick={handleDownloadReport}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-800 text-xs font-bold rounded-xl border border-indigo-200 transition-colors cursor-pointer min-h-[44px] sm:min-h-[38px]"
                >
                  <Download className="w-4 h-4 text-indigo-600" />
                  <span className="whitespace-nowrap">PDF Certificate</span>
                </button>
              )}
            </div>

            {/* Right/Primary Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5 order-1 sm:order-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={isSyncing}
                className="inline-flex items-center justify-center px-5 py-2.5 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-500 bg-white hover:bg-zinc-50 disabled:opacity-50 transition-colors cursor-pointer min-h-[44px] sm:min-h-[38px]"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSyncing}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl text-sm sm:text-xs font-extrabold shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/25 active:scale-[0.98] transition-all whitespace-nowrap cursor-pointer min-h-[48px] sm:min-h-[38px] text-center"
              >
                {isSyncing ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin text-white" />
                    <span>Syncing & Uploading...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4.5 h-4.5 sm:w-4 sm:h-4" />
                    <span>Save Record</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Custom Modal Confirmation for Single Room Log Delete */}
      {confirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-[2px] animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-zinc-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-650">
              <div className="p-2 bg-rose-50 rounded-xl border border-rose-100">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="font-extrabold text-zinc-900 text-base leading-tight font-sans">Delete Opening Log?</h3>
            </div>
            
            <p className="text-xs text-zinc-500 leading-relaxed">
              Are you sure you want to delete this flat opening log? This action cannot be easily undone.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  if (onDelete) {
                    onDelete(formData.id);
                  }
                  onClose();
                  setConfirmingDelete(false);
                }}
                className="flex-1 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs rounded-xl transition duration-150 shadow-sm cursor-pointer"
              >
                Yes, Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 active:bg-zinc-300 text-zinc-700 font-bold text-xs rounded-xl border border-zinc-200 transition duration-150 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Zoom Dialog */}
      {zoomedPhoto && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-950/85 backdrop-blur-md animate-fadeIn" onClick={() => setZoomedPhoto(null)}>
          <div className="relative max-w-2xl w-full bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-zinc-850 flex flex-col animate-scaleUp" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between text-white bg-zinc-950">
              <span className="text-xs font-bold font-mono text-zinc-400 tracking-wider truncate">{zoomedPhoto.name}</span>
              <button
                type="button"
                onClick={() => setZoomedPhoto(null)}
                className="p-1 rounded-lg border border-zinc-850 hover:bg-zinc-800 transition text-zinc-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {/* Zoomed Image */}
            <div className="p-2 bg-zinc-950 flex items-center justify-center min-h-[300px] max-h-[70vh]">
              <img
                src={zoomedPhoto.url}
                alt={zoomedPhoto.name}
                className="max-w-full max-h-[65vh] object-contain rounded-xl select-none"
              />
            </div>
            {/* Footer Location path info */}
            <div className="p-4 bg-zinc-950 border-t border-zinc-800 text-center">
              <p className="text-[10px] text-zinc-500 font-bold font-mono uppercase tracking-wide">
                📁 Saved in Site Installation Photos &bull; Sequential Nomenclature
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
