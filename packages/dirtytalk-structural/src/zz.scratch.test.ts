// @vitest-environment jsdom
import React, { useMemo, useState } from 'react';
import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vite-plus/test';
import { SyncScheduler } from '@dirtytalk/engine';
import { TestContainer } from './test-support';
import { useStructural } from './react-hook';
import { trackRender, ProxyCache } from './tracker';
import { PathInterner } from './path-interner';

interface S { user: { name: string }; other: number; [k: string]: unknown }
class C extends TestContainer<S> {}

describe('scratch', () => {
  it('memo on reused root proxy -> missed wake', () => {
    const c = new C({ user: { name: 'a' }, other: 0 }, { scheduler: new SyncScheduler() });
    let bump: () => void = () => {};
    let seen = '';
    function App() {
      const [state] = useStructural(c);
      const [, set] = useState(0);
      bump = () => set((x) => x + 1);
      const name = useMemo(() => state.user.name, [state]);
      seen = name;
      return null;
    }
    render(React.createElement(App));
    act(() => bump());
    act(() => c.emit({ ...c.state, user: { name: 'b' } }));
    expect(seen).toBe('b');
  });

  it('root Object.keys, key added via emit', () => {
    const c = new C({ user: { name: 'a' }, other: 0 }, { scheduler: new SyncScheduler() });
    let seen = 0;
    function App() {
      const [state] = useStructural(c);
      seen = Object.keys(state).length;
      return null;
    }
    render(React.createElement(App));
    act(() => c.emit({ ...c.state, extra: 1 }));
    expect(seen).toBe(3);
  });

  it('cross-interner prefix collision', () => {
    const shared = { x: 1 };
    const i1 = new PathInterner(); const i2 = new PathInterner();
    const cache = new ProxyCache();
    const r1 = trackRender({ a: shared }, i1, cache); void (r1.value as any).a.x; r1.disarm();
    i2.intern('zzz');
    const r2 = trackRender({ q: { r: shared } }, i2, cache);
    void (r2.value as any).q; 
    const r3 = trackRender({ a: shared }, i2, cache); void (r3.value as any).a.x; r3.disarm();
    expect([...r3.paths].map((id) => i2.lookup(id))).toEqual(['a.x']);
  });
});
