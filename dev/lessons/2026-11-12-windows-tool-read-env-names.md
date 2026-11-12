# Lesson: never name a script variable after one the build tools read

> Last verified: 2026-11-12 · against: btxchain/btx release-0.34.16 @ 4c7840e9 · owner role: lessons reviewer

**Filed:** 2026-11-12 · **Area:** Windows builds (C-PORT) · **Status:** open

## What happened

On 8 Nov 2026 a community Windows build script stopped at the CMake configure step on a tester's Windows PC. The script kept each step's exit code in a cmd variable named `RC` (`set "RC=%errorlevel%"`). CMake reads `RC` from the environment as the Windows resource compiler, so configure failed with:

```
Could not find the compiler specified in the environment variable RC:
0.
```

Every Windows configure of `btxchain/btx` reads `RC`. The tree adds Windows resource files to its programs (`add_windows_resources(btxd bitcoind-res.rc)`, `src/CMakeLists.txt:2121` at `4c7840e9`), and CMake turns on the resource-compiler language for all three Windows toolchains (`enable_language(RC)` in CMake's `Modules/Platform/Windows-MSVC.cmake`, `Windows-Clang.cmake` and `Windows-GNU.cmake`) [read].

The script had passed its own tests on Linux and macOS. Those tests replaced CMake with a stub, so no real CMake ever read the variable. The bug showed only on the first real Windows run.

## What was done

The script was changed so that every variable it sets carries a `BTX_` prefix, and its environment set-up clears the tool-read names before CMake starts. A test was added that fails when a script assigns one of the names below. The stubbed tests were relabelled as proxies, and the things only a real Windows run can show were listed before the next release of the script.

## The rule now

1. In any script that runs a build (cmd, PowerShell, bash, or Python that edits `os.environ`), never set or export these names, because the tools read them from the environment:
   - CMake: `CC`, `CXX`, `CFLAGS`, `CXXFLAGS`, `LDFLAGS`, `RC`, `RCFLAGS` [read: `cmake --help-manual cmake-env-variables`].
   - The MSVC compiler and linker: `CL`, `_CL_`, `INCLUDE`, `LIBPATH` (compiler) and `LINK`, `_LINK_`, `LIB` (linker) [read 12 Nov: Microsoft's "CL environment variables" page and the "LINK environment variables" section of its linker reference].
2. Prefix your own variables (`BTX_STEP_RC`, `BTX_BUILD_DIR`). In cmd scripts start with `setlocal`, so nothing you set leaks into the caller's shell.
3. A test that stubs the real tool is a proxy. Label its result as a proxy, and run a Windows script once with the real CMake on Windows, or through the fork CI Windows jobs, before anyone else runs it.
4. When a Windows configure fails with "environment variable X", list the environment first (`set` in cmd, `Get-ChildItem Env:` in PowerShell) and look for the names above before anything else.

## Source

- `dev/04-build-and-test.md` §2.3, last bullet: the short list (`RC`, `CC`, `CXX`, `LIB`, `INCLUDE`, `CFLAGS`, `LDFLAGS`) [read].
- CMake modules (CMake 4.4.3): `CMakeDetermineRCCompiler.cmake` reads `$ENV{RC}` and stops with the error above when it does not name a compiler; `CMakeRCInformation.cmake` reads `$ENV{RCFLAGS}`; `CMakeDetermineCCompiler.cmake` reads `$ENV{CC}`; `CMakeCInformation.cmake` reads `$ENV{CFLAGS}`; `CMakeCommonLanguageInclude.cmake` reads `$ENV{LDFLAGS}` [read]. The full list: https://cmake.org/cmake/help/latest/manual/cmake-env-variables.7.html
- MSVC: https://learn.microsoft.com/en-us/cpp/build/reference/cl-environment-variables and the "LINK environment variables" section of https://learn.microsoft.com/en-us/cpp/build/reference/linking [read 12 Nov 2026].
- `btxchain/btx` at `4c7840e9`: `src/CMakeLists.txt:2121`; the five `*-res.rc` files directly under `src/`, plus `src/qt/res/bitcoin-qt-res.rc` for the GUI; `cmake/module/AddWindowsResources.cmake` adds them only `if(WIN32)` [read].

## Verified by (command, commit, platform)

The mechanism, on any machine with CMake 3.22 or newer [tested 12 Nov 2026, macOS arm64, CMake 4.4.3]:

```bash
mkdir -p rc-demo && cd rc-demo
printf 'cmake_minimum_required(VERSION 3.22)\nproject(rcdemo LANGUAGES C)\nenable_language(RC)\n' > CMakeLists.txt
RC=0 cmake -S . -B b 2>&1 | grep -A2 'environment variable RC'
# prints: Could not find the compiler specified in the environment variable RC: ... 0.
```

On macOS the same project without `RC` also fails, with a different message ("No CMAKE_RC_COMPILER could be found"), because macOS has no resource compiler. Only the `RC=0` run fails on the value of the variable, which is the point of the check.

The `btxchain/btx` side: `git grep -n 'add_windows_resources' 4c7840e9 -- src/CMakeLists.txt src/qt/CMakeLists.txt` lists the six programs that carry a resource file on Windows (`btxd`, `btx-cli`, `btx-tx`, `btx-util`, `btx-wallet`, `btx-qt`).

Not verified here: the original failure was on Windows and was not re-run natively for this lesson. The MSVC variable list is from Microsoft's documentation, not from a run.

## Hub pages to change

- `04-build-and-test.md` §2.3: replace the short list with the two lists in rule 1; add rules 2 and 3.
- `packs/C-PORT.md` and `packs/I-RC-runner.md`, Windows sections: one line pointing here.
- Exam: no new question (a recipe trap, not a judgement mistake).
