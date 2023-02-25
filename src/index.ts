/**
 * OBSERVABLE
 */
type Observer<S> = (oldState: S, newState: S) => void;
export class Observable<S> {
  private _observers: Observer<S>[] = [];

  constructor() {}

  subscribe(observer: Observer<S>) {
    this._observers.push(observer);
  }

  unsubscribe(observer: Observer<S>) {
    this._observers = this._observers.filter((obs) => obs !== observer);
  }

  notify(newState: S, oldState: S) {
    this._observers.forEach((observer) => observer(newState, oldState));
  }
}

/**
 * BLAC
 */
class Blac {
  globalState: any = {};

  constructor() {
  }
}

export const globalBlacInstance = new Blac();

/**
 * BLOC BASE
 */

export abstract class BlocBase<S> {
  public _state: S;
  public observable: Observable<S>;
  public blac?: Blac;

  constructor(initialState: S, options?: BlocOptions) {
    this.observable = new Observable();
    this._state = initialState;

    if (options?.blac) {
      this.blac = options?.blac;
      this.blac.globalState[this.name] = this.state;
    }
  }
  
  get state() {
    return this._state;
  }

  get name() {
    return this.constructor.name;
  }
  
  onStateChange = (callback: (newState: S, oldState: S) => void): () => void => {
    this.observable.subscribe(callback);
    return () => this.observable.unsubscribe(callback);
  }
}

/**
 * BLOC
 */
interface BlocOptions {
  blac?: Blac;
}

export abstract class Bloc<S, A> extends BlocBase<S> {
  abstract reducer(action: A, state: S): S;

  emit = (action: A): void => {
    const newState = this.reducer(action, this.state);
    this.observable.notify(newState, this.state);
    this._state = newState;
  }
}

/**
 * COUNTER BLOC
 */
type CounterState = number;

export enum CounterActions {
  increment = 'increment',
  decrement = 'decrement',
}
type CounterAction = CounterActions;


export class CounterBloc extends Bloc<CounterState, CounterAction> {
  constructor(options: BlocOptions = {}) {
    super(0, options);
  }

  reducer(action: CounterAction, state: CounterState) {
    const actions = Object.values(CounterActions);
    if (!actions.includes(action)) {
      throw new Error(`unknown action: ${action}`);
    }

    switch (action) {
      case CounterActions.increment:
        return state + 1;
      case CounterActions.decrement:
        return state - 1;
    }
  }
}


/**
 * CUBIT
 */
interface CubitOptions {
  blac?: Blac;
}

export abstract class Cubit<S> extends BlocBase<S> {
  emit(state: S) {
    if (state === this.state) {
      return;
    };

    this.observable.notify(state, this.state);
    this._state = state;
  }
}

/**
 * COUNTER CUBIT
 */
export class CounterCubit extends Cubit<CounterState> {
  constructor(options: CubitOptions = {}) {
    super(0, options);
  }

  increment() {
    this.emit(this.state + 1);
  }
}
