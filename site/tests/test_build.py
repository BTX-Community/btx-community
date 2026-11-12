# SPDX-License-Identifier: MIT
"""Tests of site/build.py, run with ``python -m unittest discover site/tests``."""

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import build  # noqa: E402


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
                "home": ('id="start"', 'id="check"', 'data-live="fork"', 'href="{links}#cat-'),
                "learn": ('id="about"', 'id="next"'),
                "network": ('data-live="supply"', 'data-live="fork"', 'id="development" hidden',
                            f'data-api="{build.DEVELOPMENT_API}"', f'data-repo="{build.UPSTREAM_REPO}"'),
                "links": ('id="links"', 'id="cat-'),
                "docs": ('id="documents"', 'id="doc-venue-structure"'),
            }
            for lang in build.LANGUAGES:
                for page, needles in expected.items():
                    html = read(lang, page)
                    self.assertIn('aria-current="page"', html)
                    for needle in needles:
                        self.assertIn(needle.format(links=build.page_path(lang, "links")), html, (lang, page))
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

    def test_every_content_text_is_translated(self) -> None:
        page = build.load_community(build.ROOT / "content" / "community.yaml")
        guide = build.load_guide(build.ROOT / "content" / "guide.yaml")
        texts = build.load_texts(build.ROOT / "content" / "texts.yaml")
        for lang in build.TRANSLATED:
            table = build.load_translations(build.ROOT / "content" / "translations" / f"{lang}.yaml", lang)
            say = build.Localizer(lang, table)
            for page_id in build.PAGES:
                build.context(page, guide, texts, lang, "test", page_id, say)
            with self.subTest(lang=lang):
                self.assertEqual(say.missing, set())
                self.assertEqual(set(table) - say.used, set())

    def test_texts_have_the_same_keys_in_every_language(self) -> None:
        texts = build.load_texts(build.ROOT / "content" / "texts.yaml")
        for lang in build.LANGUAGES:
            self.assertEqual(set(texts["en"]), set(texts[lang]), lang)


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


if __name__ == "__main__":
    unittest.main()
