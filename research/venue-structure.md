# BTX: Venue Structure and the Licensing Boundary

**What a "DEX" can actually be on a UTXO chain, where the regulatory line runs, and which models are still open to us**

**Draft for discussion** · 6 November 2026
Author: dr-chambre · Operator, BTX Archive 1 & Archive 2 · [btx-monitoring.com](https://btx-monitoring.com)

---

## What this is, and what it is not

This is roadmap item **A2**: decide custodial vs non-custodial vs licensed operator, and write down why the chosen model sits where it sits.

**This is not legal advice, and I am not a lawyer.** I work in contract and technical compliance for banks connecting to exchanges and brokers, which means I am used to mapping a technical design onto a regulatory perimeter and finding the questions a lawyer has to answer. That mapping is what this document is. Section 9 lists the questions that actually need a lawyer, so that when someone pays for one, the money buys answers instead of an introduction.

It is written because four to six people in this group have each built a venue, none has shipped, and the stated reason is not technical. If the reason is structural, it should be written down once rather than re-litigated in chat every fortnight.

**Nothing here argues against building.** It argues for deciding which thing we are building before four of them are finished.

---

## 1. The decision, in one page

| | |
|---|---|
| **What BTX can support natively** | Cross-chain atomic swaps via HTLC. Not an AMM — there is no virtual machine to hold a pool |
| **What the current pin already supports** | The claim can be signed when the swap is funded, and any third party without keys can complete and broadcast it later. Settlement does not need either party online with a node and a wallet. Still open: who relays the claim, and how its fee gets bumped |
| **The regulated part** | Not the swap. The **matching layer** — whatever brings buyers and sellers together and produces a price |
| **Why non-custodial is not a safe harbour** | "Operation of a trading platform" is defined by bringing together third-party buying and selling interests in a system that results in a contract. Holding assets is not part of the test |
| **The decentralisation exemption** | A single recital, undefined in the operative text, and currently being narrowed rather than widened |
| **Territorial reach** | Market-place principle. A non-EU seat does not remove EU obligations, and MiCA has no third-country passport |
| **Open models** | Four. They are set out in section 5 and they are mutually exclusive in practice |
| **The one thing that must not happen by accident** | Building a fund that takes a fee from the venue *and* relying on the decentralisation exemption for that venue. See section 6 |

---

## 2. What we mean by "DEX"

The word is used in this group for three different architectures with very different consequences. Separating them is most of the work.

### 2.1 AMM / smart-contract DEX — not available on BTX

The Uniswap model: a contract holds a pool of two assets, price follows a formula such as `x · y = k`, liquidity providers deposit, traders swap against the pool. No counterparty matching is needed because the pool is always the counterparty.

This requires a general-purpose virtual machine. **BTX is a UTXO chain in the Bitcoin lineage and has none.** There is no place for such a pool to exist. When someone in this group says "DEX" and pictures Uniswap, they are picturing something that cannot be built natively on this chain.

This is worth stating plainly because it silently shapes every other discussion. Expectations formed on Ethereum do not transfer.

### 2.2 Cross-chain atomic swap via HTLC — the one BTX supports

A hash time-locked contract lets two parties on two chains exchange assets with no custodian and no trust. Alice holds BTX, Bob holds BTC:

1. Alice draws a secret `s` and computes `h = SHA256(s)`
2. Alice locks her BTX in an output with two spending paths: Bob may spend it by presenting `s`, or Alice may reclaim it after a timelock `T_A` (say 48 h)
3. Bob builds the mirror structure on the BTC side with the same `h` and a **shorter** timelock `T_B` (say 24 h)
4. Alice claims Bob's BTC, which forces her to reveal `s` on the BTC chain
5. Bob reads `s` from that chain and claims the BTX before `T_A` expires

Either both legs settle or both refund. At no point does anyone hold anyone else's funds. The asymmetry of the timelocks is what makes it safe: the party who commits first must have the longer window, so that the party who moves second cannot run out the clock.

**What the current pin already supports.** An earlier version of this paragraph said that without 0.35 both parties must stay online with a full node and an unlocked wallet for the whole window, and that this gated the non-custodial path. That is wrong; see Corrections.

The `htlc_sha256` claim leaf commits to `SHA256(x)`, a 32-byte digest, and never to `x` itself. The claim can therefore be signed as soon as the swap is funded, and any third party without keys can later splice the real preimage into that same transaction and broadcast it. Oth measured this with three variants: (A) the claim with a placeholder preimage is rejected, (B) the same claim with the real `x` spliced in, signature untouched, is accepted, (C) the same splice with a wrong `x` is rejected. The signatures were byte-identical. Three qualifications apply to that measurement: it ran on regtest with `testmempoolaccept`, so no funds moved; the presigned artefact his venue actually ships is the refund and recovery side (`apps/web/lib/recovery-kit.ts`), not the claim; and the `htlc_presign` RPC that produces such claims from the wallet is not in v0.35.0-rc1. repch1c measured the same behaviour on 12 October against a 0.34.15 build.

P2MR leaves, `htlc_sha256` among them, are live on 0.34.15, the production pin. What the newer code adds is not the leaf type but two `walletprocesspsbt` options: `p2mr_leaf` (choose the leaf) and `htlc_presign`. 0.34.15 rejects both as unknown keys. Checked in the source on 7 November 2026: `htlc_presign` is in the branches `btx-035/lab`, `btx-035/swarm` and `release-0.34.16` and in the v0.34.16 pre-release of the same day (Linux x86_64 only, not release-qualified), but not in v0.35.0-rc1; that pre-release also lets `finalizepsbt` take preimages. The pull request that first proposed this, #410, was closed without merging.

What remains is a relay and uptime problem, not a key-custody problem. Someone has to broadcast the completed claim in time, and a completer without keys cannot bump its fee. Mitigations exist: fee-ladder bidding and a keyless claim relayer as described in `docs/HTLC_BUILD_PLAN.md` of Oth's venue, and repch1c's design of two or more watchtowers holding a presigned RBF fee ladder. Roadmap item **B1** is therefore ergonomics, a wallet path to do this without hand-built transactions, and not a prerequisite for the non-custodial path.

### 2.3 Wrapped / bridged — the worst of the three

Lock BTX with a custodian or a bridge, mint wBTX on a chain that has a VM, trade it on a real AMM there.

It works, and it is the fastest route to visible liquidity. It is also the only one of the three that unambiguously creates a custody relationship, with everything that follows from that: authorisation, segregation, liability for loss, and a single point of failure holding the entire bridged supply. A project whose own community is still asking who controls what should not answer that question by creating a new thing that controls everything.

### 2.4 The matching layer — the part that gets forgotten

None of the above tells you **how Alice found Bob**, or how they agreed a price.

That function — collecting interest from multiple parties and pairing it — sits off-chain. It is a server, an order book, a frontend, a bot, or a channel with a human in it. It is also, as section 3 sets out, the part that carries the regulatory weight. Teams routinely design an elegant non-custodial settlement layer, bolt a conventional order book on top, and believe the first part protects them from the second. It does not.

---

## 3. Where the regulatory line runs

### 3.1 Custody is not the test

The widespread assumption is: *non-custodial means unregulated*. It is wrong.

MiCA treats "operation of a trading platform for crypto-assets" as its own service. The definition turns on **bringing together multiple third-party purchasing and selling interests in a system that results in a contract**. Nothing in it depends on holding client assets. Being non-custodial avoids the custody service. It does not avoid the platform service.

### 3.2 What makes someone an operator

Read functionally, the indicators are: a hosted frontend, a fee, admin or upgrade keys, a matching engine, control over which pairs are listed, user support, and marketing. No single one is decisive; together they describe an operator. Publishing software that other people run is a different act from running it for them.

### 3.3 The decentralisation exemption, and why it probably does not help

MiCA's carve-out for fully decentralised provision without an intermediary appears in **Recital 22**. Two structural problems with relying on it:

- It is a recital. It guides interpretation; it is not an operative provision, and the regulation never defines "fully decentralised" anywhere in its articles.
- It is being narrowed. In its September 2026 response to the Commission's MiCA review, ESMA flagged the divergence of views on what full decentralisation means and the risk of **"decentralisation washing"**, and asked for a definition at Level 1 with a narrow exemption. It also proposed a new service covering providers that act as an **access point** to DeFi — that is, precisely those who offer an interface through which clients reach a protocol.

The practical reading in current commentary is that the exemption catches very little: not where any identifiable party controls protocol parameters, governance or core infrastructure, and front-end control and upgrade keys are treated as strong indicators that it does not apply.

A project that wants to rely on this has to mean it: no hosted interface, no fee, no governance body, no listing decisions. That is a real option — it is model A in section 5 — but it is an architecture, not a disclaimer.

### 3.4 Germany specifically

Since MiCA applies, crypto-asset services in Germany fall under the **KMAG** (Kryptomärkteaufsichtsgesetz), supervised by BaFin. Providing a crypto-asset service without authorisation is a criminal offence under **§ 46 KMAG**, carrying up to five years' imprisonment, and up to three where the conduct is negligent. BaFin may order immediate cessation and wind-down and may issue a public warning.

The last transitional period ran out on **1 July 2026**. There is no grandfathering left to point at.

*Caveat: the boundary between § 46 KMAG and the older § 54 KWG is not uniformly described in the available commentary, and the question of which applies depends on whether a given activity falls under MiCA at all. This is one for section 9.*

---

## 4. Territorial reach: "we are not in the EU" does not settle it

This group is spread across many jurisdictions, several of them unknown, and at least some participants are in the UAE. That changes who is exposed. It does not change whether the rules apply.

### 4.1 Market-place principle, and no third-country passport

MiCA attaches to providing crypto-asset services **in the Union**, not to where the provider sits. And unlike MiFID II, MiCA has **no third-country regime**: authorisation presupposes a legal person established in a member state with substance there. A provider outside the EU therefore cannot "comply with MiCA" and then serve EU clients. It would have to establish inside the EU. There is no middle option.

### 4.2 Reverse solicitation is narrower than people assume

Article 61 permits a third-country firm to serve an EU client at that client's own exclusive initiative. ESMA's guidelines on it have applied since 27 April 2025 and read it tightly:

- solicitation covers the firm and anyone acting on its behalf or closely linked to it
- it is assessed **per client and per service**, not once and for all
- after a client approaches the firm, only services of the **same type** may be offered
- the firm must keep records showing, for each relationship, that the client initiated it
- the examples of what counts as solicitation extend as far as sponsoring an EU sporting event

Applied here: a message in a public Telegram channel with hundreds of members announcing that a venue is live is solicitation of every EU member of that channel. A community chat is a distribution channel, not a private conversation. Anyone planning to rely on Article 61 should understand that our own group chats would be the first evidence against it.

### 4.3 A non-EU seat is not a rule-free seat

Dubai in particular is frequently treated in crypto circles as an absence of regulation. It is not. Depending on the zone, VARA, the DFSA or ADGM's FSRA apply, each with licensing requirements for exchange and broker-dealer activity and its own marketing rules. Operating an unlicensed venue from there is a different problem from operating one from Frankfurt, not a smaller one.

### 4.4 The asymmetry that actually matters

Law applies territorially; enforcement follows reachability. Those are not the same thing, and the gap between them is where contributors get hurt.

In a structure where the operator is pseudonymous and located abroad, and other participants are named individuals in jurisdictions with functioning supervisors, the named participants are the reachable ones. Three mechanisms, in rising order of how often they are overlooked:

- **Supervisory and criminal.** German criminal law reaches conduct whose effect occurs domestically, so an operator abroad is hard to reach rather than out of scope. More relevant to contributors: **aiding** under § 27 StGB. German case law on "neutral acts" holds that otherwise harmless assistance becomes aiding where the helper knows the principal's conduct is directed at an offence. Linking to a venue one knows to be unauthorised, from a site published under one's own name and address, is not automatically that — but it is the right shape of risk to assess deliberately rather than to discover later.
- **Civil, and most underestimated.** Under German law a claim arises where a protective statute is breached. That § 32 KWG is such a statute is settled case law, and damaged investors have used it to reach individuals personally, without any criminal proceeding and without the regulator being involved. Whether § 46 KMAG will be treated the same way is very likely but not yet decided.
- **Infrastructure.** Domains, hosting, payment providers, app stores and public regulator warnings are all reachable even when a person is not. Whoever appears in that chain under a real name and a real address is the first point of contact.

None of this argues for anonymity. It argues for not standing in a position that one has not consciously chosen.

---

## 5. The models that remain open

| | **A. Protocol only** | **B. Operated, geo-blocked** | **C. Licensed operator** | **D. Status quo** |
|---|---|---|---|---|
| **How it works** | Software published; peers run it and swap directly. No hosted interface, no fee | Hosted order book, non-custodial settlement, EU/DE users excluded | Hosted venue under a CASP authorisation in one member state, passported | No venue of our own; an OTC desk already exists, run by someone outside this group |
| **Who operates it** | Nobody | A named operator, somewhere | A company with capital, staff and an address | Not us |
| **Licensing exposure** | Lowest, but rests on the Recital 22 reading that ESMA is actively narrowing | Depends on the target jurisdiction. EU exposure returns if the block is cosmetic | Compliant by construction | None for us, provided we keep an actual distance |
| **Main obstacle** | Counterparty discovery. Without a matching layer almost nobody finds a trade. Settlement is cheaper than first assumed: the current pin already allows claims signed at funding (section 2.2), so what is left there is relay and fee bumping | The block has to be real and documented. A checkbox is not a block | Cost, capital, substance, time. Needs a company, not a group chat | It is the situation that produced this roadmap |
| **Honest verdict** | The only model consistent with the project's stated values, and the one that most needs someone to solve discovery without becoming an operator | Workable, but someone has to put their name on it and accept that they are the operator | The only model that can serve EU users at scale, and far beyond what this group can currently fund | Not a plan, but a legitimate interim position |

Two observations that follow from the table rather than from preference:

**The models are mutually exclusive in practice.** A protocol that later grows an official frontend and a fee has quietly become model B without anyone deciding so. The decision has to be made before, not discovered after.

**Model A is cheaper than the first version of this paper assumed.** That version reasoned that model A was impractical until 0.35, which pushed towards operating or licensing. The premise does not hold (section 2.2), so that step of the argument falls away; the regulatory reasoning in sections 3 to 6 is unaffected.

**Model A's hard problem is discovery, not settlement.** That is where this group's engineering effort would be best spent, and it is a genuinely interesting problem: how do two people find each other and agree a price without anyone operating a system that brings them together. Anything that solves it without creating an operator is worth more to BTX than a fourth order book.

---

## 6. The collision nobody has named yet

The community fund now has a draft structure. Its fifth element is a mechanism for BTX to accrue to the fund organically — explicitly, fees from a DEX and from pools.

**That mechanism and the decentralisation exemption cannot both be used.**

A fee stream flowing to a fund creates exactly what Recital 22 excludes: an identifiable beneficiary, a revenue stream, and a body deciding how it is spent. Anyone assessing whether an intermediary exists would have the answer handed to them, and would be assessing it at a moment when ESMA has said in writing that it is looking for decentralisation washing.

This is not an argument against the fund, which the project needs, or against fee accrual, which is the right instinct — a fund dependent on repeated personal donations will not last. It is an argument against building both halves independently and discovering the interaction afterwards. Two people are currently designing these two things separately, and both designs are good. The interface between them is where the damage would occur.

Concretely, this has to be decided before either ships: either the venue is operated and licensed and may pay fees to anything, or the venue is unoperated and must not have a fee that accrues to an identifiable body. Sequencing the fund first and the venue later does not avoid the question; it only moves it.

---

## 7. Contributors who are not operators

Most people here will never operate a venue. The line for them is clearer than the chat suggests, and worth stating so that nobody drifts across it by accident.

**Running a node** — validating and relaying — is not a crypto-asset service. No client assets, no orders, no matching. Two caveats worth checking rather than assuming: whether a given role is consensus-privileged in a way that an ordinary archive node is not, and whether anything in the setup stores peer IP addresses, which are personal data regardless of what else the project does.

**Documentation, measurement and the community site** are not financial services. Their real exposures are ordinary ones: a correct imprint, a privacy notice, and the discipline of publishing information rather than recommendations. "Check this before you buy" is information. "Now is a good time to buy" is advice on crypto-assets, which is a regulated service. Where a document makes factual claims about identifiable people or about where money went, the discipline of separating *what the chain shows* from *what follows from it* is not a stylistic preference — it is what keeps the document defensible.

**Linking to a venue** is not operating it. Where the venue is known to be unauthorised, it is still worth deciding consciously whether to link, and if so to put a plain factual note beside it rather than listing it as though it were equivalent to everything else.

The author of this document contributes infrastructure, measurement and documentation. He does not operate a venue, does not hold keys to pooled funds, and takes no fee from either. That is a deliberate position, stated here so that it is on the record rather than assumed.

---

## 8. What the group needs to decide

Five questions. None of them is technical, and none of them can be answered by building something.

1. **Which model from section 5?** A single answer, written down, with the reasoning. Four implementations exist; at most one of them survives this question unchanged.
2. **If an operated model: who is the operator?** A named person or entity, who understands what that means and has accepted it. "The community" cannot be an operator, and pretending otherwise distributes the liability onto whoever is most reachable.
3. **Which users are in scope, and how is that enforced?** If the answer involves excluding a jurisdiction, what exactly is the mechanism, and who can demonstrate afterwards that it worked.
4. **Does the fund take a fee from the venue?** See section 6. Yes or no, before either ships.
5. **Who pays for the legal opinion, and from which budget?** This is the fund's first real test case, and a more useful one than a bounty.

---

## 9. What to ask a lawyer

A retainer spent on "is this legal?" buys a paragraph of hedging. These are the questions that buy answers. The specialism is banking and capital-markets law with MiCA practice.

1. On the facts of model X, does the matching layer constitute operation of a trading platform under MiCA, or reception and transmission of orders, or neither?
2. Does publishing peer-to-peer swap software, with no hosted interface and no fee, fall outside the authorisation requirement — and what specifically would have to change for it to fall inside?
3. For a German-resident contributor who operates nodes and publishes documentation but does not operate a venue: what conduct would constitute aiding under § 27 StGB, and where is the line in the case law on neutral acts?
4. Is § 46 KMAG a protective statute for the purposes of civil damages claims, as § 32 KWG is held to be? What is the exposure of a contributor who is not an operator?
5. For a pooled fund with no legal form: what is the default classification under German law, what is the personal liability of key holders and of board members, and which legal form is appropriate for a fund of this size and purpose?
6. At what point does a fund that receives fee income and distributes it to contributors engage collective-investment regulation?
7. Is geo-blocking by IP, with terms of service and a documented process, sufficient to avoid providing services in the Union, and what evidence must be retained?
8. Which of the above answers change if the operator is established outside the EU?

---

## 10. Sources

Regulatory texts and official guidance:

- Regulation (EU) 2023/1114 (MiCA) — definitions of crypto-asset services, Article 59 (authorisation), Article 61 (reverse solicitation), Recital 22 (decentralisation)
- [ESMA, Guidelines on reverse solicitation under MiCA (ESMA35-1872330276-2030)](https://www.esma.europa.eu/sites/default/files/2025-02/ESMA35-1872330276-2030_Guidelines_on_reverse_solicitation_under_MiCA.pdf) — applicable from 27 April 2025
- [ESMA, Final Report on the Guidelines on reverse solicitation under MiCA (ESMA35-1872330276-1899)](https://www.esma.europa.eu/sites/default/files/2024-12/ESMA35-1872330276-1899_-_Final_report_on_GLs_on_reverse_solicitation_under_MiCA.pdf)
- [§ 46 KMAG (Kryptomärkteaufsichtsgesetz)](https://lxgesetze.de/kmag/46)

Commentary (secondary; law-firm and vendor publications, and they do not agree with each other on every date):

- [ESMA's response to the MiCA review: stablecoins, DeFi access and direct supervisory powers](https://jcsross.substack.com/p/esmas-response-to-the-mica-review)
- [HSF Kramer, note on ESMA's response to the Commission on the MiCA review](https://www.hsfkramer.com/notes/madrid/2026-posts/note-esma-response-ce-mica-october-2026)
- [LegalBison, DeFi protocols under MiCA](https://legalbison.com/blog/defi-protocols-under-mica/)
- [Axis Advisory, Are frontends (interfaces) regulated under MiCA?](https://www.axisadvisory.xyz/blog-posts/are-frontends-interfaces-regulated-under-mica)
- [Clifford Chance, The reverse solicitation exemption under MiCA](https://www.cliffordchance.com/content/dam/cliffordchance/briefings/2025/01/the-reverse-solicitation-exemption-under-mica.pdf)
- [A&O Shearman, ESMA guidelines on reverse solicitation under MiCA](https://finreg.aoshearman.com/ESMA-guidelines-on-reverse-solicitation-under-MiC)
- [Traub Legal, Kryptoverwahrung und Erlaubnispflicht nach MiCAR](https://www.traub.legal/themen/bank-kapitalmarktrecht/kryptoverwahrung-erlaubnispflicht-micar/)
- [gunnercooke, Handel von Kryptowährungen: wann braucht man eine BaFin-Erlaubnis?](https://gunnercookede.com/bafin-erlaubnis-handel-kryptowaehrungen/)

BTX technical sources:

- [`btxchain/btx`](https://github.com/btxchain/btx) — consensus rules; P2MR leaves including `htlc_sha256` live on 0.34.15; the `walletprocesspsbt` options `htlc_presign` and `p2mr_leaf` in the 0.35 branches and the v0.34.16 pre-release
- [`research/network-fund.md`](network-fund.md) — the fund design this document intersects with in section 6
- [`ROADMAP.md`](../ROADMAP.md) — items A1, A2, A3 and B1

Where the commentary conflicts, the conflict is noted in the text rather than resolved. The primary texts govern; everything cited below them is an opinion about those texts, including this document.

---

## Corrections

Corrections are recorded here with their date rather than folded silently into the text, and every change is additionally visible as a commit.

| Date | Section | What changed |
|---|---|---|
| 7 Nov 2026 | 1, 2.2, 5, 10 | The paper said 0.35 was needed so that swap parties need not stay online, and called B1 the item that gates the non-custodial path. Wrong: the `htlc_sha256` leaf commits to a digest, so claims can be signed at funding and completed by a keyless third party on 0.34.15 already. Measured by Oth (regtest, A/B/C splice test) and earlier by repch1c (0.34.15 build, 12 Oct), raised in the group on 6 Nov. What is new in later code is the wallet option `htlc_presign`, not the leaf. B1 is ergonomics, not a gate; model A's settlement side is cheaper than stated. Source check of where `htlc_presign` lives: `gh api 'repos/btxchain/btx/contents/src/wallet/rpc/spend.cpp?ref=<tag or branch>' --jq .content \| base64 -d \| grep -c htlc_presign` gives 0 for v0.34.15 and v0.35.0-rc1, more than 0 for v0.34.16, btx-035/swarm and btx-035/lab |

Corrections are welcome from everyone, and most of all from anyone who can replace an inference here with a citation.

---
---

# DEUTSCH

*Die englische Fassung ist die führende. Diese Übersetzung folgt ihr Abschnitt für Abschnitt.*

---

# BTX: Handelsplatzstruktur und die Erlaubnisgrenze

**Was eine „DEX" auf einer UTXO-Chain überhaupt sein kann, wo die regulatorische Grenze verläuft und welche Modelle uns bleiben**

**Entwurf zur Diskussion** · 6. November 2026
Autor: dr-chambre · Betreiber, BTX Archive 1 & Archive 2 · [btx-monitoring.com](https://btx-monitoring.com)

---

## Was das ist und was nicht

Dies ist Roadmap-Punkt **A2**: entscheiden zwischen verwahrend, nicht-verwahrend und lizenziertem Betreiber, und aufschreiben, warum das gewählte Modell dort sitzt, wo es sitzt.

**Das ist keine Rechtsberatung, und ich bin kein Anwalt.** Ich arbeite in der Vertrags- und IT-Compliance für Banken bei der Anbindung an Handelsplätze und Broker. Das heißt, ich bin es gewohnt, ein technisches Design auf einen regulatorischen Perimeter abzubilden und die Fragen herauszuarbeiten, die ein Anwalt beantworten muss. Genau diese Abbildung ist dieses Dokument. Abschnitt 9 listet die Fragen, für die es wirklich einen Anwalt braucht — damit das Geld, wenn jemand einen bezahlt, Antworten kauft und keine Einführung.

Geschrieben ist es, weil vier bis sechs Leute in dieser Gruppe je einen Handelsplatz gebaut haben, keiner davon live ist, und der genannte Grund kein technischer ist. Wenn der Grund strukturell ist, sollte er einmal aufgeschrieben werden, statt alle zwei Wochen im Chat neu verhandelt zu werden.

**Nichts hier spricht gegen das Bauen.** Es spricht dafür, zu entscheiden, welches Ding wir bauen, bevor vier davon fertig sind.

---

## 1. Die Entscheidung auf einer Seite

| | |
|---|---|
| **Was BTX nativ kann** | Cross-Chain-Atomic-Swaps per HTLC. Keine AMM — es gibt keine VM, die einen Pool halten könnte |
| **Was der aktuelle Pin schon kann** | Der Claim lässt sich beim Funding signieren, und ein beliebiger Dritter ohne Schlüssel kann ihn später vervollständigen und broadcasten. Für das Settlement muss keine Partei mit Node und Wallet online bleiben. Offen bleibt: wer den Claim weiterleitet und wie seine Gebühr erhöht wird |
| **Der regulierte Teil** | Nicht der Swap. Die **Matching-Schicht** — alles, was Käufer und Verkäufer zusammenbringt und einen Preis herstellt |
| **Warum nicht-verwahrend kein sicherer Hafen ist** | „Betrieb einer Handelsplattform" ist definiert über das Zusammenführen von Kauf- und Verkaufsinteressen Dritter in einem System, das zum Vertragsschluss führt. Das Halten von Vermögenswerten kommt in dem Test nicht vor |
| **Die Dezentralisierungsausnahme** | Ein einzelner Erwägungsgrund, im operativen Text nirgends definiert, und derzeit wird er enger gezogen, nicht weiter |
| **Territoriale Reichweite** | Marktortprinzip. Ein Sitz außerhalb der EU beseitigt keine EU-Pflichten, und MiCA kennt keinen Drittstaaten-Passport |
| **Offene Modelle** | Vier. Sie stehen in Abschnitt 5 und schließen einander praktisch aus |
| **Was auf keinen Fall versehentlich passieren darf** | Einen Fund bauen, der eine Gebühr vom Handelsplatz nimmt, **und** sich für diesen Handelsplatz auf die Dezentralisierungsausnahme berufen. Siehe Abschnitt 6 |

---

## 2. Was wir mit „DEX" meinen

Das Wort wird in dieser Gruppe für drei verschiedene Bauformen mit sehr verschiedenen Folgen benutzt. Sie auseinanderzuhalten ist der größte Teil der Arbeit.

### 2.1 AMM / Smart-Contract-DEX — auf BTX nicht verfügbar

Das Uniswap-Modell: Ein Contract hält einen Pool aus zwei Assets, der Preis folgt einer Formel wie `x · y = k`, Liquidity Provider zahlen ein, Trader tauschen gegen den Pool. Es braucht kein Matching, weil der Pool immer die Gegenseite ist.

Das setzt eine universelle virtuelle Maschine voraus. **BTX ist eine UTXO-Chain in der Bitcoin-Linie und hat keine.** Es gibt keinen Ort, an dem so ein Pool existieren könnte. Wer in dieser Gruppe „DEX" sagt und sich Uniswap vorstellt, stellt sich etwas vor, das auf dieser Chain nativ nicht baubar ist.

Das gehört deutlich gesagt, weil es jede weitere Diskussion unbemerkt prägt. Erwartungen, die sich an Ethereum gebildet haben, übertragen sich nicht.

### 2.2 Cross-Chain-Atomic-Swap per HTLC — das, was BTX kann

Ein Hash Time-Locked Contract lässt zwei Parteien auf zwei Chains tauschen, ohne Verwahrer und ohne Vertrauen. Alice hat BTX, Bob hat BTC:

1. Alice zieht ein Geheimnis `s` und bildet `h = SHA256(s)`
2. Alice sperrt ihre BTX in einem Output mit zwei Wegen: Bob kann ihn ausgeben, wenn er `s` vorlegt — oder Alice holt ihn nach einem Timelock `T_A` (etwa 48 h) zurück
3. Bob baut auf der BTC-Seite dasselbe Konstrukt mit demselben `h` und einem **kürzeren** Timelock `T_B` (etwa 24 h)
4. Alice holt sich Bobs BTC und muss dafür `s` auf der BTC-Chain offenlegen
5. Bob liest `s` von dort und holt sich die BTX, bevor `T_A` abläuft

Entweder beide Seiten gehen durch oder beide fallen zurück. In keinem Moment hält jemand fremde Mittel. Die Asymmetrie der Timelocks ist das Sicherheitsmerkmal: Wer zuerst bindet, braucht das längere Fenster, damit die zweite Partei die Uhr nicht gegen ihn laufen lassen kann.

**Was der aktuelle Pin schon kann.** Eine frühere Fassung dieses Absatzes sagte, ohne 0.35 müssten beide Parteien über das ganze Fenster mit Full Node und entsperrter Wallet online bleiben, und das blockiere den nicht-verwahrenden Weg. Das ist falsch; siehe Korrekturen.

Das Claim-Leaf `htlc_sha256` committet auf `SHA256(x)`, einen 32-Byte-Digest, und nie auf `x` selbst. Der Claim lässt sich deshalb schon beim Funding signieren, und ein beliebiger Dritter ohne Schlüssel kann später das echte Preimage in dieselbe Transaktion einsetzen und sie broadcasten. Oth hat das mit drei Varianten gemessen: (A) der Claim mit Platzhalter-Preimage wird abgelehnt, (B) derselbe Claim mit eingesetztem echtem `x`, Signatur unberührt, wird akzeptiert, (C) dasselbe mit falschem `x` wird abgelehnt. Die Signaturen waren byte-identisch. Für diese Messung gelten drei Einschränkungen: Sie lief auf regtest mit `testmempoolaccept`, es wurden keine Mittel bewegt; das vorsignierte Artefakt, das sein Handelsplatz tatsächlich ausliefert, ist die Refund- und Recovery-Seite (`apps/web/lib/recovery-kit.ts`), nicht der Claim; und die RPC `htlc_presign`, die solche Claims aus der Wallet erzeugt, ist nicht in v0.35.0-rc1. repch1c hat dasselbe Verhalten am 12. Oktober gegen einen 0.34.15-Build gemessen.

P2MR-Leaves, darunter `htlc_sha256`, sind auf 0.34.15 live, dem Produktions-Pin. Neu im jüngeren Code ist nicht der Leaf-Typ, sondern zwei Optionen von `walletprocesspsbt`: `p2mr_leaf` (Leaf-Auswahl) und `htlc_presign`. 0.34.15 lehnt beide als unbekannte Keys ab. Im Quellcode geprüft am 7. November 2026: `htlc_presign` steht in den Branches `btx-035/lab`, `btx-035/swarm` und `release-0.34.16` und im Pre-Release v0.34.16 vom selben Tag (nur Linux x86_64, nicht release-qualifiziert), aber nicht in v0.35.0-rc1; dieses Pre-Release lässt `finalizepsbt` außerdem Preimages entgegennehmen. Der Pull Request, der das zuerst vorschlug, #410, wurde ohne Merge geschlossen.

Was bleibt, ist ein Relay- und Uptime-Problem, kein Problem der Schlüsselverwahrung. Jemand muss den vervollständigten Claim rechtzeitig broadcasten, und wer ihn ohne Schlüssel vervollständigt, kann die Gebühr nicht erhöhen. Dafür gibt es Ansätze: Fee-Ladder-Bidding und ein schlüsselloser Claim-Relayer, beschrieben in `docs/HTLC_BUILD_PLAN.md` von Oths Handelsplatz, und repch1cs Entwurf mit zwei oder mehr Watchtowern, die eine vorsignierte RBF-Fee-Ladder halten. Roadmap-Punkt **B1** ist damit Ergonomie, ein Wallet-Weg, das ohne handgebaute Transaktionen zu tun, und keine Voraussetzung für den nicht-verwahrenden Weg.

### 2.3 Wrapped / Bridged — die schlechteste der drei

BTX bei einem Verwahrer oder in einer Bridge sperren, wBTX auf einer Chain mit VM minten, dort auf einer echten AMM handeln.

Das funktioniert und ist der schnellste Weg zu sichtbarer Liquidität. Es ist aber auch das einzige der drei Modelle, das zweifelsfrei ein Verwahrverhältnis erzeugt, mit allem, was daran hängt: Erlaubnis, Trennung der Bestände, Haftung für Verluste und ein Single Point of Failure, der die gesamte gebridgete Menge hält. Ein Projekt, dessen eigene Community noch fragt, wer was kontrolliert, sollte diese Frage nicht dadurch beantworten, dass es etwas Neues schafft, das alles kontrolliert.

### 2.4 Die Matching-Schicht — der Teil, der vergessen wird

Keine der drei Bauformen sagt, **wie Alice Bob gefunden hat** oder wie sie sich auf einen Preis geeinigt haben.

Diese Funktion — Interessen mehrerer Parteien einsammeln und paaren — liegt off-chain. Sie ist ein Server, ein Orderbuch, ein Frontend, ein Bot oder ein Kanal mit einem Menschen darin. Und sie ist, wie Abschnitt 3 zeigt, der Teil mit dem regulatorischen Gewicht. Teams entwerfen regelmäßig eine elegante nicht-verwahrende Settlement-Schicht, setzen ein konventionelles Orderbuch darauf und glauben, der erste Teil schütze sie vor dem zweiten. Tut er nicht.

---

## 3. Wo die Grenze verläuft

### 3.1 Verwahrung ist nicht der Test

Die verbreitete Annahme lautet: *nicht-verwahrend heißt unreguliert*. Sie ist falsch.

MiCA behandelt den „Betrieb einer Handelsplattform für Kryptowerte" als eigene Dienstleistung. Die Definition stellt ab auf das **Zusammenführen von Kauf- und Verkaufsinteressen mehrerer Dritter in einem System, das zum Vertragsschluss führt**. Nichts daran hängt am Halten von Kundenvermögen. Nicht-verwahrend vermeidet die Verwahrdienstleistung. Die Plattformdienstleistung vermeidet es nicht.

### 3.2 Was jemanden zum Betreiber macht

Funktional gelesen sind die Indizien: ein gehostetes Frontend, eine Gebühr, Admin- oder Upgrade-Schlüssel, eine Matching-Engine, Kontrolle über die gelisteten Paare, Nutzersupport und Marketing. Keines ist für sich entscheidend; zusammen beschreiben sie einen Betreiber. Software zu veröffentlichen, die andere betreiben, ist etwas anderes, als sie für andere zu betreiben.

### 3.3 Die Dezentralisierungsausnahme, und warum sie vermutlich nicht trägt

Die MiCA-Ausnahme für vollständig dezentral und ohne Intermediär erbrachte Dienste steht in **Erwägungsgrund 22**. Zwei strukturelle Probleme, sich darauf zu stützen:

- Es ist ein Erwägungsgrund. Er leitet die Auslegung, ist aber keine operative Norm, und die Verordnung definiert „vollständig dezentral" in keinem Artikel.
- Er wird enger gezogen. In ihrer Antwort vom September 2026 zum MiCA-Review der Kommission hat ESMA auf die auseinandergehenden Auffassungen zum Begriff der vollen Dezentralisierung und auf das Risiko von **„decentralisation washing"** hingewiesen und eine Definition auf Level 1 mit enger Ausnahme gefordert. Zusätzlich schlägt sie eine neue Dienstleistung für Anbieter vor, die als **Zugangspunkt** zu DeFi fungieren — also genau für die, die ein Interface bereitstellen, über das Kunden ein Protokoll erreichen.

Die praktische Lesart in der Kommentarliteratur ist, dass die Ausnahme sehr wenig erfasst: nicht dort, wo eine identifizierbare Partei Protokollparameter, Governance oder Kerninfrastruktur kontrolliert, wobei Kontrolle über das Frontend und Upgrade-Schlüssel als starke Gegenindizien gelten.

Wer sich darauf stützen will, muss es ernst meinen: kein gehostetes Interface, keine Gebühr, kein Gremium, keine Listing-Entscheidungen. Das ist eine echte Option — Modell A in Abschnitt 5 — aber es ist eine Architektur, kein Haftungsausschluss.

### 3.4 Deutschland im Besonderen

Seit Geltung von MiCA fallen Kryptowerte-Dienstleistungen in Deutschland unter das **KMAG** (Kryptomärkteaufsichtsgesetz) unter Aufsicht der BaFin. Das Erbringen ohne Zulassung ist nach **§ 46 KMAG** strafbar, mit bis zu fünf Jahren Freiheitsstrafe, bei Fahrlässigkeit bis zu drei. Die BaFin kann die sofortige Einstellung und Abwicklung anordnen und öffentlich warnen.

Die letzte Übergangsfrist ist zum **1. Juli 2026** ausgelaufen. Es gibt keinen Bestandsschutz mehr, auf den man zeigen könnte.

*Einschränkung: Die Abgrenzung zwischen § 46 KMAG und dem älteren § 54 KWG wird in der verfügbaren Kommentarliteratur nicht einheitlich dargestellt, und welche Norm greift, hängt davon ab, ob eine Tätigkeit überhaupt unter MiCA fällt. Das gehört in Abschnitt 9.*

---

## 4. Territoriale Reichweite: „wir sind nicht in der EU" erledigt das nicht

Diese Gruppe verteilt sich über viele Jurisdiktionen, etliche davon unbekannt, und mindestens ein Teil sitzt in den VAE. Das ändert, wer exponiert ist. Es ändert nicht, ob die Regeln gelten.

### 4.1 Marktortprinzip, und kein Drittstaaten-Passport

MiCA knüpft daran an, dass Kryptowerte-Dienstleistungen **in der Union** erbracht werden, nicht daran, wo der Anbieter sitzt. Und anders als MiFID II hat MiCA **kein Drittstaatenregime**: Eine Zulassung setzt eine juristische Person mit Sitz und Substanz in einem Mitgliedstaat voraus. Ein Anbieter außerhalb der EU kann also nicht „MiCA einhalten" und dann EU-Kunden bedienen. Er müsste sich in der EU niederlassen. Dazwischen gibt es nichts.

### 4.2 Reverse Solicitation ist enger, als alle annehmen

Artikel 61 erlaubt einem Drittstaatenunternehmen, einen EU-Kunden auf dessen ausschließliche eigene Initiative zu bedienen. ESMAs Leitlinien dazu gelten seit dem 27. April 2025 und lesen die Ausnahme eng:

- Solicitation erfasst das Unternehmen und jeden, der in seinem Namen oder in enger Verbindung zu ihm handelt
- sie wird **pro Kunde und pro Dienstleistung** geprüft, nicht einmal pauschal
- nach einer Anfrage des Kunden dürfen nur Dienstleistungen **derselben Art** angeboten werden
- das Unternehmen muss je Kundenbeziehung dokumentieren, dass die Initiative vom Kunden ausging
- die Beispiele für Solicitation reichen bis zum Sponsoring einer europäischen Sportveranstaltung

Angewendet auf uns: Eine Nachricht in einem öffentlichen Telegram-Kanal mit mehreren hundert Mitgliedern, die mitteilt, dass ein Handelsplatz live ist, ist Solicitation gegenüber jedem EU-Mitglied dieses Kanals. Ein Community-Chat ist ein Vertriebskanal, kein privates Gespräch. Wer sich auf Artikel 61 stützen will, sollte wissen, dass unsere eigenen Gruppenchats das erste Beweismittel dagegen wären.

### 4.3 Ein Sitz außerhalb der EU ist kein regelfreier Sitz

Besonders Dubai gilt in Kryptokreisen oft als Abwesenheit von Regulierung. Das stimmt nicht. Je nach Zone gelten VARA, die DFSA oder die FSRA im ADGM, jeweils mit Lizenzpflichten für Exchange- und Broker-Dealer-Tätigkeit und eigenen Marketingregeln. Einen unlizenzierten Handelsplatz von dort zu betreiben ist ein anderes Problem als von Frankfurt aus, kein kleineres.

### 4.4 Die Asymmetrie, auf die es ankommt

Recht gilt territorial; Durchsetzung folgt der Erreichbarkeit. Das ist nicht dasselbe, und in der Lücke zwischen beidem kommen Mitwirkende zu Schaden.

In einer Struktur, in der der Betreiber pseudonym und im Ausland sitzt, während andere Beteiligte namentlich bekannt in Jurisdiktionen mit funktionierender Aufsicht leben, sind die Namentlichen die Erreichbaren. Drei Mechanismen, in steigender Reihenfolge danach, wie oft sie übersehen werden:

- **Aufsichts- und Strafrecht.** Deutsches Strafrecht erfasst Verhalten, dessen Erfolg im Inland eintritt; ein Betreiber im Ausland ist also schwer erreichbar, nicht außerhalb des Anwendungsbereichs. Für Mitwirkende relevanter: **Beihilfe** nach § 27 StGB. Die Rechtsprechung zu „neutralen Handlungen" nimmt Beihilfe an, wenn der Helfende weiß, dass das Handeln des Haupttäters auf eine Straftat gerichtet ist. Auf eine Stelle zu verlinken, von der man weiß, dass sie ohne Erlaubnis arbeitet, von einer Seite aus, die unter eigenem Namen und eigener Anschrift erscheint, ist das nicht automatisch — aber es ist die richtige Risikoform, um sie bewusst zu bewerten, statt sie später zu entdecken.
- **Zivilrecht, und am meisten unterschätzt.** Nach deutschem Recht entsteht ein Anspruch, wenn gegen ein Schutzgesetz verstoßen wird. Dass § 32 KWG ein solches ist, ist gefestigte Rechtsprechung, und geschädigte Anleger haben darüber Einzelpersonen persönlich in Anspruch genommen — ohne Strafverfahren und ohne Beteiligung der Aufsicht. Ob § 46 KMAG genauso behandelt wird, liegt sehr nahe, ist aber noch nicht entschieden.
- **Infrastruktur.** Domains, Hosting, Zahlungsdienstleister, App Stores und öffentliche Warnungen der Aufsicht sind erreichbar, auch wenn eine Person es nicht ist. Wer in dieser Kette mit echtem Namen und echter Anschrift steht, ist der erste Anlaufpunkt.

Nichts davon ist ein Argument für Anonymität. Es ist ein Argument dafür, keine Position einzunehmen, die man nicht bewusst gewählt hat.

---

## 5. Die Modelle, die bleiben

| | **A. Nur Protokoll** | **B. Betrieben, geo-blockiert** | **C. Lizenzierter Betreiber** | **D. Status quo** |
|---|---|---|---|---|
| **Funktionsweise** | Software veröffentlicht; Peers betreiben sie und tauschen direkt. Kein gehostetes Interface, keine Gebühr | Gehostetes Orderbuch, nicht-verwahrendes Settlement, EU-/DE-Nutzer ausgeschlossen | Gehosteter Handelsplatz mit CASP-Zulassung in einem Mitgliedstaat, gepasst | Kein eigener Handelsplatz; ein OTC-Desk existiert bereits, betrieben von jemandem außerhalb dieser Gruppe |
| **Wer betreibt** | Niemand | Ein namentlicher Betreiber, irgendwo | Eine Gesellschaft mit Kapital, Personal und Anschrift | Nicht wir |
| **Erlaubnisrisiko** | Am geringsten, stützt sich aber auf die Lesart von Erwägungsgrund 22, die ESMA gerade verengt | Abhängig von der Zieljurisdiktion. EU-Risiko kehrt zurück, wenn die Sperre kosmetisch ist | Konstruktionsbedingt konform | Für uns keines, solange wir echten Abstand halten |
| **Hauptproblem** | Das Finden der Gegenseite. Ohne Matching-Schicht findet fast niemand einen Trade. Das Settlement ist billiger als zuerst angenommen: Der aktuelle Pin erlaubt schon beim Funding signierte Claims (Abschnitt 2.2), dort bleiben Relay und Gebührenerhöhung | Die Sperre muss echt und dokumentiert sein. Eine Checkbox ist keine Sperre | Kosten, Kapital, Substanz, Zeit. Braucht eine Gesellschaft, keinen Gruppenchat | Es ist die Lage, die zu dieser Roadmap geführt hat |
| **Ehrliches Urteil** | Das einzige Modell, das zu den erklärten Werten des Projekts passt, und das, bei dem jemand das Discovery-Problem lösen muss, ohne Betreiber zu werden | Gangbar, aber jemand muss seinen Namen daruntersetzen und akzeptieren, dass er der Betreiber ist | Das einzige Modell, das EU-Nutzer in Breite bedienen kann, und weit jenseits dessen, was diese Gruppe derzeit finanzieren kann | Kein Plan, aber eine legitime Zwischenposition |

Zwei Beobachtungen, die aus der Tabelle folgen und nicht aus Vorliebe:

**Die Modelle schließen einander praktisch aus.** Ein Protokoll, dem später ein offizielles Frontend und eine Gebühr zuwachsen, ist unbemerkt Modell B geworden, ohne dass jemand das entschieden hätte. Die Entscheidung muss vorher fallen, nicht hinterher auffallen.

**Modell A ist billiger, als die erste Fassung dieses Papiers annahm.** Sie folgerte, Modell A sei bis 0.35 nicht praktikabel, und das schob in Richtung Betreiben oder Lizenzieren. Die Prämisse hält nicht (Abschnitt 2.2), dieser Schritt der Argumentation entfällt; die regulatorische Begründung in den Abschnitten 3 bis 6 ist davon nicht berührt.

**Das schwierige Problem von Modell A ist Discovery, nicht Settlement.** Dort wäre der Entwicklungsaufwand dieser Gruppe am besten aufgehoben, und es ist ein wirklich interessantes Problem: Wie finden zwei Menschen einander und einigen sich auf einen Preis, ohne dass jemand ein System betreibt, das sie zusammenbringt? Alles, was das löst, ohne einen Betreiber zu erzeugen, ist für BTX mehr wert als ein viertes Orderbuch.

---

## 6. Die Kollision, die noch niemand benannt hat

Der Community-Fund hat inzwischen eine Entwurfsstruktur. Ihr fünftes Element ist ein Mechanismus, über den BTX dem Fund organisch zufließen — ausdrücklich Gebühren aus einer DEX und aus Pools.

**Dieser Mechanismus und die Dezentralisierungsausnahme sind nicht gleichzeitig nutzbar.**

Ein Gebührenstrom, der einem Fund zufließt, erzeugt genau das, was Erwägungsgrund 22 ausschließt: einen identifizierbaren Begünstigten, einen Einnahmestrom und ein Gremium, das über die Verwendung entscheidet. Wer prüft, ob ein Intermediär existiert, bekäme die Antwort frei Haus geliefert — und zwar zu einem Zeitpunkt, zu dem ESMA schriftlich festgehalten hat, dass sie nach decentralisation washing sucht.

Das ist kein Argument gegen den Fund, den das Projekt braucht, und keines gegen die Gebührenspeisung, die der richtige Instinkt ist — ein Fund, der auf wiederholte Privatspenden angewiesen ist, hält nicht. Es ist ein Argument dagegen, beide Hälften unabhängig zu bauen und die Wechselwirkung danach zu entdecken. Zwei Leute entwerfen diese beiden Dinge gerade getrennt voneinander, und beide Entwürfe sind gut. Der Schaden entstünde an der Schnittstelle.

Konkret muss das entschieden sein, bevor eines von beidem ausgeliefert wird: Entweder der Handelsplatz wird betrieben und ist lizenziert und darf an alles Gebühren zahlen — oder er wird nicht betrieben und darf keine Gebühr haben, die einem identifizierbaren Gremium zufließt. Den Fund zuerst und den Handelsplatz später zu machen, umgeht die Frage nicht, sondern verschiebt sie nur.

---

## 7. Mitwirkende, die keine Betreiber sind

Die meisten hier werden nie einen Handelsplatz betreiben. Für sie ist die Linie klarer, als der Chat vermuten lässt, und sie gehört aufgeschrieben, damit niemand versehentlich darüber hinwegrutscht.

**Einen Node betreiben** — validieren und weiterleiten — ist keine Kryptowerte-Dienstleistung. Keine Kundenmittel, keine Aufträge, kein Matching. Zwei Punkte, die man prüfen statt annehmen sollte: ob eine bestimmte Rolle konsensprivilegiert ist in einer Weise, die ein gewöhnlicher Archive Node nicht ist, und ob im Aufbau irgendwo Peer-IP-Adressen gespeichert werden, die personenbezogene Daten sind, unabhängig davon, was das Projekt sonst tut.

**Dokumentation, Messung und die Community-Seite** sind keine Finanzdienstleistungen. Ihre echten Risiken sind gewöhnliche: ein korrektes Impressum, eine Datenschutzerklärung und die Disziplin, zu informieren statt zu empfehlen. „Prüfe das, bevor du kaufst" ist Information. „Jetzt ist ein guter Einstieg" ist Beratung zu Kryptowerten und damit eine erlaubnispflichtige Dienstleistung. Wo ein Dokument Tatsachenbehauptungen über identifizierbare Personen oder über Mittelverwendung aufstellt, ist die Trennung zwischen *was die Chain zeigt* und *was daraus folgt* keine Stilfrage, sondern das, was das Dokument verteidigungsfähig hält.

**Auf einen Handelsplatz zu verlinken** ist nicht, ihn zu betreiben. Wo bekannt ist, dass er ohne Erlaubnis arbeitet, lohnt es sich dennoch, bewusst zu entscheiden, ob man verlinkt, und wenn ja eine nüchterne Sachnotiz danebenzustellen, statt ihn zu listen, als wäre er allem anderen gleichwertig.

Der Autor dieses Dokuments steuert Infrastruktur, Messung und Dokumentation bei. Er betreibt keinen Handelsplatz, hält keine Schlüssel zu gepoolten Mitteln und nimmt von beidem keine Gebühr. Das ist eine bewusste Position und steht hier, damit sie festgehalten ist statt unterstellt.

---

## 8. Was die Gruppe entscheiden muss

Fünf Fragen. Keine davon ist technisch, und keine lässt sich beantworten, indem man etwas baut.

1. **Welches Modell aus Abschnitt 5?** Eine einzige Antwort, aufgeschrieben, mit Begründung. Es existieren vier Implementierungen; höchstens eine übersteht diese Frage unverändert.
2. **Wenn betrieben: wer ist der Betreiber?** Eine benannte Person oder Gesellschaft, die versteht, was das heißt, und es angenommen hat. „Die Community" kann kein Betreiber sein, und so zu tun verteilt die Haftung auf den jeweils Erreichbarsten.
3. **Welche Nutzer sind im Anwendungsbereich, und wie wird das durchgesetzt?** Wenn die Antwort den Ausschluss einer Jurisdiktion enthält: mit welchem Mechanismus genau, und wer kann hinterher belegen, dass er gewirkt hat.
4. **Nimmt der Fund eine Gebühr vom Handelsplatz?** Siehe Abschnitt 6. Ja oder nein, bevor eines von beidem ausgeliefert wird.
5. **Wer bezahlt das Rechtsgutachten, und aus welchem Topf?** Das ist der erste echte Anwendungsfall des Funds, und ein nützlicherer als eine Bounty.

---

## 9. Was man einen Anwalt fragt

Ein Mandat für „ist das legal?" kauft einen Absatz Absicherung. Diese Fragen kaufen Antworten. Das Fachgebiet ist Bank- und Kapitalmarktrecht mit MiCA-Praxis.

1. Stellt die Matching-Schicht im Sachverhalt des Modells X den Betrieb einer Handelsplattform nach MiCA dar, oder die Annahme und Übermittlung von Aufträgen, oder keines von beidem?
2. Fällt das Veröffentlichen von Peer-to-Peer-Swap-Software ohne gehostetes Interface und ohne Gebühr außerhalb der Erlaubnispflicht — und was genau müsste sich ändern, damit sie hineinfiele?
3. Für einen in Deutschland ansässigen Mitwirkenden, der Nodes betreibt und Dokumentation veröffentlicht, aber keinen Handelsplatz betreibt: Welches Verhalten wäre Beihilfe nach § 27 StGB, und wo verläuft die Grenze in der Rechtsprechung zu neutralen Handlungen?
4. Ist § 46 KMAG ein Schutzgesetz im Sinne des zivilrechtlichen Schadensersatzes, wie es für § 32 KWG anerkannt ist? Wie weit reicht das Risiko eines Mitwirkenden, der nicht Betreiber ist?
5. Für einen gepoolten Fund ohne Rechtsform: Was ist die gesetzliche Einordnung nach deutschem Recht, wie weit reicht die persönliche Haftung von Schlüsselhaltern und Gremienmitgliedern, und welche Rechtsform passt zu einem Fund dieser Größe und dieses Zwecks?
6. Ab welchem Punkt berührt ein Fund, der Gebühreneinnahmen erhält und an Mitwirkende ausschüttet, das Investmentrecht?
7. Genügt Geo-Blocking per IP, mit AGB und dokumentiertem Prozess, um ein Erbringen von Dienstleistungen in der Union zu vermeiden, und welche Nachweise sind aufzubewahren?
8. Welche der vorstehenden Antworten ändern sich, wenn der Betreiber außerhalb der EU ansässig ist?

---

## 10. Quellen

Rechtstexte und amtliche Leitlinien:

- Verordnung (EU) 2023/1114 (MiCA) — Definitionen der Kryptowerte-Dienstleistungen, Artikel 59 (Zulassung), Artikel 61 (Reverse Solicitation), Erwägungsgrund 22 (Dezentralisierung)
- [ESMA, Leitlinien zu Reverse Solicitation unter MiCA (ESMA35-1872330276-2030)](https://www.esma.europa.eu/sites/default/files/2025-02/ESMA35-1872330276-2030_Guidelines_on_reverse_solicitation_under_MiCA.pdf) — anwendbar seit 27. April 2025
- [ESMA, Final Report zu den Leitlinien zu Reverse Solicitation (ESMA35-1872330276-1899)](https://www.esma.europa.eu/sites/default/files/2024-12/ESMA35-1872330276-1899_-_Final_report_on_GLs_on_reverse_solicitation_under_MiCA.pdf)
- [§ 46 KMAG (Kryptomärkteaufsichtsgesetz)](https://lxgesetze.de/kmag/46)

Kommentarliteratur (Sekundärquellen; Kanzlei- und Anbieterveröffentlichungen, die sich nicht in jedem Datum einig sind):

- [ESMAs Antwort zum MiCA-Review: Stablecoins, DeFi-Zugang und direkte Aufsichtsbefugnisse](https://jcsross.substack.com/p/esmas-response-to-the-mica-review)
- [HSF Kramer, Notiz zur ESMA-Antwort an die Kommission zum MiCA-Review](https://www.hsfkramer.com/notes/madrid/2026-posts/note-esma-response-ce-mica-october-2026)
- [LegalBison, DeFi-Protokolle unter MiCA](https://legalbison.com/blog/defi-protocols-under-mica/)
- [Axis Advisory, Sind Frontends unter MiCA reguliert?](https://www.axisadvisory.xyz/blog-posts/are-frontends-interfaces-regulated-under-mica)
- [Clifford Chance, Die Reverse-Solicitation-Ausnahme unter MiCA](https://www.cliffordchance.com/content/dam/cliffordchance/briefings/2025/01/the-reverse-solicitation-exemption-under-mica.pdf)
- [A&O Shearman, ESMA-Leitlinien zu Reverse Solicitation unter MiCA](https://finreg.aoshearman.com/ESMA-guidelines-on-reverse-solicitation-under-MiC)
- [Traub Legal, Kryptoverwahrung und Erlaubnispflicht nach MiCAR](https://www.traub.legal/themen/bank-kapitalmarktrecht/kryptoverwahrung-erlaubnispflicht-micar/)
- [gunnercooke, Handel von Kryptowährungen: wann braucht man eine BaFin-Erlaubnis?](https://gunnercookede.com/bafin-erlaubnis-handel-kryptowaehrungen/)

Technische BTX-Quellen:

- [`btxchain/btx`](https://github.com/btxchain/btx) — Konsensregeln; P2MR-Leaves einschließlich `htlc_sha256` live auf 0.34.15; die `walletprocesspsbt`-Optionen `htlc_presign` und `p2mr_leaf` in den 0.35-Branches und im Pre-Release v0.34.16
- [`research/network-fund.md`](network-fund.md) — der Fund-Entwurf, mit dem dieses Dokument sich in Abschnitt 6 schneidet
- [`ROADMAP.md`](../ROADMAP.md) — Punkte A1, A2, A3 und B1

Wo die Kommentarliteratur sich widerspricht, ist der Widerspruch im Text vermerkt statt aufgelöst. Es gelten die Primärtexte; alles darunter ist eine Meinung über diese Texte, dieses Dokument eingeschlossen.

---

## Korrekturen

Korrekturen werden hier mit Datum festgehalten, statt still in den Text eingearbeitet zu werden, und jede Änderung ist zusätzlich als Commit sichtbar.

| Datum | Abschnitt | Was sich geändert hat |
|---|---|---|
| 7. Nov. 2026 | 1, 2.2, 5, 10 | Das Papier sagte, 0.35 sei nötig, damit Swap-Parteien nicht online bleiben müssen, und nannte B1 den Punkt, der den nicht-verwahrenden Weg blockiert. Falsch: Das Leaf `htlc_sha256` committet auf einen Digest, Claims lassen sich deshalb schon auf 0.34.15 beim Funding signieren und von einem Dritten ohne Schlüssel vervollständigen. Gemessen von Oth (regtest, Splice-Test A/B/C) und zuvor von repch1c (0.34.15-Build, 12. Okt.), eingebracht in der Gruppe am 6. Nov. Neu im späteren Code ist die Wallet-Option `htlc_presign`, nicht das Leaf. B1 ist Ergonomie, keine Voraussetzung; die Settlement-Seite von Modell A ist billiger als dargestellt. Prüfung, wo `htlc_presign` steht: `gh api 'repos/btxchain/btx/contents/src/wallet/rpc/spend.cpp?ref=<Tag oder Branch>' --jq .content \| base64 -d \| grep -c htlc_presign` ergibt 0 für v0.34.15 und v0.35.0-rc1, mehr als 0 für v0.34.16, btx-035/swarm und btx-035/lab |

Korrekturen sind von allen willkommen, besonders von jedem, der eine Schlussfolgerung hier durch eine Fundstelle ersetzen kann.
