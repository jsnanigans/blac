# 09 — Open Questions

Decisions made by the user are captured in the README. This file tracks remaining unknowns.

## Decided

| # | Question | Decision |
|---|---|---|
| 1 | Shim or big-bang? | **Shim first.** Hand-cleanup later. |
| 2a | E2 (static `keepAlive` honored)? | **Yes.** |
| 2b | E3 (auto-instance / static `isolated`)? | **Yes.** |
| 2c | E4 (constructor-args / props via hook)? | **No.** Pattern: `useBloc(C)` + `useEffect(() => bloc.initWithProps(p), [])`. |
| 2d | E1 (BlocProvider) shape? | **Reduced.** Provider injects `instanceId` via React context; `useBloc` reads it. |
| 3 | Single big PR or per-app PRs in Phase 2? | **Per-app.** PMP first, user-app second. |

## Still open

### Q1. Deadline

User answered "not sure." This affects how aggressively we run Phase 3.

**Default plan if no deadline.** Phases 0–2 over ~2 weeks. Phase 3 spread across a quarter in low-risk cleanup PRs. Phase 4 when convenient.

### Q2. Should `packages/shared` migrate before or after the apps in Phase 3?

`packages/shared` is the smallest (32 files, all v1) and is consumed by both apps. Two options:

- **(a) Shared first.** Forces a brief window where shared uses v2 native APIs and apps use the shim. The shim is forward-compatible (shim → v2 is fine), so this works.
- **(b) Apps first.** Risk: shared keeps depending on shim names; if the shim is deleted (Phase 4), shared breaks. So shared *must* migrate at some point before Phase 4.

**Recommendation.** (a) shared first — smallest, clean test bed for the native v2 pattern before tackling the apps.

### Q3. What does each cubit's `initWithProps` look like?

The codemod generates a stub. The hand-finalization pass needs to decide:

- Is `initWithProps` idempotent across re-renders? (Should it be?)
- Does the cubit need to react to changing props (re-run init), or is one-shot enough?
- Could it be `setProps` + a watch inside the cubit?

This is per-cubit. The codemod marks each one with `MIGRATE-AUDIT-R3` so we can sweep them later.

### Q4. Where do new BlacPlugins go?

Today: the debug observer is in `state.ts`. If we add more plugins (devtools-like, persistence, analytics), do they live in:

- `packages/shared/src/plugins/`?
- `apps/*/src/plugins/`?
- A new `packages/blac-plugins/`?

**Recommendation.** Defer until we add the second plugin. For Phase 1, just convert the observer in-place in `user-app/state.ts`.

### Q5. Devtools

v2 has `__BLAC_DEVTOOLS__` integration in the `useBloc` hook. Are we shipping the devtools extension separately, or is that out of scope for this migration?

**Assumption.** Out of scope. If we want it, it's an independent project.

### Q6. Should `BlocObserver` survive Phase 4?

It's a v0 name. The compat shim exposes it. After Phase 4, anyone wanting that style should write a `BlacPlugin` directly. Confirm we're OK breaking the `BlocObserver` constructor at Phase 4.

### Q7. Persistence — do any blocs need it?

Today no app cubit declares `static addons` and no plugin is installed. If any cubit currently relies on the v0 `persistKey` ctor option, the shim does not cover that path.

**Action.** Grep for `persistKey` in v0 cubit constructors to confirm zero usage:

```
grep -rn "persistKey" apps packages --include="*.ts" --include="*.tsx"
```

If non-empty, plan a `@blac/plugin-persist` introduction.

### Q8. Naming — keep the shim package as `@9amhealth/blac-compat`?

Could also be `@9amhealth/blac-shim` or just `blac-compat`. Naming is reversible; flagged here for completeness.

### Q9. Long-term home of the migration plan

This document tree lives in the blac library repo right now (`/Users/brendanmullins/Projects/blac/app-migration-plan/`). Should it move into user-fe-reviews once Phase 0 ships? The plan is about the consumer, but the v2 extensions touch this repo.

**Recommendation.** Copy `01-inventory.md`, `03-risks-and-edge-cases.md`, `06-compat-shim-design.md`, `07-codemod-rules.md`, `08-testing-strategy.md` into user-fe-reviews at the start of Phase 1 so the consumer repo carries the operational docs. Leave the v2-side bits (`05-v2-extensions.md`) here.
