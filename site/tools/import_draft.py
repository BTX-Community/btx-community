# SPDX-License-Identifier: MIT
"""Bring a finished static site in as a design draft under /new/<name>/.

    python site/tools/import_draft.py <source folder> <name> --title ... --summary ... --source ...

The source is a built site with root-absolute paths (/assets/..., /learn/). The copy in
site/new-static/<name>/files/ is changed so that it follows the rules of the drafts and the CSP of
btx-community.com, and nothing else:

- every page gets noindex, "[Draft]" in its title and link preview, and the draft banner;
- root-absolute links to the site's own pages and assets are moved under /new/<name>/; links to
  pages the site does not have keep pointing at the live site;
- inline <script> blocks move to assets/draft-inline.js, style="" attributes to a stylesheet per
  page (assets/draft-inline/<page>.css) keyed by a data attribute;
- Google Fonts links are replaced by assets/fonts.css with the self-hosted files in
  /static/fonts/new/ (Overpass, Overpass Mono).

Run it again on a newer version of the same site; it replaces the old copy. Look at the diff before
committing: the script refuses what it does not understand (other inline code, other third-party
assets) instead of guessing.
"""

from __future__ import annotations

import argparse
import hashlib
import html
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NEW_DIR = "new"
FEEDBACK = "https://github.com/BTX-Community/btx-community/issues/75"
GOOGLE_FONTS = re.compile(r'\s*<link rel="(?:preconnect|stylesheet)" href="https://fonts\.(?:googleapis|gstatic)\.com[^"]*"[^>]*>')
INLINE_SCRIPT = re.compile(r"\s*<script>(.*?)</script>", re.S)
STYLE_ATTR = re.compile(r' style="([^"]*)"')
INJECTED_STYLE = re.compile(
    r'var (\w+) = doc\.createElement\("style"\);\s*\1\.textContent = ((?:"(?:[^"\\]|\\.)*"\s*\+?\s*)+);\s*\(doc\.head \|\| root\)\.appendChild\(\1\);'
)
"""matrix-bg.js: var st = doc.createElement("style"); st.textContent = "..." + "..."; (doc.head || root).appendChild(st);"""
ROOT_REF = re.compile(r'((?:href|src|action)=")(/(?!/)[^"]*)"')

FONT_FACES = (
    ("Overpass", 400), ("Overpass", 600), ("Overpass", 700), ("Overpass", 800), ("Overpass", 900),
    ("Overpass Mono", 500), ("Overpass Mono", 700),
)
"""The faces the source asked Google Fonts for, now served from /static/fonts/new/."""
RANGES = {
    "latin": "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, "
             "U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
    "latin-ext": "U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, "
                 "U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, "
                 "U+2C60-2C7F, U+A720-A7FF",
}

BANNER_CSS = """/* The draft banner on every page of this imported draft (site/tools/import_draft.py). */
.draft-banner { background: #FFF1D6; color: #5C3700; border-bottom: 1px solid #E8C27A; position: relative; z-index: 1000; }
.draft-banner__text { margin: 0 auto; max-width: 1200px; padding: 8px 16px; font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
.draft-banner__link { color: inherit; font-weight: 600; margin-left: 12px; display: inline-flex; align-items: center; min-height: 32px; text-underline-offset: 3px; }
@media (max-width: 767px) { .draft-banner__link { min-height: 44px; } }
"""


def fonts_css() -> str:
    lines = ["/* Self-hosted instead of Google Fonts (CSP of btx-community.com); files in /static/fonts/new/. */"]
    for family, weight in FONT_FACES:
        stem = family.replace(" ", "")
        for subset, codes in RANGES.items():
            lines.append(
                f'@font-face {{ font-family: "{family}"; font-style: normal; font-weight: {weight}; font-display: swap;\n'
                f'  src: url("/static/fonts/new/{stem}-{weight}-{subset}.woff2") format("woff2");\n'
                f"  unicode-range: {codes}; }}"
            )
    return "\n".join(lines) + "\n"


def page_paths(files: Path) -> set[str]:
    """The URL paths of the site's own pages: /, /learn/, /dev/work/ ..."""
    rels = (p.parent.relative_to(files).as_posix() for p in files.rglob("index.html"))
    return {"/" if rel == "." else f"/{rel}/" for rel in rels}


def move_ref(path: str, base: str, pages: set[str]) -> str:
    """A root-absolute link of the source, under /new/<name>/ if it is the site's own."""
    bare = path.split("#", 1)[0].split("?", 1)[0]
    if bare.startswith("/assets/") or bare in pages:
        return base.rstrip("/") + path
    return path


def convert_page(text: str, rel: str, base: str, pages: set[str], name: str, title: str) -> tuple[str, str, str]:
    """The page with the draft rules applied, its inline script and its inline styles as CSS."""
    scripts = INLINE_SCRIPT.findall(text)
    script = scripts[0] if scripts else ""
    if len(scripts) > 1 or any(s.strip() != script.strip() for s in scripts):
        raise SystemExit(f"{rel}: more than one inline script; refusing to guess")
    text = INLINE_SCRIPT.sub(f'\n  <script src="{base}assets/draft-inline.js"></script>', text, count=1)
    if "fonts.googleapis.com" in text:
        text = GOOGLE_FONTS.sub("", text)
    if re.search(r'(href|src)="https?://[^"]+\.(css|js|woff2?)(\?|")', text):
        raise SystemExit(f"{rel}: loads a script, stylesheet or font from another site")
    rules = []

    def styled(match: re.Match[str]) -> str:
        key = hashlib.sha256(match.group(1).encode()).hexdigest()[:10]
        rule = f'[data-draft-style="{key}"] {{ {html.unescape(match.group(1)).strip().rstrip(";")}; }}'
        if rule not in rules:
            rules.append(rule)
        return f' data-draft-style="{key}"'

    text = STYLE_ATTR.sub(styled, text)
    css_name = rel.replace("/", "-").replace("index.html", "").strip("-") or "home"
    text = ROOT_REF.sub(lambda m: m.group(1) + move_ref(m.group(2), base, pages) + '"', text)
    head_links = (
        f'\n  <meta name="robots" content="noindex, nofollow">'
        f'\n  <link rel="stylesheet" href="{base}assets/fonts.css">'
        f'\n  <link rel="stylesheet" href="{base}assets/draft-banner.css">'
    )
    text = re.sub(r'(<meta charset="utf-8">)', r"\1" + head_links, text, count=1)
    if rules:
        # Last in <head>: the rules stood in style="" before, so they must still win over the page's CSS.
        text = text.replace("</head>", f'  <link rel="stylesheet" href="{base}assets/draft-inline/{css_name}.css">\n</head>', 1)
    text = re.sub(r"<title>", "<title>[Draft] ", text, count=1)
    text = re.sub(r'(<meta property="og:title" content=")', r"\1[Draft] ", text, count=1)
    live = re.search(r'<link rel="canonical" href="([^"]+)"', text)
    if not live:
        raise SystemExit(f"{rel}: no canonical link to the live page")
    banner = (
        '\n  <div class="draft-banner" role="note"><p class="draft-banner__text"><strong>Design draft</strong>'
        " – not the official layout. Content may lag behind."
        f' <a class="draft-banner__link" href="{FEEDBACK}" rel="noopener noreferrer">Feedback ↗</a>'
        f' <a class="draft-banner__link" href="/{NEW_DIR}/">All drafts →</a>'
        f' <a class="draft-banner__link" href="{live.group(1)}">This page on the live site ↗</a></p></div>'
    )
    text = re.sub(r"(<body[^>]*>)", r"\1" + banner, text, count=1)
    return text, script, "\n".join(rules) + ("\n" if rules else "")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("source", type=Path)
    parser.add_argument("name")
    parser.add_argument("--title", required=True)
    parser.add_argument("--summary", required=True)
    parser.add_argument("--source-note", required=True, help="who made it and how it arrived")
    args = parser.parse_args(argv)
    if not re.fullmatch(r"design[0-9]{2}([a-z]|_font[0-9])?", args.name):
        raise SystemExit("name must look like design04")
    target = ROOT / "new-static" / args.name
    files = target / "files"
    if target.exists():
        shutil.rmtree(target)
    shutil.copytree(args.source, files, ignore=shutil.ignore_patterns(".DS_Store", "*.zip"))
    base = f"/{NEW_DIR}/{args.name}/"
    pages = page_paths(files)
    head_script = None
    for page in sorted(files.rglob("index.html")):
        rel = str(page.relative_to(files))
        text, script, css = convert_page(page.read_text(encoding="utf-8"), rel, base, pages, args.name, args.title)
        if script:
            if head_script is not None and script.strip() != head_script.strip():
                raise SystemExit(f"{rel}: its inline script differs from the other pages'")
            head_script = script
        if css:
            out = files / "assets" / "draft-inline" / ((rel.replace("/", "-").replace("index.html", "").strip("-") or "home") + ".css")
            out.parent.mkdir(parents=True, exist_ok=True)
            out.write_text(css, encoding="utf-8")
        page.write_text(text, encoding="utf-8")
    if head_script is not None:
        (files / "assets" / "draft-inline.js").write_text(
            "// Moved out of the <head> of every page by site/tools/import_draft.py (CSP: no inline script).\n"
            + head_script.strip("\n") + "\n", encoding="utf-8")
    (files / "assets" / "fonts.css").write_text(fonts_css(), encoding="utf-8")
    (files / "assets" / "draft-banner.css").write_text(BANNER_CSS, encoding="utf-8")
    js_css = []
    for script in (files / "assets").rglob("*.js"):
        code = script.read_text(encoding="utf-8")
        # A <style> element made at run time is inline CSS for the CSP: its rules move to a file.
        def to_file(match: re.Match[str]) -> str:
            js_css.append("".join(re.findall(r'"((?:[^"\\]|\\.)*)"', match.group(2))))
            return "/* style rules moved to assets/draft-js.css by site/tools/import_draft.py (CSP) */"
        code = INJECTED_STYLE.sub(to_file, code)
        if re.search(r"createElement\(\s*[\"']style[\"']", code):
            raise SystemExit(f"{script.name}: creates a <style> element in a way this script does not know")
        moved = re.sub(r'"(/(?:learn|network|links|projects|infra|dev)/)', lambda m: '"' + base.rstrip("/") + m.group(1), code)
        if moved != script.read_text(encoding="utf-8"):
            script.write_text(moved, encoding="utf-8")
    if js_css:
        (files / "assets" / "draft-js.css").write_text(
            "/* Rules a script used to add as a <style> element at run time (CSP: no inline CSS). */\n"
            + "\n".join(js_css) + "\n", encoding="utf-8")
        for page in files.rglob("index.html"):
            text = page.read_text(encoding="utf-8")
            page.write_text(text.replace("</head>", f'  <link rel="stylesheet" href="{base}assets/draft-js.css">\n</head>', 1), encoding="utf-8")
    (target / "draft.yaml").write_text(
        f"# Imported with site/tools/import_draft.py from a finished static site; see files/.\n"
        f"title: {json.dumps(args.title, ensure_ascii=False)}\nsummary: {json.dumps(args.summary, ensure_ascii=False)}\nsource: {json.dumps(args.source_note, ensure_ascii=False)}\n",
        encoding="utf-8")
    print(f"imported {len(list(files.rglob('index.html')))} pages into {target.relative_to(ROOT.parent)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
