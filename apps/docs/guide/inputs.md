# Passing Inputs to Blocs

Blocs sometimes need external data — a user ID to load, an endpoint URL, a DOM ref for a canvas. Passing that data safely is trickier than it looks, because multiple components can share one instance and each wants to set something on it.

::: info Why this needs its own model
A naive answer is "pass one `props`-style object into the bloc." That breaks the moment two components share an instance: if both write the same input, whoever rendered last wins, and the value flickers on every render — an *override race*. The fix is to recognise that "inputs" is really **three different needs**, each with its own lifetime and its own answer. Sorting an input into the right lane is what makes shared instances safe.
:::

The three lanes — `args`, `deps`, and events — and the [identity model](#identity-model-and-precedence) below are the whole story. The mechanics here are accurate as of v2; for the broader *why* behind shared, ref-counted instances see the [Mental Model](/guide/mental-model), and for the judgment of *which lane to reach for* see [Best Practices](/guide/best-practices).

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

See [Configuration](/core/configuration) for the rest of the `blac()` options (`keepAlive`, `equality`, `excludeFromDevTools`) and [Glossary](/guide/glossary) for how `args`, `static key`, and `instanceId` relate.

### Per-component private instances

To give each mount its own instance — disposed on unmount, never shared — pass a unique `instanceId`. The idiomatic source of a stable-per-mount key is React's `useId()`:

```tsx
// private instance, own lifecycle, seeded with args
const instanceId = useId();
const [state, cubit] = useBloc(FileUploadCubit, { args: options, instanceId });
```

Because `useId()` returns a different value per component instance (and the same value across that component's re-renders), each mount gets a private bloc that lives and dies with it. The `instanceId` you pass always wins over an inherited [`<BlocProvider>`](/react/use-bloc) context and over any args-derived key.

::: warning No `autoInstance` option
Earlier drafts (and some example UI text) mention `useBloc(C, { args, autoInstance: true })`. **That option does not exist** in v2 — `useBloc` accepts only `args`, `instanceId`, `select`, `onMount`, and `onUnmount`. The per-mount idiom is the explicit `instanceId: useId()` shown above. See [useBloc](/react/use-bloc) for the complete option list.
:::

### Args must be serializable

Args participate in identity hashing. Refs, callbacks, DOM elements, and class instances cannot go in `args` — they belong in the `deps` lane (below). Passing non-serializable values produces an unstable hash (a new key every render) which will cause a new instance on every render.

---

## `deps`: non-serializable handles

Some things are genuinely non-serializable: a `useRef` container, a `useCallback`-stabilized handler, an Embla API instance handed in from outside. These live in the bloc's third type parameter — its `Deps` — and obey these rules:

- **Never key identity** — different refs don't fork the instance.
- **Per-consumer merged** — each component contributes its own slice; the bloc sees the union.
- **Read lazily** — via `this.deps.x` at action time, may be `undefined`. Always guard.
- **Applied post-commit** — never during render; no mid-render mutation.

The bloc side is declarative: declare the `Deps` shape and read `this.deps.x` lazily.

```ts
import type { RefObject } from 'react';

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

### Wiring deps from a component

::: warning `deps` is not a `useBloc` option
There is no `deps:` key on `useBloc` in v2. A component contributes its slice by calling the bloc's deps methods from a **mount effect** (post-commit, as the rules require). Import the methods from `@blac/core`:
:::

```tsx
import { useEffect, useId, useRef } from 'react';
import { APPLY_DEPS, REMOVE_DEPS_OWNER } from '@blac/core';
import { useBloc } from '@blac/react';

function UploadButton({ endpoint }: { endpoint: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const ownerId = useId();                       // identifies THIS consumer's slice
  // same endpoint → same instance, regardless of which ref is passed
  const [state, cubit] = useBloc(FileUploadCubit, { args: { endpoint } });

  useEffect(() => {
    cubit[APPLY_DEPS](ownerId, { inputRef });    // contribute this consumer's slice
    return () => cubit[REMOVE_DEPS_OWNER](ownerId); // withdraw it on unmount
  }, [cubit, inputRef, ownerId]);

  return <button onClick={() => cubit.openPicker()}>Choose file</button>;
}
```

`ownerId` (a `useId()` value, stable per mount) tags the slice so the engine knows which consumer wrote it and can withdraw exactly that slice on unmount.

::: details Why an effect, not a render-time call
Deps must be applied *after* commit so a freshly mounted `ref.current` is populated and so mid-render mutation never happens. The effect runs post-commit; its cleanup runs before the consumer's `useBloc` releases its ref, so the slice is withdrawn while the bloc is still alive. `APPLY_DEPS`/`REMOVE_DEPS_OWNER` are marked `@internal` today (a friendlier wrapper may land later), but this is the supported path.
:::

### Multi-consumer merge

Different components can contribute different slices of deps to the same instance. The rules are simple:

1. Each consumer's keys are shallow-merged into `bloc.deps`.
2. When a consumer unmounts, its keys are withdrawn; other consumers' keys are untouched.
3. If two consumers set the same key to different values, a dev warning fires and the last write wins — a design smell, since one key should have one owner.

```tsx
// Component A owns inputRef
cubit[APPLY_DEPS](ownerIdA, { inputRef });

// Component B owns onSubmit
cubit[APPLY_DEPS](ownerIdB, { onSubmit });

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

2. **Stabilize with `useCallback`** before contributing it as a dep.

3. **Push via a bloc method from an effect** — `useEffect(() => cubit.setOnComplete(cb), [cb])`.

::: warning Common mistakes
- **Non-serializable value in `args`** — a ref, callback, DOM node, or class instance makes the structural hash unstable, so you get a *new instance every render*. Put it in deps instead. (The structural-key hasher throws in dev if it sees a function in `args`.)
- **Capturing an inline callback in deps** — `{ onComplete: () => doThing() }` freezes the first render's closure. Stabilize with `useCallback`, or invert the callback (option 1 above).
- **Two consumers writing the same deps key** — last write wins and the value flickers. Give each shared value exactly one owning component.
- **Reaching for `deps:` or `autoInstance:` as `useBloc` options** — neither exists. Wire deps from an effect; key per-mount instances with `instanceId: useId()`.
:::

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

When `useBloc` resolves which instance to connect to, it consults sources in this order — **the first that yields a key wins**. This is the canonical ordering; [useBloc](/react/use-bloc) restates the same list.

| Priority | Source | Resolved key |
|---|---|---|
| 1 | explicit `instanceId` option | The literal value you pass (escape hatch / per-mount via `useId()`) |
| 2 | `<BlocProvider>` context id | Inherited from a parent provider when no explicit `instanceId` |
| 3 | `static key(args)` | Return value of the class's key function |
| 4 | Structural hash of `args` | Default when `args` are declared and no `static key` |
| 5 | `'default'` | Singleton fallback (no `args`, no key, no context) |

`args`-derived identity (rows 3–4) is the **primary idiom** for meaningful per-value instances. `instanceId` (row 1) is the escape hatch for identities that can't be derived from args — anonymous, opaque, externally managed, or deliberately per-mount via `useId()`.

### Decision matrix

Two questions decide everything: **is this input identity (set once) or live (changes over the instance's life)?** and **is the instance private to one component or shared?**

| | Input defines identity / set once | Input is live and changing |
|---|---|---|
| **Private to one component** | `useBloc(C, { args, instanceId: useId() })` — own instance, seeded from args | per-mount `instanceId` + call `cubit.xChanged(v)` from that component's effect |
| **Shared across consumers** | `useBloc(C, { args })` — args key the instance; override race impossible | call `cubit.xChanged(v)` from the **one owning component's** effect |

Non-serializable handles (refs, callbacks, controllers) sit *outside* this matrix entirely — they go through the [deps lane](#deps-non-serializable-handles) and never touch identity.

---

## A note on naming

The `select` option (the per-consumer re-render selector) is unrelated to the `deps` lane on this page, despite both sounding "dependency"-ish. `select` opts a consumer *out* of auto-tracking; `deps` feeds *non-serializable handles* into the bloc. In v1 the selector was called `dependencies` — that name was retired precisely to remove this collision. The full rename is documented on the [migration page](/guide/migration-from-v1).

## See also

- [Best Practices](/guide/best-practices) — *which* lane to choose, and the judgment behind it
- [Mental Model](/guide/mental-model) — *why* instances are shared and ref-counted
- [useBloc](/react/use-bloc) — the complete option list and identity precedence (canonical)
- [Glossary](/guide/glossary) — definitions of `args`, `deps`, `instanceId`, `static key`
- [Patterns & Recipes](/guide/patterns) — concrete copy-paste recipes
- [Cubit](/core/cubit) — `init(args)`, `onDepsChanged`, and the mutation API
