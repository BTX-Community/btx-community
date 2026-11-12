# The working method

> Last verified: 2026-11-12 · against: btxchain/btx release-0.34.16 @ 4c7840e9 · owner role: hub editor

**Kurzfassung (DE).** Zwölf Regeln, damit Beiträge zu `btxchain/btx` so ankommen, dass der
Maintainer sie übernehmen kann. Erst entwerfen, dann den Entwurf für falsch halten und jede Aussage
an der Primärquelle prüfen, erst danach veröffentlichen. Ergebnisse einer KI sind Hinweise, bis ein
selbst ausgeführter Befehl sie bestätigt. Behoben werden Fehlerklassen statt einzelner Stellen; jeder PR
wird mit Plattform, Befehlen und Commits belegt und vorher von einer zweiten Person geprüft.

This page is how contributors work on `btxchain/btx` so that the maintainer can merge the result.
It applies to people and to the AI tools they use; [`AGENTS.md`](AGENTS.md) points every agent
here. Each rule says what to do, how to do it, and where it comes from. Sources are files in this
hub or public pull requests and comments on `btxchain/btx`, cited as "#464, 11 Nov".

Labels used on this page: [read] = taken from a source; [tested] = a command was run;
[inferred] = judgement.

## Why a method

Most contributor pull requests are tested and get merged. The cost is volume: the same kind of
fix arrives one site at a time.

- Since 1 Aug there have been 360 PRs to `btxchain/btx`, 317 of them fixes. After the 12 Nov
  batch, 283 of the 317 had landed (89%) [read: [`plan/MASTER-PLAN.md`](plan/MASTER-PLAN.md) §0
  item 1].
- The same class keeps turning up in a new place: Windows portability, 33 PRs over 44 files;
  non-atomic state writes, 22 PRs in about 10 modules in 14 days, then 5 more on 12 Nov; the
  passphrase chain #456 → #475 → #488 → #523 in 4 days [read: plan §0 item 2].
- The same file keeps being touched: in download scheduling, 16 of 17 later PRs re-touch a file
  an earlier PR of the class had changed [read: plan §0 item 3].

The method below turns "one fix at a time" into "one PR per class, tested, reviewed, sent in a
batch". It is also what makes a PR easy to merge.

## The rules at a glance

| # | Rule | Source |
|---|---|---|
| 1 | Generate, challenge, verify, then publish | plan §3 (opening paragraph); [`packs/C-STATIC.md`](packs/C-STATIC.md) |
| 2 | Labels on every claim; every number carries its source and commit | plan header ("Labels"); `AGENTS.md` rule 7 |
| 3 | AI output is a lead until a command you ran reproduces it | `AGENTS.md` rule 6; [`04-build-and-test.md`](04-build-and-test.md) §7; plan, Verification notes |
| 4 | Measure platform-sensitive claims on the reference platform | plan §4.1, §4.2; `04-build-and-test.md` §3, §5 |
| 5 | Classes, not instances | plan §0 item 9, §2 rules (a)-(c); [`05-bug-classes.md`](05-bug-classes.md) |
| 6 | A tested-on block in every PR body | [`06-pr-gate.md`](06-pr-gate.md) (the PR template) |
| 7 | Byte-identical texts: what was reviewed is what gets posted | this hub, stated as a rule |
| 8 | A second pass by a human who is not you; batches, not drips | [`07-lanes.md`](07-lanes.md) (weekly rhythm; how a finding moves) |
| 9 | Known state first | `04-build-and-test.md` §3-§4 |
| 10 | Hot files take no per-event PR | `07-lanes.md` (the board and the registry) |
| 11 | Refused once, never re-filed (exception: a maintainer comment asks for a new PR) | `07-lanes.md` (escalation); #245, 3 Nov; #464, 11 Nov |
| 12 | Would the maintainer reject this? Default yes | `06-pr-gate.md`; upstream `AGENTS.md` at `4c7840e9`; #245, 22 Oct |

## 1. Generate, challenge, verify, then publish

**Rule.** Write the draft. Then run a second pass that assumes the draft is wrong: list every
claim and what would have to be true for it to hold. Then check each claim against a primary
source. Only then write the post, the PR body or the comment.

**How.**
- Primary sources, strongest first: the tree at a named commit (`git show <sha>:<path>`,
  `git log`, `git grep <sha>`); the output of a command you ran; a public PR, issue or comment on
  `btxchain/btx`. A hub page, a chat message, a summary or an AI answer is a lead that points at
  a primary source; it is not one.
- In an AI session, make the challenge a separate step. A prompt that works:
  "List every claim in this draft. For each, say how it could be wrong and which file at which
  commit, or which command, settles it." Then run those commands yourself.
- Default verdict of the challenge pass: refuted. A claim survives only when the source says so.

**Source.** [`plan/MASTER-PLAN.md`](plan/MASTER-PLAN.md) §3: the method with the best yield
since August is a named invariant, one reader, one small test and a skeptic who assumes the claim
is wrong. The C-STATIC lane says the same: assume every result is wrong until the code says
otherwise ([`packs/C-STATIC.md`](packs/C-STATIC.md); the one-line brief in
[`07-lanes.md`](07-lanes.md) §8).

## 2. Labels on every claim

**Rule.** Mark claims [read], [tested] or [inferred]. Every number carries its source and the
commit it was measured on.

**How.**
- Good: "65.8% of product lines with unit tests only, at `c6f9678d`, 2,625 ctest entries with
  47 timed out at 3,600 s, counters cleared before the run [tested; plan §1.1]".
- Bad: "coverage is about 66%".
- Never put two numbers side by side that were measured on different commits, builds, suite sets
  or platforms without saying so. A coverage figure is only comparable with one taken on the same
  build, the same suite set and the same timeout (exam question 6).

**Source.** The plan header defines the labels; `AGENTS.md` rule 7: every number carries its
source.

## 3. AI output is a lead until a command you ran reproduces it

**Rule.** An AI answer, a static-analysis result, a sanitizer report, a fuzz crash and a coverage
delta are all leads. A lead becomes a finding only when a command you ran reproduces it on the live
head.

**How.**
- Reproduce on the live head: `git fetch origin && git log -1 --format=%h origin/release-0.34.16`,
  then the command. Paste both into your notes.
- A fuzz crash is a lead until it reproduces from the saved input with the same `FUZZ=` target.
  A crash in a harness, not in product code, is a harness bug; say which
  ([`04-build-and-test.md`](04-build-and-test.md) §7).
- First counts are often wrong. Two public examples: the K01 worklist was first counted at 16
  files; reading showed 2 were already atomic, and #576 and #577 fixed 2 more, so it is 12. K10
  was first 4 candidates; three were `also_string` rows the first parser missed, so it is 1
  [read: plan, Verification notes]. Recount by reading, not only by grep.
- If you cannot reproduce it, say so, and park or drop it.

**Source.** `AGENTS.md` rule 6; `04-build-and-test.md` §7; plan, Verification notes.

## 4. Measure platform-sensitive claims on the reference platform

**Rule.** Before you call anything a regression, measure it on the reference platform: Linux
x86_64 for unit, functional and coverage runs; a real NVIDIA GPU for CUDA; real Apple hardware for
Metal. Label a macOS-only, container-only or coverage-build number as such.

**How.**
- Same test, same build type and flags, base commit and head, several runs each.
- Know the confounders. Test thread pools take their size from
  `std::thread::hardware_concurrency()`, and libgomp uses every host CPU unless
  `OMP_NUM_THREADS` is set; in a container both see the host, not your quota. On a 128-thread box,
  100 suites in parallel drove the load to about 2,000 until both were capped
  ([`04-build-and-test.md`](04-build-and-test.md) §3).
- Coverage builds are slow: under coverage the stage3 suites run about ten times slower on 2
  OpenMP threads (`04-build-and-test.md` §5). A timing taken there says nothing about a release
  build.
- On a Mac, three more confounders: Metal on or off (it is ON by default on Apple,
  `04-build-and-test.md` §2.2), another `btxd` using the GPU at the same time, and a Debug build
  compared with a RelWithDebInfo one.
- Decision rule: Linux shows no change, base vs head: report a labelled macOS-only observation
  with both commits and the numbers, not a regression. Linux shows it too: file it with both
  platforms' numbers (exam question 8).

**Source.** plan §4.1 (the box timings) and §4.2 (the thread shim in job 1);
`04-build-and-test.md` §3 and §5.

## 5. Classes, not instances

**Rule.** Name the class. Count every site on the live head with a command you paste into the PR.
Fix every site, and add the rule (a unit test, a lint or a CI job) that keeps the class at zero.
Fewer than three real sites: file the rule alone; it fixes the sites it flags.

**How.**
- Look the class up in [`05-bug-classes.md`](05-bug-classes.md). If it is swept (its rule is in
  the tree), a new site is a gate failure: extend the rule, do not send an instance fix.
- The count command goes into the PR's "Class" section with its output. The K01 command in
  `05-bug-classes.md` is the pattern: it prints the 12-file worklist at `4c7840e9` [tested].
- No sweep touches validation, fork choice, attestation rules or the MatMul frontier; hits there
  go to the evidence list ([`06-pr-gate.md`](06-pr-gate.md) §2).

**Source.** plan §0 item 9 and §2 rules (a)-(c); `05-bug-classes.md`.

## 6. A tested-on block in every PR body

**Rule.** Every PR body says where and how it was tested: OS and version, architecture, compiler
and version, cmake flags, the exact commands, the test failing on the base commit and passing on
the branch (both SHAs, one line of output), the fork CI run link or "not yet", and a "Not tested"
section.

**How.** Use the template in [`06-pr-gate.md`](06-pr-gate.md) §3. "Tests pass" with no commit,
platform or command is a claim, not a result (exam question 10).

**Source.** `06-pr-gate.md` (the PR template).

## 7. Byte-identical texts

**Rule.** What was reviewed is what gets posted. The second pass approves a file; the post is that
file; after posting, the live text is compared with the file.

**How.**

```bash
# the PR body lives in a file; the second pass approves this exact hash
shasum -a 256 pr-body.md

# after posting: fetch the live body (anonymous API call) and compare
curl -fsS https://api.github.com/repos/btxchain/btx/pulls/<number> \
  | python3 -I -c 'import json,sys; print(json.load(sys.stdin)["body"])' > posted.md
diff --strip-trailing-cr pr-body.md posted.md && echo SAME
```

- For a comment, fetch `https://api.github.com/repos/btxchain/btx/issues/comments/<comment-id>`
  the same way. Anonymous API calls are limited to 60 per hour per IP address.
- Edit the file, never the posted text. A change after the second pass goes back to the second
  pass.
- Copy and paste can alter text (quotes, dashes, non-ASCII characters). The diff catches it.

**Source.** This hub, stated as a rule from practice.

## 8. A second pass by a human who is not you; batches, not drips

**Rule.** Before anything goes upstream, a person who is not the author reads the full text and
the full diff, and re-runs what the PR says was run where that matters. Owner and second pass are
never the same person; a run is re-checked on a different machine, never the same one. Upstream PRs
go out together in the weekly batch, not one by one.

**How.**
- Push to your own fork so the second pass can read the branch; open the upstream PR only after
  the second pass says "ok".
- No PR outside the batch unless a gate is red ([`06-pr-gate.md`](06-pr-gate.md) §4).
- Your first upstream PR goes through a lane owner's second pass.

**Source.** [`07-lanes.md`](07-lanes.md): the weekly rhythm and "how a finding moves".

## 9. Known state first

**Rule.** A red test is news only if it is green on the base commit with the same build. A
timeout is rerun alone before it is called a failure. A timeout is never raised in a PR.

**How.**

```bash
# the same test on the base commit, same flags, separate worktree
git worktree add ../base <base-sha8>
cmake -S ../base -B ../base/build <the same cmake flags>
cmake --build ../base/build -j"$(nproc)"          # macOS: -j"$(sysctl -n hw.ncpu)"
ctest --test-dir ../base/build -R '^<suite>$' --output-on-failure

# a timeout: rerun it alone with a long limit before you call it a failure
ctest --test-dir build -R '^<suite>$' --timeout 3600 --output-on-failure
```

Known state at `c6f9678d` [read: plan §1.1 and §8, from the 12 Nov coverage and TSan runs]:
- Unit tests under coverage: 2,575 passed, 47 timed out, 2 failed, 1 skipped.
- Functional tests on the coverage build: 82 of 208 scripts failed, 48 of them stalled with
  "ExactReplay required". On a plain gcc build, 51 of 200 failed.

Show both runs, base and branch, in the PR.

**Source.** `04-build-and-test.md` §3-§4.

## 10. Hot files take no per-event PR

**Rule.** `net_processing.cpp`, `modelnet/helper.cpp` and `node/matmul_trusted_attestations.*`
take no per-event PR without a model-based test or a split proposal first.

**Why.** Download scheduling (K14): 19 PRs plus 145 maintainer commits, and 16 of the 17 later
PRs re-touched a file an earlier PR had changed [read: plan §0 item 3]. `modelnet/helper.cpp` was
touched by 42 fix PRs [read: `07-lanes.md`, A-STORES]; 12 of the 31 commits after the measurement
touch it again, one fix each [tested:
`git log --oneline c6f9678d..4c7840e9 -- src/modelnet/helper.cpp | wc -l` prints 12; plan §1.6].
Fork choice and download scheduling in `net_processing.cpp`, and the attestation rules, are also in
the release line's frozen set ([`06-pr-gate.md`](06-pr-gate.md) §2).

**Source.** `07-lanes.md` (the board and the registry: hot files).

## 11. Refused once, never re-filed

**Rule.** A change the maintainer closed without taking it is not filed again under a new title or
number, alone or folded into another PR. It becomes an evidence item or it is dropped, and the
board card says which. The one exception: a public maintainer comment asks for a new pull request.
Then file exactly what that comment asks for, standalone, and cite the comment in the PR body.

**Why.** The public record:
- On 3 Nov the maintainer (numair) closed a group of PRs that change validation, fork choice,
  issuance, MatMul acceptance or the signer set, and said each needs a new pull request that
  stands on its own (#245, 3 Nov).
- Several came back on `release-0.34.16`: #314 and #317 as #463 and #461, the frontier half of
  #308 as #479, and #318, #320, #323 and #325 folded into one PR, #484. All were closed on 11 Nov
  because the release line takes no such change (#464, 11 Nov; the closing notes on #461, #463,
  #479 and #484). A new number did not change the scope answer.
- The same #464 comment named five items that are not consensus rules (#309, #313, #333, #363,
  #382) and said a new standalone pull request is the way to bring one in. They came back that way
  and landed on 12 Nov as #579-#583 [tested: commit subjects in `git log c6f9678d..4c7840e9`].
- Attestation and frontier state (K13): 15 PRs, 11 not taken, 4 re-filed under the same title
  [read: plan §0 item 3].

**Source.** `07-lanes.md` (escalation); #245, 3 Nov; #464, 11 Nov; #484, 11 Nov.

## 12. Would the maintainer reject this? Default yes

**Rule.** Assume the answer is yes until the PR shows why not.

**Check.**
- No stub, placeholder or "unsupported" return where a real implementation is expected.
- No fail-closed workaround that skips the feature.
- No skipped or disabled test, no widened timeout, no non-default flag to make a test green.
- The invariants from upstream `AGENTS.md` that the change touches are named in the PR: the three
  planes (monetary, model, hosted) never mix; `btx-modeld` never holds wallet secrets;
  `prepare` / `approve` / `sign` / `submit` stay distinct steps [read: `git show 4c7840e9:AGENTS.md`].

**Public evidence.** On #245 (22 Oct) a macOS build report suggested guarding Linux namespace and
mount calls with `#ifdef __linux__` and reporting confinement as unsupported, or building the two
confinement files on Linux only. The maintainer (numair) rejected both options the same day and
asked for the macOS work. The macOS implementation came as #246 and was merged (#245, 24 Oct).

**Source.** [`06-pr-gate.md`](06-pr-gate.md) §5; upstream `AGENTS.md` at `4c7840e9`; #245,
22 Oct and 24 Oct.

## How the rules fit together

```
found -> lead (rule 3) -> class check against 05 (rule 5)
      -> frozen set? -> evidence item (06 §2), stop
      -> security-relevant? -> private report (03 §8), stop
      -> count on the live head, base vs branch (rules 5, 9)
      -> sweep every site + the rule, tested on the reference platform (rules 4, 6)
      -> challenge pass, sources checked (rules 1, 2)
      -> second pass by another person, then the weekly batch (rules 8, 12)
      -> posted text = approved file (rule 7)
```

The never list is [`03-guardrails.md`](03-guardrails.md). When this page is wrong or missing
something, file a lesson ([`lessons/README.md`](lessons/README.md)); the page owner folds it in.
