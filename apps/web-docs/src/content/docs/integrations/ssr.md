---
title: SSR & per-request isolation
description: BlaC's registry is a module-level singleton — on a server, give each request its own isolated registry to prevent cross-request state leakage.
---

BlaC's registry is a module-level singleton. In the browser that is exactly what you want: every `useBloc` call across your app resolves the same `(class, key)` to the same instance, so state is shared with no providers. On a server, that same singleton is a problem — one process handles many requests, and a shared registry means **one user's bloc state can bleed into another user's request**.

This page names that hazard plainly and shows the fix that already ships: swapping the active registry per request via `setRegistry` / `getRegistry`, so each request gets its own isolated set of bloc instances.

## The problem: cross-request state leakage

On the client there is one user and one registry, for the life of the tab. On the server there is one **process** and one module-level registry (`globalRegistry`), but **many concurrent users**. Every registry function — `acquire`, `ensure`, `borrow`, `release`, and `watch` (which resolves via `ensure`) — routes through a single module-level variable inside `@blac/core`:

```ts
// packages/blac-core/src/registry/config.ts (verified)
let _registry = globalRegistry;

export function getRegistry(): StateContainerRegistry {
  return _registry;
}

export function setRegistry(registry: StateContainerRegistry): void {
  _registry = registry;
}
```

If nothing swaps `_registry`, **every request shares `globalRegistry`**. Concretely:

- Request A renders for user A, `acquire(SessionCubit)` creates an instance keyed `'default'` and fills it with user A's data.
- Request B renders for user B. `acquire(SessionCubit)` finds that _same_ `'default'` instance already on the shelf and reuses it — now serving user A's session data to user B.

This is not a re-render bug or a hydration mismatch. It is a correctness and **security** hole: server-rendered HTML for one user can contain another user's state. The same goes for any keyed instance whose key is not perfectly request-unique — and for `keepAlive` blocs, which by design survive ref count zero and therefore persist _across_ requests in a long-lived process.

:::danger[The cross-request leak rule]
**On the server, never let two requests share a registry.** A module-level singleton that lives for the life of the process is shared by every request that process handles. Give each request its own `StateContainerRegistry`, make it the active one for the duration of that request only, and discard it when the request ends. State that outlives a single request is a data-leak waiting to happen.
:::

## The fix: a registry per request

`@blac/core` exposes the registry as a swappable slot, not a hard-coded global. Three exports do the work:

```ts twoslash
import {
  StateContainerRegistry,
  getRegistry,
  setRegistry,
  globalRegistry,
} from '@blac/core';

// Construct a fresh, empty registry — its own instance map, no shared state.
const requestRegistry = new StateContainerRegistry();

// Make it the active registry. Every acquire/ensure/release/watch now uses it.
setRegistry(requestRegistry);

// Read the active registry (defaults to globalRegistry until you swap it).
const active: StateContainerRegistry = getRegistry();

// Restore the process-wide default when the request is done.
setRegistry(globalRegistry);
```

| Export                   | What it is                                                                                             | Role in SSR                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `StateContainerRegistry` | The registry **class**. `new StateContainerRegistry()` is an empty registry with its own instance map. | Construct one per request.                                      |
| `setRegistry(registry)`  | Sets the module-level active registry.                                                                 | Point the active slot at the request's registry.                |
| `getRegistry()`          | Returns the current active registry (initially `globalRegistry`).                                      | Read it back if you need to operate on the active one directly. |
| `globalRegistry`         | The default singleton, used until `setRegistry` is called.                                             | The value you restore the slot to after a request.              |

A fresh `StateContainerRegistry` starts empty: no registered types, no instances, no refs. Bloc classes are not pre-registered against a registry — the first `acquire`/`ensure` of a class against whichever registry is active registers and creates the instance there. So once `setRegistry(requestRegistry)` runs, the very first `acquire(SessionCubit)` in that request creates a brand-new `SessionCubit` **inside `requestRegistry`**, isolated from every other request.

:::note[There is no `registry.dispose()`]
A `StateContainerRegistry` has no whole-registry teardown method. To dispose the blocs inside one, call `registry.clearAll()` (disposes and removes every instance it holds, ignoring ref counts and `keepAlive`). If you simply drop all references to a per-request registry instead, it — and the blocs it holds — become eligible for garbage collection along with the request. Verify the surface in [Instance Management](/core/instance-management).
:::

## The pattern: scope the swap to the request

`setRegistry` is a single global slot, so the naive "set at the start of the handler, restore at the end" only works if nothing async interleaves between two requests. Under real concurrency — `await`ing a data fetch mid-render while another request runs — a bare set/restore races: request B's `setRegistry` clobbers the slot while request A is suspended.

Node's [`AsyncLocalStorage`](https://nodejs.org/api/async_context.html) is the standard tool for request-scoped values that survive `await`. BlaC does **not** ship an `AsyncLocalStorage` integration — the exports above are the primitives. The wiring below is an **application-level pattern** you build on top of `setRegistry` / `getRegistry`: keep the per-request registry in `AsyncLocalStorage`, and make a tiny shim so `getRegistry` resolves the registry for the _current async context_ rather than a single shared variable.

```ts
import { AsyncLocalStorage } from 'node:async_hooks';
import {
  StateContainerRegistry,
  setRegistry,
  globalRegistry,
} from '@blac/core';

// One ALS for the whole process; each request stores its own registry in it.
const registryStore = new AsyncLocalStorage<StateContainerRegistry>();

// Resolve the active registry from the current async context, falling back to
// the process default for any code that runs outside a request scope.
function activeRegistry(): StateContainerRegistry {
  return registryStore.getStore() ?? globalRegistry;
}

// Run `fn` with a fresh, isolated registry that is torn down afterwards.
async function withRequestRegistry<T>(fn: () => Promise<T>): Promise<T> {
  const requestRegistry = new StateContainerRegistry();
  return registryStore.run(requestRegistry, async () => {
    // Point @blac/core's active slot at this request's registry while the
    // synchronous render runs. (See the note below on the async caveat.)
    setRegistry(requestRegistry);
    try {
      return await fn();
    } finally {
      // Dispose every bloc created during this request, then restore default.
      requestRegistry.clearAll();
      setRegistry(globalRegistry);
    }
  });
}
```

A realistic server handler then wraps the render in `withRequestRegistry` (reusing the helper defined above):

```ts
async function handleRequest(req: Request): Promise<Response> {
  const html = await withRequestRegistry(async () => {
    // Any acquire/ensure/watch reached during this render resolves against
    // THIS request's registry — never another request's, never the global one.
    return renderToString(<App url={req.url} />);
  });

  return new Response(`<!doctype html><div id="root">${html}</div>`, {
    headers: { 'content-type': 'text/html' },
  });
}
```

:::caution[The async caveat with the single global slot]
`setRegistry` mutates one process-wide variable. `AsyncLocalStorage` makes the registry available per-context, but `getRegistry()` inside `@blac/core` still reads that one variable unless you bridge the two. Two robust ways to do that:

- **Render synchronously per request.** If the render that touches blocs is synchronous (no `await` between `setRegistry(requestRegistry)` and `setRegistry(globalRegistry)`), no other request can interleave on the slot, and the bare set/restore is safe. This is the simplest correct setup and covers most `renderToString` flows.
- **Bridge `getRegistry` to your ALS.** If your render `await`s mid-flight, do not rely on the global slot during those awaits. Resolve the registry from `AsyncLocalStorage` (the `activeRegistry()` helper above) at every registry call site so each suspended request keeps reading its own registry. The exported `setRegistry`/`getRegistry` slot remains the fallback for non-request code.

Pick synchronous rendering if you can; reach for the ALS bridge only when concurrent async renders genuinely share the process.
:::

## Client hydration uses the global registry

On the client there is one registry for the whole tab, so isolation is a non-issue — do **not** call `setRegistry` in browser code. Client `useBloc` calls resolve against `globalRegistry` (the default the slot points at until something swaps it), exactly as in a non-SSR app.

That means the registries on the two sides are independent: the server's per-request registry produced the HTML string, and the client's `globalRegistry` rehydrates from scratch on mount. BlaC does not serialize the server registry into the client — blocs re-create from their constructors during hydration. If a bloc needs server-computed data to render identically on both sides, pass that data in as [`args`](/guide/inputs) (or serialize it into the page and feed it to the bloc's `init`), the same way you would seed any client-side state for hydration.

## A note on Vite / dev SSR

Under Vite's dev SSR (`vite-node`, `ssrLoadModule`) each request goes through the same module graph in one process, so the module-level registry slot is shared exactly as in production — the per-request pattern above applies unchanged in dev. The one extra hazard is **HMR**: hot-reloading the module that owns `globalRegistry`, or your ALS store, can leave you with two copies of the singleton (the old one and the freshly evaluated one) and instances split between them. If you see stale or duplicated instances only after a hot update, force a full reload rather than chasing it as a logic bug.

## See also

- [Instance Management](/core/instance-management) — the registry, ref counting, `clearAll`, and the lending-library model
- [Passing Inputs](/guide/inputs) — `args` and instance identity, the seam for feeding server data into hydration
- [Configuration](/core/configuration) — `keepAlive` (which makes cross-request persistence worse) and the circuit breakers
- [watch](/core/watch) — observing blocs outside React, and how it resolves through the active registry
- [Testing core logic](/testing/core) — `clearAll` for isolating the registry between tests, the same primitive you use per request
