import { describe, it, expect, vi, afterEach } from 'vite-plus/test';
import { acquire, release, getRegistry } from '@blac/core';
import { Cubit } from '../Cubit';
import { BlocObserver } from '../BlocObserver';

class ObservedCubit extends Cubit<{ n: number }> {
  constructor() {
    super({ n: 0 });
  }
  inc() {
    this.patch({ n: this.state.n + 1 });
  }
}

// BlocObserver wires lifecycle hooks via the (global) PluginManager. The
// PluginManager binds to whatever registry was active when it was first
// created, so `blacTestSetup`'s registry swap would silently disconnect it.
// Instead, install observers against the global registry and clean up
// explicitly between tests.
afterEach(() => {
  getRegistry().clearAll();
});

describe('BlocObserver adapter', () => {
  it('forwards onBlocAdded on instance creation', () => {
    const onBlocAdded = vi.fn();
    new BlocObserver({ onBlocAdded });

    const inst = acquire(ObservedCubit, 'obs-added');
    expect(onBlocAdded).toHaveBeenCalledWith(inst);
    release(ObservedCubit, 'obs-added');
  });

  it('forwards onChange with v0-shaped { currentState, nextState } payload', async () => {
    const onChange = vi.fn();
    new BlocObserver({ onChange });

    const inst = acquire(ObservedCubit, 'obs-change');
    inst.inc();
    // State-change notifications are queued via microtask; flush before asserting.
    await Promise.resolve();
    await Promise.resolve();

    expect(onChange).toHaveBeenCalledTimes(1);
    const firstCall = onChange.mock.calls[0];
    expect(firstCall).toBeDefined();
    const [, event] = firstCall as [
      unknown,
      { currentState: unknown; nextState: unknown },
    ];
    expect(event.currentState).toEqual({ n: 0 });
    expect(event.nextState).toEqual({ n: 1 });

    release(ObservedCubit, 'obs-change');
  });

  it('forwards onBlocRemoved on dispose', () => {
    const onBlocRemoved = vi.fn();
    new BlocObserver({ onBlocRemoved });

    acquire(ObservedCubit, 'obs-removed');
    release(ObservedCubit, 'obs-removed');
    expect(onBlocRemoved).toHaveBeenCalled();
  });
});
