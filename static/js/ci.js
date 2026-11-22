// btx-community.com, developers page only: the panel with the last nightly CI-0 runs, one per branch
// the status page builds. Reads ci.json from the public API of the status page
// (network.btx-monitoring.com/api/v1/ci.json) once on load, with a timeout. The answer is validated
// before use and only ever written with textContent; keys the panel does not know are ignored, so
// the API can add fields without breaking it. Every label comes from a data attribute the build
// wrote in the page's language. Without a usable answer the panel shows one status line and the
// link to the JSON; nothing else on the page depends on it.
(function () {
  "use strict";

  var TIMEOUT_MS = 10000;
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
  var LOCALES = { en: "en-US", de: "de-DE", es: "es-ES", fr: "fr-FR", zh: "zh-CN" };

  function isObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function count(value) {
    return Number.isInteger(value) && value >= 0 && value <= MAX_COUNT ? value : null;
  }

  function instant(text) {
    if (typeof text !== "string" || !TIME.test(text)) {
      return null;
    }
    var time = Date.parse(text);
    return isNaN(time) ? null : new Date(time);
  }

  // A list of failed test names, read leniently so that a bad night with many failures still shows:
  // only a list of plain strings is accepted (null otherwise); a long name is cut to MAX_NAME
  // characters and only the first MAX_NAMES names are kept. { names, total }: total = list length.
  function names(list) {
    if (!Array.isArray(list)) {
      return null;
    }
    for (var i = 0; i < list.length; i += 1) {
      if (typeof list[i] !== "string") {
        return null;
      }
    }
    var kept = list.slice(0, MAX_NAMES).map(function (name) {
      return name.length > MAX_NAME ? name.slice(0, MAX_NAME - 1) + "\u2026" : name;
    });
    return { names: kept, total: list.length };
  }

  // A list the panel can do without (new_failures, known_but_passed): read like names(), but null
  // when it is absent, broken or longer than the count it belongs to, and the panel leaves it out.
  function optionalNames(list, most) {
    var parsed = names(list);
    return parsed !== null && parsed.total <= most ? parsed : null;
  }

  // One test suite; { ran: false } when the suite did not run (null in the answer), null if the
  // values are broken. passed, failed (and skipped) never add up to more than run. fresh: the
  // failures that are not on the branch's known-failing list; again: known failures that passed.
  function suite(value, withSkipped) {
    if (value === null) {
      return { ran: false };
    }
    if (!isObject(value)) {
      return null;
    }
    var run = count(value.run);
    var passed = count(value.passed);
    var failed = count(value.failed);
    var skipped = withSkipped ? count(value.skipped) : 0;
    var failedNames = names(value.failed_names);
    if (run === null || passed === null || failed === null || skipped === null || failedNames === null) {
      return null;
    }
    if (passed + failed + skipped > run) {
      return null;
    }
    return {
      ran: true, run: run, passed: passed, failed: failed, skipped: skipped,
      names: failedNames.names, listed: failedNames.total,
      fresh: optionalNames(value.new_failures, failed),
      again: optionalNames(value.known_but_passed, passed),
    };
  }

  // One run (the top level of ci.json, or an entry of its runs[]): the values the panel shows, or
  // null when one of them is missing or broken.
  function parseRun(value, now) {
    if (!isObject(value) || typeof value.stale !== "boolean") {
      return null;
    }
    var measured = instant(value.measured_at);
    var finished = instant(value.finished_at);
    if (typeof value.branch !== "string" || !BRANCH.test(value.branch) || value.branch.indexOf("..") !== -1 ||
        typeof value.commit !== "string" || !COMMIT.test(value.commit) || measured === null || finished === null) {
      return null;
    }
    // A run that ends in the future or before it was measured is a wrong clock or a broken record.
    if (finished.getTime() > now + SKEW_MS || measured.getTime() > finished.getTime()) {
      return null;
    }
    var build = value.build;
    if (!isObject(build) || typeof build.configure_ok !== "boolean" || typeof build.build_ok !== "boolean") {
      return null;
    }
    var suites = value.suites;
    if (!isObject(suites)) {
      return null;
    }
    var unit = suite(suites.unit, false);
    var functional = suite(suites.functional, true);
    if (unit === null || functional === null) {
      return null;
    }
    return {
      stale: value.stale || now - finished.getTime() > STALE_MS,
      branch: value.branch,
      commit: value.commit,
      measured: measured,
      finished: finished,
      buildOk: build.configure_ok && build.build_ok,
      unit: unit,
      functional: functional,
    };
  }

  // Newest release first (release-0.34.17 before release-0.34.16), compared as numbers. When a
  // branch is not named release-X.Y or release-X.Y.Z, the runs keep the order of the answer.
  function newestFirst(runs) {
    var keys = runs.map(function (run) {
      var match = RELEASE.exec(run.branch);
      return match ? [Number(match[1]), Number(match[2]), Number(match[3] || 0)] : null;
    });
    if (keys.indexOf(null) !== -1) {
      return runs;
    }
    var order = runs.map(function (run, index) { return index; });
    order.sort(function (a, b) {
      for (var i = 0; i < 3; i += 1) {
        if (keys[a][i] !== keys[b][i]) {
          return keys[b][i] - keys[a][i];
        }
      }
      return a - b;
    });
    return order.map(function (index) { return runs[index]; });
  }

  // runs[] holds one run per branch the status page builds; its top level carries one run as well
  // (on 17 Nov 2026 a copy of runs[0]). The panel shows every entry of runs[], and only the top-level
  // run when the list is absent, empty, longer than MAX_RUNS or has an entry that fails the checks.
  function runList(list, top, now) {
    if (!Array.isArray(list) || list.length === 0 || list.length > MAX_RUNS) {
      return [top];
    }
    var runs = [];
    for (var i = 0; i < list.length; i += 1) {
      var run = parseRun(list[i], now);
      if (run === null) {
        return [top];
      }
      runs.push(run);
    }
    return newestFirst(runs);
  }

  // Reduce ci.json to what the panel shows: { state: "run", runs: [...] }, { state: "none" } when
  // the API has no valid run, { state: "error" } when the answer is missing, foreign or broken.
  function parseCi(text, expected, now) {
    var doc;
    try {
      doc = JSON.parse(text);
    } catch (error) {
      return { state: "error" };
    }
    if (!isObject(doc) || doc.schema_version !== 1) {
      return { state: "error" };
    }
    if (doc.available === false || typeof doc.reason === "string") {
      return { state: "none" };
    }
    if (doc.available !== true || doc.reason != null) {
      return { state: "error" };
    }
    if (doc.repository !== expected.repo || doc.job !== expected.job) {
      return { state: "error" };
    }
    var top = parseRun(doc, now);
    if (top === null) {
      return { state: "error" };
    }
    return { state: "run", runs: runList(doc.runs, top, now) };
  }

  // "2026-11-13 13:54 UTC", as the rest of the site writes times.
  function formatTime(date) {
    function two(n) { return (n < 10 ? "0" : "") + n; }
    return date.getUTCFullYear() + "-" + two(date.getUTCMonth() + 1) + "-" + two(date.getUTCDate()) +
      " " + two(date.getUTCHours()) + ":" + two(date.getUTCMinutes()) + " UTC";
  }

  // Fill {name} placeholders of a label; an unknown placeholder stays as it is.
  function fill(template, values) {
    return String(template || "").replace(/\{([a-z]+)\}/g, function (match, name) {
      return Object.prototype.hasOwnProperty.call(values, name) ? values[name] : match;
    });
  }

  // The list of failed names: the heading counts the failures (value.failed), or "N of M" when the
  // API lists fewer names than failures; names the panel did not keep are counted in "more".
  function failedView(value, texts, number, listTemplate) {
    if (!value.names.length) {
      return null;
    }
    var count = value.listed < value.failed ?
      fill(texts.namesOf, { listed: number(value.listed), failed: number(value.failed) }) : number(value.failed);
    var dropped = value.listed - value.names.length;
    return {
      summary: fill(listTemplate, { count: count }),
      names: value.names,
      more: dropped > 0 ? fill(texts.more, { count: number(dropped) }) : null,
    };
  }

  // split: how many of the failures are new and how many known, when the API says which are new.
  function suiteView(value, texts, number, subTemplate, listTemplate) {
    if (!value.ran) {
      return { value: texts.notRun, sub: "", split: "", failed: null };
    }
    return {
      value: fill(texts.count, { passed: number(value.passed), run: number(value.run) }),
      sub: fill(subTemplate, { failed: number(value.failed), skipped: number(value.skipped) }),
      split: value.fresh !== null && value.failed > 0 ?
        fill(texts.split, { "new": number(value.fresh.total), known: number(value.failed - value.fresh.total) }) : "",
      failed: failedView(value, texts, number, listTemplate),
    };
  }

  // The same list of both suites joined into one (unit first), e.g. all new failures of a run; null
  // when it is empty or the API gives it for neither suite.
  function joinedView(lists, texts, number, listTemplate) {
    var kept = [];
    var total = 0;
    lists.forEach(function (list) {
      if (list) {
        kept = kept.concat(list.names);
        total += list.total;
      }
    });
    if (!kept.length) {
      return null;
    }
    kept = kept.slice(0, MAX_NAMES);
    var dropped = total - kept.length;
    return {
      summary: fill(listTemplate, { count: number(total) }),
      names: kept,
      more: dropped > 0 ? fill(texts.more, { count: number(dropped) }) : null,
    };
  }

  function runView(run, texts, number, repo, allStale) {
    return {
      branch: run.branch,
      commit: run.commit,
      commitUrl: "https://github.com/" + repo + "/commit/" + run.commit,
      staleNote: run.stale && !allStale ? texts.runStale : null,
      build: run.buildOk ? texts.ok : texts.failed,
      buildOk: run.buildOk,
      unit: suiteView(run.unit, texts, number, texts.unitSub, texts.failedUnit),
      functional: suiteView(run.functional, texts, number, texts.functionalSub, texts.failedFunctional),
      fresh: joinedView([run.unit.fresh, run.functional.fresh], texts, number, texts.newFailures),
      again: joinedView([run.unit.again, run.functional.again], texts, number, texts.knownPassed),
      times: fill(texts.times, { measured: formatTime(run.measured), finished: formatTime(run.finished) }),
    };
  }

  // Everything the panel shows, as plain strings: the status line (null when there is none) and
  // the values of each run, newest release first. When every run is stale, the status line says so;
  // when only some are, each of those says it in its own block (staleNote). texts = the panel's
  // data attributes (element.dataset).
  function ciView(text, options) {
    var texts = options.texts;
    var locale = LOCALES[options.lang] || LOCALES.en;
    function number(n) { return n.toLocaleString(locale); }
    var parsed = typeof text === "string" ? parseCi(text, options, options.now) : { state: "error" };
    if (parsed.state !== "run") {
      return { kind: parsed.state, status: parsed.state === "none" ? texts.none : texts.error, runs: [] };
    }
    var allStale = parsed.runs.every(function (run) { return run.stale; });
    return {
      kind: allStale ? "stale" : "current",
      status: allStale ? texts.stale : null,
      runs: parsed.runs.map(function (run) { return runView(run, texts, number, options.repo, allStale); }),
    };
  }

  // --- The page ------------------------------------------------------------------------------

  function part(element, name) {
    return element.querySelector('[data-ci="' + name + '"]');
  }

  // The status line is a live region that is always in the page (empty when there is nothing to
  // say), so a screen reader announces the text that is set into it.
  function setStatus(root, text, warn) {
    var line = part(root, "status");
    line.classList.toggle("c-ci__status--warn", Boolean(warn && text));
    line.textContent = text || "";
  }

  function fillList(details, failed) {
    details.hidden = failed === null;
    var list = details.querySelector("ul");
    while (list.firstChild) {
      list.removeChild(list.firstChild);
    }
    if (failed === null) {
      return;
    }
    details.querySelector("summary").textContent = failed.summary;
    failed.names.forEach(function (name) {
      var item = document.createElement("li");
      var code = document.createElement("code");
      code.textContent = name;
      item.appendChild(code);
      list.appendChild(item);
    });
    if (failed.more) {
      var more = document.createElement("li");
      more.className = "c-ci__more";
      more.textContent = failed.more;
      list.appendChild(more);
    }
  }

  function fillRun(block, run) {
    block.setAttribute("aria-label", run.branch);
    var note = part(block, "run-stale");
    note.hidden = run.staleNote === null;
    note.textContent = run.staleNote || "";
    var ref = part(block, "ref");
    ref.textContent = run.branch + " @ ";
    var link = document.createElement("a");
    link.className = "c-link";
    link.href = run.commitUrl;
    link.rel = "noopener noreferrer";
    link.textContent = run.commit;
    ref.appendChild(link);
    var build = part(block, "build");
    build.textContent = run.build;
    build.classList.toggle("c-ci__bad", !run.buildOk);
    part(block, "unit").textContent = run.unit.value;
    part(block, "unit-sub").textContent = run.unit.sub;
    part(block, "unit-split").textContent = run.unit.split;
    part(block, "functional").textContent = run.functional.value;
    part(block, "functional-sub").textContent = run.functional.sub;
    part(block, "functional-split").textContent = run.functional.split;
    fillList(part(block, "new-failures"), run.fresh);
    fillList(part(block, "known-passed"), run.again);
    fillList(part(block, "failed-unit"), run.unit.failed);
    fillList(part(block, "failed-functional"), run.functional.failed);
    part(block, "times").textContent = run.times;
  }

  // The page holds one empty run block; it shows the first run, and a copy of it each further run.
  function show(root, view) {
    setStatus(root, view.status, view.kind === "stale");
    var blocks = root.querySelectorAll('[data-ci="run"]');
    for (var i = 1; i < blocks.length; i += 1) {
      blocks[i].parentNode.removeChild(blocks[i]);
    }
    var first = blocks[0];
    first.hidden = view.runs.length === 0;
    if (!view.runs.length) {
      return;
    }
    var blank = first.cloneNode(true);
    var last = first;
    view.runs.forEach(function (run, index) {
      var block = index === 0 ? first : blank.cloneNode(true);
      fillRun(block, run);
      if (index > 0) {
        last.parentNode.insertBefore(block, last.nextSibling);
      }
      last = block;
    });
  }

  function load(root) {
    var options = { repo: root.dataset.repo, job: root.dataset.job, lang: root.dataset.lang, texts: root.dataset };
    var controller = typeof AbortController === "function" ? new AbortController() : null;
    var settled = false;
    function done(text) {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timer);
      options.now = Date.now();
      show(root, ciView(text, options));
    }
    var timer = window.setTimeout(function () {
      if (controller) {
        controller.abort();
      }
      done(null);
    }, TIMEOUT_MS);
    setStatus(root, root.dataset.loading, false);
    var init = { cache: "no-store", credentials: "omit" };
    if (controller) {
      init.signal = controller.signal;
    }
    fetch(root.dataset.api, init)
      .then(function (response) { return response.ok ? response.text() : null; })
      .then(done, function () { done(null); });
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { parseCi: parseCi, ciView: ciView, formatTime: formatTime, fill: fill };
  } else if (typeof document !== "undefined") {
    var root = document.getElementById("ci");
    if (root && root.dataset.api && root.dataset.repo && root.dataset.job && typeof fetch === "function") {
      try {
        load(root);
      } catch (error) {
        setStatus(root, root.dataset.error, false);
      }
    }
  }
}());
