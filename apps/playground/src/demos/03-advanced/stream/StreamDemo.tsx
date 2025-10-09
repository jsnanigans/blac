import React, { useEffect, useState } from 'react';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';

interface StreamState {
  messages: string[];
  isStreaming: boolean;
  subscriberCount: number;
}

class StreamCubit extends Cubit<StreamState> {
  private interval: NodeJS.Timeout | null = null;
  private messageCount = 0;

  constructor() {
    super({
      messages: [],
      isStreaming: false,
      subscriberCount: 0,
    });
  }

  startStream = () => {
    if (this.state.isStreaming) return;

    this.patch({ isStreaming: true });

    // Simulate a stream of messages
    this.interval = setInterval(() => {
      this.messageCount++;
      const newMessage = `Message ${this.messageCount} at ${new Date().toLocaleTimeString()}`;

      this.patch({
        messages: [...this.state.messages.slice(-9), newMessage], // Keep last 10
      });
    }, 1000);
  };

  stopStream = () => {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.patch({ isStreaming: false });
  };

  clearMessages = () => {
    this.patch({ messages: [] });
  };

  reset = () => {
    this.stopStream();
    this.messageCount = 0;
    this.emit({
      messages: [],
      isStreaming: false,
      subscriberCount: 0,
    });
  };
}

// Component that subscribes to the stream
const StreamSubscriber: React.FC<{ id: string }> = ({ id }) => {
  const [state] = useBloc(StreamCubit);
  const [localMessages, setLocalMessages] = useState<string[]>([]);

  useEffect(() => {
    // Subscribe to stream changes
    const subscription = state.messages;
    setLocalMessages(subscription);
  }, [state.messages]);

  return (
    <div className="p-4 border border-blue-300 dark:border-blue-700 rounded-lg bg-blue-50 dark:bg-blue-900/20">
      <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">
        Subscriber {id}
      </h4>
      <div className="h-32 overflow-y-auto bg-white dark:bg-gray-800 rounded p-2 text-sm">
        {localMessages.length === 0 ? (
          <p className="text-gray-500">No messages yet...</p>
        ) : (
          localMessages.map((msg, idx) => (
            <div key={idx} className="text-gray-700 dark:text-gray-300">
              {msg}
            </div>
          ))
        )}
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
        Receiving: {state.isStreaming ? 'Yes' : 'No'}
      </p>
    </div>
  );
};

export const StreamDemo: React.FC = () => {
  const [state, cubit] = useBloc(StreamCubit);
  const [showSubscriber2, setShowSubscriber2] = useState(false);
  const [showSubscriber3, setShowSubscriber3] = useState(false);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cubit.stopStream();
    };
  }, [cubit]);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-2">
          Stream API & Observable Pattern
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          BlaC Cubits can act as observables, streaming state changes to
          multiple subscribers.
        </p>
      </div>

      <div className="mb-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <h4 className="font-semibold mb-3">Stream Controls</h4>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={cubit.startStream}
            disabled={state.isStreaming}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
          >
            Start Stream
          </button>
          <button
            onClick={cubit.stopStream}
            disabled={!state.isStreaming}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
          >
            Stop Stream
          </button>
          <button
            onClick={cubit.clearMessages}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Clear Messages
          </button>
          <button
            onClick={cubit.reset}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            Reset All
          </button>
        </div>

        <div className="mt-3 text-sm">
          <span
            className={`inline-block px-2 py-1 rounded ${
              state.isStreaming
                ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
                : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            {state.isStreaming ? '● Streaming' : '○ Stopped'}
          </span>
        </div>
      </div>

      <div className="mb-4">
        <h4 className="font-semibold mb-2">Subscribers</h4>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => setShowSubscriber2(!showSubscriber2)}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            {showSubscriber2 ? 'Remove' : 'Add'} Subscriber 2
          </button>
          <button
            onClick={() => setShowSubscriber3(!showSubscriber3)}
            className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            {showSubscriber3 ? 'Remove' : 'Add'} Subscriber 3
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <StreamSubscriber id="1" />
        {showSubscriber2 && <StreamSubscriber id="2" />}
        {showSubscriber3 && <StreamSubscriber id="3" />}
      </div>

      <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg">
        <h4 className="font-semibold text-yellow-700 dark:text-yellow-300 mb-2">
          Key Concepts
        </h4>
        <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
          <li>• All subscribers receive the same stream of state updates</li>
          <li>• New subscribers immediately get the current state</li>
          <li>• Subscribers can be added/removed dynamically</li>
          <li>• The stream continues even if subscribers change</li>
          <li>• Perfect for real-time data, WebSocket messages, etc.</li>
        </ul>
      </div>
    </div>
  );
};

export const streamCode = {
  usage: `import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';

// Stream Cubit for real-time data
class DataStreamCubit extends Cubit<StreamState> {
  private ws: WebSocket | null = null;

  connectToStream = () => {
    this.ws = new WebSocket('wss://api.example.com');
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.patch({
        messages: [...this.state.messages, data],
        connected: true
      });
    };
  };

  disconnect = () => {
    this.ws?.close();
    this.patch({ connected: false });
  };
}

// Multiple components can subscribe
function StreamDisplay() {
  const [state] = useBloc(DataStreamCubit);
  
  return (
    <div>
      {state.messages.map(msg => (
        <div key={msg.id}>{msg.text}</div>
      ))}
    </div>
  );
}`,
  bloc: `import { Cubit, Bloc } from '@blac/core';

// Observable pattern with Cubit
export class ObservableCubit<T> extends Cubit<T> {
  private observers: Set<(state: T) => void> = new Set();

  subscribe(observer: (state: T) => void) {
    this.observers.add(observer);
    observer(this.state); // Send current state
    
    return () => {
      this.observers.delete(observer);
    };
  }

  protected notifyObservers() {
    this.observers.forEach(observer => {
      observer(this.state);
    });
  }

  emit(newState: T) {
    super.emit(newState);
    this.notifyObservers();
  }
}

// Usage
const streamCubit = new ObservableCubit(initialState);

// Subscribe from anywhere
const unsubscribe = streamCubit.subscribe((state) => {
  console.log('State updated:', state);
});

// Later: unsubscribe();`,
};
