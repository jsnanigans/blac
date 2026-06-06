import type { ReactElement } from 'react';
import type { RenderResult } from '@testing-library/react';
import type { ExtractArgs, StateContainerConstructor } from '@blac/core';
import { StateContainerRegistry, getRegistry, setRegistry } from '@blac/core';
import {
  registerOverride,
  createCubitStub,
  type CubitStubOptions,
} from '@blac/core/testing';
import { render } from '@testing-library/react';

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

  const previous = getRegistry();
  const testRegistry = new StateContainerRegistry();
  setRegistry(testRegistry);

  // Pass args explicitly so createCubitStub calls [INIT_CONFIG] → init().
  const instance = createCubitStub(BlocClass, { ...stubOptions, args } as any);
  registerOverride(BlocClass, instance, args);

  let renderResult: RenderResult;
  try {
    renderResult = render(ui);
  } catch (e) {
    setRegistry(previous);
    throw e;
  }

  const originalUnmount = renderResult.unmount;
  renderResult.unmount = () => {
    originalUnmount();
    setRegistry(previous);
  };

  return {
    ...renderResult,
    bloc: instance,
  };
}

export function renderWithRegistry(
  ui: ReactElement,
  setup: (registry: StateContainerRegistry) => void,
): RenderResult {
  const previous = getRegistry();
  const testRegistry = new StateContainerRegistry();
  setRegistry(testRegistry);

  try {
    setup(testRegistry);
  } catch (e) {
    setRegistry(previous);
    throw e;
  }

  let renderResult: RenderResult;
  try {
    renderResult = render(ui);
  } catch (e) {
    setRegistry(previous);
    throw e;
  }

  const originalUnmount = renderResult.unmount;
  renderResult.unmount = () => {
    originalUnmount();
    setRegistry(previous);
  };

  return renderResult;
}
