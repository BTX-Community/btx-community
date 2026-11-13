# SPDX-License-Identifier: MIT
"""Tests of site/build.py, run with ``python -m unittest discover site/tests``."""

from __future__ import annotations

import json
import re
import sys
import tempfile
import unittest
from html.parser import HTMLParser
from pathlib import Path
from typing import get_args

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import build  # noqa: E402

NAV = ("begin", "brief", "levels", "coverage", "classes", "lanes", "flow", "gates", "rhythm", "rules", "contribute")
"""The sections of the developers page, in the order of its anchor bar."""
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
NUMBERS = {2: "Two", 5: "five"}


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
                "docs": ('id="documents"', 'id="doc-venue-structure"'),
                "dev": ('id="begin"', 'id="levels"', 'id="coverage"', 'id="lanes"', 'id="group-area"',
                        '<span class="c-tag">A-WALLET</span>', 'id="level-basic"', 'id="brief"', 'id="classes"',
                        'id="flow"', 'id="gates"', 'id="rhythm"', 'id="rules"', 'id="contribute"',
                        'id="lane-A-WALLET"', 'id="class-K01"', 'id="area-wallet"', 'data-status="worklist"',
                        '<meter class="c-bar', 'id="ai-prompt"', 'data-copy="ai-prompt"', 'data-kind="area"',
                        'data-waiting="1"', 'data-sort="lowest"', 'data-template="', 'data-waiting-only',
                        'data-expand', 'data-reset', 'data-label-expand="', 'data-label-collapse="',
                        'data-copied="', 'data-copy-hint', 'data-copy-status', 'data-sort-column="lowest"',
                        'data-sort-column="risk"', 'data-sort-column="size"', 'data-filter="registry"',
                        'data-filter="lanes"', 'data-filter="areas"', 'class="c-link c-table__lane"'),
            }
            for lang in build.LANGUAGES:
                for page, needles in expected.items():
                    html = read(lang, page)
                    self.assertIn('aria-current="page"', html)
                    for needle in needles:
                        hrefs = {"links": build.page_path(lang, "links"), "dev": build.page_path(lang, "dev")}
                        self.assertIn(needle.format(**hrefs), html, (lang, page))
                    for other in build.PAGES:
                        self.assertIn(f'href="{build.page_path(lang, other)}"', html)
                    for code in build.LANGUAGES:
                        tag = build.HTML_LANG.get(code, code)
                        self.assertIn(f'href="{build.page_path(code, page)}" hreflang="{tag}"', html)
            self.assertNotIn('data-live="supply"', english)
            self.assertNotIn('id="development"', english)
            self.assertIn('href="/de/links/"', read("en", "links").split('class="c-lang"')[1])
            chinese = read("zh", "learn")
            self.assertIn('<html lang="zh-Hans">', chinese)
            self.assertIn("固定供应量", chinese)
            self.assertIn("translations/zh.yaml", chinese)
            self.assertNotIn("translations/", english)
            self.assertNotIn('id="coverage"', english)
            self.assertIn("16 lanes", read("en", "dev"))
            self.assertIn("16 Arbeitsbereiche", read("de", "dev"))
            for lang in build.LANGUAGES:
                written, other = (",", r"\.") if lang in ("de", "es", "fr") else (r"\.", ",")
                space = "\u202f" if lang == "fr" else "\u00a0"
                self.assertRegex(read(lang, "dev"), rf"<dd>\d+{written}\d{space}%</dd>", lang)
                self.assertNotRegex(read(lang, "dev"), rf"<dd>\d+{other}\d\s%</dd>", lang)

    def test_every_content_text_is_translated(self) -> None:
        page = build.load_community(build.ROOT / "content" / "community.yaml")
        guide = build.load_guide(build.ROOT / "content" / "guide.yaml")
        hub = build.load_hub(build.ROOT / "content" / "hub.yaml")
        texts = build.load_texts(build.ROOT / "content" / "texts.yaml")
        for lang in build.TRANSLATED:
            table = build.load_translations(build.ROOT / "content" / "translations" / f"{lang}.yaml", lang)
            say = build.Localizer(lang, table)
            for page_id in build.PAGES:
                build.context(page, guide, hub, texts, lang, "test", page_id, say)
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
        template = (build.ROOT / "templates" / "dev.html.j2").read_text(encoding="utf-8")
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
            "measured": {"commit": "c6f9678d", "date": "2026-11-12", "head": "4c7840e9"},
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

        broken = (
            {"schema_version": 2},
            {"checked": "2026-11-11"},
            {"levels": page["levels"][:2]},
            {"levels": [*page["levels"], {"id": "expert", **level}]},
            {"levels": [{"id": "basic", **level}] * 3},
            {"principles": [*page["principles"], {"id": "p4", "title": text, "text": text}]},
            lanes({**lane, "id": "a-wallet"}),
            lanes(lane, lane),
            lanes({**lane, "owner": "x"}),
            lanes({**lane, "waiting": True}),
            lanes({k: v for k, v in lane.items() if k != "pack"}),
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
            measured = plan["measured_at"]
            self.assertEqual(
                (hub.measured.commit, hub.measured.date.isoformat(), hub.measured.head),
                (measured["commit"], measured["date"], measured["live_head"]),
            )

        with self.subTest("coverage figures"):
            coverage = next(line for line in state.splitlines() if line.startswith("> **Coverage is measured again.**"))
            self.assertEqual(
                [float(p) for p in re.findall(r"\*\*(\d+\.\d)%\*\*", coverage)],
                [figure.percent for figure in hub.coverage.figures],
            )
            for fact in ("c6f9678d", "#578", "47 unit suites timed out", "82 of 208 functional scripts failed in the coverage run"):
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
            stated = {"K01": "worklist ready (12 files at 4c7840e9, plus 1 candidate the filter skipped); "
                             "shared helper exists (#576)"}
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
            waiting = set(lanes["no_work_until_claimed"])
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
                    self.assertEqual(lane.waiting, lane.id in waiting)
                    self.assertNotRegex(lane.scope.en, r"src/|\.(cpp|h)\b")
                    # The scope is written by hand; its numbers, classes and lane ids are the hub's.
                    # A-WALLET names the lane its shielded RPC belongs to; C-K01 names its class.
                    allowed = {"A-WALLET": {"A-SHIELDED"}, "C-K01": {"K01"}}.get(lane.id, set())
                    self.assertLessEqual(scope_marks(lane.scope.en) - allowed, scope_marks(data["scope"]))

        with self.subTest("counts the texts name"):
            # The lanes that wait for an owner: their number in the claim loop, their ids in the
            # text of their group.
            waiting_ids = [lane.id for _, lane in page_lanes if lane.waiting]
            self.assertEqual(waiting_ids, lanes["no_work_until_claimed"])
            claim = next(loop for loop in hub.contribute if loop.id == "claim")
            self.assertIn(f"the {NUMBERS[len(waiting_ids)]} that wait for an owner", claim.text.en)
            for group in hub.lanes.groups:
                named = [sentence for sentence in group.text.en.split(". ") if "no brief yet" in sentence]
                ids = re.findall(r"\b[A-Z]-[A-Z0-9-]+\b", " ".join(named))
                self.assertEqual(ids, [lane.id for lane in group.lanes if lane.waiting], group.id)
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
        self.assertEqual(len(pages), len(build.LANGUAGES) * len(build.PAGES))
        for page in pages:
            html = page.read_text(encoding="utf-8")
            with self.subTest(page=str(page.relative_to(self.out))):
                self.assertNotIn("<style", html)
                self.assertNotIn("javascript:", html)
                self.assertEqual(html.count("<script"), 1)
                self.assertRegex(html, r'<script src="/static/js/community\.js\?v=[0-9a-f]{12}" defer></script>')
                for tag, attrs in tags(html):
                    self.assertNotIn(tag, ("img", "iframe", "object", "embed", "base"))
                    self.assertNotIn("style", attrs, tag)
                    self.assertEqual([name for name in attrs if name.startswith("on")], [], tag)
                    for name in ("src", "href", "action"):
                        self.assertFalse((attrs.get(name) or "").startswith("data:"), (tag, attrs))
                    if tag == "link":
                        self.assertTrue((attrs.get("href") or "").startswith("/"), attrs)

    def test_the_developers_page_is_usable_without_javascript(self) -> None:
        html = (self.out / "dev" / "index.html").read_text(encoding="utf-8")
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
        prompt = re.search(r'<pre [^>]*id="ai-prompt"[^>]*>(.*?)</pre>', html, flags=re.S).group(1)
        self.assertIn(f"{build.RAW_URL}AGENTS.md", prompt)
        self.assertIn(f"{build.RAW_URL}llms.txt", prompt)
        # The prompt is English on every page and is not machine-translated before it is copied.
        pre = next(attrs for tag, attrs in found if tag == "pre" and attrs.get("id") == "ai-prompt")
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
        bar = html.split('class="c-jump c-jump--page"')[1].split("</nav>")[0]
        self.assertEqual(tuple(re.findall(r'href="#([^"]+)"', bar)), NAV)
        for anchor in re.findall(r'href="#([^"]+)"', html):
            self.assertIn(anchor, ids)
        for start, end in (('id="area-wallet"', "</tr>"), ('id="lane-A-WALLET"', "</article>")):
            part = html.split(start)[1].split(end)[0]
            self.assertEqual(re.findall(r'<meter class="c-bar[^"]*" min="0" max="100" value="([0-9.]+)"', part),
                             ["37.2", "50.5"], start)
        levels = [int(tag[1]) for tag, _ in found if re.fullmatch(r"h[1-6]", tag)]
        self.assertEqual(levels[0], 1)
        for before, after in zip(levels, levels[1:]):
            self.assertLessEqual(after, before + 1, "a heading level is skipped")


if __name__ == "__main__":
    unittest.main()
