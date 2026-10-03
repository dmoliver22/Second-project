/* Small SVG chart kit for the atlas. No dependencies.
   Every chart re-renders on container resize, carries a hover/focus tooltip,
   and inserts data text with textContent only. */
(function () {
  const SVGNS = "http://www.w3.org/2000/svg";

  function s(tag, attrs, text) {
    const el = document.createElementNS(SVGNS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) el.setAttribute(k, attrs[k]);
    if (text !== undefined && text !== null) el.textContent = String(text);
    return el;
  }

  // ---------- tooltip ----------
  let tip;
  function ensureTip() {
    if (tip) return tip;
    tip = document.createElement("div");
    tip.className = "tooltip";
    tip.hidden = true;
    tip.setAttribute("role", "status");
    document.body.appendChild(tip);
    return tip;
  }
  function showTip(evt, value, label, sub) {
    const t = ensureTip();
    t.replaceChildren();
    const strong = document.createElement("strong");
    strong.textContent = value;
    t.appendChild(strong);
    if (label) { const d = document.createElement("div"); d.textContent = label; t.appendChild(d); }
    if (sub) { const d = document.createElement("div"); d.className = "tt-sub"; d.textContent = sub; t.appendChild(d); }
    t.hidden = false;
    let x, y;
    if (evt && evt.clientX !== undefined && evt.type !== "focus") { x = evt.clientX; y = evt.clientY; }
    else if (evt && evt.target && evt.target.getBoundingClientRect) {
      const r = evt.target.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top;
    } else { x = 0; y = 0; }
    const w = t.offsetWidth, hgt = t.offsetHeight;
    let left = x + 14, top = y - hgt - 10;
    if (left + w > window.innerWidth - 8) left = x - w - 14;
    if (left < 8) left = 8;
    if (top < 8) top = y + 16;
    t.style.left = left + "px";
    t.style.top = top + "px";
  }
  function hideTip() { if (tip) tip.hidden = true; }

  function bindTip(node, getContent) {
    node.setAttribute("tabindex", "0");
    const on = (e) => { const c = getContent(); showTip(e, c[0], c[1], c[2]); };
    node.addEventListener("pointermove", on);
    node.addEventListener("focus", on);
    node.addEventListener("pointerleave", hideTip);
    node.addEventListener("blur", hideTip);
  }

  // ---------- responsive wrapper ----------
  function responsive(el, draw) {
    el.classList.add("chart");
    let last = -1;
    const run = () => {
      const w = Math.max(260, Math.floor(el.clientWidth || el.parentElement?.clientWidth || 600));
      if (w === last) return;
      last = w;
      el.replaceChildren();
      draw(w);
    };
    run();
    if ("ResizeObserver" in window) {
      let raf;
      const ro = new ResizeObserver(() => { cancelAnimationFrame(raf); raf = requestAnimationFrame(run); });
      ro.observe(el);
    }
  }

  function niceMax(v) {
    if (v <= 0) return 1;
    const p = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / p;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
    return step * p;
  }

  function measureText(str, size, weight) {
    const c = measureText.c || (measureText.c = document.createElement("canvas").getContext("2d"));
    c.font = (weight || 400) + " " + size + "px " + getComputedStyle(document.body).fontFamily;
    return c.measureText(str).width;
  }

  function truncate(str, px, size) {
    if (measureText(str, size) <= px) return str;
    let t = str;
    while (t.length > 3 && measureText(t + "…", size) > px) t = t.slice(0, -1);
    return t + "…";
  }

  // ---------- horizontal bars ----------
  // rows: [{label, value, display, sub, emphasis, onClick}]
  function barH(el, rows, opts) {
    opts = opts || {};
    const fmt = opts.format || ((v) => String(v));
    responsive(el, (W) => {
      const rowH = opts.rowHeight || 30, barH = 14;
      const fs = 12.5;
      const maxLabel = Math.min(W * 0.42, Math.max(...rows.map((r) => measureText(r.label, fs))) + 8);
      const valueW = Math.max(...rows.map((r) => measureText(r.display || fmt(r.value), fs, 600))) + 10;
      const x0 = maxLabel + 8, x1 = W - valueW;
      const max = opts.max || niceMax(Math.max(...rows.map((r) => r.value)));
      const H = rows.length * rowH + 6;
      const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": opts.title || "Bar chart" });
      svg.appendChild(s("line", { x1: x0, x2: x0, y1: 0, y2: H, class: "axis-line" }));
      rows.forEach((r, i) => {
        const y = i * rowH + 3;
        const g = s("g", { class: "row" });
        const w = Math.max(2, ((x1 - x0) * r.value) / max);
        g.appendChild(s("rect", { class: "hit", x: 0, y, width: W, height: rowH }));
        g.appendChild(s("text", { x: x0 - 8, y: y + rowH / 2 + 4, "text-anchor": "end", class: "lbl" }, truncate(r.label, maxLabel - 8, fs)));
        const color = r.color || (opts.emphasis ? (r.emphasis ? "var(--series-1)" : "var(--series-muted)") : "var(--series-1)");
        g.appendChild(s("path", { class: "mark", d: roundedBar(x0 + 1, y + (rowH - barH) / 2, w, barH, 4), fill: color }));
        g.appendChild(s("text", { x: x0 + w + 6, y: y + rowH / 2 + 4, class: "val" }, r.display || fmt(r.value)));
        bindTip(g, () => [r.display || fmt(r.value), r.label, r.sub]);
        if (r.onClick) { g.style.cursor = "pointer"; g.addEventListener("click", r.onClick); g.addEventListener("keydown", (e) => { if (e.key === "Enter") r.onClick(); }); }
        svg.appendChild(g);
      });
      el.appendChild(svg);
    });
  }

  // bar with rounded data-end only (right side)
  function roundedBar(x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    return `M${x},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x} Z`;
  }
  function roundedCol(x, y, w, h, r) {
    r = Math.min(r, w / 2, h);
    return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
  }

  // ---------- vertical columns ----------
  // rows: [{label, value, display, sub, emphasis}]
  function columns(el, rows, opts) {
    opts = opts || {};
    const fmt = opts.format || ((v) => String(v));
    responsive(el, (W) => {
      const H = opts.height || 240, padL = 44, padB = 26, padT = 18;
      const max = niceMax(Math.max(...rows.map((r) => r.value)));
      const plotW = W - padL - 4, plotH = H - padB - padT;
      const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": opts.title || "Column chart" });
      const ticks = 4;
      for (let i = 0; i <= ticks; i++) {
        const v = (max / ticks) * i;
        const y = padT + plotH - (plotH * v) / max;
        svg.appendChild(s("line", { x1: padL, x2: W - 4, y1: y, y2: y, class: i === 0 ? "axis-line" : "grid-line" }));
        svg.appendChild(s("text", { x: padL - 6, y: y + 4, "text-anchor": "end" }, compact(v)));
      }
      const slot = plotW / rows.length;
      const bw = Math.min(46, slot - 4);
      const labelEvery = slot < 34 ? Math.ceil(34 / slot) : 1;
      rows.forEach((r, i) => {
        const x = padL + slot * i + (slot - bw) / 2;
        const h = Math.max(1, (plotH * r.value) / max);
        const y = padT + plotH - h;
        const g = s("g", { class: "row" });
        g.appendChild(s("rect", { class: "hit", x: padL + slot * i, y: padT, width: slot, height: plotH }));
        const color = r.partial ? "var(--series-muted)" : r.emphasis ? "var(--series-2)" : "var(--series-1)";
        g.appendChild(s("path", { class: "mark", d: roundedCol(x, y, bw, h, 4), fill: color }));
        if (i % labelEvery === 0) g.appendChild(s("text", { x: x + bw / 2, y: H - 8, "text-anchor": "middle", class: "lbl" }, r.label));
        if (opts.labelValues && rows.length <= 12) g.appendChild(s("text", { x: x + bw / 2, y: y - 5, "text-anchor": "middle", class: "val", "font-size": 11 }, r.display || fmt(r.value)));
        bindTip(g, () => [r.display || fmt(r.value), r.label, r.sub]);
        svg.appendChild(g);
      });
      el.appendChild(svg);
    });
  }

  // ---------- scatter (opportunity map) ----------
  // points: [{x, y, label, emphasis, sub, onClick}]
  function scatter(el, points, opts) {
    opts = opts || {};
    responsive(el, (W) => {
      const H = Math.round(Math.min(560, Math.max(340, W * 0.62)));
      const padL = 48, padB = 44, padT = 16, padR = 16;
      const [xmin, xmax] = opts.xDomain || [0, 10];
      const [ymin, ymax] = opts.yDomain || [0, 10];
      const pw = W - padL - padR, ph = H - padT - padB;
      const X = (v) => padL + ((v - xmin) / (xmax - xmin)) * pw;
      const Y = (v) => padT + ph - ((v - ymin) / (ymax - ymin)) * ph;
      const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": opts.title || "Scatter chart" });
      if (opts.quadrant) {
        const q = opts.quadrant; // {x, y, label}
        svg.appendChild(s("rect", { class: "quad", x: X(xmin), y: Y(ymax), width: X(q.x) - X(xmin), height: Y(q.y) - Y(ymax) }));
        svg.appendChild(s("text", { class: "quad-label", x: X(xmin) + 8, y: Y(ymax) + 16 }, q.label));
        if (q.labelBR) svg.appendChild(s("text", { class: "quad-label", x: X(xmax) - 8, y: Y(ymin) - 8, "text-anchor": "end", style: "fill:var(--muted)" }, q.labelBR));
      }
      for (let v = xmin; v <= xmax; v += 2) {
        svg.appendChild(s("line", { x1: X(v), x2: X(v), y1: padT, y2: padT + ph, class: v === xmin ? "axis-line" : "grid-line" }));
        svg.appendChild(s("text", { x: X(v), y: padT + ph + 16, "text-anchor": "middle" }, v));
      }
      for (let v = ymin; v <= ymax; v += 2) {
        svg.appendChild(s("line", { x1: padL, x2: padL + pw, y1: Y(v), y2: Y(v), class: v === ymin ? "axis-line" : "grid-line" }));
        svg.appendChild(s("text", { x: padL - 8, y: Y(v) + 4, "text-anchor": "end" }, v));
      }
      svg.appendChild(s("text", { x: padL + pw / 2, y: H - 6, "text-anchor": "middle", class: "lbl" }, opts.xLabel || ""));
      const yl = s("text", { x: 0, y: 0, "text-anchor": "middle", class: "lbl", transform: `translate(12 ${padT + ph / 2}) rotate(-90)` }, opts.yLabel || "");
      svg.appendChild(yl);

      // jitter identical coordinates so overlapping niches stay visible
      const seen = {};
      const placed = points.map((p) => {
        const key = p.x + "," + p.y;
        const n = (seen[key] = (seen[key] || 0) + 1) - 1;
        const ang = n * 2.1, rad = n ? 7 : 0;
        return { p, cx: X(p.x) + Math.cos(ang) * rad, cy: Y(p.y) + Math.sin(ang) * rad };
      });
      // non-emphasised first so emphasised sit on top
      placed.sort((a, b) => (a.p.emphasis ? 1 : 0) - (b.p.emphasis ? 1 : 0));
      placed.forEach(({ p, cx, cy }) => {
        const g = s("g", { class: "row" });
        g.appendChild(s("circle", { class: "hit", cx, cy, r: 14 }));
        g.appendChild(s("circle", {
          class: "mark", cx, cy, r: p.emphasis ? 7 : 5.5,
          fill: p.emphasis ? "var(--series-1)" : "var(--series-muted)", stroke: "var(--surface)", "stroke-width": 2,
        }));
        bindTip(g, () => [p.label, p.tip, p.sub]);
        if (p.onClick) { g.style.cursor = "pointer"; g.addEventListener("click", p.onClick); g.addEventListener("keydown", (e) => { if (e.key === "Enter") p.onClick(); }); }
        svg.appendChild(g);
      });
      // direct labels for emphasised points: try 8 positions, keep the first that clears
      // every other label, every dot and the plot edge
      const dots = placed.map(({ cx, cy }) => ({ x: cx - 7, y: cy - 7, w: 14, h: 14 }));
      const labelBoxes = [];
      placed.filter((o) => o.p.emphasis).forEach(({ p, cx, cy }) => {
        const fs = 12, text = p.short || p.label;
        const tw = measureText(text, fs, 600);
        const cands = [
          [10, 4, "start"], [-10, 4, "end"], [0, -12, "middle"], [0, 20, "middle"],
          [10, -10, "start"], [10, 18, "start"], [-10, -10, "end"], [-10, 18, "end"],
        ];
        const boxOf = ([dx, dy, a]) => {
          const x = cx + dx, y = cy + dy;
          return { x: a === "start" ? x : a === "end" ? x - tw : x - tw / 2, y: y - 11, w: tw, h: 14, lx: x, ly: y, a };
        };
        const inside = (b) => b.x >= padL && b.x + b.w <= padL + pw && b.y >= padT && b.y + b.h <= padT + ph;
        const own = (d) => Math.abs(d.x + 7 - cx) < 0.5 && Math.abs(d.y + 7 - cy) < 0.5;
        const ok = (b) => inside(b) && !labelBoxes.some((o) => overlap(o, b)) && !dots.some((d) => !own(d) && overlap(d, b));
        const pick = cands.map(boxOf).find(ok) || cands.map(boxOf).find(inside) || boxOf(cands[0]);
        labelBoxes.push(pick);
        svg.appendChild(s("text", { x: pick.lx, y: pick.ly, "text-anchor": pick.a, class: "val", "font-size": fs, style: "paint-order:stroke;stroke:var(--surface);stroke-width:3px" }, text));
      });
      el.appendChild(svg);
    });
  }
  function overlap(a, b) { return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; }

  // ---------- gantt ----------
  // tasks: [{name, start, end, sub}] in months from 0
  function gantt(el, tasks, opts) {
    opts = opts || {};
    responsive(el, (W) => {
      const rowH = 30, padT = 24, fs = 12.5;
      const labelW = Math.min(W * 0.38, Math.max(...tasks.map((t) => measureText(t.name, fs))) + 12);
      const total = opts.total || Math.max(...tasks.map((t) => t.end));
      const x0 = labelW, x1 = W - 8;
      const X = (m) => x0 + ((x1 - x0) * m) / total;
      const H = padT + tasks.length * rowH + 4;
      const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, role: "img", "aria-label": opts.title || "Timeline" });
      const step = total > 24 ? 6 : 3;
      for (let m = 0; m <= total; m += step) {
        svg.appendChild(s("line", { x1: X(m), x2: X(m), y1: padT - 6, y2: H, class: m === 0 ? "axis-line" : "grid-line" }));
        svg.appendChild(s("text", { x: X(m), y: 12, "text-anchor": "middle" }, "M" + m));
      }
      tasks.forEach((t, i) => {
        const y = padT + i * rowH;
        const g = s("g", { class: "row" });
        g.appendChild(s("rect", { class: "hit", x: 0, y, width: W, height: rowH }));
        g.appendChild(s("text", { x: x0 - 10, y: y + rowH / 2 + 4, "text-anchor": "end", class: "lbl" }, truncate(t.name, labelW - 12, fs)));
        const color = t.kind === "launch" ? "var(--series-2)" : t.kind === "live" ? "var(--series-3)" : "var(--series-1)";
        const w = Math.max(6, X(t.end) - X(t.start));
        g.appendChild(s("rect", { class: "mark", x: X(t.start) + 1, y: y + 8, width: w - 2, height: rowH - 16, rx: 4, fill: color }));
        bindTip(g, () => [t.name, `Month ${t.start}–${t.end}`, t.sub]);
        svg.appendChild(g);
      });
      el.appendChild(svg);
    });
  }

  function compact(v) {
    if (v >= 1e9) return +(v / 1e9).toFixed(1) + "B";
    if (v >= 1e6) return +(v / 1e6).toFixed(1) + "M";
    if (v >= 1e3) return +(v / 1e3).toFixed(1) + "k";
    return String(+v.toFixed(2));
  }

  window.AtlasCharts = { barH, columns, scatter, gantt, compact, showTip, hideTip };
})();
