---
title: Async Resources
description: Load data and run mutations with @blac/async — a status slot in state, abort on release, latest-wins, and tag-based invalidation across containers.
---

[Async](/guide/async/) shows the hand-written loading flow. `@blac/async` packages that flow so a container only declares _what_ to fetch: the status union, abort, request ordering, dedupe and refetch are handled for you.

```bash
pnpm add @blac/async
```

## Resource

Declare a slot typed `AsyncState<T>` in your state, then bind a fetch to it with `resource(this, key, fn, options)`.

```ts
import { Cubit } from '@blac/core';
import { idle, resource, type AsyncState } from '@blac/async';

class ProfileCubit extends Cubit<
  { profile: AsyncState<Profile> },
  { userId: string }
> {
  constructor() {
    super({ profile: idle() });
  }

  profile = resource(
    this,
    'profile',
    (signal, { userId }) => api.getProfile(userId, signal),
    { auto: true },
  );
}
```

- The slot is plain state, so `useBloc` tracks it and tests can seed it: `{ status: 'idle' | 'loading' | 'success' | 'error', data?, error? }`. `data` is kept while reloading and after an error.
- `auto: true` loads on every activation (first owner), so no mount effect is needed. The `signal` aborts when the last owner releases or a newer call starts.
- Calls are **latest-wins**: a newer call aborts the earlier one and its result is ignored.
- `resource` returns `{ load, reload, set }`. `load()` reuses a call in flight and skips while data is fresh (`staleTime`, default `0`); `reload()` always starts a new call. `set` writes data locally, see [below](#local-writes).
- `fn` receives the container's `args` as its second parameter. It runs after the container is configured, so `args` is always set.
- A call cut short by deactivation does not leave the slot in `loading`; it goes back to the exact state before the call, including an `error`.

| Option      | Meaning                                                                 |
| ----------- | ----------------------------------------------------------------------- |
| `auto`      | Load on activation.                                                     |
| `staleTime` | Milliseconds a success stays fresh for `load()`.                        |
| `tags`      | `(args) => string[]` targets for `invalidate`; evaluated on activation. |
| `enabled`   | `(state, args) => boolean`; while `false`, the resource does not load.  |
| `onError`   | Runs before the global handler; return `false` to suppress it.          |

### Local writes

`set(updater)` writes `success` with new data, without a request. Use it to patch an item from a pushed message, or to replace one row after a save:

```ts
renameProject = async (id: string, name: string) => {
  const result = await this.rename({ id, name });
  if (result.status !== 'success') return;
  this.projects.set((list = []) =>
    list.map((p) => (p.id === id ? result.data : p)),
  );
};
```

`set` aborts a call in flight, so a load that started before the write cannot overwrite it, and leaves freshness alone. Call `reload()` afterwards if the aborted load is still needed.

### Gating with `enabled`

Replace a feature-flag or capability check at the top of a loader with `enabled`:

```ts title="Before"
loadSuggestions = async () => {
  if (!getBloc(FeatureFlags).isEnabled('suggestions')) return;
  // ...
};
```

```ts title="After"
suggestions = resource(
  this,
  'suggestions',
  (signal) => api.suggestions(signal),
  {
    auto: true,
    enabled: () => getBloc(FeatureFlags).isEnabled('suggestions'),
  },
);
```

While `enabled` returns `false`, `load()`, `reload()`, `auto` and `invalidate` do nothing and the slot keeps its state. It is checked on each of those calls, so a flag that turns on takes effect on the next one.

## Mutation

`mutation(this, key, fn, options)` returns an async function that writes `loading`, `success` or `error` to its own slot. It resolves to the settled `AsyncState`, the same value the slot holds. Failures land in the slot and the global `onError`; they do not throw.

```ts
rename = mutation(
  this,
  'rename',
  (name: string, { userId }) => api.rename(userId, name),
  {
    invalidates: (_name, _data, { userId }) => [`user:${userId}`],
    success: 'Saved',
  },
);
```

Check `status` rather than the data, which also works for APIs that return nothing:

```ts
const result = await this.save(settings);
if (result.status !== 'success') return;
analytics.track('settings saved');
```

### Optimistic updates

`optimistic` writes to a resource before the call and rolls the write back if the call fails:

```ts
add = mutation(this, 'add', (tag: string) => api.addTag(tag), {
  optimistic: {
    target: this.tags,
    apply: (tags = [], tag) => [...tags, tag],
  },
});
```

The rollback only applies if nothing newer has written to the resource since: a failed older call never reverts a newer write, a load or a `set`. On success, the optimistic data stays; add `invalidates` to reload it from the server.

## Invalidation

`invalidate(tags, registry?)` reloads every resource that declared one of the tags. Mutations call it for you through `invalidates`.

- A resource that is active, or already loaded, reloads immediately.
- One that is not active (for example a `keepAlive` instance with no owners) is marked stale and loads on its next activation.
- Tags are flat strings, and a resource matches if it declared any of the tags passed. Declare both a kind and an instance tag, so callers can target either:

  ```ts
  tags: ({ userId }) => ['user', `user:${userId}`],
  ```

  ```ts
  invalidate(`user:${id}`); // one user
  invalidate('user'); // every user
  ```

  Avoid a bare id as a tag (`['user', userId]`): it matches anything else tagged with the same id.

- Tags are indexed per registry, so a `RegistryProvider` subtree only invalidates its own instances. Without a registry argument, `invalidate` targets the global one.

## Global handlers

Keep framework code out of containers by configuring the package once at startup:

```ts
import { configureAsync } from '@blac/async';

configureAsync({
  onError: (error, { kind, key }) => reportError(error),
  onSuccess: (message) => toast.success(message),
});
```

A per-call `onError` that returns `false` suppresses the global one — for example to ignore a 404. There is no retry option: refreshing a token and retrying belongs in the fetch layer, which every request goes through.

## Testing

State is plain, so seed it with the constructors `idle()`, `loading()`, `success(data)` and `failure(error)`:

```ts
const cubit = withBlocState(ProfileCubit, { profile: success(profile) });
```

Use `resetAsyncConfig()` in `afterEach` when a test calls `configureAsync`.

## See also

- [Async](/guide/async/) — the hand-written loading flow this package replaces
- [Proposals](/proposals/) — planned changes to this package (ordering, state-derived input, realtime refetch, lifecycle hooks, `ask()`), previewed for review before they are built
- [Testing](/testing/overview/) — `withBlocState` and `blacTestSetup`
