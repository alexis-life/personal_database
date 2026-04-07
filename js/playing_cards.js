'use strict';

// ── Playing Cards rendering ───────────────────────────────────────────────────

function renderPlaying() {
  var filter = playingBrand;
  var data = filter === 'all'
    ? PLAYING.slice()
    : PLAYING.filter(function(c) { return c.brand === filter; });

  var section = document.getElementById('section-playing');
  section.classList.toggle('brand-filter', filter !== 'all');

  _renderPlayingStats(data, filter);
  _renderPlayingCharts(data, filter);
  renderPlayingTable();
}

function _renderPlayingStats(data, filter) {
  var grid = document.getElementById('p-stat-grid');
  if (filter === 'all') {
    var brandCount = new Set(data.map(function(c) { return c.brand; })).size;
    grid.innerHTML =
      statCard(1, 'Total Decks', data.length, 'in collection') +
      statCard(2, 'Brands',      brandCount,  'unique brands');
  } else {
    grid.innerHTML =
      statCard(1, 'Total Decks', data.length, 'in ' + titleCase(filter));
  }
}

function _renderPlayingCharts(data, filter) {
  var grid = document.getElementById('p-chart-grid');
  destroyCharts(['chart-playing-brand', 'chart-playing-growth']);

  grid.className = 'chart-grid';

  if (filter === 'all') {
    grid.innerHTML =
      chartCard('Decks by Brand',     'chart-playing-brand',  '', 'medium') +
      chartCard('Collection Growth',  'chart-playing-growth', '', 'medium');
    _playingBrandChart('chart-playing-brand', data);
  } else {
    grid.innerHTML = chartCard('Collection Growth', 'chart-playing-growth', '', 'medium');
  }
  _playingGrowthChart('chart-playing-growth', data);
}

function _playingBrandChart(canvasId, data) {
  var map = {};
  data.forEach(function(c) {
    var b = titleCase(c.brand || 'Unknown');
    map[b] = (map[b] || 0) + 1;
  });
  var keys = Object.keys(map);
  if (!keys.length) return;
  safeChart(canvasId, {
    type: 'doughnut',
    data: { labels: keys, datasets: [{ data: keys.map(function(k) { return map[k]; }), backgroundColor: PALETTE }] },
    options: { maintainAspectRatio: false, plugins: { legend: legendRight() } }
  });
}

function _playingGrowthChart(canvasId, data) {
  var monthCounts = {};
  data.filter(function(c) { return c.date && c.date !== 'n/a'; })
      .forEach(function(c) {
        var dt = parseDate(c.date);
        if (!dt || isNaN(dt)) return;
        var key = dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0');
        monthCounts[key] = (monthCounts[key] || 0) + 1;
      });

  var months = Object.keys(monthCounts).sort();
  if (!months.length) {
    var el = document.getElementById(canvasId);
    if (el) el.parentNode.innerHTML = '<p style="color:var(--c7);font-size:0.85rem;padding:8px 0">No purchase dates available.</p>';
    return;
  }

  var cum = 0;
  var cumData = months.map(function(m) { cum += monthCounts[m]; return cum; });

  safeChart(canvasId, {
    type: 'line',
    data: { labels: months, datasets: [{
      label: 'Decks',
      data: cumData,
      borderColor: '#b9375e',
      backgroundColor: 'rgba(185,55,94,0.12)',
      fill: true, tension: 0.3, pointRadius: 3, pointBackgroundColor: '#b9375e'
    }]},
    options: {
      maintainAspectRatio: false,
      scales: {
        x: { ticks: { font: { family: 'Poppins', size: 10 }, color: '#8a2846', maxRotation: 45 }, grid: { color: '#ffe0e9' } },
        y: scaleY()
      },
      plugins: { legend: { display: false } }
    }
  });
}

// ── Playing Cards table ───────────────────────────────────────────────────────
function renderPlayingTable() {
  var search = document.getElementById('p-search').value.toLowerCase();
  var filter = playingBrand;

  var rows = filter === 'all'
    ? PLAYING.slice()
    : PLAYING.filter(function(c) { return c.brand === filter; });

  if (search) rows = rows.filter(function(c) {
    return (c.name  || '').toLowerCase().indexOf(search) !== -1 ||
           (c.brand || '').toLowerCase().indexOf(search) !== -1;
  });

  // Sort
  var s = playingSort;
  if (s.col) {
    var dir = s.dir === 'asc' ? 1 : -1;
    rows.sort(function(a, b) {
      if (s.col === 'name') return dir * (a.name || '').localeCompare(b.name || '');
      if (s.col === 'date') {
        var da = parseDate(a.date) || new Date(0);
        var db = parseDate(b.date) || new Date(0);
        return dir * (da - db);
      }
      return 0;
    });
  }

  updateSortIndicators('section-playing', s);
  document.getElementById('p-count').textContent = rows.length;

  var tbody = document.getElementById('p-tbody');
  tbody.innerHTML = '';

  if (!rows.length) {
    tbody.innerHTML = '<tr class="no-data-row"><td colspan="3">No decks match the current filters.</td></tr>';
    return;
  }

  rows.forEach(function(c) {
    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + esc(c.name) + '</td>' +
      '<td class="col-brand">' + esc(titleCase(c.brand || '')) + '</td>' +
      '<td>' + (c.date && c.date !== 'n/a' ? esc(c.date) : '\u2014') + '</td>';
    tbody.appendChild(tr);
  });
}
