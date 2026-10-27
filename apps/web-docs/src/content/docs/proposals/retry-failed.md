---
title: 'Proposal: Retry After Token Refresh'
description: Preview of retryFailed() for @blac/async, replacing an app-wide token-refresh event that reloads every failed container.
---

:::caution[Proposal — not built]
Nothing on this page exists in `@blac/async` yet. The API, names and behavior are up for review, and the code samples are illustrative (not compiled). See the [proposals index](/proposals/) for the other pages.
:::

## Problem

A common way to recover from an expired token is an app-wide event:

1. A session container refreshes the access token, then dispatches a `token-refreshed` event.
2. Every data container listens. If it is in an error state and remembers its last parameters, it reloads.

Each data container stores its last parameters just for this, and the retry works for keepAlive instances with no owners.

There are two kinds of refresh, and only one needs the library:

- **On demand** (`401` → refresh → retry). This belongs in the fetch layer, because every request needs it. A typical client already queues concurrent `401`s behind one refresh and retries each request once. The production codebase behind these proposals does this, so the earlier idea of a `retryOn` recipe is dropped, and `retryOn` itself has been removed. A request that still fails after the refresh rejects like any other error.
- **Scheduled** (a timer refreshes the token before it expires). Requests that failed in the meantime, for example while the device was offline or the old token was rejected, stay failed. Nothing retries them, which is what the event above is for.

`invalidate(tag)` reloads errored resources, but only those that declared a tag, and the caller must know the tags. So the event has no replacement for "a refresh just succeeded, reload everything that failed".

## Proposal

### `retryFailed(registry?)` (new API)

```ts
import { retryFailed } from '@blac/async';

retryFailed(); // global registry
retryFailed(registry); // a RegistryProvider scope
```

Re-runs every **resource** in the `error` state:

- An active resource reloads now.
- An inactive one (for example `keepAlive` with no owners) is marked stale and loads on its next activation. This is the same rule `invalidate` follows.
- Resources that are `idle`, `loading` or `success` are untouched, and **mutations are never retried**, since replaying a side effect is unsafe.

It needs a per-registry set of every resource, next to the existing tag index in `invalidate.ts`. No tags are required. About 15 lines.

## Use

```ts
// session container, after a successful refresh
this.emit({ ...this.state, accessToken, status: 'authenticated' });
retryFailed();
```

```ts
// scoped test or workspace subtree
retryFailed(registry);
```

## Before and after

### Dispatching the refresh

```ts title="Before"
this.emit({
  ...this.state,
  refreshToken,
  status: 'authenticated',
  accessToken: newAccessToken,
  sessionExpired: false,
});

eventBus.dispatch(new AppEvent(TOKEN_REFRESHED_EVENT));
```

```ts title="After"
this.emit({
  ...this.state,
  refreshToken,
  status: 'authenticated',
  accessToken: newAccessToken,
  sessionExpired: false,
});

retryFailed();
```

### Receiving it: a base class for data containers

Abridged. This is the part every data container inherits.

```ts title="Before"
export const TOKEN_REFRESHED_EVENT = 'token-refreshed';

protected lastParams: TParams | null = null;

readonly getData = (parameters: TParams): TData | null => {
  this.lastParams = parameters; // remembered only so the event can retry
  // ...
};

_onEvent(event: AppEvent): void {
  if (sessionResetApplies(event, this._id)) {
    this.resetData();
    return;
  }
  if (
    event.type === TOKEN_REFRESHED_EVENT &&
    this.getRequestError(DEFAULT_KEY) &&
    this.lastParams
  ) {
    this.reloadData(this.lastParams);
  }
}
```

```ts title="After"
// nothing: a resource already knows how to reload itself,
// because its function reads args from the container
data = resource(this, 'data', (signal, args) => api.get(args, signal), {
  auto: true,
});
```

What goes away: the event constant, the `_onEvent` branch, `lastParams` (the resource reads `host.args`), and the cross-container event dispatch from the session container. The session-reset branch beside it is covered by `clearWhere`, which is already built.

### Test

```ts title="Before"
dataCubit._onEvent(new AppEvent(TOKEN_REFRESHED_EVENT));
```

```ts title="After"
const cubit = withBlocState(
  DataCubit,
  { data: failure(new Error('401')) },
  args,
);
retryFailed();
await waitForState(cubit, (s) => s.data.status === 'success');
```

The tests around the event become tests of the mapping in the app, not of the event plumbing.

## Differences to review

- **Inactive instances.** Before, a keepAlive data container with an error reloaded on the event even with no owner. After, it loads on its next activation. That avoids a request nobody is waiting for, but the data is not warm when the screen returns.
- **Ordering.** The event was synchronous and fire-and-forget. `retryFailed()` starts the reloads and returns `void`, so callers do not wait either.
- **Per-call `onError`.** A reload through `retryFailed` goes through the same `onError` path, so a failure that persists is reported again. Decide whether a retry should report only when the error differs.

## Library change

- `invalidate.ts`: a per-registry `Set` of resources, filled and cleared next to the tag index.
- `resource.ts`: the entry exposes `failed()`.
- Tests: active and inactive errored resources, scope isolation across registries, mutations untouched.
- Docs: a section in `guide/async-resources.md`.

Effort: about 3 hours.

## Open questions

- **Name.** `retryFailed` vs `reloadFailed` vs `invalidate('*')`. A wildcard tag avoids a new export, but makes `invalidate`'s contract looser.
- **Mutations.** Excluded by design. Is there a case where a failed mutation should replay after a refresh? The fetch layer already retries a request once after an on-demand refresh.
