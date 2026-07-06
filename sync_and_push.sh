#!/bin/bash
set -e
cd /Users/chikimiko/Documents/GitHub/personal_database

# meta.json's timestamp changes on every run but is only committed when other
# data changes too, so it's often left dirty on disk — discard that leftover
# state before pulling/syncing so it can never block a future git pull.
git checkout -- meta.json 2>/dev/null || true

python3 sync_from_obsidian.py

if ! git diff --quiet -- dimoos.json movies.json restaurants.json optcg.json playing_cards.json; then
  git add dimoos.json movies.json restaurants.json optcg.json playing_cards.json meta.json
  git commit -m "sync: $(date '+%Y-%m-%d %H:%M')"
  git push origin main
fi
