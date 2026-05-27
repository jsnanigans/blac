# Passing Inputs to Blocs

Blocs sometimes need external data — a user ID to load, an endpoint URL, a DOM ref for a canvas. Passing that data safely is trickier than it looks, because multiple components can share one instance and each wants to set something on it.

BlaC solves this by recognising that "inputs" is really three different needs, each with a different answer.

## The three input lanes

| Lane | Purpose | Keys identity? | Lifetime | Example |
|---|---|---|---|---|
| **`args`** | Typed creation/config data | **Yes** (structural hash or `static key`) | Set once via `init(args)` | `userId`, `endpoint`, `filters` |
| **`deps`** | Non-serializable handles | **Never** | Live, per-consumer merged | `inputRef`, stable callback, `emblaApi` |
| **events** | Values that change over the instance's life | N/A | Called from effects | `cubit.slidesChanged(v)` |

These map onto a familiar React split: `args` is like `defaultValue` (set at birth, identity-bearing), `events` is like `value`/`onChange` (a live channel owned by one component), and `deps` is the side channel for things that can't be serialized at all.

---

## `args`: construction data that keys the instance

When a bloc declares an `Args` type, `useBloc` requires you to pass `args`. They are:

- Forwarded to the bloc's `init(args)` method **once, synchronously, before the first state snapshot** — so initial state is correct on the first render, no flash.
- Used to **derive the instance key** — different args ⇒ different instance. Same args ⇒ same instance.
- A **type error** to omit when declared, or to pass when `Args` is `void`.

```ts
class UserCardCubit extends Cubit<UserCardState, { userId: string }> {
  init(args: { userId: string }) {
    // called once by the framework at creation, before the first snapshot
    void this.loadUser(args.userId);
  }
}
```

```tsx
// args is required and type-checked
const [state] = useBloc(UserCardCubit, { args: { userId } });
```

**Why this eliminates the override race:** each distinct `userId` produces a distinct instance. Multiple components rendering the same `userId` share one instance and their `args` are by definition identical. There is nothing to race over.

### Identity keying

By default, identity is the **structural hash of all args** (the same principle as `atomFamily` and TanStack Query's `queryKey`). This is safe because args must be JSON-serializable — no refs or callbacks can accidentally destabilize the hash.

Override identity with a `static key` on the class when only a subset of args should key the instance, or when you want a human-readable key:

```ts
class DocumentCubit extends Cubit<DocState, { docId: string; readonly: boolean }> {
  static key = (args: DocumentCubit['args']) => args.docId;
  // `readonly` is config that rides along but does NOT fork instances
}
```

`static key` is declared **once on the class**, not repeated at every call site. It reads as a plain statement of what distinguishes one `DocumentCubit` from another.

You can also supply `static key` via the `blac()` decorator/config function:

```ts
const DocumentCubit = blac({ key: (args) => args.docId })(
  class extends Cubit<DocState, { docId: string; readonly: boolean }> { ... }
);
```

### Per-component private instances

Combine `args` with `autoInstance: true` to give each mount its own instance, disposed on unmount. This replaces the old pattern of threading a `useId()` value through `instanceId` manually:

```tsx
// private instance, own lifecycle, seeded with args
const [state, cubit] = useBloc(FileUploadCubit, { args: options, autoInstance: true });
```

### Args must be serializable

Args participate in identity hashing. Refs, callbacks, DOM elements, and class instances cannot go in `args` — they belong in the `deps` lane (below). Passing non-serializable values produces an unstable hash (a new key every render) which will cause a new instance on every render.

---

## `deps`: non-serializable handles

Some things are genuinely non-serializable: a `useRef` container, a `useCallback`-stabilized handler, an Embla API instance handed in from outside. These go in `deps`:

- **Never key identity** — different refs don't fork the instance.
- **Per-consumer merged** — each component contributes its own slice; the bloc sees the union.
- **Read lazily** — via `this.deps.x` at action time, may be `undefined`. Always guard.
- **Applied post-commit** — never during render; no mid-render mutation.

```ts
class FileUploadCubit extends Cubit<
  UploadState,
  { endpoint: string },                       // args → keys identity
  { inputRef?: RefObject<HTMLInputElement> }  // deps → never keyed, read lazily
> {
  init(args: { endpoint: string }) {
    this.endpoint = args.endpoint;
  }

  openPicker() {
    this.deps.inputRef?.current?.click?.();   // guard for absence
  }
}
```

```tsx
const inputRef = useRef<HTMLInputElement>(null);
// same endpoint → same instance, regardless of which ref is passed
const [state, cubit] = useBloc(FileUploadCubit, {
  args: { endpoint },
  deps: { inputRef },
});
```

### Multi-consumer merge

Different components can contribute different slices of `deps` to the same instance. The rules are simple:

1. Each consumer's keys are shallow-merged into `bloc.deps`.
2. When a consumer unmounts, its keys are withdrawn; other consumers' keys are untouched.
3. If two consumers set the same key, a dev warning fires and the last write wins (this is a design smell — one key should have one owner).

```tsx
// Component A owns inputRef
useBloc(FormCubit, { args: { formId }, deps: { inputRef } });

// Component B owns onSubmit
useBloc(FormCubit, { args: { formId }, deps: { onSubmit } });

// bloc.deps === { inputRef, onSubmit } — assembled from both consumers
```

### `onDepsChanged` — reacting when a handle arrives

For handles that need to trigger initialization (a canvas, a rich-text-editor controller), implement `onDepsChanged` on the bloc. It fires after each deps merge, receives `(next, prev)`, and lets the bloc diff which handle changed:

```ts
class CanvasRendererCubit extends Cubit<
  RenderState,
  { sceneId: string },
  { canvas?: HTMLCanvasElement; controller?: RteController }
> {
  onDepsChanged(next: this['deps'], prev: this['deps']) {
    if (next.canvas && next.canvas !== prev.canvas) {
      this.initRenderer(next.canvas);   // canvas arrived or changed → init GPU loop
    }
    if (!next.canvas && prev.canvas) {
      this.disposeRenderer();           // canvas unmounted → tear down
    }
    if (next.controller !== prev.controller) {
      this.bindController(next.controller);
    }
  }
}
```

This is the canonical pattern for "wait for a ref, then initialize." Blocs that don't declare `onDepsChanged` just read `this.deps.x` lazily when an action runs.

### The callback staleness gotcha

An inline callback (`onComplete={() => doThing()}`) gets a new function identity every render. If you capture it once in `deps`, the bloc holds the first closure forever.

Prefer these patterns, best first:

1. **Callback inversion (recommended):** expose state; let the component call its own fresh callback in a `useEffect`.

   ```tsx
   const [{ uploadedId }] = useBloc(FileUploadCubit, { args: { endpoint } });
   useEffect(() => {
     if (uploadedId) onComplete(uploadedId); // always the current closure
   }, [uploadedId, onComplete]);
   ```

2. **Stabilize with `useCallback`** before passing to `deps`.

3. **Push via a bloc method from an effect** — `useEffect(() => cubit.setOnComplete(cb), [cb])`.

---

## Events: live data from one owning effect

For values that **genuinely change** over a shared instance's life — a `slides` array, a selected `theme` — call an ordinary bloc method from a single effect. This is the XState/flutter_bloc model: no `inputs` slot, no new concept, just a method call after commit.

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

**Convention:** one component owns syncing any given live value. Two components both calling `cubit.slidesChanged` from their own effects on the same instance is a design smell (and rare — keyed `args` usually route such cases to distinct instances).

---

## Identity model and precedence

Instance identity resolves in this order — explicit beats derived:

| Priority | Source | Identity |
|---|---|---|
| 1 | `instanceId` option | The literal value you pass (escape hatch) |
| 2 | `autoInstance: true` | A `useId()` key per mount |
| 3 | `static key(args)` | Return value of the class's key function |
| 4 | Structural hash of `args` | Default when `static key` is absent |
| 5 | `<BlocProvider>` context id | Inherited from a parent provider |
| 6 | `'default'` | Singleton fallback (no args declared) |

`args`-derived identity is the **primary idiom** for meaningful per-value instances. `instanceId` is the escape hatch for identities that can't be derived from args (anonymous, opaque, or externally managed keys).

### Decision matrix

| | Input defines identity / set once | Input is live and changing |
|---|---|---|
| **Private to one component** | `useBloc(C, { args, autoInstance: true })` | `autoInstance` + call `cubit.xChanged(v)` from that component's effect |
| **Shared across consumers** | `useBloc(C, { args })` — args key the instance; race impossible | Call `cubit.xChanged(v)` from the **one owning component's** effect |

---

## Breaking change (v1 → v2)

The `dependencies` option on `useBloc` has been **renamed to `select`**. It was renamed to avoid confusion with the new `deps` lane (non-serializable handles).

```tsx
// v1 — no longer valid
useBloc(MyCubit, { dependencies: (s) => [s.count] });

// v2
useBloc(MyCubit, { select: (s) => [s.count] });
```

There is no compatibility shim. Update call sites by renaming the option key.

See also: [useBloc](/react/use-bloc), [Cubit](/core/cubit), [Patterns & Recipes](/guide/patterns)
