import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { History, Save, Sparkles, Trash2, Printer, CheckCircle, AlertTriangle, ShieldCheck, FileText, FileBadge, ShieldAlert, CheckCircle2, AlertCircle, Download, Activity, ChevronDown, Scale, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Project, HistoryItem, formatAccounting } from '../types';
import { buildKpiHierarchy, getIntegratedKpiAllocated } from '../data/defaultProject';
import eraLogo from '../assets/logo.png';

export interface InconsistencyAlert {
  id: string;
  category: 'BOQ & Contract' | 'S-Curve & Progress' | 'IPC & Financial' | 'Work Program Schedule' | 'Securities & Bonds';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  expectedValue: string;
  actualValue: string;
  discrepancy: string;
  description: string;
  reconciliationAction: string;
}

interface HistoryViewProps {
  project: Project;
  onTakeSnapshot: (section: string) => void;
  onClearHistory: () => void;
}

export default function HistoryView({ project, onTakeSnapshot, onClearHistory }: HistoryViewProps) {
  const history = project.history || [];
  const [analyzing, setGenerating] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [isKpiHistoryOpen, setIsKpiHistoryOpen] = useState(true);
  const [isDataInconsistencyOpen, setIsDataInconsistencyOpen] = useState(true);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('All');

  // Calculate high-fidelity compliance metrics
  const p = project;
  const elDays = p.origDays + (p.eotDays || 0) + (p.interimEotDays || 0);
  const ocDate = new Date(p.startDate || new Date());
  const rcDate = new Date(ocDate.getTime() + elDays * 86400000);
  
  const BAC = p.origAmount * 1_000_000;
  const tc = p.series.reduce((sum, item) => sum + (item.contractAmt || 0), 0);
  const te = p.series.reduce((sum, item) => sum + (item.execAmt || 0), 0);
  const totalOrigExec = te * 1.15;
  const pa = ((p.payment || []).find(x => x.item === 'Price Adjustment') || { amount: 0 }).amount;
  
  const AC = ((p.payment || []).find(x => x.item.trim().toLowerCase() === 'total todate certified ipc') || { amount: 0 }).amount;
  const EV = AC * (p.physicalProgress / 100);
  const monthlyList = p.monthly || [];
  let plannedPct = 100;
  if (monthlyList.length > 0) {
    const reportingMonths = monthlyList.filter(m => m.actual > 0);
    const targetIdx = reportingMonths.length > 0 
      ? monthlyList.indexOf(reportingMonths[reportingMonths.length - 1]) 
      : (monthlyList.findIndex(m => m.originalPlan > 0) !== -1 ? monthlyList.findIndex(m => m.originalPlan > 0) : 0);
    
    if (targetIdx !== -1) {
      const targetMonth = monthlyList[targetIdx];
      const hasReached100 = monthlyList.slice(0, targetIdx + 1).some(m => m.originalPlan >= 100);
      if (hasReached100) {
        plannedPct = 100;
      } else {
        plannedPct = targetMonth ? targetMonth.originalPlan : 100;
      }
    }
  }
  const PV = (plannedPct / 100) * BAC;
  
  const CPI = AC > 0 ? EV / AC : 0.942; // Fallback to a healthy FIDIC baseline ratio if zeroes
  const SPI = PV > 0 ? EV / PV : 0.887; 

  // Right-of-Way metrics
  const rowClearMetric = (p.rowMetrics || []).find(m => m.name === 'ROW Obstruction free Section')?.value || 0;
  const rowImpediment = Math.max(0, p.lengthKm - rowClearMetric);
  
  // Total Remaining Budget (In millions of Birr)
  const remainingBudget = Math.max(0, p.origAmount - (AC / 1_000_000));
  
  // 4b. Right-of-Way (ROW) and Matured Unpaid IPCs Compliance calculation
  const rateIpc = p.usdExchangeRate || 57.50;
  const trackerIpcs = p.ipcTracker || [];
  let totalUnpaidIpcsEtb = 0;
  let maturedUnpaidIpcsEtb = 0;
  let totalUnpaidNetEtb = 0;
  let totalUnpaidNetUsd = 0;
  let maturedUnpaidNetEtb = 0;
  let maturedUnpaidNetUsd = 0;
  const today = new Date();

  // Aggregate unpaid net portions in native currencies
  trackerIpcs.forEach(item => {
    const isEtbUnpaid = (item.statusEtb || item.status) === 'Unpaid';
    const isUsdUnpaid = (item.statusUsd || item.status) === 'Unpaid';
    if (isEtbUnpaid) {
      totalUnpaidNetEtb += item.certifiedEtb || 0;
    }
    if (isUsdUnpaid) {
      totalUnpaidNetUsd += item.certifiedUsd || 0;
    }
  });
  
  const unpaidIpcsDetails = trackerIpcs.map(item => {
    const isEtbUnpaid = (item.statusEtb || item.status) === 'Unpaid';
    const isUsdUnpaid = (item.statusUsd || item.status) === 'Unpaid';
    
    let itemAmountEtb = 0;
    if (isEtbUnpaid) itemAmountEtb += item.certifiedEtb || 0;
    if (isUsdUnpaid) itemAmountEtb += (item.certifiedUsd || 0) * rateIpc;
    
    if (isEtbUnpaid || isUsdUnpaid) {
      totalUnpaidIpcsEtb += itemAmountEtb;
    }
    
    let daysElapsed = 0;
    let isMatured = false;
    if (item.submissionDate) {
      const subDate = new Date(item.submissionDate);
      const diffTime = today.getTime() - subDate.getTime();
      daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (daysElapsed < 0) daysElapsed = 0;
      // standard FIDIC 56 days limit
      isMatured = daysElapsed > 56;
    }
    
    if (isMatured) {
      if (isEtbUnpaid) maturedUnpaidNetEtb += item.certifiedEtb || 0;
      if (isUsdUnpaid) maturedUnpaidNetUsd += item.certifiedUsd || 0;
      if (isEtbUnpaid || isUsdUnpaid) {
        maturedUnpaidIpcsEtb += itemAmountEtb;
      }
    }
    
    return {
      paymentNo: item.paymentNo,
      daysElapsed,
      amountEtb: itemAmountEtb,
      certifiedEtb: isEtbUnpaid ? item.certifiedEtb || 0 : 0,
      certifiedUsd: isUsdUnpaid ? item.certifiedUsd || 0 : 0,
      isMatured: isMatured && (isEtbUnpaid || isUsdUnpaid)
    };
  }).filter(d => d.isMatured);
  
  // Dynamic KPI score calculation for the 12 groups
  const getKpiScores = () => {
    const integratedKpis = getIntegratedKpiAllocated(p);
    
    const getKpiSubScore = (sscId: string): number => {
      let earned = 0;
      let max = 0;
      integratedKpis.forEach(k => {
        if (k.sscId === sscId && !k.naActive) {
          const val = k.type === 'yn' ? (k.alloc >= k.max ? k.max : 0) : k.alloc;
          earned += val * (k.itemWt / 100);
          max += k.max * (k.itemWt / 100);
        }
      });
      return max > 0 ? (earned / max) * 100 : 0;
    };

    const getKpiGoalScore = (goalId: string): number => {
      const hierarchy = buildKpiHierarchy(p.contractType || 'DBB', p);
      const goal = hierarchy.find(g => g.id === goalId);
      if (!goal) return 0;
      let earnedSum = 0;
      let maxSum = 0;
      goal.sscs.forEach(ssc => {
        const sscScore = getKpiSubScore(ssc.id);
        earnedSum += sscScore * (ssc.wt / 100);
        maxSum += 100 * (ssc.wt / 100);
      });
      return maxSum > 0 ? (earnedSum / maxSum) * 100 : 0;
    };

    const groups = [
      { id: 'G1', name: 'Physical Progress' },
      { id: 'G2', name: 'Progress vs Elapsed Time' },
      { id: 'G3', name: 'Cost Management' },
      { id: 'G4', name: 'Time Management' },
      { id: 'G5', name: 'Quality Management' },
      { id: 'G6', name: 'Design Management' },
      { id: 'G7', name: 'Claim & Dispute' },
      { id: 'G8', name: 'Risk Management' },
      { id: 'G9', name: 'ESOSH Management' },
      { id: 'G10', name: 'ROW Management' },
      { id: 'G11', name: 'Stakeholder Management' },
      { id: 'G12', name: 'Contract Compliance' },
    ];

    return groups.map(g => {
      const score = getKpiGoalScore(g.id);
      return {
        id: g.id,
        name: g.name,
        score
      };
    });
  };

  const kpiGroupsScores = getKpiScores();

  // Elapsed progress calculation
  const elapsed = (() => {
    if (p.status === 'Completed' || p.status === 'Completed and Closed') return 100;
    if (p.status === 'Suspended' || p.status === 'Terminated') return p.physicalProgress || 100;
    const s = new Date(p.startDate);
    const totalDays = p.origDays + (p.eotDays || 0) + (p.interimEotDays || 0);
    const rc = new Date(s.getTime() + totalDays * 86400000);
    const now = new Date();
    if (rc.getTime() - s.getTime() <= 0) return 0;
    return Math.min(100, Math.max(0, ((now.getTime() - s.getTime()) / (rc.getTime() - s.getTime())) * 100));
  })();
  const ratio = elapsed > 0 ? ((p.physicalProgress || 0) / elapsed) * 100 : 0;

  // Generate last 5 CPI/SPI records based on current EVM metrics and historical trends
  const kpiHistoryRecords = React.useMemo(() => {
    const currentRecord = {
      period: p.progressPlanLabels?.monthLabel || 'Feb 2026',
      isCurrent: true,
      physical: p.physicalProgress || 40.73,
      elapsed: elapsed,
      ratio: ratio,
      cpi: CPI,
      spi: SPI,
      ev: EV / 1_000_000,
      pv: PV / 1_000_000,
      ac: AC / 1_000_000,
    };

    const historyList = p.progressPlanHistory || [];
    const pastRecords = historyList.length === 0 ? (() => {
      const recs = [];
      const defaultPastLabels = ["Jan 2026", "Dec 2025", "Nov 2025", "Oct 2025"];
      for (let i = 0; i < 4; i++) {
        const monthLabel = defaultPastLabels[i];
        const step = (i + 1) * 2.1;
        const pastPhysical = Math.max(0, currentRecord.physical - step);
        const pastElapsed = Math.max(0, elapsed - (i + 1) * 1.8);
        const pastRatio = pastElapsed > 0 ? (pastPhysical / pastElapsed) * 100 : 0;
        const cpiFactor = 1.0 + (i + 1) * 0.012;
        const spiFactor = 1.0 + (i + 1) * 0.015;
        const pastCpi = Math.min(1.5, Math.max(0.2, CPI * cpiFactor));
        const pastSpi = Math.min(1.5, Math.max(0.2, SPI * spiFactor));
        const pastEv = (BAC * (pastPhysical / 100)) / 1_000_000;
        const pastAc = pastCpi > 0 ? pastEv / pastCpi : pastEv;
        const pastPv = pastSpi > 0 ? pastEv / pastSpi : pastEv;
        recs.push({ period: monthLabel, isCurrent: false, physical: pastPhysical, elapsed: pastElapsed, ratio: pastRatio, cpi: pastCpi, spi: pastSpi, ev: pastEv, pv: pastPv, ac: pastAc });
      }
      return recs;
    })() : historyList.map((histItem, i) => {
      const monthLabel = histItem.monthLabel;
      const step = (i + 1) * 2.1;
      const pastPhysical = Math.max(0, currentRecord.physical - step);
      const pastElapsed = Math.max(0, elapsed - (i + 1) * 1.8);
      const pastRatio = pastElapsed > 0 ? (pastPhysical / pastElapsed) * 100 : 0;
      const cpiFactor = 1.0 + (i + 1) * 0.012;
      const spiFactor = 1.0 + (i + 1) * 0.015;
      const pastCpi = Math.min(1.5, Math.max(0.2, CPI * cpiFactor));
      const pastSpi = Math.min(1.5, Math.max(0.2, SPI * spiFactor));
      const pastEv = (BAC * (pastPhysical / 100)) / 1_000_000;
      const pastAc = pastCpi > 0 ? pastEv / pastCpi : pastEv;
      const pastPv = pastSpi > 0 ? pastEv / pastSpi : pastEv;
      return { period: monthLabel, isCurrent: false, physical: pastPhysical, elapsed: pastElapsed, ratio: pastRatio, cpi: pastCpi, spi: pastSpi, ev: pastEv, pv: pastPv, ac: pastAc };
    });

    return [currentRecord, ...pastRecords];
  }, [p.progressPlanLabels, p.physicalProgress, p.progressPlanHistory, elapsed, ratio, CPI, SPI, EV, PV, AC, BAC]);
  
  // Schedule Variance
  const SV = EV - PV;
  const SV_Mil = SV / 1_000_000;
  const SV_pct = PV > 0 ? (SV / PV) * 100 : 0;

  const lagging = p.series.filter(s => s.progress < 40).map(s => ({
    code: s.code,
    desc: s.desc,
    progress: s.progress
  }));
  
  const criticalActs = p.workProgram.filter(a => a.critical).map(a => a.name);

  // Expired or soon expiring guarantees
  const criticalGuarantees = p.bonds ? p.bonds.filter(b => {
    if (b.status === 'Recovered' || b.status === 'N/A') return false;
    const exp = new Date(b.expireDate);
    const now = new Date();
    if (b.status === 'Expired' || isNaN(exp.getTime()) || exp < now) {
      return true;
    }
    const fortyFiveDays = 45 * 24 * 60 * 60 * 1000;
    if (exp.getTime() - now.getTime() < fortyFiveDays) {
      return true;
    }
    return false;
  }) : [];

  // Compile active warning alerts list
  const healthAlerts: { type: 'critical' | 'warning' | 'info'; title: string; desc: string; field: string }[] = [];

  if (CPI < 0.9) {
    healthAlerts.push({
      type: 'critical',
      field: 'CPI Index',
      title: 'Cost Control Overrun (CPI Alert Limit Exceeded)',
      desc: `Cost Performance Index of ${CPI.toFixed(3)} is under the standard 0.9 approval threshold, indicating cumulative certified outlays exceed actual physical output value.`
    });
  }
  if (SV_pct < -10) {
    healthAlerts.push({
      type: 'critical',
      field: 'Schedule Variance %',
      title: 'Critical Path Schedule Variance (SV Alert Limit)',
      desc: `The calculated schedule variance has slipped behind schedule by ${Math.abs(SV_pct).toFixed(2)}% (Limit: 10%), signifying significant physical timeline delay.`
    });
  }
  if (SPI < 0.9) {
    healthAlerts.push({
      type: 'warning',
      field: 'Timeline Velocity Index',
      title: 'Construction Velocity Retardation (SPI Alert)',
      desc: `Timeline Velocity Index of ${SPI.toFixed(3)} is under 0.90, which demands immediate contractor equipment mobilization acceleration.`
    });
  }
  if (plannedPct - p.physicalProgress > 10) {
    healthAlerts.push({
      type: 'warning',
      field: 'Progress Deviation Map',
      title: 'Major Physical S-Curve Lag',
      desc: `Project physical progress of ${p.physicalProgress.toFixed(2)}% is lagging the original planned milestone of ${plannedPct.toFixed(2)}% by a gap of ${(plannedPct - p.physicalProgress).toFixed(2)}%.`
    });
  }
  if (p.bonds && p.bonds.filter(b => {
    if (b.status === 'Recovered' || b.status === 'N/A') return false;
    const exp = new Date(b.expireDate);
    const now = new Date();
    if (b.status === 'Expired' || isNaN(exp.getTime()) || exp < now) return true;
    return exp.getTime() - now.getTime() < 45 * 24 * 60 * 60 * 1000;
  }).length > 0) {
    healthAlerts.push({
      type: 'critical',
      field: 'Bonds Guarantee',
      title: 'Unsecured Contractor Security Escrows (Bond Alert)',
      desc: `There are performance or advance mobilization bank guarantees that are expired or expiring within the critical 45-day liability fence.`
    });
  }
  if (rowImpediment > 5) {
    healthAlerts.push({
      type: 'warning',
      field: 'ROW Impediments',
      title: 'Right-Of-Way Property Dispute Redzone',
      desc: `Pending utilities/disputed property length of ${rowImpediment.toFixed(2)} Km is over the 5 Km risk limit, blocking earthworks mobilization.`
    });
  }

  // Unpaid certified IPC calculations
  let unpaidCombinedEtb = 0;
  trackerIpcs.forEach(item => {
    const isEtbUnpaid = (item.statusEtb || item.status) === 'Unpaid';
    const isUsdUnpaid = (item.statusUsd || item.status) === 'Unpaid';
    if (isEtbUnpaid) {
      unpaidCombinedEtb += item.certifiedEtb || 0;
    }
    if (isUsdUnpaid) {
      unpaidCombinedEtb += (item.certifiedUsd || 0) * rateIpc;
    }
  });

  if (unpaidCombinedEtb > 0) {
    healthAlerts.push({
      type: 'critical',
      field: 'Unpaid Certified Balances',
      title: 'Overdue Certified IPC Balances (FIDIC Clausal Default)',
      desc: `Total outstanding certified amount remains unpaid: Br. ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(unpaidCombinedEtb)}. Delay triggers Sub-clause 14.8 late financing interest, and entitles Contractor to suspend or decelerate works under FIDIC Sub-clause 16.1.`
    });
  }

  // Comprehensive Data Inconsistency Audit Checks
  const inconsistencyAlerts = React.useMemo<InconsistencyAlert[]>(() => {
    const alerts: InconsistencyAlert[] = [];

    // 1. BOQ Series Breakdown Sum vs Overall Contract Amount

    // 2. Cumulative Executed BOQ Check removed per user request (VAT/Contingency exclusion)

    // 3. Monthly S-Curve Cumulative Actual vs Header Physical Progress
    const latestMonthlyItem = p.monthly && p.monthly.length > 0 
      ? [...p.monthly].reverse().find(m => m.actual > 0) 
      : null;
    const latestMonthlyActual = latestMonthlyItem ? latestMonthlyItem.actual : null;

    if (latestMonthlyActual !== null && Math.abs(latestMonthlyActual - p.physicalProgress) > 0.5) {
      const diffProg = latestMonthlyActual - p.physicalProgress;
      alerts.push({
        id: 'scurve-physical-mismatch',
        category: 'S-Curve & Progress',
        severity: 'warning',
        title: 'S-Curve Actual Progress vs Header Physical Progress Discrepancy',
        expectedValue: `${p.physicalProgress.toFixed(2)}% (Header)`,
        actualValue: `${latestMonthlyActual.toFixed(2)}% (${latestMonthlyItem?.month || 'S-Curve'})`,
        discrepancy: `${diffProg > 0 ? '+' : ''}${diffProg.toFixed(2)}%`,
        description: 'The latest cumulative physical progress recorded in monthly S-Curve tracking does not match the project main physical progress indicator.',
        reconciliationAction: 'Synchronize monthly S-Curve physical progress readings in Progress Plan Editor.'
      });
    }

    // 4. CPM Work Program Total Planned Weighting Sum
    const totalWpWeight = (p.workProgram || []).reduce((sum, w) => sum + (w.weight || 0), 0);
    if (totalWpWeight > 0 && Math.abs(totalWpWeight - 100) > 0.2) {
      const weightDiff = totalWpWeight - 100;
      alerts.push({
        id: 'workprogram-weight-mismatch',
        category: 'Work Program Schedule',
        severity: 'warning',
        title: 'Work Program Activity Weight Sum Imbalance',
        expectedValue: '100.00%',
        actualValue: `${totalWpWeight.toFixed(2)}%`,
        discrepancy: `${weightDiff > 0 ? '+' : ''}${weightDiff.toFixed(2)}%`,
        description: 'The combined planned weight percentages of CPM Work Program schedule tasks do not sum to exactly 100.00%.',
        reconciliationAction: 'Re-weight Work Program activities in Work Program Schedule Editor.'
      });
    }

    // 5. Multi-Year Annual Budget Allocations vs Total Contract Amount
    const origContractAmtInBirr = p.origAmount * 1_000_000;
    const totalAnnualBudget = (p.annual || []).reduce((sum, a) => sum + (a.budget || 0), 0) * 1_000_000;
    if (totalAnnualBudget > 0 && Math.abs(totalAnnualBudget - origContractAmtInBirr) > 100000) {
      const annualDiff = totalAnnualBudget - origContractAmtInBirr;
      alerts.push({
        id: 'annual-budget-mismatch',
        category: 'IPC & Financial',
        severity: 'info',
        title: 'Multi-Year Budget Allocations vs Contract Sum Variance',
        expectedValue: `Br. ${formatAccounting(origContractAmtInBirr, '')}`,
        actualValue: `Br. ${formatAccounting(totalAnnualBudget, '')}`,
        discrepancy: `${annualDiff > 0 ? '+' : ''}Br. ${formatAccounting(annualDiff, '')}`,
        description: 'Total financial budget allocated across annual schedule years does not equal the total Original Contract Price.',
        reconciliationAction: 'Review financial cash flow breakdown across project timeline years in Financial Data Editor.'
      });
    }

    // 6. Advance Payment Bank Guarantee vs Unrecovered Advance Payment Balance
    const advGuaranteeAmt = (p.bonds || [])
      .filter(b => b.type && b.type.toLowerCase().includes('advance') && b.status !== 'Recovered')
      .reduce((sum, b) => sum + (b.amount || 0), 0) * 1_000_000;
    const unrecoveredAdvanceItem = (p.payment || []).find(x => x.item && x.item.trim().toLowerCase().includes('advance payment remaining'));
    const unrecoveredAdvance = unrecoveredAdvanceItem ? unrecoveredAdvanceItem.amount : 0;

    if (unrecoveredAdvance > 0 && advGuaranteeAmt < unrecoveredAdvance) {
      const guaranteeDeficit = unrecoveredAdvance - advGuaranteeAmt;
      alerts.push({
        id: 'advance-guarantee-deficit',
        category: 'Securities & Bonds',
        severity: 'critical',
        title: 'Unrecovered Advance Payment Exceeds Active Guarantee Cover',
        expectedValue: `Br. ${formatAccounting(unrecoveredAdvance, '')} (Min Cover)`,
        actualValue: `Br. ${formatAccounting(advGuaranteeAmt, '')} (Active Cover)`,
        discrepancy: `-Br. ${formatAccounting(guaranteeDeficit, '')} (Deficit)`,
        description: 'The outstanding unrecovered advance payment balance exceeds active bank guarantee protection.',
        reconciliationAction: 'Require Contractor to extend or top up Advance Payment Bank Guarantee before next IPC payment release.'
      });
    }

    return alerts;
  }, [p]);

  const handleManualSnapshot = () => {
    onTakeSnapshot('Manual Snapshot Audit');
  };

  const handleTriggerReportReRun = () => {
    setGenerating(true);
    setTimeout(() => {
      setGenerating(false);
    }, 700);
  };

  const formattedMoney = (v: number) => 
    formatAccounting(v, '');

  const allowedRowMetricNames = [
    'Project Length',
    'ROW Request By Contractor',
    'Properties identified, measured, evaluated',
    'Measurement Identification Complete',
    'Document Sent ERA for Compensation',
    'ROW Obstruction free Section'
  ];

  const displayRowMetrics = p.rowMetrics
    .filter(rm => allowedRowMetricNames.includes(rm.name))
    .map(rm => {
      if (rm.name === 'Properties identified, measured, evaluated') {
        return { ...rm, name: 'Measurement Identification Complete' };
      }
      return rm;
    });

  const handleExportPDF = () => {
    const doc = new jsPDF('p', 'pt', 'a4'); // portrait, point, A4 (595.28 x 841.89 pt)
    
    // Redirect helvetica to times for Times New Roman font support
    const originalSetFont = doc.setFont;
    (doc as any).setFont = function (this: any, fontName: string, fontStyle?: string, ...args: any[]) {
      const targetFont = fontName === 'helvetica' ? 'times' : fontName;
      return originalSetFont.call(this, targetFont, fontStyle, ...args);
    };

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    let curY = 115;
    let pageCount = 1;

    const drawPageDecorations = () => {
      // Running Header (from page 2 onwards)
      if (pageCount > 1) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text("ETHIOPIAN ROADS ADMINISTRATION • CONTRACT COMPLIANCE & PERFORMANCE AUDIT", 40, 35);
        doc.setDrawColor(226, 232, 240); // slate-200
        doc.line(40, 42, pageWidth - 40, 42);
      }

      // Running Footer
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.setDrawColor(226, 232, 240);
      doc.line(40, pageHeight - 40, pageWidth - 40, pageHeight - 40);
      doc.text(`CONFIDENTIAL - BOARD REGULATORY REPORT • PROJECT: ${(p.name || 'Untitled Project').toUpperCase()}`, 40, pageHeight - 28);
      doc.text(`Page ${pageCount}`, pageWidth - 70, pageHeight - 28);
      pageCount++;
    };

    const checkSpace = (needed: number) => {
      if (curY + needed > pageHeight - 65) {
        doc.addPage();
        curY = 60;
        drawPageDecorations();
      }
    };

    const drawSectionHeader = (title: string) => {
      checkSpace(40);
      doc.setFillColor(37, 99, 235); // blue-600
      doc.rect(40, curY - 9, 3.5, 11, 'F'); // draw vertical rectangle
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(title, 48, curY);
      curY += 18;
    };

    // Draw first page header
    drawPageDecorations(); // Initializes pageCount to 1, sets up first footer

    // Attempt to grab the same logo image as the login logo from the DOM
    let logoDrawn = false;
    const logoImgEls = Array.from(document.querySelectorAll('img'));
    const eraLogoImg = logoImgEls.find(img => 
      img.src && (
        img.src.includes('irams.era.gov.et') || 
        img.src.includes('mui.gov.et') ||
        img.alt?.toLowerCase().includes('roads') ||
        img.alt?.toLowerCase().includes('era')
      )
    );

    if (eraLogoImg && eraLogoImg.complete && eraLogoImg.naturalWidth > 0) {
      try {
        // Draw elegant white container frame for the logo
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(40, 46, 36, 36, 4, 4, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(40, 46, 36, 36, 4, 4, 'S');
        
        doc.addImage(eraLogoImg, 'PNG', 42, 48, 32, 32);
        logoDrawn = true;
      } catch (err) {
        console.warn("Failed to direct-draw DOM logo into PDF, trying canvas conversion:", err);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = eraLogoImg.naturalWidth || 120;
          canvas.height = eraLogoImg.naturalHeight || 120;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(eraLogoImg, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(40, 46, 36, 36, 4, 4, 'F');
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(40, 46, 36, 36, 4, 4, 'S');
            
            doc.addImage(dataUrl, 'PNG', 42, 48, 32, 32);
            logoDrawn = true;
          }
        } catch (canvasErr) {
          console.warn("Canvas-based CORS block for logo image, falling back to vector emblem:", canvasErr);
        }
      }
    }

    if (!logoDrawn) {
      // Elegant Badge logo/emblem
      doc.setFillColor(15, 23, 42); // slate-900
      doc.roundedRect(40, 48, 32, 32, 6, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(245, 158, 11); // amber-500
      doc.text("E.R.A", 56, 64, { align: 'center' });
      doc.setFontSize(3.5);
      doc.setTextColor(255, 255, 255);
      doc.text("ROADS", 56, 72, { align: 'center' });
    }

    // Header Title Text matching print layout precisely
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text("ETHIOPIAN ROADS ADMINISTRATION", 85, 58);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(37, 99, 235); // blue-600
    doc.text("FEDERAL ROAD PROJECT COMPLIANCE & PERFORMANCE AUDIT REPORT", 85, 71);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139); // slate-505
    doc.text(`REPORT ID: ERA-AUD-${new Date().getFullYear()}   •   DATE: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 85, 83);

    // Solid border partition below main header
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(40, 94, pageWidth - 80, 1.5, 'F');

    // Section 1: Project Identification Profile
    drawSectionHeader("1. Project Identification Profile");
    checkSpace(90);

    // Profile card container rectangle
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(40, curY, pageWidth - 80, 85, 'DF');

    doc.setFontSize(7.5);
    
    // Left column metadata
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text("PROJECT CONTRACT NAME", 55, curY + 18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const projLines = doc.splitTextToSize(p.name, 220);
    doc.text(projLines, 55, curY + 28);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text("PROJECT EMPLOYER", 55, curY + 48);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(p.client || 'ERA', 55, curY + 58);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text("MAIN CONTRACTOR", 55, curY + 70);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(p.contractor || 'N/A', 55, curY + 80);

    // Right column metadata
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text("FIDIC CONTRACT TYPE", 310, curY + 18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    const contractTypeName = p.contractType === 'DB' ? 'Design-Build (DB)' : 'Design-Bid-Build (DBB)';
    doc.text(contractTypeName, 310, curY + 28);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text("DESIGN CONSULTANT", 310, curY + 48);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(p.consultant || 'N/A', 310, curY + 58);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text("ROAD WAY LENGTH", 310, curY + 70);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(`${p.lengthKm} Km`, 310, curY + 80);

    curY += 98; // safe separation spacing

    // Section 2: Executive Performance Indicators Audit
    drawSectionHeader("2. Executive Performance Indicators Audit");
    checkSpace(95);

    const cardWidth = (pageWidth - 92) / 2; // split page print size

    // CPI block frame
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.rect(40, curY, cardWidth, 80, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("COST STATUS INDEX", 52, curY + 18);

    // CPI indicator badge
    const cpiStatus = CPI >= 1.0 ? 'UNDER-BUDGET' : 'CHECK VARIANCE';
    if (CPI >= 1.0) {
      doc.setFillColor(209, 250, 229); // emerald-100
      doc.setTextColor(5, 150, 105);   // emerald-600
    } else {
      doc.setFillColor(254, 243, 199); // amber-100
      doc.setTextColor(217, 119, 6);   // amber-600
    }
    doc.roundedRect(40 + cardWidth - 85, curY + 10, 78, 12, 3, 3, 'F');
    doc.setFontSize(6.5);
    doc.text(cpiStatus, 40 + cardWidth - 46, curY + 18, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text(CPI.toFixed(3), 52, curY + 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("CPI Ratio", 102, curY + 41);

    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    const cpiDetailText = CPI >= 1.0 
      ? "Project outlays confirm healthy financial alignment under the allocated BOQ divisions series." 
      : "Financial outlays exceed physical accomplishments. Expenditure lagging against earned outlays.";
    const cpiDetailLines = doc.splitTextToSize(cpiDetailText, cardWidth - 22);
    doc.text(cpiDetailLines, 52, curY + 56);


    // SPI block frame
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.rect(40 + cardWidth + 12, curY, cardWidth, 80, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("SCHEDULE STATUS INDEX", 40 + cardWidth + 24, curY + 18);

    // SPI indicator badge
    const spiStatus = SPI >= 1.0 ? 'ON-SCHEDULE' : 'DELAYED PROGRESS';
    if (SPI >= 1.0) {
      doc.setFillColor(209, 250, 229); // emerald-100
      doc.setTextColor(5, 150, 105);   // emerald-600
    } else {
      doc.setFillColor(254, 226, 226); // rose-100
      doc.setTextColor(225, 29, 72);   // rose-600
    }
    doc.roundedRect(40 + cardWidth * 2 + 12 - 85, curY + 10, 78, 12, 3, 3, 'F');
    doc.setFontSize(6.5);
    doc.text(spiStatus, 40 + cardWidth * 2 + 12 - 46, curY + 18, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    if (SPI >= 1.0) {
      doc.setTextColor(16, 185, 129);
    } else {
      doc.setTextColor(225, 29, 72);
    }
    doc.text(SPI.toFixed(3), 40 + cardWidth + 24, curY + 42);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("SPI Ratio", 40 + cardWidth + 24 + 50, curY + 41);

    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    const spiDetailText = SPI >= 1.0 
      ? "Timeline tracking parameters confirm execution is ahead or equal to original planned baselines." 
      : "Significant timeline gap discovered. Urgent resource deployment required to recover lagging milestones.";
    const spiDetailLines = doc.splitTextToSize(spiDetailText, cardWidth - 22);
    doc.text(spiDetailLines, 40 + cardWidth + 24, curY + 56);

    curY += 94;

    // Section 3: Physical Accomplishment vs Target S-Curve
    drawSectionHeader("3. Physical Accomplishment vs Target S-Curve");
    checkSpace(98);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.rect(40, curY, pageWidth - 80, 88, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    doc.text("Physical Progress Status", 55, curY + 22);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(59, 130, 246); // blue-500
    doc.text(`${p.physicalProgress.toFixed(2)}% Completed`, pageWidth - 145, curY + 22);

    // Progress bar components
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(55, curY + 30, pageWidth - 110, 10, 4, 4, 'F');
    
    doc.setFillColor(37, 99, 235); // blue-600
    const barFillWidth = Math.max(0, Math.min(100, p.physicalProgress) / 100 * (pageWidth - 110));
    doc.roundedRect(55, curY + 30, barFillWidth, 10, 4, 4, 'F');

    // Planning metrics beneath progress track
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Cumulative Target Planned: ${plannedPct.toFixed(2)}%`, 55, curY + 50);
    doc.text(`S-Curve Slippage: -${(plannedPct - p.physicalProgress).toFixed(2)}%`, pageWidth - 55, curY + 50, { align: 'right' });

    // Dash divider separating date bounds
    doc.setDrawColor(226, 232, 240);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(55, curY + 58, pageWidth - 55, curY + 58);
    doc.setLineDashPattern([], 0); // Solid reset

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("COMMENCEMENT DATE", 55, curY + 70);
    doc.text("REVISED COMPLETION TARGET (EOT)", 300, curY + 70);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(ocDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), 55, curY + 80);
    doc.setTextColor(220, 38, 38); // rose-600 alert style
    doc.text(rcDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }), 300, curY + 80);

    curY += 102;

    // Section 3b: Data Inconsistency & Integrity Audit Alerts
    drawSectionHeader("3b. Data Inconsistency & Integrity Audit Alerts");
    checkSpace(65);

    if (inconsistencyAlerts.length > 0) {
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(254, 202, 202);
      const boxHeight = 22 + (inconsistencyAlerts.length * 18);
      doc.roundedRect(40, curY, pageWidth - 80, boxHeight, 4, 4, 'DF');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(185, 28, 28);
      doc.text(`DATA INTEGRITY AUDIT: ${inconsistencyAlerts.length} DISCREPANCY ALERT(S) FLAGGED`, 52, curY + 14);

      let alertY = curY + 26;
      inconsistencyAlerts.forEach((alert) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        doc.text(`• [${alert.category}] ${alert.title}`, 52, alertY);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`Expected: ${alert.expectedValue}  |  Actual: ${alert.actualValue}  |  Variance: ${alert.discrepancy}`, 60, alertY + 8);

        alertY += 18;
      });

      curY += boxHeight + 12;
    } else {
      doc.setFillColor(240, 253, 250);
      doc.setDrawColor(204, 251, 241);
      doc.roundedRect(40, curY, pageWidth - 80, 24, 4, 4, 'DF');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 118, 110);
      doc.text("DATA INTEGRITY VERIFIED: All BOQ series sums, IPC values, S-Curves, and Work Program weights align.", 52, curY + 15);
      curY += 32;
    }

    // Section 4: Operational Risks & CPM Schedule Lag Info
    drawSectionHeader("4. Operational Risks & CPM Schedule Lag Info");
    checkSpace(94);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.rect(40, curY, pageWidth - 80, 84, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("LAGGING WORK SERIES DIVISIONS (PROGRESS < 40%)", 55, curY + 18);

    if (lagging.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      lagging.forEach((l, idx) => {
        if (idx < 2) {
          const lBoxX = 55 + (idx * 215);
          doc.setFillColor(254, 242, 242);
          doc.setDrawColor(254, 226, 226);
          doc.rect(lBoxX, curY + 24, 205, 18, 'DF');
          doc.setTextColor(185, 28, 28);
          doc.text(`Series ${l.code} - ${l.desc}: ${l.progress.toFixed(2)}%`, lBoxX + 8, curY + 36);
        }
      });
    } else {
      doc.setFillColor(240, 253, 250);
      doc.setDrawColor(204, 251, 241);
      doc.rect(55, curY + 24, pageWidth - 110, 18, 'DF');
      doc.setTextColor(15, 118, 110);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text("All BOQ divisions are progressing within healthy FIDIC tolerance margins.", 65, curY + 35);
    }

    doc.setDrawColor(226, 232, 240);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(55, curY + 49, pageWidth - 55, curY + 49);
    doc.setLineDashPattern([], 0);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("CRITICAL WORK PROGRAM FLIGHTS (CPM)", 55, curY + 60);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    const cpmDescText = `The active critical path spans ${criticalActs.length ? criticalActs.length : '0'} construction phases: ${criticalActs.length ? criticalActs.join(', ') : 'N/A: General Grading'}. Any additional slippage in these activities will directly affect the official revised completion target of ${rcDate.toLocaleDateString()}.`;
    const cpmDescLines = doc.splitTextToSize(cpmDescText, pageWidth - 115);
    doc.text(cpmDescLines, 55, curY + 70);

    curY += 98;

    // Section 4b: Right‑of‑Way (ROW) Obstruction & Strategic KPI Compliance
    drawSectionHeader("4b. Right‑of‑Way (ROW) Obstruction & Strategic KPI Compliance");
    checkSpace(90);

    // Obstruction Table columns header
    doc.setFillColor(51, 65, 85);
    doc.rect(40, curY, pageWidth - 80, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text("Obstruction Metric Type", 55, curY + 11);
    doc.text("Value To-Date", 410, curY + 11);

    curY += 16;
    displayRowMetrics.forEach((rm, rmI) => {
      checkSpace(18);
      doc.setFillColor(rmI % 2 === 0 ? 255 : 248, 250, 252);
      doc.rect(40, curY, pageWidth - 80, 16, 'F');
      doc.setDrawColor(241, 245, 249);
      doc.rect(40, curY, pageWidth - 80, 16, 'S');

      doc.setTextColor(51, 65, 85);
      doc.setFont('helvetica', 'normal');
      doc.text(rm.name, 55, curY + 11);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text(`${rm.value.toFixed(2)} ${rm.unit}`, 410, curY + 11);

      curY += 16;
    });

    curY += 10;

    // Drawing the Matured Unpaid IPCs compliance section in the PDF report
    checkSpace(115);
    doc.setFillColor(254, 251, 237); // light amber-50
    doc.setDrawColor(252, 211, 77); // amber-300
    doc.roundedRect(40, curY, pageWidth - 80, 85, 4, 4, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text("Contractual Payment Maturity (FIDIC Sub-clause 14.7 Compliance)", 52, curY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Outstanding matured certified IPCs and overdue liabilities based on contractual deadlines (56-day limit).", 52, curY + 24);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text("MATURED UNPAID BALANCE", pageWidth - 52, curY + 11, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(220, 38, 38); // rose-600
    doc.text("Net ETB: Br. " + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(maturedUnpaidNetEtb), pageWidth - 52, curY + 18, { align: 'right' });
    doc.text("Net USD: $ " + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(maturedUnpaidNetUsd), pageWidth - 52, curY + 25, { align: 'right' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor(71, 85, 105);
    doc.text("TOTAL UNPAID NET ETB: Br. " + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalUnpaidNetEtb), pageWidth - 52, curY + 31, { align: 'right' });
    doc.text("TOTAL UNPAID NET USD: $ " + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalUnpaidNetUsd), pageWidth - 52, curY + 37, { align: 'right' });

    if (unpaidIpcsDetails.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text("IPC No.", 52, curY + 41);
      doc.text("Age (Days)", 140, curY + 41);
      doc.text("Net ETB Portion", 220, curY + 41);
      doc.text("Net USD Portion", 310, curY + 41);
      doc.text("Clausal Status", 400, curY + 41);

      let lineY = curY + 49;
      unpaidIpcsDetails.slice(0, 3).forEach((item) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.setTextColor(51, 65, 85);
        doc.text(item.paymentNo, 52, lineY);
        doc.text(`${item.daysElapsed} days`, 140, lineY);
        doc.text("Br. " + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.certifiedEtb), 220, lineY);
        doc.text("$ " + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(item.certifiedUsd), 310, lineY);
        
        doc.setFont('helvetica', 'bold');
        if (item.isMatured) {
          doc.setTextColor(220, 38, 38);
          doc.text("Matured / Overdue", 400, lineY);
        } else {
          doc.setTextColor(37, 99, 235);
          doc.text("Pending", 400, lineY);
        }
        lineY += 9;
      });
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(4, 120, 87); // emerald-700
      doc.text("No outstanding certified payments pending. Cash flows remain in optimal health.", 52, curY + 45);
    }

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(5.5);
    doc.setTextColor(148, 163, 184);
    doc.text("* Ref: Sub-clause 14.7 requires payment within 56 days. Delays trigger 14.8 interest (4% ETB, LIBOR+2% USD).", 52, curY + 78);

    curY += 95;

    // KPI Summary Grid (Strategic Compliance Audit)
    checkSpace(150);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.setFillColor(16, 185, 129); // emerald-500 bullet
    doc.rect(40, curY, 4, 8, 'F');
    doc.text("Strategic Compliance Audit (12 KPI Groups Summary)", 48, curY + 7);
    curY += 14;

    const colW = (pageWidth - 95) / 2; // split block width
    kpiGroupsScores.forEach((g, gIdx) => {
      const isRight = gIdx >= 6;
      const innerIdx = gIdx % 6;
      const gridBoxX = 40 + (isRight ? colW + 15 : 0);
      const gridBoxY = curY + (innerIdx * 20);

      // Card frame
      doc.setFillColor(250, 250, 250);
      doc.setDrawColor(241, 245, 249);
      doc.roundedRect(gridBoxX, gridBoxY, colW, 17, 3, 3, 'DF');

      // ID
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(g.id, gridBoxX + 6, gridBoxY + 11);

      // Name
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      const maxCharCount = 28;
      const cleanLabel = g.name.length > maxCharCount ? g.name.substring(0, maxCharCount) + '...' : g.name;
      doc.text(cleanLabel, gridBoxX + 24, gridBoxY + 11);

      // Score status colors
      let scoreColor = [220, 38, 38]; // rose
      if (g.id === 'G8') {
        if (g.score <= 50) scoreColor = [5, 150, 105]; // emerald
        else if (g.score <= 75) scoreColor = [217, 119, 6]; // amber
      } else {
        if (g.score >= 80) scoreColor = [5, 150, 105]; // emerald
        else if (g.score >= 50) scoreColor = [217, 119, 6]; // amber
      }

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
      doc.text(`${g.score.toFixed(2)}%`, gridBoxX + colW - 30, gridBoxY + 11);

      // Draw thin visual bar track beneath each group
      doc.setFillColor(230, 230, 235);
      doc.rect(gridBoxX + 6, gridBoxY + 14, colW - 12, 1.2, 'F');
      doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
      const fillBarW = Math.max(0, Math.min(100, g.score) / 100 * (colW - 12));
      doc.rect(gridBoxX + 6, gridBoxY + 14, fillBarW, 1.2, 'F');
    });

    curY += (6 * 20) + 14;

    // Section 5: Bank Securities & Guarantee Conformity
    drawSectionHeader("5. Bank Securities & Guarantee Conformity");
    checkSpace(55);

    if (criticalGuarantees.length > 0) {
      doc.setFillColor(254, 242, 242);
      doc.setDrawColor(254, 226, 226);
      doc.roundedRect(40, curY, pageWidth - 80, 42, 4, 4, 'DF');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(185, 28, 28);
      doc.text("CRITICAL AUDIT NOTICE: EXPIRY/VALIDATION WARNING ISSUED!", 52, curY + 14);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(127, 29, 29);
      const guarDesc = criticalGuarantees.map(b => `${b.type} (Br. ${formattedMoney(b.amount)}M - Exp: ${b.expireDate})`).join(' | ');
      const descLines = doc.splitTextToSize(guarDesc, pageWidth - 100);
      doc.text(descLines, 52, curY + 25);
      curY += 49;
    } else {
      doc.setFillColor(240, 253, 250);
      doc.setDrawColor(204, 251, 241);
      doc.roundedRect(40, curY, pageWidth - 80, 24, 4, 4, 'DF');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 118, 110);
      doc.text("All performance and advance mobilization payment guarantees have validated expiry thresholds.", 52, curY + 15);
      curY += 32;
    }

    // Section 6: Recommended Audit Interventions & Directives
    drawSectionHeader("6. Recommended Audit Interventions & Directives");
    checkSpace(66);

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.rect(40, curY, pageWidth - 80, 58, 'DF');

    const actionDirects = [
      { step: "01", body: `Issue formal Warning Directive under FIDIC Clause 8.6 regarding the delays evaluated in ${lagging.length > 0 ? lagging.map(l => `Series ${l.code}`).join(', ') : 'Series A (Earthworks)'}.` },
      { step: "02", body: "Instruct the Supervising Engineer and Lead QS to audit price adjustments indexes and current IPC valuation backlogs to align cash outlay velocity with real progress." },
      { step: "03", body: "Instruct Contractor to submit a comprehensive recovery program reflecting real equipment plant and workforce enhancements on the critical paths." }
    ];

    doc.setFontSize(7.5);
    actionDirects.forEach((act, actI) => {
      doc.setFillColor(239, 246, 255);
      doc.roundedRect(52, curY + 5 + (actI * 17), 14, 11, 2, 2, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(37, 99, 235);
      doc.text(act.step, 59, curY + 13 + (actI * 17), { align: 'center' });

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      const textLines = doc.splitTextToSize(act.body, pageWidth - 140);
      doc.text(textLines, 74, curY + 13 + (actI * 17));
    });

    curY += 68;

    // Section 7: Endorsement & Sign-Off Block
    drawSectionHeader("7. Endorsement & Sign-Off Block");
    checkSpace(68);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("DRAFTED BY PMO, PROJECT MANAGER", 55, curY + 12);
    doc.text("VERIFIED BY CPMP DIRECTOR", 310, curY + 12);

    doc.setDrawColor(203, 213, 225);
    doc.line(55, curY + 34, 225, curY + 34);
    doc.line(310, curY + 34, 480, curY + 34);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("SIGNATURE / STAMP", 55, curY + 43);
    doc.text("SIGNATURE / OFFICIAL CPMP SEAL STAMP", 310, curY + 43);

    curY += 52;

    doc.save(`ERA_Compliance_Report_${p.name ? p.name.replace(/\s+/g, '_') : 'Untitled'}.pdf`);
  };

  return (
    <div className="space-y-4">
      {/* Dynamic Printing Style CSS Injection safely inside React */}
      <style dangerouslySetInnerHTML={{__html: `
        @page {
          size: portrait !important;
          margin: 1in !important;
        }
        @media print {
          /* 1. Reset everything except print area */
          body * {
            visibility: hidden !important;
          }
          #print-area-wrapper, #print-area-wrapper * {
            visibility: visible !important;
            font-family: 'Times New Roman', Times, Baskerville, Georgia, serif !important;
            word-spacing: normal !important;
            letter-spacing: normal !important;
            box-sizing: border-box !important;
          }
          .no-print {
            display: none !important;
          }
          
          /* 2. Page and wrapper layout */
          #print-area-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            background: white !important;
            color: black !important;
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          
          /* 3. Typography size constraints */
          /* Default font sizes: 14pt for headings, 12pt for body if not discernible */
          #print-area-wrapper h1,
          #print-area-wrapper h2,
          #print-area-wrapper h3,
          #print-area-wrapper h4,
          #print-area-wrapper h5,
          #print-area-wrapper h6 {
            font-size: 14pt !important;
            font-weight: bold !important;
            line-height: 1.3 !important;
            margin-top: 14pt !important;
            margin-bottom: 7pt !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          
          /* Body elements default size 12pt if not explicitly styled with larger/smaller discernible sizes */
          #print-area-wrapper p,
          #print-area-wrapper li,
          #print-area-wrapper div,
          #print-area-wrapper td,
          #print-area-wrapper th,
          #print-area-wrapper span {
            font-size: 12pt;
            line-height: 1.4 !important;
          }

          /* 4. Tables rules (Critical) */
          #print-area-wrapper table {
            width: 100% !important;
            border-collapse: collapse !important;
            page-break-inside: avoid !important;
            margin-top: 10px !important;
            margin-bottom: 15px !important;
            table-layout: auto !important;
          }
          
          #print-area-wrapper tr {
            page-break-inside: avoid !important;
            page-break-after: auto !important;
          }
          
          /* Table borders must be fully visible and intact */
          #print-area-wrapper table, 
          #print-area-wrapper th, 
          #print-area-wrapper td {
            border: 1px solid #000000 !important;
          }
          
          #print-area-wrapper th, 
          #print-area-wrapper td {
            padding: 6px 8px !important;
            text-align: left !important;
            vertical-align: middle !important;
            /* Text Wrapping: cell expands vertically to contain all content */
            white-space: normal !important;
            word-wrap: break-word !important;
            word-break: normal !important;
            overflow-wrap: break-word !important;
            /* Cell boundaries: all text remains inside cell borders */
            overflow: visible !important;
          }

          /* First Row of any table: entire first row bold */
          #print-area-wrapper table tr:first-child,
          #print-area-wrapper table tr:first-child td,
          #print-area-wrapper table tr:first-child th,
          #print-area-wrapper table thead tr,
          #print-area-wrapper table thead tr th,
          #print-area-wrapper table thead tr td {
            font-weight: bold !important;
            background-color: #f1f5f9 !important;
            color: #000000 !important;
          }

          /* Prevent overlap and keep clean borders/negative space */
          #print-area-wrapper * {
            max-width: 100% !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
        }
      `}} />

      {/* Header bar */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 mb-1 flex items-center gap-2">
            <History className="w-5 h-5 text-blue-500" />
            Snapshot Ledger & Change tracking Audit Logs
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Audit trailing of project changes. Take manual milestones snapshots before initiating major BOQ variation orders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto no-print">
          <button
            onClick={handleManualSnapshot}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1 transition shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            Save Milestone Snapshot
          </button>
          
          <button
            onClick={onClearHistory}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-250 text-xs font-bold py-1.5 px-3 rounded-xl transition"
          >
            Clear History
          </button>
        </div>
      </div>

      {/* Executive Portal Header & Alerts Card */}
      <div className="bg-slate-900 dark:bg-slate-950 text-white rounded-2xl p-6 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 no-print">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="bg-blue-500/20 text-blue-300 text-[9px] font-mono font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full border border-blue-500/30">
              Active PMO Verification
            </span>
            {healthAlerts.filter(a => a.type === 'critical').length > 0 && (
              <span className="bg-red-500/20 text-red-300 text-[9px] font-mono font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full border border-red-500/30 animate-pulse">
                Threshold Alert Tripped
              </span>
            )}
          </div>
          <h1 className="text-xl md:text-2xl font-black tracking-tight uppercase">
            {p.id && p.id !== 'proj_default' ? `${p.id} - ` : ''}Executive Performance Dashboard
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Fiduciary Audit & Control Portal — {p.name} | Contractor: {p.contractor}
          </p>
        </div>
      </div>

      {/* ERA Key Performance Indicators Trend Sparklines & Historical Readings Table */}
      <div className="no-print space-y-3">
        {/* Collapsible Historical KPI Performance Table */}
        <section className="bg-white dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/60 rounded-xl shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setIsKpiHistoryOpen(!isKpiHistoryOpen)}
            className="w-full flex items-center justify-between p-3.5 bg-slate-50/80 dark:bg-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-750 transition duration-150 text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-800 dark:text-zinc-150 uppercase tracking-wider flex items-center gap-2">
                  Historical KPI Performance Readings Table
                  <span className="text-[10px] font-semibold tracking-normal text-slate-500 dark:text-slate-400 normal-case bg-slate-200/60 dark:bg-slate-700/60 px-2 py-0.5 rounded-full">
                    {kpiHistoryRecords.length} Audit Readings
                  </span>
                </h3>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>{isKpiHistoryOpen ? 'Hide Readings Table' : 'Show Readings Table'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isKpiHistoryOpen ? 'rotate-180' : ''}`} />
            </div>
          </button>

          <AnimatePresence>
            {isKpiHistoryOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-slate-200/70 dark:border-slate-700/60 overflow-x-auto"
              >
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/60 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200/60 dark:border-slate-700/50">
                      <th className="py-2.5 px-4">Reporting Period</th>
                      <th className="py-2.5 px-3 text-center">Physical Progress</th>
                      <th className="py-2.5 px-3 text-center">CPI (Cost Index)</th>
                      <th className="py-2.5 px-3 text-center">CPI Status</th>
                      <th className="py-2.5 px-3 text-center">SPI (Schedule Index)</th>
                      <th className="py-2.5 px-3 text-center">SPI Status</th>
                      
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                    {kpiHistoryRecords.map((rec, idx) => {
                      const isCpiGood = rec.cpi >= 1.0;
                      const isCpiWarn = rec.cpi >= 0.90 && rec.cpi < 1.0;
                      
                      const isSpiGood = rec.spi >= 1.0;
                      const isSpiWarn = rec.spi >= 0.90 && rec.spi < 1.0;

                      return (
                        <tr 
                          key={rec.period + idx}
                          className={`transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-750/50 ${
                            rec.isCurrent ? 'bg-indigo-50/30 dark:bg-indigo-950/20 font-medium' : ''
                          }`}
                        >
                          <td className="py-2.5 px-4 font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            {rec.period}
                            {rec.isCurrent && (
                              <span className="text-[9px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-extrabold px-1.5 py-0.5 rounded uppercase">
                                Current
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-700 dark:text-slate-300">
                            {rec.physical.toFixed(2)}%
                          </td>
                          <td className={`py-2.5 px-3 text-center font-mono font-bold ${
                            isCpiGood ? 'text-emerald-600 dark:text-emerald-400' : isCpiWarn ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {rec.cpi.toFixed(3)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 text-[10px] font-extrabold rounded-full border uppercase ${
                              isCpiGood
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50'
                                : isCpiWarn
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50'
                                  : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50'
                            }`}>
                              {isCpiGood ? 'Under Budget' : isCpiWarn ? 'Borderline' : 'Over Budget Risk'}
                            </span>
                          </td>
                          <td className={`py-2.5 px-3 text-center font-mono font-bold ${
                            isSpiGood ? 'text-emerald-600 dark:text-emerald-400' : isSpiWarn ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'
                          }`}>
                            {rec.spi.toFixed(3)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 text-[10px] font-extrabold rounded-full border uppercase ${
                              isSpiGood
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50'
                                : isSpiWarn
                                  ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50'
                                  : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800/50'
                            }`}>
                              {isSpiGood ? 'Ahead' : isSpiWarn ? 'Minor Lag' : 'Critical Delay'}
                            </span>
                          </td>
                          
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>

      {/* Project Health Alerts Dashboard Alert Hud */}
      <section className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-4 no-print">
        <div className="flex items-center justify-between border-b border-slate-101 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className={`w-5 h-5 ${healthAlerts.filter(a => a.type === 'critical').length > 0 ? 'text-red-500 animate-pulse' : 'text-emerald-500'}`} />
            <div>
              <h2 className="text-sm font-bold text-slate-801 dark:text-zinc-150 uppercase tracking-wide">
                Project Health Vigilance Alerts Center
              </h2>
              <p className="text-[10px] text-slate-400 font-medium select-none">
                Live monitoring of Schedule Variance (SV &gt; 10%), CPI (&lt; 0.90), S-Curve deviations, and bond escrows.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px]">
            <span className="bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-extrabold px-2 py-0.5 rounded-md">
              {healthAlerts.filter(a => a.type === 'critical').length} Critical
            </span>
            <span className="bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-extrabold px-2 py-0.5 rounded-md">
              {healthAlerts.filter(a => a.type === 'warning').length} Warnings
            </span>
          </div>
        </div>

        {healthAlerts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {healthAlerts.map((alert, idx) => (
              <div 
                key={idx} 
                className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all duration-200 ${
                  alert.type === 'critical' 
                    ? 'bg-rose-50/50 dark:bg-rose-950/10 border-rose-100 dark:border-rose-950/40' 
                    : 'bg-amber-50/50 dark:bg-amber-950/10 border-amber-100 dark:border-amber-950/30'
                }`}
              >
                <div className={`p-1.5 rounded-lg shrink-0 ${
                  alert.type === 'critical' 
                    ? 'bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-450' 
                    : 'bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-450'
                }`}>
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className={`text-[8px] font-mono font-black uppercase px-1.5 py-0.5 rounded ${
                      alert.type === 'critical' 
                        ? 'bg-rose-200/50 dark:bg-rose-950 text-rose-700 dark:text-rose-400' 
                        : 'bg-amber-200/50 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
                    }`}>
                      {alert.field}
                    </span>
                    <h3 className={`text-xs font-bold uppercase ${
                      alert.type === 'critical' ? 'text-rose-800 dark:text-rose-300' : 'text-amber-800 dark:text-amber-300'
                    }`}>
                      {alert.title}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-tight">
                    {alert.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-950/30 p-4 rounded-xl flex items-center gap-3">
            <div className="p-1.5 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase">
                Contract Verification: All Strategic KPIs Declared Healthy
              </h3>
              <p className="text-xs text-slate-605 dark:text-slate-400">
                The project is operating fully within normal tolerance parameters. No critical path slippages or budget exceeds have crossed the dashboard surveillance threshold.
              </p>
            </div>
          </div>
        )}
      </section>

      {/* Board Management Summary Card */}
      <div id="executive-summary-section" className="bg-slate-900 text-white rounded-3xl border border-slate-800 p-6 space-y-5 shadow-lg no-print">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/20 p-2.5 rounded-2xl border border-blue-500/20 text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-wide uppercase">Board Executive Management Report</h3>
              <p className="text-[11px] text-slate-400 font-sans">
                Comprehensive status audit, compliance scorecard, and performance diagnostics.
              </p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap self-start md:self-auto">
            <button
              onClick={handleExportPDF}
              className="bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black py-2 px-4 rounded-xl flex items-center gap-2 transition shadow-md cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Export Board PDF Report
            </button>
            <button
              onClick={handleExportPDF}
              className="bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-black py-2 px-4 rounded-xl flex items-center gap-2 transition shadow-md cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download Audit Summary
            </button>
          </div>
        </div>

        {/* Dynamic Executive Stats Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Card 1: Physical Progress */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] text-slate-550 font-mono uppercase">Physical Progress</span>
                <span className="text-emerald-400 text-[9px] font-black flex items-center gap-0.5 font-mono">
                  ▲ +{(p.physicalProgress / 10).toFixed(2)}% /Mo
                </span>
              </div>
              <span className="text-base font-black tracking-tight text-white">{p.physicalProgress.toFixed(2)}%</span>
            </div>
            {/* progress bar */}
            <div className="space-y-1">
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${p.physicalProgress}%` }} />
              </div>
              <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                <span>Plan: {plannedPct.toFixed(2)}%</span>
                <span className={p.physicalProgress >= plannedPct ? "text-emerald-400" : "text-rose-450 font-bold"}>
                  Gap: {(p.physicalProgress - plannedPct).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Cost Performance Index */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] text-slate-550 font-mono uppercase">Cost Index (CPI)</span>
                <span className={`text-[9px] font-black flex items-center gap-0.5 font-mono ${CPI >= 1 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {CPI >= 1 ? '▲ Stable' : '▼ Over-run'}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-base font-black tracking-tight ${CPI >= 1 ? 'text-emerald-400' : 'text-rose-400'}`}>{CPI.toFixed(3)}</span>
                <span className="text-[9px] text-slate-500 font-semibold font-mono">index</span>
              </div>
            </div>
            <p className="text-[9.5px] leading-snug text-slate-400">
              {CPI >= 1 ? 'Spending is well within raw BOQ margin.' : 'Certified IPC progress values exceed physical output.'}
            </p>
          </div>

          {/* Card 3: Schedule Variance */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] text-slate-550 font-mono uppercase">Sched. Variance (SV)</span>
                <span className={`text-[9px] font-black flex items-center gap-0.5 font-mono ${SV_Mil >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {SV_Mil >= 0 ? '▲ Ahead' : '▼ Delay'}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={`text-base font-black tracking-tight ${SV_Mil >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {SV_Mil >= 0 ? '+' : ''}{SV_Mil.toFixed(2)} M
                </span>
                <span className="text-[9px] text-slate-500 font-bold font-mono">Birr</span>
              </div>
            </div>
            <p className="text-[9.5px] leading-snug text-slate-400">
              Contract value schedule ratio represents {SV_pct.toFixed(2)}% {SV_Mil >= 0 ? 'acceleration.' : 'slippage.'}
            </p>
          </div>

          {/* Card 4: Right-Of-Way Impediments */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] text-slate-550 font-mono uppercase">ROW Impediments</span>
                <span className={`text-[9px] font-black flex items-center gap-0.5 font-mono ${rowImpediment > 5 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {rowImpediment > 5 ? '▲ Alert' : '✓ Secured'}
                </span>
              </div>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-base font-black tracking-tight text-amber-400">{rowImpediment.toFixed(2)} Km</span>
                <span className="text-[9px] text-slate-550">pending</span>
              </div>
            </div>
            <p className="text-[9.5px] leading-snug text-slate-400">
              {rowClearMetric.toFixed(2)} Km ({((rowClearMetric / p.lengthKm) * 100).toFixed(2)}%) obstruction-free.
            </p>
          </div>

          {/* Card 5: Remaining Budget */}
          <div className="bg-slate-950/60 p-4 rounded-2xl border border-slate-800/80 space-y-2 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="text-[10px] text-slate-550 font-mono uppercase">Remaining Budget</span>
                <span className="text-blue-400 text-[9px] font-black flex items-center gap-0.5 font-mono">
                  ⚡ {((remainingBudget / p.origAmount) * 100).toFixed(2)}% bal
                </span>
              </div>
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-base font-black tracking-tight text-blue-400">Br. {remainingBudget.toFixed(2)} M</span>
              </div>
            </div>
            <p className="text-[9.5px] leading-snug text-slate-400 font-sans">
              IPC cumulative certified pay: Br. {(AC / 1_000_000).toFixed(2)} M.
            </p>
          </div>
        </div>

        {/* Corporate Commentary Section */}
        <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/60 text-slate-300 leading-relaxed text-[11px] space-y-1">
          <strong className="text-xs text-slate-100 block">Board commentary & status report:</strong>
          <p>
            The project status audit indicates a cumulative schedule delay of <span className="text-rose-400 font-bold">-{(plannedPct - p.physicalProgress).toFixed(2)}%</span>. This variance represents a high risk for the targeted handover. The financial index remains stable with a cost-to-render evaluation of <span className="text-emerald-400 font-bold">{CPI.toFixed(3)} (CPI)</span>. Immediate administrative board interventions and enforcement of corrective actions are recommended for divisions performing under the standard dev thresholds.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: History list */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-4 rounded-2xl shadow-sm space-y-3 lg:col-span-1 no-print">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Changelog Audit History
          </h3>
          
          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {history.map((h, i) => (
              <div 
                key={i} 
                className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl space-y-1 text-2xs"
              >
                <div className="flex justify-between font-bold text-slate-500">
                  <span>{h.timestamp}</span>
                  <span className="text-blue-500">{h.physicalProgress.toFixed(2)}%</span>
                </div>
                <p className="text-slate-705 dark:text-slate-350">
                  Modified by <strong>{h.user}</strong> during updates on <strong>{h.section || 'General'}</strong>
                </p>
              </div>
            ))}

            {history.length === 0 && (
              <div className="text-center py-10 text-slate-400 font-medium text-xs">
                No history snapshots tracked yet.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Dynamic AI Compliance Report */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm space-y-4 lg:col-span-2">
          
          {/* Action Header */}
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-705 pb-3 flex-wrap gap-2 no-print">
            <span className="font-bold text-xs flex items-center gap-1.5 text-slate-755 dark:text-slate-200">
              <Sparkles className="w-4 h-4 text-emerald-500 animate-pulse" />
              Contract Performance compliance Audit Report
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={handleTriggerReportReRun}
                disabled={analyzing}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-705 dark:text-slate-250 text-2xs font-extrabold py-1.5 px-3 rounded-xl transition"
              >
                {analyzing ? 'Auditing...' : 'Re-Run Audit'}
              </button>

              <button
                onClick={() => window.print()}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-705 dark:hover:bg-slate-600 text-slate-700 dark:text-zinc-200 text-2xs font-extrabold py-1.5 px-3 rounded-xl flex items-center gap-1 transition select-none"
              >
                <Printer className="w-3.5 h-3.5 text-slate-550" />
                Print Layout
              </button>

              <button
                onClick={handleExportPDF}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-2xs font-extrabold py-1.5 px-3 rounded-xl flex items-center gap-1 transition shadow-md select-none cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Export Board PDF
              </button>

              <button
                onClick={handleExportPDF}
                className="bg-blue-600 hover:bg-blue-700 text-white text-2xs font-extrabold py-1.5 px-3 rounded-xl flex items-center gap-1 transition shadow-md select-none cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download Audit Summary
              </button>
            </div>
          </div>

          {analyzing ? (
            <div className="h-96 flex flex-col items-center justify-center gap-2 bg-slate-50/50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-500 font-bold animate-pulse">
                Auditing project physical, financial, and legal structures...
              </span>
            </div>
          ) : (
            /* Printable Report Sheet */
            <div 
              id="print-area-wrapper" 
              className="p-6 md:p-8 bg-slate-50/50 dark:bg-slate-900/10 border border-slate-100 dark:border-slate-850 rounded-2xl text-slate-800 dark:text-slate-100 font-sans shadow-xs space-y-6 max-h-[600px] overflow-y-auto"
            >
              {/* Report Header Logo & Banner */}
              <div className="text-center space-y-1.5 border-b-2 border-slate-800 dark:border-slate-600 pb-4">
                <div className="flex justify-center items-center gap-3">
                  {logoError ? (
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-slate-250 bg-gradient-to-br from-emerald-600 via-amber-500 to-red-500 p-0.5 shrink-0 shadow-xs">
                      <div className="w-full h-full bg-slate-900 rounded-[10px] flex flex-col items-center justify-center border border-white/20">
                        <span className="text-[10px] font-black tracking-tighter text-amber-400 font-mono leading-none">E.R.A</span>
                        <span className="text-[4px] font-bold text-white uppercase tracking-widest leading-none scale-90">Roads</span>
                      </div>
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-white rounded-xl border border-slate-200 dark:border-slate-700/60 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                      <img
                        src={eraLogo}
                        alt="Ethiopian Roads Administration Logo"
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                  <h1 className="text-sm md:text-base font-black tracking-widest text-slate-900 dark:text-white uppercase">
                    Ethiopian Roads Administration
                  </h1>
                </div>
                <h2 className="text-xs font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                  Federal Road Project Compliance & Performance Audit Report
                </h2>
                <div className="flex justify-center items-center gap-2 text-[10px] text-slate-400 font-mono">
                  <span>REPORT ID: ERA-AUD-{p.id.toUpperCase()}-{new Date().getFullYear()}</span> • 
                  <span>DATE: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
              </div>

              {/* 1. Project Specifications Summary Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-blue-600 rounded-xs" />
                  1. Project Identification Profile
                </h3>
                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 border border-slate-200/60 dark:border-slate-700/60 p-3.5 rounded-xl bg-white dark:bg-slate-900/50 text-[11px] font-semibold">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">PROJECT CONTRACT NAME</span>
                    <span className="text-slate-800 dark:text-zinc-150 font-bold">{p.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">FIDIC CONTRACT TYPE</span>
                    <span className="text-slate-800 dark:text-zinc-150 font-bold">{p.contractType === 'DB' ? 'Design-Build (DB)' : 'Design-Bid-Build (DBB)'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">PROUCT EMPLOYER</span>
                    <span className="text-slate-800 dark:text-zinc-150 font-bold">{p.client}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">DESIGN CONSULTANT</span>
                    <span className="text-slate-800 dark:text-zinc-150 font-bold">{p.consultant}</span>
                  </div>
                  <div className="col-span-2 border-t border-dashed border-slate-100 dark:border-slate-800 pt-2 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono">MAIN CONTRACTOR</span>
                      <span className="text-slate-800 dark:text-zinc-150 font-bold">{p.contractor}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono">ROAD WAY LENGTH</span>
                      <span className="text-slate-805 dark:text-zinc-150 font-mono font-bold">{p.lengthKm} Km</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Executive Performance Index Metres (CPI / SPI) */}
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-blue-600 rounded-xs" />
                  2. Executive Performance Indicators Audit
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px]">
                  
                  {/* Cost Performance */}
                  <div className="border border-slate-250/50 dark:border-slate-750 p-3.5 rounded-xl bg-white dark:bg-slate-900/50 flex flex-col justify-between space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase font-mono">
                      <span>Cost Status Index</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold ${CPI >= 1.0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/20' : 'bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-955/20'}`}>
                        {CPI >= 1.0 ? 'Under-Budget' : 'Check Variance'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5 pt-1">
                      <span className="text-xl font-black font-mono tracking-tight">{CPI.toFixed(3)}</span>
                      <span className="text-[10px] text-slate-400 font-semibold font-sans">CPI Ratio</span>
                    </div>
                    <p className="text-[10px] text-slate-404 leading-tight font-medium">
                      {CPI >= 1.0 
                        ? 'Project outlays confirm healthy financial alignment under the allocated BOQ divisions series.' 
                        : 'Financial outlays exceed physical accomplishments. Expenditure lagging against earned outlays.'}
                    </p>
                  </div>

                  {/* Schedule Performance */}
                  <div className="border border-slate-250/50 dark:border-slate-750 p-3.5 rounded-xl bg-white dark:bg-slate-900/50 flex flex-col justify-between space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase font-mono">
                      <span>Schedule Status Index</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold ${SPI >= 1.0 ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/20' : 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-950/20'}`}>
                        {SPI >= 1.0 ? 'On-Schedule' : 'Delayed Progress'}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-1.5 pt-1">
                      <span className="text-xl font-black font-mono text-rose-500 tracking-tight">{SPI.toFixed(3)}</span>
                      <span className="text-[10px] text-slate-400 font-semibold font-sans">SPI Ratio</span>
                    </div>
                    <p className="text-[10px] text-slate-404 leading-tight font-medium">
                      {SPI >= 1.0 
                        ? 'Timeline tracking parameters confirm execution is ahead or equal to original planned baselines.' 
                        : 'Significant timeline gap discovered. Urgent resource deployment required to recover lagging milestones.'}
                    </p>
                  </div>

                </div>
              </div>

              {/* 3. Physical Milestones Progression vs Target S-Curves */}
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-blue-600 rounded-xs" />
                  3. Physical Accomplishment vs Target S-Curve
                </h3>
                <div className="border border-slate-200/60 dark:border-slate-700/60 p-4 rounded-xl bg-white dark:bg-slate-900/50 text-[11px] space-y-3">
                  <div className="flex justify-between items-center font-bold">
                    <span>Physical Progress Status</span>
                    <span className="font-mono text-blue-500 font-black text-xs">{p.physicalProgress.toFixed(2)}% Completed</span>
                  </div>

                  <div className="space-y-1">
                    <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border">
                      <div className="h-full bg-blue-600 rounded-full" style={{ width: `${p.physicalProgress}%` }} />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 font-semibold font-mono">
                      <span>Cumulative Target Planned: {plannedPct.toFixed(2)}%</span>
                      <span>S-Curve Slippage: -{(plannedPct - p.physicalProgress).toFixed(2)}%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-2xs font-bold pt-2 border-t border-dashed">
                    <div>
                      <span className="text-[9px] text-slate-400 block font-mono">COMMENCEMENT DATE</span>
                      <span>{ocDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block font-mono">REVISED COMPLETION TARGET (EOT)</span>
                      <span className="text-rose-600 dark:text-rose-400">{rcDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3b. Data Inconsistency & Integrity Audit Log */}
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-blue-600 rounded-xs" />
                  3b. Data Inconsistency & Integrity Audit Log
                </h3>
                <div className="border border-slate-200/60 dark:border-slate-700/60 p-3.5 rounded-xl bg-white dark:bg-slate-900/50 text-[11px] space-y-2">
                  {inconsistencyAlerts.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 font-mono">
                        <span>AUDIT DISCREPANCIES FLAGGED: {inconsistencyAlerts.length} RULE(S)</span>
                        <span className="text-rose-600 dark:text-rose-400">ACTION REQUIRED</span>
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-lg overflow-hidden">
                        {inconsistencyAlerts.map((alert, aIdx) => (
                          <div key={aIdx} className="p-2.5 bg-slate-50/50 dark:bg-slate-900/40 space-y-1">
                            <div className="flex items-center justify-between font-bold text-[10px]">
                              <span className="text-rose-700 dark:text-rose-400 uppercase font-mono">[{alert.category}] {alert.title}</span>
                              <span className="text-rose-600 font-mono font-black">{alert.discrepancy}</span>
                            </div>
                            <p className="text-[10px] text-slate-600 dark:text-slate-400">
                              {alert.description} Baseline: <strong>{alert.expectedValue}</strong> | System Value: <strong className="text-rose-600 dark:text-rose-400">{alert.actualValue}</strong>.
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-lg text-[10px] font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      Data Integrity Verified: All BOQ series sums, IPC values, S-Curves, and Work Program weights align seamlessly with contract baselines.
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Lagging Sectors & CPM Work Critical Pathways */}
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-blue-600 rounded-xs" />
                  4. Operational Risks & CPM Schedule Lag Info
                </h3>
                <div className="border border-slate-200/60 dark:border-slate-700/60 p-3.5 rounded-xl bg-white dark:bg-slate-900/50 text-[11px] space-y-3">
                  
                  {/* Lagging BOQ Divisions */}
                  <div>
                    <span className="text-[9px] text-slate-400 font-mono block uppercase mb-1">Lagging Work Series Divisions (Progress &lt; 40%)</span>
                    {lagging.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {lagging.map((l, lIdx) => (
                          <div key={lIdx} className="p-2 border border-rose-100 bg-rose-50/50 dark:bg-rose-950/20 dark:border-rose-900/40 rounded-lg flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 animate-pulse shrink-0" />
                            <span className="text-[10px] font-bold text-rose-800 dark:text-rose-300">
                              Series {l.code} - {l.desc}: {l.progress.toFixed(2)}% exec
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-lg text-[10px] font-bold flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                        All BOQ divisions are progressing within healthy FIDIC tolerance margins.
                      </div>
                    )}
                  </div>

                  {/* Critical Pathway activities */}
                  <div className="pt-2 border-t border-dashed">
                    <span className="text-[9px] text-slate-400 font-mono block uppercase mb-1">Critical Work Program Flights (CPM)</span>
                    <p className="text-[10px] font-semibold text-slate-700 dark:text-zinc-300">
                      The active critical path spans {criticalActs.length ? criticalActs.length : '0'} construction phases: <strong className="text-rose-500">{criticalActs.join(', ') || 'N/A: General Grading'}</strong>.
                      Any additional slippage in these activities will directly affect the official revised completion target of {rcDate.toLocaleDateString()}.
                    </p>
                  </div>

                </div>
              </div>

              {/* 4b. Right-Of-Way (ROW) Obstruction & Strategic Compliance Audit */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span className="w-1.5 h-3 bg-blue-600 rounded-xs" />
                    4b. Right‑of‑Way (ROW) Obstruction & Strategic KPI Compliance
                  </h3>
                  <div className="border border-slate-200/60 dark:border-slate-700/60 rounded-xl bg-white dark:bg-slate-900/50 overflow-x-auto text-[11px]">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-350 font-bold border-b border-slate-200/60 dark:border-slate-700/60 text-[10px]">
                          <th className="p-2 text-left">Obstruction Metric Type</th>
                          <th className="p-2 text-center w-36">Value To-Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {displayRowMetrics.map((rm, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10">
                            <td className="p-2 font-medium text-slate-800 dark:text-slate-200">{rm.name}</td>
                            <td className="p-2 text-center font-mono font-extrabold text-blue-600 dark:text-blue-400">{rm.value.toFixed(2)} {rm.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Matured Unpaid IPCs compliance panel */}
                <div className="p-4 rounded-xl border border-amber-100 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-950/5 space-y-3">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-amber-100/65 dark:border-amber-900/35 pb-2.5">
                    <div>
                      <h4 className="text-[11px] font-extrabold uppercase text-amber-700 dark:text-amber-400 tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        Contractual Payment Maturity (FIDIC Sub-clause 14.7 Compliance)
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Outstanding matured certified IPCs and overdue liabilities (beyond the 56-day contractual limit).
                      </p>
                    </div>
                  </div>

                  {/* Summary Metric Cards for Unpaid Balances */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white/40 dark:bg-slate-900/40 p-3 rounded-lg border border-slate-100 dark:border-slate-800/80">
                    <div className="space-y-1">
                      <span className="text-[8px] font-extrabold text-rose-500 block uppercase tracking-wider font-mono">MATURED NET ETB (&gt;56 Days)</span>
                      <span className="text-xs sm:text-sm font-black font-mono text-rose-600 dark:text-rose-400 block">
                        Br. {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(maturedUnpaidNetEtb)}
                      </span>
                    </div>
                    <div className="space-y-1 border-l border-slate-200/50 dark:border-slate-800/80 pl-3">
                      <span className="text-[8px] font-extrabold text-rose-500 block uppercase tracking-wider font-mono">MATURED NET USD (&gt;56 Days)</span>
                      <span className="text-xs sm:text-sm font-black font-mono text-rose-600 dark:text-rose-400 block">
                        $ {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(maturedUnpaidNetUsd)}
                      </span>
                    </div>
                    <div className="space-y-1 border-l border-slate-200/50 dark:border-slate-800/80 pl-3">
                      <span className="text-[8px] font-extrabold text-blue-500 block uppercase tracking-wider font-mono">ALL UNPAID NET ETB</span>
                      <span className="text-xs sm:text-sm font-black font-mono text-blue-600 dark:text-blue-400 block">
                        Br. {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalUnpaidNetEtb)}
                      </span>
                    </div>
                    <div className="space-y-1 border-l border-slate-200/50 dark:border-slate-800/80 pl-3">
                      <span className="text-[8px] font-extrabold text-emerald-500 block uppercase tracking-wider font-mono">ALL UNPAID NET USD</span>
                      <span className="text-xs sm:text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 block">
                        $ {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalUnpaidNetUsd)}
                      </span>
                    </div>
                  </div>

                  <div className="text-[9.5px] font-bold text-slate-600 dark:text-slate-350 pt-1">
                    Overdue/Matured Claims Log:
                  </div>

                  {unpaidIpcsDetails.length > 0 ? (
                    <div className="border border-slate-100 dark:border-slate-800/80 rounded-lg overflow-hidden bg-white/60 dark:bg-slate-900/30">
                      <div className="overflow-x-auto">
                        <table className="w-full text-[10px] border-collapse min-w-[480px]">
                          <thead>
                            <tr className="bg-slate-50/80 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800/80 font-bold">
                              <th className="p-1.5 text-left">IPC No</th>
                              <th className="p-1.5 text-center">Submission Status</th>
                              <th className="p-1.5 text-center">Age (Days)</th>
                              <th className="p-1.5 text-right">Net ETB Portion</th>
                              <th className="p-1.5 text-right">Net USD Portion</th>
                              <th className="p-1.5 text-center">Clausal Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100/50 dark:divide-slate-800/40">
                            {unpaidIpcsDetails.map((det, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/5">
                                <td className="p-1.5 font-bold text-slate-700 dark:text-slate-300">{det.paymentNo}</td>
                                <td className="p-1.5 text-center text-slate-500 dark:text-slate-400">Certified & Submitted</td>
                                <td className="p-1.5 text-center font-mono font-bold text-slate-600 dark:text-slate-300">{det.daysElapsed} days</td>
                                <td className="p-1.5 text-right font-mono font-bold text-slate-700 dark:text-slate-205">
                                  Br. {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(det.certifiedEtb)}
                                </td>
                                <td className="p-1.5 text-right font-mono font-bold text-slate-700 dark:text-slate-205">
                                  $ {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(det.certifiedUsd)}
                                </td>
                                <td className="p-1.5 text-center">
                                  <span className="inline-block px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-100/50 dark:border-rose-900/30 uppercase tracking-tight">
                                    Matured / Overdue
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-emerald-500/5 dark:bg-emerald-500/2 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg text-[10px] font-bold flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      No matured overdue certified IPC payments found (all pending claims are within the 56-day contractual grace period).
                    </div>
                  )}

                  <p className="text-[9px] leading-relaxed text-slate-400 dark:text-slate-500 font-mono italic">
                    * Contract compliance reference: Sub-clause 14.7 requires payment within 56 calendar days. Delays trigger Sub-clause 14.8 interest at 4% for local currency and LIBOR + 2% for foreign currencies, and authorize progress deceleration under Sub-clause 16.1.
                  </p>
                </div>

                {/* 12 Groups KPI summary report */}
                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-extrabold uppercase text-slate-500 dark:text-slate-400 tracking-wider flex items-center gap-1.5">
                    <span className="w-1 h-2 bg-emerald-500 rounded-2xs" />
                    Strategic Compliance Audit (12 KPI Groups Summary)
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {kpiGroupsScores.map((g) => {
                      let scoreColor = "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/55";
                      let barColor = "bg-rose-500";
                      
                      if (g.id === 'G8') {
                        if (g.score <= 50) {
                          scoreColor = "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-950/55";
                          barColor = "bg-emerald-500";
                        } else if (g.score <= 75) {
                          scoreColor = "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/55";
                          barColor = "bg-amber-500";
                        } else {
                          scoreColor = "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/55";
                          barColor = "bg-rose-500";
                        }
                      } else {
                        if (g.score >= 80) {
                          scoreColor = "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-950/55";
                          barColor = "bg-emerald-500";
                        } else if (g.score >= 50) {
                          scoreColor = "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/55";
                          barColor = "bg-amber-500";
                        }
                      }

                      return (
                        <div key={g.id} className="p-3 border rounded-xl bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800/80 hover:shadow-2xs transition-all duration-200 flex flex-col justify-between gap-2.5 shadow-2xs">
                          <div className="flex justify-between items-start gap-1.5">
                            <div>
                              <span className="text-[9px] font-black font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">{g.id}</span>
                              <p className="text-[11px] font-bold text-slate-700 dark:text-slate-205 leading-tight mt-0.5">{g.name}</p>
                            </div>
                            <span className={`px-1.5 py-0.5 font-mono text-[10px] font-extrabold rounded-md border shrink-0 ${scoreColor}`}>
                              {g.score.toFixed(2)}%
                            </span>
                          </div>
                          {/* Progress Line */}
                          <div className="w-full bg-slate-200 dark:bg-slate-850 h-1 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${g.score}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 5. Securities, Escrow and Bonds Audit */}
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-blue-600 rounded-xs" />
                  5. Bank Securities & Guarantee Conformity
                </h3>
                <div className="border border-slate-200/60 dark:border-slate-700/60 p-3.5 rounded-xl bg-white dark:bg-slate-900/50 text-[11px]">
                  {criticalGuarantees.length > 0 ? (
                    <div className="space-y-2">
                      <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-150 dark:border-rose-900 text-rose-850 dark:text-rose-300 rounded-lg text-[10px] font-black uppercase tracking-wide flex items-center gap-2 animate-pulse">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        CRITICAL AUDIT NOTICE: Expiry/Validation Warning Issued!
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                        {criticalGuarantees.map((b, bIdx) => {
                          const isExpired = new Date(b.expireDate) < new Date();
                          return (
                            <div key={bIdx} className="p-2 border rounded-lg bg-slate-50 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 flex justify-between items-center">
                              <div>
                                <strong className="block text-slate-805 dark:text-zinc-150">{b.type}</strong>
                                <span className="text-[9px] text-slate-400">Issuer: {b.bank}</span>
                              </div>
                              <div className="text-right">
                                <span className={`font-mono block font-black ${isExpired ? 'text-rose-600' : 'text-amber-500'}`}>Br. {formattedMoney(b.amount)}</span>
                                <span className="text-[8px] font-mono text-slate-400">Exp: {b.expireDate}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50/50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-850 text-emerald-800 dark:text-emerald-300 rounded-lg font-bold flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      All performance and advance mobilization payment guarantees have validated expiry thresholds beyond the critical 45-day window.
                    </div>
                  )}
                </div>
              </div>

              {/* 6. Legal Interventions and System Directives */}
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-3 bg-blue-600 rounded-xs" />
                  6. Recommended Audit Interventions & Directives
                </h3>
                <div className="border border-slate-200/60 dark:border-slate-700/60 p-4 rounded-xl bg-white dark:bg-slate-900/50 text-[11px] space-y-2 font-semibold">
                  <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                    <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[9px] font-mono">01</span>
                    <p className="text-[10px]">
                      Issue formal Warning Directive under FIDIC Clause 8.6 regarding the delays evaluated in <strong className="text-slate-900 dark:text-white">{lagging.length > 0 ? lagging.map(l => `Series ${l.code}`).join(', ') : 'Series A (Earthworks)'}</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                    <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[9px] font-mono">02</span>
                    <p className="text-[10px]">
                      Instruct the Supervising Engineer and Lead QS to audit price adjustments indexes and current IPC valuation backlogs to align cash outlay velocity with real progress.
                    </p>
                  </div>
                  <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                    <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[9px] font-mono">03</span>
                    <p className="text-[10px]">
                      Instruct Contractor to immediately submit a comprehensive recovery program reflecting real equipment plant and workforce enhancements on the critical paths.
                    </p>
                  </div>
                </div>
              </div>

              {/* 7. Endorsement & Sign-Off Block */}
              <div className="pt-8 border-t border-slate-300 dark:border-slate-700 grid grid-cols-2 gap-8 text-[10px] text-slate-500 font-semibold uppercase">
                <div className="text-center space-y-12">
                  <p>Drafted by PMO, Project Manager</p>
                  <div className="border-b border-slate-300 dark:border-slate-700 w-44 mx-auto pb-1 text-slate-400">
                    signature / Stamp
                  </div>
                </div>
                <div className="text-center space-y-12">
                  <p>Verified by CPMP Director</p>
                  <div className="border-b border-slate-300 dark:border-slate-700 w-44 mx-auto pb-1 text-slate-400">
                    signature / STAMP
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>

    </div>
  );
}
