import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, Plus, ArrowRight, Clock, AlertTriangle, CheckCircle, Trash2,
  UserCheck, History, Printer, Search, Filter, RefreshCw, Layers, ShieldAlert, Edit2, ChevronRight, Download, FileSpreadsheet, FileCheck,
  TrendingUp, AlertOctagon, SlidersHorizontal, X, Calendar, Zap, CheckCircle2, BarChart3, BookOpen, Sparkles, User as UserIcon, MessageSquare, PenTool
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, AreaChart, Area 
} from 'recharts';
import { Project, IssueLogItem, IssueTransferRecord, IssueHistoryRecord, User, formatAccounting } from '../types';

interface IssueLogViewProps {
  project: Project;
  onProjectUpdate?: (updates: Partial<Project>, logMessage?: string) => void;
  isAdmin?: boolean;
  currentUserObj?: User | null;
}

const defaultSampleIssues: IssueLogItem[] = [
  {
    id: 'iss-1',
    issueCode: 'ERA-ISS-2026-001',
    title: 'Uncleared Right of Way (ROW) Obstruction at Ch 24+500 - Ch 31+200',
    category: 'Right of Way (ROW)',
    submittedDate: '2025-11-14',
    submittedBy: 'Contractor (China Communications Construction Co.)',
    submittedTo: 'Consultant Resident Engineer (Net Consulting Engineers)',
    clauseReference: 'FIDIC Sub-Clause 2.1 (Right of Access) & 8.4 (Extension of Time)',
    initialDescription: 'Contractor requested urgent possession of site between Ch 24+500 and Ch 31+200. High-voltage electric poles and 42 residential structures remain uncompensated and uncleared, completely halting subgrade excavation work.',
    financialImpactEtb: 14250000,
    timeImpactDays: 65,
    priority: 'Critical',
    currentStatus: 'Transferred / Escalated',
    currentStage: 'Stage 3: Directorate & Regional Authority Handover',
    latestProgressSummary: 'Consultant RE completed delay impact analysis confirming 48 critical path days lost. Issue was transferred from Resident Engineer team to ERA Central ROW Directorate and Local Woreda Administration for compensation disbursement.',
    currentBottleneck: 'Awaiting local Woreda compensation committee bank clearance and Ethio Telecom pole relocation schedule.',
    lessonsLearned: 'Right-of-Way valuation and utility relocation clearance with local Woreda administration must be finalized prior to issuing Site Access under FIDIC Clause 2.1. Establishing a joint ERA-Woreda taskforce reduced valuation dispute cycle time by 60%.',
    lessonsLearnedUpdatedBy: 'Eng. Solomon Tadesse (Senior RE)',
    lessonsLearnedUpdatedAt: '2026-02-20 14:30',
    history: [
      {
        id: 'hist-1',
        timestamp: '2025-11-14 09:30',
        user: 'Contractor (CCCC)',
        previousStatus: 'None',
        newStatus: 'Submitted / Under Review',
        stage: 'Stage 1: Initial Submission & Site Verification',
        changeType: 'Creation',
        notes: 'Initial ROW obstruction claim logged for Ch 24+500 - Ch 31+200.'
      },
      {
        id: 'hist-2',
        timestamp: '2025-12-02 14:15',
        user: 'Eng. Solomon Tadesse (Senior RE)',
        previousStatus: 'Submitted / Under Review',
        newStatus: 'Transferred / Escalated',
        stage: 'Stage 3: Directorate & Regional Authority Handover',
        changeType: 'Transfer Handover',
        notes: 'Transferred to ERA Regional Directorate due to compensation amount exceeding site-level threshold.'
      },
      {
        id: 'hist-3',
        timestamp: '2026-02-18 11:45',
        user: 'Ato Kassahun Worku (Directorate Director)',
        previousStatus: 'Transferred / Escalated',
        newStatus: 'Transferred / Escalated',
        stage: 'Stage 3: ERA Contractual Claims & Steering Committee',
        changeType: 'Transfer Handover',
        notes: 'Notice of intention to claim evaluated. Interim EOT recommendation submitted to Steering Committee.'
      }
    ],
    transfers: [
      {
        id: 'tr-1',
        transferDate: '2025-12-02',
        transferredFrom: 'Consultant Resident Engineer (Site Team)',
        transferredTo: 'ERA Regional Directorate & ROW Valuation Team',
        transferReason: 'Local compensation negotiations exceeded site-level delegated authority limit (>5 Million ETB).',
        actionTakenByPreviousTeam: 'Issued formal site verification report confirming 6.7 Km obstruction; verified contractor equipment idle hours and established baseline critical path impact.',
        recommendedCourseOfAction: 'Release emergency compensation funds to Woreda account and issue formal request to Ethiopian Electric Utility (EEU) for immediate high-voltage line relocation.',
        transferredBy: 'Eng. Solomon Tadesse (Senior RE)'
      },
      {
        id: 'tr-2',
        transferDate: '2026-02-18',
        transferredFrom: 'ERA Regional Directorate',
        transferredTo: 'ERA Contractual Claims & Steering Committee',
        transferReason: 'Contractor submitted formal Notice of Intention to Claim for EOT (65 days) and Standby Cost (14.25M ETB).',
        actionTakenByPreviousTeam: 'Facilitated partial compensation payment for 28 PAPs (3.4 Km cleared). Handed over remaining dispute & claim evaluation to Steering Committee.',
        recommendedCourseOfAction: 'Review interim EOT grant of 35 days under FIDIC Clause 8.4 and approve EEU utility relocation budget authorization.',
        transferredBy: 'Ato Kassahun Worku (Directorate Director)'
      }
    ]
  },
  {
    id: 'iss-2',
    issueCode: 'ERA-ISS-2026-002',
    title: 'Foreign Exchange Allocation Delay for Bitumen & Spare Parts Import',
    category: 'Financial/Payment',
    submittedDate: '2026-01-10',
    submittedBy: 'Contractor (Sur Construction PLC)',
    submittedTo: 'Employer (Ethiopian Roads Administration - PMO)',
    clauseReference: 'FIDIC Sub-Clause 14.8 (Payment & FX Allocation)',
    initialDescription: 'Contractor submitted request for USD foreign currency allocation certificate for $1.8M USD to open Letter of Credit (LC) for 3,200 MT 60/70 Penetration Grade Bitumen.',
    financialImpactEtb: 0,
    timeImpactDays: 45,
    priority: 'High',
    currentStatus: 'In Progress / Evaluation',
    currentStage: 'Stage 2: Ministry of Finance & National Bank Review',
    latestProgressSummary: 'ERA Finance Directorate reviewed certification against IPC foreign currency ratio. Recommendation sent to National Bank of Ethiopia (NBE) for prioritized Forex release.',
    currentBottleneck: 'National Bank FX queue priority listing.',
    lessonsLearned: 'Centralizing foreign exchange allocation requests with National Bank under specialized infrastructure import quotas prevents asphalt supply chain stoppages during peak dry construction season.',
    lessonsLearnedUpdatedBy: 'W/ro Bethlehem Girma (Senior Finance Officer)',
    lessonsLearnedUpdatedAt: '2026-01-30 10:20',
    history: [
      {
        id: 'hist-201',
        timestamp: '2026-01-10 10:15',
        user: 'Contractor (Sur Construction PLC)',
        previousStatus: 'None',
        newStatus: 'Submitted / Under Review',
        stage: 'Stage 1: Initial Submission',
        changeType: 'Creation',
        notes: 'Forex allocation application submitted for 3,200 MT Bitumen.'
      },
      {
        id: 'hist-202',
        timestamp: '2026-01-28 16:20',
        user: 'W/ro Bethlehem Girma (Senior Finance Officer)',
        previousStatus: 'Submitted / Under Review',
        newStatus: 'In Progress / Evaluation',
        stage: 'Stage 2: Ministry of Finance & National Bank Review',
        changeType: 'Status Change',
        notes: 'Audited past bitumen utilization; verified LC documentation and forwarded to National Bank.'
      }
    ],
    transfers: [
      {
        id: 'tr-1',
        transferDate: '2026-01-28',
        transferredFrom: 'ERA Finance & Procurement Directorate',
        transferredTo: 'National Bank of Ethiopia & Ministry of Finance',
        transferReason: 'FX allocation requires NBE central bank approval for priority infrastructure projects.',
        actionTakenByPreviousTeam: 'Verified contractor LC documentation, audited past bitumen utilization, and certified project priority status.',
        recommendedCourseOfAction: 'Authorize special FX allocation batch under ERA priority infrastructure window.',
        transferredBy: 'W/ro Bethlehem Girma (Senior Finance Officer)'
      }
    ]
  },
  {
    id: 'iss-3',
    issueCode: 'ERA-ISS-2025-003',
    title: 'Design Variation & Geotechnical Subsurface Soft Soil at Bridge Abutment Ch 48+200',
    category: 'Technical/Design',
    submittedDate: '2025-10-18',
    submittedBy: 'Consultant Resident Engineer',
    submittedTo: 'ERA Bridge & Structure Design Directorate',
    clauseReference: 'FIDIC Sub-Clause 4.12 (Unforeseeable Physical Conditions)',
    initialDescription: 'Trial pit soil borings revealed highly expansive clay and soft organic soil down to 14 meters depth, contradicting original tender borehole logs. Deep foundation piling design required.',
    financialImpactEtb: 22800000,
    timeImpactDays: 90,
    priority: 'Critical',
    currentStatus: 'Submitted / Under Review',
    currentStage: 'Stage 1: Initial Submission & Geotechnical Soil Investigation Review',
    latestProgressSummary: 'Design review panel requested supplemental bored pile load tests and updated structural calculations from lead consultant.',
    currentBottleneck: 'Pending approval of revised bored pile foundation design drawing package from ERA Design Review Directorate.',
    history: [
      {
        id: 'hist-301',
        timestamp: '2025-10-18 11:00',
        user: 'Consultant Resident Engineer',
        previousStatus: 'None',
        newStatus: 'Submitted / Under Review',
        stage: 'Stage 1: Initial Submission',
        changeType: 'Creation',
        notes: 'Unforeseeable soft soil condition report submitted.'
      }
    ],
    transfers: []
  },
  {
    id: 'iss-4',
    issueCode: 'ERA-ISS-2025-004',
    title: 'Subbase Aggregate Quarry Abrasion Test Clearance Delay',
    category: 'Material Testing',
    submittedDate: '2025-12-05',
    submittedBy: 'Contractor (Sunshine Construction PLC)',
    submittedTo: 'Consultant Materials Engineer',
    clauseReference: 'FIDIC Sub-Clause 7.3 (Inspection & Testing)',
    initialDescription: 'Quarry site #3 Los Angeles Abrasion and Aggregate Crushing Value (ACV) samples sent to Central ERA Laboratory. Approval delayed beyond 21 days.',
    financialImpactEtb: 1800000,
    timeImpactDays: 14,
    priority: 'Medium',
    currentStatus: 'Resolved / Approved',
    currentStage: 'Stage 4: Approval Issued & Quarry Operation Cleared',
    latestProgressSummary: 'Central Lab released certified test certificate confirming LA Abrasion value of 26.4% (under 30% limit). Resident Engineer issued formal quarry clearance.',
    currentBottleneck: 'Resolved - No active bottleneck.',
    lessonsLearned: 'Establishing accredited mobile site testing facilities or expedited central lab service level agreements prevents quarry testing bottlenecks that impact subbase production schedules.',
    lessonsLearnedUpdatedBy: 'Ato Abebe Tessema (Materials Engineer)',
    lessonsLearnedUpdatedAt: '2025-12-28 11:00',
    history: [
      {
        id: 'hist-401',
        timestamp: '2025-12-05 08:45',
        user: 'Contractor (Sunshine Construction PLC)',
        previousStatus: 'None',
        newStatus: 'Submitted / Under Review',
        stage: 'Stage 1: Sample Collection',
        changeType: 'Creation',
        notes: 'Aggregate samples dispatched to ERA Central Laboratory.'
      },
      {
        id: 'hist-402',
        timestamp: '2025-12-26 15:10',
        user: 'Central ERA Laboratory',
        previousStatus: 'Submitted / Under Review',
        newStatus: 'Resolved / Approved',
        stage: 'Stage 4: Approval Issued & Quarry Operation Cleared',
        changeType: 'Status Change',
        notes: 'LA Abrasion certified at 26.4%. Quarry #3 officially cleared for subbase processing.'
      }
    ],
    transfers: []
  },
  {
    id: 'iss-5',
    issueCode: 'ERA-ISS-2026-005',
    title: 'IPC #14 Advance Payment Disbursement Delay beyond 56 Calendar Days',
    category: 'Financial/Payment',
    submittedDate: '2026-02-01',
    submittedBy: 'Contractor',
    submittedTo: 'ERA Finance Directorate',
    clauseReference: 'FIDIC Sub-Clause 14.7 (Payment Obligations)',
    initialDescription: 'Interim Payment Certificate #14 amounting to 38.6M ETB certified by RE on Dec 12, 2025 remains unpaid past the 56-day statutory payment window, incurring financing charges under Sub-Clause 14.8.',
    financialImpactEtb: 38600000,
    timeImpactDays: 28,
    priority: 'High',
    currentStatus: 'Submitted / Under Review',
    currentStage: 'Stage 1: Initial Payment Audit & Treasury Release',
    latestProgressSummary: 'Audit verified certificate calculations. Treasury transfer queue currently processing budget disbursement batch.',
    currentBottleneck: 'Awaiting Ministry of Finance quarterly budget release transfer to ERA project account.',
    history: [
      {
        id: 'hist-501',
        timestamp: '2026-02-01 14:00',
        user: 'Contractor',
        previousStatus: 'None',
        newStatus: 'Submitted / Under Review',
        stage: 'Stage 1: Payment Audit',
        changeType: 'Creation',
        notes: 'Payment delay notification submitted under FIDIC 14.7.'
      }
    ],
    transfers: []
  },
  {
    id: 'iss-6',
    issueCode: 'ERA-ISS-2026-006',
    title: 'Environmental Dust Suppression Non-Compliance Notice at Town Section Ch 12+000',
    category: 'Environmental/Safety',
    submittedDate: '2026-03-12',
    submittedBy: 'Consultant Environmental Specialist',
    submittedTo: 'Contractor Project Manager',
    clauseReference: 'FIDIC Sub-Clause 4.18 (Protection of Environment)',
    initialDescription: 'Excessive fugitive dust emissions in Alem Gena town section during subbase compaction. Local community submitted formal petition to Woreda Environmental Protection Office.',
    financialImpactEtb: 450000,
    timeImpactDays: 0,
    priority: 'Low',
    currentStatus: 'In Progress / Evaluation',
    currentStage: 'Stage 2: Corrective Action Implementation',
    latestProgressSummary: 'Contractor deployed two additional 15,000L water bowsers and scheduled twice-daily dust suppression sprays along town corridor.',
    currentBottleneck: 'Monitoring dust levels to verify full compliance ahead of Woreda inspection.',
    history: [
      {
        id: 'hist-601',
        timestamp: '2026-03-12 16:30',
        user: 'Consultant Environmental Specialist',
        previousStatus: 'None',
        newStatus: 'In Progress / Evaluation',
        stage: 'Stage 2: Corrective Action Implementation',
        changeType: 'Creation',
        notes: 'Dust suppression non-compliance notice logged.'
      }
    ],
    transfers: []
  }
];

export interface DeptTimeRecord {
  department: string;
  startDate: string;
  endDate: string;
  daysTaken: number;
  status: 'Transferred' | 'Active' | 'Resolved / Closed';
}

export function getDepartmentTimeRecords(item: IssueLogItem): DeptTimeRecord[] {
  if (!item) return [];

  const records: DeptTimeRecord[] = [];
  const todayStr = new Date().toISOString().split('T')[0];
  const isClosed = (item.currentStatus || '').toLowerCase().includes('resolved') || 
                   (item.currentStatus || '').toLowerCase().includes('approved') || 
                   (item.currentStatus || '').toLowerCase().includes('rejected') || 
                   (item.currentStatus || '').toLowerCase().includes('closed');

  const parseDate = (dStr: string) => {
    if (!dStr) return new Date();
    const parts = dStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? new Date() : d;
  };

  const getDiffDays = (startStr: string, endStr: string) => {
    const start = parseDate(startStr);
    const end = parseDate(endStr);
    const diff = Math.max(0, end.getTime() - start.getTime());
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const initialDept = (item.transfers && item.transfers.length > 0)
    ? (item.transfers[0].transferredFrom || item.submittedTo || 'Initial Reviewing Authority')
    : (item.submittedTo || 'Initial Reviewing Authority');
  const initialStartDate = item.submittedDate || todayStr;

  if (!item.transfers || item.transfers.length === 0) {
    const endDate = todayStr;
    const days = getDiffDays(initialStartDate, endDate);
    records.push({
      department: initialDept,
      startDate: initialStartDate,
      endDate: isClosed ? 'Resolution Date' : endDate,
      daysTaken: days,
      status: isClosed ? 'Resolved / Closed' : 'Active'
    });
  } else {
    // 1st department: from submittedDate to 1st transfer date
    const dept1EndDate = item.transfers[0].transferDate || initialStartDate;
    const dept1Days = getDiffDays(initialStartDate, dept1EndDate);
    records.push({
      department: initialDept,
      startDate: initialStartDate,
      endDate: dept1EndDate,
      daysTaken: dept1Days,
      status: 'Transferred'
    });

    // Subsequent departments
    for (let i = 0; i < item.transfers.length; i++) {
      const tr = item.transfers[i];
      const deptName = tr.transferredTo || `Department #${i + 2}`;
      const startDate = tr.transferDate || initialStartDate;

      let endDate = todayStr;
      let status: 'Transferred' | 'Active' | 'Resolved / Closed' = 'Transferred';

      if (i < item.transfers.length - 1) {
        endDate = item.transfers[i + 1].transferDate || startDate;
        status = 'Transferred';
      } else {
        endDate = todayStr;
        status = isClosed ? 'Resolved / Closed' : 'Active';
      }

      const days = getDiffDays(startDate, endDate);
      records.push({
        department: deptName,
        startDate: startDate,
        endDate: isClosed && i === item.transfers.length - 1 ? 'Resolution Date' : endDate,
        daysTaken: days,
        status: status
      });
    }
  }

  return records;
}

export default function IssueLogView({ project, onProjectUpdate, isAdmin, currentUserObj }: IssueLogViewProps) {
  const issuesList = (project.issues && project.issues.length > 0) ? project.issues : defaultSampleIssues;

  const currentUsername = currentUserObj?.username || 'ErsidoAbayneh@gmail.com';

  const [selectedIssueId, setSelectedIssueId] = useState<string>(issuesList[0]?.id || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [pendingDaysThreshold, setPendingDaysThreshold] = useState<number>(14);
  const [showTrendChart, setShowTrendChart] = useState<boolean>(true);
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');
  
  // Modals state
  const [showNewIssueModal, setShowNewIssueModal] = useState(false);
  const [urgentNotificationFlag, setUrgentNotificationFlag] = useState<{ issueCode: string; title: string; priority: string } | null>(null);
  const [showAddTransferModal, setShowAddTransferModal] = useState(false);
  const [showEditIssueModal, setShowEditIssueModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveSearchQuery, setArchiveSearchQuery] = useState('');

  // Lessons Learned & History Note Modals State
  const [showLessonsModal, setShowLessonsModal] = useState(false);
  const [lessonsInput, setLessonsInput] = useState('');
  const [reviewNotesInput, setReviewNotesInput] = useState('');

  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyNoteInput, setHistoryNoteInput] = useState('');
  const [historyNewStatusInput, setHistoryNewStatusInput] = useState<string>('');

  const selectedIssue = issuesList.find(i => i.id === selectedIssueId) || issuesList[0];

  React.useEffect(() => {
    if (selectedIssue) {
      setLessonsInput(selectedIssue.lessonsLearned || '');
      setReviewNotesInput(selectedIssue.reviewNotes || '');
    }
  }, [selectedIssueId, selectedIssue?.lessonsLearned, selectedIssue?.reviewNotes]);

  // Pending days and threshold calculation helpers
  const calculateDaysPending = (submittedDate: string) => {
    if (!submittedDate) return 0;
    const sub = new Date(submittedDate);
    const now = new Date();
    const diffTime = Math.max(0, now.getTime() - sub.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  };

  const isPendingStatus = (status: string) => {
    const s = (status || '').toLowerCase();
    return !s.includes('resolved') && !s.includes('approved') && !s.includes('rejected');
  };

  const isOverduePending = (item: IssueLogItem, threshold: number) => {
    return isPendingStatus(item.currentStatus) && calculateDaysPending(item.submittedDate) >= threshold;
  };

  // Trend Data for Visual Analysis Chart
  const trendData = React.useMemo(() => {
    const monthsMap: Record<string, { monthKey: string; monthLabel: string; Critical: number; High: number; Medium: number; Low: number; Total: number }> = {};

    issuesList.forEach(item => {
      if (!item.submittedDate) return;
      const d = new Date(item.submittedDate);
      if (isNaN(d.getTime())) return;

      const year = d.getFullYear();
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');
      const key = `${year}-${monthNum}`;
      const monthName = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      if (!monthsMap[key]) {
        monthsMap[key] = {
          monthKey: key,
          monthLabel: monthName,
          Critical: 0,
          High: 0,
          Medium: 0,
          Low: 0,
          Total: 0
        };
      }

      const p = item.priority || 'Medium';
      if (p === 'Critical') monthsMap[key].Critical += 1;
      else if (p === 'High') monthsMap[key].High += 1;
      else if (p === 'Medium') monthsMap[key].Medium += 1;
      else if (p === 'Low') monthsMap[key].Low += 1;

      monthsMap[key].Total += 1;
    });

    return Object.values(monthsMap).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [issuesList]);

  const peakMonth = React.useMemo(() => {
    if (!trendData.length) return { monthLabel: 'N/A', Total: 0 };
    return trendData.reduce((prev, curr) => (curr.Total > prev.Total ? curr : prev), trendData[0]);
  }, [trendData]);

  const criticalAndHighPercentage = React.useMemo(() => {
    if (!issuesList.length) return 0;
    const severeCount = issuesList.filter(i => i.priority === 'Critical' || i.priority === 'High').length;
    return Math.round((severeCount / issuesList.length) * 100);
  }, [issuesList]);

  const avgDaysPending = React.useMemo(() => {
    const pendingItems = issuesList.filter(i => isPendingStatus(i.currentStatus));
    if (!pendingItems.length) return 0;
    const totalDays = pendingItems.reduce((acc, curr) => acc + calculateDaysPending(curr.submittedDate), 0);
    return Math.round(totalDays / pendingItems.length);
  }, [issuesList]);

  // New Issue Form
  const [newIssue, setNewIssue] = useState<Partial<IssueLogItem>>({
    issueCode: `ERA-ISS-2026-${String(issuesList.length + 1).padStart(3, '0')}`,
    title: '',
    category: 'Contractual Claim',
    submittedDate: new Date().toISOString().split('T')[0],
    submittedBy: `${project.contractor || 'Contractor'}`,
    submittedTo: `${project.consultant || 'Consultant RE'}`,
    clauseReference: 'FIDIC Sub-Clause 20.1',
    initialDescription: '',
    financialImpactEtb: 0,
    timeImpactDays: 0,
    priority: 'High',
    currentStatus: 'Submitted / Under Review',
    currentStage: 'Stage 1: Initial Submission & Site Verification',
    latestProgressSummary: 'Issue submitted and currently undergoing verification by Consultant team.',
    currentBottleneck: 'Pending preliminary verification report.'
  });

  // New Transfer Form
  const [newTransfer, setNewTransfer] = useState<Partial<IssueTransferRecord>>({
    transferDate: new Date().toISOString().split('T')[0],
    transferredFrom: '',
    transferredTo: '',
    transferReason: '',
    actionTakenByPreviousTeam: '',
    recommendedCourseOfAction: '',
    transferredBy: ''
  });

  // Helper to persist updates to project
  const saveIssues = (updatedList: IssueLogItem[], msg: string) => {
    if (onProjectUpdate) {
      onProjectUpdate({ issues: updatedList }, msg);
    }
  };

  const handleDeleteIssue = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this issue?')) return;
    const updatedList = issuesList.filter(i => i.id !== id);
    saveIssues(updatedList, 'Issue deleted');
  };

  const handleCreateIssue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIssue.title) return;

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const initialStatus = newIssue.currentStatus || 'Submitted / Under Review';
    const initialStage = newIssue.currentStage || 'Stage 1: Initial Review';

    const created: IssueLogItem = {
      id: `iss-${Date.now()}`,
      issueCode: newIssue.issueCode || `ERA-ISS-2026-${String(issuesList.length + 1).padStart(3, '0')}`,
      title: newIssue.title,
      category: newIssue.category || 'Contractual Claim',
      submittedDate: newIssue.submittedDate || new Date().toISOString().split('T')[0],
      submittedBy: newIssue.submittedBy || 'Contractor',
      submittedTo: newIssue.submittedTo || 'Consultant RE',
      clauseReference: newIssue.clauseReference || '',
      initialDescription: newIssue.initialDescription || '',
      financialImpactEtb: Number(newIssue.financialImpactEtb) || 0,
      timeImpactDays: Number(newIssue.timeImpactDays) || 0,
      priority: newIssue.priority || 'High',
      currentStatus: initialStatus,
      currentStage: initialStage,
      latestProgressSummary: newIssue.latestProgressSummary || 'Submitted.',
      currentBottleneck: newIssue.currentBottleneck || '',
      history: [
        {
          id: `hist-${Date.now()}`,
          timestamp: nowStr,
          user: currentUsername,
          previousStatus: 'None',
          newStatus: initialStatus,
          stage: initialStage,
          changeType: 'Creation',
          notes: 'Initial issue entry registered in ERA system.'
        }
      ],
      transfers: []
    };

    const updated = [created, ...issuesList];
    saveIssues(updated, `New Issue Log entry created: ${created.issueCode}`);
    setSelectedIssueId(created.id);
    setShowNewIssueModal(false);

    // Trigger Admin Notification Flag for High or Critical priority issues
    if (created.priority === 'High' || created.priority === 'Critical') {
      setUrgentNotificationFlag({
        issueCode: created.issueCode,
        title: created.title,
        priority: created.priority
      });

      alert(`🚨 URGENT ADMIN NOTIFICATION TRIGGERED!\n\n` +
            `Attention Administrators:\n` +
            `A high-severity issue has been registered with priority '${created.priority}'.\n\n` +
            `• Issue Code: ${created.issueCode}\n` +
            `• Title: ${created.title}\n` +
            `• Priority: ${created.priority.toUpperCase()}\n` +
            `• Date Submitted: ${created.submittedDate}\n\n` +
            `An urgent notification flag has been dispatched in the system registry to alert project administrators immediately.`);
    }
  };

  const handleAddTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue || !newTransfer.transferredTo) return;

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const transferUser = newTransfer.transferredBy || currentUsername;

    const transferItem: IssueTransferRecord = {
      id: `tr-${Date.now()}`,
      transferDate: newTransfer.transferDate || new Date().toISOString().split('T')[0],
      transferredFrom: newTransfer.transferredFrom || 'Previous Reviewing Team',
      transferredTo: newTransfer.transferredTo,
      transferReason: newTransfer.transferReason || 'Escalated for higher approval authority',
      actionTakenByPreviousTeam: newTransfer.actionTakenByPreviousTeam || 'Reviewed preliminary claim and verified factual documentation.',
      recommendedCourseOfAction: newTransfer.recommendedCourseOfAction || 'Next course of action as recommended.',
      transferredBy: transferUser
    };

    const historyRecord: IssueHistoryRecord = {
      id: `hist-${Date.now()}`,
      timestamp: nowStr,
      user: transferUser,
      previousStatus: selectedIssue.currentStatus,
      newStatus: 'Transferred / Escalated',
      stage: `Transferred to: ${newTransfer.transferredTo}`,
      changeType: 'Transfer Handover',
      notes: `Transferred from [${newTransfer.transferredFrom || 'Previous Team'}] to [${newTransfer.transferredTo}]. Reason: ${newTransfer.transferReason || 'Escalated'}. Recommended Action: ${newTransfer.recommendedCourseOfAction || 'See transfer notes'}`
    };

    const updatedIssue: IssueLogItem = {
      ...selectedIssue,
      currentStatus: 'Transferred / Escalated',
      currentStage: `Transferred to: ${newTransfer.transferredTo}`,
      latestProgressSummary: `Issue transferred from [${transferItem.transferredFrom}] to [${transferItem.transferredTo}]. Recommended Course: ${transferItem.recommendedCourseOfAction}`,
      history: [historyRecord, ...(selectedIssue.history || [])],
      transfers: [...selectedIssue.transfers, transferItem]
    };

    const updatedList = issuesList.map(item => item.id === selectedIssue.id ? updatedIssue : item);
    saveIssues(updatedList, `Transfer record added to issue ${selectedIssue.issueCode}`);
    setShowAddTransferModal(false);
    
    // reset transfer form
    setNewTransfer({
      transferDate: new Date().toISOString().split('T')[0],
      transferredFrom: '',
      transferredTo: '',
      transferReason: '',
      actionTakenByPreviousTeam: '',
      recommendedCourseOfAction: '',
      transferredBy: ''
    });
  };

  const handleUpdateIssueDetails = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;

    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const historyRecord: IssueHistoryRecord = {
      id: `hist-${Date.now()}`,
      timestamp: nowStr,
      user: currentUsername,
      previousStatus: selectedIssue.currentStatus,
      newStatus: selectedIssue.currentStatus,
      stage: selectedIssue.currentStage,
      changeType: 'Details Edit',
      notes: `Issue details updated. Summary: ${selectedIssue.latestProgressSummary || 'Details revised'}`
    };

    const updatedIssueWithHistory: IssueLogItem = {
      ...selectedIssue,
      history: [historyRecord, ...(selectedIssue.history || [])]
    };

    const updatedList = issuesList.map(item => item.id === selectedIssue.id ? updatedIssueWithHistory : item);
    saveIssues(updatedList, `Issue ${selectedIssue.issueCode} details updated`);
    setShowEditIssueModal(false);
  };

  const handleSaveLessonsLearned = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);

    const historyRecord: IssueHistoryRecord = {
      id: `hist-${Date.now()}`,
      timestamp: nowStr,
      user: currentUsername,
      previousStatus: selectedIssue.currentStatus,
      newStatus: selectedIssue.currentStatus,
      stage: selectedIssue.currentStage,
      changeType: 'Lessons Learned Review',
      notes: `Lessons learned review recorded by ${currentUsername}.`
    };

    const updatedIssue: IssueLogItem = {
      ...selectedIssue,
      lessonsLearned: lessonsInput,
      reviewNotes: reviewNotesInput,
      lessonsLearnedUpdatedBy: currentUsername,
      lessonsLearnedUpdatedAt: nowStr,
      history: [historyRecord, ...(selectedIssue.history || [])]
    };

    const updatedList = issuesList.map(item => item.id === selectedIssue.id ? updatedIssue : item);
    saveIssues(updatedList, `Lessons learned updated for issue ${selectedIssue.issueCode}`);
    setShowLessonsModal(false);
  };

  const handleAddManualHistoryNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue || !historyNoteInput) return;
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 16);
    const targetStatus = (historyNewStatusInput || selectedIssue.currentStatus) as IssueLogItem['currentStatus'];

    const historyRecord: IssueHistoryRecord = {
      id: `hist-${Date.now()}`,
      timestamp: nowStr,
      user: currentUsername,
      previousStatus: selectedIssue.currentStatus,
      newStatus: targetStatus,
      stage: selectedIssue.currentStage,
      changeType: targetStatus !== selectedIssue.currentStatus ? 'Status Change' : 'Audit Note',
      notes: historyNoteInput
    };

    const updatedIssue: IssueLogItem = {
      ...selectedIssue,
      currentStatus: targetStatus,
      history: [historyRecord, ...(selectedIssue.history || [])]
    };

    const updatedList = issuesList.map(item => item.id === selectedIssue.id ? updatedIssue : item);
    saveIssues(updatedList, `Status change / audit note logged by ${currentUsername}`);
    setShowHistoryModal(false);
    setHistoryNoteInput('');
    setHistoryNewStatusInput('');
  };

  // Structured PDF Export for Single Issue Dossier
  const handleExportSingleIssuePdf = (issueToExport?: IssueLogItem) => {
    const item = issueToExport || selectedIssue;
    if (!item) return;

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 36;
    const contentWidth = pageWidth - (margin * 2);
    let curY = 40;

    let pageCount = 0;
    const drawPageDecorations = () => {
      pageCount++;
      doc.setFillColor(37, 99, 235);
      doc.rect(margin, 20, contentWidth, 3, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageHeight - 35, pageWidth - margin, pageHeight - 35);

      doc.text(
        `ETHIOPIAN ROADS ADMINISTRATION • OFFICIAL CONTRACTUAL ISSUE DOSSIER • REF: ${item.issueCode}`,
        margin,
        pageHeight - 22
      );
      doc.text(
        `CONFIDENTIAL • Page ${pageCount}`,
        pageWidth - margin,
        pageHeight - 22,
        { align: 'right' }
      );
    };

    const checkSpace = (needed: number) => {
      if (curY + needed > pageHeight - 50) {
        doc.addPage();
        curY = 45;
        drawPageDecorations();
      }
    };

    const drawSectionHeader = (title: string, color = [37, 99, 235]) => {
      checkSpace(35);
      doc.setFillColor(color[0], color[1], color[2]);
      doc.rect(margin, curY - 9, 4, 12, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(title, margin + 9, curY);
      curY += 18;
    };

    drawPageDecorations();

    // Document Header & ERA Logo Emblem
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, curY, 36, 36, 6, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(245, 158, 11);
    doc.text("E.R.A", margin + 18, curY + 18, { align: 'center' });
    doc.setFontSize(4);
    doc.setTextColor(255, 255, 255);
    doc.text("ROADS", margin + 18, curY + 26, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("ETHIOPIAN ROADS ADMINISTRATION (ERA)", margin + 46, curY + 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(37, 99, 235);
    doc.text("PROJECT ISSUE ESCALATION & TEAM TRANSFER DOSSIER", margin + 46, curY + 24);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`DOSSIER NO: ${item.issueCode}   •   GENERATED: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}`, margin + 46, curY + 34);

    curY += 46;

    // Project Info Card
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, curY, contentWidth, 34, 4, 4, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(`PROJECT: ${project.name}`, margin + 10, curY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Contractor: ${project.contractor || 'N/A'}   |   Consultant: ${project.consultant || 'N/A'}   |   Type: ${project.contractType}`, margin + 10, curY + 26);

    curY += 44;

    // Issue Title Banner
    doc.setFillColor(238, 242, 255);
    doc.setDrawColor(199, 210, 254);
    doc.roundedRect(margin, curY, contentWidth, 38, 4, 4, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 27, 75);
    const titleLines = doc.splitTextToSize(`ISSUE: ${item.title}`, contentWidth - 20);
    doc.text(titleLines.slice(0, 2), margin + 10, curY + 16);

    curY += 48;

    // 1. Key Particulars
    drawSectionHeader("1. Key Particulars & Financial/Time Impact");

    const colWidth = (contentWidth - 15) / 4;
    const keyBoxes = [
      { label: "ISSUE CODE", val: item.issueCode, color: [37, 99, 235] },
      { label: "CATEGORY", val: item.category, color: [15, 23, 42] },
      { label: "PRIORITY LEVEL", val: item.priority, color: item.priority === 'Critical' ? [225, 29, 72] : [217, 119, 6] },
      { label: "CLAUSE REF", val: item.clauseReference || 'N/A', color: [15, 23, 42] },
    ];

    keyBoxes.forEach((box, i) => {
      const x = margin + i * (colWidth + 5);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(x, curY, colWidth, 32, 4, 4, 'DF');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(box.label, x + 8, curY + 11);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(box.color[0], box.color[1], box.color[2]);
      const splitVal = doc.splitTextToSize(box.val, colWidth - 12);
      doc.text(splitVal[0], x + 8, curY + 23);
    });

    curY += 38;

    // Impact Row
    const halfWidth = (contentWidth - 8) / 2;
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(254, 202, 202);
    doc.roundedRect(margin, curY, halfWidth, 32, 4, 4, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(153, 27, 27);
    doc.text("CLAIMED FINANCIAL EXPOSURE (ETB)", margin + 10, curY + 11);
    doc.setFontSize(9);
    doc.text(formatAccounting(item.financialImpactEtb || 0, 'ETB'), margin + 10, curY + 24);

    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(253, 230, 138);
    doc.roundedRect(margin + halfWidth + 8, curY, halfWidth, 32, 4, 4, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(146, 64, 14);
    doc.text("CLAIMED EXTENSION OF TIME (EOT)", margin + halfWidth + 18, curY + 11);
    doc.setFontSize(9);
    doc.text(item.timeImpactDays ? `${item.timeImpactDays} Calendar Days` : '0 Days (No EOT Claimed)', margin + halfWidth + 18, curY + 24);

    curY += 42;

    // 2. Initial Description
    drawSectionHeader("2. Initial Issue Description & Context");

    const descLines = doc.splitTextToSize(item.initialDescription || 'No initial description provided.', contentWidth - 20);
    const descBoxHeight = Math.max(40, (descLines.length * 10) + 26);

    checkSpace(descBoxHeight + 10);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, curY, contentWidth, descBoxHeight, 4, 4, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`Date Submitted: ${item.submittedDate}   |   By: ${item.submittedBy}   |   To: ${item.submittedTo}`, margin + 10, curY + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(descLines, margin + 10, curY + 25);

    curY += descBoxHeight + 14;

    // 3. Current Stage & Bottleneck
    drawSectionHeader("3. Current Milestone Stage & Active Bottlenecks", [16, 185, 129]);

    checkSpace(55);
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(margin, curY, contentWidth, 50, 4, 4, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(22, 101, 52);
    doc.text(`Current Status: ${item.currentStatus}   |   Stage: ${item.currentStage}`, margin + 10, curY + 14);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(51, 65, 85);
    const progressLines = doc.splitTextToSize(`Progress Summary: ${item.latestProgressSummary || 'N/A'}`, contentWidth - 20);
    doc.text(progressLines.slice(0, 2), margin + 10, curY + 26);

    if (item.currentBottleneck) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(185, 28, 28);
      const bottleLines = doc.splitTextToSize(`Bottleneck: ${item.currentBottleneck}`, contentWidth - 20);
      doc.text(bottleLines[0], margin + 10, curY + 41);
    }

    curY += 62;

    // 4. Team Transfer Log
    drawSectionHeader("4. Chronological Team Transfer & Handover Audit Log", [147, 51, 234]);

    if (item.transfers && item.transfers.length > 0) {
      item.transfers.forEach((tr, index) => {
        const trReasonLines = doc.splitTextToSize(`Reason: ${tr.transferReason}`, contentWidth - 24);
        const trActionLines = doc.splitTextToSize(`Actions Taken: ${tr.actionTakenByPreviousTeam}`, contentWidth - 24);
        const trRecLines = doc.splitTextToSize(`Recommended Course: ${tr.recommendedCourseOfAction}`, contentWidth - 24);

        const blockHeight = 35 + (trReasonLines.length * 9) + (trActionLines.length * 9) + (trRecLines.length * 9);
        checkSpace(blockHeight + 10);

        doc.setFillColor(250, 245, 255);
        doc.setDrawColor(233, 213, 255);
        doc.roundedRect(margin, curY, contentWidth, blockHeight, 4, 4, 'DF');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(107, 33, 168);
        const deptRecs = getDepartmentTimeRecords(item);
        const stepRec = deptRecs[index];
        const daysText = stepRec ? `  •  TIME IN DEPT: ${stepRec.daysTaken} Days (${stepRec.startDate} → ${stepRec.endDate})` : '';

        doc.text(`TRANSFER STEP #${index + 1}   •   DATE: ${tr.transferDate}${daysText}`, margin + 10, curY + 13);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(30, 41, 59);
        doc.text(`FROM: ${tr.transferredFrom}    --->    TO: ${tr.transferredTo}`, margin + 10, curY + 24);

        let innerY = curY + 35;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(71, 85, 105);
        doc.text(trReasonLines, margin + 10, innerY);
        innerY += (trReasonLines.length * 9);

        doc.text(trActionLines, margin + 10, innerY);
        innerY += (trActionLines.length * 9);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(126, 34, 206);
        doc.text(trRecLines, margin + 10, innerY);

        curY += blockHeight + 10;
      });
    } else {
      checkSpace(30);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, curY, contentWidth, 26, 4, 4, 'DF');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("No official team transfers recorded yet. Issue remains under initial reviewing authority.", margin + 10, curY + 16);
      curY += 36;
    }

    // 5. Lessons Learned & Retrospective Review
    drawSectionHeader("5. Lessons Learned & Retrospective Review", [13, 148, 136]);
    const lessonsText = item.lessonsLearned || "No explicit lesson learned or retrospective review logged for this issue entry yet.";
    const lessonsLines = doc.splitTextToSize(lessonsText, contentWidth - 24);
    const lessonsBoxHeight = Math.max(36, (lessonsLines.length * 9) + 22);

    checkSpace(lessonsBoxHeight + 10);
    doc.setFillColor(240, 253, 250);
    doc.setDrawColor(153, 246, 228);
    doc.roundedRect(margin, curY, contentWidth, lessonsBoxHeight, 4, 4, 'DF');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 118, 110);
    const lessonAuthorText = item.lessonsLearnedUpdatedBy ? `   (Recorded by: ${item.lessonsLearnedUpdatedBy} on ${item.lessonsLearnedUpdatedAt || ''})` : '';
    doc.text(`KEY LESSON & STRATEGIC RECOMMENDATION${lessonAuthorText}`, margin + 10, curY + 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text(lessonsLines, margin + 10, curY + 24);

    curY += lessonsBoxHeight + 12;

    // 6. Complete Status History & User Audit Log
    drawSectionHeader("6. Status History & User Audit Log Trail", [37, 99, 235]);
    if (item.history && item.history.length > 0) {
      item.history.forEach((hist, hIdx) => {
        const histNotes = doc.splitTextToSize(`Notes: ${hist.notes}`, contentWidth - 24);
        const histBoxHeight = Math.max(28, (histNotes.length * 8) + 20);

        checkSpace(histBoxHeight + 6);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(margin, curY, contentWidth, histBoxHeight, 3, 3, 'DF');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(30, 41, 59);
        doc.text(`[${hist.timestamp}]  ${hist.user}  •  Type: ${hist.changeType}  •  Status: ${hist.previousStatus} ---> ${hist.newStatus}`, margin + 8, curY + 11);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(71, 85, 105);
        doc.text(histNotes, margin + 8, curY + 20);

        curY += histBoxHeight + 6;
      });
    } else {
      checkSpace(24);
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, curY, contentWidth, 20, 3, 3, 'DF');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text("Initial submission audit history record auto-logged.", margin + 8, curY + 13);
      curY += 26;
    }

    curY += 8;

    const filename = `${item.issueCode.replace(/[^a-zA-Z0-9-]/g, '_')}_Dossier_Report.pdf`;
    doc.save(filename);
  };

  // Export Issue Log Registry to CSV / Excel
  const handleExportCsv = () => {
    if (!issuesList.length) return;
    const headers = ["Issue Code", "Category", "Title", "Date Submitted", "Submitted By", "Submitted To", "Priority", "Status", "Contract Ref", "Financial Exposure (ETB)", "Time Exposure (Days)", "Lessons Learned"];
    const rows = issuesList.map(item => [
      `"${item.issueCode || ''}"`,
      `"${(item.category || '').replace(/"/g, '""')}"`,
      `"${(item.title || '').replace(/"/g, '""')}"`,
      `"${item.submittedDate || ''}"`,
      `"${(item.submittedBy || '').replace(/"/g, '""')}"`,
      `"${(item.submittedTo || '').replace(/"/g, '""')}"`,
      `"${item.priority || ''}"`,
      `"${item.currentStatus || ''}"`,
      `"${(item.clauseReference || '').replace(/"/g, '""')}"`,
      `"${item.financialImpactEtb || 0}"`,
      `"${item.timeImpactDays || 0}"`,
      `"${(item.lessonsLearned || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ERA_Issue_Log_Registry_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Structured PDF Export for Master Issue Registry Report
  const handleExportFullRegistryPdf = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 36;
    const contentWidth = pageWidth - (margin * 2);
    let curY = 40;

    let pageCount = 0;
    const drawPageDecorations = () => {
      pageCount++;
      doc.setFillColor(37, 99, 235);
      doc.rect(margin, 20, contentWidth, 3, 'F');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, pageHeight - 35, pageWidth - margin, pageHeight - 35);

      doc.text(
        `ETHIOPIAN ROADS ADMINISTRATION • MASTER ISSUE REGISTRY REPORT • ${project.name}`,
        margin,
        pageHeight - 22
      );
      doc.text(
        `CONFIDENTIAL • Page ${pageCount}`,
        pageWidth - margin,
        pageHeight - 22,
        { align: 'right' }
      );
    };

    const checkSpace = (needed: number) => {
      if (curY + needed > pageHeight - 50) {
        doc.addPage();
        curY = 45;
        drawPageDecorations();
      }
    };

    drawPageDecorations();

    // Header Logo & Branding
    doc.setFillColor(15, 23, 42);
    doc.roundedRect(margin, curY, 36, 36, 6, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(245, 158, 11);
    doc.text("E.R.A", margin + 18, curY + 18, { align: 'center' });
    doc.setFontSize(4);
    doc.setTextColor(255, 255, 255);
    doc.text("ROADS", margin + 18, curY + 26, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text("ETHIOPIAN ROADS ADMINISTRATION (ERA)", margin + 46, curY + 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(37, 99, 235);
    doc.text("MASTER PROJECT ISSUE REGISTRY & CLAIMS MONITORING REPORT", margin + 46, curY + 24);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`PROJECT: ${project.name}   •   DATE: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, margin + 46, curY + 34);

    curY += 48;

    // Executive Summary Box
    const totalFinancial = filteredIssues.reduce((acc, curr) => acc + (curr.financialImpactEtb || 0), 0);
    const totalDays = filteredIssues.reduce((acc, curr) => acc + (curr.timeImpactDays || 0), 0);
    const activeCount = filteredIssues.filter(i => !i.currentStatus.includes('Resolved') && !i.currentStatus.includes('Rejected')).length;
    const transferredCount = filteredIssues.filter(i => i.currentStatus.includes('Transferred') || i.currentStatus.includes('Escalated')).length;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, curY, contentWidth, 42, 4, 4, 'DF');

    const kpiWidth = contentWidth / 4;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("TOTAL LOGGED ISSUES", margin + 10, curY + 13);
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(`${filteredIssues.length} Items`, margin + 10, curY + 28);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("ACTIVE / ESCALATED", margin + kpiWidth + 10, curY + 13);
    doc.setFontSize(10);
    doc.setTextColor(147, 51, 234);
    doc.text(`${activeCount} Active (${transferredCount} Escalated)`, margin + kpiWidth + 10, curY + 28);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("TOTAL FINANCIAL EXPOSURE", margin + (kpiWidth * 2) + 10, curY + 13);
    doc.setFontSize(10);
    doc.setTextColor(225, 29, 72);
    doc.text(formatAccounting(totalFinancial, 'ETB'), margin + (kpiWidth * 2) + 10, curY + 28);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text("TOTAL TIME IMPACT (EOT)", margin + (kpiWidth * 3) + 10, curY + 13);
    doc.setFontSize(11);
    doc.setTextColor(217, 119, 6);
    doc.text(`${totalDays} Days`, margin + (kpiWidth * 3) + 10, curY + 28);

    curY += 54;

    // Issue Table
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("Comprehensive Issue Log Registry Table", margin, curY);
    curY += 12;

    const tableCols = [
      { title: "Code", width: 85 },
      { title: "Category & Description", width: 175 },
      { title: "Clause", width: 60 },
      { title: "Financial (ETB)", width: 80 },
      { title: "EOT", width: 45 },
      { title: "Priority / Status", width: 78 }
    ];

    doc.setFillColor(30, 41, 59);
    doc.rect(margin, curY, contentWidth, 18, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);

    let tx = margin + 5;
    tableCols.forEach(col => {
      doc.text(col.title, tx, curY + 12);
      tx += col.width;
    });

    curY += 18;

    filteredIssues.forEach((issue, idx) => {
      const titleLines = doc.splitTextToSize(issue.title, 165);
      const rowHeight = Math.max(26, (titleLines.length * 9) + 14);

      checkSpace(rowHeight + 5);

      if (idx % 2 === 0) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, curY, contentWidth, rowHeight, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, curY + rowHeight, margin + contentWidth, curY + rowHeight);

      let rx = margin + 5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(37, 99, 235);
      doc.text(issue.issueCode, rx, curY + 12);
      rx += tableCols[0].width;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      doc.text(titleLines.slice(0, 2), rx, curY + 12);
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      doc.text(`[${issue.category}]`, rx, curY + 12 + (Math.min(2, titleLines.length) * 8.5));
      rx += tableCols[1].width;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text(issue.clauseReference || 'N/A', rx, curY + 12);
      rx += tableCols[2].width;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(225, 29, 72);
      doc.text(formatAccounting(issue.financialImpactEtb || 0, ''), rx, curY + 12);
      rx += tableCols[3].width;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(217, 119, 6);
      doc.text(issue.timeImpactDays ? `${issue.timeImpactDays} d` : '0 d', rx, curY + 12);
      rx += tableCols[4].width;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      if (issue.priority === 'Critical') doc.setTextColor(225, 29, 72);
      else if (issue.priority === 'High') doc.setTextColor(217, 119, 6);
      else doc.setTextColor(37, 99, 235);
      doc.text(`${issue.priority}`, rx, curY + 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6);
      doc.setTextColor(100, 116, 139);
      const statusSplit = doc.splitTextToSize(issue.currentStatus, tableCols[5].width - 5);
      doc.text(statusSplit[0], rx, curY + 21);

      curY += rowHeight;
    });

    curY += 18;

    // Detailed Bottlenecks
    checkSpace(60);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("Active Bottlenecks & Escalation Summaries", margin, curY);
    curY += 14;

    filteredIssues.forEach((issue) => {
      if (!issue.currentBottleneck && issue.transfers.length === 0) return;

      checkSpace(38);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, curY, contentWidth, 32, 4, 4, 'DF');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(37, 99, 235);
      doc.text(`[${issue.issueCode}] ${issue.title.substring(0, 65)}${issue.title.length > 65 ? '...' : ''}`, margin + 8, curY + 12);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      const btext = issue.currentBottleneck ? `Bottleneck: ${issue.currentBottleneck}` : `Latest Stage: ${issue.currentStage}`;
      const bLines = doc.splitTextToSize(btext, contentWidth - 16);
      doc.text(bLines[0], margin + 8, curY + 24);

      curY += 38;
    });

    curY += 10;

    // Sign-off
    checkSpace(65);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text("Official Registry Verification & Report Approval", margin, curY);
    curY += 14;

    const sigWidth = (contentWidth - 20) / 3;
    const sigTitles = [
      "Prepared By: Resident Engineer",
      "Reviewed By: ERA Directorate Director",
      "Approved By: PMO & Claims Committee"
    ];

    sigTitles.forEach((stitle, sIdx) => {
      const sx = margin + sIdx * (sigWidth + 10);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(sx, curY, sigWidth, 50, 4, 4, 'DF');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(30, 41, 59);
      doc.text(stitle, sx + 6, curY + 12);

      doc.setDrawColor(226, 232, 240);
      doc.line(sx + 6, curY + 36, sx + sigWidth - 6, curY + 36);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(5.5);
      doc.setTextColor(148, 163, 184);
      doc.text("Signature & Official Stamp", sx + 6, curY + 44);
    });

    const filename = `ERA_${project.name.replace(/[^a-zA-Z0-9-]/g, '_')}_Master_Issue_Registry.pdf`;
    doc.save(filename);
  };

  const categoriesList = Array.from(new Set(issuesList.map(i => i.category))).filter(Boolean);

  const isResolvedStatus = (status: string) => {
    const s = (status || '').toLowerCase();
    return s.includes('resolved') || s.includes('approved') || s.includes('closed') || s.includes('rejected');
  };

  const filteredIssues = issuesList.filter(item => {
    const matchesSearch = (item.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.issueCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.lessonsLearned || '').toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === 'Active') {
      matchesStatus = !isResolvedStatus(item.currentStatus);
    } else if (statusFilter === 'Overdue Pending') {
      matchesStatus = isOverduePending(item, pendingDaysThreshold);
    } else if (statusFilter === 'Resolved / Approved' || statusFilter === 'Resolved Archive') {
      matchesStatus = isResolvedStatus(item.currentStatus);
    } else if (statusFilter !== 'All' && statusFilter !== 'All Records') {
      matchesStatus = item.currentStatus === statusFilter;
    }

    const matchesPriority = priorityFilter === 'All' || item.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  const activeIssuesCount = issuesList.filter(item => !isResolvedStatus(item.currentStatus)).length;
  const resolvedIssuesList = issuesList.filter(item => isResolvedStatus(item.currentStatus) || Boolean(item.lessonsLearned && item.lessonsLearned.trim().length > 0));
  const overduePendingCount = issuesList.filter(item => isOverduePending(item, pendingDaysThreshold)).length;

  const getPriorityBadgeClass = (p: string) => {
    switch (p) {
      case 'Critical': return 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'High': return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'Medium': return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getStatusBadgeClass = (s: string) => {
    if (s.includes('Transferred') || s.includes('Escalated')) {
      return 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800';
    }
    if (s.includes('Resolved') || s.includes('Approved')) {
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
    }
    if (s.includes('Progress') || s.includes('Evaluation')) {
      return 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800';
    }
    return 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800';
  };

  return (
    <div className="space-y-5">
      {/* Printable styles setup */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #one-page-issue-sheet, #one-page-issue-sheet * {
            visibility: visible;
          }
          #one-page-issue-sheet {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: 1px solid #ccc !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Overdue Pending Critical Warning Action Banner */}
      {overduePendingCount > 0 && (
        <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 text-white p-3.5 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 no-print border border-rose-400/30">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 backdrop-blur-md rounded-xl animate-bounce shrink-0">
              <AlertOctagon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-wider">
                ⚠️ Critical Action Alert: {overduePendingCount} Issue(s) Pending Beyond {pendingDaysThreshold}-Day Review Limit
              </h4>
              <p className="text-2xs text-rose-100 mt-0.5">
                Submitted issues exceeding {pendingDaysThreshold} calendar days without team resolution or transfer require immediate escalation to prevent extension-of-time (EOT) claims.
              </p>
            </div>
          </div>
          <button
            onClick={() => setStatusFilter('Overdue Pending')}
            className="bg-white text-rose-700 hover:bg-rose-50 text-2xs font-extrabold px-3 py-1.5 rounded-xl transition shadow-xs whitespace-nowrap cursor-pointer shrink-0"
          >
            View Overdue Issues ({overduePendingCount})
          </button>
        </div>
      )}

      {/* High / Critical Priority Admin Notification Flag Banner */}
      {urgentNotificationFlag && (
        <div className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white p-3.5 rounded-2xl shadow-md flex items-center justify-between gap-3 no-print border border-red-400/40 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white text-rose-600 rounded-xl font-bold shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xs font-black uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded border border-white/30">
                  🚨 URGENT ADMIN NOTIFICATION FLAG ACTIVE
                </span>
                <span className="text-2xs font-mono font-bold text-rose-100">
                  [{urgentNotificationFlag.priority.toUpperCase()} PRIORITY]
                </span>
              </div>
              <p className="text-xs font-extrabold mt-0.5 text-white">
                New Issue Registered: {urgentNotificationFlag.issueCode} — "{urgentNotificationFlag.title}"
              </p>
              <p className="text-2xs text-rose-100">
                Project administrators have been alerted for immediate prompt escalation and evaluation.
              </p>
            </div>
          </div>
          <button
            onClick={() => setUrgentNotificationFlag(null)}
            className="bg-white/20 hover:bg-white/30 text-white text-2xs font-bold px-2.5 py-1 rounded-lg transition cursor-pointer border border-white/30 shrink-0"
          >
            Dismiss Flag
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-rose-500" />
            <h2 className="text-xl font-bold text-slate-800 dark:text-zinc-100">
              Issue Log
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Complete contractual tracking sheet recording when the issue was submitted, the current progress stage reached, and team transfer handovers with recommended courses of action.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowArchiveModal(true)}
            className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-xs cursor-pointer"
          >
            <BookOpen className="w-4 h-4" /> Lessons Learned & Resolved Archive ({resolvedIssuesList.length})
          </button>
          <button
            onClick={() => setShowNewIssueModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Log New Issue
          </button>
        </div>
      </div>

      {/* Overview Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-3.5 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Active Issues Log</span>
          <span className="text-xl font-extrabold text-slate-800 dark:text-white font-mono mt-0.5 block">
            {activeIssuesCount}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-3.5 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block">Pending / Under Review</span>
          <span className="text-xl font-extrabold text-amber-600 dark:text-amber-400 font-mono mt-0.5 block">
            {issuesList.filter(i => isPendingStatus(i.currentStatus)).length}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-3.5 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-500 block">Overdue Pending ({pendingDaysThreshold}d+ Limit)</span>
          <span className="text-xl font-extrabold text-rose-600 dark:text-rose-400 font-mono mt-0.5 block">
            {overduePendingCount}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-3.5 rounded-xl shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 block">Resolved / Archived Records</span>
          <span className="text-xl font-extrabold text-teal-600 dark:text-teal-400 font-mono mt-0.5 block">
            {resolvedIssuesList.length}
          </span>
        </div>
      </div>

      {/* Structured Issue Log Master Table */}
      <div className="bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700/60 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 dark:text-zinc-100 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Structured Issue Log Table
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Active project issues registry. Approved and resolved issues are archived for historical records & lessons learned.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowArchiveModal(true)}
              className="bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/80 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 text-xs font-bold py-2 px-3.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-teal-600" />
              Lessons Learned Repository ({resolvedIssuesList.length})
            </button>
            <button
              onClick={() => setShowNewIssueModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 px-3.5 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add New Issue
            </button>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
          <div className="flex-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search issues by title, code, category, or lesson learned..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { label: 'Active Issues', value: 'Active', count: activeIssuesCount },
                { label: 'Submitted', value: 'Submitted / Under Review' },
                { label: 'In Progress', value: 'In Progress / Evaluation' },
                { label: 'Transferred', value: 'Transferred / Escalated' },
                { label: 'Overdue', value: 'Overdue Pending', count: overduePendingCount },
                { label: 'Resolved Archive', value: 'Resolved / Approved', count: resolvedIssuesList.length },
                { label: 'All Records', value: 'All' }
              ].map((tab) => {
                const isActive = statusFilter === tab.value;
                const isOverdue = tab.value === 'Overdue Pending';
                const isResolved = tab.value === 'Resolved / Approved';

                return (
                  <button
                    key={tab.value}
                    onClick={() => setStatusFilter(tab.value)}
                    className={`px-2.5 py-1.5 rounded-lg text-2xs font-extrabold whitespace-nowrap transition flex items-center gap-1 cursor-pointer ${
                      isActive
                        ? isOverdue
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : isResolved
                            ? 'bg-teal-600 text-white shadow-2xs'
                            : 'bg-blue-600 text-white shadow-2xs'
                        : isOverdue
                          ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                          : isResolved
                            ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-mono ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Structured Table Container */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700/80 shadow-2xs">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3 w-32">Date Submitted</th>
                <th className="p-3 w-28 text-center">Required Days (Contract)</th>
                <th className="p-3 min-w-[260px]">Issue Description</th>
                <th className="p-3 w-36">Current Status</th>
                <th className="p-3 min-w-[200px]">Action Required</th>
                <th className="p-3 w-40">Transferred To</th>
                <th className="p-3 min-w-[250px]">Dept Time Taken (Days)</th>
                <th className="p-3 w-28 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400 font-medium">
                    No matching issues found in the registry. Click "Add New Issue" above to create one.
                  </td>
                </tr>
              ) : (
                filteredIssues.map((item) => {
                  const isSelected = item.id === selectedIssue?.id;
                  const overdue = isOverduePending(item, pendingDaysThreshold);
                  const daysPending = calculateDaysPending(item.submittedDate);
                  const lastTransfer = item.transfers.length > 0 ? item.transfers[item.transfers.length - 1] : null;
                  const actionRequired = item.currentBottleneck || item.latestProgressSummary || (lastTransfer ? lastTransfer.recommendedCourseOfAction : 'Pending review');
                  const transferredTo = lastTransfer ? lastTransfer.transferredTo : item.submittedTo || 'N/A';

                  return (
                    <tr 
                      key={item.id}
                      onClick={() => setSelectedIssueId(item.id)}
                      className={`transition-colors cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-50/70 dark:bg-blue-950/30 font-medium' 
                          : 'hover:bg-slate-50 dark:hover:bg-slate-900/30'
                      }`}
                    >
                      {/* Date Submitted */}
                      <td className="p-3 align-top">
                        <div className="flex flex-col gap-1">
                          <span className="font-mono font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            {item.submittedDate}
                          </span>
                          {overdue && (
                            <span className="inline-flex items-center gap-0.5 text-[9px] font-black text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 px-1.5 py-0.5 rounded w-max border border-rose-300 dark:border-rose-800">
                              <AlertOctagon className="w-2.5 h-2.5" /> Overdue ({daysPending}d)
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Required Days (Contract) */}
                      <td className="p-3 align-top text-center">
                        <span className="font-mono font-extrabold text-[11px] text-slate-800 dark:text-zinc-200">
                          {item.requiredDaysContract ? `${item.requiredDaysContract}d` : 'N/A'}
                        </span>
                      </td>

                      {/* Issue Description */}
                      <td className="p-3 align-top">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-extrabold text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                              {item.issueCode}
                            </span>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${getPriorityBadgeClass(item.priority)}`}>
                              {item.priority} Priority
                            </span>
                            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                              {item.category}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-xs leading-snug">
                            {item.title}
                          </h4>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 line-clamp-2 leading-tight">
                            {item.initialDescription}
                          </p>
                        </div>
                      </td>

                      {/* Current Status */}
                      <td className="p-3 align-top">
                        <div className="space-y-1">
                          <span className={`inline-block text-[10px] font-extrabold px-2.5 py-1 rounded-lg border ${getStatusBadgeClass(item.currentStatus)}`}>
                            {item.currentStatus}
                          </span>
                          {item.currentStage && (
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">
                              {item.currentStage}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Action Required */}
                      <td className="p-3 align-top">
                        <div className="bg-slate-50 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/80 dark:border-slate-700/80 text-[11px] text-slate-700 dark:text-slate-300">
                          <span className="text-[9px] font-bold uppercase text-slate-400 block mb-0.5">Bottleneck / Action:</span>
                          <p className="line-clamp-2 leading-tight">
                            {actionRequired}
                          </p>
                        </div>
                      </td>

                      {/* Transferred To */}
                      <td className="p-3 align-top">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-slate-800 dark:text-slate-200 font-bold text-[11px]">
                            <UserCheck className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                            <span className="line-clamp-2">{transferredTo}</span>
                          </div>
                          {item.transfers.length > 0 ? (
                            <span className="text-[9px] font-extrabold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded inline-flex items-center gap-1 border border-purple-200 dark:border-purple-800">
                              <History className="w-2.5 h-2.5" /> Transfer #{item.transfers.length}
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-400 italic block">
                              Initial Submission
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Department Time Taken */}
                      <td className="p-3 align-top">
                        {(() => {
                          const deptRecords = getDepartmentTimeRecords(item);
                          const totalDays = deptRecords.reduce((sum, r) => sum + r.daysTaken, 0);

                          return (
                            <div className="space-y-1.5 min-w-[220px]">
                              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700/80 pb-1">
                                <span className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-purple-500 shrink-0" />
                                  {deptRecords.length} Dept Stage{deptRecords.length > 1 ? 's' : ''}
                                </span>
                                <span className="text-[10px] font-mono font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                                  Total: {totalDays}d
                                </span>
                              </div>

                              <div className="space-y-1 max-h-[140px] overflow-y-auto pr-0.5 custom-scrollbar">
                                {deptRecords.map((rec, rIdx) => (
                                  <div 
                                    key={rIdx}
                                    className="bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 text-[10px] flex items-center justify-between gap-1.5"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <span className="font-bold text-slate-800 dark:text-slate-200 truncate block text-[10.5px]">
                                        {rec.department}
                                      </span>
                                      <span className="text-[9px] text-slate-400 font-mono block">
                                        {rec.startDate} → {rec.endDate}
                                      </span>
                                    </div>
                                    <div className="text-right shrink-0">
                                      <span className={`font-mono font-black block text-[11px] ${
                                        rec.status === 'Active' 
                                          ? 'text-amber-600 dark:text-amber-400' 
                                          : rec.status === 'Resolved / Closed' 
                                            ? 'text-emerald-600 dark:text-emerald-400' 
                                            : 'text-purple-600 dark:text-purple-400'
                                      }`}>
                                        {rec.daysTaken}d
                                      </span>
                                      <span className="text-[8px] font-extrabold uppercase tracking-wide text-slate-400">
                                        {rec.status}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Actions */}
                      <td className="p-3 align-top text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedIssueId(item.id);
                              setShowHistoryModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/80 text-blue-700 dark:text-blue-300 transition cursor-pointer border border-blue-200 dark:border-blue-800"
                            title="Log Status Change & User History"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedIssueId(item.id);
                              setLessonsInput(item.lessonsLearned || '');
                              setReviewNotesInput(item.reviewNotes || '');
                              setShowLessonsModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/80 text-teal-700 dark:text-teal-300 transition cursor-pointer border border-teal-200 dark:border-teal-800"
                            title="Record / Review Lessons Learned"
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedIssueId(item.id);
                              setShowEditIssueModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-300 transition cursor-pointer"
                            title="Update Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedIssueId(item.id);
                              setShowAddTransferModal(true);
                            }}
                            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-slate-700 dark:text-slate-200 hover:text-purple-600 dark:hover:text-purple-300 transition cursor-pointer"
                            title="Record Team Transfer"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteIssue(item.id)}
                              className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-red-100 dark:hover:bg-red-900/50 text-slate-700 dark:text-slate-200 hover:text-red-600 dark:hover:text-red-300 transition cursor-pointer"
                              title="Delete Issue"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Action Toolbar Below Table (Export Only) */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-600"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              Export CSV / Excel
            </button>
            <button
              onClick={() => selectedIssue && handleExportSingleIssuePdf(selectedIssue)}
              className="bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-600"
            >
              <Download className="w-4 h-4 text-rose-600" />
              Export PDF Dossier
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Layout: Sidebar selector & 1-Page Log Sheet */}
      <div className="hidden">
        
        {/* Left Column: Issue List & Multi-Filter Controls */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-800 border border-slate-150 dark:border-slate-700/60 p-4 rounded-2xl shadow-sm space-y-3 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2.5">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-500" />
              Project Issue Registry
            </span>
            <span className="text-[10px] font-extrabold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full">
              {filteredIssues.length} Listed
            </span>
          </div>

          {/* Filtering Controls */}
          <div className="space-y-2.5">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search code, title, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-500 text-slate-800 dark:text-slate-100"
              />
            </div>

            {/* Status Pills with Overdue Filter Badge */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Status Filter</span>
              <div className="flex items-center gap-1.5 text-2xs overflow-x-auto pb-1 scrollbar-none">
                {['All', 'Submitted / Under Review', 'In Progress / Evaluation', 'Transferred / Escalated', 'Resolved / Approved', 'Overdue Pending'].map((st) => {
                  const isSelected = statusFilter === st;
                  const isOverdueTab = st === 'Overdue Pending';
                  return (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-2 py-1 rounded-lg whitespace-nowrap font-bold transition flex items-center gap-1 cursor-pointer ${
                        isSelected
                          ? isOverdueTab ? 'bg-rose-600 text-white shadow-xs' : 'bg-blue-600 text-white shadow-xs'
                          : isOverdueTab
                            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                      }`}
                    >
                      {isOverdueTab && <AlertOctagon className="w-3 h-3 text-rose-500" />}
                      {st === 'All' ? 'All Statuses' : st === 'Overdue Pending' ? `Overdue (${overduePendingCount})` : st.split('/')[0].trim()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Severity / Priority & Category Filter Row */}
            <div className="grid grid-cols-2 gap-2 text-2xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Priority / Severity</span>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 font-semibold text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="All">All Priorities</option>
                  <option value="Critical">🔴 Critical</option>
                  <option value="High">🟠 High</option>
                  <option value="Medium">🔵 Medium</option>
                  <option value="Low">🟢 Low</option>
                </select>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Category</span>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 font-semibold text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="All">All Categories</option>
                  {categoriesList.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Pending SLA Threshold & Reset */}
            <div className="flex items-center justify-between text-2xs pt-1.5 border-t border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-1.5 text-slate-500">
                <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                <span className="font-bold">Pending Warning Limit:</span>
                <select
                  value={pendingDaysThreshold}
                  onChange={(e) => setPendingDaysThreshold(Number(e.target.value))}
                  className="bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-extrabold border border-amber-200 dark:border-amber-800 rounded px-1.5 py-0.5 text-2xs outline-none cursor-pointer"
                >
                  <option value={7}>7 Days</option>
                  <option value={14}>14 Days</option>
                  <option value={30}>30 Days</option>
                  <option value={60}>60 Days</option>
                </select>
              </div>

              {(statusFilter !== 'All' || priorityFilter !== 'All' || categoryFilter !== 'All' || searchQuery !== '') && (
                <button
                  onClick={() => {
                    setStatusFilter('All');
                    setPriorityFilter('All');
                    setCategoryFilter('All');
                    setSearchQuery('');
                  }}
                  className="text-rose-600 dark:text-rose-400 hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                >
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
            </div>
          </div>

          {/* Issues List */}
          <div className="space-y-2 overflow-y-auto max-h-[600px] pr-1">
            {filteredIssues.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 font-medium">
                No matching issues found for selected filter criteria.
              </div>
            ) : (
              filteredIssues.map((item) => {
                const isSelected = item.id === selectedIssue?.id;
                const overdue = isOverduePending(item, pendingDaysThreshold);
                const daysPending = calculateDaysPending(item.submittedDate);

                return (
                  <div
                    key={item.id}
                    onClick={() => setSelectedIssueId(item.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? overdue
                          ? 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-400 dark:border-rose-600 shadow-xs'
                          : 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-400 dark:border-blue-600 shadow-xs'
                        : overdue
                          ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300/60 dark:border-rose-800/50 hover:bg-rose-100/60'
                          : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-200/60 dark:border-slate-700/50 hover:bg-slate-100/60 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-1">
                      <span className="text-[10px] font-mono font-extrabold text-blue-600 dark:text-blue-400">
                        {item.issueCode}
                      </span>
                      <div className="flex items-center gap-1">
                        {overdue && (
                          <span className="text-[9px] font-black text-white bg-rose-600 dark:bg-rose-700 px-1.5 py-0.5 rounded flex items-center gap-0.5 animate-pulse shadow-2xs">
                            <AlertOctagon className="w-2.5 h-2.5" /> OVERDUE ({daysPending}d)
                          </span>
                        )}
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded border ${getPriorityBadgeClass(item.priority)}`}>
                          {item.priority}
                        </span>
                      </div>
                    </div>

                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 line-clamp-2 mt-1">
                      {item.title}
                    </h4>

                    <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-slate-400 mt-2 pt-1 border-t border-slate-200/40 dark:border-slate-700/40">
                      <span>{item.category}</span>
                      <span className="font-mono">{item.submittedDate}</span>
                    </div>

                    <div className="flex justify-between items-center mt-1.5">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${getStatusBadgeClass(item.currentStatus)}`}>
                        {item.currentStatus}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {item.transfers.length > 0 && (
                          <span className="text-[9px] font-extrabold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                            <History className="w-2.5 h-2.5" /> {item.transfers.length} Transfers
                          </span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportSingleIssuePdf(item);
                          }}
                          className="text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 p-1 rounded hover:bg-purple-50 dark:hover:bg-purple-950/40 transition cursor-pointer"
                          title="Export PDF Dossier"
                        >
                          <Download className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Pristine ISSUE LOG SHEET */}
        <div className="lg:col-span-8">
          {selectedIssue ? (
            <div 
              id="one-page-issue-sheet" 
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-md space-y-6 text-slate-800 dark:text-slate-100"
            >
              {/* Overdue Warning Callout Box for Inspected Issue */}
              {isOverduePending(selectedIssue, pendingDaysThreshold) && (
                <div className="bg-rose-50 dark:bg-rose-950/50 border-2 border-rose-500/80 p-4 rounded-xl flex items-start gap-3 shadow-xs no-print">
                  <AlertOctagon className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5 animate-bounce" />
                  <div>
                    <h4 className="text-xs font-black uppercase text-rose-800 dark:text-rose-200 tracking-wider">
                      🚨 ACTION REQUIRED: Issue Pending Resolution for {calculateDaysPending(selectedIssue.submittedDate)} Days (Exceeds {pendingDaysThreshold}-Day Limit)
                    </h4>
                    <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
                      This issue was submitted on <strong>{selectedIssue.submittedDate}</strong> and remains un-resolved at stage <strong>"{selectedIssue.currentStage}"</strong>. Because it exceeds the designated {pendingDaysThreshold}-day resolution threshold, immediate team transfer handover or executive steering escalation is required.
                    </p>
                  </div>
                </div>
              )}

              {/* Official Sheet Header */}
              <div className="border-b-2 border-slate-900 dark:border-slate-100 pb-4 space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block">
                      ETHIOPIAN ROADS ADMINISTRATION • CONTRACTUAL & PROJECT ISSUE ESCALATION SHEET
                    </span>
                    <h1 className="text-xl font-black text-slate-900 dark:text-white mt-1 leading-tight">
                      {selectedIssue.title}
                    </h1>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-600 dark:text-slate-300 font-medium">
                      <span><strong>Project:</strong> {project.name}</span>
                      <span>•</span>
                      <span><strong>Contract Type:</strong> {project.contractType}</span>
                    </div>
                  </div>

                  <div className="text-right flex flex-col items-end gap-1.5">
                    <span className="text-sm font-mono font-black text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 px-3 py-1 rounded-lg border border-blue-200 dark:border-blue-800">
                      {selectedIssue.issueCode}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-2xs font-extrabold px-2 py-0.5 rounded border ${getPriorityBadgeClass(selectedIssue.priority)}`}>
                        {selectedIssue.priority} Priority
                      </span>
                      <span className={`text-2xs font-extrabold px-2 py-0.5 rounded border ${getStatusBadgeClass(selectedIssue.currentStatus)}`}>
                        {selectedIssue.currentStatus}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Single-Button Action Toolbar */}
                <div className="no-print pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-700/80">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => {
                        setHistoryNewStatusInput(selectedIssue.currentStatus);
                        setShowHistoryModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-2xs font-bold px-3 py-1.5 rounded-xl transition shadow-xs cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5" />
                      Log Status Change / Note
                    </button>

                    <button
                      onClick={() => {
                        setLessonsInput(selectedIssue.lessonsLearned || '');
                        setReviewNotesInput(selectedIssue.reviewNotes || '');
                        setShowLessonsModal(true);
                      }}
                      className="inline-flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-2xs font-bold px-3 py-1.5 rounded-xl transition shadow-xs cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      Record Lessons Learned
                    </button>

                    <button
                      onClick={() => setShowAddTransferModal(true)}
                      className="inline-flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-2xs font-bold px-3 py-1.5 rounded-xl transition shadow-xs cursor-pointer"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      Transfer Handover
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleExportSingleIssuePdf(selectedIssue)}
                      className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-2xs font-bold px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF Dossier
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-2xs font-bold px-2.5 py-1.5 rounded-xl transition cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print Sheet
                    </button>
                  </div>
                </div>
              </div>

              {/* PART 1: ISSUE DETAILS WHEN SUBMITTED */}
              <div className="space-y-3">
                <div className="bg-slate-100 dark:bg-slate-900/80 px-3 py-1.5 rounded-lg border-l-4 border-blue-600 flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    PART 1: Initial Issue Submission Record (When Submitted)
                  </h3>
                  <div className="no-print flex items-center gap-2">
                    <button
                      onClick={() => setShowEditIssueModal(true)}
                      className="text-2xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" /> Edit Entry
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-150 dark:border-slate-700/60 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Date Submitted</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedIssue.submittedDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Submitted By</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedIssue.submittedBy}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Submitted To</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{selectedIssue.submittedTo}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Clause / Standard Ref</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{selectedIssue.clauseReference || 'N/A'}</span>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-xl border border-slate-150 dark:border-slate-700/60 space-y-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">Original Issue Statement & Description</span>
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                      {selectedIssue.initialDescription}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/50 dark:border-slate-700/50 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Financial Exposure Submitted:</span>
                      <span className="font-mono font-black text-rose-600 dark:text-rose-400">
                        {formatAccounting(selectedIssue.financialImpactEtb || 0, 'ETB')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Time Extension Exposure:</span>
                      <span className="font-mono font-black text-amber-600 dark:text-amber-400">
                        {selectedIssue.timeImpactDays ? `${selectedIssue.timeImpactDays} Calendar Days` : 'No EOT claimed'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PART 2: WHERE THE ISSUE REACHED (CURRENT STATUS & STAGE) */}
              <div className="space-y-3">
                <div className="bg-slate-100 dark:bg-slate-900/80 px-3 py-1.5 rounded-lg border-l-4 border-emerald-600">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    PART 2: Current Status & Progress Stage (Where the Issue Reached)
                  </h3>
                </div>

                <div className="bg-emerald-50/40 dark:bg-emerald-950/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/40 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 dark:border-emerald-800/40 pb-2.5 text-xs">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase text-emerald-700 dark:text-emerald-400 block">Current Reached Milestone Stage</span>
                      <span className="font-extrabold text-slate-900 dark:text-white text-sm">
                        {selectedIssue.currentStage}
                      </span>
                    </div>
                    <span className={`self-start sm:self-auto text-2xs font-extrabold px-2.5 py-1 rounded-lg border ${getStatusBadgeClass(selectedIssue.currentStatus)}`}>
                      {selectedIssue.currentStatus}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Latest Progress Summary & Evaluation Findings</span>
                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans font-medium">
                      {selectedIssue.latestProgressSummary}
                    </p>
                  </div>

                  {selectedIssue.currentBottleneck && (
                    <div className="bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200 dark:border-amber-900/50 flex items-start gap-2 text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-800 dark:text-amber-300 block text-[10px] uppercase">Active Bottleneck / Pending Action Item</span>
                        <span className="text-amber-900 dark:text-amber-200 font-medium">{selectedIssue.currentBottleneck}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* PART 3: TEAM TRANSFER RECORD & COURSE OF ACTION HISTORY */}
              <div className="space-y-3">
                <div className="bg-slate-100 dark:bg-slate-900/80 px-3 py-1.5 rounded-lg border-l-4 border-purple-600 flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-purple-600" />
                    PART 3: Team Transfer & Handover Trail (Previous Team Action & Next Course)
                  </h3>
                </div>

                {selectedIssue.transfers.length === 0 ? (
                  <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
                    No team transfers recorded yet. The issue is currently managed by the initial receiving team ({selectedIssue.submittedTo}).
                  </div>
                ) : (
                  <div className="space-y-3 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-purple-200 dark:before:bg-purple-900/60 before:z-0">
                    {selectedIssue.transfers.map((tr, index) => (
                      <div 
                        key={tr.id || index} 
                        className="relative z-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-xs space-y-2 ml-7"
                      >
                        {/* Timeline dot */}
                        <div className="absolute -left-[31px] top-4 w-4 h-4 rounded-full bg-purple-600 text-white flex items-center justify-center text-[9px] font-bold shadow-xs">
                          {index + 1}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 dark:border-slate-800 pb-2">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-100 flex-wrap">
                            <span className="text-slate-500 font-normal">From:</span>
                            <span className="text-slate-900 dark:text-white font-extrabold">{tr.transferredFrom}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                            <span className="text-slate-500 font-normal">To:</span>
                            <span className="text-purple-700 dark:text-purple-300 font-extrabold">{tr.transferredTo}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {(() => {
                              const deptRecords = getDepartmentTimeRecords(selectedIssue);
                              const stepRec = deptRecords[index];
                              if (!stepRec) return null;
                              return (
                                <span className="text-[10px] font-mono font-extrabold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-purple-600 shrink-0" />
                                  Time in Dept: {stepRec.daysTaken}d ({stepRec.startDate} → {stepRec.endDate})
                                </span>
                              );
                            })()}
                            <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/60 dark:border-slate-700">
                              Transfer Date: {tr.transferDate}
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs pt-1">
                          <div className="space-y-1 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Trigger / Reason for Transfer</span>
                            <p className="text-slate-700 dark:text-slate-300 leading-normal">{tr.transferReason}</p>
                          </div>
                          <div className="space-y-1 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg">
                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Action Taken by Previous Team</span>
                            <p className="text-slate-700 dark:text-slate-300 leading-normal">{tr.actionTakenByPreviousTeam}</p>
                          </div>
                        </div>

                        <div className="bg-purple-50/70 dark:bg-purple-950/30 p-3 rounded-lg border border-purple-100 dark:border-purple-900/40 text-xs space-y-1">
                          <span className="text-[10px] font-black uppercase text-purple-700 dark:text-purple-300 block flex items-center gap-1">
                            <ChevronRight className="w-3 h-3 text-purple-600" /> Next Course of Action Recommended
                          </span>
                          <p className="text-purple-950 dark:text-purple-100 font-semibold leading-relaxed">
                            {tr.recommendedCourseOfAction}
                          </p>
                          {tr.transferredBy && (
                            <span className="text-[10px] text-purple-500 dark:text-purple-400 block pt-1 font-mono text-right">
                              Transferred By: {tr.transferredBy}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PART 4: STATUS HISTORY & USER TRACKER AUDIT TRAIL */}
              <div className="space-y-3">
                <div className="bg-slate-100 dark:bg-slate-900/80 px-3 py-1.5 rounded-lg border-l-4 border-blue-600 flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-blue-600" />
                    PART 4: Status History & User Tracker Audit Trail
                  </h3>
                  <button
                    onClick={() => {
                      setHistoryNewStatusInput(selectedIssue.currentStatus);
                      setShowHistoryModal(true);
                    }}
                    className="no-print text-2xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" /> Log Status Update / Change Note
                  </button>
                </div>

                {(!selectedIssue.history || selectedIssue.history.length === 0) ? (
                  <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center text-xs text-slate-400">
                    No status updates logged yet. Initial submission recorded on {selectedIssue.submittedDate} by {selectedIssue.submittedBy}.
                  </div>
                ) : (
                  <div className="space-y-2.5 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-blue-200 dark:before:bg-blue-900/60 before:z-0">
                    {selectedIssue.history.map((hist, hIdx) => (
                      <div
                        key={hist.id || hIdx}
                        className="relative z-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-xl shadow-xs text-xs space-y-1.5 ml-7"
                      >
                        <div className="absolute -left-[31px] top-3.5 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-bold shadow-xs">
                          {selectedIssue.history.length - hIdx}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-100 dark:border-slate-800 pb-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                              <UserIcon className="w-3 h-3 text-blue-600" />
                              {hist.user}
                            </span>
                            <span className="text-[10px] font-mono font-bold text-slate-400">
                              {hist.timestamp}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase">
                              {hist.changeType || 'Status Change'}
                            </span>
                            {hist.previousStatus !== hist.newStatus && (
                              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                {hist.previousStatus} → {hist.newStatus}
                              </span>
                            )}
                          </div>
                        </div>

                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-sans text-xs">
                          {hist.notes}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* PART 5: LESSONS LEARNED & RETROSPECTIVE REVIEW */}
              <div className="space-y-3">
                <div className="bg-slate-100 dark:bg-slate-900/80 px-3 py-1.5 rounded-lg border-l-4 border-teal-600 flex justify-between items-center">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                    PART 5: Lessons Learned & Retrospective Review
                  </h3>
                  <button
                    onClick={() => {
                      setLessonsInput(selectedIssue.lessonsLearned || '');
                      setReviewNotesInput(selectedIssue.reviewNotes || '');
                      setShowLessonsModal(true);
                    }}
                    className="no-print text-2xs font-bold text-teal-700 dark:text-teal-300 hover:underline flex items-center gap-1 bg-teal-50 dark:bg-teal-950/60 px-2.5 py-1 rounded-lg border border-teal-200 dark:border-teal-800 cursor-pointer"
                  >
                    <PenTool className="w-3 h-3" /> Record / Edit Lessons Learned
                  </button>
                </div>

                {selectedIssue.lessonsLearned ? (
                  <div className="bg-gradient-to-br from-teal-50/60 to-emerald-50/40 dark:from-teal-950/30 dark:to-emerald-950/20 p-4 rounded-xl border border-teal-200/80 dark:border-teal-800/50 space-y-2.5">
                    <div className="flex justify-between items-center border-b border-teal-200/60 dark:border-teal-800/40 pb-2">
                      <div className="flex items-center gap-1.5 text-teal-800 dark:text-teal-300 text-xs font-black uppercase tracking-wider">
                        <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                        Key Lesson & Strategic Risk Prevention Takeaway
                      </div>
                      {selectedIssue.lessonsLearnedUpdatedBy && (
                        <div className="text-[10px] font-mono text-teal-700 dark:text-teal-400 font-bold">
                          Logged By: {selectedIssue.lessonsLearnedUpdatedBy} {selectedIssue.lessonsLearnedUpdatedAt ? `(${selectedIssue.lessonsLearnedUpdatedAt})` : ''}
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-slate-800 dark:text-slate-100 leading-relaxed font-sans font-medium italic bg-white/80 dark:bg-slate-900/60 p-3 rounded-lg border border-teal-100 dark:border-teal-900/40">
                      "{selectedIssue.lessonsLearned}"
                    </p>

                    {selectedIssue.reviewNotes && (
                      <div className="pt-1">
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                          Additional Case Review Notes & Recommendations
                        </span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-sans leading-normal">
                          {selectedIssue.reviewNotes}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-slate-50 dark:bg-slate-900/30 p-5 rounded-xl border border-dashed border-teal-300 dark:border-teal-800/60 text-center space-y-2">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      No explicit lesson learned recorded for this issue yet. Recording lessons learned allows future project managers to review resolved challenges and avoid repeating contractual or technical errors.
                    </p>
                    <button
                      onClick={() => {
                        setLessonsInput('');
                        setReviewNotesInput('');
                        setShowLessonsModal(true);
                      }}
                      className="no-print inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/60 px-3 py-1.5 rounded-lg border border-teal-200 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/80 cursor-pointer"
                    >
                      <PenTool className="w-3.5 h-3.5" /> Record Lessons Learned Now
                    </button>
                  </div>
                )}
              </div>

              {/* Sheet Footer Signatures */}
              <div className="pt-6 border-t border-slate-200 dark:border-slate-700 grid grid-cols-3 gap-4 text-center text-xs text-slate-500 dark:text-slate-400">
                <div>
                  <div className="h-8 border-b border-dashed border-slate-300 dark:border-slate-600 mb-1" />
                  <span className="font-bold text-[10px] uppercase block">Submitted / Verified By</span>
                  <span className="text-[10px]">Resident Engineer / Representative</span>
                </div>
                <div>
                  <div className="h-8 border-b border-dashed border-slate-300 dark:border-slate-600 mb-1" />
                  <span className="font-bold text-[10px] uppercase block">Transfer Handover By</span>
                  <span className="text-[10px]">Previous Team Lead</span>
                </div>
                <div>
                  <div className="h-8 border-b border-dashed border-slate-300 dark:border-slate-600 mb-1" />
                  <span className="font-bold text-[10px] uppercase block">Received & Endorsed By</span>
                  <span className="text-[10px]">ERA Directorate / Steering Committee</span>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-12 rounded-2xl text-center text-slate-400">
              Select or create an issue to view its 1-Page Log Sheet.
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: NEW ISSUE ENTRY */}
      <AnimatePresence>
        {showNewIssueModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl space-y-4 text-slate-800 dark:text-slate-100"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
                <h3 className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <Plus className="w-5 h-5 text-blue-500" /> Log New Contractual / Project Issue
                </h3>
                <button
                  onClick={() => setShowNewIssueModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Automatic Timestamp & User Tracker Info Box */}
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-3 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <span className="font-extrabold text-blue-900 dark:text-blue-200 block">Automatic Timestamp Tracking</span>
                    <span className="text-[11px] text-blue-700 dark:text-blue-300">
                      Captured Time: <strong className="font-mono font-bold">{new Date().toISOString().replace('T', ' ').substring(0, 16)}</strong>
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">System Logger</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                    <UserIcon className="w-3 h-3 text-blue-600" /> {currentUsername}
                  </span>
                </div>
              </div>

              <form onSubmit={handleCreateIssue} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold block mb-1">Issue Reference Code <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      value={newIssue.issueCode}
                      onChange={(e) => setNewIssue({ ...newIssue, issueCode: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Category</label>
                    <select
                      value={newIssue.category}
                      onChange={(e) => setNewIssue({ ...newIssue, category: e.target.value as any })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                    >
                      <option value="Contractual Claim">Contractual Claim</option>
                      <option value="Right of Way (ROW)">Right of Way (ROW)</option>
                      <option value="Design Revision">Design Revision</option>
                      <option value="Financial/Payment">Financial/Payment</option>
                      <option value="EOT Request">EOT Request</option>
                      <option value="Technical/Quality">Technical/Quality</option>
                      <option value="Safety/Environmental">Safety/Environmental</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold block mb-1">Issue Title / Subject <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Brief descriptive title..."
                    value={newIssue.title}
                    onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="font-bold block mb-1">Date Submitted</label>
                    <input
                      type="date"
                      value={newIssue.submittedDate}
                      onChange={(e) => setNewIssue({ ...newIssue, submittedDate: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Reporter / Submitted By <span className="text-rose-500">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="Name or role of reporter..."
                      value={newIssue.submittedBy || currentUsername}
                      onChange={(e) => setNewIssue({ ...newIssue, submittedBy: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Submitted To</label>
                    <input
                      type="text"
                      value={newIssue.submittedTo}
                      onChange={(e) => setNewIssue({ ...newIssue, submittedTo: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="font-bold block mb-1">Contract / Clause Ref</label>
                    <input
                      type="text"
                      placeholder="e.g. FIDIC 8.4"
                      value={newIssue.clauseReference}
                      onChange={(e) => setNewIssue({ ...newIssue, clauseReference: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Required Days (Contract)</label>
                    <input
                      type="number"
                      placeholder="e.g. 14"
                      value={newIssue.requiredDaysContract || ''}
                      onChange={(e) => setNewIssue({ ...newIssue, requiredDaysContract: parseInt(e.target.value) || undefined })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Financial Exposure</label>
                    <input
                      type="number"
                      value={newIssue.financialImpactEtb}
                      onChange={(e) => setNewIssue({ ...newIssue, financialImpactEtb: parseFloat(e.target.value) || 0 })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Time Exposure (Days)</label>
                    <input
                      type="number"
                      value={newIssue.timeImpactDays}
                      onChange={(e) => setNewIssue({ ...newIssue, timeImpactDays: parseInt(e.target.value) || 0 })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold block mb-1">Issue Description / Original Problem Statement <span className="text-rose-500">*</span></label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Provide a detailed description of the issue, site conditions, contract impact, or cause when submitted..."
                    value={newIssue.initialDescription}
                    onChange={(e) => setNewIssue({ ...newIssue, initialDescription: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold block mb-1">Priority Level <span className="text-rose-500">*</span></label>
                    <select
                      value={newIssue.priority}
                      onChange={(e) => setNewIssue({ ...newIssue, priority: e.target.value as any })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-bold"
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Current Milestone Stage</label>
                    <input
                      type="text"
                      value={newIssue.currentStage}
                      onChange={(e) => setNewIssue({ ...newIssue, currentStage: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowNewIssueModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
                  >
                    Create Issue Entry
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: RECORD TEAM TRANSFER */}
      <AnimatePresence>
        {showAddTransferModal && selectedIssue && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 max-w-xl w-full shadow-xl space-y-4 text-slate-800 dark:text-slate-100"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
                <h3 className="text-base font-bold flex items-center gap-2 text-purple-600 dark:text-purple-400">
                  <History className="w-5 h-5" /> Record Team Transfer / Escalation Handover
                </h3>
                <button
                  onClick={() => setShowAddTransferModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="bg-purple-50 dark:bg-purple-950/30 p-3 rounded-xl border border-purple-100 dark:border-purple-900/50 text-xs space-y-1">
                <span className="font-bold text-purple-900 dark:text-purple-200 block">Issue: {selectedIssue.issueCode}</span>
                <span className="text-purple-700 dark:text-purple-300 truncate block">{selectedIssue.title}</span>
                {(() => {
                  const lastTr = selectedIssue.transfers && selectedIssue.transfers.length > 0
                    ? selectedIssue.transfers[selectedIssue.transfers.length - 1]
                    : null;
                  const prevStartDate = lastTr ? lastTr.transferDate : selectedIssue.submittedDate;
                  const prevDept = lastTr ? lastTr.transferredTo : (selectedIssue.submittedTo || 'Initial Reviewer');

                  const start = new Date(prevStartDate);
                  const end = new Date(newTransfer.transferDate || new Date());
                  const diffDays = Math.max(0, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));

                  return (
                    <div className="pt-1.5 border-t border-purple-200/60 dark:border-purple-800/60 flex items-center justify-between text-[11px] flex-wrap gap-1">
                      <span className="text-purple-800 dark:text-purple-300 font-medium">
                        Handling time in current team (<strong className="font-bold">{prevDept}</strong>):
                      </span>
                      <span className="font-mono font-extrabold text-purple-900 dark:text-purple-100 bg-purple-100 dark:bg-purple-900/80 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-700">
                        {diffDays} Calendar Days ({prevStartDate} → {newTransfer.transferDate || 'Today'})
                      </span>
                    </div>
                  );
                })()}
              </div>

              <form onSubmit={handleAddTransfer} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold block mb-1">Transfer Date</label>
                    <input
                      type="date"
                      required
                      value={newTransfer.transferDate}
                      onChange={(e) => setNewTransfer({ ...newTransfer, transferDate: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Transferred By (Officer)</label>
                    <input
                      type="text"
                      placeholder="e.g. Eng. Solomon Tadesse"
                      value={newTransfer.transferredBy}
                      onChange={(e) => setNewTransfer({ ...newTransfer, transferredBy: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold block mb-1">Transferred From (Previous Team)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Resident Engineer Site Team"
                      value={newTransfer.transferredFrom}
                      onChange={(e) => setNewTransfer({ ...newTransfer, transferredFrom: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="font-bold block mb-1">Transferred To (Next Authority)</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ERA Steering Committee"
                      value={newTransfer.transferredTo}
                      onChange={(e) => setNewTransfer({ ...newTransfer, transferredTo: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold block mb-1">Reason / Trigger for Transfer</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Exceeded delegated financial approval limit..."
                    value={newTransfer.transferReason}
                    onChange={(e) => setNewTransfer({ ...newTransfer, transferReason: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">Action Taken by Previous Team Prior to Handover</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Details of verification, impact calculations, or site visits completed before transfer..."
                    value={newTransfer.actionTakenByPreviousTeam}
                    onChange={(e) => setNewTransfer({ ...newTransfer, actionTakenByPreviousTeam: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">Recommended Next Course of Action</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Clear recommended decision, authorization, or legal step for the receiving team..."
                    value={newTransfer.recommendedCourseOfAction}
                    onChange={(e) => setNewTransfer({ ...newTransfer, recommendedCourseOfAction: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowAddTransferModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold"
                  >
                    Record & Hand Over
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: EDIT ISSUE STATUS / STAGE */}
      <AnimatePresence>
        {showEditIssueModal && selectedIssue && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 max-w-xl w-full shadow-xl space-y-4 text-slate-800 dark:text-slate-100"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
                <h3 className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                  <Edit2 className="w-5 h-5 text-blue-500" /> Update Current Issue Status & Progress
                </h3>
                <button
                  onClick={() => setShowEditIssueModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateIssueDetails} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold block mb-1">Current Status</label>
                    <select
                      value={selectedIssue.currentStatus}
                      onChange={(e) => {
                        const updated = issuesList.map(item => item.id === selectedIssue.id ? { ...item, currentStatus: e.target.value as any } : item);
                        saveIssues(updated, 'Status updated');
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                    >
                      <option value="Submitted / Under Review">Submitted / Under Review</option>
                      <option value="In Progress / Evaluation">In Progress / Evaluation</option>
                      <option value="Transferred / Escalated">Transferred / Escalated</option>
                      <option value="Resolved / Approved">Resolved / Approved</option>
                      <option value="Rejected / Closed">Rejected / Closed</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold block mb-1">Current Milestone Stage Name</label>
                    <input
                      type="text"
                      value={selectedIssue.currentStage}
                      onChange={(e) => {
                        const updated = issuesList.map(item => item.id === selectedIssue.id ? { ...item, currentStage: e.target.value } : item);
                        saveIssues(updated, 'Stage updated');
                      }}
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold block mb-1">Latest Progress Summary (Where the issue reached)</label>
                  <textarea
                    rows={3}
                    value={selectedIssue.latestProgressSummary}
                    onChange={(e) => {
                      const updated = issuesList.map(item => item.id === selectedIssue.id ? { ...item, latestProgressSummary: e.target.value } : item);
                      saveIssues(updated, 'Summary updated');
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1">Active Bottleneck / Blockers</label>
                  <input
                    type="text"
                    value={selectedIssue.currentBottleneck || ''}
                    onChange={(e) => {
                      const updated = issuesList.map(item => item.id === selectedIssue.id ? { ...item, currentBottleneck: e.target.value } : item);
                      saveIssues(updated, 'Bottleneck updated');
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2"
                  />
                </div>

                <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowEditIssueModal(false)}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold"
                  >
                    Done
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 4: RECORD / EDIT LESSONS LEARNED */}
      <AnimatePresence>
        {showLessonsModal && selectedIssue && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 max-w-xl w-full shadow-xl space-y-4 text-slate-800 dark:text-slate-100"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
                <h3 className="text-base font-bold flex items-center gap-2 text-teal-700 dark:text-teal-400">
                  <BookOpen className="w-5 h-5 text-teal-600" /> Record Lessons Learned & Retrospective Review
                </h3>
                <button
                  onClick={() => setShowLessonsModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="bg-teal-50 dark:bg-teal-950/30 p-3 rounded-xl border border-teal-100 dark:border-teal-900/50 text-xs space-y-1">
                <span className="font-bold text-teal-900 dark:text-teal-200 block">Issue Code: {selectedIssue.issueCode}</span>
                <span className="text-teal-800 dark:text-teal-300 font-medium truncate block">{selectedIssue.title}</span>
                <span className="text-[10px] text-teal-600 dark:text-teal-400 font-mono block pt-1">
                  Reviewer Attribution: <strong className="font-bold">{currentUsername}</strong>
                </span>
              </div>

              <form onSubmit={handleSaveLessonsLearned} className="space-y-4 text-xs">
                <div>
                  <label className="font-bold block mb-1.5 text-slate-800 dark:text-slate-200">
                    Key Lesson Learned & Risk Prevention Takeaway <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Document root cause insights, procedural improvements, FIDIC clause interpretations, or contract management strategies learned from handling this issue..."
                    value={lessonsInput}
                    onChange={(e) => setLessonsInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-teal-500 font-sans leading-relaxed"
                  />
                </div>

                <div>
                  <label className="font-bold block mb-1.5 text-slate-800 dark:text-slate-200">
                    Additional Case Review Notes & Management Recommendations
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Provide recommendations for future project stages, standard operating procedures, or steering committee policy changes..."
                    value={reviewNotesInput}
                    onChange={(e) => setReviewNotesInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-teal-500 font-sans"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowLessonsModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" /> Save Lessons Learned
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 5: LOG STATUS UPDATE / AUDIT NOTE */}
      <AnimatePresence>
        {showHistoryModal && selectedIssue && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 max-w-lg w-full shadow-xl space-y-4 text-slate-800 dark:text-slate-100"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
                <h3 className="text-base font-bold flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <History className="w-5 h-5 text-blue-600" /> Log Status Update & Audit Trail
                </h3>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-xl border border-blue-100 dark:border-blue-900/50 text-xs space-y-1">
                <span className="font-bold text-blue-900 dark:text-blue-200 block">Issue Code: {selectedIssue.issueCode}</span>
                <span className="text-blue-800 dark:text-blue-300 font-medium truncate block">{selectedIssue.title}</span>
                <span className="text-[10px] text-blue-600 dark:text-blue-400 font-mono block pt-1">
                  User User Tracker: <strong className="font-bold">{currentUsername}</strong>
                </span>
              </div>

              <form onSubmit={handleAddManualHistoryNote} className="space-y-3 text-xs">
                <div>
                  <label className="font-bold block mb-1">New Issue Status (Optional Update)</label>
                  <select
                    value={historyNewStatusInput || selectedIssue.currentStatus}
                    onChange={(e) => setHistoryNewStatusInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5"
                  >
                    <option value="Submitted / Under Review">Submitted / Under Review</option>
                    <option value="In Progress / Evaluation">In Progress / Evaluation</option>
                    <option value="Transferred / Escalated">Transferred / Escalated</option>
                    <option value="Resolved / Approved">Resolved / Approved</option>
                    <option value="Rejected / Closed">Rejected / Closed</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold block mb-1">
                    Status Change Reason / Progress Note <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Enter audit trail comments, action items completed, meeting outcomes, or status update explanations..."
                    value={historyNoteInput}
                    onChange={(e) => setHistoryNoteInput(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-3 focus:ring-2 focus:ring-blue-500 font-sans"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowHistoryModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <History className="w-4 h-4" /> Log History Entry
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 6: LESSONS LEARNED & RESOLVED ISSUES ARCHIVE REPOSITORY */}
      <AnimatePresence>
        {showArchiveModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl space-y-4 text-slate-800 dark:text-slate-100"
            >
              <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-3">
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2 text-teal-700 dark:text-teal-400">
                    <BookOpen className="w-5 h-5 text-teal-600" /> Resolved Issue Records & Lessons Learned Repository
                  </h3>
                  <p className="text-2xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Archived resolved and approved project issues stored for institutional knowledge, risk mitigation, and future contract reference.
                  </p>
                </div>
                <button
                  onClick={() => setShowArchiveModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>

              {/* Archive Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter archived issues or search lessons learned keywords..."
                  value={archiveSearchQuery}
                  onChange={(e) => setArchiveSearchQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:ring-2 focus:ring-teal-500 text-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Archived Issues List */}
              <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
                {(() => {
                  const filteredArchive = resolvedIssuesList.filter(item => 
                    (item.title || '').toLowerCase().includes(archiveSearchQuery.toLowerCase()) ||
                    (item.issueCode || '').toLowerCase().includes(archiveSearchQuery.toLowerCase()) ||
                    (item.lessonsLearned || '').toLowerCase().includes(archiveSearchQuery.toLowerCase()) ||
                    (item.category || '').toLowerCase().includes(archiveSearchQuery.toLowerCase())
                  );

                  if (filteredArchive.length === 0) {
                    return (
                      <div className="bg-slate-50 dark:bg-slate-900/40 p-8 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-2">
                        <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                        <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400">No Resolved Issues or Lessons Learned Found</h4>
                        <p className="text-2xs text-slate-400 max-w-md mx-auto">
                          When project issues are marked as "Resolved / Approved" or "Rejected / Closed", they are automatically removed from the active log table and stored here for long-term records and lessons learned.
                        </p>
                      </div>
                    );
                  }

                  return filteredArchive.map((item) => (
                    <div 
                      key={item.id}
                      className="bg-slate-50/80 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-700/80 p-4 rounded-xl space-y-2.5 transition hover:border-teal-300 dark:hover:border-teal-700"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-extrabold text-xs text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
                            {item.issueCode}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 uppercase">
                            {item.currentStatus}
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                            {item.category}
                          </span>
                        </div>

                        <div className="text-2xs text-slate-400 font-mono">
                          Submitted: {item.submittedDate} • By: {item.submittedBy}
                        </div>
                      </div>

                      <div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">{item.title}</h4>
                        <p className="text-2xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">{item.initialDescription}</p>
                      </div>

                      {item.lessonsLearned ? (
                        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-emerald-950/30 p-3 rounded-lg border border-teal-200/60 dark:border-teal-800/40 space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-bold text-teal-800 dark:text-teal-300 uppercase tracking-wider">
                            <span className="flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-teal-600" /> Recorded Lesson Learned
                            </span>
                            {item.lessonsLearnedUpdatedBy && (
                              <span className="font-mono text-teal-600 dark:text-teal-400">By {item.lessonsLearnedUpdatedBy}</span>
                            )}
                          </div>
                          <p className="text-xs text-slate-800 dark:text-slate-200 font-medium italic">
                            "{item.lessonsLearned}"
                          </p>
                          {item.reviewNotes && (
                            <p className="text-2xs text-slate-600 dark:text-slate-400 pt-1 border-t border-teal-100 dark:border-teal-900/40">
                              <strong>Review Notes:</strong> {item.reviewNotes}
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-800/40 text-2xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                          <span>No explicit lesson learned narrative recorded for this resolved issue yet.</span>
                          <button
                            onClick={() => {
                              setSelectedIssueId(item.id);
                              setLessonsInput('');
                              setReviewNotesInput('');
                              setShowLessonsModal(true);
                            }}
                            className="text-2xs font-bold text-teal-700 dark:text-teal-300 underline cursor-pointer"
                          >
                            Add Lesson Learned Now
                          </button>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-1 text-2xs">
                        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400 font-mono">
                          <span>Financial: Br. {(item.financialImpactEtb || 0).toLocaleString()}</span>
                          <span>Time: {item.timeImpactDays || 0} Days</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setSelectedIssueId(item.id);
                              setLessonsInput(item.lessonsLearned || '');
                              setReviewNotesInput(item.reviewNotes || '');
                              setShowLessonsModal(true);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 font-bold hover:bg-teal-100 cursor-pointer"
                          >
                            Edit Lessons Learned
                          </button>
                          <button
                            onClick={() => {
                              setSelectedIssueId(item.id);
                              setShowArchiveModal(false);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold hover:bg-slate-300 cursor-pointer"
                          >
                            View Details
                          </button>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-700 text-xs">
                <span className="text-slate-400 text-2xs">Total Archived Records: {resolvedIssuesList.length}</span>
                <button
                  onClick={() => setShowArchiveModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  Close Repository
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
