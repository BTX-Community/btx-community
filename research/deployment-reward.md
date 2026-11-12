# BTX: The 50,000-Block Bootstrap Window and the 1,000,000 BTX Deployment Reward

**A reproducible, source-based account of what the chain actually shows**

**Draft for review** · 4 November 2026
Author: dr-chambre · Operator, BTX Archive 1 & Archive 2 · [btx-monitoring.com](https://btx-monitoring.com)

---

## Why this document exists

The origin of the first 1,000,000 BTX is the first question almost every newcomer asks, and until now there has been no single place to point them to. The project's own specification anticipates this gap. In Section 8 it states:

> "Because this bootstrap mechanism is economically material, its operating policy should be documented separately and precisely for operators evaluating governance risk."
> — *BTX Specification, btx.dev, updated 5 August 2026, Section 8 "Incentive and Distribution"*

That separate document does not exist. This is not it either: an operating policy can only be written by the people who hold the units. What this document does is establish the verifiable facts, so that any discussion starts from the chain rather than from recollection.

**This document makes no allegation.** Several claims circulating in the community turn out to be imprecise, and they are corrected here with the same rigour as everything else. Where public data cannot answer a question, that is stated plainly instead of filled with inference.

Every figure below can be reproduced by anyone in a few minutes. Section 9 shows how.

---

## 1. Summary of findings

| | |
|---|---|
| **Amount** | Exactly 1,000,000 BTX |
| **How** | Mined as ordinary coinbase rewards in blocks 1–50,000, at 20 BTX per block |
| **When** | 23 March 2026, 13:06:53 – 19:29:40 UTC (6 h 22 min 47 s) |
| **Recipient** | A single address, `btx1zx4w8qje…2n7wlq09d5mz` |
| **Mechanism** | A consensus-level "fast-mine" window: 250 ms target spacing and difficulty eased 6×, ending exactly at block 50,000 |
| **Disclosed?** | Yes. Both in the consensus source and in the published specification |
| **Where did it go** | 346 shielded transactions between 25 March and 26 May 2026. The address has held a zero balance since |
| **Traceable further?** | No. Not by any public means, and the shielded pool has since been closed to new entries |
| **Share of maximum supply** | 4.76 % (1 M of 21 M) |
| **Share of all BTX issued to date** | **18.67 %** (1 M of 5,356,878.75 as of 4 Nov 2026) |

**The three things worth knowing:**

1. **This was not a hidden premine.** The bootstrap window is written into the consensus rules and described in the published specification. The community shorthand "instamine" is imprecise: no protocol-level allocation exists, and no administrative mint occurred. The units were produced by ordinary proof of work — under rules that targeted a block every 250 milliseconds instead of every 90 seconds, 360 times the normal pace. Measured, the window ran at one block every 0.46 seconds, about 200 times the normal pace.

2. **The specification's description no longer matches the chain.** The specification, in its 5 August 2026 version, states that these units "are held in a genesis multisig". On-chain, the address had been fully emptied ten weeks earlier, on 26 May 2026, through shielded transactions. Either a different address is meant, or the statement is stale. This cannot be resolved from public data.

3. **The disbursement is not publicly auditable, and no longer can be made so.** The specification says "The chain records both production and subsequent disbursement activity." Production is fully recorded and is reconstructed below. Disbursement is recorded only as 346 shielded transfers, which by construction reveal neither destination nor amount to an outside observer. Shielded appends were disabled at height 125,000 — after these transfers completed — so this trail cannot be reopened by anyone, including the holders, other than by voluntary disclosure.

---

## 2. The bootstrap window, as written in consensus

From `src/kernel/chainparams.cpp` in the public reference implementation [`btxchain/btx`](https://github.com/btxchain/btx), branch `main`, read 4 November 2026:

```cpp
consensus.nPowTargetSpacingFastMs   = 250;      // fast phase: 250 ms per block
// Fast-phase bootstrap scale for heights [0, nFastMineHeight).
consensus.nFastMineDifficultyScale  = 6;
consensus.nPowTargetSpacingNormal   = 90;       // normal phase: 90 s per block
// Mainnet launched with the MatMul bootstrap window ending at 50,000.
// Keep that historical PoW schedule frozen; later hardening work at
// 61,000 must not rewrite already-mined header difficulty history.
consensus.nFastMineHeight           = 50'000;
// ASERT activates at nFastMineHeight. This MUST equal nFastMineHeight.
consensus.nMatMulAsertHeight        = 50'000;
```

In plain terms: for the first 50,000 blocks the protocol targeted **one block every 250 milliseconds** with difficulty eased by a factor of six. From block 50,000 onward the target is **90 seconds**, and per-block ASERT difficulty adjustment begins.

The designed duration of the window is therefore 50,000 × 0.25 s = **12,500 s = 3 h 28 min 20 s**.

> **Correction to a figure circulating in the community.** The often-quoted "50,000 blocks in 3.5 hours" is the *designed* cadence, not the observed one. The window actually took **6 h 22 min 47 s** — about 84 % longer than the target. The 3.5-hour number is not wrong about the design; it is simply not a measurement.

The subsidy itself contains no special case. `GetBlockSubsidy()` in `src/validation.cpp` is a plain halving function with no founder or treasury branch:

```cpp
CAmount GetBlockSubsidy(int nHeight, const Consensus::Params& consensusParams)
{
    int halvings = nHeight / consensusParams.nSubsidyHalvingInterval;
    CAmount nSubsidy = consensusParams.nInitialSubsidy;
    nSubsidy >>= halvings;
    return nSubsidy;
}
```

Initial subsidy 20 BTX, halving interval 525,000 blocks. Both confirmed against the chain: block 1 and block 268,317 each pay 20 BTX.

**One observation on practical competition.** The specification states that "A participant with a connected node and valid work competes on the same issuance surface as every other participant." For blocks 1–50,000 this was true as a rule but had no practical effect: all 50,000 blocks were won by one address, and the public reference repository `btxchain/btx` was created on **7 April 2026** — fifteen days after the window closed. Whether node software was obtainable publicly before 23 March 2026 could not be established from public sources. This is stated as an open question, not as a finding.

---

## 3. The address and its inflows

**Address**
`btx1zx4w8qjeuu4erx89wtnpj9umm0suf8uwkfhf6pv648x7jgd2n7wlq09d5mz`

**scriptPubKey**
`5220355c704b3ce572331cae5cc322f37b7c3893f1d64dd3a0b35539bd243553f3be`
(witness version 2, 32-byte program. The script itself is only revealed when spent, so whether this is in fact a multisig cannot be determined from the output alone.)

**Summary, as indexed at chain tip 268,317 on 4 November 2026:**

| Field | Value |
|---|---|
| Received | 1,000,000.00000000 BTX (10,000,000,000,000,000 sat) |
| Sent | 1,000,000.00000000 BTX |
| Balance | **0** · 0 unspent outputs |
| Transactions | 50,346 |
| First activity | Block 1 |
| Last activity | Block 112,203 |

**The inflows reconcile exactly:**

- 50,000 coinbase payments, one per block, blocks 1 through 50,000 inclusive
- 20 BTX each → 50,000 × 20 = **1,000,000 BTX**
- Every inflow sampled is a coinbase transaction; the highest coinbase height to this address is exactly 50,000
- 50,000 inflows + 346 outflows = 50,346 transactions ✓

**The boundary is clean:**

| Height | Timestamp (UTC) | Payout address | Subsidy |
|---|---|---|---|
| 0 (genesis) | 2026-03-19 00:00:00 | `btx1z47j966y3s…` (different) | 20 BTX |
| 1 | 2026-03-23 13:06:53 | `btx1zx4w8qje…` | 20 BTX |
| 50,000 | 2026-03-23 19:29:40 | `btx1zx4w8qje…` | 20 BTX |
| 50,001 | 2026-03-23 19:30:08 | `btx1z05denkxfq…` (different) | 20 BTX |

Mining moved to a different address at the first block after the window, and that address (`btx1z05denkxfq…`) received 53,760.37 BTX across blocks 50,001–56,899 and now holds a zero balance.

**Two incidental notes.** The genesis block pays to a separate address which holds **20.001 BTX, still unspent**. And there is a gap of 4 days 13 hours between the genesis timestamp (19 March) and block 1 (23 March).

---

## 4. The outflows

All 1,000,000 BTX left the address in **346 transactions**, every one of them shielded.

| | |
|---|---|
| Number of outgoing transactions | 346 |
| Total | 1,000,000.00000000 BTX (reconciles to the satoshi) |
| Shielded | **346 of 346** |
| First outflow | Block 51,898 · 25 March 2026, 04:53:22 UTC |
| Last outflow | Block 112,203 · 26 May 2026, 12:16:27 UTC |
| Elapsed | ≈ 62 days |

**Distribution of amounts:**

| Amount per transaction | Count | Subtotal |
|---|---|---|
| 2,960 BTX | 266 | 787,360 |
| 3,040 BTX | 60 | 182,400 |
| 1,780 BTX | 10 | 17,800 |
| 2,360 BTX | 2 | 4,720 |
| 2,820 BTX | 1 | 2,820 |
| 2,340 BTX | 1 | 2,340 |
| 2,060 BTX | 1 | 2,060 |
| 420 BTX | 1 | 420 |
| 20 BTX | 4 | 80 |
| **Total** | **346** | **1,000,000** |

The pattern is regular and machine-like: uniform tranches, typically three per block, over a two-month period. It is consistent with a scripted, paced transfer rather than with ad-hoc spending.

**What this means for traceability.** A shielded transaction moves value into the SMILE v2 pool. From outside, the destination, the subsequent movements, and the present holders are not determinable. The specification records that the shielded pool is now in wind-down: *"Shielded pool credits and new appends are disabled at height 125000. Public-flow shielding is disabled at height 128000."* These outflows completed at height 112,203, before those boundaries. Since height 199,300 the shielded pool is closed in both directions (`BTX_SHIELDED_POOL_DISABLE_HEIGHT` in `src/kernel/chainparams.cpp`). The trail is therefore closed permanently as far as public analysis is concerned. Only voluntary disclosure by the holders — a viewing key, a signed statement, or a published destination list — could reopen it.

---

## 5. Magnitude, in context

Measured from the author's own archive node via the public [btx-monitoring.com API](https://network.btx-monitoring.com/api/), `data_as_of` 2026-11-04T16:47:25Z:

| Metric | Value |
|---|---|
| Issued so far (actual block rewards) | 5,356,878.75 BTX |
| UTXO set total at height 268,317 | 5,347,004.96 BTX |
| Other allocations | 0 BTX |
| Share of maximum supply issued | 25.51 % |
| Current block reward | 20 BTX |
| Next halving | Block 525,000 (≈ 256,683 blocks away, ~July 2027) |

Against those figures the deployment reward is:

- **4.76 %** of the 21,000,000 maximum supply
- **18.67 %** of all BTX that exists today

Both numbers are correct, and the difference between them is the whole of the disagreement. The project describes the reward as "1/21m", which is accurate about the end state decades away. For anyone assessing concentration today — which is what a listing committee, a custodian or a market maker does — the relevant figure is **18.67 %**, held by a single original recipient and no longer publicly traceable.

For completeness: `econ.supply_other` reads 0, meaning no allocation outside ordinary block rewards has been identified. The deployment reward was block rewards.

---

## 6. What the official documentation says

The specification does document the bootstrap. Section 8, *Incentive and Distribution*, in full on the relevant passage:

> "All ordinary issuance occurs through valid work. Units are not created by administrative allocation at the protocol layer. A participant with a connected node and valid work competes on the same issuance surface as every other participant. **The initial 50,000 blocks are produced at compressed cadence to establish chain depth and seed the network into active use. Units produced during this phase are held in a genesis multisig designated for network formation, including bridge seeding, relay infrastructure, and early market depth. The chain records both production and subsequent disbursement activity.** The intended distinction from a conventional protocol-level pre-allocation is that these units are produced by open work and then managed through explicit on-chain holdings rather than being created outside the issuance process. Because this bootstrap mechanism is economically material, its operating policy should be documented separately and precisely for operators evaluating governance risk."

Elsewhere the same document states:

> "Neutral incentive structure. The issuance rules are uniform. No participant receives units outside the work process by protocol privilege."

That claim is technically accurate: no protocol privilege was used. It is also, read alone, apt to leave a reader unaware that one participant received 18.67 % of today's supply in six hours under a rule set that applied only to that window.

---

## 7. Discrepancies identified

These are stated as observations, each with its source. None of them is evidence of wrongdoing; all of them are the kind of thing a diligence process surfaces and expects an answer to.

**7.1 "Are held" versus a zero balance.**
The specification version dated 5 August 2026 uses the present tense: the units "are held in a genesis multisig". The address that received all 1,000,000 BTX has had a zero balance since 26 May 2026 — ten weeks before that version was published. Either a different address is meant, or the sentence was not updated. Not resolvable from public data.

**7.2 "The chain records … subsequent disbursement activity."**
It records that disbursement occurred, in 346 transactions on specific dates. It does not record to whom or in what amounts, because every one of them was shielded. A reader could reasonably take the sentence to promise more auditability than exists.

**7.3 The published circulating supply is materially understated.**
btx.dev states a circulating supply of **3,647,340**. Measured issuance on 4 November 2026 is **5,356,878.75**. The site understates it by 1,709,538.75 BTX, about 32 %. The same page still presents the project at version **v0.33.2**, while the current release line is 0.34.15. This appears to be staleness rather than anything else, but a public supply figure that is a third too low is a serious item in any assessment.

*Reported to the project on 5 November 2026. The reply was that the figure is not relevant to liquidity. As of that date the page is unchanged.*

**7.4 No separate operating policy exists.**
As of 4 November 2026: `btx.dev/whitepaper` returns HTTP 404. The documentation index links one specification PDF, dated 5 August 2026. The `btxchain/btx` repository (7,233 files) contains no whitepaper, no tokenomics document, and no file describing the deployment reward's governance. The document the specification itself calls for has not been published.

---

## 8. What public data cannot establish

Stated explicitly, so that this document is not read as claiming more than it shows:

- **Who controls the address**, then or now, and under what key arrangement.
- **Where the 1,000,000 BTX went** after entering the shielded pool, and who holds it today.
- **Whether any of it was sold**, in what quantity, to whom, or at what price.
- **Whether the "genesis multisig" in the specification is this address** or a different one.
- **Whether the stated purposes** — bridge seeding, relay infrastructure, early market depth — were in fact what the units were used for. No public evidence contradicts this; none confirms it either.
- **Whether anyone else could realistically have mined** during the bootstrap window.

Each of these could be answered voluntarily by the holders, and none of them can be answered by analysis. That distinction is the single most useful conclusion in this document.

---

## 9. Reproduce this yourself

All of it, in a few minutes, from two public sources and one public repository.

**The address summary**

```
https://btxscan.ninjaraider.com/address/btx1zx4w8qjeuu4erx89wtnpj9umm0suf8uwkfhf6pv648x7jgd2n7wlq09d5mz
```

As JSON, including the transaction history (`limit` caps at 200, `page` is zero-based):

```bash
curl -s "https://btxscan.ninjaraider.com/api/address/btx1zx4w8qjeuu4erx89wtnpj9umm0suf8uwkfhf6pv648x7jgd2n7wlq09d5mz?limit=200&page=0"
```

**The window boundary** — note the payout address changes between 50,000 and 50,001:

```bash
for h in 0 1 50000 50001; do
  curl -s "https://btxscan.ninjaraider.com/api/block/$h" \
  | python3 -c "import json,sys,datetime as d; b=json.load(sys.stdin); print(b['height'], d.datetime.utcfromtimestamp(b['time']).isoformat()+'Z', b['reward']['subsidySat']/1e8, b['reward']['payout'])"
done
```

**The consensus rules**

```bash
curl -s https://raw.githubusercontent.com/btxchain/btx/main/src/kernel/chainparams.cpp \
  | grep -nE "nFastMineHeight|nFastMineDifficultyScale|nPowTargetSpacingFastMs|nPowTargetSpacingNormal|bootstrap window"
```

**Current supply**

```bash
curl -s https://network.btx-monitoring.com/api/v1/status.json \
  | python3 -c "import json,sys; m={x['id']:x for x in json.load(sys.stdin)['metrics']}; [print(k, m[k]['value'], m[k]['unit']) for k in ['econ.supply_mined','econ.supply_other','econ.supply_pct_max','chain.height']]"
```

**The specification**

```
https://btx.dev/BTX-Specifications.pdf   (Section 8, "Incentive and Distribution")
```

---

## 10. An invitation, and a correction policy

This document was written by one person in an afternoon, from public sources, because the question kept being asked and nothing existed to answer it.

If any figure here is wrong, I want to know and I will correct it, with the correction visible rather than quietly folded in. That applies to everyone, and most of all to the people who hold the units: a single signed statement, a viewing key, or a list of destinations would replace most of Section 8 with facts, and would take less effort than this document did.

Until then, this is what the chain shows.

---

## Corrections

Corrections are listed here with their date, rather than folded silently into the text. Every change is also visible as a commit in this repository.

| Date | Section | What changed |
|---|---|---|
| 2026-11-05 | §7.3 | Added that the circulating supply figure was reported to the project on 5 November 2026, and that the page is unchanged as of that date. No figure changed. |
| 2026-11-12 | §1 | "Roughly 300 times faster than it is today" replaced. The figure could not be derived from anything in this document. Now: designed 250 ms vs 90 s per block (360 times), measured 0.46 s per block (about 200 times). Check: `curl -s https://btxscan.ninjaraider.com/api/block/1` and `/api/block/50000` give the timestamps 13:06:53 and 19:29:40 UTC; 22,967 s ÷ 50,000 blocks = 0.459 s; 90 ÷ 0.459 ≈ 196. Difficulty is not used for the comparison because the MatMul algorithm changed at block 185,000. |
| 2026-11-12 | §4 | Added that the shielded pool is closed in both directions since height 199,300. It confirms the finding that the trail is closed; no figure changed. |

If you find an error, open an issue or send a pull request. That applies to everyone, and most of all to the people who hold the units.

---

## Sources

| Source | Accessed | Used for |
|---|---|---|
| btxscan.ninjaraider.com (REST API, node tip 268,317, synced) | 2026-11-04 | Address summary, transaction history, block data |
| network.btx-monitoring.com `/api/v1/status.json` (own archive node, `data_as_of` 16:47:25Z) | 2026-11-04 | Supply, height, network metrics |
| github.com/btxchain/btx, branch `main` (MIT, repository created 2026-04-07) | 2026-11-04 | `chainparams.cpp`, `validation.cpp`, file inventory |
| btx.dev/BTX-Specifications.pdf (9 pages, "updated 5 August 2026", v0.33.2) | 2026-11-04 | Section 8, shielded wind-down, neutrality claim |
| btx.dev (front page and /docs) | 2026-11-04 | Published circulating supply, version, whitepaper availability |

All amounts in BTX unless stated. All times UTC. Figures verified to the satoshi where the source permits.


---
---

# DEUTSCH

> Diese deutsche Fassung ist eine Übersetzung. **Maßgeblich ist der englische Text oben.** Bei Abweichungen gilt die englische Version.

# BTX: Das 50.000-Block-Bootstrap-Fenster und die 1.000.000 BTX Deployment Reward

**Eine nachprüfbare, quellenbasierte Darstellung dessen, was die Kette tatsächlich zeigt**

**Entwurf zur Prüfung** · 4. November 2026
Autor: dr-chambre · Betreiber BTX Archive 1 & Archive 2 · [btx-monitoring.com](https://btx-monitoring.com)

---

## Warum es dieses Dokument gibt

Woher die ersten 1.000.000 BTX stammen, ist die erste Frage fast jedes Neuzugangs – und bis heute gibt es keine Stelle, auf die man ihn verweisen könnte. Die Spezifikation des Projekts benennt diese Lücke selbst. In Abschnitt 8 heißt es:

> „Because this bootstrap mechanism is economically material, its operating policy should be documented separately and precisely for operators evaluating governance risk."
> („Da dieser Bootstrap-Mechanismus wirtschaftlich wesentlich ist, sollte seine Handhabung gesondert und präzise dokumentiert werden, für Betreiber, die das Governance-Risiko bewerten.")
> — *BTX Specification, btx.dev, Stand 5. August 2026, Abschnitt 8 „Incentive and Distribution"*

Dieses gesonderte Dokument existiert nicht. Das hier ist es auch nicht: Eine Handhabungsrichtlinie kann nur schreiben, wer die Einheiten hält. Was dieses Dokument leistet, ist die Feststellung der überprüfbaren Fakten, damit jede Diskussion bei der Kette beginnt und nicht bei Erinnerungen.

**Dieses Dokument erhebt keinen Vorwurf.** Mehrere in der Community kursierende Angaben erweisen sich als ungenau und werden hier mit derselben Sorgfalt korrigiert wie alles andere. Wo öffentliche Daten eine Frage nicht beantworten können, steht das ausdrücklich da, statt durch Vermutung ersetzt zu werden.

Jede Zahl unten lässt sich in wenigen Minuten reproduzieren. Abschnitt 9 zeigt wie.

---

## 1. Ergebnisse auf einen Blick

| | |
|---|---|
| **Menge** | Exakt 1.000.000 BTX |
| **Wie** | Als gewöhnliche Coinbase-Belohnung in den Blöcken 1–50.000, je 20 BTX |
| **Wann** | 23. März 2026, 13:06:53 – 19:29:40 UTC (6 h 22 min 47 s) |
| **Empfänger** | Eine einzige Adresse, `btx1zx4w8qje…2n7wlq09d5mz` |
| **Mechanismus** | Ein im Konsens verankertes „Fast-Mine"-Fenster: 250 ms Zielabstand, Schwierigkeit um Faktor 6 erleichtert, endet exakt bei Block 50.000 |
| **Offengelegt?** | Ja. Sowohl im Konsens-Quellcode als auch in der veröffentlichten Spezifikation |
| **Wohin geflossen** | 346 abgeschirmte (shielded) Transaktionen zwischen 25. März und 26. Mai 2026. Die Adresse hat seitdem Saldo null |
| **Weiter verfolgbar?** | Nein. Mit öffentlichen Mitteln nicht, und der Shielded Pool ist inzwischen für Neueinträge geschlossen |
| **Anteil an der Maximalmenge** | 4,76 % (1 Mio. von 21 Mio.) |
| **Anteil an allen bisher ausgegebenen BTX** | **18,67 %** (1 Mio. von 5.356.878,75 per 4. Nov. 2026) |

**Die drei Punkte, auf die es ankommt:**

1. **Das war kein verdeckter Premine.** Das Bootstrap-Fenster steht in den Konsensregeln und ist in der veröffentlichten Spezifikation beschrieben. Das Schlagwort „Instamine" ist ungenau: Es gab keine Zuteilung auf Protokollebene und keine administrative Erzeugung. Die Einheiten entstanden durch gewöhnlichen Proof of Work – unter Regeln, die einen Block alle 250 Millisekunden statt alle 90 Sekunden vorsahen, das 360-Fache des normalen Tempos. Gemessen lief das Fenster mit einem Block alle 0,46 Sekunden, etwa dem 200-Fachen des normalen Tempos.

2. **Die Beschreibung in der Spezifikation stimmt nicht mehr mit der Kette überein.** Die Spezifikation in der Fassung vom 5. August 2026 sagt, diese Einheiten „are held in a genesis multisig" – würden also in einem Genesis-Multisig gehalten. On-chain war die Adresse zehn Wochen zuvor, am 26. Mai 2026, vollständig geleert worden, über abgeschirmte Transaktionen. Entweder ist eine andere Adresse gemeint, oder die Aussage ist veraltet. Aus öffentlichen Daten nicht auflösbar.

3. **Der Abfluss ist nicht öffentlich prüfbar – und kann es auch nicht mehr werden.** Die Spezifikation sagt: „The chain records both production and subsequent disbursement activity." Die Entstehung ist vollständig aufgezeichnet und wird unten rekonstruiert. Der Abfluss ist nur als 346 abgeschirmte Transfers aufgezeichnet, die einem Außenstehenden konstruktionsbedingt weder Ziel noch Betrag offenlegen. Shielded-Einträge wurden auf Höhe 125.000 deaktiviert – nach Abschluss dieser Transfers. Diese Spur kann daher von niemandem wieder geöffnet werden, auch nicht von den Haltenden, außer durch freiwillige Offenlegung.

---

## 2. Das Bootstrap-Fenster, wie es im Konsens steht

Aus `src/kernel/chainparams.cpp` der öffentlichen Referenzimplementierung [`btxchain/btx`](https://github.com/btxchain/btx), Branch `main`, abgerufen am 4. November 2026:

```cpp
consensus.nPowTargetSpacingFastMs   = 250;      // schnelle Phase: 250 ms pro Block
// Fast-phase bootstrap scale for heights [0, nFastMineHeight).
consensus.nFastMineDifficultyScale  = 6;
consensus.nPowTargetSpacingNormal   = 90;       // normale Phase: 90 s pro Block
// Mainnet launched with the MatMul bootstrap window ending at 50,000.
consensus.nFastMineHeight           = 50'000;
consensus.nMatMulAsertHeight        = 50'000;
```

Im Klartext: Für die ersten 50.000 Blöcke zielte das Protokoll auf **einen Block alle 250 Millisekunden**, bei um den Faktor sechs erleichterter Schwierigkeit. Ab Block 50.000 beträgt der Zielabstand **90 Sekunden**, und die ASERT-Anpassung je Block setzt ein.

Die konstruktive Dauer des Fensters beträgt damit 50.000 × 0,25 s = **12.500 s = 3 h 28 min 20 s**.

> **Korrektur einer in der Community kursierenden Zahl.** Das häufig zitierte „50.000 Blöcke in 3,5 Stunden" ist die *vorgesehene* Taktung, nicht die gemessene. Tatsächlich dauerte das Fenster **6 h 22 min 47 s**, rund 84 % länger als das Ziel. Die 3,5-Stunden-Angabe beschreibt die Konstruktion zutreffend – sie ist nur keine Messung.

Die Subsidy selbst enthält keinen Sonderfall. `GetBlockSubsidy()` in `src/validation.cpp` ist eine reine Halving-Funktion ohne Founder- oder Treasury-Zweig. Initiale Subsidy 20 BTX, Halving-Intervall 525.000 Blöcke – beides gegen die Kette bestätigt: Block 1 und Block 268.317 zahlen je 20 BTX.

**Eine Anmerkung zum tatsächlichen Wettbewerb.** Die Spezifikation hält fest, dass „ein Teilnehmer mit verbundenem Node und gültiger Arbeit auf derselben Ausgabefläche konkurriert wie jeder andere". Für die Blöcke 1–50.000 traf das als Regel zu, hatte aber keine praktische Wirkung: Alle 50.000 Blöcke gingen an eine Adresse, und das öffentliche Referenz-Repository `btxchain/btx` wurde am **7. April 2026** angelegt – fünfzehn Tage nach Schließung des Fensters. Ob vor dem 23. März 2026 Node-Software öffentlich erhältlich war, ließ sich aus öffentlichen Quellen nicht feststellen. Das steht hier als offene Frage, nicht als Befund.

---

## 3. Die Adresse und ihre Zuflüsse

**Adresse**
`btx1zx4w8qjeuu4erx89wtnpj9umm0suf8uwkfhf6pv648x7jgd2n7wlq09d5mz`

**scriptPubKey**
`5220355c704b3ce572331cae5cc322f37b7c3893f1d64dd3a0b35539bd243553f3be`
(Witness Version 2, 32-Byte-Programm. Das Skript wird erst beim Ausgeben offengelegt – ob es sich tatsächlich um ein Multisig handelt, ist aus dem Output allein nicht bestimmbar.)

**Zusammenfassung, indexiert bei Kettenspitze 268.317 am 4. November 2026:**

| Feld | Wert |
|---|---|
| Empfangen | 1.000.000,00000000 BTX |
| Gesendet | 1.000.000,00000000 BTX |
| Saldo | **0** · 0 unverbrauchte Outputs |
| Transaktionen | 50.346 |
| Erste Aktivität | Block 1 |
| Letzte Aktivität | Block 112.203 |

**Die Zuflüsse gehen exakt auf:**

- 50.000 Coinbase-Zahlungen, eine je Block, Blöcke 1 bis einschließlich 50.000
- je 20 BTX → 50.000 × 20 = **1.000.000 BTX**
- Jeder geprüfte Zufluss ist eine Coinbase-Transaktion; die höchste Coinbase-Höhe an diese Adresse ist exakt 50.000
- 50.000 Zuflüsse + 346 Abflüsse = 50.346 Transaktionen ✓

**Die Grenze ist sauber:**

| Höhe | Zeitstempel (UTC) | Payout-Adresse | Subsidy |
|---|---|---|---|
| 0 (Genesis) | 2026-03-19 00:00:00 | `btx1z47j966y3s…` (andere) | 20 BTX |
| 1 | 2026-03-23 13:06:53 | `btx1zx4w8qje…` | 20 BTX |
| 50.000 | 2026-03-23 19:29:40 | `btx1zx4w8qje…` | 20 BTX |
| 50.001 | 2026-03-23 19:30:08 | `btx1z05denkxfq…` (andere) | 20 BTX |

Das Mining wechselte mit dem ersten Block nach dem Fenster zu einer anderen Adresse; diese erhielt 53.760,37 BTX über die Blöcke 50.001–56.899 und hat heute Saldo null.

**Zwei Randnotizen.** Der Genesis-Block zahlt an eine separate Adresse, die **20,001 BTX hält, bis heute unverbraucht**. Und zwischen dem Genesis-Zeitstempel (19. März) und Block 1 (23. März) liegen 4 Tage und 13 Stunden.

---

## 4. Die Abflüsse

Alle 1.000.000 BTX verließen die Adresse in **346 Transaktionen**, jede einzelne abgeschirmt.

| | |
|---|---|
| Ausgehende Transaktionen | 346 |
| Summe | 1.000.000,00000000 BTX (auf das Satoshi genau) |
| Davon shielded | **346 von 346** |
| Erster Abfluss | Block 51.898 · 25. März 2026, 04:53:22 UTC |
| Letzter Abfluss | Block 112.203 · 26. Mai 2026, 12:16:27 UTC |
| Zeitraum | ≈ 62 Tage |

**Verteilung der Beträge:**

| Betrag je Transaktion | Anzahl | Teilsumme |
|---|---|---|
| 2.960 BTX | 266 | 787.360 |
| 3.040 BTX | 60 | 182.400 |
| 1.780 BTX | 10 | 17.800 |
| 2.360 BTX | 2 | 4.720 |
| 2.820 BTX | 1 | 2.820 |
| 2.340 BTX | 1 | 2.340 |
| 2.060 BTX | 1 | 2.060 |
| 420 BTX | 1 | 420 |
| 20 BTX | 4 | 80 |
| **Summe** | **346** | **1.000.000** |

Das Muster ist regelmäßig und maschinell: gleichförmige Tranchen, typischerweise drei je Block, über zwei Monate. Das spricht für einen skriptgesteuerten, getakteten Transfer, nicht für anlassbezogene Ausgaben.

**Was das für die Nachvollziehbarkeit bedeutet.** Eine abgeschirmte Transaktion führt Wert in den SMILE-v2-Pool. Von außen sind Ziel, Weiterbewegungen und heutige Haltende nicht bestimmbar. Die Spezifikation hält fest, dass der Shielded Pool abgewickelt wird: *„Shielded pool credits and new appends are disabled at height 125000. Public-flow shielding is disabled at height 128000."* Diese Abflüsse endeten auf Höhe 112.203, also vor diesen Grenzen. Seit Höhe 199.300 ist der Shielded Pool in beide Richtungen geschlossen (`BTX_SHIELDED_POOL_DISABLE_HEIGHT` in `src/kernel/chainparams.cpp`). Die Spur ist für öffentliche Analyse damit dauerhaft geschlossen. Nur eine freiwillige Offenlegung der Haltenden – ein Viewing Key, eine signierte Erklärung oder eine veröffentlichte Zielliste – könnte sie wieder öffnen.

---

## 5. Größenordnung im Kontext

Gemessen über den eigenen Archive-Node des Autors via öffentlicher [btx-monitoring.com API](https://network.btx-monitoring.com/api/), `data_as_of` 2026-11-04T16:47:25Z:

| Kennzahl | Wert |
|---|---|
| Bisher ausgegeben (tatsächliche Block-Rewards) | 5.356.878,75 BTX |
| UTXO-Set gesamt bei Höhe 268.317 | 5.347.004,96 BTX |
| Sonstige Zuteilungen | 0 BTX |
| Anteil der Maximalmenge ausgegeben | 25,51 % |
| Aktueller Block-Reward | 20 BTX |
| Nächstes Halving | Block 525.000 (≈ 256.683 Blöcke, ca. Juli 2027) |

Gemessen daran ist die Deployment Reward:

- **4,76 %** der Maximalmenge von 21.000.000
- **18,67 %** aller heute existierenden BTX

Beide Zahlen sind richtig, und der Unterschied zwischen ihnen ist der ganze Streitpunkt. Das Projekt beschreibt die Reward als „1/21m" – zutreffend für einen Endzustand in Jahrzehnten. Wer die Konzentration heute bewertet – und genau das tun ein Listing-Komitee, ein Verwahrer oder ein Market Maker –, für den ist **18,67 %** die maßgebliche Zahl, gehalten von einem einzigen ursprünglichen Empfänger und öffentlich nicht mehr nachverfolgbar.

Der Vollständigkeit halber: `econ.supply_other` steht auf 0, es wurde also keine Zuteilung außerhalb gewöhnlicher Block-Rewards festgestellt. Die Deployment Reward *waren* Block-Rewards.

---

## 6. Was die offizielle Dokumentation sagt

Die Spezifikation dokumentiert das Bootstrap durchaus. Abschnitt 8, *Incentive and Distribution*, in der maßgeblichen Passage:

> „All ordinary issuance occurs through valid work. Units are not created by administrative allocation at the protocol layer. […] **The initial 50,000 blocks are produced at compressed cadence to establish chain depth and seed the network into active use. Units produced during this phase are held in a genesis multisig designated for network formation, including bridge seeding, relay infrastructure, and early market depth. The chain records both production and subsequent disbursement activity.** […] Because this bootstrap mechanism is economically material, its operating policy should be documented separately and precisely for operators evaluating governance risk."

An anderer Stelle heißt es im selben Dokument:

> „Neutral incentive structure. The issuance rules are uniform. No participant receives units outside the work process by protocol privilege."

Diese Aussage ist technisch zutreffend: Es wurde kein Protokollprivileg genutzt. Für sich allein gelesen lässt sie einen Leser allerdings leicht in Unkenntnis darüber, dass ein Teilnehmer 18,67 % der heutigen Menge in sechs Stunden erhielt, unter einem Regelwerk, das nur für dieses Fenster galt.

---

## 7. Festgestellte Abweichungen

Als Beobachtungen formuliert, jeweils mit Quelle. Keine davon belegt ein Fehlverhalten; alle sind von der Art, die ein Prüfungsprozess zutage fördert und für die er eine Antwort erwartet.

**7.1 „Are held" gegenüber Saldo null.**
Die Spezifikation vom 5. August 2026 nutzt das Präsens: Die Einheiten „are held in a genesis multisig". Die Adresse, die alle 1.000.000 BTX erhielt, hat seit dem 26. Mai 2026 Saldo null – zehn Wochen vor Veröffentlichung dieser Fassung. Entweder ist eine andere Adresse gemeint, oder der Satz wurde nicht aktualisiert. Aus öffentlichen Daten nicht auflösbar.

**7.2 „The chain records … subsequent disbursement activity."**
Aufgezeichnet ist, *dass* ein Abfluss stattfand, in 346 Transaktionen an bestimmten Daten. Nicht aufgezeichnet ist, an wen und in welcher Höhe, weil jede einzelne abgeschirmt war. Ein Leser darf den Satz durchaus so verstehen, dass mehr Prüfbarkeit besteht, als tatsächlich gegeben ist.

**7.3 Die veröffentlichte Umlaufmenge ist erheblich zu niedrig.**
btx.dev nennt eine Umlaufmenge von **3.647.340**. Die gemessene Ausgabe am 4. November 2026 beträgt **5.356.878,75**. Die Seite weist damit 1.709.538,75 BTX zu wenig aus, rund 32 %. Dieselbe Seite führt das Projekt weiterhin als Version **v0.33.2**, während die aktuelle Release-Linie 0.34.15 ist. Das wirkt wie Veralterung und nicht wie etwas anderes – eine öffentliche Supply-Angabe, die um ein Drittel zu niedrig liegt, ist in jeder Bewertung dennoch ein gravierender Punkt.

*Am 5. November 2026 an das Projekt gemeldet. Die Antwort lautete, die Zahl sei für Liquidität nicht relevant. Zu diesem Datum ist die Seite unverändert.*

**7.4 Es existiert keine gesonderte Handhabungsrichtlinie.**
Stand 4. November 2026: `btx.dev/whitepaper` liefert HTTP 404. Der Dokumentationsindex verlinkt ein Spezifikations-PDF vom 5. August 2026. Das Repository `btxchain/btx` (7.233 Dateien) enthält kein Whitepaper, kein Tokenomics-Dokument und keine Datei zur Governance der Deployment Reward. Das Dokument, das die Spezifikation selbst einfordert, wurde nicht veröffentlicht.

---

## 8. Was öffentliche Daten nicht klären können

Ausdrücklich benannt, damit dieses Dokument nicht so gelesen wird, als behaupte es mehr, als es zeigt:

- **Wer die Adresse kontrolliert**, damals und heute, und unter welcher Schlüsselstruktur.
- **Wohin die 1.000.000 BTX** nach Eintritt in den Shielded Pool geflossen sind und wer sie heute hält.
- **Ob davon etwas verkauft wurde**, in welchem Umfang, an wen und zu welchen Preisen.
- **Ob das „genesis multisig" der Spezifikation diese Adresse ist** oder eine andere.
- **Ob die angegebenen Zwecke** – Bridge-Seeding, Relay-Infrastruktur, frühe Markttiefe – tatsächlich die Verwendung waren. Kein öffentlicher Beleg widerspricht dem; keiner bestätigt es.
- **Ob überhaupt jemand sonst** während des Bootstrap-Fensters realistisch hätte mitminen können.

Jede dieser Fragen könnte von den Haltenden freiwillig beantwortet werden, und keine davon lässt sich durch Analyse beantworten. Diese Unterscheidung ist die nützlichste Erkenntnis dieses Dokuments.

---

## 9. Selbst nachprüfen

Alles davon, in wenigen Minuten, aus zwei öffentlichen Quellen und einem öffentlichen Repository. Die Befehle stehen im englischen Teil, Abschnitt 9, und sind sprachunabhängig.

Kurzfassung der Quellen:

- Adresse: `https://btxscan.ninjaraider.com/address/btx1zx4w8qje…`
- JSON-API: `https://btxscan.ninjaraider.com/api/address/<adresse>?limit=200&page=0`
- Blockgrenze: `https://btxscan.ninjaraider.com/api/block/<höhe>` für 0, 1, 50000, 50001
- Konsensregeln: `https://raw.githubusercontent.com/btxchain/btx/main/src/kernel/chainparams.cpp`
- Aktuelle Supply: `https://network.btx-monitoring.com/api/v1/status.json`
- Spezifikation: `https://btx.dev/BTX-Specifications.pdf`, Abschnitt 8

---

## 10. Eine Einladung, und wie korrigiert wird

Dieses Dokument wurde von einer Person an einem Nachmittag aus öffentlichen Quellen geschrieben, weil die Frage immer wieder gestellt wurde und nichts existierte, das sie beantwortet.

Wenn eine Zahl hier falsch ist, möchte ich das wissen, und ich korrigiere sie – sichtbar, nicht stillschweigend. Das gilt für alle, und besonders für diejenigen, die die Einheiten halten: Eine einzige signierte Erklärung, ein Viewing Key oder eine Zielliste würde den größten Teil von Abschnitt 8 durch Fakten ersetzen – und weniger Aufwand kosten als dieses Dokument.

Bis dahin ist das, was die Kette zeigt.

---

## Korrekturen

Korrekturen stehen hier mit Datum, statt still im Text zu verschwinden. Jede Änderung ist zusätzlich als Commit in diesem Repository sichtbar.

| Datum | Abschnitt | Änderung |
|---|---|---|
| 2026-11-05 | §7.3 | Ergänzt, dass die Umlaufmengen-Angabe am 5. November 2026 an das Projekt gemeldet wurde und die Seite zu diesem Datum unverändert ist. Keine Zahl geändert. |
| 2026-11-12 | §1 | „Rund 300-mal schneller als heute“ ersetzt. Die Zahl ließ sich aus nichts in diesem Dokument herleiten. Jetzt: geplant 250 ms statt 90 s pro Block (360-fach), gemessen 0,46 s pro Block (etwa 200-fach). Prüfung: `curl -s https://btxscan.ninjaraider.com/api/block/1` und `/api/block/50000` liefern 13:06:53 und 19:29:40 UTC; 22.967 s ÷ 50.000 Blöcke = 0,459 s; 90 ÷ 0,459 ≈ 196. Die Schwierigkeit wird nicht verglichen, weil sich der MatMul-Algorithmus ab Block 185.000 geändert hat. |
| 2026-11-12 | §4 | Ergänzt, dass der Shielded Pool seit Höhe 199.300 in beide Richtungen geschlossen ist. Bestätigt den Befund, dass die Spur geschlossen ist; keine Zahl geändert. |

Wer einen Fehler findet, öffnet ein Issue oder schickt einen Pull Request.
