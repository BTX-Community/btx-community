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
