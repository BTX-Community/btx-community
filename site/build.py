# SPDX-License-Identifier: MIT
"""Build btx-community.com from site/content into a directory of static files.

    python site/build.py --out site/_build

The content is validated before anything is written: a pull request with a broken link, a
missing translation or an unknown anchor fails here, not on the live site. English is served
under ``/``, German under ``/de/``. The live strip, the figures and the upgrade countdown are
empty in the built page and filled by ``static/js/community.js`` from the public API of the
status page.
"""

from __future__ import annotations

import argparse
import hashlib
import os
import shutil
import sys
from dataclasses import dataclass
from datetime import date  # noqa: TC003 - pydantic needs the type at runtime
from pathlib import Path
from typing import Annotated, Literal, Self

import yaml
from jinja2 import Environment, FileSystemLoader, StrictUndefined
from pydantic import BaseModel, ConfigDict, Field, StrictStr, ValidationError, model_validator

ROOT = Path(__file__).resolve().parent
LANGUAGES = ("en", "de")
MAX_YAML_BYTES = 256 * 1024
REPO_URL = "https://github.com/BTX-Community/btx-community"
ADD_PROJECT_URL = f"{REPO_URL}/blob/main/CONTRIBUTING.md#changing-the-website"
RELEASES_URL = "https://github.com/btxchain/btx/releases"
STATUS_API = "https://network.btx-monitoring.com/api/v1/status.json"
STATUS_PAGE = {"en": "https://network.btx-monitoring.com/", "de": "https://network.btx-monitoring.com/de/"}
VERDICTS = ("stable", "performant", "secure")
"""Headline verdicts of the status page, in its order; titles come from texts.yaml."""

LINK_PATTERN = r"^https://[A-Za-z0-9.-]+(/[A-Za-z0-9._~/+-]*)?(\?[A-Za-z0-9=&_-]{1,60})?$"
"""Plain https URL; ``+`` in the path (Telegram invites) and a short plain query are allowed.

Nothing that could break out of an HTML attribute: no quotes, spaces, ``<``, ``>`` or fragments.
"""
ID_PATTERN = r"^[a-z0-9-]{1,40}$"
TAG_PATTERN = r"^[a-z0-9 /.-]{1,20}$"

Id = Annotated[StrictStr, Field(pattern=ID_PATTERN)]
Name = Annotated[StrictStr, Field(min_length=1, max_length=60)]
Link = Annotated[StrictStr, Field(pattern=LINK_PATTERN, max_length=200)]


class ContentError(Exception):
    """A content file is missing or does not follow the rules."""


# --- Loading ----------------------------------------------------------------------------------


class _StrictSafeLoader(yaml.SafeLoader):
    """SafeLoader that rejects aliases (expansion bombs) and duplicate keys (hidden typos)."""

    def compose_node(self, parent: yaml.Node | None, index: int) -> yaml.Node | None:
        if self.check_event(yaml.AliasEvent):
            event = self.peek_event()  # type: ignore[no-untyped-call]
            msg = "YAML aliases are not allowed"
            raise yaml.composer.ComposerError(None, None, msg, event.start_mark)
        return super().compose_node(parent, index)

    def construct_mapping(self, node: yaml.MappingNode, deep: bool = False) -> dict[object, object]:  # noqa: FBT001, FBT002 - PyYAML signature
        seen: set[object] = set()
        for key_node, _ in node.value:
            key = self.construct_object(key_node, deep=deep)
            if key in seen:
                msg = f"duplicate key {key!r}"
                raise yaml.constructor.ConstructorError(None, None, msg, key_node.start_mark)
            seen.add(key)
        return super().construct_mapping(node, deep=deep)


def load_yaml(path: Path) -> object:
    """Read a YAML file with a size limit, no aliases and no duplicate keys."""
    try:
        with path.open("rb") as handle:
            raw = handle.read(MAX_YAML_BYTES + 1)
    except OSError as exc:
        raise ContentError(f"{path.name}: {exc}") from exc
    if len(raw) > MAX_YAML_BYTES:
        raise ContentError(f"{path.name} is larger than {MAX_YAML_BYTES} bytes")
    try:
        return yaml.load(raw.decode("utf-8"), Loader=_StrictSafeLoader)  # noqa: S506  # nosec B506 - SafeLoader subclass
    except (UnicodeDecodeError, yaml.YAMLError) as exc:
        raise ContentError(f"{path.name} is not acceptable YAML: {exc}") from exc


# --- Content schema (content/community.yaml) --------------------------------------------------


class _Model(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class Text(_Model):
    """A text in both page languages."""

    en: Annotated[StrictStr, Field(min_length=1, max_length=400)]
    de: Annotated[StrictStr, Field(min_length=1, max_length=400)]


class Step(_Model):
    """One step of an audience card; points to a website or to a category of this page."""

    text: Text
    url: Link | None = None
    anchor: Id | None = None

    @model_validator(mode="after")
    def _one_target(self) -> Self:
        if self.url is not None and self.anchor is not None:
            msg = "a step has either a url or an anchor, not both"
            raise ValueError(msg)
        return self


class Audience(_Model):
    """A card of the start section: who it is for and what to do first."""

    id: Id
    title: Text
    text: Text
    steps: Annotated[list[Step], Field(min_length=1, max_length=8)]


class Entry(_Model):
    """One link of the directory."""

    id: Id
    name: Name
    url: Link
    tags: Annotated[list[Annotated[StrictStr, Field(pattern=TAG_PATTERN)]], Field(max_length=5)] = []
    description: Text
    note: Text | None = None
    """What a visitor should know, e.g. "not reachable on 2026-11-03"."""


class Category(_Model):
    """A group of links; ``risk`` marks services we have not audited (wallets, bridges)."""

    id: Id
    title: Text
    risk: Text | None = None
    entries: Annotated[list[Entry], Field(min_length=1, max_length=40)]


class Document(_Model):
    """A document this community maintains, linked from the page so it is not only in git."""

    id: Id
    title: Text
    text: Text
    url: Link
    status: Text | None = None
    """Where the document stands, e.g. "Draft - under review"."""


class Removed(_Model):
    """An entry of the old btxlinks list that is no longer listed, and why."""

    name: Name
    reason: Text


class CommunityPage(_Model):
    """``content/community.yaml``."""

    schema_version: Literal[1]
    checked: date
    audiences: Annotated[list[Audience], Field(min_length=1, max_length=5)]
    categories: Annotated[list[Category], Field(min_length=1, max_length=20)]
    documents: Annotated[list[Document], Field(max_length=12)] = []
    removed: Annotated[list[Removed], Field(max_length=30)] = []

    @model_validator(mode="after")
    def _consistent(self) -> Self:
        categories = [category.id for category in self.categories]
        entries = [entry.id for category in self.categories for entry in category.entries]
        audiences = [audience.id for audience in self.audiences]
        documents = [document.id for document in self.documents]
        for kind, ids in (
            ("category", categories),
            ("entry", entries),
            ("audience", audiences),
            ("document", documents),
        ):
            if len(ids) != len(set(ids)):
                msg = f"duplicate {kind} ids"
                raise ValueError(msg)
        for audience in self.audiences:
            for step in audience.steps:
                if step.anchor is not None and step.anchor not in categories:
                    msg = f"audience {audience.id}: unknown category {step.anchor!r}"
                    raise ValueError(msg)
        return self


def load_community(path: Path) -> CommunityPage:
    """Load and validate ``community.yaml``."""
    try:
        return CommunityPage.model_validate(load_yaml(path))
    except ValidationError as exc:
        raise ContentError(f"{path.name} is invalid: {exc}") from exc


# --- Content schema (content/guide.yaml) ------------------------------------------------------


class Fact(_Model):
    """A card of "What is BTX", with the source a reader can check it against."""

    id: Id
    title: Text
    text: Text
    source: Link


class Feature(_Model):
    """One announced change of the next release."""

    title: Text
    text: Text
    source: Link


class Upcoming(_Model):
    """The next release, as far as its development branch and release notes show it."""

    version: Annotated[StrictStr, Field(pattern=r"^[0-9]{1,3}\.[0-9]{1,3}(\.[0-9]{1,3})?$")]
    checked: date
    status: Text
    source: Link
    features: Annotated[list[Feature], Field(min_length=1, max_length=8)]
    caveats: Annotated[list[Text], Field(max_length=8)] = []


class Checklist(_Model):
    """A short list of things to check before doing something irreversible."""

    id: Id
    title: Text
    items: Annotated[list[Text], Field(min_length=1, max_length=10)]


class GuidePage(_Model):
    """``content/guide.yaml``."""

    schema_version: Literal[1]
    facts: Annotated[list[Fact], Field(min_length=1, max_length=8)]
    upcoming: Upcoming | None = None
    checklists: Annotated[list[Checklist], Field(max_length=4)] = []

    @model_validator(mode="after")
    def _unique(self) -> Self:
        for kind, ids in (("fact", [f.id for f in self.facts]), ("checklist", [c.id for c in self.checklists])):
            if len(ids) != len(set(ids)):
                msg = f"duplicate {kind} ids"
                raise ValueError(msg)
        return self


def load_guide(path: Path) -> GuidePage:
    """Load and validate ``guide.yaml``."""
    try:
        return GuidePage.model_validate(load_yaml(path))
    except ValidationError as exc:
        raise ContentError(f"{path.name} is invalid: {exc}") from exc


def load_texts(path: Path) -> dict[str, dict[str, str]]:
    """Load ``texts.yaml``: the same keys in every language, every value a non-empty string."""
    data = load_yaml(path)
    if not isinstance(data, dict) or sorted(data) != sorted(LANGUAGES):
        raise ContentError(f"{path.name} must have exactly the languages {', '.join(LANGUAGES)}")
    texts: dict[str, dict[str, str]] = {}
    for lang in LANGUAGES:
        table = data[lang]
        if not isinstance(table, dict) or not all(
            isinstance(k, str) and isinstance(v, str) and v.strip() for k, v in table.items()
        ):
            raise ContentError(f"{path.name}: every text in {lang!r} must be a non-empty string")
        texts[lang] = table
    missing = set(texts["en"]) ^ set(texts["de"])
    if missing:
        raise ContentError(f"{path.name}: keys not in both languages: {', '.join(sorted(missing))}")
    unknown = {f"verdict.{v}" for v in VERDICTS} - set(texts["en"])
    if unknown:
        raise ContentError(f"{path.name}: missing {', '.join(sorted(unknown))}")
    return texts


# --- Prepared for the template ----------------------------------------------------------------


@dataclass(frozen=True)
class StepView:
    """A step with its link target: an external URL or ``#cat-<id>`` on this page."""

    text: str
    href: str | None
    external: bool


@dataclass(frozen=True)
class AudienceView:
    """An audience card in one language."""

    id: str
    title: str
    text: str
    steps: tuple[StepView, ...]


@dataclass(frozen=True)
class EntryView:
    """A directory entry in one language; ``number`` is its running number on the page."""

    id: str
    number: str
    name: str
    url: str
    tags: tuple[str, ...]
    description: str
    note: str | None


@dataclass(frozen=True)
class CategoryView:
    """A category in one language."""

    id: str
    title: str
    risk: str | None
    entries: tuple[EntryView, ...]


@dataclass(frozen=True)
class DocumentView:
    """A document card in one language."""

    id: str
    title: str
    text: str
    url: str
    status: str | None


@dataclass(frozen=True)
class FactView:
    """A fact card in one language."""

    id: str
    title: str
    text: str
    source: str


@dataclass(frozen=True)
class FeatureView:
    """An announced change in one language."""

    title: str
    text: str
    source: str


@dataclass(frozen=True)
class UpcomingView:
    """The next release in one language."""

    version: str
    checked: str
    status: str
    source: str
    features: tuple[FeatureView, ...]
    caveats: tuple[str, ...]


@dataclass(frozen=True)
class ChecklistView:
    """A checklist in one language."""

    id: str
    title: str
    items: tuple[str, ...]


def guide_views(
    guide: GuidePage, lang: str
) -> tuple[tuple[FactView, ...], UpcomingView | None, tuple[ChecklistView, ...]]:
    """The fact cards, the next release and the checklists in one language."""
    facts = tuple(
        FactView(f.id, getattr(f.title, lang), getattr(f.text, lang), f.source) for f in guide.facts
    )
    upcoming = None
    if guide.upcoming is not None:
        u = guide.upcoming
        upcoming = UpcomingView(
            version=u.version,
            checked=u.checked.isoformat(),
            status=getattr(u.status, lang),
            source=u.source,
            features=tuple(
                FeatureView(getattr(f.title, lang), getattr(f.text, lang), f.source) for f in u.features
            ),
            caveats=tuple(getattr(c, lang) for c in u.caveats),
        )
    checklists = tuple(
        ChecklistView(c.id, getattr(c.title, lang), tuple(getattr(i, lang) for i in c.items))
        for c in guide.checklists
    )
    return facts, upcoming, checklists


def _step(step: Step, lang: str) -> StepView:
    if step.url is not None:
        return StepView(getattr(step.text, lang), step.url, external=True)
    href = f"#cat-{step.anchor}" if step.anchor is not None else None
    return StepView(getattr(step.text, lang), href, external=False)


def community_views(
    page: CommunityPage, lang: str
) -> tuple[tuple[AudienceView, ...], tuple[CategoryView, ...], tuple[DocumentView, ...]]:
    """The audience cards, categories and documents in one language, entries numbered in page order."""
    audiences = tuple(
        AudienceView(
            id=a.id,
            title=getattr(a.title, lang),
            text=getattr(a.text, lang),
            steps=tuple(_step(step, lang) for step in a.steps),
        )
        for a in page.audiences
    )
    categories = []
    number = 0
    for category in page.categories:
        entries = []
        for entry in category.entries:
            number += 1
            entries.append(
                EntryView(
                    id=entry.id,
                    number=f"{number:02d}",
                    name=entry.name,
                    url=entry.url,
                    tags=tuple(entry.tags),
                    description=getattr(entry.description, lang),
                    note=getattr(entry.note, lang) if entry.note else None,
                )
            )
        categories.append(
            CategoryView(
                id=category.id,
                title=getattr(category.title, lang),
                risk=getattr(category.risk, lang) if category.risk else None,
                entries=tuple(entries),
            )
        )
    documents = tuple(
        DocumentView(
            id=d.id,
            title=getattr(d.title, lang),
            text=getattr(d.text, lang),
            url=d.url,
            status=getattr(d.status, lang) if d.status else None,
        )
        for d in page.documents
    )
    return audiences, tuple(categories), documents


def asset_url(path: str) -> str:
    """URL of a file under ``static/`` with a digest of its content as query.

    Cloudflare tells browsers to keep static files for hours; a changed file gets a new URL, so
    nobody runs an old script against a new page.
    """
    digest = hashlib.sha256((ROOT / "static" / path).read_bytes()).hexdigest()[:12]
    return f"/static/{path}?v={digest}"


def page_path(lang: str) -> str:
    """URL path of the page in a language: ``/`` or ``/de/``."""
    return "/" if lang == "en" else f"/{lang}/"


def context(
    page: CommunityPage, guide: GuidePage, texts: dict[str, dict[str, str]], lang: str, version: str
) -> dict[str, object]:
    """Everything the template needs for one language."""
    audiences, categories, documents = community_views(page, lang)
    facts, upcoming, checklists = guide_views(guide, lang)
    ui = texts[lang]
    return {
        "lang": lang,
        "ui": ui,
        "alternates": [(code, texts[code]["lang_name"], page_path(code)) for code in LANGUAGES],
        "status_page": STATUS_PAGE[lang],
        "status_api": STATUS_API,
        "verdicts": [(v, ui[f"verdict.{v}"]) for v in VERDICTS],
        "audiences": audiences,
        "facts": facts,
        "upcoming": upcoming,
        "checklists": checklists,
        "categories": categories,
        "documents": documents,
        "removed": tuple((r.name, getattr(r.reason, lang)) for r in page.removed),
        "checked": page.checked.isoformat(),
        "entry_count": sum(len(c.entries) for c in categories),
        "repo_url": REPO_URL,
        "add_project_url": ADD_PROJECT_URL,
        "releases_url": RELEASES_URL,
        "version": version,
        "css_url": asset_url("css/community.css"),
        "js_url": asset_url("js/community.js"),
    }


# --- Build ------------------------------------------------------------------------------------


def build(out: Path, version: str) -> None:
    """Validate the content and write the complete site to ``out`` (replacing it)."""
    page = load_community(ROOT / "content" / "community.yaml")
    guide = load_guide(ROOT / "content" / "guide.yaml")
    texts = load_texts(ROOT / "content" / "texts.yaml")
    env = Environment(
        loader=FileSystemLoader(ROOT / "templates"),
        autoescape=True,
        undefined=StrictUndefined,
        keep_trailing_newline=True,
    )
    template = env.get_template("index.html.j2")
    pages = {lang: template.render(context(page, guide, texts, lang, version)) for lang in LANGUAGES}

    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(ROOT / "static", out / "static")
    for lang, html in pages.items():
        target = out / page_path(lang).strip("/") / "index.html"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(html, encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--out", type=Path, default=ROOT / "_build", help="output directory")
    parser.add_argument(
        "--version",
        default=os.environ.get("GITHUB_SHA", "dev")[:12],
        help="shown in the footer (default: the commit being built)",
    )
    args = parser.parse_args(argv)
    try:
        build(args.out, args.version)
    except ContentError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    print(f"built {args.out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
