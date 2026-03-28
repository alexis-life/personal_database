'use strict';

// ── Dimoo rendering ───────────────────────────────────────────────────────────

function renderDimoo() {
  var filter = dimooFilter;
  var isAll  = (filter === 'all');
  var data   = isAll ? DIM : DIM.filter(function(d) { return d.series === filter; });

  _renderDimooStats(data, filter, isAll);
  _renderDimooCharts(data, isAll);
  renderDimooTable();
}

function _renderDimooStats(data, filter, isAll) {
  var owned   = data.filter(function(d) { return d.owned === 'yes'; }).length;
  var missing = data.length - owned;
  var grid    = document.getElementById('d-stat-grid');

  if (isAll) {
    var seriesCount = Array.from(new Set(DIM.map(function(d) { return d.series; }))).length;
    grid.innerHTML =
      statCard(1, 'Total Figurines', DIM.length, 'across all series') +
      statCard(2, 'Owned',   owned,   Math.round(owned   / DIM.length * 100) + '% of collection') +
      statCard(3, 'Missing', missing, Math.round(missing / DIM.length * 100) + '% of collection') +
      statCard(4, 'Series',  seriesCount, 'unique series');
  } else {
    var label = titleCase(filter);
    grid.innerHTML =
      statCard(1, 'Owned',   owned,   'in ' + label) +
      statCard(2, 'Missing', missing, 'in ' + label);
  }
}

function _renderDimooCharts(data, isAll) {
  var grid = document.getElementById('d-chart-grid');

  // Clean up existing chart instances before replacing canvases
  destroyCharts(['chart-dimoo-bar', 'chart-dimoo-how', 'chart-dimoo-growth']);

  if (isAll) {
    grid.innerHTML =
      chartCard('Owned vs Missing by Series', 'chart-dimoo-bar', 'wide', true) +
      chartCard('Acquisition Method',         'chart-dimoo-how',    '', false) +
      chartCard('Collection Growth',          'chart-dimoo-growth', '', false);

    // Stacked horizontal bar — all series in series_date order
    var seen = [];
    DIM.forEach(function(d) { if (seen.indexOf(d.series) === -1) seen.push(d.series); });
    var labels       = seen.map(function(s) { var w = s.split(' '); return w.length > 4 ? w.slice(0,4).join(' ') + '\u2026' : s; });
    var ownedCounts  = seen.map(function(s) { return DIM.filter(function(d) { return d.series === s && d.owned === 'yes'; }).length; });
    var missingCounts= seen.map(function(s) { return DIM.filter(function(d) { return d.series === s && d.owned !== 'yes'; }).length; });

    safeChart('chart-dimoo-bar', {
      type: 'bar',
      data: { labels: labels, datasets: [
        { label: 'Owned',   data: ownedCounts,   backgroundColor: '#b9375e' },
        { label: 'Missing', data: missingCounts, backgroundColor: '#ffc2d4' }
      ]},
      options: {
        maintainAspectRatio: false,
        indexAxis: 'y',
        scales: {
          x: { stacked: true, ticks: { font: { family: 'Poppins', size: 11 }, color: '#8a2846' }, grid: { color: '#ffe0e9' } },
          y: { stacked: true, ticks: { font: { family: 'Poppins', size: 10 }, color: '#522e38' }, grid: { display: false } }
        },
        plugins: { legend: { labels: { font: { family: 'Poppins', size: 12 }, color: '#522e38' } } }
      }
    });

    // Acquisition: owned-only, all series
    _dimooAcquisitionChart('chart-dimoo-how', DIM.filter(function(d) { return d.owned === 'yes'; }));
    _dimooGrowthChart('chart-dimoo-growth', DIM);

  } else {
    grid.innerHTML =
      chartCard('Acquisition Method',  'chart-dimoo-how',    '', false) +
      chartCard('Collection Growth',   'chart-dimoo-growth', '', false);

    // Acquisition: owned-only, this series only
    _dimooAcquisitionChart('chart-dimoo-how', data.filter(function(d) { return d.owned === 'yes'; }));
    _dimooGrowthChart('chart-dimoo-growth', data);
  }
}

function _dimooAcquisitionChart(canvasId, data) {
  var howMap = {};
  data.forEach(function(d) {
    var raw = ((d.how || 'unknown')).toLowerCase().trim();
    var k;
    if      (raw.indexOf('blind') !== -1)                        k = 'Blind Box';
    else if (raw.indexOf('gift')  !== -1)                        k = 'Gift';
    else if (raw.indexOf('self')  !== -1 || raw === 'bought')    k = 'Self Bought';
    else if (raw.indexOf('trade') !== -1)                        k = 'Trade';
    else if (raw.indexOf('pre')   !== -1 || raw.indexOf('second') !== -1) k = 'Pre-owned';
    else if (raw === 'n/a' || raw === '')                        k = 'Unknown';
    else k = raw.charAt(0).toUpperCase() + raw.slice(1);
    howMap[k] = (howMap[k] || 0) + 1;
  });

  var keys = Object.keys(howMap);
  if (!keys.length) { document.getElementById(canvasId).parentNode.innerHTML = '<p style="color:var(--c7);font-size:0.85rem;padding:8px">No owned figurines in this filter.</p>'; return; }

  safeChart(canvasId, {
    type: 'doughnut',
    data: { labels: keys, datasets: [{ data: keys.map(function(k) { return howMap[k]; }), backgroundColor: PALETTE }] },
    options: { plugins: { legend: legendRight() } }
  });
}

function _dimooGrowthChart(canvasId, data) {
  var monthCounts = {};
  data.filter(function(d) { return d.owned === 'yes' && d.purchase_date && d.purchase_date !== 'n/a'; })
      .forEach(function(d) {
        var dt = parseDate(d.purchase_date);
        if (!dt || isNaN(dt)) return;
        var key = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
        monthCounts[key] = (monthCounts[key] || 0) + 1;
      });

  var months = Object.keys(monthCounts).sort();
  if (!months.length) { document.getElementById(canvasId).parentNode.innerHTML = '<p style="color:var(--c7);font-size:0.85rem;padding:8px">No purchase dates available.</p>'; return; }

  var cum = 0;
  var cumData = months.map(function(m) { cum += monthCounts[m]; return cum; });

  safeChart(canvasId, {
    type: 'line',
    data: { labels: months, datasets: [{
      label: 'Owned',
      data: cumData,
      borderColor: '#b9375e',
      backgroundColor: 'rgba(185,55,94,0.12)',
      fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: '#b9375e'
    }]},
    options: {
      scales: {
        x: { ticks: { font: { family: 'Poppins', size: 10 }, color: '#8a2846', maxRotation: 45 }, grid: { color: '#ffe0e9' } },
        y: scaleY()
      },
      plugins: { legend: { display: false } }
    }
  });
}

function renderDimooTable() {
  var search  = document.getElementById('d-search').value.toLowerCase();
  var ownedF  = document.getElementById('d-filter-owned').value;
  var filter  = dimooFilter;

  var rows = DIM.slice();
  if (filter !== 'all') rows = rows.filter(function(d) { return d.series === filter; });
  if (ownedF)           rows = rows.filter(function(d) { return d.owned === ownedF; });
  if (search)           rows = rows.filter(function(d) {
    return (d.name   || '').toLowerCase().indexOf(search) !== -1 ||
           (d.series || '').toLowerCase().indexOf(search) !== -1 ||
           (d.who    || '').toLowerCase().indexOf(search) !== -1;
  });

  document.getElementById('d-count').textContent = rows.length;
  var tbody = document.getElementById('d-tbody');
  tbody.innerHTML = '';

  if (!rows.length) {
    tbody.innerHTML = '<tr class="no-data-row"><td colspan="7">No figurines match the current filters.</td></tr>';
    return;
  }

  rows.forEach(function(d) {
    var tr = document.createElement('tr');
    var isOwned = d.owned === 'yes';
    tr.innerHTML =
      '<td>' + esc(d.name) + '</td>' +
      '<td>' + esc(d.series) + '</td>' +
      '<td>' + esc(d.number) + '</td>' +
      '<td><span class="badge ' + (isOwned ? 'badge-owned' : 'badge-missing') + '">' + (isOwned ? 'Owned' : 'Missing') + '</span></td>' +
      '<td>' + esc(d.how) + '</td>' +
      '<td>' + esc(d.who) + '</td>' +
      '<td>' + (d.purchase_date && d.purchase_date !== 'n/a' ? esc(d.purchase_date) : '\u2014') + '</td>';
    tbody.appendChild(tr);
  });
}
