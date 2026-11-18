# SPDX-License-Identifier: MIT
"""Tests of site/build.py, run with ``python -m unittest discover site/tests``."""

from __future__ import annotations

import json
import re
import sys
import tempfile
import unittest
from collections.abc import Callable
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from typing import get_args

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import build  # noqa: E402
from markupsafe import escape  # noqa: E402

NAV = ("begin", "brief", "levels", "rules", "contribute")
"""The sections of the developers page ("Start here"), in the order of its anchor bar."""
NAV_WORK = ("ci", "coverage", "lanes", "owner-rules", "classes", "flow", "gates", "rhythm")
"""The sections of its sub-page "Ongoing work", in the order of its anchor bar."""
STATUS_OF = {
    "worklist ready": "worklist",
    "baseline measured": "baseline",
    "not counted": "count-first",
    "rule-only": "rule-only",
    "5 of 5 PRs landed; rule missing": "rule-only",
    "waits for the first Windows CI run": "needs-ci",
    "in the CI branch": "needs-ci",
    "generators, not instance fixes": "generators",
    "evidence for #464": "evidence",
}
"""The status filter of a class, from the start of its sweep_status in dev/plan/plan-data.json."""
NUMBERS = {2: "Two", 4: "Four"}


def scope_marks(text: str) -> set[str]:
    """The numbers, commits, classes and lane ids of a lane's scope, to compare page and hub."""
    lanes = set(re.findall(r"\b[A-Z]-[A-Z][A-Z0-9-]*[A-Z0-9]\b", text))
    rest = re.sub(r"\b[A-Z]-[A-Z][A-Z0-9-]*[A-Z0-9]\b|\bCI-\d+\b", " ", text)
    commits = set(re.findall(r"\b(?=[0-9a-f]*\d)(?=[0-9a-f]*[a-f])[0-9a-f]{8}\b", rest))
    rest = re.sub(r"\b[0-9a-f]{8}\b", " ", rest)
    classes = set(re.findall(r"\bK\d\d\b", rest))
    rest = re.sub(r"\bK\d\d\b", " ", rest)
    numbers = set(re.findall(r"(?<![\d.])#?\d+(?:\.\d+)*[a-z]?(?!\d)", rest))
    return lanes | commits | classes | numbers


class _Tags(HTMLParser):
    """Every start tag of a page with its attributes, in document order."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.tags: list[tuple[str, dict[str, str | None]]] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.tags.append((tag, dict(attrs)))

    handle_startendtag = handle_starttag


def tags(html: str) -> list[tuple[str, dict[str, str | None]]]:
    parser = _Tags()
    parser.feed(html)
    return parser.tags


def numbered_items(markdown: str) -> list[str]:
    """The items of a numbered Markdown list, wrapped lines joined by one space."""
    items: list[str] = []
    for line in markdown.splitlines():
        match = re.match(r"^\d+\. (.+)$", line)
        if match:
            items.append(match.group(1).strip())
        elif items and line.startswith(" ") and line.strip():
            items[-1] += " " + line.strip()
        elif not line.strip() and items:
            continue
    return items


def ci_panel() -> dict[str, dict[str, str]]:
    """The texts of the CI panel with the placeholders each needs, in both inline languages."""
    panel = {}
    for name in build.CiPanel.model_fields:
        text = " ".join(f"{{{p}}}" for p in sorted(build.CI_PLACEHOLDERS.get(name, ()))) or name
        panel[name] = {"en": text, "de": text}
    return panel


class ContentTest(unittest.TestCase):
    def test_the_real_content_builds(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / "site"
            build.build(out, "test")

            def read(lang: str, page: str) -> str:
                return (out / build.page_path(lang, page).strip("/") / "index.html").read_text(encoding="utf-8")

            english = read("en", "home")
            german = read("de", "home")
            self.assertIn('<html lang="en">', english)
            self.assertIn('<html lang="de">', german)
            self.assertIn(build.STATUS_API, english)
            self.assertRegex(english, r'<script src="/static/js/community\.js\?v=[0-9a-f]{12}" defer>')
            self.assertRegex(english, r'href="/static/css/community\.css\?v=[0-9a-f]{12}"')
            self.assertTrue((out / "static" / "css" / "community.css").is_file())
            self.assertTrue((out / "static" / "fonts" / "InterVariable.woff2").is_file())
            # Each section lives on exactly one page, in both languages.
            expected = {
                "home": ('id="start"', 'id="check"', 'data-live="fork"', 'href="{links}#cat-',
                         '<a href="{dev}">'),
                "learn": ('id="about"', 'id="next"'),
                "network": ('data-live="supply"', 'data-live="fork"', 'id="development" hidden',
                            f'data-api="{build.DEVELOPMENT_API}"', f'data-repo="{build.UPSTREAM_REPO}"'),
                "links": ('id="links"', 'id="cat-'),
                "docs": ('id="documents"', 'id="doc-venue-structure"', 'id="projects"', 'id="project-amd-mining"',
                         'id="project-swapnet-tools"'),
                "infra": ('id="yourself"', 'id="managed"', 'id="roles"', 'id="role-full-node"', 'id="map"',
                          'class="c-map__svg c-map__svg--wide"', 'class="c-map__svg c-map__svg--narrow"',
                          'id="edge-1"', 'id="report"', 'href="https://github.com/MendeMatthias/easynode"'),
                "dev": ('id="begin"', 'id="levels"', 'id="level-basic"', 'id="brief"', 'id="rules"',
                        'id="contribute"', 'id="ai-prompt"', 'data-copy="ai-prompt"', 'data-copied="',
                        'data-copy-hint', 'data-copy-status', 'href="/llms.txt"', 'href="/llms-full.txt"',
                        'class="c-subnav"', 'href="{work}#lanes"'),
                "dev-work": ('id="coverage"', 'id="coverage-weekly"', 'id="lanes"', 'id="group-area"',
                             '<span class="c-tag">A-WALLET</span>', 'id="classes"', 'id="flow"', 'id="gates"',
                             'id="rhythm"', 'id="lane-A-WALLET"', 'id="class-K01"', 'id="area-wallet"',
                             'data-status="worklist"', '<meter class="c-bar', 'data-kind="area"',
                             'data-waiting="1"', 'data-sort="lowest"', 'data-template="', 'data-waiting-only',
                             'data-expand', 'data-reset', 'data-label-expand="', 'data-label-collapse="',
                             'data-sort-column="lowest"', 'data-sort-column="risk"', 'data-sort-column="size"',
                             'data-filter="registry"', 'data-filter="lanes"', 'data-filter="areas"',
                             'class="c-link c-table__lane"', 'id="ci"', f'data-api="{build.CI_API}"',
                             f'data-repo="{build.UPSTREAM_REPO}"', f'data-job="{build.CI_JOB}"', 'data-ci="status"',
                             'data-ci="run" hidden', 'data-times="', 'data-failed-functional="', '<noscript>',
                             'class="c-subnav"', 'href="{dev}"', 'id="owner-rules"', 'id="never"'),
            }
            for lang in build.LANGUAGES:
                for page, needles in expected.items():
                    html = read(lang, page)
                    self.assertIn('aria-current="page"', html)
                    for needle in needles:
                        hrefs = {"links": build.page_path(lang, "links"), "dev": build.page_path(lang, "dev"),
                                 "work": build.page_path(lang, "dev-work")}
                        self.assertIn(needle.format(**hrefs), html, (lang, page))
                    for other in build.PAGES:
                        self.assertIn(f'href="{build.page_path(lang, other)}"', html)
                    for code in build.LANGUAGES:
                        tag = build.HTML_LANG.get(code, code)
                        self.assertIn(f'href="{build.page_path(code, page)}" hreflang="{tag}"', html)
            self.assertNotIn('data-live="supply"', english)
            self.assertNotIn('id="development"', english)
            # The CI panel and its script are on the developers' "Ongoing work" page only.
            for page in build.ALL_PAGES:
                self.assertEqual("/static/js/ci.js?v=" in read("en", page), page == "dev-work", page)
            self.assertTrue((out / "static" / "js" / "ci.js").is_file())
            self.assertIn('href="/de/links/"', read("en", "links").split('class="c-lang"')[1])
            chinese = read("zh", "learn")
            self.assertIn('<html lang="zh-Hans">', chinese)
            self.assertIn("固定供应量", chinese)
            self.assertIn("translations/zh.yaml", chinese)
            self.assertNotIn("translations/", english)
            self.assertNotIn('id="coverage"', english)
            self.assertIn("16 lanes", read("en", "dev-work"))
            self.assertIn("16 Arbeitsbereiche", read("de", "dev-work"))
            for lang in build.LANGUAGES:
                written, other = (",", r"\.") if lang in ("de", "es", "fr") else (r"\.", ",")
                space = "\u202f" if lang == "fr" else "\u00a0"
                self.assertRegex(read(lang, "dev-work"), rf"<dd>\d+{written}\d{space}%</dd>", lang)
                self.assertNotRegex(read(lang, "dev-work"), rf"<dd>\d+{other}\d\s%</dd>", lang)

    def test_every_content_text_is_translated(self) -> None:
        page = build.load_community(build.ROOT / "content" / "community.yaml")
        guide = build.load_guide(build.ROOT / "content" / "guide.yaml")
        hub = build.load_hub(build.ROOT / "content" / "hub.yaml")
        infra = build.load_infra(build.ROOT / "content" / "infra.yaml")
        projects = build.load_projects(build.ROOT / "content" / "projects.yaml")
        texts = build.load_texts(build.ROOT / "content" / "texts.yaml")
        for lang in build.TRANSLATED:
            table = build.load_translations(build.ROOT / "content" / "translations" / f"{lang}.yaml", lang)
            say = build.Localizer(lang, table)
            for page_id in build.PAGES:
                build.context(page, guide, hub, texts, lang, "test", page_id, say, infra, projects)
            with self.subTest(lang=lang):
                self.assertEqual(say.missing, set())
                self.assertEqual(set(table) - say.used, set())

    def test_texts_have_the_same_keys_in_every_language(self) -> None:
        texts = build.load_texts(build.ROOT / "content" / "texts.yaml")
        for lang in build.LANGUAGES:
            self.assertEqual(set(texts["en"]), set(texts[lang]), lang)

    def test_texts_keep_their_placeholders(self) -> None:
        texts = build.load_texts(build.ROOT / "content" / "texts.yaml")
        for key, english in texts["en"].items():
            names = set(re.findall(r"\{(\w+)\}", english))
            for lang in build.LANGUAGES:
                self.assertEqual(set(re.findall(r"\{(\w+)\}", texts[lang][key])), names, (lang, key))

    def test_the_script_knows_what_the_build_writes(self) -> None:
        """STATUSES, KINDS and SORTS in community.js are the build's statuses, lane kinds and sorts."""
        script = (build.ROOT / "static" / "js" / "community.js").read_text(encoding="utf-8")

        def array(name: str) -> tuple[str, ...]:
            body = re.search(rf"var {name} = \[([^\]]*)\];", script).group(1)
            return tuple(re.findall(r'"([^"]+)"', body))

        hub = build.load_hub(build.ROOT / "content" / "hub.yaml")
        template = (build.ROOT / "templates" / "dev-work.html.j2").read_text(encoding="utf-8")
        sorts = re.search(r"\{% for key in \(([^)]*)\) %\}\s*<button[^>]*data-sort=", template).group(1)
        self.assertEqual(array("STATUSES"), build.STATUSES)
        self.assertEqual(array("KINDS"), get_args(build.LaneKind))
        self.assertEqual(set(array("KINDS")), {group.id for group in hub.lanes.groups})
        self.assertEqual(array("SORTS"), tuple(re.findall(r'"([^"]+)"', sorts)))
        columns = re.findall(r'data-sort-column="([a-z]+)"', template)
        self.assertEqual(sorted(columns), sorted(key for key in array("SORTS") if key != "listed"))


class RulesTest(unittest.TestCase):
    def _write(self, text: str) -> Path:
        handle = tempfile.NamedTemporaryFile("w", suffix=".yaml", delete=False, encoding="utf-8")  # noqa: SIM115
        with handle:
            handle.write(text)
        self.addCleanup(Path(handle.name).unlink)
        return Path(handle.name)

    def test_links_must_be_plain_https(self) -> None:
        for url in ("http://example.com", 'https://a.com/"onmouseover', "https://a.com/#x", "javascript:alert(1)"):
            with self.subTest(url=url), self.assertRaises(Exception):  # noqa: B017, PT027
                build.Entry.model_validate(
                    {"id": "x", "name": "X", "url": url, "description": {"en": "a", "de": "b"}}
                )

    def test_duplicate_keys_and_aliases_are_rejected(self) -> None:
        for text in ("a: 1\na: 2\n", "a: &x 1\nb: *x\n"):
            with self.subTest(text=text), self.assertRaises(build.ContentError):
                build.load_yaml(self._write(text))

    def test_a_missing_translation_is_rejected(self) -> None:
        path = self._write("en:\n  title: A\n  extra: B\nde:\n  title: C\n")
        with self.assertRaises(build.ContentError):
            build.load_texts(path)

    def test_broken_translation_files_are_rejected(self) -> None:
        for text in (
            "translations: []\n",
            "schema_version: 1\ntranslations: {}\n",
            "schema_version: 1\ntranslations:\n- en: A\n",
            "schema_version: 1\ntranslations:\n- en: A\n  fr: B\n",
            "schema_version: 1\ntranslations:\n- en: A\n  es: ''\n",
            "schema_version: 1\ntranslations:\n- en: A\n  es: B\n- en: A\n  es: C\n",
            f"schema_version: 1\ntranslations:\n- en: A\n  es: {'x' * 401}\n",
        ):
            with self.subTest(text=text[:60]), self.assertRaises(build.ContentError):
                build.load_translations(self._write(text), "es")

    def test_a_missing_translation_shows_english(self) -> None:
        say = build.Localizer("es", {"Hello": "Hola"})
        self.assertEqual(say(build.Text(en="Hello", de="Hallo")), "Hola")
        self.assertEqual(say(build.Text(en="New", de="Neu")), "New")
        self.assertEqual(say.missing, {"New"})

    def test_guide_sources_must_be_plain_https(self) -> None:
        text = {"en": "a", "de": "b"}
        with self.assertRaises(Exception):  # noqa: B017, PT027
            build.Fact.model_validate({"id": "x", "title": text, "text": text, "source": "http://example.com"})

    def test_upcoming_needs_a_plain_version(self) -> None:
        text = {"en": "a", "de": "b"}
        feature = {"title": text, "text": text, "source": "https://example.com"}
        for version in ("0.35", "0.35.1"):
            build.Upcoming.model_validate(
                {"version": version, "checked": "2026-11-05", "status": text, "source": "https://example.com", "features": [feature]}
            )
        with self.assertRaises(Exception):  # noqa: B017, PT027
            build.Upcoming.model_validate(
                {"version": "<b>", "checked": "2026-11-05", "status": text, "source": "https://example.com", "features": [feature]}
            )

    def test_percentages_are_written_as_each_language_does(self) -> None:
        self.assertEqual(build.format_percent(65.8, "en"), "65.8\u00a0%")
        self.assertEqual(build.format_percent(65.8, "de"), "65,8\u00a0%")
        self.assertEqual(build.format_percent(40, "de"), "40,0\u00a0%")
        self.assertEqual(build.format_percent(65.8, "es"), "65,8\u00a0%")
        self.assertEqual(build.format_percent(65.8, "fr"), "65,8\u202f%")
        self.assertEqual(build.format_percent(65.8, "zh"), "65.8\u00a0%")

    def test_counts_are_written_as_each_language_does(self) -> None:
        self.assertEqual(build.format_count(1033, "en"), "1,033")
        self.assertEqual(build.format_count(1033, "zh"), "1,033")
        self.assertEqual(build.format_count(1033, "de"), "1.033")
        self.assertEqual(build.format_count(1033, "es"), "1.033")
        self.assertEqual(build.format_count(1033, "fr"), "1\u202f033")
        self.assertEqual(build.format_count(468217, "en"), "468,217")
        self.assertEqual(build.format_count(26, "fr"), "26")

    def test_the_ci_panel_texts_keep_their_placeholders(self) -> None:
        build.CiPanel.model_validate(ci_panel())
        for name, wanted in build.CI_PLACEHOLDERS.items():
            for lang, text in (("en", "{passed}"), ("de", "no placeholder")):
                broken = {**ci_panel(), name: {**ci_panel()[name], lang: text}}
                with self.subTest(name=name, lang=lang), self.assertRaises(Exception):  # noqa: B017, PT027
                    build.CiPanel.model_validate(broken)
            self.assertTrue(wanted)
        with self.assertRaises(Exception):  # noqa: B017, PT027
            build.CiPanel.model_validate({**ci_panel(), "title": {"en": "a", "de": "{x}"}})
        # A translation that loses a placeholder fails the build instead of showing "{failed}".
        panel = build.CiPanel.model_validate(ci_panel())
        self.assertEqual(build.ci_texts(panel, build.Localizer("es", {}))["times"], "{finished} {measured}")
        say = build.Localizer("es", {"{finished} {measured}": "{measured}"})
        with self.assertRaisesRegex(build.ContentError, r"ci\.times"):
            build.ci_texts(panel, say)

    def _developers_page(self) -> dict[str, object]:
        """The smallest developers page that validates."""
        text = {"en": "a", "de": "b"}
        url = f"{build.REPO_URL}/blob/main/dev/README.md"
        agents, llms = f"{build.RAW_URL}AGENTS.md", f"{build.RAW_URL}llms.txt"
        lane = {"id": "A-WALLET", "title": text, "scope": text, "why": text, "target": text, "cadence": text,
                "route": "pr", "route_text": text, "pack": f"{build.REPO_URL}/blob/main/dev/packs/A-WALLET.md",
                "done_bar": [text]}
        return {
            "schema_version": 1,
            "checked": "2026-11-12",
            "source": url,
            "measured": {"commit": "c6f9678d", "date": "2026-11-12", "head": "4c7840e9",
                         "coverage_commit": "a5d1637f", "coverage_date": "2026-11-12"},
            "principles": [{"id": f"p{i}", "title": text, "text": text} for i in range(4)],
            "start": [{"text": text, "url": url}],
            "brief": {"prompt": f"Read {agents} first.\nThen {llms}.\n{'Never post. ' * 20}",
                      "agents_url": agents, "llms_url": llms, "notes": [text]},
            "levels": [{"id": i, "title": text, "text": text, "url": url} for i in ("basic", "advanced", "core")],
            "coverage": {
                "text": text, "source": url, "plan": url,
                "figures": [{"id": "lines", "label": text, "percent": 65.8, "note": text}],
                "runs": [{"id": "unit", "total": 4, "passed": 1, "timed_out": 1, "failed": 1, "skipped": 1},
                         {"id": "functional", "total": 2, "passed": 2, "timed_out": 0, "failed": 0, "skipped": 0}],
                "areas": [{"id": "wallet", "name": "wallet", "unit": 37.2, "functional": 50.5}],
                "baselines": [{"id": "tsan", "label": text, "count": 41}],
            },
            "classes_text": text,
            "classes_source": url,
            "classes": [{"id": "K05", "name": text, "rule": text, "status": "count-first", "status_text": text,
                         "lanes": ["A-WALLET"]}],
            "lanes": {"source": url, "data": url, "groups": [{"id": "area", "title": text, "text": text, "lanes": [lane]}]},
            "flow": [{"text": text}] * 3,
            "routes": [{"id": i, "title": text, "text": text} for i in ("pr", "evidence", "run")],
            "escalation": [text],
            "flow_source": url,
            "gate_source": url,
            "gates": [{"id": "CI-4", "name": text, "state": text, "phase": "2a"},
                      {"id": "G2", "name": text, "state": text, "done_bar": True}],
            "gates_source": url,
            "ci_pack": url,
            "ci": ci_panel(),
            "phases": [{"id": "2a", "name": text, "window": text, "deliverables": [text]}],
            "week": [{"id": day, "what": text, "who": text} for day in build.DAYS],
            "rhythm_source": url,
            "rules": [text],
            "never": [text],
            "sweep_rules": [text],
            "method_source": url,
            "guardrails_source": url,
            "contribute": [{"id": "claim", "title": text, "text": text, "steps": [{"text": text}], "url": url}],
        }

    def test_a_broken_developers_page_is_rejected(self) -> None:
        page = self._developers_page()
        build.load_hub(self._write(json.dumps(page)))
        text = {"en": "a", "de": "b"}
        url = page["source"]
        coverage, brief = page["coverage"], page["brief"]
        group = page["lanes"]["groups"][0]
        lane = group["lanes"][0]
        gate = {"name": text, "state": text}
        level = {"title": text, "text": text, "url": url}

        def lanes(*changed: dict[str, object]) -> dict[str, object]:
            return {"lanes": {**page["lanes"], "groups": [{**group, "lanes": list(changed)}]}}

        def figures(*changed: dict[str, object]) -> dict[str, object]:
            figure = coverage["figures"][0]
            return {"coverage": {**coverage, "figures": [{**figure, **c} for c in changed]}}

        def area(**changed: object) -> dict[str, object]:
            return {"coverage": {**coverage, "areas": [{**coverage["areas"][0], **changed}]}}

        def bug(**changed: object) -> dict[str, object]:
            return {"classes": [{**page["classes"][0], **changed}]}

        def measured(**changed: object) -> dict[str, object]:
            return {"measured": {k: v for k, v in {**page["measured"], **changed}.items() if v is not None}}

        broken = (
            {"schema_version": 2},
            {"checked": "2026-11-11"},
            measured(coverage_date="2026-11-13"),
            measured(coverage_date="12 Nov 2026"),
            measured(coverage_commit="a5d1637"),
            measured(coverage_commit="A5D1637F"),
            measured(coverage_commit=None),
            measured(coverage_date=None),
            {"levels": page["levels"][:2]},
            {"levels": [*page["levels"], {"id": "expert", **level}]},
            {"levels": [{"id": "basic", **level}] * 3},
            {"principles": [*page["principles"], {"id": "p4", "title": text, "text": text}]},
            lanes({**lane, "id": "a-wallet"}),
            lanes(lane, lane),
            lanes({**lane, "owner": "x", "second_pass": "x"}),
            lanes({**lane, "owner": "@x"}),
            lanes({**lane, "second_pass": "a b"}),
            lanes({**lane, "waiting": True}),
            lanes({**lane, "done_bar": [text] * 11}),
            lanes({**lane, "route": "chat"}),
            lanes({**lane, "pack": f"{build.REPO_URL}/blob/main/dev/packs/A-STORES.md"}),
            lanes({**lane, "coverage": {"unit": 50.5, "functional": 37.2}}),
            {"lanes": {**page["lanes"], "groups": [group, group]}},
            {"lanes": {**page["lanes"], "groups": [{**group, "id": "areas"}]}},
            {"routes": [*page["routes"][:2], {"id": "fork", "title": text, "text": text}]},
            figures({"percent": 101}),
            figures({"percent": "65.8"}),
            figures({"percent": 69.96}),
            figures({"percent": -0.0}),
            figures({}, {}),
            area(functional=30.0),
            area(unit=37.25),
            area(name="<b>"),
            {"coverage": {**coverage, "runs": [{**coverage["runs"][0], "total": 5}, coverage["runs"][1]]}},
            {"coverage": {**coverage, "runs": coverage["runs"][:1]}},
            bug(lanes=["A-NOPE"]),
            bug(status="swept"),
            bug(id="K5"),
            {"gates": [{"id": "G2", "phase": "2a", **gate}]},
            {"gates": [{"id": "CI-4", "phase": "2a", "done_bar": True, **gate}]},
            {"gates": [{"id": "CI-4", **gate}]},
            {"brief": {**brief, "prompt": "x" * 300}},
            {"brief": {**brief, "prompt": brief["prompt"] + "<script>"}},
            {"brief": {**brief, "prompt": brief["prompt"] + "\n" * 30}},
            {"brief": {**brief, "agents_url": f"{build.REPO_URL}/blob/main/dev/AGENTS.md"}},
            {"contribute": [{**page["contribute"][0], "steps": [{"text": text, "page": "dev"}]}]},
            {"week": page["week"][:3]},
            {"start": [{"text": text, "url": "http://example.com"}]},
            {"start": [{"text": text, "url": "https://example.com/anything"}]},
            {"coverage": {**coverage, "source": "https://example.com/"}},
            {"flow_source": "https://example.com/"},
        )
        for change in broken:
            with self.subTest(change=change), self.assertRaisesRegex(build.ContentError, r"\.yaml is invalid"):
                build.load_hub(self._write(json.dumps({**page, **change})))
        # A lane can have an owner before it has a brief.
        briefless = {k: v for k, v in lane.items() if k != "pack"}
        build.load_hub(self._write(json.dumps({**page, **lanes({**briefless, "owner": "x", "second_pass": "y"})})))

    def test_the_developers_page_matches_the_hub(self) -> None:
        """hub.yaml is a copy of dev/ made by hand; every number and list on it must match the hub."""
        hub = build.load_hub(build.ROOT / "content" / "hub.yaml")
        repo = build.ROOT.parent
        dev = repo / "dev"
        plan = json.loads((dev / "plan" / "plan-data.json").read_text(encoding="utf-8"))
        lanes = json.loads((dev / "plan" / "lanes.json").read_text(encoding="utf-8"))
        state = (dev / "01-state.md").read_text(encoding="utf-8")
        master = (dev / "plan" / "MASTER-PLAN.md").read_text(encoding="utf-8")
        registry = (dev / "05-bug-classes.md").read_text(encoding="utf-8")
        lanes_page = (dev / "07-lanes.md").read_text(encoding="utf-8")
        agents = (dev / "AGENTS.md").read_text(encoding="utf-8")
        page_lanes = [(group.id, lane) for group in hub.lanes.groups for lane in group.lanes]

        with self.subTest("measured"):
            # Two clocks: coverage at coverage_commit, the static, TSan, class and gate counts at commit.
            measured = plan["measured_at"]
            page_clocks = (hub.measured.commit, hub.measured.date.isoformat(), hub.measured.head,
                           hub.measured.coverage_commit, hub.measured.coverage_date.isoformat())
            self.assertEqual(
                page_clocks,
                (measured["commit"], measured["date"], measured["sites_head"],
                 measured["coverage_commit"], measured["coverage_date"]),
            )
            meta = lanes["meta"]
            self.assertEqual(
                page_clocks,
                (meta["measured_at"], meta["date"], meta["sites_head"], meta["coverage_commit"], meta["coverage_date"]),
            )

        with self.subTest("coverage figures"):
            coverage = next(line for line in state.splitlines() if line.startswith("> **Coverage is measured again.**"))
            self.assertEqual(
                [float(p) for p in re.findall(r"\*\*(\d+\.\d)%\*\*", coverage)],
                [figure.percent for figure in hub.coverage.figures],
            )
            for fact in (hub.measured.coverage_commit, "#578", "42 unit suites timed out",
                         "14 of 220 functional scripts failed", "time budgets were shorter"):
                self.assertIn(fact, coverage, fact)
                self.assertIn(fact, hub.coverage.text.en, fact)

        with self.subTest("runs"):
            def number(text: str) -> int:
                return int(text.replace(",", ""))

            unit = re.search(
                r"all ([\d,]+) ctest entries ran\. ([\d,]+) passed, (\d+) timed out[^.]*, (\d+) failed and (\d+) was skipped",
                master,
            )
            functional = re.search(
                r"the ([\d,]+) entries of the test_runner[^.]*\. (\d+) passed, (\d+) were skipped and (\d+) failed", master
            )
            total, passed, skipped, failed = (number(g) for g in functional.groups())
            self.assertEqual(
                [(r.id, r.total, r.passed, r.timed_out, r.failed, r.skipped) for r in hub.coverage.runs],
                [("unit", *(number(g) for g in unit.groups())), ("functional", total, passed, 0, failed, skipped)],
            )

        with self.subTest("areas"):
            self.assertEqual(
                [
                    (a["area"], a["unit_lines"], a["unitfunc_lines"], a["branches"], a["loc"], a["risk_rank"], a.get("note"))
                    for a in plan["coverage"]["areas"]
                ],
                [
                    (a.name, a.unit, a.functional, a.branches, a.loc, a.risk_rank, a.note.en if a.note else None)
                    for a in hub.coverage.areas
                ],
            )

        with self.subTest("baselines"):
            static = plan["static"]
            keys = {"codeql": "codeql_real", "cppcheck": "cppcheck_errors", "tsan": "tsan_pairs",
                    "thread-safety": "tsa_warnings", "lockorder": "lock_inversions", "tidy": "tidy_warnings"}
            self.assertEqual({b.id: b.count for b in hub.coverage.baselines}, {i: static[k] for i, k in keys.items()})
            codeql = next(b for b in hub.coverage.baselines if b.id == "codeql")
            self.assertIn(str(static["codeql_security"]), codeql.note.en)

        with self.subTest("classes"):
            # K01's sweep status names a file; the page gives the class and the count only.
            stated = {"K01": "worklist ready (9 files at 1e2f8b5f, down from 12 at 4c7840e9; #606's lint lists each "
                             "raw write left in them as an exception); shared helper exists (#576) and syncs file "
                             "and directory since #606"}
            self.assertEqual(
                [
                    (c["id"], c["name"], c["rule"], c["prs"], c["sites_open"], c.get("sites_unit"),
                     stated.get(c["id"], c["sweep_status"]))
                    for c in plan["classes"]
                ],
                [
                    (c.id, c.name.en, c.rule.en, c.prs, c.sites_open, c.sites_unit.en if c.sites_unit else None,
                     c.status_text.en)
                    for c in hub.classes
                ],
            )
            for bug in hub.classes:
                self.assertNotRegex(f"{bug.name.en} {bug.rule.en} {bug.status_text.en}", r"\.(cpp|h)\b", bug.id)
            for data in plan["classes"]:
                status = [value for start, value in STATUS_OF.items() if data["sweep_status"].startswith(start)]
                self.assertEqual([next(c.status for c in hub.classes if c.id == data["id"])], status, data["id"])
            self.assertIn("317 fix PRs in 26 named classes", " ".join(registry.split()))
            for number in ("317", "26 named classes", "10-15%", "c6f9678d"):
                self.assertIn(number, hub.classes_text.en)

        with self.subTest("registry: lanes and security"):
            section = registry.split("## 1. The registry")[1].split("## 2.")[0]
            merged = {"K02, K20, K21": "K20/K21/K02", "K11, K12": "K11/K12", "K16, K17": "K16/K17",
                      "K19, K22": "K19/K22", "fs-trust": "C1-1", "lifetime": "C1-3"}
            rows = {}
            for line in section.splitlines():
                if re.match(r"^\| (K\d\d|fs-trust|lifetime)", line):
                    cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
                    lane_ids = re.findall(r"\b[A-Z]-[A-Z0-9][A-Z0-9-]*\b", cells[5])
                    rows[merged.get(cells[0], cells[0])] = (cells[2] == "S", lane_ids)
            self.assertEqual(rows, {c.id: (c.security, list(c.lanes)) for c in hub.classes})

        with self.subTest("lanes"):
            self.assertEqual(len(lanes["lanes"]), 16)
            self.assertEqual(len(page_lanes), len(lanes["lanes"]))
            self.assertEqual(
                [(lane["kind"], lane["id"], lane["name"]) for lane in lanes["lanes"]],
                [(kind, lane.id, lane.title.en) for kind, lane in page_lanes],
            )
            routes = {"PR": "pr", "EVIDENCE": "evidence", "RUN": "run", "fork": "fork"}
            for (_, lane), data in zip(page_lanes, lanes["lanes"], strict=True):
                with self.subTest(lane=lane.id):
                    self.assertEqual(
                        (lane.why.en, lane.target.en, lane.cadence.en, lane.route_text.en),
                        (data["why"], data["target"], data["cadence"], data["route"]),
                    )
                    self.assertEqual([item.en for item in lane.done_bar], data["done_bar"])
                    now = data["coverage_now"]
                    expected = None if now["unit_lines"] is None and now["unitfunc_lines"] is None else (
                        now["unit_lines"], now["unitfunc_lines"])
                    got = None if lane.coverage is None else (lane.coverage.unit, lane.coverage.functional)
                    self.assertEqual(got, expected)
                    self.assertEqual(lane.risk_rank, data["risk_rank"])
                    self.assertEqual(lane.route, routes[re.match(r"[A-Za-z]+", data["route"]).group(0)])
                    self.assertEqual([r.en for r in lane.runners], [r["role"] for r in data.get("runners", [])])
                    # The handles are copied from the hub; a claim there is copied here too.
                    self.assertEqual(
                        (lane.owner, lane.second_pass),
                        (data["owner"]["handle"], data["second_pass"]["handle"]),
                        "copy owner.handle and second_pass.handle from dev/plan/lanes.json into hub.yaml",
                    )
                    self.assertNotRegex(lane.scope.en, r"src/|\.(cpp|h)\b")
                    # The scope is written by hand; its numbers, classes and lane ids are the hub's.
                    # A-WALLET names the lane its shielded RPC belongs to; C-K01 names its class.
                    allowed = {"A-WALLET": {"A-SHIELDED"}, "C-K01": {"K01"}}.get(lane.id, set())
                    self.assertLessEqual(scope_marks(lane.scope.en) - allowed, scope_marks(data["scope"]))

        with self.subTest("owners in 07-lanes.md"):
            # The Owner line of each lane in 07-lanes.md names the handle in lanes.json.
            section = lanes_page.split("## 3. The lanes")[1].split("## 4. ")[0]
            named = {}
            for block in re.split(r"(?m)^\*\*(?=[A-Z]-[A-Z0-9-]+: )", section)[1:]:
                handle = re.search(r"(?m)^- Owner: `?([^`\s(]*)", block).group(1)
                named[block.split(":", 1)[0]] = handle or None
            self.assertEqual(named, {data["id"]: data["owner"]["handle"] for data in lanes["lanes"]})

        with self.subTest("counts the texts name"):
            # A lane with neither an owner nor a brief gets no work until claimed: the hub's list
            # (lanes.json and 07-lanes.md sections 1 and 4) and the number in the claim loop. The
            # text of a group names the lanes without a brief.
            idle = [lane.id for _, lane in page_lanes if lane.owner is None and lane.pack is None]
            self.assertEqual(idle, lanes["no_work_until_claimed"])
            listed = lanes_page.split("## 4. ")[1].split("## 5. ")[0].strip().split(". ")[0]
            self.assertEqual(re.findall(r"\b[A-Z]-[A-Z0-9-]+\b", listed), idle)
            stated = f"{NUMBERS[len(idle)]} lanes get no work until someone takes them"
            self.assertIn(stated, lanes_page)
            claim = next(loop for loop in hub.contribute if loop.id == "claim")
            self.assertIn(stated, claim.text.en)
            for group in hub.lanes.groups:
                named = [sentence for sentence in group.text.en.split(". ") if "no brief yet" in sentence]
                ids = re.findall(r"\b[A-Z]-[A-Z0-9-]+\b", " ".join(named))
                self.assertEqual(ids, [lane.id for lane in group.lanes if lane.pack is None], group.id)
            # The gates the done-bar principle names are the done bar.
            principle = next(p for p in hub.principles if p.id == "done-bar")
            self.assertEqual(set(re.findall(r"\bG\d\b", principle.text.en)),
                             {gate.id for gate in hub.gates if gate.done_bar})
            # "Two exits" leave the flow.
            texts = build.load_texts(build.ROOT / "content" / "texts.yaml")
            exits = sum(step.exit for step in hub.flow)
            self.assertIn(f"{NUMBERS[exits]} exits", texts["en"]["hub.flow.lead"])

        with self.subTest("routes and escalation"):
            section = lanes_page.split("## 7. ")[1].split("## 8. ")[0]
            escalation = [line[2:] for line in section.split("**Escalation.**")[1].split("**")[0].splitlines()
                          if line.startswith("- ")]
            source = lanes["rules"][7].removeprefix("Escalation: ").split("; ")
            self.assertEqual(len(hub.escalation), len(escalation))
            self.assertEqual(len(hub.escalation), len(source))
            marks = ("Gate red", "closed without", "disagree", "private vulnerability reporting", "cannot reproduce")
            for mark, item, line, rule in zip(marks, hub.escalation, escalation, source, strict=True):
                self.assertIn(mark.lower(), item.en.lower())
                self.assertIn(mark.lower(), line.lower())
                self.assertIn(mark.split()[-1].lower(), rule.lower())
            defined = re.search(r"Routes: (.+)", lanes_page).group(1)
            self.assertEqual([r.id for r in hub.routes],
                             [name.lower() for name in re.findall(r"\*\*([A-Z]+)\*\* =", defined)])

        with self.subTest("flow, week and sweep rules"):
            self.assertEqual([step.text.en for step in hub.flow], lanes["flow"])
            self.assertEqual([day.id for day in hub.week], list(build.DAYS))
            self.assertEqual([day.what.en for day in hub.week], [lanes["rhythm"][day] for day in build.DAYS])
            labels = {"monday": "Monday", "tuesday_wednesday": "Tuesday-Wednesday", "thursday": "Thursday",
                      "friday": "Friday"}
            for day in hub.week:
                row = next(line for line in lanes_page.splitlines() if line.startswith(f"| {labels[day.id]} |"))
                self.assertEqual(day.who.en, row.strip().strip("|").split("|")[2].strip(), day.id)
            self.assertEqual([rule.en for rule in hub.sweep_rules], lanes["rules"][3:7])

        with self.subTest("gates"):
            source = {gate["id"]: gate for gate in plan["gates"]}
            self.assertEqual({gate.id for gate in hub.gates}, set(source))
            for gate in hub.gates:
                self.assertEqual((gate.name.en, gate.state.en), (source[gate.id]["name"], source[gate.id]["state"]))
            cadence = next(lane for lane in lanes["lanes"] if lane["id"] == "I-CI")["cadence"]
            phase_of, rest = {}, None
            for part in cadence.split(";"):
                phase = re.search(r"phase (\w+)", part).group(1)
                ids = re.findall(r"CI-\d+", part)
                phase_of.update(dict.fromkeys(ids, phase))
                rest = rest if ids else phase
            for gate in hub.gates:
                if gate.id.startswith("CI-"):
                    self.assertEqual(gate.phase, phase_of.get(gate.id, rest), gate.id)
            done = set(re.search(r"gates (G\d)[^G]*(G\d)[^G]*(G\d)", lanes["rules"][10]).groups())
            self.assertEqual({gate.id for gate in hub.gates if gate.done_bar}, done)

        with self.subTest("phases"):
            self.assertEqual(
                [(p["id"], p["name"], p["window"], p["deliverables"]) for p in plan["phases"]],
                [(p.id, p.name.en, p.window.en, [d.en for d in p.deliverables]) for p in hub.phases],
            )

        with self.subTest("never"):
            section = lanes_page.split("## 8. ")[1].split("**One-line AI brief")[0]
            items = [re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", item).replace("`", "") for item in numbered_items(section)]
            self.assertEqual(len(items), 10)
            self.assertEqual([item.en for item in hub.never], items)

        with self.subTest("brief"):
            for url in (hub.brief.agents_url, hub.brief.llms_url):
                self.assertTrue((dev / url.removeprefix(build.RAW_URL)).is_file(), url)
            for needle in ("AGENTS.md", "06-pr-gate.md", "never", "section 2", "section 8"):
                self.assertIn(needle, hub.brief.prompt)
            # The sections the prompt names are the ones it means.
            self.assertRegex(agents, r"(?m)^## 2\. First run")
            self.assertRegex(agents, r"(?m)^## 8\. Stop conditions")
            self.assertIn("## 1. The eight questions", (dev / "06-pr-gate.md").read_text(encoding="utf-8"))

        with self.subTest("links"):
            for url in hub.repo_links():
                path = re.sub(rf"^{re.escape(build.REPO_URL)}/(blob|tree)/main/", "", url)
                self.assertTrue((repo / path).exists(), url)

    def test_a_step_can_link_to_a_page(self) -> None:
        text = {"en": "a", "de": "b"}
        build.Step.model_validate({"text": text, "page": "dev"})
        for change in ({"page": "nope"}, {"page": "dev", "url": "https://example.com"}, {"page": "dev", "anchor": "x"}):
            with self.subTest(change=change), self.assertRaises(Exception):  # noqa: B017, PT027
                build.Step.model_validate({"text": text, **change})

    def test_an_anchor_must_name_a_category(self) -> None:
        text = {"en": "a", "de": "b"}
        page = {
            "schema_version": 1,
            "checked": "2026-11-05",
            "audiences": [{"id": "a", "title": text, "text": text, "steps": [{"text": text, "anchor": "nope"}]}],
            "categories": [
                {"id": "c", "title": text, "entries": [
                    {"id": "e", "name": "E", "url": "https://example.com", "description": text}
                ]}
            ],
        }
        with self.assertRaises(Exception):  # noqa: B017, PT027
            build.CommunityPage.model_validate(page)


class PageTest(unittest.TestCase):
    """The built pages: the site's content security policy and the developers page without JavaScript."""

    @classmethod
    def setUpClass(cls) -> None:
        cls._tmp = tempfile.TemporaryDirectory()
        cls.out = Path(cls._tmp.name) / "site"
        build.build(cls.out, "test")

    @classmethod
    def tearDownClass(cls) -> None:
        cls._tmp.cleanup()

    def test_the_built_pages_obey_the_csp(self) -> None:
        # default-src 'none'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self'
        pages = sorted(self.out.rglob("index.html"))
        self.assertEqual(len(pages), len(build.LANGUAGES) * len(build.ALL_PAGES) + len(build.DRAFT_PAGES))
        for page in pages:
            html = page.read_text(encoding="utf-8")
            with self.subTest(page=str(page.relative_to(self.out))):
                self.assertNotIn("<style", html)
                self.assertNotIn("javascript:", html)
                scripts = re.findall(r'<script src="/static/js/([a-z]+)\.js\?v=[0-9a-f]{12}" defer></script>', html)
                self.assertEqual(html.count("<script"), len(scripts))
                developers = page.parent.name == "work" and page.parent.parent.name == "dev"
                self.assertEqual(scripts, ["community", "ci"] if developers else ["community"])
                for tag, attrs in tags(html):
                    self.assertNotIn(tag, ("img", "iframe", "object", "embed", "base"))
                    self.assertNotIn("style", attrs, tag)
                    self.assertEqual([name for name in attrs if name.startswith("on")], [], tag)
                    for name in ("src", "href", "action"):
                        self.assertFalse((attrs.get(name) or "").startswith("data:"), (tag, attrs))
                    if tag == "link":
                        self.assertTrue((attrs.get("href") or "").startswith("/"), attrs)

    def test_the_developers_page_is_usable_without_javascript(self) -> None:
        start = (self.out / "dev" / "index.html").read_text(encoding="utf-8")
        html = (self.out / "dev" / "work" / "index.html").read_text(encoding="utf-8")
        for page, nav in ((start, NAV), (html, NAV_WORK)):
            found = tags(page)
            ids = [attrs["id"] for _, attrs in found if attrs.get("id")]
            self.assertEqual(len(ids), len(set(ids)), "duplicate ids")
            bar = page.split('class="c-jump c-jump--page"')[1].split("</nav>")[0]
            self.assertEqual(tuple(re.findall(r'href="#([^"]+)"', bar)), nav)
            for anchor in re.findall(r'href="#([^"]+)"', page):
                self.assertIn(anchor, ids)
            levels = [int(tag[1]) for tag, _ in found if re.fullmatch(r"h[1-6]", tag)]
            self.assertEqual(levels[0], 1)
            for before, after in zip(levels, levels[1:]):
                self.assertLessEqual(after, before + 1, "a heading level is skipped")
        found = tags(html)
        ids = [attrs["id"] for _, attrs in found if attrs.get("id")]
        self.assertEqual(len(ids), len(set(ids)), "duplicate ids")
        for tag, attrs in found:
            classes = (attrs.get("class") or "").split()
            if "c-filter" in classes or "c-btn--copy" in classes:
                self.assertIn("hidden", attrs, (tag, classes))
            for name in ("aria-labelledby", "data-copy"):
                if attrs.get(name):
                    self.assertIn(attrs[name], ids, (tag, name))
        rows = [attrs for tag, attrs in found if tag == "tr" and "data-status" in attrs]
        self.assertEqual(len(rows), 20)
        cards = [attrs for tag, attrs in found if tag == "article" and "c-lane" in (attrs.get("class") or "").split()]
        self.assertEqual(len(cards), 16)
        for attrs in rows + cards:
            self.assertNotIn("hidden", attrs)
        prompt = re.search(r'<pre [^>]*id="ai-prompt"[^>]*>(.*?)</pre>', start, flags=re.S).group(1)
        self.assertIn(f"{build.RAW_URL}AGENTS.md", prompt)
        self.assertIn(f"{build.RAW_URL}llms.txt", prompt)
        # The prompt is English on every page and is not machine-translated before it is copied.
        pre = next(attrs for tag, attrs in tags(start) if tag == "pre" and attrs.get("id") == "ai-prompt")
        for tag, attrs in tags(start):
            if "c-btn--copy" in (attrs.get("class") or "").split():
                self.assertIn("hidden", attrs)
                self.assertIn(attrs["data-copy"], {a.get("id") for _, a in tags(start)})
        self.assertEqual((pre.get("lang"), pre.get("translate"), pre.get("role")), ("en", "no", "region"))
        for tag, attrs in found:
            classes = (attrs.get("class") or "").split()
            # A scrolling table can be reached and scrolled with the keyboard.
            if "c-table-wrap" in classes:
                self.assertEqual((attrs.get("tabindex"), attrs.get("role")), ("0", "region"), attrs)
                self.assertIn("aria-labelledby", attrs)
            # A note in a table is a span; a cell keeps its table layout.
            if tag in ("td", "th"):
                self.assertNotIn("c-table__note", classes)
        self.assertEqual(html.count('class="c-steps__exit"'), 2)
        for first, end in (('id="area-wallet"', "</tr>"), ('id="lane-A-WALLET"', "</article>")):
            part = html.split(first)[1].split(end)[0]
            self.assertEqual(re.findall(r'<meter class="c-bar[^"]*" min="0" max="100" value="([0-9.]+)"', part),
                             ["37.4", "63.0"], first)

    def test_each_lane_card_names_its_owner_and_second_pass(self) -> None:
        """The handles on the cards are the hub's; a lane with an owner never waits for one."""
        data = json.loads((build.ROOT.parent / "dev" / "plan" / "lanes.json").read_text(encoding="utf-8"))
        texts = build.load_texts(build.ROOT / "content" / "texts.yaml")
        for lang in build.LANGUAGES:
            ui = {key: str(escape(text)) for key, text in texts[lang].items()}
            html = (self.out / build.page_path(lang, "dev-work").strip("/") / "index.html").read_text(encoding="utf-8")
            for lane in data["lanes"]:
                with self.subTest(lang=lang, lane=lane["id"]):
                    head, card = html.split(f'id="lane-{lane["id"]}"')[1].split("</article>")[0].split(">", 1)
                    shown = []
                    for key in ("hub.lane.owner", "hub.lane.second"):
                        row = re.search(rf"<dt>{re.escape(ui[key])}</dt>\s*<dd>([^<]*)</dd>", card)
                        self.assertIsNotNone(row, key)
                        shown.append(row.group(1))
                    wanted = [lane[slot]["handle"] or ui["hub.lane.open"] for slot in ("owner", "second_pass")]
                    self.assertEqual(shown, wanted)
                    owned = lane["owner"]["handle"] is not None
                    self.assertIn(f'data-waiting="{0 if owned else 1}"', head)
                    self.assertEqual(ui["hub.lanes.waiting"] in card, not owned)

    def test_the_developers_page_names_both_measured_commits(self) -> None:
        """Coverage and the other counts come from different runs; each caption names both commits."""
        hub = build.load_hub(build.ROOT / "content" / "hub.yaml")
        texts = build.load_texts(build.ROOT / "content" / "texts.yaml")
        m = hub.measured
        values = (m.coverage_commit, m.coverage_date.isoformat(), m.commit, m.date.isoformat(), m.head)
        for lang in build.LANGUAGES:
            html = (self.out / build.page_path(lang, "dev-work").strip("/") / "index.html").read_text(encoding="utf-8")
            caption = texts[lang]["hub.measured"].format(
                coverage_commit=m.coverage_commit, coverage_date=m.coverage_date.isoformat(),
                commit=m.commit, date=m.date.isoformat(), head=m.head,
            )
            with self.subTest(lang=lang):
                # Coverage tiles, classes, lanes and gates.
                self.assertEqual(html.count(str(escape(caption))), 4)
                for value in values:
                    self.assertIn(value, caption)


    def test_draft_pages_are_english_noindex_and_linked_from_nowhere(self) -> None:
        pages = {page.relative_to(self.out): page.read_text(encoding="utf-8") for page in self.out.rglob("index.html")}
        for draft in build.DRAFT_PAGES:
            with self.subTest(draft=draft):
                html = pages[Path(draft) / "index.html"]
                self.assertIn('<meta name="robots" content="noindex, nofollow">', html)
                for lang in build.LANGUAGES[1:]:
                    self.assertFalse((self.out / lang / draft).exists())
                for path, other in pages.items():
                    if path.parts[-2:-1] != (draft,):
                        self.assertNotIn(f'href="/{draft}/', other, str(path))
                        self.assertNotIn("noindex", other, str(path))
                for name in ("llms.txt", "llms-full.txt"):
                    self.assertNotIn(draft, (self.out / name).read_text(encoding="utf-8"))

    def test_every_page_has_an_icon_that_exists(self) -> None:
        self.assertTrue((self.out / "favicon.ico").is_file())
        for page in sorted(self.out.rglob("index.html")):
            html = page.read_text(encoding="utf-8")
            hrefs = re.findall(r'<link rel="(?:icon|apple-touch-icon)" href="([^"?]+)', html)
            with self.subTest(page=str(page.relative_to(self.out))):
                self.assertEqual(len(hrefs), 3)
                for href in hrefs:
                    self.assertTrue((self.out / href.lstrip("/")).is_file(), href)

    def test_every_page_describes_itself(self) -> None:
        """Search results and link previews show each page's own description, in its own language."""
        texts = build.load_texts(build.ROOT / "content" / "texts.yaml")

        def description(path: str) -> str:
            html = (self.out / path.strip("/") / "index.html").read_text(encoding="utf-8")
            found = [attrs.get("content") or "" for tag, attrs in tags(html)
                     if tag == "meta" and attrs.get("name") == "description"]
            self.assertEqual(len(found), 1, path)
            return found[0]

        languages: dict[str, set[str]] = {page_id: set() for page_id in build.ALL_PAGES}
        for lang in build.LANGUAGES:
            start = description(build.page_path(lang, "home"))
            pages = set()
            for page_id in build.ALL_PAGES:
                text = description(build.page_path(lang, page_id))
                key = "meta_description" if page_id == "home" else f"page.{page_id}.description"
                with self.subTest(lang=lang, page=page_id):
                    self.assertTrue(text.strip())
                    self.assertEqual(text, texts[lang][key])
                    if page_id != "home":
                        self.assertNotEqual(text, start)
                        self.assertLessEqual(len(text), 160)
                pages.add(text)
                languages[page_id].add(text)
            with self.subTest(lang=lang):
                self.assertEqual(len(pages), len(build.ALL_PAGES), f"two pages share a description in {lang}")
        for page_id, found in languages.items():
            with self.subTest(page=page_id):
                self.assertEqual(len(found), len(build.LANGUAGES), f"two languages share the description of {page_id}")
        for draft in build.DRAFT_PAGES:
            with self.subTest(draft=draft):
                text = description(build.page_path("en", draft))
                self.assertTrue(text.strip())
                self.assertNotEqual(text, description(build.page_path("en", "home")))
                self.assertLessEqual(len(text), 160)

    def test_the_files_for_ai_tools_carry_the_whole_content(self) -> None:
        index = (self.out / "llms.txt").read_text(encoding="utf-8")
        full = (self.out / "llms-full.txt").read_text(encoding="utf-8")
        page = build.load_community(build.ROOT / "content" / "community.yaml")
        guide = build.load_guide(build.ROOT / "content" / "guide.yaml")
        for text in (index, full):
            self.assertTrue(text.startswith("# BTX Community"))
            self.assertIn(build.LLMS_NOTICE, text)
            # The notice sends readers to the API for live figures, so both files list it.
            self.assertIn(f"]({build.STATUS_API})", text)
            self.assertNotRegex(text, r"\{[a-z]+\}", "a placeholder was left unfilled")
            # Every link is absolute: these files are read outside the site.
            for url in re.findall(r"\]\(([^)]*)\)", text):
                self.assertTrue(url.startswith("https://"), url)
        for page_id in build.PAGES:
            self.assertIn(f"]({build.SITE_URL}{build.page_path('en', page_id)})", index)
        self.assertIn(f"]({build.SITE_URL}/llms-full.txt)", index)
        for category in page.categories:
            for entry in category.entries:
                self.assertIn(f"- [{entry.name}]({entry.url}): {entry.description.en}", full)
        for removed in page.removed:
            self.assertIn(f"- {removed.name}: {removed.reason.en}", full)
        for fact in guide.facts:
            self.assertIn(fact.text.en, full)
        for checklist in guide.checklists:
            for item in checklist.items:
                self.assertIn(f"- {item.en}", full)


class DeveloperPagesTest(unittest.TestCase):
    """The developers page split in two: "Start here" (/dev/) and "Ongoing work" (/dev/work/)."""

    @classmethod
    def setUpClass(cls) -> None:
        cls._tmp = tempfile.TemporaryDirectory()
        cls.out = Path(cls._tmp.name) / "site"
        build.build(cls.out, "test")

    @classmethod
    def tearDownClass(cls) -> None:
        cls._tmp.cleanup()

    def read(self, lang: str, page: str) -> str:
        return (self.out / build.page_path(lang, page).strip("/") / "index.html").read_text(encoding="utf-8")

    def ids(self, html: str) -> set[str]:
        main = html.split('<main id="main">')[1].split("</main>")[0]
        return {attrs["id"] for _, attrs in tags(main) if attrs.get("id")}

    def test_the_work_page_sits_below_the_developers_page(self) -> None:
        self.assertEqual(build.SUBPAGES, {"dev-work": ("dev", "dev/work")})
        self.assertNotIn("dev-work", build.PAGES)
        self.assertEqual(build.page_path("en", "dev-work"), "/dev/work/")
        self.assertEqual(build.page_path("zh", "dev-work"), "/zh/dev/work/")

    def test_both_pages_carry_the_sub_menu_and_keep_developers_marked(self) -> None:
        for lang in build.LANGUAGES:
            for page in ("dev", "dev-work"):
                html = self.read(lang, page)
                with self.subTest(lang=lang, page=page):
                    menu = html.split('class="c-menu"')[1].split("</nav>")[0]
                    self.assertEqual(re.findall(r'href="([^"]+)" aria-current="page"', menu), [build.page_path(lang, "dev")])
                    sub = html.split('class="c-subnav"')[1].split("</nav>")[0]
                    links = re.findall(r'href="([^"]+)"', sub)
                    self.assertEqual(links, [build.page_path(lang, "dev"), build.page_path(lang, "dev-work")])
                    self.assertEqual(re.findall(r'href="([^"]+)" aria-current="page"', sub), [build.page_path(lang, page)])
                    # Every language version of a sub-page points at the same sub-page in the others.
                    for code in build.LANGUAGES:
                        self.assertIn(f'href="{build.page_path(code, page)}" hreflang=', html)

    def test_every_section_lives_on_one_of_the_two_pages(self) -> None:
        start, work = self.ids(self.read("en", "dev")), self.ids(self.read("en", "dev-work"))
        self.assertEqual(start & work, set())
        self.assertTrue(set(NAV) <= start)
        self.assertTrue(set(NAV_WORK) <= work)

    def test_links_to_moved_sections_follow_them(self) -> None:
        """An old link such as /dev/#lanes goes to /dev/work/#lanes: community.js knows every id that moved."""
        script = (build.ROOT / "static" / "js" / "community.js").read_text(encoding="utf-8")
        body = re.search(r"var DEV_MOVED = new RegExp\((.*?)\);", script, flags=re.S).group(1)
        moved = re.compile("".join(re.findall(r'"((?:[^"\\]|\\.)*)"', body)))
        for lang in build.LANGUAGES:
            start, work = self.ids(self.read(lang, "dev")), self.ids(self.read(lang, "dev-work"))
            with self.subTest(lang=lang):
                self.assertEqual({i for i in work if not moved.fullmatch(i)}, set())
                self.assertEqual({i for i in start if moved.fullmatch(i)}, set())

    def test_the_start_page_points_ai_tools_at_the_files_for_them(self) -> None:
        for lang in build.LANGUAGES:
            html = self.read(lang, "dev")
            files = html.split('class="c-ai-files"')[1].split("</ul>")[0]
            for name in ("llms.txt", "llms-full.txt"):
                self.assertIn(f'href="/{name}"', files)
                self.assertTrue((self.out / name).is_file(), name)
        index = (self.out / "llms.txt").read_text(encoding="utf-8")
        self.assertIn(f"]({build.SITE_URL}/dev/work/)", index)

    def test_the_coverage_section_says_where_its_figures_come_from(self) -> None:
        texts = build.load_texts(build.ROOT / "content" / "texts.yaml")
        for lang in build.LANGUAGES:
            html = self.read(lang, "dev-work")
            note = html.split('id="coverage-weekly"')[1].split("</p>")[0]
            self.assertIn("coverage.json", note)
            self.assertIn(texts[lang]["hub.coverage.weekly"].replace("'", "&#39;"), html)


class ProjectsTest(unittest.TestCase):
    """The projects at the top of the Projects page (the menu slot that held Documents)."""

    @classmethod
    def setUpClass(cls) -> None:
        cls._tmp = tempfile.TemporaryDirectory()
        cls.out = Path(cls._tmp.name) / "site"
        build.build(cls.out, "test")
        cls.projects = build.load_projects(build.ROOT / "content" / "projects.yaml")
        cls.raw = build.load_yaml(build.ROOT / "content" / "projects.yaml")

    @classmethod
    def tearDownClass(cls) -> None:
        cls._tmp.cleanup()

    def read(self, lang: str, page: str) -> str:
        return (self.out / build.page_path(lang, page).strip("/") / "index.html").read_text(encoding="utf-8")

    def test_projects_take_the_documents_slot_and_keep_the_papers(self) -> None:
        texts = build.load_texts(build.ROOT / "content" / "texts.yaml")
        self.assertEqual(texts["en"]["nav.docs"], "Projects")
        for lang in build.LANGUAGES:
            html = self.read(lang, "docs")
            with self.subTest(lang=lang):
                self.assertLess(html.index('id="projects"'), html.index('id="documents"'))
                cards = re.findall(r'<article class="c-audience c-role c-project" id="project-([a-z-]+)">', html)
                self.assertEqual(cards, [p.id for p in self.projects.projects])
                self.assertIn('id="doc-roadmap"', html)

    def test_every_card_cites_its_sources_and_its_links_resolve(self) -> None:
        html = self.read("en", "docs")
        for project in self.projects.projects:
            card = html.split(f'id="project-{project.id}"')[1].split("</article>")[0]
            with self.subTest(project=project.id):
                self.assertGreaterEqual(len(project.cites), 1)
                for cite in project.cites:
                    label = cite.split(":", 1)[1]
                    self.assertIn(label, card.replace("btx-community/", ""), cite)
                for href in re.findall(r'href="([^"]+)"', card):
                    if href.startswith("/"):
                        path, _, anchor = href.partition("#")
                        target = self.out / path.strip("/") / "index.html"
                        self.assertTrue(target.is_file(), href)
                        if anchor:
                            self.assertIn(f'id="{anchor}"', target.read_text(encoding="utf-8"), href)
                    elif href.startswith(build.REPO_URL + "/blob/main/"):
                        self.assertTrue(build.repo_file(href).exists(), href)
                    elif href.startswith(build.BTX_REPO_URL + "/"):
                        self.assertRegex(href, r"/((blob|tree)/(main|v[0-9.]+)/[A-Za-z0-9_./-]+|issues|releases/tag/v[0-9.]+)$")
                    else:
                        self.assertRegex(href, build.LINK_PATTERN)

    def test_other_pages_point_at_the_new_pages(self) -> None:
        for lang in build.LANGUAGES:
            docs, infra, dev = (build.page_path(lang, p) for p in ("docs", "infra", "dev-work"))
            with self.subTest(lang=lang):
                self.assertIn(f'href="{docs}#projects"', self.read(lang, "infra"))
                home = self.read(lang, "home")
                nodes = home.split('id="nodes"')[1].split("</article>")[0]
                self.assertIn(f'href="{infra}"', nodes)
                devs = home.split('id="developers"')[1].split("</article>")[0]
                self.assertIn(f'href="{docs}"', devs)
                self.assertIn(f'href="{dev}"', devs)
                newcomers = home.split('id="newcomers"')[1].split("</article>")[0]
                links = re.findall(r'href="([^"]+)"', newcomers)
                self.assertEqual(links[0], build.page_path(lang, "learn"))

    def test_a_card_never_names_a_price_or_a_person(self) -> None:
        data = json.loads(json.dumps(self.raw, default=str))
        data["projects"][0]["missing"]["en"] = "A server at $20 a month."
        with self.assertRaises(Exception):  # noqa: B017, PT027
            build.ProjectsPage.model_validate(data)
        community = (build.ROOT / "content" / "community.yaml").read_text(encoding="utf-8")
        self.assertNotIn("(Mende and Jarek)", community)


class InfraTest(unittest.TestCase):
    """The "Run infra" page: its links, its map and the rules of infra.yaml."""

    @classmethod
    def setUpClass(cls) -> None:
        cls._tmp = tempfile.TemporaryDirectory()
        cls.out = Path(cls._tmp.name) / "site"
        build.build(cls.out, "test")
        cls.infra = build.load_infra(build.ROOT / "content" / "infra.yaml")
        cls.raw = build.load_yaml(build.ROOT / "content" / "infra.yaml")

    @classmethod
    def tearDownClass(cls) -> None:
        cls._tmp.cleanup()

    def read(self, lang: str, page: str = "infra") -> str:
        return (self.out / build.page_path(lang, page).strip("/") / "index.html").read_text(encoding="utf-8")

    def broken(self, change: Callable[[dict], None]) -> None:
        """infra.yaml with one change applied must be rejected."""
        data = json.loads(json.dumps(self.raw, default=str))
        change(data)
        with self.assertRaises(Exception):  # noqa: B017, PT027
            build.InfraPage.model_validate(data)

    def test_the_page_is_in_the_menu_next_to_the_developers(self) -> None:
        self.assertEqual(build.PAGES[-2:], ("infra", "dev"))
        for lang in build.LANGUAGES:
            html = self.read(lang)
            self.assertIn('aria-current="page"', html)
            menu = html.split('class="c-menu"')[1].split("</nav>")[0]
            hrefs = re.findall(r'href="([^"]+)"', menu)
            self.assertEqual(hrefs, [build.page_path(lang, page) for page in build.PAGES], lang)

    def test_every_link_resolves(self) -> None:
        for lang in build.LANGUAGES:
            html = self.read(lang)
            found = tags(html)
            ids = {attrs["id"] for _, attrs in found if attrs.get("id")}
            with self.subTest(lang=lang):
                for tag, attrs in found:
                    href = attrs.get("href")
                    if tag != "a" or not href:
                        continue
                    if href.startswith("#"):
                        self.assertIn(href[1:], ids, href)
                    elif href.startswith("/"):
                        path, _, anchor = href.partition("#")
                        target = self.out / path.strip("/") / "index.html"
                        self.assertTrue(target.is_file(), href)
                        if anchor:
                            self.assertIn(f'id="{anchor}"', target.read_text(encoding="utf-8"), href)
                    elif href.startswith(build.REPO_URL + "/"):
                        if href.startswith(f"{build.REPO_URL}/blob/main/") or href.startswith(f"{build.REPO_URL}/tree/main/"):
                            self.assertTrue(build.repo_file(href).exists(), href)
                        else:
                            self.assertEqual(href, f"{build.REPO_URL}/issues")
                    elif href.startswith(build.BTX_REPO_URL + "/"):
                        # The node software's docs on main, the cited lines at the tag they were read at.
                        self.assertRegex(
                            href,
                            rf"^{re.escape(build.BTX_REPO_URL)}/((blob|tree)/(main|{re.escape(self.infra.verified.tag)})/"
                            r"[A-Za-z0-9_./-]+|issues|releases(/tag/v[0-9.]+)?|security/advisories/new)$",
                        )
                    else:
                        self.assertRegex(href, build.LINK_PATTERN)
                        self.assertIn('rel="noopener noreferrer"', html.split(f'href="{href}"')[1].split(">")[0])

    def test_the_fuzz_box_guide_and_the_hub_files_exist(self) -> None:
        # The guides this page reuses are files of this repository; the build refuses a link to a missing one.
        for url in self.infra.links():
            path = build.repo_file(url)
            if path is not None:
                self.assertTrue(path.exists(), url)
        self.assertIn(f"{build.REPO_URL}/blob/main/dev/fuzz-box/README.md", self.infra.links())

    def test_the_map_has_text_alternatives(self) -> None:
        edges = len(self.infra.map.edges)
        for lang in build.LANGUAGES:
            html = self.read(lang)
            found = tags(html)
            ids = {attrs["id"] for _, attrs in found if attrs.get("id")}
            svgs = re.findall(r"<svg [^>]*>.*?</svg>", html, flags=re.S)
            with self.subTest(lang=lang):
                self.assertEqual(len(svgs), len(build.LAYOUTS))
                for svg in svgs:
                    head = tags(svg)[0][1]
                    self.assertEqual(head.get("role"), "group")
                    title_id, desc_id = head["aria-labelledby"].split()
                    self.assertRegex(svg, rf'<title id="{title_id}">[^<]+</title>')
                    self.assertRegex(svg, rf'<desc id="{desc_id}">[^<]+</desc>')
                    self.assertIn('class="c-map__arrows" aria-hidden="true"', svg)
                    for tag, attrs in tags(svg):
                        if tag == "a":
                            self.assertTrue(attrs.get("aria-label"), attrs)
                    # Every numbered arrow is drawn and explained in the list below the map.
                    numbers = {int(n) for n in re.findall(r'data-edge="(\d+)"', svg)}
                    self.assertEqual(numbers, set(range(1, edges + 1)))
                    self.assertEqual(svg.count("<a "), len(self.infra.map.nodes))
                self.assertEqual(len(re.findall(r'<li id="edge-\d+">', html)), edges)
                for number in range(1, edges + 1):
                    self.assertIn(f"edge-{number}", ids)
                self.assertRegex(html, r"<figcaption[^>]*>[^<]+</figcaption>")

    def test_every_box_label_fits_in_every_language(self) -> None:
        for lang in build.LANGUAGES:
            table = {}
            if lang in build.TRANSLATED:
                table = build.load_translations(build.ROOT / "content" / "translations" / f"{lang}.yaml", lang)
            say = build.Localizer(lang, table)
            for layout in build.LAYOUTS:
                view = build.map_view(self.infra, layout, say)
                for box in view.boxes:
                    with self.subTest(lang=lang, layout=layout.name, box=box.id):
                        room = box.x + box.width - layout.pad + 1
                        for line in box.title:
                            self.assertLessEqual(line.x + build.text_width(line.text, layout.title_size, bold=True), room, line.text)
                        for line in box.labels:
                            self.assertLessEqual(line.x + build.text_width(line.text, layout.label_size), room, line.text)
                        if box.code is not None:
                            self.assertLessEqual(box.code.x + build.text_width(box.code.text, layout.code_size, mono=True), room)
                        self.assertLessEqual(box.y + box.height, view.height)
                x, _, width, _ = view.frame
                for line in view.frame_label:
                    self.assertLessEqual(line.x + build.text_width(line.text, layout.label_size, mono=True), x + width - 8, (lang, line.text))

    def test_a_role_without_a_guide_says_so(self) -> None:
        html = self.read("en")
        coming = self.infra.texts.coming.en
        without = {role.id for role in self.infra.roles if role.guide is None}
        self.assertEqual(without, {"ci-runner", "guix"})
        for role in self.infra.roles:
            card = unescape(html.split(f'id="role-{role.id}"')[1].split("</article>")[0])
            self.assertEqual(coming in card, role.guide is None, role.id)
            if role.coming is not None:
                self.assertIn(role.coming.en, card)

    def test_security_roles_carry_the_private_route(self) -> None:
        self.assertEqual(self.infra.private_route, "https://github.com/btxchain/btx/security/advisories/new")
        for lang in build.LANGUAGES:
            html = self.read(lang)
            report = html.split('id="report"')[1].split("</section>")[0]
            self.assertIn(f'href="{self.infra.private_route}"', report)
            self.assertIn(f'href="{self.infra.policy}"', report)
            for role in self.infra.roles:
                card = html.split(f'id="role-{role.id}"')[1].split("</article>")[0]
                self.assertEqual('href="#report"' in card, role.security, (lang, role.id))
        self.assertTrue(all(role.security for role in self.infra.roles if role.kind == "testing"))
        self.assertTrue(next(role for role in self.infra.roles if role.id == "signer").security)

    def test_the_managed_side_shows_the_link_lists_own_words(self) -> None:
        page = build.load_community(build.ROOT / "content" / "community.yaml")
        entry = next(e for c in page.categories for e in c.entries if e.id == "easynode")
        card = self.read("en").split('id="managed"')[1].split("</article>")[0]
        self.assertIn(entry.description.en, unescape(card))
        self.assertIn(entry.note.en, unescape(card))
        self.assertEqual(self.infra.managed, ["easynode"])

    def test_every_edge_cites_a_line_range(self) -> None:
        html = self.read("en")
        for number, edge in enumerate(self.infra.map.edges, start=1):
            item = html.split(f'<li id="edge-{number}">')[1].split("</li>")[0]
            for cite in edge.cites:
                label = cite.split(":", 1)[1]
                self.assertIn(label, item.replace("btx-community/", ""), cite)
            if any(cite.startswith("btx:") for cite in edge.cites):
                self.assertIn(f"/blob/{self.infra.verified.tag}/", item)

    def test_broken_infra_content_is_rejected(self) -> None:
        def price(data: dict) -> None:
            data["roles"][0]["hardware"]["en"] = "A small server for about $10 a month."

        def no_guide(data: dict) -> None:
            del data["roles"][3]["guide"]

        def unknown_role(data: dict) -> None:
            data["map"]["nodes"][0] = {**data["map"]["nodes"][0], "page": None, "anchor": None, "role": "miner"}

        def undrawable(data: dict) -> None:
            data["map"]["edges"].append({**data["map"]["edges"][0], "from": "guix", "to": "status"})

        def shared_place(data: dict) -> None:
            data["map"]["nodes"][2]["wide"] = data["map"]["nodes"][0]["wide"]

        def left_on_a_phone(data: dict) -> None:
            data["map"]["nodes"][0]["narrow"] = {"col": "L", "row": 1}

        def frame_outside_c(data: dict) -> None:
            data["map"]["nodes"][1]["wide"] = {"col": "L", "row": 1}

        def other_route(data: dict) -> None:
            data["private_route"] = "https://example.com/report"

        def bad_cite(data: dict) -> None:
            data["map"]["edges"][0]["cites"] = ["btx:src/protocol.h"]

        for change in (price, no_guide, unknown_role, undrawable, shared_place, left_on_a_phone, frame_outside_c,
                       other_route, bad_cite):
            with self.subTest(change=change.__name__):
                self.broken(change)
        # The real content passes, and a managed entry must exist in the link list.
        build.InfraPage.model_validate(json.loads(json.dumps(self.raw, default=str)))
        page = build.load_community(build.ROOT / "content" / "community.yaml")
        changed = self.infra.model_copy(update={"managed": ["no-such-entry"]})
        with self.assertRaises(build.ContentError):
            build.check_infra(changed, page)

    def test_the_home_node_box_sits_near_the_top_with_its_links(self) -> None:
        self.assertIsNotNone(self.infra.home)
        for lang in build.LANGUAGES:
            html = self.read(lang)
            with self.subTest(lang=lang):
                self.assertLess(html.index('id="paths"'), html.index('id="home-node"'))
                self.assertLess(html.index('id="home-node"'), html.index('id="roles"'))
                box = html.split('id="home-node"')[1].split("</section>")[0]
                self.assertEqual(re.findall(r'class="c-home__point" id="home-([a-z]+)"', box), ["privacy", "reach"])
                # The facts that must survive translation: the two ports btxd maps, the safe
                # settings and the switch for the update checks.
                for fact in ("19335", "29447", "natpmp=0", "modelnet=0", "autoupdate=0"):
                    self.assertIn(fact, box)
                self.assertIn(f'href="{build.page_path(lang, "home")}#before-installing"', box)
                self.assertIn('href="https://github.com/btxchain/btx/blob/main/doc/tor.md"', box)
        home = (self.out / "index.html").read_text(encoding="utf-8")
        self.assertIn('id="before-installing"', home)

    def test_the_home_node_box_names_no_price(self) -> None:
        data = json.loads(json.dumps(self.raw, default=str))
        data["home"]["points"][0]["items"][0]["en"] = "A small box costs about $5 a month."
        with self.assertRaises(Exception):  # noqa: B017, PT027
            build.InfraPage.model_validate(data)

    def test_text_wraps_at_spaces_hyphens_and_between_cjk_characters(self) -> None:
        self.assertEqual(build.wrap("one two three", build.text_width("one two", 10), 10), ("one two", "three"))
        self.assertEqual(build.wrap("Peer-Verbindungen", build.text_width("Peer-", 10), 10), ("Peer-", "Verbindungen"))
        self.assertEqual(build.wrap("下发模板回传区块", 40, 10), ("下发模板", "回传区块"))


if __name__ == "__main__":
    unittest.main()
