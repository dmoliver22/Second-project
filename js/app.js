/* Cozy Market Atlas — renders every view from the JSON files in /data.
   To change what the dashboard says, edit the data files; this file should rarely need to change. */
(function () {
  "use strict";
  const C = window.AtlasCharts;

  // ---------- tiny DOM builder (text always via textContent) ----------
  function h(tag, attrs, ...kids) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v === undefined || v === null || v === false) continue;
        if (k === "class") el.className = v;
        else if (k === "text") el.textContent = v;
        else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
        else if (k === "style") el.setAttribute("style", v);
        else el.setAttribute(k, v === true ? "" : v);
      }
    }
    append(el, kids);
    return el;
  }
  function append(el, kids) {
    for (const k of kids.flat(Infinity)) {
      if (k === null || k === undefined || k === false) continue;
      el.appendChild(k instanceof Node ? k : document.createTextNode(String(k)));
    }
    return el;
  }
  const svgIcon = (d) => {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    const p = document.createElementNS(ns, "path");
    p.setAttribute("d", d);
    p.setAttribute("fill", "none");
    p.setAttribute("stroke", "currentColor");
    p.setAttribute("stroke-width", "2");
    p.setAttribute("stroke-linecap", "round");
    p.setAttribute("stroke-linejoin", "round");
    svg.appendChild(p);
    return svg;
  };
  const ICON = {
    up: "M4 17l6-6 4 4 6-8M14 7h6v6",
    flat: "M4 12h16M14 6l6 6-6 6",
    down: "M4 7l6 6 4-4 6 8M14 17h6v-6",
  };

  const store = {
    get(k, d) { try { const v = localStorage.getItem("atlas:" + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem("atlas:" + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  };

  const fmtMoney = (v) => (v === 0 ? "Free" : v == null ? "—" : "$" + (v % 1 ? v.toFixed(2) : v));
  const fmtM = (v) => (v == null ? "—" : v >= 1 ? +v.toFixed(1) + "M" : Math.round(v * 1000) + "k");
  const fmtInt = (v) => (v == null ? "—" : Number(v).toLocaleString("en-US"));
  const median = (arr) => { const a = arr.filter((x) => x != null).sort((x, y) => x - y); if (!a.length) return null; const m = Math.floor(a.length / 2); return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2; };
  const uniq = (arr) => [...new Set(arr)];
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

  function conf(level) { return level ? h("span", { class: "conf " + level, text: level + " confidence" }) : null; }
  function srcLinks(urls, cls) {
    if (!urls || !urls.length) return null;
    return h("div", { class: "src-list " + (cls || "") }, h("span", { class: "muted", text: "Sources: " }),
      urls.map((u, i) => [i ? ", " : "", h("a", { href: u, target: "_blank", rel: "noopener", text: hostOf(u) })]));
  }
  function hostOf(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return u; } }
  function dirChip(dir) {
    const d = (dir || "").toLowerCase();
    const icon = d === "rising" ? ICON.up : d === "declining" ? ICON.down : ICON.flat;
    return h("span", { class: "dir " + d }, svgIcon(icon), d ? d[0].toUpperCase() + d.slice(1) : "—");
  }
  function pips(n, max) { const el = h("span", { class: "pips", "aria-label": n + " of " + (max || 5) }); for (let i = 1; i <= (max || 5); i++) el.appendChild(h("i", { class: i <= n ? "on" : "" })); return el; }
  function panel(title, note, ...body) {
    return h("section", { class: "panel" }, h("div", { class: "panel-head" }, h("h3", { text: title }), note ? h("p", { text: note }) : null), body);
  }
  function section(title, intro, ...body) {
    return h("section", { class: "section" }, h("div", { class: "section-head" }, h("h2", { text: title }), intro ? h("p", { text: intro }) : null), body);
  }
  function viewHead(eyebrow, title, lede) {
    return h("header", { class: "view-head" }, h("div", { class: "eyebrow", text: eyebrow }), h("h1", { text: title }), lede ? h("p", { class: "lede", text: lede }) : null);
  }
  function chartBox() { return h("div", {}); }
  // draw after the node is in the document so it can be measured
  const afterMount = [];
  function later(fn) { afterMount.push(fn); }

  // ---------- data ----------
  const FILES = {
    meta: "data/meta.json", market: "data/market.json", games: "data/games.json", niches: "data/niches.json",
    playbook: "data/playbook.json", insights: "data/insights.json", concepts: "data/concepts.json", live: "data/live/steam.json",
  };
  let D = null;

  async function load() {
    if (window.__ATLAS_DATA__) return window.__ATLAS_DATA__;
    const out = {};
    await Promise.all(Object.entries(FILES).map(async ([k, url]) => {
      try {
        const r = await fetch(url, { cache: "no-cache" });
        if (!r.ok) throw new Error(r.status);
        out[k] = await r.json();
      } catch (e) {
        if (k !== "live") throw new Error("Could not load " + url + ". Serve the folder over http (see README) or open dist/cozy-market-atlas.html.");
        out[k] = null;
      }
    }));
    return out;
  }

  function prepare(raw) {
    const d = raw;
    const live = (d.live && d.live.games) || {};
    d.games = (d.games || []).map((g) => {
      const l = live[g.id];
      if (l && l.totalReviews) {
        return Object.assign({}, g, {
          steamReviews: l.totalReviews,
          steamPositivePct: l.positivePct,
          steamAppId: g.steamAppId || l.appId,
          live: true,
          liveFetchedAt: d.live.updatedAt,
          priceUSD: g.priceUSD == null && l.priceUSD != null ? l.priceUSD : g.priceUSD,
        });
      }
      return g;
    });
    d.niches.niches.forEach((n) => { n.opportunity = +((n.demand * (11 - n.supply)) / 10).toFixed(1); n.id = slug(n.name); });
    return d;
  }

  // ---------- concept scoring ----------
  function weights() {
    const def = {};
    D.concepts.scoring.factors.forEach((f) => (def[f.key] = f.weight));
    const saved = store.get("weights", null);
    return saved ? Object.assign(def, saved) : def;
  }
  function scoreConcept(c, w) {
    let tot = 0, sum = 0;
    D.concepts.scoring.factors.forEach((f) => { const s = c.scores[f.key]; if (s) { tot += s.score * w[f.key]; sum += w[f.key]; } });
    return sum ? +(tot / sum).toFixed(1) : 0;
  }
  function rankedConcepts() {
    const w = weights();
    return D.concepts.concepts.map((c) => ({ c, score: scoreConcept(c, w) })).sort((a, b) => b.score - a.score);
  }

  // ---------- views ----------
  const VIEWS = {
    overview: { label: "Overview", icon: "M3 12l9-8 9 8M5 10v10h14V10", render: renderOverview },
    trends: { label: "Trends", icon: "M3 17l6-6 4 4 8-8M15 7h6v6", render: renderTrends },
    gaps: { label: "Market gaps", icon: "M12 3v18M3 12h18M7 7h.01M17 17h.01", render: renderGaps },
    games: { label: "Games that work", icon: "M6 11h4M8 9v4M15 12h.01M18 10h.01M7 6h10a4 4 0 014 4v4a4 4 0 01-4 4H7a4 4 0 01-4-4v-4a4 4 0 014-4z", render: renderGames },
    monetization: { label: "Monetization", icon: "M12 2v20M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6", render: renderMonetization },
    playbook: { label: "Studio playbook", icon: "M4 4h12l4 4v12H4zM8 12h8M8 16h5", render: renderPlaybook },
    concepts: { label: "What to build", icon: "M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z", render: renderConcepts },
    sources: { label: "Sources & updates", icon: "M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5zM20 17v4H6.5", render: renderSources },
  };

  function renderOverview() {
    const I = D.insights, M = D.market;
    const top = rankedConcepts()[0];
    const niches = [...D.niches.niches].sort((a, b) => b.opportunity - a.opportunity);
    const rel = (M.steamCozyReleasesByYear || []).filter((r) => r.count != null);
    const relBox = chartBox();
    later(() => C.columns(relBox, rel.map((r) => ({ label: String(r.year), value: r.count, display: fmtInt(r.count), partial: r.partial, sub: r.note })), { title: "Steam cozy releases by year", labelValues: true }));

    return h("div", { class: "view" },
      viewHead("Cozy game market · data as of " + D.meta.asOf, I.headline, I.subhead),
      h("div", { class: "kpis" }, I.kpis.map((k) => h("div", { class: "kpi" },
        h("div", { class: "kpi-value", text: k.value }), h("div", { class: "kpi-label", text: k.label }),
        h("div", { class: "kpi-src" }, k.sourceUrl ? h("a", { href: k.sourceUrl, target: "_blank", rel: "noopener", text: k.source }) : k.source, " ", conf(k.confidence))))),
      h("div", { class: "hero-rec" },
        h("div", { class: "section" },
          h("div", { class: "eyebrow", text: "Recommended first game" }),
          h("h2", { text: top.c.name }),
          h("p", { class: "ink-2", text: top.c.oneLiner }),
          h("p", { text: top.c.pitch }),
          h("div", {}, h("a", { class: "btn primary", href: "#concepts", text: "See the full build & run plan" }))),
        h("div", { class: "section" },
          h("div", { class: "eyebrow", text: "Opportunity score" }),
          h("div", { class: "score-big", text: top.score.toFixed(1) }),
          h("p", { class: "muted", text: "Weighted across demand, competition, scope fit for a small team, monetization, marketability and trend momentum. Change the weights on the What to build page." }))),
      h("div", { class: "grid grid-2" },
        panel("Cozy-tagged releases on Steam", "Supply keeps rising; standing out gets harder each year", relBox,
          h("p", { class: "panel-note", text: M.steamCozyReleasesNote || "" })),
        panel("Biggest open lanes", "Demand × (inverse) supply, 0–10",
          h("ol", { class: "rank-list" }, niches.slice(0, 7).map((n, i) => h("li", {},
            h("a", { class: "rank-item", href: "#gaps", style: "text-decoration:none" },
              h("span", { class: "rank-n", text: i + 1 }), h("span", { text: n.name }),
              h("span", { class: "rank-bar" }, h("i", { style: `width:${n.opportunity * 10}%` })),
              h("span", { class: "rank-score", text: n.opportunity.toFixed(1) }))))))),
      section("What the data says", "The findings that should shape your studio's first moves.",
        h("div", { class: "grid grid-3" }, I.keyFindings.map((f) => h("article", { class: "card" },
          h("h3", { text: f.title }), h("p", { class: "ink-2", text: f.detail }),
          f.link ? h("a", { href: f.link, text: "Go deeper →", style: "margin-top:auto;font-size:.85rem" }) : null)))),
      section("Momentum right now", null,
        h("div", { class: "grid grid-2" }, [...M.trends].sort((a, b) => b.strength - a.strength).slice(0, 4).map(trendCard))),
    );
  }

  function trendCard(t) {
    return h("article", { class: "card" },
      h("div", { class: "card-top" }, h("h3", { text: t.name }), dirChip(t.direction)),
      h("div", { class: "meta" }, "Strength ", pips(t.strength)),
      h("p", { class: "ink-2", text: t.summary }),
      t.implicationForNewStudio ? h("p", {}, h("b", { text: "For you: " }), t.implicationForNewStudio) : null,
      t.exampleGames && t.exampleGames.length ? h("div", { class: "chips" }, t.exampleGames.map((g) => h("span", { class: "chip", text: g }))) : null);
  }

  function renderTrends() {
    const M = D.market;
    const trends = [...M.trends].sort((a, b) => b.strength - a.strength);
    const rel = (M.steamCozyReleasesByYear || []).filter((r) => r.count != null);
    const relBox = chartBox();
    later(() => C.columns(relBox, rel.map((r) => ({ label: String(r.year), value: r.count, display: fmtInt(r.count), partial: r.partial, sub: r.note })), { labelValues: true }));
    const plats = (M.platforms || []).filter((p) => p.sharePct != null);
    const platBox = chartBox();
    if (plats.length) later(() => C.barH(platBox, plats.map((p) => ({ label: p.platform, value: p.sharePct, display: p.sharePct + "%", sub: p.notes })), { max: 100 }));
    const filter = h("select", { id: "trend-dir" }, h("option", { value: "", text: "All directions" }), ["rising", "peaking", "declining"].map((d) => h("option", { value: d, text: d[0].toUpperCase() + d.slice(1) })));
    const list = h("div", { class: "grid grid-2" });
    const draw = () => {
      list.replaceChildren(...trends.filter((t) => !filter.value || t.direction === filter.value).map((t) => {
        const card = trendCard(t);
        if (t.evidence && t.evidence.length) card.appendChild(h("details", {}, h("summary", { text: "Evidence (" + t.evidence.length + ")", style: "cursor:pointer;font-size:.85rem;color:var(--accent)" }),
          h("ul", { style: "margin-top:8px;font-size:.88rem;color:var(--ink-2)" }, t.evidence.map((e) => h("li", { text: e }))), srcLinks(t.sources)));
        return card;
      }));
    };
    filter.addEventListener("change", draw);
    draw();
    const A = M.audience || { facts: [], wants: [], complaints: [] };
    return h("div", { class: "view" },
      viewHead("Trends", "Where cozy is heading", "What is rising, what has peaked, and who the players are. Each trend lists its evidence and what it means for a new studio."),
      h("div", { class: "grid grid-2" },
        panel("Cozy-tagged Steam releases per year", "Grey = partial year", relBox, h("p", { class: "panel-note", text: M.steamCozyReleasesNote || "" })),
        plats.length ? panel("Where cozy players play", "Share of cozy players / revenue by platform (see notes)", platBox) :
          panel("Platforms", null, h("ul", {}, (M.platforms || []).map((p) => h("li", {}, h("b", { text: p.platform + ": " }), p.notes))))),
      h("div", { class: "filters" }, h("div", { class: "field" }, h("label", { for: "trend-dir", text: "Direction" }), filter)),
      list,
      section("Who cozy players are", null,
        h("div", { class: "grid grid-3" },
          panel("Audience facts", null, h("ul", { class: "list-plain" }, A.facts.map((f) => h("li", { style: "font-size:.9rem" }, f.fact, " ", f.source ? h("a", { href: f.source, target: "_blank", rel: "noopener", text: "↗", "aria-label": "source" }) : null)))),
          panel("What they ask for", null, h("ul", { style: "font-size:.9rem" }, A.wants.map((w) => h("li", { text: w })))),
          panel("What they complain about", null, h("ul", { style: "font-size:.9rem" }, A.complaints.map((w) => h("li", { text: w })))))),
      M.flops && M.flops.length ? section("Cautionary tales", "Cozy games that underperformed, and why.",
        h("div", { class: "grid grid-3" }, M.flops.map((f) => h("article", { class: "card" }, h("h3", { text: f.game }), h("p", { class: "ink-2", text: f.whatHappened }), h("p", {}, h("b", { text: "Lesson: " }), f.lesson), srcLinks(f.source ? [f.source] : []))))) : null,
    );
  }

  function renderGaps() {
    const N = D.niches;
    const niches = [...N.niches].sort((a, b) => b.opportunity - a.opportunity);
    const topIds = new Set(niches.slice(0, 8).map((n) => n.id));
    const list = h("div", {});
    const box = chartBox();
    const openNiche = (id) => { const el = document.getElementById("niche-" + id); if (el) { el.open = true; el.scrollIntoView({ behavior: "smooth", block: "center" }); } };
    later(() => C.scatter(box, niches.map((n) => ({
      x: n.supply, y: n.demand, label: n.name, short: n.shortName, emphasis: topIds.has(n.id),
      tip: `Demand ${n.demand} · Supply ${n.supply} · Opportunity ${n.opportunity}`, sub: n.opportunityNote, onClick: () => openNiche(n.id),
    })), { xLabel: "Supply: how crowded (0 = empty, 10 = saturated)", yLabel: "Demand (0–10)", quadrant: { x: 5.5, y: 6.5, label: "Open lanes", labelBR: "Crowded, weak demand" } }));
    niches.forEach((n, i) => list.appendChild(h("details", { class: "expander", id: "niche-" + n.id },
      h("summary", {}, h("div", { class: "rank-item", style: "border:0" },
        h("span", { class: "rank-n", text: i + 1 }), h("span", {}, h("b", { text: n.name }), " ", h("span", { class: "muted", style: "font-size:.8rem", text: `demand ${n.demand} · supply ${n.supply}` })),
        h("span", { class: "rank-bar" }, h("i", { style: `width:${n.opportunity * 10}%` })), h("span", { class: "rank-score", text: n.opportunity.toFixed(1) }))),
      h("div", { class: "expander-body" },
        h("p", {}, h("b", { text: "Opportunity: " }), n.opportunityNote),
        h("p", {}, h("b", { text: "Demand evidence: " }), n.demandEvidence),
        h("p", {}, h("b", { text: "Supply evidence: " }), n.supplyEvidence),
        n.exampleHits && n.exampleHits.length ? h("div", { class: "chips" }, h("span", { class: "muted", text: "Hits:" }), n.exampleHits.map((g) => h("span", { class: "chip accent", text: g }))) : null,
        n.exampleMisses && n.exampleMisses.length ? h("div", { class: "chips" }, h("span", { class: "muted", text: "Misses:" }), n.exampleMisses.map((g) => h("span", { class: "chip", text: g }))) : null,
        srcLinks(n.sources)))));
    return h("div", { class: "view" },
      viewHead("Market gaps", "Where demand outruns supply", "Each cozy niche is scored 0–10 for player demand and for how crowded it is. The top-left corner is where a new studio has the best odds. Click a dot or a row for the evidence."),
      h("div", { class: "callout" }, h("b", { text: "How the opportunity score works" }),
        h("p", { class: "ink-2", text: "Opportunity = demand × (11 − supply) ÷ 10. A niche with demand 9 and supply 3 scores 7.2; demand 8 with supply 9 scores 1.6. Scores are research-based judgements, so read the evidence before betting on one." })),
      panel("Opportunity map", "Highlighted: the 8 highest-scoring niches", box),
      section("All niches, ranked", null, list),
      N.playerRequests && N.playerRequests.length ? section("What players say they wish existed", "Pulled from forums, Reddit and surveys.",
        h("div", { class: "grid grid-2" }, N.playerRequests.map((r) => h("article", { class: "card" }, h("h4", { text: "“" + r.request + "”" }), h("p", { class: "ink-2", style: "font-size:.9rem", text: r.evidence }), srcLinks(r.source ? [r.source] : []))))) : null,
    );
  }

  // ---------- games ----------
  function priceBucket(p) { if (p == null) return null; if (p === 0) return "Free-to-play"; if (p < 10) return "Under $10"; if (p < 20) return "$10–19.99"; if (p < 30) return "$20–29.99"; return "$30+"; }

  function renderGames() {
    const G = D.games;
    const byModel = countBy(G, (g) => g.businessModel);
    const bySub = countBy(G, (g) => g.subgenre);
    const order = ["Free-to-play", "Under $10", "$10–19.99", "$20–29.99", "$30+"];
    const byPrice = countBy(G, (g) => priceBucket(g.priceUSD));
    const modelBox = chartBox(), subBox = chartBox(), priceBox = chartBox(), bigBox = chartBox();
    later(() => C.barH(modelBox, byModel.map(([k, v]) => ({ label: k, value: v, sub: G.filter((g) => g.businessModel === k).map((g) => g.name).slice(0, 6).join(", ") }))));
    later(() => C.barH(subBox, bySub.map(([k, v]) => ({ label: k, value: v, sub: G.filter((g) => g.subgenre === k).map((g) => g.name).slice(0, 6).join(", ") }))));
    later(() => C.barH(priceBox, order.map((k) => ({ label: k, value: (byPrice.find((x) => x[0] === k) || [k, 0])[1] })).filter((r) => r.value)));
    const big = G.filter((g) => g.unitsOrPlayersMillions != null && /^Premium/.test(g.businessModel)).sort((a, b) => b.unitsOrPlayersMillions - a.unitsOrPlayersMillions).slice(0, 15);
    later(() => C.barH(bigBox, big.map((g) => ({ label: g.name, value: g.unitsOrPlayersMillions, display: fmtM(g.unitsOrPlayersMillions), sub: g.salesEstimate, onClick: () => openGame(g) }))));

    const q = h("input", { type: "search", id: "g-q", placeholder: "Search name, studio, tag…" });
    const sel = (id, label, vals) => h("div", { class: "field" }, h("label", { for: id, text: label }),
      h("select", { id }, h("option", { value: "", text: "All" }), vals.map((v) => h("option", { value: v, text: v }))));
    const fSub = sel("g-sub", "Subgenre", uniq(G.map((g) => g.subgenre)).sort());
    const fModel = sel("g-model", "Business model", uniq(G.map((g) => g.businessModel)).sort());
    const fPlat = sel("g-plat", "Platform", uniq(G.flatMap((g) => g.platforms || [])).sort());
    const count = h("span", { class: "result-count" });
    const tbody = h("tbody", {});
    let sortKey = store.get("gameSort", "unitsOrPlayersMillions"), sortDir = -1;
    const cols = [
      ["name", "Game"], ["subgenre", "Subgenre"], ["businessModel", "Model"], ["priceUSD", "Price", true],
      ["releaseYear", "Year", true], ["unitsOrPlayersMillions", "Units / players", true], ["steamReviews", "Steam reviews", true], ["steamPositivePct", "% positive", true],
    ];
    const thead = h("thead", {}, h("tr", {}, cols.map(([k, label, num]) => h("th", { class: num ? "num" : "", scope: "col" },
      h("button", { type: "button", text: label, onclick: () => { if (sortKey === k) sortDir *= -1; else { sortKey = k; sortDir = num ? -1 : 1; } store.set("gameSort", sortKey); draw(); } })))));
    function draw() {
      const term = q.value.trim().toLowerCase();
      const sv = fSub.querySelector("select").value, mv = fModel.querySelector("select").value, pv = fPlat.querySelector("select").value;
      const rows = G.filter((g) => (!sv || g.subgenre === sv) && (!mv || g.businessModel === mv) && (!pv || (g.platforms || []).includes(pv)) &&
        (!term || [g.name, g.studio, g.publisher, (g.tags || []).join(" "), g.subgenre].join(" ").toLowerCase().includes(term)))
        .sort((a, b) => { const x = a[sortKey], y = b[sortKey]; if (x == null) return 1; if (y == null) return -1; return (x > y ? 1 : x < y ? -1 : 0) * sortDir; });
      count.textContent = rows.length + " of " + G.length + " games";
      tbody.replaceChildren(...rows.map((g) => {
        const tr = h("tr", { class: "clickable", tabindex: "0", onclick: () => openGame(g), onkeydown: (e) => { if (e.key === "Enter") openGame(g); } },
          h("td", {}, h("div", { class: "game-name", text: g.name }), h("div", { class: "muted", style: "font-size:.8rem", text: g.studio })),
          h("td", { text: g.subgenre }), h("td", { text: g.businessModel }), h("td", { class: "num", text: fmtMoney(g.priceUSD) }),
          h("td", { class: "num", text: g.releaseYear || "—" }), h("td", { class: "num", text: fmtM(g.unitsOrPlayersMillions) }),
          h("td", { class: "num", text: fmtInt(g.steamReviews) }), h("td", { class: "num", text: g.steamPositivePct != null ? g.steamPositivePct + "%" : "—" }));
        return tr;
      }));
      if (!rows.length) tbody.appendChild(h("tr", {}, h("td", { colspan: cols.length, class: "empty", text: "No games match these filters. Clear a filter to see more." })));
    }
    [q, fSub, fModel, fPlat].forEach((el) => el.addEventListener("input", draw));
    draw();
    return h("div", { class: "view" },
      viewHead("Games that work", "The cozy hits, taken apart", "What each successful game is, how it makes money, how the studio runs it, and how it found its audience. Click any game for the full breakdown."),
      h("div", { class: "grid grid-3" },
        panel("How the hits make money", "Number of games per model", modelBox),
        panel("What kind of game", "Number of games per subgenre", subBox),
        panel("Price points", "Base price of the hits", priceBox)),
      panel("Best-selling premium cozy games", "Copies sold, millions, all platforms where known. Free-to-play player counts are left out because downloads aren't comparable to sales. Hover for each figure's basis.", bigBox),
      h("div", { class: "filters" }, h("div", { class: "field" }, h("label", { for: "g-q", text: "Search" }), q), fSub, fModel, fPlat, count),
      h("div", { class: "table-wrap" }, h("table", {}, thead, tbody)),
    );
  }
  function countBy(arr, fn) {
    const m = new Map();
    arr.forEach((x) => { const k = fn(x); if (k == null) return; m.set(k, (m.get(k) || 0) + 1); });
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }

  const drawer = () => document.getElementById("game-drawer");
  function openGame(g) {
    const d = drawer();
    const body = d.querySelector(".drawer-body");
    const facts = [
      [fmtMoney(g.priceUSD), "Base price"], [fmtM(g.unitsOrPlayersMillions), "Units / players"],
      [g.releaseYear || "—", "Released" + (g.earlyAccessYear ? " (EA " + g.earlyAccessYear + ")" : "")],
      [g.revenueEstimateUSDm != null ? "$" + g.revenueEstimateUSDm + "M" : "—", "Revenue estimate"],
      [g.steamReviews != null ? fmtInt(g.steamReviews) : "—", "Steam reviews" + (g.live ? " (live)" : "")],
      [g.steamPositivePct != null ? g.steamPositivePct + "%" : "—", "Steam positive"],
      [g.devTimeYears != null ? g.devTimeYears + " yrs" : "—", "Dev time"],
    ];
    const details = [["Sales", g.salesEstimate], ["Team", g.teamSize], ["Engine", g.engine], ["Data notes", g.dataNotes]].filter((x) => x[1]);
    const block = (title, content) => content ? h("section", { class: "section" }, h("h3", { text: title }), typeof content === "string" ? h("p", { class: "ink-2", text: content }) : content) : null;
    body.replaceChildren(
      h("div", { class: "section" },
        h("div", { class: "eyebrow", text: [g.subgenre, g.businessModel].filter(Boolean).join(" · ") }),
        h("h2", { text: g.name, style: "font-size:var(--step-3)" }),
        h("p", { class: "muted", text: [g.studio, g.publisher && g.publisher !== g.studio ? "published by " + g.publisher : null].filter(Boolean).join(", ") }),
        h("div", { class: "chips" }, (g.platforms || []).map((p) => h("span", { class: "chip accent", text: p })), (g.tags || []).map((t) => h("span", { class: "chip", text: t })))),
      h("div", { class: "facts" }, facts.map(([v, l]) => h("div", { class: "fact" }, h("b", { text: v }), h("span", { text: l })))),
      h("dl", { class: "kv" }, details.map(([k, v]) => [h("dt", { text: k }), h("dd", { text: v })])),
      block("Core loop", g.coreLoop),
      block("Why it works", g.whyItWorks && h("ul", { class: "ink-2" }, g.whyItWorks.map((x) => h("li", { text: x })))),
      block("How it makes money", g.monetization),
      block("How they run it", g.liveOps),
      block("How it found its audience", g.marketing),
      block("Funding", g.funding),
      block("Weak spots", g.weaknesses),
      g.lessonForNewStudio ? h("div", { class: "callout" }, h("b", { text: "Lesson for your studio" }), h("p", { text: g.lessonForNewStudio })) : null,
      h("div", { class: "section" }, conf(g.confidence), srcLinks(g.sources), g.live ? h("p", { class: "muted", style: "font-size:.8rem", text: "Steam review figures refreshed automatically on " + g.liveFetchedAt + "." }) : null),
    );
    if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
    d.scrollTop = 0;
  }

  function renderMonetization() {
    const I = D.insights, M = D.market, G = D.games;
    const models = countBy(G, (g) => g.businessModel).map(([k]) => {
      const gs = G.filter((g) => g.businessModel === k);
      return { k, n: gs.length, med: median(gs.map((g) => g.priceUSD)), ex: gs.sort((a, b) => (b.unitsOrPlayersMillions || 0) - (a.unitsOrPlayersMillions || 0)).slice(0, 4).map((g) => g.name).join(", ") };
    });
    const fitClass = (f) => (/recommend/i.test(f) ? "good" : /avoid/i.test(f) ? "crit" : "warn");
    return h("div", { class: "view" },
      viewHead("Monetization", "How cozy games make money", "The business models the hits use, what each costs you, and which ones suit a first game from a small studio."),
      h("div", { class: "grid grid-2" }, I.monetizationModels.map((m) => h("article", { class: "card" },
        h("div", { class: "card-top" }, h("h3", { text: m.model }), h("span", { class: "chip " + fitClass(m.fitForNewStudio), text: m.fitForNewStudio })),
        h("p", { class: "ink-2", text: m.howItWorks }),
        h("dl", { class: "kv" }, h("dt", { text: "Best for" }), h("dd", { text: m.bestFor }), h("dt", { text: "Typical price" }), h("dd", { text: m.typicalPrice }),
          h("dt", { text: "Examples" }), h("dd", { text: (m.examples || []).join(", ") })),
        h("div", { class: "grid grid-2", style: "gap:12px" },
          h("div", {}, h("h4", { text: "Upside" }), h("ul", { style: "font-size:.88rem;color:var(--ink-2)" }, (m.pros || []).map((x) => h("li", { text: x })))),
          h("div", {}, h("h4", { text: "Watch out" }), h("ul", { style: "font-size:.88rem;color:var(--ink-2)" }, (m.cons || []).map((x) => h("li", { text: x }))))),
        m.note ? h("p", { style: "font-size:.88rem" }, h("b", { text: "Our read: " }), m.note) : null))),
      section("Models used by the games in this atlas", "Computed from the games list, so it updates as you add games.",
        h("div", { class: "table-wrap" }, h("table", {},
          h("thead", {}, h("tr", {}, h("th", { text: "Model" }), h("th", { class: "num", text: "Games" }), h("th", { class: "num", text: "Median price" }), h("th", { text: "Biggest examples" }))),
          h("tbody", {}, models.map((m) => h("tr", {}, h("td", { text: m.k }), h("td", { class: "num", text: m.n }), h("td", { class: "num", text: fmtMoney(m.med) }), h("td", { class: "ink-2", text: m.ex }))))))),
      section("Business benchmarks", "Numbers to plan against: pricing, wishlists, conversion, revenue and platform cuts.",
        h("div", { class: "table-wrap" }, h("table", {},
          h("thead", {}, h("tr", {}, h("th", { text: "Metric" }), h("th", { text: "Value" }), h("th", { text: "Confidence" }), h("th", { text: "Source" }))),
          h("tbody", {}, (M.benchmarks || []).map((b) => h("tr", {}, h("td", { text: b.metric }), h("td", { text: b.value }), h("td", {}, conf(b.confidence)),
            h("td", {}, b.source ? h("a", { href: b.source, target: "_blank", rel: "noopener", text: hostOf(b.source) }) : "—"))))))),
      M.publishers && M.publishers.length ? section("Publishers active in cozy", "Who funds and publishes cozy games, and what they tend to offer.",
        h("div", { class: "table-wrap" }, h("table", {},
          h("thead", {}, h("tr", {}, h("th", { text: "Publisher" }), h("th", { text: "Focus" }), h("th", { text: "Cozy titles" }), h("th", { text: "Deal notes" }))),
          h("tbody", {}, M.publishers.map((p) => h("tr", {}, h("td", { class: "game-name" }, p.source ? h("a", { href: p.source, target: "_blank", rel: "noopener", text: p.name }) : p.name),
            h("td", { class: "ink-2", text: p.focus }), h("td", { class: "ink-2", text: (p.notableCozyTitles || []).join(", ") }), h("td", { class: "ink-2", text: p.dealNotes }))))))) : null,
    );
  }

  function renderPlaybook() {
    const P = D.playbook;
    const phases = uniq(P.playbook.map((s) => s.phase));
    let current = store.get("phase", phases[0]);
    if (!phases.includes(current)) current = phases[0];
    const strip = h("div", { class: "phase-strip", role: "group", "aria-label": "Phase" });
    const steps = h("div", { class: "grid grid-2" });
    const draw = () => {
      strip.replaceChildren(...phases.map((p, i) => h("button", { type: "button", class: "phase-btn", "aria-pressed": String(p === current), onclick: () => { current = p; store.set("phase", p); draw(); } },
        h("span", { class: "p-n", text: "Phase " + (i + 1) }), h("span", { class: "p-name", text: p }), h("span", { class: "muted", style: "font-size:.75rem", text: P.playbook.filter((s) => s.phase === p).length + " steps" }))));
      steps.replaceChildren(...P.playbook.filter((s) => s.phase === current).map((s) => h("article", { class: "card" },
        h("h3", { text: s.step }), h("p", { class: "ink-2", text: s.detail }),
        s.benchmark ? h("p", { style: "font-size:.88rem" }, h("b", { text: "Benchmark: " }), s.benchmark) : null, srcLinks(s.source ? [s.source] : []))));
    };
    draw();
    return h("div", { class: "view" },
      viewHead("Studio playbook", "How to run a cozy studio", "The operating steps from first prototype to post-launch updates, in order, with the benchmarks successful cozy teams hit along the way."),
      strip, steps,
      section("Funding your first game", null, h("div", { class: "table-wrap" }, h("table", {},
        h("thead", {}, h("tr", {}, h("th", { text: "Option" }), h("th", { text: "Typical terms" }), h("th", { text: "Trade-offs" }))),
        h("tbody", {}, P.funding.map((f) => h("tr", {}, h("td", { class: "game-name" }, f.source ? h("a", { href: f.source, target: "_blank", rel: "noopener", text: f.option }) : f.option), h("td", { class: "ink-2", text: f.typicalTerms }), h("td", { class: "ink-2", text: f.prosCons }))))))),
      h("div", { class: "grid grid-2" },
        panel("Budget ranges", null, h("ul", { class: "list-plain" }, P.budgets.map((b) => h("li", {}, h("b", { text: b.scope }), h("div", { class: "mono", style: "color:var(--accent)", text: b.budgetRangeUSD }), h("div", { class: "muted", style: "font-size:.85rem", text: b.note }))))),
        panel("Localization priorities", "In order of payoff", h("ol", { style: "font-size:.9rem" }, P.localization.map((l) => h("li", {}, h("b", { text: l.language }), " — ", h("span", { class: "ink-2", text: l.whyItMatters })))))),
      section("How cozy studios fail", "Avoid these.", h("div", { class: "grid grid-3" }, P.failureModes.map((f) => h("article", { class: "card" }, h("h4", { text: f.mode }), h("p", { class: "ink-2", style: "font-size:.9rem", text: f.detail }), srcLinks(f.source ? [f.source] : []))))),
    );
  }

  // ---------- concepts ----------
  function renderConcepts() {
    const S = D.concepts.scoring;
    const w = weights();
    const wrap = h("div", { class: "view" });
    const tabs = h("div", { class: "concept-tabs", role: "tablist" });
    const detail = h("div", { class: "section" });
    let selected = store.get("concept", null);

    const sliders = h("div", { class: "weights" }, S.factors.map((f) => {
      const out = h("b", { text: w[f.key] });
      const input = h("input", { type: "range", min: "0", max: "5", step: "1", value: String(w[f.key]), id: "w-" + f.key, "aria-label": f.label + " weight" });
      input.addEventListener("input", () => { w[f.key] = +input.value; out.textContent = input.value; store.set("weights", w); drawTabs(); });
      return h("div", { class: "weight", title: f.description }, h("div", { class: "weight-top" }, h("label", { for: "w-" + f.key, text: f.label }), out), input);
    }));
    const reset = h("button", { class: "btn", type: "button", text: "Reset weights", onclick: () => { store.set("weights", null); D.concepts.scoring.factors.forEach((f) => { w[f.key] = f.weight; const el = document.getElementById("w-" + f.key); if (el) { el.value = f.weight; el.previousSibling.lastChild.textContent = f.weight; } }); drawTabs(); } });

    function drawTabs() {
      const ranked = D.concepts.concepts.map((c) => ({ c, score: scoreConcept(c, w) })).sort((a, b) => b.score - a.score);
      if (!selected || !ranked.find((r) => r.c.id === selected)) selected = ranked[0].c.id;
      tabs.replaceChildren(...ranked.map((r, i) => h("button", { type: "button", role: "tab", class: "concept-tab", "aria-selected": String(r.c.id === selected), onclick: () => { selected = r.c.id; store.set("concept", selected); drawTabs(); } },
        h("span", { class: "t-score", text: "#" + (i + 1) + " · " + r.score.toFixed(1) + " / 10" }), h("span", { class: "t-name", text: r.c.name }), h("span", { class: "muted", style: "font-size:.78rem", text: r.c.niche }))));
      const cur = ranked.find((r) => r.c.id === selected);
      detail.replaceChildren(conceptDetail(cur.c, cur.score, ranked.indexOf(cur) + 1));
      afterMount.splice(0).forEach((fn) => fn());
    }

    append(wrap, [
      viewHead("What to build", "Game concepts ranked by the data", D.concepts.intro),
      h("div", { class: "callout warn" }, h("b", { text: "Read this first" }), h("p", { class: "ink-2", text: D.concepts.caveat })),
      panel("Scoring weights", "Drag to match what matters to you. The ranking updates live and is saved in this browser.", sliders, h("div", {}, reset)),
      tabs, detail,
    ]);
    later(drawTabs);
    return wrap;
  }

  function conceptDetail(c, score, rank) {
    const S = D.concepts.scoring;
    const factorBox = chartBox(), ganttBox = chartBox();
    later(() => C.barH(factorBox, S.factors.map((f) => ({ label: f.label, value: c.scores[f.key].score, display: c.scores[f.key].score + "/10", sub: c.scores[f.key].why })), { max: 10 }));
    later(() => C.gantt(ganttBox, c.milestones.map((m) => ({ name: m.name, start: m.startMonth, end: m.endMonth, kind: m.kind, sub: m.deliverable + (m.gate ? " · Gate: " + m.gate : "") }))));
    const list = (arr) => h("ul", { class: "ink-2", style: "font-size:.92rem" }, (arr || []).map((x) => h("li", { text: x })));
    return h("div", { class: "section", style: "gap:20px" },
      h("div", { class: "hero-rec" },
        h("div", { class: "section" },
          h("div", { class: "eyebrow", text: "Concept #" + rank + " · " + c.niche }),
          h("h2", { text: c.name }), h("p", { class: "ink-2", style: "font-size:var(--step-1)", text: c.oneLiner }), h("p", { text: c.pitch }),
          h("div", { class: "chips" }, (c.genreTags || []).map((t) => h("span", { class: "chip accent", text: t }))),
          h("dl", { class: "kv" }, h("dt", { text: "Audience" }), h("dd", { text: c.audience }), h("dt", { text: "Comparables" }), h("dd", { text: (c.comps || []).join(", ") }),
            h("dt", { text: "Session" }), h("dd", { text: c.sessionLength }), h("dt", { text: "Art direction" }), h("dd", { text: c.artDirection }))),
        h("div", { class: "section" }, h("div", { class: "eyebrow", text: "Score" }), h("div", { class: "score-big", text: score.toFixed(1) }), factorBox,
          h("p", { class: "panel-note", text: "Hover a bar for the reasoning behind each factor." }))),
      h("div", { class: "grid grid-2" },
        panel("Why now", null, list(c.whyNow)),
        panel("Design pillars", null, list(c.pillars))),
      panel("Core loop", "What the player does, minute to minute",
        h("div", { class: "loop" }, c.coreLoop.map((s, i) => [i ? h("span", { class: "loop-arrow", text: "→" }) : null, h("span", { class: "loop-step", text: s })]), h("span", { class: "loop-arrow", text: "↺" }))),
      h("div", { class: "grid grid-3" },
        panel("Demo / first playable", null, list(c.features.mvp)),
        panel("At launch", null, list(c.features.launch)),
        panel("After launch", null, list(c.features.postLaunch))),
      h("div", { class: "grid grid-2" },
        panel("Platforms & price", null,
          h("dl", { class: "kv" }, h("dt", { text: "Launch on" }), h("dd", { text: c.platforms.launch.join(", ") }), h("dt", { text: "Then" }), h("dd", { text: c.platforms.later.join(", ") }),
            h("dt", { text: "Price" }), h("dd", { text: c.pricing.base }), h("dt", { text: "Model" }), h("dd", { text: c.pricing.model })),
          list(c.pricing.details)),
        panel("Monetization plan", null, list(c.monetizationPlan))),
      h("div", { class: "grid grid-2" },
        panel("Team", null, h("table", {}, h("tbody", {}, c.team.map((t) => h("tr", {}, h("td", { class: "num", text: t.count + "×" }), h("td", {}, h("b", { text: t.role }), h("div", { class: "muted", style: "font-size:.82rem", text: t.note }))))))),
        panel("Budget & timeline", null,
          h("div", { class: "kpis" },
            h("div", { class: "kpi" }, h("div", { class: "kpi-value", text: c.budgetUSD.label }), h("div", { class: "kpi-label", text: "Budget to 1.0" })),
            h("div", { class: "kpi" }, h("div", { class: "kpi-value", text: c.devMonths + " mo" }), h("div", { class: "kpi-label", text: "To 1.0 launch" }))),
          h("p", { class: "ink-2", style: "font-size:.9rem", text: c.budgetUSD.note }))),
      panel("Production roadmap", "Green = build, violet = launch beats, amber = live ops. Hover for deliverables and go/no-go gates.", ganttBox,
        h("div", { class: "legend" }, h("span", {}, h("i", { style: "background:var(--series-1)" }), "Build"), h("span", {}, h("i", { style: "background:var(--series-2)" }), "Launch"), h("span", {}, h("i", { style: "background:var(--series-3)" }), "Live ops"))),
      h("div", { class: "grid grid-2" },
        panel("Marketing plan", null, h("div", { class: "timeline" }, c.marketingPlan.map((m) => h("div", { class: "tl-row" }, h("div", { class: "tl-when", text: m.when }), h("div", { class: "ink-2", style: "font-size:.92rem", text: m.action }))))),
        panel("How to run it after launch", null, h("div", { class: "timeline" }, c.liveOps.map((m) => h("div", { class: "tl-row" }, h("div", { class: "tl-when", text: m.when }), h("div", { class: "ink-2", style: "font-size:.92rem", text: m.what })))))),
      h("div", { class: "grid grid-2" },
        panel("Targets to hit", "Validation gates along the way", h("div", { class: "table-wrap", style: "border:0" }, h("table", {}, h("tbody", {}, c.kpis.map((k) => h("tr", {}, h("td", {}, h("b", { text: k.metric }), h("div", { class: "muted", style: "font-size:.8rem", text: k.why })), h("td", { class: "mono", style: "color:var(--accent);white-space:nowrap", text: k.target }))))))),
        panel("Kill or pivot if…", "Decide these before you start, not after", list(c.killCriteria))),
      panel("Risks & mitigations", null, h("div", { class: "table-wrap", style: "border:0" }, h("table", {}, h("thead", {}, h("tr", {}, h("th", { text: "Risk" }), h("th", { text: "Mitigation" }))),
        h("tbody", {}, c.risks.map((r) => h("tr", {}, h("td", { text: r.risk }), h("td", { class: "ink-2", text: r.mitigation }))))))),
      panel("Revenue scenarios", c.revenueAssumptions, h("div", { class: "table-wrap", style: "border:0" }, h("table", {},
        h("thead", {}, h("tr", {}, h("th", { text: "Scenario" }), h("th", { class: "num", text: "Volume (yr 1)" }), h("th", { class: "num", text: "Net to studio" }), h("th", { text: "What it looks like" }))),
        h("tbody", {}, c.revenueScenarios.map((r) => h("tr", {}, h("td", { class: "game-name", text: r.scenario }), h("td", { class: "num", text: fmtInt(r.units) }), h("td", { class: "num", text: "$" + fmtInt(r.netUSD) }), h("td", { class: "ink-2", text: r.note }))))))),
    );
  }

  function renderSources() {
    const all = new Map();
    const add = (url, where) => { if (!url) return; if (!all.has(url)) all.set(url, new Set()); all.get(url).add(where); };
    const M = D.market;
    (M.marketSize || []).forEach((x) => add(x.source, "Market size"));
    (M.trends || []).forEach((t) => (t.sources || []).forEach((u) => add(u, "Trend: " + t.name)));
    (M.benchmarks || []).forEach((b) => add(b.source, "Benchmarks"));
    (M.audience?.facts || []).forEach((f) => add(f.source, "Audience"));
    (M.platforms || []).forEach((p) => add(p.source, "Platforms"));
    (M.publishers || []).forEach((p) => add(p.source, "Publishers"));
    (M.steamCozyReleasesByYear || []).forEach((r) => add(r.source, "Steam releases by year"));
    D.games.forEach((g) => (g.sources || []).forEach((u) => add(u, g.name)));
    D.niches.niches.forEach((n) => (n.sources || []).forEach((u) => add(u, "Niche: " + n.name)));
    (D.niches.playerRequests || []).forEach((r) => add(r.source, "Player requests"));
    ["playbook", "funding", "localization", "budgets", "failureModes"].forEach((k) => (D.playbook[k] || []).forEach((x) => add(x.source, "Playbook")));
    const q = h("input", { type: "search", id: "src-q", placeholder: "Filter by site or topic…" });
    const tbody = h("tbody", {});
    const rows = [...all.entries()].sort((a, b) => hostOf(a[0]).localeCompare(hostOf(b[0])));
    const draw = () => {
      const t = q.value.toLowerCase();
      tbody.replaceChildren(...rows.filter(([u, w]) => !t || (u + " " + [...w].join(" ")).toLowerCase().includes(t)).map(([u, w]) =>
        h("tr", {}, h("td", { style: "word-break:break-all" }, h("a", { href: u, target: "_blank", rel: "noopener", text: u })), h("td", { class: "ink-2", text: [...w].join(", ") }))));
    };
    q.addEventListener("input", draw);
    draw();
    return h("div", { class: "view" },
      viewHead("Sources & updates", "Where every number comes from", D.meta.methodology),
      h("div", { class: "grid grid-2" },
        panel("Keeping the atlas current", null, list2(D.meta.howToUpdate)),
        panel("Change log", null, h("div", { class: "timeline" }, D.meta.changelog.map((c) => h("div", { class: "tl-row" }, h("div", { class: "tl-when", text: c.date }), h("div", { class: "ink-2", text: c.note })))),
          D.live ? h("p", { class: "muted", style: "font-size:.85rem", text: "Live Steam figures last refreshed: " + (D.live.updatedAt || "never") }) : null)),
      h("div", { class: "callout" }, h("b", { text: "Confidence levels" }), h("p", { class: "ink-2", text: "High: official or first-party figure. Medium: reputable estimate (GameDiscoverCo, Gamalytic, VG Insights) or a figure from an interview. Low: a single secondary source or a derived estimate. Treat low-confidence numbers as direction, not fact." })),
      section("All sources (" + rows.length + ")", null, h("div", { class: "filters" }, h("div", { class: "field" }, h("label", { for: "src-q", text: "Filter" }), q)),
        h("div", { class: "table-wrap" }, h("table", {}, h("thead", {}, h("tr", {}, h("th", { text: "URL" }), h("th", { text: "Used for" }))), tbody))),
    );
  }
  function list2(arr) { return h("ol", { class: "ink-2", style: "font-size:.92rem" }, (arr || []).map((x) => h("li", { text: x }))); }

  // ---------- shell ----------
  function route() {
    const id = (location.hash || "#overview").slice(1);
    const key = VIEWS[id] ? id : "overview";
    document.querySelectorAll(".nav a").forEach((a) => a.setAttribute("aria-current", a.dataset.view === key ? "page" : "false"));
    const main = document.getElementById("main");
    afterMount.length = 0;
    C.hideTip();
    let node;
    try { node = VIEWS[key].render(); } catch (e) { console.error(e); node = h("div", { class: "error-box", text: "This view could not render: " + e.message + ". Check the matching data file for a missing field." }); }
    main.replaceChildren(node);
    afterMount.splice(0).forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    document.title = VIEWS[key].label + " · " + (D.meta.title || "Cozy Market Atlas");
    main.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function buildNav() {
    const nav = document.getElementById("nav");
    nav.replaceChildren(...Object.entries(VIEWS).map(([k, v]) => h("a", { href: "#" + k, "data-view": k }, svgIcon(v.icon), v.label)));
    document.getElementById("asof").textContent = "Data as of " + D.meta.asOf;
  }

  function themeToggle() {
    const btn = document.getElementById("theme-btn");
    const root = document.documentElement;
    const saved = store.get("theme", null);
    if (saved) root.setAttribute("data-theme", saved);
    const label = () => { const t = root.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"); btn.textContent = t === "dark" ? "Light mode" : "Dark mode"; };
    btn.addEventListener("click", () => {
      const cur = root.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      const next = cur === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next); store.set("theme", next); label();
    });
    label();
  }

  async function start() {
    const main = document.getElementById("main");
    try {
      D = prepare(await load());
    } catch (e) {
      main.replaceChildren(h("div", { class: "error-box", text: e.message }));
      return;
    }
    buildNav();
    themeToggle();
    document.getElementById("game-drawer").querySelector(".drawer-x").addEventListener("click", () => drawer().close());
    drawer().addEventListener("click", (e) => { if (e.target === drawer()) drawer().close(); });
    window.addEventListener("hashchange", route);
    route();
  }
  start();
})();
