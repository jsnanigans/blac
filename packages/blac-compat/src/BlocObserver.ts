import {
  getPluginManager,
  type BlacPlugin,
  type StateContainerInstance,
} from '@blac/core';

/**
 * Methods that v0's `BlocObserver` could implement. Only the subset used by
 * `user-fe-reviews` is forwarded.
 */
export interface BlocObserverMethods {
  onChange?: (
    bloc: StateContainerInstance,
    event: { currentState: unknown; nextState: unknown },
  ) => void;
  onBlocAdded?: (bloc: StateContainerInstance) => void;
  onBlocRemoved?: (bloc: StateContainerInstance) => void;
}

let observerCounter = 0;

/**
 * v0 `BlocObserver` adapter. Constructs a `BlacPlugin` that forwards v2
 * lifecycle hooks to the legacy observer callbacks and installs it
 * immediately on the global plugin manager.
 *
 * v0 supported `onTransition` as well, but no app code reads it; if needed,
 * extend `BlocObserverMethods`.
 */
export class BlocObserver {
  constructor(private readonly methods: BlocObserverMethods = {}) {
    const plugin: BlacPlugin = {
      name: `BlocObserverAdapter-${++observerCounter}`,
      version: '0.0.1',
      onInstanceCreated: (inst) => {
        this.methods.onBlocAdded?.(inst);
      },
      onStateChanged: (inst, prev, curr) => {
        this.methods.onChange?.(inst, {
          currentState: prev,
          nextState: curr,
        });
      },
      onInstanceDisposed: (inst) => {
        this.methods.onBlocRemoved?.(inst);
      },
    };
    getPluginManager().install(plugin);
  }
}
