# 01 — `PathInterner`

**Phase:** 1 (parallel — owns disjoint files from other Phase 1 tasks)
**Model:** Haiku 4.5
**Effort:** low (one Map, one counter, two methods)
**Estimated touch:** 2 files

---

## Goal

Implement `PathInterner` — a per-class string-to-integer interner so paths through state (`"user.email"`, `"items.5.name"`) can be compared as small integers and stored in compact sets.

One interner per container class (not per instance). All instances of a given container class share path IDs, so `state.user.email` is the same `PathId` across instances.

---

## Inputs — read these first

1. `dirtytalk/03-blac.md` § "PathId interning" — defines the algorithm and the per-class lifetime decision.
2. `packages/dirtytalk-structural/src/path-interner.ts` — current stub. Replace its body.
3. `packages/dirtytalk-structural/src/types.ts` — `PathId` is defined here as `number`. Import it.
4. `~/.claude/CLAUDE.md` — commit format.

---

## Owned files (write set)

```
packages/dirtytalk-structural/src/path-interner.ts        (replace stub body)
packages/dirtytalk-structural/src/path-interner.test.ts   (create)
```

**Do not touch:**

- `src/path-set.ts` / `.test.ts` (owned by `01-path-set`)
- `src/tracker.ts`, `src/diff.ts`, `src/container.ts`, `src/react-hook.ts`
- `src/index.ts`, `src/react.ts`, `src/types.ts`
- `README.md` (owned by `01-readme`)
- `package.json`, `tsconfig*.json`, `vite.config.ts` (locked by Phase 0)

If any of those need editing, stop and report.

---

## Spec

### Interface (must match these signatures exactly)

```ts
export class PathInterner {
  intern(path: string): PathId; // returns the id; creates on first call, idempotent thereafter
  lookup(id: PathId): string; // returns the original string; throws if id is unknown
  get size(): number; // number of distinct paths interned so far
}
```

### Behaviour

- `intern("a.b")` called twice returns the same `PathId`.
- Distinct strings get distinct IDs.
- `intern` is `O(1)` amortised (Map lookup + optional insert).
- IDs are assigned monotonically from `0` (no gaps unless a future API deletes; v1 has no delete).
- `lookup(id)` returns the original string for any ID returned from `intern`. For an unknown ID (negative, fractional, ≥ `size`), throw `RangeError` with a clear message — this is a developer error, not user input.
- `size` reflects the number of `intern` calls that created a new entry (not the number of total `intern` calls).

### Implementation notes

- Storage: one `Map<string, PathId>` for `intern`, one `string[]` for `lookup` indexed by ID. Two parallel structures so each direction is `O(1)`.
- `next` counter is implicit in the array's `length` — don't keep a separate counter; just `push` to grow.
- No interning across instances of `PathInterner` — each instance is its own namespace. (One instance per container class is a _consumer_ convention, not enforced here.)
- No string normalisation: `"a.b"` and `"a..b"` are distinct keys. The caller produces canonical path strings; the interner is a dumb cache.

---

## Tests — `src/path-interner.test.ts`

Use `vite-plus/test` imports (per `~/.claude` memory: `vite-plus/test`, not bare globals).

```ts
import { describe, expect, it } from 'vite-plus/test';
import { PathInterner } from './path-interner';
```

Required cases (one `describe` block, one `it` per case):

1. **Idempotent intern** — `intern("a.b")` called twice returns the same number.
2. **Distinct strings → distinct IDs** — `intern("a")` ≠ `intern("b")`.
3. **Monotonic IDs starting at 0** — first three interns produce `[0, 1, 2]` in call order.
4. **`lookup` round-trips** — for several interned strings, `lookup(intern(s)) === s`.
5. **`lookup` of unknown ID throws `RangeError`** — including negative, fractional, and `>= size` cases.
6. **`size` reflects unique interns** — three calls to `intern` with two unique strings → `size === 2`.
7. **Independent instances** — two `PathInterner` instances assigning IDs independently; same string can have different IDs across instances. (One-line: `expect(new PathInterner().intern('x')).toBe(0); expect(new PathInterner().intern('x')).toBe(0);` and confirm they're different _instances_.)

Aim for short, focused tests. No mocking, no fixtures.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.**
   - `git status` clean. If dirty, stop and report.
   - `packages/dirtytalk-structural/src/path-interner.ts` exists with a "not implemented" stub. If missing, Phase 0 didn't land — stop and report.

2. **Implement.** Replace the stub with the real implementation. ~20 lines.

3. **Verify.**
   - From `packages/dirtytalk-structural/`: `vp run typecheck`.
   - `vp run lint`.
   - `vp run format:check`.

4. **Test.**
   - `vp run test src/path-interner.test.ts` — your file must pass.
   - `vp run test` — full package suite must still pass (the other stubs are unchanged, so this is mostly a no-op).

5. **Commit.**

   ```
   feat(dirtytalk-structural): implement PathInterner
   ```

   No body. No co-author.

---

## Acceptance criteria

- [ ] `PathInterner` exports class with `intern`, `lookup`, `size` matching the spec.
- [ ] `intern` is idempotent and IDs are monotonic from 0.
- [ ] `lookup` round-trips; unknown ID throws `RangeError`.
- [ ] Tests in `path-interner.test.ts` cover every case listed above and pass.
- [ ] `vp run {typecheck,lint,format:check,test}` all green.
- [ ] No changes outside the owned write set.

---

## Pitfalls

- **Don't use a `next` field separate from the array length.** Two sources of truth drift. `array.push(path); return array.length - 1;` is the move.
- **Don't try to "share" the interner across instances** by hoisting it to a module global. Per-instance is the contract; the per-class lifetime is a _caller-side_ convention.
- **`Object.create(null)` for the Map.** Unnecessary — `Map` doesn't have prototype-pollution risk like a plain `{}` would.
- **Don't add a `forget()` / delete API.** Out of scope. IDs are append-only.
- **Don't export `PathId`** from this file — it lives in `src/types.ts`. Just `import type { PathId } from './types'`.
- **Avoid premature bitset talk.** PathSet representation is `01-path-set`'s job. Here, just produce numbers.
