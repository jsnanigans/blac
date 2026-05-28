# 02 — Diff helpers (`diffAlongSkeleton`, `pathsFromPatch`, `getAt`)

**Phase:** 2 (parallel with `02-tracker`; sequential after all of Phase 1 commits)
**Model:** Opus 4.7
**Effort:** high (skeleton-walk diff correctness, nested patch flattening, custom-equality hook foreshadowing)
**Estimated touch:** 2 files

---

## Goal

Implement the source-side diffing utilities that turn a state change into a `PathSet`:

- `diffAlongSkeleton(prev, next, skeleton, interner)` — for `emit`/`update`, walk only paths the observed skeleton cares about; emit those whose values changed.
- `pathsFromPatch(patch, interner, basePath?)` — for `patch`, flatten the patch object tree into dotted paths and intern them.
- `getAt(state, path)` — read a value at a dotted path, returning `undefined` for missing intermediates.

These are pure functions; no I/O, no state.

---

## Inputs — read these first

1. `dirtytalk/03-blac.md` § "Diffing at emit / patch / update" — full spec including `patch` (free, exact) vs `emit`/`update` (skeleton diff).
2. `dirtytalk/03-blac.md` § "Caveats and limitations" — what coarsens, what doesn't.
3. `dirtytalk/03-blac.md` § "Decisions" #3 (custom equality per path — "in scope for v1"). We'll wire a hook here but not the full config surface (that's container-level).
4. `packages/dirtytalk-structural/src/path-interner.ts` — `intern`, `lookup`.
5. `packages/dirtytalk-structural/src/path-set.ts` — `emptyPathSet`, `PathSet`, `ALL_PATHS`.
6. `packages/dirtytalk-structural/src/diff.ts` — current stub.
7. `~/.claude/CLAUDE.md` — commit format.

---

## Owned files (write set)

```
packages/dirtytalk-structural/src/diff.ts        (replace stub body)
packages/dirtytalk-structural/src/diff.test.ts   (create)
```

**Do not touch:** `path-interner.ts`, `path-set.ts`, `tracker.ts` (parallel task), `container.ts`, `react-hook.ts`, barrels, configs.

Verify before starting: `path-interner.ts` and `path-set.ts` do **not** contain `"not implemented"`. If they do, Phase 1 isn't done — stop and report.

---

## Spec

### `getAt(state, path)`

```ts
export const getAt = (state: unknown, path: string): unknown;
```

- `path` is a dotted string: `"a"`, `"a.b"`, `"users.5.email"`.
- Splits on `.` and walks the object. Numeric segments index arrays (the same dot-notation works for both — `users["5"]` and `users[5]` are equivalent at runtime in JS).
- Returns `undefined` for any missing intermediate (don't throw).
- Empty path `""` returns `state` itself (used by `diffAlongSkeleton` for root-level comparisons; not exposed outside this module, but the contract is defined).
- No prototype walking: only own properties. Use a bracket-access `as Record<string, unknown>` cast and check existence with `key in obj` — but only for objects, not primitives.

### `diffAlongSkeleton(prev, next, skeleton, interner)`

```ts
export const diffAlongSkeleton = <S>(
  prev: S,
  next: S,
  skeleton: PathSet,
  interner: PathInterner,
  equalsAt?: (pathId: PathId, prev: unknown, next: unknown) => boolean,
): PathSet;
```

- If `skeleton === ALL_PATHS`, return `ALL_PATHS` immediately. (The skeleton can never be `ALL_PATHS` in normal flow, but defensive correctness.)
- If `skeleton` is empty, return `emptyPathSet()` without iterating.
- Otherwise, for each `PathId` in the skeleton:
  1. `pathStr = interner.lookup(id)`.
  2. `pv = getAt(prev, pathStr)`; `nv = getAt(next, pathStr)`.
  3. `eq = equalsAt ? equalsAt(id, pv, nv) : Object.is(pv, nv)`.
  4. If `!eq`, add `id` to the result.
- Returns a fresh `Set<PathId>`.

**On the `equalsAt` parameter:** this is the hook for the "custom equality per path" config promised in `03-blac.md` § Decision 3. The container layer (`03-container`) will plumb a per-path-pattern config through to this hook. This module just exposes the hook — concrete config matching is container-level.

### `pathsFromPatch(patch, interner, basePath?)`

```ts
export const pathsFromPatch = <S>(
  patch: Partial<S>,
  interner: PathInterner,
  basePath?: string,
): PathSet;
```

- Walk the patch tree depth-first. For each leaf key, intern the dotted path and add to the result set. Non-leaf branches (plain objects) also add themselves: a patch of `{ user: { email: 'x' } }` records *both* `"user"` and `"user.email"` (consumers of the parent path must wake up too).
- Arrays in a patch are treated as **leaves** — i.e., a `patch({ items: [...] })` records `"items"`, not per-index entries. Arrays are atomic replacements in patch semantics.
- `null` / `undefined` values are leaves.
- `basePath` defaults to `""`. Used internally for recursion; not typically passed by callers.

### Plain-object detection

```ts
const isPlainPatchObject = (v: unknown): v is Record<string, unknown> =>
  v !== null &&
  typeof v === 'object' &&
  !Array.isArray(v) &&
  (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
```

Class instances are leaves (patching with a class instance replaces the whole branch). This matches the principle of least surprise.

---

## Edge cases to test

### `getAt`

1. Empty path returns the state itself.
2. Top-level key (`"a"`) on `{a: 1}` returns `1`.
3. Nested object (`"user.email"`) returns the leaf.
4. Array index (`"items.2"`) returns the element.
5. Missing intermediate (`"a.b.c"` on `{a: 1}`) returns `undefined` (not throw).
6. Path into a `null` value returns `undefined`.
7. Path into a primitive returns `undefined`.

### `diffAlongSkeleton`

8. Empty skeleton → empty result, regardless of prev/next.
9. Skeleton = `{ 'a' }`, prev `{a:1}`, next `{a:2}` → result contains `intern('a')`.
10. Skeleton = `{ 'a' }`, prev `{a:1}`, next `{a:1}` → empty result.
11. Skeleton = `{ 'a', 'b' }`, prev `{a:1,b:2}`, next `{a:1,b:3}` → result contains only `intern('b')`.
12. Object identity counts as equal: `prev.user === next.user` ⇒ no entries for `user.*` paths (we walk by path, so each path is checked independently; identical sub-tree refs hash equal at the leaves we're inspecting). Test by sharing a subtree across prev/next.
13. `ALL_PATHS` skeleton returns `ALL_PATHS`.
14. Custom `equalsAt`: pass an `equalsAt` that always returns `true` and verify the result is empty even when values differ.
15. Custom `equalsAt` is called with the `PathId` plus the two values; verify by inspecting calls.
16. `NaN` values: default `Object.is` treats `NaN === NaN` ⇒ no entry. Verify.

### `pathsFromPatch`

17. Flat patch: `{ a: 1, b: 2 }` → paths include `'a'` and `'b'`.
18. Nested patch: `{ user: { email: 'x' } }` → paths include both `'user'` and `'user.email'`.
19. Array leaf: `{ items: [1, 2, 3] }` → paths includes `'items'`, NOT `'items.0'`.
20. Class instance leaf: `{ date: new Date() }` → paths includes `'date'`, no inner walk.
21. `null` leaf: `{ user: null }` → paths includes `'user'`, no further walk.
22. Empty patch `{}` → empty result.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean.
   - Phase 0 + Phase 1 commits visible.
   - `grep "not implemented" src/path-interner.ts src/path-set.ts` returns empty. If not, **stop and report**.
   - If a parallel `02-tracker` agent has uncommitted changes, **stop and report**. (Both Phase 2 tasks must commit independently.)

2. **Implement.** ~70 lines including the helper predicate. TSDoc on each public export.

3. **Verify.** `vp run typecheck`, `vp run lint`, `vp run format:check`.

4. **Test.**
   - `vp run test src/diff.test.ts` — your tests pass.
   - `vp run test` — full suite green.

5. **Commit.**

   ```
   feat(dirtytalk-structural): implement skeleton diff + patch path flattening
   ```

   No body. No co-author.

---

## Acceptance criteria

- [ ] `diffAlongSkeleton`, `pathsFromPatch`, `getAt` exported with spec'd signatures.
- [ ] `equalsAt` hook is positional, optional, and used when present.
- [ ] All 22 test cases pass.
- [ ] Pure functions: no I/O, no mutation of inputs.
- [ ] `vp run {typecheck,lint,format:check,test}` green.
- [ ] No changes outside owned write set.

---

## Pitfalls

- **Don't make `getAt` throw on missing intermediates.** Returning `undefined` lets the caller (and the equality check) decide. Throwing makes `diffAlongSkeleton` blow up on legitimate skeleton entries that no longer exist after a partial state delete.
- **Don't auto-strip `__proto__` / inherited props in `getAt`.** Bracket access already won't reach prototype methods for typical state shapes; over-defending costs and doesn't catch realistic bugs.
- **`pathsFromPatch` must include intermediate paths.** A consumer of `"user"` must wake when `patch({ user: { email: 'x' } })` runs — even if it doesn't read `user.email` itself. Tree-pulses-up-the-chain semantics.
- **Don't treat all objects as recursable in `pathsFromPatch`.** Class instances, Maps, Sets, Dates are leaves. Test with `Date` to make the boundary obvious.
- **Don't write a "deep equals" for `equalsAt`'s default.** Default is `Object.is` — *reference equality* on objects. The whole point of immutable update is that consumers can rely on `===` to fast-skip. Writing a recursive deep-equals defeats that contract and is the wrong default.
- **Don't intern paths greedily.** Only intern paths you're returning. If `equalsAt` says "equal", the path is *not* in the result and shouldn't get an ID. (Wait — but `interner.intern(pathStr)` is idempotent and cheap; calling it eagerly is fine. The real cost is in the map size growing. For v1, eager intern is acceptable since the skeleton's path IDs are already interned by the tracker.)
- **Avoid coupling to `container.ts`.** This module knows nothing about Containers. It takes a `PathInterner` and a `PathSet`. The container plumbs them in.
- **Path strings here must match the tracker's emitted format exactly.** Dot-separated. No leading dot. Array indices as numeric strings. If the tracker and diff disagree on format, the skeleton walk silently misses changes. Add at least one test that uses paths *produced by the tracker* (use a real `trackRender` call to populate `skeleton`, then diff — this is the cross-module sanity check before integration).
