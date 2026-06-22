---
name: pr-guidelines-review
description: >
  Use this skill to review a pull request against the team's security,
  architecture, and documentation guidelines. Activate when someone asks to
  "review this PR", "check this PR against our guidelines", "should we merge
  this?", "does this PR meet our standards?", "run the guidelines review",
  "audit this change", or any request to assess a PR or diff against team
  standards before merging. Produces a structured report: verdict (MERGE or
  REQUEST CHANGES), rationale, and findings per dimension ordered by
  criticality, then posts the report as a public comment on the PR. Out of scope:
  approving or merging via the GitHub review API, proposing code fixes,
  pre-push staged-change review (use panel-review for that).
---

# pr-guidelines-review

Multi-lens PR review against the team's three guideline files.
Pattern: A1 PANEL — three independent lens threads fan out in parallel,
a synthesizer aggregates findings into a fixed-format verdict report.

## Guideline files (required — probe before proceeding)

```
SECURITY_GUIDELINE  = .github/instructions/secure-coding-base.instructions.md
ARCH_GUIDELINE      = .github/instructions/ci-cd-golden-paths.instructions.md
DOCS_GUIDELINE      = .github/instructions/docs-style-guide.instructions.md
```

If the user names different files, use those instead.
If any file is missing, STOP and report which file is absent before
doing any review. The review result is only as good as the guideline it
runs against.

## Assets

- `assets/diff-strategy.md` — how to handle large PRs (read at Step 1)
- `assets/finding-schema.md` — JSON schema each lens emits
- `assets/verdict-template.md` — fixed output structure + decision rules

## Lenses (LOCAL SIBLING personas)

- `agents/security-lens.agent.md`
- `agents/arch-lens.agent.md`
- `agents/docs-lens.agent.md`
- `agents/pr-verdict-synthesizer.agent.md`

---

## Step 1 — Set goal and read diff strategy (B4 + B8)

Read `assets/diff-strategy.md` now.

Determine the repo target from context:
- If the user supplied a full GitHub URL (`github.com/<owner>/<repo>/pull/<N>`),
  extract `REPO=<owner>/<repo>` and `PR_NUMBER=<N>`.
- If the user supplied only a number, use the current repo (`REPO` = omit flag,
  `gh` will infer from `git remote`).

Write to session plan:

```
## PR Guidelines Review — Goal (B8 ATTENTION ANCHOR)
PR: #<N>
REPO: <owner/repo or "(current repo)">
Goal: review against security, architecture, and documentation guidelines.
Verdict format: MERGE or REQUEST CHANGES, rationale, findings per dimension.
Post report as public comment on the PR after synthesis.
This session NEVER approves, NEVER merges, NEVER modifies code.
```

## Step 2 — Probe guideline files (S7 tool bridge — FACT reads)

```bash
cat .github/instructions/secure-coding-base.instructions.md
cat .github/instructions/ci-cd-golden-paths.instructions.md
cat .github/instructions/docs-style-guide.instructions.md
```

If any file returns an error: STOP. Report the missing file by name and ask
the user to supply the correct path. Do not proceed with a missing guideline.

## Step 3 — Fetch PR metadata + file manifest (S7 tool bridge)

```bash
gh pr view <PR_NUMBER> [--repo <REPO>] --json title,body,author,additions,deletions,files
gh pr diff <PR_NUMBER> [--repo <REPO>] --name-only
```

Write to session plan:
```
## File manifest
additions: <N>  deletions: <N>
<full file list, one per line>
```

Apply the file-assignment rules from `assets/diff-strategy.md` Phase 2.
Write three sections to the plan:
```
## Security files
## Arch files
## Docs files
```

## Step 4 — Fan-out: spawn three parallel lens threads (B1 FAN-OUT)

**Re-read session plan. (B8 ATTENTION ANCHOR)**

Spawn all three concurrently. Pass to each lens:
- The guideline content (read in Step 2)
- The PR title and body
- The diff for its assigned files (read per `assets/diff-strategy.md` Phase 3)
- The file manifest
- The finding schema from `assets/finding-schema.md`
- Instruction: emit JSON array only, no prose

### Security lens spawn brief (CAVEMAN_FULL, INTERNAL)

```
ROLE: security-lens. RESPOND JSON ONLY.
GUIDELINE: <security guideline content>
PR: title=<title>, body=<first 500 chars of body>
DIFF FILES: <security-bucket diffs>
FILE MANIFEST: <list>
SCHEMA: <content of assets/finding-schema.md>
OUTPUT: JSON array. Empty array if no findings. No prose.
```

### Architecture lens spawn brief (CAVEMAN_FULL, INTERNAL)

```
ROLE: arch-lens. RESPOND JSON ONLY.
GUIDELINE: <arch guideline content>
PR: title=<title>, body=<first 500 chars of body>
DIFF FILES: <arch-bucket diffs>
FILE MANIFEST: <list>
SCHEMA: <content of assets/finding-schema.md>
OUTPUT: JSON array. Empty array if no findings. No prose.
```

### Documentation lens spawn brief (CAVEMAN_FULL, INTERNAL)

```
ROLE: docs-lens. RESPOND JSON ONLY.
GUIDELINE: <docs guideline content>
PR: title=<title>, body=<first 500 chars of body>
DIFF FILES: <docs-bucket diffs>
FILE MANIFEST: <list>
SCHEMA: <content of assets/finding-schema.md>
OUTPUT: JSON array. Empty array if no findings. No prose.
```

## Step 5 — Collect findings into plan (fan-in)

Wait for all three spawns to complete. Write each result to the session plan:

```
## Security findings (raw)
<JSON from security lens>

## Architecture findings (raw)
<JSON from arch lens>

## Documentation findings (raw)
<JSON from docs lens>
```

Validate: each result is a valid JSON array. If a lens returned malformed
JSON or prose, re-run that lens once. If it fails again, write an INFO
finding for that dimension: "Lens returned no parseable findings."

## Step 6 — Synthesize verdict (B1 SYNTHESIZER)

**Re-read session plan. (B8 ATTENTION ANCHOR)**

Spawn the synthesizer with:
- All three findings arrays from the plan
- PR title and body
- `assets/verdict-template.md` (full content)

Synthesizer spawn brief (NORMAL, EXTERNAL — user-facing output):

```
You are pr-verdict-synthesizer.
SECURITY_FINDINGS: <JSON>
ARCH_FINDINGS: <JSON>
DOCS_FINDINGS: <JSON>
PR_TITLE_AND_BODY: <title + body>
VERDICT_TEMPLATE: <full content of assets/verdict-template.md>
Emit the final review report following the template EXACTLY.
```

## Step 7 — Post report to GitHub and echo to conversation (S7 write)

Validate the synthesizer output first:
- If it does not start with `## PR Guidelines Review` or lacks a `**Verdict:**`
  line: re-run the synthesizer once with a reminder to follow the template.

Once the report is valid, post it as a public comment on the PR (S7 tool bridge
— CONSEQUENTIAL SIDE EFFECT):

```bash
gh pr comment <PR_NUMBER> [--repo <REPO>] --body '<REPORT>'
```

Then echo the full report verbatim in the conversation so the user sees it
without opening GitHub.

---

## Hard rules

- **One comment per run.** Post exactly one `gh pr comment` at Step 7.
  Never call `gh pr review` (approve/request-changes API) and never auto-merge.
- **Never modify code.** Never run `git add`, `git commit`, or any file edit.
- **Guideline files are ground truth.** If the PR violates a guideline,
  report it regardless of apparent intent.
- **Verdict structure is non-negotiable.** The report MUST follow the
  template. The user depends on consistent structure for their workflow.
- **Diff-only scope.** Do not read files outside the diff unless a guideline
  explicitly requires cross-referencing a stable file (e.g. a schema file
  referenced by a migration diff).

## See also

- `panel-review` — pre-push staged-change review (architect + security, no verdict)
- `agents/security-lens.agent.md` — security lens persona
- `agents/arch-lens.agent.md` — architecture lens persona
- `agents/docs-lens.agent.md` — documentation lens persona
- `agents/pr-verdict-synthesizer.agent.md` — verdict synthesizer persona
