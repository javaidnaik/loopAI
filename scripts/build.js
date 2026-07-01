#!/usr/bin/env node
// Builds native, installable packages for every supported tool from ONE source:
// the prompts in ../prompts. Output goes to dist/<tool>/. The npm installer
// (bin/loopai.js) stays the universal path; these are for native install.
//
//   dist/claude/  -> Claude Code plugin       (/plugin marketplace add ... )
//   dist/gemini/  -> Gemini CLI extension      (gemini extensions install ...)
//   dist/codex/   -> Codex prompt bundle        (copy into ~/.codex/prompts)
//   dist/cursor/  -> Cursor command bundle       (drop into a repo's .cursor/)
//
// Run: npm run build

import { readFileSync, writeFileSync, mkdirSync, rmSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PROMPTS = join(ROOT, "prompts");
const DIST = join(ROOT, "dist");
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));

// Keep in step with COMMANDS in bin/loopai.js.
const COMMANDS = [
  { name: "init", desc: "Set up loopAI in this repo (new or existing). Safe - only creates .loops/, never edits code.", hint: "[optional note]" },
  { name: "grill", desc: "Interview me, then write a precise, safe loop spec into .loops/specs/.", hint: "[optional one-line idea]" },
  { name: "engineer", desc: "Run a loop spec: maker + checker rounds with a human gate.", hint: "<spec-slug>" },
  { name: "compass", desc: "Not sure which loop fits? Compass asks and points you to the right command.", hint: "[optional note]" },
  { name: "baton", desc: "Compact the current work into a handoff doc so another session can continue.", hint: "[optional focus]" },
  { name: "harvest", desc: "Turn a finished loop into a PRD or a set of grabbable issues.", hint: "[optional source]" },
  { name: "guard", desc: "Set up git guardrails that block dangerous commands during a loop.", hint: "[optional note]" },
];

const raw = (name) => readFileSync(join(PROMPTS, `${name}.md`), "utf-8").trim();
const argify = (text, token) => text.replace(/\{\{ARGS\}\}/g, token);
const write = (p, t) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, t); };

rmSync(DIST, { recursive: true, force: true });
// Note: Claude plugin is written to the repo root (committed). The others go to
// dist/ (gitignored) for optional native distribution in separate repos.

// --- Claude Code plugin (committed at repo root, single-repo model) --------
function buildClaude() {
  const out = ROOT; // committed alongside prompts/, like mattpocock/skills
  write(join(out, ".claude-plugin", "plugin.json"), JSON.stringify({
    name: "loopai", version: pkg.version, description: pkg.description,
    author: { name: "Javaid Naik" }, homepage: pkg.homepage, license: "MIT", keywords: pkg.keywords,
  }, null, 2) + "\n");
  write(join(out, ".claude-plugin", "marketplace.json"), JSON.stringify({
    name: "javaid-loops", owner: { name: "Javaid Naik" },
    plugins: [{ name: "loopai", source: "./", description: pkg.description }],
  }, null, 2) + "\n");
  for (const c of COMMANDS) {
    write(join(out, "commands", "loop", `${c.name}.md`),
`---
description: ${c.desc}
argument-hint: "${c.hint}"
---

${argify(raw(c.name), "$ARGUMENTS")}
`);
  }
  return "Claude Code (native, this repo): /plugin marketplace add javaidnaik/loopAI, then /plugin install loopai@javaid-loops. Commands: /loop:<name>";
}

// --- Gemini CLI extension --------------------------------------------------
function buildGemini() {
  const out = join(DIST, "gemini");
  write(join(out, "gemini-extension.json"), JSON.stringify({
    name: "loopai", version: pkg.version, description: pkg.description,
  }, null, 2) + "\n");
  for (const c of COMMANDS) {
    const prompt = argify(raw(c.name), "{{args}}");
    write(join(out, "commands", "loop", `${c.name}.toml`),
`description = ${JSON.stringify(c.desc)}
prompt = """
${prompt}
"""
`);
  }
  // gallery discovery hint
  write(join(out, "README.md"),
`# loopAI (Gemini CLI extension)

Install:
\`\`\`
gemini extensions install <this-repo-url>
\`\`\`
Commands: /loop:init /loop:grill /loop:engineer <slug> /loop:compass /loop:baton /loop:harvest /loop:guard

To list in the Gemini extension gallery, add the GitHub topic \`gemini-cli-extension\`
to the repo that hosts this folder at its root.
`);
  return "Gemini CLI: push dist/gemini to a repo (manifest at root), then gemini extensions install <repo>. Commands: /loop:<name>";
}

// --- Codex prompt bundle ---------------------------------------------------
function buildCodex() {
  const out = join(DIST, "codex");
  for (const c of COMMANDS) {
    write(join(out, "prompts", `loop-${c.name}.md`), argify(raw(c.name), "$ARGUMENTS") + "\n");
  }
  write(join(out, "INSTALL.md"),
`# loopAI (Codex CLI)

Codex custom prompts are global and live in \`~/.codex/prompts\` (top-level only).

Install with the npm tool:
\`\`\`
npm install -g @javaidnaik/loopai && loopai install --tool codex
\`\`\`

Or copy the files in \`prompts/\` into \`~/.codex/prompts\` yourself.
Commands: /loop-init /loop-grill /loop-engineer <slug> /loop-compass /loop-baton /loop-harvest /loop-guard
`);
  return "Codex CLI: loopai install --tool codex (installs to ~/.codex/prompts). Commands: /loop-<name>";
}

// --- Cursor command bundle -------------------------------------------------
function buildCursor() {
  const out = join(DIST, "cursor");
  for (const c of COMMANDS) {
    write(join(out, ".cursor", "commands", `loop-${c.name}.md`),
`# ${c.desc}

${argify(raw(c.name), "$ARGUMENTS")}
`);
  }
  write(join(out, "INSTALL.md"),
`# loopAI (Cursor)

Cursor commands are per-project files under \`.cursor/commands\`.

Install with the npm tool (recommended):
\`\`\`
npm install -g @javaidnaik/loopai && loopai install --tool cursor
\`\`\`

Or copy the \`.cursor/commands\` folder here into your project root.
Commands: /loop-init /loop-grill /loop-engineer <slug> /loop-compass /loop-baton /loop-harvest /loop-guard
`);
  return "Cursor: loopai install --tool cursor (writes .cursor/commands). Commands: /loop-<name>";
}

const tips = [buildClaude(), buildGemini(), buildCodex(), buildCursor()];
console.log(`Built native packages in dist/ from prompts/ (v${pkg.version}):\n`);
tips.forEach((t) => console.log("  - " + t));
console.log("\nThe npm installer stays the universal one-liner: loopai install --tool <tool|all>.");
