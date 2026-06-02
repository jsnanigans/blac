# 06 — `@9amhealth/blac-compat` Shim Design

This package lives in `user-fe-reviews/packages/blac-compat`. It re-exports the v0 and v1 names backed by v2 internals so that no app code needs to change during Phase 1.

## 1. Package shape

```
packages/blac-compat/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts            ← public surface; re-exports
    ├── Cubit.ts            ← v0/v1-compatible Cubit
    ├── Bloc.ts             ← v1-compatible Bloc (event-driven, stubbed — not used in app code)
    ├── BlocBase.ts         ← alias for StateContainer with P generic discarded
    ├── Blac.ts             ← Blac singleton façade with .getBloc, .getAllBlocs, .addPlugin
    ├── BlacEvent.ts        ← alias type
    ├── BlocObserver.ts     ← v0 BlocObserver adapter → BlacPlugin
    ├── BlacReact.ts        ← v0 BlacReact adapter
    ├── BlocProvider.tsx    ← v0 BlocProvider adapter (uses E1)
    ├── useBloc.ts          ← v1 useBloc adapter (translates options)
    ├── statics.ts          ← reads `static isolated` / `keepAlive` on classes
    ├── plugins/
    │   └── ObserverPlugin.ts
    └── __tests__/
```

## 2. Public surface (what consumers import)

```ts
// from 'blac' (v0, via pnpm override)
export { Cubit, BlacReact, BlocObserver };

// from 'blac-next' (v1, via workspace alias)
export { Blac, Cubit, Bloc, BlocBase, BlacEvent };
export type {
  BlocConstructor,
  BlocGeneric,
  BlocState,
  BlocHookDependencyArrayFn,
  InferPropsFromGeneric,
};

// from '@blac/react' (v1, via workspace alias)
export { useBloc };
```

## 3. `Cubit` — drop-in for both v0 and v1

```ts
// src/Cubit.ts
import { Cubit as V2Cubit } from '@blac/core';

export abstract class Cubit<S, _P = null> extends V2Cubit<S> {
  // P generic is accepted for type compatibility but discarded.

  // v1 had a public props field; some cubits read this.
  props: any = null;

  // emit() is inherited from v2 Cubit.
  // patch() is inherited from v2 Cubit.
}
```

**Notes.**

- v2's `Cubit.emit` is _public_ (v1 also exposes public `emit`), so no signature change.
- v1's `_pushState`, `_dispose`, `_id`, `_observer.subscribe` were internal — no app code calls them, so we don't ship those.
- The `P` type parameter is preserved to keep TypeScript happy for `class X extends Cubit<S, P>` and `BlocBase<S, P>` form.

## 4. `Blac` — singleton façade

```ts
// src/Blac.ts
import {
  ensure,
  acquire,
  release,
  getAll,
  getPluginManager,
  getRegistry,
  type StateContainerConstructor,
} from '@blac/core';
import { applyStaticConfig } from './statics';

class BlacFacade {
  // v1 signature was: getBloc(C, { id?, props?, instanceRef? }) => InstanceType<C>
  // We forward to v2 ensure() and apply props if given.
  getBloc<C extends StateContainerConstructor>(
    BlocClass: C,
    options?: { id?: string; props?: any; instanceRef?: string },
  ): InstanceType<C> {
    applyStaticConfig(BlocClass); // honors static keepAlive / isolated (E2/E3)
    const instance = ensure(BlocClass, options?.id) as InstanceType<C>;
    if (options?.props !== undefined) {
      // Best-effort props injection for the shim phase.
      // Cubits with an explicit initWithProps() take priority.
      if (typeof (instance as any).initWithProps === 'function') {
        (instance as any).initWithProps(options.props);
      } else {
        (instance as any).props = options.props;
      }
    }
    return instance;
  }

  getAllBlocs<C extends StateContainerConstructor>(
    BlocClass: C,
    _options?: { searchIsolated?: boolean },
  ): InstanceType<C>[] {
    return getAll(BlocClass) as InstanceType<C>[];
  }

  addPlugin(plugin: any) {
    getPluginManager().install(plugin);
  }

  // v1 used in some tests
  resetInstance() {
    getRegistry().clearAll?.();
  }
}

const facade = new BlacFacade();

export const Blac = Object.assign(facade, {
  getInstance: () => facade,
  // static-style entry points that mirrored v1
  getBloc: facade.getBloc.bind(facade),
  getAllBlocs: facade.getAllBlocs.bind(facade),
  addPlugin: facade.addPlugin.bind(facade),
});
```

**Important.** Tests that do `vi.spyOn(Blac, 'getBloc')` keep working because `Blac.getBloc` is a real bound method on a real object.

## 5. `BlocObserver` — adapter to BlacPlugin

```ts
// src/BlocObserver.ts
import { getPluginManager, type BlacPlugin } from '@blac/core';

export class BlocObserver {
  constructor(
    private readonly methods: {
      onChange?: (
        bloc: any,
        event: { currentState: any; nextState: any },
      ) => void;
      onTransition?: (bloc: any, event: any) => void;
      onBlocAdded?: (bloc: any) => void;
      onBlocRemoved?: (bloc: any) => void;
    } = {},
  ) {
    const plugin: BlacPlugin = {
      name: `BlocObserverAdapter-${Math.random().toString(36).slice(2, 8)}`,
      version: '0.0.1',
      onInstanceCreated: (inst) => this.methods.onBlocAdded?.(inst),
      onStateChanged: (inst, prev, curr) =>
        this.methods.onChange?.(inst, { currentState: prev, nextState: curr }),
      onInstanceDisposed: (inst) => this.methods.onBlocRemoved?.(inst),
    };
    getPluginManager().install(plugin);
  }
}
```

The v0 `BlocObserver` in `user-app/state.ts` continues to work via this adapter. No app change required.

## 6. `BlacReact` — v0 root container

```ts
// src/BlacReact.ts
import { ensure } from '@blac/core';
import type { Cubit } from './Cubit';
import { BlocObserver } from './BlocObserver';
import { BlocProvider } from './BlocProvider';
import { useBloc } from './useBloc';

export class BlacReact {
  // v0 signature: new BlacReact(blocs: BlocBase[], { observer? })
  constructor(blocs: any[], options?: { observer?: BlocObserver }) {
    // Register all initial blocs in v2 registry under their default key.
    // user-fe currently builds blocs imperatively (`new XCubit()`) and passes them in;
    // we adopt them into the registry as the default-keyed instance.
    for (const bloc of blocs) {
      const ctor = bloc.constructor;
      // ensure() will reuse the instance if already registered, otherwise this acts as registration.
      const inst = ensure(ctor);
      // If app passed a pre-constructed instance, prefer that.
      if (inst !== bloc) {
        // copy state into registry instance to avoid two divergent copies
        Object.assign(inst, bloc);
      }
    }
    // observer option already self-installs via constructor.
    void options;
  }

  // v0 destructured these off the BlacReact instance:
  // const { useBloc, BlocProvider } = state;
  useBloc = useBloc;
  BlocProvider = BlocProvider;

  // v0 also had withBlocProvider — used in 0 places in user-fe. Skip.
}
```

**Caveat / known limitation.** v0's `BlacReact` _truly_ scoped blocs to a per-app instance. v2 has a single global registry per process. For user-fe this is fine because there's one `BlacReact` per app, and the apps run in separate bundles. If we ever needed two coexisting apps in one runtime, the shim would need to swap registries via `setRegistry()`.

## 7. `BlocProvider` — v0 component → E1

```tsx
// src/BlocProvider.tsx
import { BlocProvider as V2Provider } from '@blac/react'; // from E1
import { ensure } from '@blac/core';
import { useMemo } from 'react';

export function BlocProvider({
  bloc,
  children,
}: {
  bloc: any | ((id: string) => any);
  children: React.ReactNode;
}) {
  // v0 accepted either an instance or a factory. We need a stable instanceId
  // so descendants can resolve the same instance.
  const id = useMemo(() => {
    const inst = typeof bloc === 'function' ? bloc('provider') : bloc;
    // Register the supplied instance under a stable id (we use the instance's identity).
    const ctor = inst.constructor;
    const instanceKey = `provider-${(inst as any).instanceId ?? Math.random().toString(36).slice(2)}`;
    const registryInstance = ensure(ctor, instanceKey);
    // Adopt the provided instance's state into the registry instance.
    if (registryInstance !== inst) Object.assign(registryInstance, inst);
    return instanceKey;
  }, [bloc]);

  return <V2Provider instanceId={id}>{children}</V2Provider>;
}
```

The 3 v0 `<BlocProvider bloc={...}>` JSX sites need no code change.

## 8. `useBloc` — v1 hook adapter

```ts
// src/useBloc.ts
import { useBloc as v2UseBloc } from '@blac/react';
import { useEffect } from 'react';

export function useBloc(BlocClass: any, options?: any) {
  // Map v1 options → v2 options.
  const v2Options = options && {
    instanceId: options.id,
    dependencies: options.dependencySelector,
    onMount: options.onMount,
    // E3 fallback: if class has `static isolated = true`, the v2 hook auto-keys.
  };

  const [state, bloc, ref] = v2UseBloc(BlocClass, v2Options);

  // v1 had a `props` option that injected props into the bloc.
  // The user's chosen pattern is `useEffect(() => bloc.initWithProps(props))`,
  // so we emulate it transparently for shim users until the codemod rewrites them.
  if (options?.props !== undefined) {
    // run once on mount with whatever props was passed.
    // intentionally not depending on props — matches v1 lifecycle of single ctor.
    // (codemod fixes this in Phase 2)
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      if (typeof (bloc as any).initWithProps === 'function') {
        (bloc as any).initWithProps(options.props);
      } else {
        (bloc as any).props = options.props;
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
  }

  // v1 returned a 2-tuple. Drop the ref.
  return [state, bloc] as const;
}
```

**Warning.** The conditional `useEffect` violates the rules of hooks if `options.props` toggles between defined/undefined across renders. In practice user-fe passes a stable `options` shape per call site — but the codemod removes this branch entirely in Phase 2, eliminating the hazard.

## 9. `Bloc` (event-driven) — stub

No app code uses `extends Bloc<E, S>`. Ship a stub that throws on `add()` with a clear migration message in case anyone adds new usage during the migration window.

## 10. `applyStaticConfig` helper

```ts
// src/statics.ts
import { blac } from '@blac/core';

const applied = new WeakSet<Function>();

export function applyStaticConfig(Class: any) {
  if (applied.has(Class)) return;
  applied.add(Class);
  if (Class.keepAlive === true) blac({ keepAlive: true })(Class);
  // `isolated` is handled inside useBloc via E3 — nothing to do here for now.
}
```

Called from `Blac.getBloc` and inside the shim's `useBloc`.

## 11. Workspace wiring

### `pnpm.overrides` in root `package.json`

```json
{
  "pnpm": {
    "overrides": {
      "blac": "workspace:@9amhealth/blac-compat@*"
    }
  }
}
```

### `packages/blac-next/package.json` (existing v1 core)

Replace `main`/`module`/`types` with re-exports from `@9amhealth/blac-compat`. Keep the package present so workspace dependencies don't break.

```json
{
  "name": "blac-next",
  "version": "1.0.30",
  "main": "src/reexport.ts",
  "module": "src/reexport.ts",
  "types": "src/reexport.ts",
  "dependencies": { "@9amhealth/blac-compat": "workspace:*" }
}
```

```ts
// packages/blac-next/src/reexport.ts
export * from '@9amhealth/blac-compat';
```

### `packages/blac-react/package.json`

Same treatment.

## 12. What the shim deliberately does NOT do

- It does **not** ship v0's `BlocBuilder` / `BlocConsumer` / `withBlocProvider` — none are used in user-fe.
- It does **not** preserve v1's `BlocBase` props generic in a meaningful way — props is now a plain field on the cubit, not a typed slot.
- It does **not** retain v1's `addons` array — there are zero `static addons` in app code today. If a new file adds one during the migration, the shim logs a runtime warning to convert to a plugin.
