# 01 — Implement the four `Scheduler`s

**Phase:** 1 (parallel — runs after Phase 0)
**Model:** Sonnet 4.6
**Effort:** medium (re-entrancy traps in Microtask/RAF; spec is small but easy to get subtly wrong)
**Estimated touch:** 2 files

---

## Goal

Replace the stubbed schedulers in `src/scheduler.ts` with real implementations of `SyncScheduler`, `ManualScheduler`, `MicrotaskScheduler`, and `RAFScheduler`. Add focused unit tests in `src/scheduler.test.ts`.

---

## Inputs — read these first

1. `dirtytalk/01-engine.md` § **Layer 3 — Scheduler** (the only spec section that matters here).
2. `packages/dirtytalk-engine/src/scheduler.ts` — current stub (Phase 0).
3. `~/.claude/CLAUDE.md` — commit format.

---

## Owned files

```
packages/dirtytalk-engine/src/scheduler.ts        (REPLACE stub bodies)
packages/dirtytalk-engine/src/scheduler.test.ts   (CREATE)
```

## Do not touch

```
packages/dirtytalk-engine/src/primitives.ts       (01-signal owns it)
packages/dirtytalk-engine/src/dirty-channel.ts    (01-dirty-channel owns it)
packages/dirtytalk-engine/src/index.ts            (Phase 0 owns it)
packages/dirtytalk-engine/src/space.ts
packages/dirtytalk-engine/package.json
```

If the surface needs to change (e.g. you decide `cancel()` should be required, not optional, on the interface), **stop and report** — don't unilaterally edit shared files.

---

## Shared contract (applies to all four)

```ts
export interface Scheduler {
  request(flush: () => void): void;
  cancel?(): void;
}
```

- `request(flush)` must be **idempotent within a scheduling window**: call it N times before the next flush, the flush callback runs exactly once.
- The `flush` argument may differ between `request` calls — store the most recent one (DirtyChannel passes its own `flush`, and only one DirtyChannel uses a given scheduler in v1, but don't assume the argument is identity-stable).
- After the scheduler invokes `flush`, the window closes: a `request` from inside `flush` (or after it returns) must schedule a **new** window.
- **Re-entrancy:** a `request` called while `flush` is running schedules the next window. It must not nest a synchronous `flush` inside the current one (that's a recipe for infinite loops; the engine guarantees re-entrant marks defer to next flush).

---

## Per-class spec

### `SyncScheduler`

```ts
export class SyncScheduler implements Scheduler {
  request(flush: () => void): void { /* invoke flush synchronously, now */ }
}
```

- Each `request` calls `flush()` immediately, then returns.
- Idempotency note: because flush is invoked before `request` returns, there's no "pending" state to dedupe against — every `request` is its own (synchronous) window.
- No `cancel`. The interface allows omission.

### `ManualScheduler`

```ts
export class ManualScheduler implements Scheduler {
  request(flush: () => void): void;
  pump(): void;
}
```

- `request` **records** that a flush is wanted (sets a `pending` boolean and stores the latest `flush` callback). Does not call it.
- `pump()` — if `pending`, clear the flag and invoke the stored callback. Otherwise no-op.
- A `request` made *during* `pump()` (because `flush` synchronously called `request` again) re-sets `pending` for a future `pump`. **Do not** drain in a loop — one `pump` call drives at most one flush. This matches the "re-entrant mark defers to next flush" contract.
- No `cancel`. (Could add for symmetry, but spec doesn't require it.)

### `MicrotaskScheduler`

```ts
export class MicrotaskScheduler implements Scheduler {
  request(flush: () => void): void;
  cancel(): void;
}
```

- On `request`: if no microtask is pending, `queueMicrotask(() => this.#drain())`; set `pending = true`; store the latest `flush`.
- `#drain` clears `pending`, snapshots the stored `flush`, and invokes it. A `request` called *during* the flush sets `pending = true` again and queues a fresh microtask.
- `cancel()`: sets `pending = false` and clears the stored `flush`. (We can't actually un-queue a microtask once `queueMicrotask` returns — the cancel just makes the eventual drain a no-op via the `pending` check.)

### `RAFScheduler`

```ts
export class RAFScheduler implements Scheduler {
  request(flush: () => void): void;
  cancel(): void;
}
```

- On `request`: if no RAF is pending, store `handle = requestAnimationFrame(() => this.#drain())`; set `handle != null`; store the latest `flush`.
- `#drain`: clear `handle`, snapshot the stored `flush`, invoke it. A `request` during the flush schedules a fresh RAF.
- `cancel()`: if `handle != null`, `cancelAnimationFrame(handle)`, clear `handle` and the stored `flush`.
- **Environment guard:** if `globalThis.requestAnimationFrame` is undefined (Node test runs the engine in `node` env), fall back to `setTimeout(fn, 16)` and `clearTimeout`. Don't import a polyfill. The two branches share the same logic; just pick the API once at construction.

---

## Tests — `src/scheduler.test.ts`

Use `vi.useFakeTimers()` plus `await Promise.resolve()` (or `await vi.runOnlyPendingTimersAsync()` for timer-based fallback) to drive the schedulers deterministically. Reference: `vite-plus/test` exports the same `vi` as upstream vitest.

Required cases:

### `SyncScheduler`
- `request` invokes `flush` synchronously before returning.
- Three `request` calls invoke `flush` three times (no dedupe — that's intentional for sync; DirtyChannel won't call request again until after its own flush).

### `ManualScheduler`
- `request` does not invoke `flush`.
- `pump()` with no pending request is a no-op.
- `pump()` after a request invokes `flush` once.
- `request → request → pump`: `flush` runs once (idempotent within window).
- `pump → pump`: second `pump` runs nothing (window already drained).
- Re-entrant `request` from inside `flush` (during `pump`): does NOT cascade — the inner request schedules a future `pump`, doesn't run synchronously. After: a *second* `pump` runs the inner flush.

### `MicrotaskScheduler`
- `request` schedules but does not invoke synchronously.
- `await Promise.resolve()` triggers `flush` once.
- Two `request` calls in the same tick → one flush.
- A `request` made *inside* `flush` schedules another microtask; after the next `await`, the inner flush runs.
- `cancel()` after `request` (before microtask drains) prevents `flush` from running. After cancel, a new `request` works as fresh.
- Latest-`flush`-wins: `request(cb1); request(cb2); await Promise.resolve()` → only `cb2` invoked.

### `RAFScheduler`
- In Node (no RAF): fallback path. Use `vi.useFakeTimers()`; `request` schedules; `vi.advanceTimersByTime(20)` invokes `flush` once.
- Coalescing: two requests → one flush per timer tick.
- `cancel()` after `request` clears the timer; advancing time runs nothing.
- Re-entrant `request` inside `flush`: schedules a new tick (test by advancing time twice).
- (Skip the real-RAF test path — it can't be exercised reliably under Node test env.)

Keep tests independent. Use `beforeEach(() => vi.useFakeTimers())` and `afterEach(() => vi.useRealTimers())` for the Microtask/RAF blocks if needed.

---

## Cycle (check → implement → verify → test → commit)

1. **Check.** `git status` clean. `cat packages/dirtytalk-engine/src/scheduler.ts` shows stub. `ls scheduler.test.ts` ENOENT.
2. **Implement.** Replace stub. Create tests.
3. **Verify.** `cd packages/dirtytalk-engine && vp run typecheck && vp run lint`.
4. **Test.** `vp run test src/scheduler.test.ts` — all pass.
5. **Commit.**

   ```
   feat(dirtytalk-engine): implement Sync/Manual/Microtask/RAF schedulers
   ```

   No co-author.

---

## Acceptance criteria

- [ ] No `throw new Error('not implemented')` remains in `scheduler.ts`.
- [ ] All four classes pass the listed cases.
- [ ] `vp run typecheck` and `vp run lint` pass.
- [ ] `git diff --stat HEAD~1` shows exactly the two owned files.

---

## Pitfalls

- **`queueMicrotask` cannot be cancelled.** Your `cancel()` must guard the drain with a `pending` flag, not try to dequeue the microtask.
- **Latest `flush` wins.** `request(a); request(b)` then drain → run `b`. Don't accumulate a queue.
- **One pump = one drain.** `ManualScheduler` does not loop. If `flush` re-`request`s, the second pump runs it.
- **Don't share state across schedulers.** Each instance has its own `pending`/`handle`/`flush` fields. Don't use module-level globals.
- **`setTimeout(_, 16)` fallback** for `RAFScheduler` only when `globalThis.requestAnimationFrame == null`. Don't always use setTimeout — real browser code wants RAF.
- **`vi.useFakeTimers()` does NOT fake microtasks by default in some vitest versions.** Use `await Promise.resolve()` (or `await vi.advanceTimersToNextTimerAsync()` if using `toFake: ['queueMicrotask']`). Pick one approach and stick with it.
