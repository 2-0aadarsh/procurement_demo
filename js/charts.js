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

function initSpendChart(period = 'year', category = 'All') {
  destroyChart('spend');
  const ctx = document.getElementById('chartSpend');
  if (!ctx) return;
  const d = CHART_DATA.spend[period];
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
  const d = CHART_DATA.procurement[period];
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
  const d = CHART_DATA.vendorPerf[period];
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
  const d = CHART_DATA.savings[period];
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
      cutout: '60%'
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
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        padding: 10,
        cornerRadius: 8,
        titleFont: { size: 12 },
        bodyFont: { size: 11 }
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
        openDrillDown('chart', `${chart.data.datasets[0].label}: ${label}`, `Detailed breakdown for ${label}. Click through to transaction-level data.`);
      }
    }
  };
}

function refreshAllCharts(period = 'year', category = 'All') {
  initSpendChart(period, category);
  initProcurementChart(period, category);
  initVendorPerfChart(period, category);
  initSavingsChart(period, category);
  initCategoryChart(category);
}

function initVendorCharts(category = 'All') {
  initCategoryChart(category);
  initVendorTrendChart();
}
