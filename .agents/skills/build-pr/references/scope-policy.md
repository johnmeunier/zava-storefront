# Scope policy — build-pr

Load this file when you encounter an edge case not covered by the
quick-reference table in SKILL.md.

## What counts as "in scope"

A change is **in scope** when ALL of the following hold:

1. The work item explicitly requests it (not merely implies it).
2. It stays within the application layer (TypeScript/React/Next.js/API routes,
   tests, documentation). No IaC, no CI/CD pipeline changes, no infrastructure.
3. It touches fewer than ~5 files and does not require a design decision
   that is not already resolved in the work item.
4. It does not require authority this agent does not hold (secrets rotation,
   database schema migrations in production, DNS changes, etc.).

## What is always out of scope

Regardless of what the work item says:

| Category | Always out of scope | Reason |
|---|---|---|
| Infrastructure | Terraform, Bicep, Dockerfile changes, k8s manifests | ci-cd-golden-paths constraint |
| CI/CD pipeline | `.github/workflows/` changes beyond what the work item explicitly targets | ci-cd-golden-paths constraint |
| Cross-repo changes | Any file outside the zava-storefront repo | authority boundary |
| Secrets | Rotating, creating, or deleting credentials | secure-coding-base constraint |
| Production DB migrations | Running or modifying production migration scripts | irreversible; requires human authority |
| Architectural decisions | "Should we use Redis or Postgres for caching?" | requires human decision |

## Handling ambiguity

If the work item is genuinely ambiguous (could reasonably mean two different
implementations), **ask before implementing**. Phrase the question as:

> "The work item could mean [interpretation A] or [interpretation B].
> Which do you want? I'll implement exactly that and note the other in
> the PR description."

Do not guess. Guessing wrong costs more than asking.

## When guideline conflicts arise

If a security or CI/CD guideline constraint directly prevents implementing a
part of the work item:

1. Implement as much as is allowed by the guideline.
2. In the PR description, under "⚠️ Guideline overrides", explain:
   - What the work item asked for.
   - Which guideline prevented it.
   - What was implemented instead.
   - What a human would need to do to satisfy the full request (e.g.,
     get a security exemption, update the guideline, restructure the feature).

## Retry budget details

The verify gate (Stage 3) allows **≤ 3 fix attempts**. The budget counts
across both lint and test failures combined — not per check.

| Attempt | Action |
|---|---|
| 1 | Diagnose, fix, commit, re-run both checks |
| 2 | Same; note what the first fix missed |
| 3 | Same; note what the second fix missed |
| Exhausted | Abort; report full output and all fix attempts; ask for guidance |

If you are 2 attempts in and the root cause is an existing test that the
work item's change genuinely breaks (i.e., the test was testing behaviour
you were asked to change), escalate to the user immediately rather than
patching the test without their input. Patching tests to make them pass is
not fixing a failure — it is deleting evidence.
