import React from 'react';
import { motion } from 'motion/react';
import { 
  ShieldCheck, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Coins, 
  MapPin, 
  Users, 
  HelpCircle, 
  TrendingUp, 
  AlertCircle,
  Zap,
  Wrench
} from 'lucide-react';
import { Project, RowMetric, RowCompensationItem, UtilityCompensationItem, RowStatusItem, formatAccounting } from '../types';

interface RowStatusViewProps {
  project: Project;
  onUpdateRowMetrics: (metrics: RowMetric[]) => void;
  onUpdateRowCompensation: (compensation: RowCompensationItem[]) => void;
  onUpdateUtilityCompensation: (utility: UtilityCompensationItem[]) => void;
  onUpdateRowStatus: (rowStatus: RowStatusItem[]) => void;
}

export default function RowStatusView({ 
  project, 
  onUpdateRowMetrics, 
  onUpdateRowCompensation,
  onUpdateUtilityCompensation,
  onUpdateRowStatus
}: RowStatusViewProps) {
  const metrics = project.rowMetrics || [];
  const compensations = project.rowCompensation || [];

  // Metrics handlers
  const handleFieldChange = (idx: number, field: keyof RowMetric, value: any) => {
    const updated = metrics.map((m, i) => {
      if (i === idx) {
        return {
          ...m,
          [field]: field === 'value' ? (parseFloat(value) || 0) : value
        };
      }
      return m;
    });
    onUpdateRowMetrics(updated);
  };

  const handleAddRow = () => {
    const newMetric: RowMetric = {
      name: 'New Right-Of-Way Metric',
      value: 0,
      unit: 'Km'
    };
    onUpdateRowMetrics([...metrics, newMetric]);
  };

  const handleRemoveLastRow = () => {
    if (metrics.length > 0) {
      onUpdateRowMetrics(metrics.slice(0, -1));
    }
  };

  // Compensation handlers
  const handleCompFieldChange = (idx: number, field: keyof RowCompensationItem, value: any) => {
    const updated = compensations.map((c, i) => {
      if (i === idx) {
        const nextItem = {
          ...c,
          [field]: field === 'affectedPaps' 
            ? (parseInt(value) || 0) 
            : (field === 'compensationRequired' || field === 'compensationPaid') 
              ? (parseFloat(value) || 0) 
              : value
        };
        // Auto-calculate unpaid balance
        if (field === 'compensationRequired' || field === 'compensationPaid') {
          const req = field === 'compensationRequired' ? (parseFloat(value) || 0) : (c.compensationRequired || 0);
          const paid = field === 'compensationPaid' ? (parseFloat(value) || 0) : (c.compensationPaid || 0);
          nextItem.unpaidBalance = req - paid;
        }
        return nextItem;
      }
      return c;
    });
    onUpdateRowCompensation(updated);
  };

  const handleAddCompRow = () => {
    const newComp: RowCompensationItem = {
      id: `comp_${Date.now()}`,
      woreda: 'New Woreda / Kebele',
      affectedPaps: 0,
      compensationRequired: 0,
      compensationPaid: 0,
      unpaidBalance: 0,
      status: 'Unpaid',
      remarks: ''
    };
    onUpdateRowCompensation([...compensations, newComp]);
  };

  const handleRemoveCompRow = (idx: number) => {
    onUpdateRowCompensation(compensations.filter((_, i) => i !== idx));
  };

  // Utilities Compensation handlers
  const utilityCompensations = project.utilityCompensation || [];

  const handleUtilFieldChange = (idx: number, field: keyof UtilityCompensationItem, value: any) => {
    const updated = utilityCompensations.map((c, i) => {
      if (i === idx) {
        const nextItem = {
          ...c,
          [field]: (field === 'compensationRequired' || field === 'compensationPaid') 
            ? (parseFloat(value) || 0) 
            : value
        };
        // Auto-calculate unpaid balance by subtracting Paid from Required
        if (field === 'compensationRequired' || field === 'compensationPaid') {
          const req = field === 'compensationRequired' ? (parseFloat(value) || 0) : (c.compensationRequired || 0);
          const paid = field === 'compensationPaid' ? (parseFloat(value) || 0) : (c.compensationPaid || 0);
          nextItem.unpaidBalance = req - paid;
        }
        return nextItem;
      }
      return c;
    });
    onUpdateUtilityCompensation(updated);
  };

  const handleAddUtilRow = () => {
    const newUtil: UtilityCompensationItem = {
      id: `util_${Date.now()}`,
      utilityType: 'New Utility Infrastructure',
      ownerAgency: 'Owner Agency / Bureau',
      quantity: '1 Unit',
      compensationRequired: 0,
      compensationPaid: 0,
      unpaidBalance: 0,
      status: 'Unpaid',
      remarks: ''
    };
    onUpdateUtilityCompensation([...utilityCompensations, newUtil]);
  };

  const handleRemoveUtilRow = (idx: number) => {
    onUpdateUtilityCompensation(utilityCompensations.filter((_, i) => i !== idx));
  };

  // Calculate high-level summary stats for compensation
  const totalRequired = compensations.reduce((sum, c) => sum + (parseFloat(c.compensationRequired as any) || 0), 0);
  const totalPaid = compensations.reduce((sum, c) => sum + (parseFloat(c.compensationPaid as any) || 0), 0);
  const totalUnpaid = compensations.reduce((sum, c) => sum + (parseFloat(c.unpaidBalance as any) || 0), 0);
  const totalPaps = compensations.reduce((sum, c) => sum + (parseInt(c.affectedPaps as any) || 0), 0);

  // Calculate stats for utilities compensation
  const totalUtilRequired = utilityCompensations.reduce((sum, u) => sum + (parseFloat(u.compensationRequired as any) || 0), 0);
  const totalUtilPaid = utilityCompensations.reduce((sum, u) => sum + (parseFloat(u.compensationPaid as any) || 0), 0);
  const totalUtilUnpaid = utilityCompensations.reduce((sum, u) => sum + (parseFloat(u.unpaidBalance as any) || 0), 0);

  const paymentRate = totalRequired > 0 ? (totalPaid / totalRequired) * 100 : 0;

  // ROW Status Section Tracker handlers
  const rowStatusItems = project.rowStatus || [];

  const handleRowStatusFieldChange = (idx: number, field: keyof RowStatusItem, value: any) => {
    const updated = rowStatusItems.map((item, i) => {
      if (i === idx) {
        const nextItem = {
          ...item,
          [field]: value
        };
        
        // Auto-calculate length if 'from' or 'to' changes
        if (field === 'from' || field === 'to') {
          const fromStr = field === 'from' ? value : item.from;
          const toStr = field === 'to' ? value : item.to;
          
          const parseKm = (s: string) => {
            if (!s) return null;
            const clean = s.toLowerCase().replace(/km/g, '').replace(/\s/g, '');
            if (clean.includes('+')) {
              const parts = clean.split('+');
              const km = parseFloat(parts[0]) || 0;
              const m = parseFloat(parts[1]) || 0;
              return km + (m / 1000);
            }
            return parseFloat(clean);
          };
          
          const fromVal = parseKm(fromStr);
          const toVal = parseKm(toStr);
          if (fromVal !== null && toVal !== null && !isNaN(fromVal) && !isNaN(toVal)) {
            const diff = Math.abs(toVal - fromVal);
            nextItem.length = `${diff.toFixed(2)} Km`;
          }
        }
        
        return nextItem;
      }
      return item;
    });
    onUpdateRowStatus(updated);
  };

  const handleAddRowStatus = () => {
    let lastFrom = "Km 0+000";
    let lastTo = "Km 01+000";
    if (rowStatusItems.length > 0) {
      const lastItem = rowStatusItems[rowStatusItems.length - 1];
      lastFrom = lastItem.to;
      
      const parseKm = (s: string) => {
        const clean = s.toLowerCase().replace(/km/g, '').replace(/\s/g, '');
        if (clean.includes('+')) {
          const parts = clean.split('+');
          const km = parseInt(parts[0]) || 0;
          const m = parseInt(parts[1]) || 0;
          return km * 1000 + m;
        }
        return (parseFloat(clean) || 0) * 1000;
      };
      
      const meters = parseKm(lastItem.to);
      const nextMeters = meters + 1000; 
      const kmPart = Math.floor(nextMeters / 1000);
      const mPart = nextMeters % 1000;
      
      const formatNum = (n: number, len: number) => {
        let str = n.toString();
        while (str.length < len) str = "0" + str;
        return str;
      };
      lastTo = `Km ${formatNum(kmPart, 2)}+${formatNum(mPart, 3)}`;
    }

    const newRowStatus: RowStatusItem = {
      id: `row_status_${Date.now()}`,
      from: lastFrom,
      to: lastTo,
      length: '1.00 Km',
      status: 'Fully Handover',
      remark: ''
    };
    onUpdateRowStatus([...rowStatusItems, newRowStatus]);
  };

  const handleRemoveRowStatus = (idx: number) => {
    onUpdateRowStatus(rowStatusItems.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1: Right-Of-Way Clearance & Technical Relocation Metrics */}
      <div className="space-y-4">
        {/* Header and Controls */}
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 mb-1 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
              Right‑of‑Way (ROW) & Utilities Relocation Status
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
            <button
              onClick={handleAddRow}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-250 text-xs font-bold py-1.5 px-3 rounded-xl transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Parameter
            </button>
            <button
              onClick={handleRemoveLastRow}
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:text-rose-455 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove Last
            </button>
          </div>
        </div>

        {/* Spreadsheet Tables */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-slate-700 dark:text-slate-200">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/60 text-slate-400 dark:text-slate-500 font-bold">
                  <th className="p-3 w-16 text-center">Row</th>
                  <th className="p-3">Objection Metric Parameter Description</th>
                  <th className="p-3 w-40 text-center">Value</th>
                  <th className="p-3 w-28 text-center font-bold">Execution Unit</th>
                  <th className="p-3 w-12 text-center">Del</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-55 dark:divide-slate-700/40">
                {metrics.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                    <td className="p-3 text-center font-bold text-slate-400 font-mono">{idx + 1}</td>
                    <td className="p-3 font-semibold text-slate-750 dark:text-slate-350">
                      <input
                        type="text"
                        value={m.name}
                        onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        type="number"
                        step="0.01"
                        value={m.value}
                        onChange={(e) => handleFieldChange(idx, 'value', e.target.value)}
                        className="w-28 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-extrabold text-blue-600 dark:text-blue-400 text-xs focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="p-3 text-center font-mono">
                      <input
                        type="text"
                        value={m.unit}
                        onChange={(e) => handleFieldChange(idx, 'unit', e.target.value)}
                        className="w-16 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-1 py-1 text-center text-xs focus:outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => onUpdateRowMetrics(metrics.filter((_, i) => i !== idx))}
                        className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 2: Right-Of-Way Compensation Payment Breakdown */}
      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-700/50">
        {/* ROW Compensation Payment Header */}
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 mb-1 flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500" />
              Right‑of‑Way Compensation Payment & PAP Tracker
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Manage compensation distributions, Project Affected Persons (PAPs) metrics, disbursed amounts, and outstanding financial liabilities across regional Woredas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
            <button
              onClick={handleAddCompRow}
              className="bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:text-amber-400 text-amber-700 text-xs font-bold py-1.5 px-3 rounded-xl transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Compensation Record
            </button>
          </div>
        </div>

        {/* Mini KPI Block for Compensation summary stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-4 rounded-xl shadow-sm flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Total Required Budget</span>
              <span className="text-base font-black text-slate-800 dark:text-zinc-100 font-mono">{formatAccounting(totalRequired)} M</span>
            </div>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
              <Coins className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-4 rounded-xl shadow-sm flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Total Paid to Date</span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">{formatAccounting(totalPaid)} M</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-4 rounded-xl shadow-sm flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Remaining Liability</span>
              <span className="text-base font-black text-rose-600 dark:text-rose-400 font-mono font-extrabold">{formatAccounting(totalUnpaid)} M</span>
            </div>
            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-4 rounded-xl shadow-sm flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Total Impacted PAPs</span>
              <span className="text-base font-black text-violet-600 dark:text-violet-400 font-mono">
                {totalPaps} <span className="text-xs font-normal text-slate-400">Persons</span>
              </span>
            </div>
            <div className="p-2 rounded-lg bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400">
              <Users className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Editable Compensation Payment Table */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-slate-700 dark:text-slate-200">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/60 text-slate-400 dark:text-slate-500 font-bold">
                  <th className="p-3 w-12 text-center">No.</th>
                  <th className="p-3 w-48">Woreda / Location</th>
                  <th className="p-3 w-32 text-center">Affected PAPs</th>
                  <th className="p-3 w-36 text-center">Required (M Birr)</th>
                  <th className="p-3 w-36 text-center">Paid (M Birr)</th>
                  <th className="p-3 w-36 text-center">Unpaid Balance</th>
                  <th className="p-3 w-40 text-center">Payment Status</th>
                  <th className="p-3">Specific Remarks / Mitigation Actions</th>
                  <th className="p-3 w-12 text-center">Del</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-55 dark:divide-slate-700/40">
                {compensations.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 dark:text-slate-500">
                      No compensation records registered. Click 'Add Compensation Record' to insert regional Woreda datasets.
                    </td>
                  </tr>
                ) : (
                  compensations.map((c, idx) => (
                    <tr key={c.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                      <td className="p-3 text-center font-bold text-slate-400 font-mono">{idx + 1}</td>
                      
                      {/* Woreda/Location */}
                      <td className="p-3">
                        <div className="relative flex items-center">
                          <MapPin className="w-3.5 h-3.5 absolute left-2 text-slate-400" />
                          <input
                            type="text"
                            value={c.woreda}
                            onChange={(e) => handleCompFieldChange(idx, 'woreda', e.target.value)}
                            placeholder="Woreda Name"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-7 pr-2 py-1 text-xs font-semibold focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </td>

                      {/* PAPs Count */}
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          value={c.affectedPaps}
                          onChange={(e) => handleCompFieldChange(idx, 'affectedPaps', e.target.value)}
                          placeholder="0"
                          className="w-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Required Budget */}
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          step="0.01"
                          value={c.compensationRequired}
                          onChange={(e) => handleCompFieldChange(idx, 'compensationRequired', e.target.value)}
                          placeholder="0.00"
                          className="w-28 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-blue-600 dark:text-blue-400 focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Paid Budget */}
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          step="0.01"
                          value={c.compensationPaid}
                          onChange={(e) => handleCompFieldChange(idx, 'compensationPaid', e.target.value)}
                          placeholder="0.00"
                          className="w-28 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Auto-calculated Unpaid Balance */}
                      <td className="p-3 text-center">
                        <span className={`font-mono font-black text-xs ${c.unpaidBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                          {formatAccounting(c.unpaidBalance ?? 0)} M
                        </span>
                      </td>

                      {/* Status Selector */}
                      <td className="p-3 text-center">
                        <select
                          value={c.status}
                          onChange={(e) => handleCompFieldChange(idx, 'status', e.target.value)}
                          className="w-32 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:border-blue-500"
                        >
                          <option value="Unpaid">🔴 Unpaid</option>
                          <option value="In Progress">🟡 In Progress</option>
                          <option value="Partially Paid">🟠 Partially Paid</option>
                          <option value="Fully Paid">🟢 Fully Paid</option>
                        </select>
                      </td>

                      {/* Remarks */}
                      <td className="p-3">
                        <input
                          type="text"
                          value={c.remarks}
                          onChange={(e) => handleCompFieldChange(idx, 'remarks', e.target.value)}
                          placeholder="e.g. pending title deed validation"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Delete button */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleRemoveCompRow(idx)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition"
                          title="Delete compensation record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 3: Utilities Relocation Compensation Payment Tracker */}
      <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-700/50">
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 mb-1 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Utilities Relocation Compensation Payment Tracker
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Track compensation payments and relocation status for public utilities infrastructure (electricity, telecom, water) with local authorities.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
            <button
              onClick={handleAddUtilRow}
              className="bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/20 dark:text-amber-400 text-amber-700 text-xs font-bold py-1.5 px-3 rounded-xl transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Utility Record
            </button>
          </div>
        </div>

        {/* Mini KPI Block for Utilities Compensation summary stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-4 rounded-xl shadow-sm flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Total Required Budget</span>
              <span className="text-base font-black text-slate-800 dark:text-zinc-100 font-mono">{formatAccounting(totalUtilRequired)} M</span>
            </div>
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
              <Coins className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-4 rounded-xl shadow-sm flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Total Paid to Date</span>
              <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">{formatAccounting(totalUtilPaid)} M</span>
            </div>
            <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-4 rounded-xl shadow-sm flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider block">Remaining Liability</span>
              <span className="text-base font-black text-rose-600 dark:text-rose-400 font-mono font-extrabold">{formatAccounting(totalUtilUnpaid)} M</span>
            </div>
            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Editable Utilities Compensation Table */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-slate-700 dark:text-slate-200">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/60 text-slate-400 dark:text-slate-500 font-bold">
                  <th className="p-3 w-12 text-center">No.</th>
                  <th className="p-3 w-48">Utility Type</th>
                  <th className="p-3 w-48">Owner Agency / Bureau</th>
                  <th className="p-3 w-32 text-center">Quantity / Metric</th>
                  <th className="p-3 w-36 text-center">Required (M Birr)</th>
                  <th className="p-3 w-36 text-center">Paid (M Birr)</th>
                  <th className="p-3 w-36 text-center">Unpaid Balance</th>
                  <th className="p-3 w-40 text-center">Relocation Status</th>
                  <th className="p-3">Specific Remarks / Mitigation Actions</th>
                  <th className="p-3 w-12 text-center">Del</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-55 dark:divide-slate-700/40">
                {utilityCompensations.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-400 dark:text-slate-500">
                      No utility compensation records registered. Click 'Add Utility Record' to insert utility datasets.
                    </td>
                  </tr>
                ) : (
                  utilityCompensations.map((c, idx) => (
                    <tr key={c.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                      <td className="p-3 text-center font-bold text-slate-400 font-mono">{idx + 1}</td>
                      
                      {/* Utility Type */}
                      <td className="p-3">
                        <div className="relative flex items-center">
                          <Wrench className="w-3.5 h-3.5 absolute left-2 text-slate-400" />
                          <input
                            type="text"
                            value={c.utilityType}
                            onChange={(e) => handleUtilFieldChange(idx, 'utilityType', e.target.value)}
                            placeholder="e.g. Water Pipeline"
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-7 pr-2 py-1 text-xs font-semibold focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </td>

                      {/* Owner Agency */}
                      <td className="p-3">
                        <input
                          type="text"
                          value={c.ownerAgency}
                          onChange={(e) => handleUtilFieldChange(idx, 'ownerAgency', e.target.value)}
                          placeholder="e.g. ethio telecom"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Quantity / Metric */}
                      <td className="p-3 text-center">
                        <input
                          type="text"
                          value={c.quantity}
                          onChange={(e) => handleUtilFieldChange(idx, 'quantity', e.target.value)}
                          placeholder="e.g. 15 Poles"
                          className="w-24 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-center font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Required Budget */}
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          step="0.01"
                          value={c.compensationRequired}
                          onChange={(e) => handleUtilFieldChange(idx, 'compensationRequired', e.target.value)}
                          placeholder="0.00"
                          className="w-28 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-blue-600 dark:text-blue-400 focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Paid Budget */}
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          step="0.01"
                          value={c.compensationPaid}
                          onChange={(e) => handleUtilFieldChange(idx, 'compensationPaid', e.target.value)}
                          placeholder="0.00"
                          className="w-28 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Auto-calculated Unpaid Balance */}
                      <td className="p-3 text-center">
                        <span className={`font-mono font-black text-xs ${c.unpaidBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`}>
                          {formatAccounting(c.unpaidBalance ?? 0)} M
                        </span>
                      </td>

                      {/* Status Selector */}
                      <td className="p-3 text-center">
                        <select
                          value={c.status}
                          onChange={(e) => handleUtilFieldChange(idx, 'status', e.target.value)}
                          className="w-32 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:border-blue-500"
                        >
                          <option value="Unpaid">🔴 Unpaid</option>
                          <option value="In Progress">🟡 In Progress</option>
                          <option value="Partially Paid">🟠 Partially Paid</option>
                          <option value="Fully Paid">🟢 Fully Paid</option>
                        </select>
                      </td>

                      {/* Remarks */}
                      <td className="p-3">
                        <input
                          type="text"
                          value={c.remarks}
                          onChange={(e) => handleUtilFieldChange(idx, 'remarks', e.target.value)}
                          placeholder="e.g. waiting for clearance"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:border-blue-500"
                        />
                      </td>

                      {/* Delete button */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleRemoveUtilRow(idx)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition"
                          title="Delete utility record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 4: Right‑of‑Way Chainage Clearance Status Tracker */}
      <div className="space-y-4 pt-6 border-t border-slate-100 dark:border-slate-700/50">
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 mb-1 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-indigo-500" />
              Right‑of‑Way (ROW) Section Status Tracker
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
            <button
              onClick={handleAddRowStatus}
              className="bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 text-indigo-700 text-xs font-bold py-1.5 px-3 rounded-xl transition flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add ROW Section
            </button>
          </div>
        </div>

        {/* Editable ROW Section Status Table */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs text-slate-700 dark:text-slate-200">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/60 text-slate-400 dark:text-slate-500 font-bold">
                  <th className="p-3 w-12 text-center">No</th>
                  <th className="p-3 w-44">From</th>
                  <th className="p-3 w-44">To</th>
                  <th className="p-3 w-36 text-center">Length</th>
                  <th className="p-3 w-44 text-center">Status</th>
                  <th className="p-3">Remark</th>
                  <th className="p-3 w-12 text-center">Del</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-55 dark:divide-slate-700/40">
                {rowStatusItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 dark:text-slate-500">
                      No ROW section status records registered. Click 'Add ROW Section' to create segment statuses.
                    </td>
                  </tr>
                ) : (
                  rowStatusItems.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                      <td className="p-3 text-center font-bold text-slate-400 font-mono">{idx + 1}</td>
                      
                      {/* From Station */}
                      <td className="p-3">
                        <input
                          type="text"
                          value={item.from}
                          onChange={(e) => handleRowStatusFieldChange(idx, 'from', e.target.value)}
                          placeholder="e.g. Km 0+000"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                        />
                      </td>

                      {/* To Station */}
                      <td className="p-3">
                        <input
                          type="text"
                          value={item.to}
                          onChange={(e) => handleRowStatusFieldChange(idx, 'to', e.target.value)}
                          placeholder="e.g. Km 01+000"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                        />
                      </td>

                      {/* Length */}
                      <td className="p-3 text-center">
                        <input
                          type="text"
                          value={item.length}
                          onChange={(e) => handleRowStatusFieldChange(idx, 'length', e.target.value)}
                          placeholder="e.g. 1.00 Km"
                          className="w-28 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-center font-mono font-bold text-slate-700 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
                        />
                      </td>

                      {/* Status Selector */}
                      <td className="p-3 text-center">
                        <select
                          value={item.status}
                          onChange={(e) => handleRowStatusFieldChange(idx, 'status', e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-semibold focus:outline-none focus:border-indigo-500"
                        >
                          <option value="Fully Handover">🟢 Fully Handover</option>
                          <option value="Partially Handover">🟡 Partially Handover</option>
                          <option value="Not Handover">🔴 Not Handover</option>
                          <option value="Under Dispute">🟠 Under Dispute</option>
                          <option value="Compensation Pending">🔵 Compensation Pending</option>
                        </select>
                      </td>

                      {/* Remark */}
                      <td className="p-3">
                        <input
                          type="text"
                          value={item.remark}
                          onChange={(e) => handleRowStatusFieldChange(idx, 'remark', e.target.value)}
                          placeholder="e.g. All properties compensated, ready for clearing"
                          className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-600 dark:text-slate-300 focus:outline-none focus:border-indigo-500"
                        />
                      </td>

                      {/* Delete button */}
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleRemoveRowStatus(idx)}
                          className="p-1 text-slate-400 hover:text-rose-500 rounded-lg transition"
                          title="Delete section status"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
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
