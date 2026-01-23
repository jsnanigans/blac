---
outline: [2, 3]
---

# @blac/react

React integration hooks and components for BlaC state management.

## Quick Reference

**Hooks:** [`configureBlacReact`](#configureblacreact), [`resetBlacReactConfig`](#resetblacreactconfig), [`useBloc`](#usebloc), [`useBlocActions`](#useblocactions)

**Interfaces:** [`BlacReactConfig`](#blacreactconfig), [`UseBlocActionsOptions`](#useblocactionsoptions), [`UseBlocOptions`](#useblocoptions)

**Types:** `UseBlocReturn`

## Hooks

### configureBlacReact

Configure global defaults for @blac/react hooks.

```typescript
export declare function configureBlacReact(
  config: Partial<BlacReactConfig>,
): void;
```

| Parameter | Type                       | Description                                  |
| --------- | -------------------------- | -------------------------------------------- |
| `config`  | `Partial<BlacReactConfig>` | Partial configuration to merge with defaults |

**Examples:**

```ts
import { configureBlacReact } from '@blac/react';

// Disable auto-tracking globally
configureBlacReact({
  autoTrack: false,
});
```

---

### resetBlacReactConfig

Reset configuration to defaults. Useful for testing.

```typescript
export declare function resetBlacReactConfig(): void;
```

---

### useBloc

React hook that connects a component to a state container with automatic re-render on state changes.

Supports three tracking modes: - **Auto-tracking** (default): Automatically detects accessed state properties via Proxy - **Manual dependencies**: Explicit dependency array like useEffect - **No tracking**: Returns full state without optimization

```typescript
export declare function useBloc<
  T extends StateContainerConstructor = StateContainerConstructor,
>(
  BlocClass: StatefulContainer<T>,
  options?: UseBlocOptions<T>,
): UseBlocReturn<T, ExtractState<T>>;
```

| Parameter   | Type                   | Description                                                     |
| ----------- | ---------------------- | --------------------------------------------------------------- |
| `BlocClass` | `StatefulContainer<T>` | The state container class to connect to (must not be stateless) |
| `options`   | `UseBlocOptions<T>`    | Configuration options for tracking mode and instance management |

**Returns:** Tuple with [state, bloc instance, ref]

**Examples:**

**Basic usage**

```ts
const [state, myBloc, ref] = useBloc(MyBloc);
```

**With manual dependencies**

```ts
const [state, myBloc] = useBloc(MyBloc, {
  dependencies: (state) => [state.count],
});
```

**With isolated instance**

```ts
const [state, myBloc] = useBloc(MyBloc, {
  instanceId: 'unique-id',
});
```

---

### useBlocActions

React hook that connects to a state container instance without triggering re-renders. Use this when you only need to call actions on the bloc without subscribing to state changes.

```typescript
export declare function useBlocActions<
  T extends StateContainerConstructor = StateContainerConstructor,
>(
  BlocClass: T,
  options?: UseBlocActionsOptions<InstanceType<T>>,
): InstanceType<T>;
```

| Parameter   | Type                                     | Description                                                                    |
| ----------- | ---------------------------------------- | ------------------------------------------------------------------------------ |
| `BlocClass` | `T`                                      | The state container class to connect to (supports both stateful and stateless) |
| `options`   | `UseBlocActionsOptions<InstanceType<T>>` | Configuration options for instance management and lifecycle                    |

**Returns:** The state container instance for calling actions

**Examples:**

**Basic usage (no re-renders)**

```ts
const myBloc = useBlocActions(MyBloc);
myBloc.someMethod(); // Won't cause re-renders
```

**With isolated instance**

```ts
const myBloc = useBlocActions(MyBloc, {
  instanceId: 'unique-id',
});
```

---

## Interfaces

### BlacReactConfig

Global configuration for @blac/react

```typescript
export interface BlacReactConfig
```

| Property    | Type      | Description                                                  |
| ----------- | --------- | ------------------------------------------------------------ |
| `autoTrack` | `boolean` | Enable automatic property tracking via Proxy (default: true) |

---

### UseBlocActionsOptions

Configuration options for useBlocActions hook @template TBloc - The state container type @template TProps - Props type passed to the container

```typescript
export interface UseBlocActionsOptions<TBloc, TProps = any>
```

| Property                  | Type                    | Description                                                 |
| ------------------------- | ----------------------- | ----------------------------------------------------------- |
| `instanceId` _(optional)_ | `string \| number`      | Custom instance identifier for shared or isolated instances |
| `onMount` _(optional)_    | `(bloc: TBloc) => void` | Callback invoked when bloc instance mounts                  |
| `onUnmount` _(optional)_  | `(bloc: TBloc) => void` | Callback invoked when bloc instance unmounts                |

---

### UseBlocOptions

Configuration options for useBloc hook @template TBloc - The state container type

```typescript
export interface UseBlocOptions<TBloc extends StateContainerConstructor>
```

| Property                          | Type                                                                            | Description                                                  |
| --------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `autoTrack` _(optional)_          | `boolean`                                                                       | Enable automatic property tracking via Proxy (default: true) |
| `dependencies` _(optional)_       | `(state: ExtractState<TBloc>, bloc: InstanceReadonlyState<TBloc>) => unknown[]` | Manual dependency array like useEffect (disables autoTrack)  |
| `disableGetterCache` _(optional)_ | `boolean`                                                                       | Disable caching for getter tracking                          |
| `instanceId` _(optional)_         | `string \| number`                                                              | Custom instance identifier for shared or isolated instances  |
| `onMount` _(optional)_            | `(bloc: InstanceType<TBloc>) => void`                                           | Callback invoked when bloc instance mounts                   |
| `onUnmount` _(optional)_          | `(bloc: InstanceType<TBloc>) => void`                                           | Callback invoked when bloc instance unmounts                 |

---

## Types

### UseBlocReturn

Tuple return type from useBloc hook containing state, bloc instance, and ref - [0] Current state value (with optional state type override) - [1] State container instance (bloc) for calling actions - [2] Ref object for accessing component ref (advanced use cases)

```typescript
export type UseBlocReturn<
  TBloc extends StateContainerConstructor,
  S = ExtractState<TBloc>,
> = [S, InstanceReadonlyState<TBloc>, RefObject<ComponentRef>];
```
