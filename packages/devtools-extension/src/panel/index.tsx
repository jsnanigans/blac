/**
 * DevTools Panel - Main UI for BlaC DevTools
 */

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';

interface InstanceData {
  id: string;
  className: string;
  instanceKey: string;
  state: any;
  refCount: number;
  createdAt: number;
  isDisposed: boolean;
}

function App() {
  const [instances, setInstances] = useState<InstanceData[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    console.log('[BlaC Panel] Initializing...');

    // Get current tab ID
    const tabId = chrome.devtools.inspectedWindow.tabId;
    console.log('[BlaC Panel] Tab ID:', tabId);

    // Connect to service worker
    const port = chrome.runtime.connect({ name: `devtools-${tabId}` });

    port.onMessage.addListener((message) => {
      console.log('[BlaC Panel] Message received:', message);

      switch (message.type) {
        case 'INITIAL_STATE':
        case 'STATE_UPDATE':
        case 'SYNC':
        case 'REFRESH_RESPONSE':
          if (message.payload?.instances) {
            setInstances(message.payload.instances);
            setConnected(true);
          }
          break;

        case 'CACHED_STATE':
          if (message.payload?.instances) {
            setInstances(message.payload.instances);
          }
          break;
      }
    });

    port.onDisconnect.addListener(() => {
      console.log('[BlaC Panel] Disconnected');
      setConnected(false);
    });

    // Request initial state
    port.postMessage({ type: 'GET_INSTANCES' });

    // Cleanup
    return () => {
      port.disconnect();
    };
  }, []);

  const selectedInstanceData = instances.find(i => i.id === selectedInstance);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{
        padding: '10px',
        borderBottom: '1px solid #444',
        background: '#252526',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <h1 style={{ fontSize: '16px', fontWeight: 600 }}>
          BlaC DevTools
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: connected ? '#4CAF50' : '#f44336',
          }} />
          <span style={{ fontSize: '12px' }}>
            {connected ? 'Connected' : 'Disconnected'}
          </span>
          <span style={{ fontSize: '12px', color: '#888' }}>
            {instances.length} instances
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Instance List */}
        <div style={{
          width: '300px',
          borderRight: '1px solid #444',
          overflow: 'auto',
          background: '#1e1e1e',
        }}>
          {instances.length === 0 ? (
            <div style={{ padding: '20px', color: '#888', textAlign: 'center' }}>
              No instances detected
            </div>
          ) : (
            instances.map((instance) => (
              <div
                key={instance.id}
                onClick={() => setSelectedInstance(instance.id)}
                style={{
                  padding: '10px',
                  borderBottom: '1px solid #333',
                  cursor: 'pointer',
                  background: selectedInstance === instance.id ? '#2d2d30' : 'transparent',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (selectedInstance !== instance.id) {
                    e.currentTarget.style.background = '#252526';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedInstance !== instance.id) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{ fontWeight: 500, marginBottom: '4px' }}>
                  {instance.className}
                </div>
                <div style={{ fontSize: '12px', color: '#888' }}>
                  Key: {instance.instanceKey}
                </div>
                {instance.isDisposed && (
                  <div style={{ fontSize: '11px', color: '#f44336', marginTop: '4px' }}>
                    DISPOSED
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* State Viewer */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {selectedInstanceData ? (
            <div>
              <h2 style={{ fontSize: '18px', marginBottom: '10px' }}>
                {selectedInstanceData.className}
              </h2>
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '14px', color: '#888', marginBottom: '5px' }}>
                  Instance ID: {selectedInstanceData.id}
                </div>
                <div style={{ fontSize: '14px', color: '#888', marginBottom: '5px' }}>
                  Key: {selectedInstanceData.instanceKey}
                </div>
                <div style={{ fontSize: '14px', color: '#888', marginBottom: '5px' }}>
                  Ref Count: {selectedInstanceData.refCount}
                </div>
              </div>
              <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>
                Current State
              </h3>
              <pre style={{
                background: '#252526',
                padding: '15px',
                borderRadius: '4px',
                fontSize: '13px',
                fontFamily: 'Monaco, Consolas, monospace',
                overflow: 'auto',
              }}>
                {JSON.stringify(selectedInstanceData.state, null, 2)}
              </pre>
            </div>
          ) : (
            <div style={{ color: '#888', textAlign: 'center', marginTop: '50px' }}>
              Select an instance to view its state
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Mount the app
const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);