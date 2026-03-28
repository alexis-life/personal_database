'use strict';

// ── Restaurants rendering ─────────────────────────────────────────────────────

function gradeBadge(g) {
  if (!g) return '\u2014';
  var base = gradeBase(g);
  return '<span class="badge badge-' + base + '">' + esc(g) + '</span>';
}

function renderRestaurants() {
  var year  = restYear;
  var isAll = (year === 'all');
  var data  = isAll ? REST : REST.filter(function(r) { return r.date && r.date.slice(0, 4) === year; });

  _renderRestaurantsStats(data, year, isAll);
  _renderRestaurantsCharts(data, year, isAll);
  renderRestaurantsTable();
}

function _renderRestaurantsStats(data, year, isAll) {
  var yesCount = data.filter(function(r) { return (r.would_return || '').toLowerCase() === 'yes'; }).length;
  var grid     = document.getElementById('r-stat-grid');

  if (isAll) {
    var curYear  = new Date().getFullYear();
    var thisYear = REST.filter(function(r) { return r.date && r.date.slice(0, 4) === String(curYear); }).length;
    var sGrade   = REST.filter(function(r) { return gradeBase(r.overall) === 'S'; }).length;
    grid.innerHTML =
      statCard(1, 'Total Visits',   REST.length, 'restaurants logged') +
      statCard(2, 'Would Return',   yesCount,    REST.length ? Math.round(yesCount / REST.length * 100) + '% of visits' : 'of visits') +
      statCard(3, 'This Year',      thisYear,    'visits in ' + curYear) +
      statCard(4, 'S-Grade Visits', sGrade,      'top rated overall');
  } else {
    var newPlaces  = data.filter(function(r) { return (r.return_visit || '').toLowerCase() !== 'yes'; }).length;
    var sGradeYear = data.filter(function(r) { return gradeBase(r.overall) === 'S'; }).length;
    grid.innerHTML =
      statCard(1, 'Would Return', yesCount,     data.length ? Math.round(yesCount / data.length * 100) + '% in ' + year : 'in ' + year) +
      statCard(2, 'New Places',   newPlaces,    'first visits in ' + year) +
      statCard(3, 'Total Visits', data.length,  'in ' + year) +
      statCard(4, 'S-Grade',      sGradeYear,   'top rated in ' + year);
  }
}

function _renderRestaurantsCharts(data, year, isAll) {
  var grid = document.getElementById('r-chart-grid');
  destroyCharts(['chart-rest-return', 'chart-rest-grades', 'chart-rest-months', 'chart-rest-new']);

  if (isAll) {
    grid.innerHTML =
      chartCard('Would Return',              'chart-rest-return', '', false) +
      chartCard('Overall Grade Distribution','chart-rest-grades', '', false) +
      chartCard('Visits by Month',           'chart-rest-months', '', false);
    _restReturnChart('chart-rest-return', data);
    _restGradeChart( 'chart-rest-grades', data);
    _restMonthsChart('chart-rest-months', data);
  } else {
    grid.innerHTML =
      chartCard('Would Return \u2014 '              + esc(year), 'chart-rest-return', '', false) +
      chartCard('Overall Grade \u2014 '             + esc(year), 'chart-rest-grades', '', false) +
      chartCard('Visits by Month \u2014 '           + esc(year), 'chart-rest-months', '', false) +
      chartCard('New vs Return Visits \u2014 '      + esc(year), 'chart-rest-new',    '', false);
    _restReturnChart('chart-rest-return', data);
    _restGradeChart( 'chart-rest-grades', data);
    _restMonthsChart('chart-rest-months', data);
    _restNewChart(   'chart-rest-new',    data);
  }
}

function _restReturnChart(id, data) {
  var ret = { yes: 0, no: 0, maybe: 0 };
  data.forEach(function(r) { var k = (r.would_return || '').toLowerCase(); if (k in ret) ret[k]++; });
  safeChart(id, {
    type: 'doughnut',
    data: {
      labels: ['Would Return', 'Would Not', 'Maybe'],
      datasets: [{ data: [ret.yes, ret.no, ret.maybe], backgroundColor: ['#b9375e', '#8a2846', '#e05780'] }]
    },
    options: { plugins: { legend: legendRight() } }
  });
}

function _restGradeChart(id, data) {
  var ORDER   = ['S','A','B','C','D'];
  var GRADE_BG = { S: '#8a2846', A: '#b9375e', B: '#e05780', C: '#ff9ebb', D: '#ffc2d4' };
  var counts  = { S: 0, A: 0, B: 0, C: 0, D: 0 };
  data.forEach(function(r) { var g = gradeBase(r.overall); if (g in counts) counts[g]++; });
  safeChart(id, {
    type: 'bar',
    data: {
      labels: ORDER,
      datasets: [{ data: ORDER.map(function(g) { return counts[g]; }), backgroundColor: ORDER.map(function(g) { return GRADE_BG[g]; }), borderRadius: 4 }]
    },
    options: { plugins: { legend: { display: false } }, scales: { x: scaleX(11), y: scaleY() } }
  });
}

function _restMonthsChart(id, data) {
  var monthMap = {};
  data.forEach(function(r) { if (!r.date) return; var k = r.date.slice(0, 7); monthMap[k] = (monthMap[k] || 0) + 1; });
  var months = Object.keys(monthMap).sort();

  if (!months.length) { document.getElementById(id).parentNode.innerHTML = '<p style="color:var(--c7);font-size:0.85rem;padding:8px">No visit data available.</p>'; return; }

  safeChart(id, {
    type: 'bar',
    data: { labels: months, datasets: [{ data: months.map(function(m) { return monthMap[m]; }), backgroundColor: '#e05780', borderRadius: 4 }] },
    options: { plugins: { legend: { display: false } }, scales: { x: scaleX(10), y: scaleY() } }
  });
}

function _restNewChart(id, data) {
  var newCount    = data.filter(function(r) { return (r.return_visit || '').toLowerCase() !== 'yes'; }).length;
  var returnCount = data.filter(function(r) { return (r.return_visit || '').toLowerCase() === 'yes'; }).length;
  safeChart(id, {
    type: 'doughnut',
    data: {
      labels: ['New Place', 'Return Visit'],
      datasets: [{ data: [newCount, returnCount], backgroundColor: ['#b9375e', '#ffc2d4'] }]
    },
    options: { plugins: { legend: legendRight() } }
  });
}

function renderRestaurantsTable() {
  var search    = document.getElementById('r-search').value.toLowerCase();
  var returnSel = document.getElementById('r-filter-return').value;
  var year      = restYear;

  var rows = REST.slice().reverse();
  if (year !== 'all' && year) rows = rows.filter(function(r) { return r.date && r.date.slice(0, 4) === year; });
  if (returnSel) rows = rows.filter(function(r) { return (r.would_return || '').toLowerCase() === returnSel; });
  if (search) rows = rows.filter(function(r) {
    return (r.name     || '').toLowerCase().indexOf(search) !== -1 ||
           (r.location || '').toLowerCase().indexOf(search) !== -1 ||
           (r.people   || '').toLowerCase().indexOf(search) !== -1;
  });

  document.getElementById('r-count').textContent = rows.length;
  var tbody = document.getElementById('r-tbody');
  tbody.innerHTML = '';

  if (!rows.length) {
    tbody.innerHTML = '<tr class="no-data-row"><td colspan="9">No restaurants match the current filters.</td></tr>';
    return;
  }

  rows.forEach(function(r) {
    var tr  = document.createElement('tr');
    var wr  = (r.would_return || '').toLowerCase();
    var cls = wr === 'yes' ? 'badge-yes' : wr === 'no' ? 'badge-no' : wr === 'maybe' ? 'badge-maybe' : '';
    var txt = wr ? wr.charAt(0).toUpperCase() + wr.slice(1) : '\u2014';
    tr.innerHTML =
      '<td>' + esc(r.name) + '</td>' +
      '<td>' + esc(fmtDate(r.date)) + '</td>' +
      '<td>' + esc(r.location || '\u2014') + '</td>' +
      '<td>' + (cls ? '<span class="badge ' + cls + '">' + txt + '</span>' : txt) + '</td>' +
      '<td>' + gradeBadge(r.food)       + '</td>' +
      '<td>' + gradeBadge(r.service)    + '</td>' +
      '<td>' + gradeBadge(r.atmosphere) + '</td>' +
      '<td>' + gradeBadge(r.value)      + '</td>' +
      '<td>' + gradeBadge(r.overall)    + '</td>';
    tbody.appendChild(tr);
  });
}
