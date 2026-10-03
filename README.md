# Cozy Market Atlas

An analytics dashboard of the cozy game market, built to guide a new cozy-game studio. It covers:

| Section | What's in it |
|---|---|
| **Overview** | Headline numbers, the recommended first game, biggest open lanes, key findings |
| **Trends** | 15 trends (rising / peaking / declining) with evidence, Steam release volume, audience, cautionary tales |
| **Market gaps** | 26 niches scored for demand vs supply on an opportunity map, plus what players say they wish existed |
| **Games that work** | 57 cozy games taken apart: genre, core loop, monetization, how they run live ops, how they found players, lessons |
| **Monetization** | Business models ranked for a new studio, price benchmarks, publishers |
| **Studio playbook** | Step-by-step operations from validation to expansion, funding options, budgets, localization, failure modes |
| **What to build** | 6 ranked game concepts, each with a full build-and-run plan: team, budget, roadmap, marketing, live ops, targets, kill criteria, revenue scenarios. Scoring weights are adjustable. |
| **Sources & updates** | Every source URL, confidence levels, change log |

## Open it

- **Quickest:** open `dist/cozy-market-atlas.html` in any browser. It's a single self-contained file.
- **From the source folder:** `python3 -m http.server 8000`, then visit http://localhost:8000. Opening `index.html` directly won't work because browsers block loading the JSON files from disk.
- **Hosted:** enable GitHub Pages on this repo (Settings → Pages → deploy from branch, root). `index.html` works as-is.

## Keep it current

All content lives in `data/`. The code only renders it.

| File | Holds |
|---|---|
| `data/games.json` | One object per game. Add a game by copying an existing entry. |
| `data/niches.json` | Niche supply/demand scores (0–10) and player requests. The opportunity score is computed. |
| `data/market.json` | Trends, Steam release counts, audience, platforms, benchmarks, publishers, flops |
| `data/playbook.json` | Operating steps, funding, budgets, localization, failure modes |
| `data/insights.json` | Headline, KPI tiles, key findings, monetization model guidance |
| `data/concepts.json` | Game concepts, their factor scores and plans, scoring weights |
| `data/meta.json` | As-of date, methodology, change log |
| `data/live/steam.json` | Live Steam review counts and prices (written by the refresher, don't edit by hand) |

After editing:

```bash
python3 scripts/validate_data.py   # checks every file for missing or malformed fields
python3 scripts/build.py           # rebuilds dist/cozy-market-atlas.html
```

### Automatic updates

`.github/workflows/refresh-data.yml` runs every Monday. It pulls current Steam review counts, review scores and prices for every PC game in `games.json` (`scripts/refresh_steam.py`), validates, rebuilds `dist/`, and commits the result. Games with a "live" label in the dashboard come from this feed. Run it on demand from the Actions tab, or locally with `python3 scripts/refresh_steam.py`.

Market research (trends, niches, new games) still needs a periodic research pass. Once a quarter, ask Claude to re-run the cozy market research and update `data/`, then add a line to the change log in `data/meta.json`.

## About the numbers

Every figure carries a source link and a confidence level (high, medium, low). Research for this edition was done on 3 Oct 2026 from search-result summaries of the cited pages, because direct page fetches were blocked in the research environment. Third-party Steam sales estimates (Gamalytic, VG Insights, Raijin) often disagree by 2–5x. Spot-check a number before you put money behind it. Niche scores and concept scores are research-based judgements, not measurements.

## Project layout

```
index.html            page shell
css/styles.css        design tokens (light + dark) and layout
js/charts.js          small SVG chart kit (bars, columns, scatter, timeline), no dependencies
js/app.js             data loading, routing, the eight views
data/                 everything the dashboard says
scripts/              validate, build, Steam refresher
dist/                 built single-file dashboard
```
