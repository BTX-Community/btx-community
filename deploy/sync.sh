#!/bin/sh
# SPDX-License-Identifier: MIT
#
# Keeps the served site in step with the branch the "Website" workflow publishes.
#
# Every $INTERVAL seconds: fetch $BRANCH from the public repository (no credentials; GitHub has
# no access to this server), and if it points to a new commit, unpack it next to the old one
# and switch the "current" link in one atomic rename. The web server only ever sees a complete
# site. The last $KEEP releases stay on disk, so a rollback is one "ln -sfn" away.

set -eu

: "${REPO_URL:?}" "${BRANCH:=site-build}" "${INTERVAL:=120}" "${KEEP:=5}"
ROOT=/srv/site
CACHE="$ROOT/.git-cache"

log() { printf '%s %s\n' "$(date -u '+%Y-%m-%dT%H:%M:%SZ')" "$*"; }

[ -d "$CACHE" ] || git init -q --bare "$CACHE"
mkdir -p "$ROOT/releases"

deploy() {
	sha=$(git --git-dir="$CACHE" rev-parse "refs/heads/$BRANCH")
	[ "$(readlink "$ROOT/current" 2>/dev/null || true)" = "releases/$sha" ] && return 0

	tmp="$ROOT/releases/.$sha.tmp"
	rm -rf "$tmp"
	mkdir -p "$tmp"
	git --git-dir="$CACHE" archive "$sha" | tar -x -C "$tmp"
	if [ ! -f "$tmp/index.html" ] || [ ! -f "$tmp/de/index.html" ]; then
		log "release $sha is incomplete, keeping the current site"
		rm -rf "$tmp"
		return 0
	fi
	rm -rf "$ROOT/releases/$sha"
	mv "$tmp" "$ROOT/releases/$sha"
	ln -sfn "releases/$sha" "$ROOT/.current.next"
	mv -T "$ROOT/.current.next" "$ROOT/current"
	log "now serving $sha"

	# Keep the newest $KEEP releases (by unpack time); never the one being served.
	ls -1t "$ROOT/releases" | tail -n "+$((KEEP + 1))" | while read -r old; do
		[ "$old" = "$sha" ] || rm -rf "$ROOT/releases/$old"
	done
}

while :; do
	if git --git-dir="$CACHE" fetch -q --depth 1 "$REPO_URL" "+refs/heads/$BRANCH:refs/heads/$BRANCH"; then
		deploy || log "deploy failed, keeping the current site"
	else
		log "fetch failed, keeping the current site"
	fi
	sleep "$INTERVAL"
done
