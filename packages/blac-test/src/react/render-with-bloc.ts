import type { ReactElement } from 'react';
import type { StateContainerConstructor } from '@blac/core';
import {
  StateContainerRegistry,
  getRegistry,
  setRegistry,
} from '@blac/core';
import { render } from '@testing-library/react';
import { registerOverride } from '../registry/overrides';
import { createCubitStub, type CubitStubOptions } from '../stubs/cubit-stub';

interface RenderWithBlocOptions<T extends StateContainerConstructor>
  extends CubitStubOptions<T> {
  bloc: T;
  instanceKey?: string;
}

export function renderWithBloc<T extends StateContainerConstructor>(
  ui: ReactElement,
  options: RenderWithBlocOptions<T>,
) {
  const { bloc: BlocClass, instanceKey, ...stubOptions } = options;

  const previous = getRegistry();
  const testRegistry = new StateContainerRegistry();
  setRegistry(testRegistry);

  const instance = createCubitStub(BlocClass, stubOptions);
  registerOverride(BlocClass, instance, instanceKey);

  const renderResult = render(ui);

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
