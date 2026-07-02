# Example: readme-sync (L1 report-only, 1 round to PASS)

The "hello world" of loops. Small, safe, done in one round. Good first spec to
try after `init`.

## The round log

### Round 1 - MAKER
Compared package.json scripts to the README usage section.
Drift found:
- `test:watch` exists in package.json, missing from README.
- README documents `npm run deploy`, which no longer exists (renamed to
  `release` two months ago per git log).

Proposed diff (not applied, L1):
```diff
- npm run deploy     # ship to production
+ npm run release    # ship to production
+ npm run test:watch # run tests in watch mode
```

### Round 1 - CHECKER
PASS
- Both rules verified against the actual files. The proposed diff covers
  every missing script and removes the stale one. No files were edited.

### HUMAN GATE
Accepted. User applied the two-line diff by hand.

## Verdict
PASS (round 1)

## What to notice
- Not every loop needs drama. A one-round pass is the system working.
- This is the spec to run first on a new repo: zero risk, instant value, and
  you get to watch the maker/checker handshake end to end.
