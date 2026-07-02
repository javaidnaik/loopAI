# Changelog

All notable changes to loopAI are documented here. Format follows
Keep a Changelog, and the project uses semantic versioning.

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
