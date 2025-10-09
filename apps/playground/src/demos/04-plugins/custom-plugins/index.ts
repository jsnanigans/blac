import { DemoRegistry } from '@/core/utils/demoRegistry';
import { CustomPluginsDemo } from './CustomPluginsDemo';
// eslint-disable-next-line import/no-unused-modules

const demoCode = `import React, { useState, useEffect } from 'react';
import { Cubit, Blac, BlacPlugin, BlocBase } from '@blac/core';
import { useBloc } from '@blac/react';

// Custom Analytics Plugin - Tracks all state changes and lifecycle events
class AnalyticsPlugin implements BlacPlugin {
  name = 'AnalyticsPlugin';
  version = '1.0.0';
  private events: Array<{
    timestamp: number;
    event: string;
    bloc: string;
    data?: any;
  }> = [];

  onBlocCreated(bloc: BlocBase<any>) {
    this.recordEvent('CREATED', bloc);
  }

  onBlocDisposed(bloc: BlocBase<any>) {
    this.recordEvent('DISPOSED', bloc);
  }

  onStateChanged(bloc: BlocBase<any>, previousState: any, currentState: any) {
    this.recordEvent('STATE_CHANGED', bloc, {
      previous: previousState,
      current: currentState,
    });
  }

  private recordEvent(event: string, bloc: BlocBase<any>, data?: any) {
    const entry = {
      timestamp: Date.now(),
      event,
      bloc: bloc._name || 'Unknown',
      data,
    };

    this.events.push(entry);
    // Keep only last 20 events
    if (this.events.length > 20) {
      this.events.shift();
    }
  }

  getEvents() {
    return this.events;
  }
}

// Custom Validation Plugin - Validates state changes against rules
class ValidationPlugin implements BlacPlugin {
  name = 'ValidationPlugin';
  version = '1.0.0';
  private validators: Map<string, (state: any) => string | null> = new Map();
  private errors: Map<string, string> = new Map();

  registerValidator(
    blocName: string,
    validator: (state: any) => string | null
  ) {
    this.validators.set(blocName, validator);
  }

  onStateChanged(bloc: BlocBase<any>, _previousState: any, currentState: any) {
    const blocName = bloc._name || 'Unknown';
    const validator = this.validators.get(blocName);

    if (validator) {
      const error = validator(currentState);
      if (error) {
        this.errors.set(blocName, error);
        console.warn(\`[Validation] \${blocName}: \${error}\`);
      } else {
        this.errors.delete(blocName);
      }
    }
  }

  getErrors() {
    return Array.from(this.errors.entries()).map(([bloc, error]) => ({
      bloc,
      error,
    }));
  }
}

// Demo Cubit
class PluginDemoCubit extends Cubit<{ count: number; message: string }> {
  constructor() {
    super({ count: 0, message: 'Hello' });
    this._name = 'PluginDemoCubit';
  }

  increment = () => {
    this.emit({ ...this.state, count: this.state.count + 1 });
  };

  decrement = () => {
    this.emit({ ...this.state, count: this.state.count - 1 });
  };

  updateMessage = (message: string) => {
    this.emit({ ...this.state, message });
  };
}

// Initialize plugins
const analyticsPlugin = new AnalyticsPlugin();
const validationPlugin = new ValidationPlugin();

// Register validator
validationPlugin.registerValidator('PluginDemoCubit', (state) => {
  if (state.count < 0) return 'Count cannot be negative';
  if (state.count > 10) return 'Count cannot exceed 10';
  if (state.message.length > 20) return 'Message too long (max 20 chars)';
  return null;
});

export const CustomPluginsDemo: React.FC = () => {
  const [state, cubit] = useBloc(PluginDemoCubit);
  const [pluginsEnabled, setPluginsEnabled] = useState(false);

  useEffect(() => {
    if (pluginsEnabled) {
      // Add plugins to the system
      Blac.instance.plugins.add(analyticsPlugin);
      Blac.instance.plugins.add(validationPlugin);
    } else {
      // Remove plugins from the system
      Blac.instance.plugins.remove(analyticsPlugin.name);
      Blac.instance.plugins.remove(validationPlugin.name);
    }

    return () => {
      // Cleanup
      Blac.instance.plugins.remove(analyticsPlugin.name);
      Blac.instance.plugins.remove(validationPlugin.name);
    };
  }, [pluginsEnabled]);

  return (
    <div>
      {/* Plugin controls and demo UI */}
    </div>
  );
};`;

const testCode = `import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PluginDemoCubit, AnalyticsPlugin, ValidationPlugin } from './CustomPluginsDemo';
import { Blac } from '@blac/core';

describe('CustomPluginsDemo', () => {
  let cubit: PluginDemoCubit;
  let analyticsPlugin: AnalyticsPlugin;
  let validationPlugin: ValidationPlugin;

  beforeEach(() => {
    cubit = new PluginDemoCubit();
    analyticsPlugin = new AnalyticsPlugin();
    validationPlugin = new ValidationPlugin();
    
    // Register validator
    validationPlugin.registerValidator('PluginDemoCubit', (state) => {
      if (state.count < 0) return 'Count cannot be negative';
      if (state.count > 10) return 'Count cannot exceed 10';
      if (state.message.length > 20) return 'Message too long';
      return null;
    });
  });

  afterEach(() => {
    // Clean up plugins
    Blac.instance.plugins.remove(analyticsPlugin.name);
    Blac.instance.plugins.remove(validationPlugin.name);
  });

  describe('AnalyticsPlugin', () => {
    it('should track state changes', () => {
      Blac.instance.plugins.add(analyticsPlugin);
      
      cubit.increment();
      cubit.updateMessage('Test');
      
      const events = analyticsPlugin.getEvents();
      expect(events.length).toBeGreaterThan(0);
      
      const stateChangeEvents = events.filter(e => e.event === 'STATE_CHANGED');
      expect(stateChangeEvents.length).toBe(2);
    });

    it('should track bloc lifecycle', () => {
      Blac.instance.plugins.add(analyticsPlugin);
      
      const newCubit = new PluginDemoCubit();
      const events = analyticsPlugin.getEvents();
      
      const createEvents = events.filter(e => e.event === 'CREATED');
      expect(createEvents.length).toBeGreaterThan(0);
    });
  });

  describe('ValidationPlugin', () => {
    it('should validate state changes', () => {
      Blac.instance.plugins.add(validationPlugin);
      
      // Valid state
      cubit.increment();
      expect(validationPlugin.getErrors()).toHaveLength(0);
      
      // Invalid state - negative count
      cubit.emit({ count: -1, message: 'Hello' });
      const errors = validationPlugin.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].error).toContain('negative');
    });

    it('should validate message length', () => {
      Blac.instance.plugins.add(validationPlugin);
      
      cubit.updateMessage('This is a very long message that exceeds the limit');
      const errors = validationPlugin.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0].error).toContain('too long');
    });

    it('should clear errors when state becomes valid', () => {
      Blac.instance.plugins.add(validationPlugin);
      
      // Create invalid state
      cubit.emit({ count: -1, message: 'Hello' });
      expect(validationPlugin.getErrors()).toHaveLength(1);
      
      // Fix the state
      cubit.emit({ count: 0, message: 'Hello' });
      expect(validationPlugin.getErrors()).toHaveLength(0);
    });
  });

  describe('Plugin Integration', () => {
    it('should work with multiple plugins simultaneously', () => {
      Blac.instance.plugins.add(analyticsPlugin);
      Blac.instance.plugins.add(validationPlugin);
      
      cubit.increment();
      
      // Analytics should track the change
      const events = analyticsPlugin.getEvents();
      expect(events.length).toBeGreaterThan(0);
      
      // Validation should pass
      expect(validationPlugin.getErrors()).toHaveLength(0);
    });

    it('should handle plugin removal', () => {
      Blac.instance.plugins.add(analyticsPlugin);
      cubit.increment();
      
      const eventCount = analyticsPlugin.getEvents().length;
      
      // Remove plugin
      Blac.instance.plugins.remove(analyticsPlugin.name);
      
      // Further changes should not be tracked
      cubit.increment();
      expect(analyticsPlugin.getEvents().length).toBe(eventCount);
    });
  });
});`;

DemoRegistry.register({
  id: 'custom-plugins',
  title: 'Custom Plugins (Creating)',
  description:
    '⚠️ Advanced - Learn how to USE plugins first! This demo shows how to CREATE custom plugins to extend BlaC functionality with analytics, validation, logging, and more',
  category: '04-plugins',
  difficulty: 'advanced',
  tags: ['plugins', 'extensibility', 'analytics', 'validation', 'logging'],
  concepts: [
    'BlacPlugin interface implementation',
    'System-wide plugin registration',
    'Lifecycle hooks (onBlocCreated, onStateChanged, onBlocDisposed)',
    'Custom analytics tracking',
    'State validation rules',
    'Performance monitoring',
    'Configurable logging',
    'Plugin composition and interaction',
  ],
  component: CustomPluginsDemo,
  code: {
    demo: '',
  },
  prerequisites: ['persistence'], // Note: middleware-basics will be created later as a better intro
  relatedDemos: ['persistence'],
  documentation: `
## Creating Custom Plugins

⚠️ **Important**: This demo shows how to **CREATE** custom plugins. To learn how to **USE** built-in plugins, see the Persistence demo first!

### Plugin Lifecycle Hooks

Custom plugins can tap into key moments in a Bloc's lifecycle:

- \`onBlocCreated()\` - When a new Bloc instance is created
- \`onStateChanged()\` - When a Bloc's state changes
- \`onBlocDisposed()\` - When a Bloc is disposed

### Creating Your Own Plugin

Implement the \`BlacPlugin\` interface:

\`\`\`typescript
class MyPlugin implements BlacPlugin {
  name = 'MyPlugin';
  version = '1.0.0';

  onStateChanged(bloc, previousState, currentState) {
    // Your custom logic here
  }
}
\`\`\`

### Use Cases

- **Analytics**: Track user interactions and state changes
- **Validation**: Enforce business rules on state
- **Logging**: Debug state transitions
- **Performance**: Monitor render counts and timing
- **Persistence**: Auto-save state to storage
- **DevTools**: Integrate with debugging tools
`,
});
