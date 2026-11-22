/* Ongoing work (/dev/work/), page-only behaviour:
   1. The nightly CI-0 panel: reads ci.json from the status page's public API, validates it as the
      original ci.js does, and renders one board per branch (newest release first). Values are only
      ever written with textContent. Polling: on load, then every 30 minutes while the tab is visible
      (and on return to the tab when the data is older than that); a 10 s timeout; only the newest
      request may paint. Without a usable answer the panel shows one status line.
   2. Lane filters (kind, waiting for an owner, expand all, reset), the class filter and the area sort.
   3. Table boxes become a focusable, named scroll region only while they really scroll.
   Everything here is progressive: without JS every lane, class and area is in the page. */
(function () {
  "use strict";

  var doc = document;
  function $all(sel, scope) { return Array.prototype.slice.call((scope || doc).querySelectorAll(sel)); }

  /* ---------------------------------------------------------------------------------------
     1. Nightly CI-0 (ported from the original /static/js/ci.js)
     --------------------------------------------------------------------------------------- */
  var TIMEOUT_MS = 10000;
  var REFRESH_MS = 30 * 60000;
  var STALE_MS = 36 * 3600000;
  var SKEW_MS = 10 * 60000;
  var MAX_COUNT = 10000000;
  var MAX_NAMES = 2000;
  var MAX_NAME = 200;
  var MAX_RUNS = 10;
  var BRANCH = /^[A-Za-z0-9._][A-Za-z0-9._\/-]{0,99}$/;
  var COMMIT = /^[0-9a-f]{7,40}$/;
  var RELEASE = /^release-(\d{1,6})\.(\d{1,6})(?:\.(\d{1,6}))?$/;
  var TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:\d{2})$/;

  var TEXT = {
    none: "No current run.",
    stale: "Last run is older than 36 h; the figures below may be out of date.",
    error: "CI data unavailable. The runs as raw data are linked below.",
    refreshError: "Could not refresh the CI data. The runs below are from the last answer that could be read.",
    runStale: "This run is older than 36 h; its figures may be out of date.",
    ok: "Build passed",
    failed: "Build failed",
    notRun: "Tests not run",
    newFailures: "New failures, not on the branch's known-failing list ({count})",
    knownPassed: "Known-failing tests that passed this time ({count})",
    failedUnit: "Failed unit suites ({count})",
    failedFunctional: "Failed functional scripts ({count})",
    namesOf: "{listed} of {failed}",
    more: "… and {count} more"
  };

  function isObject(v) { return v !== null && typeof v === "object" && !Array.isArray(v); }
  function count(v) { return Number.isInteger(v) && v >= 0 && v <= MAX_COUNT ? v : null; }
  function instant(text) {
    if (typeof text !== "string" || !TIME.test(text)) { return null; }
    var time = Date.parse(text);
    return isNaN(time) ? null : new Date(time);
  }
  // Failed test names: only a list of plain strings; long names cut, at most MAX_NAMES kept.
  function names(list) {
    if (!Array.isArray(list)) { return null; }
    for (var i = 0; i < list.length; i += 1) { if (typeof list[i] !== "string") { return null; } }
    var kept = list.slice(0, MAX_NAMES).map(function (n) { return n.length > MAX_NAME ? n.slice(0, MAX_NAME - 1) + "…" : n; });
    return { names: kept, total: list.length };
  }
  // Lists the panel can do without: null when absent, broken or longer than their count.
  function optionalNames(list, most) {
    var parsed = names(list);
    return parsed !== null && parsed.total <= most ? parsed : null;
  }
  function suite(value, withSkipped) {
    if (value === null) { return { ran: false }; }
    if (!isObject(value)) { return null; }
    var run = count(value.run), passed = count(value.passed), failed = count(value.failed);
    var skipped = withSkipped ? count(value.skipped) : 0;
    var failedNames = names(value.failed_names);
    if (run === null || passed === null || failed === null || skipped === null || failedNames === null) { return null; }
    if (passed + failed + skipped > run) { return null; }
    return {
      ran: true, run: run, passed: passed, failed: failed, skipped: skipped,
      names: failedNames.names, listed: failedNames.total,
      fresh: optionalNames(value.new_failures, failed),
      again: optionalNames(value.known_but_passed, passed)
    };
  }
  function parseRun(value, now) {
    if (!isObject(value) || typeof value.stale !== "boolean") { return null; }
    var measured = instant(value.measured_at), finished = instant(value.finished_at);
    if (typeof value.branch !== "string" || !BRANCH.test(value.branch) || value.branch.indexOf("..") !== -1 ||
        typeof value.commit !== "string" || !COMMIT.test(value.commit) || measured === null || finished === null) { return null; }
    // A run that ends in the future or before it was measured is a wrong clock or a broken record.
    if (finished.getTime() > now + SKEW_MS || measured.getTime() > finished.getTime()) { return null; }
    var build = value.build;
    if (!isObject(build) || typeof build.configure_ok !== "boolean" || typeof build.build_ok !== "boolean") { return null; }
    if (!isObject(value.suites)) { return null; }
    var unit = suite(value.suites.unit, false), functional = suite(value.suites.functional, true);
    if (unit === null || functional === null) { return null; }
    return {
      flagged: value.stale, stale: value.stale || now - finished.getTime() > STALE_MS,
      branch: value.branch, commit: value.commit, measured: measured, finished: finished,
      buildOk: build.configure_ok && build.build_ok, unit: unit, functional: functional
    };
  }
  // Newest release first, compared as numbers; other branch names keep the order of the answer.
  function newestFirst(runs) {
    var keys = runs.map(function (r) {
      var m = RELEASE.exec(r.branch);
      return m ? [Number(m[1]), Number(m[2]), Number(m[3] || 0)] : null;
    });
    if (keys.indexOf(null) !== -1) { return runs; }
    var order = runs.map(function (r, i) { return i; });
    order.sort(function (a, b) {
      for (var i = 0; i < 3; i += 1) { if (keys[a][i] !== keys[b][i]) { return keys[b][i] - keys[a][i]; } }
      return a - b;
    });
    return order.map(function (i) { return runs[i]; });
  }
  // runs[] holds one run per branch; the top level carries one run too. Fall back to the top-level
  // run when the list is absent, empty, too long or has an entry that fails the checks.
  function runList(list, top, now) {
    if (!Array.isArray(list) || list.length === 0 || list.length > MAX_RUNS) { return [top]; }
    var runs = [];
    for (var i = 0; i < list.length; i += 1) {
      var r = parseRun(list[i], now);
      if (r === null) { return [top]; }
      runs.push(r);
    }
    return newestFirst(runs);
  }
  function parseCi(text, expected, now) {
    var d;
    try { d = JSON.parse(text); } catch (e) { return { state: "error" }; }
    if (!isObject(d) || d.schema_version !== 1) { return { state: "error" }; }
    if (d.available === false || typeof d.reason === "string") { return { state: "none" }; }
    if (d.available !== true || d.reason != null) { return { state: "error" }; }
    if (d.repository !== expected.repo || d.job !== expected.job) { return { state: "error" }; }
    var top = parseRun(d, now);
    if (top === null) { return { state: "error" }; }
    return { state: "run", runs: runList(d.runs, top, now) };
  }

  function two(n) { return (n < 10 ? "0" : "") + n; }
  function formatTime(date) {
    return date.getUTCFullYear() + "-" + two(date.getUTCMonth() + 1) + "-" + two(date.getUTCDate()) +
      " " + two(date.getUTCHours()) + ":" + two(date.getUTCMinutes()) + " UTC";
  }
  function fill(template, values) {
    return String(template || "").replace(/\{([a-z]+)\}/g, function (m, k) {
      return Object.prototype.hasOwnProperty.call(values, k) ? values[k] : m;
    });
  }
  function num(n) { return n.toLocaleString("en-GB"); }

  function failedView(value, template) {
    if (!value.names.length) { return null; }
    var c = value.listed < value.failed ? fill(TEXT.namesOf, { listed: num(value.listed), failed: num(value.failed) }) : num(value.failed);
    var dropped = value.listed - value.names.length;
    return { summary: fill(template, { count: c }), names: value.names, more: dropped > 0 ? fill(TEXT.more, { count: num(dropped) }) : null };
  }
  function joinedView(lists, template) {
    var kept = [], total = 0;
    lists.forEach(function (l) { if (l) { kept = kept.concat(l.names); total += l.total; } });
    if (!kept.length) { return null; }
    kept = kept.slice(0, MAX_NAMES);
    var dropped = total - kept.length;
    return { summary: fill(template, { count: num(total) }), names: kept, more: dropped > 0 ? fill(TEXT.more, { count: num(dropped) }) : null };
  }

  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) { n.className = cls; }
    if (text != null) { n.textContent = text; }
    return n;
  }
  function part(block, name) { return block.querySelector('[data-r="' + name + '"]'); }

  // "2,438 of 2,439 passed" with the "of …" part smaller; the sub line says what the rest did.
  function fillSuite(block, name, value, withSkipped) {
    var val = part(block, name), sub = part(block, name + "-sub");
    val.textContent = "";
    sub.textContent = "";
    if (!value.ran) { val.textContent = TEXT.notRun; val.classList.add("board__val"); sub.hidden = true; return; }
    val.appendChild(doc.createTextNode(num(value.passed) + " "));
    val.appendChild(el("small", null, "of " + num(value.run) + " passed"));
    var bits = [num(value.failed) + " failed"];
    if (withSkipped) { bits.push(num(value.skipped) + " skipped"); }
    if (value.fresh !== null && value.failed > 0) {
      bits.push(num(value.fresh.total) + " new", num(value.failed - value.fresh.total) + " known");
    }
    bits.forEach(function (b, i) {
      // Overpass sets its middle dot off-centre: a drawn dot (.sep) with a space on each side.
      if (i) {
        var sep = el("span", "sep");
        sep.setAttribute("aria-hidden", "true");
        sub.appendChild(doc.createTextNode(" "));
        sub.appendChild(sep);
        sub.appendChild(doc.createTextNode(" "));
      }
      sub.appendChild(el("span", null, b));
    });
  }
  function addList(holder, view, id) {
    if (!view) { return; }
    var d = el("details", "more");
    var s = el("summary");
    s.appendChild(el("span", null, view.summary));
    var pm = el("span", "pm pm--sm");
    pm.setAttribute("aria-hidden", "true");
    s.appendChild(pm);
    d.appendChild(s);
    var body = el("div", "more__body");
    var ul = el("ul");
    view.names.forEach(function (n) { var li = el("li"); li.appendChild(el("code", null, n)); ul.appendChild(li); });
    if (view.more) { ul.appendChild(el("li", "dw-run__more", view.more)); }
    body.appendChild(ul);
    d.appendChild(body);
    holder.appendChild(d);
  }

  function renderRun(tpl, run, repo, allStale, index) {
    var block = tpl.content.firstElementChild.cloneNode(true);
    var titleId = "ci-run-" + index + "-title";
    var title = part(block, "title");
    title.id = titleId;
    block.setAttribute("aria-labelledby", titleId);
    part(block, "branch").textContent = run.branch;
    var stale = part(block, "stale");
    if (run.stale && !allStale) { stale.hidden = false; stale.textContent = TEXT.runStale; }
    var build = part(block, "build");
    build.classList.add(run.buildOk ? "is-normal" : "is-incident");
    build.querySelector(".shape").textContent = run.buildOk ? "●" : "■";
    part(block, "build-word").textContent = run.buildOk ? TEXT.ok : TEXT.failed;
    var ref = part(block, "ref");
    ref.appendChild(doc.createTextNode(run.branch + " @ "));
    var a = el("a");
    a.href = "https://github.com/" + repo + "/commit/" + run.commit;
    a.rel = "noopener noreferrer";
    a.appendChild(doc.createTextNode(run.commit + " "));
    var arr = el("span", "arr", "↗");
    arr.setAttribute("aria-hidden", "true");
    a.appendChild(arr);
    a.appendChild(el("span", "sr-only", " on GitHub (opens another site)"));
    ref.appendChild(a);
    fillSuite(block, "unit", run.unit, false);
    fillSuite(block, "functional", run.functional, true);
    var lists = part(block, "lists");
    addList(lists, joinedView([run.unit.fresh, run.functional.fresh], TEXT.newFailures));
    addList(lists, joinedView([run.unit.again, run.functional.again], TEXT.knownPassed));
    if (run.unit.ran) { addList(lists, failedView(run.unit, TEXT.failedUnit)); }
    if (run.functional.ran) { addList(lists, failedView(run.functional, TEXT.failedFunctional)); }
    if (!lists.firstChild) { lists.parentNode.removeChild(lists); }
    var started = part(block, "started"), finished = part(block, "finished");
    started.appendChild(doc.createTextNode("Started "));
    started.appendChild(el("span", "dw-run__time", formatTime(run.measured)));
    finished.appendChild(doc.createTextNode("Finished "));
    finished.appendChild(el("span", "dw-run__time", formatTime(run.finished)));
    return block;
  }

  function initCi() {
    var root = doc.querySelector("[data-ci-root]");
    if (!root || typeof fetch !== "function") { return; }
    var statusLine = root.querySelector('[data-ci="status"]');
    var holder = root.querySelector('[data-ci="runs"]');
    var loading = root.querySelector('[data-ci="loading"]');
    var tpl = root.querySelector('template[data-ci="tpl"]');
    if (!statusLine || !holder || !tpl || !tpl.content) { return; }
    var expected = { repo: root.getAttribute("data-repo"), job: root.getAttribute("data-job") };
    var seq = 0, lastLoad = 0, painted = false, lastRuns = null;

    function setStatus(text, warn) {
      statusLine.classList.toggle("board__msg", Boolean(warn && text));
      if (statusLine.textContent !== (text || "")) { statusLine.textContent = text || ""; }
    }
    function paint(runs, refreshFailed) {
      var allStale = runs.every(function (r) { return r.stale; });
      if (refreshFailed) { setStatus(TEXT.refreshError + (allStale ? " " + TEXT.stale : ""), true); }
      else { setStatus(allStale ? TEXT.stale : "", allStale); }
      var frag = doc.createDocumentFragment();
      runs.forEach(function (r, i) { frag.appendChild(renderRun(tpl, r, expected.repo, allStale, i)); });
      holder.textContent = "";
      holder.appendChild(frag);
      painted = true;
    }
    function show(text) {
      if (loading) { loading.hidden = true; }
      var now = Date.now();
      var parsed = typeof text === "string" ? parseCi(text, expected, now) : { state: "error" };
      if (parsed.state === "run") { lastRuns = parsed.runs; paint(lastRuns, false); return; }
      if (parsed.state === "error" && painted && lastRuns) {
        // A failed refresh keeps the runs of the last good answer, says so, and rechecks their age
        // so the 36 h note still appears in a tab left open.
        lastRuns.forEach(function (r) { r.stale = r.flagged || now - r.finished.getTime() > STALE_MS; });
        paint(lastRuns, true);
        return;
      }
      setStatus(parsed.state === "none" ? TEXT.none : TEXT.error, true);
      holder.textContent = "";
      painted = false;
      lastRuns = null;
    }
    function load() {
      var mine = ++seq;
      lastLoad = Date.now();
      var ctrl = typeof AbortController === "function" ? new AbortController() : null;
      var settled = false;
      function done(text) {
        if (settled) { return; }
        settled = true;
        window.clearTimeout(timer);
        if (mine === seq) { show(text); }
      }
      var timer = window.setTimeout(function () { if (ctrl) { ctrl.abort(); } done(null); }, TIMEOUT_MS);
      // The loading line is not a live region, so it is not announced on every visit.
      if (!painted && loading) { loading.hidden = false; }
      var init = { cache: "no-store", credentials: "omit" };
      if (ctrl) { init.signal = ctrl.signal; }
      fetch(root.getAttribute("data-api"), init)
        .then(function (r) { return r.ok ? r.text() : null; })
        .then(done, function () { done(null); });
    }
    try { load(); } catch (e) { setStatus(TEXT.error, true); }
    window.setInterval(function () { if (!doc.hidden && Date.now() - lastLoad >= REFRESH_MS) { load(); } }, 60000);
    doc.addEventListener("visibilitychange", function () {
      if (!doc.hidden && Date.now() - lastLoad >= REFRESH_MS) { load(); }
    });
  }

  /* ---------------------------------------------------------------------------------------
     2. Lanes: filter by kind and by "waiting for an owner", expand or collapse all, reset.
     --------------------------------------------------------------------------------------- */
  function setPressed(buttons, active) {
    buttons.forEach(function (b) { b.setAttribute("aria-pressed", b === active ? "true" : "false"); });
  }

  function initLanes() {
    var tools = doc.querySelector("[data-lane-tools]");
    if (!tools) { return; }
    var lanes = $all(".dw-lane");
    var groups = $all(".dw-group");
    var kinds = $all("[data-kind]", tools).filter(function (b) { return b.tagName === "BUTTON"; });
    var waiting = tools.querySelector("[data-waiting-only]");
    var expand = tools.querySelector("[data-expand]");
    var shown = tools.querySelector("[data-lane-shown]");
    var empty = doc.querySelector("[data-lane-empty]");
    var kind = "all";

    function visible() { return lanes.filter(function (l) { return !l.parentNode.classList.contains("is-out"); }); }
    function syncExpand() {
      var vis = visible();
      var allOpen = vis.length > 0 && vis.every(function (l) { return l.open; });
      expand.setAttribute("aria-expanded", allOpen ? "true" : "false");
      expand.textContent = allOpen ? "Collapse all lanes" : "Expand all lanes";
    }
    function apply() {
      var onlyWaiting = waiting.checked;
      var n = 0;
      lanes.forEach(function (l) {
        var ok = (kind === "all" || l.getAttribute("data-kind") === kind) &&
          (!onlyWaiting || l.getAttribute("data-waiting") === "1");
        // A class, not the hidden attribute: Copy for your AI still copies every lane (as on /links/).
        l.parentNode.classList.toggle("is-out", !ok);
        if (ok) { n += 1; }
      });
      groups.forEach(function (g) {
        var all = g.querySelectorAll(".dw-lanes > li").length;
        var on = g.querySelectorAll(".dw-lanes > li:not(.is-out)").length;
        g.classList.toggle("is-out", on === 0);
        // The heading's count follows the filter ("3 of 8"). Screen readers hear "8 lanes, 3 shown"
        // from a second line that Copy for your AI skips, so the copy still names all 8.
        var txt = on === all ? String(all) : on + " of " + all;
        var c = g.querySelector(".dw-count"), h = g.querySelector("h3"), sr = h.querySelector(".dw-shown-sr");
        if (c && c.textContent !== txt) { c.textContent = txt; }
        if (!sr) {
          sr = el("span", "sr-only dw-shown-sr");
          sr.setAttribute("data-copy-skip", "");
          var total = h.querySelector(".sr-only");
          h.insertBefore(sr, total ? total.nextSibling : c);
        }
        sr.textContent = on === all ? "" : ", " + on + " shown";
      });
      var label = n + " of " + lanes.length + " lanes";
      if (shown.textContent !== label) { shown.textContent = label; }
      empty.hidden = n > 0;
      syncExpand();
    }
    kinds.forEach(function (b) {
      b.addEventListener("click", function () { kind = b.getAttribute("data-kind"); setPressed(kinds, b); apply(); });
    });
    waiting.addEventListener("change", apply);
    expand.addEventListener("click", function () {
      var open = expand.getAttribute("aria-expanded") !== "true";
      visible().forEach(function (l) { l.open = open; });
      syncExpand();
    });
    $all("[data-reset]").forEach(function (b) {
      b.addEventListener("click", function () {
        kind = "all";
        setPressed(kinds, kinds[0]);
        waiting.checked = false;
        lanes.forEach(function (l) { l.open = false; });
        apply();
      });
    });
    lanes.forEach(function (l) { l.addEventListener("toggle", syncExpand); });
    // A link to a lane that is filtered out (#lane-A-NET from the class table) shows it again.
    function reveal(id) {
      var t = id && doc.getElementById(id);
      var lane = t && t.closest ? t.closest(".dw-lane") : null;
      if (lane && lane.parentNode.classList.contains("is-out")) {
        kind = "all";
        setPressed(kinds, kinds[0]);
        waiting.checked = false;
        apply();
        lane.open = true;
        lane.scrollIntoView();
      }
    }
    doc.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#lane-"]') : null;
      if (a) { reveal(a.getAttribute("href").slice(1)); }
    });
    window.addEventListener("hashchange", function () { reveal(window.location.hash.slice(1)); });
    tools.hidden = false;
    apply();
  }

  /* ---------------------------------------------------------------------------------------
     3. Classes: filter the registry rows by status.
     --------------------------------------------------------------------------------------- */
  function initClasses() {
    var tools = doc.querySelector("[data-class-tools]");
    var list = doc.getElementById("registry");
    if (!tools || !list) { return; }
    var rows = $all(".dw-cls", list);
    var buttons = $all("[data-status]", tools);
    var shown = tools.querySelector("[data-class-shown]");
    function apply(status) {
      var n = 0;
      rows.forEach(function (r) {
        var ok = status === "all" || r.getAttribute("data-status") === status;
        r.parentNode.classList.toggle("is-out", !ok);
        if (ok) { n += 1; }
      });
      var label = n + " of " + rows.length + " classes";
      if (shown.textContent !== label) { shown.textContent = label; }
    }
    buttons.forEach(function (b) {
      b.addEventListener("click", function () { setPressed(buttons, b); apply(b.getAttribute("data-status")); });
    });
    // A link to a class that is filtered out shows every class again.
    function reveal(id) {
      var t = id && doc.getElementById(id);
      var row = t && t.closest ? t.closest(".dw-cls") : null;
      if (row && row.parentNode.classList.contains("is-out")) { setPressed(buttons, buttons[0]); apply("all"); row.open = true; row.scrollIntoView(); }
    }
    doc.addEventListener("click", function (e) {
      var a = e.target.closest ? e.target.closest('a[href^="#class-"]') : null;
      if (a) { reveal(a.getAttribute("href").slice(1)); }
    });
    window.addEventListener("hashchange", function () { reveal(window.location.hash.slice(1)); });
    tools.hidden = false;
  }

  /* ---------------------------------------------------------------------------------------
     4. Areas: sort as listed, lowest unit coverage first, by risk rank, or by size.
     --------------------------------------------------------------------------------------- */
  function initSort() {
    var tools = doc.querySelector("[data-sort-group]");
    var table = doc.getElementById("areas");
    if (!tools || !table) { return; }
    var body = table.tBodies[0];
    var rows = $all("tr", body);
    var buttons = $all("[data-sort]", tools);
    function numOr(v, missing) { return v === "" || v == null ? missing : Number(v); }
    var keys = {
      listed: function (r) { return Number(r.getAttribute("data-i")); },
      lowest: function (r) { return numOr(r.getAttribute("data-unit"), Infinity); },
      risk: function (r) { return numOr(r.getAttribute("data-rank"), Infinity); },
      size: function (r) { return -numOr(r.getAttribute("data-loc"), -Infinity); }
    };
    // The sorted column says so (aria-sort); "As listed" clears it.
    var heads = table.tHead.rows[0].cells;
    var sortCol = { lowest: [1, "ascending"], risk: [5, "ascending"], size: [4, "descending"] };
    buttons.forEach(function (b) {
      b.addEventListener("click", function () {
        var name = b.getAttribute("data-sort");
        var key = keys[name];
        setPressed(buttons, b);
        Array.prototype.forEach.call(heads, function (th) { th.removeAttribute("aria-sort"); });
        if (sortCol[name]) { heads[sortCol[name][0]].setAttribute("aria-sort", sortCol[name][1]); }
        rows.slice().sort(function (x, y) {
          var d = key(x) - key(y);
          return d || keys.listed(x) - keys.listed(y);
        }).forEach(function (r) { body.appendChild(r); });
      });
    });
    tools.hidden = false;
  }

  /* ---------------------------------------------------------------------------------------
     5. Table boxes: a keyboard stop and a named region only while the table is wider than its box.
     --------------------------------------------------------------------------------------- */
  function initScroll() {
    var boxes = $all(".dw-scroll");
    if (!boxes.length) { return; }
    function check() {
      boxes.forEach(function (box) {
        var scrolls = box.scrollWidth > box.clientWidth + 1;
        if (scrolls && !box.hasAttribute("tabindex")) {
          box.setAttribute("tabindex", "0");
          box.setAttribute("role", "region");
          var label = box.getAttribute("data-scroll-label");
          if (label) { box.setAttribute("aria-labelledby", label); }
        } else if (!scrolls && box.hasAttribute("tabindex")) {
          box.removeAttribute("tabindex");
          box.removeAttribute("role");
          box.removeAttribute("aria-labelledby");
        }
      });
    }
    var timer = 0;
    window.addEventListener("resize", function () { window.clearTimeout(timer); timer = window.setTimeout(check, 150); });
    // The areas table sits in a closed fold: check again when it opens.
    $all("details").forEach(function (d) { if (d.querySelector(".dw-scroll")) { d.addEventListener("toggle", check); } });
    if (doc.fonts && doc.fonts.ready) { doc.fonts.ready.then(check); }
    check();
  }

  function safe(fn) { try { fn(); } catch (e) { if (window.console) { console.warn("dev-work:", e); } } }
  function init() { safe(initCi); safe(initLanes); safe(initClasses); safe(initSort); safe(initScroll); }
  if (doc.readyState === "loading") { doc.addEventListener("DOMContentLoaded", init); } else { init(); }
}());
