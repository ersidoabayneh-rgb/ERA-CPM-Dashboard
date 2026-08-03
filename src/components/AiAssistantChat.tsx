import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, X, Bot, User, RefreshCw, AlertCircle, Terminal } from 'lucide-react';
import { Project } from '../types';

interface AiAssistantChatProps {
  project: Project;
  currentUserObj: { username: string; role: string } | null;
  onProjectUpdate: (updatedFields: Partial<Project>, logMessage: string) => void;
}

export default function AiAssistantChat({ project, currentUserObj, onProjectUpdate }: AiAssistantChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const chatHistory = project.aiChatHistory || [];

  // Scroll to bottom when chat updates or is opened
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isOpen]);

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputValue.trim();
    if (!textToSend || isLoading) return;

    if (!customPrompt) {
      setInputValue('');
    }
    setErrorMsg(null);
    setIsLoading(true);

    const userName = currentUserObj?.username || 'Anonymous User';
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Add user message to history
    const userMsg = {
      role: 'user',
      content: textToSend,
      username: userName,
      timestamp
    };
    const updatedHistoryWithUser = [...chatHistory, userMsg];
    
    // Save User message immediately to database so everyone sees they asked
    onProjectUpdate({ aiChatHistory: updatedHistoryWithUser }, `AI Chat Message by ${userName}`);

    try {
      // 2. Send payload to our secure server-side Gemini API proxy route
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: textToSend,
          systemInstruction: `You are an expert Senior Project Consultant specializing in heavy civil infrastructure and Ethiopian Roads Administration (ERA) FIDIC contract guidelines. 
          Provide detailed, professional, and audit-ready feedback. Keep responses concise, structured, and visually clean.`
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch response from backend Gemini proxy');
      }

      const data = await response.json();
      
      // 3. Add AI response to history
      const aiMsg = {
        role: 'assistant',
        content: data.text || 'No response text returned.',
        username: 'ERA AI Consultant',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const finalHistory = [...updatedHistoryWithUser, aiMsg];
      
      // Save AI response to database - triggers real-time updates for all screens
      onProjectUpdate({ aiChatHistory: finalHistory }, 'AI Consultant Answer Received');
    } catch (err: any) {
      console.error('Error contacting Gemini Proxy:', err);
      setErrorMsg(err.message || 'Failed to generate AI response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate a automatic detailed audit summary of the project using Gemini
  const handleGenerateProjectAudit = () => {
    const seriesList = (project.series || []).map(s => `- ${s.desc}: Contract Amt: ${s.contractAmt} ETB, Executed Amt: ${s.execAmt} ETB (${s.progress}% complete)`).join('\n');
    const riskList = (project.risks || []).map(r => `- [${r.status}] ${r.category}: ${r.description} (Prob: ${r.probability}, Imp: ${r.impact})`).join('\n');
    const paymentList = (project.payment || []).map(p => `- ${p.item}: ${p.amount} ETB (${p.percent.toFixed(2)}%)`).join('\n');
    
    const auditPrompt = `Please perform a professional construction project audit and health-check on "${project.name}" (Contract Type: ${project.contractType}). Here are the live metrics:
- Client: ${project.client}
- Contractor: ${project.contractor}
- Physical Progress: ${project.physicalProgress}%
- Road Length: ${project.lengthKm} KM

BOQ Series Items:
${seriesList || 'No BOQ items configured'}

Project Risks:
${riskList || 'No risk registry configured'}

Financial Payments & Bill Summary:
${paymentList || 'No payments configured'}

Identify potential chokepoints, analyze the alignment between physical progress and series execution amounts, evaluate the severity of active risks, and provide three concrete actionable contract suggestions under FIDIC terms. Keep it professional.`;

    handleSendMessage(auditPrompt);
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear the AI Chat History for this project?')) {
      onProjectUpdate({ aiChatHistory: [] }, 'Cleared AI Chat History');
    }
  };

  return (
    <>
      {/* Floating AI Trigger Button */}
      <button
        id="floating-ai-trigger"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-bold p-4 rounded-full shadow-2xl flex items-center justify-center gap-2 hover:scale-105 transition-all duration-300 group"
      >
        <Sparkles className="w-5 h-5 animate-pulse" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out whitespace-nowrap text-sm font-semibold tracking-wide">
          ERA AI Consultant
        </span>
      </button>

      {/* AI Drawer/Chat Panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-lg h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 animate-slide-in relative">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-850">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-850 dark:text-zinc-100 text-sm md:text-base flex items-center gap-1.5">
                    ERA Contract Assistant
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-400">
                      Live Sync
                    </span>
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">POWERED BY SECURE GEMINI PROXY</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {chatHistory.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    className="p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                    title="Clear Chat History"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-750 dark:hover:text-zinc-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Chat History Panel */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40 dark:bg-slate-950/20"
            >
              {chatHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-850 dark:text-zinc-100">Live Collaborative Assistant</h4>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Ask contractual questions, audit milestones, or verify CPM float risks. Updates are synced to all active user screens in real-time.
                    </p>
                  </div>
                  <div className="w-full max-w-sm space-y-2 pt-2">
                    <button
                      onClick={handleGenerateProjectAudit}
                      className="w-full py-2.5 px-4 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-850 hover:border-indigo-500 dark:hover:border-indigo-700 bg-indigo-50/30 dark:bg-indigo-950/10 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center justify-center gap-2 transition"
                    >
                      <Terminal className="w-4 h-4" />
                      Run Auto-Generated Project Health Audit
                    </button>
                  </div>
                </div>
              ) : (
                chatHistory.map((msg, index) => {
                  const isAi = msg.role === 'assistant';
                  return (
                    <div 
                      key={index}
                      className={`flex gap-3 max-w-[85%] ${isAi ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
                    >
                      <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${
                        isAi 
                          ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400' 
                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400'
                      }`}>
                        {isAi ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                      <div className="space-y-1">
                        <div className={`flex items-center gap-2 text-[10px] font-mono text-slate-400 ${!isAi && 'justify-end'}`}>
                          <span>{msg.username}</span>
                          <span>•</span>
                          <span>{msg.timestamp}</span>
                        </div>
                        <div className={`p-3 rounded-2xl text-xs md:text-sm leading-relaxed ${
                          isAi 
                            ? 'bg-white dark:bg-slate-850 text-slate-800 dark:text-zinc-100 border border-slate-100 dark:border-slate-800/80 shadow-xs' 
                            : 'bg-indigo-600 text-white font-medium'
                        }`}>
                          <p className="whitespace-pre-line">{msg.content}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {isLoading && (
                <div className="flex gap-3 max-w-[85%] mr-auto items-center">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400 flex items-center justify-center animate-spin">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <span className="text-xs text-slate-450 font-mono animate-pulse">Assistant compiling response...</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl text-red-700 dark:text-red-400 text-xs flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Error:</span> {errorMsg}
                  </div>
                </div>
              )}
            </div>

            {/* Input Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
              {chatHistory.length > 0 && (
                <div className="mb-3">
                  <button
                    onClick={handleGenerateProjectAudit}
                    className="w-full py-1.5 px-3 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-200 dark:border-slate-750 transition"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    Regenerate Fresh Assessment
                  </button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask about FIDIC guidelines, work program floats, payments..."
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-zinc-100 rounded-xl px-4 py-2.5 text-xs md:text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  disabled={isLoading}
                />
                <button
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isLoading}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white rounded-xl shadow-md transition-all duration-200"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
