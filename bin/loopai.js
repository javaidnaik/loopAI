#!/usr/bin/env node
// loopAI installer. Reads the canonical prompts in ../prompts and writes them
// into the format each tool expects. Same loop logic everywhere - only the
// wrapper envelope and the argument token change per tool.

import { readFileSync, mkdirSync, writeFileSync, appendFileSync, existsSync } from "fs";
import { spawnSync } from "child_process";
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
  loopai run <slug>         run a loop right here via claude/gemini headless
         [--agent claude|gemini]
  loopai stats              pass rates and avg rounds per loop, from history
  loopai upgrade            refresh installed command files after an npm update
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

// --- run: execute a loop locally via the agent CLI ---------------------------

function callAgent(agent, instruction, stateBlob) {
  // Prompt goes via stdin to dodge OS arg-length limits; the short instruction
  // rides as the -p arg. Override the binary with LOOPAI_AGENT_BIN for testing.
  const bin = process.env.LOOPAI_AGENT_BIN || agent;
  const cliArgs = agent === "claude"
    ? ["-p", instruction, "--output-format", "text"]
    : ["-p", instruction];
  const res = spawnSync(bin, cliArgs, {
    input: stateBlob,
    encoding: "utf-8",
    maxBuffer: 32 * 1024 * 1024,
    shell: process.platform === "win32",
  });
  if (res.error) throw new Error(`Could not run '${bin}': ${res.error.message}. Is the ${agent} CLI installed and on PATH?`);
  if (res.status !== 0) throw new Error(`${agent} exited ${res.status}: ${(res.stderr || "").slice(0, 500)}`);
  return (res.stdout || "").trim();
}

function askLine(q) {
  return new Promise((resolve) => {
    process.stdout.write(q);
    process.stdin.resume();
    process.stdin.once("data", (d) => { process.stdin.pause(); resolve(String(d).trim().toLowerCase()); });
  });
}

function recordHistory(cwd, entry) {
  const p = join(cwd, ".loops", "history.jsonl");
  mkdirSync(dirname(p), { recursive: true });
  appendFileSync(p, JSON.stringify(entry) + "\n");
}

async function cmdRun(args) {
  const slug = args._[0];
  if (!slug) { console.error("Usage: loopai run <spec-slug> [--agent claude|gemini]"); process.exit(1); }
  const agent = args.agent;
  if (!["claude", "gemini"].includes(agent)) { console.error("--agent must be claude or gemini."); process.exit(1); }
  const cwd = process.cwd();
  const specPath = join(cwd, ".loops", "specs", `${slug}.json`);
  if (!existsSync(specPath)) { console.error(`No spec at .loops/specs/${slug}.json. Try 'loopai list' or 'loopai spec'.`); process.exit(1); }
  const spec = JSON.parse(readFileSync(specPath, "utf-8"));
  const ctxPath = join(cwd, ".loops", "CONTEXT.md");
  const context = existsSync(ctxPath) ? readFileSync(ctxPath, "utf-8") : "(no CONTEXT.md - agents work from the spec alone)";

  const statePath = join(cwd, ".loops", "state", `${slug}.STATE.md`);
  mkdirSync(dirname(statePath), { recursive: true });
  let state = `# STATE - ${spec.goal}\n\n## Goal\n${spec.goal}\n\n## Rules\n${(spec.rules || []).map((r) => `- ${r}`).join("\n")}\n\n## Inputs\n${(spec.inputs || []).map((i) => `- ${i}`).join("\n")}\n\n## Autonomy\n${spec.autonomy} | humanGate: ${spec.humanGate}\n\n## Round Log\n\n## Verdict\nPENDING\n`;
  const saveState = () => writeFileSync(statePath, state);
  const log = (t) => { state = state.replace("## Verdict", `${t}\n\n## Verdict`); saveState(); };
  const setVerdict = (v) => { state = state.replace(/## Verdict\n[\s\S]*$/, `## Verdict\n${v}\n`); saveState(); };
  saveState();

  const l1Note = spec.autonomy === "L1"
    ? "\nAUTONOMY L1: do NOT modify any project file. Write your proposed change (diff or snippet) as your reply instead."
    : "";
  const maxRounds = spec.maxRounds || 4;
  console.log(`Running '${slug}' with ${agent} (${spec.autonomy}, gate: ${spec.humanGate}, max ${maxRounds} rounds)\n`);

  let finalVerdict = `NO PASS after ${maxRounds} rounds - escalated to human`;
  let roundsUsed = maxRounds;
  for (let round = 1; round <= maxRounds; round++) {
    console.log(`===== ROUND ${round} =====`);
    const blob = `REPO CONTEXT:\n${context}\n\nSHARED STATE:\n${state}`;

    const draft = callAgent(agent,
      `You are the MAKER in a maker/checker loop. Produce or revise work toward the Goal in the shared state provided on stdin. If the Round Log has CHECKER fixes, address exactly those. Stay inside the Rules and Inputs. Reply with only your output, no preamble.${l1Note}`,
      blob);
    console.log(`\nMAKER:\n${draft.slice(0, 2000)}${draft.length > 2000 ? "\n...(truncated in console, full text in STATE)" : ""}\n`);
    log(`### Round ${round} - MAKER\n${draft}\n`);

    const review = callAgent(agent,
      `You are the CHECKER in a maker/checker loop, a strict read-only verifier. Check the latest MAKER output in the shared state on stdin against EVERY rule plus the Goal. Do not modify files. First line of your reply must be exactly PASS or FAIL; if FAIL, follow with a short bullet list of exactly what to fix. No preamble.`,
      `REPO CONTEXT:\n${context}\n\nSHARED STATE:\n${state}`);
    console.log(`CHECKER:\n${review.slice(0, 1500)}\n`);
    log(`### Round ${round} - CHECKER\n${review}\n`);

    if (review.toUpperCase().startsWith("PASS")) {
      const needGate = spec.humanGate || spec.autonomy !== "L3";
      let accepted = true;
      if (needGate) {
        const ans = await askLine(`[HUMAN GATE] Checker passed. Accept as final? (y/n) `);
        accepted = ans === "y" || ans === "yes";
      }
      if (accepted) { finalVerdict = `PASS (round ${round})`; roundsUsed = round; break; }
      log(`### Round ${round} - HUMAN\nRejected, keep improving.\n`);
    }
  }
  setVerdict(finalVerdict);
  recordHistory(cwd, { slug, agent, verdict: finalVerdict.startsWith("PASS") ? "PASS" : "NO_PASS", rounds: roundsUsed, autonomy: spec.autonomy, date: new Date().toISOString() });
  console.log(`\nVerdict: ${finalVerdict}`);
  console.log(`Full round log: .loops/state/${slug}.STATE.md`);
}

// --- stats: what the history says about your loops ---------------------------

function cmdStats() {
  const p = join(process.cwd(), ".loops", "history.jsonl");
  if (!existsSync(p)) { console.log("No history yet. Run a loop with `loopai run <slug>` first."); return; }
  const rows = readFileSync(p, "utf-8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  if (!rows.length) { console.log("History file is empty."); return; }
  const bySlug = {};
  for (const r of rows) {
    bySlug[r.slug] ||= { runs: 0, pass: 0, rounds: 0, last: "" };
    const s = bySlug[r.slug];
    s.runs++; if (r.verdict === "PASS") s.pass++; s.rounds += r.rounds || 0; s.last = r.date || s.last;
  }
  console.log(`Loop stats (${rows.length} runs recorded)\n`);
  for (const [slug, s] of Object.entries(bySlug)) {
    const rate = Math.round((s.pass / s.runs) * 100);
    const avg = (s.rounds / s.runs).toFixed(1);
    const trust = rate === 100 && s.runs >= 3 ? "  <- earning L2/L3 trust" : "";
    console.log(`  ${slug}\n    runs: ${s.runs}   pass rate: ${rate}%   avg rounds: ${avg}   last: ${s.last.slice(0, 10)}${trust}\n`);
  }
  console.log("A loop with 3+ runs at 100% pass is a candidate for more autonomy.");
}

// --- upgrade: refresh installed command files after an npm update ------------

function cmdUpgrade(args) {
  const cwd = process.cwd();
  const trackPath = join(cwd, ".loops", "tools.json");
  let tools = args.tool ? (args.tool === "all" ? Object.keys(TOOLS) : [args.tool]) : null;
  if (!tools) {
    if (!existsSync(trackPath)) { console.error("No .loops/tools.json record. Tell me what to refresh: loopai upgrade --tool <claude|gemini|codex|cursor|all>"); process.exit(1); }
    tools = JSON.parse(readFileSync(trackPath, "utf-8")).tools || [];
  }
  const invalid = tools.filter((t) => !TOOLS[t]);
  if (invalid.length) { console.error(`Unknown tool(s): ${invalid.join(", ")}`); process.exit(1); }
  console.log(`Refreshing loopAI commands for: ${tools.join(", ")}\n`);
  tools.forEach((t) => TOOLS[t](cwd));
  writeFileSync(trackPath, JSON.stringify({ tools, updated: new Date().toISOString() }, null, 2) + "\n");
  console.log("\nDone. Installed command files now match this package version.");
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
  if (action === "run") return cmdRun(args);
  if (action === "stats") return cmdStats();
  if (action === "upgrade") return cmdUpgrade(args);
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
  try {
    const trackPath = join(cwd, ".loops", "tools.json");
    mkdirSync(dirname(trackPath), { recursive: true });
    writeFileSync(trackPath, JSON.stringify({ tools: targets, updated: new Date().toISOString() }, null, 2) + "\n");
  } catch { /* tracking is best-effort */ }
  console.log("\nStart: run the init command, then grill to design a loop, then engineer <slug> to run it.");
  console.log("Or skip grilling: `loopai spec readme-sync` drops a safe preset you can run now.");
}

main();
