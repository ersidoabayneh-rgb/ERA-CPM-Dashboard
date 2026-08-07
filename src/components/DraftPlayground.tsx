import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Database, FileText, AlertTriangle, CheckCircle, RefreshCw, 
  Trash2, HelpCircle, Save, Layers, Play, Clock, Sparkles, X, Wifi, WifiOff
} from 'lucide-react';
import { useFormDraft } from '../hooks/useFormDraft';

interface DraftPlaygroundProps {
  onClose: () => void;
  currentUser: { username: string; role: string } | null;
}

// Interfaces for Form 1: Project Proposal
interface ProjectProposalData {
  routeName: string;
  contractor: string;
  lengthKm: string;
  estCost: string;
  startDate: string;
  comments: string;
}

const defaultProposal: ProjectProposalData = {
  routeName: '',
  contractor: '',
  lengthKm: '',
  estCost: '',
  startDate: '',
  comments: '',
};

// Interfaces for Form 2: Risk Assessment
interface RiskAssessmentData {
  category: string;
  description: string;
  probability: string; // "Low" | "Medium" | "High"
  impact: string; // "1" - "5"
  mitigation: string;
}

const defaultRisk: RiskAssessmentData = {
  category: 'Environmental',
  description: '',
  probability: 'Medium',
  impact: '3',
  mitigation: '',
};

// Interfaces for Form 3: PMO Notification Composer
interface PmoBroadcastData {
  subject: string;
  audience: string;
  body: string;
  priority: string; // "Normal" | "Urgent" | "Critical"
}

const defaultBroadcast: PmoBroadcastData = {
  subject: '',
  audience: 'All Engineers',
  body: '',
  priority: 'Normal',
};

export default function DraftPlayground({ onClose, currentUser }: DraftPlaygroundProps) {
  const [activeTab, setActiveTab] = useState<'proposal' | 'risk' | 'broadcast'>('proposal');
  const [networkSimulation, setNetworkSimulation] = useState<boolean>(true); // online by default
  const [lastSubmissionMessage, setLastSubmissionMessage] = useState<string | null>(null);

  // Hook 1: Project Proposal Form
  const proposalDraft = useFormDraft<ProjectProposalData>({
    formId: 'project_proposal',
    initialValues: defaultProposal,
    debounceMs: 400,
    serverDebounceMs: 1500,
  });

  // Hook 2: Risk Assessment Form
  const riskDraft = useFormDraft<RiskAssessmentData>({
    formId: 'risk_assessment',
    initialValues: defaultRisk,
    debounceMs: 400,
    serverDebounceMs: 1500,
  });

  // Hook 3: PMO Notification Form
  const broadcastDraft = useFormDraft<PmoBroadcastData>({
    formId: 'pmo_broadcast',
    initialValues: defaultBroadcast,
    debounceMs: 400,
    serverDebounceMs: 1500,
  });

  // Get current active draft state depending on selected tab
  const getActiveDraftInfo = () => {
    switch (activeTab) {
      case 'proposal':
        return proposalDraft;
      case 'risk':
        return riskDraft;
      case 'broadcast':
        return broadcastDraft;
    }
  };

  const activeDraft = getActiveDraftInfo();

  // Handle Offline simulator: patch global fetch or block requests
  useEffect(() => {
    if (!networkSimulation) {
      // Intercept and fail drafts sync requests if simulator is offline
      const originalFetch = window.fetch;
      window.fetch = async (input, init) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : '';
        if (url.includes('/api/drafts')) {
          return Promise.reject(new TypeError('Network request failed (Simulation Offline Mode)'));
        }
        return originalFetch(input, init);
      };
      return () => {
        window.fetch = originalFetch;
      };
    }
  }, [networkSimulation]);

  // Simulate remote server modification to trigger conflict resolution dialog
  const triggerSimulatedConflict = async () => {
    if (!currentUser) {
      alert("Please login first to simulate server drafts.");
      return;
    }

    try {
      let mockData: any;
      if (activeTab === 'proposal') {
        mockData = {
          routeName: "Simulated Remote Highway Route",
          contractor: "China Road & Bridge Corp (Simulated)",
          lengthKm: "185",
          estCost: "450000000",
          startDate: "2026-10-01",
          comments: "This modification was simulated to mimic another device editing this draft from an iPad Pro."
        };
      } else if (activeTab === 'risk') {
        mockData = {
          category: "Geotechnical / Landslide",
          description: "High danger of mountain slope erosion at KM 45.",
          probability: "High",
          impact: "5",
          mitigation: "Install deep sheet piles and rock-anchor mesh system."
        };
      } else {
        mockData = {
          subject: "[CRITICAL DISPATCH] Highway Flood Warning System",
          audience: "All Active PMOs & Directors",
          body: "Immediate safety inspection required for bridges on section 3 due to active tropical storm warning.",
          priority: "Critical"
        };
      }

      // We call our special simulation route that will save a draft in the future to database
      const res = await fetch(`/api/drafts/${activeTab === 'proposal' ? 'project_proposal' : activeTab === 'risk' ? 'risk_assessment' : 'pmo_broadcast'}/simulate-conflict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data: mockData })
      });

      if (res.ok) {
        // Trigger a reload in the hook to fetch the newer server draft and fire conflict modal
        setTimeout(() => {
          activeDraft.reloadDraft();
        }, 300);
      } else {
        const err = await res.json();
        alert(`Failed to simulate conflict: ${err.error || 'Server error'}`);
      }
    } catch (e: any) {
      alert(`Simulation failed: ${e.message}`);
    }
  };

  // Submit form (clears both storage systems)
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulate real database submission action
    setLastSubmissionMessage(`Success! Form "${activeTab.toUpperCase()}" submitted and finalized. Both the local storage draft and server account draft have been safely deleted.`);
    
    // Purge draft
    activeDraft.clearDraft();

    setTimeout(() => {
      setLastSubmissionMessage(null);
    }, 6000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.98 }}
        className="w-full max-w-4xl bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header bar */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-850 p-5 text-white flex justify-between items-center shrink-0">
          <div className="space-y-1">
            <h2 className="text-base font-extrabold tracking-wide uppercase flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-300 animate-pulse" />
              Dynamic Auto-Save & Server Draft Engine
            </h2>
            <p className="text-[11px] text-indigo-150 font-medium">
              A production-grade, multi-form system synchronizing local updates with Firebase Firestore, with conflict resolution.
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white transition cursor-pointer shrink-0"
            title="Close Draft Manager"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Ribbon & Environment Controls */}
        <div className="bg-slate-50 dark:bg-slate-950 p-4 border-b border-slate-150 dark:border-slate-850 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs shrink-0 font-bold">
          <div className="flex flex-wrap items-center gap-3.5 text-slate-600 dark:text-slate-400">
            <span className="flex items-center gap-1">
              👤 Account Status: 
              <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-extrabold ${currentUser ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-400' : 'bg-amber-100 text-amber-800'}`}>
                {currentUser ? `Authenticated (${currentUser.username})` : 'Anonymous / Offline Drafts'}
              </span>
            </span>

            <span className="flex items-center gap-1.5">
              💾 Storage Layers:
              <span className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[10px] font-mono">localStorage</span>
              <span className="text-slate-400">+</span>
              <span className="bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-md text-[10px] font-mono">Firebase Firestore</span>
            </span>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Form Tabs Selector */}
          <div className="grid grid-cols-3 gap-2 p-1.5 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-850">
            <button
              onClick={() => { setActiveTab('proposal'); setLastSubmissionMessage(null); }}
              className={`py-2 rounded-xl text-xs font-bold uppercase transition flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'proposal' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 hover:text-slate-850 dark:hover:text-zinc-200'}`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              1. Project Proposal
            </button>
            <button
              onClick={() => { setActiveTab('risk'); setLastSubmissionMessage(null); }}
              className={`py-2 rounded-xl text-xs font-bold uppercase transition flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'risk' ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 hover:text-slate-850 dark:hover:text-zinc-200'}`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              2. Risk Assessment
            </button>
            <button
              onClick={() => { setActiveTab('broadcast'); setLastSubmissionMessage(null); }}
              className={`py-2 rounded-xl text-xs font-bold uppercase transition flex items-center justify-center gap-2 cursor-pointer ${activeTab === 'broadcast' ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 hover:text-slate-850 dark:hover:text-zinc-200'}`}
            >
              <Layers className="w-4 h-4 shrink-0" />
              3. PMO Broadcast
            </button>
          </div>

          {/* Form and Status Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* The active form input editor */}
            <div className="lg:col-span-8 bg-slate-50/50 dark:bg-slate-850/30 p-5 rounded-3xl border border-slate-150 dark:border-slate-800 space-y-4">
              
              <div className="flex justify-between items-center">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Draft Input Canvas</span>
                <div className="flex items-center gap-1.5 text-2xs font-extrabold">
                  {activeDraft.isSaving ? (
                    <span className="text-blue-500 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Saving draft...
                    </span>
                  ) : activeDraft.lastSaved ? (
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-mono">
                      <CheckCircle className="w-3.5 h-3.5" /> Draft Saved: {activeDraft.lastSaved}
                    </span>
                  ) : (
                    <span className="text-slate-400">No active typing drafts yet</span>
                  )}
                </div>
              </div>

              {lastSubmissionMessage && (
                <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-2xl text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  <span>{lastSubmissionMessage}</span>
                </div>
              )}

              {/* Form 1 render */}
              {activeTab === 'proposal' && (
                <form onSubmit={handleSubmitForm} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Highway Route Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Nekemte - Bure Road Section"
                        value={proposalDraft.formData.routeName}
                        onChange={(e) => proposalDraft.setFormData({ ...proposalDraft.formData, routeName: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Primary Contractor</label>
                      <input
                        type="text"
                        placeholder="e.g. CCCC International"
                        value={proposalDraft.formData.contractor}
                        onChange={(e) => proposalDraft.setFormData({ ...proposalDraft.formData, contractor: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Route Length (KM)</label>
                      <input
                        type="number"
                        placeholder="e.g. 120"
                        value={proposalDraft.formData.lengthKm}
                        onChange={(e) => proposalDraft.setFormData({ ...proposalDraft.formData, lengthKm: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Estimated Budget (USD)</label>
                      <input
                        type="number"
                        placeholder="e.g. 150000000"
                        value={proposalDraft.formData.estCost}
                        onChange={(e) => proposalDraft.setFormData({ ...proposalDraft.formData, estCost: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono font-bold text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Target Start Date</label>
                      <input
                        type="date"
                        value={proposalDraft.formData.startDate}
                        onChange={(e) => proposalDraft.setFormData({ ...proposalDraft.formData, startDate: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Proposal Comments & Scope Summary</label>
                    <textarea
                      rows={4}
                      placeholder="Enter technical comments, scope of works, asphalt grade details..."
                      value={proposalDraft.formData.comments}
                      onChange={(e) => proposalDraft.setFormData({ ...proposalDraft.formData, comments: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={proposalDraft.clearDraft}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-rose-200 dark:border-rose-950/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-2xs font-extrabold uppercase rounded-xl cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Discard Draft
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-2xs uppercase tracking-wide rounded-xl shadow-md cursor-pointer transition flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" /> Finalize & Submit Proposal
                    </button>
                  </div>
                </form>
              )}

              {/* Form 2 render */}
              {activeTab === 'risk' && (
                <form onSubmit={handleSubmitForm} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Risk Category</label>
                      <select
                        value={riskDraft.formData.category}
                        onChange={(e) => riskDraft.setFormData({ ...riskDraft.formData, category: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500"
                      >
                        <option value="Environmental">Environmental & Weather</option>
                        <option value="Geotechnical">Geotechnical / Rockfall</option>
                        <option value="Financial">Financial / Escalation</option>
                        <option value="Right-of-Way">Right-of-Way (ROW) Clearance</option>
                        <option value="Contractual">Contractual dispute</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Probability</label>
                        <select
                          value={riskDraft.formData.probability}
                          onChange={(e) => riskDraft.setFormData({ ...riskDraft.formData, probability: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500"
                        >
                          <option value="Low">Low Risk</option>
                          <option value="Medium">Medium Risk</option>
                          <option value="High">High Risk</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Impact Scale</label>
                        <select
                          value={riskDraft.formData.impact}
                          onChange={(e) => riskDraft.setFormData({ ...riskDraft.formData, impact: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500"
                        >
                          <option value="1">1 - Trivial</option>
                          <option value="2">2 - Minor</option>
                          <option value="3">3 - Moderate</option>
                          <option value="4">4 - Severe</option>
                          <option value="5">5 - Catastrophic</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Risk Threat Description</label>
                    <textarea
                      rows={3}
                      placeholder="Describe the threat event, physical location, potential delay triggers..."
                      value={riskDraft.formData.description}
                      onChange={(e) => riskDraft.setFormData({ ...riskDraft.formData, description: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Mitigation Plan</label>
                    <textarea
                      rows={3}
                      placeholder="Enter specific counter-measures, contingency provisions, contractor directives..."
                      value={riskDraft.formData.mitigation}
                      onChange={(e) => riskDraft.setFormData({ ...riskDraft.formData, mitigation: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={riskDraft.clearDraft}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-rose-200 dark:border-rose-950/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-2xs font-extrabold uppercase rounded-xl cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Discard Draft
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-2xs uppercase tracking-wide rounded-xl shadow-md cursor-pointer transition flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" /> Save Risk Entry
                    </button>
                  </div>
                </form>
              )}

              {/* Form 3 render */}
              {activeTab === 'broadcast' && (
                <form onSubmit={handleSubmitForm} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Notification Subject</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Directive regarding variation calculation formats"
                        value={broadcastDraft.formData.subject}
                        onChange={(e) => broadcastDraft.setFormData({ ...broadcastDraft.formData, subject: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Audience Target</label>
                        <select
                          value={broadcastDraft.formData.audience}
                          onChange={(e) => broadcastDraft.setFormData({ ...broadcastDraft.formData, audience: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500"
                        >
                          <option value="All Engineers">All Engineers</option>
                          <option value="Regional Directors">Regional Directors</option>
                          <option value="PMO Staff">PMO Staff Only</option>
                          <option value="Contractors">Active Contractors</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Priority Level</label>
                        <select
                          value={broadcastDraft.formData.priority}
                          onChange={(e) => broadcastDraft.setFormData({ ...broadcastDraft.formData, priority: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500"
                        >
                          <option value="Normal">Normal</option>
                          <option value="Urgent">Urgent priority</option>
                          <option value="Critical">Critical (Immediate dispatch)</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Broadcast Message Content</label>
                    <textarea
                      rows={5}
                      placeholder="Type official PMO dispatch contents, reference sections, deadlines..."
                      value={broadcastDraft.formData.body}
                      onChange={(e) => broadcastDraft.setFormData({ ...broadcastDraft.formData, body: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500 font-sans"
                    />
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={broadcastDraft.clearDraft}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-rose-200 dark:border-rose-950/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-2xs font-extrabold uppercase rounded-xl cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Discard Draft
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-2xs uppercase tracking-wide rounded-xl shadow-md cursor-pointer transition flex items-center justify-center gap-2"
                    >
                      <Save className="w-4 h-4" /> Dispatch Broadcast
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Diagnostics, storage inspector, and simulation panel */}
            <div className="lg:col-span-4 space-y-4">
              {/* Storage State Panel */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-150 dark:border-slate-850 rounded-2xl space-y-3.5">
                <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider block">Live Draft Diagnostics</span>

                <div className="space-y-2 text-2xs font-bold">
                  <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-500 font-medium">Local storage draft:</span>
                    {activeDraft.hasDraft ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full text-[10px]">
                        ● Active (Updated)
                      </span>
                    ) : (
                      <span className="text-slate-450 dark:text-slate-500">None detected</span>
                    )}
                  </div>

                  <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-500 font-medium">Firebase Server Draft:</span>
                    {!currentUser ? (
                      <span className="text-slate-400 font-medium">Auth required</span>
                    ) : activeDraft.hasDraft ? (
                      <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full text-[10px]">
                        ● Synchronized
                      </span>
                    ) : (
                      <span className="text-slate-450 dark:text-slate-500">None detected</span>
                    )}
                  </div>
                </div>

                <div className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed bg-blue-50/40 dark:bg-blue-950/10 border border-blue-100/60 dark:border-blue-950/30 p-3 rounded-xl space-y-1.5">
                  <p className="font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-wide flex items-center gap-1">
                    <HelpCircle className="w-3.5 h-3.5" /> How Auto-Save Works:
                  </p>
                  <p>1. <strong>Instantly saves locally</strong> to <code>localStorage</code> (keyed by <code>draft:{"{"}uid{"}"}:{activeTab}</code>) 400ms after you stop typing.</p>
                  <p>2. <strong>Uploads debounced JSON</strong> to Firebase Cloud Firestore 1.5 seconds after you stop typing if logged in.</p>
                  <p>3. <strong>Restores on load</strong>: Timestamps of local and server are compared. Conflict resolver pops up if a conflict is found!</p>
                </div>
              </div>

              {/* Conflict Simulation Section */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-150 dark:border-slate-850 rounded-2xl space-y-3">
                <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider block">Simulator Control Room</span>

                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={triggerSimulatedConflict}
                    className="w-full bg-slate-800 hover:bg-slate-750 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-extrabold text-2xs uppercase py-2.5 rounded-xl cursor-pointer flex items-center justify-center gap-2 border border-slate-700 shadow-md transition"
                  >
                    <Play className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                    Simulate Remote Device Change
                  </button>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Inserts a <strong>newer</strong> server-side draft version into Firebase Cloud Firestore, representing a change from another iPad/phone. This triggers the side-by-side conflict dialog immediately upon synchronization.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Conflict Resolution Modal Overlay */}
        <AnimatePresence>
          {activeDraft.conflict && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4"
              >
                <div className="flex items-center gap-3 border-b pb-3 border-slate-100 dark:border-slate-800">
                  <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center border border-amber-200">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-850 dark:text-zinc-100 text-sm uppercase tracking-wide">
                      Draft Timestamp Conflict Detected
                    </h3>
                    <p className="text-2xs text-slate-500">
                      The server has a draft that differs from your local browser state. Choose which copy to preserve.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Local version info card */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-2xs font-extrabold text-blue-600 dark:text-blue-400 uppercase">Local Browser Copy</span>
                        <span className="text-[10px] text-slate-450 dark:text-slate-500 font-mono font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {activeDraft.conflict.localTime}
                        </span>
                      </div>
                      <div className="border-t border-slate-200/60 dark:border-slate-800/60 pt-2 text-[11px] font-mono bg-white dark:bg-slate-900 p-2.5 rounded-xl text-slate-700 dark:text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
                        {JSON.stringify(activeDraft.conflict.localData, null, 2)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => activeDraft.resolveConflict('local')}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-2xs uppercase tracking-wide rounded-xl cursor-pointer shadow-sm transition"
                    >
                      Keep Local Browser Version
                    </button>
                  </div>

                  {/* Server version info card */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800/80 rounded-2xl flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-2xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase">Cloud Server Copy (Newer)</span>
                        <span className="text-[10px] text-slate-450 dark:text-slate-500 font-mono font-bold flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {activeDraft.conflict.serverTime}
                        </span>
                      </div>
                      <div className="border-t border-slate-200/60 dark:border-slate-800/60 pt-2 text-[11px] font-mono bg-white dark:bg-slate-900 p-2.5 rounded-xl text-slate-700 dark:text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
                        {JSON.stringify(activeDraft.conflict.serverData, null, 2)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => activeDraft.resolveConflict('server')}
                      className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-2xs uppercase tracking-wide rounded-xl cursor-pointer shadow-sm transition"
                    >
                      Restore Cloud Server Version
                    </button>
                  </div>
                </div>

                <div className="text-[10px] text-center text-slate-400 font-medium">
                  Resolving the conflict will safely overwrite the non-chosen storage layer, syncing both states immediately.
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
