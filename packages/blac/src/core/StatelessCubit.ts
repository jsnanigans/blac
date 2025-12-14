import { Cubit } from './Cubit';

/**
 * Empty state type used internally by stateless containers.
 * Using `Record<never, never>` ensures the state object has no accessible properties.
 * @internal
 */
type EmptyState = Record<never, never>;

/**
 * Marker symbol to identify stateless containers at the type level.
 * Used by React hooks to prevent `useBloc` from accepting stateless containers.
 */
export const STATELESS_MARKER = Symbol('STATELESS_CONTAINER');

/**
 * A Cubit without state management capabilities.
 * Use this for action-only containers that don't need to manage or emit state.
 *
 * StatelessCubit:
 * - Has no `emit()`, `update()`, or `patch()` methods
 * - Has no accessible `state` property
 * - Cannot be subscribed to (throws error)
 * - Is rejected by `useBloc` hook (use `useBlocActions` instead)
 *
 * @template P - Props type (optional)
 *
 * @example
 * ```typescript
 * class AnalyticsService extends StatelessCubit {
 *   trackPageView(page: string) {
 *     analytics.track('page_view', { page });
 *   }
 *
 *   trackClick(element: string) {
 *     analytics.track('click', { element });
 *   }
 * }
 *
 * // In React component:
 * const analytics = useBlocActions(AnalyticsService);
 * analytics.trackPageView('/home');
 * ```
 */
export abstract class StatelessCubit<P = undefined> extends Cubit<
  EmptyState,
  P
> {
  /**
   * Marker property to identify stateless containers.
   * @internal
   */
  static readonly [STATELESS_MARKER] = true as const;

  constructor() {
    super({});
  }

  /**
   * State is not available on StatelessCubit.
   * @throws Always throws an error when accessed.
   */
  override get state(): never {
    throw new Error(
      `${this.name} is a StatelessCubit and does not have state. ` +
        'Use a regular Cubit if you need state management.',
    );
  }

  /**
   * Subscriptions are not available on StatelessCubit.
   * @throws Always throws an error when called.
   */
  override subscribe(_listener: (state: EmptyState) => void): never {
    throw new Error(
      `${this.name} is a StatelessCubit and does not support subscriptions. ` +
        'Use useBlocActions() instead of useBloc() in React.',
    );
  }

  /**
   * emit() is not available on StatelessCubit.
   * TypeScript will show an error if you try to call this method.
   */
  public override emit(_newState: never): never {
    throw new Error(
      `${this.name} is a StatelessCubit and does not support emit(). ` +
        'Use a regular Cubit if you need state management.',
    );
  }

  /**
   * update() is not available on StatelessCubit.
   * TypeScript will show an error if you try to call this method.
   */
  public override update(_updater: never): never {
    throw new Error(
      `${this.name} is a StatelessCubit and does not support update(). ` +
        'Use a regular Cubit if you need state management.',
    );
  }

  /**
   * patch() is not available on StatelessCubit.
   * TypeScript will show an error if you try to call this method.
   */
  public override patch: (partial: never) => never = () => {
    throw new Error(
      `${this.name} is a StatelessCubit and does not support patch(). ` +
        'Use a regular Cubit if you need state management.',
    );
  };
}
