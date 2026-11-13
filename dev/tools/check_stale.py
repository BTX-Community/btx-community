#!/usr/bin/env python3
"""Check the "Last verified" line on every page of the developer hub.

Usage:
    python3 -I dev/tools/check_stale.py [--warn DAYS] [--fail DAYS] [--today YYYY-MM-DD] [PATH ...]

PATH is a directory, scanned recursively for *.md, or a single .md file. Default: the dev/
folder this script sits in. Every page must carry this line as the first non-blank line after
its H1 (the middle dots are U+00B7):

    > Last verified: YYYY-MM-DD · against: <owner/repo> <branch> @ <sha> · owner role: <role>

Pages inside a lessons/ folder are exempt from the requirement (a lesson is dated by its file
name). If one carries the line anyway, its age is checked like any other page.

Status per page:
    ok    verified fewer than --warn days ago (default 30)
    WARN  verified --warn or more days ago
    FAIL  verified --fail or more days ago (default 90); or the line is missing, malformed or
          not directly after the H1; or the date lies more than one day in the future (one
          day is allowed: "today" is UTC, a page date may be a local date); or the file is not UTF-8
    skip  a lessons/ page without the line

Exit codes:
    0  no FAIL (WARN rows may be printed)
    1  at least one FAIL
    2  usage error: a bad option, a PATH that does not exist, --warn above --fail, no pages found

Standard library only. No network access, no writes.
"""

import argparse
import datetime
import pathlib
import re
import sys

LINE_RE = re.compile(
    r"^> Last verified: (?P<date>\d{4}-\d{2}-\d{2})"
    r" · against: (?P<repo>[\w.-]+/[\w.-]+) (?P<branch>\S+) @ (?P<sha>[0-9a-f]{7,40})"
    r" · owner role: (?P<role>\S.*?)\s*$"
)
H1_RE = re.compile(r"^# \S")
FENCE_RE = re.compile(r"^\s*(```|~~~)")
EXEMPT_DIR = "lessons"


def parse_date(text):
    try:
        return datetime.date.fromisoformat(text)
    except ValueError:
        return None


def find_h1(lines):
    """Index of the first H1 outside a fenced code block, or None."""
    in_fence = False
    for i, line in enumerate(lines):
        if FENCE_RE.match(line):
            in_fence = not in_fence
            continue
        if not in_fence and H1_RE.match(line):
            return i
    return None


def check_page(path, exempt, today, warn, fail):
    """Return (status, days, verified, against, note) for one page."""
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except UnicodeDecodeError:
        return "FAIL", None, None, None, "not UTF-8"

    h1 = find_h1(lines)
    after = None
    if h1 is not None:
        for line in lines[h1 + 1:]:
            if line.strip():
                after = line.rstrip()
                break

    match = LINE_RE.match(after) if after else None
    if match is None:
        anywhere = None
        for line in lines:
            anywhere = LINE_RE.match(line.rstrip())
            if anywhere:
                break
        if exempt and anywhere is None and not (after or "").startswith("> Last verified:"):
            return "skip", None, None, None, "lessons page without the line"
        if h1 is None:
            return "FAIL", None, None, None, "no H1"
        if after and after.startswith("> Last verified:"):
            return "FAIL", None, None, None, "line after the H1 is malformed"
        if anywhere is not None:
            return "FAIL", None, anywhere.group("date"), None, "line is not directly after the H1"
        return "FAIL", None, None, None, "no Last verified line"

    verified = parse_date(match.group("date"))
    against = "%s %s @ %s" % (match.group("repo"), match.group("branch"), match.group("sha"))
    if verified is None:
        return "FAIL", None, match.group("date"), against, "not a calendar date"
    days = (today - verified).days
    if days < -1:  # one day of slack: "today" is UTC, the page date may be the editor's local date
        return "FAIL", days, match.group("date"), against, "date is in the future"
    days = max(days, 0)
    if days >= fail:
        return "FAIL", days, match.group("date"), against, "re-verify: %d days or older" % fail
    if days >= warn:
        return "WARN", days, match.group("date"), against, "re-verify soon: %d days or older" % warn
    return "ok", days, match.group("date"), against, ""


def collect(paths):
    """Yield (page, root) for every *.md under the given paths, sorted, without duplicates."""
    seen = set()
    for root in paths:
        if root.is_file():
            pages = [root] if root.suffix == ".md" else []
            base = root.parent
        else:
            pages = sorted(p for p in root.rglob("*.md") if p.is_file())
            base = root
        for page in pages:
            key = page.resolve()
            if key in seen:
                continue
            rel_parts = page.relative_to(base).parts
            if any(part.startswith(".") for part in rel_parts):
                continue
            seen.add(key)
            yield page, EXEMPT_DIR in rel_parts[:-1] or base.name == EXEMPT_DIR


def main(argv=None):
    default_root = pathlib.Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(
        description="Check the 'Last verified' line on every developer-hub page.",
        epilog="Exit codes: 0 no FAIL; 1 at least one FAIL; 2 usage error.",
    )
    parser.add_argument("paths", nargs="*", type=pathlib.Path,
                        help="directories or .md files (default: %s)" % default_root)
    parser.add_argument("--warn", type=int, default=30, metavar="DAYS",
                        help="WARN when a page was verified this many days ago or more (default: 30)")
    parser.add_argument("--fail", type=int, default=90, metavar="DAYS",
                        help="FAIL when a page was verified this many days ago or more (default: 90)")
    parser.add_argument("--today", metavar="YYYY-MM-DD",
                        help="the date to measure against (default: today, UTC)")
    args = parser.parse_args(argv)

    if args.warn < 0 or args.fail < 0 or args.warn > args.fail:
        parser.error("need 0 <= --warn <= --fail")
    if args.today:
        today = parse_date(args.today)
        if today is None:
            parser.error("--today must be YYYY-MM-DD")
    else:
        today = datetime.datetime.now(datetime.timezone.utc).date()

    roots = args.paths or [default_root]
    for root in roots:
        if not root.exists():
            parser.error("no such path: %s" % root)

    results = []
    for page, exempt in collect(roots):
        results.append((page, check_page(page, exempt, today, args.warn, args.fail)))
    if not results:
        print("check_stale: no .md pages found under %s" % ", ".join(map(str, roots)), file=sys.stderr)
        return 2

    def shown(page):
        """The page path relative to the working directory when it lies below it, so logs carry no home path."""
        try:
            return str(page.resolve().relative_to(pathlib.Path.cwd().resolve()))
        except ValueError:
            return str(page)

    width = max(len(shown(page)) for page, _ in results)
    print("%-6s %5s  %-10s  %-*s  %s" % ("STATUS", "DAYS", "VERIFIED", width, "FILE", "NOTE"))
    counts = {"ok": 0, "WARN": 0, "FAIL": 0, "skip": 0}
    against_seen = {}
    for page, (status, days, verified, against, note) in results:
        counts[status] += 1
        if against:
            against_seen[against] = against_seen.get(against, 0) + 1
        print("%-6s %5s  %-10s  %-*s  %s" % (
            status, "" if days is None else days, verified or "-", width, shown(page), note))

    print()
    for against, n in sorted(against_seen.items(), key=lambda kv: -kv[1]):
        print("against: %s (%d page%s)" % (against, n, "" if n == 1 else "s"))
    print("check_stale: %d page%s: %d ok, %d WARN, %d FAIL, %d skipped (today %s; warn at %d days, fail at %d)" % (
        len(results), "" if len(results) == 1 else "s", counts["ok"], counts["WARN"], counts["FAIL"], counts["skip"],
        today.isoformat(), args.warn, args.fail))
    return 1 if counts["FAIL"] else 0


if __name__ == "__main__":
    sys.exit(main())
