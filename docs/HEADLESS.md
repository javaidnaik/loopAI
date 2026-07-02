# Headless auth for scheduled loops

`loopai cron <slug>` generates a GitHub Action that runs your loop on a
schedule with no human present. The workflow needs the agent CLI installed and
authenticated on the runner before it will work. This page covers both
supported agents.

Scheduled runs are always forced to L1 report-only, regardless of the spec.
There is no human at the gate, so the loop reports; it never edits.

## Claude Code

Claude Code in print mode (`claude -p`) accepts two credentials. Pick one.

**Option A: subscription OAuth token (Pro / Max / Team / Enterprise).**
Usage draws from your subscription instead of API billing.

1. On your own machine, run:
   ```
   claude setup-token
   ```
   This walks you through a one-time browser authorization and prints a
   long-lived token (about one year). Copy it; you will not see it again.
2. In your GitHub repo: Settings > Secrets and variables > Actions >
   New repository secret. Name it `CLAUDE_CODE_OAUTH_TOKEN`, paste the token.
3. In the generated workflow, add the install and env lines to the run step:
   ```yaml
   - name: Run loop (report-only)
     env:
       CLAUDE_CODE_OAUTH_TOKEN: ${{ secrets.CLAUDE_CODE_OAUTH_TOKEN }}
       PROMPT: |
         ...
     run: |
       npm install -g @anthropic-ai/claude-code
       claude -p "$PROMPT" --output-format text | tee loop-report.txt
   ```

**Option B: API key (pay per token).**
Cleaner for team-owned automation because it is not tied to one person's
subscription quota.

1. Create a key at console.anthropic.com (Settings > API keys).
2. Save it as a repo secret named `ANTHROPIC_API_KEY`.
3. Same workflow edit as above, but the env line is:
   ```yaml
   ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
   ```

Do not set both. If both are present the API key wins and you get billed per
token even though you have a subscription.

## Gemini CLI

Gemini CLI in headless mode (`gemini -p`) errors out in CI unless a credential
is present in the environment. The standard path is an API key.

1. Get a key from Google AI Studio (aistudio.google.com). The free tier has
   generous quotas for a scheduled loop.
2. Save it as a repo secret named `GEMINI_API_KEY`.
3. In the generated workflow, add install and env to the run step:
   ```yaml
   - name: Run loop (report-only)
     env:
       GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
       PROMPT: |
         ...
     run: |
       npm install -g @google/gemini-cli
       gemini -p "$PROMPT" | tee loop-report.txt
   ```

Vertex AI users can authenticate with `GOOGLE_API_KEY` plus
`GOOGLE_GENAI_USE_VERTEXAI=true`, or full ADC with a service account. See
Google's Gemini CLI authentication docs for those variants.

Heads-up: Google has said the free Gemini CLI is being folded into the
Antigravity CLI, and Antigravity's headless API-key support is still in flux.
If the `gemini` command stops working on runners, check the current state of
both CLIs before debugging your workflow.

## Sanity checklist before enabling the schedule

- The secret name in the workflow matches the secret name in repo settings
  exactly. A typo here is the number one failure.
- The CLI install line is present in the run step (runners start clean).
- Run the workflow once manually (Actions tab > your workflow >
  Run workflow) before trusting the schedule. `workflow_dispatch` is already
  in the generated file for exactly this.
- Check the created issue: the loop's report should be readable and grounded
  in your repo. If it is empty, the CLI likely failed auth; open the run logs.

## Cost and quota notes

- A scheduled loop runs the full engineer prompt every time. On subscription
  tokens this draws from your plan's limits; heavy schedules can eat quota you
  want for interactive work. Weekly is a sensible default, not hourly.
- On API keys, set a spend limit in the provider console before enabling
  anything scheduled.
