import { BLAC_STATIC_PROPS } from '../constants';

export type BlacOptions =
  | { isolated: true }
  | { keepAlive: true }
  | { excludeFromDevTools: true };

/**
 * Decorator to configure StateContainer classes.
 *
 * @example Decorator syntax (requires experimentalDecorators or TC39 decorators)
 * ```ts
 * @blac({ isolated: true })
 * class FormBloc extends Cubit<FormState> {}
 *
 * @blac({ keepAlive: true })
 * class AuthBloc extends Cubit<AuthState> {}
 *
 * @blac({ excludeFromDevTools: true })
 * class InternalBloc extends Cubit<InternalState> {}
 * ```
 *
 * @example Function syntax (no decorator support needed)
 * ```ts
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
    if ('excludeFromDevTools' in options && options.excludeFromDevTools) {
      (target as any)[BLAC_STATIC_PROPS.EXCLUDE_FROM_DEVTOOLS] = true;
    }
    return target;
  };
}
