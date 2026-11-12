# Lesson: after #578, start the coverage build in a fresh build directory

> Last verified: 2026-11-12 · against: btxchain/btx release-0.34.16 @ 4c7840e9 · owner role: lessons reviewer

**Filed:** 2026-11-12 · **Area:** coverage (I-CI, coverage ratchet) · **Status:** open

## What happened

Before #578, `CMAKE_BUILD_TYPE=Coverage` ran a source-mirror step (`CoverageSanitize.cmake`) at configure time. It linked every entry of `src/` into the build tree's `src/` before CMake had created those directories [read: commit message of `7051507b`]:

- On a fresh build directory, configure stopped with
  `failed to create symbolic link '<build>/src/.clang-format': No such file or directory`.
- On a build directory that already existed, it linked source subdirectories (`secp256k1`, `univalue`, `test`, ...) that CMake then used as binary directories, so build output, libraries included, landed in the source tree.

#578 landed on `release-0.34.16` on 12 Nov 2026 as `7051507b`. It drops the configure-time step. The mirror is now built only when a coverage report is made, after the build, and it never links a source directory that has its own `CMakeLists.txt`. A build directory that went through the old step keeps its links until a report runs. v0.34.15 (`main`, `476f3f23`) does not have #578.

The pitfall was hit on 12 Nov while the coverage baseline at `c6f9678d` was being set up.

## What was done

The old build tree was deleted. The baseline was measured in a new build directory, configured on `c6f9678d` with the #578 change applied: gcc 13.3, `-Og --coverage`, gcovr 8.8, on Linux. Results: product code 65.8% of lines unit-only and 69.9% unit + functional; branches 37.7% and 40.7%. All four are floors: 47 unit suites timed out and 82 of 208 functional scripts failed in that run.

## The rule now

1. Never reuse a coverage build directory that was configured before #578, or on a branch without it. Delete it and configure again: `rm -rf build-cov`. Do not try to repair the links by hand.
2. Before you configure, check that your checkout has the fix. #578 deletes `cmake/script/CoverageSanitize.cmake.in`, so the file test also works when you applied #578 yourself (a local cherry-pick has another SHA):
   ```bash
   test -e cmake/script/CoverageSanitize.cmake.in && echo "no #578: apply it or measure elsewhere" || echo "has #578"
   git merge-base --is-ancestor 7051507b HEAD && echo "7051507b is in this checkout"   # needs release-0.34.16 fetched
   ```
   On v0.34.15 the answer is "no #578". Measure on `release-0.34.16` at or after `7051507b`, or apply #578 locally and say so next to every number.
3. If an old tree was ever built from this worktree, check the source tree for stray build output before you trust it: `git clean -ndx -- src/` lists untracked and ignored files without deleting anything. Build output there (`.a`, `.o`, `CMakeFiles/`) means a fresh worktree is the clean way out.
4. Clear the counters before every measured run (`find build-cov -name '*.gcda' -delete`) and state, with each number, the commit, whether it carries #578, and the suite set that ran.

## Source

- #578, landed as commit `7051507b` on `release-0.34.16` (12 Nov 2026): the commit message and its diff of `CMakeLists.txt`, `cmake/script/CoverageInclude.cmake.in` and `cmake/script/CoverageSanitize.cmake.in` (removed) [read].
- `CMakeLists.txt` at `476f3f23` (v0.34.15): line 666 configures `CoverageSanitize.cmake` and lines 670-675 run it when `CMAKE_BUILD_TYPE` is `Coverage` [read].
- `dev/04-build-and-test.md` §5: the measured recipe and the pitfall "Fresh build directory" [read].
- The measured run at `c6f9678d`: `plan/MASTER-PLAN.md` §1.1, `plan/plan-data.json` [read].

## Verified by (command, commit, platform)

Run in any clone of `btxchain/btx` after `git fetch origin main release-0.34.16` [tested 12 Nov 2026, git on macOS]:

```bash
git show -s 7051507b                                          # the commit message quoted above
git merge-base --is-ancestor 7051507b origin/main; echo $?    # 1: not in v0.34.15
git merge-base --is-ancestor 7051507b origin/release-0.34.16; echo $?   # 0: on the release line
git show origin/main:CMakeLists.txt | grep -n 'CoverageSanitize'        # the old step on v0.34.15
git diff 476f3f23 7051507b^ -- cmake/script/CoverageSanitize.cmake.in cmake/script/CoverageInclude.cmake.in
# empty: v0.34.15 carries the same pre-fix step as the release line had before #578
```

The coverage run itself: Linux, gcc 13.3, gcovr 8.8, fresh build directory, `c6f9678d` with #578 applied, using the recipe in `04-build-and-test.md` §5.

Not verified: a coverage build on macOS with AppleClang; the lcov report path after #578 (the measured run used gcovr only); the `git clean -ndx` check against a tree that really went through the old step.

## Hub pages to change

- `04-build-and-test.md` §5: the "Fresh build directory" pitfall and the `git merge-base` check from rule 2 are there; no change.
- `01-state.md`: the coverage row already says "since #578; not in v0.34.15"; no change.
- Exam: covered by question 2 ("is coverage fixed in v0.34.15?"); no new question.
