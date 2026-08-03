import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Calculator, 
  TrendingUp, 
  Coins, 
  BarChart3, 
  Layers, 
  Table as TableIcon, 
  ChevronDown, 
  ChevronUp,
  HelpCircle,
  FileSpreadsheet
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  ComposedChart, 
  LineChart,
  BarChart, 
  AreaChart, 
  Bar, 
  Line, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { IpcItem, formatAccounting } from '../types';

interface BillSummaryPriceAdjChartProps {
  ipcTracker: IpcItem[];
  usdExchangeRate?: number;
}

export default function BillSummaryPriceAdjChart({ 
  ipcTracker = [], 
  usdExchangeRate = 57.50 
}: BillSummaryPriceAdjChartProps) {
  const [viewMode, setViewMode] = useState<'combined' | 'monthly' | 'cumulative'>('combined');
  const [unitMode, setUnitMode] = useState<'millions' | 'full'>('millions');
  const [showTable, setShowTable] = useState<boolean>(false);

  // Compute monthly and running cumulative data
  let runningCumGross = 0;
  let runningCumPriceAdj = 0;
  let runningCumCertified = 0;

  const chartData = ipcTracker.map((item, index) => {
    const periodName = item.period ? `${item.paymentNo} (${item.period})` : item.paymentNo;
    const gross = item.grossBillEtb || 0;
    const priceAdj = item.priceAdjustmentEtb || 0;
    const certified = item.certifiedEtb || 0;

    runningCumGross += gross;
    runningCumPriceAdj += priceAdj;
    runningCumCertified += certified;

    const priceAdjRatio = gross > 0 ? (priceAdj / gross) * 100 : 0;

    return {
      id: item.id || `ipc_${index}`,
      ipcNo: item.paymentNo,
      period: item.period || '',
      label: periodName,
      // Monthly values
      monthlyGross: gross,
      monthlyPriceAdj: priceAdj,
      monthlyCertified: certified,
      monthlyGrossM: Number((gross / 1_000_000).toFixed(2)),
      monthlyPriceAdjM: Number((priceAdj / 1_000_000).toFixed(2)),
      monthlyCertifiedM: Number((certified / 1_000_000).toFixed(2)),
      // Cumulative values
      cumGross: runningCumGross,
      cumPriceAdj: runningCumPriceAdj,
      cumCertified: runningCumCertified,
      cumGrossM: Number((runningCumGross / 1_000_000).toFixed(2)),
      cumPriceAdjM: Number((runningCumPriceAdj / 1_000_000).toFixed(2)),
      cumCertifiedM: Number((runningCumCertified / 1_000_000).toFixed(2)),
      priceAdjRatio: Number(priceAdjRatio.toFixed(2))
    };
  });

  const totalGross = runningCumGross;
  const totalPriceAdj = runningCumPriceAdj;
  const totalCertified = runningCumCertified;
  const overallPriceAdjRatio = totalGross > 0 ? (totalPriceAdj / totalGross) * 100 : 0;

  const formatValue = (val: number) => {
    if (unitMode === 'millions') {
      return `Br. ${(val / 1_000_000).toFixed(2)}M`;
    }
    return formatAccounting(val, 'Br.');
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const dataItem = chartData.find(d => d.label === label || d.ipcNo === label);

    return (
      <div className="bg-slate-900/95 text-slate-100 p-3.5 rounded-xl border border-slate-700 shadow-xl text-xs space-y-2.5 max-w-xs font-sans">
        <div className="border-b border-slate-700/80 pb-1.5 flex justify-between items-center gap-2">
          <span className="font-bold text-white text-xs">{label}</span>
          {dataItem?.priceAdjRatio !== undefined && (
            <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full font-mono border border-amber-500/30 font-semibold">
              Price Adj: {Number(dataItem.priceAdjRatio).toFixed(2)}% of Gross
            </span>
          )}
        </div>

        <div className="space-y-1.5 font-mono text-[11px]">
          <div className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider">Monthly Figures</div>
          <div className="flex justify-between items-center text-indigo-300">
            <span>Bill Summary Measured:</span>
            <span className="font-bold">{formatValue(dataItem?.monthlyGross || 0)}</span>
          </div>
          <div className="flex justify-between items-center text-amber-400">
            <span>Price Adjustment:</span>
            <span className="font-bold">+{formatValue(dataItem?.monthlyPriceAdj || 0)}</span>
          </div>
          <div className="flex justify-between items-center text-emerald-400">
            <span>Certified Net:</span>
            <span className="font-bold">{formatValue(dataItem?.monthlyCertified || 0)}</span>
          </div>

          <div className="text-[10px] font-sans font-bold text-slate-400 uppercase tracking-wider pt-1 border-t border-slate-800">
            Cumulative To-Date
          </div>
          <div className="flex justify-between items-center text-indigo-200">
            <span>Cum. Bill Summary:</span>
            <span className="font-bold">{formatValue(dataItem?.cumGross || 0)}</span>
          </div>
          <div className="flex justify-between items-center text-amber-300">
            <span>Cum. Price Adjustment:</span>
            <span className="font-bold">+{formatValue(dataItem?.cumPriceAdj || 0)}</span>
          </div>
          <div className="flex justify-between items-center text-emerald-300">
            <span>Cum. Certified Net:</span>
            <span className="font-bold">{formatValue(dataItem?.cumCertified || 0)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm space-y-4 font-sans text-xs">
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-700/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg">
            <BarChart3 className="w-4 h-4" />
          </div>
        </div>

        {/* View Mode & Unit Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggle */}
          <div className="bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg flex items-center text-[10px] font-bold">
            <button
              onClick={() => setViewMode('combined')}
              className={`px-2.5 py-1 rounded-md transition ${
                viewMode === 'combined'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Combined View
            </button>
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-2.5 py-1 rounded-md transition ${
                viewMode === 'monthly'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Monthly IPC
            </button>
            <button
              onClick={() => setViewMode('cumulative')}
              className={`px-2.5 py-1 rounded-md transition ${
                viewMode === 'cumulative'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs font-extrabold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Cumulative Trend
            </button>
          </div>

          {/* Unit Toggle */}
          <div className="bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg flex items-center text-[10px] font-bold">
            <button
              onClick={() => setUnitMode('millions')}
              className={`px-2.5 py-1 rounded-md transition ${
                unitMode === 'millions'
                  ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-2xs font-extrabold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              M ETB
            </button>
            <button
              onClick={() => setUnitMode('full')}
              className={`px-2.5 py-1 rounded-md transition ${
                unitMode === 'full'
                  ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 shadow-2xs font-extrabold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Full ETB
            </button>
          </div>

          {/* Table Toggle Button */}
          <button
            onClick={() => setShowTable(!showTable)}
            className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <TableIcon className="w-3.5 h-3.5 text-indigo-500" />
            {showTable ? 'Hide Table' : 'Data Table'}
            {showTable ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 p-3 rounded-xl">
          <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider block">
            Total Bill Summary
          </span>
          <span className="text-base font-extrabold font-mono text-indigo-900 dark:text-indigo-200 mt-0.5 block">
            {formatValue(totalGross)}
          </span>
          <span className="text-[10px] text-indigo-600/80 dark:text-indigo-400 mt-0.5 block">
            Cumulative work executed
          </span>
        </div>

        <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 p-3 rounded-xl">
          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">
            Total Price Adjustment
          </span>
          <span className="text-base font-extrabold font-mono text-amber-900 dark:text-amber-200 mt-0.5 block">
            +{formatValue(totalPriceAdj)}
          </span>
          <span className="text-[10px] text-amber-600/80 dark:text-amber-400 mt-0.5 block font-semibold">
            {overallPriceAdjRatio.toFixed(2)}% of Bill Summary
          </span>
        </div>

        <div className="bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 p-3 rounded-xl">
          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">
            Total Certified Net
          </span>
          <span className="text-base font-extrabold font-mono text-emerald-900 dark:text-emerald-200 mt-0.5 block">
            {formatValue(totalCertified)}
          </span>
          <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400 mt-0.5 block">
            Net IPC certified payout
          </span>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-700/60 p-3 rounded-xl">
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
            IPC Certificates Count
          </span>
          <span className="text-base font-extrabold font-mono text-slate-800 dark:text-slate-200 mt-0.5 block">
            {ipcTracker.length} IPC Statements
          </span>
          <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
            Financial reporting period
          </span>
        </div>
      </div>

      {/* Main Chart Canvas */}
      <div className="h-72 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {viewMode === 'combined' ? (
            <LineChart data={chartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-700/30" />
              <XAxis dataKey="ipcNo" stroke="#94a3b8" tick={{ fontSize: 9 }} />
              <YAxis 
                yAxisId="left" 
                stroke="#6366f1" 
                tick={{ fontSize: 9 }} 
                unit={unitMode === 'millions' ? 'M' : ''}
                label={{ value: unitMode === 'millions' ? 'Monthly (M ETB)' : 'Monthly (ETB)', angle: -90, position: 'insideLeft', style: { fontSize: '9px', fill: '#6366f1' } }}
              />
              <YAxis 
                yAxisId="right" 
                orientation="right" 
                stroke="#10b981" 
                tick={{ fontSize: 9 }} 
                unit={unitMode === 'millions' ? 'M' : ''}
                label={{ value: unitMode === 'millions' ? 'Cumulative (M ETB)' : 'Cumulative (ETB)', angle: 90, position: 'insideRight', style: { fontSize: '9px', fill: '#10b981' } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: '10px' }} />

              {/* Monthly Trend Lines (Replacing former Bar columns) */}
              <Line 
                yAxisId="left" 
                name="Monthly Bill Summary" 
                type="monotone"
                dataKey={unitMode === 'millions' ? 'monthlyGrossM' : 'monthlyGross'} 
                stroke="#6366f1" 
                strokeWidth={2}
                dot={{ r: 3 }}
              />
              <Line 
                yAxisId="left" 
                name="Monthly Price Adj." 
                type="monotone"
                dataKey={unitMode === 'millions' ? 'monthlyPriceAdjM' : 'monthlyPriceAdj'} 
                stroke="#f59e0b" 
                strokeWidth={2}
                dot={{ r: 3 }}
              />

              {/* Cumulative Trend Lines */}
              <Line 
                yAxisId="right" 
                name="Cum. Bill Summary" 
                type="monotone" 
                dataKey={unitMode === 'millions' ? 'cumGrossM' : 'cumGross'} 
                stroke="#4f46e5" 
                strokeWidth={2} 
                strokeDasharray="4 4"
                dot={{ r: 3 }}
              />
              <Line 
                yAxisId="right" 
                name="Cum. Price Adjustment" 
                type="monotone" 
                dataKey={unitMode === 'millions' ? 'cumPriceAdjM' : 'cumPriceAdj'} 
                stroke="#d97706" 
                strokeWidth={2.5} 
                dot={{ r: 4 }}
              />
              <Line 
                yAxisId="right" 
                name="Cum. Net Certified" 
                type="monotone" 
                dataKey={unitMode === 'millions' ? 'cumCertifiedM' : 'cumCertified'} 
                stroke="#10b981" 
                strokeWidth={3} 
                dot={{ r: 4 }}
                activeDot={{ r: 7 }}
              />
            </LineChart>
          ) : viewMode === 'monthly' ? (
            <BarChart data={chartData} margin={{ top: 15, right: 10, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-700/30" />
              <XAxis dataKey="ipcNo" stroke="#94a3b8" tick={{ fontSize: 9 }} />
              <YAxis 
                stroke="#94a3b8" 
                tick={{ fontSize: 9 }} 
                unit={unitMode === 'millions' ? 'M' : ''}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: '10px' }} />
              <Bar 
                name="Monthly Bill Summary" 
                dataKey={unitMode === 'millions' ? 'monthlyGrossM' : 'monthlyGross'} 
                fill="#6366f1" 
                radius={[4, 4, 0, 0]} 
              />
              <Bar 
                name="Monthly Price Adj." 
                dataKey={unitMode === 'millions' ? 'monthlyPriceAdjM' : 'monthlyPriceAdj'} 
                fill="#f59e0b" 
                radius={[4, 4, 0, 0]} 
              />
              <Bar 
                name="Monthly Certified Net" 
                dataKey={unitMode === 'millions' ? 'monthlyCertifiedM' : 'monthlyCertified'} 
                fill="#10b981" 
                radius={[4, 4, 0, 0]} 
              />
            </BarChart>
          ) : (
            <AreaChart data={chartData} margin={{ top: 15, right: 10, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorCumGross" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCumPriceAdj" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorCumCert" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100 dark:stroke-slate-700/30" />
              <XAxis dataKey="ipcNo" stroke="#94a3b8" tick={{ fontSize: 9 }} />
              <YAxis 
                stroke="#94a3b8" 
                tick={{ fontSize: 9 }} 
                unit={unitMode === 'millions' ? 'M' : ''}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend verticalAlign="top" height={32} wrapperStyle={{ fontSize: '10px' }} />
              <Area 
                name="Cum. Bill Summary" 
                type="monotone" 
                dataKey={unitMode === 'millions' ? 'cumGrossM' : 'cumGross'} 
                stroke="#6366f1" 
                fillOpacity={1} 
                fill="url(#colorCumGross)" 
                strokeWidth={2}
              />
              <Area 
                name="Cum. Price Adjustment" 
                type="monotone" 
                dataKey={unitMode === 'millions' ? 'cumPriceAdjM' : 'cumPriceAdj'} 
                stroke="#f59e0b" 
                fillOpacity={1} 
                fill="url(#colorCumPriceAdj)" 
                strokeWidth={2.5}
              />
              <Area 
                name="Cum. Net Certified" 
                type="monotone" 
                dataKey={unitMode === 'millions' ? 'cumCertifiedM' : 'cumCertified'} 
                stroke="#10b981" 
                fillOpacity={1} 
                fill="url(#colorCumCert)" 
                strokeWidth={3}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Collapsible Data Breakdown Table */}
      {showTable && (
        <div className="pt-3 border-t border-slate-100 dark:border-slate-700/60 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-indigo-500" />
              Monthly & Cumulative Financial Statement Schedule
            </span>
            <span className="text-[10px] text-slate-400">Values in ETB</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-700/70">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-300 font-bold border-b border-slate-200 dark:border-slate-700/80 uppercase text-[9.5px] tracking-wider">
                  <th className="py-2.5 px-3">IPC No. / Period</th>
                  <th className="py-2.5 px-3 text-right">Monthly Bill Summary</th>
                  <th className="py-2.5 px-3 text-right text-amber-700 dark:text-amber-400">Monthly Price Adj.</th>
                  <th className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-400">Monthly Certified</th>
                  <th className="py-2.5 px-3 text-right font-extrabold text-indigo-900 dark:text-indigo-300">Cum. Bill Summary</th>
                  <th className="py-2.5 px-3 text-right font-extrabold text-amber-900 dark:text-amber-300">Cum. Price Adj.</th>
                  <th className="py-2.5 px-3 text-right font-extrabold text-emerald-900 dark:text-emerald-300">Cum. Certified</th>
                  <th className="py-2.5 px-3 text-center">Price Adj. %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[10.5px]">
                {chartData.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition">
                    <td className="py-2 px-3 font-sans font-bold text-slate-800 dark:text-slate-200">
                      {row.ipcNo} {row.period && <span className="text-slate-400 font-normal">({row.period})</span>}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                      {formatAccounting(row.monthlyGross, 'Br.')}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-amber-600 dark:text-amber-400">
                      +{formatAccounting(row.monthlyPriceAdj, 'Br.')}
                    </td>
                    <td className="py-2 px-3 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatAccounting(row.monthlyCertified, 'Br.')}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50/20 dark:bg-indigo-950/20">
                      {formatAccounting(row.cumGross, 'Br.')}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-amber-700 dark:text-amber-300 bg-amber-50/20 dark:bg-amber-950/20">
                      +{formatAccounting(row.cumPriceAdj, 'Br.')}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50/20 dark:bg-emerald-950/20">
                      {formatAccounting(row.cumCertified, 'Br.')}
                    </td>
                    <td className="py-2 px-3 text-center font-sans font-extrabold text-slate-600 dark:text-slate-300">
                      <span className="bg-amber-100/70 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 px-2 py-0.5 rounded-full text-[10px]">
                        {row.priceAdjRatio}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 dark:bg-slate-900 font-mono font-bold text-slate-900 dark:text-slate-100 border-t-2 border-slate-300 dark:border-slate-700">
                  <td className="py-2.5 px-3 font-sans font-extrabold">Total To-Date</td>
                  <td className="py-2.5 px-3 text-right">{formatAccounting(totalGross, 'Br.')}</td>
                  <td className="py-2.5 px-3 text-right text-amber-600 dark:text-amber-400">+{formatAccounting(totalPriceAdj, 'Br.')}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-600 dark:text-emerald-400">{formatAccounting(totalCertified, 'Br.')}</td>
                  <td className="py-2.5 px-3 text-right text-indigo-700 dark:text-indigo-300">{formatAccounting(totalGross, 'Br.')}</td>
                  <td className="py-2.5 px-3 text-right text-amber-700 dark:text-amber-300">+{formatAccounting(totalPriceAdj, 'Br.')}</td>
                  <td className="py-2.5 px-3 text-right text-emerald-700 dark:text-emerald-300">{formatAccounting(totalCertified, 'Br.')}</td>
                  <td className="py-2.5 px-3 text-center font-sans text-amber-700 dark:text-amber-300 font-extrabold">
                    {overallPriceAdjRatio.toFixed(2)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
