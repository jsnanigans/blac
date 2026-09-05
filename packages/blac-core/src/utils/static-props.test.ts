import { describe, expect, it } from 'vite-plus/test';
import { getClassKey, isKeepAliveClass } from './static-props';

class Base {
  static key = () => 'base-key';
  static keepAlive = true;
}

class Sub extends Base {}

describe('static-props inheritance', () => {
  it('getClassKey does not inherit a base class key', () => {
    expect(getClassKey(Sub)).toBeUndefined();
  });

  it('isKeepAliveClass inherits from a base class', () => {
    expect(isKeepAliveClass(Sub as any)).toBe(true);
  });
});
