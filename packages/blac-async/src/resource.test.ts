import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { StateContainerRegistry } from '@blac/core';
import { probe } from './testUtils';

afterEach(() => vi.useRealTimers());

const setup = (options = {}) => {
  const Probe = probe({ auto: true, ...options });
  const registry = new StateContainerRegistry();
  return {
    Probe,
    registry,
    acquire: (refId = 'a') => registry.acquire(Probe, 'k', { refId }),
    release: (refId = 'a') => registry.release(Probe, 'k', false, refId),
  };
};

describe('resource', () => {
  it('loads on activation and stores success in the slot', async () => {
    const { acquire } = setup();
    const p = acquire();
    expect(p.state.slot.status).toBe('loading');
    p.calls[0].d.resolve(7);
    await p.r.load();
    expect(p.state.slot).toEqual({ status: 'success', data: 7 });
  });

  it('is latest-wins: a reload aborts the earlier call and ignores its result', async () => {
    const p = setup().acquire();
    const second = p.r.reload();
    expect(p.calls[0].signal.aborted).toBe(true);
    p.calls[1].d.resolve(2);
    p.calls[0].d.resolve(1);
    await second;
    expect(p.state.slot.data).toBe(2);
  });

  it('dedupes load() while in flight', () => {
    const p = setup().acquire();
    void p.r.load();
    expect(p.calls).toHaveLength(1);
  });

  it('skips load() while fresh, and loads again once stale', async () => {
    vi.useFakeTimers();
    const p = setup({ auto: false, staleTime: 1000 }).acquire();
    const first = p.r.load();
    p.calls[0].d.resolve(1);
    await first;
    await p.r.load();
    expect(p.calls).toHaveLength(1);
    vi.advanceTimersByTime(1000);
    void p.r.load();
    expect(p.calls).toHaveLength(2);
  });

  it('aborts on release, restores the slot, and reloads on next activation', () => {
    const { acquire, release } = setup();
    const p = acquire();
    release();
    expect(p.calls[0].signal.aborted).toBe(true);
    expect(p.state.slot.status).toBe('idle');
    acquire('b');
    expect(p.calls).toHaveLength(2);
    expect(p.calls[1].signal.aborted).toBe(false);
  });

  it('stores errors and keeps the previous data', async () => {
    const p = setup().acquire();
    p.calls[0].d.resolve(1);
    await p.r.load();
    const again = p.r.reload();
    p.calls[1].d.reject(new Error('boom'));
    await again;
    expect(p.state.slot.status).toBe('error');
    expect(p.state.slot.data).toBe(1);
  });

  it('restores an error left before the reload when deactivated mid-load', async () => {
    const { acquire, release } = setup();
    const p = acquire();
    p.calls[0].d.reject(new Error('boom'));
    await p.r.load();
    void p.r.reload();
    release();
    expect(p.state.slot.status).toBe('error');
  });

  it('set writes success without starting a load', () => {
    const p = setup({ auto: false }).acquire();
    p.r.set((n = 0) => n + 1);
    expect(p.state.slot).toEqual({ status: 'success', data: 1 });
    expect(p.calls).toHaveLength(0);
  });

  it('set aborts a load in flight and keeps its own write', async () => {
    const p = setup().acquire();
    p.r.set(() => 5);
    expect(p.calls[0].signal.aborted).toBe(true);
    p.calls[0].d.resolve(1);
    await p.calls[0].d.promise;
    expect(p.state.slot).toEqual({ status: 'success', data: 5 });
  });

  it('ignores load and reload while disabled', async () => {
    let on = false;
    const p = setup({ enabled: () => on }).acquire();
    await p.r.reload();
    expect(p.calls).toHaveLength(0);
    expect(p.state.slot.status).toBe('idle');
    on = true;
    void p.r.load();
    expect(p.calls).toHaveLength(1);
  });
});
