import { DemoArticle } from '@/components/demo-article/DemoArticle';
import { ArticleSection } from '@/components/demo-article/ArticleSection';
import { Prose } from '@/components/demo-article/Prose';
import { CodePanel } from '@/components/demo-article/CodePanel';
import { ConceptCallout } from '@/components/shared/ConceptCallout';
import { Button } from '@/ui/Button';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Radio, StopCircle, Trash2, RotateCcw, Users, Waves } from 'lucide-react';
import React, { useEffect, useState } from 'react';

// ============================================================================
// State and Cubit
// ============================================================================

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

    // Simulate a stream of messages (e.g., WebSocket, SSE)
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

  // Cleanup on disposal
  onDispose = () => {
    this.stopStream();
  };
}

// ============================================================================
// Stream Subscriber Component
// ============================================================================

const StreamSubscriber: React.FC<{ id: string; color: string }> = ({
  id,
  color,
}) => {
  const [state] = useBloc(StreamCubit);
  const [localMessages, setLocalMessages] = useState<string[]>([]);

  useEffect(() => {
    // Subscribe to stream changes - this happens automatically via useBloc
    setLocalMessages(state.messages);
  }, [state.messages]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`p-4 border-2 rounded-lg bg-gradient-to-br ${color}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4" />
        <h4 className="font-semibold">Subscriber {id}</h4>
      </div>

      <div className="h-40 overflow-y-auto bg-white dark:bg-gray-800 rounded p-3 text-sm border border-gray-200 dark:border-gray-700">
        {localMessages.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No messages yet...</p>
        ) : (
          <div className="space-y-1">
            {localMessages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-gray-700 dark:text-gray-300 py-1 px-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {msg}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-gray-600 dark:text-gray-400">
          Receiving: {state.isStreaming ? '✓ Yes' : '✗ No'}
        </span>
        <span className="text-gray-600 dark:text-gray-400">
          {localMessages.length} messages
        </span>
      </div>
    </motion.div>
  );
};

// ============================================================================
// Main Demo Component
// ============================================================================

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
    <DemoArticle
      metadata={{
        id: 'stream-api',
        title: 'Streaming Data & Observables',
        description:
          'Learn how BlaC Cubits act as observables, streaming real-time state changes to multiple subscribers',
        category: '03-advanced',
        difficulty: 'advanced',
        tags: ['stream', 'observable', 'real-time', 'subscriptions', 'pub-sub'],
        estimatedTime: 20,
      }}
    >
      {/* Introduction Section */}
      <ArticleSection theme="cubit" id="introduction">
        <Prose>
          <h2>Real-Time Streaming with BlaC</h2>
          <p>
            BlaC Cubits naturally implement the Observable pattern, making them
            perfect for streaming real-time data to multiple subscribers. Every
            time state changes, all subscribed components automatically receive
            the update.
          </p>
          <p>
            This pattern is ideal for scenarios like WebSocket connections,
            server-sent events, live data feeds, chat applications, IoT sensor
            data, and progress tracking for long-running operations.
          </p>
        </Prose>

        <ConceptCallout type="info" title="Observable Pattern">
          <p className="text-sm">
            An observable is a data source that emits values over time. Observers
            (subscribers) listen for these emissions and react accordingly. In
            BlaC, every Cubit/Bloc is an observable, and every{' '}
            <code>useBloc</code> call creates a subscription.
          </p>
        </ConceptCallout>
      </ArticleSection>

      {/* Interactive Demo Section */}
      <ArticleSection theme="cubit" id="demo">
        <Prose>
          <h2>Interactive Demo: Real-Time Stream</h2>
          <p>
            This demo simulates a real-time data stream (like a WebSocket or
            server-sent event). Start the stream and add subscribers to see how
            all components receive the same updates simultaneously.
          </p>
        </Prose>

        <div className="space-y-6 not-prose">
          {/* Controls */}
          <div className="p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 rounded-lg border-2 border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2 mb-4">
              <Waves className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              <h4 className="font-semibold text-lg">Stream Controls</h4>
            </div>

            <div className="flex flex-wrap gap-3 mb-4">
              <Button
                onClick={cubit.startStream}
                disabled={state.isStreaming}
                variant="primary"
                className="flex items-center gap-2"
              >
                <Radio className="w-4 h-4" />
                Start Stream
              </Button>

              <Button
                onClick={cubit.stopStream}
                disabled={!state.isStreaming}
                variant="danger"
                className="flex items-center gap-2"
              >
                <StopCircle className="w-4 h-4" />
                Stop Stream
              </Button>

              <Button
                onClick={cubit.clearMessages}
                variant="secondary"
                className="flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Clear Messages
              </Button>

              <Button
                onClick={cubit.reset}
                variant="muted"
                className="flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Reset All
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-md font-medium transition-all ${
                  state.isStreaming
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 animate-pulse'
                    : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {state.isStreaming ? (
                  <>
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                    Streaming
                  </>
                ) : (
                  <>
                    <span className="h-3 w-3 rounded-full bg-gray-400"></span>
                    Stopped
                  </>
                )}
              </span>

              <span className="text-sm text-gray-600 dark:text-gray-400">
                {state.messages.length} messages in buffer
              </span>
            </div>
          </div>

          {/* Subscriber Controls */}
          <div className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border-2 border-blue-200 dark:border-blue-700">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-blue-600" />
              <h4 className="font-semibold text-lg">Manage Subscribers</h4>
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowSubscriber2(!showSubscriber2)}
                variant={showSubscriber2 ? 'danger' : 'primary'}
                className="flex-1"
              >
                {showSubscriber2 ? 'Remove' : 'Add'} Subscriber 2
              </Button>

              <Button
                onClick={() => setShowSubscriber3(!showSubscriber3)}
                variant={showSubscriber3 ? 'danger' : 'primary'}
                className="flex-1"
              >
                {showSubscriber3 ? 'Remove' : 'Add'} Subscriber 3
              </Button>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
              Add or remove subscribers to see how they all receive the same
              stream in real-time.
            </p>
          </div>

          {/* Subscribers Grid */}
          <div className="grid md:grid-cols-3 gap-4">
            <StreamSubscriber
              id="1"
              color="from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800"
            />

            <AnimatePresence>
              {showSubscriber2 && (
                <StreamSubscriber
                  id="2"
                  color="from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800"
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {showSubscriber3 && (
                <StreamSubscriber
                  id="3"
                  color="from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-amber-200 dark:border-amber-800"
                />
              )}
            </AnimatePresence>
          </div>
        </div>

        <ConceptCallout type="success" title="Real-Time Synchronization">
          <p className="text-sm">
            Notice how all subscribers receive messages at exactly the same time!
            This is because they're all subscribing to the same Cubit instance,
            and BlaC automatically notifies all subscribers when state changes.
          </p>
        </ConceptCallout>
      </ArticleSection>

      {/* Implementation Section */}
      <ArticleSection theme="cubit" id="implementation">
        <Prose>
          <h2>Implementation Patterns</h2>
        </Prose>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
              1. Basic Stream Cubit
            </h3>
            <CodePanel
              code={`class StreamCubit extends Cubit<StreamState> {
  private interval: NodeJS.Timeout | null = null;

  startStream = () => {
    this.patch({ isStreaming: true });

    // Simulate real-time data stream (e.g., WebSocket)
    this.interval = setInterval(() => {
      const newMessage = \`Data at \${new Date().toISOString()}\`;

      // Emit new state - all subscribers receive this update!
      this.patch({
        messages: [...this.state.messages, newMessage]
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

  // CRITICAL: Clean up on disposal
  onDispose = () => {
    this.stopStream();
  };
}`}
              language="typescript"
              lineLabels={{
                2: 'Store interval reference',
                4: 'Start stream',
                8: 'Periodic updates',
                11: 'Emit to all subscribers',
                26: 'Cleanup',
                27: 'Stop stream on dispose',
              }}
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
              2. WebSocket Stream Example
            </h3>
            <CodePanel
              code={`class WebSocketCubit extends Cubit<WebSocketState> {
  private ws: WebSocket | null = null;

  connect = (url: string) => {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.patch({ connected: true, error: null });
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      // Stream message to all subscribers
      this.patch({
        messages: [...this.state.messages, data],
        lastUpdate: Date.now()
      });
    };

    this.ws.onerror = (error) => {
      this.patch({
        connected: false,
        error: 'Connection failed'
      });
    };

    this.ws.onclose = () => {
      this.patch({ connected: false });
    };
  };

  disconnect = () => {
    this.ws?.close();
    this.ws = null;
  };

  onDispose = () => {
    this.disconnect();
  };
}

// Multiple components can subscribe
function MessageDisplay() {
  const [state] = useBloc(WebSocketCubit);

  return (
    <div>
      {state.messages.map(msg => (
        <div key={msg.id}>{msg.text}</div>
      ))}
    </div>
  );
}

function StatusIndicator() {
  const [state] = useBloc(WebSocketCubit); // Same instance!

  return (
    <div>
      Status: {state.connected ? 'Connected' : 'Disconnected'}
    </div>
  );
}`}
              language="typescript"
              lineLabels={{
                2: 'WebSocket reference',
                4: 'Connect to server',
                11: 'Handle incoming messages',
                14: 'Emit to all subscribers',
                38: 'Cleanup WebSocket',
                44: 'Component 1',
                52: 'Component 2 (same instance)',
              }}
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
              3. Buffer Management
            </h3>
            <Prose>
              <p>
                For high-frequency streams, manage memory by limiting the message
                buffer size.
              </p>
            </Prose>
            <CodePanel
              code={`class BufferedStreamCubit extends Cubit<BufferedState> {
  private maxBufferSize = 100;

  addMessage = (message: string) => {
    const messages = this.state.messages;

    // Keep only the most recent N messages
    const newMessages = messages.length >= this.maxBufferSize
      ? [...messages.slice(-(this.maxBufferSize - 1)), message]
      : [...messages, message];

    this.patch({ messages: newMessages });
  };

  // Alternative: Time-based expiration
  addMessageWithExpiry = (message: string, ttl: number = 60000) => {
    const expiresAt = Date.now() + ttl;

    this.patch({
      messages: [
        ...this.state.messages.filter(m => m.expiresAt > Date.now()),
        { text: message, expiresAt }
      ]
    });
  };
}`}
              language="typescript"
              lineLabels={{
                2: 'Max buffer size',
                7: 'Slice to keep size',
                15: 'Time-based expiration',
                20: 'Filter expired messages',
              }}
            />
          </div>
        </div>

        <ConceptCallout type="warning" title="Memory Management">
          <p className="text-sm">
            Always limit buffer sizes for long-running streams! Unlimited message
            accumulation can lead to memory leaks and performance degradation.
            Use either size-based limits or time-based expiration.
          </p>
        </ConceptCallout>
      </ArticleSection>

      {/* Advanced Patterns Section */}
      <ArticleSection theme="cubit" id="advanced">
        <Prose>
          <h2>Advanced Streaming Patterns</h2>
        </Prose>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Use Cases
            </h3>
            <div className="space-y-2">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-sm mb-1">
                  Real-Time Data
                </h4>
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  WebSocket messages, server-sent events, live feeds
                </p>
              </div>

              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <h4 className="font-semibold text-purple-900 dark:text-purple-100 text-sm mb-1">
                  Live Updates
                </h4>
                <p className="text-xs text-purple-800 dark:text-purple-200">
                  Stock prices, sports scores, chat messages
                </p>
              </div>

              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h4 className="font-semibold text-green-900 dark:text-green-100 text-sm mb-1">
                  Progress Tracking
                </h4>
                <p className="text-xs text-green-800 dark:text-green-200">
                  File uploads, batch processing, long operations
                </p>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                <h4 className="font-semibold text-amber-900 dark:text-amber-100 text-sm mb-1">
                  IoT & Sensors
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-200">
                  Device data, monitoring systems, telemetry
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Best Practices
            </h3>
            <ConceptCallout type="success" title="Do">
              <ul className="text-xs space-y-1 list-disc list-inside">
                <li>Clean up streams on component unmount</li>
                <li>Limit message buffer size for memory efficiency</li>
                <li>Use dependencies/selectors to filter stream data</li>
                <li>Implement error handling and reconnection logic</li>
                <li>Consider throttling/debouncing high-frequency updates</li>
                <li>Always call onDispose to prevent resource leaks</li>
              </ul>
            </ConceptCallout>

            <ConceptCallout type="warning" title="Don't">
              <ul className="text-xs space-y-1 list-disc list-inside">
                <li>Accumulate unlimited messages in state</li>
                <li>Forget to unsubscribe or clean up connections</li>
                <li>Emit state changes at extremely high frequency</li>
                <li>Store large binary data in state</li>
                <li>Create new Cubit instances for each subscriber</li>
              </ul>
            </ConceptCallout>
          </div>
        </div>
      </ArticleSection>

      {/* Key Takeaways Section */}
      <ArticleSection theme="cubit" id="key-takeaways">
        <Prose>
          <h2>Key Takeaways</h2>
        </Prose>

        <ConceptCallout type="success" title="What You've Learned">
          <ul className="space-y-2 text-sm">
            <li>
              <strong>Observable Pattern:</strong> BlaC Cubits naturally implement
              the observable pattern for streaming data
            </li>
            <li>
              <strong>Multiple Subscribers:</strong> All components using{' '}
              <code>useBloc</code> automatically receive stream updates
            </li>
            <li>
              <strong>Automatic Synchronization:</strong> State changes propagate
              to all subscribers simultaneously
            </li>
            <li>
              <strong>Memory Management:</strong> Limit buffer sizes and clean up
              resources in <code>onDispose</code>
            </li>
            <li>
              <strong>Real-World Applications:</strong> Perfect for WebSockets,
              SSE, IoT, and live data feeds
            </li>
            <li>
              <strong>Dynamic Subscriptions:</strong> Subscribers can be
              added/removed at any time
            </li>
          </ul>
        </ConceptCallout>

        <Prose>
          <p className="text-lg font-medium text-slate-900 dark:text-slate-100 mt-6">
            Streaming data with BlaC is straightforward and efficient. The
            built-in observable pattern, combined with React's automatic
            re-rendering, makes it easy to build real-time applications with
            minimal boilerplate.
          </p>
        </Prose>
      </ArticleSection>
    </DemoArticle>
  );
};
