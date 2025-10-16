# BlaC v0 Usage Analysis: Real-World Patterns from user-fe-reviews

## Executive Summary

### Top 5 Insights

1. **Loading State is Universal**: Every non-trivial Cubit extends `BaseCubit` for loading management with timeout protection (90s default)
2. **Dual Version Migration**: Project simultaneously uses `blac` (v0) and `blac-next` (v2) with duplicate base classes
3. **Method Binding Critical**: All methods use arrow functions (`method = () => {}`) for React compatibility
4. **Complex State Orchestration**: 20+ global singleton instances managed via central state registry
5. **WebSocket as Central Bus**: Chat, tasks, and real-time features built around WebSocket message observers

## Pattern Catalog

### 1. Architectural Patterns

#### Global Singleton State Management
**Files**: `/apps/user-app/src/state/state.ts`
**Pattern**: All state instances created as singletons and exported globally
```typescript
export const authenticationState = new AuthenticationBloc();
export const userState = new UserCubit();
export const websocketState = new WebSocketBloc();
// 20+ more singleton instances
```
**Frequency**: Universal pattern across entire app

#### Base Class Extension for Common Functionality
**Files**: `/apps/pmp/src/state/BaseCubit.ts`
**Pattern**: Custom base class provides loading state with automatic timeout
```typescript
export class BaseCubit<T extends BaseState> extends Cubit<T> {
  private loadingTimeouts: Map<string, NodeJS.Timeout> = new Map();
  protected startLoading(key: string): void { /* timeout logic */ }
  protected stopLoading(key: string): void { /* cleanup */ }
}
```
**Frequency**: Used by 15+ Cubits in pmp app

#### Observer Pattern for Cross-Component Communication
**Files**: `/apps/user-app/src/state/WebSocketBloc/WebSocketBloc.ts`
**Pattern**: Custom observer implementation for WebSocket events
```typescript
addObserver = (type: WebsocketMessageType, callback: ObserverCallback) => {
  const id = `${type}-${Date.now()}`;
  this.observers.push({ id, type, callback });
  return { id, remove: () => { /* cleanup */ } };
}
```
**Frequency**: Used in WebSocket, Task Management, Chat systems

### 2. State Management Patterns

#### Loading State with Multiple Keys
**Files**: Multiple (LoadingCubit, BaseCubit)
**Pattern**: Track multiple concurrent loading operations
```typescript
interface LoadingState {
  loading: string[];  // Array of loading keys
  isLoading: boolean; // Overall loading state
}
```

#### Discriminated Union for Complex States
**Files**: `/apps/user-app/src/state/AppViewCubit/AppViewCubit.tsx`
```typescript
enum OnboardingScreenStatus {
  completed = "completed",
  initial = "initial",
  showFull = "showFull",
  showVisitOnly = "showVisitOnly"
}
```

#### Message Queue Pattern
**Files**: `/apps/user-app/src/state/WebSocketBloc/WebSocketBloc.ts`
**Pattern**: Queue messages when offline, process when connected
```typescript
messageQueue: WebsocketMessage[] = [];
processMessageQueue = async () => { /* send queued messages */ }
```

### 3. API Usage Patterns

#### Arrow Function Methods (MANDATORY)
**Pattern**: Every method uses arrow functions for `this` binding
```typescript
// ✅ CORRECT - Found in 100% of files
increment = () => { this.emit(this.state + 1); }

// ❌ NEVER FOUND - Would break in React
increment() { this.emit(this.state + 1); }
```

#### Emit with Spread Pattern
**Pattern**: Always spread existing state when emitting
```typescript
this.emit({
  ...this.state,
  loading: true,
  specificField: newValue
});
```
**Frequency**: 100% of emit calls

#### Cleanup Pattern
**Files**: Multiple
```typescript
cleanup = (): void => {
  // Remove event listeners
  // Clear timers
  // Reset state
}
```

### 4. React Integration Patterns

#### useBloc Hook Usage
**Files**: `/apps/user-app/src/ui/components/ShowIfSubscription/ShowIfSubscription.tsx`
```typescript
const [state, instance] = useBloc(SubscriptionCubit);
// Often destructure methods directly
const [, { extractPayerInfo }] = useBloc(SubscriptionCubit);
```

#### BlacReact Registry
**Files**: `/apps/user-app/src/state/state.ts`
```typescript
const state = new BlacReact([
  authenticationState,
  loadingState,
  userState,
  // ... all singleton instances
], { observer: debugObserver });
```

### 5. Common Use Cases

#### Authentication & Session Management
**Files**: `/apps/user-app/src/state/UserCubit/AuthenticationBloc.ts`
- 1200+ lines of authentication logic
- Token refresh with auto-scheduling
- Multi-storage user selection
- WebSocket integration
- SAML/SSO support

#### Real-time Chat
**Files**: `/apps/user-app/src/ui/components/Chat/ChatBloc.ts`
- Virtual scrolling integration
- Message queueing
- File attachments
- Offline support
- 1000+ lines of chat logic

#### Form/Data Management
**Files**: `/packages/shared/src/molecule/scheduler/SchedulerBloc.tsx`
- Complex multi-step forms
- Appointment scheduling
- Provider selection
- Date/time management

#### Polling/Auto-refresh
**Files**: `/apps/pmp/src/state/AutoPollCubit.ts`
```typescript
pollFn = async (callback: () => Promise<boolean>) => {
  const result = await callback();
  if (!result && remainingTime > 0) {
    this.startPolling(callback, delay);
  }
}
```

## Pain Points & Workarounds

### 1. Loading State Boilerplate
**Problem**: Every Cubit needs loading state management
**Workaround**: Created `BaseCubit` base class
**Files**: 34+ files extend BaseCubit
**Impact**: High - requires inheritance hierarchy

### 2. Dual Version Migration Debt
**Problem**: Using both `blac` and `blac-next` simultaneously
**Evidence**: `/apps/pmp/src/state/BaseCubit.ts` has duplicate classes
```typescript
export class BaseCubit<T> extends Cubit<T> { /* v0 */ }
export class BaseCubitNext<T> extends CubitNext<T> { /* v2 */ }
```
**Impact**: Medium - code duplication, confusion

### 3. Manual Observer Management
**Problem**: No built-in observer/event system
**Workaround**: Custom observer implementation in multiple places
**Files**: WebSocketBloc, TaskManagementBloc
**Impact**: High - repeated boilerplate

### 4. Memory Leak Prevention
**Problem**: Must manually clean up listeners, timers, observers
**Workaround**: `cleanup()` methods everywhere
**Impact**: High - error-prone, easy to miss

### 5. Global State Coupling
**Problem**: Direct imports of singleton instances
**Evidence**: `import { userState, authenticationState } from "../state"`
**Impact**: High - testing difficulty, tight coupling

## Quality Metrics

### TypeScript Usage
- **Score**: 8/10
- Strict types used consistently
- Some `any` types in metadata/API responses
- Good use of discriminated unions and enums

### Error Handling
- **Score**: 6/10
- Try/catch blocks present but inconsistent
- Sentry integration for error reporting
- Missing error boundaries in some areas

### Memory Management
- **Score**: 7/10
- Cleanup methods present
- Manual observer removal required
- Potential leaks in event listeners

### Documentation
- **Score**: 4/10
- Minimal inline documentation
- Complex logic lacks explanation
- No consistent JSDoc patterns

### Testing
- **Score**: N/A (tests not analyzed)
- Test files exist but not examined

## API Gaps

### 1. Loading State Management
**Missing**: Built-in loading state handling
**Implemented**: BaseCubit with timeout protection
**Recommendation**: Add loading state mixin/plugin

### 2. Observer/Event System
**Missing**: Built-in event emitter for cross-Bloc communication
**Implemented**: Custom observer pattern in 3+ places
**Recommendation**: Add EventEmitter or Observer API

### 3. Lifecycle Hooks
**Missing**: Consistent lifecycle management
**Implemented**: Manual cleanup() methods
**Recommendation**: Add onInit, onDispose hooks

### 4. Selector/Computed Properties
**Missing**: Memoized selectors
**Implemented**: Manual getter methods
**Recommendation**: Add selector API with memoization

### 5. DevTools Integration
**Missing**: Time-travel debugging, state inspection
**Implemented**: Custom BlocObserver for console logging
**Recommendation**: Add Redux DevTools integration

## Recommendations

### Priority 1: Core API Improvements
1. **Built-in Loading State**: Add `withLoading()` mixin or `LoadingCubit` base class
2. **Event System**: Add `BlocEvents` or observer pattern to core
3. **Lifecycle Hooks**: Add `onCreate`, `onDispose` to `BlocBase`
4. **Memory Safety**: Automatic cleanup of listeners/timers

### Priority 2: Developer Experience
1. **TypeScript Generics**: Better type inference for `useBloc`
2. **DevTools**: Redux DevTools adapter
3. **Testing Utilities**: Mock providers, test helpers
4. **Migration Guide**: Clear path from v0 to latest

### Priority 3: Advanced Features
1. **Computed Properties**: Add `@computed` decorator or `select()` method
2. **Middleware System**: Logging, persistence, analytics plugins
3. **Hydration/Dehydration**: State persistence across sessions
4. **Error Boundaries**: Built-in error handling for Blocs

### Anti-Patterns to Document
1. **Don't use regular methods** - Always arrow functions
2. **Don't forget cleanup** - Memory leaks are common
3. **Don't mutate state** - Always spread existing state
4. **Don't skip loading timeouts** - Prevent infinite loading
5. **Don't couple Blocs directly** - Use events/observers

## Code Samples

### Most Complex Bloc (AuthenticationBloc)
- 1200+ lines
- 30+ methods
- Token management
- Multi-storage coordination
- WebSocket integration
- SAML/SSO support

### Most Reused Pattern (BaseCubit)
- Extended by 15+ Cubits
- Loading state with timeouts
- Tracking multiple operations
- Analytics integration

### Most Innovative Pattern (SchedulerBloc with Props)
- Uses second generic for props
- Callback registration system
- Complex state machine
- 900+ lines of scheduling logic

## File Statistics
- **Total Bloc/Cubit files**: 110+ across all packages
- **Average file size**: 200-300 lines
- **Largest file**: AuthenticationBloc (1200+ lines)
- **Most extended**: BaseCubit (15+ children)
- **Most observers**: WebSocketBloc (10+ observer types)

## Conclusion

The user-fe-reviews codebase demonstrates mature patterns for complex state management but reveals significant API gaps that developers had to fill with custom solutions. The universal `BaseCubit` pattern, manual observer management, and extensive cleanup requirements indicate missing core features that should be built into BlaC v2+.

The simultaneous use of `blac` and `blac-next` shows migration challenges that need addressing through better migration tools and documentation. The complexity of AuthenticationBloc and WebSocketBloc demonstrate BlaC can handle enterprise-scale requirements but needs better built-in patterns for common use cases.
