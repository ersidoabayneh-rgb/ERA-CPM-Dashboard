import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Database, Plus, Trash2, ArrowUpRight, Calculator, Coins, Milestone, Shield, BarChart2, DollarSign } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Project, SeriesItem, IpcItem, PaymentItem, AnnualItem, formatAccounting } from '../types';
import { MILLION } from '../data/defaultProject';
import MonthlyPaymentIpcSummaryTable from './MonthlyPaymentIpcSummaryTable';

interface AmountInputProps {
  value: number;
  onChange: (v: number) => void;
  readOnly?: boolean;
  className?: string;
}

function AmountInput({ value, onChange, readOnly = false, className = '' }: AmountInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [localVal, setLocalVal] = useState('');

  const numVal = typeof value === 'number' ? value : parseFloat(value as any) || 0;

  useEffect(() => {
    if (!isFocused) {
      setLocalVal(numVal === 0 ? '' : numVal.toFixed(2));
    }
  }, [numVal, isFocused]);

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseFloat(localVal);
    onChange(isNaN(parsed) ? 0 : Number(parsed.toFixed(2)));
  };

  const handleFocus = () => {
    if (readOnly) return;
    setIsFocused(true);
    setLocalVal(numVal === 0 ? '' : numVal.toFixed(2));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalVal(e.target.value);
    const parsed = parseFloat(e.target.value);
    onChange(isNaN(parsed) ? 0 : parsed);
  };

  if (!isFocused) {
    const formatMoney = (v: number) => formatAccounting(v, '');
    return (
      <input
        type="text"
        value={numVal === 0 ? '-' : formatMoney(numVal)}
        onFocus={handleFocus}
        readOnly
        className={`${className} cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-900/30 rounded px-1 transition-all outline-none`}
      />
    );
  }

  return (
    <input
      type="number"
      step="0.01"
      autoFocus
      value={localVal}
      onChange={handleChange}
      onBlur={handleBlur}
      className={`${className} focus:ring-1 focus:ring-emerald-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/60 rounded px-1 py-0.5 outline-none`}
    />
  );
}

interface SeriesEditorViewProps {
  project: Project;
  onUpdateSeries: (series: SeriesItem[], provisionalSum?: number) => void;
  onProjectUpdate?: (updates: Partial<Project>, desc: string) => void;
  onUpdateFinance?: (payment: PaymentItem[], annual: AnnualItem[], ipcTracker?: IpcItem[], usdExchangeRate?: number) => void;
}

export default function SeriesEditorView({ project, onUpdateSeries, onProjectUpdate, onUpdateFinance }: SeriesEditorViewProps) {
  const isDB = project.contractType === 'DB';
  const series = project.series;

  const handleFieldChange = (idx: number, field: keyof SeriesItem, value: any) => {
    const updated = series.map((s, i) => {
      if (i === idx) {
        const item = { ...s, [field]: value };
        // recalculate progress as percentage
        if (field === 'contractAmt' || field === 'execAmt') {
          const ca = field === 'contractAmt' ? value : (s.contractAmt || 0);
          const ea = field === 'execAmt' ? value : (s.execAmt || 0);
          item.progress = ca > 0 ? (ea / ca) * 100 : 0;
        }
        return item;
      }
      return s;
    });
    onUpdateSeries(updated);
  };

  const handleProvisionalSumChange = (val: number) => {
    onUpdateSeries([...series], val);
  };

  const handleAddNewItem = () => {
    const code = isDB ? `S${series.length + 1}` : `${(series.length + 1) * 1000}`;
    const newItem: SeriesItem = {
      code,
      desc: 'New Division Work Item',
      contractAmt: 0,
      execAmt: 0,
      progress: 0,
      contractPct: isDB ? 0 : undefined
    };
    onUpdateSeries([...series, newItem]);
  };

  const handleDeleteItem = (idx: number) => {
    const updated = series.filter((_, i) => i !== idx);
    onUpdateSeries(updated);
  };

  const formatMoney = (v: number) => 
    formatAccounting(v, '');

  // Calculate local cumulative variables
  const tc = series.reduce((s, it) => s + (it.contractAmt || 0), 0);
  const te = series.reduce((s, it) => s + (it.execAmt || 0), 0);
  const ps = project.provisionalSum || 0;
  
  // Formulas
  let vat = 0;
  let er = 0;
  let gt = 0;

  let c_sub = 0;
  let cont = 0;
  let ge = 0;

  if (isDB) {
    er = tc;
    vat = er * 0.15;
    gt = er + vat;
    ge = te + te * 0.15;
  } else {
    c_sub = tc - ps;
    cont = c_sub * 0.10;
    er = tc + cont;
    vat = er * 0.15;
    gt = er + vat;
    ge = te * 1.15; // executed is factored including contingencies
  }

  // Finance and Payment Certificate Data States & Functions
  const rawPayment = project.payment || [];
  const annual = project.annual || [];
  const ipcTracker = project.ipcTracker || [];
  const exchangeRate = project.usdExchangeRate !== undefined ? project.usdExchangeRate : 57.50;

  const triggerFinanceUpdate = (
    payList: PaymentItem[], 
    annList: AnnualItem[], 
    tracker: IpcItem[] = ipcTracker, 
    rate: number = exchangeRate
  ) => {
    if (onProjectUpdate) {
      onProjectUpdate({ payment: payList, annual: annList, ipcTracker: tracker, usdExchangeRate: rate }, 'Financial schedules Updated');
    } else if (onUpdateFinance) {
      onUpdateFinance(payList, annList, tracker, rate);
    }
  };

  const syncPaymentsWithTe = (paymentList: PaymentItem[], tracker: IpcItem[] = ipcTracker, rate: number = exchangeRate) => {
    let hasBillSummary = paymentList.some(p => p.item.trim().toLowerCase() === 'total todate bill summary');
    let hasCertifiedIpc = paymentList.some(p => p.item.trim().toLowerCase() === 'total todate certified ipc');
    let hasRemaining = paymentList.some(p => p.item.trim().toLowerCase() === 'remaining');
    let hasPriceAdj = paymentList.some(p => p.item.trim().toLowerCase().includes('price adjustment'));
    let hasAdvanceRepayment = paymentList.some(p => p.item.trim().toLowerCase().includes('advance repayment'));
    let hasRetentionMoney = paymentList.some(p => p.item.trim().toLowerCase().includes('retention money'));
    let updatedPayment = [...paymentList];

    const origContractETB = (project.origAmount || 0) * 1_000_000 || tc;

    const sumIpcs = tracker.reduce((sum, item) => {
      const totalAmountEtb = (item.certifiedEtb || 0) + (rate * (item.certifiedUsd || 0));
      return sum + totalAmountEtb;
    }, 0);

    const cumBillSummary = tracker.reduce((sum, item) => {
      const totalGrossEtb = (item.grossBillEtb || 0) + (rate * (item.grossBillUsd || 0));
      return sum + totalGrossEtb;
    }, 0);

    const cumPriceAdj = tracker.reduce((sum, item) => {
      const totalPaEtb = (item.priceAdjustmentEtb || 0) + (rate * (item.priceAdjustmentUsd || 0));
      return sum + totalPaEtb;
    }, 0);

    const cumAdvanceRepayment = tracker.reduce((sum, item) => sum + (item.advanceRepaymentEtb || 0), 0);
    const cumRetention = tracker.reduce((sum, item) => sum + (item.retentionEtb || 0), 0);

    if (!hasBillSummary) {
      updatedPayment.push({ item: 'Total Todate Bill Summary', amount: te, percent: 0 });
    }
    if (!hasCertifiedIpc) {
      updatedPayment.push({ item: 'Total Todate Certified IPC', amount: 0, percent: 0 });
    }
    if (!hasRemaining) {
      updatedPayment.push({ item: 'Remaining', amount: Math.max(0, origContractETB - cumBillSummary), percent: 0 });
    }
    if (!hasPriceAdj) {
      updatedPayment.push({ item: 'Price Adjustment', amount: 0, percent: 0 });
    }
    if (!hasAdvanceRepayment) {
      updatedPayment.push({ item: 'Advance Repayment', amount: 0, percent: 0 });
    }
    if (!hasRetentionMoney) {
      updatedPayment.push({ item: 'Retention Money', amount: 0, percent: 0 });
    }

    return updatedPayment.map(p => {
      const itemLower = p.item.trim().toLowerCase();
      if (itemLower === 'total todate bill summary') {
        return {
          ...p,
          item: 'Total Todate Bill Summary',
          amount: cumBillSummary,
          percent: getCalculatedPercent(p.item, cumBillSummary, rate)
        };
      }
      if (itemLower === 'total todate certified ipc') {
        return {
          ...p,
          item: 'Total Todate Certified IPC',
          amount: sumIpcs,
          percent: getCalculatedPercent(p.item, sumIpcs, rate)
        };
      }
      if (itemLower === 'remaining') {
        const remAmt = Math.max(0, origContractETB - cumBillSummary);
        return {
          ...p,
          item: 'Remaining',
          amount: remAmt,
          percent: origContractETB > 0 ? (remAmt / origContractETB) * 100 : 0
        };
      }
      if (itemLower.includes('price adjustment')) {
        return {
          ...p,
          amount: cumPriceAdj,
          percent: getCalculatedPercent(p.item, cumPriceAdj, rate)
        };
      }
      if (itemLower.includes('advance repayment')) {
        return {
          ...p,
          amount: cumAdvanceRepayment,
          percent: getCalculatedPercent(p.item, cumAdvanceRepayment, rate)
        };
      }
      if (itemLower.includes('retention money')) {
        return {
          ...p,
          amount: cumRetention,
          percent: getCalculatedPercent(p.item, cumRetention, rate)
        };
      }
      return {
        ...p,
        percent: getCalculatedPercent(p.item, p.amount, rate)
      };
    });
  };

  const getCalculatedPercent = (itemDesc: string, amount: number, rate: number = exchangeRate) => {
    const provisionalSum = project.provisionalSum || 0;
    
    const dayworksItem = series.find(s => 
      s.code === '11000' || 
      s.desc.toLowerCase().includes('day work') || 
      s.desc.toLowerCase().includes('dayworks')
    );
    const dayworksAmt = dayworksItem ? (dayworksItem.contractAmt || 0) : 0;

    const lowerDesc = itemDesc.toLowerCase();
    
    if (lowerDesc.trim() === 'total todate bill summary' || lowerDesc.includes('bill summary')) {
      const orig = (project.origAmount || 0) * 1_000_000 || tc;
      return orig > 0 ? (amount / orig) * 100 : 0;
    }
    if (lowerDesc.trim() === 'remaining') {
      const orig = (project.origAmount || 0) * 1_000_000 || tc;
      return orig > 0 ? (amount / orig) * 100 : 0;
    }

    const isAdvancePay = lowerDesc.includes('advance payment');
    const isAdvanceRepay = lowerDesc.includes('repayment') || lowerDesc.includes('repay') || lowerDesc.includes('amortization');

    if (isAdvancePay || isAdvanceRepay) {
      if (!isDB) {
        const denominator = tc - provisionalSum - dayworksAmt;
        if (denominator > 0) {
          return (amount / denominator) * 100;
        }
      } else {
        const baseAmount = ((project.origAmount || 1) * 1_000_000) / 1.15;
        if (baseAmount > 0) {
          return (amount / baseAmount) * 100;
        }
      }
    }

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
      const originalMinusVat = origVal / 1.15;
      if (originalMinusVat > 0) {
        return (amount / originalMinusVat) * 100;
      }
    }

    const orig = (project.origAmount || 1) * 1_000_000;
    return orig > 0 ? (amount / orig) * 100 : 0;
  };

  const payment = syncPaymentsWithTe(rawPayment, ipcTracker, exchangeRate);

  const handlePaymentFieldChange = (idx: number, field: keyof PaymentItem, value: any) => {
    const draftPay = payment.map((p, i) => {
      if (i === idx) {
        return {
          ...p,
          [field]: field === 'amount' ? (parseFloat(value) || 0) : value
        };
      }
      return p;
    });
    const draftPayWithTe = syncPaymentsWithTe(draftPay, ipcTracker, exchangeRate);
    triggerFinanceUpdate(draftPayWithTe, annual, ipcTracker);
  };

  const handleAnnualFieldChange = (idx: number, field: keyof AnnualItem, value: any) => {
    const updatedAnn = annual.map((a, i) => {
      if (i === idx) {
        const item = { ...a, [field]: field === 'year' ? (parseInt(value, 10) || 0) : (parseFloat(value) || 0) };
        const orig = (project.origAmount || 1) * 1_000_000;
        if (field === 'amount') {
          item.percent = orig > 0 ? (item.amount / orig) * 100 : 0;
        }
        return item;
      }
      return a;
    });
    triggerFinanceUpdate(payment, updatedAnn, ipcTracker);
  };

  const handleAddPaymentRow = () => {
    const updated = [...payment, { item: 'New Payment Milestone Description', amount: 0, percent: 0 }];
    const updatedPay = syncPaymentsWithTe(updated, ipcTracker, exchangeRate);
    triggerFinanceUpdate(updatedPay, annual, ipcTracker);
  };

  const handleAddAnnualRow = () => {
    const nextYear = annual.length > 0 ? annual[annual.length - 1].year + 1 : new Date().getFullYear();
    const updated = [...annual, { year: nextYear, amount: 0, percent: 0 }];
    triggerFinanceUpdate(payment, updated, ipcTracker);
  };

  const handleIpcTrackerUpdate = (updatedTracker: IpcItem[], newRate?: number) => {
    const rateToUse = newRate !== undefined ? newRate : exchangeRate;
    const updatedPay = syncPaymentsWithTe(payment, updatedTracker, rateToUse);
    triggerFinanceUpdate(updatedPay, annual, updatedTracker, rateToUse);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm flex justify-between items-center flex-wrap gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 mb-1 flex items-center gap-2">
            <Database className="w-5 h-5 text-blue-500" />
            Division Work Quantities & Financial Data
          </h2>
        </div>
        <button
          onClick={handleAddNewItem}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1 transition shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Item Code
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs text-slate-700 dark:text-slate-200">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/60 text-slate-400 dark:text-slate-500 font-bold">
                <th className="p-3 w-16 text-center">Code</th>
                <th className="p-3">Work Item Division Description</th>
                {isDB && <th className="p-3 w-20 text-center">Contract %</th>}
                <th className="p-3 w-36 text-right">Contract Sum (Birr)</th>
                <th className="p-3 w-36 text-right">To-Date Executed (Birr)</th>
                <th className="p-3 w-24 text-center">Progress %</th>
                <th className="p-3 w-12 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/40">
              {series.map((item, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 border-b border-slate-100 dark:border-slate-800">
                  <td className="p-3 text-center font-bold">
                    {isDB ? (
                      <input
                        type="text"
                        value={item.code}
                        onChange={(e) => handleFieldChange(idx, 'code', e.target.value)}
                        className="w-14 bg-slate-50 dark:bg-slate-900/60 border border-slate-350 dark:border-slate-755 text-center font-mono font-bold text-xs px-1 py-1 rounded-lg outline-none focus:border-blue-500 dark:focus:border-blue-450 focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-950 transition-all duration-150 h-7 text-slate-850 dark:text-zinc-50"
                      />
                    ) : (
                      <span className="text-slate-400 font-mono">{item.code}</span>
                    )}
                  </td>
                  <td className="p-3">
                    <input
                      type="text"
                      value={item.desc}
                      onChange={(e) => handleFieldChange(idx, 'desc', e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-350 dark:border-slate-755 text-xs text-slate-850 dark:text-zinc-50 px-2.5 py-1 rounded-lg outline-none focus:border-blue-500 dark:focus:border-blue-450 focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-950 transition-all duration-150 h-7"
                    />
                  </td>
                  {isDB && (
                    <td className="p-3">
                      <input
                        type="number"
                        step="0.1"
                        value={item.contractPct || 0}
                        onChange={(e) => handleFieldChange(idx, 'contractPct', parseFloat(e.target.value) || 0)}
                        className="w-16 bg-slate-50 dark:bg-slate-900/60 border border-slate-350 dark:border-slate-755 text-center font-mono font-bold text-xs px-1.5 py-1 rounded-lg outline-none focus:border-blue-500 dark:focus:border-blue-450 focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-950 transition-all duration-150 h-7 text-slate-850 dark:text-zinc-50"
                      />
                    </td>
                  )}
                  <td className="p-3">
                    <input
                      type="text"
                      value={formatMoney(item.contractAmt)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                        handleFieldChange(idx, 'contractAmt', val);
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-350 dark:border-slate-755 text-right font-mono font-black text-xs px-2.5 py-1 rounded-lg outline-none focus:border-blue-500 dark:focus:border-blue-450 focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-950 transition-all duration-150 h-7 text-slate-850 dark:text-zinc-50"
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="text"
                      value={formatMoney(item.execAmt)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                        handleFieldChange(idx, 'execAmt', val);
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-350 dark:border-slate-755 text-right font-mono font-black text-xs px-2.5 py-1 rounded-lg outline-none focus:border-blue-500 dark:focus:border-blue-450 focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-950 transition-all duration-150 h-7 text-emerald-600 dark:text-emerald-400"
                    />
                  </td>
                  <td className="p-3 text-center font-mono font-extrabold text-blue-600 dark:text-blue-400">
                    {item.progress.toFixed(2)}%
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleDeleteItem(idx)}
                      className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-500 rounded-lg transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              {/* Aggregation Computations rows */}
              {!isDB ? (
                <>
                  <tr className="bg-slate-50/40 dark:bg-slate-900/5 font-semibold">
                    <td colSpan={2} className="p-3 text-right text-slate-400 uppercase tracking-wide">A - Total Series Item sum:</td>
                    <td className="p-3 text-right font-mono">{formatMoney(tc)}</td>
                    <td className="p-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{formatMoney(te)}</td>
                    <td className="p-3 text-center font-mono font-black">{(tc > 0 ? (te / tc) * 100 : 0).toFixed(2)}%</td>
                    <td></td>
                  </tr>
                  <tr className="bg-slate-50/40 dark:bg-slate-900/5 font-semibold">
                    <td colSpan={2} className="p-3 text-right text-slate-400 uppercase tracking-wide">B - Provisional Sum deduction:</td>
                    <td className="p-3 text-right">
                      <input
                        type="text"
                        value={formatMoney(ps)}
                        onChange={(e) => handleProvisionalSumChange(parseFloat(e.target.value.replace(/,/g, '')) || 0)}
                        className="w-full bg-slate-50 dark:bg-slate-900/60 border border-slate-350 dark:border-slate-755 text-right font-mono font-black text-xs px-2.5 py-1 rounded-lg outline-none focus:border-blue-500 dark:focus:border-blue-450 focus:ring-2 focus:ring-blue-500/20 focus:bg-white dark:focus:bg-slate-950 transition-all duration-150 h-7 text-slate-850 dark:text-zinc-50"
                      />
                    </td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                  <tr className="bg-slate-50/40 dark:bg-slate-900/5 font-medium text-slate-500 dark:text-slate-400">
                    <td colSpan={2} className="p-3 text-right uppercase tracking-wide">C = A - B base amount:</td>
                    <td className="p-3 text-right font-mono">{formatMoney(c_sub)}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                  <tr className="bg-slate-50/40 dark:bg-slate-900/5 font-medium text-slate-500 dark:text-slate-400">
                    <td colSpan={2} className="p-3 text-right uppercase tracking-wide">D = C * 10% Contingency addition:</td>
                    <td className="p-3 text-right font-mono">{formatMoney(cont)}</td>
                    <td></td>
                    <td></td>
                    <td></td>
                  </tr>
                  <tr className="bg-slate-100/50 dark:bg-slate-900/20 font-bold text-blue-700 dark:text-blue-400">
                    <td colSpan={2} className="p-3 text-right uppercase tracking-wide">E = D + A (Sum Sub Total):</td>
                    <td className="p-3 text-right font-mono">{formatMoney(er)}</td>
                    <td className="p-3 text-right font-mono">{formatMoney(te)}</td>
                    <td className="p-3 text-center">{(er > 0 ? (te / er) * 100 : 0).toFixed(2)}%</td>
                    <td></td>
                  </tr>
                  <tr className="bg-slate-50/40 dark:bg-slate-900/5 font-medium text-slate-500 dark:text-slate-400">
                    <td colSpan={2} className="p-3 text-right uppercase tracking-wide">F = E * 15% VAT:</td>
                    <td className="p-3 text-right font-mono">{formatMoney(vat)}</td>
                    <td className="p-3 text-right font-mono">{formatMoney(te * 0.15)}</td>
                    <td></td>
                    <td></td>
                  </tr>
                  <tr className="bg-blue-600/10 dark:bg-blue-500/10 font-extrabold text-blue-800 dark:text-blue-300">
                    <td colSpan={2} className="p-3 text-right uppercase tracking-wider text-sm flex items-center justify-end gap-1.5"><Calculator className="w-4 h-4 text-blue-500" /> G = F + E (Grand Original Contract Total):</td>
                    <td className="p-3 text-right font-mono text-sm">{formatMoney(gt)}</td>
                    <td className="p-3 text-right font-mono text-sm">{formatMoney(ge)}</td>
                    <td className="p-3 text-center text-sm font-black">{(gt > 0 ? (ge / gt) * 100 : 0).toFixed(2)}%</td>
                    <td></td>
                  </tr>
                </>
              ) : (
                <>
                  <tr className="bg-slate-100/55 dark:bg-slate-900/20 font-bold">
                    <td colSpan={3} className="p-3 text-right uppercase">E - Original Contract Base:</td>
                    <td className="p-3 text-right font-mono">{formatMoney(er)}</td>
                    <td className="p-3 text-right font-mono">{formatMoney(te)}</td>
                    <td className="p-3 text-center">{(er > 0 ? (te / er) * 100 : 0).toFixed(2)}%</td>
                    <td></td>
                  </tr>
                  <tr className="bg-slate-50/40 dark:bg-slate-900/5 font-medium text-slate-500">
                    <td colSpan={3} className="p-3 text-right uppercase">F = E * 15% VAT:</td>
                    <td className="p-3 text-right font-mono">{formatMoney(vat)}</td>
                    <td className="p-3 text-right font-mono">{formatMoney(te * 0.15)}</td>
                    <td></td>
                    <td></td>
                  </tr>
                  <tr className="bg-blue-600/10 dark:bg-blue-500/10 font-extrabold text-blue-800 dark:text-blue-300">
                    <td colSpan={3} className="p-3 text-right uppercase text-sm flex items-center justify-end gap-1.5"><Calculator className="w-4 h-4 text-blue-400" /> G = F + E (Grand Original Contract Total):</td>
                    <td className="p-3 text-right font-mono text-sm">{formatMoney(gt)}</td>
                    <td className="p-3 text-right font-mono text-sm">{formatMoney(ge)}</td>
                    <td className="p-3 text-center text-sm font-black">{(gt > 0 ? (ge / gt) * 100 : 0).toFixed(2)}%</td>
                    <td></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Certificate Data & Annual Fund Distributions Spreadsheets */}
      <div className="space-y-4">
        <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 mb-1 flex items-center gap-2">
            <Coins className="w-5 h-5 text-blue-500" />
            Payment Certificate Data & Annual Fund Distributions
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Payments list Spreadsheet */}
          <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-4 rounded-2xl shadow-sm space-y-3 flex flex-col justify-between">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2">
              <span className="font-bold text-xs flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                <Milestone className="w-4 h-4 text-emerald-500" />
                Payment Milestones
              </span>
              <button
                onClick={handleAddPaymentRow}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-250 text-2xs font-extrabold px-2.5 py-1 rounded-lg transition"
              >
                + Add Bill Row
              </button>
            </div>

            <div className="overflow-auto min-h-56">
              <table className="w-full text-left border-collapse text-xs text-slate-700 dark:text-slate-200">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 text-slate-400 font-bold">
                    <th className="p-2">Item Description</th>
                    <th className="p-2 text-right">Certified Paid (Birr)</th>
                    <th className="p-2 text-center w-16">%</th>
                    <th className="p-2 w-10 text-center">Del</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-750/30">
                  {payment.map((p, idx) => {
                    const isPriceAdj = p.item.trim().toLowerCase().includes('price adjustment');
                    const isAdvanceRepayment = p.item.trim().toLowerCase().includes('advance repayment');
                    const isRetentionMoney = p.item.trim().toLowerCase().includes('retention money');
                    const isReadonly = p.item === 'Total Todate Bill Summary' || p.item === 'Total Todate Certified IPC' || p.item === 'Remaining' || isPriceAdj || isAdvanceRepayment || isRetentionMoney;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                        <td className="p-2 font-medium">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <input
                              type="text"
                              value={p.item}
                              readOnly={isReadonly}
                              onChange={(e) => handlePaymentFieldChange(idx, 'item', e.target.value)}
                              className={`bg-transparent border-none outline-none ${isReadonly ? 'font-bold text-blue-600 dark:text-blue-400' : ''}`}
                            />
                            {(isPriceAdj || isAdvanceRepayment || isRetentionMoney) && (
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800 shrink-0">
                                Auto-calculated from IPC Ledger
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-right">
                          <AmountInput
                            value={p.amount}
                            readOnly={isReadonly}
                            onChange={(val) => handlePaymentFieldChange(idx, 'amount', val)}
                            className={`bg-transparent text-right font-mono font-bold text-xs border-none w-full outline-none ${
                              isReadonly ? 'text-slate-900 dark:text-white font-extrabold' : 'text-slate-600 dark:text-slate-350'
                            }`}
                          />
                        </td>
                        <td className="p-2 text-center font-mono font-black text-blue-600 dark:text-blue-450 border border-transparent">
                          {(() => {
                            const pct = getCalculatedPercent(p.item, p.amount, exchangeRate);
                            return (typeof pct === 'number' && !isNaN(pct) ? pct : 0).toFixed(2);
                          })()}%
                        </td>
                        <td className="p-2 text-center">
                          {!isReadonly && (
                            <button
                              onClick={() => triggerFinanceUpdate(payment.filter((_, i) => i !== idx), annual, ipcTracker)}
                              className="text-slate-400 hover:text-rose-500 p-0.5 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Annual Payments Spreadsheet */}
          <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-4 rounded-2xl shadow-sm space-y-4 flex flex-col justify-between">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-2">
              <span className="font-bold text-xs flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                <Shield className="w-4 h-4 text-emerald-500" />
                Annual Payout Distribution
              </span>
              <button
                onClick={handleAddAnnualRow}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-250 text-2xs font-extrabold px-2.5 py-1 rounded-lg transition"
              >
                + Add Year Row
              </button>
            </div>

            <div className="bg-slate-50/50 dark:bg-slate-900/35 border border-slate-100 dark:border-slate-800 p-4 rounded-xl space-y-1">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <BarChart2 className="w-3.5 h-3.5" /> Annual Disbursement Schedule
              </span>
            </div>

            <div className="overflow-auto min-h-36">
              <table className="w-full text-left border-collapse text-xs text-slate-700 dark:text-slate-200">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700 text-slate-400 font-bold">
                    <th className="p-2 w-20 text-center">EFY Year</th>
                    <th className="p-2 text-right">Annual Certified (Birr)</th>
                    <th className="p-2 text-center w-16">% of BOQ</th>
                    <th className="p-2 w-10 text-center">Del</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-750/30">
                  {annual.map((a, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                      <td className="p-2 text-center font-bold">
                        <input
                          type="number"
                          value={a.year}
                          onChange={(e) => handleAnnualFieldChange(idx, 'year', e.target.value)}
                          className="w-16 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-center font-mono py-0.5"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <AmountInput
                          value={a.amount}
                          onChange={(val) => handleAnnualFieldChange(idx, 'amount', val)}
                          className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 border-none outline-none font-mono font-bold text-slate-700 dark:text-slate-350 text-right w-full"
                        />
                      </td>
                      <td className="p-2 text-center font-mono font-black text-blue-600">
                        {((a.percent !== undefined && a.percent !== null && !isNaN(Number(a.percent))) ? Number(a.percent) : 0).toFixed(2)}%
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => triggerFinanceUpdate(payment, annual.filter((_, i) => i !== idx), ipcTracker)}
                          className="text-slate-400 hover:text-rose-500 rounded p-0.5"
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
      </div>

      {/* Monthly Payment Bill Summary & Price Adjustment Ledger */}
      <MonthlyPaymentIpcSummaryTable
        project={project}
        onUpdateIpcTracker={handleIpcTrackerUpdate}
        onProjectUpdate={onProjectUpdate}
      />
    </div>
  );
}

