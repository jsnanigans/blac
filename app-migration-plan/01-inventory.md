# 01 — Inventory

All numbers below were verified directly with `grep` against the user-fe-reviews monorepo on 2026-05-18, not just taken from explore agents.

## 1. Package layout

```
user-fe-reviews/
├── apps/
│   ├── user-app/   ← deps: blac@^0.4.1, blac-next (ws), @blac/react (ws)
│   ├── pmp/        ← deps: blac@^0.4.1, blac-next (ws), @blac/react (ws)
│   └── e2e/        ← (no blac usage)
├── packages/
│   ├── blac-next   ← v1 core, version 1.0.30
│   ├── blac-react  ← v1 React wrapper, version 0.0.59, depends on blac-next
│   └── shared      ← deps: @blac/react (ws), blac-next (ws) — v1 ONLY
```

`packages/shared` was verified to have **zero** imports from the bare `blac` package — it is v1-only.

## 2. Import-statement counts (verified by grep)

| Source | File count |
|---|---|
| `from "blac"` (v0, bare) | **71** |
| `from "blac-next"` (v1 core) | 236 |
| `from "@blac/react"` (v1 react) | 328 |
| Intersection (v0 AND v1) | **24** |

The 71 v0 files split as ~41 user-app + ~30 pmp. v1 usage spans all three workspaces.

## 3. Symbols imported

### From v0 `blac` (only three distinct shapes appear)

```
import { BlacReact } from "blac";
import { BlacReact, BlocObserver } from "blac";
import { Cubit } from "blac";
```

So v0's surface in this codebase reduces to `Cubit`, `BlacReact`, `BlocObserver`. **No v0 `Bloc`, `BlocBuilder`, `BlocConsumer`, `withBlocProvider`.**

### From v1 `blac-next` (sorted)

```
import { Blac } from "blac-next";
import { Blac, BlacEvent } from "blac-next";
import { Blac, Cubit } from "blac-next";
import { BlocBase, BlocConstructor } from "blac-next";
import { BlocConstructor } from "blac-next";
import { BlocConstructor, BlocGeneric, BlocHookDependencyArrayFn,
         BlocState, InferPropsFromGeneric } from "blac-next";
import { BlocGeneric } from "blac-next";
import { BlocGeneric, BlocHookDependencyArrayFn, BlocState } from "blac-next";
import { Cubit } from "blac-next";
import { Cubit as CubitNext } from "blac-next";
import type { BlacEvent } from "blac-next";
```

### From v1 `@blac/react`

Predominantly `useBloc` (often aliased to `useBlocNext`). 260+ component-level call sites across the two apps.

## 4. Mixed v0+v1 files — the 24 hotspots

Verified with `comm -12 <sorted v0 files> <sorted v1 files>`:

### user-app (17 files)

```
src/state/state.ts                                          ← ROOT (BlacReact + Blac)
src/state/UserCubit/UserCubit.ts                            ← ~789 lines, central
src/state/AvatarCubit/AvatarCubit.ts
src/state/DevicesCubit/DevicesCubit.ts
src/state/FilesCubit/FilesCubit.ts
src/state/HealthSyncBloc/HealthSyncBloc.ts
src/state/ObservationBundleBloc/ObservationBundleBloc.ts
src/state/PaymentCubit/PaymentCubit.ts
src/state/ProgramBloc/ProgramBloc.ts
src/state/SanityCubit/SanityCubit.ts
src/state/ShipmentAddressCubit/ShipmentAddressCubit.ts
src/state/ShipmentCubit/ShipmentCubit.ts
src/state/SubscriptionCubit/SubscriptionCubit.ts
src/state/UserEmailVerificationCubit/UserEmailVerificationCubit.ts
src/ui/components/ExampleInsuranceCard/ExampleInsuranceCard.tsx
src/ui/components/NotificationSettings/NotificationSettingsBloc.ts
src/ui/components/UserEducationalFeed/UserEducationalFeedBloc.ts
```

### pmp (7 files)

```
src/ui/components/AICareAssistant/AICareAssistantCubit.tsx
src/ui/components/AddVitalSignsDialog/AddVitalSignsDialogBloc.ts
src/ui/components/EditLabValueDialog/EditLabValueBloc.tsx
src/ui/components/GenerativeContent/GenerativeContent.tsx
src/ui/components/PriorAuthorizationList/PriorAuthorizationListCubit.ts
src/ui/components/UpdateLabOrderProviderDialog/UpdateLabOrderProviderCubit.tsx
src/ui/components/UploadDocumentDialog/UploadDocumentCubit.ts
```

**Pattern in every one of these:** `class X extends Cubit` is imported from `blac` (v0), but `Blac.getBloc(...)` is called from `blac-next` (v1) inside methods. There is no real v0↔v1 interop — the v0 `Cubit` base class and the v1 `Cubit` base class are *not* the same prototype, but the cubits never *interact* with v0 machinery beyond `extends Cubit + emit()`. That is what makes mechanical migration tractable.

## 5. Patterns that exist in the codebase

| Pattern | Count | Notes |
|---|---|---|
| `Blac.getBloc(X)` | 398 | The dominant lookup API |
| `Blac.getBloc(X, { id })` | many in pmp | Scoped lookup (R4) |
| `Blac.getBloc(X, { props })` | a few | Will need explicit init (R3) |
| `static keepAlive = true` | 26 | Global singletons |
| `static isolated = true` | 11 | Per-mount instances |
| `static addons = [...]` | 0 | None in app code; Persist exists in framework only |
| `<BlocProvider bloc={...}>` (v0 JSX) | 3 | PaymentContext, QuestionnaireStep, PharmacyInsuranceInformationDialog |
| `BlocObserver` instances | 1 | user-app debug observer |
| Custom plugins | 0 | |
| `Bloc<E, S>` subclass (event-driven) | **0** | No event-based blocs in app code |
| `useBloc` (v0 hook) | ~54 | |
| `useBlocNext` (v1 hook) | ~260 | |
| `useBloc as useBlocNext` alias | 15 | Signals migration-ready intent |

## 6. What this means for migration

- No event-system migration needed (no `Bloc` subclasses).
- No addon migration needed (no app-level addons).
- Plugin migration is small (one debug observer).
- The real surface is **Cubit + getBloc + statics + 3 BlocProvider call sites**.
- Mixed-file count (24) is the upper bound on hand-touched files in Phase 2 if we keep the shim broad enough.
