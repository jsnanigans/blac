---
"@blac/core": major
---

**BREAKING:** Remove legacy identity/lifecycle/hydration surface from `StateContainer`.

The deprecated delegates introduced in M0 are now gone. `$blac` is the sole
reserved meta namespace; all identity, lifecycle, and hydration state is
accessed through it.

## Migration table

| Removed member | Replacement |
| --- | --- |
| `instance.name` | `instance.$blac.name` |
| `instance.debug` | `instance.$blac.debug` |
| `instance.instanceId` | `instance.$blac.id` |
| `instance.createdAt` | `instance.$blac.createdAt` |
| `instance.isDisposed` | `instance.$blac.disposed` |
| `instance.dependencies` | `instance.$blac.dependencies` |
| `instance.hydrationStatus` | `instance.$blac.hydration.status` |
| `instance.hydrationError` | `instance.$blac.hydration.error` |
| `instance.isHydrated` | `instance.$blac.hydration.isHydrated` |
| `instance.changedWhileHydrating` | `instance.$blac.hydration.changedWhileHydrating` |
| `instance.beginHydration()` | `instance.$blac.hydration.begin()` |
| `instance.applyHydratedState(next)` | `instance.$blac.hydration.apply(next)` |
| `instance.finishHydration()` | `instance.$blac.hydration.finish()` |
| `instance.failHydration(err)` | `instance.$blac.hydration.fail(err)` |
| `instance.waitForHydration()` | `instance.$blac.hydration.wait()` |
| `instance.initConfig(cfg)` | `instance[INIT_CONFIG](cfg)` (framework-only) |

Subclasses may now freely declare `name`, `debug`, `instanceId`, etc. as their
own members without colliding with the reserved surface. The only reserved
instance name is `$blac`; a dev-only warning fires if a subclass shadows it.

Size: 7.57 kB (was 8 kB budget; budget lowered to 7.8 kB).
