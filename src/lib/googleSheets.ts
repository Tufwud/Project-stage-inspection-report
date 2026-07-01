import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { FlatRecord, MILESTONES, QUALITATIVE_CHOICES, QualitativeState } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';
import { getFlatBasePrice, getFlatTotalCompletedCost, getFinancialStageEarned, getSubtaskWeight, getFinancialStagePct } from '../utils';

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
    'Touch-up & Painting Stage Checkpoints', '', '', '', '', '', '', // 7 cols
    'Handover Stage Checkpoints', '', '', '', '' // 5 cols
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

    // Touch-up & Painting
    'Frame Sanding & Sanding (✓/✗)',
    'Frame Touch-up (✓/✗)',
    'Shutter Edge Finishing (✓/✗)',
    'Lock Slot Area Finishing (✓/✗)',
    'Shutter Touch-up (✓/✗)',
    'Painting Inspector',
    'Painting Timestamp',

    // Handover
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

      // Touch-up & Painting values
      renderCellState(flat.painting?.frameCarpatchFillingSanding),
      renderCellState(flat.painting?.frameTouchUp),
      renderCellState(flat.painting?.shutterEdgeFinishing),
      renderCellState(flat.painting?.lockSlotAreaFinishing),
      renderCellState(flat.painting?.shutterTouchUp),
      flat.painting?.doneBy || 'N/A',
      flat.painting?.timestamp ? new Date(flat.painting.timestamp).toLocaleString() : 'N/A',

      // Handover checklist values
      renderCellState(flat.handover.hardwareCleaning),
      renderCellState(flat.handover.plasticCoverRemoval),
      renderCellState(flat.handover.keysHandover),
      flat.handover.doneBy || 'N/A',
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
    'Touch-up & Painting Done',
    'Touch-up & Painting Progress %',
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
    let paintingDoneCount = 0;
    let handoverDoneCount = 0;
    
    let totalFrameChecks = 0;
    let totalDoorChecks = 0;
    let totalHardwareChecks = 0;
    let totalPaintingChecks = 0;
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

      // painting
      const paintingCheckCount = getSubtaskWeight(flat.painting?.frameCarpatchFillingSanding) + getSubtaskWeight(flat.painting?.frameTouchUp) + getSubtaskWeight(flat.painting?.shutterEdgeFinishing) + getSubtaskWeight(flat.painting?.lockSlotAreaFinishing) + getSubtaskWeight(flat.painting?.shutterTouchUp);
      const paintingFixed = paintingCheckCount >= 5;
      if (paintingFixed) paintingDoneCount++;
      totalPaintingChecks += paintingCheckCount;
      totalPendingChecks += (5 - paintingCheckCount);

      // handover
      const handoverCheckCount = getSubtaskWeight(flat.handover.hardwareCleaning) + getSubtaskWeight(flat.handover.plasticCoverRemoval) + getSubtaskWeight(flat.handover.keysHandover);
      const handoverFixed = handoverCheckCount >= 3;
      if (handoverFixed) handoverDoneCount++;
      totalHandoverChecks += handoverCheckCount;
      totalPendingChecks += (3 - handoverCheckCount);
    });

    const framePercent = Math.round((totalFrameChecks / (totalRooms * 4)) * 100);
    const doorPercent = Math.round((totalDoorChecks / (totalRooms * 4)) * 100);
    const hardwarePercent = Math.round((totalHardwareChecks / (totalRooms * 6)) * 100);
    const paintingPercent = Math.round((totalPaintingChecks / (totalRooms * 5)) * 100);
    const handoverPercent = Math.round((totalHandoverChecks / (totalRooms * 3)) * 100);

    const overallProgress = Math.round((framePercent + doorPercent + hardwarePercent + paintingPercent + handoverPercent) / 5);
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
      `${paintingDoneCount} of ${totalRooms}`,
      `${paintingPercent}%`,
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
    { id: "frame_install", label: `Frame Installation (${getFinancialStagePct("frame_install", 20)}%)` },
    { id: "shutter_install", label: `Shutter Installation (${getFinancialStagePct("shutter_install", 30)}%)` },
    { id: "hardware", label: `Hardware Fitting (${getFinancialStagePct("hardware", 20)}%)` },
    { id: "architrave", label: `Architrave Fixing (${getFinancialStagePct("architrave", 10)}%)` },
    { id: "seals_foams", label: `Seals/Foams/Desnagging (${getFinancialStagePct("seals_foams", 10)}%)` },
    { id: "handover", label: `Handover (${getFinancialStagePct("handover", 10)}%)` }
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

/**
 * Finds a folder by name inside a parent, or creates it.
 * If parentId is specified but not authorized or fails, it falls back to root or normal creation.
 */
export const findOrCreateFolder = async (
  accessToken: string,
  name: string,
  parentId?: string
): Promise<string> => {
  let query = `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }
  
  try {
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id)`;
    const searchRes = await fetch(searchUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
      }
    }
  } catch (err) {
    console.warn(`Querying folder ${name} failed:`, err);
  }
  
  // Create folder
  const createPayload: any = {
    name: name,
    mimeType: 'application/vnd.google-apps.folder'
  };
  if (parentId) {
    createPayload.parents = [parentId];
  }
  
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(createPayload)
  });
  
  if (!createRes.ok) {
    // If it failed and we had a parent, try to create at root
    if (parentId) {
      console.warn(`Failed to create folder inside parent ${parentId}, creating at root:`);
      return findOrCreateFolder(accessToken, name);
    }
    const errText = await createRes.text();
    throw new Error(`Failed to create folder ${name}: ${errText}`);
  }
  
  const createData = await createRes.json();
  return createData.id;
};

/**
 * Uploads a base64 image data URL to Google Drive using multipart upload.
 */
export const uploadImageToDrive = async (
  accessToken: string,
  base64DataUrl: string,
  filename: string,
  parentFolderId: string
): Promise<{ id: string; url: string }> => {
  const base64Parts = base64DataUrl.split(',');
  const base64Content = base64Parts[1] || base64Parts[0];
  const mimeType = base64DataUrl.match(/:(.*?);/)?.[1] || 'image/png';
  
  const boundary = 'foo_bar_baz_upload';
  const delimiter = `\r\n--${boundary}\r\n`;
  const close_delim = `\r\n--${boundary}--`;
  
  const metadata = {
    name: filename,
    mimeType: mimeType,
    parents: [parentFolderId]
  };
  
  const multipartBody = [
    delimiter,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    JSON.stringify(metadata),
    delimiter,
    `Content-Type: ${mimeType}\r\n`,
    'Content-Transfer-Encoding: base64\r\n\r\n',
    base64Content,
    close_delim
  ].join('');
  
  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink,webContentLink', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: multipartBody
  });
  
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to upload image ${filename}: ${errText}`);
  }
  
  const data = await response.json();
  // Get webContentLink (direct download) or webViewLink
  const fileUrl = data.webContentLink || data.webViewLink || `https://drive.google.com/uc?id=${data.id}`;
  
  return {
    id: data.id,
    url: fileUrl
  };
};

/**
 * Lists all non-trashed subfolders under a specific parent folder ID on Google Drive.
 */
export const listSubfolders = async (
  accessToken: string,
  parentId: string
): Promise<{ id: string; name: string }[]> => {
  const query = `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id,name)`;
  
  const res = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to list folders under ${parentId}: ${errText}`);
  }
  const data = await res.json();
  return data.files || [];
};

/**
 * Finds a folder under parentId that matches a name-based query, or creates it if not found.
 * This is highly robust as it filters on Google Drive server-side to avoid pagination issues.
 */
export const findOrCreateFolderWithQueryMatch = async (
  accessToken: string,
  parentId: string,
  searchTerm: string,
  matchFn: (name: string) => boolean,
  defaultName: string
): Promise<string> => {
  const query = `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and name contains '${searchTerm.replace(/'/g, "\\'")}' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id,name)`;
  
  let foundId: string | null = null;
  try {
    const res = await fetch(url, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (res.ok) {
      const data = await res.json();
      const files = data.files || [];
      const found = files.find((f: { name: string }) => matchFn(f.name));
      if (found) {
        console.log(`[Query Match] Found existing folder matching "${searchTerm}": ID=${found.id}, Name="${found.name}" under parent=${parentId}`);
        foundId = found.id;
      }
    } else {
      const errText = await res.text();
      console.warn(`Query match search failed for "${searchTerm}" under ${parentId}: ${errText}`);
    }
  } catch (err) {
    console.warn(`Error during query match search for "${searchTerm}":`, err);
  }
  
  if (foundId) {
    return foundId;
  }
  
  // Backup: fetch broad list under parent as a fallback in case server-side 'contains' behaved unexpectedly
  try {
    const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`)}&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id,name)&pageSize=100`;
    const listRes = await fetch(listUrl, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (listRes.ok) {
      const listData = await listRes.json();
      const files = listData.files || [];
      const found = files.find((f: { name: string }) => matchFn(f.name));
      if (found) {
        console.log(`[Backup List Match] Found folder matching in full list: ID=${found.id}, Name="${found.name}"`);
        return found.id;
      }
    }
  } catch (err) {
    console.warn(`Backup list check failed:`, err);
  }
  
  // Create it
  console.log(`Creating new folder "${defaultName}" under parent ${parentId}`);
  const createPayload = {
    name: defaultName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentId]
  };
  
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(createPayload)
  });
  
  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create folder '${defaultName}' under parent '${parentId}': ${errText}`);
  }
  
  const data = await createRes.json();
  return data.id;
};

/**
 * Syncs all base64 photos of a record to Google Drive.
 * Creates the folder structure in Drive:
 * Shared Master (133DwBuxmLdK9PozyOfJS8XkRrAxJxi8-) -> {oaNo4Digit} -> {oaNo4Digit} - Site Supervisor Folder -> Site_Installation_Photos
 */
export const syncPhotosToDrive = async (
  accessToken: string,
  oaNoFull: string,
  photos: { [stageKey: string]: { id: string; name: string; url: string; date: string; isCamera: boolean }[] }
): Promise<{ [stageKey: string]: { id: string; name: string; url: string; date: string; isCamera: boolean }[] }> => {
  const numericParts = oaNoFull.replace(/\D/g, '');
  const oaNo4Digit = numericParts.substring(0, 4) || '3870';
  
  let supervisorFolderId = '';
  
  if (oaNo4Digit === '4027') {
    supervisorFolderId = '1xcRODlPVO19nbHIlbF3tomz1ruSnaRFz';
    console.log(`[Special Mapping] Using direct supervisor folder ID for ${oaNo4Digit}: ${supervisorFolderId}`);
  } else {
    const masterFolderId = '133DwBuxmLdK9PozyOfJS8XkRrAxJxi8-';
    
    console.log(`Starting Google Drive photo sync for SO ${oaNo4Digit} under Master Folder ${masterFolderId}...`);
    
    // 1. Find or create the SO folder (e.g. 4099) under the Shared Master Folder
    const soFolderId = await findOrCreateFolderWithQueryMatch(
      accessToken,
      masterFolderId,
      oaNo4Digit,
      (name) => {
        const cleanName = name.replace(/\s+/g, '');
        return cleanName.startsWith(oaNo4Digit) || cleanName.includes(oaNo4Digit);
      },
      oaNo4Digit
    );
    
    // 2. Find or create the Supervisor folder (e.g. 4099 - Site Supervisor Folder) under the SO folder
    supervisorFolderId = await findOrCreateFolderWithQueryMatch(
      accessToken,
      soFolderId,
      'Supervisor',
      (name) => {
        const lower = name.toLowerCase();
        return lower.includes('supervisor') || lower.includes('site supervisor');
      },
      `${oaNo4Digit} - Site Supervisor Folder`
    );
  }
  
  // 3. Find or create the Site_Installation_Photos folder under the Supervisor folder
  const photosFolderId = await findOrCreateFolderWithQueryMatch(
    accessToken,
    supervisorFolderId,
    'Photos',
    (name) => {
      const lower = name.toLowerCase();
      return lower.includes('photo') || lower.includes('installation_photos') || lower.includes('installation photos');
    },
    'Site_Installation_Photos'
  );
  
  const updatedPhotos: { [stageKey: string]: any[] } = {};
  
  for (const stageKey of Object.keys(photos)) {
    const stagePhotosList = photos[stageKey] || [];
    const uploadedList = [];
    
    for (const photo of stagePhotosList) {
      if (photo.url.startsWith('data:')) {
        try {
          const uploadedFile = await uploadImageToDrive(accessToken, photo.url, photo.name, photosFolderId);
          uploadedList.push({
            ...photo,
            url: uploadedFile.url,
            driveFileId: uploadedFile.id
          });
        } catch (err) {
          console.error(`Failed to sync ${photo.name}:`, err);
          uploadedList.push(photo);
        }
      } else {
        uploadedList.push(photo);
      }
    }
    
    updatedPhotos[stageKey] = uploadedList;
  }
  
  return updatedPhotos;
};

/**
 * Syncs the ERP Work Order PDF (if it is a new base64 upload) to the Supervisor Folder on Google Drive.
 */
export const syncErpPdfToDrive = async (
  accessToken: string,
  oaNoFull: string,
  erpWorkOrder: { name: string; url: string; size: string; date: string }
): Promise<{ name: string; url: string; size: string; date: string }> => {
  if (!erpWorkOrder || !erpWorkOrder.url || !erpWorkOrder.url.startsWith('data:')) {
    return erpWorkOrder;
  }

  const numericParts = oaNoFull.replace(/\D/g, '');
  const oaNo4Digit = numericParts.substring(0, 4) || '3870';

  let supervisorFolderId = '';
  if (oaNo4Digit === '4027') {
    supervisorFolderId = '1xcRODlPVO19nbHIlbF3tomz1ruSnaRFz';
  } else {
    const masterFolderId = '133DwBuxmLdK9PozyOfJS8XkRrAxJxi8-';
    
    // Find or create the SO folder (e.g. 4099) under the Shared Master Folder
    const soFolderId = await findOrCreateFolderWithQueryMatch(
      accessToken,
      masterFolderId,
      oaNo4Digit,
      (name) => {
        const cleanName = name.replace(/\s+/g, '');
        return cleanName.startsWith(oaNo4Digit) || cleanName.includes(oaNo4Digit);
      },
      oaNo4Digit
    );
    
    // Find or create the Supervisor folder (e.g. 4099 - Site Supervisor Folder) under the SO folder
    supervisorFolderId = await findOrCreateFolderWithQueryMatch(
      accessToken,
      soFolderId,
      'Supervisor',
      (name) => {
        const lower = name.toLowerCase();
        return lower.includes('supervisor') || lower.includes('site supervisor');
      },
      `${oaNo4Digit} - Site Supervisor Folder`
    );
  }

  console.log(`Uploading ERP Work Order PDF to Supervisor Folder ID: ${supervisorFolderId}...`);
  const uploaded = await uploadImageToDrive(accessToken, erpWorkOrder.url, erpWorkOrder.name || 'ERP_Work_Order.pdf', supervisorFolderId);
  
  return {
    ...erpWorkOrder,
    url: uploaded.url
  };
};

