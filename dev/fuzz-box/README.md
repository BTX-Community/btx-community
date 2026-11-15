# Running a continuous BTX fuzz box

> Last verified: 2026-11-15 · against: btxchain/btx main @ 074dac16 · owner role: I-OPS lane owner

For infra owners who can give BTX a machine that fuzzes around the clock. You need basic Linux
admin skills and about an hour to set it up; after that, about half an hour a week. The scripts,
the config example and the systemd unit are in this folder.

## Why a box that never stops

BTX has more than 270 fuzz targets, many of them for code that exists only in BTX (MatMul,
post-quantum signatures, shielded transactions, HTLC, SwapNet, ModelNet)
[repo: `git grep -E '^FUZZ_TARGET(_DESERIALIZE)?\(' origin/main -- src`]. On `main`, the fuzz job of
the repository's CI script starts every target once: it replays the inputs in a target's corpus
folder once; a target without inputs fuzzes from an empty input for 60 seconds in a libFuzzer build
(`FUZZ_SANITIZERS=fuzzer,...`) and only starts in the default build, which is how the readiness
matrix runs it [repo: `scripts/ci/run_ci_target.sh` `run_fuzz`, `scripts/ci/local-mac-matrix.tsv`]. That catches a target that breaks at start-up. It does not find a bug that needs hours
of mutation, and it keeps no corpus between runs. Nothing fuzzes continuously.

A coverage-guided fuzzer keeps every input that reaches new code, and mutates those inputs to go
deeper. The kept inputs (the corpus) are its progress. A short run starts from nothing each time and
only reaches the shallow code. A box that runs day and night keeps its corpus, so each day starts where
the last one ended. It also replays that corpus against every new commit, which catches a regression
the day it lands.

## What you need

- A dedicated Linux machine or VM running Ubuntu 24.04. **Not** a box that runs a mainnet node, a
  signer, a wallet or a miner, and not one that holds keys of any kind.
- CPU: more threads mean more fuzzing per day. The loop runs one fuzzing process per CPU thread,
  minus two. RAM: about 2 GB per fuzzing process (`RSS_MB`), plus room for the system. Disk: 80 GB
  or more free. No GPU needed.
- Outbound HTTPS to github.com (for `git fetch` and the OpenSSL download). No inbound ports apart from
  your own SSH.
- Someone who reads the crash list at least once a week (the triager, see below). A box nobody reads
  is worse than no box: it collects working crash inputs and nobody acts on them.

## Safety rules

1. **Crash inputs are private.** An input that crashes the fuzz target may crash a live node. Keep them
   on the box, in the owner-only `crashes/` folder the scripts create. `logs/` is private too: target
   logs contain crash output and small inputs. Never paste either into a public issue, pull request,
   chat, pastebin or AI chat service.
2. **Report privately** (see "When a crash appears"). Only after the maintainers agree may a fix or a
   description become public.
3. **Run as an unprivileged user.** The kit creates `btxfuzz` and runs the loop under systemd with
   hardening (no new privileges, read-only system, write access only to `/srv/btxfuzz`).
4. **Nothing else on the box.** No node, no wallet, no SSH agent forwarding into it, no shared home
   folders, no credentials for anything.
5. **Corpora are less sensitive, not public.** An input in `corpus/` can still crash an older release
   or, after a regression, the current build (the triage step removes crashing inputs it finds). Share a
   corpus only privately with the maintainers, and never while a crash group for that target is open.
6. **Watch the disk.** The loop stops itself when the disk passes 90%.

## Install (copy-paste, as root)

Get this folder onto the box, either with `scp -r dev/fuzz-box/ <box>:` from a clone of this
repository, or on the box:

```bash
apt-get update -qq && apt-get install -y -qq git ca-certificates
git clone --depth 1 https://github.com/BTX-Community/btx-community.git
cd btx-community/dev/fuzz-box
```

Then, from that folder:

```bash
install -d /opt/btxfuzz-kit /etc/btxfuzz
cp fuzzbox-*.sh /opt/btxfuzz-kit/ && chmod 755 /opt/btxfuzz-kit/*.sh
cp fuzzbox.conf.example /etc/btxfuzz/fuzzbox.conf
```

Edit `/etc/btxfuzz/fuzzbox.conf` if needed:

- **Branch.** The default, `BRANCH=main`, fuzzes the newest release line. To fuzz the candidate
  under development, set `BRANCH` to the current release branch, for example
  `BRANCH=release-0.34.17` (branch list: <https://github.com/btxchain/btx/branches>). When the
  maintainer moves to a new release branch, change `BRANCH` and restart the loop: it builds the new
  head and replays every corpus against it first.
- **CPU count.** With `JOBS=0` the loop runs one worker per CPU minus two, and the build uses every
  CPU. The kit counts CPUs with `nproc` after removing `OMP_NUM_THREADS` and `OMP_THREAD_LIMIT`:
  GNU `nproc` returns their value when either is set. A shell or box image can set them (the unit-test
  recipe in [`../04-build-and-test.md`](../04-build-and-test.md) §3 exports `OMP_NUM_THREADS=2`), and then
  the build and the loop ran on a couple of cores. A cgroup v2 CPU quota lower than that count wins. If the
  box shows more CPUs than it gives you, set `JOBS` yourself and keep `JOBS` × `RSS_MB` below about
  85% of the RAM.

```bash
/opt/btxfuzz-kit/fuzzbox-setup.sh
runuser -u btxfuzz -- /opt/btxfuzz-kit/fuzzbox-build.sh
```

The first build takes 10 to 30 minutes or more, depending on the CPU, and prints the commit it
built (12 characters). Then install the service and start the loop. The unit caps the service at
85% of the box's RAM (`MemoryMax=85%`); change it there if the box does other work.

```bash
cp btxfuzz.service /etc/systemd/system/
systemctl daemon-reload && systemctl enable --now btxfuzz
```

After the first start, check `systemctl status btxfuzz` and `tail /srv/btxfuzz/logs/jobs.log`:
lines should end in `rc=0`. If every target fails at once, remove `LockPersonality=yes` from the unit
and restart. Without systemd (in a container, for example), start the loop as `btxfuzz` from the
container's start script or inside `tmux`: `runuser -u btxfuzz -- /opt/btxfuzz-kit/fuzzbox-loop.sh`.

The harness fixes for the drift the kit found on its first runs (in the `rpc`, `message`,
`mini_miner_selection` and `package_rbf` targets, among others) are on `main`. On an older commit
those targets report known harness-drift groups; on `main` and later, triage every group.

## What the loop does

Each round, the loop:

1. Fetches the branch. If it moved, the loop builds the new commit (clang 18, libFuzzer, AddressSanitizer,
   UndefinedBehaviorSanitizer) and replays every saved corpus against it first.
2. Fuzzes every target for `SLICE_SECS` (5 minutes by default), several targets in parallel. Targets
   that match `PRIORITY_REGEX` (consensus, P2P and BTX-only code) run twice per round.
3. Reproduces each new crash file three times and groups it by its top stack frames. Each new group
   goes into `crashes/<group>/` with the input, the output and a draft private report
   (`REPORT-DRAFT.txt`). A target that stops without writing an input (an abort at start-up, a hang)
   gets a group too, with its log. If you set `NOTIFY_CMD`, it gets one line of text: target, group,
   kind, commit. The input is never sent anywhere.
4. Every `MERGE_EVERY` rounds (12 by default), it minimises each corpus so it stays small.

A round takes about (targets + priority targets) × `SLICE_SECS` ÷ `JOBS`, plus triage. More workers
mean shorter rounds, so every target gets more fuzzing time per day.

## Daily and weekly checks

```bash
tail -5 /srv/btxfuzz/logs/loop.log        # rounds, rebuilds, merges
cat /srv/btxfuzz/crashes/index.txt        # every crash file seen: NEW group or dup
df -h /srv/btxfuzz                        # disk
systemctl status btxfuzz --no-pager       # running?
```

Stop cleanly with `touch /srv/btxfuzz/state/STOP`; the loop finishes its round and exits. Remove the file
and run `systemctl restart btxfuzz` to resume. `systemctl stop btxfuzz` stops it at once (safe; the corpus
on disk is kept).

## When a crash appears

Open `crashes/<group>/REPORT-DRAFT.txt`. Then decide, in this order:

1. **Flaky?** Groups under `crashes/flaky/` did not reproduce. Keep them; report only if they keep
   coming back.
2. **Harness drift or a node bug?** The fuzz target itself (`src/test/fuzz/<file>.cpp`) sometimes
   asserts something BTX deliberately changed (for example, BTX refuses classical message signatures).
   If the failing check is in the harness file and the code it calls behaves as BTX designed it, it is
   harness drift. **Treat it as private anyway until a second reviewer agrees it is harness drift.**
   After that it can be fixed in a public pull request, with the input as a test.
3. **Everything else is private**: any crash, sanitizer error, out-of-memory or timeout that reaches
   consensus, validation, block or header processing, P2P messages, the mempool, the wallet, MatMul,
   shielded code, post-quantum script, HTLC or SwapNet code. Out-of-memory and timeouts count: they are
   how a remote peer stops a node.

### The private route

The route is the one in the repository's
[`SECURITY.md`](https://github.com/btxchain/btx/blob/main/SECURITY.md) and in
[`../03-guardrails.md`](../03-guardrails.md) §8.

1. Use GitHub private vulnerability reporting: on the BTX repository page, open the **Security** tab and
   click **Report a vulnerability** (`https://github.com/btxchain/btx/security/advisories/new`). Only the
   maintainers see it. If you cannot use GitHub, email `team@btx.dev` and ask for the current disclosure
   key before you send the input.
2. Paste the text of `REPORT-DRAFT.txt`. It already has the target, commit, error, top frames, how to
   reproduce, and the input in base64 when the input is 4 KB or smaller. For a larger input, say its size
   and ask the maintainers for a private way to send it.
3. Add what you know about impact, and whether anyone else has seen it.
4. Do not mention the crash anywhere public, including "I found something in target X". Wait for the
   maintainers. If nobody answers within 14 days, follow up through the same private route.

## Updating and removing

- Kit updates: copy the new scripts to `/opt/btxfuzz-kit/` and `systemctl restart btxfuzz`. The corpus and
  the crash folders are kept.
- Remove: `systemctl disable --now btxfuzz`, report any open crash groups first, then delete
  `/srv/btxfuzz` (the crash inputs with it) and the `btxfuzz` user.

## Files

| File | What it does |
|---|---|
| [`fuzzbox.conf.example`](fuzzbox.conf.example) | The settings, copied to `/etc/btxfuzz/fuzzbox.conf`: branch, workers, slice length, memory limit, priority targets, notification command |
| [`fuzzbox-setup.sh`](fuzzbox-setup.sh) | One-time setup as root: the `btxfuzz` user, build tools, OpenSSL (hash-checked), the clone |
| [`fuzzbox-build.sh`](fuzzbox-build.sh) | Builds the fuzz binary for the newest commit of `BRANCH`; keeps the three newest builds |
| [`fuzzbox-loop.sh`](fuzzbox-loop.sh) | The continuous loop: rebuild and replay, fuzz, triage, merge, disk stop |
| [`fuzzbox-one.sh`](fuzzbox-one.sh) | One target, one job (fuzz, replay or merge), in its own work folder |
| [`fuzzbox-triage.sh`](fuzzbox-triage.sh) | Reproduces new crash files, groups them and writes the private report drafts |
| [`fuzzbox-env.sh`](fuzzbox-env.sh) | Sourced by the others: the sanitizer settings and the CPU count |
| [`btxfuzz.service`](btxfuzz.service) | The systemd unit, with hardening |

## Not verified on this page

- The kit ran end to end from a shell on Ubuntu 24.04 on 14 Nov, on the branch that is now part of
  `main`: setup, its own build, the loop over every target with short slices, replay, merge, triage.
  The I-OPS lane owner runs it and reported the two problems this version fixes (the stale default
  branch, and `OMP_NUM_THREADS` capping the CPU count).
- Not run: the unit under a live systemd, a reboot, a rebuild when the branch moves, `MERGE_EVERY`
  above 1, the disk stop. The 15 Nov changes (default branch, CPU count, `MemoryMax=85%`) were
  checked with shellcheck and with GNU `nproc` against simulated cgroup files, not in a full round.

Licence: the scripts and the unit are MIT ([`LICENSE`](../../LICENSE)); this page is CC BY 4.0
([`LICENSE-CONTENT`](../../LICENSE-CONTENT)).
