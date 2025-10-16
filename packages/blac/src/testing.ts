import { Bloc } from './Bloc';
import { BlocBase } from './BlocBase';
import { BlocEventConstraint } from './types';

// Export test utilities
export { InstanceTracker } from './__tests__/utils/InstanceTracker';

/**
 * Test utilities for Blac state management
 *
 * @deprecated Use Blac methods directly instead:
 * - Blac.resetInstance() for test setup
 * - Blac.getBloc() to create/get bloc instances
 * - bloc.subscribe() for state monitoring
 *
 * Example:
 * ```typescript
 * beforeEach(() => {
 *   Blac.resetInstance();
 *   Blac.enableLog = false;
 * });
 *
 * it('should test bloc', () => {
 *   const bloc = Blac.getBloc(MyBloc);
 *   // test logic
 * });
 * ```
 */

/**
 * Waits for a bloc to emit a specific state
 */
export async function waitForState<T extends BlocBase<S>, S>(
  bloc: T,
  predicate: (state: S) => boolean,
  timeout = 5000,
): Promise<S> {
  return new Promise<S>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(
        new Error(
          `Timeout waiting for state matching predicate after ${timeout}ms`,
        ),
      );
    }, timeout);

    const { unsubscribe } = bloc.subscribe((newState: S) => {
      if (predicate(newState)) {
        clearTimeout(timeoutId);
        unsubscribe();
        resolve(newState);
      }
    });

    // Check current state immediately
    if (predicate(bloc.state)) {
      clearTimeout(timeoutId);
      unsubscribe();
      resolve(bloc.state);
    }
  });
}

/**
 * Waits for a bloc to emit a specific event
 */
export async function waitForEvent<
  T extends Bloc<any, E>,
  E extends BlocEventConstraint,
>(bloc: T, eventType: new (...args: any[]) => E, timeout = 5000): Promise<E> {
  return new Promise<E>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(
        new Error(
          `Timeout waiting for event ${eventType.name} after ${timeout}ms`,
        ),
      );
    }, timeout);

    const originalAdd = bloc.add.bind(bloc);
    bloc.add = (event: E) => {
      if (event instanceof eventType) {
        clearTimeout(timeoutId);
        bloc.add = originalAdd;
        resolve(event);
      }
      return originalAdd(event);
    };
  });
}
