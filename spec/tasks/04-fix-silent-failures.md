# Task: Fix Silent Failures

**Priority:** Critical
**Category:** Immediate Actions
**Estimated Effort:** 1 week
**Dependencies:** None

## Overview

Implement proper error notification system to replace silent failures that currently hide critical issues from developers and end users.

## Problem Statement

The codebase contains multiple instances where errors and failures occur silently without notifying consumers or developers. This creates debugging nightmares and leads to undefined behavior that's difficult to trace.

### Primary Issue: Silent State Update Failures

**File:** `packages/blac/src/BlocBase.ts:524-537`

```typescript
if (newState === undefined) {
  return; // Silent failure - no notification to consumers
}
```

When state updates fail, the system silently returns without:
- Logging the failure
- Notifying the developer
- Emitting an error event
- Providing debugging information

This makes it impossible to:
- Debug why state isn't updating
- Track down logic errors
- Monitor production issues
- Provide user feedback

## Goals

1. **Eliminate all silent failures** in state management lifecycle
2. **Implement error event system** for failure notification
3. **Provide debugging information** to help developers diagnose issues
4. **Maintain backwards compatibility** where possible
5. **Document error handling patterns** for library users

## Acceptance Criteria

### Must Have
- [ ] All silent failures in BlocBase emit error events
- [ ] Error event system implemented with standard event types
- [ ] Failed state updates notify consumers/observers
- [ ] Error events include contextual information (bloc name, state, reason)
- [ ] Development mode provides detailed error messages
- [ ] Production mode provides safe error messages (no sensitive data)

### Should Have
- [ ] Error boundary for plugin execution
- [ ] Configurable error handling strategy (strict/permissive)
- [ ] Error logging integration with logging plugin
- [ ] Stack trace capture in development mode
- [ ] Error recovery suggestions

### Nice to Have
- [ ] Error analytics/telemetry hooks
- [ ] Custom error handlers per bloc instance
- [ ] Error replay/debugging tools
- [ ] Integration with error monitoring services (Sentry, etc.)

## Specific Problem Areas

### 1. State Update Failures
**Location:** `packages/blac/src/BlocBase.ts:524-537`

Current behavior:
```typescript
protected _emitState(newState: TState | undefined): void {
  if (newState === undefined) {
    return; // SILENT FAILURE
  }
  // ... rest of emit logic
}
```

**Issues:**
- No error event
- No console warning (even in dev mode)
- Consumer has no idea state update was rejected
- No way to debug why state is undefined

### 2. Consumer Validation Failures
**Location:** Throughout BlocBase consumer management

When consumer validation fails, dead consumers are silently removed:
```typescript
_validateConsumers = (): void => {
  const deadConsumers: string[] = [];
  for (const [consumerId, weakRef] of this._consumerRefs) {
    if (weakRef.deref() === undefined) {
      deadConsumers.push(consumerId); // Silent removal
    }
  }
  // Consumers removed without notification
}
```

### 3. Disposal State Violations
Attempting to use a disposed bloc fails silently in some cases.

### 4. Plugin Execution Errors
Plugin errors may not propagate correctly to the application.

## Implementation Steps

### Phase 1: Design Error Event System (Days 1-2)

1. **Define error event types**
   ```typescript
   // packages/blac/src/events/BlocError.ts
   export enum BlocErrorType {
     INVALID_STATE_UPDATE = 'invalid_state_update',
     CONSUMER_CLEANUP_FAILED = 'consumer_cleanup_failed',
     DISPOSAL_VIOLATION = 'disposal_violation',
     PLUGIN_EXECUTION_ERROR = 'plugin_execution_error',
     INVALID_EVENT = 'invalid_event',
     LIFECYCLE_VIOLATION = 'lifecycle_violation'
   }

   export interface BlocErrorEvent {
     type: BlocErrorType;
     blocId: string;
     blocName: string;
     message: string;
     details?: Record<string, any>;
     timestamp: number;
     stackTrace?: string; // Dev mode only
   }
   ```

2. **Create error handler interface**
   ```typescript
   export interface BlocErrorHandler {
     onError(error: BlocErrorEvent): void;
   }

   export class DefaultErrorHandler implements BlocErrorHandler {
     onError(error: BlocErrorEvent): void {
       if (Blac.config.enableLog) {
         console.error('[BlaC Error]', error);
       }
     }
   }
   ```

3. **Add error handling to configuration**
   ```typescript
   export interface BlacConfig {
     // ... existing config
     errorHandler?: BlocErrorHandler;
     strictMode?: boolean; // Throw errors in strict mode
   }
   ```

### Phase 2: Implement Error Events (Days 3-5)

1. **Add error emitter to BlocBase**
   ```typescript
   export abstract class BlocBase<TState> {
     private errorHandler: BlocErrorHandler;

     protected emitError(
       type: BlocErrorType,
       message: string,
       details?: Record<string, any>
     ): void {
       const error: BlocErrorEvent = {
         type,
         blocId: this._id,
         blocName: this._name,
         message,
         details,
         timestamp: Date.now(),
         stackTrace: Blac.config.enableLog ? new Error().stack : undefined
       };

       this.errorHandler.onError(error);

       if (Blac.config.strictMode) {
         throw new BlocError(error);
       }
     }
   }
   ```

2. **Fix state update silent failures**
   ```typescript
   protected _emitState(newState: TState | undefined): void {
     if (newState === undefined) {
       this.emitError(
         BlocErrorType.INVALID_STATE_UPDATE,
         'Attempted to emit undefined state',
         {
           currentState: this._state,
           callerStack: new Error().stack
         }
       );
       return;
     }

     // ... rest of emit logic
   }
   ```

3. **Fix consumer cleanup failures**
   ```typescript
   _validateConsumers = (): void => {
     const deadConsumers: string[] = [];
     let cleanupErrors = 0;

     for (const [consumerId, weakRef] of this._consumerRefs) {
       if (weakRef.deref() === undefined) {
         deadConsumers.push(consumerId);
       }
     }

     for (const consumerId of deadConsumers) {
       try {
         this._consumerRefs.delete(consumerId);
       } catch (error) {
         cleanupErrors++;
         this.emitError(
           BlocErrorType.CONSUMER_CLEANUP_FAILED,
           'Failed to cleanup dead consumer',
           { consumerId, error }
         );
       }
     }

     if (Blac.config.enableLog && deadConsumers.length > 0) {
       console.debug(
         `[${this._name}] Cleaned up ${deadConsumers.length} dead consumers` +
         (cleanupErrors > 0 ? ` (${cleanupErrors} errors)` : '')
       );
     }
   };
   ```

4. **Fix disposal violations**
   ```typescript
   emit(state: TState): void {
     if (this._disposalState !== DisposalState.ACTIVE) {
       this.emitError(
         BlocErrorType.DISPOSAL_VIOLATION,
         `Attempted to emit state on ${this._disposalState} bloc`,
         {
           state,
           disposalState: this._disposalState
         }
       );
       return;
     }

     this._emitState(state);
   }
   ```

### Phase 3: Plugin Error Boundaries (Days 5-6)

1. **Wrap plugin execution**
   ```typescript
   private executePluginHook(
     event: BlacLifecycleEvent,
     params?: any
   ): void {
     for (const plugin of this._plugins) {
       try {
         plugin.onEvent(event, this, params);
       } catch (error) {
         this.emitError(
           BlocErrorType.PLUGIN_EXECUTION_ERROR,
           `Plugin ${plugin.name} failed on ${event}`,
           {
             pluginName: plugin.name,
             event,
             error: error instanceof Error ? error.message : String(error),
             stack: error instanceof Error ? error.stack : undefined
           }
         );

         // Continue with other plugins even if one fails
       }
     }
   }
   ```

### Phase 4: Error Monitoring & Logging (Day 6-7)

1. **Create error collector for debugging**
   ```typescript
   // packages/blac/src/debug/ErrorCollector.ts
   export class BlocErrorCollector implements BlocErrorHandler {
     private errors: BlocErrorEvent[] = [];
     private maxErrors = 100;

     onError(error: BlocErrorEvent): void {
       this.errors.push(error);

       if (this.errors.length > this.maxErrors) {
         this.errors.shift(); // Remove oldest
       }

       // Also call default handler
       new DefaultErrorHandler().onError(error);
     }

     getErrors(filter?: {
       type?: BlocErrorType;
       blocName?: string;
       since?: number;
     }): BlocErrorEvent[] {
       let filtered = this.errors;

       if (filter?.type) {
         filtered = filtered.filter(e => e.type === filter.type);
       }
       if (filter?.blocName) {
         filtered = filtered.filter(e => e.blocName === filter.blocName);
       }
       if (filter?.since) {
         filtered = filtered.filter(e => e.timestamp >= filter.since);
       }

       return filtered;
     }

     clear(): void {
       this.errors = [];
     }
   }
   ```

2. **Add error handler to configuration**
   ```typescript
   // For debugging
   const errorCollector = new BlocErrorCollector();

   Blac.setConfig({
     errorHandler: errorCollector,
     strictMode: true, // Throw errors during development
     enableLog: true
   });
   ```

## Testing Strategy

### Unit Tests
```typescript
describe('Error Handling', () => {
  let errorHandler: jest.Mock;

  beforeEach(() => {
    errorHandler = jest.fn();
    Blac.setConfig({ errorHandler: { onError: errorHandler } });
  });

  describe('State Update Failures', () => {
    it('should emit error when state is undefined', () => {
      class TestBloc extends Cubit<number> {
        constructor() { super(0); }

        emitUndefined = () => {
          this.emit(undefined as any);
        };
      }

      const bloc = new TestBloc();
      bloc.emitUndefined();

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: BlocErrorType.INVALID_STATE_UPDATE,
          message: expect.stringContaining('undefined state')
        })
      );
    });
  });

  describe('Disposal Violations', () => {
    it('should emit error when emitting after disposal', async () => {
      class TestBloc extends Cubit<number> {
        constructor() { super(0); }
      }

      const bloc = new TestBloc();
      await bloc.dispose();
      bloc.emit(1);

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: BlocErrorType.DISPOSAL_VIOLATION
        })
      );
    });
  });

  describe('Plugin Errors', () => {
    it('should catch and report plugin errors', () => {
      class ErrorPlugin implements BlacPlugin {
        name = 'ErrorPlugin';
        onEvent() {
          throw new Error('Plugin error');
        }
      }

      Blac.addPlugin(new ErrorPlugin());

      class TestBloc extends Cubit<number> {
        constructor() { super(0); }
      }

      const bloc = new TestBloc();
      bloc.emit(1);

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: BlocErrorType.PLUGIN_EXECUTION_ERROR,
          details: expect.objectContaining({
            pluginName: 'ErrorPlugin'
          })
        })
      );
    });
  });

  describe('Strict Mode', () => {
    it('should throw errors in strict mode', () => {
      Blac.setConfig({ strictMode: true });

      class TestBloc extends Cubit<number> {
        constructor() { super(0); }
      }

      const bloc = new TestBloc();

      expect(() => {
        bloc.emit(undefined as any);
      }).toThrow(BlocError);
    });
  });
});
```

### Integration Tests
- Test error handling with React hooks
- Test error propagation through plugin system
- Test error collector in real scenarios

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Breaking changes for error-dependent code | Medium | Make error events opt-in initially, provide migration path |
| Performance overhead from error handling | Low | Benchmark, make error details configurable |
| Too many error events overwhelming logs | Medium | Add error rate limiting, filtering options |
| Sensitive data in error details | High | Sanitize error details in production, provide configuration |

## Migration Guide

### For Library Users

**Before:**
```typescript
class MyBloc extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
    // Silent if state becomes undefined
  };
}
```

**After (with error handling):**
```typescript
import { BlocErrorCollector } from '@blac/core';

const errorCollector = new BlocErrorCollector();

Blac.setConfig({
  errorHandler: errorCollector,
  strictMode: true, // Throw in development
  enableLog: true
});

class MyBloc extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    try {
      this.emit(this.state + 1);
    } catch (error) {
      // Handle error in strict mode
      console.error('Failed to increment:', error);
    }
  };
}

// Debug errors
console.log(errorCollector.getErrors());
```

## Success Metrics

- Zero silent failures in core state management
- 100% of error conditions emit error events
- Error events include actionable debugging information
- All tests pass with strict mode enabled
- Developer documentation includes error handling guide
- Error handler coverage >90%

## Follow-up Tasks

- Integrate with error monitoring services (Sentry, LogRocket)
- Create error recovery strategies documentation
- Add error visualization to debug tools
- Performance monitoring for error handling overhead
- User-facing error messages localization

## References

- Review Report: `review.md:106-113` (Silent Failures section)
- Review Report: `review.md:146-149` (Fix Silent Failures recommendation)
- Error Handling Best Practices: https://kentcdodds.com/blog/use-react-error-boundary-to-handle-errors-in-react
