import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle, Info, HelpCircle, Plus, Trash2, Edit, Save, X, Sliders, FolderPlus, Lock } from 'lucide-react';
import { Project, KpiAllocatedItem, User } from '../types';
import { buildKpiHierarchy, getIntegratedKpiAllocated } from '../data/defaultProject';
import CircularGauge from './CircularGauge';

interface KpiEditorViewProps {
  project: Project;
  currentUserObj?: User | null;
  onUpdateKpi: (updatedKpi: KpiAllocatedItem[]) => void;
  onProjectUpdate?: (part: Partial<Project>, logReason?: string) => void;
}

export default function KpiEditorView({ project, currentUserObj, onUpdateKpi, onProjectUpdate }: KpiEditorViewProps) {
  const [selectedGroupId, setSelectedGroupId] = React.useState<string>('all');
  const kpis = getIntegratedKpiAllocated(project);
  const hierarchy = buildKpiHierarchy(project.contractType || 'DBB', project);

  const isAdmin = currentUserObj?.role === 'admin' || currentUserObj?.username === 'proj_1781786415663';

  // Subgroup creator panel states
  const [showAddSubForm, setShowAddSubForm] = React.useState(false);
  const [newParentGoalId, setNewParentGoalId] = React.useState<string>('G1');
  const [newSscId, setNewSscId] = React.useState<string>('');
  const [newSscName, setNewSscName] = React.useState<string>('');
  const [newSscWt, setNewSscWt] = React.useState<number>(10);
  
  // First KPI inside that custom subgroup states
  const [newKpiId, setNewKpiId] = React.useState<string>('');
  const [newKpiDesc, setNewKpiDesc] = React.useState<string>('');
  const [newKpiWt, setNewKpiWt] = React.useState<number>(100);
  const [newKpiType, setNewKpiType] = React.useState<'pct' | 'yn'>('pct');

  // Subgroup weights editing state per Goal ID (e.g. "G1" has active editing)
  const [editingGoalWeightsId, setEditingGoalWeightsId] = React.useState<string | null>(null);
  const [tempWeights, setTempWeights] = React.useState<Record<string, number>>({});

  // Subgroup inline description (name) editing state
  const [editingSscDetailsId, setEditingSscDetailsId] = React.useState<string | null>(null);
  const [tempSscName, setTempSscName] = React.useState<string>('');

  // Inline criteria adder states
  const [addingCriteriaSscId, setAddingCriteriaSscId] = React.useState<string | null>(null);
  const [tempCriteriaId, setTempCriteriaId] = React.useState<string>('');
  const [tempCriteriaDesc, setTempCriteriaDesc] = React.useState<string>('');
  const [tempCriteriaWt, setTempCriteriaWt] = React.useState<number>(100);
  const [tempCriteriaType, setTempCriteriaType] = React.useState<'pct' | 'yn'>('pct');

  // Auto-generate subgroup ID and first KPI ID based on selected parent category group
  React.useEffect(() => {
    const goal = hierarchy.find(g => g.id === newParentGoalId);
    if (goal) {
      // Find highest index
      let nextIndex = goal.sscs.length + 1;
      let formatPrefix = "SC";
      if (newParentGoalId.startsWith("G")) {
        formatPrefix = `SC${newParentGoalId.substring(1)}.`;
      }
      
      let tentativeId = `${formatPrefix}${nextIndex}`;
      while (goal.sscs.some(s => s.id === tentativeId)) {
        nextIndex++;
        tentativeId = `${formatPrefix}${nextIndex}`;
      }
      setNewSscId(tentativeId);
      setNewKpiId(`KPI-${tentativeId}A`);
    } else {
      setNewSscId(`SC-CUSTOM-${Date.now().toString().slice(-4)}`);
      setNewKpiId(`KPI-CUSTOM-${Date.now().toString().slice(-4)}`);
    }
  }, [newParentGoalId, showAddSubForm]);

  // Handle saving the custom subgroup structure as a real integrated KPI
  const handleCreateSubgroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      alert("Only an Admin can configure & add new subgroups.");
      return;
    }
    if (!newSscName.trim()) {
      alert("Please provide a subgroup name");
      return;
    }
    if (!newKpiDesc.trim()) {
      alert("Please provide the description for the first KPI in this subgroup");
      return;
    }

    const goal = hierarchy.find(g => g.id === newParentGoalId);
    const goalName = goal ? goal.name : `Group ${newParentGoalId}`;
    const goalWt = goal ? goal.wt : 100;

    const newKpiItem: KpiAllocatedItem = {
      goalId: newParentGoalId,
      goalName: goalName,
      goalWt: goalWt,
      sscId: newSscId.trim(),
      sscName: newSscName.trim(),
      sscWt: newSscWt,
      itemId: newKpiId.trim() || `KPI-${newSscId}-${Date.now().toString().slice(-4)}`,
      desc: newKpiDesc.trim(),
      unit: newKpiType === 'yn' ? '0/1' : '%',
      itemWt: newKpiWt,
      max: newKpiType === 'yn' ? 1 : 100,
      type: newKpiType,
      alloc: newKpiType === 'yn' ? 1 : 100, // Initialize to 100% or Yes
      naActive: false,
      isOverridden: true
    };

    // Save back to project KPI list
    const currentList = [...(project.kpiAllocated || [])];
    currentList.push(newKpiItem);

    onUpdateKpi(currentList);
    
    // Clear and hide form
    setNewSscName('');
    setNewKpiDesc('');
    setShowAddSubForm(false);
    if (onProjectUpdate) {
      onProjectUpdate({ kpiAllocated: currentList }, `Created custom subgroup "${newSscName}" under "${goalName}"`);
    }
  };

  // Handle edit of subgroup weights in a Goal
  const handleStartEditingWeights = (goalId: string, sscs: Array<{id: string, wt: number}>) => {
    if (!isAdmin) return;
    const initialTemp: Record<string, number> = {};
    sscs.forEach(s => {
      initialTemp[s.id] = s.wt;
    });
    setTempWeights(initialTemp);
    setEditingGoalWeightsId(goalId);
  };

  const handleSaveGoalWeights = (goalId: string) => {
    if (!isAdmin) {
      alert("Only an Admin can modify subgroup weights.");
      return;
    }
    // We map over all current project kpis (including defaults and overrides)
    // and apply the new sscWt for any kpi matching the edited sscId
    const baseKpis = getIntegratedKpiAllocated(project);
    const updated = baseKpis.map(k => {
      if (k.goalId === goalId && tempWeights[k.sscId] !== undefined) {
        return {
          ...k,
          sscWt: tempWeights[k.sscId],
          isOverridden: true // mark as modified
        };
      }
      return k;
    });

    onUpdateKpi(updated);
    setEditingGoalWeightsId(null);
    if (onProjectUpdate) {
      onProjectUpdate({ kpiAllocated: updated }, `Modified subgroup weight distribution inside KPI Group ${goalId}`);
    }
  };

  // Handle edit of subgroup description (name)
  const handleStartRenameSubgroup = (sscId: string, currentName: string) => {
    if (!isAdmin) return;
    setEditingSscDetailsId(sscId);
    setTempSscName(currentName);
  };

  const handleSaveRenameSubgroup = (sscId: string) => {
    if (!isAdmin) return;
    if (!tempSscName.trim()) {
      alert("Subgroup name/description cannot be empty.");
      return;
    }

    const allIntegrated = getIntegratedKpiAllocated(project);
    const matchingKpis = allIntegrated.filter(k => k.sscId === sscId);
    if (matchingKpis.length === 0) {
      alert("No active KPI items found for this subgroup to renaming.");
      setEditingSscDetailsId(null);
      return;
    }

    const currentOverrides = project.kpiAllocated ? [...project.kpiAllocated] : [];
    matchingKpis.forEach(k => {
      const idx = currentOverrides.findIndex(o => o.itemId === k.itemId);
      if (idx !== -1) {
        currentOverrides[idx] = {
          ...currentOverrides[idx],
          sscName: tempSscName.trim(),
          isOverridden: true
        };
      } else {
        currentOverrides.push({
          ...k,
          sscName: tempSscName.trim(),
          isOverridden: true
        });
      }
    });

    onUpdateKpi(currentOverrides);
    setEditingSscDetailsId(null);
    if (onProjectUpdate) {
      onProjectUpdate({ kpiAllocated: currentOverrides }, `Renamed KPI subgroup "${sscId}" description to "${tempSscName.trim()}"`);
    }
  };

  // Handle delete of standard or custom subgroups
  const handleDeleteSubgroup = (sscId: string, sscName: string) => {
    if (!isAdmin) {
      alert("Only an Admin can delete subgroups.");
      return;
    }
    if (confirm(`Are you sure you want to delete the subgroup "${sscName}"?\nThis will hide the subgroup and remove its KPI items from the active scorecard evaluation.`)) {
      // 1. Add to project's deleted list
      const deletedList = [...(project.kpiDeletedSubgroups || [])];
      if (!deletedList.includes(sscId)) {
        deletedList.push(sscId);
      }
      
      // 2. Also clean up any overrides targeting it in kpiAllocated
      const currentOverrides = project.kpiAllocated ? [...project.kpiAllocated] : [];
      const updatedOverrides = currentOverrides.filter(k => k.sscId !== sscId);

      onUpdateKpi(updatedOverrides);
      if (onProjectUpdate) {
        onProjectUpdate({ 
          kpiAllocated: updatedOverrides,
          kpiDeletedSubgroups: deletedList
        }, `Deleted subgroup "${sscName}" (${sscId})`);
      }
    }
  };

  // Handle addition of custom criteria inside a subgroup
  const handleCreateCriteria = (sscId: string, parentGoalId: string) => {
    if (!isAdmin) {
      alert("Only an Admin can configure & add new criteria.");
      return;
    }
    if (!tempCriteriaId.trim()) {
      alert("Please provide a criteria ID.");
      return;
    }
    if (!tempCriteriaDesc.trim()) {
      alert("Please provide the description for this criteria");
      return;
    }

    const goal = hierarchy.find(g => g.id === parentGoalId);
    const goalName = goal ? goal.name : `Group ${parentGoalId}`;
    const goalWt = goal ? goal.wt : 100;
    const ssc = goal?.sscs.find(s => s.id === sscId);
    const sscName = ssc ? ssc.name : `Subgroup ${sscId}`;
    const sscWt = ssc ? ssc.wt : 20;

    const newKpiItem: KpiAllocatedItem = {
      goalId: parentGoalId,
      goalName: goalName,
      goalWt: goalWt,
      sscId: sscId,
      sscName: sscName,
      sscWt: sscWt,
      itemId: tempCriteriaId.trim(),
      desc: tempCriteriaDesc.trim(),
      unit: tempCriteriaType === 'yn' ? '0/1' : '%',
      itemWt: tempCriteriaWt,
      max: tempCriteriaType === 'yn' ? 1 : 100,
      type: tempCriteriaType,
      alloc: tempCriteriaType === 'yn' ? 1 : 100,
      naActive: false,
      isOverridden: true
    };

    const currentList = project.kpiAllocated ? [...project.kpiAllocated] : [];
    const existingIdx = currentList.findIndex(k => k.itemId === newKpiItem.itemId);
    if (existingIdx !== -1) {
      currentList[existingIdx] = newKpiItem;
    } else {
      currentList.push(newKpiItem);
    }

    let deletedItems = project.kpiDeletedItems ? [...project.kpiDeletedItems] : [];
    deletedItems = deletedItems.filter(id => id !== newKpiItem.itemId);

    onUpdateKpi(currentList);
    setAddingCriteriaSscId(null);
    if (onProjectUpdate) {
      onProjectUpdate({ 
        kpiAllocated: currentList,
        kpiDeletedItems: deletedItems
      }, `Created custom criteria "${newKpiItem.itemId}" under "${sscName}"`);
    }
  };

  // Handle delete of standard or custom criteria/indicators
  const handleDeleteCriteria = (itemId: string, itemDesc: string) => {
    if (!isAdmin) {
      alert("Only an Admin can delete criteria.");
      return;
    }
    if (confirm(`Are you sure you want to delete the criteria "${itemId}" - "${itemDesc}"?\nThis will hide the criteria and exclude it from scorecard evaluation.`)) {
      // 1. Add to project's deleted items list
      const deletedList = [...(project.kpiDeletedItems || [])];
      if (!deletedList.includes(itemId)) {
        deletedList.push(itemId);
      }
      
      // 2. Also clean up any overrides targeting it in kpiAllocated
      const currentOverrides = project.kpiAllocated ? [...project.kpiAllocated] : [];
      const updatedOverrides = currentOverrides.filter(k => k.itemId !== itemId);

      onUpdateKpi(updatedOverrides);
      if (onProjectUpdate) {
        onProjectUpdate({ 
          kpiAllocated: updatedOverrides,
          kpiDeletedItems: deletedList
        }, `Deleted criteria "${itemDesc}" (${itemId})`);
      }
    }
  };

  const getKpiTooltip = (id: string, desc: string): string => {
    const kpiTooltips: Record<string, string> = {
      'PP-1': 'Measures the overall physical progress of the project compared to the approved baseline schedule. Score = (Actual progress % / Planned progress %) * 100.',
      'PP-3': 'Tracks asphalt paving progress specifically. Score = (Actual km laid / Planned km) * 100.',
      'MS-1': 'Has the contractor completed initial mobilization? Yes = 1, No = 0.',
      'MS-2': "Are all key personnel deployed per contract? Yes = 1, No = 0.",
      'MS-3': 'Have the Engineer\'s office/lab facility been provided? Yes = 1, No = 0.',
      'MS-4': 'Are major construction equipment mobilized? Yes = 1, No = 0.',
      'MS-5': 'Submission of Design Review Document (for Design-Build projects).',
      'MS-14': 'Crushed aggregates stockpile vs plan meets 95%.',
      'MS-15': 'Earthworks progress vs plan meets 95% conformance.',
      'PT-1': 'Schedule Efficiency: Auto-calculated via Physical Progress % / Elapsed Time %.',
      'CM-1': 'Cost Conformance: Variation amount vs original contract sum.',
      'TM-1': 'Time overruns: Approved EOT days vs original duration days.',
      'RW-1': 'ROW Clearance: Calculated via cleared Km vs total project length Km.',
      'RW-2A': 'Properties identified, measured, evaluated: Calculated via Properties identified, measured, evaluated Km vs total project length.',
      'RW-2B': 'Compensation paid to owners: Calculated via Compensation Paid by ERA Km vs total project length.',
      'RW-2C': 'Compensated properties removed: Calculated via ROW Obstruction free Section Km vs total project length.',
      'RW-3': 'Monthly ROW report completeness: Calculated via overall utility relocation handover completion rate.',
    };
    return kpiTooltips[id] || `${desc}. Enter 0-100% or select Yes(1)/No(0).`;
  };

  const isAutoKpi = (id: string) => {
    return ['PP-1', 'PT-1', 'CM-1', 'TM-1', 'TM-2', 'RW-1', 'RW-2A', 'RW-2B', 'RW-2C', 'RW-3', 'CC-1A', 'CC-3A', 'CC-3B', 'CC-3C', 'CC-3D', 'CC-3E', 'CC-3F'].includes(id);
  };

  const handleValueChange = (itemId: string, value: number, isNa: boolean) => {
    const updated = kpis.map(k => {
      if (k.itemId === itemId) {
        return {
          ...k,
          alloc: value,
          naActive: isNa,
          isOverridden: true
        };
      }
      return k;
    });
    onUpdateKpi(updated);
  };

  const handleResetToAuto = (itemId: string) => {
    const updated = kpis.map(k => {
      if (k.itemId === itemId) {
        return {
          ...k,
          isOverridden: false
        };
      }
      return k;
    });
    onUpdateKpi(updated);
  };

  // Autocalculate sub-scores for visual display inside the headers
  const getSscScore = (sscId: string): number => {
    let earned = 0;
    let maxPossible = 0;
    
    kpis.forEach(k => {
      if (k.sscId === sscId) {
        if (k.naActive) return;
        const val = k.type === 'yn' ? (k.alloc >= k.max ? k.max : 0) : k.alloc;
        const wt = k.itemWt;
        earned += val * (wt / 100);
        maxPossible += k.max * (wt / 100);
      }
    });

    return maxPossible > 0 ? (earned / maxPossible) * 100 : 0;
  };

  const getGoalScore = (goalId: string): number => {
    let earnedSum = 0;
    let maxPossibleSum = 0;

    const goal = hierarchy.find(g => g.id === goalId);
    if (!goal) return 0;

    goal.sscs.forEach(ssc => {
      const sscScore = getSscScore(ssc.id);
      earnedSum += sscScore * (ssc.wt / 100);
      maxPossibleSum += 100 * (ssc.wt / 100);
    });

    return maxPossibleSum > 0 ? (earnedSum / maxPossibleSum) * 100 : 0;
  };

  return (
    <div className="space-y-4">
      {/* 1. Admin/Non-Admin mode banners */}
      {!isAdmin ? (
        <div className="bg-amber-50/50 dark:bg-amber-950/15 border border-amber-200/60 dark:border-amber-900/45 p-4 rounded-2xl flex items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">
              <Info className="w-5 h-5" />
            </span>
            <div>
              <p className="text-xs font-bold text-amber-800 dark:text-amber-200">View-Only Auditee Mode</p>
              <p className="text-2xs text-amber-600/90 dark:text-amber-400">
                You are logged in with standard read permissions ({currentUserObj?.role || 'viewer'}). Creating custom subgroups, editing descriptions (names), deleting subdivisions, and weight modifications are restricted to <strong>Admin</strong> users.
              </p>
            </div>
          </div>
          <span className="text-[9px] font-extrabold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-650 dark:text-amber-400 border border-amber-200/40 dark:border-amber-900/30 uppercase select-none tracking-wider">
            Locked
          </span>
        </div>
      ) : null}

      {/* 2. Admin restoration panel for deleted subgroups and criteria */}
      {isAdmin && ((project.kpiDeletedSubgroups && project.kpiDeletedSubgroups.length > 0) || (project.kpiDeletedItems && project.kpiDeletedItems.length > 0)) && (
        <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            {project.kpiDeletedSubgroups && project.kpiDeletedSubgroups.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Hidden Subgroups:</span>
                <div className="flex gap-1.5 flex-wrap">
                  {project.kpiDeletedSubgroups.map(id => (
                    <span key={id} className="bg-rose-50 dark:bg-rose-950/25 border border-rose-200/50 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-lg font-bold font-mono text-[10px]">
                      {id}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {project.kpiDeletedItems && project.kpiDeletedItems.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Hidden Criteria:</span>
                <div className="flex gap-1.5 flex-wrap">
                  {project.kpiDeletedItems.map(id => (
                    <span key={id} className="bg-amber-50 dark:bg-amber-950/25 border border-amber-200/50 dark:border-amber-900/30 text-amber-650 dark:text-amber-400 px-2 py-0.5 rounded-lg font-bold font-mono text-[10px]">
                      {id}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <p className="text-[10px] text-slate-450 dark:text-slate-500 leading-normal">
              These items have been excluded from KPI evaluation and active scorecard reports.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {project.kpiDeletedSubgroups && project.kpiDeletedSubgroups.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to restore all previously deleted KPI subgroups?")) {
                    onProjectUpdate?.({ kpiDeletedSubgroups: [] }, "Restored all deleted KPI subgroups");
                  }
                }}
                className="text-[10px] bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-zinc-200 px-3 py-1.5 rounded-xl font-bold transition cursor-pointer border border-slate-200 dark:border-slate-700 select-none shadow-3xs hover:shadow-2xs self-start md:self-auto"
              >
                Restore Hidden Subgroups
              </button>
            )}
            {project.kpiDeletedItems && project.kpiDeletedItems.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Are you sure you want to restore all previously deleted KPI criteria?")) {
                    onProjectUpdate?.({ kpiDeletedItems: [] }, "Restored all deleted KPI criteria");
                  }
                }}
                className="text-[10px] bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-zinc-200 px-3 py-1.5 rounded-xl font-bold transition cursor-pointer border border-slate-200 dark:border-slate-700 select-none shadow-3xs hover:shadow-2xs self-start md:self-auto"
              >
                Restore Hidden Criteria
              </button>
            )}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 mb-1 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-blue-500" />
            ERA Contract Audit KPI Matrix
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Redistribute contract weight automatically by selecting N/A. Hover over <Info className="inline w-3 h-3" /> for standard auditing metrics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 self-end md:self-auto">
          {/* Subgroup creation button */}
          {isAdmin ? (
            <button
              onClick={() => setShowAddSubForm(!showAddSubForm)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-sm select-none"
            >
              <FolderPlus className="w-4 h-4" />
              {showAddSubForm ? 'Close Creator' : 'Add custom subgroup'}
            </button>
          ) : (
            <button
              disabled
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 text-slate-405 dark:text-slate-550 border border-slate-200/50 dark:border-slate-750 cursor-not-allowed select-none opacity-60"
              title="Only admins can add custom KPI subgroups"
            >
              <FolderPlus className="w-4 h-4 text-slate-400" />
              Add custom subgroup (Admin Locked)
            </button>
          )}

          <div className="flex items-center gap-2.5 whitespace-nowrap bg-slate-50 dark:bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700/85">
            <span className="text-xs font-bold text-slate-600 dark:text-zinc-300">Contractor Grade:</span>
            <select
              value={project.contractorGrade || 'G1'}
              disabled={!isAdmin}
              onChange={(e) => onProjectUpdate?.({ contractorGrade: e.target.value }, `Updated Contractor Grade to ${e.target.value}`)}
              className={`bg-white dark:bg-slate-800 text-xs font-bold border border-slate-350 dark:border-slate-650 px-2.5 py-1 rounded-lg outline-none text-slate-850 dark:text-zinc-100 focus:border-blue-500 transition-colors ${!isAdmin ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
            >
              {Array.from({ length: 12 }, (_, i) => `G${i + 1}`).map(grade => (
                <option key={grade} value={grade}>{grade} Contractor</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Dynamic Subgroup Creation form */}
      {showAddSubForm && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-900/60 p-5 rounded-2xl shadow-sm space-y-4"
        >
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-705 pb-3">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-emerald-500" />
              Configure & Add New KPI Subgroup
            </h3>
            <button 
              type="button"
              onClick={() => setShowAddSubForm(false)}
              className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreateSubgroup} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Step 1: Subgroup Metadata */}
            <div className="space-y-3.5 border-r border-dotted border-slate-250/60 dark:border-slate-700/65 pr-0 md:pr-4">
              <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 tracking-wide uppercase">1. Subgroup properties</h4>
              
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Parent Category Group (Goal)</label>
                <select
                  value={newParentGoalId}
                  onChange={(e) => setNewParentGoalId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 text-xs px-3 py-2 rounded-xl text-slate-800 dark:text-zinc-100 focus:border-blue-500 outline-none cursor-pointer font-semibold"
                >
                  {hierarchy.map(g => (
                    <option key={g.id} value={g.id}>
                      {g.id}: {g.name} ({g.wt}% total weight)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="col-span-1 space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Subgroup ID</label>
                  <input
                    type="text"
                    required
                    value={newSscId}
                    onChange={(e) => setNewSscId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 text-xs font-mono font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-zinc-50 outline-none"
                    placeholder="SC1.4"
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Subgroup Weight (% limit in Goal)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={newSscWt}
                    onChange={(e) => setNewSscWt(parseInt(e.target.value, 10) || 10)}
                    className="w-full bg-slate-50 dark:bg-slate-900 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-zinc-50 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Subgroup Name/Title</label>
                <input
                  type="text"
                  required
                  value={newSscName}
                  onChange={(e) => setNewSscName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-zinc-50 outline-none"
                  placeholder="e.g. Environmental Health Audit"
                />
              </div>

              {/* Integrity helper display */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-150 dark:border-slate-750 text-[10px] text-slate-500 dark:text-slate-400 space-y-1 leading-relaxed">
                <span className="font-bold text-slate-600 dark:text-zinc-300 block">⚡ Integration Logic Helper:</span>
                <span>
                  The selected group <strong>{newParentGoalId}</strong> contains existing subgroups with a current weight of{' '}
                  <strong>
                    {hierarchy.find(g => g.id === newParentGoalId)?.sscs.reduce((sum, s) => sum + s.wt, 0) || 0}%
                  </strong>.
                </span>
                <span className="block mt-1 text-blue-500 font-semibold">
                  Adding this subgroup will count towards the internal division scores automatically!
                </span>
              </div>
            </div>

            {/* Step 2: Main KPI element info */}
            <div className="space-y-3.5 flex flex-col justify-between">
              <div className="space-y-3.5">
                <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 tracking-wide uppercase">2. Define initial KPI inside Subgroup</h4>

                <div className="grid grid-cols-2 gap-2.5">
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">KPI Identifier Code</label>
                    <input
                      type="text"
                      required
                      value={newKpiId}
                      onChange={(e) => setNewKpiId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900 text-xs font-mono font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-zinc-50 outline-none"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">KPI Weighting inside Subgroup (%)</label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      value={newKpiWt}
                      onChange={(e) => setNewKpiWt(parseInt(e.target.value, 10) || 100)}
                      className="w-full bg-slate-50 dark:bg-slate-900 text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-zinc-50 outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">KPI Standard Description</label>
                  <input
                    type="text"
                    required
                    value={newKpiDesc}
                    onChange={(e) => setNewKpiDesc(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 text-xs font-medium px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-zinc-50 outline-none"
                    placeholder="e.g. Percentage of safety checklists approved monthly without alerts"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500">Evaluation Mode Type</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-zinc-350 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="kpiType"
                        checked={newKpiType === 'pct'}
                        onChange={() => setNewKpiType('pct')}
                        className="text-blue-550 focus:ring-0 cursor-pointer"
                      />
                      Percentage (0-100%)
                    </label>
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-zinc-350 cursor-pointer select-none">
                      <input
                        type="radio"
                        name="kpiType"
                        checked={newKpiType === 'yn'}
                        onChange={() => setNewKpiType('yn')}
                        className="text-blue-550 focus:ring-0 cursor-pointer"
                      />
                      Binary Conformance (Yes/No - 1.0 / 0.0)
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-705">
                <button
                  type="button"
                  onClick={() => setShowAddSubForm(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-900 font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Save Subgroup & KPI
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      )}

      {/* Category Group Selector */}
      <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-4 rounded-2xl shadow-sm space-y-2.5">
        <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Filter KPI Category Group</span>
        
        {/* Toggle Pills for Desktop */}
        <div className="hidden sm:flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedGroupId('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition duration-150 cursor-pointer ${
              selectedGroupId === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            All KPI Groups ({hierarchy.length})
          </button>
          {hierarchy.map((goal) => {
            const score = getGoalScore(goal.id);
            return (
              <button
                key={goal.id}
                onClick={() => setSelectedGroupId(goal.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition duration-150 flex items-center gap-1.5 cursor-pointer ${
                  selectedGroupId === goal.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-zinc-300 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60'
                }`}
              >
                <span>{goal.name}</span>
                <span className={`text-[9px] px-1.5 py-0.25 rounded-md font-sans ${
                  selectedGroupId === goal.id ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-350'
                }`}>
                  {score.toFixed(2)}%
                </span>
              </button>
            );
          })}
        </div>

        {/* Custom Group Select for Mobile screens */}
        <div className="sm:hidden relative">
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-slate-900 text-xs font-bold py-2.5 px-3.5 border border-slate-250 dark:border-slate-705 pr-10 rounded-xl appearance-none cursor-pointer text-slate-800 dark:text-zinc-100 focus:border-blue-500 transition-colors"
          >
            <option value="all">All KPI Groups</option>
            {hierarchy.map((goal) => (
              <option key={goal.id} value={goal.id}>
                {goal.id}: {goal.name} ({getGoalScore(goal.id).toFixed(2)}%)
              </option>
            ))}
          </select>
          <div className="absolute right-3.5 top-3 pointer-events-none text-slate-400">
            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {hierarchy
          .filter(goal => selectedGroupId === 'all' || goal.id === selectedGroupId)
          .map((goal) => {
            const score = getGoalScore(goal.id);
          return (
            <div 
              key={goal.id} 
              className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-sm"
            >
              {/* Goal Header */}
              <div className="bg-gradient-to-r from-blue-700 to-blue-800 dark:from-slate-750 dark:to-slate-800 text-white px-5 py-3 flex justify-between items-center select-none">
                <span className="font-extrabold text-sm tracking-wide">
                  {goal.id}: {goal.name} <span className="font-normal opacity-85 text-xs">({goal.wt}%)</span>
                </span>
                <span className="text-xs md:text-sm font-black bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-lg border border-amber-400 font-mono shadow-sm">
                  Goal Score: {score.toFixed(2)}%
                </span>
              </div>

              {/* Subgroups Weight manager triggers */}
              <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-150/60 dark:border-slate-700/60 px-5 py-2 flex items-center justify-between text-[10px] font-extrabold tracking-wider text-slate-400 dark:text-slate-500 uppercase select-none">
                <span>Goal Subgroup Breakdown:</span>
                
                {editingGoalWeightsId === goal.id ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleSaveGoalWeights(goal.id)}
                      className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/20 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 px-2 py-0.75 rounded-md border border-emerald-200 dark:border-emerald-900/30 transition cursor-pointer font-bold uppercase text-[9px]"
                    >
                      <Save className="w-3 h-3" />
                      Save weights
                    </button>
                    <button
                      onClick={() => setEditingGoalWeightsId(null)}
                      className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 text-slate-500 dark:text-slate-400 px-2 py-0.75 rounded-md border border-slate-200 dark:border-slate-700 transition cursor-pointer font-bold uppercase text-[9px]"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                ) : (
                  isAdmin && (
                    <button
                      onClick={() => handleStartEditingWeights(goal.id, goal.sscs)}
                      className="flex items-center gap-1 bg-white hover:bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-slate-800 dark:text-zinc-300 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer font-bold text-[9px]"
                    >
                      <Sliders className="w-3 h-3 text-blue-500" />
                      Manage Weights
                    </button>
                  )
                )}
              </div>

              {/* Sub Categories inside Goal */}
              <div className="p-4 space-y-4">
                {goal.sscs.map((ssc) => {
                  const sscScore = getSscScore(ssc.id);
                  return (
                    <div key={ssc.id} className="space-y-2">
                      <div className="flex justify-between items-center text-xs font-semibold text-blue-700 dark:text-blue-400 border-b border-blue-50/50 pb-1.5 flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {editingSscDetailsId === ssc.id ? (
                            <div className="flex items-center gap-1.5 py-0.5">
                              <span className="font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                                {ssc.id}:
                              </span>
                              <input
                                type="text"
                                value={tempSscName}
                                onChange={(e) => setTempSscName(e.target.value)}
                                className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md py-0.5 px-2 text-xs font-extrabold focus:border-blue-500 outline-none text-slate-800 dark:text-zinc-50"
                                autoFocus
                              />
                              <button
                                onClick={() => handleSaveRenameSubgroup(ssc.id)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded p-1 transition cursor-pointer flex items-center justify-center shadow-xs"
                                title="Save description"
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingSscDetailsId(null)}
                                className="bg-slate-200 hover:bg-slate-350 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-zinc-350 rounded p-1 transition cursor-pointer flex items-center justify-center border border-slate-300/40"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="tracking-wide font-black text-slate-800 dark:text-zinc-100">
                                {ssc.id}: {ssc.name}
                              </span>
                              {isAdmin && (
                                <button
                                  onClick={() => handleStartRenameSubgroup(ssc.id, ssc.name)}
                                  className="p-1 text-slate-400 hover:text-blue-500 cursor-pointer flex items-center justify-center bg-slate-50/50 hover:bg-slate-100 dark:bg-slate-900/40 dark:hover:bg-slate-750 border border-slate-200/40 dark:border-slate-700/50 rounded-lg transition"
                                  title="Edit description"
                                >
                                  <Edit className="w-3 h-3 text-slate-500/80" />
                                </button>
                              )}
                            </div>
                          )}

                          {editingGoalWeightsId === goal.id ? (
                            <div className="flex items-center gap-1 my-0.5 animate-pulse">
                              <span className="text-[10px] text-slate-400 font-bold">Weight:</span>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={tempWeights[ssc.id] ?? ssc.wt}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  setTempWeights({
                                    ...tempWeights,
                                    [ssc.id]: isNaN(val) ? 0 : val
                                  });
                                }}
                                className="w-12 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md py-0.5 px-1.5 text-center text-2xs font-extrabold focus:border-blue-500 outline-none text-slate-800 dark:text-zinc-50"
                              />
                              <span className="text-[10px] text-slate-400 font-bold">% of goal</span>
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold bg-blue-550/10 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-400">
                              {ssc.wt}% of goal
                            </span>
                          )}

                          {/* Delete option for subgroups (Admin only) */}
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteSubgroup(ssc.id, ssc.name)}
                              className="text-[9px] text-rose-500/80 hover:text-rose-600 cursor-pointer flex items-center gap-0.5 ml-1.5 font-bold select-none border border-rose-200/20 dark:border-rose-950/20 px-1.5 py-0.5 rounded-lg bg-rose-500/5 hover:bg-rose-500/10 transition"
                              title="Delete subgroup"
                            >
                              <Trash2 className="w-3 h-3 text-rose-500" />
                              Delete
                            </button>
                          )}

                          {/* Add Criteria option inside subgroup (Admin only) */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                if (addingCriteriaSscId === ssc.id) {
                                  setAddingCriteriaSscId(null);
                                } else {
                                  setAddingCriteriaSscId(ssc.id);
                                  const count = ssc.items.length;
                                  const lastLetter = count > 0 ? String.fromCharCode(65 + count) : 'A';
                                  setTempCriteriaId(`KPI-${ssc.id}${lastLetter}`);
                                  setTempCriteriaDesc('');
                                  setTempCriteriaWt(20);
                                  setTempCriteriaType('pct');
                                }
                              }}
                              className="text-[9px] text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:text-emerald-300 cursor-pointer flex items-center gap-0.5 ml-1.5 font-bold select-none border border-emerald-200/20 dark:border-emerald-950/25 px-1.5 py-0.5 rounded-lg bg-emerald-500/5 hover:bg-emerald-500/10 transition"
                              title="Add criteria/indicator item to this subgroup"
                            >
                              <Plus className="w-3 h-3 text-emerald-500" />
                              Add Criteria
                            </button>
                          )}
                        </div>
                        <span className="font-mono text-2xs">Sub-Score: {sscScore.toFixed(2)}%</span>
                      </div>

                      {/* Add Criteria Inline Form */}
                      {addingCriteriaSscId === ssc.id && (
                        <div className="bg-slate-50 dark:bg-slate-900/50 border border-emerald-100 dark:border-emerald-950/40 p-3.5 rounded-xl space-y-3 mt-1.5 shadow-3xs">
                          <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                            <h4 className="text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 uppercase tracking-wider">
                              <Plus className="w-3.5 h-3.5" /> Add New Criteria to {ssc.id}
                            </h4>
                            <button 
                              type="button"
                              onClick={() => setAddingCriteriaSscId(null)}
                              className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-350"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5">
                            <div className="space-y-1">
                              <label className="text-[9px] uppercase font-extrabold text-slate-400 dark:text-slate-500">Criteria ID</label>
                              <input
                                type="text"
                                required
                                value={tempCriteriaId}
                                onChange={(e) => setTempCriteriaId(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 text-xs font-mono font-bold px-2 py-1.5 rounded-lg border border-slate-250 dark:border-slate-705 text-slate-800 dark:text-zinc-50 outline-none"
                                placeholder="e.g. KPI-SC8.4A"
                              />
                            </div>
                            
                            <div className="space-y-1 md:col-span-2">
                              <label className="text-[9px] uppercase font-extrabold text-slate-400 dark:text-slate-500">Criteria Description</label>
                              <input
                                type="text"
                                required
                                value={tempCriteriaDesc}
                                onChange={(e) => setTempCriteriaDesc(e.target.value)}
                                className="w-full bg-white dark:bg-slate-800 text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-250 dark:border-slate-705 text-slate-800 dark:text-zinc-50 outline-none"
                                placeholder="e.g. Contractor's IPC delay beyond 56 day"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] uppercase font-extrabold text-slate-400 dark:text-slate-500">Weight (%)</label>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                required
                                value={tempCriteriaWt}
                                onChange={(e) => setTempCriteriaWt(parseInt(e.target.value, 10) || 100)}
                                className="w-full bg-white dark:bg-slate-800 text-xs font-bold px-2 py-1.5 rounded-lg border border-slate-250 dark:border-slate-705 text-slate-800 dark:text-zinc-50 outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                            <div className="flex gap-4">
                              <label className="flex items-center gap-1.5 text-2xs font-bold text-slate-600 dark:text-zinc-400 cursor-pointer select-none">
                                <input
                                  type="radio"
                                  name={`criteriaType-${ssc.id}`}
                                  checked={tempCriteriaType === 'pct'}
                                  onChange={() => setTempCriteriaType('pct')}
                                  className="text-blue-550 focus:ring-0 cursor-pointer"
                                />
                                Percentage (0-100%)
                              </label>
                              <label className="flex items-center gap-1.5 text-2xs font-bold text-slate-600 dark:text-zinc-400 cursor-pointer select-none">
                                <input
                                  type="radio"
                                  name={`criteriaType-${ssc.id}`}
                                  checked={tempCriteriaType === 'yn'}
                                  onChange={() => setTempCriteriaType('yn')}
                                  className="text-blue-550 focus:ring-0 cursor-pointer"
                                />
                                Binary Conformance (Yes/No)
                              </label>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => setAddingCriteriaSscId(null)}
                                className="px-2.5 py-1 text-2xs font-extrabold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-750 rounded-lg transition"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleCreateCriteria(ssc.id, goal.id)}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-2xs font-extrabold rounded-lg transition shadow-xs flex items-center gap-0.5"
                              >
                                <Plus className="w-3 h-3" /> Save Criteria
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Items */}
                      <div className="space-y-1">
                        {ssc.items.map((it) => {
                          const kpi = kpis.find(k => k.itemId === it.id);
                          if (!kpi) return null;

                          return (
                            <div 
                              key={it.id} 
                              className="group flex flex-col md:flex-row md:items-center justify-between text-xs p-2.5 rounded-xl border border-dotted border-slate-100 hover:border-slate-350 dark:border-slate-700/40 dark:hover:border-slate-600 bg-slate-50/40 dark:bg-slate-900/10 hover:bg-white dark:hover:bg-slate-900/40 transition gap-2"
                            >
                              {/* Left parameters */}
                              <div className="flex items-start gap-2 flex-1">
                                <span className="font-mono font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-[10px]">
                                  {it.id}
                                </span>
                                
                                <span className="text-slate-700 dark:text-slate-300 font-medium leading-tight relative mt-0.5 flex items-center gap-1">
                                  {it.desc}
                                  
                                  {/* Tooltip trigger icon */}
                                  <span className="tooltip-trigger relative text-slate-400 hover:text-blue-500 cursor-help">
                                    <HelpCircle className="w-3.5 h-3.5" />
                                    <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-slate-900 dark:bg-slate-950 text-white rounded-lg p-2 text-[10px] leading-relaxed shadow-xl border border-slate-700 opacity-0 pointer-events-none transition duration-150 tooltip-box z-50">
                                      {getKpiTooltip(it.id, it.desc)}
                                    </span>
                                  </span>
                                </span>
                              </div>

                              {/* Right Values / editing elements */}
                              <div className="flex items-center gap-3 self-end md:self-auto">
                                {isAutoKpi(it.id) && (
                                  <div className="flex items-center">
                                    {kpi.isOverridden ? (
                                      <button
                                        onClick={() => handleResetToAuto(it.id)}
                                        className="text-[9px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40 px-1.5 py-0.5 rounded-md border border-amber-200 dark:border-amber-900/40 transition cursor-pointer"
                                        title="Click to reset and use telemetry auto-calculation value"
                                      >
                                        Overridden (Reset)
                                      </button>
                                    ) : (
                                      <span className="text-[9px] font-bold bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-md border border-blue-150 dark:border-blue-900/30">
                                        Auto Active
                                      </span>
                                    )}
                                  </div>
                                )}

                                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                                  Wt: {it.wt}%
                                </span>

                                <div className="flex items-center gap-1.5">
                                  {it.type === 'yn' ? (
                                    <select
                                      value={kpi.naActive ? 'na' : (it.id === 'RK-1' ? (kpi.alloc === 0 ? '0' : '1') : (kpi.alloc >= it.max ? '1' : '0'))}
                                      onChange={(e) => {
                                        const v = e.target.value;
                                        if (v === 'na') {
                                          handleValueChange(it.id, 0, true);
                                        } else {
                                          handleValueChange(it.id, parseInt(v, 10), false);
                                        }
                                      }}
                                      className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-705 text-xs px-2.5 py-1 rounded-lg font-bold outline-none cursor-pointer text-slate-800 dark:text-zinc-50 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-950 transition-all duration-150 shadow-sm"
                                    >
                                      {it.id === 'RK-1' ? (
                                        <>
                                          <option value="0">Yes (0.0)</option>
                                          <option value="1">No (1.0)</option>
                                        </>
                                      ) : (
                                        <>
                                          <option value="1">Yes (1.0)</option>
                                          <option value="0">No (0.0)</option>
                                        </>
                                      )}
                                      <option value="na">N/A</option>
                                    </select>
                                  ) : (
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number"
                                        min="0"
                                        max={it.max}
                                        step="0.1"
                                        value={kpi.naActive ? '' : kpi.alloc}
                                        placeholder="0.0"
                                        onChange={(e) => {
                                          const val = parseFloat(e.target.value);
                                          handleValueChange(it.id, isNaN(val) ? 0 : val, false);
                                        }}
                                        className="w-16 bg-slate-50 dark:bg-slate-900 text-center text-xs font-mono font-extrabold px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-705 outline-none text-slate-800 dark:text-zinc-50 placeholder-slate-400 dark:placeholder-slate-600 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-950 transition-all duration-150 shadow-sm"
                                      />
                                      <span className="text-[10px] text-slate-400 font-mono select-none">/ {it.max}</span>
                                      
                                      <button
                                        onClick={() => {
                                          handleValueChange(it.id, 0, !kpi.naActive);
                                        }}
                                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition border cursor-pointer ${
                                          kpi.naActive 
                                            ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30' 
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-500 dark:bg-slate-850 dark:hover:bg-slate-750 border-slate-200 dark:border-slate-755'
                                        }`}
                                      >
                                        N/A
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {kpi.naActive && (
                                  <span className="text-[9px] font-bold bg-amber-500 text-slate-900 rounded-md px-1.5 py-0.5 border border-amber-400">
                                    N/A Tracked
                                  </span>
                                )}

                                {isAdmin && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCriteria(it.id, it.desc)}
                                    className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer border border-rose-200/20"
                                    title="Delete criteria/indicator"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* CSS Injected styling for tooltip */}
      <style>{`
        .tooltip-trigger:hover .tooltip-box {
          opacity: 1;
          pointer-events: auto;
        }
      `}</style>

    </div>
  );
}
