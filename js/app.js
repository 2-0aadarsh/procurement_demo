/* MP Health Procurement - Main Application Logic */

let currentRole = null;
let authUser = null;
let currentPage = 'dashboard';
let currentCategory = 'All';
let currentPeriod = 'year';
let analyticsFocusYear = 'all'; // 'all' | FY label e.g. 'FY25-26'
let analyticsSliceType = 'quarter'; // 'quarter' | 'month' — after a FY is selected
let analyticsPeriodFocus = 'all'; // 'all' | 'Q1'..'Q4' | month name
let analyticsCompareMode = 'vendor'; // 'vendor' | 'progress'
let currentWorkflowStep = null;
let alertPanelOpen = false;
let pageStack = [];
let modalHistory = [];
let tenderStatusFilter = 'all'; // 'all' | 'open' | 'evaluation' | 'draft'
let pipelinePage = 1;
const PIPELINE_PAGE_SIZE = 10;
let noticesShownThisSession = false;
let workQueueFilter = 'all';
let activeSlaThreadId = 'SLA-2026-014';

/** Prototype "today" — used for deadline countdown (DD-MM-YYYY: 03-09-2026) */
const APP_TODAY = '2026-09-03';

/** Vendor workflow runtime state (prototype) */
const vendorStageState = {
  completed: { 1: true, 2: true, 3: true, 4: false, 5: false, 6: false, 7: false, 8: false, 9: false },
  locked: { 4: false },
  uploads: {
    kyc: [],
    approvalLetter: null,
    technicalDocs: [],
    financialDocs: [],
    pbg: null,
    deliveryProof: null
  },
  bid: {
    tenderId: '',
    emdStatus: '',
    deadline: '',
    submitted: false,
    ocrReady: false
  },
  award: {
    tenderId: 'TND-2026-MP-0038',
    title: 'Hospital Linen Supply',
    loaStatus: 'Issued',
    loaDate: '29-08-2026',
    pbgDue: '13-09-2026',
    value: '₹85 L',
    acknowledged: false
  },
  contract: {
    id: '',
    pbgStatus: '',
    pbgAmount: '',
    contractStatus: '',
    pbgSubmitted: false,
    signed: false,
    pbgOcr: null,
    contractOcr: null,
    bank: '',
    bgRef: '',
    validUntil: ''
  },
  delivery: {
    challan: '',
    vehicle: '',
    dispatchDate: '',
    expectedDate: '',
    coldChain: 'No',
    remarks: '',
    status: '',
    updated: false,
    ocrReady: false,
    fileName: null
  },
  invoice: {
    number: '',
    grn: '',
    amount: '',
    status: '',
    submitted: false,
    ocrReady: false,
    fileName: null
  },
  payment: {
    status: 'Awaiting Processing',
    timeline: 'Within 45 days of invoice acceptance',
    bank: 'HDFC Bank - ****4567',
    lastUpdate: '—',
    milestones: [
      { label: 'Invoice submitted', done: false },
      { label: 'Three-way match (PO / GRN / Invoice)', done: false },
      { label: 'Finance verification', done: false },
      { label: 'Payment released', done: false }
    ]
  }
};

/** Vendor Profile & KYC page state */
const vendorProfileState = {
  editing: false,
  company: 'MediSupply India Pvt Ltd',
  vendorId: 'VND-MP-000123',
  gstin: '23AABCM1234A1Z5',
  pan: 'AABCM1234A',
  drugLicense: 'DL-MH-2024-0892',
  drugExpiry: '15-03-2027',
  iso: 'Certified',
  isoNote: 'Expires in 22 days',
  bank: 'HDFC Bank - ****4567',
  pendingEdit: null
};

function maskSensitiveValue(value) {
  if (!value) return '₹ ●●●';
  return String(value).replace(/[\d.,]+/g, '●●●');
}

function reqLabel(text) {
  return `${text} <span class="req-star" title="Required">*</span>`;
}

function showWfAlert(message, type = 'error') {
  openModal(
    type === 'error' ? 'Cannot proceed' : 'Notice',
    `<div class="wf-inline-alert wf-inline-alert--${type}">
      <i class="fa-solid fa-${type === 'error' ? 'circle-exclamation' : 'circle-check'}"></i>
      <div><p>${message}</p></div>
    </div>`,
    { wide: false }
  );
}

function syncVendorWorkflowStatuses() {
  if (currentRole !== 'vendor') return;
  VENDOR_WORKFLOW.forEach(s => {
    if (vendorStageState.completed[s.id]) s.status = 'done';
    else if (s.id === getVendorActiveStageId()) s.status = 'active';
    else s.status = 'pending';
  });
}

function getVendorActiveStageId() {
  for (let i = 1; i <= 9; i++) {
    if (!vendorStageState.completed[i]) return i;
  }
  return 9;
}

function getWorkflowProgressStep() {
  if (currentRole === 'vendor') {
    syncVendorWorkflowStatuses();
    return getVendorActiveStageId();
  }
  const steps = getWorkflowSteps();
  const active = steps.find(s => s.status === 'active');
  if (active) return active.id;
  const done = steps.filter(s => s.status === 'done').length;
  return done > 0 ? Math.min(done, steps.length) : 1;
}

function parseISODate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  // Already DD-MM-YYYY
  if (/^\d{2}-\d{2}-\d{4}$/.test(raw)) {
    const [d, m, y] = raw.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  // YYYY-MM-DD (optionally with time)
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const dt = new Date(raw);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

/** Format date as DD-MM-YYYY */
function formatDateDMY(value) {
  const dt = parseISODate(value);
  if (!dt) return value || '';
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/** Calendar days from APP_TODAY to deadline (date-only) */
function daysUntilDeadline(deadline) {
  const today = parseISODate(APP_TODAY);
  const end = parseISODate(deadline);
  if (!today || !end) return null;
  const ms = end.setHours(0, 0, 0, 0) - today.setHours(0, 0, 0, 0);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

// ========== LOGIN ==========
function completeAuthLogin(role, user) {
  currentRole = role;
  authUser = user;
  closeNoticeModal();
  const app = document.getElementById('app');
  app.classList.add('active');
  app.classList.toggle('gov-app', role === 'gov');
  app.classList.toggle('vendor-app', role === 'vendor');

  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('vendor-theme', role === 'vendor');

  pageStack = [];
  renderSidebar();
  renderTopbar();
  navigateTo('dashboard', true);
}

function confirmLogout() {
  openModal('Confirm Logout', `
    <div class="logout-confirm">
      <div class="logout-confirm-icon"><i class="fa-solid fa-right-from-bracket"></i></div>
      <p class="logout-confirm-text">Are you sure you want to logout?</p>
      <p class="logout-confirm-hint">You will need to sign in again to access the portal.</p>
      <div class="logout-confirm-actions">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn btn-danger" onclick="logout()">Logout</button>
      </div>
    </div>
  `);
}

function logout() {
  currentRole = null;
  authUser = null;
  currentPage = 'dashboard';
  currentWorkflowStep = null;
  pageStack = [];
  noticesShownThisSession = false;
  resetGovNoticesForDemo();
  document.getElementById('app').classList.remove('active', 'gov-app', 'vendor-app');
  document.getElementById('authPage').style.display = 'flex';
  if (typeof clearAuthSession === 'function') clearAuthSession();
  if (typeof initAuth === 'function') initAuth();
  closeAlertPanel();
  closeNoticeModal();
  closeModal();
  // Show official notices again on the login screen
  requestAnimationFrame(() => {
    setTimeout(() => showGovNoticesOnWebsiteLoad(true), 400);
  });
}

function resetGovNoticesForDemo() {
  if (typeof GOV_NOTICES === 'undefined') return;
  GOV_NOTICES.forEach(n => {
    n.unread = n.id !== 'GN-2026-029';
  });
}

// ========== NAVIGATION ==========
function getVendorNavBadgeInfo(pageId) {
  switch (pageId) {
    case 'workflow': {
      const pending = [4, 5, 6, 7, 8, 9].filter(id => !vendorStageState.completed[id]).length;
      return { count: pending, title: `${pending} lifecycle stage(s) still open` };
    }
    case 'registration':
      return { count: 1, title: '1 profile item needs attention (ISO expiry reminder)' };
    case 'tenders': {
      const open = TENDERS.filter(t => t.status === 'Open').length;
      return { count: open, title: `${open} open tender(s) available to review` };
    }
    case 'bids': {
      const active = BIDS.length;
      return { count: active, title: `${active} bid(s) in your bid book` };
    }
    case 'clarifications': {
      const pending = CLARIFICATIONS.filter(c => c.status === 'Pending' || c.status === 'Corrigendum Issued').length;
      const total = CLARIFICATIONS.length;
      return { count: pending || total, title: pending ? `${pending} clarification(s) needing attention` : `${total} clarification(s)` };
    }
    case 'contracts': {
      const n = CONTRACTS.length;
      return { count: n, title: `${n} active contract(s) / PO(s)` };
    }
    case 'delivery': {
      const pendingPay = DELIVERIES.filter(d => d.grn !== 'Accepted' || d.payment === 'Processing' || d.payment === '—').length;
      return { count: pendingPay || DELIVERIES.length, title: `${pendingPay || DELIVERIES.length} delivery / invoice item(s) to track` };
    }
    case 'reports':
      return { count: 2, title: '2 downloadable report packs available' };
    case 'work-queue': {
      const unread = VENDOR_WORK_QUEUE.filter(a => a.unread).length;
      return { count: unread || VENDOR_WORK_QUEUE.length, title: `${unread} unread alert(s) in work queue` };
    }
    case 'sla-desk': {
      const open = SLA_THREADS.filter(t => t.status !== 'Resolved').length;
      return { count: open, title: `${open} open SLA communication thread(s)` };
    }
    default:
      return { count: 0, title: '' };
  }
}

function getNavBadgeInfo(item) {
  if (currentRole === 'vendor') return getVendorNavBadgeInfo(item.id);
  if (item.id === 'sourcing') {
    const sum = getGovDashboardActionCounts('All').sum;
    return { count: sum, title: `${sum} action items (Open Tenders + Pending Approvals + Payment Delays)` };
  }
  if (item.id === 'workflow') {
    return { count: item.badge || 0, title: item.badge ? `${item.badge} stage(s) need attention` : '' };
  }
  if (item.id === 'work-queue') {
    const queue = getWorkQueueSource();
    const unread = queue.filter(a => a.unread).length;
    return { count: unread || queue.length, title: `${unread || queue.length} alert(s) in work queue` };
  }
  if (item.id === 'sla-desk') {
    const open = SLA_THREADS.filter(t => t.status !== 'Resolved').length;
    return { count: open, title: `${open} open SLA thread(s)` };
  }
  if (item.id === 'reports') {
    return { count: 3, title: '3 downloadable report packs (Lifecycle, Sourcing, Operations)' };
  }
  return { count: item.badge || 0, title: item.badge ? `${item.badge} item(s)` : '' };
}

function renderSidebar() {
  const nav = document.getElementById('sidebarNav');
  const navItems = currentRole === 'gov' ? NAV_GOV : NAV_VENDOR;
  let html = '';
  navItems.forEach(item => {
    if (item.section) {
      html += `<div class="nav-section">${item.section}</div>`;
    } else {
      const info = getNavBadgeInfo(item);
      const badge = info.count > 0
        ? `<span class="nav-badge" title="${info.title}">${info.count}</span>`
        : '';
      html += `<a class="nav-item ${currentPage === item.id ? 'active' : ''}" data-page="${item.id}" onclick="navigateTo('${item.id}')" ${info.title ? `title="${info.title}"` : ''}>
        <span class="nav-icon"><i class="fa-solid ${item.icon}"></i></span>
        <span class="nav-label">${item.label}</span>
        ${badge}
      </a>`;
    }
  });
  nav.innerHTML = html;

  const brandSub = document.getElementById('sidebarBrandSub');
  brandSub.textContent = authUser?.title || (currentRole === 'gov' ? 'Resource Manager' : 'Vendor Portal');
}

function getTenderPageSubtitle() {
  const labels = {
    open: 'Open tenders',
    evaluation: 'Tenders under technical & commercial evaluation',
    draft: 'Draft tenders — preparation in progress',
    all: 'Browse and track procurement opportunities'
  };
  return labels[tenderStatusFilter] || labels.all;
}

function getWorkflowPageSubtitle() {
  ensureWorkflowViewStep();
  const steps = getWorkflowSteps();
  const total = steps.length;
  const progress = getWorkflowProgressStep();
  const viewId = currentWorkflowStep;
  const step = steps.find(s => s.id === viewId) || steps[0];
  const isCurrent = viewId === progress;
  return { step, total, isCurrent };
}

function updateWorkflowSubtitle() {
  const el = document.getElementById('pageSubtitle');
  if (!el || currentPage !== 'workflow') return;
  const { step, total, isCurrent } = getWorkflowPageSubtitle();
  const currentTag = isCurrent
    ? ' <span class="subtitle-stage-tag">(current stage)</span>'
    : ' <span class="subtitle-stage-tag subtitle-stage-tag--view">(reviewing)</span>';
  el.innerHTML = `${step.name} — Stage <strong>${step.id}</strong> out of ${total} Stage Flow${currentTag}`;
}

function renderTopbar() {
  const title = document.getElementById('pageTitle');
  const subtitle = document.getElementById('pageSubtitle');
  const userName = document.getElementById('userName');
  const userAvatar = document.getElementById('userAvatar');
  const alertBadge = document.getElementById('alertBadge');

  const pageTitles = {
    dashboard: currentRole === 'vendor'
      ? ['My Dashboard', 'Your procurement activity at a glance']
      : ['Analytics Dashboard', 'Real-time procurement insights & KPIs'],
    'work-queue': currentRole === 'gov'
      ? ['Alerts & Work Queue', 'Prioritized government actions — approvals, payments, vendor SLA breaches, and tender pipeline']
      : ['Alerts & Work Queue', 'Prioritized actions by severity, owner, due date and record type'],
    'sla-desk': currentRole === 'gov'
      ? ['SLA Communication', 'Respond to vendor escalations and resolve issues per internal response hierarchy']
      : ['SLA Communication', 'Escalate and resolve issues with government officers as per SLA hierarchy'],
    workflow: ['Procurement Lifecycle', ''],
    'vendor-reg': ['Vendor Registration', 'Review and approve vendor onboarding requests'],
    sourcing: ['Sourcing & Award', 'Technical and commercial evaluation'],
    'master-data': ['Master Data & Workflow', 'Categories, items, and workflow configuration'],
    tor: ['TOR Coverage & Red Flags', 'Terms of Reference compliance monitoring'],
    'vendor-matrix': ['Vendor Performance Matrix', 'Weighted scoring and vendor ranking'],
    reports: currentRole === 'vendor'
      ? ['My Reports', 'Bid participation, contract execution & downloadable analytics']
      : ['Reports & Analytics', 'Cross-module procurement intelligence — charts, tables and downloadable PDF/Excel packs'],
    settings: ['Settings & Branding', 'Organization name, logo, and configuration'],
    registration: ['Profile & KYC', 'Complete your vendor profile and verification'],
    tenders: ['Tender Discovery', getTenderPageSubtitle()],
    bids: ['Bid Submission', 'Prepare and submit technical & financial bids'],
    clarifications: ['Clarifications', 'Pre-bid queries and corrigenda tracking'],
    contracts: ['Contracts & POs', 'Active contracts and purchase orders'],
    delivery: ['Delivery & Invoices', 'Dispatch tracking and invoice management'],
    performance: ['Performance Score', 'Your weighted performance metrics']
  };

  const t = pageTitles[currentPage] || ['Dashboard', ''];
  title.textContent = t[0];
  if (currentPage === 'workflow') updateWorkflowSubtitle();
  else subtitle.textContent = t[1];

  if (authUser) {
    userName.textContent = authUser.role === 'vendor' && authUser.vendorId
      ? authUser.vendorId
      : authUser.name;
    userAvatar.textContent = authUser.avatar || (authUser.role === 'gov' ? 'RM' : 'VS');
  } else if (currentRole === 'gov') {
    userName.textContent = 'Resource Manager';
    userAvatar.textContent = 'RM';
  } else {
    userName.textContent = 'VND-MP-000123';
    userAvatar.textContent = 'VS';
  }

  const alerts = currentRole === 'gov' ? ALERTS_GOV : ALERTS_VENDOR;
  const unread = alerts.filter(a => a.unread).length;
  alertBadge.textContent = unread;
  alertBadge.classList.toggle('zero', unread === 0);

  updateBreadcrumb();
  updateBackButton();
  updatePageMeta();
  updateTopbarLayout();
}

function updateTopbarLayout() {
  const topbar = document.querySelector('.topbar');
  if (topbar) topbar.classList.toggle('topbar--root', currentPage === 'dashboard');
}

function updatePageMeta() {
  const el = document.getElementById('pageMeta');
  if (!el) return;

  const meta = getPageMeta();
  el.innerHTML = meta || '';
  el.classList.toggle('hidden', !meta);
}

function getPageMeta() {
  if (currentPage === 'vendor-reg') {
    const regs = filterByCategory(VENDOR_REGISTRATIONS);
    const pending = regs.filter(r => r.kyc !== 'Verified').length;
    const chips = [
      `<span class="meta-chip accent"><strong>${regs.length}</strong> Total Requests</span>`
    ];
    if (pending > 0) {
      chips.push(`<span class="meta-chip warning"><strong>${pending}</strong> Pending Review</span>`);
    }
    return chips.join('');
  }
  if (currentPage === 'sourcing') {
    const actions = getGovDashboardActionCounts(currentCategory === 'All' ? 'All' : currentCategory);
    return `<span class="meta-chip accent"><strong>${actions.sum}</strong> Action items</span>
      <span class="meta-chip"><strong>${actions.open}</strong> Open</span>
      <span class="meta-chip warning"><strong>${actions.pending}</strong> Pending</span>
      <span class="meta-chip danger"><strong>${actions.delays}</strong> Delays</span>`;
  }
  if (currentPage === 'work-queue') {
    const queue = getWorkQueueSource();
    const unread = queue.filter(i => i.unread).length;
    const high = queue.filter(i => i.severity === 'high').length;
    return `<span class="meta-chip accent"><strong>${queue.length}</strong> Total alerts</span>
      <span class="meta-chip warning"><strong>${unread}</strong> Unread</span>
      <span class="meta-chip danger"><strong>${high}</strong> High priority</span>`;
  }
  if (currentPage === 'sla-desk') {
    const open = SLA_THREADS.filter(t => t.status === 'Open').length;
    const progress = SLA_THREADS.filter(t => t.status === 'In Progress').length;
    return `<span class="meta-chip accent"><strong>${SLA_THREADS.length}</strong> Threads</span>
      <span class="meta-chip danger"><strong>${open}</strong> Open</span>
      <span class="meta-chip warning"><strong>${progress}</strong> In progress</span>`;
  }
  if (currentPage === 'tor') {
    const entries = filterByCategory(TOR_ENTRIES);
    const flags = entries.reduce((s, e) => s + e.flags, 0);
    if (flags > 0) {
      return `<span class="meta-chip warning"><strong>${flags}</strong> Red Flags</span>`;
    }
  }
  if (currentPage === 'workflow') {
    const { step, total } = getWorkflowPageSubtitle();
    return `<span class="meta-chip accent"><strong>Stage ${step.id}</strong> of ${total}</span>`;
  }
  return '';
}

function getPageLabel(page) {
  const nav = currentRole === 'gov' ? NAV_GOV : NAV_VENDOR;
  const item = nav.find(n => n.id === page);
  return item ? item.label : 'Dashboard';
}

function updateBreadcrumb() {
  const el = document.getElementById('breadcrumb');
  if (!el) return;
  const dashLabel = currentRole === 'gov' ? 'Analytics Dashboard' : 'My Dashboard';
  if (currentPage === 'dashboard') {
    el.innerHTML = `<span class="crumb active">${dashLabel}</span>`;
    return;
  }
  el.innerHTML = `
    <span class="crumb link" onclick="navigateTo('dashboard', true)">${dashLabel}</span>
    <i class="fa-solid fa-chevron-right crumb-sep"></i>
    <span class="crumb active">${getPageLabel(currentPage)}</span>`;
}

function updateBackButton() {
  const btn = document.getElementById('btnBack');
  if (!btn) return;
  // Show on every non-dashboard route (same pattern as vendor lifecycle pages)
  const show = currentPage !== 'dashboard';
  btn.classList.toggle('hidden', !show);
  btn.title = show
    ? (pageStack.length ? `Back to ${getPageLabel(pageStack[pageStack.length - 1])}` : 'Back to Dashboard')
    : 'Go back';
}

function goBack() {
  const prev = pageStack.length ? pageStack.pop() : 'dashboard';
  currentPage = prev || 'dashboard';
  if (currentPage === 'dashboard') pageStack = [];
  renderSidebar();
  renderTopbar();
  renderPage();
  closeAlertPanel();
}

function navigateTo(page, arg = {}) {
  const skipHistory = arg === true || arg.skipHistory;
  const opts = arg === true ? {} : arg;
  if (!skipHistory && currentPage !== page) {
    pageStack.push(currentPage);
  }
  if (page === 'dashboard') pageStack = [];
  if (page === 'tenders') {
    if (opts.tenderFilter) tenderStatusFilter = opts.tenderFilter;
    else if (!opts.keepTenderFilter) tenderStatusFilter = 'all';
  }
  currentPage = page;
  renderSidebar();
  renderTopbar();
  renderPage();
  closeAlertPanel();
}

// ========== PAGE RENDERING ==========
const PAGES_WITH_CATEGORY = new Set([
  'dashboard', 'vendor-reg', 'sourcing', 'master-data', 'tor',
  'vendor-matrix', 'reports', 'tenders', 'bids', 'clarifications', 'contracts', 'delivery'
]);

function getPageRenderer() {
  const pages = {
    dashboard: renderDashboard,
    workflow: renderWorkflow,
    'vendor-reg': renderVendorReg,
    sourcing: renderSourcing,
    'master-data': renderMasterData,
    tor: renderTOR,
    'vendor-matrix': renderVendorMatrix,
    reports: renderReports,
    settings: renderSettings,
    registration: renderRegistration,
    tenders: renderTenders,
    bids: renderBids,
    clarifications: renderClarifications,
    contracts: renderContracts,
    delivery: renderDelivery,
    performance: renderPerformance,
    'work-queue': renderWorkQueue,
    'sla-desk': renderSlaDesk
  };
  return pages[currentPage] || renderDashboard;
}

function renderCategoryBarSlot() {
  const slot = document.getElementById('categoryBarSlot');
  if (!slot) return;
  if (!PAGES_WITH_CATEGORY.has(currentPage)) {
    slot.innerHTML = '';
    slot.classList.add('hidden');
    slot.setAttribute('aria-hidden', 'true');
    return;
  }
  slot.innerHTML = categoryBar();
  slot.classList.remove('hidden');
  slot.setAttribute('aria-hidden', 'false');
}

function updateCategoryBarInPlace() {
  const toolbar = document.querySelector('#categoryBarSlot .page-toolbar');
  if (!toolbar) {
    renderCategoryBarSlot();
    return;
  }

  toolbar.querySelectorAll('.cat-tab').forEach(tab => {
    const name = tab.querySelector('.cat-tab-text')?.textContent;
    const isActive = name === currentCategory;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', String(isActive));
  });

  CATEGORIES.forEach(c => {
    if (c === 'All') return;
    const tab = [...toolbar.querySelectorAll('.cat-tab')].find(t => t.querySelector('.cat-tab-text')?.textContent === c);
    const countEl = tab?.querySelector('.cat-count');
    if (countEl) countEl.textContent = getCategoryItemCount(c);
  });

  const hint = toolbar.querySelector('.toolbar-info');
  if (hint) hint.title = categoryBadgeHint();
}

function finishPageInit() {
  if (currentPage === 'dashboard') {
    setTimeout(() => {
      const period = currentRole === 'gov' ? getAnalyticsChartPeriod() : currentPeriod;
      if (currentRole === 'gov') {
        refreshAllCharts(period, currentCategory);
        updateChartSubtitles();
        syncAnalyticsFilterControls();
      } else { initCategoryChart(currentCategory); }
    }, 100);
  }
  if (currentPage === 'reports') {
    setTimeout(() => {
      if (currentRole === 'vendor') initVendorReportCharts(currentCategory);
      else refreshGovReportsPage();
    }, 100);
  }
  if (currentPage === 'vendor-matrix') {
    setTimeout(() => {
      if (currentRole === 'gov') refreshVendorMatrixPage();
      else initVendorTrendChart(filterByCategory(VENDORS));
    }, 100);
  }
  bindPageEvents();
  initCustomSelects();
  bindAnalyticsFilterControls();
}

function renderPageContent() {
  document.getElementById('pageContent').innerHTML = getPageRenderer()();
  finishPageInit();
}

function renderPage() {
  renderCategoryBarSlot();
  renderPageContent();
}

function filterByCategory(items, field = 'category') {
  if (currentCategory === 'All') return items;
  return items.filter(item => item[field] === currentCategory);
}

function categoryBadgeHint() {
  if (currentPage === 'tenders' && tenderStatusFilter !== 'all') {
    return `Badge count = ${tenderStatusFilter} tenders in that category (matches the list below)`;
  }
  if (currentPage === 'tenders') {
    return 'Badge count = tenders in that category on this page';
  }
  if (currentPage === 'contracts') {
    return 'Badge count = contracts in that category on this page';
  }
  if (currentPage === 'bids') {
    return 'Badge count = your bids in that category on this page';
  }
  if (currentPage === 'delivery') {
    return 'Badge count = deliveries in that category on this page';
  }
  if (currentPage === 'clarifications') {
    return 'Badge count = clarifications in that category on this page';
  }
  if (currentPage === 'dashboard' || currentPage === 'sourcing') {
    if (currentRole === 'vendor' && currentPage === 'dashboard') {
      return 'Badge count = open + evaluation + draft tenders + active bids + active contracts in that category';
    }
    return 'Badge count = Open Tenders + Pending Approvals + Payment Delays (same as Analytics Dashboard)';
  }
  const hints = {
    dashboard: 'Active tender count per category on this page',
    bids: 'Your bid count per category',
    contracts: 'Active contract count per category'
  };
  return hints[currentPage] || 'Item count per category on this page';
}

function getVendorCategoryBadgeCount(cat) {
  const open = TENDERS.filter(t => t.category === cat && t.status === 'Open').length;
  const evaluation = TENDERS.filter(t => t.category === cat && t.status === 'Evaluation').length;
  const draft = TENDERS.filter(t => t.category === cat && t.status === 'Draft').length;
  const activeBids = BIDS.filter(b => b.category === cat).length;
  const activeContracts = CONTRACTS.filter(c => c.category === cat).length;
  return open + evaluation + draft + activeBids + activeContracts;
}

function filterTendersByStatus(tenders) {
  const statusMap = { open: 'Open', evaluation: 'Evaluation', draft: 'Draft' };
  const status = statusMap[tenderStatusFilter];
  return status ? tenders.filter(t => t.status === status) : tenders;
}

function countTendersByStatus(tenders, status) {
  return tenders.filter(t => t.status === status).length;
}

function categoryBar() {
  const counts = {};
  CATEGORIES.forEach(c => {
    if (c === 'All') counts[c] = null;
    else counts[c] = getCategoryItemCount(c);
  });
  return `<div class="page-toolbar">
    <span class="page-toolbar-label">
      <i class="fa-solid fa-layer-group"></i> Category
      <i class="fa-solid fa-circle-info toolbar-info" title="${categoryBadgeHint()}"></i>
    </span>
    <div class="category-bar" role="tablist" aria-label="Category filter">
      ${CATEGORIES.map(c => `<button type="button" role="tab" aria-selected="${currentCategory === c}" class="cat-tab ${currentCategory === c ? 'active' : ''}" onclick="setCategory('${c}')"><span class="cat-tab-text">${c}</span>${counts[c] !== null ? `<span class="cat-count">${counts[c]}</span>` : ''}</button>`).join('')}
    </div>
  </div>`;
}

function getGovDashboardActionCounts(cat) {
  const tenders = cat === 'All' ? TENDERS : TENDERS.filter(t => t.category === cat);
  const open = tenders.filter(t => t.status === 'Open').length;
  const pendingList = typeof PENDING_APPROVALS !== 'undefined'
    ? (cat === 'All' ? PENDING_APPROVALS : PENDING_APPROVALS.filter(r => r.category === cat))
    : [];
  const delayList = typeof PAYMENT_DELAYS !== 'undefined'
    ? (cat === 'All' ? PAYMENT_DELAYS : PAYMENT_DELAYS.filter(r => r.category === cat))
    : [];
  const pending = pendingList.length || (cat === 'All' ? 8 : Math.max(1, Math.round(8 * (CATEGORY_WEIGHTS[cat] ?? 1))));
  const delays = delayList.length || Math.max(1, Math.round(6 * (CATEGORY_WEIGHTS[cat] ?? 1)));
  return { open, pending, delays, sum: open + pending + delays };
}

function getCategoryItemCount(cat) {
  // Always prefer page-local counts so Contracts/Bids/etc. are not polluted by dashboard totals
  if (currentPage === 'tenders') {
    return filterTendersByStatus(TENDERS.filter(t => t.category === cat)).length;
  }
  if (currentPage === 'contracts') {
    return CONTRACTS.filter(c => c.category === cat).length;
  }
  if (currentPage === 'bids') {
    return BIDS.filter(b => b.category === cat).length;
  }
  if (currentPage === 'delivery') {
    return DELIVERIES.filter(d => d.category === cat).length;
  }
  if (currentPage === 'clarifications') {
    return CLARIFICATIONS.filter(c => c.category === cat).length;
  }
  if (currentPage === 'vendor-reg') {
    return VENDOR_REGISTRATIONS.filter(r => r.category === cat).length;
  }
  if (currentPage === 'sourcing') {
    return getGovDashboardActionCounts(cat).sum;
  }
  if (currentPage === 'tor') {
    return TOR_ENTRIES.filter(t => t.category === cat).length;
  }
  if (currentPage === 'vendor-matrix') {
    return VENDORS.filter(v => v.category === cat).length;
  }
  if (currentPage === 'dashboard') {
    if (currentRole === 'vendor') return getVendorCategoryBadgeCount(cat);
    return getGovDashboardActionCounts(cat).sum;
  }
  if (currentRole === 'vendor') {
    return getVendorCategoryBadgeCount(cat);
  }
  return TENDERS.filter(t => t.category === cat).length;
}

function emptyTableRow(cols, msg) {
  return `<tr><td colspan="${cols}" class="empty-state"><i class="fa-solid fa-inbox"></i> ${msg || `No records found for ${currentCategory} category.`}</td></tr>`;
}

function kycBadgeClass(kyc) {
  if (kyc === 'Verified') return 'success';
  if (kyc === 'Pending') return 'warning';
  return 'info';
}

function tenderBadgeClass(status) {
  if (status === 'Open') return 'success';
  if (status === 'Evaluation') return 'warning';
  if (status === 'Awarded') return 'info';
  if (status === 'Draft') return 'muted';
  return 'muted';
}

function renderPerformanceBreakdown(vendor) {
  const BENCHMARK = 85;
  const metrics = PERF_METRICS.map(m => ({
    ...m,
    score: vendor[m.key],
    delta: vendor[m.key] - BENCHMARK
  }));
  const aboveCount = metrics.filter(m => m.score >= BENCHMARK).length;
  const strongest = metrics.reduce((a, b) => (b.score > a.score ? b : a));

  return `<div class="perf-breakdown">
    <div class="perf-hero">
      <div class="perf-score-ring">
        <svg viewBox="0 0 120 120">
          <circle class="perf-ring-bg" cx="60" cy="60" r="52"/>
          <circle class="perf-ring-fill" cx="60" cy="60" r="52" style="stroke-dashoffset:${326 - (326 * vendor.overall / 100)}"/>
        </svg>
        <div class="perf-score-center">
          <span class="perf-score-num">${vendor.overall}</span>
          <span class="perf-score-label">Overall</span>
        </div>
      </div>
      <div class="perf-hero-info">
        <h3>${vendor.name}</h3>
        <p class="perf-vendor-id"><i class="fa-solid fa-id-badge"></i> ${vendor.id}</p>
        <span class="badge badge-success"><i class="fa-solid fa-certificate"></i> ${vendor.status} Vendor</span>
        <p class="perf-hero-desc">Weighted score across 5 evaluation parameters vs platform benchmark of ${BENCHMARK}.</p>
      </div>
    </div>

    <div class="score-compare">
      <div class="score-compare-header">
        <div class="score-compare-title">
          <h3>Performance vs Benchmark</h3>
          <p>Compare your weighted scores against the platform standard of ${BENCHMARK} points</p>
        </div>
        <div class="score-compare-legend-bar" role="note" aria-label="Chart legend">
          <div class="legend-key">
            <span class="legend-key-icon legend-key-icon--score" aria-hidden="true"></span>
            <span class="legend-key-text">Your score</span>
          </div>
          <span class="legend-key-sep" aria-hidden="true"></span>
          <div class="legend-key">
            <span class="legend-key-icon legend-key-icon--benchmark" aria-hidden="true"></span>
            <span class="legend-key-text">Benchmark <strong>${BENCHMARK}</strong></span>
          </div>
        </div>
      </div>

      <div class="score-compare-summary">
        <div class="score-summary-card">
          <span class="score-summary-icon"><i class="fa-solid fa-arrow-trend-up"></i></span>
          <div>
            <span class="score-summary-value">${aboveCount}<small>/5</small></span>
            <span class="score-summary-label">Metrics above benchmark</span>
          </div>
        </div>
        <div class="score-summary-card highlight">
          <span class="score-summary-icon"><i class="fa-solid fa-trophy"></i></span>
          <div>
            <span class="score-summary-value">${strongest.score}</span>
            <span class="score-summary-label">Top performer · ${strongest.label}</span>
          </div>
        </div>
        <div class="score-summary-card">
          <span class="score-summary-icon"><i class="fa-solid fa-gauge-high"></i></span>
          <div>
            <span class="score-summary-value">${vendor.overall}</span>
            <span class="score-summary-label">Weighted overall score</span>
          </div>
        </div>
      </div>

      <div class="score-compare-table">
        <div class="score-compare-thead">
          <span>Parameter</span>
          <span>Score distribution (0–100)</span>
          <span>Score</span>
          <span>vs Benchmark</span>
        </div>
        <div class="score-compare-rows">
        ${metrics.map(m => {
          const deltaClass = m.delta > 0 ? 'up' : m.delta < 0 ? 'down' : 'neutral';
          const deltaText = m.delta > 0 ? `+${m.delta}` : m.delta === 0 ? '0' : String(m.delta);
          const deltaHint = m.delta > 0 ? 'Above standard' : m.delta < 0 ? 'Below standard' : 'Meets standard';
          return `<div class="score-compare-row" style="--metric-color:${m.color}">
            <div class="score-row-label">
              <span class="score-row-icon"><i class="fa-solid ${m.icon}"></i></span>
              <div class="score-row-text">
                <span class="score-row-name">${m.label}</span>
                <span class="score-row-weight">${m.weight}% weight</span>
              </div>
            </div>
            <div class="score-row-visual">
              <div class="score-lane-track">
                <div class="score-lane-benchmark" style="left:${BENCHMARK}%"></div>
                <div class="score-lane-fill" style="width:${m.score}%"></div>
              </div>
            </div>
            <div class="score-row-score">${m.score}</div>
            <div class="score-row-result" title="Score ${m.score} vs benchmark ${BENCHMARK}">
              <span class="score-delta ${deltaClass}">${deltaText}</span>
              <span class="score-delta-hint">${deltaHint}</span>
            </div>
          </div>`;
        }).join('')}
        </div>
      </div>
    </div>
  </div>`;
}

function paginateItems(items, page, pageSize = PIPELINE_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
    total: items.length,
    from: items.length ? start + 1 : 0,
    to: Math.min(start + pageSize, items.length)
  };
}

function renderPaginationControls(page, totalPages, total, from, to, handlerName) {
  if (totalPages <= 1) {
    return total ? `<div class="table-pagination table-pagination--single"><span>Showing ${total} tender${total !== 1 ? 's' : ''}</span></div>` : '';
  }
  const pages = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== '…') {
      pages.push('…');
    }
  }
  return `<div class="table-pagination">
    <span class="pagination-info">Showing ${from}–${to} of ${total} tenders</span>
    <div class="pagination-controls">
      <button type="button" class="pagination-btn" ${page <= 1 ? 'disabled' : ''} onclick="${handlerName}(${page - 1})"><i class="fa-solid fa-chevron-left"></i></button>
      ${pages.map(p => p === '…'
        ? `<span class="pagination-ellipsis">…</span>`
        : `<button type="button" class="pagination-btn ${p === page ? 'active' : ''}" onclick="${handlerName}(${p})">${p}</button>`
      ).join('')}
      <button type="button" class="pagination-btn" ${page >= totalPages ? 'disabled' : ''} onclick="${handlerName}(${page + 1})"><i class="fa-solid fa-chevron-right"></i></button>
    </div>
  </div>`;
}

function pipelineActionLabel(status) {
  if (status === 'Open') return 'Submit Bid';
  if (status === 'Draft') return 'Preview';
  if (status === 'Awarded') return 'View Award';
  return 'View';
}

function renderTenderPipeline(tenders) {
  const pipelineTenders = tenders.filter(t => ['Open', 'Evaluation', 'Draft', 'Awarded'].includes(t.status));
  const paged = paginateItems(pipelineTenders, pipelinePage);
  return `<div class="data-table-wrap">
      <div class="table-header">
        <h3>Tender Details</h3>
        <span class="meta-chip">${paged.total} tender${paged.total !== 1 ? 's' : ''}</span>
      </div>
      <table class="data-table">
        <thead><tr><th>S.No</th><th>Tender ID</th><th>Title</th><th>Category</th><th>Deadline</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          ${paged.items.length ? paged.items.map((t, i) => `<tr onclick="openDrillDown('tender','${t.id}','${t.title} - ${t.category}. Value: ${t.value}. Status: ${t.status}.')">
            <td>${paged.from + i}</td>
            <td><strong>${t.id}</strong></td><td>${t.title}</td><td>${t.category}</td><td>${formatDateDMY(t.deadline)}</td>
            <td><span class="badge badge-${tenderBadgeClass(t.status)}">${t.status}</span></td>
            <td><button class="btn btn-outline" style="padding:0.3rem 0.6rem;font-size:0.75rem">${pipelineActionLabel(t.status)}</button></td>
          </tr>`).join('') : emptyTableRow(7, 'No tenders in pipeline for this category.')}
        </tbody>
      </table>
      ${renderPaginationControls(paged.page, paged.totalPages, paged.total, paged.from, paged.to, 'setPipelinePage')}
    </div>`;
}

function setPipelinePage(page) {
  pipelinePage = page;
  if (currentPage === 'dashboard' && currentRole === 'vendor') {
    renderPageContent();
  }
}

function timeToggle() {
  return `<div class="time-toggle" role="group" aria-label="Time granularity">
    ${['year', 'quarter', 'month'].map(p => `<button type="button" class="time-btn ${currentPeriod === p ? 'active' : ''}" onclick="setPeriod('${p}')">${p.charAt(0).toUpperCase() + p.slice(1)}</button>`).join('')}
  </div>`;
}

function renderAnalyticsFilterBar(options = {}) {
  const { showCompare = true } = options;
  const fyOptions = typeof ANALYTICS_FY_OPTIONS !== 'undefined' ? ANALYTICS_FY_OPTIONS : ['all'];
  const years = fyOptions.filter(y => y !== 'all');
  const yearSelected = analyticsFocusYear !== 'all';
  const quarters = typeof ANALYTICS_QUARTER_OPTIONS !== 'undefined' ? ANALYTICS_QUARTER_OPTIONS : [];
  const months = typeof ANALYTICS_MONTH_OPTIONS !== 'undefined' ? ANALYTICS_MONTH_OPTIONS : [];
  const fyDisplay = fyOptions.map(y => y === 'all' ? 'All 10 years' : y);
  const fySelectedDisplay = analyticsFocusYear === 'all' ? 'All 10 years' : analyticsFocusYear;

  return `<div class="analytics-filter">
    <div class="analytics-filter-intro">
      <div class="analytics-filter-icon"><i class="fa-solid fa-chart-line"></i></div>
      <div>
        <h3>Performance Matrix Explorer</h3>
        <p>Select a <strong>financial year</strong>, choose <strong>quarter</strong> or <strong>month</strong> view, then pick a specific period to filter all charts below.</p>
      </div>
    </div>
    <div class="analytics-filter-controls">
      <div class="analytics-control">
        <span class="analytics-control-label">Focus year</span>
        ${typeof inlineCustomSelectHTML === 'function'
          ? inlineCustomSelectHTML('analyticsFocusYear', fyDisplay, fySelectedDisplay)
          : `<select id="analyticsFocusYear" onchange="setAnalyticsFocusYear(this.value)">${fyDisplay.map(d => `<option>${d}</option>`).join('')}</select>`}
      </div>
      <div class="analytics-control ${yearSelected ? '' : 'analytics-control--muted'}">
        <span class="analytics-control-label">View by ${yearSelected ? '' : '(select a year first)'}</span>
        <div class="analytics-segment ${yearSelected ? '' : 'is-disabled'}" role="group" aria-label="Quarter or month view">
          <button type="button" class="analytics-seg-btn ${analyticsSliceType === 'quarter' ? 'active' : ''}" onclick="setAnalyticsSliceType('quarter')" ${yearSelected ? '' : 'disabled'}><i class="fa-solid fa-table-cells"></i> Quarter</button>
          <button type="button" class="analytics-seg-btn ${analyticsSliceType === 'month' ? 'active' : ''}" onclick="setAnalyticsSliceType('month')" ${yearSelected ? '' : 'disabled'}><i class="fa-solid fa-calendar-days"></i> Month</button>
        </div>
      </div>
      ${showCompare ? `<div class="analytics-control">
        <span class="analytics-control-label">Compare by</span>
        <div class="analytics-segment" role="group" aria-label="Comparison mode">
          <button type="button" class="analytics-seg-btn ${analyticsCompareMode === 'vendor' ? 'active' : ''}" onclick="setAnalyticsCompareMode('vendor')"><i class="fa-solid fa-users"></i> Vendor-wise</button>
          <button type="button" class="analytics-seg-btn ${analyticsCompareMode === 'progress' ? 'active' : ''}" onclick="setAnalyticsCompareMode('progress')"><i class="fa-solid fa-arrow-trend-up"></i> Progress trend</button>
        </div>
      </div>` : ''}
    </div>
    <div class="analytics-fy-chips" role="group" aria-label="Quick year select">
      <button type="button" class="analytics-fy-chip ${analyticsFocusYear === 'all' ? 'active' : ''}" onclick="setAnalyticsFocusYear('all')">All 10 yrs</button>
      ${years.map(y => `<button type="button" class="analytics-fy-chip ${analyticsFocusYear === y ? 'active' : ''}" onclick="setAnalyticsFocusYear('${y}')">${y.replace('FY', '')}</button>`).join('')}
    </div>
    ${yearSelected ? `<div class="analytics-period-row">
      <span class="analytics-control-label">Select ${analyticsSliceType === 'quarter' ? 'quarter' : 'month'} in ${analyticsFocusYear}</span>
      <div class="analytics-fy-chips" role="group" aria-label="Period select">
        <button type="button" class="analytics-fy-chip ${analyticsPeriodFocus === 'all' ? 'active' : ''}" onclick="setAnalyticsPeriodFocus('all')">All</button>
        ${analyticsSliceType === 'quarter'
          ? quarters.map(q => `<button type="button" class="analytics-fy-chip ${analyticsPeriodFocus === q.id ? 'active' : ''}" onclick="setAnalyticsPeriodFocus('${q.id}')" title="${q.range}">${q.label} <em>${q.range}</em></button>`).join('')
          : months.map(m => `<button type="button" class="analytics-fy-chip ${analyticsPeriodFocus === m ? 'active' : ''}" onclick="setAnalyticsPeriodFocus('${m}')">${m}</button>`).join('')}
      </div>
    </div>` : `<p class="analytics-filter-hint"><i class="fa-solid fa-circle-info"></i> All 10 years selected — charts show year-over-year trends. Pick a FY to enable quarter/month filtering.</p>`}
  </div>`;
}

function getAnalyticsContextLabel() {
  const cat = currentCategory === 'All' ? 'All categories' : currentCategory;
  if (analyticsFocusYear === 'all') return `Last 10 FYs · ${cat}`;
  let period = analyticsSliceType === 'month' ? 'Monthly view' : 'Quarterly view';
  if (analyticsPeriodFocus !== 'all') period = analyticsPeriodFocus;
  return `${analyticsFocusYear} · ${period} · ${cat}`;
}

function getChartSubtitle(chartKey) {
  const ctx = getAnalyticsContextLabel();
  const units = {
    spend: '₹ Crore — total procurement outlay',
    procurement: 'tenders — count of tenders published/processed',
    vendorPerf: 'points (0–100) — weighted vendor score',
    savings: '₹ Crore — realized cost savings'
  };
  return `${ctx} · ${units[chartKey] || ''}`;
}

function updateChartSubtitles() {
  document.querySelectorAll('[data-chart-sub]').forEach(el => {
    const key = el.dataset.chartSub;
    if (key) el.textContent = getChartSubtitle(key);
  });
  updateAnalyticsExplorerSubtitle();
}

function getAnalyticsChartPeriod() {
  if (analyticsFocusYear === 'all') return 'year';
  return analyticsSliceType || 'quarter';
}

function isGovAnalyticsPage() {
  return currentRole === 'gov' && (currentPage === 'dashboard' || currentPage === 'vendor-matrix' || currentPage === 'reports');
}

function getReportsPeriodTotals() {
  const period = getAnalyticsChartPeriod();
  const cat = currentCategory;
  const spend = typeof resolveChartSeries === 'function' ? resolveChartSeries('spend', period) : { data: [] };
  const savings = typeof resolveChartSeries === 'function' ? resolveChartSeries('savings', period) : { data: [] };
  const spendData = typeof scaleData === 'function' ? scaleData(spend.data || [], cat) : (spend.data || []);
  const saveData = typeof scaleData === 'function' ? scaleData(savings.data || [], cat) : (savings.data || []);
  const spendTotal = Math.round(spendData.reduce((s, v) => s + (Number(v) || 0), 0) * 10) / 10;
  const saveTotal = Math.round(saveData.reduce((s, v) => s + (Number(v) || 0), 0) * 10) / 10;
  const rate = spendTotal > 0 ? Math.round((saveTotal / spendTotal) * 1000) / 10 : 0;
  return { spendTotal, saveTotal, rate, period };
}

function refreshGovReportsPage() {
  const period = getAnalyticsChartPeriod();
  if (typeof initSpendChart === 'function') initSpendChart(period, currentCategory);
  if (typeof initSavingsChart === 'function') initSavingsChart(period, currentCategory);
  if (typeof initGovReportCharts === 'function') initGovReportCharts(currentCategory);
  updateChartSubtitles();
  syncAnalyticsFilterControls();
  const totals = getReportsPeriodTotals();
  const spendEl = document.getElementById('reportSpendTotal');
  const saveEl = document.getElementById('reportSaveTotal');
  const rateEl = document.getElementById('reportSaveRate');
  const ctxEl = document.getElementById('reportContextLabel');
  if (spendEl) spendEl.textContent = `₹${totals.spendTotal} Cr`;
  if (saveEl) saveEl.textContent = `₹${totals.saveTotal} Cr`;
  if (rateEl) rateEl.textContent = `${totals.rate}%`;
  if (ctxEl) ctxEl.textContent = getAnalyticsContextLabel();
  document.querySelectorAll('.analytics-period-row .analytics-fy-chip').forEach(chip => {
    const label = chip.textContent.trim().split(/\s/)[0];
    const isAll = analyticsPeriodFocus === 'all' && label === 'All';
    const isMatch = analyticsPeriodFocus !== 'all' && (label === analyticsPeriodFocus || chip.textContent.includes(analyticsPeriodFocus));
    chip.classList.toggle('active', isAll || isMatch);
  });
}

/** Scale factor for vendor scores based on FY / quarter / month explorer selection */
function getAnalyticsScoreFactor() {
  const focus = analyticsFocusYear;
  if (!focus || focus === 'all') return 1;

  const vp = CHART_DATA.vendorPerf;
  if (!vp) return 1;

  const yearIdx = vp.year.labels.indexOf(focus);
  const base = yearIdx >= 0 ? vp.year.data[yearIdx] : 88;
  const latest = vp.year.data[vp.year.data.length - 1];
  let factor = latest ? base / latest : 1;

  const periodData = analyticsSliceType === 'month' ? vp.month : vp.quarter;
  const pf = analyticsPeriodFocus;
  if (pf && pf !== 'all') {
    const pidx = periodData.labels.findIndex(l => l === pf || l.startsWith(pf) || l.includes(pf));
    if (pidx >= 0) {
      const periodVal = periodData.data[pidx];
      const periodAvg = periodData.data.reduce((s, v) => s + v, 0) / periodData.data.length;
      factor *= periodAvg ? periodVal / periodAvg : 1;
    }
  }

  return factor;
}

function adjustVendorScores(vendor, factor) {
  if (factor === 1) return vendor;
  const adj = v => Math.min(100, Math.max(1, Math.round(v * factor * 10) / 10));
  const quality = adj(vendor.quality);
  const leadTime = adj(vendor.leadTime);
  const cost = adj(vendor.cost);
  const regulatory = adj(vendor.regulatory);
  const satisfaction = adj(vendor.satisfaction);
  const overall = Math.round(quality * 0.3 + leadTime * 0.2 + cost * 0.2 + regulatory * 0.2 + satisfaction * 0.1);
  return { ...vendor, quality, leadTime, cost, regulatory, satisfaction, overall };
}

function getAnalyticsAdjustedVendors(vendors) {
  const factor = getAnalyticsScoreFactor();
  return vendors.map(v => adjustVendorScores(v, factor));
}

function refreshDashboardVendorTable() {
  const tbody = document.querySelector('#dashboardVendorTable tbody');
  if (!tbody) return;
  const vendors = getAnalyticsAdjustedVendors(filterByCategory(VENDORS));
  tbody.innerHTML = renderVendorTableRows(vendors);
}

function refreshVendorMatrixPage() {
  const vendors = getAnalyticsAdjustedVendors(filterByCategory(VENDORS));
  if (typeof initVendorTrendChart === 'function') initVendorTrendChart(vendors);
  updateVendorMatrixSubtitle();
  const tbody = document.querySelector('#vendorMatrixTable tbody');
  if (tbody) tbody.innerHTML = renderVendorTableRows(vendors);
  syncAnalyticsFilterControls();
  document.querySelectorAll('.analytics-period-row .analytics-fy-chip').forEach(chip => {
    const label = chip.textContent.trim().split(/\s/)[0];
    const isAll = analyticsPeriodFocus === 'all' && label === 'All';
    const isMatch = analyticsPeriodFocus !== 'all' && (label === analyticsPeriodFocus || chip.textContent.includes(analyticsPeriodFocus));
    chip.classList.toggle('active', isAll || isMatch);
  });
}

function updateVendorMatrixSubtitle() {
  const subtitle = document.getElementById('vendorMatrixChartSubtitle');
  if (subtitle) {
    subtitle.textContent = `${getAnalyticsContextLabel()} · Vendor score comparison (pts 0–100)`;
  }
}

function bindAnalyticsFilterControls() {
  const wrapper = document.querySelector('.custom-select[data-select-id="analyticsFocusYear"]');
  if (wrapper && !wrapper.dataset.analyticsBound) {
    wrapper.dataset.analyticsBound = 'true';
    wrapper.addEventListener('change', e => {
      const display = e.detail?.value || '';
      const year = display === 'All 10 years' ? 'all' : display;
      setAnalyticsFocusYear(year);
    });
  }
}

// ========== DASHBOARD ==========
function renderDashboard() {
  if (currentRole === 'gov') return renderGovDashboard();
  return renderVendorDashboard();
}

function renderGovDashboard() {
  const vendors = filterByCategory(VENDORS);
  const weight = CATEGORY_WEIGHTS[currentCategory];
  const actions = getGovDashboardActionCounts(currentCategory);
  const spend = Math.round(215 * weight * 10) / 10;
  const avgScore = vendors.length
    ? (vendors.reduce((s, v) => s + v.overall, 0) / vendors.length).toFixed(1)
    : '—';
  const compareTitle = analyticsCompareMode === 'vendor' ? 'Vendor-wise Comparison' : 'Tender Progress Trend';
  const compareIcon = analyticsCompareMode === 'vendor' ? 'users' : 'arrow-trend-up';
  const metricAvgs = getCategoryMetricAverages(vendors);

  return `
    <div class="kpi-section">
      <div class="kpi-section-label"><i class="fa-solid fa-bolt"></i> Action queue <span class="kpi-section-sum">Tab total = ${actions.sum}</span></div>
      <div class="kpi-grid kpi-grid--actions">
        <div class="kpi-card blue" onclick="openGovKpiDetail('openTenders')">
          <div class="kpi-label">Open Tenders</div>
          <div class="kpi-value">${actions.open}</div>
          <div class="kpi-change up">↑ 12% vs last quarter</div>
        </div>
        <div class="kpi-card orange" onclick="openGovKpiDetail('pendingApprovals')">
          <div class="kpi-label">Pending Approvals</div>
          <div class="kpi-value">${actions.pending}</div>
          <div class="kpi-change down">↓ 3 resolved today</div>
        </div>
        <div class="kpi-card red" onclick="openGovKpiDetail('paymentDelays')">
          <div class="kpi-label">Payment Delays</div>
          <div class="kpi-value">${actions.delays}</div>
          <div class="kpi-change down">↑ 2 new this week</div>
        </div>
      </div>
    </div>

    <div class="kpi-section">
      <div class="kpi-section-label"><i class="fa-solid fa-chart-pie"></i> Performance metrics</div>
      <div class="kpi-grid kpi-grid--metrics">
        <div class="kpi-card green" onclick="openGovKpiDetail('procurementSpend')">
          <div class="kpi-label">Procurement Spend</div>
          <div class="kpi-value">₹${spend} Cr</div>
          <div class="kpi-change up">↑ 8.2% YoY</div>
        </div>
        <div class="kpi-card teal" onclick="openGovKpiDetail('avgVendorScore')">
          <div class="kpi-label">Vendor Score</div>
          <div class="kpi-value">${avgScore}</div>
          <div class="kpi-change up">↑ 3.2 pts YoY</div>
        </div>
      </div>
    </div>

    ${renderAnalyticsFilterBar()}

    <div class="chart-grid">
      <div class="chart-card full">
        <div class="chart-header">
          <h3><i class="fa-solid fa-${compareIcon}"></i> ${compareTitle}</h3>
          <span class="chart-subtitle">${getAnalyticsContextLabel()} · ${analyticsCompareMode === 'progress' ? 'Tender pipeline' : 'Vendor score comparison'}</span>
        </div>
        <div class="chart-container chart-container--tall"><canvas id="chartAnalyticsCompare"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-header">
          <h3><i class="fa-solid fa-chart-column"></i> Spend Trends (₹ Cr)</h3>
          <span class="chart-subtitle" data-chart-sub="spend">Total procurement spend · unit: ₹ Crore</span>
        </div>
        <div class="chart-container"><canvas id="chartSpend"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-header">
          <h3><i class="fa-solid fa-chart-line"></i> Procurement Trends (Tender)</h3>
          <span class="chart-subtitle" data-chart-sub="procurement">Tenders published / processed · unit: count of tenders</span>
        </div>
        <div class="chart-container"><canvas id="chartProcurement"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-header">
          <h3><i class="fa-solid fa-star"></i> Vendor Performance Trends</h3>
          <span class="chart-subtitle" data-chart-sub="vendorPerf">Weighted vendor score · unit: points (0–100)</span>
        </div>
        <div class="chart-container"><canvas id="chartVendorPerf"></canvas></div>
      </div>
      <div class="chart-card">
        <div class="chart-header">
          <h3><i class="fa-solid fa-piggy-bank"></i> Savings Realization (₹ Cr)</h3>
          <span class="chart-subtitle" data-chart-sub="savings">Cost savings from optimization · unit: ₹ Crore</span>
        </div>
        <div class="chart-container"><canvas id="chartSavings"></canvas></div>
      </div>
      <div class="chart-card full">
        <div class="chart-header">
          <h3><i class="fa-solid fa-chart-pie"></i> Category Distribution</h3>
          <span class="chart-subtitle">Spend share (% of total) — click a slice for item &amp; district detail</span>
        </div>
        <div class="chart-container sm"><canvas id="chartCategory"></canvas></div>
      </div>
    </div>
    <div class="score-weights">
      ${PERF_METRICS.map(m => {
        const avg = metricAvgs[m.key];
        return `<div class="weight-card weight-card--clickable" onclick="openGovKpiDetail('metric:${m.key}')" title="View ${m.label} detail">
          <div class="weight-pct">${avg}</div>
          <div class="weight-label">${m.label}</div>
        </div>`;
      }).join('')}
    </div>
    ${renderVendorTable({ tableId: 'dashboardVendorTable' })}
  `;
}

function renderVendorDashboard() {
  const tenders = filterByCategory(TENDERS);
  const bids = filterByCategory(BIDS);
  const contracts = filterByCategory(CONTRACTS);
  const openCount = countTendersByStatus(tenders, 'Open');
  const evalCount = countTendersByStatus(tenders, 'Evaluation');
  const draftCount = countTendersByStatus(tenders, 'Draft');
  const draftBids = bids.filter(b => b.status === 'Draft').length;

  return `
    <div class="kpi-grid kpi-grid--vendor">
      <div class="kpi-card green" onclick="navigateTo('tenders', { tenderFilter: 'open' })">
        <div class="kpi-label">Open</div>
        <div class="kpi-value">${openCount}</div>
        <div class="kpi-change">Accepting bids</div>
      </div>
      <div class="kpi-card orange" onclick="navigateTo('tenders', { tenderFilter: 'evaluation' })">
        <div class="kpi-label">Evaluation</div>
        <div class="kpi-value">${evalCount}</div>
        <div class="kpi-change">Under review</div>
      </div>
      <div class="kpi-card slate" onclick="navigateTo('tenders', { tenderFilter: 'draft' })">
        <div class="kpi-label">Draft</div>
        <div class="kpi-value">${draftCount}</div>
        <div class="kpi-change">In preparation</div>
      </div>
      <div class="kpi-card blue" onclick="navigateTo('bids')">
        <div class="kpi-label">Active Bids</div>
        <div class="kpi-value">${bids.length}</div>
        <div class="kpi-change">${draftBids} in draft</div>
      </div>
      <div class="kpi-card teal" onclick="navigateTo('contracts')">
        <div class="kpi-label">Active Contracts</div>
        <div class="kpi-value">${contracts.length}</div>
        <div class="kpi-change kpi-change--truncate">${contracts.length ? contracts.map(c => c.value).join(' · ') : 'No active contracts'}</div>
      </div>
      <div class="kpi-card purple" onclick="navigateTo('performance')">
        <div class="kpi-label">Performance Score</div>
        <div class="kpi-value">90.1</div>
        <div class="kpi-change up">Preferred Vendor</div>
      </div>
    </div>
    ${renderPerformanceBreakdown(VENDORS[0])}
    <div class="chart-grid">
      <div class="chart-card full">
        <div class="chart-header"><h3><i class="fa-solid fa-chart-pie"></i> Category Distribution</h3><span class="chart-subtitle">Spend share (% of total) — click a slice for item &amp; district detail</span></div>
        <div class="chart-container sm"><canvas id="chartCategory"></canvas></div>
      </div>
    </div>
    ${renderTenderPipeline(tenders)}
  `;
}

function renderVendorTableRows(vendors) {
  return vendors.length ? vendors.map(v => `<tr onclick="openVendorDetail('${v.id}')">
    <td><strong>${v.id}</strong></td>
    <td>${v.name}</td>
    <td>${v.category}</td>
    ${[v.quality, v.leadTime, v.cost, v.regulatory, v.satisfaction].map(s => `<td><div class="score-bar"><div class="score-track"><div class="score-fill ${s >= 85 ? 'high' : s >= 70 ? 'mid' : 'low'}" style="width:${s}%"></div></div><span>${s}</span></div></td>`).join('')}
    <td><strong>${v.overall}</strong></td>
    <td><span class="badge badge-${v.status === 'Preferred' ? 'success' : v.status === 'Watch' ? 'danger' : 'info'}">${v.status}</span></td>
  </tr>`).join('') : emptyTableRow(10);
}

function renderVendorTable(options = {}) {
  const { showNavButton = true, tableId = '' } = options;
  const vendors = getAnalyticsAdjustedVendors(filterByCategory(VENDORS));
  return `<div class="data-table-wrap"${tableId ? ` id="${tableId}"` : ''}>
    <div class="table-header"><h3>Vendor Performance Matrix ${currentCategory !== 'All' ? `— ${currentCategory}` : ''}</h3>${showNavButton ? `<button class="btn btn-outline" onclick="navigateTo('vendor-matrix')">Full Matrix →</button>` : ''}</div>
    <table class="data-table">
      <thead><tr><th>Vendor ID</th><th>Name</th><th>Category</th><th>Quality</th><th>Lead Time</th><th>Cost</th><th>Regulatory</th><th>Satisfaction</th><th>Overall</th><th>Status</th></tr></thead>
      <tbody>
        ${renderVendorTableRows(vendors)}
      </tbody>
    </table>
  </div>`;
}

// ========== WORKFLOW ==========
function getWorkflowSteps() {
  return currentRole === 'gov' ? GOV_WORKFLOW : VENDOR_WORKFLOW;
}

function getWorkflowStepClasses(step, viewId) {
  const classes = ['wf-step'];
  if (step.id < viewId) classes.push('done');
  else if (step.id === viewId) classes.push('active');
  else classes.push('pending');
  return classes.join(' ');
}

function wfDotContent(step, viewId) {
  if (step.id < viewId) return '<i class="fa-solid fa-check"></i>';
  return step.id;
}

function getRegistrationCategories() {
  return CATEGORIES.filter(c => c !== 'All');
}

function ensureWorkflowViewStep() {
  const progress = getWorkflowProgressStep();
  if (!currentWorkflowStep || currentWorkflowStep < 1 || currentWorkflowStep > getWorkflowSteps().length) {
    currentWorkflowStep = progress;
  }
}

function renderWorkflow() {
  ensureWorkflowViewStep();
  const steps = getWorkflowSteps();
  const progress = getWorkflowProgressStep();
  const viewId = currentWorkflowStep;
  const total = steps.length;
  const isGov = currentRole === 'gov';

  return `
    <div class="wf-page-header">
      <p class="wf-page-hint">${isGov ? '13 stages · click a step to navigate' : '9 stages · click any step to review or update'}</p>
      <button type="button" class="wf-guide-download" onclick="openLifecycleGuideModal()">
        <i class="fa-solid fa-book"></i>
        <span>Guide</span>
      </button>
    </div>
    <div class="workflow-timeline" role="tablist" aria-label="Procurement lifecycle stages">
      ${steps.map(s => `<div class="${getWorkflowStepClasses(s, viewId)}" data-step="${s.id}" role="tab" aria-selected="${s.id === viewId}" tabindex="0" onclick="selectWorkflowStep(${s.id})" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();selectWorkflowStep(${s.id})}">
        <div class="wf-dot">${wfDotContent(s, viewId)}</div>
        <div class="wf-label" title="${s.name}">${s.name}</div>
      </div>`).join('')}
    </div>
    <div class="wf-detail" id="wfDetail">
      ${renderWorkflowDetailPanel(steps.find(s => s.id === viewId) || steps[0], progress, total)}
    </div>
    ${isGov ? renderGovWorkflowExtras() : renderVendorWorkflowExtras()}
  `;
}

function renderWorkflowViewBanner(step, progress) {
  if (step.id === progress) return '';
  if (step.id < progress) {
    return `<div class="wf-view-banner wf-view-banner--past">
      <i class="fa-solid fa-pen-to-square"></i>
      <span>Reviewing <strong>Stage ${step.id}</strong> — you can update details here. Your current progress is <strong>Stage ${progress}: ${getWorkflowSteps().find(s => s.id === progress)?.name || ''}</strong>.</span>
      <button type="button" class="btn btn-outline btn-sm" onclick="returnToCurrentWorkflowStep()">Return to current stage</button>
    </div>`;
  }
  return `<div class="wf-view-banner wf-view-banner--future">
    <i class="fa-solid fa-eye"></i>
    <span>Previewing <strong>Stage ${step.id}</strong> — complete Stages 1–${progress} before proceeding to this stage.</span>
    <button type="button" class="btn btn-outline btn-sm" onclick="returnToCurrentWorkflowStep()">Go to current stage</button>
  </div>`;
}

function isVendorStageActionComplete(stageId) {
  const s = vendorStageState;
  switch (stageId) {
    case 1: case 2: case 3: return !!s.completed[stageId];
    case 4: return !!s.bid.submitted;
    case 5: return !!s.award.acknowledged;
    case 6: return !!s.contract.pbgSubmitted && !!s.contract.signed;
    case 7: return !!s.delivery.updated;
    case 8: return !!s.invoice.submitted;
    case 9: return true;
    default: return false;
  }
}

function vendorCanAdvanceFrom(stageId) {
  const progress = getVendorActiveStageId();
  if (stageId < progress) return true;
  if (stageId > progress) return false;
  return isVendorStageActionComplete(stageId);
}

function vendorCanEditStage(stepId, progress) {
  if (stepId > progress) return false;
  if (stepId === 4 && vendorStageState.bid.submitted) return false;
  if (stepId === 8 && vendorStageState.invoice.submitted) return false;
  if (stepId === 7 && vendorStageState.delivery.updated && stepId < progress) return false;
  return true;
}

function renderWorkflowStepNav(step, total) {
  const nextDisabled = step.id >= total || (
    currentRole === 'vendor' && !vendorCanAdvanceFrom(step.id)
  );
  const nextTitle = nextDisabled && currentRole === 'vendor' && step.id < total
    ? 'Complete the required actions on this stage before moving ahead'
    : '';
  return `<div class="wf-step-nav">
    <button type="button" class="btn btn-outline" onclick="goWorkflowStep(-1)" ${step.id <= 1 ? 'disabled' : ''}>
      <i class="fa-solid fa-arrow-left"></i> Previous Stage
    </button>
    <span class="wf-step-indicator">Stage ${step.id} of ${total}</span>
    <button type="button" class="btn btn-outline" onclick="goWorkflowStep(1)" ${nextDisabled ? 'disabled' : ''} title="${nextTitle}">
      Next Stage <i class="fa-solid fa-arrow-right"></i>
    </button>
  </div>`;
}

function renderWorkflowChecklist(step) {
  // Stage 1 gov: checklist replaced by API-populated Need Identification panel
  if (currentRole === 'gov' && step.id === 1) return '';
  const checklist = currentRole === 'gov'
    ? GOV_STAGE_CHECKLIST[step.id]
    : VENDOR_STAGE_CHECKLIST[step.id];
  if (!checklist) return '';
  return `<div class="wf-checklist">
    <h4><i class="fa-solid fa-list-check"></i> Stage Checklist</h4>
    <ul>${checklist.map(item => `<li>${item}</li>`).join('')}</ul>
  </div>`;
}

/** Simulated API fetch for Need Identification (Stage 1) */
function getNeedIdentificationData() {
  const base = typeof NEED_IDENTIFICATION_API !== 'undefined' ? NEED_IDENTIFICATION_API : null;
  if (!base) return null;
  // Light category-aware note for prototype; payload shape stays API-like
  const cat = currentCategory;
  return {
    ...base,
    meta: {
      ...base.meta,
      categoryFilter: cat,
      displayNote: cat === 'All'
        ? 'Showing consolidated requirements across all categories'
        : `Filtered view emphasis: ${cat} formulary & related SKUs`
    }
  };
}

function needStatusBadge(status) {
  const map = {
    Adequate: 'success',
    Low: 'warning',
    Critical: 'danger',
    Attention: 'warning',
    Elevated: 'warning',
    High: 'danger',
    Medium: 'info',
    Synced: 'success',
    'Action Required': 'warning'
  };
  return map[status] || 'info';
}

function renderNeedIdentificationStage(canEdit = true) {
  const data = getNeedIdentificationData();
  if (!data) {
    return `<div class="need-api-empty"><i class="fa-solid fa-plug-circle-xmark"></i><p>Need Identification API unavailable. Configure integration endpoint to auto-populate this stage.</p></div>`;
  }
  const { meta, stockLevels, patientLoad, diseaseBurden, gapAnalysis } = data;
  const disabled = canEdit ? '' : ' disabled';
  const blocks = [
    { key: 'stock', icon: 'fa-boxes-stacked', color: 'blue', data: stockLevels,
      metrics: [
        { label: 'Fill rate', value: stockLevels.overallFillRate },
        { label: 'Critical SKUs', value: stockLevels.criticalSkus },
        { label: 'Below reorder', value: stockLevels.belowReorder },
        { label: 'Days of cover', value: stockLevels.daysOfCover }
      ] },
    { key: 'patient', icon: 'fa-user-injured', color: 'teal', data: patientLoad,
      metrics: [
        { label: 'OPD / month', value: patientLoad.opdMonthly },
        { label: 'IPD occupancy', value: patientLoad.ipdOccupancy },
        { label: 'YoY growth', value: patientLoad.growthYoY },
        { label: 'High-load sites', value: patientLoad.highLoadFacilities }
      ] },
    { key: 'disease', icon: 'fa-virus', color: 'orange', data: diseaseBurden,
      metrics: [
        { label: 'Top conditions', value: diseaseBurden.topConditions },
        { label: 'Seasonal alert', value: diseaseBurden.seasonalAlert },
        { label: 'Programme SKUs', value: diseaseBurden.programmeSkus },
        { label: 'Risk score', value: diseaseBurden.riskScore }
      ] },
    { key: 'gap', icon: 'fa-chart-gantt', color: 'red', data: gapAnalysis,
      metrics: [
        { label: 'Net gap value', value: gapAnalysis.netGapValue },
        { label: 'Line items', value: gapAnalysis.lineItems },
        { label: 'Fulfill from stock', value: gapAnalysis.fulfillFromStock },
        { label: 'Fresh procurement', value: gapAnalysis.freshProcurement }
      ] }
  ];

  return `<div class="need-api">
    <div class="need-api-banner">
      <div class="need-api-banner-icon"><i class="fa-solid fa-cloud-arrow-down"></i></div>
      <div class="need-api-banner-text">
        <strong>Auto-populated via API integration</strong>
        <p>Data synced from <strong>${meta.source}</strong> · Endpoint <code>${meta.endpoint}</code> · Last synced <strong>${meta.lastSynced}</strong></p>
        <p class="need-api-meta-line">${meta.district} · ${meta.facilities} facilities · Period ${meta.assessmentPeriod} · ${meta.displayNote}</p>
      </div>
      <div class="need-api-banner-actions">
        <span class="badge badge-${needStatusBadge(meta.status)}"><i class="fa-solid fa-check-double"></i> ${meta.status}</span>
        <button type="button" class="btn btn-outline btn-sm" onclick="refreshNeedIdentificationApi()"${disabled}>
          <i class="fa-solid fa-arrows-rotate"></i> Refresh API
        </button>
      </div>
    </div>

    <div class="need-metric-grid">
      ${blocks.map(b => `
        <button type="button" class="need-metric-card need-metric-card--${b.color}" onclick="scrollToNeedSection('${b.key}')">
          <div class="need-metric-head">
            <span class="need-metric-icon"><i class="fa-solid ${b.icon}"></i></span>
            <span class="badge badge-${needStatusBadge(b.data.status)}">${b.data.status}</span>
          </div>
          <h4>${b.data.label}</h4>
          <p>${b.data.summary}</p>
          <div class="need-metric-stats">
            ${b.metrics.map(m => `<div><span>${m.label}</span><strong>${m.value}</strong></div>`).join('')}
          </div>
        </button>`).join('')}
    </div>

    <div class="need-section" id="need-sec-stock">
      <div class="need-section-head">
        <h4><i class="fa-solid fa-boxes-stacked"></i> ${stockLevels.label}</h4>
        <span class="meta-chip">Facility stock vs reorder point</span>
      </div>
      <div class="data-table-wrap need-table">
        <table class="data-table">
          <thead><tr><th>Facility</th><th>SKU / Item</th><th>On hand</th><th>Reorder point</th><th>Cover (days)</th><th>Status</th></tr></thead>
          <tbody>
            ${stockLevels.rows.map(r => `<tr>
              <td><strong>${r.facility}</strong></td><td>${r.sku}</td>
              <td>${r.onHand.toLocaleString('en-IN')}</td><td>${r.reorder.toLocaleString('en-IN')}</td>
              <td>${r.coverDays}</td>
              <td><span class="badge badge-${needStatusBadge(r.status)}">${r.status}</span></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="need-section" id="need-sec-patient">
      <div class="need-section-head">
        <h4><i class="fa-solid fa-user-injured"></i> ${patientLoad.label}</h4>
        <span class="meta-chip">OPD / IPD load by facility</span>
      </div>
      <div class="data-table-wrap need-table">
        <table class="data-table">
          <thead><tr><th>Facility</th><th>Type</th><th>OPD (month)</th><th>IPD bed occ.</th><th>Trend</th></tr></thead>
          <tbody>
            ${patientLoad.rows.map(r => `<tr>
              <td><strong>${r.facility}</strong></td><td>${r.category}</td>
              <td>${r.opd.toLocaleString('en-IN')}</td><td>${r.ipdBedOcc}</td><td>${r.trend}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="need-section" id="need-sec-disease">
      <div class="need-section-head">
        <h4><i class="fa-solid fa-virus"></i> ${diseaseBurden.label}</h4>
        <span class="meta-chip">Programme-driven demand signals</span>
      </div>
      <div class="data-table-wrap need-table">
        <table class="data-table">
          <thead><tr><th>Condition / Programme</th><th>Cases</th><th>Trend</th><th>SKU focus</th><th>Priority</th></tr></thead>
          <tbody>
            ${diseaseBurden.rows.map(r => `<tr>
              <td><strong>${r.condition}</strong></td><td>${r.cases}</td><td>${r.trend}</td>
              <td>${r.skuFocus}</td>
              <td><span class="badge badge-${needStatusBadge(r.priority)}">${r.priority}</span></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="need-section" id="need-sec-gap">
      <div class="need-section-head">
        <h4><i class="fa-solid fa-chart-gantt"></i> ${gapAnalysis.label}</h4>
        <span class="meta-chip">Net requirement after stock &amp; open PO · Est. savings ${gapAnalysis.estimatedSavings}</span>
      </div>
      <div class="data-table-wrap need-table">
        <table class="data-table">
          <thead><tr><th>Item</th><th>Required</th><th>Available</th><th>Open PO</th><th>Gap</th><th>Recommended action</th></tr></thead>
          <tbody>
            ${gapAnalysis.rows.map(r => `<tr>
              <td><strong>${r.item}</strong></td><td>${r.required}</td><td>${r.available}</td>
              <td>${r.openPo}</td><td><strong>${r.gap}</strong></td><td>${r.action}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="wf-actions mt-2">
      <button class="btn btn-primary" onclick="saveWorkflowStage(1)"${disabled}>Confirm Need Assessment</button>
      <button class="btn btn-outline" onclick="refreshNeedIdentificationApi()"${disabled}><i class="fa-solid fa-arrows-rotate"></i> Re-sync from API</button>
      <button class="btn btn-outline" onclick="openLifecycleGuideModal(1)">Stage 1 Guide</button>
      <button class="btn btn-outline" onclick="openAuditTrailModal()">Audit Trail</button>
    </div>
  </div>`;
}

function scrollToNeedSection(key) {
  document.getElementById(`need-sec-${key}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function refreshNeedIdentificationApi() {
  const btn = document.querySelector('.need-api-banner-actions .btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Syncing…';
  }
  // Prototype: simulate network latency then refresh panel with updated timestamp
  setTimeout(() => {
    if (typeof NEED_IDENTIFICATION_API !== 'undefined') {
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      NEED_IDENTIFICATION_API.meta.lastSynced =
        `${pad(now.getDate())}-${pad(now.getMonth() + 1)}-${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())} IST`;
      NEED_IDENTIFICATION_API.meta.status = 'Synced';
    }
    refreshWorkflowUI();
    openModal('Need Identification API', `
      <div class="kpi-detail">
        <div class="tender-detail-stats tender-detail-stats--3">
          <div class="tender-stat"><span>Source</span><strong>DHIS2 + e-Aushadhi</strong></div>
          <div class="tender-stat"><span>Status</span><strong>200 OK</strong></div>
          <div class="tender-stat"><span>Records</span><strong>4 domains</strong></div>
        </div>
        <p class="report-footnote"><i class="fa-solid fa-circle-check"></i> Stock levels, patient load, disease burden, and gap analysis refreshed successfully.</p>
      </div>
    `);
  }, 650);
}

function renderWorkflowDetailPanel(step, progress, total) {
  const canEdit = currentRole === 'vendor'
    ? vendorCanEditStage(step.id, progress)
    : step.id <= progress;
  return `
    ${renderWorkflowViewBanner(step, progress)}
    <div class="wf-detail-header">
      <div>
        <span class="wf-stage-badge">Stage ${step.id}</span>
        <h3>${step.name}</h3>
        <p>${step.desc}</p>
      </div>
      <span class="badge badge-${step.id < progress ? 'success' : step.id === progress ? 'info' : 'muted'}">${step.id < progress ? 'Completed' : step.id === progress ? 'In Progress' : 'Upcoming'}</span>
    </div>
    ${renderWorkflowChecklist(step)}
    ${renderWorkflowDetail(step, canEdit)}
    ${renderWorkflowStepNav(step, total)}
  `;
}

function renderWorkflowDetail(step, canEdit = true) {
  const catNote = currentCategory !== 'All' ? ` — ${currentCategory} category` : '';
  const disabled = canEdit ? '' : ' disabled';
  const readonly = canEdit ? '' : ' readonly';

  if (currentRole === 'gov' && step.id === 1) {
    return renderNeedIdentificationStage(canEdit);
  }

  if (currentRole === 'gov' && step.id === 4) {
    const regs = filterByCategory(VENDOR_REGISTRATIONS);
    return `<div class="form-grid">
      ${customSelectHTML('District', 'district', ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior'], 'Bhopal')}
      ${customSelectHTML('Consolidation Status', 'consolidation', ['Pending Review', 'Verified', 'Approved'], 'Pending Review')}
      <div class="form-group"><label>Items Consolidated${catNote}</label><input type="text" value="${currentCategory === 'All' ? '47 line items across 12 facilities' : regs.length + ' line items for ' + currentCategory}"${readonly}></div>
      <div class="form-group"><label>Estimated Value</label><div class="masked-value">₹ ●●●●●●● (Masked)</div></div>
      <div class="form-group full"><label>Optimization Sources</label>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.5rem;margin-top:0.5rem">
          <div class="info-card" style="padding:0.75rem;text-align:center"><strong>12</strong><br><small>Warehouse Stock</small></div>
          <div class="info-card" style="padding:0.75rem;text-align:center"><strong>8</strong><br><small>Other Locations</small></div>
          <div class="info-card" style="padding:0.75rem;text-align:center"><strong>5</strong><br><small>Open POs</small></div>
          <div class="info-card" style="padding:0.75rem;text-align:center"><strong>3</strong><br><small>Redistributable</small></div>
        </div>
      </div>
    </div>
    <div class="wf-actions mt-2">
      <button class="btn btn-primary"${disabled}>Approve Consolidated Demand</button>
      <button class="btn btn-outline"${disabled}>Request Clarification</button>
      <button class="btn btn-outline" onclick="openWorkflowDocument('consolidation-report')">View Documents</button>
    </div>`;
  }

  if (currentRole === 'vendor' && step.id === 1) {
    const regCategories = getRegistrationCategories();
    const defaultCategory = regCategories.includes('Drugs') ? 'Drugs' : regCategories[0];
    const fieldLock = canEdit ? '' : ' readonly';
    return `<div class="form-grid wf-form-grid">
      <div class="form-group"><label>${reqLabel('Company Name')}</label><input id="wf-reg-company" type="text" placeholder="Enter registered company name" value="MediSupply India Pvt Ltd"${fieldLock}></div>
      ${customSelectHTML('Category', 'regCategory', regCategories, defaultCategory, true)}
      <div class="form-group"><label>${reqLabel('GSTIN')}</label><input id="wf-reg-gstin" type="text" placeholder="e.g. 23AABCM1234A1Z5" value="23AABCM1234A1Z5"${fieldLock}></div>
      <div class="form-group"><label>${reqLabel('PAN')}</label><input id="wf-reg-pan" type="text" placeholder="e.g. AABCM1234A" value="AABCM1234A"${fieldLock}></div>
      <div class="form-group full"><label>${reqLabel('Registered Address')}</label><input id="wf-reg-address" type="text" placeholder="Street, city, state, PIN code" value="Plot 12, Industrial Area, Bhopal, MP - 462001"${fieldLock}></div>
    </div>
    <div class="wf-actions mt-2">
      <button class="btn btn-primary"${disabled} onclick="saveWorkflowStage(1)">Save Registration Details</button>
      <button class="btn btn-outline" onclick="openAuditTrailModal()">Audit Trail</button>
    </div>`;
  }

  if (currentRole === 'vendor' && step.id === 2) {
    const kycDocs = vendorStageState.uploads.kyc;
    const kycDone = kycDocs.length >= 3;
    return `<div class="kyc-form">
      <div class="form-grid wf-form-grid">
        <div class="form-group"><label>${reqLabel('Account Holder Name')}</label><input id="wf-kyc-holder" type="text" value="MediSupply India Pvt Ltd"${readonly}></div>
        <div class="form-group"><label>${reqLabel('Bank Name')}</label><input id="wf-kyc-bank" type="text" value="HDFC Bank"${readonly}></div>
        <div class="form-group"><label>${reqLabel('Account Number')}</label><input id="wf-kyc-acct" type="text" value="****4567"${readonly}></div>
        <div class="form-group"><label>${reqLabel('IFSC Code')}</label><input id="wf-kyc-ifsc" type="text" value="HDFC0001234"${readonly}></div>
        <div class="form-group"><label>${reqLabel('Drug / Trade License No.')}</label><input id="wf-kyc-license" type="text" value="DL-MH-2024-0892"${readonly}></div>
        <div class="form-group"><label>${reqLabel('License Expiry')}</label><input id="wf-kyc-expiry" type="text" value="15-03-2027" placeholder="DD-MM-YYYY"${readonly}></div>
        <div class="form-group"><label>KYC Status</label><span class="badge ${kycDone ? 'badge-success' : 'badge-warning'}">${kycDone ? 'Documents Uploaded' : 'Pending Documents'}</span></div>
        <div class="form-group"><label>Uploaded Documents</label><span class="wf-upload-count">${kycDocs.length ? kycDocs.map(d => d.name).join(', ') : 'None yet'}</span></div>
      </div>
      <div class="wf-doc-hint"><i class="fa-solid fa-circle-info"></i> Industry-standard KYC requires cancelled cheque / bank proof, PAN, address proof, and authorized signatory ID. Upload all mandatory documents below.</div>
      <div class="wf-actions mt-2">
        <button class="btn btn-primary"${disabled} onclick="openKycDocumentForm()">Update KYC Document Form</button>
        <button class="btn btn-outline" onclick="openWorkflowDocument('kyc-checklist')">KYC Checklist (PDF)</button>
      </div>
    </div>`;
  }

  if (currentRole === 'vendor' && step.id === 3) {
    const letter = vendorStageState.uploads.approvalLetter;
    return `<div class="form-grid wf-form-grid">
      <div class="form-group"><label>${reqLabel('Vendor Code')}</label><input type="text" value="VND-MP-000123" readonly></div>
      <div class="form-group"><label>Approval Status</label><span class="badge badge-success">Approved</span></div>
      <div class="form-group"><label>${reqLabel('Approved On')}</label><input type="text" value="28-08-2026" readonly></div>
      <div class="form-group"><label>${reqLabel('Approving Authority')}</label><input type="text" value="Vendor Registry, MP Health" readonly></div>
      <div class="form-group full"><label>${reqLabel('Linked Categories')}</label><input type="text" value="Drugs, Consumables" readonly></div>
      <div class="form-group full"><label>${reqLabel('Approval Letter')}</label>
        <div class="wf-file-status">${letter ? `<i class="fa-solid fa-file-pdf"></i> ${letter.name} <span class="badge badge-success">Uploaded</span>` : '<span class="text-muted">No approval letter uploaded yet</span>'}</div>
      </div>
    </div>
    <div class="wf-actions mt-2">
      <button class="btn btn-outline" onclick="navigateTo('registration')">Open Full Profile</button>
      <button class="btn btn-primary"${disabled} onclick="openApprovalLetterUpload()">Upload Approval Letter</button>
    </div>`;
  }

  if (currentRole === 'vendor' && step.id === 4) {
    const s = vendorStageState;
    const tech = s.uploads.technicalDocs;
    const fin = s.uploads.financialDocs;
    const locked = s.bid.submitted;
    const btnDis = (!canEdit || locked) ? ' disabled' : '';
    const ocr = s.bid.ocrReady;
    return `<div class="wf-stage-note"><i class="fa-solid fa-circle-info"></i>
      <div>Upload technical and financial bid documents. Tender reference and related bid details are extracted via OCR after upload — no manual tender reference entry.</div>
    </div>
    <div class="label-grid">
      <div class="label-item"><span class="label-key">Tender Reference</span><span class="label-val">${ocr && s.bid.tenderId ? s.bid.tenderId : '— Pending OCR'}</span></div>
      <div class="label-item"><span class="label-key">EMD Status</span><span class="label-val">${ocr && s.bid.emdStatus ? `<span class="badge badge-warning">${s.bid.emdStatus}</span>` : '— Pending OCR'}</span></div>
      <div class="label-item"><span class="label-key">Bid Deadline</span><span class="label-val${ocr ? ' text-danger' : ''}">${ocr && s.bid.deadline ? s.bid.deadline : '— Pending OCR'}</span></div>
      <div class="label-item"><span class="label-key">Bid Submission Status</span><span class="label-val"><span class="badge ${locked ? 'badge-success' : 'badge-warning'}">${locked ? 'Submitted — Locked' : 'Draft — Not Submitted'}</span></span></div>
      <div class="label-item"><span class="label-key">${reqLabel('Technical Documents')}</span><span class="label-val">${tech.length ? tech.map(d => d.name).join(', ') : '<span class="text-muted">Not uploaded</span>'}</span></div>
      <div class="label-item"><span class="label-key">${reqLabel('Financial Documents')}</span><span class="label-val">${fin.length ? fin.map(d => d.name).join(', ') : '<span class="text-muted">Not uploaded</span>'}</span></div>
    </div>
    ${locked ? '<div class="wf-lock-banner"><i class="fa-solid fa-lock"></i> Bid submitted successfully. Details are locked and cannot be changed.</div>' : ''}
    <div class="wf-actions mt-2 wf-actions--stacked">
      <div class="wf-actions-row">
        <button class="btn btn-outline"${btnDis} onclick="openTechDocUpload()">Upload Technical Documents</button>
        <button class="btn btn-outline"${btnDis} onclick="openFinDocUpload()">Upload Financial Documents</button>
        <button class="btn btn-outline" onclick="openBidSubmissionGuide()">Bid Submission Guide</button>
      </div>
      <div class="wf-actions-row">
        <button class="btn btn-primary"${btnDis} onclick="submitVendorBid()">Submit Bid</button>
      </div>
    </div>`;
  }

  if (currentRole === 'vendor' && step.id === 5) {
    const a = vendorStageState.award;
    return `<div class="award-table-wrap">
      <table class="data-table award-table">
        <thead>
          <tr><th>Field</th><th>Details</th></tr>
        </thead>
        <tbody>
          <tr><td>Tender Reference</td><td><strong>${a.tenderId}</strong></td></tr>
          <tr><td>Award Title</td><td>${a.title}</td></tr>
          <tr><td>LOA Status</td><td><span class="badge badge-info">${a.loaStatus}</span></td></tr>
          <tr><td>LOA Date</td><td>${a.loaDate}</td></tr>
          <tr><td>PBG Due By</td><td><strong>${a.pbgDue}</strong></td></tr>
          <tr><td>Award Value</td><td><span class="masked-value" title="Sensitive — masked">${maskSensitiveValue(a.value)}</span></td></tr>
          <tr><td>Summary</td><td>Hospital Linen Supply — LOA issued; acknowledge within stipulated period</td></tr>
          <tr><td>Acknowledgement</td><td><span class="badge ${a.acknowledged ? 'badge-success' : 'badge-warning'}">${a.acknowledged ? 'Acknowledged' : 'Pending Acknowledgement'}</span></td></tr>
        </tbody>
      </table>
    </div>
    <div class="wf-actions mt-2">
      <button class="btn btn-primary"${disabled || a.acknowledged ? ' disabled' : ''} onclick="acknowledgeLoa()">${a.acknowledged ? 'LOA Acknowledged' : 'Acknowledge LOA'}</button>
      <button class="btn btn-outline" onclick="navigateTo('contracts')">View Award Details</button>
    </div>`;
  }

  if (currentRole === 'vendor' && step.id === 6) {
    const c = vendorStageState.contract;
    const uploadDis = !canEdit;
    const pbgReady = !!c.pbgSubmitted;
    const signedReady = !!c.signed;
    return `<div class="wf-stage-note"><i class="fa-solid fa-circle-info"></i>
      <div>Upload PBG and signed contract documents. All fields below are read-only labels — values appear automatically after OCR extracts them from your uploads.</div>
    </div>
    <div class="ocr-panel">
      <div class="ocr-panel-head">
        <h4><i class="fa-solid fa-file-contract"></i> Contract &amp; PBG Details</h4>
        <span class="badge ${signedReady ? 'badge-success' : pbgReady ? 'badge-info' : 'badge-muted'}">${signedReady ? 'OCR Complete' : pbgReady ? 'PBG Extracted' : 'Awaiting Upload'}</span>
      </div>
      <div class="label-grid">
        ${ocrLabel('Contract ID', c.id)}
        ${ocrLabel('PBG Status', c.pbgStatus ? `<span class="badge ${pbgReady ? 'badge-success' : 'badge-warning'}">${c.pbgStatus}</span>` : '', { html: true })}
        ${ocrLabel('PBG Amount', c.pbgAmount)}
        ${ocrLabel('Issuing Bank', c.bank)}
        ${ocrLabel('BG / SFMS Reference', c.bgRef)}
        ${ocrLabel('Valid Until', c.validUntil)}
        ${ocrLabel('Contract Status', c.contractStatus ? `<span class="badge ${signedReady ? 'badge-success' : 'badge-info'}">${c.contractStatus}</span>` : '', { html: true })}
        ${ocrLabel('PBG Document', vendorStageState.uploads.pbg?.name || '')}
        ${ocrLabel('Signed Contract Document', c.contractOcr?.fileName || '')}
      </div>
    </div>
    <div class="inline-upload-grid mt-2">
      ${renderInlineUpload({
        id: 'wfInlinePbg',
        title: '1. Submit PBG Document',
        hint: 'PDF / JPG · Max 10 MB — fills Contract ID, PBG Amount, Bank, BG Ref, Valid Until',
        disabled: uploadDis || c.pbgSubmitted,
        fileName: vendorStageState.uploads.pbg?.name,
        onChange: 'handlePbgInlineUpload'
      })}
      ${renderInlineUpload({
        id: 'wfInlineContract',
        title: '2. Sign Contract (upload signed copy)',
        hint: 'PDF / JPG · Max 10 MB — updates Contract Status after PBG OCR',
        disabled: uploadDis || !c.pbgSubmitted || c.signed,
        fileName: c.contractOcr?.fileName,
        onChange: 'handleContractInlineUpload'
      })}
    </div>
    ${!canEdit ? '<div class="wf-inline-alert wf-inline-alert--info mt-2"><i class="fa-solid fa-lock"></i><div><p>Complete Award Notification (Stage 5) to unlock contract uploads.</p></div></div>' : ''}`;
  }

  if (currentRole === 'vendor' && step.id === 7) {
    const d = vendorStageState.delivery;
    const uploadDis = !canEdit || d.updated;
    return `<div class="wf-stage-note"><i class="fa-solid fa-circle-info"></i>
      <div>Upload the delivery status document. Labels below stay visible at all times; OCR fills the values. Cold Chain Required remains selectable before and after upload.</div>
    </div>
    <div class="ocr-panel">
      <div class="ocr-panel-head">
        <h4><i class="fa-solid fa-truck"></i> Delivery Details</h4>
        <span class="badge ${d.updated ? 'badge-success' : d.ocrReady ? 'badge-info' : 'badge-muted'}">${d.updated ? 'Saved' : d.ocrReady ? 'OCR Ready — Review &amp; Save' : 'Awaiting Upload'}</span>
      </div>
      <div class="label-grid">
        ${ocrLabel('Delivery Challan No.', d.challan)}
        ${ocrLabel('Dispatch Status', d.status ? `<span class="badge badge-info">${d.status}</span>` : '', { html: true })}
        ${ocrLabel('Vehicle / LR No.', d.vehicle)}
        ${ocrLabel('Dispatch Date', d.dispatchDate)}
        ${ocrLabel('Expected Delivery Date', d.expectedDate)}
        ${ocrLabel('Remarks', d.remarks)}
        ${ocrLabel('Uploaded Document', d.fileName || '')}
      </div>
      <div class="ocr-panel-control">
        ${customSelectHTML('Cold Chain Required', 'delColdChain', ['No', 'Yes'], d.coldChain || 'No', true)}
      </div>
    </div>
    <div class="mt-2">
      ${renderInlineUpload({
        id: 'wfInlineDelivery',
        title: 'Upload Delivery Status Document',
        hint: 'Delivery challan / dispatch note · PDF / JPG — fills all delivery labels above via OCR',
        disabled: uploadDis,
        fileName: d.fileName,
        onChange: 'handleDeliveryInlineUpload'
      })}
    </div>
    ${!canEdit ? '<div class="wf-inline-alert wf-inline-alert--info mt-2"><i class="fa-solid fa-lock"></i><div><p>Complete Bid Submission through Contract Execution (Stages 4–6) to unlock delivery updates.</p></div></div>' : ''}
    <div class="wf-actions mt-2">
      <button class="btn btn-primary"${!canEdit || !d.ocrReady || d.updated ? ' disabled' : ''} onclick="saveDeliveryOcr()">Save Delivery Details</button>
      <button class="btn btn-outline" onclick="navigateTo('delivery')">Open Delivery &amp; Invoices</button>
    </div>`;
  }

  if (currentRole === 'vendor' && step.id === 8) {
    const inv = vendorStageState.invoice;
    const uploadDis = !canEdit || inv.submitted;
    return `<div class="wf-stage-note"><i class="fa-solid fa-circle-info"></i>
      <div>Attach delivery proof. Invoice labels below are always shown; OCR fills Invoice Number, GRN, Amount, and Status from the uploaded document.</div>
    </div>
    <div class="ocr-panel">
      <div class="ocr-panel-head">
        <h4><i class="fa-solid fa-file-invoice"></i> Invoice Details</h4>
        <span class="badge ${inv.submitted ? 'badge-success' : inv.ocrReady ? 'badge-info' : 'badge-muted'}">${inv.submitted ? 'Submitted' : inv.ocrReady ? 'OCR Ready — Review &amp; Save' : 'Awaiting Upload'}</span>
      </div>
      <div class="label-grid">
        ${ocrLabel('Invoice Number', inv.number)}
        ${ocrLabel('GRN Reference', inv.grn)}
        ${ocrLabel('Invoice Amount (₹)', inv.amount)}
        ${ocrLabel('Invoice Status', inv.status ? `<span class="badge ${inv.submitted ? 'badge-success' : 'badge-info'}">${inv.status}</span>` : '', { html: true })}
        ${ocrLabel('Delivery Proof Document', inv.fileName || vendorStageState.uploads.deliveryProof?.name || '')}
      </div>
    </div>
    <div class="mt-2">
      ${renderInlineUpload({
        id: 'wfInlineInvoiceProof',
        title: 'Attach Delivery Proof',
        hint: 'Signed challan / GRN / acceptance proof · PDF / JPG — fills all invoice labels above via OCR',
        disabled: uploadDis,
        fileName: inv.fileName || vendorStageState.uploads.deliveryProof?.name,
        onChange: 'handleInvoiceProofInlineUpload'
      })}
    </div>
    ${!canEdit ? '<div class="wf-inline-alert wf-inline-alert--info mt-2"><i class="fa-solid fa-lock"></i><div><p>Complete earlier stages (especially Delivery) before submitting an invoice.</p></div></div>' : ''}
    <div class="wf-actions mt-2">
      <button class="btn btn-primary"${!canEdit || !inv.ocrReady || inv.submitted ? ' disabled' : ''} onclick="saveInvoiceOcr()">Save Invoice Details</button>
    </div>`;
  }

  if (currentRole === 'vendor' && step.id === 9) {
    const p = vendorStageState.payment;
    const invDone = vendorStageState.invoice.submitted;
    if (invDone) {
      p.milestones[0].done = true;
      p.status = p.status === 'Awaiting Processing' ? 'Under Verification' : p.status;
      p.lastUpdate = p.lastUpdate === '—' ? formatDateDMY(APP_TODAY) : p.lastUpdate;
    }
    return `<div class="payment-track">
      <div class="payment-track-header">
        <div>
          <h4>Payment Progress</h4>
          <p>Monitor invoice-to-payment status for your awarded supplies</p>
        </div>
        <span class="badge badge-info">${p.status}</span>
      </div>
      <div class="payment-summary-grid">
        <div class="payment-summary-card">
          <span class="payment-summary-label">Bank Account</span>
          <strong>${p.bank}</strong>
        </div>
        <div class="payment-summary-card">
          <span class="payment-summary-label">Expected Timeline</span>
          <strong>${p.timeline}</strong>
        </div>
        <div class="payment-summary-card">
          <span class="payment-summary-label">Invoice</span>
          <strong>${vendorStageState.invoice.number || '—'}</strong>
        </div>
        <div class="payment-summary-card">
          <span class="payment-summary-label">Last Update</span>
          <strong>${p.lastUpdate}</strong>
        </div>
      </div>
      <ol class="payment-timeline">
        ${p.milestones.map((m, i) => `<li class="${m.done ? 'done' : i === p.milestones.findIndex(x => !x.done) ? 'current' : ''}">
          <span class="payment-tl-dot">${m.done ? '<i class="fa-solid fa-check"></i>' : (i + 1)}</span>
          <span class="payment-tl-label">${m.label}</span>
        </li>`).join('')}
      </ol>
      <div class="wf-actions mt-2">
        <button class="btn btn-outline" onclick="refreshPaymentStatus()">Refresh Payment Status</button>
      </div>
    </div>`;
  }

  const stageActions = canEdit
    ? `<button class="btn btn-primary" onclick="saveWorkflowStage(${step.id})">Save Stage Details</button>`
    : '';
  return `<div class="wf-actions">
    ${stageActions}
    <button class="btn btn-outline" onclick="openLifecycleGuideModal(${step.id})">Stage ${step.id} Guide</button>
    <button class="btn btn-outline" onclick="openAuditTrailModal()">Audit Trail</button>
    <button class="btn btn-outline" onclick="openLifecycleGuideModal()"><i class="fa-solid fa-book"></i> Full Lifecycle Guide</button>
  </div>`;
}

function completeVendorStage(id) {
  vendorStageState.completed[id] = true;
  syncVendorWorkflowStatuses();
}

function validateVendorStageFields(stageId) {
  if (stageId === 1) {
    const company = document.getElementById('wf-reg-company')?.value?.trim();
    const gstin = document.getElementById('wf-reg-gstin')?.value?.trim();
    const pan = document.getElementById('wf-reg-pan')?.value?.trim();
    const address = document.getElementById('wf-reg-address')?.value?.trim();
    const category = typeof getCustomSelectValue === 'function' ? getCustomSelectValue('regCategory') : 'Drugs';
    if (!company || !gstin || !pan || !address || !category) {
      return 'Please fill all mandatory fields marked with * (Company Name, Category, GSTIN, PAN, and Registered Address) before proceeding.';
    }
  }
  if (stageId === 2) {
    if (vendorStageState.uploads.kyc.length < 3) {
      return 'Please complete the KYC Document Form and upload all mandatory documents (bank proof, ID proof, and license) before proceeding to the next stage.';
    }
  }
  if (stageId === 3) {
    if (!vendorStageState.uploads.approvalLetter) {
      return 'Please upload the Approval Letter using “Upload Approval Letter” before moving to Bid Submission.';
    }
  }
  if (stageId === 4) {
    if (!vendorStageState.bid.submitted) {
      return 'Submit your bid first. Upload Technical and Financial documents, then click Submit Bid. Next Stage unlocks only after a successful bid submission.';
    }
  }
  if (stageId === 5) {
    if (!vendorStageState.award.acknowledged) {
      return 'Acknowledge the Letter of Award (LOA) before proceeding to Contract Execution.';
    }
  }
  if (stageId === 6) {
    if (!vendorStageState.contract.pbgSubmitted) {
      return 'Upload the PBG document in the inline upload section. OCR must extract PBG details before you can continue.';
    }
    if (!vendorStageState.contract.signed) {
      return 'Upload the signed contract document. Both PBG and signed contract must be processed via OCR before Delivery.';
    }
  }
  if (stageId === 7) {
    if (!vendorStageState.delivery.updated) {
      return 'Upload the Delivery Status document, review OCR details, set Cold Chain Required, then click Save Delivery Details to unlock the next stage.';
    }
  }
  if (stageId === 8) {
    if (!vendorStageState.invoice.submitted) {
      return 'Attach Delivery Proof, review OCR invoice details, then click Save Invoice Details to open Payment Tracking.';
    }
  }
  return null;
}

function saveWorkflowStage(id) {
  if (currentRole === 'vendor') {
    if (id === 1) {
      const msg = validateVendorStageFields(1);
      if (msg) { showWfAlert(msg); return; }
      completeVendorStage(1);
    }
    if (id === 2 && vendorStageState.uploads.kyc.length >= 3) completeVendorStage(2);
    openDrillDown('workflow', `Stage ${id} Saved`, `Your changes for Stage ${id}: ${getWorkflowSteps().find(s => s.id === id)?.name || ''} have been saved.`);
    refreshWorkflowUI();
    return;
  }
  openDrillDown('workflow', `Stage ${id} Saved`, `Your changes for Stage ${id}: ${getWorkflowSteps().find(s => s.id === id)?.name || ''} have been saved. You can return to any previous stage at any time to update details before final submission.`);
}

function renderUploadModalBody({ lead, acceptNote, inputId, requiredDocs }) {
  const docs = requiredDocs?.length
    ? `<ul class="upload-req-list">${requiredDocs.map(d => `<li><i class="fa-solid fa-file-circle-check"></i> ${d}</li>`).join('')}</ul>`
    : '';
  return `<div class="upload-modal">
    <p class="upload-modal-lead">${lead}</p>
    ${docs}
    <div class="upload-dropzone" onclick="document.getElementById('${inputId}').click()">
      <i class="fa-solid fa-cloud-arrow-up"></i>
      <strong>Click to select file(s)</strong>
      <span>${acceptNote || 'PDF, JPG, PNG · Max 10 MB each'}</span>
      <input type="file" id="${inputId}" class="upload-file-input" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" multiple />
    </div>
    <div id="${inputId}-list" class="upload-file-list"></div>
    <div class="upload-modal-actions">
      <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button type="button" class="btn btn-primary" id="${inputId}-confirm">Confirm Upload</button>
    </div>
  </div>`;
}

function renderInlineUpload({ id, title, hint, disabled, fileName, onChange }) {
  return `<div class="inline-upload${disabled ? ' is-disabled' : ''}">
    <div class="inline-upload-head">
      <strong>${title}</strong>
      ${fileName ? `<span class="badge badge-success"><i class="fa-solid fa-check"></i> ${fileName}</span>` : '<span class="badge badge-muted">No file</span>'}
    </div>
    <label class="inline-upload-zone" for="${id}">
      <i class="fa-solid fa-cloud-arrow-up"></i>
      <span class="inline-upload-title">${fileName ? 'Replace file' : 'Click to upload'}</span>
      <span class="inline-upload-hint">${hint}</span>
      <input type="file" id="${id}" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" ${disabled ? 'disabled' : ''} onchange="${onChange}(this)" />
    </label>
  </div>`;
}

/** Always-visible OCR field label (empty until document upload fills value) */
function ocrLabel(label, value, opts = {}) {
  const hasValue = value !== null && value !== undefined && String(value).trim() !== '';
  const display = hasValue
    ? (opts.html ? value : value)
    : '<span class="ocr-pending">Awaiting OCR</span>';
  return `<div class="label-item${hasValue ? ' is-filled' : ' is-pending'}">
    <span class="label-key">${label}</span>
    <span class="label-val">${display}</span>
  </div>`;
}

function simulateOcrDelay(cb) {
  setTimeout(() => {
    cb();
    refreshWorkflowUI();
  }, 350);
}

function bindUploadModal(inputId, onConfirm) {
  const input = document.getElementById(inputId);
  const list = document.getElementById(`${inputId}-list`);
  const confirmBtn = document.getElementById(`${inputId}-confirm`);
  if (!input || !confirmBtn) return;

  const refreshList = () => {
    const files = Array.from(input.files || []);
    list.innerHTML = files.length
      ? files.map(f => `<div class="upload-file-item"><i class="fa-solid fa-file"></i> ${f.name} <span>(${Math.max(1, Math.round(f.size / 1024))} KB)</span></div>`).join('')
      : '<p class="text-muted">No files selected yet.</p>';
  };

  input.addEventListener('change', refreshList);
  refreshList();

  confirmBtn.onclick = () => {
    const files = Array.from(input.files || []);
    if (!files.length) {
      showWfAlert('Please select at least one file to upload.');
      return;
    }
    const mapped = files.map(f => ({ name: f.name, size: f.size }));
    closeModal();
    onConfirm(mapped);
    refreshWorkflowUI();
  };
}

function openKycDocumentForm() {
  openModal('KYC Document Form', renderUploadModalBody({
    lead: 'Upload mandatory KYC documents as per vendor onboarding standards. All three categories below are required.',
    acceptNote: 'PDF preferred · Max 10 MB per file',
    inputId: 'wfUploadKyc',
    requiredDocs: [
      'Cancelled cheque / bank account proof',
      'PAN card of entity / authorized signatory',
      'Address proof & authorized signatory photo ID',
      'Drug / trade license (category-specific)'
    ]
  }), { wide: true });
  bindUploadModal('wfUploadKyc', (files) => {
    vendorStageState.uploads.kyc = files;
    if (files.length >= 3) completeVendorStage(2);
    showWfAlert(`${files.length} KYC document(s) uploaded successfully.`, 'success');
  });
}

function openApprovalLetterUpload() {
  openModal('Upload Approval Letter', renderUploadModalBody({
    lead: 'Upload the vendor approval / code assignment letter issued by the department.',
    acceptNote: 'PDF only preferred · Max 10 MB',
    inputId: 'wfUploadApproval',
    requiredDocs: ['Signed Vendor Approval / Code Assignment Letter']
  }), { wide: true });
  const input = document.getElementById('wfUploadApproval');
  if (input) input.removeAttribute('multiple');
  bindUploadModal('wfUploadApproval', (files) => {
    vendorStageState.uploads.approvalLetter = files[0];
    completeVendorStage(3);
    showWfAlert('Approval letter uploaded successfully.', 'success');
  });
}

function openTechDocUpload() {
  if (vendorStageState.bid.submitted) {
    showWfAlert('Bid is already submitted and locked. Technical documents cannot be changed.');
    return;
  }
  openModal('Upload Technical Documents', renderUploadModalBody({
    lead: `Upload technical bid documents for ${vendorStageState.bid.tenderId} as mandated in the RFP.`,
    inputId: 'wfUploadTech',
    requiredDocs: [
      'Technical compliance sheet / bid form',
      'Product specifications & catalogues',
      'Quality certifications (ISO / CDSCO / BIS as applicable)',
      'Past performance / experience certificates'
    ]
  }), { wide: true });
  bindUploadModal('wfUploadTech', (files) => {
    vendorStageState.uploads.technicalDocs = files;
    applyBidOcrFromUploads();
    showWfAlert('Technical documents uploaded. OCR fields update when both packs are present.', 'success');
  });
}

function openFinDocUpload() {
  if (vendorStageState.bid.submitted) {
    showWfAlert('Bid is already submitted and locked. Financial documents cannot be changed.');
    return;
  }
  openModal('Upload Financial Documents', renderUploadModalBody({
    lead: `Upload financial / commercial bid documents. Tender reference and EMD details are extracted via OCR.`,
    inputId: 'wfUploadFin',
    requiredDocs: [
      'Price bid / BoQ (as per RFP format)',
      'EMD / Bid security instrument proof',
      'Turnover / audited financial statements (if required)',
      'GST / tax declarations'
    ]
  }), { wide: true });
  bindUploadModal('wfUploadFin', (files) => {
    vendorStageState.uploads.financialDocs = files;
    applyBidOcrFromUploads();
    showWfAlert('Financial documents uploaded. OCR fields update when both packs are present.', 'success');
  });
}

function applyBidOcrFromUploads() {
  const tech = vendorStageState.uploads.technicalDocs;
  const fin = vendorStageState.uploads.financialDocs;
  if (!tech.length && !fin.length) return;
  vendorStageState.bid.ocrReady = true;
  vendorStageState.bid.tenderId = 'TND-2026-MP-0055';
  vendorStageState.bid.emdStatus = 'Pending - ₹3,20,000';
  vendorStageState.bid.deadline = '05-09-2026 17:00 IST';
}

function openBidSubmissionGuide() {
  openModal('Bid Submission Guide — RFP Mandatory Documents', `
    <div class="doc-modal">
      <p class="doc-modal-lead">Mandatory technical and financial documents for the active tender as circulated in the RFP by the procuring agency. Tender reference is filled via OCR after you upload documents.</p>
      <h4 class="upload-section-title">Technical Bid (mandatory)</h4>
      <ul class="doc-checklist">
        <li><i class="fa-solid fa-check"></i> Signed technical bid form &amp; compliance matrix</li>
        <li><i class="fa-solid fa-check"></i> Product specifications matching tender schedule</li>
        <li><i class="fa-solid fa-check"></i> Valid manufacturing / import / drug license</li>
        <li><i class="fa-solid fa-check"></i> Quality certificates &amp; test reports (as listed in RFP)</li>
        <li><i class="fa-solid fa-check"></i> Experience / past supply certificates</li>
      </ul>
      <h4 class="upload-section-title">Financial Bid (mandatory)</h4>
      <ul class="doc-checklist">
        <li><i class="fa-solid fa-check"></i> Price schedule / BoQ in prescribed format</li>
        <li><i class="fa-solid fa-check"></i> EMD / bid security (₹3,20,000 for this tender)</li>
        <li><i class="fa-solid fa-check"></i> Commercial terms acceptance letter</li>
        <li><i class="fa-solid fa-check"></i> GSTIN &amp; PAN declarations</li>
      </ul>
      <div class="resource-note mt-2"><i class="fa-solid fa-triangle-exclamation"></i> Incomplete technical or financial packs may lead to bid rejection. Upload both packs, then submit the bid before the deadline.</div>
    </div>
  `, { wide: true });
}

function submitVendorBid() {
  if (vendorStageState.bid.submitted) {
    showWfAlert('Bid is already submitted and locked.');
    return;
  }
  if (!vendorStageState.uploads.technicalDocs.length) {
    showWfAlert('Upload Technical Documents before submitting the bid. See Bid Submission Guide for the RFP checklist.');
    return;
  }
  if (!vendorStageState.uploads.financialDocs.length) {
    showWfAlert('Upload Financial Documents before submitting the bid. See Bid Submission Guide for the RFP checklist.');
    return;
  }
  vendorStageState.bid.submitted = true;
  vendorStageState.locked[4] = true;
  applyBidOcrFromUploads();
  completeVendorStage(4);
  showWfAlert('Bid submitted successfully. Bid details are now locked. You may proceed to the next stage.', 'success');
  refreshWorkflowUI();
}

function acknowledgeLoa() {
  vendorStageState.award.acknowledged = true;
  vendorStageState.contract.pbgStatus = '';
  vendorStageState.contract.contractStatus = '';
  completeVendorStage(5);
  showWfAlert('LOA acknowledged. Proceed to Contract Execution and upload PBG + signed contract documents.', 'success');
  refreshWorkflowUI();
}

function handlePbgInlineUpload(input) {
  const file = input?.files?.[0];
  if (!file) return;
  simulateOcrDelay(() => {
    vendorStageState.uploads.pbg = { name: file.name, size: file.size };
    vendorStageState.contract.pbgSubmitted = true;
    vendorStageState.contract.id = 'CNT-2026-0089';
    vendorStageState.contract.pbgAmount = '₹4,25,000 (5%)';
    vendorStageState.contract.bank = 'HDFC Bank';
    vendorStageState.contract.bgRef = 'BG-HDFC-2026-8891';
    vendorStageState.contract.validUntil = '28-08-2027';
    vendorStageState.contract.pbgStatus = 'Submitted — Under Verification';
    vendorStageState.contract.contractStatus = 'Ready for Signed Contract Upload';
    vendorStageState.contract.pbgOcr = { fileName: file.name };
    showWfAlert('PBG document processed via OCR. Review extracted details, then upload the signed contract.', 'success');
  });
}

function handleContractInlineUpload(input) {
  const file = input?.files?.[0];
  if (!file) return;
  if (!vendorStageState.contract.pbgSubmitted) {
    showWfAlert('Upload and process the PBG document first.');
    return;
  }
  simulateOcrDelay(() => {
    vendorStageState.contract.signed = true;
    vendorStageState.contract.contractStatus = 'Executed';
    vendorStageState.contract.contractOcr = { fileName: file.name };
    completeVendorStage(6);
    showWfAlert('Signed contract processed via OCR. You may proceed to Delivery.', 'success');
  });
}

function handleDeliveryInlineUpload(input) {
  const file = input?.files?.[0];
  if (!file) return;
  const cold = typeof getCustomSelectValue === 'function' ? getCustomSelectValue('delColdChain') : vendorStageState.delivery.coldChain;
  simulateOcrDelay(() => {
    vendorStageState.delivery = {
      ...vendorStageState.delivery,
      challan: 'CHL-2026-0456',
      vehicle: 'MP-04-AB-2190 / LR-88912',
      dispatchDate: '03-09-2026',
      expectedDate: '06-09-2026',
      remarks: 'Hospital Linen — Batch 3',
      status: 'Dispatched',
      coldChain: cold || 'No',
      ocrReady: true,
      updated: false,
      fileName: file.name
    };
    showWfAlert('Delivery status document processed via OCR. Review the details, set Cold Chain if needed, then Save.', 'success');
  });
}

function saveDeliveryOcr() {
  const d = vendorStageState.delivery;
  if (!d.ocrReady) {
    showWfAlert('Upload a Delivery Status document first so OCR can populate the details.');
    return;
  }
  const cold = typeof getCustomSelectValue === 'function' ? getCustomSelectValue('delColdChain') : d.coldChain;
  d.coldChain = cold || 'No';
  d.updated = true;
  completeVendorStage(7);
  showWfAlert('Delivery details saved. You may proceed to Invoice Submission.', 'success');
  refreshWorkflowUI();
}

function handleInvoiceProofInlineUpload(input) {
  const file = input?.files?.[0];
  if (!file) return;
  simulateOcrDelay(() => {
    vendorStageState.uploads.deliveryProof = { name: file.name, size: file.size };
    vendorStageState.invoice = {
      ...vendorStageState.invoice,
      number: 'INV-0892',
      grn: 'GRN-2026-0311',
      amount: '4,25,000',
      status: 'OCR Ready — Confirm to Save',
      submitted: false,
      ocrReady: true,
      fileName: file.name
    };
    showWfAlert('Delivery proof processed via OCR. Review invoice details, then Save.', 'success');
  });
}

function saveInvoiceOcr() {
  const inv = vendorStageState.invoice;
  if (!inv.ocrReady) {
    showWfAlert('Attach Delivery Proof first so OCR can populate invoice details.');
    return;
  }
  inv.submitted = true;
  inv.status = 'Submitted';
  vendorStageState.payment.milestones[0].done = true;
  vendorStageState.payment.status = 'Under Verification';
  vendorStageState.payment.lastUpdate = formatDateDMY(APP_TODAY);
  completeVendorStage(8);
  showWfAlert('Invoice details saved. Payment Tracking is now available.', 'success');
  refreshWorkflowUI();
}

function refreshPaymentStatus() {
  const p = vendorStageState.payment;
  if (vendorStageState.invoice.submitted) {
    p.milestones[0].done = true;
    if (!p.milestones[1].done) {
      p.milestones[1].done = true;
      p.status = 'Finance Verification';
    } else if (!p.milestones[2].done) {
      p.milestones[2].done = true;
      p.status = 'Approved for Payment';
    } else {
      p.milestones[3].done = true;
      p.status = 'Paid';
      completeVendorStage(9);
    }
    p.lastUpdate = formatDateDMY(APP_TODAY);
  }
  showWfAlert(`Payment status refreshed: ${p.status}`, 'success');
  refreshWorkflowUI();
}

function openWorkflowDocument(docId) {
  if (docId === 'audit-trail') {
    openAuditTrailModal();
    return;
  }
  if (docId === 'compliance-matrix') {
    openVendorResourceModal('compliance-matrix');
    return;
  }
  if (docId === 'bid-submission-guide') {
    openBidSubmissionGuide();
    return;
  }
  if (docId.startsWith('stage-') && docId.endsWith('-guide')) {
    const stageId = parseInt(docId.replace('stage-', '').replace('-guide', ''), 10);
    openLifecycleGuideModal(stageId);
    return;
  }
  if (docId === 'kyc-checklist') {
    openModal('KYC Verification Checklist', renderKycChecklistModal(), { wide: true });
    return;
  }
  if (docId === 'vendor-code-letter') {
    openModal('Vendor Code Assignment Letter', renderVendorCodeLetterModal(), { wide: true });
    return;
  }
  if (docId === 'consolidation-report') {
    openDrillDown('stock', 'Demand Consolidation Report', 'District-wise consolidated demand for Drugs category. 28 items can be fulfilled from existing stock — estimated savings ₹2.1 Cr.');
    return;
  }
  openLifecycleGuideModal();
}

function openModal(title, bodyHtml, options = {}) {
  const overlay = document.getElementById('modalOverlay');
  const modal = overlay?.querySelector('.modal');
  const titleEl = document.getElementById('modalTitle');
  const bodyEl = document.getElementById('modalBody');
  const backBtn = document.getElementById('modalBackBtn');

  const alreadyOpen = overlay?.classList.contains('open');
  if (alreadyOpen && !options.fromBack && !options.replace) {
    modalHistory.push({
      title: titleEl?.textContent || '',
      body: bodyEl?.innerHTML || '',
      wide: !!modal?.classList.contains('modal--wide'),
      large: !!modal?.classList.contains('modal--lg'),
      extraWide: !!modal?.classList.contains('modal--xl')
    });
  }
  if (!alreadyOpen && !options.fromBack) {
    modalHistory = [];
  }

  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.innerHTML = bodyHtml;
  modal?.classList.toggle('modal--wide', !!options.wide);
  modal?.classList.toggle('modal--lg', !!options.large);
  modal?.classList.toggle('modal--xl', !!options.extraWide);
  overlay?.classList.add('open');
  backBtn?.classList.toggle('hidden', modalHistory.length === 0);

  if (options.highlightStage) {
    requestAnimationFrame(() => {
      const el = document.getElementById(`guide-stage-${options.highlightStage}`);
      el?.classList.add('guide-stage--highlight');
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }
}

function modalGoBack() {
  const prev = modalHistory.pop();
  if (!prev) {
    closeModal();
    return;
  }
  openModal(prev.title, prev.body, {
    wide: prev.wide,
    large: prev.large,
    extraWide: prev.extraWide,
    fromBack: true,
    replace: true
  });
}

function getAuditTrailEntries() {
  return currentRole === 'gov' ? AUDIT_TRAIL_GOV : AUDIT_TRAIL_VENDOR;
}

function getStageTips() {
  return currentRole === 'gov' ? GOV_STAGE_TIPS : VENDOR_STAGE_TIPS;
}

function renderLifecycleGuideContent(highlightStage) {
  const steps = getWorkflowSteps();
  const checklist = currentRole === 'gov' ? GOV_STAGE_CHECKLIST : VENDOR_STAGE_CHECKLIST;
  const tips = getStageTips();
  const isGov = currentRole === 'gov';
  const progress = getWorkflowProgressStep();

  return `<div class="guide-modal">
    <div class="guide-modal-intro">
      <div class="guide-modal-intro-icon"><i class="fa-solid fa-book-open"></i></div>
      <div>
        <p class="guide-modal-lead">${isGov ? 'Government procurement lifecycle — 13 stages from need identification to payment.' : 'Vendor / Bidder lifecycle — 9 stages from registration to payment tracking.'}</p>
        <p class="guide-modal-meta">GFR 2017 compliant · Click any stage below for checklist and guidance · Your current progress: <strong>Stage ${progress}</strong></p>
      </div>
    </div>
    <div class="guide-modal-stages">
      ${steps.map(s => {
        const items = checklist[s.id] || [];
        const tip = tips[s.id];
        const statusLabel = s.status === 'done' ? 'Completed' : s.status === 'active' ? 'In Progress' : 'Upcoming';
        const statusClass = s.status === 'done' ? 'badge-success' : s.status === 'active' ? 'badge-info' : 'badge-muted';
        const highlight = s.id === highlightStage ? ' guide-stage--highlight' : '';
        return `<article class="guide-stage${highlight}" id="guide-stage-${s.id}">
          <div class="guide-stage-head">
            <span class="guide-stage-num">Stage ${s.id}</span>
            <span class="badge ${statusClass}">${statusLabel}</span>
          </div>
          <h3 class="guide-stage-title">${s.name}</h3>
          <p class="guide-stage-desc">${s.desc}</p>
          ${items.length ? `<ul class="guide-stage-list">${items.map(i => `<li>${i}</li>`).join('')}</ul>` : ''}
          ${tip ? `<div class="guide-stage-tip"><i class="fa-solid fa-lightbulb"></i> ${tip}</div>` : ''}
        </article>`;
      }).join('')}
    </div>
  </div>`;
}

function openLifecycleGuideModal(highlightStage) {
  const isGov = currentRole === 'gov';
  const title = isGov ? 'Government Procurement Lifecycle Guide' : 'Vendor Lifecycle Guide';
  openModal(title, renderLifecycleGuideContent(highlightStage), { wide: true, large: true, highlightStage });
}

let auditTrailFilter = 'all';

function renderAuditTrailModalBody() {
  const entries = getAuditTrailEntries();
  const step = currentWorkflowStep || getWorkflowProgressStep();
  const stepName = getWorkflowSteps().find(s => s.id === step)?.name || '';
  const filtered = auditTrailFilter === 'current'
    ? entries.filter(e => e.stageId === step)
    : entries;
  const successCount = filtered.filter(e => e.status === 'Success').length;
  const pendingCount = filtered.filter(e => e.status === 'Pending').length;

  return `<div class="audit-modal">
    <div class="audit-modal-summary">
      <div class="audit-stat"><span class="audit-stat-value">${filtered.length}</span><span class="audit-stat-label">Entries</span></div>
      <div class="audit-stat"><span class="audit-stat-value">${successCount}</span><span class="audit-stat-label">Successful</span></div>
      <div class="audit-stat"><span class="audit-stat-value">${pendingCount}</span><span class="audit-stat-label">Pending</span></div>
      <div class="audit-stat"><span class="audit-stat-value">${step}</span><span class="audit-stat-label">Viewing Stage</span></div>
    </div>
    <div class="audit-filters">
      <button type="button" class="audit-filter${auditTrailFilter === 'all' ? ' active' : ''}" onclick="setAuditTrailFilter('all')">All Activity</button>
      <button type="button" class="audit-filter${auditTrailFilter === 'current' ? ' active' : ''}" onclick="setAuditTrailFilter('current')">Stage ${step}: ${stepName}</button>
    </div>
    <div class="audit-table-wrap">
      <table class="data-table audit-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Action</th>
            <th>Stage</th>
            <th>User</th>
            <th>Reference</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.length ? filtered.map(e => `<tr class="audit-row audit-row--${e.status.toLowerCase()}">
            <td class="audit-time">${e.time}</td>
            <td><strong>${e.action}</strong><div class="audit-detail">${e.detail}</div></td>
            <td><span class="audit-stage-chip">Stage ${e.stageId}</span> ${e.stage}</td>
            <td><div class="audit-user">${e.userName}</div><div class="audit-detail">${e.user}</div></td>
            <td><code class="audit-ref">${e.ref}</code></td>
            <td><span class="badge badge-${e.status === 'Success' ? 'success' : e.status === 'Pending' ? 'warning' : 'info'}">${e.status}</span></td>
          </tr>`).join('') : `<tr><td colspan="6" class="audit-empty">No audit entries for this filter.</td></tr>`}
        </tbody>
      </table>
    </div>
    <p class="audit-footer"><i class="fa-solid fa-shield-halved"></i> All actions are logged with user ID, timestamp, and reference for GFR 2017 compliance and dispute resolution.</p>
  </div>`;
}

function openAuditTrailModal() {
  auditTrailFilter = 'all';
  openModal('Audit Trail', renderAuditTrailModalBody(), { wide: true, large: true });
}

function setAuditTrailFilter(filter) {
  auditTrailFilter = filter;
  const body = document.getElementById('modalBody');
  if (body && document.getElementById('modalTitle')?.textContent === 'Audit Trail') {
    body.innerHTML = renderAuditTrailModalBody();
  }
}

function renderVendorResourceModal(key) {
  const info = VENDOR_RESOURCE_DETAILS[key];
  if (!info) return '<p>Resource not found.</p>';

  const statsHtml = info.stats.map(s => `<div class="resource-stat"><span class="resource-stat-label">${s.label}</span><span class="resource-stat-value">${s.value}</span></div>`).join('');
  const stepsHtml = info.steps ? `<ol class="resource-steps">${info.steps.map(s => `<li>${s}</li>`).join('')}</ol>` : '';
  const rowsHtml = info.rows ? `<div class="resource-matrix-wrap mt-2"><table class="data-table resource-matrix"><thead><tr><th>Requirement</th><th>Your Response</th><th>Status</th></tr></thead><tbody>${info.rows.map(r => `<tr><td>${r.req}</td><td>${r.response}</td><td><span class="badge badge-${r.status === 'Compliant' ? 'success' : 'warning'}">${r.status}</span></td></tr>`).join('')}</tbody></table></div>` : '';

  return `<div class="resource-modal">
    <div class="resource-modal-header">
      <div class="resource-modal-icon"><i class="fa-solid ${info.icon}"></i></div>
      <div>
        <span class="badge ${info.statusClass}">${info.status}</span>
        <p class="resource-modal-summary">${info.summary}</p>
      </div>
    </div>
    <div class="resource-stats">${statsHtml}</div>
    ${stepsHtml}
    ${rowsHtml}
    <div class="resource-note"><i class="fa-solid fa-circle-info"></i> ${info.note}</div>
  </div>`;
}

function openVendorResourceModal(key) {
  const info = VENDOR_RESOURCE_DETAILS[key];
  if (!info) return;
  openModal(info.title, renderVendorResourceModal(key), { wide: true });
}

function renderKycChecklistModal() {
  const items = VENDOR_STAGE_CHECKLIST[2] || [];
  return `<div class="doc-modal">
    <p class="doc-modal-lead">Required documents for KYC and bank verification (Stage 2).</p>
    <ul class="doc-checklist">${items.map(i => `<li><i class="fa-solid fa-check"></i> ${i}</li>`).join('')}</ul>
    <div class="resource-note mt-2"><i class="fa-solid fa-clock"></i> Respond to verification queries within 48 hours to avoid registration delays.</div>
  </div>`;
}

function renderVendorCodeLetterModal() {
  return `<div class="doc-modal doc-letter">
    <div class="doc-letter-head">
      <strong>MP Health Procurement Solution</strong><br>
      Department of Public Health &amp; Family Welfare, Government of Madhya Pradesh
    </div>
    <p class="doc-letter-ref">Ref: VND-CODE/2026/0129 &nbsp;|&nbsp; Date: 28 Aug 2026</p>
    <p><strong>To,</strong><br>MediSupply India Pvt Ltd<br>Plot 12, Industrial Area, Bhopal, MP - 462001</p>
    <p><strong>Subject: Vendor Code Assignment</strong></p>
    <p>We are pleased to inform you that your registration and KYC verification have been completed successfully. Your unique vendor code for all future transactions on the MP Health Procurement portal is:</p>
    <div class="doc-letter-code">VND-MP-000123</div>
    <p>Please quote this code in all bids, contracts, invoices, and correspondence. Linked categories: <strong>Drugs, Consumables</strong>.</p>
    <p class="doc-letter-sign">— Authorized Signatory<br>Vendor Registry, MP Health Procurement</p>
  </div>`;
}

function renderGovWorkflowExtras() {
  return `<div class="cards-grid">
    <div class="info-card" onclick="openDrillDown('stock','Stock Optimization','Fulfill from warehouse: 12 items, Other locations: 8 items, Open POs: 5 items.')">
      <h4><i class="fa-solid fa-boxes-stacked"></i> Demand Optimization</h4><p>Fulfill from existing stock before fresh procurement</p>
      <div class="card-meta"><span>28 items optimizable</span><span class="badge badge-success">₹2.1 Cr saved</span></div>
    </div>
    <div class="info-card" onclick="openDrillDown('contract','Contract Before PO','Contract approval must precede PO generation per policy.')">
      <h4><i class="fa-solid fa-file-contract"></i> Contract Gate</h4><p>Contract approval and execution before PO</p>
      <div class="card-meta"><span>3 pending contracts</span><span class="badge badge-warning">Action Required</span></div>
    </div>
    <div class="info-card" onclick="openDrillDown('eval','Bid Evaluation','Technical + Financial evaluation using L1/QCBS.')">
      <h4><i class="fa-solid fa-scale-balanced"></i> Evaluation Committee</h4><p>Procurement, Stores, Finance, Quality, Evaluation roles</p>
      <div class="card-meta"><span>2 tenders in evaluation</span><span class="badge badge-info">In Progress</span></div>
    </div>
  </div>`;
}

function renderVendorWorkflowExtras() {
  return `<div class="cards-grid wf-resource-cards">
    <div class="info-card info-card--interactive" onclick="openVendorResourceModal('bid-sealing')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openVendorResourceModal('bid-sealing')}">
      <h4><i class="fa-solid fa-lock"></i> Commercial Bid Sealing</h4>
      <p>Financial bid remains masked until authorized opening stage</p>
      <div class="card-meta"><span>Sealed · TND-2026-MP-0055</span><span class="badge badge-info">View details</span></div>
    </div>
    <div class="info-card info-card--interactive" onclick="openVendorResourceModal('compliance-matrix')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openVendorResourceModal('compliance-matrix')}">
      <h4><i class="fa-solid fa-clipboard-list"></i> Compliance Matrix</h4>
      <p>Map every tender requirement to your response</p>
      <div class="card-meta"><span>42 / 45 mapped</span><span class="badge badge-warning">93% complete</span></div>
    </div>
    <div class="info-card info-card--interactive" onclick="openVendorResourceModal('emd-pbg')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openVendorResourceModal('emd-pbg')}">
      <h4><i class="fa-solid fa-building-columns"></i> EMD / PBG</h4>
      <p>EMD with bid; PBG (5-10%) after award via SFMS/e-BG</p>
      <div class="card-meta"><span>EMD ₹3,20,000</span><span class="badge badge-warning">Pending</span></div>
    </div>
  </div>`;
}

function selectWorkflowStep(id) {
  const steps = getWorkflowSteps();
  const step = steps.find(s => s.id === id);
  if (!step) return;
  currentWorkflowStep = id;
  refreshWorkflowUI();
  document.getElementById('wfDetail')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function goWorkflowStep(delta) {
  const next = currentWorkflowStep + delta;
  const total = getWorkflowSteps().length;
  if (next < 1 || next > total) return;

  if (currentRole === 'vendor' && delta > 0) {
    const err = validateVendorStageFields(currentWorkflowStep);
    if (err && currentWorkflowStep >= getVendorActiveStageId()) {
      showWfAlert(err);
      return;
    }
    if (!vendorCanAdvanceFrom(currentWorkflowStep)) {
      showWfAlert(err || 'Complete the required actions on this stage before moving to the next stage.');
      return;
    }
  }

  selectWorkflowStep(next);
}

function returnToCurrentWorkflowStep() {
  selectWorkflowStep(getWorkflowProgressStep());
}

function refreshWorkflowUI() {
  const steps = getWorkflowSteps();
  const progress = getWorkflowProgressStep();
  const viewId = currentWorkflowStep;
  const total = steps.length;
  const step = steps.find(s => s.id === viewId) || steps[0];

  document.querySelectorAll('.wf-step').forEach(el => {
    const id = parseInt(el.dataset.step, 10);
    const s = steps.find(x => x.id === id);
    if (!s) return;
    el.className = getWorkflowStepClasses(s, viewId);
    el.setAttribute('aria-selected', id === viewId);
    const dot = el.querySelector('.wf-dot');
    if (dot) dot.innerHTML = wfDotContent(s, viewId);
  });

  const detail = document.getElementById('wfDetail');
  if (detail) {
    detail.innerHTML = renderWorkflowDetailPanel(step, progress, total);
    initCustomSelects();
  }
  updateWorkflowSubtitle();
  updatePageMeta();
}

// ========== OTHER PAGES ==========
function renderVendorReg() {
  const regs = filterByCategory(VENDOR_REGISTRATIONS);
  return `<div class="data-table-wrap">
      <div class="table-header">
        <h3>Registration Requests</h3>
        <span class="meta-chip" style="margin:0"><strong>${regs.length}</strong> shown</span>
      </div>
      <table class="data-table">
        <thead><tr><th>Request ID</th><th>Company Name</th><th>Category</th><th>KYC Status</th><th>Documents</th><th>Submitted</th><th>Action</th></tr></thead>
        <tbody>
          ${regs.length ? regs.map(r => `<tr onclick="openDrillDown('reg','${r.id}','${r.name} - Registration review. KYC: ${r.kyc}. Documents: ${r.documents}.')">
            <td><strong>${r.id}</strong></td><td>${r.name}</td><td>${r.category}</td>
            <td><span class="badge badge-${kycBadgeClass(r.kyc)}">${r.kyc}</span></td>
            <td>${r.documents}</td><td>${r.submitted}</td>
            <td><button class="btn btn-primary" style="padding:0.3rem 0.6rem;font-size:0.75rem">Review</button></td>
          </tr>`).join('') : emptyTableRow(7)}
        </tbody>
      </table>
    </div>`;
}

function getLinkedItemsForTender(tender) {
  if (!tender || typeof CATEGORY_ITEM_TYPES === 'undefined') return [];
  const items = CATEGORY_ITEM_TYPES[tender.category] || [];
  const title = (tender.title || '').toLowerCase();
  const matched = items.filter(i => {
    const name = (i.name || '').toLowerCase();
    const tokens = name.split(/[\s&/]+/).filter(w => w.length > 3);
    return tokens.some(tok => title.includes(tok)) || title.includes(name.split(' ')[0].toLowerCase());
  });
  if (matched.length) return matched;
  // Fall back to items whose spend matches tender value
  const byValue = items.filter(i => i.spend === tender.value);
  return byValue.length ? byValue : items.slice(0, 2);
}

function getBidForTender(tenderId) {
  return typeof BIDS !== 'undefined' ? BIDS.find(b => b.tenderId === tenderId) : null;
}

function renderSourcing() {
  const actions = getGovDashboardActionCounts(currentCategory === 'All' ? 'All' : currentCategory);
  const openTenders = filterListByCategory(TENDERS).filter(t => t.status === 'Open');
  const evalTenders = filterListByCategory(TENDERS).filter(t => t.status === 'Evaluation');
  const pending = filterListByCategory(PENDING_APPROVALS);
  const delays = filterListByCategory(PAYMENT_DELAYS);
  const catLabel = currentCategory === 'All' ? 'All categories' : currentCategory;

  return `
    <div class="kpi-section">
      <div class="kpi-section-label"><i class="fa-solid fa-bolt"></i> Same action queue as Analytics · ${catLabel} <span class="kpi-section-sum">Tab total = ${actions.sum}</span></div>
      <div class="kpi-grid kpi-grid--actions">
        <div class="kpi-card blue" onclick="document.getElementById('sourcingOpenTenders')?.scrollIntoView({behavior:'smooth',block:'start'})">
          <div class="kpi-label">Open Tenders</div>
          <div class="kpi-value">${actions.open}</div>
          <div class="kpi-change">Accepting bids</div>
        </div>
        <div class="kpi-card orange" onclick="document.getElementById('sourcingPending')?.scrollIntoView({behavior:'smooth',block:'start'})">
          <div class="kpi-label">Pending Approvals</div>
          <div class="kpi-value">${actions.pending}</div>
          <div class="kpi-change">Awaiting sanction</div>
        </div>
        <div class="kpi-card red" onclick="document.getElementById('sourcingDelays')?.scrollIntoView({behavior:'smooth',block:'start'})">
          <div class="kpi-label">Payment Delays</div>
          <div class="kpi-value">${actions.delays}</div>
          <div class="kpi-change">Invoice holds</div>
        </div>
      </div>
    </div>

    <div class="data-table-wrap" id="sourcingOpenTenders">
      <div class="table-header"><h3>Open Tenders — ${catLabel} (${openTenders.length})</h3></div>
      <table class="data-table">
        <thead><tr><th>S.No</th><th>Tender ID</th><th>Title</th><th>Category</th><th>Value</th><th>Bids</th><th>Deadline</th><th>Status</th></tr></thead>
        <tbody>
          ${openTenders.length ? openTenders.map((t, i) => `<tr onclick="openTenderDetail('${t.id}')" style="cursor:pointer">
            <td>${i + 1}</td>
            <td><strong>${t.id}</strong></td>
            <td>${t.title}</td>
            <td>${t.category}</td>
            <td>${t.value}</td>
            <td>${t.bids}</td>
            <td>${formatDateDMY(t.deadline)}</td>
            <td><span class="badge badge-${tenderBadgeClass(t.status)}">${t.status}</span></td>
          </tr>`).join('') : emptyTableRow(8, 'No open tenders for this category.')}
        </tbody>
      </table>
    </div>

    ${evalTenders.length ? `<div class="data-table-wrap mt-2">
      <div class="table-header"><h3>Under Evaluation — ${catLabel} (${evalTenders.length})</h3></div>
      <table class="data-table">
        <thead><tr><th>S.No</th><th>Tender ID</th><th>Title</th><th>Category</th><th>Value</th><th>Bids</th><th>Evaluation</th><th>Commercial</th><th>Status</th></tr></thead>
        <tbody>
          ${evalTenders.map((t, i) => {
            const bid = getBidForTender(t.id);
            return `<tr onclick="openTenderDetail('${t.id}')" style="cursor:pointer">
              <td>${i + 1}</td>
              <td><strong>${t.id}</strong></td>
              <td>${t.title}</td>
              <td>${t.category}</td>
              <td>${t.value}</td>
              <td>${t.bids}</td>
              <td><span class="badge badge-warning">${bid?.status === 'Under Evaluation' || t.status === 'Evaluation' ? 'In Progress' : '—'}</span></td>
              <td><span class="badge badge-muted"><i class="fa-solid fa-lock"></i> ${bid?.financial || 'Sealed'}</span></td>
              <td><span class="badge badge-${tenderBadgeClass(t.status)}">${t.status}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>` : ''}

    <div class="data-table-wrap mt-2" id="sourcingPending">
      <div class="table-header"><h3>Pending Approvals — ${catLabel} (${pending.length})</h3></div>
      <table class="data-table">
        <thead><tr><th>S.No</th><th>PR ID</th><th>Title</th><th>Category</th><th>Stage</th><th>Amount</th><th>Age</th><th>Owner</th></tr></thead>
        <tbody>
          ${pending.length ? pending.map((r, i) => `<tr>
            <td>${i + 1}</td>
            <td><strong>${r.id}</strong></td>
            <td>${r.title}</td>
            <td>${r.category}</td>
            <td><span class="badge badge-warning">${r.stage}</span></td>
            <td>${r.amount}</td>
            <td>${r.age}</td>
            <td>${r.owner}</td>
          </tr>`).join('') : emptyTableRow(8, 'No pending approvals for this category.')}
        </tbody>
      </table>
    </div>

    <div class="data-table-wrap mt-2" id="sourcingDelays">
      <div class="table-header"><h3>Payment Delays — ${catLabel} (${delays.length})</h3></div>
      <table class="data-table">
        <thead><tr><th>S.No</th><th>Invoice</th><th>Vendor</th><th>Category</th><th>Amount</th><th>Overdue</th><th>Reason</th><th>Contract</th></tr></thead>
        <tbody>
          ${delays.length ? delays.map((r, i) => `<tr>
            <td>${i + 1}</td>
            <td><strong>${r.id}</strong></td>
            <td>${r.vendor}</td>
            <td>${r.category}</td>
            <td>${r.amount}</td>
            <td><span class="badge badge-danger">${r.daysOverdue}d</span></td>
            <td>${r.reason}</td>
            <td>${r.contractId}</td>
          </tr>`).join('') : emptyTableRow(8, 'No payment delays for this category.')}
        </tbody>
      </table>
    </div>

    <div class="wf-detail mt-2">
      <h3>Weighted Vendor Recommendation</h3>
      <p>Selected vendor receives explainable weighted score. Blacklisted/expired/non-compliant bidders auto-blocked. Score weights match Analytics Vendor Performance Matrix.</p>
      <div class="score-weights">${SCORE_WEIGHTS.map(w => `<div class="weight-card"><div class="weight-pct">${w.weight}%</div><div class="weight-label">${w.label}</div></div>`).join('')}</div>
    </div>`;
}

function renderMasterData() {
  const cats = currentCategory === 'All'
    ? CATEGORIES.filter(c => c !== 'All')
    : [currentCategory];
  return `<div class="cards-grid">
      ${cats.map(c => `<div class="info-card ${currentCategory === c ? 'cat-highlight' : ''}"><h4>${c}</h4><p>Master items, specifications, and formulary lists</p><div class="card-meta"><span>Active items</span><span>${MASTER_DATA_COUNTS[c]}</span></div></div>`).join('')}
    </div>
    <div class="wf-detail"><h3>Workflow Configuration</h3><p>Assign operational tasks to Procurement, Stores, Finance, Quality, and Evaluation roles${currentCategory !== 'All' ? ` for <strong>${currentCategory}</strong>` : ''}.</p></div>`;
}

function renderTOR() {
  const entries = filterByCategory(TOR_ENTRIES);
  const flagCount = entries.reduce((s, e) => s + e.flags, 0);
  return `${flagCount > 0 ? `<div class="sticky-banner"><span class="banner-icon"><i class="fa-solid fa-flag"></i></span><div><strong>${flagCount} Red Flag${flagCount !== 1 ? 's' : ''}</strong> detected in active TOR documents${currentCategory !== 'All' ? ` for ${currentCategory}` : ''}. Review required before tender publication.</div></div>` : ''}
    <div class="data-table-wrap">
      <table class="data-table">
        <thead><tr><th>TOR Reference</th><th>Tender</th><th>Category</th><th>Coverage</th><th>Red Flags</th><th>Status</th></tr></thead>
        <tbody>
          ${entries.length ? entries.map(e => `<tr>
            <td>${e.id}</td><td>${e.tenderId}</td><td>${e.category}</td><td>${e.coverage}</td>
            <td><span class="badge badge-${e.flags ? 'warning' : 'success'}">${e.flags ? e.flags + ' flags' : 'Clear'}</span></td>
            <td><span class="badge badge-${e.status === 'Approved' ? 'success' : e.status === 'Blocked' ? 'danger' : 'warning'}">${e.status}</span></td>
          </tr>`).join('') : emptyTableRow(6)}
        </tbody>
      </table>
    </div>`;
}

function renderVendorMatrix() {
  return `${renderAnalyticsFilterBar({ showCompare: false })}
    <div class="chart-card mb-2">
      <div class="chart-header">
        <h3>Vendor Comparison</h3>
        <span class="chart-subtitle" id="vendorMatrixChartSubtitle">${getAnalyticsContextLabel()} · Vendor score comparison (pts 0–100)</span>
      </div>
      <div class="chart-container"><canvas id="chartVendorTrend"></canvas></div>
    </div>
    ${renderVendorTable({ showNavButton: false, tableId: 'vendorMatrixTable' })}`;
}

function renderReports() {
  if (currentRole === 'vendor') return renderVendorReports();
  return renderGovReports();
}

function getGovReportDataset(category = currentCategory) {
  const filter = (items, field = 'category') => (category === 'All' ? items : items.filter(i => i[field] === category));
  const workQueue = getWorkQueueSource();
  const filteredQueue = category === 'All'
    ? workQueue
    : workQueue.filter(w => `${w.title} ${w.detail}`.toLowerCase().includes(category.toLowerCase()));

  const workflowDone = GOV_WORKFLOW.filter(s => s.status === 'done').length;
  const workflowActive = GOV_WORKFLOW.filter(s => s.status === 'active').length;
  const workflowPending = GOV_WORKFLOW.filter(s => s.status === 'pending').length;

  return {
    category,
    workflow: GOV_WORKFLOW,
    workflowDone,
    workflowActive,
    workflowPending,
    tenders: filter(TENDERS),
    registrations: filter(VENDOR_REGISTRATIONS),
    pendingApprovals: filter(PENDING_APPROVALS),
    paymentDelays: filter(PAYMENT_DELAYS),
    workQueue: filteredQueue,
    slaThreads: SLA_THREADS,
    vendors: filter(VENDORS),
    totals: getReportsPeriodTotals(),
    actions: getGovDashboardActionCounts(category === 'All' ? 'All' : category),
    districtSpend: typeof DISTRICT_SPEND !== 'undefined' ? DISTRICT_SPEND : []
  };
}

function renderGovReports() {
  const ds = getGovReportDataset();
  const ctx = getAnalyticsContextLabel();
  const openTenders = ds.tenders.filter(t => t.status === 'Open').length;
  const evalTenders = ds.tenders.filter(t => t.status === 'Evaluation').length;
  const pendingKyc = ds.registrations.filter(r => r.kyc === 'Pending' || r.kyc === 'In Review').length;
  const openSla = ds.slaThreads.filter(t => t.status !== 'Resolved').length;
  const unreadAlerts = ds.workQueue.filter(w => w.unread).length;
  const avgVendorScore = ds.vendors.length
    ? Math.round(ds.vendors.reduce((s, v) => s + v.overall, 0) / ds.vendors.length * 10) / 10
    : 0;

  return `<div class="gov-reports vendor-reports">
    <div class="report-toolbar">
      <div>
        <p class="report-toolbar-lead">Resource Manager analytics · <strong>${ds.category === 'All' ? 'All categories' : ds.category}</strong></p>
        <p class="report-toolbar-meta">Generated ${formatDateDMY(APP_TODAY)} · ${ctx} · DoPHFW, GoMP</p>
      </div>
      <div class="report-toolbar-actions">
        <button type="button" class="btn btn-outline" onclick="downloadGovReportPack('excel')"><i class="fa-solid fa-file-excel"></i> Excel Pack</button>
        <button type="button" class="btn btn-primary" onclick="downloadGovReportPack('pdf')"><i class="fa-solid fa-file-pdf"></i> PDF Pack</button>
      </div>
    </div>

    ${renderAnalyticsFilterBar({ showCompare: false })}

    <div class="report-insight-strip">
      <div class="report-insight-card">
        <span class="report-insight-label">Procurement spend</span>
        <strong id="reportSpendTotal">₹${ds.totals.spendTotal} Cr</strong>
        <p>Total value of POs &amp; contracts in the selected period</p>
      </div>
      <div class="report-insight-card report-insight-card--green">
        <span class="report-insight-label">Savings realized</span>
        <strong id="reportSaveTotal">₹${ds.totals.saveTotal} Cr</strong>
        <p>Budgeted cost minus actual contract value</p>
      </div>
      <div class="report-insight-card">
        <span class="report-insight-label">Action items</span>
        <strong>${ds.actions.sum}</strong>
        <p>Open tenders + pending approvals + payment delays</p>
      </div>
      <div class="report-insight-card report-insight-card--muted">
        <span class="report-insight-label">Active filter</span>
        <strong id="reportContextLabel" class="report-insight-filter">${ctx}</strong>
        <p>Period applies to spend &amp; savings charts below</p>
      </div>
    </div>

    <div class="kpi-grid kpi-grid--vendor mb-2">
      <div class="kpi-card blue"><div class="kpi-label">Lifecycle Progress</div><div class="kpi-value">${ds.workflowDone}/13</div><div class="kpi-change">Stages completed</div></div>
      <div class="kpi-card teal"><div class="kpi-label">Open Tenders</div><div class="kpi-value">${openTenders}</div><div class="kpi-change">Under eval: ${evalTenders}</div></div>
      <div class="kpi-card orange"><div class="kpi-label">Vendor Onboarding</div><div class="kpi-value">${ds.registrations.length}</div><div class="kpi-change">KYC pending: ${pendingKyc}</div></div>
      <div class="kpi-card green"><div class="kpi-label">Operations</div><div class="kpi-value">${unreadAlerts}</div><div class="kpi-change">Unread alerts · SLA open: ${openSla}</div></div>
    </div>

    <!-- Report 01: Procurement Lifecycle & Financial Analytics -->
    <section class="report-section" id="reportGovLifecycle">
      <div class="report-section-header">
        <div>
          <span class="report-eyebrow">Report 01</span>
          <h3>Procurement Lifecycle &amp; Financial Analytics</h3>
          <p>Combines Analytics Dashboard and Need Identification to Pay — spend, savings, workflow stage status, and district-wise outlay.</p>
        </div>
        <div class="report-section-actions">
          <button type="button" class="btn btn-outline btn-sm" onclick="downloadGovReport('lifecycle','excel')"><i class="fa-solid fa-file-excel"></i> Excel</button>
          <button type="button" class="btn btn-outline btn-sm" onclick="downloadGovReport('lifecycle','pdf')"><i class="fa-solid fa-file-pdf"></i> PDF</button>
        </div>
      </div>
      <div class="chart-grid">
        <div class="chart-card">
          <div class="chart-header">
            <h3><i class="fa-solid fa-chart-column"></i> Spend Trends (Procurement)</h3>
            <span class="chart-subtitle" data-chart-sub="spend">${getChartSubtitle('spend')}</span>
          </div>
          <p class="chart-help">Unit: <strong>₹ Crore</strong> — money spent through awarded tenders / purchase orders.</p>
          <div class="chart-container"><canvas id="chartSpend"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header">
            <h3><i class="fa-solid fa-piggy-bank"></i> Savings Realization (₹ Cr)</h3>
            <span class="chart-subtitle" data-chart-sub="savings">${getChartSubtitle('savings')}</span>
          </div>
          <p class="chart-help">Unit: <strong>₹ Crore</strong> — savings vs estimate through rate contracts and L1 competition.</p>
          <div class="chart-container"><canvas id="chartSavings"></canvas></div>
        </div>
      </div>
      <div class="chart-grid mt-2">
        <div class="chart-card full">
          <div class="chart-header"><h3><i class="fa-solid fa-arrows-rotate"></i> Procurement Lifecycle Stage Status</h3></div>
          <p class="chart-help">13-stage Need Identification to Pay workflow — completed, active, and pending stages.</p>
          <div class="chart-container chart-container--tall"><canvas id="chartGovWorkflow"></canvas></div>
        </div>
      </div>
      <div class="data-table-wrap mt-2">
        <table class="data-table" id="tblGovWorkflow">
          <thead><tr><th>Stage</th><th>Step</th><th>Description</th><th>Status</th></tr></thead>
          <tbody>
            ${ds.workflow.map(s => `<tr>
              <td><strong>${s.id}</strong></td>
              <td>${s.name}</td>
              <td>${s.desc}</td>
              <td><span class="badge badge-${s.status === 'done' ? 'success' : s.status === 'active' ? 'warning' : 'muted'}">${s.status === 'done' ? 'Completed' : s.status === 'active' ? 'In Progress' : 'Pending'}</span></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="data-table-wrap mt-2">
        <table class="data-table" id="tblDistrictSpend">
          <thead><tr><th>District</th><th>Facility</th><th>Drugs (₹ Cr)</th><th>Equipment</th><th>Services</th><th>Consumables</th><th>Others</th></tr></thead>
          <tbody>
            ${ds.districtSpend.length ? ds.districtSpend.map(d => `<tr>
              <td><strong>${d.district}</strong></td><td>${d.facility}</td>
              <td>${d.drugs}</td><td>${d.equipment}</td><td>${d.services}</td><td>${d.consumables}</td><td>${d.others}</td>
            </tr>`).join('') : emptyTableRow(7)}
          </tbody>
        </table>
      </div>
      <p class="report-footnote"><i class="fa-solid fa-circle-info"></i> Savings rate for selected period: <strong id="reportSaveRate">${ds.totals.rate}%</strong> · Workflow: <strong>${ds.workflowActive}</strong> active, <strong>${ds.workflowPending}</strong> pending</p>
    </section>

    <!-- Report 02: Vendor Onboarding & Sourcing -->
    <section class="report-section" id="reportGovSourcing">
      <div class="report-section-header">
        <div>
          <span class="report-eyebrow">Report 02</span>
          <h3>Vendor Onboarding &amp; Sourcing Pipeline</h3>
          <p>Combines Vendor Registration and Sourcing &amp; Award — KYC queue, tender pipeline, pending sanctions, and payment delays.</p>
        </div>
        <div class="report-section-actions">
          <button type="button" class="btn btn-outline btn-sm" onclick="downloadGovReport('sourcing','excel')"><i class="fa-solid fa-file-excel"></i> Excel</button>
          <button type="button" class="btn btn-outline btn-sm" onclick="downloadGovReport('sourcing','pdf')"><i class="fa-solid fa-file-pdf"></i> PDF</button>
        </div>
      </div>
      <div class="chart-grid">
        <div class="chart-card">
          <div class="chart-header"><h3>Tender Pipeline by Status</h3></div>
          <div class="chart-container"><canvas id="chartGovTenderPipeline"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header"><h3>Pending Approvals by Stage</h3></div>
          <div class="chart-container"><canvas id="chartGovApprovalStages"></canvas></div>
        </div>
      </div>
      <div class="chart-grid mt-2">
        <div class="chart-card full">
          <div class="chart-header"><h3>Payment Delays by Days Overdue</h3></div>
          <div class="chart-container chart-container--tall"><canvas id="chartGovPaymentDelays"></canvas></div>
        </div>
      </div>
      <div class="data-table-wrap mt-2">
        <table class="data-table" id="tblGovRegistrations">
          <thead><tr><th>Registration ID</th><th>Vendor</th><th>Category</th><th>KYC</th><th>Documents</th><th>Submitted</th></tr></thead>
          <tbody>
            ${ds.registrations.length ? ds.registrations.map(r => `<tr>
              <td><strong>${r.id}</strong></td><td>${r.name}</td><td>${r.category}</td>
              <td><span class="badge badge-${kycBadgeClass(r.kyc)}">${r.kyc}</span></td>
              <td>${r.documents}</td><td>${formatDateDMY(r.submitted)}</td>
            </tr>`).join('') : emptyTableRow(6)}
          </tbody>
        </table>
      </div>
      <div class="data-table-wrap mt-2">
        <table class="data-table" id="tblGovTenders">
          <thead><tr><th>Tender ID</th><th>Title</th><th>Category</th><th>Value</th><th>Bids</th><th>Deadline</th><th>Status</th></tr></thead>
          <tbody>
            ${ds.tenders.length ? ds.tenders.map(t => `<tr>
              <td><strong>${t.id}</strong></td><td>${t.title}</td><td>${t.category}</td><td>${t.value}</td>
              <td>${t.bids}</td><td>${formatDateDMY(t.deadline)}</td>
              <td><span class="badge badge-${tenderBadgeClass(t.status)}">${t.status}</span></td>
            </tr>`).join('') : emptyTableRow(7)}
          </tbody>
        </table>
      </div>
      <div class="data-table-wrap mt-2">
        <table class="data-table" id="tblGovApprovals">
          <thead><tr><th>PR ID</th><th>Title</th><th>Category</th><th>Stage</th><th>Amount</th><th>Age</th><th>Owner</th></tr></thead>
          <tbody>
            ${ds.pendingApprovals.length ? ds.pendingApprovals.map(a => `<tr>
              <td><strong>${a.id}</strong></td><td>${a.title}</td><td>${a.category}</td><td>${a.stage}</td>
              <td>${a.amount}</td><td>${a.age}</td><td>${a.owner}</td>
            </tr>`).join('') : emptyTableRow(7)}
          </tbody>
        </table>
      </div>
      <div class="data-table-wrap mt-2">
        <table class="data-table" id="tblGovPaymentDelays">
          <thead><tr><th>Invoice</th><th>Vendor</th><th>Category</th><th>Amount</th><th>Days Overdue</th><th>Reason</th><th>Contract</th></tr></thead>
          <tbody>
            ${ds.paymentDelays.length ? ds.paymentDelays.map(p => `<tr>
              <td><strong>${p.id}</strong></td><td>${p.vendor}</td><td>${p.category}</td><td>${p.amount}</td>
              <td><span class="badge badge-danger">${p.daysOverdue} days</span></td><td>${p.reason}</td><td>${p.contractId}</td>
            </tr>`).join('') : emptyTableRow(7)}
          </tbody>
        </table>
      </div>
      <p class="report-footnote"><i class="fa-solid fa-circle-info"></i> Sourcing action queue: <strong>${ds.actions.open}</strong> open tenders · <strong>${ds.actions.pending}</strong> pending approvals · <strong>${ds.actions.delays}</strong> payment delays</p>
    </section>

    <!-- Report 03: Operations & Performance -->
    <section class="report-section" id="reportGovOperations">
      <div class="report-section-header">
        <div>
          <span class="report-eyebrow">Report 03</span>
          <h3>Operations, SLA &amp; Vendor Performance</h3>
          <p>Combines Alerts &amp; Work Queue, SLA Communication, and Vendor Performance Matrix — escalations, alerts, and vendor scorecard.</p>
        </div>
        <div class="report-section-actions">
          <button type="button" class="btn btn-outline btn-sm" onclick="downloadGovReport('operations','excel')"><i class="fa-solid fa-file-excel"></i> Excel</button>
          <button type="button" class="btn btn-outline btn-sm" onclick="downloadGovReport('operations','pdf')"><i class="fa-solid fa-file-pdf"></i> PDF</button>
        </div>
      </div>
      <div class="chart-grid">
        <div class="chart-card">
          <div class="chart-header"><h3>Work Queue by Category</h3></div>
          <div class="chart-container"><canvas id="chartGovWorkQueue"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header"><h3>SLA Thread Status</h3></div>
          <div class="chart-container"><canvas id="chartGovSlaStatus"></canvas></div>
        </div>
      </div>
      <div class="chart-grid mt-2">
        <div class="chart-card full">
          <div class="chart-header"><h3>Vendor Performance Score Comparison</h3></div>
          <p class="chart-help">Weighted overall score (0–100) across registered vendors in the selected category filter.</p>
          <div class="chart-container chart-container--tall"><canvas id="chartGovVendorScores"></canvas></div>
        </div>
      </div>
      <div class="data-table-wrap mt-2">
        <table class="data-table" id="tblGovWorkQueue">
          <thead><tr><th>Alert</th><th>Category</th><th>Severity</th><th>Owner</th><th>Timeline</th><th>Detail</th></tr></thead>
          <tbody>
            ${ds.workQueue.length ? ds.workQueue.map(w => `<tr>
              <td><strong>${w.title}</strong></td><td>${w.category}</td>
              <td><span class="badge badge-${w.severity === 'high' ? 'danger' : w.severity === 'medium' ? 'warning' : 'info'}">${w.severity}</span></td>
              <td>${w.owner}</td><td>${w.timeline}</td><td>${w.detail}</td>
            </tr>`).join('') : emptyTableRow(6)}
          </tbody>
        </table>
      </div>
      <div class="data-table-wrap mt-2">
        <table class="data-table" id="tblGovSlaThreads">
          <thead><tr><th>Thread ID</th><th>Subject</th><th>Contract</th><th>Level</th><th>Priority</th><th>Status</th><th>Last Update</th></tr></thead>
          <tbody>
            ${ds.slaThreads.map(t => `<tr>
              <td><strong>${t.id}</strong></td><td>${t.subject}</td><td>${t.contractId}</td>
              <td>L${t.level}</td>
              <td><span class="badge badge-${t.priority === 'High' ? 'danger' : t.priority === 'Medium' ? 'warning' : 'info'}">${t.priority}</span></td>
              <td><span class="badge badge-${t.status === 'Resolved' ? 'success' : t.status === 'Open' ? 'danger' : 'warning'}">${t.status}</span></td>
              <td>${t.lastUpdate}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div class="data-table-wrap mt-2">
        <table class="data-table" id="tblGovVendors">
          <thead><tr><th>Vendor ID</th><th>Name</th><th>Category</th><th>Quality</th><th>Lead Time</th><th>Cost</th><th>Regulatory</th><th>Satisfaction</th><th>Overall</th><th>Status</th></tr></thead>
          <tbody>
            ${ds.vendors.length ? ds.vendors.map(v => `<tr>
              <td><strong>${v.id}</strong></td><td>${v.name}</td><td>${v.category}</td>
              <td>${v.quality}</td><td>${v.leadTime}</td><td>${v.cost}</td><td>${v.regulatory}</td><td>${v.satisfaction}</td>
              <td><strong>${v.overall}</strong></td>
              <td><span class="badge badge-${v.status === 'Preferred' ? 'success' : v.status === 'Watch' ? 'danger' : 'info'}">${v.status}</span></td>
            </tr>`).join('') : emptyTableRow(10)}
          </tbody>
        </table>
      </div>
      <p class="report-footnote"><i class="fa-solid fa-circle-info"></i> Average vendor score in filter: <strong>${avgVendorScore}</strong> · Open SLA threads: <strong>${openSla}</strong> · Unread alerts: <strong>${unreadAlerts}</strong></p>
    </section>
  </div>`;
}

function getVendorReportDataset(category = currentCategory) {
  const tenders = category === 'All' ? TENDERS : TENDERS.filter(t => t.category === category);
  const bids = category === 'All' ? BIDS : BIDS.filter(b => b.category === category);
  const clarifications = category === 'All' ? CLARIFICATIONS : CLARIFICATIONS.filter(c => c.category === category);
  const contracts = category === 'All' ? CONTRACTS : CONTRACTS.filter(c => c.category === category);
  const deliveries = category === 'All' ? DELIVERIES : DELIVERIES.filter(d => d.category === category);
  const vendor = VENDORS[0];

  const stageProgress = [
    { stage: 1, name: 'Registration', status: vendorStageState.completed[1] ? 'Completed' : 'Pending' },
    { stage: 2, name: 'KYC Verification', status: vendorStageState.completed[2] ? 'Completed' : 'Pending' },
    { stage: 3, name: 'Vendor Approval', status: vendorStageState.completed[3] ? 'Completed' : 'Pending' },
    { stage: 4, name: 'Bid Submission', status: vendorStageState.completed[4] ? 'Completed' : 'In Progress' },
    { stage: 5, name: 'Award Notification', status: vendorStageState.completed[5] ? 'Completed' : 'Upcoming' },
    { stage: 6, name: 'Contract Execution', status: vendorStageState.completed[6] ? 'Completed' : 'Upcoming' },
    { stage: 7, name: 'Delivery', status: vendorStageState.completed[7] ? 'Completed' : 'Upcoming' },
    { stage: 8, name: 'Invoice Submission', status: vendorStageState.completed[8] ? 'Completed' : 'Upcoming' },
    { stage: 9, name: 'Payment Tracking', status: vendorStageState.completed[9] ? 'Completed' : 'Upcoming' }
  ];

  return { tenders, bids, clarifications, contracts, deliveries, vendor, stageProgress, category };
}

function renderVendorReports() {
  const ds = getVendorReportDataset();
  const openTenders = ds.tenders.filter(t => t.status === 'Open').length;
  const submittedBids = ds.bids.filter(b => b.status !== 'Draft').length;
  const draftBids = ds.bids.filter(b => b.status === 'Draft').length;
  const activeContracts = ds.contracts.length;
  const paidDeliveries = ds.deliveries.filter(d => d.payment === 'Paid').length;
  const completedStages = ds.stageProgress.filter(s => s.status === 'Completed').length;

  return `<div class="vendor-reports">
    <div class="report-toolbar">
      <div>
        <p class="report-toolbar-lead">Vendor analytics for <strong>${ds.vendor?.name || 'MediSupply India Pvt Ltd'}</strong> · ${ds.category === 'All' ? 'All categories' : ds.category}</p>
        <p class="report-toolbar-meta">Generated ${formatDateDMY(APP_TODAY)} · VND-MP-000123</p>
      </div>
      <div class="report-toolbar-actions">
        <button type="button" class="btn btn-outline" onclick="downloadVendorReportPack('excel')"><i class="fa-solid fa-file-excel"></i> Excel Pack</button>
        <button type="button" class="btn btn-primary" onclick="downloadVendorReportPack('pdf')"><i class="fa-solid fa-file-pdf"></i> PDF Pack</button>
      </div>
    </div>

    <div class="kpi-grid kpi-grid--vendor mb-2">
      <div class="kpi-card blue"><div class="kpi-label">Tenders Visible</div><div class="kpi-value">${ds.tenders.length}</div><div class="kpi-change">Open: ${openTenders}</div></div>
      <div class="kpi-card teal"><div class="kpi-label">Bids Submitted</div><div class="kpi-value">${submittedBids}</div><div class="kpi-change">Draft: ${draftBids}</div></div>
      <div class="kpi-card orange"><div class="kpi-label">Active Contracts</div><div class="kpi-value">${activeContracts}</div><div class="kpi-change">Deliveries: ${ds.deliveries.length}</div></div>
      <div class="kpi-card green"><div class="kpi-label">Lifecycle Progress</div><div class="kpi-value">${completedStages}/9</div><div class="kpi-change up">Stages completed</div></div>
    </div>

    <!-- Report 1: Bid Participation -->
    <section class="report-section" id="reportBidParticipation">
      <div class="report-section-header">
        <div>
          <span class="report-eyebrow">Report 01</span>
          <h3>Bid Participation &amp; Clarifications</h3>
          <p>Combines Tender Discovery, Bid Submission, and Clarifications across your bidder lifecycle.</p>
        </div>
        <div class="report-section-actions">
          <button type="button" class="btn btn-outline btn-sm" onclick="downloadVendorReport('bid','excel')"><i class="fa-solid fa-file-excel"></i> Excel</button>
          <button type="button" class="btn btn-outline btn-sm" onclick="downloadVendorReport('bid','pdf')"><i class="fa-solid fa-file-pdf"></i> PDF</button>
        </div>
      </div>
      <div class="chart-grid">
        <div class="chart-card">
          <div class="chart-header"><h3>Tender Pipeline by Status</h3></div>
          <div class="chart-container"><canvas id="chartVendorTenderStatus"></canvas></div>
        </div>
        <div class="chart-card">
          <div class="chart-header"><h3>Bid Status Mix</h3></div>
          <div class="chart-container"><canvas id="chartVendorBidMix"></canvas></div>
        </div>
      </div>
      <div class="data-table-wrap mt-2">
        <table class="data-table" id="tblBidParticipation">
          <thead>
            <tr><th>Tender</th><th>Category</th><th>Technical</th><th>Financial</th><th>EMD</th><th>Deadline</th><th>Status</th></tr>
          </thead>
          <tbody>
            ${ds.bids.length ? ds.bids.map(b => `<tr>
              <td><strong>${b.tenderId}</strong></td>
              <td>${b.category}</td>
              <td>${b.technical}</td>
              <td>${b.financial}</td>
              <td>${b.emd}</td>
              <td>${formatDateDMY(b.deadline)}</td>
              <td><span class="badge badge-${b.status === 'Draft' ? 'warning' : 'info'}">${b.status}</span></td>
            </tr>`).join('') : emptyTableRow(7)}
          </tbody>
        </table>
      </div>
      <div class="data-table-wrap mt-2">
        <table class="data-table" id="tblClarifications">
          <thead><tr><th>Query ID</th><th>Tender</th><th>Category</th><th>Subject</th><th>Status</th></tr></thead>
          <tbody>
            ${ds.clarifications.length ? ds.clarifications.map(c => `<tr>
              <td>${c.id}</td><td>${c.tenderId}</td><td>${c.category}</td><td>${c.subject}</td>
              <td><span class="badge badge-${c.status === 'Answered' ? 'success' : c.status === 'Pending' ? 'warning' : 'info'}">${c.status}</span></td>
            </tr>`).join('') : emptyTableRow(5)}
          </tbody>
        </table>
      </div>
    </section>

    <!-- Report 2: Execution -->
    <section class="report-section" id="reportExecution">
      <div class="report-section-header">
        <div>
          <span class="report-eyebrow">Report 02</span>
          <h3>Contract Execution &amp; Delivery Performance</h3>
          <p>Combines Contracts &amp; POs, Delivery &amp; Invoices, and payment outcomes.</p>
        </div>
        <div class="report-section-actions">
          <button type="button" class="btn btn-outline btn-sm" onclick="downloadVendorReport('execution','excel')"><i class="fa-solid fa-file-excel"></i> Excel</button>
          <button type="button" class="btn btn-outline btn-sm" onclick="downloadVendorReport('execution','pdf')"><i class="fa-solid fa-file-pdf"></i> PDF</button>
        </div>
      </div>
      <div class="chart-grid">
        <div class="chart-card full">
          <div class="chart-header"><h3>Delivery &amp; Payment Outcomes</h3></div>
          <div class="chart-container"><canvas id="chartVendorDeliveryPay"></canvas></div>
        </div>
      </div>
      <div class="data-table-wrap mt-2">
        <table class="data-table" id="tblContracts">
          <thead><tr><th>Contract ID</th><th>Tender</th><th>Category</th><th>Value</th><th>PBG</th><th>Delivery</th><th>Status</th></tr></thead>
          <tbody>
            ${ds.contracts.length ? ds.contracts.map(c => `<tr>
              <td><strong>${c.id}</strong></td><td>${c.tenderId}</td><td>${c.category}</td><td>${c.value}</td>
              <td>${c.pbg}</td><td>${c.delivery}</td>
              <td><span class="badge badge-${c.status === 'In Progress' ? 'warning' : 'success'}">${c.status}</span></td>
            </tr>`).join('') : emptyTableRow(7)}
          </tbody>
        </table>
      </div>
      <div class="data-table-wrap mt-2">
        <table class="data-table" id="tblDeliveries">
          <thead><tr><th>Delivery Challan ID</th><th>PO</th><th>Category</th><th>Items</th><th>GRN</th><th>Invoice</th><th>Payment</th></tr></thead>
          <tbody>
            ${ds.deliveries.length ? ds.deliveries.map(d => `<tr>
              <td><strong>${d.id}</strong></td><td>${d.po}</td><td>${d.category}</td><td>${d.items}</td>
              <td>${d.grn}</td><td>${d.invoice}</td><td>${d.payment}</td>
            </tr>`).join('') : emptyTableRow(7)}
          </tbody>
        </table>
      </div>
      <p class="report-footnote"><i class="fa-solid fa-circle-info"></i> Paid deliveries in filter: <strong>${paidDeliveries}</strong> · Overall vendor score: <strong>${ds.vendor?.overall || 90.1}</strong></p>
    </section>
  </div>`;
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function downloadCsv(filename, headers, rows) {
  const lines = [
    headers.map(csvEscape).join(','),
    ...rows.map(r => r.map(csvEscape).join(','))
  ];
  const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function buildVendorReportTables(kind) {
  const ds = getVendorReportDataset();
  if (kind === 'bid') {
    return {
      title: 'Bid Participation & Clarifications',
      sheets: [
        {
          name: 'Bids',
          headers: ['Tender', 'Category', 'Technical', 'Financial', 'EMD', 'Deadline', 'Status'],
          rows: ds.bids.map(b => [b.tenderId, b.category, b.technical, b.financial, b.emd, formatDateDMY(b.deadline), b.status])
        },
        {
          name: 'Clarifications',
          headers: ['Query ID', 'Tender', 'Category', 'Subject', 'Status'],
          rows: ds.clarifications.map(c => [c.id, c.tenderId, c.category, c.subject, c.status])
        }
      ]
    };
  }
  if (kind === 'execution') {
    return {
      title: 'Contract Execution & Delivery Performance',
      sheets: [
        {
          name: 'Contracts',
          headers: ['Contract ID', 'Tender', 'Category', 'Value', 'PBG', 'Delivery', 'Status'],
          rows: ds.contracts.map(c => [c.id, c.tenderId, c.category, c.value, c.pbg, c.delivery, c.status])
        },
        {
          name: 'Deliveries',
          headers: ['Delivery Challan ID', 'PO', 'Category', 'Items', 'GRN', 'Invoice', 'Payment'],
          rows: ds.deliveries.map(d => [d.id, d.po, d.category, d.items, d.grn, d.invoice, d.payment])
        }
      ]
    };
  }
  return buildVendorReportTables('bid');
}

function downloadVendorReport(kind, format) {
  const pack = buildVendorReportTables(kind);
  const stamp = APP_TODAY.replace(/-/g, '');
  if (format === 'excel') {
    pack.sheets.forEach((sheet, i) => {
      setTimeout(() => {
        downloadCsv(`MPHP_${kind}_${sheet.name}_${stamp}.csv`, sheet.headers, sheet.rows);
      }, i * 200);
    });
    showWfAlert(`${pack.title} exported as Excel-compatible CSV (${pack.sheets.length} file${pack.sheets.length > 1 ? 's' : ''}).`, 'success');
    return;
  }
  openVendorReportPdf(pack);
}

function downloadVendorReportPack(format) {
  ['bid', 'execution'].forEach((kind, i) => {
    setTimeout(() => downloadVendorReport(kind, format), i * (format === 'excel' ? 500 : 350));
  });
}

function buildGovReportTables(kind) {
  const ds = getGovReportDataset();
  if (kind === 'lifecycle') {
    return {
      title: 'Procurement Lifecycle & Financial Analytics',
      sheets: [
        {
          name: 'Workflow_Stages',
          headers: ['Stage', 'Step', 'Description', 'Status'],
          rows: ds.workflow.map(s => [s.id, s.name, s.desc, s.status === 'done' ? 'Completed' : s.status === 'active' ? 'In Progress' : 'Pending'])
        },
        {
          name: 'District_Spend',
          headers: ['District', 'Facility', 'Drugs (Cr)', 'Equipment', 'Services', 'Consumables', 'Others'],
          rows: ds.districtSpend.map(d => [d.district, d.facility, d.drugs, d.equipment, d.services, d.consumables, d.others])
        }
      ]
    };
  }
  if (kind === 'sourcing') {
    return {
      title: 'Vendor Onboarding & Sourcing Pipeline',
      sheets: [
        {
          name: 'Vendor_Registrations',
          headers: ['Registration ID', 'Vendor', 'Category', 'KYC', 'Documents', 'Submitted'],
          rows: ds.registrations.map(r => [r.id, r.name, r.category, r.kyc, r.documents, formatDateDMY(r.submitted)])
        },
        {
          name: 'Tenders',
          headers: ['Tender ID', 'Title', 'Category', 'Value', 'Bids', 'Deadline', 'Status'],
          rows: ds.tenders.map(t => [t.id, t.title, t.category, t.value, t.bids, formatDateDMY(t.deadline), t.status])
        },
        {
          name: 'Pending_Approvals',
          headers: ['PR ID', 'Title', 'Category', 'Stage', 'Amount', 'Age', 'Owner'],
          rows: ds.pendingApprovals.map(a => [a.id, a.title, a.category, a.stage, a.amount, a.age, a.owner])
        },
        {
          name: 'Payment_Delays',
          headers: ['Invoice', 'Vendor', 'Category', 'Amount', 'Days Overdue', 'Reason', 'Contract'],
          rows: ds.paymentDelays.map(p => [p.id, p.vendor, p.category, p.amount, p.daysOverdue, p.reason, p.contractId])
        }
      ]
    };
  }
  if (kind === 'operations') {
    return {
      title: 'Operations, SLA & Vendor Performance',
      sheets: [
        {
          name: 'Work_Queue',
          headers: ['Alert', 'Category', 'Severity', 'Owner', 'Timeline', 'Detail'],
          rows: ds.workQueue.map(w => [w.title, w.category, w.severity, w.owner, w.timeline, w.detail])
        },
        {
          name: 'SLA_Threads',
          headers: ['Thread ID', 'Subject', 'Contract', 'Level', 'Priority', 'Status', 'Last Update'],
          rows: ds.slaThreads.map(t => [t.id, t.subject, t.contractId, `L${t.level}`, t.priority, t.status, t.lastUpdate])
        },
        {
          name: 'Vendor_Performance',
          headers: ['Vendor ID', 'Name', 'Category', 'Quality', 'Lead Time', 'Cost', 'Regulatory', 'Satisfaction', 'Overall', 'Status'],
          rows: ds.vendors.map(v => [v.id, v.name, v.category, v.quality, v.leadTime, v.cost, v.regulatory, v.satisfaction, v.overall, v.status])
        }
      ]
    };
  }
  return buildGovReportTables('lifecycle');
}

function downloadGovReport(kind, format) {
  const pack = buildGovReportTables(kind);
  const stamp = APP_TODAY.replace(/-/g, '');
  if (format === 'excel') {
    pack.sheets.forEach((sheet, i) => {
      setTimeout(() => {
        downloadCsv(`MPHP_GOV_${kind}_${sheet.name}_${stamp}.csv`, sheet.headers, sheet.rows);
      }, i * 200);
    });
    showWfAlert(`${pack.title} exported as Excel-compatible CSV (${pack.sheets.length} file${pack.sheets.length > 1 ? 's' : ''}).`, 'success');
    return;
  }
  openGovReportPdf(pack);
}

function downloadGovReportPack(format) {
  ['lifecycle', 'sourcing', 'operations'].forEach((kind, i) => {
    setTimeout(() => downloadGovReport(kind, format), i * (format === 'excel' ? 600 : 400));
  });
}

function openGovReportPdf(pack) {
  const ds = getGovReportDataset();
  const tablesHtml = pack.sheets.map(sheet => `
    <h3 style="margin:18px 0 8px;font-size:14px;color:#0d47a1">${sheet.name.replace(/_/g, ' ')}</h3>
    <table style="width:100%;border-collapse:collapse;font-size:11px">
      <thead>
        <tr>${sheet.headers.map(h => `<th style="border:1px solid #cbd5e1;background:#f1f5f9;padding:6px 8px;text-align:left">${h}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${sheet.rows.map(r => `<tr>${r.map(c => `<td style="border:1px solid #e2e8f0;padding:6px 8px">${c}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${sheet.headers.length}" style="padding:8px;color:#64748b">No records</td></tr>`}
      </tbody>
    </table>
  `).join('');

  const win = window.open('', '_blank', 'noopener,noreferrer,width=960,height=720');
  if (!win) {
    showWfAlert('Please allow pop-ups to download the PDF report.');
    return;
  }
  win.document.write(`<!DOCTYPE html><html><head><title>${pack.title}</title>
    <style>
      body{font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;padding:24px;margin:0}
      h1{font-size:20px;margin:0 0 4px}
      .meta{color:#64748b;font-size:12px;margin-bottom:16px}
      .actions{margin:16px 0 20px}
      .actions button{padding:8px 14px;border-radius:8px;border:1px solid #cbd5e1;background:#0d47a1;color:#fff;cursor:pointer;font-weight:600}
      @media print{.actions{display:none} body{padding:0}}
    </style>
  </head><body>
    <h1>MP Health Procurement — ${pack.title}</h1>
    <div class="meta">Resource Manager · Category: ${ds.category} · Period: ${getAnalyticsContextLabel()} · Generated: ${formatDateDMY(APP_TODAY)}</div>
    <div class="actions"><button onclick="window.print()">Download / Print PDF</button></div>
    ${tablesHtml}
    <script>setTimeout(function(){ window.print(); }, 350);<\/script>
  </body></html>`);
  win.document.close();
}

function openVendorReportPdf(pack) {
  const ds = getVendorReportDataset();
  const tablesHtml = pack.sheets.map(sheet => `
    <h3 style="margin:18px 0 8px;font-size:14px;color:#0d47a1">${sheet.name}</h3>
    <table style="width:100%;border-collapse:collapse;font-size:11px">
      <thead>
        <tr>${sheet.headers.map(h => `<th style="border:1px solid #cbd5e1;background:#f1f5f9;padding:6px 8px;text-align:left">${h}</th>`).join('')}</tr>
      </thead>
      <tbody>
        ${sheet.rows.map(r => `<tr>${r.map(c => `<td style="border:1px solid #e2e8f0;padding:6px 8px">${c}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${sheet.headers.length}" style="padding:8px;color:#64748b">No records</td></tr>`}
      </tbody>
    </table>
  `).join('');

  const win = window.open('', '_blank', 'noopener,noreferrer,width=960,height=720');
  if (!win) {
    showWfAlert('Please allow pop-ups to download the PDF report.');
    return;
  }
  win.document.write(`<!DOCTYPE html><html><head><title>${pack.title}</title>
    <style>
      body{font-family:'Segoe UI',Arial,sans-serif;color:#0f172a;padding:24px;margin:0}
      h1{font-size:20px;margin:0 0 4px}
      .meta{color:#64748b;font-size:12px;margin-bottom:16px}
      .actions{margin:16px 0 20px}
      .actions button{padding:8px 14px;border-radius:8px;border:1px solid #cbd5e1;background:#0d47a1;color:#fff;cursor:pointer;font-weight:600}
      @media print{.actions{display:none} body{padding:0}}
    </style>
  </head><body>
    <h1>MP Health Procurement — ${pack.title}</h1>
    <div class="meta">Vendor: ${ds.vendor?.name || 'MediSupply India Pvt Ltd'} · ID: VND-MP-000123 · Category: ${ds.category} · Generated: ${formatDateDMY(APP_TODAY)}</div>
    <div class="actions"><button onclick="window.print()">Download / Print PDF</button></div>
    ${tablesHtml}
    <script>setTimeout(function(){ window.print(); }, 350);<\/script>
  </body></html>`);
  win.document.close();
}

function renderSettings() {
  return `<div class="wf-detail"><h3>Branding & Configuration</h3>
    <div class="form-grid mt-2">
      <div class="form-group"><label>Organization Name</label><input type="text" value="MP Health Procurement"></div>
      <div class="form-group"><label>Solution Branding</label><input type="text" value="MP Health Procurement Solution"></div>
      <div class="form-group full"><label>Logo</label><input type="file" accept="image/*"></div>
      <div class="form-group"><label>Primary Color</label><input type="color" value="#0d47a1"></div>
      <div class="form-group"><label>Accent Color</label><input type="color" value="#00bfa5"></div>
    </div>
    <div class="wf-actions mt-2"><button class="btn btn-primary">Save Configuration</button></div>
  </div>`;
}

function renderRegistration() {
  const p = vendorProfileState;
  const editing = p.editing;
  return `<div class="profile-kyc">
    <div class="profile-kyc-header">
      <div>
        <h3>Vendor Profile — ${p.vendorId}</h3>
        <p>Core identity fields are locked. Edit only Drug License, ISO 13485, or Bank Account via document upload + OCR confirmation.</p>
      </div>
      <span class="badge badge-success">Verified Profile</span>
    </div>
    <div class="profile-readonly-grid">
      <div class="profile-field is-locked">
        <span class="profile-field-label">Company Name</span>
        <strong>${p.company}</strong>
      </div>
      <div class="profile-field is-locked">
        <span class="profile-field-label">Vendor ID</span>
        <strong>${p.vendorId}</strong>
      </div>
      <div class="profile-field is-locked">
        <span class="profile-field-label">GSTIN</span>
        <strong>${p.gstin}</strong>
      </div>
      <div class="profile-field is-locked">
        <span class="profile-field-label">PAN</span>
        <strong>${p.pan}</strong>
      </div>
      <div class="profile-field ${editing ? 'is-editable' : ''}">
        <span class="profile-field-label">Drug License ${editing ? '<span class="badge badge-info">Editable</span>' : ''}</span>
        <strong>${p.drugLicense}</strong>
        <small class="profile-field-meta" style="color:var(--danger)">Expires: ${p.drugExpiry}</small>
      </div>
      <div class="profile-field ${editing ? 'is-editable' : ''}">
        <span class="profile-field-label">ISO 13485 ${editing ? '<span class="badge badge-info">Editable</span>' : ''}</span>
        <strong>${p.iso}</strong>
        <small class="profile-field-meta" style="color:var(--warning)">${p.isoNote}</small>
      </div>
      <div class="profile-field full ${editing ? 'is-editable' : ''}">
        <span class="profile-field-label">Bank Account (Verified) ${editing ? '<span class="badge badge-info">Editable</span>' : ''}</span>
        <strong>${p.bank}</strong>
      </div>
    </div>
    ${editing ? `
    <div class="profile-edit-panel">
      <h4><i class="fa-solid fa-file-arrow-up"></i> Upload document to update editable fields</h4>
      <p>Select which field to update, upload the source document, review OCR results, then confirm.</p>
      <div class="profile-edit-actions">
        <button type="button" class="btn btn-outline" onclick="startProfileFieldUpload('drug')">Upload Drug License</button>
        <button type="button" class="btn btn-outline" onclick="startProfileFieldUpload('iso')">Upload ISO 13485 Certificate</button>
        <button type="button" class="btn btn-outline" onclick="startProfileFieldUpload('bank')">Upload Bank Proof</button>
      </div>
    </div>` : ''}
    <div class="wf-actions mt-2">
      ${editing
        ? `<button class="btn btn-outline" onclick="cancelProfileEdit()">Cancel Edit</button>`
        : `<button class="btn btn-primary" onclick="enableProfileEdit()"><i class="fa-solid fa-pen"></i> Edit</button>`}
    </div>
  </div>`;
}

function enableProfileEdit() {
  vendorProfileState.editing = true;
  renderPageContent();
}

function cancelProfileEdit() {
  vendorProfileState.editing = false;
  vendorProfileState.pendingEdit = null;
  renderPageContent();
}

function startProfileFieldUpload(field) {
  const meta = {
    drug: {
      title: 'Upload Drug License',
      lead: 'Upload a clear scan of the drug / trade license. OCR will extract license number and expiry.',
      preview: { drugLicense: 'DL-MH-2024-1102', drugExpiry: '20-06-2028' }
    },
    iso: {
      title: 'Upload ISO 13485 Certificate',
      lead: 'Upload the ISO 13485 certificate. OCR will extract certification status and validity.',
      preview: { iso: 'Certified — Renewed', isoNote: 'Valid until 15-08-2027' }
    },
    bank: {
      title: 'Upload Bank Account Proof',
      lead: 'Upload cancelled cheque or bank letter. OCR will extract account details.',
      preview: { bank: 'HDFC Bank - ****7891 (Verified)' }
    }
  }[field];
  if (!meta) return;

  openModal(meta.title, `
    <div class="upload-modal">
      <p class="upload-modal-lead">${meta.lead}</p>
      <div class="upload-dropzone" onclick="document.getElementById('profileUploadInput').click()">
        <i class="fa-solid fa-cloud-arrow-up"></i>
        <strong>Click to select document</strong>
        <span>PDF, JPG, PNG · Max 10 MB</span>
        <input type="file" id="profileUploadInput" class="upload-file-input" accept=".pdf,.jpg,.jpeg,.png" />
      </div>
      <div id="profileUploadList" class="upload-file-list"></div>
      <div class="upload-modal-actions">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn btn-primary" onclick="runProfileOcr('${field}')">Extract with OCR</button>
      </div>
    </div>
  `, { wide: true });

  vendorProfileState.pendingEdit = { field, preview: meta.preview };
  const input = document.getElementById('profileUploadInput');
  const list = document.getElementById('profileUploadList');
  input?.addEventListener('change', () => {
    const f = input.files?.[0];
    list.innerHTML = f ? `<div class="upload-file-item"><i class="fa-solid fa-file"></i> ${f.name}</div>` : '';
  });
}

function runProfileOcr(field) {
  const file = document.getElementById('profileUploadInput')?.files?.[0];
  if (!file) {
    showWfAlert('Please select a document to upload before running OCR.');
    return;
  }
  const pending = vendorProfileState.pendingEdit;
  if (!pending || pending.field !== field) return;

  const rows = Object.entries(pending.preview).map(([k, v]) => {
    const labels = {
      drugLicense: 'Drug License',
      drugExpiry: 'License Expiry',
      iso: 'ISO 13485',
      isoNote: 'Validity',
      bank: 'Bank Account'
    };
    return `<tr><td>${labels[k] || k}</td><td><strong>${v}</strong></td></tr>`;
  }).join('');

  openModal('Confirm OCR Extracted Information', `
    <div class="upload-modal">
      <p class="upload-modal-lead">Review the information extracted from <strong>${file.name}</strong>. Confirm to update your profile.</p>
      <div class="award-table-wrap">
        <table class="data-table award-table">
          <thead><tr><th>Field</th><th>Extracted Value</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="upload-modal-actions">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn btn-primary" onclick="confirmProfileOcrSave()">Confirm &amp; Save</button>
      </div>
    </div>
  `, { wide: true });
}

function confirmProfileOcrSave() {
  const pending = vendorProfileState.pendingEdit;
  if (!pending?.preview) return;
  Object.assign(vendorProfileState, pending.preview);
  vendorProfileState.pendingEdit = null;
  vendorProfileState.editing = false;
  closeModal();
  showWfAlert('Profile updated successfully from OCR-confirmed document.', 'success');
  renderPageContent();
}

function renderTenders() {
  let tenders = filterByCategory(TENDERS);
  tenders = filterTendersByStatus(tenders);
  const emptyLabel = tenderStatusFilter === 'all' ? 'tenders' : `${tenderStatusFilter} tenders`;
  return `<div class="cards-grid">
      ${tenders.length ? tenders.map(t => `<div class="info-card info-card--interactive" role="button" tabindex="0" onclick="openTenderDetail('${t.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openTenderDetail('${t.id}')}">
        <h4>${t.id}</h4><p>${t.title}</p>
        <div class="card-meta"><span>${t.category} · ${t.value}</span><span class="badge badge-${tenderBadgeClass(t.status)}">${t.status}</span></div>
        <div class="card-meta"><span>Deadline: ${formatDateDMY(t.deadline)}</span></div>
      </div>`).join('') : `<div class="empty-state-card"><i class="fa-solid fa-inbox"></i><p>No ${emptyLabel} found${currentCategory !== 'All' ? ' for ' + currentCategory : ''}.</p></div>`}
    </div>`;
}

function renderBids() {
  const bids = filterByCategory(BIDS);
  return `<div class="data-table-wrap">
      <table class="data-table">
        <thead><tr><th>Tender</th><th>Category</th><th>Technical</th><th>Financial</th><th>EMD</th><th>Deadline</th><th>Status</th></tr></thead>
        <tbody>
          ${bids.length ? bids.map(b => `<tr>
            <td><strong>${b.tenderId}</strong></td><td>${b.category}</td>
            <td><span class="badge badge-${b.technical === 'Complete' || b.technical === 'Submitted' ? 'success' : 'warning'}">${b.technical}</span></td>
            <td><span class="badge badge-${b.financial === 'Sealed' ? 'muted' : 'success'}">${b.financial === 'Sealed' ? '<i class="fa-solid fa-lock"></i> Sealed' : b.financial}</span></td>
            <td><span class="badge badge-${b.emd === 'Paid' ? 'success' : 'warning'}">${b.emd}</span></td>
            <td>${formatDateDMY(b.deadline)}</td>
            <td><span class="badge badge-${b.status === 'Draft' ? 'warning' : 'info'}">${b.status}</span></td>
          </tr>`).join('') : emptyTableRow(7)}
        </tbody>
      </table>
    </div>`;
}

function renderClarifications() {
  const items = filterByCategory(CLARIFICATIONS);
  return `<div class="data-table-wrap">
      <table class="data-table">
        <thead><tr><th>Query ID</th><th>Tender</th><th>Category</th><th>Subject</th><th>Status</th><th>Response</th></tr></thead>
        <tbody>
          ${items.length ? items.map(c => `<tr>
            <td>${c.id}</td><td>${c.tenderId}</td><td>${c.category}</td><td>${c.subject}</td>
            <td><span class="badge badge-${c.status === 'Answered' ? 'success' : c.status === 'Pending' ? 'warning' : 'info'}">${c.status}</span></td>
            <td>${c.response}</td>
          </tr>`).join('') : emptyTableRow(6)}
        </tbody>
      </table>
    </div>`;
}

function renderContracts() {
  const contracts = filterByCategory(CONTRACTS);
  return `<div class="data-table-wrap">
      <table class="data-table">
        <thead><tr><th>Contract ID</th><th>Tender</th><th>Category</th><th>Value</th><th>PBG</th><th>Delivery</th><th>Status</th></tr></thead>
        <tbody>
          ${contracts.length ? contracts.map(c => `<tr>
            <td><strong>${c.id}</strong></td><td>${c.tenderId}</td><td>${c.category}</td><td>${c.value}</td>
            <td><span class="badge badge-${c.pbg === 'Active' ? 'success' : 'warning'}">${c.pbg}</span></td>
            <td>${c.delivery}</td>
            <td><span class="badge badge-${c.status === 'In Progress' ? 'warning' : 'success'}">${c.status}</span></td>
          </tr>`).join('') : emptyTableRow(7)}
        </tbody>
      </table>
    </div>`;
}

function renderDelivery() {
  const deliveries = filterByCategory(DELIVERIES);
  return `<div class="data-table-wrap">
      <table class="data-table">
        <thead><tr><th>Delivery Challan ID</th><th>PO Reference</th><th>Category</th><th>Items</th><th>GRN Status</th><th>Invoice</th><th>Payment</th></tr></thead>
        <tbody>
          ${deliveries.length ? deliveries.map(d => `<tr>
            <td><strong>${d.id}</strong></td><td>${d.po}</td><td>${d.category}</td><td>${d.items}</td>
            <td><span class="badge badge-${d.grn === 'Accepted' ? 'success' : 'warning'}">${d.grn}</span></td>
            <td>${d.invoice}</td>
            <td><span class="badge badge-${d.payment === 'Paid' ? 'success' : d.payment === 'Processing' ? 'warning' : 'muted'}">${d.payment}</span></td>
          </tr>`).join('') : emptyTableRow(7)}
        </tbody>
      </table>
    </div>`;
}

function renderPerformance() {
  return renderPerformanceBreakdown(VENDORS[0]);
}

function getWorkQueueSource() {
  if (currentRole === 'gov' && typeof GOV_WORK_QUEUE !== 'undefined') return GOV_WORK_QUEUE;
  return typeof VENDOR_WORK_QUEUE !== 'undefined' ? VENDOR_WORK_QUEUE : [];
}

function getSlaHierarchy() {
  if (currentRole === 'gov' && typeof GOV_SLA_HIERARCHY !== 'undefined') return GOV_SLA_HIERARCHY;
  return typeof SLA_HIERARCHY !== 'undefined' ? SLA_HIERARCHY : [];
}

function getWorkQueueTabs() {
  if (currentRole === 'gov') {
    return [
      ['all', 'All'],
      ['unread', 'Unread'],
      ['approvals', 'Approvals'],
      ['payments', 'Payments'],
      ['sla', 'SLA'],
      ['vendors', 'Vendors'],
      ['tenders', 'Tenders']
    ];
  }
  return [
    ['all', 'All'],
    ['unread', 'Unread'],
    ['milestones', 'Milestones'],
    ['sla', 'SLA'],
    ['payments', 'Payments'],
    ['system', 'System']
  ];
}

function workQueueSeverityMeta(severity) {
  if (severity === 'high') return { icon: 'fa-circle-exclamation', cls: 'wq-sev--high', label: 'High' };
  if (severity === 'medium') return { icon: 'fa-triangle-exclamation', cls: 'wq-sev--medium', label: 'Medium' };
  return { icon: 'fa-circle-info', cls: 'wq-sev--info', label: 'Info' };
}

function filterWorkQueueItems() {
  const items = getWorkQueueSource();
  if (workQueueFilter === 'all') return items;
  if (workQueueFilter === 'unread') return items.filter(i => i.unread);
  return items.filter(i => i.category === workQueueFilter);
}

function getWorkQueueCounts() {
  const items = getWorkQueueSource();
  const counts = { all: items.length, unread: items.filter(i => i.unread).length };
  getWorkQueueTabs().forEach(([id]) => {
    if (id !== 'all' && id !== 'unread') counts[id] = items.filter(i => i.category === id).length;
  });
  return counts;
}

function renderWorkQueue() {
  const items = filterWorkQueueItems();
  const counts = getWorkQueueCounts();
  const tabs = getWorkQueueTabs();
  const isGov = currentRole === 'gov';
  const allItems = getWorkQueueSource();
  const highCount = allItems.filter(i => i.severity === 'high').length;

  return `<div class="work-queue">
    ${isGov ? `<div class="work-queue-summary">
      <div class="work-queue-stat">
        <span class="work-queue-stat-label">Total alerts</span>
        <strong>${counts.all}</strong>
      </div>
      <div class="work-queue-stat work-queue-stat--warn">
        <span class="work-queue-stat-label">Unread</span>
        <strong>${counts.unread}</strong>
      </div>
      <div class="work-queue-stat work-queue-stat--danger">
        <span class="work-queue-stat-label">High priority</span>
        <strong>${highCount}</strong>
      </div>
      <div class="work-queue-stat work-queue-stat--muted">
        <span class="work-queue-stat-label">SLA breaches</span>
        <strong>${counts.sla || 0}</strong>
      </div>
    </div>` : ''}
    <div class="work-queue-card">
      <div class="work-queue-card-head">
        <div>
          <h3>${isGov ? 'Government alerts & work queue' : 'Alerts and work queue'}</h3>
          <p>${isGov
            ? 'Prioritized actions from Analytics — approvals, payment delays, vendor SLA breaches, and tender pipeline.'
            : 'Prioritized actions grouped by severity, owner, due date and record type.'}</p>
        </div>
        <button type="button" class="btn btn-outline btn-sm" onclick="markAllWorkQueueRead()">Mark all as read</button>
      </div>
      <div class="work-queue-tabs" role="tablist">
        ${tabs.map(([id, label]) => `<button type="button" class="work-queue-tab${workQueueFilter === id ? ' active' : ''}" onclick="setWorkQueueFilter('${id}')">${label} <span>${counts[id] ?? 0}</span></button>`).join('')}
      </div>
      <div class="work-queue-list">
        ${items.length ? items.map(item => {
          const sev = workQueueSeverityMeta(item.severity);
          return `<button type="button" class="work-queue-row${item.unread ? ' is-unread' : ''}" onclick="openWorkQueueItem('${item.id}')">
            <span class="wq-sev ${sev.cls}"><i class="fa-solid ${sev.icon}"></i></span>
            <span class="wq-body">
              <strong>${item.title}</strong>
              <span class="wq-detail">${item.detail}</span>
              ${isGov ? `<span class="wq-owner"><i class="fa-solid fa-user"></i> ${item.owner}</span>` : ''}
            </span>
            <span class="wq-meta">
              <span class="wq-priority">${sev.label}</span>
              <span class="wq-time">${item.timeline}</span>
            </span>
          </button>`;
        }).join('') : `<div class="empty-state-card"><i class="fa-solid fa-inbox"></i><p>No alerts in this filter.</p></div>`}
      </div>
    </div>
  </div>`;
}

function setWorkQueueFilter(filter) {
  workQueueFilter = filter;
  renderPageContent();
}

function markAllWorkQueueRead() {
  getWorkQueueSource().forEach(i => { i.unread = false; });
  renderSidebar();
  renderTopbar();
  renderPageContent();
  showWfAlert('All work queue alerts marked as read.', 'success');
}

function openWorkQueueItem(id) {
  const item = getWorkQueueSource().find(i => i.id === id);
  if (!item) return;
  item.unread = false;
  renderSidebar();
  renderTopbar();
  if (item.actionPage === 'sla-desk') {
    const thread = SLA_THREADS.find(t => t.id === item.ref || t.contractId === item.ref || t.subject.includes(item.ref));
    if (thread) activeSlaThreadId = thread.id;
  }
  if (item.actionPage) navigateTo(item.actionPage);
  else renderPageContent();
}

function renderSlaDesk() {
  const hierarchy = getSlaHierarchy();
  const thread = SLA_THREADS.find(t => t.id === activeSlaThreadId) || SLA_THREADS[0];
  const isGov = currentRole === 'gov';
  const officer = hierarchy.find(h => h.level === thread.level);
  const openCount = SLA_THREADS.filter(t => t.status !== 'Resolved').length;

  return `<div class="sla-desk${isGov ? ' sla-desk--gov' : ''}">
    <div class="sla-hierarchy-card">
      <div class="sla-hierarchy-head">
        <h3><i class="fa-solid fa-sitemap"></i> ${isGov ? 'Internal Response Hierarchy' : 'SLA Escalation Hierarchy'}</h3>
        <p>${isGov
          ? 'Assign and respond to vendor escalations within SLA windows. Escalate internally only when the current level cannot resolve.'
          : 'Communicate with government officers in order. Escalate only after the lower level SLA window lapses.'}</p>
      </div>
      <ol class="sla-hierarchy-list">
        ${hierarchy.map(h => `<li>
          <span class="sla-level">L${h.level}</span>
          <div>
            <strong>${h.role}</strong>
            <span class="sla-org">${h.org}</span>
            <span class="sla-window">${h.sla}</span>
            <span class="sla-contact"><i class="fa-solid fa-envelope"></i> ${h.contact}</span>
          </div>
        </li>`).join('')}
      </ol>
    </div>

    <div class="sla-comm-layout">
      <aside class="sla-thread-list">
        <div class="sla-thread-list-head">
          <h4>${isGov ? 'Vendor escalations' : 'Open threads'} <span class="sla-thread-count">${openCount}</span></h4>
          ${isGov ? '' : `<button type="button" class="btn btn-primary btn-sm" onclick="openNewSlaThreadModal()"><i class="fa-solid fa-plus"></i> New</button>`}
        </div>
        ${SLA_THREADS.map(t => `<button type="button" class="sla-thread-item${t.id === thread.id ? ' active' : ''}" onclick="selectSlaThread('${t.id}')">
          <div class="sla-thread-item-top">
            <strong>${t.subject}</strong>
            <span class="badge badge-${t.status === 'Resolved' ? 'success' : t.status === 'Open' ? 'danger' : 'warning'}">${t.status}</span>
          </div>
          <span class="sla-thread-meta">L${t.level} · ${t.contractId} · ${t.lastUpdate}</span>
          ${isGov ? `<span class="sla-thread-vendor"><i class="fa-solid fa-building"></i> Vendor thread</span>` : ''}
        </button>`).join('')}
      </aside>

      <section class="sla-thread-panel">
        <div class="sla-thread-panel-head">
          <div>
            <h3>${thread.subject}</h3>
            <p>Contract <strong>${thread.contractId}</strong> · Level L${thread.level} (${officer?.role || '—'}) · Priority: <span class="badge badge-${thread.priority === 'High' ? 'danger' : thread.priority === 'Medium' ? 'warning' : 'info'}">${thread.priority}</span></p>
          </div>
          <div class="sla-thread-actions">
            ${isGov && thread.status !== 'Resolved' ? `<button type="button" class="btn btn-outline btn-sm" onclick="resolveSlaThread('${thread.id}')"><i class="fa-solid fa-check"></i> Mark resolved</button>` : ''}
            <span class="badge badge-${thread.status === 'Resolved' ? 'success' : thread.status === 'Open' ? 'danger' : 'warning'}">${thread.status}</span>
          </div>
        </div>
        <div class="sla-messages" id="slaMessages">
          ${thread.messages.map(m => `<div class="sla-msg ${m.from === 'vendor' ? 'sla-msg--vendor' : 'sla-msg--gov'}">
            <div class="sla-msg-meta"><strong>${m.name}</strong> · ${m.role} · ${m.time}</div>
            <div class="sla-msg-body">${m.text}</div>
          </div>`).join('')}
        </div>
        ${thread.status !== 'Resolved' ? `<div class="sla-compose">
          ${customSelectHTML(isGov ? 'Assign / respond as' : 'Escalate to level', 'slaEscalateLevel', hierarchy.map(h => `L${h.level} — ${h.role}`), `L${thread.level} — ${officer?.role || ''}`)}
          <div class="form-group full">
            <label>${isGov ? 'Official response to vendor' : 'Message to government officer'} <span class="req-star">*</span></label>
            <textarea id="slaMessageInput" rows="3" placeholder="${isGov ? 'Provide cure plan, reference documents, and expected resolution date…' : 'Describe the SLA issue, reference documents, and requested action…'}"></textarea>
          </div>
          <div class="sla-compose-actions">
            <button type="button" class="btn btn-outline" onclick="navigateTo('work-queue')">Back to Work Queue</button>
            <button type="button" class="btn btn-primary" onclick="sendSlaMessage()"><i class="fa-solid fa-paper-plane"></i> ${isGov ? 'Send official response' : 'Send to hierarchy'}</button>
          </div>
        </div>` : `<div class="sla-resolved-banner"><i class="fa-solid fa-circle-check"></i> This thread is resolved. No further action required.</div>`}
      </section>
    </div>
  </div>`;
}

function selectSlaThread(id) {
  activeSlaThreadId = id;
  renderPageContent();
}

function openNewSlaThreadModal() {
  if (currentRole === 'gov') return;
  const hierarchy = getSlaHierarchy();
  openModal('Raise SLA Communication', `
    <div class="upload-modal">
      <p class="upload-modal-lead">Start a new escalation with the government hierarchy. Choose the correct SLA level based on issue type.</p>
      <div class="form-grid wf-form-grid">
        ${customSelectHTML('Contract', 'newSlaContract', CONTRACTS.map(c => c.id), CONTRACTS[0]?.id)}
        ${customSelectHTML('Escalate to', 'newSlaLevel', hierarchy.map(h => `L${h.level} — ${h.role}`), 'L2 — Contract Manager')}
        <div class="form-group full"><label>Subject <span class="req-star">*</span></label><input id="newSlaSubject" type="text" placeholder="e.g. Delivery response delay — CNT-2026-0089"></div>
        <div class="form-group full"><label>Details <span class="req-star">*</span></label><textarea id="newSlaDetails" rows="4" placeholder="Summarize the breach, dates, and requested cure…"></textarea></div>
      </div>
      <div class="upload-modal-actions">
        <button type="button" class="btn btn-outline" onclick="closeModal()">Cancel</button>
        <button type="button" class="btn btn-primary" onclick="createSlaThread()">Create Thread</button>
      </div>
    </div>
  `, { wide: true });
  initCustomSelects();
}

function createSlaThread() {
  const subject = document.getElementById('newSlaSubject')?.value?.trim();
  const details = document.getElementById('newSlaDetails')?.value?.trim();
  const contractId = typeof getCustomSelectValue === 'function' ? getCustomSelectValue('newSlaContract') : CONTRACTS[0]?.id;
  const levelLabel = typeof getCustomSelectValue === 'function' ? getCustomSelectValue('newSlaLevel') : 'L2 — Contract Manager';
  const level = parseInt(String(levelLabel).replace(/^L/, ''), 10) || 2;
  if (!subject || !details) {
    showWfAlert('Please enter Subject and Details before creating an SLA thread.');
    return;
  }
  const id = `SLA-2026-${String(100 + SLA_THREADS.length).slice(-3)}`;
  SLA_THREADS.unshift({
    id,
    subject,
    contractId: contractId || 'CNT-2026-0089',
    level,
    status: 'Open',
    priority: level <= 2 ? 'High' : 'Medium',
    lastUpdate: formatDateDMY(APP_TODAY),
    messages: [
      { from: 'vendor', name: 'MediSupply India', role: 'Vendor', time: `${formatDateDMY(APP_TODAY)} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`, text: details }
    ]
  });
  activeSlaThreadId = id;
  closeModal();
  renderSidebar();
  renderPageContent();
  showWfAlert('SLA communication thread created and routed to the selected hierarchy level.', 'success');
}

function sendSlaMessage() {
  const text = document.getElementById('slaMessageInput')?.value?.trim();
  if (!text) {
    showWfAlert(currentRole === 'gov' ? 'Enter an official response before sending.' : 'Enter a message before sending to the government hierarchy.');
    return;
  }
  const thread = SLA_THREADS.find(t => t.id === activeSlaThreadId);
  if (!thread) return;
  const hierarchy = getSlaHierarchy();
  const levelLabel = typeof getCustomSelectValue === 'function' ? getCustomSelectValue('slaEscalateLevel') : '';
  const level = parseInt(String(levelLabel).replace(/^L/, ''), 10);
  if (level) thread.level = level;
  thread.status = 'In Progress';
  thread.lastUpdate = formatDateDMY(APP_TODAY);
  const timeStr = `${formatDateDMY(APP_TODAY)} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;

  if (currentRole === 'gov') {
    const officer = hierarchy.find(h => h.level === thread.level);
    thread.messages.push({
      from: 'gov',
      name: authUser?.name || 'Dr. Rajesh Sharma',
      role: officer?.role || 'Contract Manager',
      time: timeStr,
      text
    });
    renderSidebar();
    renderPageContent();
    showWfAlert(`Official response sent as ${officer?.role || 'government officer'}.`, 'success');
    return;
  }

  thread.messages.push({
    from: 'vendor',
    name: 'MediSupply India',
    role: 'Vendor',
    time: timeStr,
    text
  });
  const officer = hierarchy.find(h => h.level === thread.level);
  if (officer) {
    thread.messages.push({
      from: 'gov',
      name: officer.role === 'Contract Manager' ? 'Rohit Sharma' : officer.role,
      role: officer.role,
      time: timeStr,
      text: `Message received at ${officer.role} desk. We will respond within the defined SLA window (${officer.sla}).`
    });
  }
  renderSidebar();
  renderPageContent();
  showWfAlert(`Message sent to ${officer?.role || 'government hierarchy'}.`, 'success');
}

function resolveSlaThread(id) {
  const thread = SLA_THREADS.find(t => t.id === id);
  if (!thread) return;
  thread.status = 'Resolved';
  thread.lastUpdate = formatDateDMY(APP_TODAY);
  const hierarchy = getSlaHierarchy();
  const officer = hierarchy.find(h => h.level === thread.level);
  thread.messages.push({
    from: 'gov',
    name: authUser?.name || 'Dr. Rajesh Sharma',
    role: officer?.role || 'Contract Manager',
    time: `${formatDateDMY(APP_TODAY)} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`,
    text: 'Case reviewed and closed. Vendor notified of resolution. SLA cure clock stopped.'
  });
  renderSidebar();
  renderPageContent();
  showWfAlert('SLA thread marked as resolved.', 'success');
}

// ========== INTERACTIONS ==========
function setCategory(cat) {
  if (cat === currentCategory) return;
  currentCategory = cat;
  pipelinePage = 1;
  updatePageMeta();
  if (PAGES_WITH_CATEGORY.has(currentPage)) {
    updateCategoryBarInPlace();
    renderPageContent();
  } else {
    renderPage();
  }
}

function setPeriod(period) {
  currentPeriod = period;
  if (currentPage === 'dashboard' || currentPage === 'reports') {
    if (currentRole === 'vendor' && currentPage === 'reports') {
      initVendorReportCharts(currentCategory);
    } else if (isGovAnalyticsPage() && currentPage === 'dashboard') {
      document.querySelectorAll('.analytics-filter .time-btn').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.toLowerCase() === period);
      });
      refreshAllCharts(getAnalyticsChartPeriod(), currentCategory);
      updateChartSubtitles();
    } else if (currentPage === 'vendor-matrix' && currentRole === 'gov') {
      refreshVendorMatrixPage();
    } else {
      refreshAllCharts(period, currentCategory);
    }
    document.querySelectorAll('.time-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.toLowerCase() === period);
    });
  }
}

function setAnalyticsFocusYear(year) {
  analyticsFocusYear = year || 'all';
  analyticsPeriodFocus = 'all';
  if (analyticsFocusYear !== 'all' && !analyticsSliceType) analyticsSliceType = 'quarter';
  currentPeriod = analyticsFocusYear === 'all' ? 'year' : analyticsSliceType;
  if (isGovAnalyticsPage()) {
    renderPageContent();
  }
}

function setAnalyticsSliceType(slice) {
  if (analyticsFocusYear === 'all') return;
  analyticsSliceType = slice === 'month' ? 'month' : 'quarter';
  analyticsPeriodFocus = 'all';
  currentPeriod = analyticsSliceType;
  if (isGovAnalyticsPage()) {
    renderPageContent();
  }
}

function setAnalyticsPeriodFocus(period) {
  if (analyticsFocusYear === 'all') return;
  analyticsPeriodFocus = period || 'all';
  if (currentPage === 'dashboard' && currentRole === 'gov') {
    refreshAllCharts(getAnalyticsChartPeriod(), currentCategory);
    updateChartSubtitles();
    refreshDashboardVendorTable();
    document.querySelectorAll('.analytics-period-row .analytics-fy-chip').forEach(chip => {
      const label = chip.textContent.trim().split(/\s/)[0];
      const isAll = analyticsPeriodFocus === 'all' && label === 'All';
      const isMatch = analyticsPeriodFocus !== 'all' && (label === analyticsPeriodFocus || chip.textContent.includes(analyticsPeriodFocus));
      chip.classList.toggle('active', isAll || isMatch);
    });
  } else if (currentPage === 'vendor-matrix' && currentRole === 'gov') {
    refreshVendorMatrixPage();
  } else if (currentPage === 'reports' && currentRole === 'gov') {
    refreshGovReportsPage();
  }
}

function syncAnalyticsFilterControls() {
  const wrapper = document.querySelector('.custom-select[data-select-id="analyticsFocusYear"]');
  const display = analyticsFocusYear === 'all' ? 'All 10 years' : analyticsFocusYear;
  if (wrapper) {
    const valueEl = wrapper.querySelector('.custom-select-value');
    if (valueEl) valueEl.textContent = display;
    wrapper.querySelectorAll('.custom-select-option').forEach(opt => {
      opt.classList.toggle('selected', opt.dataset.value === display);
    });
  }
  document.querySelectorAll('.analytics-fy-chips:not(.analytics-period-row .analytics-fy-chips) .analytics-fy-chip, .analytics-filter > .analytics-fy-chips .analytics-fy-chip').forEach(chip => {
    const label = chip.textContent.trim();
    const isAll = analyticsFocusYear === 'all' && label.startsWith('All');
    const isYear = analyticsFocusYear !== 'all' && label === analyticsFocusYear.replace('FY', '');
    chip.classList.toggle('active', isAll || isYear);
  });
}

function updateAnalyticsExplorerSubtitle() {
  const subtitle = document.querySelector('#chartAnalyticsCompare')?.closest('.chart-card')?.querySelector('.chart-subtitle');
  if (subtitle && typeof getAnalyticsContextLabel === 'function') {
    const mode = analyticsCompareMode === 'progress' ? 'Tender pipeline' : 'Vendor score comparison';
    subtitle.textContent = `${getAnalyticsContextLabel()} · ${mode}`;
  }
}

function setAnalyticsCompareMode(mode) {
  analyticsCompareMode = mode === 'progress' ? 'progress' : 'vendor';
  if (currentPage === 'dashboard' && currentRole === 'gov') {
    renderPageContent();
  }
}

function toggleAlertPanel() {
  alertPanelOpen = !alertPanelOpen;
  const panel = document.getElementById('alertPanel');
  panel.classList.toggle('open', alertPanelOpen);
  if (alertPanelOpen) renderAlerts();
}

function closeAlertPanel() {
  alertPanelOpen = false;
  document.getElementById('alertPanel')?.classList.remove('open');
}

// ========== GOV NOTICES (website load — before login) ==========
function getPublicGovNotices() {
  if (typeof GOV_NOTICES === 'undefined') return [];
  // Public broadcast: show all active notices (prefer unread first)
  return [...GOV_NOTICES].sort((a, b) => {
    const rank = { critical: 0, high: 1, medium: 2 };
    if (!!b.unread !== !!a.unread) return a.unread ? -1 : 1;
    return (rank[a.priority] ?? 9) - (rank[b.priority] ?? 9);
  });
}

function getUnreadGovNotices() {
  return (typeof GOV_NOTICES !== 'undefined' ? GOV_NOTICES : []).filter(n => n.unread);
}

function isUserLoggedIn() {
  return !!currentRole && document.getElementById('app')?.classList.contains('active');
}

/** Show official government notices on the login / landing page */
function showGovNoticesOnWebsiteLoad(force = false) {
  if (!force && noticesShownThisSession) return;
  const notices = getPublicGovNotices();
  if (!notices.length) return;
  noticesShownThisSession = true;
  openNoticeModal(notices);
}

function openNoticeModal(notices) {
  const overlay = document.getElementById('noticeOverlay');
  const body = document.getElementById('noticeModalBody');
  if (!overlay || !body) return;

  const list = notices || getPublicGovNotices();
  const critical = list.filter(n => n.priority === 'critical').length;
  const unread = list.filter(n => n.unread).length;
  const loggedIn = isUserLoggedIn();

  const continueBtn = document.getElementById('noticeContinueBtn');
  if (continueBtn) {
    continueBtn.textContent = loggedIn ? 'Continue to Dashboard' : 'Continue to Sign In';
  }

  body.innerHTML = `
    <div class="notice-summary">
      <div class="notice-summary-text">
        <strong>${list.length} official notice${list.length === 1 ? '' : 's'}</strong> from the Government / Resource Manager
        ${critical ? `<span class="notice-critical-chip">${critical} critical</span>` : ''}
        ${unread ? `<span class="notice-unread-chip">${unread} new</span>` : ''}
      </div>
      <p>${loggedIn
        ? 'Please review these official communications. You can reopen them anytime from the notification bell.'
        : 'These government announcements are shown to all visitors. Sign in to take action on tenders, bids, or contracts.'}</p>
    </div>
    <div class="notice-list">
      ${list.map(n => renderNoticeCard(n, loggedIn)).join('')}
    </div>
  `;

  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function renderNoticeCard(n, loggedIn) {
  const priorityClass = n.priority === 'critical' ? 'critical' : n.priority === 'high' ? 'high' : 'medium';
  const canAct = loggedIn && n.actionPage;
  return `<article class="notice-card notice-card--${priorityClass}${n.unread ? '' : ' notice-card--read'}" data-notice-id="${n.id}">
    <div class="notice-card-top">
      <span class="notice-priority notice-priority--${priorityClass}">${n.priority}</span>
      <span class="notice-category">${n.category}</span>
      ${n.unread ? '<span class="notice-new-dot">New</span>' : ''}
      <span class="notice-ref">${n.ref}</span>
    </div>
    <h3 class="notice-card-title">${n.title}</h3>
    <p class="notice-card-msg">${n.msg}</p>
    <div class="notice-card-meta">
      <span><i class="fa-solid fa-building-columns"></i> ${n.from}</span>
      <span><i class="fa-regular fa-calendar"></i> ${n.date} · ${n.time}</span>
    </div>
    <div class="notice-card-actions">
      ${n.unread ? `<button type="button" class="btn btn-outline btn-sm" onclick="acknowledgeNotice('${n.id}')">Mark as read</button>` : ''}
      ${canAct
        ? `<button type="button" class="btn btn-primary btn-sm" onclick="actOnNotice('${n.id}','${n.actionPage}')">${n.actionLabel || 'Open'}</button>`
        : `<span class="notice-signin-hint"><i class="fa-solid fa-lock"></i> Sign in to act on this notice</span>`}
    </div>
  </article>`;
}

function acknowledgeNotice(id) {
  const notice = GOV_NOTICES.find(n => n.id === id);
  if (notice) notice.unread = false;

  const related = ALERTS_VENDOR.find(a => a.unread && (
    (notice?.ref && a.msg.includes(notice.ref.split('-').pop())) ||
    a.title.toLowerCase().includes((notice?.category || '').toLowerCase())
  ));
  if (related) related.unread = false;

  if (isUserLoggedIn()) renderTopbar();
  openNoticeModal(getPublicGovNotices());
}

function acknowledgeAllNotices() {
  GOV_NOTICES.forEach(n => { n.unread = false; });
  ALERTS_VENDOR.forEach(a => { a.unread = false; });
  if (isUserLoggedIn()) renderTopbar();
  closeNoticeModal();
}

function actOnNotice(id, page) {
  if (!isUserLoggedIn()) {
    closeNoticeModal();
    return;
  }
  acknowledgeNotice(id);
  closeNoticeModal();
  if (page) navigateTo(page);
}

function closeNoticeModal() {
  const overlay = document.getElementById('noticeOverlay');
  overlay?.classList.remove('open');
  overlay?.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function renderAlerts() {
  const list = document.getElementById('alertList');
  const alerts = currentRole === 'gov' ? ALERTS_GOV : ALERTS_VENDOR;
  list.innerHTML = alerts.map(a => `<div class="alert-item ${a.unread ? 'unread' : ''}" onclick="markAlertRead(${a.id})">
    <div class="alert-type ${a.type}">${a.type}</div>
    <h4>${a.title}</h4>
    <p>${a.msg}</p>
    <div class="alert-meta"><span><i class="fa-regular fa-calendar"></i> ${a.date}</span><span><i class="fa-solid fa-bolt"></i> ${a.impact}</span></div>
    <div class="alert-meta" style="margin-top:0.25rem"><strong>Action:</strong> ${a.action}</div>
  </div>`).join('');
}

function markAlertRead(id) {
  const alerts = currentRole === 'gov' ? ALERTS_GOV : ALERTS_VENDOR;
  const alert = alerts.find(a => a.id === id);
  if (alert) alert.unread = false;
  renderAlerts();
  renderTopbar();
}

function openDrillDown(type, title, content) {
  if (type === 'tender') {
    openTenderDetail(title);
    return;
  }
  if (type === 'categorySpend') {
    openCategorySpendDetail(title);
    return;
  }
  if (type === 'chartPeriod') {
    openChartPeriodDetail(title, content);
    return;
  }
  openModal(title, `<div class="drill-simple"><p>${content}</p></div>`, { wide: false });
}

function getCategoryMetricAverages(vendors) {
  const list = vendors?.length ? vendors : VENDORS;
  const keys = ['quality', 'leadTime', 'cost', 'regulatory', 'satisfaction'];
  const out = {};
  keys.forEach(k => {
    out[k] = list.length
      ? Math.round(list.reduce((s, v) => s + (v[k] || 0), 0) / list.length)
      : 0;
  });
  return out;
}

function filterListByCategory(list) {
  if (currentCategory === 'All') return list;
  return list.filter(x => x.category === currentCategory);
}

function openGovKpiDetail(key) {
  if (key?.startsWith('metric:')) {
    openMetricWeightDetail(key.slice(7));
    return;
  }
  const catLabel = currentCategory === 'All' ? 'All categories' : currentCategory;
  if (key === 'openTenders') {
    const tenders = filterListByCategory(TENDERS).filter(t => t.status === 'Open');

    openModal(`Open Tenders — ${catLabel}`, `
      <div class="kpi-detail">
        <div class="tender-detail-section">
          <h4>Tender details</h4>
          <div class="data-table-wrap kpi-detail-table">
            <table class="data-table data-table--modal">
              <thead><tr><th>S.No</th><th>Tender ID</th><th>Title</th><th>Category</th><th>Value</th><th>Bids</th><th>Deadline</th><th>Status</th></tr></thead>
              <tbody>
                ${tenders.length ? tenders.map((t, i) => `<tr onclick="openTenderDetail('${t.id}')">
                  <td>${i + 1}</td>
                  <td><strong>${t.id}</strong></td>
                  <td>${t.title}</td>
                  <td>${t.category}</td>
                  <td>${t.value}</td>
                  <td>${t.bids}</td>
                  <td>${formatDateDMY(t.deadline)}</td>
                  <td><span class="badge badge-${tenderBadgeClass(t.status)}">${t.status}</span></td>
                </tr>`).join('') : emptyTableRow(8, 'No open tenders for this filter.')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `, { wide: true, large: true });
    return;
  }

  if (key === 'pendingApprovals') {
    const rows = filterListByCategory(PENDING_APPROVALS);
    openModal(`Pending Approvals — ${catLabel}`, `
      <div class="kpi-detail">
        <div class="tender-detail-stats tender-detail-stats--3">
          <div class="tender-stat"><span>Awaiting action</span><strong>${rows.length}</strong></div>
          <div class="tender-stat"><span>Oldest</span><strong>${rows.length ? Math.max(...rows.map(r => parseInt(r.age, 10) || 0)) + ' days' : '—'}</strong></div>
          <div class="tender-stat"><span>Financial sanction</span><strong>${rows.filter(r => r.stage.includes('Financial')).length}</strong></div>
        </div>
        <div class="tender-detail-section">
          <h4>Purchase requisitions in queue</h4>
          <div class="data-table-wrap kpi-detail-table">
            <table class="data-table data-table--modal">
              <thead><tr><th>S.No</th><th>PR ID</th><th>Title</th><th>Category</th><th>Stage</th><th>Amount</th><th>Age</th><th>Owner</th></tr></thead>
              <tbody>
                ${rows.length ? rows.map((r, i) => `<tr>
                  <td>${i + 1}</td>
                  <td><strong>${r.id}</strong></td><td>${r.title}</td><td>${r.category}</td>
                  <td><span class="badge badge-warning">${r.stage}</span></td>
                  <td>${r.amount}</td><td>${r.age}</td><td>${r.owner}</td>
                </tr>`).join('') : emptyTableRow(8)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `, { wide: true, large: true });
    return;
  }

  if (key === 'paymentDelays') {
    const rows = filterListByCategory(PAYMENT_DELAYS);
    openModal(`Payment Delays — ${catLabel}`, `
      <div class="kpi-detail">
        <div class="tender-detail-stats tender-detail-stats--3">
          <div class="tender-stat"><span>Delayed invoices</span><strong>${rows.length}</strong></div>
          <div class="tender-stat"><span>Max overdue</span><strong>${rows.length ? Math.max(...rows.map(r => r.daysOverdue)) + ' days' : '—'}</strong></div>
          <div class="tender-stat"><span>Vendors affected</span><strong>${new Set(rows.map(r => r.vendor)).size}</strong></div>
        </div>
        <div class="tender-detail-section">
          <h4>Invoice hold / delay register</h4>
          <div class="data-table-wrap kpi-detail-table">
            <table class="data-table data-table--modal">
              <thead><tr><th>S.No</th><th>Invoice</th><th>Vendor</th><th>Category</th><th>Amount</th><th>Overdue</th><th>Reason</th><th>Contract</th></tr></thead>
              <tbody>
                ${rows.length ? rows.map((r, i) => `<tr>
                  <td>${i + 1}</td>
                  <td><strong>${r.id}</strong></td><td>${r.vendor}</td><td>${r.category}</td>
                  <td>${r.amount}</td>
                  <td><span class="badge badge-danger">${r.daysOverdue}d</span></td>
                  <td>${r.reason}</td><td>${r.contractId}</td>
                </tr>`).join('') : emptyTableRow(8)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `, { wide: true, large: true });
    return;
  }

  if (key === 'procurementSpend') {
    openCategorySpendDetail(currentCategory === 'All' ? null : currentCategory);
    return;
  }

  if (key === 'avgVendorScore') {
    const vendors = filterByCategory(VENDORS);
    openModal(`Vendor Score — ${catLabel}`, `
      <div class="kpi-detail">
        <div class="tender-detail-section">
          <div class="need-section-head" style="border:none;padding:0 0 0.65rem;background:transparent">
            <h4>Score breakdown by vendor</h4>
            <span class="meta-chip">${vendors.length} vendor${vendors.length !== 1 ? 's' : ''} scored</span>
          </div>
          <div class="data-table-wrap kpi-detail-table kpi-detail-table--scroll">
            <table class="data-table data-table--modal data-table--vendor-score">
              <thead><tr>
                <th>S.No</th>
                <th>Vendor</th>
                <th>Category</th>
                <th>Quality</th>
                <th>Lead Time</th>
                <th>Cost</th>
                <th>Regulatory</th>
                <th>Satisfaction</th>
                <th>Overall</th>
                <th>Status</th>
              </tr></thead>
              <tbody>
                ${vendors.length ? vendors.map((v, i) => `<tr onclick="openVendorDetail('${v.id}')">
                  <td>${i + 1}</td>
                  <td class="cell-vendor"><strong>${v.name}</strong><div class="cell-sub">${v.id}</div></td>
                  <td>${v.category}</td>
                  <td>${v.quality}</td>
                  <td>${v.leadTime}</td>
                  <td>${v.cost}</td>
                  <td>${v.regulatory}</td>
                  <td>${v.satisfaction}</td>
                  <td><strong>${v.overall}</strong></td>
                  <td><span class="badge badge-${v.status === 'Preferred' ? 'success' : v.status === 'Watch' ? 'danger' : 'info'}">${v.status}</span></td>
                </tr>`).join('') : emptyTableRow(10)}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `, { wide: true, large: true, extraWide: true });
  }
}

function openMetricWeightDetail(metricKey) {
  const metric = PERF_METRICS.find(m => m.key === metricKey);
  if (!metric) return;
  const vendors = filterByCategory(VENDORS).slice().sort((a, b) => (b[metricKey] || 0) - (a[metricKey] || 0));
  const avg = vendors.length
    ? Math.round(vendors.reduce((s, v) => s + (v[metricKey] || 0), 0) / vendors.length)
    : 0;
  openModal(`${metric.label} — Performance Matrix`, `
    <div class="kpi-detail">
      <div class="tender-detail-stats tender-detail-stats--3">
        <div class="tender-stat"><span>Weight in overall</span><strong>${metric.weight}%</strong></div>
        <div class="tender-stat"><span>Category avg</span><strong>${avg}</strong></div>
        <div class="tender-stat"><span>Top score</span><strong>${vendors[0] ? vendors[0][metricKey] : '—'}</strong></div>
      </div>
      <div class="tender-detail-section">
        <h4>Vendor ranking on ${metric.label}</h4>
        <div class="data-table-wrap kpi-detail-table">
          <table class="data-table">
            <thead><tr><th>Rank</th><th>Vendor</th><th>Category</th><th>${metric.label}</th><th>Overall</th><th>Status</th></tr></thead>
            <tbody>
              ${vendors.map((v, i) => `<tr onclick="openVendorDetail('${v.id}')">
                <td>${i + 1}</td>
                <td><strong>${v.name}</strong></td>
                <td>${v.category}</td>
                <td><strong>${v[metricKey]}</strong></td>
                <td>${v.overall}</td>
                <td><span class="badge badge-${v.status === 'Preferred' ? 'success' : v.status === 'Watch' ? 'danger' : 'info'}">${v.status}</span></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `, { wide: true });
}

function openCategorySpendDetail(focusCategory) {
  const cat = focusCategory && focusCategory !== 'All' ? focusCategory : null;
  const title = cat ? `${cat} Spend Detail` : 'Category-wise Spend Distribution';
  const amounts = { Drugs: 90.3, Equipment: 60.2, Services: 32.3, Consumables: 21.5, Others: 10.8 };
  const pct = CHART_DATA.categorySpend;
  const cats = cat ? [cat] : pct.labels;
  const items = cat
    ? (CATEGORY_ITEM_TYPES[cat] || []).map(i => ({ ...i, category: cat }))
    : Object.entries(CATEGORY_ITEM_TYPES).flatMap(([c, list]) => list.map(i => ({ ...i, category: c })));

  const districtKey = cat ? cat.toLowerCase() : null;
  const districts = DISTRICT_SPEND.map(d => {
    const value = districtKey
      ? d[districtKey]
      : d.drugs + d.equipment + d.services + d.consumables + d.others;
    return { ...d, value: Math.round(value * 10) / 10 };
  });

  openModal(title, `
    <div class="kpi-detail">
      <div class="tender-detail-stats" style="grid-template-columns:repeat(${Math.min(cats.length, 5)},minmax(0,1fr))">
        ${cats.map(c => {
          const i = pct.labels.indexOf(c);
          return `<div class="tender-stat"><span>${c}</span><strong>₹${amounts[c]} Cr</strong><em>${pct.data[i]}% of total</em></div>`;
        }).join('')}
      </div>
      <div class="tender-detail-section">
        <h4>${cat === 'Drugs' ? 'Types of drugs / items' : 'Item types &amp; tender coverage'}</h4>
        <div class="data-table-wrap kpi-detail-table">
            <table class="data-table data-table--modal">
              <thead><tr><th>S.No</th><th>Item</th><th>Type</th><th>Category</th><th>Linked tenders</th><th>Est. spend</th><th>Facilities</th></tr></thead>
              <tbody>
              ${items.map((i, idx) => `<tr>
                <td>${idx + 1}</td>
                <td><strong>${i.name}</strong></td>
                <td><span class="badge badge-info">${i.type}</span></td>
                <td>${i.category}</td>
                <td>${i.tenders}</td>
                <td>${i.spend}</td>
                <td>${i.facilities}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="tender-detail-section">
        <h4>District &amp; facility spend (₹ Cr)</h4>
        <div class="data-table-wrap kpi-detail-table">
          <table class="data-table data-table--modal">
            <thead><tr><th>S.No</th><th>District</th><th>Facility</th><th>Spend (₹ Cr)</th></tr></thead>
            <tbody>
              ${districts.map((d, i) => `<tr>
                <td>${i + 1}</td>
                <td><strong>${d.district}</strong></td>
                <td>${d.facility}</td>
                <td>₹${d.value} Cr</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <p class="report-footnote"><i class="fa-solid fa-circle-info"></i> Click a category slice on the pie chart anytime to reopen this breakdown for that category.</p>
    </div>
  `, { wide: true, large: true });
}

function openChartTrendDetail(chartKey, seriesLabel, periodLabel, value) {
  const cat = currentCategory === 'All' ? null : currentCategory;
  const catLabel = cat || 'All categories';
  const ctx = getAnalyticsContextLabel();
  const val = value != null ? value : '—';

  if (chartKey === 'spend') {
    const amounts = { Drugs: 90.3, Equipment: 60.2, Services: 32.3, Consumables: 21.5, Others: 10.8 };
    const cats = cat ? [cat] : CHART_DATA.categorySpend.labels;
    const total = cat ? amounts[cat] : Object.values(amounts).reduce((s, v) => s + v, 0);
    const scale = val !== '—' && total ? Number(val) / total : 1;
    const numVal = typeof val === 'number' ? val : Number(val);
    const fmt = Number.isFinite(numVal) ? numVal.toFixed(1) : val;
    const items = cat
      ? (CATEGORY_ITEM_TYPES[cat] || []).slice(0, 5)
      : (CATEGORY_ITEM_TYPES.Drugs || []).slice(0, 4);
    const tenders = filterListByCategory(TENDERS).slice(0, 6);
    openModal(`Spend Trends (Procurement) — ${periodLabel}`, `
      <div class="trend-detail">
        <div class="trend-detail-hero">
          <div>
            <span class="trend-detail-badge">Procurement spend · ₹ Crore</span>
            <h3 class="trend-detail-value">₹${fmt} Cr</h3>
            <p class="trend-detail-desc">Money spent via POs &amp; contracts in <strong>${periodLabel}</strong> · ${ctx}</p>
          </div>
        </div>
        <div class="trend-detail-explain">
          <i class="fa-solid fa-circle-info"></i>
          <p><strong>What this means:</strong> Total procurement outlay for the period — the rupee value of awarded tenders / purchase orders. Unit is <strong>₹ Crore</strong> (1 Cr = ₹1 crore = ₹10 million). This is spend, not savings.</p>
        </div>
        <div class="tender-detail-stats tender-detail-stats--3">
          <div class="tender-stat"><span>Period spend</span><strong>₹${fmt} Cr</strong></div>
          <div class="tender-stat"><span>Category</span><strong>${catLabel}</strong></div>
          <div class="tender-stat"><span>Linked tenders</span><strong>${tenders.length}</strong></div>
        </div>
        <div class="tender-detail-section">
          <h4>Where the money went (by category)</h4>
          <div class="data-table-wrap kpi-detail-table">
            <table class="data-table data-table--modal">
              <thead><tr><th>S.No</th><th>Category</th><th>Spend (₹ Cr)</th><th>Share</th></tr></thead>
              <tbody>
                ${cats.map((c, i) => {
                  const amt = Math.round(amounts[c] * scale * 10) / 10;
                  const share = total ? Math.round((amounts[c] / total) * 100) : 0;
                  return `<tr><td>${i + 1}</td><td><strong>${c}</strong></td><td>₹${amt} Cr</td><td>${share}%</td></tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="tender-detail-section">
          <h4>Key drug / item lines driving spend</h4>
          <div class="data-table-wrap kpi-detail-table">
            <table class="data-table data-table--modal">
              <thead><tr><th>S.No</th><th>Item</th><th>Type</th><th>Est. spend</th><th>Tenders</th></tr></thead>
              <tbody>
                ${items.map((i, idx) => `<tr>
                  <td>${idx + 1}</td>
                  <td><strong>${i.name}</strong></td>
                  <td>${i.type}</td>
                  <td>${i.spend}</td>
                  <td>${i.tenders}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="tender-detail-section">
          <h4>Top districts by spend</h4>
          <div class="data-table-wrap kpi-detail-table">
            <table class="data-table data-table--modal">
              <thead><tr><th>S.No</th><th>District</th><th>Facility</th><th>Spend (₹ Cr)</th></tr></thead>
              <tbody>
                ${DISTRICT_SPEND.slice(0, 6).map((d, i) => {
                  const v = cat
                    ? d[cat.toLowerCase()]
                    : d.drugs + d.equipment + d.services + d.consumables + d.others;
                  return `<tr><td>${i + 1}</td><td><strong>${d.district}</strong></td><td>${d.facility}</td><td>₹${(v * scale).toFixed(1)} Cr</td></tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="tender-detail-actions">
          <button type="button" class="btn btn-primary" onclick="openCategorySpendDetail(${cat ? `'${cat}'` : 'null'})">View full category spend →</button>
        </div>
      </div>
    `, { wide: true, large: true });
    return;
  }

  if (chartKey === 'procurement') {
    const tenders = filterListByCategory(TENDERS).slice(0, 8);
    const open = tenders.filter(t => t.status === 'Open').length;
    const awarded = tenders.filter(t => t.status === 'Awarded').length;
    const evaln = tenders.filter(t => t.status === 'Evaluation').length;
    openModal(`Procurement (Tenders) — ${periodLabel}`, `
      <div class="trend-detail">
        <div class="trend-detail-hero">
          <div>
            <span class="trend-detail-badge">Tenders</span>
            <h3 class="trend-detail-value">${val}</h3>
            <p class="trend-detail-desc">Tenders published or processed in <strong>${periodLabel}</strong> · ${ctx}</p>
          </div>
        </div>
        <div class="trend-detail-explain">
          <i class="fa-solid fa-circle-info"></i>
          <p>Each unit is one <strong>tender</strong> (NIT/RFP) issued or progressed in the period — not individual items or line items.</p>
        </div>
        <div class="tender-detail-stats tender-detail-stats--3">
          <div class="tender-stat"><span>Total tenders</span><strong>${val}</strong></div>
          <div class="tender-stat"><span>Currently open</span><strong>${open}</strong></div>
          <div class="tender-stat"><span>Awarded / in eval</span><strong>${awarded} / ${evaln}</strong></div>
        </div>
        <div class="tender-detail-section">
          <h4>Tender register — ${periodLabel}</h4>
          <div class="data-table-wrap kpi-detail-table">
            <table class="data-table data-table--modal">
              <thead><tr><th>S.No</th><th>Tender ID</th><th>Title</th><th>Category</th><th>Value</th><th>Status</th><th>Bids</th></tr></thead>
              <tbody>
                ${tenders.map((t, i) => `<tr onclick="openTenderDetail('${t.id}')">
                  <td>${i + 1}</td>
                  <td><strong>${t.id}</strong></td>
                  <td>${t.title}</td>
                  <td>${t.category}</td>
                  <td>${t.value}</td>
                  <td><span class="badge badge-${tenderBadgeClass(t.status)}">${t.status}</span></td>
                  <td>${t.bids}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `, { wide: true, large: true });
    return;
  }

  if (chartKey === 'vendorPerf') {
    const vendors = filterByCategory(VENDORS).slice().sort((a, b) => b.overall - a.overall).slice(0, 8);
    const avg = vendors.length ? (vendors.reduce((s, v) => s + v.overall, 0) / vendors.length).toFixed(1) : '—';
    openModal(`Vendor Performance — ${periodLabel}`, `
      <div class="trend-detail">
        <div class="trend-detail-hero">
          <div>
            <span class="trend-detail-badge">Score (0–100)</span>
            <h3 class="trend-detail-value">${val} pts</h3>
            <p class="trend-detail-desc">Weighted average vendor score for <strong>${periodLabel}</strong> · ${ctx}</p>
          </div>
        </div>
        <div class="trend-detail-explain">
          <i class="fa-solid fa-circle-info"></i>
          <p>Score combines Quality (30%), Lead Time (20%), Cost (20%), Regulatory (20%), and User Satisfaction (10%). Higher is better; 80+ is preferred vendor threshold.</p>
        </div>
        <div class="tender-detail-stats tender-detail-stats--3">
          <div class="tender-stat"><span>Period avg</span><strong>${val} pts</strong></div>
          <div class="tender-stat"><span>Vendors scored</span><strong>${vendors.length}</strong></div>
          <div class="tender-stat"><span>Category filter</span><strong>${catLabel}</strong></div>
        </div>
        <div class="tender-detail-section">
          <h4>Vendor ranking — ${periodLabel}</h4>
          <div class="data-table-wrap kpi-detail-table">
            <table class="data-table data-table--modal">
              <thead><tr><th>S.No</th><th>Vendor</th><th>Category</th><th>Quality</th><th>Lead Time</th><th>Cost</th><th>Overall</th><th>Status</th></tr></thead>
              <tbody>
                ${vendors.map((v, i) => `<tr onclick="openVendorDetail('${v.id}')">
                  <td>${i + 1}</td>
                  <td><strong>${v.name}</strong></td>
                  <td>${v.category}</td>
                  <td>${v.quality}</td>
                  <td>${v.leadTime}</td>
                  <td>${v.cost}</td>
                  <td><strong>${v.overall}</strong></td>
                  <td><span class="badge badge-${v.status === 'Preferred' ? 'success' : v.status === 'Watch' ? 'danger' : 'info'}">${v.status}</span></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="tender-detail-actions">
          <button type="button" class="btn btn-primary" onclick="openGovKpiDetail('avgVendorScore')">View all vendor scores →</button>
        </div>
      </div>
    `, { wide: true, large: true });
    return;
  }

  if (chartKey === 'savings') {
    const sources = [
      { name: 'Rate contract negotiation', amount: 8.2, pct: 37, how: 'Locked multi-year rates below market' },
      { name: 'Bulk purchase pooling', amount: 5.4, pct: 25, how: 'District demand pooled for volume discount' },
      { name: 'Generic substitution', amount: 4.1, pct: 19, how: 'Branded → equivalent generics' },
      { name: 'E-procurement efficiency', amount: 2.8, pct: 13, how: 'Faster cycle, lower overhead' },
      { name: 'Vendor competition (L1)', amount: 1.5, pct: 6, how: 'Competitive bidding pulled prices down' }
    ];
    const numVal = typeof val === 'number' ? val : Number(val);
    const fmt = Number.isFinite(numVal) ? numVal.toFixed(1) : val;
    const scale = Number.isFinite(numVal) ? numVal / 22 : 1;
    const estimated = Number.isFinite(numVal) ? Math.round((numVal + numVal / 0.1) * 10) / 10 : '—';
    const actual = Number.isFinite(numVal) ? Math.round((estimated - numVal) * 10) / 10 : '—';
    const periodTarget = analyticsFocusYear === 'all' ? 20 : (analyticsSliceType === 'month' ? 1.8 : 5.5);
    const achievement = Number.isFinite(numVal) ? Math.round((numVal / periodTarget) * 100) : '—';
    openModal(`Savings Realization (₹ Cr) — ${periodLabel}`, `
      <div class="trend-detail">
        <div class="trend-detail-hero">
          <div>
            <span class="trend-detail-badge">Cost savings · ₹ Crore</span>
            <h3 class="trend-detail-value">₹${fmt} Cr</h3>
            <p class="trend-detail-desc">Money saved vs estimate in <strong>${periodLabel}</strong> · ${ctx}</p>
          </div>
        </div>
        <div class="trend-detail-explain">
          <i class="fa-solid fa-circle-info"></i>
          <p><strong>What this means:</strong> Savings = <em>estimated / budgeted cost − actual contract value</em>. Unit is <strong>₹ Crore</strong>. This is money <em>not spent</em> relative to the estimate — not procurement spend.</p>
        </div>
        <div class="tender-detail-stats tender-detail-stats--3">
          <div class="tender-stat"><span>Estimated cost</span><strong>₹${estimated} Cr</strong></div>
          <div class="tender-stat"><span>Actual paid</span><strong>₹${actual} Cr</strong></div>
          <div class="tender-stat"><span>Saved</span><strong>₹${fmt} Cr</strong></div>
        </div>
        <div class="tender-detail-stats tender-detail-stats--3">
          <div class="tender-stat"><span>Period target</span><strong>₹${periodTarget} Cr</strong></div>
          <div class="tender-stat"><span>Achievement</span><strong>${achievement}%</strong></div>
          <div class="tender-stat"><span>Category</span><strong>${catLabel}</strong></div>
        </div>
        <div class="tender-detail-section">
          <h4>How savings were earned</h4>
          <div class="data-table-wrap kpi-detail-table">
            <table class="data-table data-table--modal">
              <thead><tr><th>S.No</th><th>Source</th><th>How</th><th>Saved (₹ Cr)</th><th>Share</th></tr></thead>
              <tbody>
                ${sources.map((s, i) => `<tr>
                  <td>${i + 1}</td>
                  <td><strong>${s.name}</strong></td>
                  <td>${s.how}</td>
                  <td>₹${(s.amount * scale).toFixed(1)} Cr</td>
                  <td>${s.pct}%</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `, { wide: true, large: true });
    return;
  }

  if (chartKey === 'progress') {
    const d = typeof getTenderProgressSeries === 'function' ? getTenderProgressSeries(currentCategory) : null;
    const idx = d ? d.labels.findIndex(l => l === periodLabel || l.startsWith(periodLabel) || l.includes(periodLabel)) : -1;
    const proc = idx >= 0 ? d.processed[idx] : '—';
    const pend = idx >= 0 ? d.pending[idx] : '—';
    const del = idx >= 0 ? d.delayed[idx] : '—';
    openModal(`Tender Pipeline — ${periodLabel}`, `
      <div class="trend-detail">
        <div class="trend-detail-hero">
          <div>
            <span class="trend-detail-badge">Tender counts</span>
            <h3 class="trend-detail-value">${proc} processed</h3>
            <p class="trend-detail-desc">Pipeline status for <strong>${periodLabel}</strong> · ${ctx}</p>
          </div>
        </div>
        <div class="trend-detail-explain">
          <i class="fa-solid fa-circle-info"></i>
          <p><strong>Processed</strong> = tenders completed (awarded/closed). <strong>Pending</strong> = in evaluation or approval. <strong>Delayed</strong> = past SLA deadline.</p>
        </div>
        <div class="tender-detail-stats tender-detail-stats--3">
          <div class="tender-stat"><span>Processed</span><strong>${proc}</strong></div>
          <div class="tender-stat"><span>Pending</span><strong>${pend}</strong></div>
          <div class="tender-stat"><span>Delayed</span><strong>${del}</strong></div>
        </div>
        <div class="tender-detail-section">
          <h4>Active tenders in pipeline</h4>
          <div class="data-table-wrap kpi-detail-table">
            <table class="data-table data-table--modal">
              <thead><tr><th>S.No</th><th>Tender ID</th><th>Title</th><th>Category</th><th>Status</th><th>Deadline</th></tr></thead>
              <tbody>
                ${filterListByCategory(TENDERS).filter(t => ['Open', 'Evaluation', 'Draft'].includes(t.status)).slice(0, 6).map((t, i) => `<tr onclick="openTenderDetail('${t.id}')">
                  <td>${i + 1}</td>
                  <td><strong>${t.id}</strong></td>
                  <td>${t.title}</td>
                  <td>${t.category}</td>
                  <td><span class="badge badge-${tenderBadgeClass(t.status)}">${t.status}</span></td>
                  <td>${formatDateDMY(t.deadline)}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `, { wide: true, large: true });
    return;
  }

  if (chartKey === 'vendorCompare') {
    const vendors = filterByCategory(VENDORS);
    const vendor = vendors.find(v => v.name.includes(periodLabel) || v.name.replace(' India Pvt Ltd', '').replace(' Solutions', '').includes(periodLabel));
    if (vendor) { openVendorDetail(vendor.id); return; }
  }

  openChartPeriodDetail(seriesLabel, periodLabel);
}

function openChartPeriodDetail(seriesLabel, periodLabel) {
  const cat = currentCategory === 'All' ? null : currentCategory;
  const items = cat
    ? (CATEGORY_ITEM_TYPES[cat] || [])
    : (CATEGORY_ITEM_TYPES.Drugs || []).slice(0, 4);
  openModal(`${seriesLabel}: ${periodLabel}`, `
    <div class="kpi-detail">
      <div class="tender-detail-section">
        <h4>Period snapshot — ${periodLabel}</h4>
        <p>Detailed breakdown for <strong>${periodLabel}</strong>${cat ? ` under <strong>${cat}</strong>` : ''}. Transaction-level ledgers remain in Finance module.</p>
      </div>
      <div class="tender-detail-section">
        <h4>${cat === 'Drugs' || !cat ? 'Key drug / item lines' : 'Key item lines'}</h4>
        <div class="kpi-detail-chips">
          ${items.map(i => `<span class="kpi-chip"><strong>${i.name}</strong><em>${i.type} · ${i.spend}</em></span>`).join('')}
        </div>
      </div>
      <div class="tender-detail-actions">
        <button type="button" class="btn btn-primary" onclick="openCategorySpendDetail(${cat ? `'${cat}'` : 'null'})">View full category spend →</button>
      </div>
    </div>
  `, { wide: true });
}

function openTenderDetail(tenderId) {
  const t = TENDERS.find(x => x.id === tenderId);
  if (!t) {
    openModal(tenderId, '<p>Tender record not found.</p>');
    return;
  }

  const isOpen = t.status === 'Open';
  const daysLeft = daysUntilDeadline(t.deadline);
  const emdEstimate = t.category === 'Drugs' ? '₹3,20,000' : t.category === 'Equipment' ? '₹2,50,000' : '₹1,00,000';
  const linkedItems = getLinkedItemsForTender(t);
  const bid = getBidForTender(t.id);
  const clarifs = typeof CLARIFICATIONS !== 'undefined'
    ? CLARIFICATIONS.filter(c => c.tenderId === t.id)
    : [];

  const deadlineLabel = !isOpen
    ? 'Not open for bidding'
    : daysLeft === null
      ? ''
      : daysLeft > 0
        ? `${daysLeft} day(s) remaining`
        : daysLeft === 0
          ? 'Due today'
          : 'Deadline passed';

  const body = `<div class="tender-detail">
    <div class="tender-detail-hero">
      <div>
        <span class="badge badge-${tenderBadgeClass(t.status)}">${t.status}</span>
        <h3 class="tender-detail-title">${t.title}</h3>
        <p class="tender-detail-sub">${t.category} procurement · Estimated value ${t.value} · ${t.bids} bid(s)</p>
      </div>
      <div class="tender-detail-deadline ${isOpen && daysLeft !== null && daysLeft <= 5 ? 'urgent' : ''}">
        <span class="tender-detail-deadline-label">Bid deadline</span>
        <strong>${formatDateDMY(t.deadline)}</strong>
        <span>${deadlineLabel}</span>
      </div>
    </div>

    <div class="tender-detail-stats tender-detail-stats--3">
      <div class="tender-stat"><span>Tender ID</span><strong>${t.id}</strong></div>
      <div class="tender-stat"><span>Category</span><strong>${t.category}</strong></div>
      <div class="tender-stat"><span>Est. Value</span><strong>${t.value}</strong></div>
    </div>
    <div class="tender-detail-stats tender-detail-stats--3">
      <div class="tender-stat"><span>Bids received</span><strong>${t.bids}</strong></div>
      <div class="tender-stat"><span>Technical</span><strong>${bid?.technical || (t.status === 'Evaluation' ? 'Under review' : '—')}</strong></div>
      <div class="tender-stat"><span>Commercial</span><strong>${bid?.financial || 'Sealed'}</strong></div>
    </div>

    <div class="tender-detail-section">
      <h4>Overview</h4>
      <p>Public tender for <strong>${t.title}</strong> under the <strong>${t.category}</strong> category (same record used on Analytics Dashboard). Vendors must meet eligibility criteria, submit technical &amp; financial bids, and furnish EMD before the deadline.</p>
    </div>

    ${linkedItems.length ? `<div class="tender-detail-section">
      <h4>${t.category === 'Drugs' ? 'Drug / item lines covered' : 'Item lines covered'}</h4>
      <div class="data-table-wrap kpi-detail-table">
        <table class="data-table data-table--modal">
          <thead><tr><th>S.No</th><th>Item</th><th>Type</th><th>Est. spend</th><th>Facilities</th></tr></thead>
          <tbody>
            ${linkedItems.map((i, idx) => `<tr>
              <td>${idx + 1}</td>
              <td><strong>${i.name}</strong></td>
              <td><span class="badge badge-info">${i.type}</span></td>
              <td>${i.spend}</td>
              <td>${i.facilities}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}

    <div class="tender-detail-section">
      <h4>Key requirements</h4>
      <ul class="tender-req-list">
        <li>Valid GSTIN, PAN, and category licenses</li>
        <li>Technical compliance matrix mapped to NIT/RFP</li>
        <li>Sealed commercial bid (opened only after technical qualification)</li>
        <li>EMD approximately <strong>${emdEstimate}</strong> (as per NIT)</li>
      </ul>
    </div>

    ${clarifs.length ? `<div class="tender-detail-section">
      <h4>Clarifications</h4>
      <div class="data-table-wrap kpi-detail-table">
        <table class="data-table data-table--modal">
          <thead><tr><th>S.No</th><th>Query</th><th>Subject</th><th>Status</th></tr></thead>
          <tbody>
            ${clarifs.map((c, i) => `<tr>
              <td>${i + 1}</td>
              <td><strong>${c.id}</strong></td>
              <td>${c.subject}</td>
              <td><span class="badge badge-${c.status === 'Answered' ? 'success' : c.status === 'Pending' ? 'warning' : 'info'}">${c.status}</span></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>` : ''}
  </div>`;

  openModal(`${t.id} — ${t.title}`, body, { wide: true, large: true });
}

function openVendorDetail(id) {
  const v = VENDORS.find(x => x.id === id);
  if (!v) return;
  openModal(`${v.id} — ${v.name}`, `<div class="drill-simple">
    <p><strong>Overall Score:</strong> ${v.overall} · <strong>Status:</strong> ${v.status} · <strong>Category:</strong> ${v.category}</p>
    <div class="tender-detail-stats mt-2">
      <div class="tender-stat"><span>Quality</span><strong>${v.quality}</strong></div>
      <div class="tender-stat"><span>Lead Time</span><strong>${v.leadTime}</strong></div>
      <div class="tender-stat"><span>Cost</span><strong>${v.cost}</strong></div>
      <div class="tender-stat"><span>Regulatory</span><strong>${v.regulatory}</strong></div>
      <div class="tender-stat"><span>Satisfaction</span><strong>${v.satisfaction}</strong></div>
    </div>
  </div>`, { wide: true });
}

function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  const modal = overlay?.querySelector('.modal');
  overlay?.classList.remove('open');
  modal?.classList.remove('modal--wide', 'modal--lg', 'modal--xl');
  modalHistory = [];
  document.getElementById('modalBackBtn')?.classList.add('hidden');
}

function bindPageEvents() {
  if (window.__mphPageEventsBound) return;
  window.__mphPageEventsBound = true;

  document.getElementById('modalOverlay')?.addEventListener('click', e => {
    if (e.target.id === 'modalOverlay') closeModal();
  });
  document.getElementById('noticeOverlay')?.addEventListener('click', e => {
    if (e.target.id === 'noticeOverlay') closeNoticeModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (document.getElementById('noticeOverlay')?.classList.contains('open')) {
      closeNoticeModal();
      return;
    }
    if (document.getElementById('modalOverlay')?.classList.contains('open')) {
      if (modalHistory.length) modalGoBack();
      else closeModal();
    }
  });
}

// ========== INIT ==========
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('authPage').style.display = 'flex';
  initAuth();
  bindPageEvents();
  // Official gov notices appear on the login page as soon as the website loads
  setTimeout(() => showGovNoticesOnWebsiteLoad(), 450);
});
