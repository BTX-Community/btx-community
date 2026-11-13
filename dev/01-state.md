# Where things stand

> Last verified: 2026-11-12 · against: btxchain/btx release-0.34.16 @ 4c7840e9 · owner role: state editor

This page holds the hub's living numbers. Every row gives a value, its source (a commit, a path, a PR number or a command you can run) and the day it was last checked. Other pages link here instead of repeating a number.

Labels: [read] = taken from a source; [tested] = a command was run for this page; [inferred] = judgement.

Two clocks run on this page:
- The branch and release rows (§1) follow the live repository. `tools/refresh-state.sh` prints fresh rows for them.
- The coverage and baseline rows (§3, §4) were measured once, at `c6f9678d`. They change only when a new measured run is published.

## 1. Branches and releases

| Fact | Value | Source | Verified on |
|---|---|---|---|
| `main` head | `476f3f23`, the commit of tag `v0.34.15` (committed 6 Oct 2026) [tested] | `git rev-parse origin/main 'v0.34.15^{commit}'` | 2026-11-12 |
| `release-0.34.16` head | `4c7840e9`, committed 12 Nov 2026, 12:46 UTC [tested] | `TZ=UTC git log -1 --date=iso-strict-local --format='%h %cd' origin/release-0.34.16`; `tools/refresh-state.sh` | 2026-11-12 |
| Release line vs `main` | 1,194 commits ahead, 0 behind [tested] | `git rev-list --count origin/main..origin/release-0.34.16` and the reverse range | 2026-11-12 |
| Latest release | `v0.34.16`, published 7 Nov 2026 as a **pre-release**. One asset: a Linux x86_64 archive. No signed sums file; the release notes say so. The tag points at `d27530af`; the release-line head is 161 commits past it [read, tested] | [release page](https://github.com/btxchain/btx/releases/tag/v0.34.16); `git rev-list --count d27530af..4c7840e9` | 2026-11-12 |
| v0.34.16 system floor | `btxd` and `btx-cli` need GLIBC 2.38 (Ubuntu 24.04, Debian 13). `btx-qt` needs GLIBC 2.43 [read] | v0.34.16 release notes | 2026-11-12 |
| Latest full release | `v0.34.15`, 6 Oct 2026: macOS arm64, Linux x86_64 and Linux x86_64 CUDA 13 archives [read] | [release page](https://github.com/btxchain/btx/releases/tag/v0.34.15) | 2026-11-12 |
| Other pre-releases | `v0.35.0-rc1` (13 Oct) and lab builds are listed on the releases page. This hub works against `release-0.34.16` [read] | [releases](https://github.com/btxchain/btx/releases) | 2026-11-12 |

## 2. What the release line takes

| Fact | Value | Source | Verified on |
|---|---|---|---|
| Frozen set | The maintainer (numair) on #464: the validation, fork-choice and MatMul-frontier entries stay out of `release-0.34.16`, and `src/validation.cpp` is unchanged [read] | #464, 11 Nov | 2026-11-12 |
| How this hub applies it | Changes to the rules in `src/validation.cpp`, `src/pow.cpp`, `src/consensus/`, `src/script/interpreter.cpp`, fork choice and download scheduling in `src/net_processing.cpp`, the attestation rules in `src/node/matmul_trusted_attestations.*`, and `src/matmul/` go to #464 as evidence items, not as pull requests into `release-0.34.16`. The attestation entry is this hub's own conservative reading [inferred]. A fix near these files that changes none of those rules can land: the PQ attestation lock order (#478, `c6a9bef1`) and the attestation blocklist extension (#583) did [read: #464, 11 Nov; `git log` on the release line] | `06-pr-gate.md` §2; `07-lanes.md` (E-CONSENSUS) | 2026-11-12 |
| The five invited items | #464 named #309, #313, #333, #363 and #382 as non-consensus and said a new standalone PR is the way to bring each in. All five landed on 12 Nov, cherry-picked by the maintainer within hours of being opened: #579 (`d4012aea`), #583 (`4c7840e9`, an attestation blocklist extension), #580 (`f213e4d1`), #581 (`1c4da270`), #582 (`27c07c18`) [tested] | `git log -1 --format=%B <commit>` names each PR head as the cherry-pick source; compare with `git ls-remote https://github.com/btxchain/btx.git 'refs/pull/579/head' 'refs/pull/58[0-3]/head'` | 2026-11-12 |
| #464 now | Open [read: #464]. With the five non-consensus items landed, what is left on its list is the set the maintainer kept out of the release line [inferred] | #464 | 2026-11-12 |

## 3. Coverage

> **Coverage is measured again.** The coverage build (`-DCMAKE_BUILD_TYPE=Coverage`) configures again on `release-0.34.16` since #578 landed on 12 Nov (commit `7051507b`). The fix is not in v0.34.15 (`main`, `476f3f23`). Measured at `c6f9678d` with the same fix applied: product-code lines **65.8%** unit-only and **69.9%** unit + functional; branches **37.7%** and **40.7%**. All four numbers are floors: 47 unit suites timed out and 82 of 208 functional scripts failed in the coverage run, and a test that is killed writes no data. Reproduce it with the recipe in [`04-build-and-test.md` §5](04-build-and-test.md#5-coverage-gcc-linux).

| Fact | Value | Source | Verified on |
|---|---|---|---|
| Fix on the release line | `7051507b` "cmake: build the coverage source mirror after the build only", cherry-picked from the #578 head `179fac37` [tested] | `git log -1 --format=%B 7051507b` | 2026-11-12 |
| Fix absent from `main` | `git merge-base --is-ancestor 7051507b origin/main` exits 1; `main` still runs `CoverageSanitize.cmake` at configure time (`CMakeLists.txt` line 666 and lines 670-675 at `476f3f23`) [tested] | the command; `git show 476f3f23:CMakeLists.txt` | 2026-11-12 |
| Build and tools | gcc 13.3, `-Og --coverage`, gcovr 8.8 [read] | `plan/MASTER-PLAN.md` §1.1 | 2026-11-12 |
| Unit run | 2,625 ctest entries: 2,575 passed, 47 timed out at 3,600 s, 2 failed, 1 skipped [read] | `plan/MASTER-PLAN.md` §1.1 | 2026-11-12 |
| Functional run | 208 scripts of the `test_runner.py` default list: 124 passed, 2 skipped, 82 failed. 48 of the 82 stall with "ExactReplay required" on the slow coverage build [read] | `plan/MASTER-PLAN.md` §1.1 | 2026-11-12 |
| Scope | Product code: 5,519 files, 623,410 lines. Functions: 76.3% unit-only, 80.4% unit + functional [read] | `plan/plan-data.json` (`coverage.overall`) | 2026-11-12 |

Line coverage per area, product code, at `c6f9678d` [read: `plan/MASTER-PLAN.md` §1.1, `plan/plan-data.json`]:

| Area | Unit | Unit + functional |
|---|---:|---:|
| consensus | 95.7 | 96.6 |
| `validation.cpp` | 75.6 | 78.2 |
| script | 80.7 | 81.2 |
| wallet | 37.2 | 50.5 |
| `net_processing.cpp` | 24.6 | 62.3 |
| other net | 50.4 | 75.5 |
| rpc | 51.6 | 72.9 |
| node | 69.9 | 79.6 |
| matmul (47 suites time out: not measured) | 62.6 | 62.7 |
| shielded | 71.8 | 72.3 |
| modelnet | 83.7 | 85.6 |
| pq | 92.7 | 92.7 |

- `peerman_tests` timed out and wrote no data, so the unit-only figure for `net_processing.cpp` understates its unit tests [read: plan §1.1].
- Functions never executed by the unit + functional runs: consensus 68, `net_processing.cpp` 102, wallet 927, rpc 103, matmul verification 507 [read: plan §1.1].
- The 31 commits from `c6f9678d` to `4c7840e9` do not touch `src/validation.cpp`, `src/net_processing.cpp`, `src/pow.cpp`, `src/consensus/` or `src/script/interpreter.cpp` [tested: `git diff --stat c6f9678d 4c7840e9 -- <those paths>` prints nothing]. The consensus and `net_processing.cpp` rows still hold.
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
| Upstream hosted CI | None for node validation, by policy: the repository "does not use GitHub-hosted CI for validation". The only workflow files on `release-0.34.16` are three Atlas workflows: `atlas-native.yml` and `atlas-source.yml` run on pull requests that touch the Atlas tree, and `release-atlas-binaries.yml` runs only by hand (`workflow_dispatch`). On `main` the folder holds only that README [read] | `.github/workflows/README.md` and `git ls-tree --name-only 4c7840e9 .github/workflows/` | 2026-11-12 |
| Contributor gates | Run on contributor forks; every class PR links its fork run (fails before, passes after). The fork workflow first ran on 12 Nov at `4c7840e9` and was red; a fixed branch is pending. Separately, the status page's operator publishes a nightly Linux build with unit and functional tests on `release-0.34.16` (its API calls the job CI-0; it is not the fork build matrix) [read] | `plan/MASTER-PLAN.md` §4.1; `07-lanes.md` (I-CI); `https://network.btx-monitoring.com/api/v1/ci.json` | 2026-11-13 |
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
git fetch origin main release-0.34.16 --tags
git rev-parse origin/main 'v0.34.15^{commit}'                 # the same commit twice
TZ=UTC git log -1 --date=iso-strict-local --format='%h %cd' origin/release-0.34.16   # time in UTC
git rev-list --count origin/main..origin/release-0.34.16      # ahead
git rev-list --count origin/release-0.34.16..origin/main      # behind
git merge-base --is-ancestor 7051507b origin/release-0.34.16 && echo "coverage fix: on the release line"
git merge-base --is-ancestor 7051507b origin/main || echo "coverage fix: not on main"
git rev-list --count d27530af..origin/release-0.34.16          # commits past the v0.34.16 tag
git grep -h -E '^FUZZ_TARGET\(' origin/release-0.34.16 -- src | wc -l
```

If any line prints something other than the tables above, the page is stale. Stop citing the old value: open a pull request that updates the row, its "Verified on" date and the "Last verified" line at the top.

Refresh the head rows with `tools/refresh-state.sh`; the coverage and baseline rows change only when a measured run is published and `plan/plan-data.json` is updated with its `measured_at`.
