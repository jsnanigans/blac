import { DemoArticle } from '@/components/demo-article/DemoArticle';
import { ArticleSection } from '@/components/demo-article/ArticleSection';
import { Prose } from '@/components/demo-article/Prose';
import { CodePanel } from '@/components/demo-article/CodePanel';
import { ConceptCallout } from '@/components/shared/ConceptCallout';
import { Button } from '@/ui/Button';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Trash2, Eye, EyeOff, Terminal } from 'lucide-react';
import React, { useEffect, useState, useCallback, useRef } from 'react';

// ============================================================================
// State and Cubits
// ============================================================================

interface CounterState {
  count: number;
  instanceId: number;
  lastUpdated: number;
}

let instanceCounter = 0;

// KeepAlive Cubit - persists even when no components are using it
class KeepAliveCounterCubit extends Cubit<CounterState> {
  static keepAlive = true; // This keeps the instance alive!

  constructor() {
    instanceCounter++;
    const instanceId = instanceCounter;
    super({
      count: 0,
      instanceId,
      lastUpdated: Date.now(),
    });
    console.log(`🟢 KeepAliveCounterCubit instance ${instanceId} CONSTRUCTED.`);
  }

  increment = () => {
    const newCount = this.state.count + 1;
    this.emit({
      ...this.state,
      count: newCount,
      lastUpdated: Date.now(),
    });
    console.log(
      `📈 KeepAliveCounterCubit instance ${this.state.instanceId} incremented to ${newCount}`,
    );
  };

  reset = () => {
    this.emit({
      ...this.state,
      count: 0,
      lastUpdated: Date.now(),
    });
    console.log(
      `🔄 KeepAliveCounterCubit instance ${this.state.instanceId} RESET.`,
    );
  };

  dispose = async () => {
    console.log(
      `🔴 KeepAliveCounterCubit instance ${this.state.instanceId} DISPOSED (should not happen with keepAlive!).`,
    );
    return super.dispose();
  };
}

// Regular Cubit - disposed when no components are using it
class RegularCounterCubit extends Cubit<CounterState> {
  // No keepAlive property - will be disposed when unused

  constructor() {
    instanceCounter++;
    const instanceId = instanceCounter;
    super({
      count: 0,
      instanceId,
      lastUpdated: Date.now(),
    });
    console.log(`🟢 RegularCounterCubit instance ${instanceId} CONSTRUCTED.`);
  }

  increment = () => {
    const newCount = this.state.count + 1;
    this.emit({
      ...this.state,
      count: newCount,
      lastUpdated: Date.now(),
    });
    console.log(
      `📈 RegularCounterCubit instance ${this.state.instanceId} incremented to ${newCount}`,
    );
  };

  reset = () => {
    this.emit({
      ...this.state,
      count: 0,
      lastUpdated: Date.now(),
    });
    console.log(
      `🔄 RegularCounterCubit instance ${this.state.instanceId} RESET.`,
    );
  };

  dispose = async () => {
    console.log(
      `🔴 RegularCounterCubit instance ${this.state.instanceId} DISPOSED.`,
    );
    return super.dispose();
  };
}

// ============================================================================
// Counter Components
// ============================================================================

const KeepAliveCounter: React.FC<{ id: string }> = React.memo(({ id }) => {
  const [state, cubit] = useBloc(KeepAliveCounterCubit);
  const renderCount = useRef(0);
  renderCount.current++;

  useEffect(() => {
    console.log(
      `🔵 KeepAlive Counter (${id}) MOUNTED. Instance: ${state.instanceId}, Count: ${state.count}`,
    );
    return () => {
      console.log(
        `🟠 KeepAlive Counter (${id}) UNMOUNTING. Instance: ${state.instanceId}`,
      );
    };
  }, [id]);

  useEffect(() => {
    console.log(
      `📊 KeepAlive Counter (${id}) STATE UPDATE: count=${state.count}, render #${renderCount.current}`,
    );
  }, [id, state.count]);

  const handleIncrement = useCallback(() => {
    console.log(`👆 KeepAlive Counter (${id}) INCREMENT clicked`);
    cubit.increment();
  }, [cubit, id]);

  const handleReset = useCallback(() => {
    console.log(`👆 KeepAlive Counter (${id}) RESET clicked`);
    cubit.reset();
  }, [cubit, id]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-6 border-2 border-blue-400 dark:border-blue-600 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 shadow-lg"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-blue-600 dark:text-blue-400 fill-current" />
          <h4 className="font-semibold text-blue-700 dark:text-blue-300 text-lg">
            KeepAlive Counter {id}
          </h4>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded-md">
          Render #{renderCount.current}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-4 bg-white dark:bg-gray-800 rounded-md p-3">
        <div>
          <span className="text-gray-600 dark:text-gray-400 block mb-1">
            Instance ID:
          </span>
          <span className="font-mono font-bold text-2xl text-blue-600 dark:text-blue-400">
            #{state.instanceId}
          </span>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400 block mb-1">
            Last Updated:
          </span>
          <span className="font-mono text-xs">
            {new Date(state.lastUpdated).toLocaleTimeString()}
          </span>
        </div>
      </div>

      <div className="text-5xl font-bold mb-4 text-center bg-white dark:bg-gray-800 rounded-lg py-6 text-blue-600 dark:text-blue-400">
        {state.count}
      </div>

      <div className="flex gap-2">
        <Button onClick={handleIncrement} variant="primary" className="flex-1">
          Increment
        </Button>
        <Button onClick={handleReset} variant="ghost">
          Reset
        </Button>
      </div>
    </motion.div>
  );
});

KeepAliveCounter.displayName = 'KeepAliveCounter';

const RegularCounter: React.FC<{ id: string }> = React.memo(({ id }) => {
  const [state, cubit] = useBloc(RegularCounterCubit);
  const renderCount = useRef(0);
  renderCount.current++;

  useEffect(() => {
    console.log(
      `🔵 Regular Counter (${id}) MOUNTED. Instance: ${state.instanceId}, Count: ${state.count}`,
    );
    return () => {
      console.log(
        `🟠 Regular Counter (${id}) UNMOUNTING. Instance: ${state.instanceId}`,
      );
    };
  }, [id]);

  useEffect(() => {
    console.log(
      `📊 Regular Counter (${id}) STATE UPDATE: count=${state.count}, render #${renderCount.current}`,
    );
  }, [id, state.count]);

  const handleIncrement = useCallback(() => {
    console.log(`👆 Regular Counter (${id}) INCREMENT clicked`);
    cubit.increment();
  }, [cubit, id]);

  const handleReset = useCallback(() => {
    console.log(`👆 Regular Counter (${id}) RESET clicked`);
    cubit.reset();
  }, [cubit, id]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="p-6 border-2 border-orange-400 dark:border-orange-600 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 shadow-lg"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          <h4 className="font-semibold text-orange-700 dark:text-orange-300 text-lg">
            Regular Counter {id}
          </h4>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded-md">
          Render #{renderCount.current}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm mb-4 bg-white dark:bg-gray-800 rounded-md p-3">
        <div>
          <span className="text-gray-600 dark:text-gray-400 block mb-1">
            Instance ID:
          </span>
          <span className="font-mono font-bold text-2xl text-orange-600 dark:text-orange-400">
            #{state.instanceId}
          </span>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400 block mb-1">
            Last Updated:
          </span>
          <span className="font-mono text-xs">
            {new Date(state.lastUpdated).toLocaleTimeString()}
          </span>
        </div>
      </div>

      <div className="text-5xl font-bold mb-4 text-center bg-white dark:bg-gray-800 rounded-lg py-6 text-orange-600 dark:text-orange-400">
        {state.count}
      </div>

      <div className="flex gap-2">
        <Button onClick={handleIncrement} variant="primary" className="flex-1">
          Increment
        </Button>
        <Button onClick={handleReset} variant="ghost">
          Reset
        </Button>
      </div>
    </motion.div>
  );
});

RegularCounter.displayName = 'RegularCounter';

// ============================================================================
// Main Demo Component
// ============================================================================

export const KeepAliveDemo: React.FC = () => {
  const [showKeepAlive1, setShowKeepAlive1] = useState(true);
  const [showKeepAlive2, setShowKeepAlive2] = useState(false);
  const [showRegular1, setShowRegular1] = useState(true);
  const [showRegular2, setShowRegular2] = useState(false);

  // Clear console and add header when component mounts
  useEffect(() => {
    console.clear();
    console.log(
      '%c🚀 KeepAlive Demo Started',
      'font-size: 16px; font-weight: bold; color: #3b82f6;',
    );
    console.log('%cLegend:', 'font-weight: bold;');
    console.log('  🟢 = Construction');
    console.log('  🔴 = Disposal');
    console.log('  🔵 = Component Mount');
    console.log('  🟠 = Component Unmount');
    console.log('  📈 = Increment');
    console.log('  🔄 = Reset');
    console.log('  📊 = State Update');
    console.log('  👆 = User Click');
    console.log('-------------------');
  }, []);

  return (
    <DemoArticle
      metadata={{
        id: 'keep-alive',
        title: 'KeepAlive Pattern',
        description:
          'Learn how to persist Cubit instances in memory even when no components are using them',
        category: '02-patterns',
        difficulty: 'intermediate',
        tags: ['keep-alive', 'persistence', 'lifecycle', 'memory-management'],
        estimatedTime: 15,
      }}
    >
      {/* Introduction Section */}
      <ArticleSection theme="cubit" id="introduction">
        <Prose>
          <h2>Persistent State with KeepAlive</h2>
          <p>
            By default, BlaC Cubits are disposed when their last consumer
            unmounts. This is efficient for memory management, but sometimes you
            want state to persist even when no components are currently using
            it.
          </p>
          <p>
            The <code>keepAlive</code> pattern solves this by telling BlaC to
            keep the Cubit instance alive indefinitely. This is perfect for
            global app state, user sessions, configuration, and any data that
            should survive component lifecycles.
          </p>
        </Prose>

        <ConceptCallout type="info" title="When to Use KeepAlive">
          <ul className="text-sm space-y-2 list-disc list-inside">
            <li>
              <strong>Global App State:</strong> User authentication, settings,
              feature flags
            </li>
            <li>
              <strong>Session Data:</strong> Shopping cart, form drafts, user
              preferences
            </li>
            <li>
              <strong>Cached Data:</strong> API responses, user profiles,
              expensive computations
            </li>
            <li>
              <strong>Background Services:</strong> WebSocket connections,
              polling, sync services
            </li>
          </ul>
        </ConceptCallout>
      </ArticleSection>

      {/* Interactive Demo Section */}
      <ArticleSection theme="cubit" id="demo">
        <Prose>
          <h2>Interactive Demo: KeepAlive vs Regular</h2>
          <p>
            This demo showcases the difference between KeepAlive and Regular
            Cubits. Watch the instance IDs and console logs to see how lifecycle
            differs.
          </p>
        </Prose>

        <ConceptCallout type="tip" title="Open the Console">
          <p className="text-sm flex items-center gap-2">
            <Terminal className="w-4 h-4" />
            Press{' '}
            <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">
              F12
            </kbd>{' '}
            to open your browser console and see detailed lifecycle logs with
            emoji indicators for all events.
          </p>
        </ConceptCallout>

        <div className="space-y-6 not-prose">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* KeepAlive Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <h3 className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                  KeepAlive Counters
                </h3>
              </div>

              <div className="flex gap-2 mb-4">
                <Button
                  onClick={() => {
                    console.log(
                      `👆 User clicked: ${showKeepAlive1 ? 'Hide' : 'Show'} KeepAlive Counter 1`,
                    );
                    setShowKeepAlive1(!showKeepAlive1);
                  }}
                  variant={showKeepAlive1 ? 'secondary' : 'primary'}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  {showKeepAlive1 ? (
                    <>
                      <EyeOff className="w-4 h-4" /> Hide 1
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" /> Show 1
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => {
                    console.log(
                      `👆 User clicked: ${showKeepAlive2 ? 'Hide' : 'Show'} KeepAlive Counter 2`,
                    );
                    setShowKeepAlive2(!showKeepAlive2);
                  }}
                  variant={showKeepAlive2 ? 'secondary' : 'primary'}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  {showKeepAlive2 ? (
                    <>
                      <EyeOff className="w-4 h-4" /> Hide 2
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" /> Show 2
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-4 min-h-[300px]">
                <AnimatePresence>
                  {showKeepAlive1 && (
                    <KeepAliveCounter key="keepalive-1" id="1" />
                  )}
                </AnimatePresence>
                <AnimatePresence>
                  {showKeepAlive2 && (
                    <KeepAliveCounter key="keepalive-2" id="2" />
                  )}
                </AnimatePresence>

                {!showKeepAlive1 && !showKeepAlive2 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-8 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-lg bg-blue-50/50 dark:bg-blue-900/10 text-center"
                  >
                    <Heart className="w-12 h-12 mx-auto mb-3 text-blue-400 fill-current" />
                    <p className="text-blue-600 dark:text-blue-400 font-medium mb-2">
                      ✨ State Still Alive!
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      No KeepAlive counters are mounted, but the Cubit instance
                      still exists in memory. Toggle them back to see the
                      preserved state.
                    </p>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Regular Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <h3 className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                  Regular Counters
                </h3>
              </div>

              <div className="flex gap-2 mb-4">
                <Button
                  onClick={() => {
                    console.log(
                      `👆 User clicked: ${showRegular1 ? 'Hide' : 'Show'} Regular Counter 1`,
                    );
                    setShowRegular1(!showRegular1);
                  }}
                  variant={showRegular1 ? 'secondary' : 'primary'}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  {showRegular1 ? (
                    <>
                      <EyeOff className="w-4 h-4" /> Hide 1
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" /> Show 1
                    </>
                  )}
                </Button>

                <Button
                  onClick={() => {
                    console.log(
                      `👆 User clicked: ${showRegular2 ? 'Hide' : 'Show'} Regular Counter 2`,
                    );
                    setShowRegular2(!showRegular2);
                  }}
                  variant={showRegular2 ? 'secondary' : 'primary'}
                  className="flex-1 flex items-center justify-center gap-2"
                >
                  {showRegular2 ? (
                    <>
                      <EyeOff className="w-4 h-4" /> Hide 2
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4" /> Show 2
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-4 min-h-[300px]">
                <AnimatePresence>
                  {showRegular1 && <RegularCounter key="regular-1" id="1" />}
                </AnimatePresence>
                <AnimatePresence>
                  {showRegular2 && <RegularCounter key="regular-2" id="2" />}
                </AnimatePresence>

                {!showRegular1 && !showRegular2 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-8 border-2 border-dashed border-orange-300 dark:border-orange-700 rounded-lg bg-orange-50/50 dark:bg-orange-900/10 text-center"
                  >
                    <Trash2 className="w-12 h-12 mx-auto mb-3 text-orange-400" />
                    <p className="text-orange-600 dark:text-orange-400 font-medium mb-2">
                      💨 State Disposed!
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      No Regular counters are mounted. The Cubit was disposed
                      and state is lost. Toggle them back and notice the new
                      instance ID.
                    </p>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <ConceptCallout type="success" title="KeepAlive Behavior">
            <ul className="space-y-1 text-sm">
              <li>✓ Same instance ID across all mounts</li>
              <li>✓ State preserved when unmounted</li>
              <li>✓ Shared state between all consumers</li>
              <li>✓ Never disposed (unless explicitly cleared)</li>
            </ul>
          </ConceptCallout>

          <ConceptCallout type="info" title="Regular Behavior">
            <ul className="space-y-1 text-sm">
              <li>✓ New instance for each mount cycle</li>
              <li>✓ State reset on remount</li>
              <li>✓ Independent instances per component</li>
              <li>✓ Disposed when last consumer unmounts</li>
            </ul>
          </ConceptCallout>
        </div>

        <ConceptCallout type="success" title="Try This Sequence">
          <ol className="text-sm space-y-2 list-decimal list-inside">
            <li>Increment KeepAlive Counter 1 a few times</li>
            <li>Hide KeepAlive Counter 1</li>
            <li>
              Show KeepAlive Counter 2 -{' '}
              <strong>it should show the same count!</strong>
            </li>
            <li>Increment Counter 2</li>
            <li>
              Show Counter 1 again -{' '}
              <strong>both counters should be in sync!</strong>
            </li>
            <li>
              Try the same with Regular counters -{' '}
              <strong>they reset each time!</strong>
            </li>
          </ol>
        </ConceptCallout>
      </ArticleSection>

      {/* Implementation Section */}
      <ArticleSection theme="cubit" id="implementation">
        <Prose>
          <h2>Implementing KeepAlive</h2>
          <p>
            To make a Cubit persistent, simply add the{' '}
            <code>static keepAlive = true</code> property to your class. That's
            it!
          </p>
        </Prose>

        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Basic KeepAlive Cubit
            </h3>
            <CodePanel
              code={`import { Cubit } from '@blac/core';

// KeepAlive Cubit - persists when unused
class AppStateCubit extends Cubit<AppState> {
  static keepAlive = true; // This one line makes it persistent!

  constructor() {
    super({
      user: null,
      settings: defaultSettings,
    });
  }

  login = (user: User) => {
    this.patch({ user });
  };

  logout = () => {
    this.patch({ user: null });
  };
}

// Regular Cubit - disposed when unused
class ModalCubit extends Cubit<ModalState> {
  // No keepAlive property - default behavior

  constructor() {
    super({ isOpen: false, data: null });
  }

  open = (data: any) => {
    this.patch({ isOpen: true, data });
  };

  close = () => {
    this.patch({ isOpen: false, data: null });
  };
}

// Usage is identical for both
function MyComponent() {
  const [state, cubit] = useBloc(AppStateCubit);
  // AppStateCubit persists even if MyComponent unmounts

  const [modalState, modalCubit] = useBloc(ModalCubit);
  // ModalCubit will be disposed when MyComponent unmounts
}`}
              language="typescript"
              lineLabels={{
                4: 'KeepAlive Cubit',
                5: 'Magic line!',
                24: 'Regular Cubit',
                25: 'No keepAlive property',
                41: 'Usage is the same',
                45: 'Different lifecycle',
              }}
            />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-3">
              Common Use Cases
            </h3>

            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-base mb-2">
                  1. Global Authentication State
                </h4>
                <CodePanel
                  code={`class AuthCubit extends Cubit<AuthState> {
  static keepAlive = true;

  constructor() {
    super({ isAuthenticated: false, user: null });
    // Load persisted auth from localStorage
    this.loadPersistedAuth();
  }

  private loadPersistedAuth = async () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      const user = await this.validateToken(token);
      if (user) {
        this.patch({ isAuthenticated: true, user });
      }
    }
  };

  login = async (credentials: Credentials) => {
    const { token, user } = await api.login(credentials);
    localStorage.setItem('auth_token', token);
    this.patch({ isAuthenticated: true, user });
  };

  logout = () => {
    localStorage.removeItem('auth_token');
    this.patch({ isAuthenticated: false, user: null });
  };
}`}
                  language="typescript"
                />
              </div>

              <div>
                <h4 className="font-semibold text-base mb-2">
                  2. Shopping Cart (Session State)
                </h4>
                <CodePanel
                  code={`class CartCubit extends Cubit<CartState> {
  static keepAlive = true;

  constructor() {
    super({ items: [], total: 0 });
    // Restore cart from localStorage
    this.restoreCart();
  }

  private restoreCart = () => {
    const saved = localStorage.getItem('cart');
    if (saved) {
      this.emit(JSON.parse(saved));
    }
  };

  addItem = (item: CartItem) => {
    const items = [...this.state.items, item];
    const total = this.calculateTotal(items);
    const newState = { items, total };

    this.emit(newState);
    localStorage.setItem('cart', JSON.stringify(newState));
  };

  clearCart = () => {
    this.emit({ items: [], total: 0 });
    localStorage.removeItem('cart');
  };
}`}
                  language="typescript"
                />
              </div>

              <div>
                <h4 className="font-semibold text-base mb-2">
                  3. WebSocket Connection (Background Service)
                </h4>
                <CodePanel
                  code={`class WebSocketCubit extends Cubit<WebSocketState> {
  static keepAlive = true;
  private ws: WebSocket | null = null;

  constructor() {
    super({ connected: false, messages: [] });
    // Automatically connect on construction
    this.connect();
  }

  connect = () => {
    this.ws = new WebSocket('wss://api.example.com');

    this.ws.onopen = () => {
      this.patch({ connected: true });
      console.log('WebSocket connected');
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.patch({
        messages: [...this.state.messages, message],
      });
    };

    this.ws.onclose = () => {
      this.patch({ connected: false });
      // Reconnect after delay
      setTimeout(this.connect, 5000);
    };
  };

  send = (data: any) => {
    if (this.ws && this.state.connected) {
      this.ws.send(JSON.stringify(data));
    }
  };

  onDispose = async () => {
    // Clean up on explicit disposal
    this.ws?.close();
    return super.onDispose();
  };
}`}
                  language="typescript"
                  lineLabels={{
                    2: 'KeepAlive ensures connection persists',
                    7: 'Connect on construction',
                    28: 'Auto-reconnect',
                    40: 'Cleanup on disposal',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <ConceptCallout type="warning" title="Memory Considerations">
          <p className="text-sm">
            KeepAlive Cubits stay in memory indefinitely, so use them wisely.
            Only use <code>keepAlive = true</code> for state that truly needs to
            persist across the entire app lifecycle. For temporary UI state or
            feature-specific data, use regular Cubits that dispose
            automatically.
          </p>
        </ConceptCallout>
      </ArticleSection>

      {/* Key Takeaways Section */}
      <ArticleSection theme="cubit" id="key-takeaways">
        <Prose>
          <h2>Key Takeaways</h2>
        </Prose>

        <ConceptCallout type="success" title="What You've Learned">
          <ul className="space-y-2 text-sm">
            <li>
              <strong>KeepAlive Pattern:</strong> Add{' '}
              <code>static keepAlive = true</code> to persist Cubits
              indefinitely
            </li>
            <li>
              <strong>Use Cases:</strong> Perfect for authentication, settings,
              shopping carts, and background services
            </li>
            <li>
              <strong>Lifecycle:</strong> KeepAlive Cubits survive component
              unmounts and remounts
            </li>
            <li>
              <strong>Shared State:</strong> All consumers see the same instance
              and state
            </li>
            <li>
              <strong>Memory Management:</strong> Use sparingly for truly global
              state only
            </li>
            <li>
              <strong>Cleanup:</strong> Implement <code>onDispose</code> for
              cleanup if needed
            </li>
          </ul>
        </ConceptCallout>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <ConceptCallout type="success" title="Use KeepAlive For">
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>User authentication and sessions</li>
              <li>App-wide settings and configuration</li>
              <li>Shopping carts and draft data</li>
              <li>WebSocket connections</li>
              <li>Cached API responses</li>
              <li>Background sync services</li>
            </ul>
          </ConceptCallout>

          <ConceptCallout type="warning" title="Don't Use KeepAlive For">
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li>Temporary UI state (modals, tooltips)</li>
              <li>Component-local state</li>
              <li>Form state (unless drafts)</li>
              <li>List filtering and sorting</li>
              <li>Paginated data (use regular Cubits)</li>
              <li>Any state tied to a specific view</li>
            </ul>
          </ConceptCallout>
        </div>

        <Prose>
          <p className="text-lg font-medium text-slate-900 dark:text-slate-100 mt-6">
            The KeepAlive pattern is essential for building stateful
            applications with BlaC. By preserving state across component
            lifecycles, you can create seamless user experiences where data
            persists exactly when and where you need it to.
          </p>
        </Prose>
      </ArticleSection>
    </DemoArticle>
  );
};
