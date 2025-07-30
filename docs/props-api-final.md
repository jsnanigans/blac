# Final Props API Documentation

## Overview

The props implementation for BlaC has been successfully completed with a clean, unified API. The `useBloc` hook now accepts a single `props` option that serves dual purposes:

1. **Constructor Parameters**: Initial props are passed to the Bloc/Cubit constructor
2. **Reactive Props**: Subsequent prop changes trigger updates via events or lifecycle methods

## API Reference

### useBloc Hook

```typescript
function useBloc<B extends BlocConstructor<BlocBase<any>>>(
  blocConstructor: B,
  options?: {
    props?: any;      // Both constructor params AND reactive props
    key?: string;     // Instance ID
    dependencies?: (bloc: InstanceType<B>) => unknown[];
    onMount?: (bloc: InstanceType<B>) => void;
    onUnmount?: (bloc: InstanceType<B>) => void;
  }
): [State, BlocInstance]
```

### Usage Examples

#### Bloc with Constructor Parameters and Reactive Props

```typescript
// Bloc that needs apiEndpoint in constructor and handles query reactively
class SearchBloc extends Bloc<SearchState, PropsUpdated<SearchProps>> {
  constructor(props: { apiEndpoint: string }) {
    super({ results: [], loading: false });
    // apiEndpoint is available here from props
    
    this.on(PropsUpdated<SearchProps>, (event, emit) => {
      // Handle reactive prop updates (query changes)
      const { query } = event.props;
      // Perform search...
    });
  }
}

// Usage
const bloc = useBloc(SearchBloc, {
  props: { 
    apiEndpoint: '/api/search',  // Constructor param
    query: searchTerm            // Reactive prop
  }
});
```

#### Cubit with Reactive Props Only

```typescript
// Cubit with no constructor params, only reactive props
class CounterCubit extends Cubit<CounterState, CounterProps> {
  constructor() {
    super({ count: 0, stepSize: 1 });
  }
  
  protected onPropsChanged(oldProps: CounterProps | undefined, newProps: CounterProps): void {
    if (oldProps?.step !== newProps.step) {
      this.emit({ ...this.state, stepSize: newProps.step });
    }
  }
  
  increment = () => {
    const step = this.props?.step ?? 1;
    this.emit({ count: this.state.count + step, stepSize: step });
  };
}

// Usage
const cubit = useBloc(CounterCubit, {
  props: { step: 5 }  // Purely reactive props
});
```

## Important Notes

### Props Timing

1. **Constructor Props**: Available immediately when the Bloc/Cubit is created
2. **Reactive Props**: Set after the component mounts via React's useEffect
   - This means methods that depend on props may see `null` if called before the effect runs
   - This is standard React behavior and matches how other hooks work

### Props Ownership

- Only the first component that provides props becomes the "owner"
- Other components can read state but cannot update props
- Ownership transfers when the owner unmounts

### TypeScript Support

Full type inference is provided. Props are typed based on:
- Constructor parameters for initial values
- Generic type parameters for reactive props

## Migration Guide

If you were using a separate `staticConfig` parameter:

```typescript
// Old API
const bloc = useBloc(
  SearchBloc,
  { apiEndpoint: '/api' },        // staticConfig
  { props: { query: 'test' } }    // reactive props
);

// New API
const bloc = useBloc(
  SearchBloc,
  { 
    props: { 
      apiEndpoint: '/api',   // All in one props object
      query: 'test' 
    } 
  }
);
```

## Testing Considerations

When testing components that use props, remember that reactive props are set asynchronously:

```typescript
// Wait for props to be set
await act(async () => {
  await new Promise(resolve => setTimeout(resolve, 0));
});
```

## Conclusion

The unified props API provides a clean, intuitive interface that aligns with React patterns while maintaining BlaC's architecture. The single `props` option simplifies the mental model and reduces API surface area while providing full functionality for both constructor parameters and reactive props.