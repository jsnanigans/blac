# Configuration

Configure state containers with the `@blac()` decorator.

## Decorator Options

```typescript
import { blac, Cubit } from '@blac/core';

@blac({ isolated: true })
class MyBloc extends Cubit<State> {}
```

**Important**: `BlacOptions` is a union type. You can only specify ONE option:

```typescript
// ✅ Valid - one option
@blac({ isolated: true })
@blac({ keepAlive: true })
@blac({ excludeFromDevTools: true })

// ❌ Invalid - cannot combine
@blac({ isolated: true, keepAlive: true }) // TypeScript error
```

## Options

### `isolated: true`

Each component gets its own instance. Instance is disposed when component unmounts.

```typescript
@blac({ isolated: true })
class FormCubit extends Cubit<FormState> {
  constructor() {
    super({ value: '', error: '' });
  }
}

// ComponentA and ComponentB have SEPARATE instances
function ComponentA() {
  const [state] = useBloc(FormCubit);
  return <input value={state.value} />;
}

function ComponentB() {
  const [state] = useBloc(FormCubit);
  return <input value={state.value} />; // Different state
}
```

**Use for:**
- Form state
- Modal/dialog state
- Component-specific UI state
- Any state that shouldn't be shared

### `keepAlive: true`

Instance persists even when no components are using it. Never auto-disposed.

```typescript
@blac({ keepAlive: true })
class AuthCubit extends Cubit<AuthState> {
  constructor() {
    super({ user: null, token: null });
  }
}

// Instance persists after component unmounts
function Login() {
  const [auth] = useBloc(AuthCubit);
  // When this unmounts, AuthCubit stays alive
}
```

**Use for:**
- Global singletons (auth, theme, settings)
- Shared services (analytics, logging)
- State that must persist across navigation

### `excludeFromDevTools: true`

Hide from DevTools panels. Prevents infinite loops when DevTools UI uses BlaC internally.

```typescript
@blac({ excludeFromDevTools: true })
class DevToolsStateCubit extends Cubit<DevToolsState> {
  // Won't appear in DevTools
}
```

**Use for:**
- Internal DevTools state
- Meta-level application state
- Debug utilities

## Function Syntax

For projects without decorator support:

```typescript
const FormCubit = blac({ isolated: true })(
  class extends Cubit<FormState> {
    constructor() {
      super({ value: '' });
    }
  }
);

const AuthCubit = blac({ keepAlive: true })(
  class extends Cubit<AuthState> {
    constructor() {
      super({ user: null });
    }
  }
);
```

## Default Behavior

Without `@blac()`:

- **Shared** - All components using the same class share one instance
- **Ref counted** - Disposed when last component unmounts
- **Visible in DevTools**

```typescript
// Default: shared, ref-counted, visible in devtools
class CounterCubit extends Cubit<{ count: number }> {
  constructor() {
    super({ count: 0 });
  }
}
```

## Choosing the Right Option

| Scenario | Option |
|----------|--------|
| Form in a modal | `isolated: true` |
| User authentication | `keepAlive: true` |
| Shopping cart | `keepAlive: true` |
| Search input in header | `isolated: true` |
| Theme settings | `keepAlive: true` |
| DevTools internal state | `excludeFromDevTools: true` |
| List item state | `isolated: true` |
| Global notifications | `keepAlive: true` |

## See Also

- [Instance Management](/core/instance-management) - Static methods for accessing instances
- [Shared vs Isolated](/react/shared-vs-isolated) - React patterns
