# Performance

BlaC minimizes re-renders through proxy-based dependency tracking. Most components work well with the default auto-tracking. This page covers patterns for when you need more control.

## How auto-tracking helps

By default, `useBloc` wraps the returned state in a Proxy that records which properties your component reads. Only changes to those properties trigger re-renders.

```tsx
function UserName() {
  const [state] = useBloc(UserCubit);
  return <span>{state.name}</span>;
  // changes to state.email, state.avatar, etc. are ignored
}
```

This happens automatically — no selectors, no memoization, no configuration.

## Pattern: Split readers and writers

Separate components that read state from components that only trigger actions.

```tsx
function Counter() {
  return (
    <>
      <CountDisplay />
      <CountButtons />
    </>
  );
}

function CountDisplay() {
  const [state] = useBloc(CounterCubit);
  return <span>{state.count}</span>;
}

function CountButtons() {
  const [, counter] = useBloc(CounterCubit, { autoTrack: false });
  return (
    <>
      <button onClick={counter.increment}>+</button>
      <button onClick={counter.decrement}>-</button>
    </>
  );
}
```

`CountButtons` never re-renders because `autoTrack: false` disables tracking and it doesn't read state.

## Pattern: Manual deps for coarse control

When auto-tracking is too fine-grained (tracking many properties) or you want to depend on a computed value:

```tsx
function CartBadge() {
  const [, cart] = useBloc(CartCubit, {
    dependencies: (_, bloc) => [bloc.isEmpty],
  });
  return cart.isEmpty ? null : <Badge />;
}
```

This only re-renders when `isEmpty` changes from true to false (or vice versa), not on every item added.

## Pattern: Getters as computed properties

Define getters on your Cubit for derived values. They're tracked like state properties.

```ts
class CartCubit extends Cubit<{ items: CartItem[] }> {
  get total() {
    return this.state.items.reduce((sum, i) => sum + i.price, 0);
  }
}
```

```tsx
function CartTotal() {
  const [, cart] = useBloc(CartCubit);
  return <span>${cart.total}</span>;
  // only re-renders when total actually changes
}
```

## Pattern: Keep state flat

Deep nesting means more proxy wrapping and deeper comparison paths. Prefer flat state shapes.

```ts
// Prefer this
interface UserState {
  name: string;
  email: string;
  avatarUrl: string;
}

// Over this
interface UserState {
  profile: {
    personal: {
      name: string;
      contact: { email: string };
    };
    media: { avatarUrl: string };
  };
}
```

## Anti-patterns

### Spreading entire state

```tsx
// Bad: tracks every property
function UserCard() {
  const [state] = useBloc(UserCubit);
  return <ProfileCard {...state} />;
}

// Better: pass only what's needed
function UserCard() {
  const [state] = useBloc(UserCubit);
  return <ProfileCard name={state.name} avatar={state.avatarUrl} />;
}
```

### Reading state you don't render

```tsx
// Bad: reads 'items' array just to check length
function CartIcon() {
  const [state] = useBloc(CartCubit);
  return <Icon badge={state.items.length > 0} />;
}

// Better: use a getter
function CartIcon() {
  const [, cart] = useBloc(CartCubit);
  return <Icon badge={!cart.isEmpty} />;
}
```

## Measuring re-renders

Use React DevTools Profiler to identify components that re-render too often. You can also add a simple render counter during development:

```tsx
function MyComponent() {
  const renderCount = useRef(0);
  renderCount.current++;

  const [state] = useBloc(MyCubit);
  return (
    <div>
      <span>Renders: {renderCount.current}</span>
      {/* ... */}
    </div>
  );
}
```

See also: [Dependency Tracking](/react/dependency-tracking), [useBloc](/react/use-bloc)
