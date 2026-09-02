/* MP Health Procurement - Main Application Logic */

let currentRole = null;
let authUser = null;
let currentPage = 'dashboard';
let currentCategory = 'All';
let currentPeriod = 'year';
let currentWorkflowStep = null;
let alertPanelOpen = false;
let pageStack = [];
let tenderStatusFilter = 'all'; // 'all' | 'open' | 'evaluation' | 'draft'
let pipelinePage = 1;
const PIPELINE_PAGE_SIZE = 10;
let noticesShownThisSession = false;

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
function renderSidebar() {
  const nav = document.getElementById('sidebarNav');
  const navItems = currentRole === 'gov' ? NAV_GOV : NAV_VENDOR;
  let html = '';
  navItems.forEach(item => {
    if (item.section) {
      html += `<div class="nav-section">${item.section}</div>`;
    } else {
      const badge = item.badge > 0
        ? `<span class="nav-badge">${item.badge}</span>`
        : '';
      html += `<a class="nav-item ${currentPage === item.id ? 'active' : ''}" data-page="${item.id}" onclick="navigateTo('${item.id}')">
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
    open: 'Open tenders — accepting bids',
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
    dashboard: ['Analytics Dashboard', 'Real-time procurement insights & KPIs'],
    workflow: ['Procurement Lifecycle', ''],
    'vendor-reg': ['Vendor Registration', 'Review and approve vendor onboarding requests'],
    sourcing: ['Sourcing & Award', 'Technical and commercial evaluation'],
    'master-data': ['Master Data & Workflow', 'Categories, items, and workflow configuration'],
    tor: ['TOR Coverage & Red Flags', 'Terms of Reference compliance monitoring'],
    'vendor-matrix': ['Vendor Performance Matrix', 'Weighted scoring and vendor ranking'],
    reports: ['Reports & Analytics', 'Comparative analytics and trend reports'],
    settings: ['Settings & Branding', 'Organization name, logo, and configuration'],
    registration: ['Registration & KYC', 'Complete your vendor profile and verification'],
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
    const count = filterByCategory(TENDERS).length;
    return `<span class="meta-chip accent"><strong>${count}</strong> Active Tenders</span>`;
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
  btn.classList.toggle('hidden', currentPage === 'dashboard');
}

function goBack() {
  const prev = pageStack.pop() || 'dashboard';
  currentPage = prev;
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
    performance: renderPerformance
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
      if (currentRole === 'gov') refreshAllCharts(currentPeriod, currentCategory);
      else { initCategoryChart(currentCategory); }
    }, 100);
  }
  if (currentPage === 'reports') {
    setTimeout(() => refreshAllCharts(currentPeriod, currentCategory), 100);
  }
  if (currentPage === 'vendor-matrix') {
    setTimeout(() => initVendorTrendChart(filterByCategory(VENDORS)), 100);
  }
  bindPageEvents();
  initCustomSelects();
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
  if (currentRole === 'vendor') {
    return 'Badge count = open + evaluation + draft tenders + active bids + active contracts in that category';
  }
  const hints = {
    dashboard: 'Active tender count per category on this page',
    tenders: 'Tender count per category on this page',
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

function getCategoryItemCount(cat) {
  if (currentRole === 'vendor') {
    return getVendorCategoryBadgeCount(cat);
  }
  const map = {
    'vendor-reg': () => VENDOR_REGISTRATIONS.filter(r => r.category === cat).length,
    sourcing: () => TENDERS.filter(t => t.category === cat).length,
    tenders: () => TENDERS.filter(t => t.category === cat).length,
    bids: () => BIDS.filter(b => b.category === cat).length,
    contracts: () => CONTRACTS.filter(c => c.category === cat).length,
    clarifications: () => CLARIFICATIONS.filter(c => c.category === cat).length,
    delivery: () => DELIVERIES.filter(d => d.category === cat).length,
    tor: () => TOR_ENTRIES.filter(t => t.category === cat).length,
    'vendor-matrix': () => VENDORS.filter(v => v.category === cat).length,
    dashboard: () => TENDERS.filter(t => t.category === cat && ['Open', 'Evaluation', 'Draft'].includes(t.status)).length
  };
  return (map[currentPage] || (() => TENDERS.filter(t => t.category === cat).length))();
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
        <thead><tr><th>Tender ID</th><th>Title</th><th>Category</th><th>Deadline</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          ${paged.items.length ? paged.items.map(t => `<tr onclick="openDrillDown('tender','${t.id}','${t.title} - ${t.category}. Value: ${t.value}. Status: ${t.status}.')">
            <td><strong>${t.id}</strong></td><td>${t.title}</td><td>${t.category}</td><td>${t.deadline}</td>
            <td><span class="badge badge-${tenderBadgeClass(t.status)}">${t.status}</span></td>
            <td><button class="btn btn-outline" style="padding:0.3rem 0.6rem;font-size:0.75rem">${pipelineActionLabel(t.status)}</button></td>
          </tr>`).join('') : emptyTableRow(6, 'No tenders in pipeline for this category.')}
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
  return `<div class="time-toggle">
    ${['year', 'quarter', 'month'].map(p => `<button class="time-btn ${currentPeriod === p ? 'active' : ''}" onclick="setPeriod('${p}')">${p.charAt(0).toUpperCase() + p.slice(1)}</button>`).join('')}
  </div>`;
}

// ========== DASHBOARD ==========
function renderDashboard() {
  if (currentRole === 'gov') return renderGovDashboard();
  return renderVendorDashboard();
}

function renderGovDashboard() {
  const tenders = filterByCategory(TENDERS);
  const vendors = filterByCategory(VENDORS);
  const regs = filterByCategory(VENDOR_REGISTRATIONS);
  const weight = CATEGORY_WEIGHTS[currentCategory];
  const openTenders = tenders.filter(t => ['Open', 'Evaluation', 'Draft'].includes(t.status)).length;
  const spend = Math.round(215 * weight * 10) / 10;
  const pending = Math.round(18 * weight) || (currentCategory === 'All' ? 18 : Math.max(regs.length, 1));
  const delays = Math.max(1, Math.round(6 * weight));
  const avgScore = vendors.length
    ? (vendors.reduce((s, v) => s + v.overall, 0) / vendors.length).toFixed(1)
    : '—';

  return `
    <div class="sticky-banner">
      <span class="banner-icon"><i class="fa-solid fa-triangle-exclamation"></i></span>
      <div><strong>Restrictive Notice:</strong> Vendor VND-MP-001345 suspended pending compliance review. <a href="#" onclick="navigateTo('tor');return false" style="color:#e65100;font-weight:600">View Details →</a></div>
    </div>
    <div class="kpi-grid">
      <div class="kpi-card blue" onclick="openDrillDown('kpi','Open Tenders','${openTenders} active tenders${currentCategory !== 'All' ? ' in ' + currentCategory : ''}.')">
        <div class="kpi-label">Open Tenders</div>
        <div class="kpi-value">${openTenders}</div>
        <div class="kpi-change up">↑ 12% vs last quarter</div>
      </div>
      <div class="kpi-card green" onclick="openDrillDown('kpi','Procurement Spend','₹${spend} Cr spend${currentCategory !== 'All' ? ' for ' + currentCategory : ''}.')">
        <div class="kpi-label">Procurement Spend</div>
        <div class="kpi-value">₹${spend} Cr</div>
        <div class="kpi-change up">↑ 8.2% YoY</div>
      </div>
      <div class="kpi-card orange" onclick="openDrillDown('kpi','Pending Approvals','${pending} PRs awaiting approval.')">
        <div class="kpi-label">Pending Approvals</div>
        <div class="kpi-value">${pending}</div>
        <div class="kpi-change down">↓ 3 resolved today</div>
      </div>
      <div class="kpi-card red" onclick="openDrillDown('kpi','Payment Delays','${delays} invoices delayed.')">
        <div class="kpi-label">Payment Delays</div>
        <div class="kpi-value">${delays}</div>
        <div class="kpi-change down">↑ 2 new this week</div>
      </div>
      <div class="kpi-card teal" onclick="openDrillDown('kpi','Vendor Performance','Average score: ${avgScore}.')">
        <div class="kpi-label">Avg Vendor Score</div>
        <div class="kpi-value">${avgScore}</div>
        <div class="kpi-change up">↑ 3.2 pts YoY</div>
      </div>
    </div>
    <div class="flex items-center gap-1 mb-2" style="justify-content:flex-end">${timeToggle()}</div>
    <div class="chart-grid">
      <div class="chart-card" onclick="openDrillDown('chart','Spend Trends','Category-wise spend breakdown with district-level drill-down.')">
        <div class="chart-header"><h3><i class="fa-solid fa-chart-column"></i> Spend Trends (₹ Cr)</h3></div>
        <div class="chart-container"><canvas id="chartSpend"></canvas></div>
      </div>
      <div class="chart-card" onclick="openDrillDown('chart','Procurement Trends','Tender count by category and evaluation stage.')">
        <div class="chart-header"><h3><i class="fa-solid fa-chart-line"></i> Procurement Trends</h3></div>
        <div class="chart-container"><canvas id="chartProcurement"></canvas></div>
      </div>
      <div class="chart-card" onclick="openDrillDown('chart','Vendor Performance','Quarterly vendor performance score trends.')">
        <div class="chart-header"><h3><i class="fa-solid fa-star"></i> Vendor Performance Trends</h3></div>
        <div class="chart-container"><canvas id="chartVendorPerf"></canvas></div>
      </div>
      <div class="chart-card" onclick="openDrillDown('chart','Savings Realization','Savings from demand optimization and L1 pricing.')">
        <div class="chart-header"><h3><i class="fa-solid fa-piggy-bank"></i> Savings Realization (₹ Cr)</h3></div>
        <div class="chart-container"><canvas id="chartSavings"></canvas></div>
      </div>
      <div class="chart-card full" onclick="openDrillDown('chart','Category-wise Spend','Drill down to item-level spend by district and facility.')">
        <div class="chart-header"><h3><i class="fa-solid fa-tags"></i> Category-wise Spend Distribution</h3><span class="chart-subtitle">% share of total spend</span></div>
        <div class="chart-container sm"><canvas id="chartCategory"></canvas></div>
      </div>
    </div>
    <div class="score-weights">
      ${SCORE_WEIGHTS.map(w => `<div class="weight-card"><div class="weight-pct">${w.weight}%</div><div class="weight-label">${w.label}</div></div>`).join('')}
    </div>
    ${renderVendorTable()}
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
        <div class="chart-header"><h3><i class="fa-solid fa-chart-pie"></i> Category Distribution</h3><span class="chart-subtitle">Spend share (% of total) — hover for details</span></div>
        <div class="chart-container sm"><canvas id="chartCategory"></canvas></div>
      </div>
    </div>
    ${renderTenderPipeline(tenders)}
  `;
}

function renderVendorTable() {
  const vendors = filterByCategory(VENDORS);
  return `<div class="data-table-wrap">
    <div class="table-header"><h3>Vendor Performance Matrix ${currentCategory !== 'All' ? `— ${currentCategory}` : ''}</h3><button class="btn btn-outline" onclick="navigateTo('vendor-matrix')">Full Matrix →</button></div>
    <table class="data-table">
      <thead><tr><th>Vendor ID</th><th>Name</th><th>Category</th><th>Quality (30%)</th><th>Lead Time (20%)</th><th>Cost (20%)</th><th>Regulatory (20%)</th><th>Satisfaction (10%)</th><th>Overall</th><th>Status</th></tr></thead>
      <tbody>
        ${vendors.length ? vendors.map(v => `<tr onclick="openVendorDetail('${v.id}')">
          <td><strong>${v.id}</strong></td>
          <td>${v.name}</td>
          <td>${v.category}</td>
          ${[v.quality, v.leadTime, v.cost, v.regulatory, v.satisfaction].map(s => `<td><div class="score-bar"><div class="score-track"><div class="score-fill ${s >= 85 ? 'high' : s >= 70 ? 'mid' : 'low'}" style="width:${s}%"></div></div><span>${s}</span></div></td>`).join('')}
          <td><strong>${v.overall}</strong></td>
          <td><span class="badge badge-${v.status === 'Preferred' ? 'success' : v.status === 'Watch' ? 'danger' : 'info'}">${v.status}</span></td>
        </tr>`).join('') : emptyTableRow(10)}
      </tbody>
    </table>
  </div>`;
}

// ========== WORKFLOW ==========
function getWorkflowSteps() {
  return currentRole === 'gov' ? GOV_WORKFLOW : VENDOR_WORKFLOW;
}

function getWorkflowProgressStep() {
  const steps = getWorkflowSteps();
  const active = steps.find(s => s.status === 'active');
  if (active) return active.id;
  const done = steps.filter(s => s.status === 'done').length;
  return done > 0 ? Math.min(done, steps.length) : 1;
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
      <p class="wf-page-hint">${isGov ? '13 stages · click a step to navigate' : '12 stages · click any step to review or update'}</p>
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

function renderWorkflowStepNav(step, total) {
  return `<div class="wf-step-nav">
    <button type="button" class="btn btn-outline" onclick="goWorkflowStep(-1)" ${step.id <= 1 ? 'disabled' : ''}>
      <i class="fa-solid fa-arrow-left"></i> Previous Stage
    </button>
    <span class="wf-step-indicator">Stage ${step.id} of ${total}</span>
    <button type="button" class="btn btn-outline" onclick="goWorkflowStep(1)" ${step.id >= total ? 'disabled' : ''}>
      Next Stage <i class="fa-solid fa-arrow-right"></i>
    </button>
  </div>`;
}

function renderWorkflowChecklist(step) {
  const checklist = currentRole === 'gov'
    ? GOV_STAGE_CHECKLIST[step.id]
    : VENDOR_STAGE_CHECKLIST[step.id];
  if (!checklist) return '';
  return `<div class="wf-checklist">
    <h4><i class="fa-solid fa-list-check"></i> Stage Checklist</h4>
    <ul>${checklist.map(item => `<li>${item}</li>`).join('')}</ul>
  </div>`;
}

function renderWorkflowDetailPanel(step, progress, total) {
  const canEdit = step.id <= progress;
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
      <div class="form-group"><label>Company Name</label><input type="text" placeholder="Enter registered company name" value="MediSupply India Pvt Ltd"${fieldLock}></div>
      ${customSelectHTML('Category', 'regCategory', regCategories, defaultCategory)}
      <div class="form-group"><label>GSTIN</label><input type="text" placeholder="e.g. 23AABCM1234A1Z5" value="23AABCM1234A1Z5"${fieldLock}></div>
      <div class="form-group"><label>PAN</label><input type="text" placeholder="e.g. AABCM1234A" value="AABCM1234A"${fieldLock}></div>
      <div class="form-group full"><label>Registered Address</label><input type="text" placeholder="Street, city, state, PIN code" value="Plot 12, Industrial Area, Bhopal, MP - 462001"${fieldLock}></div>
    </div>
    <div class="wf-actions mt-2">
      <button class="btn btn-primary"${disabled} onclick="saveWorkflowStage(1)">Save Registration Details</button>
      <button class="btn btn-outline" onclick="openAuditTrailModal()">Audit Trail</button>
    </div>`;
  }

  if (currentRole === 'vendor' && step.id === 2) {
    return `<div class="form-grid">
      <div class="form-group"><label>Bank Account</label><input type="text" value="HDFC Bank - ****4567 (Verified)"${readonly}></div>
      <div class="form-group"><label>KYC Status</label><span class="badge badge-success">Verified</span></div>
      <div class="form-group"><label>Drug License</label><input type="text" value="DL-MH-2024-0892"${readonly}></div>
      <div class="form-group"><label>License Expiry</label><input type="text" value="2027-03-15"${readonly}></div>
    </div>
    <div class="wf-actions mt-2">
      <button class="btn btn-primary"${disabled} onclick="saveWorkflowStage(2)">Update KYC Documents</button>
      <button class="btn btn-outline" onclick="openWorkflowDocument('kyc-checklist')">KYC Checklist (PDF)</button>
      <button class="btn btn-outline" onclick="openAuditTrailModal()">Audit Trail</button>
    </div>`;
  }

  if (currentRole === 'vendor' && step.id === 3) {
    return `<div class="form-grid">
      <div class="form-group"><label>Vendor Code</label><input type="text" value="VND-MP-000123" readonly></div>
      <div class="form-group"><label>Code Status</label><span class="badge badge-success">Active</span></div>
      <div class="form-group full"><label>Linked Categories</label><input type="text" value="Drugs, Consumables"${readonly}></div>
    </div>
    <div class="wf-actions mt-2">
      <button class="btn btn-outline" onclick="navigateTo('registration')">Open Full Profile</button>
      <button class="btn btn-outline" onclick="openWorkflowDocument('vendor-code-letter')">Download Code Letter</button>
    </div>`;
  }

  if (currentRole === 'vendor' && step.id === 4) {
    return `<div class="form-grid">
      <div class="form-group"><label>Annual Turnover</label><input type="text" value="₹ 12.5 Cr (FY 2025-26)"${readonly}></div>
      <div class="form-group"><label>Experience</label><input type="text" value="8 years — Govt. hospital supply"${readonly}></div>
      <div class="form-group"><label>ISO 13485</label><span class="badge badge-success">Certified</span></div>
      <div class="form-group"><label>Blacklist Status</label><span class="badge badge-success">Clear</span></div>
    </div>
    <div class="wf-actions mt-2">
      <button class="btn btn-primary"${disabled} onclick="saveWorkflowStage(4)">Update Eligibility Proofs</button>
      <button class="btn btn-outline" onclick="openWorkflowDocument('compliance-matrix')">Compliance Matrix Template</button>
    </div>`;
  }

  if (currentRole === 'vendor' && step.id === 5) {
    return `<div class="form-grid">
      <div class="form-group"><label>Tender Reference</label><input type="text" value="TND-2026-MP-0055" readonly></div>
      ${customSelectHTML('Bid Status', 'bidStatus', ['Draft', 'Submitted'], 'Draft')}
      ${customSelectHTML('Technical Bid', 'techBid', ['Complete', 'In Progress'], 'Complete')}
      ${customSelectHTML('Financial Bid', 'finBid', ['Sealed - Not Submitted', 'Sealed - Submitted'], 'Sealed - Not Submitted')}
      <div class="form-group"><label>EMD Status</label><span class="badge badge-warning">Pending - ₹3,20,000</span></div>
      <div class="form-group"><label>Deadline</label><input type="text" value="2026-09-05 17:00 IST" readonly style="color:var(--danger);font-weight:600"></div>
    </div>
    <div class="wf-actions mt-2">
      <button class="btn btn-primary"${disabled}>Submit Bid</button>
      <button class="btn btn-outline"${disabled}>Upload Technical Documents</button>
      <button class="btn btn-outline"${disabled}>Seal Financial Bid</button>
      <button class="btn btn-outline" onclick="openWorkflowDocument('bid-submission-guide')">Bid Submission Guide</button>
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

function saveWorkflowStage(id) {
  openDrillDown('workflow', `Stage ${id} Saved`, `Your changes for Stage ${id}: ${getWorkflowSteps().find(s => s.id === id)?.name || ''} have been saved. You can return to any previous stage at any time to update details before final submission.`);
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
    openLifecycleGuideModal(5);
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
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHtml;
  modal?.classList.toggle('modal--wide', !!options.wide);
  modal?.classList.toggle('modal--lg', !!options.large);
  overlay?.classList.add('open');
  if (options.highlightStage) {
    requestAnimationFrame(() => {
      const el = document.getElementById(`guide-stage-${options.highlightStage}`);
      el?.classList.add('guide-stage--highlight');
      el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }
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
        <p class="guide-modal-lead">${isGov ? 'Government procurement lifecycle — 13 stages from need identification to payment.' : 'Vendor lifecycle — 12 stages from registration to renewal or closure.'}</p>
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
  if (next >= 1 && next <= total) selectWorkflowStep(next);
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

function renderSourcing() {
  const tenders = filterByCategory(TENDERS);
  return `<div class="data-table-wrap">
      <div class="table-header"><h3>Active Tenders — Sourcing & Award (${tenders.length})</h3></div>
      <table class="data-table">
        <thead><tr><th>Tender ID</th><th>Title</th><th>Category</th><th>Bids</th><th>Evaluation</th><th>Commercial</th><th>Status</th></tr></thead>
        <tbody>
          ${tenders.length ? tenders.map(t => `<tr>
            <td><strong>${t.id}</strong></td><td>${t.title}</td><td>${t.category}</td><td>${t.bids}</td>
            <td><span class="badge badge-${t.status==='Evaluation'?'warning':'muted'}">${t.status==='Evaluation'?'In Progress':'—'}</span></td>
            <td><span class="badge badge-muted"><i class="fa-solid fa-lock"></i> Sealed</span></td>
            <td><span class="badge badge-${tenderBadgeClass(t.status)}">${t.status}</span></td>
          </tr>`).join('') : emptyTableRow(7)}
        </tbody>
      </table>
    </div>
    <div class="wf-detail mt-2">
      <h3>Weighted Vendor Recommendation</h3>
      <p>Selected vendor receives explainable weighted score. Blacklisted/expired/non-compliant bidders auto-blocked.</p>
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
  return `${timeToggle()}
    <div class="chart-card mb-2"><div class="chart-header"><h3>Vendor Comparison</h3></div><div class="chart-container"><canvas id="chartVendorTrend"></canvas></div></div>
    ${renderVendorTable()}`;
}

function renderReports() {
  return `<div class="flex items-center gap-1 mb-2" style="justify-content:flex-end">${timeToggle()}</div>
    <div class="chart-grid">
      <div class="chart-card"><div class="chart-header"><h3>Spend Trends</h3></div><div class="chart-container"><canvas id="chartSpend"></canvas></div></div>
      <div class="chart-card"><div class="chart-header"><h3>Savings Realization</h3></div><div class="chart-container"><canvas id="chartSavings"></canvas></div></div>
    </div>
    <p class="section-subtitle">Historical data for previous 4 financial years. Toggle Year / Quarter / Month views.</p>`;
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
  return `<div class="wf-detail"><h3>Vendor Profile — VND-MP-000123</h3>
    <div class="form-grid mt-2">
      <div class="form-group"><label>Company Name</label><input value="MediSupply India Pvt Ltd"></div>
      <div class="form-group"><label>Vendor ID</label><input value="VND-MP-000123" readonly></div>
      <div class="form-group"><label>GSTIN</label><input value="23AABCM1234A1Z5"></div>
      <div class="form-group"><label>PAN</label><input value="AABCM1234A"></div>
      <div class="form-group"><label>Drug License</label><input value="DL-MH-2024-0892"><small style="color:var(--danger)">Expires: 2027-03-15</small></div>
      <div class="form-group"><label>ISO 13485</label><input value="Certified"><small style="color:var(--warning)">Expires in 22 days</small></div>
      <div class="form-group full"><label>Bank Account (Verified)</label><input value="HDFC Bank - ****4567" readonly></div>
    </div>
    <div class="wf-actions mt-2"><button class="btn btn-primary">Update Profile</button><button class="btn btn-outline">Upload Documents</button></div>
  </div>`;
}

function renderTenders() {
  let tenders = filterByCategory(TENDERS);
  tenders = filterTendersByStatus(tenders);
  const emptyLabel = tenderStatusFilter === 'all' ? 'tenders' : `${tenderStatusFilter} tenders`;
  return `<div class="cards-grid">
      ${tenders.length ? tenders.map(t => `<div class="info-card" onclick="openDrillDown('tender','${t.id}','${t.title}')">
        <h4>${t.id}</h4><p>${t.title}</p>
        <div class="card-meta"><span>${t.category} · ${t.value}</span><span class="badge badge-${tenderBadgeClass(t.status)}">${t.status}</span></div>
        <div class="card-meta"><span>Deadline: ${t.deadline}</span><span>${t.bids} bids</span></div>
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
            <td>${b.deadline}</td>
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
        <thead><tr><th>Delivery ID</th><th>PO Reference</th><th>Category</th><th>Items</th><th>GRN Status</th><th>Invoice</th><th>Payment</th></tr></thead>
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
    refreshAllCharts(period, currentCategory);
    document.querySelectorAll('.time-btn').forEach(btn => {
      btn.classList.toggle('active', btn.textContent.toLowerCase() === period);
    });
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
  const modal = document.getElementById('modalOverlay');
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = `<p>${content}</p>
    <div class="data-table-wrap mt-2"><table class="data-table"><thead><tr><th>Reference</th><th>Detail</th><th>Status</th></tr></thead>
    <tbody><tr><td>REF-001</td><td>Linked transaction data</td><td><span class="badge badge-info">Traceable</span></td></tr>
    <tr><td>REF-002</td><td>Audit trail entry</td><td><span class="badge badge-success">Verified</span></td></tr></tbody></table></div>
    <p class="mt-2" style="font-size:0.8rem;color:var(--text-muted)">Every figure supports contextual navigation and full traceability to underlying transaction data.</p>`;
  modal.classList.add('open');
}

function openVendorDetail(id) {
  const v = VENDORS.find(x => x.id === id);
  if (!v) return;
  openDrillDown('vendor', `${v.id} — ${v.name}`, `Overall Score: ${v.overall} | Status: ${v.status} | Category: ${v.category}. Quality: ${v.quality}, Lead Time: ${v.leadTime}, Cost: ${v.cost}, Regulatory: ${v.regulatory}, Satisfaction: ${v.satisfaction}`);
}

function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  const modal = overlay?.querySelector('.modal');
  overlay?.classList.remove('open');
  modal?.classList.remove('modal--wide', 'modal--lg');
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
      closeModal();
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
