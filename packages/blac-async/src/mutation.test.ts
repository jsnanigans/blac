import { describe, expect, it, vi } from 'vite-plus/test';
import { Cubit, StateContainerRegistry } from '@blac/core';
import { mutation } from './mutation';
import { resource } from './resource';
import { idle, type AsyncState } from './types';

class Prefs extends Cubit<{
  prefs: AsyncState<string[]>;
  add: AsyncState<void>;
}> {
  constructor() {
    super({ prefs: idle(), add: idle() });
  }
  put = vi.fn<(v: string) => Promise<void>>();

  prefs = resource(this, 'prefs', async () => ['a']);
  add = mutation(this, 'add', (v: string) => this.put(v), {
    optimistic: {
      target: this.prefs,
      apply: (list = [], v) => [...list, v],
    },
  });
}

const make = () =>
  new StateContainerRegistry().acquire(Prefs, 'k', { refId: 'a' });

describe('mutation', () => {
  it('resolves the settled state, also for void results', async () => {
    const p = make();
    p.put.mockResolvedValue(undefined);
    await expect(p.add('b')).resolves.toEqual({
      status: 'success',
      data: undefined,
    });
  });

  it('applies an optimistic write and rolls it back on failure', async () => {
    const p = make();
    await p.prefs.load();
    p.put.mockRejectedValue(new Error('no'));

    const pending = p.add('b');
    expect(p.state.prefs.data).toEqual(['a', 'b']);
    await pending;

    expect(p.state.prefs).toEqual({ status: 'success', data: ['a'] });
  });

  it('keeps a newer write when an older optimistic call fails', async () => {
    const p = make();
    await p.prefs.load();
    p.put.mockRejectedValue(new Error('no'));

    const pending = p.add('b');
    p.prefs.set(() => ['z']);
    await pending;

    expect(p.state.prefs.data).toEqual(['z']);
  });
});
