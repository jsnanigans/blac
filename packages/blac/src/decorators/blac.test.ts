import { describe, it, expect } from 'vitest';
import { blac } from './blac';
import { Cubit } from '../core/Cubit';
import { Vertex } from '../core/Vertex';
import { isIsolatedClass, isKeepAliveClass } from '../utils/static-props';

describe('blac decorator', () => {
  describe('decorator syntax', () => {
    it('should mark class as isolated using @ decorator', () => {
      @blac({ isolated: true })
      class IsolatedCubit extends Cubit<number> {
        constructor() {
          super(0);
        }
      }

      expect(isIsolatedClass(IsolatedCubit)).toBe(true);
      expect(isKeepAliveClass(IsolatedCubit)).toBe(false);
    });

    it('should mark class as keepAlive using @ decorator', () => {
      @blac({ keepAlive: true })
      class KeepAliveCubit extends Cubit<number> {
        constructor() {
          super(0);
        }
      }

      expect(isKeepAliveClass(KeepAliveCubit)).toBe(true);
      expect(isIsolatedClass(KeepAliveCubit)).toBe(false);
    });

    it('should work with Vertex using @ decorator', () => {
      @blac({ isolated: true })
      class IsolatedVertex extends Vertex<number> {
        constructor() {
          super(0);
        }
      }

      expect(isIsolatedClass(IsolatedVertex)).toBe(true);
    });

    it('should allow creating and using instances from decorated class', () => {
      @blac({ isolated: true })
      class CounterBloc extends Cubit<number> {
        constructor() {
          super(0);
        }
        increment() {
          this.emit(this.state + 1);
        }
      }

      const instance = new CounterBloc();
      expect(instance.state).toBe(0);
      instance.increment();
      expect(instance.state).toBe(1);
    });
  });

  describe('isolated option', () => {
    it('should mark class as isolated using function syntax', () => {
      const IsolatedBloc = blac({ isolated: true })(
        class extends Cubit<number> {
          constructor() {
            super(0);
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

    it('should work with Vertex classes', () => {
      const IsolatedVertex = blac({ isolated: true })(
        class extends Vertex<number> {
          constructor() {
            super(0);
          }
        },
      );

      expect(isIsolatedClass(IsolatedVertex)).toBe(true);
    });
  });

  describe('keepAlive option', () => {
    it('should mark class as keepAlive using function syntax', () => {
      const KeepAliveBloc = blac({ keepAlive: true })(
        class extends Cubit<number> {
          constructor() {
            super(0);
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

    it('should work with Vertex classes', () => {
      const KeepAliveVertex = blac({ keepAlive: true })(
        class extends Vertex<number> {
          constructor() {
            super(0);
          }
        },
      );

      expect(isKeepAliveClass(KeepAliveVertex)).toBe(true);
    });
  });

  describe('instance creation', () => {
    it('should allow creating instances of decorated isolated class', () => {
      const CounterBloc = blac({ isolated: true })(
        class extends Cubit<number> {
          constructor() {
            super(0);
          }
          increment() {
            this.emit(this.state + 1);
          }
        },
      );

      const instance = new CounterBloc();
      expect(instance.state).toBe(0);
      instance.increment();
      expect(instance.state).toBe(1);
    });

    it('should allow creating instances of decorated keepAlive class', () => {
      const CounterBloc = blac({ keepAlive: true })(
        class extends Cubit<number> {
          constructor() {
            super(0);
          }
          increment() {
            this.emit(this.state + 1);
          }
        },
      );

      const instance = new CounterBloc();
      expect(instance.state).toBe(0);
      instance.increment();
      expect(instance.state).toBe(1);
    });
  });
});
