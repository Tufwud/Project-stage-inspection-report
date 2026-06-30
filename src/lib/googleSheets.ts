import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { FlatRecord, MILESTONES, QUALITATIVE_CHOICES, QualitativeState } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';
import { getFlatBasePrice, getFlatTotalCompletedCost, getFinancialStageEarned, getSubtaskWeight } from '../utils';

function renderCellState(val: any): string {
  if (val === undefined || val === null) return 'Not Started';
  if (typeof val === 'boolean') return val ? 'Approved' : 'Not Started';
  if (QUALITATIVE_CHOICES[val as QualitativeState]) {
    const choice = QUALITATIVE_CHOICES[val as QualitativeState];
    return choice.label.split(' (')[0];
  }
  return String(val);
}

// Initialize Firebase App
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// Scopes for reading/writing spreadsheets and listing/creating sheets in drive
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let isSigningIn = false;
let cachedAccessToken: string | null = null;

// Initialize auth state listener
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        // Since we reload from popup directly, if we have a user but no in-memory token,
        // we might prompt Google Sign-In again. For smooth SPA experience, we allow manual trigger.
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Google sign in popup
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to retrieve Google OAuth access token from Firebase Auth');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Core Sign-in failure:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

/**
 * Creates a brand new Google Sheet in the user's Google Drive.
 * Has 3 sheets (tabs): "Raw Quality Logs", "Consolidated Reports", and "Stage-wise Cost Breakdown".
 */
export const createGoogleSheet = async (accessToken: string, title: string): Promise<{ spreadsheetId: string; spreadsheetUrl: string }> => {
  const payload = {
    properties: {
      title: title || 'Door Compliance Quality Tracker'
    },
    sheets: [
      {
        properties: {
          title: 'Raw Quality Logs',
          gridProperties: {
            frozenRowCount: 2
          }
        }
      },
      {
        properties: {
          title: 'Consolidated Reports',
          gridProperties: {
            frozenRowCount: 1
          }
        }
      },
      {
        properties: {
          title: 'Stage-wise Cost Breakdown',
          gridProperties: {
            frozenRowCount: 1
          }
        }
      }
    ]
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create Google Sheet: ${errText}`);
  }

  const data = await response.json();
  return {
    spreadsheetId: data.spreadsheetId,
    spreadsheetUrl: data.spreadsheetUrl
  };
};

/**
 * Updates a specific Google Sheet range with user-entered values.
 */
export const updateSheetValues = async (
  accessToken: string,
  spreadsheetId: string,
  range: string,
  values: any[][]
): Promise<any> => {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ values })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to update range ${range}: ${errText}`);
  }

  return response.json();
};

/**
 * Searches user's Google Drive for existing spreadsheets created with "SUTower", "SDTower" or "Project" in the name,
 * providing easy "Sync to existing" capability.
 */
export const findExistingSpreadsheets = async (accessToken: string): Promise<Array<{ id: string; name: string; mimeType: string }>> => {
  const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.spreadsheet' and (name contains 'SUTower' or name contains 'SDTower' or name contains 'Project') and trashed = false");
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime+desc&pageSize=10`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    console.error('Error finding existing files in Drive:', await response.text());
    return [];
  }

  const data = await response.json();
  return data.files || [];
};

/**
 * Format flat records for Raw Quality Logs
 */
export const prepareRawQualityLogsData = (flats: FlatRecord[]): any[][] => {
  // Map to cache derived metadata per Sales Order (oaNo) to avoid re-calculation
  const soMetadata: { [oaNo: string]: { numTowers: number; totalFloors: number; doorsPerFlat: string } } = {};
  
  // Try loading history from localStorage if available to get exact initial door codes
  let historyProjects: any[] = [];
  try {
    const savedHistory = localStorage.getItem("door_quality_compliance_dashboard_history");
    if (savedHistory) {
      historyProjects = JSON.parse(savedHistory);
    }
  } catch (e) {}

  flats.forEach(f => {
    if (!f.oaNo) return;
    if (!soMetadata[f.oaNo]) {
      const savedProj = historyProjects.find((p: any) => p.salesOrderNo === f.oaNo);
      
      const flatsForSO = flats.filter(flat => flat.oaNo === f.oaNo);
      const computedTowers = new Set(flatsForSO.map(flat => flat.towerId)).size || 1;
      const computedFloors = Math.max(...flatsForSO.map(flat => flat.floor), 0) || 1;
      
      let computedDoors = '';
      if (savedProj?.doorTypesToGenerate) {
        computedDoors = savedProj.doorTypesToGenerate.join(', ');
      } else {
        computedDoors = Array.from(new Set(flatsForSO.map(flat => flat.doorName))).join(', ');
      }

      soMetadata[f.oaNo] = {
        numTowers: f.numTowers || savedProj?.numTowers || computedTowers,
        totalFloors: f.totalFloors || savedProj?.totalFloors || computedFloors,
        doorsPerFlat: f.doorsPerFlat || computedDoors
      };
    }
  });

  // Row 1: Header groupings
  const row1 = [
    '', '', '', '', '', '', '', '', '', '', '', '', '', // Identifiers (13 columns: ID, SO No, SO Details, Towers, Floors, Flats/Floor, Doors/Flat, Tower ID, Floor Location, Flat No, Door Spec, Supervisor, Contractor)
    'Frame Fixing Stage Checkpoints', '', '', '', '', '', // H-M -> Now shifted but maintains exact checkbox column spans (6 cols)
    'Door Fixing Stage Checkpoints', '', '', '', '', '',  // 6 cols
    'Hardware Fixing Stage Checkpoints', '', '', '', '', '', '', '', // 8 cols
    'Handover Stage Checkpoints', '', '', '', '', '', '', '', '', '' // 10 cols
  ];

  // Row 2: Sub-checkpoint properties
  const row2 = [
    'ID / Unique Reference Code',
    '6-Digit SO Identifier (Sales Order No)*',
    'SO Details / Client Description',
    'Number of Towers*',
    'Total Floors per Tower',
    'Flats per Floor',
    'Doors per Flat (Openings per Flat)',
    'Tower ID Name',
    'Floor Location',
    'Flat No',
    'Door / Opening Specification',
    'Project Supervisor',
    'Contractor / Agency Partner',

    // Frame fixing
    'Fastener Fixing (✓/✗)',
    'Frame Lock Area Finish (✓/✗)',
    'Outside Architrave Fixing (✓/✗)',
    'Inside Architrave Fixing (✓/✗)',
    'Frame Fixing Inspector',
    'Frame Fixing Timestamp',

    // Door fixing
    'Shutter Edge Finishing (✓/✗)',
    'Gap Frame-to-Shutter (✓/✗)',
    'I-Seal Fixing (✓/✗)',
    'Vision Glass Beat (✓/✗)',
    'Door Fixing Inspector',
    'Door Fixing Timestamp',

    // Hardware fixing
    'Hinge Fitting (✓/✗)',
    'Lock & Handle Fitting (✓/✗)',
    'Eyeview Installation (✓/✗)',
    'Tower Bolt Fixing (✓/✗)',
    'Door Closer Fitting (✓/✗)',
    'Auto Drop Seal Fitting (✓/✗)',
    'Hardware Inspector',
    'Hardware Timestamp',

    // Handover
    'Frame Sanding & Sanding (✓/✗)',
    'Frame Touch-up (✓/✗)',
    'Shutter Edge Finishing (✓/✗)',
    'Lock Slot Area Finishing (✓/✗)',
    'Shutter Touch-up (✓/✗)',
    'Hardware Cleaning (✓/✗)',
    'Plastic Cover Removal (✓/✗)',
    'Keys Handover (✓/✗)',
    'Handover Inspector',
    'Handover Timestamp'
  ];

  const dataRows = flats.map(flat => {
    const meta = soMetadata[flat.oaNo] || { numTowers: 1, totalFloors: 1, doorsPerFlat: '' };
    const numTowersVal = flat.numTowers || meta.numTowers;
    const totalFloorsVal = flat.totalFloors || meta.totalFloors;
    const doorsPerFlatVal = flat.doorsPerFlat || meta.doorsPerFlat;

    return [
      flat.id,
      flat.oaNo,
      flat.soDetails || '',
      numTowersVal,
      totalFloorsVal,
      flat.flatsPerFloor,
      doorsPerFlatVal,
      flat.towerId,
      flat.floor,
      flat.flatNo,
      flat.doorName,
      flat.supervisor || 'N/A',
      flat.contractor || 'N/A',

      // Frame fixing checklist values
      renderCellState(flat.frameFixing.fastenerFixing),
      renderCellState(flat.frameFixing.frameLockAreaFinish),
      renderCellState(flat.frameFixing.outsideArchitraveFixing),
      renderCellState(flat.frameFixing.insideArchitraveFixing),
      flat.frameFixing.doneBy || 'N/A',
      flat.frameFixing.timestamp ? new Date(flat.frameFixing.timestamp).toLocaleString() : 'N/A',

      // Door fixing checklist values
      renderCellState(flat.doorFixing.shutterEdgeFinishing),
      renderCellState(flat.doorFixing.gapBetweenFrameAndShutter),
      renderCellState(flat.doorFixing.iSealFixing),
      renderCellState(flat.doorFixing.visionGlassBeatFinishing),
      flat.doorFixing.doneBy || 'N/A',
      flat.doorFixing.timestamp ? new Date(flat.doorFixing.timestamp).toLocaleString() : 'N/A',

      // Hardware fixing checklist values
      renderCellState(flat.hardwareFixing.hingeFitting),
      renderCellState(flat.hardwareFixing.lockWithHandleFitting),
      renderCellState(flat.hardwareFixing.eyeviewInstallation),
      renderCellState(flat.hardwareFixing.towerBoltInstallation),
      renderCellState(flat.hardwareFixing.doorCloserInstallation),
      renderCellState(flat.hardwareFixing.autoDropSealInstallation),
      flat.hardwareFixing.doneBy || 'N/A',
      flat.hardwareFixing.timestamp ? new Date(flat.hardwareFixing.timestamp).toLocaleString() : 'N/A',

      // Handover checklist values
      renderCellState(flat.handover.frameCarpatchFillingSanding),
      renderCellState(flat.handover.frameTouchUp),
      renderCellState(flat.handover.shutterEdgeFinishing),
      renderCellState(flat.handover.lockSlotAreaFinishing),
      renderCellState(flat.handover.shutterTouchUp),
      renderCellState(flat.handover.hardwareCleaning),
      renderCellState(flat.handover.plasticCoverRemoval),
      renderCellState(flat.handover.keysHandover),
      flat.handover.keysHandover ? 'Supervisor Handed Over' : 'Pending',
      flat.handover.timestamp ? new Date(flat.handover.timestamp).toLocaleString() : 'N/A'
    ];
  });

  return [row1, row2, ...dataRows];
};

/**
 * Format flat records consolidated by Sales Order (OA No)
 */
export const prepareConsolidatedReportsData = (flats: FlatRecord[]): any[][] => {
  // Group by sales order/oaNo
  const oaGroups: { [oaNo: string]: FlatRecord[] } = {};
  flats.forEach(flat => {
    if (!oaGroups[flat.oaNo]) {
      oaGroups[flat.oaNo] = [];
    }
    oaGroups[flat.oaNo].push(flat);
  });

  // Header Row
  const headers = [
    'Sales Order / OA',
    'SO Details',
    'Total Active Rooms',
    'Frame Fixing Done',
    'Frame Fixing Progress %',
    'Door Fixing Done',
    'Door Fixing Progress %',
    'Hardware Fixing Done',
    'Hardware Fixing Progress %',
    'Handover Completed',
    'Handover Progress %',
    'Overall Weighted Score',
    'Outstanding Checklist Tasks',
    'Status Indicator'
  ];

  const dataRows = Object.keys(oaGroups).map(oaNo => {
    const list = oaGroups[oaNo];
    const totalRooms = list.length;
    const soDetailsVal = list[0]?.soDetails || '';
    if (totalRooms === 0) return [oaNo, soDetailsVal, 0, '0%', 0, '0%', 0, '0%', 0, '0%', '0%', 0, 'Inactive'];

    // Calculators
    let frameDoneCount = 0;
    let doorDoneCount = 0;
    let hardwareDoneCount = 0;
    let handoverDoneCount = 0;
    
    let totalFrameChecks = 0;
    let totalDoorChecks = 0;
    let totalHardwareChecks = 0;
    let totalHandoverChecks = 0;

    let totalPendingChecks = 0;

    list.forEach(flat => {
      // frame
      const frameCheckCount = getSubtaskWeight(flat.frameFixing.fastenerFixing) + getSubtaskWeight(flat.frameFixing.frameLockAreaFinish) + getSubtaskWeight(flat.frameFixing.outsideArchitraveFixing) + getSubtaskWeight(flat.frameFixing.insideArchitraveFixing);
      const frameFixed = frameCheckCount >= 4;
      if (frameFixed) frameDoneCount++;
      totalFrameChecks += frameCheckCount;
      totalPendingChecks += (4 - frameCheckCount);

      // door
      const doorCheckCount = getSubtaskWeight(flat.doorFixing.shutterEdgeFinishing) + getSubtaskWeight(flat.doorFixing.gapBetweenFrameAndShutter) + getSubtaskWeight(flat.doorFixing.iSealFixing) + getSubtaskWeight(flat.doorFixing.visionGlassBeatFinishing);
      const doorFixed = doorCheckCount >= 4;
      if (doorFixed) doorDoneCount++;
      totalDoorChecks += doorCheckCount;
      totalPendingChecks += (4 - doorCheckCount);

      // hardware
      const hardwareCheckCount = getSubtaskWeight(flat.hardwareFixing.hingeFitting) + getSubtaskWeight(flat.hardwareFixing.lockWithHandleFitting) + getSubtaskWeight(flat.hardwareFixing.eyeviewInstallation) + getSubtaskWeight(flat.hardwareFixing.towerBoltInstallation) + getSubtaskWeight(flat.hardwareFixing.doorCloserInstallation) + getSubtaskWeight(flat.hardwareFixing.autoDropSealInstallation);
      const hardwareFixed = hardwareCheckCount >= 6;
      if (hardwareFixed) hardwareDoneCount++;
      totalHardwareChecks += hardwareCheckCount;
      totalPendingChecks += (6 - hardwareCheckCount);

      // handover
      const handoverCheckCount = getSubtaskWeight(flat.handover.frameCarpatchFillingSanding) + getSubtaskWeight(flat.handover.frameTouchUp) + getSubtaskWeight(flat.handover.shutterEdgeFinishing) + getSubtaskWeight(flat.handover.lockSlotAreaFinishing) + getSubtaskWeight(flat.handover.shutterTouchUp) + getSubtaskWeight(flat.handover.hardwareCleaning) + getSubtaskWeight(flat.handover.plasticCoverRemoval) + getSubtaskWeight(flat.handover.keysHandover);
      const handoverFixed = handoverCheckCount >= 8;
      if (handoverFixed) handoverDoneCount++;
      totalHandoverChecks += handoverCheckCount;
      totalPendingChecks += (8 - handoverCheckCount);
    });

    const framePercent = Math.round((totalFrameChecks / (totalRooms * 4)) * 100);
    const doorPercent = Math.round((totalDoorChecks / (totalRooms * 4)) * 100);
    const hardwarePercent = Math.round((totalHardwareChecks / (totalRooms * 6)) * 100);
    const handoverPercent = Math.round((totalHandoverChecks / (totalRooms * 8)) * 100);

    const overallProgress = Math.round((framePercent + doorPercent + hardwarePercent + handoverPercent) / 4);
    const status = overallProgress === 100 ? '✅ 100% Fulfilled' : overallProgress > 50 ? '👷 In Progress' : '⏳ Initialized';

    return [
      oaNo,
      soDetailsVal,
      totalRooms,
      `${frameDoneCount} of ${totalRooms}`,
      `${framePercent}%`,
      `${doorDoneCount} of ${totalRooms}`,
      `${doorPercent}%`,
      `${hardwareDoneCount} of ${totalRooms}`,
      `${hardwarePercent}%`,
      `${handoverDoneCount} of ${totalRooms}`,
      `${handoverPercent}%`,
      `${overallProgress}%`,
      totalPendingChecks,
      status
    ];
  });

  return [headers, ...dataRows];
};

/**
 * Format flat records for Stage-wise Cost Breakdown tab (Report C)
 * Organized by Sales Order / OA No with high detail.
 */
export const prepareStageCostingReportData = (flats: FlatRecord[]): any[][] => {
  // Group by Sales Order / OA No
  const stats: { 
    [oaNo: string]: { 
      oaNo: string;
      soDetails: string;
      totalDoors: number;
      totalBudget: number;
      totalEarned: number;
      stageEarnedSums: { [stageId: string]: number };
    } 
  } = {};

  const stagesDef = [
    { id: "frame_install", label: "Frame Installation (0%)" },
    { id: "shutter_install", label: "Shutter Installation (30%)" },
    { id: "hardware", label: "Hardware Fitting (10%)" },
    { id: "architrave", label: "Architect (10%)" },
    { id: "seals_foams", label: "Sales/Forms (10%)" },
    { id: "handover", label: "Handover (8%)" }
  ];

  flats.forEach(flat => {
    const oaNo = flat.oaNo || 'Unassigned';
    const soDetails = flat.soDetails || '';
    const basePrice = getFlatBasePrice(flat);
    const completedCost = getFlatTotalCompletedCost(flat);

    if (!stats[oaNo]) {
      const initialStages: { [stageId: string]: number } = {};
      stagesDef.forEach(s => {
        initialStages[s.id] = 0;
      });

      stats[oaNo] = {
        oaNo: oaNo,
        soDetails: soDetails,
        totalDoors: 0,
        totalBudget: 0,
        totalEarned: 0,
        stageEarnedSums: initialStages
      };
    }

    stats[oaNo].totalDoors += 1;
    stats[oaNo].totalBudget += basePrice;
    stats[oaNo].totalEarned += completedCost;

    stagesDef.forEach(stage => {
      const earned = getFinancialStageEarned(flat, stage.id);
      stats[oaNo].stageEarnedSums[stage.id] += earned;
    });
  });

  const headers = [
    'Sales Order / OA',
    'SO Details',
    'Total Setup Doors',
    'Accumulated Budget (INR)',
    ...stagesDef.map(s => `${s.label} Earned (INR)`),
    'Grand Cost Earned Amount (INR)',
    'Financial Delivery Rate %'
  ];

  const valueSummaries = Object.values(stats);

  const dataRows = valueSummaries.map(t => {
    const actualDeliveryPct = t.totalBudget > 0 ? Math.min(100, Math.round((t.totalEarned / t.totalBudget) * 100)) : 0;
    const stageValues = stagesDef.map(s => t.stageEarnedSums[s.id]);
    
    return [
      t.oaNo,
      t.soDetails,
      t.totalDoors,
      t.totalBudget,
      ...stageValues,
      t.totalEarned,
      `${actualDeliveryPct}%`
    ];
  });

  if (valueSummaries.length > 0) {
    const grandDoors = valueSummaries.reduce((sum, s) => sum + s.totalDoors, 0);
    const grandBudget = valueSummaries.reduce((sum, s) => sum + s.totalBudget, 0);
    const grandEarned = valueSummaries.reduce((sum, s) => sum + s.totalEarned, 0);
    const grandPct = grandBudget > 0 ? Math.round((grandEarned / grandBudget) * 100) : 0;

    const grandStages = stagesDef.map(stage => {
      return valueSummaries.reduce((sum, s) => sum + s.stageEarnedSums[stage.id], 0);
    });

    dataRows.push([
      'GRAND TOTAL',
      'All Projects Consolidated',
      grandDoors,
      grandBudget,
      ...grandStages,
      grandEarned,
      `${grandPct}%`
    ]);
  }

  return [headers, ...dataRows];
};

/**
 * Ensures dedicated tabs exist in the Google Spreadsheet for each unique Sales Order
 */
export const ensureSOTabsExist = async (
  accessToken: string,
  spreadsheetId: string,
  soNumbers: string[]
): Promise<string[]> => {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to check spreadsheet sheet tabs structure: ${errText}`);
    }

    const data = await response.json();
    const existingSheetTitles: string[] = (data.sheets || []).map((s: any) => s.properties.title);

    const missingSOTabs = soNumbers.filter(so => !existingSheetTitles.includes(so) && so.trim() !== '');

    if (missingSOTabs.length > 0) {
      const requests = missingSOTabs.map(so => ({
        addSheet: {
          properties: {
            title: so,
            gridProperties: {
              frozenRowCount: 2
            }
          }
        }
      }));

      const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
      const updateResponse = await fetch(updateUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ requests })
      });

      if (!updateResponse.ok) {
        const errText = await updateResponse.text();
        console.error('Failed to create missing SO tabs batch:', errText);
      }
    }

    return [...existingSheetTitles, ...missingSOTabs];
  } catch (error) {
    console.error('Error in ensureSOTabsExist:', error);
    return [];
  }
};
