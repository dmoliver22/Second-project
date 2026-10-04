# Cozy Market Atlas

An analytics dashboard of the cozy game market, built to guide a new cozy-game studio. It covers:

| Section | What's in it |
|---|---|
| **Briefing** | The answers first: five ranked game suggestions with what drives each, the seven decisions with their evidence, your next 90 days, outliers, then the supporting numbers |
| **Launch & grow** | The web-first system for a solo, AI-assisted developer: the build → clip → ship → grow loop with gates, the recommended stack, 16 link-to-play platforms compared (revenue share, what a phone viewer gets), money (ads, web → paid funnels, payments, YouTube income), TikTok/Shorts/YouTube marketing with 19 case studies, and rules for using AI |
| **Culture signals** | Trends outside games (collectibles and characters, aesthetics, wellness and hobbies, social and search, seasons) with evidence, what each means for your games, which suggestions they support, a launch and content calendar, and idea seeds |
| **What spreads** | 34 viral and instant-play hits and why they spread, virality patterns, cozy genres on web portals, cozy mobile successes |
| **Ask the atlas** | Chat with the data. Answers come from this dashboard's files and fit the studio profile you fill in. Works in the claude.ai Artifact version, using the viewer's Claude account. |
| **What to build** | Ranked game suggestions (scoring presets: "Solo + AI, web-first" by default, or "Small studio, Steam") compared side by side (scores, drivers, genre, players, setting, price, team, budget…), plus 2 side bets. Each has the market signals that drive it, a characteristics spec, and a full build-and-run plan: team, budget, roadmap, marketing, live ops, targets, kill criteria, revenue scenarios. Scoring weights are adjustable. |
| **Outliers** | Games that broke the pattern (overperformers, surprises, cautionary tales), what to steal from each, plus copies-per-developer and "loved but few found them" views |
| **Market gaps** | 26 niches scored for demand vs supply on an opportunity map, plus what players say they wish existed |
| **Trends** | 15 trends (rising / peaking / declining) with evidence, Steam release volume, audience, cautionary tales |
| **Games that work** | 57 cozy games taken apart: genre, core loop, monetization, how they run live ops, how they found players, lessons |
| **Monetization** | Business models ranked for a new studio, price benchmarks, publishers |
| **Studio playbook** | Step-by-step operations from validation to expansion, funding options, budgets, localization, failure modes |
| **Sources & updates** | Fact-check of the key figures, every source URL, confidence levels, change log |

Every "Ask …" button (on games, niches, outliers and concepts) opens the chat with that question ready.

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
| `data/insights.json` | Headline, KPI tiles, key findings, the Briefing decisions and 90-day plan, outliers, "So what" takeaways, suggested chat questions, monetization guidance |
| `data/concepts.json` | Game suggestions (`track`: main or side), their hook, `spec` (characteristics), `drivers` (market signals, with strength: strong, medium, supporting or caution), factor scores, full plans, and the scoring weights |
| `data/gotomarket.json` | Platforms, ad and payment benchmarks, marketing channels and case studies, viral hits and patterns, AI landscape, cozy mobile/web games, and the recommended stack and loop |
| `data/culture.json` | Culture signals outside games, the synthesis, the seasonal calendar and idea seeds |
| `data/verification.json` | Fact-check results for the key figures |
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
js/ask.js             Ask the Atlas chat: prompt digest, lookup tools, safe markdown rendering
js/app.js             data loading, routing, the views
data/                 everything the dashboard says
scripts/              validate, build, Steam refresher
dist/                 built single-file dashboard
```
