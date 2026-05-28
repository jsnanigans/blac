# 02 — Proxy path tracker (`trackRender`)

**Phase:** 2 (parallel with `02-diff`; sequential after all of Phase 1 commits)
**Model:** Opus 4.7
**Effort:** high (Proxy semantics, recursive wrapping, dynamic-access coarsening)
**Estimated touch:** 2 files

---

## Goal

Implement `trackRender<S>(state: S, interner: PathInterner): { value: S; paths: PathSet }`.

`trackRender` wraps `state` in a `Proxy` (recursively, lazily on access) such that every property read records a `PathId` into a freshly-allocated `PathSet`. The returned `value` is the proxy; consumers (React components, selectors) use it like the real object. The `paths` are what the consumer's render touched, used by `StructuralContainer.registerConsumerPaths`.

This module is the **recording** half of structural diffing. The diffing half lives in `02-diff`.

---

## Inputs — read these first

1. `dirtytalk/03-blac.md` § "Recording: per-consumer path sets" and § "Conditional reads and the 'every render' rule" — the full contract.
2. `dirtytalk/03-blac.md` § "Caveats and limitations" — explicitly enumerates which read patterns coarsen vs which are exact.
3. `packages/dirtytalk-structural/src/path-interner.ts` — the `intern` API (assume Phase 1 has landed).
4. `packages/dirtytalk-structural/src/path-set.ts` — `emptyPathSet`, `PathSet` shape.
5. `packages/dirtytalk-structural/src/tracker.ts` — current stub.
6. (Reference, not required to read in depth) `packages/blac-core/src/*tracker*.ts` — the existing implementation in `@blac/core`. **Read for inspiration, do not copy** — the existing tracker mixes value-comparison and other concerns we're discarding here.
7. `~/.claude/CLAUDE.md` — commit format.

---

## Owned files (write set)

```
packages/dirtytalk-structural/src/tracker.ts        (replace stub body)
packages/dirtytalk-structural/src/tracker.test.ts   (create)
```

**Do not touch:** `path-interner.ts`, `path-set.ts`, `diff.ts`, `container.ts`, `react-hook.ts`, barrels, configs. If `path-interner.ts` or `path-set.ts` has unimplemented stubs, Phase 1 didn't land — **stop and report**, don't paper over.

---

## Spec

### Signature

```ts
export interface TrackResult<S> {
  value: S;
  paths: PathSet;
}

export const trackRender = <S>(state: S, interner: PathInterner): TrackResult<S>;
```

### Behaviour

1. Returns a fresh `paths: Set<PathId>` (never `ALL_PATHS` from this function — that sentinel is for source-side signalling).
2. `value` is a `Proxy` over `state`. The proxy is recursive: reading a nested object/array returns a proxy that records into the same `paths` set with the longer path.
3. Path strings use **dot notation** with array indices as numeric strings: `"users.5.email"`, `"items.0"`, `"settings.theme"`. The root has no prefix; a top-level read of `state.count` records `"count"`.
4. Path recording happens on the `get` trap, **only for own enumerable properties** of the underlying object. Method calls (`.find`, `.map`, etc.) read the method off the prototype and don't record; what they then read off `this` *does* record (because it's a `get` on the proxy).
5. Iteration via `for…of` / `Symbol.iterator` records the collection root (e.g., reading `state.users` for iteration records `"users"`).
6. Dynamic-access patterns coarsen. `state.users.find(u => u.active)` records `"users"` (the entry point); the per-element reads inside the callback go through unwrapped values, so individual indices aren't recorded. This is the documented limitation.
7. Primitives are returned as-is (no proxy). Reading `state.count` records `"count"` and returns the number.
8. `null` and `undefined` are returned as-is.
9. Functions/methods: returning a bound function is fine if needed for `this` correctness, but most reads in render closures hit data, not methods. For correctness, return the function with `this` bound to the proxied parent so internal `this.x` reads continue to record.

### Caching the proxy per branch

For identity stability across multiple reads of the same nested object (so `state.user === state.user` inside a render), cache the proxy keyed on the underlying object via a `WeakMap` scoped to this `trackRender` call. The cache is short-lived (one render closure) and dies with the function frame.

```ts
const proxyByTarget = new WeakMap<object, unknown>();
```

Cache hit returns the existing proxy; cache miss creates a new one. **Important:** the cache is per `trackRender` call, not module-global — across renders, fresh caches let each render see fresh recordings.

### Path concatenation

```ts
const childPath = (parent: string, key: string): string =>
  parent === '' ? key : `${parent}.${key}`;
```

Don't use Array+join — concatenation is the hot path.

### Skeleton case: empty state object

If `state` is `null`, `undefined`, or a primitive, return `{ value: state, paths: emptyPathSet() }`. No proxy needed.

---

## Edge cases to test (and respect)

### 1. Property identity preservation

```ts
const { value, paths } = trackRender({ user: { name: 'a' } }, interner);
expect(value.user).toBe(value.user); // same proxy returned both times
```

### 2. Path strings are correctly nested

```ts
const { value, paths } = trackRender(
  { user: { profile: { email: 'a@b' } } },
  interner,
);
void value.user.profile.email;
expect(asPathStrings(paths, interner)).toEqual(['user', 'user.profile', 'user.profile.email']);
```

Each intermediate read records its own path; this is intentional — a change at any level of the ancestry must wake the consumer.

### 3. Array index reads

```ts
void value.items[2].name;
expect(asPathStrings(paths, interner)).toContain('items');
expect(asPathStrings(paths, interner)).toContain('items.2');
expect(asPathStrings(paths, interner)).toContain('items.2.name');
```

### 4. Array iteration coarsens

```ts
const total = value.items.reduce((sum, it) => sum + it.price, 0);
// Records 'items' (the entry); does NOT record 'items.0', 'items.1', etc.
```

Inside the callback, `it` is the unwrapped underlying object (or a freshly-bound proxy if you choose to wrap on iteration — see "Implementation choices" below). Choose the simpler interpretation: iteration unwraps. Document it; tests exercise it.

### 5. Conditional reads only record the taken branch

```ts
const { paths } = trackRender({ a: 1, b: 2 }, interner);
const x = condition ? value.a : value.b;
// Only ONE of 'a' or 'b' is recorded, depending on `condition`.
```

### 6. Re-reads don't re-record

```ts
void value.a;
void value.a;
void value.a;
expect(paths.size).toBe(1); // single PathId, even though read 3 times
```

The `Set` semantics handle this automatically.

### 7. Primitives don't proxy

```ts
expect(typeof value.count).toBe('number');
expect(value.count).toBe(state.count); // identity for primitives
```

### 8. `null` / `undefined` don't trap

```ts
const { value } = trackRender({ maybe: null as null | { x: number } }, interner);
expect(value.maybe).toBeNull();
// `value.maybe.x` would throw; that's caller error, same as plain JS.
```

### 9. Per-call cache isolation

Two `trackRender` calls over the same underlying object produce independent proxies — they don't share the cache, and one's recordings don't leak into the other.

---

## Implementation choices to make (and document with one comment each)

- **Iteration:** unwrap-on-iterate (callbacks receive raw values). One-line comment: `// iteration coarsens — records entry point only (spec § Caveats)`.
- **Method binding:** for any property whose value is a function and whose containing object isn't an array, return `fn.bind(proxy)` so `this` stays inside the tracked tree. Don't bind on arrays — their prototype methods (`.map`, `.find`) explicitly accept the array as receiver via the engine's iteration protocol, and binding would break it.
- **Symbol keys:** ignore. Don't record paths for symbol property reads.
- **Non-enumerable / inherited props:** don't record. Use `Reflect.has(target, key)` + `Object.prototype.hasOwnProperty.call`? Cheaper: `key in target && !Object.prototype.hasOwnProperty.call(target, key)` filters inherited. For most state objects this never triggers, so don't over-engineer.

---

## Tests — `src/tracker.test.ts`

Cover all nine edge cases above. Provide a small helper at the top of the file:

```ts
import { describe, expect, it } from 'vite-plus/test';
import { PathInterner } from './path-interner';
import { trackRender } from './tracker';
import type { PathSet } from './path-set';

const asPathStrings = (paths: PathSet, interner: PathInterner): string[] => {
  if (!(paths instanceof Set)) throw new Error('expected Set, got ALL_PATHS');
  return [...paths].map((id) => interner.lookup(id)).sort();
};
```

Each `it` block exercises one edge case. Use real `PathInterner` instances (one per test where appropriate).

Additional tests:

10. **Read after consumer-returned proxy escapes scope.** Returning the proxy from `trackRender` and reading it later (e.g., inside a `useEffect`) still records into the same `paths` set. Verify that timing — paths grow as reads happen, not at `trackRender` call time.
11. **Reading a method without invoking** (e.g., `value.items.map`) does *not* record `items.map` as a path — `map` lives on the prototype, not on the array itself.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean.
   - All four Phase 1 commits visible in `git log packages/dirtytalk-structural/` (scaffold + interner + path-set + readme; readme may be unsigned).
   - `path-interner.ts` and `path-set.ts` do **not** contain "not implemented" anywhere (`grep "not implemented" src/path-interner.ts src/path-set.ts` returns empty). If they do, **stop and report** — Phase 1 isn't done.

2. **Implement.** Replace the stub in `tracker.ts`. ~80 lines. Add a single TSDoc block on `trackRender` summarising the recording rules and the documented coarsening.

3. **Verify.** From `packages/dirtytalk-structural/`: `vp run typecheck`, `vp run lint`, `vp run format:check`.

4. **Test.**
   - `vp run test src/tracker.test.ts` — passes.
   - `vp run test` — full suite green.

5. **Commit.**

   ```
   feat(dirtytalk-structural): implement Proxy path tracker
   ```

   No body. No co-author.

---

## Acceptance criteria

- [ ] `trackRender` exported with the spec'd signature.
- [ ] All 11 test cases pass.
- [ ] Returned `paths` is a `Set<PathId>` (never `ALL_PATHS`).
- [ ] Identity preserved for repeated reads of the same nested branch.
- [ ] Iteration coarsens to the entry path (documented in code comment).
- [ ] `vp run {typecheck,lint,format:check,test}` green.
- [ ] No changes outside owned write set.

---

## Pitfalls

- **Don't pre-walk `state` at `trackRender` call time** to populate the proxy cache. Lazy on-access is the contract; eager walking explodes for deep state and would record paths the consumer never reads.
- **Don't return the underlying object on `get`** if it's an object — wrap it. Otherwise nested reads escape tracking.
- **Don't wrap arrays of primitives differently from arrays of objects.** A `for (const x of value.tags)` where `tags: string[]` should still record `"tags"` and *not* `"tags.0"`, `"tags.1"`. (Iteration coarsens — entries are unwrapped.)
- **`Proxy` `ownKeys`/`getOwnPropertyDescriptor` traps:** don't bother. Default behaviour is correct unless you're handling `Object.keys` recording — and that's an over-record case we don't want to introduce (would mark every key dirty when the consumer just iterates).
- **Don't record `Symbol(...)` paths.** Filter `typeof key === 'symbol'` in `get`. Affects `Symbol.iterator`, `Symbol.toStringTag`, etc.
- **Don't share the per-call cache between `trackRender` calls.** It must die with the function frame — module-global caching causes recordings to bleed across renders.
- **Don't use a `Map` for the per-call cache.** Use `WeakMap` so the proxy GC'd when the target goes out of scope.
- **Don't try to handle in-place mutation correctness.** If a caller mutates state through the proxy, behaviour is undefined — this is consistent with `03-blac.md` § "Caveats" and matches today's tracker.
- **Don't optimise for "selectors" yet.** No `select(fn)` API here; that's a container-level concern.
- **Don't write a value-comparison path.** This module records *what was read*. The diff happens elsewhere. Keep recording orthogonal to diffing.
