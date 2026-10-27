---
title: 'Proposal: Async Refinements'
description: Small fixes and additions to the shipped @blac/async before its first release — tag convention, settled mutation results, local writes, enabled gating, and two bug fixes.
---

:::caution[Proposal — not built]
Nothing on this page exists in `@blac/async` yet, apart from the shipped behavior it describes. The API, names and behavior are up for review, and the code samples are illustrative (not compiled). See the [proposals index](/proposals/) for the other pages.
:::

## Why now

`@blac/async` has not been published. Changing the shape of a result or removing an option is free today and a breaking change after the first release. These items came from reading the shipped code against a large production codebase that the package is meant to replace hand-written loading code in.

| #                                       | Change                                        | Kind           | Effort |
| --------------------------------------- | --------------------------------------------- | -------------- | ------ |
| [1](#1-tag-convention)                  | Tag both levels: `['user', 'user:42']`        | Docs only      | ~0.5h  |
| [2](#2-mutations-resolve-their-result)  | A mutation resolves its settled `AsyncState`  | Breaking       | ~1h    |
| [3](#3-restore-the-exact-settled-state) | Deactivation restores the exact settled state | Bug fix        | 0.5h   |
| [4](#4-remove-retryon)                  | Remove `retryOn`                              | Breaking       | 0.5h   |
| [5](#5-resourceset)                     | `resource.set(updater)` for local writes      | New API        | ~1h    |
| [6](#6-enabled)                         | `enabled` gating                              | New API        | ~1h    |
| [7](#7-later-optimistic-updates)        | Optimistic updates                            | New API, later | ~0.5d  |

Larger refinements have their own pages: [mutation concurrency](/proposals/mutation-concurrency/) (ordering, `exclusive`, keyed mutations) and [resource input](/proposals/resource-input/) (reload when state changes).

## 1. Tag convention

Tags are flat strings, and `invalidate` matches any of them. The current guide tags a resource with `['user', userId]`:

```ts
tags: ({ userId }) => ['user', userId],
invalidates: (_name, _data, { userId }) => ['user', userId],
```

That indexes two unrelated tags. The mutation reloads **every** resource tagged `'user'`, plus anything else tagged with the bare id, and an id can collide with another entity's id.

**Proposal:** no code change. Document a two-level convention, where each resource declares its kind and its instance:

```ts
tags: (({ userId }) => ['user', `user:${userId}`], invalidate(`user:${id}`)); // one user
invalidate('user'); // every user
```

Both shapes occur in practice. Most cross-container reloads target one entity by id, and a few target a whole kind (for example after an import, or on a workspace switch).

Considered and deferred: tuple keys with prefix matching (`['user', id]` invalidates `['user', id, 'posts']`), or typed tag builders. Revisit them if the pilot shows typos or the two levels drifting apart.

## 2. Mutations resolve their result

A mutation resolves its data on success and `undefined` on failure. For a `void` API, which is most updates, both outcomes look the same:

```ts title="Today"
save = mutation(this, 'save', (input: Settings) => api.save(input)); // Promise<void>

if (!(await this.save(input))) return; // always returns, even on success
```

**Proposal:** resolve the settled `AsyncState`, the same type the slot holds:

```ts title="Proposed"
const result = await this.save(input);
if (result.status !== 'success') return;
analytics.track('settings saved');
```

Nothing new to learn, `result.data` is typed, and `result.error` is available without reading the slot. Failures still land in the slot and the global `onError`; they still do not throw.

## 3. Restore the exact settled state

When the last owner releases while a load is in flight, the slot must not stay in `loading`. Today it is restored to `idle`, or to `success` if it holds data:

```ts
set(data === undefined ? { status: 'idle' } : { status: 'success', data });
```

A slot that held `error` plus old data before the reload is therefore restored to `success`, and the error is lost. **Proposal:** remember the last settled state and restore exactly that.

## 4. Remove `retryOn`

`configureAsync({ retryOn })` retries a failed call once. Its intended use is "refresh the token on a `401`, then retry". Fetch layers commonly do that already, with a single-flight refresh, because every request needs it, not only those made through `@blac/async`. The production codebase behind these proposals does exactly that, so `retryOn` has no caller. It also has a bug: it runs for calls that were aborted because a newer call superseded them.

**Proposal:** remove it before publishing. If a use appears, add it back with an abort check. Generic retry with backoff is not proposed either; it had three call sites. See [retry after token refresh](/proposals/retry-failed/) for the remaining refresh case.

## 5. `resource.set`

There is no way to write a resource's data locally. Containers need it for:

- patching an item in place from a pushed socket message,
- replacing one row in a list after a save (in one codebase, about 9 copies of `items.map((i) => (i.id === id ? updated : i))`),
- optimistic updates.

**Proposal:** `set(updater)` writes `success` with the new data and leaves freshness alone.

```ts
class ProjectsCubit extends Cubit<{
  projects: AsyncState<Project[]>;
  rename: AsyncState<Project>;
}> {
  constructor() {
    super({ projects: idle(), rename: idle() });
  }

  projects = resource(this, 'projects', (signal) => api.listProjects(signal), {
    auto: true,
  });

  rename = mutation(
    this,
    'rename',
    ({ id, name }: { id: string; name: string }) => api.renameProject(id, name),
  );

  renameProject = async (id: string, name: string) => {
    const result = await this.rename({ id, name });
    if (result.status !== 'success') return;
    this.projects.set((list = []) =>
      list.map((p) => (p.id === id ? result.data : p)),
    );
  };
}
```

`set` does not abort a load in flight. Open question: should it? A load that started before the write may return older data.

## 6. `enabled`

Loaders often start with a feature flag or capability check:

```ts title="Before"
loadSuggestions = async () => {
  if (!getBloc(FeatureFlags).isEnabled('suggestions')) return;
  // ...
};
```

**Proposal:** `enabled: (state, args) => boolean`. A disabled resource stays `idle`, does not load on activation and ignores `load()` and `invalidate`. Combined with [resource input](/proposals/resource-input/), a flag turning on loads it.

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

Conditional polling ("only while the socket is down") is not `enabled`: that would switch the whole resource off. It is `refetchInterval` in [realtime refetch](/proposals/realtime-refetch/).

## 7. Later: optimistic updates

Rare, but easy to get wrong. A hand-written version in production keeps a write version per key, so that a failed older write never reverts a newer one, and a slow read never overwrites a fresh write.

**Proposal, after 2 and 5:** `mutation(..., { optimistic: { target: this.prefs, apply } })`. `apply` writes through `set` before the call, and the library rolls back on failure only if no newer write landed. The library should own the versioning, since that is the part apps get wrong.

## Not proposed

- **Per-resource `onSuccess`.** `watch` on the slot already covers it.
- **Retry with backoff.** See 4.

## Open questions

- **1:** are flat tags plus a two-level convention enough, or are tuple keys needed? Decide after the pilot.
- **4:** remove `retryOn`, or keep it with the abort check?
- **5:** should `set` abort a load in flight?
