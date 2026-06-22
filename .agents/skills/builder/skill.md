---
name: builder
description: "Given a work item — a short feature brief or a set of review findings — implement the change as commits on a new branch and open (or update) a pull request on zava-storefront. Reads team guideline files so output already follows standards. Runs npm run lint and npm test before opening the PR; fixes reds before proceeding."
license: MIT
metadata:
  author: "Zava Engineering"
  source: "Zava platform team — storefront builder workflow"
---

# builder

Implement a scoped work item end-to-end: branch → code → tests → lint/test gate → PR. You read the team's guideline files first so every file you touch is standards-compliant from the first commit. Anything outside the work item's scope is noted in the PR description for a human instead of built.

## When to use this

- You have a **feature brief** ("add discount-code field to checkout") and want a ready-to-review PR.
- You have **review findings** from a prior PR and need to address them without touching unrelated code.
- The work is bounded enough to implement in one PR (≤ ~500 lines diff, one logical concern).

## When NOT to use this

- The brief is vague, has unresolved product questions, or spans multiple services. Ask for a sharper scope first.
- The change requires a database migration that hasn't been reviewed by the DBA team.
- It's a hotfix during an active incident — use `incident-to-pr` instead.

---

## Inputs

- **Required:** the work item. One of:
  - A short **feature brief** (1–5 sentences describing the desired behaviour, acceptance criteria optional).
  - A **set of review findings** — paste the comments verbatim or provide the PR URL.
- **Optional:** target branch to open the PR against (default: `main`).
- **Optional:** scope labels (`--label bug`, `--label enhancement`, etc.).

---

## Step-by-step procedure

### 0. Read the guidelines (always, before touching code)

Read these files in full before generating any code. They are non-negotiable constraints:

```
.github/instructions/secure-coding-base.instructions.md   ← secrets, input handling, authN/Z, crypto, deps, logging, errors
.github/instructions/docs-style-guide.instructions.md      ← docstrings, markdown voice, format by language
.github/instructions/ci-cd-golden-paths.instructions.md    ← CI/CD conventions, deployment gates, IaC standards
```

### 1. Parse and scope the work item

- Identify **what must change** (files, behaviours, acceptance criteria).
- Identify **what is explicitly out of scope** — record each item.
- If the work item is ambiguous, stop and ask one clarifying question before proceeding.

### 2. Create the branch

```
feat/<slug>          for new features
fix/<slug>           for bug fixes and review findings
chore/<slug>         for non-functional changes (deps, config)
```

Branch from `main` (or the target branch if specified). Never commit directly to `main`.

### 3. Implement the change

Rules:
- Touch only files in the work item's scope. Do not refactor passing code that is not related to the task.
- For every new public function, type, or module: add a docstring following `.github/instructions/docs-style-guide.instructions.md`.
- For every new HTTP handler: add authN + authZ (see `secure-coding-base.instructions.md` §3).
- For every new DB query: use parameterized queries — no string concatenation (see §2).
- For new dependencies: add a one-line justification comment in the PR description under **Dependencies**.
- Write or update the relevant unit/integration tests in `tests/`.

### 4. Commit structure

Use conventional commits. At minimum:

```
feat|fix|chore(<scope>): <imperative summary, ≤72 chars>

[optional body — what changed and why, not how]
```

Keep commits logically atomic (one concern per commit). Do not squash into a single "WIP" blob.

### 5. Run the quality gate

```bash
npm run lint
npm test
```

- If **lint fails**: fix every lint error before proceeding. Do not disable rules without a documented reason in a `// eslint-disable-next-line <rule> -- <reason>` comment.
- If **tests fail**: identify whether the failure is pre-existing (exists on `main`) or introduced by your change.
  - Pre-existing failure → document it in the PR description under **Pre-existing failures**, do not fix it (out of scope), continue.
  - New failure → fix it. If the fix expands scope materially, note it in **Out of scope** and open a follow-up issue instead.
- Re-run until both checks are green before opening the PR.

### 6. Open or update the PR

Use `gh pr create` (new) or `gh pr edit` (update). PR description must follow this template exactly:

```markdown
## Summary

<2–4 sentences: what the work item asked for, what changed, what didn't.>

## Work item

<paste the original brief or link to the review findings>

## Changes

- `<file>` — <one-line reason>
- ...

## Testing

- [ ] `npm run lint` green
- [ ] `npm test` green
- Test coverage: <new tests added / files covered>

## Dependencies

<list any new npm deps added, with one-line justification each — or "None">

## Out of scope

<everything from step 1 that was explicitly not built; link to follow-up issues if created>

## Pre-existing failures

<any test/lint failures that existed on main before this branch — or "None">

## Security checklist (from secure-coding-base.instructions.md)

- [ ] No new secrets in diff
- [ ] All new HTTP handlers have authN + authZ
- [ ] All new DB queries are parameterized
- [ ] Dependencies justified above
- [ ] Logs masked for PII
```

---

## Architecture diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│                         builder skill                                │
│                                                                      │
│   INPUT                                                              │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │  work item (feature brief │ review findings)                │   │
│   └──────────────────────────────────┬──────────────────────────┘   │
│                                      │                              │
│                                      ▼                              │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │  0. READ GUIDELINES                                          │  │
│   │     secure-coding-base  ·  docs-style-guide  ·  ci-cd       │  │
│   └──────────────────────────────┬───────────────────────────────┘  │
│                                  │                                  │
│                                  ▼                                  │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │  1. SCOPE ANALYSIS                                           │  │
│   │     what's in  ──►  task list                                │  │
│   │     what's out ──►  out-of-scope register                    │  │
│   └──────────────────────────────┬───────────────────────────────┘  │
│                                  │                                  │
│                                  ▼                                  │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │  2. BRANCH  feat|fix|chore/<slug>  (from main)               │  │
│   └──────────────────────────────┬───────────────────────────────┘  │
│                                  │                                  │
│                                  ▼                                  │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │  3. IMPLEMENT                                                │  │
│   │     code  ·  docstrings  ·  authN/Z  ·  param queries        │  │
│   │     new tests in tests/                                      │  │
│   └──────────────────────────────┬───────────────────────────────┘  │
│                                  │                                  │
│                                  ▼                                  │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │  4. COMMIT  (conventional commits, one concern each)         │  │
│   └──────────────────────────────┬───────────────────────────────┘  │
│                                  │                                  │
│                                  ▼                                  │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │  5. QUALITY GATE                                             │  │
│   │                                                              │  │
│   │   npm run lint ──► red? ──► fix lint errors ──► re-run       │  │
│   │        │                                                     │  │
│   │        ▼ green                                               │  │
│   │   npm test ────► red? ──► pre-existing? ──yes──► document    │  │
│   │        │                      │                             │  │
│   │        │                      no                            │  │
│   │        │                      │                             │  │
│   │        │                      ▼                             │  │
│   │        │              fix test ──► re-run                   │  │
│   │        ▼ green                                              │  │
│   │   ✅  gate passed                                            │  │
│   └──────────────────────────────┬───────────────────────────────┘  │
│                                  │                                  │
│                                  ▼                                  │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │  6. OPEN / UPDATE PR                                         │  │
│   │     gh pr create │ gh pr edit                                │  │
│   │     summary · changes · testing · out-of-scope · sec check   │  │
│   └──────────────────────────────────────────────────────────────┘  │
│                                                                      │
│   OUTPUT                                                             │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │  PR URL  +  out-of-scope list  +  any follow-up issue URLs   │  │
│   └──────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Guardrails

| Rule | Enforcement |
|---|---|
| Never commit to `main` | Always branch first |
| Never open a PR with a red gate | Fix or document pre-existing failures |
| Never expand scope silently | Everything out-of-scope goes in the PR description |
| Never commit secrets | `secure-coding-base.instructions.md` §1 applies |
| Never add a dep without justification | Note in PR description §Dependencies |
| Security checklist must be checked off | Required section in PR description |
