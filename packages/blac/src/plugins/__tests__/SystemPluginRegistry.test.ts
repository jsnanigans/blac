import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SystemPluginRegistry } from '../SystemPluginRegistry';
import { BlacPlugin } from '../types';
import { BlocBase } from '../../BlocBase';
import { Bloc } from '../../Bloc';

// Mock bloc for testing
class MockBloc extends BlocBase<number> {
  constructor(initialState = 0) {
    super(initialState);
  }
}

// Mock event bloc
class MockEventBloc extends Bloc<number, { type: string }> {
  constructor() {
    super(0);
  }
}

// Helper to create test plugins
const createTestPlugin = (
  name: string,
  hooks?: Partial<BlacPlugin>,
): BlacPlugin => ({
  name,
  version: '1.0.0',
  ...hooks,
});

describe('SystemPluginRegistry', () => {
  let registry: SystemPluginRegistry;

  beforeEach(() => {
    registry = new SystemPluginRegistry();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Plugin Management', () => {
    it('should add plugins successfully', () => {
      const plugin = createTestPlugin('test-plugin');

      registry.add(plugin);

      expect(registry.get('test-plugin')).toBe(plugin);
      expect(registry.getAll()).toContain(plugin);
    });

    it('should throw error when adding duplicate plugin', () => {
      const plugin = createTestPlugin('test-plugin');

      registry.add(plugin);

      expect(() => registry.add(plugin)).toThrow(
        "Plugin 'test-plugin' is already registered",
      );
    });

    it('should maintain execution order', () => {
      const plugin1 = createTestPlugin('plugin-1');
      const plugin2 = createTestPlugin('plugin-2');
      const plugin3 = createTestPlugin('plugin-3');

      registry.add(plugin1);
      registry.add(plugin2);
      registry.add(plugin3);

      const all = registry.getAll();
      expect(all[0]).toBe(plugin1);
      expect(all[1]).toBe(plugin2);
      expect(all[2]).toBe(plugin3);
    });

    it('should remove plugins and clean up metrics', () => {
      const plugin = createTestPlugin('test-plugin');

      registry.add(plugin);
      expect(registry.get('test-plugin')).toBe(plugin);
      expect(registry.getMetrics('test-plugin')).toBeDefined();

      const removed = registry.remove('test-plugin');
      expect(removed).toBe(true);
      expect(registry.get('test-plugin')).toBeUndefined();
      expect(registry.getAll()).not.toContain(plugin);
      expect(registry.getMetrics('test-plugin')).toBeUndefined();
    });

    it('should return false when removing non-existent plugin', () => {
      const removed = registry.remove('non-existent');
      expect(removed).toBe(false);
    });

    it('should clear all plugins and metrics', () => {
      registry.add(createTestPlugin('plugin-1'));
      registry.add(createTestPlugin('plugin-2'));
      registry.add(createTestPlugin('plugin-3'));

      expect(registry.getAll().length).toBe(3);

      registry.clear();

      expect(registry.getAll().length).toBe(0);
      expect(registry.getMetrics('plugin-1')).toBeUndefined();
    });
  });

  describe('Hook Execution', () => {
    it('should execute hooks on all plugins', () => {
      const hook1 = vi.fn();
      const hook2 = vi.fn();
      const hook3 = vi.fn();

      registry.add(createTestPlugin('plugin-1', { onBlocCreated: hook1 }));
      registry.add(createTestPlugin('plugin-2', { onBlocCreated: hook2 }));
      registry.add(createTestPlugin('plugin-3', { onBlocCreated: hook3 }));

      const bloc = new MockBloc();
      registry.executeHook('onBlocCreated', [bloc]);

      expect(hook1).toHaveBeenCalledWith(bloc);
      expect(hook2).toHaveBeenCalledWith(bloc);
      expect(hook3).toHaveBeenCalledWith(bloc);
    });

    it('should skip plugins without the specified hook', () => {
      const hook1 = vi.fn();
      const hook3 = vi.fn();

      registry.add(createTestPlugin('plugin-1', { onBlocCreated: hook1 }));
      registry.add(createTestPlugin('plugin-2')); // No hook
      registry.add(createTestPlugin('plugin-3', { onBlocCreated: hook3 }));

      const bloc = new MockBloc();
      registry.executeHook('onBlocCreated', [bloc]);

      expect(hook1).toHaveBeenCalledWith(bloc);
      expect(hook3).toHaveBeenCalledWith(bloc);
    });

    it('should handle hook errors and continue execution', () => {
      const hook1 = vi.fn(() => {
        throw new Error('Hook 1 error');
      });
      const hook2 = vi.fn();
      const hook3 = vi.fn();

      registry.add(createTestPlugin('plugin-1', { onBlocCreated: hook1 }));
      registry.add(createTestPlugin('plugin-2', { onBlocCreated: hook2 }));
      registry.add(createTestPlugin('plugin-3', { onBlocCreated: hook3 }));

      const bloc = new MockBloc();
      registry.executeHook('onBlocCreated', [bloc]);

      expect(hook1).toHaveBeenCalled();
      expect(hook2).toHaveBeenCalled();
      expect(hook3).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining(
          "Plugin 'plugin-1' error in hook 'onBlocCreated'",
        ),
        expect.any(Error),
      );
    });

    it('should use custom error handler if provided', () => {
      const errorHandler = vi.fn();
      const failingHook = vi.fn(() => {
        throw new Error('Test error');
      });

      const plugin = createTestPlugin('failing-plugin', {
        onBlocCreated: failingHook,
      });
      registry.add(plugin);

      const bloc = new MockBloc();
      registry.executeHook('onBlocCreated', [bloc], errorHandler);

      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error), plugin);
      expect(console.error).not.toHaveBeenCalled();
    });
  });

  describe('Lifecycle Hooks', () => {
    it('should execute bootstrap hooks', () => {
      const beforeBootstrap1 = vi.fn();
      const beforeBootstrap2 = vi.fn();
      const afterBootstrap1 = vi.fn();
      const afterBootstrap2 = vi.fn();

      registry.add(
        createTestPlugin('plugin-1', {
          beforeBootstrap: beforeBootstrap1,
          afterBootstrap: afterBootstrap1,
        }),
      );
      registry.add(
        createTestPlugin('plugin-2', {
          beforeBootstrap: beforeBootstrap2,
          afterBootstrap: afterBootstrap2,
        }),
      );

      registry.bootstrap();

      expect(beforeBootstrap1).toHaveBeenCalled();
      expect(beforeBootstrap2).toHaveBeenCalled();
      expect(afterBootstrap1).toHaveBeenCalled();
      expect(afterBootstrap2).toHaveBeenCalled();
    });

    it('should execute shutdown hooks', () => {
      const beforeShutdown = vi.fn();
      const afterShutdown = vi.fn();

      registry.add(
        createTestPlugin('plugin-1', {
          beforeShutdown,
          afterShutdown,
        }),
      );

      registry.shutdown();

      expect(beforeShutdown).toHaveBeenCalled();
      expect(afterShutdown).toHaveBeenCalled();
    });
  });

  describe('Bloc Lifecycle Notifications', () => {
    it('should notify plugins of bloc creation', () => {
      const onBlocCreated = vi.fn();

      registry.add(createTestPlugin('plugin-1', { onBlocCreated }));

      const bloc = new MockBloc();
      registry.notifyBlocCreated(bloc);

      expect(onBlocCreated).toHaveBeenCalledWith(bloc);
    });

    it('should notify plugins of bloc disposal', () => {
      const onBlocDisposed = vi.fn();

      registry.add(createTestPlugin('plugin-1', { onBlocDisposed }));

      const bloc = new MockBloc();
      registry.notifyBlocDisposed(bloc);

      expect(onBlocDisposed).toHaveBeenCalledWith(bloc);
    });

    it('should notify plugins of state changes', () => {
      const onStateChanged = vi.fn();

      registry.add(createTestPlugin('plugin-1', { onStateChanged }));

      const bloc = new MockBloc();
      const prevState = 0;
      const currState = 1;

      registry.notifyStateChanged(bloc, prevState, currState);

      expect(onStateChanged).toHaveBeenCalledWith(bloc, prevState, currState);
    });

    it('should notify plugins of event additions', () => {
      const onEventAdded = vi.fn();

      registry.add(createTestPlugin('plugin-1', { onEventAdded }));

      const bloc = new MockEventBloc();
      const event = 'test-event';

      registry.notifyEventAdded(bloc, event);

      expect(onEventAdded).toHaveBeenCalledWith(bloc, event);
    });

    it('should notify plugins of errors with double fault protection', () => {
      const onError1 = vi.fn();
      const onError2 = vi.fn(() => {
        throw new Error('Error handler failed');
      });

      registry.add(createTestPlugin('plugin-1', { onError: onError1 }));
      registry.add(createTestPlugin('plugin-2', { onError: onError2 }));

      const error = new Error('Test error');
      const bloc = new MockBloc();
      const context = {
        phase: 'state-change' as const,
        operation: 'test-operation',
      };

      registry.notifyError(error, bloc as any, context);

      expect(onError1).toHaveBeenCalledWith(error, bloc, context);
      expect(onError2).toHaveBeenCalledWith(error, bloc, context);
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Plugin 'plugin-2' error handler failed:"),
        expect.any(Error),
      );
    });
  });

  describe('Metrics Tracking', () => {
    it('should initialize metrics for new plugins', () => {
      registry.add(createTestPlugin('test-plugin'));

      const metrics = registry.getMetrics('test-plugin');
      expect(metrics).toBeDefined();
      expect(metrics).toBeInstanceOf(Map);
    });

    it('should record successful hook executions', () => {
      const hook = vi.fn();
      registry.add(createTestPlugin('test-plugin', { onBlocCreated: hook }));

      const bloc = new MockBloc();
      registry.notifyBlocCreated(bloc);

      const metrics = registry.getMetrics('test-plugin');
      const hookMetrics = metrics?.get('onBlocCreated');

      expect(hookMetrics).toBeDefined();
      expect(hookMetrics?.executionCount).toBe(1);
      expect(hookMetrics?.errorCount).toBe(0);
      expect(hookMetrics?.executionTime).toBeGreaterThan(0);
      expect(hookMetrics?.lastExecutionTime).toBeGreaterThan(0);
    });

    it('should record hook errors', () => {
      const error = new Error('Hook error');
      const hook = vi.fn(() => {
        throw error;
      });

      registry.add(createTestPlugin('test-plugin', { onBlocCreated: hook }));

      const bloc = new MockBloc();
      registry.notifyBlocCreated(bloc);

      const metrics = registry.getMetrics('test-plugin');
      const hookMetrics = metrics?.get('onBlocCreated');

      expect(hookMetrics).toBeDefined();
      expect(hookMetrics?.errorCount).toBe(1);
      expect(hookMetrics?.lastError).toBe(error);
    });

    it('should accumulate metrics over multiple executions', () => {
      const hook = vi.fn();
      registry.add(createTestPlugin('test-plugin', { onBlocCreated: hook }));

      const bloc = new MockBloc();

      // Execute multiple times
      for (let i = 0; i < 5; i++) {
        registry.notifyBlocCreated(bloc);
      }

      const metrics = registry.getMetrics('test-plugin');
      const hookMetrics = metrics?.get('onBlocCreated');

      expect(hookMetrics?.executionCount).toBe(5);
      expect(hookMetrics?.executionTime).toBeGreaterThan(0);
    });

    it('should return undefined metrics for non-existent plugin', () => {
      const metrics = registry.getMetrics('non-existent');
      expect(metrics).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle plugins with context binding correctly', () => {
      let capturedContext: any;
      const plugin = createTestPlugin('test-plugin', {
        onBlocCreated: function () {
          // eslint-disable-next-line @typescript-eslint/no-this-alias
          capturedContext = this;
        },
      });

      registry.add(plugin);
      registry.notifyBlocCreated(new MockBloc());

      expect(capturedContext).toBe(plugin);
    });

    it('should handle multiple rapid hook executions', () => {
      const hook = vi.fn();
      registry.add(createTestPlugin('test-plugin', { onBlocCreated: hook }));

      const bloc = new MockBloc();

      for (let i = 0; i < 100; i++) {
        registry.notifyBlocCreated(bloc);
      }

      expect(hook).toHaveBeenCalledTimes(100);
    });
  });
});
