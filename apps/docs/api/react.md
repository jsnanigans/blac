---
outline: [2, 3]
---

# @blac/react

React integration hooks and components for BlaC state management.

## Quick Reference

**Hooks:** [`useBloc`](#usebloc), [`useBlocActions`](#useblocactions)

**Interfaces:** [`UseBlocActionsOptions`](#useblocactionsoptions), [`UseBlocOptions`](#useblocoptions)

**Types:** `UseBlocReturn`

## Hooks

### useBloc

React hook that connects a component to a state container with automatic re-render on state changes.

Supports three tracking modes: - **Auto-tracking** (default): Automatically detects accessed state properties via Proxy - **Manual dependencies**: Explicit dependency array like useEffect - **No tracking**: Returns full state without optimization

```typescript
export declare function useBloc<T extends new (...args: any[]) => StateContainer<any, any>>(BlocClass: T & BlocConstructor<InstanceType<T>>, options?: UseBlocOptions<InstanceType<T>>): UseBlocReturn<InstanceType<T>>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `BlocClass` | `T & BlocConstructor<InstanceType<T>>` | The state container class to connect to |
| `options` | `UseBlocOptions<InstanceType<T>>` | Configuration options for tracking mode and instance management |

**Returns:** Tuple with [state, bloc instance, ref]

**Examples:**

**Basic usage**

```ts
const [state, myBloc, ref] = useBloc(MyBloc);
```

**With manual dependencies**

```ts
const [state, myBloc] = useBloc(MyBloc, {
  dependencies: (state) => [state.count]
});
```

**With isolated instance**

```ts
const [state, myBloc] = useBloc(MyBloc, {
  instanceId: 'unique-id'
});
```

---

### useBlocActions

React hook that connects to a state container instance without triggering re-renders. Use this when you only need to call actions on the bloc without subscribing to state changes.

```typescript
export declare function useBlocActions<T extends new (...args: any[]) => StateContainer<any, any>>(BlocClass: T & BlocConstructor<InstanceType<T>>, options?: UseBlocActionsOptions<InstanceType<T>>): InstanceType<T>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `BlocClass` | `T & BlocConstructor<InstanceType<T>>` | The state container class to connect to |
| `options` | `UseBlocActionsOptions<InstanceType<T>>` | Configuration options for instance management and lifecycle |

**Returns:** The state container instance for calling actions

**Examples:**

**Basic usage**

```ts
const myBloc = useBlocActions(MyBloc);
// Call methods on the bloc without re-rendering
myBloc.someMethod();
```

**With isolated instance**

```ts
const myBloc = useBlocActions(MyBloc, {
  instanceId: 'unique-id'
});
```

---

## Interfaces

### UseBlocActionsOptions

Configuration options for useBlocActions hook  @template TBloc - The state container type  @template TProps - Props type passed to the container

```typescript
export interface UseBlocActionsOptions<TBloc, TProps = any>
```

| Property | Type | Description |
|----------|------|-------------|
| `instanceId` *(optional)* | `string \| number` | Custom instance identifier for shared or isolated instances |
| `onMount` *(optional)* | `(bloc: TBloc) => void` | Callback invoked when bloc instance mounts |
| `onUnmount` *(optional)* | `(bloc: TBloc) => void` | Callback invoked when bloc instance unmounts |
| `props` *(optional)* | `TProps` | Props passed to bloc constructor or updateProps |

---

### UseBlocOptions

Configuration options for useBloc hook  @template TBloc - The state container type  @template TProps - Props type passed to the container

```typescript
export interface UseBlocOptions<TBloc, TProps = any>
```

| Property | Type | Description |
|----------|------|-------------|
| `autoTrack` *(optional)* | `boolean` | Enable automatic property tracking via Proxy (default: true) |
| `dependencies` *(optional)* | `(state: ExtractState<TBloc>, bloc: TBloc) => unknown[]` | Manual dependency array like useEffect (disables autoTrack) |
| `disableGetterCache` *(optional)* | `boolean` | Disable caching for getter tracking |
| `instanceId` *(optional)* | `string \| number` | Custom instance identifier for shared or isolated instances |
| `onMount` *(optional)* | `(bloc: TBloc) => void` | Callback invoked when bloc instance mounts |
| `onUnmount` *(optional)* | `(bloc: TBloc) => void` | Callback invoked when bloc instance unmounts |
| `props` *(optional)* | `TProps` | Props passed to bloc constructor or updateProps |

---

## Types

### UseBlocReturn

Tuple return type from useBloc hook containing state, bloc instance, and ref - [0] Current state value - [1] State container instance (bloc) for calling actions - [2] Ref object for accessing component ref (advanced use cases)

```typescript
export type UseBlocReturn<TBloc> = [
    ExtractState<TBloc>,
    TBloc,
    RefObject<ComponentRef>
];
```

