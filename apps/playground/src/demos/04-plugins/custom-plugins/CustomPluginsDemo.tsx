import React, { useState, useEffect } from 'react';
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

  reset = () => {
    this.emit({ count: 0, message: 'Hello' });
  };
}

// Initialize plugins
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
    <div className="space-y-6">
      {/* Plugin Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Custom Plugin System</h3>
        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={pluginsEnabled}
              onChange={(e) => setPluginsEnabled(e.target.checked)}
              className="rounded"
            />
            <span className="font-medium">
              {pluginsEnabled ? '✅ Plugins Enabled' : '❌ Plugins Disabled'}
            </span>
          </label>

          {pluginsEnabled && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Log Level:</label>
              <select
                value={logLevel}
                onChange={(e) => setLogLevel(e.target.value as any)}
                className="px-2 py-1 border rounded-md dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="minimal">Minimal</option>
                <option value="normal">Normal</option>
                <option value="verbose">Verbose</option>
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* State Controls */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h4 className="font-semibold mb-4">State Controls</h4>
          <div className="bg-gray-100 dark:bg-gray-700 rounded-md p-4 mb-4">
            <div className="mb-3">
              <strong>Count:</strong> {state.count}
            </div>
            <div className="mb-4">
              <strong>Message:</strong> {state.message}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={cubit.increment}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                +1
              </button>
              <button
                onClick={cubit.decrement}
                className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                -1
              </button>
              <button
                onClick={() => cubit.updateMessage('Hi!')}
                className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Hi!
              </button>
              <button
                onClick={() =>
                  cubit.updateMessage('This is a very long message')
                }
                className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                Long Msg
              </button>
              <button
                onClick={cubit.reset}
                className="px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Reset
              </button>
            </div>
          </div>

          {validationErrors.length > 0 && (
            <div className="p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-md">
              <strong className="text-red-700 dark:text-red-400">
                Validation Errors:
              </strong>
              {validationErrors.map((error, i) => (
                <div
                  key={i}
                  className="text-sm mt-1 text-red-600 dark:text-red-400"
                >
                  {error.error}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Plugin Data */}
        <div className="space-y-4">
          {!pluginsEnabled ? (
            <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-8 text-center text-gray-500 dark:text-gray-400">
              Enable plugins to see analytics, performance metrics, and
              validation
            </div>
          ) : (
            <>
              {/* Analytics Events */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h5 className="font-semibold mb-2">
                  Analytics Events (Last 5)
                </h5>
                <div className="bg-gray-100 dark:bg-gray-700 rounded p-3 text-xs font-mono max-h-32 overflow-y-auto">
                  {analyticsEvents.slice(-5).map((event, i) => (
                    <div key={i} className="mb-1">
                      <span className="text-gray-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>{' '}
                      <span className="text-blue-600 dark:text-blue-400">
                        {event.event}
                      </span>
                      {event.data && (
                        <span className="text-green-600 dark:text-green-400">
                          {' '}
                          {JSON.stringify(event.data).substring(0, 50)}...
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance Metrics */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h5 className="font-semibold mb-2">Performance Metrics</h5>
                <div className="bg-gray-100 dark:bg-gray-700 rounded p-3 text-sm">
                  {performanceMetrics.length === 0 ? (
                    <div className="text-gray-500">No metrics yet</div>
                  ) : (
                    performanceMetrics.map((metric, i) => (
                      <div key={i}>
                        <strong>{metric.bloc}:</strong> {metric.updates}{' '}
                        updates, avg {metric.avgTime}ms between updates
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Plugin Information */}
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
        <h4 className="font-semibold mb-3">Custom Plugins Demonstrated</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h5 className="font-medium mb-2">Available Plugins:</h5>
            <ul className="space-y-1">
              <li>
                <strong>Analytics Plugin:</strong> Tracks all state changes and
                lifecycle events
              </li>
              <li>
                <strong>Performance Plugin:</strong> Measures update frequency
                and timing
              </li>
              <li>
                <strong>Validation Plugin:</strong> Validates state changes
                against custom rules
              </li>
              <li>
                <strong>Logging Plugin:</strong> Configurable console logging
                with formatting
              </li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium mb-2">Plugin API:</h5>
            <ul className="space-y-1 font-mono text-xs">
              <li>BlacPlugin interface with lifecycle hooks</li>
              <li>Blac.addPlugin(plugin) - Register globally</li>
              <li>Blac.removePlugin(plugin) - Unregister</li>
              <li>onBlocCreated() - Bloc creation hook</li>
              <li>onStateChanged() - State change hook</li>
              <li>onBlocDisposed() - Bloc disposal hook</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
