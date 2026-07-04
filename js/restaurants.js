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
      statCard(1, 'Would Return', yesCount,    data.length ? Math.round(yesCount / data.length * 100) + '% in ' + year : 'in ' + year) +
      statCard(2, 'New Places',   newPlaces,   'first visits in ' + year) +
      statCard(3, 'Total Visits', data.length, 'in ' + year) +
      statCard(4, 'S-Grade',      sGradeYear,  'top rated in ' + year);
  }
}

function _renderRestaurantsCharts(data, year, isAll) {
  var grid = document.getElementById('r-chart-grid');
  destroyCharts(['chart-rest-return', 'chart-rest-new', 'chart-rest-grades', 'chart-rest-months', 'chart-rest-cuisine', 'chart-rest-years']);

  if (isAll) {
    grid.innerHTML =
      chartCard('Would Return',               'chart-rest-return',  '', 'medium') +
      chartCard('New vs Return Visits',        'chart-rest-new',     '', 'medium') +
      chartCard('Overall Grade Distribution', 'chart-rest-grades',  '', 'medium') +
      chartCard('Cuisine Breakdown',          'chart-rest-cuisine', '', 'medium') +
      chartCard('Visits by Month',            'chart-rest-months',  '', 'medium') +
      chartCard('Visits by Year',             'chart-rest-years',   '', 'medium');
  } else {
    grid.innerHTML =
      chartCard('Would Return \u2014 '    + esc(year), 'chart-rest-return',  '', 'medium') +
      chartCard('New vs Return \u2014 '   + esc(year), 'chart-rest-new',     '', 'medium') +
      chartCard('Overall Grade \u2014 '   + esc(year), 'chart-rest-grades',  '', 'medium') +
      chartCard('Cuisine \u2014 '         + esc(year), 'chart-rest-cuisine', '', 'medium') +
      chartCard('Visits by Month \u2014 ' + esc(year), 'chart-rest-months',  '', 'medium') +
      chartCard('Visits by Year',              'chart-rest-years',   '', 'medium');
  }

  _restReturnChart( 'chart-rest-return',  data);
  _restNewChart(    'chart-rest-new',     data);
  _restGradeChart(  'chart-rest-grades',  data);
  _restMonthsChart( 'chart-rest-months',  data);
  _restCuisineChart('chart-rest-cuisine', data);
  _restYearsChart(  'chart-rest-years',   REST);
}

function _restReturnChart(id, data) {
  var ret = { yes: 0, no: 0, maybe: 0 };
  data.forEach(function(r) { var k = (r.would_return || '').toLowerCase(); if (k in ret) ret[k]++; });
  safeChart(id, {
    type: 'doughnut',
    data: {
      labels: ['would return', 'would not', 'maybe'],
      datasets: [{ data: [ret.yes, ret.no, ret.maybe], backgroundColor: [C.rose, C.maroon, C.pink] }]
    },
    options: { maintainAspectRatio: false, plugins: { legend: legendRight() } }
  });
}

function _restNewChart(id, data) {
  var newCount    = data.filter(function(r) { return (r.return_visit || '').toLowerCase() !== 'yes'; }).length;
  var returnCount = data.filter(function(r) { return (r.return_visit || '').toLowerCase() === 'yes'; }).length;
  safeChart(id, {
    type: 'doughnut',
    data: {
      labels: ['new place', 'return visit'],
      datasets: [{ data: [newCount, returnCount], backgroundColor: [C.rose, C.petal] }]
    },
    options: { maintainAspectRatio: false, plugins: { legend: legendRight() } }
  });
}

function _restGradeChart(id, data) {
  var ORDER    = ['S','A','B','C','D'];
  var GRADE_BG = { S: C.maroon, A: C.rose, B: C.pink, C: C.blush, D: C.petal };
  var counts   = { S: 0, A: 0, B: 0, C: 0, D: 0 };
  data.forEach(function(r) { var g = gradeBase(r.overall); if (g in counts) counts[g]++; });
  safeChart(id, {
    type: 'bar',
    data: {
      labels: ORDER,
      datasets: [{ data: ORDER.map(function(g) { return counts[g]; }), backgroundColor: ORDER.map(function(g) { return GRADE_BG[g]; }), borderRadius: 4 }]
    },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: scaleX(11), y: scaleY() } }
  });
}

function _restMonthsChart(id, data) {
  // Group by calendar month (Jan–Dec), ignoring year
  var MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var counts = [0,0,0,0,0,0,0,0,0,0,0,0];
  data.forEach(function(r) {
    if (!r.date) return;
    var m = parseInt(r.date.slice(5, 7), 10) - 1;
    if (m >= 0 && m < 12) counts[m]++;
  });

  safeChart(id, {
    type: 'bar',
    data: { labels: MONTH_NAMES, datasets: [{ data: counts, backgroundColor: C.pink, borderRadius: 4 }] },
    options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: scaleX(11), y: scaleY() } }
  });
}

function _restCuisineChart(id, data) {
  var map = {};
  data.forEach(function(r) {
    var c = r.cuisine ? r.cuisine.replace(/_/g, ' ') : null;
    if (c) map[c] = (map[c] || 0) + 1;
  });
  var entries = Object.entries(map).sort(function(a, b) { return b[1] - a[1]; });

  if (!entries.length) {
    var el = document.getElementById(id);
    if (el) el.parentNode.innerHTML = '<p style="color:var(--c7);font-size:0.85rem;padding:8px 0">No cuisine data available.</p>';
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

function _restYearsChart(id, data) {
  var yearCounts = {};
  data.forEach(function(r) {
    var y = r.date ? r.date.slice(0, 4) : null;
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

// ── Restaurants table (with sort) ─────────────────────────────────────────────
function renderRestaurantsTable() {
  var search     = document.getElementById('r-search').value.toLowerCase();
  var returnSel  = document.getElementById('r-filter-return').value;
  var cuisineSel = document.getElementById('r-filter-cuisine').value;
  var year       = restYear;

  var rows = REST.slice().reverse();
  if (year !== 'all' && year) rows = rows.filter(function(r) { return r.date && r.date.slice(0, 4) === year; });
  if (returnSel)  rows = rows.filter(function(r) { return (r.would_return || '').toLowerCase() === returnSel; });
  if (cuisineSel) rows = rows.filter(function(r) { return (r.cuisine || '') === cuisineSel; });
  if (search) rows = rows.filter(function(r) {
    return (r.name     || '').toLowerCase().indexOf(search) !== -1 ||
           (r.location || '').toLowerCase().indexOf(search) !== -1 ||
           (r.cuisine  || '').toLowerCase().indexOf(search) !== -1 ||
           (r.people   || '').toLowerCase().indexOf(search) !== -1;
  });

  // Sort
  var s = restSort;
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

  updateSortIndicators('section-restaurants', s);
  document.getElementById('r-count').textContent = rows.length;

  var tbody = document.getElementById('r-tbody');
  tbody.innerHTML = '';

  if (!rows.length) {
    tbody.innerHTML = '<tr class="no-data-row"><td colspan="10">No restaurants match the current filters.</td></tr>';
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
      '<td>' + esc(r.cuisine ? titleCase(r.cuisine) : '\u2014') + '</td>' +
      '<td>' + (cls ? '<span class="badge ' + cls + '">' + txt + '</span>' : txt) + '</td>' +
      '<td>' + gradeBadge(r.food)       + '</td>' +
      '<td>' + gradeBadge(r.service)    + '</td>' +
      '<td>' + gradeBadge(r.atmosphere) + '</td>' +
      '<td>' + gradeBadge(r.value)      + '</td>' +
      '<td>' + gradeBadge(r.overall)    + '</td>';
    tbody.appendChild(tr);
  });
}
