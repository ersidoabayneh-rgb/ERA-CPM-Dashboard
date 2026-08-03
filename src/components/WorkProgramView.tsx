import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar, Plus, Trash2, Import, Award, Activity } from 'lucide-react';
import { Project, WorkProgramActivity } from '../types';
import { defaultWorkProgram } from '../data/defaultProject';
import CPMChart from './CPMChart';

interface WorkProgramViewProps {
  project: Project;
  onUpdateActivities: (activities: WorkProgramActivity[]) => void;
}

export default function WorkProgramView({ project, onUpdateActivities }: WorkProgramViewProps) {
  const activities = project.workProgram || [];
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const calculateCPMLocal = (acts: WorkProgramActivity[]) => {
    if (acts.length === 0) return;
    const startDate = new Date(project.startDate || new Date());
    
    // Clear previous settings
    acts.forEach(a => {
      a.est = 0;
      a.eft = 0;
      a.lst = 0;
      a.lft = 0;
      a.float = 0;
      a.critical = false;
    });

    // Forward Pass
    acts.forEach(a => {
      const preds = a.predecessors ? a.predecessors.split(',').map(s => s.trim()).filter(s => s) : [];
      if (preds.length === 0) {
        a.est = 0;
      } else {
        let maxEst = 0;
        preds.forEach(pid => {
          const pa = acts.find(x => x.id === pid);
          if (pa) {
            const linkDetail = a.predDetails?.[pid];
            const lag = linkDetail !== undefined ? linkDetail.lag : (a.lag || 0);
            const type = linkDetail !== undefined ? linkDetail.depType : (a.depType || 'FS');
            
            let reqEst = 0;
            if (type === 'FS') {
              reqEst = (pa.eft || 0) + lag;
            } else if (type === 'SS') {
              reqEst = (pa.est || 0) + lag;
            } else if (type === 'FF') {
              reqEst = (pa.eft || 0) + lag - (a.duration || 0);
            } else if (type === 'SF') {
              reqEst = (pa.est || 0) + lag - (a.duration || 0);
            }
            if (reqEst > maxEst) {
              maxEst = reqEst;
            }
          }
        });
        a.est = maxEst;
      }
      a.eft = a.est + (a.duration || 0);
    });

    // Backward Pass
    const lastAct = acts.reduce((max, a) => (a.eft || 0) > ((max ? max.eft : 0) || 0) ? a : max, acts[0]);
    const projectEnd = lastAct ? (lastAct.eft || 0) : 0;

    const tempActs = [...acts].reverse();
    tempActs.forEach(a => {
      // Find successors
      const succs = acts.filter(x => {
        const pList = x.predecessors ? x.predecessors.split(',').map(s => s.trim()) : [];
        return pList.includes(a.id);
      });

      if (succs.length === 0) {
        a.lft = projectEnd;
      } else {
        let minLft = Infinity;
        succs.forEach(s => {
          const linkDetail = s.predDetails?.[a.id];
          const slag = linkDetail !== undefined ? linkDetail.lag : (s.lag || 0);
          const stype = linkDetail !== undefined ? linkDetail.depType : (s.depType || 'FS');
          
          let reqLft = projectEnd;
          if (stype === 'FS') {
            reqLft = (s.lst || 0) - slag;
          } else if (stype === 'SS') {
            reqLft = (s.lst || 0) - slag + (a.duration || 0);
          } else if (stype === 'FF') {
            reqLft = (s.lft || 0) - slag;
          } else if (stype === 'SF') {
            reqLft = (s.lft || 0) - slag + (a.duration || 0);
          }
          if (reqLft < minLft) {
            minLft = reqLft;
          }
        });
        a.lft = minLft === Infinity ? projectEnd : minLft;
      }
      a.lst = a.lft - (a.duration || 0);
    });

    // Compute floats & formatted display dates
    acts.forEach(a => {
      a.float = (a.lst || 0) - (a.est || 0);
      a.critical = Math.abs(a.float) < 0.01;
      
      if (!a.manualStart) {
        const s = new Date(startDate);
        s.setDate(s.getDate() + (a.est || 0));
        a.start = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      if (!a.manualFinish) {
        const f = new Date(startDate);
        f.setDate(f.getDate() + (a.eft || 0));
        a.finish = f.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    });
  };

  const toInputDate = (dateStr?: string): string => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const fromInputDate = (inputVal: string): string => {
    if (!inputVal) return '';
    const d = new Date(inputVal);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleFieldChange = (idx: number, field: keyof WorkProgramActivity, value: any) => {
    const updated = activities.map((a, i) => {
      if (i === idx) {
        const item = { ...a };
        if (field === 'start') {
          item.start = value;
          item.manualStart = true;
          const refDate = new Date(project.startDate || new Date());
          const newDate = new Date(value);
          if (!isNaN(newDate.getTime())) {
            item.est = Math.round((newDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
          }
        } else if (field === 'finish') {
          item.finish = value;
          item.manualFinish = true;
          const refDate = new Date(project.startDate || new Date());
          const newDate = new Date(value);
          if (!isNaN(newDate.getTime())) {
            item.eft = Math.round((newDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
          }
        } else if (field === 'lag') {
          item.lag = parseInt(value, 10);
          if (isNaN(item.lag)) item.lag = 0;
        } else {
          (item as any)[field] = field === 'duration' ? parseInt(value, 10) || 0 : value;
        }
        return item;
      }
      return a;
    });
    calculateCPMLocal(updated);
    onUpdateActivities(updated);
  };

  const handlePredDetailChange = (
    activityIdx: number, 
    predId: string, 
    field: 'depType' | 'lag', 
    value: any
  ) => {
    const updated = activities.map((a, i) => {
      if (i === activityIdx) {
        const item = { ...a };
        const details = { ...(item.predDetails || {}) };
        
        if (!details[predId]) {
          const preds = item.predecessors ? item.predecessors.split(',').map(s => s.trim()).filter(s => s) : [];
          details[predId] = {
            lag: predId === preds[0] ? (item.lag || 0) : 0,
            depType: predId === preds[0] ? (item.depType || 'FS') : 'FS',
          };
        }
        
        if (field === 'lag') {
          const l = parseInt(value, 10);
          details[predId].lag = isNaN(l) ? 0 : l;
        } else if (field === 'depType') {
          details[predId].depType = value;
        }
        
        item.predDetails = details;
        return item;
      }
      return a;
    });
    calculateCPMLocal(updated);
    onUpdateActivities(updated);
  };

  const handleRemovePredecessor = (activityIdx: number, predId: string) => {
    const updated = activities.map((a, i) => {
      if (i === activityIdx) {
        const item = { ...a };
        const preds = item.predecessors
          ? item.predecessors.split(',').map(s => s.trim()).filter(p => p && p !== predId)
          : [];
        item.predecessors = preds.join(', ');
        
        if (item.predDetails && item.predDetails[predId]) {
          const details = { ...item.predDetails };
          delete details[predId];
          item.predDetails = details;
        }
        return item;
      }
      return a;
    });
    calculateCPMLocal(updated);
    onUpdateActivities(updated);
  };

  const preloadSample = () => {
    const samples = defaultWorkProgram();
    calculateCPMLocal(samples);
    onUpdateActivities(samples);
  };

  const handleAddNewActivity = () => {
    const newAct: WorkProgramActivity = {
      id: String.fromCharCode(65 + activities.length), // e.g. A, B, C, D...
      name: 'New Site Activity',
      duration: 10,
      predecessors: activities.length > 0 ? activities[activities.length - 1].id : '',
      lag: 0,
      depType: 'FS'
    };
    const updated = [...activities, newAct];
    calculateCPMLocal(updated);
    onUpdateActivities(updated);
  };

  const handleDeleteActivity = (idx: number) => {
    const updated = activities.filter((_, i) => i !== idx);
    calculateCPMLocal(updated);
    onUpdateActivities(updated);
  };

  const handleCsvImport = () => {
    if (!csvFile) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      if (lines.length < 2) return;
      
      const imported: WorkProgramActivity[] = lines.slice(1).map(l => {
        const cols = l.split(',');
        const rawLag = cols[4]?.trim();
        const rawDepType = cols[5]?.trim()?.toUpperCase();
        return {
          id: cols[0]?.trim() || 'X',
          name: cols[1]?.trim() || 'Unnamed',
          duration: parseInt(cols[2], 10) || 0,
          predecessors: cols[3]?.trim() || '',
          lag: rawLag ? parseInt(rawLag, 10) || 0 : 0,
          depType: (rawDepType === 'SS' || rawDepType === 'FF' || rawDepType === 'SF' || rawDepType === 'FS') ? rawDepType : 'FS'
        };
      });

      calculateCPMLocal(imported);
      onUpdateActivities(imported);
      setCsvFile(null);
    };
    reader.readAsText(csvFile);
  };

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 mb-1 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Critical Path Method (CPM) & Program Work Plan
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define task dependency constraints. Zero-float paths are automatically color-coded with critical paths.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={preloadSample}
            className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-250 text-xs font-bold py-1.5 px-3 rounded-xl transition"
          >
            Load Sample CPM
          </button>
          
          <button
            onClick={handleAddNewActivity}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-3 rounded-xl flex items-center gap-1 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Activity
          </button>
        </div>
      </div>

      {/* CSV importer banner */}
      <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-4 rounded-2xl shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Import className="w-4 h-4 text-emerald-500" />
          <span className="font-semibold">Import CPM Schedule (.csv):</span>
          <span className="text-slate-400 text-[10px]">Format: ID, Name, Duration, Predecessors, Lag, SequenceType</span>
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="file" 
            accept=".csv"
            onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
            className="text-xs text-slate-400 file:bg-slate-100 dark:file:bg-slate-700 file:border-none file:rounded-lg file:px-2.5 file:py-1 file:text-xs file:font-semibold cursor-pointer"
          />
          {csvFile && (
            <button 
              onClick={handleCsvImport}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded-lg text-xs"
            >
              Parse Data
            </button>
          )}
        </div>
      </div>

      {/* CPM Analytics and Interactive Charts */}
      <CPMChart project={project} activities={activities} />

      <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs text-slate-700 dark:text-slate-200">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700/60 text-slate-400 dark:text-slate-500 font-bold">
                <th className="p-3 w-16 text-center">ID</th>
                <th className="p-3">Activity Description</th>
                <th className="p-3 w-28 text-center">Duration (days)</th>
                <th className="p-3 w-32 text-center">Predecessors</th>
                <th className="p-3 w-40 text-center">Sequence Type</th>
                <th className="p-3 w-24 text-center">Lag (days)</th>
                <th className="p-3 w-28 text-center">Early Start</th>
                <th className="p-3 w-28 text-center">Early Finish</th>
                <th className="p-3 w-20 text-center">Float (days)</th>
                <th className="p-3 w-32 text-center">CPM Status</th>
                <th className="p-3 w-12 text-center">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150 dark:divide-slate-700/40">
              {activities.map((item, idx) => {
                const predsList = item.predecessors ? item.predecessors.split(',').map(s => s.trim()).filter(s => s) : [];
                return (
                  <React.Fragment key={idx}>
                    <tr 
                      className={`transition-colors duration-150 ${
                        item.critical 
                          ? 'bg-rose-500/5 hover:bg-rose-500/10' 
                          : (item.float !== undefined && item?.float > 0 && item?.float < 15 
                              ? 'bg-amber-500/5 hover:bg-amber-500/10' 
                              : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/10')
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="text"
                          value={item.id}
                          onChange={(e) => handleFieldChange(idx, 'id', e.target.value)}
                          className="w-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold font-mono text-xs rounded-lg py-0.5 outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="p-3">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => handleFieldChange(idx, 'name', e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs px-2 py-0.5 rounded-lg font-medium outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          value={item.duration}
                          onChange={(e) => handleFieldChange(idx, 'duration', e.target.value)}
                          className="w-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold px-1.5 py-0.5 rounded-lg outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="text"
                          placeholder="e.g. A,B"
                          value={item.predecessors}
                          onChange={(e) => handleFieldChange(idx, 'predecessors', e.target.value)}
                          className="w-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold font-mono text-xs py-0.5 rounded-lg outline-none focus:border-blue-500"
                        />
                      </td>
                      <td className="p-3">
                        <select
                          value={item.depType || 'FS'}
                          onChange={(e) => handleFieldChange(idx, 'depType', e.target.value)}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs px-1.5 py-1 rounded-lg font-medium shadow-xs outline-none focus:border-blue-500"
                          disabled={predsList.length > 1}
                          title={predsList.length > 1 ? "Configure sequence type below for each predecessor individually" : ""}
                        >
                          <option value="FS">Finish-to-Start (FS)</option>
                          <option value="SS">Start-to-Start (SS)</option>
                          <option value="FF">Finish-to-Finish (FF)</option>
                          <option value="SF">Start-to-Finish (SF)</option>
                        </select>
                      </td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          value={item.lag !== undefined ? item.lag : 0}
                          onChange={(e) => handleFieldChange(idx, 'lag', e.target.value)}
                          className="w-16 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold font-mono text-xs px-1 py-0.5 rounded-lg outline-none focus:border-blue-500"
                          min="0"
                          disabled={predsList.length > 1}
                          title={predsList.length > 1 ? "Configure lag below for each predecessor individually" : ""}
                        />
                      </td>
                      <td className="p-3 text-center font-mono text-[10px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-slate-800 dark:text-zinc-200 font-bold">{item.start || '-'}</span>
                          <input
                            type="date"
                            value={toInputDate(item.start)}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                handleFieldChange(idx, 'start', fromInputDate(val));
                              }
                            }}
                            className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-slate-700 rounded-lg px-1 py-0.5 text-[10px] hover:border-blue-500 font-mono outline-none cursor-pointer w-24 text-center"
                            title="Pick early start date using calendar picker"
                          />
                        </div>
                      </td>
                      <td className="p-3 text-center font-mono text-[10px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-slate-800 dark:text-zinc-200 font-bold">{item.finish || '-'}</span>
                          <input
                            type="date"
                            value={toInputDate(item.finish)}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val) {
                                handleFieldChange(idx, 'finish', fromInputDate(val));
                              }
                            }}
                            className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-slate-700 rounded-lg px-1 py-0.5 text-[10px] hover:border-blue-500 font-mono outline-none cursor-pointer w-24 text-center"
                            title="Pick early finish date using calendar picker"
                          />
                        </div>
                      </td>
                      <td className="p-3 text-center font-mono font-black">
                        <span className={item.critical ? 'text-rose-500' : (item.float !== undefined && item.float < 15 ? 'text-amber-500' : 'text-slate-400')}>
                          {item.float} d
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {item.critical ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25 px-2 py-0.5 rounded-lg animate-pulse">
                            <Activity className="w-3 h-3" />
                            CRITICAL PATH
                          </span>
                        ) : (
                          <span className={`inline-block text-[9px] font-bold px-2 py-0.5 rounded-lg ${
                            item.float !== undefined && item.float < 15 
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400' 
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-750 dark:text-slate-400'
                          }`}>
                            {item.float !== undefined && item.float < 15 ? 'Near-Critical' : 'Subcritical'}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleDeleteActivity(idx)}
                          className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-550 rounded-lg transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>

                    {/* Expandable detailed links for multiple predecessor settings */}
                    {predsList.length > 1 && predsList.map(pid => {
                      const pa = activities.find(x => x.id === pid);
                      if (!pa) return null;

                      const linkDetail = item.predDetails?.[pid] || {
                        lag: pid === predsList[0] ? (item.lag || 0) : 0,
                        depType: pid === predsList[0] ? (item.depType || 'FS') : 'FS'
                      };

                      // Calculate timing specifically for this single predecessor relationship/interlink Path
                      let calculatedStart = '-';
                      let calculatedFinish = '-';
                      const refDate = new Date(project.startDate || new Date());
                      let relEst = 0;
                      if (linkDetail.depType === 'FS') {
                        relEst = (pa.eft || 0) + linkDetail.lag;
                      } else if (linkDetail.depType === 'SS') {
                        relEst = (pa.est || 0) + linkDetail.lag;
                      } else if (linkDetail.depType === 'FF') {
                        relEst = (pa.eft || 0) + linkDetail.lag - (item.duration || 0);
                      } else if (linkDetail.depType === 'SF') {
                        relEst = (pa.est || 0) + linkDetail.lag - (item.duration || 0);
                      }
                      
                      const s = new Date(refDate);
                      s.setDate(s.getDate() + relEst);
                      calculatedStart = s.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      
                      const relEft = relEst + (item.duration || 0);
                      const f = new Date(refDate);
                      f.setDate(f.getDate() + relEft);
                      calculatedFinish = f.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

                      const isLinkOnCriticalPath = item.critical && pa.critical && (item.est === relEst);

                      return (
                        <tr 
                          key={`${idx}-pred-${pid}`}
                          className="bg-slate-50/50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-750 text-[11px] no-print"
                        >
                          <td className="p-2 text-center text-slate-400 font-bold select-none">↳</td>
                          <td className="p-2 text-slate-500 dark:text-slate-450 font-medium italic">
                            Predecessor Link: <strong className="font-bold text-slate-700 dark:text-zinc-300">({pa.id}) {pa.name}</strong>
                          </td>
                          <td className="p-2 text-center text-slate-400 font-mono text-[10px]">
                            {pa.duration} days (dur)
                          </td>
                          <td className="p-2 text-center text-slate-400 font-bold select-none">-</td>
                          <td className="p-2">
                            <select
                              value={linkDetail.depType || 'FS'}
                              onChange={(e) => handlePredDetailChange(idx, pid, 'depType', e.target.value as any)}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] px-1.5 py-0.5 rounded-md font-medium outline-none focus:border-blue-500 shadow-xs"
                            >
                              <option value="FS">Finish-to-Start (FS)</option>
                              <option value="SS">Start-to-Start (SS)</option>
                              <option value="FF">Finish-to-Finish (FF)</option>
                              <option value="SF">Start-to-Finish (SF)</option>
                            </select>
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              value={linkDetail.lag}
                              onChange={(e) => handlePredDetailChange(idx, pid, 'lag', e.target.value)}
                              className="w-14 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold px-1 py-0.5 rounded-md text-[10px] outline-none focus:border-blue-500"
                              min="0"
                            />
                          </td>
                          <td className="p-2 text-center font-mono text-[10px] text-slate-500 dark:text-zinc-400">
                            {calculatedStart}
                          </td>
                          <td className="p-2 text-center font-mono text-[10px] text-slate-500 dark:text-zinc-400">
                            {calculatedFinish}
                          </td>
                          <td className="p-2 text-center font-mono font-bold text-slate-450 dark:text-zinc-500">
                            {pa.float} d
                          </td>
                          <td className="p-2 text-center">
                            {isLinkOnCriticalPath ? (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase bg-rose-500/10 text-rose-600 dark:text-rose-450 px-1 py-0.2 rounded-md">
                                Critical link
                              </span>
                            ) : (
                              <span className={`inline-block text-[8px] font-bold px-1 py-0.2 rounded-md ${
                                pa.float !== undefined && pa.float < 15 
                                  ? 'bg-amber-100/70 text-amber-800 dark:bg-amber-950/20 dark:text-amber-450' 
                                  : 'bg-slate-100/70 text-slate-550 dark:bg-slate-750 dark:text-slate-450'
                              }`}>
                                {pa.float !== undefined && pa.float < 15 ? 'Near-critical' : 'Subcritical'}
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-center">
                            <button
                              onClick={() => handleRemovePredecessor(idx, pid)}
                              className="p-1 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-550 rounded-lg transition"
                              title={`Remove link to predecessor ${pid}`}
                            >
                              <Trash2 className="w-3.5 h-3.5 text-slate-400 hover:text-red-500 pointer-events-auto" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
