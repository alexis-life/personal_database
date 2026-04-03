#!/usr/bin/env python3
"""
Sync Dimoo, movie, and restaurant data from Obsidian vault to dashboard JSON files.
Run from the repo root: python3 sync_from_obsidian.py
"""

import json
import re
from pathlib import Path

VAULT      = Path.home() / "Library/Mobile Documents/iCloud~md~obsidian/Documents/personal"
DIMOOS_DIR = VAULT / "cards/dimoos"
MOVIES_DIR = VAULT / "cards/movies"
REST_DIR   = VAULT / "cards/restaurants"
OUT_DIR    = Path(__file__).parent

# ── Shared helpers ────────────────────────────────────────────────────────────

def parse_frontmatter(filepath):
    """Parse Dataview inline frontmatter (key:: value lines at top of file)."""
    fields = {}
    with open(filepath, encoding="utf-8") as f:
        for line in f:
            line = line.rstrip("\n")
            if not line.strip():
                break
            m = re.match(r"^([\w]+)::\s*(.*)$", line)
            if m:
                fields[m.group(1)] = m.group(2).strip()
            elif not fields:
                continue
            else:
                break
    return fields


def to_iso_date(d):
    """Convert YYYY.MM.DD → YYYY-MM-DD."""
    return d.replace(".", "-") if d else ""


# ── Dimoo ─────────────────────────────────────────────────────────────────────

MONTHS = {
    "january":1,"february":2,"march":3,"april":4,"may":5,"june":6,
    "july":7,"august":8,"september":9,"october":10,"november":11,"december":12
}

def parse_dimoo_date(s):
    """Convert 'april 11, 2025' → '04/11/2025', pass 'n/a' through."""
    if not s:
        return "n/a"
    s = s.strip().lower().replace(",", "")
    if s in ("n/a", ""):
        return "n/a"
    parts = s.split()
    if len(parts) == 3 and parts[0] in MONTHS:
        try:
            return f"{MONTHS[parts[0]]:02d}/{int(parts[1]):02d}/{parts[2]}"
        except (ValueError, IndexError):
            pass
    return "n/a"


def extract_inline_fields(cell_text):
    """Extract all (key:: value) patterns from a table cell string."""
    return {
        m.group(1): m.group(2).strip()
        for m in re.finditer(r"\((\w+)::\s*([^)]*)\)", cell_text)
    }


def load_dimoos():
    dimoos = []

    for f in sorted(DIMOOS_DIR.glob("*.md")):
        fm = parse_frontmatter(f)
        file_series = fm.get("series_name", "").strip()
        is_misc = f.name.startswith("00 -")

        # Extract YYYY.MM date prefix from filename (e.g. "2022.05 - go on an outing.md" → "2022.05")
        # Misc file ("00 - misc dimoos.md") gets "9999.99" to sort last
        if is_misc:
            series_date = "9999.99"
        else:
            date_m = re.match(r"^(\d{4}\.\d{2})", f.name)
            series_date = date_m.group(1) if date_m else "9999.98"

        with open(f, encoding="utf-8") as fh:
            lines = fh.readlines()

        in_table = False
        for line in lines:
            line = line.rstrip("\n")

            # Detect table start
            if line.startswith("|") and "---" in line:
                in_table = True
                continue
            if not line.startswith("|"):
                in_table = False
                continue
            if not in_table:
                # Still try data rows even before separator (header already handled)
                pass

            # Skip separator rows
            if re.search(r"\|[-\s|]+\|", line):
                continue

            # Extract all inline fields from the full row
            fields = extract_inline_fields(line)
            if not fields:
                continue

            name = fields.get("name", "").strip()
            if not name:
                continue

            # Combine who + who_dup_* for multiple sources
            who_parts = [fields.get("who", "")]
            for k, v in sorted(fields.items()):
                if k.startswith("who_dup") and v and v != "n/a":
                    who_parts.append(v)
            who = "; ".join(p for p in who_parts if p and p != "n/a") or "n/a"

            # Files where each row has its own inline (series:: value)
            INLINE_SERIES_FILES = {"pop beans"}
            if is_misc:
                group  = "misc dimoos"
                series = fields.get("series", "misc dimoos")
            elif file_series in INLINE_SERIES_FILES:
                group  = file_series
                series = fields.get("series", file_series)
            else:
                group  = file_series
                series = file_series

            dimoos.append({
                "name":          name,
                "type":          fields.get("type", ""),
                "series":        series,
                "group":         group,
                "series_date":   series_date,
                "number":        fields.get("num", "?"),
                "owned":         fields.get("owned", "no"),
                "how":           fields.get("how", "n/a"),
                "who":           who,
                "purchase_date": parse_dimoo_date(fields.get("date", "n/a")),
            })

    dimoos.sort(key=lambda d: d["series_date"])
    return dimoos


# ── Movies ────────────────────────────────────────────────────────────────────

def load_movies():
    movies = []
    for year_dir in sorted(MOVIES_DIR.iterdir()):
        if not year_dir.is_dir():
            continue
        for f in sorted(year_dir.glob("*.md")):
            fm = parse_frontmatter(f)
            if not fm.get("movie_name"):
                continue

            raw_name = fm["movie_name"]
            year_match = re.search(r"\((\d{4})\)\s*$", raw_name)
            release_year = int(year_match.group(1)) if year_match else None
            title = re.sub(r"\s*\(\d{4}\)\s*$", "", raw_name).strip()

            try:
                rating = int(fm.get("rating", ""))
            except (ValueError, TypeError):
                rating = None

            movies.append({
                "title":      title,
                "year":       release_year,
                "watch_date": to_iso_date(fm.get("watch_date", "")),
                "location":   fm.get("location", ""),
                "people":     fm.get("people", ""),
                "rating":     rating,
                "overall":    fm.get("overall", ""),
            })

    movies.sort(key=lambda m: m.get("watch_date") or "")
    return movies


# ── Restaurants ───────────────────────────────────────────────────────────────

def load_restaurants():
    restaurants = []
    for f in sorted(REST_DIR.glob("*.md")):
        fm = parse_frontmatter(f)
        if not fm.get("restaurant_name"):
            continue

        restaurants.append({
            "name":         fm.get("restaurant_name", ""),
            "date":         to_iso_date(fm.get("date", "")),
            "location":     fm.get("location", ""),
            "people":       fm.get("people", ""),
            "would_return": fm.get("would_return", ""),
            "return_visit": fm.get("return_visit", ""),
            "food":         fm.get("food", ""),
            "service":      fm.get("service", ""),
            "atmosphere":   fm.get("atmosphere", ""),
            "value":        fm.get("value", ""),
            "overall":      fm.get("overall", ""),
        })

    restaurants.sort(key=lambda r: r.get("date") or "")
    return restaurants


# ── Main ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    dimoos = load_dimoos()
    with open(OUT_DIR / "dimoos.json", "w", encoding="utf-8") as f:
        json.dump(dimoos, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(dimoos)} dimoos → dimoos.json")

    movies = load_movies()
    with open(OUT_DIR / "movies.json", "w", encoding="utf-8") as f:
        json.dump(movies, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(movies)} movies → movies.json")

    restaurants = load_restaurants()
    with open(OUT_DIR / "restaurants.json", "w", encoding="utf-8") as f:
        json.dump(restaurants, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(restaurants)} restaurants → restaurants.json")
