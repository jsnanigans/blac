import React, { useState, useEffect } from 'react';
import { Cubit, Blac, BlacPlugin, BlocBase } from '@blac/core';
import { useBloc } from '@blac/react';
import { Button } from './ui/Button';

// Custom Analytics Plugin
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

// Custom Performance Monitoring Plugin
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

// Custom Validation Plugin
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

  onStateChanged(bloc: BlocBase<any>, previousState: any, currentState: any) {
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

// Register validator for demo cubit
validationPlugin.registerValidator('PluginDemoCubit', (state) => {
  if (state.count < 0) return 'Count cannot be negative';
  if (state.count > 10) return 'Count cannot exceed 10';
  if (state.message.length > 20) return 'Message too long (max 20 chars)';
  return null;
});

const CustomPluginDemo: React.FC = () => {
  const [state, cubit] = useBloc(PluginDemoCubit);
  const [pluginsEnabled, setPluginsEnabled] = useState(false);
  const [analyticsEvents, setAnalyticsEvents] = useState<any[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<any[]>([]);
  const [validationErrors, setValidationErrors] = useState<any[]>([]);

  useEffect(() => {
    if (pluginsEnabled) {
      // Add plugins
      Blac.addPlugin(analyticsPlugin);
      Blac.addPlugin(performancePlugin);
      Blac.addPlugin(validationPlugin);
    } else {
      // Remove plugins
      Blac.removePlugin(analyticsPlugin);
      Blac.removePlugin(performancePlugin);
      Blac.removePlugin(validationPlugin);
    }

    return () => {
      // Cleanup
      Blac.removePlugin(analyticsPlugin);
      Blac.removePlugin(performancePlugin);
      Blac.removePlugin(validationPlugin);
    };
  }, [pluginsEnabled]);

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
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h4>Custom Plugin System</h4>
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="checkbox"
              checked={pluginsEnabled}
              onChange={(e) => setPluginsEnabled(e.target.checked)}
            />
            <span style={{ fontSize: '1.1em', fontWeight: 'bold' }}>
              {pluginsEnabled ? 'Plugins Enabled ✅' : 'Plugins Disabled ❌'}
            </span>
          </label>
        </div>
      </div>

      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}
      >
        <div>
          <h5>State Controls</h5>
          <div
            style={{
              padding: '15px',
              backgroundColor: '#f9f9f9',
              borderRadius: '4px',
              marginBottom: '10px',
            }}
          >
            <div style={{ marginBottom: '10px' }}>
              <strong>Count:</strong> {state.count}
            </div>
            <div style={{ marginBottom: '15px' }}>
              <strong>Message:</strong> {state.message}
            </div>

            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              <Button onClick={cubit.increment} size="sm">
                +1
              </Button>
              <Button onClick={cubit.decrement} size="sm">
                -1
              </Button>
              <Button onClick={() => cubit.updateMessage('Hi!')} size="sm">
                Hi!
              </Button>
              <Button
                onClick={() =>
                  cubit.updateMessage('This is a very long message')
                }
                size="sm"
              >
                Long Msg
              </Button>
              <Button onClick={cubit.reset} size="sm" variant="outline">
                Reset
              </Button>
            </div>
          </div>

          {validationErrors.length > 0 && (
            <div
              style={{
                padding: '10px',
                backgroundColor: '#fee',
                border: '1px solid #fcc',
                borderRadius: '4px',
                color: '#c00',
              }}
            >
              <strong>Validation Errors:</strong>
              {validationErrors.map((error, i) => (
                <div key={i} style={{ fontSize: '0.9em', marginTop: '5px' }}>
                  {error.error}
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          {!pluginsEnabled ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px',
                backgroundColor: '#f5f5f5',
                borderRadius: '4px',
              }}
            >
              Enable plugins to see analytics, performance metrics, and
              validation
            </div>
          ) : (
            <div
              style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}
            >
              <div>
                <h5>Analytics Events (Last 5)</h5>
                <div
                  style={{
                    padding: '10px',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '4px',
                    fontSize: '0.85em',
                    fontFamily: 'monospace',
                    maxHeight: '150px',
                    overflowY: 'auto',
                  }}
                >
                  {analyticsEvents.slice(-5).map((event, i) => (
                    <div key={i} style={{ marginBottom: '5px' }}>
                      <span style={{ color: '#666' }}>
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>{' '}
                      <span style={{ color: '#00a' }}>{event.event}</span>
                      {event.data && (
                        <span style={{ color: '#080' }}>
                          {' '}
                          {JSON.stringify(event.data)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h5>Performance Metrics</h5>
                <div
                  style={{
                    padding: '10px',
                    backgroundColor: '#f9f9f9',
                    borderRadius: '4px',
                    fontSize: '0.9em',
                  }}
                >
                  {performanceMetrics.length === 0 ? (
                    <div style={{ color: '#999' }}>No metrics yet</div>
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
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          fontSize: '0.85em',
        }}
      >
        <strong>Custom Plugins Demonstrated:</strong>
        <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
          <li>
            <strong>Analytics Plugin:</strong> Tracks all state changes and
            lifecycle events
          </li>
          <li>
            <strong>Performance Plugin:</strong> Measures update frequency and
            timing
          </li>
          <li>
            <strong>Validation Plugin:</strong> Validates state changes against
            rules
          </li>
        </ul>

        <strong style={{ display: 'block', marginTop: '15px' }}>
          Plugin API:
        </strong>
        <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
          <li>
            <code>BlacPlugin</code> interface with lifecycle hooks
          </li>
          <li>
            <code>Blac.addPlugin(plugin)</code> - Register a plugin globally
          </li>
          <li>
            <code>Blac.removePlugin(plugin)</code> - Unregister a plugin
          </li>
          <li>
            Hooks: <code>onBlocCreated</code>, <code>onStateChanged</code>,{' '}
            <code>onBlocDisposed</code>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default CustomPluginDemo;
