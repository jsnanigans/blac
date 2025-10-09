import { Blac } from './Blac';
import { BlocBase } from './BlocBase';
import { BlocLifecycleState } from './lifecycle/BlocLifecycle';

/**
 * A Cubit is a simpler version of a Bloc that doesn't handle events.
 * It manages state and provides methods to update it.
 * @template S - The type of state this Cubit manages
 */
export abstract class Cubit<S> extends BlocBase<S> {
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
   * Override _pushState to cancel disposal when emit() is called on a Cubit.
   * This allows error recovery code to reset Cubit state and keep it alive.
   * Blocs don't cancel disposal to avoid keeping blocs alive during event processing.
   */
  _pushState(newState: S, oldState: S, action?: unknown): void {
    const currentState = (this as any)._lifecycleManager.currentState;

    // If cubit is in DISPOSAL_REQUESTED and emit() is being called,
    // cancel the disposal - clearly someone still needs this cubit
    if (currentState === BlocLifecycleState.DISPOSAL_REQUESTED) {
      this._cancelDisposalIfRequested();
    }

    // Call parent implementation
    super._pushState(newState, oldState, action);
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
    if (typeof this.state !== 'object' || this.state === null) {
      Blac.warn(
        'Cubit.patch: was called on a cubit where the state is not an object. This is a no-op.',
      );
      return;
    }

    let changes = false;
    if (!ignoreChangeCheck) {
      for (const key in statePatch) {
        if (Object.prototype.hasOwnProperty.call(statePatch, key)) {
          const s = this.state;
          const current = s[key as keyof S];
          if (!Object.is(statePatch[key as keyof S], current)) {
            changes = true;
            break;
          }
        }
      }
    } else {
      changes = true;
    }

    if (changes) {
      this.emit({
        ...this.state,
        ...(statePatch as Partial<S>),
      } as S);
    }
  }
}
