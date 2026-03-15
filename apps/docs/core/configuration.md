# Configuration

Configure state container behavior with the `@blac` decorator (or function call).

`BlacOptions` is a **union type** — you can only specify one option at a time.

## Options

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
class AuthCubit extends Cubit<AuthState> {
  constructor() {
    super({ user: null });
  }
}

blac({ keepAlive: true })(AuthCubit);
```

This is functionally identical to the decorator form.

See also: [Instance Management](/core/instance-management)
