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
  var worst = rated.length ? Math.min.apply(null, rated.map(function(m) { return m.rating; })) : '\u2014';
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
      statCard(1, 'Total',        data.length, 'movies in ' + year) +
      statCard(2, 'Avg Rating',   avg,         'out of 10') +
      statCard(3, 'Top Rating',   top,         'best in ' + year) +
      statCard(4, 'Worst Rating', worst,       'lowest in ' + year);
  }
}

function _renderMoviesCharts(data, year, isAll) {
  var grid = document.getElementById('m-chart-grid');
  destroyCharts(['chart-mov-ratings', 'chart-mov-years', 'chart-mov-location', 'chart-mov-genres', 'chart-mov-people', 'chart-mov-genre-rating', 'chart-mov-months']);

  if (isAll) {
    grid.innerHTML =
      chartCard('Rating Distribution', 'chart-mov-ratings',  '', 'medium') +
      chartCard('Where Watched',       'chart-mov-location', '', 'medium') +
      chartCard('Genre Breakdown',     'chart-mov-genres',   '', 'medium') +
      chartCard('Avg Rating by Genre', 'chart-mov-genre-rating', '', 'medium') +
      chartCard('Movies per Month',    'chart-mov-months',   '', 'medium') +
      chartCard('Movies per Year',     'chart-mov-years',    '', 'medium');
    _movRatingChart('chart-mov-ratings',  data);
    _movLocationChart('chart-mov-location', data);
    _movGenreChart('chart-mov-genres', data);
    _movGenreRatingChart('chart-mov-genre-rating', data);
    _movMonthsChart('chart-mov-months', data);
    _movYearsChart( 'chart-mov-years',    MOV);
  } else {
    grid.innerHTML =
      chartCard('Rating Distribution \u2014 ' + esc(year), 'chart-mov-ratings',  '', 'medium') +
      chartCard('Where Watched \u2014 '        + esc(year), 'chart-mov-location', '', 'medium') +
      chartCard('Genre Breakdown \u2014 '      + esc(year), 'chart-mov-genres',   '', 'medium') +
      chartCard('Avg Rating by Genre \u2014 '  + esc(year), 'chart-mov-genre-rating', '', 'medium') +
      chartCard('Watched With \u2014 '         + esc(year), 'chart-mov-people',   '', 'medium') +
      chartCard('Movies per Month \u2014 '     + esc(year), 'chart-mov-months',   '', 'medium');
    _movRatingChart('chart-mov-ratings',  data);
    _movLocationChart('chart-mov-location', data);
    _movGenreChart('chart-mov-genres', data);
    _movGenreRatingChart('chart-mov-genre-rating', data);
    _movPeopleChart('chart-mov-people', data);
    _movMonthsChart('chart-mov-months', data);
  }
}

function _movRatingChart(id, data) {
  var ratingColors = [
    C.pale, C.petal, C.blush, C.salmon, C.salmon,
    C.pink, C.pink, C.rose, C.maroon, C.plum
  ];
  var counts = [0,0,0,0,0,0,0,0,0,0];
  data.filter(function(m) { return m.rating != null && m.rating >= 1 && m.rating <= 10; })
      .forEach(function(m) { counts[m.rating - 1]++; });

  safeChart(id, {
    type: 'bar',
    data: { labels: ['1','2','3','4','5','6','7','8','9','10'], datasets: [{ data: counts, backgroundColor: ratingColors, borderRadius: 4 }] },
    options: {
      maintainAspectRatio: false,
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
    data: { labels: years, datasets: [{ data: years.map(function(y) { return yearCounts[y]; }), backgroundColor: C.rose, borderRadius: 4 }] },
    options: {
      maintainAspectRatio: false,
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
  if (other > 0) top.push(['other', other]);

  if (!top.length) {
    var el = document.getElementById(id);
    if (el) el.parentNode.innerHTML = '<p style="color:var(--c7);font-size:0.85rem;padding:8px 0">No location data available.</p>';
    return;
  }

  safeChart(id, {
    type: 'doughnut',
    data: { labels: top.map(function(kv) { return kv[0]; }), datasets: [{ data: top.map(function(kv) { return kv[1]; }), backgroundColor: PALETTE }] },
    options: { maintainAspectRatio: false, plugins: { legend: legendRight() } }
  });
}

function _movGenreChart(id, data) {
  var genreMap = {};
  data.forEach(function(m) {
    (m.genres || []).forEach(function(g) {
      var label = g.replace(/_/g, ' ');
      genreMap[label] = (genreMap[label] || 0) + 1;
    });
  });
  var entries = Object.entries(genreMap).sort(function(a, b) { return b[1] - a[1]; });

  if (!entries.length) {
    var el = document.getElementById(id);
    if (el) el.parentNode.innerHTML = '<p style="color:var(--c7);font-size:0.85rem;padding:8px 0">No genre data available.</p>';
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

function _movGenreRatingChart(id, data) {
  var sums = {};
  var counts = {};
  data.forEach(function(m) {
    if (m.rating == null) return;
    (m.genres || []).forEach(function(g) {
      var label = g.replace(/_/g, ' ');
      sums[label]   = (sums[label]   || 0) + m.rating;
      counts[label] = (counts[label] || 0) + 1;
    });
  });
  var entries = Object.keys(sums)
    .map(function(g) { return [g, sums[g] / counts[g]]; })
    .sort(function(a, b) { return b[1] - a[1]; });

  if (!entries.length) {
    var el = document.getElementById(id);
    if (el) el.parentNode.innerHTML = '<p style="color:var(--c7);font-size:0.85rem;padding:8px 0">No genre data available.</p>';
    return;
  }

  safeChart(id, {
    type: 'bar',
    data: {
      labels: entries.map(function(kv) { return kv[0]; }),
      datasets: [{ data: entries.map(function(kv) { return Math.round(kv[1] * 10) / 10; }), backgroundColor: PALETTE, borderRadius: 4 }]
    },
    options: {
      indexAxis: 'y',
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: scaleY(), y: scaleX(0) }
    }
  });
}

function _movMonthsChart(id, data) {
  var MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var counts = [0,0,0,0,0,0,0,0,0,0,0,0];
  data.forEach(function(m) {
    if (!m.watch_date) return;
    var mo = parseInt(m.watch_date.slice(5, 7), 10) - 1;
    if (mo >= 0 && mo < 12) counts[mo]++;
  });

  safeChart(id, {
    type: 'bar',
    data: { labels: MONTH_NAMES, datasets: [{ data: counts, backgroundColor: C.rose, borderRadius: 4 }] },
    options: {
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: scaleX(11), y: scaleY() }
    }
  });
}

function _movPeopleChart(id, data) {
  var map = {};
  data.forEach(function(m) {
    var p = (m.people || '').trim().toLowerCase();
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

// ── Movies table (with sort) ──────────────────────────────────────────────────
function renderMoviesTable() {
  var search = document.getElementById('m-search').value.toLowerCase();
  var year   = movYear;

  var rows = MOV.slice().reverse();
  if (year !== 'all' && year) rows = rows.filter(function(m) { return m.watch_date && m.watch_date.slice(0, 4) === year; });
  if (search) rows = rows.filter(function(m) {
    return (m.title    || '').toLowerCase().indexOf(search) !== -1 ||
           (m.location || '').toLowerCase().indexOf(search) !== -1 ||
           (m.people   || '').toLowerCase().indexOf(search) !== -1 ||
           (m.overall  || '').toLowerCase().indexOf(search) !== -1;
  });

  // Sort
  var s = movSort;
  if (s.col) {
    var dir = s.dir === 'asc' ? 1 : -1;
    rows.sort(function(a, b) {
      if (s.col === 'title') {
        return dir * (a.title || '').localeCompare(b.title || '');
      }
      if (s.col === 'watch_date') {
        var da = new Date(a.watch_date || '1900-01-01');
        var db = new Date(b.watch_date || '1900-01-01');
        return dir * (da - db);
      }
      if (s.col === 'rating') {
        var ra = a.rating != null ? a.rating : (s.dir === 'asc' ? -1 : 999);
        var rb = b.rating != null ? b.rating : (s.dir === 'asc' ? -1 : 999);
        return dir * (ra - rb);
      }
      if (s.col === 'location') {
        return dir * (a.location || '').localeCompare(b.location || '');
      }
      return 0;
    });
  }

  updateSortIndicators('section-movies', s);
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
