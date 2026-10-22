---
title: 'Proposal: Borrow by Key'
description: Preview of borrow(Class, { key }), an optional shortcut for call sites that know an instance key but not its full args.
---

:::caution[Proposal — not built, and not recommended yet]
Nothing on this page exists in `@blac/core`. It is optional and should wait for a concrete need. See the [proposals index](/proposals/) for the other pages.
:::

## Problem

`borrow` and `borrowSafe` take `{ args }`, the same shape `useBloc` takes, and resolve the instance key through the class's `static key(args)`. That keeps call sites consistent with `useBloc`, but it means a caller must supply every arg that feeds the key, even when it already holds the key itself:

```ts
// the key only reads `channelId`, but the call site must build all of args
borrow(ChannelCubit, { args: { channelId, workspaceId, mode: 'read' } });
```

This only hurts when `static key` reads a subset of `args` and the caller has just that subset, for example a list row that knows `channelId` but not the workspace-wide options.

## Proposed API

```ts
borrow(ChannelCubit, { key: channelId });
borrowSafe(ChannelCubit, { key: channelId });
```

`BorrowTarget` becomes `{ args? } | { key? }`. `key` is the string the class's `static key(args)` would return, so the two forms resolve to the same instance.

## Before and after

```ts title="Before"
const channel = borrow(ChannelCubit, {
  args: { channelId: row.channelId, workspaceId: ws.id, mode: 'read' },
});
```

```ts title="After"
const channel = borrow(ChannelCubit, { key: row.channelId });
```

## Why not yet

- **Leaks the key format.** Callers now depend on what `static key` returns. Today only the class does.
- **Silent mismatch.** A wrong key string borrows a different, possibly nonexistent, instance. `args` is type-checked against the class; `key` is a bare string.
- **No known need.** The plan treats this as optional: skip unless a call site shows up that cannot reasonably build its args.

## Alternatives

| Option                              | Notes                                                                                  |
| ----------------------------------- | -------------------------------------------------------------------------------------- |
| Do nothing                          | Keep `{ args }`. Call sites stay consistent with `useBloc`.                            |
| Export a typed key helper per class | `ChannelCubit.keyFor(channelId)`: type-checked, but needs a convention on every class. |
| `{ key }` as proposed               | Smallest API, weakest typing.                                                          |

Effort if built: about 1 hour of code and tests, plus a docs paragraph.

## Open questions

- Is there a real call site that cannot build its args? If not, close this proposal.
- Should `key` be typed as a branded string produced by the class, so a raw string cannot be passed?
