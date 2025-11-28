---
outline: [2, 3]
---

# @blac/react

## Overview

**Interfaces:** [`UseBlocActionsOptions`](#useblocactionsoptions), [`UseBlocOptions`](#useblocoptions)

**Functions:** [`useBloc`](#usebloc), [`useBlocActions`](#useblocactions)

**Types:** `UseBlocReturn`

## Interfaces

### UseBlocActionsOptions

```typescript
export interface UseBlocActionsOptions<TBloc, TProps = any>
```

| Property | Type | Description |
|----------|------|-------------|
| `instanceId` *(optional)* | `string \| number` |  |
| `onMount` *(optional)* | `(bloc: TBloc) => void` |  |
| `onUnmount` *(optional)* | `(bloc: TBloc) => void` |  |
| `props` *(optional)* | `TProps` |  |

---

### UseBlocOptions

```typescript
export interface UseBlocOptions<TBloc, TProps = any>
```

| Property | Type | Description |
|----------|------|-------------|
| `autoTrack` *(optional)* | `boolean` |  |
| `dependencies` *(optional)* | `(state: ExtractState<TBloc>, bloc: TBloc) => unknown[]` |  |
| `disableGetterCache` *(optional)* | `boolean` |  |
| `instanceId` *(optional)* | `string \| number` |  |
| `onMount` *(optional)* | `(bloc: TBloc) => void` |  |
| `onUnmount` *(optional)* | `(bloc: TBloc) => void` |  |
| `props` *(optional)* | `TProps` |  |

---

## Functions

### useBloc

```typescript
export declare function useBloc<T extends new (...args: any[]) => StateContainer<any, any>>(BlocClass: T & BlocConstructor<InstanceType<T>>, options?: UseBlocOptions<InstanceType<T>>): UseBlocReturn<InstanceType<T>>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `BlocClass` | `T & BlocConstructor<InstanceType<T>>` |  |
| `options` | `UseBlocOptions<InstanceType<T>>` |  |

---

### useBlocActions

```typescript
export declare function useBlocActions<T extends new (...args: any[]) => StateContainer<any, any>>(BlocClass: T & BlocConstructor<InstanceType<T>>, options?: UseBlocActionsOptions<InstanceType<T>>): InstanceType<T>;
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `BlocClass` | `T & BlocConstructor<InstanceType<T>>` |  |
| `options` | `UseBlocActionsOptions<InstanceType<T>>` |  |

---

## Type Aliases

### UseBlocReturn

```typescript
export type UseBlocReturn<TBloc> = [
    ExtractState<TBloc>,
    TBloc,
    RefObject<ComponentRef>
];
```

