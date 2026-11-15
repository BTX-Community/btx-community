# shellcheck shell=bash
# fuzzbox-env.sh: sourced by the other fuzzbox-*.sh scripts. Sanitizer settings as in test/fuzz/test_runner.py.
fuzz_env() {  # $1 = build dir; prints env assignments for `env -i`
  local b=$1
  echo "PATH=/usr/bin:/bin"
  echo "UBSAN_OPTIONS=suppressions=$b/sanitizer_suppressions/ubsan:print_stacktrace=1:halt_on_error=1:report_error_type=1"
  echo "ASAN_OPTIONS=detect_leaks=1:detect_stack_use_after_return=1:check_initialization_order=1:strict_init_order=1"
  echo "LSAN_OPTIONS=suppressions=$b/sanitizer_suppressions/lsan"
  echo "ASAN_SYMBOLIZER_PATH=/usr/bin/llvm-symbolizer"
  echo "UBSAN_SYMBOLIZER_PATH=/usr/bin/llvm-symbolizer"
}
fuzz_cpus() {  # prints the number of CPUs the kit may use (at least 1) for build jobs and fuzz workers
  # GNU nproc returns OMP_NUM_THREADS (or at most OMP_THREAD_LIMIT) when either is set, and a shell
  # or box image may set them (the hub's unit-test recipe exports OMP_NUM_THREADS=2). They size OpenMP thread pools, not the number of processes, so they
  # must not cap the build or the loop: ignore them here. nproc still honours the CPU affinity.
  local n q p cg f
  n=$(env -u OMP_NUM_THREADS -u OMP_THREAD_LIMIT nproc)
  # A cgroup v2 CPU quota (cpu.max holds "<quota> <period>", or "max") lower than that count wins.
  cg=$(sed -n 's/^0:://p' /proc/self/cgroup 2>/dev/null) || cg=
  f=/sys/fs/cgroup${cg%/}/cpu.max
  if [ -r "$f" ] && read -r q p < "$f" && [ "$q" -gt 0 ] 2>/dev/null && [ "${p:-0}" -gt 0 ] 2>/dev/null; then
    q=$(( (q + p - 1) / p ))
    if [ "$q" -lt "$n" ]; then n=$q; fi
  fi
  [ "$n" -ge 1 ] 2>/dev/null || n=1
  echo "$n"
}
