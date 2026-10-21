import { describe, it, expect, vi } from 'vite-plus/test';
import { StateContainerRegistry } from './StateContainerRegistry';
import { Cubit } from './Cubit';
import { onActivated } from './onActivated';

class Tracked extends Cubit<{ n: number }> {
  activations = 0;
  deactivations = 0;
  signals: AbortSignal[] = [];
  constructor() {
    super({ n: 0 });
  }
  protected onActivate(signal: AbortSignal): void {
    this.activations++;
    this.signals.push(signal);
  }
  protected onDeactivate(): void {
    this.deactivations++;
  }
}

class KeptAlive extends Tracked {
  static keepAlive = true;
}

describe('activation lifecycle', () => {
  it('fires once per ownership span and aborts the signal on deactivate', () => {
    const registry = new StateContainerRegistry();
    // keepAlive so the entry survives deactivation and can be re-acquired.
    const bloc = registry.acquire(KeptAlive, 'k', { refId: 'a' });

    expect(bloc.activations).toBe(1);
    // A second ref inside the same span must not re-activate.
    registry.acquire(KeptAlive, 'k', { refId: 'b' });
    expect(bloc.activations).toBe(1);
    expect(bloc.signals[0].aborted).toBe(false);

    registry.release(KeptAlive, 'k', false, 'a');
    expect(bloc.deactivations).toBe(0);

    registry.release(KeptAlive, 'k', false, 'b');
    expect(bloc.deactivations).toBe(1);
    expect(bloc.signals[0].aborted).toBe(true);

    // Re-acquiring starts a new span with a fresh, unaborted signal.
    registry.acquire(KeptAlive, 'k', { refId: 'c' });
    expect(bloc.activations).toBe(2);
    expect(bloc.signals[1].aborted).toBe(false);
  });

  it('aborts the signal on dispose without firing onDeactivate', () => {
    const registry = new StateContainerRegistry();
    const bloc = registry.acquire(Tracked, 'd', { refId: 'a' });

    registry.release(Tracked, 'd', false, 'a');

    expect(bloc.$blac.disposed).toBe(true);
    expect(bloc.signals[0].aborted).toBe(true);
    expect(bloc.deactivations).toBe(0);
  });
});

describe('onActivated', () => {
  it('runs on each activation with its signal, and not after unsubscribe', () => {
    const registry = new StateContainerRegistry();
    const bloc = registry.acquire(KeptAlive, 'k', { refId: 'a' });
    const signals: AbortSignal[] = [];

    const stop = onActivated(bloc, (signal) => signals.push(signal));
    expect(signals).toHaveLength(1);

    registry.release(KeptAlive, 'k', false, 'a');
    expect(signals[0].aborted).toBe(true);
    registry.acquire(KeptAlive, 'k', { refId: 'b' });
    expect(signals).toHaveLength(2);

    stop();
    registry.release(KeptAlive, 'k', false, 'b');
    registry.acquire(KeptAlive, 'k', { refId: 'c' });
    expect(signals).toHaveLength(2);
  });

  it('registered before activation, fires on the first owner and stops on dispose', () => {
    const registry = new StateContainerRegistry();
    const bloc = registry.ensure(Tracked, 'k');
    const handler = vi.fn();
    onActivated(bloc, handler);
    expect(handler).not.toHaveBeenCalled();

    registry.acquire(Tracked, 'k', { refId: 'a' });
    expect(handler).toHaveBeenCalledTimes(1);

    bloc.dispose();
    expect(handler.mock.calls[0][0].aborted).toBe(true);
  });
});

describe('$blac.registry', () => {
  it('is the registry that created the instance', () => {
    const registry = new StateContainerRegistry();
    const bloc = registry.ensure(Tracked, 'k');
    expect(bloc.$blac.registry).toBe(registry);
  });
});
