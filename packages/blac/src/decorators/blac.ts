import { BLAC_STATIC_PROPS } from '../constants';

export type BlacOptions = { isolated: true } | { keepAlive: true };

/**
 * Decorator to configure StateContainer classes.
 *
 * @example Decorator syntax (requires experimentalDecorators or TC39 decorators)
 * ```typescript
 * @blac({ isolated: true })
 * class FormBloc extends Cubit<FormState> {}
 *
 * @blac({ keepAlive: true })
 * class AuthBloc extends Cubit<AuthState> {}
 * ```
 *
 * @example Function syntax (no decorator support needed)
 * ```typescript
 * const FormBloc = blac({ isolated: true })(
 *   class extends Cubit<FormState> {}
 * );
 * ```
 */
export function blac(options: BlacOptions) {
  return function <T extends new (...args: any[]) => any>(
    target: T,
    _context?: ClassDecoratorContext,
  ): T {
    if ('isolated' in options && options.isolated) {
      (target as any)[BLAC_STATIC_PROPS.ISOLATED] = true;
    }
    if ('keepAlive' in options && options.keepAlive) {
      (target as any)[BLAC_STATIC_PROPS.KEEP_ALIVE] = true;
    }
    return target;
  };
}
