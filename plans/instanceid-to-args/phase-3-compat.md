# Phase 3 — blac-compat (after Phase 1 · ∥ Phase 2)

## Task 3.1 — Freeze public v1 `id`; rewire internals to the internal key tier
**Model: Sonnet · Effort: medium** — isolated package; the trick is keeping the v1 surface intact.
**Depends on:** Phase 1 (green + built). **Parallel-safe with:** Phase 2 (disjoint package).

### Principle
`blac-compat` exists to expose the **v1** API, including string `id`. Its **public surface does
not change**. It must keep compiling/working against the new args-only core by mapping `id` → key
through the **internal tier** (the registry class methods that still accept a `string` key, or
`resolveInstanceKey` for derivation).

### Files in scope (blac-compat only)
- `src/Blac.ts` (`ensure(BlocClass, options?.id)`)
- `src/BlocProvider.tsx` (`ensure(ctor, instanceKey)`, `<BlocProvider instanceId=…>` shim)
- `src/statics.ts` (stale `isolated`/`autoInstance` JSDoc — correct it)
- `src/__tests__/*` (e.g. `BlocObserver.test.ts` explicit-key calls)

### Check
- How `Blac.getBloc`/`ensure` currently forward `options.id`.
- Whether the compat `BlocProvider` shim relied on blac-react's `BlocProvider` `instanceId` prop
  (Phase 2 changed that). If so, the shim must now resolve its `compat-provider-${reactId}` id
  through the internal tier instead of passing it as a react `instanceId`.

### Implement
1. `Blac.ts`: `ensure(BlocClass, options?.id)` → resolve via internal tier. Since the public core
   `ensure` is now args-only, compat must call the **registry class method**
   `getRegistry().ensure(BlocClass, options?.id /* string key */)` (internal tier) — `id` is a raw
   v1 key, addressed directly. Keep the public `id` param on compat untouched.
2. `BlocProvider.tsx` (compat shim): stop relying on react's removed `instanceId` prop. Resolve the
   `compat-provider-${reactId}` key through the internal tier (acquire/ensure by key) and provide it
   to descendants the way the compat layer needs (mirror whatever react's new args-context requires,
   or keep a compat-local context that addresses by key internally).
3. `statics.ts`: fix the inaccurate `isolated`/`autoInstance` JSDoc (the flags are gone).
4. Tests: keep compat tests exercising v1 `id`; update any that call **core** functions with a
   string key to use the internal tier or `{ args }` as appropriate.

### Verify (scoped)
```
pnpm --filter @blac/compat typecheck
pnpm --filter @blac/compat lint
pnpm --filter @blac/compat test
pnpm --filter @blac/compat format:check
pnpm --filter @blac/compat build
```

### Commit
`refactor(compat): map v1 id to internal key tier; freeze public surface`

### Done when
- compat's public v1 API (incl. string `id`) is unchanged and compiles against args-only core.
- compat typecheck/lint/test/format green; builds.
