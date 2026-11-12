# BTX Marketing Concept – First Draft / BTX Marketingkonzept – Erster Entwurf

12.11.2026 · dr.chambre

- [English](#english)
- [Deutsch](#deutsch)

---

<a id="english"></a>

# English

*Draft, personal view as a community member, not an official position of the core team.*

## Goal and starting point

The goal is a working two-sided market: more miners producing BTX and more buyers taking those coins off their hands. An exchange listing and investor outreach come second. Real demand has to be visible first.

Starting point (November 2026):

- **Price:** OTC currently around USD 0.06 to 0.09 per BTX (community estimate, no exchange listing).
- **Circulating supply:** about 5 million BTX, roughly a quarter of the 21 million cap ([BTXScan](https://btxscan.io/)). That puts market capitalisation at roughly USD 0.3 to 0.5 million.
- **New supply:** 20 BTX per block, one block every 90 seconds, i.e. about 19,200 BTX per day. At USD 0.06 to 0.09 that is about USD 1,150 to 1,730 of daily selling pressure if miners sell everything.
- **Ways to buy:** OTC and the community board only. No licensed trading venue.

The core logic is a flywheel: buyers make mining worthwhile, mining makes the network more secure, security and transparency build trust, trust brings buyers. This concept works on all four points at once.

## Positioning and key messages

BTX is positioned as “Bitcoin's monetary policy, quantum-safe from day one”. Four messages carry this:

1. **Post-quantum signatures from genesis.** Bitcoin still has to solve this migration; BTX already has. This is the strongest argument for buyers.
2. **Bitcoin's monetary policy.** A maximum of 21 million BTX, issued only through mining, halving every 525,000 blocks.
3. **Early stage.** About a quarter has been mined; the first halving is expected in summer 2027. The countdown is a natural, factual hook.
4. **MatMul PoW on regular GPUs.** Gaming and workstation cards can take part; no ASICs needed.

**Prerequisite before any promotion: transparency on the deployment reward.** Blocks 1 to 50,000 paid 1,000,000 BTX (4.76% of the maximum supply, 18.67% of everything issued so far) to a single address, mined in about six and a half hours, one block every 0.46 seconds instead of every 90, under consensus rules written for exactly that bootstrap window. That was disclosed in the code and the specification, so it was not a hidden premine. But the specification says the coins “are held in a genesis multisig”, while the address has been empty since 26 May 2026: it was paid out in 346 shielded transactions that nobody outside can follow. The separate documentation the specification itself asks for has not been published. Details and the commands to check them: [`research/deployment-reward.md`](deployment-reward.md). At the same time, easybtx.com advertises “no premine”, and minebtx.com reportedly does too (not yet checked).

That claim must not appear in any promotional material without that context. In the narrow sense it is true, but without the context above it is misleading. Instead, the project should explain openly what happened to the 1 million BTX. Reaching out to new buyers without clarifying this hands critics their first headline.

## Target group: miners

Miners join when they can see within two minutes what their card earns and start within ten.

**Who:** GPU miners with idle hardware since the end of Ethereum mining, gamers with strong cards, GPU cloud operators with unused capacity.

| Measure | Content | Owner |
| --- | --- | --- |
| Mining calculator | On btx-monitoring.com: live difficulty from our own node, user-entered power costs, assumptions disclosed | dr.chambre |
| Benchmark table | Hashrate and power draw per GPU model, submitted and checked by the community | Community, bounty |
| Tutorials | “Mine BTX in 10 minutes” with easyBTX and AMDBTX, video and text, DE and EN | Ambassadors |
| Mining channels | Bitcointalk ANN thread, r/gpumining, HiveOS forums, mining Discords | Ambassadors |
| Profitability portals | WhatToMine, hashrate.no, minerstat: check listing requirements (usually a price source is needed) | open |

The message to miners stays factual: what does it cost to produce one BTX, and who buys it today? No promises of returns.

## Target group: buyers

Buyers need three things: to understand why BTX exists, to trust that the information is correct, and a simple, legal way to buy.

**Who:** Bitcoiners concerned about quantum computers, technically minded private investors, people from cryptography, IT security and AI infrastructure.

| Measure | Content | Owner |
| --- | --- | --- |
| Explainer content | “Why Bitcoin has a quantum problem and how BTX solves it”: articles, X threads, podcast appearances | Content team |
| Trust signals | Code audit, verifiable supply, up-to-date website, reachable people, clarified deployment reward | Core team, dr.chambre |
| Way to buy | Point to existing independent OTC providers, no brokering of our own; name custody risks openly | Community |
| Talks | Bitcoin meetups, cryptography and security events: a talk on post-quantum cryptography, not a coin pitch | dr.chambre, ambassadors |

Important on the way to buy: the known OTC desks are unlicensed and some hold customer funds. They are mentioned neutrally, not recommended.

## Content engine

A weekly network report from the monitoring gives a reason to post every week, without marketing language.

Contents of the report:

- Hashrate and difficulty, week over week
- Number of pool workers and active addresses
- Newly issued BTX and circulating supply
- Halving countdown in blocks and days
- Releases and infrastructure news

The report is published on btx-monitoring.com and shared on Telegram and X. A simple content calendar adds one explainer per week (buyers), one mining topic (miners) and the network report.

## Community organisation

The work is spread across many shoulders and paid in BTX from an infra fund. This keeps coins within the community instead of putting them on the market.

| Role | Task | Compensation |
| --- | --- | --- |
| Language ambassadors (DE, EN, ES, PT, Asia) | Translate, run channels, answer questions | BTX bounty per contribution |
| Content team | Explainers, threads, videos | BTX bounty per piece |
| Benchmark testers | Submit GPU measurements | Small BTX bounty per measurement |
| Coordination | Calendar, approval, quality | Voluntary |

Bounty rules: public task list, fixed amounts agreed upfront, payment only after acceptance, monthly disclosure of spending.

## Legal guardrails

All measures remain information and education, not brokering and not price support. This is not legal advice; a short review by a crypto law firm before launch is advisable.

- **No price predictions, no promises of returns**, including on Telegram.
- **Disclose your own holdings** when promoting BTX (“I hold BTX”).
- **Label paid content**, including bounties and influencer posts.
- **No brokering:** do not match buy and sell offers yourself, do not accept orders, do not hold anyone's coins. Under MiCA this requires a licence.
- **No coordinated buying** and no wash trading. At the latest from a listing application, the market manipulation ban under Art. 91 MiCA applies.
- **No misleading statements:** in particular “no premine” only together with the bootstrap window and the 1 million BTX, as long as the deployment reward is unresolved.

## KPIs and measurement

Success is measured by network data, not by price. Almost all of it comes from our own monitoring.

| KPI | Source | Market side |
| --- | --- | --- |
| Hashrate and difficulty | Own node | Miners |
| Number of pool workers | Pool APIs (e.g. minebtx.com) | Miners |
| Active addresses per week | Own node / explorer | Buyers |
| Share of mining rewards held rather than sold | On-chain analysis, if feasible | Both |
| OTC volume | Voluntary figures from desks | Buyers |
| Telegram members and X followers | Platforms | Both |

Targets for 90 days will be set after the first network report, once a baseline exists.

## 90-day roadmap

| Phase | Period | Measures |
| --- | --- | --- |
| **1 Foundation** | Day 1 to 30 | Explain deployment reward · Add context to the premine claim · Mandate and infra fund · Mining calculator live |
| *Gate: transparency established* | | |
| **2 Visibility** | Day 31 to 60 | Weekly report starts · Benchmarks with bounties · Tutorials in DE and EN · Bitcointalk ANN thread |
| *Gate: KPI baseline in place* | | |
| **3 Reach** | Day 61 to 90 | Quantum explainers · Ambassador program · First talks, podcasts · Commission code audit |

Phase 2 starts only once the deployment reward is explained and the premine claim has its context. Without that transparency, any added reach would work against the project.

## Open points and decisions

- [ ] Core team statement on the deployment reward (1 million BTX): use, addresses, rules
- [ ] Add context to “no premine” on easybtx.com, and check whether minebtx.com says the same (site owners' consent needed)
- [ ] Clarify the mandate: does this concept speak for the community working group or for the project?
- [ ] Infra fund: who funds it, who approves bounties, how is it reported?
- [ ] Clarify the budget for a code audit
- [ ] Short legal review of the guardrails

Sources: [BTXScan](https://btxscan.io/), [btx.dev](https://btx.dev/), [BaFin guidance notice on crypto-asset services](https://www.bafin.de/SharedDocs/Veroeffentlichungen/DE/Merkblatt/mb_250103_Kryptowerte_Dienstl.html), own on-chain check of the deployment reward: [`research/deployment-reward.md`](deployment-reward.md).

---

<a id="deutsch"></a>

# Deutsch

*Entwurf, persönliche Sicht als Community-Mitglied, keine offizielle Position des Core-Teams.*

## Ziel und Ausgangslage

Ziel ist ein funktionierender Zwei-Seiten-Markt: mehr Miner, die BTX erzeugen, und mehr Käufer, die ihnen die Coins abnehmen. Börsenlisting und Investorenansprache sind erst der zweite Schritt. Vorher muss echte Nachfrage sichtbar sein.

Ausgangslage (Stand November 2026):

- **Preis:** OTC aktuell etwa 0,06 bis 0,09 USD je BTX (Einschätzung aus der Community, keine Börsennotierung).
- **Umlaufmenge:** rund 5 Mio. BTX, etwa ein Viertel der Maximalmenge von 21 Mio. ([BTXScan](https://btxscan.io/)). Daraus ergibt sich eine Marktkapitalisierung von grob 0,3 bis 0,5 Mio. USD.
- **Neue Menge:** 20 BTX je Block, ein Block alle 90 Sekunden, also rund 19.200 BTX pro Tag. Bei 0,06 bis 0,09 USD sind das etwa 1.150 bis 1.730 USD Tagesverkaufsdruck, wenn die Miner alles verkaufen.
- **Kaufwege:** nur OTC und Community-Board. Kein lizenzierter Handelsplatz.

Die Kernlogik ist ein Schwungrad: Käufer machen Mining lohnend, Mining macht das Netzwerk sicherer, Sicherheit und Transparenz schaffen Vertrauen, Vertrauen bringt Käufer. Das Konzept setzt an allen vier Stellen gleichzeitig an.

## Positionierung und Kernbotschaften

BTX wird als „Bitcoins Geldpolitik, quantensicher von Anfang an“ positioniert. Vier Botschaften tragen das:

1. **Post-Quanten-Signaturen ab Genesis.** Bitcoin muss diese Umstellung noch lösen, BTX hat sie bereits. Das ist das stärkste Argument für Käufer.
2. **Bitcoin-Geldpolitik.** Maximal 21 Mio. BTX, Ausgabe nur über Mining, Halving alle 525.000 Blöcke.
3. **Frühe Phase.** Rund ein Viertel ist gemint, das erste Halving kommt voraussichtlich im Sommer 2027. Der Countdown ist ein natürlicher, faktischer Aufhänger.
4. **MatMul-PoW auf normalen GPUs.** Gaming- und Workstation-Karten können mitmachen, ASICs braucht es nicht.

**Voraussetzung vor jeder Werbung: Transparenz zum Deployment Reward.** Die Blöcke 1 bis 50.000 haben 1.000.000 BTX (4,76 % der Maximalmenge, 18,67 % aller bisher ausgegebenen BTX) an eine einzige Adresse ausgegeben, gemint in rund sechseinhalb Stunden, ein Block alle 0,46 Sekunden statt alle 90, unter Konsensregeln, die genau für dieses Bootstrap-Fenster geschrieben waren. Das stand offen im Code und in der Spezifikation, ein verdeckter Premine war es also nicht. Die Spezifikation sagt aber, die Coins „are held in a genesis multisig“, während die Adresse seit dem 26. Mai 2026 leer ist: Sie wurde in 346 abgeschirmten Transaktionen ausgezahlt, denen niemand von außen folgen kann. Die gesonderte Dokumentation, die die Spezifikation selbst verlangt, ist nicht veröffentlicht. Einzelheiten und die Befehle zum Nachprüfen: [`research/deployment-reward.md`](deployment-reward.md). Gleichzeitig wirbt easybtx.com mit „no premine“, minebtx.com laut Hinweisen ebenfalls (noch nicht geprüft).

Diese Aussage darf in keinem Werbematerial mehr ohne diesen Kontext auftauchen. Im engen Sinn stimmt sie, ohne den Kontext oben ist sie aber irreführend. Stattdessen sollte das Projekt offen erklären, was mit der 1 Mio. BTX geschehen ist. Wer neue Käufer anspricht, ohne das zu klären, liefert Kritikern die erste Schlagzeile.

## Zielgruppe Miner

Miner kommen, wenn sie in zwei Minuten sehen, was ihre Karte verdient, und in zehn Minuten loslegen können.

**Wer:** GPU-Miner mit freier Hardware seit dem Ende des Ethereum-Minings, Gamer mit starken Karten, Betreiber von GPU-Clouds mit ungenutzter Kapazität.

| Maßnahme | Inhalt | Verantwortlich |
| --- | --- | --- |
| Mining-Rechner | Auf btx-monitoring.com: Difficulty live von der eigenen Node, Stromkosten zum Selbsteintragen, offengelegte Annahmen | dr.chambre |
| Benchmark-Tabelle | Hashrate und Verbrauch je GPU-Modell, von der Community eingereicht und geprüft | Community, Bounty |
| Tutorials | „In 10 Minuten BTX minen“ mit easyBTX und AMDBTX, als Video und Text, DE und EN | Botschafter |
| Mining-Kanäle | Bitcointalk-ANN-Thread, r/gpumining, HiveOS-Foren, Mining-Discords | Botschafter |
| Profitabilitätsportale | WhatToMine, hashrate.no, minerstat: Aufnahmebedingungen prüfen (meist ist eine Preisquelle nötig) | offen |

Die Botschaft an Miner bleibt sachlich: Was kostet ein BTX in der Herstellung, und wer kauft ihn heute ab? Keine Renditeversprechen.

## Zielgruppe Käufer

Käufer brauchen drei Dinge: verstehen, warum BTX existiert, darauf vertrauen, dass die Angaben stimmen, und einen einfachen legalen Kaufweg.

**Wer:** Bitcoiner mit Sorge um Quantencomputer, technisch interessierte Privatanleger, Leute aus Kryptografie, IT-Sicherheit und KI-Infrastruktur.

| Maßnahme | Inhalt | Verantwortlich |
| --- | --- | --- |
| Erklär-Content | „Warum Bitcoin ein Quantenproblem hat und wie BTX es löst“: Artikel, X-Threads, Podcast-Auftritte | Content-Team |
| Vertrauenssignale | Code-Audit, verifizierbare Umlaufmenge, aktuelle Webseite, ansprechbare Personen, geklärter Deployment Reward | Core-Team, dr.chambre |
| Kaufweg | Verweis auf bestehende unabhängige OTC-Anbieter, keine eigene Vermittlung; Risiken der Verwahrung offen benennen | Community |
| Vorträge | Bitcoin-Meetups, Kryptografie- und Security-Events: Vortrag über Post-Quanten-Kryptografie, kein Coin-Pitch | dr.chambre, Botschafter |

Wichtig beim Kaufweg: Die bekannten OTC-Desks sind nicht lizenziert und teils verwahrend. Sie werden neutral genannt, nicht empfohlen.

## Content-Motor

Ein wöchentlicher Netzwerkbericht aus dem Monitoring liefert jede Woche einen Anlass für Posts, ohne Werbesprache.

Inhalt des Berichts:

- Hashrate und Difficulty im Wochenvergleich
- Anzahl der Pool-Worker und aktive Adressen
- Neu ausgegebene BTX und Umlaufmenge
- Halving-Countdown in Blöcken und Tagen
- Releases und Infrastruktur-Neuigkeiten

Der Bericht erscheint auf btx-monitoring.com und wird in Telegram und auf X geteilt. Dazu kommt ein einfacher Content-Kalender: pro Woche ein Erklärstück (Käufer), ein Mining-Thema (Miner) und der Netzwerkbericht.

## Community-Organisation

Die Arbeit wird auf mehrere Schultern verteilt und aus einem Infra-Fonds in BTX vergütet. Das bindet Coins in der Community statt sie auf den Markt zu bringen.

| Rolle | Aufgabe | Vergütung |
| --- | --- | --- |
| Sprach-Botschafter (DE, EN, ES, PT, Asien) | Übersetzen, Kanäle betreuen, Fragen beantworten | BTX-Bounty je Beitrag |
| Content-Team | Erklärstücke, Threads, Videos | BTX-Bounty je Stück |
| Benchmark-Tester | GPU-Messungen einreichen | kleine BTX-Bounty je Messung |
| Koordination | Kalender, Freigabe, Qualität | ehrenamtlich |

Regeln für Bounties: öffentliche Liste der Aufgaben, feste Beträge vorab, Auszahlung erst nach Abnahme, monatliche Offenlegung der Ausgaben.

## Rechtliche Leitplanken

Alle Maßnahmen bleiben Information und Aufklärung, keine Vermittlung und keine Kurspflege. Das ist keine Rechtsberatung; vor dem Start ist eine kurze Prüfung durch eine Kryptorecht-Kanzlei sinnvoll.

- **Keine Kursprognosen, keine Renditeversprechen**, auch nicht in Telegram.
- **Eigenen Besitz offenlegen**, wenn man für BTX wirbt („Ich halte BTX“).
- **Bezahlte Beiträge kennzeichnen**, auch Bounties und Influencer-Posts.
- **Keine Vermittlung:** Kauf- und Verkaufsangebote nicht selbst zusammenführen, keine Orders annehmen, nichts verwahren. Das ist nach MiCA erlaubnispflichtig.
- **Keine abgesprochenen Kaufaktionen** und kein Wash Trading. Spätestens ab einem Listing-Antrag gilt das Marktmanipulationsverbot nach Art. 91 MiCA.
- **Keine irreführenden Aussagen:** insbesondere „no premine“ nur zusammen mit dem Bootstrap-Fenster und der 1 Mio. BTX, solange der Deployment Reward nicht geklärt ist.

## KPIs und Messung

Erfolg wird an Netzwerkdaten gemessen, nicht am Kurs. Fast alles liefert das eigene Monitoring.

| KPI | Quelle | Seite des Marktes |
| --- | --- | --- |
| Hashrate und Difficulty | eigene Node | Miner |
| Anzahl Pool-Worker | Pool-APIs (z. B. minebtx.com) | Miner |
| Aktive Adressen pro Woche | eigene Node / Explorer | Käufer |
| Anteil gehaltener statt verkaufter Mining-Erträge | On-Chain-Auswertung, sofern machbar | beide |
| OTC-Volumen | freiwillige Angaben der Desks | Käufer |
| Mitglieder Telegram und Follower X | Plattformen | beide |

Zielwerte für 90 Tage werden nach dem ersten Netzwerkbericht festgelegt, wenn eine Basislinie existiert.

## 90-Tage-Fahrplan

| Phase | Zeitraum | Maßnahmen |
| --- | --- | --- |
| **1 Fundament** | Tag 1 bis 30 | Deployment Reward erklären · Premine-Aussage um Kontext ergänzen · Mandat und Infra-Fonds · Mining-Rechner online |
| *Gate: Transparenz hergestellt* | | |
| **2 Sichtbarkeit** | Tag 31 bis 60 | Wochenbericht startet · Benchmarks mit Bounties · Tutorials DE und EN · Bitcointalk-ANN-Thread |
| *Gate: KPI-Basislinie steht* | | |
| **3 Reichweite** | Tag 61 bis 90 | Quanten-Erklärstücke · Botschafter-Programm · Erste Vorträge, Podcasts · Code-Audit beauftragen |

Phase 2 beginnt erst, wenn der Deployment Reward erklärt und die Premine-Aussage um ihren Kontext ergänzt ist. Ohne diese Transparenz würde jede Reichweite gegen das Projekt arbeiten.

## Offene Punkte und Entscheidungen

- [ ] Erklärung des Core-Teams zum Deployment Reward (1 Mio. BTX): Verwendung, Adressen, Regeln
- [ ] „no premine“ auf easybtx.com um Kontext ergänzen und prüfen, ob minebtx.com dasselbe sagt (Zustimmung der Seitenbetreiber nötig)
- [ ] Mandat klären: Spricht das Konzept für die Community-Arbeitsgruppe oder für das Projekt?
- [ ] Infra-Fonds: Wer füllt ihn, wer gibt Bounties frei, wie wird berichtet?
- [ ] Budget für Code-Audit klären
- [ ] Kurze anwaltliche Prüfung der Leitplanken

Quellen: [BTXScan](https://btxscan.io/), [btx.dev](https://btx.dev/), [BaFin-Merkblatt Kryptowerte-Dienstleistungen](https://www.bafin.de/SharedDocs/Veroeffentlichungen/DE/Merkblatt/mb_250103_Kryptowerte_Dienstl.html), eigene On-Chain-Prüfung des Deployment Rewards: [`research/deployment-reward.md`](deployment-reward.md).
