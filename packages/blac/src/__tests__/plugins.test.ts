import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Blac } from '../Blac';
import { Cubit } from '../Cubit';
import { Bloc } from '../Bloc';
import { BlacPlugin, BlocPlugin } from '../plugins';
// Import example plugins from examples directory
import { LoggingPlugin } from '../../examples/plugins/LoggingPlugin';
import { PersistencePlugin } from '../../examples/plugins/PersistencePlugin';
import { ValidationPlugin } from '../../examples/plugins/ValidationPlugin';

// Test Cubit
class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }
  
  increment = () => this.emit(this.state + 1);
  decrement = () => this.emit(this.state - 1);
  setValue = (value: number) => this.emit(value);
}

// Test Bloc
abstract class CounterEvent {}
class Increment extends CounterEvent {}
class Decrement extends CounterEvent {}
class SetValue extends CounterEvent {
  constructor(public value: number) {
    super();
  }
}

class CounterBloc extends Bloc<number, CounterEvent> {
  constructor() {
    super(0);
    
    this.on(Increment, (event, emit) => emit(this.state + 1));
    this.on(Decrement, (event, emit) => emit(this.state - 1));
    this.on(SetValue, (event, emit) => emit(event.value));
  }
}

// Mock storage
class MockStorage {
  private store = new Map<string, string>();
  
  getItem(key: string): string | null {
    return this.store.get(key) || null;
  }
  
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  
  removeItem(key: string): void {
    this.store.delete(key);
  }
}

describe('New Plugin System', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });
  
  describe('System Plugins (BlacPlugin)', () => {
    it('should register and execute system plugins', () => {
      const onBlocCreated = vi.fn();
      const onStateChanged = vi.fn();
      
      const plugin: BlacPlugin = {
        name: 'test-system-plugin',
        version: '1.0.0',
        onBlocCreated,
        onStateChanged
      };
      
      Blac.instance.plugins.add(plugin);
      
      const cubit = Blac.getBloc(CounterCubit);
      expect(onBlocCreated).toHaveBeenCalledWith(cubit);
      
      cubit.increment();
      expect(onStateChanged).toHaveBeenCalledWith(cubit, 0, 1);
    });
    
    it('should handle plugin errors gracefully', () => {
      const errorPlugin: BlacPlugin = {
        name: 'error-plugin',
        version: '1.0.0',
        onBlocCreated: () => {
          throw new Error('Plugin error');
        }
      };
      
      Blac.instance.plugins.add(errorPlugin);
      
      // Should not throw when creating bloc
      expect(() => Blac.getBloc(CounterCubit)).not.toThrow();
    });
    
    it('should execute bootstrap hooks', () => {
      const beforeBootstrap = vi.fn();
      const afterBootstrap = vi.fn();
      
      const plugin: BlacPlugin = {
        name: 'bootstrap-plugin',
        version: '1.0.0',
        beforeBootstrap,
        afterBootstrap
      };
      
      Blac.resetInstance();
      Blac.instance.plugins.add(plugin);
      Blac.instance.bootstrap();
      
      expect(beforeBootstrap).toHaveBeenCalled();
      expect(afterBootstrap).toHaveBeenCalled();
    });
    
    it('should track metrics', () => {
      const plugin: BlacPlugin = {
        name: 'metrics-plugin',
        version: '1.0.0',
        onBlocCreated: () => {
          // Do something
        }
      };
      
      Blac.instance.plugins.add(plugin);
      Blac.getBloc(CounterCubit);
      
      const metrics = Blac.instance.plugins.getMetrics('metrics-plugin');
      expect(metrics).toBeDefined();
      expect(metrics?.get('onBlocCreated')).toBeDefined();
      expect(metrics?.get('onBlocCreated')?.executionCount).toBe(1);
    });
  });
  
  describe('Bloc Plugins (BlocPlugin)', () => {
    it('should attach plugins to specific blocs', () => {
      const onAttach = vi.fn();
      const onStateChange = vi.fn();
      
      const plugin: BlocPlugin<number> = {
        name: 'test-bloc-plugin',
        version: '1.0.0',
        onAttach,
        onStateChange
      };
      
      const cubit = new CounterCubit();
      cubit.addPlugin(plugin);
      
      // Activate the bloc
      Blac.activateBloc(cubit as any);
      
      expect(onAttach).toHaveBeenCalledWith(cubit);
      
      cubit.increment();
      expect(onStateChange).toHaveBeenCalledWith(0, 1);
    });
    
    it('should transform state through plugins', () => {
      const transformPlugin: BlocPlugin<number> = {
        name: 'double-plugin',
        version: '1.0.0',
        transformState: (prev, next) => next * 2
      };
      
      const cubit = new CounterCubit();
      cubit.addPlugin(transformPlugin);
      Blac.activateBloc(cubit as any);
      
      cubit.setValue(5);
      expect(cubit.state).toBe(10); // 5 * 2
    });
    
    it('should transform events through plugins', () => {
      const transformPlugin: BlocPlugin<number, CounterEvent> = {
        name: 'event-doubler',
        version: '1.0.0',
        transformEvent: (event) => {
          if (event instanceof SetValue) {
            return new SetValue(event.value * 2);
          }
          return event;
        }
      };
      
      const bloc = new CounterBloc();
      bloc.addPlugin(transformPlugin);
      Blac.activateBloc(bloc as any);
      
      bloc.add(new SetValue(5));
      
      // Wait for event processing
      setTimeout(() => {
        expect(bloc.state).toBe(10); // 5 * 2
      }, 10);
    });
    
    it('should respect plugin capabilities', () => {
      const readOnlyPlugin: BlocPlugin<number> = {
        name: 'read-only',
        version: '1.0.0',
        capabilities: {
          readState: true,
          transformState: false,
          interceptEvents: false,
          persistData: false,
          accessMetadata: false
        },
        transformState: () => {
          throw new Error('Should not be called');
        },
        onStateChange: vi.fn()
      };
      
      const cubit = new CounterCubit();
      cubit.addPlugin(readOnlyPlugin);
      Blac.activateBloc(cubit as any);
      
      cubit.increment();
      expect(cubit.state).toBe(1); // Transform not applied
      expect(readOnlyPlugin.onStateChange).toHaveBeenCalled();
    });
  });
  
  describe('Example Plugins', () => {
    it('should log with LoggingPlugin', () => {
      const consoleSpy = vi.spyOn(console, 'debug');
      
      const plugin = new LoggingPlugin({ logLevel: 'debug' });
      Blac.instance.plugins.add(plugin);
      
      const cubit = Blac.getBloc(CounterCubit);
      cubit.increment();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Bloc created'),
        undefined
      );
      
      consoleSpy.mockRestore();
    });
    
    it('should persist state with PersistencePlugin', () => {
      const storage = new MockStorage();
      storage.setItem('counter', '42');
      
      const plugin = new PersistencePlugin<number>({
        key: 'counter',
        storage,
        saveDebounceMs: 0
      });
      
      const cubit = new CounterCubit();
      cubit.addPlugin(plugin);
      Blac.activateBloc(cubit as any);
      
      // Should restore from storage
      expect(cubit.state).toBe(42);
      
      // Should save new state
      cubit.setValue(100);
      
      // Wait for debounced save
      setTimeout(() => {
        expect(storage.getItem('counter')).toBe('100');
      }, 10);
    });
    
    it('should validate state with ValidationPlugin', () => {
      const validator = (state: number) => {
        if (state < 0) return 'Value must be non-negative';
        if (state > 100) return 'Value must not exceed 100';
        return true;
      };
      
      const plugin = new ValidationPlugin(validator);
      
      const cubit = new CounterCubit();
      cubit.addPlugin(plugin);
      Blac.activateBloc(cubit as any);
      
      cubit.setValue(-5);
      expect(cubit.state).toBe(0); // Rejected
      
      cubit.setValue(50);
      expect(cubit.state).toBe(50); // Accepted
      
      cubit.setValue(150);
      expect(cubit.state).toBe(50); // Rejected
    });
  });
  
  describe('Plugin Composition', () => {
    it('should compose multiple bloc plugins', () => {
      const storage = new MockStorage();
      
      const persistencePlugin = new PersistencePlugin<number>({
        key: 'validated-counter',
        storage,
        saveDebounceMs: 0
      });
      
      const validationPlugin = new ValidationPlugin<number>(
        (state) => state >= 0 && state <= 10
      );
      
      const cubit = new CounterCubit();
      cubit.addPlugin(validationPlugin);
      cubit.addPlugin(persistencePlugin);
      Blac.activateBloc(cubit as any);
      
      cubit.setValue(5);
      expect(cubit.state).toBe(5);
      
      cubit.setValue(15);
      expect(cubit.state).toBe(5); // Validation rejected
      
      setTimeout(() => {
        expect(storage.getItem('validated-counter')).toBe('5');
      }, 10);
    });
  });
});