import { BLAC_STATIC_PROPS } from '../constants';
import type { EqualityFn } from '../config';

/**
 * Configuration options for the @blac decorator.
 * Only one option can be specified at a time (union type).
 */
export type BlacOptions =
  /** Mark bloc to never be auto-disposed when ref count reaches 0 */
  | { keepAlive: true }
  /** Exclude bloc from DevTools tracking (prevents infinite loops) */
  | { excludeFromDevTools: true }
  /**
   * Override the global equality check for this bloc.
   * Return `true` to skip the emit (states considered equal).
   */
  | { equality: EqualityFn }
  /**
   * Override the default structural-hash identity key.
   * The function receives `args` and returns the instance key string.
   * Distinct return values → distinct instances; identical values → shared instance.
   * Non-identity fields can be excluded so they don't fork new instances.
   */
  | { key: (args: any) => string };

/**
 * Decorator to configure StateContainer classes.
 *
 * @example Decorator syntax (requires experimentalDecorators or TC39 decorators)
 * ```ts
 * @blac({ keepAlive: true })
 * class AuthBloc extends Cubit<AuthState> {}
 *
 * @blac({ excludeFromDevTools: true })
 * class InternalBloc extends Cubit<InternalState> {}
 * ```
 *
 * @example Function syntax (no decorator support needed)
 * ```ts
 * const AuthBloc = blac({ keepAlive: true })(
 *   class extends Cubit<AuthState> {}
 * );
 * ```
 */
export function blac(options: BlacOptions) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    _context?: ClassDecoratorContext,
  ): T {
    if ('keepAlive' in options && options.keepAlive) {
      (target as any)[BLAC_STATIC_PROPS.KEEP_ALIVE] = true;
    }
    if ('excludeFromDevTools' in options && options.excludeFromDevTools) {
      (target as any)[BLAC_STATIC_PROPS.EXCLUDE_FROM_DEVTOOLS] = true;
    }
    if ('equality' in options && typeof options.equality === 'function') {
      (target as any)[BLAC_STATIC_PROPS.EQUALITY] = options.equality;
    }
    if ('key' in options && typeof options.key === 'function') {
      (target as any)[BLAC_STATIC_PROPS.KEY] = options.key;
    }
    return target;
  };
}
