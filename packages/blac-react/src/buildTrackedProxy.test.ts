import { describe, it, expect } from 'vite-plus/test';
import { buildTrackedProxy } from './buildTrackedProxy';

class WithPrivateField {
  #secret = 1;
  get value() {
    return this.#secret;
  }
}

describe('buildTrackedProxy', () => {
  it('rethrows #private field access with a BlaC-branded message', () => {
    const instance = new WithPrivateField();
    const { proxy } = buildTrackedProxy(instance, { current: null });

    expect(() => proxy.value).toThrow(/\[blac\].*#private/);
  });
});
