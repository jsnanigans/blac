---
title: 'Proposal: Isolated Instances'
description: 'Adoption preview of @blac({ isolated: true }), which replaces per-mount useId and static key boilerplate.'
---

:::note[Built — adoption preview]
`isolated` is implemented in `@blac/core` and `@blac/react`, and documented in [`useBloc()`](/react/use-bloc/). This page shows what adopting it replaces. The "before" code is a typical shape, not a copy of a real app.
:::

## Problem

Containers are shared by key. When each mount needs its own private instance (a form, a wizard step, a widget), the key must be unique per mount. Without a flag, every such class repeats the same two pieces:

- A component-side `useId()` passed into `args`.
- A `static key` on the class that reads that id.

Dozens of classes carry the same boilerplate, and forgetting the `static key` silently shares one instance across mounts.

## API

```tsx
@blac({ isolated: true })
class FormCubit extends Cubit<FormState, FormArgs> {}

const [state, cubit] = useBloc(FormCubit, { args: options });
```

- The decorator stores the flag; `useBloc` folds a `useId()` into the instance key.
- Each mount gets its own instance, disposed on unmount.
- `args` still seed `init(args)`. They no longer need an id field.

## Before and after

```tsx title="Before — id in args plus a static key"
interface FormArgs {
  _id: string; // only here to make the key unique
  options: FormOptions;
}

class FormCubit extends Cubit<FormState, FormArgs> {
  static key = (args: FormArgs) => args._id;
}

function Form({ options }: { options: FormOptions }) {
  const id = useId();
  const [state, cubit] = useBloc(FormCubit, { args: { _id: id, options } });
  // ...
}
```

```tsx title="After"
interface FormArgs {
  options: FormOptions;
}

@blac({ isolated: true })
class FormCubit extends Cubit<FormState, FormArgs> {}

function Form({ options }: { options: FormOptions }) {
  const [state, cubit] = useBloc(FormCubit, { args: { options } });
  // ...
}
```

What goes away: the `_id` field in `Args`, the `static key`, and the `useId` call in every consumer.

## Differences to review

- **Reverses a documented stance.** The docs used to say per-mount instances must be explicit. Pages that mention it were updated; a reviewer should still read [Passing Inputs](/guide/inputs/) and the troubleshooting table end to end.
- **No sharing by accident.** An isolated class cannot be shared between two components that want the same instance. Use args-derived keys for shared state and `isolated` only for private state.
- **Server rendering.** Instance keys include `useId()`, which is stable across hydration in React 18+; confirm with the [SSR guide](/integrations/ssr/) before relying on it for server-rendered trees.
