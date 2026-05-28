# A1 — Hoist `PathInterner` to per-class in `@dirtytalk/structural`

**Phase:** A (parallel after A0; safe alongside A2, A3)
**Model:** Sonnet 4.6
**Effort:** medium (touches structural internals; static registry needs care under StrictMode + HMR)
**Estimated touch:** 2 files

---

## Goal

Today `PathInterner` is instantiated **per `StructuralContainer` instance**. The spec calls for **per-class** interning so that all instances of `UserCubit` share path IDs and the interner doesn't grow unboundedly across instance churn.

Land that change inside `@dirtytalk/structural` so that when `@blac/core` rewires onto it in Phase C0, the per-class semantics are already correct. This is the only structural change Phase A makes; the rest of the package surface stays put.

---

## Inputs — read these first

1. `packages/dirtytalk-structural/src/path-interner.ts` — current per-instance implementation.
2. `packages/dirtytalk-structural/src/container.ts` — where `this._interner = new PathInterner()` happens. Read the constructor.
3. `dirtytalk/03-blac.md` § "`PathId` interning" — spec for per-class.
4. `packages/dirtytalk-structural/src/path-interner.test.ts` — existing tests; preserve their semantics, add new ones for class-sharing.
5. `~/.claude/CLAUDE.md` — commit format.

---

## Spec

Add a static accessor on `StructuralContainer` that returns a per-class interner, lazily created:

```ts
abstract class StructuralContainer<S> {
  // private static map from class constructor → interner
  static getInternerFor(ctor: Function): PathInterner { ... }
  // instance accessor — returns the per-class interner
  get interner(): PathInterner {
    return StructuralContainer.getInternerFor(this.constructor);
  }
}
```

Use a `WeakMap<Function, PathInterner>` so unmounted classes can be GC'd (matters for hot module reload).

**Tests must cover:**
1. Two instances of the same class share the same interner.
2. Two instances of different subclasses get different interners.
3. The base class itself doesn't accumulate paths from subclasses (each subclass keys independently).
4. After GC of all instances of a class, the interner is reclaimable (don't write a real GC test — just assert the registry uses `WeakMap`, not `Map`).
5. Existing per-instance test cases still pass against the new semantic (paths get reset across class boundaries, not instance boundaries).

---

## Owned files (write set)

```
packages/dirtytalk-structural/src/path-interner.ts      (no internal change needed; export stays)
packages/dirtytalk-structural/src/container.ts          (add static registry + accessor)
packages/dirtytalk-structural/src/container.test.ts     (add per-class tests)
packages/dirtytalk-structural/src/path-interner.test.ts (no change expected; verify still green)
```

**Do not touch:** any file outside `packages/dirtytalk-structural/src/`.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean (allowing A0's commit to be the only change since the last clean point).
   - On branch `main` or feature branch; do not switch.
   - A0 has committed (`vp install` works at root). If not, stop.

2. **Implement.**
   - Add `private static _interners = new WeakMap<Function, PathInterner>()` to `StructuralContainer`.
   - Add `static getInternerFor(ctor)` method.
   - Replace the per-instance `this._interner = new PathInterner()` with the static accessor.
   - Confirm the `get interner()` accessor returns the per-class one.

3. **Verify.**
   - `vp run typecheck` from `packages/dirtytalk-structural/`.
   - `vp run lint`.
   - `vp run format:check`.

4. **Test.**
   - `vp run test src/container.test.ts` — new per-class tests pass.
   - `vp run test` (full package suite) — all 107 prior tests still pass.

5. **Commit.**

   ```
   feat(dirtytalk-structural): hoist PathInterner to per-class
   ```

   Body (optional):
   ```
   Per dirtytalk/03-blac.md interner spec: paths interned per-class via
   WeakMap<Function, PathInterner>, not per-instance. Enables Bloc classes
   in @blac/core to share path IDs across instances.
   ```

---

## Acceptance criteria

- [ ] `StructuralContainer.getInternerFor(ctor)` exists and is the source of truth.
- [ ] `new MyCubit().interner === new MyCubit().interner` for same class.
- [ ] `new A().interner !== new B().interner` for different classes.
- [ ] All existing structural tests still pass.
- [ ] No public-API rename or breaking signature (`interner` getter stays as-is).

---

## Pitfalls

- **`WeakMap` keys must be objects (constructors are objects)** — direct class references work fine. Don't pass `ctor.name`.
- **HMR will replace class identities.** During dev reloads, the new class is a different reference and gets a fresh interner. That's correct behavior; don't try to key by `name`.
- **Static fields in TypeScript class bodies** can hit "used before declared" if the constructor reads them. Keep the static initialization eager (`static _interners = new WeakMap()`).
- **`Object.getPrototypeOf(this).constructor`** is the safe way to get the runtime class. `this.constructor` works in practice but TS narrows it to `Function`; cast or type as `typeof StructuralContainer`.
- **Don't expose a public reset.** Tests will be tempted to ask for a `clearInterners()` for isolation; resist. Tests should use a fresh subclass.
