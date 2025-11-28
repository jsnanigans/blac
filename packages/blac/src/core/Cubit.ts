import { StateContainer } from './StateContainer';

/**
 * Simple state container with direct state emission.
 * Extends StateContainer with public methods for emitting and updating state.
 *
 * @template S - State type
 * @template P - Props type (optional)
 */
export abstract class Cubit<S, P = undefined> extends StateContainer<S, P> {
  constructor(initialState: S) {
    super(initialState);
  }

  /**
   * Replace state with a new value and notify all listeners
   * @param newState - The new state value
   */
  public emit(newState: S): void {
    super['emit'](newState);
  }

  /**
   * Transform current state using an updater function and emit the new state
   * @param updater - Function that receives current state and returns new state
   */
  public update(updater: (current: S) => S): void {
    super['update'](updater);
  }

  /**
   * Merge partial state changes into current state (only for object states)
   */
  public patch = ((partial: S extends object ? Partial<S> : never): void => {
    if (typeof this.state !== 'object' || this.state === null) {
      throw new Error('patch() is only available for object state types');
    }
    this.update((current) => ({ ...current, ...partial }) as S);
  }) as S extends object ? (partial: Partial<S>) => void : never;
}
