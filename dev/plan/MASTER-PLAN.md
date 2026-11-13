# Ending the drip-feed: one PR per bug class (public version, 12 Nov 2026; roles instead of handles; measured at `c6f9678d`, head `4c7840e9`)
> Last verified: 2026-11-12 · against: btxchain/btx release-0.34.16 @ 4c7840e9 · owner role: plan editor

A plan by BTX contributors for sending pull requests the maintainer can merge. It covers how contributors stop filing one fix at a time, which classes to sweep, which gates keep them closed, and which items go to #464 as evidence instead of PRs. The maintainer decides what lands. The lanes that carry the work are in [`../07-lanes.md`](../07-lanes.md); the numbers behind this page are in [`plan-data.json`](plan-data.json) and the lanes in [`lanes.json`](lanes.json).

**State.** Every measurement below was taken on `release-0.34.16` at `c6f9678d`. The live head is `4c7840e9`, 31 commits later. None of those commits touches `validation.cpp`, `net_processing.cpp`, `pow.cpp`, `src/consensus/` or `script/interpreter.cpp` (`git diff --stat c6f9678d 4c7840e9 -- src/validation.cpp src/net_processing.cpp src/pow.cpp src/consensus src/script/interpreter.cpp` prints nothing), so the consensus and `net_processing` figures still hold. Where the ModelNet, K01, K10 and fuzz numbers moved, the new value is given (§1.6). `main` is v0.34.15 (`476f3f23`); the release line is 1,194 commits ahead of it (`git rev-list --count 476f3f23..4c7840e9`).

**Labels.** [read] = taken from a source; [tested] = a script or command was run; [inferred] = judgement. Sources are the team's lane reports (working files; the numbers they gave are in [`plan-data.json`](plan-data.json), each with its source):
- A: bug-class taxonomy of every fix PR since 1 Aug.
- B: risk map, LOC × churn × (1 − coverage).
- C1: CodeQL + cppcheck.
- C2: clang-tidy, TSan, DEBUG_LOCKORDER, `-Wthread-safety`.
- C3: unit + functional coverage.
- S1/S2: attack surface and the history of past fixes.
- E2: post-quantum and AI-layer assurance review.
- E3: external lessons checklist.
- git: the tree at `4c7840e9`.

## §0 Why the drip happens, and the idea that ends it

1. **Granularity, not refusal.** Since 1 Aug there have been 360 PRs, 317 of them fixes; 287 PRs were opened since 25 Oct. The median fix is 103 changed lines [A]. 262 of the 317 had landed at `c6f9678d` (83%). After the 12 Nov batch, 283 have landed (89%) [git]. That batch alone was 28 PRs plus 3 follow-up commits: 7 ModelNet store-logic fixes, 5 short-write fixes and 2 single caps, each scoped to one site.
2. **Same class, new place.**
   - Windows portability: 33 PRs over 44 files, 20 of them at a new site.
   - Non-atomic state writes: 22 PRs in about 10 modules in 14 days, and the class was still landing single-site fixes on 12 Nov (5 that day, §1.4).
   - Passphrase ordering: #456 → #475 → #488 → #523 in 4 days [A].

   One scripted sweep per class would have replaced 20-30 PRs each.
3. **Same file, repeated.**
   - Download scheduling (K14): 19 PRs + 145 maintainer commits. 16 of the 17 later PRs re-touch a file an earlier PR of the class had changed, mostly `net_processing.cpp`.
   - Attestation state (K13): 15 PRs, 11 not taken, 4 re-filed under the same title [A].

   These need a model-based test or a design change, not another PR.
4. **No upstream gate, by choice.** `.github/workflows/README.md` says the repository "does not use GitHub-hosted CI for validation" and that workflow files are "intentionally absent" [read]. About 93 of the 317 fix PRs belong to classes a CI matrix catches before filing (Windows 33, test registration 26, packaging 14, RPC conversion 14, macOS 6) [A]. So the CI runs on a contributor fork and reports into each PR. Hosted CI upstream is not requested.
5. **Coverage is measured again.** The coverage build configures again on `release-0.34.16` since #578 (merged into the release line on 12 Nov as `7051507b`); the fix is not in v0.34.15 (`main`, `476f3f23`). Measured at `c6f9678d` with the same fix: product-code line coverage is 65.8% with unit tests and 69.9% with unit + functional tests; branch coverage is 37.7% / 40.7% [C3]. All are floors: 47 unit suites timed out, and 82 of 208 functional scripts failed in the coverage run. The recipe to reproduce is in [`../04-build-and-test.md`](../04-build-and-test.md) §5. Functions never executed by the unit + functional runs: 102 in `net_processing.cpp`, 68 in consensus code, 927 in the wallet [C3].
6. **One static and dynamic baseline exists** [C1, C2; untriaged].
   - CodeQL: 260 product-code results outside the maintainability and documentation rules, 150 of them security-tagged. 133 of those 150 are one class (file-system and environment trust), 75 of them in the ModelNet helper and stores.
   - cppcheck: 26 errors.
   - TSan: 41 data-race site pairs.
   - `-Wthread-safety`: 266 warnings.
   - DEBUG_LOCKORDER: 1 lock-order inversion.
   - The repo's own clang-tidy config: 1,033 warnings.
7. **Risk is concentrated.** 10 files hold 91.6% of LOC × churn × (1 − coverage). `net_processing.cpp` has 25,300 lines and 113 fix commits; its line coverage is 24.6% unit-only and 62.3% with functional tests [B, C3].
8. **The maintainer's rule is known and fast.** The maintainer (numair) on #464, 11 Nov: "The validation, fork-choice, and MatMul-frontier entries in this list stay out of `release-0.34.16`". The same comment invited standalone PRs for #309, #313, #333, #363 and #382. All five landed on 12 Nov as #579, #583, #580, #581 and #582, within hours [git]. #464's open list is now consensus only.
9. **Core idea: file classes, not instances.** One PR per recurring class: the fix at every site a machine rule finds, plus the rule (unit test, lint, CI job) that keeps the class at zero.
10. **Gates on the fork.** Fork CI runs every class rule. Each PR links its run: fails before, passes after.
11. **Deep reviews by invariant**, only where tools cannot see (§3). Consensus items go to #464 as a measured result plus a ready test, never as a PR into 0.34.16.
12. **Coordination.** One board, lane owners, a bug-class registry and a weekly batch. Target: under 10 class PRs per week, each closing a class, plus an evidence note when one is complete.

## §1 The measured baseline (`c6f9678d`) and what moved

### 1.1 Coverage [C3, tested]
Build: gcc 13.3 `-Og --coverage`, gcovr 8.8, with the #578 fix applied (it is on `release-0.34.16` only). To reproduce the run, follow [`../04-build-and-test.md`](../04-build-and-test.md) §5.

Unit tests: all 2,625 ctest entries ran. 2,575 passed, 47 timed out at 3,600 s, 2 failed and 1 was skipped.

Functional tests: the 208 entries of the test_runner default list ran. 124 passed, 2 were skipped and 82 failed.

| Product code (5,519 files, 623,410 lines) | Unit | Unit + functional |
|---|---:|---:|
| Lines | 65.8% | 69.9% |
| Branches | 37.7% | 40.7% |
| Functions | 76.3% | 80.4% |

- **Per area, lines (unit → unit + functional):**

  | Area | Unit | + functional |
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

- **ExactReplay stall class.** 48 of the functional failures stall with "ExactReplay required" on the slow coverage build. 41 of those pass when every node runs `-matmulvalidation=economic`, a non-default setting. That rerun is a diagnostic only and is not part of the figures above. A functional gate has to settle this class first.
- **`peerman_tests` timed out** and wrote no data, so the unit-only figure for `net_processing.cpp` understates its unit tests.
- **Functions never executed:** consensus 68, `net_processing.cpp` 102, wallet 927, rpc 103, matmul verification 507. 363 of the 507 sit in files whose own suite timed out.

### 1.2 Static [C1, tested; every result is a lead until read]
- **Totals.**
  - CodeQL 2.27.4 over all 5,963 compilations: 2,193 unique results; 1,482 in product code; 260 outside maintainability and documentation rules; 150 security-tagged.
  - cppcheck 2.13: 645 unique results; 372 in product code (26 error, 174 warning).
- **Class 1, file-system and environment trust (133 results).** `path-injection` 81, `world-writable-file-creation` 37, `uncontrolled-process-operation` 7, `user-controlled-bypass` 7, `system-data-exposure` 1. Most of them sit in ModelNet helper and store code (§0.6); the rest are spread over node, RPC and init code [C1, recounted]. They are untriaged leads.
- **Class 2, arithmetic width and constant conditions.** `comparison-with-wider-type` 12, `constant-comparison` 60 (34 of them in matmul), `containerOutOfBounds` 18. Mostly matmul stage3, so these wait for 0.35.
- **Class 3, lifetime and initialisation.** `uninitMemberVar` 91 (45 of them one pattern inherited from Bitcoin Core), `stack-address-escape` 22, `throwInNoexcept` 7.
- **Single results outside matmul.** Five: one dangling temporary, one iterator used across two containers, two mismatched-iterator results and one unchecked lookup result. They are leads, being triaged.
- **Gate traps.** cppcheck without `-D__GNUC__` "passes" with 45 results. Without `--library=boost`, 2,309 test TUs abort.
- **CodeQL size.** The C++ database took 60 min to build on a 40-core box. It reached 5.2 GB, and 70+ GB with evaluation caches, which is more than the 14 GB disk of a hosted runner can hold.

### 1.3 Dynamic [C2, tested]
- **TSan.** 247 reports, 41 site pairs, 8 classes.
  - Five classes are in product code, in ModelNet, node and MatMul code. They are leads, being triaged.
  - Three classes are test-side.
- **DEBUG_LOCKORDER.** There is one lock-order inversion, between two wallet code paths. Both take the wallet lock first, so there is no deadlock today [inferred].
- **`-Wthread-safety`.** 266 warnings: net_processing 84, tests 78, validation 42, node 24, wallet 15.
- **clang-tidy.** The repo config yields 1,033 warnings. The 215-warning high-signal subset includes:
  - analyzer NullDereference 11
  - analyzer DivideZero 5
  - use-after-move 4 (leads, being triaged)
- **Tests under TSan.** 2,409 of 2,435 unit tests pass. 139 of 200 functional tests pass; 51 of the 55 failures also fail on a plain gcc build (not yet triaged).

### 1.4 Bug classes [A] and the 12 Nov batch [git]
A sorts the 317 fix PRs into 26 named classes, plus "other" and one out-of-scope group (not analysed). The 15 largest:

| # | Class | PRs (+maintainer commits) | Landed / not taken at c6f9678d | Recurrence | Landed 12 Nov |
|---|---|---:|---|---|---|
| K06 | Windows / MinGW / MSVC portability | 33 (+2) | 32/0 | 20 new-site, 44 files | #582 |
| K20 | ModelNet store logic slip | 33 (+1) | 26/0 | 18 of 32 same-file | #550 #554 #556 #557 #558 #566 #568 |
| K19 | stale test / registration gap | 26 (+8) | 24/0 | tests only | #573, #580 |
| K01 | non-atomic or short state-file write | 22 (+0) | 18/0 | 10 new-site in 14 days | #565 #570 #572 #576 #577 |
| K14 | block download scheduling (catch-up, holes, tip-child) | 19 (+145) | 12/6 | 16 of 17 re-touch a file | - |
| K09 | unvalidated or unbounded input from peers and model peers | 18 (+13) | 15/0 | 8 new-site | #551 #569 |
| K13 | MatMul attestation / frontier state | 15 (+46) | 3/11 | 11 of 12 same-file | #583 (blocklist, not frontier) |
| K22 | build / packaging / release-gate drift | 14 (+13) | 13/0 | 6 new-site | #575, #578 |
| K10 | CLI/RPC conversion drift | 14 (+1) | 13/0 | 7 of 12 same-file | #574 |
| K17 | option or mode not honoured | 10 (+1) | 8/1 | 6 same-file | #552 |
| K05 | wallet-locked / passphrase ordering | 10 (+0) | 9/0 | chain of 4 in 4 days | #571 |
| K21 | BCP/1 deposit-pool logic | 10 (+0) | 10/0 | 7 of 9 same-file | - |
| K03 | lock order / self-deadlock / race | 9 (+17) | 6/2 | 5 new-site | #579 |
| K02 | state not persisted across restart | 9 (+6) | 3/5 | MatMul half not taken | #553 |
| K08 | path / symlink / jail | 8 (+0) | 8/0 | 3 new-site | - |

### 1.5 Risk map [B] and fuzz [S1]
- **Risk share by area.** net/p2p 61.9%, validation/chain/mempool 15.4%, modelnet 12.7%, wallet 2.7%, rpc 2.2%.
- **Top files.**
  - `net_processing.cpp`
  - `validation.cpp` (63 fix commits)
  - `modelnet/helper.cpp`
  - `wallet/shielded_rpc.cpp`: 16,911 lines, 15.8% unit / 24.3% with functional, no test file
  - `rpc/blockchain.cpp`
  - `node/matmul_trusted_attestations.h` (50 fix commits)
- **No test file.** 52 of the top 200 files have no unit-test file.
- **`modelnet/security_v2/`** (26 C++ source files). 0.2% of its executable lines run under unit tests and 15.0% with functional tests. Six `.cpp` files stay at 0% even with functional tests: `artifacts`, `main`, `peer`, `sandbox`, `trust` and `work` [B, C3, tested].
- **Fuzz.** The source at `4c7840e9` defines 271 fuzz targets: 238 `FUZZ_TARGET` plus 33 `FUZZ_TARGET_DESERIALIZE` (`git grep -h -E '^FUZZ_TARGET(_DESERIALIZE)?\(' 4c7840e9 -- src | wc -l`; 270 at `c6f9678d`). An earlier text count of 239 counted `FUZZ_TARGET(` lines, one of them inside a macro, and missed the deserialize targets. A built fuzz binary lists fewer when ModelNet or wallet is off ([`../01-state.md`](../01-state.md)). #580 added the rcadmit admission store target. There is still no target for:
  - DLTX, block chunks, mmsketch, mdpeers, mmatrefute
  - the ML-KEM hybrid handshake
  - the helper dispatcher
  - GGUF/safetensors/package import
  - the update manifest, guard frames, wallet bundles
  - any BTX RPC

  The modelnet fuzz build does not link by default, and 7 targets have never run.

### 1.6 The 31 commits since the measurement [git, tested]

| Plan item | PRs / commits | Effect |
|---|---|---|
| coverage job (§4) | #578 | coverage build configures again: closed |
| #464 non-consensus items | #579 #580 #581 #582 #583 | all five on the release line; #464 is consensus-only now |
| K01 (§2 row 2) | #565 #570 #572 #576 #577 + 1 follow-up | #576 adds a shared `WriteBinaryFileAtomically` (temp file, checked write and close, `RenameOver`; no fsync). Worklist 14 → 12 files |
| K10 (§2 row 8) | #574; #571 (counted under K05 in §1.4) | Atlas templates now checked against RPC signatures by `feature_atlas_operation_templates.py` |
| K19/K22 (§2 row 11) | #573, #575 | 4 exec bits fixed by hand (lint still missing); 7th fix on `package_release_archive.py` |
| K09, K20, K02 (§2 rows 1, 14) | #550-#558, #566, #568, #569 | 12 of the 31 commits touch `helper.cpp`, one fix each |
| K03 (§2 row 3) | #579 + 1 follow-up | 2 sites |
| K25 | #567 | the class is 5 of 5 landed |
| fuzz (§1.5) | #580 | rcadmit store target exists; a 1 h ASan run is still to do |

## §2 Class sweeps: one PR per class, ranked by risk

Each row gives the machine rule, the sites open at `4c7840e9` where counted, the lane owner and the one-PR scope: every site fixed, plus the rule that keeps the class at zero. Before any post the lane owner asks "would the maintainer reject this?": no stubs, no fail-closed workarounds, tested only.

Three rules hold for every row:
- (a) A "not counted" row is counted on the live head first. A class with fewer than 3 real sites is filed as the rule alone (a test or a lint).
- (b) A sweep PR changes nothing beyond its class. Anything else it finds goes to the lane's worklist or its own PR.
- (c) No sweep touches `validation.cpp`, `pow.cpp`, `src/consensus/`, `script/interpreter.cpp`, fork choice or `src/matmul/`. Hits there go to the #464 evidence list or the 0.35 queue.

Owner column: the lane in [`../07-lanes.md`](../07-lanes.md) whose owner does the work; every owner slot there is claimable. "The maintainer" is the maintainer of `btxchain/btx`, who decides what lands.

| Rank | Class | Machine rule | Open at 4c7840e9 | Owner | One-PR scope |
|---|---|---|---|---|---|
| 1 | K09 unbounded input | semgrep: `emplace\|push_back\|insert` inside `Handle*\|Process*\|OnMessage\|Route*` with no `.size() >=\|MAX_\|Evict` in the same function; CodeQL container-from-`recv` query | not counted: no container inventory exists yet; 5 message types without a fuzz target | A-HELPER owner (helper, modelnet), A-NET owner (P2P non-consensus), C-STATIC owner (the inventory query); the maintainer decides `net_processing` scheduling | `doc/resource-bounds.md` (container → bound → eviction test); one cap and one unit test per container; fuzz targets for DLTX, chunks, mmsketch, mdpeers and the helper dispatcher |
| 2 | K01 non-atomic state writes | `std::ofstream\|fopen(…"w` in modelnet/wallet/node/rpc/init with no atomic primitive in the file; a loader must not read a damaged file as empty | **12 files** [tested]: `package_channel`, `import_coordinator`, `workspace_git`, `swarm_evolution`, `obs01`, `acc04` (modelnet), `wallet/wallet.cpp`, `wallet/dump.cpp`, `wallet/rpc/labels.cpp`, `node/blockstorage.cpp`, `node/attested_utxo_snapshot.cpp`, `init.cpp`; plus one direct write left in `realm_channel.cpp`, and one candidate the file-level filter skips because the file also has an fsync (`modelnet/capability_bytes.cpp:515`, a raw `.gen` sidecar write; the lane pack counts 13) | C-K01 owner; its second pass writes the lint | every site on `WriteBinaryFileAtomically`, with file and directory fsync added to the helper; a lint against raw `ofstream` to datadir paths; truncated-file load tests |
| 3 | K03 + TSan + thread-safety | TSan product classes; `-Wthread-safety`; DEBUG_LOCKORDER | 41 site pairs (5 product classes), 266 warnings, 1 inversion | C-STATIC owner for modelnet/node/wallet; E-CONSENSUS owner, as evidence for the maintainer, for the `net_processing` and `validation` warnings | `EXCLUSIVE_LOCKS_REQUIRED` on the attestation store, helper stores and wallet paths; `-Werror=thread-safety` on clean files; a TSan + DEBUG_LOCKORDER nightly |
| 4 | fs/env trust (C1 class 1) | CodeQL `path-injection`, `world-writable-file-creation`, `uncontrolled-process-operation`, `user-controlled-bypass` | ≈133 | C-STATIC owner | one policy (0600 for secrets and sockets, an audited env-var allowlist, a provenance check at each sink); the query stays in CI with a shrinking baseline |
| 5 | K05 passphrase ordering | per wallet RPC, the first funding call is dominated by `EnsureWalletIsUnlocked`; lock erases PQ seeds and cached secrets | 4 files under `src/wallet/rpc` call funding primitives; dominance check not yet run | A-WALLET owner | a unit test of every wallet RPC against a locked wallet; a memory check after lock |
| 6 | K08 path / symlink / jail | every `pivot_root\|chroot\|unshare\|mount(` failure is fatal; every open of a user-chosen path uses `O_NOFOLLOW\|lstat\|symlink_status\|weakly_canonical` | 44 files reference symlink APIs | C-PATHS owner | one `SafePath` helper; tests with a symlinked ancestor and leaf; `BTX_TEST_REQUIRE_LINUX_JAIL=1` in CI |
| 7 | K06 Windows portability | POSIX headers and calls outside `#ifndef WIN32`/`compat/mingw`; `long` in offset code | the real rule is the Windows CI jobs | C-PORT owner | the fork CI Windows jobs + the grep as a lint |
| 8 | K10 RPC conversion drift | unit test over the `RPCHelpMan` table: every non-STR argument has a `vRPCConvertParams` row, including 4-field `also_string` rows | **1 candidate of 743** (may be deliberate; the K10 test names it); the Atlas half was closed by #574 | C-STATIC owner | **rule only**: the unit test, plus the one row if confirmed |
| 9 | K04 + K15 + lifetime singletons | UniValue self-member-assignment regex; `static_cast<uint32_t>(…getInt\|get_int\|vout` | K04: 0 real (the one hit returns `*this`). K15: 28 casts in 11 files in scope; 1 in sighash code and 4 in matmul excluded by rule (c) | C-STATIC owner | the UniValue lint (rule only); `ParseUint32Index` at the 28 casts; the 5 single results outside matmul (§1.2) |
| 10 | K16 + K17 helper lifecycle and options | every `fork\|socket\|pipe\|accept` closed on all paths; every `kill(pid` with an identity check; every listener or dial outside `net.cpp` honours `-listen/-proxy/-onlynet` | not counted | C-PORT owner (K16), C-PATHS owner (K17) | RAII wrappers + pidfd check; a functional matrix of {`-listen=0`, `-proxy`, `-onlynet`, `-v2pqonly`} × every listening surface |
| 11 | K19 + K22 registration, fuzz smoke, packaging | suite list vs ctest; every `FUZZ_TARGET` run 10 s; exec bits vs shebang; release-archive checks | 7 fuzz targets never ran; the modelnet fuzz build does not link | C-STATIC owner (K19 lints), I-CI owner (fuzz smoke, release-gate job), C-PORT owner (K22) | lint scripts + the `native.cmake` gate + a release-gate job |
| 12 | K11 + K12 wallet auth and reservation | restricted-user check first for every RPC with a path, file, secret or destination argument; selected coins reserved under one `cs_wallet` hold with RAII release | not counted | A-WALLET owner | an allowlist test per restricted-user RPC; an `UnlockSelected` RAII type + a two-sender test |
| 13 | lifetime/init (C1 class 3) | cppcheck `uninitMemberVar`, `throwInNoexcept`; CodeQL `stack-address-escape` | 120 | C-STATIC owner | initialise or document; `ci/cppcheck.sh` with C1's flags |
| 14 | K20 / K21 / K02 store, deposit, persistence logic | not greppable: property tests per store (idempotency, pagination, monotonic counters, restart = no restart); a table-driven BCP/1 lifecycle test; `mutate → reopen → compare` per store | 8 more single fixes landed on 12 Nov | A-STORES owner | the test generators, not instance fixes; propose the `helper.cpp` split with the tests in hand |
| 15 | K07 macOS packaging | `rdstate()\|eof()` deciding error vs EOF; `otool -L` on every packaged binary | not counted | C-PORT owner | the `otool` check in the release gate; the macOS CI jobs |
| 16 | K25 privacy leak | every wallet broadcast goes through the Dandelion stem or its fallback; no RPC, route or log line returns peer-attributable funding data | 5 of 5 PRs landed | A-WALLET owner; A-NET owner for the observing-peer test | one functional test with an observing peer |
| 17 | K27 secret exposure | `argv\|LogPrintf\|strprintf` near `seed\|passphrase\|secret\|mnemonic\|viewing`; secret-bearing results `SecureString`-typed | not counted | A-WALLET owner | a log-scan assertion in the functional runner; a `SecureString` audit test |

Not sweeps:
- K13 and K14: deep reviews in §3.
- K18 wording: review only.
- K23: docs.
- K28: the `[[nodiscard]]` invariant in §3.1.

## §3 Deep reviews that tools cannot do

The method with the best yield since August [S2]: a named invariant, one reader, one small test, and a skeptic who assumes the claim is wrong. Each review produces a list of (invariant, verdict, test). "Evidence" means the item goes to #464 as a measured result plus a ready test, never as a PR into 0.34.16. E3 check IDs are in brackets.

1. **Consensus and validation (evidence).**
   - Invariants:
     - block validity is byte-identical between `main` and the release line
     - supply = 20 BTX × height − burns, to the satoshi, below the first halving at 525,000 (`nSubsidyHalvingInterval` in `src/kernel/chainparams.cpp`) [C2]
     - the shielded turnstile is never negative in ConnectBlock [Z1]
     - nullifiers are unique within a block and across the chain [Z3]
     - every rule enforced in mempool, RPC or template code is also enforced in ConnectBlock [C1, P3]
     - every `[[nodiscard]]` validation result is consumed (gcc's unused-result warning is the check)
     - the 68 never-executed consensus functions are dead code or get a test
     - every hard-coded checkpoint names an on-chain block [S3]
   - Decisive tests:
     - genesis sync with `assumevalid=0` past 126,979, checked against every compiled UTXO pin
     - a rule × entry-point matrix run through `submitblock` and P2P
     - functional tests for every reorg-park path; a pruned node is never asked to reorg below its prune height [C6]
     - an adversarial-timestamp simulation against the retarget function [C5]
2. **Input bounds for peers and model peers (mixed).**
   - Invariants:
     - every structure fed by a peer or model peer has a stated bound, an eviction rule and a test [EL-1]
     - work is charged to the sender, never to an honest relayer
     - announcing a block and then withholding it cannot hold a node [EL-3]
     - Bitcoin Core security point releases since the fork base are tracked, and each is recorded as applied or not applicable
   - Decisive tests:
     - the #380 scenario as a throttled multi-peer test from 3 netgroups
     - K14 as a deterministic simulation of the download state machine with an adversarial scheduler, asserting "every announced body is requested within N ticks"
   - Split: helper and modelnet bounds are PRs; `net_processing` scheduling is evidence.
3. **Wallet secrets and backups (PR).**
   - Invariants:
     - one owner type for seed material (`secure_allocator`, wiped on lock and destruction)
     - bundle backups of encrypted wallets carry no plaintext seed material
     - no secret in argv, logs, help output or the Atlas JSON editor
     - the locked-wallet user path (fund, bump, lookahead) still works
     - migration never deletes or overwrites a wallet file [W1]
     - wallets from every released version load [W2]
     - a backup restores and spends on a fresh node [W3]
   - Decisive tests: a restore-without-passphrase probe fails; a memory scan after `walletlock`; the K05 ordering test.
4. **PQ crypto use (PR, outside oracle).**
   - Invariants:
     - the linked Dilithium is the reference build only. Checked at `4c7840e9`: `libbitcoinpqc` compiles `dilithium/ref` only, and its verify checks the z-norm bound [Q1, tested].
     - portable, Rust (Atlas) and an independent library agree on accept/reject for every input [Q2]
     - sigop accounting counts PQ signatures
     - ACVP and Wycheproof vectors run in ctest [Q5]
     - constant-time code is never built at `-Os`/`-O1` [Q4]
     - no `pqc_kyber` or `pqcrypto-dilithium` in the Atlas Rust tree [Q6, tested: none]
   - Decisive tests: a libFuzzer differential target (BTX verify vs an independent ML-DSA-44/SLH-DSA library); nightly cross-implementation checksums.
5. **Shielded pool (PR for integration; external review for the proofs).**
   - Invariants:
     - the pool total is never negative
     - the anchor window survives a disconnect (#317/#461: evidence)
     - verify time is bounded per block and per peer [Z4]
     - note reservation holds (K12)
   - Decisive tests: verification fuzz targets with cost limits; a disconnect-reconnect functional test; the lock-order inversion fixed on the wallet side.
6. **MatMul verification and attestation (evidence for rules; PR for tests).**
   - Invariants:
     - CPU, CUDA and Metal replay agree on one mutated-block corpus [M1]; Metal has never been run
     - a node that cannot verify refuses to follow [M3]
     - a forged RC body is refused or charged (#380)
     - attestation state after a restart, a reorg or a withdrawn vote equals in-memory state: the K13 model test over vote, withdraw, restart, reorg and missing index
     - a signer signs only what it validated itself [A1]
     - quorum arithmetic is tested exhaustively over (n, t, present) [A3]
     - mutated attestation data cannot poison hash-keyed caches [A2]
   - Decisive tests: the cross-device corpus; the model-based attestation test as one artefact instead of five PRs; the 47 timing-out suites in their own job.
7. **ModelNet helper surface (PR).**
   - Invariants:
     - no non-loopback listener on 29447 without `-modelbind`
     - no NAT-PMP mapping of the helper by default [EL-5]
     - under `-modelrpcsocket` the helper runs as a different user and cannot open `.cookie` or `wallets/` [H4]
     - each of the ~31 routes has a size cap and a fuzz target [H2]
     - a malformed reply fails the request, not the helper
     - no pickle or `torch.load` anywhere [H1]
     - the helper never gets RPCs that move funds or change config [H3]
   - Decisive tests: a `modelnet_native_dispatch` fuzz target that runs 1 h clean under ASan; the 7 never-run targets; a jail escape suite on a user-namespace CI host.
8. **Release and update integrity (maintainer for keys; PR for the path).**
   - Invariants:
     - one file name = one hash forever
     - the tag is the asset's commit
     - sums are signed with the existing ML-DSA key and verifiable with `btx-util verifyupdatesig` [B2]
     - the installer installs a tree that starts
     - manifests expire
     - `-proxy`/`-onlynet` are honoured on every branch
     - a 2027-stamped build exists well before 2028-11-06
     - outside builders reproduce the build [B1]
   - Decisive tests: `install_prebuilt_release_tree` on the real archive starts a node; two outside builders reproduce the sha256; a no-clearnet check under `-proxy`.
   - Atlas ships without the Tauri updater plugin today [tested: `Cargo.lock`], so the updater-downgrade class [T1] applies only if that plugin is added.

## §4 Gates that make it stick

### 4.1 Where CI runs
- **Upstream runs no hosted CI on purpose**, so the CI lives on a contributor fork, and every class PR links its fork run.
- **The fork workflow already exists** (`btx-035-ci.yml`), with jobs tools, linux-build, linux-userns, mingw-cross, mingw-tests, windows-smoke, windows-tests, macos-build and macos-arm64, plus native Windows lanes in a later variant. It has not yet run on `release-0.34.16`.
- **Before its first run** it is rebased onto `4c7840e9`, the upstream Atlas workflows are kept, and its description is updated. It already handles the user-namespace setting the jail tests need.
- **Runner limits** [read: GitHub docs, 12 Nov]:
  - Standard runners are free and unlimited for public repos.
  - `ubuntu-24.04` and `windows-latest`: 4 CPU, 16 GB RAM, 14 GB SSD.
  - `macos-15`: 3 cores, 7 GB RAM, 14 GB SSD.
  - Each job runs at most 6 h, each workflow run at most 35 days.
  - The free plan allows 20 concurrent jobs, 5 of them macOS.
  - Cache is limited to 10 GB per repo.
- **Measured on the fork** (3 Nov, an earlier branch, warm ccache):
  - linux-build: 9 min
  - linux-userns: 76 min
  - mingw-cross: 35 min
  - mingw-tests: failed after 100 min while building `test_btx.exe`
  - macos-arm64: ran out of time at 343 min inside `test_btx`
  - windows-tests: failed after 4 min

  The macOS test job therefore has to be sharded.
- **Box timings for scale** [C3]. Unit pass A took 40 min at `-j100` on 128 threads; the 63 slow suites took 2 h; the 208 functional scripts took 92 min at 42 jobs. The full suite cannot fit one 4-core job, so it is sharded.

### 4.2 Jobs
1. **`linux-unit-functional`.** Six ctest shards over the cost-ordered list and four functional shards, each with C3's thread shim (`BTX_HWC=2`, `OMP_NUM_THREADS=2`) and a 900 s per-test timeout.
   - The 63 slow suites run only in a nightly `stage3` job on a dedicated box. 47 of them did not finish in an hour each on 6 threads, which is at least 47 suite-hours.
   - `ci/known-failing.txt` is written from the first run: the 2 unit failures, the ExactReplay stall class, and the gcc-baseline failures that remain after triage. The list may only shrink.
2. **`linux-asan-ubsan`.** Unit and functional tests with the upstream `ci/test` sanitizer config.
3. **`tsan-lockorder` (nightly).** clang-20 TSan with C2's retry launcher, plus a DEBUG_LOCKORDER run. Baseline: 41 site pairs; it may only shrink.
4. **`lint`.** The K19 registration diff, the K04 UniValue lint, the K01/K08/K17 greps, the K10 conversion test, `-rpcdoccheck`, exec bits, YAML lint and a secret scan.
5. **`clang-tidy-diff`.** The repo's own `src/.clang-tidy` on changed lines only, plus `-Werror=thread-safety` on files that are clean.
6. **`cppcheck`.** C1's exact flags as `ci/cppcheck.sh`, product dirs only. Baseline: 372; it may only shrink.
7. **`fuzz-smoke`.** ClusterFuzzLite (libFuzzer + ASan): 10 min per PR, 2 h nightly, and the `native.cmake` gate so the modelnet targets link.
8. **`codeql`.** Weekly, on a dedicated box: the C++ database does not fit a hosted runner. The Rust and Python default setups run on hosted runners. Baseline: 260; it may only shrink.
9. **`coverage-ratchet`.** On a dedicated box: the coverage build tree was 27 GB, against 14 GB of runner disk.
   - Shards upload `.gcda` sets, and one merge job compares them with `ci/coverage-baseline.json` (69.9% lines, 40.7% branches, per-area rows).
   - The job fails if any area drops more than 0.2 points.
10. **`release-gate`.** `package_release_archive.py`, the GLIBC ceiling, RUNPATH, `elfcheck.py`, an SBOM present, sums signed.

Free external services: GitHub CodeQL (Rust and Python), ClusterFuzzLite, OSS-Fuzz once ClusterFuzzLite has been green for a month, Coverity Scan (needs a registered owner), and Dependabot/OSV-Scanner over the 498 Atlas packages and the bundled libraries via an SBOM. The fork owner creates any secret these need.

### 4.3 Definition of done per area
| Area | Done when |
|---|---|
| net/p2p | every container in the bounds table; ASan + TSan clean; fuzz targets for the 5 missing message types run 24 h clean; `net_processing.cpp` ≥ 75% lines with functional tests; 0 open K09/K14 instances outside the evidence list |
| validation/consensus | byte-diff proof per release; genesis-sync job green; 68 unexecuted functions tested or deleted; thread-safety annotations accepted by the maintainer |
| wallet | ≥ 70% lines; K05/K11/K12 rules in ctest; restore-without-passphrase probe fails; no plaintext seed material; TSan clean |
| rpc/cli | K10 test green; `-rpcdoccheck` in CI; ≥ 80% lines |
| modelnet helper | dispatcher fuzz 24 h clean; two-user layout tested; K01/K08/K16/K17/K20 rules in ctest; every `security_v2` file above 0%; `helper.cpp` split proposed with tests |
| matmul | 47 timeouts given a job and a number; cross-device corpus run; K13 model test exists; CodeQL class 2 triaged for 0.35 |
| shielded | verification fuzz targets; K12 rule; anchor-window test (evidence) |
| release/update | signed sums, tag = asset, two reproducers, installer test on the real archive, `elfcheck` green |

### 4.4 Security gates before any "final" release

This is the contributors' checklist. Rows owned by the community are lane work. Rows that name the maintainer are the maintainer's decisions; they are listed so that the evidence is ready when they are made, not as requests.

| Gate | Must be true | Owner | Status 12 Nov |
|---|---|---|---|
| G1 Operators safe now | guides carry the safe profile below; v0.34.15 operators are told which fixes they lack | community, operators | partly |
| G2 Machines on | fork CI covering Linux, Linux-userns, mingw, Windows, macOS, ASan/UBSan, DEBUG_LOCKORDER, registration diff, CodeQL, tidy baseline, ClusterFuzzLite, OSV/cargo-audit, release gate | community | workflow exists; not yet run on the release line |
| G3 Parsers covered | a target exists, links and has run ≥ 1 h clean under ASan for the dispatcher, DLTX, model-file import, ML-KEM hybrid, chunks/sketch/mdpeers/refute/beacons/guard frames, and rcadmit | community | 1 of about 13 exists (rcadmit) |
| G4 Classes swept | K10, K04, K15, K01, K05, K08/K16/K17, K06, K19, each with its rule | community | K04 0 sites, K10 at most 1, K01 12 files; rules not yet in |
| G5 Money separated from the AI layer | helper under its own user with confinement tests on a user-namespace host; wallet secret items landed with user-path tests | community; maintainer for defaults | open |
| G6 Peer input charged and bounded | the #380 scenario charges the forger; Dandelion stem limits; the bounds table complete; #478 and #313 on `main` | maintainer; community tests | #478 and #313 on the release line only |
| G7 What runs is what was reviewed | signed sums, tag = asset, two outside reproducers, per-platform assets, update path tested on a real archive, SBOM | maintainer; community | open |
| G8 Chain verifiable from genesis | a scheduled genesis sync on a stock binary passes; the #272 item carries its evidence on #464 (it stays out of `release-0.34.16`, #464, 11 Nov); signer set with headroom above its threshold | maintainer; operators | open |
| G9 Process | contributors keep a branch matrix per fix (which branch carries which fix) and the list of fixes a v0.34.15 node lacks (G1); `SECURITY.md` exists upstream and names a reporting channel, so reports have a route | community | open |

**Operator safe profile (G1).** Run `-modelnet=0` and `-natpmp=0` on any node that holds a wallet or signer key, and review `-autoupdate` before enabling it.

**Hardening outside the class sweeps:**
- the helper under its own OS user, loopback-bound unless `-modelbind`, inside the jail
- the dispatcher and model-file fuzz targets
- RC body charging (#380)
- signed, reproducible releases
- updater manifest expiry, two keys, and a real-archive install test
- Dandelion stem limits with a fuzz target
- wallet secret handling
- ML-KEM fuzzing, with #405/#406 backported to `main`
- #478 and #313 on `main`; the #272 item as evidence on #464
- jail confinement tests and removal of the chroot fallback (#322)

### 4.5 External lessons checked [E3]
Labels such as [EL-1] in this plan refer to items on E3's external-lessons list.
Verified at NVD on 12 Nov:
- CVE-2018-17144 (duplicate-input check dropped as "redundant")
- CVE-2019-7167 (Zcash counterfeiting, caught only by pool-total reasoning)
- CVE-2024-36405 (liboqs constant-time code broken by Clang at `-Os`/`-O1`)
- CVE-2026-95625 (Tauri updater manifest unsigned; fixed in updater v2.12.0 behind an opt-in setting)
- CVE-2026-103663 (model-server pull path traversal via layer digests)

Checked against BTX: the reference-only Dilithium build with the z-norm check (Q1); no affected PQ crates in Atlas (Q6); no Tauri updater plugin in Atlas (T1). Every other external citation in E3 is a lead, to be opened at its primary source before anyone quotes it. E3's practice list maps onto §3.1 (rule × entry-point matrix, supply invariant), §3.4 and §3.6 (differential verifiers, cross-device corpus), §4.2 (fuzzing and sanitizers), §3.3 (wallet round trips), §3.7 (helper hardening) and G9 (disclosure policy).

## §5 Coordination

- **One board.** A GitHub Project or a pinned issue on the fork, with columns class → owner → rule → sweep PR → gate (board link added when it exists). The file version, `doc/bug-classes.md`, ships with the first class PR; until then the public mirror is [`../05-bug-classes.md`](../05-bug-classes.md). The human-facing view is this folder.
- **Lanes:**

| Lane | Owner | Second pass | Classes / reviews | AI brief (one prompt per lane) |
|---|---|---|---|---|
| L1 Portability, packaging, ModelNet stores | C-PORT and C-K01 owners (claimable) | (claimable; never the owner) | K01, K06, K07, K16, K22, K20 generator | class, rule, worklist file, failing test first, Windows + macOS runs, maintainer gate |
| L2 Wallet, shielded, BCP/1, RPC auth | A-WALLET and A-STORES owners (claimable) | (claimable; never the owner) | K05, K08, K11, K12, K17, K21, K25, K27; §3.3, §3.5 | every RPC enumerated, locked-wallet user-path test, no behaviour change without a test |
| L3 CI, static/dynamic classes, bounds, fuzz, helper surface | C-STATIC and I-CI owners (claimable) | (claimable; never the owner) | K03, K04, K10, K15, K19, fs-trust, lifetime; §3.8. The K09 bounds (§3.2 PR half), §3.4 and §3.7 belong to lanes that get no work until claimed (A-NET, A-PQ, A-HELPER in the lane plan); until someone takes them, only the phase-3 fuzz targets are produced | assume every claim is wrong until checked; label [read]/[tested]/[inferred]; reuse the C1-C3 raw results |
| L4 Consensus evidence | the maintainer decides; the E-CONSENSUS owner prepares (claimable) | (claimable; never the owner) | K13, K14, §3.1, §3.6, #464 | measured result + ready test + one paragraph; no PR into 0.34.16 |
| L5 Operators, whole-system runs | an archive operator (I-OPS owner in the lane plan; claimable) | a second operator (claimable); a second lane owner reads any technical claim before it goes public | genesis sync, interop, reorg-path runs, signer and pool liveness | one script, one box, one line in the run log |
| L6 Release-candidate qualification | I-RC owner (claimable); runners on Windows, Linux, macOS and a real GPU | a second runner on a different OS, never the same box twice; a second lane owner reads the script | one archive per OS, a fixed checklist | the 11 Nov four-check pass as the template |
| L7 MatMul cross-backend runs | a volunteer with CUDA and Metal hardware (I-XDEV owner in the lane plan; claimable) | an independent CUDA re-run on different hardware; the E-CONSENSUS owner reads the verdict table into L4 | §3.6 corpus: CPU vs CUDA vs Metal | one corpus, one script, one verdict table |
| L8 Basic verify | rotating runners (part of L6 in the lane plan) | a second runner on a different OS | re-run a PR's stated test on your own hardware; report pass or fail | one-page brief + one-command script |

Owner slots, second passes and done bars per lane are in the lane plan, [`../07-lanes.md`](../07-lanes.md) (16 lanes: L1 = C-PORT + C-K01, L2 = A-WALLET + A-STORES, L3 = C-STATIC + I-CI, L4 = E-CONSENSUS, L5 = I-OPS, L6 + L8 = I-RC, L7 = I-XDEV; A-NET, A-HELPER, A-SHIELDED, A-PQ and A-GUI get no work until someone claims them). The L1-L8 grouping is older than the 16 lanes; where they differ, `../07-lanes.md` is the one to follow (K20 sits in A-STORES, K08 and K17 in C-PATHS, K12 note reservation also in A-SHIELDED). To claim a lane, add your handle there and in [`lanes.json`](lanes.json) by pull request.

- **Bug-class registry rule.** A new report or PR names its class from `doc/bug-classes.md` (or adds a class) and says whether the class is already swept.
  - If swept, the report is a gate failure and is fixed in the class's rule.
  - If not, it becomes the class's sweep PR, not an instance fix.
- **Release-scope note.** One page for the maintainer: what 0.34.16 ships enabled vs off (modelnet default, `-natpmp`, `-autoupdate`, Dandelion, provisional RC relay), what stays frozen (#464's list), and which §4.3 and §4.4 items already have evidence.
- **Maintainer interface.** The route is pull requests with documented, tested code.
- **Weekly cadence.**
  - Monday: each lane picks one class from the board.
  - Wednesday: second passes.
  - Thursday: one batch to the maintainer; an evidence note on #464 only when a complete item exists; one operator note.
  - No single-site PRs between batches unless the gate is red.

## §6 Phases

| Phase | When | Deliverables |
|---|---|---|
| 2a First value | 12-14 Nov | fork CI branch on `4c7840e9` with lint, clang-tidy-diff and cppcheck jobs (the first run sets the shard counts); rule-only PRs for K10 and K04; K15 (28 casts + 5 single results); the K01 worklist and lint handed to L1; triage of the functional failures |
| 2b The sweeps | 15-21 Nov | K05, K08, K03 (TSan classes + annotations on modelnet/node/wallet), fs-trust policy, K16, K17, K19 lints, K22 release gate, K11, K12, K07, K25, K27 (the last three counted first, rule-only under 3 sites); coverage ratchet and ASan job |
| 3 Deep reviews | 18-28 Nov | §3.3, §3.4, §3.7, §3.8 first; then §3.2 and §3.6 test artefacts; then §3.1 and §3.5 as evidence; fuzz batch (dispatcher, DLTX, chunks, hybrid handshake, model files) |
| 4 Ratchet | weekly from 24 Nov | baselines only shrink; weekly CodeQL; Thursday batch; #464 evidence list; external-review scope |

## §7 How the work is reported
- **Each class PR** states its class, the rule it adds, the sites it fixes and the fork CI run (fails before, passes after).
- **Each #464 evidence note** carries one item, one measured result, one ready test and one paragraph.
- **Operator notes** repeat the G1 profile and list which fixes a v0.34.15 node lacks.

## §8 Risks and what this plan will not catch
- **Class assignments are 10-15% noisy** [A], and the first tool counts were off for K01 and K10. Every sweep re-checks on code at the live head.
- **The functional gate starts red.** 82 of 208 scripts fail on the coverage build, and 51 of 200 on a plain gcc build. Until triage, the gate is a known-failing list, and a long list teaches people to ignore it.
- **matmul is unmeasured, not clean.** 47 suites time out, 363 of the 507 unexecuted verification functions sit in them, and the CodeQL class-2 results there wait for 0.35.
- **Consensus, fork choice, signer liveness and release signing stay with the maintainer.** This plan turns them into evidence.
- **Logic classes are not greppable.** K20, K21, K14 and K13 need generators, simulations or a redesign.
- **No gate here sees:**
  - the GPU backends and `src/qt` (compiled in no lane)
  - non-Linux paths in static analysis
  - the soundness of the shielded proofs (external review only)
  - the Atlas Rust and npm trees until OSV/cargo-audit runs
  - the lag between the release line and v0.34.15 nodes (1,194 commits)
- **The release-line workflow has never run.** The first fork run sets the shard counts.

## Verification notes
This version was checked against the raw lane outputs and the live tree on 12 Nov.
- **Functional coverage run size:** 208 scripts, not 200.
- **K01:** 12 files left at the live head by the file-level rule (raw write, no atomic primitive anywhere in the file). An earlier count of 16 included 2 files that were already atomic; #576 and #577 fixed 2 more. The rule hides a raw write in a file that also fsyncs another file: `modelnet/capability_bytes.cpp:515` is the one such candidate found, so the lane pack's count reads 13.
- **K10:** 1 candidate, not 4. Three were `also_string` rows the first parser missed.
- **K04:** 0 real sites.
- **K15:** 28 casts in scope after excluding consensus and matmul code.
- **TSan:** 5 product classes.
- **`security_v2`:** the earlier 0.3% figure was a risk share, not coverage.
- **Class count:** 26 named classes.
- **Upstream CI:** absent by policy, so the gate is fork-side.
- **Workflow file:** the fork workflow also removed the Atlas workflows and sat 157 commits behind; both are fixed before its first run.
- **Coverage ratchet:** it needs a dedicated box because of disk size.
- **Runner limits:** read from GitHub's docs, not from memory.
