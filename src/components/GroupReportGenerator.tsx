import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { 
  FileText, 
  Download, 
  X, 
  Search, 
  TrendingUp, 
  DollarSign, 
  Briefcase, 
  AlertTriangle,
  Building,
  Layers,
  ChevronDown,
  ChevronUp,
  Table,
  Eye,
  CheckCircle2,
  FileSpreadsheet,
  UserCheck
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Project, User, formatAccounting } from '../types';
import { buildKpiHierarchy, getIntegratedKpiAllocated } from '../data/defaultProject';
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

interface GroupReportGeneratorProps {
  projects: Project[];
  currentUserObj: User;
  programDirectorates: string[];
  pmos: string[];
  onClose: () => void;
}

export default function GroupReportGenerator({
  projects,
  currentUserObj,
  programDirectorates,
  pmos,
  onClose
}: GroupReportGeneratorProps) {
  const [groupType, setGroupType] = useState<'directorate' | 'pmo' | 'contractor' | 'consultant'>('directorate');
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'progress' | 'value'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [reportMode, setReportMode] = useState<'performance' | 'audit' | 'payments' | 'bonds'>('performance');
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);
  const [maturedFilterOnly, setMaturedFilterOnly] = useState(false);

  // Helper check for project access (matching standard view limits) - all users share the single database
  const isAccessible = (p: Project) => {
    return true;
  };

  // Detailed Project Compliance & Performance Audit calculator
  // Detailed Project Compliance & Performance Audit calculator
  const getAuditMetrics = (p: Project) => {
    // 1. Time & Schedule Audit
    let timeElapsedPct = 0;
    let elapsedDays = 0;
    const start = p.startDate ? new Date(p.startDate) : null;
    const totalDays = (p.origDays || 0) + (p.eotDays || 0) + (p.interimEotDays || 0);
    const today = new Date().getFullYear() < 2026 ? new Date('2026-06-26') : new Date();
    
    if (start && !isNaN(start.getTime()) && totalDays > 0) {
      const diff = today.getTime() - start.getTime();
      elapsedDays = Math.max(0, diff / (1000 * 60 * 60 * 24));
      timeElapsedPct = Math.min(100, (elapsedDays / totalDays) * 100);
    }
    
    const progressVal = p.physicalProgress || 0;
    let scheduleStatus: 'Compliant' | 'Warning' | 'Critical' = 'Compliant';
    let scheduleStatusText = 'On Track';
    
    if (timeElapsedPct > 100 && progressVal < 95) {
      scheduleStatus = 'Critical';
      scheduleStatusText = 'Time Overrun';
    } else if (timeElapsedPct > progressVal + 15) {
      scheduleStatus = 'Warning';
      scheduleStatusText = 'Slipping Delay';
    }

    // 2. Guarantees & Bonds Audit
    // Consider any bond or guarantee that is recovered, returned or fully amortized as a valid bond
    const bondsList = (p.bonds || []).filter(b => b.status !== 'N/A');
    const totalBonds = bondsList.length;
    const expiredBondsCount = bondsList.filter(b => {
      if (b.status && (b.status.toLowerCase().includes('recovered') || b.status.toLowerCase().includes('returned') || b.status.toLowerCase().includes('amortized'))) return false;
      if (b.status === 'Expired') return true;
      if (b.expireDate) {
        try {
          const exp = new Date(b.expireDate);
          return exp < today;
        } catch {
          return false;
        }
      }
      return false;
    }).length;

    let guaranteeStatus: 'Compliant' | 'Critical' = 'Compliant';
    if (expiredBondsCount > 0) {
      guaranteeStatus = 'Critical';
    }

    // 3. Risks & Mitigations Audit
    const risksList = p.risks || [];
    const activeRisks = risksList.filter(r => r.status === 'Active');
    const criticalRisksCount = activeRisks.filter(r => (r.impact * r.probability) >= 12).length;

    // 4. EVM Parameters: actual cost is equal to the Total Todate certified IPC, Earned Value is equal to actual cost times % physical progress
    const BAC = (p.origAmount || 0) * 1_000_000;
    const AC = ((p.payment || []).find(x => x.item.trim().toLowerCase() === 'total todate certified ipc') || { amount: 0 }).amount;
    const EV = AC * ((p.physicalProgress || 0) / 100);
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
    const CPI = AC > 0 ? (EV / AC) : 0.942;
    const SPI = PV > 0 ? (EV / PV) : 0.887;
    const timeOverrunPct = p.origDays > 0 ? ((p.eotDays || 0) / p.origDays) * 100 : 0;

    // 5. Linear layers based on Engineering Quantities & Construction Conformance Plan
    const activitiesList = p.workProgram || [];
    const findActByKeywords = (keywords: string[]) => {
      return activitiesList.find(a => 
        keywords.some(k => a.name.toLowerCase().includes(k) || a.id.toLowerCase() === k)
      );
    };
    const subgradeAct = findActByKeywords(['subgrade', 'site clearance', 'earthwork', 'excavation', 'b', 'c']);
    const cappingAct = findActByKeywords(['capping', 'embankment']);
    const subbaseAct = findActByKeywords(['subbase', 'sub-base', 'e']);
    const basecourseAct = findActByKeywords(['basecourse', 'base course', 'road base', 'f']);
    const asphaltAct = findActByKeywords(['asphalt', 'paving', 'bituminous', 'surfacing', 'g']);

    const getActivityPlannedPct = (act?: any) => {
      if (!act) return null;
      const startStr = act.start;
      const finishStr = act.finish;
      if (!startStr || !finishStr) return null;
      try {
        const s = new Date(startStr);
        const f = new Date(finishStr);
        if (isNaN(s.getTime()) || isNaN(f.getTime())) return null;
        if (f <= s) return 100;
        
        const totalDuration = f.getTime() - s.getTime();
        const elapsed = today.getTime() - s.getTime();
        
        if (elapsed < 0) return 0;
        if (elapsed >= totalDuration) return 100;
        return (elapsed / totalDuration) * 100;
      } catch {
        return null;
      }
    };

    const origSubgradeTotal = (p.linear?.subgrade || []).reduce((sum: number, r: any) => sum + (r.exec || 0), 0);
    const origCappingTotal = (p.linear?.capping || []).reduce((sum: number, r: any) => sum + (r.exec || 0), 0);
    const origSubbaseTotal = (p.linear?.subbase || []).reduce((sum: number, r: any) => sum + (r.exec || 0), 0);
    const origBasecourseTotal = (p.linear?.basecourse || []).reduce((sum: number, r: any) => sum + (r.exec || 0), 0);
    const origAsphaltTotal = (p.linear?.asphalt || []).reduce((sum: number, r: any) => sum + (r.exec || 0), 0);

    const fallbackSubgradePct = p.lengthKm > 0 ? Math.min(100, (origSubgradeTotal / p.lengthKm) * 100) : 0;
    const fallbackCappingPct = p.lengthKm > 0 ? Math.min(100, (origCappingTotal / p.lengthKm) * 100) : 0;
    const fallbackSubbasePct = p.lengthKm > 0 ? Math.min(100, (origSubbaseTotal / p.lengthKm) * 100) : 0;
    const fallbackBasecoursePct = p.lengthKm > 0 ? Math.min(100, (origBasecourseTotal / p.lengthKm) * 100) : 0;
    const fallbackAsphaltPct = p.lengthKm > 0 ? Math.min(100, (origAsphaltTotal / p.lengthKm) * 100) : 0;

    const subgradePlanRaw = getActivityPlannedPct(subgradeAct) ?? Math.min(100, plannedPct * 1.25);
    const cappingPlanRaw = getActivityPlannedPct(cappingAct) ?? Math.min(100, plannedPct * 1.12);
    const subbasePlanRaw = getActivityPlannedPct(subbaseAct) ?? plannedPct;
    const basecoursePlanRaw = getActivityPlannedPct(basecourseAct) ?? Math.max(0, plannedPct - 10);
    const asphaltPlanRaw = getActivityPlannedPct(asphaltAct) ?? Math.max(0, plannedPct - 22);

    const getQtyLayerProgress = (keywords: string[], fallbackPct: number, fallbackPlan: number) => {
      const qList = p.quantities || [];
      const item = qList.find(q => keywords.some(k => q.name.toLowerCase().includes(k.toLowerCase())));
      if (item && item.design > 0) {
        return {
          pct: Math.min(100, (item.exec / item.design) * 100),
          plan: Math.min(100, (item.plan / item.design) * 100)
        };
      }
      return { pct: fallbackPct, plan: fallbackPlan };
    };

    const subgradeData = getQtyLayerProgress(['common excavation', 'site clearing', 'subgrade', 'earthwork'], fallbackSubgradePct, subgradePlanRaw);
    const cappingData = getQtyLayerProgress(['capping'], fallbackCappingPct, cappingPlanRaw);
    const subbaseData = getQtyLayerProgress(['sub base', 'subbase'], fallbackSubbasePct, subbasePlanRaw);
    const basecourseData = getQtyLayerProgress(['base course', 'basecourse'], fallbackBasecoursePct, basecoursePlanRaw);
    const asphaltData = getQtyLayerProgress(['asphalt concrete', 'asphalt'], fallbackAsphaltPct, asphaltPlanRaw);

    const subgradePct = subgradeData.pct;
    const subgradePlan = subgradeData.plan;
    const cappingPct = cappingData.pct;
    const cappingPlan = cappingData.plan;
    const subbasePct = subbaseData.pct;
    const subbasePlan = subbaseData.plan;
    const basecoursePct = basecourseData.pct;
    const basecoursePlan = basecourseData.plan;
    const asphaltPct = asphaltData.pct;
    const asphaltPlan = asphaltData.plan;

    // 6. Comprehensive Weightage-Based Score Calculation
    // Total: 100 Points across 5 Dimensions:
    // Dimension 1: FIDIC contract Compliance (10% weightage) - Bonds & Notices
    const bondRatio = totalBonds > 0 ? (totalBonds - expiredBondsCount) / totalBonds : 1.0;
    const fidicBondScore = 7.0 * bondRatio;
    const fidicNoticeScore = Math.max(0, 3.0 - (criticalRisksCount * 1.0));
    const fidicScore = Math.min(10, Math.max(0, fidicBondScore + fidicNoticeScore));

    // Dimension 2: Project Management (35% weightage) - Time & progress
    // If time overrun is below 10%, give full mark (35). Afterwards proportionally deduct weightage based on original project duration.
    let pmScore = 35;
    if (timeOverrunPct > 10) {
      const excessOverrun = timeOverrunPct - 10;
      const deduction = (excessOverrun / 100) * 35;
      pmScore = Math.max(0, Math.min(35, 35 - deduction));
    }

    // Dimension 3: EVM Metrics (25% weightage) - CPI (12.5%) & SPI (12.5%)
    // Give full mark if 1.0 or above; if below 1.0 deduct mark proportionally down to zero
    const cpiScore = CPI >= 1.0 ? 12.5 : Math.max(0, 12.5 * CPI);
    const spiScore = SPI >= 1.0 ? 12.5 : Math.max(0, 12.5 * SPI);
    const evmScore = cpiScore + spiScore;

    // Dimension 4: Key Performance Indicators (15% weightage)
    const kpiBaseScore = 15;
    const kpiDeductions = (expiredBondsCount * 3) + (criticalRisksCount * 1.5);
    const kpiScore = Math.max(0, kpiBaseScore - kpiDeductions);

    // Dimension 5: Linear Layer Progress vs. S-Curve (15% weightage)
    const averageLayerPct = (subgradePct + cappingPct + subbasePct + basecoursePct + asphaltPct) / 5;
    const linearScore = Math.min(15, 15 * (averageLayerPct / 100));

    // Calculate Raw Weighted Score (Out of 100)
    const progressVsTimeScore = pmScore;
    const linearLayersScore = linearScore;
    const riskAndBondScore = fidicScore;
    const rawWeightedScore = fidicScore + pmScore + evmScore + kpiScore + linearScore;

    // No additional penalty for breach during evaluation
    const breachPenalties = 0;
    const activeBreaches: string[] = [];
    
    if (CPI < 0.85) {
      activeBreaches.push("CPI < 0.85 (Cost Underperformance)");
    }
    if (SPI < 0.85) {
      activeBreaches.push("SPI < 0.85 (Schedule Slippage)");
    }
    if (expiredBondsCount > 0) {
      activeBreaches.push("Expired Performance/Mobilization Guarantees");
    }
    if (criticalRisksCount > 2) {
      activeBreaches.push("High density of unmitigated critical risks");
    }
    if (timeOverrunPct > 20) {
      activeBreaches.push("EOT Time Overrun exceeds 20%");
    }

    const complianceScore = Math.round(Math.max(0, Math.min(100, rawWeightedScore)));

    let ratingClass = 'Grade A: Exceptional Performance / Low Risk';
    let ratingCode = 'A';
    let textColor = 'text-emerald-600 dark:text-emerald-400';
    let bgColor = 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40';
    let hexColor = '#16a34a';

    if (complianceScore >= 90) {
      ratingClass = 'Grade A: Exceptional Performance / Low Risk';
      ratingCode = 'A';
      textColor = 'text-emerald-600 dark:text-emerald-400';
      bgColor = 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40';
      hexColor = '#16a34a';
    } else if (complianceScore >= 75) {
      ratingClass = 'Grade B: Satisfactory / Minor Variance';
      ratingCode = 'B';
      textColor = 'text-teal-600 dark:text-teal-400';
      bgColor = 'bg-teal-50 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40';
      hexColor = '#0d9488';
    } else if (complianceScore >= 60) {
      ratingClass = 'Grade C: Marginal / Needs Intervention';
      ratingCode = 'C';
      textColor = 'text-amber-600 dark:text-amber-400';
      bgColor = 'bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40';
      hexColor = '#d97706';
    } else if (complianceScore >= 45) {
      ratingClass = 'Grade D: Unsatisfactory / High Risk';
      ratingCode = 'D';
      textColor = 'text-orange-600 dark:text-orange-400';
      bgColor = 'bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40';
      hexColor = '#ea580c';
    } else {
      ratingClass = 'Grade F: Critical Breach / Non-Compliant';
      ratingCode = 'F';
      textColor = 'text-red-600 dark:text-rose-400';
      bgColor = 'bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40';
      hexColor = '#dc2626';
    }

    return {
      timeElapsedPct,
      elapsedDays,
      totalDays,
      scheduleStatus,
      scheduleStatusText,
      totalBonds,
      expiredBondsCount,
      guaranteeStatus,
      activeRisksCount: activeRisks.length,
      criticalRisksCount,
      complianceScore,
      ratingClass,
      ratingCode,
      textColor,
      bgColor,
      hexColor,
      CPI,
      SPI,
      timeOverrunPct,
      subgradePct,
      cappingPct,
      subbasePct,
      basecoursePct,
      asphaltPct,
      subgradePlan,
      cappingPlan,
      subbasePlan,
      basecoursePlan,
      asphaltPlan,
      plannedPct,
      progressVsTimeScore,
      spiScore,
      cpiScore,
      linearLayersScore,
      riskAndBondScore,
      breachPenalties,
      activeBreaches,
      averageLayerPct
    };
  };

  const getProjectKpiScores = (p: Project) => {
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

  const getFidicEvaluation = (p: Project, role: 'contractor' | 'consultant') => {
    const today = new Date().getFullYear() < 2026 ? new Date('2026-06-26') : new Date();
    const progressVal = p.physicalProgress || 0;
    const monthlyList = p.monthly || [];
    const plannedPct = monthlyList.length 
      ? Math.max(...monthlyList.map(m => m.revisedPlan || m.originalPlan || 0)) 
      : 100;
    const audit = getAuditMetrics(p);
    const isDB = p.contractType === 'DB';

    if (role === 'contractor') {
      if (isDB) {
        // --- YELLOW BOOK 2017 DESIGN-BUILD CONTRACTOR EVALUATION ---
        // 1. Clause 4.1: General Obligations (Design & Execution)
        let clause4_1_Score = 100;
        let clause4_1_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause4_1_Details = 'Contractor is executing design and build obligations in alignment with Employer Requirements.';
        
        if (progressVal < plannedPct * 0.7) {
          clause4_1_Score = 45;
          clause4_1_Rating = 'Critical Breach';
          clause4_1_Details = `Severe design-build execution lag (Actual: ${progressVal.toFixed(2)}% vs Plan: ${plannedPct.toFixed(2)}%). Breach of general diligence.`;
        } else if (progressVal < plannedPct * 0.9) {
          clause4_1_Score = 75;
          clause4_1_Rating = 'Minor Deficiency';
          clause4_1_Details = `Moderate progress/design delay (Actual: ${progressVal.toFixed(2)}% vs Plan: ${plannedPct.toFixed(2)}%). Requires updated integration.`;
        }

        // 2. Clause 4.2: Performance Security (Performance Bonds Validation)
        let clause4_2_Score = 100;
        let clause4_2_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause4_2_Details = 'Valid Performance Security is maintained in full force and effect.';
        
        const perfBonds = (p.bonds || []).filter(b => b.type.toLowerCase().includes('performance'));
        const expiredPerfBonds = perfBonds.filter(b => {
          if (b.status && (b.status.toLowerCase().includes('recovered') || b.status.toLowerCase().includes('returned') || b.status.toLowerCase().includes('amortized') || b.status === 'N/A')) return false;
          if (b.status === 'Expired') return true;
          if (b.expireDate) {
            try { return new Date(b.expireDate) < today; } catch { return false; }
          }
          return false;
        });

        if (perfBonds.length === 0) {
          clause4_2_Score = 50;
          clause4_2_Rating = 'Minor Deficiency';
          clause4_2_Details = 'No recorded Performance Bond. Immediate submission and clarification required.';
        } else if (expiredPerfBonds.length > 0) {
          clause4_2_Score = 20;
          clause4_2_Rating = 'Critical Breach';
          clause4_2_Details = 'Performance Security has expired or lapsed! Immediate contract suspension risk under Sub-Clause 4.2.1.';
        }

        // 3. Clause 5.1 & 5.2: Design Obligations & Documents (Yellow Book Exclusive)
        let clause5_1_Score = 100;
        let clause5_1_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause5_1_Details = 'Design submissions, technical specs, and Contractor\'s Documents conform to standards.';

        const desGoal = getProjectKpiScores(p).find(g => g.id === 'G6')?.score ?? 85;
        clause5_1_Score = Math.round(desGoal);
        if (desGoal < 60) {
          clause5_1_Rating = 'Critical Breach';
          clause5_1_Details = `Critical design deficiencies or submission delays. Technical Specs are non-conforming (Score: ${desGoal.toFixed(2)}%).`;
        } else if (desGoal < 80) {
          clause5_1_Rating = 'Minor Deficiency';
          clause5_1_Details = `Minor design submission gaps or backlog in design approval requests (Score: ${desGoal.toFixed(2)}%).`;
        } else {
          clause5_1_Details = `Contractor's design documents and technical proposals are fully compliant (Score: ${desGoal.toFixed(2)}%).`;
        }

        // 4. Clause 8.3: Programme Adherence (Design & Build)
        let clause8_3_Score = 100;
        let clause8_3_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause8_3_Details = 'Programme submissions are up to date and integrate design phases.';

        if (audit.SPI < 0.75) {
          clause8_3_Score = 40;
          clause8_3_Rating = 'Critical Breach';
          clause8_3_Details = `Critical schedule deviation (SPI: ${audit.SPI.toFixed(3)}). Overdue submission of revised Clause 8.3 Design-Build Programme.`;
        } else if (audit.SPI < 0.90) {
          clause8_3_Score = 75;
          clause8_3_Rating = 'Minor Deficiency';
          clause8_3_Details = `Slight schedule slippage (SPI: ${audit.SPI.toFixed(3)}). Design-Build coordination requires acceleration.`;
        }

        // 5. Clause 4.21: Progress Reports (Reporting Frequency)
        let clause4_21_Score = 100;
        let clause4_21_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause4_21_Details = 'Monthly Progress Reports (incorporating design reviews) are regularly prepared.';

        if (p.monthly.length < 3) {
          clause4_21_Score = 50;
          clause4_21_Rating = 'Minor Deficiency';
          clause4_21_Details = 'Sparse monthly progress data. Design progress reporting is under-performing.';
        }

        // 6. Clause 14.2: Advance Payment Guarantee (Mobilization Bonds Validation)
        let clause14_2_Score = 100;
        let clause14_2_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause14_2_Details = 'Advance Payment Guarantees are valid or systematically recovered via IPC amortizations.';

        const advBonds = (p.bonds || []).filter(b => b.type.toLowerCase().includes('advance') || b.type.toLowerCase().includes('mobil'));
        const expiredAdvBonds = advBonds.filter(b => {
          if (b.status && (b.status.toLowerCase().includes('recovered') || b.status.toLowerCase().includes('returned') || b.status.toLowerCase().includes('amortized') || b.status === 'N/A')) return false;
          if (b.status === 'Expired') return true;
          if (b.expireDate) {
            try { return new Date(b.expireDate) < today; } catch { return false; }
          }
          return false;
        });

        if (expiredAdvBonds.length > 0) {
          clause14_2_Score = 30;
          clause14_2_Rating = 'Critical Breach';
          clause14_2_Details = 'Advance Payment Guarantee has expired prior to full recovery. Breach of Clause 14.2.';
        } else if (advBonds.length === 0 && p.provisionalSum > 0) {
          clause14_2_Score = 80;
          clause14_2_Rating = 'Minor Deficiency';
          clause14_2_Details = 'No advance guarantee logged for amortization checking.';
        }

        const clauses = [
          { id: '4.1', title: "Clause 4.1: General Obligations (Design & Build)", score: clause4_1_Score, rating: clause4_1_Rating, details: clause4_1_Details },
          { id: '4.2', title: "Clause 4.2: Performance Security", score: clause4_2_Score, rating: clause4_2_Rating, details: clause4_2_Details },
          { id: '5.1', title: "Clause 5.1 & 5.2: Design Obligations", score: clause5_1_Score, rating: clause5_1_Rating, details: clause5_1_Details },
          { id: '8.3', title: "Clause 8.3: Programme Adherence", score: clause8_3_Score, rating: clause8_3_Rating, details: clause8_3_Details },
          { id: '4.21', title: "Clause 4.21: Progress Reports", score: clause4_21_Score, rating: clause4_21_Rating, details: clause4_21_Details },
          { id: '14.2', title: "Clause 14.2: Advance Guarantee", score: clause14_2_Score, rating: clause14_2_Rating, details: clause14_2_Details },
        ];

        const averageScore = Math.round(clauses.reduce((sum, c) => sum + c.score, 0) / clauses.length);
        return {
          role: 'Contractor',
          name: p.contractor || 'N/A',
          clauses,
          averageScore
        };
      } else {
        // --- RED BOOK 2017 DESIGN-BID-BUILD CONTRACTOR EVALUATION ---
        // 1. Clause 4.1: General Obligations (Physical Execution Quality vs Schedule Plan)
        let clause4_1_Score = 100;
        let clause4_1_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause4_1_Details = 'Contractor is actively executing physical works in accordance with design specs.';
        
        if (progressVal < plannedPct * 0.7) {
          clause4_1_Score = 45;
          clause4_1_Rating = 'Critical Breach';
          clause4_1_Details = `Severe progress lag (Actual: ${progressVal.toFixed(2)}% vs Plan: ${plannedPct.toFixed(2)}%). Breach of general execution diligence.`;
        } else if (progressVal < plannedPct * 0.9) {
          clause4_1_Score = 75;
          clause4_1_Rating = 'Minor Deficiency';
          clause4_1_Details = `Moderate progress delay (Actual: ${progressVal.toFixed(2)}% vs Plan: ${plannedPct.toFixed(2)}%). Requires minor recovery actions.`;
        }

        // 2. Clause 4.2: Performance Security (Performance Bonds Validation)
        let clause4_2_Score = 100;
        let clause4_2_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause4_2_Details = 'Valid Performance Security is maintained in full force and effect.';
        
        const perfBonds = (p.bonds || []).filter(b => b.type.toLowerCase().includes('performance'));
        const expiredPerfBonds = perfBonds.filter(b => {
          if (b.status && (b.status.toLowerCase().includes('recovered') || b.status.toLowerCase().includes('returned') || b.status.toLowerCase().includes('amortized') || b.status === 'N/A')) return false;
          if (b.status === 'Expired') return true;
          if (b.expireDate) {
            try { return new Date(b.expireDate) < today; } catch { return false; }
          }
          return false;
        });

        if (perfBonds.length === 0) {
          clause4_2_Score = 50;
          clause4_2_Rating = 'Minor Deficiency';
          clause4_2_Details = 'No recorded Performance Bond. Immediate submission and clarification required.';
        } else if (expiredPerfBonds.length > 0) {
          clause4_2_Score = 20;
          clause4_2_Rating = 'Critical Breach';
          clause4_2_Details = 'Performance Security has expired or lapsed! Immediate contract suspension risk under Sub-Clause 4.2.1.';
        }

        // 3. Clause 8.3: Programme (Schedule Compliance & Submissions)
        let clause8_3_Score = 100;
        let clause8_3_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause8_3_Details = 'Programme submissions are up to date with acceptable schedule indices (SPI >= 1.0).';

        if (audit.SPI < 0.75) {
          clause8_3_Score = 40;
          clause8_3_Rating = 'Critical Breach';
          clause8_3_Details = `Critical schedule deviation (SPI: ${audit.SPI.toFixed(3)}). Revised Clause 8.3 programme submission is overdue.`;
        } else if (audit.SPI < 0.90) {
          clause8_3_Score = 75;
          clause8_3_Rating = 'Minor Deficiency';
          clause8_3_Details = `Slight schedule slippage (SPI: ${audit.SPI.toFixed(3)}). Requires updated acceleration methodology.`;
        }

        // 4. Clause 4.21: Progress Reports (Reporting Frequency)
        let clause4_21_Score = 100;
        let clause4_21_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause4_21_Details = 'Monthly Progress Reports are regularly prepared and submitted in full alignment.';

        if (p.monthly.length < 3) {
          clause4_21_Score = 50;
          clause4_21_Rating = 'Minor Deficiency';
          clause4_21_Details = 'Sparse monthly data records. Contract reporting compliance is under-performing.';
        }

        // 5. Clause 14.2: Advance Payment Guarantee (Mobilization Bonds Validation)
        let clause14_2_Score = 100;
        let clause14_2_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause14_2_Details = 'Advance Payment Guarantees are valid or systematically recovered via IPC amortizations.';

        const advBonds = (p.bonds || []).filter(b => b.type.toLowerCase().includes('advance') || b.type.toLowerCase().includes('mobil'));
        const expiredAdvBonds = advBonds.filter(b => {
          if (b.status && (b.status.toLowerCase().includes('recovered') || b.status.toLowerCase().includes('returned') || b.status.toLowerCase().includes('amortized') || b.status === 'N/A')) return false;
          if (b.status === 'Expired') return true;
          if (b.expireDate) {
            try { return new Date(b.expireDate) < today; } catch { return false; }
          }
          return false;
        });

        if (expiredAdvBonds.length > 0) {
          clause14_2_Score = 30;
          clause14_2_Rating = 'Critical Breach';
          clause14_2_Details = 'Advance Payment Guarantee has expired prior to full recovery. Breach of Clause 14.2.';
        } else if (advBonds.length === 0 && p.provisionalSum > 0) {
          clause14_2_Score = 80;
          clause14_2_Rating = 'Minor Deficiency';
          clause14_2_Details = 'No advance guarantee logged for amortization checking.';
        }

        const clauses = [
          { id: '4.1', title: "Clause 4.1: General Obligations", score: clause4_1_Score, rating: clause4_1_Rating, details: clause4_1_Details },
          { id: '4.2', title: "Clause 4.2: Performance Security", score: clause4_2_Score, rating: clause4_2_Rating, details: clause4_2_Details },
          { id: '8.3', title: "Clause 8.3: Programme Adherence", score: clause8_3_Score, rating: clause8_3_Rating, details: clause8_3_Details },
          { id: '4.21', title: "Clause 4.21: Progress Reports", score: clause4_21_Score, rating: clause4_21_Rating, details: clause4_21_Details },
          { id: '14.2', title: "Clause 14.2: Advance Guarantee", score: clause14_2_Score, rating: clause14_2_Rating, details: clause14_2_Details },
        ];

        const averageScore = Math.round(clauses.reduce((sum, c) => sum + c.score, 0) / clauses.length);
        return {
          role: 'Contractor',
          name: p.contractor || 'N/A',
          clauses,
          averageScore
        };
      }
    } else {
      // Consultant / Engineer (FIDIC 2017)
      if (isDB) {
        // --- YELLOW BOOK 2017 DESIGN-BUILD ENGINEER EVALUATION ---
        // 1. Clause 3.1 & 3.5: Engineer's Authority & Instructions (Design Oversight)
        let clause3_1_Score = 100;
        let clause3_1_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause3_1_Details = "Engineer exercises professional supervisory control and administers design review.";

        if (audit.criticalRisksCount > 3) {
          clause3_1_Score = 60;
          clause3_1_Rating = 'Minor Deficiency';
          clause3_1_Details = "High volume of unmitigated risks. Design-build supervision control warrants improvement.";
        }

        // 2. Clause 3.7: Agreement or Determination (Claims Resolution)
        let clause3_7_Score = 100;
        let clause3_7_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause3_7_Details = "Fair determinations and prompt claim evaluations under Sub-Clause 3.7 are up to date.";

        const activeClaims = p.risks?.filter(r => r.description.toLowerCase().includes('claim') || r.description.toLowerCase().includes('dispute')) || [];
        if (activeClaims.length > 2) {
          clause3_7_Score = 50;
          clause3_7_Rating = 'Minor Deficiency';
          clause3_7_Details = "Multiple outstanding contractor design-build claims. Delays in Clause 3.7 processing.";
        }

        // 3. Clause 5.2: Review of Contractor's Documents (Design Review workflow)
        let clause5_2_Score = 100;
        let clause5_2_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause5_2_Details = "Engineer is reviewing and consenting to design submissions within contractual time limits.";

        const desGoal = getProjectKpiScores(p).find(g => g.id === 'G6')?.score ?? 85;
        clause5_2_Score = Math.round(desGoal);
        if (desGoal < 60) {
          clause5_2_Rating = 'Critical Breach';
          clause5_2_Details = `Backlog or delays in Engineer's design approvals and drawing consents (Score: ${desGoal.toFixed(2)}%).`;
        } else if (desGoal < 80) {
          clause5_2_Rating = 'Minor Deficiency';
          clause5_2_Details = `Moderate bottleneck in design document reviews (Score: ${desGoal.toFixed(2)}%).`;
        } else {
          clause5_2_Details = `Outstanding design documents are being reviewed and cleared efficiently (Score: ${desGoal.toFixed(2)}%).`;
        }

        // 4. Clause 14.6: Interim Payment Certificates (Timely IPC Certification)
        let clause14_6_Score = 100;
        let clause14_6_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause14_6_Details = "Timely and compliant evaluation and certification of Interim Payment Certificates.";

        const ipcTracker = p.ipcTracker || [];
        const unpaidIpcs = ipcTracker.filter(i => i.status === 'Unpaid');
        if (unpaidIpcs.length > 3) {
          clause14_6_Score = 40;
          clause14_6_Rating = 'Critical Breach';
          clause14_6_Details = `Multiple IPC certifications pending/overdue (${unpaidIpcs.length} unpaid items). Hinders cash flow.`;
        } else if (unpaidIpcs.length > 0) {
          clause14_6_Score = 80;
          clause14_6_Rating = 'Minor Deficiency';
          clause14_6_Details = `${unpaidIpcs.length} certified IPC awaiting payment processing. Tracking required.`;
        }

        // 5. Clause 8.4/8.5: Extension of Time evaluation
        let clause8_4_Score = 100;
        let clause8_4_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause8_4_Details = "Extensions of Time (EOT) and delay events are professionally analyzed and formalized.";

        if (audit.scheduleStatus === 'Critical' && (!p.eotDays || p.eotDays === 0)) {
          clause8_4_Score = 50;
          clause8_4_Rating = 'Minor Deficiency';
          clause8_4_Details = "Critical delay detected without corresponding EOT design-build impact assessment.";
        }

        const clauses = [
          { id: '3.1', title: "Clause 3.1 & 3.5: Duties & Authority", score: clause3_1_Score, rating: clause3_1_Rating, details: clause3_1_Details },
          { id: '3.7', title: "Clause 3.7: Determinations", score: clause3_7_Score, rating: clause3_7_Rating, details: clause3_7_Details },
          { id: '5.2', title: "Clause 5.2: Design Documents Review", score: clause5_2_Score, rating: clause5_2_Rating, details: clause5_2_Details },
          { id: '14.6', title: "Clause 14.6: IPC Certification", score: clause14_6_Score, rating: clause14_6_Rating, details: clause14_6_Details },
          { id: '8.4', title: "Clause 8.4/8.5: EOT Evaluation", score: clause8_4_Score, rating: clause8_4_Rating, details: clause8_4_Details },
        ];

        const averageScore = Math.round(clauses.reduce((sum, c) => sum + c.score, 0) / clauses.length);
        return {
          role: 'Consultant',
          name: p.consultant || 'N/A',
          clauses,
          averageScore
        };
      } else {
        // --- RED BOOK 2017 DESIGN-BID-BUILD ENGINEER EVALUATION ---
        // 1. Clause 3.1: Duties & Authority (Professional Control)
        let clause3_1_Score = 100;
        let clause3_1_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause3_1_Details = "Consultant exercises standard professional skill and contract management authority.";

        if (audit.criticalRisksCount > 3) {
          clause3_1_Score = 60;
          clause3_1_Rating = 'Minor Deficiency';
          clause3_1_Details = "High volume of unmitigated critical risks. Supervision control warrants improvement.";
        }

        // 2. Clause 3.7: Agreement or Determination (Timely Dispute/Claim assessment)
        let clause3_7_Score = 100;
        let clause3_7_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause3_7_Details = "Fair determinations and prompt evaluations under Sub-Clause 3.7 are up to date.";

        const activeClaims = p.risks?.filter(r => r.description.toLowerCase().includes('claim') || r.description.toLowerCase().includes('dispute')) || [];
        if (activeClaims.length > 2) {
          clause3_7_Score = 50;
          clause3_7_Rating = 'Minor Deficiency';
          clause3_7_Details = "Multiple outstanding claims requiring formal determinations. Delays in Clause 3.7 processing.";
        }

        // 3. Clause 14.6: Interim Payment Certificates (Timely IPC Certification)
        let clause14_6_Score = 100;
        let clause14_6_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause14_6_Details = "Timely and compliant evaluation and certification of Interim Payment Certificates.";

        const ipcTracker = p.ipcTracker || [];
        const unpaidIpcs = ipcTracker.filter(i => i.status === 'Unpaid');
        if (unpaidIpcs.length > 3) {
          clause14_6_Score = 40;
          clause14_6_Rating = 'Critical Breach';
          clause14_6_Details = `Multiple IPC certifications pending/overdue (${unpaidIpcs.length} unpaid items). Hinders contractor's cash flow.`;
        } else if (unpaidIpcs.length > 0) {
          clause14_6_Score = 80;
          clause14_6_Rating = 'Minor Deficiency';
          clause14_6_Details = `${unpaidIpcs.length} certified IPC awaiting payment processing. Tracking required.`;
        }

        // 4. Clause 8.4/8.5: Extension of Time evaluation
        let clause8_4_Score = 100;
        let clause8_4_Rating: 'Compliant' | 'Minor Deficiency' | 'Critical Breach' = 'Compliant';
        let clause8_4_Details = "Extensions of Time (EOT) and delay events are professionally analyzed and formalized.";

        if (audit.scheduleStatus === 'Critical' && (!p.eotDays || p.eotDays === 0)) {
          clause8_4_Score = 50;
          clause8_4_Rating = 'Minor Deficiency';
          clause8_4_Details = "Critical project delay detected without corresponding EOT assessment or delay determinations.";
        }

        const clauses = [
          { id: '3.1', title: "Clause 3.1: Duties & Authority", score: clause3_1_Score, rating: clause3_1_Rating, details: clause3_1_Details },
          { id: '3.7', title: "Clause 3.7: determinations", score: clause3_7_Score, rating: clause3_7_Rating, details: clause3_7_Details },
          { id: '14.6', title: "Clause 14.6: IPC Certification", score: clause14_6_Score, rating: clause14_6_Rating, details: clause14_6_Details },
          { id: '8.4', title: "Clause 8.4/8.5: EOT Evaluation", score: clause8_4_Score, rating: clause8_4_Rating, details: clause8_4_Details },
        ];

        const averageScore = Math.round(clauses.reduce((sum, c) => sum + c.score, 0) / clauses.length);
        return {
          role: 'Consultant',
          name: p.consultant || 'N/A',
          clauses,
          averageScore
        };
      }
    }
  };

  const contractors = useMemo(() => {
    const names = new Set<string>();
    projects.forEach(p => {
      if (isAccessible(p) && p.contractor) {
        names.add(p.contractor);
      }
    });
    return Array.from(names).sort();
  }, [projects, currentUserObj]);

  const consultants = useMemo(() => {
    const names = new Set<string>();
    projects.forEach(p => {
      if (isAccessible(p) && p.consultant) {
        names.add(p.consultant);
      }
    });
    return Array.from(names).sort();
  }, [projects, currentUserObj]);

  // Filter projects by group and search query
  const rawGroupProjects = useMemo(() => {
    const today = new Date();
    return projects.filter(p => {
      if (!isAccessible(p)) return false;
      
      let isMatch = false;
      if (groupType === 'directorate') {
        isMatch = selectedGroup === 'All' || (p.programDirectorate || 'Southern') === selectedGroup;
      } else if (groupType === 'pmo') {
        isMatch = selectedGroup === 'All' || (p.pmo || 'PMO 1') === selectedGroup;
      } else if (groupType === 'contractor') {
        isMatch = selectedGroup === 'All' || p.contractor === selectedGroup;
      } else {
        isMatch = selectedGroup === 'All' || p.consultant === selectedGroup;
      }
      
      if (!isMatch) return false;
      
      if (maturedFilterOnly) {
        const tracker = p.ipcTracker || [];
        const hasMatured = tracker.some(item => {
          const isEtbUnpaid = (item.statusEtb || item.status) === 'Unpaid';
          const isUsdUnpaid = (item.statusUsd || item.status) === 'Unpaid';
          if ((isEtbUnpaid || isUsdUnpaid) && item.submissionDate) {
            const subDate = new Date(item.submissionDate);
            if (!isNaN(subDate.getTime())) {
              const daysElapsed = Math.floor((today.getTime() - subDate.getTime()) / (1000 * 60 * 60 * 24));
              if (daysElapsed > 56) return true;
            }
          }
          return false;
        });
        if (!hasMatured) return false;
      }
      
      return true;
    });
  }, [projects, groupType, selectedGroup, maturedFilterOnly, currentUserObj]);

  // Group-wide audit metrics
  const auditStats = useMemo(() => {
    const totalCount = rawGroupProjects.length;
    if (totalCount === 0) {
      return {
        avgScore: 0,
        behindScheduleCount: 0,
        behindSchedulePct: 0,
        totalExpiredBonds: 0,
        totalCriticalRisks: 0,
        compliantCount: 0,
        nonCompliantCount: 0,
      };
    }

    let sumScore = 0;
    let behindScheduleCount = 0;
    let totalExpiredBonds = 0;
    let totalCriticalRisks = 0;
    let compliantCount = 0;
    let nonCompliantCount = 0;

    rawGroupProjects.forEach(p => {
      const metrics = getAuditMetrics(p);
      sumScore += metrics.complianceScore;
      if (metrics.scheduleStatus !== 'Compliant') {
        behindScheduleCount++;
      }
      totalExpiredBonds += metrics.expiredBondsCount;
      totalCriticalRisks += metrics.criticalRisksCount;
      
      if (metrics.complianceScore >= 70) {
        compliantCount++;
      } else {
        nonCompliantCount++;
      }
    });

    return {
      avgScore: sumScore / totalCount,
      behindScheduleCount,
      behindSchedulePct: (behindScheduleCount / totalCount) * 100,
      totalExpiredBonds,
      totalCriticalRisks,
      compliantCount,
      nonCompliantCount
    };
  }, [rawGroupProjects]);

  // Search filter and sorting
  const processedProjects = useMemo(() => {
    const queried = rawGroupProjects.filter(p => {
      const q = reportSearchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.client.toLowerCase().includes(q) ||
        p.contractor.toLowerCase().includes(q)
      );
    });

    return [...queried].sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'progress') {
        comparison = (a.physicalProgress || 0) - (b.physicalProgress || 0);
      } else if (sortBy === 'value') {
        const valA = (a.origAmount + (a.variation || 0)) * 1_000_000;
        const valB = (b.origAmount + (b.variation || 0)) * 1_000_000;
        comparison = valA - valB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [rawGroupProjects, reportSearchQuery, sortBy, sortOrder]);

  // Derived statistics for the selected group
  const stats = useMemo(() => {
    const totalCount = rawGroupProjects.length;
    if (totalCount === 0) {
      return {
        count: 0,
        avgProgress: 0,
        totalValue: 0,
        warningCount: 0,
        provisionalTotal: 0,
        completedCount: 0,
        onTrackCount: 0
      };
    }

    const totalValue = rawGroupProjects.reduce((sum, p) => sum + (p.origAmount + (p.variation || 0)) * 1_000_000, 0);
    const avgProgress = rawGroupProjects.reduce((sum, p) => sum + (p.physicalProgress || 0), 0) / totalCount;
    const provisionalTotal = rawGroupProjects.reduce((sum, p) => sum + (p.provisionalSum || 0), 0);

    // Active Bond Warnings count across the group
    const warningCount = rawGroupProjects.reduce((sum, p) => {
      const activeBondsCount = (p.bonds || []).filter(b => {
        if (b.status && (b.status.toLowerCase().includes('recovered') || b.status.toLowerCase().includes('returned') || b.status.toLowerCase().includes('amortized') || b.status === 'N/A')) return false;
        if (b.status === 'Expired') return true;
        // Count as warning if expireDate is in past
        if (b.expireDate) {
          try {
            const exp = new Date(b.expireDate);
            return exp < new Date();
          } catch {
            return false;
          }
        }
        return false;
      }).length;
      return sum + activeBondsCount;
    }, 0);

    const completedCount = rawGroupProjects.filter(p => (p.physicalProgress || 0) >= 95).length;
    const onTrackCount = rawGroupProjects.filter(p => (p.physicalProgress || 0) >= 50).length;

    return {
      count: totalCount,
      avgProgress,
      totalValue,
      warningCount,
      provisionalTotal,
      completedCount,
      onTrackCount
    };
  }, [rawGroupProjects]);

  // Derived payment and matured outstanding claims statistics
  const paymentStats = useMemo(() => {
    const totalCount = rawGroupProjects.length;
    if (totalCount === 0) {
      return {
        totalCertifiedEtb: 0,
        totalCertifiedUsd: 0,
        totalPaidEtb: 0,
        totalPaidUsd: 0,
        totalUnpaidEtb: 0,
        totalUnpaidUsd: 0,
        totalMaturedEtb: 0,
        totalMaturedUsd: 0,
        combinedCertifiedEtb: 0,
        combinedPaidEtb: 0,
        combinedUnpaidEtb: 0,
        combinedMaturedEtb: 0,
        maturedIpcCount: 0,
        totalIpcCount: 0,
        unpaidIpcCount: 0,
      };
    }

    let totalCertifiedEtb = 0;
    let totalCertifiedUsd = 0;
    let totalPaidEtb = 0;
    let totalPaidUsd = 0;
    let totalUnpaidEtb = 0;
    let totalUnpaidUsd = 0;
    let totalMaturedEtb = 0;
    let totalMaturedUsd = 0;
    let combinedCertifiedEtb = 0;
    let combinedPaidEtb = 0;
    let combinedUnpaidEtb = 0;
    let combinedMaturedEtb = 0;
    let maturedIpcCount = 0;
    let totalIpcCount = 0;
    let unpaidIpcCount = 0;

    const today = new Date();

    rawGroupProjects.forEach(p => {
      const tracker = p.ipcTracker || [];
      const rate = p.usdExchangeRate || 28.0;

      tracker.forEach(item => {
        totalIpcCount++;
        const isEtbUnpaid = (item.statusEtb || item.status) === 'Unpaid';
        const isUsdUnpaid = (item.statusUsd || item.status) === 'Unpaid';

        const certEtb = item.certifiedEtb || 0;
        const certUsd = item.certifiedUsd || 0;

        totalCertifiedEtb += certEtb;
        totalCertifiedUsd += certUsd;
        combinedCertifiedEtb += certEtb + (certUsd * rate);

        if (isEtbUnpaid) {
          totalUnpaidEtb += certEtb;
          combinedUnpaidEtb += certEtb;
          unpaidIpcCount++;
        } else {
          totalPaidEtb += certEtb;
          combinedPaidEtb += certEtb;
        }

        if (isUsdUnpaid) {
          totalUnpaidUsd += certUsd;
          combinedUnpaidEtb += certUsd * rate;
          if (!isEtbUnpaid) unpaidIpcCount++;
        } else {
          totalPaidUsd += certUsd;
          combinedPaidEtb += certUsd * rate;
        }

        // Check matured overdue (> 56 days)
        if (isEtbUnpaid || isUsdUnpaid) {
          if (item.submissionDate) {
            const subDate = new Date(item.submissionDate);
            if (!isNaN(subDate.getTime())) {
              const daysElapsed = Math.floor((today.getTime() - subDate.getTime()) / (1000 * 60 * 60 * 24));
              if (daysElapsed > 56) {
                maturedIpcCount++;
                if (isEtbUnpaid) {
                  totalMaturedEtb += certEtb;
                  combinedMaturedEtb += certEtb;
                }
                if (isUsdUnpaid) {
                  totalMaturedUsd += certUsd;
                  combinedMaturedEtb += certUsd * rate;
                }
              }
            }
          }
        }
      });
    });

    return {
      totalCertifiedEtb,
      totalCertifiedUsd,
      totalPaidEtb,
      totalPaidUsd,
      totalUnpaidEtb,
      totalUnpaidUsd,
      totalMaturedEtb,
      totalMaturedUsd,
      combinedCertifiedEtb,
      combinedPaidEtb,
      combinedUnpaidEtb,
      combinedMaturedEtb,
      maturedIpcCount,
      totalIpcCount,
      unpaidIpcCount,
    };
  }, [rawGroupProjects]);

  // Derived bond guarantee statistics
  const bondStats = useMemo(() => {
    let totalBondsCount = 0;
    let totalBondsValue = 0;
    let validBondsCount = 0;
    let validBondsValue = 0;
    let expiredBondsCount = 0;
    let expiredBondsValue = 0;

    rawGroupProjects.forEach(p => {
      const bonds = p.bonds || [];
      bonds.forEach(b => {
        totalBondsCount++;
        const amt = b.amount || 0;
        totalBondsValue += amt;
        
        if (b.status === 'Valid' || (b.status && (b.status.toLowerCase().includes('recovered') || b.status.toLowerCase().includes('returned') || b.status.toLowerCase().includes('amortized')))) {
          validBondsCount++;
          validBondsValue += amt;
        } else if (b.status === 'Expired') {
          expiredBondsCount++;
          expiredBondsValue += amt;
        }
      });
    });

    return {
      totalBondsCount,
      totalBondsValue,
      validBondsCount,
      validBondsValue,
      expiredBondsCount,
      expiredBondsValue
    };
  }, [rawGroupProjects]);

  // Helper to calculate project payment metrics
  const getProjectPaymentMetrics = (p: Project) => {
    const tracker = p.ipcTracker || [];
    const rate = p.usdExchangeRate || 28.0;
    const today = new Date();

    let totalIpcs = tracker.length;
    let paidIpcs = 0;
    let unpaidIpcs = 0;
    let maturedIpcsCount = 0;

    let certEtb = 0;
    let certUsd = 0;
    let paidEtb = 0;
    let paidUsd = 0;
    let unpaidEtb = 0;
    let unpaidUsd = 0;
    let maturedEtb = 0;
    let maturedUsd = 0;

    tracker.forEach(item => {
      const isEtbUnpaid = (item.statusEtb || item.status) === 'Unpaid';
      const isUsdUnpaid = (item.statusUsd || item.status) === 'Unpaid';

      certEtb += item.certifiedEtb || 0;
      certUsd += item.certifiedUsd || 0;

      if (isEtbUnpaid) {
        unpaidEtb += item.certifiedEtb || 0;
      } else {
        paidEtb += item.certifiedEtb || 0;
      }

      if (isUsdUnpaid) {
        unpaidUsd += item.certifiedUsd || 0;
      } else {
        paidUsd += item.certifiedUsd || 0;
      }

      if (!isEtbUnpaid && !isUsdUnpaid) {
        paidIpcs++;
      } else {
        unpaidIpcs++;
        // Check maturity (>56 days)
        if (item.submissionDate) {
          const subDate = new Date(item.submissionDate);
          if (!isNaN(subDate.getTime())) {
            const age = Math.floor((today.getTime() - subDate.getTime()) / (1000 * 60 * 60 * 24));
            if (age > 56) {
              maturedIpcsCount++;
              if (isEtbUnpaid) maturedEtb += item.certifiedEtb || 0;
              if (isUsdUnpaid) maturedUsd += item.certifiedUsd || 0;
            }
          }
        }
      }
    });

    const combinedCertified = certEtb + (certUsd * rate);
    const combinedPaid = paidEtb + (paidUsd * rate);
    const combinedUnpaid = unpaidEtb + (unpaidUsd * rate);
    const combinedMatured = maturedEtb + (maturedUsd * rate);

    let statusLabel: 'Paid' | 'Pending' | 'Overdue' = 'Paid';
    let statusColor = 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400';
    if (maturedIpcsCount > 0) {
      statusLabel = 'Overdue';
      statusColor = 'bg-red-50 text-red-600 border-red-150 dark:bg-red-950/20 dark:text-red-400 animate-pulse';
    } else if (unpaidIpcs > 0) {
      statusLabel = 'Pending';
      statusColor = 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400';
    }

    return {
      totalIpcs,
      paidIpcs,
      unpaidIpcs,
      maturedIpcsCount,
      certEtb,
      certUsd,
      paidEtb,
      paidUsd,
      unpaidEtb,
      unpaidUsd,
      maturedEtb,
      maturedUsd,
      combinedCertified,
      combinedPaid,
      combinedUnpaid,
      combinedMatured,
      statusLabel,
      statusColor
    };
  };

  // Export to landscape-oriented PDF with beautiful grid formatting
  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'pt', 'a4'); // Landscape A4 (841.89 pt x 595.28 pt)
    
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

    const drawHeaderFooter = () => {
      // Elegant gold / bronze colored accent header line
      doc.setDrawColor(194, 120, 3); // Gold primary accent
      doc.setLineWidth(3);
      doc.line(40, 25, pageWidth - 40, 25);

      // Title & Metadata Block
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("ETHIOPIAN ROADS ADMINISTRATION (ERA)", 40, 42);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139); // slate-500
      const headerMetaStr = `CMS - CONTRACT MONITORING & EXECUTIVE REPORTING SYSTEM • GENERATOR: ${currentUserObj.username.toUpperCase()}`;
      const wrappedHeaderMeta = doc.splitTextToSize(headerMetaStr, pageWidth - 310);
      doc.text(wrappedHeaderMeta, 40, 54);

      const dStr = new Date().toLocaleString();
      doc.text(`REPORT EXPORT DATE: ${dStr}`, pageWidth - 260, 42);

      // Footer line
      doc.setLineWidth(0.75);
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.line(40, pageHeight - 40, pageWidth - 40, pageHeight - 40);

      // Header bottom divider line
      doc.line(40, 58, pageWidth - 40, 58);

      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`CONFIDENTIALITY CLAUSE: FOR OFFICIAL USE ONLY • INTERNAL ERA MANAGEMENT PERFORMANCE BRIEFING`, 40, pageHeight - 24);
      doc.text(`Page ${pageCount}`, pageWidth - 60, pageHeight - 24);
    };

    drawHeaderFooter();

    // Document Subject Headline
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229); // Indigo-600
    const groupNameStr = selectedGroup === 'All' ? 'ALL GROUPINGS (COMBINED STATS)' : selectedGroup.toUpperCase();
    const groupLabelStr = 
      groupType === 'directorate' ? 'PROGRAM DIRECTORATE' : 
      groupType === 'pmo' ? 'PMO GROUP' :
      groupType === 'contractor' ? 'CONTRACTOR' : 'CONSULTANT';
    const headlineStr = `EXECUTIVE PERFORMANCE DOSSIER: ${groupLabelStr} • ${groupNameStr}`;
    const wrappedHeadline = doc.splitTextToSize(headlineStr, pageWidth - 80);
    doc.text(wrappedHeadline, 40, 85);

    // Decorative thin separator
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(40, 95, pageWidth - 40, 95);

    // Top Performance KPI Summary Blocks
    const cardWidth = (pageWidth - 80 - 30) / 4; 
    const cardY = 110;
    const cardHeight = 52;

    // KPI Card 1: Total Contracts
    doc.setFillColor(248, 250, 252);
    doc.rect(40, cardY, cardWidth, cardHeight, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(40, cardY, cardWidth, cardHeight, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("TOTAL ACTIVE CONTRACTS", 48, cardY + 18);
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`${stats.count}`, 48, cardY + 38);

    // KPI Card 2: Average Physical Progress
    doc.setFillColor(248, 250, 252);
    doc.rect(40 + cardWidth + 10, cardY, cardWidth, cardHeight, 'F');
    doc.rect(40 + cardWidth + 10, cardY, cardWidth, cardHeight, 'S');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("AVG PHYSICAL PROGRESS", 40 + cardWidth + 18, cardY + 18);
    doc.setFontSize(14);
    doc.setTextColor(13, 148, 136); // Teal
    doc.text(`${stats.avgProgress.toFixed(2)}%`, 40 + cardWidth + 18, cardY + 38);

    // KPI Card 3: Aggregate Value
    doc.setFillColor(248, 250, 252);
    doc.rect(40 + (cardWidth + 10) * 2, cardY, cardWidth, cardHeight, 'F');
    doc.rect(40 + (cardWidth + 10) * 2, cardY, cardWidth, cardHeight, 'S');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("AGGREGATE CONTRACT VALUE", 40 + (cardWidth + 10) * 2 + 8, cardY + 18);
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} ETB`, 40 + (cardWidth + 10) * 2 + 8, cardY + 38);

    // KPI Card 4: Risks & Warnings
    doc.setFillColor(248, 250, 252);
    doc.rect(40 + (cardWidth + 10) * 3, cardY, cardWidth, cardHeight, 'F');
    doc.rect(40 + (cardWidth + 10) * 3, cardY, cardWidth, cardHeight, 'S');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("EXPIRED/CRITICAL GUARANTEES", 40 + (cardWidth + 10) * 3 + 8, cardY + 18);
    doc.setFontSize(14);
    if (stats.warningCount > 0) {
      doc.setTextColor(220, 38, 38); // red
    } else {
      doc.setTextColor(22, 163, 74); // green
    }
    doc.text(`${stats.warningCount} Alerts`, 40 + (cardWidth + 10) * 3 + 8, cardY + 38);

    curY = cardY + cardHeight + 25;

    // Detailed Projects Grid title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text("DETAILED CONTRACT PERFORMANCES", 40, curY);
    curY += 12;

    // Landscape Columns widths (Total A4 width: 841.89 pt, printable width: 761.89 pt)
    const colWidths = {
      name: 180,
      clientContr: 140,
      groupInfo: 110,
      progress: 110, // progress bar + text
      value: 125,
      milestones: 96
    };

    const colX = {
      name: 40,
      clientContr: 40 + colWidths.name,
      groupInfo: 40 + colWidths.name + colWidths.clientContr,
      progress: 40 + colWidths.name + colWidths.clientContr + colWidths.groupInfo,
      value: 40 + colWidths.name + colWidths.clientContr + colWidths.groupInfo + colWidths.progress,
      milestones: 40 + colWidths.name + colWidths.clientContr + colWidths.groupInfo + colWidths.progress + colWidths.value
    };

    const drawTableHeader = (y: number) => {
      doc.setFont('times', 'bold');
      doc.setFontSize(8.5);
      const headerNameLines = doc.splitTextToSize("PROJECT IDENTIFIER / CODE", colWidths.name - 12);
      const headerClientContrLines = doc.splitTextToSize("CLIENT / CONTRACTOR", colWidths.clientContr - 12);
      const headerGroupInfoLines = doc.splitTextToSize("DIRECTORATE & PMO", colWidths.groupInfo - 12);
      const headerProgressLines = doc.splitTextToSize("PHYSICAL PROGRESS", colWidths.progress - 12);
      const headerValueLines = doc.splitTextToSize("REVISED CONTRACT VAL (ETB)", colWidths.value - 12);
      const headerMilestonesLines = doc.splitTextToSize("ALERTS / EOT", colWidths.milestones - 12);

      const maxHeaderLines = Math.max(
        headerNameLines.length,
        headerClientContrLines.length,
        headerGroupInfoLines.length,
        headerProgressLines.length,
        headerValueLines.length,
        headerMilestonesLines.length
      );
      const headerHeight = maxHeaderLines * 11 + 10;

      doc.setFillColor(15, 23, 42); // slate-900 (professional navy dark)
      doc.rect(40, y, pageWidth - 80, headerHeight, 'F');

      doc.setFont('times', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);

      const drawCellLines = (lines: string[], x: number) => {
        const startY = y + (headerHeight - (lines.length * 11)) / 2 + 8;
        lines.forEach((line, idx) => {
          doc.text(line, x + 6, startY + idx * 11);
        });
      };

      drawCellLines(headerNameLines, colX.name);
      drawCellLines(headerClientContrLines, colX.clientContr);
      drawCellLines(headerGroupInfoLines, colX.groupInfo);
      drawCellLines(headerProgressLines, colX.progress);
      drawCellLines(headerValueLines, colX.value);
      drawCellLines(headerMilestonesLines, colX.milestones);

      // Header border line
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(1);
      doc.line(40, y, pageWidth - 40, y);
      doc.line(40, y + headerHeight, pageWidth - 40, y + headerHeight);
      doc.line(40, y, 40, y + headerHeight);
      doc.line(pageWidth - 40, y, pageWidth - 40, y + headerHeight);

      doc.line(colX.clientContr, y, colX.clientContr, y + headerHeight);
      doc.line(colX.groupInfo, y, colX.groupInfo, y + headerHeight);
      doc.line(colX.progress, y, colX.progress, y + headerHeight);
      doc.line(colX.value, y, colX.value, y + headerHeight);
      doc.line(colX.milestones, y, colX.milestones, y + headerHeight);

      return headerHeight;
    };

    const initialHeaderHeight = drawTableHeader(curY);
    curY += initialHeaderHeight;

    processedProjects.forEach((p, idx) => {
      const combinedTitle = p.name || 'Untitled Project';
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      const titleLines = doc.splitTextToSize(combinedTitle, colWidths.name - 12);

      const clientText = `Client: ${p.client || 'N/A'}`;
      const contractorText = `Contr: ${p.contractor || 'N/A'}`;
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      const clientLines = doc.splitTextToSize(clientText, colWidths.clientContr - 12);
      const contrLines = doc.splitTextToSize(contractorText, colWidths.clientContr - 12);

      const dirText = `DIR: ${p.programDirectorate || 'Southern'}`;
      const pmoText = `PMO: ${p.pmo || 'PMO 1'}`;
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      const dirLines = doc.splitTextToSize(dirText, colWidths.groupInfo - 12);
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      const pmoLines = doc.splitTextToSize(pmoText, colWidths.groupInfo - 12);

      const progVal = p.physicalProgress || 0;
      const progText = `${progVal.toFixed(2)}% Completed`;
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      const progLines = doc.splitTextToSize(progText, colWidths.progress - 12);

      const valAmount = (p.origAmount + (p.variation || 0)) * 1_000_000;
      const valText = `${valAmount.toLocaleString()} ETB`;
      const provText = `Prov. Sum: ${p.provisionalSum?.toLocaleString() || '0'}`;
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      const valLines = doc.splitTextToSize(valText, colWidths.value - 12);
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      const provLines = doc.splitTextToSize(provText, colWidths.value - 12);

      const expiredBonds = (p.bonds || []).filter(b => {
        if (b.status && (b.status.toLowerCase().includes('recovered') || b.status.toLowerCase().includes('returned') || b.status.toLowerCase().includes('amortized') || b.status === 'N/A')) return false;
        if (b.status === 'Expired') return true;
        if (b.expireDate) {
          try { return new Date(b.expireDate) < new Date(); } catch { return false; }
        }
        return false;
      }).length;
      const bondText = expiredBonds > 0 ? `[ALERT] ${expiredBonds} Exp. Guarantees` : `[OK] Guarantees Valid`;
      const eotText = `EOT Days: +${p.eotDays || 0}d`;
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      const bondLines = doc.splitTextToSize(bondText, colWidths.milestones - 12);
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      const eotLines = doc.splitTextToSize(eotText, colWidths.milestones - 12);

      // Pre-calculate cells heights with 12pt font (15pt line spacing)
      const nameHeight = titleLines.length * 15 + 12;
      const clientContrHeight = (clientLines.length + contrLines.length) * 15 + 12;
      const groupInfoHeight = (dirLines.length + pmoLines.length) * 15 + 12;
      const progressHeight = progLines.length * 15 + 18 + 12; // text + progress bar
      const valueHeight = (valLines.length + provLines.length) * 15 + 12;
      const milestonesHeight = (bondLines.length + eotLines.length) * 15 + 12;

      const rowHeight = Math.max(nameHeight, clientContrHeight, groupInfoHeight, progressHeight, valueHeight, milestonesHeight, 52);

      // Prevent overflow, add new page with header
      if (curY + rowHeight > pageHeight - 55) {
        doc.addPage();
        pageCount++;
        curY = 60;
        drawHeaderFooter();
        const headerH = drawTableHeader(curY);
        curY += headerH;
      }

      // Zebra striping background
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(40, curY, pageWidth - 80, rowHeight, 'F');
      
      // Draw cells background borders
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(1);
      doc.rect(40, curY, pageWidth - 80, rowHeight, 'S');

      // Draw columns vertical grid lines
      doc.line(colX.clientContr, curY, colX.clientContr, curY + rowHeight);
      doc.line(colX.groupInfo, curY, colX.groupInfo, curY + rowHeight);
      doc.line(colX.progress, curY, colX.progress, curY + rowHeight);
      doc.line(colX.value, curY, colX.value, curY + rowHeight);
      doc.line(colX.milestones, curY, colX.milestones, curY + rowHeight);

      // 1. Render Name Code
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      let yOffsetN = curY + 18;
      titleLines.forEach((line: string) => {
        doc.text(line, colX.name + 6, yOffsetN);
        yOffsetN += 15;
      });

      // 2. Render Client & Contractor Info
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(71, 85, 105);
      let yOffsetCC = curY + 18;
      clientLines.forEach((line: string) => {
        doc.text(line, colX.clientContr + 6, yOffsetCC);
        yOffsetCC += 15;
      });
      contrLines.forEach((line: string) => {
        doc.text(line, colX.clientContr + 6, yOffsetCC);
        yOffsetCC += 15;
      });

      // 3. Render Directorate & PMO Grouping Info
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(79, 70, 229); // Indigo
      let yOffsetG = curY + 18;
      dirLines.forEach((line: string) => {
        doc.text(line, colX.groupInfo + 6, yOffsetG);
        yOffsetG += 15;
      });
      doc.setFont('times', 'normal');
      doc.setTextColor(147, 51, 234); // Purple
      pmoLines.forEach((line: string) => {
        doc.text(line, colX.groupInfo + 6, yOffsetG);
        yOffsetG += 15;
      });

      // 4. Render Physical Progress Visual Bar
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      let progColor = [22, 163, 74]; // emerald green
      if (progVal < 15) {
        progColor = [220, 38, 38]; // red
        doc.setTextColor(220, 38, 38);
      } else if (progVal < 45) {
        progColor = [217, 119, 6]; // amber
        doc.setTextColor(217, 119, 6);
      } else {
        doc.setTextColor(22, 163, 74);
      }
      
      let yOffsetP = curY + 18;
      progLines.forEach((line: string) => {
        doc.text(line, colX.progress + 6, yOffsetP);
        yOffsetP += 15;
      });

      // Progress bar outline
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(241, 245, 249);
      doc.rect(colX.progress + 6, yOffsetP + 2, 85, 6, 'F');
      
      // Progress bar fill
      doc.setFillColor(progColor[0], progColor[1], progColor[2]);
      const fillWidth = Math.min(85, Math.max(0, (progVal / 100) * 85));
      if (fillWidth > 0) {
        doc.rect(colX.progress + 6, yOffsetP + 2, fillWidth, 6, 'F');
      }

      // 5. Render Revised Contract Value
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      let yOffsetV = curY + 18;
      valLines.forEach((line: string) => {
        doc.text(line, colX.value + 6, yOffsetV);
        yOffsetV += 15;
      });
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139);
      provLines.forEach((line: string) => {
        doc.text(line, colX.value + 6, yOffsetV);
        yOffsetV += 15;
      });

      // 6. Render Alerts / EOT Days
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      if (expiredBonds > 0) {
        doc.setTextColor(220, 38, 38);
      } else {
        doc.setTextColor(22, 163, 74);
      }
      let yOffsetM = curY + 18;
      bondLines.forEach((line: string) => {
        doc.text(line, colX.milestones + 6, yOffsetM);
        yOffsetM += 15;
      });
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139);
      eotLines.forEach((line: string) => {
        doc.text(line, colX.milestones + 6, yOffsetM);
        yOffsetM += 15;
      });

      curY += rowHeight;
    });

    // Final Page Sign-off section
    if (curY + 90 > pageHeight - 55) {
      doc.addPage();
      pageCount++;
      curY = 60;
      drawHeaderFooter();
    }

    curY += 25;
    doc.setDrawColor(226, 232, 240);
    doc.line(40, curY, pageWidth - 40, curY);
    curY += 15;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("EXECUTIVE REVIEW & SIGN-OFF", 40, curY);

    curY += 35;
    // Sign line 1
    doc.setDrawColor(148, 163, 184);
    doc.line(40, curY, 220, curY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text("Prepared By: CMS System Officer", 40, curY + 12);

    // Sign line 2
    doc.line(pageWidth - 220, curY, pageWidth - 40, curY);
    doc.text("Approved By: Program Director / Regional Manager", pageWidth - 220, curY + 12);

    // Ensure page counts are correct in footer for all pages
    for (let j = 1; j <= pageCount; j++) {
      doc.setPage(j);
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${j} of ${pageCount}`, pageWidth - 60, pageHeight - 24);
    }

    doc.save(`ERA_Performance_Dossier_${groupType}_${selectedGroup.replace(/\s+/g, '_')}.pdf`);
  };

  // Export beautifully formatted CSV file
  const handleExportCSV = () => {
    const csvHeaders = [
      'Project Name',
      'Client',
      'Consultant Engineer',
      'Contractor',
      'Contract Signing Date',
      'Commencement Date',
      'Program Directorate',
      'PMO Grouping',
      'Road Classification',
      'Contract Type (DB/DBB)',
      'Project Length (KM)',
      'Physical Progress (%)',
      'Original Completion Date',
      'Revised Completion Date',
      'Original Contract Value (ETB)',
      'Revised Contract Value (ETB)',
      'Extension of Time (EOT Days)',
      'Expired Guarantees Count'
    ];

    const formatDateForCSV = (dateStr: string) => {
      if (!dateStr) return '';
      try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          const d = parseInt(parts[2], 10);
          if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
            return `${m}/${d}/${y}`;
          }
        }
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
      } catch {
        return dateStr;
      }
    };

    const addDaysToStartDate = (startDateStr: string, daysToAdd: number): string => {
      if (!startDateStr) return '';
      try {
        const parts = startDateStr.split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const d = parseInt(parts[2], 10);
          const targetDate = new Date(y, m, d + daysToAdd);
          return `${targetDate.getMonth() + 1}/${targetDate.getDate()}/${targetDate.getFullYear()}`;
        } else {
          const targetDate = new Date(new Date(startDateStr).getTime() + daysToAdd * 86400000);
          return `${targetDate.getMonth() + 1}/${targetDate.getDate()}/${targetDate.getFullYear()}`;
        }
      } catch {
        return '';
      }
    };

    const rows = processedProjects.map(p => {
      const expiredBondsCount = (p.bonds || []).filter(b => {
        if (b.status && (b.status.toLowerCase().includes('recovered') || b.status.toLowerCase().includes('returned') || b.status.toLowerCase().includes('amortized') || b.status === 'N/A')) return false;
        if (b.status === 'Expired') return true;
        if (b.expireDate) {
          try { return new Date(b.expireDate) < new Date(); } catch { return false; }
        }
        return false;
      }).length;
      const totalDays = (p.origDays || 0) + (p.eotDays || 0) + (p.interimEotDays || 0);

      // Date calculations
      let origCompletionDate = '';
      let revisedCompletionDate = '';
      if (p.startDate) {
        origCompletionDate = addDaysToStartDate(p.startDate, p.origDays || 0);
        revisedCompletionDate = addDaysToStartDate(p.startDate, totalDays);
      }

      const origVal = p.origAmount ? Math.round(p.origAmount * 1_000_000) : 0;
      const revisedVal = p.origAmount ? Math.round((p.origAmount + (p.variation || 0)) * 1_000_000) : 0;

      return [
        p.name || 'Untitled Project',
        p.client || 'N/A',
        p.consultant || 'N/A',
        p.contractor || 'N/A',
        formatDateForCSV(p.signDate),
        formatDateForCSV(p.startDate),
        p.programDirectorate || 'Southern',
        p.pmo || 'PMO 1',
        p.classification || 'DS-4',
        p.contractType || 'DBB',
        p.lengthKm !== undefined && p.lengthKm !== null && p.lengthKm > 0 ? p.lengthKm : '',
        p.physicalProgress !== undefined ? p.physicalProgress : 0,
        origCompletionDate,
        revisedCompletionDate,
        origVal,
        revisedVal,
        p.eotDays || 0,
        expiredBondsCount
      ];
    });

    const csvContent = [
      csvHeaders.join(','),
      ...rows.map(row => row.map(v => {
        const cellString = String(v === null || v === undefined ? '' : v).replace(/"/g, '""');
        return cellString.includes(',') || cellString.includes('\n') || cellString.includes('"') 
          ? `"${cellString}"` 
          : cellString;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ERA_Performance_Data_${groupType}_${selectedGroup.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export beautiful Project Compliance & Performance Audit Report (PDF)
  const handleExportAuditPDF = () => {
    const doc = new jsPDF('l', 'pt', 'a4'); // Landscape A4 (841.89 pt x 595.28 pt)
    
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

    const drawHeaderFooter = () => {
      // Elegant Crimson / Slate Audit Accent line
      doc.setDrawColor(220, 38, 38); // Red compliance accent
      doc.setLineWidth(3);
      doc.line(40, 25, pageWidth - 40, 25);

      // Title & Metadata Block
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("ETHIOPIAN ROADS ADMINISTRATION (ERA) • COMPLIANCE AUDITING OFFICE", 40, 42);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`CMS - CONTRACT COMPLIANCE & PERFORMANCE AUDIT BOARD • AUDITOR: ${currentUserObj.username.toUpperCase()}`, 40, 54);

      const dStr = new Date().toLocaleString();
      doc.text(`AUDIT GENERATION DATE: ${dStr}`, pageWidth - 260, 42);

      // Footer line
      doc.setLineWidth(0.75);
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.line(40, pageHeight - 40, pageWidth - 40, pageHeight - 40);

      // Header bottom divider line
      doc.line(40, 58, pageWidth - 40, 58);

      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`CONFIDENTIALITY CLAUSE: RESTRICTED TO GOVERNANCE & PROJECT MANAGEMENT AUDIT TEAMS ONLY`, 40, pageHeight - 24);
      doc.text(`Page ${pageCount}`, pageWidth - 60, pageHeight - 24);
    };

    drawHeaderFooter();

    // Document Subject Headline
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(185, 28, 28); // red-700
    const groupNameStr = selectedGroup === 'All' ? 'ALL GROUPINGS (COMBINED STATS)' : selectedGroup.toUpperCase();
    const groupLabelStr = 
      groupType === 'directorate' ? 'PROGRAM DIRECTORATE' : 
      groupType === 'pmo' ? 'PMO GROUP' :
      groupType === 'contractor' ? 'CONTRACTOR' : 'CONSULTANT';
    const headlineStr = `PROJECT COMPLIANCE & PERFORMANCE AUDIT REPORT: ${groupLabelStr} • ${groupNameStr}`;
    const wrappedHeadline = doc.splitTextToSize(headlineStr, pageWidth - 80);
    doc.text(wrappedHeadline, 40, 85);

    // Decorative thin separator
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(40, 95, pageWidth - 40, 95);

    // Top Compliance KPI Summary Blocks
    const cardWidth = (pageWidth - 80 - 30) / 4; 
    const cardY = 110;
    const cardHeight = 52;

    // KPI Card 1: Audited Projects Count
    doc.setFillColor(254, 242, 242); // very soft red
    doc.rect(40, cardY, cardWidth, cardHeight, 'F');
    doc.setDrawColor(252, 165, 165);
    doc.rect(40, cardY, cardWidth, cardHeight, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(185, 28, 28);
    doc.text("TOTAL AUDITED PROJECTS", 48, cardY + 18);
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`${processedProjects.length} Active`, 48, cardY + 38);

    // KPI Card 2: Group Avg Compliance Score
    doc.setFillColor(248, 250, 252);
    doc.rect(40 + cardWidth + 10, cardY, cardWidth, cardHeight, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(40 + cardWidth + 10, cardY, cardWidth, cardHeight, 'S');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("AVG COMPLIANCE SCORE", 40 + cardWidth + 18, cardY + 18);
    doc.setFontSize(14);
    if (auditStats.avgScore >= 75) {
      doc.setTextColor(22, 163, 74); // green
    } else if (auditStats.avgScore >= 60) {
      doc.setTextColor(217, 119, 6); // amber
    } else {
      doc.setTextColor(220, 38, 38); // red
    }
    doc.text(`${auditStats.avgScore.toFixed(2)}%`, 40 + cardWidth + 18, cardY + 38);

    // KPI Card 3: Behind Schedule Rate
    doc.setFillColor(248, 250, 252);
    doc.rect(40 + (cardWidth + 10) * 2, cardY, cardWidth, cardHeight, 'F');
    doc.rect(40 + (cardWidth + 10) * 2, cardY, cardWidth, cardHeight, 'S');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("SCHEDULE SLIPPAGE RATE", 40 + (cardWidth + 10) * 2 + 8, cardY + 18);
    doc.setFontSize(14);
    if (auditStats.behindSchedulePct > 35) {
      doc.setTextColor(220, 38, 38);
    } else {
      doc.setTextColor(15, 23, 42);
    }
    doc.text(`${auditStats.behindSchedulePct.toFixed(2)}% Delay`, 40 + (cardWidth + 10) * 2 + 8, cardY + 38);

    // KPI Card 4: Risks & Warnings
    doc.setFillColor(248, 250, 252);
    doc.rect(40 + (cardWidth + 10) * 3, cardY, cardWidth, cardHeight, 'F');
    doc.rect(40 + (cardWidth + 10) * 3, cardY, cardWidth, cardHeight, 'S');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("GUARANTEE & RISK TRIGGERS", 40 + (cardWidth + 10) * 3 + 8, cardY + 18);
    doc.setFontSize(13);
    doc.setTextColor(220, 38, 38); // red
    doc.text(`${auditStats.totalExpiredBonds} Exp. / ${auditStats.totalCriticalRisks} Crit.`, 40 + (cardWidth + 10) * 3 + 8, cardY + 38);

    curY = cardY + cardHeight + 20;

    // Render Compliance Rating Weightage Explanation Box
    doc.setFillColor(248, 250, 252);
    doc.rect(40, curY, pageWidth - 80, 28, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(40, curY, pageWidth - 80, 28, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text("COMPLIANCE RATING WEIGHT DISTRIBUTION & BREACH PENALTY METHODOLOGY", 48, curY + 10);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text(
      "• Progress vs Time (20%): direct output ratio   • EVM Performance (30%): SPI (15%) + CPI (15%)   • Linear Layers (25%): Average of Subgrade, Capping, Subbase, Basecourse & Asphalt %", 48, curY + 18
    );
    doc.text(
      "• Audit Risks & Guarantees (25%): Valid Guarantees (15%) + Risk Mitigation (10%)   • Breach Penalties: CPI < 0.85 (-10 pts) | SPI < 0.85 (-10 pts) | Expired Bonds (-15 pts) | Critical Risks > 2 (-10 pts)", 48, curY + 24
    );

    curY += 38;

    // Detailed Projects Grid title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text("COMPLIANCE AUDIT MATRIX BY PROJECT", 40, curY);
    curY += 12;

    // Landscape Columns widths (Total A4 width: 841.89 pt, printable width: 761.89 pt)
    const colWidths = {
      name: 110,
      contract_details: 130,
      schedule: 115,
      evm: 95,
      linear: 130, // expanded to accommodate plan vs actual per layer
      bonds_risks: 95,
      score_rating: 86
    };

    const colX = {
      name: 40,
      contract_details: 40 + colWidths.name,
      schedule: 40 + colWidths.name + colWidths.contract_details,
      evm: 40 + colWidths.name + colWidths.contract_details + colWidths.schedule,
      linear: 40 + colWidths.name + colWidths.contract_details + colWidths.schedule + colWidths.evm,
      bonds_risks: 40 + colWidths.name + colWidths.contract_details + colWidths.schedule + colWidths.evm + colWidths.linear,
      score_rating: 40 + colWidths.name + colWidths.contract_details + colWidths.schedule + colWidths.evm + colWidths.linear + colWidths.bonds_risks
    };

    const formatStartDate = (dateStr: string) => {
      if (!dateStr) return 'N/A';
      try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      } catch {
        return dateStr;
      }
    };

    const drawTableHeader = (y: number) => {
      doc.setFont('times', 'bold');
      doc.setFontSize(8.5);
      const headerNameLines = doc.splitTextToSize("PROJECT IDENTIFIER / TITLE", colWidths.name - 12);
      const headerContractDetailsLines = doc.splitTextToSize("CONTRACT DETAILS", colWidths.contract_details - 12);
      const headerScheduleLines = doc.splitTextToSize("SCHEDULE & OVERRUNS (%)", colWidths.schedule - 12);
      const headerEvmLines = doc.splitTextToSize("EVM INDICES (CPI / SPI)", colWidths.evm - 12);
      const headerLinearLines = doc.splitTextToSize("LINEAR PROGRESS BY LAYERS", colWidths.linear - 12);
      const headerBondsRisksLines = doc.splitTextToSize("GUARANTEES & RISKS", colWidths.bonds_risks - 12);
      const headerScoreRatingLines = doc.splitTextToSize("COMPLIANCE & GRADE", colWidths.score_rating - 12);

      const maxHeaderLines = Math.max(
        headerNameLines.length,
        headerContractDetailsLines.length,
        headerScheduleLines.length,
        headerEvmLines.length,
        headerLinearLines.length,
        headerBondsRisksLines.length,
        headerScoreRatingLines.length
      );
      const headerHeight = maxHeaderLines * 11 + 10;

      doc.setFillColor(30, 41, 59); // slate-800 professional navy header
      doc.rect(40, y, pageWidth - 80, headerHeight, 'F');

      doc.setFont('times', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);

      const drawCellLines = (lines: string[], x: number) => {
        const startY = y + (headerHeight - (lines.length * 11)) / 2 + 8;
        lines.forEach((line, idx) => {
          doc.text(line, x + 6, startY + idx * 11);
        });
      };

      drawCellLines(headerNameLines, colX.name);
      drawCellLines(headerContractDetailsLines, colX.contract_details);
      drawCellLines(headerScheduleLines, colX.schedule);
      drawCellLines(headerEvmLines, colX.evm);
      drawCellLines(headerLinearLines, colX.linear);
      drawCellLines(headerBondsRisksLines, colX.bonds_risks);
      drawCellLines(headerScoreRatingLines, colX.score_rating);

      // Header borders
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(1);
      doc.line(40, y, pageWidth - 40, y);
      doc.line(40, y + headerHeight, pageWidth - 40, y + headerHeight);
      doc.line(40, y, 40, y + headerHeight);
      doc.line(pageWidth - 40, y, pageWidth - 40, y + headerHeight);

      doc.line(colX.contract_details, y, colX.contract_details, y + headerHeight);
      doc.line(colX.schedule, y, colX.schedule, y + headerHeight);
      doc.line(colX.evm, y, colX.evm, y + headerHeight);
      doc.line(colX.linear, y, colX.linear, y + headerHeight);
      doc.line(colX.bonds_risks, y, colX.bonds_risks, y + headerHeight);
      doc.line(colX.score_rating, y, colX.score_rating, y + headerHeight);

      return headerHeight;
    };

    const initialHeaderHeight = drawTableHeader(curY);
    curY += initialHeaderHeight;

    processedProjects.forEach((p, idx) => {
      const audit = getAuditMetrics(p);

      const combinedTitle = p.name || 'Untitled Project';
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      const titleLines = doc.splitTextToSize(combinedTitle, colWidths.name - 12);

      // 1.5 Contract Details Lines
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      const contractorLines = doc.splitTextToSize(`Contractor: ${p.contractor || 'N/A'}`, colWidths.contract_details - 12);
      const consultantLines = doc.splitTextToSize(`Consultant: ${p.consultant || 'N/A'}`, colWidths.contract_details - 12);
      const commencedLines = doc.splitTextToSize(`Commenced: ${formatStartDate(p.startDate)}`, colWidths.contract_details - 12);
      const origCostLines = doc.splitTextToSize(`Orig. Cost: ${formatAccounting(p.origAmount || 0, 'Br.')} M`, colWidths.contract_details - 12);
      const cDetailsLines = [
        ...contractorLines,
        ...consultantLines,
        ...commencedLines,
        ...origCostLines
      ];

      // 2. Schedule Lines
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      const sLine1 = doc.splitTextToSize(`Time Elapsed: ${audit.timeElapsedPct.toFixed(2)}%`, colWidths.schedule - 12);
      const sLine2 = doc.splitTextToSize(`Time Overrun: ${audit.timeOverrunPct.toFixed(2)}%`, colWidths.schedule - 12);
      const sLine3 = doc.splitTextToSize(`Status: ${audit.scheduleStatusText}`, colWidths.schedule - 12);
      const sLine4 = doc.splitTextToSize(`Phys. Prog: ${(p.physicalProgress || 0).toFixed(2)}%`, colWidths.schedule - 12);

      // 3. EVM Lines
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      const evmLine1 = doc.splitTextToSize(`CPI Index: ${audit.CPI.toFixed(3)}`, colWidths.evm - 12);
      const evmLine2 = doc.splitTextToSize(`SPI Index: ${audit.SPI.toFixed(3)}`, colWidths.evm - 12);
      const evmLine3 = doc.splitTextToSize(audit.CPI >= 1.0 ? 'Under Budget' : 'Overspending', colWidths.evm - 12);
      const evmLine4 = doc.splitTextToSize(audit.SPI >= 1.0 ? 'Ahead Sched.' : 'Behind Sched.', colWidths.evm - 12);

      // 4. Linear Lines
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      const linLine1 = doc.splitTextToSize(`Subgrade: ${audit.subgradePct.toFixed(0)}% (P: ${audit.subgradePlan.toFixed(0)}%)`, colWidths.linear - 12);
      const linLine2 = doc.splitTextToSize(`Capping: ${audit.cappingPct.toFixed(0)}% (P: ${audit.cappingPlan.toFixed(0)}%)`, colWidths.linear - 12);
      const linLine3 = doc.splitTextToSize(`Subbase: ${audit.subbasePct.toFixed(0)}% (P: ${audit.subbasePlan.toFixed(0)}%)`, colWidths.linear - 12);
      const linLine4 = doc.splitTextToSize(`Basecourse: ${audit.basecoursePct.toFixed(0)}% (P: ${audit.basecoursePlan.toFixed(0)}%)`, colWidths.linear - 12);
      const linLine5 = doc.splitTextToSize(`Asphalt: ${audit.asphaltPct.toFixed(0)}% (P: ${audit.asphaltPlan.toFixed(0)}%)`, colWidths.linear - 12);

      // 5. Bonds & Risks Lines
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      const grLine1 = doc.splitTextToSize(`Bonds Logged: ${audit.totalBonds}`, colWidths.bonds_risks - 12);
      const grLine2 = doc.splitTextToSize(audit.expiredBondsCount > 0 ? `${audit.expiredBondsCount} Expired` : 'Guarantees Valid', colWidths.bonds_risks - 12);
      const grLine3 = doc.splitTextToSize(`Active Risks: ${audit.activeRisksCount}`, colWidths.bonds_risks - 12);
      const grLine4 = doc.splitTextToSize(audit.criticalRisksCount > 0 ? `${audit.criticalRisksCount} Critical` : 'Risks Managed', colWidths.bonds_risks - 12);

      // 6. Compliance Score & Grade Lines
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      const scoreLine = doc.splitTextToSize(`Score: ${audit.complianceScore}%`, colWidths.score_rating - 12);
      const gradeLine = doc.splitTextToSize(`Grade ${audit.ratingCode}`, colWidths.score_rating - 12);
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      const classLine = doc.splitTextToSize(audit.ratingClass, colWidths.score_rating - 12);

      // Pre-calculate heights using 12pt Times New Roman (15pt line spacing)
      const nameHeight = titleLines.length * 15 + 12;
      const cDetailsHeight = cDetailsLines.length * 15 + 12;
      const scheduleHeight = (sLine1.length + sLine2.length + sLine3.length + sLine4.length) * 15 + 12;
      const evmHeight = (evmLine1.length + evmLine2.length + evmLine3.length + evmLine4.length) * 15 + 12;
      const linearHeight = (linLine1.length + linLine2.length + linLine3.length + linLine4.length + linLine5.length) * 15 + 12;
      const bondsHeight = (grLine1.length + grLine2.length + grLine3.length + grLine4.length) * 15 + 12;
      const scoreHeight = (scoreLine.length + gradeLine.length + classLine.length) * 15 + 12;

      const rowHeight = Math.max(nameHeight, cDetailsHeight, scheduleHeight, evmHeight, linearHeight, bondsHeight, scoreHeight, 68);

      // Prevent overflow, add new page with header
      if (curY + rowHeight > pageHeight - 55) {
        doc.addPage();
        pageCount++;
        curY = 60;
        drawHeaderFooter();
        const headerH = drawTableHeader(curY);
        curY += headerH;
      }

      // Zebra striping background
      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.rect(40, curY, pageWidth - 80, rowHeight, 'F');
      
      // Cells outer border
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(1);
      doc.rect(40, curY, pageWidth - 80, rowHeight, 'S');

      // Grid vertical separators
      doc.line(colX.contract_details, curY, colX.contract_details, curY + rowHeight);
      doc.line(colX.schedule, curY, colX.schedule, curY + rowHeight);
      doc.line(colX.evm, curY, colX.evm, curY + rowHeight);
      doc.line(colX.linear, curY, colX.linear, curY + rowHeight);
      doc.line(colX.bonds_risks, curY, colX.bonds_risks, curY + rowHeight);
      doc.line(colX.score_rating, curY, colX.score_rating, curY + rowHeight);

      // 1. Render Project Identifier & Title
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      let yOffsetN = curY + 18;
      titleLines.forEach((line: string) => {
        doc.text(line, colX.name + 6, yOffsetN);
        yOffsetN += 15;
      });

      // 1.5 Render Contract Details
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(71, 85, 105);
      let yOffsetC = curY + 18;
      cDetailsLines.forEach((line: string) => {
        doc.text(line, colX.contract_details + 6, yOffsetC);
        yOffsetC += 15;
      });

      // 2. Render Schedule Audit
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(71, 85, 105);
      let yOffsetS = curY + 18;

      sLine1.forEach((line: string) => { doc.text(line, colX.schedule + 6, yOffsetS); yOffsetS += 15; });
      sLine2.forEach((line: string) => { doc.text(line, colX.schedule + 6, yOffsetS); yOffsetS += 15; });
      
      if (audit.scheduleStatus === 'Critical') {
        doc.setFont('times', 'bold');
        doc.setTextColor(220, 38, 38);
      } else if (audit.scheduleStatus === 'Warning') {
        doc.setFont('times', 'bold');
        doc.setTextColor(217, 119, 6);
      } else {
        doc.setFont('times', 'bold');
        doc.setTextColor(22, 163, 74);
      }
      sLine3.forEach((line: string) => { doc.text(line, colX.schedule + 6, yOffsetS); yOffsetS += 15; });

      doc.setFont('times', 'normal');
      doc.setTextColor(71, 85, 105);
      sLine4.forEach((line: string) => { doc.text(line, colX.schedule + 6, yOffsetS); yOffsetS += 15; });

      // 3. Render EVM Indices
      let yOffsetE = curY + 18;
      doc.setFont('times', 'bold');
      doc.setTextColor(15, 23, 42);
      evmLine1.forEach((line: string) => { doc.text(line, colX.evm + 6, yOffsetE); yOffsetE += 15; });
      evmLine2.forEach((line: string) => { doc.text(line, colX.evm + 6, yOffsetE); yOffsetE += 15; });

      doc.setFont('times', 'normal');
      doc.setTextColor(audit.CPI >= 1.0 ? 22 : 220, audit.CPI >= 1.0 ? 163 : 38, audit.CPI >= 1.0 ? 74 : 38);
      evmLine3.forEach((line: string) => { doc.text(line, colX.evm + 6, yOffsetE); yOffsetE += 15; });

      doc.setTextColor(audit.SPI >= 1.0 ? 22 : 220, audit.SPI >= 1.0 ? 163 : 38, audit.SPI >= 1.0 ? 74 : 38);
      evmLine4.forEach((line: string) => { doc.text(line, colX.evm + 6, yOffsetE); yOffsetE += 15; });

      // 4. Render Linear Progress
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(71, 85, 105);
      let yOffsetL = curY + 18;
      linLine1.forEach((line: string) => { doc.text(line, colX.linear + 6, yOffsetL); yOffsetL += 15; });
      linLine2.forEach((line: string) => { doc.text(line, colX.linear + 6, yOffsetL); yOffsetL += 15; });
      linLine3.forEach((line: string) => { doc.text(line, colX.linear + 6, yOffsetL); yOffsetL += 15; });
      linLine4.forEach((line: string) => { doc.text(line, colX.linear + 6, yOffsetL); yOffsetL += 15; });
      linLine5.forEach((line: string) => { doc.text(line, colX.linear + 6, yOffsetL); yOffsetL += 15; });

      // 5. Render Guarantees & Risks
      let yOffsetB = curY + 18;
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(71, 85, 105);
      grLine1.forEach((line: string) => { doc.text(line, colX.bonds_risks + 6, yOffsetB); yOffsetB += 15; });

      if (audit.expiredBondsCount > 0) {
        doc.setFont('times', 'bold');
        doc.setTextColor(220, 38, 38);
      } else {
        doc.setFont('times', 'normal');
        doc.setTextColor(22, 163, 74);
      }
      grLine2.forEach((line: string) => { doc.text(line, colX.bonds_risks + 6, yOffsetB); yOffsetB += 15; });

      doc.setFont('times', 'normal');
      doc.setTextColor(71, 85, 105);
      grLine3.forEach((line: string) => { doc.text(line, colX.bonds_risks + 6, yOffsetB); yOffsetB += 15; });

      if (audit.criticalRisksCount > 0) {
        doc.setFont('times', 'bold');
        doc.setTextColor(220, 38, 38);
      } else {
        doc.setFont('times', 'normal');
        doc.setTextColor(71, 85, 105);
      }
      grLine4.forEach((line: string) => { doc.text(line, colX.bonds_risks + 6, yOffsetB); yOffsetB += 15; });

      // 6. Render Compliance Score & Grade
      let yOffsetSc = curY + 18;
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      scoreLine.forEach((line: string) => { doc.text(line, colX.score_rating + 6, yOffsetSc); yOffsetSc += 15; });

      if (audit.complianceScore >= 85) {
        doc.setTextColor(22, 163, 74);
      } else if (audit.complianceScore >= 70) {
        doc.setTextColor(13, 148, 136);
      } else if (audit.complianceScore >= 50) {
        doc.setTextColor(217, 119, 6);
      } else {
        doc.setTextColor(220, 38, 38);
      }
      gradeLine.forEach((line: string) => { doc.text(line, colX.score_rating + 6, yOffsetSc); yOffsetSc += 15; });

      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139);
      classLine.forEach((line: string) => { doc.text(line, colX.score_rating + 6, yOffsetSc); yOffsetSc += 15; });

      curY += rowHeight;
    });

    // SECTION B: COMPREHENSIVE PERFORMANCE & RISK EVALUATION REPORT
    doc.addPage();
    pageCount++;
    curY = 82;
    drawHeaderFooter();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59);
    doc.text("SECTION B: AUDIT COMPREHENSIVE PERFORMANCE & RISK EVALUATION", 40, curY);
    
    // Header bottom thin divider line
    doc.setLineWidth(0.5);
    doc.setDrawColor(203, 213, 225);
    doc.line(40, curY + 6, pageWidth - 40, curY + 6);
    curY += 22;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("This section details individual project strategic Key Performance Indicators (KPIs), Right-of-Way (ROW) clearing bottlenecks, and critical schedule/cost variance commentary.", 40, curY);
    curY += 16;

    processedProjects.forEach((p, idx) => {
      const audit = getAuditMetrics(p);
      const rowClearMetric = (p.rowMetrics || []).find(m => m.name === 'ROW Obstruction free Section')?.value || 0;
      const rowClearPct = p.lengthKm > 0 ? (rowClearMetric / p.lengthKm) * 100 : 0;
      
      const kpiScores = getProjectKpiScores(p);
      const avgKpiScore = kpiScores.reduce((sum, item) => sum + item.score, 0) / kpiScores.length;

      const cardBlockHeight = 200;
      if (curY + cardBlockHeight > pageHeight - 55) {
        doc.addPage();
        pageCount++;
        curY = 75;
        drawHeaderFooter();
      }

      // Draw beautiful background box
      doc.setFillColor(248, 250, 252); // slate-50
      doc.rect(40, curY, pageWidth - 80, cardBlockHeight, 'F');
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.rect(40, curY, pageWidth - 80, cardBlockHeight, 'S');

      // Colored status line on the left side of the box
      let flagColor = [13, 148, 136]; // teal
      if (audit.complianceScore >= 85) flagColor = [22, 163, 74]; // green
      else if (audit.complianceScore >= 70) flagColor = [13, 148, 136]; // teal
      else if (audit.complianceScore >= 50) flagColor = [217, 119, 6]; // amber
      else flagColor = [220, 38, 38]; // red

      doc.setFillColor(flagColor[0], flagColor[1], flagColor[2]);
      doc.rect(40, curY, 4, cardBlockHeight, 'F');

      // Project Header inside box
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${idx + 1}. ${p.name.toUpperCase()}  (Compliance Grade: ${audit.ratingCode} | Score: ${audit.complianceScore}%)`, 52, curY + 14);

      // Section B Metrics - Column Layout
      let colYOffset = curY + 28;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(30, 41, 59);

      // Column 1: Time, Cost & Progress Performance
      doc.text("TIME, COST & PROGRESS PERFORMANCE", 52, colYOffset);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`• Progress Conformance: ${p.physicalProgress.toFixed(2)}% Actual vs ${audit.plannedPct.toFixed(2)}% Plan`, 52, colYOffset + 11);
      doc.text(`• Eng. Qty Pavement Layer Completion: ${(audit.averageLayerPct || 0).toFixed(2)}% average depth`, 52, colYOffset + 22);
      doc.text(`• Schedule Index (SPI): ${audit.SPI.toFixed(3)} (${audit.SPI >= 1.0 ? 'Ahead/On-Schedule' : 'Behind Schedule'})`, 52, colYOffset + 33);
      doc.text(`• Cost Index (CPI): ${audit.CPI.toFixed(3)} (${audit.CPI >= 1.0 ? 'Under/On-Budget' : 'Overspending'})`, 52, colYOffset + 44);
      doc.text(`• Authorized Extension (EOT): ${p.eotDays || 0} days (Time Overrun: ${audit.timeOverrunPct.toFixed(2)}%)`, 52, colYOffset + 55);

      // Column 2: Right-of-Way (ROW) Performance
      let col2X = 310;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text("RIGHT-OF-WAY (ROW) & UTILITIES PERFORMANCE", col2X, colYOffset);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`• ROW Cleared Corridor: ${rowClearMetric.toFixed(2)} Km of ${p.lengthKm.toFixed(2)} Km total (${rowClearPct.toFixed(2)}%)`, col2X, colYOffset + 11);
      
      // Calculate Utilities compensation totals
      const utilCompensations = p.utilityCompensation || [];
      const totalUtilRequired = utilCompensations.reduce((sum, u) => sum + (parseFloat(u.compensationRequired as any) || 0), 0);
      const totalUtilPaid = utilCompensations.reduce((sum, u) => sum + (parseFloat(u.compensationPaid as any) || 0), 0);
      const totalUtilUnpaid = utilCompensations.reduce((sum, u) => sum + (parseFloat(u.unpaidBalance as any) || 0), 0);
      
      const compPaid = (p.rowMetrics || []).find(m => m.name === 'Compensation Paid by ERA')?.value || 0;
      const totalDisbursedCompensation = compPaid + totalUtilPaid;

      const poleRemoved = (p.rowMetrics || []).find(m => m.name === 'Electric Pole Removal Handedover (No)')?.value || 0;
      const poleReq = (p.rowMetrics || []).find(m => m.name === 'Electric Pole Removal Requested (No)')?.value || 0;
      doc.text(`• Utility Pole Clearance: ${poleRemoved} of ${poleReq} units relocated`, col2X, colYOffset + 22);

      // Column 3: Strategic KPI Performance
      let col3X = 570;
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text("STRATEGIC KPI EVALUATION (12 GOALS)", col3X, colYOffset);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`• Cumulative Strategic KPI Score: ${avgKpiScore.toFixed(2)}%`, col3X, colYOffset + 11);
      const qGoal = kpiScores.find(g => g.id === 'G5')?.score || 0;
      const desGoal = kpiScores.find(g => g.id === 'G6')?.score || 0;
      const clmGoal = kpiScores.find(g => g.id === 'G7')?.score || 0;
      const safeGoal = kpiScores.find(g => g.id === 'G9')?.score || 0;
      doc.text(`• Quality Assurance (G5): ${qGoal.toFixed(2)}% compliant`, col3X, colYOffset + 22);
      doc.text(`• Design & Review (G6): ${desGoal.toFixed(2)}% score`, col3X, colYOffset + 33);
      doc.text(`• Claims & Disputes (G7): ${clmGoal.toFixed(2)}% score`, col3X, colYOffset + 44);
      doc.text(`• ESOSH Health & Safety (G9): ${safeGoal.toFixed(2)}% score`, col3X, colYOffset + 55);

      // Active Breaches / Warnings at bottom of card
      let alertY = colYOffset + 68;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      if (audit.activeBreaches.length > 0) {
        doc.setTextColor(220, 38, 38);
        doc.text(`Active Breaches / Red Flags: ${audit.activeBreaches.join(' | ')}`, 52, alertY);
      } else {
        doc.setTextColor(22, 163, 74);
        doc.text("Active Breaches / Red Flags: None. Project is compliant with ERA contract conditions.", 52, alertY);
      }

      // FIDIC 2017 Contract Compliance Evaluation (Red vs Yellow Book)
      const isDB = p.contractType === 'DB';
      let fidicY = colYOffset + 78;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text(`FIDIC 2017 CONTRACT OBLIGATIONS & RESPONSIBILITIES COMPLIANCE (${isDB ? 'YELLOW BOOK' : 'RED BOOK'}):`, 52, fidicY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);

      const contractorEval = getFidicEvaluation(p, 'contractor');
      const consultantEval = getFidicEvaluation(p, 'consultant');

      if (isDB) {
        doc.text(`• Contractor: ${p.contractor || 'N/A'} | FIDIC Yellow Book Clauses 4.1, 4.2, 5.1/5.2, 8.3, 4.21, 14.2 Average Score: ${contractorEval.averageScore}%`, 52, fidicY + 11);
        doc.text(`• Consultant: ${p.consultant || 'N/A'} | FIDIC Yellow Book Clauses 3.1, 3.7, 5.2, 14.6, 8.4 Average Score: ${consultantEval.averageScore}%`, 52, fidicY + 22);
      } else {
        doc.text(`• Contractor: ${p.contractor || 'N/A'} | FIDIC Red Book Clauses 4.1, 4.2, 8.3, 4.21, 14.2 Average Score: ${contractorEval.averageScore}%`, 52, fidicY + 11);
        doc.text(`• Consultant: ${p.consultant || 'N/A'} | FIDIC Red Book Clauses 3.1, 3.7, 14.6, 8.4 Average Score: ${consultantEval.averageScore}%`, 52, fidicY + 22);
      }

      // Narrative evaluation synthesis
      let synthesisY = colYOffset + 108;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text("AUDITOR COMPREHENSIVE PERFORMANCE EVALUATION SYNTHESIS:", 52, synthesisY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);

      const progressPerf = p.physicalProgress >= audit.plannedPct ? "ahead or on track" : "behind schedule";
      const budgetPerf = audit.CPI >= 1.0 ? "within budget" : "over-budget";
      const kpiPerf = avgKpiScore >= 75 ? "satisfactory" : "needs attention";
      const rowPerf = rowClearPct >= 90 ? "completed/highly advanced" : "lagging";

      const synthesisText = `This project is performing ${progressPerf} with respect to physical progress conformance, and is operating ${budgetPerf} under current financial metrics. Under strategic KPIs, the project has a ${kpiPerf} score of ${avgKpiScore.toFixed(2)}%. Right-of-Way (ROW) clearance stands at ${rowClearPct.toFixed(2)}% which is considered ${rowPerf}. Utilities relocation is currently ${totalUtilUnpaid > 0 ? `active with ${formatAccounting(totalUtilUnpaid, 'Br.')} Million unpaid liabilities` : "completed/fully settled"}. Both Contractor (${contractorEval.averageScore}% compliant) and Consultant (${consultantEval.averageScore}% compliant) have been audited against standard FIDIC 2017 ${isDB ? 'Yellow Book (Design-Build)' : 'Red Book (Design-Bid-Build)'} obligations. This comprehensive audit recommends immediate corrective measures to mitigate schedule delay, expedite unpaid utility relocations, and uphold strict strategic KPI compliance.`;

      const synthesisLines = doc.splitTextToSize(synthesisText, pageWidth - 140);
      let synLineY = synthesisY + 10.5;
      synthesisLines.forEach((line: string) => {
        doc.text(line, 52, synLineY);
        synLineY += 10.5;
      });

      curY += cardBlockHeight + 12;
    });

    // SECTION C: CRITICAL ENGINEERING QUANTITIES & UNIT OF MEASUREMENT (UoM) VALIDATION
    doc.addPage();
    pageCount++;
    curY = 82;
    drawHeaderFooter();

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(30, 41, 59);
    doc.text("SECTION C: QUANTITIES COMPLIANCE", 40, curY);
    
    // Header bottom thin divider line
    doc.setLineWidth(0.5);
    doc.setDrawColor(203, 213, 225);
    doc.line(40, curY + 6, pageWidth - 40, curY + 6);
    curY += 22;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("This section performs a critical, rigorous evaluation of bill-of-quantities (BOQ) metrics by their specific unit of measurement (M3, Km, Ha, No.) and identifies execution slippages and variances.", 40, curY);
    curY += 18;

    processedProjects.forEach((p, idx) => {
      const evaluation = evaluateEngineeringQuantities(p.quantities || []);
      
      const blockHeight = 45 + Math.min(7, evaluation.items.length) * 13.5 + 15;
      if (curY + blockHeight > pageHeight - 55) {
        doc.addPage();
        pageCount++;
        curY = 75;
        drawHeaderFooter();
      }

      // Card Container
      doc.setFillColor(248, 250, 252);
      doc.rect(40, curY, pageWidth - 80, blockHeight, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.rect(40, curY, pageWidth - 80, blockHeight, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${idx + 1}. QUANTITIES COMPLIANCE: ${p.name.toUpperCase()}`, 52, curY + 16);

      // Draw grid headers
      let gridY = curY + 28;
      doc.setFillColor(51, 65, 85);
      doc.rect(52, gridY, pageWidth - 104, 15, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text("Quantity Description", 58, gridY + 10.5);
      doc.text("UoM", 300, gridY + 10.5);
      doc.text("Contract Design", 380, gridY + 10.5);
      doc.text("Scheduled Plan", 470, gridY + 10.5);
      doc.text("Actual Executed", 560, gridY + 10.5);
      doc.text("Variance", 650, gridY + 10.5);

      gridY += 15;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);

      // Render items
      evaluation.items.slice(0, 7).forEach((item) => {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text(item.name, 58, gridY + 10.5);
        doc.text(item.unit, 300, gridY + 10.5);
        doc.text(item.designValue.toLocaleString(), 380, gridY + 10.5);
        doc.text(item.plannedValue.toLocaleString(), 470, gridY + 10.5);
        
        // Color actual values based on ratio
        if (item.variance < 0) {
          doc.setTextColor(220, 38, 38); // Red
        } else {
          doc.setTextColor(22, 163, 74); // Green
        }
        doc.text(item.actualValue.toLocaleString(), 560, gridY + 10.5);
        doc.text((item.variance >= 0 ? "+" : "") + item.variance.toLocaleString(), 650, gridY + 10.5);

        gridY += 13.5;
      });

      curY += blockHeight + 15;
    });

    // Final Page Sign-off section
    if (curY + 90 > pageHeight - 55) {
      doc.addPage();
      pageCount++;
      curY = 75;
      drawHeaderFooter();
    }

    curY += 25;
    doc.setDrawColor(226, 232, 240);
    doc.line(40, curY, pageWidth - 40, curY);
    curY += 15;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text("OFFICIAL ERA COMPLIANCE AUDIT SIGN-OFF", 40, curY);

    curY += 35;
    // Sign line 1
    doc.setDrawColor(148, 163, 184);
    doc.line(40, curY, 220, curY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text("Prepared By: Project Management Auditor", 40, curY + 12);

    // Sign line 2
    doc.line(pageWidth - 220, curY, pageWidth - 40, curY);
    doc.text("Approved By: Chief Auditor / Regional PMO Board", pageWidth - 220, curY + 12);

    // Ensure page counts are correct in footer for all pages
    for (let j = 1; j <= pageCount; j++) {
      doc.setPage(j);
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Page ${j} of ${pageCount}`, pageWidth - 60, pageHeight - 24);
    }

    doc.save(`ERA_Compliance_Audit_Report_${groupType}_${selectedGroup.replace(/\s+/g, '_')}.pdf`);
  };

  // Export Project Compliance & Performance Audit Report (CSV)
  const handleExportAuditCSV = () => {
    const csvHeaders = [
      'Project Name',
      'Program Directorate',
      'PMO Grouping',
      'Client',
      'Consultant Engineer',
      'Contractor',
      'Classification',
      'Contract Type (DB/DBB)',
      'Total Section Length',
      'Signing Date',
      'Commencement Date',
      'Original Contract Completion Date',
      'Extension of Time (EOT Days)',
      'Revised Completion Date',
      'Physical Progress (%)',
      'Time Elapsed (%)',
      'Cost Performance Index',
      'Schedule Performance Index',
      'Expired Guarantees Count',
      'Original Contract Value (ETB)',
      'Revised Contract Value (ETB)',
      'Total Todate Bill Summary',
      'Price Adjustment',
      'Total Todate Certified IPC',
      'Earned Value',
      'Actual Cost',
      'Cost Variance',
      'Schedule Variance',
      'Estimate At Completion',
      'Provisional Sum (ETB)',
      'Advance Payment',
      'Advance Repayment'
    ];

    const formatDateForCSV = (dateStr: string) => {
      if (!dateStr) return '';
      try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10);
          const d = parseInt(parts[2], 10);
          if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
            return `${m}/${d}/${y}`;
          }
        }
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
      } catch {
        return dateStr;
      }
    };

    const addDaysToStartDate = (startDateStr: string, daysToAdd: number): string => {
      if (!startDateStr) return '';
      try {
        const parts = startDateStr.split('-');
        if (parts.length === 3) {
          const y = parseInt(parts[0], 10);
          const m = parseInt(parts[1], 10) - 1;
          const d = parseInt(parts[2], 10);
          const targetDate = new Date(y, m, d + daysToAdd);
          return `${targetDate.getMonth() + 1}/${targetDate.getDate()}/${targetDate.getFullYear()}`;
        } else {
          const targetDate = new Date(new Date(startDateStr).getTime() + daysToAdd * 86400000);
          return `${targetDate.getMonth() + 1}/${targetDate.getDate()}/${targetDate.getFullYear()}`;
        }
      } catch {
        return '';
      }
    };

    const formatFinancialForCSV = (val: number | string | undefined | null) => {
      if (val === undefined || val === null || val === '') return '';
      const num = typeof val === 'string' ? parseFloat(val) : val;
      if (isNaN(num)) return '';
      const rawValue = (Math.abs(num) > 0 && Math.abs(num) < 10000) ? num * 1000000 : num;
      if (rawValue % 1 === 0) {
        return rawValue.toFixed(0);
      }
      const strVal = rawValue.toString();
      const dotIndex = strVal.indexOf('.');
      if (dotIndex !== -1 && strVal.length - dotIndex - 1 === 1) {
        return rawValue.toFixed(2);
      }
      return rawValue.toFixed(2);
    };

    const rows = processedProjects.map(p => {
      const audit = getAuditMetrics(p);
      const totalDays = (p.origDays || 0) + (p.eotDays || 0) + (p.interimEotDays || 0);

      // Date calculations
      let origCompletionDate = '';
      let revisedCompletionDate = '';
      if (p.startDate) {
        origCompletionDate = addDaysToStartDate(p.startDate, p.origDays || 0);
        revisedCompletionDate = addDaysToStartDate(p.startDate, totalDays);
      }

      // Time Elapsed calculation
      let timeElapsedPctCell = '0.00%';
      if (p.startDate) {
        if (totalDays <= 0) {
          timeElapsedPctCell = '0.00%';
        } else {
          const parseDate = (str: string) => {
            const pts = str.split('-');
            if (pts.length === 3) {
              return new Date(parseInt(pts[0], 10), parseInt(pts[1], 10) - 1, parseInt(pts[2], 10));
            }
            return new Date(str);
          };
          const comm = parseDate(p.startDate);
          comm.setHours(0, 0, 0, 0);

          const today = new Date();
          today.setHours(0, 0, 0, 0);

          let daysElapsed = 0;
          if (today.getTime() >= comm.getTime()) {
            const diffTime = today.getTime() - comm.getTime();
            daysElapsed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          }

          const pct = Math.min(100, (daysElapsed / totalDays) * 100);
          timeElapsedPctCell = `${pct.toFixed(2)}%`;
        }
      }

      // Physical Progress formatted
      const physicalProgressPctCell = p.physicalProgress !== undefined && p.physicalProgress !== null
        ? `${p.physicalProgress.toFixed(2)}%`
        : '0.00%';

      // Payment values extraction
      const getPaymentVal = (itemName: string) => {
        if (!p.payment) return undefined;
        const match = p.payment.find(item => item.item.trim().toLowerCase() === itemName.toLowerCase());
        return match ? match.amount : undefined;
      };

      const advPayment = formatFinancialForCSV(getPaymentVal('Advance Payment'));
      const advRepay = formatFinancialForCSV(getPaymentVal('Advance Repayment'));
      const billSummary = formatFinancialForCSV(getPaymentVal('Total Todate Bill Summary'));
      const priceAdj = formatFinancialForCSV(getPaymentVal('Price Adjustment'));
      const certifiedIpc = formatFinancialForCSV(getPaymentVal('Total Todate Certified IPC'));

      // Calculate EVM metrics dynamically for the CSV
      const BAC = (p.origAmount || 0) * 1_000_000;
      const AC = ((p.payment || []).find(x => x.item.trim().toLowerCase() === 'total todate certified ipc') || { amount: 0 }).amount;
      const EV = AC * ((p.physicalProgress || 0) / 100);
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

      const CPI = AC > 0 ? (EV / AC) : null;
      const SPI = PV > 0 ? (EV / PV) : null;
      const CV = AC > 0 ? EV - AC : null;
      const SV = PV > 0 ? EV - PV : null;
      const EAC = (CPI && CPI > 0) ? (BAC / CPI) : null;

      const cpiStr = CPI !== null ? CPI.toFixed(3) : '';
      const spiStr = SPI !== null ? SPI.toFixed(3) : '';
      const evStr = EV > 0 ? formatFinancialForCSV(EV) : '';
      const acStr = AC > 0 ? formatFinancialForCSV(AC) : '';
      const cvStr = CV !== null ? formatFinancialForCSV(CV) : '';
      const svStr = SV !== null ? formatFinancialForCSV(SV) : '';
      const eacStr = EAC !== null ? formatFinancialForCSV(EAC) : '';

      return [
        p.name || 'Untitled Project',
        p.programDirectorate || 'Southern',
        p.pmo || 'PMO 1',
        p.client || 'N/A',
        p.consultant || 'N/A',
        p.contractor || 'N/A',
        p.classification || 'N/A',
        p.contractType || 'DBB',
        p.lengthKm !== undefined && p.lengthKm !== null ? p.lengthKm : '',
        formatDateForCSV(p.signDate),
        formatDateForCSV(p.startDate),
        origCompletionDate,
        p.eotDays || 0,
        revisedCompletionDate,
        physicalProgressPctCell,
        timeElapsedPctCell,
        cpiStr,
        spiStr,
        audit.expiredBondsCount || 0,
        formatFinancialForCSV(p.origAmount),
        formatFinancialForCSV(p.origAmount + (p.variation || 0)),
        billSummary,
        priceAdj,
        certifiedIpc,
        evStr,
        acStr,
        cvStr,
        svStr,
        eacStr,
        formatFinancialForCSV(p.provisionalSum),
        advPayment,
        advRepay
      ];
    });

    const csvContent = [
      csvHeaders.join(','),
      ...rows.map(row => row.map(v => {
        const cellString = String(v === null || v === undefined ? '' : v).replace(/"/g, '""');
        return cellString.includes(',') || cellString.includes('\n') || cellString.includes('"') 
          ? `"${cellString}"` 
          : cellString;
      }).join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ERA_Compliance_Audit_Data_${groupType}_${selectedGroup.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export beautiful Matured Payments & Outstanding Claims report (CSV)
  const handleExportPaymentsCSV = () => {
    const csvHeaders = [
      'Project Name',
      'Client',
      'Consultant Engineer',
      'Contractor',
      'Program Directorate',
      'PMO Grouping',
      'USD Exchange Rate',
      'Total Certified IPCs',
      'Paid IPCs',
      'Outstanding Unpaid IPCs',
      'Matured Overdue IPCs (>56 Days)',
      'Total Certified Amount (ETB)',
      'Total Certified Amount (USD)',
      'Total Paid Amount (ETB)',
      'Total Paid Amount (USD)',
      'Total Outstanding Amount (ETB)',
      'Total Outstanding Amount (USD)',
      'Matured Overdue Amount (ETB)',
      'Matured Overdue Amount (USD)',
      'Combined Certified Amount (ETB equivalent)',
      'Combined Outstanding Amount (ETB equivalent)',
      'Combined Matured Amount (ETB equivalent)',
      'Payment Compliance Status'
    ];

    const rows = processedProjects.map(p => {
      const m = getProjectPaymentMetrics(p);
      return [
        p.name || 'Untitled Project',
        p.client || 'N/A',
        p.consultant || 'N/A',
        p.contractor || 'N/A',
        p.programDirectorate || 'Southern',
        p.pmo || 'PMO 1',
        p.usdExchangeRate || 28.0,
        m.totalIpcs,
        m.paidIpcs,
        m.unpaidIpcs,
        m.maturedIpcsCount,
        m.certEtb,
        m.certUsd,
        m.paidEtb,
        m.paidUsd,
        m.unpaidEtb,
        m.unpaidUsd,
        m.maturedEtb,
        m.maturedUsd,
        m.combinedCertified,
        m.combinedPaid,
        m.combinedUnpaid,
        m.combinedMatured,
        m.statusLabel
      ];
    });

    const csvContent = [
      csvHeaders.join(','),
      ...rows.map(row => row.map(v => {
        const cellString = String(v === null || v === undefined ? '' : v).replace(/"/g, '""');
        return cellString.includes(',') || cellString.includes('\n') || cellString.includes('"') 
          ? `"${cellString}"` 
          : cellString;
      }).join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ERA_Matured_Payments_Data_${groupType}_${selectedGroup.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export beautiful Bond Guarantees report (CSV)
  const handleExportBondsCSV = () => {
    const csvHeaders = [
      'Project Name',
      'Client',
      'Consultant Engineer',
      'Contractor',
      'Program Directorate',
      'PMO Grouping',
      'Total Logged Bonds',
      'Valid & Active Bonds',
      'Expired Bonds',
      'Total Bonds Value (ETB)'
    ];

    const rows = processedProjects.map(p => {
      const bonds = p.bonds || [];
      const totalCount = bonds.length;
      const validCount = bonds.filter(b => b.status === 'Valid' || (b.status && (b.status.toLowerCase().includes('recovered') || b.status.toLowerCase().includes('returned') || b.status.toLowerCase().includes('amortized')))).length;
      const expiredCount = bonds.filter(b => {
        if (b.status && (b.status.toLowerCase().includes('recovered') || b.status.toLowerCase().includes('returned') || b.status.toLowerCase().includes('amortized') || b.status === 'N/A')) return false;
        if (b.status === 'Expired') return true;
        if (b.expireDate) {
          try { return new Date(b.expireDate) < new Date(); } catch { return false; }
        }
        return false;
      }).length;
      const totalVal = bonds.reduce((sum, b) => sum + (b.amount || 0), 0);

      return [
        p.name || 'Untitled Project',
        p.client || 'N/A',
        p.consultant || 'N/A',
        p.contractor || 'N/A',
        p.programDirectorate || 'Southern',
        p.pmo || 'PMO 1',
        totalCount,
        validCount,
        expiredCount,
        totalVal
      ];
    });

    const csvContent = [
      csvHeaders.join(','),
      ...rows.map(row => row.map(v => {
        const cellString = String(v === null || v === undefined ? '' : v).replace(/"/g, '""');
        return cellString.includes(',') || cellString.includes('\n') || cellString.includes('"') 
          ? `"${cellString}"` 
          : cellString;
      }).join(','))
    ].join('\n');

    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ERA_Bond_Guarantees_Data_${groupType}_${selectedGroup.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export beautiful Bond Guarantees status report (PDF)
  const handleExportBondsPDF = () => {
    const doc = new jsPDF('l', 'pt', 'a4'); // Landscape A4 (841.89 pt x 595.28 pt)
    
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

    const drawHeaderFooter = () => {
      // Elegant blue compliance accent line
      doc.setDrawColor(37, 99, 235); // Blue bond accent
      doc.setLineWidth(3);
      doc.line(40, 25, pageWidth - 40, 25);

      // Title & Metadata Block
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("ETHIOPIAN ROADS ADMINISTRATION (ERA) • FINANCIAL & LEGAL COMPLIANCE", 40, 42);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`CMS - SECURITIES & BANK GUARANTEES AUDIT REPORT • AUDITOR: ${currentUserObj.username.toUpperCase()}`, 40, 54);

      const dStr = new Date().toLocaleString();
      doc.text(`AUDIT GENERATION DATE: ${dStr}`, pageWidth - 260, 42);

      // Page numbers
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text(`PAGE ${pageCount}`, pageWidth - 50, pageHeight - 30);
      
      doc.setFont('helvetica', 'normal');
      doc.text("CONFIDENTIAL - ERA ERP COMPLIANCE OFFICE", 40, pageHeight - 30);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.5);
      doc.line(40, pageHeight - 45, pageWidth - 40, pageHeight - 45);
    };

    drawHeaderFooter();

    // Render Stats Cards Block at top of page 1
    const cardWidth = 175;
    const cardHeight = 50;
    const cardY = 70;

    // Card 1: Total Guarantees
    doc.setFillColor(248, 250, 252); // slate-50
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(40, cardY, cardWidth, cardHeight, 6, 6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("TOTAL LOGGED GUARANTEES", 48, cardY + 16);
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(`${bondStats.totalBondsCount} Guarantees`, 48, cardY + 32);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Valued at ETB ${bondStats.totalBondsValue.toLocaleString()}`, 48, cardY + 44);

    // Card 2: Valid Guarantees
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(40 + cardWidth + 10, cardY, cardWidth, cardHeight, 6, 6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("VALID & ACTIVE GUARANTEES", 40 + cardWidth + 18, cardY + 16);
    doc.setFontSize(12);
    doc.setTextColor(16, 185, 129); // emerald-500
    doc.text(`${bondStats.validBondsCount} Valid`, 40 + cardWidth + 18, cardY + 32);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`ETB ${bondStats.validBondsValue.toLocaleString()}`, 40 + cardWidth + 18, cardY + 44);

    // Card 3: Expired Guarantees
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(40 + (cardWidth + 10) * 2, cardY, cardWidth, cardHeight, 6, 6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("CRITICAL EXPIRED GUARANTEES", 40 + (cardWidth + 10) * 2 + 8, cardY + 16);
    doc.setFontSize(12);
    doc.setTextColor(220, 38, 38); // red-600
    doc.text(`${bondStats.expiredBondsCount} Expired`, 40 + (cardWidth + 10) * 2 + 8, cardY + 32);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`ETB ${bondStats.expiredBondsValue.toLocaleString()}`, 40 + (cardWidth + 10) * 2 + 8, cardY + 44);

    // Card 4: Group Filter
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(40 + (cardWidth + 10) * 3, cardY, cardWidth, cardHeight, 6, 6, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text("GROUP CLASSIFICATION FOCUS", 40 + (cardWidth + 10) * 3 + 8, cardY + 16);
    doc.setFontSize(10);
    doc.setTextColor(79, 70, 229); // indigo-600
    const wrappedGroupText = doc.splitTextToSize(selectedGroup.toUpperCase(), cardWidth - 16);
    doc.text(wrappedGroupText[0] || '', 40 + (cardWidth + 10) * 3 + 8, cardY + 30);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Query dimension: ${groupType.toUpperCase()}`, 40 + (cardWidth + 10) * 3 + 8, cardY + 44);

    curY = 145;

    // Headers
    const colX = {
      name: 40,
      bonds: 280,
      valid: 550,
      expired: 675
    };

    const drawTableHeader = (y: number) => {
      doc.setFillColor(30, 41, 59); // dark slate bg
      doc.rect(40, y, pageWidth - 80, 24, 'F');
      
      doc.setFont('times', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      
      doc.text("PROJECT ID & TITLE", colX.name + 6, y + 16);
      doc.text("TOTAL LOGGED GUARANTEES & BREAKDOWN", colX.bonds + 6, y + 16);
      doc.text("VALID & ACTIVE", colX.valid + 6, y + 16);
      doc.text("EXPIRED (CRITICAL)", colX.expired + 6, y + 16);
    };

    drawTableHeader(curY);
    curY += 24;

    processedProjects.forEach((p, idx) => {
      const bonds = p.bonds || [];
      const totalCount = bonds.length;
      const totalVal = bonds.reduce((sum, b) => sum + (b.amount || 0), 0);
      const validCount = bonds.filter(b => b.status === 'Valid').length;
      const validVal = bonds.filter(b => b.status === 'Valid').reduce((sum, b) => sum + (b.amount || 0), 0);
      const expiredCount = bonds.filter(b => b.status === 'Expired').length;
      const expiredVal = bonds.filter(b => b.status === 'Expired').reduce((sum, b) => sum + (b.amount || 0), 0);

      // Pre-calculate wrapped texts with strict boundary limits
      // Col 1: Name & Contractor (boundary: 228pt)
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      const cleanName = p.name.replace(/[^\x00-\x7F]/g, "");
      const wrappedName = doc.splitTextToSize(cleanName, 228);

      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      const contractorText = `ID: ${p.id.toUpperCase().substring(0, 16)}  |  Contractor: ${p.contractor || 'N/A'}`;
      const wrappedContractor = doc.splitTextToSize(contractorText, 228);

      // Col 2: Total Logged & Bonds breakdown (boundary: 258pt)
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      const bondsSummaryText = `${totalCount} Guarantees (ETB ${totalVal.toLocaleString()})`;
      const wrappedBondsSummary = doc.splitTextToSize(bondsSummaryText, 258);

      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      let bondLinesTotal = 0;
      const wrappedBonds = bonds.map((b) => {
         const bStatus = b.status || 'Unknown';
         const bAmountStr = (b.amount || 0) > 0 ? ` - ETB ${(b.amount || 0).toLocaleString()}` : '';
         const bText = `• ${b.type || 'Guarantee'}: ${bStatus} (${b.bank || 'Unknown Bank'}${bAmountStr})`;
         const splitBText = doc.splitTextToSize(bText, 258);
         bondLinesTotal += splitBText.length;
         return { split: splitBText, status: bStatus };
      });

      // Col 3: Valid (boundary: 113pt)
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      const validCountText = `${validCount} Valid`;
      const wrappedValidCount = doc.splitTextToSize(validCountText, 113);

      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      const validValText = `ETB ${validVal.toLocaleString()}`;
      const wrappedValidVal = doc.splitTextToSize(validValText, 113);

      // Col 4: Expired (boundary: 115pt)
      let wrappedExpiredCount: string[] = [];
      let wrappedExpiredVal: string[] = [];
      if (expiredCount > 0) {
        doc.setFont('times', 'bold');
        doc.setFontSize(12);
        wrappedExpiredCount = doc.splitTextToSize(`${expiredCount} EXPIRED`, 115);
        wrappedExpiredVal = doc.splitTextToSize(`ETB ${expiredVal.toLocaleString()}`, 115);
      } else {
        doc.setFont('times', 'normal');
        doc.setFontSize(12);
        wrappedExpiredCount = doc.splitTextToSize("0 Expired", 115);
        wrappedExpiredVal = doc.splitTextToSize("No alert status", 115);
      }

      // Height calculations based on 12pt Times New Roman (15pt line spacing)
      const col1Height = (wrappedName.length * 15) + (wrappedContractor.length * 15) + 12;
      const col2Height = (wrappedBondsSummary.length * 15) + (bondLinesTotal * 15) + 12;
      const col3Height = (wrappedValidCount.length * 15) + (wrappedValidVal.length * 15) + 12;
      const col4Height = (wrappedExpiredCount.length * 15) + (wrappedExpiredVal.length * 15) + 12;
      const rowHeight = Math.max(52, col1Height, col2Height, col3Height, col4Height) + 12;

      if (curY + rowHeight > pageHeight - 55) {
        doc.addPage();
        pageCount++;
        curY = 55;
        drawHeaderFooter();
        drawTableHeader(curY);
        curY += 24;
      }

      // Zebra striping
      if (idx % 2 === 1) {
        doc.setFillColor(250, 251, 252);
        doc.rect(40, curY, pageWidth - 80, rowHeight, 'F');
      }

      // Border bottom
      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.5);
      doc.line(40, curY + rowHeight, pageWidth - 40, curY + rowHeight);

      // Col 1: Project Name & Contractor
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(15, 23, 42);
      doc.text(wrappedName, colX.name + 6, curY + 18);
      
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139);
      doc.text(wrappedContractor, colX.name + 6, curY + 18 + (wrappedName.length * 15));

      // Col 2: Total Logged & Bonds Breakdown
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(51, 65, 85);
      doc.text(wrappedBondsSummary, colX.bonds + 6, curY + 18);
      
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      let currentBondsY = curY + 18 + (wrappedBondsSummary.length * 15) + 3;
      wrappedBonds.forEach((wb) => {
        if (wb.status === 'Valid') {
            doc.setTextColor(16, 185, 129); // green
        } else if (wb.status === 'Expired') {
            doc.setTextColor(220, 38, 38); // red
        } else {
            doc.setTextColor(217, 119, 6); // amber
        }
        doc.text(wb.split, colX.bonds + 6, currentBondsY);
        currentBondsY += (wb.split.length * 15);
      });

      // Col 3: Valid
      doc.setFont('times', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(16, 185, 129);
      doc.text(wrappedValidCount, colX.valid + 6, curY + 18);
      doc.setFont('times', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(100, 116, 139);
      doc.text(wrappedValidVal, colX.valid + 6, curY + 18 + (wrappedValidCount.length * 15));

      // Col 4: Expired
      if (expiredCount > 0) {
        doc.setFont('times', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(220, 38, 38);
        doc.text(wrappedExpiredCount, colX.expired + 6, curY + 18);
        doc.text(wrappedExpiredVal, colX.expired + 6, curY + 18 + (wrappedExpiredCount.length * 15));
      } else {
        doc.setFont('times', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(100, 116, 139);
        doc.text(wrappedExpiredCount, colX.expired + 6, curY + 18);
        doc.setTextColor(148, 163, 184);
        doc.text(wrappedExpiredVal, colX.expired + 6, curY + 18 + (wrappedExpiredCount.length * 15));
      }

      curY += rowHeight;
    });

    // Save PDF
    const gName = selectedGroup.replace(/\s+/g, '_');
    doc.save(`ERA_Bonds_Guarantee_Report_${groupType}_${gName}.pdf`);
  };

  // Export beautiful Matured Payments & Outstanding Claims report (PDF)
  const handleExportPaymentsPDF = () => {
    const doc = new jsPDF('l', 'pt', 'a4'); // Landscape A4 (841.89 pt x 595.28 pt)
    
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

    const drawHeaderFooter = () => {
      // Elegant Emerald compliance accent line
      doc.setDrawColor(16, 185, 129); // Emerald payment accent
      doc.setLineWidth(3);
      doc.line(40, 25, pageWidth - 40, 25);

      // Title & Metadata Block
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text("ETHIOPIAN ROADS ADMINISTRATION (ERA) • FINANCIAL MONITORING OFFICE", 40, 42);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`CMS - CONTRACT MONITORING & OUTSTANDING IPC CLAIMS AUDIT • AUDITOR: ${currentUserObj.username.toUpperCase()}`, 40, 54);

      const dStr = new Date().toLocaleString();
      doc.text(`AUDIT GENERATION DATE: ${dStr}`, pageWidth - 260, 42);

      // Footer line
      doc.setLineWidth(0.75);
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.line(40, pageHeight - 40, pageWidth - 40, pageHeight - 40);

      // Header bottom divider line
      doc.line(40, 58, pageWidth - 40, 58);

      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`CONFIDENTIALITY CLAUSE: RESTRICTED TO GOVERNANCE & FINANCE RECONCILIATION TEAMS ONLY`, 40, pageHeight - 24);
      doc.text(`Page ${pageCount}`, pageWidth - 60, pageHeight - 24);
    };

    drawHeaderFooter();

    // Document Subject Headline
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(16, 185, 129); // emerald-600
    const groupNameStr = selectedGroup === 'All' ? 'ALL GROUPINGS (COMBINED STATS)' : selectedGroup.toUpperCase();
    const groupLabelStr = 
      groupType === 'directorate' ? 'PROGRAM DIRECTORATE' : 
      groupType === 'pmo' ? 'PMO GROUP' :
      groupType === 'contractor' ? 'CONTRACTOR' : 'CONSULTANT';
    doc.text(`MATURED PAYMENT STATUS & OUTSTANDING CLAIMS DOSSIER: ${groupLabelStr} • ${groupNameStr}`, 40, 85);

    // Decorative thin separator
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(1);
    doc.line(40, 95, pageWidth - 40, 95);

    // Top Compliance KPI Summary Blocks
    const cardWidth = (pageWidth - 80 - 30) / 4; 
    const cardY = 110;
    const cardHeight = 52;

    // KPI Card 1: Total Audited Contracts
    doc.setFillColor(236, 253, 245); // very soft green
    doc.rect(40, cardY, cardWidth, cardHeight, 'F');
    doc.setDrawColor(167, 243, 208);
    doc.rect(40, cardY, cardWidth, cardHeight, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(16, 185, 129);
    doc.text("TOTAL ACTIVE PROJECTS", 48, cardY + 18);
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(`${processedProjects.length} Contracts`, 48, cardY + 38);

    // KPI Card 2: Total Certified Outstandings
    doc.setFillColor(248, 250, 252);
    doc.rect(40 + cardWidth + 10, cardY, cardWidth, cardHeight, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(40 + cardWidth + 10, cardY, cardWidth, cardHeight, 'S');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("TOTAL OUTSTANDING CLAIMS", 40 + cardWidth + 18, cardY + 18);
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`ETB ${paymentStats.combinedUnpaidEtb.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 40 + cardWidth + 18, cardY + 38);

    // KPI Card 3: Critical Matured Overdue
    doc.setFillColor(254, 242, 242); // soft red
    doc.rect(40 + (cardWidth + 10) * 2, cardY, cardWidth, cardHeight, 'F');
    doc.setDrawColor(252, 165, 165);
    doc.rect(40 + (cardWidth + 10) * 2, cardY, cardWidth, cardHeight, 'S');
    doc.setFontSize(7.5);
    doc.setTextColor(185, 28, 28);
    doc.text("MATURED OVERDUE (>56d)", 40 + (cardWidth + 10) * 2 + 12, cardY + 18);
    doc.setFontSize(11);
    doc.setTextColor(185, 28, 28);
    doc.text(`ETB ${paymentStats.combinedMaturedEtb.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 40 + (cardWidth + 10) * 2 + 12, cardY + 38);

    // KPI Card 4: Overdue Ratio / Count
    doc.setFillColor(248, 250, 252);
    doc.rect(40 + (cardWidth + 10) * 3, cardY, cardWidth, cardHeight, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(40 + (cardWidth + 10) * 3, cardY, cardWidth, cardHeight, 'S');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("MATURED OVERDUE CLAIM COUNT", 40 + (cardWidth + 10) * 3 + 12, cardY + 18);
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(`${paymentStats.maturedIpcCount} Overdue IPCs`, 40 + (cardWidth + 10) * 3 + 12, cardY + 38);

    const colWidths = {
      name: 260,
      ipcCount: 110,
      certified: 150,
      outstanding: 120,
      matured: 121.89
    };

    const colX = {
      name: 40,
      ipcCount: 40 + colWidths.name,
      certified: 40 + colWidths.name + colWidths.ipcCount,
      outstanding: 40 + colWidths.name + colWidths.ipcCount + colWidths.certified,
      matured: 40 + colWidths.name + colWidths.ipcCount + colWidths.certified + colWidths.outstanding
    };

    const drawTableHeader = (y: number) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      const headerNameLines = doc.splitTextToSize("CONTRACT TITLE & CONTRACTOR", colWidths.name - 12);
      const headerIpcLines = doc.splitTextToSize("TOTAL IPC COUNT", colWidths.ipcCount - 12);
      const headerCertifiedLines = doc.splitTextToSize("TOTAL CERTIFIED VALUE (ETB Equivalent)", colWidths.certified - 12);
      const headerOutstandingLines = doc.splitTextToSize("OUTSTANDING CLAIMS", colWidths.outstanding - 12);
      const headerMaturedLines = doc.splitTextToSize("MATURED OVERDUE (>56 Days)", colWidths.matured - 12);

      const maxHeaderLines = Math.max(
        headerNameLines.length,
        headerIpcLines.length,
        headerCertifiedLines.length,
        headerOutstandingLines.length,
        headerMaturedLines.length
      );
      const headerHeight = maxHeaderLines * 9.5 + 10;

      doc.setFillColor(15, 23, 42); // slate-900 (professional navy dark)
      doc.rect(40, y, pageWidth - 80, headerHeight, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);

      const drawHeaderCellLines = (lines: string[], x: number) => {
        const startY = y + (headerHeight - (lines.length * 9.5)) / 2 + 7.5;
        lines.forEach((line, idx) => {
          doc.text(line, x + 6, startY + idx * 9.5);
        });
      };

      drawHeaderCellLines(headerNameLines, colX.name);
      drawHeaderCellLines(headerIpcLines, colX.ipcCount);
      drawHeaderCellLines(headerCertifiedLines, colX.certified);
      drawHeaderCellLines(headerOutstandingLines, colX.outstanding);
      drawHeaderCellLines(headerMaturedLines, colX.matured);

      // Header border line
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(1);
      doc.line(40, y, pageWidth - 40, y);
      doc.line(40, y + headerHeight, pageWidth - 40, y + headerHeight);
      doc.line(40, y, 40, y + headerHeight);
      doc.line(pageWidth - 40, y, pageWidth - 40, y + headerHeight);

      // Vertical separators
      doc.line(colX.ipcCount, y, colX.ipcCount, y + headerHeight);
      doc.line(colX.certified, y, colX.certified, y + headerHeight);
      doc.line(colX.outstanding, y, colX.outstanding, y + headerHeight);
      doc.line(colX.matured, y, colX.matured, y + headerHeight);

      return headerHeight;
    };

    curY = 185;
    const initialHeaderHeight = drawTableHeader(curY);
    curY += initialHeaderHeight;

    processedProjects.forEach((p, idx) => {
      const m = getProjectPaymentMetrics(p);

      // Pre-calculate wrapped line lengths and cell heights
      const combinedTitle = p.name || 'Untitled Project';
      const titleLines = doc.splitTextToSize(combinedTitle, colWidths.name - 12);
      const subTextStr = `Contractor: ${p.contractor || 'N/A'}`;
      const subTextLines = doc.splitTextToSize(subTextStr, colWidths.name - 12);

      const ipcText = `${m.totalIpcs} total (${m.unpaidIpcs} unpaid)`;
      const ipcLines = doc.splitTextToSize(ipcText, colWidths.ipcCount - 12);

      const certifiedText = `ETB ${m.combinedCertified.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
      const certifiedLines = doc.splitTextToSize(certifiedText, colWidths.certified - 12);

      const outstandingText = m.combinedUnpaid > 0 
        ? `ETB ${m.combinedUnpaid.toLocaleString(undefined, { maximumFractionDigits: 0 })}` 
        : "Fully Paid";
      const outstandingLines = doc.splitTextToSize(outstandingText, colWidths.outstanding - 12);

      const maturedText = m.combinedMatured > 0 
        ? `ETB ${m.combinedMatured.toLocaleString(undefined, { maximumFractionDigits: 0 })}` 
        : "ETB 0.00";
      const maturedLines = doc.splitTextToSize(maturedText, colWidths.matured - 12);

      const titleHeight = titleLines.length * 9.5;
      const subTextHeight = subTextLines.length * 8.5;
      const col1Height = titleHeight + subTextHeight + 14;

      const col2Height = ipcLines.length * 9.5 + 14;
      const col3Height = certifiedLines.length * 9.5 + 14;
      const col4Height = outstandingLines.length * 9.5 + 14;
      const col5Height = maturedLines.length * 9.5 + 14;

      const rowHeight = Math.max(col1Height, col2Height, col3Height, col4Height, col5Height, 36);

      // Page break check with dynamic row height
      if (curY + rowHeight > pageHeight - 55) {
        doc.addPage();
        pageCount++;
        drawHeaderFooter();
        
        curY = 80;
        const headerHeight = drawTableHeader(curY);
        curY += headerHeight;
      }

      // Alternating background
      if (idx % 2 === 0) {
        doc.setFillColor(255, 255, 255);
      } else {
        doc.setFillColor(248, 250, 252); // slate-50
      }
      doc.rect(40, curY, pageWidth - 80, rowHeight, 'F');
      
      // Draw outer borders for each row
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(1);
      doc.rect(40, curY, pageWidth - 80, rowHeight, 'S');

      // Draw vertical separators for columns
      doc.line(colX.ipcCount, curY, colX.ipcCount, curY + rowHeight);
      doc.line(colX.certified, curY, colX.certified, curY + rowHeight);
      doc.line(colX.outstanding, curY, colX.outstanding, curY + rowHeight);
      doc.line(colX.matured, curY, colX.matured, curY + rowHeight);

      // Render Column 1 (Title & Contractor) Vertically Centered
      const totalCol1TextHeight = titleLines.length * 9.5 + 2 + subTextLines.length * 8.5;
      let col1Y = curY + (rowHeight - totalCol1TextHeight) / 2 + 8.5;
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      titleLines.forEach((line: string) => {
        doc.text(line, colX.name + 6, col1Y);
        col1Y += 9.5;
      });
      
      col1Y += 2;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      subTextLines.forEach((line: string) => {
        doc.text(line, colX.name + 6, col1Y);
        col1Y += 8.5;
      });

      // Render Column 2 (Total IPC Count) Vertically Centered
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85);
      const col2Y = curY + (rowHeight - (ipcLines.length * 9.5)) / 2 + 8.5;
      ipcLines.forEach((line: string, iIdx: number) => {
        doc.text(line, colX.ipcCount + 6, col2Y + iIdx * 9.5);
      });

      // Render Column 3 (Total Certified Value) Vertically Centered
      const col3Y = curY + (rowHeight - (certifiedLines.length * 9.5)) / 2 + 8.5;
      certifiedLines.forEach((line: string, cIdx: number) => {
        doc.text(line, colX.certified + 6, col3Y + cIdx * 9.5);
      });
      
      // Render Column 4 (Outstanding Claims) Vertically Centered
      if (m.combinedUnpaid > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129); // Fully Paid emerald green
      }
      const col4Y = curY + (rowHeight - (outstandingLines.length * 9.5)) / 2 + 8.5;
      outstandingLines.forEach((line: string, oIdx: number) => {
        doc.text(line, colX.outstanding + 6, col4Y + oIdx * 9.5);
      });

      // Render Column 5 (Matured Overdue) Vertically Centered
      if (m.combinedMatured > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(185, 28, 28); // Overdue dark red
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139); // ETB 0.00 gray
      }
      const col5Y = curY + (rowHeight - (maturedLines.length * 9.5)) / 2 + 8.5;
      maturedLines.forEach((line: string, mIdx: number) => {
        doc.text(line, colX.matured + 6, col5Y + mIdx * 9.5);
      });

      curY += rowHeight;
    });

    // Save PDF
    const gName = selectedGroup.replace(/\s+/g, '_');
    doc.save(`ERA_Matured_Payments_Report_${groupType}_${gName}.pdf`);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25 }}
      className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-6 rounded-2xl shadow-md space-y-5 overflow-hidden"
    >
      {/* Top Title Bar */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
        <div className="space-y-0.5">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-500" /> Executive Group Report Workspace
          </h3>
          <p className="text-2xs text-slate-400 dark:text-slate-500 font-medium">
            Generate detailed status dossiers, physical progress benchmarks, and budget statements.
          </p>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition"
          title="Close Workspace"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Report Mode Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-700/60 pb-0.5">
        <button
          onClick={() => setReportMode('performance')}
          id="btn-report-perf"
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 -mb-px ${
            reportMode === 'performance'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" /> Executive Performance Summary
        </button>
        <button
          onClick={() => setReportMode('audit')}
          id="btn-report-audit"
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 -mb-px ${
            reportMode === 'audit'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Compliance & Performance Audit
        </button>
        <button
          onClick={() => setReportMode('payments')}
          id="btn-report-payments"
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 -mb-px ${
            reportMode === 'payments'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5 text-emerald-500" /> Matured Payment Status & Amount
        </button>
        <button
          onClick={() => setReportMode('bonds')}
          id="btn-report-bonds"
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 -mb-px ${
            reportMode === 'bonds'
              ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" /> Bond Guarantee Status
        </button>
      </div>

      {/* Grid Layout Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Control Panel Column */}
        <div className="lg:col-span-4 space-y-5 border-r border-slate-100 dark:border-slate-700/50 pr-0 lg:pr-6">
          
          {/* Dimension Selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block">
              1. GROUPING DIMENSION
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setGroupType('directorate');
                  setSelectedGroup('All');
                }}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                  groupType === 'directorate'
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-900/50 dark:text-indigo-400'
                    : 'bg-slate-50/50 border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'
                }`}
              >
                <Building className="w-3.5 h-3.5" />
                Directorate
              </button>
              <button
                onClick={() => {
                  setGroupType('pmo');
                  setSelectedGroup('All');
                }}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                  groupType === 'pmo'
                    ? 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950/40 dark:border-purple-900/50 dark:text-purple-400'
                    : 'bg-slate-50/50 border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                PMO Group
              </button>
              <button
                onClick={() => {
                  setGroupType('contractor');
                  setSelectedGroup('All');
                }}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                  groupType === 'contractor'
                    ? 'bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/40 dark:border-amber-900/50 dark:text-amber-400'
                    : 'bg-slate-50/50 border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                Contractor
              </button>
              <button
                onClick={() => {
                  setGroupType('consultant');
                  setSelectedGroup('All');
                }}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                  groupType === 'consultant'
                    ? 'bg-teal-50 border-teal-200 text-teal-700 dark:bg-teal-950/40 dark:border-teal-900/50 dark:text-teal-400'
                    : 'bg-slate-50/50 border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                Consultant
              </button>
            </div>
          </div>

          {/* Group Value Filter Selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block">
              2. SELECT TARGET VALUE
            </label>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-slate-700 dark:text-zinc-200 focus:border-indigo-500 transition cursor-pointer"
            >
              <option value="All">🌐 All Groups (Aggregated View)</option>
              {groupType === 'directorate' && programDirectorates.map(pd => (
                <option key={pd} value={pd}>🏢 Directorate: {pd}</option>
              ))}
              {groupType === 'pmo' && pmos.map(p => (
                <option key={p} value={p}>📦 PMO Group: {p}</option>
              ))}
              {groupType === 'contractor' && contractors.map(c => (
                <option key={c} value={c}>🏗️ Contractor: {c}</option>
              ))}
              {groupType === 'consultant' && consultants.map(c => (
                <option key={c} value={c}>🎓 Consultant: {c}</option>
              ))}
            </select>
          </div>

          {/* Matured Payments Option Filter */}
          <div className="space-y-2 p-3 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-750 dark:text-zinc-200 block">
                  Only Overdue Matured Claims
                </label>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block leading-tight">
                  Filter group report for FIDIC Cl. 14.7 payment breaches (&gt; 56 days).
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={maturedFilterOnly}
                  onChange={(e) => setMaturedFilterOnly(e.target.checked)}
                />
                <div className="w-10 h-5.5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600"></div>
              </label>
            </div>
          </div>

          {/* Sorting Controller */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block">
              3. SORTING CRITERIA
            </label>
            <div className="flex gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold outline-none text-slate-700 dark:text-zinc-200 focus:border-indigo-500 transition cursor-pointer"
              >
                <option value="name">🔤 Project Name</option>
                <option value="progress">📊 Physical Progress</option>
                <option value="value">💰 Contract Value</option>
              </select>
              <button
                onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-indigo-600 dark:text-indigo-400 transition"
                title="Toggle Order"
              >
                {sortOrder === 'asc' ? '▲' : '▼'}
              </button>
            </div>
          </div>

          {/* Action Export Buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-700/50 space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block mb-1">
              4. GENERATE DOCUMENTS
            </label>
            {reportMode === 'performance' ? (
              <>
                <button
                  onClick={handleExportPDF}
                  id="btn-export-perf-pdf"
                  disabled={processedProjects.length === 0}
                  className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-xs font-extrabold shadow-sm transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Export Executive PDF
                </button>
                <button
                  onClick={handleExportCSV}
                  id="btn-export-perf-csv"
                  disabled={processedProjects.length === 0}
                  className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 disabled:opacity-50 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer border border-slate-200 dark:border-slate-600"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Export CSV Sheet
                </button>
              </>
            ) : reportMode === 'audit' ? (
              <>
                <button
                  onClick={handleExportAuditPDF}
                  id="btn-export-audit-pdf"
                  disabled={processedProjects.length === 0}
                  className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-xs font-extrabold shadow-sm transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Export Audit PDF
                </button>
                <button
                  onClick={handleExportAuditCSV}
                  id="btn-export-audit-csv"
                  disabled={processedProjects.length === 0}
                  className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 disabled:opacity-50 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer border border-slate-200 dark:border-slate-600"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-red-600 dark:text-rose-450" /> Export Audit CSV Sheet
                </button>
              </>
            ) : reportMode === 'payments' ? (
              <>
                <button
                  onClick={handleExportPaymentsPDF}
                  id="btn-export-payments-pdf"
                  disabled={processedProjects.length === 0}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-xs font-extrabold shadow-sm transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Export Payments PDF
                </button>
                <button
                  onClick={handleExportPaymentsCSV}
                  id="btn-export-payments-csv"
                  disabled={processedProjects.length === 0}
                  className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 disabled:opacity-50 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer border border-slate-200 dark:border-slate-600"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Export Payments CSV
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleExportBondsPDF}
                  id="btn-export-bonds-pdf"
                  disabled={processedProjects.length === 0}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-2.5 rounded-xl text-xs font-extrabold shadow-sm transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Export Bonds PDF
                </button>
                <button
                  onClick={handleExportBondsCSV}
                  id="btn-export-bonds-csv"
                  disabled={processedProjects.length === 0}
                  className="w-full flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 disabled:opacity-50 text-slate-700 dark:text-slate-200 py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer border border-slate-200 dark:border-slate-600"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> Export Bonds CSV
                </button>
              </>
            )}
          </div>

        </div>

        {/* Right Section: Aggregated Statistics and Interactive Live Preview */}
        <div className="lg:col-span-8 space-y-5">
          
          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {reportMode === 'performance' ? (
              <>
                {/* KPI Block 1 */}
                <div className="bg-slate-50/60 dark:bg-slate-900/20 p-3.5 rounded-xl border border-slate-150 dark:border-slate-700/40 space-y-1">
                  <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                    ACTIVE CONTRACTS
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-black text-slate-800 dark:text-zinc-100">
                      {stats.count}
                    </span>
                    <span className="text-2xs text-slate-400 font-bold">contracts</span>
                  </div>
                  <div className="text-[9px] text-slate-400 flex items-center gap-1">
                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" /> {stats.completedCount} completed (&gt;=95%)
                  </div>
                </div>

                {/* KPI Block 2 */}
                <div className="bg-slate-50/60 dark:bg-slate-900/20 p-3.5 rounded-xl border border-slate-150 dark:border-slate-700/40 space-y-1">
                  <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                    AVG PHYSICAL PROGRESS
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-black text-teal-600 dark:text-teal-400">
                      {stats.avgProgress.toFixed(2)}%
                    </span>
                    <span className="text-2xs text-slate-400 font-bold">completed</span>
                  </div>
                  <div className="text-[9px] text-slate-400">
                    Across all matching group contracts
                  </div>
                </div>

                {/* KPI Block 3 */}
                <div className="bg-slate-50/60 dark:bg-slate-900/20 p-3.5 rounded-xl border border-slate-150 dark:border-slate-700/40 space-y-1">
                  <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                    TOTAL GROUP COMMITMENT
                  </span>
                  <div className="flex items-baseline gap-1 truncate">
                    <span className="text-sm font-black text-slate-800 dark:text-zinc-100 truncate">
                      ETB {stats.totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="text-[9px] text-red-500 dark:text-rose-400 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" /> {stats.warningCount} guarantee alert triggers
                  </div>
                </div>
              </>
            ) : reportMode === 'audit' ? (
              <>
                {/* Audit KPI Block 1 */}
                <div className="bg-rose-50/30 dark:bg-rose-950/5 p-3.5 rounded-xl border border-rose-150 dark:border-rose-900/30 space-y-1">
                  <span className="text-[9px] font-extrabold text-rose-500 dark:text-rose-400 block uppercase tracking-wider">
                    AVG COMPLIANCE SCORE
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-lg font-black ${
                      auditStats.avgScore >= 80 ? 'text-emerald-600 dark:text-emerald-400' :
                      auditStats.avgScore >= 65 ? 'text-amber-500' : 'text-red-500 dark:text-rose-400'
                    }`}>
                      {auditStats.avgScore.toFixed(2)}%
                    </span>
                    <span className="text-2xs text-slate-400 font-bold">rating</span>
                  </div>
                  <div className="text-[9px] text-slate-450 dark:text-slate-400">
                    {auditStats.compliantCount} / {processedProjects.length} projects compliant (&gt;=70%)
                  </div>
                </div>

                {/* Audit KPI Block 2 */}
                <div className="bg-slate-50/60 dark:bg-slate-900/20 p-3.5 rounded-xl border border-slate-150 dark:border-slate-700/40 space-y-1">
                  <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                    SCHEDULE SLIPPAGE RATE
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-lg font-black ${auditStats.behindSchedulePct > 35 ? 'text-red-500' : 'text-slate-800 dark:text-zinc-100'}`}>
                      {auditStats.behindSchedulePct.toFixed(2)}%
                    </span>
                    <span className="text-2xs text-slate-400 font-bold">slipping</span>
                  </div>
                  <div className="text-[9px] text-slate-450 dark:text-slate-400">
                    {auditStats.behindScheduleCount} of {processedProjects.length} behind schedule
                  </div>
                </div>

                {/* Audit KPI Block 3 */}
                <div className="bg-slate-50/60 dark:bg-slate-900/20 p-3.5 rounded-xl border border-slate-150 dark:border-slate-700/40 space-y-1">
                  <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                    COMPLIANCE BREACH TRIGGERS
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-lg font-black ${auditStats.totalExpiredBonds > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                      {auditStats.totalExpiredBonds + auditStats.totalCriticalRisks}
                    </span>
                    <span className="text-2xs text-slate-400 font-bold">alerts</span>
                  </div>
                  <div className="text-[9px] text-red-500 dark:text-rose-450 font-bold flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" /> {auditStats.totalExpiredBonds} expired guarantees, {auditStats.totalCriticalRisks} high risks
                  </div>
                </div>
              </>
            ) : reportMode === 'payments' ? (
              <>
                {/* Payments KPI Block 1 */}
                <div className="bg-slate-50/60 dark:bg-slate-900/20 p-3.5 rounded-xl border border-slate-150 dark:border-slate-700/40 space-y-1">
                  <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                    TOTAL CERTIFIED CLAIMS
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-black text-slate-800 dark:text-zinc-100">
                      ETB {paymentStats.combinedCertifiedEtb.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-400">
                    {paymentStats.totalIpcCount} total certificates submitted
                  </div>
                </div>

                {/* Payments KPI Block 2 */}
                <div className="bg-slate-50/60 dark:bg-slate-900/20 p-3.5 rounded-xl border border-slate-150 dark:border-slate-700/40 space-y-1">
                  <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                    OUTSTANDING (UNPAID) CLAIMS
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-black text-amber-600 dark:text-amber-400">
                      ETB {paymentStats.combinedUnpaidEtb.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-400">
                    {paymentStats.unpaidIpcCount} IPCs pending payment processing
                  </div>
                </div>

                {/* Payments KPI Block 3 */}
                <div className={`p-3.5 rounded-xl border space-y-1 ${
                  paymentStats.maturedIpcCount > 0 
                    ? 'bg-rose-50/30 dark:bg-rose-950/5 border-rose-150 dark:border-rose-900/30' 
                    : 'bg-slate-50/60 dark:bg-slate-900/20 border-slate-150 dark:border-slate-700/40'
                }`}>
                  <span className={`text-[9px] font-extrabold block uppercase tracking-wider ${
                    paymentStats.maturedIpcCount > 0 ? 'text-red-500 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    CRITICAL MATURED OVERDUE (&gt;56 DAYS)
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-lg font-black ${
                      paymentStats.maturedIpcCount > 0 ? 'text-red-500 dark:text-rose-450' : 'text-slate-850 dark:text-zinc-200'
                    }`}>
                      ETB {paymentStats.combinedMaturedEtb.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className={`text-[9px] font-bold ${
                    paymentStats.maturedIpcCount > 0 ? 'text-red-500' : 'text-slate-400'
                  }`}>
                    {paymentStats.maturedIpcCount} overdue claims (FIDIC Cl. 14.7 Breach)
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* Bonds KPI Block 1 */}
                <div className="bg-slate-50/60 dark:bg-slate-900/20 p-3.5 rounded-xl border border-slate-150 dark:border-slate-700/40 space-y-1">
                  <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                    TOTAL REGISTERED SECURITIES
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-black text-slate-800 dark:text-zinc-100">
                      {bondStats.totalBondsCount} Guarantees
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-400 font-bold truncate">
                    Valued at ETB {bondStats.totalBondsValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>

                {/* Bonds KPI Block 2 */}
                <div className="bg-slate-50/60 dark:bg-slate-900/20 p-3.5 rounded-xl border border-slate-150 dark:border-slate-700/40 space-y-1">
                  <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 block uppercase tracking-wider">
                    VALID & ACTIVE GUARANTEES
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                      {bondStats.validBondsCount} Valid
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-400 truncate">
                    Active protection of ETB {bondStats.validBondsValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>

                {/* Bonds KPI Block 3 */}
                <div className={`p-3.5 rounded-xl border space-y-1 ${
                  bondStats.expiredBondsCount > 0 
                    ? 'bg-rose-50/30 dark:bg-rose-950/5 border-rose-150 dark:border-rose-900/30' 
                    : 'bg-slate-50/60 dark:bg-slate-900/20 border-slate-150 dark:border-slate-700/40'
                }`}>
                  <span className={`text-[9px] font-extrabold block uppercase tracking-wider ${
                    bondStats.expiredBondsCount > 0 ? 'text-red-500 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'
                  }`}>
                    CRITICAL EXPIRED GUARANTEES
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-lg font-black ${
                      bondStats.expiredBondsCount > 0 ? 'text-red-500 dark:text-rose-450' : 'text-slate-850 dark:text-zinc-200'
                    }`}>
                      {bondStats.expiredBondsCount} Expired
                    </span>
                  </div>
                  <div className={`text-[9px] font-bold ${
                    bondStats.expiredBondsCount > 0 ? 'text-red-500' : 'text-slate-400'
                  }`}>
                    Unprotected risk of ETB {bondStats.expiredBondsValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Live Table Panel */}
          <div className="space-y-2.5">
            {reportMode === 'audit' && (
              <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800 p-3.5 rounded-xl text-2xs space-y-2.5 text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2 font-black uppercase text-slate-700 dark:text-zinc-200 tracking-wider text-[10px]">
                  <span>📋 COMPLIANCE & GRADE SCORING MODEL WEIGHT DISTRIBUTION</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 text-center text-[10px]">
                  <div className="bg-white dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800">
                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400 block mb-0.5">10% WEIGHTAGE</span>
                    <span className="text-[9px] font-medium block">1. FIDIC contract Compliance (Bonds & Notices)</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800">
                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400 block mb-0.5">35% WEIGHTAGE</span>
                    <span className="text-[9px] font-medium block">2. Project Management (Time & progress)</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800">
                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400 block mb-0.5">25% WEIGHTAGE</span>
                    <span className="text-[9px] font-medium block">3. EVM Metrics (CPI 12.5% / SPI 12.5%)</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800">
                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400 block mb-0.5">15% WEIGHTAGE</span>
                    <span className="text-[9px] font-medium block">4. Key Performance Indicators (KPIs)</span>
                  </div>
                  <div className="bg-white dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800">
                    <span className="font-extrabold text-indigo-600 dark:text-indigo-400 block mb-0.5">15% WEIGHTAGE</span>
                    <span className="text-[9px] font-medium block">5. Linear Layer Progress vs. S-Curve</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
                Live Dataset Preview ({processedProjects.length} rows)
              </span>
              
              {/* Quick Filter Box */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2 w-3 h-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter table..."
                  value={reportSearchQuery}
                  onChange={(e) => setReportSearchQuery(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 text-2xs px-7 py-1.5 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:border-indigo-500 max-w-xs text-slate-800 dark:text-zinc-100"
                />
                {reportSearchQuery && (
                  <button 
                    onClick={() => setReportSearchQuery('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-3xs font-extrabold"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>

            {/* Structured Table Container */}
            <div className="border border-slate-150 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900/10">
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    {reportMode === 'performance' ? (
                      <tr className="bg-slate-50 dark:bg-slate-800/60 text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase border-b border-slate-150 dark:border-slate-700/50">
                        <th className="px-3 py-2">ID & Contract Title</th>
                        <th className="px-3 py-2">Group Dimensions</th>
                        <th className="px-3 py-2 text-right">Physical Progress</th>
                        <th className="px-3 py-2 text-right">Revised Contract Value (ETB)</th>
                      </tr>
                    ) : reportMode === 'audit' ? (
                      <tr className="bg-slate-50 dark:bg-slate-800/60 text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase border-b border-slate-150 dark:border-slate-700/50">
                        <th className="px-3 py-2">Project ID & Title</th>
                        <th className="px-3 py-2">Audit Risk & Bond Status</th>
                        <th className="px-3 py-2 text-center">Progress vs. Time Elapsed</th>
                        <th className="px-3 py-2 text-right">Audit Score / Grade</th>
                      </tr>
                    ) : reportMode === 'payments' ? (
                      <tr className="bg-slate-50 dark:bg-slate-800/60 text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase border-b border-slate-150 dark:border-slate-700/50">
                        <th className="px-3 py-2">Project ID & Title</th>
                        <th className="px-3 py-2">Total Certified Amount</th>
                        <th className="px-3 py-2 text-right">Outstanding (Unpaid)</th>
                        <th className="px-3 py-2 text-right">Matured Overdue (&gt;56d)</th>
                      </tr>
                    ) : (
                      <tr className="bg-slate-50 dark:bg-slate-800/60 text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase border-b border-slate-150 dark:border-slate-700/50">
                        <th className="px-3 py-2">Project ID & Title</th>
                        <th className="px-3 py-2">Total Logged Securities</th>
                        <th className="px-3 py-2 text-right">Valid & Active</th>
                        <th className="px-3 py-2 text-right">Expired & Critical</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-750 text-xs">
                    {processedProjects.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-3 py-8 text-center text-slate-400 dark:text-slate-500 font-medium">
                          No active contracts match your filters.
                        </td>
                      </tr>
                    ) : reportMode === 'performance' ? (
                      processedProjects.map((p) => {
                        const expiredCount = (p.bonds || []).filter(b => b.status === 'Expired').length;
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/25 transition">
                            <td className="px-3 py-2.5">
                              <div className="font-extrabold text-slate-700 dark:text-zinc-200 truncate max-w-[200px]">{p.name}</div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">ID: {p.id.substring(0, 10).toUpperCase()}</div>
                            </td>
                            <td className="px-3 py-2.5 space-y-0.5">
                              <div className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 uppercase">
                                🏢 {p.programDirectorate || 'Southern'}
                              </div>
                              <div className="text-[9px] font-bold text-purple-600 dark:text-purple-400 uppercase">
                                📦 {p.pmo || 'PMO 1'}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right font-black text-slate-700 dark:text-zinc-200">
                              <div className="flex flex-col items-end gap-1">
                                <span className={
                                  (p.physicalProgress || 0) < 15 ? 'text-red-500' :
                                  (p.physicalProgress || 0) < 45 ? 'text-amber-500' : 'text-emerald-500'
                                }>
                                  {(p.physicalProgress || 0).toFixed(2)}%
                                </span>
                                <div className="w-16 bg-slate-100 dark:bg-slate-800 h-1 rounded overflow-hidden">
                                  <div 
                                    className={`h-full ${
                                      (p.physicalProgress || 0) < 15 ? 'bg-red-500' :
                                      (p.physicalProgress || 0) < 45 ? 'bg-amber-500' : 'bg-emerald-500'
                                    }`} 
                                    style={{ width: `${Math.min(100, Math.max(0, p.physicalProgress || 0))}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-right font-bold text-slate-600 dark:text-zinc-300 font-mono">
                              <div>{((p.origAmount + (p.variation || 0)) * 1_000_000).toLocaleString()}</div>
                              {expiredCount > 0 && (
                                <span className="text-[8px] bg-red-50 text-red-600 dark:bg-rose-950/20 dark:text-rose-400 border border-red-100 dark:border-rose-900/30 px-1 py-0.5 rounded font-black block mt-0.5 max-w-max ml-auto">
                                  ⚠️ {expiredCount} Expired Guarantees
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : reportMode === 'audit' ? (
                      processedProjects.map((p) => {
                        const audit = getAuditMetrics(p);
                        const isExpanded = expandedProjectId === p.id;
                        return (
                          <React.Fragment key={p.id}>
                            <tr 
                              onClick={() => setExpandedProjectId(isExpanded ? null : p.id)}
                              className="hover:bg-slate-50/40 dark:hover:bg-slate-800/25 transition cursor-pointer border-b border-slate-100 dark:border-slate-850"
                            >
                              <td className="px-3 py-2.5">
                                <div className="font-extrabold text-slate-700 dark:text-zinc-200 truncate max-w-[200px]">{p.name}</div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1">
                                  <span>ID: {p.id.substring(0, 10).toUpperCase()}</span>
                                  <span className="text-indigo-500 text-[9px] font-bold">(Click for FIDIC Audit)</span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 space-y-1">
                                <div className="flex flex-wrap gap-1">
                                  {audit.expiredBondsCount > 0 ? (
                                    <span className="text-[8px] font-black uppercase bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 px-1.5 py-0.5 rounded border border-red-100 dark:border-red-900/30">
                                      ⚠️ {audit.expiredBondsCount} Expired Bonds
                                    </span>
                                  ) : (
                                    <span className="text-[8px] font-bold uppercase bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400 px-1.5 py-0.5 rounded">
                                      ✓ Guarantees Valid
                                    </span>
                                  )}
                                  
                                  {audit.scheduleStatus === 'Critical' && (
                                    <span className="text-[8px] font-black uppercase bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 px-1.5 py-0.5 rounded border border-red-100 dark:border-red-900/30">
                                      ⏳ Critical Delay
                                    </span>
                                  )}
                                  {audit.scheduleStatus === 'Warning' && (
                                    <span className="text-[8px] font-black uppercase bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 px-1.5 py-0.5 rounded border border-amber-100 dark:border-amber-900/30">
                                      ⏳ Slip Warning
                                    </span>
                                  )}
                                  {audit.scheduleStatus === 'Compliant' && (
                                    <span className="text-[8px] font-bold uppercase bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded">
                                      ✓ On Track
                                    </span>
                                  )}
  
                                  {audit.activeRisksCount > 0 && (
                                    <span className="text-[8px] font-medium bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 px-1.5 py-0.5 rounded">
                                      🔥 {audit.activeRisksCount} Active Risks
                                    </span>
                                  )}
  
                                  {audit.timeOverrunPct > 0 && (
                                    <span className="text-[8px] font-black uppercase bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 px-1.5 py-0.5 rounded border border-rose-100 dark:border-rose-900/30">
                                      ⏱️ {audit.timeOverrunPct.toFixed(2)}% EOT Overrun
                                    </span>
                                  )}
                                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${
                                    audit.CPI >= 1.0 
                                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400' 
                                      : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400'
                                  }`}>
                                    CPI: {audit.CPI.toFixed(3)}
                                  </span>
                                  <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded border ${
                                    audit.SPI >= 1.0 
                                      ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400' 
                                      : 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/20 dark:text-rose-400'
                                  }`}>
                                    SPI: {audit.SPI.toFixed(3)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex flex-col gap-1 max-w-[150px] mx-auto">
                                  <div className="flex items-center justify-between text-[9px] font-bold">
                                    <span className="text-slate-400">Progress:</span>
                                    <span className="text-slate-700 dark:text-zinc-300">{(p.physicalProgress || 0).toFixed(2)}%</span>
                                  </div>
                                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded overflow-hidden">
                                    <div className="bg-emerald-500 h-full" style={{ width: `${Math.min(100, Math.max(0, p.physicalProgress || 0))}%` }} />
                                  </div>
  
                                  <div className="flex items-center justify-between text-[9px] font-bold">
                                    <span className="text-slate-400">Time Elapsed:</span>
                                    <span className="text-slate-700 dark:text-zinc-300">{audit.timeElapsedPct.toFixed(2)}%</span>
                                  </div>
                                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded overflow-hidden">
                                    <div className="bg-indigo-500 h-full" style={{ width: `${Math.min(100, Math.max(0, audit.timeElapsedPct))}%` }} />
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono">
                                <div className="flex items-center justify-end gap-1.5">
                                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${audit.bgColor} ${audit.textColor}`}>
                                    Grade {audit.ratingCode}
                                  </span>
                                  <span className="text-sm font-black text-slate-800 dark:text-zinc-100">
                                    {audit.complianceScore}%
                                  </span>
                                </div>
                                <div className="text-[8.5px] text-slate-400 dark:text-slate-500 font-sans font-bold">{audit.ratingClass}</div>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-slate-50/70 dark:bg-slate-900/60">
                                <td colSpan={4} className="p-4 border-t border-b border-slate-200 dark:border-slate-800">
                                  <div className="space-y-4">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-slate-250 dark:border-slate-800 pb-2">
                                      <div>
                                        <h4 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">
                                          FIDIC 2017 Contract Compliance & Responsibility Audit
                                        </h4>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase mt-0.5">
                                          Contractor: {p.contractor || 'N/A'} • Consultant: {p.consultant || 'N/A'}
                                        </p>
                                      </div>
                                      <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-150 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-1 rounded">
                                        FIDIC Edition: 2017 {p.contractType === 'DB' ? 'Yellow Book' : 'Red Book'}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {/* Contractor Evaluation Card */}
                                      {(() => {
                                        const evalData = getFidicEvaluation(p, 'contractor');
                                        return (
                                          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm space-y-2.5">
                                            <div className="flex justify-between items-center pb-1 border-b border-slate-100 dark:border-slate-800">
                                              <span className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                                                🏗️ Contractor Obligations
                                              </span>
                                              <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                                evalData.averageScore >= 80 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' :
                                                evalData.averageScore >= 60 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' : 'bg-red-50 text-red-700 dark:bg-rose-950/30 dark:text-rose-450'
                                              }`}>
                                                Score: {evalData.averageScore}%
                                              </span>
                                            </div>
                                            
                                            <div className="space-y-2.5">
                                              {evalData.clauses.map(c => (
                                                <div key={c.id} className="space-y-0.5">
                                                  <div className="flex justify-between items-center text-[9.5px] font-bold">
                                                    <span className="text-slate-700 dark:text-slate-300">{c.title}</span>
                                                    <span className={`text-[8.5px] font-black uppercase px-1 rounded ${
                                                      c.rating === 'Compliant' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' :
                                                      c.rating === 'Minor Deficiency' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400'
                                                    }`}>
                                                      {c.rating}
                                                    </span>
                                                  </div>
                                                  <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                                                    {c.details}
                                                  </p>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        );
                                      })()}

                                      {/* Consultant Evaluation Card */}
                                      {(() => {
                                        const evalData = getFidicEvaluation(p, 'consultant');
                                        return (
                                          <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 shadow-sm space-y-2.5">
                                            <div className="flex justify-between items-center pb-1 border-b border-slate-100 dark:border-slate-800">
                                              <span className="text-[10px] font-black text-teal-600 dark:text-teal-500 uppercase tracking-wider">
                                                🎓 Consultant Obligations
                                              </span>
                                              <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                                evalData.averageScore >= 80 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' :
                                                evalData.averageScore >= 60 ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' : 'bg-red-50 text-red-700 dark:bg-rose-950/30 dark:text-rose-450'
                                              }`}>
                                                Score: {evalData.averageScore}%
                                              </span>
                                            </div>

                                            <div className="space-y-2.5">
                                              {evalData.clauses.map(c => (
                                                <div key={c.id} className="space-y-0.5">
                                                  <div className="flex justify-between items-center text-[9.5px] font-bold">
                                                    <span className="text-slate-700 dark:text-slate-300">{c.title}</span>
                                                    <span className={`text-[8.5px] font-black uppercase px-1 rounded ${
                                                      c.rating === 'Compliant' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' :
                                                      c.rating === 'Minor Deficiency' ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400'
                                                    }`}>
                                                      {c.rating}
                                                    </span>
                                                  </div>
                                                  <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                                                    {c.details}
                                                  </p>
                                                </div>
                                              ))}
                                            </div>
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    ) : reportMode === 'payments' ? (
                      processedProjects.map((p) => {
                        const m = getProjectPaymentMetrics(p);
                        const isExpanded = expandedProjectId === p.id;
                        const today = new Date();
                        return (
                          <React.Fragment key={p.id}>
                            <tr 
                              onClick={() => setExpandedProjectId(isExpanded ? null : p.id)}
                              className="hover:bg-slate-50/40 dark:hover:bg-slate-800/25 transition cursor-pointer border-b border-slate-100 dark:border-slate-850"
                            >
                              <td className="px-3 py-2.5">
                                <div className="font-extrabold text-slate-700 dark:text-zinc-200 truncate max-w-[200px]">{p.name}</div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1">
                                  <span>ID: {p.id.substring(0, 10).toUpperCase()}</span>
                                  <span className="text-indigo-500 text-[9px] font-bold">(Click for IPC Details)</span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 space-y-1">
                                <div className="flex flex-col gap-0.5">
                                  <div className="text-[10px] font-bold text-slate-600 dark:text-zinc-300">
                                    ETB: <span className="font-mono font-extrabold">{formatAccounting(m.certEtb, '')}</span>
                                  </div>
                                  <div className="text-[10px] font-bold text-slate-600 dark:text-zinc-300">
                                    USD: <span className="font-mono font-extrabold">${formatAccounting(m.certUsd, '')}</span>
                                  </div>
                                  <div className="text-[8.5px] text-slate-450 dark:text-slate-400 font-medium font-sans">
                                    Combined: ETB {m.combinedCertified.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono">
                                {m.combinedUnpaid > 0 ? (
                                  <div className="flex flex-col items-end gap-0.5">
                                    <div className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                                      ETB {formatAccounting(m.unpaidEtb, '')}
                                    </div>
                                    <div className="text-[10px] font-extrabold text-amber-600 dark:text-amber-400">
                                      USD ${formatAccounting(m.unpaidUsd, '')}
                                    </div>
                                    <span className="text-[8px] bg-amber-50 text-amber-750 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30 px-1 py-0.5 rounded font-black mt-0.5">
                                      ⏳ {m.unpaidIpcs} Pending IPCs
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded">
                                    Fully Paid
                                  </span>
                                )}
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono">
                                {m.combinedMatured > 0 ? (
                                  <div className="flex flex-col items-end gap-0.5">
                                    <div className="text-[10px] font-extrabold text-red-600 dark:text-rose-400">
                                      ETB {formatAccounting(m.maturedEtb, '')}
                                    </div>
                                    <div className="text-[10px] font-extrabold text-red-600 dark:text-rose-400">
                                      USD ${formatAccounting(m.maturedUsd, '')}
                                    </div>
                                    <span className="text-[8px] bg-red-50 text-red-600 dark:bg-rose-950/20 dark:text-rose-400 border border-red-100 dark:border-red-900/30 px-1 py-0.5 rounded font-black mt-0.5">
                                      ⚠️ {m.maturedIpcsCount} Overdue (&gt;56d)
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-400">
                                    ETB 0.00
                                  </span>
                                )}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-slate-50/70 dark:bg-slate-900/60">
                                <td colSpan={4} className="p-4 border-t border-b border-slate-200 dark:border-slate-800">
                                  <div className="space-y-4">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-slate-250 dark:border-slate-800 pb-2">
                                      <div>
                                        <h4 className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                          <DollarSign className="w-3.5 h-3.5" /> Interim Payment Certificate (IPC) Tracker Ledger
                                        </h4>
                                        <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase mt-0.5">
                                          Contractor: {p.contractor || 'N/A'} • Exchange Rate: 1 USD = {p.usdExchangeRate || 28.0} ETB
                                        </p>
                                      </div>
                                      <span className="text-[9px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold px-2 py-1 rounded">
                                        Total IPCs: {m.totalIpcs} ({m.paidIpcs} Paid, {m.unpaidIpcs} Outstanding)
                                      </span>
                                    </div>

                                    {/* Detailed IPC List */}
                                    {(p.ipcTracker || []).length === 0 ? (
                                      <div className="text-center py-4 text-slate-400 dark:text-slate-500 text-2xs font-medium">
                                        No Interim Payment Certificates have been submitted or tracked for this project.
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {(p.ipcTracker || []).map((ipc, ipcIdx) => {
                                          const isEtbUnpaid = (ipc.statusEtb || ipc.status) === 'Unpaid';
                                          const isUsdUnpaid = (ipc.statusUsd || ipc.status) === 'Unpaid';
                                          const isUnpaid = isEtbUnpaid || isUsdUnpaid;
                                          
                                          let ageDays = 0;
                                          let isMaturedOverdue = false;
                                          if (ipc.submissionDate) {
                                            const subDate = new Date(ipc.submissionDate);
                                            if (!isNaN(subDate.getTime())) {
                                              ageDays = Math.floor((today.getTime() - subDate.getTime()) / (1000 * 60 * 60 * 24));
                                              if (ageDays > 56 && isUnpaid) {
                                                isMaturedOverdue = true;
                                              }
                                            }
                                          }

                                          return (
                                            <div 
                                              key={ipc.id || ipcIdx} 
                                              className={`p-3 rounded-xl border flex flex-col justify-between gap-2 transition-all ${
                                                isMaturedOverdue 
                                                  ? 'bg-rose-50/20 dark:bg-rose-950/10 border-rose-150 dark:border-rose-900/30' 
                                                  : isUnpaid
                                                  ? 'bg-amber-50/10 dark:bg-amber-950/5 border-amber-150 dark:border-amber-900/20'
                                                  : 'bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800'
                                              }`}
                                            >
                                              <div className="flex items-start justify-between gap-1.5">
                                                <div>
                                                  <span className="text-[10px] font-black uppercase text-slate-700 dark:text-zinc-200">
                                                    {ipc.paymentNo}
                                                  </span>
                                                  <span className="text-[9px] text-slate-400 dark:text-slate-500 block">
                                                    Submitted: {ipc.submissionDate || 'N/A'} {ipc.submissionDate && `(${ageDays} days ago)`}
                                                  </span>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                  {isMaturedOverdue ? (
                                                    <span className="text-[8px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded border border-red-700 animate-pulse">
                                                      ⚠️ OVERDUE MATURED CLAIM ({ageDays}d)
                                                    </span>
                                                  ) : isUnpaid ? (
                                                    <span className="text-[8px] font-black bg-amber-500 text-white px-1.5 py-0.5 rounded">
                                                      ⏳ PENDING PAYMENT ({ageDays}d)
                                                    </span>
                                                  ) : (
                                                    <span className="text-[8px] font-extrabold bg-emerald-500 text-white px-1.5 py-0.5 rounded">
                                                      ✓ PAID
                                                    </span>
                                                  )}
                                                </div>
                                              </div>

                                              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-2 text-[10px]">
                                                <div>
                                                  <span className="text-slate-400 block text-[8px] uppercase font-bold">Certified ETB</span>
                                                  <span className="font-mono font-extrabold text-slate-700 dark:text-zinc-300 font-sans">
                                                    {formatAccounting(ipc.certifiedEtb || 0, '')}
                                                  </span>
                                                  <span className={`text-[8px] font-bold block ${isEtbUnpaid ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                    {isEtbUnpaid ? 'Unpaid' : 'Paid'}
                                                  </span>
                                                </div>
                                                <div>
                                                  <span className="text-slate-400 block text-[8px] uppercase font-bold">Certified USD</span>
                                                  <span className="font-mono font-extrabold text-slate-700 dark:text-zinc-300 font-sans">
                                                    ${formatAccounting(ipc.certifiedUsd || 0, '')}
                                                  </span>
                                                  <span className={`text-[8px] font-bold block ${isUsdUnpaid ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                    {isUsdUnpaid ? 'Unpaid' : 'Paid'}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    ) : (
                      processedProjects.map((p) => {
                        const bonds = p.bonds || [];
                        const totalCount = bonds.length;
                        const totalVal = bonds.reduce((sum, b) => sum + (b.amount || 0), 0);
                        const validCount = bonds.filter(b => b.status === 'Valid').length;
                        const validVal = bonds.filter(b => b.status === 'Valid').reduce((sum, b) => sum + (b.amount || 0), 0);
                        const expiredCount = bonds.filter(b => b.status === 'Expired').length;
                        const expiredVal = bonds.filter(b => b.status === 'Expired').reduce((sum, b) => sum + (b.amount || 0), 0);
                        const isExpanded = expandedProjectId === p.id;

                        return (
                          <React.Fragment key={p.id}>
                            <tr 
                              onClick={() => setExpandedProjectId(isExpanded ? null : p.id)}
                              className="hover:bg-slate-50/40 dark:hover:bg-slate-800/25 transition cursor-pointer border-b border-slate-100 dark:border-slate-850"
                            >
                              <td className="px-3 py-2.5">
                                <div className="font-extrabold text-slate-700 dark:text-zinc-200 truncate max-w-[200px]">{p.name}</div>
                                <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1">
                                  <span>ID: {p.id.substring(0, 10).toUpperCase()}</span>
                                  <span className="text-indigo-500 text-[9px] font-bold">(Click for Bond Details)</span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5">
                                <div className="flex flex-col gap-0.5">
                                  <div className="text-[10px] font-black text-slate-700 dark:text-zinc-200">
                                    {totalCount} Guarantees
                                  </div>
                                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 font-mono">
                                    ETB {totalVal.toLocaleString()}
                                  </div>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono">
                                <div className="flex flex-col items-end gap-0.5">
                                  <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400">
                                    {validCount} Active
                                  </span>
                                  <span className="text-[9px] text-slate-400 font-medium font-sans">
                                    ETB {validVal.toLocaleString()}
                                  </span>
                                </div>
                              </td>
                              <td className="px-3 py-2.5 text-right font-mono">
                                {expiredCount > 0 ? (
                                  <div className="flex flex-col items-end gap-0.5">
                                    <span className="text-[10px] font-black text-red-600 dark:text-rose-400 bg-red-50 dark:bg-rose-950/20 px-1.5 py-0.5 rounded">
                                      ⚠️ {expiredCount} EXPIRED
                                    </span>
                                    <span className="text-[9px] text-red-600 dark:text-rose-400 font-medium font-sans">
                                      ETB {expiredVal.toLocaleString()}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-[10px] font-bold text-slate-400 font-sans">
                                    0 Expired
                                  </span>
                                )}
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr className="bg-slate-50/70 dark:bg-slate-900/60">
                                <td colSpan={4} className="p-4 border-t border-b border-slate-200 dark:border-slate-800">
                                  <div className="space-y-4">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 border-b border-slate-250 dark:border-slate-800 pb-2">
                                      <div>
                                        <h4 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                                          <CheckCircle2 className="w-3.5 h-3.5" /> Securities & Bank Guarantees Tracker Ledger
                                        </h4>
                                        <p className="text-[10px] text-slate-450 dark:text-slate-500 font-bold uppercase mt-0.5">
                                          Contractor: {p.contractor || 'N/A'} • Consultant: {p.consultant || 'N/A'}
                                        </p>
                                      </div>
                                      <span className="text-[9px] bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold px-2 py-1 rounded">
                                        Total Securities: {totalCount} ({validCount} Valid, {expiredCount} Expired)
                                      </span>
                                    </div>

                                    {bonds.length === 0 ? (
                                      <div className="text-center py-4 text-slate-400 dark:text-slate-500 text-2xs font-medium">
                                        No securities or bank guarantees have been tracked for this project.
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {bonds.map((bond, bIdx) => {
                                          const isExpired = bond.status === 'Expired';
                                          
                                          return (
                                            <div 
                                              key={bond.id || bIdx} 
                                              className={`p-3 rounded-xl border flex flex-col justify-between gap-2 transition-all bg-white dark:bg-slate-900 ${
                                                isExpired 
                                                  ? 'border-rose-150 dark:border-rose-900/30 bg-rose-50/5 dark:bg-rose-950/5' 
                                                  : 'border-slate-150 dark:border-slate-800'
                                              }`}
                                            >
                                              <div className="flex items-start justify-between gap-1.5">
                                                <div>
                                                  <span className="text-[10px] font-black uppercase text-slate-700 dark:text-zinc-200">
                                                    {bond.type}
                                                  </span>
                                                  <span className="text-[9px] text-slate-400 dark:text-slate-500 block">
                                                    Ref: {bond.refNo} | Bank: {bond.bank}
                                                  </span>
                                                </div>
                                                <div>
                                                  {isExpired ? (
                                                    <span className="text-[8px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded">
                                                      ⚠️ EXPIRED
                                                    </span>
                                                  ) : (
                                                    <span className="text-[8px] font-extrabold bg-emerald-500 text-white px-1.5 py-0.5 rounded">
                                                      ✓ ACTIVE / VALID
                                                    </span>
                                                  )}
                                                </div>
                                              </div>

                                              <div className="grid grid-cols-2 gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-2 text-[10px]">
                                                <div>
                                                  <span className="text-slate-400 block text-[8px] uppercase font-bold">Guarantee Amount</span>
                                                  <span className="font-mono font-extrabold text-slate-700 dark:text-zinc-300">
                                                    ETB {bond.amount.toLocaleString()}
                                                  </span>
                                                </div>
                                                <div>
                                                  <span className="text-slate-400 block text-[8px] uppercase font-bold">Expiry Date</span>
                                                  <span className={`font-semibold font-mono ${isExpired ? 'text-red-500 font-bold' : 'text-slate-700 dark:text-zinc-300'}`}>
                                                    {bond.expiryDate}
                                                  </span>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>

      </div>
    </motion.div>
  );
}
