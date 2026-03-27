import { describe, it, expect } from 'vitest';
import { blacTestSetup } from '@blac/core/testing';
import { blac } from './blac';
import { Cubit } from '../core/Cubit';
import {
  isKeepAliveClass,
  isExcludedFromDevTools,
} from '../utils/static-props';
import { acquire, release } from '../registry';

describe('blac decorator edge cases', () => {
  blacTestSetup();

  it('@blac({ keepAlive: true }) — instance survives release to refCount 0', () => {
    const KABloc = blac({ keepAlive: true })(
      class KABloc extends Cubit<{ n: number }> {
        constructor() {
          super({ n: 0 });
        }
      },
    );
    const instance = acquire(KABloc);
    release(KABloc);
    expect(instance.isDisposed).toBe(false);
  });

  it('@blac({ excludeFromDevTools: true }) — sets static __excludeFromDevTools', () => {
    const ExcludedBloc = blac({ excludeFromDevTools: true })(
      class ExcludedBloc extends Cubit<{ n: number }> {
        constructor() {
          super({ n: 0 });
        }
      },
    );
    expect(isExcludedFromDevTools(ExcludedBloc)).toBe(true);
    expect(isKeepAliveClass(ExcludedBloc)).toBe(false);
  });

  it('decorated class preserves .name property', () => {
    class NamedBloc extends Cubit<{ n: number }> {
      constructor() {
        super({ n: 0 });
      }
    }
    const decorated = blac({ keepAlive: true })(NamedBloc);
    expect(decorated.name).toBe('NamedBloc');
  });

  it('non-decorated class: isKeepAliveClass === false', () => {
    class PlainBloc extends Cubit<{ n: number }> {
      constructor() {
        super({ n: 0 });
      }
    }
    expect(isKeepAliveClass(PlainBloc)).toBe(false);
  });

  it('@blac({}) — no options, no side effects', () => {
    const NoOpBloc = blac({} as any)(
      class NoOpBloc extends Cubit<{ n: number }> {
        constructor() {
          super({ n: 0 });
        }
      },
    );
    expect(isKeepAliveClass(NoOpBloc)).toBe(false);
    expect(isExcludedFromDevTools(NoOpBloc)).toBe(false);
  });
});
