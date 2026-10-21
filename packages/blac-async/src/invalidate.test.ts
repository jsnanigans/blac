import { describe, expect, it } from 'vite-plus/test';
import { StateContainerRegistry } from '@blac/core';
import { invalidate } from './invalidate';
import { probe } from './testUtils';

const Probe = probe({ tags: () => ['user'] });

describe('invalidate', () => {
  it('reloads an active resource that has loaded', async () => {
    const registry = new StateContainerRegistry();
    const p = registry.acquire(Probe, 'k', { refId: 'a' });
    void p.r.load();
    p.calls[0].d.resolve(1);
    await p.r.load();
    invalidate('user', registry);
    expect(p.calls).toHaveLength(2);
  });

  it('marks an inactive keepAlive instance stale and loads on next activation', async () => {
    const registry = new StateContainerRegistry();
    const p = registry.acquire(Probe, 'k', { refId: 'a' });
    void p.r.load();
    p.calls[0].d.resolve(1);
    await p.r.load();
    registry.release(Probe, 'k', false, 'a');

    invalidate('user', registry);
    expect(p.calls).toHaveLength(1);

    registry.acquire(Probe, 'k', { refId: 'b' });
    expect(p.calls).toHaveLength(2);
  });

  it('only reaches resources in the given registry', () => {
    const a = new StateContainerRegistry();
    const b = new StateContainerRegistry();
    const pa = a.acquire(Probe, 'k', { refId: 'a' });
    const pb = b.acquire(Probe, 'k', { refId: 'a' });
    void pa.r.load();
    void pb.r.load();
    invalidate('user', a);
    expect(pa.calls).toHaveLength(2);
    expect(pb.calls).toHaveLength(1);
  });

  it('forgets a resource once its instance is disposed', () => {
    const registry = new StateContainerRegistry();
    const p = registry.acquire(Probe, 'k', { refId: 'a' });
    void p.r.load();
    p.dispose();
    invalidate('user', registry);
    expect(p.calls).toHaveLength(1);
  });
});
