# @blac/react

React bindings for BlaC — `useBloc` hook with proxy-based automatic re-render optimization.

**[Documentation](https://blac-docs.pages.dev/react/getting-started)** · **[npm](https://www.npmjs.com/package/@blac/react)**

## Installation

```bash
pnpm add @blac/react @blac/core
```

Requires React 18+ (`useSyncExternalStore`).

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

| Lane | Purpose | Keying | Lifetime | Example |
|---|---|---|---|---|
| **`args`** | Typed creation data; derives instance identity | **Yes** (structural hash or `static key`) | Once at `init()` | `userId`, `endpoint` |
| **`deps`** | Non-serializable refs, callbacks, handles | **Never** | Live, per-consumer merged | `ref`, `onComplete` callback, `emblaApi` |
| **events** | Values that change over time or are late-bound | N/A | Called from effects | `cubit.slidesChanged(v)` from `useEffect` |

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
- **Per-component private instances** — use with `autoInstance: true` to give each mount its own instance, disposed on unmount:

```tsx
const [state, cubit] = useBloc(FormCubit, { args: options, autoInstance: true });
```

### `deps`: Non-Serializable Refs and Callbacks

Use `deps` to inject refs, stable callbacks, and long-lived controller handles. Unlike `args`, `deps` are:
- **Never keying** — different refs don't fork the instance
- **Per-consumer merged** — each component contributes its own slice
- **Read lazily** — accessed via `this.deps.x` when needed, may be undefined
- **Live** — can change over time

```tsx
const inputRef = useRef<HTMLInputElement>(null);
const onComplete = useCallback(() => { /* ... */ }, []);

const [state, cubit] = useBloc(FileUploadCubit, {
  args: { endpoint },
  deps: { inputRef, onComplete },
});
```

The bloc reads them lazily and guards for absence:

```ts
class FileUploadCubit extends Cubit<UploadState, { endpoint: string }, {
  inputRef?: RefObject<HTMLInputElement>;
  onComplete?: () => void;
}> {
  async upload() {
    this.deps.inputRef?.current?.click?.();
    // ... perform upload ...
    this.deps.onComplete?.();
  }
}
```

**Multi-consumer merge:** when multiple components provide the same cubit with different `deps`, their keys are shallow-merged:

```tsx
// Component A provides inputRef
useBloc(FormCubit, { args: { formId }, deps: { inputRef } });

// Component B provides onSubmit
useBloc(FormCubit, { args: { formId }, deps: { onSubmit } });

// cubit.deps === { inputRef, onSubmit } (merged from both)
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

**Convention:** *one component owns syncing any given live value.* Two components calling the same event from both their effects on the same shared instance is a design smell (and rare, because keyed `args` usually route multi-consumer cases to distinct instances).

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

**No tracking:** Re-renders on every state change.

```tsx
const [state] = useBloc(MyBloc, { autoTrack: false });
```

### Options

| Option         | Type                         | Description                                          |
| -------------- | ---------------------------- | ---------------------------------------------------- |
| `args`         | `Args` type                  | Required when bloc declares `Args != void`; forbidden when `void` |
| `deps`         | `{ [key]: value }`           | Per-consumer slice of non-serializable handles |
| `autoTrack`    | `boolean`                    | Enable proxy-based auto-tracking (default: `true`)   |
| `select`       | `(state, bloc) => unknown[]` | Manual dependency selector (renamed from `dependencies`) |
| `autoInstance` | `boolean`                    | Per-mount instance keyed by `useId()` instead of shared (default: `false`) |
| `instanceId`   | `string \| number`           | Explicit identity key (overrides args-derived keying) |
| `onMount`      | `(bloc) => void`             | Called when component mounts                         |
| `onUnmount`    | `(bloc) => void`             | Called when component unmounts                       |

### Identity and Keying

Instance identity is resolved in precedence order:

1. **Explicit `instanceId`** — hard override if provided
2. **`autoInstance: true`** — per-mount instance keyed by `useId()`
3. **`static key(args)` → structural hash of `args`** — default when bloc declares `Args` (if `static key` is defined on the class, it takes precedence; otherwise a stable hash of all `args`)
4. **`<BlocProvider>` context id** — inherited from parent provider
5. **`'default'`** — singleton fallback

Blocs declare explicit identity via a static class property:

```ts
class DocumentCubit extends Cubit<DocState, { docId: string; readonly: boolean }> {
  static key = (args) => args.docId;
  // Identity is docId; readonly config rides along but doesn't fork instances
}
```

### Instance Sharing and Lifecycle

By default, all components using `useBloc(MyBloc)` with the same identity share one instance. Use `autoInstance` for per-component private instances:

```tsx
// All users with userId=123 share one instance
useBloc(UserCardCubit, { args: { userId: 123 } });

// Each component mount gets its own instance, disposed on unmount
useBloc(FormCubit, { args: options, autoInstance: true });

// Explicit id (escape hatch for non-derivable identity)
useBloc(EditorCubit, { instanceId: 'editor-1' });
```

### Breaking Changes (v2)

- **`dependencies` option renamed to `select`** — avoids confusion with the new `deps` (non-serializable handles) lane.
- **Zero-arg constructor + `init(args)` lifecycle** — all blocs now use `new Type()` with no constructor args. Blocs that declare `Args` receive them via `init(args)` called by the framework before the first state snapshot.
- **`args` is required when declared, forbidden when void** — enforced by the type system; no runtime guard needed.

## Configuration

```tsx
import { configureBlacReact } from '@blac/react';

configureBlacReact({ autoTrack: true });
```

## Testing

```tsx
import { renderWithBloc } from '@blac/react/testing';
```

See the [testing docs](https://blac-docs.pages.dev/testing/react) for details.

## License

MIT
