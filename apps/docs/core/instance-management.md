# Instance management

The registry is a global singleton that manages the lifecycle of state container instances. It handles creation, sharing, ref counting, and disposal. Every signature on this page is quoted from the `@blac/core` source.

## The mental model: a shared library with checkouts

Think of the registry as a **lending library** for bloc instances:

- Each `(class, instanceKey)` pair is one **book** on the shelf. Ask for the same pair twice and you get the same physical book — that is how two components share state without prop-drilling.
- A consumer that needs a book **checks it out** (`acquire`) and **returns it** (`release`) when done. Every checkout is a **reference** (a "ref").
- The library keeps a **count of who has each book checked out**. When the count drops to zero, the book is **discarded** (`dispose`) — its state is gone and any timers or subscriptions it set up are torn down.
- `keepAlive` marks a book as a permanent reference copy: it stays on the shelf even at zero checkouts.

Two consequences fall straight out of this model:

1. **Sharing is automatic.** The first `acquire` of a key creates the instance; every later `acquire` of the same key reuses it. You never wire instances together by hand.
2. **Cleanup is automatic — but only if every checkout is returned.** A missing `release` is like never returning a library book: the count never reaches zero, the instance never disposes, and its memory (and subscriptions) leak.

## How ref counting works

When you call `useBloc(CounterCubit)` in React:

1. The hook calls `acquire(CounterCubit)`, which either creates a new instance or returns the existing one.
2. The ref count increments (+1). Each consumer gets its own ref (a unique `refId`), so two components reading the same bloc count as two refs.
3. When the component unmounts, `release(CounterCubit)` decrements the ref count (-1).
4. At ref count zero, the instance is disposed (unless `keepAlive` is set).

This means shared instances are automatically cleaned up when no component needs them.

```text
acquire ───▶  ref count 1   (created, init() runs, 'created' fires)
acquire ───▶  ref count 2   (same instance reused — shared)
release ───▶  ref count 1   (still alive, one consumer remains)
release ───▶  ref count 0   ─┬─ keepAlive?  yes ─▶ stays alive
                             └─ keepAlive?  no  ─▶ dispose()
                                                  ├─ 'dispose' system event fires
                                                  ├─ subscriptions/handlers torn down
                                                  ├─ entry removed from registry
                                                  └─ ensure-created deps with 0 refs cascade-dispose
```

::: info When does disposal actually happen?
Disposal is **synchronous** with the `release` call that drops the count to zero — there is no idle delay or timer. The very next `acquire` of that key (e.g. a new component mounting) creates a **fresh** instance with fresh state. If you need state to persist across that gap, use [`keepAlive`](/core/configuration).
:::

## Registry functions

### `acquire(BlocClass, instanceKey?, refId?, args?)`

Create or return an existing instance, incrementing the ref count.

```ts
function acquire<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string,
  refId?: string,
  args?: ExtractArgs<T>,
): InstanceType<T>;
```

| Parameter     | Type                                  | Required | Description                                                                                                            |
| ------------- | ------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| `BlocClass`   | `T extends StateContainerConstructor` | yes      | The state-container class to acquire an instance of.                                                                   |
| `instanceKey` | `string`                              | no       | Explicit registry key. Defaults to the key derived from `args` or `'default'`.                                         |
| `refId`       | `string`                              | no       | Caller-supplied ref identifier. Used by `useBloc` to pair with `release`. Rarely set manually.                         |
| `args`        | `ExtractArgs<T>`                      | no       | Serializable construction data passed to `init(args)`. Used to derive the instance key when no `instanceKey` is given. |

**Returns:** `InstanceType<T>` — the live instance (newly created or existing).

**Behavior.** If no instance exists for the resolved key, `acquire` creates one, calls `init(args)`, and fires the internal `'created'` event. If an instance already exists, it is returned as-is. The ref count is always incremented. **Every `acquire` must have a matching `release`** — a missing `release` is the canonical instance leak. In React, `useBloc` owns this pair; call `acquire` directly only in server-side or scripting contexts.

```ts twoslash
import { acquire, release } from '@blac/core';
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment = () => this.update((s) => ({ count: s.count + 1 }));
}

// --- outside React ---
const counter = acquire(CounterCubit);
counter.increment();
console.log(counter.state.count); // => 1
release(CounterCubit); // must pair with acquire
```

### `ensure(BlocClass, instanceKey?, args?)`

Create or return an existing instance **without** taking a ref.

```ts
function ensure<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string,
  args?: ExtractArgs<T>,
): InstanceType<T>;
```

| Parameter     | Type                                  | Required | Description                                            |
| ------------- | ------------------------------------- | -------- | ------------------------------------------------------ |
| `BlocClass`   | `T extends StateContainerConstructor` | yes      | The state-container class.                             |
| `instanceKey` | `string`                              | no       | Explicit registry key.                                 |
| `args`        | `ExtractArgs<T>`                      | no       | Construction data for `init(args)` and key derivation. |

**Returns:** `InstanceType<T>` — the live instance.

**Behavior.** Like `acquire`, but takes **no ref** — the instance can be disposed by another caller while you hold the returned reference. Use `ensure` inside other cubits (via `depend()`) or in tooling that only needs the instance to exist without pinning its lifecycle. Because no ref is taken, no matching `release` is needed.

```ts twoslash
import { ensure } from '@blac/core';
import { Cubit } from '@blac/core';

class AuthCubit extends Cubit<{ userId: string | null }> {
  constructor() {
    super({ userId: null });
  }
}

// ensure creates AuthCubit if it's not alive yet, but does not keep it alive
const auth = ensure(AuthCubit);
console.log(auth.state.userId); // no release needed
```

### `borrow(BlocClass, instanceKey?)`

Return an existing instance without taking a ref. Throws if the instance does not exist.

```ts
function borrow<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string,
): InstanceType<T>;
```

| Parameter     | Type                                  | Required | Description                                     |
| ------------- | ------------------------------------- | -------- | ----------------------------------------------- |
| `BlocClass`   | `T extends StateContainerConstructor` | yes      | The state-container class.                      |
| `instanceKey` | `string`                              | no       | Explicit registry key. Defaults to `'default'`. |

**Returns:** `InstanceType<T>` — the live instance.

**Behavior.** Does not create the instance if it is absent; throws an `Error` instead. Use `borrow` when the absence of an instance is a programming error — it makes the failure loud and immediate rather than silently returning `undefined`. No ref is taken, so no `release` is needed.

```ts twoslash
import { borrow } from '@blac/core';
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
}

// Safe read-only access — no acquire/release pair needed
function readCount(): number {
  return borrow(CounterCubit).state.count;
}
```

### `borrowSafe(BlocClass, instanceKey?)`

Return an existing instance without taking a ref. Returns an error object instead of throwing.

```ts
function borrowSafe<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string,
):
  | { error: Error; instance: null }
  | { error: null; instance: InstanceType<T> };
```

| Parameter     | Type                                  | Required | Description                                     |
| ------------- | ------------------------------------- | -------- | ----------------------------------------------- |
| `BlocClass`   | `T extends StateContainerConstructor` | yes      | The state-container class.                      |
| `instanceKey` | `string`                              | no       | Explicit registry key. Defaults to `'default'`. |

**Returns:** `{ error: null; instance: InstanceType<T> }` when the instance exists, or `{ error: Error; instance: null }` when it does not.

**Behavior.** Identical to `borrow` but returns a discriminated union instead of throwing. Prefer `borrowSafe` in code paths where absence is expected (e.g. optional integrations) and `borrow` where absence is always a bug.

```ts twoslash
import { borrowSafe } from '@blac/core';
import { Cubit } from '@blac/core';

class AuthCubit extends Cubit<{ userId: string | null }> {
  constructor() {
    super({ userId: null });
  }
}

const { error, instance } = borrowSafe(AuthCubit);
if (error) {
  console.log('Auth not initialized yet');
} else {
  console.log(instance.state.userId);
}
```

### `release(BlocClass, instanceKey?, forceDispose?, refId?)`

Decrement the ref count. Dispose the instance when count reaches zero.

```ts
function release<T extends StateContainerConstructor>(
  BlocClass: T,
  instanceKey?: string,
  forceDispose?: boolean,
  refId?: string,
): void;
```

| Parameter      | Type                                  | Required | Description                                                                          |
| -------------- | ------------------------------------- | -------- | ------------------------------------------------------------------------------------ |
| `BlocClass`    | `T extends StateContainerConstructor` | yes      | The state-container class.                                                           |
| `instanceKey`  | `string`                              | no       | The key used when `acquire` was called. **Must match** the key used at acquire time. |
| `forceDispose` | `boolean`                             | no       | When `true`, dispose immediately even if `keepAlive` is set. Default `false`.        |
| `refId`        | `string`                              | no       | The ref identifier passed to `acquire`. Rarely set manually.                         |

**Returns:** `void`.

**Behavior.** `release` is **idempotent for an already-dropped ref** — releasing more times than you acquired won't throw, it just no-ops once the count is gone. The key you release with **must match** the key you acquired with; a mismatch leaves the original ref dangling forever. At ref count zero, the instance is disposed synchronously (unless `keepAlive` is set or `forceDispose` is `false`).

```ts twoslash
import { acquire, release } from '@blac/core';
import { Cubit } from '@blac/core';

class SessionCubit extends Cubit<{ token: string | null }> {
  constructor() {
    super({ token: null });
  }
}

const session = acquire(SessionCubit, 'main');
// ... use session ...
release(SessionCubit, 'main'); // key must match acquire's key
```

## Named instances

Pass an instance key as the second argument to any registry function to manage named instances:

```ts twoslash
import { acquire, release } from '@blac/core';
import { Cubit } from '@blac/core';

class EditorCubit extends Cubit<{ content: string }> {
  constructor() {
    super({ content: '' });
  }
}

const editor1 = acquire(EditorCubit, 'doc-42');
const editor2 = acquire(EditorCubit, 'doc-99');

// These are different instances
const areDifferent = editor1 !== editor2; // true

release(EditorCubit, 'doc-42');
release(EditorCubit, 'doc-99');
```

In React, use the `instanceId` option as an escape hatch for explicit keys:

```tsx
const [state] = useBloc(EditorCubit, { instanceId: 'doc-42' });
```

### Args-derived identity (preferred)

When a bloc declares `Args`, the preferred way to get distinct instances is to pass `args` — the instance key is derived automatically (structural hash by default, or `static key` if declared). This avoids threading the same value through both `instanceId` and a separate data channel:

```tsx
// Before — id is opaque, userId had to be passed a second time
const [s] = useBloc(UserCardCubit, { instanceId: userId });

// After — the meaningful value keys the instance AND feeds init(args)
const [s] = useBloc(UserCardCubit, { args: { userId } });
```

Identity precedence: explicit `instanceId` > `<BlocProvider>` context > `static key(args)` / structural hash of `args` > `'default'`.

The resolved key is the registry's single source of truth — `acquire` and `release` both run their inputs through the same resolution, so a ref taken under an args-derived key is dropped under the same key. See [Passing Inputs](/guide/inputs) for the full model and [Configuration](/core/configuration#key-args-string) for `static key`.

## Querying the registry

```ts twoslash
import {
  hasInstance,
  getRefCount,
  getAll,
  forEach,
  getStats,
} from '@blac/core';
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
}

const _a = hasInstance(CounterCubit); // boolean
const _b = getRefCount(CounterCubit); // number of distinct active refs
const _c = getAll(CounterCubit); // all instances of this class
forEach(CounterCubit, (_inst) => {}); // iterate instances
const _d = getStats(); // { registeredTypes, totalInstances, typeBreakdown }
```

## Cleanup

```ts twoslash
import { clear, clearAll } from '@blac/core';
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
}

clear(CounterCubit); // dispose and remove all instances of this class
clearAll(); // dispose and remove everything
```

::: warning `clear` / `clearAll` are teardown tools, not app code
`clear` and `clearAll` dispose instances **regardless of ref count**, ignoring `keepAlive`. That is exactly what you want between tests to isolate the registry, but in running app code it will pull state out from under live components. Reach for them in test setup/teardown — see [Testing core logic](/testing/core) — not in feature code.
:::

## In React vs outside React

In React, `useBloc` handles `acquire` and `release` automatically. You rarely call registry functions directly.

Outside React (tests, scripts, server-side code), manage the lifecycle manually:

```ts twoslash
import { acquire, release } from '@blac/core';
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment = () => this.update((s) => ({ count: s.count + 1 }));
}

const counter = acquire(CounterCubit);
counter.increment();
console.log(counter.state.count);
release(CounterCubit);
```

## See also

- [Configuration](/core/configuration) — `keepAlive`, `static key`, and the circuit breakers that catch leaks
- [Passing Inputs](/guide/inputs) — `args`, `instanceId`, and the full instance-identity model
- [System Events](/core/system-events) — the `dispose` event that fires when an instance is torn down
- [Testing core logic](/testing/core) — using `clear`/`clearAll` to isolate the registry between tests

## Troubleshooting

For the full FAQ see [Troubleshooting](/guide/troubleshooting). Below are the instance-management-specific problems.

### State unexpectedly resets on remount

**Symptom:** A component unmounts and remounts and finds the bloc in its initial state — any previous state is gone.

**Cause:** When the last consumer releases, the instance is disposed immediately (ref count 0 → dispose). The next consumer acquires a brand-new instance with fresh state.

**Fix:** If state must persist across unmounts, mark the class `keepAlive`:

```ts twoslash
import { blac, Cubit } from '@blac/core';

interface SessionState {
  token: string | null;
}

@blac({ keepAlive: true })
class SessionCubit extends Cubit<SessionState> {
  constructor() {
    super({ token: null });
  }
}
```

`keepAlive` instances are never auto-disposed at ref count 0 — tear them down explicitly with `release(Class, key, true)` (force-dispose) or `clear(Class)` in teardown. See [Configuration](/core/configuration#keepalive-true).

### Instance never disposed / memory leak

**Symptom:** DevTools shows an instance that should have been disposed is still alive, or ref count never returns to 0.

**Cause:** An `acquire` outside React has no matching `release`. Every call to `acquire` increments the ref count; without a matching `release` the count never reaches zero.

**Fix:** Pair every `acquire` with a `release`, ideally in a `try/finally`. If you only need to read without owning the lifecycle, use `borrow` or `ensure` — neither takes a ref:

```ts twoslash
import { acquire, borrow, release } from '@blac/core';
import { Cubit } from '@blac/core';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
}

// Leaks — no release
function readOnceBad() {
  const c = acquire(CounterCubit);
  return c.state.count;
  // BUG: ref count never drops to 0
}

// Fixed — borrow takes no ref
function readOnce() {
  return borrow(CounterCubit).state.count;
}
```

### Circuit breaker threw ("max instances" / "max refs")

**Symptom:** `acquire` throws with a message like "exceeded the maximum live instances" or "exceeded the maximum refs."

**Cause:** Almost always a leak — an unstable instance key (non-serializable `args`) spawning endless instances, or a missing `release` accumulating refs. The limit is not too low; the leak is real.

**Fix:** Find and fix the leak before raising the limit. Common causes: non-serializable values in `args` (fix: move to `deps`), `acquire` without `release` (fix: pair them), args that differ structurally each render (fix: normalise types). See [Configuration: circuit breakers](/core/configuration#circuit-breakers) and [Troubleshooting](/guide/troubleshooting#instance-identity-too-many--too-few).
