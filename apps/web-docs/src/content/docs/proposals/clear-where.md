---
title: 'Proposal: Reset by Predicate'
description: Adoption preview of clearWhere(), which replaces app-wide reset events and id-string matching when a session or workspace ends.
---

:::note[Built — adoption preview]
`clearWhere` is implemented in `@blac/core` and documented in [Instance Management](/core/instance-management/). This page shows what adopting it replaces. The "before" code is a typical shape, not a copy of a real app.
:::

## Problem

When a user signs out, or switches workspace, many containers across many classes must be disposed. Without a registry-level primitive, apps build a reset bus:

- A global event, for example `session-reset`, that every container listens for.
- Each container decides whether the event applies to it, often by matching a substring of its instance id.
- A scoped variant (one workspace, one member) that needs yet another id format and yet another matcher.

The matching logic is stringly-typed, easy to get wrong, and lives in every container.

## API

```ts
import { clearWhere } from '@blac/core';

clearWhere((bloc) => bloc.args?.workspaceId === 'ws-1'); // one workspace
clearWhere(() => true); // everything, registered types are kept
```

The predicate receives each live instance with its `args`, across all classes. Matching instances are disposed, including `keepAlive` ones and ones that still have owners, the same as `clear(Class)` and `clearAll()`. Matches are collected before any is disposed, so disposal during iteration is safe.

## Before and after

```ts title="Before — a reset bus"
// the bus
export const SESSION_RESET_EVENT = 'session-reset';
eventBus.dispatch(new AppEvent(SESSION_RESET_EVENT, { workspaceId, userId }));

// in every container that holds user data
_onEvent(event: AppEvent) {
  if (event.type !== SESSION_RESET_EVENT) return;
  const { workspaceId, userId } = event.detail ?? {};
  const id = String(this._id ?? '');
  if (!event.detail || id.includes(`${workspaceId}:${userId}`)) this.resetData();
}
```

```ts title="After — one call at the boundary"
clearWhere(
  (bloc) =>
    bloc.args?.workspaceId === workspaceId && bloc.args?.userId === userId,
);

// sign out
clearWhere(() => true);
```

What goes away: the event constant and dispatch helper, the per-container `_onEvent` branch, and the id-format convention that only existed so the matcher had something to search. Containers need no reset code of their own.

## Differences to review

- **Reset in place vs dispose.** The bus called `resetData()` on a live instance. `clearWhere` disposes it. Check what your components do when their instance is disposed under them; code holding a direct reference keeps the disposed instance.
- **Args must carry the scope.** The predicate can only match what is in `args`. A container keyed by a bare id with no `workspaceId` in its args cannot be selected by workspace.

## Open questions

- The reference docs caution that `clear*` helpers are teardown tools for tests, not feature code. A session boundary is a legitimate app use. Should that page say so explicitly?
- Is a typed predicate helper worth adding, for example `clearWhere(ChannelCubit, (b) => ...)`, to avoid optional chaining on `args`?
