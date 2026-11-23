# Lesson: test an installer against the published archives, not only against one you packed

> Last verified: 2026-11-23 · against: btxchain/btx release-0.34.17 @ d9a94804 · owner role: lessons reviewer

**Filed:** 2026-11-23 · **Area:** packaging and install (I-OPS, C-PORT) · **Status:** fixed on the release line (`b0edfbf4`, 23 Nov), not yet in a published release

## What happened

The FastStart one-shot installer, `contrib/faststart/btx-agent-setup.py`, refuses every link entry in an archive. For Linux and macOS archives that ship `btx-guardd`, the release packager makes `libexec/btx-guardd` a hard link of its `.real` file [read: Source below]. Run on the published archives that carry that link, the installer stops at extraction [read: #932 and #714, 22 Nov]:

```text
ValueError: archive contains unsupported link entry: btx-0.34.17/libexec/btx-guardd.real
```

Those are the v0.34.16 Linux CPU archive and both v0.34.17 Linux archives (CPU and CUDA 13) [read: #932]. The v0.34.16 CUDA 13 archive has no link entry [tested: `tar -tvzf` of the published file]. None of the installer's own tests used an archive with a hard link [read: #932].

## What was done

#932 (22 Nov; on `release-0.34.17` as `b0edfbf4` since 23 Nov) accepts a hard link only when it names a regular file earlier in the archive, and still refuses symlinks and other links. It adds a test that stores the link the way the published archives do: the test fails without the fix and passes with it [read: #932].

## The rule now

1. When you test an installer or an unpacker, run it on the published archives as well, after checking their SHA-256 against `SHA256SUMS`.
2. Until a published release carries #932, install by hand: `doc/btx-download-and-go.md` has the manual steps [read: `contrib/faststart/README.md:3-6`].

## Source

- `contrib/faststart/btx-agent-setup.py:350-351` at `d9a94804`: `issym() or islnk()` raises "unsupported link entry" [read].
- `scripts/release/package_release_archive.py:824-832` at `d9a94804`: for `linux-` and `macos-` builds, an `os.link` call makes `libexec/btx-guardd` a hard link of its `.real` file [read].
- #932 (22 Nov) and #714 (22 Nov): the refusal on the published archives [read].

## Verified by (command, commit, platform)

```bash
git show d9a94804:contrib/faststart/btx-agent-setup.py | sed -n 343,352p
git show d9a94804:scripts/release/package_release_archive.py | sed -n 820,834p
tar -tvzf btx-0.34.16-x86_64-linux-gnu.tar.gz | grep '^h'        # one line: libexec/btx-guardd.real
tar -tvzf btx-0.34.16-x86_64-linux-gnu-cuda13.tar.gz | grep -c '^h'   # 0
```

Read and listed on 23 Nov on macOS, on the published v0.34.16 archives with SHA-256 `9bbfff06…` (CPU, the digest #932 names) and `a29202a9…` (CUDA 13, the digest `doc/release-notes-0.34.17.md:21` names). On 23 Nov the installer at `932a0238` was run on Linux x86_64 against all four published Linux archives (v0.34.16 and v0.34.17, CPU and CUDA 13): every extraction succeeded, and `test/util/btx_agent_setup_test.py` passed [tested].

## Hub pages to change

- `01-state.md` §7: the FastStart installer row (done in the same PR as this lesson).
- `packs/I-OPS.md`: once #932 lands, a line that the installer accepts the published archives.
