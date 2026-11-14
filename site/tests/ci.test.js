// Tests of the nightly CI panel of the developers page (site/static/js/ci.js),
// run with `node --test site/tests/*.test.js`. Uses only Node's built-in test runner: no dependencies.
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const ci = require("../static/js/ci.js");

// The panel's data attributes as the English page writes them (element.dataset).
const TEXTS = {
  loading: "Loading the last run …",
  none: "No current run.",
  stale: "Last run is older than 36 h; the figures below may be out of date.",
  error: "CI data unavailable.",
  ok: "build passed",
  failed: "build failed",
  notRun: "tests not run",
  count: "{passed} of {run}",
  unitSub: "passed · {failed} failed",
  functionalSub: "passed · {failed} failed · {skipped} skipped",
  failedUnit: "Failed unit suites ({count})",
  failedFunctional: "Failed functional scripts ({count})",
  namesOf: "{listed} of {failed}",
  more: "… and {count} more",
  times: "Measured {measured} · finished {finished}",
};
const NOW = Date.parse("2026-11-13T20:10:05Z");
const OPTIONS = { repo: "btxchain/btx", job: "CI-0", lang: "en", texts: TEXTS, now: NOW };

// The shape of api/v1/ci.json on 13 Nov 2026, with shorter name lists.
function run(changes) {
  return Object.assign({
    schema_version: 1,
    job: "CI-0",
    repository: "btxchain/btx",
    generated_at: "2026-11-13T20:10:05Z",
    available: true,
    reason: null,
    stale: false,
    branch: "release-0.34.16",
    commit: "88c9b49c",
    measured_at: "2026-11-13T11:03:52Z",
    finished_at: "2026-11-13T13:54:04Z",
    build: { configure_ok: true, build_ok: true, threads: 24, minutes: { configure: 0.2, build: 20.2 } },
    suites: {
      unit: { run: 2436, passed: 2433, failed: 3, failed_names: ["smile2_audit_tests", "validation_chainstate_tests"] },
      functional: { run: 215, passed: 129, failed: 82, skipped: 4, failed_names: ["mining_basic.py", "feature_pq_multisig.py --descriptors"] },
    },
  }, changes);
}

function view(doc, options) {
  return ci.ciView(typeof doc === "string" ? doc : JSON.stringify(doc), Object.assign({}, OPTIONS, options));
}

// Without a valid run every key stays and its value is null.
function unavailable(reason) {
  const doc = run({ available: false, reason: reason });
  for (const key of ["stale", "branch", "commit", "measured_at", "finished_at", "build", "suites"]) {
    doc[key] = null;
  }
  return doc;
}

test("a current run fills the panel without a status line", () => {
  const result = view(run({}));
  assert.equal(result.kind, "current");
  assert.equal(result.status, null);
  assert.deepEqual(result.run, {
    branch: "release-0.34.16",
    commit: "88c9b49c",
    commitUrl: "https://github.com/btxchain/btx/commit/88c9b49c",
    build: "build passed",
    buildOk: true,
    unit: {
      value: "2,433 of 2,436",
      sub: "passed · 3 failed",
      failed: {
        summary: "Failed unit suites (2 of 3)",
        names: ["smile2_audit_tests", "validation_chainstate_tests"],
        more: null,
      },
    },
    functional: {
      value: "129 of 215",
      sub: "passed · 82 failed · 4 skipped",
      failed: {
        summary: "Failed functional scripts (2 of 82)",
        names: ["mining_basic.py", "feature_pq_multisig.py --descriptors"],
        more: null,
      },
    },
    times: "Measured 2026-11-13 11:03 UTC · finished 2026-11-13 13:54 UTC",
  });
});

test("labels and numbers follow the page language", () => {
  const texts = Object.assign({}, TEXTS, { count: "{passed} von {run}", unitSub: "bestanden · {failed} fehlgeschlagen" });
  const result = view(run({}), { lang: "de", texts: texts });
  assert.equal(result.run.unit.value, "2.433 von 2.436");
  assert.equal(result.run.unit.sub, "bestanden · 3 fehlgeschlagen");
});

test("a failed build and suites that did not run", () => {
  const result = view(run({
    build: { configure_ok: true, build_ok: false },
    suites: { unit: null, functional: null },
  }));
  assert.equal(result.run.build, "build failed");
  assert.equal(result.run.buildOk, false);
  assert.deepEqual(result.run.unit, { value: "tests not run", sub: "", failed: null });
  assert.deepEqual(result.run.functional, { value: "tests not run", sub: "", failed: null });
});

test("no failed names: no list", () => {
  const suites = {
    unit: { run: 10, passed: 10, failed: 0, failed_names: [] },
    functional: { run: 5, passed: 4, failed: 0, skipped: 1, failed_names: [] },
  };
  const result = view(run({ suites: suites }));
  assert.equal(result.run.unit.failed, null);
  assert.equal(result.run.functional.failed, null);
});

test("the failed list: the heading counts the failures, the list is cut leniently", () => {
  const all = view(run({ suites: {
    unit: { run: 10, passed: 7, failed: 3, failed_names: ["a", "b", "c"] },
    functional: null,
  } }));
  assert.equal(all.run.unit.failed.summary, "Failed unit suites (3)");
  assert.equal(all.run.unit.failed.more, null);
  // A bad night: more names than the panel keeps. The counts stay, the list is cut and says so.
  const many = Array.from({ length: 2437 }, (_, i) => "suite_" + i);
  const big = view(run({ suites: {
    unit: { run: 2437, passed: 0, failed: 2437, failed_names: many },
    functional: null,
  } }));
  assert.equal(big.kind, "current");
  assert.equal(big.run.unit.value, "0 of 2,437");
  assert.equal(big.run.unit.sub, "passed · 2,437 failed");
  assert.equal(big.run.unit.failed.summary, "Failed unit suites (2,437)");
  assert.equal(big.run.unit.failed.names.length, 2000);
  assert.equal(big.run.unit.failed.names[1999], "suite_1999");
  assert.equal(big.run.unit.failed.more, "… and 437 more");
  // A name that is too long is cut to 200 characters, ending in an ellipsis.
  const long = view(run({ suites: {
    unit: { run: 2436, passed: 2433, failed: 3, failed_names: ["x".repeat(300), "short"] },
    functional: null,
  } }));
  assert.equal(long.kind, "current");
  assert.equal(long.run.unit.value, "2,433 of 2,436");
  assert.equal(long.run.unit.failed.summary, "Failed unit suites (2 of 3)");
  assert.equal(long.run.unit.failed.names[0], "x".repeat(199) + "…");
  assert.equal(long.run.unit.failed.names[1], "short");
});

test("available with reason null or absent is a run", () => {
  const absent = run({});
  delete absent.reason;
  assert.equal(view(absent).kind, "current");
  assert.equal(view(run({ reason: null })).kind, "current");
});

test("impossible times: a run that ends in the future or before it was measured", () => {
  // Up to 10 min ahead of the viewer's clock is tolerated.
  assert.equal(view(run({ finished_at: "2026-11-13T20:20:05Z" })).kind, "current");
  assert.equal(view(run({ finished_at: "2026-11-13T20:20:06Z" })).kind, "error");
  assert.equal(view(run({ measured_at: "2026-11-13T13:54:05Z" })).kind, "error");
  assert.equal(view(run({ measured_at: "2026-11-13T13:54:04Z" })).kind, "current");
});

test("no valid run: 'No current run' and nothing else", () => {
  for (const doc of [unavailable("missing"), unavailable("invalid"), unavailable(null), run({ reason: "missing" })]) {
    assert.deepEqual(view(doc), { kind: "none", status: "No current run.", run: null }, JSON.stringify(doc).slice(0, 80));
  }
});

test("a stale run keeps its figures under the warning", () => {
  const flagged = view(run({ stale: true }));
  assert.equal(flagged.kind, "stale");
  assert.equal(flagged.status, TEXTS.stale);
  assert.equal(flagged.run.commit, "88c9b49c");
  // The page also notices an API that stopped updating: 36 h after finished_at.
  const late = view(run({}), { now: Date.parse("2026-11-15T01:54:05Z") });
  assert.equal(late.kind, "stale");
  assert.equal(view(run({}), { now: Date.parse("2026-11-15T01:54:03Z") }).kind, "current");
});

test("a failed fetch, malformed or foreign JSON: 'CI data unavailable'", () => {
  const error = { kind: "error", status: "CI data unavailable.", run: null };
  assert.deepEqual(ci.ciView(null, OPTIONS), error);
  const broken = [
    "", "not json", "null", "[]", "{}", "42", "{\"schema_version\": 1",
    run({ schema_version: 2 }),
    run({ repository: "someone/else" }),
    run({ job: "CI-9" }),
    run({ available: "yes" }),
    run({ stale: "no" }),
    run({ branch: "<b>x</b>" }),
    run({ branch: "a/../b" }),
    run({ commit: "88C9B49C" }),
    run({ commit: "javascript:alert(1)" }),
    run({ measured_at: "yesterday" }),
    run({ finished_at: 1731506044 }),
    run({ build: null }),
    run({ build: { configure_ok: "true", build_ok: true } }),
    run({ suites: null }),
    run({ suites: { unit: { run: 3, passed: 2, failed: 2, failed_names: [] }, functional: null } }),
    run({ suites: { unit: { run: -1, passed: 0, failed: 0, failed_names: [] }, functional: null } }),
    run({ suites: { unit: { run: 1.5, passed: 0, failed: 0, failed_names: [] }, functional: null } }),
    run({ suites: { unit: { run: 2, passed: 1, failed: 1, failed_names: "x" }, functional: null } }),
    run({ suites: { unit: { run: 2, passed: 1, failed: 1, failed_names: [{ name: "x" }] }, functional: null } }),
    run({ suites: { unit: { run: 2, passed: 1, failed: 1, failed_names: ["x", 7] }, functional: null } }),
    run({ suites: { unit: { run: 2, passed: 1, failed: 1, failed_names: null }, functional: null } }),
    run({ suites: { unit: null, functional: { run: 2, passed: 1, failed: 1, failed_names: [] } } }),
  ];
  for (const doc of broken) {
    assert.deepEqual(view(doc), error, String(typeof doc === "string" ? doc : JSON.stringify(doc)).slice(0, 120));
  }
});

test("unknown fields are ignored", () => {
  const extra = run({
    stalled_exactreplay: { count: 7, names: ["<img src=x onerror=alert(1)>"] },
    coverage: { lines: 65.8 },
    build: Object.assign({}, run({}).build, { cache: "warm" }),
  });
  extra.suites.unit.timed_out = 1;
  extra.suites.fuzz = { run: 1 };
  assert.deepEqual(view(extra), view(run({})));
});

test("hostile text stays text: names pass through unchanged, for textContent only", () => {
  const name = "<script>alert(1)</script>";
  const result = view(run({ suites: {
    unit: { run: 1, passed: 0, failed: 1, failed_names: [name] },
    functional: null,
  } }));
  assert.deepEqual(result.run.unit.failed.names, [name]);
});

test("placeholders: known ones are filled, unknown ones stay", () => {
  assert.equal(ci.fill("{a} and {b}", { a: "1" }), "1 and {b}");
  assert.equal(ci.fill(undefined, {}), "");
  assert.equal(ci.formatTime(new Date("2026-11-13T13:54:04Z")), "2026-11-13 13:54 UTC");
});
