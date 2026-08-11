# Testing

Use Node.js 22.13.0 or newer. Install the locked dependencies before running the
checks:

```bash
npm ci
```

Run the complete local verification sequence:

```bash
npm test
npm run lint
npx tsc --noEmit
npm audit --omit=dev --audit-level=high
npm run build
git diff --check
```

`npm test` is an alias for `npm run test:unit`. It uses Node's test runner with
TypeScript support to execute `tests/*.test.ts` and `tests/*.test.mjs`. The suite
contains unit and service coverage plus mounted DOM tests; it does not run the
production build or a live end-to-end browser session.

The automated suite covers, among other things:

- PGN parsing, recursive variations, custom-FEN round trips, result accounting,
  headerless game splitting, and safe-integer validation;
- import and SAN limits, worker request/progress/cancellation behavior, stale-result
  protection, and atomic replacement;
- promotion choices, collapse selection, replacement confirmation, and undo;
- ARIA tree semantics, keyboard navigation, modal focus, reduced motion, dialog
  scrolling, and touch targets; and
- color contrast validation, locale persistence, and accessible file selection.

The remaining commands are independent gates: ESLint, TypeScript without emitting
files, a high-severity audit of production dependencies, the Vinext production build,
and Git whitespace validation. For a release, also perform a manual browser review of
board play, import/paste, tree navigation, collapse/expand, dialogs, and
PGN/JSON/SVG downloads.
