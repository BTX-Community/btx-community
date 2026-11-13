# btx-community

Community resources for BTX: a maintained link directory, and documents that answer the
questions newcomers actually ask.

Published at **https://btx-community.com**

---

## Why this exists

The directories and pages that BTX already has are either out of date or held by people who
no longer maintain them. A newcomer lands on stale data and draws the obvious conclusion
about the project. Asking the current owners has not worked.

So this is the attempt to do it in the open, with two rules that follow from the problem:

- **Everything here is public and replaceable.** Fork it, mirror it, take it over. Nothing in
  this repository should work only as long as one person stays interested.
- **More than one person should be able to push.** If you want commit access and will use it,
  ask. That is the point, not a courtesy.

---

## Contents

| Path | What it is |
|---|---|
| [`ROADMAP.md`](ROADMAP.md) | What we can do ourselves and what depends on the core team, with a column to put your name against a lane. Open for edits. |
| [`research/deployment-reward.md`](research/deployment-reward.md) | The 50,000-block bootstrap window and the 1,000,000 BTX deployment reward. Chain-verified, bilingual (EN leading, DE translation). **Draft — under review.** |
| [`research/network-fund.md`](research/network-fund.md) | How the network could fund its own infrastructure: voluntary contributions now, a small block-reward share later, 5-of-7 multisig, payouts on verified uptime. **Discussion paper v0.1.** |
| [`research/venue-structure.md`](research/venue-structure.md) | What a "DEX" can be on a UTXO chain, where the licensing boundary runs, and the four models still open to us. Bilingual (EN leading, DE translation). **Draft for discussion — not legal advice.** |
| [`dev/`](dev/) | **Become a BTX dev.** How to work on the node software so that a change can be merged, for people and for the AI tools they use: method, build and test recipes (coverage included), the gate before an upstream pull request, open lanes with a claimable owner column, an exam with known answers, and a lessons loop. Entry file for agents: [`dev/AGENTS.md`](dev/AGENTS.md). **Living document.** |
| [`site/`](site/) | The website btx-community.com: a start page by audience, pages for learning, the network and development, the link directory and the documents, rebuilt from the original [`vanities/btxlinks`](https://github.com/vanities/btxlinks), which stopped being updated in August 2026. Content in `site/content/`; see [CONTRIBUTING](CONTRIBUTING.md#changing-the-website). |
| [`deploy/`](deploy/) | How the website runs and gets published after a merge. |

---

## How figures in these documents are produced

Nothing here is quoted from a chat or from memory. Every number is measured against a source
that anyone can query, and the commands are printed in the document itself so that a reader
can reproduce it rather than trust it.

The sources used so far:

| Source | What it answers |
|---|---|
| `btxscan.ninjaraider.com/api/` | Address balances and history, block data, payout addresses |
| `network.btx-monitoring.com/api/v1/status.json` | Supply, chain height, network metrics, measured from an archive node |
| `github.com/btxchain/btx` | Consensus rules as written in the reference implementation |
| `btx.dev/BTX-Specifications.pdf` | What the project itself documents |

Where public data cannot answer a question, the document says so instead of inferring. That
limit is part of the finding, not a gap to be filled.

---

## Corrections

Documents here carry a **Corrections** section. Corrections are listed there with their date
rather than folded silently into the text, and every change is additionally visible as a commit
in this repository. That is the whole reason the source lives in git and not only on a webpage.

To report one:

- **An error in a figure** — open an issue with the value you measured and the command you ran.
  A wrong number is the most useful thing you can send.
- **A correction you can make yourself** — send a pull request. Keep the change minimal and say
  in one line what it corrects.
- **Information only you have** — for example the destination of funds, a key arrangement, or a
  document that exists but is not public: open an issue, or contact the maintainer directly if
  you would rather not do it in the open.

Corrections are welcome from everyone, and most of all from the people a document describes.
A signed statement or a published figure replaces analysis, and that is an improvement, not a
defeat.

---

## Status

The deployment reward document is a **draft circulating for review**. It is not linked from
anywhere public and carries `noindex` until the review is done. Comments are open until then;
after that it becomes version 1.0 and the corrections process above applies.

---

## Licence

- **Documents and page content** — [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/),
  see [`LICENSE-CONTENT`](LICENSE-CONTENT). Mirror them, translate them, quote them; name the
  source and link back. Mirroring is explicitly encouraged: a community document that exists in
  one place has the same problem as the pages this repository was built to replace.
- **Code** — MIT, see [`LICENSE`](LICENSE).

The link directory started from [btxlinks](https://github.com/vanities/btxlinks) (MIT); its
copyright notice and licence are in [`THIRD-PARTY-NOTICES.md`](THIRD-PARTY-NOTICES.md).

Material quoted from other sources — the BTX Specification, the reference implementation —
remains with its own rights holders and is reproduced here as short quotations for
documentation and review.

---

## Maintainer

dr-chambre — operator of two BTX archive nodes and of
[btx-monitoring.com](https://btx-monitoring.com), the network status page whose API several of
the figures here are measured against.
