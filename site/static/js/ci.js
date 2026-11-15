// btx-community.com, developers page only: the panel with the last nightly CI-0 run. Reads ci.json
// from the public API of the status page (network.btx-monitoring.com/api/v1/ci.json) once on load,
// with a timeout. The answer is validated before use and only ever written with textContent; keys
// the panel does not know are ignored, so the API can add fields without breaking it. Every label
// comes from a data attribute the build wrote in the page's language. Without a usable answer the
// panel shows one status line and the link to the JSON; nothing else on the page depends on it.
(function () {
  "use strict";

  var TIMEOUT_MS = 10000;
  var STALE_MS = 36 * 3600000;
  var SKEW_MS = 10 * 60000;
  var MAX_COUNT = 10000000;
  var MAX_NAMES = 2000;
  var MAX_NAME = 200;
  var BRANCH = /^[A-Za-z0-9._][A-Za-z0-9._\/-]{0,99}$/;
  var COMMIT = /^[0-9a-f]{7,40}$/;
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

  // One test suite; { ran: false } when the suite did not run (null in the answer), null if the
  // values are broken. passed, failed (and skipped) never add up to more than run.
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
    };
  }

  // Reduce ci.json to what the panel shows: { state: "run", ... }, { state: "none" } when the API
  // has no valid run, { state: "error" } when the answer is missing, foreign or broken.
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
    if (doc.available !== true || doc.reason != null || typeof doc.stale !== "boolean") {
      return { state: "error" };
    }
    if (doc.repository !== expected.repo || doc.job !== expected.job) {
      return { state: "error" };
    }
    var measured = instant(doc.measured_at);
    var finished = instant(doc.finished_at);
    if (typeof doc.branch !== "string" || !BRANCH.test(doc.branch) || doc.branch.indexOf("..") !== -1 ||
        typeof doc.commit !== "string" || !COMMIT.test(doc.commit) || measured === null || finished === null) {
      return { state: "error" };
    }
    // A run that ends in the future or before it was measured is a wrong clock or a broken record.
    if (finished.getTime() > now + SKEW_MS || measured.getTime() > finished.getTime()) {
      return { state: "error" };
    }
    var build = doc.build;
    if (!isObject(build) || typeof build.configure_ok !== "boolean" || typeof build.build_ok !== "boolean") {
      return { state: "error" };
    }
    var suites = doc.suites;
    if (!isObject(suites)) {
      return { state: "error" };
    }
    var unit = suite(suites.unit, false);
    var functional = suite(suites.functional, true);
    if (unit === null || functional === null) {
      return { state: "error" };
    }
    return {
      state: "run",
      stale: doc.stale || now - finished.getTime() > STALE_MS,
      branch: doc.branch,
      commit: doc.commit,
      measured: measured,
      finished: finished,
      buildOk: build.configure_ok && build.build_ok,
      unit: unit,
      functional: functional,
    };
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

  function suiteView(value, texts, locale, subTemplate, listTemplate) {
    if (!value.ran) {
      return { value: texts.notRun, sub: "", failed: null };
    }
    function number(n) { return n.toLocaleString(locale); }
    return {
      value: fill(texts.count, { passed: number(value.passed), run: number(value.run) }),
      sub: fill(subTemplate, { failed: number(value.failed), skipped: number(value.skipped) }),
      failed: failedView(value, texts, number, listTemplate),
    };
  }

  // Everything the panel shows, as plain strings: the status line (null when there is none) and,
  // when there is a run, its values. texts = the panel's data attributes (element.dataset).
  function ciView(text, options) {
    var texts = options.texts;
    var locale = LOCALES[options.lang] || LOCALES.en;
    var parsed = typeof text === "string" ? parseCi(text, options, options.now) : { state: "error" };
    if (parsed.state !== "run") {
      return { kind: parsed.state, status: parsed.state === "none" ? texts.none : texts.error, run: null };
    }
    return {
      kind: parsed.stale ? "stale" : "current",
      status: parsed.stale ? texts.stale : null,
      run: {
        branch: parsed.branch,
        commit: parsed.commit,
        commitUrl: "https://github.com/" + options.repo + "/commit/" + parsed.commit,
        build: parsed.buildOk ? texts.ok : texts.failed,
        buildOk: parsed.buildOk,
        unit: suiteView(parsed.unit, texts, locale, texts.unitSub, texts.failedUnit),
        functional: suiteView(parsed.functional, texts, locale, texts.functionalSub, texts.failedFunctional),
        times: fill(texts.times, { measured: formatTime(parsed.measured), finished: formatTime(parsed.finished) }),
      },
    };
  }

  // --- The page ------------------------------------------------------------------------------

  function part(root, name) {
    return root.querySelector('[data-ci="' + name + '"]');
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

  function show(root, view) {
    setStatus(root, view.status, view.kind === "stale");
    var block = part(root, "run");
    block.hidden = view.run === null;
    if (view.run === null) {
      return;
    }
    var run = view.run;
    var ref = part(root, "ref");
    ref.textContent = run.branch + " @ ";
    var link = document.createElement("a");
    link.className = "c-link";
    link.href = run.commitUrl;
    link.rel = "noopener noreferrer";
    link.textContent = run.commit;
    ref.appendChild(link);
    var build = part(root, "build");
    build.textContent = run.build;
    build.classList.toggle("c-ci__bad", !run.buildOk);
    part(root, "unit").textContent = run.unit.value;
    part(root, "unit-sub").textContent = run.unit.sub;
    part(root, "functional").textContent = run.functional.value;
    part(root, "functional-sub").textContent = run.functional.sub;
    fillList(part(root, "failed-unit"), run.unit.failed);
    fillList(part(root, "failed-functional"), run.functional.failed);
    part(root, "times").textContent = run.times;
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
