# Changelog

All notable changes to loopAI are documented here. Format follows
Keep a Changelog, and the project uses semantic versioning.

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
