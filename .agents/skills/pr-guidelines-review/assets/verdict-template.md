# Verdict template (inline asset)

The synthesizer MUST emit this exact structure. No deviation.
Section order is fixed. Do not reorder, merge, or omit sections.

---

## Template

```
## PR Guidelines Review

**Verdict:** MERGE | REQUEST CHANGES

**Rationale**
<2-4 sentences. State the deciding factor(s). Name dimensions that passed.
Name dimensions that had blockers/highs. If REQUEST CHANGES: name the
single most critical finding that drives the verdict. If MERGE: confirm
all three dimensions cleared or had only LOW/INFO findings.>

---

### Security findings
<ordered by severity BLOCKER -> HIGH -> MEDIUM -> LOW -> INFO>
<if empty: "No findings. Guideline review passed.">

| Severity | Location | Finding | Required action |
|---|---|---|---|
| BLOCKER/HIGH/… | file:line | title + brief detail | action or "—" |

---

### Architecture findings
<same structure>

---

### Documentation findings
<same structure>
```

---

## Verdict decision rule

Apply in order; first rule that matches determines the verdict:

1. Any BLOCKER in any dimension → **REQUEST CHANGES** (unconditional).
2. 2 or more HIGH findings across dimensions → **REQUEST CHANGES**.
3. 1 HIGH finding in security dimension → **REQUEST CHANGES**.
4. 1 HIGH finding in architecture or documentation dimension → judgment
   call; lean REQUEST CHANGES unless it is clearly an isolated nit.
5. Only MEDIUM/LOW/INFO → **MERGE** (note the items for the author).
6. Empty findings all dimensions → **MERGE** (clean pass).

The rationale MUST name the specific rule number that drove the verdict.
