import React, { useState } from 'react';
import { FlatRecord } from '../types';
import { TufwudLogoTransparent } from './TufwudLogo';
import { 
  getFlatBasePrice, 
  getFlatTotalCompletedCost, 
  getFinancialStageEarned, 
  getFinancialStageProgress,
  getFlatOverallProgress,
  getFinancialStagePct,
  getSubtaskWeight,
  FINANCIAL_STAGES 
} from '../utils';
import { 
  IndianRupee, 
  Download, 
  FileSpreadsheet, 
  Search, 
  Layers, 
  CheckCircle2, 
  Building, 
  Coins, 
  Filter, 
  ArrowUpDown,
  Printer,
  Calendar,
  FileText,
  User,
  Activity
} from 'lucide-react';

interface FinancialReportsTabProps {
  flats: FlatRecord[];
}

type SortField = 'id' | 'flatNo' | 'price' | 'earned' | 'progress';
type SortOrder = 'asc' | 'desc';

export default function FinancialReportsTab({ flats }: FinancialReportsTabProps) {
  // Main Tab Control: 'summaries' | 'ledger' | 'certificates' | 'runningBills' | 'handoverTab'
  const [activeTab, setActiveTab] = useState<'summaries' | 'ledger' | 'certificates' | 'runningBills' | 'handoverTab'>('summaries');

  // State for Report A (Detailed Door List Ledger) Filtering and Sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTower, setSelectedTower] = useState('All');
  const [selectedFloor, setSelectedFloor] = useState('All');
  const [sortField, setSortField] = useState<SortField>('flatNo');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Contractor stage-wise state filters for Detailed report
  const [contractorSearch, setContractorSearch] = useState('');
  const [contractorStage, setContractorStage] = useState<'any' | 'frameFixing' | 'doorFixing' | 'hardwareFixing' | 'handover'>('any');

  // Certificate Specific States
  const [certType, setCertType] = useState<'door' | 'tower' | 'project' | 'ra_bill' | 'handover'>('door');
  const [selectedCertTower, setSelectedCertTower] = useState('All');
  const [selectedCertContractor, setSelectedCertContractor] = useState('All');
  const [raFromDate, setRaFromDate] = useState('2026-06-01');
  const [raToDate, setRaToDate] = useState('2026-06-30');

  // Handover letter / certificate specific state parameters
  const [handoverMode, setHandoverMode] = useState<'certificate' | 'letter'>('certificate');
  const [clientContactName, setClientContactName] = useState('Rahatul Hoque');
  const [siteAddress, setSiteAddress] = useState('Godrej Woods, Sector 43, Noida, UP');
  const [companyAddressKey, setCompanyAddressKey] = useState<'kolkata' | 'mumbai'>('kolkata');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  // Running Bill Specific States
  const [selectedBillMonth, setSelectedBillMonth] = useState('All');

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
  const uniqueTowers = Array.from(new Set(flats.map(f => f.towerId))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  const uniqueFloors = Array.from(new Set(flats.map(f => f.floor))).sort((a, b) => a - b);
  const uniqueContractors = Array.from(new Set(flats.map(f => f.contractor || f.frameFixing?.contractor || 'Prabir Dhol'))).filter(Boolean).sort();

  // --- HANDOVER DOWNLOAD OPTIONS ---
  const downloadAsPDF = () => {
    const element = document.querySelector('.printable-cert-deck');
    if (!element) return;

    setIsGeneratingPdf(true);

    const proceedWithPdf = () => {
      const opt = {
        margin:       [0.3, 0.3, 0.3, 0.3], // top, left, bottom, right in inches
        filename:     `Tufwud_Handover_${handoverMode === 'certificate' ? 'Certificate' : 'Letter'}_${flats[0]?.oaNo || 'SO'}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
      };

      (window as any).html2pdf()
        .set(opt)
        .from(element)
        .save()
        .then(() => {
          setIsGeneratingPdf(false);
        })
        .catch((err: any) => {
          console.error('PDF Generation Error:', err);
          setIsGeneratingPdf(false);
          alert('Could not download PDF. Please try again or use "Print / Save as PDF" instead.');
        });
    };

    if (typeof (window as any).html2pdf === 'function') {
      proceedWithPdf();
    } else {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.integrity = 'sha512-GsLlZN/3F2ErC5IfS51RCYfSPv1UcKQNmyGsZEG92IHOzKZoY749YBDIpPhUF1JYII400CS7UMyTXgAtIa9laA==';
      script.crossOrigin = 'anonymous';
      script.referrerPolicy = 'no-referrer';
      script.onload = () => {
        proceedWithPdf();
      };
      script.onerror = () => {
        setIsGeneratingPdf(false);
        alert('Could not load PDF library. Please make sure you are connected to the internet, or use the "Print / Save as PDF" option.');
      };
      document.body.appendChild(script);
    }
  };

  const downloadAsHTML = () => {
    const element = document.querySelector('.printable-cert-deck');
    if (!element) return;
    
    const styledHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tufwud Handover - ${handoverMode === 'certificate' ? 'Certificate' : 'Letter'}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', sans-serif;
      background-color: #f4f4f5;
      padding: 2rem;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .font-mono {
      font-family: 'JetBrains Mono', monospace;
    }
    @media print {
      body {
        background-color: white;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div style="width: 100%; max-width: 56rem;">
    ${element.innerHTML}
  </div>
</body>
</html>
    `;
    
    const blob = new Blob([styledHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tufwud_Handover_${handoverMode === 'certificate' ? 'Certificate' : 'Letter'}_${flats[0]?.oaNo || 'SO'}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAsWord = () => {
    const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const filtered = flats.filter(d => {
      if (selectedCertTower !== 'All' && d.towerId !== selectedCertTower) return false;
      if (selectedCertContractor !== 'All' && d.contractor !== selectedCertContractor) return false;
      return true;
    });

    const firstFlat = flats[0];
    const salesOrder = firstFlat?.oaNo || 'SO-387026';
    const clientSpec = firstFlat?.soDetails || 'Godrej Woods';
    const siteSupervisor = firstFlat?.supervisor || 'Aarif Taslim';
    const assignedContractor = firstFlat?.contractor || 'Prabir Dhol';

    let contentHtml = '';

    if (handoverMode === 'letter') {
      // Group flats by floor or tower-floor
      const floorsGrouped: { [key: string]: { total: number; installed: number; handedOver: number } } = {};
      filtered.forEach(door => {
        const key = selectedCertTower === 'All' ? `${door.towerId} - Level ${door.floor}` : `Level ${door.floor}`;
        if (!floorsGrouped[key]) {
          floorsGrouped[key] = { total: 0, installed: 0, handedOver: 0 };
        }
        const isInstalled = getFlatOverallProgress(door) >= 100;
        const isKeysHandedOver = getSubtaskWeight(door.handover.keysHandover) === 1.0;
        floorsGrouped[key].total += 1;
        if (isInstalled) {
          floorsGrouped[key].installed += 1;
        }
        if (isInstalled && isKeysHandedOver) {
          floorsGrouped[key].handedOver += 1;
        }
      });

      let totalDoorsCount = 0;
      let totalInstalledCount = 0;
      let totalHandedOverCount = 0;
      Object.values(floorsGrouped).forEach(g => {
        totalDoorsCount += g.total;
        totalInstalledCount += g.installed;
        totalHandedOverCount += g.handedOver;
      });
      const totalHandoverPct = totalDoorsCount > 0 ? Math.round((totalHandedOverCount / totalDoorsCount) * 100) : 0;

      let tableRowsHtml = '';
      Object.entries(floorsGrouped).forEach(([floorKey, counts]) => {
        tableRowsHtml += `
          <tr>
            <td style="border: 1px solid #d1d5db; padding: 10px; font-weight: bold; color: #111827; font-family: 'Calibri', 'Arial', sans-serif;">${floorKey}</td>
            <td align="center" style="border: 1px solid #d1d5db; padding: 10px; color: #4b5563; font-family: 'Consolas', monospace;">${counts.total}</td>
            <td align="center" style="border: 1px solid #d1d5db; padding: 10px; color: #10b981; font-weight: bold; font-family: 'Consolas', monospace;">${counts.installed}</td>
            <td align="center" style="border: 1px solid #d1d5db; padding: 10px; color: #4f46e5; font-weight: bold; background-color: #f5f3ff; font-family: 'Consolas', monospace;">${counts.handedOver}</td>
          </tr>
        `;
      });

      if (totalDoorsCount > 0) {
        tableRowsHtml += `
          <tr style="background-color: #f9fafb; font-weight: bold; border-top: 2px solid #9ca3af;">
            <td style="border: 1px solid #d1d5db; padding: 12px; font-weight: 950; color: #111827; font-family: 'Calibri', 'Arial', sans-serif;">GRAND TOTAL</td>
            <td align="center" style="border: 1px solid #d1d5db; padding: 12px; font-family: 'Consolas', monospace;">${totalDoorsCount}</td>
            <td align="center" style="border: 1px solid #d1d5db; padding: 12px; color: #047857; font-family: 'Consolas', monospace;">${totalInstalledCount}</td>
            <td align="center" style="border: 1px solid #d1d5db; padding: 12px; color: #4338ca; background-color: #e0e7ff; font-family: 'Consolas', monospace;">${totalHandedOverCount} (${totalHandoverPct}%)</td>
          </tr>
        `;
      } else {
        tableRowsHtml += `
          <tr>
            <td colspan="4" align="center" style="border: 1px solid #d1d5db; padding: 25px; color: #9ca3af; font-style: italic; font-family: 'Calibri', 'Arial', sans-serif;">
              No matching records found for floor grouping.
            </td>
          </tr>
        `;
      }

      contentHtml = `
        <!-- Official Corporate Letterhead -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse; margin-bottom: 25px; border-bottom: 3px solid #8a5a37; padding-bottom: 20px;">
          <tr>
            <td width="55%" valign="top" style="text-align: left; font-family: 'Calibri', 'Arial', sans-serif;">
              <div style="font-size: 26pt; font-weight: 900; color: #6b4226; letter-spacing: -0.5px; line-height: 1.0;">TUFWUD</div>
              <div style="font-size: 9.5pt; font-weight: bold; color: #71717a; text-transform: uppercase; margin-top: 5px; letter-spacing: 1.5px;">Site Installation — Handover Letter</div>
              <div style="margin-top: 12px;">
                <span style="font-size: 8.5pt; font-weight: bold; color: #4b5563; border: 1px solid #d1d5db; padding: 3px 8px; background-color: #f9fafb; margin-right: 6px; border-radius: 4px;">FSC® C157844</span>
                <span style="font-size: 8.5pt; font-weight: bold; color: #4b5563; border: 1px solid #d1d5db; padding: 3px 8px; background-color: #f9fafb; margin-right: 6px; border-radius: 4px;">ISO Certified</span>
                <span style="font-size: 8.5pt; font-weight: bold; color: #4b5563; border: 1px solid #d1d5db; padding: 3px 8px; background-color: #f9fafb; border-radius: 4px;">ISI Certified</span>
              </div>
            </td>
            <td width="45%" valign="top" style="text-align: right; font-family: 'Calibri', 'Arial', sans-serif;">
              <div style="font-size: 10.5pt; font-weight: 900; color: #111827; text-transform: uppercase; letter-spacing: 0.5px;">Tufwud Doors & Accessories Private Limited</div>
              <div style="font-size: 8.5pt; font-weight: bold; color: #52525b; font-style: italic; margin-top: 2px;">Formerly "Khemka Timber Pvt. Ltd"</div>
              <div style="font-size: 8pt; font-weight: bold; color: #a1a1aa; font-family: 'Consolas', monospace; margin-top: 2px;">CIN: U20219WB1988PTC045247</div>
              <div style="font-size: 8.5pt; color: #4b5563; margin-top: 8px; line-height: 1.4;">
                ${companyAddressKey === 'kolkata' ? 
                  `<span style="font-weight: bold; color: #1f2937; font-size: 9pt;">📍 111, D. H. Road, Behala, Kadamtala, Kolkata 700 063</span>` : 
                  `<span style="font-weight: bold; color: #1f2937; font-size: 9pt;">📍 Sai Sangam Building, 4th Floor Flat No. 406, Plot 51A, Sector 16 Ulwe, Kharkopar, Navi Mumbai 410 206</span>`
                }
                <br />
                <span style="color: #4b5563; font-size: 8pt;">📞 +91 84200 50754 / +91 83350 60453 | ✉️ sales@tufwud.in / admin@tufwud.in</span>
                <br />
                <span style="font-weight: bold; color: #4b5563; font-family: 'Consolas', monospace; font-size: 8.5pt;">🌐 www.tufwud.com</span>
              </div>
            </td>
          </tr>
        </table>

        <!-- Metadata Block -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse; margin-bottom: 25px; font-family: 'Calibri', 'Arial', sans-serif;">
          <tr>
            <td width="50%" align="left" style="font-size: 10.5pt; font-weight: bold; color: #111827;">Date: ${todayStr}</td>
            <td width="50%" align="right" style="font-size: 10.5pt; font-weight: bold; color: #111827;">Order No: ${salesOrder}-FINAL</td>
          </tr>
        </table>

        <!-- Recipient Address -->
        <div style="margin-bottom: 25px; font-family: 'Calibri', 'Arial', sans-serif;">
          <div style="font-size: 9pt; font-weight: bold; color: #9ca3af; text-transform: uppercase; letter-spacing: 1px;">To,</div>
          <div style="font-size: 12pt; font-weight: bold; color: #111827; margin-top: 3px;">${clientContactName || '_______________________'}</div>
          <div style="font-size: 10.5pt; color: #4b5563; white-space: pre-wrap; margin-top: 3px; max-width: 450px; line-height: 1.4;">${siteAddress || '_______________________'}</div>
        </div>

        <!-- Subject Line -->
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 12px 18px; border-radius: 8px; font-family: 'Calibri', 'Arial', sans-serif; font-size: 10.5pt; font-weight: bold; color: #111827; margin-bottom: 25px;">
          Subject: Handover of door installation work — Order No. {flats[0]?.oaNo || 'SO-387026'}
        </div>

        <!-- Salutation and Letter Body -->
        <div style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; color: #374151; line-height: 1.5; margin-bottom: 30px;">
          <p>Dear Sir/Madam,</p>
          <p>
            This letter serves to formally confirm the status and progressive handover of the door, frame, architrave, and hardware installation works executed under the aforementioned contract order. All specified units, as detailed in the comprehensive schedule below, have been meticulously installed, inspected for quality compliance, and officially signed off as ready for handover as of <strong>${todayStr}</strong>.
          </p>
        </div>

        <!-- Floors Summary Table -->
        <table width="100%" border="1" cellspacing="0" cellpadding="0" style="border-collapse:collapse; border: 1px solid #d1d5db; font-family: 'Calibri', 'Arial', sans-serif; font-size: 10pt; margin-bottom: 30px;">
          <thead>
            <tr style="background-color: #f3f4f6; color: #4b5563; font-weight: bold; text-transform: uppercase; font-size: 9pt; height: 35px;">
              <th align="left" style="padding: 10px; border: 1px solid #d1d5db;">Floor / Tower Location</th>
              <th align="center" style="padding: 10px; border: 1px solid #d1d5db; width: 110px;">Total Doors</th>
              <th align="center" style="padding: 10px; border: 1px solid #d1d5db; width: 110px;">Installed</th>
              <th align="center" style="padding: 10px; border: 1px solid #d1d5db; width: 130px;">Handed Over</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <!-- Verification Note -->
        <div style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 10.5pt; color: #6b7280; font-style: italic; margin-bottom: 45px;">
          We request you to kindly review the installed work and countersign below to confirm formal receipt and site handover.
        </div>

        <!-- Signatures Table -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse; font-family: 'Calibri', 'Arial', sans-serif; margin-bottom: 50px;">
          <tr>
            <td width="45%" valign="top" style="text-align: center;">
              <div style="border-bottom: 1px solid #9ca3af; margin: 0 auto 12px auto; width: 85%; height: 40px;">&nbsp;</div>
              <div style="font-size: 10pt; font-weight: bold; color: #4b5563;">
                For Tufwud Doors &amp; Accessories Pvt. Ltd.
                <span style="display: block; font-size: 8.5pt; color: #9ca3af; font-weight: normal; margin-top: 3px;">name, signature &amp; date</span>
              </div>
            </td>
            <td width="10%">&nbsp;</td>
            <td width="45%" valign="top" style="text-align: center;">
              <div style="border-bottom: 1px solid #4f46e5; margin: 0 auto 12px auto; width: 85%; height: 40px;">&nbsp;</div>
              <div style="font-size: 10pt; font-weight: bold; color: #4f46e5;">
                Client / Authorized Site Representative
                <span style="display: block; font-size: 8.5pt; color: #9ca3af; font-weight: normal; margin-top: 3px;">name, signature &amp; date</span>
              </div>
            </td>
          </tr>
        </table>

        <!-- Premium Corporate Footer -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse; border-top: 1.5px solid #8a5a37; padding-top: 15px; margin-top: 40px; font-family: 'Calibri', 'Arial', sans-serif;">
          <tr>
            <td width="50%" align="left" style="font-size: 9pt; font-weight: bold; color: #6b7280; text-transform: uppercase;">
              Kolkata | Mumbai | Delhi | Bangalore
            </td>
            <td width="50%" align="right" style="font-size: 9.5pt; font-weight: 900; color: #8a5a37; letter-spacing: 0.5px;">
              CHOOSE INSULATED - CHOOSE TUFWUD
            </td>
          </tr>
        </table>
      `;
    } else {
      // handoverMode === 'certificate'
      let certTableRowsHtml = '';
      filtered.slice(0, 8).forEach(door => {
        const progress = getFlatOverallProgress(door);
        const keysStatus = door.handover?.keysHandover ? 'Keys Handed Over' : 'Keys Pending';
        const hardwareStatus = (door.hardwareFixing?.hingeFitting && door.hardwareFixing?.lockWithHandleFitting) ? 'Hardware Mapped' : 'Hardware Open';
        
        // Find stages with photos to display clean textual checklist
        const stagesList: string[] = [];
        if (door.photos?.frame_install?.length) stagesList.push('Frame');
        if (door.photos?.shutter_install?.length) stagesList.push('Shutter');
        if (door.photos?.hardware_fixing?.length) stagesList.push('Hdw');
        if (door.photos?.painting?.length) stagesList.push('Paint');
        if (door.photos?.handover?.length) stagesList.push('Handover');
        
        const photoChecklist = stagesList.length > 0 ? stagesList.map(s => `✓ ${s}`).join('  ') : 'No photos';

        certTableRowsHtml += `
          <tr>
            <td style="border: 1px solid #d1d5db; padding: 10px; font-family: 'Consolas', monospace; font-weight: bold; font-size: 9.5pt; color: #111827;">
              ${door.id.split('/').pop()}
              <div style="font-family: 'Calibri', 'Arial', sans-serif; font-size: 8.5pt; color: #6b7280; font-weight: normal; margin-top: 2px;">
                ${door.towerId} | Level ${door.floor} | Flat ${door.flatNo}
              </div>
            </td>
            <td style="border: 1px solid #d1d5db; padding: 10px; font-family: 'Calibri', 'Arial', sans-serif; font-size: 9pt;">
              <div style="font-weight: bold; color: ${door.handover?.keysHandover ? '#047857' : '#4b5563'}">${keysStatus}</div>
              <div style="color: #6b7280; font-size: 8.5pt; margin-top: 3px;">${hardwareStatus}</div>
            </td>
            <td style="border: 1px solid #d1d5db; padding: 10px; font-family: 'Calibri', 'Arial', sans-serif; font-size: 9pt; color: #4b5563;">
              ${photoChecklist}
            </td>
            <td align="center" style="border: 1px solid #d1d5db; padding: 10px; font-family: 'Consolas', monospace; font-weight: bold; font-size: 9.5pt; color: ${progress === 100 ? '#047857' : '#b45309'}; background-color: ${progress === 100 ? '#ecfdf5' : '#fffbeb'};">
              ${progress === 100 ? 'READY' : 'AUDIT'}
            </td>
          </tr>
        `;
      });

      if (filtered.length === 0) {
        certTableRowsHtml += `
          <tr>
            <td colspan="4" align="center" style="border: 1px solid #d1d5db; padding: 25px; color: #9ca3af; font-style: italic; font-family: 'Calibri', 'Arial', sans-serif;">
              No matching openings found in the selected scope filter.
            </td>
          </tr>
        `;
      }

      contentHtml = `
        <!-- Certificate Header (2-column layout) -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse; margin-bottom: 25px; border-bottom: 4px solid #4f46e5; padding-bottom: 20px;">
          <tr>
            <td width="60%" valign="top" style="text-align: left; font-family: 'Calibri', 'Arial', sans-serif;">
              <span style="font-size: 8.5pt; font-weight: bold; letter-spacing: 1.5px; background-color: #e0e7ff; color: #3730a3; padding: 3px 10px; border-radius: 50px; text-transform: uppercase;">
                FINAL HANDING OVER PROTOCOL
              </span>
              <div style="font-size: 22pt; font-weight: 900; color: #111827; letter-spacing: -0.5px; line-height: 1.1; margin-top: 10px;">
                QUALITY HANDING OVER &amp; TAKE OVER CERTIFICATE
              </div>
            </td>
            <td width="40%" valign="top" style="text-align: right; font-family: 'Calibri', 'Arial', sans-serif; font-size: 9.5pt; color: #4b5563; font-weight: bold;">
              <div>Cert No: HC-${salesOrder}-FINAL</div>
              <div style="margin-top: 3px;">Date: ${todayStr}</div>
              <div style="color: #4f46e5; font-weight: 900; margin-top: 4px;">Quality Handover Docket</div>
            </td>
          </tr>
        </table>

        <!-- Formal Declaration Block -->
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; padding: 15px; border-radius: 12px; font-family: 'Calibri', 'Arial', sans-serif; margin-bottom: 25px;">
          <div style="font-size: 9pt; font-weight: bold; text-transform: uppercase; color: #111827; letter-spacing: 0.5px; margin-bottom: 5px;">Formal Transfer Declaration</div>
          <div style="font-size: 10.5pt; color: #4b5563; line-height: 1.5;">
            We hereby declare and certify that the door sets and specifications listed below have undergone final de-snagging, rigorous alignment checks, and paint touch-ups. All keys are accounted for, hardware components are polished, and the openings are formally handed over to the Client in perfect working order.
          </div>
        </div>

        <!-- Project Parameters Box -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse; background-color: #f3f4f6; border-radius: 8px; margin-bottom: 25px; font-family: 'Calibri', 'Arial', sans-serif; font-size: 10pt;">
          <tr>
            <td width="25%" style="padding: 12px; border-right: 1px solid #e5e7eb;">
              <span style="display: block; font-size: 8pt; color: #9ca3af; text-transform: uppercase;">Project / Sales Order</span>
              <strong style="display: block; color: #111827; margin-top: 2px;">${salesOrder}</strong>
            </td>
            <td width="25%" style="padding: 12px; border-right: 1px solid #e5e7eb;">
              <span style="display: block; font-size: 8pt; color: #9ca3af; text-transform: uppercase;">Client Spec</span>
              <strong style="display: block; color: #111827; margin-top: 2px;">${clientSpec}</strong>
            </td>
            <td width="25%" style="padding: 12px; border-right: 1px solid #e5e7eb;">
              <span style="display: block; font-size: 8pt; color: #9ca3af; text-transform: uppercase;">Site Supervisor</span>
              <strong style="display: block; color: #111827; margin-top: 2px;">${siteSupervisor}</strong>
            </td>
            <td width="25%" style="padding: 12px;">
              <span style="display: block; font-size: 8pt; color: #9ca3af; text-transform: uppercase;">Assigned Contractor</span>
              <strong style="display: block; color: #111827; margin-top: 2px;">${assignedContractor}</strong>
            </td>
          </tr>
        </table>

        <!-- Mapped Openings Table -->
        <table width="100%" border="1" cellspacing="0" cellpadding="0" style="border-collapse:collapse; border: 1px solid #d1d5db; font-family: 'Calibri', 'Arial', sans-serif; font-size: 10pt; margin-bottom: 30px;">
          <thead>
            <tr style="background-color: #f3f4f6; color: #4b5563; font-weight: bold; text-transform: uppercase; font-size: 9pt; height: 35px;">
              <th align="left" style="padding: 10px; border: 1px solid #d1d5db; width: 25%;">Opening ID &amp; Location</th>
              <th align="left" style="padding: 10px; border: 1px solid #d1d5db; width: 25%;">Key &amp; Hardware Status</th>
              <th align="left" style="padding: 10px; border: 1px solid #d1d5db; width: 33%;">Stage Photos Checklist</th>
              <th align="center" style="padding: 10px; border: 1px solid #d1d5db; width: 17%;">Handover Status</th>
            </tr>
          </thead>
          <tbody>
            ${certTableRowsHtml}
          </tbody>
        </table>

        <!-- Footer Signature Docket -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse; font-family: 'Calibri', 'Arial', sans-serif; margin-bottom: 50px; margin-top: 40px;">
          <tr>
            <td width="30%" valign="top" style="text-align: center;">
              <div style="border-bottom: 1px solid #9ca3af; margin: 0 auto 12px auto; width: 85%; height: 40px;">&nbsp;</div>
              <div style="font-size: 9pt; font-weight: bold; color: #4b5563;">
                HANDED OVER BY
                <span style="display: block; font-size: 8pt; color: #9ca3af; font-weight: normal; margin-top: 2px; text-transform: uppercase;">Tufwud Site Supervisor</span>
              </div>
            </td>
            <td width="5%">&nbsp;</td>
            <td width="30%" valign="top" style="text-align: center;">
              <div style="border-bottom: 1px solid #9ca3af; margin: 0 auto 12px auto; width: 85%; height: 40px;">&nbsp;</div>
              <div style="font-size: 9pt; font-weight: bold; color: #4b5563;">
                VERIFIED BY
                <span style="display: block; font-size: 8pt; color: #9ca3af; font-weight: normal; margin-top: 2px; text-transform: uppercase;">Tufwud Lead QA Auditor</span>
              </div>
            </td>
            <td width="5%">&nbsp;</td>
            <td width="30%" valign="top" style="text-align: center;">
              <div style="border-bottom: 1px solid #4f46e5; margin: 0 auto 12px auto; width: 85%; height: 40px;">&nbsp;</div>
              <div style="font-size: 9pt; font-weight: bold; color: #4f46e5;">
                TAKEN OVER BY
                <span style="display: block; font-size: 8pt; color: #9ca3af; font-weight: normal; margin-top: 2px; text-transform: uppercase;">Authorized Client Rep</span>
              </div>
            </td>
          </tr>
        </table>

        <!-- Premium Corporate Footer -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse:collapse; border-top: 1.5px solid #8a5a37; padding-top: 15px; margin-top: 40px; font-family: 'Calibri', 'Arial', sans-serif;">
          <tr>
            <td width="50%" align="left" style="font-size: 9pt; font-weight: bold; color: #6b7280; text-transform: uppercase;">
              Kolkata | Mumbai | Delhi | Bangalore
            </td>
            <td width="50%" align="right" style="font-size: 9.5pt; font-weight: 900; color: #8a5a37; letter-spacing: 0.5px;">
              CHOOSE INSULATED - CHOOSE TUFWUD
            </td>
          </tr>
        </table>
      `;
    }

    const styledHtml = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="UTF-8">
  <title>Tufwud Handover - ${handoverMode === 'certificate' ? 'Certificate' : 'Letter'}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page {
      size: A4;
      margin: 0.8in 0.8in 0.8in 0.8in;
    }
    body {
      font-family: 'Calibri', 'Arial', sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #111827;
      background-color: #ffffff;
    }
    p {
      margin-top: 0;
      margin-bottom: 8pt;
    }
  </style>
</head>
<body>
  ${contentHtml}
</body>
</html>
    `;

    const blob = new Blob(['\ufeff' + styledHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tufwud_Handover_${handoverMode === 'certificate' ? 'Certificate' : 'Letter'}_${salesOrder}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAsCSV = () => {
    const filtered = flats.filter(d => {
      if (selectedCertTower !== 'All' && d.towerId !== selectedCertTower) return false;
      if (selectedCertContractor !== 'All' && d.contractor !== selectedCertContractor) return false;
      return true;
    });

    const headers = ['Opening ID', 'Tower', 'Floor', 'Flat No', 'Contractor', 'Supervisor', 'Keys Handover Status', 'Hardware Quality Status', 'Overall Quality Progress %'];
    const rows = filtered.map(d => [
      d.id.split('/').pop() || d.id,
      d.towerId,
      d.floor,
      d.flatNo,
      d.contractor || 'N/A',
      d.supervisor || 'N/A',
      d.handover.keysHandover ? 'Handed Over' : 'Pending',
      (d.hardwareFixing.hingeFitting && d.hardwareFixing.lockWithHandleFitting) ? 'Completed' : 'Pending',
      `${getFlatOverallProgress(d)}%`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Tufwud_Handover_Summary_${flats[0]?.oaNo || 'SO'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- RA BILL HELPER FUNCTIONS ---
  const getStageTimestamp = (f: FlatRecord, stageId: string): string => {
    if (stageId === 'frame_install' || stageId === 'architrave') return f.frameFixing?.timestamp || '';
    if (stageId === 'shutter_install' || stageId === 'seals_foams') return f.doorFixing?.timestamp || '';
    if (stageId === 'hardware') return f.hardwareFixing?.timestamp || '';
    if (stageId === 'painting') return f.painting?.timestamp || '';
    if (stageId === 'handover') return f.handover?.timestamp || '';
    return '';
  };

  const isCumulativeDate = (ts: string, toDate: string) => {
    if (!ts) return true;
    const d = ts.substring(0, 10);
    return d <= toDate;
  };

  const isPriorDate = (ts: string, fromDate: string) => {
    if (!ts) return false;
    const d = ts.substring(0, 10);
    return d < fromDate;
  };

  const isPeriodDate = (ts: string, fromDate: string, toDate: string) => {
    if (!ts) return true;
    const d = ts.substring(0, 10);
    return d >= fromDate && d <= toDate;
  };

  // Compute RA Bill stats dynamically
  const raStagesData = FINANCIAL_STAGES.map(stage => {
    let totalOpenings = 0;
    let cumulativeQty = 0;
    let priorQty = 0;
    let periodQty = 0;
    let totalRatesSum = 0;
    let matchingFlatsCount = 0;

    flats.forEach(flat => {
      if (selectedCertTower !== 'All' && flat.towerId !== selectedCertTower) return;

      let milestoneKey: 'frameFixing' | 'doorFixing' | 'hardwareFixing' | 'painting' | 'handover' = 'frameFixing';
      if (stage.id === 'frame_install' || stage.id === 'architrave') milestoneKey = 'frameFixing';
      else if (stage.id === 'shutter_install' || stage.id === 'seals_foams') milestoneKey = 'doorFixing';
      else if (stage.id === 'hardware') milestoneKey = 'hardwareFixing';
      else if (stage.id === 'painting') milestoneKey = 'painting';
      else if (stage.id === 'handover') milestoneKey = 'handover';

      const stageContractorName = flat[milestoneKey]?.contractor || flat.contractor || 'Prabir Dhol';
      if (selectedCertContractor !== 'All' && stageContractorName !== selectedCertContractor) return;

      matchingFlatsCount++;
      const basePrice = getFlatBasePrice(flat);
      const stageRate = basePrice * (stage.pct / 100);
      totalRatesSum += stageRate;
      totalOpenings++;

      const progressPct = getFinancialStageProgress(flat, stage.id);
      const equivalentQty = progressPct / 100;

      const ts = getStageTimestamp(flat, stage.id);

      if (isCumulativeDate(ts, raToDate)) {
        cumulativeQty += equivalentQty;
      }
      if (isPriorDate(ts, raFromDate)) {
        priorQty += equivalentQty;
      }
      if (isPeriodDate(ts, raFromDate, raToDate)) {
        periodQty += equivalentQty;
      }
    });

    const avgRate = matchingFlatsCount > 0 ? (totalRatesSum / matchingFlatsCount) : 0;

    return {
      id: stage.id,
      label: stage.label,
      totalOpenings,
      avgRate,
      cumulativeQty,
      cumulativeAmt: cumulativeQty * avgRate,
      priorQty,
      priorAmt: priorQty * avgRate,
      periodQty,
      periodAmt: periodQty * avgRate,
    };
  });

  const grandCumulativeAmt = raStagesData.reduce((sum, d) => sum + d.cumulativeAmt, 0);
  const grandPriorAmt = raStagesData.reduce((sum, d) => sum + d.priorAmt, 0);
  const grandPeriodAmt = raStagesData.reduce((sum, d) => sum + d.periodAmt, 0);

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
      const paintingDone = !flat.painting || (flat.painting.frameCarpatchFillingSanding && flat.painting.frameTouchUp && flat.painting.shutterEdgeFinishing && flat.painting.lockSlotAreaFinishing && flat.painting.shutterTouchUp);
      const handoverDone = flat.handover.hardwareCleaning && flat.handover.plasticCoverRemoval && flat.handover.keysHandover;
      
      const isCompleted = frameDone && doorDone && hwDone && paintingDone && handoverDone;

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
      activeChecks += Number(flat.painting?.frameCarpatchFillingSanding || false) + Number(flat.painting?.frameTouchUp || false) + Number(flat.painting?.shutterEdgeFinishing || false) + Number(flat.painting?.lockSlotAreaFinishing || false) + Number(flat.painting?.shutterTouchUp || false);
      activeChecks += Number(flat.handover.hardwareCleaning) + Number(flat.handover.plasticCoverRemoval) + Number(flat.handover.keysHandover);
      
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

    return Object.values(stats).sort((a, b) => a.towerName.localeCompare(b.towerName, undefined, { numeric: true, sensitivity: 'base' }));
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
        comparison = a.flatNo.localeCompare(b.flatNo, undefined, { numeric: true, sensitivity: 'base' });
      } else if (sortField === 'price') {
        comparison = getFlatBasePrice(a) - getFlatBasePrice(b);
      } else if (sortField === 'earned') {
        comparison = getFlatTotalCompletedCost(a) - getFlatTotalCompletedCost(b);
      } else if (sortField === 'progress') {
        let aChecks = 0, bChecks = 0;
        aChecks += Number(a.frameFixing.fastenerFixing) + Number(a.frameFixing.frameLockAreaFinish) + Number(a.frameFixing.outsideArchitraveFixing) + Number(a.frameFixing.insideArchitraveFixing);
        aChecks += Number(a.doorFixing.shutterEdgeFinishing) + Number(a.doorFixing.gapBetweenFrameAndShutter) + Number(a.doorFixing.iSealFixing) + Number(a.doorFixing.visionGlassBeatFinishing);
        aChecks += Number(a.hardwareFixing.hingeFitting) + Number(a.hardwareFixing.lockWithHandleFitting) + Number(a.hardwareFixing.eyeviewInstallation) + Number(a.hardwareFixing.towerBoltInstallation) + Number(a.hardwareFixing.doorCloserInstallation) + Number(a.hardwareFixing.autoDropSealInstallation);
        aChecks += Number(a.painting?.frameCarpatchFillingSanding || false) + Number(a.painting?.frameTouchUp || false) + Number(a.painting?.shutterEdgeFinishing || false) + Number(a.painting?.lockSlotAreaFinishing || false) + Number(a.painting?.shutterTouchUp || false);
        aChecks += Number(a.handover.hardwareCleaning) + Number(a.handover.plasticCoverRemoval) + Number(a.handover.keysHandover);
        
        bChecks += Number(b.frameFixing.fastenerFixing) + Number(b.frameFixing.frameLockAreaFinish) + Number(b.frameFixing.outsideArchitraveFixing) + Number(b.frameFixing.insideArchitraveFixing);
        bChecks += Number(b.doorFixing.shutterEdgeFinishing) + Number(b.doorFixing.gapBetweenFrameAndShutter) + Number(b.doorFixing.iSealFixing) + Number(b.doorFixing.visionGlassBeatFinishing);
        bChecks += Number(b.hardwareFixing.hingeFitting) + Number(b.hardwareFixing.lockWithHandleFitting) + Number(b.hardwareFixing.eyeviewInstallation) + Number(b.hardwareFixing.towerBoltInstallation) + Number(b.hardwareFixing.doorCloserInstallation) + Number(b.hardwareFixing.autoDropSealInstallation);
        bChecks += Number(b.painting?.frameCarpatchFillingSanding || false) + Number(b.painting?.frameTouchUp || false) + Number(b.painting?.shutterEdgeFinishing || false) + Number(b.painting?.lockSlotAreaFinishing || false) + Number(b.painting?.shutterTouchUp || false);
        bChecks += Number(b.handover.hardwareCleaning) + Number(b.handover.plasticCoverRemoval) + Number(b.handover.keysHandover);
        
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
      let checks = 22;
      checks -= Number(flat.frameFixing.fastenerFixing) + Number(flat.frameFixing.frameLockAreaFinish) + Number(flat.frameFixing.outsideArchitraveFixing) + Number(flat.frameFixing.insideArchitraveFixing);
      checks -= Number(flat.doorFixing.shutterEdgeFinishing) + Number(flat.doorFixing.gapBetweenFrameAndShutter) + Number(flat.doorFixing.iSealFixing) + Number(flat.doorFixing.visionGlassBeatFinishing);
      checks -= Number(flat.hardwareFixing.hingeFitting) + Number(flat.hardwareFixing.lockWithHandleFitting) + Number(flat.hardwareFixing.eyeviewInstallation) + Number(flat.hardwareFixing.towerBoltInstallation) + Number(flat.hardwareFixing.doorCloserInstallation) + Number(flat.hardwareFixing.autoDropSealInstallation);
      checks -= Number(flat.painting?.frameCarpatchFillingSanding || false) + Number(flat.painting?.frameTouchUp || false) + Number(flat.painting?.shutterEdgeFinishing || false) + Number(flat.painting?.lockSlotAreaFinishing || false) + Number(flat.painting?.shutterTouchUp || false);
      checks -= Number(flat.handover.hardwareCleaning) + Number(flat.handover.plasticCoverRemoval) + Number(flat.handover.keysHandover);
      
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

  // --- MONTHLY RUNNING BILL CALCULATIONS ---
  const getStageMonthAndYear = (flat: FlatRecord, stageId: string) => {
    const stageEarned = getFinancialStageEarned(flat, stageId);
    if (stageEarned <= 0) return null;

    // Check custom timestamp
    const checklist = flat[stageId as keyof FlatRecord] as any;
    const ts = checklist?.timestamp;
    if (ts && ts.trim() !== '') {
      try {
        const d = new Date(ts);
        if (!isNaN(d.getTime())) {
          return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
        }
      } catch (e) {
        // Fallback
      }
    }
    
    // Fall back to structured simulated distribution to render a beautiful demo instantly
    if (flat.floor <= 3) return "April 2026";
    if (flat.floor <= 7) return "May 2026";
    return "June 2026";
  };

  const getMonthlyRunningBills = () => {
    const monthlyGroups: {
      [month: string]: {
        monthName: string;
        stagesCount: { [stageId: string]: number };
        stagesEarned: { [stageId: string]: number };
        totalEarned: number;
        items: Array<{
          doorId: string;
          flatNo: string;
          towerId: string;
          floor: number;
          stageLabel: string;
          earned: number;
        }>;
      }
    } = {};

    flats.forEach(flat => {
      FINANCIAL_STAGES.forEach(stage => {
        const earned = getFinancialStageEarned(flat, stage.id);
        if (earned > 0) {
          const mName = getStageMonthAndYear(flat, stage.id);
          if (mName) {
            if (!monthlyGroups[mName]) {
              const initialCounts: { [sId: string]: number } = {};
              const initialEarned: { [sId: string]: number } = {};
              FINANCIAL_STAGES.forEach(s => {
                initialCounts[s.id] = 0;
                initialEarned[s.id] = 0;
              });
              monthlyGroups[mName] = {
                monthName: mName,
                stagesCount: initialCounts,
                stagesEarned: initialEarned,
                totalEarned: 0,
                items: []
              };
            }
            monthlyGroups[mName].stagesCount[stage.id] += 1;
            monthlyGroups[mName].stagesEarned[stage.id] += earned;
            monthlyGroups[mName].totalEarned += earned;
            monthlyGroups[mName].items.push({
              doorId: flat.id,
              flatNo: flat.flatNo,
              towerId: flat.towerId,
              floor: flat.floor,
              stageLabel: stage.label,
              earned: earned
            });
          }
        }
      });
    });

    // Sort chronologically
    return Object.values(monthlyGroups).sort((a, b) => {
      const d1 = new Date(a.monthName);
      const d2 = new Date(b.monthName);
      return d1.getTime() - d2.getTime();
    });
  };

  const monthlyBills = getMonthlyRunningBills();
  const billingMonthsList = Array.from(new Set(monthlyBills.map(m => m.monthName)));

  const handleExportMonthlyBillCSV = () => {
    const csvRows = [
      ['MONTHLY RUNNING BILL REPORT FOR PROJECT'],
      ['Generated:', new Date().toLocaleString()],
      [],
      ['Billing Month', 'Work Milestone Stage', 'Quantity Completed', 'Monthly Certified Payout (INR)']
    ];

    monthlyBills.forEach(m => {
      FINANCIAL_STAGES.forEach(s => {
        const count = m.stagesCount[s.id];
        const earned = m.stagesEarned[s.id];
        if (earned > 0) {
          csvRows.push([m.monthName, s.label, count.toString(), earned.toString()]);
        }
      });
      csvRows.push([m.monthName, 'TOTAL BILL FOR MONTH', '', m.totalEarned.toString()]);
      csvRows.push([]);
    });

    downloadCSVFile(csvRows, `monthly_running_bill_${new Date().toISOString().slice(0, 7)}.csv`);
  };

  // --- PAYMENT CERTIFICATE PAGINATION ENGINE ---
  const certDoors = flats.filter(f => selectedCertTower === 'All' || f.towerId === selectedCertTower);
  const chunkSize = 5;
  const doorPages: FlatRecord[][] = [];
  for (let i = 0; i < certDoors.length; i += chunkSize) {
    doorPages.push(certDoors.slice(i, i + chunkSize));
  }

  return (
    <div className="space-y-8 select-none">
      
      {/* Dynamic Print layout CSS styling injected directly */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          .printable-cert-deck, .printable-cert-deck * {
            visibility: visible !important;
          }
          .printable-cert-deck {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .page-break-print {
            page-break-after: always !important;
            margin-bottom: 2rem !important;
            border: none !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* TOP-LEVEL SUB-TAB NAVIGATION */}
      <div className="no-print flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-2 bg-zinc-100/80 rounded-2xl border border-zinc-200">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('summaries')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition ${
              activeTab === 'summaries' 
                ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/50' 
                : 'text-zinc-550 hover:bg-zinc-200/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-indigo-500" />
            <span>Executive Summaries</span>
          </button>
          
          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition ${
              activeTab === 'ledger' 
                ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/50' 
                : 'text-zinc-550 hover:bg-zinc-200/50'
            }`}
          >
            <Building className="w-3.5 h-3.5 text-amber-500" />
            <span>Detailed Ledger</span>
          </button>

          <button
            onClick={() => setActiveTab('certificates')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition ${
              activeTab === 'certificates' 
                ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/50' 
                : 'text-zinc-550 hover:bg-zinc-200/50'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
            <span>Payment Certificates</span>
          </button>

          <button
            onClick={() => setActiveTab('runningBills')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition ${
              activeTab === 'runningBills' 
                ? 'bg-white text-zinc-900 shadow-xs border border-zinc-200/50' 
                : 'text-zinc-550 hover:bg-zinc-200/50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 text-purple-500" />
            <span>Running Bills</span>
          </button>

          <button
            onClick={() => setActiveTab('handoverTab')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase transition ${
              activeTab === 'handoverTab' 
                ? 'bg-white text-indigo-950 shadow-xs border border-indigo-200/50' 
                : 'text-zinc-550 hover:bg-zinc-200/50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Handover Certificate</span>
          </button>
        </div>
        
        <div className="text-[10px] font-bold text-zinc-400 font-mono tracking-wider px-3 select-none text-right">
          MONITORING {flats.length} ACTIVE SLOTS
        </div>
      </div>

      {/* 1. REPORT C / EXECUTIVE SUMMARY BENTO DECK */}
      <div className="no-print grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <IndianRupee className="w-5 h-5" />
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

      {/* --- TAB VIEW 1: EXECUTIVE SUMMARIES (Report B & C) --- */}
      {activeTab === 'summaries' && (
        <div className="no-print space-y-8 animate-fadeIn">
          
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
                        {stage.label} ({getFinancialStagePct(stage.id, stage.pct)}%)
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

          {/* REPORT B: PROJECT COMPLIANCE AND COST SUMMARY */}
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
                    const variance = t.totalBudget - t.totalEarned;
                    const deliveryRate = t.totalBudget > 0 ? Math.round((t.totalEarned / t.totalBudget) * 100) : 0;
                    return (
                      <tr key={t.towerName} className="hover:bg-zinc-50/50 transition">
                        <td className="px-6 py-4 font-bold text-zinc-950">{t.towerName}</td>
                        <td className="px-4 py-4 text-center text-zinc-500 font-mono">{t.totalDoors}</td>
                        <td className="px-4 py-4 text-center text-emerald-650 font-bold font-mono">{t.completedDoors}</td>
                        <td className="px-4 py-4 text-center font-mono">
                          <div className="w-16 bg-zinc-100 h-2 rounded-full overflow-hidden mx-auto">
                            <div className="bg-indigo-500 h-full" style={{ width: `${avgProgress}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-zinc-550 block mt-1">{avgProgress}% avg</span>
                        </td>
                        <td className="px-6 py-4 text-right font-mono text-zinc-650">
                          ₹{t.totalBudget.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-emerald-650">
                          ₹{t.totalEarned.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-rose-600 font-bold">
                          ₹{variance.toLocaleString('en-IN')}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="px-2 py-1 bg-indigo-50 text-indigo-800 rounded font-black text-[10px] font-mono border border-indigo-100">
                            {deliveryRate}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* --- TAB VIEW 2: DETAILED OPENINGS LEDGER (Report A) --- */}
      {activeTab === 'ledger' && (
        <div className="no-print space-y-4 animate-fadeIn">
          
          <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="font-bold text-sm sm:text-base text-zinc-900 flex items-center gap-2">
                <span className="px-2 py-0.5 bg-zinc-200 rounded text-[11px] font-bold font-mono text-zinc-650 uppercase">REPORT A</span>
                <span>Audit Trail: Detailed Openings Ledger</span>
              </h3>
              <p className="text-xs text-zinc-500 font-medium">Search, order, and filter individual door openings across contract price lists.</p>
            </div>
            
            <button
              onClick={handleExportDoorsReport}
              className="w-full md:w-auto px-4 py-2 bg-zinc-900 border border-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export Detailed ledger CSV</span>
            </button>
          </div>

          {/* Filtering Header Toolbar */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3 bg-zinc-50 p-4 rounded-xl border border-zinc-150">
            
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-zinc-400" />
              <input
                type="text"
                placeholder="Search ID, Flat No..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-zinc-200 rounded-xl text-xs focus:outline-none focus:border-zinc-500 font-semibold"
              />
            </div>

            <div className="relative flex items-center bg-white rounded-xl border border-zinc-200">
              <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 absolute left-3 select-none">Tower:</span>
              <select
                value={selectedTower}
                onChange={(e) => setSelectedTower(e.target.value)}
                className="w-full pl-16 pr-3 py-2 bg-transparent text-xs focus:outline-none font-bold text-zinc-700 font-sans"
              >
                <option value="All">All Towers</option>
                {uniqueTowers.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="relative flex items-center bg-white rounded-xl border border-zinc-200">
              <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 absolute left-3 select-none">Floor:</span>
              <select
                value={selectedFloor}
                onChange={(e) => setSelectedFloor(e.target.value)}
                className="w-full pl-16 pr-3 py-2 bg-transparent text-xs focus:outline-none font-bold text-zinc-700 font-sans"
              >
                <option value="All">All Floors</option>
                {uniqueFloors.map(fl => <option key={fl} value={fl.toString()}>Floor {fl}</option>)}
              </select>
            </div>

            <div className="relative bg-white rounded-xl border border-zinc-200 flex items-center col-span-1 xl:col-span-2">
              <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 absolute left-3 select-none">Contractor:</span>
              <input
                type="text"
                placeholder="Contractor e.g. Prabir Dhol..."
                value={contractorSearch}
                onChange={(e) => setContractorSearch(e.target.value)}
                className="w-full pl-22 pr-4 py-2 bg-transparent text-xs focus:outline-none font-bold text-zinc-700 font-sans"
              />
            </div>
          </div>

          {/* Ledger Table grid */}
          <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-zinc-100/60 text-zinc-500 font-bold uppercase border-b border-zinc-200 text-[10px] tracking-wider">
                    <th className="px-6 py-3.5">Ref ID</th>
                    <th className="px-4 py-3.5">Tower</th>
                    <th className="px-4 py-3.5">Location</th>
                    <th className="px-4 py-3.5">Opening Code</th>
                    <th className="px-6 py-3.5 text-right">Contract Price</th>
                    <th className="px-6 py-3.5 text-center">Work Progress</th>
                    <th className="px-6 py-3.5 text-right font-bold text-zinc-800">Earned Payout</th>
                    <th className="px-6 py-3.5 text-center">Remaining</th>
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
                      checks -= Number(flat.painting?.frameCarpatchFillingSanding || false) + Number(flat.painting?.frameTouchUp || false) + Number(flat.painting?.shutterEdgeFinishing || false) + Number(flat.painting?.lockSlotAreaFinishing || false) + Number(flat.painting?.shutterTouchUp || false);
                      checks -= Number(flat.handover.hardwareCleaning) + Number(flat.handover.plasticCoverRemoval) + Number(flat.handover.keysHandover);
                      
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
                            <span className="font-mono text-zinc-850 font-bold text-[11px] bg-zinc-55 px-1.5 py-0.5 rounded border border-zinc-200">
                              {progressPct}%
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right font-mono font-bold text-emerald-650">
                            ₹{getFlatTotalCompletedCost(flat).toLocaleString('en-IN')}
                          </td>
                          <td className="px-6 py-3.5 text-center">
                            {checks === 0 ? (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 rounded font-bold text-[10px] uppercase tracking-wide border border-emerald-150">
                                Handed Over
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-zinc-100 text-zinc-700 rounded font-semibold text-[11px] font-mono">
                                {checks} open
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}

                  {/* Filtering total subtotal */}
                  {filteredAndSortedFlats.length > 0 && (
                    <tr className="bg-zinc-50 font-bold text-zinc-900 border-t border-zinc-200">
                      <td className="px-6 py-4" colSpan={4}>
                        SUBTOTAL FOR FILTERED RECORDS ({filteredAndSortedFlats.length} openings)
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
                        ₹{(filteredBudgetSum - filteredEarnedSum).toLocaleString('en-IN')} outstanding
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* --- TAB VIEW 3: PAYMENT CERTIFICATES (Door-wise, Tower-wise, Project-wise) --- */}
      {activeTab === 'certificates' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Certificate Selection Panel */}
          <div className="no-print bg-white rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-[10px] text-indigo-650 font-black uppercase tracking-wider font-mono">AUDIT DECK</span>
                <h3 className="text-base font-extrabold text-zinc-900">Configure Compliance Certificate</h3>
              </div>
              
              <button
                onClick={() => window.print()}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <Printer className="w-4 h-4 shrink-0" />
                <span>🖨 Print / Save as PDF Certificate</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Selector 1: Certificate Type */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wide">Certificate Scope</label>
                <div className="flex bg-zinc-100 rounded-xl p-1 border border-zinc-200">
                  <button
                    onClick={() => setCertType('door')}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition uppercase ${certType === 'door' ? 'bg-white text-zinc-900 shadow-3xs' : 'text-zinc-500'}`}
                  >
                    Door
                  </button>
                  <button
                    onClick={() => setCertType('tower')}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition uppercase ${certType === 'tower' ? 'bg-white text-zinc-900 shadow-3xs' : 'text-zinc-500'}`}
                  >
                    Tower
                  </button>
                  <button
                    onClick={() => setCertType('project')}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition uppercase ${certType === 'project' ? 'bg-white text-zinc-900 shadow-3xs' : 'text-zinc-500'}`}
                  >
                    Project
                  </button>
                  <button
                    onClick={() => setCertType('ra_bill')}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition uppercase ${certType === 'ra_bill' ? 'bg-white text-indigo-700 shadow-3xs border border-zinc-200/50' : 'text-zinc-500'}`}
                  >
                    R.A. Bill
                  </button>
                </div>
              </div>

              {/* Selector 2: Tower Scope filter */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wide">Tower Location Filter</label>
                <select
                  value={selectedCertTower}
                  onChange={(e) => setSelectedCertTower(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-250 rounded-xl text-xs font-bold text-zinc-700"
                  disabled={certType === 'project'}
                >
                  <option value="All">All Project Towers</option>
                  {uniqueTowers.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Conditional Contractor & Dates for RA Bill, Handover Format, or general info badge */}
              {certType === 'ra_bill' ? (
                <>
                  {/* Selector 3: Contractor Filter */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wide">Select Contractor</label>
                    <select
                      value={selectedCertContractor}
                      onChange={(e) => setSelectedCertContractor(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-50 border border-zinc-250 rounded-xl text-xs font-bold text-zinc-700"
                    >
                      <option value="All">All Contractors</option>
                      {uniqueContractors.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  {/* Selector 4: Date Range */}
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wide">Billing Date Range</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={raFromDate}
                        onChange={(e) => setRaFromDate(e.target.value)}
                        className="w-full px-2 py-1.5 bg-zinc-50 border border-zinc-250 rounded-xl text-xs font-bold text-zinc-700 focus:outline-none"
                      />
                      <input
                        type="date"
                        value={raToDate}
                        onChange={(e) => setRaToDate(e.target.value)}
                        className="w-full px-2 py-1.5 bg-zinc-50 border border-zinc-250 rounded-xl text-xs font-bold text-zinc-700 focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="sm:col-span-2 md:col-span-1 space-y-1.5 flex flex-col justify-end">
                  <div className="p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-[11px] text-zinc-500 font-medium">
                    💡 Meets <strong>4 columns</strong> &amp; <strong>5 doors per page</strong> standards. Includes automatic bottom totals, supervisor validation, and contractor signatories.
                  </div>
                </div>
              )}

            </div>

          </div>

          {/* PHYSICAL CERTIFICATES DECK (TARGET FOR PRINTING) */}
          <div className="printable-cert-deck space-y-10">
            
            {/* DOOR-WISE CERTIFICATE LAYOUT */}
            {certType === 'door' && (
              <>
                {doorPages.length === 0 ? (
                  <div className="p-12 bg-white rounded-2xl border border-zinc-200 text-center text-zinc-400 font-semibold font-sans">
                    No openings records to certificate inside selection.
                  </div>
                ) : (
                  doorPages.map((pageDoors, pageIdx) => {
                    // Compute sum for this specific page (5 doors only)
                    const pageSum = pageDoors.reduce((sum, f) => sum + getFlatTotalCompletedCost(f), 0);
                    
                    return (
                      <div 
                        key={pageIdx} 
                        className="page-break-print bg-white rounded-3xl border border-zinc-300 shadow-lg p-8 sm:p-10 max-w-4xl mx-auto space-y-8 relative overflow-hidden flex flex-col justify-between min-h-[1050px]"
                      >
                        {/* Background watermarks */}
                        <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-50/10 rounded-full blur-3xl pointer-events-none" />
                        <div className="absolute left-0 bottom-0 w-64 h-64 bg-indigo-50/10 rounded-full blur-3xl pointer-events-none" />

                        <div className="space-y-6">
                          {/* Certificate Heading Board */}
                          <div className="border-b-4 border-emerald-600 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                              <div className="w-13 h-13 shrink-0">
                                <TufwudLogoTransparent className="w-full h-full" />
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] font-extrabold tracking-wider bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full uppercase font-mono border border-emerald-200">
                                  TUFWUD DOOR COMPLIANCE PROTOCOL
                                </span>
                                <h2 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight font-sans">
                                  DOOR-WISE QUALITY COMPLIANCE CERTIFICATE
                                </h2>
                              </div>
                            </div>
                            <div className="text-right font-mono text-xs text-zinc-550 space-y-0.5 font-bold shrink-0">
                              <div>Cert No: DC-{flats[0]?.oaNo || '387026'}-P{pageIdx + 1}</div>
                              <div>Date: {new Date().toLocaleDateString()}</div>
                              <div className="text-indigo-650">Page {pageIdx + 1} of {doorPages.length}</div>
                            </div>
                          </div>

                          {/* Meta Information Grid (Optional Supervisor & Contractor included) */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold">
                            <div className="space-y-0.5">
                              <span className="block text-[9px] text-zinc-400 uppercase tracking-wider">Project Sales Order</span>
                              <span className="text-zinc-800 font-bold">{flats[0]?.oaNo || 'SO-387026'}</span>
                            </div>
                            <div className="space-y-0.5">
                              <span className="block text-[9px] text-zinc-400 uppercase tracking-wider">Specification</span>
                              <span className="text-zinc-800 font-bold">{flats[0]?.soDetails || 'Godrej Woods - Fire Doors'}</span>
                            </div>
                            <div className="space-y-0.5">
                              <span className="block text-[9px] text-zinc-400 uppercase tracking-wider">Site Supervisor</span>
                              <span className="text-zinc-800 font-bold flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                {flats[0]?.supervisor || <em className="text-zinc-400">Not Assigned</em>}
                              </span>
                            </div>
                            <div className="space-y-0.5">
                              <span className="block text-[9px] text-zinc-400 uppercase tracking-wider">Assigned Contractor</span>
                              <span className="text-zinc-800 font-bold flex items-center gap-1.5">
                                <Activity className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                {flats[0]?.contractor || <em className="text-zinc-400">Not Assigned</em>}
                              </span>
                            </div>
                          </div>

                          <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                            It is hereby certified that the work on the following specified fire door openings has been audited and cleared by site inspectors. Quality compliance is verified against designated milestone standards:
                          </p>

                          {/* EXACT 3 COLUMNS & 5 DOORS TABLE */}
                          <div className="border border-zinc-250 rounded-xl overflow-hidden shadow-2xs">
                            <table className="w-full text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-zinc-100 text-zinc-650 font-black uppercase border-b border-zinc-250 text-[10px] tracking-wider font-mono">
                                  <th className="px-5 py-3 w-1/3">Column 1: Opening ID &amp; Loc</th>
                                  <th className="px-5 py-3 w-5/12">Column 2: Completed Work Stages</th>
                                  <th className="px-5 py-3 text-center w-1/4">Column 3: Quality Compliance</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-zinc-200 font-semibold text-zinc-700">
                                {pageDoors.map(door => {
                                  // Gather completed milestone labels
                                  const completedStagesList: string[] = [];
                                  if (door.frameFixing.fastenerFixing && door.frameFixing.frameLockAreaFinish) completedStagesList.push('Frame Installation');
                                  if (door.doorFixing.shutterEdgeFinishing) completedStagesList.push('Shutter Hanging');
                                  if (door.hardwareFixing.hingeFitting && door.hardwareFixing.lockWithHandleFitting) completedStagesList.push('Hardware Fitting');
                                  if (door.painting?.frameCarpatchFillingSanding && door.painting?.shutterTouchUp) completedStagesList.push('Touch-up & Painting');
                                  if (door.handover.keysHandover) completedStagesList.push('Audited & Handed Over');
                                  
                                  const progress = getFlatOverallProgress(door);
                                  
                                  return (
                                    <tr key={door.id} className="hover:bg-zinc-50/20 transition">
                                      <td className="px-5 py-4 font-mono">
                                        <div className="font-bold text-zinc-950 text-[11px] truncate">{door.id.split('/').pop()}</div>
                                        <div className="text-[10px] text-zinc-450 mt-0.5 font-sans">{door.towerId} | Level {door.floor} | Flat {door.flatNo}</div>
                                      </td>
                                      <td className="px-5 py-4">
                                        {completedStagesList.length === 0 ? (
                                          <span className="text-zinc-400 italic font-medium">No progress registered yet</span>
                                        ) : (
                                          <div className="flex flex-wrap gap-1">
                                            {completedStagesList.map(st => (
                                              <span key={st} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-100 text-[9px] rounded font-bold uppercase tracking-tight">
                                                {st}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </td>
                                      <td className="px-5 py-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider font-mono ${
                                          progress === 100 
                                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                            : progress > 0
                                              ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                                              : "bg-zinc-100 text-zinc-500 border border-zinc-200"
                                        }`}>
                                          {progress === 100 ? "100% Cleared" : `${progress}% Done`}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Bottom Total Block + Signature Block */}
                        <div className="space-y-6 pt-6 border-t border-zinc-200">
                          {/* PAGE COMPLIANCE RATIO */}
                          <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl flex items-center justify-between">
                            <div className="space-y-0.5">
                              <span className="block text-[9px] text-emerald-800 font-black uppercase tracking-wider font-mono">PAGE COMPLIANCE RATIO</span>
                              <span className="text-[10px] text-zinc-500 font-medium">Proportion of door openings on this page that are fully completed.</span>
                            </div>
                            <div className="text-right font-mono text-zinc-900">
                              <span className="text-xl font-black text-emerald-700">
                                {pageDoors.filter(d => getFlatOverallProgress(d) === 100).length} / {pageDoors.length}
                              </span>
                              <span className="text-xs font-bold text-zinc-400 ml-1.5">OPENINGS COMPLETED</span>
                            </div>
                          </div>

                          {/* Authorized Signatures Row */}
                          <div className="grid grid-cols-3 gap-6 pt-4 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-450 font-mono">
                            <div className="space-y-12">
                              <div className="border-b border-zinc-300 mx-auto w-3/4" />
                              <div>PREPARED BY (Auditor / Supervisor)</div>
                            </div>
                            <div className="space-y-12">
                              <div className="border-b border-zinc-300 mx-auto w-3/4" />
                              <div>VERIFIED BY (Project Manager)</div>
                            </div>
                            <div className="space-y-12">
                              <div className="border-b border-zinc-300 mx-auto w-3/4 text-indigo-300" />
                              <div className="text-indigo-600">APPROVED Payout (Tufwud Authority)</div>
                            </div>
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </>
            )}

            {/* TOWER-WISE COMPREHENSIVE CERTIFICATE LAYOUT */}
            {certType === 'tower' && (
              <div className="bg-white rounded-3xl border border-zinc-300 shadow-lg p-8 sm:p-10 max-w-4xl mx-auto space-y-8 relative overflow-hidden flex flex-col justify-between min-h-[800px]">
                <div className="space-y-6">
                  {/* Certificate Heading Board */}
                  <div className="border-b-4 border-indigo-600 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-13 h-13 shrink-0">
                        <TufwudLogoTransparent className="w-full h-full" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold tracking-wider bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full uppercase font-mono border border-indigo-200">
                          SDTOWER PROJECT EXECUTIVE
                        </span>
                        <h2 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight font-sans">
                          TOWER-WISE QUALITY COMPLIANCE CERTIFICATE
                        </h2>
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs text-zinc-550 space-y-0.5 font-bold shrink-0">
                      <div>Cert No: TC-{flats[0]?.oaNo || '387026'}-ALL</div>
                      <div>Date: {new Date().toLocaleDateString()}</div>
                      <div className="text-indigo-650">Master Tower Summary</div>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-500 leading-relaxed font-medium">
                    This certifies that quality audits have been completed on the following project tower segments. Totals represent accumulated compliance checklists:
                  </p>

                  <div className="border border-zinc-250 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-100 text-zinc-650 font-black uppercase border-b border-zinc-250 text-[10px] tracking-wider font-mono">
                          <th className="px-5 py-3.5">Segment Tower Name</th>
                          <th className="px-5 py-3.5 text-center">Audited Openings</th>
                          <th className="px-5 py-3.5 text-center">100% Handed Over</th>
                          <th className="px-5 py-3.5 text-center">Progress %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 font-semibold text-zinc-700">
                        {projectTowerSummaries.map(t => {
                          const rate = t.totalBudget > 0 ? Math.round((t.totalEarned / t.totalBudget) * 100) : 0;
                          return (
                            <tr key={t.towerName}>
                              <td className="px-5 py-4 font-bold text-zinc-950">{t.towerName}</td>
                              <td className="px-5 py-4 text-center font-mono">{t.totalDoors}</td>
                              <td className="px-5 py-4 text-center font-mono text-emerald-650 font-bold">{t.completedDoors}</td>
                              <td className="px-5 py-4 text-center font-mono">
                                <span className="px-2 py-0.5 bg-zinc-100 text-zinc-800 border border-zinc-200 rounded font-black text-[10px]">
                                  {rate}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-6 pt-6 border-t border-zinc-200">
                  <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="block text-[9px] text-indigo-850 font-black uppercase tracking-wider font-mono">TOTAL TOWER PORTFOLIO COMPLIANCE</span>
                      <span className="text-[10px] text-zinc-500 font-medium">Reconciles verified compliance audits and handed over openings.</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xl font-black text-indigo-700 font-mono">
                        {projectTowerSummaries.reduce((sum, t) => sum + t.completedDoors, 0)} / {projectTowerSummaries.reduce((sum, t) => sum + t.totalDoors, 0)}
                      </span>
                      <span className="text-xs font-bold text-zinc-400 ml-1.5">OPENINGS COMPLETED</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6 pt-4 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-450 font-mono">
                    <div className="space-y-12">
                      <div className="border-b border-zinc-300 mx-auto w-3/4" />
                      <div>AUDITOR SIGNATURE</div>
                    </div>
                    <div className="space-y-12">
                      <div className="border-b border-zinc-300 mx-auto w-3/4" />
                      <div>CONTRACTOR REPRESENTATIVE</div>
                    </div>
                    <div className="space-y-12">
                      <div className="border-b border-zinc-300 mx-auto w-3/4" />
                      <div>AUTHORIZED PAYING OFFICER</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* PROJECT-WISE COMPREHENSIVE CERTIFICATE LAYOUT */}
            {certType === 'project' && (
              <div className="bg-white rounded-3xl border border-zinc-300 shadow-lg p-8 sm:p-10 max-w-4xl mx-auto space-y-8 relative overflow-hidden flex flex-col justify-between min-h-[800px]">
                <div className="space-y-6">
                  {/* Certificate Heading Board */}
                  <div className="border-b-4 border-amber-600 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-13 h-13 shrink-0">
                        <TufwudLogoTransparent className="w-full h-full" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold tracking-wider bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full uppercase font-mono border border-amber-200">
                          EXECUTIVE SUMMARY COMPLIANCE
                        </span>
                        <h2 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight font-sans">
                          PROJECT MASTER QUALITY COMPLIANCE CERTIFICATE
                        </h2>
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs text-zinc-550 space-y-0.5 font-bold shrink-0">
                      <div>OANo: {flats[0]?.oaNo || '387026'}</div>
                      <div>Date: {new Date().toLocaleDateString()}</div>
                      <div className="text-amber-650">Project Portfolio Clearance</div>
                    </div>
                  </div>

                  <div className="bg-amber-50/25 border border-amber-150 p-5 rounded-2xl space-y-4">
                    <h3 className="font-bold text-xs uppercase tracking-wide text-amber-900">Contract Parameters &amp; Stakeholders</h3>
                    <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-zinc-700">
                      <div>
                        <span className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Project / Sales Order</span>
                        <span className="text-zinc-850 font-extrabold">{flats[0]?.oaNo || 'SO-387026'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Client Spec</span>
                        <span className="text-zinc-850 font-extrabold">{flats[0]?.soDetails || 'Godrej Woods'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Project Supervisor</span>
                        <span className="text-zinc-850 font-extrabold">{flats[0]?.supervisor || 'Aarif Taslim'}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Lead Contractor</span>
                        <span className="text-zinc-850 font-extrabold">{flats[0]?.contractor || 'Prabir Dhol'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1">
                      <span className="block text-[10px] text-zinc-400 font-bold uppercase">Total Mapped Openings</span>
                      <span className="text-lg font-black text-zinc-900 font-mono">{flats.length} Openings</span>
                    </div>
                    <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-xl space-y-1">
                      <span className="block text-[10px] text-emerald-800 font-black uppercase">Completed &amp; Handed Over</span>
                      <span className="text-lg font-black text-emerald-700 font-mono">
                        {flats.filter(f => getFlatOverallProgress(f) === 100).length} Openings
                      </span>
                    </div>
                    <div className="p-4 bg-amber-50 border border-amber-150 rounded-xl space-y-1">
                      <span className="block text-[10px] text-amber-800 font-black uppercase">In Progress / Outstanding</span>
                      <span className="text-lg font-black text-amber-700 font-mono">
                        {flats.filter(f => getFlatOverallProgress(f) < 100).length} Openings
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-6 pt-6 border-t border-zinc-200">
                  <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="block text-[9px] text-amber-850 font-black uppercase tracking-wider font-mono">MASTER PROJECT COMPLIANCE RATE</span>
                      <span className="text-xs text-zinc-500 font-medium">Calculated as completed door installations divided by total contractual openings.</span>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-amber-650 font-mono">
                        {Math.round((flats.filter(f => getFlatOverallProgress(f) === 100).length / flats.length) * 100)}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-8 pt-4 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-450 font-mono">
                    <div className="space-y-12">
                      <div className="border-b border-zinc-300 mx-auto w-3/4" />
                      <div>CONTRACTOR SIGNATURE</div>
                    </div>
                    <div className="space-y-12">
                      <div className="border-b border-zinc-300 mx-auto w-3/4" />
                      <div>PROJECT OWNER AUTHORITY</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* R.A. BILL PAYMENT CERTIFICATE LAYOUT */}
            {certType === 'ra_bill' && (
              <div className="bg-white rounded-3xl border border-zinc-300 shadow-lg p-8 sm:p-10 max-w-4xl mx-auto space-y-8 relative overflow-hidden flex flex-col justify-between min-h-[900px]">
                <div className="space-y-6">
                  {/* Certificate Heading Board */}
                  <div className="border-b-4 border-indigo-600 pb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-13 h-13 shrink-0">
                        <TufwudLogoTransparent className="w-full h-full" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold tracking-wider bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full uppercase font-mono border border-indigo-200">
                          RUNNING ACCOUNT (R.A.) BILL CERTIFICATE
                        </span>
                        <h2 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight font-sans">
                          WORK DONE CERTIFICATE &amp; PAYMENT ADVICE
                        </h2>
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs text-zinc-550 space-y-0.5 font-bold shrink-0">
                      <div>OA No: {flats[0]?.oaNo || '387026'}</div>
                      <div>Date: {new Date().toLocaleDateString()}</div>
                      <div className="text-indigo-650 font-black">RA Bill Protocol V1.0</div>
                    </div>
                  </div>

                  {/* Contract Details */}
                  <div className="bg-zinc-50 border border-zinc-200 p-5 rounded-2xl space-y-4">
                    <h3 className="font-bold text-xs uppercase tracking-wide text-zinc-800">Billing Parameters &amp; Scope</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold text-zinc-700">
                      <div>
                        <span className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Assigned Contractor</span>
                        <span className="text-zinc-900 font-extrabold">{selectedCertContractor === 'All' ? 'All Contractors' : selectedCertContractor}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Tower Location</span>
                        <span className="text-zinc-900 font-extrabold">{selectedCertTower === 'All' ? 'All Project Towers' : `Tower ${selectedCertTower}`}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Billing Period</span>
                        <span className="text-zinc-900 font-extrabold font-mono text-[11px]">
                          {new Date(raFromDate).toLocaleDateString('en-GB', {day: '2-digit', month: '2-digit', year: '2-digit'})} to {new Date(raToDate).toLocaleDateString('en-GB', {day: '2-digit', month: '2-digit', year: '2-digit'})}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Project Portfolio</span>
                        <span className="text-zinc-900 font-extrabold">{flats[0]?.soDetails || 'Godrej Woods'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Main RA Bill Itemized Table */}
                  <div className="border border-zinc-200 rounded-2xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-150 border-b border-zinc-250 font-bold text-zinc-750 font-mono text-[10px] uppercase">
                          <th className="p-3 pl-4">Sl. No.</th>
                          <th className="p-3">Work Stage Description</th>
                          <th className="p-3 text-right">Avg Rate (₹)</th>
                          <th className="p-3 text-center bg-zinc-50/50">Prior Qty</th>
                          <th className="p-3 text-center bg-indigo-50/20">Period Qty</th>
                          <th className="p-3 text-center bg-zinc-50/50">Cum Qty</th>
                          <th className="p-3 text-right">Cum Amt (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 font-medium text-zinc-700">
                        {raStagesData.map((stage, idx) => (
                          <tr key={stage.id} className="hover:bg-zinc-50/50 transition-colors">
                            <td className="p-3 pl-4 font-mono text-zinc-400">{idx + 1}</td>
                            <td className="p-3 font-semibold text-zinc-900">{stage.label}</td>
                            <td className="p-3 text-right font-mono">₹{Math.round(stage.avgRate).toLocaleString('en-IN')}</td>
                            <td className="p-3 text-center font-mono text-zinc-500 bg-zinc-50/30">{stage.priorQty.toFixed(1)}</td>
                            <td className="p-3 text-center font-mono text-indigo-700 font-bold bg-indigo-50/10">{stage.periodQty.toFixed(1)}</td>
                            <td className="p-3 text-center font-mono text-zinc-900 font-semibold bg-zinc-50/30">{stage.cumulativeQty.toFixed(1)}</td>
                            <td className="p-3 text-right font-mono text-zinc-900 font-semibold">₹{Math.round(stage.cumulativeAmt).toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                        {/* Subtotal row */}
                        <tr className="bg-zinc-100 font-bold border-t-2 border-zinc-300 text-zinc-900">
                          <td className="p-3 pl-4" colSpan={3}>GRAND TOTALS</td>
                          <td className="p-3 text-center font-mono text-zinc-650 bg-zinc-150/50">
                            {raStagesData.reduce((sum, s) => sum + s.priorQty, 0).toFixed(1)}
                          </td>
                          <td className="p-3 text-center font-mono text-indigo-900 bg-indigo-100/35">
                            {raStagesData.reduce((sum, s) => sum + s.periodQty, 0).toFixed(1)}
                          </td>
                          <td className="p-3 text-center font-mono text-zinc-900 bg-zinc-150/50">
                            {raStagesData.reduce((sum, s) => sum + s.cumulativeQty, 0).toFixed(1)}
                          </td>
                          <td className="p-3 text-right font-mono text-zinc-900">
                            ₹{Math.round(grandCumulativeAmt).toLocaleString('en-IN')}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Deduction Details & Net Pay Calculator */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Notes & Guidance */}
                    <div className="p-4 bg-zinc-50 border border-zinc-200 rounded-xl space-y-2 text-[11px] text-zinc-500 font-medium">
                      <span className="block text-zinc-800 font-bold uppercase tracking-wide text-[10px]">Contractual Notes &amp; Clauses</span>
                      <p>
                        1. **Retention Money Recovery**: 5.0% of gross period earned is withheld toward defect liability performance.
                      </p>
                      <p>
                        2. **TDS Deductions**: 2.0% statutory income tax deduction applied under Section 194C of the Income Tax Act.
                      </p>
                      <p>
                        3. Quantities are calculated based on stage milestones certified by the site supervisor and cross-verified via Drive photographs.
                      </p>
                    </div>

                    {/* Financial Summary Box */}
                    <div className="border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-200 text-xs">
                      <div className="p-3 flex justify-between font-semibold bg-zinc-50">
                        <span className="text-zinc-500">Gross Billing for this Period:</span>
                        <span className="font-mono text-zinc-900">₹{Math.round(grandPeriodAmt).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="p-3 flex justify-between font-semibold text-rose-600">
                        <span>Less: 5% Retention Money:</span>
                        <span className="font-mono">-₹{Math.round(grandPeriodAmt * 0.05).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="p-3 flex justify-between font-semibold text-rose-600">
                        <span>Less: 2% TDS Deduction:</span>
                        <span className="font-mono">-₹{Math.round(grandPeriodAmt * 0.02).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="p-3 flex justify-between font-extrabold text-emerald-700 bg-emerald-50/50 text-[13px]">
                        <span>NET PAYABLE FOR PERIOD:</span>
                        <span className="font-mono">₹{Math.round(grandPeriodAmt * 0.93).toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Bottom Signatures */}
                <div className="space-y-6 pt-6 border-t border-zinc-200">
                  <div className="grid grid-cols-3 gap-6 pt-4 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-450 font-mono">
                    <div className="space-y-12">
                      <div className="border-b border-zinc-300 mx-auto w-3/4" />
                      <div>CONTRACTOR SIGNATURE</div>
                    </div>
                    <div className="space-y-12">
                      <div className="border-b border-zinc-300 mx-auto w-3/4" />
                      <div>SUPERVISOR (AARIF TASLIM)</div>
                    </div>
                    <div className="space-y-12">
                      <div className="border-b border-zinc-300 mx-auto w-3/4" />
                      <div>PROJECT OWNER AUTHORITY</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* --- TAB VIEW 4: MONTHLY RUNNING BILLS --- */}
      {activeTab === 'runningBills' && (
        <div className="no-print space-y-6 animate-fadeIn">
          
          <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <span className="text-[10px] text-purple-650 font-black uppercase tracking-wider font-mono">PERIODIC BILLING</span>
              <h3 className="text-base font-extrabold text-zinc-900">Project Monthly Running Bills</h3>
              <p className="text-xs text-zinc-500 font-medium">Aggregates earned payouts grouped by completion timestamps and calendar periods.</p>
            </div>
            
            <button
              onClick={handleExportMonthlyBillCSV}
              className="w-full md:w-auto px-4 py-2.5 bg-zinc-900 hover:bg-black text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Download className="w-4 h-4 shrink-0" />
              <span>Export Monthly Bills CSV</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Left Col: Month filter */}
            <div className="md:col-span-1 space-y-4">
              <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl space-y-3">
                <span className="block text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Select Billing Period</span>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setSelectedBillMonth('All')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-between ${
                      selectedBillMonth === 'All' ? 'bg-indigo-600 text-white' : 'hover:bg-zinc-200/50 text-zinc-700'
                    }`}
                  >
                    <span>All Calendar Periods</span>
                    <span className="text-[10px] opacity-75">{monthlyBills.length} periods</span>
                  </button>
                  {billingMonthsList.map(m => (
                    <button
                      key={m}
                      onClick={() => setSelectedBillMonth(m)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-bold transition flex items-center justify-between ${
                        selectedBillMonth === m ? 'bg-indigo-600 text-white' : 'hover:bg-zinc-200/50 text-zinc-700'
                      }`}
                    >
                      <span>{m}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Col: Billing Period Summaries */}
            <div className="md:col-span-3 space-y-6">
              {monthlyBills
                .filter(m => selectedBillMonth === 'All' || m.monthName === selectedBillMonth)
                .map(m => (
                  <div key={m.monthName} className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xs space-y-4 p-5">
                    
                    {/* Period header */}
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-150">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                          <Calendar className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-sm text-zinc-900">{m.monthName} Running Bill</h4>
                          <span className="text-[10px] text-zinc-450 uppercase font-black tracking-wide">RA CERTIFICATE BILL</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="block text-[10px] text-zinc-400 uppercase font-bold">Earned Value for Month</span>
                        <span className="text-base font-black text-purple-700 font-mono">₹{m.totalEarned.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {/* Stage totals breakdowns inside month */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {FINANCIAL_STAGES.map(s => {
                        const count = m.stagesCount[s.id];
                        const earned = m.stagesEarned[s.id];
                        return (
                          <div key={s.id} className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1">
                            <span className="block text-[9px] text-zinc-450 font-bold uppercase truncate">{s.label}</span>
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-xs font-black text-zinc-800 font-mono">₹{earned.toLocaleString('en-IN')}</span>
                              <span className="text-[10px] text-zinc-400 font-bold font-mono">x{count}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Work completions list log for transparency */}
                    <div className="space-y-2">
                      <span className="block text-[9px] uppercase font-bold text-zinc-400 tracking-wider">Verified completions audit trail</span>
                      <div className="max-h-48 overflow-y-auto border border-zinc-200 rounded-xl divide-y divide-zinc-200">
                        {m.items.map((item, i) => (
                          <div key={i} className="px-3.5 py-2.5 flex items-center justify-between text-[11px] font-semibold text-zinc-700 hover:bg-zinc-50/50">
                            <div>
                              <span className="font-mono text-zinc-400 font-bold mr-2">{item.doorId.split('/').pop()}</span>
                              <span>{item.towerId} | Floor {item.floor} | Flat {item.flatNo} — <strong>{item.stageLabel} Completed</strong></span>
                            </div>
                            <span className="font-mono font-bold text-emerald-650">₹{item.earned.toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                ))}
            </div>
          </div>

        </div>
      )}

      {/* --- TAB VIEW 5: DEDICATED PROJECT HANDOVER TAB --- */}
      {activeTab === 'handoverTab' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Handover Configuration Panel */}
          <div className="no-print bg-white rounded-2xl border border-zinc-200 p-5 space-y-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5 flex items-center gap-3">
                <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
                  <CheckCircle2 className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <span className="text-[10px] text-indigo-650 font-black uppercase tracking-wider font-mono">HANDOVER MODULE</span>
                  <h3 className="text-base font-extrabold text-zinc-900">Project Handover Documents</h3>
                  <p className="text-xs text-zinc-500 font-medium">Generate official site handover quality certificates and formal handover letters.</p>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-indigo-650 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5 shrink-0" />
                  <span>Print / Save as PDF</span>
                </button>

                <button
                  disabled={isGeneratingPdf}
                  onClick={downloadAsPDF}
                  className="px-4 py-2.5 bg-red-650 hover:bg-red-750 disabled:bg-zinc-400 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  {isGeneratingPdf ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                      <span>Generating PDF...</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span>Download PDF</span>
                    </>
                  )}
                </button>

                <button
                  onClick={downloadAsHTML}
                  className="px-4 py-2.5 bg-emerald-650 hover:bg-emerald-750 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5 shrink-0" />
                  <span>Download HTML Doc</span>
                </button>

                <button
                  onClick={downloadAsWord}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span>Download Word Doc</span>
                </button>

                <button
                  onClick={downloadAsCSV}
                  className="px-4 py-2.5 bg-zinc-50 hover:bg-zinc-100 text-zinc-700 border border-zinc-250 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 shrink-0 text-emerald-650" />
                  <span>Export CSV Data</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2 border-t border-zinc-100">
              
              {/* Selector 1: Handover Mode */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wide font-mono">Document Format</label>
                <div className="flex bg-zinc-100 rounded-xl p-1 border border-zinc-200">
                  <button
                    onClick={() => setHandoverMode('certificate')}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition uppercase ${handoverMode === 'certificate' ? 'bg-white text-indigo-700 shadow-3xs border border-zinc-200/50' : 'text-zinc-500'}`}
                  >
                    Certificate
                  </button>
                  <button
                    onClick={() => setHandoverMode('letter')}
                    className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition uppercase ${handoverMode === 'letter' ? 'bg-white text-indigo-700 shadow-3xs border border-zinc-200/50' : 'text-zinc-500'}`}
                  >
                    Formal Letter
                  </button>
                </div>
              </div>

              {/* Selector 2: Tower Location Filter */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wide">Tower Location Filter</label>
                <select
                  value={selectedCertTower}
                  onChange={(e) => setSelectedCertTower(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-250 rounded-xl text-xs font-bold text-zinc-700 focus:outline-none"
                >
                  <option value="All">All Project Towers</option>
                  {uniqueTowers.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Selector 3: Select Contractor */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wide">Select Contractor</label>
                <select
                  value={selectedCertContractor}
                  onChange={(e) => setSelectedCertContractor(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-250 rounded-xl text-xs font-bold text-zinc-700 focus:outline-none"
                >
                  <option value="All">All Contractors</option>
                  {uniqueContractors.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Selector 4: Info Badge */}
              <div className="space-y-1.5 flex flex-col justify-end">
                <div className="p-2 bg-zinc-50 border border-zinc-200 rounded-xl text-[10px] text-zinc-550 font-semibold leading-normal">
                  ⚠️ <strong>Handover Exception:</strong> Checklist stages for Handover must be user-filled manually from the Flat Checklist popup.
                </div>
              </div>

            </div>

            {/* Extra inputs row for Handover Letter parameters */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-zinc-150 pt-4 animate-fadeIn">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wide">Client / Site Contact Name</label>
                <input
                  type="text"
                  value={clientContactName}
                  onChange={(e) => setClientContactName(e.target.value)}
                  placeholder="e.g. Rahatul Hoque"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wide">Site Address</label>
                <input
                  type="text"
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  placeholder="e.g. Godrej Woods, Sector 43, Noida, UP"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wide">Company Letterhead Office</label>
                <select
                  value={companyAddressKey}
                  onChange={(e) => setCompanyAddressKey(e.target.value as 'kolkata' | 'mumbai')}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition cursor-pointer"
                >
                  <option value="kolkata">Kolkata Office Address</option>
                  <option value="mumbai">Mumbai Office Address</option>
                </select>
              </div>
            </div>

          </div>

          {/* PHYSICAL CERTIFICATE DECK (TARGET FOR PRINTING) */}
          <div className="printable-cert-deck space-y-10">
              
              {/* HANDING OVER COMPREHENSIVE CERTIFICATE LAYOUT */}
              {handoverMode === 'certificate' && (
                <div className="bg-white rounded-3xl border border-zinc-350 shadow-lg p-6 sm:p-7 max-w-4xl mx-auto space-y-5 relative overflow-hidden flex flex-col justify-between min-h-[720px] font-sans text-zinc-800">
                  <div className="space-y-4">
                    {/* Certificate Heading Board */}
                    <div className="border-b-4 border-indigo-600 pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5">
                        <div className="w-13 h-13 shrink-0">
                          <TufwudLogoTransparent className="w-full h-full text-[#8a5a37]" />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-extrabold tracking-wider bg-indigo-100 text-indigo-850 px-2.5 py-0.5 rounded-full uppercase font-mono border border-indigo-200">
                            FINAL HANDING OVER PROTOCOL
                          </span>
                          <h2 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight font-sans">
                            QUALITY HANDING OVER &amp; TAKE OVER CERTIFICATE
                          </h2>
                        </div>
                      </div>
                      <div className="text-right font-mono text-xs text-zinc-550 space-y-0.5 font-bold shrink-0">
                        <div>Cert No: HC-{flats[0]?.oaNo || '387026'}-FINAL</div>
                        <div>Date: {new Date().toLocaleDateString()}</div>
                        <div className="text-indigo-600 font-extrabold font-mono">Quality Handover Docket</div>
                      </div>
                    </div>

                    {/* Formal Declaration Block */}
                    <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl space-y-1.5">
                      <h3 className="font-bold text-[10px] uppercase tracking-wide text-zinc-800">Formal Transfer Declaration</h3>
                      <p className="text-[11px] text-zinc-600 leading-normal font-semibold">
                        We hereby declare and certify that the door sets and specifications listed below have undergone final de-snagging, rigorous alignment checks, and paint touch-ups. All keys are accounted for, hardware components are polished, and the openings are formally handed over to the Client in perfect working order.
                      </p>
                    </div>

                    {/* Project Parameters */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold">
                      <div className="space-y-0.5">
                        <span className="block text-[9px] text-zinc-400 uppercase tracking-wider">Project / Sales Order</span>
                        <span className="text-zinc-850 font-extrabold">{flats[0]?.oaNo || 'SO-387026'}</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="block text-[9px] text-zinc-400 uppercase tracking-wider">Client Spec</span>
                        <span className="text-zinc-850 font-extrabold">{flats[0]?.soDetails || 'Godrej Woods'}</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="block text-[9px] text-zinc-400 uppercase tracking-wider">Site Supervisor</span>
                        <span className="text-zinc-800 font-bold">{flats[0]?.supervisor || 'Aarif Taslim'}</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="block text-[9px] text-zinc-400 uppercase tracking-wider">Assigned Contractor</span>
                        <span className="text-zinc-800 font-bold">{flats[0]?.contractor || 'Prabir Dhol'}</span>
                      </div>
                    </div>

                    {/* Mapped Openings Table */}
                    <div className="border border-zinc-250 rounded-xl overflow-hidden shadow-2xs">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-zinc-100 text-zinc-650 font-black uppercase border-b border-zinc-250 text-[9px] tracking-wider font-mono">
                            <th className="px-4 py-2.5 w-1/4">Opening ID &amp; Location</th>
                            <th className="px-4 py-2.5 w-1/4">Key &amp; Hardware Status</th>
                            <th className="px-4 py-2.5 w-1/3">Stage Photos</th>
                            <th className="px-4 py-2.5 text-center w-1/6">Handover Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 font-semibold text-zinc-700">
                          {flats
                            .filter(d => {
                              if (selectedCertTower !== 'All' && d.towerId !== selectedCertTower) return false;
                              if (selectedCertContractor !== 'All' && d.contractor !== selectedCertContractor) return false;
                              return true;
                            })
                            .slice(0, 8) // Limit to 8 rows for visual aesthetic print page-limit
                            .map(door => {
                              const progress = getFlatOverallProgress(door);
                              
                              // Gather all photos with their stage label keys
                              const allStagePhotos = door.photos ? Object.entries(door.photos).flatMap(([stageKey, photosList]) => 
                                (photosList || []).map(p => ({ ...p, stageKey }))
                              ) : [];

                              const getStageShortLabel = (key: string): string => {
                                if (key === 'frame_install') return 'Frame';
                                if (key === 'shutter_install') return 'Shutter';
                                if (key === 'hardware_fixing') return 'Hdw';
                                if (key === 'painting') return 'Paint';
                                if (key === 'handover') return 'Handover';
                                return key;
                              };

                              return (
                                <tr key={door.id} className="hover:bg-zinc-50/20 transition">
                                  <td className="px-4 py-2.5 font-mono">
                                    <div className="font-bold text-zinc-950 text-[11px] truncate">{door.id.split('/').pop()}</div>
                                    <div className="text-[10px] text-zinc-450 mt-0.5 font-sans">{door.towerId} | Level {door.floor} | Flat {door.flatNo}</div>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <div className="flex flex-col gap-1">
                                      {door.handover.keysHandover ? (
                                        <span className="w-fit px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-100 text-[8px] rounded font-extrabold uppercase">Keys Handed Over</span>
                                      ) : (
                                        <span className="w-fit px-1.5 py-0.5 bg-zinc-50 text-zinc-450 border border-zinc-150 text-[8px] rounded font-extrabold uppercase">Keys Pending</span>
                                      )}
                                      {door.hardwareFixing.hingeFitting && door.hardwareFixing.lockWithHandleFitting ? (
                                        <span className="w-fit px-1.5 py-0.5 bg-indigo-50 text-indigo-800 border border-indigo-100 text-[8px] rounded font-extrabold uppercase">Hardware Mapped</span>
                                      ) : (
                                        <span className="w-fit px-1.5 py-0.5 bg-zinc-50 text-zinc-440 border border-zinc-150 text-[8px] rounded font-extrabold uppercase">Hardware Open</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5">
                                    <div className="flex flex-wrap gap-1.5">
                                      {allStagePhotos.length > 0 ? (
                                        allStagePhotos.slice(0, 4).map((photo, pIdx) => {
                                          const label = getStageShortLabel(photo.stageKey);
                                          return (
                                            <div key={photo.id || pIdx} className="relative flex flex-col items-center">
                                              <div className="w-8 h-8 rounded-md border border-zinc-250 overflow-hidden bg-zinc-100 shadow-3xs">
                                                <img 
                                                  src={photo.url} 
                                                  alt={photo.name} 
                                                  className="w-full h-full object-cover" 
                                                  referrerPolicy="no-referrer"
                                                />
                                              </div>
                                              <span className="text-[7px] text-zinc-500 font-extrabold uppercase mt-0.5 leading-none bg-zinc-100 px-1 py-0.5 rounded border border-zinc-150">{label}</span>
                                            </div>
                                          );
                                        })
                                      ) : (
                                        <span className="text-[10px] text-zinc-400 italic">No stage photos uploaded</span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2.5 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider font-mono ${
                                      progress === 100 
                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                        : "bg-amber-100 text-amber-800 border border-amber-200"
                                    }`}>
                                      {progress === 100 ? "Ready" : "Audit"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          {flats.filter(d => {
                            if (selectedCertTower !== 'All' && d.towerId !== selectedCertTower) return false;
                            if (selectedCertContractor !== 'All' && d.contractor !== selectedCertContractor) return false;
                            return true;
                          }).length === 0 && (
                            <tr>
                              <td colSpan={4} className="px-5 py-8 text-center text-zinc-450 italic font-medium bg-zinc-50">
                                No matching openings found in the selected scope filter.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Footer Signature Docket */}
                  <div className="space-y-6 pt-6 border-t border-zinc-200">
                    <div className="grid grid-cols-3 gap-6 pt-4 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-450 font-mono">
                      <div className="space-y-12">
                        <div className="border-b border-zinc-300 mx-auto w-3/4" />
                        <div>HANDED OVER BY (Tufwud Site Supervisor)</div>
                      </div>
                      <div className="space-y-12">
                        <div className="border-b border-zinc-300 mx-auto w-3/4" />
                        <div>VERIFIED BY (Tufwud Lead QA Auditor)</div>
                      </div>
                      <div className="space-y-12">
                        <div className="border-b border-zinc-300 mx-auto w-3/4 text-indigo-300" />
                        <div className="text-indigo-650 font-extrabold">TAKEN OVER BY (Authorized Client Representative)</div>
                      </div>
                    </div>
                  </div>

                  {/* Premium Corporate Footer */}
                  <div className="border-t border-[#8a5a37]/30 pt-4 flex flex-col sm:flex-row items-center justify-between text-[9px] text-zinc-450 uppercase tracking-wider font-mono font-bold mt-6">
                    <div>Kolkata | Mumbai | Delhi | Bangalore</div>
                    <div className="text-[#8a5a37] font-extrabold tracking-wide">Choose INSULATED - Choose TUFWUD</div>
                  </div>
                </div>
              )}

              {/* HANDING OVER FORMAL LETTER LAYOUT */}
              {handoverMode === 'letter' && (() => {
                // Group flats by floor or tower-floor
                const floorsGrouped: { [key: string]: { total: number; installed: number; handedOver: number } } = {};
                flats
                  .filter(d => {
                    if (selectedCertTower !== 'All' && d.towerId !== selectedCertTower) return false;
                    if (selectedCertContractor !== 'All' && d.contractor !== selectedCertContractor) return false;
                    return true;
                  })
                  .forEach(door => {
                    const key = selectedCertTower === 'All' ? `${door.towerId} - Level ${door.floor}` : `Level ${door.floor}`;
                    if (!floorsGrouped[key]) {
                      floorsGrouped[key] = { total: 0, installed: 0, handedOver: 0 };
                    }
                    const isInstalled = getFlatOverallProgress(door) >= 100;
                    const isKeysHandedOver = getSubtaskWeight(door.handover.keysHandover) === 1.0;
                    floorsGrouped[key].total += 1;
                    if (isInstalled) {
                      floorsGrouped[key].installed += 1;
                    }
                    if (isInstalled && isKeysHandedOver) {
                      floorsGrouped[key].handedOver += 1;
                    }
                  });

                let totalDoorsCount = 0;
                let totalInstalledCount = 0;
                let totalHandedOverCount = 0;
                Object.values(floorsGrouped).forEach(g => {
                  totalDoorsCount += g.total;
                  totalInstalledCount += g.installed;
                  totalHandedOverCount += g.handedOver;
                });
                const totalHandoverPct = totalDoorsCount > 0 ? Math.round((totalHandedOverCount / totalDoorsCount) * 100) : 0;
                const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

                return (
                  <div className="bg-white rounded-3xl border border-zinc-300 shadow-lg p-8 sm:p-12 max-w-4xl mx-auto space-y-8 relative overflow-hidden flex flex-col justify-between min-h-[850px] text-zinc-800 font-sans">
                    <div className="space-y-6">
                      {/* Official Corporate Letterhead */}
                      <div className="border-b-2 border-[#8a5a37] pb-4 flex flex-col md:flex-row items-start justify-between gap-6">
                        {/* Left Side: Logo & Certifications */}
                        <div className="flex flex-col sm:flex-row items-center md:items-start gap-4">
                          <div className="w-14 h-14 shrink-0">
                            <TufwudLogoTransparent className="w-full h-full text-[#8a5a37]" />
                          </div>
                          <div className="text-center sm:text-left space-y-1.5">
                            <div className="text-2xl font-black text-[#6b4226] tracking-tight font-sans leading-none">
                              TUFWUD
                            </div>
                            <div className="text-[9px] font-black text-zinc-500 tracking-widest uppercase font-mono">
                              Site Installation — Handover Letter
                            </div>
                            
                            {/* Certifications Row */}
                            <div className="flex items-center gap-1 flex-wrap justify-center sm:justify-start">
                              <span className="text-[8px] font-bold px-1.5 py-0.5 bg-zinc-50 text-zinc-600 border border-zinc-200 rounded uppercase font-mono tracking-tight" title="Forest Stewardship Council">
                                FSC® C157844
                              </span>
                              <span className="text-[8px] font-bold px-1.5 py-0.5 bg-zinc-50 text-zinc-600 border border-zinc-200 rounded uppercase font-mono tracking-tight">
                                ISO Certified
                              </span>
                              <span className="text-[8px] font-bold px-1.5 py-0.5 bg-zinc-50 text-zinc-600 border border-zinc-200 rounded uppercase font-mono tracking-tight">
                                ISI Certified
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right Side: Company Details & Selected Office Address */}
                        <div className="text-center md:text-right space-y-0.5 w-full md:w-auto">
                          <div className="text-xs font-black text-zinc-900 uppercase tracking-tight">
                            Tufwud Doors &amp; Accessories Private Limited
                          </div>
                          <div className="text-[9.5px] font-bold text-zinc-550 italic">
                            Formerly &quot;Khemka Timber Pvt. Ltd&quot;
                          </div>
                          <div className="text-[9px] font-extrabold text-zinc-400 font-mono">
                            CIN: U20219WB1988PTC045247
                          </div>
                          
                          {/* Selected Address Block */}
                          <div className="text-[9.5px] text-zinc-600 leading-tight space-y-0.5 pt-1">
                            {companyAddressKey === 'kolkata' ? (
                              <p className="font-bold text-zinc-800">
                                📍 111, D. H. Road, Behala, Kadamtala, Kolkata 700 063
                              </p>
                            ) : (
                              <p className="font-bold text-zinc-800">
                                📍 Sai Sangam Building, 4th Floor Flat No. 406, Plot 51A, Sector 16 Ulwe, Kharkopar, Navi Mumbai 410 206
                              </p>
                            )}
                            <p className="text-zinc-500 text-[9px] font-medium">
                              📞 +91 84200 50754 / +91 83350 60453 | ✉️ sales@tufwud.in / admin@tufwud.in
                            </p>
                            <p className="font-mono text-zinc-500 text-[8.5px] font-bold">
                              🌐 www.tufwud.com
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Metadata block */}
                      <div className="flex justify-between items-start text-xs font-semibold text-zinc-650 pt-2 font-mono">
                        <div>Date: {todayStr}</div>
                        <div>Order No: {flats[0]?.oaNo || 'SO-387026'}-FINAL</div>
                      </div>

                      {/* Recipient Address */}
                      <div className="space-y-1.5 text-xs font-semibold pt-4 text-zinc-700">
                        <div className="font-extrabold uppercase tracking-wide text-zinc-400 text-[10px]">To,</div>
                        <div className="text-sm font-black text-zinc-900">{clientContactName || '_______________________'}</div>
                        <div className="text-xs text-zinc-550 leading-relaxed max-w-md" style={{ whiteSpace: 'pre-wrap' }}>
                          {siteAddress || '_______________________'}
                        </div>
                      </div>

                      {/* Subject Line */}
                      <div className="bg-zinc-50 border border-zinc-200/60 p-3.5 rounded-xl text-xs text-zinc-900 font-black">
                        Subject: Handover of door installation work — Order No. {flats[0]?.oaNo || 'SO-387026'}
                      </div>

                      {/* Salutation and Letter Body */}
                      <div className="space-y-3.5 text-xs text-zinc-650 leading-relaxed font-medium">
                        <p>Dear Sir/Madam,</p>
                        <p>
                          This letter serves to formally confirm the status and progressive handover of the door, frame, architrave,
                          and hardware installation works executed under the aforementioned contract order. All specified units, as detailed
                          in the comprehensive schedule below, have been meticulously installed, inspected for quality compliance, and
                          officially signed off as ready for handover as of <strong className="text-zinc-950 font-bold">{todayStr}</strong>.
                        </p>
                      </div>

                      {/* Floor Summary Table */}
                      <div className="border border-zinc-250 rounded-xl overflow-hidden shadow-3xs mt-4 font-sans">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-zinc-100 text-zinc-650 font-black uppercase border-b border-zinc-250 text-[10px] tracking-wider font-mono">
                              <th className="px-5 py-3">Floor / Tower Location</th>
                              <th className="px-5 py-3 text-center w-24">Total Doors</th>
                              <th className="px-5 py-3 text-center w-24">Installed</th>
                              <th className="px-5 py-3 text-center w-28">Handed Over</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200 font-semibold text-zinc-700">
                            {Object.entries(floorsGrouped).map(([floorKey, counts]) => (
                              <tr key={floorKey} className="hover:bg-zinc-50/20 transition">
                                <td className="px-5 py-3.5 font-bold text-zinc-900">{floorKey}</td>
                                <td className="px-5 py-3.5 text-center font-mono text-zinc-500">{counts.total}</td>
                                <td className="px-5 py-3.5 text-center font-mono text-emerald-600">{counts.installed}</td>
                                <td className="px-5 py-3.5 text-center font-mono text-indigo-650 font-bold bg-indigo-50/10">{counts.handedOver}</td>
                              </tr>
                            ))}
                            {totalDoorsCount > 0 && (
                              <tr className="bg-zinc-50 font-black text-zinc-900 border-t-2 border-zinc-250 font-mono text-[11px]">
                                <td className="px-5 py-4">GRAND TOTAL</td>
                                <td className="px-5 py-4 text-center">{totalDoorsCount}</td>
                                <td className="px-5 py-4 text-center text-emerald-700">{totalInstalledCount}</td>
                                <td className="px-5 py-4 text-center text-indigo-700 bg-indigo-50/20">{totalHandedOverCount} ({totalHandoverPct}%)</td>
                              </tr>
                            )}
                            {totalDoorsCount === 0 && (
                              <tr>
                                <td colSpan={4} className="px-5 py-8 text-center text-zinc-450 italic bg-zinc-50 font-medium">
                                  No matching records found for floor grouping.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Verification Note */}
                      <p className="text-[11px] text-zinc-500 italic leading-relaxed pt-2">
                        We request you to kindly review the installed work and countersign below to confirm formal receipt and site handover.
                      </p>
                    </div>

                    {/* Signatures Row */}
                    <div className="space-y-6 pt-10 mt-10 border-t border-zinc-200">
                      <div className="grid grid-cols-2 gap-10 text-center text-[10px] font-bold uppercase tracking-wider text-zinc-450 font-mono">
                        <div className="space-y-12">
                          <div className="border-b border-zinc-350 mx-auto w-5/6" />
                          <div className="text-zinc-550">
                            For Tufwud Doors &amp; Accessories Pvt. Ltd.
                            <span className="block text-[9px] text-zinc-400 font-medium tracking-normal mt-0.5 lowercase font-sans">name, signature &amp; date</span>
                          </div>
                        </div>
                        <div className="space-y-12">
                          <div className="border-b border-zinc-350 mx-auto w-5/6 text-indigo-300" />
                          <div className="text-indigo-650 font-extrabold">
                            Client / Authorized Site Representative
                            <span className="block text-[9px] text-zinc-400 font-medium tracking-normal mt-0.5 lowercase font-sans">name, signature &amp; date</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Premium Corporate Footer */}
                    <div className="border-t border-[#8a5a37]/30 pt-4 flex flex-col sm:flex-row items-center justify-between text-[9px] text-zinc-450 uppercase tracking-wider font-mono font-bold mt-6">
                      <div>Kolkata | Mumbai | Delhi | Bangalore</div>
                      <div className="text-[#8a5a37] font-extrabold tracking-wide">Choose INSULATED - Choose TUFWUD</div>
                    </div>
                  </div>
                );
              })()}

          </div>

        </div>
      )}

    </div>
  );
}
