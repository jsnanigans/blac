# M1 — Port blac-core internals to `$blac` / `[INIT_CONFIG]`

**Wave:** 2 (parallel with M2a–M2d, M3, M4 — after M0 commits)
**Model:** Sonnet 4.6
**Effort:** medium
**Estimated touch:** 4–6 files, ~25 sites

---

## Goal

Move every blac-core-internal read of the legacy identity surface (outside `StateContainer.ts` itself, which M0 handled) onto `$blac` / `[INIT_CONFIG]`, so the core package emits zero deprecation warnings at dev runtime and M5 can delete the legacy surface without touching these files again.

---

## Inputs — read these first

1. `plans/blac-meta-namespace/README.md` — locked decisions, `BlacMeta` shape.
2. `packages/blac-core/src/core/meta.ts` + the M0 diff on `StateContainer.ts` (`git log -1 -p -- packages/blac-core/src/core/StateContainer.ts` or read the file) — the new surface you're porting onto.
3. `packages/blac-core/src/core/StateContainerRegistry.ts` — `instance.isDisposed` guards, `instance.dependencies` release logic, `initConfig` call (~line 338).
4. `packages/blac-core/src/plugin/PluginManager.ts` — `getInstanceMetadata()` extraction (~lines 360–370): copies `instanceId`, `name`, `createdAt` off the live instance; plus the `(entry.instance as any).instanceId` lookup (~line 429).
5. `packages/blac-core/src/watch/watch.ts` — note: `input.instanceId` (~line 106) is an **options DTO field, not an instance read** — verify and leave DTO fields alone.
6. `packages/blac-core/src/testing.ts` — calls legacy `initConfig` (~line 129).
7. `packages/blac-core/src/registry/**`, `src/decorators/**` — sweep for stragglers.

---

## Spec

Mechanical mapping, applied **only to reads off live `StateContainer` instances**:

| Legacy | New |
| --- | --- |
| `x.name` | `x.$blac.name` |
| `x.debug` | `x.$blac.debug` |
| `x.instanceId` | `x.$blac.id` |
| `x.createdAt` | `x.$blac.createdAt` |
| `x.isDisposed` | `x.$blac.disposed` |
| `x.dependencies` | `x.$blac.dependencies` |
| `x.hydrationStatus` / `hydrationError` / `isHydrated` / `changedWhileHydrating` | `x.$blac.hydration.status` / `.error` / `.isHydrated` / `.changedWhileHydrating` |
| `x.beginHydration()` / `applyHydratedState(s)` / `finishHydration()` / `failHydration(e)` / `waitForHydration()` | `x.$blac.hydration.begin()` / `.apply(s)` / `.finish()` / `.fail(e)` / `.wait()` |
| `x.initConfig(c)` | `x[INIT_CONFIG](c)` (import `INIT_CONFIG` from `'./core/symbols'` / the barrel) |

**Critical invariants:**

- `PluginManager.getInstanceMetadata()` must keep the **DTO field names unchanged** (`id`, `name`, `createdAt`, ...) — devtools-ui/-connect consume that shape. Only the right-hand side (the read off the live instance) changes. The `as any` casts should become typed `$blac` reads.
- Registry dispose/release guards (`isDisposed`, `dependencies`) are hot-path — `$blac.disposed` is a getter-over-getter; that's fine (two property reads), but don't add anything heavier.
- Do not rename DTO/options fields anywhere (`watch` input, `InstanceMetadata`, plugin event payloads).

---

## Owned files (write set)

```
packages/blac-core/src/core/StateContainerRegistry.ts
packages/blac-core/src/plugin/**
packages/blac-core/src/watch/**
packages/blac-core/src/testing.ts
packages/blac-core/src/registry/**
packages/blac-core/src/decorators/**
```

**Do not touch:** `core/StateContainer.ts`, `core/meta.ts`, `core/symbols.ts`, `src/index.ts` (M0's, already committed), any test file (M3 owns tests), any other package.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - M0 committed: `rg -n '\$blac' packages/blac-core/src/core/StateContainer.ts` has hits. If not, **stop**.
   - `git status` — your write set is clean (other Wave-2 agents' files may be dirty; ignore them).
2. **Implement.** Apply the mapping; sweep with `rg -n '\.(instanceId|isDisposed|createdAt|hydrationStatus|initConfig)\b' packages/blac-core/src --glob '!*.test.*' --glob '!core/StateContainer.ts'` until only DTO fields remain.
3. **Verify.** From `packages/blac-core/`: `vp run typecheck && vp run lint && vp run format:check`.
4. **Test.** From `packages/blac-core/`: `vp run test` — green without test edits (legacy delegates still exist; tests are M3's).
5. **Commit.** Only owned files:

   ```
   refactor(blac-core): port internals to $blac meta
   ```

---

## Acceptance criteria

- [ ] No legacy-member read off a live instance remains in the owned files (DTO fields exempt).
- [ ] `getInstanceMetadata()` DTO shape byte-identical (field names and value sources equivalent).
- [ ] `initConfig` callers use `[INIT_CONFIG]`.
- [ ] Full core suite green, zero test-file edits.

---

## Pitfalls

- **DTO vs live instance** is the whole game. `watch.ts`'s `input.instanceId` is an options object — leave it. When unsure, check the receiver's type.
- **`testing.ts` stubs**: if a stub object fakes a StateContainer, it may need a fake `$blac`/`[INIT_CONFIG]` too — keep the stub's public shape in sync with what its consumers actually use, nothing more.
- Other Wave-2 agents are committing concurrently — `git add` only your explicit paths; never `git add -A`.
