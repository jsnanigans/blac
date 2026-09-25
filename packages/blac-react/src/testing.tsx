import type { ReactElement } from 'react';
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
    // Pass args explicitly so createCubitStub calls [INIT_CONFIG] → init().
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
