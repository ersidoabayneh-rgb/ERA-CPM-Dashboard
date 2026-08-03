import React from 'react';
import { motion } from 'motion/react';
import { 
  Settings, 
  Sun, 
  Moon, 
  Sparkles, 
  RefreshCcw, 
  Key, 
  Lock, 
  Globe, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw 
} from 'lucide-react';

interface SettingsViewProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  vantaColor: string;
  vantaBgColor: string;
  vantaPoints: number;
  onUpdateVanta: (color: string, bg: string, points: number) => void;
  onResetVanta: () => void;
  customBgColor: string;
  customTxtColor: string;
  customWordColor: string;
  customTxtBgColor: string;
  customChartTooltipBgColor: string;
  onUpdateCustomColors: (bg: string, txt: string, word: string, txtBg: string, chartTooltipBg: string) => void;
  onResetCustomColors: () => void;
}

export default function SettingsView({
  darkMode,
  onToggleDarkMode,
  vantaColor,
  vantaBgColor,
  vantaPoints,
  onUpdateVanta,
  onResetVanta,
  customBgColor,
  customTxtColor,
  customWordColor,
  customTxtBgColor,
  customChartTooltipBgColor,
  onUpdateCustomColors,
  onResetCustomColors
}: SettingsViewProps) {

  return (
    <div className="space-y-4">
      
      {/* Header Box */}
      <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 dark:text-zinc-100 mb-1 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-500" />
          ERP Dashboard Workspace Settings
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Personalize colors, toggle themes, and customize ambient visual densities.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Style selection */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Interface Theme mode
          </h3>

          <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-750">
            <div className="space-y-0.5">
              <p className="font-bold text-xs text-slate-700 dark:text-slate-200">Dark / Light UI Toggle</p>
              <p className="text-2xs text-slate-400">Dim workspace elements for high-density reviewing.</p>
            </div>

            <button
              onClick={onToggleDarkMode}
              className="p-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-200 transition"
              title="Toggle Dark Mode"
            >
              {darkMode ? <Sun className="w-4 h-4 text-amber-500 animate-spin" /> : <Moon className="w-4 h-4 text-blue-600" />}
            </button>
          </div>
        </div>

        {/* Custom Color Overrides Palette */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            Interactive Custom Palette
          </h3>

          <div className="space-y-3 text-xs text-slate-650 dark:text-slate-350">
            <div className="flex items-center justify-between">
              <span className="font-semibold">App Background Color:</span>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={customBgColor || (darkMode ? '#0f172a' : '#f8fafc')}
                  onChange={e => onUpdateCustomColors(e.target.value, customTxtColor, customWordColor, customTxtBgColor, customChartTooltipBgColor)}
                  className="w-8 h-6 rounded border-none cursor-pointer bg-transparent"
                  title="Choose dynamic application background color"
                />
                {(customBgColor) && (
                  <button
                    type="button"
                    onClick={() => onUpdateCustomColors('', customTxtColor, customWordColor, customTxtBgColor, customChartTooltipBgColor)}
                    className="text-[10px] text-red-500 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-semibold">Text Background Color:</span>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={customTxtBgColor || (darkMode ? '#1e293b' : '#ffffff')}
                  onChange={e => onUpdateCustomColors(customBgColor, customTxtColor, customWordColor, e.target.value, customChartTooltipBgColor)}
                  className="w-8 h-6 rounded border-none cursor-pointer bg-transparent"
                  title="Choose custom background color specifically for text inputs, tables, and card containers"
                />
                {(customTxtBgColor) && (
                  <button
                    type="button"
                    onClick={() => onUpdateCustomColors(customBgColor, customTxtColor, customWordColor, '', customChartTooltipBgColor)}
                    className="text-[10px] text-red-500 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-semibold">Body Text Color:</span>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={customTxtColor || (darkMode ? '#f1f5f9' : '#0f1721')}
                  onChange={e => onUpdateCustomColors(customBgColor, e.target.value, customWordColor, customTxtBgColor, customChartTooltipBgColor)}
                  className="w-8 h-6 rounded border-none cursor-pointer bg-transparent"
                  title="Choose custom body text color"
                />
                {(customTxtColor) && (
                  <button
                    type="button"
                    onClick={() => onUpdateCustomColors(customBgColor, '', customWordColor, customTxtBgColor, customChartTooltipBgColor)}
                    className="text-[10px] text-red-500 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-semibold">Text & Word Color Selection:</span>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={customWordColor || (darkMode ? '#3b82f6' : '#1e3a8a')}
                  onChange={e => onUpdateCustomColors(customBgColor, customTxtColor, e.target.value, customTxtBgColor, customChartTooltipBgColor)}
                  className="w-8 h-6 rounded border-none cursor-pointer bg-transparent"
                  title="Choose custom text & word highlights and headers color"
                />
                {(customWordColor) && (
                  <button
                    type="button"
                    onClick={() => onUpdateCustomColors(customBgColor, customTxtColor, '', customTxtBgColor, customChartTooltipBgColor)}
                    className="text-[10px] text-red-500 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-semibold">Chart Tooltip / Selection Label BG:</span>
              <div className="flex items-center gap-2">
                <input 
                  type="color" 
                  value={customChartTooltipBgColor || '#0f172a'}
                  onChange={e => onUpdateCustomColors(customBgColor, customTxtColor, customWordColor, customTxtBgColor, e.target.value)}
                  className="w-8 h-6 rounded border-none cursor-pointer bg-transparent"
                  title="Choose custom background color for chart tooltips"
                />
                {(customChartTooltipBgColor) && (
                  <button
                    type="button"
                    onClick={() => onUpdateCustomColors(customBgColor, customTxtColor, customWordColor, customTxtBgColor, '')}
                    className="text-[10px] text-red-500 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 dark:border-slate-750 pt-2 flex justify-end">
              <button
                type="button"
                onClick={onResetCustomColors}
                className="text-[10px] bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 px-2.5 py-1 rounded-lg font-bold transition"
              >
                Reset Colors
              </button>
            </div>
          </div>
        </div>

        {/* Ambient Graphics Configs */}
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-yellow-500" />
            Ambient Workspace Graphics
          </h3>

          <div className="space-y-3.5 text-xs text-slate-650 dark:text-slate-350">
            <div className="flex items-center justify-between">
              <label htmlFor="color-node" className="font-semibold">Node Color Network:</label>
              <input 
                id="color-node"
                type="color" 
                value={vantaColor}
                onChange={e => onUpdateVanta(e.target.value, vantaBgColor, vantaPoints)}
                className="w-10 h-7 rounded border-none cursor-pointer bg-transparent"
              />
            </div>

            <div className="flex items-center justify-between">
              <label htmlFor="color-workspace" className="font-semibold">Workspace Background:</label>
              <input 
                id="color-workspace"
                type="color" 
                value={vantaBgColor}
                onChange={e => onUpdateVanta(vantaColor, e.target.value, vantaPoints)}
                className="w-10 h-7 rounded border-none cursor-pointer bg-transparent"
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between font-semibold">
                <label htmlFor="range-density">Particle Network Density:</label>
                <span className="font-mono">{vantaPoints} pts</span>
              </div>
              <input 
                id="range-density"
                type="range" 
                min="5" 
                max="25" 
                value={vantaPoints}
                onChange={e => onUpdateVanta(vantaColor, vantaBgColor, parseInt(e.target.value, 10))}
                className="w-full accent-blue-600 cursor-pointer h-1 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none"
              />
            </div>

            <div className="border-t border-slate-100 dark:border-slate-750 pt-3 flex justify-end">
              <button
                onClick={onResetVanta}
                className="flex items-center gap-1 text-2xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 py-1.5 rounded-lg font-bold transition"
              >
                <RefreshCcw className="w-3.5 h-3.5" />
                Reset Defaults
              </button>
            </div>
          </div>
        </div>

      </div>



    </div>
  );
}
