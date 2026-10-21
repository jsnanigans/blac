import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { Cubit, StateContainerRegistry } from '@blac/core';
import { configureAsync, resetAsyncConfig } from './config';
import { invalidate } from './invalidate';
import { mutation } from './mutation';
import { resource } from './resource';
import { idle, type AsyncState } from './types';

afterEach(resetAsyncConfig);

class Store extends Cubit<{
  load: AsyncState<string>;
  save: AsyncState<string>;
}> {
  constructor() {
    super({ load: idle(), save: idle() });
  }
  fetch = vi.fn<() => Promise<string>>();
  put = vi.fn<(v: string) => Promise<string>>();
  skipLoadError = vi.fn(() => false as const);

  load = resource(this, 'load', () => this.fetch(), {
    tags: () => ['store'],
    onError: this.skipLoadError,
  });
  save = mutation(this, 'save', (v: string) => this.put(v), {
    success: 'Saved',
    invalidates: () => ['store'],
  });
}

const make = () => {
  const registry = new StateContainerRegistry();
  return { registry, store: registry.acquire(Store, 'k', { refId: 'a' }) };
};

describe('configureAsync', () => {
  it('reports mutation errors and fills the error slot', async () => {
    const onError = vi.fn();
    configureAsync({ onError });
    const { store } = make();
    const error = new Error('no');
    store.put.mockRejectedValue(error);

    await expect(store.save('x')).resolves.toBeUndefined();

    expect(store.state.save.status).toBe('error');
    expect(onError).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ kind: 'mutation', key: 'save' }),
    );
  });

  it('lets a per-call onError suppress the global one', async () => {
    const onError = vi.fn();
    configureAsync({ onError });
    const { store } = make();
    store.fetch.mockRejectedValue(new Error('404'));

    await store.load.load();

    expect(store.skipLoadError).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  it('retries once when retryOn allows it', async () => {
    const retryOn = vi.fn().mockResolvedValue(true);
    configureAsync({ retryOn });
    const { store } = make();
    store.put.mockRejectedValueOnce(new Error('401')).mockResolvedValue('ok');

    await expect(store.save('x')).resolves.toBe('ok');

    expect(store.put).toHaveBeenCalledTimes(2);
    expect(retryOn).toHaveBeenCalledTimes(1);
  });

  it('calls onSuccess with the message, and invalidates tags after a mutation', async () => {
    const onSuccess = vi.fn();
    configureAsync({ onSuccess });
    const { registry, store } = make();
    store.fetch.mockResolvedValue('v');
    await store.load.load();
    store.put.mockResolvedValue('saved');

    await store.save('x');

    expect(onSuccess).toHaveBeenCalledWith(
      'Saved',
      expect.objectContaining({ data: 'saved' }),
    );
    expect(store.fetch).toHaveBeenCalledTimes(2);
    invalidate('other', registry);
    expect(store.fetch).toHaveBeenCalledTimes(2);
  });
});
