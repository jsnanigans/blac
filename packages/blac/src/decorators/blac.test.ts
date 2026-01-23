import { describe, it, expect } from 'vitest';
import { blac } from './blac';
import { Cubit } from '../core/Cubit';
import {
  isIsolatedClass,
  isKeepAliveClass,
  isExcludedFromDevTools,
} from '../utils/static-props';

describe('blac decorator', () => {
  describe('decorator syntax', () => {
    it('should mark class as isolated using @ decorator', () => {
      @blac({ isolated: true })
      class IsolatedCubit extends Cubit<{ count: number }> {
        constructor() {
          super({ count: 0 });
        }
      }

      expect(isIsolatedClass(IsolatedCubit)).toBe(true);
      expect(isKeepAliveClass(IsolatedCubit)).toBe(false);
    });

    it('should mark class as keepAlive using @ decorator', () => {
      @blac({ keepAlive: true })
      class KeepAliveCubit extends Cubit<{ count: number }> {
        constructor() {
          super({ count: 0 });
        }
      }

      expect(isKeepAliveClass(KeepAliveCubit)).toBe(true);
      expect(isIsolatedClass(KeepAliveCubit)).toBe(false);
    });

    it('should allow creating and using instances from decorated class', () => {
      @blac({ isolated: true })
      class CounterBloc extends Cubit<{ count: number }> {
        constructor() {
          super({ count: 0 });
        }
        increment() {
          this.emit({ count: this.state.count + 1 });
        }
      }

      const instance = new CounterBloc();
      expect(instance.state).toEqual({ count: 0 });
      instance.increment();
      expect(instance.state).toEqual({ count: 1 });
    });
  });

  describe('isolated option', () => {
    it('should mark class as isolated using function syntax', () => {
      const IsolatedBloc = blac({ isolated: true })(
        class extends Cubit<{ count: number }> {
          constructor() {
            super({ count: 0 });
          }
        },
      );

      expect(isIsolatedClass(IsolatedBloc)).toBe(true);
      expect(isKeepAliveClass(IsolatedBloc)).toBe(false);
    });

    it('should work with named classes', () => {
      class FormBloc extends Cubit<{ value: string }> {
        constructor() {
          super({ value: '' });
        }
      }
      const DecoratedFormBloc = blac({ isolated: true })(FormBloc);

      expect(isIsolatedClass(DecoratedFormBloc)).toBe(true);
      expect(DecoratedFormBloc.name).toBe('FormBloc');
    });

  });

  describe('keepAlive option', () => {
    it('should mark class as keepAlive using function syntax', () => {
      const KeepAliveBloc = blac({ keepAlive: true })(
        class extends Cubit<{ count: number }> {
          constructor() {
            super({ count: 0 });
          }
        },
      );

      expect(isKeepAliveClass(KeepAliveBloc)).toBe(true);
      expect(isIsolatedClass(KeepAliveBloc)).toBe(false);
    });

    it('should work with named classes', () => {
      class AuthBloc extends Cubit<{ user: string | null }> {
        constructor() {
          super({ user: null });
        }
      }
      const DecoratedAuthBloc = blac({ keepAlive: true })(AuthBloc);

      expect(isKeepAliveClass(DecoratedAuthBloc)).toBe(true);
      expect(DecoratedAuthBloc.name).toBe('AuthBloc');
    });

  });

  describe('excludeFromDevTools option', () => {
    it('should mark class as excluded from DevTools using @ decorator', () => {
      @blac({ excludeFromDevTools: true })
      class InternalBloc extends Cubit<{ count: number }> {
        constructor() {
          super({ count: 0 });
        }
      }

      expect(isExcludedFromDevTools(InternalBloc)).toBe(true);
      expect(isIsolatedClass(InternalBloc)).toBe(false);
      expect(isKeepAliveClass(InternalBloc)).toBe(false);
    });

    it('should mark class as excluded from DevTools using function syntax', () => {
      const InternalBloc = blac({ excludeFromDevTools: true })(
        class extends Cubit<{ count: number }> {
          constructor() {
            super({ count: 0 });
          }
        },
      );

      expect(isExcludedFromDevTools(InternalBloc)).toBe(true);
    });
  });

  describe('instance creation', () => {
    it('should allow creating instances of decorated isolated class', () => {
      const CounterBloc = blac({ isolated: true })(
        class extends Cubit<{ count: number }> {
          constructor() {
            super({ count: 0 });
          }
          increment() {
            this.emit({ count: this.state.count + 1 });
          }
        },
      );

      const instance = new CounterBloc();
      expect(instance.state).toEqual({ count: 0 });
      instance.increment();
      expect(instance.state).toEqual({ count: 1 });
    });

    it('should allow creating instances of decorated keepAlive class', () => {
      const CounterBloc = blac({ keepAlive: true })(
        class extends Cubit<{ count: number }> {
          constructor() {
            super({ count: 0 });
          }
          increment() {
            this.emit({ count: this.state.count + 1 });
          }
        },
      );

      const instance = new CounterBloc();
      expect(instance.state).toEqual({ count: 0 });
      instance.increment();
      expect(instance.state).toEqual({ count: 1 });
    });
  });
});
