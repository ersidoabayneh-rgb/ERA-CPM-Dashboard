import { 
  Project, 
  MonthlyProgress, 
  SeriesItem, 
  WorkProgramActivity, 
  RowMetric, 
  KpiAllocatedItem,
  LinearData,
  RiskItem
} from '../types';

export const MILLION = 1_000_000;

export const defaultRoadRisks = (): RiskItem[] => [
  {
    id: 'risk_1',
    category: 'Right of Way',
    description: 'Delays in clearing electric poles, water mains, and high compensation demands stalling excavation in specific KM sections.',
    probability: 4,
    impact: 5,
    mitigation: 'Proactive liaison with regional utility departments (EEU, Tele) and pre-disbursed compensation funds.',
    status: 'Active'
  },
  {
    id: 'risk_2',
    category: 'Environmental',
    description: 'Heavy seasonal rain causing landslides or washout of completed subgrade and earthworks on hilly road terrains.',
    probability: 3,
    impact: 4,
    mitigation: 'Early completion of masonry retaining walls, proper cross-drainage culverts, and suspension of wet earthworks during peak rainfall.',
    status: 'Active'
  },
  {
    id: 'risk_3',
    category: 'Materials',
    description: 'Aggregate base course / rock aggregate supply shortfalls due to local community quarry disputes or crusher breakdowns.',
    probability: 3,
    impact: 3,
    mitigation: 'Establish a secondary quarry crushing site, contract external aggregate suppliers, and secure regional community agreements early.',
    status: 'Active'
  },
  {
    id: 'risk_4',
    category: 'Technical',
    description: 'Subgrade soil inconsistencies (expansive Black Cotton Soil) requiring larger-than-planned sub-excavation depth & capping replacement.',
    probability: 4,
    impact: 3,
    mitigation: 'Thorough laboratory testing of borrow areas, replacement with high-quality granular capping, or lime/cement stabilization.',
    status: 'Mitigated'
  },
  {
    id: 'risk_5',
    category: 'Logistics',
    description: 'Contractor machinery deficit, specifically severe shortages of active asphalt concrete pavers and functional motor graders.',
    probability: 2,
    impact: 4,
    mitigation: 'Enforce equipment mobilisation schedules under FIDIC Sub-clause 4.17 and establish partner repair workshops in neighboring hubs.',
    status: 'Active'
  },
  {
    id: 'risk_6',
    category: 'Financial',
    description: 'Rapid fuel price inflation and exchange rate fluctuations impacting import of bitumen and specialized spare parts.',
    probability: 5,
    impact: 4,
    mitigation: 'Process regular price adjustment certificates under Sub-clause 13.8 and request early forex priority allocation.',
    status: 'Active'
  }
];

export function parseStation(s: string): number {
  if (!s) return 0;
  const m = s.match(/(?:Km\s*)?(\d+)\+(\d+)/i);
  if (m) return parseInt(m[1], 10) + parseInt(m[2], 10) / 1000;
  const num = parseFloat(s.replace(/[^0-9.]/g, ''));
  return isNaN(num) ? 0 : num;
}

const baseRows = [
  { no: 1, from: 'Km 00+000', to: 'Km 01+000' },
  { no: 2, from: 'Km 02+000', to: 'Km 03+000' },
  { no: 3, from: 'Km 04+000', to: 'Km 05+000' },
  { no: 4, from: 'Km 05+000', to: 'Km 06+000' },
  { no: 5, from: 'Km 06+300', to: 'Km 07+300' },
  { no: 6, from: 'Km 07+600', to: 'Km 08+600' },
  { no: 7, from: 'Km 08+900', to: 'Km 09+900' },
  { no: 8, from: 'Km 10+200', to: 'Km 11+200' },
  { no: 9, from: 'Km 11+500', to: 'Km 12+500' },
  { no: 10, from: 'Km 12+800', to: 'Km 13+800' },
  { no: 11, from: 'Km 14+100', to: 'Km 15+100' },
  { no: 12, from: 'Km 15+400', to: 'Km 16+400' },
  { no: 13, from: 'Km 16+700', to: 'Km 17+700' },
  { no: 14, from: 'Km 18+000', to: 'Km 19+000' },
  { no: 15, from: 'Km 19+300', to: 'Km 20+300' },
  { no: 16, from: 'Km 20+600', to: 'Km 21+600' },
  { no: 17, from: 'Km 21+900', to: 'Km 22+900' }
];

const cappingOverrides: Record<number, [string, string]> = {
  8: ['Km 10+293', 'Km 11+293'],
  9: ['Km 11+625', 'Km 12+625'],
  10: ['Km 12+956', 'Km 13+956'],
  11: ['Km 14+288', 'Km 15+288'],
  12: ['Km 15+619', 'Km 16+619'],
  13: ['Km 16+950', 'Km 17+950'],
  14: ['Km 18+282', 'Km 19+282'],
  15: ['Km 19+613', 'Km 20+613'],
  16: ['Km 20+945', 'Km 21+945'],
  17: ['Km 22+276', 'Km 23+276']
};

export function generateLinearData(): LinearData {
  const o: Partial<LinearData> = {};
  (['subgrade', 'capping', 'subbase', 'basecourse', 'asphalt'] as const).forEach(s => {
    o[s] = baseRows.map(r => {
      let f = r.from;
      let t = r.to;
      if (s === 'capping' && cappingOverrides[r.no]) {
        f = cappingOverrides[r.no][0];
        t = cappingOverrides[r.no][1];
      }
      return {
        no: r.no,
        from: f,
        to: t,
        exec: parseStation(t) - parseStation(f)
      };
    });
  });
  return o as LinearData;
}

const baseSpurRows = [
  { no: 1, from: 'Km 00+000', to: 'Km 01+200' },
  { no: 2, from: 'Km 01+200', to: 'Km 02+500' },
  { no: 3, from: 'Km 02+800', to: 'Km 04+000' },
  { no: 4, from: 'Km 04+200', to: 'Km 05+500' },
  { no: 5, from: 'Km 05+800', to: 'Km 07+200' },
  { no: 6, from: 'Km 07+500', to: 'Km 08+800' }
];

export function generateSpurLinearData(): LinearData {
  const o: Partial<LinearData> = {};
  (['subgrade', 'capping', 'subbase', 'basecourse', 'asphalt'] as const).forEach(s => {
    o[s] = baseSpurRows.map(r => {
      return {
        no: r.no,
        from: r.from,
        to: r.to,
        exec: parseStation(r.to) - parseStation(r.from)
      };
    });
  });
  return o as LinearData;
}

export function getDefaultMonthly(): MonthlyProgress[] {
  return [
    { month: 'Dec-20', originalPlan: 0, revisedPlan: 0, actual: 0 },
    { month: 'Jan-21', originalPlan: 1, revisedPlan: 1, actual: 1 },
    { month: 'Feb-21', originalPlan: 4, revisedPlan: 3, actual: 3 },
    { month: 'Mar-21', originalPlan: 7, revisedPlan: 5, actual: 5 },
    { month: 'Apr-21', originalPlan: 11, revisedPlan: 6, actual: 6 },
    { month: 'May-21', originalPlan: 15, revisedPlan: 8, actual: 8 },
    { month: 'Jun-21', originalPlan: 18, revisedPlan: 10, actual: 10 },
    { month: 'Jul-21', originalPlan: 21, revisedPlan: 11, actual: 11 },
    { month: 'Aug-21', originalPlan: 24, revisedPlan: 13, actual: 13 },
    { month: 'Sep-21', originalPlan: 27, revisedPlan: 14, actual: 14 },
    { month: 'Oct-21', originalPlan: 30, revisedPlan: 16, actual: 16 },
    { month: 'Nov-21', originalPlan: 33, revisedPlan: 18, actual: 18 },
    { month: 'Dec-21', originalPlan: 37, revisedPlan: 19, actual: 19 },
    { month: 'Jan-22', originalPlan: 40, revisedPlan: 21, actual: 21 },
    { month: 'Feb-22', originalPlan: 43, revisedPlan: 23, actual: 23 },
    { month: 'Mar-22', originalPlan: 46, revisedPlan: 24, actual: 24 },
    { month: 'Apr-22', originalPlan: 49, revisedPlan: 26, actual: 26 },
    { month: 'May-22', originalPlan: 53, revisedPlan: 27, actual: 27 },
    { month: 'Jun-22', originalPlan: 56, revisedPlan: 29, actual: 29 },
    { month: 'Jul-22', originalPlan: 59, revisedPlan: 31, actual: 31 },
    { month: 'Aug-22', originalPlan: 62, revisedPlan: 32, actual: 32 },
    { month: 'Sep-22', originalPlan: 65, revisedPlan: 34, actual: 34 },
    { month: 'Oct-22', originalPlan: 68, revisedPlan: 36, actual: 36 },
    { month: 'Nov-22', originalPlan: 72, revisedPlan: 37, actual: 37 },
    { month: 'Dec-22', originalPlan: 75, revisedPlan: 39, actual: 39 },
    { month: 'Jan-23', originalPlan: 78, revisedPlan: 40, actual: 40 },
    { month: 'Feb-23', originalPlan: 81, revisedPlan: 42, actual: 42 },
    { month: 'Mar-23', originalPlan: 82, revisedPlan: 44, actual: 44 },
    { month: 'Apr-23', originalPlan: 85, revisedPlan: 45, actual: 45 },
    { month: 'May-23', originalPlan: 87, revisedPlan: 47, actual: 47 },
    { month: 'Jun-23', originalPlan: 89, revisedPlan: 49, actual: 49 },
    { month: 'Jul-23', originalPlan: 90, revisedPlan: 50, actual: 50 },
    { month: 'Aug-23', originalPlan: 92, revisedPlan: 52, actual: 52 },
    { month: 'Sep-23', originalPlan: 94, revisedPlan: 54, actual: 54 },
    { month: 'Oct-23', originalPlan: 96, revisedPlan: 55, actual: 55 },
    { month: 'Nov-23', originalPlan: 98, revisedPlan: 57, actual: 57 },
    { month: 'Dec-23', originalPlan: 100, revisedPlan: 58, actual: 58 },
    { month: 'Jan-24', originalPlan: 0, revisedPlan: 60, actual: 60 },
    { month: 'Feb-24', originalPlan: 0, revisedPlan: 62, actual: 62 },
    { month: 'Mar-24', originalPlan: 0, revisedPlan: 63, actual: 63 },
    { month: 'Apr-24', originalPlan: 0, revisedPlan: 65, actual: 65 },
    { month: 'May-24', originalPlan: 0, revisedPlan: 67, actual: 67 },
    { month: 'Jun-24', originalPlan: 0, revisedPlan: 68, actual: 68 },
    { month: 'Jul-24', originalPlan: 0, revisedPlan: 70, actual: 70 },
    { month: 'Aug-24', originalPlan: 0, revisedPlan: 71, actual: 71 },
    { month: 'Sep-24', originalPlan: 0, revisedPlan: 73, actual: 73 },
    { month: 'Oct-24', originalPlan: 0, revisedPlan: 75, actual: 75 },
    { month: 'Nov-24', originalPlan: 0, revisedPlan: 76, actual: 76 },
    { month: 'Dec-24', originalPlan: 0, revisedPlan: 78, actual: 78 },
    { month: 'Jan-25', originalPlan: 0, revisedPlan: 80, actual: 0 },
    { month: 'Feb-25', originalPlan: 0, revisedPlan: 81, actual: 0 },
    { month: 'Mar-25', originalPlan: 0, revisedPlan: 83, actual: 0 },
    { month: 'Apr-25', originalPlan: 0, revisedPlan: 84, actual: 0 },
    { month: 'May-25', originalPlan: 0, revisedPlan: 86, actual: 0 },
    { month: 'Jun-25', originalPlan: 0, revisedPlan: 88, actual: 0 },
    { month: 'Jul-25', originalPlan: 0, revisedPlan: 89, actual: 0 },
    { month: 'Aug-25', originalPlan: 0, revisedPlan: 91, actual: 0 },
    { month: 'Sep-25', originalPlan: 0, revisedPlan: 93, actual: 0 },
    { month: 'Oct-25', originalPlan: 0, revisedPlan: 94, actual: 0 },
    { month: 'Nov-25', originalPlan: 0, revisedPlan: 96, actual: 0 },
    { month: 'Dec-25', originalPlan: 0, revisedPlan: 97, actual: 0 },
    { month: 'Jan-26', originalPlan: 0, revisedPlan: 99, actual: 0 },
    { month: 'Feb-26', originalPlan: 0, revisedPlan: 100, actual: 0 }
  ];
}

export function defaultDBBSeries(): SeriesItem[] {
  return [
    { code: '1000', desc: 'General', contractAmt: 32596000, execAmt: 32596000, progress: 100 },
    { code: '2000', desc: 'Site Clearance', contractAmt: 7962170, execAmt: 7962170, progress: 100 },
    { code: '3000', desc: 'Drainage', contractAmt: 225245939, execAmt: 25245939, progress: 11.21 },
    { code: '4000', desc: 'Earthworks', contractAmt: 319271263.50, execAmt: 19271263.50, progress: 6.04 },
    { code: '5100', desc: 'Sub-Base', contractAmt: 50723008, execAmt: 50723008, progress: 100 },
    { code: '5200', desc: 'Base Course', contractAmt: 86164750, execAmt: 6164750, progress: 7.15 },
    { code: '6000', desc: 'Bituminous Surfacing', contractAmt: 227154439.60, execAmt: 27154439.60, progress: 11.95 },
    { code: '8000', desc: 'Structures', contractAmt: 224796544, execAmt: 24796544, progress: 11.03 },
    { code: '9000', desc: 'Ancillary Works', contractAmt: 43290880, execAmt: 43290880, progress: 100 },
    { code: '11000', desc: 'Day Works', contractAmt: 13212925.17, execAmt: 13212925.17, progress: 100 }
  ];
}

export function defaultDBSeries(): SeriesItem[] {
  return [
    { code: '1', desc: 'Survey, Investigation and Design', contractAmt: 29920659.92, execAmt: 29920659.92, progress: 100, contractPct: 2.0 },
    { code: '2', desc: "Employer's Representative Facilities", contractAmt: 104722309.72, execAmt: 104722309.72, progress: 100, contractPct: 7.0 },
    { code: '3', desc: 'Detour and Traffic Management Plan', contractAmt: 44880989.88, execAmt: 44880989.88, progress: 100, contractPct: 3.0 },
    { code: '4', desc: 'Site Clearance and Earth Work', contractAmt: 299206599.20, execAmt: 299206599.20, progress: 100, contractPct: 20.0 },
    { code: '5', desc: 'Sub-Base', contractAmt: 74801649.80, execAmt: 74801649.80, progress: 100, contractPct: 5.0 },
    { code: '6', desc: 'Road Base', contractAmt: 119682639.68, execAmt: 119682639.68, progress: 100, contractPct: 8.0 },
    { code: '7', desc: 'Bituminous Surface', contractAmt: 359047919.04, execAmt: 359047919.04, progress: 100, contractPct: 24.0 },
    { code: '8', desc: 'Bridge/Culvert/Drainage and Protection Work', contractAmt: 403928908.92, execAmt: 403928908.92, progress: 100, contractPct: 27.0 },
    { code: '9', desc: 'Road Furniture and Environmental Works', contractAmt: 59841319.84, execAmt: 59841319.84, progress: 100, contractPct: 4.0 }
  ];
}

export function defaultWorkProgram(): WorkProgramActivity[] {
  return [
    { id: 'A', name: 'Mobilization', duration: 30, predecessors: '', lag: 0, depType: 'FS', start: '', finish: '', float: 0, critical: true },
    { id: 'B', name: 'Site Clearance', duration: 45, predecessors: 'A', lag: 0, depType: 'FS', start: '', finish: '', float: 0, critical: true },
    { id: 'C', name: 'Earthworks', duration: 180, predecessors: 'B', lag: 5, depType: 'FS', start: '', finish: '', float: 0, critical: true },
    { id: 'D', name: 'Drainage Structures', duration: 120, predecessors: 'B', lag: 10, depType: 'SS', start: '', finish: '', float: 30, critical: false },
    { id: 'E', name: 'Sub-Base', duration: 60, predecessors: 'C', lag: 0, depType: 'FS', start: '', finish: '', float: 0, critical: true },
    { id: 'F', name: 'Base Course', duration: 60, predecessors: 'E', lag: 0, depType: 'FS', start: '', finish: '', float: 0, critical: true },
    { id: 'G', name: 'Asphalt Paving', duration: 90, predecessors: 'F', lag: 0, depType: 'FF', start: '', finish: '', float: 0, critical: true },
    { id: 'H', name: 'Road Furniture', duration: 30, predecessors: 'G', lag: 2, depType: 'FS', start: '', finish: '', float: 0, critical: true },
  ];
}

export function buildKpiHierarchy(ct: 'DB' | 'DBB', project?: Project) {
  const goals = [
    { id: 'G1', name: 'Physical Progress', wt: 100, sscs: [
        { id: 'SC1.1', name: 'Monthly Progress', wt: 25, items: [
            { id: 'PP-1', desc: 'Planned vs actual physical completion', unit: '%', wt: 100, max: 100, type: 'pct' }
          ] },
        { id: 'SC1.2', name: 'Milestone Achievement', wt: 55, items: [
            { id: 'MS-1', desc: 'Mobilization (initial period)', unit: '0/1', wt: 4.31, max: 1, type: 'yn' },
            { id: 'MS-2', desc: "Contractor's Key Personnel Assignment", unit: '0/1', wt: 4.31, max: 1, type: 'yn' },
            { id: 'MS-3', desc: 'Provision of Engineer/Contractor Facility', unit: '0/1', wt: 4.31, max: 1, type: 'yn' },
            { id: 'MS-4', desc: 'Mobilization of Major Equipment', unit: '0/1', wt: 4.31, max: 1, type: 'yn' },
            { id: 'MS-5', desc: 'Submission of Design Review Document (DB)', unit: '0/1', wt: 4.31, max: 1, type: 'yn' },
            { id: 'MS-6', desc: 'Possession of Camp Site', unit: '0/1', wt: 4.31, max: 1, type: 'yn' },
            { id: 'MS-7', desc: 'Completion of Foundation Investigation', unit: '0/1', wt: 4.31, max: 1, type: 'yn' },
            { id: 'MS-8', desc: 'Approval of Design Review Document', unit: '0/1', wt: 4.31, max: 1, type: 'yn' },
            { id: 'MS-9', desc: 'Approval of Design', unit: '0/1', wt: 4.31, max: 1, type: 'yn' },
            { id: 'MS-10', desc: 'Identification of Source Material', unit: '0/1', wt: 4.31, max: 1, type: 'yn' },
            { id: 'MS-11', desc: 'Commencement of Permanent Work', unit: '0/1', wt: 4.31, max: 1, type: 'yn' },
            { id: 'MS-12', desc: 'Crusher Plant Installation', unit: '0/1', wt: 4.31, max: 1, type: 'yn' },
            { id: 'MS-13', desc: 'Asphalt Plant Installation', unit: '0/1', wt: 4.31, max: 1, type: 'yn' },
            { id: 'MS-14', desc: 'Crushing Achievement', unit: '0/1', wt: 5.50, max: 1, type: 'yn' },
            { id: 'MS-15', desc: 'Earthwork Completion', unit: '0/1', wt: 5.50, max: 1, type: 'yn' },
            { id: 'MS-16', desc: 'Drainage Works Completion', unit: '0/1', wt: 5.50, max: 1, type: 'yn' },
            { id: 'MS-17', desc: 'Sub-base Completion', unit: '0/1', wt: 5.50, max: 1, type: 'yn' },
            { id: 'MS-18', desc: 'Base Course Completion', unit: '0/1', wt: 5.50, max: 1, type: 'yn' },
            { id: 'MS-19', desc: 'Handover of Site/Section', unit: '0/1', wt: 5.50, max: 1, type: 'yn' },
            { id: 'MS-20', desc: 'Road Marking, Signs, Furniture', unit: '0/1', wt: 5.50, max: 1, type: 'yn' },
            { id: 'MS-21', desc: 'Other significant milestone', unit: '0/1', wt: 5.50, max: 1, type: 'yn' }
          ] },
        { id: 'SC1.3', name: 'Asphalt Progress', wt: 20, items: [
            { id: 'PP-3', desc: 'Asphalt paving km completed vs monthly plan', unit: '%', wt: 100, max: 100, type: 'pct' }
          ] }
      ] },
    { id: 'G2', name: 'Progress vs Elapsed Time', wt: 100, sscs: [
        { id: 'SC2.1', name: 'Schedule Efficiency', wt: 100, items: [
            { id: 'PT-1', desc: 'To-date progress % / elapsed time %', unit: '%', wt: 100, max: 100, type: 'auto' }
          ] }
      ] },
    { id: 'G3', name: 'Cost Management', wt: 100, sscs: [
        { id: 'SC3.1', name: 'Cost Overrun', wt: 60, items: [
            { id: 'CM-1', desc: 'Approved cost increase vs original contract', unit: '%', wt: 100, max: 100, type: 'auto' }
          ] },
        { id: 'SC3.2', name: 'Cost Trend', wt: 40, items: [
            { id: 'CM-2', desc: 'Quarter-over-quarter cost increase rate', unit: '%', wt: 100, max: 100, type: 'auto' }
          ] }
      ] },
    { id: 'G4', name: 'Time Management', wt: 100, sscs: [
        { id: 'SC4.1', name: 'EoT Control', wt: 50, items: [
            { id: 'TM-1', desc: 'Approved EoT vs original duration', unit: '%', wt: 100, max: 100, type: 'auto' }
          ] },
        { id: 'SC4.2', name: 'Schedule Variance', wt: 50, items: [
            { id: 'TM-2', desc: '(Earned Value - Planned Value) / Planned Value', unit: '%', wt: 100, max: 100, type: 'auto' }
          ] }
      ] }
  ];

  goals.push({
    id: 'G5', name: 'Quality Management', wt: 100, sscs: [
      { id: 'SC5.1', name: 'QA/QC System', wt: 15, items: [
          { id: 'QL-1A', desc: 'QAM approved and available on site', unit: '0/1', wt: 25, max: 1, type: 'yn' },
          { id: 'QL-1B', desc: 'QAM implementation effectiveness', unit: '%', wt: 25, max: 100, type: 'pct' },
          { id: 'QL-1C', desc: 'QCM approved and available on site', unit: '0/1', wt: 25, max: 1, type: 'yn' },
          { id: 'QL-1D', desc: 'QCM implementation', unit: '%', wt: 25, max: 100, type: 'pct' }
        ] },
      { id: 'SC5.2', name: 'Testing Compliance', wt: 15, items: [
          { id: 'QL-2A', desc: 'Material quality test frequency vs STS', unit: '%', wt: 50, max: 100, type: 'pct' },
          { id: 'QL-2B', desc: 'Test result conformance rate', unit: '%', wt: 50, max: 100, type: 'pct' }
        ] },
      { id: 'SC5.3', name: 'NCR Closure', wt: 15, items: [
          { id: 'QL-3A', desc: 'Non-conformances closed within correction period', unit: '%', wt: 60, max: 100, type: 'pct' },
          { id: 'QL-3B', desc: 'Repeat NCRs (same issue recurring)', unit: '%', wt: 40, max: 100, type: 'pct' }
        ] },
      { id: 'SC5.4', name: 'RFI Management', wt: 10, items: [
          { id: 'QL-4A', desc: 'RFI rejection rate', unit: '%', wt: 50, max: 100, type: 'pct' },
          { id: 'QL-4B', desc: 'Average RFI response time', unit: 'days', wt: 50, max: 100, type: 'pct' }
        ] },
      { id: 'SC5.5', name: 'Material Quality Control', wt: 15, items: [
          { id: 'MQ-1', desc: 'Material source approval status', unit: '%', wt: 15, max: 100, type: 'pct' },
          { id: 'MQ-2', desc: 'Stockpile management', unit: '%', wt: 15, max: 100, type: 'pct' },
          { id: 'MQ-3', desc: 'Aggregate quality compliance', unit: '%', wt: 20, max: 100, type: 'pct' },
          { id: 'MQ-4', desc: 'Cement/Bitumen quality verification', unit: '%', wt: 15, max: 100, type: 'pct' },
          { id: 'MQ-5', desc: 'Concrete/Asphalt mix design approval', unit: '%', wt: 20, max: 100, type: 'pct' },
          { id: 'MQ-6', desc: 'Reinforcement bar quality', unit: '%', wt: 15, max: 100, type: 'pct' }
        ] },
      { id: 'SC5.6', name: 'Process Control', wt: 15, items: [
          { id: 'PC-1', desc: 'Earthworks: moisture, compaction', unit: '%', wt: 15, max: 100, type: 'pct' },
          { id: 'PC-2', desc: 'Pavement layers: thickness, density', unit: '%', wt: 20, max: 100, type: 'pct' },
          { id: 'PC-3', desc: 'Concrete placement and curing', unit: '%', wt: 15, max: 100, type: 'pct' },
          { id: 'PC-4', desc: 'Drainage structure construction', unit: '%', wt: 15, max: 100, type: 'pct' },
          { id: 'PC-5', desc: 'Trial section execution and approval', unit: '%', wt: 15, max: 100, type: 'pct' },
          { id: 'PC-6', desc: 'Protection of finished works', unit: '%', wt: 10, max: 100, type: 'pct' },
          { id: 'PC-7', desc: 'Workmanship quality', unit: '%', wt: 10, max: 100, type: 'pct' }
        ] },
      { id: 'SC5.7', name: 'Laboratory Management', wt: 10, items: [
          { id: 'LM-1', desc: 'Laboratory establishment per contract', unit: '%', wt: 25, max: 100, type: 'pct' },
          { id: 'LM-2', desc: 'Equipment calibration certificates', unit: '%', wt: 30, max: 100, type: 'pct' },
          { id: 'LM-3', desc: 'Laboratory staffing qualified', unit: '%', wt: 25, max: 100, type: 'pct' },
          { id: 'LM-4', desc: 'Sample management traceability', unit: '%', wt: 20, max: 100, type: 'pct' }
        ] },
      { id: 'SC5.8', name: 'Supplier & Subcontractor', wt: 5, items: [
          { id: 'SQ-1', desc: 'Approved supplier list maintained', unit: '0/1', wt: 30, max: 1, type: 'yn' },
          { id: 'SQ-2', desc: 'Subcontractor quality performance', unit: '%', wt: 40, max: 100, type: 'pct' },
          { id: 'SQ-3', desc: 'Material traceability', unit: '%', wt: 30, max: 100, type: 'pct' }
        ] }
    ]
  });

  if (ct === 'DB') {
    goals.push({
      id: 'G6', name: 'Design Management (DB)', wt: 100, sscs: [
        { id: 'SC6.1_DB', name: 'Submission of Design Schedule', wt: 10, items: [
            { id: 'DS-DB1', desc: 'Submission of Design Schedule', unit: '%', wt: 100, max: 100, type: 'pct' }
          ] },
        { id: 'SC6.2_DB', name: 'Timely Mobilization of Design Team', wt: 10, items: [
            { id: 'DS-DB2', desc: 'Timely Mobilization of Members of Design team', unit: '%', wt: 100, max: 100, type: 'pct' }
          ] },
        { id: 'SC6.3_DB', name: 'Public Consultation during Design', wt: 15, items: [
            { id: 'DS-DB3', desc: 'Public Consultation during Design (For DB Projects)', unit: '%', wt: 100, max: 100, type: 'pct' }
          ] },
        { id: 'SC6.4_DB', name: 'Submission of Draft Design Document', wt: 10, items: [
            { id: 'DS-DB4', desc: 'Submission of Draft Design Document', unit: '%', wt: 100, max: 100, type: 'pct' }
          ] },
        { id: 'SC6.5_DB', name: 'Comment on Draft Design Document', wt: 10, items: [
            { id: 'DS-DB5', desc: 'Comment on Draft Design Document', unit: '%', wt: 100, max: 100, type: 'pct' }
          ] },
        { id: 'SC6.6_DB', name: 'Submission of Final Design Document', wt: 25, items: [
            { id: 'DS-DB6', desc: 'Submission of Final Design Document', unit: '%', wt: 100, max: 100, type: 'pct' }
          ] },
        { id: 'SC6.7_DB', name: 'Application of Value Engineering in Designs', wt: 20, items: [
            { id: 'DS-DB7', desc: 'Application of Value Engineering in Designs', unit: '%', wt: 100, max: 100, type: 'pct' }
          ] }
      ]
    });
  } else {
    goals.push({
      id: 'G6', name: 'Design Management (DBB)', wt: 100, sscs: [
        { id: 'SC6.1_DBB', name: 'Provision of Relevant Design Documents to the Contractor', wt: 10, items: [
            { id: 'DS-DBB1', desc: 'Provision of Relevant Design Documents to the Contractor', unit: '%', wt: 100, max: 100, type: 'pct' }
          ] },
        { id: 'SC6.2_DBB', name: 'Submission of Draft Design Review by the Supervision Consultant', wt: 10, items: [
            { id: 'DS-DBB2', desc: 'Submission of Draft Design Review by the Supervision Consultant', unit: '%', wt: 100, max: 100, type: 'pct' }
          ] },
        { id: 'SC6.3_DBB', name: 'Comment on Draft Design Review by Design Directorate', wt: 10, items: [
            { id: 'DS-DBB3', desc: 'Comment on Draft Design Review by Design Directorate', unit: '%', wt: 100, max: 100, type: 'pct' }
          ] },
        { id: 'SC6.4_DBB', name: 'Comment on Draft Design Review by PE', wt: 10, items: [
            { id: 'DS-DBB4', desc: 'Comment on Draft Design Review by PE', unit: '%', wt: 100, max: 100, type: 'pct' }
          ] },
        { id: 'SC6.5_DBB', name: 'Submission of Final Design Review by the Supervision Consultant', wt: 10, items: [
            { id: 'DS-DBB5', desc: 'Submission of Final Design Review by the Supervision Consultant', unit: '%', wt: 100, max: 100, type: 'pct' }
          ] },
        { id: 'SC6.6_DBB', name: 'Presentation on Design Review Findings', wt: 15, items: [
            { id: 'DS-DBB6', desc: 'Presentation on Design Review Findings', unit: '%', wt: 100, max: 100, type: 'pct' }
          ] },
        { id: 'SC6.7_DBB', name: 'Approval of Design Review Findings', wt: 15, items: [
            { id: 'DS-DBB7', desc: 'Approval of Design Review Findings', unit: '%', wt: 100, max: 100, type: 'pct' }
          ] },
        { id: 'SC6.8_DBB', name: 'Occurance of Design Change/Modification during the Quarter (>3, high)', wt: 10, items: [
            { id: 'DS-DBB8', desc: 'Occurance of Design Change/Modification during the Quarter (>3, high) [Note: For higher frequency, lower marks]', unit: '%', wt: 100, max: 100, type: 'pct' }
          ] },
        { id: 'SC6.9_DBB', name: 'Introduction of Design Modifications outside the original Design', wt: 10, items: [
            { id: 'DS-DBB9', desc: 'Introduction of Design Modifications outside the original Design of Contract [Note: For higher frequency, lower marks]', unit: '%', wt: 100, max: 100, type: 'pct' }
          ] }
      ]
    });
  }

  goals.push({
    id: 'G7', name: 'Claim & Dispute', wt: 100, sscs: [
      { id: 'SC7.1', name: 'Identification and Notification of Potential Claim Causes', wt: 30, items: [
          { id: 'CL-1', desc: 'Identification and Notification of Potential Claim Causes', unit: '%', wt: 100, max: 100, type: 'pct' }
        ] },
      { id: 'SC7.2', name: 'Taking Early Action', wt: 30, items: [
          { id: 'CL-2', desc: 'Taking Early Action/mitigation measures', unit: '%', wt: 100, max: 100, type: 'pct' }
        ] },
      { id: 'SC7.3', name: 'Having proper Claim related Records for Unavoidable Claims', wt: 30, items: [
          { id: 'CL-3', desc: 'Having proper Claim related Records for Unavoidable Claims', unit: '%', wt: 100, max: 100, type: 'pct' }
        ] },
      { id: 'SC7.4', name: 'Claim Assessment & Substantiation', wt: 10, items: [
          { id: 'CL-4', desc: 'Claim Assessment & Substantiation', unit: '%', wt: 100, max: 100, type: 'pct' }
        ] }
    ]
  });

  goals.push({
    id: 'G8', name: 'Risk Management', wt: 100, sscs: [
      { id: 'SC8.1', name: 'Risk Register', wt: 25, items: [
          { id: 'RK-1', desc: 'Risk register updated monthly', unit: '0/1', wt: 100, max: 1, type: 'yn' }
        ] },
      { id: 'SC8.2', name: 'Risk Escalation', wt: 25, items: [
          { id: 'RK-2', desc: 'Average severity index of all recorded project vulnerabilities value divided by 25 (0 - 100%)', unit: '%', wt: 100, max: 100, type: 'pct' }
        ] },
      { id: 'SC8.3', name: 'Mitigation', wt: 25, items: [
          { id: 'RK-3', desc: 'Sum of status values divided by Number of Active Hazards (0 - 100%)', unit: '%', wt: 100, max: 100, type: 'pct' }
        ] },
      { id: 'SC8.4', name: 'Project Risk Index', wt: 25, items: [
          { id: 'RK-4', desc: 'Project Risk Index score', unit: '%', wt: 100, max: 100, type: 'pct' }
        ] }
    ]
  });

  goals.push({
    id: 'G9', name: 'ESOSH Management', wt: 100, sscs: [
      { id: 'SC9.1', name: 'Environmental', wt: 35, items: [
          { id: 'HS-1A', desc: 'EMP approved', unit: '0/1', wt: 20, max: 1, type: 'yn' },
          { id: 'HS-1B', desc: 'SSEMP approved and implemented', unit: '%', wt: 40, max: 100, type: 'pct' },
          { id: 'HS-1C', desc: 'Waste disposal management', unit: '%', wt: 20, max: 100, type: 'pct' },
          { id: 'HS-1D', desc: 'Erosion and sediment control', unit: '%', wt: 20, max: 100, type: 'pct' }
        ] },
      { id: 'SC9.2', name: 'OHS', wt: 40, items: [
          { id: 'HS-2A', desc: 'OHS Management Plan approved', unit: '%', wt: 15, max: 100, type: 'pct' },
          { id: 'HS-2B', desc: 'OHS Plan implementation', unit: '%', wt: 25, max: 100, type: 'pct' },
          { id: 'HS-2C', desc: 'PPE availability and use', unit: '%', wt: 20, max: 100, type: 'pct' },
          { id: 'HS-2D', desc: 'Clinic and ambulance provision', unit: '%', wt: 15, max: 100, type: 'pct' },
          { id: 'HS-2E', desc: "Workmen's Compensation Insurance", unit: '0/1', wt: 10, max: 1, type: 'yn' },
          { id: 'HS-2F', desc: 'Workers site facilities', unit: '%', wt: 15, max: 100, type: 'pct' }
        ] },
      { id: 'SC9.3', name: 'Traffic Management', wt: 25, items: [
          { id: 'HS-3A', desc: 'TMP approved', unit: '0/1', wt: 30, max: 1, type: 'yn' },
          { id: 'HS-3B', desc: 'TMP implementation', unit: '%', wt: 40, max: 100, type: 'pct' },
          { id: 'HS-3C', desc: 'Traffic incident reporting', unit: '%', wt: 30, max: 100, type: 'pct' }
        ] }
    ]
  });

  goals.push({
    id: 'G10', name: 'ROW Management', wt: 100, sscs: [
      { id: 'SC10.1', name: 'ROW Clearance', wt: 50, items: [
          { id: 'RW-1', desc: 'Km cleared of obstructions vs total km', unit: '%', wt: 100, max: 100, type: 'auto' }
        ] },
      { id: 'SC10.2', name: 'Compensation', wt: 30, items: [
          { id: 'RW-2A', desc: 'Properties identified, measured, evaluated', unit: '%', wt: 40, max: 100, type: 'pct' },
          { id: 'RW-2B', desc: 'Compensation paid to owners', unit: '%', wt: 30, max: 100, type: 'pct' },
          { id: 'RW-2C', desc: 'Compensated properties removed', unit: '%', wt: 30, max: 100, type: 'pct' }
        ] },
      { id: 'SC10.3', name: 'ROW Reporting', wt: 20, items: [
          { id: 'RW-3', desc: 'Monthly ROW report completeness', unit: '%', wt: 100, max: 100, type: 'pct' }
        ] }
    ]
  });

  goals.push({
    id: 'G11', name: 'Stakeholder Management', wt: 100, sscs: [
      { id: 'SC11.1', name: 'Grievance', wt: 40, items: [
          { id: 'SH-1A', desc: 'Grievance handling mechanism established', unit: '0/1', wt: 30, max: 1, type: 'yn' },
          { id: 'SH-1B', desc: 'Grievance response within 14 days', unit: '%', wt: 70, max: 100, type: 'pct' }
        ] },
      { id: 'SC11.2', name: 'Engagement', wt: 30, items: [
          { id: 'SH-2A', desc: 'Awareness creation sessions conducted', unit: '%', wt: 50, max: 100, type: 'pct' },
          { id: 'SH-2B', desc: 'Corporate responsibility assistance', unit: '%', wt: 50, max: 100, type: 'pct' }
        ] },
      { id: 'SC11.3', name: 'Local Content', wt: 30, items: [
          { id: 'SH-3A', desc: 'Local workforce employed', unit: '%', wt: 50, max: 100, type: 'pct' },
          { id: 'SH-3B', desc: 'Local sub-contractors engaged', unit: '%', wt: 50, max: 100, type: 'pct' }
        ] }
    ]
  });

  goals.push({
    id: 'G12', name: 'Contract Compliance', wt: 100, sscs: [
      { id: 'SC12.1', name: 'Documentation', wt: 35, items: [
          { id: 'CC-1A', desc: 'Work Programme submitted/updated', unit: '%', wt: 20, max: 100, type: 'pct' },
          { id: 'CC-1B', desc: 'Monthly Action Plan submitted', unit: '%', wt: 20, max: 100, type: 'pct' },
          { id: 'CC-1C', desc: "Contractor's MPR submitted", unit: '%', wt: 20, max: 100, type: 'pct' },
          { id: 'CC-1D', desc: "Consultant's MPR submitted", unit: '%', wt: 15, max: 100, type: 'pct' },
          { id: 'CC-1E', desc: 'Monthly Statement submitted', unit: '%', wt: 15, max: 100, type: 'pct' },
          { id: 'CC-1F', desc: 'Daily Site Record maintained', unit: '%', wt: 10, max: 100, type: 'pct' }
        ] },
      { id: 'SC12.2', name: 'Subcontractor', wt: 30, items: [
          { id: 'CC-2A', desc: 'Mandatory sub-contractors engaged', unit: '%', wt: 60, max: 100, type: 'pct' },
          { id: 'CC-2B', desc: 'Sub-contractor selection competitive', unit: '0/1', wt: 40, max: 1, type: 'yn' }
        ] },
      { id: 'SC12.3', name: 'Insurance & Guarantees', wt: 20, items: [
          { id: 'CC-3A', desc: 'Performance Guarantee valid', unit: '0/1', wt: 25, max: 1, type: 'yn' },
          { id: 'CC-3B', desc: 'Advance Payment Guarantee valid', unit: '0/1', wt: 20, max: 1, type: 'yn' },
          { id: 'CC-3C', desc: 'Retention Money Guarantee valid', unit: '0/1', wt: 15, max: 1, type: 'yn' },
          { id: 'CC-3D', desc: 'CAR Insurance valid', unit: '0/1', wt: 20, max: 1, type: 'yn' },
          { id: 'CC-3E', desc: 'Professional Indemnity Insurance valid', unit: '0/1', wt: 10, max: 1, type: 'yn' },
          { id: 'CC-3F', desc: 'Plant & Equipment Insurance valid', unit: '0/1', wt: 10, max: 1, type: 'yn' }
        ] },
      { id: 'SC12.4', name: "Engineer's Facilities", wt: 15, items: [
          { id: 'CC-4', desc: 'Facilities provided for Engineer', unit: '%', wt: 100, max: 100, type: 'pct' }
        ] }
    ]
  });

  if (project && project.kpiAllocated && Array.isArray(project.kpiAllocated)) {
    project.kpiAllocated.forEach(kpi => {
      // Find the parent goal
      let goal = goals.find(g => g.id === kpi.goalId);
      if (!goal) {
        goal = {
          id: kpi.goalId,
          name: kpi.goalName || `Group ${kpi.goalId}`,
          wt: kpi.goalWt || 100,
          sscs: []
        };
        goals.push(goal);
      }

      // Check if subgroup already exists inside the goal
      let ssc = goal.sscs.find(s => s.id === kpi.sscId);
      if (!ssc) {
        ssc = {
          id: kpi.sscId,
          name: kpi.sscName || `Subgroup ${kpi.sscId}`,
          wt: kpi.sscWt || 20,
          items: []
        };
        goal.sscs.push(ssc);
      } else {
        // If it exists, let's ensure its weight is updated to the one stored in kpiAllocated
        if (kpi.sscWt !== undefined) {
          ssc.wt = kpi.sscWt;
        }
        if (kpi.sscName !== undefined && kpi.sscName) {
          ssc.name = kpi.sscName;
        }
      }

      // Check if item exists in subgroup
      const hasItem = ssc.items.some(it => it.id === kpi.itemId);
      if (!hasItem) {
        ssc.items.push({
          id: kpi.itemId,
          desc: kpi.desc,
          unit: kpi.unit || '%',
          wt: kpi.itemWt,
          max: kpi.max || 100,
          type: kpi.type || 'pct'
        });
      } else {
        // If item exists, update its weight
        const existingItem = ssc.items.find(it => it.id === kpi.itemId);
        if (existingItem) {
          existingItem.wt = kpi.itemWt;
          existingItem.desc = kpi.desc;
        }
      }
    });
  }

  if (project && project.kpiDeletedSubgroups && Array.isArray(project.kpiDeletedSubgroups)) {
    const deletedSet = new Set(project.kpiDeletedSubgroups);
    goals.forEach(g => {
      g.sscs = g.sscs.filter(ssc => !deletedSet.has(ssc.id));
    });
  }

  if (project && project.kpiDeletedItems && Array.isArray(project.kpiDeletedItems)) {
    const deletedItemsSet = new Set(project.kpiDeletedItems);
    goals.forEach(g => {
      g.sscs.forEach(ssc => {
        ssc.items = ssc.items.filter(it => !deletedItemsSet.has(it.id));
      });
    });
  }

  return goals;
}

export function flattenKpi(goals: ReturnType<typeof buildKpiHierarchy>): KpiAllocatedItem[] {
  const arr: KpiAllocatedItem[] = [];
  goals.forEach(g => {
    g.sscs.forEach(ssc => {
      ssc.items.forEach(it => {
        arr.push({
          goalId: g.id,
          goalName: g.name,
          goalWt: g.wt,
          sscId: ssc.id,
          sscName: ssc.name,
          sscWt: ssc.wt,
          itemId: it.id,
          desc: it.desc,
          unit: it.unit,
          itemWt: it.wt,
          max: it.max,
          type: it.type,
          alloc: (() => {
            if (it.id === 'DS-DBB1') return 100;
            if (it.id === 'DS-DBB2') return 100;
            if (it.id === 'DS-DBB3') return 100;
            if (it.id === 'DS-DBB4') return 100;
            if (it.id === 'DS-DBB5') return 100;
            if (it.id === 'DS-DBB6') return 33.333; // 5% out of 15%
            if (it.id === 'DS-DBB7') return 66.667; // 10% out of 15%
            if (it.id === 'DS-DBB8') return 80;     // 8% out of 10%
            if (it.id === 'DS-DBB9') return 80;     // 8% out of 10%
            if (it.id === 'DS-DB1') return 100;
            if (it.id === 'DS-DB2') return 90;
            if (it.id === 'DS-DB3') return 80;
            if (it.id === 'DS-DB4') return 100;
            if (it.id === 'DS-DB5') return 90;
            if (it.id === 'DS-DB6') return 100;
            if (it.id === 'DS-DB7') return 85;
            if (it.id === 'CL-1') return 90;        // 27% out of 30%
            if (it.id === 'CL-2') return 90;        // 27% out of 30%
            if (it.id === 'CL-3') return 93.333;    // 28% out of 30%
            if (it.id === 'CL-4') return 90;        // 9% out of 10%
            return it.type === 'yn' ? it.max : (it.type === 'auto' ? 0 : it.max * 0.7);
          })(),
          naActive: false
        });
      });
    });
  });
  return arr;
}

export function generateKpiAllocated(ct: 'DB' | 'DBB'): KpiAllocatedItem[] {
  return flattenKpi(buildKpiHierarchy(ct));
}

export function getIntegratedKpiAllocated(project: Project): KpiAllocatedItem[] {
  // 1. Core Elapsed progress calculations
  const s = new Date(project.startDate);
  const totalDays = project.origDays + (project.eotDays || 0) + (project.interimEotDays || 0);
  const rc = new Date(s.getTime() + totalDays * 86400000);
  const now = new Date();
  
  let elapsed = 0;
  if (rc.getTime() - s.getTime() > 0) {
    elapsed = Math.min(100, Math.max(0, ((now.getTime() - s.getTime()) / (rc.getTime() - s.getTime())) * 100));
  }
  const ratio = elapsed > 0 ? (project.physicalProgress / elapsed) * 100 : 0;
  const costOverrunPct = project.origAmount > 0 ? (project.variation / project.origAmount) * 100 : 0;
  const timeOverrunPct = project.origDays > 0 ? (project.eotDays / project.origDays) * 100 : 0;

  // 2. Right of Way (ROW) calculated clearance & utilities relocation
  const rowMetricsList = project.rowMetrics || [];
  const projectLengthVal = project.lengthKm > 0 ? project.lengthKm : 1;

  const rowClearMetric = rowMetricsList.find(m => m.name === 'ROW Obstruction free Section')?.value || 0;
  const rowPercent = (rowClearMetric / projectLengthVal) * 100;

  const measureMetricObj = rowMetricsList.find(m => {
    const n = m.name.toLowerCase();
    return n.includes('properties identified') || n.includes('measurement identification');
  });
  const measureMetricVal = measureMetricObj ? measureMetricObj.value : 0;
  const measurePercent = (measureMetricVal / projectLengthVal) * 100;

  const compMetricVal = rowMetricsList.find(m => m.name === 'Compensation Paid by ERA')?.value || 0;
  const compPercent = (compMetricVal / projectLengthVal) * 100;

  const matReqVal = rowMetricsList.find(m => m.name === 'Material Source Requested (No)')?.value || 0;
  const matHandVal = rowMetricsList.find(m => m.name === 'Material Source Handedover (No)')?.value || 0;
  const poleReqVal = rowMetricsList.find(m => m.name === 'Electric Pole Removal Requested (No)')?.value || 0;
  const poleHandVal = rowMetricsList.find(m => m.name === 'Electric Pole Removal Handedover (No)')?.value || 0;

  const matRatioVal = matReqVal > 0 ? (matHandVal / matReqVal) * 100 : 100;
  const poleRatioVal = poleReqVal > 0 ? (poleHandVal / poleReqVal) * 100 : 100;
  const utilitiesCompletenessVal = (matRatioVal + poleRatioVal) / 2;

  // 3. Bonds / Guarantees statuses check
  const isBondValidStatus = (st?: string) => {
    if (!st) return false;
    const s = st.toLowerCase();
    return s === 'valid' || s === 'recovered' || s === 'returned' || s === 'amortized' || s === 'fully amortized';
  };
  const hasPerfBound = (project.bonds || []).some(b => b.type.toLowerCase().includes('performance') && isBondValidStatus(b.status)) ? 1 : 0;
  const hasAdvBound = (project.bonds || []).some(b => b.type.toLowerCase().includes('advance') && isBondValidStatus(b.status)) ? 1 : 0;
  const hasRetBound = (project.bonds || []).some(b => b.type.toLowerCase().includes('retention') && isBondValidStatus(b.status)) ? 1 : 0;
  
  // Others defaults
  const hasCarBound = (project.bonds || []).some(b => b.type.toLowerCase().includes('car') && isBondValidStatus(b.status)) ? 1 : 0;
  const hasProfBound = (project.bonds || []).some(b => (b.type.toLowerCase().includes('indemnity') || b.type.toLowerCase().includes('professional')) && isBondValidStatus(b.status)) ? 1 : 0;
  const hasPlantBound = (project.bonds || []).some(b => (b.type.toLowerCase().includes('plant') || b.type.toLowerCase().includes('equipment')) && isBondValidStatus(b.status)) ? 1 : 0;

  // 4. EVM Calculations for SC4.2 (Schedule Variance)
  const MILLION = 1_000_000;
  const BAC = project.origAmount * MILLION;
  const te = project.series.reduce((sum, item) => sum + (item.execAmt || 0), 0);
  const totalOrigExec = te * 1.15;
  const pa = ((project.payment || []).find(x => x.item === 'Price Adjustment') || { amount: 0 }).amount;
  const AC = ((project.payment || []).find(x => x.item.trim().toLowerCase() === 'total todate certified ipc') || { amount: 0 }).amount;
  const EV = AC * (project.physicalProgress / 100);
  const monthlyList = project.monthly || [];
  let plannedPct = 100;
  if (monthlyList.length > 0) {
    const reportingMonths = monthlyList.filter(m => m.actual > 0);
    const targetIdx = reportingMonths.length > 0 
      ? monthlyList.indexOf(reportingMonths[reportingMonths.length - 1]) 
      : (monthlyList.findIndex(m => m.originalPlan > 0) !== -1 ? monthlyList.findIndex(m => m.originalPlan > 0) : 0);
    
    if (targetIdx !== -1) {
      const targetMonth = monthlyList[targetIdx];
      const hasReached100 = monthlyList.slice(0, targetIdx + 1).some(m => m.originalPlan >= 100);
      if (hasReached100) {
        plannedPct = 100;
      } else {
        plannedPct = targetMonth ? targetMonth.originalPlan : 100;
      }
    }
  }
  const PV = (plannedPct / 100) * BAC;
  const SV_pct = PV > 0 ? ((EV - PV) / PV) * 100 : 0;

  // 5. Build map with both DB and DBB default items to allow dual-evaluation
  const dbDefaults = generateKpiAllocated('DB');
  const dbbDefaults = generateKpiAllocated('DBB');
  const mergedMap: Record<string, KpiAllocatedItem> = {};

  dbbDefaults.forEach(item => {
    mergedMap[item.itemId] = item;
  });
  dbDefaults.forEach(item => {
    mergedMap[item.itemId] = item;
  });

  if (project.kpiAllocated && Array.isArray(project.kpiAllocated)) {
    project.kpiAllocated.forEach(item => {
      if (mergedMap[item.itemId]) {
        mergedMap[item.itemId] = {
          ...mergedMap[item.itemId],
          alloc: item.alloc,
          naActive: item.naActive,
          isOverridden: item.isOverridden,
          sscName: item.sscName !== undefined ? item.sscName : mergedMap[item.itemId].sscName,
          sscWt: item.sscWt !== undefined ? item.sscWt : mergedMap[item.itemId].sscWt
        };
      } else {
        mergedMap[item.itemId] = item;
      }
    });
  }

  let allKpis = Object.values(mergedMap);

  // Filter G6 (Design Management) items based on the project's contract type only
  const ct = project.contractType || 'DBB';
  allKpis = allKpis.filter(k => {
    if (k.goalId === 'G6') {
      if (ct === 'DB') {
        // Design-Build: Only keep DB criteria
        return k.sscId.endsWith('_DB') || (k.itemId.startsWith('DS-DB') && !k.itemId.startsWith('DS-DBB'));
      } else {
        // Design-Bid-Build: Only keep DBB criteria
        return k.sscId.endsWith('_DBB') || k.itemId.startsWith('DS-DBB');
      }
    }
    return true;
  });

  if (project.kpiDeletedSubgroups && Array.isArray(project.kpiDeletedSubgroups)) {
    const deletedSet = new Set(project.kpiDeletedSubgroups);
    allKpis = allKpis.filter(k => !deletedSet.has(k.sscId));
  }

  if (project.kpiDeletedItems && Array.isArray(project.kpiDeletedItems)) {
    const deletedItemsSet = new Set(project.kpiDeletedItems);
    allKpis = allKpis.filter(k => !deletedItemsSet.has(k.itemId));
  }

  const rk1Item = mergedMap['RK-1'];
  let isRk1No = false;
  if (rk1Item) {
    if (rk1Item.isOverridden) {
      isRk1No = rk1Item.alloc >= (rk1Item.max || 1);
    } else {
      const roadRisks = project.risks || [];
      isRk1No = roadRisks.length === 0;
    }
  }

  return allKpis.map(k => {
    let computedAlloc = k.alloc;
    const naActive = k.naActive || false;

    if (k.itemId === 'PP-1') {
      const plannedSum = project.monthly.length 
        ? Math.max(...project.monthly.map(m => m.revisedPlan || m.originalPlan || 0), 100) 
        : 100;
      computedAlloc = Math.min(100, plannedSum > 0 ? (project.physicalProgress / plannedSum) * 100 : 0);
    } else if (k.itemId === 'PT-1') {
      computedAlloc = Math.min(100, Math.max(0, ratio));
    } else if (k.itemId === 'CM-1') {
      computedAlloc = Math.max(0, Math.min(100, 100 - costOverrunPct));
    } else if (k.itemId === 'TM-1') {
      computedAlloc = Math.max(0, Math.min(100, 100 - timeOverrunPct));
    } else if (k.itemId === 'TM-2') {
      computedAlloc = Math.max(0, Math.min(100, 100 + SV_pct));
    } else if (k.itemId === 'RW-1') {
      computedAlloc = Math.min(100, Math.max(0, rowPercent));
    } else if (k.itemId === 'RW-2A') {
      computedAlloc = Math.min(100, Math.max(0, measurePercent));
    } else if (k.itemId === 'RW-2B') {
      computedAlloc = Math.min(100, Math.max(0, compPercent));
    } else if (k.itemId === 'RW-2C') {
      computedAlloc = Math.min(100, Math.max(0, rowPercent)); // Cleared of obstructions corresponds to compensated properties removed
    } else if (k.itemId === 'RW-3') {
      computedAlloc = Math.min(100, Math.max(0, utilitiesCompletenessVal));
    } else if (k.itemId === 'CC-1A') {
      computedAlloc = project.workProgram.length > 0 ? 100 : 0;
    } else if (k.itemId === 'CC-3A') {
      computedAlloc = hasPerfBound;
    } else if (k.itemId === 'CC-3B') {
      computedAlloc = hasAdvBound;
    } else if (k.itemId === 'CC-3C') {
      computedAlloc = hasRetBound;
    } else if (k.itemId === 'CC-3D') {
      computedAlloc = hasCarBound;
    } else if (k.itemId === 'CC-3E') {
      computedAlloc = hasProfBound;
    } else if (k.itemId === 'CC-3F') {
      computedAlloc = hasPlantBound;
    } else if (k.itemId === 'RK-1' || k.itemId === 'RK-2' || k.itemId === 'RK-3' || k.itemId === 'RK-4') {
      const roadRisks = project.risks || [];
      const activeRisks = roadRisks.filter(r => r.status === 'Active');
      const activeExposureSum = activeRisks.reduce((sum, r) => sum + r.probability * r.impact, 0);

      if (k.itemId === 'RK-1') {
        // SC8.1: Risk Register - if there is a risk registered give 0%, if not give 100%
        const hasRisks = roadRisks.length > 0;
        computedAlloc = hasRisks ? 0 : 1; // Since max is 1, 0 represents 0%, 1 represents 100%
      } else if (k.itemId === 'RK-2') {
        // SC8.2: Risk Escalation = (Average severity index / 25) * 100%
        const totalRisksCount = roadRisks.length;
        const sumExposure = roadRisks.reduce((sum, r) => sum + r.probability * r.impact, 0);
        const meanSeverity = totalRisksCount > 0 ? (sumExposure / totalRisksCount) : 0;
        computedAlloc = (meanSeverity / 25) * 100;
      } else if (k.itemId === 'RK-3') {
        // SC8.3: Mitigation = (Sum of status values / Number of Active Hazards) * 100%
        const getStatusVal = (status: string) => {
          if (status === 'Retired') return 0;
          if (status === 'Mitigated') return 0.5;
          return 1; // Active
        };
        const numberOfActiveHazards = roadRisks.filter(r => r.status === 'Active').length;
        const sumStatusValues = roadRisks.reduce((sum, r) => sum + getStatusVal(r.status), 0);
        const activeCount = numberOfActiveHazards > 0 ? numberOfActiveHazards : (roadRisks.length > 0 ? roadRisks.length : 1);
        computedAlloc = (sumStatusValues / activeCount) * 100;
      } else if (k.itemId === 'RK-4') {
        // SC8.4: Project Risk Index - based on Mean Risk Exposure value: if 0 -> 0%, if 25 -> 100%
        const totalRisksCount = roadRisks.length;
        const sumExposure = roadRisks.reduce((sum, r) => sum + r.probability * r.impact, 0);
        const meanRiskExposure = totalRisksCount > 0 ? (sumExposure / totalRisksCount) : 0;
        computedAlloc = (meanRiskExposure / 25) * 100;
      }

      if (isRk1No) {
        computedAlloc = k.itemId === 'RK-1' ? 1 : 100;
      }
    }

    let alloc = k.isOverridden ? k.alloc : computedAlloc;

    if (isRk1No && (k.itemId === 'RK-1' || k.itemId === 'RK-2' || k.itemId === 'RK-3' || k.itemId === 'RK-4')) {
      alloc = k.itemId === 'RK-1' ? 1 : 100;
    }

    return {
      ...k,
      alloc,
      naActive,
      isOverridden: k.isOverridden || false
    };
  });
}

export function defaultProjectTemplate(): Project {
  return {
    id: 'proj_default',
    name: "Daye-Girja-Melka Desta & Meleya-Mejo Spur",
    client: "Ethiopian Roads Administration",
    consultant: "LEA Associates South Asia JV",
    contractor: "China Tisiju Civil Engineering Group",
    signDate: "2020-04-28",
    startDate: "2020-12-29",
    origDays: 1095,
    eotDays: 730,
    interimEotDays: 0,
    variation: 72.1636, // In Millions
    origAmount: 1555.70816788, // In Millions
    lengthKm: 65,
    spurRoadLengthKm: 8.8,
    classification: "DS-4",
    contractType: "DBB",
    programDirectorate: "Southern",
    pmo: "PMO 1",
    physicalProgress: 40.73,
    provisionalSum: 6700000,
    progressPlanLabels: { monthLabel: 'Feb 2026', quarterLabel: 'Feb-Apr 2026', efyLabel: '2018' },
    images: [],
    rowMetrics: [
      { name: 'Project Length', value: 65.00, unit: 'Km' },
      { name: 'ROW Request By Contractor', value: 61.42, unit: 'Km' },
      { name: 'Properties identified, measured, evaluated', value: 60.56, unit: 'Km' },
      { name: 'Document Sent ERA for Compensation', value: 51.30, unit: 'Km' },
      { name: 'ROW Obstruction free Section', value: 43.23, unit: 'Km' },
      { name: 'Compensation Paid by ERA', value: 43.33, unit: 'Km' },
      { name: 'Unpaid Section', value: 17.23, unit: 'Km' },
      { name: 'Material Source Requested (No)', value: 6, unit: 'No.' },
      { name: 'Material Source Handedover (No)', value: 5, unit: 'No.' },
      { name: 'Electric Pole Removal Requested (No)', value: 12, unit: 'No.' },
      { name: 'Electric Pole Removal Handedover (No)', value: 8, unit: 'No.' }
    ],
    rowCompensation: [
      { id: 'comp_1', woreda: 'Daye Woreda', affectedPaps: 120, compensationRequired: 15.40, compensationPaid: 15.40, unpaidBalance: 0.00, status: 'Fully Paid', remarks: 'All clear. Site handed over to contractor.' },
      { id: 'comp_2', woreda: 'Girja Woreda', affectedPaps: 85, compensationRequired: 12.80, compensationPaid: 9.20, unpaidBalance: 3.60, status: 'Partially Paid', remarks: '3.6M Birr pending final validation of property deeds.' },
      { id: 'comp_3', woreda: 'Melka Desta', affectedPaps: 64, compensationRequired: 8.50, compensationPaid: 0.00, unpaidBalance: 8.50, status: 'Unpaid', remarks: 'Dispute over land ownership boundaries; under mediation.' },
      { id: 'comp_4', woreda: 'Meleya-Mejo', affectedPaps: 110, compensationRequired: 18.20, compensationPaid: 18.20, unpaidBalance: 0.00, status: 'Fully Paid', remarks: 'Compensation completed.' }
    ],
    utilityCompensation: [
      { id: 'util_1', utilityType: 'Electric Power Lines', ownerAgency: 'Ethiopian Electric Utility (EEU)', quantity: '142 Poles', compensationRequired: 4.50, compensationPaid: 3.00, unpaidBalance: 1.50, status: 'Partially Paid', remarks: 'Poles relocation in progress. Partial payment made.' },
      { id: 'util_2', utilityType: 'Telecom Copper & Fiber Cables', ownerAgency: 'Ethio Telecom', quantity: '3.8 Km Line', compensationRequired: 2.10, compensationPaid: 2.10, unpaidBalance: 0.00, status: 'Fully Paid', remarks: 'Relocation fully completed and verified.' },
      { id: 'util_3', utilityType: 'Water Supply Pipelines', ownerAgency: 'Woreda Water Bureau', quantity: '2.5 Km Pipe', compensationRequired: 3.80, compensationPaid: 0.00, unpaidBalance: 3.80, status: 'Unpaid', remarks: 'Survey and cost estimation finalized; awaiting funding release.' }
    ],
    rowStatus: [
      { id: 'row_status_1', from: 'Km 0+000', to: 'Km 01+000', length: '1.00 Km', status: 'Fully Cleared', remark: 'Ready for excavation' },
      { id: 'row_status_2', from: 'Km 01+000', to: 'Km 05+000', length: '4.00 Km', status: 'Partially Cleared', remark: 'Electric pole removal pending' },
      { id: 'row_status_3', from: 'Km 05+000', to: 'Km 12+000', length: '7.00 Km', status: 'Not Cleared', remark: 'Disputed PAP claims under review' }
    ],
    monthly: getDefaultMonthly(),
    series: defaultDBBSeries(),
    quantities: [
      { name: 'Site Clearing (Ha)', design: 2222, plan: 333244, exec: 345353 },
      { name: 'Common Excavation (M3)', design: 2321847, plan: 2608000, exec: 2493000 },
      { name: 'Embankment/Fill (M3)', design: 1237439.05, plan: 625972.06, exec: 425972.06 },
      { name: 'Rock Excavation (M3)', design: 1237439.05, plan: 625972.06, exec: 425972.06 },
      { name: 'Capping (M3)', design: 237295, plan: 84437, exec: 73847 },
      { name: 'Sub Base (Km)', design: 65, plan: 38.57, exec: 33.48 },
      { name: 'Base Course (Km)', design: 65, plan: 38.57, exec: 21.75 },
      { name: 'Prime Coating (Km)', design: 65, plan: 38.57, exec: 21.75 },
      { name: 'Asphalt Concrete (Km)', design: 65, plan: 34.14, exec: 20.75 },
      { name: 'Total Pipe Culvert (No.)', design: 115, plan: 105, exec: 73 },
      { name: 'Slab Culvert (No.)', design: 25, plan: 25, exec: 18 },
      { name: 'Box Culvert (No.)', design: 5, plan: 5, exec: 0 },
      { name: 'Retaining Wall (Km)', design: 12, plan: 8, exec: 4.55 },
      { name: 'Bridge (No)', design: 2, plan: 2, exec: 0 }
    ],
    progressPlan: { 
      contractor: { month: 2.75, quarter: 5.12, efy: 7.35, todate: 65.00 }, 
      era: { month: 1.50, quarter: 3.00, efy: 4.00, todate: 34.50 }, 
      actual: { month: 2.28, quarter: 3.73, efy: 4.80, todate: 27.29 } 
    },
    progressPlanHistory: [
      {
        id: 'hist_dec_2025',
        monthLabel: 'Dec 2025',
        efyLabel: '2018',
        contractorMonth: 2.10,
        contractorEfy: 4.50,
        eraMonth: 1.20,
        eraEfy: 2.80,
        actualMonth: 1.85,
        actualEfy: 3.90
      },
      {
        id: 'hist_jan_2026',
        monthLabel: 'Jan 2026',
        efyLabel: '2018',
        contractorMonth: 2.50,
        contractorEfy: 6.10,
        eraMonth: 1.40,
        eraEfy: 3.50,
        actualMonth: 2.05,
        actualEfy: 4.35
      }
    ],
    payment: [
      { item: 'Advance Repayment', amount: 142813055.14, percent: 11.80 },
      { item: 'Advance Payment', amount: 242100998.82, percent: 20.00 },
      { item: 'Total Todate Bill Summary', amount: 352765709.63, percent: 28.67 },
      { item: 'Remaining', amount: 1275106058.55, percent: 78.33 },
      { item: 'Price Adjustment', amount: 409350736.29, percent: 25.15 },
      { item: 'Total Todate Certified IPC', amount: 762116445.92, percent: 46.82 }
    ],
    annual: [
      { year: 2020, amount: 0, percent: 0 },
      { year: 2021, amount: 101093721.01, percent: 6.21 },
      { year: 2022, amount: 166193721.01, percent: 10.21 },
      { year: 2023, amount: 231293721.01, percent: 14.21 },
      { year: 2024, amount: 296393721.01, percent: 18.21 }
    ],
    linear: generateLinearData(),
    linearSpur: generateSpurLinearData(),
    kpiAllocated: generateKpiAllocated('DBB'),
    history: [],
    workProgram: defaultWorkProgram(),
    bonds: [
      { sno: 1, type: 'Performance Guarantee', bank: 'Commercial Bank of Ethiopia', amount: 155570816.79, amountUsd: 1350000, issueDate: '2020-05-15', expireDate: '2027-12-31', status: 'Valid' },
      { sno: 2, type: 'Advance Payment Guarantee', bank: 'Awash Bank', amount: 242100998.82, amountUsd: 2100000, issueDate: '2020-06-01', expireDate: '2024-06-01', status: 'Recovered' },
      { sno: 3, type: 'Retention Money Guarantee', bank: 'Nib International Bank', amount: 50000000, amountUsd: 435000, issueDate: '2021-01-15', expireDate: '2027-01-15', status: 'Valid' }
    ],
    resourceMobilization: [
      { id: 'res_1', desc: 'Asphalt Paver (No.)', originalPlan: 3, revisedPlan: 3, available: 2, deficiency: 1, breakdown: '1 in good condition, 1 undergoing minor repair' },
      { id: 'res_2', desc: 'Motor Grader (No.)', originalPlan: 8, revisedPlan: 10, available: 9, deficiency: 1, breakdown: '9 active on sub-grade and base construction' },
      { id: 'res_3', desc: 'Excavator (No.)', originalPlan: 6, revisedPlan: 7, available: 7, deficiency: 0, breakdown: '7 active on rock cutting sections' },
      { id: 'res_4', desc: 'Dump Trucks (No.)', originalPlan: 45, revisedPlan: 50, available: 42, deficiency: 8, breakdown: '42 active, 8 pending arrival' },
      { id: 'res_5', desc: 'Aggregate Crusher (Set)', originalPlan: 2, revisedPlan: 2, available: 2, deficiency: 0, breakdown: '2 fully operational at quarry sites' }
    ],
    materialProduction: [
      { id: 'mat_1', desc: 'Sub-base material production', scope: '250,000 M3', thisMonth: 12500, totalToDate: 185000, used: 120000, availableStock: 15400, remainingBalance: 65000 },
      { id: 'mat_2', desc: 'Aggregate Base Course (0-40mm)', scope: '160,000 M3', thisMonth: 8200, totalToDate: 95000, used: 30000, availableStock: 12000, remainingBalance: 65000 },
      { id: 'mat_3', desc: 'Asphalt Concrete (AC) production', scope: '90,000 Ton', thisMonth: 4500, totalToDate: 48000, used: 6000, availableStock: 1500, remainingBalance: 42000 },
      { id: 'mat_4', desc: 'Portland Cement / Structural concrete', scope: '35,000 M3', thisMonth: 1100, totalToDate: 23000, used: 11000, availableStock: 2500, remainingBalance: 12000 }
    ],
    ipcTracker: [
      {
        id: 'ipc_1',
        paymentNo: 'IPC No. 1',
        period: 'Nov 2025',
        grossBillEtb: 265000000.00,
        grossBillUsd: 2200000.00,
        priceAdjustmentEtb: 14250000.00,
        advanceRepaymentEtb: 24500000.00,
        retentionEtb: 12649001.18,
        certifiedEtb: 242100998.82,
        certifiedUsd: 2100000,
        status: 'Paid',
        statusEtb: 'Paid',
        statusUsd: 'Paid',
        submissionDate: '2025-11-15',
        certificationDate: '2025-11-30',
        remarks: 'Initial interim payment certificate including earthwork & drainage works.'
      },
      {
        id: 'ipc_2',
        paymentNo: 'IPC No. 2',
        period: 'Jan 2026',
        grossBillEtb: 128400000.00,
        grossBillUsd: 1050000.00,
        priceAdjustmentEtb: 8650000.00,
        advanceRepaymentEtb: 21000000.00,
        retentionEtb: 5549400.00,
        certifiedEtb: 110500600.00,
        certifiedUsd: 950000,
        status: 'Paid',
        statusEtb: 'Paid',
        statusUsd: 'Paid',
        submissionDate: '2026-02-20',
        certificationDate: '2026-03-01',
        remarks: 'Subbase and crushed aggregate base course works with price escalation.'
      },
      {
        id: 'ipc_3',
        paymentNo: 'IPC No. 3 (Interim Claim)',
        period: 'Feb 2026',
        grossBillEtb: 142000000.00,
        grossBillUsd: 720000.00,
        priceAdjustmentEtb: 11200000.00,
        advanceRepaymentEtb: 21000000.00,
        retentionEtb: 6750000.00,
        certifiedEtb: 125450000.00,
        certifiedUsd: 650000,
        status: 'Unpaid',
        statusEtb: 'Unpaid',
        statusUsd: 'Unpaid',
        submissionDate: '2026-03-10',
        certificationDate: '2026-03-25',
        remarks: 'Asphalt concrete wearing course & major bridge structures under review.'
      },
      {
        id: 'ipc_4',
        paymentNo: 'IPC No. 4 (Draft)',
        period: 'May 2026',
        grossBillEtb: 98000000.00,
        grossBillUsd: 800000.00,
        priceAdjustmentEtb: 7400000.00,
        advanceRepaymentEtb: 15500000.00,
        retentionEtb: 4450000.00,
        certifiedEtb: 85450000.00,
        certifiedUsd: 720000,
        status: 'Unpaid',
        statusEtb: 'Unpaid',
        statusUsd: 'Unpaid',
        submissionDate: '2026-05-25',
        remarks: 'Draft monthly payment certificate under consultant verification.'
      }
    ],
    usdExchangeRate: 57.50,
    risks: defaultRoadRisks()
  };
}

export function blankProjectTemplate(): Project {
  const d = defaultProjectTemplate();
  d.id = 'proj_' + Date.now();
  d.name = 'New Project';
  d.physicalProgress = 0;
  d.origAmount = 0;
  d.variation = 0;
  d.lengthKm = 0;
  d.provisionalSum = 0;
  d.client = 'Ethiopian Roads Administration';
  d.consultant = '';
  d.contractor = '';
  d.signDate = new Date().toISOString().split('T')[0];
  d.startDate = new Date().toISOString().split('T')[0];
  d.origDays = 0;
  d.eotDays = 0;
  d.classification = 'DS-4';
  d.programDirectorate = 'Southern';
  d.pmo = 'PMO 1';
  d.progressPlanLabels = { monthLabel: 'Current Month', quarterLabel: 'Current Quarter', efyLabel: 'Current EFY' };
  d.progressPlanHistory = [];
  d.series.forEach(s => {
    s.contractAmt = 0;
    s.execAmt = 0;
    s.progress = 0;
    if (s.contractPct !== undefined) s.contractPct = 0;
  });
  d.quantities.forEach(q => {
    q.design = 0;
    q.plan = 0;
    q.exec = 0;
  });
  d.monthly.forEach(m => {
    m.originalPlan = 0;
    m.revisedPlan = 0;
    m.actual = 0;
  });
  d.payment.forEach(p => {
    p.amount = 0;
    p.percent = 0;
  });
  d.annual.forEach(a => {
    a.amount = 0;
    a.percent = 0;
  });
  d.progressPlan.contractor = { month: 0, quarter: 0, efy: 0, todate: 0 };
  d.progressPlan.era = { month: 0, quarter: 0, efy: 0, todate: 0 };
  d.progressPlan.actual = { month: 0, quarter: 0, efy: 0, todate: 0 };
  d.bonds.forEach(b => {
    b.amount = 0;
    b.issueDate = '';
    b.expireDate = '';
    b.bank = '';
    b.type = '';
  });
  d.rowMetrics.forEach(r => {
    r.value = 0;
  });
  d.workProgram.forEach(w => {
    w.duration = 0;
  });
  d.resourceMobilization = [];
  d.materialProduction = [];
  d.ipcTracker = [];
  d.images = [];
  d.history = [];
  d.risks = [];
  d.lastModifiedBy = null;
  d.lastModifiedAt = null;
  d.lastModifiedSection = null;
  d.approvedBy = null;
  d.approvedAt = null;
  d.approverRole = null;
  d.kpiAllocated = generateKpiAllocated(d.contractType);
  return d;
}
