# The Shared XOR Props Principle

## Overview

The BlaC library enforces a fundamental architectural principle: **state containers must be either shared OR accept props, never both**. This principle eliminates an entire class of race conditions and makes state management patterns explicit and predictable.

## The Problem

When a state management library allows both shared instances and configuration props, it creates an unresolvable contradiction:

```typescript
// Component A
const [state] = useBloc(CounterCubit, { props: { initial: 5 } });

// Component B
const [state] = useBloc(CounterCubit, { props: { initial: 10 } });
```

Which props should win? The answer depends on component render order, creating:
- Non-deterministic behavior
- Race conditions
- Debugging nightmares
- Violated developer expectations

## The Solution: Two Distinct Patterns

### Pattern 1: Shared State (Global Singletons)

Shared state containers:
- **Cannot accept props**
- **Cannot use custom IDs**
- **Always return the same instance**
- **Are configured through methods, not constructor props**

```typescript
class AuthBloc extends SharedBloc<AuthState> {
  constructor() {
    super({ isAuthenticated: false, user: null });
  }
  
  login = async (credentials: Credentials) => {
    // Handle login
  };
}

// Usage - always returns the same instance
const [authState, authBloc] = useBloc(AuthBloc);
```

**Use cases:**
- Authentication state
- Theme/appearance settings
- User preferences
- Shopping cart
- Application-wide notifications

### Pattern 2: Isolated State (Component-Specific)

Isolated state containers:
- **Must accept props**
- **Always create new instances**
- **Never share instances between components**
- **Are configured through constructor props**

```typescript
class FormBloc extends IsolatedBloc<FormState, FormProps> {
  constructor(props: FormProps) {
    super(props, {
      values: {},
      errors: {},
      fields: props.fields
    });
  }
  
  validate = () => {
    // Validation logic using this.props
  };
}

// Usage - always creates a new instance
const [formState, formBloc] = useBloc(FormBloc, { 
  props: { 
    fields: ['email', 'password'],
    validationRules: { email: 'required|email' }
  } 
});
```

**Use cases:**
- Form management
- Modal/dialog state
- List item state
- Component-specific UI state
- Wizard/stepper state

## Type System Enforcement

The library enforces this principle at the TypeScript level:

```typescript
// SharedBloc cannot be instantiated with props
class MySharedBloc extends SharedBloc<State> { }
useBloc(MySharedBloc); // ✅ Valid
useBloc(MySharedBloc, { props: {} }); // ❌ Type error

// IsolatedBloc requires props
class MyIsolatedBloc extends IsolatedBloc<State, Props> { }
useBloc(MyIsolatedBloc); // ❌ Type error
useBloc(MyIsolatedBloc, { props: {} }); // ✅ Valid
```

## Benefits

### 1. **Eliminates Race Conditions**
No more wondering which component's props will "win" - shared blocs have no props, isolated blocs create separate instances.

### 2. **Clear Mental Model**
Developers immediately know whether state is global or local based on the base class used.

### 3. **Better Error Messages**
Type errors occur at compile time, not runtime surprises.

### 4. **Simplified Implementation**
No complex instance lookup logic or prop comparison needed.

### 5. **Predictable Behavior**
State behavior is determined by its type, not by runtime conditions.

## Migration Guide

If you have existing code using props with shared instances:

### Before (Problematic):
```typescript
class CounterCubit extends Cubit<CounterState> {
  constructor(props?: { initial?: number }) {
    super({ count: props?.initial ?? 0 });
  }
}

// Shared usage with props - PROBLEMATIC
const [state] = useBloc(CounterCubit, { props: { initial: 5 } });
```

### After (Clear Separation):

**Option 1 - Make it truly shared:**
```typescript
class GlobalCounterCubit extends SharedBloc<CounterState> {
  constructor() {
    super({ count: 0 });
  }
  
  setCount = (count: number) => {
    this.emit({ count });
  };
}

// Usage
const [state, cubit] = useBloc(GlobalCounterCubit);
// Configure through methods if needed
cubit.setCount(5);
```

**Option 2 - Make it truly isolated:**
```typescript
class LocalCounterCubit extends IsolatedBloc<CounterState, { initial: number }> {
  constructor(props: { initial: number }) {
    super(props, { count: props.initial });
  }
}

// Usage - each component gets its own instance
const [state] = useBloc(LocalCounterCubit, { props: { initial: 5 } });
```

## Decision Tree

When designing a new Bloc/Cubit, ask:

1. **Should different components share the same state?**
   - Yes → Use `SharedBloc/SharedCubit`
   - No → Continue to question 2

2. **Does the state need configuration?**
   - Yes → Use `IsolatedBloc/IsolatedCubit` with props
   - No → Use `SharedBloc/SharedCubit` without props

3. **Could the configuration change between uses?**
   - Yes → Definitely use `IsolatedBloc/IsolatedCubit`
   - No → Consider if it should really be shared

## Common Patterns

### Shared State with Configuration Methods
```typescript
class ThemeBloc extends SharedBloc<ThemeState> {
  constructor() {
    super({ 
      mode: 'light',
      primaryColor: '#1976d2'
    });
  }
  
  configure = (config: ThemeConfig) => {
    this.emit({ ...this.state, ...config });
  };
}
```

### Isolated State with Derived Configuration
```typescript
class PaginationBloc extends IsolatedBloc<PaginationState, { pageSize: number }> {
  constructor(props: { pageSize: number }) {
    super(props, {
      currentPage: 1,
      totalPages: 0,
      items: [],
      pageSize: props.pageSize
    });
  }
}
```

## Conclusion

The "Shared XOR Props" principle isn't a limitation - it's a feature that makes your state management more predictable, type-safe, and easier to reason about. By choosing explicitly between shared and isolated patterns, you eliminate entire categories of bugs and create clearer, more maintainable code.