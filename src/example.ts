class Blac {}


abstract class Bloc<S, A> {
  private _state: S;

  get state() {
    return this._state;
  }
  
  constructor(initialState: S) {
    this._state = initialState;
  }

  abstract reducer(action: A, state: S): S;

  emit(action: A) {
    this._state = this.reducer(action, this._state);
  }
}


const state = new Blac();



// Counter Bloc
type CounterState = number;

enum CounterActions {
  increment = 'increment',
  decrement = 'decrement',
}
type CounterAction = CounterActions;


class Counter extends Bloc<CounterState, CounterAction> {
  constructor() {
    super(0);
  }

  reducer(action: CounterAction, state: CounterState) {
    switch (action) {
      case CounterActions.increment:
        return state + 1;
      case CounterActions.decrement:
        return state - 1;
    }
  }
}

const counter = new Counter();
// add to counter
counter.emit(CounterActions.increment);
// decrement counter
counter.emit(CounterActions.decrement);


// state.add(new )
