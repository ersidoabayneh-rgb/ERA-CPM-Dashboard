import React from 'react';
import { motion } from 'motion/react';
import { Activity, ShieldAlert, Award, TrendingUp, HelpCircle, FileText, CheckCircle, Clock, Scale } from 'lucide-react';
import { Project, formatAccounting } from '../types';
import CpmLinearComparison from './CpmLinearComparison';

interface ComprehensiveAnalysisViewProps {
  project: Project;
}

export default function ComprehensiveAnalysisView({ project }: ComprehensiveAnalysisViewProps) {
  // Financial computation
  const MILLION = 1_000_000;
  const BAC = project.origAmount * MILLION;
  
  // Sum series
  const tc = (project.series || []).reduce((sum, item) => sum + (item.contractAmt || 0), 0);
  const te = (project.series || []).reduce((sum, item) => sum + (item.execAmt || 0), 0);

  // Formulas
  let grandTotalPct = 1.15; // default contingencies factor in original
  if (project.contractType === 'DB') {
    grandTotalPct = 1.15;
  }
  
  const totalOrigExec = te * grandTotalPct;

  const pa = ((project.payment || []).find(x => x.item === 'Price Adjustment') || { amount: 0 }).amount;
  const advPay = ((project.payment || []).find(x => x.item === 'Advance Payment') || { amount: 0 }).amount;
  const advRepay = ((project.payment || []).find(x => x.item === 'Advance Repayment') || { amount: 0 }).amount;
  const ipc = ((project.payment || []).find(x => x.item.trim().toLowerCase() === 'total todate certified ipc') || { amount: 0 }).amount;

  // EVM elements: actual cost is equal to the Total Todate certified IPC
  const AC = ipc;
  // Earned Value is equal to actual cost times % physical progress
  const EV = AC * (project.physicalProgress / 100);

  // Plan matching: Planned Value (PV) is equal to BAC times S-curve monthly original plan for the last column, until it reaches 100%. If any column reaches 100%, always take 100%
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
        plannedPct = targetMonth ? targetMonth.originalPlan : 100;
      }
    }
  }
  const PV = (plannedPct / 100) * BAC;

  // Variances
  const CV = EV - AC;
  const SV = EV - PV;

  // Indexes
  const CPI = AC > 0 ? (EV / AC) : 1.0;
  const SPI = PV > 0 ? (EV / PV) : 1.0;

  // EAC, VAC, TCPI
  const EAC = CPI > 0 ? (BAC / CPI) : BAC;
  const VAC = BAC - EAC;
  const TCPI = (BAC - AC) > 0 ? (BAC - EV) / (BAC - AC) : 1.0;

  const costOverrunPct = ((project.variation * MILLION) / (project.origAmount * MILLION)) * 100;

  // Tiers warnings
  const getIndexColor = (v: number) => {
    if (v >= 1.0) return 'text-emerald-500';
    if (v >= 0.85) return 'text-amber-500';
    return 'text-rose-500 font-extrabold';
  };

  const getStatusDesc = (c: number, s: number) => {
    if (c >= 1.0 && s >= 1.0) return { label: 'Excellent Conformance', color: 'bg-emerald-50 text-emerald-800' };
    if (c >= 0.85 && s >= 0.85) return { label: 'Moderate Caution', color: 'bg-amber-50 text-amber-800' };
    return { label: 'Critical Variance Notice', color: 'bg-rose-50 text-rose-800 animate-pulse' };
  };

  const status_flag = getStatusDesc(CPI, SPI);

  const formatBr = (v: number) => formatAccounting(v, 'Br.');

  return (
    <div className="space-y-4 text-xs text-slate-700 dark:text-slate-200">
      
      {/* Overview Block */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status Callout */}
        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl flex flex-col justify-between shadow-xs">
          <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
            Project Health Status
          </span>
          <div className="my-2">
            <span className={`text-base font-extrabold tracking-tight px-3 py-1 rounded-xl ${status_flag.color}`}>
              {status_flag.label}
            </span>
          </div>
          <p className="text-2xs text-slate-400">
            EVM indices are recalculated dynamically as editors commit certificates or update monthly progress.
          </p>
        </div>

        {/* CPI Index card */}
        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl flex flex-col justify-between shadow-xs">
          <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
            Cost Performance Index (CPI)
          </span>
          <div className="my-1.5 flex items-baseline gap-2">
            <span className={`text-3xl font-black font-mono ${getIndexColor(CPI)}`}>
              {CPI.toFixed(3)}
            </span>
            <span className="text-slate-400 font-semibold text-[10px] uppercase">
              {CPI >= 1.0 ? 'Under Budget' : 'Overspending'}
            </span>
          </div>
          <p className="text-2xs text-slate-400">
            A value of {CPI.toFixed(2)} signifies that for every Br 1.00 spent, the project earns Br {CPI.toFixed(2)} of progress value.
          </p>
        </div>

        {/* SPI Index card */}
        <div className="p-4 bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl flex flex-col justify-between shadow-xs">
          <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider">
            Schedule Performance Index (SPI)
          </span>
          <div className="my-1.5 flex items-baseline gap-2">
            <span className={`text-3xl font-black font-mono ${getIndexColor(SPI)}`}>
              {SPI.toFixed(3)}
            </span>
            <span className="text-slate-400 font-semibold text-[10px] uppercase">
              {SPI >= 1.0 ? 'Ahead' : 'Delayed'}
            </span>
          </div>
          <p className="text-2xs text-slate-400">
            A value of {SPI.toFixed(2)} tells us construction achievements match {Math.round(SPI * 100)}% of target schedules.
          </p>
        </div>
      </div>

      {/* EVM spreadsheet variables layout */}
      <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700/50 font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-100">
          <Activity className="w-4 h-4 text-blue-500" />
          EVM Metric Computations Table (Birr)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs text-slate-700 dark:text-slate-200">
            <thead>
              <tr className="bg-slate-100/30 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-700 text-slate-400 font-bold">
                <th className="p-2.5">EVM Factor Definition</th>
                <th className="p-2.5 text-center w-16">Acronym</th>
                <th className="p-2.5 text-right w-44">Value (Birr)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-750/30 font-medium">
              <tr>
                <td className="p-2.5">Budget At Completion</td>
                <td className="p-2.5 text-center font-bold">BAC</td>
                <td className="p-2.5 text-right font-mono font-bold">{formatBr(BAC)}</td>
              </tr>
              <tr>
                <td className="p-2.5">Planned Value</td>
                <td className="p-2.5 text-center font-bold">PV</td>
                <td className="p-2.5 text-right font-mono">{formatBr(PV)}</td>
              </tr>
              <tr>
                <td className="p-2.5">Earned Value</td>
                <td className="p-2.5 text-center font-bold">EV</td>
                <td className="p-2.5 text-right font-mono font-bold text-blue-600 dark:text-blue-400">{formatBr(EV)}</td>
              </tr>
              <tr>
                <td className="p-2.5">Actual Cost</td>
                <td className="p-2.5 text-center font-bold">AC</td>
                <td className="p-2.5 text-right font-mono font-semibold">{formatBr(AC)}</td>
              </tr>
              <tr className={CV >= 0 ? 'bg-emerald-500/5 text-emerald-800 dark:text-emerald-400' : 'bg-rose-500/5 text-rose-800 dark:text-rose-400'}>
                <td className="p-2.5">Cost Variance</td>
                <td className="p-2.5 text-center font-bold">CV</td>
                <td className="p-2.5 text-right font-mono font-bold">{formatBr(CV)}</td>
              </tr>
              <tr className={SV >= 0 ? 'bg-emerald-500/5 text-emerald-800 dark:text-emerald-400' : 'bg-rose-500/5 text-rose-800 dark:text-rose-400'}>
                <td className="p-2.5">Schedule Variance</td>
                <td className="p-2.5 text-center font-bold">SV</td>
                <td className="p-2.5 text-right font-mono font-bold">{formatBr(SV)}</td>
              </tr>
              <tr className="bg-slate-50 dark:bg-slate-900/50">
                <td className="p-2.5">Estimate At Completion</td>
                <td className="p-2.5 text-center font-bold">EAC</td>
                <td className="p-2.5 text-right font-mono font-extrabold">{formatBr(EAC)}</td>
              </tr>
              <tr className="bg-slate-50 dark:bg-slate-900/50">
                <td className="p-2.5">Variance At Completion</td>
                <td className="p-2.5 text-center font-bold">VAC</td>
                <td className={`p-2.5 text-right font-mono font-bold ${VAC >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{formatBr(VAC)}</td>
              </tr>
              <tr className="bg-slate-50 dark:bg-slate-900/50">
                <td className="p-2.5">To-Complete Performance Index</td>
                <td className="p-2.5 text-center font-bold">TCPI</td>
                <td className="p-2.5 text-right font-mono font-black text-rose-500">{TCPI.toFixed(3)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Integrated CPM vs. Linear Progress Scheduling Analysis */}
      <CpmLinearComparison project={project} />
    </div>
  );
}
