#!/bin/bash
# fuzzbox-triage.sh <build-short>: reproduce each new crash file 3 times, group it by its top stack
# frames, keep it in $FUZZ_HOME/crashes/<group>/ (owner-only) with a draft PRIVATE report, and send
# NOTIFY_CMD one line without the input. Never publishes anything.
set -uo pipefail
. /etc/btxfuzz/fuzzbox.conf
D=$(cd "$(dirname "$0")" && pwd); . "$D/fuzzbox-env.sh"
short=$1; H=$FUZZ_HOME; B=$H/builds/$short; X=$H/crashes; umask 077
mapfile -t E < <(fuzz_env "$B")
for f in "$X"/incoming/"$short"/*/*; do
  [ -f "$f" ] || continue
  t=$(basename "$(dirname "$f")"); n=$(basename "$f"); kind=${n%%-*}
  if [ "$kind" = slow ]; then mkdir -p "$X/slow/$t"; mv "$f" "$X/slow/$t/"; continue; fi
  if [ "$kind" = noartifact ]; then   # the target stopped without writing an input: keep its log
    err=$(grep -m1 -E 'ERROR: |Assertion|runtime error|terminate called|what\(\)|out-of-memory|Abort' "$f" | cut -c1-200)
    key=$(printf '%s\nnoartifact\n%s\n' "$t" "$(printf '%s' "$err" | sed -E 's/[0-9a-f]{8,}//g')" | sha256sum | cut -c1-12)
    G=$X/$key; mkdir -p "$G"
    if [ ! -f "$G/REPORT-DRAFT.txt" ]; then
      cp "$f" "$G/output.txt"
      {
        echo "PRIVATE until a second reviewer agrees it is harmless. Route: GitHub private vulnerability reporting"
        echo "(Security tab, 'Report a vulnerability') or team@btx.dev."
        echo
        echo "target:    $t"
        echo "kind:      stopped without writing an input (abort at start-up, hang or kill); log in output.txt"
        echo "commit:    $short (branch $BRANCH)"
        echo "error:     $err"
        echo "build:     clang 18, -DBUILD_FOR_FUZZING=ON -DSANITIZERS=fuzzer,address,undefined"
        echo "run:       FUZZ=$t ./fuzz -runs=1"
      } > "$G/REPORT-DRAFT.txt"
      [ -n "${NOTIFY_CMD:-}" ] && echo "btx fuzz box: NEW private group $key ($t, stopped without input) at $short" | sh -c "$NOTIFY_CMD" || true
      echo "$(date -u +%FT%TZ) NEW $key $t noartifact $short" >> "$X/index.txt"
    else
      echo "$(date -u +%FT%TZ) dup ${key} $t noartifact $short" >> "$X/index.txt"
    fi
    rm -f "$f"; continue
  fi
  ok=0; out=$(mktemp); wd=$(mktemp -d)
  for i in 1 2 3; do
    ( cd "$wd" && env -i "${E[@]}" TMPDIR="$wd" FUZZ="$t" timeout -k 10 900 "$B/fuzz" -rss_limit_mb="$RSS_MB" -timeout=120 "$f" ) > "$out.$i" 2>&1 || ok=$((ok + 1))
  done
  cp "$out.1" "$out"
  # Top 3 frames in BTX code. The build maps source paths to "<build dir>/./<file>", so keep frames with "/./".
  frames=$(grep -E '^ +#[0-9]+ 0x[0-9a-f]+ in ' "$out" | grep -E ' /[^ ]*/\./[^ ]+:[0-9]+' | grep -v -E 'libFuzzer|sanitizer_common|/compiler-rt/|/usr/' \
           | head -3 | sed -E 's/^ +#[0-9]+ 0x[0-9a-f]+ in //; s/ \/[^ ]*\/\.\// /; s/:[0-9]+:[0-9]+$//')
  err=$(grep -m1 -E 'ERROR: |Assertion|runtime error|out-of-memory|timeout after|terminate called|Abort' "$out" | cut -c1-200)
  [ -n "$frames" ] || frames=$(printf '%s' "$err" | sed -E 's/0x[0-9a-f]+//g')   # no symbolised frame: group by the error line
  key=$(printf '%s\n%s\n%s\n' "$t" "$kind" "$frames" | sha256sum | cut -c1-12)
  if [ "$ok" = 0 ]; then G=$X/flaky/$t; else G=$X/$key; fi
  mkdir -p "$G"
  if [ "$ok" != 0 ] && [ ! -f "$G/REPORT-DRAFT.txt" ]; then
    cp "$f" "$G/input"; cp "$out" "$G/output.txt"
    {
      echo "PRIVATE. Report through GitHub private vulnerability reporting (Security tab, 'Report a vulnerability')"
      echo "or team@btx.dev. Never in a public issue, PR or chat."
      echo
      echo "target:    $t"
      echo "kind:      $kind"
      echo "commit:    $short (branch $BRANCH)"
      echo "reproduce: $ok of 3 runs"
      echo "error:     $err"
      echo "frames:"; printf '%s\n' "$frames" | sed 's/^/  /'
      echo "build:     clang 18, -DBUILD_FOR_FUZZING=ON -DSANITIZERS=fuzzer,address,undefined"
      echo "run:       FUZZ=$t ./fuzz input"
      sz=$(wc -c < "$f")
      if [ "$sz" -le 4096 ]; then echo "input (base64, $sz bytes):"; base64 -w 76 "$f"
      else echo "input: $sz bytes, too large to paste; ask the maintainers for a private channel"; fi
    } > "$G/REPORT-DRAFT.txt"
    [ -n "${NOTIFY_CMD:-}" ] && echo "btx fuzz box: NEW private crash group $key ($t, $kind, $ok/3) at $short" | sh -c "$NOTIFY_CMD" || true
    echo "$(date -u +%FT%TZ) NEW $key $t $kind repro=$ok/3 $short" >> "$X/index.txt"
  else
    mkdir -p "$G/dups"; cp "$f" "$G/dups/$n"
    echo "$(date -u +%FT%TZ) dup ${key} $t $kind repro=$ok/3 $short" >> "$X/index.txt"
  fi
  rm -f "$H/corpus/$t/${n#*-}"   # libFuzzer names corpus files and crash files by the same sha1: keep crashes out of the corpus
  rm -rf "$f" "$out" "$out".? "$wd"
done
