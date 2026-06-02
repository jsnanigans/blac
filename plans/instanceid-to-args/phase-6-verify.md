# Phase 6 — Full verify + cleanup + changeset (serial · last)

Only phase allowed to run **whole-workspace** checks. Run after Phases 1–5 land on
`feat/instanceid-to-args`.

## Task 6.1 — Full sweep **(Sonnet / medium)**

- `pnpm typecheck` (all packages)
- `pnpm lint`
- `pnpm test`
- `pnpm format:check`
- `pnpm build` (all packages) + `pnpm --filter @blac/docs build`
- Fix any cross-package fallout (most likely: a consumer still passing a string key, or a docs
  twoslash sample). Keep fixes scoped; re-run until green.
- Compare against `baseline.md` — only _new_ failures are in scope; pre-existing ones stay tracked.
- Commit: `test: full workspace green after args migration`.

## Task 6.2 — Residual-usage guard **(Haiku / low)**

Grep must return **zero** hits (outside the explicit v1→args migration note, the `instanceId`
_property_, and the branded-type helper):

```
rg -n "instanceId\s*[:=]" packages apps --glob '!**/dist/**' --glob '!**/node_modules/**' \
  --glob '!**/plans/**'
rg -n "borrowSafe\([^,]+,\s*['\"\`]" packages apps --glob '!**/dist/**'   # raw-string borrow
rg -n "\b(acquire|ensure|release|hasInstance|getRefCount|getRefIds)\([^,]+,\s*['\"\`]" packages apps \
  --glob '!**/dist/**'                                                    # raw-string key calls
rg -n "isIsolatedClass|ISOLATED|autoInstance" packages apps --glob '!**/dist/**'
```

Triage every hit: legitimate (internal tier / `StateContainer.instanceId` property / compat v1 `id` /
branded helper) vs leftover (fix). Document the allowlist in the commit body.

- Commit: `chore: assert no residual instanceId/string-key public usage`.

## Task 6.3 — Changeset **(Sonnet / low)**

- Add a changeset: **major** bump for `@blac/core` and `@blac/react` (breaking: `instanceId` removed,
  registry functions are args-only, `BlocProvider` is args-based, `watch.instance` takes args).
  `@blac/compat` public surface **unchanged** (patch/none — internal rewire only). `@blac/devtools-*`
  patch if their `acquire/release` calls changed.
- Migration summary in the changeset body: `{ instanceId }` → `{ args }`; per-mount → `{ args: { _id: useId() } }`;
  `borrowSafe(Bloc, 'k')` → `borrowSafe(Bloc, { args })`; `<BlocProvider instanceId>` → `<BlocProvider bloc args>`.
- Commit: `chore: changeset for args-only instance identity`.

## Exit criteria (whole migration)

- Whole workspace: typecheck + lint + test + format + build all green.
- Residual-usage grep clean (allowlist documented).
- Changeset present.
- `feat/instanceid-to-args` ready to PR against `v1` (the repo's PR base). **Do not push** — leave for the human.
