'use strict';

// ── OP TCG rendering ──────────────────────────────────────────────────────────

var RARITY_RANK = { r: 1, sr: 2, sec: 3 };
function rarityRank(r) { return RARITY_RANK[(r || '').toLowerCase()] || 0; }

function renderOptcg() {
  var filter = optcgSet;
  var ownerData = OPTCG.filter(function(c) { return c.owner === optcgOwnerCtx; });
  var data = filter === 'all'
    ? ownerData.filter(function(c) { return !c.is_don; })
    : ownerData.filter(function(c) { return c.set === filter; });

  var isDon = data.length > 0 && data.every(function(c) { return c.is_don; });
  var section = document.getElementById('section-optcg');
  section.classList.toggle('don-view', isDon);

  _renderOptcgStats(data, filter);
  _renderOptcgCharts(data, filter, isDon);
  renderOptcgTable();
}

function _renderOptcgStats(data, filter) {
  var grid = document.getElementById('o-stat-grid');
  var total = data.reduce(function(sum, c) { return sum + (c.count || 1); }, 0);
  var owner = optcgOwnerCtx === 'alexis' ? 'Alexis' : 'Jordan';

  if (filter === 'all') {
    var setCount = new Set(data.map(function(c) { return c.set; })).size;
    grid.innerHTML =
      statCard(1, 'Total Cards', total,    'in ' + owner + '\'s collection') +
      statCard(2, 'Sets',        setCount, 'unique sets');
  } else {
    var label = formatSetName(filter);
    grid.innerHTML =
      statCard(1, 'Total Cards', total, 'in ' + label);
  }
}

function _renderOptcgCharts(data, filter, isDon) {
  var grid = document.getElementById('o-chart-grid');
  destroyCharts(['chart-optcg-rarity', 'chart-optcg-foil']);

  grid.className = 'chart-grid';

  if (isDon) {
    grid.innerHTML = chartCard('Foil vs Non-Foil', 'chart-optcg-foil', '', 'medium');
    _optcgFoilChart('chart-optcg-foil', data);
  } else {
    grid.innerHTML = chartCard('By Rarity', 'chart-optcg-rarity', '', 'medium');
    _optcgRarityChart('chart-optcg-rarity', data);
  }
}

function _optcgRarityChart(canvasId, data) {
  var map = {};
  data.forEach(function(c) {
    var r = (c.rarity || 'unknown').toUpperCase();
    map[r] = (map[r] || 0) + (c.count || 1);
  });
  var keys = Object.keys(map).sort(function(a, b) {
    return (RARITY_RANK[a.toLowerCase()] || 0) - (RARITY_RANK[b.toLowerCase()] || 0);
  });
  var colors = { R: '#ffc2d4', SR: '#b9375e', SEC: '#c8a820' };
  safeChart(canvasId, {
    type: 'bar',
    data: {
      labels: keys,
      datasets: [{ data: keys.map(function(k) { return map[k]; }),
        backgroundColor: keys.map(function(k) { return colors[k] || '#ff9ebb'; }) }]
    },
    options: {
      maintainAspectRatio: false,
      scales: { x: scaleX(), y: scaleY() },
      plugins: { legend: { display: false } }
    }
  });
}

function _optcgFoilChart(canvasId, data) {
  var foil    = data.filter(function(c) { return c.foil && c.foil !== 'n/a' && c.foil !== ''; }).length;
  var nonFoil = data.length - foil;
  safeChart(canvasId, {
    type: 'doughnut',
    data: {
      labels: ['Foil', 'Non-Foil'],
      datasets: [{ data: [foil, nonFoil], backgroundColor: ['#c8a820', '#ffc2d4'] }]
    },
    options: { maintainAspectRatio: false, plugins: { legend: legendRight() } }
  });
}

// ── OP TCG table ──────────────────────────────────────────────────────────────
function renderOptcgTable() {
  var search = document.getElementById('o-search').value.toLowerCase();
  var filter = optcgSet;

  var ownerData = OPTCG.filter(function(c) { return c.owner === optcgOwnerCtx; });
  var rows = filter === 'all'
    ? ownerData.filter(function(c) { return !c.is_don; })
    : ownerData.filter(function(c) { return c.set === filter; });
  if (search) rows = rows.filter(function(c) {
    return (c.name   || '').toLowerCase().indexOf(search) !== -1 ||
           (c.number || '').toLowerCase().indexOf(search) !== -1 ||
           (c.color  || '').toLowerCase().indexOf(search) !== -1;
  });

  // Sort
  var s = optcgSort;
  if (s.col) {
    var dir = s.dir === 'asc' ? 1 : -1;
    rows.sort(function(a, b) {
      if (s.col === 'name')   return dir * (a.name || '').localeCompare(b.name || '');
      if (s.col === 'rarity') return dir * (rarityRank(a.rarity) - rarityRank(b.rarity));
      if (s.col === 'date') {
        var da = parseDate(a.date) || new Date(0);
        var db = parseDate(b.date) || new Date(0);
        return dir * (da - db);
      }
      return 0;
    });
  }

  updateSortIndicators('section-optcg', s);
  document.getElementById('o-count').textContent = rows.length;

  var tbody = document.getElementById('o-tbody');
  tbody.innerHTML = '';

  if (!rows.length) {
    tbody.innerHTML = '<tr class="no-data-row"><td colspan="12">No cards match the current filters.</td></tr>';
    return;
  }

  rows.forEach(function(c) {
    var rarityBadge = '';
    if (c.rarity) {
      var ru = c.rarity.toUpperCase();
      var rc = ru === 'SEC' ? 'badge-rarity-sec' : ru === 'SR' ? 'badge-rarity-sr' : 'badge-rarity-r';
      rarityBadge = '<span class="badge ' + rc + '">' + esc(ru) + '</span>';
    } else {
      rarityBadge = '\u2014';
    }

    var altBadge = c.alt ? '<span class="badge badge-sp">' + esc(c.alt) + '</span>' : '\u2014';
    var spBadge  = c.sp  ? '<span class="badge badge-sp">' + esc(c.sp)  + '</span>' : '\u2014';
    var foilBadge = c.foil && c.foil !== 'n/a' && c.foil !== ''
      ? '<span class="badge badge-foil">' + esc(c.foil) + '</span>' : '\u2014';
    var goldBadge = c.gold && c.gold !== 'n/a' && c.gold !== ''
      ? '<span class="badge badge-foil">' + esc(c.gold) + '</span>' : '\u2014';

    var tr = document.createElement('tr');
    tr.innerHTML =
      '<td>' + esc(c.name) + '</td>' +
      '<td class="col-std">' + esc(c.number || '\u2014') + '</td>' +
      '<td class="col-std">' + rarityBadge + '</td>' +
      '<td class="col-std">' + esc(c.color  || '\u2014') + '</td>' +
      '<td class="col-std">' + altBadge + '</td>' +
      '<td class="col-std">' + spBadge  + '</td>' +
      '<td class="col-don">' + esc(c.source_set || '\u2014') + '</td>' +
      '<td class="col-don">' + foilBadge + '</td>' +
      '<td class="col-don">' + goldBadge + '</td>' +
      '<td>' + esc((c.region || '').toUpperCase() || '\u2014') + '</td>' +
      '<td>' + esc(c.count || 1) + '</td>' +
      '<td>' + (c.date && c.date !== 'n/a' ? esc(c.date) : '\u2014') + '</td>';
    tbody.appendChild(tr);
  });
}
