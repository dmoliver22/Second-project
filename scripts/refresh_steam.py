#!/usr/bin/env python3
"""Pull live Steam review counts, review score and price for every game in data/games.json.

    python3 scripts/refresh_steam.py            # refresh all games
    python3 scripts/refresh_steam.py --dry-run  # print what would change

Uses Steam's public store endpoints (no API key):
  - storesearch  to find an app id when a game has no "steamAppId" yet
  - appreviews   for total / positive review counts
  - appdetails   for the current US price
Results go to data/live/steam.json, which the dashboard overlays on top of games.json.
Found app ids are also written back into games.json so later runs skip the search.
Runs weekly from .github/workflows/refresh-data.yml.
"""
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GAMES = ROOT / "data" / "games.json"
LIVE = ROOT / "data" / "live" / "steam.json"
UA = {"User-Agent": "cozy-market-atlas/1.0 (+https://github.com/dmoliver22/second-project)"}


def get_json(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.loads(r.read().decode("utf-8"))


def norm(name):
    return re.sub(r"[^a-z0-9]", "", name.lower())


def find_app_id(name):
    q = urllib.parse.quote(name)
    data = get_json(f"https://store.steampowered.com/api/storesearch/?term={q}&cc=US&l=en")
    for item in data.get("items", []):
        if norm(item.get("name", "")) == norm(name):
            return item["id"]
    return None


def parse_reviews(data):
    s = data.get("query_summary") or {}
    total = s.get("total_reviews")
    if not total:
        return None
    pos = s.get("total_positive", 0)
    return {"totalReviews": total, "positivePct": round(100 * pos / total), "reviewScoreDesc": s.get("review_score_desc")}


def parse_price(data, app_id):
    entry = data.get(str(app_id)) or {}
    if not entry.get("success"):
        return None
    d = entry.get("data") or {}
    if d.get("is_free"):
        return 0
    po = d.get("price_overview")
    if po and po.get("initial") is not None:
        return round(po["initial"] / 100, 2)
    return None


def main():
    dry = "--dry-run" in sys.argv
    games = json.loads(GAMES.read_text(encoding="utf-8"))
    out = {"updatedAt": date.today().isoformat(), "source": "Steam store public endpoints", "games": {}}
    ids_added = 0
    for g in games:
        if "PC" not in (g.get("platforms") or []) or g.get("noSteam") or g.get("status") == "unreleased":
            continue
        try:
            app_id = g.get("steamAppId")
            if not app_id:
                app_id = find_app_id(g["name"])
                if not app_id:
                    print(f"  ? {g['name']}: no exact Steam match, add steamAppId by hand or set noSteam: true")
                    continue
                g["steamAppId"] = app_id
                ids_added += 1
            rev = parse_reviews(get_json(f"https://store.steampowered.com/appreviews/{app_id}?json=1&language=all&purchase_type=all&num_per_page=0"))
            price = parse_price(get_json(f"https://store.steampowered.com/api/appdetails?appids={app_id}&cc=us&filters=price_overview,basic"), app_id)
            if rev:
                out["games"][g["id"]] = dict(appId=app_id, priceUSD=price, **rev)
                print(f"  ✓ {g['name']}: {rev['totalReviews']:,} reviews, {rev['positivePct']}% positive")
            time.sleep(1.2)  # stay well under Steam's rate limit
        except Exception as e:  # one bad game must not stop the run
            print(f"  ! {g['name']}: {e}")
    if dry:
        print(json.dumps(out, indent=2)[:2000])
        return
    if not out["games"]:
        print("No Steam data fetched; leaving data/live/steam.json unchanged.")
        sys.exit(1)
    LIVE.parent.mkdir(parents=True, exist_ok=True)
    LIVE.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    if ids_added:
        GAMES.write_text(json.dumps(games, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(out['games'])} games to {LIVE.relative_to(ROOT)}; {ids_added} new app ids saved.")


if __name__ == "__main__":
    main()
