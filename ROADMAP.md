# Community Roadmap

**Working document — open for edits.** Add your name, change a line, add a row.
Pull requests welcome; so is saying it in the Growth topic and someone else enters it.

Last updated: 5 November 2026

---

## How this is split, and why

Everything on this list falls into one of two groups, and the difference matters more
than the items themselves.

**Column A is ours.** No permission needed, no dependency on anyone outside this group.
We can start today. If something in column A does not happen, that is on us.

**Column B depends on the core team.** We can prepare for it, we can test it, we cannot
deliver it.

The reason for drawing the line this sharply is a statement from Numair on 5 November 2026:

> "None of this is relevant to whatever you want to do with liquidity, please resolve
> that and let me know when you have real volume and we can discuss."

Read plainly, that is a planning input rather than an insult: no support from the core
team before there is volume. It settles a question this group has been arguing about for
weeks. It also means **column A has to carry itself**, and anything that truly needs
column B should not be scheduled until it lands.

---

## Column A — what we can do ourselves

| # | Item | Why it matters | Status | Owner |
|---|---|---|---|---|
| A1 | **One trading venue.** Agree on a single implementation between the people already building one, instead of four in parallel | Named as the highest-leverage missing piece in the Growth debate. Four to six finished or near-finished implementations exist and none is live | Several candidates built, none released | |
| A2 | **Venue structure and licensing boundary.** Decide custodial vs non-custodial vs licensed operator, and document why the chosen model sits where it sits | This is the stated reason the finished implementations are not shipping. It is a structuring question, not a coding one | Structuring paper in draft: [`research/venue-structure.md`](research/venue-structure.md). Decision still open | dr.chambre |
| A3 | **Community fund.** Multisig, published rules, published address, published spends | Repeatedly asked for since September. Needed before anyone pays for infrastructure or milestones | Discussion paper v0.1 in [`research/network-fund.md`](research/network-fund.md), not implemented | |
| A4 | **btx-community.com.** Front door and maintained link directory, replacing the stale ones | A newcomer currently lands on outdated data and draws the obvious conclusion | Domain ordered, rebuild of btxlinks done, repo public | dr.chambre |
| A5 | **Node and infrastructure.** Archives, signed snapshots, monitoring, alerting for stranded nodes | A stranded node went unnoticed for four days in October. Measurement is in place; alerting is not | Two archives, monitoring and public API live | dr.chambre |
| A6 | **Comms and marketing.** X account, community channel, a single place to send people | Nothing to point at today, and the existing channels are either dead or hostile | Discussed, not started | |
| A7 | **Documentation.** The questions newcomers actually ask, answered once, in writing, with sources | First question is always the deployment reward. See `research/deployment-reward.md` | First document in draft | dr.chambre |
| A8 | **Roles and continuity.** A name against each lane, and more than one person able to push everywhere | Every single-owner service in this ecosystem has failed the same way | This document | |

---

## Column B — what depends on the core team

| # | Item | Why it blocks us | Status | Who follows up |
|---|---|---|---|---|
| B1 | **Wallet support for presigned swap claims (`htlc_presign` / `p2mr_leaf`)** | Ergonomics, not a blocker. Claims can already be signed at funding and completed by anyone on 0.34.15, but only with hand-built transactions; these wallet options make that a normal wallet step | Not in v0.35.0-rc1. In the 0.35 branches and in the v0.34.16 pre-release of 7 November 2026, not release-qualified. What already works and what is still open (relay, fee bumping): [`research/venue-structure.md`](research/venue-structure.md) §2.2 | |
| B2 | **btx.dev: website and whitepaper** | No outward push works while the official site shows a 20-week-old version. Promised repeatedly since September | Not delivered | |
| B3 | **btx.dev: circulating supply figure** | The site states 3,647,340; the chain says 5,356,878.75 — understated by about 32 % on a page that leads with a fixed maximum supply | Reported 5 November 2026, no change | dr.chambre |
| B4 | **A statement on the deployment reward** | The first question every newcomer asks. The specification itself (§8) says the operating policy "should be documented separately and precisely" and it never was | Our own write-up in draft; nothing from the core team | dr.chambre |
| B5 | **Core-team support for liquidity** | Explicitly deferred until there is "real volume" (quote above) | Deferred by the core team | — |

### On B4

`research/deployment-reward.md` is our answer to B4 as far as public data allows. It
establishes what the chain shows: 1,000,000 BTX mined in blocks 1–50,000 during a
consensus-level bootstrap window, moved out through 346 shielded transactions between
March and May 2026, no longer publicly traceable.

Two things it deliberately does **not** do. It makes no allegation, and its main finding
is that this was *not* a hidden premine — the window is in `chainparams.cpp` and described
in the specification. It also corrects two claims this community had wrong, including the
"3.5 hours" figure.

What it cannot establish is listed in its §8, and that part only the holders can close: a
signed statement, a viewing key, or a published destination list. That is the whole of B4.

The two documents belong together. §8 of the fund paper, written on 3 November, already asked
that the status and use of any early-phase supply be made transparent as part of setting up a
fund. The deployment reward write-up is that, as far as public data allows.

---

## How to take something on

Put your name in the Owner column. That is all it means: you are the person others ask
about that line, and the person who says so when it stalls. It is not a title and it is
not exclusive — two names on one row is better than none.

If a row is missing, add it. If a row is wrong, change it. If you think the A/B split is
drawn in the wrong place, move the row and say why in the commit message.
