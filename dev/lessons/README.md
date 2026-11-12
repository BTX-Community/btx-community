# Lessons learned

> Last verified: 2026-11-12 · against: btxchain/btx release-0.34.16 @ 4c7840e9 · owner role: lessons reviewer

A lesson is a one-page record of a trap someone paid for, so nobody pays for it twice. It says what happened, what was done, the rule now, and which hub page changes because of it. The hub pages hold the rules; the lessons hold the reasons.

## When to write one

- A recipe in this hub was wrong, incomplete or out of date, and you found out by running it.
- A tool, platform or build behaved in a way the hub did not warn about.
- A judgement went wrong: a pull request that should not have been sent, a number quoted without its caveat, a claim made before it was measured.
- An AI setup failed an exam question because the hub was unclear (see "Exam feedback" below).

Not a lesson: anything security-relevant. A remote crash, a fund-loss path or a key leak goes to GitHub private vulnerability reporting on `btxchain/btx`, never into this folder, a pull request or a chat.

## How the loop works

1. **Draft.** Anyone can write a lesson; an AI tool can draft one at the end of a session that hit a trap (`AGENTS.md`: propose a lessons PR, never open it yourself). The human reads it, checks it against the privacy list below and files it.
2. **File.** One pull request per lesson: a new file `dev/lessons/YYYY-MM-DD-slug.md` (the date it was filed; the slug in lower-case words joined by hyphens) and a new row in the index below with status `open`.
3. **Review.** One approving review from a `/dev/` code owner (see `.github/CODEOWNERS`) merges it. The reviewer checks that the "Verified by" steps can be re-run by someone else, that every source is public, and that the privacy list holds.
4. **Fold.** The owner role of each page named under "Hub pages to change" folds the rule into that page, in the same pull request or within a week, and updates that page's last-verified line. The same pull request removes the lesson's own last-verified line, and the index row becomes `folded` with the commit that folded it.
5. **Exam.** When the lesson records a judgement mistake (not only a broken recipe), the exam editor adds a question to [`../exam/questions.md`](../exam/questions.md) and its key to [`../exam/answers.md`](../exam/answers.md), in the same pull request or the next.

A folded lesson is not edited afterwards, except that the folding pull request removes its last-verified line (see "Versioning"). If it turns out wrong, add a dated line under a `## Corrections` heading at its end, the same way the documents under `research/` record corrections, and fix the hub page.

## Versioning

- Every hub page carries one line after its title: `> Last verified: <date> · against: <branch> @ <sha8> · owner role: <role>`. Folding a lesson into a page updates that line.
- `tools/check_stale.py` reads that line: it warns when a page is older than 30 days and fails at 90 once it runs in the site workflow.
- Lessons are dated by their file name. The scanner skips a page in `lessons/` that has no last-verified line and checks one that has it like any other page. So an open lesson carries the line (the template has it), and a lesson left open for 90 days fails the check. The pull request that folds a lesson removes the line: a folded lesson is history and is not checked again. This README keeps its line; it is a hub page.
- Numbers in a lesson carry the commit they were measured on. A newer head does not make a lesson wrong; it may make it folded or obsolete, which the index says.

## Exam feedback

- An exam question that a setup gets wrong with the hub's own sources is a sign the hub is unclear. Find the page that misled, and file a lesson with that page under "Hub pages to change".
- An exam question that a setup gets right for the wrong reason (a right verdict with the wrong source) is a lesson for the exam editor: tighten the question or the key.
- An invented source in an exam answer is always worth a lesson: it shows which instruction the AI tool needs to hear more clearly.

## Privacy list (every lesson is public)

- Roles, not people. No names, no handles of others, no quotes from any chat. GitHub comments are cited by number and date, for example "#464, 11 Nov".
- No hostnames, IP addresses, home-directory paths, wallet addresses, machine names, or provider names of rented machines. Paths start at `~/` or at the repository root.
- No money figures of any kind.
- Static-analysis, sanitizer and fuzz outputs are "results" or "leads". No file:line, function name or reproduction detail for an untriaged result in peer-facing, RPC, consensus, wallet or helper code; build and portability issues and fixes already merged in public pull requests may be cited exactly.

## Template

Copy this into `dev/lessons/YYYY-MM-DD-slug.md`:

```markdown
# Lesson: <the rule, as one short sentence>

> Last verified: <YYYY-MM-DD> · against: btxchain/btx <branch> @ <sha8> · owner role: lessons reviewer

**Filed:** <YYYY-MM-DD> · **Area:** <lane or topic> · **Status:** open

## What happened
<Two to six sentences: what was run, on which commit and platform, what went wrong, the exact
error line. No names; roles only.>

## What was done
<What the person or the AI did about it, including what did not work.>

## The rule now
<Numbered, short, testable rules. Each one something a reader can check or run.>

## Source
<Public sources only: commits, PR numbers with dates, files at a named commit, tool
documentation. Label each claim [read], [tested] or [inferred].>

## Verified by (command, commit, platform)
<The exact commands someone else can re-run, the commit, the OS and tool versions, and the
result. Then a "Not verified" line: what was not run and why.>

## Hub pages to change
<Each page and section, and what changes there. Add "exam: new question" if this was a
judgement mistake.>
```

## Index

| Filed | Lesson | Area | Hub pages to change | Status |
|---|---|---|---|---|
| 2026-11-12 | [Never name a script variable after one the build tools read](2026-11-12-windows-tool-read-env-names.md) | Windows builds (C-PORT) | `04-build-and-test.md` §2.3; `packs/C-PORT.md`; `packs/I-RC-runner.md` | open |
| 2026-11-12 | [After #578, start the coverage build in a fresh build directory](2026-11-12-coverage-fresh-build-dir.md) | coverage (I-CI) | `04-build-and-test.md` §5; `01-state.md` | open |
