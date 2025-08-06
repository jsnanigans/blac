import React, { useState, useEffect } from 'react';
import { Cubit } from '@blac/core';
import { Button } from './ui/Button';

// Cubit with various subscription examples
class StreamDemoCubit extends Cubit<{
  count: number;
  message: string;
  flag: boolean;
}> {
  constructor() {
    super({ count: 0, message: 'Hello', flag: false });
  }

  incrementCount = () => {
    this.emit({ ...this.state, count: this.state.count + 1 });
  };

  updateMessage = (message: string) => {
    this.emit({ ...this.state, message });
  };

  toggleFlag = () => {
    this.emit({ ...this.state, flag: !this.state.flag });
  };

  reset = () => {
    this.emit({ count: 0, message: 'Hello', flag: false });
  };
}

const StreamApiDemo: React.FC = () => {
  const [cubit] = useState(() => new StreamDemoCubit());
  const [fullState, setFullState] = useState(cubit.state);
  const [countOnly, setCountOnly] = useState(cubit.state.count);
  const [messageLength, setMessageLength] = useState(
    cubit.state.message.length,
  );
  const [subscriptionLogs, setSubscriptionLogs] = useState<string[]>([]);

  useEffect(() => {
    const addLog = (message: string) => {
      const timestamp = new Date().toLocaleTimeString();
      setSubscriptionLogs((prev) => [
        ...prev.slice(-4),
        `[${timestamp}] ${message}`,
      ]);
    };

    // 1. Basic subscription - receives all state changes
    const unsubscribe1 = cubit.subscribe((state) => {
      setFullState(state);
      addLog(`Full state update: count=${state.count}`);
    });

    // 2. Subscription with selector - only triggers when selected value changes
    const unsubscribe2 = cubit.subscribeWithSelector(
      (state) => state.count,
      (count) => {
        setCountOnly(count);
        addLog(`Count-only update: ${count}`);
      },
    );

    // 3. Computed value subscription
    const unsubscribe3 = cubit.subscribeWithSelector(
      (state) => state.message.length,
      (length) => {
        setMessageLength(length);
        addLog(`Message length changed: ${length}`);
      },
    );

    // 4. Multiple field selector
    const unsubscribe4 = cubit.subscribeWithSelector(
      (state) => ({ count: state.count, flag: state.flag }),
      (selected) => {
        addLog(
          `Count or flag changed: count=${selected.count}, flag=${selected.flag}`,
        );
      },
    );

    return () => {
      unsubscribe1();
      unsubscribe2();
      unsubscribe3();
      unsubscribe4();
    };
  }, [cubit]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h4>State Manipulation</h4>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Button onClick={cubit.incrementCount}>Increment Count</Button>
          <Button onClick={() => cubit.updateMessage('World')}>
            Change to "World"
          </Button>
          <Button onClick={() => cubit.updateMessage('Hello World!')}>
            Change to "Hello World!"
          </Button>
          <Button onClick={cubit.toggleFlag}>Toggle Flag</Button>
          <Button onClick={cubit.reset} variant="outline">
            Reset All
          </Button>
        </div>
      </div>

      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}
      >
        <div>
          <h4>Subscription Results</h4>
          <div
            style={{
              padding: '15px',
              backgroundColor: '#f9f9f9',
              borderRadius: '4px',
              fontSize: '0.9em',
            }}
          >
            <div style={{ marginBottom: '10px' }}>
              <strong>Full State (subscribe):</strong>
              <pre style={{ margin: '5px 0' }}>
                {JSON.stringify(fullState, null, 2)}
              </pre>
            </div>

            <div style={{ marginBottom: '10px' }}>
              <strong>Count Only (subscribeWithSelector):</strong> {countOnly}
            </div>

            <div>
              <strong>Message Length (computed):</strong> {messageLength}
            </div>
          </div>
        </div>

        <div>
          <h4>Subscription Log</h4>
          <div
            style={{
              padding: '10px',
              backgroundColor: '#333',
              color: '#0f0',
              borderRadius: '4px',
              fontFamily: 'monospace',
              fontSize: '0.85em',
              height: '150px',
              overflowY: 'auto',
            }}
          >
            {subscriptionLogs.length === 0 ? (
              <div style={{ color: '#666' }}>Waiting for events...</div>
            ) : (
              subscriptionLogs.map((log, i) => <div key={i}>{log}</div>)
            )}
          </div>
        </div>
      </div>

      <div
        style={{
          padding: '15px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          fontSize: '0.85em',
        }}
      >
        <strong>API Methods Demonstrated:</strong>
        <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
          <li>
            <code>subscribe(callback)</code> - Receives all state changes
          </li>
          <li>
            <code>subscribeWithSelector(selector, callback)</code> - Only
            triggers when selected value changes
          </li>
          <li>
            <code>subscribeComponent(weakRef, callback)</code> - Component-safe
            subscription (used internally by hooks)
          </li>
        </ul>
        <strong style={{ display: 'block', marginTop: '10px' }}>Note:</strong>
        Subscriptions must be cleaned up to prevent memory leaks. All methods
        return an unsubscribe function.
      </div>
    </div>
  );
};

export default StreamApiDemo;
