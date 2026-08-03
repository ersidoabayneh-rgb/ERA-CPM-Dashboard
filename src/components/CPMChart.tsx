import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GitMerge, 
  Layers, 
  TrendingUp, 
  Clock, 
  Activity, 
  Search, 
  ZoomIn, 
  ZoomOut, 
  Calendar,
  HelpCircle,
  Network
} from 'lucide-react';
import { Project, WorkProgramActivity } from '../types';

interface CPMChartProps {
  project: Project;
  activities: WorkProgramActivity[];
}

export default function CPMChart({ project, activities }: CPMChartProps) {
  const [activeTab, setActiveTab] = useState<'gantt' | 'network'>('gantt');
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomScale, setZoomScale] = useState<number>(1); // Zoom level multiplier for scale
  const [hoveredActivityId, setHoveredActivityId] = useState<string | null>(null);

  // Calculate project statistics
  const { totalDuration, criticalActivities, maxEst, firstStartDate } = useMemo(() => {
    let maxEft = 0;
    let maxEst = 0;
    const criticalList: WorkProgramActivity[] = [];
    
    activities.forEach(a => {
      if ((a.eft || 0) > maxEft) maxEft = a.eft || 0;
      if ((a.est || 0) > maxEst) maxEst = a.est || 0;
      if (a.critical) criticalList.push(a);
    });

    return {
      totalDuration: maxEft,
      criticalActivities: criticalList,
      maxEst,
      firstStartDate: project.startDate ? new Date(project.startDate) : new Date(),
    };
  }, [activities, project.startDate]);

  // Handle Gantt Bar scale ticks
  const timelineTicks = useMemo(() => {
    if (totalDuration <= 0) return [];
    
    // Choose sensible interval based on project duration
    let interval = 5;
    if (totalDuration > 100) interval = 20;
    else if (totalDuration > 50) interval = 10;
    else if (totalDuration < 15) interval = 2;

    const ticks = [];
    for (let i = 0; i <= totalDuration + 5; i += interval) {
      ticks.push(i);
    }
    return ticks;
  }, [totalDuration]);

  // Compute layers/levels for Network Diagram (AON Layout)
  const networkLevels = useMemo(() => {
    if (activities.length === 0) return [];

    const levelsMap: { [key: string]: number } = {};
    const visited = new Set<string>();

    const getLevel = (actId: string): number => {
      if (levelsMap[actId] !== undefined) return levelsMap[actId];
      if (visited.has(actId)) {
        // Break standard loops gracefully
        return 0;
      }
      visited.add(actId);

      const act = activities.find(x => x.id === actId);
      if (!act) return 0;

      const preds = act.predecessors 
        ? act.predecessors.split(',').map(s => s.trim()).filter(Boolean) 
        : [];

      if (preds.length === 0) {
        levelsMap[actId] = 0;
        visited.delete(actId);
        return 0;
      }

      let maxP = 0;
      preds.forEach(p => {
        maxP = Math.max(maxP, getLevel(p) + 1);
      });

      levelsMap[actId] = maxP;
      visited.delete(actId);
      return maxP;
    };

    // Calculate level for every activity
    activities.forEach(a => getLevel(a.id));

    // Convert keys into groups
    const grouped: { [level: number]: WorkProgramActivity[] } = {};
    activities.forEach(a => {
      const lvl = levelsMap[a.id] || 0;
      if (!grouped[lvl]) grouped[lvl] = [];
      grouped[lvl].push(a);
    });

    const sortedLevels = Object.keys(grouped)
      .map(Number)
      .sort((a, b) => a - b);

    return sortedLevels.map(lvl => ({
      level: lvl,
      nodes: grouped[lvl],
    }));
  }, [activities]);

  // Filter activities for search
  const filteredActivities = useMemo(() => {
    return activities.filter(a => 
      a.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
      a.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [activities, searchQuery]);

  // Calculate pixel bounds or percentage width
  const getRelativePosition = (days: number) => {
    if (totalDuration === 0) return 0;
    return (days / (totalDuration + 5)) * 100;
  };

  const formatOffsetDate = (offsetDays: number) => {
    const d = new Date(firstStartDate);
    d.setDate(d.getDate() + offsetDays);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (activities.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-150 dark:border-slate-800 p-8 rounded-2xl text-center shadow-xs">
        <Clock className="w-10 h-10 text-slate-400 mx-auto mb-3 animate-bounce" />
        <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300">No Program CPM Data Loaded</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Add visual schedule activities below or click "Load Sample CPM" in the top bar to visualize the Critical Path timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 rounded-2xl shadow-sm overflow-hidden p-5 space-y-5">
      {/* Visual Header & Summary Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-700/60">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-rose-500" />
            Interactive CPM Analytics & Gantt Chart
          </h3>
          <p className="text-[11px] text-slate-400 dark:text-slate-400">
            Interactive visualization of critical float constraints, sequence links, and project thresholds.
          </p>
        </div>

        {/* View Selection Toggle */}
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('gantt')}
            className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1 transition ${
              activeTab === 'gantt'
                ? 'bg-white dark:bg-slate-750 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            📊 Gantt Timeline
          </button>
          <button
            onClick={() => setActiveTab('network')}
            className={`px-3 py-1 text-xs font-bold rounded-lg flex items-center gap-1 transition ${
              activeTab === 'network'
                ? 'bg-white dark:bg-slate-750 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            🕸️ CPM Network (AON)
          </button>
        </div>
      </div>

      {/* Overview Analytics row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50/50 dark:bg-slate-900/30 p-3 rounded-xl border border-slate-150/50 dark:border-slate-750">
        <div className="p-2.5 bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-750/70 rounded-lg shadow-2xs">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Duration</span>
          <span className="text-lg font-black text-slate-800 dark:text-zinc-100 font-mono">
            {totalDuration} <span className="text-xs font-bold">days</span>
          </span>
        </div>
        <div className="p-2.5 bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-750/70 rounded-lg shadow-2xs">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Critical Path Nodes</span>
          <span className="text-lg font-black text-rose-500 font-mono">
            {criticalActivities.length} <span className="text-xs font-bold text-slate-400">tasks</span>
          </span>
        </div>
        <div className="p-2.5 bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-750/70 rounded-lg shadow-2xs">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Total Activities</span>
          <span className="text-lg font-black text-blue-500 font-mono">
            {activities.length} <span className="text-xs font-bold text-slate-400">total</span>
          </span>
        </div>
        <div className="p-2.5 bg-white dark:bg-slate-850 border border-slate-100 dark:border-slate-750/70 rounded-lg shadow-2xs">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Schedule Health</span>
          <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-450 uppercase flex items-center gap-1 mt-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
            CPM SYNCHRONIZED
          </span>
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'gantt' ? (
          <motion.div
            key="gantt-pane"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            {/* Controls banner */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-750">
              <div className="relative w-full sm:w-60">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter schedule nodes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-3 py-1 text-xs outline-none focus:border-blue-500 transition shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400">Gantt Zoom:</span>
                <button
                  onClick={() => setZoomScale(s => Math.max(0.6, s - 0.2))}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-850 shadow-3xs transition"
                  title="Zoom Out Scale"
                >
                  <ZoomOut className="w-3 h-3 text-slate-600 dark:text-zinc-300" />
                </button>
                <span className="text-[10px] font-bold font-mono text-slate-600 dark:text-zinc-200">
                  {Math.round(zoomScale * 100)}%
                </span>
                <button
                  onClick={() => setZoomScale(s => Math.min(2.0, s + 0.2))}
                  className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md border border-slate-250 dark:border-slate-700 bg-white dark:bg-slate-850 shadow-3xs transition"
                  title="Zoom In Scale"
                >
                  <ZoomIn className="w-3 h-3 text-slate-600 dark:text-zinc-300" />
                </button>
              </div>
            </div>

            {/* Custom Interactive Scroll Canvas */}
            <div className="border border-slate-150 dark:border-slate-750 rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto select-none">
                <div 
                  className="min-w-[800px] divide-y divide-slate-100 dark:divide-slate-755"
                  style={{ width: `${100 * zoomScale}%` }}
                >
                  {/* Timeline Day Metrics Header */}
                  <div className="flex items-center bg-slate-50 dark:bg-slate-900 border-b border-slate-150 dark:border-slate-750">
                    {/* Empty block aligner */}
                    <div className="w-64 p-3 border-r border-slate-150 dark:border-slate-750 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100/50 dark:bg-slate-900">
                      Schedule Item
                    </div>
                    {/* SVG timeline ticks */}
                    <div className="flex-1 relative h-10">
                      {timelineTicks.map((tick) => {
                        const pctLeft = getRelativePosition(tick);
                        return (
                          <div 
                            key={tick}
                            className="absolute top-0 bottom-0 border-l border-slate-200/60 dark:border-slate-750 flex flex-col justify-between pl-1"
                            style={{ left: `${pctLeft}%` }}
                          >
                            <span className="text-[8px] font-bold text-slate-400 dark:text-slate-500 font-mono mt-1">
                              Day {tick}
                            </span>
                            <span className="text-[8px] font-semibold text-slate-400/70 block mb-0.5 font-mono">
                              {formatOffsetDate(tick)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Activity Schedules Bars */}
                  {filteredActivities.length === 0 ? (
                    <div className="p-10 text-center text-xs text-slate-400">
                      No schedule items match your filter criteria.
                    </div>
                  ) : (
                    filteredActivities.map((item) => {
                      const est = item.est || 0;
                      const duration = item.duration || 0;
                      const eft = item.eft || 0;
                      const float = item.float || 0;
                      const lft = item.lft || 0;

                      const startPct = getRelativePosition(est);
                      const durPct = getRelativePosition(duration);
                      const floatPct = getRelativePosition(float);

                      const isCritical = item.critical;
                      const hasHover = hoveredActivityId === item.id;
                      const predsList = item.predecessors ? item.predecessors.split(',').map(s => s.trim()).filter(Boolean) : [];

                      return (
                        <div 
                          key={item.id}
                          className={`flex items-center transition-colors duration-150 hover:bg-slate-50/50 dark:hover:bg-slate-900/10 ${
                            isCritical ? 'bg-rose-500/1 text-rose-900/90' : ''
                          }`}
                          onMouseEnter={() => setHoveredActivityId(item.id)}
                          onMouseLeave={() => setHoveredActivityId(null)}
                        >
                          <div className="w-64 p-2.5 border-r border-slate-150 dark:border-slate-750 flex items-center justify-between gap-1">
                            <div className="flex items-center gap-2 truncate">
                              {/* Glowing ID tag */}
                              <span className={`w-6 h-6 items-center justify-center flex font-black font-mono text-[10px] rounded-lg tracking-tight shadow-3xs shrink-0 ${
                                isCritical 
                                  ? 'bg-rose-550 border border-rose-500 text-white animate-pulse'
                                  : 'bg-white dark:bg-slate-800 text-slate-650 dark:text-zinc-300 border border-slate-200 dark:border-slate-700'
                              }`}>
                                {item.id}
                              </span>
                              <div className="truncate flex flex-col">
                                <span className="text-[11px] font-bold text-slate-700 dark:text-zinc-200 truncate">
                                  {item.name}
                                </span>
                                {predsList.length > 0 && (
                                  <span className="text-[8px] font-mono text-slate-400 dark:text-slate-500 block">
                                    Predecessors: {predsList.join(', ')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-black text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-900 shrink-0">
                              {duration}d
                            </span>
                          </div>

                          {/* Graphical Timeline Row Track */}
                          <div className="flex-1 relative h-10 flex items-center">
                            {/* Grid vertical reference guides */}
                            {timelineTicks.map((tick) => (
                              <div 
                                key={`tick-guide-${tick}`}
                                className="absolute top-0 bottom-0 border-l border-slate-150/45 dark:border-slate-800/30 touch-none pointer-events-none"
                                style={{ left: `${getRelativePosition(tick)}%` }}
                              />
                            ))}

                            {/* Solid Work Duration Bar */}
                            <div 
                              className={`absolute h-5.5 rounded-lg flex items-center px-2 cursor-pointer shadow-3xs transition-all duration-300 group ${
                                isCritical 
                                  ? 'bg-gradient-to-r from-red-500 to-rose-650 border border-red-550 text-white font-extrabold focus:outline-rose-550' 
                                  : 'bg-gradient-to-r from-blue-500 to-indigo-600 border border-blue-400 text-white font-semibold'
                              } ${
                                hasHover ? 'brightness-110 shadow-md ring-2 ring-blue-400/50' : ''
                              }`}
                              style={{ 
                                left: `${startPct}%`, 
                                width: `calc(${durPct}% - 2px)` 
                              }}
                              title={`[Activity ${item.id}] ${item.name} (${duration} Days, Float: ${float} Days)`}
                            >
                              <span className="text-[9px] font-mono select-none drop-shadow-md truncate text-white block">
                                ({item.id}) {item.name}
                              </span>
                              
                              {/* Pulsing indicator specifically for critical paths */}
                              {isCritical && (
                                <span className="absolute top-0.5 right-0.5 flex h-1.5 w-1.5 align-middle select-none">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-100 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-200"></span>
                                </span>
                              )}
                            </div>

                            {/* Float Bar extension (Buffer zone) */}
                            {float > 0 && (
                              <div 
                                className="absolute h-4 border-y border-r border-dashed border-amber-500/55 dark:border-amber-400 bg-amber-500/10 dark:bg-amber-950/20 rounded-r-lg flex items-center justify-end px-1.5 cursor-help"
                                style={{ 
                                  left: `${getRelativePosition(eft)}%`, 
                                  width: `${floatPct}%` 
                                }}
                                title={`Float buffer for Activity ${item.id}: Extra ${float} days can slide without affecting critical deadline.`}
                              >
                                <span className="text-[7.5px] font-mono text-amber-600 dark:text-amber-400 font-extrabold select-none">
                                  +{float}d float
                                </span>
                              </div>
                            )}

                            {/* Hover Details Panel tooltips overlay */}
                            {hasHover && (
                              <div 
                                className="absolute left-3 bottom-8 bg-slate-900 border border-slate-700 text-zinc-100 p-2.5 rounded-lg shadow-xl z-50 text-[10px] w-56 flex flex-col gap-1 text-left select-text"
                                style={{ left: `calc(${startPct}% + 10px)` }}
                                onMouseEnter={(e) => e.stopPropagation()} // retain tooltip focus
                              >
                                <div className="border-b border-slate-700 pb-1 flex justify-between">
                                  <span className="font-extrabold text-blue-450 uppercase tracking-wide">[{item.id}] Activity Metadata</span>
                                  <span className={`px-1.5 py-0.2 uppercase text-[7.5px] rounded font-black ${
                                    isCritical ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-750 text-slate-350'
                                  }`}>
                                    {isCritical ? 'CRITICAL' : 'SUBCRITICAL'}
                                  </span>
                                </div>
                                <p className="font-bold text-[11px] text-white my-0.5 leading-tight">{item.name}</p>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 mt-0.5 font-mono text-slate-300">
                                  <span>Early Start:</span> <span className="text-white font-bold">{item.start || '-'} (D{est})</span>
                                  <span>Early Finish:</span> <span className="text-white font-bold">{item.finish || '-'} (D{eft})</span>
                                  <span>Late Finish:</span> <span className="text-slate-400 font-bold">D{lft}</span>
                                  <span>Total Float:</span> <span className={`${isCritical ? 'text-red-400' : 'text-amber-400'} font-bold`}>{float} days</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Informative Visual Legend */}
              <div className="bg-slate-50 dark:bg-slate-900 px-4 py-3 border-t border-slate-150 dark:border-slate-750 text-[10px] flex flex-wrap gap-4 text-slate-500 dark:text-slate-400 justify-between items-center">
                <div className="flex flex-wrap gap-4 items-center">
                  <span className="font-semibold text-slate-400 uppercase tracking-widest text-[9px]">Legend:</span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-3 h-3.5 bg-gradient-to-r from-red-500 to-rose-650 border border-red-550 rounded-sm inline-block" />
                    Critical Activity (Zero Float)
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-3 h-3.5 bg-gradient-to-r from-blue-500 to-indigo-600 border border-blue-400 rounded-sm inline-block" />
                    Sub-Critical Activity
                  </span>
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-4 h-2 bg-amber-500/10 border-y border-dashed border-amber-500 rounded-xs inline-block" />
                    Task Float Space (Slide buffer allowance)
                  </span>
                </div>
                <div className="italic text-[9.5px]">
                  * Hover over Gantt bars to view late start details and timing calculations.
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="network-pane"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="space-y-4"
          >
            {/* Legend guide banner */}
            <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-750 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-500 shrink-0" />
                <span>
                  <strong>AON (Activity-on-Node) Network Diagram:</strong> Displaying critical sequences left to right grouped by predecessor levels.
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-rose-500/10 border-2 border-red-500 rounded-xs inline-block" />
                  Critical Task
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 bg-blue-500/10 border-2 border-blue-500 rounded-xs inline-block" />
                  Standard Task
                </span>
              </div>
            </div>

            {/* Grid Network level streams */}
            <div className="overflow-x-auto p-2 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-150 dark:border-slate-750">
              <div className="min-w-[900px] flex gap-12 py-4 px-2 items-start justify-between relative">
                {networkLevels.map((lvl, lidx) => (
                  <div key={lvl.level} className="flex-1 flex flex-col gap-6 relative items-center">
                    {/* Level Column Identifier Stream Header */}
                    <div className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700/80 mb-2 shadow-3xs">
                      Dependency Level {lvl.level}
                    </div>

                    <div className="w-full flex flex-col gap-4">
                      {lvl.nodes.map((node) => {
                        const isCritical = node.critical;
                        const float = node.float || 0;
                        const isHovered = hoveredActivityId === node.id;
                        
                        // Check if hover relates to this node to highlight connections
                        const isRelatedPredecessor = hoveredActivityId ? 
                          (node.predecessors ? node.predecessors.split(',').map(s=>s.trim()).includes(hoveredActivityId) : false) : false;
                        
                        // Check if this node depends on currently hovered node symbol
                        const currentHoverObj = hoveredActivityId ? activities.find(x => x.id === hoveredActivityId) : null;
                        const isRelatedSuccessor = currentHoverObj ? 
                          (currentHoverObj.predecessors ? currentHoverObj.predecessors.split(',').map(s=>s.trim()).includes(node.id) : false) : false;

                        return (
                          <div
                            key={node.id}
                            className={`transition-all duration-200 relative select-text text-left ${
                              isHovered ? 'scale-105 z-10' : ''
                            }`}
                            onMouseEnter={() => setHoveredActivityId(node.id)}
                            onMouseLeave={() => setHoveredActivityId(null)}
                          >
                            {/* AON Structured Visual Card */}
                            <div className={`rounded-lg overflow-hidden border shadow-sm ${
                              isCritical 
                                ? (isHovered ? 'border-red-550 shadow-red-500/20 bg-rose-500/10' : 'border-red-400 dark:border-red-500/70 bg-rose-500/5')
                                : (isHovered ? 'border-blue-550 shadow-blue-500/20 bg-blue-500/10' : 'border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800/80')
                            } ${
                              isRelatedPredecessor ? 'ring-2 ring-amber-400/75 ring-offset-1 dark:ring-offset-slate-900 border-amber-400' : ''
                            } ${
                              isRelatedSuccessor ? 'ring-2 ring-emerald-500/75 ring-offset-1 dark:ring-offset-slate-900 border-emerald-550' : ''
                            }`}>
                              
                              {/* Row 1: ES | Dur | EF */}
                              <div className="grid grid-cols-3 text-[9px] font-mono border-b border-slate-200 dark:border-slate-700/60 divide-x divide-slate-150 dark:divide-slate-700 bg-slate-50/70 dark:bg-slate-900/60 text-center text-slate-500 dark:text-slate-400">
                                <div className="py-0.5 px-1" title="Early Start day">
                                  ES: <strong className="text-slate-700 dark:text-zinc-200">{node.est}</strong>
                                </div>
                                <div className="py-0.5 px-1 font-extrabold" title="Duration">
                                  D: <strong className="text-slate-700 dark:text-zinc-200">{node.duration}d</strong>
                                </div>
                                <div className="py-0.5 px-1" title="Early Finish day">
                                  EF: <strong className="text-slate-700 dark:text-zinc-200">{node.eft}</strong>
                                </div>
                              </div>

                              {/* Row 2: Code - Name */}
                              <div className="p-2 text-center">
                                <span className={`inline-block font-black font-mono text-[11px] rounded px-1 text-white mr-1.5 ${
                                  isCritical ? 'bg-gradient-to-r from-red-500 to-rose-650' : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                                }`}>
                                  {node.id}
                                </span>
                                <span className="text-[10px] font-extrabold text-slate-700 dark:text-zinc-100 leading-tight">
                                  {node.name}
                                </span>
                              </div>

                              {/* Row 3: LS | Float | LF */}
                              <div className="grid grid-cols-3 text-[8.5px] font-mono border-t border-slate-200 dark:border-slate-700/60 divide-x divide-slate-150 ... divide-slate-150 dark:divide-slate-700 bg-slate-50/70 dark:bg-slate-900/60 text-center text-slate-400">
                                <div className="py-0.5 px-1" title="Late Start day">
                                  LS: <span className="text-slate-650 dark:text-slate-350">{node.lst}</span>
                                </div>
                                <div className={`py-0.5 px-1 font-bold ${isCritical ? 'text-rose-500' : 'text-amber-500'}`} title="Float buffer days">
                                  Float: {float}d
                                </div>
                                <div className="py-0.5 px-1" title="Late Finish day">
                                  LF: <span className="text-slate-650 dark:text-slate-350">{node.lft}</span>
                                </div>
                              </div>
                            </div>

                            {/* Node relation stream badges */}
                            {isHovered && (
                              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-slate-950 text-white p-2 rounded-lg text-[9px] w-52 z-30 shadow-lg text-center leading-normal no-print">
                                <span className="font-extrabold uppercase text-blue-400 block border-b border-slate-850 pb-1 mb-1">
                                  Sequence Constraints Linkages
                                </span>
                                {node.predecessors ? (
                                  <p className="mb-0.5">
                                    Depends on predecessors: <strong className="text-amber-400 font-extrabold">{node.predecessors}</strong> (marked <span className="text-amber-400 font-bold">Orange</span>)
                                  </p>
                                ) : (
                                  <p className="mb-0.5 text-slate-400 italic">No predecessors. (Start anchor)</p>
                                )}
                                <p>
                                  Hov-State: Hover other cards to analyze active link logic of dependency tracks.
                                </p>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
