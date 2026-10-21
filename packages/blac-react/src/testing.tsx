import { useState, type ComponentType, type ReactElement } from 'react';
import type { RenderResult } from '@testing-library/react';
import type {
  ExtractArgs,
  StateContainerConstructor,
  StateContainerRegistry,
} from '@blac/core';
import {
  registerOverride,
  createCubitStub,
  withTestRegistry,
  type CubitStubOptions,
} from '@blac/core/testing';
import { render } from '@testing-library/react';
import { RegistryProvider } from './RegistryProvider';

interface RenderWithBlocOptions<
  T extends StateContainerConstructor,
> extends CubitStubOptions<T> {
  bloc: T;
  /** Args used to resolve which instance the stub is registered under. */
  args?: ExtractArgs<T>;
}

export function renderWithBloc<T extends StateContainerConstructor>(
  ui: ReactElement,
  options: RenderWithBlocOptions<T>,
): RenderResult & { bloc: InstanceType<T> } {
  const { bloc: BlocClass, args, ...stubOptions } = options;

  const { registry, instance } = withTestRegistry((registry) => {
    const instance = createCubitStub(BlocClass, {
      ...stubOptions,
      args,
    } as any);
    registerOverride(BlocClass, instance, args);
    return { registry, instance };
  });

  return { ...renderInRegistry(ui, registry), bloc: instance };
}

export function renderWithRegistry(
  ui: ReactElement,
  setup: (registry: StateContainerRegistry) => void,
): RenderResult {
  const registry = withTestRegistry((registry) => {
    setup(registry);
    return registry;
  });
  return renderInRegistry(ui, registry);
}

type BlocSeeds<T extends readonly StateContainerConstructor[]> = {
  [K in keyof T]: [bloc: T[K], options?: CubitStubOptions<T[K]>];
};

function seedRegistry<T extends readonly StateContainerConstructor[]>(
  seeds: BlocSeeds<T>,
): StateContainerRegistry {
  return withTestRegistry((registry) => {
    for (const [BlocClass, options] of seeds as ReadonlyArray<
      [StateContainerConstructor, CubitStubOptions<any>?]
    >) {
      registerOverride(
        BlocClass,
        createCubitStub(BlocClass, options),
        options?.args,
      );
    }
    return registry;
  });
}

/**
 * Renders `ui` in a fresh registry holding a stub of each seeded bloc.
 * Each seed is `[BlocClass, { args, state, methods, deps }?]`.
 */
export function renderWithBlocs<
  const T extends readonly StateContainerConstructor[],
>(ui: ReactElement, seeds: BlocSeeds<T>): RenderResult {
  return renderInRegistry(ui, seedRegistry(seeds));
}

function SeededRegistry({
  seeds,
  children,
}: {
  seeds: BlocSeeds<readonly StateContainerConstructor[]>;
  children: ReactElement;
}): ReactElement {
  const [registry] = useState(() => seedRegistry(seeds));
  return <RegistryProvider registry={registry}>{children}</RegistryProvider>;
}

/**
 * Storybook decorator: renders each story in its own registry holding a stub
 * of each seeded bloc. Seeds are `[BlocClass, { args, state, methods, deps }?]`.
 */
export function withBlocs<const T extends readonly StateContainerConstructor[]>(
  seeds: BlocSeeds<T>,
): (Story: ComponentType) => ReactElement {
  return (Story) => (
    <SeededRegistry seeds={seeds}>
      <Story />
    </SeededRegistry>
  );
}

function renderInRegistry(
  ui: ReactElement,
  registry: StateContainerRegistry,
): RenderResult {
  return render(ui, {
    wrapper: ({ children }) => (
      <RegistryProvider registry={registry}>{children}</RegistryProvider>
    ),
  });
}
