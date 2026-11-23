# Where things stand

> Last verified: 2026-11-23 · against: btxchain/btx release-0.34.17 @ 932a0238 · owner role: state editor

This page holds the hub's living numbers. Every row gives a value, its source (a commit, a path, a PR number or a command you can run) and the day it was last checked. Other pages link here instead of repeating a number.

Labels: [read] = taken from a source; [tested] = a command was run for this page; [inferred] = judgement.

Two clocks run on this page:
- The branch and release rows (§1) follow the live repository. `tools/refresh-state.sh` prints fresh rows for them.
- The coverage rows (§3) were measured at `a5d1637f` on 14 Nov 2026; the baseline rows (§4) once, at `c6f9678d`. They change only when a new measured run is published. The weekly feed row at the top of §3 names its own commit.

## 1. Branches and releases

| Fact | Value | Source | Verified on |
|---|---|---|---|
| `main` head | `074dac16`, the commit of tag `v0.34.16` (committed 15 Nov 2026, 05:54 UTC) [tested] | `git rev-parse origin/main 'v0.34.16^{commit}'`; `tools/refresh-state.sh` | 2026-11-23 |
| `release-0.34.16` head | `074dac16`, the same commit as `main` and the v0.34.16 tag; the branch has not moved since 15 Nov [tested] | `git rev-parse origin/release-0.34.16` | 2026-11-23 |
| `release-0.34.17` head | `932a0238`, committed 23 Nov 2026, 09:50 UTC [tested]. Since `d9a94804` (22 Nov) only the FastStart installer and its test changed (#932 and a follow-up), so the node code is unchanged [tested: `git diff --stat d9a94804 932a0238`] | `TZ=UTC git log -1 --date=iso-strict-local --format='%h %cd' origin/release-0.34.17`; `tools/refresh-state.sh` | 2026-11-23 |
| Release line vs `main` | `release-0.34.17` is 266 commits ahead of `main`, 0 behind [tested] | `git rev-list --count origin/main..origin/release-0.34.17` and the reverse range | 2026-11-23 |
| Where PRs go | Every PR from #717 (15 Nov, 11:09 UTC) to #939 (22 Nov, 23:53 UTC) has `release-0.34.17` as its base. None of #836 to #939 is merged on GitHub [tested: the bases of #717 to #851 on 17 Nov; the bases and merge state of #836 to #939 on 23 Nov] | GitHub API `repos/btxchain/btx/pulls?state=all` (`base.ref`, `merged_at`) | 2026-11-23 |
| How PRs land | The maintainer takes PRs onto `release-0.34.17` in rounds, as commits that keep their authors, lists each round on #714 and leaves the PRs open [read: #714, 20 to 22 Nov; tested: `git log --format=%an v0.34.17..origin/release-0.34.17` shows five authors]. On 22 Nov: "This stays on #714. No second release branch." [read] | #714 | 2026-11-23 |
| The `v0.34.17` tag | Points at `3808e2a9` (committed 20 Nov, 10:14 UTC), which is on the release line, 32 commits before its head [tested]. The published v0.34.17 archives were cut from that commit [read: release page; #714, 22 Nov] | `git rev-parse 'v0.34.17^{commit}'`; `git rev-list --count v0.34.17..origin/release-0.34.17` | 2026-11-23 |
| Latest release | `v0.34.17`, a **pre-release**, published 20 Nov 2026. Four assets: a Linux x86_64 archive, a Linux x86_64 CUDA 13 archive, `btx-release-manifest.json` and `SHA256SUMS`, which is not signed. No macOS or Windows archive. The release text: "This is not merged", and Profile-1 ExactReplay "has not been resealed for this commit" [read, tested] | [release page](https://github.com/btxchain/btx/releases/tag/v0.34.17); `tools/refresh-state.sh` | 2026-11-23 |
| v0.34.17 system floor | The binaries need GLIBC 2.38, GLIBCXX 3.4.32 and CXXABI 1.3.15, so Ubuntu 22.04 cannot run them. `btx-qt` is not in the archives. They bundle libevent, libsqlite3, libzmq, libgomp, OpenSSL and the Python 3.14 runtime; libc, libstdc++ and `libcuda` stay on the host [read: release page]. The published CUDA build needs compute capability 8.0 or newer [read: `doc/release-notes-0.34.17.md:51` at `d9a94804`] | release page; release notes | 2026-11-23 |
| Open before v0.34.17 is final | The maintainer on #714 (22 Nov, at `d9a94804`): the published archives are still `3808e2a9`, checksums are still unsigned, and ExactReplay of `d9a94804` has not been run. The open items listed there include the hosted Mac timeout, the forced IPv4 LAN case, the three remaining MatMul cases, `wallet_descriptor.py`, the second BTX/BTC lifecycle run and #909 [read]. A results comment later that day reports, on `d9a94804` (Linux x86_64), BTX/BTC lifecycles 5/5 twice and the same three MatMul cases failing in every run [read: #714, 22 Nov]; [`04-build-and-test.md`](04-build-and-test.md) §4 | #714, 22 Nov | 2026-11-23 |
| Latest full release | `v0.34.16`. The tag points at `074dac16` (tagged 15 Nov). Three assets: a Linux x86_64 archive, a Linux x86_64 CUDA 13 archive and `SHA256SUMS`, which is not signed; the archives were replaced on 15 Nov. No macOS or Windows archive [read, tested] | [release page](https://github.com/btxchain/btx/releases/tag/v0.34.16); `git rev-parse 'v0.34.16^{commit}'`; `tools/refresh-state.sh` | 2026-11-23 |
| v0.34.16 system floor | Both archives leave out `btx-qt` and `btx-atlas`, which need a newer glibc on that build; every bundled library is within GLIBC 2.38 [read] | v0.34.16 release notes | 2026-11-17 |
| macOS | `v0.34.15` (6 Oct 2026) is the newest full release with a macOS arm64 archive; v0.34.16 and v0.34.17 have none [read] | [release page](https://github.com/btxchain/btx/releases/tag/v0.34.15) | 2026-11-23 |
| Other pre-releases | `v0.35.0-rc1` (13 Oct) and lab builds are listed on the releases page. This hub works against `release-0.34.17` [read] | [releases](https://github.com/btxchain/btx/releases) | 2026-11-23 |

## 2. What the release line takes

| Fact | Value | Source | Verified on |
|---|---|---|---|
| Frozen set | The maintainer (numair) on #464: the validation, fork-choice and MatMul-frontier entries stay out of `release-0.34.16`, and `src/validation.cpp` is unchanged [read] | #464, 11 Nov | 2026-11-12 |
| Since 15 Nov | The release branch is `release-0.34.17`. The maintainer on #714 (16 Nov): "The open pull requests through #792 that do not change consensus or a spend are on this branch as well." The later rounds (#793 to #808 and #809 to #816, 17 Nov) are noted the same way: "Authors are unchanged on the cherry-picks" [read] | #714, 16 and 17 Nov | 2026-11-17 |
| 20 to 22 Nov | The rounds on #714 took PRs as far as #930. Since 20 Nov the maintainer's words for what lands are: "The items that can land without a signature-format change or a block-connection change are on `release-0.34.17`" (#714, 20 Nov; the same on 21 Nov). What stayed off, with the reason given: PRs #896 and #898 change who qualifies (ModelNet evaluator admission); issue #909 stays open because covering the fields it names "is a signature-format choice"; keeping `btxd` up when SwapNet fails to start stays off, "A failed start still stops `btxd`" (all #714, 20 Nov). #911 stayed off "as opened" on 20 Nov and was taken on 21 Nov after it changed [read] | #714, 20 to 22 Nov | 2026-11-23 |
| How this hub applies it | Changes to the rules in `src/validation.cpp`, `src/pow.cpp`, `src/consensus/`, `src/script/interpreter.cpp`, fork choice and download scheduling in `src/net_processing.cpp`, the attestation rules in `src/node/matmul_trusted_attestations.*`, and `src/matmul/` go to #464 as evidence items, not as pull requests into a release branch (`release-0.34.17` since 15 Nov). The attestation entry is this hub's own conservative reading [inferred]. A fix near these files that changes none of those rules can land: the PQ attestation lock order (#478, `c6a9bef1`) and the attestation blocklist extension (#583) did; both are in v0.34.16 [read: #464, 11 Nov; `git log` on the release line; tested: `git merge-base --is-ancestor c6a9bef1 v0.34.16`, the same for `4c7840e9`] | `06-pr-gate.md` §2; `07-lanes.md` (E-CONSENSUS) | 2026-11-17 |
| The five invited items | #464 named #309, #313, #333, #363 and #382 as non-consensus and said a new standalone PR is the way to bring each in. All five landed on 12 Nov, cherry-picked by the maintainer within hours of being opened: #579 (`d4012aea`), #583 (`4c7840e9`, an attestation blocklist extension), #580 (`f213e4d1`), #581 (`1c4da270`), #582 (`27c07c18`) [tested] | `git log -1 --format=%B <commit>` names each PR head as the cherry-pick source; compare with `git ls-remote https://github.com/btxchain/btx.git 'refs/pull/579/head' 'refs/pull/58[0-3]/head'` | 2026-11-12 |
| #464 now | Open [read: #464]. With the five non-consensus items landed, what is left on its list is the set the maintainer kept out of the release line [inferred]. On 15 Nov the maintainer answered there: "This list was taken against an older `release-0.34.16` and `btx-035/swarm`. `main` is now `074dac16`, and the 0.34.17 work is #714. The closed set from 2026-11-03 is not being replayed into this branch." [read]. Where evidence items go for 0.34.17 is not settled in this hub [inferred] | #464, 15 Nov | 2026-11-17 |

## 3. Coverage

> **Coverage is measured again.** The coverage build (`-DCMAKE_BUILD_TYPE=Coverage`) configures again since #578 landed on the release line on 12 Nov (commit `7051507b`). The fix shipped in v0.34.16 and is not in v0.34.15 (`476f3f23`). Measured on `swapnet-v2` at `a5d1637f` on 14 Nov, which contains the fix and is part of v0.34.16: product-code lines **67.4%** unit-only and **72.3%** unit + functional; branches **38.9%** and **42.6%**. In the coverage run 42 unit suites timed out and 14 of 220 functional scripts failed, and a test that is killed writes no data. The time budgets were shorter than in the 12 Nov run at `c6f9678d` (unit 2.5 h instead of 3 h, functional 100 min instead of 3 h), so the figures are floors and the comparison with that run is indicative. Reproduce it with the recipe in [`04-build-and-test.md` §5](04-build-and-test.md#5-coverage-gcc-linux).

| Fact | Value | Source | Verified on |
|---|---|---|---|
| Weekly unit coverage feed | The status page's operator publishes `https://network.btx-monitoring.com/api/v1/coverage.json` (job `CI-9-unit-weekly`, `schema_version` 1). On 23 Nov it showed `release-0.34.17` at `7d65025b`, measured 22 Nov, unit tests only, every figure a floor: product-code lines 47.8% in all, 71.2% without the 370 `matmul_v4_rc_stage3*` files, whose 191 suites it does not run [read]. Its suite set differs from the runs below (unit + functional at `a5d1637f`), so the two are not compared one to one [inferred] | the feed (`commit`, `suite_set`, `method`) | 2026-11-23 |
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
| Upstream hosted CI | None for node validation, by policy: the repository "does not use GitHub-hosted CI for validation". The only workflow files on `release-0.34.17` (read at `d9a94804`), and on `main` since v0.34.16, are three Atlas workflows: `atlas-native.yml` and `atlas-source.yml` run on pull requests that touch the Atlas tree, and `release-atlas-binaries.yml` runs only by hand (`workflow_dispatch`). v0.34.15 has only the README there [read] | `.github/workflows/README.md`; `git ls-tree --name-only v0.34.16 .github/workflows/`, the same on `release-0.34.17` and on `v0.34.15` | 2026-11-23 |
| Contributor gates | Run on contributor forks; every class PR links its fork run (fails before, passes after). The fork workflow ran on 12 Nov at `4c7840e9` and on 13 Nov at `88c9b49c`, red both times. Separately, the status page's operator publishes the results of nightly build and test runs on Linux, one per branch: `release-0.34.16` and `release-0.34.17` (its API calls the job CI-0; it is not the fork build matrix) [read, 18 Nov]. On 23 Nov its newest runs were from 21 Nov, at `074dac16` and `2c4da891`, both marked `stale` by the feed [read] | `plan/MASTER-PLAN.md` §4.1; `07-lanes.md` (I-CI); fork run list (GitHub API); `https://network.btx-monitoring.com/api/v1/ci.json` | 2026-11-23 |
| Agent rules upstream | `AGENTS.md` and `HUMANS.md` sit at the repo root. `AGENTS.md`: default posture is read-only unless the operator asked or a finite `AgentMandate` covers the action [read: lines 11-12] | `git show d9a94804:AGENTS.md` | 2026-11-23 |

## 7. Operators and community infrastructure

| Fact | Value | Source | Verified on |
|---|---|---|---|
| Operator safe profile (G1) | Run `-modelnet=0`, `-natpmp=0` and `-swapnet=0` on any node that holds a wallet or a signer key. SwapNet is off by default in v0.34.16 and on from 0.34.17, where a failed SwapNet start stops `btxd` [read: `-swapnet` default 0 at `src/swapnet/node.cpp:96` on `074dac16` (v0.34.16); on `release-0.34.17` @ `d9a94804`, default 1 at `src/swapnet/node.cpp:179` and `:190`, and the failed-start stop at `src/init.cpp:4650-4652`]. Review `-autoupdate` and decide whether to keep it: it is on by default on mainnet (next row) [read] | `plan/MASTER-PLAN.md` §4.4 | 2026-11-23 |
| Defaults behind it | On `main` and on the release line: `-modelnet` defaults to 1 when built with ModelNet; `-natpmp` defaults to 1; `-autoupdate` defaults to 1 on mainnet. On the release line the `-autoupdate` help text adds: 0 when `-proxy` is set or `-onlynet` excludes IPv4 and IPv6 [read] | `src/init.cpp` (`-modelnet`, `-natpmp`, `-autoupdate` help texts) and `src/mapport.h` (`DEFAULT_NATPMP`) at `476f3f23` and `4c7840e9`; the same at `d9a94804` (`src/init.cpp:653`, `:792`, `:901`; `src/mapport.h:10`) | 2026-11-23 |
| FastStart installer | Up to `d9a94804`, `contrib/faststart/btx-agent-setup.py` refused every link entry in an archive, and the packager hard-links `libexec/btx-guardd` to its `.real` file (`scripts/release/package_release_archive.py:829-832`). So the one-shot installer stopped with "unsupported link entry" on the published archives that carry that link: the v0.34.16 Linux CPU archive and both v0.34.17 Linux archives [read: #932]. The fix from #932 is on the release line as `b0edfbf4` (23 Nov): a hard link is accepted only when it names a regular file earlier in the archive, and symlinks and other links are still refused. A follow-up, `932a0238`, checks the required launchers before it replaces an install [read]. On 23 Nov the installer at `932a0238` extracted all four published Linux archives (v0.34.16 and v0.34.17, CPU and CUDA 13), and its unit test passed [tested: Linux x86_64]. The manual install steps are in `doc/btx-download-and-go.md` [read: `contrib/faststart/README.md:3-6`] | #932; `git show 932a0238:contrib/faststart/btx-agent-setup.py` | 2026-11-23 |
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
git rev-parse --short=8 'v0.34.17^{commit}'                   # the prerelease tag
git rev-list --count v0.34.17..origin/release-0.34.17         # commits on the branch after the tag
git merge-base --is-ancestor 7051507b v0.34.16 && echo "coverage fix: in v0.34.16"
git merge-base --is-ancestor 7051507b v0.34.15 || echo "coverage fix: not in v0.34.15"
git grep -h -E '^FUZZ_TARGET\(' 4c7840e9 -- src | wc -l      # the section 5 count, at 4c7840e9
```

If any line prints something other than the tables above, the page is stale. Stop citing the old value: open a pull request that updates the row, its "Verified on" date and the "Last verified" line at the top.

Refresh the head rows with `tools/refresh-state.sh`; the coverage and baseline rows change only when a measured run is published and `plan/plan-data.json` is updated with its `measured_at`.
