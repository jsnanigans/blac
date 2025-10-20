# Integrated Logging System - Specifications

## Overview
Design and implement a comprehensive, configurable logging system for the BlaC state management library that provides insight into lifecycle, performance, state changes, and subscription behavior across both core (`@blac/core`) and React (`@blac/react`) packages.

## Goals
- Provide detailed, structured logging for debugging, development, and performance profiling
- Support zero-overhead mode when logging is disabled (via dead code elimination)
- Enable fine-grained control over what gets logged (topics, namespaces, levels)
- Enhance developer experience with better console output and DevTools integration
- Maintain backwards compatibility with existing `Blac.enableLog` and `Blac.log()`

## Requirements

### Functional Requirements

#### FR-1: Log Levels
- **error**: Critical failures, exceptions, invalid states
- **warn**: Deprecations, recoverable issues, potential problems
- **log**: General informational messages (replaces current `Blac.log()`)
- Global log level configuration determines minimum level to output
- Default level: `warn` (only errors and warnings shown by default)

#### FR-2: Log Topics
Support independent enable/disable of the following topics:
- **lifecycle**: Bloc creation, disposal, state transitions, registration/unregistration
- **state**: State emissions, state changes, previous/next values
- **subscriptions**: Consumer/observer add/remove, dependency tracking, proxy operations
- **performance**: Optional topic for timing data, memory stats, subscription counts

Each topic can be independently enabled/disabled regardless of log level.

#### FR-3: Namespace Filtering
- Support filtering logs by bloc name or pattern
- Examples:
  - `"CounterBloc"` - exact match
  - `"Counter*"` - wildcard pattern
  - `["UserBloc", "AuthBloc"]` - multiple blocs
  - `"*"` - all blocs (default)

#### FR-4: Configuration API
Extend `Blac.setConfig()` with logging configuration:

```typescript
Blac.setConfig({
  logging: {
    level: 'log' | 'warn' | 'error' | false,  // false = disabled
    topics: ['lifecycle', 'state', 'subscriptions', 'performance'] | 'all',
    namespaces: string | string[],  // bloc name filter
    timestamp: boolean,              // include timestamps (default: true)
    stackTrace: boolean,            // capture stacks for error/warn (default: true)
    blocIdentity: boolean,          // include name/id/uid (default: true)
  }
});
```

Runtime API for dynamic changes:
```typescript
Blac.logging.setLevel('log');
Blac.logging.enableTopic('lifecycle');
Blac.logging.disableTopic('state');
Blac.logging.setNamespaces(['CounterBloc', 'UserBloc']);
```

#### FR-5: Log Entry Context
Each log entry should include (when enabled):
- **Bloc identity**: `[BlocName:id:uid]` prefix
- **Timestamp**: High-resolution timestamp (performance.now() or Date.now())
- **Topic badge**: Visual indicator of topic (e.g., `[lifecycle]`, `[state]`)
- **Stack trace**: For error/warn levels only, captured via `Error().stack`

#### FR-6: Output Format
- **Console output**: Enhanced formatting with:
  - Grouping related logs (e.g., console.group for bloc lifecycle)
  - Color coding by level (error=red, warn=yellow, log=default)
  - Structured messages with clear hierarchy
- **DevTools integration**:
  - Use `console.time()`/`console.timeEnd()` for performance tracking
  - Use `performance.mark()` and `performance.measure()` for timing
  - Support console groups for nested operations

#### FR-7: Zero-Overhead Mode
- When logging is disabled (`level: false`), all logging code should be eliminated
- Use conditional compilation or dead code elimination techniques
- Implement via:
  - Compile-time flag: `__BLAC_LOGGING_ENABLED__`
  - Webpack DefinePlugin / Vite define
  - Tree-shaking friendly code structure

#### FR-8: Backwards Compatibility
- Maintain existing `Blac.enableLog` static property (deprecated but functional)
- Maintain existing `Blac.log()` method behavior
- Migrate internal uses of `log()` to new system
- Provide migration guide for users

### Non-Functional Requirements

#### NFR-1: Performance
- Logging checks should be O(1) boolean operations
- No string formatting or object serialization when topic/namespace is disabled
- Lazy evaluation of log arguments (use functions/getters when needed)
- Zero overhead when logging is completely disabled

#### NFR-2: Type Safety
- Full TypeScript type definitions for configuration
- Type-safe topic names (string literal union)
- Type-safe log level names

#### NFR-3: Developer Experience
- Clear, readable log output with visual hierarchy
- Easy to filter logs in browser DevTools
- Helpful error messages when misconfigured
- Autocomplete support for configuration options

#### NFR-4: Maintainability
- Centralized logging logic in dedicated module
- Easy to add new topics in the future
- Consistent logging patterns across codebase
- Clear documentation and examples

## Success Criteria

1. ✅ All core lifecycle events are logged (creation, disposal, state changes)
2. ✅ Subscription operations are traceable (add/remove consumers/observers)
3. ✅ React hook operations are logged (mount, unmount, re-renders)
4. ✅ Logs can be filtered by topic, namespace, and level
5. ✅ Zero performance overhead when logging is disabled
6. ✅ Logs include sufficient context for debugging (bloc identity, timestamps)
7. ✅ Console output is well-formatted and easy to read
8. ✅ Existing `Blac.enableLog` behavior is preserved
9. ✅ Documentation and examples are provided
10. ✅ Unit tests validate logging behavior

## Out of Scope

- Custom log handlers/transports (future enhancement)
- Structured JSON output (future enhancement)
- Per-instance logging configuration (future enhancement)
- Log sampling/throttling (future enhancement)
- Integration with external logging services (future enhancement)
- Performance metrics topic (optional, can be added later)

## Constraints

- Must work in both Node.js and browser environments
- Must not break existing tests or functionality
- Must integrate with existing Blac architecture
- Should follow project code conventions (arrow functions, TypeScript strict mode)

## Risks & Mitigations

### Risk: Performance Impact
**Mitigation**: Implement zero-overhead mode, use lazy evaluation, benchmark critical paths

### Risk: Log Noise
**Mitigation**: Sensible defaults (warn level, no topics enabled), easy filtering

### Risk: Breaking Changes
**Mitigation**: Maintain backwards compatibility, deprecate old API gradually

### Risk: Complex Configuration
**Mitigation**: Simple defaults, clear examples, good TypeScript autocomplete

## Dependencies

- Existing Blac core architecture (BlocBase, Blac singleton)
- React integration (useBloc hook, BlacAdapter)
- Plugin system (optional integration for logging plugins)

## Timeline Estimate

- Design & Specification: ✅ Complete
- Implementation (Core): ~4-6 hours
- Implementation (React): ~2-3 hours
- Testing: ~2-3 hours
- Documentation: ~1-2 hours
- Total: ~9-14 hours
