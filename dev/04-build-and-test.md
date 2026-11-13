# Build and test

> Last verified: 2026-11-12 · against: btxchain/btx release-0.34.16 @ 4c7840e9 · owner role: build editor

How to build `btxchain/btx` and run its unit, functional, coverage, sanitizer and fuzz tests, with the pitfalls already paid for. Give this page to your AI together with `AGENTS.md`. The AI drafts and runs commands; you read and sign everything that leaves your machine.

Every command and flag below was checked against the tree at `4c7840e9` (`CMakeLists.txt`, `src/CMakeLists.txt`, `CMakePresets.json`, `cmake/script/`, `ci/test/`, `test/functional/test_runner.py`). Numbers live in [`01-state.md`](01-state.md).

**Source tags.** `[C3]` = the 12 Nov unit + functional coverage run at `c6f9678d` (recipe in §5). `[C2]` = the 12 Nov clang-tidy, TSan and lock-order run at `c6f9678d`. `[C0]` = the 13 Nov unit + functional run at `88c9b49c` in rootless Podman (Ubuntu 24.04 container, 24 threads, 12 functional jobs). `[repo]` = a file in the tree at `4c7840e9`. `[plan]` = [`plan/MASTER-PLAN.md`](plan/MASTER-PLAN.md). `[data]` = [`plan/plan-data.json`](plan/plan-data.json). `[read]` = taken from a source; `[tested]` = a command was run; `[inferred]` = judgement.

## 1. Setup

```bash
# one clone, many worktrees; never work directly in the clone
mkdir -p ~/btx-work && cd ~/btx-work
git clone https://github.com/btxchain/btx.git btx
cd btx
git fetch origin release-0.34.16 main
git log -1 --format='%h %cd %s' origin/release-0.34.16      # record this: it is "the live head"

# one worktree per task: <lane>/<topic>
git worktree add ~/btx-work/<lane>-<topic> -b <lane>/<topic> origin/release-0.34.16
cd ~/btx-work/<lane>-<topic>

# your fork, for the second pass and the fork CI run
git remote add fork https://github.com/<your-handle>/btx.git     # once, in the clone
```

- Before a count, a build you will cite, or a post: `git fetch origin && git log -1 --format=%h origin/release-0.34.16`. If the head moved, rebase and recount.
- The repo's `AGENTS.md` tells coding agents to stay read-only unless the operator asks [repo: `AGENTS.md`]. Your lane pack (`packs/<LANE>.md`) is that ask, for the commands it lists. Nothing beyond them.
- Keep one build directory per configuration: `build` (gcc), `build-clang`, `build-cov`, `build-asan`, `build-tsan`, `build_fuzz`.
- Variables set in one block (`OSSL` in §2.1, `J` in §3) are gone in a new shell. Set them again.

**Stop and hand back to the operator when:**
- the OpenSSL check prints `SHA_MISMATCH_STOP`, or the `CMakeCache.txt` check in §2.1 shows a library outside `$OSSL`;
- a step needs `sudo` or changes a system setting (§2.1 packages, §6 `sysctl`) and the operator has not cleared it for this machine;
- a test fails and you have not yet run it on the base commit with the same build (§3, §4): it is not a regression yet;
- a fuzz crash reproduces in product code (§7): nothing about it goes into a public issue, PR, board card or chat;
- the live head moved since your count or build (first bullet above).

## 2. Build matrix

Disk: plan on about 15 GB for a normal build with tests [inferred]; the coverage tree was 27 GB [C3]. If a compile job is killed (out of memory), lower `-j`.

### 2.1 Linux (Ubuntu 24.04), gcc or clang [tested in C2, C3]

```bash
sudo apt-get update
sudo apt-get install -y build-essential cmake pkgconf python3 python3-zmq libevent-dev \
  libboost-dev libsqlite3-dev libzmq3-dev git curl binutils ccache
sudo apt-get install -y clang        # only for clang builds
```

The Native Model Network (`WITH_MODELNET=ON`, the default) needs OpenSSL 3.5 or newer. Ubuntu 22.04 and 24.04 ship 3.0, so build 3.5 into a prefix [repo: `doc/build-unix.md`; the configure check is `src/CMakeLists.txt:1905-1912`]:

```bash
OSSL=$HOME/btx-work/openssl-3.5
V=3.5.4
mkdir -p ~/btx-work/src-ossl && cd ~/btx-work/src-ossl
curl -fsSLO https://github.com/openssl/openssl/releases/download/openssl-$V/openssl-$V.tar.gz
curl -fsSLO https://github.com/openssl/openssl/releases/download/openssl-$V/openssl-$V.tar.gz.sha256
[ "$(cut -d' ' -f1 openssl-$V.tar.gz.sha256)" = "$(sha256sum openssl-$V.tar.gz | cut -d' ' -f1)" ] \
  && echo SHA_OK || echo SHA_MISMATCH_STOP
tar xzf openssl-$V.tar.gz && cd openssl-$V
./Configure --prefix="$OSSL" --libdir=lib no-shared no-tests no-docs -fPIC
make -j"$(nproc)" && make install_sw install_ssldirs
"$OSSL/bin/openssl" list -signature-algorithms | grep -i ml-dsa     # must list ML-DSA-44
```

Configure and build:

```bash
cd ~/btx-work/<lane>-<topic>
cmake -B build -DCMAKE_BUILD_TYPE=RelWithDebInfo \
  -DBUILD_TESTS=ON -DBUILD_GUI=OFF -DBUILD_BENCH=OFF -DWITH_ZMQ=ON -DWITH_MODELNET=ON \
  -DOPENSSL_ROOT_DIR="$OSSL" -DOPENSSL_USE_STATIC_LIBS=ON \
  -DBTX_ENABLE_CUDA_EXPERIMENTAL=OFF
grep -E '^OPENSSL_(SSL|CRYPTO)_LIBRARY' build/CMakeCache.txt   # both must point under $OSSL
cmake --build build -j"$(nproc)"
# clang: add  -DCMAKE_C_COMPILER=clang -DCMAKE_CXX_COMPILER=clang++  and use build-clang
```

- Check the cache line after configure. `doc/build-unix.md` warns that `OPENSSL_ROOT_DIR` alone can pair 3.5 headers with the distro's 3.0 `libssl` [repo]. The `no-shared` build above leaves only static libraries in the prefix, which is what `-DOPENSSL_USE_STATIC_LIBS=ON` looks for. If the cache still points at a system library, pin both with `-DOPENSSL_SSL_LIBRARY=` and `-DOPENSSL_CRYPTO_LIBRARY=`, as that document does.
- `-DBTX_ENABLE_CUDA_EXPERIMENTAL=OFF` matters on any box with `nvcc`: the CUDA backend turns itself on when a CUDA compiler is found, and configure then fails unless `BTX_CUDA_ARCHITECTURES` (or `CMAKE_CUDA_ARCHITECTURES`) is set [repo: `src/CMakeLists.txt:93-158`].
- CUDA builds: add `-DBTX_ENABLE_CUDA_EXPERIMENTAL=ON -DCMAKE_CUDA_COMPILER="$(command -v nvcc)" -DBTX_CUDA_ARCHITECTURES=<cc> -DCMAKE_CUDA_ARCHITECTURES=<cc>`, where `<cc>` is `nvidia-smi --query-gpu=compute_cap --format=csv,noheader` without the dot (RTX 50-series: 120; RTX 30-series: 86). CUDA 12.8 and earlier crash compiling for 80/86/89/90; use 12.9 or newer there. 120 compiles on 12.8 [repo: `doc/btx-cuda-mining-troubleshooting.md` §5].
- Tests that mint ML-DSA certificates need the 3.5 binary at run time: `export BTX_OPENSSL="$OSSL/bin/openssl" OPENSSL_CONF="$OSSL/ssl/openssl.cnf"` [C3]. The BCP/1 mock signer used by `feature_bcp1.py` does not read `BTX_OPENSSL`: it takes `BTX_BCP1_OPENSSL`, then `OPENSSL`, then the first `openssl` on `PATH` [repo: `contrib/bcp1/mock_signer.py:136-137` at `88c9b49c`]. With the distro's 3.0 first on `PATH`, the whole test skips at its first step ("openssl does not advertise ML-DSA-44") [repo: `test/functional/feature_bcp1.py:583-585`], so a run looks clean while it tested nothing. Add `export BTX_BCP1_OPENSSL="$OSSL/bin/openssl"`, or put `$OSSL/bin` first on `PATH` [C0].
- Headless box with no login session: `mkdir -p -m 700 "$HOME/.xdg" && export XDG_RUNTIME_DIR="$HOME/.xdg"` [C3].

### 2.2 macOS (Apple Silicon, AppleClang) [read: `doc/build-osx.md`; configure checked on Apple clang 21 with Metal off, 12 Nov]

```bash
brew install cmake ninja pkgconf boost@1.85 libevent zeromq libomp openssl@3 python
"$(brew --prefix openssl@3)/bin/openssl" version           # must be 3.5 or newer
xcrun -sdk macosx --find metal || echo "NO METAL TOOLCHAIN: keep -DBTX_ENABLE_METAL=OFF"
export PKG_CONFIG_PATH="/opt/homebrew/lib/pkgconfig"
cmake -B build -G Ninja -DCMAKE_BUILD_TYPE=RelWithDebInfo \
  -DCMAKE_PREFIX_PATH=/opt/homebrew -DBoost_INCLUDE_DIR="$(brew --prefix boost@1.85)/include" \
  -DBUILD_TESTS=ON -DBUILD_GUI=OFF -DBUILD_BENCH=OFF -DWITH_ZMQ=ON -DWITH_MODELNET=ON \
  -DBTX_ENABLE_METAL=OFF
cmake --build build -j"$(sysctl -n hw.ncpu)"
```

- Metal is ON by default on Apple [repo: `src/CMakeLists.txt:11`]. The Command Line Tools alone have no Metal compiler, so configure with `-DBTX_ENABLE_METAL=OFF` unless full Xcode and its Metal toolchain are installed (`xcodebuild -downloadComponent MetalToolchain`; then `xcrun -f metal` must print a path) [repo: `doc/build-osx.md`].
- CMake finds Homebrew `openssl@3` by itself on Apple and prefers its static libraries [repo: `CMakeLists.txt:172-198`]. Apple's `/usr/bin/openssl` is LibreSSL and cannot make ML-DSA-44 certificates.
- A Metal build that runs tests while another `btxd` uses the GPU: build and test with `-j2`.

### 2.3 Windows [read: a contributor fork's CI workflow, `doc/btx-windows-11-compile-handbook.md`; not run natively for this page]

- The reference Windows builds are the fork CI jobs: `win-native-build` / `win-native-tests` (clang-cl, the `windows-clangcl-static` preset, vcpkg `x64-windows-static`, OpenSSL 3.5 built from source with `VC-WIN64A no-shared no-asm`) and `mingw-cross` / `mingw-tests` (cross build from Linux). The C-PORT owner runs the Windows CI jobs; ask on the board (linked from [`README.md`](README.md)) for a run instead of rebuilding locally.
- Local native build: `powershell -ExecutionPolicy Bypass -File .\contrib\devtools\build-btx-windows.ps1 -InstallDependencies -BuildTests` [repo]. Its vcpkg manifest (`vcpkg.json`) has no OpenSSL, while `WITH_MODELNET` defaults to ON and needs 3.5, so expect to supply an OpenSSL 3.5 prefix the way the CI job does [read: `vcpkg.json`, the CI job; inferred].
- Short paths without spaces (`C:\src\btx`); keep vcpkg on short paths [repo: the handbook].
- In your own scripts never name variables `RC`, `CC`, `CXX`, `LIB`, `INCLUDE`, `CFLAGS` or `LDFLAGS`: CMake and the MSVC tools read them from the environment. See [`lessons/2026-11-12-windows-tool-read-env-names.md`](lessons/2026-11-12-windows-tool-read-env-names.md).

### 2.4 WSL2

Same as Linux. Clone and build inside the Linux file system (`~/`), not under `/mnt/c`. For CUDA under WSL2 the driver comes from Windows and the toolkit is installed inside Ubuntu; keep them in step [repo: `doc/btx-cuda-mining-troubleshooting.md` §4c].

## 3. Unit tests

```bash
export OMP_NUM_THREADS=2 OMP_WAIT_POLICY=PASSIVE    # libgomp pools default to every host CPU [C3]
J=$(( $(nproc) / 2 )); [ "$J" -ge 1 ] || J=1        # macOS: $(( $(sysctl -n hw.ncpu) / 2 )); keep J <= RAM_GB / 2.5 [C3]
ctest --test-dir build -N | tail -1                 # registered tests: 2,625 at c6f9678d [C3]
ctest --test-dir build -j "$J" --timeout 900 -E 'matmul_v4_rc_stage3_' --output-on-failure
ctest --test-dir build -R '^wallet_tests$' --output-on-failure        # one suite
build/bin/test_btx --run_test=wallet_tests --log_level=test_suite      # one suite, case by case
build/bin/test_btx --run_test=wallet_tests/<case_name>                 # one case
```

- **One ctest entry per Boost suite.** `src/test/CMakeLists.txt` registers every top-level `BOOST_*_TEST_SUITE` as its own ctest entry [repo]. `ctest` counts suites, not cases: a suite that times out hides every case in it.
- **Thread oversubscription.** `test_btx` sizes its thread pools from `std::thread::hardware_concurrency()`, which reports every host CPU, not a container quota; libgomp does the same unless `OMP_NUM_THREADS` is set. On a 128-thread box, 100 suites in parallel brought the load to about 2,000 until both were capped [C3]. On many-core Linux boxes add this shim (testing only; say so if you compare with an unshimmed run):

```bash
cat > ~/btx-work/hwc.c <<'EOF'
#include <stdlib.h>
static int hwc_n(void) { const char* e = getenv("BTX_HWC"); int n = e ? atoi(e) : 0; return n > 0 ? n : 1; }
int get_nprocs(void) { return hwc_n(); }
int get_nprocs_conf(void) { return hwc_n(); }
unsigned int _ZNSt6thread20hardware_concurrencyEv(void) { return (unsigned int)hwc_n(); }
EOF
gcc -shared -fPIC -O2 -o ~/btx-work/libhwc.so ~/btx-work/hwc.c
BTX_HWC=2 LD_PRELOAD="$HOME/btx-work/libhwc.so" ctest --test-dir build -j "$J" --timeout 900 -E 'matmul_v4_rc_stage3_'
```

- **Slow suites.** There are 191 `matmul_v4_rc_stage3_*` suites [tested: suite names at `4c7840e9`]. Under coverage they took 100-300 s each; 47 did not finish within 3,600 s each on 6 threads [C3; plan §1.1]. Leave them out of routine runs. A suite that times out on your machine: rerun it alone (`-R '^name$' --timeout 3600`) before you call it a failure. Outside the stage3 set, `smile2_audit_tests` and `smile2_membership_tests` need 17.5 and 21.7 min on one core, so they miss `--timeout 900` on a plain build; alone with `--timeout 3600` both pass [C0]. Never raise a timeout in a PR.
- **Known state.** At `c6f9678d` under coverage: 2,575 passed, 47 timed out, 2 failed, 1 skipped [C3; plan §1.1]. A red suite is news only if it is green on the base commit with the same build. Show both.
- **Registration.** A new suite must appear in `ctest --test-dir build -N`. Unregistered tests are class K19 ([`05-bug-classes.md`](05-bug-classes.md)).

## 4. Functional tests

```bash
mkdir -p ~/btx-work/func-tmp
python3 build/test/functional/test_runner.py --configfile=build/test/config.ini \
  --jobs=4 --tmpdirprefix="$HOME/btx-work/func-tmp" --combinedlogslen=60 wallet_basic.py
# whole default list (BTX_BASE_SCRIPTS: 208 scripts at c6f9678d, 211 at 4c7840e9): omit the script name; hours on a laptop
# slow builds (coverage, sanitizers): add --timeout-factor=4 (passed on to every script)
# --resultsfile=func-results.csv writes one CSV row per script
```

- `--configfile` points at the build tree's `test/config.ini`; that file decides which components (wallet, modelnet, ZMQ) the runner thinks exist [repo: `test/config.ini.in`]. ZMQ tests need `python3-zmq`.
- **Known state.** On the coverage build at `c6f9678d`, 82 of 208 scripts failed; 48 of them stalled with "ExactReplay required" in the node logs [plan §1.1]. Under TSan, 55 of a 200-script subset (the `feature_`, `wallet_`, `p2p_` and `rpc_` scripts) failed, and 51 of those 55 also fail on a plain gcc build [C2; plan §1.3]. A red functional run is not news by itself: compare the script on the base commit.
- **In a container (rootless Podman)** [C0]:
  - Rootless Podman caps a container at 2,048 processes and threads by default (`pids_limit` in `containers.conf`). With 12 functional jobs, nodes then fail to start threads (`std::system_error`, "Resource temporarily unavailable", EAGAIN). Start the container with `--pids-limit 65536` (or `-1` for none).
  - Keep `--tmpdirprefix` short, for example `/tmp/f`. `btx-modeld` puts a Unix socket under the node's datadir, and a long prefix pushes it past the 108-byte limit ("AF_UNIX path too long"). The runner only adds a short `XDG_RUNTIME_DIR` fallback when that variable is unset [repo: `test/functional/test_runner.py:970-977` at `88c9b49c`], and inside a container it often is set.
  - The OpenSSL 3.5 binary has to be found inside the container too: set `BTX_BCP1_OPENSSL` or `PATH` there (see §2.1).
- **Stall check:** `grep -l 'ExactReplay required' ~/btx-work/func-tmp/test_runner_*/<script>_*/node*/regtest/debug.log`, where `<script>` is the name without `.py` [repo: `test/functional/test_runner.py`]. A stall is the known class, not your bug. Never "fix" it in a PR with `-matmulvalidation=economic`: that setting is a non-default diagnostic [plan §1.1]. Tests that do not need MatMul can follow the `MATMUL_OFF` argument pattern in `test/functional/rpc_bounty_secret_ref_wallet_restriction.py` [repo].

## 5. Coverage (gcc, Linux)

> **Coverage is measured again.** The coverage build (`-DCMAKE_BUILD_TYPE=Coverage`) configures again on `release-0.34.16` since #578 landed on 12 Nov (commit `7051507b`). The fix is not in v0.34.15 (`main`, `476f3f23`): the configure-time step that #578 removed is still there. Measured at `c6f9678d` with the same fix applied: product-code lines 65.8% unit-only and 69.9% unit + functional; branches 37.7% and 40.7%. All are floors: 47 unit suites timed out and 82 of 208 functional scripts failed in the coverage run. Details and per-area rows: [`01-state.md` §3](01-state.md#3-coverage).

The one-shot `cmake -P build-cov/Coverage.cmake` [repo: `doc/developer-notes.md`] stops at the first failing ctest run (`COMMAND_ERROR_IS_FATAL ANY`), and some tests fail today, so it never writes a report [read: `cmake/script/Coverage.cmake`]. Use the measured recipe instead [C3]:

```bash
cd ~/btx-work/<lane>-<topic>                                # the worktree; $OSSL and $J as in §2.1 and §3
sudo apt-get install -y python3-venv                        # Ubuntu needs it for the venv below
python3 -m venv ~/btx-work/gcovr && ~/btx-work/gcovr/bin/pip install gcovr==8.8
cmake -B build-cov -DCMAKE_BUILD_TYPE=Coverage -DCMAKE_C_COMPILER=gcc -DCMAKE_CXX_COMPILER=g++ \
  -DOPENSSL_ROOT_DIR="$OSSL" -DOPENSSL_USE_STATIC_LIBS=ON -DBUILD_GUI=OFF -DBUILD_TESTS=ON \
  -DWITH_MODELNET=ON -DWITH_ZMQ=ON -DBUILD_BENCH=OFF -DBTX_ENABLE_CUDA_EXPERIMENTAL=OFF
cmake --build build-cov -j"$(nproc)"
find build-cov -name '*.gcda' -delete                       # clean counters before every measured run

# run what you measure (unit and/or functional), e.g.:
ctest --test-dir build-cov -j "$J" --timeout 1800 -E 'matmul_v4_rc_stage3_'
python3 build-cov/test/functional/test_runner.py --configfile=build-cov/test/config.ini \
  --jobs="$J" --tmpdirprefix="$HOME/btx-work/func-tmp" --timeout-factor=4

# capture
mkdir -p ~/btx-work/cov-out
cat > ~/btx-work/cov-capture.cmake <<'EOF'
include(${BUILD}/CoverageInclude.cmake)
coverage_capture_gcovr_trace("${OUT}/trace.json")
execute_process(COMMAND ${GCOVR_REPORT_COMMAND} --add-tracefile "${OUT}/trace.json"
  --json-summary "${OUT}/summary.json" --json-summary-pretty --txt-summary
  WORKING_DIRECTORY "${BUILD}" OUTPUT_FILE "${OUT}/txtsum.txt" COMMAND_ERROR_IS_FATAL ANY)
EOF
cmake -DBUILD="$PWD/build-cov" -DOUT="$HOME/btx-work/cov-out" \
  -DGCOVR_EXECUTABLE="$HOME/btx-work/gcovr/bin/gcovr" \
  -DGCOVR_OPTS="-j $J --gcov-ignore-parse-errors suspicious_hits.warn_once_per_file --gcov-ignore-parse-errors negative_hits.warn_once_per_file" \
  -P ~/btx-work/cov-capture.cmake
cat ~/btx-work/cov-out/txtsum.txt
```

`coverage_capture_gcovr_trace` and `GCOVR_REPORT_COMMAND` come from the build tree's `CoverageInclude.cmake`; `GCOVR_EXECUTABLE` and `GCOVR_OPTS` are inputs it reads [repo: `cmake/script/CoverageInclude.cmake.in`].

Area line coverage, product code only (paths in the summary are relative to `src/`):

```bash
python3 - ~/btx-work/cov-out/summary.json wallet/ <<'EOF'
import json, sys
d = json.load(open(sys.argv[1])); p = sys.argv[2]
def product(f): return not (f.startswith(("test/", "bench/", "fuzz/")) or "/test/" in f or "/fuzz/" in f)
fs = [f for f in d["files"] if f["filename"].startswith(p) and product(f["filename"])]
c = sum(f["line_covered"] for f in fs); t = sum(f["line_total"] for f in fs)
print(p, len(fs), "files", c, "/", t, "lines", "%.1f%%" % (100.0 * c / t if t else 0))
EOF
```

When you report a coverage number, give the commit, the suite set (unit only, or unit + functional, and what was excluded), which suites finished and which timed out, the timeout used, that the `.gcda` counters were cleared before the run, the build type and the gcovr version. A total that rose because more suites wrote data is not a test improvement (exam question 6).

Pitfalls, all hit on 12 Nov [C3]:
- **Fresh build directory.** A tree configured before #578 keeps stale source links; delete it rather than reuse it [repo: commit `7051507b` message]. Check the checkout first: `git merge-base --is-ancestor 7051507b HEAD && echo "has #578"` (or `test -e cmake/script/CoverageSanitize.cmake.in && echo "no #578"` when the fix was applied locally). See [`lessons/2026-11-12-coverage-fresh-build-dir.md`](lessons/2026-11-12-coverage-fresh-build-dir.md).
- **gcovr backend only.** If `lcov` and `genhtml` are both on `PATH`, the scripts switch to lcov and the gcovr commands above are not defined [repo: `cmake/script/CoverageInclude.cmake.in`]. Use a box without lcov.
- **gcovr options.** A real hit count of 9.8e9 at `uint256.h:112` trips gcovr's suspicious-hits check, and threads leave negative counts (GCC bug 68080). Both `--gcov-ignore-parse-errors` options above are needed, or the capture fails.
- **Threads.** Set `OMP_NUM_THREADS` and the `BTX_HWC` shim (§3) for coverage runs too; under coverage the stage3 suites run about ten times slower on 2 OpenMP threads.
- **A killed test writes no data.** Timeouts produce no `.gcda`, so every number is a floor. Stop nodes with SIGTERM only; they write counters on a clean exit.
- **Not in the numbers:** `secp256k1` (the capture command excludes it [repo: `cmake/script/CoverageInclude.cmake.in`]) and `libbitcoinpqc` (not instrumented in the C3 build) [C3].
- **Scale.** Full unit + functional coverage took a 128-thread box most of a day [C3]. Owners measure their own files before and after; the full-baseline number comes from the coverage-ratchet box (I-CI lane, job CI-9). Baseline to compare with: 65.8% lines unit-only, 69.9% unit + functional, product code, at `c6f9678d` [plan §1.1].
- macOS coverage with AppleClang is not verified.

## 6. Sanitizers [read: `ci/test/00_setup_env_native_asan.sh`, `ci/test/00_setup_env_native_tsan.sh`, `ci/test/03_test_script.sh`; TSan tested in C2]

```bash
# ASan + UBSan (clang): the SANITIZERS and APPEND_CPPFLAGS values of the upstream ci/test ASan config
cmake -B build-asan -DCMAKE_C_COMPILER=clang -DCMAKE_CXX_COMPILER=clang++ \
  -DSANITIZERS=address,float-divide-by-zero,integer,undefined \
  -DAPPEND_CPPFLAGS='-DARENA_DEBUG -DDEBUG_LOCKORDER' \
  -DBUILD_TESTS=ON -DBUILD_GUI=OFF -DBUILD_BENCH=OFF -DWITH_ZMQ=ON -DWITH_MODELNET=ON \
  -DOPENSSL_ROOT_DIR="$OSSL" -DOPENSSL_USE_STATIC_LIBS=ON -DBTX_ENABLE_CUDA_EXPERIMENTAL=OFF
cmake --build build-asan -j"$(nproc)"
export ASAN_OPTIONS="detect_leaks=1:detect_stack_use_after_return=1:check_initialization_order=1:strict_init_order=1"
export LSAN_OPTIONS="suppressions=$PWD/test/sanitizer_suppressions/lsan"
export UBSAN_OPTIONS="suppressions=$PWD/test/sanitizer_suppressions/ubsan:print_stacktrace=1:halt_on_error=1:report_error_type=1"

# TSan + lock-order checks (clang 20 or newer): the C2 configuration
cmake -B build-tsan -DCMAKE_BUILD_TYPE=RelWithDebInfo -DCMAKE_C_COMPILER=clang-20 -DCMAKE_CXX_COMPILER=clang++-20 \
  -DSANITIZERS=thread -DAPPEND_CPPFLAGS='-DDEBUG_LOCKORDER' \
  -DBUILD_TESTS=ON -DBUILD_GUI=OFF -DBUILD_BENCH=OFF -DWITH_ZMQ=ON -DWITH_MODELNET=ON \
  -DOPENSSL_ROOT_DIR="$OSSL" -DOPENSSL_USE_STATIC_LIBS=ON -DBTX_ENABLE_CUDA_EXPERIMENTAL=OFF
cmake --build build-tsan -j"$(nproc)"
export TSAN_OPTIONS="suppressions=$PWD/test/sanitizer_suppressions/tsan:halt_on_error=1:second_deadlock_stack=1"
```

- Run unit and functional tests on these trees as in §3 and §4, with `--timeout-factor=4` for functional runs. Set the `*_OPTIONS` from the worktree root, so `$PWD` points at `test/sanitizer_suppressions/`.
- The upstream `ci/test` TSan config differs from C2's: it builds an instrumented libc++ and uses `-DDEBUG_LOCKCONTENTION` [repo]. The C2 recipe above is the one the baseline was measured with.
- **clang 20.** If your release does not package `clang-20`, LLVM's own apt repository (apt.llvm.org) does [inferred].
- **TSan start-up.** On kernels with `vm.mmap_rnd_bits=32` the TSan runtime can abort at start. On your own machine, with the operator's OK (it is a system setting until the next reboot): `sudo sysctl vm.mmap_rnd_bits=28`. In a container where you cannot, C2 needed a retry launcher (mean 9.2 tries per start). The clang-18 runtime died at start where `personality(ADDR_NO_RANDOMIZE)` was blocked; use clang 20 [C2].
- **Baselines.** TSan: 41 site pairs, 5 product classes. `-Wthread-safety`: 266 warnings. DEBUG_LOCKORDER: 1 known inversion in wallet code; it makes one shielded-wallet functional script abort under DEBUG_LOCKORDER. It is on the A-SHIELDED lane's done bar in [`07-lanes.md`](07-lanes.md); do not report it again [data; plan §1.3].
- Do not re-run the baseline tools (CodeQL, cppcheck, clang-tidy, TSan, coverage at `c6f9678d`) to check the published numbers. Reuse those results and re-grep only the live head.
- 51 of the 55 functional failures under TSan also fail on a plain gcc build; under TSan, a failure counts only if it passes on the plain build [C2; plan §1.3].
- Never mix `address` and `thread` in one build. macOS ASan has no leak detection.

## 7. Fuzz quick-start (Linux, clang) [read: `doc/fuzzing.md`, `CMakePresets.json`, `src/test/fuzz/fuzz.cpp`]

```bash
cmake --preset=libfuzzer -DOPENSSL_ROOT_DIR="$OSSL" -DOPENSSL_USE_STATIC_LIBS=ON    # build_fuzz/, ASan+UBSan+libFuzzer
cmake --build build_fuzz -j"$(nproc)"
PRINT_ALL_FUZZ_TARGETS_AND_ABORT=1 build_fuzz/bin/fuzz | wc -l        # the targets this build has (see 01-state.md §5)
mkdir -p ~/btx-work/corpus/matmul_rc_admission_store
FUZZ=matmul_rc_admission_store build_fuzz/bin/fuzz -max_total_time=600 ~/btx-work/corpus/matmul_rc_admission_store/
```

- The `libfuzzer` preset builds into `build_fuzz/` with `SANITIZERS=undefined,address,fuzzer`; `libfuzzer-nosan` builds into `build_fuzz_nosan/` without ASan and UBSan [repo: `CMakePresets.json`].
- The modelnet fuzz build does not link at default options [plan §1.5]. If the link fails, `-DWITH_MODELNET=OFF` gets you the other targets. Fixing the link is A-HELPER's first task; do not patch the build files from another lane.
- A crash is a lead until it reproduces from the saved input (`build_fuzz/bin/fuzz <crash-file>` with the same `FUZZ=`) on the live head. A crash in a harness, not in product code, is a harness bug: say which.
- A crash that reproduces in product code goes through GitHub private vulnerability reporting on `btxchain/btx`, never a public issue, PR or chat post. The class goes on the registry without the detail ([`05-bug-classes.md`](05-bug-classes.md)).
- Apple clang ships no libFuzzer. Fuzz on Linux.

## 8. Not verified on this page

- A native Windows build and a Metal build: read from the handbooks and the fork CI job, not run for this page.
- macOS coverage with AppleClang.
- The CUDA build lines: read from `doc/btx-cuda-mining-troubleshooting.md` and `src/CMakeLists.txt`, not rebuilt for this page.
- The `[C2]` and `[C3]` numbers were measured at `c6f9678d`; the commands were re-checked against the tree at `4c7840e9`, not re-run end to end.
