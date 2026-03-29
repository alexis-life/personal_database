'use strict';

// ── Global state ──────────────────────────────────────────────────────────────
var DIM = [], MOV = [], REST = [];
var CI = {};
var activeSection = 'dimoo';
var dimooFilter   = 'all';
var movYear       = 'all';
var restYear      = 'all';

// Dimoo owned-filter state: separate per view so they don't bleed into each other
var dimooOwnedAll    = 'yes'; // all-series default: show owned only
var dimooOwnedSeries = '';    // per-series default: show all statuses

// Sort state per table  { col: String|null, dir: 'asc'|'desc' }
var dimooSort = { col: null, dir: 'asc' };
var movSort   = { col: null, dir: 'asc' };
var restSort  = { col: null, dir: 'asc' };

var PALETTE = [
  '#b9375e','#e05780','#8a2846','#ff7aa2','#ff9ebb',
  '#602437','#ffc2d4','#522e38','#d44070','#f0a0b8',
  '#9c2f50','#ffa8c5','#701c3a','#c05070','#ffe0e9'
];

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
  var names = { dimoo: 'Dimoo Collection', movies: 'Movies', restaurants: 'Restaurants' };
  var parent = names[section] || section;
  var bc = document.getElementById('breadcrumb');

  if (!filter || filter === 'all') {
    bc.innerHTML = '<span class="bc-current">' + esc(parent) + '</span>';
  } else {
    var display = section === 'dimoo' ? titleCase(filter) : filter;
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
function openNavForce(navKey) {
  document.querySelectorAll('.nav-item').forEach(function(el) {
    var k = el.dataset.nav;
    var sub = document.getElementById('sub-' + k);
    if (k === navKey) {
      el.classList.add('active', 'open');
      if (sub) sub.style.maxHeight = sub.scrollHeight + 'px';
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
  }
}

function showSection(section) {
  activeSection = section;
  document.querySelectorAll('.section').forEach(function(el) { el.classList.remove('active'); });
  document.getElementById('section-' + section).classList.add('active');
  openNavForce(section);

  if (section === 'dimoo')            renderDimoo();
  else if (section === 'movies')      renderMovies();
  else if (section === 'restaurants') renderRestaurants();
}

// ── Setup ─────────────────────────────────────────────────────────────────────
function buildAllSubLists() {
  // Dimoo — series in series_date order; "misc dimoos" goes last (9999.99)
  var seen = [];
  DIM.forEach(function(d) { if (seen.indexOf(d.series) === -1) seen.push(d.series); });
  var seriesItems = [{ label: 'All Series', value: 'all' }].concat(seen.map(function(s) {
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
        if (section === 'dimoo')       dimooFilter = 'all';
        if (section === 'movies')      movYear     = 'all';
        if (section === 'restaurants') restYear    = 'all';
        showSection(section);
        updateBreadcrumb(section, null);
        setSubItemActive('sub-' + navKey, 'all');
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
  document.getElementById('r-filter-return').addEventListener('change',function() { renderRestaurantsTable(); });
  document.getElementById('r-search').addEventListener('input',        function() { renderRestaurantsTable(); });
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

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  var results = await Promise.all([
    fetchJSON('dimoos.json'),
    fetchJSON('movies.json'),
    fetchJSON('restaurants.json')
  ]);
  DIM = results[0]; MOV = results[1]; REST = results[2];

  buildAllSubLists();
  setupFilters();
  setupSortable();
  setupNav();
  setupMobile();

  showSection('dimoo');
  updateBreadcrumb('dimoo', null);
  setSubItemActive('sub-dimoo', 'all');
}
