import type { ReactElement } from 'react';
import {
  StateContainerRegistry,
  getRegistry,
  setRegistry,
} from '@blac/core';
import { render } from '@testing-library/react';

export function renderWithRegistry(
  ui: ReactElement,
  setup: (registry: StateContainerRegistry) => void,
) {
  const previous = getRegistry();
  const testRegistry = new StateContainerRegistry();
  setRegistry(testRegistry);

  setup(testRegistry);

  const renderResult = render(ui);

  const originalUnmount = renderResult.unmount;
  renderResult.unmount = () => {
    originalUnmount();
    setRegistry(previous);
  };

  return renderResult;
}
