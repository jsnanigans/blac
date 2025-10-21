import { Button } from '@/ui/Button';
import { Cubit, Blac, BlacPlugin, BlocBase } from '@blac/core';
import { useBloc } from '@blac/react';
import { motion } from 'framer-motion';
import {
  Plug,
  BarChart3,
  FileText,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

// ============================================================================
// Plugin Implementations
// ============================================================================

// Analytics Plugin
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

    if (this.events.length > 20) {
      this.events.shift();
    }

    console.log(`[Analytics] ${entry.bloc}: ${entry.event}`, data);
  }

  getEvents() {
    return this.events;
  }
}

// Performance Plugin
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
}

// Validation Plugin
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
}

// Logging Plugin
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
// Interactive Component
// ============================================================================

export function CustomPluginsInteractive() {
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
      Blac.instance.plugins.add(analyticsPlugin);
      Blac.instance.plugins.add(performancePlugin);
      Blac.instance.plugins.add(validationPlugin);
      Blac.instance.plugins.add(loggingPlugin);
      loggingPlugin.setLogLevel(logLevel);
    } else {
      Blac.instance.plugins.remove(analyticsPlugin.name);
      Blac.instance.plugins.remove(performancePlugin.name);
      Blac.instance.plugins.remove(validationPlugin.name);
      Blac.instance.plugins.remove(loggingPlugin.name);
    }

    return () => {
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
    <div className="my-8 space-y-6 not-prose">
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

        <div className="relative overflow-hidden rounded-2xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-3">
          <p className="text-xs font-medium text-blue-900 dark:text-blue-100 mb-1">
            💡 Check the Console
          </p>
          <p className="text-xs text-blue-800 dark:text-blue-200">
            Open your browser console (F12) to see the plugins in action. The
            logging plugin will show formatted output for all state changes.
          </p>
        </div>
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
                  <h5 className="font-semibold">Analytics Events (Last 5)</h5>
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

      <div className="relative overflow-hidden rounded-3xl border border-brand/30 bg-gradient-to-br from-brand/5 to-brand/10 p-4">
        <div className="relative">
          <p className="text-sm font-medium text-foreground mb-2">
            💡 Try This
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Enable the plugins and watch the console for log output</li>
            <li>
              Increment the counter to 11 or decrement below 0 to trigger
              validation errors
            </li>
            <li>Click "Long Msg" to see validation for message length</li>
            <li>
              Change the log level to "verbose" to see detailed state diffs
            </li>
            <li>
              Notice how analytics and performance metrics update in real-time
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
