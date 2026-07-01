---
description: Set up loopAI in this repo (new or existing). Safe - only creates .loops/, never edits code.
argument-hint: "[optional note]"
---

You are setting up **loopAI** in the current working directory. Setup must be
fast and safe. Do NOT modify, refactor, or reformat any existing code. You only
create a `.loops/` folder and scaffold files inside it.

User note (optional): $ARGUMENTS

Steps:

1. Read the repo lightly (read-only) to build context. Detect:
   - Project type / language (package.json, composer.json, go.mod,
     pyproject.toml, Gemfile, etc.). If none exist, treat it as a NEW project.
   - Framework / stack hints (Next.js, Shopify, WordPress, Laravel, MERN...).
   - Test command and lint command if discoverable.
   - Whether this is a git repo.

2. Create the scaffold (only if missing, never overwrite existing specs):
   ```
   .loops/
     CONTEXT.md     # what you detected, so agents have grounding
     specs/         # one JSON spec per loop (grill writes these)
     state/         # one STATE.md per run (engineer writes these)
   ```

3. Write `.loops/CONTEXT.md` with: detected stack, test command, lint command,
   how to run the project, and any conventions worth knowing. Keep it short and
   factual. Every loop agent reads this file for grounding.

4. If a `.gitignore` exists, suggest (do not force) adding `.loops/state/`.

5. Print the next steps for designing and running a loop.

Be quick: one pass of reading, then scaffold, then the next-steps message.
