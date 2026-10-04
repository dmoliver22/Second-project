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
    warn: "M12 3l9.5 17h-19zM12 10v4M12 17h.01",
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
    gotomarket: "data/gotomarket.json", verification: "data/verification.json", culture: "data/culture.json",
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
        if (!["live", "verification"].includes(k)) throw new Error("Could not load " + url + ". Serve the folder over http (see README) or open dist/cozy-market-atlas.html.");
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
    const saved = store.get("weights2", null);
    return saved ? Object.assign(def, saved) : def;
  }
  function activePreset(w) {
    const ps = D.concepts.scoring.presets || [];
    return ps.find((p) => Object.keys(p.weights).every((k) => (w[k] || 0) === p.weights[k]));
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
    overview: { label: "Briefing", icon: "M3 12l9-8 9 8M5 10v10h14V10", render: renderOverview },
    ask: { label: "Ask the atlas", icon: "M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12zM8 11h.01M12 11h.01M16 11h.01", render: () => window.AtlasAsk.render() },
    concepts: { label: "What to build", icon: "M12 2l3 7h7l-5.5 4.5L18 21l-6-4-6 4 1.5-7.5L2 9h7z", render: renderConcepts },
    launch: { label: "Launch & grow", icon: "M5 19l4-4M14 4l6 6-8 8-6-6zM14 4l-2-2M20 10l2 2M3 21l2-2", render: renderLaunch },
    spread: { label: "What spreads", icon: "M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM18 22a3 3 0 100-6 3 3 0 000 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4", render: renderSpread },
    culture: { label: "Culture signals", icon: "M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20", render: renderCulture },
    outliers: { label: "Outliers", icon: "M12 3v4M12 17v4M3 12h4M17 12h4M12 12h.01M7 7l2 2M15 15l2 2M17 7l-2 2M9 15l-2 2", render: renderOutliers },
    gaps: { label: "Market gaps", icon: "M12 3v18M3 12h18M7 7h.01M17 17h.01", render: renderGaps },
    trends: { label: "Trends", icon: "M3 17l6-6 4 4 8-8M15 7h6v6", render: renderTrends },
    games: { label: "Games that work", icon: "M6 11h4M8 9v4M15 12h.01M18 10h.01M7 6h10a4 4 0 014 4v4a4 4 0 01-4 4H7a4 4 0 01-4-4v-4a4 4 0 014-4z", render: renderGames },
    monetization: { label: "Monetization", icon: "M12 2v20M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6", render: renderMonetization },
    playbook: { label: "Studio playbook", icon: "M4 4h12l4 4v12H4zM8 12h8M8 16h5", render: renderPlaybook },
    sources: { label: "Sources & updates", icon: "M4 19.5A2.5 2.5 0 016.5 17H20V3H6.5A2.5 2.5 0 004 5.5zM20 17v4H6.5", render: renderSources },
  };

  // "So what" box at the top of each analysis page
  function takeaway(key) {
    const t = (D.insights.viewTakeaways || {})[key];
    if (!t) return null;
    return h("div", { class: "takeaway" }, h("div", { class: "eyebrow", text: "So what" }), h("p", { text: t.text }),
      t.link ? h("a", { href: t.link, text: (t.linkText || "Go deeper") + " →" }) : null);
  }
  // Opens the chat with a question; hidden where the page can't reach Claude
  function askBtn(label, question) {
    if (!window.AtlasAsk || !window.AtlasAsk.available()) return null;
    return h("button", { type: "button", class: "ask-btn", onclick: (e) => { e.stopPropagation(); const d = drawer(); if (d.open) d.close(); window.AtlasAsk.ask(question); } },
      svgIcon(VIEWS.ask.icon), label);
  }
  function evidenceChip(ev) {
    if (ev.game) {
      const g = D.games.find((x) => x.id === ev.game);
      return h("button", { type: "button", class: "chip ev", text: ev.text, onclick: () => g && openGame(g) });
    }
    return h("a", { class: "chip ev", href: ev.link || "#overview", text: ev.text });
  }
  function goConcept(id) { store.set("concept", id); location.hash = "#concepts"; }
  const OUTLIER = {
    Overperformer: { cls: "good", icon: ICON.up },
    Cautionary: { cls: "crit", icon: ICON.down },
    Surprise: { cls: "warn", icon: ICON.flat },
  };
  function outlierCard(o, compact) {
    const g = D.games.find((x) => x.id === o.gameId);
    const t = OUTLIER[o.type] || OUTLIER.Surprise;
    const conceptName = (id) => (D.concepts.concepts.find((c) => c.id === id) || {}).name;
    return h("article", { class: "card outlier" },
      h("div", { class: "card-top" },
        g ? h("button", { type: "button", class: "link-btn", onclick: () => openGame(g) }, h("h3", { text: o.name })) : h("h3", { text: o.name }),
        h("span", { class: "dir " + (t.cls === "good" ? "rising" : t.cls === "crit" ? "declining" : "peaking") }, svgIcon(t.icon), o.type)),
      h("div", { class: "mono outlier-stat", text: o.stat }),
      h("p", { class: "ink-2", text: o.whatHappened }),
      h("p", {}, h("b", { text: "Lesson: " }), o.lesson),
      compact ? null : h("p", {}, h("b", { text: o.type === "Cautionary" ? "Do instead: " : "Steal this: " }), o.stealThis),
      compact ? null : h("div", { class: "chips" }, h("span", { class: "muted", style: "font-size:.8rem", text: "Applies to:" }),
        (o.appliesTo || []).filter(conceptName).map((id) => h("button", { type: "button", class: "chip accent", text: conceptName(id), onclick: () => goConcept(id) }))),
      compact ? null : askBtn("Ask how to apply this", `What exactly should my studio take from ${o.name}'s story (${o.stat})? Be specific to my plan.`));
  }

  // ---------- concept helpers ----------
  function rankedSplit(w) {
    w = w || weights();
    const all = D.concepts.concepts.map((c) => ({ c, score: scoreConcept(c, w) })).sort((a, b) => b.score - a.score);
    return { all, main: all.filter((r) => r.c.track !== "side").slice(0, 5), side: all.filter((r) => r.c.track === "side") };
  }
  function specRows(c) {
    const sp = c.spec || {};
    return [
      ["Genre", sp.genre], ["Players", sp.players], ["Setting", sp.setting], ["What you do", sp.coreVerb], ["Look", sp.look],
      ["Session", c.sessionLength], ["Price", c.pricing.base], ["Business model", c.pricing.model], ["Launch platforms", c.platforms.launch.join(", ")],
      ["Team", sp.team], ["Time to launch", c.devMonths < 3 ? "About " + Math.round(c.devMonths * 4.3) + " weeks" : c.devMonths + " months"], ["Budget", c.budgetUSD.label], ["Audience", sp.audience],
      ["Closest games", (c.comps || []).slice(0, 3).join(", ")], ["Stands out by", sp.differentiator],
    ].filter((r) => r[1]);
  }
  const STRENGTH = {
    strong: { label: "Strong signal", n: 3 }, medium: { label: "Medium signal", n: 2 }, supporting: { label: "Supporting", n: 1 }, caution: { label: "Watch out", n: 0 },
  };
  let pendingNiche = null;
  function refAction(ref) {
    if (!ref) return null;
    if (ref.game) { const g = D.games.find((x) => x.id === ref.game); return g ? h("button", { type: "button", class: "chip ev", text: "Game: " + g.name, onclick: () => openGame(g) }) : null; }
    if (ref.niche) { const n = D.niches.niches.find((x) => x.name === ref.niche); return n ? h("button", { type: "button", class: "chip ev", text: "Niche: " + (n.shortName || n.name), onclick: () => { pendingNiche = n.id; location.hash = "#gaps"; } }) : null; }
    if (ref.link) return h("a", { class: "chip ev", href: ref.link, text: "See " + (VIEWS[ref.link.slice(1)] || { label: "more" }).label });
    return null;
  }
  function driverList(drivers, opts) {
    opts = opts || {};
    const list = (drivers || []).filter((d) => !opts.noCaution || d.strength !== "caution").slice(0, opts.limit || 99);
    return h("ul", { class: "drivers" }, list.map((d) => {
      const st = STRENGTH[d.strength] || STRENGTH.supporting;
      return h("li", { class: "driver " + d.strength },
        d.strength === "caution" ? h("span", { class: "dir peaking", title: st.label }, svgIcon(ICON.warn), "Watch out") : h("span", { class: "strength", title: st.label }, pips(st.n, 3)),
        h("div", { class: "driver-body" }, h("b", { text: d.signal }), opts.brief ? null : h("p", { class: "ink-2", text: d.detail }), opts.brief ? null : refAction(d.ref)));
    }));
  }
  function miniBar(v, max) { return h("span", { class: "mini-bar", "aria-hidden": "true" }, h("i", { style: `width:${(v / (max || 10)) * 100}%` })); }

  // ---------- look & feel ----------
  function swatches(look, small) {
    return h("div", { class: "swatches" + (small ? " small" : ""), role: "list", "aria-label": "Palette" }, (look.palette || []).map((c) =>
      h("div", { class: "swatch", role: "listitem", title: c.name + " " + c.hex }, h("i", { style: "background:" + c.hex }), small ? null : h("span", {}, h("b", { text: c.name }), h("code", { text: c.hex })))));
  }
  function artBrief(c) {
    const L = c.look;
    return [
      "ART BRIEF: " + c.name, "", "Hook: " + c.hook, "", "Imagine: " + L.vibe, "",
      "Palette: " + L.palette.map((x) => x.name + " " + x.hex).join(", "),
      "References (in spirit, never copied): " + L.references.join("; "), "",
      "Shapes: " + L.shapes, "Characters: " + L.characters, "Camera: " + L.camera, "Lighting: " + L.lighting, "Textures: " + L.textures,
      "Interface: " + L.ui, "Type: " + L.type, "Motion: " + L.motion, "Sound: " + L.sound, "",
      "Key screenshot: " + L.screenshot, "The 5-second clip: " + L.clip, "",
      "Avoid: " + L.avoid.join("; "), "",
      "All art must be original and hand-made or hand-directed. No AI-generated images, and no imitation of any artist's or brand's style.",
    ].join("\n");
  }
  function lookPanel(c) {
    const L = c.look;
    if (!L) return null;
    const brief = artBrief(c);
    const ta = h("textarea", { class: "brief", readonly: true, rows: "12", "aria-label": "Art brief" });
    ta.value = brief;
    const status = h("span", { class: "muted", style: "font-size:.8rem", role: "status" });
    const copy = h("button", { type: "button", class: "btn", text: "Copy brief", onclick: async () => {
      try { await navigator.clipboard.writeText(brief); status.textContent = "Copied"; }
      catch (e) { ta.focus(); ta.select(); status.textContent = "Selected; press Ctrl/Cmd+C to copy"; }
    } });
    const rows = [["Shapes", L.shapes], ["Characters", L.characters], ["Camera", L.camera], ["Lighting", L.lighting], ["Textures", L.textures], ["Interface", L.ui], ["Type", L.type], ["Motion", L.motion], ["Sound", L.sound]];
    return h("section", { class: "panel look" },
      h("div", { class: "panel-head" }, h("h3", { text: "Look & feel" }), h("p", { text: "How the game looks, sounds and moves" })),
      h("div", { class: "look-top" },
        h("div", { class: "section" },
          h("p", { class: "look-vibe", text: L.vibe }),
          L.layout ? h("div", { class: "look-layout" }, h("div", { class: "eyebrow", text: "On screen" }), h("p", { text: L.layout })) : null,
          swatches(L),
          h("div", { class: "chips" }, h("span", { class: "muted", style: "font-size:.8rem", text: "Looks like (in spirit):" }), L.references.map((x) => h("span", { class: "chip", text: x }))),
          h("div", { class: "grid grid-2", style: "gap:10px" },
            h("div", { class: "money-shot" }, h("div", { class: "eyebrow", text: "The screenshot" }), h("p", { text: L.screenshot })),
            h("div", { class: "money-shot" }, h("div", { class: "eyebrow", text: "The 5-second clip" }), h("p", { text: L.clip }))))),
      h("dl", { class: "kv look-kv" }, rows.map(([k, v]) => [h("dt", { text: k }), h("dd", { text: v })])),
      h("div", { class: "look-avoid" }, h("span", { class: "dir peaking" }, svgIcon(ICON.warn), "Avoid:"), h("ul", {}, L.avoid.map((x) => h("li", { text: x })))),
      h("details", { class: "brief-wrap" }, h("summary", { text: "Art brief for your illustrator", style: "cursor:pointer;color:var(--accent);font-weight:600" }),
        h("div", { class: "section", style: "margin-top:8px" }, ta, h("div", { class: "chips" }, copy, status))));
  }

  function suggestionRow(r, i) {
    const c = r.c, sp = c.spec || {};
    const caution = (c.drivers || []).find((d) => d.strength === "caution");
    return h("article", { class: "sugg" + (i === 0 ? " top" : "") },
      h("div", { class: "sugg-rank" }, h("span", { class: "eyebrow", text: i === 0 ? "#1 · Top pick" : "#" + (i + 1) }),
        h("span", { class: "sugg-score", text: r.score.toFixed(1) }), miniBar(r.score)),
      h("div", { class: "sugg-main" },
        h("h3", { text: c.name }), h("p", { class: "ink-2", text: c.hook }),
        c.look ? h("div", { class: "look-line" }, swatches(c.look, true), h("span", { text: c.look.short })) : null,
        h("div", { class: "chips" }, [sp.genre, sp.players, sp.price, (c.devMonths < 3 ? Math.round(c.devMonths * 4.3) + " weeks" : c.devMonths + " months"), c.budgetUSD.label].map((t) => h("span", { class: "chip", text: t })))),
      h("div", { class: "sugg-drivers" }, h("div", { class: "eyebrow", text: "Driven by" }), driverList(c.drivers, { noCaution: true, limit: 3, brief: true }),
        caution ? h("p", { class: "sugg-caution" }, h("span", { class: "dir peaking" }, svgIcon(ICON.warn), "Watch out:"), " ", caution.signal) : null),
      h("div", { class: "sugg-actions" }, h("button", { type: "button", class: "btn primary", text: "See the plan", onclick: () => goConcept(c.id) }),
        askBtn("Pressure-test", `Pressure-test ${c.name} for my studio: the biggest risks, what to validate first, and what you would change.`)));
  }

  function compareTable(main, onPick) {
    const S = D.concepts.scoring;
    const best = {};
    S.factors.forEach((f) => (best[f.key] = Math.max(...main.map((r) => r.c.scores[f.key].score))));
    const topScore = Math.max(...main.map((r) => r.score));
    const specLabels = specRows(main[0].c).map((x) => x[0]);
    const row = (label, cells, cls) => h("tr", { class: cls || "" }, h("th", { scope: "row", text: label }), cells);
    return h("div", { class: "table-wrap compare-wrap" }, h("table", { class: "compare" },
      h("thead", {}, h("tr", {}, h("th", { text: "" }), main.map((r, i) => h("th", { scope: "col" },
        h("button", { type: "button", class: "compare-head", onclick: () => onPick(r.c.id) },
          h("span", { class: "eyebrow", text: "#" + (i + 1) }), h("span", { class: "compare-name", text: r.c.name }), h("span", { class: "muted", style: "font-size:.75rem", text: "See plan ↓" })))))),
      h("tbody", {},
        row("Hook", main.map((r) => h("td", { class: "ink-2", text: r.c.hook }))),
        row("Look", main.map((r) => h("td", {}, h("div", { class: "section", style: "gap:6px" }, r.c.look ? swatches(r.c.look, true) : null, r.c.look ? h("span", { class: "ink-2", style: "font-size:.82rem", text: r.c.look.short }) : null)))),
        row("Overall score", main.map((r) => h("td", { class: r.score === topScore ? "best" : "" }, h("span", { class: "score-cell" }, miniBar(r.score), h("b", { text: r.score.toFixed(1) })))), "score-row"),
        S.factors.map((f) => row(f.label, main.map((r) => {
          const v = r.c.scores[f.key].score;
          return h("td", { class: v === best[f.key] ? "best" : "", title: r.c.scores[f.key].why }, h("span", { class: "score-cell" }, miniBar(v), h("span", { text: v })));
        }))),
        row("Driven by", main.map((r) => h("td", {}, driverList(r.c.drivers, { noCaution: true, limit: 2, brief: true })))),
        row("Watch out", main.map((r) => { const d = (r.c.drivers || []).find((x) => x.strength === "caution"); return h("td", { class: "ink-2", text: d ? d.signal : "—" }); })),
        specLabels.map((label) => row(label, main.map((r) => { const hit = specRows(r.c).find((x) => x[0] === label); return h("td", { text: hit ? hit[1] : "—" }); }))))));
  }

  function renderOverview() {
    const I = D.insights, M = D.market;
    const niches = [...D.niches.niches].sort((a, b) => b.opportunity - a.opportunity);
    const rel = (M.steamCozyReleasesByYear || []).filter((r) => r.count != null);
    const relBox = chartBox();
    later(() => C.columns(relBox, rel.map((r) => ({ label: String(r.year), value: r.count, display: fmtInt(r.count), partial: r.partial, sub: r.note })), { title: "Steam cozy releases by year", labelValues: true }));
    const outs = I.outliers || [];
    const pickOut = ["Overperformer", "Surprise", "Cautionary"].map((t) => outs.find((o) => o.type === t)).filter(Boolean);

    return h("div", { class: "view" },
      viewHead("Briefing · data as of " + D.meta.asOf, I.headline, I.subhead),
      section("Five games to consider", "Ranked by the data. Each shows what kind of game it is and the market signals behind it.",
        h("div", { class: "sugg-list" }, rankedSplit().main.map(suggestionRow)),
        h("div", {}, h("a", { href: "#concepts", text: "Compare all five side by side →" }))),
      I.decisions ? section("The calls", "What the data says to do, decision by decision. Click evidence to see the game or chart behind it.",
        h("div", { class: "grid grid-2" }, I.decisions.map((d) => h("article", { class: "card decision" },
          h("div", { class: "card-top" }, h("div", { class: "eyebrow", text: d.topic }), conf(d.confidence)),
          h("h3", { text: d.call }),
          h("p", { class: "ink-2", text: d.why }),
          h("div", { class: "chips" }, (d.evidence || []).map(evidenceChip)))))) : null,
      I.next90 ? h("div", { class: "grid grid-2" },
        panel("Your next 90 days", "In order. Each step tells you whether to keep going.",
          h("div", { class: "timeline" }, I.next90.map((s) => h("div", { class: "tl-row" }, h("div", { class: "tl-when", text: s.when }), h("div", { class: "ink-2", style: "font-size:.92rem", text: s.what }))))),
        panel("Biggest open lanes", "Demand × (inverse) supply, 0–10",
          h("ol", { class: "rank-list" }, niches.slice(0, 7).map((n, i) => h("li", {},
            h("a", { class: "rank-item", href: "#gaps", style: "text-decoration:none" },
              h("span", { class: "rank-n", text: i + 1 }), h("span", { text: n.name }),
              h("span", { class: "rank-bar" }, h("i", { style: `width:${n.opportunity * 10}%` })),
              h("span", { class: "rank-score", text: n.opportunity.toFixed(1) }))))))) : null,
      pickOut.length ? section("Outliers to learn from", "The games that broke the pattern, in both directions.",
        h("div", { class: "grid grid-3" }, pickOut.map((o) => outlierCard(o, true))),
        h("div", {}, h("a", { href: "#outliers", text: "All " + outs.length + " outliers and what to steal from each →" }))) : null,
      section("The evidence", "The numbers behind the calls.",
        h("div", { class: "kpis" }, I.kpis.map((k) => h("div", { class: "kpi" },
          h("div", { class: "kpi-value", text: k.value }), h("div", { class: "kpi-label", text: k.label }),
          h("div", { class: "kpi-src" }, k.sourceUrl ? h("a", { href: k.sourceUrl, target: "_blank", rel: "noopener", text: k.source }) : k.source, " ", conf(k.confidence))))),
        h("div", { class: "grid grid-2" },
          panel("Cozy-tagged releases on Steam", "Supply keeps rising; standing out gets harder each year", relBox,
            h("p", { class: "panel-note", text: M.steamCozyReleasesNote || "" })),
          h("div", { class: "grid", style: "align-content:start" }, I.keyFindings.slice(0, 3).map((f) => h("article", { class: "card" },
            h("h3", { text: f.title }), h("p", { class: "ink-2", text: f.detail })))))),
      section("Momentum right now", null,
        h("div", { class: "grid grid-2" }, [...M.trends].sort((a, b) => b.strength - a.strength).slice(0, 4).map(trendCard))),
    );
  }

  // generic detail drawer (reuses the game drawer)
  function openPanel(eyebrow, title, blocks, sources, confidence) {
    const d = drawer();
    const body = d.querySelector(".drawer-body");
    body.replaceChildren(
      h("div", { class: "section" }, h("div", { class: "eyebrow", text: eyebrow }), h("h2", { text: title, style: "font-size:var(--step-3)" })),
      blocks.filter((b) => b && b[1] && (!Array.isArray(b[1]) || b[1].length)).map(([label, v]) => h("section", { class: "section" }, h("h3", { text: label }),
        Array.isArray(v) ? h("ul", { class: "ink-2" }, v.map((x) => h("li", { text: typeof x === "string" ? x : [x.game, x.result].filter(Boolean).join(": ") }))) : h("p", { class: "ink-2", text: String(v) }))),
      h("div", { class: "section" }, conf(confidence), srcLinks((sources || []).filter(Boolean))));
    if (typeof d.showModal === "function") d.showModal(); else d.setAttribute("open", "");
    d.scrollTop = 0;
  }
  const confOf = (c) => { const m = String(c || "").toLowerCase().match(/high|medium|low/); return m ? m[0] : null; };
  function srcOne(u) { return u ? h("a", { href: u, target: "_blank", rel: "noopener", text: hostOf(u) }) : "—"; }
  function tableOf(cols, rows) {
    return h("div", { class: "table-wrap" }, h("table", {},
      h("thead", {}, h("tr", {}, cols.map((c) => h("th", { class: c.num ? "num" : "", text: c.label })))),
      h("tbody", {}, rows.map((r) => h("tr", { class: r.__click ? "clickable" : "", tabindex: r.__click ? "0" : null, onclick: r.__click || null, onkeydown: r.__click ? (e) => { if (e.key === "Enter") r.__click(); } : null },
        cols.map((c) => { const v = c.get(r); return h("td", { class: (c.num ? "num " : "") + (c.cls || "") }, v instanceof Node ? v : v == null ? "—" : String(v)); }))))));
  }

  function renderLaunch() {
    const G = D.gotomarket;
    if (!G) return h("div", { class: "error-box", text: "Go-to-market data is missing (data/gotomarket.json)." });
    const pickCh = (re) => G.channels.filter((c) => re.test(c.name));
    const platformClick = (p) => () => openPanel(p.type, p.name, [
      ["Audience", p.audience], ["Your share", p.revShare], ["What a phone viewer gets from your link", p.linkFromSocial], ["Requirements", p.requirements],
      ["Exclusivity", p.exclusivity], ["How it makes money", p.monetization], ["Cozy fit", p.cozyFit], ["Best for", p.bestFor], ["Case studies", p.caseStudies], ["Risks", p.risks]],
      p.sources, confOf(p.confidence));
    const jump = h("nav", { class: "jump-bar", "aria-label": "On this page" });
    const view = h("div", { class: "view" },
      viewHead("Launch & grow", "How to get your games played and paid", "The system for one person building with AI: where the play link goes, how to market on TikTok, Shorts and YouTube, how the money works, and the rules for using AI."),
      takeaway("launch"),
      section("The system", "Run every game through the same loop. Each step has a gate that tells you whether to keep going.",
        h("ol", { class: "loop-steps" }, G.loop.map((st, i) => h("li", { class: "card" },
          h("div", { class: "eyebrow", text: "Step " + (i + 1) }), h("h3", { text: st.step }), h("p", { class: "ink-2", text: st.detail }),
          h("p", { class: "gate" }, h("b", { text: "Go on when: " }), st.gate))))),
      section("The stack", "What to use at each layer, and why.",
        tableOf([{ label: "Layer", get: (r) => h("b", { text: r.layer }) }, { label: "Use", get: (r) => r.choice }, { label: "Why", cls: "ink-2", get: (r) => r.why }, { label: "Confidence", get: (r) => conf(r.confidence) }], G.stack)),
      section("Where your link can go", "Click a platform for requirements, case studies and risks.",
        tableOf([
          { label: "Platform", get: (r) => h("b", { text: r.name }) }, { label: "Type", get: (r) => r.type },
          { label: "Your share", cls: "ink-2", get: (r) => r.revShare }, { label: "From a phone link", cls: "ink-2", get: (r) => r.linkFromSocial },
          { label: "Best for", cls: "ink-2", get: (r) => r.bestFor }, { label: "Confidence", get: (r) => conf(confOf(r.confidence)) },
        ], G.platforms.map((p) => Object.assign({ __click: platformClick(p) }, p))),
        G.socialLinkNotes && G.socialLinkNotes.length ? h("div", { class: "callout warn" }, h("b", { text: "Link rules on the apps" }),
          h("ul", { class: "ink-2" }, G.socialLinkNotes.map((n) => h("li", {}, n.fact, " ", srcOne(n.source))))) : null),
      section("Making money", "Ads are the floor. The paid version and your audience are the business.",
        h("div", { class: "grid grid-2" },
          panel("Free web game → paid version", "Proven paths",
            h("ul", { class: "list-plain" }, G.webToPaidFunnels.map((f) => h("li", {}, h("b", { text: f.game }), h("div", { class: "ink-2", style: "font-size:.88rem", text: f.path }), h("div", { class: "mono", style: "color:var(--accent);font-size:.8rem", text: f.result }))))),
          panel("Ad benchmarks", "Mostly low confidence: measure your own",
            tableOf([{ label: "Metric", get: (r) => r.metric }, { label: "Value", get: (r) => r.value }, { label: "Conf.", get: (r) => conf(confOf(r.confidence)) }], G.adBenchmarks))),
        h("div", { class: "grid grid-2" },
          panel("Taking payments on the web", null, tableOf([{ label: "Option", get: (r) => h("b", { text: r.option }) }, { label: "Fees", get: (r) => r.fees }, { label: "Notes", cls: "ink-2", get: (r) => r.notes }], G.webPayments)),
          panel("YouTube as income", "A bonus, not the business", tableOf([{ label: "Stream", get: (r) => h("b", { text: r.stream }) }, { label: "Benchmark", cls: "ink-2", get: (r) => r.benchmark }], G.channelMonetization)))),
      section("Marketing on TikTok, Shorts and YouTube", G.recommendations && G.recommendations.marketing,
        h("div", { class: "grid grid-2" }, pickCh(/TikTok|Shorts|long-form|Reels/).map((c) => h("article", { class: "card" },
          h("h3", { text: c.name }), h("p", { class: "ink-2", text: c.howGamesGrowThere }),
          h("p", { style: "font-size:.88rem" }, h("b", { text: "Links: " }), c.linkMechanics),
          c.formatsThatWork && c.formatsThatWork.length ? h("div", {}, h("h4", { text: "Formats that work" }), h("ul", { class: "ink-2", style: "font-size:.88rem" }, c.formatsThatWork.slice(0, 5).map((x) => h("li", { text: x })))) : null,
          c.pitfalls && c.pitfalls.length ? h("p", { class: "sugg-caution" }, h("span", { class: "dir peaking" }, svgIcon(ICON.warn), "Watch out:"), " ", c.pitfalls[0]) : null))),
        h("h3", { text: "Case studies" }),
        tableOf([{ label: "Game", get: (r) => h("div", {}, h("b", { text: r.game }), h("div", { class: "muted", style: "font-size:.8rem", text: r.dev })) }, { label: "Channel", get: (r) => r.channel },
          { label: "Results", get: (r) => r.results }, { label: "Lesson", cls: "ink-2", get: (r) => r.lesson }, { label: "Conf.", get: (r) => conf(confOf(r.confidence)) }],
          G.caseStudies.map((c) => Object.assign({ __click: () => openPanel(c.channel, c.game, [["Who", c.dev], ["What they did", c.whatTheyDid], ["Results", c.results], ["Lesson", c.lesson]], [c.source], confOf(c.confidence)) }, c))),
        h("div", { class: "grid grid-2" },
          panel("Video formats", null, tableOf([{ label: "Format", get: (r) => h("b", { text: r.format }) }, { label: "Why it works", cls: "ink-2", get: (r) => r.whyItWorks }, { label: "Best on", get: (r) => r.bestChannel }], G.contentFormats)),
          panel("Funnel benchmarks", "From video to player", h("ul", { class: "list-plain" }, (G.funnelBenchmarks || []).map((b) => h("li", {}, h("b", { text: b.metric }), h("div", { class: "ink-2", style: "font-size:.88rem" }, b.value, " ", conf(confOf(b.confidence))))))))),
      section("Building with AI", "What helps you, and what costs you players.",
        h("div", { class: "callout" }, h("b", { text: "The rules" }), h("ol", { class: "ink-2" }, G.aiRules.map((r) => h("li", { text: r })))),
        h("div", { class: "grid grid-2" },
          panel("How players see AI in games", null, h("ul", { class: "list-plain" }, G.ai.sentiment.map((x) => h("li", { style: "font-size:.88rem" }, x.finding, " ", conf(confOf(x.confidence)), " ", srcOne(x.source))))),
          panel("Platform rules", null, tableOf([{ label: "Platform", get: (r) => h("b", { text: r.platform }) }, { label: "Policy", cls: "ink-2", get: (r) => r.policy }], G.ai.policies))),
        h("div", { class: "grid grid-2" },
          panel("What still protects you", null, h("ul", { class: "list-plain" }, G.ai.moats.map((m) => h("li", {}, h("b", { text: m.moat }), h("div", { class: "ink-2", style: "font-size:.88rem", text: m.why }))))),
          panel("How fast AI-assisted devs work", null, h("ul", { class: "list-plain" }, G.ai.workflow.map((m) => h("li", {}, h("b", { text: m.practice }), h("div", { class: "ink-2", style: "font-size:.88rem", text: m.detail })))))),
        h("h3", { text: "AI-built games so far" }),
        tableOf([{ label: "Game", get: (r) => h("b", { text: r.name }) }, { label: "How built", cls: "ink-2", get: (r) => r.howBuilt }, { label: "Results", get: (r) => r.results }, { label: "Conf.", get: (r) => conf(confOf(r.confidence)) }], G.ai.successStories)),
    );
    const secs = [...view.querySelectorAll(":scope > section.section")];
    jump.append(h("span", { class: "muted", style: "font-size:.8rem", text: "On this page:" }),
      ...secs.map((sec) => { const t = sec.querySelector("h2").textContent; return h("button", { type: "button", class: "chip ev", text: t, onclick: () => sec.scrollIntoView({ behavior: "smooth", block: "start" }) }); }));
    view.insertBefore(jump, view.children[2]);
    return view;
  }

  function renderSpread() {
    const G = D.gotomarket;
    if (!G) return h("div", { class: "error-box", text: "Go-to-market data is missing (data/gotomarket.json)." });
    let lvl = store.get("spreadLevel", "");
    const strip = h("div", { class: "chips", role: "group", "aria-label": "Cozy level" });
    const list = h("div", {});
    const levels = [["", "All"], ["cozy", "Cozy"], ["cozy-adjacent", "Cozy-adjacent"], ["not cozy", "Not cozy"]];
    const draw = () => {
      strip.replaceChildren(...levels.map(([k, label]) => h("button", { type: "button", class: "phase-btn slim", "aria-pressed": String(lvl === k), onclick: () => { lvl = k; store.set("spreadLevel", k); draw(); } },
        h("span", { class: "p-name", text: label }), h("span", { class: "muted", style: "font-size:.75rem", text: String(G.viralHits.filter((x) => !k || x.cozyLevel === k).length) }))));
      list.replaceChildren(tableOf([
        { label: "Game", get: (r) => h("div", {}, h("b", { text: r.name }), h("div", { class: "muted", style: "font-size:.8rem", text: [r.year, r.platform].filter(Boolean).join(" · ") })) },
        { label: "Cozy?", get: (r) => h("span", { class: "chip" + (r.cozyLevel === "cozy" ? " accent" : ""), text: r.cozyLevel }) },
        { label: "How it spread", cls: "ink-2", get: (r) => r.howItSpread }, { label: "Results", get: (r) => r.results }, { label: "Conf.", get: (r) => conf(confOf(r.confidence)) }],
        G.viralHits.filter((x) => !lvl || x.cozyLevel === lvl).map((x) => Object.assign({ __click: () => openPanel([x.platform, x.genre].filter(Boolean).join(" · "), x.name,
          [["How it spread", x.howItSpread], ["What players share", x.shareMechanic], ["How it makes money", x.monetization], ["Results", x.results], ["Lesson", x.lesson]], x.sources, confOf(x.confidence)) }, x))));
    };
    draw();
    return h("div", { class: "view" },
      viewHead("What spreads", "Games that went viral, and why", "Instant-play and short-session hits from Wordle to Grow a Garden, the patterns behind them, and what cozy looks like on web portals and phones."),
      takeaway("spread"),
      section("The patterns", G.recommendations && G.recommendations.viral,
        h("div", { class: "grid grid-3" }, G.patterns.map((p) => h("article", { class: "card" }, h("h3", { text: p.pattern }), h("p", { class: "ink-2", style: "font-size:.9rem", text: p.detail }),
          h("div", { class: "chips" }, (p.examples || []).map((e) => h("span", { class: "chip", text: e }))))))),
      section("The hits", "Click a game for the full story.", strip, list),
      section("What cozy looks like on web portals", null,
        tableOf([{ label: "Genre", get: (r) => h("b", { text: r.genre }) }, { label: "Cozy-friendly", get: (r) => r.cozyCompatible ? h("span", { class: "chip accent", text: "Yes" }) : h("span", { class: "chip", text: "No" }) },
          { label: "Evidence", cls: "ink-2", get: (r) => r.evidence }, { label: "Conf.", get: (r) => conf(confOf(r.confidence)) }], G.portalGenres),
        (G.platformEconomics || []).map((e) => h("p", { class: "panel-note", text: e.evidence }))),
      section("Cozy on phones", "Mobile and mini-game cozy successes: where cozy players already spend time.",
        tableOf([{ label: "Game", get: (r) => h("div", {}, h("b", { text: r.name }), h("div", { class: "muted", style: "font-size:.8rem", text: r.platform })) }, { label: "Genre", get: (r) => r.genre },
          { label: "Results", get: (r) => r.results }, { label: "Money", cls: "ink-2", get: (r) => r.monetization }, { label: "Conf.", get: (r) => conf(confOf(r.confidence)) }],
          G.cozyMobileWeb.map((x) => Object.assign({ __click: () => openPanel(x.platform, x.name, [["Genre", x.genre], ["Results", x.results], ["How it makes money", x.monetization], ["Lesson", x.lesson]], x.sources, confOf(x.confidence)) }, x))),
        G.mobileBenchmarks.length ? panel("Mobile benchmarks", null, tableOf([{ label: "Metric", get: (r) => r.metric }, { label: "Value", get: (r) => r.value }, { label: "Conf.", get: (r) => conf(confOf(r.confidence)) }], G.mobileBenchmarks)) : null),
    );
  }

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  function renderCulture() {
    const K = D.culture;
    if (!K) return h("div", { class: "error-box", text: "Culture data is missing (data/culture.json)." });
    const top = rankedSplit().main;
    const cats = uniq(K.signals.map((x) => x.category));
    let cat = store.get("cultureCat", "");
    if (cat && !cats.includes(cat)) cat = "";
    const strip = h("div", { class: "chips", role: "group", "aria-label": "Category" });
    const grid = h("div", { class: "grid grid-2" });
    const conceptName = (id) => (D.concepts.concepts.find((c) => c.id === id) || {}).name;
    const sorted = [...K.signals].sort((a, b) => b.strength - a.strength || (a.direction === "rising" ? -1 : 1));
    const draw = () => {
      strip.replaceChildren(...["", ...cats].map((c) => h("button", { type: "button", class: "phase-btn slim", "aria-pressed": String(cat === c), onclick: () => { cat = c; store.set("cultureCat", c); draw(); } },
        h("span", { class: "p-name", text: c || "All" }), h("span", { class: "muted", style: "font-size:.75rem", text: String(K.signals.filter((x) => !c || x.category === c).length) }))));
      grid.replaceChildren(...sorted.filter((x) => !cat || x.category === cat).map((x) => h("article", { class: "card" },
        h("div", { class: "card-top" }, h("h3", { text: x.name }), dirChip(x.direction)),
        h("div", { class: "meta" }, x.category, " · strength ", pips(x.strength)),
        h("p", { class: "ink-2", style: "font-size:.9rem", text: x.whatsHappening }),
        x.audienceOverlap ? h("p", { style: "font-size:.86rem" }, h("b", { text: "Overlap with cozy players: " }), x.audienceOverlap) : null,
        h("div", {}, h("h4", { text: "For your games" }), h("ul", { class: "ink-2", style: "font-size:.88rem" }, (x.gameImplications || []).slice(0, 4).map((t) => h("li", { text: t })))),
        (x.conceptFit || []).filter(conceptName).length ? h("div", { class: "chips" }, h("span", { class: "muted", style: "font-size:.8rem", text: "Helps:" }),
          x.conceptFit.filter(conceptName).map((id) => h("button", { type: "button", class: "chip accent", text: conceptName(id), onclick: () => goConcept(id) }))) : null,
        x.risks ? h("p", { class: "sugg-caution" }, h("span", { class: "dir peaking" }, svgIcon(ICON.warn), "Watch out:"), " ", x.risks) : null,
        h("details", {}, h("summary", { text: "Evidence (" + (x.evidence || []).length + ")", style: "cursor:pointer;font-size:.85rem;color:var(--accent)" }),
          h("ul", { class: "list-plain", style: "margin-top:8px" }, (x.evidence || []).map((e) => h("li", { style: "font-size:.85rem" }, e.fact, " ", conf(confOf(e.confidence)), " ", srcOne(e.source))))),
        askBtn("Ask how to use this", `How should my games use the "${x.name}" trend? Be concrete about theme, mechanics and the first clip I'd post.`))));
    };
    draw();

    // which suggestions ride which signals
    const fitTable = h("div", { class: "table-wrap" }, h("table", { class: "fit-table" },
      h("thead", {}, h("tr", {}, h("th", { text: "Signal" }), top.map((r) => h("th", { class: "num", text: r.c.name })))),
      h("tbody", {}, sorted.filter((x) => (x.conceptFit || []).some((id) => top.find((r) => r.c.id === id))).slice(0, 15).map((x) => h("tr", {},
        h("td", {}, h("b", { text: x.name }), " ", dirChip(x.direction)),
        top.map((r) => h("td", { class: "num" }, (x.conceptFit || []).includes(r.c.id) ? h("span", { class: "fit-dot", title: x.name + " → " + r.c.name, "aria-label": "fits" }, "●") : h("span", { class: "muted", text: "·" }))))))));

    const now = new Date().getMonth();
    const cal = h("div", { class: "cal" }, MONTHS.map((m, i) => {
      const items = (K.calendar || []).filter((c) => (c.months || []).includes(i + 1));
      return h("div", { class: "cal-month" + (i === now ? " now" : "") },
        h("div", { class: "cal-head" }, h("b", { text: m }), i === now ? h("span", { class: "chip accent", text: "Now" }) : null),
        items.length ? items.map((c) => h("div", { class: "cal-item" }, h("b", { text: c.moment }), h("div", { class: "ink-2", text: c.themeIdea }), c.contentIdea ? h("div", { class: "muted", text: "Post: " + c.contentIdea }) : null))
          : h("div", { class: "muted", text: "—" }));
    }));

    return h("div", { class: "view" },
      viewHead("Culture signals", "Trends outside games that should shape yours", "Collectibles, characters, aesthetics, hobbies, wellness, social platforms and the seasons: what's moving in the wider culture, how much it overlaps with cozy players, and what it means for the games you make and when you post them."),
      takeaway("culture"),
      K.synthesis ? section("What it means for your games", null, h("div", { class: "grid grid-2" }, K.synthesis.map((t) => h("article", { class: "card" }, h("h3", { text: t.title }), h("p", { class: "ink-2", text: t.detail }),
        t.signals && t.signals.length ? h("div", { class: "chips" }, t.signals.map((sname) => h("span", { class: "chip", text: sname }))) : null)))) : null,
      section("Which suggestions ride which trends", "Your current top five against the 15 strongest signals that support them. The full list is under All signals.", fitTable),
      section("The year at a glance", "When cozy interest peaks and what to theme around. 'cozy' searches peak every December; autumn content runs September to November.", cal),
      section("All signals", "Click a game chip to see the suggestion; open Evidence for sources.", strip, grid),
      K.seeds && K.seeds.length ? section("Game ideas these trends suggest", "Seeds from the research, not yet scored. Ask the atlas to develop one.",
        h("div", { class: "grid grid-3" }, K.seeds.map((n) => h("article", { class: "card" }, h("h4", { text: n.idea }), h("p", { class: "ink-2", style: "font-size:.86rem", text: n.whyThisTrend }),
          h("span", { class: "chip wrap", text: n.format }), askBtn("Develop this idea", `Develop this game idea into a concept for my studio, scored the same way as the others: ${n.idea}`))))) : null,
    );
  }

  function renderOutliers() {
    const I = D.insights, G = D.games;
    const outs = I.outliers || [];
    const types = ["Overperformer", "Surprise", "Cautionary"];
    let cur = store.get("outlierType", "");
    if (cur && !types.includes(cur)) cur = "";
    const strip = h("div", { class: "chips", role: "group", "aria-label": "Outlier type" });
    const grid = h("div", { class: "grid grid-2" });
    const draw = () => {
      strip.replaceChildren(...["", ...types].map((t) => h("button", { type: "button", class: "phase-btn slim", "aria-pressed": String(cur === t), onclick: () => { cur = t; store.set("outlierType", t); draw(); } },
        h("span", { class: "p-name", text: t ? ({ Overperformer: "Overperformers", Surprise: "Surprises", Cautionary: "Cautionary tales" })[t] : "All" }), h("span", { class: "muted", style: "font-size:.75rem", text: outs.filter((o) => !t || o.type === t).length + "" }))));
      grid.replaceChildren(...outs.filter((o) => !cur || o.type === cur).map((o) => outlierCard(o)));
    };
    draw();

    // computed: copies per person on the launch team (premium games where both are known)
    const per = G.filter((g) => g.teamAtLaunch && g.unitsOrPlayersMillions != null && /^Premium/.test(g.businessModel))
      .map((g) => ({ g, v: (g.unitsOrPlayersMillions * 1000) / g.teamAtLaunch })).sort((a, b) => b.v - a.v);
    const capped = per.filter((x) => x.v <= 5000);
    const off = per.filter((x) => x.v > 5000);
    const perBox = chartBox();
    later(() => C.barH(perBox, capped.map(({ g, v }) => ({ label: g.name, value: Math.round(v), display: fmtInt(Math.round(v)) + "k", sub: `${g.teamAtLaunch} ${g.teamAtLaunch === 1 ? "person" : "people"} · ${g.salesEstimate}`, onClick: () => openGame(g) }))));

    // computed: loved but under-discovered
    const gems = G.filter((g) => g.steamPositivePct >= 92 && g.steamReviews != null && g.steamReviews < 10000).sort((a, b) => b.steamPositivePct - a.steamPositivePct || a.steamReviews - b.steamReviews);

    return h("div", { class: "view" },
      viewHead("Outliers", "The games that broke the pattern", "Overperformers to copy, surprises that change the picture, and cautionary tales to avoid. Each one says what to take from it and which of your concepts it applies to."),
      takeaway("outliers"),
      strip, grid,
      h("div", { class: "grid grid-2" },
        panel("Copies sold per person on the launch team", "Thousands of copies per developer, premium games where team size is known",
          perBox,
          h("p", { class: "panel-note", text: (off.length ? off.map(({ g, v }) => `${g.name} is off the chart at ${fmtInt(Math.round(v))}k per person. `).join("") : "") +
            "Only " + per.length + " games publish both figures, so read this as a pattern, not a ranking. The pattern: one- to four-person teams dominate." })),
        panel("Loved, but few found them", "92%+ positive on Steam with under 10,000 reviews",
          h("div", { class: "table-wrap", style: "border:0" }, h("table", {},
            h("thead", {}, h("tr", {}, h("th", { text: "Game" }), h("th", { class: "num", text: "Positive" }), h("th", { class: "num", text: "Reviews" }))),
            h("tbody", {}, gems.map((g) => h("tr", { class: "clickable", tabindex: "0", onclick: () => openGame(g), onkeydown: (e) => { if (e.key === "Enter") openGame(g); } },
              h("td", { class: "game-name", text: g.name }), h("td", { class: "num", text: g.steamPositivePct + "%" }), h("td", { class: "num", text: fmtInt(g.steamReviews) })))))),
          h("p", { class: "panel-note", text: "Quality didn't guarantee an audience. These games got the craft right; what most lacked was a hook that spreads on its own (co-op, a clip-able action) or a big marketing beat." }))),
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
      takeaway("trends"),
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
    if (pendingNiche) { const id = pendingNiche; pendingNiche = null; later(() => setTimeout(() => openNiche(id), 50)); }
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
        srcLinks(n.sources),
        askBtn("Ask what would win here", `What would a winning game in the "${n.name}" niche look like for my studio? Name the closest games in the data and the gap they leave.`)))));
    return h("div", { class: "view" },
      viewHead("Market gaps", "Where demand outruns supply", "Each cozy niche is scored 0–10 for player demand and for how crowded it is. The top-left corner is where a new studio has the best odds. Click a dot or a row for the evidence."),
      takeaway("gaps"),
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
      takeaway("games"),
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
      askBtn("Ask what to copy from " + g.name, `What should my studio copy from ${g.name}, and what should we avoid? Use its full profile.`),
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
      takeaway("monetization"),
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
      takeaway("playbook"),
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
    const compare = h("div", {});
    const tabs = h("div", { class: "concept-tabs", role: "tablist", "aria-label": "Suggestions" });
    const sideTabs = h("div", { class: "concept-tabs side", role: "tablist", "aria-label": "Side bets" });
    const detail = h("div", { class: "section", id: "concept-detail" });
    let selected = store.get("concept", null);

    const sliders = h("div", { class: "weights" }, S.factors.map((f) => {
      const out = h("b", { text: w[f.key] });
      const input = h("input", { type: "range", min: "0", max: "5", step: "1", value: String(w[f.key]), id: "w-" + f.key, "aria-label": f.label + " weight" });
      input.addEventListener("input", () => { w[f.key] = +input.value; out.textContent = input.value; store.set("weights2", w); drawAll(); });
      return h("div", { class: "weight", title: f.description }, h("div", { class: "weight-top" }, h("label", { for: "w-" + f.key, text: f.label }), out), input);
    }));
    const reset = h("button", { class: "btn", type: "button", text: "Reset weights", onclick: () => { store.set("weights2", null); S.factors.forEach((f) => { w[f.key] = f.weight; const el = document.getElementById("w-" + f.key); if (el) { el.value = f.weight; el.previousSibling.lastChild.textContent = f.weight; } }); drawAll(); } });

    const presetBar = h("div", { class: "chips preset-bar", role: "group", "aria-label": "Rank for" });
    const applyPreset = (p) => { Object.assign(w, p.weights); store.set("weights2", w); S.factors.forEach((f) => { const el = document.getElementById("w-" + f.key); if (el) { el.value = w[f.key]; el.previousSibling.lastChild.textContent = w[f.key]; } }); drawAll(); };
    const drawPresets = () => {
      const cur = activePreset(w);
      presetBar.replaceChildren(h("span", { class: "muted", style: "font-size:.85rem", text: "Rank for:" }),
        ...(S.presets || []).map((p) => h("button", { type: "button", class: "phase-btn slim", "aria-pressed": String(cur && cur.id === p.id), title: p.note, onclick: () => applyPreset(p) }, h("span", { class: "p-name", text: p.label }))),
        cur ? null : h("span", { class: "chip", text: "Custom weights" }));
    };
    const pick = (id, scroll) => { selected = id; store.set("concept", id); drawAll(); if (scroll) detail.scrollIntoView({ behavior: "smooth", block: "start" }); };
    const tab = (r, label) => h("button", { type: "button", role: "tab", class: "concept-tab", "aria-selected": String(r.c.id === selected), onclick: () => pick(r.c.id) },
      h("span", { class: "t-score", text: label + " · " + r.score.toFixed(1) + " / 10" }), h("span", { class: "t-name", text: r.c.name }), h("span", { class: "muted", style: "font-size:.78rem", text: (r.c.spec || {}).genre || r.c.niche }));

    function drawAll() {
      const { all, main, side } = rankedSplit(w);
      if (!selected || !all.find((r) => r.c.id === selected)) selected = main[0].c.id;
      drawPresets();
      compare.replaceChildren(compareTable(main, (id) => pick(id, true)));
      tabs.replaceChildren(...main.map((r, i) => tab(r, "#" + (i + 1))));
      const more = all.filter((r) => r.c.track !== "side" && !main.includes(r));
      sideTabs.replaceChildren(...more.map((r) => tab(r, "More")), ...side.map((r) => tab(r, "Side bet")));
      const cur = all.find((r) => r.c.id === selected);
      const rank = main.indexOf(cur);
      detail.replaceChildren(conceptDetail(cur.c, cur.score, rank >= 0 ? rank + 1 : null, more.includes(cur)));
      afterMount.splice(0).forEach((fn) => fn());
    }

    append(wrap, [
      viewHead("What to build", "Five games the data points to", D.concepts.intro),
      takeaway("concepts"),
      h("div", { class: "callout warn" }, h("b", { text: "Read this first" }), h("p", { class: "ink-2", text: D.concepts.caveat })),
      section("Side by side", "Bold marks the best of the five on each factor. Hover a factor score for the reasoning; click a name for its full plan.", presetBar, compare),
      h("details", { class: "panel weights-panel" }, h("summary", {}, h("b", { text: "Change what matters" }), h("span", { class: "muted", text: " Scoring weights; the ranking updates live and is saved in this browser" })),
        sliders, h("div", {}, reset)),
      section("Full plans", null, tabs,
        h("div", { class: "side-bets" }, h("div", { class: "eyebrow", text: "More ideas and side bets" }), sideTabs),
        detail),
    ]);
    later(drawAll);
    return wrap;
  }

  function conceptDetail(c, score, rank, isMore) {
    const S = D.concepts.scoring;
    const factorBox = chartBox(), ganttBox = chartBox();
    later(() => C.barH(factorBox, S.factors.map((f) => ({ label: f.label, value: c.scores[f.key].score, display: c.scores[f.key].score + "/10", sub: c.scores[f.key].why })), { max: 10 }));
    later(() => C.gantt(ganttBox, c.milestones.map((m) => ({ name: m.name, start: m.startMonth, end: m.endMonth, kind: m.kind, sub: m.deliverable + (m.gate ? " · Gate: " + m.gate : "") }))));
    const list = (arr) => h("ul", { class: "ink-2", style: "font-size:.92rem" }, (arr || []).map((x) => h("li", { text: x })));
    return h("div", { class: "section", style: "gap:20px" },
      h("div", { class: "hero-rec" },
        h("div", { class: "section" },
          h("div", { class: "eyebrow", text: (rank ? "Suggestion #" + rank : isMore ? "More ideas" : "Side bet · " + (c.sideRole || "")) + " · " + c.niche }),
          h("h2", { text: c.name }), h("p", { class: "ink-2", style: "font-size:var(--step-1)", text: c.oneLiner }), h("p", { text: c.pitch }),
          h("div", { class: "chips" }, askBtn("Pressure-test this", `Pressure-test ${c.name} for my studio: the biggest risks, what to validate first, and what you would change.`),
            askBtn("Adapt it to my studio", `Adapt the ${c.name} plan to my studio's team, budget and skills. What changes in scope, team, timeline and money?`)),
          h("div", { class: "chips" }, (c.genreTags || []).map((t) => h("span", { class: "chip accent", text: t }))),
          h("dl", { class: "kv" }, h("dt", { text: "Audience" }), h("dd", { text: c.audience }), h("dt", { text: "Comparables" }), h("dd", { text: (c.comps || []).join(", ") }),
            h("dt", { text: "Session" }), h("dd", { text: c.sessionLength }), h("dt", { text: "Look" }), h("dd", { text: c.look ? c.look.short : c.artDirection }))),
        h("div", { class: "section" }, h("div", { class: "eyebrow", text: "Score" }), h("div", { class: "score-big", text: score.toFixed(1) }), factorBox,
          h("p", { class: "panel-note", text: "Hover a bar for the reasoning behind each factor." }))),
      lookPanel(c),
      h("div", { class: "grid grid-2" },
        panel("What drives this suggestion", "The market signals behind it, strongest first", driverList(c.drivers)),
        panel("What the game is", null, h("dl", { class: "kv spec" }, specRows(c).map(([k, v]) => [h("dt", { text: k }), h("dd", { text: v })])))),
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
            h("div", { class: "kpi" }, h("div", { class: "kpi-value", text: c.budgetUSD.label }), h("div", { class: "kpi-label", text: "Budget to launch" })),
            h("div", { class: "kpi" }, h("div", { class: "kpi-value", text: c.devMonths < 3 ? Math.round(c.devMonths * 4.3) + " wk" : c.devMonths + " mo" }), h("div", { class: "kpi-label", text: "To launch" }))),
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
        h("tbody", {}, c.revenueScenarios.map((r) => h("tr", {}, h("td", { class: "game-name", text: r.scenario }), h("td", { class: "num", text: r.volume || fmtInt(r.units) }), h("td", { class: "num", text: "$" + fmtInt(r.netUSD) }), h("td", { class: "ink-2", text: r.note }))))))),
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
    const GT = D.gotomarket;
    if (GT) {
      (GT.platforms || []).forEach((p) => (p.sources || []).forEach((u) => add(u, "Platform: " + p.name)));
      (GT.caseStudies || []).forEach((c) => add(c.source, "Marketing case: " + c.game));
      (GT.viralHits || []).forEach((x) => (x.sources || []).forEach((u) => add(u, "Viral hit: " + x.name)));
      (GT.ai && GT.ai.sentiment || []).forEach((x) => add(x.source, "AI sentiment"));
      (GT.ai && GT.ai.successStories || []).forEach((x) => add(x.source, "AI-built: " + x.name));
      (GT.cozyMobileWeb || []).forEach((x) => (x.sources || []).forEach((u) => add(u, "Mobile/web: " + x.name)));
      (GT.adBenchmarks || []).forEach((x) => add(x.source, "Ad benchmarks"));
    }
    (D.verification && D.verification.items || []).forEach((v) => String(v.source || "").split(/\s*;\s*/).forEach((u) => /^https?:/.test(u) && add(u, "Fact-check")));
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
      D.verification ? section("Fact-check", "The key figures the suggestions rest on, re-checked against their original sources on " + D.verification.checkedOn + ". " + D.verification.method,
        tableOf([{ label: "Claim", get: (r) => r.claim }, { label: "Status", get: (r) => h("span", { class: "chip " + (r.status === "confirmed" ? "good" : r.status === "revised" ? "warn" : "crit") },
            svgIcon(r.status === "confirmed" ? "M5 12l5 5L20 7" : ICON.warn), r.status[0].toUpperCase() + r.status.slice(1)) },
          { label: "What the source says", cls: "ink-2", get: (r) => r.verifiedValue + (r.note ? " " + r.note : "") },
          { label: "Source", get: (r) => { const u = String(r.source || "").split(/\s*;\s*/)[0]; return /^https?:/.test(u) ? srcOne(u) : "—"; } }], D.verification.items)) : null,
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

  window.Atlas = { h, data: () => D, ranked: rankedConcepts };

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
