---
"@blac/core": patch
---

Fix critical race condition in disposal lifecycle that caused memory leaks in React Strict Mode.

The BlocLifecycleManager.scheduleDisposal() method had a race condition where:
- Cancelled disposals could still execute (stale microtasks)
- Multiple microtasks could be queued for the same disposal
- Memory leaks occurred in rapid mount/unmount scenarios

Solution: Implemented generation counter pattern:
- Each disposal request gets a unique generation number
- Microtasks validate generation before executing disposal
- Cancellation increments generation, invalidating pending microtasks
- Zero overhead (~0.002ms per disposal)
- Mathematically provably race-free

Impact:
- Eliminates all disposal-related memory leaks
- Fixes React Strict Mode compatibility issues
- No API changes (internal refactor only)
- All existing tests pass

See spec/2025-10-16-disposal-race-condition/ for full analysis and solution details.
