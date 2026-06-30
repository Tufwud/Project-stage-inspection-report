import React, { useState, useEffect } from 'react';
import { FlatRecord } from '../types';
import { getSubtaskWeight } from '../utils';
import { 
  initAuth, 
  googleSignIn, 
  logout, 
  createGoogleSheet, 
  updateSheetValues, 
  findExistingSpreadsheets,
  prepareRawQualityLogsData,
  prepareConsolidatedReportsData,
  prepareStageCostingReportData,
  ensureSOTabsExist
} from '../lib/googleSheets';
import { User } from 'firebase/auth';
import { 
  FileSpreadsheet, 
  Database, 
  RefreshCw, 
  CheckCircle2, 
  ExternalLink, 
  AlertTriangle, 
  Lock, 
  UserCheck, 
  LogOut, 
  ListOrdered, 
  Layout, 
  TrendingUp, 
  HelpCircle,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GoogleSheetsTabProps {
  flats: FlatRecord[];
  savedProjects?: any[];
}

export default function GoogleSheetsTab({ flats, savedProjects }: GoogleSheetsTabProps) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [inIframe, setInIframe] = useState(false);
  const [showConfirmSync, setShowConfirmSync] = useState(false);
  
  // Spreadsheet management
  const [spreadsheetId, setSpreadsheetId] = useState<string>('1elrqudXud5dxJwXsfo3DeNzH5L42tpgTsX3msD5LCKM');
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string>('https://docs.google.com/spreadsheets/d/1elrqudXud5dxJwXsfo3DeNzH5L42tpgTsX3msD5LCKM/edit');
  const [spreadsheetTitle, setSpreadsheetTitle] = useState('SDTower Project tracking_ app Data');
  const [fastSync, setFastSync] = useState(false);
  
  const [driveSheets, setDriveSheets] = useState<Array<{ id: string; name: string }>>([]);
  const [isSearchingDrive, setIsSearchingDrive] = useState(false);
  
  // Operation status
  const [statusStep, setStatusStep] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Reconstruct complete flattened list of flats from current active plus saved historical projects
  const getCombinedFlats = (): FlatRecord[] => {
    const flatsByOa: { [oaNo: string]: FlatRecord[] } = {};
    
    // 1. Load from savedProjects prop
    if (savedProjects && savedProjects.length > 0) {
      savedProjects.forEach(p => {
        if (p.flats && p.flatNo !== '') { // sanity check
          flatsByOa[p.salesOrderNo] = p.flats;
        }
      });
    } else {
      // 2. Load from localStorage
      try {
        const savedHistory = localStorage.getItem("door_quality_compliance_dashboard_history");
        if (savedHistory) {
          const history = JSON.parse(savedHistory);
          if (Array.isArray(history)) {
            history.forEach(p => {
              if (p.salesOrderNo && p.flats) {
                flatsByOa[p.salesOrderNo] = p.flats;
              }
            });
          }
        }
      } catch (e) {
        console.error(e);
      }
    }

    // 3. Make sure active selected current flats are always present/merged (latest in-memory state override)
    if (flats && flats.length > 0) {
      flatsByOa[flats[0].oaNo] = flats;
    }

    const merged = Object.values(flatsByOa).flat();
    return merged.length > 0 ? merged : flats;
  };

  const allFlatsToSync = getCombinedFlats();

  // Initialize Auth
  useEffect(() => {
    try {
      setInIframe(window.self !== window.top);
    } catch (e) {
      setInIframe(true);
    }

    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
        fetchDriveFiles(accessToken);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const fetchDriveFiles = async (accessToken: string) => {
    setIsSearchingDrive(true);
    try {
      const files = await findExistingSpreadsheets(accessToken);
      // Filter out files containing "Door Quality", "Compliance Tracker" or legacy versions like "ver1" and "June" to keep the options clean
      const filtered = files.filter(f => {
        const nameLower = f.name.toLowerCase();
        return (
          !nameLower.includes('door quality compliance') && 
          !nameLower.includes('compliance tracker') &&
          !nameLower.includes('ver1') &&
          !nameLower.includes('june')
        );
      });
      setDriveSheets(filtered);
    } catch (e) {
      console.error('Failed to look up Drive files:', e);
    } finally {
      setIsSearchingDrive(false);
    }
  };

  const handleLogin = async () => {
    setIsAuthenticating(true);
    setErrorBanner(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        setNeedsAuth(false);
        fetchDriveFiles(result.accessToken);
      }
    } catch (e: any) {
      console.error('Library level sign-in error:', e);
      const errString = String(e?.message || e?.code || e);
      if (errString.includes('popup-closed-by-user') || errString.includes('popup_closed_by_user')) {
        setErrorBanner(
          'Google authentication popup was blocked or closed. Because this app is running inside an iframe, cross-origin sandbox restrictions may prevent popup sign-in. To fix this: Please open the app in a new tab by clicking the "Open in new tab" icon (the outbound arrow) at the top right of the screen or using the Development App URL, then try signing in again!'
        );
      } else {
        setErrorBanner(e.message || 'Failed to authenticate with Google. Ensure popups are allowed and third-party cookies are enabled.');
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      setToken(null);
      setNeedsAuth(true);
      setSpreadsheetId('');
      setSpreadsheetUrl('');
      setDriveSheets([]);
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const handleSyncSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setErrorBanner(null);
    setSuccessBanner(null);
    setShowConfirmSync(true);
  };

  const executeSync = async () => {
    setShowConfirmSync(false);
    if (!token) return;

    setIsExporting(true);
    try {
      let activeId = spreadsheetId;
      let activeUrl = spreadsheetUrl;

      // 1. Create a sheet if none exists
      if (!activeId) {
        setStatusStep('Provisioning new Google Spreadsheet and tabs...');
        const newSheet = await createGoogleSheet(token, spreadsheetTitle);
        activeId = newSheet.spreadsheetId;
        activeUrl = newSheet.spreadsheetUrl;
        setSpreadsheetId(activeId);
        setSpreadsheetUrl(activeUrl);
      }

      // Filter and limit to up to 50 projects per master workbook
      const allUniqueSOs = Array.from(new Set(allFlatsToSync.map(flat => flat.oaNo).filter(oa => oa && oa.trim() !== '')));
      const uniqueSOs = allUniqueSOs.slice(0, 50);
      const filteredFlatsToSync = allFlatsToSync.filter(flat => uniqueSOs.includes(flat.oaNo));

      // 2. Prepare raw quality logs
      setStatusStep('Compiling records & formatting checkboxes (Raw Quality)...');
      const rawValues = prepareRawQualityLogsData(filteredFlatsToSync);
      
      // 3. Write Raw Quality Logs
      setStatusStep('Streaming Raw Quality Logs to Google Sheets API...');
      await updateSheetValues(token, activeId, 'Raw Quality Logs!A1', rawValues);

      if (!fastSync) {
        // 4. Prepare and write Consolidated Report by orders
        setStatusStep('Analyzing sales order ratios & preparing consolidated report formulas...');
        const summaryValues = prepareConsolidatedReportsData(filteredFlatsToSync);
        
        setStatusStep('Writing Executive Order Compliance aggregates...');
        await updateSheetValues(token, activeId, 'Consolidated Reports!A1', summaryValues);

        // 5. Prepare and write Stage-wise Cost Breakdown
        setStatusStep('Calculating project stage budgets & compiling cost variance reports...');
        const costingValues = prepareStageCostingReportData(filteredFlatsToSync);

        setStatusStep('Writing Project Stage-wise Cost Breakdown aggregates...');
        await updateSheetValues(token, activeId, 'Stage-wise Cost Breakdown!A1', costingValues);
      } else {
        setStatusStep('Fast Sync: Skipping heavy summary reports for faster execution...');
      }

      // 6. Ensure separate tabs for each unique Sales Order / OA No and stream raw logs specific to them
      if (uniqueSOs.length > 0) {
        // In Fast Sync mode, only sync the active project's tab to save precious mobile network operations
        const activeSO = flats && flats.length > 0 ? flats[0].oaNo : uniqueSOs[0];
        const targetSOs = fastSync ? uniqueSOs.filter(so => so === activeSO) : uniqueSOs;

        setStatusStep(`Ensuring dedicated tabs exist in the sheet for target Sales Orders...`);
        await ensureSOTabsExist(token, activeId, targetSOs);

        for (const so of targetSOs) {
          setStatusStep(`Streaming quality logs for Sales Order "${so}"...`);
          const soFlats = filteredFlatsToSync.filter(flat => flat.oaNo === so);
          const soRawValues = prepareRawQualityLogsData(soFlats);
          await updateSheetValues(token, activeId, `${so}!A1`, soRawValues);
        }
      }

      // Finish successfully
      setStatusStep('Completed in-sync!');
      const syncMsg = fastSync 
        ? `Successfully Fast-Synced active Sales Order. Upgraded to master sheet workflow (handles up to 50 active projects, sliced from ${allUniqueSOs.length})!`
        : `Successfully synchronized ${filteredFlatsToSync.length} records across up to 50 projects (sliced from ${allUniqueSOs.length} projects). All tabs updated!`;
      setSuccessBanner(syncMsg);
      fetchDriveFiles(token); // refresh file list
    } catch (err: any) {
      console.error('Error synchronizing spreadsheet:', err);
      setErrorBanner(err.message || 'An error occurred during Google Sheets upload.');
    } finally {
      setIsExporting(false);
      setStatusStep('');
    }
  };

  /**
   * Generates localized data calculations for the screen preview of the consolidated tab
   */
  const getPreviewConsolidatedData = () => {
    const headers = [
      'Sales Order / OA',
      'SO Details',
      'Total Active Rooms',
      'Frame Fixing Progress %',
      'Door Fixing Progress %',
      'Hardware Fixing Progress %',
      'Handover Progress %',
      'Overall Weighted Score'
    ];

    const oaGroups: { [oaNo: string]: FlatRecord[] } = {};
    allFlatsToSync.forEach(f => {
      if (!oaGroups[f.oaNo]) oaGroups[f.oaNo] = [];
      oaGroups[f.oaNo].push(f);
    });

    const rows = Object.keys(oaGroups).map(oaNo => {
      const list = oaGroups[oaNo];
      const count = list.length;
      const soDetails = list[0]?.soDetails || '';
      
      let tf = 0, td = 0, th = 0, tho = 0;
      list.forEach(flat => {
        tf += getSubtaskWeight(flat.frameFixing.fastenerFixing) + getSubtaskWeight(flat.frameFixing.frameLockAreaFinish) + getSubtaskWeight(flat.frameFixing.outsideArchitraveFixing) + getSubtaskWeight(flat.frameFixing.insideArchitraveFixing);
        td += getSubtaskWeight(flat.doorFixing.shutterEdgeFinishing) + getSubtaskWeight(flat.doorFixing.gapBetweenFrameAndShutter) + getSubtaskWeight(flat.doorFixing.iSealFixing) + getSubtaskWeight(flat.doorFixing.visionGlassBeatFinishing);
        th += getSubtaskWeight(flat.hardwareFixing.hingeFitting) + getSubtaskWeight(flat.hardwareFixing.lockWithHandleFitting) + getSubtaskWeight(flat.hardwareFixing.eyeviewInstallation) + getSubtaskWeight(flat.hardwareFixing.towerBoltInstallation) + getSubtaskWeight(flat.hardwareFixing.doorCloserInstallation) + getSubtaskWeight(flat.hardwareFixing.autoDropSealInstallation);
        tho += getSubtaskWeight(flat.handover.frameCarpatchFillingSanding) + getSubtaskWeight(flat.handover.frameTouchUp) + getSubtaskWeight(flat.handover.shutterEdgeFinishing) + getSubtaskWeight(flat.handover.lockSlotAreaFinishing) + getSubtaskWeight(flat.handover.shutterTouchUp) + getSubtaskWeight(flat.handover.hardwareCleaning) + getSubtaskWeight(flat.handover.plasticCoverRemoval) + getSubtaskWeight(flat.handover.keysHandover);
      });

      const framePct = Math.round((tf / (count * 4)) * 100) || 0;
      const doorPct = Math.round((td / (count * 4)) * 100) || 0;
      const hardPct = Math.round((th / (count * 6)) * 100) || 0;
      const handPct = Math.round((tho / (count * 8)) * 100) || 0;
      const weightScore = Math.round((framePct + doorPct + hardPct + handPct) / 4);

      return {
        oaNo,
        soDetails,
        count,
        framePct,
        doorPct,
        hardPct,
        handPct,
        weightScore
      };
    });

    return { headers, rows };
  };

  const previewData = getPreviewConsolidatedData();

  return (
    <div className="space-y-8">
      
      {/* HEADER EXPLANATION */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider font-mono">
            <Database className="w-4 h-4 animate-pulse" />
            <span>Consolidated Google Workspace Integration</span>
          </div>
          <h2 className="text-xl font-black text-zinc-900 tracking-tight">Active Google Sheets Sync Center</h2>
          <p className="text-sm text-zinc-500 font-medium">
            Connect directly to Google Workspace to stream verified checklist updates and dynamically compute supervisor executive reports.
          </p>
        </div>

        {user && (
          <div className="flex items-center gap-3 bg-indigo-50/50 px-4 py-2.5 rounded-2xl border border-indigo-100/50 self-start md:self-auto">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || ''} className="w-9 h-9 rounded-full border border-indigo-200 shadow-2xs" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold text-sm flex items-center justify-center">
                {user.displayName?.slice(0, 2).toUpperCase() || 'US'}
              </div>
            )}
            <div className="text-left">
              <div className="text-xs font-bold text-zinc-800 flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>{user.displayName || 'Authorized Client'}</span>
              </div>
              <div className="text-[10px] text-zinc-500 font-mono font-medium truncate max-w-[180px]">{user.email}</div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign out from Google Client"
              className="ml-2 p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {needsAuth ? (
        /* GOOGLE AUTH REQUIREMENT SCREEN */
        <div className="bg-white rounded-3xl border border-zinc-200 p-8 text-center max-w-lg mx-auto shadow-md space-y-6">
          <div className="w-16 h-16 bg-zinc-50 border border-zinc-100 rounded-2xl flex items-center justify-center mx-auto text-indigo-600 shadow-2xs">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="font-extrabold text-lg text-zinc-900 tracking-tight">Access Authorization Required</h3>
            <p className="text-sm text-zinc-500 leading-relaxed font-medium">
              To write checklist logs to spreadsheets directly, secure Google Credentials must be initialized. This connects to your Google Drive to store and synchronize files.
            </p>
          </div>

          {inIframe && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-left space-y-2 md:space-y-2.5">
              <div className="flex items-center gap-2 text-amber-800 font-extrabold text-xs uppercase font-mono">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Active Preview Iframe Detected</span>
              </div>
              <p className="text-xs text-amber-700/90 leading-relaxed font-semibold">
                Google Sheets authorization requires a login popup. Browser sandbox rules block authentication popups inside nested iframes. To fix this, please open the application in a full tab:
              </p>
              <div className="pt-1">
                <a
                  href={window.location.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 py-2 px-4 bg-white hover:bg-zinc-50 border border-amber-250 text-amber-950 rounded-xl text-xs font-bold transition shadow-3xs"
                >
                  <span>Open App in New Tab</span>
                  <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
                </a>
              </div>
            </div>
          )}

          {errorBanner && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-1.5 text-left">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errorBanner}</span>
            </div>
          )}

          <div className="flex justify-center pt-2">
            <button
              onClick={handleLogin}
              disabled={isAuthenticating}
              className={`gsi-material-button relative overflow-hidden transition-all flex items-center gap-2 cursor-pointer border border-zinc-300 bg-white hover:bg-zinc-50 px-6 py-3 rounded-xl shadow-xs ${
                isAuthenticating ? 'opacity-50 pointer-events-none' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
                <span className="text-sm font-bold text-zinc-700 tracking-tight font-sans">
                  {isAuthenticating ? 'Requesting Authorization...' : 'Sign in with Google'}
                </span>
              </div>
            </button>
          </div>
        </div>
      ) : (
        /* MAIN WORKPLACE INTERFACE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* SYNC ACTIONS SIDE CARD */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-6">
              
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="text-emerald-500 w-5 h-5 fill-emerald-50" />
                <h3 className="font-extrabold text-base text-zinc-900 tracking-tight">Active Google Sync</h3>
              </div>

              {successBanner && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2.5 animate-fadeIn">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>{successBanner}</span>
                </div>
              )}

              {errorBanner && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs font-bold rounded-xl flex items-center gap-1.5 animate-fadeIn">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{errorBanner}</span>
                </div>
              )}

              <form onSubmit={handleSyncSubmit} className="space-y-5">
                
                {/* Mode Selector */}
                <div className="space-y-1.5">
                  <label className="block text-[13px] font-bold text-zinc-600">
                    Sychronization Destination
                  </label>
                  <p className="text-[11px] text-zinc-400 font-medium leading-none mb-1">
                    Select where the quality checklist updates will stream to:
                  </p>
                  
                   <div className="space-y-2">
                    {/* OPTION 0: Default SDTower Project Workbook */}
                     <label className={`w-full block p-3 rounded-xl border-2 hover:bg-zinc-50 relative cursor-pointer font-sans transition ${
                      spreadsheetId === '1elrqudXud5dxJwXsfo3DeNzH5L42tpgTsX3msD5LCKM'
                        ? 'border-emerald-600 bg-emerald-50/20' 
                        : 'border-zinc-200 bg-white'
                    }`}>
                      <input 
                        type="radio" 
                        name="sheetDestination" 
                        checked={spreadsheetId === '1elrqudXud5dxJwXsfo3DeNzH5L42tpgTsX3msD5LCKM'}
                        onChange={() => {
                          setSpreadsheetId('1elrqudXud5dxJwXsfo3DeNzH5L42tpgTsX3msD5LCKM');
                          setSpreadsheetUrl('https://docs.google.com/spreadsheets/d/1elrqudXud5dxJwXsfo3DeNzH5L42tpgTsX3msD5LCKM/edit');
                          setSpreadsheetTitle('SDTower Project tracking_ app Data');
                        }}
                        className="sr-only"
                      />
                      <div className="flex items-center gap-2.5">
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          spreadsheetId === '1elrqudXud5dxJwXsfo3DeNzH5L42tpgTsX3msD5LCKM' ? 'border-emerald-600 text-emerald-600 font-black text-xs' : 'border-zinc-300'
                        }`}>
                          {spreadsheetId === '1elrqudXud5dxJwXsfo3DeNzH5L42tpgTsX3msD5LCKM' && "✓"}
                        </span>
                        <div>
                          <span className="block text-xs font-extrabold text-zinc-850">SDTower Project tracking_ app Data (Default)</span>
                          <span className="block text-[10px] text-zinc-400 font-medium">Stream to verified Google Workbook ID: 1elrqu...</span>
                        </div>
                      </div>
                    </label>

                    {/* OPTION 1: Create New Sheet */}
                    <label className={`w-full block p-3 rounded-xl border-2 hover:bg-zinc-50 relative cursor-pointer font-sans transition ${
                      !spreadsheetId 
                        ? 'border-indigo-600 bg-indigo-50/20' 
                        : 'border-zinc-200 bg-white'
                    }`}>
                      <input 
                        type="radio" 
                        name="sheetDestination" 
                        checked={!spreadsheetId}
                        onChange={() => {
                          setSpreadsheetId('');
                          setSpreadsheetUrl('');
                          setSpreadsheetTitle(`SDTower Project tracking_ app Data - ${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}`);
                        }}
                        className="sr-only"
                      />
                      <div className="flex items-center gap-2.5">
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                          !spreadsheetId ? 'border-indigo-600 text-indigo-600 font-black text-xs' : 'border-zinc-300'
                        }`}>
                          {!spreadsheetId && "✓"}
                        </span>
                        <div>
                          <span className="block text-xs font-extrabold text-zinc-850">Create Custom New Google Sheet</span>
                          <span className="block text-[10px] text-zinc-400 font-medium">Generate a separate tracker dynamically in Google Drive</span>
                        </div>
                      </div>
                    </label>

                    {/* OPTION 2: Use Existing Sheets */}
                    {driveSheets.length > 0 && (
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-none pt-1">
                          Select from Google Drive (Recommended)
                        </div>
                        
                        <div className="max-h-48 overflow-y-auto space-y-1.5 custom-scroll-area pr-1">
                          {driveSheets.map(sheet => {
                            const isSelected = spreadsheetId === sheet.id;
                            return (
                              <button
                                type="button"
                                key={sheet.id}
                                onClick={() => {
                                  setSpreadsheetId(sheet.id);
                                  setSpreadsheetUrl(`https://docs.google.com/spreadsheets/d/${sheet.id}/edit`);
                                }}
                                className={`w-full text-left p-2.5 rounded-lg border-2 text-xs font-semibold flex items-center justify-between transition-all ${
                                  isSelected 
                                    ? 'border-indigo-600 bg-indigo-50/50 text-indigo-950' 
                                    : 'border-zinc-200 hover:border-zinc-300 bg-white text-zinc-600'
                                }`}
                              >
                                <span className="truncate max-w-[200px] font-sans">{sheet.name}</span>
                                <span className="font-mono text-[9px] text-zinc-400 truncate max-w-[80px]">({sheet.id.slice(0, 6)}...)</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* SPREADSHEET NAME FIELD - ONLY if creating new sheet */}
                {!spreadsheetId && (
                  <div className="space-y-1.5 animate-fadeIn">
                    <label className="block text-[13px] font-bold text-zinc-650">
                      New Spreadsheet Filename
                    </label>
                    <input
                      type="text"
                      value={spreadsheetTitle}
                      onChange={(e) => setSpreadsheetTitle(e.target.value)}
                      placeholder="e.g. Tufwud Door Quality Tracker"
                      className="w-full px-3.5 py-2.5 bg-white border border-zinc-350 focus:border-blue-500 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                      required
                    />
                  </div>
                )}

                {/* EXPLICIT ID DISPLAY IF SELECTED */}
                {spreadsheetId && (
                  <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1 animate-fadeIn">
                    <span className="block text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Active Workspace Target ID</span>
                    <span className="block font-mono text-[11px] font-bold text-zinc-700 truncate">{spreadsheetId}</span>
                  </div>
                )}

                {/* Mobile App Fast Sync Switch */}
                <div className="p-3.5 bg-indigo-50/50 border border-indigo-150 rounded-xl space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="block text-xs font-extrabold text-indigo-950">Mobile App Fast Sync</span>
                      <span className="block text-[10px] text-zinc-500 font-medium leading-none mt-1">
                        Updates Raw Quality Logs & Active Sales Order tab only
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFastSync(!fastSync)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer shrink-0 ${
                        fastSync ? 'bg-indigo-600' : 'bg-zinc-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          fastSync ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  <p className="text-[10px] text-indigo-900/70 font-medium leading-normal pt-1.5 border-t border-indigo-100/50">
                    💡 Perfect for sites with low cellular connectivity. Bypasses heavy formula compilation, reducing API load and speeding up transfers by up to 90%! Supports up to 50 active projects per master workbook.
                  </p>
                </div>

                {/* ACTION BUTTON */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isExporting}
                    className={`w-full py-3 px-4 font-extrabold text-xs tracking-wider uppercase rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
                      isExporting 
                        ? 'bg-zinc-200 text-zinc-400 select-none' 
                        : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-98'
                    }`}
                  >
                    <RefreshCw className={`w-4 h-4 ${isExporting ? 'animate-spin' : ''}`} />
                    <span>{isExporting ? 'Synchronizing State...' : 'Configure & Stream to Sheets'}</span>
                  </button>
                </div>

                {/* OPEN GOOGLE SHEET LINK */}
                {spreadsheetUrl && (
                  <div className="animate-fadeIn pt-1">
                    <a
                      href={spreadsheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-2.5 px-4 bg-white hover:bg-zinc-50 border border-zinc-300 rounded-xl text-xs font-extrabold text-indigo-700 flex items-center justify-center gap-1.5 transition shadow-2xs"
                    >
                      <span>Open Associated Spreadsheet</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

              </form>

              {/* Progress Detailer */}
              <AnimatePresence>
                {isExporting && statusStep && (
                  <motion.div 
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-3.5 bg-indigo-50/50 border border-indigo-100 rounded-xl flex items-center gap-3"
                  >
                    <div className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin shrink-0"></div>
                    <div className="text-left">
                      <span className="block text-[8px] uppercase tracking-widest font-black text-indigo-400 font-mono">Sync Progress Logs</span>
                      <span className="block text-[11px] font-bold text-indigo-850 leading-tight">{statusStep}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            {/* INTEGRITY INFO */}
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-100/60 rounded-2xl p-4 flex gap-3.5">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs text-amber-900/85">
                <span className="block font-bold uppercase tracking-wide leading-none text-amber-950">Active Sync Integrity</span>
                <p className="leading-relaxed">
                  Exporting structures automatically configures formatting. Checkboxes will render as native clickable triggers within Google Sheets worksheets immediately.
                </p>
              </div>
            </div>
          </div>

          {/* DYNAMIC CONSOLIDATION LIVE PREVIEW TAB */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                    <ListOrdered className="w-4.5 h-4.5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-zinc-900 tracking-tight">Consolidated Tab live Preview</h3>
                    <p className="text-[11px] text-zinc-400 font-medium">Aggregated real-time order specifications which are written inside your second tab.</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-start sm:self-auto text-[10px] font-bold font-mono tracking-wider text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg">
                  <TrendingUp className="w-3 h-3" />
                  <span>Weighted Aggregates</span>
                </div>
              </div>

              {/* Preview Table Rendering */}
              <div className="overflow-x-auto w-full border border-zinc-200/60 rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-zinc-50 border-b border-zinc-200 font-bold text-zinc-650 uppercase tracking-wider text-[10px]">
                      {previewData.headers.map((h, i) => (
                        <th key={i} className="py-2.5 px-3">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200/50 font-medium text-zinc-700">
                    {previewData.rows.map((row, index) => (
                      <tr key={index} className="hover:bg-zinc-50/50 transition">
                        <td className="py-3 px-3 font-bold text-zinc-900 font-mono">{row.oaNo}</td>
                        <td className="py-3 px-3 max-w-[150px] truncate text-zinc-650 font-medium" title={row.soDetails}>{row.soDetails || <em className="text-zinc-400">N/A</em>}</td>
                        <td className="py-3 px-3">{row.count} rooms</td>
                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            <span>{row.framePct}%</span>
                            <div className="w-16 h-1 bg-zinc-100 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${row.framePct}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            <span>{row.doorPct}%</span>
                            <div className="w-16 h-1 bg-zinc-100 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${row.doorPct}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            <span>{row.hardPct}%</span>
                            <div className="w-16 h-1 bg-zinc-100 rounded-full overflow-hidden">
                              <div className="h-full bg-violet-500 rounded-full" style={{ width: `${row.hardPct}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="space-y-1">
                            <span>{row.handPct}%</span>
                            <div className="w-16 h-1 bg-zinc-100 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${row.handPct}%` }}></div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[10px] bg-zinc-900 text-white font-mono">
                            {row.weightScore}%
                          </span>
                        </td>
                      </tr>
                    ))}
                    {previewData.rows.length === 0 && (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-zinc-400 font-semibold select-none">
                          No active checklist records tracked to build report previews.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Informative Help Guide */}
              <div className="bg-zinc-50/80 border border-zinc-150 rounded-xl p-4 flex gap-3">
                <HelpCircle className="w-4.5 h-4.5 text-zinc-400 shrink-0 mt-0.5" />
                <div className="space-y-1 text-[11px] text-zinc-500 font-medium">
                  <span className="block font-bold text-zinc-700">How Consolidated Tab Calculations Work</span>
                  <p className="leading-relaxed">
                    Once synced, Google Sheets will display of each Sales Order Order identity automatically aggregated. The raw checklist sheets represent the 22 specific sub-tasks which map directly back into the live compliance ratios.
                  </p>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* CUSTOM REACT CONFIRMATION DIALOG (IFRAME-SAFE) */}
      <AnimatePresence>
        {showConfirmSync && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl border border-zinc-200 p-6 max-w-sm sm:max-w-md w-full shadow-2xl space-y-6"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-amber-50 rounded-xl text-amber-600 border border-amber-100 shrink-0">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="space-y-1.5 flex-1 text-left">
                  <h3 className="font-extrabold text-base text-zinc-900 tracking-tight">Confirm Spreadsheet Sync</h3>
                  <p className="text-xs text-zinc-500 font-medium">
                    {spreadsheetId 
                      ? `This will completely overwrite the existing data inside Google Spreadsheet ID "${spreadsheetId.slice(0, 8)}...".`
                      : `This will provision a brand-new Google Sheet spreadsheet titled "${spreadsheetTitle}" in your Google Drive.`
                    }
                  </p>
                </div>
              </div>

              <div className="bg-zinc-50/80 border border-zinc-150 rounded-xl p-4 space-y-2 text-left animate-fadeIn">
                <div className="flex items-center justify-between">
                  <span className="block text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Worksheets to sync</span>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${fastSync ? 'bg-amber-100 text-amber-800' : 'bg-indigo-100 text-indigo-800'}`}>
                    {fastSync ? 'Fast Sync Mode' : 'Standard Full Sync'}
                  </span>
                </div>
                <ul className="text-xs font-semibold text-zinc-700 space-y-1.5">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>Tab 1: <strong>"Raw Quality Logs"</strong> ({flats.length} checklists)</span>
                  </li>
                  {!fastSync ? (
                    <>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                        <span>Tab 2: <strong>"Consolidated Reports"</strong> (Sales Order stats)</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                        <span>Tab 3: <strong>"Stage-wise Cost Breakdown"</strong></span>
                      </li>
                    </>
                  ) : (
                    <li className="flex items-center gap-2 text-zinc-400 italic">
                      <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 shrink-0" />
                      <span>Other tabs skipped to optimize data speeds</span>
                    </li>
                  )}
                </ul>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmSync(false)}
                  className="flex-1 py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 rounded-xl text-xs font-extrabold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeSync}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold transition shadow-xs cursor-pointer"
                >
                  Yes, Sync Now
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
