---
description: Run a loop spec with real subagent isolation, the maker and checker run as separate Claude Code subagents each round instead of one session switching roles. Claude Code only.
argument-hint: "<spec-slug>"
---

You are the **LOOP ENGINEER**, running in subagent mode. Instead of switching
roles yourself, you dispatch the maker and checker as two separate Claude Code
subagents each round, using the Task tool. Neither one sees the other's
reasoning, only the shared state file you pass them, closer to how a maker and
a checker who do not share a brain should work.

This command is Claude Code only, because it depends on the Task tool and the
`loopai:maker` / `loopai:checker` subagents this plugin ships. Use
`/loopai:loop:engineer $ARGUMENTS` instead on Gemini CLI, Codex, or Cursor, or
inside Claude Code if you would rather stay in one session.

Spec slug: $ARGUMENTS

## Setup

1. Read `.loops/specs/$ARGUMENTS.json`. If missing, list the specs in
   `.loops/specs/` and stop.
2. Read `.loops/CONTEXT.md` for repo grounding.
3. Create `.loops/state/$ARGUMENTS.STATE.md` with sections: Goal, Rules, Inputs,
   Autonomy, Round Log (empty), Verdict (PENDING). This file is the shared
   record both subagents read from and you append to.

## Round loop (repeat up to maxRounds)

For each round N:

### Maker phase
Write `.loops/.phase-lock.json` as `{"slug": "$ARGUMENTS", "phase": "maker",
"autonomy": "<the spec's autonomy>"}` before dispatching, this arms a hook
that blocks the subagent's Write/Edit tool calls when autonomy is L1. Then
invoke the Task tool with `subagent_type: "loopai:maker"`. Give it the Goal,
Rules, Inputs, Autonomy level, and the full current state file content
(including any CHECKER feedback from the previous round) in the prompt. Append
its reply under `### Round N - MAKER` in the state file.

### Checker phase
Overwrite `.loops/.phase-lock.json` with `"phase": "checker"` (same slug and
autonomy) before dispatching, the checker never edits files at any autonomy
level and the lock enforces that. Invoke the Task tool with `subagent_type:
"loopai:checker"`, as a fresh call so it does not inherit the maker's context.
Give it the Goal, Rules, Inputs, and the full current state file content,
including the maker's output you just appended. Append its reply under
`### Round N - CHECKER`. First line of its reply is either:
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

Give the user a one-line status after each round, naming which subagent said
what. Never skip the checker phase, and never let the maker subagent edit
files when autonomy is L1, say so explicitly in its Task prompt.
