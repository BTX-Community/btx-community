# Exam: twelve cases

> Last verified: 2026-11-12 · against: btxchain/btx release-0.34.16 @ 4c7840e9 · owner role: exam editor

Twelve situations, each with a right answer and public sources that show why. Questions 1-5, 9 and 12 come from public pull requests and issues on `btxchain/btx` (October and November 2026) and from the measured run in [`../plan/MASTER-PLAN.md`](../plan/MASTER-PLAN.md) §1.1. Questions 6, 7, 8, 10 and 11 are constructed cases that test rules of this hub. The exam checks your setup: you, or you and your AI tool, working only from this hub and public sources.

## How to take it

1. Give the questions below to the person or the AI session being checked. Nothing else from this folder. For an AI tool with file access, give it a copy of the hub without the key:

   ```bash
   git clone --depth 1 https://github.com/BTX-Community/btx-community exam-run
   rm exam-run/dev/exam/answers.md        # the answering session never has the key on disk
   ```

   Start the session inside `exam-run/`, and delete the folder after grading.
2. **Allowed sources:** every file in this hub except `exam/answers.md`; the upstream repository `github.com/btxchain/btx` at any commit; its public pull requests, issues and comments; commands you run yourself.
3. **Not allowed:** `exam/answers.md` (do not open it, do not paste it, do not let the AI read the folder listing and fetch it); chat logs; asking someone who has seen the key.
4. Answer every question in this shape:

   ```
   Q<n>
   Verdict: <one line: what you do, or yes/no>
   Why: <two to four sentences>
   Sources: <PR or issue numbers with the date of the comment you rely on, commit SHAs,
            hub file and section, or the command you ran and its output>
   ```

5. Grade in a separate session or by hand, with `exam/answers.md`. The session that answered never sees the key.

**Pass bar: 11 of 12.** A question counts when the verdict matches the key and at least one cited source is one the key names (or is equivalent, see the key's grading notes). A right verdict with no source, or with a made-up source, does not count.

For an AI, paste this as the first message of a fresh session:

```
You are taking the BTX developer hub exam. Read dev/AGENTS.md and the hub pages it lists.
Do not open, fetch or search for dev/exam/answers.md. Answer the twelve questions in
dev/exam/questions.md in the shape the file gives. Cite only sources you opened in this
session: PR or issue numbers with dates, commit SHAs, hub file and section, or a command
you ran with its output. If you cannot find a source, say so; never invent one.
```

## The questions

**Q1. A fix in block connection.**
Your AI found a bug in how blocks are connected and drafted a fix: about 20 lines in `src/validation.cpp`, plus a functional test that fails before and passes after on `release-0.34.16`. The test is good. Do you open a pull request against `release-0.34.16`? If not, what do you produce instead, and where does it go?

**Q2. Coverage on v0.34.15.**
An operator who runs v0.34.15 asks: "Coverage is fixed now, right? I want to build it on my v0.34.15 checkout." Is the coverage build fixed on v0.34.15? Which change fixed it, on which branch, and which measured numbers would you quote, with which caveat?

**Q3. One state file, one fix.**
You find a module that writes its state file with a raw `std::ofstream` straight into the data directory. A crash in the middle of the write leaves a truncated file, and the loader then treats the file as empty. You can fix this one file in ten lines and add a test. Do you file that pull request? If not, what does the pull request look like instead?

**Q4. The fifth passphrase PR.**
In four days, four pull requests dealt with locked wallets one step at a time: #456 dropped PQ seeds and cached PQ secret keys on lock, and #475, #488 and #523 each made more funding RPCs ask for the passphrase first. You find another wallet RPC that still fails with a misleading error when the wallet is locked. What do you file, and which test would have made your pull request, and the follow-ups before it, unnecessary?

**Q5. A stalled functional test on the coverage build.**
On your coverage build (gcc, `CMAKE_BUILD_TYPE=Coverage`), a functional test hangs, and its node log contains `ExactReplay required`. Your AI proposes to add `-matmulvalidation=economic` to the test's node arguments, because then the test passes. Do you accept the change? What do you report instead?

**Q6. A coverage gain.**
A contributor reports that their pull request raised product-code line coverage, unit tests only, from 65.8% to 67.4%. The pull request adds one small test file. Their measured run also finished several unit suites that had timed out in the baseline run. Is the 1.6-point gain the pull request's? How should the number be stated?

**Q7. The committer line.**
Before pushing to your fork you run
`git log --format='%h | %an <%ae> | %cn <%ce>' origin/release-0.34.16..HEAD`.
The author column shows your handle and your GitHub no-reply address. The committer column shows a first name and an address that ends in `.local`. You never typed either. What happened, what do you do before pushing, and which hub rule covers it?

**Q8. Slower on a Mac.**
On your Apple Silicon laptop one unit suite takes three times as long at the head of `release-0.34.16` as at the base commit you compared with. You want to open an issue titled "performance regression in <area>". What do you do first, and what would make the claim fileable?

**Q9. Re-filing under a new title.**
A pull request that changes how a signer's withdrawn vote is kept on disk was closed by the maintainer with a note that this kind of change stays out of `release-0.34.16`. A week later someone proposes to open it again under a different title, folded together with three related fixes, "so it reads as one clean change". What do you do? Is there a public precedent, and what happened there?

**Q10. "Tests pass."**
A pull request body reads, in full: "Fixes the crash when the file is missing. Tests pass." You are its second pass. What is missing, and what must the body contain before it goes upstream?

**Q11. A fuzz crash in a peer message parser.**
An overnight libFuzzer run of a target that parses one type of peer message stopped with an AddressSanitizer crash. The stack is in product code, not in the harness, and the crash reproduces from the saved input on the live head. What do you do next? What, if anything, goes into public places (the class registry, the board, a pull request, a chat)?

**Q12. A Linux-only guard.**
A new feature does not build on macOS: two new source files use Linux-only namespace and mount APIs. The quickest fix is to wrap those calls in `#ifdef __linux__` and report the feature as unsupported on other platforms (fail closed), or to compile the two files on Linux only. Do you send that fix? What does the maintainer expect instead? Cite the public precedent.

## Adding or retiring a question

New questions come from lessons that record a judgement mistake (see [`../lessons/README.md`](../lessons/README.md)). A question is added here and its key in `answers.md` in the same pull request. Numbers are never reused: a question that no longer fits is marked "retired" with the date, and its key stays in `answers.md`. Every key cites public sources only.
