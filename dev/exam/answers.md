# Exam: answer key

> Last verified: 2026-11-12 · against: btxchain/btx release-0.34.16 @ 4c7840e9 · owner role: exam editor

**Do not load this file into the session that takes the exam.** The questions are in [`questions.md`](questions.md). This file is for grading only.

## Pass bar and grading

- **Pass: 11 of 12**, questions answered with this file out of context.
- A question counts when (a) the verdict matches the key and (b) at least one cited source is one the key names, or an equivalent public source that says the same thing (another closing comment from the same day, another commit of the same PR, a hub section that states the same rule).
- A right verdict with no source scores 0. A made-up PR number, SHA or quote scores 0 and is worth a lesson (see [`../lessons/README.md`](../lessons/README.md)): a setup that invents sources is not ready.
- "Hub" references point at the pages of this folder: `AGENTS.md` (the ten rules), `02-method.md`, `03-guardrails.md`, `04-build-and-test.md` (sections numbered §1-§7), `05-bug-classes.md`, `06-pr-gate.md`, `07-lanes.md`.
- When a fact below changes upstream (a new head, a merged fix on `main`), the exam editor updates the key and this file's last-verified line in the same pull request.

Re-check the git facts in this key from any clone of `btxchain/btx`:

```bash
git fetch origin main release-0.34.16
git rev-parse --short=8 origin/main                                          # 476f3f23 = v0.34.15
git merge-base --is-ancestor 7051507b origin/main && echo "#578 in v0.34.15" || echo "#578 not in v0.34.15"
git merge-base --is-ancestor 7051507b origin/release-0.34.16 && echo "#578 on the release line"
git log --oneline origin/release-0.34.16 | grep -i -e 'drop PQ seeds' -e 'ask for the passphrase'   # the K05 chain, landed
```

---

## Q1. A fix in block connection

**Verdict.** No pull request into `release-0.34.16`. Write an evidence item for the E-CONSENSUS lane: the invariant in one sentence, what was measured (commit, platform, result), the ready test (fails on `<sha8>`, passes with the change), and one paragraph. A human offers it on #464 with the weekly batch, once the item is complete; it never becomes a PR into the release line.

**Why.** The release line takes no validation, fork-choice, attestation or MatMul-frontier changes. The maintainer (numair) said so on #464 (11 Nov): the validation, fork-choice and MatMul-frontier entries of that list stay out of `release-0.34.16`. The same day the maintainer closed #461, #462, #463, #479, #484 and #515 with one note: each changes validation, what a signer is told to attest, or MatMul frontier state, so it is not in `release-0.34.16`. A good test does not change the scope; it makes the evidence item useful.

**Sources.** #464 (11 Nov); the closing notes on #461, #463, #479, #484 or #515 (11 Nov); hub: `06-pr-gate.md` (the scope list and the evidence-item shape), `07-lanes.md` (E-CONSENSUS lane, "how a finding moves"), `AGENTS.md` rule 3.

**Wrong answers.** "Open it, the test is good." "Split the `validation.cpp` hunk into a smaller PR." "Ask in a chat whether it can go in anyway."

## Q2. Coverage on v0.34.15

**Verdict.** No. The coverage build configures again on `release-0.34.16` since #578, which landed on 12 Nov as commit `7051507b`. It is not in v0.34.15 (`main`, `476f3f23`).

**Why.** Before #578, `CMAKE_BUILD_TYPE=Coverage` ran a source-mirror step (`CoverageSanitize.cmake`) at configure time. A fresh configure stopped on a failed symbolic link, and an existing build directory sent build output into the source tree (commit message of `7051507b`). v0.34.15 still has that step: `CMakeLists.txt` line 666 and lines 670-675 at `476f3f23`, and its two coverage scripts are identical to the release line's before the fix (`git diff 476f3f23 7051507b^ -- cmake/script/CoverageSanitize.cmake.in cmake/script/CoverageInclude.cmake.in` is empty).

Numbers to quote, measured at `c6f9678d` with the #578 fix applied: product code 65.8% of lines with unit tests only and 69.9% with unit + functional tests; branches 37.7% and 40.7%. The caveat: all four are floors. 47 unit suites timed out and 82 of 208 functional scripts failed in the coverage run, and a killed test writes no coverage data. Also: the one-shot `cmake -P build/Coverage.cmake` from `doc/developer-notes.md` still stops at the first failing test (`COMMAND_ERROR_IS_FATAL ANY` in `cmake/script/Coverage.cmake`), so use the measured recipe.

**Sources.** #578; commit `7051507b` on `release-0.34.16`; `git merge-base --is-ancestor 7051507b origin/main` (false); hub: `04-build-and-test.md` §5, `01-state.md` (coverage row), [lesson 2026-11-12-coverage-fresh-build-dir](../lessons/2026-11-12-coverage-fresh-build-dir.md).

**Wrong answers.** "Yes, it was fixed on 12 Nov" without the branch. Quoting 65.8% / 69.9% as the real coverage without saying they are floors. Quoting the numbers without the commit they were measured on.

## Q3. One state file, one fix

**Verdict.** No single-site pull request. This is class K01 (non-atomic or short state-file write), a registered class. Count every site on the live head with a command you paste into the PR, then send one sweep: every site moved onto the shared atomic-write helper, plus the rule that keeps the class at zero (a lint against raw `ofstream` writes to data-directory paths, and truncated-file load tests). If the C-K01 lane already holds the sweep, add your site to its worklist on the board instead.

**Why.** Five K01 fixes, each scoped to one module, landed on the release line on 12 Nov alone: #565, #570, #572, #576 and #577. The plan counts 22 K01 pull requests since 1 August (`plan/MASTER-PLAN.md` §1.4). At `4c7840e9` the file-level rule still finds 12 files with a raw write and no atomic primitive. #576 added the shared helper `WriteBinaryFileAtomically` in `src/util/readwritefile.{h,cpp}` (temporary file, checked write and close, rename; no fsync yet, which the sweep adds). One more single-site PR keeps the drip going; the sweep and the lint end it.

**Sources.** #565, #570, #572, #576, #577; `git grep -n WriteBinaryFileAtomically origin/release-0.34.16 -- src/util`; hub: `05-bug-classes.md` (K01 row), `06-pr-gate.md` (the eight questions, 1 to 4), `07-lanes.md` (C-K01), `plan/MASTER-PLAN.md` §2 row 2, `AGENTS.md` rule 2.

**Wrong answers.** "Yes, it is a real bug with a test." "Fix it and mention the other sites in the PR text."

## Q4. The fifth passphrase PR

**Verdict.** File the rule, not a fifth instance: one test that runs every wallet RPC against a locked wallet and expects the passphrase request (`RPC_WALLET_UNLOCK_NEEDED`, -13) before coin selection or key derivation, never a later misleading error. Your RPC is fixed in that same PR, together with any other RPC the test flags. Class K05 (wallet-locked / passphrase ordering), lane A-WALLET.

**Why.** #456 (opened 8 Nov) dropped PQ seeds and cached PQ secret keys on lock. #475 (9 Nov, "follow-ups to #456"), #488 (10 Nov) and #523 (11 Nov, "follow-up to #475") then made the funding RPCs that failed on a locked wallet ask for the passphrase, a few at a time. All four landed on `release-0.34.16` (by cherry-pick; see the `git log` line at the top). One test over the whole RPC table would have found every site the first time.

**Sources.** #456, #475, #488, #523; `src/wallet/rpc/util.cpp` (`EnsureWalletIsUnlocked`) and `src/rpc/protocol.h` (`RPC_WALLET_UNLOCK_NEEDED = -13`) at `4c7840e9`; hub: `05-bug-classes.md` (K05 row), `07-lanes.md` (A-WALLET), `plan/MASTER-PLAN.md` §0 item 2 and §2 row 5.

**Wrong answers.** "A fifth PR, follow-up to #523." "Ask the maintainer whether a fifth is welcome."

## Q5. A stalled functional test on the coverage build

**Verdict.** Reject the change. Report the test as the known "ExactReplay required" stall class, with the stall grep, and compare it on the base commit with the same build. Do not change test arguments to a non-default validation mode to make it pass.

**Why.** In the coverage run at `c6f9678d`, 48 of the 82 functional failures stalled with "ExactReplay required" on the slow coverage build. 41 of them pass when every node runs `-matmulvalidation=economic`, but that is a diagnostic only: the default is `consensus`, and economic mode is not allowed on mainnet (`-matmulvalidation` help text in `src/init.cpp` at `4c7840e9`). A test switched to it no longer tests what nodes run, and the class stays hidden. The message comes from validation code, which is in the frozen set for the release line, so a code change there is evidence for E-CONSENSUS, not a PR. The class has to be settled as a whole before a functional gate can use it (a known-failing list that may only shrink).

**Sources.** Hub: `04-build-and-test.md` §4 ("Known state" and the stall check), `02-method.md` rule 9 ("Known-state first"), `AGENTS.md` rule 4 (no fail-closed workarounds, no skipped tests, no widened timeouts); `plan/MASTER-PLAN.md` §1.1 (ExactReplay stall class); `src/init.cpp` `-matmulvalidation` help at `4c7840e9`.

**Grading note.** Accept a mention of the `MATMUL_OFF` regtest argument pattern (`test/functional/rpc_bounty_secret_ref_wallet_restriction.py`) only for a test whose subject has nothing to do with MatMul, argued in the PR; never as a way to silence a stall.

## Q6. A coverage gain

**Verdict.** Not as stated. The two runs measured different suite sets, so the 1.6 points cannot be credited to the PR: part of the gain, possibly most of it, comes from suites that finished this time and wrote data. State the number with its suite set: which suites and scripts ran, which finished, the timeout, the commit, and that counters were cleared first. Compare base and head with the same build, the same suite set and the same timeout, and report the change for the files the PR touches.

**Why.** Every coverage figure is a floor: a test that is killed or times out writes no `.gcda` data. At `c6f9678d`, 47 unit suites timed out at 3,600 s each, so a run in which some of them finish adds lines that were always tested but never counted (for example, `peerman_tests` timed out, so the unit-only figure for `net_processing.cpp` understates it). The ratchet compares like with like: same suite set, per area, against the baseline at its commit.

**Sources.** Hub: `04-build-and-test.md` §5 (pitfall "A killed test writes no data"; `find build-cov -name '*.gcda' -delete` before every measured run), `01-state.md` (coverage row: "all floors"), `02-method.md` rule 2 (every number carries its source and commit); `plan/MASTER-PLAN.md` §1.1.

**Wrong answers.** "Yes, +1.6 points." "Yes, but round it down."

## Q7. The committer line

**Verdict.** Do not push. The commits were made or replayed (`git commit`, `git am`, `cherry-pick` or `rebase`) in a clone with no repo-local identity, so git took the committer from the global config or from the system user and machine name. Set the repo-local identity to your handle and no-reply address, re-create the commits so the committer is replaced, check both columns again, then push.

```bash
git config user.name  "<your GitHub handle>"
git config user.email "<id>+<handle>@users.noreply.github.com"
TZ=UTC git rebase -f "$(git merge-base HEAD origin/release-0.34.16)"   # same base; re-creates every commit, keeps each author
git log --format='%h | %an <%ae> %ad | %cn <%ce> %cd' origin/release-0.34.16..HEAD
```

`git rebase -f` keeps the author of each commit and takes the committer from the current config (tested 12 Nov, git 2.50 on macOS: committer `someone <someone@machine.local>` became the configured handle and no-reply address; author unchanged). It also keeps each author date with its original UTC offset; if `%ad` shows an offset you do not want public, add `--reset-author-date` to the same command, which sets the author date to now, in UTC under `TZ=UTC` (tested the same way). If the commits were already pushed somewhere public, treat what leaked as public: a commit stays reachable by its SHA after a force-push.

**Why.** A machine name or real name in a committer line identifies a person and a machine. Checking only the author misses it, because those commands rewrite the committer, not the author.

**Sources.** Hub: `03-guardrails.md` (identity hygiene: author and committer checked before every push), `AGENTS.md` rule 10 (handles only; no real names, hostnames or home paths).

**Wrong answers.** "The author is right, so it is fine." "Fix it in the next PR."

## Q8. Slower on a Mac

**Verdict.** Not a regression yet. First measure on the reference platform: a Linux build of the base commit and the head with the same flags, the same suite, several runs each. Rule out the known macOS confounders (Metal on or off, another `btxd` using the GPU, thread pools sized from every host CPU, `OMP_NUM_THREADS` unset, a Debug build compared with RelWithDebInfo). If Linux shows no change, report a labelled macOS-only observation with both commits and the numbers. If Linux shows it too, file with both platforms' numbers.

**Why.** Platform-sensitive claims are measured on the reference platform (Linux; a real GPU for CUDA) before anything is called a regression, and a macOS-only or container-only number is labelled as such. Test thread pools take their size from `std::thread::hardware_concurrency()` and libgomp uses every CPU unless told otherwise, which changes timings by platform and machine.

**Sources.** Hub: `02-method.md` rule 4 ("Measure platform-sensitive claims on the reference platform"), `04-build-and-test.md` §2.2 (Metal; build and test with `-j2` while another `btxd` uses the GPU) and §3 (thread oversubscription, `OMP_NUM_THREADS`), `AGENTS.md` rule 6.

**Wrong answers.** "Open the issue with the Mac numbers." "Bisect on the Mac and file the commit."

## Q9. Re-filing under a new title

**Verdict.** Do not re-file it, under any title. Once the maintainer has closed a change as out of scope, it becomes an evidence item for E-CONSENSUS (noted on #464 in the weekly batch) or it is dropped; the board card says which.

**Why.** This is class K13 (MatMul attestation and frontier state), which the release line does not take. The public record shows the sequence. On 3 Nov the maintainer closed #318, #320, #323 and #325, keeping them out of the 0.35 branches in that form, and asked for a new pull request that stands on its own. They came back as one pull request, #484 ("This is #318, #320, #323 and #325 in one pull request", from its body). On 11 Nov #484 was closed with the note that it changes validation, what a signer is told to attest, or MatMul frontier state, so it is not in `release-0.34.16`. The same day, on #464, the maintainer (numair) noted that #314 and #317 came back as #463 and #461 and were not taken, and that the frontier half of #308 did not land; that half had come back as #479, also closed on 11 Nov. The 11 Nov notes are the decision for this release line. A new title, or a bundle with other fixes, does not change what the diff does.

**Sources.** #318 or #320 (closing note, 3 Nov); #484 (body; closed 11 Nov); #464 (11 Nov); #461, #463, #479 (closed 11 Nov); hub: `02-method.md` rule 11 ("Refused once, never re-filed"), `07-lanes.md` (escalation: a PR closed without being taken is never re-filed), `05-bug-classes.md` (K13 row), `plan/MASTER-PLAN.md` §0 item 3.

**Wrong answers.** "Re-file with a better description." "Re-file against another branch to get around the scope."

## Q10. "Tests pass."

**Verdict.** Not ready; the second pass sends it back. The body needs the PR template from `06-pr-gate.md`: Problem (with `file:line` at a named commit), Class (with the site-count command and its result), Cause, Fix (every site plus the rule), **Tested on** (OS and version, architecture, compiler and version, cmake flags, exact commands, the test failing on the base `<sha8>` with one line of output and passing on the branch `<sha8>`, the fork CI run link or "not yet"), **Not tested**, and Base (the full SHA).

**Why.** "Tests pass" with no commit, platform or command cannot be re-run by anyone, so it is a claim, not a result. Fails-before / passes-after with SHAs and a "Not tested" section are what make a fix reviewable and mergeable; a runner who cannot reproduce the stated test holds the PR until the owner investigates.

**Sources.** Hub: `06-pr-gate.md` (the PR template; the tested-on block), `02-method.md` rule 6 ("Tested-on block in every PR body"), `AGENTS.md` rules 4 and 5.

**Wrong answers.** "Approve, CI will catch it" (upstream runs no hosted CI for the node software: `.github/workflows/README.md`; the only workflow files on `release-0.34.16` are for the Atlas app, `atlas-*.yml` and `release-atlas-binaries.yml`). "Ask for a screenshot."

## Q11. A fuzz crash in a peer message parser

**Verdict.** Treat it as security-relevant and report it privately: GitHub private vulnerability reporting on `btxchain/btx`, with the input and the reproduction, and nothing public with any detail (no issue, no PR, no board card, no chat post, no input file, no stack, no function or message name). On the registry it shows up only as its class (K09, unvalidated or unbounded input from peers) without the detail. Any fix follows the maintainer's handling of the report.

**Why.** A crash reachable from a peer message can take nodes down, and a public reproducer hands that to anyone. Before reporting, confirm what the question already gives: it reproduces from the saved input with the same `FUZZ=` target on the live head, and it is in product code, not in the harness (a harness crash is a harness bug and is said so).

**Sources.** Hub: `03-guardrails.md` (security-relevant findings go to private vulnerability reporting, never public), `06-pr-gate.md` (eight questions, question 7), `05-bug-classes.md` (K09 row), `04-build-and-test.md` §7 (a crash is a lead until it reproduces; harness or product), `07-lanes.md` (escalation).

**Wrong answers.** "Open a PR with the fix and the regression input." "Post the stack in the group so people can check their nodes."

## Q12. A Linux-only guard

**Verdict.** No. Do the real macOS implementation. A guard that compiles the feature out, or reports it as unsupported and fails closed, is rejected.

**Why.** This exact case is public. On #245 (22 Oct) a macOS build report found nine "use of undeclared identifier" errors from Linux namespace and mount APIs in two new confinement files and suggested an `#ifdef __linux__` guard with confinement reported as unsupported, or a Linux-only build of the two files. The maintainer (numair) rejected both options the same day: either way a macOS node with ModelNet would be unbuilt or would run without the confinement those files exist to provide, and the identifiers need "a real macOS path, not a stub". The macOS path then came as #246 (a Seatbelt sandbox plus resource limits, with macOS tests), which was merged on 24 Oct.

**Sources.** #245 (22 Oct, the maintainer's reply to the macOS build report); #246 (merged 24 Oct); hub: `06-pr-gate.md` ("Would the maintainer reject this?"), `02-method.md` rule 12, `AGENTS.md` rule 4.

**Wrong answers.** "Guard it; fail closed is safe." "Leave macOS to someone with a Mac and ship the guard for now."

---

## Where each key comes from

| Q | Public sources (verified 12 Nov 2026 against the GitHub record and the tree) | Hub pages |
|---|---|---|
| 1 | #464 (11 Nov); #461, #462, #463, #479, #484, #515 (closed 11 Nov) | 06, 07, AGENTS |
| 2 | #578, `7051507b`; `CMakeLists.txt` at `476f3f23` | 04 §5, 01 |
| 3 | #565, #570, #572, #576, #577; `src/util/readwritefile.h` at `4c7840e9` | 05, 06, 07 |
| 4 | #456, #475, #488, #523 | 05, 07 |
| 5 | `src/init.cpp` (`-matmulvalidation` help) at `4c7840e9` | 04 §4, 02 |
| 6 | (measurement facts only) | 04 §5, 01, 02 |
| 7 | (none needed; `git rebase -f` behaviour tested) | 03, AGENTS |
| 8 | (none needed) | 02, 04 §2.2, §3 |
| 9 | #318, #320, #323, #325 (closed 3 Nov) → #484 (closed 11 Nov); #464 (11 Nov); #461, #463, #479 | 02, 05, 07 |
| 10 | `.github/workflows/README.md` at `4c7840e9` (no hosted CI for the node software) | 06, 02, AGENTS |
| 11 | (none: a constructed case; it describes no real finding, by design) | 03, 05, 06, 04 §7 |
| 12 | #245 (22 Oct); #246 (merged 24 Oct) | 06, 02, AGENTS |
