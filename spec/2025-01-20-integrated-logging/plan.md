# Integrated Logging System - Implementation Plan

## Overview

This plan implements **Option 2: Dedicated Logger Module** with structured logging, topic/namespace filtering, zero-overhead capabilities, and backwards compatibility.

**Estimated Total Time**: 11-12 hours
**Target Packages**: `@blac/core`, `@blac/react`

---

## Phase 1: Core Logging Infrastructure

**Goal**: Create the foundational logging module with configuration, filtering, and formatting.

**Estimated Time**: 3-4 hours

### Tasks

- [ ] **1.1** Create logging module directory structure #P #S:s
  - Create `packages/blac/src/logging/` directory
  - Create placeholder files: `Logger.ts`, `types.ts`, `LogConfig.ts`, `LogLevel.ts`, `LogTopic.ts`, `LogFormatter.ts`, `index.ts`
  - Update `packages/blac/src/index.ts` to export logging types

- [ ] **1.2** Define TypeScript types and interfaces #P #S:s
  - File: `packages/blac/src/logging/types.ts`
  - Define `LogLevel` type: `'error' | 'warn' | 'log'`
  - Define `LogTopic` type: `'lifecycle' | 'state' | 'subscriptions' | 'performance'`
  - Define `LogEntry` interface with all required fields
  - Define `LogConfig` interface for configuration options
  - Add JSDoc documentation for all types

- [ ] **1.3** Implement LogConfig module with defaults #P #S:m
  - File: `packages/blac/src/logging/LogConfig.ts`
  - Create `defaultLogConfig` constant
  - Implement `validateLogConfig()` function with BlacError handling
  - Implement `mergeLogConfig()` for partial updates
  - Add config validation rules (invalid levels, topics, patterns)
  - Export config utilities

- [ ] **1.4** Implement LogLevel utilities #P #S:s
  - File: `packages/blac/src/logging/LogLevel.ts`
  - Create `logLevelPriority` map: `{ error: 0, warn: 1, log: 2 }`
  - Implement `isLevelEnabled(current: LogLevel, threshold: LogLevel): boolean`
  - Implement `parseLogLevel(value: string | boolean): LogLevel | false`
  - Add level validation and error handling

- [ ] **1.5** Implement LogTopic utilities #P #S:s
  - File: `packages/blac/src/logging/LogTopic.ts`
  - Implement `isTopicEnabled(topic: LogTopic, enabled: LogTopic[] | 'all'): boolean`
  - Implement `parseTopics(value: string | string[]): LogTopic[]`
  - Add topic validation and error handling

- [ ] **1.6** Implement namespace filtering logic #S:m
  - File: `packages/blac/src/logging/LogConfig.ts`
  - Implement `matchesNamespace(blocName: string, pattern: string): boolean`
  - Support wildcard patterns: `"Counter*"`, `"*Bloc"`, `"*"`
  - Support exact match: `"CounterBloc"`
  - Support array of patterns: `["CounterBloc", "UserBloc"]`
  - Add namespace validation

- [ ] **1.7** Implement LogFormatter for console output #S:m
  - File: `packages/blac/src/logging/LogFormatter.ts`
  - Implement `formatLogEntry(entry: LogEntry, config: LogConfig): string`
  - Format: `[timestamp] [namespace:id:uid] [topic] message`
  - Add conditional parts based on config (timestamp, blocIdentity)
  - Implement `formatContext(context: unknown): string` for structured data
  - Add color codes for browser console (level-based)

- [ ] **1.8** Implement core Logger class #S:l
  - File: `packages/blac/src/logging/Logger.ts`
  - Create singleton Logger class with private constructor
  - Implement `getInstance(): Logger` static method
  - Add `private config: LogConfig` property
  - Implement `configure(config: Partial<LogConfig>): void` method
  - Implement `log(entry: LogEntry): void` method with filtering
  - Implement `private shouldLog(entry: LogEntry): boolean` with fast checks
  - Implement `private output(level: LogLevel, message: string, context?: unknown): void`
  - Add console method mapping (error → console.error, warn → console.warn, log → console.log)

- [ ] **1.9** Add runtime configuration API methods #S:m
  - File: `packages/blac/src/logging/Logger.ts`
  - Implement `setLevel(level: LogLevel | false): void`
  - Implement `getLevel(): LogLevel | false`
  - Implement `enableTopic(topic: LogTopic): void`
  - Implement `disableTopic(topic: LogTopic): void`
  - Implement `setNamespaces(patterns: string | string[]): void`
  - Implement `getConfig(): Readonly<LogConfig>`
  - Implement `reset(): void` to restore defaults

- [ ] **1.10** Create public API exports #P #S:s
  - File: `packages/blac/src/logging/index.ts`
  - Export Logger singleton instance as `logger`
  - Export all types: `LogLevel`, `LogTopic`, `LogEntry`, `LogConfig`
  - Export utilities if needed
  - Add module-level JSDoc documentation

- [ ] **1.11** Add build-time flag support #S:m
  - Add global type declaration: `declare const __BLAC_LOGGING__: boolean`
  - File: `packages/blac/src/global.d.ts` (create if needed)
  - Update build configs (Webpack/Vite/Rollup examples in docs)
  - Add build flag checks in Logger: `if (!__BLAC_LOGGING__) return;`

---

## Phase 2: Blac Integration & Configuration

**Goal**: Integrate logging with Blac singleton, configuration API, and backwards compatibility.

**Estimated Time**: 2-3 hours

### Tasks

- [ ] **2.1** Extend BlacConfig interface with logging options #P #S:s
  - File: `packages/blac/src/Blac.ts`
  - Add `logging?: Partial<LogConfig>` to `BlacConfig` interface
  - Update JSDoc documentation for BlacConfig

- [ ] **2.2** Integrate Logger configuration in Blac.setConfig() #S:m
  - File: `packages/blac/src/Blac.ts:161-212` (setConfig method)
  - Import `logger` from `./logging`
  - Add configuration branch: `if (config.logging) { logger.configure(config.logging); }`
  - Add validation for logging config
  - Update existing log message when config changes

- [ ] **2.3** Add static Blac.logging API #S:m
  - File: `packages/blac/src/Blac.ts`
  - Add static property `logging` with runtime API methods
  - Delegate to Logger instance: `setLevel`, `enableTopic`, `disableTopic`, `setNamespaces`, `reset`
  - Add JSDoc documentation for all methods
  - Example: `static logging = { setLevel: (level) => logger.setLevel(level), ... }`

- [ ] **2.4** Maintain backwards compatibility with Blac.enableLog #S:m
  - File: `packages/blac/src/Blac.ts:282-330`
  - Keep `static enableLog = false` property
  - Add setter/getter that maps to new logging system
  - When `enableLog = true`, set `logger.setLevel('log')`
  - When `enableLog = false`, set `logger.setLevel(false)`
  - Add deprecation warning in dev mode (if `__BLAC_LOGGING__`)

- [ ] **2.5** Maintain backwards compatibility with logSpy #S:m
  - File: `packages/blac/src/Blac.ts:284`
  - Keep `static logSpy` property
  - Update Logger to call logSpy when set
  - Update `Logger.output()` to: `if (Blac.logSpy) Blac.logSpy([level, message, context]);`
  - Ensure existing tests continue to work

- [ ] **2.6** Update existing log/warn/error methods #S:s
  - File: `packages/blac/src/Blac.ts:290-330`
  - Update `log()` to use new logger (or keep as deprecated wrapper)
  - Keep `warn()` as-is (always outputs)
  - Update `error()` to respect new logging config
  - Add deprecation notices in JSDoc

---

## Phase 3: Core Package Instrumentation

**Goal**: Add logging to all critical code paths in `@blac/core`.

**Estimated Time**: 3-4 hours

### 3A: Lifecycle Logging

- [ ] **3.1** Add logging to Blac instance management #S:m
  - File: `packages/blac/src/Blac.ts:336-377` (resetInstance)
  - Add log entry when resetInstance() is called
  - Log count of disposed blocs
  - Topic: `lifecycle`, Level: `log`

- [ ] **3.2** Add logging to bloc creation #S:m
  - File: `packages/blac/src/Blac.ts:699-725` (createNewBlocInstance)
  - Add log entry when new bloc is created
  - Include: bloc name, id, uid, isolated status, constructor params (if present)
  - Topic: `lifecycle`, Level: `log`
  - Context: `{ id, uid, isolated, params }`

- [ ] **3.3** Add logging to bloc disposal #S:m
  - File: `packages/blac/src/Blac.ts:383-433` (disposeBloc)
  - Add log entry when disposal starts
  - Log disposal state transitions
  - Log when bloc is removed from registries
  - Topic: `lifecycle`, Level: `log`
  - Context: `{ disposalState, keepAlive, isolated }`

- [ ] **3.4** Add logging to bloc registration/unregistration #P #S:m
  - File: `packages/blac/src/Blac.ts:493-504` (registerBlocInstance)
  - File: `packages/blac/src/Blac.ts:533-584` (registerIsolatedBlocInstance)
  - File: `packages/blac/src/Blac.ts:478-487` (unregisterBlocInstance)
  - File: `packages/blac/src/Blac.ts:590-644` (unregisterIsolatedBlocInstance)
  - Log registration/unregistration with bloc identity
  - Topic: `lifecycle`, Level: `log`

- [ ] **3.5** Add logging to BlocBase lifecycle #S:m
  - File: `packages/blac/src/BlocBase.ts:637-706` (dispose method)
  - Log disposal lifecycle states: ACTIVE → DISPOSAL_REQUESTED → DISPOSING → DISPOSED
  - Log plugin disposal notifications
  - Topic: `lifecycle`, Level: `log`
  - Context: `{ state: disposalState }`

### 3B: State Change Logging

- [ ] **3.6** Add logging to Cubit.emit() #S:m
  - File: `packages/blac/src/BlocBase.ts:301-360` (emit method in Cubit)
  - Log state emission with previous/next values
  - Log subscriber notification count
  - Topic: `state`, Level: `log`
  - Context: `{ previous: previousState, next: newState, subscribers: count }`

- [ ] **3.7** Add logging to plugin state transformations #S:s
  - File: `packages/blac/src/BlocBase.ts:320-330` (plugin.onStateChange)
  - Log when plugins transform state
  - Topic: `state`, Level: `log`
  - Context: `{ original, transformed, plugin: plugin.name }`

- [ ] **3.8** Add logging to Bloc event handling #S:m
  - File: `packages/blac/src/BlocBase.ts` (Bloc event handling)
  - Log when events are added to queue
  - Log when event handlers are invoked
  - Topic: `lifecycle`, Level: `log`
  - Context: `{ event: event.constructor.name }`

### 3C: Subscription Logging

- [ ] **3.9** Add logging to observer subscription #S:m
  - File: `packages/blac/src/subscription/SubscriptionManager.ts:51-94` (subscribe method)
  - Log when observers are added
  - Log subscription ID and selector info
  - Topic: `subscriptions`, Level: `log`
  - Context: `{ subscriptionId, hasSelector, observerCount }`

- [ ] **3.10** Add logging to observer unsubscription #S:m
  - File: `packages/blac/src/subscription/SubscriptionManager.ts:96-124` (unsubscribe method)
  - Log when observers are removed
  - Log remaining observer count
  - Topic: `subscriptions`, Level: `log`
  - Context: `{ subscriptionId, remainingObservers }`

- [ ] **3.11** Add logging to notification cycles #S:l
  - File: `packages/blac/src/subscription/SubscriptionManager.ts:141-210` (notify method)
  - **CRITICAL PATH** - Use careful logging here
  - Log notification start/end (use console groups)
  - Log selector evaluation results
  - Log equality check results (when values don't change)
  - Log observer notification count
  - Topic: `subscriptions`, Level: `log`
  - Add performance timing (console.time/timeEnd)
  - Context: `{ notifiedCount, skippedCount, duration }`

- [ ] **3.12** Add logging to consumer tracking #S:m
  - File: `packages/blac/src/subscription/ConsumerTracker.ts`
  - Log when consumers are added (WeakRef)
  - Log when consumers are removed
  - Log WeakRef cleanup operations (garbage collection)
  - Topic: `subscriptions`, Level: `log`
  - Context: `{ consumerCount, cleanedUp }`

### 3D: Proxy & Dependency Tracking

- [ ] **3.13** Add logging to ProxyFactory operations #S:m
  - File: `packages/blac/src/proxy/ProxyFactory.ts`
  - Log proxy creation
  - Log cache hits/misses
  - Log cache size/limits
  - Topic: `subscriptions`, Level: `log`
  - Context: `{ cacheSize, cacheHits, cacheMisses }`

- [ ] **3.14** Add logging to BlacAdapter mode changes #S:s
  - File: `packages/blac/src/BlacAdapter.ts`
  - Log when adapter switches between modes (proxy vs manual)
  - Log dependency tracking enablement
  - Topic: `subscriptions`, Level: `log`

---

## Phase 4: React Package Instrumentation

**Goal**: Add logging to React integration (`@blac/react`).

**Estimated Time**: 2-3 hours

### Tasks

- [ ] **4.1** Add logging to useBloc hook lifecycle #S:m
  - File: `packages/blac-react/src/hooks/useBloc.ts`
  - Log hook mount (first call)
  - Log hook unmount (cleanup)
  - Log hook updates (deps change, force update)
  - Topic: `lifecycle`, Level: `log`
  - Context: `{ blocName, blocId, phase: 'mount' | 'update' | 'unmount' }`

- [ ] **4.2** Add logging to dependency array changes #S:m
  - File: `packages/blac-react/src/hooks/useBloc.ts`
  - Log when selector returns different dependencies
  - Log previous vs new dependencies
  - Topic: `subscriptions`, Level: `log`
  - Context: `{ previous: prevDeps, next: newDeps }`

- [ ] **4.3** Add logging to BlacAdapter lifecycle #S:m
  - File: `packages/blac-react/src/BlacAdapter.ts`
  - Log adapter creation
  - Log adapter disposal
  - Log subscription management
  - Topic: `lifecycle`, Level: `log`
  - Context: `{ adapterId, blocName, blocId }`

- [ ] **4.4** Add logging to BlacAdapter notifications #S:m
  - File: `packages/blac-react/src/BlacAdapter.ts`
  - Log when adapter notifies React component
  - Log force update calls
  - Topic: `subscriptions`, Level: `log`
  - Context: `{ reason: 'state_change' | 'dependency_change' }`

- [ ] **4.5** Add logging to dependency tracking operations #S:m
  - File: `packages/blac-react/src/BlacAdapter.ts`
  - Log dependency tracking start/stop
  - Log tracked properties
  - Topic: `subscriptions`, Level: `log`
  - Context: `{ trackedProps: string[] }`

---

## Phase 5: DevTools Integration & Polish

**Goal**: Add enhanced console output, performance timing, and polish.

**Estimated Time**: 2-3 hours

### Tasks

- [ ] **5.1** Add console.group support for related operations #S:m
  - File: `packages/blac/src/logging/LogFormatter.ts`
  - Implement `startGroup(label: string): void` and `endGroup(): void`
  - Use groups for: bloc creation, disposal, notification cycles
  - Add `groupLevel` tracking (don't nest too deep)

- [ ] **5.2** Add performance timing with console.time() #S:m
  - File: `packages/blac/src/logging/Logger.ts`
  - Implement `time(label: string): void` and `timeEnd(label: string): void`
  - Use for: state change duration, notification duration
  - Store active timers in Map to track

- [ ] **5.3** Add performance marks for browser profiling #S:m
  - File: `packages/blac/src/logging/Logger.ts`
  - Implement `mark(name: string): void` and `measure(name: string, start: string, end: string): void`
  - Use `performance.mark()` and `performance.measure()` APIs
  - Mark key events: state_change_start, state_change_end, notification_start, notification_end

- [ ] **5.4** Add color coding for console output #S:s
  - File: `packages/blac/src/logging/LogFormatter.ts`
  - Define color styles for levels: error (red), warn (yellow/orange), log (blue/default)
  - Define background colors for topics: lifecycle (green), state (blue), subscriptions (purple)
  - Use `console.log('%c[topic]', style, message)` pattern
  - Detect browser vs Node.js (no colors in Node by default)

- [ ] **5.5** Add stack trace capture for error/warn levels #S:m
  - File: `packages/blac/src/logging/Logger.ts`
  - Capture `new Error().stack` when level is error or warn
  - Parse stack trace to remove logger internal frames
  - Add to log entry context
  - Make configurable via `config.stackTrace`

- [ ] **5.6** Add helper for context sanitization #S:s
  - File: `packages/blac/src/logging/LogFormatter.ts`
  - Implement `sanitizeContext(context: unknown): unknown`
  - Prevent logging sensitive data (passwords, tokens, etc.)
  - Limit depth of nested objects (prevent circular refs)
  - Truncate large arrays/strings

---

## Phase 6: Testing

**Goal**: Write comprehensive tests for logging functionality.

**Estimated Time**: 2-3 hours

### Tasks

- [ ] **6.1** Write unit tests for Logger class #S:m
  - File: `packages/blac/src/logging/__tests__/Logger.test.ts` (create)
  - Test singleton pattern
  - Test configuration methods (setLevel, enableTopic, etc.)
  - Test filtering logic (shouldLog)
  - Test formatting logic
  - Test output methods (mock console)
  - Coverage target: 90%+

- [ ] **6.2** Write unit tests for LogConfig utilities #P #S:s
  - File: `packages/blac/src/logging/__tests__/LogConfig.test.ts` (create)
  - Test config validation
  - Test config merging
  - Test namespace matching (wildcards)
  - Test default config

- [ ] **6.3** Write integration tests for lifecycle logging #S:m
  - File: `packages/blac/src/__tests__/logging-lifecycle.test.ts` (create)
  - Test bloc creation logs
  - Test bloc disposal logs
  - Test registration/unregistration logs
  - Verify log content and context

- [ ] **6.4** Write integration tests for state change logging #S:m
  - File: `packages/blac/src/__tests__/logging-state.test.ts` (create)
  - Test Cubit emit logs
  - Test Bloc event handling logs
  - Test state transformation logs
  - Verify previous/next state values

- [ ] **6.5** Write integration tests for subscription logging #S:m
  - File: `packages/blac/src/__tests__/logging-subscriptions.test.ts` (create)
  - Test observer add/remove logs
  - Test notification cycle logs
  - Test consumer tracking logs
  - Test WeakRef cleanup logs

- [ ] **6.6** Write integration tests for React logging #S:m
  - File: `packages/blac-react/src/__tests__/logging-react.test.ts` (create)
  - Test useBloc mount/unmount logs
  - Test dependency change logs
  - Test adapter lifecycle logs
  - Test adapter notification logs

- [ ] **6.7** Write tests for backwards compatibility #S:m
  - File: `packages/blac/src/__tests__/logging-compat.test.ts` (create)
  - Test `Blac.enableLog` compatibility
  - Test `logSpy` compatibility
  - Test old `log()`, `warn()`, `error()` methods
  - Verify existing tests still pass

- [ ] **6.8** Write build tests for dead code elimination #S:m
  - File: `packages/blac/src/__tests__/logging-build.test.ts` (create)
  - Mock `__BLAC_LOGGING__` flag as false
  - Verify logging code is not executed
  - Test bundle size impact (if possible)

- [ ] **6.9** Update existing tests to handle new logging #S:l
  - Review all existing tests that use `logSpy`
  - Update expectations if log format changed
  - Ensure tests don't break due to new logging
  - Add `beforeEach` setup to disable logging if needed

---

## Phase 7: Documentation

**Goal**: Provide comprehensive documentation for the logging system.

**Estimated Time**: 1-2 hours

### Tasks

- [ ] **7.1** Write API documentation (JSDoc) #P #S:m
  - Add JSDoc comments to all public APIs
  - Document all configuration options
  - Add examples in JSDoc comments
  - Generate API docs (if using tool like TypeDoc)

- [ ] **7.2** Write user guide for logging #S:m
  - File: Create `docs/logging.md` or add to existing docs
  - Getting started with logging
  - Configuration examples (Blac.setConfig, runtime API)
  - Filtering by topic, namespace, level
  - Reading and interpreting log output
  - Performance considerations
  - Troubleshooting common issues

- [ ] **7.3** Write migration guide from old API #S:m
  - File: Create `docs/logging-migration.md` or add to user guide
  - How to migrate from `Blac.enableLog`
  - How to migrate from old `log()` calls
  - Breaking changes (if any)
  - Deprecation timeline

- [ ] **7.4** Write build configuration guide #S:m
  - File: Add to `docs/logging.md` or separate `docs/logging-build.md`
  - Webpack DefinePlugin setup
  - Vite define setup
  - Rollup replace setup
  - Environment variable configuration
  - Zero-overhead mode configuration

- [ ] **7.5** Add examples to playground app #S:m
  - File: `apps/playground/src/examples/logging-example.tsx` (create)
  - Example showing logging configuration
  - Example showing different topics
  - Example showing namespace filtering
  - Interactive controls to enable/disable topics

- [ ] **7.6** Update main README and CHANGELOG #P #S:s
  - Update `packages/blac/README.md` with logging section
  - Update `packages/blac-react/README.md` if needed
  - Add entry to `CHANGELOG.md` for new logging feature
  - Add to feature list in root README

---

## Phase 8: Final Integration & Polish

**Goal**: Final touches, code review, and validation.

**Estimated Time**: 1 hour

### Tasks

- [ ] **8.1** Run full test suite and fix any failures #S:m
  - Run `pnpm test` across all packages
  - Fix any broken tests
  - Ensure all new tests pass
  - Verify coverage meets targets

- [ ] **8.2** Run type checking and linting #P #S:s
  - Run `pnpm typecheck` across all packages
  - Run `pnpm lint` across all packages
  - Fix any TypeScript errors
  - Fix any ESLint warnings

- [ ] **8.3** Build all packages and verify #P #S:s
  - Run `pnpm build` across all packages
  - Verify build succeeds
  - Check bundle sizes
  - Test in playground app

- [ ] **8.4** Manual testing in playground #S:m
  - Start playground app: `cd apps/playground && pnpm dev`
  - Test logging with different configurations
  - Verify console output looks good
  - Test topic/namespace filtering
  - Test performance timing

- [ ] **8.5** Code review and cleanup #S:m
  - Review all changed files
  - Remove debug code or TODOs
  - Ensure consistent code style
  - Verify JSDoc comments are complete
  - Check for any console.log() left behind

- [ ] **8.6** Create changeset for release #P #S:s
  - Run `pnpm changeset`
  - Select packages: @blac/core, @blac/react
  - Choose version bump: minor (new feature)
  - Write detailed changeset description

---

## Summary

### Task Statistics

**Total Tasks**: 73
- Phase 1: 11 tasks (Core Infrastructure)
- Phase 2: 6 tasks (Blac Integration)
- Phase 3: 14 tasks (Core Instrumentation)
- Phase 4: 5 tasks (React Instrumentation)
- Phase 5: 6 tasks (DevTools & Polish)
- Phase 6: 9 tasks (Testing)
- Phase 7: 6 tasks (Documentation)
- Phase 8: 6 tasks (Final Integration)

**Parallelizable Tasks**: 19 marked with #P
**Size Breakdown**:
- Small (#S:s): 35 tasks (~15 min each)
- Medium (#S:m): 31 tasks (~30 min each)
- Large (#S:l): 7 tasks (~60 min each)

**Estimated Total Time**: 11-14 hours

### Critical Path

1. Phase 1 (Infrastructure) must complete before all others
2. Phase 2 (Integration) should complete before instrumentation
3. Phases 3-4 (Instrumentation) can partially overlap
4. Phase 5 (DevTools) depends on Phase 1
5. Phase 6 (Testing) should run continuously as code is written
6. Phase 7-8 (Docs & Polish) can overlap with later phases

### Dependencies Graph

```
Phase 1 (Infrastructure)
  ↓
Phase 2 (Blac Integration)
  ↓
├─→ Phase 3 (Core Instrumentation) ──→ Phase 6 (Testing) ──→ Phase 8
│                                           ↑
├─→ Phase 4 (React Instrumentation) ───────┤
│                                           ↑
└─→ Phase 5 (DevTools) ────────────────────┤
                                            ↑
Phase 7 (Documentation) ────────────────────┘
```

### Testing Strategy

- **Unit tests** (Logger, LogConfig): Test in isolation, fast feedback
- **Integration tests** (lifecycle, state, subscriptions): Test real behavior
- **Build tests** (dead code elimination): Verify production optimization
- **Manual tests** (playground): Verify UX and output quality

### Success Criteria

✅ All 73 tasks completed
✅ All tests passing (existing + new)
✅ Type checking passes
✅ Linting passes
✅ Build succeeds for all packages
✅ Documentation complete
✅ Playground demonstrates logging
✅ Changeset created for release

---

## Notes for Implementation

### Code Conventions

- Use **arrow functions** for all Logger methods (consistency with Bloc pattern)
- Use **TypeScript strict mode** (no `any`, proper generics)
- Use **JSDoc comments** for all public APIs
- Follow existing **error handling patterns** (BlacError, ErrorManager)
- Use **existing test patterns** (Vitest, logSpy compatibility)

### Performance Considerations

- **Hot paths**: SubscriptionManager.notify(), Cubit.emit() - minimize logging overhead
- **Lazy evaluation**: Don't format strings or serialize objects unless log will be output
- **Fast checks**: O(1) boolean checks before any work
- **Build flag**: Wrap all logging in `if (__BLAC_LOGGING__)` for dead code elimination

### Common Pitfalls to Avoid

- ❌ Don't log in tight loops without sampling
- ❌ Don't stringify large objects (use depth limits)
- ❌ Don't log sensitive data (passwords, tokens)
- ❌ Don't break existing tests (maintain logSpy compatibility)
- ❌ Don't add logging that significantly impacts bundle size

### Testing Best Practices

- **Capture logs**: Use logSpy or mock console for assertions
- **Verify content**: Check log level, topic, namespace, context
- **Test filtering**: Verify logs are filtered correctly by config
- **Test edge cases**: Empty config, invalid config, disabled logging
- **Performance**: Benchmark hot paths to ensure no regression

---

**Next Step**: Begin implementation with Phase 1 (Core Logging Infrastructure).
