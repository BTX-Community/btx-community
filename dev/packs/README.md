# Lane packs: one brief per lane, for you and your AI

> Last verified: 2026-11-12 · against: btxchain/btx release-0.34.16 @ 4c7840e9 · owner role: hub editor

A pack is the brief for one lane. You give your AI tool (Claude Code, Cursor, Codex, ChatGPT or any other) two files: [`../AGENTS.md`](../AGENTS.md) and the pack for your lane. Runners give their AI one file only: [`I-RC-runner.md`](I-RC-runner.md), which is complete on its own. Every pack ends with a prompt block that you paste into your AI.

The AI drafts and runs commands. The person who owns the lane reads every diff and every text and signs every post. No AI posts, pushes, comments or opens a pull request.

## How to use a pack

1. Read the lane in [`../07-lanes.md`](../07-lanes.md). Claim it there first (below), or ask its owner on the board whether you can help.
2. Give your AI `../AGENTS.md` and the pack. The easiest way: clone this repository and point the AI at the two files. Or paste the raw URLs, for example `https://raw.githubusercontent.com/BTX-Community/btx-community/main/dev/packs/C-K01.md`.
3. Paste the prompt block at the end of the pack. It names the first task. Answer the first-run questions from `../AGENTS.md` (level, machine, hours, spend cap, what is off limits on this machine).
4. Read everything the AI produces. Run the second pass with someone who is not you. Then post, yourself, in the weekly batch (see `../07-lanes.md`).

Each pack has the same parts: roles, scope, current numbers with sources, done bar, what to read in `dev/` first, the first three tasks, what goes on the board, what the second pass checks, STOP conditions, and the prompt block. The packs do not repeat the build recipes, the PR template or the guardrails. Those live in one place each:

| Topic | Canonical page |
|---|---|
| The method (generate, challenge, verify; labels; leads) | [`../02-method.md`](../02-method.md) |
| The never list, git identity, secrets, spend caps, node safety, where security findings go | [`../03-guardrails.md`](../03-guardrails.md) |
| Build on Linux, macOS, Windows, WSL2; unit, functional, coverage, sanitizers, fuzz | [`../04-build-and-test.md`](../04-build-and-test.md) |
| The bug-class registry (K01, K05, ...) | [`../05-bug-classes.md`](../05-bug-classes.md) |
| The eight questions before you file, the release-line scope, the evidence-item shape, the PR template | [`../06-pr-gate.md`](../06-pr-gate.md) |
| Lanes, claimable owners, the board, the weekly rhythm | [`../07-lanes.md`](../07-lanes.md) |

## The packs

Owner and second pass are empty on purpose: they are claimable. The second pass is never the owner.

| Pack | Lane | Kind | Route | Level | Owner | Second pass |
|---|---|---|---|---|---|---|
| [`A-WALLET.md`](A-WALLET.md) | wallet, RPC authorization, secrets | area | PR | Advanced | (claimable) | (claimable) |
| [`A-STORES.md`](A-STORES.md) | ModelNet stores, BCP/1 deposits, persistence | area | PR | Advanced | (claimable) | (claimable) |
| [`E-CONSENSUS.md`](E-CONSENSUS.md) | consensus, fork choice, attestation, MatMul frontier | area | EVIDENCE | Advanced | (claimable) | (claimable) |
| [`C-K01.md`](C-K01.md) | non-atomic or short state-file writes | class | PR | Advanced | (claimable) | (claimable) |
| [`C-PORT.md`](C-PORT.md) | Windows, macOS, build and packaging, resource lifecycle | class | PR | Advanced | (claimable) | (claimable) |
| [`C-PATHS.md`](C-PATHS.md) | paths, symlinks, jail, options honoured | class | PR | Advanced | (claimable) | (claimable) |
| [`C-STATIC.md`](C-STATIC.md) | machine-rule sweeps from the static and dynamic baselines | class | PR | Advanced | (claimable) | (claimable) |
| [`I-CI.md`](I-CI.md) | the fork CI gates | infra | fork branch | Core | (claimable) | (claimable) |
| [`I-RC.md`](I-RC.md) | release-candidate qualification (the lane owner's pack) | infra | RUN | Core | (claimable) | (claimable) |
| [`I-RC-runner.md`](I-RC-runner.md) | release-candidate runner: Linux, NVIDIA GPU, native Windows, Windows 11 + WSL2 | infra | RUN | Basic | any number of runners | another runner on other hardware |
| [`I-OPS.md`](I-OPS.md) | operators and whole-system runs | infra | RUN | Core | (claimable) | (claimable) |
| [`I-XDEV.md`](I-XDEV.md) | MatMul cross-backend runs (CPU, CUDA, Metal) | infra | RUN | Core | (claimable) | (claimable) |

Routes: **PR** = a pull request to `release-0.34.16` in the weekly batch. **EVIDENCE** = one measured result, one ready test and one paragraph, never a PR into the release line unless the maintainer asks (shape in `../06-pr-gate.md`). **RUN** = a run line on the board, and in the PR it verifies.

Levels are explained in [`../08-levels.md`](../08-levels.md). New here? Start with `I-RC-runner.md` (one hour, no spend, no wallet on the machine).

**Lanes without a pack.** A-NET, A-HELPER, A-SHIELDED, A-PQ and A-GUI have a scope and a done bar in `../07-lanes.md` but no owner. An unowned lane gets no work. Claim one and a pack in this format follows (template below).

## Claim a lane

Open a pull request to this repository that adds your GitHub handle to the lane's Owner line in `../07-lanes.md` and to its `owner.handle` field in `../plan/lanes.json`. The second pass is claimed the same way. One approving review from a `/dev/` code owner merges it. The board carries the live state of the work; this folder carries the definition.

## Base facts for every pack

| Fact | Value | Source |
|---|---|---|
| Upstream repository | `github.com/btxchain/btx` | |
| Work branch | `release-0.34.16`, head `4c7840e9` on 12 Nov | `git log -1 origin/release-0.34.16` |
| `main` | v0.34.15 at `476f3f23`, what most nodes run | `git log -1 origin/main` |
| Release line ahead of `main` | 1,194 commits | `git rev-list --count 476f3f23..4c7840e9` |
| Measurements (coverage, static, TSan) | taken at `c6f9678d`, 31 commits before `4c7840e9` | `git rev-list --count c6f9678d..4c7840e9` |
| Consensus files changed since the measurement | none: `validation.cpp`, `net_processing.cpp`, `pow.cpp`, `src/consensus/`, `script/interpreter.cpp` are unchanged. The attestation store did change: `4c7840e9` (the attestation blocklist extension, #583) touches `node/matmul_trusted_attestations.*` and `src/matmul/trusted_exact_replay_attestation.*` | `git diff --stat c6f9678d 4c7840e9 -- <those paths>` |
| Release-line scope | changes to validation, fork choice, what a signer is told to attest, or MatMul frontier state stay out of `release-0.34.16`; details and what did land nearby in [`../06-pr-gate.md`](../06-pr-gate.md) §2 | #464, 11 Nov; the closing notes on #461, #462, #463, #479, #484, #515 (11 Nov) |

Re-check the live head before you count, build or post: `git fetch origin && git log -1 --format=%h origin/release-0.34.16`. If it moved, rebase and recount.

**Source tags used in the packs.** [PLAN] = [`../plan/MASTER-PLAN.md`](../plan/MASTER-PLAN.md). [data] = [`../plan/plan-data.json`](../plan/plan-data.json). [lanes] = `../07-lanes.md` and `../plan/lanes.json`. [C1] = the 12 Nov CodeQL and cppcheck run; [C2] = the 12 Nov clang-tidy, TSan and lock-order run; [C3] = the 12 Nov coverage run (recipe in `../04-build-and-test.md` §5). [repo] = a file in the tree at `4c7840e9`. [git] = a git command you can rerun. [read] = taken from a source; [tested] = a command was run; [inferred] = judgement.

## What the packs publish, and what they do not

- Untriaged static-analysis, sanitizer and fuzz results appear as a class name and a count only. No file, line, function or reproduction detail for such a result is published here. The raw result files pass from one lane owner to the next directly, only after the new owner's lane claim is merged, and never through the board.
- File and line pointers appear only for portability and durability sites (build variables, packaging, non-atomic file writes) and for fixes already public in merged pull requests.
- A result that could be security-relevant (a remote crash, fund loss, a key leak, a split between nodes or backends) goes through GitHub private vulnerability reporting on `btxchain/btx`. It never goes to the board, an issue, a pull request or a group chat.

## Reporting formats (every pack uses these)

Post on the board, not in a group chat. The board link is in `../07-lanes.md`. Chat is for questions; the board is the state.

Card text (owners, every Monday and on every change):

```
LANE <id> | owner <handle> | week of <date>
plan: <one line>
class: <Kxx> | status: <not counted / counted / sweep open / rule only / evidence>
sites: <N> on <sha8> (command in the PR)
branch: <fork branch link> | upstream PR: <link or "batch day">
fork run: <link or "local only">
second pass: <handle> <pending / ok / changes asked>
not tested: <...>
```

Run line (runners and run lanes; paste the script output unchanged):

```
RUN | <lane> | <handle or "runner"> | check=<name> | target=<tag or commit> | sha=<sha256 prefix or commit> | os=<OS, version, arch> | hw=<CPU or GPU model> | result=<PASS/FAIL/BLOCKED> | <UTC time> | <one-line note>
```

Anything a run could not do is a BLOCKED line with the reason, never left out.

## Writing a pack for a new lane

Copy the structure of any area or class pack: `# <LANE>: <title>`, the last-verified line, then 1 Roles, 2 Scope, 3 Why: current numbers (every number with its source), 4 Done bar (checkboxes), 5 Read first, 6 First three tasks (each with the exact commands and what the AI writes), 7 Report to the board, 8 Second pass checks, 9 STOP conditions, 10 Prompt for your AI. Use roles, not names. Open it as a pull request with the lane claim.
