import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CalendarRange, Plus, Trash2, TrendingUp, Info } from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { Project, MonthlyProgress } from '../types';

interface MonthlyScurveViewProps {
  project: Project;
  onUpdateMonthly: (monthly: MonthlyProgress[]) => void;
}

export default function MonthlyScurveView({ project, onUpdateMonthly }: MonthlyScurveViewProps) {
  const [months, setMonths] = useState<MonthlyProgress[]>(project.monthly || []);

  React.useEffect(() => {
    setMonths(project.monthly || []);
  }, [project.monthly]);

  const convertToInputMonthFormat = (monthStr: string): string => {
    try {
      const parts = monthStr.split('-');
      if (parts.length === 2) {
        const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mIdx = monthsList.indexOf(parts[0]);
        let year = parseInt(parts[1], 10);
        if (isNaN(year)) return '';
        if (year < 100) {
          year = year + 2000;
        }
        if (mIdx !== -1) {
          const monthNum = (mIdx + 1).toString().padStart(2, '0');
          return `${year}-${monthNum}`;
        }
      }
    } catch (e) {}
    return '';
  };

  const formatFromInputMonth = (inputVal: string): string => {
    try {
      const parts = inputVal.split('-');
      if (parts.length === 2) {
        const year = parts[0].slice(-2);
        const mIdx = parseInt(parts[1], 10) - 1;
        const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        if (mIdx >= 0 && mIdx < 12) {
          return `${monthsList[mIdx]}-${year}`;
        }
      }
    } catch (e) {}
    return inputVal;
  };

  const handleFieldChange = (idx: number, field: keyof MonthlyProgress, value: any) => {
    if (field !== 'month') {
      // If a previous row reached 100%, do not allow changes
      const isColDisabled = idx > 0 && months.slice(0, idx).some(m => {
        const val = m[field];
        return typeof val === 'number' && val >= 100;
      });
      if (isColDisabled) return;
    }

    let parsedVal = field === 'month' ? value : (parseFloat(value) || 0);
    if (field !== 'month' && typeof parsedVal === 'number') {
      if (parsedVal > 100) parsedVal = 100;
      if (parsedVal < 0) parsedVal = 0;
    }

    const updated = months.map((m, i) => {
      if (i === idx) {
        return {
          ...m,
          [field]: parsedVal
        };
      }
      return m;
    });

    // If the active field reached 100%, clear subsequent rows' values on this column to 0
    if (field !== 'month' && typeof parsedVal === 'number' && parsedVal >= 100) {
      for (let i = idx + 1; i < updated.length; i++) {
        updated[i] = {
          ...updated[i],
          [field]: 0
        };
      }
    }

    setMonths(updated);
    onUpdateMonthly(updated);
  };

  const handleAddRow = () => {
    // deduce a default name for the next month
    let nextName = 'New Month';
    if (months.length > 0) {
      const last = months[months.length - 1].month;
      const parts = last.split('-');
      if (parts.length === 2) {
        const monthsList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mIdx = monthsList.indexOf(parts[0]);
        let year = parseInt(parts[1], 10);
        if (mIdx !== -1) {
          const nextMIdx = (mIdx + 1) % 12;
          if (nextMIdx === 0) year += 1;
          nextName = `${monthsList[nextMIdx]}-${year.toString().slice(-2)}`;
        }
      }
    }

    const updated = [...months, { month: nextName, originalPlan: 0, revisedPlan: 0, actual: 0 }];
    setMonths(updated);
    onUpdateMonthly(updated);
  };

  const handleRemoveRow = () => {
    if (months.length > 0) {
      const updated = months.slice(0, -1);
      setMonths(updated);
      onUpdateMonthly(updated);
    }
  };

  // Convert for Recharts presentation
  const chartData = months.map(m => ({
    name: m.month,
    'Original Plan (%)': m.originalPlan,
    'Revised Plan (%)': m.revisedPlan,
    'To-Date Actual (%)': m.actual > 0 ? m.actual : null // don't draw zero flatlines for future months
  }));

  return (
    <div className="space-y-4">
      {/* Header and Controls */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 mb-1 flex items-center gap-2">
            <CalendarRange className="w-5 h-5 text-blue-500" />
            S‑Curve Analysis (Monthly Cumulative %)
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
          <button
            onClick={handleAddRow}
            className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-250 text-xs font-bold py-1.5 px-3 rounded-xl transition flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Month
          </button>
          <button
            onClick={handleRemoveRow}
            className="bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-455 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remove Month
          </button>
        </div>
      </div>



      {/* Raw spreadsheet fields table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto max-h-96 md:max-h-[500px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs text-slate-700 dark:text-slate-200">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/60 text-slate-400 dark:text-slate-500 font-bold sticky top-0 z-10">
                <th className="p-3 w-16 text-center">Row</th>
                <th className="p-3 md:w-80">Month-Year (Text & Calendar Picker)</th>
                <th className="p-3 w-32 text-center">Original Plan %</th>
                <th className="p-3 w-32 text-center">Revised Plan %</th>
                <th className="p-3 w-32 text-center">Actual %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-55 dark:divide-slate-700/40">
              {months.map((m, idx) => {
                const isOrigDisabled = idx > 0 && months.slice(0, idx).some(prev => prev.originalPlan >= 100);
                const isRevDisabled = idx > 0 && months.slice(0, idx).some(prev => prev.revisedPlan >= 100);
                const isActDisabled = idx > 0 && months.slice(0, idx).some(prev => prev.actual >= 100);

                return (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 border-b border-slate-100 dark:border-slate-800">
                    <td className="p-3 text-center font-bold text-slate-400 font-mono">{idx + 1}</td>
                    <td className="p-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        {/* Text editing field */}
                        <div className="relative flex-1">
                          <input
                            type="text"
                            value={m.month}
                            onChange={(e) => handleFieldChange(idx, 'month', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-350 dark:border-slate-755 text-xs text-slate-850 dark:text-zinc-50 pl-2.5 pr-8 py-1 rounded-lg outline-none focus:border-blue-500 dark:focus:border-blue-450 focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-950 transition-all duration-150 h-8"
                            placeholder="Dec-20"
                            title="Format: Month-Year (e.g., Dec-20)"
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                            <CalendarRange className="w-3.5 h-3.5" />
                          </div>
                        </div>

                        {/* Calendar Dropdown / Picker */}
                        <div className="flex items-center gap-1">
                          {/* Desktop wide calendar picker displaying month with a dropdown arrow */}
                          <div className="relative hidden md:flex items-center">
                            <input
                              type="month"
                              value={convertToInputMonthFormat(m.month)}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                  const formatted = formatFromInputMonth(val);
                                  handleFieldChange(idx, 'month', formatted);
                                }
                              }}
                              className="w-40 h-8 px-2 pl-8 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800/65 rounded-lg outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 text-blue-700 dark:text-blue-300 font-medium text-xs transition-all relative z-10"
                              title="Choose month/year from calendar dropdown"
                            />
                            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500 dark:text-blue-400 pointer-events-none z-20">
                              <CalendarRange className="w-4 h-4" />
                            </div>
                            {/* Dropdown caret/indicator indicating it's a calendar dropdown */}
                            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-blue-500 dark:text-blue-400 z-20">
                              <span className="text-[10px]">▼</span>
                            </div>
                          </div>

                          {/* Mobile compact calendar picker */}
                          <div className="relative block md:hidden">
                            <input
                              type="month"
                              value={convertToInputMonthFormat(m.month)}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                  const formatted = formatFromInputMonth(val);
                                  handleFieldChange(idx, 'month', formatted);
                                }
                              }}
                              className="w-9 h-8 p-0 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-900/40 border border-blue-200 dark:border-blue-800/65 rounded-lg outline-none cursor-pointer focus:ring-2 focus:ring-blue-500/20 text-center text-blue-600 dark:text-blue-400 font-bold text-xs"
                              title="Choose month/year from calendar"
                            />
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        step="0.01"
                        value={m.originalPlan}
                        disabled={isOrigDisabled}
                        onChange={(e) => handleFieldChange(idx, 'originalPlan', e.target.value)}
                        className={`w-full text-center font-mono font-bold text-xs px-2 py-1 rounded-lg outline-none transition-all duration-150 h-7 ${
                          isOrigDisabled 
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border-none' 
                            : 'bg-slate-50 dark:bg-slate-900/60 border border-slate-350 dark:border-slate-755 hover:border-slate-400 dark:hover:border-slate-500 focus:border-blue-500 dark:focus:border-blue-450 focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-950 text-slate-850 dark:text-zinc-50'
                        }`}
                        title={isOrigDisabled ? "Column locked: a previous row reached 100%" : ""}
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        step="0.01"
                        value={m.revisedPlan}
                        disabled={isRevDisabled}
                        onChange={(e) => handleFieldChange(idx, 'revisedPlan', e.target.value)}
                        className={`w-full text-center font-mono font-bold text-xs px-2 py-1 rounded-lg outline-none transition-all duration-150 h-7 ${
                          isRevDisabled 
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border-none' 
                            : 'bg-slate-50 dark:bg-slate-900/60 border border-slate-350 dark:border-slate-755 hover:border-slate-400 dark:hover:border-slate-500 focus:border-blue-500 dark:focus:border-blue-450 focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-950 text-slate-850 dark:text-zinc-50'
                        }`}
                        title={isRevDisabled ? "Column locked: a previous row reached 100%" : ""}
                      />
                    </td>
                    <td className="p-3">
                      <input
                        type="number"
                        step="0.01"
                        value={m.actual}
                        disabled={isActDisabled}
                        onChange={(e) => handleFieldChange(idx, 'actual', e.target.value)}
                        className={`w-full text-center font-mono font-black text-xs px-2 py-1 rounded-lg outline-none transition-all duration-150 h-7 ${
                          isActDisabled 
                            ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed border-none' 
                            : 'bg-slate-50 dark:bg-slate-900/60 border border-slate-350 dark:border-slate-755 hover:border-slate-400 dark:hover:border-slate-500 focus:border-blue-500 dark:focus:border-blue-450 focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-950 text-blue-600 dark:text-blue-400'
                        }`}
                        title={isActDisabled ? "Column locked: a previous row reached 100%" : ""}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
