# Before you open an upstream pull request

> Last verified: 2026-11-12 · against: btxchain/btx release-0.34.16 @ 4c7840e9 · owner role: hub editor

**Kurzfassung (DE).** Die Prüfliste vor jedem Pull Request an `btxchain/btx`. Die KI beantwortet acht
Fragen schriftlich (Fehlerklasse, eingefrorener Bereich, gezählte Stellen, früher abgelehnt,
sicherheitsrelevant) und übergibt dann an den Menschen. Jeder PR folgt der Vorlage mit „Tested on“ und
„Not tested“ und geht im wöchentlichen Paket hinaus; den ersten PR neuer Mitwirkender prüft vorher die
verantwortliche Person eines Bereichs. Prüffrage vor jedem Post: Würde der Maintainer das ablehnen?

This page is the gate between your branch and `btxchain/btx`. Its purpose is pull requests the
maintainer can merge: tested, documented, one class each, inside the release line's scope.

How it runs:
1. The AI answers the eight questions in §1 in writing.
2. The AI stops there and hands the answers and the checklist in §6 to the person
   ([`AGENTS.md`](AGENTS.md)). The AI never opens the PR.
3. The person decides, gets the second pass, and opens the PR in the weekly batch (§4).

## 1. The eight questions

Answer all eight in writing before any fix is filed. Paste the answers into the PR's "Class"
section, or as a comment block at the top of the body (GitHub hides it in the rendered view; the
maintainer can still read it in the source):

```text
<!-- gate
1 class: <Kxx name, from 05-bug-classes.md>
2 frozen set: <no | yes -> evidence item, stop>
3 swept: <no | yes -> extend the rule>
4 sites: <N> on <sha8>; command in the Class section
5 hot file: <no | yes -> model-based test or split proposal first>
6 closed before: <no; searched closed PRs for "<words>" | yes -> evidence item or drop, unless a maintainer comment asked for a new PR>
7 security-relevant: <no | yes -> private report, stop>
8 stays in its class: <yes | no -> move the extra change to the lane worklist or its own PR>
-->
```

1. **Which class?** Name it from [`05-bug-classes.md`](05-bug-classes.md) (or from upstream
   `doc/bug-classes.md` once it exists). If none fits, propose a new class on the board with a
   two-line pattern. Do not file yet.
2. **Does it touch the release line's frozen set** (§2)? Then it is an evidence item for the
   E-CONSENSUS lane. Stop here.
3. **Is the class swept** (its rule is in the tree)? Then this is a gate failure: extend the rule,
   do not file an instance fix.
4. **Not swept: count the sites** on the live head with a command you paste into the PR. Three or
   more real sites: one sweep PR (every site plus the rule). Fewer than three: file the rule (a
   test or a lint) as the PR; it fixes the sites it flags. If a lane already holds the sweep for
   that class ([`07-lanes.md`](07-lanes.md), the Status column of
   [`05-bug-classes.md`](05-bug-classes.md)), add your site to its worklist through the lane owner
   instead of opening a parallel PR.
5. **A hot file** (`net_processing.cpp`, `modelnet/helper.cpp`, `node/matmul_trusted_attestations.*`)?
   No per-event PR without a model-based test or a split proposal first.
6. **Was this closed before without being taken?** Search the closed PRs on `btxchain/btx`
   (`https://github.com/btxchain/btx/pulls?q=is%3Apr+is%3Aclosed+<words>`), and the history of the
   files you touch (`git log --oneline -- <path>`). Such a change is not re-filed under any title or
   number, alone or folded into another PR; it becomes an evidence item or is dropped. The exception
   is a public maintainer comment that asks for a new PR: then file exactly that, standalone, and
   cite the comment ([`02-method.md`](02-method.md) rule 11).
7. **Security-relevant** (a remote crash or hang, fund loss, a key or seed leak, a consensus
   split)? GitHub private vulnerability reporting on `btxchain/btx`, never a public issue, PR,
   board card or chat post. The class goes on the registry without the detail. Stop here
   ([`03-guardrails.md`](03-guardrails.md) §8).
8. **Does the PR stay in its class?** A sweep changes nothing beyond its class (plan §2 rule
   (b)). Anything else you found goes to the lane's worklist or its own PR.

Source: the class-check rules of the lanes ([`07-lanes.md`](07-lanes.md) §5, §7); plan §2 rules
(a)-(c) ([`plan/MASTER-PLAN.md`](plan/MASTER-PLAN.md)).

## 2. What the release line takes

`release-0.34.16` takes no validation, fork-choice, attestation or MatMul-frontier changes. The
maintainer (numair) on #464 (11 Nov): the validation, fork-choice and MatMul-frontier entries stay
out of `release-0.34.16`. The closing notes on #461, #462, #463, #479, #484 and #515 (11 Nov) give
the same reason in one line each: the change alters validation, what a signer is told to attest, or
MatMul frontier state.

In files, this hub reads that as [inferred, conservative]:
- `src/validation.cpp`, `src/pow.cpp`, `src/consensus/`, `src/script/interpreter.cpp`
- fork choice and download scheduling in `src/net_processing.cpp`
- the attestation rules in `src/node/matmul_trusted_attestations.*`, and `src/matmul/`
- issuance and signer sets

A fix near these files that changes none of those rules can land: the PQ attestation lock order
(#478) and the attestation blocklist extension (#583) did [read: #464, 11 Nov; `git log` on
`release-0.34.16`]. If in doubt, treat it as frozen and ask through the batch.

Outside that set, tested and documented standalone PRs have been taken quickly. The five
non-consensus items that the #464 comment said could come back as standalone PRs landed on
`release-0.34.16` on 12 Nov as #579, #580, #581, #582 and #583, within hours of being opened
[tested: commit subjects in `git log c6f9678d..4c7840e9`; [`01-state.md`](01-state.md) §2].

**The evidence item.** A finding in the frozen set takes this shape and goes to the
E-CONSENSUS lane, which offers it on #464 with the weekly batch: at most one short note, and only
when an item is complete. The maintainer decides what, if anything, changes; no `release-0.34.16`
change is requested.

```text
Evidence item: <the invariant, one sentence>
Measured: <what ran, on which commit and platform, the result>
Ready test: <path; how to run; fails on <sha8>, passes with <change>>
Paragraph: <why it matters; what change would satisfy it; no 0.34.16 change requested>
```

## 3. The PR body template

**Title:** `area: verb ...`, lower case after the colon, no trailing period. Examples:
`wallet: refuse funding a locked wallet before coin selection`,
`modelnet: write every store file through WriteBinaryFileAtomically`.

```markdown
## Problem
<what goes wrong and who sees it>. At `<sha8>` on release-0.34.16: `src/<file>.cpp:<line>` (and N more sites, listed below).

## Class
<Kxx name>. Status before this PR: <swept / rule only / not counted>. Sites counted on `<sha8>` with:
`<exact command>` -> <N> sites.

## Cause
<one paragraph>

## Fix
<every site, plus the rule (test, lint or CI job) that keeps the class at zero>.
Invariant kept: <one sentence; quote AGENTS.md where it applies>.

## Tested on
- <OS and version, arch>; <compiler and version>; cmake flags: `<flags>`
- Commands: `<exact commands>`
- Before (base `<sha8>`): <test> FAILS: `<one line of output>`
- After (this branch `<sha8>`): PASSES
- Fork CI run: <link, or "not yet" and why, e.g. "not yet: the fork CI has not run on the release line">

## Not tested
<platforms, suites, paths not run; and why>

## Base
release-0.34.16 at `<full sha>`
```

- One class per PR. No unrelated changes. No tool-advert footer in the body.
- Follow-ups are new PRs, never commits linked from a comment.
- "Tests pass" is not a tested-on block. Name the commit, the platform and the command, show the
  test failing before and passing after, and say what was not run.
- Logs in the body follow [`03-guardrails.md`](03-guardrails.md) §3: home path replaced by `~`, no
  hostnames, IP addresses or user names.
- For a security-relevant class (marked S in [`05-bug-classes.md`](05-bug-classes.md)) a public PR
  comes only after the private report has been handled, as the maintainer decides.

Source: the PR format of the lanes; exam question 10.

## 4. The batch rule and the newcomer rule

- **One weekly batch.** Upstream PRs go out together in the weekly batch: Thursday, coordinated by
  the batch coordinator role, with one message to the maintainer for the whole batch, not one per
  PR ([`07-lanes.md`](07-lanes.md) §6).
- **No PR outside the batch** unless a gate is red: a baseline grew, or a known-failing list grew.
- **Your fork, any time.** Push to your own fork whenever you like, so the second pass and the fork
  CI run can read the branch.
- **Second pass first.** A person who is not the author reads the full body and the full diff and,
  where it matters, re-runs the stated test (second passes happen on Wednesday). A runner who
  cannot reproduce it holds the PR until the owner investigates. "CI will catch it" is not a
  reason to approve: upstream runs no hosted CI for the node software
  ([`01-state.md`](01-state.md) §6); the fork run linked in the PR is the only CI there is.
- **Newcomers.** Your first upstream PR goes through a lane owner's second pass. Pick the lane the
  class belongs to ([`07-lanes.md`](07-lanes.md)), ask its owner on the board, and the owner puts it
  in the batch. You open it yourself, from your own account.

Source: [`07-lanes.md`](07-lanes.md) §6 (weekly rhythm) and §7 (how a finding moves, escalation).

## 5. Would the maintainer reject this?

Ask before every post. The answer is **yes** until the PR shows why not.

| The PR has | Verdict | Public evidence |
|---|---|---|
| a stub, a placeholder, or an "unsupported" return where a real implementation is expected | rejected | #245, 22 Oct: a Linux-only guard (`#ifdef __linux__`, confinement reported as unsupported) or a Linux-only build of the confinement files was rejected; the maintainer (numair) asked for the macOS work. #246, the macOS implementation, was merged (#245, 24 Oct). |
| a fail-closed workaround that skips the feature | rejected | the same #245 reply: a node left unbuilt or running without the confinement is not an acceptable result |
| a skipped or disabled test, a widened timeout, a non-default flag to make a test green | reject it yourself | [`03-guardrails.md`](03-guardrails.md) §7 (the `-matmulvalidation=economic` trap) |
| a change in the frozen set | not a PR: an evidence item | #464, 11 Nov; closing notes on #461, #462, #463, #479, #484, #515 (11 Nov) |
| a change that was closed without being taken, under a new title or number | not a PR, unless a maintainer comment asked for a new one | #464, 11 Nov: #314 and #317 came back as #463 and #461 and were not taken; the five non-consensus items it named came back as standalone PRs and landed (§2) |
| a claim with no commit, platform or command | nothing to merge | the template in §3 [inferred] |
| more than one class, or unrelated changes | split it | the rules in §3 |

And name the invariants from upstream `AGENTS.md` that the change touches, in its words: the three
planes (monetary `btxd`, model `btx-modeld`, hosted) never mix; `btx-modeld` never holds wallet
secrets; `prepare` / `approve` / `sign` / `submit` stay distinct steps [read:
`git show 4c7840e9:AGENTS.md`].

Source: [`02-method.md`](02-method.md) rule 12; upstream `AGENTS.md` at `4c7840e9`; the public
PRs cited.

## 6. The checklist before "Create pull request"

The AI fills this in and stops. The person ticks it.

- [ ] The eight questions are answered in writing (§1).
- [ ] The live head was re-checked just before posting
      (`git fetch origin && git log -1 --format=%h origin/release-0.34.16`); the branch is rebased
      onto it and the sites were recounted if it moved.
- [ ] The class is named; the sites were counted with a command that is pasted in the PR.
- [ ] Fails before and passes after, with both SHAs, the platform and the exact commands; the fork
      CI link or "not yet".
- [ ] A "Not tested" section that names what was not run and why.
- [ ] A second pass by a person who is not the author said "ok" on the board.
- [ ] It is batch day, or a gate is red.
- [ ] Author and committer (name, email, date) checked on every commit
      ([`03-guardrails.md`](03-guardrails.md) §3).
- [ ] No secrets, real names, hostnames, IP addresses, home paths or private chat content in the
      body, the diff or the logs.
- [ ] Title `area: verb ...`; one class; no unrelated changes; no tool-advert footer.
- [ ] The body is the approved file, byte for byte (`shasum -a 256 pr-body.md` matches what the
      second pass approved).
- [ ] After posting: the live body is compared with the file ([`02-method.md`](02-method.md)
      rule 7).

If a box stays empty, the PR waits.
