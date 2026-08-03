import React from 'react';
import { motion } from 'motion/react';
import { ShieldAlert, CheckCircle, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { Project, BondGuarantee, formatAccounting } from '../types';

interface BondsGuaranteeViewProps {
  project: Project;
  onUpdateBonds: (bonds: BondGuarantee[]) => void;
}

export default function BondsGuaranteeView({ project, onUpdateBonds }: BondsGuaranteeViewProps) {
  const bonds = project.bonds || [];

  const handleFieldChange = (idx: number, field: keyof BondGuarantee, value: any) => {
    const updated = bonds.map((b, i) => {
      if (i === idx) {
        const key = field;
        const processedValue = (key === 'amount' || key === 'amountUsd') ? (parseFloat(value) || 0) : value;
        const item = { ...b, [key]: processedValue };
        
        // Auto convert to Expired if expire date is in the past
        if (field === 'expireDate' && value) {
          const exp = new Date(value);
          const now = new Date();
          if (exp < now) {
            item.status = 'Expired';
          } else if (item.status === 'Expired') {
            item.status = 'Valid';
          }
        }
        return item;
      }
      return b;
    });
    onUpdateBonds(updated);
  };

  const handleAddField = () => {
    const newBond: BondGuarantee = {
      sno: bonds.length + 1,
      type: 'New Escrow Guarantee Bond',
      bank: 'Ethiopian Commercial Bank',
      amount: 0,
      amountUsd: 0,
      issueDate: new Date().toISOString().split('T')[0],
      expireDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      status: 'Valid'
    };
    onUpdateBonds([...bonds, newBond]);
  };

  const formatMoney = (v: number) => 
    formatAccounting(v, '');

  const checkStatus = (b: BondGuarantee) => {
    if (b.status === 'Recovered') return { text: 'Fully Amortized', class: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-200' };
    if (b.status === 'N/A') return { text: 'N/A', class: 'bg-slate-100 text-slate-600 dark:bg-slate-800' };
    
    const now = new Date();
    const exp = new Date(b.expireDate);
    
    if (b.status === 'Expired' || exp < now) {
      return { text: 'Expired', class: 'bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400 border-rose-300 animate-pulse' };
    }
    
    const fortyFiveDays = 45 * 86450000;
    if (exp.getTime() - now.getTime() < fortyFiveDays) {
      return { text: 'Expiring Soon', class: 'bg-amber-50 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400 border-amber-300 font-bold' };
    }

    return { text: 'Active & Valid', class: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20' };
  };

  return (
    <div className="space-y-4">
      {/* Header element */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-blue-500" />
            Bonds & Performance Guarantees List
          </h2>
        </div>

        <button
          onClick={handleAddField}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1 transition shadow-sm self-start md:self-auto"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Guarantee
        </button>
      </div>

      {bonds.map((b, idx) => {
        const flag = checkStatus(b);
        const expDate = new Date(b.expireDate);
        const isExpiring = flag.text === 'Expiring Soon';

        return (
          <div 
            key={idx} 
            className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-4 rounded-xl shadow-xs grid grid-cols-1 md:grid-cols-12 gap-4 items-center"
          >
            {/* Left Category */}
            <div className="md:col-span-3 space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 font-mono">
                  SNo. {b.sno}
                </span>
                <span className={`text-[10px] font-extrabold uppercase border px-2 py-0.5 rounded-lg ${flag.class}`}>
                  {flag.text}
                </span>
              </div>
              <input
                type="text"
                value={b.type}
                onChange={(e) => handleFieldChange(idx, 'type', e.target.value)}
                className="text-sm font-black text-slate-800 dark:text-slate-100 bg-transparent border-none w-full outline-none focus:bg-slate-50"
              />
            </div>

            {/* Editing elements */}
            <div className="grid grid-cols-4 gap-2 md:col-span-7 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-medium font-mono uppercase">Bank</label>
                <input
                  type="text"
                  value={b.bank}
                  onChange={(e) => handleFieldChange(idx, 'bank', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 py-1 px-2 rounded-lg font-semibold text-slate-700 dark:text-slate-300"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-medium font-mono uppercase">ETB</label>
                <input
                  type="text"
                  value={formatMoney(b.amount)}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                    handleFieldChange(idx, 'amount', val);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 py-1 px-2 rounded-lg font-mono font-bold text-blue-600 dark:text-blue-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-medium font-mono uppercase">USD</label>
                <input
                  type="text"
                  value={formatMoney(b.amountUsd || 0)}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value.replace(/,/g, '')) || 0;
                    handleFieldChange(idx, 'amountUsd', val);
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 py-1 px-2 rounded-lg font-mono font-bold text-teal-600 dark:text-teal-400"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-medium font-mono uppercase">Expire date</label>
                <input
                  type="date"
                  value={b.expireDate}
                  onChange={(e) => handleFieldChange(idx, 'expireDate', e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 py-1 px-2 rounded-lg font-mono text-[10px] font-semibold text-center"
                />
              </div>
            </div>

            {/* Actions / Status badges */}
            <div className="md:col-span-2 flex items-center justify-between gap-2 border-t md:border-t-0 pt-2 md:pt-0">
              <div className="space-y-0.5 text-xs text-left">
                <p className="text-[10px] text-slate-400 font-mono">Status Selection</p>
                <select
                  value={b.status}
                  onChange={(e) => handleFieldChange(idx, 'status', e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-lg font-bold text-xs"
                >
                  <option value="Valid">Valid</option>
                  <option value="Recovered">Recovered / Returned</option>
                  <option value="Expired">Expired</option>
                  <option value="N/A">N/A</option>
                </select>
              </div>

              <button
                onClick={() => onUpdateBonds(bonds.filter((_, i) => i !== idx))}
                className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition"
                title="Delete Bond"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            {/* Notice panel for warning */}
            {isExpiring && (
              <div className="col-span-1 md:col-span-12 bg-amber-500/10 dark:bg-amber-500/5 text-amber-700 dark:text-amber-400 p-2 rounded-lg text-2xs flex items-center gap-1.5 border border-amber-500/10 mt-1 font-bold">
                <AlertTriangle className="w-3.5 h-3.5" />
                DANGER: This security guarantee is expiring within 45 days. Contact the financial institution to initiate amassment or extend validity.
              </div>
            )}
          </div>
        );
      })}

      {bonds.length === 0 && (
        <div className="text-center py-8 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-705 p-6 text-xs text-slate-400">
          No bank guarantees loaded.
        </div>
      )}
    </div>
  );
}
