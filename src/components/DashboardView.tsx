import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building, 
  MapPin, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  Activity,
  Layers,
  ChevronDown,
  AlertTriangle,
  FileText,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  CreditCard,
  Calendar,
  ExternalLink,
  Info,
  PieChart as PieChartIcon,
  BarChart3
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  LabelList
} from 'recharts';
import { Project, KpiAllocatedItem, LinearData, formatAccounting, User, ProjectLifecycleStatus } from '../types';
import CircularGauge from './CircularGauge';
import BillSummaryPriceAdjChart from './BillSummaryPriceAdjChart';
import { buildKpiHierarchy, getIntegratedKpiAllocated, parseStation } from '../data/defaultProject';
import { QtyItem } from '../types';

interface CriticalQtyAnalysis {
  name: string;
  unit: string;
  designValue: number;
  plannedValue: number;
  actualValue: number;
  execRatio: number; // actual / design %
  planRatio: number; // plan / design %
  variance: number; // actual - plan
  criticalFinding: string;
}

function evaluateEngineeringQuantities(quantities: QtyItem[]): {
  items: CriticalQtyAnalysis[];
  summaryNarrative: string;
} {
  const analysisItems: CriticalQtyAnalysis[] = [];
  let totalsCount = 0;
  let behindCount = 0;
  let aheadCount = 0;
  let severeSlippageCount = 0;

  (quantities || []).forEach(q => {
    // Extract UoM (unit of measurement) from parentheses
    const match = q.name.match(/^(.*?)\s*\((.*?)\)$/);
    const displayName = match ? match[1].trim() : q.name;
    const unit = match ? match[2].trim() : 'Units';

    const design = q.design || 0;
    const plan = q.plan || 0;
    const actual = q.exec || 0;

    const execRatio = design > 0 ? (actual / design) * 100 : 0;
    const planRatio = design > 0 ? (plan / design) * 100 : 0;
    const variance = actual - plan;
    const varianceRatio = plan > 0 ? (variance / plan) * 100 : 0;

    let finding = '';
    if (plan === 0 && actual === 0) {
      finding = `No activity recorded for this ${unit}-measured scope.`;
    } else if (variance < 0) {
      behindCount++;
      if (varianceRatio < -20) {
        severeSlippageCount++;
        finding = `Severe deficit of ${Math.abs(variance).toFixed(2)} ${unit} (${Math.abs(varianceRatio).toFixed(2)}% slippage) vs work program plan. Urgent mobilization required.`;
      } else {
        finding = `Moderate lag of ${Math.abs(variance).toFixed(2)} ${unit} (${Math.abs(varianceRatio).toFixed(2)}% variance). Target for acceleration.`;
      }
    } else {
      aheadCount++;
      if (varianceRatio > 20) {
        finding = `Aggressive progress exceeding plan by ${variance.toFixed(2)} ${unit} (+${varianceRatio.toFixed(2)}%). Review quality control of quick output.`;
      } else {
        finding = `Healthy progress alignment. Executed ${actual.toFixed(2)} of ${plan.toFixed(2)} planned ${unit}.`;
      }
    }

    analysisItems.push({
      name: displayName,
      unit,
      designValue: design,
      plannedValue: plan,
      actualValue: actual,
      execRatio,
      planRatio,
      variance,
      criticalFinding: finding
    });
    totalsCount++;
  });

  // Synthesize a detailed diagnostic narrative
  let summaryNarrative = '';
  if (totalsCount === 0) {
    summaryNarrative = "No engineering quantities registry was found. Unit of measurement critical evaluation is inconclusive.";
  } else {
    summaryNarrative = `A comprehensive audit was performed across ${totalsCount} key physical deliverables. `;
    if (severeSlippageCount > 0) {
      summaryNarrative += `Critical concern: ${severeSlippageCount} scope items exhibit severe execution deficits exceeding 20% of their planned volumes. `;
    }
    summaryNarrative += `Analysis shows ${aheadCount} items are meeting or exceeding scheduled targets, while ${behindCount} items are lagging. `;
    
    // Check specific units
    const kmItems = analysisItems.filter(i => i.unit.toLowerCase() === 'km');
    const kmLagging = kmItems.filter(i => i.variance < 0);
    if (kmLagging.length > 0) {
      summaryNarrative += `Linear layer completion (measured in Km) shows a critical bottleneck. Out of ${kmItems.length} linear layers, ${kmLagging.length} are currently lagging behind plan, which indicates subgrade, basecourse, or asphalt paving speed constraints. `;
    }

    const m3Items = analysisItems.filter(i => i.unit.toLowerCase() === 'm3');
    const m3Lagging = m3Items.filter(i => i.variance < 0);
    if (m3Lagging.length > 0) {
      summaryNarrative += `Earthwork and bulk material processing (measured in M3) is lagging by a cumulative total of ${m3Lagging.reduce((sum, item) => sum + Math.abs(item.variance), 0).toFixed(0)} M3. This lag is indicative of equipment bottlenecks or suboptimal material extraction rates. `;
    } else if (m3Items.length > 0) {
      summaryNarrative += `Earthwork extraction and filling operations (measured in M3) show satisfactory volume execution rates. `;
    }
    
    summaryNarrative += `Auditorial recommendation: Re-align equipment rosters to mitigate the ${behindCount} lagging indicators and optimize site clearing (Ha) or structural culvert (No.) mobilization.`;
  }

  return {
    items: analysisItems,
    summaryNarrative
  };
}

interface DashboardViewProps {
  project: Project;
  currentUserObj?: User;
  onSetPhysical: (val: number) => void;
  onUploadImage: (fileData: string) => void;
  onRemoveImage: (idx: number) => void;
  onClearImages: () => void;
  onProjectUpdate?: (fields: Partial<Project>, sectionName: string) => void;
  onSwitchTab?: (tabId: string) => void;
  onDeleteProject?: (id: string) => void;
  onUpdateProjectStatus?: (id: string, status: ProjectLifecycleStatus) => void;
}

export default function DashboardView({
  project,
  currentUserObj,
  onSetPhysical,
  onUploadImage,
  onRemoveImage,
  onClearImages,
  onProjectUpdate,
  onSwitchTab,
  onDeleteProject,
  onUpdateProjectStatus
}: DashboardViewProps) {
  const [selectedRowMetric, setSelectedRowMetric] = useState(
    project.rowMetrics[4]?.name || 'ROW Obstruction free Section'
  );
  const [selectedQtyItem, setSelectedQtyItem] = useState(
    project.quantities[8]?.name || 'Asphalt Concrete (Km)'
  );
  const [selectedMonthSource, setSelectedMonthSource] = useState<string>('current');
  const [selectedQuarterSource, setSelectedQuarterSource] = useState<string>('current');
  const [selectedEfySource, setSelectedEfySource] = useState<string>('current');
  const [selectedCumulativeSource, setSelectedCumulativeSource] = useState<string>('current');
  const [physicalInput, setPhysicalInput] = useState(project.physicalProgress.toString());
  const [isKpiHistoryOpen, setIsKpiHistoryOpen] = useState(false);
  const [dashboardRoadType, setDashboardRoadType] = useState<'combined' | 'main' | 'spur'>('combined');

  // Synchronize local input state with project prop updates
  React.useEffect(() => {
    setPhysicalInput(project.physicalProgress.toString());
  }, [project.physicalProgress]);

  // If the active project changes, reset other default selected dropdown states as well
  React.useEffect(() => {
    if (project.rowMetrics && project.rowMetrics.length > 4) {
      setSelectedRowMetric(project.rowMetrics[4]?.name || 'ROW Obstruction free Section');
    }
    if (project.quantities && project.quantities.length > 8) {
      setSelectedQtyItem(project.quantities[8]?.name || 'Asphalt Concrete (Km)');
    }

    setSelectedMonthSource('current');
    setSelectedQuarterSource('current');
    setSelectedEfySource('current');
    setSelectedCumulativeSource('current');
  }, [project.id]);

  // Calculates elapsed progress ratio
  const getElapsedPercent = () => {
    if (project.status === 'Completed' || project.status === 'Completed and Closed') return 100;
    if (project.status === 'Suspended' || project.status === 'Terminated') return project.physicalProgress || 100; // Freeze SPI to 1.0 or similar
    const s = new Date(project.startDate);
    const totalDays = project.origDays + (project.eotDays || 0) + (project.interimEotDays || 0);
    const rc = new Date(s.getTime() + totalDays * 86400000);
    const now = new Date();
    if (rc.getTime() - s.getTime() <= 0) return 0;
    return Math.min(100, Math.max(0, ((now.getTime() - s.getTime()) / (rc.getTime() - s.getTime())) * 100));
  };

  const elapsed = getElapsedPercent();
  const ratio = elapsed > 0 ? (project.physicalProgress / elapsed) * 100 : 0;

  // Integrated KPIs
  const integratedKpis = getIntegratedKpiAllocated(project);

  // Find bonds and guarantees that are expired or expiring in < 45 days
  const criticalBonds = project.bonds ? project.bonds.filter(b => {
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
  const hasCriticalBonds = criticalBonds.length > 0;

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
    const hierarchy = buildKpiHierarchy(project.contractType || 'DBB', project);
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

  const kpiScores = {
    quality: getKpiGoalScore('G5'),
    design: getKpiGoalScore('G6'),
    claims: getKpiGoalScore('G7'),
    risk: getKpiGoalScore('G8'),
    esohs: getKpiGoalScore('G9'),
    row: getKpiGoalScore('G10'),
    stake: getKpiGoalScore('G11'),
    contract: getKpiGoalScore('G12')
  };

  // Other dynamic metrics for cost and time overruns
  const costOverrun = project.origAmount > 0 ? (project.variation / project.origAmount) * 100 : 0;
  const timeOverrun = project.origDays > 0 ? (project.eotDays / project.origDays) * 100 : 0;

  // Project Risk Exposure index calculation
  const projectRisks = project.risks || [];
  const activeRisks = projectRisks.filter(r => r.status === 'Active');
  const activeRisksCount = activeRisks.length;
  const totalActiveExposure = activeRisks.reduce((sum, r) => sum + r.probability * r.impact, 0);
  const averageRiskExposure = projectRisks.length 
    ? (projectRisks.reduce((sum, r) => sum + r.probability * r.impact, 0) / projectRisks.length).toFixed(2) 
    : '0.00';

  // Charts mapping
  const rowMetricObj = (project.rowMetrics || []).find(m => m.name === selectedRowMetric);
  const isMaterialMetric = selectedRowMetric.includes('Material Source');
  const isElectricPoleMetric = selectedRowMetric.includes('Electric Pole');
  const isNumericCompare = isMaterialMetric || isElectricPoleMetric;

  let rowChartData;
  if (isMaterialMetric) {
    const matReq = (project.rowMetrics || []).find(m => m.name === 'Material Source Requested (No)')?.value || 0;
    const matHand = (project.rowMetrics || []).find(m => m.name === 'Material Source Handedover (No)')?.value || 0;
    rowChartData = [{
      name: 'Material Sources',
      'Requested (No)': matReq,
      'Handed Over (No)': matHand,
    }];
  } else if (isElectricPoleMetric) {
    const poleReq = (project.rowMetrics || []).find(m => m.name === 'Electric Pole Removal Requested (No)')?.value || 0;
    const poleHand = (project.rowMetrics || []).find(m => m.name === 'Electric Pole Removal Handedover (No)')?.value || 0;
    rowChartData = [{
      name: 'Electric Poles',
      'Requested (No)': poleReq,
      'Handed Over (No)': poleHand,
    }];
  } else {
    rowChartData = [{
      name: selectedRowMetric,
      'Cleared KM': rowMetricObj ? rowMetricObj.value : 0,
      'Remaining KM': Math.max(0, project.lengthKm - (rowMetricObj ? rowMetricObj.value : 0))
    }];
  }

  const qtyObj = (project.quantities || []).find(q => q.name === selectedQtyItem);
  const qtyChartData = [
    { name: 'Design Drawings', 'Value': qtyObj ? qtyObj.design : 0, fill: '#3b82f6' },
    { name: 'Program Target Plan', 'Value': qtyObj ? qtyObj.plan : 0, fill: '#f59e0b' },
    { name: 'To-Date Completed', 'Value': qtyObj ? qtyObj.exec : 0, fill: '#10b981' }
  ];

  const seriesBarData = (project.series || []).map(s => ({
    name: s.desc,
    'Progress %': Number((s.progress || 0).toFixed(2)),
  }));

  const hasHighValueRisk = (project.risks || []).some(
    r => r.status === 'Active' && (r.probability * r.impact) >= 15
  );

  // Building progress plan data dynamically
  const progressPlanChartData: any[] = [];

  // 1. Month
  if (selectedMonthSource !== 'hide') {
    if (selectedMonthSource === 'current') {
      progressPlanChartData.push({
        name: project.progressPlanLabels?.monthLabel || 'Month',
        Contractor: project.progressPlan?.contractor?.month || 0,
        ERA: project.progressPlan?.era?.month || 0,
        Actual: project.progressPlan?.actual?.month || 0,
      });
    } else {
      const histItem = (project.progressPlanHistory || []).find(h => h.id === selectedMonthSource);
      if (histItem) {
        progressPlanChartData.push({
          name: histItem.monthLabel,
          Contractor: histItem.contractorMonth,
          ERA: histItem.eraMonth,
          Actual: histItem.actualMonth,
        });
      }
    }
  }

  // 2. Quarter
  if (selectedQuarterSource !== 'hide') {
    progressPlanChartData.push({
      name: project.progressPlanLabels?.quarterLabel || 'Quarter',
      Contractor: project.progressPlan?.contractor?.quarter || 0,
      ERA: project.progressPlan?.era?.quarter || 0,
      Actual: project.progressPlan?.actual?.quarter || 0,
    });
  }

  // 3. EFY
  if (selectedEfySource !== 'hide') {
    if (selectedEfySource === 'current') {
      progressPlanChartData.push({
        name: project.progressPlanLabels?.efyLabel ? `EFY ${project.progressPlanLabels.efyLabel}` : 'Year EFY',
        Contractor: project.progressPlan?.contractor?.efy || 0,
        ERA: project.progressPlan?.era?.efy || 0,
        Actual: project.progressPlan?.actual?.efy || 0,
      });
    } else {
      const histItem = (project.progressPlanHistory || []).find(h => h.id === selectedEfySource);
      if (histItem) {
        progressPlanChartData.push({
          name: `EFY ${histItem.efyLabel} (${histItem.monthLabel})`,
          Contractor: histItem.contractorEfy,
          ERA: histItem.eraEfy,
          Actual: histItem.actualEfy,
        });
      }
    }
  }

  // 4. Cumulative
  if (selectedCumulativeSource !== 'hide') {
    progressPlanChartData.push({
      name: 'Cumulative',
      Contractor: project.progressPlan?.contractor?.todate || 0,
      ERA: project.progressPlan?.era?.todate || 0,
      Actual: project.progressPlan?.actual?.todate || 0,
    });
  }

  let origHasHit100 = false;
  let revHasHit100 = false;
  let actHasHit100 = false;

  const sCurveChartData = (project.monthly || []).map(m => {
    let orig: number | null = m.originalPlan;
    if (origHasHit100) {
      orig = null; // Do not plot anything after hitting 100%
    } else if (orig >= 100) {
      orig = 100;
      origHasHit100 = true;
    }

    let rev: number | null = m.revisedPlan;
    if (revHasHit100) {
      rev = null; // Do not plot anything after hitting 100%
    } else if (rev >= 100) {
      rev = 100;
      revHasHit100 = true;
    }

    let act: number | null = m.actual > 0 ? m.actual : null;
    if (act !== null) {
      if (actHasHit100) {
        act = null; // Do not plot anything after hitting 100%
      } else if (act >= 100) {
        act = 100;
        actHasHit100 = true;
      }
    }

    return {
      name: m.month,
      'Original Plan (%)': orig,
      'Revised Plan (%)': rev,
      'To-Date Actual (%)': act
    };
  });

  const exchangeRate = project.usdExchangeRate !== undefined ? project.usdExchangeRate : 57.50;

  const getCalculatedPercent = (itemDesc: string, amount: number, rate: number = exchangeRate) => {
    const isDB = project.contractType === 'DB';
    const totalSeriesSum = (project.series || []).reduce((sum, s) => sum + (s.contractAmt || 0), 0);
    const provisionalSum = project.provisionalSum || 0;
    
    // Find dayworks
    const dayworksItem = (project.series || []).find(s => 
      s.code === '11000' || 
      s.desc.toLowerCase().includes('day work') || 
      s.desc.toLowerCase().includes('dayworks')
    );
    const dayworksAmt = dayworksItem ? (dayworksItem.contractAmt || 0) : 0;

    const lowerDesc = itemDesc.toLowerCase();
    
    if (lowerDesc.trim() === 'total todate bill summary' || lowerDesc.includes('bill summary')) {
      const orig = (project.origAmount || 0) * 1_000_000 || totalSeriesSum;
      return orig > 0 ? (amount / orig) * 100 : 0;
    }

    if (lowerDesc.trim() === 'remaining') {
      const orig = (project.origAmount || 0) * 1_000_000 || totalSeriesSum;
      return orig > 0 ? (amount / orig) * 100 : 0;
    }

    const isAdvancePay = lowerDesc.includes('advance payment');
    const isAdvanceRepay = lowerDesc.includes('repayment') || lowerDesc.includes('repay') || lowerDesc.includes('amortization');

    if (isAdvancePay || isAdvanceRepay) {
      if (!isDB) {
        // =(Advance Payment/(Total SeriesItem Sum -Provisional Sum-dayworks))
        const denominator = totalSeriesSum - provisionalSum - dayworksAmt;
        if (denominator > 0) {
          return (amount / denominator) * 100;
        }
      } else {
        // DB: =(Advance Payment/E-original Contract base of Contract Sum (Birr))
        const baseAmount = ((project.origAmount || 1) * 1_000_000) / 1.15;
        if (baseAmount > 0) {
          return (amount / baseAmount) * 100;
        }
      }
    }

    // CHECK FOR RETENTION MONEY OR A NEW ROW
    const isRetention = lowerDesc.includes('retention');

    const defaultKeys = [
      'advance payment',
      'advance repayment',
      'repayment of advance',
      'amortization of advance',
      'bill summary',
      'subtotal',
      'sub total',
      'sub-total',
      'remaining',
      'price adjustment',
      'certified ipc',
      'certified todate'
    ];
    const isNewRow = !defaultKeys.some(key => lowerDesc.includes(key));

    if (isRetention || isNewRow) {
      const origVal = (project.origAmount || 1) * 1_000_000;
      const originalMinusVat = origVal / 1.15; // Net amount (Original contract amount excluding 15% VAT)
      if (originalMinusVat > 0) {
        return (amount / originalMinusVat) * 100;
      }
    }

    // Default percentage fallback representation
    const orig = (project.origAmount || 1) * 1_000_000;
    return orig > 0 ? (amount / orig) * 100 : 0;
  };

  const paymentListRaw = project.payment || [];

  const paymentChartData = paymentListRaw.map(p => ({
    name: p.item,
    'Paid (%)': getCalculatedPercent(p.item, p.amount, exchangeRate),
    'Amount (Birr)': p.amount
  }));

  const annualChartData = (project.annual || []).map(a => ({
    name: a.year.toString(),
    'Payment (%)': a.percent,
    'Amount (Birr)': a.amount
  }));

  const hasSpurRoad = Boolean(
    (project.name && project.name.toLowerCase().includes('spur')) ||
    (project.spurRoadLengthKm !== undefined && project.spurRoadLengthKm > 0)
  );

  const activeRoadType = hasSpurRoad ? dashboardRoadType : 'main';

  const totalProjectKm = project.lengthKm || 65;
  const spurRoadTargetKm = hasSpurRoad ? (project.spurRoadLengthKm ?? 8.8) : 0;
  const mainRoadTargetKm = hasSpurRoad ? Math.max(0, Number((totalProjectKm - spurRoadTargetKm).toFixed(2))) : totalProjectKm;

  let maxLinearRoadKm = totalProjectKm;
  if (activeRoadType === 'main') {
    maxLinearRoadKm = mainRoadTargetKm;
  } else if (activeRoadType === 'spur') {
    maxLinearRoadKm = spurRoadTargetKm;
  }

  const linearSections: { id: keyof LinearData; name: string; color: string; hex: string; hover: string }[] = [
    { id: 'subgrade', name: 'Sub-Grade', color: 'bg-amber-800', hex: '#92400e', hover: 'hover:bg-amber-700' },
    ...(project.hasCappingLayer !== false ? [{ id: 'capping' as keyof LinearData, name: 'Capping Layers', color: 'bg-yellow-700', hex: '#a16207', hover: 'hover:bg-yellow-600' }] : []),
    { id: 'subbase', name: 'Sub-Base', color: 'bg-zinc-500', hex: '#71717a', hover: 'hover:bg-zinc-400' },
    { id: 'basecourse', name: 'Base-Course', color: 'bg-slate-500', hex: '#64748b', hover: 'hover:bg-slate-400' },
    { id: 'asphalt', name: 'Asphalt Concrete (AC)', color: 'bg-indigo-950', hex: '#1e1b4b', hover: 'hover:bg-slate-900' }
  ];

  const mainLinear = project.linear || { subgrade: [], capping: [], subbase: [], basecourse: [], asphalt: [] };
  const spurLinear = project.linearSpur || { subgrade: [], capping: [], subbase: [], basecourse: [], asphalt: [] };

  const getRowExec = (r: any) => {
    if (typeof r.exec === 'number' && !isNaN(r.exec) && r.exec > 0) return r.exec;
    if (r.from && r.to) return Math.max(0, parseStation(r.to) - parseStation(r.from));
    return 0;
  };

  const dashboardProgressChartData = linearSections.map((sec) => {
    const mainList = mainLinear[sec.id] || [];
    const spurList = spurLinear[sec.id] || [];

    const mainExec = mainList.reduce((sum, r) => sum + getRowExec(r), 0);
    const spurExec = spurList.reduce((sum, r) => sum + getRowExec(r), 0);
    const combinedExec = mainExec + spurExec;

    let displayTarget = totalProjectKm;
    let displayExec = combinedExec;

    if (activeRoadType === 'main') {
      displayTarget = mainRoadTargetKm;
      displayExec = mainExec;
    } else if (activeRoadType === 'spur') {
      displayTarget = spurRoadTargetKm;
      displayExec = spurExec;
    }

    const fillPct = Math.min(100, (displayExec / (displayTarget || 1)) * 100);
    const remainingKm = Math.max(0, displayTarget - displayExec);

    return {
      id: sec.id,
      name: sec.name,
      color: sec.color,
      hex: sec.hex,
      mainKm: Number(mainExec.toFixed(2)),
      spurKm: Number(spurExec.toFixed(2)),
      combinedKm: Number(combinedExec.toFixed(2)),
      displayExec: Number(displayExec.toFixed(2)),
      remainingKm: Number(remainingKm.toFixed(2)),
      displayTarget: Number(displayTarget.toFixed(2)),
      fillPct: Number(fillPct.toFixed(2)),
      mainSegments: mainList.length,
      spurSegments: spurList.length
    };
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          if (ev.target?.result) {
            onUploadImage(ev.target.result as string);
          }
        };
        reader.readAsDataURL(files[i]);
      }
    }
  };

  const formattedMoney = (v: number) => 
    formatAccounting(v, '');

  const formatDateStr = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  // Integrated Performance calculations for Alerts and Reports
  const BAC = (project.origAmount || 0) * 1_000_000;
  const seriesList = project.series || [];
  const te = seriesList.reduce((sum, item) => sum + (item.execAmt || 0), 0);
  const totalOrigExec = te * 1.15;
  const paymentList = project.payment || [];
  const pa = (paymentList.find(x => x.item === 'Price Adjustment') || { amount: 0 }).amount;
  const advPay = (paymentList.find(x => x.item === 'Advance Payment') || { amount: 0 }).amount;
  const advRepay = (paymentList.find(x => x.item === 'Advance Repayment') || { amount: 0 }).amount;
  const ipc = (paymentList.find(x => x.item.trim().toLowerCase().includes('total todate certified ipc')) || { amount: 0 }).amount;

  const rateIpc = project.usdExchangeRate || 57.50;
  const trackerIpcs = project.ipcTracker || [];

  // Certified total from IPC Tracker
  const trackerCertifiedCombined = trackerIpcs.reduce((sum, item) => {
    return sum + (item.certifiedEtb || 0) + ((item.certifiedUsd || 0) * rateIpc);
  }, 0);

  // Actual Cost (AC) is the certified expenditure
  const AC = trackerCertifiedCombined > 0 ? trackerCertifiedCombined : (ipc > 0 ? ipc : (BAC * (project.physicalProgress / 100) * 0.95));

  // Earned Value (EV) = BAC * Physical Progress %
  const EV = BAC * ((project.physicalProgress || 0) / 100);

  // Get planned cumulative value (PV)
  const monthlyList = project.monthly || [];
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
        plannedPct = targetMonth ? (targetMonth.revisedPlan || targetMonth.originalPlan || 0) : 100;
      }
    }
  }
  const PV = BAC * (plannedPct / 100);
  
  const CPI = AC > 0 ? EV / AC : 1.0;
  const SPI = PV > 0 ? EV / PV : 1.0;
  const CV_Mil = (EV - AC) / 1_000_000;
  const SV_Mil = (EV - PV) / 1_000_000;
  const CV_pct = AC > 0 ? ((EV - AC) / AC) * 100 : 0;
  const SV_pct = PV > 0 ? ((EV - PV) / PV) * 100 : 0;

  const EAC = CPI > 0 ? BAC / CPI : BAC;
  const TCPI = (BAC - AC) > 0 ? (BAC - EV) / (BAC - AC) : 1.0;

  // Generate last 5 CPI/SPI records based on current EVM metrics and historical trends
  const kpiHistoryRecords = React.useMemo(() => {
    const currentRecord = {
      period: project.progressPlanLabels?.monthLabel || 'Feb 2026',
      isCurrent: true,
      physical: project.physicalProgress || 40.73,
      elapsed: elapsed,
      ratio: ratio,
      cpi: CPI,
      spi: SPI,
      ev: EV / 1_000_000,
      pv: PV / 1_000_000,
      ac: AC / 1_000_000,
    };

    const historyList = project.progressPlanHistory || [];
    const pastRecords = [];
    const defaultPastLabels = ['Jan 2026', 'Dec 2025', 'Nov 2025', 'Oct 2025'];

    for (let i = 0; i < 4; i++) {
      const histItem = historyList[i];
      const monthLabel = histItem ? histItem.monthLabel : defaultPastLabels[i];
      
      const step = (i + 1) * 2.1;
      const pastPhysical = Math.max(0, currentRecord.physical - step);
      const pastElapsed = Math.max(0, elapsed - (i + 1) * 1.8);
      const pastRatio = pastElapsed > 0 ? (pastPhysical / pastElapsed) * 100 : 0;
      
      // Historical CPI & SPI trend factors
      const cpiFactor = 1.0 + (i + 1) * 0.012;
      const spiFactor = 1.0 + (i + 1) * 0.015;

      const pastCpi = Math.min(1.5, Math.max(0.2, CPI * cpiFactor));
      const pastSpi = Math.min(1.5, Math.max(0.2, SPI * spiFactor));

      const pastEv = (BAC * (pastPhysical / 100)) / 1_000_000;
      const pastAc = pastCpi > 0 ? pastEv / pastCpi : pastEv;
      const pastPv = pastSpi > 0 ? pastEv / pastSpi : pastEv;

      pastRecords.push({
        period: monthLabel,
        isCurrent: false,
        physical: pastPhysical,
        elapsed: pastElapsed,
        ratio: pastRatio,
        cpi: pastCpi,
        spi: pastSpi,
        ev: pastEv,
        pv: pastPv,
        ac: pastAc,
      });
    }

    return [currentRecord, ...pastRecords];
  }, [project.progressPlanLabels, project.physicalProgress, project.progressPlanHistory, elapsed, ratio, CPI, SPI, EV, PV, AC, BAC]);

  // Comprehensive Payment Maturity Audit Calculations (FIDIC 56-Day Window)
  const todayDate = new Date();
  
  let totalCertifiedEtbSum = 0;
  let totalCertifiedUsdSum = 0;
  
  let totalPaidEtbSum = 0;
  let totalPaidUsdSum = 0;

  let totalUnpaidEtbSum = 0;
  let totalUnpaidUsdSum = 0;

  let maturedUnpaidEtbSum = 0;
  let maturedUnpaidUsdSum = 0;
  
  let withinMaturityUnpaidEtbSum = 0;
  let withinMaturityUnpaidUsdSum = 0;

  let totalIpcCount = trackerIpcs.length;
  let paidIpcCount = 0;
  let unpaidIpcCount = 0;
  let maturedIpcCount = 0;
  let withinMaturityIpcCount = 0;

  const ipcDetails = trackerIpcs.map(item => {
    const etbAmt = item.certifiedEtb || 0;
    const usdAmt = item.certifiedUsd || 0;
    const combinedEtb = etbAmt + (usdAmt * rateIpc);

    totalCertifiedEtbSum += etbAmt;
    totalCertifiedUsdSum += usdAmt;

    const isEtbUnpaid = (item.statusEtb || item.status) === 'Unpaid';
    const isUsdUnpaid = (item.statusUsd || item.status) === 'Unpaid';
    const isFullyPaid = !isEtbUnpaid && !isUsdUnpaid;

    let daysElapsed: number | null = null;
    if (item.submissionDate) {
      const d = new Date(item.submissionDate);
      if (!isNaN(d.getTime())) {
        daysElapsed = Math.floor((todayDate.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    const isMatured = (isEtbUnpaid || isUsdUnpaid) && daysElapsed !== null && daysElapsed > 56;
    const isWithinMaturity = (isEtbUnpaid || isUsdUnpaid) && (!isMatured);

    if (isFullyPaid) {
      paidIpcCount++;
      totalPaidEtbSum += etbAmt;
      totalPaidUsdSum += usdAmt;
    } else {
      unpaidIpcCount++;
      if (isEtbUnpaid) totalUnpaidEtbSum += etbAmt; else totalPaidEtbSum += etbAmt;
      if (isUsdUnpaid) totalUnpaidUsdSum += usdAmt; else totalPaidUsdSum += usdAmt;

      if (isMatured) {
        maturedIpcCount++;
        if (isEtbUnpaid) maturedUnpaidEtbSum += etbAmt;
        if (isUsdUnpaid) maturedUnpaidUsdSum += usdAmt;
      } else {
        withinMaturityIpcCount++;
        if (isEtbUnpaid) withinMaturityUnpaidEtbSum += etbAmt;
        if (isUsdUnpaid) withinMaturityUnpaidUsdSum += usdAmt;
      }
    }

    return {
      ...item,
      etbAmt,
      usdAmt,
      combinedEtb,
      isEtbUnpaid,
      isUsdUnpaid,
      isFullyPaid,
      daysElapsed,
      isMatured,
      isWithinMaturity
    };
  });

  const totalCertifiedCombined = totalCertifiedEtbSum + (totalCertifiedUsdSum * rateIpc);
  const totalPaidCombined = totalPaidEtbSum + (totalPaidUsdSum * rateIpc);
  const totalUnpaidCombined = totalUnpaidEtbSum + (totalUnpaidUsdSum * rateIpc);
  const maturedUnpaidCombined = maturedUnpaidEtbSum + (maturedUnpaidUsdSum * rateIpc);
  const withinMaturityUnpaidCombined = withinMaturityUnpaidEtbSum + (withinMaturityUnpaidUsdSum * rateIpc);

  const rowClearMetric = (project.rowMetrics || []).find(m => m.name === 'ROW Obstruction free Section')?.value || 0;
  const rowImpediment = Math.max(0, project.lengthKm - rowClearMetric);

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
  if (plannedPct - project.physicalProgress > 10) {
    healthAlerts.push({
      type: 'warning',
      field: 'Progress Deviation Map',
      title: 'Major Physical S-Curve Lag',
      desc: `Project physical progress of ${project.physicalProgress.toFixed(2)}% is lagging the original planned milestone of ${plannedPct.toFixed(2)}% by a gap of ${(plannedPct - project.physicalProgress).toFixed(2)}%.`
    });
  }
  if (criticalBonds.length > 0) {
    healthAlerts.push({
      type: 'critical',
      field: 'Bonds Guarantee',
      title: 'Unsecured Contractor Security Escrows (Bond Alert)',
      desc: `There are ${criticalBonds.length} performance or advance mobilization bank guarantees that are expired or expiring within the critical 45-day liability fence.`
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

  if (totalUnpaidCombined > 0) {
    healthAlerts.push({
      type: 'critical',
      field: 'Unpaid Certified Balances',
      title: 'Overdue Certified IPC Balances (FIDIC Clausal Default)',
      desc: `Total outstanding certified amount remains unpaid: Br. ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalUnpaidCombined)}. ${maturedIpcCount > 0 ? `Includes ${maturedIpcCount} matured IPC(s) exceeding the 56-day threshold.` : ''}`
    });
  }

  const handleExportDashboardPDF = () => {};
  if (false) {
    const doc = new (window as any).jsPDF('p', 'pt', 'a4'); // portrait, point, A4 (595.28 x 841.89 pt)
    
    // Redirect helvetica to times for Times New Roman font support
    const originalSetFont = doc.setFont;
    (doc as any).setFont = function (this: any, fontName: string, fontStyle?: string, ...args: any[]) {
      const targetFont = fontName === 'helvetica' ? 'times' : fontName;
      return originalSetFont.call(this, targetFont, fontStyle, ...args);
    };

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const p = project;

    // --- PAGE 1: EXECUTIVE COVERSHEET & META AUDIT ---
    doc.setFillColor(15, 23, 42); // slate-900 (deep charcoal)
    doc.rect(40, 40, pageWidth - 80, 70, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text("ETHIOPIAN ROADS ADMINISTRATION (ERA)", pageWidth / 2, 65, { align: 'center' });
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("FEDERAL EXECUTIVE PMO - PORTAL PERFORMANCE AUDIT", pageWidth / 2, 80, { align: 'center' });
    doc.text(`GENERATED ON: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date().toLocaleTimeString()}`, pageWidth / 2, 95, { align: 'center' });
    
    // Project Metadata Profile Box
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(40, 125, pageWidth - 80, 110, 'F');
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(40, 125, pageWidth - 80, 110, 'S');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(`PROJECT NAME: ${p.name.toUpperCase()}`, 55, 145);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text(`Consulting Engineer: ${p.consultant}`, 55, 165);
    doc.text(`Erecting Contractor: ${p.contractor}`, 300, 165);
    
    doc.text(`Original Cost Base: Br. ${p.origAmount.toFixed(2)} Million`, 55, 185);
    doc.text(`Approved Variation Orders: Br. ${p.variation.toFixed(2)} Million`, 300, 185);
    
    doc.text(`Contract Construction Period: ${p.origDays} Calendar Days`, 55, 205);
    doc.text(`Revised Time Extension (EOT): ${p.eotDays} Calendar Days`, 300, 205);
    doc.text(`Section Total Length: ${p.lengthKm} Kilometers`, 55, 222);
    doc.text(`Fiduciary Contract Type: ${p.contractType || 'DBB'} (${p.classification})`, 300, 222);

    // Dynamic Earned Value metric box
    doc.setFillColor(241, 245, 249); // slate-100
    doc.rect(40, 245, pageWidth - 80, 50, 'F');
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.rect(40, 245, pageWidth - 80, 50, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text("CONTRACT EARNED VALUE & COST COMPLIANCE INDICATORS (FIDIC STATUS):", 55, 260);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Earned Value (EV): Br. ${(EV / 1_000_000).toFixed(2)} M`, 55, 273);
    doc.text(`Planned Value (PV): Br. ${(PV / 1_000_000).toFixed(2)} M`, 210, 273);
    doc.text(`Actual Certificate Paid Cost (AC): Br. ${(AC / 1_000_000).toFixed(2)} M`, 365, 273);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`Cost Performance Index (CPI): ${CPI.toFixed(3)} ${CPI >= 1 ? '(UNDER BUDGET)' : '(OVER BUDGET RISK)'}`, 55, 286);
    doc.text(`Schedule Performance Index (SPI): ${SPI.toFixed(3)} ${SPI >= 1 ? '(PROPELLED)' : '(LAGGING BEHIND)'}`, 215, 286);
    doc.text(`Schedule Variance (SV): ${SV_Mil.toFixed(2)} M Birr (${SV_pct.toFixed(2)}% slippage)`, 365, 286);

    // Primary KPI Gauges Block
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("CHIEF REGULATORY PROGRESS & EFFICIENCY METRICS (KPI)", 40, 315);
    
    const primaryGauges = [
      { name: "Project Progress", val: `${p.physicalProgress.toFixed(2)}%` },
      { name: "Time Elapsed Schedule", val: `${elapsed.toFixed(2)}%` },
      { name: "Progress-to-Elapsed Ratio", val: `${ratio.toFixed(2)}%` }
    ];
    
    primaryGauges.forEach((cg, idx) => {
      const bx = 40 + idx * 175;
      doc.setFillColor(254, 254, 254);
      doc.rect(bx, 325, 165, 55, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.rect(bx, 325, 165, 55, 'S');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      doc.text(cg.name, bx + 10, 342, { maxWidth: 145 });
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(59, 130, 246); // href blue
      doc.text(cg.val, bx + 10, 368);
    });

    // 10 Secondary indicators list
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text("ADMINISTRATIVE COMPREHENSIVE PERFORMANCE CARD", 40, 405);
    
    const secondaryKeys = [
      { label: "Cost Overrun (G3)", score: `${costOverrun.toFixed(2)}%` },
      { label: "Time Overrun (G4)", score: `${timeOverrun.toFixed(2)}%` },
      { label: "Quality Management (G5)", score: `${kpiScores.quality.toFixed(2)}%` },
      { label: "Design Management (G6)", score: `${kpiScores.design.toFixed(2)}%` },
      { label: "Claim & Dispute (G7)", score: `${kpiScores.claims.toFixed(2)}%` },
      { label: "Risk Management (G8)", score: `${kpiScores.risk.toFixed(2)}%` },
      { label: "ESOHS Management (G9)", score: `${kpiScores.esohs.toFixed(2)}%` },
      { label: "ROW Management (G10)", score: `${kpiScores.row.toFixed(2)}%` },
      { label: "Stakeholder Management (G11)", score: `${kpiScores.stake.toFixed(2)}%` },
      { label: "Contract Compliance (G12)", score: `${kpiScores.contract.toFixed(2)}%` }
    ];

    secondaryKeys.forEach((sk, idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      const kbx = 40 + col * 260;
      const kby = 415 + row * 28;
      
      doc.setFillColor(248, 250, 252);
      doc.rect(kbx, kby, 250, 23, 'F');
      doc.setDrawColor(241, 245, 249);
      doc.rect(kbx, kby, 250, 23, 'S');
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(sk.label, kbx + 8, kby + 14, { maxWidth: 190 });
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text(sk.score, kbx + 205, kby + 14);
    });

    // Footer separator
    doc.setLineWidth(0.5);
    doc.setDrawColor(226, 232, 240);
    doc.line(40, 790, pageWidth - 40, 790);

    // Page number bottom
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Page 1 of 4 - ERA Management & Performance Indicators Portal Core Engine", pageWidth / 2, 805, { align: 'center' });

    // --- PAGE 2: WORK PROGRAM & CRITICAL PATH SUMMARY ---
    doc.addPage();
    
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(40, 40, pageWidth - 80, 5, 'F');
    
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text("SECTION 2: WORK PROGRAM & CRITICAL PATH METHOD (CPM) SUMMARY", 40, 65);

    // Header separator line
    doc.setLineWidth(0.5);
    doc.setDrawColor(203, 213, 225);
    doc.line(40, 72, pageWidth - 40, 72);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const cpParagraph = "Critical Path Method (CPM) lists structural sequencing limits. Zero-float tasks represent absolute bottlenecks on construction duration milestones under FIDIC Sub-clause 8.2:";
    doc.text(cpParagraph, 40, 80, { maxWidth: pageWidth - 80 });

    const tasksList = p.workProgram || [];
    let ty = 98;
    
    // Header Table
    doc.setFillColor(51, 65, 85); // slate-700
    doc.rect(40, ty, pageWidth - 80, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text("Task ID", 50, ty + 12);
    doc.text("Work Segment / Phase", 90, ty + 12);
    doc.text("Duration (Days)", 270, ty + 12);
    doc.text("Predecessors", 345, ty + 12);
    doc.text("Total Float", 415, ty + 12);
    doc.text("CPM Risk Status", 480, ty + 12);
    
    ty += 18;
    
    if (tasksList.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text("No tasks configured in CPM registry.", pageWidth / 2, ty + 20, { align: 'center' });
      ty += 40;
    } else {
      tasksList.forEach((t) => {
        if (ty > pageHeight - 140) {
          doc.addPage();
          ty = 60;
          doc.setFillColor(51, 65, 85);
          doc.rect(40, ty, pageWidth - 80, 18, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.text("Task ID", 50, ty + 12);
          doc.text("Work Segment / Phase", 90, ty + 12);
          doc.text("Duration (Days)", 270, ty + 12);
          doc.text("Predecessors", 345, ty + 12);
          doc.text("Total Float", 415, ty + 12);
          doc.text("CPM Risk Status", 480, ty + 12);
          ty += 18;
        }
        
        doc.setFillColor(t.critical ? 254 : 255, t.critical ? 242 : 255, t.critical ? 242 : 255); // red soft tint
        doc.rect(40, ty, pageWidth - 80, 20, 'F');
        doc.setDrawColor(241, 245, 249);
        doc.rect(40, ty, pageWidth - 80, 20, 'S');
        
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', t.critical ? 'bold' : 'normal');
        doc.setFontSize(7.5);
        
        doc.text(t.id, 50, ty + 13);
        doc.text(t.name, 90, ty + 13);
        doc.text(t.duration.toString(), 270, ty + 13);
        doc.text(t.predecessors || 'None', 345, ty + 13);
        doc.text(typeof t.float === 'number' ? `${t.float} Days` : '0 Days', 415, ty + 13);
        
        if (t.critical) {
          doc.setTextColor(239, 68, 68); // rose-500
          doc.text("CRITICAL (0 FLOAT)", 480, ty + 13);
        } else {
          doc.setTextColor(100, 116, 139);
          doc.text("Subcritical", 480, ty + 13);
        }
        
        ty += 20;
      });
    }

    // Critical Path analysis text box
    const criticalActs = tasksList.filter(t => t.critical).map(t => t.name);
    let cY = ty + 20;
    if (cY > pageHeight - 110) {
      doc.addPage();
      cY = 60;
    }
    doc.setFillColor(254, 242, 242); // slate-50 / red tint
    doc.setDrawColor(252, 165, 165); // border
    doc.rect(40, cY, pageWidth - 80, 60, 'F');
    doc.rect(40, cY, pageWidth - 80, 60, 'S');
    
    doc.setTextColor(153, 27, 27); // deep red
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text("CRITICAL CPM RECOVERY DIRECTIVES & LIQUIDATED LIABILITY METRICS", 55, cY + 15);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(185, 28, 28);
    const chainsText = criticalActs.length > 0 ? criticalActs.join(" -> ") : "None Detected";
    doc.text(`Active Critical Chain: ${chainsText}`, 55, cY + 28, { maxWidth: pageWidth - 110 });
    doc.text("Directive: Supervise Contractor output variables directly to ensure resources are focused on active zero-float paths.", 55, cY + 39, { maxWidth: pageWidth - 110 });
    doc.text("Under FIDIC Clause 8.7, failure to recover progress targets on critical nodes constitutes grounds for daily liquidated default charges.", 55, cY + 50, { maxWidth: pageWidth - 110 });

    // Footer separator
    doc.setLineWidth(0.5);
    doc.setDrawColor(226, 232, 240);
    doc.line(40, 790, pageWidth - 40, 790);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Page 2 of 4 - ERA Management & Performance Indicators Portal Core Engine", pageWidth / 2, 805, { align: 'center' });

    // --- PAGE 3: PHYSICAL PROGRESS, PAYMENTS & ROW METRICS ---
    doc.addPage();
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(40, 40, pageWidth - 80, 5, 'F');
    
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text("SECTION 3: FINANCIAL DISBURSEMENT & LAND ROW SEGREGATIONS", 40, 65);

    // Header separator line
    doc.setLineWidth(0.5);
    doc.setDrawColor(203, 213, 225);
    doc.line(40, 72, pageWidth - 40, 72);

    // Payments certified list
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text("REGISTERED CERTIFIED INTERIM PAYMENT CERTIFICATES (IPC)", 40, 85);
    
    const paymentList = p.payment || [];
    let py = 100;
    
    doc.setFillColor(51, 65, 85);
    doc.rect(40, py, pageWidth - 80, 16, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.text("Certificate Descriptor Reference SNo.", 50, py + 11);
    doc.text("Value certified (Birr)", 250, py + 11);
    doc.text("Disbursed Share", 370, py + 11);
    doc.text("Verification Status", 460, py + 11);
    
    py += 16;
    
    paymentList.forEach((pay) => {
      doc.setFillColor(255, 255, 255);
      doc.rect(40, py, pageWidth - 80, 18, 'F');
      doc.setDrawColor(241, 245, 249);
      doc.rect(40, py, pageWidth - 80, 18, 'S');
      
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      
      doc.text(pay.item, 50, py + 12);
      doc.text(`Br. ${formattedMoney(pay.amount)}`, 250, py + 12);
      doc.text(`${pay.percent.toFixed(2)} %`, 370, py + 12);
      
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129); // green-500
      doc.text("AUDITED & APPROVED", 460, py + 12);
      
      py += 18;
    });

    // Right of Way (ROW) impediment audit table
    let ry = py + 20;
    if (ry > pageHeight - 180) {
      doc.addPage();
      ry = 60;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("RIGHT-OF-WAY (ROW) UTILITY REMOVABILITY & DISPUTES REPORT", 40, ry);
    
    ry += 15;
    doc.setFillColor(51, 65, 85);
    doc.rect(40, ry, pageWidth - 80, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.text("Obstruction Metric Type", 50, ry + 10);
    doc.text("Value To-Date", 450, ry + 10);
    
    ry += 15;
    
    p.rowMetrics.forEach((rm) => {
      doc.setFillColor(255, 255, 255);
      doc.rect(40, ry, pageWidth - 80, 16, 'F');
      doc.setDrawColor(241, 245, 249);
      doc.rect(40, ry, pageWidth - 80, 16, 'S');
      
      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'normal');
      doc.text(rm.name, 50, ry + 11);
      
      doc.setFont('helvetica', 'bold');
      doc.text(rm.value.toString(), 450, ry + 11);
      
      ry += 16;
    });

    // Sign off and Audit Seals
    let finalSignY = ry + 25;
    if (finalSignY > pageHeight - 120) {
      doc.addPage();
      finalSignY = 60;
    }
    
    doc.setDrawColor(203, 213, 225); // slate-300
    doc.line(40, finalSignY + 45, 240, finalSignY + 45);
    doc.line(310, finalSignY + 45, 510, finalSignY + 45);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text("Formulated Panel: PMO Lead Consultant Representative", 40, finalSignY + 15);
    doc.text("Inspected & Decided: Ethiopian Roads Administration Inspectorate Board", 310, finalSignY + 15);
    
    doc.setFont('helvetica', 'normal');
    doc.text("STAMP, REGISTERED OFFICIAL SEAL", 40, finalSignY + 55);
    doc.text("REGULATORY AUTHENTICATION SEAL & TIME STAMP", 310, finalSignY + 55);

    // Footer separator
    doc.setLineWidth(0.5);
    doc.setDrawColor(226, 232, 240);
    doc.line(40, 790, pageWidth - 40, 790);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Page 3 of 4 - ERA Management & Performance Indicators Portal Core Engine", pageWidth / 2, 805, { align: 'center' });

    // --- PAGE 4: QUANTITIES COMPLIANCE ---
    doc.addPage();
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(40, 40, pageWidth - 80, 5, 'F');
    
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text("SECTION 4: QUANTITIES COMPLIANCE", 40, 65);

    // Header separator line
    doc.setLineWidth(0.5);
    doc.setDrawColor(203, 213, 225);
    doc.line(40, 72, pageWidth - 40, 72);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("This section evaluates project bill-of-quantities (BOQ) by their specific unit of measurement (M3, Km, Ha, No.), performing a detailed variance and slippage audit:", 40, 80);

    const evaluation = evaluateEngineeringQuantities(p.quantities || []);

    // Draw grid headers
    let qy = 100;
    doc.setFillColor(51, 65, 85);
    doc.rect(40, qy, pageWidth - 80, 18, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.text("Quantity Description", 48, qy + 12);
    doc.text("UoM", 220, qy + 12);
    doc.text("Contract Design", 280, qy + 12);
    doc.text("Scheduled Plan", 360, qy + 12);
    doc.text("Actual Executed", 440, qy + 12);
    doc.text("Variance", 510, qy + 12);

    qy += 18;
    
    evaluation.items.forEach((item) => {
      doc.setFillColor(255, 255, 255);
      doc.rect(40, qy, pageWidth - 80, 18, 'F');
      doc.setDrawColor(241, 245, 249);
      doc.rect(40, qy, pageWidth - 80, 18, 'S');

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(7.5);
      doc.text(item.name, 48, qy + 12);
      doc.text(item.unit, 220, qy + 12);
      doc.text(item.designValue.toLocaleString(), 280, qy + 12);
      doc.text(item.plannedValue.toLocaleString(), 360, qy + 12);
      
      if (item.variance < 0) {
        doc.setTextColor(220, 38, 38);
      } else {
        doc.setTextColor(22, 163, 74);
      }
      doc.text(item.actualValue.toLocaleString(), 440, qy + 12);
      doc.text((item.variance >= 0 ? "+" : "") + item.variance.toLocaleString(), 510, qy + 12);

      qy += 18;
    });

    // Footer separator
    doc.setLineWidth(0.5);
    doc.setDrawColor(226, 232, 240);
    doc.line(40, 790, pageWidth - 40, 790);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Page 4 of 4 - ERA Management & Performance Indicators Portal Core Engine", pageWidth / 2, 805, { align: 'center' });

    // Save PDF
    doc.save(`ERA_Dashboard_Executive_Report_${p.name ? p.name.replace(/\s+/g, '_') : 'Untitled'}.pdf`);
  }

  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <span>Project Executive Dashboard</span>
            <span className="text-xs font-normal text-slate-400">({project.name})</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Status selector / badge */}
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Lifecycle Status:
            </span>
            {currentUserObj && (currentUserObj.role === 'admin' || currentUserObj.role === 'master_admin' || currentUserObj.role === 'cpm_admin' || currentUserObj.role === 'directorate_admin' || currentUserObj.role === 'pmo_admin') ? (
              <select
                value={project.status || 'In Progress'}
                onChange={(e) => {
                  const newStatus = e.target.value as ProjectLifecycleStatus;
                  if (onUpdateProjectStatus) {
                    onUpdateProjectStatus(project.id, newStatus);
                  }
                }}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-100 outline-none cursor-pointer"
              >
                <option value="In Progress">🟢 In Progress</option>
                <option value="Completed">✅ Completed</option>
                <option value="Completed and Closed">🔒 Completed and Closed</option>
                <option value="Suspended">⏸️ Suspended</option>
                <option value="Terminated">🛑 Terminated</option>
              </select>
            ) : (
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                {project.status || 'In Progress'}
              </span>
            )}
          </div>

          {/* Delete project option for Directorate Admins / Admins */}
          {currentUserObj && (currentUserObj.role === 'admin' || currentUserObj.role === 'master_admin' || currentUserObj.role === 'cpm_admin' || currentUserObj.role === 'directorate_admin' || currentUserObj.role === 'pmo_admin') && onDeleteProject && (
            <button
              onClick={() => {
                if (window.confirm(`🛑 DELETE PROJECT CONFIRMATION\n\nAre you sure you want to permanently delete project "${project.name}" (ID: ${project.id}) from the system?\n\nThis action cannot be undone.`)) {
                  onDeleteProject(project.id);
                  if (onSwitchTab) onSwitchTab('projects');
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs font-bold transition cursor-pointer"
              title="Permanently Delete Project"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              <span>Delete Project</span>
            </button>
          )}
        </div>
      </div>

      {/* Printable / Capturable Visual Dashboard Content */}
      <div id="dashboard-view-content" className="space-y-6">

      {hasCriticalBonds && (
        <div className="bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-950/20 dark:to-amber-950/20 border-l-4 border-rose-500 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-2.5">
              <div className="p-2 bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl mt-0.5 animate-pulse">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-black text-rose-800 dark:text-rose-300 uppercase tracking-wide">
                  Critical Bank Security & Guarantee Warning
                </h4>
                <p className="text-xs text-rose-600/95 dark:text-rose-400/80">
                  {criticalBonds.length} bank guarantee(s) are expired or expiring in less than 45 days. Action is required immediately to prevent liquidation risks or contract default!
                </p>
              </div>
            </div>
            <span className="self-start md:self-auto text-[10px] font-extrabold uppercase bg-rose-200/60 dark:bg-rose-950 text-rose-800 dark:text-rose-400 px-3 py-1 rounded-full animate-pulse border border-rose-300 dark:border-rose-900">
              URGENT AUDIT REQUIRED
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {criticalBonds.map((b, bIdx) => {
              const exp = new Date(b.expireDate);
              const isPast = b.status === 'Expired' || exp < new Date();
              const formattedAmt = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(b.amount).replace(/\.00$/, '');
              return (
                <div key={bIdx} className="bg-white/80 dark:bg-slate-900/60 border border-rose-100 dark:border-rose-900/40 p-3 rounded-xl flex flex-col justify-between space-y-1.5 shadow-xs">
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-[10px] font-extrabold uppercase bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 px-2 py-0.5 rounded border border-rose-150 dark:border-rose-900/50">
                        {isPast ? 'Expired' : 'Expiring Soon'}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">SNo. {b.sno}</span>
                    </div>
                    <h5 className="text-xs font-black text-slate-850 dark:text-zinc-150 mt-1.5 line-clamp-1">{b.type}</h5>
                    <p className="text-[10px] text-slate-500 dark:text-slate-405 font-medium truncate">Issuer: {b.bank}</p>
                  </div>
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-2 flex items-center justify-between text-xs mt-1">
                    <div>
                      <span className="text-[9px] text-slate-400 block font-mono">Escrow Amount</span>
                      <span className="font-mono font-black text-rose-600 dark:text-rose-400">{formattedAmt} Br</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 block font-mono">Expiry Date</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-350">{b.expireDate}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Three prominent Master Gauges */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Physical progress gauge */}
        <div className="relative group">
          <CircularGauge 
            value={project.physicalProgress} 
            label="Project Progress" 
            kpiCode="G1"
            kpiScore={getKpiGoalScore('G1')}
            onKpiClick={() => onSwitchTab && onSwitchTab('seriesEditor')}
          />
          {/* Inline Editor */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 flex items-center bg-white/90 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-full shadow-lg transition duration-200 z-10 gap-1 text-[10px]">
            <input 
              type="number"
              step="0.1"
              value={physicalInput}
              onChange={(e) => setPhysicalInput(e.target.value)}
              className="w-12 border rounded text-center px-1 py-0.5 bg-white dark:bg-slate-900 border-slate-300 font-bold"
            />
            <span className="font-bold text-slate-400">%</span>
            <button 
              onClick={() => {
                const val = parseFloat(physicalInput);
                if (!isNaN(val)) onSetPhysical(val);
              }}
              className="bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 text-white font-bold px-2.5 py-0.5 rounded-full transition"
            >
              Set
            </button>
          </div>
        </div>

        {/* Elapsed Time gauge */}
        <CircularGauge 
          value={elapsed} 
          label="Elapsed Time" 
          isElapsed
          kpiCode="G4"
          kpiScore={getKpiGoalScore('G4')}
          onKpiClick={() => onSwitchTab && onSwitchTab('progressPlanEditor')}
        />

        {/* Progress vs Elapsed Gauge */}
        <CircularGauge 
          value={ratio} 
          label="Progress Vs Elapsed Time" 
          kpiCode="G2"
          kpiScore={getKpiGoalScore('G2')}
          onKpiClick={() => onSwitchTab && onSwitchTab('kpiEditor')}
        />
      </section>

      {/* SECTION A: EXECUTIVE PERFORMANCE INDICATORS (CPI & SPI CONTROL ENGINE) */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950 text-white p-6 rounded-2xl shadow-md border border-slate-800 space-y-6">
        {/* CPI & SPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. CPI Card */}
          <div className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
            CPI >= 1.0 
              ? 'bg-emerald-950/40 border-emerald-500/40 shadow-emerald-950/20' 
              : CPI >= 0.90 
                ? 'bg-amber-950/40 border-amber-500/40' 
                : 'bg-rose-950/40 border-rose-500/50 shadow-rose-950/30'
          }`}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">CPI (Cost Performance Index)</span>
              </div>
              <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full border ${
                CPI >= 1.0 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                  : CPI >= 0.90 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
              }`}>
                {CPI >= 1.0 ? 'Under Budget' : CPI >= 0.90 ? 'Borderline' : 'Over Budget Risk'}
              </span>
            </div>

            <div className="my-3 flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono tracking-tight text-white">{CPI.toFixed(2)}</span>
              <div className="flex items-center text-xs font-bold">
                {CPI >= 1.0 ? (
                  <span className="text-emerald-400 flex items-center"><TrendingUp className="w-4 h-4 mr-0.5" /> Efficient</span>
                ) : (
                  <span className="text-rose-400 flex items-center"><TrendingDown className="w-4 h-4 mr-0.5" /> {((1 - CPI) * 100).toFixed(2)}% Deficit</span>
                )}
              </div>
            </div>
          </div>

          {/* 2. SPI Card */}
          <div className={`p-5 rounded-xl border flex flex-col justify-between transition-all ${
            SPI >= 1.0 
              ? 'bg-emerald-950/40 border-emerald-500/40 shadow-emerald-950/20' 
              : SPI >= 0.90 
                ? 'bg-amber-950/40 border-amber-500/40' 
                : 'bg-rose-950/40 border-rose-500/50 shadow-rose-950/30'
          }`}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">SPI (Schedule Performance Index)</span>
              </div>
              <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase rounded-full border ${
                SPI >= 1.0 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                  : SPI >= 0.90 
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
              }`}>
                {SPI >= 1.0 ? 'Ahead of Schedule' : SPI >= 0.90 ? 'Minor Time Lag' : 'Critical Delay'}
              </span>
            </div>

            <div className="my-3 flex items-baseline gap-2">
              <span className="text-3xl font-black font-mono tracking-tight text-white">{SPI.toFixed(2)}</span>
              <div className="flex items-center text-xs font-bold">
                {SPI >= 1.0 ? (
                  <span className="text-emerald-400 flex items-center"><TrendingUp className="w-4 h-4 mr-0.5" /> Ahead</span>
                ) : (
                  <span className="text-rose-400 flex items-center"><TrendingDown className="w-4 h-4 mr-0.5" /> {Math.abs(SV_pct).toFixed(2)}% Lag</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION B: CONTRACTUAL PAYMENT MATURITY & UNPAID CLAIMS SUMMARY */}
      <section className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm space-y-6">
        {/* Maturity Summary Indicators Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Matured Overdue Unpaid Claims (> 56 Days) - CRITICAL CARD */}
          <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
            maturedIpcCount > 0 
              ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900/60 shadow-sm' 
              : 'bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700/60'
          }`}>
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                  Matured Overdue Payments
                </span>
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                  maturedIpcCount > 0 
                    ? 'bg-rose-200 dark:bg-rose-900 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800 animate-pulse' 
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                }`}>
                  {maturedIpcCount > 0 ? `${maturedIpcCount} IPC Overdue` : 'Zero Overdue'}
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1"></span>

              <div className="mt-3">
                <span className="text-xl font-black font-mono text-rose-700 dark:text-rose-400 block">
                  {formatAccounting(maturedUnpaidCombined, 'Br.')}
                </span>
                <div className="flex gap-2 text-[11px] font-mono font-semibold text-rose-600/90 dark:text-rose-300/80 mt-1">
                  <span>ETB: {formatAccounting(maturedUnpaidEtbSum, '')}</span>
                  <span>• USD: ${maturedUnpaidUsdSum.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-rose-200/60 dark:border-rose-900/40 text-[10px] text-rose-700 dark:text-rose-400 font-medium">
            </div>
          </div>

          {/* 2. Unpaid Claims Within Maturity Window (<= 56 Days) */}
          <div className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Within Maturity Window
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  {withinMaturityIpcCount} IPC Pending
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1"></span>

              <div className="mt-3">
                <span className="text-xl font-black font-mono text-amber-700 dark:text-amber-300 block">
                  {formatAccounting(withinMaturityUnpaidCombined, 'Br.')}
                </span>
                <div className="flex gap-2 text-[11px] font-mono font-semibold text-amber-600/90 dark:text-amber-300/80 mt-1">
                  <span>ETB: {formatAccounting(withinMaturityUnpaidEtbSum, '')}</span>
                  <span>• USD: ${withinMaturityUnpaidUsdSum.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-amber-200/60 dark:border-amber-900/40 text-[10px] text-amber-700 dark:text-amber-400 font-medium">
            </div>
          </div>

          {/* 3. Total Unpaid Certified Balance */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 text-slate-500" />
                  Total Outstanding Balance
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                  {unpaidIpcCount} / {totalIpcCount} Unpaid
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1"></span>

              <div className="mt-3">
                <span className="text-xl font-black font-mono text-slate-800 dark:text-white block">
                  {formatAccounting(totalUnpaidCombined, 'Br.')}
                </span>
                <div className="flex gap-2 text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-400 mt-1">
                  <span>ETB: {formatAccounting(totalUnpaidEtbSum, '')}</span>
                  <span>• USD: ${totalUnpaidUsdSum.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              Representing {totalCertifiedCombined > 0 ? ((totalUnpaidCombined / totalCertifiedCombined) * 100).toFixed(2) : '0.00'}% of total certified claims.
            </div>
          </div>

          {/* 4. Total Paid Certified Claims */}
          <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Paid Certified Claims
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  {paidIpcCount} IPC Paid
                </span>
              </div>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1"></span>

              <div className="mt-3">
                <span className="text-xl font-black font-mono text-emerald-700 dark:text-emerald-400 block">
                  {formatAccounting(totalPaidCombined, 'Br.')}
                </span>
                <div className="flex gap-2 text-[11px] font-mono font-semibold text-emerald-600/90 dark:text-emerald-300/80 mt-1">
                  <span>ETB: {formatAccounting(totalPaidEtbSum, '')}</span>
                  <span>• USD: ${totalPaidUsdSum.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-emerald-200/60 dark:border-emerald-900/40 text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
              Settled {totalCertifiedCombined > 0 ? ((totalPaidCombined / totalCertifiedCombined) * 100).toFixed(2) : '0.00'}% of certified claims.
            </div>
          </div>
        </div>
      </section>

      {/* Section 1 remaining removed */}

      {/* Section 2 removed */}

      {/* Section 3 removed */}

      {/* Section 4 removed */}

      {/* Linked Linear Progress Charts Card (Interconnected with Segment Mapping) */}
      <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100">
              Linear Progress
            </h3>
          </div>

          {/* Chart View Mode Selector */}
          {hasSpurRoad ? (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
              <button
                type="button"
                onClick={() => setDashboardRoadType('combined')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeRoadType === 'combined'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Combined (Main + Spur)
              </button>
              <button
                type="button"
                onClick={() => setDashboardRoadType('main')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeRoadType === 'main'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Main Road Only
              </button>
              <button
                type="button"
                onClick={() => setDashboardRoadType('spur')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                  activeRoadType === 'spur'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Spur Road Only
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 px-3 py-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60 text-xs font-bold text-blue-600 dark:text-blue-400">
              Main Road
            </div>
          )}
        </div>

        {/* Linear Layer Progress Bars */}
        <div className="space-y-3">
          {dashboardProgressChartData.map((item) => (
            <div key={item.id} className="space-y-1">
              <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-300 flex-wrap gap-1">
                <span className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-sm ${item.color}`} />
                  {item.name}
                  {activeRoadType === 'combined' ? (
                    <span className="text-[10px] font-normal text-slate-400 font-mono ml-1">
                      (Main: {item.mainKm} Km | Spur: {item.spurKm} Km)
                    </span>
                  ) : (
                    <span className="text-[10px] font-normal text-slate-400 font-mono ml-1">
                      ({activeRoadType === 'main' ? item.mainSegments : item.spurSegments} segments)
                    </span>
                  )}
                </span>
                <span className="font-mono">
                  {item.displayExec.toFixed(2)} / {item.displayTarget.toFixed(2)} Km ({item.fillPct.toFixed(2)}%)
                </span>
              </div>

              {/* Progress track */}
              <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-900 rounded-md overflow-hidden border border-slate-200/30 dark:border-slate-700 relative flex">
                {activeRoadType === 'combined' ? (
                  <>
                    {/* Main road portion */}
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (item.mainKm / item.displayTarget) * 100)}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={`h-full ${item.color} transition-all duration-300 opacity-90`}
                      title={`Main Road: ${item.mainKm} Km`}
                    />
                    {/* Spur road portion */}
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100 - (item.mainKm / item.displayTarget) * 100, (item.spurKm / item.displayTarget) * 100)}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
                      className="h-full bg-emerald-500 transition-all duration-300 border-l border-white/20"
                      title={`Spur Road: ${item.spurKm} Km`}
                    />
                  </>
                ) : (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.fillPct}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className={`h-full ${item.color} transition-all duration-300`}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>


      {/* Charts Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* ROW Clearance chart */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-4 rounded-2xl shadow-sm space-y-3">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-800 dark:text-zinc-150">Right-of-Way (ROW) status</span>
            <div className="relative">
              <select
                value={selectedRowMetric}
                onChange={(e) => setSelectedRowMetric(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 text-[10px] font-bold py-1 px-3 border border-slate-250 dark:border-slate-705 pr-8 rounded-lg appearance-none cursor-pointer"
              >
                {project.rowMetrics.map((m, idx) => (
                  <option key={idx} value={m.name}>
                    {m.name} ({Number(m.value || 0).toFixed(2)} {m.unit})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rowChartData} layout="vertical" margin={{ top: 10, right: 15, left: isNumericCompare ? 15 : -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-700/30" />
                <XAxis type="number" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                <YAxis type="category" dataKey="name" stroke="#94a3b8" tick={isNumericCompare ? { fontSize: 8 } : false} />
                <Tooltip 
                  formatter={(v: any, name: any) => [
                    v !== null && v !== undefined && !isNaN(Number(v)) ? Number(v).toFixed(2) : '0.00', 
                    name
                  ]}
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }} 
                />
                <Legend iconSize={10} wrapperStyle={{ fontSize: '10px' }} />
                {isNumericCompare ? (
                  <>
                    <Bar dataKey="Requested (No)" fill="#ff3b30" radius={[0, 6, 6, 0]}>
                      <LabelList dataKey="Requested (No)" position="right" formatter={(v: any) => v !== null && v !== undefined ? Number(v).toFixed(2) : ''} style={{ fontSize: '8px', fill: '#ef4444', fontWeight: 'bold' }} />
                    </Bar>
                    <Bar dataKey="Handed Over (No)" fill="#10b981" radius={[0, 6, 6, 0]}>
                      <LabelList dataKey="Handed Over (No)" position="right" formatter={(v: any) => v !== null && v !== undefined ? Number(v).toFixed(2) : ''} style={{ fontSize: '8px', fill: '#10b981', fontWeight: 'bold' }} />
                    </Bar>
                  </>
                ) : (
                  <>
                    <Bar dataKey="Cleared KM" stackId="a" fill="#3b82f6" radius={[6, 0, 0, 6]}>
                      <LabelList dataKey="Cleared KM" position="center" formatter={(v: any) => v !== null && v !== undefined ? Number(v).toFixed(2) : ''} style={{ fontSize: '8px', fill: '#ffffff', fontWeight: 'bold' }} />
                    </Bar>
                    <Bar dataKey="Remaining KM" stackId="a" fill="#e2e8f0" radius={[0, 6, 6, 0]}>
                      <LabelList dataKey="Remaining KM" position="center" formatter={(v: any) => v !== null && v !== undefined ? Number(v).toFixed(2) : ''} style={{ fontSize: '8px', fill: '#475569', fontWeight: 'bold' }} />
                    </Bar>
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Quantities design vs actual */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-4 rounded-2xl shadow-sm space-y-3">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <span className="text-xs font-bold text-slate-800 dark:text-zinc-150">Quantities: Plan vs Completed</span>
            <div className="relative">
              <select
                value={selectedQtyItem}
                onChange={(e) => setSelectedQtyItem(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900 text-[10px] font-bold py-1 px-3 border border-slate-250 dark:border-slate-705 pr-8 rounded-lg appearance-none cursor-pointer"
              >
                {project.quantities.map((q, idx) => (
                  <option key={idx} value={q.name}>{q.name}</option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1.5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={qtyChartData} margin={{ top: 10, right: 0, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100/50 dark:stroke-slate-700/30" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} />
                <Tooltip formatter={(v) => [v, 'Value']} contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }} />
                <Bar dataKey="Value" radius={[6, 6, 0, 0]}>
                  {qtyChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                  <LabelList dataKey="Value" position="top" formatter={(v: any) => v !== null && v !== undefined ? Number(v).toFixed(2) : ''} style={{ fontSize: '8px', fill: '#64748b', fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Series Bar Chart */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-4 rounded-2xl shadow-sm space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-800 dark:text-zinc-150">Bill Series Progress</span>
            <span className="text-[10px] text-slate-400 font-medium">To-Date Progress %</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={seriesBarData} 
                layout="vertical" 
                margin={{ top: 5, right: 25, left: -20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-700/30" />
                <XAxis type="number" domain={[0, 100]} stroke="#94a3b8" tick={{ fontSize: 9 }} tickFormatter={(v) => `${Number(v).toFixed(2)}%`} />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  tick={{ fontSize: 8 }} 
                  width={110}
                />
                <Tooltip 
                  formatter={(v) => [`${parseFloat(v.toString()).toFixed(2)}%`]} 
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }} 
                />
                <Bar dataKey="Progress %" radius={[0, 4, 4, 0]}>
                  {seriesBarData.map((entry, index) => {
                    const colors = [
                      '#4f46e5', // Indigo
                      '#0ea5e9', // Sky
                      '#10b981', // Emerald
                      '#14b8a6', // Teal
                      '#f59e0b', // Amber
                      '#f97316', // Orange
                      '#ef4444', // Red
                      '#8b5cf6', // Purple
                      '#6366f1', // Slate-Indigo
                      '#ec4899', // Pink
                    ];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />;
                  })}
                  <LabelList 
                    dataKey="Progress %" 
                    position="insideRight" 
                    dx={-6}
                    formatter={(v: any) => `${Number(v).toFixed(2)}%`} 
                    style={{ fontSize: '9px', fill: '#ffffff', fontWeight: 'extrabold' }} 
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Progress target column chart */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-4 rounded-2xl shadow-sm space-y-3">
          <div className="flex flex-col gap-3 border-b border-slate-100 dark:border-slate-700/50 pb-3">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-150">Progress Comparison</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {/* 1. Month Source Dropdown */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Month</label>
                <div className="relative">
                  <select
                    value={selectedMonthSource}
                    onChange={(e) => setSelectedMonthSource(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 text-[10px] font-bold border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 pr-6 cursor-pointer appearance-none text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="current">Current ({project.progressPlanLabels?.monthLabel || 'Active'})</option>
                    {(project.progressPlanHistory || []).map(hist => (
                      <option key={hist.id} value={hist.id}>Archived: {hist.monthLabel}</option>
                    ))}
                    <option value="hide">🚫 Hide Month</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-400">
                    <ChevronDown className="h-3 w-3" />
                  </div>
                </div>
              </div>

              {/* 2. Quarter Source Dropdown */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Quarter</label>
                <div className="relative">
                  <select
                    value={selectedQuarterSource}
                    onChange={(e) => setSelectedQuarterSource(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 text-[10px] font-bold border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 pr-6 cursor-pointer appearance-none text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="current">Current ({project.progressPlanLabels?.quarterLabel || 'Active'})</option>
                    <option value="hide">🚫 Hide Quarter</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-400">
                    <ChevronDown className="h-3 w-3" />
                  </div>
                </div>
              </div>

              {/* 3. EFY Source Dropdown */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">EFY</label>
                <div className="relative">
                  <select
                    value={selectedEfySource}
                    onChange={(e) => setSelectedEfySource(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 text-[10px] font-bold border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 pr-6 cursor-pointer appearance-none text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="current">Current (EFY {project.progressPlanLabels?.efyLabel || 'Active'})</option>
                    {(project.progressPlanHistory || []).map(hist => (
                      <option key={hist.id} value={hist.id}>Archived EFY: {hist.efyLabel} ({hist.monthLabel})</option>
                    ))}
                    <option value="hide">🚫 Hide EFY</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-400">
                    <ChevronDown className="h-3 w-3" />
                  </div>
                </div>
              </div>

              {/* 4. Cumulative Source Dropdown */}
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">Cumulative</label>
                <div className="relative">
                  <select
                    value={selectedCumulativeSource}
                    onChange={(e) => setSelectedCumulativeSource(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 text-[10px] font-bold border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 pr-6 cursor-pointer appearance-none text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="current">Show Cumulative</option>
                    <option value="hide">🚫 Hide Cumulative</option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 text-slate-400">
                    <ChevronDown className="h-3 w-3" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressPlanChartData} margin={{ top: 10, right: 0, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100/50 dark:stroke-slate-700/30" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }} />
                <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
                <Bar dataKey="Contractor" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Contractor" position="top" formatter={(v: any) => v !== null && v !== undefined ? Number(v).toFixed(2) : ''} style={{ fontSize: '7.5px', fill: '#64748b', fontWeight: 'bold' }} />
                </Bar>
                <Bar dataKey="ERA" fill="#f97316" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="ERA" position="top" formatter={(v: any) => v !== null && v !== undefined ? Number(v).toFixed(2) : ''} style={{ fontSize: '7.5px', fill: '#64748b', fontWeight: 'bold' }} />
                </Bar>
                <Bar dataKey="Actual" fill="#10b981" radius={[4, 4, 0, 0]}>
                  <LabelList dataKey="Actual" position="top" formatter={(v: any) => v !== null && v !== undefined ? Number(v).toFixed(2) : ''} style={{ fontSize: '7.5px', fill: '#64748b', fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Row for Annual Payouts */}
      <div className="grid grid-cols-1 gap-4 mb-4">
        
        {/* Annual Payments Chart */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm space-y-4">
          <div>
            <span className="text-xs font-bold text-slate-800 dark:text-zinc-150 block">EFY Progress</span>
          </div>

          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={annualChartData} margin={{ top: 5, right: 0, left: -30, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-700/30" />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 9 }} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 9 }} suffix="%" domain={[0, 'auto']} />
                <Tooltip 
                  formatter={(v: any) => {
                    const parsed = parseFloat(v);
                    return [`${isNaN(parsed) ? '0.00' : parsed.toFixed(2)}%`];
                  }} 
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '10px' }}
                />
                <Bar dataKey="Payment (%)" fill="#10b981" radius={[4, 4, 0, 0]}>
                  {annualChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10b981' : '#3b82f6'} />
                  ))}
                  <LabelList dataKey="Payment (%)" position="top" formatter={(v) => {
                    const parsed = parseFloat(String(v));
                    return `${isNaN(parsed) ? '0.00' : parsed.toFixed(2)}%`;
                  }} style={{ fontSize: '7.5px', fill: '#64748b', fontWeight: 'bold' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Expanded Performance Charts & Core Physical S-Curves */}
      <section className="space-y-4 font-sans text-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
          Core S-Curve & Financial Disbursement Baselines
        </h3>

        {/* Bill Summary & Price Adjustment Cumulative Graph Chart */}
        <BillSummaryPriceAdjChart 
          ipcTracker={project.ipcTracker || []} 
          usdExchangeRate={project.usdExchangeRate} 
        />

        {/* Payment Road-Profile-Style Chart */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-150 block">Payment Chart</span>
            </div>
            <span className="text-[10px] font-extrabold uppercase bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-lg self-start sm:self-auto border border-emerald-100 dark:border-emerald-900/30 font-sans">
              Financial Elevation Map
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {paymentChartData.map((entry, index) => {
              const bgColors = [
                'bg-blue-600 dark:bg-blue-500',
                'bg-emerald-600 dark:bg-emerald-500',
                'bg-amber-500 dark:bg-amber-500',
                'bg-rose-500 dark:bg-rose-550',
                'bg-indigo-600 dark:bg-indigo-500',
                'bg-cyan-600 dark:bg-cyan-500',
                'bg-teal-600 dark:bg-teal-500'
              ];
              const progressColor = bgColors[index % bgColors.length];
              const paidPercent = entry['Paid (%)'];
              const amountBirr = entry['Amount (Birr)'];

              return (
                <div key={entry.name} className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5 font-sans">
                      <span className={`w-2.5 h-2.5 rounded-sm ${progressColor}`} />
                      <span className="text-slate-700 dark:text-zinc-250 truncate max-w-xs">{entry.name}</span>
                    </span>
                    <span className="font-mono text-[10px] flex items-center gap-1.5">
                      <span className="text-slate-700 dark:text-slate-300 font-extrabold">{formatAccounting(amountBirr, 'Br.')}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                        {((paidPercent !== undefined && paidPercent !== null && !isNaN(Number(paidPercent))) ? Number(paidPercent) : 0).toFixed(2)}%
                      </span>
                    </span>
                  </div>

                  {/* Horizontal Linear progression bar - Road Profile Style */}
                  <div className="w-full h-4.5 bg-slate-100 dark:bg-slate-900/80 rounded-lg overflow-hidden border border-slate-200/40 dark:border-slate-800 relative shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (paidPercent !== undefined && paidPercent !== null && !isNaN(Number(paidPercent))) ? Number(paidPercent) : 0)}%` }}
                      transition={{ duration: 1 }}
                      className={`h-full ${progressColor} opacity-95 relative rounded-l-md transition-all duration-300`}
                    />

                    {/* Milestone / Ticks Overlay */}
                    <div className="absolute inset-0 flex justify-between px-3 pointer-events-none select-none text-[8px] font-bold text-slate-400 dark:text-slate-500/80 items-center">
                      <span className="mix-blend-difference">0%</span>
                      <span className="mix-blend-difference border-l border-dotted border-slate-300 dark:border-slate-700/40 h-full flex items-center pl-1">25%</span>
                      <span className="mix-blend-difference border-l border-dotted border-slate-300 dark:border-slate-700/40 h-full flex items-center pl-1">50%</span>
                      <span className="mix-blend-difference border-l border-dotted border-slate-300 dark:border-slate-700/40 h-full flex items-center pl-1">75%</span>
                      <span className="mix-blend-difference border-l border-dotted border-slate-300 dark:border-slate-700/40 h-full flex items-center pl-1">100%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* S-Curve Chart (Now beautifully placed as the bottom-most full-width chart option) */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-zinc-150 block">Cumulative S-Curve Performance</span>
            </div>
            <span className="text-[10px] font-extrabold uppercase bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-lg self-start sm:self-auto border border-emerald-105 dark:border-emerald-900/30">
              Live S-Curve Map
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sCurveChartData} margin={{ top: 10, right: 10, left: -25, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-700/30" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" domain={[0, 100]} unit="%" />
                <Tooltip 
                  formatter={(val: any) => [`${Number(val || 0).toFixed(2)}%`]}
                  contentStyle={{ 
                    backgroundColor: '#0f172a', 
                    borderRadius: '12px', 
                    border: 'none', 
                    color: '#fff',
                    fontSize: '11px',
                    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                  }} 
                />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '11px' }} />
                <Line 
                  name="Original Plan (%)"
                  type="monotone" 
                  dataKey="Original Plan (%)" 
                  stroke="#eab308" 
                  strokeDasharray="4 4"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line 
                  name="Revised Plan (%)"
                  type="monotone" 
                  dataKey="Revised Plan (%)" 
                  stroke="#3b82f6" 
                  strokeDasharray="3 3"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line 
                  name="To-Date Actual (%)"
                  type="monotone" 
                  dataKey="To-Date Actual (%)" 
                  stroke="#10b981" 
                  strokeWidth={3}
                  dot={{ r: 3 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ERA Key Performance Indicators Gauges (Placed directly below Cumulative S-Curve Performance chart) */}
      <section className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-6 rounded-2xl shadow-sm">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4 flex items-center gap-1.5">
          <Layers className="w-4 h-4 text-blue-500" />
          ERA Key Performance Indicators
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {/* Cost Gauge */}
          <CircularGauge 
            value={costOverrun} 
            label="Cost Overrun" 
            max={100} 
            isCost 
            kpiCode="G3"
            kpiScore={getKpiGoalScore('G3')}
            onKpiClick={() => onSwitchTab && onSwitchTab('seriesEditor')}
          />

          {/* Time Gauge */}
          <CircularGauge 
            value={timeOverrun} 
            label="Time Overrun" 
            max={100} 
            isCost 
            kpiCode="G4"
            kpiScore={getKpiGoalScore('G4')}
            onKpiClick={() => onSwitchTab && onSwitchTab('workProgram')}
          />

          {/* Quality Gauge */}
          <CircularGauge 
            value={kpiScores.quality} 
            label="Quality Management" 
            kpiCode="G5"
            kpiScore={getKpiGoalScore('G5')}
            onKpiClick={() => onSwitchTab && onSwitchTab('kpiEditor')}
          />

          {/* Design Gauge */}
          <CircularGauge 
            value={kpiScores.design} 
            label="Design Management" 
            kpiCode="G6"
            kpiScore={getKpiGoalScore('G6')}
            onKpiClick={() => onSwitchTab && onSwitchTab('kpiEditor')}
          />

          {/* Claims Gauge */}
          <CircularGauge 
            value={kpiScores.claims} 
            label="Claim & Dispute" 
            kpiCode="G7"
            kpiScore={getKpiGoalScore('G7')}
            onKpiClick={() => onSwitchTab && onSwitchTab('kpiEditor')}
          />

          {/* Risk (G8) Custom Gauge Card */}
          <div 
            onClick={() => onSwitchTab && onSwitchTab('risks')}
            className={`flex flex-col items-center justify-between bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-300 w-full cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 relative overflow-hidden text-center min-h-[300px] ${
              hasHighValueRisk 
                ? 'animate-[pulse_1.8s_infinite] shadow-[0_0_12px_rgba(239,68,68,0.2)] border-rose-300 dark:border-rose-900/50 bg-rose-500/[0.02]' 
                : ''
            }`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-transparent dark:from-slate-700/10 dark:to-transparent pointer-events-none" />
            
            <div className="w-full flex flex-col items-center gap-1">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block leading-none">Risk (G8)</span>
              
              {/* Top Registered Threats below Risk G8 wording */}
              <span 
                className="block text-rose-500 dark:text-rose-400 font-medium"
                style={{ 
                  fontFamily: "'Times New Roman', Times, serif", 
                  fontSize: '11px', 
                  letterSpacing: '0.02em',
                  lineHeight: '1.2'
                }}
              >
                Top Registered Threats (Hazard Category Only)
              </span>

              {/* Numbered Threats List above the gauge */}
              <div className="w-full flex flex-col items-center gap-1.5 my-2.5">
                {project.risks && [...project.risks]
                  .sort((a, b) => (b.probability * b.impact) - (a.probability * a.impact))
                  .slice(0, 3)
                  .map((risk, index) => {
                    return (
                      <div 
                        key={risk.id} 
                        className="text-slate-750 dark:text-zinc-200 leading-none text-center bg-slate-50/60 dark:bg-slate-900/40 px-3 py-1.5 rounded-lg border border-slate-100/50 dark:border-slate-700/30 w-full max-w-[220px]"
                        style={{ 
                          fontFamily: "'Times New Roman', Times, serif", 
                          fontSize: '11px', 
                          fontWeight: 'normal'
                        }}
                      >
                        {index + 1}. {risk.category.trim()}
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Gauge visual */}
            <div className="w-full max-w-[130px] aspect-square flex-shrink-0 relative flex items-center justify-center rounded-2xl mx-auto">
              <CircularGauge 
                value={kpiScores.risk} 
                label="" 
                kpiCode="G8"
                kpiScore={getKpiGoalScore('G8')}
                variant="compact"
              />
            </div>

            {/* Label text at the bottom matching other gauge labels */}
            <span className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-300 text-center tracking-wide group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors duration-200">
              Risk Management
            </span>
          </div>

          {/* ESOHS Gauge */}
          <CircularGauge 
            value={kpiScores.esohs} 
            label="ESOHS Management" 
            kpiCode="G9"
            kpiScore={getKpiGoalScore('G9')}
            onKpiClick={() => onSwitchTab && onSwitchTab('kpiEditor')}
          />

          {/* ROW Gauge */}
          <CircularGauge 
            value={kpiScores.row} 
            label="ROW Management" 
            kpiCode="G10"
            kpiScore={getKpiGoalScore('G10')}
            onKpiClick={() => onSwitchTab && onSwitchTab('rowEditor')}
          />

          {/* Stakeholder Gauge */}
          <CircularGauge 
            value={kpiScores.stake} 
            label="Stakeholder Management" 
            kpiCode="G11"
            kpiScore={getKpiGoalScore('G11')}
            onKpiClick={() => onSwitchTab && onSwitchTab('kpiEditor')}
          />

          {/* Contract Gauge */}
          <CircularGauge 
            value={kpiScores.contract} 
            label="Contract Compliance" 
            kpiCode="G12"
            kpiScore={getKpiGoalScore('G12')}
            onKpiClick={() => onSwitchTab && onSwitchTab('kpiEditor')}
          />
        </div>
      </section>



      {/* Drag & Drop Upload gallery */}
      <section className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2">
          <span className="font-bold text-xs flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
            <ImageIcon className="w-4 h-4 text-emerald-500 animate-pulse" />
            Field Engineering Image Gallery
          </span>
          <button
            onClick={onClearImages}
            disabled={project.images.length === 0}
            className="flex items-center gap-1 text-2xs bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-455 px-2.5 py-1 rounded-lg font-extrabold transition disabled:opacity-50"
          >
            Clear Gallery
          </button>
        </div>

        {/* Drag Drop Input Section */}
        <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-6 text-center hover:border-blue-500 transition duration-150 relative">
          <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <span className="font-semibold block text-xs">Drag and drop site photos here or click below</span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Supports PNG, JPG, WebP formats</span>
          <input 
            type="file" 
            accept="image/*"
            multiple
            onChange={handleImageChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          />
        </div>

        {/* Grid Lists of Images */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
          <AnimatePresence>
            {project.images.map((img, idx) => (
              <motion.div
                key={idx}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative group aspect-square rounded-xl overflow-hidden border border-slate-150 dark:border-slate-700 shadow-sm"
              >
                <img 
                  src={img} 
                  alt={`road-site-${idx}`}
                  className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                />
                
                {/* Remove button */}
                <button
                  onClick={() => onRemoveImage(idx)}
                  className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-rose-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition"
                  title="Remove image"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {project.images.length === 0 && (
          <p className="text-center text-xs text-slate-400 font-medium py-3">
            No site photos uploaded. Upload photos to document physical construction developments.
          </p>
        )}
      </section>

      </div>
    </div>
  );
}
