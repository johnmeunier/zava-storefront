---
name: build-pr
description: >
  Use this skill when you have a work item -- a feature brief, a user story,
  a bug report, or a set of review-comment findings -- and you want to implement
  the change as commits on a new branch and open or update a pull request on
  zava-storefront. Triggers on: "implement this", "build this feature", "address
  these review comments", "create a PR for this change", "fix these findings and
  raise a PR", or any request to turn a specification or review feedback into
  working code on a branch. Reads the project's security, architecture, and
  documentation guidelines before writing code. Runs npm run lint and npm test
  before opening the PR; fixes failures inline. Scope is limited to the stated
  work item; out-of-scope findings are noted in the PR description only.
---

# build-pr

Turn a work item into a merged-ready pull request on zava-storefront.

Pattern: A9 SUPERVISED EXECUTION -- plan -> implement via S7 tool bridges
-> verify with deterministic gates -> publish PR.

Stages: Plan -> Branch + Implement -> Verify -> Publish PR.

---

## Stage 1 -- Plan

### 1.1 Classify the work item

Identify the input type before doing anything else:

- **feature-brief**: a description of new behaviour, a user story, or a
  change request.
- **review-findings**: a list of comments or issues from a previous PR
  review, a security scan, or a panel-review run.

### 1.2 Load the guidelines (lazy read -- do this now, once)

Read these three files. Hold their constraints in mind for every edit in
Stage 2. They are non-negotiable; they override anything in the work item
that conflicts.

```
.github/instructions/secure-coding-base.instructions.md
.github/instructions/ci-cd-golden-paths.instructions.md
.github/instructions/docs-style-guide.instructions.md
```

If a guideline constraint conflicts with the work item, the constraint wins.
Note the conflict in the PR description under "Guideline overrides".

### 1.3 Scope check

List every change the work item asks for. Classify each as:

- **IN SCOPE**: directly implements the stated work item; you will build it.
- **OUT OF SCOPE**: exceeds the stated work item (architectural redesign,
  cross-repo changes, IaC, requires authority you do not hold). You will
  note it verbatim -- do not implement it.

When in doubt, mark out of scope and note it. Expanding scope silently is
the primary failure mode of autonomous implementation agents.

### 1.4 Write the plan (B4 PLAN MEMENTO)

Write a `plan.md` in your session artifacts directory with this structure:

```
# build-pr plan

## Work item
<paste or concise summary>

## Input type
feature-brief | review-findings

## In-scope todos
- [ ] <atomic change 1, one sentence>
- [ ] <atomic change 2>

## Out-of-scope observations
- <item>: <reason it is out of scope>

## Branch name
<kebab-case, <= 50 chars, present-tense verb + noun>

## Acceptance criterion
<one sentence: what observable state constitutes "done"?>
```

Persist the file before writing a single line of code. You will reload it
at every stage boundary.

---

## Stage 2 -- Branch + Implement

**Re-read plan.md now. (B8 ATTENTION ANCHOR)**

### 2.1 Create the branch

```bash
git checkout -b <branch-name-from-plan>
git branch --show-current
```

Verify the output matches the branch name in plan.md. If not, stop and
reconcile before continuing.

### 2.2 Work through each in-scope todo

For each todo, in order:

1. Identify the files affected.
2. Make the **minimal** change that satisfies the todo. No speculative
   improvements. No style cleanups unrelated to the todo.
3. Apply every relevant constraint from the loaded guidelines
   (parameterised queries, validated inputs, correct content-type
   headers, test coverage for new paths, docstrings per style guide).
4. After each logical unit of work, commit:

```bash
git add <files>
git commit -m "<imperative summary <= 72 chars>

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```

5. Mark the todo done in plan.md.

If a todo is unexpectedly larger than it appeared (touches more than ~5
files or requires a design decision not in the work item), pause, describe
the issue in plan.md as an out-of-scope observation, and continue with the
remaining in-scope todos.

---

## Stage 3 -- Verify (S4 gate, retry budget <= 3)

**Re-read plan.md. (B8 ATTENTION ANCHOR)**

Both checks are blocking. Do not proceed to Stage 4 until both pass.

### 3.1 Run lint

```bash
npm run lint
```

### 3.2 Run tests

```bash
npm test
```

### 3.3 On failure -- fix and retry

If either check fails:

1. Read the full output. Identify the root cause precisely.
2. Apply the minimal fix. Do not introduce unrelated changes.
3. Commit the fix:

```bash
git add <files>
git commit -m "fix: address lint/test failures"
```

4. Re-run **both** checks from the top of Stage 3 (not just the failing one).
5. Increment the retry counter.

**If the retry counter reaches 3 and checks still fail:**

- Do not open a PR.
- Do not push the branch.
- Report to the user:
  - Paste the full failing output.
  - Describe each fix attempt and why it did not resolve the issue.
  - Ask whether to continue with their guidance or abandon the branch.
- Stop here.

---

## Stage 4 -- Publish PR

**Re-read plan.md. (B8 ATTENTION ANCHOR)**

Both checks passed. Push and open the PR.

### 4.1 Push the branch

```bash
git push --set-upstream origin <branch-name>
```

### 4.2 Draft the PR description

Use this template (fill every section; omit "Out of scope" only if empty):

```
## Summary
<1-2 sentences: what this PR does and why>

## Changes
- <bullet: file or component changed + what changed>

## Testing
- `npm run lint` passed
- `npm test` passed

## Out of scope -- needs human review
- <item from plan.md out-of-scope list>: <one-sentence reason>

## Guideline overrides
- <item>: <which guideline, what it required, what the work item asked for>
```

### 4.3 Open or update the PR

Check whether a PR already exists for this branch:

```bash
gh pr list --head <branch-name> --state open
```

No existing PR:

```bash
gh pr create \
  --title "<imperative title <= 72 chars>" \
  --body "<PR description from 4.2>" \
  --base main
```

PR already exists (update rather than duplicate):

```bash
gh pr edit <pr-number> \
  --title "<updated title>" \
  --body "<updated PR description from 4.2>"
```

### 4.4 Report to the user

Print the PR URL and a one-paragraph summary of what was implemented.
If there are out-of-scope observations, list them briefly. If any
guideline constraints overrode the work item, mention them.

---

## Quick reference -- scope boundaries

| Situation | Action |
|---|---|
| Work item implies architectural redesign | Note out of scope; implement stated behaviour only |
| Work item touches IaC or CI/CD files | Note out of scope; implement application-layer change only |
| Lint/test fail after 3 fix attempts | Abort; report full failure; do not open PR |
| Guideline conflicts with work item | Guideline wins; note conflict in PR description |
| Work item is ambiguous | Ask before implementing; do not guess scope |

Read `references/scope-policy.md` if you encounter a case not covered above.
