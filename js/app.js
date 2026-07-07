'use strict';

// ── Global state ──────────────────────────────────────────────────────────────
var DIM = [], MOV = [], REST = [], OPTCG = [], PLAYING = [], DESSERT = [];
var CI = {};
var activeSection = 'dimoo';
var dimooFilter   = 'all';
var movYear       = 'all';
var restYear      = 'all';
var dessertYear   = 'all';
var optcgOwnerCtx  = 'alexis'; // 'alexis' | 'jordan'
var playingBrand   = 'all';

// OP TCG filter/sort state: separate per owner so they don't bleed into each other
var optcgSetAlexis = 'all';
var optcgSetJordan = 'all';

// Dimoo owned-filter state: separate per view so they don't bleed into each other
var dimooOwnedAll    = 'yes'; // all-series default: show owned only
var dimooOwnedSeries = '';    // per-series default: show all statuses

// Sort state per table  { col: String|null, dir: 'asc'|'desc' }
var dimooSort        = { col: null, dir: 'asc' };
var movSort          = { col: null, dir: 'asc' };
var restSort         = { col: null, dir: 'asc' };
var dessertSort      = { col: null, dir: 'asc' };
var optcgSortAlexis  = { col: 'number', dir: 'asc' };
var optcgSortJordan  = { col: 'number', dir: 'asc' };
var playingSort      = { col: null, dir: 'asc' };

var PALETTE = [
  '#b9375e','#e05780','#8a2846','#ff7aa2','#ff9ebb',
  '#602437','#ffc2d4','#522e38','#d44070','#f0a0b8',
  '#9c2f50','#ffa8c5','#701c3a','#c05070','#ffe0e9'
];

// Named aliases into PALETTE for one-off chart accents (bars, lines, single-series doughnuts).
// Keeps every chart color traceable back to PALETTE instead of scattering magic hex strings.
var C = {
  rose:   PALETTE[0],  // primary bars/lines
  pink:   PALETTE[1],  // secondary accent
  maroon: PALETTE[2],  // dark accent
  salmon: PALETTE[3],
  blush:  PALETTE[4],
  plum:   PALETTE[5],  // darkest
  petal:  PALETTE[6],  // pale pink
  text:   PALETTE[7],  // axis/tick text color
  pale:   PALETTE[14]  // palest, used for gridlines
};
var GOLD = '#c8a820'; // thematic accent for SEC rarity / foil — intentionally outside PALETTE

// Playing cards carry a "group" field set by the sync script based on which
// Obsidian file they came from: cards from cardmafia.md group under "Card Mafia",
// cards from misc.md group under "Misc" — both are sub-filters within the
// Playing Cards tab, so adding a new brand row to either file just works.

// Grade rank for sort comparison  (higher = better)
var GRADE_RANK = { S: 5, A: 4, B: 3, C: 2, D: 1 };
function gradeRank(g) { return GRADE_RANK[gradeBase(g)] || 0; }

// ── Shared helpers ────────────────────────────────────────────────────────────
function esc(s) {
  var d = document.createElement('div');
  d.textContent = (s == null ? '' : String(s));
  return d.innerHTML;
}

async function fetchJSON(url) {
  try {
    var r = await fetch(url);
    if (!r.ok) return [];
    return await r.json();
  } catch (e) { return []; }
}

function safeChart(id, config) {
  if (CI[id]) { try { CI[id].destroy(); } catch (e) {} delete CI[id]; }
  var canvas = document.getElementById(id);
  if (!canvas) return null;
  CI[id] = new Chart(canvas, config);
  return CI[id];
}

function destroyCharts(ids) {
  ids.forEach(function(id) {
    if (CI[id]) { try { CI[id].destroy(); } catch (e) {} delete CI[id]; }
  });
}

function parseDate(s) {
  if (!s || s === 'n/a') return null;
  var p = s.split('/');
  if (p.length === 3) return new Date(+p[2], +p[0] - 1, +p[1]);
  return new Date(s);
}

function fmtDate(s) {
  if (!s || s === 'n/a') return '\u2014';
  if (s.length >= 10 && s.indexOf('-') !== -1) {
    var d = new Date(s + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  return s;
}

function gradeBase(g) {
  return g ? g.replace(/[+\-]$/, '').toUpperCase() : '';
}

function formatSetName(s) {
  if (!s) return '';
  if (s.toLowerCase().startsWith('don')) return 'DON!! Cards';
  var m = s.match(/^([a-z]{2,4}\d{2,3}(?:-[a-z]{2,4}\d{2,3})?)/i);
  if (m) return m[1].toUpperCase();

  // Set name has no code prefix of its own (e.g. "premium booster -the best- vol. 2") —
  // fall back to the code embedded in a card's number field (e.g. "prb02-010" → "PRB02").
  var card = OPTCG.find(function(c) { return c.set === s; });
  var numCode = card && card.number ? card.number.match(/^([a-z]{2,4}\d{2,3})/i) : null;
  return numCode ? numCode[1].toUpperCase() : titleCase(s);
}

function titleCase(s) {
  return (s || '').split(' ').map(function(w) {
    return w ? w.charAt(0).toUpperCase() + w.slice(1) : '';
  }).join(' ');
}

// HTML builders shared across section scripts
function statCard(pos, label, value, sub) {
  return '<div class="stat-card sp' + pos + '">' +
    '<div class="stat-label">'  + esc(label) + '</div>' +
    '<div class="stat-value">'  + esc(value) + '</div>' +
    '<div class="stat-sub">'    + esc(sub)   + '</div>' +
    '</div>';
}

// size: 'tall' | 'medium' | ''
function chartCard(title, canvasId, extraClass, size) {
  var sizeClass = size === 'tall' ? ' tall' : size === 'medium' ? ' medium' : '';
  return '<div class="chart-card' + (extraClass ? ' ' + extraClass : '') + '">' +
    '<div class="chart-header">' + title + '</div>' +
    '<div class="chart-body' + sizeClass + '"><canvas id="' + canvasId + '"></canvas></div>' +
    '</div>';
}

// Common Chart.js scale helpers
function scaleX(size) {
  return { ticks: { font: { family: 'Poppins', size: size || 11 }, color: '#8a2846' }, grid: { display: false } };
}
function scaleY() {
  return { ticks: { font: { family: 'Poppins', size: 11 }, color: '#8a2846' }, grid: { color: '#ffe0e9' }, beginAtZero: true };
}
function legendRight() {
  return { position: 'right', labels: { font: { family: 'Poppins', size: 11 }, color: '#522e38', boxWidth: 14 } };
}

// ── Sort indicators ───────────────────────────────────────────────────────────
function updateSortIndicators(sectionId, sortObj) {
  document.querySelectorAll('#' + sectionId + ' th[data-sort]').forEach(function(th) {
    if (th.dataset.sort === sortObj.col) {
      th.dataset.sortDir = sortObj.dir;
    } else {
      delete th.dataset.sortDir;
    }
  });
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────
function updateBreadcrumb(section, filter) {
  var names = { dimoo: 'Dimoo Collection', movies: 'Movies', restaurants: 'Restaurants', dessert: 'Dessert Shops', optcg: 'OP TCG', 'jordan-optcg': "Jordan's Collection", playing: 'Playing Cards' };
  var parent = names[section] || section;
  var bc = document.getElementById('breadcrumb');

  if (!filter || filter === 'all') {
    if (section === 'dimoo') {
      bc.innerHTML =
        '<span class="bc-parent" data-section="dimoo">' + esc(parent) + '</span>' +
        '<span class="bc-sep">/</span>' +
        '<span class="bc-current">Figure Series</span>';
    } else {
      bc.innerHTML = '<span class="bc-current">' + esc(parent) + '</span>';
    }
  } else {
    var display = section === 'dimoo' ? titleCase(filter) : (section === 'optcg' || section === 'jordan-optcg') ? formatSetName(filter) : section === 'playing' ? (filter === 'cardmafia' ? 'Card Mafia' : titleCase(filter)) : filter;
    bc.innerHTML =
      '<span class="bc-parent" data-section="' + esc(section) + '">' + esc(parent) + '</span>' +
      '<span class="bc-sep">/</span>' +
      '<span class="bc-current">' + esc(display) + '</span>';
  }

  bc.querySelectorAll('.bc-parent').forEach(function(el) {
    el.addEventListener('click', function() { setSubFilter(section, 'all'); });
  });
}

// ── Sidebar sub-lists ─────────────────────────────────────────────────────────
function buildSubList(id, items, onSelect) {
  var el = document.getElementById(id);
  el.innerHTML = '';
  items.forEach(function(item) {
    var div = document.createElement('div');
    div.className = 'sub-item';
    div.textContent = item.label;
    div.dataset.value = item.value;
    div.addEventListener('click', function(e) {
      e.stopPropagation();
      onSelect(item.value);
    });
    el.appendChild(div);
  });
}

function setSubItemActive(listId, value) {
  document.querySelectorAll('#' + listId + ' .sub-item').forEach(function(el) {
    el.classList.toggle('active', el.dataset.value === value);
  });
}

// ── Nav accordion ─────────────────────────────────────────────────────────────
function openNavForce(navKey, expand) {
  document.querySelectorAll('.nav-item').forEach(function(el) {
    var k = el.dataset.nav;
    var sub = document.getElementById('sub-' + k);
    if (k === navKey) {
      el.classList.add('active');
      if (expand) {
        el.classList.add('open');
        if (sub) sub.style.maxHeight = sub.scrollHeight + 'px';
      }
    } else {
      el.classList.remove('active', 'open');
      if (sub) sub.style.maxHeight = '0';
    }
  });
}

function toggleSubList(navKey) {
  var el = document.querySelector('.nav-item[data-nav="' + navKey + '"]');
  if (!el) return;
  var sub = document.getElementById('sub-' + navKey);
  var isOpen = el.classList.contains('open');
  el.classList.toggle('open', !isOpen);
  if (sub) sub.style.maxHeight = !isOpen ? sub.scrollHeight + 'px' : '0';
}

// ── Section / filter application ──────────────────────────────────────────────
function setSubFilter(section, value) {
  if (section === 'dimoo') {
    dimooFilter = value;
    dimooSort   = { col: null, dir: 'asc' };
    setSubItemActive('sub-dimoo', value);
    renderDimoo();
    updateBreadcrumb('dimoo', value === 'all' ? null : value);
  } else if (section === 'movies') {
    movYear = value;
    setSubItemActive('sub-movies', value);
    renderMovies();
    updateBreadcrumb('movies', value === 'all' ? null : value);
  } else if (section === 'restaurants') {
    restYear = value;
    setSubItemActive('sub-restaurants', value);
    renderRestaurants();
    updateBreadcrumb('restaurants', value === 'all' ? null : value);
  } else if (section === 'dessert') {
    dessertYear = value;
    setSubItemActive('sub-dessert', value);
    renderDessertShops();
    updateBreadcrumb('dessert', value === 'all' ? null : value);
  } else if (section === 'optcg') {
    optcgSetAlexis  = value;
    optcgSortAlexis = { col: 'number', dir: 'asc' };
    setSubItemActive('sub-optcg', value);
    renderOptcg();
    updateBreadcrumb('optcg', value === 'all' ? null : value);
  } else if (section === 'jordan-optcg') {
    optcgSetJordan  = value;
    optcgSortJordan = { col: 'number', dir: 'asc' };
    setSubItemActive('sub-jordan-optcg', value);
    renderOptcg();
    updateBreadcrumb('jordan-optcg', value === 'all' ? null : value);
  } else if (section === 'playing') {
    playingBrand = value;
    playingSort  = { col: null, dir: 'asc' };
    setSubItemActive('sub-playing', value);
    renderPlaying();
    updateBreadcrumb('playing', value === 'all' ? null : value);
  }
}

function showSection(section, navKey, expand) {
  activeSection = section;
  document.querySelectorAll('.section').forEach(function(el) { el.classList.remove('active'); });
  document.getElementById('section-' + section).classList.add('active');
  openNavForce(navKey || section, expand !== false);
  history.replaceState(null, '', '#' + (navKey || section));
  updateTodayCalloutVisibility();

  if (section === 'dimoo')            renderDimoo();
  else if (section === 'movies')      renderMovies();
  else if (section === 'restaurants') renderRestaurants();
  else if (section === 'dessert')     renderDessertShops();
  else if (section === 'optcg')       renderOptcg();
  else if (section === 'playing')     renderPlaying();
}

// ── Setup ─────────────────────────────────────────────────────────────────────
function buildAllSubLists() {
  // Dimoo — groups in series_date order; "misc dimoos" goes last (9999.99)
  var seen = [];
  DIM.forEach(function(d) {
    var g = d.group || d.series;
    if (seen.indexOf(g) === -1) seen.push(g);
  });
  var seriesItems = [{ label: 'Figure Series', value: 'all' }].concat(seen.map(function(s) {
    return { label: s === 'misc dimoos' ? 'Misc Dimoos' : titleCase(s), value: s };
  }));
  buildSubList('sub-dimoo', seriesItems, function(val) { setSubFilter('dimoo', val); });

  // Movie years descending
  var movieYears = Array.from(new Set(
    MOV.map(function(m) { return m.watch_date ? m.watch_date.slice(0, 4) : null; }).filter(Boolean)
  )).sort().reverse();
  buildSubList('sub-movies',
    [{ label: 'All Years', value: 'all' }].concat(movieYears.map(function(y) { return { label: y, value: y }; })),
    function(val) { setSubFilter('movies', val); }
  );

  // Restaurant years descending
  var restYears = Array.from(new Set(
    REST.map(function(r) { return r.date ? r.date.slice(0, 4) : null; }).filter(Boolean)
  )).sort().reverse();
  buildSubList('sub-restaurants',
    [{ label: 'All', value: 'all' }].concat(restYears.map(function(y) { return { label: y, value: y }; })),
    function(val) { setSubFilter('restaurants', val); }
  );

  // Dessert shop years descending
  var dessertYears = Array.from(new Set(
    DESSERT.map(function(d) { return d.date ? d.date.slice(0, 4) : null; }).filter(Boolean)
  )).sort().reverse();
  buildSubList('sub-dessert',
    [{ label: 'All', value: 'all' }].concat(dessertYears.map(function(y) { return { label: y, value: y }; })),
    function(val) { setSubFilter('dessert', val); }
  );

  // OP TCG sets — separate sub-lists per owner
  var alexisSets = Array.from(new Set(
    OPTCG.filter(function(c) { return c.owner === 'alexis'; }).map(function(c) { return c.set; })
  ));
  buildSubList('sub-optcg',
    [{ label: 'All Sets', value: 'all' }].concat(alexisSets.map(function(s) { return { label: formatSetName(s), value: s }; })),
    function(val) { setSubFilter('optcg', val); }
  );

  var jordanSets = Array.from(new Set(
    OPTCG.filter(function(c) { return c.owner === 'jordan'; }).map(function(c) { return c.set; })
  ));
  buildSubList('sub-jordan-optcg',
    [{ label: 'All Sets', value: 'all' }].concat(jordanSets.map(function(s) { return { label: formatSetName(s), value: s }; })),
    function(val) { setSubFilter('jordan-optcg', val); }
  );

  // Restaurant cuisine filter dropdown
  var cuisines = Array.from(new Set(
    REST.map(function(r) { return r.cuisine; }).filter(Boolean)
  )).sort();
  var cuisineSel = document.getElementById('r-filter-cuisine');
  cuisines.forEach(function(c) {
    var opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c.replace(/_/g, ' ');
    cuisineSel.appendChild(opt);
  });

  // Dessert shop type filter dropdown
  var dessertTypes = Array.from(new Set(
    DESSERT.map(function(d) { return d.type; }).filter(Boolean)
  )).sort();
  var typeSel = document.getElementById('ds-filter-type');
  dessertTypes.forEach(function(t) {
    var opt = document.createElement('option');
    opt.value = t;
    opt.textContent = t.replace(/_/g, ' ');
    typeSel.appendChild(opt);
  });

  // Playing card brands (in file order) — cardmafia.md and misc.md brands each
  // group under one sidebar sub-item instead of listing every brand separately
  var realBrands = Array.from(new Set(
    PLAYING.filter(function(c) { return !c.group; }).map(function(c) { return c.brand; })
  ));
  var hasCardMafia = PLAYING.some(function(c) { return c.group === 'cardmafia'; });
  var hasMisc      = PLAYING.some(function(c) { return c.group === 'misc'; });
  var playingItems = [{ label: 'All Brands', value: 'all' }]
    .concat(realBrands.map(function(b) { return { label: titleCase(b), value: b }; }));
  if (hasCardMafia) playingItems.push({ label: 'Card Mafia', value: 'cardmafia' });
  if (hasMisc)      playingItems.push({ label: 'Misc', value: 'misc' });
  buildSubList('sub-playing', playingItems, function(val) { setSubFilter('playing', val); });
}

// navKey → section, so a URL hash like #jordan-optcg can be resolved on load
var NAV_KEY_SECTIONS = {
  dimoo: 'dimoo', optcg: 'optcg', 'jordan-optcg': 'optcg',
  movies: 'movies', restaurants: 'restaurants', dessert: 'dessert', playing: 'playing'
};

function goToSection(section, navKey) {
  if (section === 'dimoo')       dimooFilter  = 'all';
  if (section === 'movies')      movYear      = 'all';
  if (section === 'restaurants') restYear     = 'all';
  if (section === 'dessert')     dessertYear  = 'all';
  if (section === 'optcg') {
    optcgOwnerCtx = navKey === 'jordan-optcg' ? 'jordan' : 'alexis';
    if (optcgOwnerCtx === 'jordan') { optcgSetJordan = 'all'; optcgSortJordan = { col: 'number', dir: 'asc' }; }
    else                            { optcgSetAlexis = 'all'; optcgSortAlexis = { col: 'number', dir: 'asc' }; }
  }
  if (section === 'playing')     playingBrand = 'all';
  showSection(section, navKey);
  updateBreadcrumb(navKey === 'jordan-optcg' ? 'jordan-optcg' : section, null);
  setSubItemActive('sub-' + navKey, 'all');
}

function setupNav() {
  document.querySelectorAll('.nav-item').forEach(function(el) {
    el.addEventListener('click', function() {
      var section = el.dataset.section;
      var navKey  = el.dataset.nav;
      var isActive = el.classList.contains('active');

      if (isActive) {
        toggleSubList(navKey);
      } else {
        goToSection(section, navKey);
      }
    });
  });
}

function setupFilters() {
  document.getElementById('d-filter-owned').addEventListener('change', function() {
    if (dimooFilter === 'all') { dimooOwnedAll    = this.value; }
    else                       { dimooOwnedSeries = this.value; }
    renderDimooTable();
  });
  document.getElementById('d-search').addEventListener('input',        function() { renderDimooTable(); });
  document.getElementById('m-search').addEventListener('input',        function() { renderMoviesTable(); });
  document.getElementById('r-filter-return').addEventListener('change',  function() { renderRestaurantsTable(); });
  document.getElementById('r-filter-cuisine').addEventListener('change', function() { renderRestaurantsTable(); });
  document.getElementById('r-search').addEventListener('input',          function() { renderRestaurantsTable(); });
  document.getElementById('ds-filter-return').addEventListener('change', function() { renderDessertShopsTable(); });
  document.getElementById('ds-filter-type').addEventListener('change',  function() { renderDessertShopsTable(); });
  document.getElementById('ds-search').addEventListener('input',        function() { renderDessertShopsTable(); });
  document.getElementById('o-filter-region').addEventListener('change', function() { renderOptcgTable(); });
  document.getElementById('o-search').addEventListener('input', function() { renderOptcgTable(); });
  document.getElementById('p-search').addEventListener('input',        function() { renderPlayingTable(); });
}

function setupSortable() {
  // Dimoo
  document.querySelectorAll('#section-dimoo th[data-sort]').forEach(function(th) {
    th.classList.add('sortable');
    th.addEventListener('click', function() {
      var col = th.dataset.sort;
      dimooSort.dir = dimooSort.col === col && dimooSort.dir === 'asc' ? 'desc' : 'asc';
      dimooSort.col = col;
      renderDimooTable();
    });
  });

  // Movies
  document.querySelectorAll('#section-movies th[data-sort]').forEach(function(th) {
    th.classList.add('sortable');
    th.addEventListener('click', function() {
      var col = th.dataset.sort;
      movSort.dir = movSort.col === col && movSort.dir === 'asc' ? 'desc' : 'asc';
      movSort.col = col;
      renderMoviesTable();
    });
  });

  // Restaurants
  document.querySelectorAll('#section-restaurants th[data-sort]').forEach(function(th) {
    th.classList.add('sortable');
    th.addEventListener('click', function() {
      var col = th.dataset.sort;
      restSort.dir = restSort.col === col && restSort.dir === 'asc' ? 'desc' : 'asc';
      restSort.col = col;
      renderRestaurantsTable();
    });
  });

  // Dessert Shops
  document.querySelectorAll('#section-dessert th[data-sort]').forEach(function(th) {
    th.classList.add('sortable');
    th.addEventListener('click', function() {
      var col = th.dataset.sort;
      dessertSort.dir = dessertSort.col === col && dessertSort.dir === 'asc' ? 'desc' : 'asc';
      dessertSort.col = col;
      renderDessertShopsTable();
    });
  });

  // OP TCG
  document.querySelectorAll('#section-optcg th[data-sort]').forEach(function(th) {
    th.classList.add('sortable');
    th.addEventListener('click', function() {
      var col = th.dataset.sort;
      var s = optcgOwnerCtx === 'jordan' ? optcgSortJordan : optcgSortAlexis;
      s.dir = s.col === col && s.dir === 'asc' ? 'desc' : 'asc';
      s.col = col;
      renderOptcgTable();
    });
  });

  // Playing Cards
  document.querySelectorAll('#section-playing th[data-sort]').forEach(function(th) {
    th.classList.add('sortable');
    th.addEventListener('click', function() {
      var col = th.dataset.sort;
      playingSort.dir = playingSort.col === col && playingSort.dir === 'asc' ? 'desc' : 'asc';
      playingSort.col = col;
      renderPlayingTable();
    });
  });
}

// ── Global search ─────────────────────────────────────────────────────────────
function buildGlobalSearchIndex() {
  var index = [];
  DIM.forEach(function(d) {
    index.push({ type: 'dimoo', title: d.name, sub: 'dimoo — ' + (d.series || ''), item: d });
  });
  MOV.forEach(function(m) {
    index.push({ type: 'movies', title: m.title, sub: 'movie — ' + (m.watch_date || ''), item: m });
  });
  REST.forEach(function(r) {
    index.push({ type: 'restaurants', title: r.name, sub: 'restaurant — ' + (r.location || ''), item: r });
  });
  DESSERT.forEach(function(d) {
    index.push({ type: 'dessert', title: d.name, sub: 'dessert shop — ' + (d.location || ''), item: d });
  });
  OPTCG.forEach(function(c) {
    index.push({ type: 'optcg', title: c.name, sub: (c.owner === 'jordan' ? "jordan's" : "alexis's") + ' op tcg — ' + formatSetName(c.set || ''), item: c });
  });
  PLAYING.forEach(function(p) {
    index.push({ type: 'playing', title: p.name || p.brand, sub: 'playing cards — ' + (p.brand || ''), item: p });
  });
  return index;
}

function goToSearchResult(result) {
  var item = result.item;
  if (result.type === 'dimoo') {
    var group = item.group || item.series || 'all';
    showSection('dimoo', 'dimoo', true);
    setSubFilter('dimoo', group);
    document.getElementById('d-search').value = item.name || '';
    renderDimooTable();
  } else if (result.type === 'movies') {
    var year = item.watch_date ? item.watch_date.slice(0, 4) : 'all';
    showSection('movies', 'movies', true);
    setSubFilter('movies', year);
    document.getElementById('m-search').value = item.title || '';
    renderMoviesTable();
  } else if (result.type === 'restaurants') {
    var year = item.date ? item.date.slice(0, 4) : 'all';
    showSection('restaurants', 'restaurants', true);
    setSubFilter('restaurants', year);
    document.getElementById('r-search').value = item.name || '';
    renderRestaurantsTable();
  } else if (result.type === 'dessert') {
    var year = item.date ? item.date.slice(0, 4) : 'all';
    showSection('dessert', 'dessert', true);
    setSubFilter('dessert', year);
    document.getElementById('ds-search').value = item.name || '';
    renderDessertShopsTable();
  } else if (result.type === 'optcg') {
    var navKey = item.owner === 'jordan' ? 'jordan-optcg' : 'optcg';
    optcgOwnerCtx = item.owner === 'jordan' ? 'jordan' : 'alexis';
    showSection('optcg', navKey, true);
    setSubFilter(navKey, item.set || 'all');
    document.getElementById('o-search').value = item.name || '';
    renderOptcgTable();
  } else if (result.type === 'playing') {
    showSection('playing', 'playing', true);
    setSubFilter('playing', item.group === 'cardmafia' ? 'cardmafia' : (item.brand || 'all'));
    document.getElementById('p-search').value = item.name || item.brand || '';
    renderPlayingTable();
  }
}

function setupGlobalSearch() {
  var input   = document.getElementById('global-search');
  var results = document.getElementById('global-search-results');
  var timer   = null;

  function render(query) {
    var q = query.trim().toLowerCase();
    if (!q) { results.classList.remove('open'); results.innerHTML = ''; return; }

    var matches = buildGlobalSearchIndex()
      .filter(function(r) { return (r.title || '').toLowerCase().indexOf(q) !== -1; })
      .slice(0, 8);

    results.innerHTML = '';
    if (!matches.length) {
      results.innerHTML = '<div class="gsr-empty">No matches found.</div>';
    } else {
      matches.forEach(function(r) {
        var div = document.createElement('div');
        div.className = 'gsr-item';
        div.innerHTML =
          '<span class="gsr-title">' + esc(r.title || '') + '</span>' +
          '<span class="gsr-sub">' + esc(r.sub) + '</span>';
        div.addEventListener('click', function() {
          goToSearchResult(r);
          input.value = '';
          results.classList.remove('open');
          results.innerHTML = '';
        });
        results.appendChild(div);
      });
    }
    results.classList.add('open');
  }

  input.addEventListener('input', function() {
    var query = input.value;
    clearTimeout(timer);
    timer = setTimeout(function() { render(query); }, 200);
  });

  document.addEventListener('click', function(e) {
    if (!e.target.closest('#global-search-wrap')) {
      results.classList.remove('open');
    }
  });

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') { input.value = ''; results.classList.remove('open'); results.innerHTML = ''; input.blur(); }
  });
}

function setupMobile() {
  var sidebar   = document.getElementById('sidebar');
  var backdrop  = document.getElementById('sidebar-backdrop');
  var hamburger = document.getElementById('hamburger');

  hamburger.addEventListener('click', function() {
    sidebar.classList.toggle('open');
    backdrop.classList.toggle('open');
  });
  backdrop.addEventListener('click', function() {
    sidebar.classList.remove('open');
    backdrop.classList.remove('open');
  });
}

// ── Today callout ──────────────────────────────────────────────────────────────
var todayCalloutReady = false;
var todayCalloutDismissed = false;

function setupTodayCallout() {
  var today = new Date();
  var mmdd  = String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
  var curYear = String(today.getFullYear());
  var dismissKey = 'today-callout-dismissed-' + curYear + '-' + mmdd;

  if (localStorage.getItem(dismissKey)) return;

  var movieHits = MOV.filter(function(m) {
    return m.watch_date && m.watch_date.slice(5, 10) === mmdd && m.watch_date.slice(0, 4) !== curYear;
  });
  var restHits = REST.filter(function(r) {
    return r.date && r.date.slice(5, 10) === mmdd && r.date.slice(0, 4) !== curYear;
  });
  var dessertHits = DESSERT.filter(function(d) {
    return d.date && d.date.slice(5, 10) === mmdd && d.date.slice(0, 4) !== curYear;
  });

  if (!movieHits.length && !restHits.length && !dessertHits.length) return;

  var lines = [];
  movieHits.forEach(function(m) {
    var year = m.watch_date.slice(0, 4);
    var rating = m.rating != null ? ' (' + m.rating + '/10)' : '';
    lines.push('<div class="tc-line">🎬 in ' + esc(year) + ', you watched <strong>' + esc(m.title) + '</strong>' + esc(rating) + '</div>');
  });
  restHits.forEach(function(r) {
    var year = r.date.slice(0, 4);
    var grade = r.overall ? ' (' + r.overall + ')' : '';
    lines.push('<div class="tc-line">🍽️ in ' + esc(year) + ', you ate at <strong>' + esc(r.name) + '</strong>' + esc(grade) + '</div>');
  });
  dessertHits.forEach(function(d) {
    var year = d.date.slice(0, 4);
    var grade = d.overall ? ' (' + d.overall + ')' : '';
    lines.push('<div class="tc-line">🍰 in ' + esc(year) + ', you went to <strong>' + esc(d.name) + '</strong>' + esc(grade) + '</div>');
  });

  var el = document.getElementById('today-callout');
  el.innerHTML =
    '<button class="tc-dismiss" aria-label="Dismiss">&times;</button>' +
    '<div class="tc-title">On this day</div>' +
    lines.join('');

  el.querySelector('.tc-dismiss').addEventListener('click', function() {
    localStorage.setItem(dismissKey, '1');
    todayCalloutDismissed = true;
    updateTodayCalloutVisibility();
  });

  todayCalloutReady = true;
  updateTodayCalloutVisibility();
}

function updateTodayCalloutVisibility() {
  var el = document.getElementById('today-callout');
  var shouldShow = todayCalloutReady && !todayCalloutDismissed &&
    (activeSection === 'movies' || activeSection === 'restaurants' || activeSection === 'dessert');
  el.classList.toggle('show', shouldShow);
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  var results = await Promise.all([
    fetchJSON('dimoos.json'),
    fetchJSON('movies.json'),
    fetchJSON('restaurants.json'),
    fetchJSON('dessert_shops.json'),
    fetchJSON('optcg.json'),
    fetchJSON('playing_cards.json'),
    fetchJSON('meta.json')
  ]);
  DIM = results[0]; MOV = results[1]; REST = results[2]; DESSERT = results[3]; OPTCG = results[4]; PLAYING = results[5];

  var meta = results[6];
  if (meta && meta.synced_at) {
    var el = document.getElementById('last-synced');
    if (el) el.textContent = 'last synced: ' + new Date(meta.synced_at).toLocaleString([], {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit'
    });
  }

  buildAllSubLists();
  setupFilters();
  setupSortable();
  setupNav();
  setupMobile();
  setupGlobalSearch();
  setupTodayCallout();

  var navKey = location.hash.slice(1);
  var section = NAV_KEY_SECTIONS[navKey];
  if (!section) { navKey = 'dimoo'; section = 'dimoo'; }
  if (navKey === 'jordan-optcg') optcgOwnerCtx = 'jordan';

  showSection(section, navKey, false);
  updateBreadcrumb(navKey === 'jordan-optcg' ? 'jordan-optcg' : section, null);
  setSubItemActive('sub-' + navKey, 'all');

  window.addEventListener('hashchange', function() {
    var k = location.hash.slice(1);
    var s = NAV_KEY_SECTIONS[k];
    if (s) goToSection(s, k);
  });
}
