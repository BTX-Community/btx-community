#!/bin/bash
# fuzzbox-build.sh: build the fuzz binary for the newest commit of $BRANCH (libFuzzer + ASan + UBSan).
# Prints the commit it built. Exits 0 without rebuilding when that commit is already built.
set -euo pipefail
. /etc/btxfuzz/fuzzbox.conf
D=$(cd "$(dirname "$0")" && pwd); . "$D/fuzzbox-env.sh"
unset OMP_NUM_THREADS OMP_THREAD_LIMIT   # a box-wide value must not reach the build (see fuzz_cpus)
H=$FUZZ_HOME; cd "$H/src"
git fetch -q origin "$BRANCH"
sha=$(git rev-parse "origin/$BRANCH"); short=${sha:0:12}
if [ -x "$H/builds/$short/fuzz" ]; then echo "$short"; exit 0; fi
git -c advice.detachedHead=false checkout -q --detach "$sha"
mkdir -p "$H/logs" "$H/builds/$short"
CC=clang-18 CXX=clang++-18 CMAKE_PREFIX_PATH=/opt/ossl35 cmake -S . -B "$H/build" -G Ninja \
  -DBUILD_FOR_FUZZING=ON -DSANITIZERS=fuzzer,address,undefined -DBUILD_GUI=OFF -DWITH_ZMQ=ON \
  -DCMAKE_C_FLAGS=-ftrivial-auto-var-init=pattern -DCMAKE_CXX_FLAGS=-ftrivial-auto-var-init=pattern \
  > "$H/logs/cmake-$short.log" 2>&1
nice cmake --build "$H/build" -j"$(fuzz_cpus)" --target fuzz > "$H/logs/build-$short.log" 2>&1
cp "$H/build/bin/fuzz" "$H/builds/$short/fuzz"
cp -r "$H/src/test/sanitizer_suppressions" "$H/builds/$short/"
PRINT_ALL_FUZZ_TARGETS_AND_ABORT=1 "$H/builds/$short/fuzz" > "$H/builds/$short/targets.txt" 2>/dev/null || true
[ -s "$H/builds/$short/targets.txt" ] || { echo "no fuzz targets listed by $short" >&2; rm -f "$H/builds/$short/fuzz"; exit 1; }
ls -1dt "$H"/builds/*/ | tail -n +4 | xargs -r rm -rf   # keep the 3 newest builds
echo "$short"
