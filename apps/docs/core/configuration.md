# Configuration

Configure state container behavior with the `@blac` decorator (or function call).

```ts
import { Cubit, blac } from '@blac/core';

@blac({ isolated: true })
class FormCubit extends Cubit<FormState> { ... }
```

`BlacOptions` is a **union type** — you can only specify one option at a time.

## Options

### `{ isolated: true }`

Creates a new instance for each `useBloc` call. The instance is disposed when the component unmounts.

```ts
@blac({ isolated: true })
class FormCubit extends Cubit<FormState> { ... }
```

**When to use:** Per-component state like forms, modals, or editors where each component needs its own independent state.

::: warning
Isolated means per-`useBloc`-call, not per-component-subtree. If three children each call `useBloc(FormCubit)`, they get three separate instances. To share a single instance among siblings, use `instanceId` instead.
:::

### `{ keepAlive: true }`

Prevents the instance from being disposed when its ref count reaches zero. The instance persists for the lifetime of the app.

```ts
@blac({ keepAlive: true })
class AuthCubit extends Cubit<AuthState> { ... }
```

**When to use:** Global state that should survive route changes, like authentication, user preferences, or app-wide settings.

### `{ excludeFromDevTools: true }`

Hides the instance from DevTools inspection.

```ts
@blac({ excludeFromDevTools: true })
class InternalTimerCubit extends Cubit<TimerState> { ... }
```

**When to use:** High-frequency internal state containers that would clutter DevTools output.

## Without decorators

If you're not using TypeScript decorators, call `blac` as a regular function:

```ts
class FormCubit extends Cubit<FormState> {
  constructor() {
    super({ name: '', email: '' });
  }
}

blac({ isolated: true })(FormCubit);
```

This is functionally identical to the decorator form.

See also: [Shared vs Isolated](/react/shared-vs-isolated), [Instance Management](/core/instance-management)
