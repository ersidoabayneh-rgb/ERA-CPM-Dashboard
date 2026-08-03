import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  Search, 
  X, 
  Printer, 
  ChevronRight, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  Compass, 
  BarChart3, 
  Layers, 
  Landmark, 
  TrendingUp, 
  HardHat, 
  Scale, 
  Clock, 
  Sliders, 
  HelpCircle,
  Maximize2,
  Minimize2,
  Sparkles,
  Download
} from 'lucide-react';

interface UserGuideManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const USER_GUIDE_SECTIONS = [
  { id: 'sec-1', number: 1, title: 'Introduction & System Overview', category: 'Overview', icon: BookOpen },
  { id: 'sec-2', number: 2, title: 'Getting Started & Navigation', category: 'Navigation', icon: Compass },
  { id: 'sec-3', number: 3, title: 'Executive Dashboard', category: 'Analytics', icon: BarChart3 },
  { id: 'sec-4', number: 4, title: 'Project Information & Dossier', category: 'Core Data', icon: FileText },
  { id: 'sec-5', number: 5, title: 'Financial Data Management', category: 'Financials', icon: Landmark },
  { id: 'sec-6', number: 6, title: 'IPC Certificates & Billing Analytics', category: 'Financials', icon: TrendingUp },
  { id: 'sec-7', number: 7, title: 'Linear Progress Tracking', category: 'Physical Progress', icon: Layers },
  { id: 'sec-8', number: 8, title: 'Right-of-Way & Utilities Management', category: 'Site Management', icon: HardHat },
  { id: 'sec-9', number: 9, title: 'Progress Plan Comparisons', category: 'Benchmarking', icon: Scale },
  { id: 'sec-10', number: 10, title: 'Engineering Quantities & Conformance', category: 'Technical', icon: CheckCircle2 },
  { id: 'sec-11', number: 11, title: 'Bonds & Performance Guarantees', category: 'Compliance', icon: ShieldCheck },
  { id: 'sec-12', number: 12, title: 'Work Program & CPM Scheduling', category: 'Scheduling', icon: Clock },
  { id: 'sec-13', number: 13, title: 'S-Curve Analysis', category: 'Analytics', icon: TrendingUp },
  { id: 'sec-14', number: 14, title: 'KPI Audit Matrix', category: 'Compliance', icon: Scale },
  { id: 'sec-15', number: 15, title: 'Logistics & Resources', category: 'Operations', icon: HardHat },
  { id: 'sec-16', number: 16, title: 'Risk Management', category: 'Risk Control', icon: AlertTriangle },
  { id: 'sec-17', number: 17, title: 'Comprehensive Analysis & EVM', category: 'EVM & Audit', icon: BarChart3 },
  { id: 'sec-18', number: 18, title: 'Document Management', category: 'Dossier', icon: FileText },
  { id: 'sec-19', number: 19, title: 'Audit History & Snapshots', category: 'Audit Trail', icon: Clock },
  { id: 'sec-20', number: 20, title: 'Workspace Settings', category: 'Preferences', icon: Sliders },
  { id: 'sec-21', number: 21, title: 'Quick Reference & Troubleshooting', category: 'Support', icon: HelpCircle },
];

export default function UserGuideManualModal({ isOpen, onClose }: UserGuideManualModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSectionId, setActiveSectionId] = useState('sec-1');
  const [isMaximized, setIsMaximized] = useState(false);

  if (!isOpen) return null;

  const handleScrollToSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredSections = USER_GUIDE_SECTIONS.filter(sec => 
    sec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    sec.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    `section ${sec.number}`.includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden">
      
      {/* Print styles injection */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #user-guide-print-container, #user-guide-print-container * {
            visibility: visible;
          }
          #user-guide-print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 20px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col transition-all duration-300 ${
          isMaximized 
            ? 'w-full h-full rounded-none border-none' 
            : 'w-full max-w-6xl max-h-[92vh] h-[92vh]'
        }`}
      >
        
        {/* Header Bar */}
        <div className="no-print px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800 flex items-center justify-between gap-3 shrink-0 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 rounded-full">
                  OFFICIAL ERA ERP MANUAL
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Version 1.0 • August 2026
                </span>
              </div>
              <h2 className="text-sm md:text-base font-black tracking-tight text-white">
                ETHIOPIAN ROADS ADMINISTRATION — USER GUIDE MANUAL
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
              title="Print or Save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>

            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              title={isMaximized ? "Restore size" : "Maximize view"}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl transition font-bold"
              title="Close User Manual"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search & Jumper Bar */}
        <div className="no-print px-5 py-2.5 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800/80 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search user guide sections, steps, or features..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs font-bold outline-none text-slate-800 dark:text-zinc-200 focus:border-blue-500 transition"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
            <span className="text-[10px] font-extrabold uppercase text-slate-400 shrink-0">
              Quick Jump:
            </span>
            {USER_GUIDE_SECTIONS.slice(0, 7).map(sec => (
              <button
                key={sec.id}
                onClick={() => handleScrollToSection(sec.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold shrink-0 transition ${
                  activeSectionId === sec.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
                }`}
              >
                {sec.number}. {sec.title.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Modal Main Content Container */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Left Navigation Sidebar */}
          <div className="no-print hidden lg:block w-72 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 overflow-y-auto p-3 space-y-1 shrink-0">
            <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
              Table of Contents (21 Modules)
            </div>
            {filteredSections.map(sec => {
              const Icon = sec.icon;
              const isActive = activeSectionId === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => handleScrollToSection(sec.id)}
                  className={`w-full text-left p-2.5 rounded-xl transition flex items-center gap-2.5 text-xs font-bold group ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'hover:bg-slate-200/60 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <span className={`p-1.5 rounded-lg shrink-0 ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0 flex-1 leading-snug">
                    <div className="text-[9px] font-mono opacity-80 uppercase">Section {sec.number}</div>
                    <div className="truncate">{sec.title}</div>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition ${isActive ? 'opacity-100' : ''}`} />
                </button>
              );
            })}
          </div>

          {/* Right Scrollable Content Pane */}
          <div id="user-guide-print-container" className="flex-1 overflow-y-auto p-6 md:p-8 space-y-12 font-sans bg-white dark:bg-slate-900 text-slate-800 dark:text-zinc-200">
            
            {/* Title / Cover Banner */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 text-white p-8 rounded-3xl border border-slate-800 shadow-xl space-y-6">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-full text-2xs font-extrabold uppercase tracking-widest">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
                  Ethiopian Roads Administration
                </div>
                <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
                  Construction Project Management ERP
                </h1>
                <p className="text-base font-black text-amber-400 uppercase tracking-wide">
                  USER GUIDE MANUAL
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-950/60 rounded-2xl border border-slate-800 text-2xs">
                <div>
                  <span className="text-slate-400 block font-bold uppercase text-[9px]">Project Name</span>
                  <span className="font-extrabold text-white text-xs">Daye-Girja-Melka Desta & Meleya-Mejo Spur</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold uppercase text-[9px]">Client / Employer</span>
                  <span className="font-bold text-slate-200">Ethiopian Roads Administration</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold uppercase text-[9px]">Main Contractor</span>
                  <span className="font-bold text-slate-200">China Tisiju Civil Engineering Group</span>
                </div>
                <div>
                  <span className="text-slate-400 block font-bold uppercase text-[9px]">Classification & Method</span>
                  <span className="font-bold text-amber-300">DS-4 | Design-Bid-Build (DBB)</span>
                </div>
              </div>

              <p className="text-2xs text-slate-300 leading-relaxed font-medium">
                Comprehensive step-by-step guide for project managers, auditors, resident engineers, program directors, and system administrators.
              </p>
            </div>

            {/* Table of Contents Summary Grid */}
            <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-zinc-200 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-500" />
                TABLE OF CONTENTS
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 text-2xs">
                {USER_GUIDE_SECTIONS.map(sec => (
                  <button
                    key={sec.id}
                    onClick={() => handleScrollToSection(sec.id)}
                    className="p-2.5 bg-white dark:bg-slate-900 hover:border-blue-500 dark:hover:border-blue-500 rounded-xl border border-slate-200 dark:border-slate-800 text-left transition flex items-center justify-between group"
                  >
                    <span className="font-extrabold text-slate-700 dark:text-slate-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {sec.number}. {sec.title}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* SECTION 1 */}
            <section id="sec-1" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">1.0</span>
                <span>System Overview</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">1. Introduction & System Overview</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Welcome to the Ethiopian Roads Administration (ERA) Construction Project Management ERP. This integrated web-based platform provides real-time oversight of road construction projects from contract award through final completion.
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                The system consolidates financial tracking, physical progress monitoring, risk management, document control, and contractor audit compliance into a single executive workspace. It is designed for use by ERA program directors, project managers, resident engineers, auditors, and contractor representatives.
              </p>
              
              <div className="bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                <h4 className="text-xs font-extrabold uppercase text-slate-800 dark:text-zinc-200">Key Capabilities:</h4>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span><strong>Real-time Dashboards:</strong> Instant visibility into project progress, cost performance (CPI), and schedule performance (SPI).</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span><strong>Financial Control:</strong> Track original and revised contract amounts, IPC certificates, advance payments, and retention guarantees.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span><strong>Physical Progress:</strong> Monitor linear construction layers (sub-grade, capping, sub-base, base-course, asphalt concrete) against station-based chainage maps.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span><strong>Schedule Integration:</strong> Import and visualize Critical Path Method (CPM) schedules with interactive Gantt charts.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span><strong>Risk & Compliance:</strong> Register hazards, compute exposure indices, and audit contractor KPIs against G1–G8 grading criteria.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-500 font-bold">•</span>
                    <span><strong>Document Vault:</strong> Securely store FIDIC contracts, drawings, monthly reports, and variation orders.</span>
                  </li>
                </ul>
              </div>
            </section>

            {/* SECTION 2 */}
            <section id="sec-2" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">2.0</span>
                <span>Getting Started</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">2. Getting Started & Navigation</h2>
              
              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <strong className="text-blue-600 dark:text-blue-400">Step 1 — Access the System:</strong> Open your web browser and navigate to the ERA ERP portal. Log in using your assigned credentials. The system supports both desktop and mobile responsive views.
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <strong className="text-blue-600 dark:text-blue-400">Step 2 — Select an Active Contract:</strong> From the <em>Active Contracts</em> screen, locate your project card. Each card displays the contract name, client, contractor, total length, budget, and physical progress percentage. Click the card to enter the workspace.
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <strong className="text-blue-600 dark:text-blue-400">Step 3 — Understand the Header:</strong> Every workspace page shares a common header showing: Contract Selection breadcrumb, Client / Contractor name, DS Classification, Approval status, and action buttons (Save to Database, Profile, Collaborate, Approvals, Admin, Logout).
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <strong className="text-blue-600 dark:text-blue-400">Step 4 — Use the Icon Navigation Bar:</strong> Below the project summary card, a row of icon tabs lets you switch between modules: Dashboard, Financial Data, Linear Diagram, Utilities & ROW, Progress Comparisons, Quantities Log, Bonds, Work Program CPM, Monthly Cumulative, KPIs, Logistics & Resources, Project Risks, Comprehensive Analysis, Documentation, History, and Settings.
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                  <strong className="text-blue-600 dark:text-blue-400">Step 5 — Project Summary Card:</strong> The white card at the top of every page displays the Original Contract Amount, Revised Contract Amount, Commencement Date (e.g., December 29, 2020), Revised Completion Date (e.g., Dec 28, 2025), and Project Delivery Method (Design-Bid-Build).
                </div>
              </div>
            </section>

            {/* SECTION 3 */}
            <section id="sec-3" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">3.0</span>
                <span>Executive Dashboard</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">3. Executive Dashboard</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                The Project Executive Dashboard is your command center. It opens by default when you enter a contract workspace and provides an at-a-glance health assessment.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <h4 className="font-extrabold text-slate-800 dark:text-zinc-200 uppercase">Critical Alerts & Gauges</h4>
                  <ul className="space-y-1.5 text-slate-600 dark:text-slate-400 font-medium">
                    <li>• <strong>Critical Alerts Banner:</strong> Red warning panel displays urgent issues such as expired bank guarantees, overdue IPC payments, or critical schedule variances.</li>
                    <li>• <strong>Project Progress:</strong> Current physical completion percentage (e.g., 64.08%).</li>
                    <li>• <strong>Elapsed Time:</strong> Percentage of the revised contract duration that has passed (e.g., 100.00%).</li>
                    <li>• <strong>Progress vs Elapsed Time:</strong> Direct comparison showing whether project is ahead or behind the time curve.</li>
                  </ul>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <h4 className="font-extrabold text-slate-800 dark:text-zinc-200 uppercase">EVM Indices & Payment Cards</h4>
                  <ul className="space-y-1.5 text-slate-600 dark:text-slate-400 font-medium">
                    <li>• <strong>CPI (Cost Performance Index):</strong> Values &lt; 1.0 indicate cost overrun (e.g., 0.59 with 40.94% deficit).</li>
                    <li>• <strong>SPI (Schedule Performance Index):</strong> Values &lt; 1.0 indicate schedule lag (e.g., 0.64 with 35.92% lag).</li>
                    <li>• <strong>Matured Overdue Payments:</strong> Total certified amounts past maturity window (e.g., Br. 179,574,162.05).</li>
                    <li>• <strong>Total Outstanding Balance:</strong> Sum of all unpaid certified claims (e.g., Br. 181,174,743.48).</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* SECTION 4 */}
            <section id="sec-4" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">4.0</span>
                <span>Project Dossier</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">4. Project Information & Dossier</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Click <strong>SHOW DETAILS</strong> on the header card to expand the full Project Information dossier. This panel is read-only for standard users and editable only by administrators.
              </p>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <p>• <strong>Project Stakeholders:</strong> Client/Employer (ERA), Supervising Consultant (LEA Associates South Asia JV), Main Contractor (China Tisiju Civil Engineering Group), Program Directorate & PMO Assignment links.</p>
                <p>• <strong>Milestones & Durations:</strong> Contract Signing Date, Commencement Date, Original Days, Approved EOT, Interim EOT. Revised Completion Date is auto-calculated: <em>Commencement + Original Duration + Approved EOT + Interim EOT</em>.</p>
                <p>• <strong>Financial Cost Outlay:</strong> Original Contract Amount (e.g., Br. 1,555,708,167.88), Approved Variations (e.g., Br. 72,163,600.00), Revised Contract Amount (e.g., Br. 1,627,871,767.88).</p>
                <p>• <strong>Physical & Legal Framework:</strong> Total Section Length (65.00 Km), Roadway Classification (DS-4), Project Delivery Method (Design-Bid-Build).</p>
                <p className="text-blue-600 dark:text-blue-400 font-bold">Step-by-Step: To edit the dossier, click the pencil icon in the header, modify fields, and click Save to Database. All changes are logged in the audit trail.</p>
              </div>
            </section>

            {/* SECTION 5 */}
            <section id="sec-5" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">5.0</span>
                <span>Financial Data</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">5. Financial Data Management</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                The Financial Data module provides deep insight into contract valuation, work execution, and cost trends.
              </p>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <h4 className="font-extrabold uppercase text-slate-800 dark:text-zinc-200">BOQ Divisions Tracked:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>• Code 1000: General</div>
                    <div>• Code 2000: Site Clearance</div>
                    <div>• Code 3000: Drainage</div>
                    <div>• Code 4000: Earthworks</div>
                    <div>• Code 5100: Sub-Base</div>
                    <div>• Code 5200: Base Course</div>
                    <div>• Code 6000: Bituminous Surfacing</div>
                    <div>• Code 7000: Structures</div>
                    <div>• Code 9000: Ancillary Works</div>
                    <div>• Code 11000: Day Works</div>
                  </div>
                </div>

                <p>• <strong>Auto-Calculations:</strong> Automatically computes: A) Total Series Item Sum, B) Provisional Sum Deduction, C) Base Amount, D) 10% Contingency Addition, and E) Sum Sub-Total with overall progress percentage.</p>
                <p className="text-blue-600 dark:text-blue-400 font-bold">Step-by-Step Editing: Click into any 'To-Date Executed' field, enter the certified quantity in Birr, and press Tab. The Progress % column updates instantly. Click + Add Item Code to register new BOQ divisions.</p>
              </div>
            </section>

            {/* SECTION 6 */}
            <section id="sec-6" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">6.0</span>
                <span>IPC Billing</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">6. IPC Certificates & Billing Analytics</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                The billing dashboard tracks Interim Payment Certificates (IPCs) and cumulative financial execution.
              </p>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <p>• <strong>Summary KPIs:</strong> Total Bill Summary, Total Price Adjustment, Total Certified Net (e.g., Br. 1614.06M), IPC Certificates Count (e.g., 43 Statements).</p>
                <p>• <strong>Cumulative Charts:</strong> A dual-axis line chart plots Cumulative Bill Summary, Cumulative Net Certified, Cumulative Price Adjustment, Monthly Bill Summary, and Monthly Price Adjustment across all IPC periods (IPC No. 1 through IPC No. 43).</p>
                <p>• <strong>Financial Elevation Map:</strong> Bar visualization showing proportional consumption of Advance Payment (20.00%), Mobilization (20.00%), Monthly Bill Summary, Total Certified Net, and Retention.</p>
                <p>• <strong>Live S-Curve Map:</strong> Compares Original Plan (%), Revised Plan (%), and To-Date Actual (%) over project timeline from Feb-2021 through Jun-2026.</p>
              </div>
            </section>

            {/* SECTION 7 */}
            <section id="sec-7" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">7.0</span>
                <span>Linear Progress</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">7. Linear Progress Tracking</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                The Linear Diagram module maps physical road construction progress against chainage stations along the corridor.
              </p>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <p>• <strong>Project Length Interconnection:</strong> Define Total Project Length (65 Km), Main Road Target (56.2 Km at 86.5%), and Spur Road Target (8.8 Km at 13.5%).</p>
                <p>• <strong>Capping Layers Toggle:</strong> Enable or disable capping layers in the design. When enabled, capping progress appears as a separate tier in all charts.</p>

                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <h4 className="font-extrabold uppercase text-slate-800 dark:text-zinc-200">Step-by-Step Data Entry:</h4>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Select the layer tab (Main Road or Spur Road).</li>
                    <li>Click <strong>+ Add</strong> next to the layer name.</li>
                    <li>Enter From Station (e.g., Km 0+000) and To Station (e.g., Km 29+000).</li>
                    <li>The Net (Km) field calculates automatically (e.g., 29.00).</li>
                    <li>Click <strong>Save to Database</strong> to sync changes with Executive Dashboard bars.</li>
                  </ol>
                </div>
              </div>
            </section>

            {/* SECTION 8 */}
            <section id="sec-8" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">8.0</span>
                <span>Utilities & ROW</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">8. Right-of-Way & Utilities Management</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Tracks land acquisition, compensation disbursement, and utility relocation — critical enablers for uninterrupted construction.
              </p>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <p>• <strong>11-Parameter Relocation Table:</strong> Project Length (65 Km), ROW Request (61.42 Km), Measurement Complete (61.56 Km), Document Sent ERA (51.3 Km), ROW Obstruction Free (53.23 Km), Compensation Paid (43.33 Km), Unpaid Section (17.23 Km), Material Sources (19 Requested / 15 Handed Over), Electric Poles (466 Requested / 298 Handed Over).</p>
                <p>• <strong>ROW Compensation & PAP Tracker:</strong> Total Required Budget (Br. 2,233,333.02 M), Total Paid to Date (Br. 2,132,339.77 M), Remaining Liability (Br. 100,993.25 M), Impacted PAPs (7 Persons). Tracked by Woreda/Location.</p>
                <p>• <strong>Utilities & Section Tracker:</strong> Public infrastructure (electricity, telecom, water) and ROW sections defined by From/To chainage, Length, and Handover status.</p>
              </div>
            </section>

            {/* SECTION 9 */}
            <section id="sec-9" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">9.0</span>
                <span>Progress Comparisons</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">9. Progress Plan Comparisons</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Benchmarks actual physical achievement against contractor schedules and ERA internal milestone plans.
              </p>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <p>• <strong>Three Plan Tiers:</strong> 1) Contractor Program Schedule, 2) ERA Internal Milestone Plan, 3) Actual Road Completed (TODATE).</p>
                <p>• <strong>Time Dimensions:</strong> Month (e.g., Dec 2025), Quarterly Range (e.g., Apr-Jun 2026), EFY (EFY 2018), and Cumulative.</p>
                
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <h4 className="font-extrabold uppercase text-slate-800 dark:text-zinc-200">Step-by-Step Archiving (Historical Record):</h4>
                  <ol className="list-decimal pl-4 space-y-1">
                    <li>Verify Month Label (e.g., Dec 2025) and EFY Label (e.g., 2018).</li>
                    <li>Review Loaded Targets to Save.</li>
                    <li>Click <strong>Keep Elapsed Record</strong> to commit snapshot to audit trail.</li>
                    <li>View all archived records in the Elapsed Months & EFY Records List below.</li>
                  </ol>
                </div>
              </div>
            </section>

            {/* SECTION 10 */}
            <section id="sec-10" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">10.0</span>
                <span>Engineering Quantities</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">10. Engineering Quantities & Conformance</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Correlates design volumes with planned scheduling and actual contractor execution. Serves as technical backbone for IPC certification.
              </p>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <p>• <strong>Columns Tracked:</strong> Item Description, Design Drawings Qty, Program Scheduled Plan, To-Date Contractor Executed, % Plan Conformance.</p>
                <p>• <strong>Color-Coded Conformance:</strong> Green = Conformant (&gt;100% or healthy), Yellow = Caution, Red = Lagging.</p>
                <p>• <strong>Examples:</strong> Site Clearing: 103.63% (ahead), Common Excavation: 95.59% (healthy), Embankment/Fill: 68.05% (lagging), Box Culvert: 0.00% (not started).</p>
                <p className="text-blue-600 dark:text-blue-400 font-bold">Step-by-Step: Click + Add or edit inline. Quantity changes automatically update Executive Dashboard bars and S-Curve charts.</p>
              </div>
            </section>

            {/* SECTION 11 */}
            <section id="sec-11" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">11.0</span>
                <span>Guarantees & Securities</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">11. Bonds & Performance Guarantees</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Manages all bank guarantees and securities required under FIDIC contract conditions.
              </p>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <p>• <strong>Performance Guarantee:</strong> Commercial Bank, Br. 155,570,816.79 ETB / $1,350,000.00 USD. Status: Active & Valid.</p>
                <p>• <strong>Advance Payment Guarantee:</strong> Awash Bank, Br. 242,100,998.82 ETB / $2,100,000.00 USD. Status: Fully Amortized / Recovered.</p>
                <p>• <strong>Retention Money Guarantee:</strong> Nib International, Br. 50,000,000.00 ETB / $435,000.00 USD. Status: Active & Valid (Expires 01/15/2027).</p>
                
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 rounded-xl border border-amber-200 dark:border-amber-900/50">
                  <strong>Critical Monitoring:</strong> The system automatically flags guarantees expiring within 45 days. A red CRITICAL BANK SECURITY & GUARANTEE WARNING banner appears on Executive Dashboard when action is required.
                </div>
              </div>
            </section>

            {/* SECTION 12 */}
            <section id="sec-12" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">12.0</span>
                <span>CPM Scheduling</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">12. Work Program & CPM Scheduling</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Enables Critical Path Method scheduling with interactive Gantt charts and Activity-On-Node (AON) network diagrams.
              </p>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <p>• <strong>CSV Schedule Import:</strong> Bulk upload via CSV with required columns: ID, Name, Duration, Predecessors, Lag, SequenceType.</p>
                <p>• <strong>CPM Analytics:</strong> Total duration days (e.g., 572d), Critical path zero-float tasks (e.g., 8 tasks), Total scheduled activities (e.g., 9 total), CPM Synchronized health check.</p>
                <p>• <strong>Gantt Color Coding:</strong> Red bars = Critical Activity (Zero Float), Blue bars = Sub-Critical Activity, Yellow hashed = Task Float Space (buffer allowance).</p>
              </div>
            </section>

            {/* SECTION 13 */}
            <section id="sec-13" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">13.0</span>
                <span>S-Curve Analysis</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">13. S-Curve Analysis</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Tracks time-phased progress using S-Curve methodology — comparing planned versus actual progress over time.
              </p>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <p>• <strong>Table Columns:</strong> Month-Year (calendar picker), Original Plan %, Revised Plan %, Actual %.</p>
                <p>• <strong>Step-by-Step:</strong> 1) Select date from calendar, 2) Enter Original Plan %, 3) Enter Revised Plan %, 4) Enter Actual %, 5) Click Save to Database. Executive Dashboard S-Curve updates automatically.</p>
              </div>
            </section>

            {/* SECTION 14 */}
            <section id="sec-14" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">14.0</span>
                <span>Contractor Audit</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">14. KPI Audit Matrix</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Implements the ERA Contract Audit KPI Matrix for standardized contractor performance grading.
              </p>

              <div className="space-y-3 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <p>• <strong>12 Category Groups:</strong> Physical Progress, Progress vs Elapsed Time, Cost Management, Time Management, Quality Management, Design Management (DBB), Claim & Dispute, Risk Management, ESOSH Management, ROW Management, Stakeholder Management, Contract Compliance.</p>
                <p>• <strong>Contractor Grade:</strong> Select grade profile (e.g. G1 Contractor) to auto-adjust weight distribution.</p>
                <p>• <strong>Sub-Scores & Goal Score:</strong> Sub-scores (e.g. PP-1 Planned vs actual physical completion: 64.08/100; MS-1 through MS-17 milestone achievement criteria) roll up automatically into a Goal Score (e.g., 85.02% for Physical Progress).</p>
              </div>
            </section>

            {/* SECTION 15 */}
            <section id="sec-15" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">15.0</span>
                <span>Fleet & Supply</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">15. Logistics & Resources</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Tracks equipment fleets, human resources, material production, and external supply chains in real time.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium text-slate-600 dark:text-slate-300">
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <h4 className="font-extrabold uppercase text-slate-800 dark:text-zinc-200">Equipment Mobilization Status</h4>
                  <p>• Asphalt Paver: Plan 3 | Available 2 | Deficiency 1</p>
                  <p>• Motor Grader: Plan 8 | Revised 10 | Available 9 | Deficiency 1</p>
                  <p>• Excavator: Plan 6 | Revised 7 | Available 7 | Deficiency 0</p>
                  <p>• Dump Trucks: Plan 45 | Revised 50 | Available 42 | Deficiency 8</p>
                  <p>• Aggregate Crusher: Plan 2 | Available 2 | Deficiency 0</p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <h4 className="font-extrabold uppercase text-slate-800 dark:text-zinc-200">Materials & Personnel</h4>
                  <p>• <strong>Own Production:</strong> Concrete Aggregate, Base Course, Asphalt Aggregate.</p>
                  <p>• <strong>External Supply:</strong> Bitumen, Cement, Fuel, Rebar.</p>
                  <p>• <strong>Key Personnel:</strong> Technical experts, admin officers, site engineers with duty details.</p>
                </div>
              </div>
            </section>

            {/* SECTION 16 */}
            <section id="sec-16" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">16.0</span>
                <span>Risk Management</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">16. Risk Management</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Provides a quantitative approach to hazard identification, exposure calculation, and mitigation tracking.
              </p>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <p>• <strong>Risk Header:</strong> Active Risks (6 registered), Exposure Index (13.50 sum), Mean Severity out of 25 maximum.</p>
                <p>• <strong>Primary Critical Threat:</strong> Right of Way — Delays in clearing electric poles, water mains, and high compensation demands stalling earthworks.</p>
                <p>• <strong>5x5 Risk Matrix:</strong> Visualizes risk probability (1-5) vs impact (1-5). Color zones: Low (1-7), Moderate (8-15), Critical (16-25).</p>
                <p>• <strong>G8 KPI Integration:</strong> Dynamically links risk register updates, escalation, and mitigation sub-scores to the G8 Audit Index.</p>
              </div>
            </section>

            {/* SECTION 17 */}
            <section id="sec-17" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">17.0</span>
                <span>EVM & Dual Audit</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">17. Comprehensive Analysis & EVM</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Delivers Earned Value Management (EVM) computations and a dual-perspective schedule audit comparing CPM logic against linear physical progress.
              </p>

              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 text-xs">
                <h4 className="font-extrabold uppercase text-slate-800 dark:text-zinc-200">EVM Metric Computations Table (Birr):</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 dark:text-slate-300 font-mono">
                  <div>• BAC: Br. 1,555,708,167.88</div>
                  <div>• PV: Br. 1,555,708,167.88</div>
                  <div>• EV: Br. 1,081,614,447.39</div>
                  <div>• AC: Br. 1,687,912,683.20</div>
                  <div>• CV: (Br. 606,298,235.80) Negative = Overrun</div>
                  <div>• SV: (Br. 474,093,720.48) Negative = Delay</div>
                  <div>• EAC: Br. 2,427,759,313.17</div>
                  <div>• VAC: (Br. 872,051,145.29)</div>
                  <div>• TCPI: 1.000</div>
                  <div>• CPI = 0.641 (Overspending)</div>
                  <div>• SPI = 0.695 (Delayed ~70% target)</div>
                </div>
              </div>
            </section>

            {/* SECTION 18 */}
            <section id="sec-18" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">18.0</span>
                <span>Document Vault</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">18. Document Management</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Serves as the project's secure document vault for contract records, engineering drawings, and monthly progress reports.
              </p>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <p>• <strong>Supported Formats:</strong> PDF, Word, Excel, Images, ZIP.</p>
                <p>• <strong>Classification Categories:</strong> 1) Contract & Legal Documents, 2) Engineering Drawings & Designs, 3) Monthly Progress Reports, 4) Variation Orders & Claims, 5) Correspondence & Memos.</p>
                <p>• <strong>Best Practice:</strong> Upload monthly progress reports within 7 days of reporting period end to maintain audit compliance.</p>
              </div>
            </section>

            {/* SECTION 19 */}
            <section id="sec-19" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">19.0</span>
                <span>Audit & History</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">19. Audit History & Snapshots</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Maintains an immutable ledger of project changes, performance snapshots, and threshold alerts for fiduciary audit and control.
              </p>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <p>• <strong>Save Milestone Snapshot:</strong> Captures full project state (quantities, schedules, financials) before major BOQ variation orders or schedule revisions.</p>
                <p>• <strong>Vigilance Alerts Center:</strong> Live monitoring generates Critical alerts and Warnings for CPI overrun (&lt;0.90), SV schedule variance (&gt;10%), velocity retardation (SPI &lt;0.90), unsecured escrows (&lt;45d), ROW property dispute redzone (&gt;5km), and overdue certified IPC balances (FIDIC Clause 14.8 interest triggers).</p>
              </div>
            </section>

            {/* SECTION 20 */}
            <section id="sec-20" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">20.0</span>
                <span>Settings</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">20. Workspace Settings</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                Allows users to personalize the ERP interface for optimal viewing comfort and visual density.
              </p>

              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                <p>• <strong>Interface Theme Mode:</strong> Switch between Dark UI (default, recommended for high-density reviewing) and Light UI.</p>
                <p>• <strong>Custom Palette:</strong> Customize App Background, Text Background, Body Text Color, Highlight Color, and Tooltip BG.</p>
                <p>• <strong>Ambient Graphics:</strong> Particle network density slider (0 to 30+ points), backdrop mode, and node color network settings. Saved per user profile.</p>
              </div>
            </section>

            {/* SECTION 21 */}
            <section id="sec-21" className="space-y-4 scroll-mt-20 pt-4 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-blue-600 dark:text-blue-400">
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950 rounded-md">21.0</span>
                <span>Reference & Support</span>
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white">21. Quick Reference & Troubleshooting</h2>
              
              <div className="space-y-4 text-xs font-medium">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-slate-200 dark:border-slate-800 text-2xs">
                    <thead>
                      <tr className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-300 font-extrabold uppercase">
                        <th className="p-2 border border-slate-200 dark:border-slate-800">Module Name</th>
                        <th className="p-2 border border-slate-200 dark:border-slate-800">Core Purpose</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-slate-600 dark:text-slate-400">
                      <tr><td className="p-2 font-bold border border-slate-200 dark:border-slate-800">Dashboard</td><td className="p-2 border border-slate-200 dark:border-slate-800">Executive overview, gauges, EVM, payments, linear progress</td></tr>
                      <tr><td className="p-2 font-bold border border-slate-200 dark:border-slate-800">Financial Data</td><td className="p-2 border border-slate-200 dark:border-slate-800">BOQ divisions, cost trends, contract amounts</td></tr>
                      <tr><td className="p-2 font-bold border border-slate-200 dark:border-slate-800">Linear Diagram</td><td className="p-2 border border-slate-200 dark:border-slate-800">Chainage-based pavement layer progress mapping</td></tr>
                      <tr><td className="p-2 font-bold border border-slate-200 dark:border-slate-800">Utilities & ROW</td><td className="p-2 border border-slate-200 dark:border-slate-800">Land compensation, utility relocation, PAP tracking</td></tr>
                      <tr><td className="p-2 font-bold border border-slate-200 dark:border-slate-800">Progress Comparisons</td><td className="p-2 border border-slate-200 dark:border-slate-800">Contractor vs ERA plan vs actual mileage benchmarks</td></tr>
                      <tr><td className="p-2 font-bold border border-slate-200 dark:border-slate-800">Quantities Log</td><td className="p-2 border border-slate-200 dark:border-slate-800">Design vs planned vs executed engineering quantities</td></tr>
                      <tr><td className="p-2 font-bold border border-slate-200 dark:border-slate-800">Bonds</td><td className="p-2 border border-slate-200 dark:border-slate-800">Bank guarantees, performance bonds, retention securities</td></tr>
                      <tr><td className="p-2 font-bold border border-slate-200 dark:border-slate-800">Work Program CPM</td><td className="p-2 border border-slate-200 dark:border-slate-800">Gantt charts, critical path, schedule import</td></tr>
                      <tr><td className="p-2 font-bold border border-slate-200 dark:border-slate-800">Monthly Cumulative</td><td className="p-2 border border-slate-200 dark:border-slate-800">S-Curve data entry, original/revised/actual %</td></tr>
                      <tr><td className="p-2 font-bold border border-slate-200 dark:border-slate-800">KPIs</td><td className="p-2 border border-slate-200 dark:border-slate-800">Contract audit matrix, milestone scoring, weight management</td></tr>
                      <tr><td className="p-2 font-bold border border-slate-200 dark:border-slate-800">Logistics & Resources</td><td className="p-2 border border-slate-200 dark:border-slate-800">Equipment, personnel, material production, supply chain</td></tr>
                      <tr><td className="p-2 font-bold border border-slate-200 dark:border-slate-800">Project Risks</td><td className="p-2 border border-slate-200 dark:border-slate-800">Hazard register, probability/impact matrix, exposure index</td></tr>
                      <tr><td className="p-2 font-bold border border-slate-200 dark:border-slate-800">Comprehensive Analysis</td><td className="p-2 border border-slate-200 dark:border-slate-800">EVM computations, CPM vs linear dual audit</td></tr>
                      <tr><td className="p-2 font-bold border border-slate-200 dark:border-slate-800">Documentation</td><td className="p-2 border border-slate-200 dark:border-slate-800">Contract vault, upload, classification, archive search</td></tr>
                      <tr><td className="p-2 font-bold border border-slate-200 dark:border-slate-800">History</td><td className="p-2 border border-slate-200 dark:border-slate-800">Snapshots, audit logs, performance dashboard, alerts</td></tr>
                      <tr><td className="p-2 font-bold border border-slate-200 dark:border-slate-800">Settings</td><td className="p-2 border border-slate-200 dark:border-slate-800">Theme, colors, ambient graphics, density preferences</td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <h4 className="font-extrabold uppercase text-slate-800 dark:text-zinc-200">Troubleshooting Tips:</h4>
                  <ul className="space-y-2 text-slate-600 dark:text-slate-300 font-medium">
                    <li>• <strong>Dashboard not updating?</strong> Click <em>Save to Database</em> after editing any module. Changes propagate to the Executive Dashboard within seconds.</li>
                    <li>• <strong>Images not loading in Linear Diagram?</strong> Ensure your browser zoom is set to 100%. The canvas renderer is sensitive to zoom levels above 150%.</li>
                    <li>• <strong>CPM import failing?</strong> Verify your CSV uses comma delimiters and includes headers: ID, Name, Duration, Predecessors, Lag, SequenceType. Dates must be in YYYY-MM-DD format.</li>
                    <li>• <strong>Can't see a module tab?</strong> Contact your system administrator to verify your role permissions. Some tabs (e.g., Admin, Approvals) are restricted.</li>
                    <li>• <strong>Bank guarantee warning persists after renewal?</strong> Edit the guarantee record, update the expiry date, and change status to 'Valid'. The alert clears automatically.</li>
                    <li>• <strong>Need to export data?</strong> Use the browser's Print to PDF function on any table, or click the download icons where available in the Data Table views.</li>
                  </ul>
                </div>
              </div>

              <div className="text-center pt-8 text-2xs text-slate-400 font-mono">
                End of User Guide Manual — Ethiopian Roads Administration Construction Project Management ERP (v1.0)
              </div>
            </section>

          </div>
        </div>

      </motion.div>
    </div>
  );
}
