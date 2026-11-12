# Contributing

Short version: change what you think is wrong, and say why in the commit message.

## Taking on a lane

[`ROADMAP.md`](ROADMAP.md) has an Owner column. Put your name in it. That is all it
means: you are the person others ask about that line, and the person who says so when
it stalls. Not a title, not exclusive — two names on a row beats none.

If git is in your way, say it in the Growth topic and someone will enter it for you.
Nobody should be locked out of this because of tooling.

## Changing a document

- **Roadmap, README, link directory** — a pull request is enough. Small corrections can
  be merged by any maintainer.
- **Anything under `research/`** — these carry figures that people act on, so they need
  one approving review before merging, including from maintainers. This is not
  bureaucracy; it is the reason the figures can be trusted.

## Changing the website

The content of btx-community.com is in these files:

- [`site/content/community.yaml`](site/content/community.yaml): the cards at the top and
  the link directory
- [`site/content/guide.yaml`](site/content/guide.yaml): "What is BTX?", the next release and
  the checklists. Every fact links to a source a reader can open; prefer the source code and
  release notes over websites.
- [`site/content/hub.yaml`](site/content/hub.yaml): the developers page, the public plan of
  the developer hub in [`dev/`](dev/), copied from it by hand. The hub is the source; when it
  changes, change this file too. `test_the_developers_page_matches_the_hub` in
  `site/tests/test_build.py` compares every number and list on the page with the hub: the
  coverage figures with `dev/01-state.md`, the test runs with `dev/plan/MASTER-PLAN.md`, the
  areas, baselines, classes, gates and phases with `dev/plan/plan-data.json`, the lanes, flow,
  week and sweep rules with `dev/plan/lanes.json`, the registry columns with
  `dev/05-bug-classes.md` and the "never" list, routes and escalation with `dev/07-lanes.md`.
  Texts written by hand, such as the lane scopes, are checked for the numbers, classes and lane
  ids they name. The comment at the top of `hub.yaml` says which field comes from where.
- [`site/content/texts.yaml`](site/content/texts.yaml): the fixed texts of the page, in all
  five languages
- [`site/content/translations/`](site/content/translations/): the Spanish, French and Chinese
  versions of the texts in the first three files, one file per language

The live figures (network state, supply, halving, upgrade countdown, and the development
activity of `btxchain/btx`) are not in these files; the page reads them from the public API of
network.btx-monitoring.com.

The site is in English, German, Spanish, French and Simplified Chinese. In the content files
every text exists in English and German; add both. Spanish, French and Chinese live in
`translations/<lang>.yaml`, each paired with the English text it translates. If you add or
change an English text and cannot translate it, that is fine: the page shows English in those
languages until someone adds the translation, and the build lists what is missing. The
translations were made with AI help; native speakers are very welcome to correct them.

Links must be plain `https://` URLs. The
pull request checks the files and builds the page; if something does not fit, the check
fails and says why. Once the change is merged, the site updates itself within a few minutes.
Nobody needs access to the server for that. How it works is in
[`deploy/README.md`](deploy/README.md).

## Correcting a figure

Documents under `research/` carry a **Corrections** section. A correction is recorded
there with its date rather than folded silently into the text, and the commit history
shows the change. That is the whole point of keeping the source in git.

The most useful thing you can send is a wrong number together with the command you ran.
Every document prints the commands it used, so a disagreement can be settled by running
them rather than by arguing.

If you hold information that is not public — the destination of funds, a key
arrangement, a document that exists but was never released — open an issue, or contact
a maintainer directly if you would rather not do it in the open. A statement from the
people a document describes replaces analysis, and that is an improvement, not a defeat.

## Maintainers

Write access is deliberately not limited to one person, and administration should not be
either. If you are doing sustained work here and want access, ask. The failure mode this
repository exists to fix is a resource that works only as long as one person stays
interested.
