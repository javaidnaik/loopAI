#!/usr/bin/env node
// loopAI installer. Reads the canonical prompts in ../prompts and writes them
// into the format each tool expects. Same loop logic everywhere - only the
// wrapper envelope and the argument token change per tool.

import { readFileSync, mkdirSync, writeFileSync } from "fs";
import * as fsAll from "fs";
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

const PRESETS_DIR = join(__dirname, "..", "presets");

function parseArgs(argv) {
  const out = { tool: null, agent: "claude", schedule: "0 6 * * 1", _: [] };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--tool" || argv[i] === "-t") out.tool = argv[++i];
    else if (argv[i] === "--agent") out.agent = argv[++i];
    else if (argv[i] === "--schedule") out.schedule = argv[++i];
    else if (argv[i] === "--help" || argv[i] === "-h") out.help = true;
    else out._.push(argv[i]);
  }
  return out;
}

function help() {
  console.log(`
loopAI - loop engineering for AI coding agents

Usage:
  loopai install --tool <claude|gemini|codex|cursor|all>   install the commands
  loopai spec <name>        drop a preset spec into .loops/specs/ (60s to value)
  loopai spec               list available presets
  loopai list               show your specs and each one's last verdict
  loopai doctor             check this repo's loop-readiness
  loopai cron <slug>        emit a GitHub Action that runs a spec on a schedule
         [--agent claude|gemini] [--schedule "0 6 * * 1"]

Presets: test-first, bug-hunt, dep-bump, readme-sync, pr-review
Run everything from the root of the project you are adding loops to.
`);
}

function cmdSpec(args) {
  const { readdirSync, existsSync, copyFileSync } = fsAll;
  const names = readdirSync(PRESETS_DIR).filter((f) => f.endsWith(".json")).map((f) => f.replace(".json", ""));
  const name = args._[0];
  if (!name) {
    console.log("Available presets:\n" + names.map((n) => "  " + n).join("\n"));
    console.log("\nUse: loopai spec <name>");
    return;
  }
  if (!names.includes(name)) { console.error(`Unknown preset: ${name}. Available: ${names.join(", ")}`); process.exit(1); }
  const dest = join(process.cwd(), ".loops", "specs", `${name}.json`);
  if (existsSync(dest)) { console.error(`Refusing to overwrite existing spec: .loops/specs/${name}.json`); process.exit(1); }
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(join(PRESETS_DIR, `${name}.json`), dest);
  console.log(`Spec written: .loops/specs/${name}.json`);
  console.log(`Run it with your engineer command (e.g. /loop:engineer ${name}).`);
  console.log(`Tip: open the spec and adjust rules/inputs to your repo first.`);
}

function cmdList() {
  const { readdirSync, existsSync, readFileSync: rf } = fsAll;
  const specsDir = join(process.cwd(), ".loops", "specs");
  if (!existsSync(specsDir)) { console.log("No .loops/specs/ here. Run the init command first, or `loopai spec <name>`."); return; }
  const specs = readdirSync(specsDir).filter((f) => f.endsWith(".json"));
  if (!specs.length) { console.log("No specs yet. Try `loopai spec readme-sync` for a safe first loop."); return; }
  console.log("Specs in .loops/specs/:\n");
  for (const f of specs) {
    const slug = f.replace(".json", "");
    let goal = "";
    try { goal = JSON.parse(rf(join(specsDir, f), "utf-8")).goal || ""; } catch { goal = "(invalid JSON)"; }
    const statePath = join(process.cwd(), ".loops", "state", `${slug}.STATE.md`);
    let verdict = "never run";
    if (existsSync(statePath)) {
      const m = rf(statePath, "utf-8").match(/## Verdict\n([^\n]*)/);
      verdict = m && m[1].trim() ? m[1].trim() : "PENDING";
    }
    console.log(`  ${slug}\n    goal:    ${goal.slice(0, 76)}\n    verdict: ${verdict}\n`);
  }
}

function cmdDoctor() {
  const { existsSync, readdirSync, readFileSync: rf } = fsAll;
  const cwd = process.cwd();
  let score = 0, max = 0;
  const check = (ok, label, fix) => { max++; if (ok) { score++; console.log(`  [ok] ${label}`); } else { console.log(`  [--] ${label}${fix ? `  ->  ${fix}` : ""}`); } };
  console.log("loopAI doctor\n");
  check(existsSync(join(cwd, ".loops")), ".loops/ exists", "run the init command");
  check(existsSync(join(cwd, ".loops", "CONTEXT.md")), "CONTEXT.md grounding file exists", "run the init command");
  const specsDir = join(cwd, ".loops", "specs");
  const specs = existsSync(specsDir) ? readdirSync(specsDir).filter((f) => f.endsWith(".json")) : [];
  check(specs.length > 0, `at least one spec (${specs.length} found)`, "loopai spec readme-sync");
  let allParse = specs.length > 0;
  for (const f of specs) { try { JSON.parse(rf(join(specsDir, f), "utf-8")); } catch { allParse = false; console.log(`       broken JSON: ${f}`); } }
  check(allParse, "all specs parse as JSON", "fix the file(s) named above");
  let testCmd = false;
  try { const p = JSON.parse(rf(join(cwd, "package.json"), "utf-8")); testCmd = Boolean(p.scripts && p.scripts.test && !/no test specified/.test(p.scripts.test)); } catch { /* not a node repo */ }
  check(testCmd, "a real test command exists (checker can verify)", "add a test script so the checker has teeth");
  const gi = existsSync(join(cwd, ".gitignore")) ? rf(join(cwd, ".gitignore"), "utf-8") : "";
  check(gi.includes(".loops/state"), ".loops/state/ is gitignored", "add .loops/state/ to .gitignore");
  console.log(`\nScore: ${score}/${max}. ${score === max ? "Loop-ready." : "Fix the items above and run doctor again."}`);
}

function cmdCron(args) {
  const slug = args._[0];
  if (!slug) { console.error("Usage: loopai cron <spec-slug> [--agent claude|gemini] [--schedule \"0 6 * * 1\"]"); process.exit(1); }
  const agent = args.agent;
  if (!["claude", "gemini"].includes(agent)) { console.error("--agent must be claude or gemini (headless-capable CLIs)."); process.exit(1); }
  const engineerPrompt = body("engineer").replace(/\{\{ARGS\}\}/g, slug)
    + "\n\nHEADLESS MODE: there is no human available. Treat autonomy as L1 report-only regardless of the spec. Do NOT edit files. Write your full report into the state file and print it.";
  const run = agent === "claude"
    ? `claude -p "$PROMPT" --output-format text`
    : `gemini -p "$PROMPT"`;
  const yml = `name: loopAI ${slug}
on:
  schedule:
    - cron: "${args.schedule}"
  workflow_dispatch: {}
permissions:
  contents: read
  issues: write
jobs:
  loop:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run loop (report-only)
        env:
          PROMPT: |
${engineerPrompt.split("\n").map((l) => "            " + l).join("\n")}
        run: |
          # Requires the ${agent} CLI to be available and authenticated on the runner.
          # Add your auth secret per that CLI's headless docs before enabling.
          ${run} | tee loop-report.txt
      - name: Open report as issue
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = fs.readFileSync('loop-report.txt', 'utf8').slice(0, 60000);
            await github.rest.issues.create({
              owner: context.repo.owner,
              repo: context.repo.repo,
              title: 'loopAI ${slug} report ' + new Date().toISOString().slice(0,10),
              body: report
            });
`;
  const dest = join(process.cwd(), ".github", "workflows", `loopai-${slug}.yml`);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, yml);
  console.log(`Wrote .github/workflows/loopai-${slug}.yml`);
  console.log(`Schedule: ${args.schedule} (cron), agent: ${agent}, forced L1 report-only.`);
  console.log(`Before enabling: set up auth per docs/HEADLESS.md (secret + CLI install line).`);
  console.log(`Each run opens a GitHub issue with the loop's report.`);
}

function main() {
  const [action, ...rest] = process.argv.slice(2);
  const args = parseArgs(rest);
  if (args.help || action === "help" || !action) return help();

  if (action === "spec") return cmdSpec(args);
  if (action === "list") return cmdList();
  if (action === "doctor") return cmdDoctor();
  if (action === "cron") return cmdCron(args);

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
  console.log("Or skip grilling: `loopai spec readme-sync` drops a safe preset you can run now.");
}

main();
