# M2a — Port `plugin-persist` live-instance reads to `$blac`

**Wave:** 2 (parallel — after M0 commits)
**Model:** Sonnet 4.6
**Effort:** low
**Estimated touch:** 1–2 files, ~3 sites

---

## Goal

`@blac/plugin-persist` reads `instance.instanceId` (and builds storage keys from it) plus drives the hydration surface. Port the live-instance reads to `$blac` **without changing any persisted key format or value**.

---

## Inputs — read these first

1. `plans/blac-meta-namespace/README.md` — locked decisions (esp. "Persist key stability").
2. `packages/plugin-persist/src/IndexedDbPersistPlugin.ts` — key sites: `instance.instanceId` reads (~lines 432, 450: `` `${instance.constructor.name}:${instance.instanceId}` ``), `runtime.instanceId` / `info.instanceId` reads (verify which are live-instance vs DTO — most `runtime.*`/`info.*` are DTO fields, leave them), and any `beginHydration`/`applyHydratedState`/`finishHydration`/`failHydration` calls.
3. `packages/plugin-persist/src/types.ts` — DTO shapes (do not rename fields).
4. `packages/blac-core/src/core/meta.ts` — the new surface.

---

## Spec

- Live-instance reads only: `instance.instanceId` → `instance.$blac.id`; hydration method calls → `instance.$blac.hydration.begin()/.apply()/.finish()/.fail()/.wait()`.
- **Storage keys must be byte-identical.** `$blac.id` returns the same string `instanceId` did. Add (or extend) a test asserting the generated storage key for a known container equals the exact pre-migration fixture string (e.g. `'MyCubit:MyCubit-main'` style — derive the fixture from current behavior BEFORE editing).
- DTO fields named `instanceId` on plugin-internal records/messages stay as-is.

---

## Owned files (write set)

```
packages/plugin-persist/src/**
```

**Do not touch:** any other package.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.** M0 committed (`rg -n '\$blac' packages/blac-core/src/core/StateContainer.ts` has hits — else **stop**). Write set clean in `git status`.
2. **Implement.** Capture the current storage-key fixture first (run the existing key-building code path in a scratch test or read the test snapshots), then apply the mapping.
3. **Verify.** From `packages/plugin-persist/`: `vp run typecheck && vp run lint && vp run format:check`.
4. **Test.** `vp run test` — green, including the key-stability assertion.
5. **Commit.** Only owned files:

   ```
   refactor(plugin-persist): read identity via $blac
   ```

---

## Acceptance criteria

- [ ] No live-instance legacy reads remain in the package.
- [ ] Storage-key stability test proves the key string is unchanged.
- [ ] All package tests green.

---

## Pitfalls

- **`runtime.instanceId` / `info.instanceId` are mostly DTO fields** — check each receiver's type before editing; only ~2–3 sites read off the live container.
- Hydration calls are timing-sensitive (hydrate-before-first-subscribe). You are renaming calls, not reordering them — change nothing about sequencing.
- Test imports come from `'vite-plus/test'`.
- `git add` explicit paths only; Wave-2 siblings are committing concurrently.
