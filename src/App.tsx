import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, animate } from 'motion/react';
import { 
  HardHat, 
  FolderOpen, 
  CheckSquare, 
  UserCheck, 
  UserPlus,
  Settings,
  Trash2,
  LogOut, 
  User as UserIcon,
  Sun,
  Moon,
  ArrowLeft,
  Printer,
  ChevronRight,
  TrendingUp,
  Coins,
  Shield,
  Activity,
  Calendar,
  Briefcase,
  FileText,
  ChevronDown,
  ChevronUp,
  Database,
  Wifi,
  WifiOff,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Zap,
  BookOpen
} from 'lucide-react';

import { Project, User, ApprovalRequest, KpiAllocatedItem, SeriesItem, MonthlyProgress, LinearData, RowMetric, ProgressPlan, PaymentItem, AnnualItem, WorkProgramActivity, BondGuarantee, formatAccounting, ProjectDocument, ALL_EDITABLE_PAGES, EditablePageOption, ProjectLifecycleStatus } from './types';

export function hasApprovalCredentials(user: User | null): boolean {
  if (!user) return false;
  if (
    user.role === 'master_admin' ||
    user.role === 'cpm_admin' ||
    user.role === 'admin' ||
    user.role === 'approver' ||
    user.role === 'directorate_admin' ||
    user.role === 'pmo_admin' ||
    user.hasApprovalCredential === true ||
    user.username === 'proj_1781786415663'
  ) {
    return true;
  }
  return false;
}

export function canUserViewPage(user: User | null, pageId: string): boolean {
  if (!user) return false;
  if (user.role === 'master_admin' || user.role === 'cpm_admin' || user.role === 'admin' || user.username === 'proj_1781786415663') {
    return true;
  }
  if (pageId === 'history' || pageId === 'settings') {
    return false;
  }
  if (user.assignedPages && Array.isArray(user.assignedPages) && user.assignedPages.length > 0) {
    return user.assignedPages.includes(pageId);
  }
  return true;
}

export function canUserEditPage(user: User | null, pageId: string): boolean {
  if (!user) return false;
  if (user.role === 'master_admin' || user.role === 'cpm_admin' || user.role === 'admin' || user.username === 'proj_1781786415663') {
    return true;
  }
  if (user.role === 'viewer') {
    return false;
  }
  if (user.assignedPages && Array.isArray(user.assignedPages) && user.assignedPages.length > 0) {
    return user.assignedPages.includes(pageId);
  }
  return true;
}

export function canUserApproveRequest(user: User | null, req: ApprovalRequest, projectsList?: Project[]): boolean {
  if (!user) return false;
  
  if (user.role === 'master_admin' || user.role === 'cpm_admin' || user.role === 'admin' || user.username === 'proj_1781786415663') {
    return true;
  }

  if (!hasApprovalCredentials(user)) {
    return false;
  }

  // 1. Check Project Access
  let projectAllowed = false;
  const project = projectsList ? projectsList.find(p => p.id === req.projectId) : null;
  if (user.role === 'directorate_admin' && project) {
    projectAllowed = (project.programDirectorate || 'Southern') === user.assignedDirectorate;
  } else if (user.role === 'pmo_admin' && project) {
    projectAllowed = (project.pmo || '') === user.assignedPmo;
  } else if (user.accessibleProjects && Array.isArray(user.accessibleProjects) && user.accessibleProjects.length > 0) {
    projectAllowed = user.accessibleProjects.includes(req.projectId);
  } else {
    projectAllowed = true;
  }
  if (!projectAllowed) return false;

  // 2. Check Page Access
  if (user.assignedPages && Array.isArray(user.assignedPages) && user.assignedPages.length > 0) {
    if (req.requestedBy === user.username) {
      return true;
    }
    if (req.pageId && user.assignedPages.includes(req.pageId)) {
      return true;
    }
    const matchesAssigned = user.assignedPages.some(pageId => {
      if (req.section && req.section.toLowerCase().includes(pageId.toLowerCase())) return true;
      const matchedOption = ALL_EDITABLE_PAGES.find(p => p.id === pageId);
      if (matchedOption && req.section && req.section.toLowerCase().includes(matchedOption.name.toLowerCase())) return true;
      return false;
    });
    return matchesAssigned;
  }

  return true;
}
import LoginPage from './components/LoginPage';
import ProjectsPage from './components/ProjectsPage';
import DashboardView from './components/DashboardView';
import KpiEditorView from './components/KpiEditorView';
import SeriesEditorView from './components/SeriesEditorView';
import WorkProgramView from './components/WorkProgramView';
import MonthlyScurveView from './components/MonthlyScurveView';
import LinearDiagramView from './components/LinearDiagramView';
import RowStatusView from './components/RowStatusView';
import ProgressPlanView from './components/ProgressPlanView';
import QuantityEditorView from './components/QuantityEditorView';
import BondsGuaranteeView from './components/BondsGuaranteeView';
import ComprehensiveAnalysisView from './components/ComprehensiveAnalysisView';
import DocumentationView from './components/DocumentationView';
import HistoryView from './components/HistoryView';
import SettingsView from './components/SettingsView';
import WorkspaceView from './components/WorkspaceView';
import ResourceMobilizationView from './components/ResourceMobilizationView';
import ProjectRisksView from './components/ProjectRisksView';
import IssueLogView from './components/IssueLogView';
import DraftPlayground from './components/DraftPlayground';
import ThreeDAnimatedBackground from './components/ThreeDAnimatedBackground';
import AiAssistantChat from './components/AiAssistantChat';
import UserGuideManualModal from './components/UserGuideManualModal';
import eraLogo from './assets/logo.png';

import { defaultProjectTemplate, blankProjectTemplate, generateKpiAllocated } from './data/defaultProject';
import { safeSyncProject, safeDeleteProject, safeFetchProjects, safeSyncUsers, safeFetchUsers, safeSyncApprovals, safeFetchApprovals, safeSyncConfig, safeFetchConfig, reactivateSync, isSyncSuspended } from './lib/apiSync';
import { getAccessToken } from './lib/auth';
import { safeSetItem } from './lib/storage';

function AnimatedCounter({ value, prefix = "" }: { value: number; prefix?: string }) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValueRef = useRef<number>(value);

  useEffect(() => {
    const from = previousValueRef.current;
    const to = value;
    const controls = animate(from, to, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate(latest) {
        setDisplayValue(latest);
      },
    });
    previousValueRef.current = to;
    return () => controls.stop();
  }, [value]);

  return (
    <>
      {prefix}
      {displayValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
    </>
  );
}

export default function App() {
  // Navigation states
  const [currentPage, setCurrentPage] = useState<'login' | 'projects' | 'dashboard'>(() => {
    const savedUser = localStorage.getItem('era_current_user');
    if (!savedUser) return 'login';
    const savedPage = localStorage.getItem('era_current_page');
    if (savedPage === 'dashboard') {
      const savedProjId = localStorage.getItem('era_current_project_id');
      if (savedProjId) return 'dashboard';
      return 'projects';
    }
    return (savedPage as any) || 'projects';
  });
  const [logoError, setLogoError] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    return localStorage.getItem('era_current_user') || null;
  });
  const [currentUserObj, setCurrentUserObj] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('era_current_user_obj');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  
  // Dashboard tab
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('era_active_tab') || 'dash';
  });
  
  // Custom Workspace particles values
  const [darkMode, setDarkMode] = useState(false);
  const [vantaColor, setVantaColor] = useState('#3b82f6');
  const [vantaBgColor, setVantaBgColor] = useState('#f8fafc');
  const [vantaPoints, setVantaPoints] = useState(14);
  const [customBgColor, setCustomBgColor] = useState(() => localStorage.getItem('era_custom_bg') || '');
  const [customTxtColor, setCustomTxtColor] = useState(() => localStorage.getItem('era_custom_txt') || '');
  const [customWordColor, setCustomWordColor] = useState(() => localStorage.getItem('era_custom_word') || '');
  const [customTxtBgColor, setCustomTxtBgColor] = useState(() => localStorage.getItem('era_custom_txt_bg') || '');
  const [customChartTooltipBgColor, setCustomChartTooltipBgColor] = useState(() => localStorage.getItem('era_custom_chart_tooltip_bg') || '');
  
  // Database States
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(() => {
    return localStorage.getItem('era_current_project_id') || null;
  });
  const [currentProject, setCurrentProject] = useState<Project | null>(() => {
    try {
      const storedId = localStorage.getItem('era_current_project_id');
      if (storedId) {
        const storedProjects = localStorage.getItem('era_proj_v28');
        if (storedProjects) {
          const parsed = JSON.parse(storedProjects);
          const found = parsed.find((p: any) => p.id === storedId);
          if (found) return found;
        }
      }
    } catch {}
    return null;
  });

  // User Guide Modal state
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);

  // Sync page view, active tab, and project ID state to local storage to persist on refresh
  useEffect(() => {
    localStorage.setItem('era_current_page', currentPage);
  }, [currentPage]);

  useEffect(() => {
    localStorage.setItem('era_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (currentProjectId) {
      localStorage.setItem('era_current_project_id', currentProjectId);
    } else {
      localStorage.removeItem('era_current_project_id');
    }
  }, [currentProjectId]);

  // Enforce project access restriction
  useEffect(() => {
    if (!currentUserObj || !currentProject) return;
    const isMasterAdmin = currentUserObj.role === 'admin' || currentUserObj.role === 'master_admin' || currentUserObj.role === 'cpm_admin' || currentUserObj.username === 'proj_1781786415663';
    if (!isMasterAdmin) {
      let isAllowed = true;
      if (currentUserObj.role === 'directorate_admin') {
        isAllowed = (currentProject.programDirectorate || 'Southern') === currentUserObj.assignedDirectorate;
      } else if (currentUserObj.role === 'pmo_admin') {
        isAllowed = (currentProject.pmo || '') === currentUserObj.assignedPmo;
      } else if (currentUserObj.accessibleProjects && Array.isArray(currentUserObj.accessibleProjects) && currentUserObj.accessibleProjects.length > 0) {
        isAllowed = currentUserObj.accessibleProjects.includes(currentProject.id);
      }
      if (!isAllowed) {
        setCurrentProject(null);
        setCurrentProjectId(null);
        setCurrentPage('projects');
      }
    }
  }, [currentUserObj, currentProject]);

  // Enforce page viewing scope: auto-switch to first assigned page if activeTab is unassigned
  useEffect(() => {
    if (!currentUserObj) return;
    const isMaster = currentUserObj.role === 'admin' || currentUserObj.role === 'master_admin' || currentUserObj.role === 'cpm_admin' || currentUserObj.username === 'proj_1781786415663';
    if (!isMaster && currentUserObj.assignedPages && Array.isArray(currentUserObj.assignedPages) && currentUserObj.assignedPages.length > 0) {
      if (!currentUserObj.assignedPages.includes(activeTab)) {
        setActiveTab(currentUserObj.assignedPages[0]);
      }
    }
  }, [currentUserObj, activeTab]);

  // Synchronize currentProject when projects array updates in real-time
  useEffect(() => {
    if (currentProjectId && projects.length > 0) {
      const updated = projects.find(p => p.id === currentProjectId);
      if (updated) {
        setCurrentProject(prev => {
          if (!prev || JSON.stringify(prev) !== JSON.stringify(updated)) {
            return updated;
          }
          return prev;
        });
      }
    }
  }, [projects, currentProjectId]);
  
  // Project Name & Dossier Edit States
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [editProjectName, setEditProjectName] = useState('');

  const [isDossierExpanded, setIsDossierExpanded] = useState(false);
  const [isEditingDossier, setIsEditingDossier] = useState(false);
  const [editClient, setEditClient] = useState('');
  const [editConsultant, setEditConsultant] = useState('');
  const [editContractor, setEditContractor] = useState('');
  const [editSignDate, setEditSignDate] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editOrigDays, setEditOrigDays] = useState(0);
  const [editEotDays, setEditEotDays] = useState(0);
  const [editInterimEotDays, setEditInterimEotDays] = useState(0);
  const [editOrigAmount, setEditOrigAmount] = useState(0);
  const [editProvisionalSum, setEditProvisionalSum] = useState(0);
  const [editVariation, setEditVariation] = useState(0);
  const [editLengthKm, setEditLengthKm] = useState(0);
  const [editClassification, setEditClassification] = useState('');
  const [editContractType, setEditContractType] = useState<'DB' | 'DBB'>('DBB');
  const [editProgramDirectorate, setEditProgramDirectorate] = useState('');
  const [editPmo, setEditPmo] = useState('');

  const [programDirectorates, setProgramDirectorates] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('era_directorates_v1');
      if (stored) return JSON.parse(stored);
    } catch {}
    return ['Southern', 'North', 'East', 'West', 'Central', 'Expressway'];
  });

  const [pmos, setPmos] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('era_pmos_v1');
      if (stored) return JSON.parse(stored);
    } catch {}
    return ['PMO 1', 'PMO 2', 'PMO 3'];
  });

  const [editingPmo, setEditingPmo] = useState<string | null>(null);
  const [editingPmoVal, setEditingPmoVal] = useState('');
  const [editingPd, setEditingPd] = useState<string | null>(null);
  const [editingPdVal, setEditingPdVal] = useState('');

  useEffect(() => {
    if (currentProject) {
      setEditProjectName(currentProject.name || '');
      setEditClient(currentProject.client || '');
      setEditConsultant(currentProject.consultant || '');
      setEditContractor(currentProject.contractor || '');
      setEditSignDate(currentProject.signDate || '');
      setEditStartDate(currentProject.startDate || '');
      setEditOrigDays(currentProject.origDays || 0);
      setEditEotDays(currentProject.eotDays || 0);
      setEditInterimEotDays(currentProject.interimEotDays || 0);
      setEditOrigAmount(currentProject.origAmount || 0);
      setEditProvisionalSum(currentProject.provisionalSum || 0);
      setEditVariation(currentProject.variation || 0);
      setEditLengthKm(currentProject.lengthKm || 0);
      setEditClassification(currentProject.classification || '');
      setEditContractType(currentProject.contractType || 'DBB');
      setEditProgramDirectorate(currentProject.programDirectorate || 'Southern');
      setEditPmo(currentProject.pmo || 'PMO 1');
    }
  }, [currentProject]);

  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequest[]>([]);
  const [expandedApprovalId, setExpandedApprovalId] = useState<string | null>(null);
  const [approvalViewMode, setApprovalViewMode] = useState<'sideBySide' | 'summary'>('sideBySide');
  
  // Overlays / Modals
  const [showProfile, setShowProfile] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [selectedAdminUser, setSelectedAdminUser] = useState<string | null>(null);
  const [selectedAdminTab, setSelectedAdminTab] = useState<'projects' | 'credentials' | 'activities'>('projects');
  const [showApprovals, setShowApprovals] = useState(false);
  const [showDraftsPlayground, setShowDraftsPlayground] = useState(false);
  
  // Network simulation peers list
  const [onlinePeers, setOnlinePeers] = useState<string[]>([]);

  // Users list deduplication helper
  const deduplicateUsers = (users: User[]): User[] => {
    const seen = new Set<string>();
    const result: User[] = [];
    for (const u of users) {
      if (!u || !u.username) continue;
      const trimmed = u.username.trim();
      const key = trimmed.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        result.push({
          ...u,
          username: trimmed
        });
      }
    }
    return result;
  };

  // Users list state for reactivity
  const [usersListState, setUsersListState] = useState<User[]>(() => {
    let rawList: User[] = [];
    try {
      const u = localStorage.getItem('era_users_v28');
      if (u) {
        const parsed = JSON.parse(u);
        if (Array.isArray(parsed) && parsed.length > 0) {
          rawList = parsed;
        }
      }
    } catch {}

    if (rawList.length === 0) {
      rawList = [
        { username: 'ersidoabay', password: 'Helikina@#045536', role: 'admin', accessibleProjects: [] },
        { username: 'user', password: 'user123', role: 'editor', accessibleProjects: [] },
        { username: 'viewer', password: 'view123', role: 'viewer', accessibleProjects: [] },
        { username: 'approver', password: '12345', role: 'approver', accessibleProjects: [] },
        { username: 'Ersido Abayneh', password: 'Helikina@#045536', role: 'admin', accessibleProjects: [] },
        { username: 'proj_1781786415663', password: 'password123', role: 'admin', accessibleProjects: [] }
      ];
    }

    if (!rawList.some((x: any) => x?.username?.toLowerCase() === 'proj_1781786415663')) {
      rawList.push({ username: 'proj_1781786415663', password: 'password123', role: 'admin', accessibleProjects: [] });
    }

    // Update or ensure admin / ersidoabay system admin account
    const adminIdx = rawList.findIndex((x: any) => x?.username?.toLowerCase() === 'admin' || x?.username?.toLowerCase() === 'ersidoabay');
    if (adminIdx !== -1) {
      rawList[adminIdx] = { ...rawList[adminIdx], username: 'ersidoabay', password: 'Helikina@#045536', role: 'admin' };
    } else {
      rawList.push({ username: 'ersidoabay', password: 'Helikina@#045536', role: 'admin', accessibleProjects: [] });
    }

    // Update or ensure Ersido Abayneh system admin account
    const ersidoIdx = rawList.findIndex((x: any) => x?.username?.toLowerCase() === 'ersido' || x?.username?.toLowerCase() === 'ersido abayneh');
    if (ersidoIdx !== -1) {
      rawList[ersidoIdx] = { ...rawList[ersidoIdx], username: 'Ersido Abayneh', password: 'Helikina@#045536', role: 'admin' };
    } else {
      rawList.push({ username: 'Ersido Abayneh', password: 'Helikina@#045536', role: 'admin', accessibleProjects: [] });
    }

    return deduplicateUsers(rawList);
  });

  // Init users store
  const getUsers = (): User[] => {
    return deduplicateUsers(usersListState);
  };

  const isMasterAdmin = currentUserObj?.role === 'admin' || 
                        currentUserObj?.role === 'master_admin' || 
                        currentUserObj?.username === 'proj_1781786415663' ||
                        (currentUserObj?.username && currentUserObj.username.toLowerCase().includes('ersido'));

  const [pendingUserPopups, setPendingUserPopups] = useState<User[]>([]);
  const seenPendingUsersRef = useRef<Set<string>>(new Set());
  const globalWsRef = useRef<WebSocket | null>(null);

  const saveUsers = (u: User[]) => {
    const deduped = deduplicateUsers(u);
    setUsersListState(deduped);
    safeSetItem('era_users_v28', JSON.stringify(deduped));
    safeSyncUsers(deduped).catch(err => {
      console.warn('Failed to sync users to cloud:', err);
    });

    if (globalWsRef.current && globalWsRef.current.readyState === WebSocket.OPEN) {
      try {
        globalWsRef.current.send(JSON.stringify({ type: 'users_update', data: deduped }));
      } catch (e) {}
    }
  };

  // User Access Administration draft state for pending changes
  const [editedUsers, setEditedUsers] = useState<{ [username: string]: User }>({});
  const [visiblePasswords, setVisiblePasswords] = useState<{ [username: string]: boolean }>({});
  const [newPasswordVisible, setNewPasswordVisible] = useState(false);
  const [newUserRole, setNewUserRole] = useState<User['role']>('viewer');

  const validatePassword = (password: string, role: string): string | null => {
    if (role === 'admin') return null;
    if (password.length < 8) {
      return "Password must be at least 8 characters long.";
    }
    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one capital (uppercase) letter.";
    }
    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number.";
    }
    return null;
  };

  const hasUserChanges = (username: string): boolean => {
    const draft = editedUsers[username];
    if (!draft) return false;
    const original = usersListState.find(x => x.username === username);
    if (!original) return false;

    if (draft.username !== original.username) return true;
    if (draft.password !== original.password) return true;

    const draftStatus = draft.status || 'Active';
    const origStatus = original.status || 'Active';
    if (draftStatus !== origStatus) return true;
    if (draft.role !== original.role) return true;

    const draftProj = JSON.stringify([...(draft.accessibleProjects || [])].sort());
    const origProj = JSON.stringify([...(original.accessibleProjects || [])].sort());
    if (draftProj !== origProj) return true;

    if (draft.isPendingApproval !== original.isPendingApproval) return true;

    return false;
  };

  const handleApproveUserImmediately = (username: string) => {
    const original = usersListState.find(x => x.username === username);
    if (!original) return;
    
    // Merge any existing edits for this user or create with defaults
    const currentDraft = editedUsers[username] || original;
    
    const approvedUserObj: User = {
      ...currentDraft,
      status: 'Active',
      isPendingApproval: false
    };
    
    const list = [...usersListState];
    const targetIdx = list.findIndex(x => x.username === username);
    if (targetIdx !== -1) {
      list[targetIdx] = approvedUserObj;
      saveUsers(list);
      
      // Clean up editedUsers draft
      setEditedUsers(prev => {
        const next = { ...prev };
        delete next[username];
        return next;
      });
      
      alert(`User "${username}" has been successfully approved, assigned, and activated!`);
    }
  };

  const handleApproveUserPopup = (userToApprove: User, assignedRole: string, assignedProjects: string[]) => {
    const allUsers = getUsers();
    const updatedUsers = allUsers.map(u => {
      if (u.username.toLowerCase() === userToApprove.username.toLowerCase()) {
        return {
          ...u,
          status: 'Active' as const,
          isPendingApproval: false,
          role: (assignedRole || u.role || 'editor') as any,
          accessibleProjects: assignedProjects,
          approvedBy: currentUserObj?.username,
          approvedAt: new Date().toISOString()
        };
      }
      return u;
    });

    saveUsers(updatedUsers);
    setPendingUserPopups(prev => prev.filter(p => p.username.toLowerCase() !== userToApprove.username.toLowerCase()));
    alert(`User "${userToApprove.username}" has been successfully APPROVED and activated!`);
  };

  const handleRejectUserPopup = (userToReject: User) => {
    if (!confirm(`Are you sure you want to reject and remove the registration request for "${userToReject.username}"?`)) return;

    const allUsers = getUsers();
    const updatedUsers = allUsers.filter(u => u.username.toLowerCase() !== userToReject.username.toLowerCase());

    saveUsers(updatedUsers);
    setPendingUserPopups(prev => prev.filter(p => p.username.toLowerCase() !== userToReject.username.toLowerCase()));
  };

  const handleConfigureUserPopup = (userToConfig: User) => {
    setSelectedAdminUser(userToConfig.username);
    setShowAdmin(true);
    setPendingUserPopups(prev => prev.filter(p => p.username.toLowerCase() !== userToConfig.username.toLowerCase()));
  };

  const handleDismissUserPopup = (userToDismiss: User) => {
    setPendingUserPopups(prev => prev.filter(p => p.username.toLowerCase() !== userToDismiss.username.toLowerCase()));
  };

  const updateUserDraft = (username: string, field: keyof User, value: any) => {
    setEditedUsers(prev => {
      const original = usersListState.find(x => x.username === username);
      if (!original) return prev;
      const currentDraft = prev[username] || { ...original };
      return {
        ...prev,
        [username]: {
          ...currentDraft,
          [field]: value
        }
      };
    });
  };

  const saveUserDraft = async (username: string) => {
    const draft = editedUsers[username];
    if (!draft) return;

    if (!draft.username || draft.username.trim() === '') {
      alert('Username cannot be empty.');
      return;
    }

    // Check if new username already exists for another user
    const otherUserExists = usersListState.some(
      x => x.username.toLowerCase() === draft.username.toLowerCase() && x.username !== username
    );
    if (otherUserExists) {
      alert(`The username "${draft.username}" is already taken.`);
      return;
    }

    if (draft.password) {
      const pwError = validatePassword(draft.password, draft.role);
      if (pwError) {
        alert(pwError);
        return;
      }
    }

    const list = [...usersListState];
    const targetIdx = list.findIndex(x => x.username === username);
    if (targetIdx !== -1) {
      const draftStatus = draft.status || 'Active';
      const oldUsername = username;
      const newUsername = draft.username;
      
      list[targetIdx] = { ...draft };
      
      try {
        saveUsers(list);
        setEditedUsers(prev => {
          const next = { ...prev };
          delete next[oldUsername];
          return next;
        });

        alert(`Access configuration saved successfully for user "${newUsername}".`);

        if (oldUsername === currentUserObj?.username) {
          const updatedUserObj = list[targetIdx];
          setCurrentUserObj(updatedUserObj);
          setCurrentUser(newUsername);
          localStorage.setItem('era_current_user', newUsername);
          localStorage.setItem('era_current_user_obj', JSON.stringify(updatedUserObj));
          if (draftStatus === 'Inactive') {
            alert('You have set your own credential status to Inactive. You will be logged out.');
            setCurrentUser(null);
            setCurrentUserObj(null);
            setShowAdmin(false);
          }
        }
      } catch (err) {
        alert(`Failed to save access changes: ${err}`);
      }
    }
  };

  const saveAllUserDrafts = async () => {
    const usernamesWithChanges = Object.keys(editedUsers).filter(un => hasUserChanges(un));
    if (usernamesWithChanges.length === 0) return;

    const list = [...usersListState];
    let loggedOutSelf = false;
    let updatedSelfObj: User | null = null;

    // Validate all first
    for (const username of usernamesWithChanges) {
      const draft = editedUsers[username];
      if (!draft) continue;

      if (!draft.username || draft.username.trim() === '') {
        alert(`Username cannot be empty for user "${username}".`);
        return;
      }

      const otherUserExists = list.some(
        x => x.username.toLowerCase() === draft.username.toLowerCase() && x.username !== username
      );
      if (otherUserExists) {
        alert(`The username "${draft.username}" is already taken.`);
        return;
      }

      if (draft.password) {
        const pwError = validatePassword(draft.password, draft.role);
        if (pwError) {
          alert(`For user "${draft.username}": ${pwError}`);
          return;
        }
      }
    }

    // Apply changes
    for (const username of usernamesWithChanges) {
      const draft = editedUsers[username];
      const targetIdx = list.findIndex(x => x.username === username);
      if (targetIdx !== -1 && draft) {
        list[targetIdx] = { ...draft };
        if (username === currentUserObj?.username) {
          updatedSelfObj = list[targetIdx];
          if ((draft.status || 'Active') === 'Inactive') {
            loggedOutSelf = true;
          }
        }
      }
    }

    try {
      saveUsers(list);
      setEditedUsers({});
      alert('All pending user access administration changes have been successfully saved.');
      
      if (updatedSelfObj) {
        setCurrentUserObj(updatedSelfObj);
        setCurrentUser(updatedSelfObj.username);
        localStorage.setItem('era_current_user', updatedSelfObj.username);
        localStorage.setItem('era_current_user_obj', JSON.stringify(updatedSelfObj));
      }

      if (loggedOutSelf) {
        alert('You have deactivated your own account status. Logging out.');
        setCurrentUser(null);
        setCurrentUserObj(null);
        setShowAdmin(false);
      }
    } catch (err) {
      alert(`Failed to save changes: ${err}`);
    }
  };

  const discardUserDraft = (username: string) => {
    setEditedUsers(prev => {
      const next = { ...prev };
      delete next[username];
      return next;
    });
  };

  const discardAllUserDrafts = () => {
    setEditedUsers({});
  };

  // Standalone Backend Live Sync State and Managers
  const [isSyncAutoSuspendDisabled, setIsSyncAutoSuspendDisabled] = useState(() => {
    return localStorage.getItem('era_sync_disable_autosuspend') !== 'false';
  });
  const [syncSuspended, setSyncSuspended] = useState(() => isSyncSuspended());

  const handleToggleSyncAutoSuspend = (checked: boolean) => {
    setIsSyncAutoSuspendDisabled(checked);
    localStorage.setItem('era_sync_disable_autosuspend', checked ? 'true' : 'false');
    reactivateSync().then(() => {
      setSyncSuspended(false);
    }).catch(() => {});
  };

  const handleManualReactivateSync = async () => {
    try {
      await reactivateSync();
      setSyncSuspended(false);
      const cloudData = await safeFetchProjects();
      if (cloudData && cloudData.length > 0) {
        setProjects(cloudData.map(syncProjectPayment));
      }
    } catch (err) {
      console.warn('Manual reactivation failed:', err);
    }
  };

  // -------------------------------------------------------------------------
  // Relational Cloud SQL Database Sync, Client Validation & Offline Support Daemon
  // -------------------------------------------------------------------------
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueueLength, setOfflineQueueLength] = useState(0);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [isSyncingQueue, setIsSyncingQueue] = useState(false);
  const [isBatchSyncing, setIsBatchSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Sync log fetching helper
  const fetchSyncLogs = async () => {
    try {
      const res = await fetch('/api/sync-logs');
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.logs) {
          setSyncLogs(json.logs);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch backend sync logs:', err);
    }
  };

// Lock to prevent concurrent sync executions
let isSyncingQueueRunning = false;

  // Trigger flushing offline queue to the server (conflict-resolution: last write wins)
  const triggerOfflineQueueSync = async () => {
    if (isSyncingQueueRunning) return;
    try {
      isSyncingQueueRunning = true;
      const queueStr = localStorage.getItem('era_offline_sync_queue') || '[]';
      const queue: Project[] = JSON.parse(queueStr);
      if (queue.length === 0) {
        isSyncingQueueRunning = false;
        return;
      }

      setIsSyncingQueue(true);
      console.log(`Starting background sync of ${queue.length} offline project updates to active databases...`);

      const remaining: Project[] = [];
      const results = await Promise.allSettled(queue.map(proj => safeSyncProject(proj, true)));
      results.forEach((res, index) => {
        if (res.status === 'rejected') {
          console.warn(`Failed to sync project ${queue[index].id}, keeping in offline queue:`, res.reason);
          remaining.push(queue[index]);
        } else {
          console.log(`Successfully synchronized enqueued project with all active databases: ${queue[index].name}`);
        }
      });

      localStorage.setItem('era_offline_sync_queue', JSON.stringify(remaining));
      setOfflineQueueLength(remaining.length);
      setLastSyncTime(new Date().toLocaleTimeString());
      fetchSyncLogs();
    } catch (e) {
      console.error('Error during offline queue sync processing:', e);
    } finally {
      setIsSyncingQueue(false);
      isSyncingQueueRunning = false;
    }
  };

let isBatchSyncRunning = false;

  const handleBatchSyncNow = async () => {
    if (isBatchSyncRunning) return;
    try {
      isBatchSyncRunning = true;
      const queueStr = localStorage.getItem('era_offline_sync_queue') || '[]';
      const queue: Project[] = JSON.parse(queueStr);
      if (queue.length === 0) {
        alert('No pending local changes in the offline queue to synchronize.');
        isBatchSyncRunning = false;
        return;
      }

      setIsBatchSyncing(true);
      console.log(`Starting high-priority manual batch synchronization of ${queue.length} pending local changes...`);

      // Clear/Synchronize local queue updates to backend Express REST API
      const remaining: Project[] = [];
      const results = await Promise.allSettled(queue.map(proj => safeSyncProject(proj, true)));
      results.forEach((res, index) => {
        if (res.status === 'rejected') {
          console.warn(`Failed to sync project ${queue[index].id}, keeping in offline queue:`, res.reason);
          remaining.push(queue[index]);
        }
      });

      localStorage.setItem('era_offline_sync_queue', JSON.stringify(remaining));
      setOfflineQueueLength(remaining.length);
      setLastSyncTime(new Date().toLocaleTimeString());
      fetchSyncLogs();

      if (remaining.length === 0) {
        alert('Batch synchronization completed successfully! All pending changes have been synchronized with the database.');
      } else {
        alert(`Batch synchronization finished. ${remaining.length} items could not be synchronized and remain in the offline queue.`);
      }
    } catch (error) {
      console.error('Error during manual batch synchronization:', error);
      alert('Failed to perform batch synchronization. Please try again.');
    } finally {
      setIsBatchSyncing(false);
      isBatchSyncRunning = false;
    }
  };

  // Hook to monitor connection and synchronize offline queue
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      triggerOfflineQueueSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check of offline queue length
    const checkQueue = () => {
      try {
        const queueStr = localStorage.getItem('era_offline_sync_queue') || '[]';
        const queue = JSON.parse(queueStr);
        setOfflineQueueLength(queue.length);
      } catch {
        setOfflineQueueLength(0);
      }
    };

    checkQueue();
    fetchSyncLogs();

    const mergeAndApplyUsers = (cloudUsers: User[]) => {
      if (!cloudUsers || !Array.isArray(cloudUsers)) return;
      setUsersListState(prev => {
        const map = new Map<string, User>();
        prev.forEach(u => { if (u?.username) map.set(u.username.toLowerCase(), u); });
        cloudUsers.forEach(u => {
          if (u?.username) {
            const lower = u.username.toLowerCase();
            const existing = map.get(lower);
            map.set(lower, existing ? { ...existing, ...u } : u);
          }
        });
        const merged = deduplicateUsers(Array.from(map.values()));
        safeSetItem('era_users_v28', JSON.stringify(merged));

        // Check for new pending user approvals for admin popup
        const isMasterAdmin = currentUserObj?.role === 'admin' || 
                              currentUserObj?.role === 'master_admin' || 
                              currentUserObj?.username === 'proj_1781786415663' ||
                              (currentUserObj?.username && currentUserObj.username.toLowerCase().includes('ersido'));

        if (isMasterAdmin) {
          const pendingList = merged.filter(u => u.isPendingApproval);
          const newUnseen = pendingList.filter(u => !seenPendingUsersRef.current.has(u.username.toLowerCase()));
          if (newUnseen.length > 0) {
            newUnseen.forEach(u => seenPendingUsersRef.current.add(u.username.toLowerCase()));
            setPendingUserPopups(prev => {
              const mapPop = new Map<string, User>();
              prev.forEach(p => mapPop.set(p.username.toLowerCase(), p));
              newUnseen.forEach(p => mapPop.set(p.username.toLowerCase(), p));
              return Array.from(mapPop.values());
            });
          }
        }

        // Auto-update logged-in user state if admin approved or updated their account
        if (currentUserObj && currentUserObj.username) {
          const updatedSelf = merged.find(u => u.username.toLowerCase() === currentUserObj.username.toLowerCase());
          if (updatedSelf) {
            if (
              updatedSelf.isPendingApproval !== currentUserObj.isPendingApproval ||
              updatedSelf.status !== currentUserObj.status ||
              updatedSelf.role !== currentUserObj.role ||
              JSON.stringify(updatedSelf.accessibleProjects) !== JSON.stringify(currentUserObj.accessibleProjects) ||
              JSON.stringify(updatedSelf.assignedPages) !== JSON.stringify(currentUserObj.assignedPages)
            ) {
              setCurrentUserObj(updatedSelf);
              safeSetItem('era_current_user_obj', JSON.stringify(updatedSelf));
            }
          }
        }

        return merged;
      });
    };

    // Handle real-time Open-Ended WebSocket connection and fallback SSE stream
    let eventSource: EventSource | null = null;
    let wsSocket: WebSocket | null = null;
    let wsReconnectTimeout: any = null;

    const handleRealtimePayload = (payload: any) => {
      if (payload.type === 'users_update' && Array.isArray(payload.data)) {
        mergeAndApplyUsers(payload.data);
      } else if (payload.type === 'approvals_update' && Array.isArray(payload.data)) {
        setPendingApprovals(payload.data);
        safeSetItem('era_appr_v28', JSON.stringify(payload.data));
      } else if (payload.type === 'project_update' && payload.data) {
        const incoming = syncProjectPayment(payload.data);
        setProjects(prev => {
          const idx = prev.findIndex(p => p.id === incoming.id);
          let updated;
          if (idx === -1) updated = [...prev, incoming];
          else {
            updated = [...prev];
            updated[idx] = incoming;
          }
          safeSetItem('era_proj_v28', JSON.stringify(updated));
          return updated;
        });
      } else if (payload.type === 'project_delete' && payload.data?.id) {
        setProjects(prev => {
          const updated = prev.filter(p => p.id !== payload.data.id);
          safeSetItem('era_proj_v28', JSON.stringify(updated));
          return updated;
        });
      } else if (payload.type === 'config_update' && payload.data) {
        if (payload.data.pmos) setPmos(payload.data.pmos);
        if (payload.data.directorates) setProgramDirectorates(payload.data.directorates);
      }
    };

    const initWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        wsSocket = new WebSocket(wsUrl);
        globalWsRef.current = wsSocket;

        wsSocket.onopen = () => {
          console.log('[Real-Time WS] Open-ended WebSocket connected!');
        };

        wsSocket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            handleRealtimePayload(payload);
          } catch (e) {}
        };

        wsSocket.onerror = () => {
          /* reconnect in onclose */
        };

        wsSocket.onclose = () => {
          console.log('[Real-Time WS] WebSocket disconnected, reconnecting in 2s...');
          globalWsRef.current = null;
          clearTimeout(wsReconnectTimeout);
          wsReconnectTimeout = setTimeout(initWebSocket, 2000);
        };
      } catch (err) {
        console.warn('[Real-Time WS] WebSocket failed, relying on SSE:', err);
      }
    };

    let sseReconnectTimeout: any = null;

    const initSSE = () => {
      try {
        if (eventSource) {
          try { eventSource.close(); } catch (e) {}
          eventSource = null;
        }

        eventSource = new EventSource('/api/events');

        eventSource.onopen = () => {
          console.log('[Real-Time SSE] SSE event stream connected successfully.');
        };

        eventSource.onmessage = (event) => {
          try {
            if (!event.data) return;
            const payload = JSON.parse(event.data);
            handleRealtimePayload(payload);
          } catch (err) {}
        };

        eventSource.onerror = () => {
          if (eventSource && eventSource.readyState === EventSource.CLOSED) {
            console.log('[Real-Time SSE] SSE connection closed. Retrying stream in 3s...');
            try { eventSource.close(); } catch (e) {}
            eventSource = null;
            clearTimeout(sseReconnectTimeout);
            sseReconnectTimeout = setTimeout(() => {
              if (navigator.onLine) initSSE();
            }, 3000);
          }
        };
      } catch (e) {
        console.warn('[Real-Time SSE] SSE initialization fallback error:', e);
      }
    };

    initWebSocket();
    initSSE();

    const pollAllBackendData = () => {
      if (!navigator.onLine) return;
      safeFetchUsers().then(cloudUsers => {
        if (cloudUsers) mergeAndApplyUsers(cloudUsers);
      }).catch(() => {});

      safeFetchApprovals().then(cloudApprovals => {
        if (cloudApprovals) {
          setPendingApprovals(cloudApprovals);
          safeSetItem('era_appr_v28', JSON.stringify(cloudApprovals));
        }
      }).catch(() => {});

      safeFetchProjects().then(cloudProjects => {
        if (cloudProjects && cloudProjects.length > 0) {
          const normalized = cloudProjects.map(syncProjectPayment);
          setProjects(prev => {
            let deletedIds: string[] = [];
            try {
              const delStr = localStorage.getItem('era_deleted_project_ids') || '[]';
              deletedIds = JSON.parse(delStr);
            } catch {}

            const merged = [...prev];
            normalized.forEach(inc => {
              if (deletedIds.includes(inc.id)) return;
              const idx = merged.findIndex(p => p.id === inc.id);
              if (idx === -1) {
                merged.push(inc);
              } else {
                const existing = merged[idx];
                const existingTime = existing.lastModifiedAt ? new Date(existing.lastModifiedAt).getTime() : 0;
                const incTime = inc.lastModifiedAt ? new Date(inc.lastModifiedAt).getTime() : 0;
                if (incTime >= existingTime) {
                  merged[idx] = inc;
                }
              }
            });
            const filtered = merged.filter(p => !deletedIds.includes(p.id));
            safeSetItem('era_proj_v28', JSON.stringify(filtered));
            return filtered;
          });
        }
      }).catch(() => {});

      safeFetchConfig().then(cloudConfig => {
        if (cloudConfig) {
          if (cloudConfig.pmos) setPmos(cloudConfig.pmos);
          if (cloudConfig.directorates) setProgramDirectorates(cloudConfig.directorates);
        }
      }).catch(() => {});
    };

    // Run initial sync on mount
    pollAllBackendData();

    // Sync initial local users to backend so new installations share default users
    safeSyncUsers(usersListState).catch(() => {});

    const interval = setInterval(() => {
      checkQueue();
      const suspended = isSyncSuspended();
      setSyncSuspended(suspended);
      if (navigator.onLine) {
        triggerOfflineQueueSync();
        pollAllBackendData();
      }
    }, 8000); // Check every 8s

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (eventSource) {
        try { eventSource.close(); } catch (e) {}
      }
      if (wsSocket) {
        try { wsSocket.close(); } catch (e) {}
      }
      clearTimeout(wsReconnectTimeout);
      clearTimeout(sseReconnectTimeout);
      clearInterval(interval);
    };
  }, []);

  // Effect to automatically synchronize and prompt master admin with any previous or new pending users
  useEffect(() => {
    if (isMasterAdmin && usersListState.length > 0) {
      const pendingList = usersListState.filter(u => u.isPendingApproval || u.status === 'Inactive' || u.status === 'Pending');
      const newUnseen = pendingList.filter(u => !seenPendingUsersRef.current.has(u.username.toLowerCase()));
      if (newUnseen.length > 0) {
        newUnseen.forEach(u => seenPendingUsersRef.current.add(u.username.toLowerCase()));
        setPendingUserPopups(prev => {
          const mapPop = new Map<string, User>();
          prev.forEach(p => mapPop.set(p.username.toLowerCase(), p));
          newUnseen.forEach(p => mapPop.set(p.username.toLowerCase(), p));
          return Array.from(mapPop.values());
        });
      }
    }
  }, [isMasterAdmin, usersListState, currentUserObj]);

  // Helper to synchronize 'Total Todate Bill Summary' and 'Remaining' with series sums, and calculate G = F + E
  const syncProjectPayment = (project: Project): Project => {
    const isDB = project.contractType === 'DB';
    const tc = (project.series || []).reduce((sum, item) => sum + (item.contractAmt || 0), 0);
    const teVal = (project.series || []).reduce((sum, item) => sum + (item.execAmt || 0), 0);
    const totalSeriesSum = tc;
    const ps = project.provisionalSum || 0;

    let er = 0;
    if (isDB) {
      er = tc;
    } else {
      const c_sub = tc - ps;
      const cont = c_sub * 0.10;
      er = tc + cont;
    }
    const vat = er * 0.15;
    const gt = er + vat; // G = F + E
    const updatedOrigAmount = gt / 1_000_000;

    let finalProject = { ...project, origAmount: updatedOrigAmount };

    if (project.payment) {
      let hasBillSummary = project.payment.some(p => p.item.trim().toLowerCase() === 'total todate bill summary');
      let hasRemaining = project.payment.some(p => p.item.trim().toLowerCase() === 'remaining');
      let hasPriceAdj = project.payment.some(p => p.item.trim().toLowerCase().includes('price adjustment'));
      let hasAdvanceRepayment = project.payment.some(p => p.item.trim().toLowerCase().includes('advance repayment'));
      let hasRetentionMoney = project.payment.some(p => p.item.trim().toLowerCase().includes('retention money'));
      let updatedPayment = [...project.payment];

      const origContractETB = (updatedOrigAmount || 1) * 1_000_000;
      const rate = project.usdExchangeRate !== undefined ? project.usdExchangeRate : 57.50;
      const cumBillSummary = (project.ipcTracker || []).reduce((sum, item) => {
        const totalGrossEtb = (item.grossBillEtb || 0) + (rate * (item.grossBillUsd || 0));
        return sum + totalGrossEtb;
      }, 0);
      const cumPriceAdj = (project.ipcTracker || []).reduce((sum, item) => {
        const totalPaEtb = (item.priceAdjustmentEtb || 0) + (rate * (item.priceAdjustmentUsd || 0));
        return sum + totalPaEtb;
      }, 0);
      const cumAdvanceRepayment = (project.ipcTracker || []).reduce((sum, item) => {
        return sum + (item.advanceRepaymentEtb || 0);
      }, 0);
      const cumRetention = (project.ipcTracker || []).reduce((sum, item) => {
        return sum + (item.retentionEtb || 0);
      }, 0);

      if (!hasBillSummary) {
        updatedPayment.push({ item: 'Total Todate Bill Summary', amount: teVal, percent: 0 });
      }
      if (!hasRemaining) {
        updatedPayment.push({ item: 'Remaining', amount: Math.max(0, origContractETB - cumBillSummary), percent: 0 });
      }
      if (!hasPriceAdj) {
        updatedPayment.push({ item: 'Price Adjustment', amount: 0, percent: 0 });
      }
      if (!hasAdvanceRepayment) {
        updatedPayment.push({ item: 'Advance Repayment', amount: 0, percent: 0 });
      }

      const syncedPayment = updatedPayment.map(p => {
        const itemLower = p.item.trim().toLowerCase();
        if (itemLower === 'total todate bill summary') {
          return {
            ...p,
            item: 'Total Todate Bill Summary',
            amount: cumBillSummary,
            percent: origContractETB > 0 ? (cumBillSummary / origContractETB) * 100 : 0
          };
        }
        if (itemLower === 'remaining') {
          const remAmt = Math.max(0, origContractETB - cumBillSummary);
          return {
            ...p,
            item: 'Remaining',
            amount: remAmt,
            percent: origContractETB > 0 ? (remAmt / origContractETB) * 100 : 0
          };
        }
        if (itemLower.includes('price adjustment')) {
          const orig = (updatedOrigAmount || 1) * 1_000_000;
          return {
            ...p,
            amount: cumPriceAdj,
            percent: orig > 0 ? (cumPriceAdj / orig) * 100 : 0
          };
        }
        if (itemLower.includes('advance repayment')) {
          const orig = (updatedOrigAmount || 1) * 1_000_000;
          return {
            ...p,
            amount: cumAdvanceRepayment,
            percent: orig > 0 ? (cumAdvanceRepayment / orig) * 100 : 0
          };
        }
        if (itemLower.includes('retention money')) {
          const orig = (updatedOrigAmount || 1) * 1_000_000;
          return {
            ...p,
            amount: cumRetention,
            percent: orig > 0 ? (cumRetention / orig) * 100 : 0
          };
        }
        return p;
      });
      finalProject.payment = syncedPayment;
    }
    return finalProject;
  };

  // On mount
  useEffect(() => {
    // Dark mode check
    if (localStorage.getItem('theme') === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
    
    // Load local database as immediate fallback
    let projList: Project[] = [];
    try {
      const s = localStorage.getItem('era_proj_v28');
      if (s) projList = JSON.parse(s);
    } catch {}

    if (projList.length === 0) {
      const dp = defaultProjectTemplate();
      projList = [dp];
    }

    const normalizedLocal = projList.map(syncProjectPayment);
    setProjects(normalizedLocal);

    // Dynamic asynchronous initialization from Cloud Databases
    const initCloudDatabase = async () => {
      try {
        const cloudData = await safeFetchProjects();
        if (cloudData && cloudData.length > 0) {
          const normalizedCloud = cloudData.map(syncProjectPayment);
          
          // Merge local and cloud projects to ensure "once a project is added no loss of project data except for modification".
          // We resolve conflicts by keeping the project with the newer modification timestamp, and we filter deleted project IDs.
          let deletedIds: string[] = [];
          try {
            const delStr = localStorage.getItem('era_deleted_project_ids') || '[]';
            deletedIds = JSON.parse(delStr);
          } catch {}

          const merged = [...normalizedLocal];
          normalizedCloud.forEach(cloudProj => {
            const idx = merged.findIndex(p => p.id === cloudProj.id);
            if (idx === -1) {
              merged.push(cloudProj);
            } else {
              const existing = merged[idx];
              const existingTime = existing.lastModifiedAt ? new Date(existing.lastModifiedAt).getTime() : 0;
              const cloudTime = cloudProj.lastModifiedAt ? new Date(cloudProj.lastModifiedAt).getTime() : 0;
              if (cloudTime >= existingTime) {
                merged[idx] = cloudProj;
              }
            }
          });

          const filteredMerged = merged.filter(p => !deletedIds.includes(p.id));

          // Sync back local-only projects to the Cloud Databases (only non-deleted ones)
          const projectsToSyncBack = filteredMerged.filter(p => !normalizedCloud.some(cp => cp.id === p.id));
          projectsToSyncBack.forEach(p => {
            safeSyncProject(p).catch(err => console.warn('Failed to sync back local-only project:', err));
          });

          setProjects(filteredMerged);
          safeSetItem('era_proj_v28', JSON.stringify(filteredMerged));
          console.log('Successfully merged and initialized active contracts with cloud authoritative database.');
        } else {
          console.log('Cloud database is empty or inaccessible. Keeping local baseline data.');
        }
      } catch (err) {
        console.warn('Cloud database offline or table does not exist yet. Relying on localStorage:', err);
      }

      // Sync additional inputs and configurations from server database
      try {
        const [cloudUsers, cloudApprovals, cloudConfig] = await Promise.all([
          safeFetchUsers(),
          safeFetchApprovals(),
          safeFetchConfig()
        ]);

        if (cloudUsers && cloudUsers.length > 0) {
          setUsersListState(cloudUsers);
          safeSetItem('era_users_v28', JSON.stringify(cloudUsers));
        } else {
          // No users in DB yet, seed initial users
          const initialUsers = getUsers();
          await safeSyncUsers(initialUsers);
        }

        if (cloudApprovals && cloudApprovals.length > 0) {
          setPendingApprovals(cloudApprovals);
          safeSetItem('era_appr_v28', JSON.stringify(cloudApprovals));
        }

        if (cloudConfig) {
          if (cloudConfig.pmos && cloudConfig.pmos.length > 0) {
            setPmos(cloudConfig.pmos);
            safeSetItem('era_pmos_v1', JSON.stringify(cloudConfig.pmos));
          }
          if (cloudConfig.directorates && cloudConfig.directorates.length > 0) {
            setProgramDirectorates(cloudConfig.directorates);
            safeSetItem('era_directorates_v1', JSON.stringify(cloudConfig.directorates));
          }
        } else {
          // No config in DB, seed it
          await safeSyncConfig(pmos, programDirectorates);
        }
      } catch (err) {
        console.warn('Failed to sync configs/users/approvals from cloud:', err);
      }
    };

    initCloudDatabase();

    // Set up SSE Fallback Real-Time subscription with Cloud SQL (PostgreSQL API)
    const eventSource = new EventSource('/api/events');
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === 'project_update' && payload.data) {
          const incomingRaw = payload.data.data ? (typeof payload.data.data === 'string' ? JSON.parse(payload.data.data) : payload.data.data) : payload.data;
          const incoming = syncProjectPayment(incomingRaw);

          let deletedIds: string[] = [];
          try {
            const delStr = localStorage.getItem('era_deleted_project_ids') || '[]';
            deletedIds = JSON.parse(delStr);
          } catch {}

          if (deletedIds.includes(incoming.id)) return;

          setProjects(prevProjects => {
            const merged = [...prevProjects];
            const idx = merged.findIndex(p => p.id === incoming.id);
            if (idx === -1) {
              merged.push(incoming);
            } else {
              const existing = merged[idx];
              const existingTime = existing.lastModifiedAt ? new Date(existing.lastModifiedAt).getTime() : 0;
              const incomingTime = incoming.lastModifiedAt ? new Date(incoming.lastModifiedAt).getTime() : 0;
              if (incomingTime >= existingTime) {
                merged[idx] = incoming;
              }
            }
            safeSetItem('era_proj_v28', JSON.stringify(merged));
            return merged;
          });
          
          setCurrentProjectId((prevId) => {
            if (prevId === incoming.id) {
              setCurrentProject(prev => {
                if (!prev) return incoming;
                const prevTime = prev.lastModifiedAt ? new Date(prev.lastModifiedAt).getTime() : 0;
                const incomingTime = incoming.lastModifiedAt ? new Date(incoming.lastModifiedAt).getTime() : 0;
                return incomingTime >= prevTime ? incoming : prev;
              });
            }
            return prevId;
          });
        } else if (payload.type === 'project_delete' && payload.data?.id) {
          const deleteId = payload.data.id;
          try {
            const delStr = localStorage.getItem('era_deleted_project_ids') || '[]';
            const deletedIds: string[] = JSON.parse(delStr);
            if (!deletedIds.includes(deleteId)) {
              deletedIds.push(deleteId);
              localStorage.setItem('era_deleted_project_ids', JSON.stringify(deletedIds));
            }
          } catch {}

          setProjects(prevProjects => {
            const merged = prevProjects.filter(p => p.id !== deleteId);
            safeSetItem('era_proj_v28', JSON.stringify(merged));
            return merged;
          });
        }
      } catch (err) {
        console.warn('Failed to parse SSE real-time event:', err);
      }
    };
    eventSource.onerror = (err) => {
      console.warn('SSE fallback subscription error:', err);
    };

    try {
      const appr = localStorage.getItem('era_appr_v28');
      if (appr) setPendingApprovals(JSON.parse(appr));
    } catch {}

    // Simulated network peers
    const defaultPeers = ['Abebe_Mesele', 'Sileshi_Kassa', 'Hiwot_Abay'];
    setOnlinePeers(defaultPeers);

    return () => {
      eventSource.close();
    };
  }, []);


  // --- Google Drive Real-Time Sync is Disabled ---


  // Update light/dark modes
  const handleToggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
      safeSetItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      safeSetItem('theme', 'light');
    }
  };

  const handleLoginSuccess = (un: string, userObj: User) => {
    setCurrentUser(un);
    setCurrentUserObj(userObj);
    localStorage.setItem('era_current_user', un);
    localStorage.setItem('era_current_user_obj', JSON.stringify(userObj));
    setCurrentPage('projects');
  };

  const handleSelectProject = (id: string) => {
    const isMasterAdmin = currentUserObj?.role === 'admin' || currentUserObj?.role === 'master_admin' || currentUserObj?.role === 'cpm_admin' || currentUserObj?.username === 'proj_1781786415663';
    if (!isMasterAdmin) {
      const proj = projects.find(pr => pr.id === id);
      if (currentUserObj?.role === 'directorate_admin') {
        if ((proj?.programDirectorate || 'Southern') !== currentUserObj.assignedDirectorate) {
          alert('Access Denied: Not in your Directorate.');
          return;
        }
      } else if (currentUserObj?.role === 'pmo_admin') {
        if ((proj?.pmo || '') !== currentUserObj.assignedPmo) {
          alert('Access Denied: Not in your PMO.');
          return;
        }
      } else {
        const allowed = currentUserObj?.accessibleProjects || [];
        if (!allowed.includes(id)) {
          alert('Access Denied: You are not assigned to this project.');
          return;
        }
      }
    }
    setCurrentProjectId(id);
    const p = projects.find(pr => pr.id === id);
    if (p) {
      setCurrentProject(p);
      setCurrentPage('dashboard');
      if (currentUserObj && currentUserObj.assignedPages && Array.isArray(currentUserObj.assignedPages) && currentUserObj.assignedPages.length > 0 && !isMasterAdmin) {
        if (!currentUserObj.assignedPages.includes(activeTab)) {
          setActiveTab(currentUserObj.assignedPages[0]);
        }
      } else {
        setActiveTab('dash');
      }
    }
  };

  const handleAddNewProject = (customId?: string, customName?: string) => {
    if (currentUserObj?.role !== 'admin' && currentUserObj?.role !== 'editor' && currentUserObj?.username !== 'proj_1781786415663') return;
    
    const np = blankProjectTemplate();
    if (customId) {
      np.id = customId.trim();
    }
    if (customName) {
      np.name = customName.trim();
    }
    np.lastModifiedAt = new Date().toISOString();
    np.lastModifiedBy = currentUserObj.username;

    // Route to approvals if editor
    if (currentUserObj?.role === 'editor') {
      const reason = prompt(
        '🔑 NEW PROJECT CREATION: SUBMISSION FOR APPROVAL REQUIRED\n\n' +
        'You are logged in with role "editor".\n' +
        'Under ERA project governance rules, any new road projects created by editors must be reviewed and approved by an Admin or Approver before taking effect.\n\n' +
        'Please specify a description or reference for this new project:',
        `Create project: ${customName || 'New Project'}`
      );
      if (reason === null) return; // cancelled

      try {
        const newReq: ApprovalRequest = {
          id: `req_${Date.now()}`,
          projectId: np.id,
          projectName: np.name,
          requestedBy: currentUserObj.username,
          requestedAt: new Date().toISOString(),
          section: reason || 'Create New Project',
          pageId: 'projects',
          status: 'pending',
          snapshotData: np,
        };

        const updatedList = [...pendingApprovals, newReq];
        setPendingApprovals(updatedList);
        safeSetItem('era_appr_v28', JSON.stringify(updatedList));
        safeSyncApprovals(updatedList).catch(err => {
          console.warn('Syncing approvals failed:', err);
        });

        alert(
          '🚀 PROJECT CREATION SUBMITTED FOR APPROVAL!\n\n' +
          'Your new project request has been logged and sent to the Approval Queue.\n' +
          'An Admin or Approver will authorize this road project before it is initialized.'
        );
      } catch (err) {
        console.error('Failed to submit approval request:', err);
        alert('Failed to submit approval request.');
      }
      return;
    }

    const updated = [...projects, np];
    setProjects(updated);
    safeSetItem('era_proj_v28', JSON.stringify(updated));

    // Sync to Cloud Databases in real-time
    safeSyncProject(np).catch(err => {
      console.warn('Project creation cloud sync fell back to local storage:', err);
    });
  };

  const handleDeleteProject = (id: string) => {
    const isMasterAdmin = currentUserObj?.role === 'admin' || 
                          currentUserObj?.role === 'master_admin' || 
                          currentUserObj?.role === 'directorate_admin' || 
                          currentUserObj?.role === 'pmo_admin' || 
                          currentUserObj?.username === 'proj_1781786415663' ||
                          (currentUserObj?.username && currentUserObj.username.toLowerCase().includes('ersido'));
    if (!isMasterAdmin) {
      alert("Access Denied: Only System Administrators with Admin credentials are authorized to delete projects.");
      return;
    }

    const projToDelete = projects.find(p => p.id === id);
    if (!projToDelete) return;

    // Record deleted ID and filter from offline queue so sync daemon doesn't push it back
    try {
      const delStr = localStorage.getItem('era_deleted_project_ids') || '[]';
      const deletedIds: string[] = JSON.parse(delStr);
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem('era_deleted_project_ids', JSON.stringify(deletedIds));
      }

      const queueStr = localStorage.getItem('era_offline_sync_queue') || '[]';
      const queue: Project[] = JSON.parse(queueStr);
      const filteredQueue = queue.filter(p => p.id !== id);
      localStorage.setItem('era_offline_sync_queue', JSON.stringify(filteredQueue));
    } catch (err) {
      console.warn('Failed to filter offline sync queue on delete:', err);
    }

    const updatedProjects = projects.filter(p => p.id !== id);
    setProjects(updatedProjects);
    safeSetItem('era_proj_v28', JSON.stringify(updatedProjects));

    safeDeleteProject(id).catch(err => {
      console.warn('Cloud delete project warning:', err);
    });

    if (currentProjectId === id) {
      setCurrentProjectId(null);
      setCurrentProject(null);
      setCurrentPage('projects');
      localStorage.removeItem('era_current_project_id');
    }

    alert(`Project "${projToDelete.name}" (ID: ${id}) has been successfully deleted from the system.`);
  };

  const handleUpdateProjectStatus = (id: string, newStatus: ProjectLifecycleStatus) => {
    const isAdmin = currentUserObj?.role === 'admin' || currentUserObj?.role === 'master_admin' || currentUserObj?.role === 'directorate_admin' || currentUserObj?.role === 'pmo_admin' || currentUserObj?.username === 'proj_1781786415663';
    if (!isAdmin) {
      alert("Access Denied: Only Directorate Admins and System Administrators can assign or update project lifecycle status.");
      return;
    }

    const updatedList = projects.map(p => {
      if (p.id === id) {
        return {
          ...p,
          status: newStatus,
          lastModifiedBy: currentUserObj?.username || 'Directorate Admin',
          lastModifiedAt: new Date().toISOString(),
          lastModifiedSection: `Project Status updated to ${newStatus}`
        };
      }
      return p;
    });

    setProjects(updatedList);
    safeSetItem('era_proj_v28', JSON.stringify(updatedList));

    const updatedProj = updatedList.find(p => p.id === id);
    if (updatedProj) {
      safeSyncProject(updatedProj).catch(err => console.warn('Status sync warning:', err));
      if (currentProjectId === id) {
        setCurrentProject(updatedProj);
      }
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setCurrentUserObj(null);
    localStorage.removeItem('era_current_user');
    localStorage.removeItem('era_current_user_obj');
    localStorage.removeItem('era_current_page');
    localStorage.removeItem('era_active_tab');
    localStorage.removeItem('era_current_project_id');
    setCurrentPage('login');
  };

  // General atomic updates to active project
  const handleProjectUpdate = (fields: Partial<Project>, sectionName: string) => {
    if (!currentProject || !currentUserObj) return;
    if (currentUserObj.role === 'viewer' && currentUserObj.username !== 'proj_1781786415663') {
      alert('🔒 READ-ONLY: Viewer accounts cannot modify project data.');
      return;
    }

    // 1. Check if user is assigned editing permission for this page by the Admin
    if (!canUserEditPage(currentUserObj, activeTab)) {
      alert(
        `🔒 PAGE EDITING ACCESS RESTRICTED\n\n` +
        `Your System Administrator has not assigned you editing permission for page "${activeTab}".\n` +
        `Please request your Administrator to assign editing access for this page.`
      );
      return;
    }

    const updatedProject = {
      ...currentProject,
      ...fields,
      lastModifiedBy: currentUserObj.username,
      lastModifiedAt: new Date().toISOString(),
      lastModifiedSection: sectionName
    };

    // 1. S-Curve & Overall Physical Progress automatic bidirectional integration
    const monthLabel = updatedProject.progressPlanLabels?.monthLabel || 'Feb 2026';
    const parts = monthLabel.trim().split(/\s+/);
    let targetMonthKey = '';
    if (parts.length === 2) {
      const mon = parts[0].substring(0, 3);
      const yr = parts[1].substring(2);
      targetMonthKey = `${mon}-${yr}`; // e.g., 'Feb-26'
    }

    if (fields.physicalProgress !== undefined && updatedProject.monthly) {
      // If user updated physicalProgress, update the corresponding S-Curve month's actual value
      updatedProject.monthly = updatedProject.monthly.map(m => {
        if (m.month.toLowerCase() === targetMonthKey.toLowerCase()) {
          return { ...m, actual: fields.physicalProgress! };
        }
        return m;
      });

      // ALSO: Apply that change on the S-Curve Analysis (Monthly Cumulative %) table last row and last column
      if (updatedProject.monthly.length > 0) {
        const lastIdx = updatedProject.monthly.length - 1;
        updatedProject.monthly = updatedProject.monthly.map((m, idx) => {
          if (idx === lastIdx) {
            return { ...m, actual: fields.physicalProgress! };
          }
          return m;
        });
      }
    } else if (fields.monthly !== undefined) {
      // ALWAYS auto link: if user updated S-Curve, update overall physicalProgress with the last S-Curve month's actual value
      if (updatedProject.monthly && updatedProject.monthly.length > 0) {
        const lastIdx = updatedProject.monthly.length - 1;
        updatedProject.physicalProgress = updatedProject.monthly[lastIdx].actual;
      }
    }

    // 2. Linear Diagram vs Quantities automatic integration (Main Road + Spur Road combined)
    if ((fields.linear !== undefined || fields.linearSpur !== undefined) && updatedProject.quantities) {
      const mainLinear = updatedProject.linear || { subgrade: [], capping: [], subbase: [], basecourse: [], asphalt: [] };
      const spurLinear = updatedProject.linearSpur || { subgrade: [], capping: [], subbase: [], basecourse: [], asphalt: [] };

      const sumSubbase = (mainLinear.subbase || []).reduce((acc, seg) => acc + (seg.exec || 0), 0) +
                         (spurLinear.subbase || []).reduce((acc, seg) => acc + (seg.exec || 0), 0);
      const sumBasecourse = (mainLinear.basecourse || []).reduce((acc, seg) => acc + (seg.exec || 0), 0) +
                            (spurLinear.basecourse || []).reduce((acc, seg) => acc + (seg.exec || 0), 0);
      const sumAsphalt = (mainLinear.asphalt || []).reduce((acc, seg) => acc + (seg.exec || 0), 0) +
                         (spurLinear.asphalt || []).reduce((acc, seg) => acc + (seg.exec || 0), 0);

      updatedProject.quantities = updatedProject.quantities.map(q => {
        const nameLower = q.name.toLowerCase();
        if (nameLower.includes('sub base') || nameLower.includes('subbase')) {
          return { ...q, exec: sumSubbase };
        }
        if (nameLower.includes('base course') || nameLower.includes('basecourse')) {
          return { ...q, exec: sumBasecourse };
        }
        if (nameLower.includes('asphalt concrete') || nameLower.includes('asphalt') || nameLower.includes('prime coating')) {
          return { ...q, exec: sumAsphalt };
        }
        return q;
      });
    }

    // 3. Keep 'Total Todate Bill Summary' and 'Remaining' in payment synced with 'te' and series contract sum, and auto-calculate Original Cost Sum G = F + E
    const isDB = updatedProject.contractType === 'DB';
    const tc = (updatedProject.series || []).reduce((sum, item) => sum + (item.contractAmt || 0), 0);
    const teVal = (updatedProject.series || []).reduce((sum, item) => sum + (item.execAmt || 0), 0);
    const totalSeriesSum = tc;
    const ps = updatedProject.provisionalSum || 0;

    let er = 0;
    if (isDB) {
      er = tc;
    } else {
      const c_sub = tc - ps;
      const cont = c_sub * 0.10;
      er = tc + cont;
    }
    const vat = er * 0.15;
    const gt = er + vat; // G = F + E

    // Automatically set origAmount to gt / 1_000_000 (Grand Original Contract Total in Million Birr)
    updatedProject.origAmount = gt / 1_000_000;

    if (updatedProject.payment) {
      let hasBillSummary = updatedProject.payment.some(p => p.item.trim().toLowerCase() === 'total todate bill summary');
      let hasRemaining = updatedProject.payment.some(p => p.item.trim().toLowerCase() === 'remaining');
      let hasPriceAdj = updatedProject.payment.some(p => p.item.trim().toLowerCase().includes('price adjustment'));
      let hasAdvanceRepayment = updatedProject.payment.some(p => p.item.trim().toLowerCase().includes('advance repayment'));
      let hasRetentionMoney = updatedProject.payment.some(p => p.item.trim().toLowerCase().includes('retention money'));
      let updatedPayment = [...updatedProject.payment];

      const origContractETB = (updatedProject.origAmount || 1) * 1_000_000;
      const rate = updatedProject.usdExchangeRate !== undefined ? updatedProject.usdExchangeRate : 57.50;
      const cumBillSummary = (updatedProject.ipcTracker || []).reduce((sum, item) => {
        const totalGrossEtb = (item.grossBillEtb || 0) + (rate * (item.grossBillUsd || 0));
        return sum + totalGrossEtb;
      }, 0);
      const cumPriceAdj = (updatedProject.ipcTracker || []).reduce((sum, item) => {
        const totalPaEtb = (item.priceAdjustmentEtb || 0) + (rate * (item.priceAdjustmentUsd || 0));
        return sum + totalPaEtb;
      }, 0);
      const cumAdvanceRepayment = (updatedProject.ipcTracker || []).reduce((sum, item) => {
        return sum + (item.advanceRepaymentEtb || 0);
      }, 0);
      const cumRetention = (updatedProject.ipcTracker || []).reduce((sum, item) => {
        return sum + (item.retentionEtb || 0);
      }, 0);

      if (!hasBillSummary) {
        updatedPayment.push({ item: 'Total Todate Bill Summary', amount: teVal, percent: 0 });
      }
      if (!hasRemaining) {
        updatedPayment.push({ item: 'Remaining', amount: Math.max(0, origContractETB - cumBillSummary), percent: 0 });
      }
      if (!hasPriceAdj) {
        updatedPayment.push({ item: 'Price Adjustment', amount: 0, percent: 0 });
      }
      if (!hasAdvanceRepayment) {
        updatedPayment.push({ item: 'Advance Repayment', amount: 0, percent: 0 });
      }
      if (!hasRetentionMoney) {
        updatedPayment.push({ item: 'Retention Money', amount: 0, percent: 0 });
      }

      updatedProject.payment = updatedPayment.map(p => {
        const itemLower = p.item.trim().toLowerCase();
        if (itemLower === 'total todate bill summary') {
          return {
            ...p,
            item: 'Total Todate Bill Summary',
            amount: cumBillSummary,
            percent: origContractETB > 0 ? (cumBillSummary / origContractETB) * 100 : 0
          };
        }
        if (itemLower === 'remaining') {
          const remAmt = Math.max(0, origContractETB - cumBillSummary);
          return {
            ...p,
            item: 'Remaining',
            amount: remAmt,
            percent: origContractETB > 0 ? (remAmt / origContractETB) * 100 : 0
          };
        }
        if (itemLower.includes('price adjustment')) {
          const orig = (updatedProject.origAmount || 1) * 1_000_000;
          return {
            ...p,
            amount: cumPriceAdj,
            percent: orig > 0 ? (cumPriceAdj / orig) * 100 : 0
          };
        }
        if (itemLower.includes('advance repayment')) {
          const orig = (updatedProject.origAmount || 1) * 1_000_000;
          return {
            ...p,
            amount: cumAdvanceRepayment,
            percent: orig > 0 ? (cumAdvanceRepayment / orig) * 100 : 0
          };
        }
        if (itemLower.includes('retention money')) {
          const orig = (updatedProject.origAmount || 1) * 1_000_000;
          return {
            ...p,
            amount: cumRetention,
            percent: orig > 0 ? (cumRetention / orig) * 100 : 0
          };
        }
        return p;
      });
    }

    // Auto-update project history too
    const newHistory: typeof currentProject.history = [
      {
        timestamp: new Date().toLocaleString(),
        user: currentUserObj.username,
        section: sectionName,
        physicalProgress: updatedProject.physicalProgress !== undefined ? updatedProject.physicalProgress : currentProject.physicalProgress
      },
      ...(currentProject.history || [])
    ].slice(0, 10); // Maintain max 10 entries

    updatedProject.history = newHistory;

    // Intercept modifications made by users without Approval Credentials and route to approvals
    if (!hasApprovalCredentials(currentUserObj)) {
      const reason = prompt(
        '🔑 EDIT SUBMISSION FOR APPROVAL REQUIRED\n\n' +
        `You have page editing access for "${sectionName || activeTab}".\n` +
        'Under governance rules, any modifications must be reviewed and approved by a user with Approval Credentials before data is incorporated into the live database.\n\n' +
        'Please enter a description for this update:',
        sectionName || 'Project data modifications'
      );
      if (reason === null) return; // User cancelled
      
      try {
        const newReq: ApprovalRequest = {
          id: `req_${Date.now()}`,
          projectId: currentProject.id,
          projectName: currentProject.name,
          requestedBy: currentUserObj.username,
          requestedAt: new Date().toISOString(),
          section: reason || sectionName || 'Project Update',
          pageId: activeTab,
          status: 'pending',
          snapshotData: updatedProject,
        };

        const updatedList = [...pendingApprovals, newReq];
        setPendingApprovals(updatedList);
        safeSetItem('era_appr_v28', JSON.stringify(updatedList));
        safeSyncApprovals(updatedList).catch(err => {
          console.warn('Syncing approvals failed:', err);
        });

        alert(
          '🚀 DATA SUBMITTED FOR APPROVAL!\n\n' +
          'Your modified project data has been successfully sent to the Approval Queue.\n' +
          'A user with Approval Credentials will review and authorize your changes before data is incorporated into the live database.'
        );
      } catch (err) {
        console.error('Failed to submit approval request:', err);
        alert('Failed to submit approval request. Please try again.');
      }
      return; // Do NOT persist into the main live database!
    }

    // Persist into projects database
    const updatedProjects = projects.map(p => p.id === currentProject.id ? updatedProject : p);
    setProjects(updatedProjects);
    setCurrentProject(updatedProject);
    safeSetItem('era_proj_v28', JSON.stringify(updatedProjects));

    // Sync current update to Cloud Databases in real-time
    safeSyncProject(updatedProject).catch(err => {
      console.warn('Project update cloud sync fell back to local storage:', err);
    });
  };

  const handleAddDirectorate = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (programDirectorates.includes(trimmed)) return;
    const next = [...programDirectorates, trimmed];
    setProgramDirectorates(next);
    safeSetItem('era_directorates_v1', JSON.stringify(next));
    safeSyncConfig(pmos, next).catch(err => console.warn('Config sync failed:', err));
  };

  const handleDeleteDirectorate = (name: string) => {
    const next = programDirectorates.filter(d => d !== name);
    setProgramDirectorates(next);
    safeSetItem('era_directorates_v1', JSON.stringify(next));
    safeSyncConfig(pmos, next).catch(err => console.warn('Config sync failed:', err));
  };

  const handleAddPmo = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (pmos.includes(trimmed)) return;
    const next = [...pmos, trimmed];
    setPmos(next);
    safeSetItem('era_pmos_v1', JSON.stringify(next));
    safeSyncConfig(next, programDirectorates).catch(err => console.warn('Config sync failed:', err));
  };

  const handleDeletePmo = (name: string) => {
    const next = pmos.filter(p => p !== name);
    setPmos(next);
    safeSetItem('era_pmos_v1', JSON.stringify(next));
    safeSyncConfig(next, programDirectorates).catch(err => console.warn('Config sync failed:', err));
  };

  const handleEditPmo = (oldName: string, newName: string) => {
    const trimmedNew = newName.trim();
    if (!trimmedNew || trimmedNew === oldName) return;
    if (pmos.includes(trimmedNew)) {
      alert("A PMO with this name already exists.");
      return;
    }
    const nextPmos = pmos.map(p => p === oldName ? trimmedNew : p);
    setPmos(nextPmos);
    safeSetItem('era_pmos_v1', JSON.stringify(nextPmos));
    safeSyncConfig(nextPmos, programDirectorates).catch(err => console.warn('Config sync failed:', err));

    // Update affected projects
    const nextProjects = projects.map(proj => {
      if (proj.pmo === oldName) {
        const updated = { ...proj, pmo: trimmedNew };
        safeSyncProject(updated).catch(err => console.warn('Project sync failed:', err));
        return updated;
      }
      return proj;
    });
    setProjects(nextProjects);
    safeSetItem('era_proj_v28', JSON.stringify(nextProjects));

    if (currentProject && currentProject.pmo === oldName) {
      setCurrentProject({ ...currentProject, pmo: trimmedNew });
    }
  };

  const handleEditDirectorate = (oldName: string, newName: string) => {
    const trimmedNew = newName.trim();
    if (!trimmedNew || trimmedNew === oldName) return;
    if (programDirectorates.includes(trimmedNew)) {
      alert("A Directorate with this name already exists.");
      return;
    }
    const nextDirs = programDirectorates.map(d => d === oldName ? trimmedNew : d);
    setProgramDirectorates(nextDirs);
    safeSetItem('era_directorates_v1', JSON.stringify(nextDirs));
    safeSyncConfig(pmos, nextDirs).catch(err => console.warn('Config sync failed:', err));

    // Update affected projects
    const nextProjects = projects.map(proj => {
      if (proj.programDirectorate === oldName) {
        const updated = { ...proj, programDirectorate: trimmedNew };
        safeSyncProject(updated).catch(err => console.warn('Project sync failed:', err));
        return updated;
      }
      return proj;
    });
    setProjects(nextProjects);
    safeSetItem('era_proj_v28', JSON.stringify(nextProjects));

    if (currentProject && currentProject.programDirectorate === oldName) {
      setCurrentProject({ ...currentProject, programDirectorate: trimmedNew });
    }
  };

  const handleSaveDossier = () => {
    if (!currentProject) return;
    const fields: Partial<Project> = {
      client: editClient,
      consultant: editConsultant,
      contractor: editContractor,
      signDate: editSignDate,
      startDate: editStartDate,
      origDays: editOrigDays,
      eotDays: editEotDays,
      interimEotDays: editInterimEotDays,
      origAmount: editOrigAmount,
      provisionalSum: editProvisionalSum,
      variation: editVariation,
      lengthKm: editLengthKm,
      classification: editClassification,
      contractType: editContractType,
      programDirectorate: editProgramDirectorate,
      pmo: editPmo
    };
    handleProjectUpdate(fields, 'Contract Specifications Dossier configured');
    setIsEditingDossier(false);
  };

  const getRevisedCompletionDateStr = (startDateStr: string, origDays: number, eotDays: number, interimEotDays: number = 0) => {
    if (!startDateStr) return 'N/A';
    try {
      const totalDays = (origDays || 0) + (eotDays || 0) + (interimEotDays || 0);
      const pts = startDateStr.split('-');
      if (pts.length === 3) {
        const y = parseInt(pts[0], 10);
        const m = parseInt(pts[1], 10) - 1;
        const d = parseInt(pts[2], 10);
        const date = new Date(y, m, d + totalDays);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      const date = new Date(new Date(startDateStr).getTime() + totalDays * 86400000);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return 'N/A';
    }
  };

  const formatDateStr = (dateStr: string) => {
    try {
      if (!dateStr) return 'N/A';
      return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };


  const handleClearHistory = () => {
    if (!currentProject) return;
    handleProjectUpdate({ history: [] }, 'Cleared Auditor History');
  };

  const handleTakeSnapshot = (customName: string) => {
    if (!currentProject) return;
    handleProjectUpdate({}, customName || 'Manual Audit Snapshot');
  };

  const handleUpdateVantaSettings = (color: string, bg: string, points: number) => {
    setVantaColor(color);
    setVantaBgColor(bg);
    setVantaPoints(points);
  };

  const handleResetVanta = () => {
    setVantaColor('#3b82f6');
    setVantaBgColor('#f8fafc');
    setVantaPoints(14);
  };

  const handleUpdateCustomColors = (bg: string, txt: string, word: string, txtBg: string, chartTooltipBg: string) => {
    setCustomBgColor(bg);
    setCustomTxtColor(txt);
    setCustomWordColor(word);
    setCustomTxtBgColor(txtBg);
    setCustomChartTooltipBgColor(chartTooltipBg);
    safeSetItem('era_custom_bg', bg);
    safeSetItem('era_custom_txt', txt);
    safeSetItem('era_custom_word', word);
    safeSetItem('era_custom_txt_bg', txtBg);
    safeSetItem('era_custom_chart_tooltip_bg', chartTooltipBg);
  };

  const handleResetCustomColors = () => {
    setCustomBgColor('');
    setCustomTxtColor('');
    setCustomWordColor('');
    setCustomTxtBgColor('');
    setCustomChartTooltipBgColor('');
    localStorage.removeItem('era_custom_bg');
    localStorage.removeItem('era_custom_txt');
    localStorage.removeItem('era_custom_word');
    localStorage.removeItem('era_custom_txt_bg');
    localStorage.removeItem('era_custom_chart_tooltip_bg');
  };

  const formattedMoney = (v: number) => 
    formatAccounting(v, '');

  return (
    <div className="min-h-screen text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-colors duration-300 relative bg-slate-50/50 dark:bg-slate-900/60 pb-12">
      
      {/* Dynamic Style Injection for completely custom backgrounds and word colors */}
      {customBgColor || customTxtColor || customWordColor || customTxtBgColor || customChartTooltipBgColor ? (
        <style dangerouslySetInnerHTML={{__html: `
          ${customBgColor ? `
            body, .min-h-screen, .bg-slate-50, .bg-slate-50\\/50, .bg-slate-100, .bg-slate-50\\/40, .bg-slate-950\\/50 {
              background-color: ${customBgColor} !important;
            }
            .bg-white, .dark\\:bg-slate-800, .bg-slate-900, .bg-slate-850, .dark\\:bg-slate-850 {
              background-color: ${customBgColor}f4 !important;
              border-color: rgba(255, 255, 255, 0.08) !important;
            }
          ` : ''}
          ${customTxtBgColor ? `
            .bg-white, .dark\\:bg-slate-800, .bg-slate-900, .bg-slate-850, .dark\\:bg-slate-850, input, select, textarea, td, th, .bg-slate-50\\/50, .bg-slate-50\\/40 {
              background-color: ${customTxtBgColor} !important;
              background: ${customTxtBgColor} !important;
              border-color: rgba(0, 0, 0, 0.1) !important;
            }
          ` : ''}
          ${customTxtColor ? `
            body, p, span, td, th, input, select, textarea, label {
              color: ${customTxtColor} !important;
            }
            .text-slate-400, .text-slate-500, .text-slate-600, .text-slate-700, .dark\\:text-slate-400, .text-slate-550, .text-slate-450 {
              color: ${customTxtColor}cc !important;
            }
          ` : ''}
          ${customWordColor ? `
            h1, h2, h3, h4, .font-bold, font-semibold, font-black, button, strong {
              color: ${customWordColor} !important;
            }
            svg {
              stroke: ${customWordColor} !important;
            }
          ` : ''}
          ${customChartTooltipBgColor ? `
            .recharts-default-tooltip {
              background-color: ${customChartTooltipBgColor} !important;
              background: ${customChartTooltipBgColor} !important;
              border: 1px solid ${customWordColor || '#475569'} !important;
              border-radius: 8px !important;
            }
            .recharts-default-tooltip .recharts-tooltip-item, .recharts-default-tooltip span, .recharts-tooltip-label {
              color: ${customTxtColor || '#ffffff'} !important;
            }
          ` : ''}
        `}} />
      ) : null}
      
      {/* Interactive 3D constellation animation */}
      <ThreeDAnimatedBackground darkMode={darkMode} />
      
      {/* Decorative Blur elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-400/10 dark:bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-12 left-0 w-96 h-96 bg-amber-400/10 dark:bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Pages Swapper */}
      <AnimatePresence mode="wait">
        {currentPage === 'login' && (
          <motion.div
            key="login"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1"
          >
            <LoginPage 
              onLoginSuccess={handleLoginSuccess}
              getUsers={getUsers}
              saveUsers={saveUsers}
            />
          </motion.div>
        )}

        {currentPage === 'projects' && currentUserObj && (
          <motion.div
            key="projects"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1"
          >
            <ProjectsPage
              projects={projects}
              currentUserObj={currentUserObj}
              pendingApprovals={pendingApprovals}
              onSelectProject={handleSelectProject}
              onAddNewProject={handleAddNewProject}
              onDeleteProject={handleDeleteProject}
              onUpdateProjectStatus={handleUpdateProjectStatus}
              onLogout={handleLogout}
              onOpenProfile={() => setShowProfile(true)}
              onOpenApprovals={() => setShowApprovals(true)}
              onOpenAdmin={() => setShowAdmin(true)}
              onOpenDrafts={() => setShowDraftsPlayground(true)}
              onOpenUserGuide={() => setIsUserGuideOpen(true)}
              onSaveToCloud={async () => {
                try {
                  const isMasterAdmin = currentUserObj.role === 'admin' || currentUserObj.role === 'master_admin' || currentUserObj.username === 'proj_1781786415663';
                  
                  const accessibleProjects = projects.filter(p => {
                    if (isMasterAdmin) return true;
                    if (currentUserObj.role === 'directorate_admin') return (p.programDirectorate || 'Southern') === currentUserObj.assignedDirectorate;
                    if (currentUserObj.role === 'pmo_admin') return (p.pmo || '') === currentUserObj.assignedPmo;
                    const allowed = currentUserObj.accessibleProjects || [];
                    return allowed.includes(p.id);
                  });

                  for (const p of accessibleProjects) {
                    await safeSyncProject(p);
                  }
                  
                  alert('All inputs and changes have been successfully synchronized to the database.');
                } catch (err) {
                  console.error('Failed to sync to database:', err);
                  alert('Failed to sync to the database. Please try again.');
                }
              }}
              onlineUsers={onlinePeers}
              programDirectorates={programDirectorates}
              pmos={pmos}
              allUsers={usersListState}
            />
          </motion.div>
        )}

        {currentPage === 'dashboard' && currentProject && currentUserObj && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-grow max-w-7xl mx-auto p-4 md:p-6 w-full space-y-6 relative z-10"
          >
            {/* Project Cockpit Header */}
            <header className="bg-white dark:bg-slate-850 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setCurrentPage('projects');
                    setCurrentProject(null);
                    setCurrentProjectId(null);
                  }}
                  className="p-2.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-105 border border-slate-200 dark:border-slate-700/60 rounded-full transition"
                  title="Back to Contracts"
                >
                  <ArrowLeft className="w-5 h-5 text-slate-500" />
                </button>
                {logoError ? (
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center border border-slate-250 bg-gradient-to-br from-emerald-600 via-amber-500 to-red-500 p-0.5 shrink-0 shadow-xs">
                    <div className="w-full h-full bg-slate-900 rounded-[10px] flex flex-col items-center justify-center border border-white/20">
                      <span className="text-[10px] font-black tracking-tighter text-amber-400 font-mono leading-none">E.R.A</span>
                      <span className="text-[4px] font-bold text-white uppercase tracking-widest leading-none scale-90">Roads</span>
                    </div>
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-white rounded-xl border border-slate-200 dark:border-slate-700/60 p-0.5 flex items-center justify-center overflow-hidden shrink-0">
                    <img
                      src={eraLogo}
                      alt="Ethiopian Roads Administration Logo"
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <div className="flex-1">
                  {isEditingProjectName && (currentUserObj?.role === 'admin' || currentUserObj?.username === 'proj_1781786415663') ? (
                    <div className="flex items-center gap-2 max-w-xl w-full">
                      <input
                        type="text"
                        value={editProjectName}
                        onChange={(e) => setEditProjectName(e.target.value)}
                        className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 px-3 py-1 text-sm md:text-base font-bold rounded-lg text-slate-800 dark:text-zinc-100 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        placeholder="Project Name"
                        autoFocus
                      />
                      <button
                        onClick={() => {
                          if (editProjectName.trim()) {
                            handleProjectUpdate({ name: editProjectName.trim() }, 'Project Name Changed');
                          }
                          setIsEditingProjectName(false);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded-lg text-xs shrink-0"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingProjectName(false);
                          setEditProjectName(currentProject.name);
                        }}
                        className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-lg text-xs shrink-0"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1 text-[10px] uppercase font-mono tracking-widest text-slate-400 dark:text-slate-500 font-bold">
                        <span 
                          onClick={() => {
                            setCurrentPage('projects');
                            setCurrentProject(null);
                            setCurrentProjectId(null);
                          }}
                          className="hover:text-blue-500 transition cursor-pointer flex items-center gap-1"
                        >
                          💼 Contracts Selection
                        </span>
                        <span>/</span>
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">Active Workspace</span>
                      </div>
                      <div className="flex items-center gap-2 group/title">
                        <h1 
                          onClick={() => {
                            setCurrentPage('projects');
                            setCurrentProject(null);
                            setCurrentProjectId(null);
                          }}
                          className="text-lg md:text-xl font-black text-slate-850 dark:text-white uppercase leading-tight line-clamp-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition"
                          title="Click to return to project selection list"
                        >
                          {currentProject.name}
                        </h1>
                        {(currentUserObj?.role === 'admin' || currentUserObj?.username === 'proj_1781786415663') && (
                          <button
                            onClick={() => setIsEditingProjectName(true)}
                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-blue-500 transition shrink-0"
                            title="Click to edit project name"
                          >
                            ✏️
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                  <p className="text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-semibold tracking-wide flex items-center gap-1.5 flex-wrap mt-1">
                    <span>Client: {currentProject.client}</span> • 
                    <span>Contractor: {currentProject.contractor}</span> • 
                    <span>Classification: {currentProject.classification}</span>
                    {currentProject.approvedBy && (
                      <>
                        {' '}•{' '}
                        <span className="text-emerald-600 dark:text-emerald-400 font-extrabold bg-emerald-50 dark:bg-emerald-950/20 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-900/30">
                          ⚖️ Approved By: {currentProject.approvedBy} ({currentProject.approverRole || 'Approver'}) at {new Date(currentProject.approvedAt || '').toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* Utility switches */}
              <div className="flex items-center gap-1.5 self-start md:self-auto flex-wrap">
                <button
                  onClick={async () => {
                    if (!currentProject) return;
                    const isAuthorized = currentUserObj?.role === 'admin' || currentUserObj?.role === 'master_admin' || currentUserObj?.role === 'directorate_admin' || currentUserObj?.role === 'pmo_admin' || currentUserObj?.role === 'approver' || currentUserObj?.username === 'proj_1781786415663';
                    
                    if (isAuthorized) {
                      try {
                        const weightedProject = {
                          ...currentProject,
                          lastModifiedBy: currentUserObj.username,
                          lastModifiedAt: new Date().toISOString(),
                          lastModifiedSection: 'Certified directly by authorized authority',
                          approvedBy: currentUserObj.username,
                          approvedAt: new Date().toISOString(),
                          approverRole: currentUserObj.role
                        };
                        await safeSyncProject(weightedProject);
                        
                        setCurrentProject(weightedProject);
                        const updatedProjs = projects.map(p => p.id === weightedProject.id ? weightedProject : p);
                        setProjects(updatedProjs);
                        safeSetItem('era_proj_v28', JSON.stringify(updatedProjs));
                        alert('Changes successfully synchronized and certified directly into the database.');
                      } catch (err) {
                        console.error('Failed to sync to database:', err);
                        alert('Failed to sync to the database. Please try again.');
                      }
                    } else {
                      try {
                        const newReq: ApprovalRequest = {
                          id: `req_${Date.now()}`,
                          projectId: currentProject.id,
                          projectName: currentProject.name,
                          requestedBy: currentUserObj?.username || 'unregistered_user',
                          requestedAt: new Date().toISOString(),
                          section: 'Routine updates and parameter modifications',
                          pageId: activeTab,
                          status: 'pending',
                          snapshotData: currentProject,
                        };
                        
                        const updatedList = [...pendingApprovals, newReq];
                        setPendingApprovals(updatedList);
                        safeSetItem('era_appr_v28', JSON.stringify(updatedList));
                        await safeSyncApprovals(updatedList);

                        alert(
                          '🚀 DATA SUBMITTED SUCCESSFULLY!\n\n' +
                          'Your modified dataset has been immediately submitted to the Approver Queue.\n' +
                          'An Admin or Approver will review the changes before they go live.'
                        );
                      } catch (err) {
                        console.error('Failed to submit approval request:', err);
                        alert('Failed to submit approval request. Please try again.');
                      }
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 p-2 rounded-full border border-blue-700 flex items-center gap-1 text-[11px] font-extrabold text-white px-3 py-1.5 transition shadow-sm"
                  title="Save to Database"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Save to Database
                </button>
                <button
                  onClick={() => setIsUserGuideOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 p-2 rounded-full border border-emerald-700 flex items-center gap-1.5 text-[11px] font-extrabold text-white px-3 py-1.5 transition shadow-sm"
                  title="Open ERA ERP User Guide Manual"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  User Guide Manual
                </button>
                <button
                  onClick={() => window.print()}
                  className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 p-2.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-blue-500 transition"
                  title="Print Current Tab"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={handleToggleDarkMode}
                  className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 p-2.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-500 transition"
                  title="Toggle Mode"
                >
                  {darkMode ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-blue-500" />}
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-805 p-2 rounded-full border border-slate-200 dark:border-slate-700 flex items-center gap-1 text-[11px] font-extrabold text-rose-600 dark:text-rose-400 px-3 py-1.5 transition"
                  title="Log Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            </header>

            {/* Contract Specifications Cards deck */}
            <section className="bg-white dark:bg-slate-850 p-4 border border-slate-100 dark:border-slate-800 shadow-sm rounded-3xl grid grid-cols-2 lg:grid-cols-5 gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
              <div className="p-2 border-r border-slate-100 dark:border-slate-800/80">
                <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-0.5">Original Contract Amount</span>
                <span className="text-sm font-black font-mono text-slate-800 dark:text-white">
                  <AnimatedCounter value={currentProject.origAmount * 1_000_000} prefix="Br. " />
                </span>
              </div>
              <div className="p-2 border-r border-slate-150 dark:border-slate-800/80">
                <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-0.5">Revised Contract Amount</span>
                <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-1.5 py-0.5 rounded">
                  <AnimatedCounter value={(currentProject.origAmount + currentProject.variation) * 1_000_000} prefix="Br. " />
                </span>
              </div>
              <div className="p-2 border-r border-slate-150 dark:border-slate-800/80">
                <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-0.5">Commencement Date</span>
                <span className="text-sm font-black text-amber-600 dark:text-amber-500">
                  {formatDateStr(currentProject.startDate)}
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5 font-normal">
                  Project official start date
                </span>
              </div>
              <div className="p-2 border-r border-slate-150 dark:border-slate-800/80">
                <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider mb-0.5">Revised Completion Date</span>
                <span className="text-sm font-black text-rose-500">
                  {getRevisedCompletionDateStr(currentProject.startDate, currentProject.origDays, currentProject.eotDays, currentProject.interimEotDays)}
                </span>
                <span className="text-[9px] text-slate-400 block mt-0.5 font-normal">
                  Commencement + {currentProject.origDays || 0}d Orig + {currentProject.eotDays || 0}d Approved EOT + {currentProject.interimEotDays || 0}d Interim EOT
                </span>
              </div>
              <div className="p-2">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-[10px] text-slate-400 font-bold uppercase block tracking-wider">Project Delivery Method</span>
                </div>
                <span className="text-sm font-extrabold uppercase text-blue-600 dark:text-blue-400">
                  {currentProject.contractType === 'DB' ? 'Design-Build (DB)' : 'Design-Bid-Build (DBB)'}
                </span>
              </div>
            </section>

            {/* Collapsible Contract Specifications & Project Dossier Section above Page Selection */}
            <section className="bg-white dark:bg-slate-850 border border-slate-150 dark:border-slate-800 p-5 rounded-3xl shadow-sm space-y-4">
              <button
                type="button"
                onClick={() => setIsDossierExpanded(!isDossierExpanded)}
                className="w-full flex justify-between items-center text-left outline-none"
              >
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500 animate-pulse" />
                  📋 Project Information
                </h3>
                <div className="flex items-center gap-1.5 text-2xs font-extrabold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-900/30 transition">
                  <span className="uppercase">{isDossierExpanded ? 'Hide Details' : 'Show Details'}</span>
                  {isDossierExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </div>
              </button>

              {isDossierExpanded && (
                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 space-y-4">
                  <div className="flex justify-end">
                    {currentUserObj.role !== 'viewer' && (
                      <div className="flex items-center gap-2">
                        {!isEditingDossier ? (
                          <button
                            type="button"
                            onClick={() => setIsEditingDossier(true)}
                            className="text-[10px] uppercase font-extrabold bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900 border border-blue-100 dark:border-blue-900 px-2.5 py-1 rounded-lg text-blue-600 dark:text-blue-400 transition cursor-pointer"
                          >
                            ✏️ Edit Dossier
                          </button>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setIsEditingDossier(false);
                                // Reset to original values
                                setEditClient(currentProject.client);
                                setEditConsultant(currentProject.consultant);
                                setEditContractor(currentProject.contractor);
                                setEditSignDate(currentProject.signDate);
                                setEditStartDate(currentProject.startDate);
                                setEditOrigDays(currentProject.origDays);
                                setEditEotDays(currentProject.eotDays);
                                setEditInterimEotDays(currentProject.interimEotDays || 0);
                                setEditOrigAmount(currentProject.origAmount);
                                setEditProvisionalSum(currentProject.provisionalSum);
                                setEditVariation(currentProject.variation);
                                setEditLengthKm(currentProject.lengthKm);
                                setEditClassification(currentProject.classification);
                                setEditContractType(currentProject.contractType);
                                setEditProgramDirectorate(currentProject.programDirectorate || 'Southern');
                                setEditPmo(currentProject.pmo || 'PMO 1');
                              }}
                              className="text-[10px] uppercase font-extrabold bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-650 px-2.5 py-1 rounded-lg text-slate-600 dark:text-slate-350 transition cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={handleSaveDossier}
                              className="text-[10px] uppercase font-extrabold bg-emerald-600 hover:bg-emerald-700 border border-emerald-700 px-2.5 py-1 rounded-lg text-white transition shadow-sm cursor-pointer"
                            >
                              Save Changes
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {!isEditingDossier ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-semibold">
                      
                      {/* Section 1: Corporate Stakeholders */}
                      <div className="bg-slate-50/50 dark:bg-slate-900/10 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2.5">
                        <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Project Stakeholders</h4>
                        
                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-400 block font-mono">CLIENT / EMPLOYER</span>
                          <span className="text-slate-800 dark:text-zinc-150 block truncate font-bold" title={currentProject.client}>{currentProject.client}</span>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-400 block font-mono">SUPERVISING CONSULTANT</span>
                          <span className="text-slate-800 dark:text-zinc-150 block truncate font-bold" title={currentProject.consultant}>{currentProject.consultant}</span>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-400 block font-mono">MAIN CONTRACTOR</span>
                          <span className="text-slate-800 dark:text-zinc-150 block truncate font-bold" title={currentProject.contractor}>{currentProject.contractor}</span>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] text-indigo-500 block font-mono font-bold">PROGRAM DIRECTORATE</span>
                          <span className="inline-flex text-[10px] font-extrabold uppercase bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/50">
                            {currentProject.programDirectorate || 'Southern'}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] text-purple-500 block font-mono font-bold">PMO ASSIGNMENT</span>
                          <span className="inline-flex text-[10px] font-extrabold uppercase bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded border border-purple-100 dark:border-purple-900/50">
                            {currentProject.pmo || 'PMO 1'}
                          </span>
                        </div>
                      </div>

                      {/* Section 2: Temporal Calendar Milestones */}
                      <div className="bg-slate-50/50 dark:bg-slate-900/10 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2.5">
                        <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Milestones & Durations</h4>
                        
                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-400 block font-mono">CONTRACT SIGNING DATE</span>
                          <span className="text-slate-800 dark:text-zinc-150 block font-mono font-bold">{formatDateStr(currentProject.signDate)}</span>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-400 block font-mono">COMMENCEMENT DATE</span>
                          <span className="text-slate-800 dark:text-zinc-150 block font-mono font-bold">{formatDateStr(currentProject.startDate)}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-1 pt-0.5">
                          <div className="space-y-0.5">
                            <span className="text-[8px] text-slate-400 block font-mono">ORIGINAL DAYS</span>
                            <span className="text-slate-800 dark:text-zinc-200 block font-mono font-bold text-2xs">{currentProject.origDays} Days</span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[8px] text-slate-400 block font-mono">APPROVED EOT</span>
                            <span className="text-rose-500 block font-mono font-extrabold text-2xs">+{currentProject.eotDays || 0} Days</span>
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[8px] text-slate-400 block font-mono">INTERIM EOT</span>
                            <span className="text-amber-500 dark:text-amber-400 block font-mono font-extrabold text-2xs">+{currentProject.interimEotDays || 0} Days</span>
                          </div>
                        </div>

                        <div className="space-y-1 border-t border-dashed border-slate-200 dark:border-slate-800 pt-2.5 mt-2.5">
                          <span className="text-[9px] text-slate-400 block font-sans font-bold">Revised Completion Date</span>
                          <span className="text-rose-500 block font-mono font-black text-2xs">
                            {getRevisedCompletionDateStr(currentProject.startDate, currentProject.origDays, currentProject.eotDays, currentProject.interimEotDays)}
                          </span>
                          <span className="text-[8px] text-slate-400 block font-sans font-bold mt-0.5">
                            Commencement + {currentProject.origDays || 0}d Orig + {currentProject.eotDays || 0}d Approved EOT + {currentProject.interimEotDays || 0}d Interim EOT
                          </span>
                        </div>
                      </div>

                      {/* Section 3: Value Outlay Structure */}
                      <div className="bg-slate-50/50 dark:bg-slate-900/10 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-805 space-y-2.5">
                        <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Financial Cost Outlay</h4>
                        
                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-400 block font-sans font-bold">Original Contract Amount</span>
                          <span className="text-slate-850 dark:text-white block font-mono font-black text-2xs">
                            <AnimatedCounter value={currentProject.origAmount * 1_000_000} prefix="Br. " />
                          </span>

                        </div>



                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-400 block font-sans font-bold">Approved Variations</span>
                          <span className="text-emerald-600 dark:text-emerald-400 block font-mono font-black text-2xs bg-emerald-50 dark:bg-emerald-950/20 px-1 py-0.5 rounded max-w-max">
                            <AnimatedCounter value={currentProject.variation * 1_000_000} prefix="Br. " />
                          </span>
                        </div>

                        <div className="space-y-1 border-t border-dashed border-slate-200 dark:border-slate-800 pt-2.5 mt-2.5">
                          <span className="text-[9px] text-slate-400 block font-sans font-bold">Revised Contract Amount</span>
                          <span className="text-emerald-600 dark:text-emerald-400 block font-mono font-black text-2xs">
                            <AnimatedCounter value={(currentProject.origAmount + currentProject.variation) * 1_000_000} prefix="Br. " />
                          </span>
                          <span className="text-[8px] text-slate-400 block font-sans font-normal mt-0.5">Calculating Original Contract Amount plus Approved Variations</span>
                        </div>
                      </div>

                      {/* Section 4: Physical Parameters */}
                      <div className="bg-slate-50/50 dark:bg-slate-900/10 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-2.5">
                        <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Physical & Legal Framework</h4>
                        
                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-400 block font-mono">TOTAL SECTION LENGTH</span>
                          <span className="text-slate-850 dark:text-white block font-mono font-bold text-xs">{currentProject.lengthKm ? currentProject.lengthKm.toFixed(2) : '0.00'} Km</span>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] text-slate-400 block font-mono">ROAD WAY CLASSIFICATION</span>
                          <span className="text-slate-800 dark:text-zinc-150 block truncate font-bold" title={currentProject.classification}>{currentProject.classification}</span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-[9px] text-slate-400 block font-sans font-bold">Project Delivery Method</span>
                          </div>
                          <span className="text-blue-600 dark:text-blue-400 block font-bold">
                            {currentProject.contractType === 'DB' ? 'Design-Build (DB)' : 'Design-Bid-Build (DBB)'}
                          </span>
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-semibold text-slate-700 dark:text-slate-200">
                      
                      {/* Section 1 Edit: Corporate Stakeholders */}
                      <div className="bg-blue-50/10 dark:bg-slate-900/20 p-3.5 rounded-2xl border border-blue-150/20 dark:border-blue-900/40 space-y-3">
                        <h4 className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Project Stakeholders</h4>
                        
                        <div className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                          <label className="text-[9px] text-slate-400 block font-mono">CLIENT / EMPLOYER</label>
                          <input
                            type="text"
                            value={editClient}
                            onChange={(e) => setEditClient(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1.5 rounded-lg text-slate-850 dark:text-zinc-100 outline-none focus:border-blue-500 focus:ring-1"
                          />
                        </div>

                        <div className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                          <label className="text-[9px] text-slate-400 block font-mono">SUPERVISING CONSULTANT</label>
                          <input
                            type="text"
                            value={editConsultant}
                            onChange={(e) => setEditConsultant(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1.5 rounded-lg text-slate-850 dark:text-zinc-100 outline-none focus:border-blue-500 focus:ring-1"
                          />
                        </div>

                        <div className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                          <label className="text-[9px] text-slate-400 block font-mono">MAIN CONTRACTOR</label>
                          <input
                            type="text"
                            value={editContractor}
                            onChange={(e) => setEditContractor(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1.5 rounded-lg text-slate-850 dark:text-zinc-100 outline-none focus:border-blue-500 focus:ring-1"
                          />
                        </div>

                        <div className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                          <label className="text-[9px] text-indigo-500 block font-mono font-bold">PROGRAM DIRECTORATE</label>
                          <select
                            value={editProgramDirectorate}
                            onChange={(e) => setEditProgramDirectorate(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1.5 rounded-lg text-slate-850 dark:text-zinc-100 outline-none font-bold"
                          >
                            {programDirectorates.map(pd => (
                              <option key={pd} value={pd}>{pd}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                          <label className="text-[9px] text-purple-500 block font-mono font-bold">PMO ASSIGNMENT</label>
                          <select
                            value={editPmo}
                            onChange={(e) => setEditPmo(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1.5 rounded-lg text-slate-850 dark:text-zinc-100 outline-none font-bold"
                          >
                            {pmos.map(p => (
                              <option key={p} value={p}>{p}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Section 2 Edit: Temporal Calendar Milestones */}
                      <div className="bg-blue-50/10 dark:bg-slate-900/20 p-3.5 rounded-2xl border border-blue-150/20 dark:border-blue-900/40 space-y-3">
                        <h4 className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Milestones & Durations</h4>
                        
                        <div className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                          <label className="text-[9px] text-slate-400 block font-mono font-bold">CONTRACT SIGNING DATE</label>
                          <input
                            type="date"
                            value={editSignDate}
                            onChange={(e) => setEditSignDate(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1 text-slate-850 dark:text-zinc-150 outline-none font-mono"
                          />
                        </div>

                        <div className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                          <label className="text-[9px] text-slate-400 block font-mono font-bold">COMMENCEMENT DATE</label>
                          <input
                            type="date"
                            value={editStartDate}
                            onChange={(e) => setEditStartDate(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1 text-slate-850 dark:text-zinc-150 outline-none font-mono"
                          />
                        </div>

                        <div className="grid grid-cols-3 gap-1.5 mt-1">
                          <div className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-1 rounded-lg border border-slate-100">
                            <label className="text-[8px] text-slate-400 block font-mono">ORIG. DAYS</label>
                            <input
                              type="number"
                              value={editOrigDays}
                              onChange={(e) => setEditOrigDays(parseInt(e.target.value) || 0)}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-705 text-center py-0.5 rounded font-mono text-slate-850 text-2xs outline-none"
                            />
                          </div>
                          <div className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-1 rounded-lg border border-slate-100">
                            <label className="text-[8px] text-slate-400 block font-mono">APP. EOT</label>
                            <input
                              type="number"
                              value={editEotDays}
                              onChange={(e) => setEditEotDays(parseInt(e.target.value) || 0)}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-705 text-center py-0.5 rounded font-mono text-slate-850 text-2xs outline-none"
                            />
                          </div>
                          <div className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-1 rounded-lg border border-slate-100">
                            <label className="text-[8px] text-slate-400 block font-mono">INT. EOT</label>
                            <input
                              type="number"
                              value={editInterimEotDays}
                              onChange={(e) => setEditInterimEotDays(parseInt(e.target.value) || 0)}
                              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-705 text-center py-0.5 rounded font-mono text-slate-850 text-2xs outline-none"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 3 Edit: Value Outlay Structure */}
                      <div className="bg-blue-50/10 dark:bg-slate-900/20 p-3.5 rounded-2xl border border-blue-150/20 dark:border-blue-900/40 space-y-3">
                        <h4 className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Financial Cost Outlay</h4>
                        
                        <div className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800 opacity-80" title="Auto-calculated from Division Work items G = F + E">
                          <label className="text-[9px] text-slate-400 block font-mono">ORIGINAL COST (M. Birr) [Auto-calculated G = F + E]</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editOrigAmount}
                            readOnly
                            className="w-full bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-1 outline-none font-mono cursor-not-allowed"
                          />
                        </div>

                        <div className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                          <label className="text-[9px] text-slate-400 block font-mono font-sans">PROVISIONAL SUM (M.)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editProvisionalSum}
                            onChange={(e) => setEditProvisionalSum(parseFloat(e.target.value) || 0)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1 text-slate-850 dark:text-zinc-150 outline-none font-mono"
                          />
                        </div>

                        <div className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                          <label className="text-[9px] text-slate-400 block font-sans font-bold text-amber-500">APPROVED VARIATIONS</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editVariation}
                            onChange={(e) => setEditVariation(parseFloat(e.target.value) || 0)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1 text-slate-850 dark:text-zinc-150 outline-none font-mono"
                          />
                        </div>
                      </div>

                      {/* Section 4 Edit: Physical Parameters */}
                      <div className="bg-blue-50/10 dark:bg-slate-900/20 p-3.5 rounded-2xl border border-blue-150/20 dark:border-blue-900/40 space-y-3">
                        <h4 className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Physical & Legal Framework</h4>
                        
                        <div className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                          <label className="text-[9px] text-slate-400 block font-mono">TOTAL SECTION LENGTH (Km)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editLengthKm}
                            onChange={(e) => setEditLengthKm(parseFloat(e.target.value) || 0)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1 text-slate-850 dark:text-zinc-150 outline-none font-mono"
                          />
                        </div>

                        <div className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                          <label className="text-[9px] text-slate-400 block font-mono">ROAD WAY CLASSIFICATION</label>
                          <input
                            type="text"
                            value={editClassification}
                            onChange={(e) => setEditClassification(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2 py-1.5 rounded-lg text-slate-850 dark:text-zinc-100 outline-none"
                          />
                        </div>

                        <div className="space-y-1 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                          <label className="text-[9px] text-slate-400 block font-mono">ORIGINAL CONTRACT TYPE</label>
                          <select
                            value={editContractType}
                            onChange={(e) => setEditContractType(e.target.value as 'DB' | 'DBB')}
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-705 px-2 py-1 rounded-lg text-slate-850 dark:text-zinc-100 outline-none font-bold"
                          >
                            <option value="DB">Design-Build (DB)</option>
                            <option value="DBB">Design-Bid-Build (DBB)</option>
                          </select>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              )}
            </section>

            {/* Navigation Tabs Bar */}
            <div className="flex items-center gap-1 overflow-x-auto scroller-none py-1 border-b border-slate-200 dark:border-slate-800 text-xs font-bold font-mono">
              {[
                { id: 'dash', label: '📊 Dashboard' },
                { id: 'seriesEditor', label: '📋 Financial Data' },
                { id: 'issueLog', label: '🚩 Issue Log' },
                { id: 'linear', label: '📏 Linear diagram' },
                { id: 'rowEditor', label: '🛣️ Utilities & ROW' },
                { id: 'progressPlanEditor', label: '📈 Progress Comparisons' },
                { id: 'qtyEditor', label: '📐 Quantities log' },
                { id: 'bonds', label: '🔒 Bonds' },
                { id: 'kpiEditor', label: '🎯 KPIs' },
                { id: 'monthly', label: '📅 Monthly Cumulative' },
                { id: 'workProgram', label: '📅 Work Program CPM' },
                { id: 'resourceMobilization', label: '🚚 Logistics & Resources' },
                { id: 'risks', label: '⚠️ Project Risks' },
                /* { id: 'workspace', label: '☁️ Workspace' }, */
                { id: 'analysis', label: '📊 Comprehensive analysis' },
                { id: 'documentation', label: '📁 Documentation' },
                { id: 'history', label: '📜 History' },
                { id: 'settings', label: '⚙️ Settings' }
              ]
                .filter((tab) => canUserViewPage(currentUserObj, tab.id))
                .map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-2 rounded-xl transition duration-150 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-sm'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Views Swappers */}
            <div className="space-y-4">
              {!canUserViewPage(currentUserObj, activeTab) ? (
                <div className="bg-white dark:bg-slate-850 p-12 rounded-3xl border border-slate-200 dark:border-slate-800 text-center space-y-4 my-8">
                  <div className="w-16 h-16 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto text-2xl font-black shadow-xs">
                    🔒
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-slate-850 dark:text-zinc-100 uppercase tracking-tight">
                      Page Access Restricted
                    </h3>
                    <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
                      Your account is restricted to assigned pages only. You are not authorized to view or edit page "{activeTab}".
                    </p>
                  </div>
                  {currentUserObj?.assignedPages && currentUserObj.assignedPages.length > 0 && (
                    <button
                      onClick={() => setActiveTab(currentUserObj.assignedPages[0])}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
                    >
                      Go to My Assigned Page
                    </button>
                  )}
                </div>
              ) : (
                <>
                  {/* Governance & Page Editing Permission Status Banner (Only shown when page is read-only or requires approval) */}
                  {currentUserObj && (!canUserEditPage(currentUserObj, activeTab) || !hasApprovalCredentials(currentUserObj)) && (
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 py-2 bg-white dark:bg-slate-850 border border-slate-150 dark:border-slate-800 rounded-2xl text-[11px] font-semibold">
                      <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                        <span className="text-xs">
                          {!canUserEditPage(currentUserObj, activeTab) ? '🔒' : '✏️'}
                        </span>
                        <span>
                          <strong>Page Scope:</strong>{' '}
                          {!canUserEditPage(currentUserObj, activeTab) ? (
                            <span className="text-rose-600 dark:text-rose-400 font-extrabold">
                              Read-Only Mode (Admin has not assigned page editing permission)
                            </span>
                          ) : (
                            <span className="text-blue-600 dark:text-blue-400 font-extrabold">
                              Page Editing Authorized — Edits require review & approval before database incorporation
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] font-extrabold">
                        {currentUserObj.assignedPages && currentUserObj.assignedPages.length > 0 && (
                          <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-lg border border-blue-100 dark:border-blue-900/40">
                            📑 {currentUserObj.assignedPages.length} Pages Assigned
                          </span>
                        )}
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-700 uppercase">
                          User: {currentUserObj.username} ({currentUserObj.role})
                        </span>
                      </div>
                    </div>
                  )}
              {activeTab === 'dash' && (
                <DashboardView
                  project={currentProject}
                  currentUserObj={currentUserObj}
                  onSetPhysical={(val) => handleProjectUpdate({ physicalProgress: val }, 'Physical Progress')}
                  onUploadImage={(fileData) => {
                    const imgs = [...currentProject.images, fileData];
                    handleProjectUpdate({ images: imgs }, 'Field photo attachment Uploaded');
                  }}
                  onRemoveImage={(idx) => {
                    const imgs = currentProject.images.filter((_, i) => i !== idx);
                    handleProjectUpdate({ images: imgs }, 'Field photo attachment deleted');
                  }}
                  onClearImages={() => handleProjectUpdate({ images: [] }, 'Cleared Field photo Gallery')}
                  onProjectUpdate={handleProjectUpdate}
                  onSwitchTab={setActiveTab}
                  onDeleteProject={handleDeleteProject}
                  onUpdateProjectStatus={handleUpdateProjectStatus}
                />
              )}

              {activeTab === 'kpiEditor' && (
                <KpiEditorView
                  project={currentProject}
                  currentUserObj={currentUserObj}
                  onUpdateKpi={(updatedKpi) => handleProjectUpdate({ kpiAllocated: updatedKpi }, 'KPI Audit scorecard modified')}
                  onProjectUpdate={handleProjectUpdate}
                />
              )}

              {activeTab === 'seriesEditor' && (
                <SeriesEditorView
                  project={currentProject}
                  onUpdateSeries={(series, provisionalSum) => {
                    const updateObj: Partial<Project> = { series };
                    if (provisionalSum !== undefined) updateObj.provisionalSum = provisionalSum;
                    handleProjectUpdate(updateObj, 'BOQ Division Series modified');
                  }}
                  onProjectUpdate={handleProjectUpdate}
                  onUpdateFinance={(payment, annual, ipcTracker, usdExchangeRate) => handleProjectUpdate({ payment, annual, ipcTracker, usdExchangeRate }, 'Financial schedules Updated')}
                />
              )}

              {activeTab === 'monthly' && (
                <MonthlyScurveView
                  project={currentProject}
                  onUpdateMonthly={(monthly) => handleProjectUpdate({ monthly }, 'Cumulative S-Curve records Updated')}
                />
              )}

              {activeTab === 'linear' && (
                <LinearDiagramView
                  project={currentProject}
                  onUpdateLinear={(linear) => handleProjectUpdate({ linear }, 'Linear Diagrams chains altered')}
                  onUpdateLinearSpur={(linearSpur) => handleProjectUpdate({ linearSpur }, 'Spur Road Linear Diagrams chains altered')}
                  onUpdateSpurLength={(spurRoadLengthKm) => handleProjectUpdate({ spurRoadLengthKm }, 'Spur Road target length altered')}
                  onUpdateMainLength={(mainRoadLengthKm) => {
                    const totalKm = currentProject.lengthKm || 65;
                    const newSpurKm = Math.max(0, Number((totalKm - mainRoadLengthKm).toFixed(2)));
                    handleProjectUpdate({ spurRoadLengthKm: newSpurKm }, 'Main Road target length altered');
                  }}
                  onUpdateProjectLength={(lengthKm) => handleProjectUpdate({ lengthKm }, 'Total Contract length altered')}
                  onToggleCappingLayer={(hasCappingLayer) => handleProjectUpdate({ hasCappingLayer }, 'Capping Layer configuration altered')}
                />
              )}

              {activeTab === 'rowEditor' && (
                <RowStatusView
                  project={currentProject}
                  onUpdateRowMetrics={(rowMetrics) => handleProjectUpdate({ rowMetrics }, 'ROW checkmark list updated')}
                  onUpdateRowCompensation={(rowCompensation) => handleProjectUpdate({ rowCompensation }, 'ROW compensation payments updated')}
                  onUpdateUtilityCompensation={(utilityCompensation) => handleProjectUpdate({ utilityCompensation }, 'Utilities relocation compensation updated')}
                  onUpdateRowStatus={(rowStatus) => handleProjectUpdate({ rowStatus }, 'ROW status section table updated')}
                />
              )}

              {activeTab === 'progressPlanEditor' && (
                <ProgressPlanView
                  project={currentProject}
                  onUpdateProgressPlan={(progressPlan, progressPlanLabels) => handleProjectUpdate({ progressPlan, progressPlanLabels }, 'Progress plans modified')}
                  onProjectUpdate={handleProjectUpdate}
                />
              )}

              {activeTab === 'qtyEditor' && (
                <QuantityEditorView
                  project={currentProject}
                  onUpdateQuantities={(quantities) => handleProjectUpdate({ quantities }, 'Quantity volumes modified')}
                />
              )}

              {activeTab === 'workProgram' && (
                <WorkProgramView
                  project={currentProject}
                  onUpdateActivities={(workProgram) => handleProjectUpdate({ workProgram }, 'Work program schedule modified')}
                />
              )}

              {activeTab === 'bonds' && (
                <BondsGuaranteeView
                  project={currentProject}
                  onUpdateBonds={(bonds) => handleProjectUpdate({ bonds }, 'Bonds escrow amended')}
                />
              )}

              {activeTab === 'resourceMobilization' && (
                <ResourceMobilizationView
                  project={currentProject}
                  onUpdateProject={handleProjectUpdate}
                  isReadonly={currentUserObj?.role === 'viewer' && currentUserObj?.username !== 'proj_1781786415663'}
                />
              )}

              {activeTab === 'risks' && (
                <ProjectRisksView
                  project={currentProject}
                  onUpdateRisks={(risks) => handleProjectUpdate({ risks }, 'Project risks register updated')}
                  isReadonly={currentUserObj?.role === 'viewer' && currentUserObj?.username !== 'proj_1781786415663'}
                  onProjectUpdate={handleProjectUpdate}
                />
              )}

              {activeTab === 'issueLog' && (
                <IssueLogView
                  project={currentProject}
                  onProjectUpdate={handleProjectUpdate}
                  isAdmin={currentUserObj?.role === 'admin' || currentUserObj?.role === 'master_admin' || currentUserObj?.username === 'proj_1781786415663'}
                  currentUserObj={currentUserObj}
                />
              )}

              {activeTab === 'analysis' && (
                <ComprehensiveAnalysisView project={currentProject} />
              )}

              {activeTab === 'documentation' && (
                <DocumentationView 
                  project={currentProject}
                  onUpdateDocuments={(docs) => handleProjectUpdate({ documents: docs }, 'Project documents list updated')}
                  isReadonly={currentUserObj?.role === 'viewer' && currentUserObj?.username !== 'proj_1781786415663'}
                />
              )}

              {activeTab === 'workspace' && (
                <WorkspaceView 
                  projects={projects}
                  onRestoreProjects={(restored) => {
                    setProjects(restored);
                    safeSetItem('era_proj_v28', JSON.stringify(restored));
                    // Sync every project back to server database to keep them in sync
                    restored.forEach(p => {
                      safeSyncProject(p).catch(err => console.warn('Restore sync failed:', err));
                    });
                    // Select first project or current project if it still exists
                    if (restored.length > 0) {
                      const stillExists = restored.find(p => p.id === currentProject.id);
                      setCurrentProject(stillExists || restored[0]);
                    }
                  }}
                />
              )}

              {activeTab === 'history' && (
                <HistoryView
                  project={currentProject}
                  onTakeSnapshot={handleTakeSnapshot}
                  onClearHistory={handleClearHistory}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsView
                  darkMode={darkMode}
                  onToggleDarkMode={handleToggleDarkMode}
                  vantaColor={vantaColor}
                  vantaBgColor={vantaBgColor}
                  vantaPoints={vantaPoints}
                  onUpdateVanta={handleUpdateVantaSettings}
                  onResetVanta={handleResetVanta}
                  customBgColor={customBgColor}
                  customTxtColor={customTxtColor}
                  customWordColor={customWordColor}
                  customTxtBgColor={customTxtBgColor}
                  customChartTooltipBgColor={customChartTooltipBgColor}
                  onUpdateCustomColors={handleUpdateCustomColors}
                  onResetCustomColors={handleResetCustomColors}
                />
              )}
            </>
          )}
        </div>

            {/* Real-time AI Contract Assistant Chat Widget */}
            <AiAssistantChat
              project={currentProject}
              currentUserObj={currentUserObj}
              onProjectUpdate={handleProjectUpdate}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Settings Modal Overlay */}
      <AnimatePresence>
        {showDraftsPlayground && (
          <DraftPlayground
            currentUser={currentUserObj}
            onClose={() => setShowDraftsPlayground(false)}
          />
        )}
      </AnimatePresence>

      {showProfile && currentUserObj && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fade-in">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-100 dark:border-slate-700/60 shadow-xl space-y-4"
          >
            <div className="flex justify-between items-center border-b pb-2">
              <h3 className="font-bold text-sm text-slate-850 dark:text-zinc-100 uppercase tracking-wide">
                User Identity & Security
              </h3>
              <button 
                onClick={() => setShowProfile(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-650"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold text-slate-700 dark:text-slate-350">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 tracking-wide font-mono uppercase block">Username Profile</label>
                <input 
                  type="text" 
                  value={currentUserObj.username} 
                  disabled 
                  className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 font-extrabold text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 tracking-wide font-mono uppercase block">Assigned Role Privilege</label>
                <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg font-bold border capitalize">
                  {currentUserObj.role}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Admin User Management Modal Overlay */}
      {showAdmin && (currentUserObj?.role === 'admin' || currentUserObj?.role === 'master_admin' || currentUserObj?.username === 'proj_1781786415663') && currentUserObj?.role !== 'cpm_admin' && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-4xl bg-white dark:bg-slate-800 rounded-3xl border border-slate-150 dark:border-slate-700/60 shadow-xl flex flex-col max-h-[90vh] overflow-hidden"
          >
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-750 p-5 pb-3.5 shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-slate-800 dark:text-zinc-100 uppercase tracking-wider">
                  User Access Administration
                </h3>
                {Object.keys(editedUsers).some(un => hasUserChanges(un)) && (
                  <span className="bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-900 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full animate-pulse">
                    Unsaved Changes
                  </span>
                )}
              </div>
              <button 
                onClick={() => {
                  setShowAdmin(false);
                  const updatedProjects = [...projects];
                  setProjects(updatedProjects);
                }}
                className="text-xs font-bold text-slate-400 hover:text-slate-650 cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4">

            {/* Quick Create user form */}
            <form onSubmit={(e) => {
              e.preventDefault();
              const frm = e.target as any;
              const un = frm.un.value.trim();
              const pw = frm.pw.value;
              const rl = newUserRole;
              if (!un || !pw) return;

              const ua = getUsers();
              if (ua.some(u => u.username.toLowerCase() === un.toLowerCase())) {
                alert('User already exists!');
                return;
              }

              const pwError = validatePassword(pw, rl);
              if (pwError) {
                alert(pwError);
                return;
              }

              const newUser: User = { 
                username: un, 
                password: pw, 
                role: rl, 
                status: frm.st?.value as 'Active' | 'Inactive' || 'Active', 
                accessibleProjects: [],
                assignedBy: currentUserObj?.username
              };
              
              if (rl === 'directorate_admin') {
                 newUser.assignedDirectorate = frm.dir?.value;
              } else if (rl === 'pmo_admin') {
                 newUser.assignedPmo = frm.pmo?.value;
              } else {
                 if (frm.dir?.value) newUser.assignedDirectorate = frm.dir.value;
                 if (frm.pmo?.value) newUser.assignedPmo = frm.pmo.value;
              }

              saveUsers([...ua, newUser]);
              frm.reset();
              setNewUserRole('viewer');
              alert(`User ${un} created successfully.`);
            }} className="bg-slate-50 dark:bg-slate-900/40 border p-3 rounded-2xl space-y-3">
              <h4 className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider block">Add New User to Network</h4>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <input required name="un" type="text" placeholder="Username" className="bg-white dark:bg-slate-800 text-xs px-2.5 py-1 border rounded-lg" />
                <div className="flex flex-col gap-1">
                  <div className="relative">
                    <input required name="pw" type={newPasswordVisible ? "text" : "password"} placeholder="Passcode" className="bg-white dark:bg-slate-800 text-xs pl-2.5 pr-7 py-1 border rounded-lg w-full" />
                    <button
                      type="button"
                      onClick={() => setNewPasswordVisible(!newPasswordVisible)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 cursor-pointer p-0.5"
                      title={newPasswordVisible ? "Hide password" : "Show password"}
                    >
                      {newPasswordVisible ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <select name="rl" value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as User['role'])} className="bg-white dark:bg-slate-800 text-[10px] py-1 border rounded-lg font-bold">
                  <option value="viewer">Viewer only</option>
                  <option value="editor">Editor (BOQ edits)</option>
                  <option value="approver">Approver</option>
                  {(currentUserObj?.role === 'master_admin' || currentUserObj?.role === 'admin' || currentUserObj?.username === 'proj_1781786415663') && (
                    <>
                      <option value="admin">Admin</option>
                      <option value="master_admin">Master Admin</option>
                      <option value="cpm_admin">CPM Admin (All Projects)</option>
                      <option value="directorate_admin">Directorate Admin</option>
                    </>
                  )}
                  {(currentUserObj?.role === 'master_admin' || currentUserObj?.role === 'admin' || currentUserObj?.role === 'directorate_admin' || currentUserObj?.username === 'proj_1781786415663') && (
                    <option value="pmo_admin">PMO Admin</option>
                  )}
                </select>
                <select name="st" className="bg-white dark:bg-slate-800 text-[10px] py-1 border rounded-lg font-bold">
                  <option value="Active">🟢 Active</option>
                  <option value="Inactive">🔴 Inactive</option>
                </select>
              </div>
              {newUserRole !== 'master_admin' && newUserRole !== 'admin' && newUserRole !== 'cpm_admin' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Assign Directorate {newUserRole !== 'directorate_admin' ? '(Optional)' : ''}</label>
                    <select name="dir" className="bg-white dark:bg-slate-800 text-xs py-1 px-2 border rounded-lg font-semibold">
                      {newUserRole !== 'directorate_admin' && <option value="">-- None / All --</option>}
                      {programDirectorates.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  {(newUserRole !== 'directorate_admin') && (
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Assign PMO {newUserRole !== 'pmo_admin' ? '(Optional)' : ''}</label>
                      <select name="pmo" className="bg-white dark:bg-slate-800 text-xs py-1 px-2 border rounded-lg font-semibold">
                        {newUserRole !== 'pmo_admin' && <option value="">-- None / All --</option>}
                        {pmos.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  )}
                </div>
              )}
              <p className="text-[10px] text-slate-450 dark:text-slate-400">
                ⚠️ <span className="font-bold">Password requirements:</span> Minimum 8 characters, 1 number, and 1 uppercase letter. (Role of Admin is exempt from this requirement).
              </p>
              <button type="submit" className="w-full bg-blue-600 text-white rounded-xl py-1 text-2xs font-bold uppercase">
                Save New User Profile
              </button>
            </form>

            {/* Users grid list */}
            <div className="space-y-3.5">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <h4 className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider block">List of Registered Users</h4>
                {Object.keys(editedUsers).some(un => hasUserChanges(un)) && (
                  <span className="text-[10px] text-amber-500 font-extrabold bg-amber-50 dark:bg-amber-950/20 px-2 py-0.5 rounded-lg border border-amber-100 dark:border-amber-900/40 self-start sm:self-auto animate-pulse">
                    ⚠️ {Object.keys(editedUsers).filter(un => hasUserChanges(un)).length} User(s) have unsaved access edits
                  </span>
                )}
              </div>

              {/* Global Save All Banner */}
              {Object.keys(editedUsers).some(un => hasUserChanges(un)) && (
                <div className="bg-indigo-600 dark:bg-indigo-700 text-white p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg border border-indigo-500 dark:border-indigo-600 animate-fade-in">
                  <div className="text-xs">
                    <p className="font-extrabold flex items-center gap-1.5 text-zinc-100">
                      <span>⚙️</span> UNSAVED USER ACCESS CHANGES DETECTED
                    </p>
                    <p className="text-[10px] text-indigo-100 mt-0.5">
                      You modified privileges, account statuses, or project visibility. Save to commit updates to the database.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={discardAllUserDrafts}
                      className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-indigo-100 hover:text-white rounded-xl text-2xs font-extrabold uppercase transition cursor-pointer"
                    >
                      Discard All
                    </button>
                    <button
                      type="button"
                      onClick={saveAllUserDrafts}
                      className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-2xs font-extrabold uppercase transition shadow-sm flex items-center gap-1 cursor-pointer"
                    >
                      💾 Save All Changes
                    </button>
                  </div>
                </div>
              )}

              {(() => {
                const isMasterAdmin = currentUserObj?.role === 'admin' || currentUserObj?.role === 'master_admin' || currentUserObj?.username === 'proj_1781786415663';
                const filteredUsers = getUsers().filter(u => {
                  if (isMasterAdmin) return true;
                  return u.assignedBy === currentUserObj?.username || u.username === currentUserObj?.username;
                });
                const adminUsersList = deduplicateUsers(filteredUsers);
                const currentSelectedUser = adminUsersList.find(u => u.username === selectedAdminUser) || adminUsersList[0] || null;

                return (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 border border-slate-150 dark:border-slate-800 p-4 rounded-2xl bg-slate-50/30 dark:bg-slate-900/10 min-h-[420px]">
                    {/* Left Column: User Buttons list */}
                    <div className="md:col-span-1 space-y-1.5 max-h-[400px] overflow-y-auto pr-2 border-r border-slate-150 dark:border-slate-800/80">
                      <span className="text-[10px] text-slate-450 dark:text-slate-400 block font-extrabold mb-2 uppercase tracking-wider">
                        Click User Name to Select:
                      </span>
                      {adminUsersList.length === 0 ? (
                        <p className="text-3xs text-slate-400 text-center py-6 font-bold">No users found.</p>
                      ) : (
                        adminUsersList.map((u, idx) => {
                          const isSelected = currentSelectedUser?.username === u.username;
                          const uDraft = editedUsers[u.username] || u;
                          const hasChanges = hasUserChanges(u.username);
                          const isPending = uDraft.isPendingApproval || u.isPendingApproval;

                          return (
                            <button
                              key={`usr-${u.username}-${idx}`}
                              type="button"
                              onClick={() => {
                                setSelectedAdminUser(u.username);
                              }}
                              className={`w-full text-left p-3 rounded-xl border transition-all duration-150 cursor-pointer flex flex-col gap-1.5 ${
                                isSelected
                                  ? 'bg-blue-600/10 dark:bg-blue-400/10 border-blue-500 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/20 font-bold scale-[1.01]'
                                  : 'bg-white hover:bg-slate-100 dark:bg-slate-850 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-750 text-slate-700 dark:text-zinc-300 hover:border-slate-350'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full">
                                <span className="truncate font-black text-xs tracking-tight">
                                  👤 {u.username}
                                </span>
                                {hasChanges && (
                                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" title="Unsaved changes" />
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 flex-wrap text-[9px]">
                                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-bold capitalize text-[8px] text-slate-600 dark:text-slate-400 border border-slate-200/40 dark:border-slate-700/40">
                                  {uDraft.role}
                                </span>

                                {isPending && (
                                  <span className="bg-amber-500 text-white rounded px-1.5 py-0.5 font-extrabold text-[8px] animate-pulse">
                                    Pending
                                  </span>
                                )}

                                {(uDraft.status || 'Active') === 'Inactive' && (
                                  <span className="bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-450 px-1.5 py-0.5 rounded font-extrabold text-[8px] border border-rose-200/20">
                                    Inactive
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>

                    {/* Right Column: Dynamic Master-Detail Config Panel */}
                    <div className="md:col-span-2 space-y-4">
                      {currentSelectedUser ? (() => {
                        const u = currentSelectedUser;
                        const uDraft = editedUsers[u.username] || u;
                        const hasChanges = hasUserChanges(u.username);
                        const isPending = uDraft.isPendingApproval || u.isPendingApproval;

                        return (
                          <div className="space-y-4 animate-fade-in">
                            {/* Selected User Header Card */}
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-150 dark:border-slate-800 pb-3 gap-2">
                              <div>
                                <h4 className="text-sm font-black text-slate-800 dark:text-zinc-100 flex items-center gap-2">
                                  <span>👤</span> {u.username}
                                  {uDraft.username !== u.username && (
                                    <span className="text-xs text-amber-600 dark:text-amber-400 font-extrabold flex items-center gap-1">
                                      ➔ {uDraft.username} <span className="text-[8px] font-normal italic">(unsaved name change)</span>
                                    </span>
                                  )}
                                </h4>
                                <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-0.5 leading-snug">
                                  Set project scopes, configure credential variables, and run security operations.
                                </p>
                              </div>

                              {u.username !== currentUserObj?.username && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Are you sure you want to permanently delete user "${u.username}"?`)) {
                                      const updated = getUsers().filter(x => x.username !== u.username);
                                      saveUsers(updated);
                                      discardUserDraft(u.username);
                                      setSelectedAdminUser(null);
                                      setShowAdmin(false);
                                      setTimeout(() => setShowAdmin(true), 30);
                                    }
                                  }}
                                  className="text-[10px] font-bold text-rose-500 hover:text-rose-600 hover:underline cursor-pointer flex items-center gap-1 border border-rose-200 dark:border-rose-950/60 px-2 py-1 rounded-lg bg-rose-500/5 hover:bg-rose-500/10 transition"
                                >
                                  🗑️ Delete Profile
                                </button>
                              )}
                            </div>

                            {/* Control Area Selector Tabs */}
                            <div className="flex border-b border-slate-150 dark:border-slate-800 gap-1 p-0.5 bg-slate-100 dark:bg-slate-900/60 rounded-xl overflow-x-auto">
                              <button
                                type="button"
                                onClick={() => setSelectedAdminTab('projects')}
                                className={`flex-1 py-1.5 px-2 text-center rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                                  selectedAdminTab === 'projects'
                                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200 dark:border-slate-700 font-black'
                                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-450 dark:hover:text-zinc-200 font-extrabold'
                                }`}
                              >
                                📁 Select Projects
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedAdminTab('pages')}
                                className={`flex-1 py-1.5 px-2 text-center rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                                  selectedAdminTab === 'pages'
                                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200 dark:border-slate-700 font-black'
                                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-450 dark:hover:text-zinc-200 font-extrabold'
                                }`}
                              >
                                📑 Page Editing Scope
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedAdminTab('credentials')}
                                className={`flex-1 py-1.5 px-2 text-center rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                                  selectedAdminTab === 'credentials'
                                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200 dark:border-slate-700 font-black'
                                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-450 dark:hover:text-zinc-200 font-extrabold'
                                }`}
                              >
                                🔑 Credentials & Status
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedAdminTab('activities')}
                                className={`flex-1 py-1.5 px-2 text-center rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer whitespace-nowrap ${
                                  selectedAdminTab === 'activities'
                                    ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200 dark:border-slate-700 font-black'
                                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-450 dark:hover:text-zinc-200 font-extrabold'
                                }`}
                              >
                                ⚡ Security & Activities
                              </button>
                            </div>

                            {/* TAB 1: SELECT ACCESSIBLE PROJECTS */}
                            {selectedAdminTab === 'projects' && (
                              <div className="space-y-3 animate-fade-in">
                                <div className="bg-white dark:bg-slate-850 border border-slate-150 dark:border-slate-750 p-3.5 rounded-2xl space-y-2.5">
                                  <span className="text-[10px] text-slate-450 dark:text-slate-400 block font-bold uppercase tracking-wider">
                                    Project Scopes Assignment
                                  </span>
                                  <p className="text-3xs text-slate-500 dark:text-slate-400 leading-snug font-medium">
                                    Toggle checkboxes below to manually whitelist specific contract accessibility. Users with Directorates or PMOs mapped to their accounts will match relevant projects automatically.
                                  </p>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-2xs max-h-52 overflow-y-auto pr-1">
                                    {projects.filter(proj => {
                                      if (uDraft.role === 'admin' || uDraft.role === 'master_admin') return true;
                                      if (uDraft.assignedDirectorate && uDraft.assignedPmo) {
                                         return (proj.programDirectorate || 'Southern') === uDraft.assignedDirectorate && (proj.pmo || '') === uDraft.assignedPmo;
                                      } else if (uDraft.assignedDirectorate) {
                                         return (proj.programDirectorate || 'Southern') === uDraft.assignedDirectorate;
                                      } else if (uDraft.assignedPmo) {
                                         return (proj.pmo || '') === uDraft.assignedPmo;
                                      }
                                      return true;
                                    }).map((proj) => {
                                      const isMaster = uDraft.role === 'admin' || uDraft.role === 'master_admin';
                                      const isDirAdmin = uDraft.role === 'directorate_admin' && (proj.programDirectorate || 'Southern') === uDraft.assignedDirectorate;
                                      const isPmoAdmin = uDraft.role === 'pmo_admin' && (proj.pmo || '') === uDraft.assignedPmo;

                                      const hasAutoAccess = isMaster || isDirAdmin || isPmoAdmin;
                                      const accessible = hasAutoAccess || (uDraft.accessibleProjects || []).includes(proj.id);
                                      const originalAccessible = (u.accessibleProjects || []).includes(proj.id);
                                      const isChanged = !hasAutoAccess && (accessible !== originalAccessible);

                                      return (
                                        <label key={proj.id} className={`flex items-center gap-2 p-2 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition ${
                                          isChanged ? 'text-amber-700 dark:text-amber-400 font-extrabold bg-amber-500/5' : 'text-slate-650 dark:text-slate-350 bg-slate-50/40 dark:bg-slate-900/10'
                                        }`}>
                                          <input
                                            type="checkbox"
                                            checked={accessible}
                                            disabled={hasAutoAccess}
                                            onChange={() => {
                                              if (hasAutoAccess) return;
                                              let currentAcc = uDraft.accessibleProjects || [];
                                              if ((uDraft.accessibleProjects || []).includes(proj.id)) {
                                                currentAcc = currentAcc.filter(id => id !== proj.id);
                                              } else {
                                                currentAcc = [...currentAcc, proj.id];
                                              }
                                              updateUserDraft(u.username, 'accessibleProjects', currentAcc);
                                            }}
                                            className={`rounded border-slate-300 pointer-events-auto text-blue-600 focus:ring-blue-500 ${
                                              isChanged ? 'ring-1 ring-amber-400' : ''
                                            }`}
                                          />
                                          <span className="truncate flex-1">
                                            {proj.name}
                                            {isChanged && <span className="text-[8px] font-normal italic ml-1 text-amber-500">(changed)</span>}
                                            {hasAutoAccess && (
                                              <span className="text-[8px] bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 px-1.5 py-0.2 rounded ml-1.5 font-extrabold tracking-wide uppercase shrink-0">
                                                Auto-access
                                              </span>
                                            )}
                                          </span>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* TAB 2: ASSIGN SPECIFIC PAGE EDITING PERMISSIONS */}
                            {selectedAdminTab === 'pages' && (
                              <div className="space-y-3 animate-fade-in">
                                <div className="bg-white dark:bg-slate-850 border border-slate-150 dark:border-slate-750 p-3.5 rounded-2xl space-y-3">
                                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-2">
                                    <div>
                                      <span className="text-[11px] text-slate-800 dark:text-zinc-100 block font-black uppercase tracking-wider flex items-center gap-1.5">
                                        <span>📑</span> Assign Specific Page Editing Permissions
                                      </span>
                                      <p className="text-[10px] text-slate-450 dark:text-slate-400 mt-0.5 leading-snug">
                                        Select which specific system pages user <strong>{uDraft.username}</strong> is permitted to edit. Unchecked pages will remain in Read-Only mode for this user.
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const allPageIds = ALL_EDITABLE_PAGES.map(p => p.id);
                                          updateUserDraft(u.username, 'assignedPages', allPageIds);
                                        }}
                                        className="px-2 py-1 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-lg text-[9px] font-extrabold uppercase transition cursor-pointer"
                                      >
                                        Select All Pages
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          updateUserDraft(u.username, 'assignedPages', []);
                                        }}
                                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-lg text-[9px] font-extrabold uppercase transition cursor-pointer"
                                      >
                                        Clear Selection
                                      </button>
                                    </div>
                                  </div>

                                  <div className="bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-xl text-[10px] text-amber-800 dark:text-amber-300 leading-snug font-medium flex items-start gap-2">
                                    <span className="text-xs">⚠️</span>
                                    <div>
                                      <strong>Governance Rule:</strong> When this user submits edits on any of their assigned pages, an approval request is generated and sent to users with <strong>Approval Credentials</strong> before data is incorporated into the live database.
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                                    {ALL_EDITABLE_PAGES.map((pageOpt) => {
                                      const isMaster = uDraft.role === 'admin' || uDraft.role === 'master_admin';
                                      const currentAssigned = uDraft.assignedPages || [];
                                      const isAssigned = isMaster || (currentAssigned.length === 0 ? true : currentAssigned.includes(pageOpt.id));
                                      const isExplicitlyAssigned = currentAssigned.includes(pageOpt.id);
                                      const isChanged = !isMaster && (isExplicitlyAssigned !== ((u.assignedPages || []).includes(pageOpt.id)));

                                      return (
                                        <label
                                          key={pageOpt.id}
                                          className={`flex items-start gap-2 p-2.5 rounded-xl cursor-pointer border transition ${
                                            isAssigned
                                              ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200/80 dark:border-blue-900/40 text-slate-800 dark:text-zinc-100'
                                              : 'bg-slate-50/50 dark:bg-slate-900/20 border-slate-200/60 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isAssigned}
                                            disabled={isMaster}
                                            onChange={() => {
                                              if (isMaster) return;
                                              let updatedList = [...(uDraft.assignedPages || ALL_EDITABLE_PAGES.map(p => p.id))];
                                              if (updatedList.includes(pageOpt.id)) {
                                                updatedList = updatedList.filter(id => id !== pageOpt.id);
                                              } else {
                                                updatedList.push(pageOpt.id);
                                              }
                                              updateUserDraft(u.username, 'assignedPages', updatedList);
                                            }}
                                            className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                          />
                                          <div className="flex-1">
                                            <div className="flex items-center justify-between">
                                              <span className="font-extrabold text-2xs text-slate-800 dark:text-zinc-100">
                                                {pageOpt.name}
                                              </span>
                                              {isMaster && (
                                                <span className="text-[8px] bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 px-1.5 py-0.2 rounded font-extrabold uppercase">
                                                  Full Admin
                                                </span>
                                              )}
                                              {isChanged && (
                                                <span className="text-[8px] text-amber-500 font-extrabold italic">
                                                  (unsaved)
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 leading-tight">
                                              {pageOpt.description}
                                            </p>
                                          </div>
                                        </label>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* TAB 3: CREDENTIALS & PRIVILEGE STATUS */}
                            {selectedAdminTab === 'credentials' && (
                              <div className="space-y-3 animate-fade-in">
                                <div className="bg-white dark:bg-slate-850 border border-slate-150 dark:border-slate-750 p-3.5 rounded-2xl space-y-3">
                                  <span className="text-[10px] text-slate-450 dark:text-slate-400 block font-bold uppercase tracking-wider">
                                    Account Privilege & Passcode variables
                                  </span>

                                  <div className="grid grid-cols-2 gap-3 text-xs">
                                    <div>
                                      <label className="text-[10px] text-slate-400 block font-bold mb-1">Credential Status:</label>
                                      <select
                                        value={uDraft.status || 'Active'}
                                        onChange={(e) => {
                                          updateUserDraft(u.username, 'status', e.target.value);
                                        }}
                                        className={`bg-white dark:bg-slate-800 text-[10px] py-1.5 px-1.5 border rounded-lg font-bold w-full outline-none ${
                                          (uDraft.status || 'Active') !== (u.status || 'Active') ? 'border-amber-400 ring-1 ring-amber-300 dark:ring-amber-900' : 'border-slate-200 dark:border-slate-700'
                                        }`}
                                      >
                                        <option value="Active">🟢 Active</option>
                                        <option value="Inactive">🔴 Inactive</option>
                                      </select>
                                    </div>

                                    <div>
                                      <label className="text-[10px] text-slate-400 block font-bold mb-1">Privilege Role:</label>
                                      <select
                                        value={uDraft.role}
                                        onChange={(e) => {
                                          updateUserDraft(u.username, 'role', e.target.value as User['role']);
                                        }}
                                        className={`bg-white dark:bg-slate-800 text-[10px] py-1.5 px-1.5 border rounded-lg font-bold w-full outline-none ${
                                          uDraft.role !== u.role ? 'border-amber-400 ring-1 ring-amber-300 dark:ring-amber-900' : 'border-slate-200 dark:border-slate-700'
                                        }`}
                                      >
                                        <option value="viewer">Viewer</option>
                                        <option value="editor">Editor</option>
                                        <option value="approver">Approver</option>
                                        {(currentUserObj?.role === 'master_admin' || currentUserObj?.role === 'admin' || currentUserObj?.username === 'proj_1781786415663') && (
                                          <>
                                            <option value="admin">Admin</option>
                                            <option value="master_admin">Master Admin</option>
                                            <option value="cpm_admin">CPM Admin (All Projects)</option>
                                            <option value="directorate_admin">Directorate Admin</option>
                                          </>
                                        )}
                                        {(currentUserObj?.role === 'master_admin' || currentUserObj?.role === 'admin' || currentUserObj?.role === 'directorate_admin' || currentUserObj?.username === 'proj_1781786415663') && (
                                          <option value="pmo_admin">PMO Admin</option>
                                        )}
                                      </select>
                                    </div>

                                    <div>
                                      <label className="text-[10px] text-slate-400 block font-bold mb-1">Edit Username:</label>
                                      <input
                                        type="text"
                                        value={uDraft.username}
                                        onChange={(e) => {
                                          updateUserDraft(u.username, 'username', e.target.value);
                                        }}
                                        className={`bg-white dark:bg-slate-800 text-[10px] py-1.5 px-2 border rounded-lg font-bold w-full outline-none ${
                                          uDraft.username !== u.username ? 'border-amber-400 ring-1 ring-amber-300 dark:ring-amber-900 text-amber-600 dark:text-amber-400 font-extrabold' : 'border-slate-200 dark:border-slate-700 text-slate-800 dark:text-zinc-100'
                                        }`}
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[10px] text-slate-400 block font-bold mb-1">Edit Password:</label>
                                      <div className="relative">
                                        <input
                                          type={visiblePasswords[u.username] ? 'text' : 'password'}
                                          value={uDraft.password || ''}
                                          onChange={(e) => {
                                            updateUserDraft(u.username, 'password', e.target.value);
                                          }}
                                          className={`bg-white dark:bg-slate-800 text-[10px] py-1.5 pl-2 pr-7 border rounded-lg font-bold w-full outline-none ${
                                            uDraft.password !== u.password ? 'border-amber-400 ring-1 ring-amber-300 dark:ring-amber-900 text-amber-600 dark:text-amber-400 font-extrabold' : 'border-slate-200 dark:border-slate-700 text-slate-800 dark:text-zinc-100'
                                          }`}
                                          placeholder="Password"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setVisiblePasswords(prev => ({
                                              ...prev,
                                              [u.username]: !prev[u.username]
                                            }));
                                          }}
                                          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650 cursor-pointer p-0.5"
                                          title={visiblePasswords[u.username] ? "Hide password" : "Show password"}
                                        >
                                          {visiblePasswords[u.username] ? (
                                            <EyeOff className="w-3.5 h-3.5" />
                                          ) : (
                                            <Eye className="w-3.5 h-3.5" />
                                          )}
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {uDraft.role !== 'master_admin' && uDraft.role !== 'admin' && (
                                    <div className="grid grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800 pt-2.5 mt-2.5">
                                      {uDraft.role !== 'pmo_admin' && (
                                        <div>
                                          <label className="text-[10px] text-slate-400 block font-bold mb-1">Directorate Scope:</label>
                                          <select 
                                            value={uDraft.assignedDirectorate || ''}
                                            onChange={(e) => updateUserDraft(u.username, 'assignedDirectorate', e.target.value || undefined)}
                                            className={`bg-white dark:bg-slate-800 text-[10px] py-1.5 px-2 border rounded-lg font-bold w-full outline-none ${
                                              uDraft.assignedDirectorate !== u.assignedDirectorate ? 'border-amber-400 ring-1 ring-amber-300 dark:ring-amber-900 text-amber-600 dark:text-amber-400 font-extrabold' : 'border-slate-200 dark:border-slate-700 text-slate-800 dark:text-zinc-100'
                                            }`}
                                          >
                                            <option value="">-- None / All --</option>
                                            {programDirectorates.map(d => <option key={d} value={d}>{d}</option>)}
                                          </select>
                                        </div>
                                      )}
                                      
                                      {uDraft.role !== 'directorate_admin' && (
                                        <div>
                                          <label className="text-[10px] text-slate-400 block font-bold mb-1">PMO Group Scope:</label>
                                          <select 
                                            value={uDraft.assignedPmo || ''}
                                            onChange={(e) => updateUserDraft(u.username, 'assignedPmo', e.target.value || undefined)}
                                            className={`bg-white dark:bg-slate-800 text-[10px] py-1.5 px-2 border rounded-lg font-bold w-full outline-none ${
                                              uDraft.assignedPmo !== u.assignedPmo ? 'border-amber-400 ring-1 ring-amber-300 dark:ring-amber-900 text-amber-600 dark:text-amber-400 font-extrabold' : 'border-slate-200 dark:border-slate-700 text-slate-800 dark:text-zinc-100'
                                            }`}
                                          >
                                            <option value="">-- None / All --</option>
                                            {pmos.map(p => <option key={p} value={p}>{p}</option>)}
                                          </select>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* TAB 3: SECURITY & ADMIN APPROVAL GOVERNANCE */}
                            {selectedAdminTab === 'activities' && (
                              <div className="space-y-3 animate-fade-in">
                                <div className="bg-white dark:bg-slate-850 border border-slate-150 dark:border-slate-750 p-3.5 rounded-2xl space-y-3.5">
                                  {isPending && (
                                    <div className="bg-amber-500/10 dark:bg-amber-500/5 border border-amber-500/20 rounded-2xl p-3 flex flex-col sm:flex-row justify-between items-center gap-2">
                                      <div className="text-[11px] text-amber-700 dark:text-amber-400 text-left font-semibold">
                                        <p className="font-extrabold uppercase tracking-wide">🆕 Self-Registration Pending</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5 leading-snug font-medium">
                                          User requested registration. Review credentials, assign project access, and approve account.
                                        </p>
                                      </div>
                                      <div className="flex gap-1.5 shrink-0 w-full sm:w-auto justify-end">
                                        <button
                                          type="button"
                                          onClick={() => handleApproveUserImmediately(u.username)}
                                          className="w-full sm:w-auto px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-2xs font-extrabold uppercase transition shadow-sm cursor-pointer"
                                        >
                                          ✓ Approve & Activate
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  <div className="space-y-3">
                                    <span className="text-[10px] text-slate-450 dark:text-slate-400 block font-bold uppercase tracking-wider">
                                      Admin Approval & Credential Access Governance
                                    </span>

                                    <div className="p-3.5 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-3 text-xs">
                                      <div className="flex items-center justify-between">
                                        <span className="font-bold text-slate-700 dark:text-slate-200 text-xs">
                                          Account Approval Status:
                                        </span>
                                        {isPending ? (
                                          <span className="bg-amber-500 text-white text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider animate-pulse">
                                            Pending Admin Approval
                                          </span>
                                        ) : (
                                          <span className="bg-emerald-500 text-white text-[9px] px-2 py-0.5 rounded font-black uppercase tracking-wider">
                                            Approved & Authorized
                                          </span>
                                        )}
                                      </div>

                                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                                        Only users who have been explicitly approved by an Administrator can access the website and system pages based on their assigned credentials, roles, and project scopes.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Individual Draft Save/Discard */}
                            {hasChanges && (
                              <div className="flex justify-between items-center bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 p-2.5 rounded-2xl animate-fade-in shadow-sm">
                                <span className="text-[10px] text-amber-700 dark:text-amber-400 font-extrabold flex items-center gap-1">
                                  ⚠️ Unsaved edits on {u.username}
                                </span>
                                <div className="flex gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => discardUserDraft(u.username)}
                                    className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-zinc-200 font-black rounded-lg text-2xs uppercase transition cursor-pointer"
                                  >
                                    Discard
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => saveUserDraft(u.username)}
                                    className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg text-2xs uppercase transition shadow-xs flex items-center gap-1 cursor-pointer"
                                  >
                                    💾 Save User
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })() : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-slate-50/50 dark:bg-slate-900/10 rounded-2xl border border-dashed border-slate-250 dark:border-slate-800/80">
                          <span className="text-3xl">👈</span>
                          <p className="text-xs font-bold text-slate-650 dark:text-slate-350 mt-2.5 max-w-xs">
                            Select a user name button on the left panel to configure their credentials and project authorizations.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* PMOs and Program Directorates management */}
            <div className="border-t border-slate-150 dark:border-slate-700/60 pt-4 space-y-4">
              <h4 className="text-xs font-extrabold text-slate-800 dark:text-zinc-100 uppercase tracking-wider block flex items-center gap-1.5">
                🏢 Program Directorates & PMO Management
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Program Directorates */}
                <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-150 dark:border-slate-700/60 space-y-2.5">
                  <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider block">Program Directorates</span>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                    {programDirectorates.map(pd => {
                      const isEditing = editingPd === pd;
                      return isEditing ? (
                        <div key={pd} className="inline-flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-lg text-2xs font-bold border border-indigo-200 dark:border-indigo-900">
                          <input
                            type="text"
                            value={editingPdVal}
                            onChange={(e) => setEditingPdVal(e.target.value)}
                            className="bg-white dark:bg-slate-800 border border-indigo-300 dark:border-indigo-700 rounded px-1 py-0.5 text-2xs font-bold outline-none max-w-[90px] text-slate-850 dark:text-zinc-100"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleEditDirectorate(pd, editingPdVal);
                                setEditingPd(null);
                              } else if (e.key === 'Escape') {
                                setEditingPd(null);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              handleEditDirectorate(pd, editingPdVal);
                              setEditingPd(null);
                            }}
                            className="text-emerald-600 hover:text-emerald-800 font-extrabold text-xs cursor-pointer"
                            title="Save"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPd(null)}
                            className="text-rose-500 hover:text-rose-700 font-extrabold text-xs cursor-pointer"
                            title="Cancel"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <span key={pd} className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 px-2 py-1 rounded-lg text-2xs font-bold border border-indigo-150 dark:border-indigo-900/50">
                          <span>{pd}</span>
                          <div className="flex items-center gap-1 ml-0.5 border-l border-indigo-200 dark:border-indigo-900 pl-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPd(pd);
                                setEditingPdVal(pd);
                              }}
                              className="text-blue-500 hover:text-blue-750 font-bold text-2xs cursor-pointer"
                              title="Edit Directorate Name"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (programDirectorates.length <= 1) {
                                  alert("Cannot delete the last directorate.");
                                  return;
                                }
                                handleDeleteDirectorate(pd);
                              }}
                              className="text-rose-500 hover:text-rose-700 font-bold text-xs cursor-pointer"
                              title="Delete Directorate"
                            >
                              ×
                            </button>
                          </div>
                        </span>
                      );
                    })}
                  </div>

                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const frm = e.target as any;
                    const val = frm.newPd.value.trim();
                    if (!val) return;
                    handleAddDirectorate(val);
                    frm.reset();
                  }} className="flex gap-1.5">
                    <input
                      required
                      name="newPd"
                      type="text"
                      placeholder="New Directorate"
                      className="bg-white dark:bg-slate-800 text-xs px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-lg flex-1 text-slate-850 dark:text-zinc-100 outline-none focus:border-indigo-500"
                    />
                    <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 text-xs font-bold uppercase shrink-0">
                      Add
                    </button>
                  </form>
                </div>

                {/* PMO */}
                <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-150 dark:border-slate-700/60 space-y-2.5">
                  <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider block">PMO Groupings</span>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl">
                    {pmos.map(p => {
                      const isEditing = editingPmo === p;
                      return isEditing ? (
                        <div key={p} className="inline-flex items-center gap-1.5 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-lg text-2xs font-bold border border-purple-200 dark:border-purple-900">
                          <input
                            type="text"
                            value={editingPmoVal}
                            onChange={(e) => setEditingPmoVal(e.target.value)}
                            className="bg-white dark:bg-slate-800 border border-purple-300 dark:border-purple-700 rounded px-1 py-0.5 text-2xs font-bold outline-none max-w-[90px] text-slate-850 dark:text-zinc-100"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleEditPmo(p, editingPmoVal);
                                setEditingPmo(null);
                              } else if (e.key === 'Escape') {
                                setEditingPmo(null);
                              }
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              handleEditPmo(p, editingPmoVal);
                              setEditingPmo(null);
                            }}
                            className="text-emerald-600 hover:text-emerald-800 font-extrabold text-xs cursor-pointer"
                            title="Save"
                          >
                            ✓
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPmo(null)}
                            className="text-rose-500 hover:text-rose-700 font-extrabold text-xs cursor-pointer"
                            title="Cancel"
                          >
                            ×
                          </button>
                        </div>
                      ) : (
                        <span key={p} className="inline-flex items-center gap-1.5 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 px-2 py-1 rounded-lg text-2xs font-bold border border-purple-150 dark:border-purple-900/50">
                          <span>{p}</span>
                          <div className="flex items-center gap-1 ml-0.5 border-l border-purple-200 dark:border-purple-900 pl-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingPmo(p);
                                setEditingPmoVal(p);
                              }}
                              className="text-blue-500 hover:text-blue-750 font-bold text-2xs cursor-pointer"
                              title="Edit PMO Name"
                            >
                              ✏️
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (pmos.length <= 1) {
                                  alert("Cannot delete the last PMO.");
                                  return;
                                }
                                handleDeletePmo(p);
                              }}
                              className="text-rose-500 hover:text-rose-700 font-bold text-xs cursor-pointer"
                              title="Delete PMO"
                            >
                              ×
                            </button>
                          </div>
                        </span>
                      );
                    })}
                  </div>

                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const frm = e.target as any;
                    const val = frm.newPmo.value.trim();
                    if (!val) return;
                    handleAddPmo(val);
                    frm.reset();
                  }} className="flex gap-1.5">
                    <input
                      required
                      name="newPmo"
                      type="text"
                      placeholder="New PMO"
                      className="bg-white dark:bg-slate-800 text-xs px-2.5 py-1 border border-slate-200 dark:border-slate-700 rounded-lg flex-1 text-slate-850 dark:text-zinc-100 outline-none focus:border-purple-500"
                    />
                    <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white rounded-lg px-3 text-xs font-bold uppercase shrink-0">
                      Add
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Firebase Cloud Firestore Live Sync Manager */}
            <div className="border-t border-slate-150 dark:border-slate-700/60 pt-4 space-y-4">
              <h4 className="text-xs font-extrabold text-slate-800 dark:text-zinc-100 uppercase tracking-wider block flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                  <Database className="w-4 h-4" /> ⚡ Standalone Firebase Cloud Firestore Sync
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${!syncSuspended ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400'}`}>
                  {!syncSuspended ? (
                    <>
                      <Wifi className="w-2.5 h-2.5 animate-pulse" /> Live Syncing
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-2.5 h-2.5" /> Paused (Rate Control)
                    </>
                  )}
                </span>
              </h4>

              <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-700/60 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isSyncAutoSuspendDisabled}
                      onChange={(e) => handleToggleSyncAutoSuspend(e.target.checked)}
                      className="w-3.5 h-3.5 text-indigo-600 border-slate-300 dark:border-slate-700 rounded focus:ring-indigo-500"
                    />
                    <div className="text-2xs font-semibold text-slate-700 dark:text-slate-300">
                      <span className="block font-bold">Continuous Sync Mode</span>
                      <span className="block text-[10px] text-slate-400 font-normal">Keep active sync to Firebase Cloud Firestore</span>
                    </div>
                  </label>

                  <button
                    type="button"
                    onClick={handleManualReactivateSync}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-3 py-1.5 text-2xs font-bold uppercase cursor-pointer transition shadow-sm"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Force Reactivate Live Sync
                  </button>
                </div>

                {syncSuspended && (
                  <div className="bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/40 rounded-xl p-2.5 text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="leading-snug">
                      <strong>Sync paused:</strong> Sync rate control engaged. Click <strong>Force Reactivate Live Sync</strong> or enable <strong>Continuous Sync Mode</strong> to resume active multi-location sync.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Real-time Firebase Firestore Sync Manager */}
            <div className="border-t border-slate-150 dark:border-slate-700/60 pt-4 space-y-4">
              <h4 className="text-xs font-extrabold text-slate-800 dark:text-zinc-100 uppercase tracking-wider block flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                  <Database className="w-4 h-4" /> ⚡️ Firebase Cloud Firestore Sync Manager
                </span>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${isOnline ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'}`}>
                  {isOnline ? (
                    <>
                      <Wifi className="w-2.5 h-2.5" /> Online
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-2.5 h-2.5" /> Offline
                    </>
                  )}
                </span>
              </h4>

              <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-slate-150 dark:border-slate-700/60 space-y-3">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="text-2xs font-semibold text-slate-500 dark:text-slate-400 space-y-0.5">
                    <p>
                      <strong>Local Offline Queue:</strong>{' '}
                      <span className={`font-mono px-1.5 py-0.5 rounded text-xs font-bold ${offlineQueueLength > 0 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400' : 'bg-slate-100 text-slate-750 dark:bg-slate-800 dark:text-slate-300'}`}>
                        {offlineQueueLength} updates pending
                      </span>
                    </p>
                    {lastSyncTime && <p>Last Queue Sync attempt: <span className="font-mono text-slate-700 dark:text-slate-300">{lastSyncTime}</span></p>}
                  </div>

                  <div className="flex flex-wrap gap-2 w-full sm:w-auto font-bold text-xs">
                    <button
                      type="button"
                      disabled={isSyncingQueue || !isOnline}
                      onClick={triggerOfflineQueueSync}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl px-3 py-1.5 text-2xs font-bold uppercase cursor-pointer transition shadow-sm"
                    >
                      <RefreshCw className={`w-3 h-3 ${isSyncingQueue ? 'animate-spin' : ''}`} />
                      {isSyncingQueue ? 'Syncing...' : 'Sync Now'}
                    </button>
                    <button
                      type="button"
                      disabled={isBatchSyncing || !isOnline || offlineQueueLength === 0}
                      onClick={handleBatchSyncNow}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 text-white rounded-xl px-3 py-1.5 text-2xs font-bold uppercase cursor-pointer transition shadow-sm"
                      title="Force manual high-priority transmission of all offline queue changes directly to Firebase Firestore"
                    >
                      <Zap className={`w-3 h-3 ${isBatchSyncing ? 'animate-bounce' : ''}`} />
                      {isBatchSyncing ? 'Batching...' : 'Batch Sync Now'}
                    </button>
                    <button
                      type="button"
                      onClick={fetchSyncLogs}
                      className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl px-2.5 py-1.5 text-2xs font-bold uppercase shrink-0 text-slate-700 dark:text-zinc-200 cursor-pointer transition shadow-sm"
                      title="Refresh Logs"
                    >
                      🔄
                    </button>
                  </div>
                </div>

                {/* Database Sync Diagnostics Logs */}
                <div className="space-y-1.5">
                  <span className="text-2xs font-extrabold text-slate-400 uppercase tracking-wider block">Firebase Firestore Event & Validation Logs</span>
                  <div className="max-h-48 overflow-y-auto border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 rounded-xl divide-y divide-slate-100 dark:divide-slate-800">
                    {syncLogs.length === 0 ? (
                      <p className="text-center py-6 text-2xs text-slate-400 font-medium font-mono">No synchronization events recorded yet.</p>
                    ) : (
                      syncLogs.map((log) => {
                        let statusColor = 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900';
                        if (log.status === 'validation_failed') statusColor = 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900';
                        if (log.status === 'server_error') statusColor = 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900';

                        return (
                          <div key={log.id} className="p-2.5 space-y-1 text-2xs">
                            <div className="flex justify-between items-center">
                              <span className="font-mono text-slate-400">{new Date(log.createdAt).toLocaleString()}</span>
                              <span className={`px-1.5 py-0.5 rounded border text-[9px] font-extrabold uppercase ${statusColor}`}>
                                {log.status}
                              </span>
                            </div>
                            <div className="flex justify-between items-center gap-2">
                              <span className="font-bold text-slate-700 dark:text-zinc-200">
                                {log.recordType.toUpperCase()} {log.recordId ? `(${log.recordId})` : ''}
                              </span>
                              <span className="font-mono text-slate-400 text-[10px]">IP: {log.ipAddress}</span>
                            </div>
                            {log.errorMessage && (
                              <p className="font-mono text-[10px] text-rose-500 bg-rose-50/50 dark:bg-rose-950/10 p-1.5 rounded border border-rose-100 dark:border-rose-950/30">
                                {log.errorMessage}
                              </p>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
            </div>

            {/* Sticky Action Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-750 bg-slate-50 dark:bg-slate-900/60 flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {Object.keys(editedUsers).some(un => hasUserChanges(un)) ? (
                  <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5 font-bold">
                    <span className="animate-pulse text-amber-500">⚠️</span> {Object.keys(editedUsers).filter(un => hasUserChanges(un)).length} update(s) pending save
                  </span>
                ) : (
                  <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <span>✓</span> All configurations are saved and synced
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdmin(false);
                    const updatedProjects = [...projects];
                    setProjects(updatedProjects);
                  }}
                  className="px-3.5 py-1.5 border border-slate-200 dark:border-slate-750 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-2xs font-extrabold text-slate-600 dark:text-zinc-200 uppercase transition cursor-pointer"
                >
                  Close Window
                </button>

                {Object.keys(editedUsers).some(un => hasUserChanges(un)) && (
                  <>
                    <button
                      type="button"
                      onClick={discardAllUserDrafts}
                      className="px-3.5 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-750 dark:text-zinc-200 rounded-xl text-2xs font-extrabold uppercase transition cursor-pointer"
                    >
                      Discard All
                    </button>
                    <button
                      type="button"
                      onClick={saveAllUserDrafts}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-2xs font-extrabold uppercase transition shadow-md flex items-center gap-1.5 cursor-pointer transform hover:scale-[1.01]"
                    >
                      💾 Save All Changes
                    </button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Approvals Modal Overlay */}
      {showApprovals && (currentUserObj?.role === 'approver' || currentUserObj?.role === 'admin' || currentUserObj?.username === 'proj_1781786415663') && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 animate-fade-in">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`w-full ${expandedApprovalId ? 'max-w-5xl' : 'max-w-2xl'} transition-all duration-300 bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-150 dark:border-slate-700/60 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto`}
          >
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-850 dark:text-zinc-100 uppercase tracking-wide">
                  Interim Variance Approvals & Verification
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  Review side-by-side audit comparing <strong className="text-rose-600 dark:text-rose-400">Current State (Live Baseline)</strong> vs <strong className="text-emerald-600 dark:text-emerald-400">Requested Changes (Submitted Draft)</strong>.
                </p>
              </div>
              <button 
                onClick={() => setShowApprovals(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-650 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>

            <div className="space-y-4">
              {pendingApprovals.filter(a => a.status === 'pending' && canUserApproveRequest(currentUserObj, a, projects)).map((a) => (
                <div key={a.id} className="p-3.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs space-y-3 shadow-sm">
                  <div className="flex justify-between items-center flex-wrap gap-2 text-2xs text-slate-400 font-bold border-b border-slate-200/60 dark:border-slate-800/80 pb-2">
                    <span className="text-slate-700 dark:text-slate-300 font-extrabold text-xs">{a.projectName}</span>
                    <span className="bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-full">Requested: {new Date(a.requestedAt).toLocaleString()}</span>
                  </div>
                  <p className="font-semibold text-slate-800 dark:text-slate-250 leading-tight">
                    Change variance request submitted for BOQ sector <strong className="text-blue-600 dark:text-blue-400">{a.section}</strong> by modified author <strong className="text-slate-900 dark:text-white">{a.requestedBy}</strong>.
                  </p>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setExpandedApprovalId(expandedApprovalId === a.id ? null : a.id)}
                      className="bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-zinc-200 rounded-xl px-3.5 py-1.5 font-bold text-xs transition flex items-center gap-1.5"
                    >
                      <span>{expandedApprovalId === a.id ? 'Hide Comparison' : 'View Side-by-Side Comparison'}</span>
                      <span className="text-2xs">{expandedApprovalId === a.id ? '▲' : '▼'}</span>
                    </button>
                    <button
                      onClick={() => {
                        const approvedList = pendingApprovals.map(x => x.id === a.id ? { ...x, status: 'approved' as const, approvedBy: currentUserObj.username, approvedAt: new Date().toISOString() } : x);
                        setPendingApprovals(approvedList);
                        safeSetItem('era_appr_v28', JSON.stringify(approvedList));
                        safeSyncApprovals(approvedList).catch(err => {
                          console.warn('Approvals cloud sync failed:', err);
                        });

                        // Apply the changes to the project
                        let updatedProj;
                        if (a.snapshotData && (a.snapshotData as any)._requestDeletion) {
                          alert(`Project deletion request cannot be processed. Project deletion is disabled to prevent project data loss.`);
                          setShowApprovals(false);
                          return;
                        }

                        const projectExists = projects.some(p => p.id === a.projectId);
                        if (!projectExists) {
                          // It is a new project!
                          const newProj = {
                            ...a.snapshotData,
                            lastModifiedBy: a.requestedBy,
                            lastModifiedAt: new Date().toISOString(),
                            lastModifiedSection: 'Approved creation request',
                            approvedBy: currentUserObj.username,
                            approvedAt: new Date().toISOString(),
                            approverRole: currentUserObj.role
                          };
                          updatedProj = [...projects, newProj];
                          setProjects(updatedProj);
                          safeSetItem('era_proj_v28', JSON.stringify(updatedProj));
                          safeSyncProject(newProj).catch(err => {
                            console.warn('Project creation cloud sync fell back to local storage:', err);
                          });
                        } else {
                          // Apply changes to the existing project
                          updatedProj = projects.map(p => {
                            if (p.id === a.projectId) {
                              const merged = {
                                ...p,
                                ...a.snapshotData,
                                lastModifiedBy: a.requestedBy,
                                lastModifiedAt: new Date().toISOString(),
                                lastModifiedSection: `Approved updates: ${a.section}`,
                                approvedBy: currentUserObj.username,
                                approvedAt: new Date().toISOString(),
                                approverRole: currentUserObj.role
                              };
                              if (currentProjectId === p.id) {
                                setCurrentProject(merged);
                              }
                              return merged;
                            }
                            return p;
                          });
                          setProjects(updatedProj);
                          safeSetItem('era_proj_v28', JSON.stringify(updatedProj));

                          // Sync certified variance to Cloud Databases in real-time
                          const targetProj = updatedProj.find(p => p.id === a.projectId);
                          if (targetProj) {
                            safeSyncProject(targetProj).catch(err => {
                              console.warn('Certification update cloud sync fell back to local storage:', err);
                            });
                          }
                        }

                        alert('Contract modifications successfully approved & mapped to live baseline.');
                        setShowApprovals(false);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-3.5 py-1.5 font-bold text-xs transition shadow-sm"
                    >
                      Certify Variance
                    </button>
                    <button
                      onClick={() => {
                        const rejectedList = pendingApprovals.map(x => x.id === a.id ? { ...x, status: 'rejected' as const } : x);
                        setPendingApprovals(rejectedList);
                        safeSetItem('era_appr_v28', JSON.stringify(rejectedList));
                        safeSyncApprovals(rejectedList).catch(err => {
                          console.warn('Approvals cloud sync failed:', err);
                        });
                        alert('Variance request declined.');
                        setShowApprovals(false);
                      }}
                      className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl px-3.5 py-1.5 font-bold text-xs transition shadow-sm"
                    >
                      Decline
                    </button>
                  </div>

                  {expandedApprovalId === a.id && (
                    <div className="mt-3 bg-white dark:bg-slate-950 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl text-[11px] space-y-4 shadow-inner">
                      {/* View Mode Toggle Header */}
                      <div className="flex justify-between items-center border-b border-slate-150 dark:border-slate-800 pb-2.5 flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                          <button
                            onClick={() => setApprovalViewMode('sideBySide')}
                            className={`px-3 py-1 rounded-lg font-bold text-2xs transition ${approvalViewMode === 'sideBySide' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                          >
                            ↔️ Side-by-Side Comparison
                          </button>
                          <button
                            onClick={() => setApprovalViewMode('summary')}
                            className={`px-3 py-1 rounded-lg font-bold text-2xs transition ${approvalViewMode === 'summary' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                          >
                            📋 Unified Diff Summary
                          </button>
                        </div>
                        <span className="text-[10px] font-medium text-slate-400">
                          Target Section: <strong className="text-slate-600 dark:text-slate-300">{a.section}</strong>
                        </span>
                      </div>

                      {(() => {
                        const originalProject = projects.find(p => p.id === a.projectId);
                        
                        const formatFieldName = (f: string) => {
                          return f
                            .replace(/([A-Z])/g, ' $1')
                            .replace(/^./, str => str.toUpperCase())
                            .replace('Row ', 'ROW ')
                            .replace('Ipc ', 'IPC ')
                            .replace('Kpi ', 'KPI ')
                            .replace('Usd ', 'USD ')
                            .replace('Pmo', 'PMO')
                            .trim();
                        };

                        const formatValDisplay = (field: string, val: any) => {
                          if (val === undefined || val === null) return 'None';
                          if (typeof val === 'boolean') return val ? 'True' : 'False';
                          if (typeof val === 'object') return JSON.stringify(val);
                          
                          if (field === 'origAmount' || field === 'variation' || field === 'provisionalSum') {
                            return `${val} Million Birr`;
                          } else if (field === 'physicalProgress') {
                            return `${val}%`;
                          } else if (field === 'lengthKm') {
                            return `${val} Km`;
                          } else if (field === 'origDays' || field === 'eotDays' || field === 'interimEotDays') {
                            return `${val} Days`;
                          }
                          return String(val);
                        };

                        if (!originalProject) {
                           const snap = a.snapshotData || {};
                           return (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                               <div className="p-3 bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40 rounded-xl space-y-1.5">
                                 <div className="font-bold text-rose-700 dark:text-rose-400 text-2xs uppercase tracking-wide flex items-center gap-1">
                                   <span className="w-2 h-2 rounded-full bg-rose-500"></span> Current State (Live Baseline)
                                 </div>
                                 <p className="text-slate-500 text-2xs italic">No existing project baseline found in database. This request proposes creating a brand new project record.</p>
                               </div>
                               <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 rounded-xl space-y-2">
                                 <div className="font-bold text-emerald-700 dark:text-emerald-400 text-2xs uppercase tracking-wide flex items-center gap-1">
                                   <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Requested Changes (New Project Profile)
                                 </div>
                                 <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-2xs font-medium">
                                   <div><span className="text-slate-400 font-normal">Name:</span> {snap.name || 'N/A'}</div>
                                   <div><span className="text-slate-400 font-normal">Client:</span> {snap.client || 'N/A'}</div>
                                   <div><span className="text-slate-400 font-normal">Contractor:</span> {snap.contractor || 'N/A'}</div>
                                   <div><span className="text-slate-400 font-normal">Consultant:</span> {snap.consultant || 'N/A'}</div>
                                   <div><span className="text-slate-400 font-normal">Start Date:</span> {snap.startDate || 'N/A'}</div>
                                   <div><span className="text-slate-400 font-normal">Length:</span> {snap.lengthKm ? `${snap.lengthKm} Km` : 'N/A'}</div>
                                   <div><span className="text-slate-400 font-normal">Original Days:</span> {snap.origDays ? `${snap.origDays} Days` : 'N/A'}</div>
                                   <div><span className="text-slate-400 font-normal">Original Amount:</span> {snap.origAmount ? `${snap.origAmount} Million Birr` : 'N/A'}</div>
                                   <div><span className="text-slate-400 font-normal">Directorate:</span> {snap.programDirectorate || 'N/A'}</div>
                                   <div><span className="text-slate-400 font-normal">PMO:</span> {snap.pmo || 'N/A'}</div>
                                 </div>
                               </div>
                             </div>
                           );
                        }
                        
                        if (a.snapshotData && (a.snapshotData as any)._requestDeletion) {
                           return (
                             <div className="bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 p-3 rounded-xl border border-rose-200/50 dark:border-rose-900/40 font-bold text-center">
                               ⚠️ This is a request to permanently delete the project baseline.
                             </div>
                           );
                        }

                        // Side-by-side rendering logic
                        if (approvalViewMode === 'sideBySide') {
                          const primitiveFields: { key: string; label: string; oldVal: any; newVal: any }[] = [];
                          const arrayFields: { key: string; label: string; oldVal: any[]; newVal: any[] }[] = [];

                          const ignoreKeys = new Set(['_requestDeletion', 'lastModifiedBy', 'lastModifiedAt', 'lastModifiedSection', 'approvedBy', 'approvedAt', 'approverRole', 'id']);
                          const allKeys = new Set([...Object.keys(originalProject), ...Object.keys(a.snapshotData || {})]);

                          allKeys.forEach(k => {
                            if (ignoreKeys.has(k) || k.startsWith('_')) return;
                            const oldV = (originalProject as any)[k];
                            const newV = (a.snapshotData as any)[k];
                            const oldStr = JSON.stringify(oldV);
                            const newStr = JSON.stringify(newV);
                            if (oldStr === newStr) return;

                            if (Array.isArray(oldV) || Array.isArray(newV)) {
                              arrayFields.push({
                                key: k,
                                label: formatFieldName(k),
                                oldVal: Array.isArray(oldV) ? oldV : [],
                                newVal: Array.isArray(newV) ? newV : []
                              });
                            } else {
                              primitiveFields.push({
                                key: k,
                                label: formatFieldName(k),
                                oldVal: oldV,
                                newVal: newV
                              });
                            }
                          });

                          if (primitiveFields.length === 0 && arrayFields.length === 0) {
                            return <p className="text-slate-500 italic font-bold text-center py-2 text-xs">No material changes detected between Current Baseline and Requested Changes.</p>;
                          }

                          const computeArrayDiff = (field: string, oldArr: any[], newArr: any[]) => {
                            let idKey = 'id';
                            if (field === 'quantities') idKey = 'name';
                            else if (field === 'rowMetrics') idKey = 'name';
                            else if (field === 'monthly') idKey = 'month';
                            else if (field === 'series') idKey = 'code';
                            else if (field === 'payment') idKey = 'item';
                            else if (field === 'annual') idKey = 'year';
                            else if (field === 'bonds') idKey = 'sno';
                            else if (field === 'rowStatus') idKey = 'from';

                            const oldMap = new Map<string, any>();
                            oldArr.forEach(item => {
                              const k = String(item[idKey] || item.id || item.name || item.desc || '');
                              if (k) oldMap.set(k, item);
                            });

                            const newMap = new Map<string, any>();
                            newArr.forEach(item => {
                              const k = String(item[idKey] || item.id || item.name || item.desc || '');
                              if (k) newMap.set(k, item);
                            });

                            const added: any[] = [];
                            const removed: any[] = [];
                            const modified: { itemKey: string; oldItem: any; newItem: any; changes: { prop: string; old: any; new: any }[] }[] = [];

                            newArr.forEach(item => {
                              const k = String(item[idKey] || item.id || item.name || item.desc || '');
                              if (!oldMap.has(k)) {
                                added.push(item);
                              } else {
                                const oldItem = oldMap.get(k);
                                const itemChanges: { prop: string; old: any; new: any }[] = [];
                                const itemKeys = new Set([...Object.keys(oldItem), ...Object.keys(item)]);
                                itemKeys.forEach(p => {
                                  if (p === 'id' || p === idKey) return;
                                  if (JSON.stringify(oldItem[p]) !== JSON.stringify(item[p])) {
                                    itemChanges.push({ prop: formatFieldName(p), old: oldItem[p], new: item[p] });
                                  }
                                });
                                if (itemChanges.length > 0) {
                                  modified.push({ itemKey: k, oldItem, newItem: item, changes: itemChanges });
                                }
                              }
                            });

                            oldArr.forEach(item => {
                              const k = String(item[idKey] || item.id || item.name || item.desc || '');
                              if (!newMap.has(k)) {
                                removed.push(item);
                              }
                            });

                            return { idKey, added, removed, modified };
                          };

                          return (
                            <div className="space-y-4">
                              {/* Side-by-Side Banner Headers */}
                              <div className="grid grid-cols-2 gap-3 text-2xs font-extrabold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 pb-2">
                                <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-3 py-1.5 rounded-xl border border-rose-200/60 dark:border-rose-900/50">
                                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                                  <span>Current State (Live Baseline)</span>
                                </div>
                                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-200/60 dark:border-emerald-900/50">
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                  <span>Requested Changes (Submitted Draft)</span>
                                </div>
                              </div>

                              {/* Primitive Core Fields Side-by-Side Table */}
                              {primitiveFields.length > 0 && (
                                <div className="space-y-1.5">
                                  <div className="text-2xs font-extrabold text-slate-400 uppercase tracking-wide">Core Metadata & Specifications</div>
                                  <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-150 dark:divide-slate-800/80 bg-white dark:bg-slate-900/50">
                                    {primitiveFields.map(f => {
                                      const formattedOld = formatValDisplay(f.key, f.oldVal);
                                      const formattedNew = formatValDisplay(f.key, f.newVal);
                                      return (
                                        <div key={f.key} className="grid grid-cols-1 md:grid-cols-12 text-2xs p-2.5 items-center gap-2 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition">
                                          <div className="md:col-span-4 font-bold text-slate-700 dark:text-slate-300">
                                            {f.label}
                                          </div>
                                          <div className="md:col-span-4 p-1.5 bg-rose-50/60 dark:bg-rose-950/20 rounded-lg border border-rose-200/40 dark:border-rose-900/30 text-rose-800 dark:text-rose-300 font-medium">
                                            <span className="line-through opacity-80">{formattedOld}</span>
                                          </div>
                                          <div className="md:col-span-4 p-1.5 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-lg border border-emerald-200/50 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-bold">
                                            <span>{formattedNew}</span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* Array Complex Collections Side-by-Side comparison */}
                              {arrayFields.map(f => {
                                const diff = computeArrayDiff(f.key, f.oldVal, f.newVal);
                                return (
                                  <div key={f.key} className="space-y-2 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 bg-slate-50/40 dark:bg-slate-900/30">
                                    <div className="flex justify-between items-center text-2xs border-b border-slate-200 dark:border-slate-800 pb-1.5 font-bold">
                                      <span className="text-slate-800 dark:text-slate-200 uppercase tracking-wide">{f.label}</span>
                                      <span className="text-slate-400 font-medium text-[9px]">
                                        {diff.added.length} added • {diff.removed.length} removed • {diff.modified.length} modified
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-2xs">
                                      {/* Left Column: Current Baseline Items */}
                                      <div className="space-y-1.5 bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-rose-100 dark:border-rose-950/40">
                                        <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 border-b pb-1">Current State ({f.oldVal.length} items)</div>
                                        {f.oldVal.length === 0 ? (
                                          <p className="text-slate-400 italic text-[10px]">No baseline items</p>
                                        ) : (
                                          f.oldVal.map((item, idx) => {
                                            const label = item[diff.idKey] || item.name || item.desc || item.item || `Item #${idx + 1}`;
                                            const isRemoved = diff.removed.some(r => String(r[diff.idKey] || r.name || r.desc) === String(label));
                                            const isMod = diff.modified.some(m => String(m.itemKey) === String(label));
                                            return (
                                              <div key={idx} className={`p-2 rounded-lg border text-[10px] space-y-0.5 ${isRemoved ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300 line-through' : isMod ? 'bg-amber-50/50 border-amber-200 text-slate-700 dark:bg-amber-950/20 dark:border-amber-900/40 dark:text-slate-300' : 'bg-slate-50 border-slate-150 text-slate-700 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-300'}`}>
                                                <div className="font-bold flex justify-between">
                                                  <span>{String(label)}</span>
                                                  {isRemoved && <span className="no-underline text-2xs font-extrabold text-rose-600">REMOVED IN DRAFT</span>}
                                                  {isMod && <span className="text-2xs font-bold text-amber-600">MODIFIED IN DRAFT</span>}
                                                </div>
                                                <div className="text-[9px] text-slate-500 font-normal truncate">
                                                  {Object.keys(item).filter(k => k !== 'id' && k !== diff.idKey && typeof item[k] !== 'object').map(k => `${k}: ${item[k]}`).slice(0, 4).join(' • ')}
                                                </div>
                                              </div>
                                            );
                                          })
                                        )}
                                      </div>

                                      {/* Right Column: Requested Changes Items */}
                                      <div className="space-y-1.5 bg-white dark:bg-slate-950 p-2.5 rounded-xl border border-emerald-100 dark:border-emerald-950/40">
                                        <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 border-b pb-1">Requested Changes ({f.newVal.length} items)</div>
                                        {f.newVal.length === 0 ? (
                                          <p className="text-slate-400 italic text-[10px]">No items in requested draft</p>
                                        ) : (
                                          f.newVal.map((item, idx) => {
                                            const label = item[diff.idKey] || item.name || item.desc || item.item || `Item #${idx + 1}`;
                                            const isAdded = diff.added.some(aItem => String(aItem[diff.idKey] || aItem.name || aItem.desc) === String(label));
                                            const modObj = diff.modified.find(m => String(m.itemKey) === String(label));

                                            return (
                                              <div key={idx} className={`p-2 rounded-lg border text-[10px] space-y-1 ${isAdded ? 'bg-emerald-50 border-emerald-200 text-emerald-900 dark:bg-emerald-950/40 dark:border-emerald-900/60 dark:text-emerald-300' : modObj ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/50' : 'bg-slate-50 border-slate-150 text-slate-700 dark:bg-slate-900/50 dark:border-slate-800 dark:text-slate-300'}`}>
                                                <div className="font-bold flex justify-between items-center">
                                                  <span>{String(label)}</span>
                                                  {isAdded && <span className="bg-emerald-600 text-white text-[9px] px-1.5 py-0.2 rounded font-extrabold">+ ADDED</span>}
                                                  {modObj && <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.2 rounded font-extrabold">EDITED</span>}
                                                </div>
                                                {modObj && (
                                                  <div className="pl-2 border-l-2 border-amber-400 space-y-0.5 text-[9px]">
                                                    {modObj.changes.map((ch, ci) => (
                                                      <div key={ci} className="flex items-center gap-1 flex-wrap">
                                                        <span className="font-bold text-slate-500">{ch.prop}:</span>
                                                        <span className="line-through text-rose-600">{String(ch.old)}</span>
                                                        <span>➔</span>
                                                        <span className="font-bold text-emerald-600">{String(ch.new)}</span>
                                                      </div>
                                                    ))}
                                                  </div>
                                                )}
                                                {!modObj && (
                                                  <div className="text-[9px] text-slate-500 font-normal truncate">
                                                    {Object.keys(item).filter(k => k !== 'id' && k !== diff.idKey && typeof item[k] !== 'object').map(k => `${k}: ${item[k]}`).slice(0, 4).join(' • ')}
                                                  </div>
                                                )}
                                              </div>
                                            );
                                          })
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }

                        // Summary Diff view mode fallback
                        const changes: {field: string, old: any, new: any}[] = [];
                        const keys = new Set([...Object.keys(originalProject), ...Object.keys(a.snapshotData || {})]);
                        keys.forEach(k => {
                          if (k.startsWith('_') || k === 'lastModifiedBy' || k === 'lastModifiedAt' || k === 'lastModifiedSection' || k === 'approvedBy' || k === 'approvedAt' || k === 'approverRole' || k === 'id') return;
                          
                          const oldValStr = JSON.stringify((originalProject as any)[k]);
                          const newValStr = JSON.stringify(a.snapshotData[k]);
                          
                          if (oldValStr !== newValStr) {
                             changes.push({ field: k, old: (originalProject as any)[k], new: a.snapshotData[k] });
                          }
                        });
                        
                        if (changes.length === 0) {
                          return <p className="text-slate-500 italic font-bold">No material changes detected.</p>;
                        }

                        const renderHumanReadableDiff = (field: string, oldVal: any, newVal: any) => {
                          const displayName = formatFieldName(field);

                          // Primitive values comparison
                          if (typeof oldVal !== 'object' && typeof newVal !== 'object') {
                            const oldDisplay = formatValDisplay(field, oldVal);
                            const newDisplay = formatValDisplay(field, newVal);

                            return (
                              <div className="flex flex-col gap-1 p-2 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                <span className="font-extrabold text-slate-700 dark:text-slate-350 text-[10px]">{displayName}</span>
                                <div className="flex items-center gap-1.5 flex-wrap text-2xs font-medium">
                                  <span className="text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-1.5 py-0.5 rounded border border-rose-200/50 line-through">{oldDisplay}</span>
                                  <span className="text-slate-400">➔</span>
                                  <span className="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded border border-emerald-200/50 font-bold">{newDisplay}</span>
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div className="p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-1">
                              <div className="font-bold text-slate-700 dark:text-slate-300 text-[10px] uppercase tracking-wide border-b border-slate-200 dark:border-slate-800 pb-1">
                                {displayName} (Updated Collection Data)
                              </div>
                              <div className="text-2xs font-medium text-slate-500">
                                Detailed sector array modified. Switch to <strong>Side-by-Side Comparison</strong> tab above for dual-column item breakdown.
                              </div>
                            </div>
                          );
                        };

                        return (
                          <div className="space-y-3">
                            <div className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide text-2xs">Changes summary:</div>
                            {changes.map((c, i) => {
                              const rendered = renderHumanReadableDiff(c.field, c.old, c.new);
                              return rendered ? <div key={i}>{rendered}</div> : null;
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              ))}

              {pendingApprovals.filter(a => a.status === 'pending' && canUserApproveRequest(currentUserObj, a, projects)).length === 0 && (
                <div className="text-center py-10 text-slate-400 font-medium text-xs">
                  No pending interim variance requests awaiting signature.
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Real-Time Immediate New User Registration Approval Pop-Up Modal */}
      <AnimatePresence>
        {isMasterAdmin && pendingUserPopups.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-slate-850 border-2 border-amber-500/80 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden relative space-y-0"
            >
              {/* Animated Header */}
              <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 p-5 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shrink-0 animate-bounce">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest bg-black/20 px-2 py-0.5 rounded-full border border-white/20 inline-block mb-0.5">
                      🔔 REAL-TIME APPROVAL REQUEST
                    </span>
                    <h3 className="text-base font-black tracking-tight leading-none">
                      New User Registration Received!
                    </h3>
                  </div>
                </div>
                <span className="bg-white text-amber-700 text-xs font-black px-2.5 py-1 rounded-full border shadow-xs">
                  {pendingUserPopups.length} Pending
                </span>
              </div>

              {/* Modal Body */}
              {(() => {
                const activePending = pendingUserPopups[0];
                if (!activePending) return null;

                return (
                  <div className="p-6 space-y-5">
                    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-white dark:bg-slate-800 border-2 border-amber-400 rounded-full flex items-center justify-center text-amber-600 font-black text-lg shadow-sm">
                          👤
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-slate-900 dark:text-white">
                            {activePending.username}
                          </h4>
                          <p className="text-2xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1 mt-0.5">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
                            Status: Pending Admin Activation
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 uppercase">
                        Role: {activePending.role || 'editor'}
                      </span>
                    </div>

                    {/* Role Selector */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block uppercase tracking-wider">
                        Assign Role for Network Access:
                      </label>
                      <select
                        id={`popup-role-${activePending.username}`}
                        defaultValue={activePending.role || 'editor'}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-amber-500"
                      >
                        <option value="editor">✏️ Editor (View & Submit Contract Updates)</option>
                        <option value="viewer">👁️ Viewer (Read Only Access)</option>
                        <option value="approver">Approver (Review & Approve Drafts)</option>
                        <option value="directorate_admin">Directorate Admin</option>
                        <option value="pmo_admin">PMO Admin</option>
                        <option value="admin">⭐ Master Admin (Full System Control)</option>
                      </select>
                    </div>

                    {/* Contracts Checklist */}
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex justify-between items-center uppercase tracking-wider">
                        <span>Assign Accessible Contracts:</span>
                        <span className="text-[10px] text-slate-400 font-normal normal-case">
                          ({projects.length} Total Contracts Available)
                        </span>
                      </label>
                      <div className="max-h-36 overflow-y-auto border border-slate-200 dark:border-slate-700/80 rounded-2xl p-2.5 bg-slate-50/50 dark:bg-slate-900/50 space-y-1">
                        <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 pb-1 border-b border-slate-200 dark:border-slate-800">
                          ✓ All contracts accessible automatically for Admin role
                        </div>
                        {projects.map(proj => (
                          <label key={proj.id} className="flex items-center gap-2 text-xs font-semibold p-1.5 hover:bg-white dark:hover:bg-slate-800 rounded-lg cursor-pointer transition">
                            <input
                              type="checkbox"
                              defaultChecked={true}
                              data-project-id={proj.id}
                              className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 accent-amber-500"
                            />
                            <span className="truncate text-slate-800 dark:text-slate-200 font-bold">{proj.name}</span>
                            <span className="text-[9px] text-slate-400 ml-auto font-mono">({proj.id})</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          const roleSelect = document.getElementById(`popup-role-${activePending.username}`) as HTMLSelectElement;
                          const selectedRole = roleSelect ? roleSelect.value : (activePending.role || 'editor');
                          
                          const checkboxes = document.querySelectorAll(`input[data-project-id]`) as NodeListOf<HTMLInputElement>;
                          const checkedProjectIds: string[] = [];
                          checkboxes.forEach(cb => {
                            const pid = cb.getAttribute('data-project-id');
                            if (cb.checked && pid) checkedProjectIds.push(pid);
                          });

                          handleApproveUserPopup(activePending, selectedRole, checkedProjectIds);
                        }}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        <CheckCircle className="w-4 h-4" />
                        Approve User Now
                      </button>

                      <button
                        type="button"
                        onClick={() => handleConfigureUserPopup(activePending)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 rounded-2xl text-xs uppercase tracking-wider shadow-md transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Configure in Admin
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRejectUserPopup(activePending)}
                        className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-extrabold py-2.5 rounded-2xl text-xs uppercase transition border border-rose-200 dark:border-rose-900/40 cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Reject Request
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDismissUserPopup(activePending)}
                        className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-extrabold py-2.5 rounded-2xl text-xs uppercase transition cursor-pointer text-center"
                      >
                        Dismiss / Later
                      </button>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive User Guide Manual Modal */}
      <UserGuideManualModal 
        isOpen={isUserGuideOpen}
        onClose={() => setIsUserGuideOpen(false)}
      />

    </div>
  );
}
