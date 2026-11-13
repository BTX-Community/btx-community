# SPDX-License-Identifier: MIT
"""Build btx-community.com from site/content into a directory of static files.

    python site/build.py --out site/_build

The content is validated before anything is written: a pull request with a broken link, a
missing translation or an unknown anchor fails here, not on the live site. English is served
under ``/``, German under ``/de/``; every page in ``PAGES`` gets its own directory below that
(``/links/``, ``/de/links/``) and its template ``<page>.html.j2``, which extends ``base.html.j2``
with the menu. The live strip, the figures and the upgrade countdown are
empty in the built page and filled by ``static/js/community.js`` from the public API of the
status page.
"""

from __future__ import annotations

import argparse
import hashlib
import math
import os
import shutil
import sys
from dataclasses import dataclass, field
from datetime import date  # noqa: TC003 - pydantic needs the type at runtime
from pathlib import Path
from typing import Annotated, Literal, Self, get_args

import yaml
from jinja2 import Environment, FileSystemLoader, StrictUndefined
from pydantic import (
    AfterValidator,
    BaseModel,
    ConfigDict,
    Field,
    StrictBool,
    StrictFloat,
    StrictInt,
    StrictStr,
    ValidationError,
    model_validator,
)

ROOT = Path(__file__).resolve().parent
LANGUAGES = ("en", "de", "es", "fr", "zh")
"""Every language of the site, in the order of the language menu."""
INLINE_LANGUAGES = ("en", "de")
"""Languages written next to each other in the content files; every text needs both."""
TRANSLATED = ("es", "fr", "zh")
"""Languages translated from English in ``content/translations/<lang>.yaml``; a missing
translation shows the English text and is reported by the build."""
HTML_LANG = {"zh": "zh-Hans"}
"""``lang`` attribute where it differs from the URL code: the Chinese pages are Simplified Chinese."""
DECIMAL_COMMA = ("de", "es", "fr")
"""Languages that write a decimal comma (``65,8 %``), as ``toLocaleString`` does in ``community.js``."""
THOUSANDS = {"en": ",", "de": ".", "es": ".", "fr": "\u202f", "zh": ","}
"""Thousands separator per language (``1,033``, ``1.033``, ``1 033`` with a narrow no-break space)."""
PERCENT_SPACE = {"fr": "\u202f"}
"""The space before ``%``: a narrow no-break space in French, a no-break space in the others, so a
figure never wraps away from its sign."""
PAGES = ("home", "learn", "network", "links", "docs", "dev")
"""The pages of the site, in menu order; each has a template ``<page>.html.j2`` and texts ``nav.<page>``."""
MAX_YAML_BYTES = 256 * 1024
REPO_URL = "https://github.com/BTX-Community/btx-community"
RAW_URL = "https://raw.githubusercontent.com/BTX-Community/btx-community/main/dev/"
"""Raw files of the developer hub: the AI prompt and the two links an AI tool fetches point here."""
ADD_PROJECT_URL = f"{REPO_URL}/blob/main/CONTRIBUTING.md#changing-the-website"
RELEASES_URL = "https://github.com/btxchain/btx/releases"
STATUS_API = "https://network.btx-monitoring.com/api/v1/status.json"
DEVELOPMENT_API = "https://network.btx-monitoring.com/api/v1/development.json"
UPSTREAM_REPO = "btxchain/btx"
"""Repository whose development activity the network page shows; the API must name the same one."""
STATUS_PAGE = {"en":"https://network.btx-monitoring.com/", "de": "https://network.btx-monitoring.com/de/"}
VERDICTS = ("stable", "performant", "secure")
"""Headline verdicts of the status page, in its order; titles come from texts.yaml."""

LINK_PATTERN = r"^https://[A-Za-z0-9.-]+(/[A-Za-z0-9._~/+-]*)?(\?[A-Za-z0-9=&_-]{1,60})?$"
"""Plain https URL; ``+`` in the path (Telegram invites) and a short plain query are allowed.

Nothing that could break out of an HTML attribute: no quotes, spaces, ``<``, ``>`` or fragments.
"""
ID_PATTERN = r"^[a-z0-9-]{1,40}$"
MAX_TEXT = 400
TAG_PATTERN = r"^[a-z0-9 /.-]{1,20}$"
LANE_PATTERN = r"^[A-Z]-[A-Z0-9-]{1,20}$"
"""A lane of the developer hub: its kind letter and a name, e.g. ``A-WALLET``, ``C-K01``, ``I-RC``."""
CLASS_PATTERN = r"^(K[0-9]{2}(/K[0-9]{2}){0,2}|C1-[0-9])$"
"""A bug class of the hub's registry, e.g. ``K01``, ``K16/K17``, ``C1-1``."""
AREA_PATTERN = r"^[a-z0-9_./ -]{1,30}$"
"""An area of the coverage table as the hub names it (a code label, not translated): ``other net``."""
PATH_PATTERN = r"^[a-z0-9_./*, -]{1,60}$"
GATE_PATTERN = r"^(CI-[0-9]{1,2}|G[1-9])$"
SHA_PATTERN = r"^[0-9a-f]{8}$"
MAX_PROMPT = 1200
MAX_PROMPT_LINES = 24
Status = Literal["worklist", "baseline", "count-first", "rule-only", "needs-ci", "generators", "evidence"]
"""Where a bug class stands; the order is the order of the filter on the developers page."""
STATUSES: tuple[str, ...] = get_args(Status)
RouteKind = Literal["pr", "evidence", "run", "fork"]
"""How a lane's work reaches the maintainer: pull request, evidence on #464, run report, fork branch.
The hub defines the first three (``dev/07-lanes.md`` section 3); "fork" is lane I-CI's own route:
its work stays on the contributor fork, so it has no card under "Where it ends up"."""
LaneKind = Literal["area", "class", "infra"]
"""The kind of a lane in ``dev/plan/lanes.json``, the id of its group and of its filter on the page."""
PhaseId = Literal["2a", "2b", "3", "4"]
DayId = Literal["monday", "tuesday_wednesday", "thursday", "friday"]
DAYS: tuple[str, ...] = get_args(DayId)

Id = Annotated[StrictStr, Field(pattern=ID_PATTERN)]
Name = Annotated[StrictStr, Field(min_length=1, max_length=60)]
Link = Annotated[StrictStr, Field(pattern=LINK_PATTERN, max_length=200)]
LaneId = Annotated[StrictStr, Field(pattern=LANE_PATTERN)]
Count = Annotated[StrictInt, Field(ge=0, le=10_000_000)]
Rank = Annotated[StrictInt, Field(ge=1, le=20)]


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

    en: Annotated[StrictStr, Field(min_length=1, max_length=MAX_TEXT)]
    de: Annotated[StrictStr, Field(min_length=1, max_length=MAX_TEXT)]


class Step(_Model):
    """One step of an audience card; points to a website, a category of the links page or a page."""

    text: Text
    url: Link | None = None
    anchor: Id | None = None
    page: Id | None = None

    @model_validator(mode="after")
    def _one_target(self) -> Self:
        if sum(target is not None for target in (self.url, self.anchor, self.page)) > 1:
            msg = "a step has at most one of url, anchor and page"
            raise ValueError(msg)
        if self.page is not None and self.page not in PAGES:
            msg = f"unknown page {self.page!r}"
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


# --- Content schema (content/hub.yaml) --------------------------------------------------------


def _one_decimal(value: float) -> float:
    # The hub states its figures with one decimal and they are floors: rounding 69.96 up to
    # "70.0 %" would overstate one, and -0.0 would show as "-0.0 %".
    if round(value, 1) != value or math.copysign(1.0, value) < 0:
        msg = "a plain percentage with at most one decimal, as the hub states it"
        raise ValueError(msg)
    return value


Percent = Annotated[StrictFloat, Field(ge=0, le=100), AfterValidator(_one_decimal)]


class HubLink(_Model):
    """A page of the developer hub and what a reader finds there."""

    text: Text
    url: Link


class Level(_Model):
    """One of the three levels of the hub, with the brief to start from."""

    id: Id
    title: Text
    text: Text
    url: Link


class Principle(_Model):
    """One of the four ideas the hub works by, shown first on the page."""

    id: Id
    title: Text
    text: Text


class Brief(_Model):
    """The prompt a reader pastes into an AI tool, with the raw files it points at.

    The prompt is English on every page: the files it names are English, and a translated prompt
    would drift from them. It is shown in a ``<pre>`` and never formatted.
    """

    prompt: Annotated[StrictStr, Field(min_length=200, max_length=MAX_PROMPT)]
    agents_url: Link
    llms_url: Link
    notes: Annotated[list[Text], Field(min_length=1, max_length=4)]

    @model_validator(mode="after")
    def _points_at_the_hub(self) -> Self:
        for url in (self.agents_url, self.llms_url):
            if not url.startswith(RAW_URL):
                msg = f"{url} is not a raw file of the hub ({RAW_URL})"
                raise ValueError(msg)
            if url not in self.prompt:
                msg = f"the prompt does not contain {url}"
                raise ValueError(msg)
        if "<" in self.prompt or ">" in self.prompt:
            msg = "the prompt contains an angle bracket"
            raise ValueError(msg)
        if len(self.prompt.splitlines()) > MAX_PROMPT_LINES:
            msg = f"the prompt has more than {MAX_PROMPT_LINES} lines"
            raise ValueError(msg)
        return self


class Measured(_Model):
    """The commit the hub's numbers were measured on, and the live head it was checked against."""

    commit: Annotated[StrictStr, Field(pattern=SHA_PATTERN)]
    date: date
    head: Annotated[StrictStr, Field(pattern=SHA_PATTERN)]


class Figure(_Model):
    """A coverage figure of the node software: a percentage and what it counts."""

    id: Id
    label: Text
    percent: Percent
    note: Text


class Run(_Model):
    """How one test run of the coverage build ended."""

    id: Literal["unit", "functional"]
    total: Count
    passed: Count
    timed_out: Count
    failed: Count
    skipped: Count

    @model_validator(mode="after")
    def _adds_up(self) -> Self:
        if self.passed + self.timed_out + self.failed + self.skipped != self.total:
            msg = f"run {self.id}: passed, timed out, failed and skipped do not add up to the total"
            raise ValueError(msg)
        return self


class Area(_Model):
    """Line coverage of one area of the code, unit tests and unit plus functional tests."""

    id: Id
    name: Annotated[StrictStr, Field(pattern=AREA_PATTERN)]
    path: Annotated[StrictStr, Field(pattern=PATH_PATTERN)] | None = None
    unit: Percent
    functional: Percent
    branches: Percent | None = None
    loc: Count | None = None
    risk_rank: Rank | None = None
    note: Text | None = None

    @model_validator(mode="after")
    def _functional_adds(self) -> Self:
        if self.functional < self.unit:
            msg = f"area {self.id}: unit + functional is below unit alone"
            raise ValueError(msg)
        return self


class Baseline(_Model):
    """One count of the static and dynamic baseline (a tool's untriaged results)."""

    id: Id
    label: Text
    count: Count
    note: Text | None = None


class Coverage(_Model):
    """Where the node software stands: coverage as the hub states it, how the runs ended,
    coverage per area and the static and dynamic baseline."""

    text: Text
    source: Link
    plan: Link
    figures: Annotated[list[Figure], Field(min_length=1, max_length=6)]
    runs: Annotated[list[Run], Field(min_length=2, max_length=2)]
    areas: Annotated[list[Area], Field(min_length=1, max_length=24)]
    baselines: Annotated[list[Baseline], Field(min_length=1, max_length=8)]


class BugClass(_Model):
    """A row of the bug-class registry: counts only, never a file, line or function."""

    id: Annotated[StrictStr, Field(pattern=CLASS_PATTERN)]
    name: Text
    rule: Text
    prs: Count | None = None
    sites_open: Count | None = None
    sites_unit: Text | None = None
    status: Status
    status_text: Text
    lanes: Annotated[list[LaneId], Field(min_length=1, max_length=3)]
    security: StrictBool = False


class LaneCoverage(_Model):
    """Line coverage of the code a lane covers, now: unit, and unit plus functional."""

    unit: Percent
    functional: Percent

    @model_validator(mode="after")
    def _functional_adds(self) -> Self:
        if self.functional < self.unit:
            msg = "lane coverage: unit + functional is below unit alone"
            raise ValueError(msg)
        return self


class Lane(_Model):
    """A lane of the hub. Owners are claimed in the hub, not here."""

    id: LaneId
    title: Text
    scope: Text
    why: Text
    target: Text
    cadence: Text
    route: RouteKind
    route_text: Text
    coverage: LaneCoverage | None = None
    risk_rank: Rank | None = None
    waiting: StrictBool = False
    """No work until someone claims the lane; such a lane has no pack yet."""
    pack: Link | None = None
    done_bar: Annotated[list[Text], Field(min_length=1, max_length=10)]
    runners: Annotated[list[Text], Field(max_length=6)] = []

    @model_validator(mode="after")
    def _pack_or_waiting(self) -> Self:
        if self.waiting == (self.pack is not None):
            msg = f"lane {self.id}: a lane has a pack, or it waits for an owner; not both, not neither"
            raise ValueError(msg)
        if self.pack is not None and self.pack != f"{REPO_URL}/blob/main/dev/packs/{self.id}.md":
            msg = f"lane {self.id}: the pack of a lane is dev/packs/{self.id}.md"
            raise ValueError(msg)
        return self


class LaneGroup(_Model):
    """Area, class or infrastructure lanes; ``id`` is the lanes' ``kind`` in ``dev/plan/lanes.json``."""

    id: LaneKind
    title: Text
    text: Text
    lanes: Annotated[list[Lane], Field(min_length=1, max_length=12)]


class Lanes(_Model):
    """The lanes in their groups, with the hub page that defines each one and its JSON form."""

    source: Link
    data: Link
    groups: Annotated[list[LaneGroup], Field(min_length=1, max_length=4)]


class FlowStep(_Model):
    """A step of how a finding moves; ``exit`` marks a step that can end the path early."""

    text: Text
    exit: StrictBool = False


class Route(_Model):
    """Where a lane's work ends up: the three routes the hub defines (see ``RouteKind``)."""

    id: Literal["pr", "evidence", "run"]
    title: Text
    text: Text


class Gate(_Model):
    """A fork CI job (``CI-…``) or a gate before any final release (``G…``)."""

    id: Annotated[StrictStr, Field(pattern=GATE_PATTERN)]
    name: Text
    state: Text
    phase: PhaseId | None = None
    done_bar: StrictBool = False
    """One of the gates whose being true ends the programme."""

    @model_validator(mode="after")
    def _ci_or_release(self) -> Self:
        ci = self.id.startswith("CI-")
        if (self.phase is not None) != ci:
            msg = f"gate {self.id}: a CI job has a phase, a release gate has none"
            raise ValueError(msg)
        if self.done_bar and ci:
            msg = f"gate {self.id}: only release gates are part of the done bar"
            raise ValueError(msg)
        return self


class Phase(_Model):
    """A phase of the plan with its window and deliverables."""

    id: PhaseId
    name: Text
    window: Text
    deliverables: Annotated[list[Text], Field(min_length=1, max_length=6)]


class Day(_Model):
    """A day (or two) of the weekly rhythm: what happens and who does it."""

    id: DayId
    what: Text
    who: Text


class Loop(_Model):
    """A way to contribute back to the hub: claim a lane, file a lesson, take the exam."""

    id: Id
    title: Text
    text: Text
    steps: Annotated[list[Step], Field(min_length=1, max_length=6)]
    url: Link

    @model_validator(mode="after")
    def _plain_steps(self) -> Self:
        if any(step.anchor is not None or step.page is not None for step in self.steps):
            msg = f"loop {self.id}: a step links a URL or nothing"
            raise ValueError(msg)
        return self


class HubPage(_Model):
    """``content/hub.yaml``: the public plan of the developer hub in ``dev/``, copied from it by hand."""

    schema_version: Literal[1]
    checked: date
    source: Link
    measured: Measured
    principles: Annotated[list[Principle], Field(min_length=4, max_length=4)]
    start: Annotated[list[HubLink], Field(min_length=1, max_length=8)]
    brief: Brief
    levels: Annotated[list[Level], Field(min_length=3, max_length=3)]
    coverage: Coverage
    classes_text: Text
    classes_source: Link
    classes: Annotated[list[BugClass], Field(min_length=1, max_length=30)]
    lanes: Lanes
    flow: Annotated[list[FlowStep], Field(min_length=3, max_length=12)]
    routes: Annotated[list[Route], Field(min_length=3, max_length=3)]
    escalation: Annotated[list[Text], Field(min_length=1, max_length=8)]
    flow_source: Link
    gate_source: Link
    gates: Annotated[list[Gate], Field(min_length=1, max_length=30)]
    gates_source: Link
    ci_pack: Link
    phases: Annotated[list[Phase], Field(min_length=1, max_length=6)]
    week: Annotated[list[Day], Field(min_length=4, max_length=4)]
    rhythm_source: Link
    rules: Annotated[list[Text], Field(max_length=8)] = []
    never: Annotated[list[Text], Field(min_length=1, max_length=12)]
    sweep_rules: Annotated[list[Text], Field(min_length=1, max_length=6)]
    method_source: Link
    guardrails_source: Link
    contribute: Annotated[list[Loop], Field(min_length=1, max_length=4)]

    def repo_links(self) -> list[str]:
        """Every link of the page into this repository (all but the two raw links of the brief)."""
        links = [self.source, self.coverage.source, self.coverage.plan, self.classes_source]
        links += [self.lanes.source, self.lanes.data, self.flow_source, self.gate_source]
        links += [self.gates_source, self.ci_pack, self.rhythm_source, self.method_source, self.guardrails_source]
        links += [step.url for step in self.start] + [level.url for level in self.levels]
        links += [lane.pack for group in self.lanes.groups for lane in group.lanes if lane.pack is not None]
        links += [loop.url for loop in self.contribute]
        links += [step.url for loop in self.contribute for step in loop.steps if step.url is not None]
        return links

    @model_validator(mode="after")
    def _consistent(self) -> Self:
        lanes = [lane.id for group in self.lanes.groups for lane in group.lanes]
        for kind, ids in (
            ("principle", [p.id for p in self.principles]),
            ("level", [level.id for level in self.levels]),
            ("figure", [figure.id for figure in self.coverage.figures]),
            ("run", [run.id for run in self.coverage.runs]),
            ("area", [area.id for area in self.coverage.areas]),
            ("baseline", [b.id for b in self.coverage.baselines]),
            ("class", [c.id for c in self.classes]),
            ("lane group", [group.id for group in self.lanes.groups]),
            ("lane", lanes),
            ("route", [route.id for route in self.routes]),
            ("gate", [gate.id for gate in self.gates]),
            ("phase", [phase.id for phase in self.phases]),
            ("day", [day.id for day in self.week]),
            ("loop", [loop.id for loop in self.contribute]),
        ):
            if len(ids) != len(set(ids)):
                msg = f"duplicate {kind} ids"
                raise ValueError(msg)
        # Every link goes into this repository: the page shows the hub, nothing else.
        for url in self.repo_links():
            if not url.startswith(f"{REPO_URL}/"):
                msg = f"{url} is not in {REPO_URL}"
                raise ValueError(msg)
        for bug in self.classes:
            unknown = set(bug.lanes) - set(lanes)
            if unknown:
                msg = f"class {bug.id}: unknown lane {', '.join(sorted(unknown))}"
                raise ValueError(msg)
        if self.checked < self.measured.date:
            msg = "checked is before the date the numbers were measured"
            raise ValueError(msg)
        return self


def load_hub(path: Path) -> HubPage:
    """Load and validate ``hub.yaml``."""
    try:
        return HubPage.model_validate(load_yaml(path))
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
    for lang in LANGUAGES[1:]:
        missing = set(texts["en"]) ^ set(texts[lang])
        if missing:
            raise ContentError(f"{path.name}: keys not in both en and {lang}: {', '.join(sorted(missing))}")
    unknown = {f"verdict.{v}" for v in VERDICTS} - set(texts["en"])
    if unknown:
        raise ContentError(f"{path.name}: missing {', '.join(sorted(unknown))}")
    return texts


def load_translations(path: Path, lang: str) -> dict[str, str]:
    """Load ``translations/<lang>.yaml``: pairs of an English text and its translation."""
    data = load_yaml(path)
    if not isinstance(data, dict) or data.get("schema_version") != 1 or set(data) != {"schema_version", "translations"}:
        raise ContentError(f"{path.name} needs schema_version: 1 and a list 'translations'")
    pairs = data["translations"]
    if not isinstance(pairs, list):
        raise ContentError(f"{path.name}: 'translations' must be a list")
    table: dict[str, str] = {}
    for pair in pairs:
        if not isinstance(pair, dict) or set(pair) != {"en", lang}:
            raise ContentError(f"{path.name}: every entry needs exactly 'en' and {lang!r}")
        source, target = pair["en"], pair[lang]
        if not (isinstance(source, str) and isinstance(target, str) and source.strip() and target.strip()):
            raise ContentError(f"{path.name}: every text must be a non-empty string")
        if len(target) > MAX_TEXT:
            raise ContentError(f"{path.name}: translation longer than {MAX_TEXT} characters: {target[:40]!r}")
        if source in table:
            raise ContentError(f"{path.name}: translated twice: {source[:60]!r}")
        table[source] = target
    return table


@dataclass
class Localizer:
    """Picks a text in one language. en and de are in the content files; es, fr and zh are
    looked up by their English text, so a changed English text shows up as missing."""

    lang: str
    table: dict[str, str] = field(default_factory=dict)
    missing: set[str] = field(default_factory=set)
    used: set[str] = field(default_factory=set)

    def __call__(self, text: Text) -> str:
        if self.lang in INLINE_LANGUAGES:
            return str(getattr(text, self.lang))
        found = self.table.get(text.en)
        if found is None:
            self.missing.add(text.en)
            return text.en
        self.used.add(text.en)
        return found


# --- Prepared for the template ----------------------------------------------------------------


@dataclass(frozen=True)
class StepView:
    """A step with its link target: an external URL, ``#cat-<id>`` on the links page or a page."""

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
    guide: GuidePage, say: Localizer
) -> tuple[tuple[FactView, ...], UpcomingView | None, tuple[ChecklistView, ...]]:
    """The fact cards, the next release and the checklists in one language."""
    facts = tuple(
        FactView(f.id, say(f.title), say(f.text), f.source) for f in guide.facts
    )
    upcoming = None
    if guide.upcoming is not None:
        u = guide.upcoming
        upcoming = UpcomingView(
            version=u.version,
            checked=u.checked.isoformat(),
            status=say(u.status),
            source=u.source,
            features=tuple(
                FeatureView(say(f.title), say(f.text), f.source) for f in u.features
            ),
            caveats=tuple(say(c) for c in u.caveats),
        )
    checklists = tuple(
        ChecklistView(c.id, say(c.title), tuple(say(i) for i in c.items))
        for c in guide.checklists
    )
    return facts, upcoming, checklists


def _step(step: Step, say: Localizer) -> StepView:
    if step.url is not None:
        return StepView(say(step.text), step.url, external=True)
    if step.page is not None:
        return StepView(say(step.text), page_path(say.lang, step.page), external=False)
    href = f"{page_path(say.lang, 'links')}#cat-{step.anchor}" if step.anchor is not None else None
    return StepView(say(step.text), href, external=False)


def community_views(
    page: CommunityPage, say: Localizer
) -> tuple[tuple[AudienceView, ...], tuple[CategoryView, ...], tuple[DocumentView, ...]]:
    """The audience cards, categories and documents in one language, entries numbered in page order."""
    audiences = tuple(
        AudienceView(
            id=a.id,
            title=say(a.title),
            text=say(a.text),
            steps=tuple(_step(step, say) for step in a.steps),
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
                    description=say(entry.description),
                    note=say(entry.note) if entry.note else None,
                )
            )
        categories.append(
            CategoryView(
                id=category.id,
                title=say(category.title),
                risk=say(category.risk) if category.risk else None,
                entries=tuple(entries),
            )
        )
    documents = tuple(
        DocumentView(
            id=d.id,
            title=say(d.title),
            text=say(d.text),
            url=d.url,
            status=say(d.status) if d.status else None,
        )
        for d in page.documents
    )
    return audiences, tuple(categories), documents


@dataclass(frozen=True)
class LevelView:
    """A level card in one language."""

    id: str
    title: str
    text: str
    url: str


@dataclass(frozen=True)
class CardView:
    """A titled card in one language: a principle, a route of the flow."""

    id: str
    title: str
    text: str


@dataclass(frozen=True)
class FigureView:
    """A coverage tile in one language; ``value`` is the formatted percentage."""

    id: str
    label: str
    value: str
    note: str


@dataclass(frozen=True)
class RunView:
    """How a test run ended; every count formatted for the language."""

    id: str
    total: str
    passed: str
    timed_out: str
    failed: str
    skipped: str


@dataclass(frozen=True)
class AreaView:
    """A row of the coverage table. ``*_value`` are plain numbers for ``<meter>`` and the sort
    (``""`` when the hub has no value); the others are formatted for the language or ``None``."""

    id: str
    name: str
    path: str | None
    unit: str
    unit_value: str
    functional: str
    functional_value: str
    branches: str | None
    loc: str | None
    loc_value: str
    risk_rank: str | None
    note: str | None


@dataclass(frozen=True)
class BaselineView:
    """A tile of the static and dynamic baseline."""

    id: str
    label: str
    count: str
    note: str | None


@dataclass(frozen=True)
class ClassView:
    """A row of the bug-class registry; ``anchor`` is the id usable in a URL (``K16-K17``)."""

    id: str
    anchor: str
    name: str
    rule: str
    prs: str | None
    sites_open: str | None
    sites_unit: str | None
    status: str
    status_text: str
    lanes: tuple[str, ...]
    security: bool


@dataclass(frozen=True)
class LaneView:
    """A lane card in one language; ``coverage`` is the formatted pair, ``coverage_values`` the
    plain numbers for the two meters."""

    id: str
    kind: str
    title: str
    scope: str
    why: str
    target: str
    cadence: str
    route: str
    route_text: str
    coverage: str | None
    coverage_values: tuple[str, str] | None
    risk_rank: str | None
    waiting: bool
    pack: str | None
    done_bar: tuple[str, ...]
    runners: tuple[str, ...]


@dataclass(frozen=True)
class LaneGroupView:
    """A group of lanes in one language."""

    id: str
    title: str
    text: str
    lanes: tuple[LaneView, ...]


@dataclass(frozen=True)
class GateView:
    """A fork CI job or a release gate in one language."""

    id: str
    name: str
    state: str
    phase: str | None
    done_bar: bool


@dataclass(frozen=True)
class PhaseView:
    """A phase of the plan in one language."""

    id: str
    name: str
    window: str
    deliverables: tuple[str, ...]


@dataclass(frozen=True)
class DayView:
    """A row of the week in one language."""

    id: str
    what: str
    who: str


@dataclass(frozen=True)
class LoopView:
    """A way to contribute back, in one language."""

    id: str
    title: str
    text: str
    steps: tuple[StepView, ...]
    url: str


@dataclass(frozen=True)
class HubView:
    """The developers page in one language."""

    checked: str
    source: str
    measured_commit: str
    measured_date: str
    measured_head: str
    principles: tuple[CardView, ...]
    start: tuple[StepView, ...]
    brief_prompt: str
    brief_agents: str
    brief_llms: str
    brief_notes: tuple[str, ...]
    levels: tuple[LevelView, ...]
    coverage_text: str
    coverage_source: str
    coverage_plan: str
    figures: tuple[FigureView, ...]
    runs: tuple[RunView, ...]
    areas: tuple[AreaView, ...]
    baselines: tuple[BaselineView, ...]
    classes_text: str
    classes_source: str
    classes: tuple[ClassView, ...]
    status_counts: tuple[tuple[str, int], ...]
    lanes_source: str
    lanes_data: str
    lane_groups: tuple[LaneGroupView, ...]
    lane_count: int
    waiting_count: int
    flow: tuple[tuple[str, bool], ...]
    routes: tuple[CardView, ...]
    escalation: tuple[str, ...]
    flow_source: str
    gate_source: str
    ci_gates: tuple[GateView, ...]
    release_gates: tuple[GateView, ...]
    gates_source: str
    ci_pack: str
    phases: tuple[PhaseView, ...]
    week: tuple[DayView, ...]
    rhythm_source: str
    rules: tuple[str, ...]
    never: tuple[str, ...]
    sweep_rules: tuple[str, ...]
    method_source: str
    guardrails_source: str
    contribute: tuple[LoopView, ...]


def format_percent(value: float, lang: str) -> str:
    """A percentage with one decimal as each language writes it: ``65.8 %``, ``65,8 %``, with a
    space that does not break (``PERCENT_SPACE``)."""
    number = f"{value:.1f}"
    if lang in DECIMAL_COMMA:
        number = number.replace(".", ",")
    space = PERCENT_SPACE.get(lang, "\u00a0")
    return f"{number}{space}%"


def format_count(value: int, lang: str) -> str:
    """A whole number with the language's thousands separator: ``1,033``, ``1.033``, ``1 033``."""
    return f"{value:,}".replace(",", THOUSANDS.get(lang, ","))


def _area_view(area: Area, say: Localizer) -> AreaView:
    lang = say.lang
    return AreaView(
        id=area.id,
        name=area.name,
        path=area.path,
        unit=format_percent(area.unit, lang),
        unit_value=f"{area.unit:.1f}",
        functional=format_percent(area.functional, lang),
        functional_value=f"{area.functional:.1f}",
        branches=format_percent(area.branches, lang) if area.branches is not None else None,
        loc=format_count(area.loc, lang) if area.loc is not None else None,
        loc_value=str(area.loc) if area.loc is not None else "",
        risk_rank=str(area.risk_rank) if area.risk_rank is not None else None,
        note=say(area.note) if area.note else None,
    )


def _class_view(bug: BugClass, say: Localizer) -> ClassView:
    lang = say.lang
    return ClassView(
        id=bug.id,
        anchor=bug.id.replace("/", "-"),
        name=say(bug.name),
        rule=say(bug.rule),
        prs=format_count(bug.prs, lang) if bug.prs is not None else None,
        sites_open=format_count(bug.sites_open, lang) if bug.sites_open is not None else None,
        sites_unit=say(bug.sites_unit) if bug.sites_unit else None,
        status=bug.status,
        status_text=say(bug.status_text),
        lanes=tuple(bug.lanes),
        security=bug.security,
    )


def _lane_view(lane: Lane, kind: str, say: Localizer) -> LaneView:
    lang = say.lang
    coverage = None
    values = None
    if lane.coverage is not None:
        coverage = f"{format_percent(lane.coverage.unit, lang)} → {format_percent(lane.coverage.functional, lang)}"
        values = (f"{lane.coverage.unit:.1f}", f"{lane.coverage.functional:.1f}")
    return LaneView(
        id=lane.id,
        kind=kind,
        title=say(lane.title),
        scope=say(lane.scope),
        why=say(lane.why),
        target=say(lane.target),
        cadence=say(lane.cadence),
        route=lane.route,
        route_text=say(lane.route_text),
        coverage=coverage,
        coverage_values=values,
        risk_rank=str(lane.risk_rank) if lane.risk_rank is not None else None,
        waiting=lane.waiting,
        pack=lane.pack,
        done_bar=tuple(say(item) for item in lane.done_bar),
        runners=tuple(say(runner) for runner in lane.runners),
    )


def _gate_view(gate: Gate, say: Localizer) -> GateView:
    return GateView(gate.id, say(gate.name), say(gate.state), gate.phase, gate.done_bar)


def hub_view(hub: HubPage, say: Localizer) -> HubView:
    """The developers page in one language."""
    lang = say.lang
    groups = tuple(
        LaneGroupView(
            id=g.id,
            title=say(g.title),
            text=say(g.text),
            lanes=tuple(_lane_view(lane, g.id, say) for lane in g.lanes),
        )
        for g in hub.lanes.groups
    )
    lanes = [lane for group in groups for lane in group.lanes]
    statuses = [bug.status for bug in hub.classes]
    gates = tuple(_gate_view(gate, say) for gate in hub.gates)
    return HubView(
        checked=hub.checked.isoformat(),
        source=hub.source,
        measured_commit=hub.measured.commit,
        measured_date=hub.measured.date.isoformat(),
        measured_head=hub.measured.head,
        principles=tuple(CardView(p.id, say(p.title), say(p.text)) for p in hub.principles),
        start=tuple(StepView(say(s.text), s.url, external=True) for s in hub.start),
        brief_prompt=hub.brief.prompt,
        brief_agents=hub.brief.agents_url,
        brief_llms=hub.brief.llms_url,
        brief_notes=tuple(say(note) for note in hub.brief.notes),
        levels=tuple(LevelView(lv.id, say(lv.title), say(lv.text), lv.url) for lv in hub.levels),
        coverage_text=say(hub.coverage.text),
        coverage_source=hub.coverage.source,
        coverage_plan=hub.coverage.plan,
        figures=tuple(
            FigureView(f.id, say(f.label), format_percent(f.percent, lang), say(f.note))
            for f in hub.coverage.figures
        ),
        runs=tuple(
            RunView(
                r.id,
                *(format_count(n, lang) for n in (r.total, r.passed, r.timed_out, r.failed, r.skipped)),
            )
            for r in hub.coverage.runs
        ),
        areas=tuple(_area_view(area, say) for area in hub.coverage.areas),
        baselines=tuple(
            BaselineView(b.id, say(b.label), format_count(b.count, lang), say(b.note) if b.note else None)
            for b in hub.coverage.baselines
        ),
        classes_text=say(hub.classes_text),
        classes_source=hub.classes_source,
        classes=tuple(_class_view(bug, say) for bug in hub.classes),
        status_counts=tuple((status, statuses.count(status)) for status in STATUSES if status in statuses),
        lanes_source=hub.lanes.source,
        lanes_data=hub.lanes.data,
        lane_groups=groups,
        lane_count=len(lanes),
        waiting_count=sum(lane.waiting for lane in lanes),
        flow=tuple((say(step.text), step.exit) for step in hub.flow),
        routes=tuple(CardView(r.id, say(r.title), say(r.text)) for r in hub.routes),
        escalation=tuple(say(item) for item in hub.escalation),
        flow_source=hub.flow_source,
        gate_source=hub.gate_source,
        ci_gates=tuple(gate for gate in gates if gate.phase is not None),
        release_gates=tuple(gate for gate in gates if gate.phase is None),
        gates_source=hub.gates_source,
        ci_pack=hub.ci_pack,
        phases=tuple(
            PhaseView(p.id, say(p.name), say(p.window), tuple(say(d) for d in p.deliverables)) for p in hub.phases
        ),
        week=tuple(DayView(d.id, say(d.what), say(d.who)) for d in hub.week),
        rhythm_source=hub.rhythm_source,
        rules=tuple(say(r) for r in hub.rules),
        never=tuple(say(n) for n in hub.never),
        sweep_rules=tuple(say(r) for r in hub.sweep_rules),
        method_source=hub.method_source,
        guardrails_source=hub.guardrails_source,
        contribute=tuple(
            LoopView(
                loop.id,
                say(loop.title),
                say(loop.text),
                tuple(StepView(say(s.text), s.url, external=s.url is not None) for s in loop.steps),
                loop.url,
            )
            for loop in hub.contribute
        ),
    )


def asset_url(path: str) -> str:
    """URL of a file under ``static/`` with a digest of its content as query.

    Cloudflare tells browsers to keep static files for hours; a changed file gets a new URL, so
    nobody runs an old script against a new page.
    """
    digest = hashlib.sha256((ROOT / "static" / path).read_bytes()).hexdigest()[:12]
    return f"/static/{path}?v={digest}"


def page_path(lang: str, page: str = "home") -> str:
    """URL path of a page in a language: ``/``, ``/de/``, ``/links/``, ``/de/links/``."""
    prefix = "/" if lang == "en" else f"/{lang}/"
    return prefix if page == "home" else f"{prefix}{page}/"


def context(
    page: CommunityPage,
    guide: GuidePage,
    hub: HubPage,
    texts: dict[str, dict[str, str]],
    lang: str,
    version: str,
    page_id: str = "home",
    say: Localizer | None = None,
) -> dict[str, object]:
    """Everything the templates need for one page in one language."""
    say = say or Localizer(lang)
    audiences, categories, documents = community_views(page, say)
    facts, upcoming, checklists = guide_views(guide, say)
    ui = texts[lang]
    return {
        "lang": lang,
        "html_lang": HTML_LANG.get(lang, lang),
        "translated": lang in TRANSLATED,
        "translation_url": f"{REPO_URL}/blob/main/site/content/translations/{lang}.yaml",
        "ui": ui,
        "alternates": [
            (code, HTML_LANG.get(code, code), texts[code]["lang_name"], page_path(code, page_id)) for code in LANGUAGES
        ],
        "page": page_id,
        "page_title": None if page_id == "home" else ui[f"page.{page_id}.title"],
        "page_lead": None if page_id == "home" else ui[f"page.{page_id}.lead"],
        "nav": [(p, ui[f"nav.{p}"], page_path(lang, p)) for p in PAGES],
        "nav_href": {p: page_path(lang, p) for p in PAGES},
        "status_page": STATUS_PAGE.get(lang, STATUS_PAGE["en"]),
        "status_api": STATUS_API,
        "development_api": DEVELOPMENT_API,
        "upstream_repo": UPSTREAM_REPO,
        "upstream_url": f"https://github.com/{UPSTREAM_REPO}",
        "verdicts": [(v, ui[f"verdict.{v}"]) for v in VERDICTS],
        "audiences": audiences,
        "facts": facts,
        "upcoming": upcoming,
        "checklists": checklists,
        "categories": categories,
        "documents": documents,
        "hub": hub_view(hub, say),
        "removed": tuple((r.name, say(r.reason)) for r in page.removed),
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
    hub = load_hub(ROOT / "content" / "hub.yaml")
    texts = load_texts(ROOT / "content" / "texts.yaml")
    sayers = {lang: Localizer(lang) for lang in INLINE_LANGUAGES}
    for lang in TRANSLATED:
        sayers[lang] = Localizer(lang, load_translations(ROOT / "content" / "translations" / f"{lang}.yaml", lang))
    env = Environment(
        loader=FileSystemLoader(ROOT / "templates"),
        autoescape=True,
        undefined=StrictUndefined,
        keep_trailing_newline=True,
    )
    rendered = {
        page_path(lang, page_id): env.get_template(f"{page_id}.html.j2").render(
            context(page, guide, hub, texts, lang, version, page_id, sayers[lang])
        )
        for lang in LANGUAGES
        for page_id in PAGES
    }

    if out.exists():
        shutil.rmtree(out)
    shutil.copytree(ROOT / "static", out / "static")
    for path, html in rendered.items():
        target = out / path.strip("/") / "index.html"
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(html, encoding="utf-8")
    for lang in TRANSLATED:
        say = sayers[lang]
        for text in sorted(say.missing):
            print(f"warning: no {lang} translation, English shown: {text[:70]!r}", file=sys.stderr)
        for text in sorted(set(say.table) - say.used):
            print(f"warning: unused {lang} translation (English text changed?): {text[:70]!r}", file=sys.stderr)


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
