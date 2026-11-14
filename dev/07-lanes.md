# Lanes: roles, done bars and the weekly rhythm
> Last verified: 2026-11-12 · against: btxchain/btx release-0.34.16 @ 4c7840e9 · owner role: lanes editor

**Claim a lane.** Add your GitHub handle to the lane's Owner line on this page and to its `owner.handle` in [`plan/lanes.json`](plan/lanes.json), in one pull request to this repo. Second-pass and runner slots are claimed the same way. The board (board link added when it exists) carries the live state of the work; this file carries the definition of each lane. The owner and the second pass of a lane are never the same person.

**For an AI working a lane.** Read [`AGENTS.md`](AGENTS.md), [`06-pr-gate.md`](06-pr-gate.md) and the lane's pack in [`packs/`](packs/) first. §8 of this page is the stop list: if a step would break one of its rules, stop and hand the question to the human.

This is the public version: roles, and a handle once someone has claimed a slot. Every slot without a handle below is open. Companion to the plan, [`plan/MASTER-PLAN.md`](plan/MASTER-PLAN.md); the machine-readable form is [`plan/lanes.json`](plan/lanes.json). Which lane fits which level: [`08-levels.md`](08-levels.md). Lanes with an AI pack have it in [`packs/`](packs/) (A-WALLET, A-STORES, C-K01, C-PORT, C-PATHS, C-STATIC, I-CI, I-RC and `I-RC-runner`, I-OPS, I-XDEV, E-CONSENSUS); the five lanes in §4 have none yet.

Every number below comes from [`plan/plan-data.json`](plan/plan-data.json) or the plan; [C3] marks a number from the coverage run. Coverage is product-code line coverage on `release-0.34.16` at `c6f9678d`, unit-only / unit + functional. All coverage numbers are floors: 47 unit suites timed out and 82 of 208 functional scripts failed in the coverage run. The coverage build configures again on `release-0.34.16` since #578 (merged into the release line on 12 Nov as `7051507b`); the fix is not in v0.34.15. The recipe is in [`04-build-and-test.md`](04-build-and-test.md) §5. The live head is `4c7840e9` (31 commits later; none touches `validation.cpp`, `net_processing.cpp`, `pow.cpp`, `src/consensus` or `script/interpreter.cpp`: `git diff --stat c6f9678d 4c7840e9 -- src/validation.cpp src/net_processing.cpp src/pow.cpp src/consensus src/script/interpreter.cpp` prints nothing).

## 0. The idea in five lines

1. A lane is one area of code, one bug class or one piece of infrastructure, with one owner, one second-pass reviewer and a measurable done bar.
2. Work arrives as class sweeps (every site plus the rule that keeps the class at zero), not as single-site fixes.
3. Nothing from a lane goes to the maintainer outside the Thursday batch, unless a gate is red.
4. Anything that touches validation, fork choice, attestation state or the MatMul frontier is evidence on #464, never a PR into `release-0.34.16`. The maintainer's rule on #464 (11 Nov) names the validation, fork-choice and MatMul-frontier entries; this hub routes attestation-state changes the same way (K13: 11 of 15 PRs were not taken).
5. Each person's AI works from the lane brief and the "never" list in §8. The owner signs every post; the AI posts nothing.

## 1. Roles, load and the crosswalk to the plan

| Role | What it does | Source |
|---|---|---|
| Lane owner | picks the week's class or item on Monday, drives the sweep and the rule, signs every post from the lane | §6, §7, §8 |
| Second pass | reviews before anything goes upstream (Wednesday); never the owner; for a run lane, an independent run on different hardware | §6, `plan/lanes.json` rules |
| Runner | runs one script on their own hardware and pastes its one-line result unchanged | I-RC, I-OPS, I-XDEV |
| Batch coordinator | keeps the board, assembles the Thursday batch, decides owner/second-pass disagreements for the batch | §6, §7 |
| The maintainer | decides what lands in `btxchain/btx` | #464 (11 Nov) |

Load rule: one person owns at most three lanes and second-passes at most three; someone taking a first lane owns one. Five lanes get no work until someone takes them (§4). That is stated, not hidden.

Crosswalk from the master plan's L1-L8: L1 = C-PORT + C-K01; L2 = A-WALLET + A-STORES; L3 = C-STATIC + I-CI (+ A-HELPER); L4 = E-CONSENSUS; L5 = I-OPS; L6 + L8 = I-RC; L7 = I-XDEV.

## 2. The lane map

```
                   MAINTAINER (decides what lands)
                Thursday batch  |  #464 evidence list
                       ^                ^
   --------------------+----------------+--------------------------
   |        BATCH COORDINATOR [claim]: board, batch, gate         |
   ----------------------------------------------------------------
        |                      |                       |
   AREA lanes             CLASS sweeps            INFRA lanes
   (code areas)           (one rule each)         (gates and runs)
   ---------------        ---------------         ---------------
   A-WALLET    [claim]    C-K01    [claim]        I-CI    [claim]
   A-STORES    [claim]    C-PORT   [claim]        I-RC    [claim]
   E-CONSENSUS [claim]    C-STATIC [claim]        I-OPS   dr-chambre
   A-NET       [claim]    C-PATHS  [claim]        I-XDEV  [claim]
   A-HELPER    jarekpiot
   A-SHIELDED  [claim]    Runners: [claim] Windows, Linux, macOS, GPU
   A-PQ        [claim]    Second passes: see §3 (never the owner)
   A-GUI       [claim]

   Flow:  found -> class check -> count on live head -> sweep + rule
          -> PR with fork CI link -> second pass (Wed) -> Thursday batch
          consensus-touching -> E-CONSENSUS -> #464 evidence
```

## 3. The lanes

Format per lane: scope; why (risk rank, coverage now); owner; second pass; cadence; done bar; first three tasks; route. "Risk rank" is the area rank from the risk map (1 = highest). Routes: **PR** = normal PR to `release-0.34.16` in the Thursday batch; **EVIDENCE** = measured result + ready test + one paragraph on #464; **RUN** = a run report on the board (and in the PR it verifies).

### Area lanes

**A-WALLET: wallet, RPC authorization, secrets**
- Scope: `src/wallet/` (not `shielded_rpc.cpp`, see A-SHIELDED), `src/wallet/rpc/`, wallet-facing RPC auth in `src/rpc/`. Classes K05 (10 PRs), K11/K12 (8), K25 wallet half (5), K27 (3). Deep review §3.3 of the master plan (seed ownership, backups, locked-wallet user path, migration W1-W3).
- Why: wallet is risk rank 4; coverage 37.2 / 50.5; rpc 51.6 / 72.9; 927 wallet functions never executed under unit + functional tests.
- Owner: (claimable) · Second pass: (claimable; never the owner).
- Cadence: one class per week from phase 2b; §3.3 review in phase 3.
- Done bar: K05 test enumerating every wallet RPC against a locked wallet, in ctest; K11 allowlist test per restricted-user RPC; K12 RAII reservation type plus a two-sender test; K27 log-scan assertion in the functional runner; a restore-without-passphrase probe that fails; a memory scan after `walletlock` with no seed bytes; wallet lines from 50.5 to at least 70 (target set here); each of the 927 unexecuted functions tested or listed as dead.
- First three tasks: (1) run the K05 dominance check over the src/wallet/rpc files that call funding primitives and file the test as one PR; (2) enumerate RPCs with a `path|file|secret_ref|destination` argument and write the K11 allowlist test; (3) the K12 `UnlockSelected` RAII type with the two-sender test.
- Route: PR.

**A-STORES: ModelNet store, deposit and persistence logic**
- Scope: the ModelNet stores (`src/modelnet/helper.cpp` and the bounty, campaign, mandate, feed, catalog stores), `src/wallet/rpc/bcp1.cpp` and the BCP/1 planners, non-MatMul persistence. Classes K20/K21/K02 (52 PRs). Not greppable: this lane writes test generators, not instance fixes.
- Why: modelnet is risk rank 3; `modelnet/helper.cpp` was touched by 42 fix PRs; modelnet coverage 83.7 / 85.6 hides the logic slips (the tests pass, the edge cases are wrong).
- Owner: (claimable) · Second pass: (claimable; never the owner).
- Cadence: one store per week from phase 2b.
- Done bar: property tests per store (idempotency keys, pagination completeness, monotonic counters, restart = no restart) registered in ctest; one table-driven BCP/1 lifecycle test (new, mempool, confirmed, replaced, spent, consolidated) through every RPC that reports a deposit; a `mutate -> reopen -> compare` test per store; a `helper.cpp` split proposed to the maintainer with the tests in hand; zero new single-site K20/K21 PRs after the generators land.
- First three tasks: (1) list every store with a `ToJson`/`Serialize` and a mutator, and the fields written by the mutator but absent from the serialiser (the K02 static form); (2) the BCP/1 lifecycle table test; (3) the first property-test generator on the bounty store.
- Route: PR.

**E-CONSENSUS: consensus, fork choice, attestation, MatMul frontier (evidence only)**
- Scope: `validation.cpp`, `pow.cpp`, `src/consensus/`, `script/interpreter.cpp`, fork choice and download scheduling in `net_processing.cpp`, `node/matmul_trusted_attestations.*`, `src/matmul/`. Classes K13 (15 PRs, 11 not taken) and K14 (19 PRs). Master plan §3.1, §3.6 (rules), §3.2b, §3.5b.
- Why: net/p2p is risk rank 1 and validation rank 2; `net_processing.cpp` has 113 fix commits and 24.6 / 62.3 coverage; `validation.cpp` 63 fix commits, 75.6 / 78.2; `node/matmul_trusted_attestations.h` 50 fix commits; 68 consensus functions never executed. These areas are frozen for 0.34.16 (#464), so the only output that lands is evidence.
- Owner: (claimable; prepares the evidence, the maintainer decides) · Second pass: (claimable; never the owner). Field data: I-OPS run reports (candidate runs, mirror timelines) and I-XDEV verdict tables.
- Cadence: with the Thursday batch, only when a complete item exists; at most one short note.
- Done bar: a #464 evidence list where every item is one measured result + one ready test + one paragraph; the K13 attestation state machine as one model-based test (vote, withdraw, restart, reorg, missing index) instead of five PRs; the K14 download state machine as a deterministic simulation with an adversarial scheduler asserting "every announced body is requested within N ticks"; the 68 unexecuted consensus functions listed as tested or dead; a byte-diff proof of block validity between `main` and the release line; the `net_processing` and `validation` thread-safety warnings delivered as a measured result; zero re-filed PRs that were not taken.
- First three tasks: (1) turn the items on #464's list and the K13 list that were not taken into evidence items (one per invariant); (2) write the K13 model test; (3) the K14 simulation skeleton with the existing `p2p_*` fixtures.
- Route: EVIDENCE. A PR is sent only if the maintainer asks for one.

**A-NET: non-consensus P2P bounds and parsers (no work until claimed)**
- Scope: `net.cpp`, `netbase`, `addrman`, message parsers outside fork choice and scheduling; the five message types with no fuzz target (DLTX, block chunks, mmsketch, mdpeers, mmatrefute); the ML-KEM hybrid handshake target; Dandelion stem limits. Class K09 P2P half (18 PRs across both halves); K25 observing-peer functional test (with A-WALLET).
- Why: net/p2p is risk rank 1; `net_processing.cpp` 24.6 / 62.3, other net 50.4 / 75.5; the parser targets do not exist (gate G3: 1 of about 13 targets exists).
- Owner: (claimable) · Second pass: (claimable; never the owner). Interim: the phase-3 fuzz batch produces the targets only; nobody reviews the bounds table until the lane is owned.
- Done bar: every peer-fed container in `doc/resource-bounds.md` with a bound, an eviction and a unit test; the five message-type targets plus the hybrid-handshake target link and run 24 h clean under ASan; K25 observing-peer test in the functional runner; `net_processing.cpp` at or above 75 lines with functional tests (target set here) through non-consensus tests.
- First three tasks: (1) the container inventory for the P2P handlers (semgrep rule from the master plan §2 row 1); (2) the DLTX fuzz target; (3) the K25 observing-peer test.
- Route: PR for bounds and targets; anything in scheduling or fork choice goes to E-CONSENSUS.

**A-HELPER: ModelNet helper network surface and `security_v2`**
- Scope: the helper's native request dispatcher, the fuzz targets that have never run, the modelnet fuzz build that does not link by default, `src/modelnet/security_v2/`, the two-user layout under `-modelrpcsocket`, the jail escape suite. Master plan §3.7. K09 helper half, fs-trust results that sit in the helper (most of the 133 are in the helper and stores).
- Why: modelnet is risk rank 3; `security_v2` is at 0.2 / 15.0 with 6 files at 0 even with functional tests; the dispatcher has no fuzz target.
- Owner: jarekpiot · Second pass: (claimable; never the owner). Interim: the phase-3 fuzz batch covers the dispatcher target and the `native.cmake` gate only.
- Done bar: `modelnet_native_dispatch` target runs 24 h clean under ASan; the never-run targets run 1 h clean; every `security_v2` file above 0; a functional test that no non-loopback listener opens on 29447 without `-modelbind` and no NAT-PMP mapping is requested; under `-modelrpcsocket` the helper runs as a different user and cannot open `.cookie` or `wallets/`; a malformed reply fails the request, not the helper.
- First three tasks: (1) make the modelnet fuzz build link at default options; (2) the dispatcher fuzz target on a scratch catalog; (3) the listener/NAT-PMP functional test.
- Route: PR; the helper user default is the maintainer's decision and goes with the release-scope note.

**A-SHIELDED: shielded pool integration (no work until claimed)**
- Scope: `src/shielded/` integration, `wallet/shielded_rpc.cpp`, note reservation (K12, with A-WALLET), verification cost limits. Master plan §3.5a. The proof soundness is outside this programme (external review).
- Why: shielded coverage 71.8 / 72.3, but `wallet/shielded_rpc.cpp` is risk rank 4 among files at 15.8 / 24.3 with no test file.
- Owner: (claimable) · Second pass: (claimable; never the owner).
- Done bar: a test file for `shielded_rpc.cpp` with the file above 50 lines (target set here); verification fuzz targets with cost limits; a disconnect-reconnect functional test; the wallet-side fix of the one lock-order inversion that DEBUG_LOCKORDER reports (plan §1.3). The anchor-window item (#317/#461) is EVIDENCE.
- First three tasks: (1) the `shielded_rpc_tests` file over the RPCs that K12 touched; (2) the lock-order fix with a DEBUG_LOCKORDER test; (3) the disconnect-reconnect functional test.
- Route: PR; anchor window to E-CONSENSUS.

**A-PQ: post-quantum crypto use (no work until claimed)**
- Scope: every verify call site (ML-DSA-44, SLH-DSA, P2MR evaluation), sigop accounting for PQ signatures, the ML-KEM transport, build flags for constant-time code. Master plan §3.4.
- Why: pq coverage is 92.7 / 92.7, but a verifier disagreement between implementations is a consensus split, and only differential testing is an oracle. Checked already: the linked Dilithium is the reference build with the z-norm check; no affected PQ crates in the Atlas tree.
- Owner: (claimable; needs someone comfortable with crypto test vectors) · Second pass: (claimable; never the owner).
- Done bar: a libFuzzer differential target (BTX verify vs an independent ML-DSA-44/SLH-DSA library) runs clean; ACVP and Wycheproof vectors in ctest; a build check that constant-time paths are never compiled at `-Os`/`-O1`; nightly cross-implementation checksums.
- First three tasks: (1) the vector test; (2) the differential target; (3) the build-flag check.
- Route: PR for tests; any accept/reject disagreement is EVIDENCE immediately.

**A-GUI: Qt and Atlas (no work until claimed)**
- Scope: `src/qt/` (no coverage data in any run: unknown, not zero), the Atlas Rust and npm trees (OSV/cargo-audit listed, not run), Atlas RPC allowlists per screen.
- Why: `qt/modelnetpage.cpp` is risk rank 7 among files with no data; nothing in the programme compiles the GUI.
- Owner: (claimable) · Second pass: (claimable; never the owner).
- Done bar: a GUI build in the fork CI matrix; `cargo audit` and OSV over the Atlas lock files on every push; an Atlas per-screen allowlist test.
- First three tasks: (1) the GUI build job; (2) `cargo audit` in CI-4; (3) the allowlist test.
- Route: PR.

### Class sweeps

**C-K01: non-atomic or short state-file writes**
- Scope: 12 files at `4c7840e9` (`package_channel`, `import_coordinator`, `workspace_git`, `swarm_evolution`, `obs01`, `acc04` in modelnet; `wallet/wallet.cpp`, `wallet/dump.cpp`, `wallet/rpc/labels.cpp`, `node/blockstorage.cpp`, `node/attested_utxo_snapshot.cpp`, `init.cpp`) plus one direct write left in `realm_channel.cpp`, and one candidate the plan's file-level filter skipped because the file also contains an fsync: `modelnet/capability_bytes.cpp` (a raw `.gen` sidecar write, line 515 at `4c7840e9`; the pack's count finds 13); the shared `WriteBinaryFileAtomically` helper (#576), which has no fsync.
- Why: 22 PRs, the class turning up module after module; a loader that reads a damaged file as empty starts the node from zero.
- Owner: (claimable) · Second pass: (claimable; never the owner; writes the lint).
- Cadence: phase 2a-2b, one PR.
- Done bar: 12 files to 0; `FileCommit` of file and directory inside the helper; a lint against raw `ofstream`/`fopen("w")` to datadir paths in CI-4; a truncated-file load test per store; zero new K01 PRs after the sweep.
- First three tasks: (1) re-grep the worklist on the live head; (2) fsync in the helper with a test; (3) the sweep PR with the lint.
- Route: PR. `node/blockstorage.cpp` and `attested_utxo_snapshot.cpp` sites are checked for consensus adjacency before they go in; if adjacent, EVIDENCE.

**C-PORT: Windows, macOS, build and packaging, resource lifecycle**
- Scope: K06 Windows/MinGW/MSVC (33 PRs), K07 macOS/libc++/Qt packaging, K22 build/packaging/release-gate drift (K19/K22 together 40 PRs), K16 pipe/pid/socket lifecycle; `src/compat/`, `scripts/release/package_release_archive.py`, the installer path (`install_prebuilt_release_tree`).
- Why: K06 (33 PRs), K19/K22 (40), K10 (14) and K07 (6) are classes a CI matrix catches before filing; K06 kept finding new files.
- Owner: (claimable) · Second pass: (claimable; never the owner); a macOS runner runs the macOS half when a PR has K07 content.
- Cadence: follows the first green Windows and macOS fork runs (I-CI), then one PR per class.
- Done bar: the POSIX-outside-`#ifndef WIN32` grep as a lint in CI-4; the first green Windows and sharded macOS runs on the release line; `otool -L` on every packaged binary in CI-10; RAII wrappers for fork/socket/pipe with a pidfd identity check before every `kill`; zero new-site K06 after the lint; the release-gate job green (GLIBC ceiling, RUNPATH, `elfcheck.py`).
- First three tasks: (1) the POSIX grep lint; (2) the `otool` step in the release gate; (3) the K16 RAII wrapper PR.
- Route: PR.

**C-STATIC: machine-rule sweeps from the static and dynamic baselines**
- Scope: K10 RPC conversion (1 candidate left; rule-only), K04 UniValue self-assignment (0 sites; rule-only), K15 integer width (28 casts in scope), K03 lock order and TSan (41 site pairs, 5 product classes, 266 thread-safety warnings, 1 inversion) on modelnet/node/wallet files, fs-trust (C1 class 1, 133 CodeQL results), lifetime/init (C1 class 3, 120 results), cppcheck errors (26), K19 registration and exec-bit lints, the K09 container inventory as a CodeQL query. Sweep rule (c): no hit in `validation.cpp`, `pow.cpp`, `src/consensus/`, `script/interpreter.cpp`, fork choice or `src/matmul/` is touched; those go to E-CONSENSUS.
- Why: the baselines exist and are untriaged; each rule costs an afternoon and closes a class for good.
- Owner: (claimable; agents do the mechanical part) · Second pass: (claimable; never the owner).
- Cadence: K10 + K04 + K15 in phase 2a; K03, fs-trust, lifetime in phase 2b.
- Done bar: K10 unit test over the `RPCHelpMan` table in ctest; K04 lint in CI-4; 28 casts on `ParseUint32Index` or proved range-checked; TSan baseline 41 pairs only shrinks and the 5 product classes are at 0; `-Werror=thread-safety` on every clean file; one fs-trust policy (0600 for secrets and sockets, an audited env-var allowlist, a provenance check at each sink) with the CodeQL baseline only shrinking; 120 lifetime results initialised or documented; cppcheck errors 26 to 0; the `doc/resource-bounds.md` table started.
- First three tasks: (1) the K10 test and K04 lint PRs; (2) the K15 sweep with the 5 single results outside matmul (plan §1.2); (3) fixes for the five TSan product classes, with `EXCLUSIVE_LOCKS_REQUIRED` annotations on the helper stores and wallet paths.
- Route: PR; anything under rule (c) is EVIDENCE.

**C-PATHS: paths, symlinks, jail, options honoured**
- Scope: K08 path/symlink/jail (8 PRs), K17 option or mode not honoured (10 PRs: `-listen=0`, `-proxy`, `-onlynet`, `-v2pqonly`, `-natpmp=0` on every network surface outside `net.cpp`).
- Why: a jail step that fails and carries on unjailed, or a second network surface that ignores `-proxy`, undoes the operator's safe profile.
- Owner: (claimable) · Second pass: (claimable; never the owner); a Windows runner checks reparse-point behaviour.
- Cadence: phase 2b.
- Done bar: one `SafePath` helper; every `pivot_root|chroot|unshare|mount(` failure fatal; tests with a symlinked ancestor and a symlinked leaf; jail tests with 0 "jail absent" skips under `BTX_TEST_REQUIRE_LINUX_JAIL=1` in CI; a functional matrix {`-listen=0`, `-proxy`, `-onlynet`, `-v2pqonly`} x every listening surface.
- First three tasks: (1) count the K08 and K17 sites on the live head (rule (a): under 3 real sites, file the rule alone); (2) the `SafePath` helper PR; (3) the option matrix test.
- Route: PR.

### Infrastructure lanes

**I-CI: the fork CI gates**
- Scope: the fork workflow (exists; never run on the release line; must be rebased onto `4c7840e9` with the upstream Atlas workflows kept): CI-0 build matrix (Linux, userns, mingw, Windows, macOS), CI-1 sharded unit + functional, CI-2 ASan/UBSan, CI-3 TSan + DEBUG_LOCKORDER nightly, CI-4 lint, CI-5 clang-tidy-diff, CI-6 cppcheck, CI-7 fuzz-smoke (ClusterFuzzLite), CI-8 CodeQL weekly on a dedicated box, CI-9 coverage ratchet on a dedicated box, CI-10 release gate; `ci/known-failing.txt`; the nightly stage3 job for the 47 timing-out suites.
- Why: upstream runs no hosted CI by choice (`.github/workflows/README.md`), so the contributor-side gate runs on a fork. Baselines: coverage 69.9 lines / 40.7 branches, TSan 41, cppcheck 372, CodeQL 260, tidy 1,033. The macOS test job ran out of time on the last fork run, so it is sharded.
- Owner: (claimable) · Second pass: (claimable; never the owner; someone who reads fork CI output).
- Cadence: CI-0, CI-4, CI-5, CI-6 in phase 2a; CI-2, CI-9 in phase 2b; the rest by phase 4.
- Done bar: CI-0 run once on `4c7840e9` and the shard counts set from it; `ci/known-failing.txt` written from that run (the unit failures, the 48 ExactReplay-stall scripts [C3], the gcc-baseline failures after triage) and only shrinking; every class PR links a run with fails-before and passes-after; CI-9 fails any area that drops more than 0.2 points; the 47 timeouts have a job and a number; every baseline only shrinks.
- First three tasks: (1) rebase the workflow, restore the Atlas workflows, update its description, run it; (2) CI-4 lint with the K19 registration diff and exec bits; (3) triage the 82 functional failures into stall class vs real.
- Route: fork branch; a workflow file goes upstream only if the maintainer asks.

**I-RC: release-candidate qualification and basic verify**
- Scope: one archive per OS, a fixed checklist (the four-check pass posted on #432, 11 Nov: compatibility, desktop first use, restart, model download and recovery), the installer on the real archive, plus the per-PR "re-run the stated test on your own hardware" service.
- Why: 7 fix PRs on one release script; the Linux candidate at `c6f9678d` had one independent four-check run (#432, 11 Nov); no macOS, Windows or CUDA candidate has had one yet.
- Owner: (claimable; writes the checklist and the one-command script). Runners (each claimable): native Windows with an NVIDIA GPU; Windows 11 + WSL2; Linux (IBD from genesis and upgrade from a saved datadir); macOS. Second pass: (claimable; never the owner): a second runner on a different OS; never the same box twice.
- Cadence: every candidate; verify requests tagged on the board, answered within the week.
- Done bar: a Linux, Windows and macOS line with SHA and pass/fail for every candidate before anyone writes "ready"; `install_prebuilt_release_tree` on the real archive starts a node; the verify script prints one line (commit, test, result) the runner pastes unchanged; no runner box holds keys, tokens or wallets.
- First three tasks: (1) the one-page brief and the one-command script (start from [`packs/I-RC-runner.md`](packs/I-RC-runner.md)); (2) the Windows run of the current candidate by two Windows runners; (3) the installer-on-real-archive test.
- Route: RUN; a failure becomes a class-registry entry, then a PR by the class owner.

**I-OPS: operators and whole-system runs**
- Scope: archive mirrors and signed snapshots, the monitoring page as the health signal, IBD from genesis on a stock binary, staged upgrades, mixed-version interop (v0.34.15 against the release line), the operator safe profile in the guides (`-modelnet=0` and `-natpmp=0` on any node that holds a wallet or signer key; `-autoupdate` reviewed before enabling), which fixes a v0.34.15 node lacks (gate G1).
- Why: gate G1 is "partly"; the release line is far ahead of what most nodes run; operator data has found real bugs before.
- Owner: dr-chambre (an archive operator) · Second pass: (claimable; never the owner; a second operator); a second lane owner reads any technical claim before it goes public.
- Cadence: one run line per candidate; the safe-profile text once, then kept current.
- Done bar: the safe profile in the community guide and the status page; a genesis sync with `assumevalid=0` on a stock binary that reaches the tip, reported with the height; an upgrade from a saved datadir on every candidate; one interop run per candidate; UTC timelines on every report.
- First three tasks: (1) the safe-profile paragraph; (2) the genesis-sync run on the current candidate; (3) the upgrade run from the saved datadir.
- Route: RUN; findings to the registry, then to the class owner or to E-CONSENSUS.

**I-XDEV: MatMul cross-backend corpus**
- Scope: one mutated-block corpus replayed on CPU, CUDA and Metal; one script; one verdict table. Master plan §3.6 tests half.
- Why: matmul is risk rank 9 but 62.6 / 62.7 with 47 suites unmeasured; a CPU/CUDA corpus run exists; Metal has never been run; a backend disagreement is a consensus split.
- Owner: (claimable; needs CUDA and Apple Silicon Metal hardware) · Second pass: (claimable; never the owner): an independent CUDA re-run on different hardware. The E-CONSENSUS owner reads the verdict table into the evidence list.
- Cadence: once per candidate, and once after any matmul change lands.
- Done bar: the corpus and script in the repo; a table with one row per (block, backend) and no disagreement; a Metal row exists; every disagreement filed as EVIDENCE within the week.
- First three tasks: (1) take the existing CPU/CUDA corpus and script; (2) run Metal; (3) publish the table.
- Route: RUN; disagreements EVIDENCE.

## 4. Lanes that get no work until claimed

A-NET, A-HELPER, A-SHIELDED, A-PQ, A-GUI. Each has a written scope and done bar above, so a newcomer can take one. Until then: A-NET and A-HELPER get only the phase-3 fuzz targets; the other three get nothing. The done bar is the ask: claim the lane by pull request (top of this page) and post your first task on the board.

## 5. The board and the registry

- **Board:** a GitHub Project on a contributor fork (fallback: one pinned issue there): board link added when it exists. Until then, a card's text goes as a comment on the lane's claim pull request in this repository, and a question goes to the lane owner named there. Columns: class -> lane -> owner -> rule -> sweep PR -> fork run -> second pass -> batch -> gate. One card per class and one per lane. Not chat: chat is for questions, the board is the state. This folder is the human-facing view: the board carries the live state, this file the definition of each lane, and owners mirror the two weekly.
- **Registry file:** `doc/bug-classes.md`, shipped in the first class PR. One row per class: id (K01...), name, pattern (two lines), the rule (test, lint or CI job), status (swept / rule only / not counted / evidence), lane, sites open at the last sweep and the head it was counted on, example PRs. Until it lands upstream, [`05-bug-classes.md`](05-bug-classes.md) is the public mirror.
- **Registry rule:** a new report or PR names its class from the file (or adds one) and says whether the class is swept. Swept: the report is a gate failure and is fixed in the class's rule. Not swept: it becomes the class's sweep PR, not an instance fix. Fewer than 3 real sites: the rule alone.
- **Hot files:** `net_processing.cpp`, `modelnet/helper.cpp`, `node/matmul_trusted_attestations.*` take no per-event PR without a model-based test or a split proposal first.

## 6. Weekly rhythm

| Day | What | Who |
|---|---|---|
| Monday | each lane picks one class or item from the board; owners post the plan line on their card | owners |
| Tuesday-Wednesday | sweep, rule, fork CI run; second passes on Wednesday | owners, second pass |
| Thursday | one batch to the maintainer (PRs with run links); an evidence note on #464 only when a complete item exists; one operator line | batch coordinator |
| Friday | board updated; baselines rechecked; I-RC verify lines in | batch coordinator, runners |

No single-site PRs between batches unless a gate is red. Batches go out on Thursdays. Phases, in order: 2a first value (K10, K04, K15, the CI branch, the K01 worklist), 2b the remaining class sweeps, 3 deep reviews, 4 the weekly ratchet. Dates live on the board, set by the lane owners once lanes are claimed; the dated plan is in [`plan/MASTER-PLAN.md`](plan/MASTER-PLAN.md) §6.

## 7. How a finding moves, escalation, the maintainer interface

**Flow.** found -> class check against the registry -> count on the live head -> sweep every site + write the rule -> PR with the fork CI link (fails before, passes after) -> second pass (Wednesday) -> Thursday batch -> merged -> board card moved -> baseline shrinks. A finding in validation, fork choice, attestation or the MatMul frontier leaves the flow at step 2 and goes to E-CONSENSUS as evidence.

**Escalation.**
- Gate red (a baseline grew, a known-failing list grew): the lane stops new work and fixes the gate first.
- A PR the maintainer closed without taking it: never re-filed; it becomes an evidence item or is dropped. The board card says which.
- Owner and second pass disagree: the batch coordinator decides what goes into the batch, and the question goes into the Thursday batch as one line if the maintainer's view is needed.
- A security-relevant finding: GitHub private vulnerability reporting on the upstream repo, never a public issue or a chat post, and the class is added to the registry without the detail.
- A runner cannot reproduce a stated test: the PR waits; the owner, not the runner, investigates.

**Maintainer interface.** The route is pull requests with documented, tested code. The maintainer's public rule on #464 (11 Nov) is the frame: validation, fork-choice and MatMul-frontier items stay out of `release-0.34.16`; standalone, documented PRs for everything else have landed within days (the five invited there landed on 12 Nov as #579-#583). So: one Thursday message with the batch, not one message per PR; each PR states class, rule, sites, run link and the invariant it keeps (in the style the repo's own `AGENTS.md` uses); tested fixes only; no stubs, no fail-closed workarounds, no disabled tests; nothing into #464's frozen set; CI stays on the fork and is offered upstream only on request. Before every post the owner asks "would the maintainer reject this?" with the answer defaulting to yes until the PR says why not.

**Done at programme level** (gates from the master plan): G2 machines on (every CI job green or baselined), G3 parsers covered (about 13 targets, 1 exists), G4 classes swept (K10, K04, K15, K01, K05, K08/K16/K17, K06, K19 each with its rule). When those three are true, the weekly batch shrinks to the ratchet and the lanes become maintenance.

## 8. What each person's AI must never do

Applies to every lane. The person who owns the lane signs every post; the AI drafts.
1. Never post, comment, push or open a PR on its own. The owner reads the full text and the diff first.
2. Never open a PR into `release-0.34.16` that touches `validation.cpp`, `pow.cpp`, `src/consensus/`, `script/interpreter.cpp`, fork choice or download scheduling in `net_processing.cpp`, `node/matmul_trusted_attestations.*` rules, or `src/matmul/`. Those go to E-CONSENSUS.
3. Never file a single-site fix for a class in the registry. Count the class on the live head; sweep it; add the rule.
4. Never put a fix in a commit linked from a comment. Follow-ups are PRs.
5. Never claim a test ran without the run link or log, the commit SHA and the platform. "Fails before, passes after" or nothing.
6. Never add a stub, a fail-closed workaround, a skipped test or a widened timeout to make a job green.
7. Never stop a node with `kill -9`. Stop any keeper or watchdog first, back up the datadir, then stop the node cleanly.
8. Never re-run a baseline tool that already ran; reuse the C1-C3 results (the numbers in [`plan/plan-data.json`](plan/plan-data.json)) and re-grep only the live head.
9. Never hold keys, wallet files, RPC cookies or tokens on a test or runner box; never test on the machine that holds a wallet.
10. Never quote private chats, name people other than by handle, or state a figure without its source.

**One-line AI brief per lane.**
- A-WALLET: every RPC enumerated; locked-wallet user path tested; no behaviour change without a test.
- A-STORES: generators, not instance fixes; "restart equals no restart" is the invariant.
- E-CONSENSUS: measured result + ready test + one paragraph; no PR.
- C-K01 / C-PORT / C-PATHS: class, rule, worklist file, failing test first, Windows and macOS runs, maintainer gate.
- C-STATIC: assume every claim is wrong until checked; label [read]/[tested]/[inferred]; reuse the raw results.
- I-CI: the first run is the measurement; baselines only shrink.
- I-RC / I-OPS / I-XDEV: one script, one box, one line; paste the script's output unchanged.
