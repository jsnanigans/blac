---
outline: [2, 3]
---

# @blac/react

React integration hooks and components for BlaC state management.

## Quick Reference

**Hooks:** [`configureBlacReact`](#configureblacreact), [`useBloc`](#usebloc)

**Interfaces:** [`BlacReactConfig`](#blacreactconfig), [`UseBlocOptions`](#useblocoptions)

**Types:** `UseBlocReturn`

## Hooks

### configureBlacReact

Configure global defaults for @blac/react hooks.

```typescript
export declare function configureBlacReact(config: Partial<BlacReactConfig>): void;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `config` | `Partial<BlacReactConfig>` | Partial configuration to merge with defaults |

**Examples:**

```ts
import { configureBlacReact } from '@blac/react';

// Disable auto-tracking globally
configureBlacReact({
  autoTrack: false
});
```

---

### useBloc

React hook that connects a component to a state container with automatic re-render on state changes.

Supports three tracking modes: - **Auto-tracking** (default): Automatically detects accessed state properties via Proxy - **Manual dependencies**: Explicit dependency array like useEffect - **No tracking**: Returns full state without optimization

```typescript
export declare function useBloc<T extends StateContainerConstructor = StateContainerConstructor>(BlocClass: T, options?: UseBlocOptions<T>): UseBlocReturn<T, ExtractState<T>>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `BlocClass` | `T` | The state container class to connect to |
| `options` | `UseBlocOptions<T>` | Configuration options for tracking mode and instance management |

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

## Interfaces

### BlacReactConfig

Global configuration for @blac/react

```typescript
export interface BlacReactConfig
```

| Property | Type | Description |
|----------|------|-------------|
| `autoTrack` | `boolean` | Enable automatic property tracking via Proxy (default: true) |

---

### UseBlocOptions

Configuration options for useBloc hook  @template TBloc - The state container type

```typescript
export interface UseBlocOptions<TBloc extends StateContainerConstructor>
```

| Property | Type | Description |
|----------|------|-------------|
| `autoTrack` *(optional)* | `boolean` | Enable automatic property tracking via Proxy (default: true) |
| `dependencies` *(optional)* | `(state: ExtractState<TBloc>, bloc: InstanceReadonlyState<TBloc>) => unknown[]` | Manual dependency array like useEffect (disables autoTrack) |
| `disableGetterCache` *(optional)* | `boolean` | Disable caching for getter tracking |
| `instanceId` *(optional)* | `string \| number` | Custom instance identifier for shared or isolated instances |
| `onMount` *(optional)* | `(bloc: InstanceType<TBloc>) => void` | Callback invoked when bloc instance mounts |
| `onUnmount` *(optional)* | `(bloc: InstanceType<TBloc>) => void` | Callback invoked when bloc instance unmounts |

---

## Types

### UseBlocReturn

Tuple return type from useBloc hook containing state, bloc instance, and ref - [0] Current state value (with optional state type override) - [1] State container instance (bloc) for calling actions - [2] Ref object for accessing component ref (advanced use cases)

```typescript
export type UseBlocReturn<TBloc extends StateContainerConstructor, S = ExtractState<TBloc>> = [S, InstanceReadonlyState<TBloc>, RefObject<ComponentRef>];
```

