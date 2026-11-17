#!/bin/bash
# fuzzbox-loop.sh: the continuous loop. Run as btxfuzz inside tmux or a systemd unit (see the guide).
# Each round: rebuild if $BRANCH moved (and first replay every saved corpus with the new binary, which
# catches regressions the day they land), fuzz every target for SLICE_SECS (PRIORITY_REGEX targets
# twice), triage new crash files, and every MERGE_EVERY rounds minimise the corpora.
# Stop cleanly: touch $FUZZ_HOME/state/STOP (the current round finishes first).
set -uo pipefail
umask 077
. /etc/btxfuzz/fuzzbox.conf
D=$(cd "$(dirname "$0")" && pwd); . "$D/fuzzbox-env.sh"
H=$FUZZ_HOME; mkdir -p "$H/corpus" "$H/logs" "$H/state"
J=$JOBS; [ "$J" -gt 0 ] || { c=$(fuzz_cpus); J=$(( c > 3 ? c - 2 : 1 )); }
round=$(cat "$H/state/round" 2>/dev/null || echo 0)
rm -rf "$H/work"   # leftovers from a stopped run
log() { echo "$(date -u +%FT%TZ) $*" >> "$H/logs/loop.log"; }
all() { xargs -P "$J" -I{} "$D/fuzzbox-one.sh" "$1" "$2" {}; }
while [ ! -f "$H/state/STOP" ]; do
  if ! short=$("$D/fuzzbox-build.sh" 2>>"$H/logs/loop.log"); then
    log "build failed (see logs/build-*.log); keeping the old binary"
    short=$(cat "$H/state/current" 2>/dev/null) || { sleep 1800; continue; }
  fi
  T=$H/builds/$short/targets.txt
  if [ "$(cat "$H/state/current" 2>/dev/null)" != "$short" ]; then
    log "new build $short ($(wc -l < "$T") targets): replaying every corpus"
    all replay "$short" < "$T"; "$D/fuzzbox-triage.sh" "$short"
    echo "$short" > "$H/state/current"
  fi
  round=$((round + 1)); echo "$round" > "$H/state/round"; log "round $round on $short"
  { cat "$T"; grep -E "$PRIORITY_REGEX" "$T"; } | shuf | all fuzz "$short"
  "$D/fuzzbox-triage.sh" "$short"
  if [ $((round % MERGE_EVERY)) = 0 ]; then log "merging corpora"; all merge "$short" < "$T"; fi
  df -P "$H" | awk 'NR==2 && $5+0 > 90 {exit 1}' || { log "disk over 90%: stopping"; touch "$H/state/STOP"; }
done
log "stopped (state/STOP)"
