/* BTX Community · home.js (home page only, loaded with defer after site.js)
   6.18 Roadmap from 900px, three modes:
   - "phone"    (< 900px): the vertical route from site.css; nothing here runs.
   - "scroller" (reduced motion, ?motion=off, windows under 620px tall or too short for the row): the
                native sideways scroller from home.css; Earlier/Later scroll it by one stop.
   - "pinned"   (motion allowed, tall enough): the section is a tall wrapper, .rmap-pin sticks, and the
                page scroll moves the row 1:1 (extra scroll = the row's overflow width, never more).
   One passive scroll listener + requestAnimationFrame; transforms and class flips only in the frame;
   every measurement is cached and refreshed on resize (ResizeObserver), fonts.ready and details toggle. */
(function () {
  "use strict";

  var doc = document;
  var root = doc.documentElement;
  var sec = doc.querySelector("[data-rmap]");
  if (!sec || !window.matchMedia) { return; }
  var pin = sec.querySelector(".rmap-pin");
  var view = sec.querySelector("[data-rmap-view]");
  var track = sec.querySelector(".rmap-track");
  var list = sec.querySelector("ol.rmap");
  if (!pin || !view || !track || !list) { return; }
  var stops = Array.prototype.filter.call(list.children, function (n) { return n.classList.contains("rmap__stop"); });
  if (stops.length < 2) { return; }
  var prevBtn = sec.querySelector("[data-rmap-prev]");
  var nextBtn = sec.querySelector("[data-rmap-next]");
  var fill = sec.querySelector(".rmap-rail__fill");
  var railNow = sec.querySelector(".rmap-rail__now");

  var mqWide = window.matchMedia("(min-width: 900px)");
  var mqTall = window.matchMedia("(min-height: 620px)");
  var mqReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var forcedOff = /[?&]motion=off\b/.test(window.location.search);
  var REGION_LABEL = view.getAttribute("aria-label") || "Roadmap stops";
  var hasMix = !!(window.CSS && CSS.supports && CSS.supports("color", "color-mix(in srgb, red, red)"));

  var mode = "";
  var m = null;          // cached measurements for the current mode
  var near = true;       // section within a screen of the viewport (IntersectionObserver)
  var queued = false;
  var lastP = -1;
  var stepTo = -1;       // index in m.btn an Earlier/Later step is heading for (-1: none running)
  var moved = false;     // the reader has scrolled, typed or pointed since load
  var ptr = false;       // a pointer press is under way (its focus is not keyboard focus)
  var line = null, litOuter = null, litInner = null, tipOuter = null, tipInner = null;
  var nowIdx = -1;
  stops.forEach(function (s, i) { if (nowIdx < 0 && s.classList.contains("rmap__stop--now")) { nowIdx = i; } });
  // The row's last grid column (the terminus) is max-content; the others are full columns.
  list.style.setProperty("--rm-cols", String(stops.length - 1));

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function motionAllowed() {
    return !forcedOff && !mqReduce.matches && root.getAttribute("data-motion") !== "off";
  }
  function textOf(node) {
    if (!node) { return ""; }
    var c = node.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll(".sr-only"), function (s) { s.remove(); });
    return c.textContent.replace(/\s+/g, " ").trim();
  }

  // The rail's end labels repeat the first and last dates (aria-hidden; the stops carry them).
  var firstEnd = sec.querySelector("[data-rmap-first]");
  var lastEnd = sec.querySelector("[data-rmap-last]");
  if (firstEnd) { firstEnd.textContent = textOf(stops[0].querySelector(".rmap__when")) || textOf(stops[0].querySelector(".rmap__title")); }
  if (lastEnd) {
    var lastStop = stops[stops.length - 1];
    lastEnd.textContent = textOf(lastStop.querySelector(".rmap__when")) || textOf(lastStop.querySelector(".rmap__title"));
  }

  function makeLine() {
    if (line) { return; }
    line = doc.createElement("div");
    line.className = "rmap-line";
    line.setAttribute("aria-hidden", "true");
    var c = '<span class="rmap-line__c"></span>';
    line.innerHTML = '<span class="rmap-line__c rmap-line__dim"></span>' +
      '<span class="rmap-line__lit"><span class="rmap-line__in"><span class="rmap-line__glow">' + c + '</span>' + c + '</span></span>' +
      '<span class="rmap-line__tip"><span class="rmap-line__tipin"><span class="rmap-line__glow rmap-line__glow--tip">' + c + '</span></span></span>';
    track.insertBefore(line, list);
    litOuter = line.querySelector(".rmap-line__lit");
    litInner = line.querySelector(".rmap-line__in");
    tipOuter = line.querySelector(".rmap-line__tip");
    tipInner = line.querySelector(".rmap-line__tipin");
  }

  /* ---- Line colours from the stops' real positions (queue item 8) ------------------------------
     t = 0 at Genesis, 1 at "Now": ivory -> sky blue (t = .5) -> cobalt. Later stops stay rose (CSS). */
  function colourAt(t) {
    t = clamp(t, 0, 1);
    if (t <= 0.5) {
      var a = Math.round((1 - t * 2) * 1000) / 10;
      return a >= 100 ? "var(--line-s)" : "color-mix(in srgb, var(--line-s) " + a + "%, var(--line-m))";
    }
    var b = Math.round((2 - t * 2) * 1000) / 10;
    return b <= 0 ? "var(--line-n)" : "color-mix(in srgb, var(--line-m) " + b + "%, var(--line-n))";
  }
  var colourCache = [];
  function colourStops() {
    if (!hasMix) { return; }                          // plain-token fallback in home.css
    var last = nowIdx >= 0 ? nowIdx : stops.length - 1;
    var across = mqWide.matches;                      // one row from 900px, the vertical route below
    var base = list.getBoundingClientRect();
    var pos = [];
    for (var i = 0; i <= last; i += 1) {
      var dot = stops[i].querySelector(".rmap__dot");
      var r = (dot || stops[i]).getBoundingClientRect();
      pos.push(across ? r.left + r.width / 2 - base.left : r.top + r.height / 2 - base.top);
    }
    var span = pos[last] - pos[0];
    if (!(span > 0)) { return; }
    var cols = pos.map(function (v) { return colourAt((v - pos[0]) / span); });
    for (i = 0; i < last; i += 1) {
      var key = cols[i] + "|" + cols[i + 1];
      if (colourCache[i] === key) { continue; }
      colourCache[i] = key;
      stops[i].style.setProperty("--rm-c", cols[i]);
      stops[i].style.setProperty("--rm-cn", cols[i + 1]);
    }
  }

  /* ---- Mode ------------------------------------------------------------------------------------- */
  function setRegion(on) {
    if (on) {
      view.setAttribute("role", "region");
      view.setAttribute("aria-label", REGION_LABEL);
      view.setAttribute("tabindex", "0");
    } else {
      view.removeAttribute("role");
      view.removeAttribute("aria-label");
      view.removeAttribute("tabindex");
    }
  }
  function clearPinned() {
    sec.classList.remove("is-pinned", "has-moved"); // is-near belongs to the IntersectionObserver
    ["--rm-dist", "--rm-h", "--rm-pin-top"].forEach(function (p) { sec.style.removeProperty(p); });
    track.style.transform = "";
    stepTo = -1;
    stops.forEach(function (s) { s.classList.remove("is-lit"); });
    closeFloating();
  }
  // refitOnly (the ResizeObserver): only check that a pinned block still fits; never pin from here, so
  // "More detail" opening in place in the scroller cannot switch the mode under the reader.
  function decide(refitOnly) {
    if (refitOnly && mode !== "pinned") { measure(); return; }
    var next = "phone";
    if (mqWide.matches) {
      next = motionAllowed() && mqTall.matches ? "pinned" : "scroller";
    }
    if (next === "pinned") {
      if (mode !== "pinned") { makeLine(); sec.classList.add("is-pinned"); }
      // The header kit and the row must fit the window (the source note may wait below the fold until
      // the pin lets go); if not, scroll natively.
      if (coreHeight() > window.innerHeight - 12) { next = "scroller"; }
    }
    if (next !== "pinned") { clearPinned(); }
    if (next !== mode) {
      mode = next;
      setRegion(mode === "scroller");
      lastP = -1;
    }
    measure();
  }

  // Height of the pinned block without the source note under the row.
  function coreHeight() {
    return Math.ceil(view.getBoundingClientRect().bottom - pin.getBoundingClientRect().top);
  }

  /* ---- Measure (never in the scroll handler) ----------------------------------------------------- */
  function measure() {
    lastP = -1;
    stepTo = -1;
    colourStops();
    if (mode === "phone") { m = null; return; }
    var edge = list.offsetLeft;                       // track padding = content's left edge
    var cw = view.clientWidth;
    var L = [], R = [], D = [];
    stops.forEach(function (s) {
      var dot = s.querySelector(".rmap__dot");
      var holder = dot ? dot.parentElement : null;
      L.push(s.offsetLeft);
      R.push(s.offsetLeft + s.offsetWidth);
      D.push(s.offsetLeft + (holder ? holder.offsetLeft : 0) + (dot ? dot.offsetLeft + dot.offsetWidth / 2 : 14));
    });
    var n = stops.length;
    if (mode === "scroller") {
      m = { L: L, max: Math.max(0, view.scrollWidth - view.clientWidth) };
      update();
      return;
    }
    var span = cw - 2 * edge;                         // visible content width
    var dist = Math.max(0, Math.round(R[n - 1] - span));
    var d0 = D[0], dN = D[n - 1];
    var read = Math.max(1, dN - d0);
    // Where each stop's dot reaches the reading point, then moved on just enough to show the whole stop.
    var targets = D.map(function (d, i) {
      var p = (d - d0) / read;
      if (dist > 0) {
        p = Math.max(p, (R[i] - span) / dist);
        p = Math.min(p, L[i] / dist);
      }
      return clamp(p, 0, 1);
    });
    targets[0] = 0; targets[n - 1] = 1;
    // Earlier/Later: one column per step, with a stop on the content's left edge; the last step ends at p = 1.
    var btn = L.map(function (l) { return dist > 0 ? clamp(l / dist, 0, 1) : 0; })
      .filter(function (p, i, a) { return i === 0 || p - a[i - 1] > 1e-4; });
    // The block sticks centred in the window; the section is as tall as its top padding + the block +
    // the distance, so the block stays stuck for exactly `dist` px of scroll. The pin starts at `start`.
    var h = pin.offsetHeight, vh = window.innerHeight;
    // Centred when the whole block fits; otherwise the row's foot sits 12px above the window's bottom
    // edge and the source note follows once the pin lets go.
    var stick = h <= vh ? Math.round((vh - h) / 2) : Math.max(0, Math.round(vh - 12 - coreHeight()));
    var padTop = parseFloat(window.getComputedStyle(sec).paddingTop) || 0;
    var secTop = sec.getBoundingClientRect().top + window.pageYOffset;
    sec.style.setProperty("--rm-pin-top", stick + "px");
    sec.style.setProperty("--rm-h", Math.ceil(padTop + h + dist) + "px");
    sec.style.setProperty("--rm-dist", dist + "px");
    m = {
      edge: edge, cw: cw, span: span, dist: dist, L: L, R: R, D: D, d0: d0, dN: dN, read: read,
      targets: targets, btn: btn, top: Math.round(secTop + padTop - stick), total: edge + dN,
      lit: stops.map(function () { return null; }), tipW: 0, vh: vh
    };
    // The line runs from the window's left edge to the terminus: ivory up to Genesis, sky blue halfway
    // to "Now", cobalt at "Now", then a 40px blend into rose; solid up to "Now", dashed after it.
    var g0 = edge + d0, gn = edge + (nowIdx >= 0 ? D[nowIdx] : dN);
    line.style.setProperty("--rm-total", m.total + "px");
    line.style.setProperty("--rm-g0", g0.toFixed(1) + "px");
    line.style.setProperty("--rm-gm", ((g0 + gn) / 2).toFixed(1) + "px");
    line.style.setProperty("--rm-gn", gn.toFixed(1) + "px");
    line.style.setProperty("--rm-gr", (gn + 40).toFixed(1) + "px");
    m.tipW = tipOuter ? tipOuter.offsetWidth : 0;
    if (railNow) { railNow.style.setProperty("--rm-now", ((nowIdx >= 0 ? targets[nowIdx] : 1) * 100).toFixed(2) + "%"); }
    update();
  }

  /* ---- Frame ------------------------------------------------------------------------------------ */
  function setDisabled(btn, off) {
    if (!btn) { return; }
    var v = off ? "true" : "false";
    if (btn.getAttribute("aria-disabled") !== v) { btn.setAttribute("aria-disabled", v); }
  }
  function currentP() {
    if (!m || !m.dist) { return 0; }
    return clamp((window.pageYOffset - m.top) / m.dist, 0, 1);
  }
  function update() {
    queued = false;
    if (!m) { return; }
    if (mode === "scroller") {
      var x = view.scrollLeft;
      var sp = m.max ? clamp(x / m.max, 0, 1) : 0;
      if (fill) { fill.style.transform = "scaleX(" + sp.toFixed(4) + ")"; }
      setDisabled(prevBtn, x <= 1);
      setDisabled(nextBtn, x >= m.max - 1);
      return;
    }
    if (stepTo >= 0 && Math.abs(window.pageYOffset - yFor(m.btn[stepTo])) <= 1) { stepTo = -1; }
    var p = currentP();
    if (Math.abs(p - lastP) < 1e-5) { return; }
    lastP = p;
    track.style.transform = "translate3d(" + (-p * m.dist).toFixed(2) + "px, 0, 0)";
    var readX = m.d0 + p * m.read;                    // reading point, in row coordinates
    var f = clamp((m.edge + readX) / m.total, 0, 1);
    var off = ((1 - f) * 100).toFixed(3);
    litOuter.style.transform = "translate3d(-" + off + "%, 0, 0)";
    litInner.style.transform = "translate3d(" + off + "%, 0, 0)";
    if (tipOuter) {
      // The brighter tip window ends 16px past the reading point (over the lit window's feathered end)
      // and fades in from its left edge and out at its right.
      var tx = (m.edge + readX - m.tipW + 16).toFixed(2);
      tipOuter.style.transform = "translate3d(" + tx + "px, 0, 0)";
      tipInner.style.transform = "translate3d(" + (-tx) + "px, 0, 0)";
    }
    for (var i = 0; i < stops.length; i += 1) {
      // A stop's target is rounded to whole scroll pixels (about 1.5 row px each): allow for that.
      var on = readX >= m.D[i] - 2;
      if (m.lit[i] !== on) { m.lit[i] = on; stops[i].classList.toggle("is-lit", on); }
    }
    if (fill) { fill.style.transform = "scaleX(" + p.toFixed(4) + ")"; }
    if (p > 0.002 && !sec.classList.contains("has-moved")) { sec.classList.add("has-moved"); }
    setDisabled(prevBtn, p <= m.btn[0] + 1e-4);
    setDisabled(nextBtn, p >= m.btn[m.btn.length - 1] - 1e-4);
  }
  function queue() {
    if (queued || !near || mode === "phone") { return; }
    queued = true;
    window.requestAnimationFrame(update);
  }
  window.addEventListener("scroll", function () {
    if (mode !== "pinned") { return; }
    // A jump (a link, the End key) can land in the section before the IntersectionObserver reports it:
    // judge from the cached geometry and apply the position at once, so the first frame is already true.
    if (!near && m) {
      var y = window.pageYOffset;
      if (y > m.top - 2 * m.vh && y < m.top + m.dist + 2 * m.vh) {
        near = true;
        sec.classList.add("is-near");
        update();
        return;
      }
    }
    queue();
  }, { passive: true });
  view.addEventListener("scroll", function () { if (mode === "scroller") { queue(); } }, { passive: true });

  /* ---- Moving to a stop ------------------------------------------------------------------------- */
  function scrollBehavior() { return motionAllowed() ? "smooth" : "auto"; }
  function yFor(p) { return Math.round(m.top + p * m.dist); }
  function goTo(p, behavior) {
    var y = yFor(p);
    if (Math.abs(y - window.pageYOffset) < 1) { return; }
    window.scrollTo({ top: y, left: 0, behavior: behavior || "auto" });
  }
  function step(dir) {
    if (!m) { return; }
    var i;
    if (mode === "scroller") {
      var x = view.scrollLeft, to = null;
      if (dir > 0) { for (i = 0; i < m.L.length; i += 1) { if (m.L[i] > x + 2) { to = m.L[i]; break; } } }
      else { for (i = m.L.length - 1; i >= 0; i -= 1) { if (m.L[i] < x - 2) { to = m.L[i]; break; } } }
      if (to === null) { to = dir > 0 ? m.max : 0; }
      view.scrollTo({ left: Math.min(to, m.max), behavior: scrollBehavior() });
      return;
    }
    // Pinned: the next stop-aligned position along the line (not from scrollY, so the first press above
    // the pin already moves the row). While a smooth step is still running, a further press goes one on.
    var t = m.btn, k = -1;
    if (stepTo >= 0 && Math.abs(window.pageYOffset - yFor(t[stepTo])) > 1) {
      k = clamp(stepTo + dir, 0, t.length - 1);
    } else {
      var p = currentP();
      if (dir > 0) { for (i = 0; i < t.length; i += 1) { if (t[i] > p + 1e-4) { k = i; break; } } }
      else { for (i = t.length - 1; i >= 0; i -= 1) { if (t[i] < p - 1e-4) { k = i; break; } } }
    }
    if (k < 0) { return; }
    stepTo = k;
    goTo(t[k], scrollBehavior());
  }
  // A wheel or touch scroll takes over from a running step.
  ["wheel", "touchstart"].forEach(function (type) {
    window.addEventListener(type, function () { stepTo = -1; }, { passive: true });
  });
  if ("onscrollend" in window) { window.addEventListener("scrollend", function () { stepTo = -1; }, { passive: true }); }
  function onStep(dir) {
    return function (e) {
      if (e.currentTarget.getAttribute("aria-disabled") === "true") { return; }
      step(dir);
    };
  }
  if (prevBtn) { prevBtn.addEventListener("click", onStep(-1)); }
  if (nextBtn) { nextBtn.addEventListener("click", onStep(1)); }

  function stopIndex(node) {
    var s = node && node.closest ? node.closest(".rmap__stop") : null;
    return s ? stops.indexOf(s) : -1;
  }
  // Brings stop i fully into view while pinned, unless it is already fully in the window: keyboard focus
  // goes to the stop's own target (the whole stop shows and its dot is lit); `nearest` (a pointer opening
  // "More detail") moves only as far as needed to show the whole stop. The frame for the current scroll
  // position is applied first: Chrome's focus scroll runs before focusin, while the scroll-queued frame
  // has not yet moved the row, so measuring straight away would read a stale layout.
  function showStop(i, nearest) {
    if (mode !== "pinned" || !m || i < 0) { return; }
    lastP = -1;
    update();
    var r = stops[i].getBoundingClientRect();         // a focus/toggle handler, not the scroll handler
    var pad = 6;                                       // room for the 3px focus ring and its 2px offset
    if (r.left >= pad && r.right <= root.clientWidth - pad && r.top >= pad && r.bottom <= window.innerHeight - pad) { return; }
    var p = m.targets[i];
    if (nearest && m.dist > 0) {
      p = clamp(currentP(), clamp((m.R[i] - m.span) / m.dist, 0, 1), clamp(m.L[i] / m.dist, 0, 1));
    }
    goTo(p, "auto");
    lastP = -1;
    update();
  }
  // Pointer presses focus a summary on mousedown in Chrome: moving the row then would pull it from under
  // the pointer and lose the click. Only keyboard focus moves the page; a click is handled on toggle.
  list.addEventListener("pointerdown", function () { ptr = true; }, true);
  doc.addEventListener("click", function () { ptr = false; }, true);
  doc.addEventListener("keydown", function () { ptr = false; }, true);
  function keyboardFocus(t) {
    if (ptr) { return false; }
    try { return t.matches(":focus-visible"); } catch (err) { return true; }
  }
  // Keyboard: focus entering a stop (its summary, a source link, the panel) brings the whole stop into view.
  list.addEventListener("focusin", function (e) {
    var i = stopIndex(e.target);
    if (i < 0 || !keyboardFocus(e.target)) { return; }
    if (mode === "scroller") {
      // Chrome's own focus scroll is undone by the mandatory snap, which leaves the stop cut at the
      // edge. Scroll to the stop's own snap target (the one Earlier/Later use), now and next frame.
      var fit = function () {
        if (!m) { return; }
        var v = view.getBoundingClientRect(), r = stops[i].getBoundingClientRect();
        if (r.left < v.left + 1 || r.right > v.right - 1) { view.scrollTo({ left: Math.min(m.L[i], m.max), behavior: "auto" }); }
      };
      fit();
      window.requestAnimationFrame(fit);
      return;
    }
    if (mode !== "pinned") { return; }
    showStop(i);
    // The browser's own scroll-into-view for focus may run after this: settle once more next frame.
    window.requestAnimationFrame(function () { showStop(i); });
  });
  // A floating panel closes when keyboard focus moves on to something outside it (not when the reader
  // switches window or tab: relatedTarget is then null), so a later Esc never sends the reader back.
  list.addEventListener("focusout", function (e) {
    if (mode !== "pinned") { return; }
    var d = e.target.closest ? e.target.closest(".rmap__more[open]") : null;
    if (d && e.relatedTarget && !d.contains(e.relatedTarget)) { d.open = false; }
  });
  // Links to #roadmap-<stop> land with that stop at the reading point.
  function goToHash() {
    if (mode !== "pinned" || !m) { return; }
    var id = window.location.hash.slice(1);
    if (!id) { return; }
    var t = null;
    try { t = doc.getElementById(decodeURIComponent(id)); } catch (e) { t = null; }
    var i = stopIndex(t);
    if (i >= 0) { goTo(m.targets[i], "auto"); return; }
    // #roadmap (or its heading) lands on the start of the line, pinned, rather than above the pin.
    if (t === sec || (t && t.id === "roadmap-title")) { goTo(0, "auto"); }
  }
  window.addEventListener("hashchange", function () { window.requestAnimationFrame(goToHash); });
  doc.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a[href*='#roadmap']") : null;
    if (a && a.hash && a.hash === window.location.hash && a.pathname === window.location.pathname) {
      window.requestAnimationFrame(goToHash);
    }
  });

  /* ---- "More detail" while pinned: a floating panel that stays inside the window ---------------- */
  function closeFloating() {
    Array.prototype.forEach.call(list.querySelectorAll(".rmap__more"), function (d) { resetPanel(d); });
  }
  function resetPanel(d) {
    d.classList.remove("rmap__more--up", "rmap__more--end");
    var body = d.querySelector(".more__body");
    if (!body) { return; }
    body.style.removeProperty("--more-max");
    if (body.hasAttribute("data-rmap-scroll")) {
      body.removeAttribute("data-rmap-scroll");
      body.removeAttribute("tabindex");
      body.removeAttribute("role");
      body.removeAttribute("aria-label");
    }
  }
  function placePanel(d) {
    var body = d.querySelector(".more__body");
    var summary = d.querySelector("summary");
    if (!body || !summary) { return; }
    resetPanel(d);
    var gap = 16;
    var vw = root.clientWidth, vh = window.innerHeight;
    var s = summary.getBoundingClientRect();
    var h = body.scrollHeight;
    var below = vh - s.bottom - gap, above = s.top - gap;
    var up = h > below && above > below;
    var room = up ? above : below;
    if (up) { d.classList.add("rmap__more--up"); }
    if (h > room) {
      body.style.setProperty("--more-max", Math.max(120, Math.floor(room)) + "px");
      body.setAttribute("data-rmap-scroll", "");
      body.setAttribute("tabindex", "0");
      body.setAttribute("role", "region");
      body.setAttribute("aria-label", "More detail on " + textOf(d.closest(".rmap__stop").querySelector(".rmap__title")));
    }
    var b = d.getBoundingClientRect();
    if (b.left + body.offsetWidth > vw - gap) { d.classList.add("rmap__more--end"); }
  }
  list.addEventListener("toggle", function (e) {
    var d = e.target;
    if (!d.classList || !d.classList.contains("rmap__more")) { return; }
    if (mode !== "pinned") { resetPanel(d); measure(); return; }
    if (!d.open) { resetPanel(d); return; }
    // Keyboard focus has already brought the stop into view; a click on a part-hidden stop moves the row
    // only as far as needed, so the stop stays near the pointer.
    showStop(stopIndex(d), true);
    // Place it once the page has settled on the stop.
    window.requestAnimationFrame(function () { if (d.open) { placePanel(d); } });
  }, true);

  /* ---- Keep the measurements true ------------------------------------------------------------- */
  // One frame-queued job; the stronger request wins, so a full mode decision (2, resize and media
  // changes) is never swallowed by a refit (1, the ResizeObserver).
  var pending = 0, framed = false;
  function schedule(level) {
    if (level > pending) { pending = level; }
    if (framed) { return; }
    framed = true;
    window.requestAnimationFrame(function () {
      var job = pending;
      pending = 0; framed = false;
      decide(job === 1);
    });
  }
  function onResize() { schedule(2); }
  window.addEventListener("resize", onResize, { passive: true });
  [mqWide, mqTall, mqReduce].forEach(function (q) {
    if (q.addEventListener) { q.addEventListener("change", onResize); } else if (q.addListener) { q.addListener(onResize); }
  });
  if (typeof ResizeObserver === "function") {
    // Content above the roadmap (route cards opening) moves the section; the row itself can change width;
    // the pinned block can grow (text spacing, zoom) until it no longer fits: check the fit again (and
    // re-measure); it then falls back to the scroller. Pinning and unpinning within one callback leaves
    // the sizes as they were, so the observer does not loop.
    var ro = new ResizeObserver(function () { schedule(1); });
    ro.observe(doc.body);
    ro.observe(list);
    ro.observe(pin);
  }
  // A late font load re-applies a hash link only if the reader has not moved since.
  ["wheel", "touchstart", "keydown", "pointerdown"].forEach(function (type) {
    window.addEventListener(type, function () { moved = true; }, { passive: true, once: true });
  });
  if (doc.fonts && doc.fonts.ready) { doc.fonts.ready.then(function () { decide(); if (!moved) { goToHash(); } }); }
  if (typeof IntersectionObserver === "function") {
    var io = new IntersectionObserver(function (entries) {
      near = entries[entries.length - 1].isIntersecting;
      sec.classList.toggle("is-near", near);
      if (near) { lastP = -1; queue(); }
    }, { rootMargin: "100% 0px 100% 0px" });
    io.observe(sec);
  }

  decide();
  goToHash();
}());
