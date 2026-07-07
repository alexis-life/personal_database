'use strict';

// ── Dessert Shops rendering ───────────────────────────────────────────────────

function renderDessertShops() {
  var year  = dessertYear;
  var isAll = (year === 'all');
  var data  = isAll ? DESSERT : DESSERT.filter(function(d) { return d.date && d.date.slice(0, 4) === year; });

  _renderDessertStats(data, year, isAll);
  _renderDessertCharts(data, year, isAll);
  renderDessertShopsTable();
}

function _renderDessertStats(data, year, isAll) {
  var yesCount = data.filter(function(d) { return (d.would_return || '').toLowerCase() === 'yes'; }).length;
  var grid     = document.getElementById('ds-stat-grid');

  if (isAll) {
    var curYear  = new Date().getFullYear();
    var thisYear = DESSERT.filter(function(d) { return d.date && d.date.slice(0, 4) === String(curYear); }).length;
    var sGrade   = DESSERT.filter(function(d) { return gradeBase(d.overall) === 'S'; }).length;
    grid.innerHTML =
      statCard(1, 'Total Visits',   DESSERT.length, 'dessert shops logged') +
      statCard(2, 'Would Return',   yesCount,       DESSERT.length ? Math.round(yesCount / DESSERT.length * 100) + '% of visits' : 'of visits') +
      statCard(3, 'This Year',      thisYear,       'visits in ' + curYear) +
      statCard(4, 'S-Grade Visits', sGrade,         'top rated overall');
  } else {
    var newPlaces  = data.filter(function(d) { return (d.return_visit || '').toLowerCase() !== 'yes'; }).length;
    var sGradeYear = data.filter(function(d) { return gradeBase(d.overall) === 'S'; }).length;
    grid.innerHTML =
      statCard(1, 'Would Return', yesCount,    data.length ? Math.round(yesCount / data.length * 100) + '% in ' + year : 'in ' + year) +
      statCard(2, 'New Places',   newPlaces,   'first visits in ' + year) +
      statCard(3, 'Total Visits', data.length, 'in ' + year) +
      statCard(4, 'S-Grade',      sGradeYear,  'top rated in ' + year);
  }
}

function _renderDessertCharts(data, year, isAll) {
  var grid = document.getElementById('ds-chart-grid');
  destroyCharts(['chart-dessert-return', 'chart-dessert-new', 'chart-dessert-grades', 'chart-dessert-months', 'chart-dessert-type', 'chart-dessert-years', 'chart-dessert-people']);

  if (isAll) {
    grid.innerHTML =
      chartCard('Would Return',               'chart-dessert-return', '', 'medium') +
      chartCard('New vs Return Visits',        'chart-dessert-new',    '', 'medium') +
      chartCard('Overall Grade Distribution', 'chart-dessert-grades', '', 'medium') +
      chartCard('Type Breakdown',              'chart-dessert-type',   '', 'medium') +
      chartCard('Visits by Month',             'chart-dessert-months', '', 'medium') +
      chartCard('Visits by Year',              'chart-dessert-years',  '', 'medium');
    _dessertReturnChart('chart-dessert-return', data);
    _dessertNewChart(   'chart-dessert-new',    data);
    _dessertGradeChart( 'chart-dessert-grades', data);
    _dessertTypeChart(  'chart-dessert-type',   data);
    _dessertMonthsChart('chart-dessert-months', data);
    _dessertYearsChart( 'chart-dessert-years',  DESSERT);
  } else {
    grid.innerHTML =
      chartCard('Would Return — '     + esc(year), 'chart-dessert-return', '', 'medium') +
      chartCard('New vs Return — '    + esc(year), 'chart-dessert-new',    '', 'medium') +
      chartCard('Overall Grade — '    + esc(year), 'chart-dessert-grades', '', 'medium') +
      chartCard('Type — '             + esc(year), 'chart-dessert-type',   '', 'medium') +
      chartCard('Who You Ate With — ' + esc(year), 'chart-dessert-people', '', 'medium') +
      chartCard('Visits by Month — '  + esc(year), 'chart-dessert-months', '', 'medium');
    _dessertReturnChart('chart-dessert-return', data);
    _dessertNewChart(   'chart-dessert-new',    data);
    _dessertGradeChart( 'chart-dessert-grades', data);
    _dessertTypeChart(  'chart-dessert-type',   data);
    _dessertPeopleChart('chart-dessert-people', data);
    _dessertMonthsChart('chart-dessert-months', data);
  }
}

function _dessertReturnChart(id, data) {
  var ret = { yes: 0, no: 0, maybe: 0 };
  data.forEach(function(d) { var k = (d.would_return || '').toLowerCase(); if (k in ret) ret[k]++; });
  safeChart(id, {
    type: 'doughnut',
    data: {
      labels: ['would return', 'would not', 'maybe'],
      datasets: [{ data: [ret.yes, ret.no, ret.maybe], backgroundColor: [C.rose, C.maroon, C.pink] }]
    },
    options: { maintainAspectRatio: false, plugins: { legend: legendRight() } }
  });
}

function _dessertNewChart(id, data) {
  var newCount    = data.filter(function(d) { return (d.return_visit || '').toLowerCase() !== 'yes'; }).length;
  var returnCount = data.filter(function(d) { return (d.return_visit || '').toLowerCase() === 'yes'; }).length;
  safeChart(id, {
    type: 'doughnut',
    data: {
      labels: ['new place', 'return visit'],
      datasets: [{ data: [newCount, returnCount], backgroundColor: [C.rose, C.petal] }]
    },
    options: { maintainAspectRatio: false, plugins: { legend: legendRight() } }
  });
}

function _dessertGradeChart(id, data) {
  var ORDER    = ['S','A','B','C','D'];
  var GRADE_BG = { S: C.maroon, A: C.rose, B: C.pink, C: C.blush, D: C.petal };
  var counts   = { S: 0, A: 0, B: 0, C: 0, D: 0 };
  data.forEach(function(d) { var g = gradeBase(d.overall); if (g in counts) counts[g]++; });
  safeChart(id, {
    type: 'bar',
    data: {
      labels: ORDER,
      datasets: [{ data: ORDER.map(function(g) { return counts[g]; }), backgroundColor: ORDER.map(function(g) { return GRADE_BG[g]; }), borderRadius: 4 }]
    },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: scaleX(11), y: scaleY() } }
  });
}

function _dessertMonthsChart(id, data) {
  // Group by calendar month (Jan–Dec), ignoring year
  var MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var counts = [0,0,0,0,0,0,0,0,0,0,0,0];
  data.forEach(function(d) {
    if (!d.date) return;
    var m = parseInt(d.date.slice(5, 7), 10) - 1;
    if (m >= 0 && m < 12) counts[m]++;
  });

  safeChart(id, {
    type: 'bar',
    data: { labels: MONTH_NAMES, datasets: [{ data: counts, backgroundColor: C.pink, borderRadius: 4 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: scaleX(11), y: scaleY() } }
  });
}

function _dessertTypeChart(id, data) {
  var map = {};
  data.forEach(function(d) {
    var t = d.type ? d.type.replace(/_/g, ' ') : null;
    if (t) map[t] = (map[t] || 0) + 1;
  });
  var entries = Object.entries(map).sort(function(a, b) { return b[1] - a[1]; });

  if (!entries.length) {
    var el = document.getElementById(id);
    if (el) el.parentNode.innerHTML = '<p style="color:var(--c7);font-size:0.85rem;padding:8px 0">No type data available.</p>';
    return;
  }

  safeChart(id, {
    type: 'bar',
    data: {
      labels: entries.map(function(kv) { return kv[0]; }),
      datasets: [{ data: entries.map(function(kv) { return kv[1]; }), backgroundColor: PALETTE, borderRadius: 4 }]
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: scaleY(), y: scaleX(0) }
    }
  });
}

function _dessertYearsChart(id, data) {
  var yearCounts = {};
  data.forEach(function(d) {
    var y = d.date ? d.date.slice(0, 4) : null;
    if (y) yearCounts[y] = (yearCounts[y] || 0) + 1;
  });
  var years = Object.keys(yearCounts).sort();

  safeChart(id, {
    type: 'bar',
    data: { labels: years, datasets: [{ data: years.map(function(y) { return yearCounts[y]; }), backgroundColor: C.rose, borderRadius: 4 }] },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: scaleX(11), y: scaleY() }
    }
  });
}

function _dessertPeopleChart(id, data) {
  var map = {};
  data.forEach(function(d) {
    var p = (d.people || '').trim().toLowerCase();
    if (!p || p === 'alone') return;
    p.split(/,\s*and\s*|,\s*|\s+and\s+/).forEach(function(name) {
      name = name.trim();
      if (name) map[name] = (map[name] || 0) + 1;
    });
  });
  var entries = Object.entries(map).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 10);

  if (!entries.length) {
    var el = document.getElementById(id);
    if (el) el.parentNode.innerHTML = '<p style="color:var(--c7);font-size:0.85rem;padding:8px 0">No people data available.</p>';
    return;
  }

  safeChart(id, {
    type: 'bar',
    data: {
      labels: entries.map(function(kv) { return kv[0]; }),
      datasets: [{ data: entries.map(function(kv) { return kv[1]; }), backgroundColor: PALETTE, borderRadius: 4 }]
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: scaleY(), y: scaleX(0) }
    }
  });
}

// ── Dessert Shops table (with sort) ───────────────────────────────────────────
function renderDessertShopsTable() {
  var search    = document.getElementById('ds-search').value.toLowerCase();
  var returnSel = document.getElementById('ds-filter-return').value;
  var typeSel   = document.getElementById('ds-filter-type').value;
  var year      = dessertYear;

  var rows = DESSERT.slice().reverse();
  if (year !== 'all' && year) rows = rows.filter(function(d) { return d.date && d.date.slice(0, 4) === year; });
  if (returnSel) rows = rows.filter(function(d) { return (d.would_return || '').toLowerCase() === returnSel; });
  if (typeSel)   rows = rows.filter(function(d) { return (d.type || '') === typeSel; });
  if (search) rows = rows.filter(function(d) {
    return (d.name     || '').toLowerCase().indexOf(search) !== -1 ||
           (d.location || '').toLowerCase().indexOf(search) !== -1 ||
           (d.type     || '').toLowerCase().indexOf(search) !== -1 ||
           (d.people   || '').toLowerCase().indexOf(search) !== -1;
  });

  // Sort
  var s = dessertSort;
  if (s.col) {
    var dir = s.dir === 'asc' ? 1 : -1;
    rows.sort(function(a, b) {
      if (s.col === 'name') {
        return dir * (a.name || '').localeCompare(b.name || '');
      }
      if (s.col === 'date') {
        var da = new Date(a.date || '1900-01-01');
        var db = new Date(b.date || '1900-01-01');
        return dir * (da - db);
      }
      var gradeFields = ['food','service','atmosphere','value','overall'];
      if (gradeFields.indexOf(s.col) !== -1) {
        var ra = gradeRank(a[s.col]);
        var rb = gradeRank(b[s.col]);
        if (ra !== rb) return dir * (ra - rb);
        return dir * (a[s.col] || '').localeCompare(b[s.col] || '');
      }
      return 0;
    });
  }

  updateSortIndicators('section-dessert', s);
  document.getElementById('ds-count').textContent = rows.length;

  var tbody = document.getElementById('ds-tbody');
  tbody.innerHTML = '';

  if (!rows.length) {
    tbody.innerHTML = '<tr class="no-data-row"><td colspan="10">No dessert shops match the current filters.</td></tr>';
    return;
  }

  rows.forEach(function(d) {
    var tr  = document.createElement('tr');
    var wr  = (d.would_return || '').toLowerCase();
    var cls = wr === 'yes' ? 'badge-yes' : wr === 'no' ? 'badge-no' : wr === 'maybe' ? 'badge-maybe' : '';
    var txt = wr || '—';
    tr.innerHTML =
      '<td>' + esc(d.name) + '</td>' +
      '<td>' + esc(fmtDate(d.date)) + '</td>' +
      '<td>' + esc(d.location || '—') + '</td>' +
      '<td>' + esc(d.type ? d.type.replace(/_/g, ' ') : '—') + '</td>' +
      '<td>' + (cls ? '<span class="badge ' + cls + '">' + txt + '</span>' : txt) + '</td>' +
      '<td>' + gradeBadge(d.food)       + '</td>' +
      '<td>' + gradeBadge(d.service)    + '</td>' +
      '<td>' + gradeBadge(d.atmosphere) + '</td>' +
      '<td>' + gradeBadge(d.value)      + '</td>' +
      '<td>' + gradeBadge(d.overall)    + '</td>';
    tbody.appendChild(tr);
  });
}
