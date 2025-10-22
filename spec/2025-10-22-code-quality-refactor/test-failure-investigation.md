# Test Failure Investigation Report

## Issue: `should handle complex state updates` test failing

### Symptoms
- Test was failing when run with full test suite
- Test was passing when run in isolation
- Error: Expected 1 visible todo but got 0

### Root Cause: ID Generation Race Condition

The `TodoCubit.addTodo()` method was using `Date.now().toString()` to generate IDs:

```typescript
// BUGGY CODE
addTodo = (text: string): void => {
  this.updateState(state => ({
    ...state,
    todos: [
      ...state.todos,
      { id: Date.now().toString(), text, done: false }  // ❌ Problem!
    ],
  }));
};
```

When two todos were added rapidly in succession (within the same millisecond), they would get the **same ID**. This caused:

1. Both todos to have identical IDs (e.g., `'1761124703755'`)
2. When toggling the first todo by ID, **both todos** were affected
3. Both todos became `done: true`
4. When filtering for 'active' (not done) todos, the result was empty

### Discovery Process

1. **Created isolated test** - Reproduced the issue consistently
2. **Added debug logging** - Observed todos had duplicate IDs
3. **Direct script testing** - Confirmed the race condition
4. **Manual verification** - Proved the filter logic was correct, but data was wrong

### The Fix

Added a counter to ensure unique IDs even when called rapidly:

```typescript
// FIXED CODE
export class TodoCubit extends Cubit<TodoState> {
  private nextId = 0;  // ✅ Counter for uniqueness

  addTodo = (text: string): void => {
    this.updateState(state => ({
      ...state,
      todos: [
        ...state.todos,
        { id: `todo-${Date.now()}-${this.nextId++}`, text, done: false }  // ✅ Always unique!
      ],
    }));
  };
}
```

### Test Results

**Before Fix**: 18/19 tests passing
**After Fix**: 19/19 tests passing ✅

### Lessons Learned

1. **ID Generation**: Never rely solely on timestamps for unique IDs in rapid operations
2. **Test Isolation**: When tests pass in isolation but fail together, look for shared state or timing issues
3. **Debug Methodically**: Direct scripts outside the test framework can reveal issues that test runners might obscure
4. **Data Integrity**: Many "logic" bugs are actually data bugs - always verify your assumptions about the data

### Prevention

To prevent similar issues in the future:
- Use proper UUID generation for IDs
- Add counters or other uniqueness guarantees
- Consider using libraries like `nanoid` for ID generation
- Test rapid operations explicitly

### Impact

This was a subtle but critical bug that would have caused:
- Incorrect todo filtering in production
- Data corruption when toggling todos
- Unpredictable behavior in React components

The fix ensures data integrity and correct behavior across all use cases.