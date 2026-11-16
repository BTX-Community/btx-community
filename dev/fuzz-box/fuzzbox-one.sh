#!/bin/bash
# fuzzbox-one.sh <fuzz|replay|merge> <build-short> <target>: one target, one job. Called by fuzzbox-loop.sh.
set -uo pipefail
umask 077   # logs can contain crash output and small inputs
. /etc/btxfuzz/fuzzbox.conf
D=$(cd "$(dirname "$0")" && pwd); . "$D/fuzzbox-env.sh"
mode=$1 short=$2 t=$3; H=$FUZZ_HOME; B=$H/builds/$short
C=$H/corpus/$t; A=$H/crashes/incoming/$short/$t
mkdir -p "$C" "$A" "$H/work" "$H/logs/targets"
W=$(mktemp -d "$H/work/$t.XXXXXX"); cd "$W" || exit 1   # own folder and TMPDIR: the same target can run twice in a round,
                                                       # and test datadirs go away with the job
mapfile -t E < <(fuzz_env "$B")
run() { env -i "${E[@]}" TMPDIR="$W" FUZZ="$t" timeout -k 30 "$1" "$B/fuzz" -rss_limit_mb="$RSS_MB" -timeout=120 \
          -artifact_prefix="$A/" "${@:2}" > "$W/log" 2>&1; }
st=$(date +%s)
case $mode in
  fuzz)   run $(( SLICE_SECS + 600 )) -max_total_time="$SLICE_SECS" "$C"; rc=$? ;;
  replay) run 3600 -runs=1 "$C"; rc=$? ;;
  merge)  rm -rf "$C.new"; mkdir -p "$C.new"
          run 7200 -merge=1 "$C.new" "$C"; rc=$?
          if [ $rc = 0 ]; then mv "$C" "$C.old" && mv "$C.new" "$C" && rm -rf "$C.old"; else rm -rf "$C.new"; fi ;;
esac
# A non-zero exit that left no crash file (abort at start-up, hang, kill) is recorded too, so triage sees it.
if [ "$rc" != 0 ] && [ -z "$(find "$A" -type f -newermt "@$st" 2>/dev/null | head -1)" ]; then
  cp "$W/log" "$A/noartifact-$(date +%s)-$$"
fi
mv "$W/log" "$H/logs/targets/$t.$mode.log" 2>/dev/null; cd "$H" && rm -rf "$W"
echo "$(date -u +%FT%TZ) $mode $short $t rc=$rc corpus=$(ls "$C" | wc -l)" >> "$H/logs/jobs.log"
