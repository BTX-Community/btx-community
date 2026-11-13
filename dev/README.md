# Become a BTX dev

> Last verified: 2026-11-12 · against: btxchain/btx release-0.34.16 @ 4c7840e9 · owner role: hub editor

**Kurzfassung (DE).** Dieser Ordner erklärt Menschen und ihren KI-Werkzeugen, wie man Pull
Requests für die BTX-Node-Software so vorbereitet, dass der Maintainer sie übernehmen kann. Drei
Stufen: nachprüfen (Basic), einen Bereich mit Zweitprüfung übernehmen (Advanced), Prüfläufe
betreiben (Core). Menschen lesen zuerst `01`, `02`, `03`, `06` und `07`; eine KI bekommt `AGENTS.md`.
Der Coverage-Build lässt sich auf `release-0.34.16` seit #578 (12. Nov.) wieder konfigurieren, in v0.34.15 nicht.

This folder is about one thing: how to send pull requests to the BTX node software,
[`btxchain/btx`](https://github.com/btxchain/btx), that the maintainer can merge. It is for
people and for the AI tools they work with: a working method, build and test recipes, the gate
before an upstream pull request, open lanes with a claimable owner column, an exam with known
answers, and a lessons loop.

It is not a fork, not a second project and not a place to argue. The maintainer decides what
lands. The code's own rules are in the upstream
[`AGENTS.md`](https://github.com/btxchain/btx/blob/release-0.34.16/AGENTS.md), and they win
wherever this folder disagrees with them.

> **Coverage is measured again.** The coverage build configures again on `release-0.34.16` since
> [#578](https://github.com/btxchain/btx/pull/578) landed on 12 Nov (commit `7051507b`); v0.34.15 (`main`, `476f3f23`) does not have that fix.
> Measured at `c6f9678d` with the same fix: 65.8% of product lines unit-only, 69.9% unit +
> functional; branches 37.7% / 40.7%. All four numbers are floors: 47 unit suites timed out and 82
> of 208 functional scripts failed in the coverage run, and a killed test writes no counts
> ([`plan/MASTER-PLAN.md`](plan/MASTER-PLAN.md) §1.1). The recipe to reproduce it is in
> [`04-build-and-test.md`](04-build-and-test.md) §5. The numbers change only when a measured run
> is published. The planned ratchet job on contributor forks (lane I-CI, job CI-9) fails any area
> that drops by more than 0.2 points.

## Start by level

| Level | What you do | Start with |
|---|---|---|
| **Basic: verify** | Re-run a PR's stated test at its commit, or check a release archive's SHA-256 and that it starts. Paste one result line. A Linux machine (or WSL2), about an hour of setup, no spend, no wallet on the box. | [`packs/I-RC-runner.md`](packs/I-RC-runner.md), complete on its own |
| **Advanced: team** | Own a lane (a code area or a bug class) with a second-pass partner. Sweep the class, add the rule that keeps it at zero, send tested PRs. | [`AGENTS.md`](AGENTS.md) + your lane's pack |
| **Core: runs** | Run the gates: CI on a fork, release qualification, the weekly batch. | [`AGENTS.md`](AGENTS.md) + [`packs/I-CI.md`](packs/I-CI.md) or [`packs/I-RC.md`](packs/I-RC.md) |

What each level needs, and its first hour in five steps: [`08-levels.md`](08-levels.md).

## What to read first

- **People:** [`01-state.md`](01-state.md) → [`02-method.md`](02-method.md) →
  [`03-guardrails.md`](03-guardrails.md) → [`06-pr-gate.md`](06-pr-gate.md) →
  [`07-lanes.md`](07-lanes.md). Then the pack for your lane.
- **Your AI tool** (Claude Code, Cursor, Codex or another): point it at [`AGENTS.md`](AGENTS.md)
  and let it ask its first-run questions. Its raw URL is
  `https://raw.githubusercontent.com/BTX-Community/btx-community/main/dev/AGENTS.md`.
  [`llms.txt`](llms.txt) lists every file in this folder with its raw URL.

## Map

| Path | What it is for |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Entry file for coding agents: first-run questions, reading order, the ten rules, stop conditions, how it relates to the upstream `AGENTS.md` |
| [`llms.txt`](llms.txt) | Index for AI tools: every file with its raw URL, plus the sources outside this repo |
| [`01-state.md`](01-state.md) | Where the node software stands: branches and heads, release-line scope, coverage, baselines, CI policy, the operator safe profile. Each row with its source and date |
| [`02-method.md`](02-method.md) | The working method: generate, challenge, verify, then publish |
| [`03-guardrails.md`](03-guardrails.md) | The never list: identity hygiene, secrets, spend caps, node safety, where security findings go |
| [`04-build-and-test.md`](04-build-and-test.md) | Build on Linux, macOS, Windows and WSL2; unit and functional tests; coverage; sanitizers; fuzzing; the known state |
| [`05-bug-classes.md`](05-bug-classes.md) | The bug-class registry: each class, the rule that keeps it at zero, its lane, example PRs |
| [`06-pr-gate.md`](06-pr-gate.md) | Before you open an upstream PR: the eight questions, the PR template, the batch rule |
| [`07-lanes.md`](07-lanes.md) | The lanes: scope, done bar, first tasks, a claimable owner and second pass, the weekly rhythm |
| [`08-levels.md`](08-levels.md) | Basic, Advanced, Core: what each needs and its first hour |
| [`exam/`](exam/) | Twelve cases with known answers, drawn from public PRs: questions, and a separate answer key with sources |
| [`lessons/`](lessons/) | Lessons learned: the template, the index, two seed lessons |
| [`packs/`](packs/) | One brief per lane for your AI, each ending in a prompt block |
| [`plan/`](plan/) | The review and test programme measured on the release line, with its numbers and lanes as JSON |
| [`tools/`](tools/) | `refresh-state.sh` prints the head rows for `01-state.md`; `check_stale.py` checks the last-verified lines |

## Claim a lane

1. Pick a lane in [`07-lanes.md`](07-lanes.md). Every lane is claimable. Five have a scope and a
   done bar but no pack yet: A-NET, A-HELPER, A-SHIELDED, A-PQ, A-GUI.
2. Open a pull request that puts your GitHub handle in the lane's Owner line in `07-lanes.md` and
   in that lane's `owner.handle` in [`plan/lanes.json`](plan/lanes.json). A second pass goes in
   `second_pass.handle`. The second pass is never the owner.
3. One approving review from a `/dev/` code owner (`.github/CODEOWNERS`) merges it.
4. Put the lane on the board. This folder holds the definition of a lane; the board holds its
   live state. Board: *link added here by pull request once it is public.*

If git is in your way, the repository's own rule applies
([`CONTRIBUTING.md`](../CONTRIBUTING.md#taking-on-a-lane)): ask, and someone will enter it for you.

## File a lesson

Something in this folder was wrong, missing or cost you an evening? That is a lesson.

1. Copy the template in [`lessons/README.md`](lessons/README.md) to
   `lessons/YYYY-MM-DD-slug.md`.
2. Fill in: what happened, what was done, the rule now, the source, how it was verified (command,
   commit, platform), and which hub pages change.
3. Open a pull request. Your AI may draft it; you open it.
4. One approving review from a `/dev/` code owner merges it. The owner of the affected page folds
   the rule into that page within a week and marks the lesson as folded.

## Add an exam question

A question comes from a public case only: a pull request, an issue or a hub page. Add the
question to [`exam/questions.md`](exam/questions.md) and its key to
[`exam/answers.md`](exam/answers.md) in the same pull request. The key gives the verdict, the
reason and the sources (PR numbers, hub sections). A lesson about a judgement mistake usually
becomes a question.

## Where the live things are

| What | Where |
|---|---|
| This community's site | [btx-community.com](https://btx-community.com) |
| Network status, and its API | [network.btx-monitoring.com](https://network.btx-monitoring.com/), `https://network.btx-monitoring.com/api/v1/status.json` |
| Daily signed datadir snapshots | [github.com/dr-chambre/btx-snapshots](https://github.com/dr-chambre/btx-snapshots) |
| Releases and release notes | [github.com/btxchain/btx/releases](https://github.com/btxchain/btx/releases) |
| Upstream rules for agents and for people | [`AGENTS.md`](https://github.com/btxchain/btx/blob/release-0.34.16/AGENTS.md), [`HUMANS.md`](https://github.com/btxchain/btx/blob/release-0.34.16/HUMANS.md) on `release-0.34.16` |
| The board (live state of the lanes) | *link added by pull request once it is public* |

## Rules of the house

### The ten rules

1. The AI never posts, comments, pushes, opens a PR or sends a message. You do, after reading the
   full text and the full diff.
2. Work in classes. Name the class, count every site on the live head, fix every site and add the
   rule (test, lint or CI job) that keeps the class at zero. No single-site PR for a registered
   class.
3. Validation, fork choice, attestation and the MatMul frontier are out of scope for
   `release-0.34.16`. The maintainer (numair) said so on
   [#464](https://github.com/btxchain/btx/issues/464), 11 Nov, for validation, fork choice and the
   MatMul frontier; the same day #461, #462, #463, #479, #484 and #515 were closed because each
   "changes validation, what a signer is told to attest, or MatMul frontier state". Findings there
   become evidence for the E-CONSENSUS lane, never PRs.
4. Tested fixes only: "fails before, passes after", with commit, platform and exact command. No
   stubs, no fail-closed workarounds, no skipped tests, no widened timeouts.
5. Say what was not tested. Every time.
6. AI output is a lead until a command you ran reproduces it.
7. Every number carries its source.
8. A second pass by a person who is not the author before anything goes upstream. Upstream PRs
   go out together in the weekly batch ([`07-lanes.md`](07-lanes.md)), not one by one.
9. No secrets anywhere: no keys, wallets, RPC cookies or tokens on a test box, in a log, a commit
   or a prompt.
10. Handles only. No private chat content, no real names, hostnames, IP addresses or
    home-directory paths in anything you post.

The same ten rules, addressed to the AI, are in [`AGENTS.md`](AGENTS.md) §4. A change to one is
a change to both, in the same pull request.

### Words

- Contributor, maintainer, release line, the team. This folder describes how contributors work.
  It does not speak for the project; the maintainer decides what lands.
- GitHub comments are cited by issue or PR number and date, like "#464, 11 Nov". Nothing here quotes a
  private chat.
- Output of static analysis, sanitizers and fuzzing is a "result" or a "lead" until a person has
  read the code and reproduced it.
- No money figures of any kind. This folder is about code.

### Security findings

A remote crash, a path to lost funds or exposed keys is not a pull request, an issue, a board card
or a chat post. It goes privately: email `team@btx.dev` per btxchain/btx's
[`SECURITY.md`](https://github.com/btxchain/btx/blob/main/SECURITY.md), or GitHub private
vulnerability reporting on `btxchain/btx` (the repository's Security tab). The
class goes on the registry without the detail
([`03-guardrails.md`](03-guardrails.md) §8).

### Keeping it true

Every page carries a "Last verified" line with the date, the branch and commit it was checked
against, and the role that owns it. To list pages by age, from the repository root:

```bash
python3 -I dev/tools/check_stale.py --warn 30 --fail 90 dev/
```

The head rows in `01-state.md` refresh with `bash dev/tools/refresh-state.sh` (three anonymous
GitHub API calls); it prints rows to paste and never writes the file.

### Licence

Text: [CC BY 4.0](../LICENSE-CONTENT), like the rest of this repository. Code in `tools/`:
[MIT](../LICENSE). Short quotations from `btxchain/btx` stay under that project's own licence.
