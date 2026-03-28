import { describe, it, expect } from 'vite-plus/test';
import { blac } from './blac';
import { Cubit } from '../core/Cubit';
import {
  isKeepAliveClass,
  isExcludedFromDevTools,
} from '../utils/static-props';

describe('blac decorator', () => {
  describe('decorator syntax', () => {
    it('should mark class as keepAlive using @ decorator', () => {
      @blac({ keepAlive: true })
      class KeepAliveCubit extends Cubit<{ count: number }> {
        constructor() {
          super({ count: 0 });
        }
      }

      expect(isKeepAliveClass(KeepAliveCubit)).toBe(true);
    });

    it('should allow creating and using instances from decorated class', () => {
      @blac({ keepAlive: true })
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
