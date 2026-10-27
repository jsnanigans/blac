---
title: 'Proposal: Lifecycle Hooks'
description: Preview of onStart and onSettled hooks in configureAsync, so one adapter per app handles breadcrumbs, duration metrics and analytics for every resource and mutation.
---

:::caution[Proposal — not built]
Nothing on this page exists in `@blac/async` yet. The API, names and behavior are up for review, and the code samples are illustrative (not compiled). See the [proposals index](/proposals/) for the other pages.
:::

## Problem

`configureAsync` has two global hooks today: `onError` (reporting) and `onSuccess` (a success message). Nothing observes a call starting or settling, so instrumentation is written by hand around every call. In one production codebase:

- **Breadcrumbs.** 86 copy-pasted analytics blocks across 81 files: one when an action opens, one when it closes, one on success, in each action handler and in a shared confirm helper.
- **Error reports.** About 640 manual `reportError` calls.
- **Duration metrics.** A base container class times every loading key and sends a duration metric. Moving a container off that class loses the metric, unless the library offers a hook.

The blocks differ only in a label and a payload, and they drift: some actions record the close but not the success, some record neither.

## Proposed API

```ts
configureAsync({
  onStart?: (ctx: AsyncHookContext) => void,
  onSettled?: (ctx: AsyncHookContext & { duration: number; status: 'success' | 'error' }) => void,
});

interface AsyncHookContext {
  kind: 'resource' | 'mutation';
  key: string;   // the state slot
  host: string;  // host class name
  args: unknown; // the host's args
  meta?: unknown;
}
```

Plus an optional per-call `meta`, handed to both hooks:

```ts
mutation(this, 'save', fn, { meta: { track: 'Update project' } });
resource(this, 'items', fn, { meta: { track: 'Load items' } });
```

- `onStart` runs when a call starts, before the slot becomes `loading`.
- `onSettled` runs once per call, after the slot is written. `duration` is milliseconds from start to settle.
- `meta` is opaque to the library. Its type is `unknown`; an app narrows it in its adapter.
- The hooks only observe. A hook that throws is caught and reported to `onError`, and never changes the call's result.
- `onError` (reporting, with the per-call opt-out) and `onSuccess` (the success message) are unchanged.

## Use

One adapter per app replaces every hand-written block:

```ts
configureAsync({
  onStart: ({ host, key, meta }) => {
    analytics.track('Async Started', { host, key, ...(meta as Meta) });
  },
  onSettled: ({ host, key, meta, duration, status }) => {
    metrics.distribution('async.duration', duration, {
      unit: 'millisecond',
      attributes: { host, key, status },
    });
    if ((meta as Meta)?.track) {
      analytics.track('Async Settled', { label: (meta as Meta).track, status });
    }
  },
  onError: (error, { host, key }) => reportError(error, { host, key }),
  onSuccess: (message) => toast.success(message),
});
```

## Before and after

### Action: a dialog with breadcrumbs

Adapted from a production container and simplified.

```ts title="Before"
export const openUpdateStatusDialog = (
  userId: string,
  projectId: string,
  onSuccessfulUpdate?: () => void,
): Promise<void> =>
  new Promise<void>((resolve) => {
    const { removeDialog, openDialog } = new Dialog({
      name: 'Update Project Status',
    });

    analytics.track('Breadcrumb', {
      category: 'tracker',
      message: 'Opening UpdateProjectStatus dialog',
      level: 'info',
      data: JSON.stringify({ userId, projectId }),
    });

    const destroyDialog = () => {
      removeDialog();
      resolve();
    };

    const onFinish = () => {
      onSuccessfulUpdate?.();
      destroyDialog();
    };

    openDialog(
      <UpdateStatusDialog
        userId={userId}
        projectId={projectId}
        onFinish={onFinish}
        cancelAction={destroyDialog}
      />,
    );
  });
```

The same block, with different strings, appears in dozens of handlers. Each one also needs matching "closed" and "succeeded" blocks to be complete.

```ts title="After"
updateStatus = mutation(
  this,
  'updateStatus',
  (input: StatusInput) => api.updateProjectStatus(input),
  { success: 'Status updated', meta: { track: 'Update project status' } },
);
```

The dialog open and close are UI events and stay in the UI. What moves into the adapter is the part tied to the async call: started, succeeded or failed, and how long it took. Every mutation with a `track` label now reports all three, with no per-handler code.

### Base class: duration metrics

```ts title="Before — in a base container class"
protected startLoading(key: string) {
  this.loadingStartTimes.set(key, Date.now());
  // ...set loading flags
}

protected stopLoading(key: string) {
  const start = this.loadingStartTimes.get(key);
  if (start) {
    metrics.distribution('cubit.loading.duration', Date.now() - start, {
      unit: 'millisecond',
      attributes: { cubit: this.constructor.name, key },
    });
    this.loadingStartTimes.delete(key);
  }
  // ...clear loading flags
}
```

```ts title="After — the onSettled adapter above"
// no per-container code
```

What goes away: the start-time map and the `startLoading` / `stopLoading` pairing. The metric keeps its shape (duration, host, key) and gains `status`.

Behavior differences to review:

- The metric covers `resource` and `mutation` calls only. Loading flags managed by hand never reach the hooks.
- The base class measures from `startLoading` to `stopLoading`. The hooks measure the call itself, which excludes any work the container does before or after it.

## Library change

- `config.ts`: add `onStart`, `onSettled` and `AsyncHookContext` to `AsyncConfig`; a small `notify` helper that catches hook errors.
- `resource.ts`, `mutation.ts`: record `performance.now()` at call start, call `onStart`, call `onSettled` in the success and error paths; thread `meta` from the options.
- Tests: hook order, `duration` and `status` on success and failure, `meta` passthrough, a throwing hook not changing the result, hooks not firing for aborted `resource` loads.
- Docs: one section in `guide/async-resources.md`.

Effort: about 2 hours. High payoff, small surface.

## Open questions

- **Superseded and aborted calls.** A `resource` load that is aborted by a newer one does not write the slot. Should `onSettled` skip it, or report `status: 'aborted'`? Skipping keeps `status` to two values; reporting makes cancelled work visible.
- **What "settled" means.** [Mutation concurrency](/proposals/mutation-concurrency/) lets an older call finish without writing the slot. Should it still fire `onSettled`? Probably yes, since the request happened.
- **`meta` typing.** `unknown` with a cast in the adapter, or module augmentation of one app-wide `AsyncMeta` interface?
- **Cached resource hits.** A `staleTime` hit starts no request. Proposed: it fires no hooks. Is a "cache hit" event useful for metrics?
