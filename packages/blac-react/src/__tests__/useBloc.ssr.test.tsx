import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import { Cubit, acquire } from '@blac/core';
import {
  autoTrackInit,
  autoTrackSubscribe,
  autoTrackSnapshot,
  noTrackInit,
  noTrackSubscribe,
} from '@blac/adapter';
import { useBloc } from '../useBloc';
import { blacTestSetup } from '@blac/core/testing';

blacTestSetup();

class SsrBloc extends Cubit<{ n: number }> {
  constructor() {
    super({ n: 0 });
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useBloc — SSR', () => {
  it('autoTrackInit falls back to noTrackInit when window is undefined', () => {
    vi.stubGlobal('window', undefined);

    const instance = acquire(SsrBloc);
    const ssrResult = autoTrackInit(instance);
    const noTrackResult = noTrackInit(instance);

    // In SSR mode: no getter state and no proxy (same as noTrackInit)
    expect(ssrResult.getterState).toBeNull();
    expect(ssrResult.proxiedBloc).toBe(instance);
    expect(ssrResult.getterState).toBe(noTrackResult.getterState);
  });

  it('autoTrackSubscribe behaves like noTrackSubscribe in SSR — fires on every change', () => {
    vi.stubGlobal('window', undefined);

    const instance = acquire(SsrBloc);
    const adapterState = autoTrackInit(instance);

    const ssrCalls: number[] = [];
    const noTrackCalls: number[] = [];

    const unsubSsr = autoTrackSubscribe(
      instance,
      adapterState,
    )(() => {
      ssrCalls.push(instance.state.n);
    });
    const unsubNoTrack = noTrackSubscribe(instance)(() => {
      noTrackCalls.push(instance.state.n);
    });

    instance.emit({ n: 1 });
    instance.emit({ n: 2 });

    unsubSsr();
    unsubNoTrack();

    expect(ssrCalls).toEqual([1, 2]);
    expect(noTrackCalls).toEqual([1, 2]);
  });

  it('autoTrackSnapshot returns raw state (no proxy) in SSR', () => {
    vi.stubGlobal('window', undefined);

    const instance = acquire(SsrBloc);
    const adapterState = autoTrackInit(instance);

    const snapshot = autoTrackSnapshot(instance, adapterState);
    const result = snapshot();

    // In SSR: returns instance.state directly, not a proxy
    expect(result).toBe(instance.state);
  });

  it('useBloc in renderToString returns initial state without crashing', () => {
    vi.stubGlobal('window', undefined);

    function Comp() {
      const [state] = useBloc(SsrBloc);
      return createElement('span', { 'data-testid': 'n' }, String(state.n));
    }

    let html = '';
    expect(() => {
      html = renderToString(createElement(Comp));
    }).not.toThrow();

    expect(html).toContain('0');
  });
});
