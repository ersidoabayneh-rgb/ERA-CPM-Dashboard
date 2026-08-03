import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  Plus, 
  Trash2, 
  ShieldAlert, 
  CheckCircle, 
  XCircle, 
  Activity, 
  TrendingUp, 
  HelpCircle, 
  Save, 
  Info,
  ChevronDown,
  Filter,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Project, RiskItem, KpiAllocatedItem } from '../types';
import { getIntegratedKpiAllocated, buildKpiHierarchy } from '../data/defaultProject';

interface ProjectRisksViewProps {
  project: Project;
  onUpdateRisks: (risks: RiskItem[]) => void;
  isReadonly?: boolean;
  onProjectUpdate?: (updates: Partial<Project>, logMsg: string) => void;
}

export default function ProjectRisksView({ 
  project, 
  onUpdateRisks, 
  isReadonly = false,
  onProjectUpdate 
}: ProjectRisksViewProps) {
  const risks = project.risks || [];
  const hasHighValueRisk = risks.some(r => r.status === 'Active' && (r.probability * r.impact) >= 15);

  // Matrix and Form states
  const [selectedCell, setSelectedCell] = useState<{ prob: number; imp: number } | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [isFormOpen, setIsFormOpen] = useState(false);

  // New Risk Form State
  const [newCategory, setNewCategory] = useState('Technical');
  const [newDescription, setNewDescription] = useState('');
  const [newProbability, setNewProbability] = useState<number>(3);
  const [newImpact, setNewImpact] = useState<number>(3);
  const [newMitigation, setNewMitigation] = useState('');
  const [newStatus, setNewStatus] = useState<'Active' | 'Mitigated' | 'Retired'>('Active');
  const [formError, setFormError] = useState('');

  // Custom Categories & Management
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [showAddCategoryInput, setShowAddCategoryInput] = useState(false);
  const [newCustomCategoryName, setNewCustomCategoryName] = useState('');

  // Base & Dynamic Categories list
  const defaultCategories = ['Right of Way', 'Environmental', 'Materials', 'Technical', 'Logistics', 'Financial', 'Other'];
  const categories = Array.from(new Set([
    ...defaultCategories,
    ...risks.map(r => r.category).filter(Boolean),
    ...customCategories
  ]));

  const handleAddCategory = (categoryName?: string) => {
    const targetName = (categoryName || newCustomCategoryName).trim();
    if (!targetName) return;
    if (!categories.includes(targetName)) {
      setCustomCategories(prev => [...prev, targetName]);
    }
    setNewCategory(targetName);
    setNewCustomCategoryName('');
    setShowAddCategoryInput(false);
  };

  // Add field handler
  const handleAddRisk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDescription.trim()) {
      setFormError('Please enter a description for the road construction risk.');
      return;
    }
    if (!newMitigation.trim()) {
      setFormError('Please define a mitigation or contingency plan.');
      return;
    }

    const item: RiskItem = {
      id: 'risk_' + Date.now(),
      category: newCategory,
      description: newDescription.trim(),
      probability: newProbability,
      impact: newImpact,
      mitigation: newMitigation.trim(),
      status: newStatus
    };

    const updatedRisks = [item, ...risks];
    onUpdateRisks(updatedRisks);

    // Reset Form
    setNewDescription('');
    setNewMitigation('');
    setNewProbability(3);
    setNewImpact(3);
    setFormError('');
    setIsFormOpen(false);
  };

  // Delete risk handler
  const handleDeleteRisk = (id: string) => {
    const updated = risks.filter(r => r.id !== id);
    onUpdateRisks(updated);
  };

  // Inline update handler
  const handleUpdateField = (id: string, field: keyof RiskItem, value: any) => {
    const updated = risks.map(r => {
      if (r.id === id) {
        return { ...r, [field]: value };
      }
      return r;
    });
    onUpdateRisks(updated);
  };

  // Risk exposure helper
  const getExposureLevel = (score: number) => {
    if (score >= 16) return { label: 'Critical', color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50' };
    if (score >= 8) return { label: 'Moderate', color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40' };
    return { label: 'Low', color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200' };
  };

  // Filtered Risks list
  const filteredRisks = risks.filter(r => {
    if (categoryFilter !== 'All' && r.category !== categoryFilter) return false;
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;
    if (selectedCell) {
      if (r.probability !== selectedCell.prob || r.impact !== selectedCell.imp) return false;
    }
    return true;
  });

  // Calculate Aggregates
  const totalRisks = risks.length;
  const activeRisksCount = risks.filter(r => r.status === 'Active').length;
  const mitigatedRisksCount = risks.filter(r => r.status === 'Mitigated').length;
  const retiredRisksCount = risks.filter(r => r.status === 'Retired').length;

  // Dynamic Risk & KPI Integration
  const kpiList = getIntegratedKpiAllocated(project);
  const g8Kpis = kpiList.filter(k => k.goalId === 'G8');

  // Find dynamic G8 subcriteria (subgroups) from buildKpiHierarchy to keep correct names, weights, and items
  const G8_goal = buildKpiHierarchy(project.contractType || 'DBB', project).find(g => g.id === 'G8');
  const g8Subgroups = G8_goal ? G8_goal.sscs : [];

  // Let's check if the Project Risk Index subgroup (SC8.4) has been overridden
  const sc84Kpi = g8Kpis.find(k => k.sscId === 'SC8.4' || k.itemId === 'RK-4');
  const isKpiOverridden = sc84Kpi?.isOverridden || false;
  const kpiOverriddenValue = sc84Kpi?.alloc !== undefined ? sc84Kpi.alloc : 100;

  // Base Mean Risk Exposure score computed directly from the risks
  const baseExposureScore = totalRisks > 0
    ? (risks.reduce((sum, r) => sum + r.probability * r.impact, 0) / totalRisks)
    : 0;

  // If KPI is overridden, the index should be mapped back: index = (KPI score / 100) * 25
  const totalExposureScore = isKpiOverridden 
    ? (kpiOverriddenValue / 100) * 25
    : baseExposureScore;

  const averageExposure = totalRisks > 0 
    ? (risks.reduce((sum, r) => sum + r.probability * r.impact, 0) / totalRisks).toFixed(2) 
    : '0.00';

  const highestRiskItem = risks.length > 0
    ? [...risks].sort((a, b) => (b.probability * b.impact) - (a.probability * a.impact))[0]
    : null;

  // Override States
  const [showOverrideInput, setShowOverrideInput] = useState(false);
  const [tempOverrideValue, setTempOverrideValue] = useState<number>(totalExposureScore);

  React.useEffect(() => {
    setTempOverrideValue(totalExposureScore);
  }, [totalExposureScore]);

  const getSubgroupScore = (sscId: string, sscItems: any[]) => {
    let earned = 0;
    let maxPossible = 0;
    sscItems.forEach(k => {
      if (k.naActive) return;
      const val = k.type === 'yn' ? (k.alloc >= k.max ? k.max : 0) : k.alloc;
      const wt = k.itemWt || 100;
      earned += val * (wt / 100);
      maxPossible += k.max * (wt / 100);
    });
    return maxPossible > 0 ? (earned / maxPossible) * 100 : 0;
  };

  // Dynamically sum all G8 subgroups by their weights to find the exact dynamic G8 score
  let earnedSum = 0;
  let maxPossibleSum = 0;
  g8Subgroups.forEach(ssc => {
    const sscKpis = ssc.items.map(it => g8Kpis.find(k => k.itemId === it.id) || {
      alloc: it.type === 'yn' ? it.max : it.max * 0.7,
      max: it.max,
      itemWt: it.wt,
      type: it.type,
      naActive: false
    });
    const sscScore = getSubgroupScore(ssc.id, sscKpis);
    earnedSum += sscScore * (ssc.wt / 100);
    maxPossibleSum += 100 * (ssc.wt / 100);
  });
  const g8Score = maxPossibleSum > 0 ? (earnedSum / maxPossibleSum) * 100 : 0;

  // Auxiliary counts for KPI subgroup detail displays
  const totalHigh = risks.filter(r => r.probability * r.impact >= 8).length;
  const addressedHigh = risks.filter(r => r.probability * r.impact >= 8 && (r.status === 'Mitigated' || r.status === 'Retired' || r.mitigation.trim().length > 0)).length;
  const mitigatedOrRetired = risks.filter(r => r.status === 'Mitigated' || r.status === 'Retired').length;

  // SC8.2 Risk Escalation Calculation (Converted to 100% Scale)
  // Formula: SC8.2 = (Average Severity Index / 25) * 100%
  const sc82Weightage = g8Subgroups.find(ssc => ssc.id === 'SC8.2')?.wt || 25;
  const meanSeverityNum = totalRisks > 0 ? (risks.reduce((sum, r) => sum + r.probability * r.impact, 0) / totalRisks) : 0;
  const sc82RiskEscalation = (meanSeverityNum / 25) * 100;

  // SC8.3 Mitigation Calculation (Converted to 100% Scale)
  // Formula: SC8.3 = (Sum of Status Values / Number of Active Hazards) * 100%
  // Status Values: Retired = 0, Mitigated = 0.5, Active = 1.0
  const getStatusVal = (status: string) => {
    if (status === 'Retired') return 0;
    if (status === 'Mitigated') return 0.5;
    return 1.0; // Active
  };
  const sc83Weightage = g8Subgroups.find(ssc => ssc.id === 'SC8.3')?.wt || 25;
  const sumStatusValues = risks.reduce((sum, r) => sum + getStatusVal(r.status), 0);
  const activeHazardsDenom = activeRisksCount > 0 
    ? activeRisksCount 
    : (totalRisks > 0 ? totalRisks : 1);
  const sc83Mitigation = (sumStatusValues / activeHazardsDenom) * 100;

  // Bidirectional Synchronization Handlers
  const handleClearKpiOverride = () => {
    if (!onProjectUpdate) return;
    const currentList = project.kpiAllocated ? [...project.kpiAllocated] : [];
    const updated = currentList.map(k => {
      if (k.sscId === 'SC8.4' || k.itemId === 'RK-4') {
        return {
          ...k,
          isOverridden: false
        };
      }
      return k;
    });
    onProjectUpdate({ kpiAllocated: updated }, 'Risk Index KPI override cleared, synchronized with active risks register');
  };

  const handleSetRiskIndexOverride = (val: number) => {
    if (!onProjectUpdate) return;
    const targetKpiPercent = Math.min(100, Math.max(0, (val / 25) * 100));
    
    // Find if we already have RK-4 in kpiAllocated
    const currentList = project.kpiAllocated ? [...project.kpiAllocated] : [];
    const rk4Item = currentList.find(k => k.itemId === 'RK-4');
    
    const newKpiItem: KpiAllocatedItem = rk4Item ? {
      ...rk4Item,
      alloc: targetKpiPercent,
      isOverridden: true
    } : {
      goalId: 'G8',
      goalName: 'Risk Management',
      goalWt: 100,
      sscId: 'SC8.4',
      sscName: 'Project Risk Index',
      sscWt: 25,
      itemId: 'RK-4',
      desc: 'Project Risk Index score',
      unit: '%',
      itemWt: 100,
      max: 100,
      type: 'pct',
      alloc: targetKpiPercent,
      isOverridden: true,
      naActive: false
    };

    const existingIdx = currentList.findIndex(k => k.itemId === 'RK-4');
    if (existingIdx !== -1) {
      currentList[existingIdx] = newKpiItem;
    } else {
      currentList.push(newKpiItem);
    }
    
    onProjectUpdate({ kpiAllocated: currentList }, `Project Risk Index overridden to ${val} (KPI score set to ${targetKpiPercent}%)`);
  };

  // Render 5x5 Matrix Cell
  const renderMatrixCell = (prob: number, imp: number) => {
    const cellRisks = risks.filter(r => r.probability === prob && r.impact === imp);
    const count = cellRisks.length;
    const score = prob * imp;
    
    let cellBg = 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700/60';
    let isSelected = selectedCell && selectedCell.prob === prob && selectedCell.imp === imp;

    if (score >= 16) {
      cellBg = 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/35 text-rose-700 dark:text-rose-400 border-rose-200/50 dark:border-rose-900/30';
    } else if (score >= 8) {
      cellBg = 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/15 dark:hover:bg-amber-950/25 text-amber-700 dark:text-amber-400 border-amber-200/50 dark:border-amber-900/30';
    } else {
      cellBg = 'bg-emerald-50/50 hover:bg-emerald-100/70 dark:bg-emerald-950/10 dark:hover:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border-emerald-200/40 dark:border-emerald-900/20';
    }

    return (
      <button
        key={`${prob}-${imp}`}
        onClick={() => {
          if (isSelected) {
            setSelectedCell(null);
          } else {
            setSelectedCell({ prob, imp });
          }
        }}
        className={`relative flex flex-col items-center justify-center h-12 w-full rounded-xl border text-xs font-bold transition-all duration-150 ${cellBg} ${
          isSelected ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900 scale-[1.03] z-10 shadow-md' : 'shadow-2xs'
        }`}
        title={`Probability: ${prob}, Impact: ${imp} (Exposure: ${score}) | ${count} Risks`}
      >
        <span className="text-[9px] text-slate-400/85 block absolute top-1 left-1.5 font-mono">
          {score}
        </span>
        {count > 0 ? (
          <div className="flex items-center justify-center">
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shadow-xs ${
              score >= 16 
                ? 'bg-rose-600 text-white' 
                : score >= 8 
                  ? 'bg-amber-500 text-slate-950' 
                  : 'bg-emerald-600 text-white'
            }`}>
              {count}
            </span>
          </div>
        ) : (
          <span className="opacity-0 hover:opacity-30 text-[9px] text-slate-400 font-mono">
            0
          </span>
        )}
      </button>
    );
  };

  return (
    <div id="project-risks-view" className="space-y-6">
      
      {/* Project Risk Profile & Road Construction Hazards Dashboard Widget */}
      <div className="bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 p-6 rounded-3xl shadow-sm flex flex-col xl:flex-row items-center justify-between gap-6">
        <div className="flex items-start gap-4 flex-1">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl shrink-0">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-850 dark:text-zinc-150 uppercase tracking-wide">
                Project Risk Profile & Road Construction Hazards
              </h2>
              <span className="text-[9px] font-black uppercase tracking-wide bg-rose-50 text-rose-600 px-2 py-0.5 rounded border border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50">
                Live Audit
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-normal max-w-2xl">
              Calculates dynamic exposures across active geotechnical soil issues, Right-of-Way utilities obstruction, community quarry disputes, monsoon drainage failures, and import bitumen inflation.
            </p>
          </div>
        </div>

        {/* Dynamic Risk Metrics Summary block */}
        <div className="flex flex-wrap items-center justify-between xl:justify-end gap-6 w-full xl:w-auto shrink-0 xl:border-l xl:border-slate-100 xl:dark:border-slate-800 xl:pl-6">
          <div className="space-y-0.5 min-w-[70px]">
            <span className="text-[9px] text-slate-400 font-mono uppercase block">Active Risks</span>
            <span className="text-lg font-black font-mono text-slate-850 dark:text-white">
              {activeRisksCount} <span className="text-xs text-slate-400 font-medium">/ {totalRisks}</span>
            </span>
          </div>

          <div className="space-y-0.5 min-w-[90px]">
            <span className="text-[9px] text-slate-400 font-mono uppercase block">Exposure Index</span>
            <span className={`text-lg font-black font-mono ${
              totalExposureScore > 18.75 
                ? 'text-rose-500' 
                : totalExposureScore > 12.5 
                  ? 'text-amber-500' 
                  : 'text-emerald-500'
            }`}>
              {totalExposureScore.toFixed(2)}
            </span>
          </div>

          <div className="space-y-0.5 min-w-[80px]">
            <span className="text-[9px] text-slate-400 font-mono uppercase block">Mean Severity</span>
            <span className="text-lg font-black font-mono text-slate-850 dark:text-white">
              {averageExposure} <span className="text-xs text-slate-400 font-medium">/ 25</span>
            </span>
          </div>

          {!isReadonly && (
            <button
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 transition duration-150 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              {isFormOpen ? 'Hide Form' : 'Register Project Risk'}
            </button>
          )}
        </div>
      </div>

      {/* Aggregated Scorecards Deck */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Active Hazards */}
        <div className="bg-white dark:bg-slate-850 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-mono uppercase block tracking-wider">Active Hazards</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-slate-850 dark:text-white">{activeRisksCount}</span>
              <span className="text-xs text-slate-400">of {totalRisks} total</span>
            </div>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 dark:text-slate-400 flex items-center justify-between font-medium">
            <span>Mitigated: {mitigatedRisksCount}</span>
            <span>Retired: {retiredRisksCount}</span>
          </div>
        </div>

        {/* Card 2: Project Risk Index */}
        <div className="bg-white dark:bg-slate-850 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-mono uppercase block tracking-wider">Project Risk Index (SC8.4)</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black font-mono ${
                totalExposureScore > 18.75 
                  ? 'text-rose-500' 
                  : totalExposureScore > 12.5 
                    ? 'text-amber-500' 
                    : 'text-emerald-500'
              }`}>{totalExposureScore.toFixed(2)}</span>
              <span className="text-[10px] font-bold text-slate-400">Exposure Sum</span>
            </div>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2.5 overflow-hidden">
            <div 
              className={`h-full rounded-full ${
                totalExposureScore > 18.75 
                  ? 'bg-rose-500' 
                  : totalExposureScore > 12.5 
                    ? 'bg-amber-500' 
                    : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, (totalExposureScore / 25) * 100)}%` }}
            />
          </div>
        </div>

        {/* Card 5: Mean Risk Exposure */}
        <div className="bg-white dark:bg-slate-850 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-mono uppercase block tracking-wider">Mean Risk Exposure</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black font-mono text-slate-850 dark:text-white">{averageExposure}</span>
              <span className="text-xs text-slate-400">out of 25 max</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
            Average severity index of all recorded project vulnerabilities.
          </p>
        </div>

        {/* Card 6: Primary Critical Threat */}
        <div className="bg-white dark:bg-slate-850 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col justify-between">
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-mono uppercase block tracking-wider">Primary Critical Threat</span>
            {highestRiskItem ? (
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black uppercase tracking-wide bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded border border-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/50">
                    Exp: {highestRiskItem.probability * highestRiskItem.impact}
                  </span>
                  <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate">
                    {highestRiskItem.category}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 mt-1 font-medium">
                  {highestRiskItem.description}
                </p>
              </div>
            ) : (
              <p className="text-xs font-bold text-slate-400">None logged</p>
            )}
          </div>
        </div>
      </section>

      {/* ERA Integrated KPI Audit Card for Risk Management (G8) */}
      <section className="bg-slate-50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800/80 p-5 rounded-3xl shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-450 dark:text-zinc-400 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              ERA Key Performance Indicators (G8 Integration)
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              The Risk Management KPI (G8) is dynamically linked with your registered construction hazard logs, mitigation plans, and risk indices.
            </p>
          </div>
          <div className="bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 p-3 px-5 rounded-2xl flex items-center gap-4 self-start md:self-auto shadow-2xs">
            <div className="relative flex items-center justify-center">
              <div className={`w-11 h-11 rounded-full border-4 ${
                g8Score <= 50 ? 'border-emerald-500 text-emerald-500' : g8Score <= 75 ? 'border-amber-500 text-amber-500' : 'border-rose-500 text-rose-500'
              } flex items-center justify-center text-xs font-black font-mono ${
                hasHighValueRisk 
                  ? 'animate-[pulse_1.8s_infinite] shadow-[0_0_12px_rgba(239,68,68,0.4)] dark:shadow-[0_0_12px_rgba(239,68,68,0.2)] bg-rose-500/5' 
                  : ''
              }`}>
                {g8Score.toFixed(2)}%
              </div>
            </div>
            <div>
              <span className="text-[9px] text-slate-400 font-mono uppercase block leading-none mb-1">G8 Audit Score</span>
              <span className="text-sm font-black text-slate-800 dark:text-white">
                {g8Score.toFixed(2)}% <span className={`text-xs font-semibold ${
                  g8Score <= 50 ? 'text-emerald-500' : g8Score <= 75 ? 'text-amber-500' : 'text-rose-500'
                }`}>Completeness</span>
              </span>
            </div>
          </div>
        </div>

        {/* Bidirectional Integration Control Board */}
        <div className="bg-white dark:bg-slate-850 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${isKpiOverridden ? 'bg-amber-400' : 'bg-emerald-400'} opacity-75`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isKpiOverridden ? 'bg-amber-500' : 'bg-emerald-500'}`}></span>
              </span>
              <div className="text-xs font-bold text-slate-750 dark:text-zinc-200">
                {isKpiOverridden ? (
                  <span>
                    Project Risk Index is <span className="text-amber-500 font-extrabold">OVERRIDDEN</span> to <span className="font-mono text-sm">{totalExposureScore}</span> (KPI: {kpiOverriddenValue}%)
                  </span>
                ) : (
                  <span>
                    Project Risk Index is <span className="text-emerald-500 font-extrabold">DYNAMICALLY CALIBRATED</span> (Active Sum: <span className="font-mono text-sm">{baseExposureScore}</span>)
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {isKpiOverridden && (
                <button
                  type="button"
                  onClick={handleClearKpiOverride}
                  className="text-[10px] font-extrabold bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-2.5 py-1.5 rounded-xl transition cursor-pointer shadow-3xs"
                >
                  Clear KPI Override & Sync
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowOverrideInput(!showOverrideInput)}
                className="text-[10px] font-extrabold bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-xl transition cursor-pointer shadow-3xs"
              >
                {showOverrideInput ? 'Hide Adjustments' : 'Override Risk Index Manually'}
              </button>
            </div>
          </div>

          {showOverrideInput && (
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wide">Adjust Mean Risk Exposure (0 - 25)</span>
                  <p className="text-[9px] text-slate-400">
                    A value of 0 results in 0% KPI weightage, and 25 results in 100% weightage. Moving this slider changes both the Project Risk Index and the G8 score directly.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="25"
                    step="0.1"
                    value={tempOverrideValue}
                    onChange={(e) => setTempOverrideValue(Math.min(25, Math.max(0, parseFloat(e.target.value) || 0)))}
                    className="w-16 bg-white dark:bg-slate-850 font-mono font-bold text-center border border-slate-250 dark:border-slate-700 p-1 rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => handleSetRiskIndexOverride(tempOverrideValue)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-extrabold px-3 py-1.5 rounded-lg transition"
                  >
                    Apply Override
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] font-extrabold text-slate-400">0</span>
                <input
                  type="range"
                  min="0"
                  max="25"
                  step="0.1"
                  value={tempOverrideValue}
                  onChange={(e) => setTempOverrideValue(parseFloat(e.target.value))}
                  className="w-full accent-blue-600 h-1.5 bg-slate-200 dark:bg-slate-750 rounded-lg appearance-none cursor-pointer"
                />
                <span className="font-mono text-[10px] font-extrabold text-slate-400">25</span>
              </div>
              <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400/90 bg-amber-500/5 p-2 rounded-lg border border-amber-200/20">
                💡 Direct KPI mapped score: <span className="font-mono">{((tempOverrideValue / 25) * 100).toFixed(0)}%</span> (This will instantly write back and update subgroup <span className="font-mono font-extrabold">SC8.4</span> on the KPI sheet).
              </p>
            </div>
          )}
        </div>

        {/* Dynamic G8 Subgroup Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {g8Subgroups.map(ssc => {
            const sscKpis = ssc.items.map(it => g8Kpis.find(k => k.itemId === it.id) || {
              goalId: 'G8',
              goalName: 'Risk Management',
              goalWt: 100,
              sscId: ssc.id,
              sscName: ssc.name,
              sscWt: ssc.wt,
              itemId: it.id,
              desc: it.desc,
              unit: it.unit,
              itemWt: it.wt,
              max: it.max,
              type: it.type,
              alloc: it.type === 'yn' ? it.max : it.max * 0.7,
              naActive: false,
              isOverridden: false
            });

            const sscScore = getSubgroupScore(ssc.id, sscKpis);

            return (
              <div key={ssc.id} className="bg-white dark:bg-slate-850 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-3 flex flex-col justify-between shadow-xs">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-black text-slate-750 dark:text-zinc-200 uppercase tracking-wide">
                      {ssc.id}: {ssc.name}
                    </span>
                    <span className="font-mono font-bold text-slate-400">Wt: {ssc.wt}%</span>
                  </div>
                  
                  <div className="flex items-baseline gap-1.5">
                    <span className={`text-xl font-black font-mono ${
                      sscScore <= 50 ? 'text-emerald-500' : sscScore <= 75 ? 'text-amber-500' : 'text-rose-500'
                    }`}>
                      {sscScore.toFixed(0)}%
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">Sub-Score</span>
                  </div>
                  
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-1 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        sscScore <= 50 ? 'bg-emerald-500' : sscScore <= 75 ? 'bg-amber-500' : 'bg-rose-500'
                      }`} 
                      style={{ width: `${sscScore}%` }} 
                    />
                  </div>
                </div>

                {/* Subcriteria items/indicators details */}
                <div className="pt-2 border-t border-slate-50 dark:border-slate-800/40 space-y-1 text-[10px]">
                  {ssc.items.map(it => {
                    const foundKpi = g8Kpis.find(k => k.itemId === it.id);
                    const isItemOverridden = foundKpi?.isOverridden;
                    const itemScore = foundKpi ? (foundKpi.type === 'yn' ? (foundKpi.alloc >= foundKpi.max ? 100 : 0) : foundKpi.alloc) : 70;
                    return (
                      <div key={it.id} className="flex items-start justify-between gap-2 py-0.5">
                        <span className="text-slate-500 dark:text-slate-400 font-medium line-clamp-2" title={it.desc}>
                          <span className="font-mono font-bold text-slate-400 dark:text-slate-500 mr-1">{it.id}:</span>
                          {it.desc}
                        </span>
                        <span className="font-mono font-bold shrink-0 flex items-center gap-1">
                          <span className={itemScore <= 50 ? 'text-emerald-500' : itemScore <= 75 ? 'text-amber-500' : 'text-rose-500'}>
                            {itemScore.toFixed(0)}%
                          </span>
                          {isItemOverridden && (
                            <span className="bg-blue-100 dark:bg-blue-900/45 text-blue-600 dark:text-blue-400 text-[8px] font-extrabold px-1 rounded-sm uppercase tracking-tight scale-90" title="Overridden on KPI sheet">
                              OR
                            </span>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Form Overlay / Collapse */}
      <AnimatePresence>
        {isFormOpen && !isReadonly && (
          <motion.form
            onSubmit={handleAddRisk}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-white dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4 overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-zinc-150 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4 text-amber-500 animate-bounce" />
                Road Construction Hazard Registration Form
              </h3>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Close
              </button>
            </div>

            {formError && (
              <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 rounded-xl p-3 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs font-semibold">
              <div className="md:col-span-3 space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wide">Hazard Category</label>
                  <button
                    type="button"
                    onClick={() => setShowAddCategoryInput(!showAddCategoryInput)}
                    className="text-[10px] text-blue-600 dark:text-blue-400 font-extrabold hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Add Category
                  </button>
                </div>
                <select
                  value={newCategory}
                  onChange={(e) => {
                    if (e.target.value === '__ADD_NEW__') {
                      setShowAddCategoryInput(true);
                    } else {
                      setNewCategory(e.target.value);
                    }
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-705 py-2 px-3 rounded-xl text-slate-700 dark:text-slate-300 font-bold outline-none text-xs"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  <option value="__ADD_NEW__">+ Add Custom Category...</option>
                </select>

                {showAddCategoryInput && (
                  <div className="mt-2 p-2.5 bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 rounded-xl space-y-1.5 shadow-2xs">
                    <span className="text-[9px] font-extrabold text-blue-700 dark:text-blue-300 uppercase tracking-wider block">
                      New Hazard Category Name
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="e.g., Geotechnical, Hydrological"
                        value={newCustomCategoryName}
                        onChange={(e) => setNewCustomCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCategory();
                          }
                        }}
                        className="w-full text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-lg text-slate-800 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-500"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => handleAddCategory()}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold px-3 py-1.5 rounded-lg shrink-0 transition cursor-pointer"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowAddCategoryInput(false); setNewCustomCategoryName(''); }}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-1 font-bold cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="md:col-span-9 space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wide">Vulnerability / Description</label>
                <input
                  type="text"
                  placeholder="e.g., Seasonal monsoon river flooding at KM 25+300 causing washout of sub-base works."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-705 py-2 px-3 rounded-xl text-slate-700 dark:text-slate-300 font-bold outline-none"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wide">Probability (1-5)</label>
                <select
                  value={newProbability}
                  onChange={(e) => setNewProbability(parseInt(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-705 py-2 px-3 rounded-xl text-slate-700 dark:text-slate-300 font-bold outline-none font-mono"
                >
                  {[1, 2, 3, 4, 5].map(v => (
                    <option key={v} value={v}>{v} - {v === 1 ? 'Rare' : v === 2 ? 'Unlikely' : v === 3 ? 'Possible' : v === 4 ? 'Likely' : 'Almost Certain'}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wide">Impact Severity (1-5)</label>
                <select
                  value={newImpact}
                  onChange={(e) => setNewImpact(parseInt(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-705 py-2 px-3 rounded-xl text-slate-700 dark:text-slate-300 font-bold outline-none font-mono"
                >
                  {[1, 2, 3, 4, 5].map(v => (
                    <option key={v} value={v}>{v} - {v === 1 ? 'Negligible' : v === 2 ? 'Minor' : v === 3 ? 'Moderate' : v === 4 ? 'Major' : 'Catastrophic'}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-6 space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wide">Mitigation & Action Protocol</label>
                <input
                  type="text"
                  placeholder="e.g., Construct permanent stone masonry revetment walls and elevate asphalt grade early."
                  value={newMitigation}
                  onChange={(e) => setNewMitigation(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-705 py-2 px-3 rounded-xl text-slate-700 dark:text-slate-300 font-bold outline-none"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] text-slate-400 uppercase tracking-wide">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-705 py-2 px-3 rounded-xl text-slate-700 dark:text-slate-300 font-bold outline-none"
                >
                  <option value="Active">Active (1.0)</option>
                  <option value="Mitigated">Mitigated (0.5)</option>
                  <option value="Retired">Retired (0.0)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-4 rounded-xl text-xs transition duration-150"
              >
                Commit Hazard Log
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Interactive 5x5 Heatmap Grid and Filter Toolbar */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Risk Matrix Section */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-zinc-150 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-blue-500" />
              5x5 Contractual Risk Exposure Matrix
            </h3>
            {selectedCell && (
              <button
                onClick={() => setSelectedCell(null)}
                className="text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-500 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1 transition"
              >
                <RefreshCw className="w-3 h-3" />
                Reset Filter
              </button>
            )}
          </div>

          <div className="flex flex-col space-y-1">
            
            {/* The Heatmap Grid */}
            <div className="flex">
              {/* Y Axis Label (Probability) */}
              <div className="w-8 flex flex-col justify-between items-center text-[10px] font-bold text-slate-400 font-mono py-1 pr-1 border-r border-slate-100 dark:border-slate-800 mr-2">
                <span className="text-[8px] transform -rotate-90 origin-center text-slate-350 dark:text-slate-500 uppercase tracking-widest my-auto block whitespace-nowrap h-0">
                  PROBABILITY
                </span>
                <span>5</span>
                <span>4</span>
                <span>3</span>
                <span>2</span>
                <span>1</span>
              </div>

              {/* Grid content */}
              <div className="flex-1 flex flex-col gap-1.5">
                {[5, 4, 3, 2, 1].map(prob => (
                  <div key={prob} className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map(imp => renderMatrixCell(prob, imp))}
                  </div>
                ))}
              </div>
            </div>

            {/* X Axis labels */}
            <div className="flex">
              <div className="w-8 mr-2" /> {/* alignment spacer */}
              <div className="flex-1 flex justify-between font-mono font-bold text-slate-400 text-[10px] pt-1">
                <span className="w-full text-center">1</span>
                <span className="w-full text-center">2</span>
                <span className="w-full text-center">3</span>
                <span className="w-full text-center">4</span>
                <span className="w-full text-center">5</span>
              </div>
            </div>
            <div className="flex">
              <div className="w-8 mr-2" />
              <span className="flex-1 text-center text-[8px] text-slate-350 dark:text-slate-500 font-bold uppercase tracking-widest mt-1">
                IMPACT SEVERITY
              </span>
            </div>
          </div>

          {/* Color Key Guide */}
          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 flex justify-between items-center text-[9px] font-bold font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-300" />
              Low (1-7)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-amber-500/20 border border-amber-300" />
              Moderate (8-15)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded bg-rose-500/20 border border-rose-300" />
              Critical (16-25)
            </span>
          </div>
        </div>

        {/* Filters and List view of Risks */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-4 flex flex-col justify-between">
          
          <div className="space-y-4">
            {/* Filter toolbar */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-850 dark:text-zinc-150 flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-blue-500" />
                Road Construction Hazards Log ({filteredRisks.length})
              </h3>

              <div className="flex items-center gap-2">
                {/* Category select */}
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    if (e.target.value === '__ADD_NEW__') {
                      setShowAddCategoryInput(true);
                      if (!isFormOpen && !isReadonly) setIsFormOpen(true);
                    } else {
                      setCategoryFilter(e.target.value);
                    }
                  }}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[10px] font-extrabold rounded-lg text-slate-600 dark:text-slate-300 outline-none"
                >
                  <option value="All">All Categories ({categories.length})</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                  {!isReadonly && <option value="__ADD_NEW__">+ Add Custom Category...</option>}
                </select>

                {!isReadonly && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCategoryInput(true);
                      if (!isFormOpen) setIsFormOpen(true);
                    }}
                    className="bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 text-[10px] font-extrabold py-1 px-2.5 rounded-lg transition flex items-center gap-1 cursor-pointer shadow-3xs"
                    title="Add a new risk category"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Category</span>
                  </button>
                )}

                {/* Status select */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[10px] font-extrabold rounded-lg text-slate-600 dark:text-slate-300 outline-none"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Mitigated">Mitigated</option>
                  <option value="Retired">Retired</option>
                </select>
              </div>
            </div>

            {selectedCell && (
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-xl p-2 px-3 text-[10px] font-extrabold text-blue-600 dark:text-blue-400 flex justify-between items-center">
                <span>Filtering Matrix cell where Probability = {selectedCell.prob} and Impact = {selectedCell.imp} (Exposure: {selectedCell.prob * selectedCell.imp})</span>
                <button
                  onClick={() => setSelectedCell(null)}
                  className="bg-blue-100 hover:bg-blue-200 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-1.5 py-0.5 rounded"
                >
                  Reset Filter
                </button>
              </div>
            )}

            {/* List container */}
            <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
              {filteredRisks.length === 0 ? (
                <div className="text-center py-12 text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <Info className="w-8 h-8 mx-auto opacity-40 mb-2" />
                  <p className="text-xs font-bold uppercase tracking-wider">No corresponding hazards found</p>
                  <p className="text-[10px] text-slate-400 mt-1">Refine your matrix selection or category filters.</p>
                </div>
              ) : (
                filteredRisks.map(r => {
                  const score = r.probability * r.impact;
                  const expMeta = getExposureLevel(score);
                  return (
                    <div 
                      key={r.id} 
                      className="border border-slate-100 dark:border-slate-800/80 p-3.5 rounded-2xl space-y-2 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {isReadonly ? (
                              <span className="text-[9px] font-mono font-bold text-slate-400 uppercase">
                                {r.category}
                              </span>
                            ) : (
                              <select
                                value={r.category}
                                onChange={(e) => {
                                  if (e.target.value === '__ADD_NEW__') {
                                    setShowAddCategoryInput(true);
                                    if (!isFormOpen) setIsFormOpen(true);
                                  } else {
                                    handleUpdateField(r.id, 'category', e.target.value);
                                  }
                                }}
                                className="text-[9px] font-mono font-extrabold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-blue-500 uppercase"
                              >
                                {categories.map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                                <option value="__ADD_NEW__">+ Add Category...</option>
                              </select>
                            )}
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border font-mono ${expMeta.color}`}>
                              Exposure: {score} ({expMeta.label})
                            </span>
                          </div>
                          
                          {/* Description field (Editable if not readonly) */}
                          {isReadonly ? (
                            <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 leading-normal">
                              {r.description}
                            </h4>
                          ) : (
                            <input
                              type="text"
                              value={r.description}
                              onChange={(e) => handleUpdateField(r.id, 'description', e.target.value)}
                              className="text-xs font-black text-slate-800 dark:text-slate-100 bg-transparent border-none w-full outline-none focus:bg-slate-100/55 dark:focus:bg-slate-800/60 p-0.5 rounded"
                            />
                          )}
                        </div>

                        {/* Status Select Badge */}
                        {isReadonly ? (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            r.status === 'Active' 
                              ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20' 
                              : r.status === 'Mitigated'
                                ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/20'
                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                          }`}>
                            {r.status === 'Active' ? 'Active (1)' : r.status === 'Mitigated' ? 'Mitigated (0.5)' : 'Retired (0)'}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={r.status}
                              onChange={(e) => handleUpdateField(r.id, 'status', e.target.value)}
                              className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-lg outline-none border ${
                                r.status === 'Active'
                                  ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/20'
                                  : r.status === 'Mitigated'
                                    ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/20'
                                    : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800'
                              }`}
                            >
                              <option value="Active">Active (1.0)</option>
                              <option value="Mitigated">Mitigated (0.5)</option>
                              <option value="Retired">Retired (0.0)</option>
                            </select>
                            
                            <button
                              onClick={() => handleDeleteRisk(r.id)}
                              className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950 text-slate-350 hover:text-rose-600 rounded transition"
                              title="Delete risk log"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Mitigation / Matrix Score adjustments */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-12 gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                        
                        <div className="md:col-span-8 flex flex-col gap-0.5">
                          <span className="text-[8px] text-slate-400 font-mono uppercase tracking-wide">Mitigation Protocol</span>
                          {isReadonly ? (
                            <p className="text-slate-700 dark:text-slate-300 font-medium">
                              {r.mitigation}
                            </p>
                          ) : (
                            <input
                              type="text"
                              value={r.mitigation}
                              onChange={(e) => handleUpdateField(r.id, 'mitigation', e.target.value)}
                              className="bg-transparent border-none text-slate-700 dark:text-slate-300 font-bold w-full outline-none focus:bg-slate-100/55 dark:focus:bg-slate-800/60 p-0.5 rounded"
                            />
                          )}
                        </div>

                        <div className="md:col-span-2 flex flex-col gap-0.5 font-mono">
                          <span className="text-[8px] text-slate-400 uppercase tracking-wide">Probability</span>
                          {isReadonly ? (
                            <span className="text-slate-700 dark:text-slate-300 font-bold">{r.probability}</span>
                          ) : (
                            <select
                              value={r.probability}
                              onChange={(e) => handleUpdateField(r.id, 'probability', parseInt(e.target.value))}
                              className="bg-slate-50 dark:bg-slate-800 border rounded px-1 py-0.5 font-bold text-slate-600 dark:text-slate-300 outline-none"
                            >
                              {[1, 2, 3, 4, 5].map(v => (
                                <option key={v} value={v}>{v}</option>
                              ))}
                            </select>
                          )}
                        </div>

                        <div className="md:col-span-2 flex flex-col gap-0.5 font-mono">
                          <span className="text-[8px] text-slate-400 uppercase tracking-wide">Impact</span>
                          {isReadonly ? (
                            <span className="text-slate-700 dark:text-slate-300 font-bold">{r.impact}</span>
                          ) : (
                            <select
                              value={r.impact}
                              onChange={(e) => handleUpdateField(r.id, 'impact', parseInt(e.target.value))}
                              className="bg-slate-50 dark:bg-slate-800 border rounded px-1 py-0.5 font-bold text-slate-600 dark:text-slate-300 outline-none"
                            >
                              {[1, 2, 3, 4, 5].map(v => (
                                <option key={v} value={v}>{v}</option>
                              ))}
                            </select>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 flex items-start gap-1.5 text-[9px] text-slate-400 leading-normal">
            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
            <span>
              Risk matrices and indices are calculated dynamically according to FIDIC Clause 14 & ERA standard engineering manuals. Changes to risk ratings update the project cockpit in real-time.
            </span>
          </div>

        </div>

      </section>

    </div>
  );
}
