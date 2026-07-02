# Example: dep-bump (L1 report-only, 2 rounds to PASS)

The safest first loop to run on any repo. The maker never edits a file; it
proposes, the checker verifies the proposal is actually safe.

## The round log

### Round 1 - MAKER
Ran `npm outdated`. Found 6 outdated packages. Proposed bumps:
- lodash 4.17.20 -> 4.17.21 (patch, security fix)
- axios 1.6.2 -> 1.7.9 (minor)
- eslint 8.53.0 -> 8.57.1 (minor)
- vitest 1.0.4 -> 1.6.1 (minor)
- typescript 5.2.2 -> 5.6.3 (minor)
- react 17.0.2 -> 18.3.1 (MAJOR, flagged separately)

One command for the safe set:
`npm i lodash@4.17.21 axios@1.7.9 eslint@8.57.1 vitest@1.6.1 typescript@5.6.3`

### Round 1 - CHECKER
FAIL
- Rule 2 requires a changelog link per package. Three are missing links.
- Rule 4 requires resolution verification. Not shown. Run
  `npm i --dry-run` with the proposed set and include the result.
- The react major flag is good; keep it out of the main command as done.

### Round 2 - MAKER
Added changelog links for all six. Ran the dry-run: resolves clean, no peer
conflicts. Included the dry-run output summary in the proposal.

### Round 2 - CHECKER
PASS
- All five rules verified. No file was edited at any point
  (`git status` clean). The proposal is complete, linked, and verified.

### HUMAN GATE
Accepted. User ran the copy-paste command themselves.

## Verdict
PASS (round 2)

## What to notice
- L1 means the loop cannot touch your files even if it wanted to. Perfect for
  a first run on a repo you care about.
- The checker enforced the boring rules (links, dry-run proof) a human
  reviewer would skip. That is where quality hides.
