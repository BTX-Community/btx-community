# Where things stand

> Last verified: 2026-11-17 · against: btxchain/btx release-0.34.17 @ 23ee567e · owner role: state editor

This page holds the hub's living numbers. Every row gives a value, its source (a commit, a path, a PR number or a command you can run) and the day it was last checked. Other pages link here instead of repeating a number.

Labels: [read] = taken from a source; [tested] = a command was run for this page; [inferred] = judgement.

Two clocks run on this page:
- The branch and release rows (§1) follow the live repository. `tools/refresh-state.sh` prints fresh rows for them.
- The coverage rows (§3) were measured at `a5d1637f` on 14 Nov 2026; the baseline rows (§4) once, at `c6f9678d`. They change only when a new measured run is published.

## 1. Branches and releases

| Fact | Value | Source | Verified on |
|---|---|---|---|
| `main` head | `074dac16`, the commit of tag `v0.34.16` (committed 15 Nov 2026, 05:54 UTC) [tested] | `git rev-parse origin/main 'v0.34.16^{commit}'`; `tools/refresh-state.sh` | 2026-11-17 |
| `release-0.34.16` head | `074dac16`, the same commit as `main` and the v0.34.16 tag; the branch has not moved since 15 Nov [tested] | `git rev-parse origin/release-0.34.16` | 2026-11-17 |
| `release-0.34.17` head | `23ee567e`, committed 17 Nov 2026, 18:42 UTC [tested] | `TZ=UTC git log -1 --date=iso-strict-local --format='%h %cd' origin/release-0.34.17`; `tools/refresh-state.sh` | 2026-11-17 |
| Release line vs `main` | `release-0.34.17` is 167 commits ahead of `main`, 0 behind [tested] | `git rev-list --count origin/main..origin/release-0.34.17` and the reverse range | 2026-11-17 |
| Where PRs go | All 135 PRs from #717 (15 Nov, 11:09 UTC) to #851 (17 Nov, 16:20 UTC) have `release-0.34.17` as their base; the last PRs into `release-0.34.16` were #693 to #696, opened on 14 Nov [tested]. The maintainer cherry-picks PRs onto `release-0.34.17` in rounds, keeps their authors, notes each on its PR and leaves the PR open [read: #714, 16 and 17 Nov; #781, 16 Nov] | GitHub API `repos/btxchain/btx/pulls?state=all` (`base.ref`); #714 | 2026-11-17 |
| Latest release | `v0.34.16`, a full release (on 12 Nov it was listed as a pre-release). The tag points at `074dac16` (tagged 15 Nov). Three assets: a Linux x86_64 archive, a Linux x86_64 CUDA 13 archive and `SHA256SUMS`, which is not signed; the archives were replaced on 15 Nov. No macOS or Windows archive [read, tested] | [release page](https://github.com/btxchain/btx/releases/tag/v0.34.16); `git rev-parse 'v0.34.16^{commit}'` | 2026-11-17 |
| v0.34.16 system floor | Both archives leave out `btx-qt` and `btx-atlas`, which need a newer glibc on that build; every bundled library is within GLIBC 2.38 [read] | v0.34.16 release notes | 2026-11-17 |
| Latest full release | `v0.34.16` (row above). Before it, `v0.34.15`, 6 Oct 2026: macOS arm64, Linux x86_64 and Linux x86_64 CUDA 13 archives; for macOS it is still the newest [read] | [release page](https://github.com/btxchain/btx/releases/tag/v0.34.15) | 2026-11-17 |
| Other pre-releases | `v0.35.0-rc1` (13 Oct) and lab builds are listed on the releases page. This hub works against `release-0.34.17` [read] | [releases](https://github.com/btxchain/btx/releases) | 2026-11-17 |

## 2. What the release line takes

| Fact | Value | Source | Verified on |
|---|---|---|---|
| Frozen set | The maintainer (numair) on #464: the validation, fork-choice and MatMul-frontier entries stay out of `release-0.34.16`, and `src/validation.cpp` is unchanged [read] | #464, 11 Nov | 2026-11-12 |
| Since 15 Nov | The release branch is `release-0.34.17`. The maintainer on #714 (16 Nov): "The open pull requests through #792 that do not change consensus or a spend are on this branch as well." The later rounds (#793 to #808 and #809 to #816, 17 Nov) are noted the same way: "Authors are unchanged on the cherry-picks" [read] | #714, 16 and 17 Nov | 2026-11-17 |
| How this hub applies it | Changes to the rules in `src/validation.cpp`, `src/pow.cpp`, `src/consensus/`, `src/script/interpreter.cpp`, fork choice and download scheduling in `src/net_processing.cpp`, the attestation rules in `src/node/matmul_trusted_attestations.*`, and `src/matmul/` go to #464 as evidence items, not as pull requests into a release branch (`release-0.34.17` since 15 Nov). The attestation entry is this hub's own conservative reading [inferred]. A fix near these files that changes none of those rules can land: the PQ attestation lock order (#478, `c6a9bef1`) and the attestation blocklist extension (#583) did; both are in v0.34.16 [read: #464, 11 Nov; `git log` on the release line; tested: `git merge-base --is-ancestor c6a9bef1 v0.34.16`, the same for `4c7840e9`] | `06-pr-gate.md` §2; `07-lanes.md` (E-CONSENSUS) | 2026-11-17 |
| The five invited items | #464 named #309, #313, #333, #363 and #382 as non-consensus and said a new standalone PR is the way to bring each in. All five landed on 12 Nov, cherry-picked by the maintainer within hours of being opened: #579 (`d4012aea`), #583 (`4c7840e9`, an attestation blocklist extension), #580 (`f213e4d1`), #581 (`1c4da270`), #582 (`27c07c18`) [tested] | `git log -1 --format=%B <commit>` names each PR head as the cherry-pick source; compare with `git ls-remote https://github.com/btxchain/btx.git 'refs/pull/579/head' 'refs/pull/58[0-3]/head'` | 2026-11-12 |
| #464 now | Open [read: #464]. With the five non-consensus items landed, what is left on its list is the set the maintainer kept out of the release line [inferred]. On 15 Nov the maintainer answered there: "This list was taken against an older `release-0.34.16` and `btx-035/swarm`. `main` is now `074dac16`, and the 0.34.17 work is #714. The closed set from 2026-11-03 is not being replayed into this branch." [read]. Where evidence items go for 0.34.17 is not settled in this hub [inferred] | #464, 15 Nov | 2026-11-17 |

## 3. Coverage

> **Coverage is measured again.** The coverage build (`-DCMAKE_BUILD_TYPE=Coverage`) configures again since #578 landed on the release line on 12 Nov (commit `7051507b`). The fix shipped in v0.34.16 and is not in v0.34.15 (`476f3f23`). Measured on `swapnet-v2` at `a5d1637f` on 14 Nov, which contains the fix and is part of v0.34.16: product-code lines **67.4%** unit-only and **72.3%** unit + functional; branches **38.9%** and **42.6%**. In the coverage run 42 unit suites timed out and 14 of 220 functional scripts failed, and a test that is killed writes no data. The time budgets were shorter than in the 12 Nov run at `c6f9678d` (unit 2.5 h instead of 3 h, functional 100 min instead of 3 h), so the figures are floors and the comparison with that run is indicative. Reproduce it with the recipe in [`04-build-and-test.md` §5](04-build-and-test.md#5-coverage-gcc-linux).

| Fact | Value | Source | Verified on |
|---|---|---|---|
| Fix on the release line | `7051507b` "cmake: build the coverage source mirror after the build only", cherry-picked from the #578 head `179fac37` [tested] | `git log -1 --format=%B 7051507b` | 2026-11-12 |
| Fix absent from v0.34.15 | `git merge-base --is-ancestor 7051507b v0.34.15` exits 1; v0.34.15 still runs `CoverageSanitize.cmake` at configure time (`CMakeLists.txt` line 666 and lines 670-675 at `476f3f23`). The fix is in v0.34.16, which is `main` since 15 Nov [tested] | the command; `git show 476f3f23:CMakeLists.txt`; `git merge-base --is-ancestor 7051507b v0.34.16` | 2026-11-17 |
| Build and tools | gcc 13.3, `-Og --coverage`, gcovr 8.8 [read] | `plan/MASTER-PLAN.md` §1.1 | 2026-11-15 |
| Unit run | 2,629 ctest entries: 2,583 passed, 42 timed out or were stopped by the unit time budget, 3 failed, 1 skipped [read] | `plan/MASTER-PLAN.md` §1.1 | 2026-11-15 |
| Functional run | 220 scripts of the `test_runner.py` default list: 204 passed, 2 skipped, 14 failed. None of the 14 stalled with "ExactReplay required"; on 12 Nov at `c6f9678d`, 48 of 82 failures did [read] | `plan/MASTER-PLAN.md` §1.1 | 2026-11-15 |
| Scope | Product code: 5,530 files, 625,368 lines. Functions: 77.7% unit-only, 82.7% unit + functional [read] | `plan/plan-data.json` (`coverage.overall`) | 2026-11-15 |

Line coverage per area, product code, at `a5d1637f` [read: `plan/MASTER-PLAN.md` §1.1, `plan/plan-data.json`]:

| Area | Unit | Unit + functional |
|---|---:|---:|
| consensus | 95.7 | 97.7 |
| `validation.cpp` | 77.0 | 79.8 |
| script | 80.8 | 81.3 |
| wallet | 37.4 | 63.0 |
| `net_processing.cpp` | 59.8 | 72.1 |
| other net | 52.7 | 77.3 |
| rpc | 52.0 | 76.5 |
| node | 72.7 | 81.9 |
| matmul (41 suites time out: not measured) | 63.9 | 63.9 |
| shielded | 72.1 | 76.9 |
| modelnet | 84.1 | 86.2 |
| pq | 92.7 | 92.7 |

- `peerman_tests` passed this time, in the retry pass; on 12 Nov it timed out and wrote no data. That is the main reason the unit-only figure for `net_processing.cpp` rose from 24.6 to 59.8 [inferred]; the file also changed between the two commits (next item) [read: plan §1.1].
- Functions never executed by the unit + functional runs (measured 12 Nov at `c6f9678d`); the 14 Nov run kept no trace data to recount them: consensus 68, `net_processing.cpp` 102, wallet 927, rpc 103, matmul verification 507 [read: plan §1.1].
- The 31 commits from `c6f9678d` to `4c7840e9` do not touch `src/validation.cpp`, `src/net_processing.cpp`, `src/pow.cpp`, `src/consensus/` or `src/script/interpreter.cpp` [tested: `git diff --stat c6f9678d 4c7840e9 -- <those paths>` prints nothing]. The coverage run is later: `a5d1637f` is 177 commits after `4c7840e9` [tested: `git rev-list --count 4c7840e9..a5d1637f`] and 48 commits before the v0.34.16 tag [tested: `git rev-list --count a5d1637f..v0.34.16`], and from `c6f9678d` to `a5d1637f`, of those paths only `src/net_processing.cpp` changed (155 lines added, 12 removed) [tested: `git diff --stat c6f9678d a5d1637f -- <those paths>`].
- Ratchet: the baseline only goes up. A later run states its commit and its suite set; a total that rose because more suites wrote data is not an improvement in tests.

## 4. Static and dynamic baselines

All numbers below are results, untriaged. Each one is a lead until someone reads the code and reproduces it on the live head. Measured at `c6f9678d` [read: `plan/MASTER-PLAN.md` §1.2-§1.3, `plan/plan-data.json` (`static`)].

| Tool | Baseline | Note | Verified on |
|---|---|---|---|
| ThreadSanitizer | 41 site pairs (247 reports, 8 classes: 5 in product code, 3 test-side) | clang 20 | 2026-11-12 |
| `-Wthread-safety` | 266 warnings | | 2026-11-12 |
| DEBUG_LOCKORDER | 1 lock-order inversion, wallet code | known; on the A-SHIELDED lane's list | 2026-11-12 |
| cppcheck 2.13 | 372 product-code results (26 errors) | | 2026-11-12 |
| CodeQL 2.27.4 | 260 product-code results outside the maintainability and documentation rules; 150 security-tagged, 133 of those in one class (file-system and environment trust) | | 2026-11-12 |
| clang-tidy (the repo's own `src/.clang-tidy`) | 1,033 warnings | | 2026-11-12 |

Each baseline may only shrink. Do not re-run these tools to "check" them; reuse the results and re-grep only the live head (`04-build-and-test.md` §6). Security-relevant findings go through GitHub private vulnerability reporting on `btxchain/btx`, never into a public issue, PR or chat.

## 5. Fuzzing

| Fact | Value | Source | Verified on |
|---|---|---|---|
| Targets in the source | 238 `FUZZ_TARGET(...)` definitions plus 33 `FUZZ_TARGET_DESERIALIZE(...)` instances under `src/` at `4c7840e9`; one more than at `c6f9678d` (#580 added `matmul_rc_admission_store`). One target is hidden from the list [tested] | `git grep -h -E '^FUZZ_TARGET\(' 4c7840e9 -- src \| wc -l`; `git grep -h 'FUZZ_TARGET_DESERIALIZE(' 4c7840e9 -- src/test/fuzz/deserialize.cpp \| grep -vc define` | 2026-11-12 |
| Targets in a build | Depends on build options (`WITH_MODELNET`, `ENABLE_WALLET`). The binary prints its own list, without hidden targets; that list is authoritative. Not run for this page [read: `src/test/fuzz/fuzz.cpp`, `src/test/fuzz/CMakeLists.txt`] | `PRINT_ALL_FUZZ_TARGETS_AND_ABORT=1 build_fuzz/bin/fuzz \| wc -l` | 2026-11-12 |
| The earlier count of 239 | A text count (the plan's first figure, corrected in `plan/MASTER-PLAN.md` §1.5): every line of a `.cpp` file under `src/` that contains `FUZZ_TARGET(`, which includes the one line inside the `FUZZ_TARGET_DESERIALIZE` macro. It is not a list of runnable targets [tested] | `git grep -h 'FUZZ_TARGET(' 4c7840e9 -- 'src/*.cpp' \| wc -l` | 2026-11-12 |
| ModelNet fuzz build | Does not link at default options; 7 targets have never run [read] | `plan/MASTER-PLAN.md` §1.5 | 2026-11-12 |
| Gaps | No target yet for several peer message families, the ML-KEM hybrid handshake, the helper dispatcher, model-file import or any BTX RPC [read] | `plan/MASTER-PLAN.md` §1.5 | 2026-11-12 |

## 6. Where the gates run

| Fact | Value | Source | Verified on |
|---|---|---|---|
| Upstream hosted CI | None for node validation, by policy: the repository "does not use GitHub-hosted CI for validation". The only workflow files on `release-0.34.17`, and on `main` since v0.34.16, are three Atlas workflows: `atlas-native.yml` and `atlas-source.yml` run on pull requests that touch the Atlas tree, and `release-atlas-binaries.yml` runs only by hand (`workflow_dispatch`). v0.34.15 has only the README there [read] | `.github/workflows/README.md`; `git ls-tree --name-only v0.34.16 .github/workflows/`, the same on `release-0.34.17` and on `v0.34.15` | 2026-11-17 |
| Contributor gates | Run on contributor forks; every class PR links its fork run (fails before, passes after). The fork workflow ran on 12 Nov at `4c7840e9` and on 13 Nov at `88c9b49c`, red both times. Separately, the status page's operator publishes the results of nightly build and test runs on Linux, one per branch: `release-0.34.16` and `release-0.34.17` (its API calls the job CI-0; it is not the fork build matrix) [read, 18 Nov] | `plan/MASTER-PLAN.md` §4.1; `07-lanes.md` (I-CI); fork run list (GitHub API); `https://network.btx-monitoring.com/api/v1/ci.json` | 2026-11-18 |
| Agent rules upstream | `AGENTS.md` and `HUMANS.md` sit at the repo root. `AGENTS.md`: default posture is read-only unless the operator asked [read] | `git show 4c7840e9:AGENTS.md` | 2026-11-12 |

## 7. Operators and community infrastructure

| Fact | Value | Source | Verified on |
|---|---|---|---|
| Operator safe profile (G1) | Run `-modelnet=0` and `-natpmp=0` on any node that holds a wallet or a signer key. Review `-autoupdate` and decide whether to keep it: it is on by default on mainnet (next row) [read] | `plan/MASTER-PLAN.md` §4.4 | 2026-11-12 |
| Defaults behind it | On `main` and on the release line: `-modelnet` defaults to 1 when built with ModelNet; `-natpmp` defaults to 1; `-autoupdate` defaults to 1 on mainnet. On the release line the `-autoupdate` help text adds: 0 when `-proxy` is set or `-onlynet` excludes IPv4 and IPv6 [read] | `src/init.cpp` (`-modelnet`, `-natpmp`, `-autoupdate` help texts) and `src/mapport.h` (`DEFAULT_NATPMP`) at `476f3f23` and `4c7840e9` | 2026-11-12 |
| Network status | `https://network.btx-monitoring.com/api/v1/status.json`: supply, height and network metrics, measured from an archive node; run by this repository's maintainer [read] | this repo's `README.md` | 2026-11-12 |
| Snapshots | Daily datadir snapshot, checked and signed by a second node: [dr-chambre/btx-snapshots](https://github.com/dr-chambre/btx-snapshots) [read] | this repo's `site/content/community.yaml` | 2026-11-12 |
| Archive nodes | Two, run by the operator of the status page [read] | this repo's `README.md` ("Maintainer") | 2026-11-12 |

## 8. Check this page yourself

```bash
git clone https://github.com/btxchain/btx.git && cd btx
git fetch origin main release-0.34.16 release-0.34.17 --tags
git rev-parse origin/main origin/release-0.34.16 'v0.34.16^{commit}'   # the same commit three times
TZ=UTC git log -1 --date=iso-strict-local --format='%h %cd' origin/release-0.34.17   # time in UTC
git rev-list --count origin/main..origin/release-0.34.17      # ahead
git rev-list --count origin/release-0.34.17..origin/main      # behind
git merge-base --is-ancestor 7051507b v0.34.16 && echo "coverage fix: in v0.34.16"
git merge-base --is-ancestor 7051507b v0.34.15 || echo "coverage fix: not in v0.34.15"
git grep -h -E '^FUZZ_TARGET\(' 4c7840e9 -- src | wc -l      # the section 5 count, at 4c7840e9
```

If any line prints something other than the tables above, the page is stale. Stop citing the old value: open a pull request that updates the row, its "Verified on" date and the "Last verified" line at the top.

Refresh the head rows with `tools/refresh-state.sh`; the coverage and baseline rows change only when a measured run is published and `plan/plan-data.json` is updated with its `measured_at`.
