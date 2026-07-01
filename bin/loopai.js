#!/usr/bin/env node
// loopAI installer. Reads the canonical prompts in ../prompts and writes them
// into the format each tool expects. Same loop logic everywhere - only the
// wrapper envelope and the argument token change per tool.

import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import os from "os";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROMPTS = join(__dirname, "..", "prompts");

const COMMANDS = [
  { name: "init", desc: "Set up loopAI in this repo (new or existing). Safe - only creates .loops/, never edits code.", hint: "[optional note]" },
  { name: "grill", desc: "Interview me, then write a precise, safe loop spec into .loops/specs/.", hint: "[optional one-line idea]" },
  { name: "engineer", desc: "Run a loop spec: maker + checker rounds with a human gate.", hint: "<spec-slug>" },
  { name: "compass", desc: "Not sure which loop fits? Compass asks and points you to the right command.", hint: "[optional note]" },
  { name: "baton", desc: "Compact the current work into a handoff doc so another session can continue.", hint: "[optional focus]" },
  { name: "harvest", desc: "Turn a finished loop into a PRD or a set of grabbable issues.", hint: "[optional source]" },
  { name: "guard", desc: "Set up git guardrails that block dangerous commands during a loop.", hint: "[optional note]" },
];

const body = (name) => readFileSync(join(PROMPTS, `${name}.md`), "utf-8").trim();
const write = (path, text) => { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, text); console.log("  wrote", path); };

// --- per-tool adapters -----------------------------------------------------

function installClaude(cwd) {
  // Project commands in .claude/commands/loop/<name>.md  -> /loop:<name>
  for (const c of COMMANDS) {
    const text =
`---
description: ${c.desc}
argument-hint: "${c.hint}"
---

${body(c.name).replace(/\{\{ARGS\}\}/g, "$ARGUMENTS")}
`;
    write(join(cwd, ".claude", "commands", "loop", `${c.name}.md`), text);
  }
  return "Claude Code: /loop:init /loop:grill /loop:engineer <slug> /loop:compass /loop:baton /loop:harvest /loop:guard";
}

function installGemini(cwd) {
  // Project commands in .gemini/commands/loop/<name>.toml -> /loop:<name>
  for (const c of COMMANDS) {
    const prompt = body(c.name).replace(/\{\{ARGS\}\}/g, "{{args}}");
    const text =
`description = ${JSON.stringify(c.desc)}
prompt = """
${prompt}
"""
`;
    write(join(cwd, ".gemini", "commands", "loop", `${c.name}.toml`), text);
  }
  return "Gemini CLI: /loop:init /loop:grill /loop:engineer <slug> /loop:compass /loop:baton /loop:harvest /loop:guard";
}

function installCodex() {
  // Global, top-level only: ~/.codex/prompts/loop-<name>.md -> /loop-<name>
  const dir = join(os.homedir(), ".codex", "prompts");
  for (const c of COMMANDS) {
    const text = body(c.name).replace(/\{\{ARGS\}\}/g, "$ARGUMENTS") + "\n";
    write(join(dir, `loop-${c.name}.md`), text);
  }
  return "Codex CLI: /loop-init /loop-grill /loop-engineer <slug> /loop-compass /loop-baton /loop-harvest /loop-guard";
}

function installCursor(cwd) {
  // Project commands in .cursor/commands/loop-<name>.md -> /loop-<name>
  for (const c of COMMANDS) {
    const text =
`# ${c.desc}

${body(c.name).replace(/\{\{ARGS\}\}/g, "$ARGUMENTS")}
`;
    write(join(cwd, ".cursor", "commands", `loop-${c.name}.md`), text);
  }
  return "Cursor: /loop-init /loop-grill /loop-engineer <slug> /loop-compass /loop-baton /loop-harvest /loop-guard";
}

const TOOLS = { claude: installClaude, gemini: installGemini, codex: installCodex, cursor: installCursor };

// --- cli -------------------------------------------------------------------

function parseArgs(argv) {
  const out = { tool: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--tool" || argv[i] === "-t") out.tool = argv[++i];
    else if (argv[i] === "--help" || argv[i] === "-h") out.help = true;
  }
  return out;
}

function help() {
  console.log(`
loopAI installer - same loop logic, every tool

Usage:
  npx loopai install --tool <claude|gemini|codex|cursor|all>

Run it from the root of the project you want to add loops to.
Codex installs to ~/.codex/prompts (global); the others install into the
current project. After install, run the init command, then grill, then engineer.
`);
}

function main() {
  const [action, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  if (args.help || action === "help" || !action) return help();
  if (action !== "install") { console.error(`Unknown command: ${action}`); return help(); }
  if (!args.tool) { console.error("Missing --tool. Use claude, gemini, codex, cursor, or all."); process.exit(1); }

  const cwd = process.cwd();
  const targets = args.tool === "all" ? Object.keys(TOOLS) : [args.tool];
  const invalid = targets.filter((t) => !TOOLS[t]);
  if (invalid.length) { console.error(`Unknown tool(s): ${invalid.join(", ")}`); process.exit(1); }

  console.log(`Installing loopAI commands for: ${targets.join(", ")}\n`);
  const tips = targets.map((t) => TOOLS[t](cwd));
  console.log("\nDone. Invoke with:");
  tips.forEach((t) => console.log("  " + t));
  console.log("\nStart: run the init command, then grill to design a loop, then engineer <slug> to run it.");
}

main();
