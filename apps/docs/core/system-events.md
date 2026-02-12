# System Events

`StateContainer` exposes lifecycle events via `onSystemEvent`.

```ts
class MyCubit extends Cubit<State> {
  constructor() {
    super({});

    this.onSystemEvent('stateChanged', ({ state, previousState }) => {
      console.log(previousState, '->', state);
    });

    this.onSystemEvent('dispose', () => {
      console.log('Disposed');
    });
  }
}
```

Supported events:

- `stateChanged` -> `{ state, previousState }`
- `dispose` -> `void`
