/**
 * @internal @deprecated Symbol-keyed mutation entry point on `StateContainer`.
 *
 * Per A2 audit (`plans/blac-core-migration/_audit.md`), this symbol has zero
 * external consumers — only in-package tests still reference it. C0 keeps it
 * as a thin alias for `emit()` so the existing test files typecheck and run
 * unchanged; C5 will port those tests to use `emit()` directly and delete
 * this symbol along with its `[EMIT]` method on `StateContainer`.
 *
 * Do not add new uses of this symbol.
 */
export const EMIT = Symbol('blac.emit');

/**
 * @internal Apply one owner's (consumer's) deps slice to an instance.
 * Called by framework adapters (e.g. @blac/react useBloc) — not public API.
 *
 * Kept until D0 ports `useBloc` off the legacy adapter surface. See A2 audit
 * (`plans/blac-core-migration/_audit.md`) for the consumer list.
 */
export const APPLY_DEPS = Symbol('blac.applyDeps');

/**
 * @internal Withdraw one owner's entire deps slice (consumer unmounted).
 * Called by framework adapters — not public API.
 *
 * Kept until D0 ports `useBloc`. See A2 audit for the consumer list.
 */
export const REMOVE_DEPS_OWNER = Symbol('blac.removeDepsOwner');

/**
 * @internal Symbol-keyed configuration entry point on `StateContainer`.
 * Carries the body that used to live in the public `initConfig(config)`
 * method: writes the instance's identity fields (`_name`/`_debug`/
 * `_instanceId`), resolves per-class equality, emits the registry `created`
 * event, and runs `init()` once.
 *
 * Framework-only — the registry (`StateContainerRegistry.ensure`) and testing
 * helpers are the sole callers, mirroring the `APPLY_DEPS` precedent. The
 * legacy public `initConfig()` is kept as a deprecated delegate until M5.
 *
 * Do not add new uses of the public `initConfig()`; call `[INIT_CONFIG]`.
 */
export const INIT_CONFIG = Symbol('blac.initConfig');
