# Bug-class registry

> Last verified: 2026-11-12 · against: btxchain/btx release-0.34.16 @ 4c7840e9 · owner role: registry editor

A bug class is a mistake that keeps coming back in new places: the same pattern, a new file. This
registry names each class, the rule that keeps it at zero (a unit test, a lint or a CI job), and
where the class stands. Before you file anything, find its class here and answer the eight
questions in [`06-pr-gate.md`](06-pr-gate.md) §1.

**Status of this file.** The upstream registry `doc/bug-classes.md` ships with the first class PR
to `btxchain/btx`. Once it lands it is authoritative, and this file becomes a mirror that links to
it; on any difference, upstream wins. Until then, this file is the registry.

**Where the numbers come from.**
- PR counts: a taxonomy of every fix PR to `btxchain/btx` since 1 Aug: 317 fix PRs in 26 named
  classes plus "other". Class assignments are 10-15% noisy [read:
  [`plan/MASTER-PLAN.md`](plan/MASTER-PLAN.md) §1.4, §8].
- Site counts: on the live head `4c7840e9` unless marked. Static and dynamic counts: measured at
  `c6f9678d`, untriaged [read: plan §1.2, §1.3].
- Example PRs: public PRs on `btxchain/btx`. "Landed 12 Nov" means the change is on
  `release-0.34.16` (cherry-picked by the maintainer) [tested 12 Nov: each PR title matched to a
  commit subject in `git log c6f9678d..4c7840e9`; #576 through its cherry-pick line].

**Security-relevant classes** are marked **S**. For them this file gives the class, the rule, the
counts and public merged PRs only: no file, line, function or reproduction detail for any result
that has not been triaged. Findings in these classes go through GitHub private vulnerability
reporting on `btxchain/btx` ([`03-guardrails.md`](03-guardrails.md) §8).

**Status words.** *swept*: the rule is in the tree. *rule only*: fewer than 3 real sites, so the
rule is the PR and fixes what it flags. *counted*: a worklist exists on a named head. *not
counted*: nobody has counted on the live head yet. *evidence*: the class sits in the release
line's frozen set and goes to #464 as evidence, never as a PR ([`06-pr-gate.md`](06-pr-gate.md) §2).

## 1. The registry

| Class | Name | S | Rule that keeps it at zero | Status 12 Nov | Lane | Example PRs |
|---|---|---|---|---|---|---|
| K01 | non-atomic or short state-file write | | every write through the shared atomic helper (with file and directory fsync); a lint against raw `ofstream` / `fopen("w")` to datadir paths; truncated-file load tests | counted: 12 files at `4c7840e9`, plus 2 candidates (§2.2); helper `WriteBinaryFileAtomically` exists (#576), without fsync | C-K01 | #565 #570 #572 #576 #577 (landed 12 Nov) |
| K02, K20, K21 | state lost across restart; ModelNet store logic slip; BCP/1 deposit-pool logic | | property tests per store (idempotency keys, pagination completeness, monotonic counters, restart = no restart); a table-driven BCP/1 lifecycle test; mutate → reopen → compare per store | not greppable: test generators, not instance fixes | A-STORES | K20: #550 #554 #556 #557 #558 #566 #568; K02: #553 (landed 12 Nov) |
| K03 | lock order, self-deadlock, race | S | `-Wthread-safety` with `EXCLUSIVE_LOCKS_REQUIRED` annotations; a TSan + DEBUG_LOCKORDER nightly; baselines only shrink | baseline at `c6f9678d`: 41 TSan site pairs, 266 thread-safety warnings, 1 lock-order inversion (§2.3) | C-STATIC; `net_processing` / `validation` warnings: E-CONSENSUS | #478; #579 (landed 12 Nov) |
| K04 | dangling reference, UniValue self-assignment | S | a UniValue self-member-assignment lint | 0 real sites at `4c7840e9`; rule only | C-STATIC | |
| K05 | wallet-locked / passphrase ordering | | every wallet RPC tested against a locked wallet: the passphrase request comes before coin selection or key derivation; lock erases PQ seeds and cached secrets | not counted (4 files under `src/wallet/rpc` call funding primitives; the dominance check has not run) | A-WALLET | #456 → #475 → #488 → #523; #571 (landed 12 Nov) |
| K06 | Windows / MinGW / MSVC portability | | the fork CI Windows jobs; a lint for POSIX headers and calls outside `#ifndef WIN32` / `compat/mingw` | waits for the first Windows CI run on the release line | C-PORT | #582 (landed 12 Nov) |
| K07 | macOS / libc++ / Qt packaging | | `otool -L` on every packaged binary in the release gate; macOS CI | not counted | C-PORT | |
| K08 | path, symlink, jail | S | one `SafePath` helper; every jail-setup failure is fatal; jail tests with 0 "jail absent" skips | not counted (44 files reference symlink APIs) | C-PATHS | #346 (the jail refuses when `pivot_root` fails; on the release line as `107efc93`, per #464, 11 Nov) |
| K09 | unbounded input from peers and model peers | S | `doc/resource-bounds.md`: every peer-fed container with a bound, an eviction rule and a unit test; one fuzz target per message type | not counted; no container inventory yet; 5 message types have no fuzz target | A-NET, A-HELPER (no owner yet) | #551 #569 (landed 12 Nov) |
| K10 | CLI/RPC conversion drift | | a unit test over the `RPCHelpMan` table against `vRPCConvertParams`, including 4-field `also_string` rows | 1 candidate of 743 arguments at `4c7840e9` (may be deliberate); rule only | C-STATIC | #574 (landed 12 Nov) |
| K11, K12 | wallet RPC authorization; coin reservation | S | an allowlist test per restricted-user RPC; an RAII reservation type with a two-sender test | not counted | A-WALLET | |
| K13 | MatMul attestation / frontier state | S | one model-based state-machine test (vote, withdraw, restart, reorg, missing index) | evidence for #464 | E-CONSENSUS | #583 (blocklist, not frontier; landed 12 Nov); the frozen list on #464 |
| K14 | block download scheduling | S | a deterministic download simulation with an adversarial scheduler | evidence for #464 | E-CONSENSUS | the frozen list on #464 |
| K15 | integer width / truncation | S | `ParseUint32Index` (or a proved range check) at every JSON-number cast | counted: 28 casts in 11 files in scope at `4c7840e9` (consensus and matmul casts excluded) | C-STATIC | |
| K16, K17 | helper lifecycle; option or mode not honoured | S | RAII wrappers for fork, socket and pipe, with an identity check before every `kill`; a functional matrix of `-listen=0`, `-proxy`, `-onlynet`, `-v2pqonly` over every listening surface | not counted | C-PORT (K16), C-PATHS (K17) | K17: #552 (landed 12 Nov) |
| K19, K22 | test registration, fuzz smoke, packaging drift | | a registration diff (suite list against ctest); a 10 s smoke run of every fuzz target; an exec-bit lint; a release-gate job | in the fork CI branch; 7 fuzz targets never ran; the modelnet fuzz build does not link by default | I-CI, C-STATIC, C-PORT | K19: #573 #580; K22: #575 #578 (landed 12 Nov) |
| K25 | privacy leak to peers or restricted views | S | one functional test with an observing peer | 5 of 5 PRs landed; the rule is missing | A-WALLET, A-NET | #567 (landed 12 Nov) |
| K27 | secret or seed material exposed | S | a log-scan assertion in the functional runner; a `SecureString` audit test | not counted | A-WALLET | |
| fs-trust | file-system and environment trust (CodeQL) | S | one policy: 0600 for secrets and sockets, an audited environment-variable allowlist, a provenance check at each sink; the CodeQL baseline only shrinks | 133 results at `c6f9678d`, untriaged (§2.3) | C-STATIC | |
| lifetime | lifetime and initialisation (cppcheck, CodeQL) | S | `ci/cppcheck.sh` with fixed flags; every result initialised or documented | 120 results at `c6f9678d`, untriaged (§2.3) | C-STATIC | |

**Not sweeps.** K18 wording: review only. K23: documentation. K28: every `[[nodiscard]]`
validation result is consumed; an evidence item for #464, not a sweep [read: plan §2, §3.1].

**Lanes** are defined in [`07-lanes.md`](07-lanes.md). A lane with no owner gets no work until
someone claims it.

## 2. The numbers behind the table

### 2.1 Why these classes: the 15 largest [read: plan §1.4]

| Class | PRs since 1 Aug (+ maintainer commits) | Landed / not taken at `c6f9678d` | Recurrence |
|---|---:|---|---|
| K06 Windows / MinGW / MSVC portability | 33 (+2) | 32 / 0 | 20 at a new site, 44 files |
| K20 ModelNet store logic slip | 33 (+1) | 26 / 0 | 18 of 32 in the same file |
| K19 stale test / registration gap | 26 (+8) | 24 / 0 | tests only |
| K01 non-atomic or short state-file write | 22 (+0) | 18 / 0 | 10 at a new site in 14 days |
| K14 block download scheduling | 19 (+145) | 12 / 6 | 16 of 17 re-touch a file |
| K09 unvalidated or unbounded input from peers and model peers | 18 (+13) | 15 / 0 | 8 at a new site |
| K13 MatMul attestation / frontier state | 15 (+46) | 3 / 11 | 11 of 12 in the same file |
| K22 build / packaging / release-gate drift | 14 (+13) | 13 / 0 | 6 at a new site |
| K10 CLI/RPC conversion drift | 14 (+1) | 13 / 0 | 7 of 12 in the same file |
| K17 option or mode not honoured | 10 (+1) | 8 / 1 | 6 in the same file |
| K05 wallet-locked / passphrase ordering | 10 (+0) | 9 / 0 | a chain of 4 in 4 days |
| K21 BCP/1 deposit-pool logic | 10 (+0) | 10 / 0 | 7 of 9 in the same file |
| K03 lock order / self-deadlock / race | 9 (+17) | 6 / 2 | 5 at a new site |
| K02 state not persisted across restart | 9 (+6) | 3 / 5 | the MatMul half was not taken |
| K08 path / symlink / jail | 8 (+0) | 8 / 0 | 3 at a new site |

About 93 of the 317 fix PRs belong to classes a CI matrix catches before filing (Windows 33, test
registration 26, packaging 14, RPC conversion 14, macOS 6) [read: plan §0 item 4].

### 2.2 K01 worklist (durability; sites listed)

At `4c7840e9` the file-level rule (a raw write, and no atomic primitive anywhere in the file)
finds 12 files [tested, 12 Nov]:

- ModelNet: `src/modelnet/package_channel.cpp`, `src/modelnet/import_coordinator.cpp`,
  `src/modelnet/workspace_git.cpp`, `src/modelnet/swarm_evolution.cpp`,
  `src/modelnet/obs01/obs01.cpp`, `src/modelnet/acc04/acc04.cpp`
- Wallet: `src/wallet/wallet.cpp`, `src/wallet/dump.cpp`, `src/wallet/rpc/labels.cpp`
- Node: `src/node/blockstorage.cpp`, `src/node/attested_utxo_snapshot.cpp`, `src/init.cpp`

Two more the file-level rule cannot see, because their files also contain an atomic primitive
[read]:
- `src/modelnet/realm_channel.cpp:1280`: one direct `std::ofstream` write left.
- `src/modelnet/capability_bytes.cpp:515-516`: a raw `.gen` sidecar write (`std::ofstream`) after
  an fsynced main file.

The shared helper is `WriteBinaryFileAtomically` (`src/util/readwritefile.h:30`, added by #576):
temporary file, checked write and close, `RenameOver`. It has no fsync of the file or the
directory yet; the sweep adds both [read: `src/util/readwritefile.cpp` at `4c7840e9`].
`node/blockstorage.cpp` and `node/attested_utxo_snapshot.cpp` are checked for consensus adjacency
before they go into a sweep; if adjacent, they are evidence ([`07-lanes.md`](07-lanes.md), C-K01).

The count command; paste it and its output into the sweep PR:

```bash
# in a btxchain/btx clone: the K01 worklist at the live head
git fetch origin release-0.34.16
H=$(git rev-parse --short=8 origin/release-0.34.16)
git grep -l -E 'std::ofstream|fopen\([^)]*"w' "$H" -- src/modelnet src/wallet src/node src/rpc src/init.cpp \
  | sed "s/^$H://" | grep -v -E '/test/|_tests?\.cpp|/fuzz/' \
  | while read -r f; do
      git show "$H:$f" | grep -q -E 'WriteBinaryFileAtomically|RenameOver|FileCommit|fsync|std::filesystem::rename|fs::rename|rename\(' || echo "$f"
    done
```

At `4c7840e9` it prints the 12 files above [tested]. It is a file-level filter: read every file it
prints, and read the files it skips that still contain a raw write (the two above).

### 2.3 Static and dynamic baselines (counts only)

All measured at `c6f9678d`; all results are untriaged leads until a person reads the code and
reproduces them [read: plan §1.2, §1.3; [`01-state.md`](01-state.md) §4].

| Tool | Count |
|---|---|
| CodeQL 2.27.4, product code | 1,482 results; 260 outside the maintainability and documentation rules; 150 security-tagged |
| fs-trust (CodeQL) | 133: `path-injection` 81, `world-writable-file-creation` 37, `uncontrolled-process-operation` 7, `user-controlled-bypass` 7, `system-data-exposure` 1 |
| arithmetic width and constant conditions (CodeQL, cppcheck) | 90: `comparison-with-wider-type` 12, `constant-comparison` 60, `containerOutOfBounds` 18; mostly in MatMul stage3 code, so they wait for 0.35 |
| lifetime and initialisation | 120: `uninitMemberVar` 91, `stack-address-escape` 22, `throwInNoexcept` 7 |
| single static results outside MatMul | 5, being triaged |
| cppcheck 2.13, product code | 372 (26 errors, 174 warnings) |
| clang-tidy, the repo's own config | 1,033 warnings |
| TSan | 247 reports, 41 site pairs, 8 classes (5 in product code, 3 test-side) |
| `-Wthread-safety` | 266 warnings (net_processing 84, tests 78, validation 42, node 24, wallet 15) |
| DEBUG_LOCKORDER | 1 inversion in wallet code: known, no deadlock today [inferred], owned by the A-SHIELDED lane's done bar; do not report it again |

Do not re-run these tools to get the baseline again; reuse the results and re-grep only the live
head ([`03-guardrails.md`](03-guardrails.md) §1, item 12).

## 3. Using and changing the registry

- **Before you file:** the eight questions in [`06-pr-gate.md`](06-pr-gate.md) §1. A swept class
  turns a new site into a gate failure: extend the rule, not an instance fix.
- **A new class:** propose it on the board with a two-line pattern; do not file yet. The registry
  editor adds the row by PR.
- **New counts:** a PR that changes a count carries the command, the head it ran on and the date.
  The "Status" column names the head.
- **Review:** one approving review from a `/dev/` CODEOWNER.
- **Security-relevant rows (S)** never get site lists here, not even after a fix lands; cite the
  merged PR instead.
- **When `doc/bug-classes.md` lands upstream:** this file keeps a link and the lane column, and
  upstream wins on any difference.

Sources for this page: [`plan/MASTER-PLAN.md`](plan/MASTER-PLAN.md) §0, §1.2-§1.4, §2, §3.1, §8 and
Verification notes; [`07-lanes.md`](07-lanes.md) §3 (the lanes); the tree at `4c7840e9` as cited.
