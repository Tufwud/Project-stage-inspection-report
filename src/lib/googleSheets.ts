import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import { FlatRecord, MILESTONES } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

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
 * Has 2 sheets (tabs): "Raw Quality Logs" and "Consolidated Reports".
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
 * Searches user's Google Drive for existing spreadsheets created with "Door Compliance" in the name,
 * providing easy "Sync to existing" capability.
 */
export const findExistingSpreadsheets = async (accessToken: string): Promise<Array<{ id: string; name: string; mimeType: string }>> => {
  const query = encodeURIComponent("mimeType = 'application/vnd.google-apps.spreadsheet' and name contains 'Door' and trashed = false");
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
  // Row 1: Header groupings
  const row1 = [
    '', '', '', '', '', '', '', // Identifiers (A-G: ID, OA No, Tower, Flats/Floor, Floor, Flat No, Door Name)
    'Frame Fixing Stage Checkpoints', '', '', '', '', '', // H-M (6 cols)
    'Door Fixing Stage Checkpoints', '', '', '', '', '',  // N-S (6 cols)
    'Hardware Fixing Stage Checkpoints', '', '', '', '', '', '', '', // T-AA (8 cols)
    'Handover Stage Checkpoints', '', '', '', '', '', '', '', '', '' // AB-AK (10 cols)
  ];

  // Row 2: Sub-checkpoint properties
  const row2 = [
    'ID / Unique Reference Code',
    'Sales Order / OA No',
    'Tower ID Name',
    'Flats per Floor',
    'Floor Location',
    'Flat No',
    'Door / Opening Specification',

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
    return [
      flat.id,
      flat.oaNo,
      flat.towerId,
      flat.flatsPerFloor,
      flat.floor,
      flat.flatNo,
      flat.doorName,

      // Frame fixing checklist values
      flat.frameFixing.fastenerFixing,
      flat.frameFixing.frameLockAreaFinish,
      flat.frameFixing.outsideArchitraveFixing,
      flat.frameFixing.insideArchitraveFixing,
      flat.frameFixing.doneBy || 'N/A',
      flat.frameFixing.timestamp ? new Date(flat.frameFixing.timestamp).toLocaleString() : 'N/A',

      // Door fixing checklist values
      flat.doorFixing.shutterEdgeFinishing,
      flat.doorFixing.gapBetweenFrameAndShutter,
      flat.doorFixing.iSealFixing,
      flat.doorFixing.visionGlassBeatFinishing,
      flat.doorFixing.doneBy || 'N/A',
      flat.doorFixing.timestamp ? new Date(flat.doorFixing.timestamp).toLocaleString() : 'N/A',

      // Hardware fixing checklist values
      flat.hardwareFixing.hingeFitting,
      flat.hardwareFixing.lockWithHandleFitting,
      flat.hardwareFixing.eyeviewInstallation,
      flat.hardwareFixing.towerBoltInstallation,
      flat.hardwareFixing.doorCloserInstallation,
      flat.hardwareFixing.autoDropSealInstallation,
      flat.hardwareFixing.doneBy || 'N/A',
      flat.hardwareFixing.timestamp ? new Date(flat.hardwareFixing.timestamp).toLocaleString() : 'N/A',

      // Handover checklist values
      flat.handover.frameCarpatchFillingSanding,
      flat.handover.frameTouchUp,
      flat.handover.shutterEdgeFinishing,
      flat.handover.lockSlotAreaFinishing,
      flat.handover.shutterTouchUp,
      flat.handover.hardwareCleaning,
      flat.handover.plasticCoverRemoval,
      flat.handover.keysHandover,
      flat.handover.keysHandover ? 'Supervisor Authorized' : 'Pending',
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
    'Sales Order / OA No',
    'Total Active Rooms',
    'Frame Fixing Done (Rooms)',
    'Frame Fixing Progress %',
    'Door Fixing Done (Rooms)',
    'Door Fixing Progress %',
    'Hardware Fixing Done (Rooms)',
    'Hardware Fixing Progress %',
    'Handover Completed (Rooms)',
    'Handover Progress %',
    'Overall Weighted Score',
    'Outstanding Checklist Tasks (Units)',
    'Status Indicator'
  ];

  const dataRows = Object.keys(oaGroups).map(oaNo => {
    const list = oaGroups[oaNo];
    const totalRooms = list.length;
    if (totalRooms === 0) return [oaNo, 0, 0, '0%', 0, '0%', 0, '0%', 0, '0%', '0%', 0, 'Inactive'];

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
      const frameFixed = flat.frameFixing.fastenerFixing && flat.frameFixing.frameLockAreaFinish && flat.frameFixing.outsideArchitraveFixing && flat.frameFixing.insideArchitraveFixing;
      if (frameFixed) frameDoneCount++;
      const frameCheckCount = Number(flat.frameFixing.fastenerFixing) + Number(flat.frameFixing.frameLockAreaFinish) + Number(flat.frameFixing.outsideArchitraveFixing) + Number(flat.frameFixing.insideArchitraveFixing);
      totalFrameChecks += frameCheckCount;
      totalPendingChecks += (4 - frameCheckCount);

      // door
      const doorFixed = flat.doorFixing.shutterEdgeFinishing && flat.doorFixing.gapBetweenFrameAndShutter && flat.doorFixing.iSealFixing && flat.doorFixing.visionGlassBeatFinishing;
      if (doorFixed) doorDoneCount++;
      const doorCheckCount = Number(flat.doorFixing.shutterEdgeFinishing) + Number(flat.doorFixing.gapBetweenFrameAndShutter) + Number(flat.doorFixing.iSealFixing) + Number(flat.doorFixing.visionGlassBeatFinishing);
      totalDoorChecks += doorCheckCount;
      totalPendingChecks += (4 - doorCheckCount);

      // hardware
      const hardwareFixed = flat.hardwareFixing.hingeFitting && flat.hardwareFixing.lockWithHandleFitting && flat.hardwareFixing.eyeviewInstallation && flat.hardwareFixing.towerBoltInstallation && flat.hardwareFixing.doorCloserInstallation && flat.hardwareFixing.autoDropSealInstallation;
      if (hardwareFixed) hardwareDoneCount++;
      const hardwareCheckCount = Number(flat.hardwareFixing.hingeFitting) + Number(flat.hardwareFixing.lockWithHandleFitting) + Number(flat.hardwareFixing.eyeviewInstallation) + Number(flat.hardwareFixing.towerBoltInstallation) + Number(flat.hardwareFixing.doorCloserInstallation) + Number(flat.hardwareFixing.autoDropSealInstallation);
      totalHardwareChecks += hardwareCheckCount;
      totalPendingChecks += (6 - hardwareCheckCount);

      // handover
      const handoverFixed = flat.handover.frameCarpatchFillingSanding && flat.handover.frameTouchUp && flat.handover.shutterEdgeFinishing && flat.handover.lockSlotAreaFinishing && flat.handover.shutterTouchUp && flat.handover.hardwareCleaning && flat.handover.plasticCoverRemoval && flat.handover.keysHandover;
      if (handoverFixed) handoverDoneCount++;
      const handoverCheckCount = Number(flat.handover.frameCarpatchFillingSanding) + Number(flat.handover.frameTouchUp) + Number(flat.handover.shutterEdgeFinishing) + Number(flat.handover.lockSlotAreaFinishing) + Number(flat.handover.shutterTouchUp) + Number(flat.handover.hardwareCleaning) + Number(flat.handover.plasticCoverRemoval) + Number(flat.handover.keysHandover);
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
