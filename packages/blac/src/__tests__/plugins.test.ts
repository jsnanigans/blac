import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Blac } from '../Blac';
import { Cubit } from '../Cubit';
import { Vertex } from '../Vertex';
import { BlacPlugin, BlocPlugin, PluginCapabilities } from '../plugins';
import { BlocBase } from '../BlocBase';

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

class CounterBloc extends Vertex<number, CounterEvent> {
  constructor() {
    super(0);

    this.on(Increment, (event, emit) => emit(this.state + 1));
    this.on(Decrement, (event, emit) => emit(this.state - 1));
    this.on(SetValue, (event, emit) => emit(event.value));
  }
}

// Test implementations of plugins
class TestLoggingPlugin implements BlacPlugin {
  readonly name = 'logging';
  readonly version = '1.0.0';
  private logLevel: 'debug' | 'info' | 'warn' | 'error';

  constructor(
    options: { logLevel?: 'debug' | 'info' | 'warn' | 'error' } = {},
  ) {
    this.logLevel = options.logLevel || 'info';
  }

  onBlocCreated(bloc: BlocBase<any>): void {
    this.log('debug', `Bloc created: ${bloc._name}:${bloc._id}`);
  }

  onStateChanged(
    bloc: BlocBase<any>,
    previousState: any,
    currentState: any,
  ): void {
    this.log('debug', `State changed in ${bloc._name}:${bloc._id}`, {
      previousState,
      currentState,
    });
  }

  private log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    data?: any,
  ): void {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);

    if (messageLevelIndex >= currentLevelIndex) {
      const timestamp = new Date().toISOString();
      const logMessage = `[BlaC] [${timestamp}] ${message}`;

      switch (level) {
        case 'debug':
          console.debug(logMessage, data);
          break;
        case 'info':
          console.log(logMessage, data);
          break;
        case 'warn':
          console.warn(logMessage, data);
          break;
        case 'error':
          console.error(logMessage, data);
          break;
      }
    }
  }
}

interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

class TestPersistencePlugin<TState> implements BlocPlugin<TState> {
  readonly name = 'persistence';
  readonly version = '1.0.0';
  readonly capabilities: PluginCapabilities = {
    readState: true,
    transformState: true,
    interceptEvents: false,
    persistData: true,
    accessMetadata: false,
  };

  private storage: StorageAdapter;
  private key: string;
  private saveDebounceMs: number;
  private saveTimer?: any;

  constructor(options: {
    key: string;
    storage?: StorageAdapter;
    saveDebounceMs?: number;
  }) {
    this.key = options.key;
    this.storage = options.storage || new MockStorage();
    this.saveDebounceMs = options.saveDebounceMs ?? 100;
  }

  onAttach(bloc: BlocBase<TState>): void {
    const savedData = this.storage.getItem(this.key);
    if (savedData) {
      const restoredState = JSON.parse(savedData);
      (bloc as any)._state = restoredState;
    }
  }

  onStateChange(previousState: TState, currentState: TState): void {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
    }

    if (this.saveDebounceMs > 0) {
      this.saveTimer = setTimeout(() => {
        this.storage.setItem(this.key, JSON.stringify(currentState));
      }, this.saveDebounceMs);
    } else {
      this.storage.setItem(this.key, JSON.stringify(currentState));
    }
  }
}

class TestValidationPlugin<T> implements BlocPlugin<T> {
  readonly name = 'validation';
  readonly version = '1.0.0';
  readonly capabilities: PluginCapabilities = {
    readState: true,
    transformState: true,
    interceptEvents: false,
    persistData: false,
    accessMetadata: false,
  };

  constructor(private validator: (state: T) => boolean | string) {}

  transformState(previousState: T, nextState: T): T {
    const result = this.validator(nextState);

    if (result === true) {
      return nextState;
    } else if (result === false) {
      // State change rejected by validation plugin
      return previousState;
    } else {
      // State validation failed
      return previousState;
    }
  }
}

// Mock storage
class MockStorage implements StorageAdapter {
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
        onStateChanged,
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
        },
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
        afterBootstrap,
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
        },
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
        onStateChange,
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
        transformState: (prev, next) => next * 2,
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
        },
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
          accessMetadata: false,
        },
        transformState: () => {
          throw new Error('Should not be called');
        },
        onStateChange: vi.fn(),
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
    it('should log with TestLoggingPlugin', () => {
      const consoleSpy = vi.spyOn(console, 'debug');

      const plugin = new TestLoggingPlugin({ logLevel: 'debug' });
      Blac.instance.plugins.add(plugin);

      const cubit = Blac.getBloc(CounterCubit);
      cubit.increment();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Bloc created'),
        undefined,
      );

      consoleSpy.mockRestore();
    });

    it('should persist state with TestPersistencePlugin', () => {
      const storage = new MockStorage();
      storage.setItem('counter', '42');

      const plugin = new TestPersistencePlugin<number>({
        key: 'counter',
        storage,
        saveDebounceMs: 0,
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

    it('should validate state with TestValidationPlugin', () => {
      const validator = (state: number) => {
        if (state < 0) return 'Value must be non-negative';
        if (state > 100) return 'Value must not exceed 100';
        return true;
      };

      const plugin = new TestValidationPlugin(validator);

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

      const persistencePlugin = new TestPersistencePlugin<number>({
        key: 'validated-counter',
        storage,
        saveDebounceMs: 0,
      });

      const validationPlugin = new TestValidationPlugin<number>(
        (state) => state >= 0 && state <= 10,
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
