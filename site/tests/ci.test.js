// Tests of the nightly CI panel of the developers page (site/static/js/ci.js),
// run with `node --test site/tests/*.test.js`. Uses only Node's built-in test runner: no dependencies.
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const ci = require("../static/js/ci.js");

// The panel's data attributes as the English page writes them (element.dataset).
const TEXTS = {
  loading: "Loading the last runs …",
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
  times: "Started {measured} · finished {finished}",
  runStale: "This run is older than 36 h; its figures may be out of date.",
  split: "{new} new · {known} known",
  newFailures: "New failures, not on the branch's known-failing list ({count})",
  knownPassed: "Known-failing tests that passed this time ({count})",
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
  assert.equal(result.runs.length, 1);
  assert.deepEqual(result.runs[0], {
    branch: "release-0.34.16",
    commit: "88c9b49c",
    commitUrl: "https://github.com/btxchain/btx/commit/88c9b49c",
    staleNote: null,
    build: "build passed",
    buildOk: true,
    unit: {
      value: "2,433 of 2,436",
      sub: "passed · 3 failed",
      split: "",
      failed: {
        summary: "Failed unit suites (2 of 3)",
        names: ["smile2_audit_tests", "validation_chainstate_tests"],
        more: null,
      },
    },
    functional: {
      value: "129 of 215",
      sub: "passed · 82 failed · 4 skipped",
      split: "",
      failed: {
        summary: "Failed functional scripts (2 of 82)",
        names: ["mining_basic.py", "feature_pq_multisig.py --descriptors"],
        more: null,
      },
    },
    fresh: null,
    again: null,
    times: "Started 2026-11-13 11:03 UTC · finished 2026-11-13 13:54 UTC",
  });
});

test("labels and numbers follow the page language", () => {
  const texts = Object.assign({}, TEXTS, { count: "{passed} von {run}", unitSub: "bestanden · {failed} fehlgeschlagen" });
  const result = view(run({}), { lang: "de", texts: texts });
  assert.equal(result.runs[0].unit.value, "2.433 von 2.436");
  assert.equal(result.runs[0].unit.sub, "bestanden · 3 fehlgeschlagen");
});

test("a failed build and suites that did not run", () => {
  const result = view(run({
    build: { configure_ok: true, build_ok: false },
    suites: { unit: null, functional: null },
  }));
  assert.equal(result.runs[0].build, "build failed");
  assert.equal(result.runs[0].buildOk, false);
  assert.deepEqual(result.runs[0].unit, { value: "tests not run", sub: "", split: "", failed: null });
  assert.deepEqual(result.runs[0].functional, { value: "tests not run", sub: "", split: "", failed: null });
  assert.equal(result.runs[0].fresh, null);
});

test("no failed names: no list", () => {
  const suites = {
    unit: { run: 10, passed: 10, failed: 0, failed_names: [] },
    functional: { run: 5, passed: 4, failed: 0, skipped: 1, failed_names: [] },
  };
  const result = view(run({ suites: suites }));
  assert.equal(result.runs[0].unit.failed, null);
  assert.equal(result.runs[0].functional.failed, null);
});

test("the failed list: the heading counts the failures, the list is cut leniently", () => {
  const all = view(run({ suites: {
    unit: { run: 10, passed: 7, failed: 3, failed_names: ["a", "b", "c"] },
    functional: null,
  } }));
  assert.equal(all.runs[0].unit.failed.summary, "Failed unit suites (3)");
  assert.equal(all.runs[0].unit.failed.more, null);
  // A bad night: more names than the panel keeps. The counts stay, the list is cut and says so.
  const many = Array.from({ length: 2437 }, (_, i) => "suite_" + i);
  const big = view(run({ suites: {
    unit: { run: 2437, passed: 0, failed: 2437, failed_names: many },
    functional: null,
  } }));
  assert.equal(big.kind, "current");
  assert.equal(big.runs[0].unit.value, "0 of 2,437");
  assert.equal(big.runs[0].unit.sub, "passed · 2,437 failed");
  assert.equal(big.runs[0].unit.failed.summary, "Failed unit suites (2,437)");
  assert.equal(big.runs[0].unit.failed.names.length, 2000);
  assert.equal(big.runs[0].unit.failed.names[1999], "suite_1999");
  assert.equal(big.runs[0].unit.failed.more, "… and 437 more");
  // A name that is too long is cut to 200 characters, ending in an ellipsis.
  const long = view(run({ suites: {
    unit: { run: 2436, passed: 2433, failed: 3, failed_names: ["x".repeat(300), "short"] },
    functional: null,
  } }));
  assert.equal(long.kind, "current");
  assert.equal(long.runs[0].unit.value, "2,433 of 2,436");
  assert.equal(long.runs[0].unit.failed.summary, "Failed unit suites (2 of 3)");
  assert.equal(long.runs[0].unit.failed.names[0], "x".repeat(199) + "…");
  assert.equal(long.runs[0].unit.failed.names[1], "short");
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
    assert.deepEqual(view(doc), { kind: "none", status: "No current run.", runs: [] }, JSON.stringify(doc).slice(0, 80));
  }
});

test("a stale run keeps its figures under the warning", () => {
  const flagged = view(run({ stale: true }));
  assert.equal(flagged.kind, "stale");
  assert.equal(flagged.status, TEXTS.stale);
  assert.equal(flagged.runs[0].commit, "88c9b49c");
  assert.equal(flagged.runs[0].staleNote, null);
  // The page also notices an API that stopped updating: 36 h after finished_at.
  const late = view(run({}), { now: Date.parse("2026-11-15T01:54:05Z") });
  assert.equal(late.kind, "stale");
  assert.equal(view(run({}), { now: Date.parse("2026-11-15T01:54:03Z") }).kind, "current");
});

test("a failed fetch, malformed or foreign JSON: 'CI data unavailable'", () => {
  const error = { kind: "error", status: "CI data unavailable.", runs: [] };
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
  assert.deepEqual(result.runs[0].unit.failed.names, [name]);
});

// The shape of api/v1/ci.json on 17 Nov 2026: one run per branch in runs[], the first of them
// also at the top level, each suite with new_failures and known_but_passed. Shorter name lists.
const NOW_17 = Date.parse("2026-11-17T17:08:12Z");
const MODELNET = [
  "modelnet_035_disk_tests", "modelnet_jit_safety_tests", "modelnet_jit_tests", "modelnet_unique_todo_tests",
];

function branchRun(branch, commit, start, end, suites) {
  return {
    stale: false,
    branch: branch,
    commit: commit,
    measured_at: start,
    finished_at: end,
    build: { configure_ok: true, build_ok: true, threads: 30, minutes: { build: 6.9, unit: 14.3, unit_slow: 24.9 } },
    suites: suites,
    comparison: { baseline_created: false, results_complete: true, known_failing: 11, still_failing: 11 },
  };
}

function twoRuns() {
  const old = branchRun("release-0.34.16", "074dac16", "2026-11-17T00:30:31Z", "2026-11-17T01:03:56Z", {
    unit: { run: 2439, passed: 2438, failed: 1, failed_names: ["validation_chainstate_tests"],
      new_failures: [], known_but_passed: [] },
    functional: { run: 222, passed: 207, failed: 11, skipped: 4,
      failed_names: ["feature_modelnet_cr12.py", "p2p_addr_relay.py", "p2p_shielded_relay.py"],
      new_failures: ["p2p_shielded_relay.py"], known_but_passed: [] },
  });
  const open = branchRun("release-0.34.17", "371013d6", "2026-11-17T01:03:57Z", "2026-11-17T01:45:01Z", {
    unit: { run: 2443, passed: 2439, failed: 4, failed_names: MODELNET, new_failures: MODELNET,
      known_but_passed: ["validation_chainstate_tests"] },
    functional: { run: 230, passed: 219, failed: 7, skipped: 4,
      failed_names: ["feature_matmul_trusted_mirror_convergence.py", "p2p_v2pqonly.py"],
      new_failures: ["p2p_v2pqonly.py"],
      known_but_passed: ["feature_modelnet_cr12.py", "p2p_addr_relay.py"] },
  });
  return Object.assign(run({ generated_at: "2026-11-17T17:08:12Z" }), old, { runs: [old, open] });
}

function view17(doc, options) {
  return view(doc, Object.assign({ now: NOW_17 }, options));
}

test("two runs: one block per branch, the newest release first, new failures apart from known ones", () => {
  const result = view17(twoRuns());
  assert.equal(result.kind, "current");
  assert.equal(result.status, null);
  assert.deepEqual(result.runs.map((r) => r.branch + " @ " + r.commit),
    ["release-0.34.17 @ 371013d6", "release-0.34.16 @ 074dac16"]);
  const [open, old] = result.runs;
  assert.equal(open.commitUrl, "https://github.com/btxchain/btx/commit/371013d6");
  assert.equal(open.build, "build passed");
  assert.equal(open.staleNote, null);
  assert.deepEqual(open.unit, {
    value: "2,439 of 2,443",
    sub: "passed · 4 failed",
    split: "4 new · 0 known",
    failed: { summary: "Failed unit suites (4)", names: MODELNET, more: null },
  });
  assert.equal(open.functional.value, "219 of 230");
  assert.equal(open.functional.sub, "passed · 7 failed · 4 skipped");
  assert.equal(open.functional.split, "1 new · 6 known");
  assert.equal(open.functional.failed.summary, "Failed functional scripts (2 of 7)");
  // All new failures of the run in one list, unit first; the same for known failures that passed.
  assert.deepEqual(open.fresh, {
    summary: "New failures, not on the branch's known-failing list (5)",
    names: MODELNET.concat(["p2p_v2pqonly.py"]),
    more: null,
  });
  assert.deepEqual(open.again, {
    summary: "Known-failing tests that passed this time (3)",
    names: ["validation_chainstate_tests", "feature_modelnet_cr12.py", "p2p_addr_relay.py"],
    more: null,
  });
  assert.equal(open.times, "Started 2026-11-17 01:03 UTC · finished 2026-11-17 01:45 UTC");
  assert.equal(old.unit.value, "2,438 of 2,439");
  assert.equal(old.unit.split, "0 new · 1 known");
  assert.equal(old.functional.split, "1 new · 10 known");
  assert.deepEqual(old.fresh, {
    summary: "New failures, not on the branch's known-failing list (1)",
    names: ["p2p_shielded_relay.py"],
    more: null,
  });
  assert.equal(old.again, null);
  assert.equal(old.times, "Started 2026-11-17 00:30 UTC · finished 2026-11-17 01:03 UTC");
});

test("without runs[] the top-level run is the only block, with its new failures", () => {
  const doc = twoRuns();
  delete doc.runs;
  const result = view17(doc);
  assert.equal(result.kind, "current");
  assert.deepEqual(result.runs.map((r) => r.branch), ["release-0.34.16"]);
  assert.equal(result.runs[0].functional.split, "1 new · 10 known");
  assert.deepEqual(result.runs[0].fresh.names, ["p2p_shielded_relay.py"]);
  // The same view as a list that holds only that run.
  assert.deepEqual(view17(Object.assign(twoRuns(), { runs: [twoRuns().runs[0]] })), result);
});

test("a runs[] the panel cannot use falls back to the top-level run", () => {
  const top = ["release-0.34.16"];
  const good = twoRuns().runs;
  const broken = Object.assign({}, good[1], { commit: "not a commit" });
  const lists = [
    null, "runs", {}, [], [good[0], broken], [good[0], null],
    [good[0], Object.assign({}, good[1], { stale: "no" })],
    Array.from({ length: 11 }, () => good[1]),
  ];
  for (const runs of lists) {
    const result = view17(Object.assign(twoRuns(), { runs: runs }));
    assert.equal(result.kind, "current", JSON.stringify(runs).slice(0, 80));
    assert.deepEqual(result.runs.map((r) => r.branch), top, JSON.stringify(runs).slice(0, 80));
  }
  // Ten runs are still shown; a broken top level is an error whatever runs[] holds.
  assert.equal(view17(Object.assign(twoRuns(), { runs: Array.from({ length: 10 }, () => good[1]) })).runs.length, 10);
  assert.equal(view17(Object.assign(twoRuns(), { commit: "x" })).kind, "error");
});

test("release branches sort by number; other branch names keep the order of the answer", () => {
  function order(branches) {
    const runs = branches.map((branch) => Object.assign({}, twoRuns().runs[1], { branch: branch }));
    return view17(Object.assign(twoRuns(), { runs: runs })).runs.map((r) => r.branch);
  }
  assert.deepEqual(order(["release-0.34.9", "release-0.35", "release-0.34.17"]),
    ["release-0.35", "release-0.34.17", "release-0.34.9"]);
  assert.deepEqual(order(["main", "release-0.34.17"]), ["main", "release-0.34.17"]);
  assert.deepEqual(order(["release-0.34.16", "release-0.34.16"]), ["release-0.34.16", "release-0.34.16"]);
});

test("one stale run among current ones says so in its own block; all stale, the status line", () => {
  const doc = twoRuns();
  doc.runs[0].stale = true;
  const some = view17(doc);
  assert.equal(some.kind, "current");
  assert.equal(some.status, null);
  assert.deepEqual(some.runs.map((r) => r.staleNote), [null, TEXTS.runStale]);
  // 36 h after the newer run finished, both are stale: one line for the panel, none per block.
  const all = view17(twoRuns(), { now: Date.parse("2026-11-18T13:45:02Z") });
  assert.equal(all.kind, "stale");
  assert.equal(all.status, TEXTS.stale);
  assert.deepEqual(all.runs.map((r) => r.staleNote), [null, null]);
});

test("new and known lists are optional: absent, broken or too long, the panel leaves them out", () => {
  function suites(unit) {
    const doc = twoRuns();
    delete doc.runs;
    const base = { run: 10, passed: 8, failed: 2, failed_names: ["a", "b"] };
    doc.suites = { unit: Object.assign(base, unit), functional: null };
    return view17(doc).runs[0];
  }
  for (const extra of [{}, { new_failures: "a" }, { new_failures: [1] }, { new_failures: ["a", "b", "c"] }]) {
    const result = suites(extra);
    assert.equal(result.unit.split, "", JSON.stringify(extra));
    assert.equal(result.fresh, null, JSON.stringify(extra));
    assert.equal(result.unit.value, "8 of 10", JSON.stringify(extra));
  }
  assert.equal(suites({ new_failures: ["b"] }).unit.split, "1 new · 1 known");
  assert.equal(suites({ known_but_passed: Array.from({ length: 9 }, (_, i) => "k" + i) }).again, null);
  assert.equal(suites({ known_but_passed: ["k"] }).again.summary, "Known-failing tests that passed this time (1)");
  // No failures: no split line, even with an empty list of new ones.
  const clean = suites({ passed: 10, failed: 0, failed_names: [], new_failures: [] });
  assert.equal(clean.unit.split, "");
  assert.equal(clean.fresh, null);
});

test("placeholders: known ones are filled, unknown ones stay", () => {
  assert.equal(ci.fill("{a} and {b}", { a: "1" }), "1 and {b}");
  assert.equal(ci.fill(undefined, {}), "");
  assert.equal(ci.formatTime(new Date("2026-11-13T13:54:04Z")), "2026-11-13 13:54 UTC");
});
