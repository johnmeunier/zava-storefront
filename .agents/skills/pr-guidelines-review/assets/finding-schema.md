# Finding schema (inline asset)

Each lens thread emits a JSON array conforming to this schema.
The synthesizer reads these arrays from the review plan.

## Per-finding object

```json
{
  "id": "<dimension>-<N>",
  "dimension": "security | architecture | documentation",
  "severity": "BLOCKER | HIGH | MEDIUM | LOW | INFO",
  "title": "<short finding title, <= 60 chars>",
  "location": "<file:line or 'PR-wide' or 'PR description'>",
  "detail": "<what was found, <= 80 words>",
  "required_action": "<what must change, or 'none' for INFO>"
}
```

## Severity definitions

- **BLOCKER** — must be fixed before merge. Exploitable security flaw,
  broken auth, data-loss risk, hard constraint from the guideline file.
- **HIGH** — should be fixed before merge. Design flaw that creates
  maintenance debt or violates a MUST rule in the guideline.
- **MEDIUM** — should be addressed; merge may proceed with owner sign-off.
- **LOW** — nice-to-have improvement. SHOULD rule in the guideline.
- **INFO** — observation only, no action required.

## Empty result

If a dimension has no findings, emit:
```json
[]
```

## Emit discipline

- Output JSON ONLY. No prose before or after the array.
- `id` values must be unique within the array.
- `title` must name the specific issue, not the category.
- `detail` must cite the specific guideline rule violated.
- `required_action` for BLOCKER/HIGH must be a concrete directive.
