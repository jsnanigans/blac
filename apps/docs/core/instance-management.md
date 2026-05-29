# Instance Management

The registry is a global singleton that manages the lifecycle of state container instances. It handles creation, sharing, ref counting, and disposal.

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

### Creating and accessing instances

```ts
import { acquire, ensure, borrow, borrowSafe } from '@blac/core';
```

| Function                  | Creates if missing? | Affects ref count? | Throws?                           |
| ------------------------- | ------------------- | ------------------ | --------------------------------- |
| `acquire(Class, key?)`    | Yes                 | +1                 | No                                |
| `ensure(Class, key?)`     | Yes                 | No                 | No                                |
| `borrow(Class, key?)`     | No                  | No                 | Yes, if not found                 |
| `borrowSafe(Class, key?)` | No                  | No                 | No, returns `{ error, instance }` |

**`acquire`** — Use when you own the reference and will `release` it later. This is what `useBloc` calls internally. The pairing matters: an `acquire` with no matching `release` is the canonical instance leak (see [Common mistakes](#common-mistakes)).

**`ensure`** — Use when you need the instance to exist but don't want to affect its lifecycle. Common inside other cubits via `depend()`. Because `ensure` takes **no ref**, it never keeps an instance alive on its own — the instance can be disposed out from under you if nothing else holds a ref. See [Bloc Communication](/core/bloc-communication).

**`borrow`** — Use when the instance must already exist. Throws if it doesn't. Good for cases where the absence of an instance is a programming error.

**`borrowSafe`** — Like `borrow` but returns an object instead of throwing:

```ts
const { error, instance } = borrowSafe(AuthCubit);
if (error) {
  console.log('Auth not initialized yet');
}
```

### Releasing instances

```ts
import { release } from '@blac/core';

release(CounterCubit); // release default instance
release(EditorCubit, 'doc-42'); // release named instance
```

At ref count zero, the instance is disposed automatically (unless `keepAlive` is set). `release` is **idempotent for an already-dropped ref** — releasing more times than you acquired won't throw, it just no-ops once the count is gone. The key you release with **must match** the key you acquired with (see [Args-derived identity](#args-derived-identity-preferred)); otherwise the ref is taken under one key and never dropped from it.

### Querying the registry

```ts
import {
  hasInstance,
  getRefCount,
  getAll,
  forEach,
  getStats,
} from '@blac/core';

hasInstance(CounterCubit); // boolean
getRefCount(CounterCubit); // number of distinct active refs
getAll(CounterCubit); // all instances of this class
forEach(CounterCubit, (inst) => {}); // iterate instances
getStats(); // { registeredTypes, totalInstances, typeBreakdown }
```

### Cleanup

```ts
import { clear, clearAll } from '@blac/core';

clear(CounterCubit); // dispose and remove all instances of this class
clearAll(); // dispose and remove everything
```

::: warning clear / clearAll are teardown tools, not app code
`clear` and `clearAll` dispose instances **regardless of ref count**, ignoring `keepAlive`. That is exactly what you want between tests to isolate the registry, but in running app code it will pull state out from under live components. Reach for them in test setup/teardown — see [Testing core logic](/testing/core) — not in feature code.
:::

## Named instances

Pass an instance key as the second argument to any registry function to manage named instances:

```ts
const editor1 = acquire(EditorCubit, 'doc-42');
const editor2 = acquire(EditorCubit, 'doc-99');

// These are different instances
editor1 !== editor2; // true

release(EditorCubit, 'doc-42');
release(EditorCubit, 'doc-99');
```

In React, use the `instanceId` option as an escape hatch for explicit keys:

```tsx
const [state] = useBloc(EditorCubit, { instanceId: 'doc-42' });
```

### Args-derived identity (preferred)

When a bloc declares `Args`, the preferred way to get distinct instances is to pass `args` — the instance key is derived automatically (structural hash by default, or `static key` if declared). This avoids threading the same value through both `instanceId` and a separate data channel:

```ts
// Before — id is opaque, userId had to be passed a second time
const [s] = useBloc(UserCardCubit, { instanceId: userId });

// After — the meaningful value keys the instance AND feeds init(args)
const [s] = useBloc(UserCardCubit, { args: { userId } });
```

Identity precedence: explicit `instanceId` > `<BlocProvider>` context > `static key(args)` / structural hash of `args` > `'default'`.

The resolved key is the registry's single source of truth — `acquire` and `release` both run their inputs through the same resolution, so a ref taken under an args-derived key is dropped under the same key. See [Passing Inputs](/guide/inputs) for the full model and [Configuration](/core/configuration#key-args-string) for `static key`.

## In React vs outside React

In React, `useBloc` handles `acquire` and `release` automatically. You rarely call registry functions directly.

Outside React (tests, scripts, server-side code), manage the lifecycle manually:

```ts
const counter = acquire(CounterCubit);
counter.increment();
console.log(counter.state.count);
release(CounterCubit);
```

## Common mistakes

::: danger Common mistakes
**1. `acquire` without a matching `release` (the classic leak).** Outside React, every `acquire` you make is your responsibility to `release`. Forgetting it keeps the ref count above zero forever, so the instance never disposes:

```ts
function readOnce() {
  const c = acquire(CounterCubit); // ref count 1
  return c.state.count;
  // BUG: no release — ref count stays at 1, instance never disposes
}
```

Pair them explicitly (`try/finally` is a good fit), or if you only need to read without ownership, use `borrow`/`ensure` instead — neither takes a ref:

```ts
function readOnce() {
  return borrow(CounterCubit).state.count; // no ref taken, nothing to release
}
```

In React this is handled for you — let `useBloc` own the acquire/release pair rather than calling the registry yourself.

**2. Releasing with a different key than you acquired.** `acquire(Editor, 'doc-42')` then `release(Editor)` (default key) leaves the `'doc-42'` ref dangling forever. Always release the same key.

**3. Expecting state to survive a zero-ref gap.** Once the last consumer releases, the instance disposes immediately and the next consumer gets fresh state. If state must persist across unmounts, mark the class [`keepAlive`](/core/configuration).

**4. Reaching for a higher circuit-breaker limit instead of fixing the leak.** If `acquire` throws "exceeded the maximum live instances/references," the cause is almost always an unstable key or a missing `release` — not a limit that's too low. See [Configuration](/core/configuration#circuit-breakers).
:::

## See also

- [Configuration](/core/configuration) — `keepAlive`, `static key`, and the circuit breakers that catch leaks
- [Passing Inputs](/guide/inputs) — `args`, `instanceId`, and the full instance-identity model
- [System Events](/core/system-events) — the `dispose` event that fires when an instance is torn down
- [Testing core logic](/testing/core) — using `clear`/`clearAll` to isolate the registry between tests
