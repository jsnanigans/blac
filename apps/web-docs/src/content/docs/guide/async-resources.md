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
- `resource` returns `{ load, reload }`. `load()` reuses a call in flight and skips while data is fresh (`staleTime`, default `0`); `reload()` always starts a new call.
- `fn` receives the container's `args` as its second parameter. It runs after the container is configured, so `args` is always set.
- A call cut short by deactivation does not leave the slot in `loading`; it goes back to the last settled state.

| Option      | Meaning                                                                 |
| ----------- | ----------------------------------------------------------------------- |
| `auto`      | Load on activation.                                                     |
| `staleTime` | Milliseconds a success stays fresh for `load()`.                        |
| `tags`      | `(args) => string[]` targets for `invalidate`; evaluated on activation. |
| `onError`   | Runs before the global handler; return `false` to suppress it.          |

## Mutation

`mutation(this, key, fn, options)` returns an async function that writes `loading`, `success` or `error` to its own slot. It resolves to the data, or `undefined` on failure — failures land in the slot and the global `onError`, they do not throw.

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

## Invalidation

`invalidate(tags, registry?)` reloads every resource that declared one of the tags. Mutations call it for you through `invalidates`.

- A resource that is active, or already loaded, reloads immediately.
- One that is not active (for example a `keepAlive` instance with no owners) is marked stale and loads on its next activation.
- Tags are flat strings, and a resource matches if it declared any of the tags passed. Declare both a kind and an instance tag, so callers can target either:

  ```ts
  tags: (({ userId }) => ['user', `user:${userId}`], invalidate(`user:${id}`)); // one user
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
  retryOn: async (error) => await refreshTokenIfExpired(error),
});
```

`retryOn` retries a failed call once when it returns `true`. A per-call `onError` that returns `false` suppresses the global one — for example to ignore a 404.

## Testing

State is plain, so seed it with the constructors `idle()`, `loading()`, `success(data)` and `failure(error)`:

```ts
const cubit = withBlocState(ProfileCubit, { profile: success(profile) });
```

Use `resetAsyncConfig()` in `afterEach` when a test calls `configureAsync`.

## See also

- [Async](/guide/async/) — the hand-written loading flow this package replaces
- [Proposals](/proposals/) — planned changes to this package (settled mutation results, ordering, state-derived input, realtime refetch, lifecycle hooks, `ask()`), previewed for review before they are built
- [Testing](/testing/overview/) — `withBlocState` and `blacTestSetup`
