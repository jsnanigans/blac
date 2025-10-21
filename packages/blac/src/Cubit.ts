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
   *
   * Use this for internal state transitions. For external/untrusted data,
   * use emitValidated() instead.
   *
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
   * Updates the current state with schema validation and notifies all observers.
   * Use this when emitting external/untrusted data (API responses, user input, localStorage).
   *
   * @param state - The new state to validate and set
   * @throws {BlocValidationError} If validation fails
   * @throws {Error} If no schema defined
   *
   * @example
   * ```typescript
   * loadFromAPI = async () => {
   *   const data = await fetch('/api/users').then(r => r.json());
   *   this.emitValidated(data); // Validates before emitting
   * };
   * ```
   */
  emitValidated(state: S): void {
    if (Object.is(state, this.state)) {
      return;
    }

    // Call protected method from BlocBase
    super.emitValidated(state);
  }

  /**
   * Partially updates the current state by merging it with the provided state patch.
   * This method is only applicable when the state is an object type.
   *
   * Use this for internal state transitions. For external/untrusted data,
   * use patchValidated() instead.
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

  /**
   * Partially updates the current state with schema validation.
   * Use this when patching with external/untrusted data (form submissions, partial API updates).
   *
   * @param statePatch - A partial state object to validate and merge
   * @param ignoreChangeCheck - If true, skips checking if the state has actually changed
   * @throws {BlocValidationError} If validation fails
   * @throws {Error} If no schema defined or state is not an object
   *
   * @example
   * ```typescript
   * updateProfile = (formData: Partial<User>) => {
   *   this.patchValidated(formData); // Validates merged state
   * };
   * ```
   */
  patchValidated(
    statePatch: S extends object ? Partial<S> : S,
    ignoreChangeCheck = false,
  ): void {
    if (typeof this.state !== 'object' || this.state === null) {
      Blac.warn(
        'Cubit.patchValidated: was called on a cubit where the state is not an object. This is a no-op.',
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
      this.emitValidated({
        ...this.state,
        ...(statePatch as Partial<S>),
      } as S);
    }
  }
}
