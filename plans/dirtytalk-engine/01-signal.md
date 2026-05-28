# 01 — Implement `Signal<T>` + `Observable<T>`

**Phase:** 1 (parallel — runs after Phase 0)
**Model:** Haiku 4.5
**Effort:** low
**Estimated touch:** 2 files

---

## Goal

Replace the stubbed `Signal` in `src/primitives.ts` with the real implementation, and add focused unit tests in `src/primitives.test.ts`.

---

## Inputs — read these first

1. `dirtytalk/01-engine.md` § **Layer 1 — Notification primitives** (the only spec section that matters here).
2. `packages/dirtytalk-engine/src/primitives.ts` — current stub (created by Phase 0).
3. `~/.claude/CLAUDE.md` — commit format.

---

## Owned files (your exclusive write set)

```
packages/dirtytalk-engine/src/primitives.ts       (REPLACE the stub body)
packages/dirtytalk-engine/src/primitives.test.ts  (CREATE)
```

## Do not touch

```
packages/dirtytalk-engine/src/index.ts            (Phase 0 owns the exports)
packages/dirtytalk-engine/src/space.ts
packages/dirtytalk-engine/src/scheduler.ts        (01-schedulers owns it)
packages/dirtytalk-engine/src/dirty-channel.ts    (01-dirty-channel owns it)
packages/dirtytalk-engine/package.json
packages/dirtytalk-engine/vite.config.ts
```

If you find you need to change `index.ts` to expose something, **stop and report** — the surface was already locked by Phase 0.

---

## Implementation spec

### `Observable<T>` (already final in stub)

```ts
export interface Observable<T> {
  peek(): T;
  subscribe(cb: (value: T) => void): () => void;
}
```

Keep this exactly as Phase 0 wrote it. The interface is the contract.

### `Signal<T>`

```ts
export class Signal<T> implements Observable<T> {
  constructor(initial: T, equals?: (a: T, b: T) => boolean);
  get value(): T;
  set value(next: T);
  peek(): T;
  subscribe(cb: (value: T) => void): () => void;
}
```

Behaviour:

- Backing storage: one `T` field, one `Set<(v: T) => void>` for subscribers.
- `equals` defaults to `Object.is`.
- `set value(next)`: if `equals(current, next)` is true, **return without notifying**. Otherwise assign and synchronously notify every subscriber in registration order with the new value.
- `peek()` and `get value()` both return the current value without registering anything (there is no auto-tracking at this layer — `peek` is just there for spec symmetry with `Observable`).
- `subscribe(cb)`: add `cb` to the set, return an unsubscribe function. The unsubscribe must be **idempotent** — calling it twice is a no-op. Do not invoke `cb` immediately on subscribe; subscribers only see future writes.
- **Subscriber throws during notify:** continue invoking remaining subscribers, then re-throw the first error (single error) or wrap multiple errors in `AggregateError`. (This matches the DirtyChannel spec for consistency, but at this layer the simple form — re-throw the single error after all subscribers run — is fine. Use `AggregateError` only if 2+ throw.)
- **Re-entrancy:** if a subscriber calls `signal.value = x` during notify, the inner write triggers its own synchronous notify cycle. Do not try to defer or batch — coalescing is `DirtyChannel`'s job, not `Signal`'s. Just don't iterate the set you're currently mutating. Snapshot the subscribers (`Array.from(set)`) before iterating.
- **Unsubscribe during notify:** if a callback unsubscribes itself or another subscriber, the snapshot already taken means the cb runs this cycle but won't run next time.

---

## Tests — `src/primitives.test.ts`

Use `vite-plus/test` (`import { describe, it, expect, vi } from 'vite-plus/test';`). Mirror style from any existing test in `packages/blac-core/src/__tests__/`.

Required cases (minimum):

1. **Construction & read.** `new Signal(42).value === 42`. `peek()` returns the same.
2. **Write notifies in registration order.** Two subscribers; assert call order matches subscribe order.
3. **Equality short-circuit (default `Object.is`).** Set the same value twice; subscriber called once (on the first set). NaN equals NaN under `Object.is`.
4. **Custom `equals`.** Pass `(a, b) => a.id === b.id`; writes with same id don't notify.
5. **Unsubscribe.** Calling the returned unsub removes the callback; further writes don't reach it.
6. **Unsubscribe is idempotent.** Calling unsub twice does not throw and does not double-remove some other subscriber.
7. **Subscriber unsubscribes during notify.** First subscriber's callback unsubscribes the second; the second still runs *this* tick (snapshot semantics) but does not run on the next write.
8. **Subscriber throws.** With two subscribers (first throws, second works): the second still runs; the error surfaces (re-thrown or via `AggregateError`).
9. **Re-entrant write.** A subscriber that writes a new value during notify causes a fresh notify cycle; assert subscribers see all writes.
10. **`peek()` does not subscribe.** This is mostly a typing / no-side-effect smoke check.

Keep each test focused. No setup framework needed; vitest globals are on per `vite.config.ts`.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.** Run `git status` — must be clean (Phase 0 committed; Phase 1 siblings may have committed too, but your owned files should be untouched stubs).
   - `cat packages/dirtytalk-engine/src/primitives.ts` should show the stub.
   - `ls packages/dirtytalk-engine/src/primitives.test.ts` should be ENOENT.
   - If either invariant fails: stop and report.
2. **Implement.** Replace the stub body. Create the test file.
3. **Verify.** From inside `packages/dirtytalk-engine/`:
   - `vp run typecheck` — passes.
   - `vp run lint` — passes.
4. **Test.** `vp run test src/primitives.test.ts` — all cases pass. (Other Phase 1 agents may have already added their test files; restrict to your file to isolate failures.)
5. **Commit.** Single commit:

   ```
   feat(dirtytalk-engine): implement Signal primitive
   ```

   No body needed unless something non-obvious.
   **No co-author trailer.**

---

## Acceptance criteria

- [ ] `packages/dirtytalk-engine/src/primitives.ts` has no `throw new Error('not implemented')` left.
- [ ] All 10 test cases pass.
- [ ] `vp run typecheck` and `vp run lint` pass.
- [ ] No file outside the owned set is modified (`git diff --stat HEAD~1` shows only the two files).

---

## Pitfalls

- **Don't allocate on read.** `get value()` and `peek()` are hot paths; just return the field.
- **Snapshot subscribers before iterating.** Re-entrant writes and self-unsubscribes both depend on this.
- **`Object.is` not `===`.** They differ for `NaN` and `-0` / `+0`. The spec says `Object.is` default; use it.
- **No microtask, no setTimeout, no anything async.** Notification is synchronous at this layer. Period.
- **`equals` is optional.** Don't make it a required constructor arg.
