# Levels: Basic, Advanced, Core

> Last verified: 2026-11-12 · against: btxchain/btx release-0.34.16 @ 4c7840e9 · owner role: hub editor

**Kurzfassung (DE).** Drei Stufen, je nachdem, was du mitbringst. Basic: Pull Requests und
Release-Archive unabhängig nachprüfen, auf einem Linux-Rechner ohne Wallet und ohne Kosten, nach
etwa einer Stunde Einrichtung. Advanced: einen Bereich (eine Fehlerklasse oder einen Code-Bereich)
übernehmen, mit einer zweiten Person, die jede Änderung prüft. Core: die Prüfläufe betreiben, also
CI auf dem eigenen Fork, Release-Prüfung und das wöchentliche PR-Paket an den Maintainer.

Three ways to help, by what you bring: a spare machine and an hour, a few hours every week, or a
fork with CI and time every week. A level is a starting point, not a rank. Every level follows
the same rules ([`AGENTS.md`](AGENTS.md) §4, [`03-guardrails.md`](03-guardrails.md)), and every
level ends in the same place: evidence the maintainer can check.

| Level | What you do | Lane form | You need | Give your AI |
|---|---|---|---|---|
| **Basic: verify** | Independently verify commits, PRs and release archives | I-RC runner: re-run a PR's stated test at its commit; check a release archive's SHA-256 and that it starts; print one `RUN \|` line | a Linux machine (native, or WSL2 on Windows 11), about 1 hour of setup, no spend, no wallet on the box | [`packs/I-RC-runner.md`](packs/I-RC-runner.md), complete on its own |
| **Advanced: team** | Analyse, challenge, solve | Own a class sweep or an area lane with a second-pass partner. The analyst, challenger and verifier roles run inside one person's AI session; the human reviewer settles it | a machine that builds the tree with tests, a fork of `btxchain/btx`, a few hours every week | [`AGENTS.md`](AGENTS.md) + the lane pack |
| **Core: runs** | Run the gates others rely on | The infra lanes: fork CI gates, the coverage-ratchet box, TSan nightly, CodeQL weekly, release qualification, the weekly batch | a fork with GitHub Actions; optionally a rented box with a spend cap you set; time every week | [`AGENTS.md`](AGENTS.md) + [`packs/I-CI.md`](packs/I-CI.md) or [`packs/I-RC.md`](packs/I-RC.md) |

Moving up takes two things, nothing else: your AI passes the exam
([`exam/questions.md`](exam/questions.md), 11 of 12 with sources, the key kept out of its
context), and your first upstream pull request goes through a lane owner's second pass
([`06-pr-gate.md`](06-pr-gate.md)).

## Basic: verify

**What it proves.** A PR's stated test holds on hardware that is not the author's. A published
archive is the one announced, and it starts on your system.

**Why it matters now.** The v0.34.16 pre-release ships one archive, Linux x86_64, and no signed
`SHA256SUMS`; its `btxd` and `btx-cli` need GLIBC 2.38, so Ubuntu 24.04 or Debian 13 [read:
v0.34.16 release notes, published 7 Nov, text as of 12 Nov]. Windows, macOS, arm64 and CUDA
archives are not in the tag [same source], so those systems are checked only when someone builds
from source and runs the tests.

**First hour.**

1. **Pick the machine.** It holds no wallet with funds, no signer key, no RPC cookie or password
   of a node you use, and no API tokens. If it does, use another machine (stop condition S1 in
   [`AGENTS.md`](AGENTS.md) §8).
2. **Check it.**
   ```bash
   . /etc/os-release && echo "$PRETTY_NAME"; uname -m; ldd --version | head -1; df -h "$HOME"
   ```
   The release-archive check needs Ubuntu 24.04 or newer. A PR re-run builds the tree and needs
   40 GB free.
3. **Brief your AI.** Give it `packs/I-RC-runner.md` and nothing else, and paste the prompt block
   at the end of that file. Answer its first question (keys or funds on this machine?) honestly.
4. **Run the setup and the release-archive check.** Read each command before you say yes. The
   check prints one `RUN |` line.
5. **Report.** Paste the `RUN |` line exactly as printed, plus one `NOT TESTED:` line, where the
   I-RC lane collects them ([`07-lanes.md`](07-lanes.md)). Send logs only when asked, with your
   home path replaced by `~`.

**Done when.** Every candidate your hardware can run has a PASS, FAIL or BLOCKED line from you;
every re-run request you take is answered within the week; no key, token or wallet sits on any
machine you run checks on ([`packs/I-RC-runner.md`](packs/I-RC-runner.md) §0b).

On a Mac: the runner scripts target Ubuntu. Re-run a PR's stated test by hand with the macOS
recipe in [`04-build-and-test.md`](04-build-and-test.md) §2.2, and label the result macOS.

## Advanced: team

**What it is.** You own one lane from [`07-lanes.md`](07-lanes.md): a bug class (a sweep plus
the rule that keeps it at zero) or a code area. Another person second-passes every diff before it
goes upstream, and you second-pass someone else's lane in return, on Wednesdays.

**How the AI session works.** One session, three roles. The analyst drafts and counts. The
challenger argues that the draft is wrong. The verifier runs the commands against the tree at the
live head. You settle it, and the second pass checks you ([`02-method.md`](02-method.md)).

**First hour.**

1. **Clone, and record the live head.** Set `LANE` and `TOPIC` to your own lane and task first.
   ```bash
   LANE=C-K01 TOPIC=first-sweep
   mkdir -p ~/btx-work && cd ~/btx-work
   git clone https://github.com/btxchain/btx.git btx && cd btx
   git fetch origin release-0.34.16 main
   git log -1 --format='%h %cd %s' origin/release-0.34.16
   git worktree add ~/btx-work/"$LANE-$TOPIC" -b "$LANE/$TOPIC" origin/release-0.34.16
   ```
2. **Set your git identity** in the clone you commit from: your GitHub handle and your GitHub
   noreply address (GitHub > Settings > Emails shows it). Replace both placeholders. Check the
   committer as well as the author before every push ([`03-guardrails.md`](03-guardrails.md)).
   ```bash
   git config user.name  "<your GitHub handle>"
   git config user.email "<id>+<handle>@users.noreply.github.com"
   ```
3. **Start the build for your OS** ([`04-build-and-test.md`](04-build-and-test.md) §2; on Linux,
   OpenSSL 3.5 first). It runs for a while; read on meanwhile.
4. **Read your lane and its pack.** With your AI, answer the eight questions in
   [`06-pr-gate.md`](06-pr-gate.md) for the first task, and count the class's sites on the live
   head with a command you will paste into the PR.
5. **Claim the lane** by pull request ([`README.md`](README.md#claim-a-lane)) and name a second
   pass who is not you.

**Done when.** The lane's done bar in [`07-lanes.md`](07-lanes.md) is met. For a class lane that
means the class at zero on the live head and its rule in the tree; for every lane, every PR with
fails-before and passes-after.

Every lane is claimable. Five have a scope and a done bar but no pack yet: A-NET, A-HELPER,
A-SHIELDED, A-PQ, A-GUI. Claim one and a pack in the same format follows.

## Core: runs

**What it is.** The gates every other lane relies on. Upstream does not use GitHub-hosted CI for
validation [read: `git show 4c7840e9:.github/workflows/README.md`], so contributors run CI on
their own forks and link the run in each PR. The I-CI lane runs them: CI-0 build matrix, CI-1 sharded unit
and functional tests, CI-2 ASan/UBSan, CI-3 TSan and DEBUG_LOCKORDER nightly, CI-4 lint, CI-5
clang-tidy on the diff, CI-6 cppcheck, CI-7 fuzz smoke, CI-8 CodeQL weekly, CI-9 coverage ratchet,
CI-10 release gate ([`packs/I-CI.md`](packs/I-CI.md)). The I-RC lane qualifies release candidates
with one archive per OS and a fixed checklist ([`packs/I-RC.md`](packs/I-RC.md)). The batch
coordinator collects the week's PRs after their second passes, so they reach the maintainer
together on one day ([`07-lanes.md`](07-lanes.md) §6).

**Scale.** A full unit + functional coverage run took a 128-thread machine most of a day
([`04-build-and-test.md`](04-build-and-test.md) §5). CodeQL and the coverage ratchet are planned
on a dedicated machine; the other jobs on hosted runners, sharded where a job ran out of time
([`packs/I-CI.md`](packs/I-CI.md)).

**First hour.**

1. **Fork `btxchain/btx` and enable Actions on your fork.**
2. **Read the pack:** [`packs/I-CI.md`](packs/I-CI.md) for the jobs and the known-failing list, or
   [`packs/I-RC.md`](packs/I-RC.md) for the release checklist and the runners.
3. **Before any rented machine,** write down the spend cap (default 0) and a kill date; set a
   watchdog and auto-destroy; put no keys, tokens or wallets on the box
   ([`03-guardrails.md`](03-guardrails.md)).
4. **Start one run at the live head:** CI-0 on your fork, or the release checklist on the current
   candidate. Record minutes and pass or fail for each job.
5. **Publish the result:** the run link on the lane's board card, and claim the lane by pull
   request ([`README.md`](README.md#claim-a-lane)).

**Done when.** CI-0 has run on the live head and the shard counts come from that run; the
known-failing list only shrinks; every class PR links a run with fails-before and passes-after;
every baseline only shrinks ([`07-lanes.md`](07-lanes.md), lane I-CI).
