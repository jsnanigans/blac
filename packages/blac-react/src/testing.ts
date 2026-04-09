import type { ReactElement } from 'react';
import type { RenderResult } from '@testing-library/react';
import type { StateContainerConstructor } from '@blac/core';
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
  instanceKey?: string;
}

export function renderWithBloc<T extends StateContainerConstructor>(
  ui: ReactElement,
  options: RenderWithBlocOptions<T>,
): RenderResult & { bloc: InstanceType<T> } {
  const { bloc: BlocClass, instanceKey, ...stubOptions } = options;

  const previous = getRegistry();
  const testRegistry = new StateContainerRegistry();
  setRegistry(testRegistry);

  const instance = createCubitStub(BlocClass, stubOptions);
  registerOverride(BlocClass, instance, instanceKey);

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
