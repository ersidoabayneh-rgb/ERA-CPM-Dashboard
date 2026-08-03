import { jsPDF } from 'jspdf';

/**
 * Ethiopian Roads Administration (ERA) ERP Dashboard - Official User Manual Generator
 * Generates an exact website user guide manual reflecting the real application layout,
 * featuring actual default project data ("Daye-Girja-Melka Desta & Meleya-Mejo Spur"),
 * detailed page diagrams for every website tab/view, feature guides, and troubleshooting workflows.
 */

export function downloadUserManual() {
  const doc = new jsPDF('p', 'pt', 'a4');
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 35;
  const contentWidth = pageWidth - margin * 2;

  let currentPage = 1;

  // Exact Brand Color Palette matching the Website (Slate, Blue, Indigo, Gold, Emerald, Amber, Rose)
  const colors = {
    navy: '#0f172a',        // Dark header / slate-900
    primary: '#1e3a8a',     // Blue-900
    accent: '#2563eb',      // Blue-600
    cyan: '#0284c7',        // Sky-600
    gold: '#d97706',        // Amber-600
    emerald: '#059669',     // Emerald-600
    rose: '#e11d48',        // Rose-600
    purple: '#7c3aed',      // Purple-600
    slateDark: '#334155',    // Slate-700
    slateLight: '#f8fafc',   // Slate-50
    border: '#cbd5e1',      // Slate-300
    borderLight: '#e2e8f0', // Slate-200
    textMain: '#1e293b',    // Slate-800
    textMuted: '#64748b',   // Slate-500
    white: '#ffffff',
  };

  const setFillHex = (hex: string) => {
    const rgb = hexToRgb(hex);
    doc.setFillColor(rgb.r, rgb.g, rgb.b);
  };

  const setDrawHex = (hex: string) => {
    const rgb = hexToRgb(hex);
    doc.setDrawColor(rgb.r, rgb.g, rgb.b);
  };

  const setTextHex = (hex: string) => {
    const rgb = hexToRgb(hex);
    doc.setTextColor(rgb.r, rgb.g, rgb.b);
  };

  function hexToRgb(hex: string) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    const num = parseInt(c, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
  }

  // Running Header & Footer for pages 2+
  const addPageHeaderFooter = (pageNo: number, title: string = 'ERA ERP Dashboard Official Website User Guide v1.0') => {
    doc.setPage(pageNo);
    
    // Top Bar
    setFillHex(colors.navy);
    doc.rect(0, 0, pageWidth, 28, 'F');
    
    // Accent Line
    setFillHex(colors.gold);
    doc.rect(0, 28, pageWidth, 2, 'F');

    setTextHex(colors.white);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('ETHIOPIAN ROADS ADMINISTRATION (ERA) • ENTERPRISE ERP', margin, 18);
    doc.setFont('helvetica', 'normal');
    doc.text(title, pageWidth - margin, 18, { align: 'right' });

    // Footer
    setDrawHex(colors.border);
    doc.line(margin, pageHeight - 32, pageWidth - margin, pageHeight - 32);

    setTextHex(colors.textMuted);
    doc.setFontSize(8);
    doc.text('Confidential • ERA Project Management Directorate Internal Operations & User Manual', margin, pageHeight - 18);
    doc.text(`Page ${pageNo}`, pageWidth - margin, pageHeight - 18, { align: 'right' });
  };

  // Section Heading Builder
  const addSectionHeading = (title: string, subtitle?: string, yOffset: number = 42): number => {
    let y = yOffset;
    
    setFillHex(colors.accent);
    doc.rect(margin, y, 4, 20, 'F');

    setTextHex(colors.navy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(title, margin + 10, y + 15);

    y += 24;

    if (subtitle) {
      setTextHex(colors.textMuted);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      const subLines = doc.splitTextToSize(subtitle, contentWidth - 10);
      doc.text(subLines, margin + 10, y);
      y += subLines.length * 11 + 4;
    }

    setDrawHex(colors.borderLight);
    doc.line(margin, y, pageWidth - margin, y);
    y += 12;

    return y;
  };

  // Website UI Browser Frame Renderer
  const drawScreenMockupFrame = (
    x: number, 
    y: number, 
    width: number, 
    height: number, 
    tabName: string,
    renderContents: (ix: number, iy: number, iw: number, ih: number) => void
  ) => {
    // Top Browser Bar
    setFillHex('#0f172a');
    doc.roundedRect(x, y, width, 22, 4, 4, 'F');

    // Controls
    setFillHex('#ef4444'); doc.circle(x + 10, y + 11, 2.5, 'F');
    setFillHex('#f59e0b'); doc.circle(x + 18, y + 11, 2.5, 'F');
    setFillHex('#10b981'); doc.circle(x + 26, y + 11, 2.5, 'F');

    // URL Bar
    setFillHex('#1e293b');
    doc.roundedRect(x + 36, y + 4, width - 150, 14, 3, 3, 'F');
    setTextHex('#94a3b8');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(`https://era-erp.gov.et/project/daye-girja-melka-desta/${tabName.toLowerCase().replace(/\s+/g, '-')}`, x + 42, y + 13);

    // Active User Badge
    setFillHex('#334155');
    doc.roundedRect(x + width - 108, y + 4, 100, 14, 3, 3, 'F');
    setTextHex('#38bdf8');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('👤 Directorate Admin (Live Sync)', x + width - 104, y + 13);

    // Website Canvas Background
    setFillHex('#f8fafc');
    setDrawHex('#cbd5e1');
    doc.rect(x, y + 22, width, height - 22, 'FD');

    // Tab Bar Simulation inside Website
    setFillHex('#ffffff');
    setDrawHex('#e2e8f0');
    doc.rect(x, y + 22, width, 18, 'FD');

    setTextHex('#2563eb');
    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`Active Tab: [ ${tabName} ]`, x + 8, y + 34);

    setTextHex('#64748b');
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.text('Contract: Daye-Girja-Melka Desta & Meleya-Mejo Spur (65+8.8 Km)', x + width - 210, y + 34);

    // Execute internal visual canvas drawing
    renderContents(x + 6, y + 44, width - 12, height - 48);
  };

  // ==========================================
  // PAGE 1: COVER PAGE
  // ==========================================
  setFillHex(colors.navy);
  doc.rect(0, 0, pageWidth, 230, 'F');

  setFillHex(colors.gold);
  doc.rect(0, 230, pageWidth, 6, 'F');

  // ERA Emblem Box
  setFillHex(colors.gold);
  doc.roundedRect(margin, 35, 48, 48, 8, 8, 'F');
  setTextHex(colors.navy);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('ERA', margin + 6, 66);

  // Cover Titles
  setTextHex(colors.white);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('ETHIOPIAN ROADS ADMINISTRATION', margin + 58, 52);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Federal Democratic Republic of Ethiopia • Infrastructure & PMO Directorate', margin + 58, 68);

  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('OFFICIAL ERP WEBSITE USER GUIDE', margin, 132);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Comprehensive Operational Manual with Page-by-Page Screen Diagrams', margin, 154);

  // Badge
  setFillHex('#0284c7');
  doc.roundedRect(margin, 172, 180, 22, 11, 11, 'F');
  setTextHex(colors.white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('VERSION 1.0 (2026 EDITION)', margin + 14, 186);

  let yPos = 260;

  // Default Project Reference Box
  setFillHex(colors.slateLight);
  setDrawHex(colors.border);
  doc.roundedRect(margin, yPos, contentWidth, 130, 6, 6, 'FD');

  setTextHex(colors.navy);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('PRIMARY REFERENCE PROJECT DATA USED IN THIS MANUAL', margin + 12, yPos + 20);

  setTextHex(colors.textMain);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  
  const refProjectSpecs = [
    '• Project Name: Daye-Girja-Melka Desta & Meleya-Mejo Spur Road Project',
    '• Client: Ethiopian Roads Administration (ERA) | Directorate: Southern | PMO: PMO 1',
    '• Consultant: LEA Associates South Asia JV | Contractor: China Tisiju Civil Engineering Group',
    '• Contract Type: Design-Bid-Build (DBB) | Classification: DS-4',
    '• Original Contract Amount: 1,555,708,167.88 ETB | Variation Amount: 72,163,600.00 ETB (Revised: 1,627.87M ETB)',
    '• Contract Duration: 1,095 Original Days + 730 Granted EOT Days = 1,825 Total Days (Signed: 2020-04-28)',
    '• Length: 65.00 Km Main Road + 8.80 Km Spur Road = 73.80 Km Total | Physical Progress: 40.73% (Lagging)',
    '• Financial IPC Total Certified: 762,116,445.92 ETB | Active Guarantees: CBE 155.57M ETB (Valid), Awash 242.10M ETB (Recovered)'
  ];

  let refY = yPos + 36;
  refProjectSpecs.forEach(spec => {
    doc.text(spec, margin + 12, refY);
    refY += 11.5;
  });

  // Target Specifications Grid
  yPos += 145;
  const specBoxW = (contentWidth - 16) / 3;
  
  setFillHex('#eff6ff'); setDrawHex('#bfdbfe');
  doc.roundedRect(margin, yPos, specBoxW, 60, 4, 4, 'FD');
  setTextHex('#1e40af'); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
  doc.text('TARGET AUDIENCE', margin + 8, yPos + 15);
  setTextHex(colors.textMain); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
  doc.text('Directorate Leads, Resident Engineers, PMO Staff, Financial Auditors', margin + 8, yPos + 30, { maxWidth: specBoxW - 16 });

  setFillHex('#f0fdf4'); setDrawHex('#bbf7d0');
  doc.roundedRect(margin + specBoxW + 8, yPos, specBoxW, 60, 4, 4, 'FD');
  setTextHex('#166534'); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
  doc.text('GOVERNANCE & STANDARDS', margin + specBoxW + 16, yPos + 15);
  setTextHex(colors.textMain); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
  doc.text('FIDIC 2017 Red/Yellow, EVM PMBOK 8th Ed, ERA Criteria', margin + specBoxW + 16, yPos + 30, { maxWidth: specBoxW - 16 });

  setFillHex('#fff7ed'); setDrawHex('#fed7aa');
  doc.roundedRect(margin + (specBoxW + 8) * 2, yPos, specBoxW, 60, 4, 4, 'FD');
  setTextHex('#9a3412'); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
  doc.text('LIVE DEPLOYED SYSTEM', margin + (specBoxW + 8) * 2 + 8, yPos + 15);
  setTextHex(colors.textMain); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
  doc.text('https://ais-pre-dymkh37kmyq73qemgibs3i-547568764811.europe-west1.run.app', margin + (specBoxW + 8) * 2 + 8, yPos + 30, { maxWidth: specBoxW - 16 });

  // Callout
  yPos += 72;
  setFillHex('#0f172a');
  doc.roundedRect(margin, yPos, contentWidth, 185, 6, 6, 'F');

  setTextHex(colors.gold);
  doc.setFontSize(11); doc.setFont('helvetica', 'bold');
  doc.text('CORE PURPOSE OF THE ERA ENTERPRISE ERP SYSTEM', margin + 16, yPos + 22);

  setTextHex(colors.white);
  doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
  const objectives = [
    '• Portfolio Oversight: Real-time monitoring across Southern, Northern, Eastern, Western, Central & Expressway Directorates.',
    '• FIDIC 2017 Contract Management: Tracking Extension of Time (EOT), Clause 20.1 claim notices, and variation approvals.',
    '• Financial Valuation & IPC Audit: Management of Interim Payment Certificates, 10% retention, price adjustment, and forex ratios.',
    '• Civil Engineering Layer Analysis: Sectional chainage progress from subgrade and capping to asphalt wearing course.',
    '• Bank Guarantee & Security Audit: Detection of expiring performance & advance payment bonds with amortized status support.',
    '• Multi-Project Executive Group Reports: Instant compilation of 5-dimension compliance scores and executive PDF exports.'
  ];

  let objY = yPos + 40;
  objectives.forEach(obj => {
    doc.text(obj, margin + 16, objY);
    objY += 22;
  });

  setTextHex(colors.textMuted);
  doc.setFontSize(8);
  doc.text('Published by Ethiopian Roads Administration IT & Project Directorate • Official Operations Document', margin, pageHeight - 20);

  // ==========================================
  // PAGE 2: TABLE OF CONTENTS & AUTHENTICATION
  // ==========================================
  doc.addPage();
  currentPage++;
  addPageHeaderFooter(currentPage);

  yPos = addSectionHeading('TABLE OF CONTENTS & PAGE MAP', 'Complete index of all website views, screen diagrams, and operational guides');

  const tocItems = [
    { num: '1.', title: 'Page 1 Picture & Guide: Portfolio Overview & Search Bar', page: 'Page 3' },
    { num: '2.', title: 'Page 2 Picture & Guide: Executive Dashboard & S-Curve (📊 Dashboard)', page: 'Page 4' },
    { num: '3.', title: 'Page 3 Picture & Guide: Financial Data & IPC Tracker (📋 Financial Data)', page: 'Page 5' },
    { num: '4.', title: 'Page 4 Picture & Guide: Issue Log & Blocker Action Tracking (🚩 Issue Log)', page: 'Page 6' },
    { num: '5.', title: 'Page 5 Picture & Guide: Linear Diagram & Station Chainages (📏 Linear diagram)', page: 'Page 7' },
    { num: '6.', title: 'Page 6 Picture & Guide: Utilities Relocation & ROW Compensation (🛣️ Utilities & ROW)', page: 'Page 8' },
    { num: '7.', title: 'Page 7 Picture & Guide: Progress Comparisons & Baselines (📈 Progress Comparisons)', page: 'Page 9' },
    { num: '8.', title: 'Page 8 Picture & Guide: BoQ Quantities Log & Civil Survey (📐 Quantities log)', page: 'Page 10' },
    { num: '9.', title: 'Page 9 Picture & Guide: Bank Guarantees & Expiry Audit (🔒 Bonds)', page: 'Page 11' },
    { num: '10.', title: 'Page 10 Picture & Guide: KPI Audit Scorecard (🎯 KPIs)', page: 'Page 12' },
    { num: '11.', title: 'Page 11 Picture & Guide: Monthly Cumulative Progress S-Curve (📅 Monthly Cumulative)', page: 'Page 13' },
    { num: '12.', title: 'Page 12 Picture & Guide: Work Program CPM Schedule (📅 Work Program CPM)', page: 'Page 14' },
    { num: '13.', title: 'Page 13 Picture & Guide: Logistics & Resource Mobilization (🚚 Logistics & Resources)', page: 'Page 15' },
    { num: '14.', title: 'Page 14 Picture & Guide: Project Risks & FIDIC Claims (⚠️ Project Risks)', page: 'Page 16' },
    { num: '15.', title: 'Page 15 Picture & Guide: Comprehensive Analysis & Diagnostics (📊 Comprehensive analysis)', page: 'Page 17' },
    { num: '16.', title: 'Page 16 Picture & Guide: Project Documentation & Vault (📁 Documentation)', page: 'Page 18' },
    { num: '17.', title: 'Page 17 Picture & Guide: Executive Group Report Generator Modal', page: 'Page 19' },
    { num: '18.', title: 'Troubleshooting Guide, Pre-Support Checklist & Technical Glossary', page: 'Page 20' }
  ];

  tocItems.forEach((item) => {
    setFillHex(colors.slateLight);
    setDrawHex(colors.borderLight);
    doc.roundedRect(margin, yPos, contentWidth, 18, 3, 3, 'FD');

    setTextHex(colors.accent);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(item.num, margin + 8, yPos + 12);

    setTextHex(colors.textMain);
    doc.setFont('helvetica', 'semibold');
    doc.text(item.title, margin + 24, yPos + 12);

    setTextHex(colors.textMuted);
    doc.setFont('helvetica', 'bold');
    doc.text(item.page, pageWidth - margin - 10, yPos + 12, { align: 'right' });

    yPos += 21;
  });

  yPos += 8;
  yPos = addSectionHeading('GETTING STARTED: AUTHENTICATION & ROLE-BASED ACCESS', 'How to log in, verify 2FA, switch projects, and navigate user permissions', yPos);

  setFillHex(colors.white);
  setDrawHex(colors.border);
  doc.roundedRect(margin, yPos, contentWidth, 140, 6, 6, 'FD');

  setTextHex(colors.navy);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Step-by-Step System Access Procedure', margin + 12, yPos + 18);

  const authSteps = [
    '1. Access Deployed URL: Open Chrome/Firefox and browse to the ERA Cloud Run web URL.',
    '2. Enterprise Credentials: Input your Username and Password on the central login portal.',
    '3. Role Selection: Roles include Master Admin, Directorate Admin (Southern, North, East, West, Central), PMO Lead, or Resident Engineer.',
    '4. Two-Factor Verification (2FA): Enter the 6-digit authentication pin issued to your authorized account.',
    '5. Project Selection: Select "Daye-Girja-Melka Desta & Meleya-Mejo Spur" from the active project portfolio.',
    '6. Cloud Persistence: All edits save immediately to the standalone backend database and sync seamlessly across connected devices.'
  ];

  let authY = yPos + 34;
  authSteps.forEach(step => {
    setTextHex(colors.textMain);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(step, margin + 12, authY);
    authY += 16;
  });

  // Helper for generating page picture diagram + text guide on subsequent pages
  const createDiagramPage = (
    pageNum: number,
    pageTitle: string,
    subtitle: string,
    mockupHeight: number,
    tabName: string,
    renderMockup: (ix: number, iy: number, iw: number, ih: number) => void,
    featureTitle: string,
    features: { label: string; detail: string }[]
  ) => {
    doc.addPage();
    currentPage++;
    addPageHeaderFooter(currentPage);

    let y = addSectionHeading(pageTitle, subtitle);

    // Draw Mockup Screen Diagram
    drawScreenMockupFrame(margin, y, contentWidth, mockupHeight, tabName, renderMockup);

    y += mockupHeight + 14;

    // Feature Explanations
    setTextHex(colors.navy);
    doc.setFontSize(10.5);
    doc.setFont('helvetica', 'bold');
    doc.text(featureTitle, margin, y);
    y += 14;

    features.forEach(f => {
      setTextHex(colors.accent);
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'bold');
      doc.text(f.label, margin + 8, y);

      setTextHex(colors.textMain);
      doc.setFont('helvetica', 'normal');
      doc.text(f.detail, margin + 130, y, { maxWidth: contentWidth - 140 });

      y += 20;
    });
  };

  // ==========================================
  // PAGE 3: WEBSITE PAGE 1 - PORTFOLIO SELECTION
  // ==========================================
  createDiagramPage(
    3,
    'WEBSITE PAGE 1: PORTFOLIO SELECTION & CONTRACTS OVERVIEW',
    'Visual Diagram & Operational Guide for the Master Projects Selection Screen',
    250,
    'Projects List Page',
    (ix, iy, iw, ih) => {
      // Top Header
      setFillHex('#ffffff'); setDrawHex('#cbd5e1');
      doc.roundedRect(ix, iy, iw, 28, 4, 4, 'FD');
      setTextHex('#0f172a'); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      doc.text('Ethiopian Roads Administration • Active Contracts Portfolio (Daye-Girja Project Loaded)', ix + 8, iy + 17);

      // Group Reports & Manual Buttons
      setFillHex('#4f46e5'); doc.roundedRect(ix + iw - 170, iy + 5, 80, 18, 4, 4, 'F');
      setTextHex('#ffffff'); doc.setFontSize(6.5); doc.text('📄 Group Reports', ix + iw - 162, iy + 16);

      setFillHex('#059669'); doc.roundedRect(ix + iw - 85, iy + 5, 80, 18, 4, 4, 'F');
      setTextHex('#ffffff'); doc.setFontSize(6.5); doc.text('📖 User Manual (PDF)', ix + iw - 80, iy + 16);

      // Search & Filters Bar
      setFillHex('#f1f5f9'); doc.roundedRect(ix, iy + 34, iw - 110, 20, 4, 4, 'F');
      setTextHex('#64748b'); doc.setFontSize(7); doc.text('🔍 Search project by name ("Daye-Girja"), contractor ("Tisiju"), or directorate ("Southern")...', ix + 8, iy + 47);

      setFillHex('#0284c7'); doc.roundedRect(ix + iw - 105, iy + 34, 105, 20, 4, 4, 'F');
      setTextHex('#ffffff'); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
      doc.text('Directorate: Southern ▾', ix + iw - 98, iy + 47);

      // Project Cards Grid
      const cardW = (iw - 12) / 2;
      const cardY = iy + 60;
      const cardH = 135;

      // Card 1: Reference Daye-Girja Project
      setFillHex('#ffffff'); setDrawHex('#3b82f6');
      doc.roundedRect(ix, cardY, cardW, cardH, 5, 5, 'FD');
      setFillHex('#eff6ff'); doc.rect(ix, cardY, cardW, 20, 'F');
      setTextHex('#1e40af'); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      doc.text('Daye-Girja-Melka Desta & Meleya-Mejo Spur', ix + 6, cardY + 14);

      setTextHex('#334155'); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
      doc.text('Contractor: China Tisiju Civil Engineering Group', ix + 6, cardY + 32);
      doc.text('Contract Value: 1,627,871,767.88 ETB (72.16M Variation)', ix + 6, cardY + 44);
      doc.text('Physical Progress: 40.73% | Time Elapsed: 65.00%', ix + 6, cardY + 56);
      doc.text('Total Length: 65.00 Km + 8.80 Km Spur = 73.80 Km', ix + 6, cardY + 68);

      // Warning Badge
      setFillHex('#fef3c7'); doc.roundedRect(ix + 6, cardY + 80, 110, 16, 8, 8, 'F');
      setTextHex('#b45309'); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
      doc.text('⚠️ WARNING: LAGGING PROGRESS', ix + 12, cardY + 91);

      // Card 2: Secondary Project
      setFillHex('#ffffff'); setDrawHex('#cbd5e1');
      doc.roundedRect(ix + cardW + 12, cardY, cardW, cardH, 5, 5, 'FD');
      setFillHex('#f8fafc'); doc.rect(ix + cardW + 12, cardY, cardW, 20, 'F');
      setTextHex('#0f172a'); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      doc.text('Modjo - Hawassa Expressway Phase II', ix + cardW + 18, cardY + 14);

      setTextHex('#334155'); doc.setFontSize(7); doc.setFont('helvetica', 'normal');
      doc.text('Contractor: Shandong Highway Engineering', ix + cardW + 18, cardY + 32);
      doc.text('Contract Value: 4,250,000,000.00 ETB', ix + cardW + 18, cardY + 44);
      doc.text('Physical Progress: 82.40% | Time Elapsed: 78.10%', ix + cardW + 18, cardY + 56);
      doc.text('Total Length: 92.00 Km Expressway', ix + cardW + 18, cardY + 68);

      // Good Badge
      setFillHex('#dcfce7'); doc.roundedRect(ix + cardW + 18, cardY + 80, 100, 16, 8, 8, 'F');
      setTextHex('#15803d'); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
      doc.text('✓ GOOD: ON SCHEDULE', ix + cardW + 24, cardY + 91);
    },
    'PAGE 1 PURPOSE & UI FEATURE EXPLANATIONS',
    [
      { label: '1. Directorate Filter:', detail: 'Filters project cards instantly by Directorate (Southern, Northern, Eastern, Western, Central, Expressway).' },
      { label: '2. Real-Time Search:', detail: 'Searches project titles, contractor names, consultants, route codes, or contract IDs.' },
      { label: '3. Project Status Badges:', detail: 'Displays automated health statuses (Critical, Warning, Good) based on expired bonds and progress lagging.' },
      { label: '4. Executive Group Reports:', detail: 'Opens the multi-project executive report modal to compile consolidated portfolio PDFs.' },
      { label: '5. User Manual PDF Download:', detail: 'Triggers instant client-side generation and download of this official operational user guide.' }
    ]
  );

  // ==========================================
  // PAGE 4: WEBSITE PAGE 2 - DASHBOARD TAB
  // ==========================================
  createDiagramPage(
    4,
    'WEBSITE PAGE 2: EXECUTIVE DASHBOARD VIEW (📊 Dashboard)',
    'Visual Diagram & Feature Guide for the Master Executive Overview Screen',
    250,
    '📊 Dashboard',
    (ix, iy, iw, ih) => {
      // Header Metadata
      setFillHex('#0f172a'); doc.roundedRect(ix, iy, iw, 30, 4, 4, 'F');
      setTextHex('#ffffff'); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
      doc.text('Daye-Girja-Melka Desta & Meleya-Mejo Spur • Executive Dashboard Summary', ix + 8, iy + 18);

      setFillHex('#d97706'); doc.roundedRect(ix + iw - 110, iy + 5, 102, 20, 10, 10, 'F');
      setTextHex('#ffffff'); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
      doc.text('KPI GRADE: C (72.4%)', ix + iw - 100, iy + 18);

      // 4 Metric Tiles
      const tileW = (iw - 18) / 4;
      const tileY = iy + 36;
      const tileH = 45;

      // Tile 1
      setFillHex('#ffffff'); setDrawHex('#cbd5e1'); doc.roundedRect(ix, tileY, tileW, tileH, 4, 4, 'FD');
      setTextHex('#64748b'); doc.setFontSize(6.5); doc.text('REVISED CONTRACT VALUE', ix + 6, tileY + 12);
      setTextHex('#0f172a'); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.text('1,627,871,767 ETB', ix + 6, tileY + 28);

      // Tile 2
      setFillHex('#ffffff'); setDrawHex('#cbd5e1'); doc.roundedRect(ix + tileW + 6, tileY, tileW, tileH, 4, 4, 'FD');
      setTextHex('#64748b'); doc.setFontSize(6.5); doc.text('PHYSICAL PROGRESS', ix + tileW + 12, tileY + 12);
      setTextHex('#e11d48'); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.text('40.73% (Lagging)', ix + tileW + 12, tileY + 28);

      // Tile 3
      setFillHex('#ffffff'); setDrawHex('#cbd5e1'); doc.roundedRect(ix + (tileW + 6) * 2, tileY, tileW, tileH, 4, 4, 'FD');
      setTextHex('#64748b'); doc.setFontSize(6.5); doc.text('ELAPSED CONTRACT TIME', ix + (tileW + 6) * 2 + 6, tileY + 12);
      setTextHex('#d97706'); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.text('65.00% (1,186 / 1,825d)', ix + (tileW + 6) * 2 + 6, tileY + 28);

      // Tile 4
      setFillHex('#ffffff'); setDrawHex('#cbd5e1'); doc.roundedRect(ix + (tileW + 6) * 3, tileY, tileW, tileH, 4, 4, 'FD');
      setTextHex('#64748b'); doc.setFontSize(6.5); doc.text('TOTAL CERTIFIED IPCs', ix + (tileW + 6) * 3 + 6, tileY + 12);
      setTextHex('#059669'); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.text('762,116,445 ETB', ix + (tileW + 6) * 3 + 6, tileY + 28);

      // S-Curve Canvas Area
      const chartY = iy + 88;
      const chartH = 110;
      setFillHex('#ffffff'); setDrawHex('#cbd5e1'); doc.roundedRect(ix, chartY, iw, chartH, 5, 5, 'FD');
      setTextHex('#0f172a'); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      doc.text('📈 Cumulative Progress S-Curve (Original Plan vs Revised Plan vs Actual Physical Execution)', ix + 8, chartY + 14);

      // Axes
      setDrawHex('#e2e8f0'); doc.line(ix + 25, chartY + 25, ix + 25, chartY + 95);
      doc.line(ix + 25, chartY + 95, ix + iw - 15, chartY + 95);

      // Planned Line
      setDrawHex('#2563eb'); doc.setLineWidth(1.5);
      doc.line(ix + 25, chartY + 95, ix + 120, chartY + 75);
      doc.line(ix + 120, chartY + 75, ix + 250, chartY + 45);
      doc.line(ix + 250, chartY + 45, ix + iw - 15, chartY + 25);

      // Actual Line
      setDrawHex('#e11d48'); doc.setLineWidth(2);
      doc.line(ix + 25, chartY + 95, ix + 120, chartY + 85);
      doc.line(ix + 120, chartY + 85, ix + 250, chartY + 62);

      doc.setLineWidth(1);

      setTextHex('#2563eb'); doc.setFontSize(6.5); doc.text('--- Planned Baseline (65.0%)', ix + iw - 180, chartY + 14);
      setTextHex('#e11d48'); doc.setFontSize(6.5); doc.text('── Actual Progress (40.73%)', ix + iw - 90, chartY + 14);
    },
    'PAGE 2 PURPOSE & UI FEATURE EXPLANATIONS',
    [
      { label: '1. Executive KPI Grade:', detail: 'Computes overall project score (A-D) dynamically combining time, EVM, bonds, and layer metrics.' },
      { label: '2. Contract Key Figures:', detail: 'Displays Original Amount (1,555.71M), Variation (72.16M), Revised Amount (1,627.87M), and Certified IPC Total.' },
      { label: '3. Progress vs Time Gauge:', detail: 'Highlights time slippage variance (40.73% physical completion vs 65.00% elapsed contract time).' },
      { label: '4. Cumulative S-Curve Chart:', detail: 'Renders S-curve mapping baseline planned targets against recorded site execution.' },
      { label: '5. Field Photo Gallery:', detail: 'Supports site inspection photo uploads with direct database persistence.' }
    ]
  );

  // ==========================================
  // PAGE 5: WEBSITE PAGE 3 - FINANCIAL DATA
  // ==========================================
  createDiagramPage(
    5,
    'WEBSITE PAGE 3: FINANCIAL DATA & IPC TRACKER (📋 Financial Data)',
    'Visual Diagram & Feature Guide for BOQ Division Series & Payment Certificates',
    250,
    '📋 Financial Data',
    (ix, iy, iw, ih) => {
      // Header
      setFillHex('#0f172a'); doc.roundedRect(ix, iy, iw, 26, 4, 4, 'F');
      setTextHex('#ffffff'); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
      doc.text('BOQ Division Series Breakdown & Interim Payment Certificate (IPC) Ledger', ix + 8, iy + 17);

      // IPC Ledger Table
      const tableY = iy + 32;
      setFillHex('#ffffff'); setDrawHex('#cbd5e1'); doc.roundedRect(ix, tableY, iw, 160, 4, 4, 'FD');

      setFillHex('#1e293b'); doc.rect(ix, tableY, iw, 18, 'F');
      setTextHex('#ffffff'); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
      doc.text('IPC NO.', ix + 6, tableY + 12);
      doc.text('PERIOD', ix + 55, tableY + 12);
      doc.text('GROSS ETB', ix + 115, tableY + 12);
      doc.text('PRICE ADJ. ETB', ix + 185, tableY + 12);
      doc.text('ADVANCE RECOVERY', ix + 265, tableY + 12);
      doc.text('CERTIFIED ETB', ix + 360, tableY + 12);
      doc.text('STATUS', ix + 450, tableY + 12);

      const ipcRows = [
        { no: 'IPC No. 1', period: 'Nov 2025', gross: '265,000,000.00', adj: '14,250,000.00', adv: '24,500,000.00', cert: '242,100,998.82', status: 'PAID', color: '#166534', bg: '#dcfce7' },
        { no: 'IPC No. 2', period: 'Jan 2026', gross: '128,400,000.00', adj: '8,650,000.00', adv: '21,000,000.00', cert: '110,500,600.00', status: 'PAID', color: '#166534', bg: '#dcfce7' },
        { no: 'IPC No. 3', period: 'Feb 2026', gross: '142,000,000.00', adj: '11,200,000.00', adv: '21,000,000.00', cert: '125,450,000.00', status: 'UNPAID (>56d)', color: '#b91c1c', bg: '#fee2e2' },
        { no: 'IPC No. 4', period: 'May 2026', gross: '98,000,000.00', adj: '7,400,000.00', adv: '15,500,000.00', cert: '85,450,000.00', status: 'DRAFT', color: '#b45309', bg: '#fef3c7' }
      ];

      let ry = tableY + 30;
      ipcRows.forEach(r => {
        setTextHex('#334155'); doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
        doc.text(r.no, ix + 6, ry);
        doc.text(r.period, ix + 55, ry);
        doc.text(r.gross, ix + 115, ry);
        doc.text(r.adj, ix + 185, ry);
        doc.text(r.adv, ix + 265, ry);
        doc.text(r.cert, ix + 360, ry);

        setFillHex(r.bg); doc.roundedRect(ix + 445, ry - 8, 70, 12, 6, 6, 'F');
        setTextHex(r.color); doc.setFontSize(5.5); doc.setFont('helvetica', 'bold');
        doc.text(r.status, ix + 450, ry);

        setDrawHex('#f1f5f9'); doc.line(ix + 5, ry + 4, ix + iw - 5, ry + 4);
        ry += 22;
      });
    },
    'PAGE 3 PURPOSE & UI FEATURE EXPLANATIONS',
    [
      { label: '1. BOQ Series Breakdown:', detail: 'Manages Division 1000 General, 2000 Clearance, 3000 Drainage, 4000 Earthworks, 5000 Sub-base/Base, 6000 Bituminous, 8000 Structures.' },
      { label: '2. IPC Payment Certificate Ledger:', detail: 'Audits Gross Bills, 10% Retention, Price Adjustment certificates (FIDIC 13.8), and Advance Repayment deductions.' },
      { label: '3. Multi-Currency Support:', detail: 'Tracks dual ETB and USD component valuations with automated forex exchange conversion (57.50 ETB/USD).' },
      { label: '4. Unpaid IPC Aging Alert:', detail: 'Flags certified payments unpaid past 56 days as critical interest liabilities under FIDIC Sub-clause 14.8.' }
    ]
  );

  // ==========================================
  // PAGE 6: WEBSITE PAGE 4 - ISSUE LOG
  // ==========================================
  createDiagramPage(
    6,
    'WEBSITE PAGE 4: ISSUE LOG & BLOCKER ACTION TRACKING (🚩 Issue Log)',
    'Visual Diagram & Feature Guide for Critical Project Issue Management',
    250,
    '🚩 Issue Log',
    (ix, iy, iw, ih) => {
      // Header
      setFillHex('#0f172a'); doc.roundedRect(ix, iy, iw, 26, 4, 4, 'F');
      setTextHex('#ffffff'); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
      doc.text('Project Issues, Critical Blockers, Responsibility & Action Item Tracker', ix + 8, iy + 17);

      // Issues Table
      const tableY = iy + 32;
      setFillHex('#ffffff'); setDrawHex('#cbd5e1'); doc.roundedRect(ix, tableY, iw, 160, 4, 4, 'FD');

      setFillHex('#1e293b'); doc.rect(ix, tableY, iw, 18, 'F');
      setTextHex('#ffffff'); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
      doc.text('ISSUE REF & DESCRIPTION', ix + 6, tableY + 12);
      doc.text('CATEGORY', ix + 165, tableY + 12);
      doc.text('SEVERITY', ix + 235, tableY + 12);
      doc.text('RESPONSIBLE PARTY', ix + 305, tableY + 12);
      doc.text('TARGET DATE', ix + 410, tableY + 12);
      doc.text('STATUS', ix + 470, tableY + 12);

      const issuesData = [
        { ref: 'ISSUE-01: Delay in EEU Electric Pole Relocation', cat: 'Right of Way', sev: 'CRITICAL', party: 'EEU / ERA ROW Dept', date: '2026-03-31', status: 'OPEN', color: '#b91c1c' },
        { ref: 'ISSUE-02: Aggregate Crusher Mechanical Failure', cat: 'Logistics', sev: 'HIGH', party: 'Contractor (Tisiju)', date: '2026-02-15', status: 'IN PROGRESS', color: '#b45309' },
        { ref: 'ISSUE-03: Black Cotton Soil Capping Replacement', cat: 'Technical', sev: 'MEDIUM', party: 'Consultant (LEA JV)', date: '2026-04-10', status: 'OPEN', color: '#2563eb' },
        { ref: 'ISSUE-04: Delay in Unpaid Compensation (Melka Desta)', cat: 'Financial', sev: 'CRITICAL', party: 'ERA Finance / Woreda', date: '2026-03-15', status: 'OPEN', color: '#b91c1c' }
      ];

      let ry = tableY + 30;
      issuesData.forEach(i => {
        setTextHex('#334155'); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
        doc.text(i.ref, ix + 6, ry);
        doc.setFont('helvetica', 'normal');
        doc.text(i.cat, ix + 165, ry);
        
        setTextHex(i.color); doc.setFont('helvetica', 'bold');
        doc.text(i.sev, ix + 235, ry);
        
        setTextHex('#334155'); doc.setFont('helvetica', 'normal');
        doc.text(i.party, ix + 305, ry);
        doc.text(i.date, ix + 410, ry);
        
        setTextHex(i.color); doc.setFont('helvetica', 'bold');
        doc.text(i.status, ix + 470, ry);

        setDrawHex('#f1f5f9'); doc.line(ix + 5, ry + 4, ix + iw - 5, ry + 4);
        ry += 22;
      });
    },
    'PAGE 4 PURPOSE & UI FEATURE EXPLANATIONS',
    [
      { label: '1. Issue Log Matrix:', detail: 'Captures critical field blockers, material shortfalls, utility delays, and right-of-way disputes.' },
      { label: '2. Severity Categorization:', detail: 'Grades items into Critical, High, Medium, and Low severity levels to prioritize site action.' },
      { label: '3. Responsibility Assignment:', detail: 'Assigns clear accountability to Contractor, Supervising Engineer, ERA ROW Department, or Utility Agencies.' },
      { label: '4. Resolution Target Deadlines:', detail: 'Establishes target resolution dates to prevent contractual claims under FIDIC Sub-clause 8.4.' }
    ]
  );

  // ==========================================
  // PAGE 7: WEBSITE PAGE 5 - LINEAR DIAGRAM
  // ==========================================
  createDiagramPage(
    7,
    'WEBSITE PAGE 5: LINEAR DIAGRAM & STATION CHAINAGES (📏 Linear diagram)',
    'Visual Diagram & Feature Guide for Station-by-Station Road Layer Construction',
    250,
    '📏 Linear diagram',
    (ix, iy, iw, ih) => {
      // Header
      setFillHex('#0f172a'); doc.roundedRect(ix, iy, iw, 26, 4, 4, 'F');
      setTextHex('#ffffff'); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
      doc.text('Linear Road Section Layer Completion • Main Road (Km 00-22) & Spur Road (Km 00-08)', ix + 8, iy + 17);

      // Layer Bars Visual
      const layers = [
        { name: '1. Subgrade Layer (Earthwork Prep)', pct: 100, color: '#10b981', km: '22.90 Km Completed' },
        { name: '2. Capping Layer (Selected Material)', pct: 85.2, color: '#0284c7', km: '19.50 Km Completed' },
        { name: '3. Sub-base Course (Granular Material)', pct: 62.4, color: '#2563eb', km: '14.30 Km Completed' },
        { name: '4. Crushed Stone Basecourse (GBM)', pct: 40.5, color: '#d97706', km: '9.30 Km Completed' },
        { name: '5. Asphalt Concrete Wearing Course', pct: 31.8, color: '#e11d48', km: '7.30 Km Completed' }
      ];

      let ly = iy + 36;
      layers.forEach(l => {
        setTextHex('#0f172a'); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
        doc.text(l.name, ix + 6, ly);
        
        setTextHex(l.color); doc.setFontSize(7);
        doc.text(`${l.km} (${l.pct}%)`, ix + iw - 130, ly);

        // Track
        setFillHex('#e2e8f0'); doc.roundedRect(ix + 6, ly + 5, iw - 12, 12, 6, 6, 'F');
        // Fill
        const fillW = Math.max(10, ((iw - 12) * l.pct) / 100);
        setFillHex(l.color); doc.roundedRect(ix + 6, ly + 5, fillW, 12, 6, 6, 'F');

        ly += 30;
      });
    },
    'PAGE 5 PURPOSE & UI FEATURE EXPLANATIONS',
    [
      { label: '1. Linear Station Chainage:', detail: 'Tracks precise 1 Km section stations (e.g. Km 00+000 to Km 01+000) for Main Road and Spur Road.' },
      { label: '2. Layer Structural Stack:', detail: 'Monitors progress sequentially across Subgrade, Capping, Sub-base, Base Course, and Asphalt Surfacing.' },
      { label: '3. Spur Road Integration:', detail: 'Includes dedicated linear chainage tracking for the Meleya-Mejo 8.80 Km spur link.' },
      { label: '4. Capping Override Rules:', detail: 'Supports custom capping station overrides for sections requiring specialized sub-excavation.' }
    ]
  );

  // ==========================================
  // PAGE 8: WEBSITE PAGE 6 - UTILITIES & ROW
  // ==========================================
  createDiagramPage(
    8,
    'WEBSITE PAGE 6: UTILITIES RELOCATION & ROW COMPENSATION (🛣️ Utilities & ROW)',
    'Visual Diagram & Feature Guide for Right-of-Way Clearances & Utility Relocations',
    250,
    '🛣️ Utilities & ROW',
    (ix, iy, iw, ih) => {
      // Header
      setFillHex('#0f172a'); doc.roundedRect(ix, iy, iw, 26, 4, 4, 'F');
      setTextHex('#ffffff'); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
      doc.text('Right-of-Way (ROW) Property Compensation & Public Utilities Relocation Status', ix + 8, iy + 17);

      // ROW Metrics Box
      const rowY = iy + 32;
      setFillHex('#ffffff'); setDrawHex('#cbd5e1'); doc.roundedRect(ix, rowY, iw, 50, 4, 4, 'FD');

      const metrics = [
        { label: 'PROJECT LENGTH', val: '65.00 Km' },
        { label: 'ROW REQUESTED', val: '61.42 Km' },
        { label: 'OBSTRUCTION FREE', val: '43.23 Km' },
        { label: 'UNPAID SECTION', val: '17.23 Km' }
      ];

      let mx = ix + 10;
      const mw = (iw - 30) / 4;
      metrics.forEach(m => {
        setTextHex('#64748b'); doc.setFontSize(6); doc.setFont('helvetica', 'bold');
        doc.text(m.label, mx, rowY + 14);
        setTextHex('#0f172a'); doc.setFontSize(8.5);
        doc.text(m.val, mx, rowY + 32);
        mx += mw;
      });

      // Compensation Table
      const compY = rowY + 58;
      setFillHex('#ffffff'); setDrawHex('#cbd5e1'); doc.roundedRect(ix, compY, iw, 100, 4, 4, 'FD');

      setFillHex('#1e293b'); doc.rect(ix, compY, iw, 16, 'F');
      setTextHex('#ffffff'); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
      doc.text('UTILITY / WOREDA', ix + 6, compY + 11);
      doc.text('AGENCY / PAPs', ix + 110, compY + 11);
      doc.text('QUANTITY', ix + 210, compY + 11);
      doc.text('REQUIRED (M ETB)', ix + 285, compY + 11);
      doc.text('PAID (M ETB)', ix + 375, compY + 11);
      doc.text('STATUS', ix + 450, compY + 11);

      const compRows = [
        { item: 'Daye Woreda PAPs', agency: '120 Affected PAPs', qty: '15.4 Km Section', req: '15.40 M', paid: '15.40 M', status: 'FULLY PAID', color: '#166534' },
        { item: 'Girja Woreda PAPs', agency: '85 Affected PAPs', qty: '12.8 Km Section', req: '12.80 M', paid: '9.20 M', status: 'PARTIAL (3.6M)', color: '#b45309' },
        { item: 'Melka Desta PAPs', agency: '64 Disputed PAPs', qty: '8.5 Km Section', req: '8.50 M', paid: '0.00 M', status: 'UNPAID DISPUTE', color: '#b91c1c' },
        { item: 'Electric Power Lines', agency: 'EEU Utility', qty: '142 Poles', req: '4.50 M', paid: '3.00 M', status: 'IN PROGRESS', color: '#b45309' }
      ];

      let cy = compY + 28;
      compRows.forEach(c => {
        setTextHex('#334155'); doc.setFontSize(6.5); doc.setFont('helvetica', 'normal');
        doc.text(c.item, ix + 6, cy);
        doc.text(c.agency, ix + 110, cy);
        doc.text(c.qty, ix + 210, cy);
        doc.text(c.req, ix + 285, cy);
        doc.text(c.paid, ix + 375, cy);

        setTextHex(c.color); doc.setFont('helvetica', 'bold');
        doc.text(c.status, ix + 450, cy);

        setDrawHex('#f1f5f9'); doc.line(ix + 5, cy + 4, ix + iw - 5, cy + 4);
        cy += 18;
      });
    },
    'PAGE 6 PURPOSE & UI FEATURE EXPLANATIONS',
    [
      { label: '1. ROW Obstruction Tracking:', detail: 'Monitors cleared vs obstructed section lengths across Daye, Girja, Melka Desta, and Meleya-Mejo woredas.' },
      { label: '2. Compensation Disbursements:', detail: 'Audits required vs disbursed compensation funds to Project Affected Persons (PAPs).' },
      { label: '3. Utility Relocation Auditing:', detail: 'Tracks relocation schedules for 142 EEU electric poles, 3.8 Km Ethio Telecom cables, and water pipelines.' },
      { label: '4. Land Ownership Disputes:', detail: 'Flags disputed land boundary sections to accelerate regional mediation and site handover.' }
    ]
  );

  // ==========================================
  // PAGE 9: WEBSITE PAGE 7 - PROGRESS COMPARISONS
  // ==========================================
  createDiagramPage(
    9,
    'WEBSITE PAGE 7: PROGRESS COMPARISONS & BASELINES (📈 Progress Comparisons)',
    'Visual Diagram & Feature Guide for Contractor vs ERA Planned Progress Comparisons',
    250,
    '📈 Progress Comparisons',
    (ix, iy, iw, ih) => {
      // Header
      setFillHex('#0f172a'); doc.roundedRect(ix, iy, iw, 26, 4, 4, 'F');
      setTextHex('#ffffff'); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
      doc.text('Contractor Work Program Plan vs ERA Approved Baseline vs Actual Physical Completion', ix + 8, iy + 17);

      // Comparison Table
      const tableY = iy + 32;
      setFillHex('#ffffff'); setDrawHex('#cbd5e1'); doc.roundedRect(ix, tableY, iw, 160, 4, 4, 'FD');

      setFillHex('#1e293b'); doc.rect(ix, tableY, iw, 18, 'F');
      setTextHex('#ffffff'); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
      doc.text('EVALUATION PERIOD', ix + 6, tableY + 12);
      doc.text('CONTRACTOR PLAN (%)', ix + 120, tableY + 12);
      doc.text('ERA APPROVED PLAN (%)', ix + 230, tableY + 12);
      doc.text('ACTUAL EXECUTED (%)', ix + 350, tableY + 12);
      doc.text('VARIANCE (ACT - ERA)', ix + 450, tableY + 12);

      const compData = [
        { period: 'Current Month (Feb 2026)', contractor: '2.75%', era: '1.50%', actual: '2.28%', var: '+0.78%', color: '#166534' },
        { period: 'Current Quarter (Feb-Apr 2026)', contractor: '5.12%', era: '3.00%', actual: '3.73%', var: '+0.73%', color: '#166534' },
        { period: 'Current EFY (EFY 2018)', contractor: '7.35%', era: '4.00%', actual: '4.80%', var: '+0.80%', color: '#166534' },
        { period: 'Cumulative To-Date', contractor: '65.00%', era: '34.50%', actual: '27.29%', var: '-7.21%', color: '#b91c1c' }
      ];

      let ry = tableY + 30;
      compData.forEach(c => {
        setTextHex('#334155'); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
        doc.text(c.period, ix + 6, ry);
        doc.setFont('helvetica', 'normal');
        doc.text(c.contractor, ix + 120, ry);
        doc.text(c.era, ix + 230, ry);
        doc.text(c.actual, ix + 350, ry);

        setTextHex(c.color); doc.setFont('helvetica', 'bold');
        doc.text(c.var, ix + 450, ry);

        setDrawHex('#f1f5f9'); doc.line(ix + 5, ry + 4, ix + iw - 5, ry + 4);
        ry += 24;
      });
    },
    'PAGE 7 PURPOSE & UI FEATURE EXPLANATIONS',
    [
      { label: '1. Tri-Party Baseline Alignment:', detail: 'Compares Contractor submitted targets, ERA approved supervisor baselines, and actual field execution.' },
      { label: '2. Periodical Evaluation Windows:', detail: 'Evaluates monthly performance (Feb 2026), quarterly forecasts, EFY annual targets, and to-date totals.' },
      { label: '3. Schedule Variance Indicators:', detail: 'Calculates exact percentage points slippage or gain (+0.78% monthly gain vs -7.21% cumulative lag).' },
      { label: '4. Historical Progress Snapshots:', detail: 'Archives monthly evaluation snapshots to maintain audit trails for Extension of Time (EOT) reviews.' }
    ]
  );

  // ==========================================
  // PAGE 10: WEBSITE PAGE 8 - QUANTITIES LOG
  // ==========================================
  createDiagramPage(
    10,
    'WEBSITE PAGE 8: BoQ QUANTITIES LOG & CIVIL SURVEY (📐 Quantities log)',
    'Visual Diagram & Feature Guide for Bill of Quantities Execution Tracking',
    250,
    '📐 Quantities log',
    (ix, iy, iw, ih) => {
      // Header
      setFillHex('#0f172a'); doc.roundedRect(ix, iy, iw, 26, 4, 4, 'F');
      setTextHex('#ffffff'); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
      doc.text('BoQ Civil Works Quantities • Design Scope vs Planned vs Actual Executed Quantities', ix + 8, iy + 17);

      // Quantities Table
      const tableY = iy + 32;
      setFillHex('#ffffff'); setDrawHex('#cbd5e1'); doc.roundedRect(ix, tableY, iw, 160, 4, 4, 'FD');

      setFillHex('#1e293b'); doc.rect(ix, tableY, iw, 18, 'F');
      setTextHex('#ffffff'); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
      doc.text('PAY ITEM DESCRIPTION', ix + 6, tableY + 12);
      doc.text('DESIGN SCOPE', ix + 155, tableY + 12);
      doc.text('PLANNED QTY', ix + 245, tableY + 12);
      doc.text('EXECUTED QTY', ix + 335, tableY + 12);
      doc.text('COMPLETION %', ix + 435, tableY + 12);

      const qtyData = [
        { desc: 'Site Clearing (Ha)', design: '2,222.00', plan: '333,244.00', exec: '345,353.00', pct: '100.0%' },
        { desc: 'Common Excavation (M3)', design: '2,321,847.00', plan: '2,608,000.00', exec: '2,493,000.00', pct: '100.0%' },
        { desc: 'Embankment Fill (M3)', design: '1,237,439.05', plan: '625,972.06', exec: '425,972.06', pct: '34.4%' },
        { desc: 'Sub Base Course (Km)', design: '65.00', plan: '38.57', exec: '33.48', pct: '51.5%' },
        { desc: 'Asphalt Concrete Wearing (Km)', design: '65.00', plan: '34.14', exec: '20.75', pct: '31.9%' },
        { desc: 'Total Pipe Culverts (No.)', design: '115.00', plan: '105.00', exec: '73.00', pct: '63.5%' }
      ];

      let ry = tableY + 30;
      qtyData.forEach(q => {
        setTextHex('#334155'); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
        doc.text(q.desc, ix + 6, ry);
        doc.setFont('helvetica', 'normal');
        doc.text(q.design, ix + 155, ry);
        doc.text(q.plan, ix + 245, ry);
        doc.text(q.exec, ix + 335, ry);

        setTextHex('#2563eb'); doc.setFont('helvetica', 'bold');
        doc.text(q.pct, ix + 435, ry);

        setDrawHex('#f1f5f9'); doc.line(ix + 5, ry + 4, ix + iw - 5, ry + 4);
        ry += 20;
      });
    },
    'PAGE 8 PURPOSE & UI FEATURE EXPLANATIONS',
    [
      { label: '1. Major Civil Work Scope:', detail: 'Tracks Earthworks, Capping, Sub-base, Base Course, Asphalt, Culverts, Masonry Retaining Walls, and Bridges.' },
      { label: '2. Design vs Measured Quantities:', detail: 'Compares original contract BoQ estimates against joint surveyor re-measurements.' },
      { label: '3. Volume & Linear Unit Handling:', detail: 'Supports dual volumetric (M3, Ha, Ton) and linear station length (Km) measurement units.' },
      { label: '4. Over-Execution Alerts:', detail: 'Highlights pay items exceeding 100% design scope to trigger formal variation order approvals.' }
    ]
  );

  // ==========================================
  // PAGE 11: WEBSITE PAGE 9 - BANK GUARANTEES
  // ==========================================
  createDiagramPage(
    11,
    'WEBSITE PAGE 9: BANK GUARANTEES & EXPIRY AUDIT (🔒 Bonds)',
    'Visual Diagram & Feature Guide for Performance & Advance Securities Audit',
    250,
    '🔒 Bonds',
    (ix, iy, iw, ih) => {
      // Header
      setFillHex('#0f172a'); doc.roundedRect(ix, iy, iw, 26, 4, 4, 'F');
      setTextHex('#ffffff'); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
      doc.text('Bank Security Guarantees Audit • Expiry Alerts & Amortized Advance Recovery Status', ix + 8, iy + 17);

      // Compliance Rule Banner
      setFillHex('#ecfdf5'); setDrawHex('#10b981'); doc.roundedRect(ix, iy + 30, iw, 20, 4, 4, 'FD');
      setTextHex('#047857'); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
      doc.text('✓ GOVERNANCE RULE: Fully Amortized / Recovered Advance Payment Guarantees evaluate as VALID securities in health grading.', ix + 8, iy + 43);

      // Bonds Table
      const tableY = iy + 54;
      setFillHex('#ffffff'); setDrawHex('#cbd5e1'); doc.roundedRect(ix, tableY, iw, 140, 4, 4, 'FD');

      setFillHex('#1e293b'); doc.rect(ix, tableY, iw, 18, 'F');
      setTextHex('#ffffff'); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
      doc.text('GUARANTEE TYPE', ix + 6, tableY + 12);
      doc.text('ISSUING BANK', ix + 120, tableY + 12);
      doc.text('AMOUNT (ETB / USD)', ix + 220, tableY + 12);
      doc.text('EXPIRY DATE', ix + 335, tableY + 12);
      doc.text('AUDIT STATUS', ix + 420, tableY + 12);

      const bondData = [
        { type: 'Performance Guarantee', bank: 'Commercial Bank of Ethiopia', amt: '155,570,816.79 ETB ($1.35M)', exp: '2027-12-31', status: 'VALID', color: '#166534', bg: '#dcfce7' },
        { type: 'Advance Payment Guarantee', bank: 'Awash Bank S.C.', amt: '242,100,998.82 ETB ($2.10M)', exp: '2024-06-01', status: 'RECOVERED', color: '#047857', bg: '#d1fae5' },
        { type: 'Retention Money Guarantee', bank: 'Nib International Bank', amt: '50,000,000.00 ETB ($435k)', exp: '2027-01-15', status: 'VALID', color: '#166534', bg: '#dcfce7' }
      ];

      let ry = tableY + 30;
      bondData.forEach(b => {
        setTextHex('#334155'); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
        doc.text(b.type, ix + 6, ry);
        doc.setFont('helvetica', 'normal');
        doc.text(b.bank, ix + 120, ry);
        doc.text(b.amt, ix + 220, ry);
        doc.text(b.exp, ix + 335, ry);

        setFillHex(b.bg); doc.roundedRect(ix + 415, ry - 8, 85, 12, 6, 6, 'F');
        setTextHex(b.color); doc.setFontSize(5.5); doc.setFont('helvetica', 'bold');
        doc.text(b.status, ix + 420, ry);

        setDrawHex('#f1f5f9'); doc.line(ix + 5, ry + 4, ix + iw - 5, ry + 4);
        ry += 24;
      });
    },
    'PAGE 9 PURPOSE & UI FEATURE EXPLANATIONS',
    [
      { label: '1. Securities Ledger Audit:', detail: 'Audits Performance Securities, Advance Payment Guarantees, Retention Guarantees, and CAR Insurance.' },
      { label: '2. Proactive Expiry Monitoring:', detail: 'Triggers system warning banners when valid securities approach expiry within 90 days.' },
      { label: '3. Amortized Bond Recognition:', detail: 'Recognizes advance bonds whose value has been fully deducted from IPC payments as Recovered.' },
      { label: '4. Bank Liability Auditing:', detail: 'Maintains bank exposure logs across CBE, Awash Bank, Nib International Bank, and Dashen Bank.' }
    ]
  );

  // ==========================================
  // PAGE 12: WEBSITE PAGE 10 - KPI SCORECARD
  // ==========================================
  createDiagramPage(
    12,
    'WEBSITE PAGE 10: KPI AUDIT SCORECARD (🎯 KPIs)',
    'Visual Diagram & Feature Guide for 5-Goal Weighted Compliance Scorecard',
    250,
    '🎯 KPIs',
    (ix, iy, iw, ih) => {
      // Header
      setFillHex('#0f172a'); doc.roundedRect(ix, iy, iw, 26, 4, 4, 'F');
      setTextHex('#ffffff'); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
      doc.text('ERA Standard KPI Scorecard • 5 Goals Weighted Compliance Audit Framework', ix + 8, iy + 17);

      // Goals List
      const goals = [
        { goal: 'G1. Physical Progress Achievement (Weight: 25%)', score: '52.4 / 100', color: '#d97706' },
        { goal: 'G2. Schedule Efficiency & Progress vs Time Ratio (Weight: 20%)', score: '62.6 / 100', color: '#d97706' },
        { goal: 'G3. Cost Management & Overrun Control (Weight: 20%)', score: '95.5 / 100', color: '#166534' },
        { goal: 'G4. Time Management & EoT Control (Weight: 15%)', score: '60.0 / 100', color: '#d97706' },
        { goal: 'G5. Quality Management & QA/QC System (Weight: 20%)', score: '88.0 / 100', color: '#166534' }
      ];

      let gy = iy + 36;
      goals.forEach(g => {
        setFillHex('#ffffff'); setDrawHex('#cbd5e1'); doc.roundedRect(ix, gy, iw, 28, 4, 4, 'FD');
        setTextHex('#0f172a'); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
        doc.text(g.goal, ix + 8, gy + 17);

        setTextHex(g.color); doc.setFontSize(8);
        doc.text(`SCORE: ${g.score}`, ix + iw - 100, gy + 17);

        gy += 32;
      });
    },
    'PAGE 10 PURPOSE & UI FEATURE EXPLANATIONS',
    [
      { label: '1. 5-Goal KPI Hierarchy:', detail: 'Evaluates G1 Physical Progress, G2 Schedule Efficiency, G3 Cost Control, G4 Time Management, G5 Quality.' },
      { label: '2. Sub-Category Breakdown:', detail: 'Breaks down goals into specific sub-criteria (Monthly progress, Milestones, QA/QC manuals, NCR closures).' },
      { label: '3. Override Audit Trail:', detail: 'Supports authorized manual overrides with mandatory auditor justification notes.' },
      { label: '4. Dynamic Weighted Scoring:', detail: 'Calculates the project’s overall letter grade (A, B, C, D) dynamically.' }
    ]
  );

  // ==========================================
  // PAGE 13: WEBSITE PAGE 11 - MONTHLY CUMULATIVE
  // ==========================================
  createDiagramPage(
    13,
    'WEBSITE PAGE 11: MONTHLY CUMULATIVE S-CURVE (📅 Monthly Cumulative)',
    'Visual Diagram & Feature Guide for Historical Monthly Progress Records',
    250,
    '📅 Monthly Cumulative',
    (ix, iy, iw, ih) => {
      // Header
      setFillHex('#0f172a'); doc.roundedRect(ix, iy, iw, 26, 4, 4, 'F');
      setTextHex('#ffffff'); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
      doc.text('Monthly Cumulative Progress Log (Dec 2020 to Feb 2026 Baseline History)', ix + 8, iy + 17);

      // Table
      const tableY = iy + 32;
      setFillHex('#ffffff'); setDrawHex('#cbd5e1'); doc.roundedRect(ix, tableY, iw, 160, 4, 4, 'FD');

      setFillHex('#1e293b'); doc.rect(ix, tableY, iw, 18, 'F');
      setTextHex('#ffffff'); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
      doc.text('MONTH & YEAR', ix + 6, tableY + 12);
      doc.text('ORIGINAL PLAN (%)', ix + 120, tableY + 12);
      doc.text('REVISED PLAN (%)', ix + 240, tableY + 12);
      doc.text('ACTUAL PHYSICAL EXECUTED (%)', ix + 360, tableY + 12);

      const monthRows = [
        { m: 'Dec-20 (Commencement)', orig: '0.00%', rev: '0.00%', act: '0.00%' },
        { m: 'Jun-21', orig: '18.00%', rev: '10.00%', act: '10.00%' },
        { m: 'Jun-22', orig: '56.00%', rev: '29.00%', act: '29.00%' },
        { m: 'Jun-23', orig: '89.00%', rev: '49.00%', act: '49.00%' },
        { m: 'Jun-24', orig: '100.00%', rev: '68.00%', act: '68.00%' },
        { m: 'Feb-26 (Current)', orig: '100.00%', rev: '100.00%', act: '40.73%' }
      ];

      let ry = tableY + 30;
      monthRows.forEach(mr => {
        setTextHex('#334155'); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
        doc.text(mr.m, ix + 6, ry);
        doc.setFont('helvetica', 'normal');
        doc.text(mr.orig, ix + 120, ry);
        doc.text(mr.rev, ix + 240, ry);

        setTextHex('#2563eb'); doc.setFont('helvetica', 'bold');
        doc.text(mr.act, ix + 360, ry);

        setDrawHex('#f1f5f9'); doc.line(ix + 5, ry + 4, ix + iw - 5, ry + 4);
        ry += 20;
      });
    },
    'PAGE 11 PURPOSE & UI FEATURE EXPLANATIONS',
    [
      { label: '1. Multi-Year Progress Table:', detail: 'Archives monthly progress percentages from commencement (Dec 2020) to current status (Feb 2026).' },
      { label: '2. Re-baselining Management:', detail: 'Tracks Original Baseline Schedule vs Approved Revised Extension of Time (EOT) Schedule.' },
      { label: '3. Historical S-Curve Feeds:', detail: 'Feeds data directly into the Executive Dashboard interactive S-curve graph.' },
      { label: '4. Annual Performance Auditing:', detail: 'Allows auditors to inspect exact physical execution achieved in each Ethiopian Fiscal Year (EFY).' }
    ]
  );

  // ==========================================
  // PAGE 14: WEBSITE PAGE 12 - WORK PROGRAM CPM
  // ==========================================
  createDiagramPage(
    14,
    'WEBSITE PAGE 12: WORK PROGRAM CPM SCHEDULE (📅 Work Program CPM)',
    'Visual Diagram & Feature Guide for Critical Path Method Activity Scheduling',
    250,
    '📅 Work Program CPM',
    (ix, iy, iw, ih) => {
      // Header
      setFillHex('#0f172a'); doc.roundedRect(ix, iy, iw, 26, 4, 4, 'F');
      setTextHex('#ffffff'); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
      doc.text('Critical Path Method (CPM) Activity Schedule & Network Float Analysis', ix + 8, iy + 17);

      // Activities Table
      const tableY = iy + 32;
      setFillHex('#ffffff'); setDrawHex('#cbd5e1'); doc.roundedRect(ix, tableY, iw, 160, 4, 4, 'FD');

      setFillHex('#1e293b'); doc.rect(ix, tableY, iw, 18, 'F');
      setTextHex('#ffffff'); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
      doc.text('ACT ID & ACTIVITY NAME', ix + 6, tableY + 12);
      doc.text('DURATION (DAYS)', ix + 155, tableY + 12);
      doc.text('PREDECESSORS', ix + 250, tableY + 12);
      doc.text('FLOAT', ix + 340, tableY + 12);
      doc.text('CRITICAL PATH', ix + 430, tableY + 12);

      const cpmData = [
        { id: 'Act A: Mobilization', dur: '30 Days', pred: 'None', float: '0 Days', crit: 'CRITICAL', color: '#b91c1c' },
        { id: 'Act B: Site Clearance', dur: '45 Days', pred: 'A (FS)', float: '0 Days', crit: 'CRITICAL', color: '#b91c1c' },
        { id: 'Act C: Earthworks Cut & Fill', dur: '180 Days', pred: 'B (FS+5d)', float: '0 Days', crit: 'CRITICAL', color: '#b91c1c' },
        { id: 'Act D: Drainage Structures', dur: '120 Days', pred: 'B (SS+10d)', float: '30 Days', crit: 'NON-CRITICAL', color: '#2563eb' },
        { id: 'Act E: Sub-Base Course', dur: '60 Days', pred: 'C (FS)', float: '0 Days', crit: 'CRITICAL', color: '#b91c1c' },
        { id: 'Act F: Crushed Base Course', dur: '60 Days', pred: 'E (FS)', float: '0 Days', crit: 'CRITICAL', color: '#b91c1c' }
      ];

      let ry = tableY + 30;
      cpmData.forEach(act => {
        setTextHex('#334155'); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
        doc.text(act.id, ix + 6, ry);
        doc.setFont('helvetica', 'normal');
        doc.text(act.dur, ix + 155, ry);
        doc.text(act.pred, ix + 250, ry);
        doc.text(act.float, ix + 340, ry);

        setTextHex(act.color); doc.setFont('helvetica', 'bold');
        doc.text(act.crit, ix + 430, ry);

        setDrawHex('#f1f5f9'); doc.line(ix + 5, ry + 4, ix + iw - 5, ry + 4);
        ry += 20;
      });
    },
    'PAGE 12 PURPOSE & UI FEATURE EXPLANATIONS',
    [
      { label: '1. Critical Path Identification:', detail: 'Identifies activities with zero total float driving the project finish date.' },
      { label: '2. Predecessor Relationships:', detail: 'Supports Finish-to-Start (FS), Start-to-Start (SS), and Finish-to-Finish (FF) dependencies with lag days.' },
      { label: '3. Total Float Analysis:', detail: 'Calculates available float for non-critical tasks (e.g. 30 days float on Drainage Structures).' },
      { label: '4. Automated Gantt Charting:', detail: 'Renders visual network diagrams and timeline bars for project managers.' }
    ]
  );

  // ==========================================
  // PAGE 15: WEBSITE PAGE 13 - LOGISTICS & RESOURCES
  // ==========================================
  createDiagramPage(
    15,
    'WEBSITE PAGE 13: LOGISTICS & RESOURCE MOBILIZATION (🚚 Logistics & Resources)',
    'Visual Diagram & Feature Guide for Equipment Mobilization & Material Production Stocks',
    250,
    '🚚 Logistics & Resources',
    (ix, iy, iw, ih) => {
      // Header
      setFillHex('#0f172a'); doc.roundedRect(ix, iy, iw, 26, 4, 4, 'F');
      setTextHex('#ffffff'); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
      doc.text('Contractor Heavy Machinery Mobilization & On-Site Material Production Stockpile Audit', ix + 8, iy + 17);

      // Resources Table
      const tableY = iy + 32;
      setFillHex('#ffffff'); setDrawHex('#cbd5e1'); doc.roundedRect(ix, tableY, iw, 160, 4, 4, 'FD');

      setFillHex('#1e293b'); doc.rect(ix, tableY, iw, 18, 'F');
      setTextHex('#ffffff'); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
      doc.text('EQUIPMENT / MATERIAL DESC', ix + 6, tableY + 12);
      doc.text('PLANNED', ix + 160, tableY + 12);
      doc.text('AVAILABLE', ix + 230, tableY + 12);
      doc.text('DEFICIENCY', ix + 310, tableY + 12);
      doc.text('CURRENT OPERATIONAL REMARKS', ix + 380, tableY + 12);

      const resData = [
        { desc: 'Asphalt Paver (No.)', plan: '3 Units', avail: '2 Units', def: '1 Unit', rem: '1 active, 1 undergoing repair', color: '#b91c1c' },
        { desc: 'Motor Grader (No.)', plan: '10 Units', avail: '9 Units', def: '1 Unit', rem: '9 active on sub-grade prep', color: '#b45309' },
        { desc: 'Excavator Heavy (No.)', plan: '7 Units', avail: '7 Units', def: '0 Units', rem: 'All active on rock cutting', color: '#166534' },
        { desc: 'Dump Trucks (No.)', plan: '50 Units', avail: '42 Units', def: '8 Units', rem: '42 active, 8 pending arrival', color: '#b91c1c' },
        { desc: 'Aggregate Crusher (Set)', plan: '2 Sets', avail: '2 Sets', def: '0 Units', rem: 'Fully operational at quarry', color: '#166534' }
      ];

      let ry = tableY + 30;
      resData.forEach(r => {
        setTextHex('#334155'); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
        doc.text(r.desc, ix + 6, ry);
        doc.setFont('helvetica', 'normal');
        doc.text(r.plan, ix + 160, ry);
        doc.text(r.avail, ix + 230, ry);

        setTextHex(r.color); doc.setFont('helvetica', 'bold');
        doc.text(r.def, ix + 310, ry);

        setTextHex('#334155'); doc.setFont('helvetica', 'normal');
        doc.text(r.rem, ix + 380, ry);

        setDrawHex('#f1f5f9'); doc.line(ix + 5, ry + 4, ix + iw - 5, ry + 4);
        ry += 22;
      });
    },
    'PAGE 13 PURPOSE & UI FEATURE EXPLANATIONS',
    [
      { label: '1. Machinery Deficiency Auditing:', detail: 'Audits contractor equipment against contractual mobilization schedules under FIDIC Sub-clause 4.17.' },
      { label: '2. Equipment Operational Breakdown:', detail: 'Tracks active vs maintenance status for Pavers, Graders, Excavators, and Heavy Dump Trucks.' },
      { label: '3. Material Stockpile Auditing:', detail: 'Monitors crushers and stockpile inventory for Sub-base (15,400 M3 stock), Aggregate Base, and Bitumen.' },
      { label: '4. Supply Shortfall Mitigation:', detail: 'Alerts management to crushing bottlenecks before paving milestones are impacted.' }
    ]
  );

  // ==========================================
  // PAGE 16: WEBSITE PAGE 14 - RISKS & FIDIC CLAIMS
  // ==========================================
  createDiagramPage(
    16,
    'WEBSITE PAGE 14: PROJECT RISKS & FIDIC CLAIMS (⚠️ Project Risks)',
    'Visual Diagram & Feature Guide for Risk Heatmap Matrix & Contractual Claim Notices',
    250,
    '⚠️ Project Risks',
    (ix, iy, iw, ih) => {
      // Header
      setFillHex('#0f172a'); doc.roundedRect(ix, iy, iw, 26, 4, 4, 'F');
      setTextHex('#ffffff'); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
      doc.text('Road Risk 5x5 Heatmap Log & FIDIC Clause 20.1 Contract Claims Management', ix + 8, iy + 17);

      // Claims Table
      const tableY = iy + 32;
      setFillHex('#ffffff'); setDrawHex('#cbd5e1'); doc.roundedRect(ix, tableY, iw, 160, 4, 4, 'FD');

      setFillHex('#1e293b'); doc.rect(ix, tableY, iw, 18, 'F');
      setTextHex('#ffffff'); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
      doc.text('RISK / CLAIM TITLE', ix + 6, tableY + 12);
      doc.text('CATEGORY / CLAUSE', ix + 140, tableY + 12);
      doc.text('PROB x IMPACT', ix + 240, tableY + 12);
      doc.text('CLAIMED EOT / COST', ix + 330, tableY + 12);
      doc.text('MITIGATION / STATUS', ix + 430, tableY + 12);

      const riskData = [
        { title: 'ROW Relocation Delays', cat: 'Right of Way (4x5)', prob: 'SCORE: 20', claim: '+120 Days / 48.5M', status: 'Active Mitigation', color: '#b91c1c' },
        { title: 'Heavy Seasonal Rainfall', cat: 'Environmental (3x4)', prob: 'SCORE: 12', claim: '+45 Days / 12.0M', status: 'Determined (+30d)', color: '#d97706' },
        { title: 'Aggregate Quarry Dispute', cat: 'Materials (3x3)', prob: 'SCORE: 9', claim: '+30 Days / 8.2M', status: 'Mitigated', color: '#166534' },
        { title: 'Fuel & Forex Inflation', cat: 'Financial (5x4)', prob: 'SCORE: 20', claim: 'Price Adjustment', status: 'Sub-clause 13.8', color: '#b91c1c' }
      ];

      let ry = tableY + 30;
      riskData.forEach(r => {
        setTextHex('#334155'); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
        doc.text(r.title, ix + 6, ry);
        doc.setFont('helvetica', 'normal');
        doc.text(r.cat, ix + 140, ry);

        setTextHex(r.color); doc.setFont('helvetica', 'bold');
        doc.text(r.prob, ix + 240, ry);

        setTextHex('#334155'); doc.setFont('helvetica', 'normal');
        doc.text(r.claim, ix + 330, ry);
        doc.text(r.status, ix + 430, ry);

        setDrawHex('#f1f5f9'); doc.line(ix + 5, ry + 4, ix + iw - 5, ry + 4);
        ry += 24;
      });
    },
    'PAGE 14 PURPOSE & UI FEATURE EXPLANATIONS',
    [
      { label: '1. 5x5 Risk Matrix Heatmap:', detail: 'Evaluates probability (1-5) and impact (1-5) to calculate risk exposure scores.' },
      { label: '2. FIDIC Clause 20.1 Claims:', detail: 'Logs formal contractor claim notices, event timelines, and financial compensation demands.' },
      { label: '3. Engineer Determination Log:', detail: 'Records Supervising Engineer official determinations for granted Extension of Time (EOT).' },
      { label: '4. Proactive Mitigation Actions:', detail: 'Monitors regional utility coordination and price adjustment certificate processing under Sub-clause 13.8.' }
    ]
  );

  // ==========================================
  // PAGE 17: WEBSITE PAGE 15 - COMPREHENSIVE ANALYSIS
  // ==========================================
  createDiagramPage(
    17,
    'WEBSITE PAGE 15: COMPREHENSIVE ANALYSIS & DIAGNOSTICS (📊 Comprehensive analysis)',
    'Visual Diagram & Feature Guide for Multi-Dimensional Performance Diagnostics',
    250,
    '📊 Comprehensive analysis',
    (ix, iy, iw, ih) => {
      // Header
      setFillHex('#0f172a'); doc.roundedRect(ix, iy, iw, 26, 4, 4, 'F');
      setTextHex('#ffffff'); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
      doc.text('Multi-Dimensional Performance Radar & EVM Diagnostic Indices (SPI 0.42 | CPI 1.00)', ix + 8, iy + 17);

      // Radar Box
      const radY = iy + 32;
      setFillHex('#ffffff'); setDrawHex('#cbd5e1'); doc.roundedRect(ix, radY, iw, 160, 4, 4, 'FD');

      setTextHex('#0f172a'); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      doc.text('📊 5-DIMENSION PROJECT COMPLIANCE RADAR SCORE BREAKDOWN', ix + 8, radY + 16);

      const dimensions = [
        { dim: '1. FIDIC contract Compliance (Bonds & Notices)', score: '85.0%', weight: '10%' },
        { dim: '2. Project Management (Time & progress)', score: '92.0%', weight: '35%' },
        { dim: '3. EVM Metrics (CPI 12.5% / SPI 12.5%)', score: '87.5%', weight: '25%' },
        { dim: '4. Key Performance Indicators (KPIs)', score: '78.0%', weight: '15%' },
        { dim: '5. Linear Layer Progress vs. S-Curve', score: '68.0%', weight: '15%' }
      ];

      let dy = radY + 34;
      dimensions.forEach(d => {
        setTextHex('#334155'); doc.setFontSize(7); doc.setFont('helvetica', 'bold');
        doc.text(d.dim, ix + 8, dy);
        
        setTextHex('#64748b'); doc.setFont('helvetica', 'normal');
        doc.text(`Weight: ${d.weight}`, ix + 250, dy);

        setTextHex('#2563eb'); doc.setFont('helvetica', 'bold');
        doc.text(`Score: ${d.score}`, ix + 360, dy);

        setDrawHex('#f1f5f9'); doc.line(ix + 5, dy + 4, ix + iw - 5, dy + 4);
        dy += 22;
      });
    },
    'PAGE 15 PURPOSE & UI FEATURE EXPLANATIONS',
    [
      { label: '1. Radar Diagnostic Model:', detail: 'Synthesizes contract compliance, schedule efficiency, EVM metrics, KPIs, and civil layer completion.' },
      { label: '2. Earned Value Ratios:', detail: 'Calculates Schedule Performance Index (SPI 0.42) and Cost Performance Index (CPI 1.00).' },
      { label: '3. Automated Diagnostic Banners:', detail: 'Generates real-time executive commentary flagging critical path slippage and ROW bottlenecks.' },
      { label: '4. Action Item Recommendations:', detail: 'Proposes targeted remedies (e.g. equipment mobilization enforcement, price adjustment acceleration).' }
    ]
  );

  // ==========================================
  // PAGE 18: WEBSITE PAGE 16 - DOCUMENTATION
  // ==========================================
  createDiagramPage(
    18,
    'WEBSITE PAGE 16: PROJECT DOCUMENTATION & VAULT (📁 Documentation)',
    'Visual Diagram & Feature Guide for Contract File Archiving & File Vault',
    250,
    '📁 Documentation',
    (ix, iy, iw, ih) => {
      // Header
      setFillHex('#0f172a'); doc.roundedRect(ix, iy, iw, 26, 4, 4, 'F');
      setTextHex('#ffffff'); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
      doc.text('Project Document Vault • Contractual Letters, Design Reviews & Approval Attachments', ix + 8, iy + 17);

      // Doc Vault Table
      const docY = iy + 32;
      setFillHex('#ffffff'); setDrawHex('#cbd5e1'); doc.roundedRect(ix, docY, iw, 160, 4, 4, 'FD');

      setFillHex('#1e293b'); doc.rect(ix, docY, iw, 18, 'F');
      setTextHex('#ffffff'); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
      doc.text('DOCUMENT TITLE', ix + 6, docY + 12);
      doc.text('CATEGORY', ix + 160, docY + 12);
      doc.text('UPLOAD DATE', ix + 250, docY + 12);
      doc.text('FILE SIZE / TYPE', ix + 340, docY + 12);
      doc.text('ACCESS LEVEL', ix + 440, docY + 12);

      const docsData = [
        { title: 'Original Contract Agreement.pdf', cat: 'Contract Legal', date: '2020-04-28', size: '14.2 MB (PDF)', acc: 'ALL ROLES' },
        { title: 'Design Review Report v2.0.pdf', cat: 'Engineering', date: '2020-11-15', size: '28.5 MB (PDF)', acc: 'ENGINEER' },
        { title: 'Certified IPC No. 1 Details.pdf', cat: 'Financial', date: '2025-11-30', size: '4.1 MB (PDF)', acc: 'AUDITOR' },
        { title: 'Granted EOT Approval Letter.pdf', cat: 'EOT Claims', date: '2023-05-10', size: '2.8 MB (PDF)', acc: 'DIRECTORATE' }
      ];

      let ry = docY + 30;
      docsData.forEach(docItem => {
        setTextHex('#334155'); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
        doc.text(docItem.title, ix + 6, ry);
        doc.setFont('helvetica', 'normal');
        doc.text(docItem.cat, ix + 160, ry);
        doc.text(docItem.date, ix + 250, ry);
        doc.text(docItem.size, ix + 340, ry);

        setTextHex('#166534'); doc.setFont('helvetica', 'bold');
        doc.text(docItem.acc, ix + 440, ry);

        setDrawHex('#f1f5f9'); doc.line(ix + 5, ry + 4, ix + iw - 5, ry + 4);
        ry += 24;
      });
    },
    'PAGE 16 PURPOSE & UI FEATURE EXPLANATIONS',
    [
      { label: '1. Central Document Vault:', detail: 'Archives contract agreements, design reviews, IPC certificates, and EOT approval letters.' },
      { label: '2. Metadata Tagging:', detail: 'Categorizes files by type, upload date, file size, and authorization access levels.' },
      { label: '3. Cloud File Attachments:', detail: 'Integrates with Google Drive / server storage for persistent document downloads.' },
      { label: '4. Secure Version Control:', detail: 'Prevents unauthorized overwriting of official contractual documents.' }
    ]
  );

  // ==========================================
  // PAGE 19: WEBSITE PAGE 17 - GROUP REPORT GENERATOR
  // ==========================================
  createDiagramPage(
    19,
    'WEBSITE PAGE 17: EXECUTIVE GROUP REPORT GENERATOR MODAL',
    'Visual Diagram & Feature Guide for Multi-Project Portfolio Group Report Generation',
    250,
    'Executive Group Report Generator',
    (ix, iy, iw, ih) => {
      // Header
      setFillHex('#0f172a'); doc.roundedRect(ix, iy, iw, 26, 4, 4, 'F');
      setTextHex('#ffffff'); doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
      doc.text('Consolidated Multi-Project Group Report Generator & 5-Dimension Scoring Engine', ix + 8, iy + 17);

      // Weight Distribution Sliders
      const slY = iy + 32;
      setFillHex('#f8fafc'); setDrawHex('#cbd5e1'); doc.roundedRect(ix, slY, iw, 50, 4, 4, 'FD');
      setTextHex('#0f172a'); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
      doc.text('📋 5-DIMENSION MODEL WEIGHT ALLOCATION SLIDERS', ix + 8, slY + 14);

      const sliderWeights = [
        'FIDIC 2017: 10%', 'PM Time: 35%', 'EVM Metrics: 25%', 'KPIs: 15%', 'Civil Layers: 15%'
      ];
      let swx = ix + 8;
      sliderWeights.forEach(sw => {
        setFillHex('#eff6ff'); setDrawHex('#bfdbfe'); doc.roundedRect(swx, slY + 22, 90, 18, 3, 3, 'FD');
        setTextHex('#1d4ed8'); doc.setFontSize(6.5); doc.setFont('helvetica', 'bold');
        doc.text(sw, swx + 6, slY + 34);
        swx += 96;
      });

      // Export Buttons
      const expY = slY + 60;
      setFillHex('#ffffff'); setDrawHex('#cbd5e1'); doc.roundedRect(ix, expY, iw, 80, 4, 4, 'FD');
      setTextHex('#0f172a'); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
      doc.text('Select Output Format & Export Consolidated Portfolio PDF / Data Matrix:', ix + 8, expY + 18);

      setFillHex('#0284c7'); doc.roundedRect(ix + 10, expY + 32, 150, 30, 6, 6, 'F');
      setTextHex('#ffffff'); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
      doc.text('📄 Executive Summary PDF', ix + 18, expY + 50);

      setFillHex('#059669'); doc.roundedRect(ix + 170, expY + 32, 160, 30, 6, 6, 'F');
      setTextHex('#ffffff'); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
      doc.text('📊 Full Group Audit PDF (A3)', ix + 178, expY + 50);

      setFillHex('#4f46e5'); doc.roundedRect(ix + 340, expY + 32, 140, 30, 6, 6, 'F');
      setTextHex('#ffffff'); doc.setFontSize(7.5); doc.setFont('helvetica', 'bold');
      doc.text('📊 Excel Data Matrix', ix + 352, expY + 50);
    },
    'PAGE 17 PURPOSE & UI FEATURE EXPLANATIONS',
    [
      { label: '1. Multi-Project Portfolio Selection:', detail: 'Allows users to evaluate single projects or entire regional Directorates simultaneously.' },
      { label: '2. 5-Dimension Custom Weighting:', detail: 'Customizes weight allocations for FIDIC compliance, time execution, EVM indices, KPIs, and civil layers.' },
      { label: '3. A4 & A3 Multi-Page PDF Compilation:', detail: 'Generates publication-ready vector PDF group reports for board briefings and ministry reviews.' },
      { label: '4. Excel Spreadsheet Data Export:', detail: 'Exports full raw dataset matrices into spreadsheet format for advanced audit modeling.' }
    ]
  );

  // ==========================================
  // PAGE 20: TROUBLESHOOTING & GLOSSARY
  // ==========================================
  doc.addPage();
  currentPage++;
  addPageHeaderFooter(currentPage);

  yPos = addSectionHeading('TROUBLESHOOTING GUIDE & PRE-SUPPORT CHECKLIST', '5 Common user issues, instant solutions, and helpdesk contact checklist');

  const troubleIssues = [
    { issue: '1. Error: "Access Denied / Page Restricted"', sol: 'Your assigned role lacks page edit permissions. Request assigned page access from your Directorate Lead in Admin Settings.' },
    { issue: '2. Issue: "Database Sync Pending / Offline Queue"', sol: 'Unsaved local mutations exist. Click the blue "Save to Cloud Database" button and verify internet connectivity.' },
    { issue: '3. Issue: "Bond Expiry Alert on Recovered Guarantee"', sol: 'Verify that the guarantee status dropdown is set to "Recovered / Returned". The system treats amortized advance bonds as valid.' },
    { issue: '4. Issue: "PDF User Manual Download Fails"', sol: 'Enable browser popups for the website domain and ensure client-side memory acceleration is enabled.' },
    { issue: '5. Issue: "Invalid EVM Index / Division Totals Mismatch"', sol: 'Verify that BOQ Division contract figures and IPC certified values are properly entered in the Financial Data tab.' }
  ];

  troubleIssues.forEach(t => {
    setFillHex(colors.slateLight); setDrawHex(colors.border);
    doc.roundedRect(margin, yPos, contentWidth, 34, 4, 4, 'FD');

    setTextHex(colors.rose); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text(t.issue, margin + 8, yPos + 12);

    setTextHex(colors.textMain); doc.setFontSize(7.5); doc.setFont('helvetica', 'normal');
    doc.text(`Solution: ${t.sol}`, margin + 8, yPos + 24, { maxWidth: contentWidth - 16 });

    yPos += 39;
  });

  yPos += 8;
  yPos = addSectionHeading('GLOSSARY OF INFRASTRUCTURE & FINANCIAL TERMS', 'Key technical definitions utilized throughout the ERA ERP Dashboard', yPos);

  const glossaryTerms = [
    { term: 'EVM (Earned Value Management):', def: 'Integrates scope, schedule, and cost metrics to measure project performance.' },
    { term: 'CPI (Cost Performance Index):', def: 'Ratio of Earned Value to Actual Cost ($CPI = EV / AC$). Values > 1.0 indicate under-budget performance.' },
    { term: 'SPI (Schedule Performance Index):', def: 'Ratio of Earned Value to Planned Value ($SPI = EV / PV$). Values > 1.0 indicate ahead-of-schedule performance.' },
    { term: 'IPC (Interim Payment Certificate):', def: 'Official progress payment valuation issued periodically by the Resident Engineer.' },
    { term: 'Amortized Guarantee:', def: 'An advance payment bank bond whose liability reduces as advance funds are recovered via IPC deductions.' },
    { term: 'EOT (Extension of Time):', def: 'Approved contractual time extension granted due to excusable delays or variations.' }
  ];

  glossaryTerms.forEach(g => {
    setTextHex(colors.navy); doc.setFontSize(8); doc.setFont('helvetica', 'bold');
    doc.text(g.term, margin + 8, yPos);
    setTextHex(colors.textMain); doc.setFont('helvetica', 'normal');
    doc.text(g.def, margin + 170, yPos, { maxWidth: contentWidth - 180 });
    yPos += 18;
  });

  // Save the PDF
  doc.save('ERA_ERP_Dashboard_Official_User_Guide_v1.0.pdf');
}
