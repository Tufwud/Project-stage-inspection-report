import { FlatRecord, MilestoneKey, MILESTONES, QUALITATIVE_CHOICES, QualitativeState } from './types';

// Helper to get weight of a subtask (0.0 to 1.0, or -0.5 for rejected)
export function getSubtaskWeight(val: boolean | string | undefined | null): number {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'boolean') {
    return val ? 1.0 : 0.0;
  }
  if (typeof val === 'string') {
    if (val === 'Y' || val.toLowerCase() === 'true' || val === '1') return 1.0;
    if (val === 'N' || val.toLowerCase() === 'false' || val === '0') return 0.0;
    
    const record = QUALITATIVE_CHOICES[val as QualitativeState];
    if (record) return record.weight;
  }
  return 0;
}

// Helper to get qualitative key of a subtask
export function getSubtaskState(val: boolean | string | undefined | null): QualitativeState {
  if (!val) return 'not_started';
  if (val === true) return 'approved';
  if (val === 'Y') return 'approved';
  if (val === 'N') return 'not_started';
  if (typeof val === 'string' && QUALITATIVE_CHOICES[val as QualitativeState]) {
    return val as QualitativeState;
  }
  return 'not_started';
}

export interface FinancialStage {
  id: string;
  label: string;
  pct: number;
  checkpoints: Array<{ milestone: MilestoneKey, key: string }>;
}

export const FINANCIAL_STAGES: FinancialStage[] = [
  {
    id: "frame_install",
    label: "Frame Installation",
    pct: 20,
    checkpoints: [
      { milestone: 'frameFixing', key: 'fastenerFixing' },
      { milestone: 'frameFixing', key: 'frameLockAreaFinish' },
    ]
  },
  {
    id: "shutter_install",
    label: "Shutter Installation",
    pct: 30,
    checkpoints: [
      { milestone: 'doorFixing', key: 'shutterEdgeFinishing' },
      { milestone: 'doorFixing', key: 'gapBetweenFrameAndShutter' },
    ]
  },
  {
    id: "hardware",
    label: "Hardware Fitting",
    pct: 20,
    checkpoints: [
      { milestone: 'hardwareFixing', key: 'hingeFitting' },
      { milestone: 'hardwareFixing', key: 'lockWithHandleFitting' },
      { milestone: 'hardwareFixing', key: 'eyeviewInstallation' },
      { milestone: 'hardwareFixing', key: 'towerBoltInstallation' },
      { milestone: 'hardwareFixing', key: 'doorCloserInstallation' },
      { milestone: 'hardwareFixing', key: 'autoDropSealInstallation' },
    ]
  },
  {
    id: "architrave",
    label: "Architrave Fixing",
    pct: 10,
    checkpoints: [
      { milestone: 'frameFixing', key: 'outsideArchitraveFixing' },
      { milestone: 'frameFixing', key: 'insideArchitraveFixing' },
    ]
  },
  {
    id: "seals_foams",
    label: "Seals/Foams/Desnagging",
    pct: 10,
    checkpoints: [
      { milestone: 'doorFixing', key: 'iSealFixing' },
      { milestone: 'doorFixing', key: 'visionGlassBeatFinishing' },
    ]
  },
  {
    id: "painting",
    label: "Touch-up & Painting",
    pct: 5,
    checkpoints: [
      { milestone: 'painting', key: 'frameCarpatchFillingSanding' },
      { milestone: 'painting', key: 'frameTouchUp' },
      { milestone: 'painting', key: 'shutterEdgeFinishing' },
      { milestone: 'painting', key: 'lockSlotAreaFinishing' },
      { milestone: 'painting', key: 'shutterTouchUp' },
    ]
  },
  {
    id: "handover",
    label: "Handover",
    pct: 5,
    checkpoints: [
      { milestone: 'handover', key: 'hardwareCleaning' },
      { milestone: 'handover', key: 'plasticCoverRemoval' },
      { milestone: 'handover', key: 'keysHandover' },
    ]
  }
];

export function getFinancialStageProgress(flat: FlatRecord, stageId: string): number {
  const stage = FINANCIAL_STAGES.find(s => s.id === stageId);
  if (!stage) return 0;
  let totalWeight = 0;
  stage.checkpoints.forEach(chk => {
    const section = flat[chk.milestone] as any;
    const val = section ? section[chk.key] : null;
    totalWeight += getSubtaskWeight(val);
  });
  const avg = totalWeight / stage.checkpoints.length;
  return Math.round(Math.max(0, avg) * 100);
}

export function getFlatBasePrice(flat: FlatRecord): number {
  return flat.price !== undefined ? flat.price : 5000;
}

export function getFinancialStagePct(stageId: string, defaultPct: number): number {
  try {
    const saved = localStorage.getItem("door_quality_compliance_dashboard_stage_percentages");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed[stageId] === 'number') {
        return parsed[stageId];
      }
    }
  } catch (e) {}
  return defaultPct;
}

export function getFinancialStageEarned(flat: FlatRecord, stageId: string): number {
  const stage = FINANCIAL_STAGES.find(s => s.id === stageId);
  if (!stage) return 0;
  const basePrice = getFlatBasePrice(flat);
  const pct = getFinancialStagePct(stageId, stage.pct);
  const stageAllocated = (pct / 100) * basePrice;
  const progressPct = getFinancialStageProgress(flat, stageId);
  return Math.round(stageAllocated * (progressPct / 100));
}

export function getFlatTotalCompletedCost(flat: FlatRecord): number {
  return FINANCIAL_STAGES.reduce((sum, s) => sum + getFinancialStageEarned(flat, s.id), 0);
}

// Calculates the progress of a specific milestone, or the overall flat progress
export function getMilestoneProgress(flat: FlatRecord, key: MilestoneKey): number {
  switch (key) {
    case 'frameFixing': {
      const f = flat.frameFixing;
      const count = getSubtaskWeight(f.fastenerFixing) + 
                    getSubtaskWeight(f.frameLockAreaFinish) + 
                    getSubtaskWeight(f.outsideArchitraveFixing) + 
                    getSubtaskWeight(f.insideArchitraveFixing);
      return Math.round(Math.max(0, count / 4) * 100);
    }
    case 'doorFixing': {
      const f = flat.doorFixing;
      const count = getSubtaskWeight(f.shutterEdgeFinishing) + 
                    getSubtaskWeight(f.gapBetweenFrameAndShutter) + 
                    getSubtaskWeight(f.iSealFixing) + 
                    getSubtaskWeight(f.visionGlassBeatFinishing);
      return Math.round(Math.max(0, count / 4) * 100);
    }
    case 'hardwareFixing': {
      const f = flat.hardwareFixing;
      const count = getSubtaskWeight(f.hingeFitting) + 
                    getSubtaskWeight(f.lockWithHandleFitting) + 
                    getSubtaskWeight(f.eyeviewInstallation) + 
                    getSubtaskWeight(f.towerBoltInstallation) + 
                    getSubtaskWeight(f.doorCloserInstallation) + 
                    getSubtaskWeight(f.autoDropSealInstallation);
      return Math.round(Math.max(0, count / 6) * 100);
    }
    case 'painting': {
      const f = flat.painting || {} as any;
      const count = getSubtaskWeight(f.frameCarpatchFillingSanding) + 
                    getSubtaskWeight(f.frameTouchUp) + 
                    getSubtaskWeight(f.shutterEdgeFinishing) + 
                    getSubtaskWeight(f.lockSlotAreaFinishing) + 
                    getSubtaskWeight(f.shutterTouchUp);
      return Math.round(Math.max(0, count / 5) * 100);
    }
    case 'handover': {
      const f = flat.handover;
      const count = getSubtaskWeight(f.hardwareCleaning) + 
                    getSubtaskWeight(f.plasticCoverRemoval) + 
                    getSubtaskWeight(f.keysHandover);
      return Math.round(Math.max(0, count / 3) * 100);
    }
  }
}

// Calculate the global flat progress (unweighted average of all 22 checkboxes)
export function getFlatOverallProgress(flat: FlatRecord): number {
  const fCount = getSubtaskWeight(flat.frameFixing.fastenerFixing) + 
                 getSubtaskWeight(flat.frameFixing.frameLockAreaFinish) + 
                 getSubtaskWeight(flat.frameFixing.outsideArchitraveFixing) + 
                 getSubtaskWeight(flat.frameFixing.insideArchitraveFixing);

  const dCount = getSubtaskWeight(flat.doorFixing.shutterEdgeFinishing) + 
                 getSubtaskWeight(flat.doorFixing.gapBetweenFrameAndShutter) + 
                 getSubtaskWeight(flat.doorFixing.iSealFixing) + 
                 getSubtaskWeight(flat.doorFixing.visionGlassBeatFinishing);

  const hwCount = getSubtaskWeight(flat.hardwareFixing.hingeFitting) + 
                  getSubtaskWeight(flat.hardwareFixing.lockWithHandleFitting) + 
                  getSubtaskWeight(flat.hardwareFixing.eyeviewInstallation) + 
                  getSubtaskWeight(flat.hardwareFixing.towerBoltInstallation) + 
                  getSubtaskWeight(flat.hardwareFixing.doorCloserInstallation) + 
                  getSubtaskWeight(flat.hardwareFixing.autoDropSealInstallation);

  const pCount = flat.painting ? (
                 getSubtaskWeight(flat.painting.frameCarpatchFillingSanding) + 
                 getSubtaskWeight(flat.painting.frameTouchUp) + 
                 getSubtaskWeight(flat.painting.shutterEdgeFinishing) + 
                 getSubtaskWeight(flat.painting.lockSlotAreaFinishing) + 
                 getSubtaskWeight(flat.painting.shutterTouchUp)
  ) : 0;

  const hoCount = getSubtaskWeight(flat.handover.hardwareCleaning) + 
                  getSubtaskWeight(flat.handover.plasticCoverRemoval) + 
                  getSubtaskWeight(flat.handover.keysHandover);

  const totalChecked = fCount + dCount + hwCount + pCount + hoCount;
  return Math.round(Math.max(0, totalChecked / 22) * 100);
}

// Get aggregate project statistics
export function getProjectAnalysis(flats: FlatRecord[]) {
  const totalFlats = flats.length;
  if (totalFlats === 0) {
    return {
      totalFlats: 0,
      overallProgress: 0,
      completedFlatsCount: 0,
      inProgressFlatsCount: 0,
      notStartedFlatsCount: 0,
      totalProjectBudget: 0,
      totalCompletedCost: 0,
      stageAverages: { frameFixing: 0, doorFixing: 0, hardwareFixing: 0, painting: 0, handover: 0 },
      towerAverages: {},
      subtaskAnalysis: []
    };
  }

  let totalOverallProgress = 0;
  let completedFlatsCount = 0;
  let inProgressFlatsCount = 0;
  let notStartedFlatsCount = 0;
  let totalProjectBudget = 0;
  let totalCompletedCost = 0;

  let totalFF = 0;
  let totalDF = 0;
  let totalHW = 0;
  let totalPT = 0;
  let totalHO = 0;

  flats.forEach(flat => {
    const overall = getFlatOverallProgress(flat);
    totalOverallProgress += overall;

    if (overall === 100) {
      completedFlatsCount++;
    } else if (overall > 0) {
      inProgressFlatsCount++;
    } else {
      notStartedFlatsCount++;
    }

    totalFF += getMilestoneProgress(flat, 'frameFixing');
    totalDF += getMilestoneProgress(flat, 'doorFixing');
    totalHW += getMilestoneProgress(flat, 'hardwareFixing');
    totalPT += getMilestoneProgress(flat, 'painting');
    totalHO += getMilestoneProgress(flat, 'handover');

    totalProjectBudget += getFlatBasePrice(flat);
    totalCompletedCost += getFlatTotalCompletedCost(flat);
  });

  const overallProgress = Math.round(totalOverallProgress / totalFlats);

  // Group by Tower
  const towerStats: { [towerId: string]: { total: number, sum: number, avg: number, budget: number, completed: number } } = {};
  flats.forEach(flat => {
    const p = getFlatOverallProgress(flat);
    const b = getFlatBasePrice(flat);
    const c = getFlatTotalCompletedCost(flat);
    if (!towerStats[flat.towerId]) {
      towerStats[flat.towerId] = { total: 0, sum: 0, avg: 0, budget: 0, completed: 0 };
    }
    towerStats[flat.towerId].total += 1;
    towerStats[flat.towerId].sum += p;
    towerStats[flat.towerId].budget += b;
    towerStats[flat.towerId].completed += c;
  });

  const towerAverages = Object.keys(towerStats).reduce((acc, tid) => {
    const item = towerStats[tid];
    acc[tid] = {
      count: item.total,
      avg: Math.round(item.sum / item.total),
      budget: item.budget,
      completed: item.completed
    };
    return acc;
  }, {} as { [tid: string]: { count: number, avg: number, budget: number, completed: number } });

  // Analyze individual subtasks
  const subtaskAnalysis: Array<{ milestone: string, key: string, label: string, completedPercentage: number }> = [];

  MILESTONES.forEach(milestone => {
    Object.keys(milestone.subtaskLabels).forEach(subKey => {
      let completedCount = 0;
      flats.forEach(flat => {
        const stageObj = flat[milestone.key] as any;
        if (stageObj) {
          completedCount += getSubtaskWeight(stageObj[subKey]);
        }
      });
      const pct = totalFlats > 0 ? Math.round((completedCount / totalFlats) * 100) : 0;
      subtaskAnalysis.push({
        milestone: milestone.label,
        key: subKey,
        label: milestone.subtaskLabels[subKey],
        completedPercentage: pct
      });
    });
  });

  return {
    totalFlats,
    overallProgress,
    completedFlatsCount,
    inProgressFlatsCount,
    notStartedFlatsCount,
    totalProjectBudget,
    totalCompletedCost,
    stageAverages: {
      frameFixing: Math.round(totalFF / totalFlats),
      doorFixing: Math.round(totalDF / totalFlats),
      hardwareFixing: Math.round(totalHW / totalFlats),
      painting: Math.round(totalPT / totalFlats),
      handover: Math.round(totalHO / totalFlats)
    },
    towerAverages,
    subtaskAnalysis
  };
}

// Convert a flat records list to a beautifully formatted table matching the user's specific headers
export function convertToCSV(flats: FlatRecord[]): string {
  // Line 1: Header groupings
  const topHeader = [
    ",,,,,,,,,", // first 9 columns instead of 7 (added Contract Cost, Earned Amount)
    "Frame Fixing,Frame Fixing,Frame Fixing,Frame Fixing,Frame Fixing,Frame Fixing,", // 6 cols
    "Door fixing,Door fixing,Door fixing,Door fixing,Door fixing,Door fixing,", // 6 cols
    "Hardware fixing,Hardware fixing,Hardware fixing,Hardware fixing,Hardware fixing,Hardware fixing,Hardware fixing,Hardware fixing,", // 8 cols
    "Touch-up & Painting,Touch-up & Painting,Touch-up & Painting,Touch-up & Painting,Touch-up & Painting,Touch-up & Painting,Touch-up & Painting,", // 7 cols
    "Handover,Handover,Handover,Handover,Handover" // 5 cols
  ].join("");

  // Line 2: Actual Keys
  const itemHeaders = [
    "ID", "OA No", "Tower ID", "Flats/Floor", "Floor", "Flat No", "Door Name", "Contract Cost", "Earned Amount",
    "Frame Fixing - Fastener fixing", "Frame Fixing - Frame lock area finish", "Frame Fixing - Outside architrave fixing", "Frame Fixing - Inside architrave fixing", "Frame Fixing - Done By", "Frame Fixing - Timestamp",
    "Door fixing - Shutter edge finishing", "Door fixing - Gap between frame and shutter", "Door fixing - I seal fixing", "Door fixing - Vision glass beat finishing", "Door fixing - Done By", "Door fixing - Timestamp",
    "Hardware fixing - Hinge fitting", "Hardware fixing - Lock with handle fitting", "Hardware fixing - Eyeview installation", "Hardware fixing - Tower bolt installation", "Hardware fixing - Door closer installation", "Hardware fixing - Auto drop seal installation", "Hardware fixing - Done By", "Hardware fixing - Timestamp",
    "Touch-up & Painting - Frame carpatch filling & sanding", "Touch-up & Painting - Frame Touch-up", "Touch-up & Painting - Shutter edge finishing", "Touch-up & Painting - Lock slot area finishing", "Touch-up & Painting - Shutter Touch-up", "Touch-up & Painting - Done By", "Touch-up & Painting - Timestamp",
    "Handover - Hardware cleaning", "Handover - Plastic cover removal", "Handover - Keys handover", "Handover - Done By", "Handover - Timestamp"
  ];

  const rows = flats.map(flat => {
    return [
      flat.id,
      `"${flat.oaNo}"`,
      `"${flat.towerId}"`,
      flat.flatsPerFloor,
      flat.floor,
      `"${flat.flatNo}"`,
      `"${flat.doorName}"`,
      getFlatBasePrice(flat),
      getFlatTotalCompletedCost(flat),
      
      // Frame fixing
      getSubtaskState(flat.frameFixing.fastenerFixing),
      getSubtaskState(flat.frameFixing.frameLockAreaFinish),
      getSubtaskState(flat.frameFixing.outsideArchitraveFixing),
      getSubtaskState(flat.frameFixing.insideArchitraveFixing),
      `"${flat.frameFixing.doneBy}"`,
      flat.frameFixing.timestamp,

      // Door fixing
      getSubtaskState(flat.doorFixing.shutterEdgeFinishing),
      getSubtaskState(flat.doorFixing.gapBetweenFrameAndShutter),
      getSubtaskState(flat.doorFixing.iSealFixing),
      getSubtaskState(flat.doorFixing.visionGlassBeatFinishing),
      `"${flat.doorFixing.doneBy}"`,
      flat.doorFixing.timestamp,

      // Hardware fixing
      getSubtaskState(flat.hardwareFixing.hingeFitting),
      getSubtaskState(flat.hardwareFixing.lockWithHandleFitting),
      getSubtaskState(flat.hardwareFixing.eyeviewInstallation),
      getSubtaskState(flat.hardwareFixing.towerBoltInstallation),
      getSubtaskState(flat.hardwareFixing.doorCloserInstallation),
      getSubtaskState(flat.hardwareFixing.autoDropSealInstallation),
      `"${flat.hardwareFixing.doneBy}"`,
      flat.hardwareFixing.timestamp,

      // Touch-up & Painting
      getSubtaskState(flat.painting?.frameCarpatchFillingSanding),
      getSubtaskState(flat.painting?.frameTouchUp),
      getSubtaskState(flat.painting?.shutterEdgeFinishing),
      getSubtaskState(flat.painting?.lockSlotAreaFinishing),
      getSubtaskState(flat.painting?.shutterTouchUp),
      `"${flat.painting?.doneBy || ''}"`,
      flat.painting?.timestamp || '',

      // Handover
      getSubtaskState(flat.handover.hardwareCleaning),
      getSubtaskState(flat.handover.plasticCoverRemoval),
      getSubtaskState(flat.handover.keysHandover),
      `"${flat.handover.doneBy || ''}"`,
      flat.handover.timestamp
    ].join(",");
  });

  return [topHeader, itemHeaders.join(","), ...rows].join("\n");
}

// Convert cell text value to state key
function parseState(val: string): boolean | QualitativeState {
  if (!val) return 'not_started';
  const v = val.trim().toLowerCase();
  
  // Backwards compatibility with standard CSV exports (Y/N/Yes/No)
  if (v === 'y' || v === 'yes' || v === 'true' || v === '1') return 'approved';
  if (v === 'n' || v === 'no' || v === 'false' || v === '0') return 'not_started';

  // Map directly if valid state
  if (QUALITATIVE_CHOICES[v as QualitativeState]) {
    return v as QualitativeState;
  }
  return 'not_started';
}

// Robust CSV line parser that handles commas inside quotes and empty fields correctly
export function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// Parse imported CSV into FlatRecord objects
export function parseCSVToFlats(csvContent: string): FlatRecord[] {
  const lines = csvContent.split(/\r?\n/).filter(l => l.trim() !== '');
  if (lines.length < 2) return [];

  // Find the header line that has "ID" or "Flat No"
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().includes('id') && lines[i].toLowerCase().includes('flat no')) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    headerIndex = lines.length > 1 ? 1 : 0;
  }

  const dataLines = lines.slice(headerIndex + 1);
  const parsedRecords: FlatRecord[] = [];

  dataLines.forEach((line, index) => {
    const item = parseCSVLine(line).map(m => m.trim().replace(/^"|"$/g, ''));
    
    if (item.length < 7) return; // incomplete metadata row

    const id = item[0] || `REC-IMPORT-${index + 1}`;
    const oaNo = item[1] || 'OA-UNKNOWN';
    const towerId = item[2] || 'Tower Undefined';
    const flatsPerFloor = parseInt(item[3]) || 4;
    const floor = parseInt(item[4]) || 1;
    const flatNo = item[5] || '101';
    const doorName = item[6] || 'Main Door';
    const cost = parseFloat(item[7]) || 5000;

    // Standard items are offset dynamically because contract cost and earned amount were added as indices 7 and 8
    const hasCostColumns = !isNaN(parseFloat(item[7]));
    const offset = hasCostColumns ? 9 : 7;

    parsedRecords.push({
      id,
      oaNo,
      towerId,
      flatsPerFloor,
      floor,
      flatNo,
      doorName,
      price: hasCostColumns ? cost : 5000,
      frameFixing: {
        fastenerFixing: parseState(item[0 + offset]),
        frameLockAreaFinish: parseState(item[1 + offset]),
        outsideArchitraveFixing: parseState(item[2 + offset]),
        insideArchitraveFixing: parseState(item[3 + offset]),
        doneBy: item[4 + offset] || '',
        timestamp: item[5 + offset] || ''
      },
      doorFixing: {
        shutterEdgeFinishing: parseState(item[6 + offset]),
        gapBetweenFrameAndShutter: parseState(item[7 + offset]),
        iSealFixing: parseState(item[8 + offset]),
        visionGlassBeatFinishing: parseState(item[9 + offset]),
        doneBy: item[10 + offset] || '',
        timestamp: item[11 + offset] || ''
      },
      hardwareFixing: {
        hingeFitting: parseState(item[12 + offset]),
        lockWithHandleFitting: parseState(item[13 + offset]),
        eyeviewInstallation: parseState(item[14 + offset]),
        towerBoltInstallation: parseState(item[15 + offset]),
        doorCloserInstallation: parseState(item[16 + offset]),
        autoDropSealInstallation: parseState(item[17 + offset]),
        doneBy: item[18 + offset] || '',
        timestamp: item[19 + offset] || ''
      },
      painting: {
        frameCarpatchFillingSanding: parseState(item[20 + offset]),
        frameTouchUp: parseState(item[21 + offset]),
        shutterEdgeFinishing: parseState(item[22 + offset]),
        lockSlotAreaFinishing: parseState(item[23 + offset]),
        shutterTouchUp: parseState(item[24 + offset]),
        doneBy: item[25 + offset] || '',
        timestamp: item[26 + offset] || ''
      },
      handover: {
        hardwareCleaning: parseState(item[27 + offset]),
        plasticCoverRemoval: parseState(item[28 + offset]),
        keysHandover: parseState(item[29 + offset]),
        doneBy: item[30 + offset] || '',
        timestamp: item[31 + offset] || ''
      }
    });
  });

  return parsedRecords.filter(r => r.flatNo);
}
