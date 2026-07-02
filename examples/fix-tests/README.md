# Example: fix-cart-tests (L2, 3 rounds to PASS)

A real-shaped run of the engineer loop on a repo with two failing tests in a
cart module. The spec allowed edits to `src/cart` only, tests untouchable.

## The spec

```json
{
  "goal": "All tests in the cart module pass without breaking any other test",
  "rules": [
    "npm test passes fully",
    "Only files under src/cart may be edited",
    "Test files must not be modified"
  ],
  "inputs": ["src/cart", "test/cart"],
  "maxRounds": 5,
  "autonomy": "L2",
  "humanGate": true
}
```

## The round log (from .loops/state/fix-cart-tests.STATE.md)

### Round 1 - MAKER
Ran the suite to see the failures first. Two failing:
- `applies percentage discount before tax` (expected 108.00, got 118.80)
- `empty cart total is zero` (TypeError: cannot read reduce of undefined)

Fix 1: `src/cart/pricing.js` applied tax before discount. Reordered to
discount-then-tax in `calculateTotal`.
Fix 2: `src/cart/cart.js` `items` can be undefined on a fresh cart. Added a
default `items = []` in the constructor.

### Round 1 - CHECKER
FAIL
- `npm test`: 41 passing, 1 failing. The discount test now passes, but
  `rounds totals to two decimals` broke: expected 108.00, got 108.000000000001.
- Root cause: the reorder removed the rounding step that ran after tax.
- Fix exactly this: re-apply rounding as the final step of `calculateTotal`.

### Round 2 - MAKER
Re-added `roundCurrency()` as the last operation in `calculateTotal`, after
tax. No other changes. Only `src/cart/pricing.js` touched.

### Round 2 - CHECKER
FAIL
- `npm test`: 42 passing, 0 failing in cart, but the run now emits a
  deprecation warning from `src/cart/pricing.js` (`Number.prototype.toFixed`
  on a string). The rules say the suite must pass fully; it does, so this is
  borderline. Holding to strictness: the warning comes from your change
  (roundCurrency receives a string when discount is "10%"). Fix the type
  handling so the change is clean.

### Round 3 - MAKER
`roundCurrency` now coerces with `Number()` and throws on NaN with a clear
message. Suite-visible behavior unchanged.

### Round 3 - CHECKER
PASS
- `npm test`: 42 passing, 0 failing, no warnings.
- All three rules verified: suite green, only `src/cart` edited (checked
  `git diff --name-only`), no test files modified.

### HUMAN GATE
Shown the final diff (2 files, +9 -4). Accepted.

## Verdict
PASS (round 3)

## What to notice
- The checker caught a regression the maker introduced (round 1) and a
  sloppy edge the maker would have shipped (round 2). That is the maker and
  checker split doing its job.
- The maker never argued with the checker. It fixed exactly the named items.
- Total human involvement: one approval at the end.
