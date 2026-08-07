import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FolderOpen, 
  Trash2, 
  Plus, 
  User as UserIcon, 
  Users, 
  CheckSquare, 
  UserCheck, 
  LogOut, 
  Search, 
  TrendingUp, 
  Briefcase,
  Building,
  DollarSign,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  ShieldAlert,
  X,
  FileText,
  Download,
  Sliders,
  ChevronDown,
  ChevronUp,
  Eye,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Project, User, ApprovalRequest, ProjectLifecycleStatus } from '../types';
import { canUserApproveRequest } from '../App';
import eraLogo from '../assets/logo.png';
import GroupReportGenerator from './GroupReportGenerator';
import { downloadUserManual } from '../data/userManual';

interface ProjectsPageProps {
  projects: Project[];
  currentUserObj: User;
  pendingApprovals: ApprovalRequest[];
  onSelectProject: (id: string) => void;
  onAddNewProject: (customId?: string, customName?: string) => void;
  onDeleteProject: (id: string) => void;
  onUpdateProjectStatus?: (id: string, status: ProjectLifecycleStatus) => void;
  onLogout: () => void;
  onOpenProfile: () => void;
  onOpenApprovals: () => void;
  onOpenAdmin: () => void;
  onOpenDrafts: () => void;
  onOpenUserGuide?: () => void;
  onSaveToCloud: () => void;
  onlineUsers: string[];
  programDirectorates?: string[];
  pmos?: string[];
  allUsers?: User[];
}

export default function ProjectsPage({
  projects,
  currentUserObj,
  pendingApprovals,
  onSelectProject,
  onAddNewProject,
  onDeleteProject,
  onUpdateProjectStatus,
  onLogout,
  onOpenProfile,
  onOpenApprovals,
  onOpenAdmin,
  onOpenDrafts,
  onOpenUserGuide,
  onSaveToCloud,
  onlineUsers,
  programDirectorates = ['Southern', 'North', 'East', 'West', 'Central', 'Expressway'],
  pmos = ['PMO 1', 'PMO 2', 'PMO 3'],
  allUsers = []
}: ProjectsPageProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDirectorate, setSelectedDirectorate] = useState('All');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('All');
  const [logoError, setLogoError] = useState(false);
  const [showCollab, setShowCollab] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [similarityFilter, setSimilarityFilter] = useState<{
    type: 'contractType' | 'classification' | 'client' | 'contractor' | 'none';
    value: string | null;
  }>({ type: 'none', value: null });
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'bondWarnings' | 'progress' | 'budget' | 'length'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Group report generator toggle state
  const [showReportGenerator, setShowReportGenerator] = useState(false);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectId, setNewProjectId] = useState('');
  const [newProjectName, setNewProjectName] = useState('New Project');
  const [createError, setCreateError] = useState('');

  const handleOpenCreateModal = () => {
    const proposedId = 'proj_' + Date.now();
    setNewProjectId(proposedId);
    setNewProjectName('New Project');
    setCreateError('');
    setIsCreateModalOpen(true);
  };

  const handleConfirmCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedId = newProjectId.trim();
    const trimmedName = newProjectName.trim();
    if (!trimmedId) {
      setCreateError('Project ID cannot be empty.');
      return;
    }
    if (!/^[a-zA-Z0-9_\-]+$/.test(trimmedId)) {
      setCreateError('Project ID can only contain letters, numbers, hyphens, and underscores (no spaces or special characters).');
      return;
    }
    if (projects.some(p => p.id === trimmedId)) {
      setCreateError(`A project with ID "${trimmedId}" already exists. Please choose a unique ID.`);
      return;
    }
    if (!trimmedName) {
      setCreateError('Project Name cannot be empty.');
      return;
    }
    onAddNewProject(trimmedId, trimmedName);
    setIsCreateModalOpen(false);
  };

  const isMasterAdmin = currentUserObj?.role === 'admin' || 
                        currentUserObj?.role === 'master_admin' || 
                        currentUserObj?.role === 'cpm_admin' ||
                        currentUserObj?.role === 'directorate_admin' || 
                        currentUserObj?.role === 'pmo_admin' || 
                        currentUserObj?.username === 'proj_1781786415663' ||
                        (currentUserObj?.username && currentUserObj.username.toLowerCase().includes('ersido'));
  const canManageStatus = isMasterAdmin;
  const canAccessUserAdmin = (currentUserObj?.role === 'admin' || 
                              currentUserObj?.role === 'master_admin' || 
                              currentUserObj?.role === 'directorate_admin' || 
                              currentUserObj?.role === 'pmo_admin' || 
                              currentUserObj?.username === 'proj_1781786415663') && 
                             currentUserObj?.role !== 'cpm_admin';

  const pendingUserSignupsCount = allUsers ? allUsers.filter(u => u.isPendingApproval).length : 0;
  
  // Filter projects based on permissions - all users share the single database to work together
  const isAccessible = (p: Project) => {
    if (isMasterAdmin) return true;
    if (currentUserObj.role === 'directorate_admin') {
      return (p.programDirectorate || 'Southern') === currentUserObj.assignedDirectorate;
    }
    if (currentUserObj.role === 'pmo_admin') {
      return (p.pmo || '') === currentUserObj.assignedPmo;
    }
    
    const allowed = currentUserObj.accessibleProjects || [];
    return allowed.includes(p.id);
  };
  
  const hasNoProjects = !isMasterAdmin && currentUserObj.role !== 'directorate_admin' && currentUserObj.role !== 'pmo_admin' && (currentUserObj.accessibleProjects || []).length === 0;

  const filteredProjects = projects
    .filter(isAccessible)
    .filter(p => {
      if (selectedDirectorate === 'All') return true;
      return (p.programDirectorate || 'Southern') === selectedDirectorate;
    })
    .filter(p => {
      if (selectedStatusFilter === 'All') return true;
      return (p.status || 'In Progress') === selectedStatusFilter;
    })
    .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                 p.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 p.contractor.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(p => {
      if (similarityFilter.type === 'none') return true;
      if (similarityFilter.type === 'contractType') return p.contractType === similarityFilter.value;
      if (similarityFilter.type === 'classification') return p.classification === similarityFilter.value;
      if (similarityFilter.type === 'client') return p.client === similarityFilter.value;
      if (similarityFilter.type === 'contractor') return p.contractor === similarityFilter.value;
      return true;
    });

  const sortedProjects = useMemo(() => {
    return [...filteredProjects].sort((a, b) => {
      if (sortBy === 'name') {
        const comp = a.name.localeCompare(b.name);
        return sortOrder === 'asc' ? comp : -comp;
      }
      
      const getCriticalBondsCount = (p: Project) => {
        return p.bonds ? p.bonds.filter(b => {
          if (b.status === 'Recovered' || b.status === 'N/A' || (b.status && (b.status.toLowerCase().includes('returned') || b.status.toLowerCase().includes('amortized')))) return false;
          const exp = new Date(b.expireDate);
          const now = new Date();
          if (b.status === 'Expired' || isNaN(exp.getTime()) || exp < now) {
            return true;
          }
          const fortyFiveDays = 45 * 24 * 60 * 60 * 1000;
          return (exp.getTime() - now.getTime() < fortyFiveDays);
        }).length : 0;
      };

      if (sortBy === 'bondWarnings') {
        const countA = getCriticalBondsCount(a);
        const countB = getCriticalBondsCount(b);
        if (countA !== countB) {
          // Default sorting for warnings is highest warning first
          return sortOrder === 'asc' ? countA - countB : countB - countA;
        }
        // Fallback to earliest expiration
        const getEarliestExpire = (p: Project) => {
          if (!p.bonds || p.bonds.length === 0) return Infinity;
          const times = p.bonds
            .map(b => new Date(b.expireDate).getTime())
            .filter(t => !isNaN(t));
          return times.length > 0 ? Math.min(...times) : Infinity;
        };
        const expireA = getEarliestExpire(a);
        const expireB = getEarliestExpire(b);
        return sortOrder === 'asc' ? expireA - expireB : expireB - expireA;
      }
      
      if (sortBy === 'progress') {
        return sortOrder === 'asc' 
          ? a.physicalProgress - b.physicalProgress 
          : b.physicalProgress - a.physicalProgress;
      }
      
      if (sortBy === 'budget') {
        return sortOrder === 'asc' 
          ? a.origAmount - b.origAmount 
          : b.origAmount - a.origAmount;
      }

      if (sortBy === 'length') {
        return sortOrder === 'asc' 
          ? a.lengthKm - b.lengthKm 
          : b.lengthKm - a.lengthKm;
      }
      
      return 0;
    });
  }, [filteredProjects, sortBy, sortOrder]);

  const getLifecycleStatusBadge = (status?: string) => {
    const s = status || 'In Progress';
    switch (s) {
      case 'Completed':
        return {
          label: 'Completed',
          icon: '✅',
          style: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
        };
      case 'Completed and Closed':
        return {
          label: 'Completed & Closed',
          icon: '🔒',
          style: 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
        };
      case 'Suspended':
        return {
          label: 'Suspended',
          icon: '⏸️',
          style: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
        };
      case 'Terminated':
        return {
          label: 'Terminated',
          icon: '🛑',
          style: 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
        };
      case 'In Progress':
      default:
        return {
          label: 'In Progress',
          icon: '🟢',
          style: 'bg-blue-50 text-blue-700 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
        };
    }
  };

  const getProjectStatus = (p: Project) => {
    const today = new Date();
    
    // 1. Critical Bonds check
    const criticalBonds = p.bonds ? p.bonds.filter(b => {
      if (b.status === 'Recovered' || b.status === 'N/A' || (b.status && (b.status.toLowerCase().includes('returned') || b.status.toLowerCase().includes('amortized')))) return false;
      const exp = new Date(b.expireDate);
      if (b.status === 'Expired' || isNaN(exp.getTime()) || exp < today) {
        return true;
      }
      const fortyFiveDays = 45 * 24 * 60 * 60 * 1000;
      return (exp.getTime() - today.getTime() < fortyFiveDays);
    }) : [];

    // 2. Matured Overdue Unpaid IPC claims (> 56 days) check
    const hasMaturedUnpaidIpc = p.ipcTracker ? p.ipcTracker.some(item => {
      const isEtbUnpaid = (item.statusEtb || item.status) === 'Unpaid';
      const isUsdUnpaid = (item.statusUsd || item.status) === 'Unpaid';
      if (!isEtbUnpaid && !isUsdUnpaid) return false;
      if (!item.submissionDate) return false;
      const subDate = new Date(item.submissionDate);
      if (isNaN(subDate.getTime())) return false;
      const daysElapsed = Math.floor((today.getTime() - subDate.getTime()) / (1000 * 60 * 60 * 24));
      return daysElapsed > 56;
    }) : false;

    if (criticalBonds.length > 0 || hasMaturedUnpaidIpc) {
      let reason = 'Critical Security Bonds expired/near expiry';
      if (hasMaturedUnpaidIpc) {
        reason = 'Matured Certified IPC Overdue (>56 days)';
      }
      if (criticalBonds.length > 0 && hasMaturedUnpaidIpc) {
        reason = 'Critical Bonds & Overdue Unpaid IPCs';
      }
      return {
        level: 'Critical' as const,
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-900/50',
        cardBorderClass: 'border-rose-200 dark:border-rose-900/60 shadow-rose-50/50 dark:shadow-none hover:border-rose-400 dark:hover:border-rose-700',
        icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-500 animate-pulse" />,
        reason
      };
    }

    // 3. Warning Bonds / Low Progress / Deficiency check
    const warningBonds = p.bonds ? p.bonds.filter(b => {
      if (b.status === 'Recovered' || b.status === 'N/A' || b.status === 'Expired' || (b.status && (b.status.toLowerCase().includes('returned') || b.status.toLowerCase().includes('amortized')))) return false;
      const exp = new Date(b.expireDate);
      if (isNaN(exp.getTime()) || exp < today) return false;
      const ninetyDays = 90 * 24 * 60 * 60 * 1000;
      const fortyFiveDays = 45 * 24 * 60 * 60 * 1000;
      const diff = exp.getTime() - today.getTime();
      return diff >= fortyFiveDays && diff < ninetyDays;
    }) : [];

    const hasUnpaidIpc = p.ipcTracker ? p.ipcTracker.some(item => {
      const isEtbUnpaid = (item.statusEtb || item.status) === 'Unpaid';
      const isUsdUnpaid = (item.statusUsd || item.status) === 'Unpaid';
      return isEtbUnpaid || isUsdUnpaid;
    }) : false;

    const hasResourceDeficiency = p.resourceMobilization ? p.resourceMobilization.some(r => r.deficiency > 0) : false;

    const isLaggingProgress = p.physicalProgress < 15; // Low progress for a road project template

    if (warningBonds.length > 0 || hasUnpaidIpc || hasResourceDeficiency || isLaggingProgress) {
      let reason = 'Unpaid IPCs within Contractual Grace Period';
      if (warningBonds.length > 0) {
        reason = 'Bonds Expiring soon (<90 days)';
      } else if (hasResourceDeficiency) {
        reason = 'Contractor Resource Deficiency';
      } else if (isLaggingProgress) {
        reason = 'Physical progress is lagging (<15%)';
      }
      return {
        level: 'Warning' as const,
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
        cardBorderClass: 'border-amber-250 dark:border-amber-900/30 shadow-amber-50/20 dark:shadow-none hover:border-amber-400 dark:hover:border-amber-600',
        icon: <AlertCircle className="w-3.5 h-3.5 text-amber-500" />,
        reason
      };
    }

    return {
      level: 'Good' as const,
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/10 dark:text-emerald-400 dark:border-emerald-900/20',
      cardBorderClass: 'border-slate-100 dark:border-slate-700/60 hover:border-emerald-500/50 dark:hover:border-emerald-500/30',
      icon: <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />,
      reason: 'Bonds valid & progress compliant'
    };
  };

  const pendingCount = pendingApprovals.filter(a => a.status === 'pending' && canUserApproveRequest(currentUserObj, a, projects)).length;

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim()) return;
    setInviteMessage(`Invitation code sent to user ${inviteName}!`);
    setInviteName('');
    setTimeout(() => setInviteMessage(''), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-4 md:p-6 transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header/Controls */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm gap-4">
          <div className="flex items-center gap-3">
            {logoError ? (
              <div className="w-12 h-12 rounded-xl flex items-center justify-center border border-slate-250 bg-gradient-to-br from-emerald-600 via-amber-500 to-red-500 p-0.5 shrink-0 shadow-xs">
                <div className="w-full h-full bg-slate-900 rounded-[10px] flex flex-col items-center justify-center border border-white/20">
                  <span className="text-[11px] font-black tracking-tighter text-amber-400 font-mono leading-none">E.R.A</span>
                  <span className="text-[5px] font-bold text-white uppercase tracking-widest leading-none mt-0.5 scale-90">Roads</span>
                </div>
              </div>
            ) : (
              <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 dark:border-slate-700/60 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                <img
                  src={eraLogo}
                  alt="Ethiopian Roads Administration Logo"
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">Active Contracts</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 self-start md:self-auto">
            {!hasNoProjects && (
              <button 
                onClick={onSaveToCloud}
                className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Save to Database
              </button>
            )}
            <button 
              onClick={onOpenProfile}
              className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              <UserIcon className="w-3.5 h-3.5" />
              Profile
            </button>
            {!hasNoProjects && (
              <button 
                onClick={() => setShowCollab(!showCollab)}
                className="flex items-center gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:hover:bg-emerald-900/30 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
              >
                <Users className="w-3.5 h-3.5" />
                Collaborate
              </button>
            )}
            
            {!hasNoProjects && (currentUserObj.role === 'approver' || isMasterAdmin) && (
              <button 
                onClick={onOpenApprovals}
                className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition relative"
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Approvals
                {pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-1 bg-rose-600 text-white rounded-full text-[9px] w-4 h-4 flex items-center justify-center animate-pulse">
                    {pendingCount}
                  </span>
                )}
              </button>
            )}

            {canAccessUserAdmin && (
              <button 
                onClick={onOpenAdmin}
                className="flex items-center gap-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition relative"
              >
                <UserCheck className="w-3.5 h-3.5" />
                Admin
                {pendingUserSignupsCount > 0 && (
                  <span className="absolute -top-1.5 -right-1 bg-rose-600 text-white rounded-full text-[9px] w-4 h-4 flex items-center justify-center animate-pulse font-black">
                    {pendingUserSignupsCount}
                  </span>
                )}
              </button>
            )}

            {!hasNoProjects && (
              <button 
                onClick={() => {
                  setShowReportGenerator(!showReportGenerator);
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  showReportGenerator
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:hover:bg-indigo-900/30'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Group Reports
              </button>
            )}

            <button
              onClick={() => {
                if (onOpenUserGuide) {
                  onOpenUserGuide();
                } else {
                  downloadUserManual();
                }
              }}
              title="Open Interactive ERA ERP User Manual & Guide"
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              User Manual
            </button>

            <button 
              onClick={onLogout}
              className="flex items-center gap-1 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/20 dark:text-rose-400 dark:hover:bg-rose-900/30 px-3 py-1.5 rounded-xl text-xs font-semibold transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </header>

        {/* Prominent Admin Self-Registration Alert Banner */}
        {canAccessUserAdmin && pendingUserSignupsCount > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-300 dark:border-amber-700/60 rounded-2xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500 dark:bg-amber-600 text-white flex items-center justify-center font-bold text-xl shadow-md shrink-0">
                👤
              </div>
              <div>
                <h4 className="text-sm font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
                  New User Sign-up Request Pending Approval
                  <span className="bg-rose-500 text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-full animate-pulse">
                    Action Required
                  </span>
                </h4>
                <p className="text-xs text-slate-650 dark:text-slate-300 mt-1 leading-normal max-w-2xl">
                  There are <strong>{pendingUserSignupsCount}</strong> pending user registration request(s) waiting for access configuration. You must assign their roles, authorize project access, map appropriate Directorates/PMOs, verify IP authorization, and approve their account to allow secure access.
                </p>
              </div>
            </div>
            <button
              onClick={onOpenAdmin}
              className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition duration-200 shadow-md shadow-amber-500/10 shrink-0 cursor-pointer flex items-center gap-2"
            >
              <span>Assign Projects & Approve</span>
              <span>➜</span>
            </button>
          </motion.div>
        )}

        {/* Collaboration Invitation slide drawer panel */}
        <AnimatePresence>
          {showCollab && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 'auto', height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-4 rounded-2xl shadow-sm space-y-3"
            >
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Users className="w-4 h-4" /> Share Dashboard Workspace
              </h3>
              <p className="text-xs text-slate-400">
                Generate workspace permissions to collaborate synchronously across terminals. Enter peer username to invite:
              </p>
              <form onSubmit={handleSendInvite} className="flex gap-2 max-w-md">
                <input 
                  type="text" 
                  value={inviteName}
                  onChange={e => setInviteName(e.target.value)}
                  placeholder="Target Username"
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs rounded-xl px-3 py-1.5 flex-1 outline-none focus:border-blue-500"
                />
                <button type="submit" className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-xl font-bold transition">
                  Invite
                </button>
              </form>
              {inviteMessage && (
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{inviteMessage}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Group Report Generator modular panel */}
        <AnimatePresence>
          {showReportGenerator && (
            <GroupReportGenerator
              projects={projects.filter(isAccessible)}
              currentUserObj={currentUserObj}
              programDirectorates={programDirectorates}
              pmos={pmos}
              onClose={() => setShowReportGenerator(false)}
            />
          )}
        </AnimatePresence>

        {/* Search & Sort & Directorate Panel */}
        {!hasNoProjects && (
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search by contract name, client, or contractor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 rounded-2xl py-2.5 pl-11 pr-4 text-sm text-slate-800 dark:text-slate-100 shadow-sm outline-none focus:ring-2 focus:ring-blue-500/10 transition"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Program Directorate selector */}
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-1.5 rounded-2xl shadow-sm shrink-0">
                <span className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-wider pl-2.5 pr-1">
                  Directorate:
                </span>
                <select
                  value={selectedDirectorate}
                  onChange={(e) => setSelectedDirectorate(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none text-slate-700 dark:text-zinc-200 focus:border-indigo-500 transition cursor-pointer"
                >
                  <option value="All">🌐 All Directorates</option>
                  {programDirectorates.map(pd => (
                    <option key={pd} value={pd}>🏢 {pd}</option>
                  ))}
                </select>
              </div>

              {/* Status Filter selector */}
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-1.5 rounded-2xl shadow-sm shrink-0">
                <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider pl-2.5 pr-1">
                  Status:
                </span>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold outline-none text-slate-700 dark:text-zinc-200 focus:border-emerald-500 transition cursor-pointer"
                >
                  <option value="All">🌐 All Statuses</option>
                  <option value="In Progress">🟢 In Progress</option>
                  <option value="Completed">✅ Completed</option>
                  <option value="Completed and Closed">🔒 Completed & Closed</option>
                  <option value="Suspended">⏸️ Suspended</option>
                  <option value="Terminated">🛑 Terminated</option>
                </select>
              </div>

              {/* Sort Panel */}
              <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 p-1.5 rounded-2xl shadow-sm shrink-0">
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider pl-2.5 pr-1">
                  Sort By:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    const val = e.target.value as any;
                    setSortBy(val);
                    // Intuitively toggle default sorting directions
                    if (val === 'bondWarnings' || val === 'progress' || val === 'budget') {
                      setSortOrder('desc');
                    } else {
                      setSortOrder('asc');
                    }
                  }}
                  className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-2 py-1.5 text-xs font-bold outline-none text-slate-700 dark:text-zinc-200 focus:border-blue-500 transition cursor-pointer"
                >
                  <option value="name">🔤 spelling (A - Z)</option>
                  <option value="bondWarnings">⚠️ Bond & Guarantee Warning</option>
                  <option value="progress">📊 Physical Progress</option>
                  <option value="budget">💰 orig budget Amount</option>
                  <option value="length">🛣️ corridor Length</option>
                </select>

                <button
                  onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-750 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-blue-600 dark:text-blue-400 transition flex items-center gap-1 shrink-0"
                  title="Toggle sort direction asc / desc"
                >
                  {sortOrder === 'asc' ? '▲ ASC' : '▼ DESC'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Projects Grid / Restricted Alert Banner */}
        {hasNoProjects ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700 p-8 rounded-2xl shadow-sm max-w-lg mx-auto relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-amber-500" />
            <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/25 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100 dark:border-amber-900/30">
              <ShieldAlert className="w-8 h-8 text-amber-500 animate-pulse" />
            </div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
              No Projects Assigned
            </h2>
            <div className="h-0.5 w-12 bg-amber-500 my-3 mx-auto" />
            <p className="text-sm text-slate-650 dark:text-slate-300 leading-relaxed">
              Hello <strong className="text-slate-900 dark:text-white font-black">{currentUserObj.username}</strong>, your account is active, but you have not been assigned to any projects yet.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-4 leading-relaxed bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
              Please contact an Administrator or Coordinator to assign road projects to your profile. You will be able to access reports, dashboards, and KPI tracking once assigned.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence>
              {sortedProjects.map((p) => {
                const criticalBonds = p.bonds ? p.bonds.filter(b => {
                  if (b.status === 'Recovered' || b.status === 'N/A' || (b.status && (b.status.toLowerCase().includes('returned') || b.status.toLowerCase().includes('amortized')))) return false;
                  const exp = new Date(b.expireDate);
                  const now = new Date();
                  if (b.status === 'Expired' || isNaN(exp.getTime()) || exp < now) {
                    return true;
                  }
                  const fortyFiveDays = 45 * 24 * 60 * 60 * 1000;
                  if (exp.getTime() - now.getTime() < fortyFiveDays) {
                    return true;
                  }
                  return false;
                }) : [];
                const hasCritical = criticalBonds.length > 0;
                const statusInfo = getProjectStatus(p);
                const hasPendingChanges = pendingApprovals.some(a => a.projectId === p.id && a.status === 'pending' && canUserApproveRequest(currentUserObj, a, projects));

                return (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => onSelectProject(p.id)}
                    className={`bg-white dark:bg-slate-800 border p-5 rounded-2xl shadow-sm hover:shadow-md cursor-pointer relative group transition-all ${statusInfo.cardBorderClass}`}
                  >
                    <div className="space-y-4">
                      {/* Badge & Type */}
                      <div className="flex items-center gap-1.5 justify-between">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSimilarityFilter({ type: 'contractType', value: p.contractType });
                            }}
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border transition ${
                              similarityFilter.type === 'contractType' && similarityFilter.value === p.contractType
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100/50 dark:border-blue-900/30'
                            }`}
                            title="Click to interlink contracts with the same Contract Type"
                          >
                            {p.contractType}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSimilarityFilter({ type: 'classification', value: p.classification });
                            }}
                            className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border transition ${
                              similarityFilter.type === 'classification' && similarityFilter.value === p.classification
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border-indigo-100/50 dark:border-indigo-900/30'
                            }`}
                            title="Click to interlink contracts with the same Classification"
                          >
                            {p.classification}
                          </button>
                          <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30">
                            🏢 {p.programDirectorate || 'Southern'}
                          </span>
                          <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md border bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/30">
                            📦 {p.pmo || 'PMO 1'}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                            ID: {p.id.substring(0, 10)}
                          </span>
                        </div>
                        
                        {/* Health Status badge */}
                        <span className={`flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded-md border uppercase tracking-tight ${statusInfo.badgeClass}`}>
                          {statusInfo.icon}
                          <span>{statusInfo.level}</span>
                        </span>
                      </div>

                      {/* Title */}
                      <div>
                        <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 line-clamp-1 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors flex items-center gap-2">
                          {hasPendingChanges && (
                            <span className="relative flex h-2 w-2 shrink-0" title="This contract has pending, unapproved changes requiring attention">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-450 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                          )}
                          <span>{p.name}</span>
                          {hasPendingChanges && (
                            <span className="text-[9px] font-black uppercase text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded tracking-wider animate-pulse border border-amber-500/20 leading-none">
                              Pending Approval
                            </span>
                          )}
                        </h3>
                        <div className="text-xs text-slate-400 dark:text-slate-500 flex flex-wrap items-center gap-2 mt-1.5">
                          <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/40 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                            <Building className="w-3 h-3 text-slate-400" />
                            <span className="font-semibold text-slate-400 mr-1">Client:</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSimilarityFilter({ type: 'client', value: p.client });
                              }}
                              className={`font-semibold underline ${
                                similarityFilter.type === 'client' && similarityFilter.value === p.client
                                  ? 'text-blue-600 font-extrabold'
                                  : 'text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300'
                              }`}
                              title="Click to filter similar Client networks"
                            >
                              {p.client}
                            </button>
                          </span>
                          <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900/40 px-2 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                            <span className="font-semibold text-slate-400 mr-1">Contractor:</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSimilarityFilter({ type: 'contractor', value: p.contractor });
                              }}
                              className={`font-semibold underline ${
                                similarityFilter.type === 'contractor' && similarityFilter.value === p.contractor
                                  ? 'text-amber-600 font-extrabold'
                                  : 'text-amber-500 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300'
                              }`}
                              title="Click to filter similar Contractor networks"
                            >
                              {p.contractor}
                            </button>
                          </span>
                        </div>
                      </div>

                      {/* Project Lifecycle Status Governance */}
                      <div 
                        className="flex items-center justify-between gap-2 pt-2 pb-1 border-t border-slate-100 dark:border-slate-700/50"
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                      >
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500">
                          Lifecycle Status:
                        </span>

                        {canManageStatus ? (
                          <div 
                            className="flex items-center gap-1.5" 
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                          >
                            <select
                              value={p.status || 'In Progress'}
                              onChange={(e) => {
                                e.stopPropagation();
                                const newStatus = e.target.value as ProjectLifecycleStatus;
                                if (onUpdateProjectStatus) {
                                  onUpdateProjectStatus(p.id, newStatus);
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              onPointerDown={(e) => e.stopPropagation()}
                              className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg border outline-none cursor-pointer transition shadow-xs ${getLifecycleStatusBadge(p.status).style}`}
                              title="Assigned by Directorate Admin / Administrator"
                            >
                              <option value="In Progress">🟢 In Progress</option>
                              <option value="Completed">✅ Completed</option>
                              <option value="Completed and Closed">🔒 Completed & Closed</option>
                              <option value="Suspended">⏸️ Suspended</option>
                              <option value="Terminated">🛑 Terminated</option>
                            </select>
                          </div>
                        ) : (
                          <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-lg border flex items-center gap-1 ${getLifecycleStatusBadge(p.status).style}`}>
                            <span>{getLifecycleStatusBadge(p.status).icon}</span>
                            <span>{getLifecycleStatusBadge(p.status).label}</span>
                          </span>
                        )}
                      </div>

                      {/* Tiny Specs Grid */}
                      <div className="grid grid-cols-3 gap-2 border-t border-slate-50 dark:border-slate-700/40 pt-3 text-center">
                        <div>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">Length</p>
                          <p className="text-xs font-bold flex items-center justify-center gap-0.5 mt-0.5">
                            <Briefcase className="w-3 h-3 text-slate-400" />
                            {p.lengthKm} <span className="text-[10px] font-normal text-slate-400">km</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">Budget</p>
                          <p className="text-xs font-bold flex items-center justify-center gap-0.5 mt-0.5">
                            <DollarSign className="w-3 h-3 text-slate-400" />
                            {p.origAmount.toFixed(2)} <span className="text-[10px] font-normal text-slate-400">M</span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500">Physical</p>
                          <p className="text-xs font-bold flex items-center justify-center gap-0.5 mt-0.5">
                            <TrendingUp className="w-3 h-3 text-slate-400" />
                            {p.physicalProgress.toFixed(2)}%
                          </p>
                        </div>
                      </div>

                      {/* Progress sliding line */}
                      <div className="w-full bg-slate-100 dark:bg-slate-700/50 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-600 dark:bg-blue-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.max(0, p.physicalProgress))}%` }}
                        />
                      </div>

                      {/* Adaptive Project Health Warning / Condition Details Sign */}
                      {statusInfo.level === 'Critical' && (
                        <div className="bg-rose-50 dark:bg-rose-950/25 border border-rose-100 dark:border-rose-950/40 p-2.5 rounded-xl space-y-1 mt-2">
                          <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-extrabold text-[10px] uppercase tracking-wider">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 animate-bounce shrink-0" />
                            <span>{statusInfo.reason}</span>
                          </div>
                          {criticalBonds.length > 0 && (
                            <div className="text-[9px] space-y-0.5 text-rose-600/80 dark:text-rose-400/80">
                              {criticalBonds.map((b, bIdx) => {
                                const exp = new Date(b.expireDate);
                                const isExpired = b.status === 'Expired' || exp < new Date();
                                return (
                                  <div key={bIdx} className="flex justify-between items-center bg-white/45 dark:bg-black/20 px-1.5 py-0.5 rounded">
                                    <span className="font-semibold truncate max-w-[140px]">{b.type}</span>
                                    <span className="font-mono font-bold text-[8px] text-rose-700 dark:text-rose-300">
                                      {isExpired ? 'EXPIRED' : 'DUE <45d'}: {b.expireDate}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {statusInfo.level === 'Warning' && (
                        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-2.5 rounded-xl space-y-1 mt-2">
                          <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-extrabold text-[10px] uppercase tracking-wider">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span>{statusInfo.reason}</span>
                          </div>
                          <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-normal">
                            This road project is functional but has unresolved pending liabilities, resource deficiencies, or low progress rates. Review history for more info.
                          </p>
                        </div>
                      )}

                      {statusInfo.level === 'Good' && (
                        <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100/60 dark:border-emerald-900/20 p-2.5 rounded-xl space-y-1 mt-2">
                          <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span>On-Track & Fully Compliant</span>
                          </div>
                          <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-normal">
                            Bonds are fully valid, physical progress is compliant, and no matured overdue IPC claims are pending.
                          </p>
                        </div>
                      )}

                      {/* Project Deleting Icon / Action below the critical notification icon */}
                      {isMasterAdmin && (
                        <div 
                          className="pt-2.5 flex justify-end items-center border-t border-slate-100 dark:border-slate-700/50 mt-3" 
                          onClick={(e) => e.stopPropagation()}
                          onMouseDown={(e) => e.stopPropagation()}
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (confirm(`🛑 DELETE PROJECT CONFIRMATION\n\nAre you sure you want to permanently delete project "${p.name}" (ID: ${p.id}) from the system?\n\nThis action cannot be undone.`)) {
                                onDeleteProject(p.id);
                              }
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onPointerDown={(e) => e.stopPropagation()}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-extrabold text-rose-600 dark:text-rose-400 hover:text-white bg-rose-50 hover:bg-rose-600 dark:bg-rose-950/30 dark:hover:bg-rose-600 border border-rose-200 dark:border-rose-900/50 rounded-xl transition-all duration-200 shadow-xs cursor-pointer group/btn"
                            title="Permanently Delete Project"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-500 group-hover/btn:text-white transition-colors" />
                            <span>Delete Project</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {filteredProjects.length === 0 && (
              <div className="col-span-1 md:col-span-2 text-center py-12 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-6 rounded-2xl shadow-sm">
                <FolderOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3 animate-bounce" />
                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                  No active contracts match your filters.
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Try revising your query or request administrative permissions.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Add Project trigger button for admin */}
        {isMasterAdmin && (
          <button
            onClick={handleOpenCreateModal}
            className="w-full py-4 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 dark:from-slate-800/80 dark:to-slate-800 dark:hover:from-slate-700 dark:hover:to-slate-750 border border-dashed border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold rounded-2xl text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Issue New Road Construction Project Template
          </button>
        )}

      </div>

      {/* Create Project Modal Overlay */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 overflow-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-150 dark:border-slate-700/60 shadow-xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
              <h3 className="font-bold text-sm text-slate-800 dark:text-zinc-100 flex items-center gap-2 uppercase tracking-wide">
                <Briefcase className="w-4 h-4 text-blue-500" />
                Issue New Project
              </h3>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-400 hover:text-slate-650 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCreateProject} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-400 tracking-wider uppercase block">
                  Project Identification Number (ID)
                </label>
                <input
                  type="text"
                  required
                  value={newProjectId}
                  onChange={(e) => {
                    setNewProjectId(e.target.value);
                    setCreateError('');
                  }}
                  placeholder="e.g. proj_eastern_highway"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-mono font-bold text-xs text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500 transition-colors"
                />
                <p className="text-[9px] text-slate-450 dark:text-slate-500">
                  Must be unique. No spaces. E.g. <code>proj_modjo_hawassa_3</code>.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-zinc-400 tracking-wider uppercase block">
                  Contract / Road Section Name
                </label>
                <input
                  type="text"
                  required
                  value={newProjectName}
                  onChange={(e) => {
                    setNewProjectName(e.target.value);
                    setCreateError('');
                  }}
                  placeholder="e.g. Modjo - Hawassa Expressway"
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-sans font-black text-xs text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              {createError && (
                <div className="bg-rose-50/70 p-3 rounded-xl border border-rose-200 text-xs font-bold text-rose-600 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-zinc-200 font-bold rounded-xl text-2xs transition cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-2xs transition cursor-pointer shadow-sm text-center"
                >
                  Create Project
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
