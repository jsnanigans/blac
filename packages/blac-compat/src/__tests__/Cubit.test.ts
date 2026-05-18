import { describe, it, expect } from 'vite-plus/test';
import { blacTestSetup } from '@blac/core/testing';
import { Cubit } from '../Cubit';

class CounterCubit extends Cubit<{ n: number }> {
  constructor() {
    super({ n: 0 });
  }
  inc() {
    this.patch({ n: this.state.n + 1 });
  }
}

blacTestSetup();

describe('shim Cubit', () => {
  it('inherits v2 Cubit behavior (emit/patch + state)', () => {
    const c = new CounterCubit();
    expect(c.state).toEqual({ n: 0 });
    c.inc();
    expect(c.state).toEqual({ n: 1 });
  });

  it('exposes a public `props` field for legacy reads', () => {
    const c = new CounterCubit();
    expect(c.props).toBe(null);
    c.props = { initialN: 5 };
    expect(c.props).toEqual({ initialN: 5 });
  });
});
