import { DemoArticle } from '@/components/demo-article/DemoArticle';
import { ArticleSection } from '@/components/demo-article/ArticleSection';
import { Prose } from '@/components/demo-article/Prose';
import { CodePanel } from '@/components/demo-article/CodePanel';
import { ConceptCallout } from '@/components/shared/ConceptCallout';
import { Button } from '@/ui/Button';
import { Cubit, Blac, BlacPlugin, BlocBase } from '@blac/core';
import { useBloc } from '@blac/react';
import { motion } from 'framer-motion';
import {
  Plug,
  BarChart3,
  Shield,
  FileText,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

// ============================================================================
// Plugin Implementations
// ============================================================================

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

    // Log to console for demo
    console.log(`[Analytics] ${entry.bloc}: ${entry.event}`, data);
  }

  getEvents() {
    return this.events;
  }

  clearEvents() {
    this.events = [];
  }
}

// Custom Performance Monitoring Plugin - Measures update frequency and timing
class PerformancePlugin implements BlacPlugin {
  name = 'PerformancePlugin';
  version = '1.0.0';
  private metrics: Map<
    string,
    { count: number; totalTime: number; lastUpdate: number }
  > = new Map();

  onStateChanged(bloc: BlocBase<any>, _previousState: any, _currentState: any) {
    const blocName = bloc._name || 'Unknown';
    const now = Date.now();
    const metric = this.metrics.get(blocName) || {
      count: 0,
      totalTime: 0,
      lastUpdate: now,
    };

    const timeSinceLastUpdate = now - metric.lastUpdate;
    metric.count++;
    metric.totalTime += timeSinceLastUpdate;
    metric.lastUpdate = now;

    this.metrics.set(blocName, metric);
  }

  getMetrics() {
    const results: any[] = [];
    this.metrics.forEach((metric, blocName) => {
      results.push({
        bloc: blocName,
        updates: metric.count,
        avgTime:
          metric.count > 0 ? (metric.totalTime / metric.count).toFixed(2) : 0,
      });
    });
    return results;
  }

  reset() {
    this.metrics.clear();
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
    validator: (state: any) => string | null,
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
        console.warn(`[Validation] ${blocName}: ${error}`);
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

  hasErrors() {
    return this.errors.size > 0;
  }
}

// Custom Logging Plugin - Logs all state changes with formatting
class LoggingPlugin implements BlacPlugin {
  name = 'LoggingPlugin';
  version = '1.0.0';
  private enabled = true;
  private logLevel: 'verbose' | 'normal' | 'minimal' = 'normal';

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  setLogLevel(level: 'verbose' | 'normal' | 'minimal') {
    this.logLevel = level;
  }

  onBlocCreated(bloc: BlocBase<any>) {
    if (!this.enabled) return;
    console.log(
      `%c[BlaC] ${bloc._name} created`,
      'color: green; font-weight: bold',
    );
  }

  onStateChanged(bloc: BlocBase<any>, previousState: any, currentState: any) {
    if (!this.enabled) return;

    const blocName = bloc._name || 'Unknown';

    switch (this.logLevel) {
      case 'verbose':
        console.group(`%c[BlaC] ${blocName} state changed`, 'color: blue');
        console.log('Previous:', previousState);
        console.log('Current:', currentState);
        console.groupEnd();
        break;
      case 'normal':
        console.log(`%c[BlaC] ${blocName} →`, 'color: blue', currentState);
        break;
      case 'minimal':
        console.log(`[BlaC] ${blocName} updated`);
        break;
    }
  }

  onBlocDisposed(bloc: BlocBase<any>) {
    if (!this.enabled) return;
    console.log(
      `%c[BlaC] ${bloc._name} disposed`,
      'color: red; font-weight: bold',
    );
  }
}

// ============================================================================
// Demo Cubit
// ============================================================================

interface PluginDemoState {
  count: number;
  message: string;
}

class PluginDemoCubit extends Cubit<PluginDemoState> {
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

  reset = () => {
    this.emit({ count: 0, message: 'Hello' });
  };
}

// ============================================================================
// Plugin Instances
// ============================================================================

const analyticsPlugin = new AnalyticsPlugin();
const performancePlugin = new PerformancePlugin();
const validationPlugin = new ValidationPlugin();
const loggingPlugin = new LoggingPlugin();

// Register validator for demo cubit
validationPlugin.registerValidator('PluginDemoCubit', (state) => {
  if (state.count < 0) return 'Count cannot be negative';
  if (state.count > 10) return 'Count cannot exceed 10';
  if (state.message.length > 20) return 'Message too long (max 20 chars)';
  return null;
});

// ============================================================================
// Main Demo Component
// ============================================================================

export const CustomPluginsDemo: React.FC = () => {
  const [state, cubit] = useBloc(PluginDemoCubit);
  const [pluginsEnabled, setPluginsEnabled] = useState(false);
  const [analyticsEvents, setAnalyticsEvents] = useState<any[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);
  const [logLevel, setLogLevel] = useState<'verbose' | 'normal' | 'minimal'>(
    'normal',
  );

  useEffect(() => {
    if (pluginsEnabled) {
      // Add plugins
      Blac.instance.plugins.add(analyticsPlugin);
      Blac.instance.plugins.add(performancePlugin);
      Blac.instance.plugins.add(validationPlugin);
      Blac.instance.plugins.add(loggingPlugin);
      loggingPlugin.setLogLevel(logLevel);
    } else {
      // Remove plugins
      Blac.instance.plugins.remove(analyticsPlugin.name);
      Blac.instance.plugins.remove(performancePlugin.name);
      Blac.instance.plugins.remove(validationPlugin.name);
      Blac.instance.plugins.remove(loggingPlugin.name);
    }

    return () => {
      // Cleanup
      Blac.instance.plugins.remove(analyticsPlugin.name);
      Blac.instance.plugins.remove(performancePlugin.name);
      Blac.instance.plugins.remove(validationPlugin.name);
      Blac.instance.plugins.remove(loggingPlugin.name);
    };
  }, [pluginsEnabled]);

  useEffect(() => {
    loggingPlugin.setLogLevel(logLevel);
  }, [logLevel]);

  const updatePluginData = () => {
    setAnalyticsEvents(analyticsPlugin.getEvents());
    setPerformanceMetrics(performancePlugin.getMetrics());
    setValidationErrors(validationPlugin.getErrors());
  };

  useEffect(() => {
    if (pluginsEnabled) {
      updatePluginData();
    }
  }, [state, pluginsEnabled]);

  return (
    <DemoArticle
      metadata={{
        id: 'custom-plugins',
        title: 'Creating Custom Plugins',
        description:
          'Learn how to extend BlaC with custom plugins for analytics, validation, logging, and performance monitoring',
        category: '04-plugins',
        difficulty: 'advanced',
        tags: [
          'plugins',
          'extensibility',
          'analytics',
          'validation',
          'logging',
          'performance',
        ],
        estimatedTime: 30,
      }}
    >
      {/* Introduction Section */}
      <ArticleSection theme="bloc" id="introduction">
        <Prose>
          <h2>Extending BlaC with Custom Plugins</h2>
          <p>
            BlaC's plugin system allows you to extend the framework with custom
            functionality that runs automatically across all Blocs in your
            application. Plugins can intercept lifecycle events, monitor state
            changes, validate data, track analytics, and more.
          </p>
          <p>
            The plugin architecture follows the Observer pattern: plugins
            register with the BlaC system and receive notifications whenever
            significant events occur. This makes plugins perfect for
            cross-cutting concerns like logging, debugging, analytics, and
            validation.
          </p>
        </Prose>

        <ConceptCallout type="info" title="Plugin Use Cases">
          <ul className="text-sm space-y-1 list-disc list-inside">
            <li>
              <strong>Analytics:</strong> Track user interactions and state
              changes for product insights
            </li>
            <li>
              <strong>Validation:</strong> Enforce business rules and data
              constraints across all Blocs
            </li>
            <li>
              <strong>Logging:</strong> Debug state transitions with formatted
              console output
            </li>
            <li>
              <strong>Performance:</strong> Monitor render counts, timing, and
              optimization opportunities
            </li>
            <li>
              <strong>Persistence:</strong> Auto-save state to localStorage,
              IndexedDB, or remote storage
            </li>
            <li>
              <strong>DevTools:</strong> Integrate with browser developer tools
              or time-travel debugging
            </li>
          </ul>
        </ConceptCallout>
      </ArticleSection>

      {/* Interactive Demo Section */}
      <ArticleSection theme="bloc" id="demo">
        <Prose>
          <h2>Interactive Plugin Demo</h2>
          <p>
            This demo showcases four custom plugins working together. Enable the
            plugins and interact with the controls to see how they automatically
            track events, validate state, monitor performance, and log activity.
          </p>
        </Prose>

        <div className="space-y-6 not-prose">
          {/* Plugin Controls */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg border-2 border-slate-200 dark:border-slate-700"
          >
            <div className="flex items-center gap-2 mb-4">
              <Plug className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <h4 className="font-semibold text-lg">Plugin System</h4>
            </div>

            <div className="flex flex-wrap items-center gap-4 mb-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pluginsEnabled}
                  onChange={(e) => setPluginsEnabled(e.target.checked)}
                  className="w-5 h-5 rounded cursor-pointer"
                />
                <span className="font-medium text-lg">
                  {pluginsEnabled ? (
                    <span className="text-green-600 dark:text-green-400">
                      ✅ Plugins Enabled
                    </span>
                  ) : (
                    <span className="text-gray-600 dark:text-gray-400">
                      ❌ Plugins Disabled
                    </span>
                  )}
                </span>
              </label>

              {pluginsEnabled && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  <label className="text-sm font-medium">Log Level:</label>
                  <select
                    value={logLevel}
                    onChange={(e) => setLogLevel(e.target.value as any)}
                    className="px-3 py-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-sm"
                  >
                    <option value="minimal">Minimal</option>
                    <option value="normal">Normal</option>
                    <option value="verbose">Verbose</option>
                  </select>
                </motion.div>
              )}
            </div>

            <ConceptCallout type="tip" title="Check the Console">
              <p className="text-xs">
                Open your browser console (F12) to see the plugins in action.
                The logging plugin will show formatted output for all state
                changes and lifecycle events.
              </p>
            </ConceptCallout>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* State Controls */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-2 border-blue-200 dark:border-blue-800"
            >
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5 text-blue-600" />
                <h4 className="font-semibold">State Controls</h4>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-md p-4 mb-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Count:
                    </span>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {state.count}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      Message:
                    </span>
                    <p className="text-lg font-semibold text-blue-600 dark:text-blue-400 truncate">
                      {state.message}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={cubit.increment} variant="primary">
                    +1
                  </Button>
                  <Button onClick={cubit.decrement} variant="primary">
                    -1
                  </Button>
                  <Button
                    onClick={() => cubit.updateMessage('Hi!')}
                    variant="secondary"
                  >
                    Hi!
                  </Button>
                  <Button
                    onClick={() =>
                      cubit.updateMessage('This is a very long message')
                    }
                    variant="secondary"
                  >
                    Long Msg
                  </Button>
                  <Button
                    onClick={cubit.reset}
                    variant="ghost"
                    className="col-span-2"
                  >
                    Reset
                  </Button>
                </div>
              </div>

              {validationErrors.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 bg-red-100 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700 rounded-md"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <strong className="text-red-700 dark:text-red-400">
                      Validation Errors:
                    </strong>
                  </div>
                  {validationErrors.map((error, i) => (
                    <div
                      key={i}
                      className="text-sm mt-1 text-red-600 dark:text-red-400"
                    >
                      • {error.error}
                    </div>
                  ))}
                </motion.div>
              )}
            </motion.div>

            {/* Plugin Data */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              {!pluginsEnabled ? (
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-8 text-center text-gray-500 dark:text-gray-400 h-full flex items-center justify-center">
                  <div>
                    <Plug className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">
                      Enable plugins to see analytics, performance metrics, and
                      validation
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Analytics Events */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border-2 border-purple-200 dark:border-purple-800">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="w-4 h-4 text-purple-600" />
                      <h5 className="font-semibold">
                        Analytics Events (Last 5)
                      </h5>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-700 rounded p-3 text-xs font-mono max-h-40 overflow-y-auto">
                      {analyticsEvents.length === 0 ? (
                        <div className="text-gray-500 text-center py-4">
                          No events yet
                        </div>
                      ) : (
                        analyticsEvents.slice(-5).map((event, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="mb-2 pb-2 border-b border-gray-300 dark:border-gray-600 last:border-0"
                          >
                            <span className="text-gray-500">
                              {new Date(event.timestamp).toLocaleTimeString()}
                            </span>{' '}
                            <span className="text-purple-600 dark:text-purple-400 font-semibold">
                              {event.event}
                            </span>
                            {event.data && (
                              <div className="text-green-600 dark:text-green-400 mt-1 truncate">
                                {JSON.stringify(event.data).substring(0, 60)}
                                ...
                              </div>
                            )}
                          </motion.div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 border-2 border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="w-4 h-4 text-green-600" />
                      <h5 className="font-semibold">Performance Metrics</h5>
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-700 rounded p-3 text-sm">
                      {performanceMetrics.length === 0 ? (
                        <div className="text-gray-500 text-center py-2">
                          No metrics yet
                        </div>
                      ) : (
                        performanceMetrics.map((metric, i) => (
                          <div
                            key={i}
                            className="flex justify-between items-center"
                          >
                            <span className="font-medium">{metric.bloc}:</span>
                            <span className="text-green-600 dark:text-green-400">
                              {metric.updates} updates, avg {metric.avgTime}ms
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        </div>

        <ConceptCallout type="success" title="Try This">
          <ol className="text-sm space-y-1 list-decimal list-inside">
            <li>Enable the plugins and watch the console for log output</li>
            <li>
              Increment the counter to 11 or decrement below 0 to trigger
              validation errors
            </li>
            <li>Click "Long Msg" to see validation for message length</li>
            <li>
              Change the log level to "verbose" to see detailed state diffs
            </li>
            <li>Notice how analytics and performance metrics update in real-time</li>
          </ol>
        </ConceptCallout>
      </ArticleSection>

      {/* Implementation Section */}
      <ArticleSection theme="bloc" id="implementation">
        <Prose>
          <h2>Creating Your Own Plugins</h2>
          <p>
            Plugins implement the <code>BlacPlugin</code> interface, which
            defines hooks for key lifecycle events. Let's explore how to create
            each type of plugin.
          </p>
        </Prose>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              1. Validation Plugin
            </h3>
            <Prose>
              <p>
                Validation plugins enforce business rules and data constraints
                across all Blocs automatically.
              </p>
            </Prose>
            <CodePanel
              code={`import { BlacPlugin, BlocBase } from '@blac/core';

class ValidationPlugin implements BlacPlugin {
  name = 'ValidationPlugin';
  version = '1.0.0';

  private validators: Map<string, (state: any) => string | null> = new Map();
  private errors: Map<string, string> = new Map();

  // Register a validator for a specific Bloc
  registerValidator(
    blocName: string,
    validator: (state: any) => string | null
  ) {
    this.validators.set(blocName, validator);
  }

  // Hook: Called whenever ANY Bloc's state changes
  onStateChanged(bloc: BlocBase<any>, _prev: any, current: any) {
    const blocName = bloc._name || 'Unknown';
    const validator = this.validators.get(blocName);

    if (validator) {
      const error = validator(current);
      if (error) {
        this.errors.set(blocName, error);
        console.warn(\`[Validation] \${blocName}: \${error}\`);
      } else {
        this.errors.delete(blocName);
      }
    }
  }

  getErrors() {
    return Array.from(this.errors.entries());
  }
}

// Usage
const validationPlugin = new ValidationPlugin();

// Register validation rules
validationPlugin.registerValidator('CounterCubit', (state) => {
  if (state.count < 0) return 'Count cannot be negative';
  if (state.count > 100) return 'Count cannot exceed 100';
  return null; // No error
});

// Add to BlaC
Blac.instance.plugins.add(validationPlugin);`}
              language="typescript"
              lineLabels={{
                2: 'Implement BlacPlugin',
                3: 'Plugin metadata',
                6: 'Store validators',
                7: 'Track errors',
                10: 'Register validator',
                17: 'State change hook',
                20: 'Get validator for Bloc',
                23: 'Run validation',
                24: 'Handle error',
                27: 'Clear error',
              }}
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              2. Analytics Plugin
            </h3>
            <Prose>
              <p>
                Analytics plugins track user interactions and state changes for
                product insights and monitoring.
              </p>
            </Prose>
            <CodePanel
              code={`class AnalyticsPlugin implements BlacPlugin {
  name = 'AnalyticsPlugin';
  version = '1.0.0';

  private events: Array<{
    timestamp: number;
    event: string;
    bloc: string;
    data?: any;
  }> = [];

  // Hook: Bloc creation
  onBlocCreated(bloc: BlocBase<any>) {
    this.recordEvent('CREATED', bloc);

    // Send to analytics service
    this.sendToAnalytics({
      event: 'bloc_created',
      properties: {
        blocName: bloc._name,
        timestamp: Date.now(),
      }
    });
  }

  // Hook: State changes
  onStateChanged(bloc: BlocBase<any>, prev: any, current: any) {
    this.recordEvent('STATE_CHANGED', bloc, {
      previous: prev,
      current: current,
    });

    // Track meaningful changes
    if (prev.count !== current.count) {
      this.sendToAnalytics({
        event: 'counter_changed',
        properties: {
          blocName: bloc._name,
          oldValue: prev.count,
          newValue: current.count,
        }
      });
    }
  }

  // Hook: Bloc disposal
  onBlocDisposed(bloc: BlocBase<any>) {
    this.recordEvent('DISPOSED', bloc);
  }

  private recordEvent(event: string, bloc: BlocBase<any>, data?: any) {
    this.events.push({
      timestamp: Date.now(),
      event,
      bloc: bloc._name || 'Unknown',
      data,
    });

    // Keep buffer size manageable
    if (this.events.length > 100) {
      this.events.shift();
    }
  }

  private sendToAnalytics(data: any) {
    // Send to your analytics service (e.g., Mixpanel, Segment)
    console.log('[Analytics]', data);
  }
}`}
              language="typescript"
              lineLabels={{
                13: 'Track creation',
                16: 'Send to service',
                26: 'Track state changes',
                33: 'Track specific changes',
                46: 'Track disposal',
                50: 'Buffer events',
                63: 'Send to analytics',
              }}
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <Activity className="w-5 h-5" />
              3. Performance Plugin
            </h3>
            <Prose>
              <p>
                Performance plugins monitor update frequency, timing, and
                optimization opportunities.
              </p>
            </Prose>
            <CodePanel
              code={`class PerformancePlugin implements BlacPlugin {
  name = 'PerformancePlugin';
  version = '1.0.0';

  private metrics = new Map<string, {
    count: number;
    totalTime: number;
    lastUpdate: number;
  }>();

  onStateChanged(bloc: BlocBase<any>, _prev: any, _current: any) {
    const blocName = bloc._name || 'Unknown';
    const now = Date.now();

    const metric = this.metrics.get(blocName) || {
      count: 0,
      totalTime: 0,
      lastUpdate: now,
    };

    const timeSinceLastUpdate = now - metric.lastUpdate;
    metric.count++;
    metric.totalTime += timeSinceLastUpdate;
    metric.lastUpdate = now;

    this.metrics.set(blocName, metric);

    // Warn if updates are too frequent
    if (timeSinceLastUpdate < 16) {
      console.warn(
        \`[Performance] \${blocName} updating very frequently (\${timeSinceLastUpdate}ms)\`
      );
    }
  }

  getMetrics() {
    const results: any[] = [];
    this.metrics.forEach((metric, blocName) => {
      results.push({
        bloc: blocName,
        updates: metric.count,
        avgTime: (metric.totalTime / metric.count).toFixed(2),
      });
    });
    return results;
  }

  reportSlowUpdates() {
    this.metrics.forEach((metric, blocName) => {
      const avgTime = metric.totalTime / metric.count;
      if (avgTime > 100) {
        console.warn(
          \`[Performance] \${blocName} has slow avg update time: \${avgTime.toFixed(2)}ms\`
        );
      }
    });
  }
}`}
              language="typescript"
              lineLabels={{
                5: 'Track metrics',
                11: 'On state change',
                15: 'Get or create metric',
                21: 'Calculate timing',
                28: 'Warn on high frequency',
                48: 'Warn on slow updates',
              }}
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              4. Logging Plugin
            </h3>
            <Prose>
              <p>
                Logging plugins provide formatted console output for debugging
                and development.
              </p>
            </Prose>
            <CodePanel
              code={`class LoggingPlugin implements BlacPlugin {
  name = 'LoggingPlugin';
  version = '1.0.0';
  private logLevel: 'verbose' | 'normal' | 'minimal' = 'normal';
  private enabled = true;

  setLogLevel(level: 'verbose' | 'normal' | 'minimal') {
    this.logLevel = level;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  onBlocCreated(bloc: BlocBase<any>) {
    if (!this.enabled) return;
    console.log(
      \`%c[BlaC] \${bloc._name} created\`,
      'color: green; font-weight: bold'
    );
  }

  onStateChanged(bloc: BlocBase<any>, prev: any, current: any) {
    if (!this.enabled) return;

    const blocName = bloc._name || 'Unknown';

    switch (this.logLevel) {
      case 'verbose':
        console.group(\`%c[BlaC] \${blocName} state changed\`, 'color: blue');
        console.log('Previous:', prev);
        console.log('Current:', current);
        console.log('Diff:', this.calculateDiff(prev, current));
        console.groupEnd();
        break;

      case 'normal':
        console.log(\`%c[BlaC] \${blocName} →\`, 'color: blue', current);
        break;

      case 'minimal':
        console.log(\`[BlaC] \${blocName} updated\`);
        break;
    }
  }

  onBlocDisposed(bloc: BlocBase<any>) {
    if (!this.enabled) return;
    console.log(
      \`%c[BlaC] \${bloc._name} disposed\`,
      'color: red; font-weight: bold'
    );
  }

  private calculateDiff(prev: any, current: any) {
    const diff: any = {};
    for (const key in current) {
      if (current[key] !== prev[key]) {
        diff[key] = { old: prev[key], new: current[key] };
      }
    }
    return diff;
  }
}`}
              language="typescript"
              lineLabels={{
                4: 'Configurable level',
                5: 'Enable/disable',
                15: 'Log creation',
                23: 'Log state changes',
                28: 'Verbose: full diff',
                37: 'Normal: current state',
                41: 'Minimal: just event',
                47: 'Log disposal',
                55: 'Calculate diff',
              }}
            />
          </div>
        </div>

        <ConceptCallout type="warning" title="Plugin Lifecycle">
          <p className="text-sm">
            Plugins are registered globally and apply to <strong>all</strong>{' '}
            Blocs in your application. Make sure your plugin logic is efficient
            and doesn't cause performance issues. Use conditional logic to
            filter which Blocs you want to track.
          </p>
        </ConceptCallout>
      </ArticleSection>

      {/* Architecture Section */}
      <ArticleSection theme="bloc" id="architecture">
        <Prose>
          <h2>Plugin Architecture & Best Practices</h2>
        </Prose>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ConceptCallout type="success" title="Best Practices">
            <ul className="text-sm space-y-2 list-disc list-inside">
              <li>Keep plugin logic lightweight and fast</li>
              <li>Use filtering to target specific Blocs</li>
              <li>Implement enable/disable functionality</li>
              <li>Buffer data to prevent memory leaks</li>
              <li>Handle errors gracefully (don't crash the app)</li>
              <li>Clean up resources when plugins are removed</li>
              <li>Document plugin dependencies and requirements</li>
            </ul>
          </ConceptCallout>

          <ConceptCallout type="warning" title="Common Pitfalls">
            <ul className="text-sm space-y-2 list-disc list-inside">
              <li>Expensive computations in hooks (use throttling)</li>
              <li>Unbounded memory growth (implement limits)</li>
              <li>Synchronous I/O operations (use async carefully)</li>
              <li>Logging sensitive data (filter PII)</li>
              <li>Not handling plugin removal (memory leaks)</li>
              <li>Assuming Bloc names exist (use fallbacks)</li>
            </ul>
          </ConceptCallout>
        </div>

        <Prose>
          <h3>Plugin Lifecycle Hooks</h3>
        </Prose>

        <div className="space-y-3">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
            <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">
              onBlocCreated(bloc)
            </h4>
            <p className="text-sm text-green-800 dark:text-green-200">
              Called immediately after a new Bloc/Cubit instance is created.
              Perfect for initialization tracking, setting up subscriptions, or
              sending analytics events.
            </p>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              onStateChanged(bloc, previousState, currentState)
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Called every time a Bloc's state changes. This is the most
              frequently called hook. Use it for logging, validation, analytics
              tracking, and performance monitoring.
            </p>
          </div>

          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">
              onBlocDisposed(bloc)
            </h4>
            <p className="text-sm text-red-800 dark:text-red-200">
              Called when a Bloc is being disposed. Use this for cleanup,
              tracking disposal events, or detecting memory leaks (if disposal
              isn't happening when expected).
            </p>
          </div>
        </div>

        <Prose>
          <h3>Registering and Removing Plugins</h3>
        </Prose>

        <CodePanel
          code={`import { Blac } from '@blac/core';

// Create plugin instance
const myPlugin = new MyCustomPlugin();

// Register with BlaC
Blac.instance.plugins.add(myPlugin);

// Later: remove the plugin
Blac.instance.plugins.remove(myPlugin.name);

// Check if plugin is registered
const isRegistered = Blac.instance.plugins.has('MyCustomPlugin');

// Get all registered plugins
const allPlugins = Blac.instance.plugins.getAll();`}
          language="typescript"
          lineLabels={{
            4: 'Create instance',
            7: 'Register globally',
            10: 'Remove by name',
            13: 'Check registration',
            16: 'List all plugins',
          }}
        />
      </ArticleSection>

      {/* Key Takeaways Section */}
      <ArticleSection theme="bloc" id="key-takeaways">
        <Prose>
          <h2>Key Takeaways</h2>
        </Prose>

        <ConceptCallout type="success" title="What You've Learned">
          <ul className="space-y-2 text-sm">
            <li>
              <strong>Plugin System:</strong> Extend BlaC with custom
              functionality using the BlacPlugin interface
            </li>
            <li>
              <strong>Lifecycle Hooks:</strong> Intercept creation, state
              changes, and disposal events
            </li>
            <li>
              <strong>Common Patterns:</strong> Analytics, validation, logging,
              and performance monitoring
            </li>
            <li>
              <strong>Global Registration:</strong> Plugins apply to all Blocs
              in your application
            </li>
            <li>
              <strong>Efficient Implementation:</strong> Keep hooks lightweight
              and handle errors gracefully
            </li>
            <li>
              <strong>Cross-Cutting Concerns:</strong> Perfect for debugging,
              monitoring, and quality assurance
            </li>
          </ul>
        </ConceptCallout>

        <Prose>
          <p className="text-lg font-medium text-slate-900 dark:text-slate-100 mt-6">
            Custom plugins unlock powerful capabilities for monitoring,
            debugging, and extending BlaC. By implementing the plugin interface,
            you can add sophisticated functionality that works automatically
            across your entire application without touching individual Bloc
            implementations.
          </p>
        </Prose>
      </ArticleSection>
    </DemoArticle>
  );
};
