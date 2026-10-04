#!/usr/bin/env python3
"""Check every data file the dashboard reads for the fields it needs.

Run after editing anything in data/:  python3 scripts/validate_data.py
Exits non-zero with a list of problems so CI can block a broken update.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
problems = []


def load(name):
    path = DATA / name
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        problems.append(f"{name}: file missing")
    except json.JSONDecodeError as e:
        problems.append(f"{name}: invalid JSON ({e})")
    return None


def need(obj, keys, where):
    for k in keys:
        if k not in obj or obj[k] in (None, ""):
            problems.append(f"{where}: missing '{k}'")


def num_in(obj, key, lo, hi, where):
    v = obj.get(key)
    if not isinstance(v, (int, float)) or not lo <= v <= hi:
        problems.append(f"{where}: '{key}' must be a number {lo}-{hi}, got {v!r}")


meta = load("meta.json")
if meta:
    need(meta, ["title", "asOf", "methodology", "howToUpdate", "changelog"], "meta.json")

market = load("market.json")
if market:
    need(market, ["trends", "benchmarks", "audience", "platforms"], "market.json")
    for i, t in enumerate(market.get("trends", [])):
        w = f"market.json trends[{i}] {t.get('name', '?')}"
        need(t, ["name", "direction", "summary"], w)
        num_in(t, "strength", 1, 5, w)
        if t.get("direction") not in ("rising", "peaking", "declining"):
            problems.append(f"{w}: direction must be rising|peaking|declining")
    for i, r in enumerate(market.get("steamCozyReleasesByYear", [])):
        need(r, ["year"], f"market.json steamCozyReleasesByYear[{i}]")

games = load("games.json")
if games is not None:
    seen = set()
    for i, g in enumerate(games):
        w = f"games.json [{i}] {g.get('name', '?')}"
        need(g, ["id", "name", "studio", "subgenre", "businessModel", "coreLoop", "monetization"], w)
        if g.get("id") in seen:
            problems.append(f"{w}: duplicate id '{g.get('id')}'")
        seen.add(g.get("id"))
        for k in ("priceUSD", "unitsOrPlayersMillions", "steamReviews", "steamPositivePct", "releaseYear"):
            if g.get(k) is not None and not isinstance(g.get(k), (int, float)):
                problems.append(f"{w}: '{k}' must be a number or null")

niches = load("niches.json")
if niches:
    for i, n in enumerate(niches.get("niches", [])):
        w = f"niches.json niches[{i}] {n.get('name', '?')}"
        need(n, ["name", "supplyEvidence", "demandEvidence", "opportunityNote"], w)
        num_in(n, "supply", 0, 10, w)
        num_in(n, "demand", 0, 10, w)

playbook = load("playbook.json")
if playbook:
    need(playbook, ["playbook", "funding", "localization", "budgets", "failureModes"], "playbook.json")

insights = load("insights.json")
if insights:
    need(insights, ["headline", "subhead", "kpis", "keyFindings", "monetizationModels"], "insights.json")

concepts = load("concepts.json")
if concepts:
    factors = [f["key"] for f in concepts.get("scoring", {}).get("factors", [])]
    if not factors:
        problems.append("concepts.json: scoring.factors is empty")
    for i, c in enumerate(concepts.get("concepts", [])):
        w = f"concepts.json concepts[{i}] {c.get('name', '?')}"
        need(c, ["id", "name", "niche", "oneLiner", "pitch", "coreLoop", "features", "platforms", "pricing",
                 "team", "budgetUSD", "steps", "marketingPlan", "liveOps", "kpis",
                 "killCriteria", "risks", "revenueScenarios"], w)
        need(c, ["track", "hook", "spec", "drivers", "look", "distribution"], w)
        need(c.get("distribution") or {}, ["ship", "firstMoney", "reach", "graduate"], w + " distribution")
        lk = c.get("look") or {}
        need(lk, ["short", "vibe", "references", "palette", "shapes", "characters", "camera", "lighting", "ui", "motion", "sound", "screenshot", "clip", "avoid"], w + " look")
        for col in lk.get("palette", []):
            if not str(col.get("hex", "")).startswith("#") or len(col.get("hex", "")) != 7:
                problems.append(f"{w}: look.palette hex must be #RRGGBB, got {col.get('hex')!r}")
        if c.get("track") not in ("main", "side"):
            problems.append(f"{w}: track must be main|side")
        for k in ("genre", "players", "setting", "coreVerb", "look", "team", "audience", "differentiator"):
            if not (c.get("spec") or {}).get(k):
                problems.append(f"{w}: spec.{k} missing")
        for j, d in enumerate(c.get("drivers") or []):
            if d.get("strength") not in ("strong", "medium", "supporting", "caution"):
                problems.append(f"{w}: drivers[{j}].strength must be strong|medium|supporting|caution")
            need(d, ["signal", "detail"], f"{w} drivers[{j}]")
        for f in factors:
            s = c.get("scores", {}).get(f)
            if not s or not isinstance(s.get("score"), (int, float)):
                problems.append(f"{w}: scores.{f}.score missing")

gtm = load("gotomarket.json")
if gtm:
    need(gtm, ["ladder", "stack", "loop", "platforms", "channels", "caseStudies", "viralHits", "patterns", "ai", "aiRules"], "gotomarket.json")
    for i, p in enumerate(gtm.get("platforms", [])):
        need(p, ["name", "type", "revShare", "linkFromSocial"], f"gotomarket.json platforms[{i}] {p.get('name', '?')}")

cul = load("culture.json")
if cul:
    need(cul, ["synthesis", "signals", "calendar"], "culture.json")
    for i, x in enumerate(cul.get("signals", [])):
        w = f"culture.json signals[{i}] {x.get('name', '?')}"
        need(x, ["name", "category", "whatsHappening", "direction"], w)
        num_in(x, "strength", 1, 5, w)

ver = load("verification.json")
if ver:
    for i, v in enumerate(ver.get("items", [])):
        if v.get("status") not in ("confirmed", "revised", "unverified"):
            problems.append(f"verification.json items[{i}]: status must be confirmed|revised|unverified")

if concepts:
    keys = {f["key"] for f in concepts.get("scoring", {}).get("factors", [])}
    for pr in concepts.get("scoring", {}).get("presets", []):
        missing = keys - set(pr.get("weights", {}))
        if missing:
            problems.append(f"concepts.json preset {pr.get('id')}: weights missing {sorted(missing)}")

pit = load("pitches.json") if (DATA / "pitches.json").exists() else None
if pit:
    keys = {f["key"] for f in (concepts or {}).get("scoring", {}).get("factors", [])}
    seen = set()
    for i, x in enumerate(pit.get("pitches", [])):
        w = f"pitches.json [{i}] {x.get('name', '?')}"
        need(x, ["id", "name", "family", "theme", "hook", "oneLiner", "loop", "clip", "look", "path", "effort", "why", "risk", "firstStep", "scores"], w)
        if x.get("id") in seen:
            problems.append(f"{w}: duplicate id")
        seen.add(x.get("id"))
        if x.get("path") not in ("web-first", "browser test → Steam", "Steam-first"):
            problems.append(f"{w}: path must be web-first | browser test → Steam | Steam-first")
        if x.get("effort") not in ("small", "medium", "large"):
            problems.append(f"{w}: effort must be small | medium | large")
        for k in keys:
            v = (x.get("scores") or {}).get(k)
            if not isinstance(v, int) or not 1 <= v <= 10:
                problems.append(f"{w}: scores.{k} must be an integer 1-10")

live = DATA / "live" / "steam.json"
if live.exists():
    try:
        json.loads(live.read_text(encoding="utf-8"))
    except json.JSONDecodeError as e:
        problems.append(f"live/steam.json: invalid JSON ({e})")

if problems:
    print(f"{len(problems)} problem(s):")
    for p in problems:
        print("  -", p)
    sys.exit(1)
print("Data OK:", len(games or []), "games,", len((niches or {}).get("niches", [])), "niches,",
      len((market or {}).get("trends", [])), "trends,", len((concepts or {}).get("concepts", [])), "concepts")
