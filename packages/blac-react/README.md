# @blac/react

React bindings for BlaC — `useBloc` hook with proxy-based automatic re-render optimization.

**[Documentation](https://blac-docs.pages.dev/react/getting-started)** · **[npm](https://www.npmjs.com/package/@blac/react)**

> [!WARNING]
> **BlaC v2 is in pre-release (beta).** While in beta, **breaking API changes may
> ship in patch releases** without a major version bump. Pin an exact version and
> check the changelog before upgrading. Strict semver resumes once v2 is officially
> out of beta.

## Installation

```bash
pnpm add @blac/react @blac/core
```

Requires React 18+.

## Quick Start

```tsx
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';

class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
  increment = () => this.emit({ count: this.state.count + 1 });
  decrement = () => this.emit({ count: this.state.count - 1 });
}

function Counter() {
  const [state, counter] = useBloc(CounterCubit);
  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={counter.increment}>+</button>
      <button onClick={counter.decrement}>-</button>
    </div>
  );
}
```

## useBloc

```tsx
const [state, bloc, ref] = useBloc(MyBloc, options?);
```

**Returns:** `[state, bloc, ref]`

- `state` — current state snapshot (proxied for auto-tracking)
- `bloc` — bloc instance for calling methods
- `ref` — internal component ref (advanced usage)

### The Three Input Lanes

BlaC blocs receive external data through three distinct channels:

| Lane       | Purpose                                        | Keying                                    | Lifetime                  | Example                                   |
| ---------- | ---------------------------------------------- | ----------------------------------------- | ------------------------- | ----------------------------------------- |
| **`args`** | Typed creation data; derives instance identity | **Yes** (structural hash or `static key`) | Once at `init()`          | `userId`, `endpoint`                      |
| **`deps`** | Non-serializable refs, callbacks, handles      | **Never**                                 | Live, per-consumer merged | `ref`, `onComplete` callback, `emblaApi`  |
| **events** | Values that change over time or are late-bound | N/A                                       | Called from effects       | `cubit.slidesChanged(v)` from `useEffect` |

### `args`: Typed Construction Data

When a bloc declares `Args`, you must pass them at the call site. Args are fed to the bloc's `init(args)` method before the first state snapshot, and they derive the instance identity by default.

```tsx
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';

class UserCardCubit extends Cubit<UserCardState, { userId: string }> {
  // Constructor is zero-arg; framework calls init(args) before first snapshot
  init(args: { userId: string }) {
    this.userId = args.userId;
    void this.loadUser(args.userId);
  }
}

function UserCard({ userId }: { userId: string }) {
  // args is required and type-checked when Args != void
  const [state, cubit] = useBloc(UserCardCubit, { args: { userId } });
  return <div>{state.user?.name}</div>;
}
```

**Key properties:**

- **Required when declared** — omitting `args` or passing the wrong shape is a type error.
- **Drives identity** — different `args` ⇒ different instance. Same `args` ⇒ same instance (dev-warn if args mismatch on same-keyed second call).
- **Serializable only** — non-serializable values (refs, callbacks) belong in the `deps` lane (below).
- **Per-component private instances** — embed a per-mount unique ID inside `args` (using React's `useId()`) to give each mount its own instance, disposed on unmount:

```tsx
const id = useId();
const [state, cubit] = useBloc(FormCubit, { args: { ...options, _id: id } });
```

### `deps`: Non-Serializable Refs and Callbacks

Use `deps` to inject refs, stable callbacks, and long-lived controller handles. Unlike `args`, `deps` are:

- **Never keying** — different refs don't fork the instance
- **Per-consumer merged** — each component contributes its own slice
- **Read lazily** — accessed via `this.deps.x` when needed, may be undefined
- **Live** — can change over time

`deps` is **not** a `useBloc` option. A component contributes its slice from a **mount effect**, using `APPLY_DEPS` / `REMOVE_DEPS_OWNER` from `@blac/core` (marked `@internal` today; a friendlier wrapper may land later):

```tsx
import { useEffect, useId, useRef } from 'react';
import { APPLY_DEPS, REMOVE_DEPS_OWNER } from '@blac/core';
import { useBloc } from '@blac/react';

const inputRef = useRef<HTMLInputElement>(null);
const ownerId = useId();
const [state, cubit] = useBloc(FileUploadCubit, { args: { endpoint } });

useEffect(() => {
  cubit[APPLY_DEPS](ownerId, { inputRef });
  return () => cubit[REMOVE_DEPS_OWNER](ownerId);
}, [cubit, inputRef, ownerId]);
```

The bloc reads them lazily and guards for absence:

```ts
class FileUploadCubit extends Cubit<
  UploadState,
  { endpoint: string },
  {
    inputRef?: RefObject<HTMLInputElement>;
    onComplete?: () => void;
  }
> {
  async upload() {
    this.deps.inputRef?.current?.click?.();
    // ... perform upload ...
    this.deps.onComplete?.();
  }
}
```

**Multi-consumer merge:** when multiple components provide the same cubit with different `deps`, their keys are shallow-merged:

```tsx
// Component A owns inputRef
cubitA[APPLY_DEPS](ownerIdA, { inputRef });

// Component B owns onSubmit
cubitB[APPLY_DEPS](ownerIdB, { onSubmit });

// cubit.deps === { inputRef, onSubmit } (merged from both consumers)
```

**Avoid raw callbacks** — the callback staleness gotcha. Prefer:

1. **Don't inject callbacks — invert** (best): expose state and let React call the fresh callback in its own effect.
2. **Stabilize at source** — wrap in `useCallback`.
3. **As an event** — push the callback via a bloc method called from your effect.

### events: Methods Called from Effects

For data that changes over the instance's life (a `slides` array, a `theme` selection), call an ordinary bloc method from an effect — not a provider-owned input. This keeps ownership explicit and eliminates render-time mutation.

```ts
class CarouselCubit extends Cubit<CarouselState> {
  slidesChanged(slides: Slide[]) {
    this.patch({ slides, total: slides.length });
  }
}
```

```tsx
function Carousel({ slides }: { slides: Slide[] }) {
  const [state, cubit] = useBloc(CarouselCubit, { args: { id } });

  // ONE component owns syncing this live value
  useEffect(() => {
    cubit.slidesChanged(slides);
  }, [cubit, slides]);

  return /* ... */;
}
```

**Convention:** _one component owns syncing any given live value._ Two components calling the same event from both their effects on the same shared instance is a design smell (and rare, because keyed `args` usually route multi-consumer cases to distinct instances).

### Tracking Modes

**Auto-tracking (default):** Only re-renders when accessed properties change.

```tsx
const [state] = useBloc(UserBloc);
return <h1>{state.name}</h1>; // only re-renders when name changes
```

**Manual dependencies (select):** Explicit dependency array (disables auto-tracking).

```tsx
const [state] = useBloc(CounterCubit, {
  select: (state) => [state.count],
});
```

### Options

| Option      | Type                         | Description                                                                      |
| ----------- | ---------------------------- | -------------------------------------------------------------------------------- |
| `args`      | `Args` type                  | Required when bloc declares `Args != void`; forbidden when `void`                |
| `select`    | `(state, bloc) => unknown[]` | Manual dependency selector (renamed from `dependencies`); disables auto-tracking |
| `onMount`   | `(bloc) => void`             | Called when component mounts                                                     |
| `onUnmount` | `(bloc) => void`             | Called when component unmounts                                                   |

> Auto-tracking is always on when `select` is omitted — it is **not** a configurable option. `deps`, `autoInstance`, and `instanceId` are not `useBloc` options: wire deps from a mount effect (`APPLY_DEPS` / `REMOVE_DEPS_OWNER`); for per-mount private instances, embed a stable unique ID in `args` (e.g. `{ args: { _id: useId() } }`).

### Identity and Keying

Instance identity is resolved in precedence order:

1. **`<BlocProvider>` context id** — inherited from an ancestor provider
2. **`static key(args)` → structural hash of `args`** — default when the bloc declares `Args` (`static key` wins if defined; otherwise a stable hash of all `args`)
3. **`'default'`** — singleton fallback

For a per-mount private instance, embed a stable unique ID inside `args` so each mount hashes to a distinct key:

```tsx
const id = useId();
useBloc(FormCubit, { args: { ...options, _id: id } });
```

Blocs declare explicit identity via a static class property:

```ts
class DocumentCubit extends Cubit<
  DocState,
  { docId: string; readonly: boolean }
> {
  static key = (args) => args.docId;
  // Identity is docId; readonly config rides along but doesn't fork instances
}
```

### Instance Sharing and Lifecycle

By default, all components using `useBloc(MyBloc)` with the same identity share one instance. For per-component private instances, embed a unique ID in `args` so each mount derives a distinct key:

```tsx
// All users with userId=123 share one instance
useBloc(UserCardCubit, { args: { userId: 123 } });

// Each component mount gets its own instance, disposed on unmount
const id = useId();
useBloc(FormCubit, { args: { ...options, _id: id } });

// Explicit stable key (escape hatch for non-derivable identity)
useBloc(EditorCubit, { args: { _id: 'editor-1' } });
```

### Breaking Changes (v2)

- **`dependencies` option renamed to `select`** — avoids confusion with the `deps` (non-serializable handles) lane.
- **`autoTrack`, `autoInstance`, `instanceId`, and `deps` are no longer `useBloc` options** — auto-tracking is always on (opt out per-consumer with `select`); per-mount private instances embed a unique ID in `args`; deps are wired from a mount effect via `APPLY_DEPS` / `REMOVE_DEPS_OWNER`.
- **Zero-arg constructor + `init(args)` lifecycle** — all blocs now use `new Type()` with no constructor args. Blocs that declare `Args` receive them via `init(args)` called by the framework before the first state snapshot.
- **`args` is required when declared, forbidden when void** — enforced by the type system; no runtime guard needed.

## Configuration

```tsx
import { configureBlacReact } from '@blac/react';

// Configuration is currently empty; the tracking model is fixed and not configurable.
configureBlacReact({});
```

## Testing

```tsx
import { renderWithBloc } from '@blac/react/testing';
```

See the [testing docs](https://blac-docs.pages.dev/testing/react) for details.

## License

MIT
