# Props API Reference

## Overview

This document provides a complete API reference for the props feature in BlaC. Props enable passing data from React components to Blocs and Cubits, supporting both initial configuration and reactive updates.

## Core Types

### PropsUpdated Event

```typescript
export class PropsUpdated<P = any> {
  constructor(public readonly props: P) {}
}
```

Generic event class for notifying Blocs about prop updates.

### BlocBase Props

```typescript
abstract class BlocBase<S, P = unknown> {
  public props: P | null = null;
}
```

Base class property that stores the current props value.

### Cubit Props Methods

```typescript
abstract class Cubit<S, P = null> extends BlocBase<S, P> {
  /**
   * @internal
   * Updates props and triggers onPropsChanged lifecycle
   */
  protected _updateProps(props: P): void {
    const oldProps = this.props;
    this.props = props;
    this.onPropsChanged?.(oldProps as P | undefined, props);
  }
  
  /**
   * Optional lifecycle method called when props change
   * @param oldProps Previous props value (undefined on first update)
   * @param newProps New props value
   */
  protected onPropsChanged?(oldProps: P | undefined, newProps: P): void;
}
```

## React Hook API

### useBloc

```typescript
function useBloc<B extends BlocConstructor<BlocBase<any>>>(
  blocConstructor: B,
  options?: {
    props?: ConstructorParameters<B>[0];
    id?: string;
    dependencies?: (bloc: InstanceType<B>) => unknown[];
    onMount?: (bloc: InstanceType<B>) => void;
    onUnmount?: (bloc: InstanceType<B>) => void;
  }
): [BlocState<InstanceType<B>>, InstanceType<B>]
```

#### Parameters

- `blocConstructor`: The Bloc or Cubit class to instantiate
- `options`: Optional configuration object
  - `props`: Props to pass to the Bloc/Cubit (used for both constructor and reactive updates)
  - `id`: Custom instance identifier (defaults to class name)
  - `dependencies`: Function returning array of values that trigger re-renders when changed
  - `onMount`: Callback when the Bloc is mounted
  - `onUnmount`: Callback when the Bloc is unmounted

#### Returns

Tuple containing:
1. Current state of the Bloc/Cubit
2. Bloc/Cubit instance

## BlacAdapter API

### AdapterOptions

```typescript
interface AdapterOptions<B extends BlocBase<any>> {
  id?: string;
  dependencies?: (bloc: B) => unknown[];
  props?: any;
  onMount?: (bloc: B) => void;
  onUnmount?: (bloc: B) => void;
}
```

### Props Ownership

The BlacAdapter implements props ownership tracking:

```typescript
class BlacAdapter<B extends BlocConstructor<BlocBase<any>>> {
  // Props ownership tracking
  private static propsOwners = new WeakMap<BlocBase<any>, string>();
  
  updateProps(props: any): void {
    // Only the owner adapter can update props
    // First adapter to set props becomes the owner
    // Ownership is released on unmount
  }
}
```

## Usage Patterns

### Bloc with Props

```typescript
// 1. Define props interface
interface MyBlocProps {
  apiUrl: string;      // Constructor parameter
  userId?: string;     // Reactive prop
  filters?: Filter[];  // Reactive prop
}

// 2. Create Bloc that handles PropsUpdated events
class MyBloc extends Bloc<MyState, PropsUpdated<MyBlocProps>> {
  constructor(props: MyBlocProps) {
    super(initialState);
    
    // Access constructor props
    this.apiClient = new ApiClient(props.apiUrl);
    
    // Handle prop updates
    this.on(PropsUpdated<MyBlocProps>, (event, emit) => {
      const { userId, filters } = event.props;
      // React to prop changes
    });
  }
}

// 3. Use in React component
function MyComponent() {
  const [userId, setUserId] = useState<string>();
  
  const [state, bloc] = useBloc(MyBloc, {
    props: {
      apiUrl: 'https://api.example.com',
      userId,
      filters: []
    }
  });
  
  return <div>{/* Component JSX */}</div>;
}
```

### Cubit with Props

```typescript
// 1. Define props interface
interface MyCubitProps {
  multiplier: number;
  max?: number;
}

// 2. Create Cubit with onPropsChanged lifecycle
class MyCubit extends Cubit<MyState, MyCubitProps> {
  constructor() {
    super(initialState);
  }
  
  protected onPropsChanged(oldProps: MyCubitProps | undefined, newProps: MyCubitProps): void {
    if (oldProps?.multiplier !== newProps.multiplier) {
      // React to multiplier change
      this.recalculate();
    }
  }
  
  calculate = (value: number) => {
    const result = value * (this.props?.multiplier ?? 1);
    const capped = Math.min(result, this.props?.max ?? Infinity);
    this.emit({ result: capped });
  };
}

// 3. Use in React component
function MyComponent() {
  const [multiplier, setMultiplier] = useState(2);
  
  const [state, cubit] = useBloc(MyCubit, {
    props: { multiplier, max: 100 }
  });
  
  return <div>{/* Component JSX */}</div>;
}
```

## Props Lifecycle

### Initial Render

1. Component calls `useBloc` with props
2. BlacAdapter creates Bloc/Cubit instance, passing props to constructor
3. Initial props are set on the instance
4. For Cubits, `_updateProps` is called, triggering `onPropsChanged`
5. Component renders with initial state

### Props Update

1. Component re-renders with new props
2. useEffect detects props change
3. BlacAdapter's `updateProps` is called
4. For Blocs: `PropsUpdated` event is dispatched
5. For Cubits: `_updateProps` is called, triggering `onPropsChanged`
6. State updates trigger component re-render

### Ownership Rules

1. First component to provide props becomes the owner
2. Only the owner can update props
3. Non-owner components see warning if they try to update props
4. Ownership transfers when owner unmounts

## TypeScript Support

### Type Inference

Props types are inferred from:
- Constructor parameters for initial values
- Generic type parameters for reactive props

```typescript
// Bloc with inferred props
class TodoBloc extends Bloc<TodoState, PropsUpdated<TodoProps>> {
  constructor(props: TodoProps) { // Props type enforced here
    super(initialState);
  }
}

// Usage with type checking
const [state, bloc] = useBloc(TodoBloc, {
  props: { // TypeScript knows the shape of TodoProps
    filter: 'active',
    sortBy: 'date'
  }
});
```

### Generic Constraints

```typescript
// Props must be an object for PropsUpdated event
export class PropsUpdated<P = any> {
  constructor(public readonly props: P) {}
}

// Cubit can have any props type or null
abstract class Cubit<S, P = null> extends BlocBase<S, P> {
  // ...
}
```

## Performance Considerations

### Shallow Equality Checking

Props updates use shallow equality to prevent unnecessary updates:

```typescript
function shallowEqual(a: any, b: any): boolean {
  if (Object.is(a, b)) return true;
  // ... shallow comparison logic
}
```

### Disposal Safety

Props updates are ignored during Bloc disposal:

```typescript
updateProps(props: any): void {
  if (bloc._lifecycleState === BlocLifecycleState.DISPOSED ||
      bloc._lifecycleState === BlocLifecycleState.DISPOSING) {
    return; // Ignore updates during disposal
  }
  // ... update logic
}
```

## Error Handling

### Ownership Conflicts

When non-owner tries to update props:
```
[BlacAdapter] Attempted to set props on MyBloc from non-owner adapter
```

### Missing Props

Always provide defaults for optional props:
```typescript
const value = this.props?.optionalValue ?? defaultValue;
```

## Testing

### Unit Testing Props

```typescript
// Test Bloc props
it('should handle prop updates', async () => {
  const bloc = new MyBloc({ apiUrl: '/api' });
  
  await bloc.add(new PropsUpdated({
    apiUrl: '/api',
    userId: '123'
  }));
  
  expect(bloc.state).toEqual(expectedState);
});

// Test Cubit props
it('should react to prop changes', () => {
  const cubit = new MyCubit();
  
  (cubit as any)._updateProps({ multiplier: 3 });
  
  cubit.calculate(5);
  expect(cubit.state.result).toBe(15);
});
```

### Integration Testing

```typescript
it('should update bloc when props change', async () => {
  const { result, rerender } = renderHook(
    ({ userId }) => useBloc(MyBloc, {
      props: { apiUrl: '/api', userId }
    }),
    { initialProps: { userId: '123' } }
  );
  
  // Wait for initial render
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
  
  // Update props
  rerender({ userId: '456' });
  
  // Wait for prop update effect
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, 0));
  });
  
  expect(result.current[0].userId).toBe('456');
});
```

## Migration from Previous Versions

If migrating from a version with separate `staticConfig`:

```typescript
// Old API
const bloc = useBloc(
  MyBloc,
  { apiUrl: '/api' },        // staticConfig
  { props: { userId: '123' } } // reactive props
);

// New API
const bloc = useBloc(MyBloc, {
  props: {
    apiUrl: '/api',    // All props in one object
    userId: '123'
  }
});
```

## Complete Example

```typescript
// Props interface
interface TodoListProps {
  // Constructor params
  storageKey: string;
  maxItems: number;
  
  // Reactive props
  filter: 'all' | 'active' | 'completed';
  sortBy: 'date' | 'priority' | 'title';
}

// State interface
interface TodoListState {
  todos: Todo[];
  filteredTodos: Todo[];
  loading: boolean;
}

// Bloc implementation
class TodoListBloc extends Bloc<TodoListState, PropsUpdated<TodoListProps>> {
  private storage: Storage;
  
  constructor(props: TodoListProps) {
    super({
      todos: [],
      filteredTodos: [],
      loading: true
    });
    
    // Use constructor props
    this.storage = new Storage(props.storageKey);
    
    // Load initial data
    this.add(new LoadTodos());
    
    // Handle prop updates
    this.on(PropsUpdated<TodoListProps>, (event, emit) => {
      const { filter, sortBy } = event.props;
      const filtered = this.filterAndSort(this.state.todos, filter, sortBy);
      emit({ ...this.state, filteredTodos: filtered });
    });
    
    // Other event handlers...
  }
  
  private filterAndSort(todos: Todo[], filter: string, sortBy: string): Todo[] {
    // Implementation
  }
}

// React component
function TodoList() {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'priority' | 'title'>('date');
  
  const [state, bloc] = useBloc(TodoListBloc, {
    props: {
      storageKey: 'todos',
      maxItems: 100,
      filter,
      sortBy
    }
  });
  
  if (state.loading) {
    return <div>Loading...</div>;
  }
  
  return (
    <div>
      <FilterBar value={filter} onChange={setFilter} />
      <SortSelector value={sortBy} onChange={setSortBy} />
      <TodoItems todos={state.filteredTodos} />
    </div>
  );
}
```