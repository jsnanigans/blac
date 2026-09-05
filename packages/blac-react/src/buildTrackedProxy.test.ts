import { describe, it, expect } from 'vite-plus/test';
import { buildTrackedProxy } from './buildTrackedProxy';

class WithPrivateField {
  #secret = 1;
  get value() {
    return this.#secret;
  }
  read() {
    return this.#secret;
  }
}

describe('buildTrackedProxy', () => {
  it('reads #private fields from getters and methods', () => {
    const instance = new WithPrivateField();
    const { proxy } = buildTrackedProxy(instance, { current: null });

    expect(proxy.value).toBe(1);
    expect(proxy.read()).toBe(1);
  });

  it('keeps bound method identity stable across reads', () => {
    const instance = new WithPrivateField();
    const { proxy } = buildTrackedProxy(instance, { current: null });

    // Reading the reference twice is the point of the test.
    // oxlint-disable-next-line typescript/unbound-method
    const first = proxy.read;
    // oxlint-disable-next-line typescript/unbound-method
    expect(first).toBe(proxy.read);
  });
});
