---
outline: [2, 3]
---

# @blac/react

React integration for BlaC.

## Exports

- `useBloc`
- `configureBlacReact`
- `BlacReactConfig`
- `UseBlocOptions`, `UseBlocReturn`

## useBloc

```ts
function useBloc<T extends StateContainerConstructor>(
  BlocClass: T,
  options?: UseBlocOptions<T>,
): UseBlocReturn<T>;
```

## configureBlacReact

```ts
configureBlacReact({
  autoTrack: true,
});
```

## UseBlocOptions

- `autoTrack?: boolean`
- `dependencies?: (state, bloc) => unknown[]`
- `instanceId?: string | number`
- `onMount?: (bloc) => void`
- `onUnmount?: (bloc) => void`
