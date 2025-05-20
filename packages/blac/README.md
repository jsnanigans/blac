# @blac/core

Core state containers for Blac.

## Cubit

```ts
class CounterCubit extends Cubit<number> {
  constructor() { super(0) }
  increment = () => this.emit(this.state + 1)
}
```

## Bloc

```ts
class Increment {}
class CounterBloc extends Bloc<number, Increment> {
  constructor() {
    super(0)
    this.on(Increment, () => this.emit(this.state + 1))
  }
  increment = () => this.add(new Increment())
}
```

Use arrow functions so methods keep `this` bound.

MIT License.
