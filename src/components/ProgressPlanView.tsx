import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { BarChart3, TrendingUp, Calendar, RefreshCcw, Save, Trash2, CalendarClock, History, ArrowDown } from 'lucide-react';
import { Project, ProgressPlan, ProgressPlanHistoryItem } from '../types';

interface ProgressPlanViewProps {
  project: Project;
  onUpdateProgressPlan: (plan: ProgressPlan, labels: { monthLabel: string; quarterLabel: string; efyLabel: string }) => void;
  onProjectUpdate?: (fields: Partial<Project>, sectionName: string) => void;
}

export default function ProgressPlanView({ project, onUpdateProgressPlan, onProjectUpdate }: ProgressPlanViewProps) {
  const plan = project.progressPlan || {
    contractor: { month: 0, quarter: 0, efy: 0, todate: 0 },
    era: { month: 0, quarter: 0, efy: 0, todate: 0 },
    actual: { month: 0, quarter: 0, efy: 0, todate: 0 }
  };

  const labels = project.progressPlanLabels || {
    monthLabel: 'Month',
    quarterLabel: 'Quarter',
    efyLabel: 'EFY'
  };

  const historyList = project.progressPlanHistory || [];

  // Local state for the archiver prepopulated from table
  const [newMonthLabel, setNewMonthLabel] = useState(labels.monthLabel);
  const [newEfyLabel, setNewEfyLabel] = useState(labels.efyLabel);
  const [customFields, setCustomFields] = useState({
    contractorMonth: plan.contractor.month,
    contractorEfy: plan.contractor.efy,
    eraMonth: plan.era.month,
    eraEfy: plan.era.efy,
    actualMonth: plan.actual.month,
    actualEfy: plan.actual.efy,
  });

  // Track & sync whenever the parent state changes
  useEffect(() => {
    setNewMonthLabel(labels.monthLabel);
    setNewEfyLabel(labels.efyLabel);
    setCustomFields({
      contractorMonth: plan.contractor.month,
      contractorEfy: plan.contractor.efy,
      eraMonth: plan.era.month,
      eraEfy: plan.era.efy,
      actualMonth: plan.actual.month,
      actualEfy: plan.actual.efy,
    });
  }, [labels.monthLabel, labels.efyLabel, plan.contractor.month, plan.contractor.efy, plan.era.month, plan.era.efy, plan.actual.month, plan.actual.efy]);

  const handleFieldChange = (tier: keyof ProgressPlan, key: keyof typeof plan.contractor, val: string) => {
    const value = parseFloat(val) || 0;
    const updatedPlan = {
      ...plan,
      [tier]: {
        ...plan[tier],
        [key]: value
      }
    };
    onUpdateProgressPlan(updatedPlan, labels);
  };

  const handleLabelChange = (field: keyof typeof labels, value: string) => {
    const updatedLabels = {
      ...labels,
      [field]: value
    };
    onUpdateProgressPlan(plan, updatedLabels);
  };

  // Add/Archive Record
  const handleSaveToHistory = () => {
    if (!newMonthLabel.trim()) return;

    const newItem: ProgressPlanHistoryItem = {
      id: 'hist_' + Date.now(),
      monthLabel: newMonthLabel,
      efyLabel: newEfyLabel,
      contractorMonth: customFields.contractorMonth,
      contractorEfy: customFields.contractorEfy,
      eraMonth: customFields.eraMonth,
      eraEfy: customFields.eraEfy,
      actualMonth: customFields.actualMonth,
      actualEfy: customFields.actualEfy,
    };

    // Prevent duplicated months in archive list
    const filteredHistory = historyList.filter(
      item => !(item.monthLabel.toLowerCase() === newMonthLabel.toLowerCase() && item.efyLabel === newEfyLabel)
    );

    const updatedHistory = [...filteredHistory, newItem];

    if (onProjectUpdate) {
      onProjectUpdate({ progressPlanHistory: updatedHistory }, 'Archived milestone record');
    }
  };

  const handleDeleteHistoryItem = (id: string) => {
    const updatedHistory = historyList.filter(item => item.id !== id);
    if (onProjectUpdate) {
      onProjectUpdate({ progressPlanHistory: updatedHistory }, 'Deleted archived milestone record');
    }
  };

  const handleRestoreHistoryItem = (item: ProgressPlanHistoryItem) => {
    const updatedPlan: ProgressPlan = {
      ...plan,
      contractor: {
        ...plan.contractor,
        month: item.contractorMonth,
        efy: item.contractorEfy,
      },
      era: {
        ...plan.era,
        month: item.eraMonth,
        efy: item.eraEfy,
      },
      actual: {
        ...plan.actual,
        month: item.actualMonth,
        efy: item.actualEfy,
      }
    };

    const updatedLabels = {
      ...labels,
      monthLabel: item.monthLabel,
      efyLabel: item.efyLabel,
    };

    onUpdateProgressPlan(updatedPlan, updatedLabels);
  };

  return (
    <div className="space-y-4">
      {/* Header and Label Configs */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100">
            Progress Plan Mileage Comparisons (Km)
          </h2>
        </div>

        {/* Dynamic Headers Setup */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="space-y-1">
            <label className="block font-bold text-slate-400 uppercase tracking-wide text-[10px]">Month Tracking Month:</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={labels.monthLabel}
                onChange={(e) => handleLabelChange('monthLabel', e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl py-1.5 pl-9 pr-3 text-xs outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-400 uppercase tracking-wide text-[10px]">Quarterly Range:</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={labels.quarterLabel}
                onChange={(e) => handleLabelChange('quarterLabel', e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl py-1.5 pl-9 pr-3 text-xs outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-400 uppercase tracking-wide text-[10px]">Ethiopian Fiscal Year (EFY):</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                value={labels.efyLabel}
                onChange={(e) => handleLabelChange('efyLabel', e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl py-1.5 pl-9 pr-3 text-xs outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Spreadsheet Input */}
      <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs text-slate-700 dark:text-slate-200">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/60 text-slate-400 dark:text-slate-500 font-bold">
                <th className="p-3">Plan/Actual Tier Category</th>
                <th className="p-3 text-center">{labels.monthLabel} (Km)</th>
                <th className="p-3 text-center">{labels.quarterLabel} (Km)</th>
                <th className="p-3 text-center">EFY {labels.efyLabel} (Km)</th>
                <th className="p-3 text-center font-black text-blue-600 dark:text-blue-400">Cumulative (Km)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40">
              {/* Contractor */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                <td className="p-3 font-semibold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-blue-500 rounded-sm" />
                  Contractor Program Schedule
                </td>
                <td className="p-3 text-center">
                  <input
                    type="number"
                    step="0.01"
                    value={plan.contractor.month}
                    onChange={(e) => handleFieldChange('contractor', 'month', e.target.value)}
                    className="w-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-mono py-0.5"
                  />
                </td>
                <td className="p-3 text-center">
                  <input
                    type="number"
                    step="0.01"
                    value={plan.contractor.quarter}
                    onChange={(e) => handleFieldChange('contractor', 'quarter', e.target.value)}
                    className="w-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-mono py-0.5"
                  />
                </td>
                <td className="p-3 text-center">
                  <input
                    type="number"
                    step="0.01"
                    value={plan.contractor.efy}
                    onChange={(e) => handleFieldChange('contractor', 'efy', e.target.value)}
                    className="w-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-mono py-0.5"
                  />
                </td>
                <td className="p-3 text-center font-mono font-extrabold text-blue-600 dark:text-blue-400">
                  <input
                    type="number"
                    step="0.01"
                    value={plan.contractor.todate}
                    onChange={(e) => handleFieldChange('contractor', 'todate', e.target.value)}
                    className="w-24 bg-slate-50 dark:bg-slate-900 border border-dashed border-blue-200 dark:border-blue-700 rounded-lg text-center font-bold"
                  />
                </td>
              </tr>

              {/* ERA Plan */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                <td className="p-3 font-semibold flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-orange-500 rounded-sm" />
                  ERA Internal Milestone Plan
                </td>
                <td className="p-3 text-center">
                  <input
                    type="number"
                    step="0.01"
                    value={plan.era.month}
                    onChange={(e) => handleFieldChange('era', 'month', e.target.value)}
                    className="w-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-mono py-0.5"
                  />
                </td>
                <td className="p-3 text-center">
                  <input
                    type="number"
                    step="0.01"
                    value={plan.era.quarter}
                    onChange={(e) => handleFieldChange('era', 'quarter', e.target.value)}
                    className="w-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-mono py-0.5"
                  />
                </td>
                <td className="p-3 text-center">
                  <input
                    type="number"
                    step="0.01"
                    value={plan.era.efy}
                    onChange={(e) => handleFieldChange('era', 'efy', e.target.value)}
                    className="w-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-mono py-0.5"
                  />
                </td>
                <td className="p-3 text-center font-mono font-extrabold text-blue-600 dark:text-blue-400">
                  <input
                    type="number"
                    step="0.01"
                    value={plan.era.todate}
                    onChange={(e) => handleFieldChange('era', 'todate', e.target.value)}
                    className="w-24 bg-slate-50 dark:bg-slate-900 border border-dashed border-blue-200 dark:border-blue-700 rounded-lg text-center font-bold"
                  />
                </td>
              </tr>

              {/* Actual Completed */}
              <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 font-bold bg-slate-50/20 dark:bg-slate-900/5 text-emerald-600 dark:text-emerald-400">
                <td className="p-3 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm" />
                  Actual Road Completed (TODATE)
                </td>
                <td className="p-3 text-center">
                  <input
                    type="number"
                    step="0.01"
                    value={plan.actual.month}
                    onChange={(e) => handleFieldChange('actual', 'month', e.target.value)}
                    className="w-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-mono py-0.5 text-emerald-600 dark:text-emerald-400 font-bold"
                  />
                </td>
                <td className="p-3 text-center">
                  <input
                    type="number"
                    step="0.01"
                    value={plan.actual.quarter}
                    onChange={(e) => handleFieldChange('actual', 'quarter', e.target.value)}
                    className="w-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-mono py-0.5 text-emerald-600 dark:text-emerald-400 font-bold"
                  />
                </td>
                <td className="p-3 text-center">
                  <input
                    type="number"
                    step="0.01"
                    value={plan.actual.efy}
                    onChange={(e) => handleFieldChange('actual', 'efy', e.target.value)}
                    className="w-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-mono py-0.5 text-emerald-600 dark:text-emerald-400 font-bold"
                  />
                </td>
                <td className="p-3 text-center font-mono font-extrabold text-blue-600 dark:text-blue-400">
                  <input
                    type="number"
                    step="0.01"
                    value={plan.actual.todate}
                    onChange={(e) => handleFieldChange('actual', 'todate', e.target.value)}
                    className="w-24 bg-white dark:bg-slate-800 border border-dashed border-emerald-300 dark:border-emerald-700 rounded-lg text-center text-emerald-600 dark:text-emerald-400 font-black"
                  />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Persistence and Archiving Section (Below the main table) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Archive Form */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm space-y-4 lg:col-span-1">
          <div className="flex items-center gap-2">
            <Save className="w-4.5 h-4.5 text-indigo-500" />
            <span className="text-xs font-bold text-slate-850 dark:text-zinc-150 block uppercase">Archive Elapsed Month</span>
          </div>
          <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
            Record current Contractor program, ERA milestone plan, and Actual completed measurements to lock and secure historical performance.
          </p>

          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-semibold block">Month Label</label>
                <input
                  type="text"
                  value={newMonthLabel}
                  onChange={(e) => setNewMonthLabel(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl px-2.5 py-1 text-xs outline-none focus:border-indigo-500 font-medium"
                  placeholder="e.g. Feb 2026"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-semibold block">EFY Label</label>
                <input
                  type="text"
                  value={newEfyLabel}
                  onChange={(e) => setNewEfyLabel(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded-xl px-2.5 py-1 text-xs outline-none focus:border-indigo-500 font-medium font-mono"
                  placeholder="e.g. 2018"
                />
              </div>
            </div>

            <div className="bg-slate-50/70 dark:bg-slate-900/30 rounded-xl p-3 space-y-2 text-[10px] border border-slate-100 dark:border-slate-700/30">
              <span className="font-bold text-slate-400 tracking-wide uppercase block pb-1 border-b border-slate-100 dark:border-slate-700/30">
                Loaded Targets to Save:
              </span>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Contractor Plan:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">
                  {customFields.contractorMonth.toFixed(2)} Km (Month) / {customFields.contractorEfy.toFixed(2)} Km (EFY)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">ERA Plan:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">
                  {customFields.eraMonth.toFixed(2)} Km (Month) / {customFields.eraEfy.toFixed(2)} Km (EFY)
                </span>
              </div>
              <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                <span className="font-bold">Actual Completed:</span>
                <span className="font-mono font-extrabold">
                  {customFields.actualMonth.toFixed(2)} Km (Month) / {customFields.actualEfy.toFixed(2)} Km (EFY)
                </span>
              </div>
            </div>

            <button
              onClick={handleSaveToHistory}
              disabled={!newMonthLabel.trim()}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2 px-4 rounded-xl text-xs transition-colors duration-200 shadow-sm"
            >
              <Save className="w-4 h-4" />
              Keep Elapsed Record
            </button>
          </div>
        </div>

        {/* History / Archive Table */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4.5 h-4.5 text-blue-500" />
              <span className="text-xs font-bold text-slate-850 dark:text-zinc-150 block uppercase">Elapsed Months & EFY Records List</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-500 font-mono font-extrabold">
              {historyList.length} Archived
            </span>
          </div>

          <div className="overflow-x-auto border border-slate-100 dark:border-slate-700/50 rounded-xl">
            <table className="w-full text-left border-collapse text-xs text-slate-700 dark:text-slate-300">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-extrabold border-b border-slate-100 dark:border-slate-700/60">
                  <th className="p-3">Period & EFY</th>
                  <th className="p-3 text-center">Contractor Month / EFY (Km)</th>
                  <th className="p-3 text-center">ERA Month / EFY (Km)</th>
                  <th className="p-3 text-center">Actual Month / EFY (Km)</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-[11px]">
                {historyList.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">
                      <CalendarClock className="w-8 h-8 mx-auto stroke-1.5 opacity-40 mb-2 text-slate-400" />
                      <span className="block font-medium">No archived elapsed records found.</span>
                      <span className="block text-[10px] text-slate-400/80 mt-1">Use the left form to lock in current tracking figures.</span>
                    </td>
                  </tr>
                ) : (
                  historyList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/10 transition-colors duration-150">
                      <td className="p-3">
                        <span className="font-bold text-slate-800 dark:text-zinc-200 block">{item.monthLabel}</span>
                        <span className="text-[10px] font-semibold text-slate-400 font-mono block">EFY {item.efyLabel}</span>
                      </td>
                      <td className="p-3 text-center font-mono">
                        <span className="font-bold block text-blue-600 dark:text-blue-400">{item.contractorMonth.toFixed(2)}</span>
                        <span className="text-[10px] text-slate-400 block">{item.contractorEfy.toFixed(2)}</span>
                      </td>
                      <td className="p-3 text-center font-mono">
                        <span className="font-bold block text-slate-600 dark:text-slate-400">{item.eraMonth.toFixed(2)}</span>
                        <span className="text-[10px] text-slate-400 block">{item.eraEfy.toFixed(2)}</span>
                      </td>
                      <td className="p-3 text-center font-mono bg-emerald-50/10 dark:bg-emerald-950/5">
                        <span className="font-bold block text-emerald-600 dark:text-emerald-400">{item.actualMonth.toFixed(2)}</span>
                        <span className="text-[10px] text-slate-400 block">{item.actualEfy.toFixed(2)}</span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleRestoreHistoryItem(item)}
                            title="Load values back into main spreadsheet inputs"
                            className="bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 dark:text-blue-400 p-1.5 rounded-lg transition-colors text-[10px] font-bold flex items-center gap-1 px-2.5"
                          >
                            <RefreshCcw className="w-3 h-3" />
                            Load
                          </button>
                          <button
                            onClick={() => handleDeleteHistoryItem(item.id)}
                            title="Remove this archived record"
                            className="bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 dark:text-rose-400 p-1.5 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
