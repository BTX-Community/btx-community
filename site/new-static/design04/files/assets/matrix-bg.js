/* BTX Community · page background: "MatMul sweep" (site/assets/matrix-bg.js)

   WHAT IT DRAWS
   A matrix multiplication, A × B = C, plays out very faintly on the page gradient, in small Overpass
   Mono numbers between thin bracket marks, over a hairline grid that fades out around the set. A row
   of A lights up, a column of B lights up, a faint marker steps along the row and down the column
   (one step per 0.5 s), then the matching cell of C fills in and its number appears. C completes
   row by row, holds, dissolves, and a new set forms somewhere else. One or two sets at a time (two
   from 1100 px wide), each only where its whole box is free of content with two clear cells to
   each side and one above and below (one all round on phones), and two cells from the viewport
   edges: never behind boards, rules, chips, media or text. Clearer spots and spots on the content
   column line score higher. Large translucent panels (.sheet) are
   not content in themselves, so a set may sit in an empty part of one, where the panel leaves it at
   about a seventh of its strength. Sets snap to a cell grid aligned to the .wrap column edge. If
   content scrolls or reflows over a set (late fonts, a resize, an opened panel), it dissolves in
   0.8 s once things settle. Phones (under 600 px) use 18 px cells and 2x2 · 2x2 sets.

   TOKENS (read from :root at runtime, re-read only when a value changes; nothing is hard-coded)
     --line-s --line-m --line-n --line-b   default colours (structure, row, product, column)
     --ink --ink-2 --ink-3                 text colours: each keeps 4.5:1 over the brightest pixel drawn
     --bg --bg-gradient                    page background, modelled for the contrast guard
                                           (linear and radial layers, any angle or "to" side)
     --bg-anim-ink       numbers, brackets, grid       fallback --line-s, then --ink
     --bg-anim-row       lit row of A                  fallback --line-m
     --bg-anim-col       lit column of B               fallback --line-b
     --bg-anim-product   filling cell of C             fallback --line-n
     --bg-anim-strength  0 to 1.5, default 1 (0 = draw nothing). The guard can only lower it.
     --bg-anim-peak      cap on any composited pixel (layers that stack count together), default .075
                         (8-bit rounding then stays under 8%)
     --bg-anim-cell      cell size in px, default 28 (phones use 18)
     --bg-anim-speed     .6 to 1.2, default 1 (at 1.2 the marker still changes under 2.5 times a second)
     --bg-anim-sets      0 to 2, default 2 (most sets on screen at once)
     --bg-anim-guard     background the guard assumes, default var(--bg-gradient) over --bg. If no
                         colour at all can be read from it, the guard assumes white and draws nothing.

   API (WCAG 2.2.2 pause)
     window.BTXBackground = { pause(), play(), isPaused(), onchange(fn) -> unsubscribe, refresh(), stats() }
     The choice is kept in localStorage["btx-bg-motion"] = "paused" | "playing" (try/catch). A stored
     "playing" never overrides reduced motion; play() under reduced motion counts for this page view only.
     isPaused() is also true while nothing moves for other reasons: before start, under forced
     colours. onchange listeners hear real changes only.

   RULES
   - One fixed full-viewport <canvas class="btx-bg"> (aria-hidden, pointer-events none), created here
     as the first child of <body>: it paints above the body::before gradient, below all content.
     Hidden in print and in forced-colors mode (forced colours also stop the loop, live, and then
     isPaused() reports true). JavaScript off: nothing, the gradient alone.
   - html[data-motion="off"] (reduced motion or ?motion=off) or a live reduced-motion change: one
     static frame, no loop; if content later covers it, it is placed again once, after scrolling
     stops. Hidden tab: no work at all. Paused: no work at all.
   - Starts in idle time once every web font is in (at most 3 s), so it measures the final layout;
     a later font, a body size change or the load event re-checks placement.
   - devicePixelRatio capped at 1.5; 24 fps cap (20 fps under 700 px). Only cells that change are
     redrawn, and the loop sleeps (setTimeout) through holds and gaps instead of waking every vsync.
     DOM measuring happens once per new set, in idle time, never in a frame.
   - Every colour group is scaled down until --ink, --ink-2 and --ink-3 keep 4.55:1 (plus a margin for
     8-bit rounding) over the brightest pixel it can make, computed from the local page background.
   - The clock carries over between pages (sessionStorage "btx-bg-clock"); a first visit starts at a
     composed moment, never on an empty background.

   QA SWITCHES: ?bg=off (no background) · ?bgperf=1 (ms per frame over 300 frames, console and
   <pre id="bg-perf">; the first set is placed as if the page were empty, so drawing is always
   measured) · ?bgflush=1 (adds rasterising to the timing) · ?bgpeak=1 (every element held at
   its brightest, static) · ?bgt=<s> (start time) · ?bgx=&bgy= (pin the first set, CSS px) ·
   ?bgdebug=1 (shows the area treated as covered). */
(function () {
  "use strict";
  var win = window, doc = document, root = doc.documentElement;
  if (win.BTXBackground) { return; }
  var Q = win.location.search || "";
  if (/[?&]bg=off(?:&|$)/.test(Q)) { return; }
  var cv = doc.createElement("canvas");
  var ctx = cv.getContext ? cv.getContext("2d") : null;
  if (!ctx) { return; }

  function qflag(n) { return new RegExp("[?&]" + n + "=1(?:&|$)").test(Q); }
  function qnum(n) { var m = new RegExp("[?&]" + n + "=(-?[0-9.]+)").exec(Q); return m ? parseFloat(m[1]) : null; }
  var PERF = qflag("bgperf"), FLUSH = qflag("bgflush"), PEAK = qflag("bgpeak"), DEBUG = qflag("bgdebug");
  var ARG_T = qnum("bgt"), PIN_X = qnum("bgx"), PIN_Y = qnum("bgy");
  var KEY = "btx-bg-motion", KEY_CLOCK = "btx-bg-clock";
  var DPR_CAP = 1.5, SEED = 20260, TARGET = 4.55, PAD = 3;
  /* Clear cells required around a set's matrices (x, y) and from the viewport edges; set in measure().
     Vertically one cell is enough (brackets reach 0.12 cell up and down); sideways the brackets reach
     0.3 cell out, so two. */
  var MX = 2, MY = 2, EDGE = 3;

  /* Timing in seconds at speed 1. Per region: the marker changes at most twice a second, every other
     change is a fade of 0.55 s or longer. */
  var BASE = { FORM: 2.4, LEAD: 0.7, LEADK: 0.3, KSTEP: 0.5, KF: 0.3, CTAIL: 0.8, XF: 0.55, CFILL: 0.65,
    CNUM_D: 0.15, CNUM: 0.7, SETTLE_D: 1.0, SETTLE: 0.9, TAIL: 1.0, HOLD: 7, DISSOLVE: 2.8, GAP: 6, RETRY: 5,
    INTRO: 0.9, CYCLE: 50, SLOT_OFF: 25, T0: 15, COVER: 0.8 };
  /* Design alphas before the guard (which only ever lowers them). */
  var ALPHA = { paper: 0.02, mark: 0.045, num: 0.04, dot: 0.04, lit: 0.06, kmark: 0.08, band: 0.018,
    fill: 0.035, fillSet: 0.02, cnum: 0.05 };

  /* ---------- helpers ---------- */
  function sm(x) { return x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x); }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function qz(v, n) { return Math.round(v * n); }
  function mulberry(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function store(kind, key, value) {
    try {
      var s = win[kind];
      if (value === undefined) { return s.getItem(key); }
      if (value === null) { s.removeItem(key); } else { s.setItem(key, value); }
    } catch (e) { /* storage blocked: the page still works */ }
    return null;
  }
  function idle(fn, ms) {
    if (win.requestIdleCallback) { win.requestIdleCallback(function () { fn(); }, { timeout: ms || 700 }); } else { setTimeout(fn, 30); }
  }
  var now = function () { return win.performance ? performance.now() : Date.now(); };

  var probe = null;
  function parseColour(s) {
    s = (s || "").trim();
    if (!s) { return null; }
    if (!probe) { var pc = doc.createElement("canvas"); pc.width = pc.height = 1; probe = pc.getContext("2d", { willReadFrequently: true }); }
    probe.fillStyle = "#000001"; probe.fillStyle = s; var a = probe.fillStyle;
    probe.fillStyle = "#000002"; probe.fillStyle = s; var b = probe.fillStyle;
    if (a !== b) { return null; }
    if (/^#[0-9a-f]{6}$/i.test(a)) { return [parseInt(a.substr(1, 2), 16), parseInt(a.substr(3, 2), 16), parseInt(a.substr(5, 2), 16), 1]; }
    var m = /^rgba?\(([^)]+)\)$/.exec(a);
    if (m) { var n = m[1].split(/[\s,\/]+/).map(parseFloat); return [n[0], n[1], n[2], n.length > 3 ? n[3] : 1]; }
    probe.clearRect(0, 0, 1, 1); probe.fillStyle = s; probe.fillRect(0, 0, 1, 1);
    var d = probe.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  }
  /* Alpha of a computed colour string, without the canvas (computed styles are rgb()/rgba()). */
  function fastAlpha(s) {
    if (!s || s === "transparent") { return 0; }
    var m = /^rgba?\((.+)\)$/.exec(s);
    if (m) { var p = m[1].split(/[\s,\/]+/); return p.length > 3 ? (/%$/.test(p[3]) ? parseFloat(p[3]) / 100 : parseFloat(p[3])) : 1; }
    m = /\/\s*([\d.]+)(%?)\s*\)$/.exec(s);
    return m ? (m[2] ? parseFloat(m[1]) / 100 : parseFloat(m[1])) : 1;
  }
  function over(c, base) { var a = c[3] == null ? 1 : c[3]; return [c[0] * a + base[0] * (1 - a), c[1] * a + base[1] * (1 - a), c[2] * a + base[2] * (1 - a)]; }
  function lin(v) { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }
  function lum(c) { return 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]); }
  function ratioL(a, b) { return a > b ? (a + 0.05) / (b + 0.05) : (b + 0.05) / (a + 0.05); }
  function rgba(c, a) { return "rgba(" + Math.round(c[0]) + "," + Math.round(c[1]) + "," + Math.round(c[2]) + "," + (a > 0 ? Math.min(1, a).toFixed(4) : "0") + ")"; }

  /* ---------- page background model (for the contrast guard) ---------- */
  function splitTop(s) {
    var out = [], depth = 0, cur = "";
    for (var i = 0; i < s.length; i++) {
      var ch = s.charAt(i);
      if (ch === "(") { depth++; } else if (ch === ")") { depth--; }
      if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; } else { cur += ch; }
    }
    if (cur.trim()) { out.push(cur.trim()); }
    return out;
  }
  function inner(str) { return str.slice(str.indexOf("(") + 1, str.lastIndexOf(")")); }
  function lenOf(v, ref) {
    var m = /^(-?[\d.]+)(px|%)?$/.exec(v);
    if (!m) { return null; }
    return m[2] === "%" ? parseFloat(m[1]) / 100 * ref : parseFloat(m[1]);
  }
  function parseStops(parts, lenPx) {
    var stops = [], i, k;
    for (i = 0; i < parts.length; i++) {
      var m = /^([a-z-]+\([^()]*\)|#[0-9a-f]{3,8}|[a-z]+)((?:\s+-?[\d.]+(?:%|px)?)*)$/i.exec(parts[i].trim());
      if (!m) { return null; }
      var c = parseColour(m[1]);
      if (!c) { return null; }
      var pc = [c[0] * c[3], c[1] * c[3], c[2] * c[3], c[3]], pos = m[2].trim() ? m[2].trim().split(/\s+/) : [];
      if (!pos.length) { stops.push({ c: pc, p: null }); }
      for (k = 0; k < pos.length; k++) {
        stops.push({ c: pc, p: /%$/.test(pos[k]) ? parseFloat(pos[k]) / 100 : parseFloat(pos[k]) / Math.max(1, lenPx) });
      }
    }
    if (stops.length < 2) { return null; }
    if (stops[0].p == null) { stops[0].p = 0; }
    if (stops[stops.length - 1].p == null) { stops[stops.length - 1].p = 1; }
    for (i = 1; i < stops.length; i++) {
      if (stops[i].p == null) {
        var j = i; while (stops[j].p == null) { j++; }
        stops[i].p = stops[i - 1].p + (stops[j].p - stops[i - 1].p) / (j - i + 1);
      }
      if (stops[i].p < stops[i - 1].p) { stops[i].p = stops[i - 1].p; }
    }
    return stops;
  }
  function stopAt(stops, t) { /* premultiplied interpolation, as CSS does */
    if (t <= stops[0].p) { return stops[0].c; }
    for (var i = 1; i < stops.length; i++) {
      if (t <= stops[i].p) {
        var a = stops[i - 1].c, b = stops[i].c, f = stops[i].p > stops[i - 1].p ? (t - stops[i - 1].p) / (stops[i].p - stops[i - 1].p) : 1;
        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f];
      }
    }
    return stops[stops.length - 1].c;
  }
  function parseLinear(str, W, H) {
    var parts = splitTop(inner(str)), first = parts[0] || "", dx = 0, dy = 1;
    var am = /^(-?[\d.]+)(deg|turn|rad|grad)$/i.exec(first);
    if (am) {
      var u = am[2].toLowerCase(), deg = parseFloat(am[1]) * (u === "turn" ? 360 : u === "rad" ? 180 / Math.PI : u === "grad" ? 0.9 : 1);
      var r = deg * Math.PI / 180; dx = Math.sin(r); dy = -Math.cos(r); parts.shift();
    } else if (/^to\s/i.test(first)) {
      var w = first.toLowerCase().replace(/^to\s+/, "").split(/\s+/), sx = 0, sy = 0;
      w.forEach(function (k) { if (k === "left") { sx = -1; } else if (k === "right") { sx = 1; } else if (k === "top") { sy = -1; } else if (k === "bottom") { sy = 1; } });
      if (!sx && !sy) { return null; }
      if (sx && sy) { var n = Math.sqrt(H * H + W * W) || 1; dx = sx * H / n; dy = sy * W / n; } else { dx = sx; dy = sy; }
      parts.shift();
    }
    var L = Math.abs(W * dx) + Math.abs(H * dy) || 1, stops = parseStops(parts, L);
    if (!stops) { return null; }
    return function (x, y) { return stopAt(stops, 0.5 + ((x - W / 2) * dx + (y - H / 2) * dy) / L); };
  }
  function parseRadial(str, W, H) {
    var parts = splitTop(inner(str)), first = (parts[0] || "").toLowerCase();
    var prelude = /\bat\b|circle|ellipse|closest|farthest/.test(first) || /^[-\d.]+(px|%)?(\s+[-\d.]+(px|%)?)?$/.test(first);
    var shape = "", pos = "";
    if (prelude) {
      parts.shift();
      var at = first.split(/\bat\b/); shape = at[0].trim(); pos = (at[1] || "").trim();
    }
    var kw = { left: 0, center: 0.5, right: 1, top: 0, bottom: 1 }, tk = pos ? pos.split(/\s+/) : [], cx = W / 2, cy = H / 2;
    function val(t, ref) { return kw[t] != null ? kw[t] * ref : lenOf(t, ref); }
    if (tk.length === 1) {
      if (tk[0] === "top" || tk[0] === "bottom") { cy = kw[tk[0]] * H; } else { cx = val(tk[0], W); }
    } else if (tk.length === 2) {
      var a = tk[0], b = tk[1];
      if (a === "top" || a === "bottom" || b === "left" || b === "right") { var s = a; a = b; b = s; }
      cx = val(a, W); cy = val(b, H);
    } else if (tk.length > 2) { return null; }
    if (cx == null || cy == null) { return null; }
    var words = shape ? shape.split(/\s+/) : [], lens = words.filter(function (w) { return /^[-\d.]/.test(w); });
    var circle = words.indexOf("circle") > -1 || (words.indexOf("ellipse") < 0 && lens.length === 1);
    var size = words.filter(function (w) { return /^(closest|farthest)-(side|corner)$/.test(w); })[0] || "farthest-corner";
    var ax = [Math.abs(cx), Math.abs(W - cx)], ay = [Math.abs(cy), Math.abs(H - cy)], rx, ry;
    if (lens.length) {
      rx = lenOf(lens[0], W); ry = circle ? rx : lenOf(lens[1] || lens[0], H);
      if (rx == null || ry == null) { return null; }
    } else {
      var close = size.indexOf("closest") === 0, sx = close ? Math.min(ax[0], ax[1]) : Math.max(ax[0], ax[1]),
        sy = close ? Math.min(ay[0], ay[1]) : Math.max(ay[0], ay[1]), corner = /corner$/.test(size);
      if (circle) { rx = ry = corner ? Math.sqrt(sx * sx + sy * sy) : (close ? Math.min(sx, sy) : Math.max(sx, sy)); }
      else { rx = sx * (corner ? Math.SQRT2 : 1); ry = sy * (corner ? Math.SQRT2 : 1); }
    }
    rx = Math.max(1, rx); ry = Math.max(1, ry);
    var stops = parseStops(parts, rx);
    if (!stops) { return null; }
    return function (x, y) { var u = (x - cx) / rx, v = (y - cy) / ry; return stopAt(stops, Math.sqrt(u * u + v * v)); };
  }
  var COLOUR_RE = /#[0-9a-f]{3,8}\b|(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^)]*\)/gi;
  function buildModel(str, base, W, H) {
    var layers = splitTop(str || ""), fns = [], ok = layers.length > 0;
    for (var i = 0; i < layers.length && ok; i++) {
      var L = layers[i], f = null;
      if (/^none$/i.test(L)) { continue; }
      if (/^linear-gradient\(.*\)$/i.test(L)) { f = parseLinear(L, W, H); }
      else if (/^radial-gradient\(.*\)$/i.test(L)) { f = parseRadial(L, W, H); }
      else { var c = parseColour(L); if (c) { var pc = [c[0] * c[3], c[1] * c[3], c[2] * c[3], c[3]]; f = function () { return pc; }; } }
      if (!f) { ok = false; } else { fns.push(f); }
    }
    if (!ok || !fns.length) { /* unknown background: its brightest colour everywhere (the safe side) */
      var best = base, found = 0;
      function consider(s) { var c = parseColour(s); if (c) { found++; c = over(c, base); if (lum(c) > lum(best)) { best = c; } } }
      ((str || "").match(COLOUR_RE) || []).forEach(consider);
      ((str || "").match(/[a-z]+/gi) || []).forEach(consider); /* named colours (white, pink, ...) */
      if (!found && /\S/.test(str || "")) { /* nothing readable at all: assume white, so nothing is drawn */
        best = [255, 255, 255];
        if (PERF || DEBUG) { try { console.warn("matrix-bg: no colour could be read from the guard background; drawing nothing"); } catch (e) { /* no console */ } }
      }
      return { kind: "uniform", at: function () { return best; } };
    }
    return {
      kind: "layers",
      at: function (x, y) {
        var r = base[0], g = base[1], b = base[2];
        for (var i = fns.length - 1; i >= 0; i--) { var s = fns[i](x, y), k = 1 - s[3]; r = s[0] + r * k; g = s[1] + g * k; b = s[2] + b * k; }
        return [r, g, b];
      }
    };
  }

  /* ---------- tokens ---------- */
  var TOKENS = ["--bg", "--bg-gradient", "--ink", "--ink-2", "--ink-3", "--line-s", "--line-m", "--line-n", "--line-b",
    "--bg-anim-ink", "--bg-anim-row", "--bg-anim-col", "--bg-anim-product", "--bg-anim-strength", "--bg-anim-peak",
    "--bg-anim-cell", "--bg-anim-speed", "--bg-anim-sets", "--bg-anim-guard"];
  var tok = null, sig = "", d = {}, al = {};
  function signature() { var cs = win.getComputedStyle(root); return TOKENS.map(function (n) { return cs.getPropertyValue(n).trim(); }).join("|"); }
  function readTokens() {
    var cs = win.getComputedStyle(root);
    function get(n) { return cs.getPropertyValue(n).trim(); }
    function num(n, def, lo, hi) { var v = parseFloat(get(n)); return isFinite(v) ? clamp(v, lo, hi) : def; }
    sig = signature();
    var base = over(parseColour(get("--bg")) || [14, 14, 16, 1], [0, 0, 0]);
    function col(names, fallback) {
      for (var i = 0; i < names.length; i++) { var c = parseColour(get(names[i])); if (c) { return over(c, base); } }
      return over(parseColour(fallback), base);
    }
    var inks = [];
    ["--ink", "--ink-2", "--ink-3"].forEach(function (n) { var c = parseColour(get(n)); if (c) { inks.push(lum(over(c, base))); } });
    if (!inks.length) { inks.push(lum([138, 138, 132])); }
    var speed = num("--bg-anim-speed", 1, 0.6, 1.2), strength = num("--bg-anim-strength", 1, 0, 1.5), peak = num("--bg-anim-peak", 0.075, 0, 0.12);
    tok = {
      base: base, inkL: inks,
      ink: col(["--bg-anim-ink", "--line-s", "--ink"], "#EDEDE8"),
      row: col(["--bg-anim-row", "--line-m"], "#4FB3F6"),
      col: col(["--bg-anim-col", "--line-b"], "#E4579A"),
      prod: col(["--bg-anim-product", "--line-n"], "#3D63DD"),
      cell: num("--bg-anim-cell", 28, 18, 44), sets: Math.round(num("--bg-anim-sets", 2, 0, 2)),
      guard: get("--bg-anim-guard") || get("--bg-gradient") || get("--bg"), strength: strength, peak: peak
    };
    Object.keys(BASE).forEach(function (k) { d[k] = BASE[k] / speed; });
    Object.keys(ALPHA).forEach(function (k) { al[k] = Math.min(peak, ALPHA[k] * strength); });
  }

  /* ---------- contrast guard ---------- */
  /* Does every ink keep TARGET over bg with these layers? Each layer: [colour, alpha, scalable]. The
     pixel is pushed 1.5 levels per channel lighter and every alpha half a level up, to cover 8-bit
     rounding in the canvas and in compositing (the site's text is light on a dark background). */
  function okStack(bg, layers, s) {
    var c0 = bg[0], c1 = bg[1], c2 = bg[2];
    for (var i = 0; i < layers.length; i++) {
      var L = layers[i], a = L[1] * (L[2] ? s : 1);
      if (a <= 0) { continue; }
      a = Math.min(1, a + 0.5 / 255);
      c0 += (L[0][0] - c0) * a; c1 += (L[0][1] - c1) * a; c2 += (L[0][2] - c2) * a;
    }
    var lp = lum([Math.min(255, c0 + 1.5), Math.min(255, c1 + 1.5), Math.min(255, c2 + 1.5)]);
    for (var k = 0; k < tok.inkL.length; k++) { if (ratioL(tok.inkL[k], lp) < TARGET) { return false; } }
    return true;
  }
  function solve(bg, stacks) {
    function all(s) { for (var i = 0; i < stacks.length; i++) { if (!okStack(bg, stacks[i], s)) { return false; } } return true; }
    if (all(1)) { return 1; }
    if (!all(0)) { return 0; }
    var lo = 0, hi = 1;
    for (var it = 0; it < 14; it++) { var m = (lo + hi) / 2; if (all(m)) { lo = m; } else { hi = m; } }
    return lo;
  }
  var GROUPS = ["paper", "mark", "num", "row", "col", "c"];
  /* Stacks list what can share a pixel at its brightest. Quiet numbers fade out exactly as a band fades
     in (weights 1 - l and l), so their mix is bounded by its two ends and needs no stack of its own;
     the C placeholder dot never exceeds the C number, so the fill + number stack covers it. */
  function factorsAt(bg) {
    var I = tok.ink, f = {}, litA = Math.max(al.kmark, al.lit);
    f.paper = solve(bg, [[[I, al.paper, 1]]]);
    f.mark = solve(bg, [[[I, al.mark, 1]]]);
    f.num = solve(bg, [[[I, Math.max(al.num, al.dot), 1]]]);
    f.row = solve(bg, [[[tok.row, al.band, 1], [tok.row, litA, 1]]]);
    f.col = solve(bg, [[[tok.col, al.band, 1], [tok.col, litA, 1]]]);
    f.c = solve(bg, [[[tok.prod, al.fill, 1], [I, al.cnum, 1]]]);
    return f;
  }
  var model = null, gmap = null;
  if (DEBUG) { win.__bgDebug = { who: function () { scan(); return scan.who; }, factorsAt: function (bg) { return factorsAt(bg); }, okStack: function (a, b, c) { return okStack(a, b, c); }, get: function () { return { tok: tok, al: al, at: model && model.at(W / 2, H / 2) }; } }; }
  var guardMs = 0, rebuilds = 0, setupParts = null;
  function buildGuardMap() {
    var t0 = now();
    model = buildModel(tok.guard, tok.base, W, H);
    var nx = model.kind === "uniform" ? 1 : 13, ny = model.kind === "uniform" ? 1 : 9, pts = [];
    for (var j = 0; j < ny; j++) {
      for (var i = 0; i < nx; i++) { pts.push(factorsAt(model.at(nx > 1 ? W * i / (nx - 1) : 0, ny > 1 ? H * j / (ny - 1) : 0))); }
    }
    var gmax = 0;
    pts.forEach(function (p) { gmax = Math.max(gmax, Math.min(p.row, p.col, p.c, p.num)); });
    gmap = { nx: nx, ny: ny, pts: pts, gmax: gmax };
    guardMs = now() - t0;
  }
  /* Smallest factor per group over the map points around a box (CSS px), with a 3% margin. */
  function factorsFor(x0, y0, x1, y1) {
    var F = {}, g = gmap, k;
    GROUPS.forEach(function (n) { F[n] = 1; });
    var sx = g.nx > 1 ? W / (g.nx - 1) : 1, sy = g.ny > 1 ? H / (g.ny - 1) : 1;
    var i0 = clamp(Math.floor(x0 / sx), 0, g.nx - 1), i1 = clamp(Math.ceil(x1 / sx), 0, g.nx - 1);
    var j0 = clamp(Math.floor(y0 / sy), 0, g.ny - 1), j1 = clamp(Math.ceil(y1 / sy), 0, g.ny - 1);
    for (var j = j0; j <= j1; j++) {
      for (var i = i0; i <= i1; i++) { var p = g.pts[j * g.nx + i]; for (k = 0; k < GROUPS.length; k++) { F[GROUPS[k]] = Math.min(F[GROUPS[k]], p[GROUPS[k]]); } }
    }
    for (k = 0; k < GROUPS.length; k++) { F[GROUPS[k]] *= 0.97; }
    return F;
  }

  /* ---------- canvas and sizing ---------- */
  cv.className = "btx-bg";
  cv.setAttribute("aria-hidden", "true");
  var W = 0, H = 0, dpr = 1, CELL = 28, P = 28, B = 28, OX = 0, COLB = 0, GWF = 0, phone = false, nSlots = 1, FRAME_MS = 1000 / 24, GW = 0, GH = 0;
  function measure() {
    W = root.clientWidth || win.innerWidth; H = cv.clientHeight || win.innerHeight;
    dpr = Math.min(DPR_CAP, win.devicePixelRatio || 1);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    phone = W < 600;
    CELL = phone ? 18 : Math.round(tok.cell);
    P = Math.round(CELL * dpr); B = P / dpr;
    MX = phone ? 1 : 2; MY = 1; EDGE = phone ? 1 : 2; /* the paper's outer cells are faded to nothing */
    nSlots = Math.min(tok.sets, W >= 1100 ? 2 : 1);
    FRAME_MS = 1000 / (W < 700 ? 20 : 24);
    /* Grid origin: a set placed at the content column has its left bracket (0.3 cell left of the
       first number) exactly on the .wrap content edge. */
    var wrap = doc.querySelector(".wrap"), left = 0;
    if (wrap) { var cw = win.getComputedStyle(wrap); left = wrap.getBoundingClientRect().left + (parseFloat(cw.paddingLeft) || 0); }
    var off = Math.round(P * 0.3) / dpr; /* bracket offset, as buildDecor draws it */
    OX = (((left + off) % B) + B) % B;
    GW = Math.ceil((W - OX) / B); GH = Math.ceil(H / B);
    GWF = Math.floor((W - OX) / B); /* whole cells only, for the edge margin */
    COLB = Math.round((left + off - OX) / B); /* the bin whose bracket sits on the column edge */
  }

  /* Digits 0-9 in three colours (ink, row, column), drawn opaque once; cells copy them at their alpha. */
  var atlas = null;
  function buildAtlas() {
    var fs = Math.round(CELL * 0.4 * dpr), font = "500 " + fs + "px \"Overpass Mono\", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    var c = doc.createElement("canvas"), x = c.getContext("2d");
    x.font = font;
    var adv = x.measureText("0").width, gw = Math.ceil(adv) + 2, gh = P;
    c.width = gw * 10; c.height = gh * 3;
    x.font = font; x.textAlign = "center"; x.textBaseline = "middle";
    var dy = Math.round(P * 0.05);
    [tok.ink, tok.row, tok.col].forEach(function (colour, r) {
      x.fillStyle = rgba(colour, 1);
      for (var n = 0; n < 10; n++) { x.fillText(String(n), n * gw + gw / 2, r * gh + gh / 2 + dy); }
    });
    atlas = { c: c, gw: gw, gh: gh, adv: adv };
  }
  function drawNum(x, y, value, role, alpha) {
    if (alpha < 0.0015) { return; }
    var s = String(value), a = atlas, x0 = x + P / 2 - s.length * a.adv / 2;
    ctx.globalAlpha = Math.min(1, alpha);
    for (var i = 0; i < s.length; i++) {
      var dgt = s.charCodeAt(i) - 48;
      ctx.drawImage(a.c, dgt * a.gw, role * a.gh, a.gw, a.gh, Math.round(x0 + i * a.adv + a.adv / 2 - a.gw / 2), y, a.gw, a.gh);
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- sets ---------- */
  function makeSet(slot, q, attempt) {
    var seed = (SEED + slot * 7919 + q * 104729 + attempt * 15485863) | 0, rnd = mulberry(seed);
    /* Retries alternate with a compact size, so smaller gaps between sections can hold a set too. */
    /* Phones always use the smallest set, 2x2 · 2x2, which fits the gaps between sections. */
    var compact = phone || attempt % 2 === 1, k = compact ? 2 : (rnd() < 0.5 ? 3 : 4);
    var combos = phone ? [[2, 2]] : compact ? [[2, 2], [2, 3], [3, 2]] :
      (k === 3 ? [[3, 3], [3, 3], [2, 3], [3, 2], [2, 4], [4, 2]] : [[3, 3], [2, 3], [3, 2], [2, 4], [4, 2]]);
    var mn = combos[Math.floor(rnd() * combos.length)], m = mn[0], n = mn[1];
    var gp = compact ? 1 : 2; /* cells between matrices, for the × and = signs */
    while ((k + 2 * n + 2 * gp) + 4 > GW && (n > 2 || k > 2)) { if (n >= k && n > 2) { n--; } else { k--; } }
    while (Math.max(m, k) + 4 > GH && (m > 2 || k > 2)) { if (m >= k && m > 2) { m--; } else { k--; } }
    var Av = [], Bv = [], Cv = [], i, j, t;
    for (i = 0; i < m * k; i++) { Av.push(Math.floor(rnd() * 5)); }
    for (i = 0; i < k * n; i++) { Bv.push(Math.floor(rnd() * 5)); }
    for (i = 0; i < m; i++) { for (j = 0; j < n; j++) { var s = 0; for (t = 0; t < k; t++) { s += Av[i * k + t] * Bv[t * n + j]; } Cv.push(s); } }
    var step = d.LEADK + k * d.KSTEP + d.CTAIL, tc0 = d.FORM + d.LEAD, tce = tc0 + m * n * step, tds = tce + d.TAIL + d.HOLD;
    var S = { slot: slot, q: q, seed: seed, m: m, k: k, n: n, Av: Av, Bv: Bv, Cv: Cv, gp: gp, cols: k + 2 * n + 2 * gp, rows: Math.max(m, k),
      step: step, tc0: tc0, tds: tds, dur: tds + d.DISSOLVE, start: 0, early: -1, prevFade: -1, keys: null, decor: null };
    S.iv = intervals(S);
    return S;
  }

  /* Every moment something fades, as merged [start, end] intervals in set time: the loop sleeps between them. */
  function intervals(S) {
    var iv = [], p, kk, i;
    function add(a, b) { iv.push([a, b]); }
    add(0, d.FORM);
    for (i = 0; i < S.m; i++) { var rs = S.tc0 + i * S.n * S.step, re = rs + S.n * S.step; add(rs, rs + d.XF); add(re, re + d.XF); }
    for (p = 0; p < S.m * S.n; p++) {
      var tp = S.tc0 + p * S.step; add(tp, tp + d.XF); add(tp + S.step, tp + S.step + d.XF);
      for (kk = 0; kk < S.k; kk++) { var a = tp + d.LEADK + kk * d.KSTEP; add(a, a + d.KF); add(a + d.KSTEP, a + d.KSTEP + d.KF); }
      var tf = tp + d.LEADK + S.k * d.KSTEP;
      add(tf, tf + d.CFILL); add(tf + d.CNUM_D, tf + d.CNUM_D + d.CNUM); add(tf + d.SETTLE_D, tf + d.SETTLE_D + d.SETTLE);
    }
    add(S.tds, S.tds + d.DISSOLVE);
    iv.sort(function (x, y) { return x[0] - y[0]; });
    var out = [iv[0].slice()];
    for (i = 1; i < iv.length; i++) {
      var last = out[out.length - 1];
      if (iv[i][0] <= last[1] + 0.08) { last[1] = Math.max(last[1], iv[i][1]); } else { out.push(iv[i].slice()); }
    }
    return out;
  }
  function nextChange(S, t) {
    if (S.early >= 0 || t >= S.dur) { return 0; }
    var iv = S.iv, lo = 0, hi = iv.length - 1, idx = -1;
    while (lo <= hi) { var mid = (lo + hi) >> 1; if (iv[mid][0] <= t) { idx = mid; lo = mid + 1; } else { hi = mid - 1; } }
    if (idx >= 0 && iv[idx][1] > t) { return 0; }
    return idx + 1 < iv.length ? iv[idx + 1][0] - t : S.dur - t;
  }

  /* Geometry in device px, relative to the set's paper origin. */
  function geometry(S) {
    var pad = PAD * P, rowOff = function (h) { return Math.floor((S.rows - h) / 2) * P; };
    S.g = {
      lx: Math.round((S.bx - PAD) * P + OX * dpr), ly: Math.round((S.by - PAD) * P),
      lw: S.cols * P + 2 * pad, lh: S.rows * P + 2 * pad,
      Ax: pad, Ay: pad + rowOff(S.m), Bx: pad + (S.k + S.gp) * P, By: pad + rowOff(S.k),
      Cx: pad + (S.k + S.n + 2 * S.gp) * P, Cy: pad + rowOff(S.m)
    };
  }
  function setAlphas(S) {
    var g = S.g, F = factorsFor(g.lx / dpr, g.ly / dpr, (g.lx + g.lw) / dpr, (g.ly + g.lh) / dpr);
    S.F = F;
    S.a = {
      paper: al.paper * F.paper, mark: al.mark * F.mark, num: al.num * F.num, dot: Math.min(al.dot * F.num, al.cnum * F.c),
      rBand: al.band * F.row, rLit: al.lit * F.row, rMark: al.kmark * F.row,
      cBand: al.band * F.col, cLit: al.lit * F.col, cMark: al.kmark * F.col,
      fill: al.fill * F.c, fillSet: al.fillSet / ALPHA.fill, cnum: al.cnum * F.c
    };
    /* --bg-anim-peak caps the composited pixel: a digit drawn over its band (or a C number over its
       fill) may only add what the band leaves under the cap. */
    var a = S.a;
    function under(top, base) { return Math.max(0, Math.min(top, (tok.peak - base) / (1 - base))); }
    a.rLit = under(a.rLit, a.rBand); a.rMark = under(a.rMark, a.rBand);
    a.cLit = under(a.cLit, a.cBand); a.cMark = under(a.cMark, a.cBand);
    a.cnum = under(a.cnum, a.fill); a.dot = Math.min(a.dot, a.cnum);
    cv.setAttribute("data-guard-" + S.slot, GROUPS.map(function (n) { return n + ":" + F[n].toFixed(2); }).join(" "));
  }

  /* Paper grid and bracket marks, drawn once per set to an offscreen canvas. Each group is drawn
     opaque, tinted, then laid down once at its alpha, so crossings never add up. */
  var scratch = null;
  function buildDecor(S, occ) { var t0 = now(); buildDecorIn(S, occ); costMs.decor += now() - t0; }
  function buildDecorIn(S, occ) {
    var g = S.g, a = S.a, I = tok.ink, x, y;
    var dc = doc.createElement("canvas"); dc.width = g.lw; dc.height = g.lh;
    var dd = dc.getContext("2d");
    if (!scratch) { scratch = doc.createElement("canvas"); }
    if (scratch.width < g.lw || scratch.height < g.lh) { scratch.width = Math.max(scratch.width, g.lw); scratch.height = Math.max(scratch.height, g.lh); }
    var tc = scratch.getContext("2d");
    function group(draw, colour, alpha) {
      if (alpha <= 0.001) { return; }
      tc.globalCompositeOperation = "source-over"; tc.clearRect(0, 0, scratch.width, scratch.height);
      tc.fillStyle = tc.strokeStyle = "#fff"; tc.lineWidth = 1;
      draw(tc);
      tc.globalCompositeOperation = "source-in"; tc.fillStyle = rgba(colour, 1); tc.fillRect(0, 0, g.lw, g.lh);
      tc.globalCompositeOperation = "source-over";
      dd.globalAlpha = alpha; dd.drawImage(scratch, 0, 0, g.lw, g.lh, 0, 0, g.lw, g.lh); dd.globalAlpha = 1;
    }
    var mats = [[g.Ax, g.Ay, S.k, S.m], [g.Bx, g.By, S.n, S.k], [g.Cx, g.Cy, S.n, S.m]];
    var midY = g.Ay - Math.floor((S.rows - S.m) / 2) * P + (S.rows * P) / 2;
    var signX = [g.Ax + S.k * P + Math.round(S.gp * P / 2), g.Bx + S.n * P + Math.round(S.gp * P / 2)];
    var bw = Math.max(1, Math.round(dpr)), off = Math.round(P * 0.3), tick = Math.round(P * 0.2), ext = Math.round(P * 0.12);
    group(function (c) { /* hairline grid on the cell pitch, fading out in an ellipse, cleared under the maths */
      for (x = 0; x <= g.lw; x += P) { c.fillRect(x, 0, 1, g.lh); }
      for (y = 0; y <= g.lh; y += P) { c.fillRect(0, y, g.lw, 1); }
      c.save();
      c.globalCompositeOperation = "destination-in";
      c.translate(g.lw / 2, g.lh / 2); c.scale(g.lw / 2, g.lh / 2);
      var grad = c.createRadialGradient(0, 0, 0, 0, 0, 1);
      grad.addColorStop(0, "rgba(0,0,0,1)"); grad.addColorStop(0.45, "rgba(0,0,0,.85)"); grad.addColorStop(1, "rgba(0,0,0,0)");
      c.fillStyle = grad; c.fillRect(-1, -1, 2, 2);
      c.restore();
      c.globalCompositeOperation = "destination-out";
      var bm = Math.round(P * 0.45);
      mats.forEach(function (mt) { c.fillRect(mt[0] - bm, mt[1] - Math.round(P * 0.2), mt[2] * P + 2 * bm, mt[3] * P + Math.round(P * 0.4)); });
      signX.forEach(function (sx) { c.fillRect(sx - P / 2, midY - P / 2, P, P); });
      if (occ) { /* no grid under content: skip every covered cell of the paper */
        for (var by = S.by - PAD; by < S.by + S.rows + PAD; by++) {
          for (var bx = S.bx - PAD; bx < S.bx + S.cols + PAD; bx++) {
            if (bx < 0 || by < 0 || bx >= GW || by >= GH || occ.sum(bx, by, bx + 1, by + 1)) { c.fillRect((bx - S.bx + PAD) * P - 1, (by - S.by + PAD) * P - 1, P + 2, P + 2); }
          }
        }
      }
      c.globalCompositeOperation = "source-over";
    }, I, a.paper);
    group(function (c) { /* brackets either side of each matrix, × and = in the gaps */
      mats.forEach(function (mt) {
        var top = mt[1] - ext, h = mt[3] * P + 2 * ext, lx = mt[0] - off, rx = mt[0] + mt[2] * P + off - bw;
        c.fillRect(lx, top, bw, h); c.fillRect(lx, top, tick, bw); c.fillRect(lx, top + h - bw, tick, bw);
        c.fillRect(rx, top, bw, h); c.fillRect(rx - tick + bw, top, tick, bw); c.fillRect(rx - tick + bw, top + h - bw, tick, bw);
      });
      var arm = Math.round(P * 0.16);
      c.lineWidth = bw; c.lineCap = "butt"; c.beginPath();
      c.moveTo(signX[0] - arm, midY - arm); c.lineTo(signX[0] + arm, midY + arm);
      c.moveTo(signX[0] + arm, midY - arm); c.lineTo(signX[0] - arm, midY + arm);
      c.stroke();
      var eqW = Math.round(P * 0.38), eqG = Math.round(P * 0.09);
      c.fillRect(Math.round(signX[1] - eqW / 2), Math.round(midY - eqG - bw), eqW, bw);
      c.fillRect(Math.round(signX[1] - eqW / 2), Math.round(midY + eqG), eqW, bw);
    }, I, a.mark);
    S.decor = dc;
  }

  /* ---------- where a set may go: open gradient only ---------- */
  var cls = win.WeakMap ? new WeakMap() : null, dbg = null;
  var SKIP = { SCRIPT: 1, STYLE: 1, TEMPLATE: 1, NOSCRIPT: 1, LINK: 1, META: 1, TITLE: 1, BR: 1, WBR: 1 };
  var MEDIA = { IMG: 1, SVG: 1, VIDEO: 1, CANVAS: 1, IFRAME: 1, INPUT: 1, SELECT: 1, TEXTAREA: 1, BUTTON: 1, PICTURE: 1, OBJECT: 1, EMBED: 1 };
  function ownText(el) { for (var c = el.firstChild; c; c = c.nextSibling) { if (c.nodeType === 3 && /\S/.test(c.nodeValue)) { return true; } } return false; }
  function paints(cs) { return fastAlpha(cs.backgroundColor) >= 0.1 || (cs.backgroundImage && cs.backgroundImage !== "none"); }
  /* k: 1 solid (counts whole, skip inside) · 2 text (whole, skip inside) · 3 borders only (edges) ·
     4 translucent fill (small: counts whole like 1; large panel: its borders only, then look inside) ·
     9 not rendered */
  function edgesOf(cs) {
    var sides = ["Top", "Right", "Bottom", "Left"], edges = null;
    for (var i = 0; i < 4; i++) {
      var w = parseFloat(cs["border" + sides[i] + "Width"]) || 0;
      if (w > 0 && cs["border" + sides[i] + "Style"] !== "none" && fastAlpha(cs["border" + sides[i] + "Color"]) >= 0.08) { (edges = edges || []).push(i, w); }
    }
    return edges;
  }
  function classify(el) {
    var c = cls && cls.get(el);
    if (c) { return c; }
    var cs = win.getComputedStyle(el), k = 0, edges = null, pseudo = 0, txt = 0;
    if (cs.display === "none") { k = 9; }
    else if (cs.visibility === "visible") {
      if (MEDIA[el.tagName.toUpperCase()] || (paints(cs) && (fastAlpha(cs.backgroundColor) >= 0.95 || cs.backgroundImage !== "none"))) { k = 1; }
      else if (paints(cs)) { k = 4; edges = edgesOf(cs); txt = ownText(el) ? 1 : 0; }
      else if (ownText(el)) { k = 2; }
      else { edges = edgesOf(cs); if (edges) { k = 3; } }
      if (k !== 1) {
        ["::before", "::after"].forEach(function (p) {
          var ps = win.getComputedStyle(el, p);
          if (ps.content && ps.content !== "none" && ps.content !== "normal" && ps.display !== "none" &&
            (paints(ps) || (parseFloat(ps.borderTopWidth) || 0) + (parseFloat(ps.borderLeftWidth) || 0) > 0)) { pseudo = 1; }
        });
      }
    }
    /* tf: may be mid-way through an entry animation (a rule or stripe drawing in with scaleX), so the
       scan uses its untransformed layout size as well */
    var tf = (cs.transform && cs.transform !== "none") || (cs.animationName && cs.animationName !== "none") || /transform|all/.test(cs.transitionProperty || "") ? 1 : 0;
    c = { k: k, edges: edges, pseudo: pseudo, txt: txt, tf: tf, sh: cs.boxShadow && cs.boxShadow !== "none" ? 1 : 0, flow: cs.position === "static" || cs.position === "relative" };
    if (cls) { cls.set(el, c); }
    return c;
  }
  /* Rectangles (viewport CSS px) that content paints right now. Run in idle time, once per new set
     and once after scrolling stops; nothing in a frame. */
  var scanStat = { n: 0, total: 0, max: 0, rects: 0 };
  function scan() {
    var t0 = now(), rects = [], stack = [doc.body];
    if (DEBUG) { scan.who = []; }
    while (stack.length) {
      var el = stack.pop();
      for (var ch = el.lastElementChild; ch; ch = ch.previousElementSibling) {
        if (ch === cv || ch === dbg || SKIP[ch.tagName.toUpperCase()]) { continue; }
        var c = classify(ch), r;
        if (c.k === 9) { continue; }
        if (c.k || c.pseudo) {
          r = ch.getBoundingClientRect();
          if (c.tf && ch.offsetWidth != null) { /* full layout box, wherever the transform is right now */
            r = { left: Math.min(r.left, r.right - ch.offsetWidth), top: Math.min(r.top, r.bottom - ch.offsetHeight), right: Math.max(r.right, r.left + ch.offsetWidth), bottom: Math.max(r.bottom, r.top + ch.offsetHeight), width: Math.max(r.width, ch.offsetWidth), height: Math.max(r.height, ch.offsetHeight) };
          }
          /* a translucent fill counts whole unless it is a large panel (at least 10 x 6 cells) with no
             text, shadow or pseudo-element of its own: then only its borders count, and the scan looks
             inside it for text, media and rules */
          var panel = c.k === 4 && !c.txt && !c.sh && !c.pseudo && r.width >= 10 * B && r.height >= 6 * B;
          var whole = c.k === 1 || c.k === 2 || (c.k === 4 && !panel);
          if (r.width > 0 || r.height > 0) {
            if (r.bottom > -40 && r.top < H + 40 && r.right > -40 && r.left < W + 40) {
              var m = c.sh ? 16 : c.pseudo ? 8 : 0;
              if ((c.k === 3 && !c.pseudo) || panel) {
                for (var e = 0; c.edges && e < c.edges.length; e += 2) {
                  var s = c.edges[e], w = c.edges[e + 1];
                  if (s === 0) { rects.push(r.left, r.top, r.right, r.top + w); }
                  else if (s === 1) { rects.push(r.right - w, r.top, r.right, r.bottom); }
                  else if (s === 2) { rects.push(r.left, r.bottom - w, r.right, r.bottom); }
                  else { rects.push(r.left, r.top, r.left + w, r.bottom); }
                }
              } else { rects.push(r.left - m, r.top - m, r.right + m, r.bottom + m); }
              if (DEBUG) { (scan.who = scan.who || []).push([ch.tagName + "." + (typeof ch.className === "string" ? ch.className : ""), c.k, c.pseudo, c.tf, Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]); }
            } else if (whole || (panel && (r.bottom < -200 || r.top > H + 200))) { continue; }
          }
          if (whole) { continue; }
        } else if (c.flow) {
          r = ch.getBoundingClientRect();
          if ((r.width > 0 || r.height > 0) && (r.bottom < -200 || r.top > H + 200)) { continue; }
        }
        stack.push(ch);
      }
    }
    var ms = now() - t0; costMs.scan += ms;
    scanStat.n++; scanStat.total += ms; scanStat.max = Math.max(scanStat.max, ms); scanStat.rects = rects.length / 4;
    return rects;
  }
  /* Occupancy on the cell grid, with a summed-area table so any box is tested in O(1). */
  function occupancy(rects, extra) {
    var occ = new Uint8Array(GW * GH), i, x, y;
    function markBins(a, c, b, e) {
      a = Math.max(0, a); b = Math.min(GW - 1, b); c = Math.max(0, c); e = Math.min(GH - 1, e);
      for (y = c; y <= e; y++) { for (x = a; x <= b; x++) { occ[y * GW + x] = 1; } }
    }
    for (i = 0; i < rects.length; i += 4) { /* CSS px, the grid starts at OX */
      markBins(Math.floor((rects[i] - OX) / B), Math.floor(rects[i + 1] / B), Math.floor((rects[i + 2] - OX - 0.01) / B), Math.floor((rects[i + 3] - 0.01) / B));
    }
    (extra || []).forEach(function (bx) { markBins(bx[0], bx[1], bx[2] - 1, bx[3] - 1); });
    var sat = new Int32Array((GW + 1) * (GH + 1)), w1 = GW + 1;
    for (y = 0; y < GH; y++) {
      for (x = 0; x < GW; x++) { sat[(y + 1) * w1 + x + 1] = occ[y * GW + x] + sat[y * w1 + x + 1] + sat[(y + 1) * w1 + x] - sat[y * w1 + x]; }
    }
    if (DEBUG) { showDebug(occ); }
    return { sat: sat, sum: function (x0, y0, x1, y1) {
      x0 = clamp(x0, 0, GW); x1 = clamp(x1, 0, GW); y0 = clamp(y0, 0, GH); y1 = clamp(y1, 0, GH);
      return sat[y1 * w1 + x1] - sat[y0 * w1 + x1] - sat[y1 * w1 + x0] + sat[y0 * w1 + x0];
    } };
  }
  /* Boxes (in bins, end exclusive) that other sets claim. A candidate's matrices are tested with an
     MX / MY cell margin and its paper reaches PAD cells out, so claiming the other set's matrices plus
     2 × PAD - margin cells keeps the two paper areas (and their clears) apart. */
  function claimed(except) {
    var out = [], e = 2 * PAD - Math.min(MX, MY);
    slots.forEach(function (sl, s) {
      if (s === except) { return; }
      /* a set that is dissolving because content covers it, or a waiting one from an old layout, claims nothing */
      [sl.set, sl.ready].forEach(function (S) { if (S && S.early < 0 && (S === sl.set || S.epoch === layoutEpoch)) { out.push([S.bx - e, S.by - e, S.bx + S.cols + e, S.by + S.rows + e]); } });
    });
    return out;
  }
  /* Smallest guard factor over the map points a paper box touches, memoised per map-point range
     (many candidates share one). */
  var fmemo = {};
  function guardFor(bx, by, S) {
    var x0 = (bx - PAD) * B + OX, y0 = (by - PAD) * B, x1 = (bx + S.cols + PAD) * B + OX, y1 = (by + S.rows + PAD) * B, g = gmap;
    var sx = g.nx > 1 ? W / (g.nx - 1) : 1, sy = g.ny > 1 ? H / (g.ny - 1) : 1;
    var key = clamp(Math.floor(x0 / sx), 0, g.nx - 1) + "," + clamp(Math.ceil(x1 / sx), 0, g.nx - 1) + "," + clamp(Math.floor(y0 / sy), 0, g.ny - 1) + "," + clamp(Math.ceil(y1 / sy), 0, g.ny - 1);
    var v = fmemo[key];
    if (v == null) { var F = factorsFor(x0, y0, x1, y1); v = fmemo[key] = Math.min(F.row, F.col, F.c, F.num); }
    return v;
  }
  var costMs = { place: 0, decor: 0, scan: 0 };
  function place(S, occ) {
    var tp0 = now(), r = placeIn(S, occ); costMs.place += now() - tp0; return r;
  }
  function placeIn(S, occ) {
    var best = null, bestScore = -1e9, rnd = mulberry(S.seed ^ 0x5BD1E995), prev = slots[S.slot] && slots[S.slot].lastBox, free = 0, dim = 0, gbest = 0;
    fmemo = {};
    if (PIN_X != null && PIN_Y != null && S.slot === 0) {
      best = [Math.round((PIN_X - OX) / B), Math.round(PIN_Y / B)];
    } else {
      /* The matrices need MX / MY clear cells around them and EDGE cells from the viewport edges. */
      for (var by = EDGE; by + S.rows + EDGE <= GH; by++) {
        for (var bx = EDGE; bx + S.cols + EDGE <= GWF; bx++) {
          if (occ.sum(bx - MX, by - MY, bx + S.cols + MX, by + S.rows + MY) > 0) { continue; }
          free++;
          var g = guardFor(bx, by, S);
          gbest = Math.max(gbest, g);
          /* skip only spots where the multiplication would show at under 30% of what this palette
             allows at its best spot; anything brighter just draws fainter, scaled by the guard */
          if (g < 0.3 * gmap.gmax || g <= 0.02) { dim++; continue; }
          /* clearance bonus: up to two more fully free rings of cells around the box */
          var ring = 0;
          while (ring < 2 && occ.sum(bx - MX - ring - 1, by - MY - ring - 1, bx + S.cols + MX + ring + 1, by + S.rows + MY + ring + 1) === 0) { ring++; }
          var score = 0.6 * g / gmap.gmax + rnd() * 0.5 + 0.1 * ring + (bx === COLB ? 0.15 : 0); /* on the column line */
          if (prev && Math.abs(prev[0] - bx) < S.cols && Math.abs(prev[1] - by) < S.rows + 2) { score -= 0.6; }
          if (score > bestScore) { bestScore = score; best = [bx, by]; }
        }
      }
    }
    lastPlace = { slot: S.slot, cells: S.cols + "x" + S.rows, free: free, tooDim: dim, bestGuard: +gbest.toFixed(2), gmax: +gmap.gmax.toFixed(2), placed: !!best };
    if (!best) { return false; }
    S.bx = best[0]; S.by = best[1];
    geometry(S); setAlphas(S);
    return true;
  }
  var lastPlace = null;
  /* Covered: content within one cell of the matrices (the brackets reach 0.3 cell out). */
  function covered(S, occ) { var mx = Math.min(1, MX), my = Math.min(1, MY); return occ.sum(S.bx - mx, S.by - my, S.bx + S.cols + mx, S.by + S.rows + my) > 0; }
  function showDebug(occ) {
    if (!dbg) {
      dbg = doc.createElement("canvas"); dbg.setAttribute("aria-hidden", "true");
      dbg.style.cssText = "position:fixed;left:0;top:0;width:100%;height:100vh;pointer-events:none;z-index:2147483000;opacity:.35";
      doc.body.appendChild(dbg);
    }
    dbg.width = W; dbg.height = H;
    var x2 = dbg.getContext("2d"); x2.fillStyle = "#f00";
    for (var y = 0; y < GH; y++) { for (var x = 0; x < GW; x++) { if (occ[y * GW + x]) { x2.fillRect(OX + x * B + 1, y * B + 1, B - 2, B - 2); } } }
    slots.forEach(function (sl) { var S = sl.set || sl.ready; if (S) { x2.strokeStyle = "#0f0"; x2.strokeRect(OX + S.bx * B, S.by * B, S.cols * B, S.rows * B); } });
  }

  /* ---------- levels at set time t ---------- */
  function pulse(t, a, b, f) { return Math.min(sm((t - a) / f), 1 - sm((t - b) / f)); }
  function kpulse(t, a) { return Math.min(sm((t - a) / d.KF), 1 - sm((t - a - d.KSTEP) / d.KF)); }
  function fadeOf(S, t) {
    var f = sm(t / d.FORM) * (1 - sm((t - S.tds) / d.DISSOLVE));
    if (S.early >= 0) { f = Math.min(f, 1 - sm((t - S.early) / d.COVER)); }
    return f * intro;
  }
  function tp(S, i, j) { return S.tc0 + (i * S.n + j) * S.step; }

  /* ---------- drawing ---------- */
  function drawAB(x, y, value, band, lit, mk, colour, role, aBand, aLit, aMark, fade) {
    if (band > 0) { ctx.fillStyle = rgba(colour, aBand * band / 24 * fade); ctx.fillRect(x, y, P, P); }
    var l = lit / 24, k = mk / 16;
    drawNum(x, y, value, 0, aNumNow * (1 - l) * (1 - k) * fade);
    drawNum(x, y, value, role, aLit * l * (1 - k) * fade);
    drawNum(x, y, value, role, aMark * k * fade);
  }
  var aNumNow = 0;
  function renderSet(S, t, force) {
    var g = S.g, a = S.a, fade = PEAK ? 48 : qz(fadeOf(S, t), 48), full = force || fade !== S.prevFade, n = 0, i, j, kk, key, x, y;
    var f = fade / 48, cells = S.m * S.k + S.k * S.n + S.m * S.n;
    if (!S.keys || S.keys.length !== cells) { S.keys = new Int32Array(cells); full = true; }
    if (full) {
      ctx.clearRect(g.lx, g.ly, g.lw, g.lh);
      if (fade > 0) { ctx.globalAlpha = f; ctx.drawImage(S.decor, g.lx, g.ly); ctx.globalAlpha = 1; }
      S.prevFade = fade; n = 1;
      if (fade <= 0) { return n; }
    }
    aNumNow = a.num;
    var ci = 0, ox = g.lx, oy = g.ly;
    for (i = 0; i < S.m; i++) { /* A: row i of A lights while row i of C is computed */
      var rl = PEAK ? 24 : qz(pulse(t, tp(S, i, 0), tp(S, i, 0) + S.n * S.step, d.XF), 24);
      for (kk = 0; kk < S.k; kk++, ci++) {
        var mk = 0;
        if (PEAK) { mk = 16; } else if (rl > 0) { for (j = 0; j < S.n; j++) { mk = Math.max(mk, kpulse(t, tp(S, i, j) + d.LEADK + kk * d.KSTEP)); } mk = qz(mk, 16); }
        key = rl * 17 + mk;
        if (full || S.keys[ci] !== key) {
          x = ox + g.Ax + kk * P; y = oy + g.Ay + i * P;
          if (!full) { ctx.clearRect(x, y, P, P); }
          drawAB(x, y, S.Av[i * S.k + kk], rl, rl, mk, tok.row, 1, a.rBand, a.rLit, a.rMark, f);
          S.keys[ci] = key; n++;
        }
      }
    }
    var colL = [];
    for (j = 0; j < S.n; j++) { var v = 0; for (i = 0; i < S.m; i++) { var s0 = tp(S, i, j); v = Math.max(v, pulse(t, s0, s0 + S.step, d.XF)); } colL.push(PEAK ? 24 : qz(v, 24)); }
    for (kk = 0; kk < S.k; kk++) { /* B: column j of B lights for each product (i, j) */
      for (j = 0; j < S.n; j++, ci++) {
        var mb = 0, cl = colL[j];
        if (PEAK) { mb = 16; } else if (cl > 0) { for (i = 0; i < S.m; i++) { mb = Math.max(mb, kpulse(t, tp(S, i, j) + d.LEADK + kk * d.KSTEP)); } mb = qz(mb, 16); }
        key = cl * 17 + mb;
        if (full || S.keys[ci] !== key) {
          x = ox + g.Bx + j * P; y = oy + g.By + kk * P;
          if (!full) { ctx.clearRect(x, y, P, P); }
          drawAB(x, y, S.Bv[kk * S.n + j], cl, cl, mb, tok.col, 2, a.cBand, a.cLit, a.cMark, f);
          S.keys[ci] = key; n++;
        }
      }
    }
    for (i = 0; i < S.m; i++) { /* C: the cell fills once the marker has walked the row and column */
      for (j = 0; j < S.n; j++, ci++) {
        var tf = tp(S, i, j) + d.LEADK + S.k * d.KSTEP;
        var fl = PEAK ? 24 : qz(sm((t - tf) / d.CFILL) * (1 - (1 - a.fillSet) * sm((t - tf - d.SETTLE_D) / d.SETTLE)), 24);
        var nu = PEAK ? 24 : qz(sm((t - tf - d.CNUM_D) / d.CNUM), 24);
        key = fl * 25 + nu;
        if (full || S.keys[ci] !== key) {
          x = ox + g.Cx + j * P; y = oy + g.Cy + i * P;
          if (!full) { ctx.clearRect(x, y, P, P); }
          if (fl > 0) { ctx.fillStyle = rgba(tok.prod, a.fill * fl / 24 * f); ctx.fillRect(x + 1, y + 1, P - 2, P - 2); }
          var dotA = a.dot * (1 - nu / 24) * f;
          if (dotA > 0.0015) { var ds = Math.max(2, Math.round(2 * dpr)); ctx.fillStyle = rgba(tok.ink, dotA); ctx.fillRect(Math.round(x + P / 2 - ds / 2), Math.round(y + P / 2 - ds / 2), ds, ds); }
          drawNum(x, y, S.Cv[i * S.n + j], 0, a.cnum * nu / 24 * f);
          S.keys[ci] = key; n++;
        }
      }
    }
    return n;
  }
  function clearSet(S) { if (S && S.g) { ctx.clearRect(S.g.lx, S.g.ly, S.g.lw, S.g.lh); } }
  function renderAll(force) {
    var n = 0;
    slots.forEach(function (sl) { var S = sl.set; if (S) { n += renderSet(S, T - S.start, force || S.fresh); S.fresh = false; } });
    return n;
  }

  /* ---------- slots and schedule ---------- */
  var slots = [], T = 0, intro = 1, introT = 0, layoutEpoch = 0, scrolling = false;
  var prepStat = { n: 0, total: 0, max: 0 };
  function newSlot() { return { q: 0, attempt: 0, set: null, ready: null, pending: false, next: 0, lastBox: null, failEpoch: -1 }; }
  /* After both sizes failed, a slot waits for the layout to change (scroll, resize, reflow) instead
     of scanning the page again on a timer. */
  function waiting(sl) { return sl.failEpoch >= 0 && sl.failEpoch === layoutEpoch; }
  function prepare(s) {
    var sl = slots[s];
    if (!sl || sl.set || !started) { return; }
    var t0 = now(), S = makeSet(s, sl.q, sl.attempt);
    var occ = occupancy(scan(), claimed(s));
    if (place(S, occ)) { buildDecor(S, occ); S.epoch = layoutEpoch; sl.ready = S; sl.failEpoch = -1; }
    else { sl.ready = null; sl.failEpoch = phone || sl.attempt % 2 === 1 ? layoutEpoch : -1; sl.attempt++; sl.next = T + (sl.failEpoch < 0 ? 1.5 : d.RETRY); }
    var ms = now() - t0; prepStat.n++; prepStat.total += ms; prepStat.max = Math.max(prepStat.max, ms);
  }
  function requestPrepare(s) {
    var sl = slots[s];
    if (sl.pending) { return; }
    sl.pending = true;
    var mySlots = slots;
    idle(function () { if (mySlots !== slots) { return; } sl.pending = false; prepare(s); wake(); });
  }
  function activate(s, local) {
    var sl = slots[s], S = sl.ready;
    sl.ready = null; sl.set = S; sl.lastBox = [S.bx, S.by]; sl.failEpoch = -1;
    S.start = T - (local || 0); S.fresh = true;
  }
  function retire(s) {
    var sl = slots[s];
    clearSet(sl.set); sl.set = null; sl.q++; sl.attempt = 0; sl.next = T + d.GAP;
  }
  function tick() {
    for (var s = 0; s < slots.length; s++) {
      var sl = slots[s], S = sl.set;
      if (S) {
        var t = T - S.start;
        if (t >= S.dur || (S.early >= 0 && t >= S.early + d.COVER)) { retire(s); }
      }
      if (!sl.set && !scrolling) {
        if (sl.ready && T >= sl.next) {
          if (sl.ready.epoch !== layoutEpoch) { sl.ready = null; requestPrepare(s); } else { activate(s, 0); }
        } else if (!sl.ready && !sl.pending && !waiting(sl) && T >= sl.next - 1.5) { requestPrepare(s); }
      }
    }
  }
  function nextWait() {
    if (intro < 1) { return 0; }
    var w = 10;
    slots.forEach(function (sl) {
      if (sl.set) { w = Math.min(w, nextChange(sl.set, T - sl.set.start)); }
      else if (!scrolling && !sl.pending && (sl.ready || !waiting(sl))) { w = Math.min(w, Math.max(0, (sl.ready ? sl.next : sl.next - 1.5) - T)); }
    });
    return w;
  }
  /* Build the sets for the current clock. A set already under way is placed straight away. */
  function setupSets(mode) {
    slots.forEach(function (sl) { clearSet(sl.set); });
    slots = [];
    ctx.clearRect(0, 0, cv.width, cv.height);
    var occBase = null;
    for (var s = 0; s < nSlots; s++) {
      var sl = newSlot(); slots.push(sl);
      var u = T - s * d.SLOT_OFF, q = Math.floor(u / d.CYCLE), local = u - q * d.CYCLE;
      sl.q = q;
      var S = makeSet(s, q, 0), steps = S.m * S.n;
      if (mode === "static") { local = tp(S, 0, 0) + (Math.floor(steps * (s === 0 ? 0.6 : 0.3)) * S.step) + d.LEADK + 1.5 * d.KSTEP; }
      else if (mode === "perf") { local = s === 0 ? 0 : -1; }
      if (local >= 0 && local < S.dur - d.DISSOLVE) {
        if (!occBase) { occBase = scan(); }
        /* perf mode measures drawing, so it places against an empty page: a set is always drawn */
        var occ = occupancy(mode === "perf" ? [] : occBase, claimed(s));
        if (!place(S, occ) && mode !== "perf") { /* no room: try the compact size at the same moment */
          var S2 = makeSet(s, q, 1), f = Math.min(1, local / S.dur);
          if (mode === "static") { local = tp(S2, 0, 0) + (Math.floor(S2.m * S2.n * (s === 0 ? 0.6 : 0.3)) * S2.step) + d.LEADK + 1.5 * d.KSTEP; } else { local = f * S2.dur; }
          S = place(S2, occ) ? S2 : null;
        } else if (!S.g) { S = null; }
        if (S && local < S.dur - d.DISSOLVE) { buildDecor(S, occ); sl.ready = S; S.epoch = layoutEpoch; activate(s, local); continue; }
      }
      sl.q = q + 1; sl.next = T + (mode === "perf" ? 4 : 2 + 3 * s);
    }
  }

  /* ---------- loop ---------- */
  var resizeHook = null, dprAt = 0;
  var started = false, timer = 0, raf = 0, lastNow = 0, plannedMs = 0, sleepCap = 0, frames = 0, drawnFrames = 0;
  var mq = win.matchMedia ? win.matchMedia("(prefers-reduced-motion: reduce)") : null;
  var fc = win.matchMedia ? win.matchMedia("(forced-colors: active)") : null;
  function forced() { return !!(fc && fc.matches); }
  var motionOff = root.getAttribute("data-motion") === "off" || !!(mq && mq.matches);
  var userPaused = store("localStorage", KEY) === "paused", optedIn = false, listeners = [];
  var perf = PERF ? { all: [], drawn: [], setup: 0, done: false } : null;

  function staticMode() { return !PERF && (PEAK || (motionOff && !optedIn)); }
  /* Paused also while nothing is shown: before start, and under forced colours (canvas hidden). */
  function isPaused() { return PEAK || !started || forced() || (!PERF && (userPaused || (motionOff && !optedIn))); }
  function shouldRun() { return started && !isPaused() && !doc.hidden; }
  function schedule(ms) {
    if (timer) { clearTimeout(timer); }
    plannedMs = Math.max(0, ms);
    sleepCap = Math.max(sleepCap, plannedMs); /* a wake() that cuts a sleep short keeps the longer allowance */
    timer = setTimeout(function () { timer = 0; if (shouldRun() && !raf) { raf = win.requestAnimationFrame(frame); } }, plannedMs);
  }
  function frame(ts) {
    raf = 0;
    if (!shouldRun()) { lastNow = 0; return; }
    var dt = lastNow ? (ts - lastNow) / 1000 : 0, maxDt = (sleepCap + FRAME_MS + 250) / 1000;
    sleepCap = 0;
    if (dt > maxDt) { dt = maxDt; }
    lastNow = ts; T += dt;
    /* about once a second: a devicePixelRatio change that came with no resize or media event */
    if (resizeHook && ts - dprAt > 1000) { dprAt = ts; if (Math.min(DPR_CAP, win.devicePixelRatio || 1) !== dpr) { resizeHook(); } }
    if (intro < 1) { introT += dt; intro = sm(introT / d.INTRO); }
    var t0 = now();
    tick();
    var n = renderAll(false);
    if (perf && !perf.done) {
      if (FLUSH) { ctx.getImageData(0, 0, 1, 1); }
      var ms = now() - t0;
      perf.all.push(ms); if (n) { perf.drawn.push(ms); }
      if (perf.all.length >= 300) { reportPerf(); }
    }
    frames++; if (n) { drawnFrames++; }
    var wait = PERF ? 0 : nextWait() * 1000, target = Math.max(FRAME_MS, wait);
    schedule(target - (now() - ts) - 6);
  }
  function startLoop() { if (shouldRun() && !timer && !raf) { lastNow = 0; schedule(0); } }
  function stopLoop() {
    if (timer) { clearTimeout(timer); timer = 0; }
    if (raf) { win.cancelAnimationFrame(raf); raf = 0; }
    lastNow = 0; saveClock();
  }
  function wake() { if (shouldRun() && !raf) { schedule(0); } }
  /* Listeners hear about real changes only (paused before start, so the first call reports "playing"). */
  var lastPaused = true;
  function notify() {
    var p = isPaused();
    if (p === lastPaused) { return; }
    lastPaused = p;
    listeners.slice().forEach(function (fn) { try { fn(p); } catch (e) { /* a listener failed */ } });
  }
  function saveClock() {
    if (!started || PERF || PEAK || ARG_T != null || staticMode()) { return; }
    store("sessionStorage", KEY_CLOCK, JSON.stringify({ T: Math.round((T % (d.CYCLE * 200)) * 100) / 100 }));
  }

  function statsOf(a) {
    if (!a.length) { return "n/a"; }
    var s = a.slice().sort(function (x, y) { return x - y; }), sum = 0;
    s.forEach(function (v) { sum += v; });
    return "avg " + (sum / s.length).toFixed(3) + " ms, p95 " + s[Math.min(s.length - 1, Math.floor(s.length * 0.95))].toFixed(3) + " ms, max " + s[s.length - 1].toFixed(3) + " ms";
  }
  function reportPerf() {
    perf.done = true;
    var msg = "bg perf (matrix-bg" + (FLUSH ? ", flushed" : "") + "): " + W + "x" + H + " CSS px at dpr " + dpr + ", canvas " + cv.width + "x" + cv.height +
      ", " + nSlots + " set(s), cap " + Math.round(1000 / FRAME_MS) + " fps\n" +
      "300 frames: " + statsOf(perf.all) + "\n" +
      perf.drawn.length + " frames that drew: " + statsOf(perf.drawn) + "\n" +
      "setup " + perf.setup.toFixed(1) + " ms (" + Object.keys(setupParts || {}).map(function (k) { return k + " " + setupParts[k]; }).join(", ") + ") · idle work per new set (scan + place + layers): " + (prepStat.n ? "avg " + (prepStat.total / prepStat.n).toFixed(2) + " ms, max " + prepStat.max.toFixed(2) + " ms, " + prepStat.n + "x" : "none") +
      " · DOM scan avg " + (scanStat.n ? (scanStat.total / scanStat.n).toFixed(2) : "0") + " ms, " + scanStat.rects + " rects";
    try { console.log(msg); } catch (e) { /* no console */ }
    var pre = doc.getElementById("bg-perf");
    if (!pre) {
      pre = doc.createElement("pre"); pre.id = "bg-perf";
      pre.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:2147483000;margin:0;padding:8px 10px;max-width:calc(100vw - 16px);white-space:pre-wrap;font:500 12px/1.4 ui-monospace,monospace;background:#000;color:#fff";
      doc.body.appendChild(pre);
    }
    pre.textContent = msg;
  }

  /* ---------- lifecycle ---------- */
  function drawNow() { ctx.clearRect(0, 0, cv.width, cv.height); renderAll(true); }
  function rebuild() { /* size, tokens or fonts changed: start the sets again from the same clock */
    readTokens(); measure(); buildAtlas(); buildGuardMap();
    rebuilds++;
    if (cls && win.WeakMap) { cls = new WeakMap(); }
    layoutEpoch++;
    setupSets(staticMode() ? "static" : "run");
    if (!staticMode() && !userPaused) { intro = 0; introT = 0; }
    drawNow();
    if (timer || raf) { stopLoop(); }
    startLoop();
  }
  function checkCover() {
    if (!started || PERF) { return; } /* perf mode places on an empty page on purpose */
    var shown = slots.filter(function (sl) { return sl.set; });
    if (!shown.length) { wake(); return; }
    var occ = occupancy(scan(), null), running = shouldRun(), needStatic = false;
    slots.forEach(function (sl, s) {
      var S = sl.set;
      if (!S || !covered(S, occ)) { return; }
      if (running) { if (S.early < 0) { S.early = T - S.start; } }
      else { retire(s); needStatic = true; } /* still: no motion, so it goes and is placed again */
    });
    /* No loop runs while still, so the static frame is rebuilt once, for the new layout. */
    if (needStatic) { idle(function () { if (!shouldRun() && !forced()) { layoutEpoch++; setupSets(staticMode() ? "static" : "run"); drawNow(); } }); }
    wake();
  }
  var coverTimer = 0;
  function laterCover(ms) { layoutEpoch++; clearTimeout(coverTimer); coverTimer = setTimeout(function () { idle(checkCover); }, ms); }

  function start() {
    if (started || !doc.body || forced()) { return; }
    var t0 = now();
    started = true;
    /* style rules moved to assets/draft-js.css by site/tools/import_draft.py (CSP) */
    doc.body.insertBefore(cv, doc.body.firstChild);

    readTokens(); measure(); /* the first layout read: style and layout for the inserted canvas */
    var t1 = now();
    buildAtlas(); buildGuardMap();
    var t2 = now();
    if (ARG_T != null) { T = ARG_T; }
    else if (PERF) { T = 0; }
    else {
      T = d.T0; /* a first visit starts at a composed moment */
      if (!staticMode()) {
        try { var saved = JSON.parse(store("sessionStorage", KEY_CLOCK) || "null"); if (saved && saved.T > 0 && saved.T < 1e6) { T = saved.T; } } catch (e) { /* ignore */ }
      }
    }
    intro = staticMode() || userPaused || PERF ? 1 : 0; introT = 0;
    /* The sets are placed in a second idle task, so start-up is two short tasks, not one long one. */
    idle(function () {
      var t3 = now();
      setupSets(PERF ? "perf" : staticMode() ? "static" : "run");
      var t4 = now();
      drawNow();
      setupParts = { layout: +(t1 - t0).toFixed(1), atlasGuard: +(t2 - t1).toFixed(1), sets: +(t4 - t3).toFixed(1), draw: +(now() - t4).toFixed(1) };
      if (perf) { perf.setup = (t2 - t0) + (now() - t3); }
      if (timer || raf) { stopLoop(); }
      startLoop();
      notify();
    }, 1000);

    var rt = 0, lastW = W, lastH = H, lastD = dpr;
    function onResize() {
      clearTimeout(rt);
      rt = setTimeout(function () {
        var w = root.clientWidth || win.innerWidth, h = cv.clientHeight || win.innerHeight, dd = Math.min(DPR_CAP, win.devicePixelRatio || 1);
        if (w === lastW && Math.abs(h - lastH) < 2 && dd === lastD) { return; }
        lastW = w; lastH = h; lastD = dd; idle(rebuild);
      }, 200);
    }
    win.addEventListener("resize", onResize, { passive: true });
    resizeHook = onResize;
    /* A devicePixelRatio change with no resize (the window moved to another screen). */
    function watchDpr() {
      if (!win.matchMedia) { return; }
      var m = win.matchMedia("(resolution: " + (win.devicePixelRatio || 1) + "dppx)");
      function h() { if (m.removeEventListener) { m.removeEventListener("change", h); } else if (m.removeListener) { m.removeListener(h); } onResize(); watchDpr(); }
      if (m.addEventListener) { m.addEventListener("change", h); } else if (m.addListener) { m.addListener(h); }
    }
    watchDpr();
    var scrollT = 0;
    win.addEventListener("scroll", function () {
      layoutEpoch++; scrolling = true; clearTimeout(scrollT);
      scrollT = setTimeout(function () {
        scrolling = false;
        if (Math.min(DPR_CAP, win.devicePixelRatio || 1) !== dpr) { onResize(); }
        idle(checkCover); wake();
      }, 300);
    }, { passive: true });
    doc.addEventListener("toggle", function () { laterCover(250); }, true);
    doc.addEventListener("click", function () { laterCover(500); }, true);
    doc.addEventListener("visibilitychange", function () { if (doc.hidden) { stopLoop(); } else { startLoop(); } });
    win.addEventListener("pagehide", stopLoop);
    win.addEventListener("pageshow", function (e) { if (e.persisted) { startLoop(); } });
    /* Layout can still change after start: a late web font, the load event, anything that changes
       the body's size (a section or the board reflowing). Placement is checked again each time. */
    if (doc.fonts && doc.fonts.addEventListener) { doc.fonts.addEventListener("loadingdone", function () { laterCover(150); }); }
    win.addEventListener("load", function () { laterCover(150); });
    if (win.ResizeObserver) { new win.ResizeObserver(function () { laterCover(250); }).observe(doc.body); }
    if (win.MutationObserver) {
      new MutationObserver(function () {
        syncMotion();
        if (signature() !== sig) { rebuild(); }
      }).observe(root, { attributes: true, attributeFilter: ["class", "style", "data-motion", "data-theme", "data-variant"] });
    }
    if (mq) { if (mq.addEventListener) { mq.addEventListener("change", syncMotion); } else if (mq.addListener) { mq.addListener(syncMotion); } }
  }
  function syncMotion() {
    var off = root.getAttribute("data-motion") === "off" || !!(mq && mq.matches);
    if (off === motionOff) { return; }
    var was = isPaused();
    motionOff = off; optedIn = false;
    if (isPaused()) { stopLoop(); } else { startLoop(); } /* reduced motion: the frame simply stays */
    if (was !== isPaused()) { notify(); }
  }

  win.BTXBackground = {
    pause: function () {
      var was = isPaused();
      userPaused = true; store("localStorage", KEY, "paused");
      stopLoop();
      if (!was) { notify(); }
    },
    play: function () {
      var was = isPaused();
      userPaused = false; store("localStorage", KEY, "playing");
      if (motionOff) { optedIn = true; } /* this page view only: a stored "playing" never beats reduced motion */
      startLoop();
      if (was !== isPaused()) { notify(); }
    },
    isPaused: isPaused,
    onchange: function (fn) {
      if (typeof fn !== "function") { return function () {}; }
      listeners.push(fn);
      return function () { listeners = listeners.filter(function (f) { return f !== fn; }); };
    },
    refresh: function () { if (started) { rebuild(); } },
    stats: function () {
      return {
        size: [W, H], dpr: dpr, canvas: [cv.width, cv.height], cell: CELL, fpsCap: Math.round(1000 / FRAME_MS), T: Math.round(T * 100) / 100,
        paused: isPaused(), userPaused: userPaused, motionOff: motionOff, staticFrame: staticMode(), running: !!(timer || raf),
        frames: frames, drawnFrames: drawnFrames, rebuilds: rebuilds, setupParts: setupParts, costMs: { place: +costMs.place.toFixed(1), decor: +costMs.decor.toFixed(1), scan: +costMs.scan.toFixed(1) }, guardMapMs: +guardMs.toFixed(2), model: model && model.kind, lastPlace: lastPlace,
        guardRange: gmap ? GROUPS.map(function (g) { var v = gmap.pts.map(function (p) { return p[g]; }); return g + " " + Math.min.apply(null, v).toFixed(2) + "-" + Math.max.apply(null, v).toFixed(2); }).join(", ") : null,
        scans: { n: scanStat.n, avgMs: scanStat.n ? +(scanStat.total / scanStat.n).toFixed(2) : 0, maxMs: +scanStat.max.toFixed(2), rects: scanStat.rects },
        prepares: { n: prepStat.n, avgMs: prepStat.n ? +(prepStat.total / prepStat.n).toFixed(2) : 0, maxMs: +prepStat.max.toFixed(2) },
        sets: slots.map(function (sl, s) {
          var S = sl.set;
          return S ? { slot: s, q: S.q, size: S.m + "x" + S.k + " · " + S.k + "x" + S.n, box: [OX + S.bx * B, S.by * B, S.cols * B, S.rows * B].map(Math.round),
            t: Math.round((T - S.start) * 10) / 10, dur: Math.round(S.dur * 10) / 10, early: S.early >= 0, guard: S.F } : { slot: s, next: Math.round((sl.next - T) * 10) / 10, ready: !!sl.ready };
        })
      };
    }
  };

  /* Forced colours on or off while the page is open: the CSS hides the canvas, the loop stops. */
  function onForced() {
    if (forced()) { if (started) { stopLoop(); } }
    else if (!started) { start(); }
    else { startLoop(); }
    notify();
  }
  if (fc) { if (fc.addEventListener) { fc.addEventListener("change", onForced); } else if (fc.addListener) { fc.addListener(onForced); } }

  /* Start in idle time once every web font is in (at most 3 s): the page has then reflowed to its
     final layout (the Overpass faces change line breaks), and the numbers are drawn in Overpass
     Mono, which is asked for explicitly in case no text on the page uses it. A font that arrives
     after the cap redraws the numbers and re-checks placement. */
  function go() {
    var done = false, late = false;
    function once() { if (!done) { done = true; idle(start, 2000); } }
    if (doc.fonts && doc.fonts.load && win.Promise) {
      var ready = Promise.all([doc.fonts.load("500 12px \"Overpass Mono\"").catch(function () {}), doc.fonts.ready]);
      ready.then(function () { if (late && started) { buildAtlas(); drawNow(); laterCover(150); } else { once(); } }, once);
      setTimeout(function () { if (!done) { late = true; once(); } }, 3000);
    } else { once(); }
  }
  if (doc.readyState === "loading") { doc.addEventListener("DOMContentLoaded", go); } else { go(); }
})();
