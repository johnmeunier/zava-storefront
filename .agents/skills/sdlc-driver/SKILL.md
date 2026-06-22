---
name: sdlc-driver
description: >
  Use this skill to orchestrate a full build-and-review loop for a pull request
  on zava-storefront. Activate when asked to "drive this PR to merge", "run the
  full SDLC loop", "build and review until green", "iterate build and review",
  "ship this", or any request to run repeated build-check-review cycles until
  checks pass and the review is clean. Runs npm lint and tests first; hands
  failures to the builder; then reviews; loops until the PR is green and the
  verdict is MERGE with no actionable findings, or until the pass cap is reached.
  Defers scope-crossing items for a human. Out of scope: merging the PR, approving
  via GitHub review API, cross-repo changes, or infra changes.
---

# sdlc-driver

Orchestrates a bounded build-and-review loop for a single PR.
Pattern: **A8 ALIGNMENT LOOP** composing **A9 SUPERVISED EXECUTION** check gates
with `build-pr` (BUILD phase) and `pr-guidelines-review` (REVIEW phase) as
child-thread spawns.

Loop invariant: deterministic checks gate the review panel; actionable in-scope
findings from either gate go straight to the builder. Terminates when checks are
green AND verdict is MERGE with zero actionable in-scope findings, or at cap.

Read `assets/pass-state-template.md` when you need the loop-state plan template.

---

## Pre-flight -- Probe dependency skills (A9 weak-form precondition)

Run before the loop starts. These are FACTS -- read from disk, not from recall.

```bash
ls .agents/skills/build-pr/SKILL.md
ls .agents/skills/pr-guidelines-review/SKILL.md
```

If either command fails: **STOP**. Report the missing skill by name. Do not
proceed. Both skills must be present for this orchestrator to function.

---

## Step 1 -- Set goal and write plan (B4 PLAN MEMENTO + B8 ATTENTION ANCHOR)

Ask the user for the PR number if not already provided. Ask for the pass cap if
they want to override the default (default: **5**).

Determine `REPO` from context (user-supplied URL, or infer from `git remote`).

Write the following block to your session plan now. This is the **ATTENTION ANCHOR**
-- reload it at the start of every pass.

```
# sdlc-driver loop

## Goal (B8)
PR: #<N>
REPO: <owner/repo or "(current repo)">
Pass cap: <cap>
Terminal condition: npm lint EXIT=0 + npm test EXIT=0 + review verdict=MERGE
                   + 0 actionable in-scope findings
BOUNDARY: this session NEVER merges the PR and NEVER approves via GitHub
          review API. Cross-repo and IaC changes are out of scope.

## Loop state
Pass: 0 / <cap>
Check status: (pending)
Review verdict: (pending)
Deferred (scope-crossing): []

## Per-pass log
(empty -- appended each pass)
```

---

## Step 2 -- Run one pass

**Reload the plan at the start of every pass.** Update the pass counter.

### 2.1 -- Deterministic checks (S7 DETERMINISTIC TOOL BRIDGE)

Run both commands. Capture exit codes and the last 50 lines of each output.
These are deterministic facts about the current state of the branch -- do not
assert them from memory.

```bash
npm run lint 2>&1
```

```bash
npm test --coverage 2>&1
```

Update the plan:

```
Check status: PASS | FAIL
Lint exit: <code>  Lint tail: <last 50 lines>
Test exit: <code>  Test tail: <last 50 lines>
```

### 2.2 -- Route on check result (S4 gate)

**If FAIL (either lint exit != 0 or test exit != 0):**

Format a `review-findings` work item for build-pr. Include:
- Which checks failed (lint / test / both)
- Verbatim error lines, de-duplicated, capped at 60 lines total
- This instruction verbatim: "Fix these failures so `npm run lint` and
  `npm test --coverage` both exit 0. Do NOT change tests to suppress failures;
  fix the source. Commit all fixes to the current branch; do NOT open a new PR."

Spawn build-pr (see **section BUILD SPAWN** below). Append to the per-pass log:

```
Pass <N>: checks FAIL | build invoked | review skipped | verdict (none)
```

Go to **2.4** (pass counter check).

**If PASS (lint exit = 0 AND test exit = 0):**

Proceed to 2.3.

### 2.3 -- Review panel (delegates to pr-guidelines-review)

Spawn pr-guidelines-review (see **section REVIEW SPAWN** below).

After the spawn completes, parse the verdict receipt for:
- `VERDICT`: `MERGE` or `REQUEST CHANGES`
- `ACTIONABLE_FINDINGS`: list of finding titles, each tagged `IN_SCOPE` or
  `SCOPE_CROSSING`

Update the plan:

```
Review verdict: <MERGE | REQUEST CHANGES>
Findings: <count> in-scope, <count> scope-crossing
```

### 2.3.1 -- B9 GOAL STEWARD check

Ask yourself: are ALL of these true?

1. `npm run lint` exited 0 this pass.
2. `npm test --coverage` exited 0 this pass.
3. Review verdict is `MERGE`.
4. Zero `IN_SCOPE` findings remain.

**If ALL true -> DONE.** Proceed to **Step 3** (final summary).

### 2.3.2 -- Partition findings

Classify each finding as:

- **IN_SCOPE**: directly addressable in this PR (code change, test, doc update
  within this repo and this PR's stated goal)
- **SCOPE_CROSSING**: architectural redesign, cross-repo change, IaC/infra,
  requires authority this agent does not hold, or flags the work item itself as
  outside the PR's stated goal

Add all `SCOPE_CROSSING` findings to the deferred list in the plan.

**If ALL remaining actionable findings are `SCOPE_CROSSING`:**
-> **HUMAN CHECKPOINT** (see **section HUMAN CHECKPOINT** below). Do not proceed.

**If any `IN_SCOPE` findings remain:**

Format them as a `review-findings` work item. Include:
- Finding titles and severity (verbatim from the verdict receipt)
- Dimension (security / architecture / docs)
- This instruction: "Address only the IN_SCOPE findings listed. Do NOT implement
  scope-crossing items. Commit all changes to the current branch; do NOT open a
  new PR."

Spawn build-pr (see **section BUILD SPAWN** below). Append to the per-pass log:

```
Pass <N>: checks PASS | build invoked | review DONE | verdict REQUEST CHANGES
          in-scope findings: <N>, scope-crossing deferred: <N>
```

### 2.4 -- Pass counter check (B10 gate)

Increment pass counter. Update plan.

If `pass >= cap`:
-> **HUMAN CHECKPOINT** (see **section HUMAN CHECKPOINT** below). Do not proceed.

Otherwise **reload the plan** and return to **2.1** for the next pass.

---

## Step 3 -- Final summary

Report to the user:

```
## sdlc-driver: loop complete

### Result
DONE -- terminal condition reached.

### Passes run: <N> / <cap>

### Per-pass log
Pass 1: <checks PASS|FAIL> | <build invoked Y|N> | <review invoked Y|N> | <verdict>
Pass 2: ...

### Deferred (scope-crossing -- hand to a human)
- <finding title> [<dimension>]
(empty if none)

### Final state
npm lint:       PASS | FAIL
npm test:       PASS | FAIL
Review verdict: MERGE | REQUEST CHANGES | (not run)
PR #<N>:        ready for human merge review
```

---

## section BUILD SPAWN (build-pr invocation template)

Spawn a `general-purpose` sub-agent with this brief. Replace `<FINDINGS>` with the
formatted findings text from 2.2 or 2.3.2.

```
You are a coding agent operating on zava-storefront.

Read and follow the procedure in .agents/skills/build-pr/SKILL.md exactly.

Work item type: review-findings
Work item:
<FINDINGS>

After implementing: commit all changes to the current branch. Do NOT open a
new PR or push to a new branch.
```

Wait for the sub-agent to complete before proceeding to the pass counter check.

---

## section REVIEW SPAWN (pr-guidelines-review invocation template)

Spawn a `general-purpose` sub-agent with this brief. Replace `<PR>` and `<REPO>`
with the values from the plan.

```
You are a reviewer operating on zava-storefront.

Read and follow the procedure in .agents/skills/pr-guidelines-review/SKILL.md
exactly.

Review PR #<PR> in repo <REPO>.

After producing and posting the verdict report, return a compact receipt with
ONLY the following fields (no other prose):

VERDICT: MERGE | REQUEST CHANGES
ACTIONABLE_FINDINGS:
- <finding title> [<dimension: security|architecture|docs>] [IN_SCOPE|SCOPE_CROSSING]
- ...
(empty list if verdict is MERGE)
```

Wait for the sub-agent to complete. Parse the receipt from its final response.

---

## section HUMAN CHECKPOINT

When the checkpoint fires, write this to the plan and report to the user:

```
## sdlc-driver: human checkpoint

Reason: <pass cap reached | all remaining findings are scope-crossing>
Pass: <N> / <cap>

### Deferred (scope-crossing -- require human decision)
- <finding title> [<dimension>]

### Loop state at checkpoint
npm lint:       PASS | FAIL
npm test:       PASS | FAIL
Review verdict: MERGE | REQUEST CHANGES | (not run this pass)

### Recommended actions
1. Review the deferred items and decide: widen scope, file separate issues,
   or close as won't-fix.
2. Re-run sdlc-driver with a higher cap if more implementation passes are needed.
3. Once checks and review are satisfied, manually trigger the merge.
```

Do not continue the loop after emitting the checkpoint. Suspend.
