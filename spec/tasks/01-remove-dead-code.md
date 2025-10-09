# Task: Remove Dead Code

**Priority:** Critical
**Category:** Immediate Actions
**Estimated Effort:** 2-4 hours
**Dependencies:** None

## Overview

Remove all dead code, unused properties, empty logging conditions, and commented-out code throughout the codebase to improve maintainability and reduce confusion.

## Problem Statement

The codebase contains multiple instances of dead code that serve no functional purpose but add maintenance burden and cognitive overhead for developers. This includes:
- Empty logging conditions that check levels but perform no actions
- Unused properties that are declared but never referenced
- Commented-out code blocks that should be removed or properly implemented
- Debug console.log statements left in production code

## Specific Locations

### 1. Empty Logging Conditions
**File:** `packages/blac/src/Blac.ts:198-203`
- Empty conditions that check log levels but perform no actions
- Should either be implemented or removed entirely

### 2. Unused Properties
**File:** `packages/blac/src/Blac.ts:166`
- Property: `postChangesToDocument`
- Declared but never used anywhere in the codebase

### 3. Commented Code
**File:** `packages/blac/src/BlacObserver.ts:114`
- Commented out event dispatch code
- Needs decision: implement or permanently remove

### 4. Debug Console Logs
**File:** `apps/demo/blocs/LoggerEventCubit.ts`
- Multiple commented `console.log` statements
- Should be removed or replaced with proper logging abstraction

**File:** `apps/demo/App.tsx:295`
- Debug logs in production code
- Found 30+ instances throughout the codebase

### 5. Package.json Issues
**File:** Root `package.json` and package-level `package.json` files
- Keywords include "rxjs" but RxJS is not used anywhere
- Misleading metadata that should be corrected

## Goals

1. **Remove all dead code** from production packages (`packages/blac`, `packages/blac-react`)
2. **Clean up demo applications** to serve as proper examples
3. **Update package metadata** to accurately reflect dependencies and features
4. **Improve code clarity** by removing confusing unused elements

## Acceptance Criteria

### Must Have
- [ ] All empty logging conditions in `Blac.ts` are either implemented or removed
- [ ] Unused `postChangesToDocument` property is removed from `Blac.ts`
- [ ] Commented event dispatch code in `BlacObserver.ts` is resolved (implemented or removed)
- [ ] All commented `console.log` statements in demo code are removed
- [ ] "rxjs" keyword is removed from all package.json files
- [ ] No dead code remains in core packages (`@blac/core`, `@blac/react`)

### Should Have
- [ ] Codebase search confirms no additional dead code exists
- [ ] All console.log/warn/error calls are catalogued and justified or removed
- [ ] Proper logging abstraction is used instead of direct console calls

### Nice to Have
- [ ] ESLint rule added to prevent console.log in production code
- [ ] Pre-commit hook to catch commented code
- [ ] Documentation explaining logging best practices

## Implementation Steps

1. **Audit Phase**
   - Run comprehensive search for commented code: `rg "^\s*//" -g "*.{ts,tsx}"`
   - Search for console usage: `rg "console\.(log|warn|error)" -g "*.{ts,tsx}"`
   - Search for unused properties with TypeScript compiler

2. **Core Package Cleanup** (`packages/blac`)
   - Remove empty logging conditions in `Blac.ts:198-203`
   - Remove `postChangesToDocument` property from `Blac.ts:166`
   - Resolve commented code in `BlacObserver.ts:114`

3. **Demo Application Cleanup**
   - Remove all commented console.log from `apps/demo/blocs/LoggerEventCubit.ts`
   - Remove debug logs from `apps/demo/App.tsx:295`
   - Clean up any other demo code issues

4. **Metadata Cleanup**
   - Remove "rxjs" from keywords in all package.json files
   - Update descriptions if needed

5. **Verification**
   - Run full test suite: `pnpm test`
   - Run type checking: `pnpm typecheck`
   - Run linting: `pnpm lint`
   - Verify build succeeds: `pnpm build`

## Testing Strategy

- All existing tests must pass after cleanup
- No new tests required (this is removal only)
- Visual inspection of demo apps to ensure they still work
- Type checking must pass without errors

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Commented code was placeholder for future feature | Medium | Review each commented section before removal, document any intended features in issues |
| Console logs used for debugging production issues | Low | Ensure proper logging plugin is available as alternative |
| Package metadata changes affect discoverability | Low | Update keywords to accurately reflect actual features |

## Success Metrics

- Zero instances of empty conditional blocks
- Zero commented code blocks in core packages
- Zero misleading package metadata
- 100% test pass rate maintained
- Clean output from `rg "console\.(log\|warn\|error)" packages/`

## Follow-up Tasks

- Consider implementing proper logging conditions (if empty ones had purpose)
- Add ESLint rules to prevent future accumulation of dead code
- Document logging best practices for contributors
- Create issue for any discovered features that were commented out

## References

- Review Report: `review.md:14-27` (Dead Code section)
- Review Report: `review.md:122-126` (Console.log Usage section)
- Review Report: `review.md:117-120` (Package.json Issues)
