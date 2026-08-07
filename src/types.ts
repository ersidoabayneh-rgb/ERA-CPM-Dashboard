/**
 * Represents shared TypeScript types and data structures for the
 * Ethiopian Roads Administration ERP Dashboard application.
 */

export interface RowMetric {
  name: string;
  value: number;
  unit: string;
}

export interface RowCompensationItem {
  id: string;
  woreda: string;
  affectedPaps: number;
  compensationRequired: number; // in Million Birr
  compensationPaid: number; // in Million Birr
  unpaidBalance: number; // in Million Birr
  status: 'Unpaid' | 'Partially Paid' | 'Fully Paid' | 'In Progress';
  remarks: string;
}

export interface UtilityCompensationItem {
  id: string;
  utilityType: string; // e.g., 'Electric Power Lines', 'Telecom Cables', 'Water Supply Pipelines'
  ownerAgency: string; // e.g., 'EEP', 'ethio telecom', 'Water Board'
  quantity: string;     // e.g., '142 Poles', '4.2 Km'
  compensationRequired: number; // in Million Birr
  compensationPaid: number; // in Million Birr
  unpaidBalance: number; // in Million Birr
  status: 'Unpaid' | 'Partially Paid' | 'Fully Paid' | 'In Progress';
  remarks: string;
}

export interface RowStatusItem {
  id: string;
  from: string;
  to: string;
  length: string;
  status: string;
  remark: string;
}

export function formatAccounting(v: number, currency: string = 'Br.'): string {
  const num = typeof v === 'number' ? v : parseFloat(v as any) || 0;
  const absVal = Math.abs(num);
  const formattedNum = absVal.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  if (num < 0) {
    return `(${currency ? currency + ' ' : ''}${formattedNum})`;
  }
  return `${currency ? currency + ' ' : ''}${formattedNum}`;
}

export interface MonthlyProgress {
  month: string;
  originalPlan: number;
  revisedPlan: number;
  actual: number;
}

export interface SeriesItem {
  code: string;
  desc: string;
  contractAmt: number;
  execAmt: number;
  progress: number;
  contractPct?: number; // only for DB projects
}

export interface QtyItem {
  name: string;
  design: number;
  plan: number;
  exec: number;
}

export interface PlanSet {
  month: number;
  quarter: number;
  efy: number;
  todate: number;
}

export interface ProgressPlan {
  contractor: PlanSet;
  era: PlanSet;
  actual: PlanSet;
}

export interface LinearSegment {
  no: number;
  from: string;
  to: string;
  exec: number;
}

export interface LinearData {
  subgrade: LinearSegment[];
  capping: LinearSegment[];
  subbase: LinearSegment[];
  basecourse: LinearSegment[];
  asphalt: LinearSegment[];
}

export interface KpiAllocatedItem {
  goalId: string;
  goalName: string;
  goalWt: number;
  sscId: string;
  sscName: string;
  sscWt: number;
  itemId: string;
  desc: string;
  unit: string;
  itemWt: number;
  max: number;
  type: string; // 'pct' | 'yn' | 'auto'
  alloc: number;
  naActive?: boolean;
  isOverridden?: boolean;
}

export interface HistoryItem {
  timestamp: string;
  user: string;
  section: string;
  physicalProgress: number;
}

export interface WorkProgramActivity {
  id: string;
  name: string;
  duration: number;
  predecessors: string; // Comma separated IDs
  weight?: number;
  lag?: number;
  depType?: 'FS' | 'SS' | 'FF' | 'SF';
  predDetails?: { [predId: string]: { lag: number; depType: 'FS' | 'SS' | 'FF' | 'SF' } };
  start?: string;
  finish?: string;
  float?: number;
  critical?: boolean;
  est?: number;
  eft?: number;
  lst?: number;
  lft?: number;
  manualStart?: boolean;
  manualFinish?: boolean;
}

export interface BondGuarantee {
  sno: number;
  type: string;
  bank: string;
  amount: number;
  amountUsd?: number;
  issueDate: string;
  expireDate: string;
  status: 'Valid' | 'Recovered' | 'Expired' | 'N/A';
}

export interface ResourceMobilizationItem {
  id: string;
  desc: string;
  originalPlan: number;
  revisedPlan: number;
  available: number;
  deficiency: number;
  breakdown: string;
}

export interface MaterialProductionItem {
  id: string;
  desc: string;
  scope: string;
  thisMonth: number;
  totalToDate: number;
  used?: number;
  availableStock: number;
  remainingBalance: number;
}

export interface IpcItem {
  id: string;
  paymentNo: string;
  period?: string;
  submissionDate?: string;
  certificationDate?: string;
  grossBillEtb?: number;
  grossBillUsd?: number;
  priceAdjustmentEtb?: number;
  priceAdjustmentUsd?: number;
  advanceRepaymentEtb?: number;
  retentionEtb?: number;
  retentionUsd?: number;
  materialsOnSiteEtb?: number;
  certifiedEtb: number;
  certifiedUsd: number;
  status: 'Paid' | 'Unpaid' | 'Partially Paid';
  statusEtb?: 'Paid' | 'Unpaid' | 'Partially Paid';
  statusUsd?: 'Paid' | 'Unpaid' | 'Partially Paid';
  remarks?: string;
}

export interface PaymentItem {
  item: string;
  amount: number;
  percent: number;
}

export interface AnnualItem {
  year: number;
  amount: number;
  budget?: number;
  percent: number;
}

export interface IssueTransferRecord {
  id: string;
  transferDate: string;
  transferredFrom: string;
  transferredTo: string;
  transferReason: string;
  actionTakenByPreviousTeam: string;
  recommendedCourseOfAction: string;
  transferredBy?: string;
}

export interface IssueHistoryRecord {
  id: string;
  timestamp: string; // Formatted timestamp e.g. "2026-08-04 14:30"
  user: string; // User who made the change
  previousStatus?: string;
  newStatus: string;
  stage?: string;
  changeType?: 'Status Change' | 'Transfer Handover' | 'Creation' | 'Details Edit' | 'Lessons Learned Review' | string;
  notes?: string;
  bottleneck?: string;
}

export interface IssueLogItem {
  id: string;
  issueCode: string;
  title: string;
  category: 'Contractual Claim' | 'Right of Way (ROW)' | 'Design Revision' | 'Financial/Payment' | 'EOT Request' | 'Technical/Quality' | 'Safety/Environmental' | 'Technical/Design' | 'Material Testing' | 'Environmental/Safety' | string;
  submittedDate: string;
  submittedBy: string;
  submittedTo: string;
  clauseReference?: string;
  initialDescription: string;
  financialImpactEtb?: number;
  timeImpactDays?: number;
  requiredDaysContract?: number;
  priority: 'High' | 'Medium' | 'Low' | 'Critical';
  
  // Progress/Current status ("where the issue reached")
  currentStatus: 'Submitted / Under Review' | 'In Progress / Evaluation' | 'Transferred / Escalated' | 'Resolved / Approved' | 'Rejected / Closed';
  currentStage: string;
  latestProgressSummary: string;
  currentBottleneck?: string;
  
  // Lessons learned & retrospective review
  lessonsLearned?: string;
  lessonsLearnedUpdatedBy?: string;
  lessonsLearnedUpdatedAt?: string;
  reviewNotes?: string;
  
  // Status history timeline & user change log
  history?: IssueHistoryRecord[];
  
  // Transfer history records
  transfers: IssueTransferRecord[];
}

export type ProjectLifecycleStatus = 'In Progress' | 'Completed' | 'Completed and Closed' | 'Terminated' | 'Suspended';

export interface Project {
  id: string;
  name: string;
  client: string;
  consultant: string;
  contractor: string;
  status?: ProjectLifecycleStatus;
  signDate: string;
  startDate: string;
  origDays: number;
  eotDays: number;
  interimEotDays?: number;
  variation: number; // In millions of Birr
  origAmount: number; // In millions of Birr
  revisedContractAmountEtb?: number;
  contractAmountEtb?: number;
  lengthKm: number;
  spurRoadLengthKm?: number;
  hasCappingLayer?: boolean;
  classification: string;
  contractorGrade?: string;
  contractType: 'DB' | 'DBB';
  programDirectorate?: string;
  pmo?: string;
  physicalProgress: number;
  provisionalSum: number;
  progressPlanLabels: {
    monthLabel: string;
    quarterLabel: string;
    efyLabel: string;
  };
  lastModifiedBy?: string | null;
  lastModifiedAt?: string | null;
  lastModifiedSection?: string | null;
  approvedBy?: string | null;
  approvedAt?: string | null;
  approverRole?: string | null;
  images: string[];
  rowMetrics: RowMetric[];
  rowCompensation?: RowCompensationItem[];
  utilityCompensation?: UtilityCompensationItem[];
  rowStatus?: RowStatusItem[];
  monthly: MonthlyProgress[];
  series: SeriesItem[];
  quantities: QtyItem[];
  progressPlan: ProgressPlan;
  progressPlanHistory?: ProgressPlanHistoryItem[];
  payment: PaymentItem[];
  annual: AnnualItem[];
  linear: LinearData;
  linearSpur?: LinearData;
  kpiAllocated: KpiAllocatedItem[];
  kpiDeletedSubgroups?: string[];
  kpiDeletedItems?: string[];
  history: HistoryItem[];
  workProgram: WorkProgramActivity[];
  bonds: BondGuarantee[];
  resourceMobilization?: ResourceMobilizationItem[];
  materialProduction?: MaterialProductionItem[];
  ipcTracker?: IpcItem[];
  usdExchangeRate?: number;
  risks?: RiskItem[];
  issues?: IssueLogItem[];
  aiChatHistory?: any[];
  documents?: ProjectDocument[];
}

export interface ProjectDocument {
  id: string;
  name: string;
  type: 'contract' | 'monthly_report' | 'other' | string;
  fileName: string;
  uploadedAt: string;
  uploadedBy: string;
  fileSize: string;
  description?: string;
  fileData?: string;
  fileType?: string;
}

export interface RiskItem {
  id: string;
  category: string;
  description: string;
  probability: number; // 1-5
  impact: number;      // 1-5
  mitigation: string;
  status: 'Active' | 'Mitigated' | 'Retired';
}

export interface User {
  username: string;
  password?: string;
  role: 'master_admin' | 'cpm_admin' | 'directorate_admin' | 'pmo_admin' | 'admin' | 'editor' | 'viewer' | 'approver';
  accessibleProjects: string[]; // Project IDs
  assignedPages?: string[]; // Tab/Page IDs this user is authorized to edit
  hasApprovalCredential?: boolean; // Whether user has approval authority before data incorporation
  assignedDirectorate?: string; // For directorate_admin
  assignedPmo?: string; // For pmo_admin
  assignedBy?: string; // Username who created this credential
  status?: 'Active' | 'Inactive'; // Credential status
  ipAddress?: string; // Registered IP address
  linkedIpAddress?: string; // Linked IP address confirmed by admin
  isPendingApproval?: boolean; // Flag if self-registered and pending admin approval
}

export interface EditablePageOption {
  id: string;
  name: string;
  description: string;
}

export const ALL_EDITABLE_PAGES: EditablePageOption[] = [
  { id: 'dash', name: '📊 Dashboard Overview', description: 'Main project KPIs, physical progress slider, field photos' },
  { id: 'seriesEditor', name: '📋 Financial BOQ & Payment Schedules', description: 'Division series items, bill of quantities, payment schedules' },
  { id: 'issueLog', name: '🚩 Issue & Claims Log', description: 'Contractual claims, bottleneck tracking, transfer histories' },
  { id: 'linear', name: '📏 Linear Elevation Diagram', description: 'Chainage segment progress elevation mapping' },
  { id: 'rowEditor', name: '🛣️ Utilities & Right of Way (ROW)', description: 'PAP compensation, utility relocation & obstruction logs' },
  { id: 'progressPlanEditor', name: '📈 Progress Comparisons Plan', description: 'Contractor vs ERA vs Actual milestone plans' },
  { id: 'qtyEditor', name: '📐 Quantities Log', description: 'Design, planned, and executed pay quantity tracking' },
  { id: 'bonds', name: '🔒 Bonds & Guarantees', description: 'Bank guarantees, performance & advance security status' },
  { id: 'kpiEditor', name: '🎯 KPI Scorecard & Weights', description: 'Key performance indicators and evaluation weight overrides' },
  { id: 'monthly', name: '📅 Monthly S-Curve Progress', description: 'Monthly planned vs actual cumulative progress S-Curves' },
  { id: 'workProgram', name: '📅 Work Program CPM Schedule', description: 'CPM schedule activities, durations, dependencies' },
  { id: 'resourceMobilization', name: '🚚 Logistics & Resources', description: 'Equipment mobilization, plant availability, stockpiles' },
  { id: 'risks', name: '⚠️ Project Risk Register', description: 'Identified risk matrix, probabilities, and mitigations' },
  { id: 'analysis', name: '📊 Performance Analysis', description: 'Financial & physical performance analytics' },
  { id: 'documentation', name: '📁 Project Documentation', description: 'Dossier files, monthly reports, contract upload library' },
  { id: 'workspace', name: '☁️ Workspace Notes', description: 'Interactive collaborative scratchpad & design notes' }
];

export interface ApprovalRequest {
  id: string;
  projectId: string;
  projectName: string;
  requestedBy: string;
  requestedAt: string;
  section: string;
  pageId?: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  snapshotData: any; // Full Project payload at request time
}

export interface ProgressPlanHistoryItem {
  id: string;
  monthLabel: string;
  efyLabel: string;
  contractorMonth: number;
  contractorEfy: number;
  eraMonth: number;
  eraEfy: number;
  actualMonth: number;
  actualEfy: number;
}
