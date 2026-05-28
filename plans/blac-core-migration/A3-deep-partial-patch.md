# A3 — `DeepPartial<S>` for `StructuralContainer.patch`

**Phase:** A (parallel after A0; safe alongside A1, A2)
**Model:** Sonnet 4.6
**Effort:** low (one type alias + signature change + 2-3 test cases)
**Estimated touch:** 2 files

---

## Goal

Today `StructuralContainer<S>.patch(partial: Partial<S>)` forces callers to cast when patching nested state (e.g. `container.patch({ user: { name: 'x' } } as Partial<S>)`). This was flagged in the Phase 3 retrospective of the structural plan.

Replace `Partial<S>` with `DeepPartial<S>` so nested patches type-check without casts. `pathsFromPatch` already handles nested objects at runtime — this is purely a TS ergonomics fix.

---

## Inputs — read these first

1. `packages/dirtytalk-structural/src/container.ts` — current `patch` signature.
2. `packages/dirtytalk-structural/src/container.test.ts` — see the test comment flagging the cast workaround.
3. `packages/dirtytalk-structural/src/diff.ts` — `pathsFromPatch` runtime behavior (informs the TS shape).
4. `~/.claude/CLAUDE.md` — commit format.

---

## Spec

Add a `DeepPartial<T>` helper. Standard shape:

```ts
export type DeepPartial<T> =
  T extends ReadonlyArray<infer U>
    ? ReadonlyArray<DeepPartial<U>>
    : T extends Date | Map<unknown, unknown> | Set<unknown> | RegExp
      ? T
      : T extends object
        ? { [K in keyof T]?: DeepPartial<T[K]> }
        : T;
```

Arrays are left as `ReadonlyArray<DeepPartial<U>>` because `pathsFromPatch` treats arrays as leaves (no per-index expansion), but TS users still write `{ items: [...] }`.

Update `StructuralContainer<S>.patch` signature:

```ts
patch(partial: DeepPartial<S>): void
```

Runtime behavior unchanged — `pathsFromPatch` already walks plain-object branches and treats class instances / arrays / Date / Map / Set as leaves.

**Tests must cover:**
1. Nested object patch type-checks without cast: `container.patch({ user: { name: 'x' } })`.
2. Array replacement type-checks: `container.patch({ items: [1, 2] })`.
3. Top-level primitive patch type-checks: `container.patch({ count: 5 })`.
4. Wrong-typed patch fails type-check (write a `@ts-expect-error` test).
5. Existing runtime tests still pass — `DeepPartial` is a type-only change.

---

## Owned files (write set)

```
packages/dirtytalk-structural/src/container.ts        (DeepPartial helper + patch signature)
packages/dirtytalk-structural/src/container.test.ts   (add 4 new test cases)
```

Optional: if you want to export `DeepPartial` publicly (so `@blac/core` can reuse it in Phase C), add it to `src/index.ts` as a type export. Otherwise keep it internal.

**Do not touch:** any file outside the two above.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean (relative to A0).
   - `StructuralContainer.patch` currently takes `Partial<S>` — verify.

2. **Implement.**
   - Add `DeepPartial<T>` type definition near the top of `container.ts` (or in `types.ts` if you prefer; coordinate the export decision with the public-API recommendation above).
   - Change `patch`'s parameter type.
   - Update the existing in-file JSDoc on `patch` to note "deep-partial: nested object branches are accepted".
   - Add the 4 new test cases.

3. **Verify.**
   - `vp run typecheck` from `packages/dirtytalk-structural/`.
   - `vp run lint`.
   - `vp run format:check`.

4. **Test.**
   - `vp run test src/container.test.ts` — new cases pass.
   - `vp run test` — full suite still 107/107.

5. **Commit.**

   ```
   feat(dirtytalk-structural): use DeepPartial<S> for patch signature
   ```

   No body unless you choose to export `DeepPartial` — then a one-line body explaining the public-API decision.

---

## Acceptance criteria

- [ ] `DeepPartial<T>` defined.
- [ ] `patch(partial: DeepPartial<S>): void` signature on `StructuralContainer`.
- [ ] Nested patch test passes without `as Partial<S>` cast.
- [ ] Existing runtime tests unchanged.
- [ ] `vp run test` full structural suite still green.

---

## Pitfalls

- **Don't deep-partial through arrays element-wise.** `pathsFromPatch` treats arrays as leaves; TS should match the runtime. Use `ReadonlyArray<DeepPartial<U>>` only so `[1, 2]` literals type-check, not so individual element shapes are partialised.
- **`Date | Map | Set | RegExp` carve-out** — without it, TS treats these as objects and tries to partial their internal structure. Be explicit.
- **Function-valued state fields** — if `S` has `() => void` somewhere, `DeepPartial` should keep them as-is. The shape above accomplishes that because `function` isn't `object` in TS's structural sense (it is at runtime, but not in conditional types here).
- **Don't export `DeepPartial` publicly without coordinating.** If Phase C plans to expose it via `@blac/core`, the structural export becomes the source of truth. If unsure, keep it module-local and let C0 re-declare its own.
