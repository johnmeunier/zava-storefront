# Diff strategy for large PRs (inline asset)

Load this asset before spawning lens threads. It defines how each
lens approaches a PR that may be too large to read in full.

## Phase 1 — orientation (parent skill, before spawning)

Run these tool calls to build the routing map. Results go into the
review plan so each lens can read them without re-running.

```bash
# PR metadata
gh pr view <PR_NUMBER> --json title,body,author,additions,deletions,files

# Changed file list (no diff content yet)
gh pr diff <PR_NUMBER> --name-only
```

Write to plan: `## File manifest` with the full list plus the
`additions` + `deletions` totals.

## Phase 2 — per-lens file assignment (parent skill)

Classify each changed file into lens relevance buckets:

**Security-relevant** (read by security-lens):
- Files matching: `**/auth*`, `**/crypto*`, `**/password*`, `**/token*`,
  `**/session*`, `**/middleware/*`, `**/api/*`, `**/routes/*`,
  `**/db*`, `**/sql*`, `**/query*`, `**/.env*`, `**/config/*`,
  `**/deps*`, `package*.json`, `requirements*.txt`, `go.sum`, `Gemfile.lock`

**Architecture-relevant** (read by arch-lens):
- Files matching: `src/**/*.ts`, `src/**/*.js`, `**/*.go`, `**/*.java`,
  `**/*.py` (core logic only), `**/schema*`, `**/model*`, `**/service*`,
  `**/controller*`, `**/domain*`, any new files, any files with > 50 added lines

**Documentation-relevant** (read by docs-lens):
- Files matching: `**/*.md`, `**/*.mdx`, `docs/**`, `**/README*`,
  `**/*.py` (docstrings), `**/*.ts` (JSDoc), `**/*.tsx`, `**/*.java` (Javadoc),
  `CHANGELOG*`, `**/*.go` (godoc comments)

**Unclassified files** — skip unless a lens explicitly needs them.

A file may appear in multiple buckets; each lens reads it independently.

## Phase 3 — per-lens diff budget

Each lens reads up to **15 files** from its assigned bucket.
If the bucket has more than 15 files:
1. Sort by: new files first, then by additions count descending.
2. Take the top 15.
3. Note in the findings: "N files skipped due to budget; review
   file list manually."

Read each assigned file's diff with:
```bash
gh pr diff <PR_NUMBER> -- <file_path>
```

## Phase 4 — PR description read (all lenses)

All lenses ALSO read the PR title and description:
```bash
gh pr view <PR_NUMBER> --json title,body
```

The description is the primary source for documentation-lens.
Security-lens and arch-lens check description coherence as a secondary concern.

## Hard stops

- If `additions + deletions > 10000` total: add `INFO` finding in ALL
  dimensions: "PR is very large (>10K lines changed). Review coverage
  may be incomplete. Consider splitting the PR."
- Never loop; never paginate beyond the 15-file budget per lens.
