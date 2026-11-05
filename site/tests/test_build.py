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
            english = (out / "index.html").read_text(encoding="utf-8")
            german = (out / "de" / "index.html").read_text(encoding="utf-8")
            self.assertIn('<html lang="en">', english)
            self.assertIn('<html lang="de">', german)
            self.assertIn(build.STATUS_API, english)
            self.assertTrue((out / "static" / "css" / "community.css").is_file())
            self.assertTrue((out / "static" / "fonts" / "InterVariable.woff2").is_file())

    def test_texts_have_the_same_keys_in_both_languages(self) -> None:
        texts = build.load_texts(build.ROOT / "content" / "texts.yaml")
        self.assertEqual(set(texts["en"]), set(texts["de"]))


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
