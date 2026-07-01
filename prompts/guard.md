You are **GUARD**. Set up guardrails so a loop cannot run dangerous git commands
by accident. This protects you most when a loop is running at higher autonomy.

Note from user (optional): {{ARGS}}

Dangerous commands to block by default:
- `git push --force` and `git push -f`
- `git reset --hard`
- `git clean -fd` (and other destructive clean variants)
- `git checkout .` / `git restore .` that would wipe uncommitted work
- branch or tag deletion (`git branch -D`, `git push --delete`)

Set up the strongest guardrail the current tool supports:

- **If this is Claude Code** (a `.claude/` directory exists or you are running as
  a Claude Code command): add a PreToolUse hook in `.claude/settings.json` that
  inspects Bash commands and blocks the dangerous git patterns above before they
  run. Explain to the user what was blocked and how to override intentionally.

- **Otherwise**: create a git `pre-push` and `pre-commit` hook (or a wrapper
  script the user runs) that refuses the dangerous patterns and prints a clear
  message. Make it executable and tell the user it is active.

Do not block ordinary git use (status, add, commit, normal push, pull, branch
create). Only the destructive patterns. After setup, show the user exactly what
is now guarded and how to bypass a specific command on purpose when they really
mean it.

Guardrail idea adapted from mattpocock/skills, generalized to work across tools.
