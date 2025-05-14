import { BlocBase } from './BlocBase';

/**
 * A Cubit is a simpler version of a Bloc that doesn't handle events.
 * It manages state and provides methods to update it.
 * @template S - The type of state this Cubit manages
 * @template P - The type of parameters (optional, defaults to null)
 */
export abstract class Cubit<S, P = null> extends BlocBase<S, P> {
  /**
   * Updates the current state and notifies all observers of the change.
   * If the new state is identical to the current state (using Object.is),
   * no update will occur.
   * @param state - The new state to set
   */
  emit(state: S): void {
    if (Object.is(state, this.state)) {
      return;
    }

    const oldState = this.state;
    const newState = state;
    this._pushState(newState, oldState);
  }

  /**
   * Partially updates the current state by merging it with the provided state patch.
   * This method is only applicable when the state is an object type.
   * 
   * @param statePatch - A partial state object containing only the properties to update
   * @param ignoreChangeCheck - If true, skips checking if the state has actually changed
   * @throws {TypeError} If the state is not an object type
   */
  patch(
    statePatch: S extends object ? Partial<S> : S,
    ignoreChangeCheck = false,
  ): void {
    let changes = false;
    if (!ignoreChangeCheck) {
      for (const key in statePatch) {
        const current = (this.state as any)[key];
        if (!Object.is(statePatch[key], current)) {
          changes = true;
          break;
        }
      }
    }

    if (changes) {
      this.emit({ ...this.state, ...statePatch });
    }
  }
}
