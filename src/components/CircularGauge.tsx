import React, { useState, useEffect, useRef } from 'react';

interface CircularGaugeProps {
  value: number;
  label: string;
  max?: number;
  isCost?: boolean;
  isElapsed?: boolean;
  kpiCode?: string;       // e.g. 'G1'
  kpiScore?: number;      // e.g. 84.5
  onKpiClick?: () => void; // cross-navigation function
  variant?: 'default' | 'compact';
}

export default function CircularGauge({
  value,
  label,
  max = 100,
  isCost = false,
  isElapsed = false,
  kpiCode,
  kpiScore,
  onKpiClick,
  variant = 'default',
}: CircularGaugeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerDimensions, setContainerDimensions] = useState<{ width: number; height: number }>({
    width: 160,
    height: 160,
  });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            setContainerDimensions({ width, height });
          }
        }
      }
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const clamped = Math.min(max, Math.max(0, value));
  const percent = max > 0 ? (clamped / max) : 0;
  
  // SVG Arc configuration
  const radius = 50;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  
  // We draw a semi-circle or full arc (270 degree arc)
  const arcLength = circumference * 0.75;
  const strokeDashoffset = arcLength - percent * arcLength;
  
  // Decide the color based on EVM or status type
  let color = 'stroke-emerald-500 text-emerald-500';
  if (isCost) {
    if (clamped < 10) {
      color = 'stroke-emerald-500 text-emerald-500';
    } else if (clamped < 25) {
      color = 'stroke-amber-500 text-amber-500';
    } else {
      color = 'stroke-rose-500 text-rose-500';
    }
  } else if (isElapsed) {
    if (clamped < 50) {
      color = 'stroke-emerald-400 text-emerald-400';
    } else if (clamped < 75) {
      color = 'stroke-amber-500 text-amber-500';
    } else {
      color = 'stroke-rose-600 text-rose-600';
    }
  } else if (kpiCode === 'G8') {
    if (clamped <= 50) {
      color = 'stroke-emerald-500 text-emerald-500';
    } else if (clamped <= 75) {
      color = 'stroke-amber-500 text-amber-500';
    } else {
      color = 'stroke-rose-500 text-rose-500';
    }
  } else {
    // Normal progress: high is good, low is bad
    if (clamped >= 75) {
      color = 'stroke-emerald-500 text-emerald-500';
    } else if (clamped >= 50) {
      color = 'stroke-amber-500 text-amber-500';
    } else {
      color = 'stroke-rose-500 text-rose-500';
    }
  }

  const isYellow = color.includes('amber-500');
  const strokeStyle = isYellow ? { stroke: '#ffff00' } : {};
  
  const isCompact = variant === 'compact';
  
  const valueStr = clamped.toFixed(2);

  // Dynamic percentage text scaling based on parent gauge container dimensions & value string length
  const baseLenFactor = valueStr.length > 6 ? 14 : (valueStr.length > 5 ? 16 : (valueStr.length > 4 ? 18 : 22));
  
  // Gauge container scale factor based on minimum dimension (width / height) relative to standard 160px
  const gaugeDim = Math.min(containerDimensions.width, containerDimensions.height);
  const dimScale = gaugeDim > 0 ? Math.max(0.7, Math.min(1.4, gaugeDim / 160)) : 1;
  
  const baseFontSize = baseLenFactor * dimScale;
  const symbolFontSize = baseFontSize * 0.58;

  return (
    <div 
      ref={containerRef}
      onClick={onKpiClick}
      className={isCompact 
        ? `flex flex-col items-center justify-center w-full group relative ${onKpiClick ? 'cursor-pointer' : ''}`
        : `flex flex-col items-center justify-center bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-300 w-full group relative overflow-hidden ${onKpiClick ? 'cursor-pointer hover:border-blue-400 dark:hover:border-blue-500' : ''}`
      }
    >
      {!isCompact && (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/50 to-transparent dark:from-slate-700/10 dark:to-transparent pointer-events-none" />
      )}

      <div className="relative w-full max-w-[160px] aspect-square flex items-center justify-center">
        <svg className="w-full h-full absolute inset-0" viewBox="0 0 120 120">
          <g transform="rotate(-225 60 60)">
            {/* Background circle track */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              className="stroke-slate-100 dark:stroke-slate-700/50 fill-none"
              strokeWidth={strokeWidth}
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeLinecap="round"
            />
            {/* Active colored arc */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              className={`fill-none ${isYellow ? '' : color} transition-all duration-1000 ease-out`}
              style={strokeStyle}
              strokeWidth={strokeWidth + 0.5}
              strokeDasharray={`${arcLength} ${circumference}`}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </g>

          {/* SVG-based dynamic, perfectly proportional percentage text */}
          <text
            x="60"
            y={clamped === value ? "64" : "56"}
            textAnchor="middle"
            dominantBaseline="middle"
            className="font-black font-mono fill-slate-800 dark:fill-slate-100"
            style={{
              fontSize: `${baseFontSize}px`,
              letterSpacing: '-0.03em',
              fontWeight: 900,
              ...(isYellow ? { fill: '#eab308' } : {})
            }}
          >
            {valueStr}
            <tspan
              className="font-semibold fill-slate-400 dark:fill-slate-500"
              style={{
                fontSize: `${symbolFontSize}px`,
                ...(isYellow ? { fill: '#eab308' } : {})
              }}
              dx="1"
            >
              %
            </tspan>
          </text>

          {clamped !== value && (
            <text
              x="60"
              y="78"
              textAnchor="middle"
              dominantBaseline="middle"
              className="font-bold font-mono fill-slate-400 dark:fill-slate-500 tracking-wide"
              style={{
                fontSize: `${Math.max(6, 8 * dimScale)}px`,
                ...(isYellow ? { fill: '#eab308' } : {})
              }}
            >
              ({value.toFixed(2)}%)
            </text>
          )}
        </svg>
      </div>
      
      {/* Label outside arc */}
      {!isCompact && label && (
        <span className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-300 text-center tracking-wide group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors duration-200">
          {label}
        </span>
      )}
    </div>
  );
}
