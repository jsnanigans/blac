import { describe, expect, it } from 'vite-plus/test';
import { getBlacName, getClassKey, isKeepAliveClass } from './static-props';

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

describe('getBlacName', () => {
  it('prefers an explicit blacName over constructor.name', () => {
    class Named {
      static blacName = 'ExplicitName';
    }
    expect(getBlacName(Named as any)).toBe('ExplicitName');
  });

  it('does not inherit a base class blacName', () => {
    class NamedBase {
      static blacName = 'BaseName';
    }
    class NamedSub extends NamedBase {}
    expect(getBlacName(NamedSub as any)).toBe('NamedSub');
  });
});
