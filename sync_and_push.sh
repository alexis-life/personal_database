#!/bin/bash
set -e
cd /Users/chikimiko/Documents/GitHub/personal_database

python3 sync_from_obsidian.py

if ! git diff --quiet -- dimoos.json movies.json restaurants.json optcg.json playing_cards.json; then
  git add dimoos.json movies.json restaurants.json optcg.json playing_cards.json
  git commit -m "sync: $(date '+%Y-%m-%d %H:%M')"
  git push origin working
  git push origin working:main --force
fi
