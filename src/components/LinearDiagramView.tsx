import React, { useState } from 'react';
import { Ruler, Navigation, Plus, Trash2, Activity, CheckCircle2, Link2, Calculator } from 'lucide-react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { Project, LinearData } from '../types';
import { parseStation, generateLinearData, generateSpurLinearData } from '../data/defaultProject';

interface LinearDiagramViewProps {
  project: Project;
  onUpdateLinear: (linear: LinearData) => void;
  onUpdateLinearSpur?: (linearSpur: LinearData) => void;
  onUpdateSpurLength?: (spurRoadLengthKm: number) => void;
  onUpdateMainLength?: (mainRoadLengthKm: number) => void;
  onUpdateProjectLength?: (lengthKm: number) => void;
  onToggleCappingLayer?: (hasCappingLayer: boolean) => void;
}

export default function LinearDiagramView({
  project,
  onUpdateLinear,
  onUpdateLinearSpur,
  onUpdateSpurLength,
  onUpdateMainLength,
  onUpdateProjectLength,
  onToggleCappingLayer
}: LinearDiagramViewProps) {
  const [roadType, setRoadType] = useState<'main' | 'spur'>('main');
  const [chartMode, setChartMode] = useState<'combined' | 'main' | 'spur'>('combined');

  const mainLinear = project.linear || generateLinearData();
  const spurLinear = project.linearSpur || generateSpurLinearData();

  // Interconnected Project Lengths
  const totalProjectKm = project.lengthKm || 65;
  const spurRoadTargetKm = project.spurRoadLengthKm ?? 8.8;
  const mainRoadTargetKm = Math.max(0, Number((totalProjectKm - spurRoadTargetKm).toFixed(2)));

  const activeLinear = roadType === 'main' ? mainLinear : spurLinear;
  const activeTargetKm = roadType === 'main' ? mainRoadTargetKm : spurRoadTargetKm;

  const handleFieldChange = (section: keyof LinearData, idx: number, field: 'from' | 'to', value: string) => {
    const sectionData = [...(activeLinear[section] || [])];
    if (sectionData[idx]) {
      const item = { ...sectionData[idx], [field]: value };
      const fVal = field === 'from' ? value : item.from;
      const tVal = field === 'to' ? value : item.to;
      item.exec = Math.max(0, parseStation(tVal) - parseStation(fVal));
      sectionData[idx] = item;
      
      const updatedLinear = {
        ...activeLinear,
        [section]: sectionData
      };

      if (roadType === 'main') {
        onUpdateLinear(updatedLinear);
      } else if (onUpdateLinearSpur) {
        onUpdateLinearSpur(updatedLinear);
      } else {
        onUpdateLinear(updatedLinear);
      }
    }
  };

  const handleAddRow = (section: keyof LinearData) => {
    const sectionData = [...(activeLinear[section] || [])];
    const newNo = sectionData.length + 1;
    const lastRow = sectionData[sectionData.length - 1];
    const defaultFrom = lastRow ? lastRow.to : 'Km 00+000';
    const defaultTo = lastRow ? `Km ${String(Math.floor(parseStation(lastRow.to) + 1)).padStart(2, '0')}+000` : 'Km 01+000';
    
    sectionData.push({
      no: newNo,
      from: defaultFrom,
      to: defaultTo,
      exec: Math.max(0, parseStation(defaultTo) - parseStation(defaultFrom))
    });

    const updatedLinear = {
      ...activeLinear,
      [section]: sectionData
    };

    if (roadType === 'main') {
      onUpdateLinear(updatedLinear);
    } else if (onUpdateLinearSpur) {
      onUpdateLinearSpur(updatedLinear);
    } else {
      onUpdateLinear(updatedLinear);
    }
  };

  const handleRemoveRow = (section: keyof LinearData, idx: number) => {
    const sectionData = (activeLinear[section] || []).filter((_, i) => i !== idx).map((item, i) => ({ ...item, no: i + 1 }));
    const updatedLinear = {
      ...activeLinear,
      [section]: sectionData
    };

    if (roadType === 'main') {
      onUpdateLinear(updatedLinear);
    } else if (onUpdateLinearSpur) {
      onUpdateLinearSpur(updatedLinear);
    } else {
      onUpdateLinear(updatedLinear);
    }
  };

  const sections: { id: keyof LinearData; name: string; color: string; hex: string; hover: string }[] = [
    { id: 'subgrade', name: 'Sub-Grade', color: 'bg-amber-800', hex: '#92400e', hover: 'hover:bg-amber-700' },
    ...(project.hasCappingLayer !== false ? [{ id: 'capping' as keyof LinearData, name: 'Capping Layers', color: 'bg-yellow-700', hex: '#a16207', hover: 'hover:bg-yellow-600' }] : []),
    { id: 'subbase', name: 'Sub-Base', color: 'bg-zinc-500', hex: '#71717a', hover: 'hover:bg-zinc-400' },
    { id: 'basecourse', name: 'Base-Course', color: 'bg-slate-500', hex: '#64748b', hover: 'hover:bg-slate-400' },
    { id: 'asphalt', name: 'Asphalt Concrete (AC)', color: 'bg-indigo-950', hex: '#1e1b4b', hover: 'hover:bg-slate-900' }
  ];

  const getRowExec = (r: any) => {
    if (typeof r.exec === 'number' && !isNaN(r.exec) && r.exec > 0) return r.exec;
    if (r.from && r.to) return Math.max(0, parseStation(r.to) - parseStation(r.from));
    return 0;
  };

  // Calculate interconnected live totals for combined, main, and spur road layers
  const progressChartData = sections.map((sec) => {
    const mainList = mainLinear[sec.id] || [];
    const spurList = spurLinear[sec.id] || [];

    const mainExec = mainList.reduce((sum, r) => sum + getRowExec(r), 0);
    const spurExec = spurList.reduce((sum, r) => sum + getRowExec(r), 0);
    const combinedExec = mainExec + spurExec;

    let displayTarget = totalProjectKm;
    let displayExec = combinedExec;

    if (chartMode === 'main') {
      displayTarget = mainRoadTargetKm;
      displayExec = mainExec;
    } else if (chartMode === 'spur') {
      displayTarget = spurRoadTargetKm;
      displayExec = spurExec;
    }

    const fillPct = Math.min(100, (displayExec / (displayTarget || 1)) * 100);
    const remainingKm = Math.max(0, displayTarget - displayExec);

    return {
      id: sec.id,
      name: sec.name,
      color: sec.color,
      hex: sec.hex,
      mainKm: Number(mainExec.toFixed(2)),
      spurKm: Number(spurExec.toFixed(2)),
      combinedKm: Number(combinedExec.toFixed(2)),
      displayExec: Number(displayExec.toFixed(2)),
      remainingKm: Number(remainingKm.toFixed(2)),
      displayTarget: Number(displayTarget.toFixed(2)),
      fillPct: Number(fillPct.toFixed(2)),
      mainSegments: mainList.length,
      spurSegments: spurList.length
    };
  });

  return (
    <div className="space-y-5">
      {/* Interconnected Project Length Linker Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-sm border border-indigo-800/40 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/20 rounded-xl text-blue-400 border border-blue-400/30">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                Project Length Interconnection & Linear Progress Sync
              </h2>
              <p className="text-xs text-slate-300">
                Total Contract Length is dynamically divided into Main Road and Spur Road sections.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-slate-700/60 shrink-0">
            <Calculator className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-mono font-bold text-emerald-300">
              Main ({mainRoadTargetKm} Km) + Spur ({spurRoadTargetKm} Km) = {totalProjectKm} Km Total
            </span>
          </div>
        </div>

        {/* Dynamic Road Length Breakdown Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-800">
          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/40 flex justify-between items-center">
            <div className="flex-1">
              <span className="text-[11px] font-medium text-slate-400 block">Total Project Length</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={totalProjectKm}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    if (onUpdateProjectLength) {
                      onUpdateProjectLength(val);
                    }
                  }}
                  className="w-24 bg-slate-900 border border-slate-600 rounded px-2 py-0.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
                  title="Update Total Contract Length"
                />
                <span className="text-xs font-mono text-slate-300">Km</span>
              </div>
            </div>
            <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-semibold px-2 py-0.5 rounded-full border border-indigo-500/30">
              Contract Total
            </span>
          </div>

          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/40 flex justify-between items-center">
            <div className="flex-1">
              <span className="text-[11px] font-medium text-slate-400 block">Main Road Target</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max={totalProjectKm}
                  value={mainRoadTargetKm}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    if (onUpdateMainLength) {
                      onUpdateMainLength(Math.min(totalProjectKm, Math.max(0, val)));
                    }
                  }}
                  className="w-24 bg-slate-900 border border-slate-600 rounded px-2 py-0.5 text-xs font-mono font-bold text-blue-300 focus:outline-none focus:border-blue-500"
                  title="Update Main Road target length"
                />
                <span className="text-xs font-mono text-slate-300">Km</span>
              </div>
            </div>
            <span className="text-[10px] bg-blue-500/20 text-blue-300 font-semibold px-2 py-0.5 rounded-full border border-blue-500/30">
              {((mainRoadTargetKm / (totalProjectKm || 1)) * 100).toFixed(1)}% Share
            </span>
          </div>

          <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/40 flex justify-between items-center">
            <div className="flex-1">
              <span className="text-[11px] font-medium text-slate-400 block">Spur Road Target</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max={totalProjectKm}
                  value={spurRoadTargetKm}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    if (onUpdateSpurLength) {
                      onUpdateSpurLength(Math.min(totalProjectKm, Math.max(0, val)));
                    }
                  }}
                  className="w-24 bg-slate-900 border border-slate-600 rounded px-2 py-0.5 text-xs font-mono font-bold text-emerald-300 focus:outline-none focus:border-emerald-500"
                  title="Adjust Spur Road target length"
                />
                <span className="text-xs font-mono text-slate-300">Km</span>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
              {((spurRoadTargetKm / (totalProjectKm || 1)) * 100).toFixed(1)}% Share
            </span>
          </div>
        </div>
      </div>



      {/* Capping Layer Configuration */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-4 rounded-2xl shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600 dark:text-yellow-500">
            <Ruler className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100">
              Capping Layers Configuration
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Toggle whether this project includes capping layers in the design.
            </p>
          </div>
        </div>
        
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={project.hasCappingLayer !== false}
            onChange={(e) => {
              if (onToggleCappingLayer) {
                onToggleCappingLayer(e.target.checked);
              }
            }}
          />
          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
          <span className="ml-3 text-sm font-medium text-slate-900 dark:text-slate-300">
            {project.hasCappingLayer !== false ? 'Enabled' : 'Disabled'}
          </span>
        </label>
      </div>

      {/* Segment Mapping Tables Header & Road Selector */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Ruler className="w-5 h-5 text-blue-500" />
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100">
              {roadType === 'main' ? `Main Road (${mainRoadTargetKm} Km)` : `Spur Road (${spurRoadTargetKm} Km)`} Physical Segment Mapping Tables
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Editing chainages automatically recalculates execution lengths and syncs directly with the Linear Progress Chart.
            </p>
          </div>
        </div>

        {/* Road Type Selector Switch */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/60 shrink-0">
          <button
            type="button"
            onClick={() => setRoadType('main')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              roadType === 'main'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            Main Road ({mainRoadTargetKm} Km)
          </button>
          <button
            type="button"
            onClick={() => setRoadType('spur')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              roadType === 'spur'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Navigation className="w-3.5 h-3.5 rotate-45" />
            Spur Road ({spurRoadTargetKm} Km)
          </button>
        </div>
      </div>

      {/* Structured Spreadsheet layout for values validation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sections.map((sec) => {
          const list = activeLinear[sec.id] || [];
          const totalExec = list.reduce((sum, r) => sum + r.exec, 0);

          return (
            <div 
              key={sec.id} 
              className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-sm flex flex-col"
            >
              {/* Header Box */}
              <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700/50 flex justify-between items-center">
                <span className="font-bold text-xs flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
                  <span className={`w-2.5 h-2.5 rounded-sm ${sec.color}`} />
                  {sec.name} ({roadType === 'main' ? 'Main' : 'Spur'})
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-black text-xs text-blue-600 dark:text-blue-400">
                    Total: {totalExec.toFixed(2)} Km
                  </span>
                  <button
                    type="button"
                    onClick={() => handleAddRow(sec.id)}
                    className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    title="Add new station segment"
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>
              </div>

              {/* SpreadSheet Scroller */}
              <div className="overflow-auto max-h-56">
                <table className="w-full text-left border-collapse text-xs text-slate-700 dark:text-slate-250">
                  <thead>
                    <tr className="bg-slate-100/50 dark:bg-slate-850 border-b border-slate-100 dark:border-slate-700 text-slate-400 font-bold sticky top-0">
                      <th className="p-2 w-10 text-center">No.</th>
                      <th className="p-2">From Station</th>
                      <th className="p-2">To Station</th>
                      <th className="p-2 w-20 text-center">Net (Km)</th>
                      <th className="p-2 w-8 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/40">
                    {list.map((r, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                        <td className="p-2 text-center text-slate-450 font-bold font-mono">{r.no}</td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={r.from}
                            placeholder="Km 00+000"
                            onChange={(e) => handleFieldChange(sec.id, rIdx, 'from', e.target.value)}
                            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-center text-xs py-0.5 rounded-md w-full focus:outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={r.to}
                            placeholder="Km 00+000"
                            onChange={(e) => handleFieldChange(sec.id, rIdx, 'to', e.target.value)}
                            className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono text-center text-xs py-0.5 rounded-md w-full focus:outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="p-2 text-center font-bold text-slate-500 font-mono">
                          {r.exec.toFixed(2)}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(sec.id, rIdx)}
                            className="text-slate-400 hover:text-rose-500 p-1 transition cursor-pointer"
                            title="Delete segment"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

