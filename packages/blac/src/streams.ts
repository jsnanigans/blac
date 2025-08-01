import { BlocBase } from './BlocBase';

/**
 * Utility namespace for working with Bloc streams
 * Provides composable operators for async generators
 */
export namespace BlocStreams {
  /**
   * Type helper for extracting state type from a BlocBase
   */
  type StateOf<T> = T extends BlocBase<infer S> ? S : never;

  /**
   * Type helper for combined state from multiple blocs
   */
  type CombinedState<T extends Record<string, BlocBase<any>>> = {
    [K in keyof T]: StateOf<T[K]>;
  };

  /**
   * Combines multiple bloc states into a single stream
   * Emits whenever any bloc's state changes
   *
   * @example
   * ```typescript
   * for await (const state of BlocStreams.combineStates({
   *   counter: counterBloc,
   *   user: userBloc
   * })) {
   *   console.log(state.counter, state.user);
   * }
   * ```
   */
  export async function* combineStates<T extends Record<string, BlocBase<any>>>(
    blocs: T,
  ): AsyncGenerator<CombinedState<T>, void, void> {
    const entries = Object.entries(blocs) as Array<[keyof T, T[keyof T]]>;
    const state = {} as CombinedState<T>;

    // Initialize with current states
    for (const [key, bloc] of entries) {
      state[key] = bloc.state;
    }
    yield { ...state };

    // Create iterators for each bloc, skipping initial state since we already yielded it
    const iterators = await Promise.all(
      entries.map(async ([key, bloc]) => {
        const iterator = bloc.stateStream();
        // Skip the initial state
        await iterator.next();
        return { key, iterator, done: false };
      }),
    );

    // Create promises for the next value from each iterator
    const promises = iterators.map((item, index) =>
      item.iterator.next().then((result) => ({ index, result, key: item.key })),
    );

    while (iterators.some((it) => !it.done)) {
      // Wait for the next state change from any bloc
      const { index, result, key } = await Promise.race(
        promises.filter((_, i) => !iterators[i].done),
      );

      if (result.done) {
        iterators[index].done = true;
      } else {
        // Update the combined state
        state[key] = result.value;
        yield { ...state };

        // Create new promise for this iterator
        promises[index] = iterators[index].iterator
          .next()
          .then((r) => ({ index, result: r, key }));
      }
    }
  }

  /**
   * Creates a derived state stream from a bloc using a selector function
   * Only emits when the selected value changes
   *
   * @example
   * ```typescript
   * for await (const userName of BlocStreams.deriveState(
   *   userBloc,
   *   state => state.name
   * )) {
   *   console.log('User name changed:', userName);
   * }
   * ```
   */
  export async function* deriveState<S, D>(
    bloc: BlocBase<S>,
    selector: (state: S) => D,
  ): AsyncGenerator<D, void, void> {
    let previousDerived: D | symbol = Symbol('initial');

    for await (const state of bloc.stateStream()) {
      const derived = selector(state);

      // Only yield if the derived value changed
      if (
        previousDerived === Symbol('initial') ||
        !Object.is(previousDerived, derived)
      ) {
        previousDerived = derived;
        yield derived;
      }
    }
  }

  /**
   * Creates a debounced stream that only emits after a period of inactivity
   * Useful for reducing the frequency of updates
   *
   * @example
   * ```typescript
   * for await (const state of BlocStreams.debounce(searchBloc, 300)) {
   *   // Only emits 300ms after the last change
   *   performSearch(state.query);
   * }
   * ```
   */
  export async function* debounce<S>(
    bloc: BlocBase<S>,
    delayMs: number,
  ): AsyncGenerator<S, void, void> {
    let timeout: NodeJS.Timeout | null = null;
    let latestState: S | null = null;
    let resolver: ((value: void) => void) | null = null;

    const stateIterator = bloc.stateStream();

    try {
      for await (const state of stateIterator) {
        latestState = state;

        // Clear existing timeout
        if (timeout) {
          clearTimeout(timeout);
        }

        // Wait for the delay
        await new Promise<void>((resolve) => {
          resolver = resolve;
          timeout = setTimeout(() => {
            resolve();
          }, delayMs);
        });

        // Yield the latest state if not superseded
        if (latestState !== null) {
          yield latestState;
        }
      }
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
      // Resolver might still be active if we exit early
      resolver = null;
    }
  }

  /**
   * Creates a throttled stream that emits at most once per time period
   * Useful for rate limiting updates
   *
   * @example
   * ```typescript
   * for await (const state of BlocStreams.throttle(mouseBloc, 100)) {
   *   // Emits at most every 100ms
   *   updateMousePosition(state);
   * }
   * ```
   */
  export async function* throttle<S>(
    bloc: BlocBase<S>,
    periodMs: number,
  ): AsyncGenerator<S, void, void> {
    let lastEmitTime = 0;

    for await (const state of bloc.stateStream()) {
      const now = Date.now();
      const timeSinceLastEmit = now - lastEmitTime;

      if (timeSinceLastEmit >= periodMs) {
        lastEmitTime = now;
        yield state;
      } else {
        // Wait for the remaining time
        await new Promise<void>((resolve) =>
          setTimeout(resolve, periodMs - timeSinceLastEmit),
        );

        // Yield the state after waiting
        lastEmitTime = Date.now();
        yield state;
      }
    }
  }

  /**
   * Takes only the first n states from a bloc
   * Useful for limiting iterations
   *
   * @example
   * ```typescript
   * for await (const state of BlocStreams.take(bloc, 5)) {
   *   // Only processes first 5 states
   * }
   * ```
   */
  export async function* take<S>(
    bloc: BlocBase<S>,
    count: number,
  ): AsyncGenerator<S, void, void> {
    if (count <= 0) return;

    let taken = 0;
    const iterator = bloc.stateStream();

    try {
      for await (const state of iterator) {
        yield state;
        taken++;
        if (taken >= count) break;
      }
    } finally {
      // Ensure iterator is closed
      await iterator.return?.();
    }
  }

  /**
   * Skips the first n states from a bloc
   * Useful for ignoring initial states
   *
   * @example
   * ```typescript
   * for await (const state of BlocStreams.skip(bloc, 2)) {
   *   // Skips first 2 states
   * }
   * ```
   */
  export async function* skip<S>(
    bloc: BlocBase<S>,
    count: number,
  ): AsyncGenerator<S, void, void> {
    let skipped = 0;

    for await (const state of bloc.stateStream()) {
      if (skipped < count) {
        skipped++;
        continue;
      }
      yield state;
    }
  }

  /**
   * Maps state values through a transform function
   *
   * @example
   * ```typescript
   * for await (const doubled of BlocStreams.map(
   *   counterBloc,
   *   count => count * 2
   * )) {
   *   console.log('Doubled:', doubled);
   * }
   * ```
   */
  export async function* map<S, T>(
    bloc: BlocBase<S>,
    transform: (state: S) => T,
  ): AsyncGenerator<T, void, void> {
    for await (const state of bloc.stateStream()) {
      yield transform(state);
    }
  }

  /**
   * Filters states based on a predicate
   *
   * @example
   * ```typescript
   * for await (const state of BlocStreams.filter(
   *   counterBloc,
   *   count => count > 0
   * )) {
   *   console.log('Positive count:', state);
   * }
   * ```
   */
  export async function* filter<S>(
    bloc: BlocBase<S>,
    predicate: (state: S) => boolean,
  ): AsyncGenerator<S, void, void> {
    for await (const state of bloc.stateStream()) {
      if (predicate(state)) {
        yield state;
      }
    }
  }

  /**
   * Accumulates state values using a reducer function
   * Similar to Array.reduce but for streams
   *
   * @example
   * ```typescript
   * for await (const sum of BlocStreams.scan(
   *   counterBloc,
   *   (acc, count) => acc + count,
   *   0
   * )) {
   *   console.log('Running total:', sum);
   * }
   * ```
   */
  export async function* scan<S, A>(
    bloc: BlocBase<S>,
    reducer: (accumulator: A, state: S) => A,
    initialValue: A,
  ): AsyncGenerator<A, void, void> {
    let accumulator = initialValue;

    for await (const state of bloc.stateStream()) {
      accumulator = reducer(accumulator, state);
      yield accumulator;
    }
  }
}
