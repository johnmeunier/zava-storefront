# Loop-state plan template (B4 PLAN MEMENTO)

Load trigger: read this file at Step 1 when writing the initial plan block,
or if you need a blank template mid-loop to reset state.

---

## Template

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
(empty — append one line per pass as you go)
```

---

## Per-pass log format

Append one line per pass to the "Per-pass log" section:

```
Pass <N>: checks <PASS|FAIL> | build <Y|N> | review <Y|N> | verdict <MERGE|REQUEST CHANGES|(none)> | deferred <count>
```

Example after two passes:

```
## Per-pass log
Pass 1: checks FAIL | build Y | review N | verdict (none) | deferred 0
Pass 2: checks PASS | build Y | review Y | verdict REQUEST CHANGES | deferred 1
```
