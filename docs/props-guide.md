# Props Guide for BlaC

## Introduction

BlaC now supports reactive props, allowing you to pass data from React components to your Blocs and Cubits. This feature enables dynamic configuration and reactive updates while maintaining BlaC's predictable state management patterns.

## Core Concepts

### What are Props?

Props in BlaC serve two purposes:
1. **Constructor Parameters**: Initial configuration passed when creating a Bloc/Cubit instance
2. **Reactive Data**: Values that can change during the component lifecycle and trigger state updates

### Props Ownership

- Only the first component that provides props to a Bloc/Cubit becomes the "owner"
- The owner can update props, while other components can only read the state
- Ownership transfers when the owner component unmounts

## API Reference

### useBloc Hook

```typescript
function useBloc<B extends BlocConstructor<BlocBase<any>>>(
  blocConstructor: B,
  options?: {
    props?: ConstructorParameters<B>[0];  // Props for constructor AND reactive updates
    id?: string;                          // Custom instance ID
    dependencies?: (bloc: InstanceType<B>) => unknown[];
    onMount?: (bloc: InstanceType<B>) => void;
    onUnmount?: (bloc: InstanceType<B>) => void;
  }
): [State, BlocInstance]
```

### PropsUpdated Event

```typescript
export class PropsUpdated<P = any> {
  constructor(public readonly props: P) {}
}
```

### Cubit Props Methods

```typescript
abstract class Cubit<S, P = null> extends BlocBase<S, P> {
  // Access current props
  protected get props(): P | undefined
  
  // Override to handle prop changes
  protected onPropsChanged?(oldProps: P | undefined, newProps: P): void
}
```

## Implementation Patterns

### 1. Bloc with Props (Event-Driven)

Blocs handle prop updates through the `PropsUpdated` event, maintaining consistency with their event-driven architecture.

```typescript
interface SearchProps {
  apiEndpoint: string;  // Constructor param
  query: string;        // Reactive prop
  filters?: string[];   // Optional reactive prop
}

interface SearchState {
  results: string[];
  loading: boolean;
  error?: string;
}

class SearchBloc extends Bloc<SearchState, PropsUpdated<SearchProps>> {
  constructor(props: SearchProps) {
    super({ results: [], loading: false });
    
    // Access constructor params
    console.log('API endpoint:', props.apiEndpoint);
    
    // Handle prop updates as events
    this.on(PropsUpdated<SearchProps>, async (event, emit) => {
      const { query, filters } = event.props;
      
      if (!query) {
        emit({ results: [], loading: false });
        return;
      }
      
      emit({ ...this.state, loading: true, error: undefined });
      
      try {
        // Use apiEndpoint from constructor
        const results = await this.fetchResults(props.apiEndpoint, query, filters);
        emit({ results, loading: false });
      } catch (error) {
        emit({ ...this.state, loading: false, error: error.message });
      }
    });
  }
  
  private async fetchResults(endpoint: string, query: string, filters?: string[]) {
    // Implementation
  }
}

// React Component
function SearchComponent() {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<string[]>([]);
  
  const [state, bloc] = useBloc(SearchBloc, {
    props: {
      apiEndpoint: '/api/search',  // Passed to constructor
      query,                       // Reactive - triggers PropsUpdated
      filters                      // Reactive - triggers PropsUpdated
    }
  });
  
  return (
    <div>
      <input value={query} onChange={e => setQuery(e.target.value)} />
      {state.loading && <p>Searching...</p>}
      {state.error && <p>Error: {state.error}</p>}
      <ul>
        {state.results.map(result => <li key={result}>{result}</li>)}
      </ul>
    </div>
  );
}
```

### 2. Cubit with Props (Method-Based)

Cubits use a simpler approach with direct prop access and an optional lifecycle method.

```typescript
interface CounterProps {
  step: number;
  max?: number;
  min?: number;
}

interface CounterState {
  count: number;
  stepSize: number;
}

class CounterCubit extends Cubit<CounterState, CounterProps> {
  constructor() {
    super({ count: 0, stepSize: 1 });
  }
  
  // Called when props change
  protected onPropsChanged(oldProps: CounterProps | undefined, newProps: CounterProps): void {
    // Update step size in state when prop changes
    if (oldProps?.step !== newProps.step) {
      this.emit({ ...this.state, stepSize: newProps.step });
    }
  }
  
  increment = () => {
    const { step = 1, max = Infinity } = this.props || {};
    const newCount = Math.min(this.state.count + step, max);
    this.emit({ ...this.state, count: newCount });
  };
  
  decrement = () => {
    const { step = 1, min = -Infinity } = this.props || {};
    const newCount = Math.max(this.state.count - step, min);
    this.emit({ ...this.state, count: newCount });
  };
  
  reset = () => {
    this.emit({ count: 0, stepSize: this.props?.step || 1 });
  };
}

// React Component
function Counter() {
  const [step, setStep] = useState(1);
  const [max, setMax] = useState(100);
  
  const [state, cubit] = useBloc(CounterCubit, {
    props: { step, max }
  });
  
  return (
    <div>
      <h2>Count: {state.count}</h2>
      <p>Step size: {state.stepSize}</p>
      <button onClick={cubit.increment}>+{step}</button>
      <button onClick={cubit.decrement}>-{step}</button>
      <button onClick={cubit.reset}>Reset</button>
      
      <label>
        Step: 
        <input 
          type="number" 
          value={step} 
          onChange={e => setStep(Number(e.target.value))} 
        />
      </label>
    </div>
  );
}
```

### 3. Shared State with Props Ownership

When multiple components use the same Bloc/Cubit, only the owner can update props.

```typescript
// Owner component - provides and updates props
function TodoListOwner() {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  
  const [state, bloc] = useBloc(TodoBloc, {
    props: { filter }  // This component owns the props
  });
  
  return (
    <div>
      <FilterButtons onFilterChange={setFilter} />
      <TodoList todos={state.filteredTodos} />
    </div>
  );
}

// Reader component - can read state but not update props
function TodoCounter() {
  const [state] = useBloc(TodoBloc, {
    // No props - read-only consumer
  });
  
  return <p>Total todos: {state.todos.length}</p>;
}
```

### 4. Isolated Instances with Props

For components that need their own instance with their own props:

```typescript
class FormFieldCubit extends Cubit<FormFieldState, FormFieldProps> {
  static isolated = true;  // Each component gets its own instance
  
  constructor(props: FormFieldProps) {
    super({
      value: props.initialValue || '',
      touched: false,
      error: undefined
    });
  }
  
  protected onPropsChanged(oldProps, newProps) {
    // Re-validate when validation rules change
    if (oldProps?.validate !== newProps.validate) {
      this.validate();
    }
  }
  
  setValue = (value: string) => {
    this.emit({ ...this.state, value, touched: true });
    this.validate();
  };
  
  private validate = () => {
    const error = this.props?.validate?.(this.state.value);
    this.emit({ ...this.state, error });
  };
}

// Each TextInput gets its own FormFieldCubit instance
function TextInput({ name, validate, initialValue }: TextInputProps) {
  const [state, cubit] = useBloc(FormFieldCubit, {
    props: { name, validate, initialValue }
  });
  
  return (
    <div>
      <input 
        value={state.value}
        onChange={e => cubit.setValue(e.target.value)}
        onBlur={() => cubit.setTouched(true)}
      />
      {state.touched && state.error && (
        <span className="error">{state.error}</span>
      )}
    </div>
  );
}
```

## Advanced Patterns

### Combining Constructor Config with Reactive Props

```typescript
interface ApiClientProps {
  // Constructor config
  baseUrl: string;
  timeout: number;
  
  // Reactive props
  authToken?: string;
  retryCount?: number;
}

class ApiClientBloc extends Bloc<ApiState, PropsUpdated<ApiClientProps>> {
  private client: HttpClient;
  
  constructor(props: ApiClientProps) {
    super({ requests: [], errors: [] });
    
    // Use constructor props to set up client
    this.client = new HttpClient({
      baseUrl: props.baseUrl,
      timeout: props.timeout
    });
    
    // Handle reactive prop updates
    this.on(PropsUpdated<ApiClientProps>, (event, emit) => {
      // Update auth token when it changes
      if (event.props.authToken) {
        this.client.setAuthToken(event.props.authToken);
      }
      
      // Update retry strategy
      if (event.props.retryCount !== undefined) {
        this.client.setRetryCount(event.props.retryCount);
      }
    });
  }
}
```

### Props with TypeScript

```typescript
// Define props interface
interface DataGridProps {
  columns: Column[];
  pageSize: number;
  sortable?: boolean;
  onRowClick?: (row: any) => void;
}

// Strongly typed Bloc
class DataGridBloc extends Bloc<DataGridState, PropsUpdated<DataGridProps>> {
  // Props are fully typed
}

// Type-safe usage
const [state, bloc] = useBloc(DataGridBloc, {
  props: {
    columns: [...],    // Required
    pageSize: 10,      // Required
    sortable: true,    // Optional
    // onRowClick is optional
  }
});
```

## Testing Props

### Testing Bloc Props

```typescript
describe('SearchBloc', () => {
  it('should handle prop updates', async () => {
    const bloc = new SearchBloc({ apiEndpoint: '/api' });
    
    // Simulate prop update
    await bloc.add(new PropsUpdated({ 
      apiEndpoint: '/api',
      query: 'test' 
    }));
    
    expect(bloc.state.loading).toBe(true);
    
    // Wait for async operation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(bloc.state.results).toHaveLength(3);
  });
});
```

### Testing Cubit Props

```typescript
describe('CounterCubit', () => {
  it('should use props in methods', () => {
    const cubit = new CounterCubit();
    
    // Set props
    (cubit as any)._updateProps({ step: 5, max: 10 });
    
    // Test increment with step
    cubit.increment();
    expect(cubit.state.count).toBe(5);
    
    // Test max limit
    cubit.increment();
    expect(cubit.state.count).toBe(10); // Capped at max
  });
});
```

### Testing React Components with Props

```typescript
describe('Counter Component', () => {
  it('should update when props change', async () => {
    const { result, rerender } = renderHook(
      ({ step }) => useBloc(CounterCubit, { props: { step } }),
      { initialProps: { step: 1 } }
    );
    
    // Wait for initial props to be set
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Change props
    rerender({ step: 5 });
    
    // Wait for prop update
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    // Verify prop change effect
    expect(result.current[0].stepSize).toBe(5);
  });
});
```

## Best Practices

### 1. Separate Constructor Config from Reactive Props

```typescript
interface Props {
  // Constructor configuration (doesn't change)
  apiKey: string;
  environment: 'dev' | 'prod';
  
  // Reactive props (can change)
  userId?: string;
  filters?: Filter[];
}
```

### 2. Use Props for External Dependencies

Props are ideal for:
- User input (search queries, filters)
- Configuration from parent components
- External state (auth tokens, user preferences)
- Feature flags

### 3. Keep Props Simple

Props should be:
- Serializable (avoid functions, complex objects)
- Minimal (only what's needed)
- Well-typed (use TypeScript interfaces)

### 4. Handle Missing Props Gracefully

```typescript
increment = () => {
  const step = this.props?.step ?? 1;  // Default value
  const max = this.props?.max ?? Infinity;
  // ...
};
```

### 5. Document Props Requirements

```typescript
/**
 * SearchBloc handles search functionality
 * 
 * Constructor props:
 * - apiEndpoint: Base URL for search API
 * 
 * Reactive props:
 * - query: Search query string (required for search)
 * - filters: Optional array of filter criteria
 * - limit: Results per page (default: 20)
 */
class SearchBloc extends Bloc<SearchState, PropsUpdated<SearchProps>> {
  // ...
}
```

## Common Pitfalls

### 1. Expecting Immediate Props in Lifecycle

```typescript
// ❌ Wrong - props may not be set yet
constructor() {
  super(initialState);
  console.log(this.props); // Will be undefined
}

// ✅ Correct - use constructor parameter
constructor(props: MyProps) {
  super(initialState);
  console.log(props); // Available immediately
}
```

### 2. Mutating Props

```typescript
// ❌ Wrong - never mutate props
this.props.filters.push('new-filter');

// ✅ Correct - props are immutable
this.add(new PropsUpdated({
  ...this.props,
  filters: [...this.props.filters, 'new-filter']
}));
```

### 3. Using Props in Isolated Blocs

```typescript
// ⚠️ Be careful with isolated blocs
class IsolatedBloc extends Bloc {
  static isolated = true;
}

// Each instance has its own props
// Changes in one don't affect others
```

## Migration Guide

### From Old API to New API

```typescript
// Old API (if you had separate staticConfig)
const bloc = useBloc(
  SearchBloc,
  { apiEndpoint: '/api' },        // staticConfig
  { props: { query: 'test' } }    // reactive props
);

// New API (unified props)
const bloc = useBloc(SearchBloc, {
  props: { 
    apiEndpoint: '/api',  // All props in one object
    query: 'test' 
  }
});
```

### Adding Props to Existing Blocs

1. Add props type parameter to your Bloc/Cubit:
   ```typescript
   // Before
   class MyBloc extends Bloc<MyState> { }
   
   // After  
   class MyBloc extends Bloc<MyState, PropsUpdated<MyProps>> { }
   ```

2. Handle props in constructor or events:
   ```typescript
   constructor(props: MyProps) {
     super(initialState);
     // Use constructor props
   }
   
   // Handle reactive updates
   this.on(PropsUpdated<MyProps>, (event, emit) => {
     // React to prop changes
   });
   ```

3. Update component usage:
   ```typescript
   const [state, bloc] = useBloc(MyBloc, {
     props: { /* your props */ }
   });
   ```

## Conclusion

Props in BlaC provide a powerful way to make your state management more dynamic while maintaining predictability. By following these patterns and best practices, you can build reactive applications that respond to changing requirements while keeping your business logic clean and testable.