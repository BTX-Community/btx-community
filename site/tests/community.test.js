// Tests of the live strip of btx-community.com (site/static/js/community.js),
// run with `node --test site/tests/*.test.js`. Uses only Node's built-in test runner: no dependencies.
"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const live = require("../static/js/community.js");

function status(changes) {
  return JSON.stringify(Object.assign({
    schema_version: 1,
    generated_at: "2026-11-03T17:10:00Z",
    data_as_of: "2026-11-03T17:09:30Z",
    stale: false,
    overall: "degraded",
    verdicts: [{ id: "stable", level: "yellow", reasons: [] }],
    metrics: [
      { id: "chain.height", value: 267335 },
      { id: "sw.latest_release", value: "v0.34.15" },
    ],
  }, changes));
}

test("a valid status document gives the strip values", () => {
  const result = live.parseStatus(status({}));
  assert.equal(result.overall, "degraded");
  assert.equal(result.stale, false);
  assert.equal(result.height, 267335);
  assert.equal(result.release, "v0.34.15");
  assert.deepEqual(result.verdicts, { stable: "yellow" });
  assert.equal(live.formatTime(result.time), "2026-11-03 17:09 UTC");
});

test("without data_as_of the build time is used", () => {
  const result = live.parseStatus(status({ data_as_of: null }));
  assert.equal(live.formatTime(result.time), "2026-11-03 17:10 UTC");
});

test("broken or foreign documents are ignored", () => {
  for (const text of ["", "not json", "null", "[]", status({ schema_version: 2 }),
    status({ metrics: "x" }), status({ overall: "<b>" }), status({ stale: "no" })]) {
    assert.equal(live.parseStatus(text), null, text);
  }
});

test("hostile or implausible values are dropped, not shown", () => {
  const result = live.parseStatus(status({
    metrics: [
      { id: "chain.height", value: "<img src=x>" },
      { id: "sw.latest_release", value: "<script>alert(1)</script>" },
    ],
    verdicts: [{ id: "stable", level: "<b>" }, null, { id: 3, level: "red" }],
    data_as_of: "yesterday",
    generated_at: 5,
  }));
  assert.equal(result.height, null);
  assert.equal(result.release, null);
  assert.deepEqual(result.verdicts, {});
  assert.equal(result.time, null);
});

test("heights must be whole, positive and plausible", () => {
  for (const value of [-1, 1.5, 1e9, true, null]) {
    const result = live.parseStatus(status({ metrics: [{ id: "chain.height", value: value }] }));
    assert.equal(result.height, null, String(value));
  }
});

test("missing metrics and verdicts are not an error", () => {
  const result = live.parseStatus(status({ metrics: [null], verdicts: undefined }));
  assert.equal(result.height, null);
  assert.equal(result.onRelease, null);
  assert.equal(result.interval, null);
  assert.equal(result.signers, null);
  assert.deepEqual(result.verdicts, {});
});

test("nodes on the latest release, block time and signers are read", () => {
  const result = live.parseStatus(status({
    metrics: [
      { id: "sw.latest_release", value: "v0.34.15" },
      { id: "net.versions", value: [{ version: "BTX:0.34.15", nodes: 20 }, { version: "BTX:0.34.14", nodes: 18 }] },
      { id: "chain.block_interval_avg_24h", value: 92.4 },
      { id: "attest.active_signers_100", value: 7 },
    ],
  }));
  assert.deepEqual(result.onRelease, { count: 20, total: 38 });
  assert.equal(result.interval, 92.4);
  assert.equal(result.signers, 7);
});

test("an unclear node census gives no count rather than a wrong one", () => {
  for (const census of [[], "x", [{ version: "BTX:0.34.15", nodes: -1 }], [{ version: 1, nodes: 3 }], [null]]) {
    const result = live.parseStatus(status({
      metrics: [{ id: "sw.latest_release", value: "v0.34.15" }, { id: "net.versions", value: census }],
    }));
    assert.equal(result.onRelease, null, JSON.stringify(census));
  }
});

test("durations are formatted as on the status page", () => {
  assert.equal(live.formatDuration(45, "en"), "45 s");
  assert.equal(live.formatDuration(90, "en"), "90 s");
  assert.equal(live.formatDuration(150, "en"), "2 min 30 s");
  assert.equal(live.formatDuration(7500, "en"), "2 h 5 min");
  assert.equal(live.formatDuration(3 * 86400 + 4 * 3600, "de"), "3 T 4 h");
});

test("the figures of BTX in numbers are read", () => {
  const result = live.parseStatus(status({
    metrics: [
      { id: "econ.supply_mined", value: 5376278.75 },
      { id: "econ.supply_pct_max", value: 25.6 },
      { id: "econ.block_reward", value: 20 },
      { id: "econ.halving_countdown", value: 255713 },
      { id: "econ.tx_24h", value: 1025 },
      { id: "chain.size_on_disk", value: 134761456808 },
    ],
  }));
  assert.equal(result.supply, 5376278.75);
  assert.equal(result.supplyShare, 25.6);
  assert.equal(result.reward, 20);
  assert.equal(result.halving, 255713);
  assert.equal(result.tx, 1025);
  assert.equal(result.size, 134761456808);
});

test("implausible figures are dropped", () => {
  const result = live.parseStatus(status({
    metrics: [
      { id: "econ.supply_mined", value: 22000000 },
      { id: "econ.supply_pct_max", value: "25" },
      { id: "econ.block_reward", value: -1 },
      { id: "econ.halving_countdown", value: 1.5 },
      { id: "econ.tx_24h", value: "<b>" },
      { id: "chain.size_on_disk", value: Infinity },
    ],
  }));
  for (const key of ["supply", "supplyShare", "reward", "halving", "tx", "size"]) {
    assert.equal(result[key], null, key);
  }
});

test("upcoming rule changes are read, and nothing ahead gives an empty list", () => {
  const ahead = live.parseStatus(status({
    metrics: [{ id: "sw.upcoming_activation", value: [{ name: "asert_half_life", height: 300000, remaining_blocks: 1200 }] }],
  }));
  assert.deepEqual(ahead.activations, [{ name: "asert_half_life", height: 300000, remaining: 1200 }]);
  const none = live.parseStatus(status({ metrics: [{ id: "sw.upcoming_activation", value: [] }] }));
  assert.deepEqual(none.activations, []);
  const missing = live.parseStatus(status({}));
  assert.equal(missing.activations, null);
});

test("an unclear activation list hides nothing and shows nothing", () => {
  for (const rows of ["x", [null], [{ name: "<img>", height: 1, remaining_blocks: 1 }],
    [{ name: "a", height: -1, remaining_blocks: 1 }], [{ name: "a", height: 5, remaining_blocks: 0 }],
    new Array(11).fill({ name: "a", height: 5, remaining_blocks: 1 })]) {
    const result = live.parseStatus(status({ metrics: [{ id: "sw.upcoming_activation", value: rows }] }));
    assert.equal(result.activations, null, JSON.stringify(rows).slice(0, 80));
  }
});

const NOW = Date.parse("2026-11-07T14:00:00Z");

function development(changes) {
  return JSON.stringify(Object.assign({
    schema_version: 1,
    repository: "btxchain/btx",
    generated_at: "2026-11-07T13:05:00Z",
    measured_at: "2026-11-07T13:00:12Z",
    stale: false,
    window_days: 30,
    branches: [
      { name: "main", default: true, last_commit_at: "2026-10-06T04:56:09Z", commits_30d: 0, commits_30d_capped: false },
      { name: "btx-035/swarm", default: false, last_commit_at: "2026-11-07T04:26:31Z", commits_30d: 100, commits_30d_capped: true },
      { name: "btx-035/lab", default: false, last_commit_at: "2026-10-21T05:26:59Z", commits_30d: 47, commits_30d_capped: false },
    ],
    pulls_updated_7d: 7,
    pulls_updated_7d_capped: false,
    latest_release: { tag: "v0.34.15", published_at: "2026-10-20T10:00:00Z" },
    latest_prerelease: { tag: "v0.34.16", published_at: "2026-11-07T05:45:55Z" },
  }, changes));
}

test("development activity keeps a stale main and capped counts as they are", () => {
  const dev = live.parseDevelopment(development({}), "btxchain/btx", NOW);
  assert.equal(dev.stale, false);
  assert.deepEqual(dev.branches.map((b) => [b.name, b.isDefault, b.commits, b.capped]), [
    ["main", true, 0, false],
    ["btx-035/swarm", false, 100, true],
    ["btx-035/lab", false, 47, false],
  ]);
  assert.equal(dev.pulls, 7);
  assert.equal(dev.release.tag, "v0.34.15");
  assert.equal(dev.prerelease.tag, "v0.34.16");
  assert.equal(live.formatTime(dev.measured), "2026-11-07 13:00 UTC");
});

test("an old measurement or the stale flag marks development activity stale", () => {
  assert.equal(live.parseDevelopment(development({ stale: true }), "btxchain/btx", NOW).stale, true);
  const old = live.parseDevelopment(development({}), "btxchain/btx", NOW + 4 * 3600000);
  assert.equal(old.stale, true);
});

test("development activity is refused unless the branch table is complete and clean", () => {
  const main = { name: "main", default: true, last_commit_at: "2026-10-06T04:56:09Z", commits_30d: 0, commits_30d_capped: false };
  const other = Object.assign({}, main, { name: "dev", default: false });
  for (const text of ["", "null", development({ schema_version: 2 }), development({ repository: "evil/btx" }),
    development({ measured_at: null }), development({ branches: [] }), development({ branches: [other, main] }),
    development({ branches: [main, main] }), development({ branches: new Array(7).fill(other).fill(main, 0, 1) }),
    development({ branches: [Object.assign({}, main, { name: "<img src=x>" })] }),
    development({ branches: [Object.assign({}, main, { name: "a/../b" })] }),
    development({ branches: [Object.assign({}, main, { name: "-x" })] }),
    development({ branches: [Object.assign({}, main, { commits_30d: 101 })] }),
    development({ branches: [Object.assign({}, main, { commits_30d: "5" })] }),
    development({ branches: [Object.assign({}, main, { last_commit_at: "soon" })] })]) {
    assert.equal(live.parseDevelopment(text, "btxchain/btx", NOW), null, text.slice(0, 120));
  }
});

test("optional development values that fail are dropped, not shown", () => {
  const dev = live.parseDevelopment(development({
    pulls_updated_7d: -1,
    latest_release: { tag: "<script>", published_at: "2026-10-20T10:00:00Z" },
    latest_prerelease: { tag: "v1", published_at: "never" },
  }), "btxchain/btx", NOW);
  assert.equal(dev.pulls, null);
  assert.equal(dev.release, null);
  assert.equal(dev.prerelease, null);
  assert.equal(live.parseDevelopment(development({ latest_prerelease: null }), "btxchain/btx", NOW).prerelease, null);
});

test("ages and GitHub links of branches", () => {
  const texts = { today: "today", day: "1 day ago", days: "{count} days ago" };
  assert.equal(live.formatAge(new Date(NOW - 3600000), NOW, texts), "today");
  assert.equal(live.formatAge(new Date(NOW - 86400000), NOW, texts), "1 day ago");
  assert.equal(live.formatAge(new Date("2026-10-06T04:56:09Z"), NOW, texts), "32 days ago");
  assert.equal(live.githubUrl("btxchain/btx", "commits", "btx-035/swarm"), "https://github.com/btxchain/btx/commits/btx-035/swarm");
  assert.equal(live.githubUrl("btxchain/btx", "releases/tag", "v0.34.16"), "https://github.com/btxchain/btx/releases/tag/v0.34.16");
});

test("links into the old single page lead to the page that holds the section now", () => {
  assert.equal(live.movedTarget("/", "#development"), "/network/#development");
  assert.equal(live.movedTarget("/de/", "#links"), "/de/links/#links");
  assert.equal(live.movedTarget("/", "#cat-pools"), "/links/#cat-pools");
  assert.equal(live.movedTarget("/de/", "#doc-venue-structure"), "/de/docs/#doc-venue-structure");
  assert.equal(live.movedTarget("/", "#about"), "/learn/#about");
  for (const [path, hash] of [["/", ""], ["/", "#start"], ["/", "#check"], ["/links/", "#development"],
    ["/", "#cat-<img>"], ["//evil.example/", "#links"], ["/", "#development/../x"]]) {
    assert.equal(live.movedTarget(path, hash), null, path + hash);
  }
});

// --- Developers page ---

const AREAS = [
  { id: "consensus", unit: 95.7, rank: null, loc: 2452 },
  { id: "validation", unit: 75.6, rank: 2, loc: 23687 },
  { id: "wallet", unit: 37.2, rank: 4, loc: 76263 },
  { id: "net-processing", unit: 24.6, rank: 1, loc: 25300 },
  { id: "other-net", unit: 50.4, rank: 1, loc: null },
  { id: "matmul", unit: 62.6, rank: 9, loc: 468217 },
  { id: "pq", unit: 92.7, rank: null, loc: null },
  { id: "security-v2", unit: 0.2, rank: null, loc: 5365 },
];

test("lanes are shown by kind and by whether they wait for an owner", () => {
  const lanes = [
    { kind: "area", waiting: false }, { kind: "area", waiting: true },
    { kind: "class", waiting: false }, { kind: "infra", waiting: false },
  ];
  const shown = (kind, waitingOnly) => lanes.filter((lane) => live.laneVisible(lane, kind, waitingOnly));
  assert.deepEqual(shown("area", false), lanes.slice(0, 2));
  assert.deepEqual(shown("all", true), [lanes[1]]);
  assert.deepEqual(shown("class", true), []);
  assert.deepEqual(shown("area", true), [lanes[1]]);
  assert.equal(shown("all", false).length, 4);
  assert.deepEqual(shown("bogus", false), []);
  assert.equal(live.laneVisible({ kind: "bogus", waiting: false }, "all", false), false);
});

test("registry rows are shown by status", () => {
  for (const status of ["worklist", "baseline", "count-first", "rule-only", "needs-ci", "generators", "evidence"]) {
    assert.equal(live.classVisible({ status }, "all"), true, status);
  }
  assert.equal(live.classVisible({ status: "evidence" }, "evidence"), true);
  assert.equal(live.classVisible({ status: "worklist" }, "evidence"), false);
  assert.equal(live.classVisible({ status: "worklist" }, "bogus"), false);
  assert.equal(live.classVisible({ status: "swept" }, "all"), false);
});

test("registry rows are counted per status", () => {
  const rows = [
    ...Array(2).fill("worklist"), ...Array(3).fill("baseline"), ...Array(7).fill("count-first"),
    ...Array(3).fill("rule-only"), ...Array(2).fill("needs-ci"), "generators", ...Array(2).fill("evidence"),
  ].map((status) => ({ status }));
  const expected = {
    all: 20, worklist: 2, baseline: 3, "count-first": 7, "rule-only": 3, "needs-ci": 2, generators: 1, evidence: 2,
  };
  assert.deepEqual(live.countByStatus(rows), expected);
  assert.deepEqual(live.countByStatus([...rows, { status: "bogus" }, null]), expected);
});

test("coverage areas sort by lowest coverage, risk rank and size", () => {
  assert.deepEqual(live.areaOrder(AREAS, "lowest"),
    ["security-v2", "net-processing", "wallet", "other-net", "matmul", "validation", "pq", "consensus"]);
  assert.deepEqual(live.areaOrder(AREAS, "risk"),
    ["net-processing", "other-net", "validation", "wallet", "matmul", "consensus", "pq", "security-v2"]);
  assert.deepEqual(live.areaOrder(AREAS, "size"),
    ["matmul", "wallet", "net-processing", "validation", "security-v2", "consensus", "other-net", "pq"]);
  assert.deepEqual(live.areaOrder(AREAS, "listed"), AREAS.map((area) => area.id));
  assert.deepEqual(live.areaOrder(AREAS, "bogus"), AREAS.map((area) => area.id));
  const tied = [{ id: "a", unit: 1, rank: null, loc: null }, { id: "b", unit: 1, rank: null, loc: null }];
  assert.deepEqual(live.areaOrder(tied, "lowest"), ["a", "b"]);
});

test("the data of a coverage row becomes numbers or null", () => {
  assert.deepEqual(live.areaFromRow({ unit: "37.2", rank: "", loc: "76263" }), { unit: 37.2, rank: null, loc: 76263 });
  assert.deepEqual(live.areaFromRow({ unit: "abc", rank: "4", loc: undefined }), { unit: null, rank: 4, loc: null });
});
