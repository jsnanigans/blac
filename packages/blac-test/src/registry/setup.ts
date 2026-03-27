import {
  StateContainerRegistry,
  getRegistry,
  setRegistry,
} from '@blac/core';

export function blacTestSetup(): void {
  let savedRegistry: StateContainerRegistry;

  beforeEach(() => {
    savedRegistry = getRegistry();
    setRegistry(new StateContainerRegistry());
  });

  afterEach(() => {
    setRegistry(savedRegistry);
  });
}
