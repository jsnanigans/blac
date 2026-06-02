# 08 — Testing Strategy

How we know each phase didn't break anything.

## Per-phase exit gates

### Phase 0 (v2 extensions)

- New unit tests in `packages/blac-core` and `packages/blac-react` covering E1, E2, E3.
- Full v2 test suite green.
- Snapshot of bundle size before/after — keep additions minimal.

### Phase 1 (shim + alias swap)

- `pnpm test` in user-fe-reviews green (the existing 200+ test files).
- Manual smoke test (see "Smoke checklist" below).
- No new TypeScript errors (`pnpm typecheck`).

### Phase 2 (codemod per app)

- Codemod's own tests green (`scripts/migrate-blac-v0.test.ts`).
- After applying to an app: `pnpm test --filter <app>` green.
- `grep "from \"blac\""` returns zero hits.
- Manual smoke for that app.

### Phase 3 (modernization)

- Per-family PRs, normal review + tests.
- Lint rule E7 enabled and green.

### Phase 4 (shim delete)

- `grep -r "blac-next\|@blac/react" apps packages --include="*.ts" --include="*.tsx"` returns only the expected `@blac/react` (v2) imports.
- Full test suite green.

## Smoke checklist (run after each phase)

Manual, ~10 minutes per app.

### user-app

1. Cold boot, sign in.
2. Dashboard renders, consistency score loads.
3. Open Payment context (R1, BlocProvider site #1).
4. Open a Questionnaire step (R1, BlocProvider site #2).
5. Trigger a state change that depends on `Blac.getBloc(LoadingCubit)` (R6) — e.g., refresh meds list.
6. Toggle `sessionStorage.debugModeActive = 'true'` in console and verify state-change logs appear (R7).
7. Navigate away and back; verify global blocs survived (R5 — keepAlive).

### pmp

1. Cold boot, sign in.
2. User search returns results.
3. Open a user detail page (R4 — `DataSourceUserDetailsCubit` scoped by id).
4. Open PharmacyInsurance dialog (R1, BlocProvider site #3).
5. Open AICareAssistant pane (mixed v0+v1 file).
6. Edit a lab value (mixed v0+v1 file).
7. Open Prior Authorization list (mixed v0+v1 file).

## Test infrastructure changes

### `vitest-setup.ts` — add `blacTestSetup()`

Globally clear the v2 registry between tests so leaked instances don't bleed across cases. Place it once in user-fe's root vitest setup:

```ts
import { blacTestSetup } from '@blac/core/testing';
blacTestSetup();
```

This pairs with the existing `Blac.getInstance().resetInstance()` calls inside individual tests — both routes clear the registry.

### Spy patterns continue to work

The shim's `Blac.getBloc` is a real bound method. Existing patterns like:

```ts
vi.spyOn(Blac, 'getBloc').mockImplementation((C) => fakeInstance);
```

work unchanged. No codemod needed for tests.

### Preferred new-test pattern

```ts
import {
  registerOverride,
  blacTestSetup,
  withTestRegistry,
} from '@blac/core/testing';

describe('feature', () => {
  blacTestSetup();

  it('handles X', () => {
    registerOverride(SomeBloc, fakeInstance);
    // ...
  });
});
```

Push this in Phase 3 cleanup PRs as the convention.

## CI configuration

- Run the codemod tests in CI even on `main` so the script doesn't bit-rot.
- Add a CI check that fails if any new `from "blac"` import appears after Phase 2 lands.

```yaml
# .github/workflows/no-blac-v0.yml (sketch)
- name: Forbid v0 blac imports
  run: |
    if grep -rln 'from "blac"' apps packages --include="*.ts" --include="*.tsx"; then
      echo "v0 blac imports are forbidden. Use blac-next (or @blac/core/react)."
      exit 1
    fi
```

Drop the v1 forbidden grep until Phase 4.

## Performance regression watch

The v2 hook uses `useSyncExternalStore` and proxy-based auto-tracking. Net should be neutral-to-better than v1.

- During Phase 1 dev, profile the user-app login flow and dashboard render with React DevTools. Expect parity. If renders increase, audit `dependencySelector → dependencies` annotations (R8).

## Bundle size

- Compare `pnpm build --filter user-app` size before/after Phase 1. The shim is small; expect <10kB net change.
