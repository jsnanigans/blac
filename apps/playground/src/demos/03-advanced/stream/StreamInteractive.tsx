import { Button } from '@/ui/Button';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radio,
  StopCircle,
  Trash2,
  RotateCcw,
  Users,
  Waves,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

// ============================================================================
// State and Cubit
// ============================================================================

interface StreamState {
  messages: string[];
  isStreaming: boolean;
}

class StreamCubit extends Cubit<StreamState> {
  private interval: NodeJS.Timeout | null = null;
  private messageCount = 0;

  constructor() {
    super({
      messages: [],
      isStreaming: false,
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
// Interactive Demo Component
// ============================================================================

export function StreamInteractive() {
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
    <div className="my-8 space-y-6 not-prose">
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
            variant="ghost"
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

        <div className="flex gap-3 mb-3">
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

        <p className="text-sm text-gray-600 dark:text-gray-400">
          Add or remove subscribers to see how they all receive the same stream
          in real-time.
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

      <div className="relative overflow-hidden rounded-3xl border border-brand/30 bg-gradient-to-br from-brand/5 to-brand/10 p-4">
        <div className="relative">
          <p className="text-sm font-medium text-foreground mb-2">
            💡 Real-Time Synchronization
          </p>
          <p className="text-sm text-muted-foreground">
            Notice how all subscribers receive messages at exactly the same
            time! This is because they're all subscribing to the same Cubit
            instance, and BlaC automatically notifies all subscribers when state
            changes.
          </p>
        </div>
      </div>
    </div>
  );
}
