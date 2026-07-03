---
description: Run a loop spec: maker + checker rounds with a human gate.
argument-hint: "<spec-slug>"
---

You are the **LOOP ENGINEER**. Run a loop spec to completion using a maker
phase and a checker phase each round. The two phases keep each other honest:
the maker does the work, the checker verifies it and never trusts it blindly.

Spec slug: $ARGUMENTS

## Setup

1. Read `.loops/specs/$ARGUMENTS.json`. If missing, list the specs in
   `.loops/specs/` and stop.
2. Read `.loops/CONTEXT.md` for repo grounding.
3. Create `.loops/state/$ARGUMENTS.STATE.md` with sections: Goal, Rules, Inputs,
   Autonomy, Round Log (empty), Verdict (PENDING). This file is the shared
   record both phases read and you append to.

## Round loop (repeat up to maxRounds)

For each round N:

### Maker phase
Write `.loops/.phase-lock.json` as `{"slug": "$ARGUMENTS", "phase": "maker",
"autonomy": "<the spec's autonomy>"}` before you start (on Claude Code this
arms a hook that blocks Write/Edit when autonomy is L1; on other tools it is
inert, just write it anyway). Produce or revise work toward the Goal. If the
Round Log has checker feedback from a previous round, address exactly those
items. Respect the autonomy level:
- **L1**: do NOT modify project files. Write the proposed change as a clear diff
  or full snippet into the Round Log instead.
- **L2 / L3**: you may edit files to implement the change.
Stay inside the file boundaries named in the Rules and Inputs. Keep changes
minimal and focused. Append the result under `### Round N - MAKER`.

### Checker phase
Overwrite `.loops/.phase-lock.json` with `"phase": "checker"` (same slug and
autonomy) before you switch roles, this phase never edits files at any
autonomy level, and the lock enforces that on Claude Code. Switch roles.
Become a strict, read-only verifier. Do NOT edit project files in this phase.
Check the maker output against EVERY rule plus the Goal. If tests or lint are
part of the rules, actually run them and report results. A rule that is
"mostly" met is a FAIL. Append under `### Round N - CHECKER`, first line either:
- `PASS` (optionally one short line on why), or
- `FAIL` plus a short bullet list naming exactly what to fix next round.

### Branch on the verdict
- If **PASS**:
  - If `humanGate` is true OR autonomy is not L3: show the user the final result
    and ask "Checker passed. Accept as final? (yes / keep going)". On accept, set
    Verdict to `PASS (round N)` and stop. Otherwise log the rejection and continue.
  - If autonomy is L3 and humanGate is false: accept automatically, set Verdict,
    stop.
- If **FAIL**: continue to the next round.

If maxRounds is hit with no accepted PASS, set Verdict to
`NO PASS after <maxRounds> rounds - escalated to human` and summarize what is
left for the user to decide.

Once the loop ends, whatever the outcome, delete `.loops/.phase-lock.json` if
it exists, so nothing stays locked after you are done.

Give the user a one-line status after each round. Never skip the checker phase,
and never let the maker phase edit files when autonomy is L1.
