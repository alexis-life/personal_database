# Dashboard UI Design Document

## Inspiration

| Reference | What to borrow |
|---|---|
| **Just the Docs** | White/light sidebar, content-first layout, flat minimal aesthetic, clean typography, collapsible nav |
| **Flatlogic Light Blue** | Sidebar + topbar admin structure, stat card layout, breadcrumb trail |
| **Materially (CodedThemes)** | Poppins typography, card elevation, spacing rhythm, section grouping in sidebar |

---

## Layout

### Structure

```
┌──────────────────────────────────────────────────────────────┐
│ SIDEBAR (260px)     │ TOPBAR (full, 60px)                    │
│ ─────────────────── │ [≡]  Dimoo Collection > All Series     │
│ My Dashboard        ├────────────────────────────────────────│
│                     │ CONTENT AREA (white/near-white bg)     │
│ COLLECTIONS         │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  │
│  Dimoo Collection ▾ │  │ stat │ │ stat │ │ stat │ │ stat │  │
│    All Series       │  └──────┘ └──────┘ └──────┘ └──────┘  │
│    Animal Kingdom   │  ┌──────────────────┐ ┌─────────────┐  │
│    By Your Side     │  │   chart card     │ │ chart card  │  │
│    ...              │  └──────────────────┘ └─────────────┘  │
│                     │  ┌──────────────────────────────────┐  │
│ REVIEWS             │  │          table card              │  │
│  Movies ▾           │  └──────────────────────────────────┘  │
│    All Years        │                                        │
│    2023             │                                        │
│    2024             │                                        │
│    2025             │                                        │
│    2026             │                                        │
│  Restaurants ▾      │                                        │
│    All              │                                        │
│    2025             │                                        │
└──────────────────────────────────────────────────────────────┘
```

### Measurements

| Element | Value |
|---|---|
| Sidebar width | 260px |
| Topbar height | 60px |
| Content padding | 28px |
| Card gap | 20px |
| Card border radius | 10px |
| Card padding | 20px 24px |
| Stat card min-width | 160px |
| Table row height | ~44px |
| Sidebar section label height | 32px |
| Sidebar nav item height | 38px |
| Sidebar sub-item height | 34px |

### Responsive

- **≥ 1024px**: sidebar always visible, content offset by 260px
- **< 1024px**: sidebar hidden off-screen (translateX(-260px)), toggled by hamburger in topbar; dark overlay backdrop when open
- **< 600px**: stat grid → 2 columns; chart grid → 1 column

---

## Color Usage

Source palette (light → dark):
`#ffe0e9 → #ffc2d4 → #ff9ebb → #ff7aa2 → #e05780 → #b9375e → #8a2846 → #602437 → #522e38`

### Overall feel: white/light pages

| Role | Color | Notes |
|---|---|---|
| Page background | `#f9f4f5` | Near-white with faint pink warmth |
| Card background | `#ffffff` | Pure white cards |
| Sidebar background | `#ffffff` | White sidebar (Just the Docs feel) |
| Sidebar border | `#ffc2d4` | Right border separating sidebar from content |
| Sidebar brand text | `#522e38` | "My Dashboard" heading |
| Sidebar section label | `#b9375e` | "COLLECTIONS", "REVIEWS" — uppercase, small |
| Sidebar nav item text | `#602437` | Inactive items |
| Sidebar sub-item text | `#8a2846` | Series/year sub-items |
| Sidebar active item bg | `#ffe0e9` | Active item highlight |
| Sidebar active item text | `#b9375e` | Active item text |
| Sidebar active accent | `#b9375e` | 3px left border on active item |
| Sidebar hover bg | `#fff0f3` | Hover state |
| Topbar background | `#ffffff` | |
| Topbar border | `#ffc2d4` | Bottom border |
| Topbar breadcrumb separator | `#ff9ebb` | "/" between crumbs |
| Topbar current page | `#522e38` | Current crumb (bold) |
| Topbar parent crumbs | `#8a2846` | Ancestor crumbs (clickable) |
| Primary | `#b9375e` | Stat values, buttons, active states |
| Accent | `#e05780` | Secondary highlights |
| Body text | `#522e38` | All body/table text |
| Muted text | `#8a2846` | Labels, placeholders |
| Border | `#ffc2d4` | Card dividers, input borders, table lines |
| Card shadow | `0 1px 6px rgba(82,46,56,0.08)` | Very subtle |
| Table header bg | `#fff0f3` | Lightest pink for sticky `<th>` |
| Row hover | `#fff0f3` | Table row hover |

---

## Typography

**Import**: `'Poppins'` 400/500/600 from Google Fonts

| Element | Size | Weight | Color | Other |
|---|---|---|---|---|
| Brand / site name | 1rem | 700 | `#522e38` | — |
| Sidebar section label | 0.65rem | 700 | `#b9375e` | uppercase, 0.1em spacing |
| Sidebar nav item | 0.875rem | 500 | `#602437` | — |
| Sidebar sub-item | 0.8rem | 400 | `#8a2846` | — |
| Topbar breadcrumb | 0.875rem | 500 | varies | — |
| Stat value | 2rem | 700 | `#b9375e` | — |
| Stat label | 0.7rem | 600 | `#8a2846` | uppercase, 0.06em spacing |
| Stat sub-text | 0.78rem | 400 | `#8a2846` | — |
| Card section title | 0.7rem | 600 | `#8a2846` | uppercase, 0.06em spacing |
| Table header | 0.7rem | 600 | `#8a2846` | uppercase, 0.05em spacing |
| Table body | 0.85rem | 400 | `#522e38` | — |
| Badge / pill | 0.75rem | 600 | varies | — |

---

## Sidebar Behavior

### Group structure

```
COLLECTIONS                     ← section label (not clickable)
  Dimoo Collection ▾            ← nav item, expands on click
    · All Series                ← sub-item (default active when section loads)
    · Animal Kingdom
    · By Your Side
    · ... (all 36 series, scrollable if needed)

REVIEWS                         ← section label
  Movies ▾                      ← nav item
    · All Years
    · 2023
    · 2024
    · 2025
    · 2026
  Restaurants ▾                 ← nav item
    · All
    · 2025
    · 2026
```

### Interaction rules

- **Section labels** ("COLLECTIONS", "REVIEWS"): purely visual, not clickable
- **Nav items** (Dimoo Collection, Movies, Restaurants): clicking loads the section AND toggles the sub-item list open/closed; chevron rotates 90° when open
- **Sub-items**: clicking sets a filter on the current section's table (series filter for Dimoo, year filter for Movies/Restaurants); updates breadcrumb
- Only one nav item can have its sub-items expanded at a time (accordion)
- On initial load: Dimoo Collection is active, "All Series" sub-item selected, sub-list open

### Sub-item source

Sub-items are generated dynamically from loaded JSON data at runtime (not hardcoded), so new series/years appear automatically after a sync.

---

## Topbar / Breadcrumb

```
[≡ hamburger, mobile only]   Dimoo Collection  /  Animal Kingdom
```

- Breadcrumb separator: `#ff9ebb` colored "/"
- Parent segments: `#8a2846`, clickable (clicking parent segment resets filter to "All")
- Current segment: `#522e38`, bold, not clickable
- On desktop: hamburger hidden; breadcrumb takes full topbar left side
- Topbar right side: reserved (empty for now, could add search/profile later)

---

## Component Specifications

### Stat Cards

- Grid: `repeat(auto-fit, minmax(160px, 1fr))`
- White bg, 10px radius, `0 1px 6px rgba(82,46,56,0.08)` shadow
- Left accent bar: 4px solid, rotating through palette per card position:
  - Position 1: `#b9375e`
  - Position 2: `#e05780`
  - Position 3: `#ff7aa2`
  - Position 4: `#ff9ebb`
- Inner layout (top→bottom): label → value → sub-text

### Chart Cards

- White bg, 10px radius, same shadow
- Card header: uppercase label + `1px solid #ffc2d4` bottom divider, 16px 24px padding
- Chart body: 16px top padding
- Wide chart (Dimoo series bar): explicit `height: 520px` wrapper div, `maintainAspectRatio: false`

### Table Card

- White bg, 10px radius, same shadow, full-width
- Table header section: title + count pill left, filters right, `1px solid #ffc2d4` divider, 16px 24px padding
- `<th>` sticky: `background: #fff0f3`, uppercase muted style
- `tbody`: `max-height: 480px; overflow-y: auto`
- Row hover: `background: #fff0f3`

---

## Badges & Pills

**Dimoo table specifically — light = positive, dark = negative:**

| Type | Background | Text | Rationale |
|---|---|---|---|
| Owned | `#ffe0e9` | `#b9375e` | Light = present/positive |
| Missing | `#8a2846` | `#ffc2d4` | Dark = absent/negative |

**All other tables (restaurants would_return, etc.):**

| Type | Background | Text |
|---|---|---|
| Yes | `#ffe0e9` | `#b9375e` |
| No | `#8a2846` | `#ffc2d4` |
| Maybe | `#e05780` | `#ffffff` |
| Count pill | `rgba(185,55,94,0.10)` | `#b9375e` |

**Rating pills:**

| Range | Background | Text |
|---|---|---|
| 8–10 | `#b9375e` | `#ffe0e9` |
| 5–7 | `#e05780` | `#ffffff` |
| 1–4 | `#ffc2d4` | `#8a2846` |

**Grade pills:**

| Grade | Background | Text |
|---|---|---|
| S | `#8a2846` | `#ffe0e9` |
| A | `#b9375e` | `#ffe0e9` |
| B | `#e05780` | `#ffffff` |
| C | `#ff9ebb` | `#602437` |
| D | `#ffc2d4` | `#602437` |

---

## Chart Colors

```js
const PALETTE = [
  '#b9375e','#e05780','#8a2846','#ff7aa2','#ff9ebb',
  '#602437','#ffc2d4','#522e38','#d44070','#f0a0b8',
  '#9c2f50','#ffa8c5','#701c3a','#c05070','#ffe0e9'
];

// Dimoo stacked bar
owned:   '#b9375e'   missing: '#ffc2d4'

// Dimoo growth line
borderColor: '#b9375e'   backgroundColor: 'rgba(185,55,94,0.12)'

// Movies year bars:      '#b9375e'
// Restaurants month:     '#e05780'
// Location doughnut:     ['#b9375e','#e05780','#8a2846']
// Would-return:          yes='#b9375e'  maybe='#e05780'  no='#522e38'

// Grade distribution
S:'#8a2846'  A:'#b9375e'  B:'#e05780'  C:'#ff9ebb'  D:'#ffc2d4'

// Rating distribution (1→10, light to rich)
['#ffe0e9','#ffc2d4','#ff9ebb','#ff7aa2','#ff7aa2',
 '#e05780','#e05780','#b9375e','#8a2846','#602437']
```

---

## Files to Change

- **`index.html`** — full CSS and HTML structure rewrite; JS data/render logic mostly unchanged

## Dimoo Table Sort Order

Rows are sorted by `series_date` (the date prefix from the Obsidian filename, e.g. `2022.05`), oldest series first. Within a series, figurines keep their file order. `sync_from_obsidian.py` writes `series_date` into each dimoo entry; `00 - misc dimoos.md` gets `"9999.99"` so misc items sort to the end.

## Files changing

- **`index.html`** — full CSS and HTML structure rewrite
- **`sync_from_obsidian.py`** — adds `series_date` field to each dimoo entry

## Files NOT changing

`dimoos.json`, `movies.json`, `restaurants.json`, `CLAUDE.md`
