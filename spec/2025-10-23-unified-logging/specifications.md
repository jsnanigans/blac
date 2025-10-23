# Unified Logging System for BlaC v2 - Specifications

## Overview
Create a comprehensive, unified logging system for the BlaC v2 architecture that provides complete traceability of state changes, subscription lifecycle, and disposal operations.

## Goals
1. **Complete Traceability**: Enable tracking of all significant operations in the v2 codebase
2. **Unified Interface**: Single, consistent logging API across all v2 components
3. **Production-Ready**: Configuration-driven output suitable for both development and production
4. **Performance-Conscious**: Minimal overhead when logging is disabled or at higher levels
5. **Developer Experience**: Clear, structured output that aids debugging and understanding

## Requirements

### Log Levels
- **ERROR**: Critical failures and errors
- **WARN**: Warning conditions that should be addressed
- **INFO**: Important informational messages
- **DEBUG**: Detailed diagnostic information

**Default Behavior**: INFO level in production, DEBUG in development (configurable)

### Configuration Management
- **Global Singleton**: Single logger instance configured via `Blac.setConfig()`
- Configuration options:
  - `logLevel`: Set minimum log level (ERROR, WARN, INFO, DEBUG)
  - `logEnabled`: Master on/off switch
  - `logFormat`: Output format options (structured, pretty, etc.)
  - `logMetadata`: Control which metadata to include
  - `logOutput`: Custom output handler (defaults to console)

### Automatic Metadata
Every log entry must include:
1. **Timestamps**: ISO 8601 format timestamp
2. **Bloc/Cubit Instance Info**: Instance name, type, and ID
3. **State Snapshots**: Before/after state for state changes
4. **Call Stack/Location**: File and line number where log was generated

### Critical Landmarks to Log

#### 1. State Changes
- State emissions with before/after values
- State transitions through the StateStream pipeline
- Filter stage evaluations and results
- Proxy tracking stage operations (if enabled)

#### 2. Subscription Lifecycle
- New subscription creation
- Subscription filter evaluation
- Observer notifications
- Subscription disposal/cleanup
- Registry operations (add/remove subscriptions)

#### 3. Disposal/Cleanup
- Disposal request initiation
- Generation counter increments
- Disposal execution
- Cleanup validation
- Memory cleanup (WeakRef dereferencing)

### Data Serialization
- **Primary Format**: JSON serialization for all structured data
- **State Handling**: Serialize state snapshots with circular reference detection
- **Error Objects**: Extract message, stack, and relevant properties
- **Custom Types**: Support for serializing Bloc/Cubit instances

### Error Handling
- **Fallback Strategy**: If JSON serialization fails, fall back to simpler string representation
- **Graceful Degradation**: Never throw errors during logging
- **Nested Fallbacks**:
  1. Try JSON.stringify with custom replacer
  2. Try Object.toString()
  3. Try String() coercion
  4. Use `[Unserializable]` placeholder

### Performance Considerations
- **Lazy Evaluation**: Only serialize data when log level is active
- **Conditional Compilation**: Use guards to skip logging overhead when disabled
- **Minimal Overhead**: When logging is disabled, overhead should be < 1% of normal execution
- **No Blocking**: Logging should never block state updates or subscriptions

## Success Criteria

1. **Complete Coverage**: All v2 components (StateStream, SubscriptionSystem, SubscriptionRegistry, ProxyTracker, ReactBridge) have logging at key points
2. **Consistent Format**: All logs follow the same structure with required metadata
3. **Configurable**: Log level and output can be controlled via `Blac.setConfig()`
4. **Zero Breaking Changes**: Logging is additive and doesn't affect existing functionality
5. **Performance**: Negligible overhead when logging is at INFO level or disabled
6. **Documentation**: Clear examples of how to use and configure logging

## Out of Scope

- Log persistence/storage (file output, remote logging)
- Log aggregation or analytics
- Per-instance log level overrides (future enhancement)
- Browser DevTools integration (future enhancement)
- Custom log transports (future enhancement)

## Dependencies

- Core v2 architecture (StateStream, SubscriptionSystem, etc.)
- Existing Blac configuration system
- TypeScript type system for type-safe logging

## Constraints

- Must work in both browser and Node.js environments
- Must not introduce circular dependencies
- Must not affect bundle size significantly (< 5KB minified)
- Must maintain compatibility with existing ProxyTracker and StateStream implementations

## Edge Cases

1. **Circular References in State**: Handle via custom JSON replacer
2. **Very Large State Objects**: Truncate or limit depth in serialization
3. **High-Frequency State Changes**: Consider sampling or throttling at DEBUG level
4. **Logging During Disposal**: Ensure logger is still functional during cleanup
5. **Concurrent Subscriptions**: Thread-safe logging (not applicable in JS, but consider async context)

## Non-Functional Requirements

- **Type Safety**: Full TypeScript types for logger API
- **Tree-Shakeable**: Unused log levels should be removable by bundlers
- **Testable**: Logger behavior should be testable (injectable output handler)
- **Maintainable**: Clear separation of logging concerns from business logic
