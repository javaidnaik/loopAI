#!/usr/bin/env node
// PreToolUse hook: enforces a loopAI round's phase lock against Write, Edit,
// and NotebookEdit. Reads .loops/.phase-lock.json, written by the maker/checker
// orchestrator (prompts/engineer.md, commands/loop/engineer-agents.md, or
// bin/loopai.js's `run` command) before each phase.
//
// Fails open on every ambiguous case (no lock, unreadable lock, stale lock,
// unresolvable path): this is a safety rail against a maker that forgets its
// own instructions mid-round, not an adversarial sandbox, and a permanently
// stuck lock from a crashed session would be worse than the gap it closes.

import { existsSync, readFileSync, statSync } from "fs";
import { join, resolve, sep } from "path";

const STALE_MS = 20 * 60 * 1000; // a lock older than this is assumed abandoned

// Node can truncate a pending stdout write if process.exit() is called right
// after it, since the write to a piped stdout is not always synchronous.
// Setting exitCode and letting the process end naturally avoids that.

function allow() {
  process.exitCode = 0;
}

function deny(reason) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  }));
  process.exitCode = 0;
}

let raw = "";
process.stdin.on("data", (d) => { raw += d; });
process.stdin.on("end", () => {
  let data;
  try { data = JSON.parse(raw); } catch { return allow(); }

  const toolName = data.tool_name || "";
  if (!["Write", "Edit", "NotebookEdit"].includes(toolName)) return allow();

  const cwd = data.cwd || process.cwd();
  const loopsDir = resolve(join(cwd, ".loops")) + sep;
  const lockPath = join(cwd, ".loops", ".phase-lock.json");

  // loopAI's own bookkeeping (state files, specs, the lock itself) is always
  // writable, at any phase, by the trusted orchestrator managing the round.
  const input = data.tool_input || {};
  const targetPath = input.file_path || input.notebook_path || "";
  if (targetPath && resolve(targetPath).toLowerCase().startsWith(loopsDir.toLowerCase())) return allow();

  if (!existsSync(lockPath)) return allow();

  let lock;
  try { lock = JSON.parse(readFileSync(lockPath, "utf-8")); } catch { return allow(); }

  let ageMs;
  try { ageMs = Date.now() - statSync(lockPath).mtimeMs; } catch { return allow(); }
  if (!Number.isFinite(ageMs) || ageMs > STALE_MS) return allow();

  if (lock.phase === "checker") {
    return deny(`loopAI: blocked, the checker phase of spec "${lock.slug}" never edits files, at any autonomy level. Report this as a finding instead.`);
  }
  if (lock.phase === "maker" && lock.autonomy === "L1") {
    return deny(`loopAI: blocked, spec "${lock.slug}" is L1 (report-only). The maker proposes changes as a diff or snippet, it does not edit files.`);
  }
  return allow();
});
