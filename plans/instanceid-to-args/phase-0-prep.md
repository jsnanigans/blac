# Phase 0 — Prep & working-tree hygiene (serial)

> Do this before any implementation phase. Mostly orchestrator/human-driven; small + low-risk.

## Context
The working tree currently has **two unrelated change sets** mixed together:
1. **This migration's seed**: `packages/blac-core/src/registry/borrow.ts` (`BorrowTarget` + args
   support) and the `BorrowTarget` exports in `registry/index.ts` + `index.ts`. **Keep** — Phase 1 finalizes.
2. **Unrelated devtools session work**: `packages/devtools-ui/src/components/*` (StateViewer,
   LogsView, StateHistoryView), `apps/devtools-extension/src/panel/index.tsx`,
   `apps/devtools-extension/src/panel/comm.ts`, `packages/devtools-connect/src/plugin/DevToolsBrowserPlugin.ts`,
   `apps/examples/vite.config.ts` + `apps/examples/tsconfig.json` (devtools-connect/devtools-ui aliases),
   and the temporary `[WS DIAG]` logs in `apps/examples/src/messenger/services/WebSocketMock.ts`.

## Task 0.1 — Isolate the in-flight devtools work  **(Sonnet / low)**
- **Check:** `git status`, `git diff --stat`. Identify the devtools files (list above).
- **Implement:** Move the devtools changes onto their own branch/commit so the migration starts clean.
  `git stash` is **banned** — instead:
  - Create branch `fix/devtools-realtime-sync` off current `main`.
  - Stage **only** the devtools files (the list in item 2 above, EXCEPT the `[WS DIAG]` logs —
    leave those in the working tree; they are removed in Phase 4a-messenger) and commit them there:
    `git add -- packages/devtools-ui/src/components packages/devtools-connect/src/plugin/DevToolsBrowserPlugin.ts apps/devtools-extension/src/panel apps/examples/vite.config.ts apps/examples/tsconfig.json`
    → `git commit -m "fix(devtools): realtime sync, soft-disconnect, args-alias examples"`.
  - Decide on the `vite.config.ts`/`tsconfig.json` devtools aliases: they are arguably useful
    beyond devtools; keeping them on this branch is fine. Document the choice in the commit body.
- **Verify:** `git status` shows only the migration seed (`borrow.ts`, `registry/index.ts`,
  `index.ts`) + the `[WS DIAG]` logs left in `WebSocketMock.ts`.
- **Commit:** as above (the devtools commit lives on its own branch).

## Task 0.2 — Create the migration branch  **(Haiku / low)**
- From the clean state (migration seed only), create `feat/instanceid-to-args`.
- Commit the migration seed as the first migration commit:
  `git add -- packages/blac-core/src/registry/borrow.ts packages/blac-core/src/registry/index.ts packages/blac-core/src/index.ts`
  → `git commit -m "refactor(core): add args-form BorrowTarget (seed)"`.

## Task 0.3 — Baseline snapshot  **(Haiku / low)**
- Run `pnpm typecheck` and `pnpm test` once; record any **pre-existing** failures in
  `plans/instanceid-to-args/baseline.md` so later phases don't get blamed for them.
- Do **not** fix unrelated failures here.

## Exit criteria
- `feat/instanceid-to-args` exists, devtools work is off on its own branch.
- Tree contains only migration-relevant changes (+ the `[WS DIAG]` logs awaiting Phase 4a removal).
- Baseline recorded.
