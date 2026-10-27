---
title: 'Proposal: Typed clearWhere'
description: Preview of a class-scoped clearWhere(Class, predicate) overload in @blac/core, so session-boundary resets get typed args instead of optional chaining.
---

:::caution[Proposal — not built]
Nothing on this page exists in `@blac/core` yet. `clearWhere(predicate)` itself is built and documented in [Instance Management](/core/instance-management/#cleanup). See the [proposals index](/proposals/) for the other pages.
:::

## Problem

`clearWhere(predicate)` visits every live instance of every class, so the predicate receives an untyped container. Most predicates written while migrating reset events are scoped to one class, and they all repeat the same shape:

```ts
clearWhere(
  (bloc) => bloc instanceof ChannelCubit && bloc.args?.workspaceId === id,
);
```

The `instanceof` check is easy to forget, which widens the reset to every class with a matching `workspaceId`. The optional chaining hides typos in arg names.

## Proposed API

```ts
clearWhere(ChannelCubit, (bloc) => bloc.args.workspaceId === id);
```

- Only instances of `ChannelCubit` are visited.
- `bloc` is typed as `ChannelCubit`, so `args` is checked against the class.
- Everything else matches the existing form: matches are collected before any is disposed, and `keepAlive` instances and ones with owners are disposed too.

## Library change

- `clearWhere` gains an overload whose class form only passes instances of that class to the predicate. About 10 lines.
- Tests: only the given class is visited, other classes with matching args are untouched.
- Docs: one example in [Instance Management](/core/instance-management/#cleanup).

Effort: about 1 hour.

## Open questions

- Should the class form also accept an array of classes, for a reset that spans a few related containers?
