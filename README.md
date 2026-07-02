# loopAI

Loop engineering for AI coding agents. One canonical loop, installed into
whichever tool you use: **Claude Code, Gemini CLI, Codex CLI, or Cursor**.

You stop hand-prompting your agent. You answer a few questions once, and a
standing loop does the work and checks itself. The same three commands and the
exact same loop logic run in every tool.

```
init        set up loop engineering in a repo (new or existing), never edits code
grill       answer a few questions -> a precise, safe loop spec
engineer    run it: a maker phase and a checker phase each round, with a human gate
compass     unsure which loop fits? it asks, then points you to the right command
baton       compact the current work into a handoff doc for another session
harvest     turn a finished loop into a PRD or a set of grabbable issues
guard       set up git guardrails that block dangerous commands during a loop
```

## Install the commands

First install loopAI once, globally:

```
npm install -g @javaidnaik/loopai
```

Then, from the root of the project you want to add loops to, run:

```
loopai install --tool claude    # or gemini, codex, cursor, or all
```

(Codex installs globally to `~/.codex/prompts`, so for Codex you can run it from
anywhere.)

Where the files land, and how you invoke the commands:

| Tool        | Files written                          | Invoke as |
|-------------|----------------------------------------|-----------|
| Claude Code | `.claude/commands/loop/*.md`           | `/loop:init` `/loop:grill` `/loop:engineer <slug>` |
| Gemini CLI  | `.gemini/commands/loop/*.toml`         | `/loop:init` `/loop:grill` `/loop:engineer <slug>` |
| Codex CLI   | `~/.codex/prompts/loop-*.md` (global)  | `/loop-init` `/loop-grill` `/loop-engineer <slug>` |
| Cursor      | `.cursor/commands/loop-*.md`           | `/loop-init` `/loop-grill` `/loop-engineer <slug>` |

Codex prompts are global (they live in your home directory), so you install once
and they work in every project. The other three install per project.

## Use it

1. Run the **init** command once in your repo. It scaffolds `.loops/` and writes
   a `CONTEXT.md` so the loop understands your stack. It never touches your code.
2. Run **grill**. It interviews you one question at a time and writes a spec to
   `.loops/specs/<slug>.json`.
3. Run **engineer** with that slug. Each round, a maker phase does the work and a
   checker phase verifies it against your rules. A human gate stops anything
   final until you approve.

Open `.loops/state/<slug>.STATE.md` afterward to read the full round-by-round
record.

## Skip the interview: preset specs

Five proven loops ship with the CLI. Drop one in and run it, no grilling needed:

```
loopai spec                 # list presets
loopai spec readme-sync     # the safe first loop (report-only)
loopai spec dep-bump        # propose safe dependency bumps (report-only)
loopai spec pr-review       # strict senior-engineer review of your branch
loopai spec test-first      # TDD loop: red test first, then the fix
loopai spec bug-hunt        # reproduce, minimise, fix
```

Open the spec after dropping it and adjust rules or inputs to your repo.

## Check yourself: doctor and list

```
loopai doctor    # is this repo loop-ready? scores setup, specs, test command
loopai list      # every spec here, with its last verdict
```

## Loops that run without you: cron

The whole promise of loop engineering is loops that run while you do other
work. `cron` emits a GitHub Action that runs a spec on a schedule and opens
the report as a GitHub issue:

```
loopai cron dep-bump --agent claude --schedule "0 6 * * 1"
```

Scheduled runs are forced to L1 report-only no matter what the spec says,
because there is no human at the gate. You still need to wire your agent CLI's
headless auth on the runner before enabling the workflow. Full setup for both
Claude and Gemini, with a sanity checklist, is in [docs/HEADLESS.md](docs/HEADLESS.md).

## Proof it works: examples

The `examples/` folder holds three recorded runs with full round logs: a
test-fixing loop where the checker catches a regression the maker introduced,
a report-only dependency bump, and a one-round README sync. Read them to watch
the maker and checker argue and converge.

## Why one source

The loop logic lives in one place: the three prompt files in `prompts/`. The
installer wraps them in each tool's required format (markdown frontmatter for
Claude and Cursor, TOML for Gemini, plain prompts for Codex) and swaps the
argument token. The behavior you get is identical no matter which tool you run.

## Autonomy levels

Start every new loop at **L1 (report-only)** - the maker proposes, never edits.
Move to **L2 (assisted edits, still gated)** once you trust it, then **L3
(unattended)** only for low-risk, proven loops. The human gate defaults on.

## Develop locally

```
git clone https://github.com/javaidnaik/loopAI
cd loopAI
node bin/loopai.js install --tool all   # try it without installing globally
```

## Distribution: one repo, one branch

All commands live in `prompts/` (the source of truth). Everything else is
generated from them by `npm run build`.

This repo is, at the same time, a Claude Code plugin. The generated
`.claude-plugin/` and `commands/loop/*.md` are committed at the root, so Claude
users install straight from GitHub. Every other tool installs through the npm
CLI, which converts the same prompts at install time.

**Claude Code (native, from this repo):**

```
/plugin marketplace add javaidnaik/loopAI
/plugin install loopai@javaid-loops
```

**Gemini CLI, Codex CLI, Cursor (via the CLI):**

```
npm install -g @javaidnaik/loopai
loopai install --tool gemini    # or codex, cursor, claude, all
```

Add or edit a command once in `prompts/`, run `npm run build`, commit, and every
channel updates together. `npm run build` also emits `dist/gemini`, `dist/codex`,
and `dist/cursor` (gitignored) if you ever want to publish a native package for
one of those in its own repo, but you do not need to.

This mirrors how mattpocock/skills ships: one repo, source files plus a Claude
plugin manifest, and an installer that adapts to other agents.

Note: Google has said the free Gemini CLI is being folded into Antigravity CLI,
so confirm the current Gemini install path on their docs before relying on it.

## Credits

Several commands are adapted and generalized from
[mattpocock/skills](https://github.com/mattpocock/skills) (MIT): the grilling
interview, the handoff doc, PRD/issue output, and git guardrails. His are
per-session engineering skills. loopAI reworks the ideas into portable commands
that run identically across Claude Code, Gemini CLI, Codex, and Cursor.

## Structure

```
loopAI/
  bin/loopai.js        the installer
  prompts/
    init.md            canonical init logic
    grill.md           canonical interview logic
    engineer.md        canonical loop (maker + checker)
  package.json         npm bin: loopai
```

MIT
