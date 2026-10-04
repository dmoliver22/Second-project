/* Mood sketches: a rough phone-screen scene per game, drawn from its palette.
   They show composition, palette and mood, not final art. */
(function () {
  const NS = "http://www.w3.org/2000/svg";
  function el(tag, a, kids) {
    const e = document.createElementNS(NS, tag);
    for (const k in a || {}) e.setAttribute(k, a[k]);
    (kids || []).forEach((c) => c && e.appendChild(c));
    return e;
  }
  const face = (cx, cy, s, ink) => [
    el("circle", { cx: cx - 4 * s, cy, r: 1.4 * s, fill: ink }),
    el("circle", { cx: cx + 4 * s, cy, r: 1.4 * s, fill: ink }),
    el("ellipse", { cx: cx - 7 * s, cy: cy + 3 * s, rx: 2.2 * s, ry: 1.2 * s, fill: "#F09AA0", opacity: 0.8 }),
    el("ellipse", { cx: cx + 7 * s, cy: cy + 3 * s, rx: 2.2 * s, ry: 1.2 * s, fill: "#F09AA0", opacity: 0.8 }),
  ];
  const star = (x, y, r, fill) => el("path", { d: `M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z`, fill });
  const flower = (cx, cy, r, petal, center) => {
    const g = el("g", {});
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      g.appendChild(el("circle", { cx: cx + Math.cos(a) * r * 0.62, cy: cy + Math.sin(a) * r * 0.62, r: r * 0.48, fill: petal, stroke: "rgba(0,0,0,.12)", "stroke-width": 0.6 }));
    }
    g.appendChild(el("circle", { cx, cy, r: r * 0.42, fill: center }));
    return g;
  };

  const S = {
    "treat-box"(p) {
      const [milk, butter, matcha, blue, wood, cocoa] = p;
      const kids = [el("rect", { width: 180, height: 320, fill: milk })];
      [84, 134, 184].forEach((y, row) => {
        kids.push(el("rect", { x: 10, y, width: 160, height: 8, rx: 2, fill: wood }));
        [32, 64, 96, 128, 156].forEach((x, i) => {
          const secret = row === 1 && i === 2;
          const col = secret ? "#F2CB57" : [butter, matcha, blue, "#FFFFFF", butter][(i + row) % 5];
          if (secret) kids.push(el("circle", { cx: x, cy: y - 11, r: 20, fill: "#F7DD8A", opacity: 0.55 }));
          kids.push(el("ellipse", { cx: x, cy: y - 10, rx: 13, ry: 11, fill: col, stroke: "rgba(0,0,0,.15)", "stroke-width": 0.8 }));
          face(x, y - 11, 0.75, cocoa).forEach((f) => kids.push(f));
          if (secret) { kids.push(star(x + 14, y - 26, 4, "#FFFFFF")); kids.push(star(x - 15, y - 22, 3, "#FFFFFF")); }
        });
      });
      kids.push(el("rect", { x: 0, y: 256, width: 180, height: 64, fill: wood }));
      kids.push(el("rect", { x: 70, y: 236, width: 40, height: 30, rx: 3, fill: "#D8B48A", stroke: cocoa, "stroke-width": 1 }));
      kids.push(el("rect", { x: 64, y: 222, width: 26, height: 7, rx: 2, fill: "#E3C39C", stroke: cocoa, "stroke-width": 1, transform: "rotate(-28 70 226)" }));
      kids.push(el("ellipse", { cx: 96, cy: 220, rx: 12, ry: 10, fill: matcha, stroke: "rgba(0,0,0,.15)" }));
      face(96, 219, 0.7, cocoa).forEach((f) => kids.push(f));
      kids.push(star(118, 210, 4, "#FFFFFF"), star(76, 206, 3, "#FFFFFF"));
      kids.push(el("rect", { x: 10, y: 12, width: 160, height: 26, rx: 13, fill: "#FFFFFF", opacity: 0.85 }));
      [0, 1, 2, 3, 4, 5, 6].forEach((i) => kids.push(el("circle", { cx: 30 + i * 20, cy: 25, r: 6, fill: i === 6 ? "#F2CB57" : i < 4 ? cocoa : "#D9C7C7", opacity: i < 4 || i === 6 ? 0.85 : 1 })));
      return kids;
    },
    "daily-tidy"(p) {
      const [linen, oak, sage, rose, mustard, navy] = p;
      const k = [el("rect", { width: 180, height: 320, fill: linen }), el("rect", { x: 8, y: 46, width: 164, height: 230, rx: 8, fill: oak })];
      const pencil = (x, y, rot, c) => el("rect", { x, y, width: 34, height: 5, rx: 2, fill: c, stroke: navy, "stroke-width": 0.6, transform: `rotate(${rot} ${x + 17} ${y + 2})` });
      // before (left)
      k.push(pencil(16, 70, 32, mustard), pencil(22, 120, -18, rose), pencil(40, 200, 64, sage));
      k.push(el("rect", { x: 18, y: 150, width: 40, height: 30, rx: 2, fill: rose, stroke: navy, "stroke-width": 0.6, transform: "rotate(-22 38 165)" }));
      k.push(el("ellipse", { cx: 66, cy: 100, rx: 11, ry: 8, fill: sage, stroke: navy, "stroke-width": 0.6, transform: "rotate(40 66 100)" }));
      k.push(el("circle", { cx: 30, cy: 245, r: 7, fill: mustard, stroke: navy, "stroke-width": 0.6 }), el("circle", { cx: 70, cy: 232, r: 6, fill: rose, stroke: navy, "stroke-width": 0.6 }));
      k.push(el("line", { x1: 90, y1: 50, x2: 90, y2: 272, stroke: linen, "stroke-width": 1.5, "stroke-dasharray": "4 4" }));
      // after (right)
      [104, 112, 120].forEach((x, i) => k.push(el("rect", { x, y: 62, width: 5, height: 40, rx: 2, fill: [mustard, rose, sage][i], stroke: navy, "stroke-width": 0.6 })));
      k.push(el("rect", { x: 130, y: 62, width: 32, height: 40, rx: 2, fill: rose, stroke: navy, "stroke-width": 0.6 }));
      k.push(el("circle", { cx: 118, cy: 136, r: 11, fill: sage, stroke: navy, "stroke-width": 0.6 }), el("rect", { x: 128, y: 131, width: 6, height: 10, rx: 3, fill: "none", stroke: navy, "stroke-width": 1.2 }));
      [146, 160].forEach((x, i) => k.push(el("circle", { cx: x, cy: 136, r: 6, fill: [mustard, rose][i], stroke: navy, "stroke-width": 0.6 })));
      k.push(el("rect", { x: 102, y: 166, width: 60, height: 44, rx: 3, fill: linen, stroke: navy, "stroke-width": 0.6 }));
      [176, 186, 196].forEach((y) => k.push(el("line", { x1: 110, y1: y, x2: 152, y2: y, stroke: sage, "stroke-width": 2 })));
      // cat
      k.push(el("circle", { cx: 26, cy: 284, r: 12, fill: "#9A9A9E" }), el("path", { d: "M16 278 L18 266 L25 274Z M36 278 L34 266 L27 274Z", fill: "#9A9A9E" }));
      face(26, 284, 0.6, navy).forEach((f) => k.push(f));
      k.push(el("text", { x: 48, y: 36, "font-size": 10, fill: navy, "text-anchor": "middle", "font-family": "sans-serif" }));
      k[k.length - 1].textContent = "before";
      const t = el("text", { x: 132, y: 36, "font-size": 10, fill: navy, "text-anchor": "middle", "font-family": "sans-serif" }); t.textContent = "after"; k.push(t);
      k.push(el("rect", { x: 58, y: 288, width: 108, height: 22, rx: 4, fill: "#FFFFFF", stroke: navy, "stroke-width": 0.6 }));
      [70, 82, 94, 106].forEach((x, i) => k.push(el("rect", { x, y: 294, width: 9, height: 9, rx: 2, fill: [sage, sage, mustard, sage][i] })));
      return k;
    },
    "petal-drop"(p) {
      const [sky, terra, pink, sun, leaf, soil] = p;
      const k = [el("rect", { width: 180, height: 320, fill: sky })];
      k.push(el("rect", { x: 6, y: 6, width: 168, height: 230, fill: "none", stroke: "#FFFFFF", "stroke-width": 4 }), el("line", { x1: 90, y1: 6, x2: 90, y2: 236, stroke: "#FFFFFF", "stroke-width": 3 }));
      k.push(el("rect", { x: 0, y: 290, width: 180, height: 30, fill: "#F3EEE6" }));
      k.push(el("path", { d: "M24 112 L156 112 L140 296 L40 296Z", fill: terra, stroke: soil, "stroke-width": 1 }));
      k.push(el("rect", { x: 18, y: 104, width: 144, height: 14, rx: 3, fill: terra, stroke: soil, "stroke-width": 1 }));
      k.push(el("line", { x1: 28, y1: 96, x2: 152, y2: 96, stroke: pink, "stroke-width": 1.6, "stroke-dasharray": "5 4" }));
      const F = [[60, 270, 16, pink, sun], [100, 272, 14, "#FFFFFF", sun], [128, 262, 11, leaf, soil], [74, 236, 20, sun, soil], [120, 230, 18, pink, sun], [56, 196, 13, "#B9A6E6", sun], [104, 192, 15, "#FFFFFF", pink], [134, 196, 10, leaf, soil]];
      F.forEach(([x, y, r, c, m]) => k.push(flower(x, y, r, c, m)));
      k.push(flower(90, 92, 34, sun, soil));
      k.push(el("rect", { x: 12, y: 18, width: 46, height: 30, rx: 4, fill: "#FFF8E6", stroke: soil, "stroke-width": 0.8 }));
      k.push(flower(35, 33, 8, pink, sun));
      return k;
    },
    "cozy-corner"(p) {
      const [lamp, wall, blush, moss, rain, plum] = p;
      const k = [el("rect", { width: 180, height: 320, fill: plum })];
      k.push(el("polygon", { points: "20,190 90,150 90,52 20,92", fill: wall }));
      k.push(el("polygon", { points: "90,150 160,190 160,92 90,52", fill: wall }), el("polygon", { points: "90,150 160,190 160,92 90,52", fill: plum, opacity: 0.12 }));
      k.push(el("polygon", { points: "90,228 160,190 90,150 20,190", fill: "#C9A27E" }));
      k.push(el("polygon", { points: "90,214 132,190 90,166 48,190", fill: blush }));
      k.push(el("polygon", { points: "32,112 64,94 64,132 32,150", fill: rain, stroke: "#FFFFFF", "stroke-width": 2 }));
      [[40, 110], [50, 104], [56, 120], [44, 128]].forEach(([x, y]) => k.push(el("line", { x1: x, y1: y, x2: x - 2, y2: y + 8, stroke: "#FFFFFF", "stroke-width": 0.8, opacity: 0.8 })));
      k.push(el("circle", { cx: 128, cy: 132, r: 34, fill: lamp, opacity: 0.35 }));
      k.push(el("rect", { x: 126, y: 128, width: 3, height: 40, fill: plum }), el("path", { d: "M116 130 L140 130 L134 116 L122 116Z", fill: lamp }));
      [[104, 94, moss], [111, 98, blush], [118, 102, rain], [125, 106, lamp]].forEach(([x, y, c]) => k.push(el("rect", { x, y, width: 6, height: 16, fill: c, stroke: "rgba(0,0,0,.2)", "stroke-width": 0.5 })));
      k.push(el("rect", { x: 100, y: 112, width: 34, height: 3, fill: "#8A6A50", transform: "skewY(29.7)" }));
      k.push(el("rect", { x: 60, y: 172, width: 12, height: 14, rx: 2, fill: blush }), el("circle", { cx: 66, cy: 164, r: 9, fill: moss }), el("circle", { cx: 60, cy: 158, r: 6, fill: moss }), el("circle", { cx: 72, cy: 156, r: 6, fill: moss }));
      k.push(el("ellipse", { cx: 104, cy: 196, rx: 16, ry: 9, fill: rain }));
      for (let i = 0; i < 7; i++) k.push(el("circle", { cx: 96 + i * 9, cy: 62 + i * 5, r: 1.8, fill: lamp }));
      [16, 68, 120].forEach((x, i) => {
        k.push(el("rect", { x, y: 252, width: 46, height: 54, rx: 2, fill: "#FFFFFF", transform: `rotate(${[-4, 2, -2][i]} ${x + 23} 279)` }));
        k.push(el("rect", { x: x + 4, y: 256, width: 38, height: 36, fill: [blush, rain, moss][i], opacity: 0.8, transform: `rotate(${[-4, 2, -2][i]} ${x + 23} 279)` }));
      });
      k.push(el("path", { d: "M152 300 c-4 -6 -12 -2 -8 4 l8 7 l8 -7 c4 -6 -4 -10 -8 -4Z", fill: "#E86A7A" }));
      return k;
    },
    "tea-cart"(p) {
      const [steam, amber, matcha, brick, boba, teal] = p;
      const k = [el("rect", { width: 180, height: 320, fill: teal }), el("rect", { x: 0, y: 236, width: 180, height: 84, fill: "#183644" })];
      k.push(el("path", { d: "M0 40 Q90 80 180 36", fill: "none", stroke: "#0F2630", "stroke-width": 1.2 }));
      [[18, 46, 1], [48, 56, 1], [78, 60, 1], [108, 58, 0], [138, 50, 0], [166, 40, 0]].forEach(([x, y, lit]) => {
        if (lit) k.push(el("circle", { cx: x, cy: y + 10, r: 15, fill: amber, opacity: 0.25 }));
        k.push(el("ellipse", { cx: x, cy: y + 10, rx: 8, ry: 10, fill: lit ? amber : "#4A6470" }));
      });
      k.push(el("rect", { x: 22, y: 168, width: 84, height: 52, rx: 4, fill: brick }));
      k.push(el("path", { d: "M14 168 L114 168 L104 146 L24 146Z", fill: steam }));
      [24, 44, 64, 84].forEach((x) => k.push(el("path", { d: `M${x} 146 L${x + 10} 146 L${x + 8} 168 L${x + 2} 168Z`, fill: brick, opacity: 0.85 })));
      k.push(el("circle", { cx: 40, cy: 224, r: 10, fill: boba }), el("circle", { cx: 90, cy: 224, r: 10, fill: boba }));
      k.push(el("rect", { x: 32, y: 176, width: 30, height: 18, rx: 2, fill: "#2F2420" }));
      [36, 44, 52].forEach((x) => k.push(el("line", { x1: x, y1: 182, x2: x + 5, y2: 182, stroke: steam, "stroke-width": 1 })));
      k.push(el("ellipse", { cx: 84, cy: 164, rx: 9, ry: 7, fill: "#C9C3B8" }));
      k.push(el("path", { d: "M84 152 q-6 -8 0 -14 q6 -6 0 -14", fill: "none", stroke: steam, "stroke-width": 2, opacity: 0.7 }));
      [[120, matcha], [134, steam], [148, amber]].forEach(([x, c]) => k.push(el("rect", { x: x - 18, y: 160, width: 8, height: 9, rx: 1.5, fill: c, transform: "translate(0 0)" })));
      [[124, "#E9D6B9"], [144, "#B98B5E"], [164, "#9A9A9E"]].forEach(([x, c], i) => {
        k.push(el("ellipse", { cx: x, cy: 222, rx: 9, ry: 12, fill: c }));
        k.push(el("circle", { cx: x, cy: 200, r: 10, fill: c }));
        face(x, 201, 0.55, "#2F2420").forEach((f) => k.push(f));
        if (i === 1) k.push(el("path", { d: `M${x - 14} 186 Q${x} 170 ${x + 14} 186Z`, fill: brick }), el("line", { x1: x, y1: 186, x2: x, y2: 210, stroke: "#2F2420", "stroke-width": 1 }));
      });
      k.push(el("rect", { x: 112, y: 262, width: 54, height: 30, rx: 4, fill: "#2B2B2B", stroke: steam, "stroke-width": 1 }));
      return k;
    },
    "pond-party"(p) {
      const [fly, lily, dusk, dock, pond, deep] = p;
      const k = [el("rect", { width: 180, height: 320, fill: dusk }), el("rect", { x: 0, y: 92, width: 180, height: 228, fill: "#6E9E6A" })];
      k.push(el("ellipse", { cx: 90, cy: 200, rx: 82, ry: 78, fill: deep }), el("ellipse", { cx: 90, cy: 196, rx: 70, ry: 64, fill: pond, opacity: 0.55 }));
      [[50, 170], [128, 230], [70, 248], [132, 160]].forEach(([x, y], i) => {
        k.push(el("path", { d: `M${x} ${y} m-10 0 a10 7 0 1 0 20 0 l-10 0Z`, fill: "#7FB069" }));
        if (i % 2 === 0) k.push(el("circle", { cx: x + 4, cy: y - 3, r: 3, fill: lily }));
      });
      k.push(el("rect", { x: 100, y: 112, width: 22, height: 70, fill: dock, stroke: "#7A5A3C", "stroke-width": 0.8 }));
      const critter = (x, y, body, hat) => {
        k.push(el("ellipse", { cx: x, cy: y, rx: 9, ry: 8, fill: body }), el("circle", { cx: x, cy: y - 10, r: 7, fill: body }));
        face(x, y - 10, 0.45, "#2B2B2B").forEach((f) => k.push(f));
        k.push(el("path", { d: `M${x - 7} ${y - 15} L${x + 7} ${y - 15} L${x} ${y - 27}Z`, fill: hat }));
        k.push(el("line", { x1: x + 6, y1: y - 4, x2: x + 22, y2: y + 18, stroke: "#3A2A1C", "stroke-width": 1 }));
      };
      critter(111, 136, "#86C27A", lily); critter(111, 166, "#F5D76E", "#7AA7D9"); critter(30, 216, "#B98B5E", fly); critter(152, 236, "#9A9A9E", lily);
      k.push(el("ellipse", { cx: 84, cy: 214, rx: 11, ry: 7, fill: "#9C7652" }), el("circle", { cx: 84, cy: 205, r: 3.4, fill: "#F2A541" }));
      k.push(el("path", { d: "M60 190 q10 -18 22 -4", fill: "none", stroke: fly, "stroke-width": 1.2 }), el("ellipse", { cx: 70, cy: 186, rx: 8, ry: 4, fill: "#F2CB57", transform: "rotate(-30 70 186)" }));
      [[20, 40], [60, 24], [150, 30], [120, 60], [34, 120], [164, 110]].forEach(([x, y]) => k.push(el("circle", { cx: x, cy: y, r: 5, fill: fly, opacity: 0.3 }), el("circle", { cx: x, cy: y, r: 1.6, fill: fly })));
      [[40, 296], [76, 296], [112, 296], [148, 296]].forEach(([x, y], i) => k.push(el("circle", { cx: x, cy: y, r: 12, fill: "#FFFFFF", opacity: 0.9 }), el("circle", { cx: x, cy: y, r: 5, fill: [lily, fly, "#7AA7D9", "#86C27A"][i] })));
      return k;
    },
  };

  function sketch(id, palette, opts) {
    const f = S[id];
    if (!f) return null;
    const hex = palette.map((x) => x.hex);
    const svg = el("svg", { viewBox: "0 0 180 320", role: "img", "aria-label": (opts && opts.label) || "Mood sketch" }, f(hex));
    const wrap = document.createElement("div");
    wrap.className = "phone" + (opts && opts.small ? " small" : "");
    wrap.appendChild(svg);
    return wrap;
  }
  window.AtlasSketch = { sketch, has: (id) => !!S[id] };
})();
