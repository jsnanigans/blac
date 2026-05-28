# G0 — Update `apps/examples` for new `@blac/core` + `@blac/react` API

**Phase:** G (parallel after F3; safe alongside G1, G4)
**Model:** Sonnet 4.6
**Effort:** low (mostly mechanical: rename `dependencies` → `select`, verify each demo runs)
**Estimated touch:** ~10-20 files

---

## Goal

`apps/examples` showcases blac patterns. After D0's breaking changes, several files likely need updates:

1. `useBloc({ dependencies })` → `useBloc({ select })`.
2. Any direct import from `@blac/adapter` → remove (E0 deleted it).
3. Any `tracked()` standalone usage → migrate to `trackRender` or in-render usage via `useBloc`.

Verify each example still runs in dev mode (golden path + obvious edge cases).

---

## Inputs — read these first

1. `apps/examples/src/**` — full app.
2. `apps/examples/package.json` — dep versions.
3. `plans/blac-core-migration/_audit.md` — pre-migration usage inventory.
4. `packages/blac-react/src/useBloc.ts` (after D0) — new API.
5. `~/.claude/CLAUDE.md` — commit format.

---

## What to change

1. **`dependencies` → `select`** in every `useBloc` callsite.
2. **Remove any `@blac/adapter` imports** (should be zero by now).
3. **`isolated` flag** — per memory, `isolated` was removed pre-migration; if any example still uses it, swap for `instanceId` with a unique key (per existing memory note).
4. **Update example READMEs** in-app if they reference old APIs.

---

## Owned files (write set)

```
apps/examples/src/**
apps/examples/package.json    (only if dep ranges need updating)
```

**Do not touch:** any package; any other app.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean.
   - F3 has committed.
   - `vp run typecheck` from `apps/examples/` — note the failures.

2. **Implement.**
   - Walk through each example. Apply the changes above.
   - For each demo (counter, todo, form, dashboard, messenger), run `vp run dev` briefly and confirm it loads. Stop the dev server when done.

3. **Verify.**
   - `vp run typecheck` from `apps/examples/`.
   - `vp run lint`.
   - `vp run build` — must succeed.

4. **Test.**
   - If the app has tests: `vp run test`.
   - Manually verify each demo loads.

5. **Commit.**

   ```
   refactor(examples): migrate to new @blac/react useBloc API
   ```

   Body:
   ```
   - `dependencies` → `select` in N callsites.
   - Removed `@blac/adapter` imports (now in @dirtytalk/structural).
   - All N demos load and exercise without errors.
   ```

---

## Acceptance criteria

- [ ] No `dependencies` option on `useBloc` callsites in `apps/examples/`.
- [ ] No `@blac/adapter` imports.
- [ ] All demos load via `vp run dev`.
- [ ] `vp run build` succeeds.
- [ ] `vp run typecheck` and `lint` green.

---

## Pitfalls

- **Hot reload state during testing.** When testing `vp run dev`, the per-class interner registry holds across HMR. That's expected; not a bug.
- **`useBloc(C, { args })`** — `args` keys identity. If callers passed `dependencies` expecting it to behave like `args`, that's a misuse pre-migration. Migrate to whichever the example actually intended.
- **Dev server: only the golden path.** Don't deep-test every edge case; G3 (perf) is the heavy validation. G0 is "demo loads, basic interaction works."
- **Don't refactor demos.** Just migrate API. Scope creep.
