/* Chart.js configurations for MP Health Procurement */

let charts = {};

const chartColors = {
  primary: '#0d47a1',
  accent: '#00bfa5',
  blue: '#1565c0',
  green: '#2e7d32',
  orange: '#f57c00',
  red: '#d32f2f',
  purple: '#7b1fa2',
  teal: '#00897b',
  palette: ['#0d47a1', '#00bfa5', '#f57c00', '#7b1fa2', '#d32f2f', '#00897b']
};

function destroyChart(id) {
  if (charts[id]) {
    charts[id].destroy();
    delete charts[id];
  }
}

function scaleData(data, category = 'All') {
  if (category === 'All') return data;
  const w = typeof CATEGORY_WEIGHTS !== 'undefined' ? CATEGORY_WEIGHTS[category] : 1;
  return data.map(v => Math.round(v * w * 10) / 10);
}

/** Resolve chart labels/data for last-10-year explorer (focus year + granularity) */
function resolveChartSeries(metricKey, period = 'year') {
  const series = CHART_DATA[metricKey]?.[period] || CHART_DATA[metricKey]?.year;
  if (!series) return { labels: [], data: [] };
  const focus = typeof analyticsFocusYear !== 'undefined' ? analyticsFocusYear : 'all';
  if (period === 'year' && focus && focus !== 'all') {
    const idx = series.labels.indexOf(focus);
    if (idx >= 0) {
      return { labels: [series.labels[idx]], data: [series.data[idx]] };
    }
  }
  // For quarter/month with a focus FY, lightly scale data as a FY-specific snapshot
  if (period !== 'year' && focus && focus !== 'all') {
    const yearSeries = CHART_DATA[metricKey]?.year;
    const idx = yearSeries ? yearSeries.labels.indexOf(focus) : -1;
    const base = yearSeries && idx >= 0 ? yearSeries.data[idx] : null;
    const latest = yearSeries ? yearSeries.data[yearSeries.data.length - 1] : 1;
    const factor = base && latest ? base / latest : 1;
    return {
      labels: series.labels,
      data: series.data.map(v => Math.round(v * factor * 10) / 10)
    };
  }
  return { labels: [...series.labels], data: [...series.data] };
}

function initSpendChart(period = 'year', category = 'All') {
  destroyChart('spend');
  const ctx = document.getElementById('chartSpend');
  if (!ctx) return;
  const d = resolveChartSeries('spend', period);
  charts.spend = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: d.labels,
      datasets: [{
        label: category === 'All' ? 'Procurement Spend (₹ Cr)' : `${category} Spend (₹ Cr)`,
        data: scaleData(d.data, category),
        backgroundColor: chartColors.palette.map(c => c + 'cc'),
        borderColor: chartColors.palette,
        borderWidth: 2,
        borderRadius: 6
      }]
    },
    options: chartOptions('₹ Cr')
  });
}

function initProcurementChart(period = 'year', category = 'All') {
  destroyChart('procurement');
  const ctx = document.getElementById('chartProcurement');
  if (!ctx) return;
  const d = resolveChartSeries('procurement', period);
  charts.procurement = new Chart(ctx, {
    type: 'line',
    data: {
      labels: d.labels,
      datasets: [{
        label: category === 'All' ? 'Procurement Count' : `${category} Procurements`,
        data: scaleData(d.data, category),
        borderColor: chartColors.accent,
        backgroundColor: chartColors.accent + '20',
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: chartColors.accent
      }]
    },
    options: chartOptions('Count')
  });
}

function initVendorPerfChart(period = 'year', category = 'All') {
  destroyChart('vendorPerf');
  const ctx = document.getElementById('chartVendorPerf');
  if (!ctx) return;
  const d = resolveChartSeries('vendorPerf', period);
  charts.vendorPerf = new Chart(ctx, {
    type: 'line',
    data: {
      labels: d.labels,
      datasets: [{
        label: category === 'All' ? 'Avg Vendor Score' : `${category} Vendor Score`,
        data: scaleData(d.data, category),
        borderColor: chartColors.primary,
        backgroundColor: chartColors.primary + '15',
        fill: true,
        tension: 0.4,
        pointRadius: 5
      }]
    },
    options: chartOptions('Score')
  });
}

function initSavingsChart(period = 'year', category = 'All') {
  destroyChart('savings');
  const ctx = document.getElementById('chartSavings');
  if (!ctx) return;
  const d = resolveChartSeries('savings', period);
  charts.savings = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: d.labels,
      datasets: [{
        label: category === 'All' ? 'Savings Realized (₹ Cr)' : `${category} Savings (₹ Cr)`,
        data: scaleData(d.data, category),
        backgroundColor: chartColors.green + 'aa',
        borderColor: chartColors.green,
        borderWidth: 2,
        borderRadius: 6
      }]
    },
    options: chartOptions('₹ Cr')
  });
}

function initCategoryChart(highlightCategory = 'All') {
  destroyChart('category');
  const ctx = document.getElementById('chartCategory');
  if (!ctx) return;
  const labels = CHART_DATA.categorySpend.labels;
  const data = CHART_DATA.categorySpend.data; // always real % — never distort slice sizes
  const bgColors = labels.map((l, i) => {
    if (highlightCategory === 'All') return chartColors.palette[i];
    return l === highlightCategory ? chartColors.palette[i] : chartColors.palette[i] + '44';
  });
  charts.category = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: [...data],
        backgroundColor: bgColors,
        borderWidth: highlightCategory === 'All' ? 0 : 2,
        borderColor: '#fff',
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: {
            font: { size: 11, weight: '600' },
            padding: 12,
            generateLabels(chart) {
              return chart.data.labels.map((label, i) => ({
                text: `${label}: ${data[i]}% spend`,
                fillStyle: chartColors.palette[i],
                fontColor: highlightCategory !== 'All' && label !== highlightCategory ? '#94a3b8' : '#0f172a',
                hidden: false,
                index: i
              }));
            }
          }
        },
        tooltip: {
          backgroundColor: '#1e293b',
          padding: 12,
          cornerRadius: 8,
          titleFont: { weight: '700' },
          callbacks: {
            title(items) {
              return items[0].label + ' — Spend Share';
            },
            label(ctx) {
              const pct = data[ctx.dataIndex];
              return ` ${pct}% of total procurement spend`;
            },
            afterLabel(ctx) {
              const amounts = { Drugs: '₹90.3 Cr', Equipment: '₹60.2 Cr', Services: '₹32.3 Cr', Consumables: '₹21.5 Cr', Others: '₹10.8 Cr' };
              const note = highlightCategory !== 'All' && ctx.label !== highlightCategory
                ? '(other categories dimmed — filter active)'
                : '';
              const amt = amounts[ctx.label] ? `Estimated spend: ${amounts[ctx.label]}` : '';
              return [amt, note].filter(Boolean).join('\n');
            }
          }
        }
      },
      cutout: '60%',
      onClick: (e, elements) => {
        if (!elements.length) {
          if (typeof openCategorySpendDetail === 'function') openCategorySpendDetail(highlightCategory === 'All' ? null : highlightCategory);
          return;
        }
        const label = labels[elements[0].index];
        if (typeof openCategorySpendDetail === 'function') openCategorySpendDetail(label);
      }
    }
  });
}

function initRadarChart(vendor) {
  initPerformanceBarChart(vendor);
}

function initPerformanceBarChart(vendor) {
  destroyChart('performanceBar');
  const ctx = document.getElementById('chartPerformanceBar');
  if (!ctx || !vendor) return;

  const labels = PERF_METRICS.map(m => m.label);
  const data = PERF_METRICS.map(m => vendor[m.key]);
  const colors = PERF_METRICS.map(m => m.color);

  charts.performanceBar = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Your Score',
        data,
        backgroundColor: colors.map(c => c + 'cc'),
        borderColor: colors,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
        barThickness: 28
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e293b',
          padding: 12,
          cornerRadius: 8,
          callbacks: {
            label: ctx => ` Score: ${ctx.raw}/100`
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          max: 100,
          grid: { color: '#e2e8f0' },
          ticks: { stepSize: 20, font: { size: 11 } }
        },
        y: {
          grid: { display: false },
          ticks: { font: { size: 12, weight: '600' } }
        }
      }
    }
  });
}

function initVendorTrendChart(vendors = VENDORS) {
  destroyChart('vendorTrend');
  const ctx = document.getElementById('chartVendorTrend');
  if (!ctx) return;
  const list = vendors && vendors.length ? vendors : VENDORS;
  charts.vendorTrend = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: list.map(v => v.id),
      datasets: [
        { label: 'Quality', data: list.map(v => v.quality), backgroundColor: chartColors.primary + 'cc' },
        { label: 'Lead Time', data: list.map(v => v.leadTime), backgroundColor: chartColors.accent + 'cc' },
        { label: 'Cost', data: list.map(v => v.cost), backgroundColor: chartColors.orange + 'cc' }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { font: { size: 11 } } } },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 9 } } },
        y: { beginAtZero: true, max: 100, grid: { color: '#e2e8f0' } }
      }
    }
  });
}

function chartOptions(unit) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 18 } },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 10,
        cornerRadius: 8,
        titleFont: { size: 12 },
        bodyFont: { size: 11 }
      },
      valueLabels: {
        enabled: true,
        unit
      }
    },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 11 } } },
      y: {
        beginAtZero: true,
        grid: { color: '#e2e8f0' },
        ticks: { font: { size: 11 }, callback: v => v + (unit === '₹ Cr' ? '' : '') }
      }
    },
    onClick: (e, elements) => {
      if (elements.length > 0) {
        const chart = e.chart;
        const label = chart.data.labels[elements[0].index];
        const series = chart.data.datasets[0].label || 'Trend';
        if (typeof openChartPeriodDetail === 'function') {
          openChartPeriodDetail(series, label);
        } else {
          openDrillDown('chart', `${series}: ${label}`, `Detailed breakdown for ${label}.`);
        }
      }
    }
  };
}

/** Draw numeric values above bar / line points */
const valueLabelsPlugin = {
  id: 'valueLabels',
  afterDatasetsDraw(chart) {
    const conf = chart.options.plugins?.valueLabels;
    if (!conf || conf.enabled === false) return;
    const { ctx } = chart;
    const unit = conf.unit || '';
    chart.data.datasets.forEach((dataset, datasetIndex) => {
      const meta = chart.getDatasetMeta(datasetIndex);
      if (meta.hidden) return;
      meta.data.forEach((element, index) => {
        const raw = dataset.data[index];
        if (raw == null) return;
        const { x, y } = element.tooltipPosition();
        const text = unit === '₹ Cr'
          ? String(raw)
          : (Number.isInteger(raw) ? String(raw) : Number(raw).toFixed(1));
        ctx.save();
        ctx.font = '600 11px Plus Jakarta Sans, sans-serif';
        ctx.fillStyle = '#0f172a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(text, x, y - 6);
        ctx.restore();
      });
    });
  }
};

if (typeof Chart !== 'undefined') {
  try { Chart.register(valueLabelsPlugin); } catch (_) { /* already registered */ }
}

function refreshAllCharts(period = 'year', category = 'All') {
  initSpendChart(period, category);
  initProcurementChart(period, category);
  initVendorPerfChart(period, category);
  initSavingsChart(period, category);
  initCategoryChart(category);
  initAnalyticsCompareChart(category);
}

function initAnalyticsCompareChart(category = 'All') {
  destroyChart('analyticsCompare');
  const ctx = document.getElementById('chartAnalyticsCompare');
  if (!ctx) return;

  const mode = typeof analyticsCompareMode !== 'undefined' ? analyticsCompareMode : 'vendor';
  if (mode === 'item') {
    const items = CHART_DATA.itemCompare;
    charts.analyticsCompare = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: items.labels,
        datasets: [
          { label: 'Quality', data: scaleData(items.quality, category), backgroundColor: chartColors.primary + 'cc', borderRadius: 6 },
          { label: 'Lead Time', data: scaleData(items.leadTime, category), backgroundColor: chartColors.teal + 'cc', borderRadius: 6 },
          { label: 'Cost', data: scaleData(items.cost, category), backgroundColor: chartColors.orange + 'cc', borderRadius: 6 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: { padding: { top: 16 } },
        plugins: {
          legend: { position: 'top', labels: { font: { size: 11, weight: '600' } } },
          tooltip: { backgroundColor: '#1e293b', padding: 12, cornerRadius: 8 },
          valueLabels: { enabled: false }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { beginAtZero: true, max: 100, grid: { color: '#e2e8f0' }, ticks: { font: { size: 11 } } }
        }
      }
    });
    return;
  }

  const vendors = typeof filterByCategory === 'function' ? filterByCategory(VENDORS) : VENDORS;
  const list = vendors.length ? vendors.slice(0, 6) : VENDORS.slice(0, 6);
  charts.analyticsCompare = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: list.map(v => v.name.replace(' India Pvt Ltd', '').replace(' Solutions', '').replace(' Distributors', '')),
      datasets: [
        { label: 'Quality', data: list.map(v => v.quality), backgroundColor: chartColors.primary + 'cc', borderRadius: 6 },
        { label: 'Lead Time', data: list.map(v => v.leadTime), backgroundColor: chartColors.teal + 'cc', borderRadius: 6 },
        { label: 'Cost', data: list.map(v => v.cost), backgroundColor: chartColors.orange + 'cc', borderRadius: 6 },
        { label: 'Overall', data: list.map(v => v.overall), backgroundColor: chartColors.green + 'cc', borderRadius: 6 }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top', labels: { font: { size: 11, weight: '600' } } },
        tooltip: { backgroundColor: '#1e293b', padding: 12, cornerRadius: 8 }
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 10 } } },
        y: { beginAtZero: true, max: 100, grid: { color: '#e2e8f0' }, ticks: { font: { size: 11 } } }
      }
    }
  });
}

function initVendorCharts(category = 'All') {
  initCategoryChart(category);
  initVendorTrendChart();
}

function countBy(items, keyFn) {
  const map = {};
  items.forEach(item => {
    const k = keyFn(item);
    map[k] = (map[k] || 0) + 1;
  });
  return map;
}

function initVendorReportCharts(category = 'All') {
  const tenders = category === 'All' ? TENDERS : TENDERS.filter(t => t.category === category);
  const bids = category === 'All' ? BIDS : BIDS.filter(b => b.category === category);
  const deliveries = category === 'All' ? DELIVERIES : DELIVERIES.filter(d => d.category === category);
  const completed = typeof vendorStageState !== 'undefined' ? vendorStageState.completed : {};

  // Tender status bar
  destroyChart('vendorTenderStatus');
  const tenderCtx = document.getElementById('chartVendorTenderStatus');
  if (tenderCtx) {
    const byStatus = countBy(tenders, t => t.status);
    const labels = Object.keys(byStatus);
    charts.vendorTenderStatus = new Chart(tenderCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Tenders',
          data: labels.map(l => byStatus[l]),
          backgroundColor: labels.map((_, i) => chartColors.palette[i % chartColors.palette.length] + 'cc'),
          borderColor: labels.map((_, i) => chartColors.palette[i % chartColors.palette.length]),
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: chartOptions('Count')
    });
  }

  // Bid mix doughnut
  destroyChart('vendorBidMix');
  const bidCtx = document.getElementById('chartVendorBidMix');
  if (bidCtx) {
    const byStatus = countBy(bids, b => b.status);
    const labels = Object.keys(byStatus).length ? Object.keys(byStatus) : ['No bids'];
    const data = Object.keys(byStatus).length ? labels.map(l => byStatus[l]) : [1];
    charts.vendorBidMix = new Chart(bidCtx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: chartColors.palette.slice(0, labels.length),
          borderWidth: 0,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { font: { size: 11, weight: '600' }, padding: 10 } },
          tooltip: { backgroundColor: '#1e293b', padding: 12, cornerRadius: 8 }
        },
        cutout: '58%'
      }
    });
  }

  // Delivery / payment stacked-like grouped bar
  destroyChart('vendorDeliveryPay');
  const delCtx = document.getElementById('chartVendorDeliveryPay');
  if (delCtx) {
    const grnAccepted = deliveries.filter(d => d.grn === 'Accepted').length;
    const grnPending = deliveries.filter(d => d.grn !== 'Accepted').length;
    const paid = deliveries.filter(d => d.payment === 'Paid').length;
    const processing = deliveries.filter(d => d.payment === 'Processing').length;
    const unpaid = deliveries.filter(d => d.payment === '—' || !d.payment || (d.payment !== 'Paid' && d.payment !== 'Processing')).length;
    charts.vendorDeliveryPay = new Chart(delCtx, {
      type: 'bar',
      data: {
        labels: ['GRN Accepted', 'GRN Pending', 'Payment Paid', 'Payment Processing', 'Payment Pending'],
        datasets: [{
          label: 'Count',
          data: [grnAccepted, grnPending, paid, processing, unpaid],
          backgroundColor: [
            chartColors.green + 'cc',
            chartColors.orange + 'cc',
            chartColors.teal + 'cc',
            chartColors.blue + 'cc',
            chartColors.red + 'cc'
          ],
          borderRadius: 6,
          borderWidth: 0
        }]
      },
      options: chartOptions('Count')
    });
  }

  // Performance score radar removed from My Reports (available on Performance Score page)

  // Lifecycle completion
  destroyChart('vendorLifecycle');
  const lifeCtx = document.getElementById('chartVendorLifecycle');
  if (lifeCtx) {
    const labels = ['Reg', 'KYC', 'Approval', 'Bid', 'Award', 'Contract', 'Delivery', 'Invoice', 'Payment'];
    const data = labels.map((_, i) => (completed[i + 1] ? 100 : (i + 1 === (typeof getVendorActiveStageId === 'function' ? getVendorActiveStageId() : 4) ? 45 : 0)));
    charts.vendorLifecycle = new Chart(lifeCtx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Completion %',
          data,
          backgroundColor: data.map(v => v === 100 ? chartColors.green + 'cc' : v > 0 ? chartColors.blue + 'cc' : '#cbd5e1'),
          borderRadius: 6,
          borderWidth: 0
        }]
      },
      options: {
        ...chartOptions('%'),
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: '#e2e8f0' },
            ticks: { font: { size: 11 }, callback: v => v + '%' }
          }
        }
      }
    });
  }
}
