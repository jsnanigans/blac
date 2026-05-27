export const EMIT = Symbol('blac.emit');

/**
 * @internal Apply one owner's (consumer's) deps slice to an instance.
 * Called by framework adapters (e.g. @blac/react useBloc) — not public API.
 */
export const APPLY_DEPS = Symbol('blac.applyDeps');

/**
 * @internal Withdraw one owner's entire deps slice (consumer unmounted).
 * Called by framework adapters — not public API.
 */
export const REMOVE_DEPS_OWNER = Symbol('blac.removeDepsOwner');
