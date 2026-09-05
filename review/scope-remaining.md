# Scope — the 12 remaining review items

Written after Phase 4's non-breaking work was exhausted. Every item below is
either breaking, architectural, or both. Verified against the source on
2026-09-05; premises the review got wrong are called out inline.

---

## The shape of the problem

The 12 open items are not 12 independent tasks. They collapse into **four
shipping units**, because of a dependency chain that the phase numbering hides:

```
R1  Identity + type foundation   (05 §2.1, §2.4, §2.5)
      │  everything below reads identity or the constructor constraint
      ▼
R2  Ownership + notification     (04 §4, 04 §6, 02 §2, 05 §1, 05 §3)
      │  one owner set; one state pipeline; lean barrel
      ▼
R3  The React rewrite            (04 §1, §2, §5, 02 §6, 01 §6, §7)
      │  uSES needs R2's ownership to do subscribe/unsubscribe pairing
      ▼
R4  Cosmetics                    (05 §8 naming, 05 §2.2 deep-readonly, 03 §3)
         renames are only safe once the call sites stop moving
```

**Doing these in review order does not work.** 05 §8 (naming) renames
`ensure`/`borrow` → `peek`; 04 §4 deletes `ensure` outright. Renaming first
means renaming a function that is about to be removed, and rewriting 42 example
files twice. R4 is last for that reason, not because it is least important.

---

## R1 — Identity and type foundation

**Items:** 05 §2.1 (zero-arg constructor), 05 §2.4 (`any` in public surface),
05 §2.5 (`constructor.name` as identity).

### Why first

`constructor.name` is load-bearing in **10 places** across 4 packages,
including `plugin-persist`'s storage key (`IndexedDbPersistPlugin.ts:450`).
That last one is the real severity: under minification every bloc becomes `t`,
so **persisted state collides across every bloc in a production build**. This
is a data-loss bug of the same class as the Phase 0 hydration bug, not a
polish item — the review files it under "types", which undersells it.

It has to land before R2 because the registry's owner set and the devtools
graph both key off identity, and before the persist plugin's key format is
frozen by more users.

### Work

1. `static blacName?: string`, set by the `blac()` decorator; read it first,
   fall back to `constructor.name`.
2. Migration for existing persisted data: read the new key, fall back to the
   old key, rewrite on next save. Without this, shipping R1 orphans every
   user's persisted state. **The review does not mention this and it is
   mandatory.**
3. `StateContainerConstructor` → `new () => StateContainer<...>`.
4. Declared `BlacStatics` interface; drop `(Type as any)` in `static-props.ts`
   (already half-done — `getOwnStaticProp` landed this session).

### Risk

Item 3 is the loud one: any user class with a required constructor param stops
compiling. That is the point (it was silently getting `undefined` at runtime),
but it needs a migration note. Items 1–2 are runtime-invisible if the fallback
is right.

**Size:** medium. **Breaking:** type-level (3), behavioural only if 2 is done
wrong.

---

## R2 — Ownership and notification

**Items:** 04 §4 (one ownership model), 04 §6 (emit ordering), 02 §2 (three
pipelines), 05 §1 (`Cubit` vs `StateContainer`), 05 §3 (dead surface).

### Why these are one unit

02 §2 says "make the channel the single pipeline"; 04 §6 says "`onStateChange`
is the only state event, and the registry's `stateChanged` is implemented on
top of it". These are the same change written twice in two files. Doing them
separately means building the plugin bridge, then rebuilding it.

04 §4 collapses `refs: Map<string, number>` + `dependents: Set<...>` into one
`owners: Set<OwnerToken>`. `ensure`/`borrow`/`borrowSafe` are the public
surface of that split, so 05 §3's "dead surface" cleanup is the same edit.

### Verified corrections to the review

- **05 §1's premise is half wrong.** The review says "`emit`, `patch`,
  `update` are public on `StateContainer`". `update` **is not defined on
  `StateContainer` at all** — it only exists on
  `StructuralContainer` (`container.ts:255`). Only `emit` (`:526`) and `patch`
  (`:539`) are overridden. So the "make the README true" option needs a
  `protected override update` that does not currently exist, which is a
  slightly larger change than the review implies.
- **`ensure`/`borrow`/`borrowSafe` are not dead.** The review lists them under
  dead surface. They have real non-test consumers: `borrowSafe` in three
  `apps/examples/messenger` files, `borrow` in two `apps/perf` benchmarks,
  `ensure` in an examples component and in `blac-core/src/testing.ts`. Removing
  them is a migration, not a deletion.
- `getInstancesMap` genuinely is near-dead (3 refs, all internal).

### Work

1. `owners: Set<string | StateContainer>` + reverse `WeakMap` for dispose.
2. Delete `notifyStateChanged`, `_pendingStateChanges`, `flushStateChanged`
   (`StateContainerRegistry.ts:140, 915–939`); registry `stateChanged`
   re-implemented over one per-container ALL_PATHS subscription.
3. Cache `PluginContext` per container in a `WeakMap` (currently a 14-method
   object rebuilt per dispatch).
4. Reorder `created` after `init()` — this is the tail of the Phase 0
   hydration fix.
5. Decide `Cubit`: make `emit`/`patch`/`update` protected on `StateContainer`
   and public on `Cubit`. Recommend yes — it is the only thing that makes the
   two classes mean anything, and it matches the pitch.

### Risk

Highest-risk unit in the whole set. Ownership changes are where use-after-free
and leaks live, and item 5 breaks every bloc that calls `this.emit()` from
outside a method. Wants property-based or fuzz testing on
acquire/release/dispose interleavings, not just example-based tests.

**Size:** large. **Breaking:** yes, loudly.

---

## R3 — The React rewrite

**Items:** 04 §1 (uSES), 04 §2 (activation lifecycle), 04 §5 (registry
context), 02 §6 (consolidate refs), 01 §6 (side effects in render), 01 §7
(tearing).

### Verified corrections

- **The review undercounts the hook state.** It says "~17 refs / 3 effects".
  Actual: **22 `useRef`, 2 `useReducer`, 4 effects** (2 `useEffect`, 2
  `useLayoutEffect`) in 942 lines. All the compensating machinery it describes
  is confirmed present: `rebindNonce` (`:216`), `force` (`:285`),
  `renderStateRef` (`:302`), `prevBlocRef` (`:305`), and the R2 mount-gap
  check (`:378–380`).
- **No React 18 shim needed.** Peer range is `^18.0.0 || ^19.0.0`;
  `useSyncExternalStore` is in both. The review does not say either way.

### Why it must follow R2

`useSyncExternalStore` guarantees subscribe/unsubscribe pairing, which is what
lets the manual acquire/release (R3/R4 StrictMode logic) be deleted. That
deletion is only safe if ownership is already a single set — otherwise the
hook is pairing against two competing counters.

### Work

Rewrite `useBloc.ts` around a `Consumer` object: `subscribe`/`getSnapshot`
(version counter, bumped only on intersecting flush)/`getServerSnapshot` → 0.
`select` becomes a second `Consumer` strategy. Add
`onActivate(signal)`/`onDeactivate()` on the 0↔1 owner transition, plus the
microtask sweep for ref-less creates. Registry via context, defaulting to the
global.

Public signature does not change; file should go ~942 → ~350 lines.

### Risk

The activation lifecycle is a **semantic** change even though the signature is
stable: docs and examples currently put `void this.load()` in `init()`, and
that moves to `onActivate`. 42 example files use `useBloc`. Existing `init()`
behaviour must keep working or this is a rewrite of every consumer app.

**Size:** largest. **Breaking:** behaviourally, despite the stable signature.

---

## R4 — Cosmetics and surface

**Items:** 05 §8 (naming), 05 §2.2 (deep-readonly + dev mutation traps),
03 §3 (subpath exports), plus 05 §2.3 (`InstanceReadonlyState`).

Last, because every rename here targets a call site that R2/R3 move or delete.

- **05 §2.2 is worth doing and is cheap.** Confirmed the tracker has only
  `get` (`:378`), `ownKeys` (`:528`), `has` (`:547`) traps — no `set`. So
  `state.user.name = 'x'` from a component writes through silently, with no
  re-render and no warning. Adding dev-only `set`/`deleteProperty`/
  `defineProperty` traps that throw is small, high-value, and non-breaking in
  prod. **This one could be pulled forward** if you want a quick win — it does
  not depend on R1–R3. It is the only item here that is separable.
- 05 §2.3 (`Omit<>` erasing the class) is what bit us building `useBlocDeps`
  last session — it stripped symbol-keyed methods and forced a structural
  `DepsTarget`. Fixing it to an intersection removes that workaround.
- 03 §3 (lean barrel) should follow R2, since R2 decides what is public.

**Size:** small each. **Breaking:** renames yes, traps no.

---

## Recommended sequencing

| Unit                           | Ships as                   | Depends on | Size    |
| ------------------------------ | -------------------------- | ---------- | ------- |
| **R1** identity + types        | minor + migration note     | —          | medium  |
| **R2** ownership + pipeline    | major                      | R1         | large   |
| **R3** React rewrite           | major (same release as R2) | R2         | largest |
| **R4** naming + traps + barrel | same major                 | R2, R3     | small   |

**R2+R3+R4 are one major release.** Splitting them means two majors in a row
and two migrations for users, for no benefit — the naming pass alone would
churn 42 example files a second time.

**R1 ships first and separately**, as a minor. It is the only unit with a
data-loss bug in it (the persist key), and it is the foundation the rest reads.

### Two things I would pull out of order

1. **The persist-key migration (inside R1)** is the single highest-severity
   item left and is currently filed as a typing nit. Worth doing on its own if
   nothing else gets done.
2. **Dev mutation traps (05 §2.2)** are independent of everything and cheap.
   Good filler work.

### Not in scope

- Engine internals stay untouched (04 §8) — interned paths, `DirtyChannel`,
  skeleton diff, leaf-only recording.
- Large-state scaling (02 §7, 04 §7) stays deferred until a real workload hits
  it.

### What this needs before starting

R2 changes dispose semantics and R3 changes when side effects run. Both are
the kind of change where example-based tests pass and production breaks.
Before R2 I would want fuzz coverage over acquire/release/dispose
interleavings — that is a prerequisite task, not part of R2 itself.
