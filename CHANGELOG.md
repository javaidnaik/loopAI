# Changelog

All notable changes to loopAI are documented here. Format follows
Keep a Changelog, and the project uses semantic versioning.

## [0.6.0] - 2026-07-04

### Added
- Cross-model checking in `loopai run`: `--maker`/`--checker` flags put the
  maker and checker on different models (e.g. `--maker claude --checker
  gemini`), so the checker is never marking its own homework even at the CLI
  level. A spec can also pin its own pairing with `"maker"`/`"checker"` fields
  in its JSON. Precedence: explicit flag > spec field > `--agent`.
- `loopai stats` now breaks out pass rate per maker/checker pairing once a
  loop has run with more than one, so you can see whether a stricter checker
  model actually catches more real failures.
- `loopai doctor` validates any `maker`/`checker` fields in your specs.
- `agents/maker.md` and `agents/checker.md`: real Claude Code subagents
  (`loopai:maker`, `loopai:checker`) with their own tool access and their own
  context window, instead of one session role-switching in place.
- `/loopai:loop:engineer-agents <slug>`: Claude Code only command that runs
  the same maker/checker round loop as `engineer`, but dispatches each phase
  to the new subagents via the Task tool for genuine isolation. `engineer`
  itself is unchanged and stays portable across Claude Code, Gemini CLI,
  Codex, and Cursor.

## [0.5.0] - 2026-07-02

### Added
- `loopai run <slug>`: run a loop locally, right in the terminal, via the
  Claude or Gemini CLI in headless mode. Streams maker/checker rounds, pauses
  at the human gate, writes the full round log to `.loops/state/`, and records
  the outcome. L1 specs instruct the maker to propose only, never edit.
- `loopai stats`: pass rates, average rounds, and last-run date per loop, read
  from `.loops/history.jsonl`. Flags loops with 3+ runs at 100% pass as
  candidates for more autonomy. Every `run` appends to the history.
- `loopai upgrade`: refreshes installed command files after an npm update.
  `install` now records which tools were installed in `.loops/tools.json` so
  `upgrade` knows what to refresh without asking.

## [0.4.0] - 2026-07-01

### Added
- `loopai spec <name>`: preset spec library. Five proven loops ship with the
  CLI (test-first, bug-hunt, dep-bump, readme-sync, pr-review). Value in 60
  seconds, no grilling needed.
- `loopai doctor`: loop-readiness check for the current repo (setup, spec
  validity, test command, gitignore hygiene) with a score and fixes.
- `loopai list`: shows every spec with its last verdict.
- `loopai cron <slug>`: emits a GitHub Action that runs a spec on a schedule
  (Claude or Gemini headless) and opens the report as an issue. Scheduled runs
  are forced to L1 report-only.
- `examples/`: three recorded runs with full maker/checker round logs.
- `docs/HEADLESS.md`: verified headless auth setup for scheduled loops, covering
  Claude (setup-token OAuth or API key) and Gemini (AI Studio key, Vertex/ADC),
  with a sanity checklist and cost notes. The cron command and README link to it.

## [0.3.0] - 2026-06-30

### Added
- Four new commands, installed across all tools:
  - `compass` - routes you to the right loop when you are unsure.
  - `baton` - compacts current work into a handoff doc for another session.
  - `harvest` - turns a finished loop into a PRD or grabbable issues.
  - `guard` - sets up git guardrails that block dangerous commands.
- `npm run build` generates native install packages for every tool
  (Claude Code plugin, Gemini CLI extension, Codex prompt bundle, Cursor command
  bundle) into `dist/`, all from the same `prompts/`, so logic never drifts.

### Credits
- Loop patterns (grilling, handoff, PRD/issue output, git guardrails) adapted
  and generalized from mattpocock/skills (MIT), reworked as portable loopAI
  commands that run identically across Claude Code, Gemini CLI, Codex, and Cursor.

## [0.1.1] - 2026-06-30

### Changed
- Documented global install as the primary path
  (`npm install -g @javaidnaik/loopai` then `loopai install --tool <tool>`).
  The scoped `npx` form does not resolve the bin reliably on Windows.

## [0.1.0] - 2026-06-30

### Added
- `loopai install --tool <claude|gemini|codex|cursor|all>` installer.
- Canonical loop prompts in `prompts/` (init, grill, engineer) shared across
  every tool so the loop logic is identical no matter where it runs.
- Per-tool adapters and maker/checker phases with a human gate and L1/L2/L3
  autonomy levels.
