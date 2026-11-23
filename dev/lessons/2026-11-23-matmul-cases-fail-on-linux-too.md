# Lesson: label every test result with its platform and commit, and check the reference platform before calling a failure platform-specific

> Last verified: 2026-11-23 · against: btxchain/btx release-0.34.17 @ d9a94804 · owner role: lessons reviewer

**Filed:** 2026-11-23 · **Area:** functional tests, MatMul (I-CI, I-XDEV) · **Status:** open

## What happened

Results for the same MatMul functional cases came in from two platforms:

- A Mac ARM run of the default list on `2c4da891` (21 Nov) reported five MatMul failures. On 22 Nov two of them passed in the maintainer's run, and "the three remaining Mac ARM MatMul cases" stayed open [read: #714, 21 and 22 Nov].
- A Linux x86_64 run on `d9a94804` (22 Nov) showed the same three failing in every run, at the same line each time [read: #714, 22 Nov]:
  - `feature_matmul_trusted_mirror_convergence.py`
  - `p2p_matmul_encdr_pending_cap_retain.py`
  - `p2p_matmul_ibd_budget_enforcement.py`
- The status page's nightly CI-0 run of `release-0.34.17` at `2c4da891` lists all three among its failures too [read: `https://network.btx-monitoring.com/api/v1/ci.json`, 23 Nov; CI-0 runs on Linux, [`01-state.md`](../01-state.md) §6].

A list called "Mac ARM cases" is easy to read as "Mac-only". It is not: these cases fail on Linux as well.

## What was done

The Linux result went on #714 with the line where each case stops.

## The rule now

1. Label each result with its platform and commit: "Mac ARM, `2c4da891`" is a result, "Mac-only" is a claim.
2. Before you call a failure platform-specific, run it on the reference platform (Linux x86_64) at the same commit ([`AGENTS.md`](../AGENTS.md) §6, "Reference platform").
3. Check the CI-0 feed first. If its run of the same branch lists the script among its failures, the failure is not specific to your platform.

## Source

- #714: the Mac ARM results comment (21 Nov), the maintainer's comment of 22 Nov, and the Linux results comment on `d9a94804` (22 Nov) [read].
- The CI-0 feed: its `runs` entry for `release-0.34.17` at `2c4da891` [read, 23 Nov].

## Verified by (command, commit, platform)

```bash
curl -s https://network.btx-monitoring.com/api/v1/ci.json | python3 -c 'import json,sys; [print(r["branch"], r["commit"], r["suites"]["functional"]["failed_names"]) for r in json.load(sys.stdin)["runs"]]'
```

Run on 23 Nov on macOS. Its `release-0.34.17` line read `2c4da891` with six failed names: the three above, `feature_matmul_trusted_mirror_bounded_park.py`, `feature_matmul_trusted_mirror_bounded_stall_open.py` and `wallet_importbundle_shielded.py --descriptors`. Not verified: the three cases were not rerun for this lesson.

## Hub pages to change

- `04-build-and-test.md` §4: the known-state bullet for `d9a94804` (done in the same PR as this lesson).
- exam: a possible new question on labelling a single-platform result.
