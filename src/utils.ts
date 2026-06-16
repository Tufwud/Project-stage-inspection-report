import { FlatRecord, MilestoneKey, MILESTONES } from './types';

// Calculates the progress of a specific milestone, or the overall flat progress
export function getMilestoneProgress(flat: FlatRecord, key: MilestoneKey): number {
  switch (key) {
    case 'frameFixing': {
      const f = flat.frameFixing;
      const count = (f.fastenerFixing ? 1 : 0) + 
                    (f.frameLockAreaFinish ? 1 : 0) + 
                    (f.outsideArchitraveFixing ? 1 : 0) + 
                    (f.insideArchitraveFixing ? 1 : 0);
      return Math.round((count / 4) * 100);
    }
    case 'doorFixing': {
      const f = flat.doorFixing;
      const count = (f.shutterEdgeFinishing ? 1 : 0) + 
                    (f.gapBetweenFrameAndShutter ? 1 : 0) + 
                    (f.iSealFixing ? 1 : 0) + 
                    (f.visionGlassBeatFinishing ? 1 : 0);
      return Math.round((count / 4) * 100);
    }
    case 'hardwareFixing': {
      const f = flat.hardwareFixing;
      const count = (f.hingeFitting ? 1 : 0) + 
                    (f.lockWithHandleFitting ? 1 : 0) + 
                    (f.eyeviewInstallation ? 1 : 0) + 
                    (f.towerBoltInstallation ? 1 : 0) + 
                    (f.doorCloserInstallation ? 1 : 0) + 
                    (f.autoDropSealInstallation ? 1 : 0);
      return Math.round((count / 6) * 100);
    }
    case 'handover': {
      const f = flat.handover;
      const count = (f.frameCarpatchFillingSanding ? 1 : 0) + 
                    (f.frameTouchUp ? 1 : 0) + 
                    (f.shutterEdgeFinishing ? 1 : 0) + 
                    (f.lockSlotAreaFinishing ? 1 : 0) + 
                    (f.shutterTouchUp ? 1 : 0) + 
                    (f.hardwareCleaning ? 1 : 0) + 
                    (f.plasticCoverRemoval ? 1 : 0) + 
                    (f.keysHandover ? 1 : 0);
      return Math.round((count / 8) * 100);
    }
  }
}

// Calculate the global flat progress (unweighted average of all 22 checkboxes)
export function getFlatOverallProgress(flat: FlatRecord): number {
  const fCount = (flat.frameFixing.fastenerFixing ? 1 : 0) + 
                 (flat.frameFixing.frameLockAreaFinish ? 1 : 0) + 
                 (flat.frameFixing.outsideArchitraveFixing ? 1 : 0) + 
                 (flat.frameFixing.insideArchitraveFixing ? 1 : 0);

  const dCount = (flat.doorFixing.shutterEdgeFinishing ? 1 : 0) + 
                 (flat.doorFixing.gapBetweenFrameAndShutter ? 1 : 0) + 
                 (flat.doorFixing.iSealFixing ? 1 : 0) + 
                 (flat.doorFixing.visionGlassBeatFinishing ? 1 : 0);

  const hwCount = (flat.hardwareFixing.hingeFitting ? 1 : 0) + 
                  (flat.hardwareFixing.lockWithHandleFitting ? 1 : 0) + 
                  (flat.hardwareFixing.eyeviewInstallation ? 1 : 0) + 
                  (flat.hardwareFixing.towerBoltInstallation ? 1 : 0) + 
                  (flat.hardwareFixing.doorCloserInstallation ? 1 : 0) + 
                  (flat.hardwareFixing.autoDropSealInstallation ? 1 : 0);

  const hoCount = (flat.handover.frameCarpatchFillingSanding ? 1 : 0) + 
                  (flat.handover.frameTouchUp ? 1 : 0) + 
                  (flat.handover.shutterEdgeFinishing ? 1 : 0) + 
                  (flat.handover.lockSlotAreaFinishing ? 1 : 0) + 
                  (flat.handover.shutterTouchUp ? 1 : 0) + 
                  (flat.handover.hardwareCleaning ? 1 : 0) + 
                  (flat.handover.plasticCoverRemoval ? 1 : 0) + 
                  (flat.handover.keysHandover ? 1 : 0);

  const totalChecked = fCount + dCount + hwCount + hoCount;
  return Math.round((totalChecked / 22) * 100);
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
      stageAverages: { frameFixing: 0, doorFixing: 0, hardwareFixing: 0, handover: 0 },
      towerAverages: {},
      subtaskAnalysis: []
    };
  }

  let totalOverallProgress = 0;
  let completedFlatsCount = 0;
  let inProgressFlatsCount = 0;
  let notStartedFlatsCount = 0;

  let totalFF = 0;
  let totalDF = 0;
  let totalHW = 0;
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
    totalHO += getMilestoneProgress(flat, 'handover');
  });

  const overallProgress = Math.round(totalOverallProgress / totalFlats);

  // Group by Tower
  const towerStats: { [towerId: string]: { total: number, sum: number, avg: number } } = {};
  flats.forEach(flat => {
    const p = getFlatOverallProgress(flat);
    if (!towerStats[flat.towerId]) {
      towerStats[flat.towerId] = { total: 0, sum: 0, avg: 0 };
    }
    towerStats[flat.towerId].total += 1;
    towerStats[flat.towerId].sum += p;
  });

  const towerAverages = Object.keys(towerStats).reduce((acc, tid) => {
    const item = towerStats[tid];
    acc[tid] = {
      count: item.total,
      avg: Math.round(item.sum / item.total)
    };
    return acc;
  }, {} as { [tid: string]: { count: number, avg: number } });

  // Analyze individual subtasks
  const subtaskAnalysis: Array<{ milestone: string, key: string, label: string, completedPercentage: number }> = [];

  MILESTONES.forEach(milestone => {
    Object.keys(milestone.subtaskLabels).forEach(subKey => {
      let completedCount = 0;
      flats.forEach(flat => {
        // Safe bracket access
        const stageObj = flat[milestone.key] as any;
        if (stageObj && stageObj[subKey] === true) {
          completedCount++;
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
    stageAverages: {
      frameFixing: Math.round(totalFF / totalFlats),
      doorFixing: Math.round(totalDF / totalFlats),
      hardwareFixing: Math.round(totalHW / totalFlats),
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
    ",,,,,,", // first 7 columns are ID, OA No, Tower ID, Flats/Floor, Floor, Flat No, Door Name
    "Frame Fixing,Frame Fixing,Frame Fixing,Frame Fixing,Frame Fixing,Frame Fixing,", // 6 cols
    "Door fixing,Door fixing,Door fixing,Door fixing,Door fixing,Door fixing,", // 6 cols
    "Hardware fixing,Hardware fixing,Hardware fixing,Hardware fixing,Hardware fixing,Hardware fixing,Hardware fixing,Hardware fixing,", // 8 cols
    "Handover,Handover,Handover,Handover,Handover,Handover,Handover,Handover,Handover" // 9 cols
  ].join("");

  // Line 2: Actual Keys
  const itemHeaders = [
    "ID", "OA No", "Tower ID", "Flats/Floor", "Floor", "Flat No", "Door Name",
    "Frame Fixing - Fastener fixing", "Frame Fixing - Frame lock area finish", "Frame Fixing - Outside architrave fixing", "Frame Fixing - Inside architrave fixing", "Frame Fixing - Done By", "Frame Fixing - Timestamp",
    "Door fixing - Shutter edge finishing", "Door fixing - Gap between frame and shutter", "Door fixing - I seal fixing", "Door fixing - Vision glass beat finishing", "Door fixing - Done By", "Door fixing - Timestamp",
    "Hardware fixing - Hinge fitting", "Hardware fixing - Lock with handle fitting", "Hardware fixing - Eyeview installation", "Hardware fixing - Tower bolt installation", "Hardware fixing - Door closer installation", "Hardware fixing - Auto drop seal installation", "Hardware fixing - Done By", "Hardware fixing - Timestamp",
    "Handover - Frame carpatch filling & sanding", "Handover - Frame Touch-up", "Handover - Shutter edge finishing", "Handover - Lock slot area finishing", "Handover - Shutter Touch-up", "Handover - Hardware cleaning", "Handover - Plastic cover removal", "Handover - Keys handover", "Handover - Timestamp"
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
      
      // Frame fixing
      flat.frameFixing.fastenerFixing ? "Y" : "N",
      flat.frameFixing.frameLockAreaFinish ? "Y" : "N",
      flat.frameFixing.outsideArchitraveFixing ? "Y" : "N",
      flat.frameFixing.insideArchitraveFixing ? "Y" : "N",
      `"${flat.frameFixing.doneBy}"`,
      flat.frameFixing.timestamp,

      // Door fixing
      flat.doorFixing.shutterEdgeFinishing ? "Y" : "N",
      flat.doorFixing.gapBetweenFrameAndShutter ? "Y" : "N",
      flat.doorFixing.iSealFixing ? "Y" : "N",
      flat.doorFixing.visionGlassBeatFinishing ? "Y" : "N",
      `"${flat.doorFixing.doneBy}"`,
      flat.doorFixing.timestamp,

      // Hardware fixing
      flat.hardwareFixing.hingeFitting ? "Y" : "N",
      flat.hardwareFixing.lockWithHandleFitting ? "Y" : "N",
      flat.hardwareFixing.eyeviewInstallation ? "Y" : "N",
      flat.hardwareFixing.towerBoltInstallation ? "Y" : "N",
      flat.hardwareFixing.doorCloserInstallation ? "Y" : "N",
      flat.hardwareFixing.autoDropSealInstallation ? "Y" : "N",
      `"${flat.hardwareFixing.doneBy}"`,
      flat.hardwareFixing.timestamp,

      // Handover
      flat.handover.frameCarpatchFillingSanding ? "Y" : "N",
      flat.handover.frameTouchUp ? "Y" : "N",
      flat.handover.shutterEdgeFinishing ? "Y" : "N",
      flat.handover.lockSlotAreaFinishing ? "Y" : "N",
      flat.handover.shutterTouchUp ? "Y" : "N",
      flat.handover.hardwareCleaning ? "Y" : "N",
      flat.handover.plasticCoverRemoval ? "Y" : "N",
      flat.handover.keysHandover ? "Y" : "N",
      flat.handover.timestamp
    ].join(",");
  });

  return [topHeader, itemHeaders.join(","), ...rows].join("\n");
}

// Convert cell text value (Y/N/Yes/No) to boolean
function parseBool(val: string): boolean {
  if (!val) return false;
  const v = val.trim().toLowerCase();
  return v === 'y' || v === 'yes' || v === 'true' || v === '1';
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

  // If we can't find a valid header, abort
  if (headerIndex === -1) {
    // Falls back to line index 1 if not explicitly found
    headerIndex = lines.length > 1 ? 1 : 0;
  }

  const dataLines = lines.slice(headerIndex + 1);
  const parsedRecords: FlatRecord[] = [];

  dataLines.forEach((line, index) => {
    // Simple comma separation, taking care of possible double quotes
    // This regex splits on commas outside of quotes
    const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
    const item = matches.map(m => m.trim().replace(/^"|"$/g, ''));
    
    if (item.length < 7) return; // incomplete metadata row

    const id = item[0] || `REC-IMPORT-${index + 1}`;
    const oaNo = item[1] || 'OA-UNKNOWN';
    const towerId = item[2] || 'Tower Undefined';
    const flatsPerFloor = parseInt(item[3]) || 4;
    const floor = parseInt(item[4]) || 1;
    const flatNo = item[5] || '101';
    const doorName = item[6] || 'Main Door';

    // Parse with index references (based on standard index positions in Second Header Line)
    parsedRecords.push({
      id,
      oaNo,
      towerId,
      flatsPerFloor,
      floor,
      flatNo,
      doorName,
      frameFixing: {
        fastenerFixing: parseBool(item[7]),
        frameLockAreaFinish: parseBool(item[8]),
        outsideArchitraveFixing: parseBool(item[9]),
        insideArchitraveFixing: parseBool(item[10]),
        doneBy: item[11] || '',
        timestamp: item[12] || ''
      },
      doorFixing: {
        shutterEdgeFinishing: parseBool(item[13]),
        gapBetweenFrameAndShutter: parseBool(item[14]),
        iSealFixing: parseBool(item[15]),
        visionGlassBeatFinishing: parseBool(item[16]),
        doneBy: item[17] || '',
        timestamp: item[18] || ''
      },
      hardwareFixing: {
        hingeFitting: parseBool(item[19]),
        lockWithHandleFitting: parseBool(item[20]),
        eyeviewInstallation: parseBool(item[21]),
        towerBoltInstallation: parseBool(item[22]),
        doorCloserInstallation: parseBool(item[23]),
        autoDropSealInstallation: parseBool(item[24]),
        doneBy: item[25] || '',
        timestamp: item[26] || ''
      },
      handover: {
        frameCarpatchFillingSanding: parseBool(item[27]),
        frameTouchUp: parseBool(item[28]),
        shutterEdgeFinishing: parseBool(item[29]),
        lockSlotAreaFinishing: parseBool(item[30]),
        shutterTouchUp: parseBool(item[31]),
        hardwareCleaning: parseBool(item[32]),
        plasticCoverRemoval: parseBool(item[33]),
        keysHandover: parseBool(item[34]),
        timestamp: item[35] || ''
      }
    });
  });

  return parsedRecords.filter(r => r.flatNo);
}
