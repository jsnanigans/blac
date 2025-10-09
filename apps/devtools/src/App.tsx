import { useState, useEffect } from 'react';
import type { DevToolsMessage, SerializedEvent } from '@blac/devtools-connect';
import EventLog from './components/EventLog';
import BlocList from './components/BlocList';
import ConnectionStatus from './components/ConnectionStatus';

interface BlocInfo {
  id: string;
  name: string;
  state: any;
  timestamp: number;
}

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<SerializedEvent[]>([]);
  const [blocs, setBlocs] = useState<Map<string, BlocInfo>>(new Map());
  const [port, setPort] = useState<chrome.runtime.Port | null>(null);

  useEffect(() => {
    const backgroundPort = chrome.runtime.connect({
      name: 'blac-devtools-panel',
    });
    setPort(backgroundPort);

    // Send the inspected tab ID to the background script
    backgroundPort.postMessage({
      type: 'INIT',
      tabId: chrome.devtools.inspectedWindow.tabId,
    });

    setIsConnected(true);

    backgroundPort.onMessage.addListener((message: DevToolsMessage) => {
      handleMessage(message);
    });

    backgroundPort.onDisconnect.addListener(() => {
      setIsConnected(false);
    });

    return () => {
      backgroundPort.disconnect();
    };
  }, []);

  const handleMessage = (message: DevToolsMessage) => {
    switch (message.type) {
      case 'BLOC_CREATED':
        setBlocs((prev) => {
          const newBlocs = new Map(prev);
          newBlocs.set(message.payload.id, {
            id: message.payload.id,
            name: message.payload.name,
            state: message.payload.state,
            timestamp: message.payload.timestamp,
          });
          return newBlocs;
        });
        break;

      case 'EVENT_DISPATCHED':
        setEvents((prev) => [...prev, message.payload]);
        break;

      case 'STATE_CHANGED':
        setBlocs((prev) => {
          const newBlocs = new Map(prev);
          const bloc = newBlocs.get(message.payload.blocId);
          if (bloc) {
            newBlocs.set(message.payload.blocId, {
              ...bloc,
              state: message.payload.state,
              timestamp: message.payload.timestamp,
            });
          }
          return newBlocs;
        });
        break;

      case 'BLOC_DISPOSED':
        setBlocs((prev) => {
          const newBlocs = new Map(prev);
          newBlocs.delete(message.payload.id);
          return newBlocs;
        });
        break;
    }
  };

  const handleClearEvents = () => {
    setEvents([]);
    if (port) {
      port.postMessage({ type: 'CLEAR_EVENTS' });
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>BlaC DevTools</h1>
        <ConnectionStatus isConnected={isConnected} />
      </header>

      <div className="content">
        <div className="sidebar">
          <BlocList blocs={Array.from(blocs.values())} />
        </div>

        <div className="main">
          <div className="toolbar">
            <button onClick={handleClearEvents} disabled={events.length === 0}>
              Clear Events
            </button>
            <span className="event-count">
              {events.length} event{events.length !== 1 ? 's' : ''}
            </span>
          </div>
          <EventLog events={events} />
        </div>
      </div>
    </div>
  );
}

export default App;
