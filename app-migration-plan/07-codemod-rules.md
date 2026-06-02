# 07 — Codemod Rules

Tool of choice: `ts-morph` (full type-aware transforms; cleaner than `jscodeshift` for TS).
Location in user-fe: `scripts/migrate-blac-v0.ts`.

Each rule below is a deterministic rewrite. Rules are applied in order. After running, the result should typecheck.

## Rule C-1 — Rewrite v0 imports to v1 (shim)

**Match.** Any `import ... from "blac"`.

**Action.** Change source to `"blac-next"`. (The workspace `blac-next` is already the shim re-export per Phase 1.)

**Special cases.**

- `BlacReact` → keep imported from `"blac-next"` (the shim still exports it).
- `BlocObserver` → keep imported from `"blac-next"`.

**Why.** After this rule, the codebase has zero `from "blac"` strings — but behavior is unchanged because everything resolves to the shim.

## Rule C-2 — Map v1 `useBloc` option keys

**Match.** `useBloc(C, { ... })` call where any of `id` / `dependencySelector` / `props` is present.

**Action.**

- `id` → `instanceId` (string).
- `dependencySelector` → `dependencies`. Add a `// MIGRATE-AUDIT-R8: verify re-render behavior` line comment above the call. See R8.
- `props` → handled by Rule C-3.

## Rule C-3 — Replace v1 `props` injection with explicit init (per user)

**Match.** `useBloc(C, { props: <expr> })` OR `Blac.getBloc(C, { props: <expr> })`.

**Action.**

For `useBloc`:

```ts
// before
const [state, bloc] = useBloc(C, { props });

// after
const [state, bloc] = useBloc(C);
useEffect(() => {
  bloc.initWithProps(props);
}, []); // MIGRATE-AUDIT-R3
```

For `Blac.getBloc`:

```ts
// before
const inst = Blac.getBloc(C, { props });

// after
const inst = Blac.getBloc(C);
inst.initWithProps(props);
```

Then ensure `import { useEffect } from 'react'` exists at the top of the file when needed.

**On the cubit class.** Find the cubit class definition for `C`. If it does not already define `initWithProps`, generate a stub:

```ts
initWithProps(props: any) {
  this.props = props;
}
// MIGRATE-AUDIT-R3: hand-finalize the init API for this cubit.
```

Add `props: any = null;` to the class body if not present.

Add a top-of-file TODO marker so the cleanup pass finds it:

```ts
// TODO(migrate-blac-r3): hand-finalize init API for this cubit.
```

## Rule C-4 — Remove unused v1 hook aliases

**Match.** `import { useBloc as useBlocNext } from "@blac/react"`.

**Action.** Drop the alias if a single import is sufficient. (15 files.)

## Rule C-5 — `dependencySelector` audit annotation

Covered by Rule C-2's comment emission. The cleanup script in Phase 3 greps for `MIGRATE-AUDIT-R8` to find spots to verify.

## Rule C-6 — `BlocProvider` JSX — no change needed

Verify only. The shim's `BlocProvider` is API-compatible; we leave the JSX alone. Add a `// MIGRATE-AUDIT-R1: BlocProvider going through shim; cleanup in Phase 3.` comment above each of the 3 sites for traceability:

- `apps/user-app/src/ui/components/PaymentContext/PaymentContext.tsx`
- `apps/user-app/src/ui/components/QuestionnaireStep/QuestionnaireStep.tsx`
- `apps/pmp/src/ui/components/PharmacyInsuranceInformationDialog/PharmacyInsuranceInformationDialog.tsx`

## Rule C-7 — `BlocObserver` site → keep, document

`apps/user-app/src/state/state.ts` constructs `new BlocObserver(...)`. After C-1 it imports from `"blac-next"` which is the shim. No further change. Add a `// MIGRATE-AUDIT-R7: observer goes through plugin shim` comment.

## Rule C-8 — Drop `blac@^0.4.1` from `package.json`

Once C-1 has zero matches and CI is green:

- Remove `"blac": "^0.4.1"` from `apps/user-app/package.json` and `apps/pmp/package.json`.
- Remove the `pnpm.overrides` entry for `blac`.
- `pnpm install`.

This is a manual final step gated by `grep "from \"blac\"" = 0`.

## Order of application

```
C-1  → C-2 → C-3 → C-4 → C-6/C-7 (annotations) → typecheck → C-8 (manual)
```

C-3 is the riskiest. Run it last among the transforms so its diffs are visible against a smaller surface.

## Codemod self-tests

The script ships with a `__tests__/` folder of input/output pairs:

| Test                          | Input                                  | Expected output                                             |
| ----------------------------- | -------------------------------------- | ----------------------------------------------------------- |
| simple `useBloc({ id })`      | `useBloc(C, { id: 'x' })`              | `useBloc(C, { instanceId: 'x' })`                           |
| `useBloc({ props })`          | `useBloc(C, { props: p })`             | tuple + `useEffect(() => bloc.initWithProps(p), [])`        |
| existing `initWithProps`      | cubit already has the method           | no stub generated                                           |
| `Blac.getBloc({ id, props })` | `Blac.getBloc(C, { id: u, props: p })` | `const x = Blac.getBloc(C, { id: u }); x.initWithProps(p);` |
| `BlocObserver`                | unchanged source-side                  | only annotation added                                       |
| `BlocProvider` JSX            | unchanged                              | only annotation added                                       |
| `dependencySelector` rename   | `{ dependencySelector: fn }`           | `{ dependencies: fn }` + audit comment                      |

Run with `pnpm vitest run scripts/migrate-blac-v0.test.ts` before applying to either app.

## Manual cleanup commit (after codemod)

Per app, expect a small manual diff:

- The 3 `BlocProvider` sites: confirm the descendant `useBloc` chain works against the shim.
- `user-app/state/state.ts`: remove the `new BlacReact(...)` line and replace with a thin `export { useBloc } from 'blac-next';` + `export { BlocProvider } from 'blac-next';`. The observer install moves to a top-level `getPluginManager().install(myObserverAsPlugin)` (or stays as `new BlocObserver(...)` since the shim auto-installs).
- `apps/pmp/src/state/state.ts`: same.

## Reviewer checklist (per PR)

- [ ] `grep "from \"blac\"" apps packages --include="*.ts" --include="*.tsx"` returns nothing.
- [ ] `grep -rn "MIGRATE-AUDIT" apps packages` returns the expected count (matches the count of risky sites; document it in PR description).
- [ ] App boots in dev.
- [ ] Smoke test for the app passes:
  - user-app: login, dashboard renders, payment flow opens (covers PaymentContext shim).
  - pmp: user search, open user detail (covers DataSource\* scoping), lab order list (covers PharmacyInsurance shim).
