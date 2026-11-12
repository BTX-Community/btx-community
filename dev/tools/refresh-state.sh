#!/usr/bin/env bash
# Print fresh rows for the branch and release table in dev/01-state.md (section 1).
#
# Usage:   bash dev/tools/refresh-state.sh [release-branch]     (default: release-0.34.16)
#
# Three anonymous GitHub API calls, no token; no file in the repository is changed:
#   1. compare main...<release-branch>  -> main head, commits ahead and behind
#   2. branches/<release-branch>        -> release-line head
#   3. releases?per_page=10             -> latest release and latest full release
# GitHub allows 60 unauthenticated calls per hour per IP address; this script uses 3.
# See what is left first (this check does not count):  curl -s https://api.github.com/rate_limit
#
# The rows go to standard output. Paste them over the matching rows of 01-state.md, check
# them against `git` in your own clone (01-state.md section 8), then update the page's
# "Last verified" line.
#
# Exit codes: 0 rows printed; 1 an API call failed (rate limit, network, unknown branch);
#             2 a required tool (curl, python3) is missing.
set -euo pipefail

repo=btxchain/btx
rel_branch=${1:-release-0.34.16}
api=https://api.github.com/repos/${repo}

for tool in curl python3; do
  command -v "${tool}" >/dev/null 2>&1 || { echo "refresh-state: ${tool} is required" >&2; exit 2; }
done

tmp=$(mktemp -d)
trap 'rm -rf "${tmp}"' EXIT

# get <name> <url>: one anonymous call; body in $tmp/<name>.json, headers in $tmp/<name>.hdr
get() {
  local name=${1} url=${2} code
  code=$(curl -sS -m 60 -o "${tmp}/${name}.json" -D "${tmp}/${name}.hdr" -w '%{http_code}' \
    -H 'Accept: application/vnd.github+json' -H 'X-GitHub-Api-Version: 2022-11-28' \
    "${url}") || { echo "refresh-state: request failed: ${url}" >&2; exit 1; }
  if [ "${code}" != "200" ]; then
    echo "refresh-state: HTTP ${code} for ${url}" >&2
    grep -i -E '^x-ratelimit-(remaining|reset)' "${tmp}/${name}.hdr" >&2 || true
    head -c 300 "${tmp}/${name}.json" >&2 || true
    echo >&2
    exit 1
  fi
}

get compare  "${api}/compare/main...${rel_branch}?per_page=1"
get branch   "${api}/branches/${rel_branch}"
get releases "${api}/releases?per_page=10"

left=$(grep -i '^x-ratelimit-remaining' "${tmp}/releases.hdr" | tr -dc '0-9' || true)
echo "refresh-state: 3 calls made; ${left:-unknown} anonymous calls left this hour" >&2

python3 -I - "${tmp}" "${rel_branch}" <<'EOF'
import datetime
import json
import os
import sys

tmp, rel_branch = sys.argv[1], sys.argv[2]


def load(name):
    with open(os.path.join(tmp, name + ".json"), encoding="utf-8") as f:
        return json.load(f)


cmp, branch, releases = load("compare"), load("branch"), load("releases")
today = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d")
src = "`tools/refresh-state.sh` (GitHub API)"


def committed(commit):
    d = commit["commit"]["committer"]["date"]  # ISO 8601, UTC, e.g. 2026-11-12T12:46:56Z
    return "committed %s, %s UTC" % (d[:10], d[11:16])


def describe(rel):
    names = [a["name"] for a in rel.get("assets", [])]
    sums = [n for n in names if "SUMS" in n.upper() or n.lower().endswith((".sha256", ".sha512"))]
    sigs = [n for n in names if n.lower().endswith((".asc", ".sig", ".minisig"))]
    kind = "a **pre-release**" if rel.get("prerelease") else "a full release"
    when = (rel.get("published_at") or rel.get("created_at") or "")[:10]
    text = "`%s`, published %s as %s. %d asset%s: %s. Sums file: %s; signature file: %s" % (
        rel["tag_name"], when, kind, len(names), "" if len(names) == 1 else "s",
        ", ".join("`%s`" % n for n in names) or "none",
        ", ".join("`%s`" % n for n in sums) or "none",
        ", ".join("`%s`" % n for n in sigs) or "none")
    return text


main = cmp["base_commit"]
head = branch["commit"]
ahead, behind = cmp["ahead_by"], cmp["behind_by"]

rows = [
    ("`main` head", "`%s` (%s) [tested]" % (main["sha"][:8], committed(main))),
    ("`%s` head" % rel_branch, "`%s` (%s) [tested]" % (head["sha"][:8], committed(head))),
    ("Release line vs `main`", "%s commits ahead, %s behind [tested]" % (format(ahead, ","), format(behind, ","))),
]

published = [r for r in releases if not r.get("draft")]
if published:
    rows.append(("Latest release", "%s [tested]" % describe(published[0])))
full = [r for r in published if not r.get("prerelease")]
if full:
    rows.append(("Latest full release", "%s [tested]" % describe(full[0])))

print("| Fact | Value | Source | Verified on |")
print("|---|---|---|---|")
for fact, value in rows:
    print("| %s | %s | %s | %s |" % (fact, value, src, today))

if behind:
    print("\nNote: `main` has %d commit(s) that are not on `%s`; check them before you call the "
          "release line a superset of `main`." % (behind, rel_branch))
EOF
