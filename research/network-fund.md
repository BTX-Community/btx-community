# BTX Network Fund: Discussion Paper

**Status:** First draft (v0.1) for discussion, completely open to changes and suggestions
**Date:** 3 November 2026
**Author:** dr_chambre (Lars)

> This paper is not a finished concept. It's a collection of ideas meant as a starting point for an open discussion about how BTX can fund its network sustainably. All numbers are suggestions, not requirements. Please challenge, improve and add to it.

---

## 1. Why we need this

BTX has great developers and a growing community. But the network itself (archive nodes, signers, mirrors, DNS seeds, explorers, snapshots) currently depends on a handful of people paying out of their own pockets. Several have already stepped back or are about to.

If this doesn't change, we'll keep ending up in the same situation: people burn out, infrastructure disappears, and the network becomes fragile. The software can be excellent, but without stable and well-run infrastructure, none of it matters.

**Goal:** a fund that finances itself from the network, is fully transparent, and cannot be controlled by any single person.

## 2. Principles

1. **Self-sustaining:** funded by the network, not by a few individuals.
2. **Small:** fractions of BTX, not a "tax" that hurts miners or holders.
3. **Transparent:** every coin in and out is visible on-chain and reported publicly.
4. **Shared control:** no single person (and no two people) can move funds.
5. **Time-limited:** built-in sunset and regular review, not a permanent treasury by default.
6. **Purpose-bound:** money goes primarily to what keeps the network alive.

## 3. Funding sources

### Phase 0: no fork needed (could start immediately)

- **Public donation address** for anyone who wants to support the network.
- **Voluntary pool and tool contributions:** pools, miners and tools (e.g. easyBTX with its existing dev fee) can pledge a small share, such as 0.5–1% of their fees or rewards. Contributors are listed publicly as "network supporters".
- **Bridge and swap partners** (e.g. a future WBTX bridge, OTC desks, swap services) can voluntarily add a tiny fee, such as 0.1%, that goes to the fund.

Note: trades on exchanges happen off-chain, so a fee on them can't be enforced by the protocol. It only works through voluntary partnerships.

### Phase 1: consensus-level funding (requires a hard fork and broad agreement)

- **Block reward share:** a small, fixed percentage of each block subsidy (suggestion: **2–3%**) goes to the fund address, enforced by consensus.
  - Example at the current 20 BTX per block and ~960 blocks per day: 2% = 0.4 BTX per block ≈ 384 BTX per day.
- **Sunset:** the share automatically ends at the next halving (block 525,000) unless the community explicitly renews it.
- **Optional fee share:** a small share of on-chain transaction fees. This won't bring in much today, but it grows with usage.

### Budget cap

Anything above the approved annual budget stays locked in reserve, or is burned if the community prefers, instead of being spent "because it's there".

## 4. Governance: who decides

- **Fund Council of 7 members**, with a **5-of-7 multisig** required for every payout. This is the same model the BTX design docs already recommend for bounty councils.
  - Members come from different areas: devs, infra operators, miners/pools, community.
  - Terms of 12 months, staggered so not everyone changes at once.
- **Conflict of interest rule:** no member can approve a payment to themselves or their own company.
- **Public proposals:** every spending request is posted publicly (e.g. GitHub or forum) with at least **7 days for comments** before the council votes.
- **Small operating payouts** (e.g. monthly infra costs under a fixed limit) can run on a pre-approved budget, but are still reported.
- **Removal:** council members can be replaced by a community vote if trust is broken.

## 5. What the fund pays for (priority order)

1. **Core infrastructure:** archive nodes, signers, trusted mirrors, DNS seeds, explorers, snapshots.
   - Paid based on **verified uptime and performance** via public monitoring, not on trust.
   - Goal: at least 2–3 independent operators per role, across different providers and regions.
2. **Security:** independent code audits, especially for consensus changes, the bridge and wallet code.
3. **Development grants:** for contributors doing sustained work on core, tooling and docs.
4. **Bounties:** for specific tasks and fixes.
5. **Reserve:** at least 12 months of infrastructure costs kept as a buffer.

## 6. Transparency

- Fund addresses are public. Anyone can verify balances on-chain.
- **Monthly report:** income, expenses, recipients, purpose, and links to the transactions.
- **Quarterly review:** budget vs. actual, infrastructure status, upcoming needs.
- All council decisions and votes are documented.

## 7. Possible roadmap

1. **Now:** discuss this paper; set up the donation address and an interim council multisig.
2. **Within 1–2 months:** first voluntary pool and tool pledges; first public report.
3. **Next major release:** prepare a consensus proposal for the block reward share (spec, code, review), then a community and miner signaling period.
4. **Activation** only with clear support, at a fixed block height announced well in advance.
5. **Review** before the halving: renew, adjust or end.

## 8. Risks and open questions

- **Philosophy:** BTX launched without a treasury. A block reward share changes that, which is why it's small, time-limited and requires broad support.
- **Miner acceptance:** miners give up a small share and benefit from a more stable network. This needs to be discussed openly with them.
- **Technical:** does BTX support multisig with its post-quantum (P2MR) addresses, and how would a 5-of-7 setup work in practice?
- **Legal and tax questions:** who legally holds the multisig keys, and what does that mean in their jurisdiction?
- **Capture risk:** the council must not become a closed circle. This is why we need rotation, public proposals and conflict rules.
- **Initial supply:** if there are BTX from the early phase meant for development, their status and use should be made transparent as part of this.
- **Relation to existing efforts:** how does this fit with the community fund initiative already being led by WRITTEN?

## 9. Bottom line

A small, transparent, shared-control fund costs everyone very little and keeps the network from depending on a few people's wallets. I'd rather we grow slowly and steadily on solid ground than wait until the next node goes offline.

I'm happy to help with the infrastructure and monitoring side of this. Looking forward to your feedback, ideas and criticism. 🤝
