'use strict';

// ── Movies rendering ──────────────────────────────────────────────────────────

function renderMovies() {
  var year  = movYear;
  var isAll = (year === 'all');
  var data  = isAll ? MOV : MOV.filter(function(m) { return m.watch_date && m.watch_date.slice(0, 4) === year; });

  _renderMoviesStats(data, year, isAll);
  _renderMoviesCharts(data, year, isAll);
  renderMoviesTable();
}

function _renderMoviesStats(data, year, isAll) {
  var rated = data.filter(function(m) { return m.rating != null; });
  var avg   = rated.length ? (rated.reduce(function(s, m) { return s + m.rating; }, 0) / rated.length).toFixed(1) : '\u2014';
  var top   = rated.length ? Math.max.apply(null, rated.map(function(m) { return m.rating; })) : '\u2014';
  var grid  = document.getElementById('m-stat-grid');

  if (isAll) {
    var curYear  = new Date().getFullYear();
    var thisYear = MOV.filter(function(m) { return m.watch_date && m.watch_date.slice(0, 4) === String(curYear); }).length;
    grid.innerHTML =
      statCard(1, 'Total Watched', MOV.length, 'movies logged') +
      statCard(2, 'Avg Rating',    avg,        'out of 10') +
      statCard(3, 'This Year',     thisYear,   'movies in ' + curYear) +
      statCard(4, 'Top Rating',    top,        'highest score');
  } else {
    grid.innerHTML =
      statCard(1, 'Total',      data.length, 'movies in ' + year) +
      statCard(2, 'Avg Rating', avg,         'out of 10 in ' + year) +
      statCard(3, 'Top Rating', top,         'highest score in ' + year);
  }
}

function _renderMoviesCharts(data, year, isAll) {
  var grid = document.getElementById('m-chart-grid');
  destroyCharts(['chart-mov-ratings', 'chart-mov-years', 'chart-mov-location']);

  if (isAll) {
    grid.innerHTML =
      chartCard('Rating Distribution', 'chart-mov-ratings',  '', false) +
      chartCard('Movies per Year',     'chart-mov-years',    '', false) +
      chartCard('Where Watched',       'chart-mov-location', '', false);
    _movRatingChart('chart-mov-ratings',  data);
    _movYearsChart( 'chart-mov-years',    MOV);
    _movLocationChart('chart-mov-location', data);
  } else {
    grid.innerHTML =
      chartCard('Rating Distribution \u2014 ' + esc(year), 'chart-mov-ratings',  '', false) +
      chartCard('Where Watched \u2014 '        + esc(year), 'chart-mov-location', '', false);
    _movRatingChart('chart-mov-ratings',  data);
    _movLocationChart('chart-mov-location', data);
  }
}

function _movRatingChart(id, data) {
  var ratingColors = [
    '#ffe0e9','#ffc2d4','#ff9ebb','#ff7aa2','#ff7aa2',
    '#e05780','#e05780','#b9375e','#8a2846','#602437'
  ];
  var counts = [0,0,0,0,0,0,0,0,0,0];
  data.filter(function(m) { return m.rating != null && m.rating >= 1 && m.rating <= 10; })
      .forEach(function(m) { counts[m.rating - 1]++; });

  safeChart(id, {
    type: 'bar',
    data: { labels: ['1','2','3','4','5','6','7','8','9','10'], datasets: [{ data: counts, backgroundColor: ratingColors, borderRadius: 4 }] },
    options: {
      plugins: { legend: { display: false } },
      scales: { x: scaleX(11), y: scaleY() }
    }
  });
}

function _movYearsChart(id, data) {
  var yearCounts = {};
  data.forEach(function(m) {
    var y = m.watch_date ? m.watch_date.slice(0, 4) : null;
    if (y) yearCounts[y] = (yearCounts[y] || 0) + 1;
  });
  var years = Object.keys(yearCounts).sort();

  safeChart(id, {
    type: 'bar',
    data: { labels: years, datasets: [{ data: years.map(function(y) { return yearCounts[y]; }), backgroundColor: '#b9375e', borderRadius: 4 }] },
    options: {
      plugins: { legend: { display: false } },
      scales: { x: scaleX(11), y: scaleY() }
    }
  });
}

function _movLocationChart(id, data) {
  var locMap = {};
  data.forEach(function(m) {
    var loc = (m.location || 'unknown').trim() || 'unknown';
    locMap[loc] = (locMap[loc] || 0) + 1;
  });
  var entries = Object.entries(locMap).sort(function(a, b) { return b[1] - a[1]; });
  var top   = entries.slice(0, 8);
  var other = entries.slice(8).reduce(function(s, kv) { return s + kv[1]; }, 0);
  if (other > 0) top.push(['Other', other]);

  if (!top.length) { document.getElementById(id).parentNode.innerHTML = '<p style="color:var(--c7);font-size:0.85rem;padding:8px">No location data available.</p>'; return; }

  safeChart(id, {
    type: 'doughnut',
    data: { labels: top.map(function(kv) { return kv[0]; }), datasets: [{ data: top.map(function(kv) { return kv[1]; }), backgroundColor: PALETTE }] },
    options: { plugins: { legend: legendRight() } }
  });
}

function renderMoviesTable() {
  var search = document.getElementById('m-search').value.toLowerCase();
  var year   = movYear;

  var rows = MOV.slice().reverse();
  if (year !== 'all' && year) rows = rows.filter(function(m) { return m.watch_date && m.watch_date.slice(0, 4) === year; });
  if (search) rows = rows.filter(function(m) {
    return (m.title   || '').toLowerCase().indexOf(search) !== -1 ||
           (m.location || '').toLowerCase().indexOf(search) !== -1 ||
           (m.people  || '').toLowerCase().indexOf(search) !== -1 ||
           (m.overall || '').toLowerCase().indexOf(search) !== -1;
  });

  document.getElementById('m-count').textContent = rows.length;
  var tbody = document.getElementById('m-tbody');
  tbody.innerHTML = '';

  if (!rows.length) {
    tbody.innerHTML = '<tr class="no-data-row"><td colspan="5">No movies match the current filters.</td></tr>';
    return;
  }

  rows.forEach(function(m) {
    var tr = document.createElement('tr');
    var ratingHtml = '\u2014';
    if (m.rating != null) {
      var cls = m.rating >= 8 ? 'badge-rate-hi' : m.rating >= 5 ? 'badge-rate-mid' : 'badge-rate-lo';
      ratingHtml = '<span class="badge ' + cls + '">' + m.rating + '/10</span>';
    }
    tr.innerHTML =
      '<td>' + esc(m.title) + (m.year ? ' <span style="color:var(--c7);font-size:0.78rem">(' + m.year + ')</span>' : '') + '</td>' +
      '<td>' + esc(fmtDate(m.watch_date)) + '</td>' +
      '<td>' + ratingHtml + '</td>' +
      '<td>' + esc(m.location || '\u2014') + '</td>' +
      '<td style="font-size:0.8rem;color:var(--c7)">' + esc(m.overall || '\u2014') + '</td>';
    tbody.appendChild(tr);
  });
}
