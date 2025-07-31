import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BlocPluginRegistry } from '../BlocPluginRegistry';
import { BlocPlugin } from '../types';

// Mock bloc for testing
class MockBloc {
  state = { count: 0 };
}

// Sample plugins for testing
const createTestPlugin = (
  name: string,
  overrides?: Partial<BlocPlugin<any, any>>,
): BlocPlugin<any, any> => ({
  name,
  version: '1.0.0',
  ...overrides,
});

describe('BlocPluginRegistry', () => {
  let registry: BlocPluginRegistry<any, any>;

  beforeEach(() => {
    registry = new BlocPluginRegistry();
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

    it('should remove plugins', () => {
      const plugin = createTestPlugin('test-plugin');

      registry.add(plugin);
      expect(registry.get('test-plugin')).toBe(plugin);

      const removed = registry.remove('test-plugin');
      expect(removed).toBe(true);
      expect(registry.get('test-plugin')).toBeUndefined();
      expect(registry.getAll()).not.toContain(plugin);
    });

    it('should return false when removing non-existent plugin', () => {
      const removed = registry.remove('non-existent');
      expect(removed).toBe(false);
    });

    it('should clear all plugins', () => {
      registry.add(createTestPlugin('plugin-1'));
      registry.add(createTestPlugin('plugin-2'));
      registry.add(createTestPlugin('plugin-3'));

      expect(registry.getAll().length).toBe(3);

      registry.clear();

      expect(registry.getAll().length).toBe(0);
    });
  });

  describe('Capability Validation', () => {
    it('should validate transformState requires readState', () => {
      const plugin = createTestPlugin('test-plugin', {
        capabilities: {
          readState: false,
          transformState: true,
          interceptEvents: false,
          persistData: false,
          accessMetadata: false,
        },
      });

      expect(() => registry.add(plugin)).toThrow(
        "Plugin 'test-plugin': transformState requires readState capability",
      );
    });

    it('should validate interceptEvents requires readState', () => {
      const plugin = createTestPlugin('test-plugin', {
        capabilities: {
          readState: false,
          transformState: false,
          interceptEvents: true,
          persistData: false,
          accessMetadata: false,
        },
      });

      expect(() => registry.add(plugin)).toThrow(
        "Plugin 'test-plugin': interceptEvents requires readState capability",
      );
    });

    it('should allow valid capability combinations', () => {
      const plugin = createTestPlugin('test-plugin', {
        capabilities: {
          readState: true,
          transformState: true,
          interceptEvents: true,
          persistData: false,
          accessMetadata: false,
        },
      });

      expect(() => registry.add(plugin)).not.toThrow();
    });
  });

  describe('Lifecycle Hooks', () => {
    it('should call onAttach for all plugins', () => {
      const onAttach1 = vi.fn();
      const onAttach2 = vi.fn();

      registry.add(createTestPlugin('plugin-1', { onAttach: onAttach1 }));
      registry.add(createTestPlugin('plugin-2', { onAttach: onAttach2 }));

      const bloc = new MockBloc();
      registry.attach(bloc);

      expect(onAttach1).toHaveBeenCalledWith(bloc);
      expect(onAttach2).toHaveBeenCalledWith(bloc);
    });

    it('should throw error when attaching twice', () => {
      registry.add(createTestPlugin('plugin-1'));

      const bloc = new MockBloc();
      registry.attach(bloc);

      expect(() => registry.attach(bloc)).toThrow(
        'Plugins are already attached',
      );
    });

    it('should remove plugin if onAttach fails', () => {
      const failingPlugin = createTestPlugin('failing-plugin', {
        onAttach: () => {
          throw new Error('Attach failed');
        },
      });

      registry.add(failingPlugin);
      registry.add(createTestPlugin('good-plugin'));

      const bloc = new MockBloc();
      registry.attach(bloc);

      expect(registry.get('failing-plugin')).toBeUndefined();
      expect(registry.get('good-plugin')).toBeDefined();
      expect(console.error).toHaveBeenCalled();
    });

    it('should call onDetach when removing attached plugin', () => {
      const onDetach = vi.fn();
      const plugin = createTestPlugin('test-plugin', { onDetach });

      registry.add(plugin);
      registry.attach(new MockBloc());
      registry.remove('test-plugin');

      expect(onDetach).toHaveBeenCalled();
    });

    it('should call onDetach for all plugins when clearing', () => {
      const onDetach1 = vi.fn();
      const onDetach2 = vi.fn();

      registry.add(createTestPlugin('plugin-1', { onDetach: onDetach1 }));
      registry.add(createTestPlugin('plugin-2', { onDetach: onDetach2 }));

      registry.attach(new MockBloc());
      registry.clear();

      expect(onDetach1).toHaveBeenCalled();
      expect(onDetach2).toHaveBeenCalled();
    });
  });

  describe('State Transformation', () => {
    it('should transform state through all plugins', () => {
      const plugin1 = createTestPlugin('plugin-1', {
        capabilities: {
          readState: true,
          transformState: true,
          interceptEvents: false,
          persistData: false,
          accessMetadata: false,
        },
        transformState: (prev, next) => ({ ...next, modified1: true }),
      });

      const plugin2 = createTestPlugin('plugin-2', {
        capabilities: {
          readState: true,
          transformState: true,
          interceptEvents: false,
          persistData: false,
          accessMetadata: false,
        },
        transformState: (prev, next) => ({ ...next, modified2: true }),
      });

      registry.add(plugin1);
      registry.add(plugin2);

      const result = registry.transformState({ count: 0 }, { count: 1 });

      expect(result).toEqual({
        count: 1,
        modified1: true,
        modified2: true,
      });
    });

    it('should skip transformation for plugins without capability', () => {
      const plugin = createTestPlugin('plugin-1', {
        capabilities: {
          readState: true,
          transformState: false,
          interceptEvents: false,
          persistData: false,
          accessMetadata: false,
        },
        transformState: vi.fn(),
      });

      registry.add(plugin);

      registry.transformState({ count: 0 }, { count: 1 });

      expect(plugin.transformState).not.toHaveBeenCalled();
    });

    it('should continue on transformation error', () => {
      const plugin1 = createTestPlugin('plugin-1', {
        transformState: () => {
          throw new Error('Transform failed');
        },
      });

      const plugin2 = createTestPlugin('plugin-2', {
        transformState: (prev, next) => ({ ...next, modified: true }),
      });

      registry.add(plugin1);
      registry.add(plugin2);

      const result = registry.transformState({ count: 0 }, { count: 1 });

      expect(result).toEqual({ count: 1, modified: true });
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Event Transformation', () => {
    it('should transform event through all plugins', () => {
      const plugin1 = createTestPlugin('plugin-1', {
        capabilities: {
          readState: true,
          transformState: false,
          interceptEvents: true,
          persistData: false,
          accessMetadata: false,
        },
        transformEvent: (event) => ({ ...event, modified1: true }),
      });

      const plugin2 = createTestPlugin('plugin-2', {
        capabilities: {
          readState: true,
          transformState: false,
          interceptEvents: true,
          persistData: false,
          accessMetadata: false,
        },
        transformEvent: (event) => ({ ...event, modified2: true }),
      });

      registry.add(plugin1);
      registry.add(plugin2);

      const result = registry.transformEvent({ type: 'TEST' });

      expect(result).toEqual({
        type: 'TEST',
        modified1: true,
        modified2: true,
      });
    });

    it('should stop transformation chain if event becomes null', () => {
      const plugin1 = createTestPlugin('plugin-1', {
        transformEvent: () => null,
      });

      const plugin2 = createTestPlugin('plugin-2', {
        transformEvent: vi.fn(),
      });

      registry.add(plugin1);
      registry.add(plugin2);

      const result = registry.transformEvent({ type: 'TEST' });

      expect(result).toBeNull();
      expect(plugin2.transformEvent).not.toHaveBeenCalled();
    });
  });

  describe('Notifications', () => {
    it('should notify plugins of state changes', () => {
      const onStateChange1 = vi.fn();
      const onStateChange2 = vi.fn();

      registry.add(
        createTestPlugin('plugin-1', { onStateChange: onStateChange1 }),
      );
      registry.add(
        createTestPlugin('plugin-2', { onStateChange: onStateChange2 }),
      );

      const prevState = { count: 0 };
      const currState = { count: 1 };

      registry.notifyStateChange(prevState, currState);

      expect(onStateChange1).toHaveBeenCalledWith(prevState, currState);
      expect(onStateChange2).toHaveBeenCalledWith(prevState, currState);
    });

    it('should notify plugins of events', () => {
      const onEvent1 = vi.fn();
      const onEvent2 = vi.fn();

      registry.add(createTestPlugin('plugin-1', { onEvent: onEvent1 }));
      registry.add(createTestPlugin('plugin-2', { onEvent: onEvent2 }));

      const event = { type: 'TEST_EVENT' };

      registry.notifyEvent(event);

      expect(onEvent1).toHaveBeenCalledWith(event);
      expect(onEvent2).toHaveBeenCalledWith(event);
    });

    it('should notify plugins of errors', () => {
      const onError1 = vi.fn();
      const onError2 = vi.fn();

      registry.add(createTestPlugin('plugin-1', { onError: onError1 }));
      registry.add(createTestPlugin('plugin-2', { onError: onError2 }));

      const error = new Error('Test error');
      const context = {
        phase: 'state-change' as const,
        operation: 'test-operation',
      };

      registry.notifyError(error, context);

      expect(onError1).toHaveBeenCalledWith(error, context);
      expect(onError2).toHaveBeenCalledWith(error, context);
    });

    it('should continue notifying on plugin errors', () => {
      const onStateChange1 = vi.fn(() => {
        throw new Error('Plugin error');
      });
      const onStateChange2 = vi.fn();

      registry.add(
        createTestPlugin('plugin-1', { onStateChange: onStateChange1 }),
      );
      registry.add(
        createTestPlugin('plugin-2', { onStateChange: onStateChange2 }),
      );

      const prevState = { count: 0 };
      const currState = { count: 1 };

      registry.notifyStateChange(prevState, currState);

      expect(onStateChange2).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Capability Checks', () => {
    it('should respect readState capability for notifications', () => {
      const plugin = createTestPlugin('plugin-1', {
        capabilities: {
          readState: false,
          transformState: false,
          interceptEvents: false,
          persistData: false,
          accessMetadata: false,
        },
        onStateChange: vi.fn(),
      });

      registry.add(plugin);
      registry.notifyStateChange({ count: 0 }, { count: 1 });

      expect(plugin.onStateChange).not.toHaveBeenCalled();
    });

    it('should use default capabilities when not specified', () => {
      const plugin = createTestPlugin('plugin-1', {
        onStateChange: vi.fn(),
      });

      registry.add(plugin);
      registry.notifyStateChange({ count: 0 }, { count: 1 });

      expect(plugin.onStateChange).toHaveBeenCalled();
    });
  });
});
