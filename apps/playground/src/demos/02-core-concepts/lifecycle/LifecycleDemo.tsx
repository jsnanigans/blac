import { useBloc } from '@blac/react';
import { Cubit, Vertex, Blac, type BlacPlugin } from '@blac/core';
import { Button } from '@/ui/Button';
import { DemoArticle } from '@/components/demo-article/DemoArticle';
import { ArticleSection, SectionHeader } from '@/components/demo-article/ArticleSection';
import { Prose } from '@/components/demo-article/Prose';
import { CodePanel } from '@/components/demo-article/CodePanel';
import { StateViewer } from '@/components/shared/StateViewer';
import { ConceptCallout, TipCallout, WarningCallout, InfoCallout } from '@/components/shared/ConceptCallout';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef } from 'react';

// ============= Basic Lifecycle Cubit =============
interface LifecycleState {
  createdAt: string;
  updateCount: number;
  lastUpdate: string;
  status: 'active' | 'idle';
}

class LifecycleCubit extends Cubit<LifecycleState> {
  private interval?: NodeJS.Timeout;

  constructor() {
    const now = new Date().toISOString();
    super({
      createdAt: now,
      updateCount: 0,
      lastUpdate: now,
      status: 'idle',
    });
    console.log('[LifecycleCubit] Constructor called');
  }

  startActivity = () => {
    this.patch({ status: 'active' });
    this.interval = setInterval(() => {
      this.patch({
        updateCount: this.state.updateCount + 1,
        lastUpdate: new Date().toISOString(),
      });
    }, 1000);
  };

  stopActivity = () => {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = undefined;
    }
    this.patch({ status: 'idle' });
  };

  onDispose = () => {
    console.log('[LifecycleCubit] Disposing...');
    this.stopActivity();
  };
}

// ============= Shared Instance Cubit (Default) =============
class SharedCounterCubit extends Cubit<number> {
  constructor() {
    super(0);
    console.log('[SharedCounterCubit] New instance created');
  }

  increment = () => {
    this.emit(this.state + 1);
  };

  decrement = () => {
    this.emit(this.state - 1);
  };

  onDispose = () => {
    console.log('[SharedCounterCubit] Disposing');
  };
}

// ============= Isolated Instance Cubit =============
class IsolatedCounterCubit extends Cubit<number> {
  static isolated = true; // Each component gets its own instance

  constructor() {
    super(0);
    console.log('[IsolatedCounterCubit] New instance created');
  }

  increment = () => {
    this.emit(this.state + 1);
  };

  decrement = () => {
    this.emit(this.state - 1);
  };

  onDispose = () => {
    console.log('[IsolatedCounterCubit] Disposing');
  };
}

// ============= Keep Alive Cubit =============
class PersistentCounterCubit extends Cubit<number> {
  static keepAlive = true; // Survives component unmounting

  constructor() {
    super(0);
    console.log('[PersistentCounterCubit] New instance created (will persist)');
  }

  increment = () => {
    this.emit(this.state + 1);
  };

  decrement = () => {
    this.emit(this.state - 1);
  };

  reset = () => {
    this.emit(0);
  };

  onDispose = () => {
    console.log('[PersistentCounterCubit] Disposing (only on manual disposal)');
  };
}

// ============= Lifecycle Event Logger Plugin =============
class LifecycleLoggerPlugin implements BlacPlugin {
  readonly name = 'LifecycleLogger';
  readonly version = '1.0.0';
  private logs: string[] = [];
  private onLogUpdate?: (logs: string[]) => void;

  setLogCallback(callback: (logs: string[]) => void) {
    this.onLogUpdate = callback;
  }

  onBlocCreated(bloc: any): void {
    const timestamp = new Date().toLocaleTimeString();
    const log = `[${timestamp}] CREATED: ${bloc._name || bloc.constructor.name}`;
    this.addLog(log);
  }

  onBlocDisposed(bloc: any): void {
    const timestamp = new Date().toLocaleTimeString();
    const log = `[${timestamp}] DISPOSED: ${bloc._name || bloc.constructor.name}`;
    this.addLog(log);
  }

  onStateChanged(bloc: any, previousState: any, currentState: any): void {
    // Skip state changes to reduce noise - could enable this for debugging
    // const timestamp = new Date().toLocaleTimeString();
    // const log = `[${timestamp}] STATE_CHANGED: ${bloc._name || bloc.constructor.name}`;
    // this.addLog(log);
  }

  private addLog(log: string) {
    this.logs.push(log);
    if (this.logs.length > 20) {
      this.logs.shift(); // Keep only last 20 logs
    }
    this.onLogUpdate?.(this.logs);
  }

  clearLogs() {
    this.logs = [];
    this.onLogUpdate?.(this.logs);
  }

  getLogs() {
    return this.logs;
  }
}

// ============= Helper Functions =============
const celebrate = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
  });
};

// ============= Interactive Components =============
function MountUnmountDemo() {
  const [isMounted, setIsMounted] = useState(true);

  const ComponentWithLifecycle = () => {
    const [state, cubit] = useBloc(LifecycleCubit);

    useEffect(() => {
      cubit.startActivity();
      return () => {
        cubit.stopActivity();
      };
    }, [cubit]);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="p-6 rounded-xl bg-gradient-to-br from-concept-cubit/10 to-concept-cubit/5 border-2 border-concept-cubit/20"
      >
        <h4 className="font-semibold mb-3">Component Lifecycle</h4>
        <div className="space-y-2 text-sm">
          <p>Created: {new Date(state.createdAt).toLocaleTimeString()}</p>
          <p>Updates: {state.updateCount}</p>
          <p>Last Update: {new Date(state.lastUpdate).toLocaleTimeString()}</p>
          <p>Status: <span className={state.status === 'active' ? 'text-semantic-success' : 'text-muted-foreground'}>{state.status}</span></p>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          onClick={() => setIsMounted(!isMounted)}
          variant={isMounted ? 'muted' : 'primary'}
          size="lg"
        >
          {isMounted ? 'Unmount Component' : 'Mount Component'}
        </Button>
        <span className="text-sm text-muted-foreground">
          Component is {isMounted ? 'mounted' : 'unmounted'}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {isMounted && <ComponentWithLifecycle key="lifecycle-component" />}
      </AnimatePresence>

      {!isMounted && (
        <div className="p-6 rounded-xl border-2 border-dashed border-muted-foreground/30 text-center text-muted-foreground">
          Component unmounted - Cubit instance disposed
        </div>
      )}
    </div>
  );
}

function SharedInstanceDemo() {
  const [showComponentA, setShowComponentA] = useState(true);
  const [showComponentB, setShowComponentB] = useState(true);

  const ComponentA = () => {
    const [state, cubit] = useBloc(SharedCounterCubit);

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="p-4 rounded-lg bg-concept-cubit/10 border border-concept-cubit/30"
      >
        <h5 className="font-medium mb-2">Component A</h5>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-concept-cubit">{state}</span>
          <div className="flex gap-2">
            <Button onClick={cubit.decrement} variant="outline" size="sm">-</Button>
            <Button onClick={cubit.increment} variant="outline" size="sm">+</Button>
          </div>
        </div>
      </motion.div>
    );
  };

  const ComponentB = () => {
    const [state, cubit] = useBloc(SharedCounterCubit);

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="p-4 rounded-lg bg-concept-cubit/10 border border-concept-cubit/30"
      >
        <h5 className="font-medium mb-2">Component B</h5>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-concept-cubit">{state}</span>
          <div className="flex gap-2">
            <Button onClick={cubit.decrement} variant="outline" size="sm">-</Button>
            <Button onClick={cubit.increment} variant="outline" size="sm">+</Button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap">
        <Button
          onClick={() => setShowComponentA(!showComponentA)}
          variant={showComponentA ? 'muted' : 'outline'}
          size="sm"
        >
          {showComponentA ? 'Hide' : 'Show'} Component A
        </Button>
        <Button
          onClick={() => setShowComponentB(!showComponentB)}
          variant={showComponentB ? 'muted' : 'outline'}
          size="sm"
        >
          {showComponentB ? 'Hide' : 'Show'} Component B
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>{showComponentA && <ComponentA key="comp-a" />}</AnimatePresence>
        <AnimatePresence>{showComponentB && <ComponentB key="comp-b" />}</AnimatePresence>
      </div>

      <p className="text-sm text-muted-foreground">
        Both components share the <strong>same instance</strong> of SharedCounterCubit.
        Changes in one affect the other. The instance survives until <strong>all</strong> components unmount.
      </p>
    </div>
  );
}

function IsolatedInstanceDemo() {
  const [showComponentA, setShowComponentA] = useState(true);
  const [showComponentB, setShowComponentB] = useState(true);

  const ComponentA = () => {
    const [state, cubit] = useBloc(IsolatedCounterCubit);

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="p-4 rounded-lg bg-concept-bloc/10 border border-concept-bloc/30"
      >
        <h5 className="font-medium mb-2">Component A (Isolated)</h5>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-concept-bloc">{state}</span>
          <div className="flex gap-2">
            <Button onClick={cubit.decrement} variant="outline" size="sm">-</Button>
            <Button onClick={cubit.increment} variant="outline" size="sm">+</Button>
          </div>
        </div>
      </motion.div>
    );
  };

  const ComponentB = () => {
    const [state, cubit] = useBloc(IsolatedCounterCubit);

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="p-4 rounded-lg bg-concept-bloc/10 border border-concept-bloc/30"
      >
        <h5 className="font-medium mb-2">Component B (Isolated)</h5>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-concept-bloc">{state}</span>
          <div className="flex gap-2">
            <Button onClick={cubit.decrement} variant="outline" size="sm">-</Button>
            <Button onClick={cubit.increment} variant="outline" size="sm">+</Button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap">
        <Button
          onClick={() => setShowComponentA(!showComponentA)}
          variant={showComponentA ? 'muted' : 'outline'}
          size="sm"
        >
          {showComponentA ? 'Hide' : 'Show'} Component A
        </Button>
        <Button
          onClick={() => setShowComponentB(!showComponentB)}
          variant={showComponentB ? 'muted' : 'outline'}
          size="sm"
        >
          {showComponentB ? 'Hide' : 'Show'} Component B
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>{showComponentA && <ComponentA key="iso-a" />}</AnimatePresence>
        <AnimatePresence>{showComponentB && <ComponentB key="iso-b" />}</AnimatePresence>
      </div>

      <p className="text-sm text-muted-foreground">
        Each component has its <strong>own isolated instance</strong> of IsolatedCounterCubit.
        Changes in one do not affect the other. Each instance is disposed when its component unmounts.
      </p>
    </div>
  );
}

function KeepAliveDemo() {
  const [showComponent, setShowComponent] = useState(true);
  const [mountCount, setMountCount] = useState(1);

  const PersistentComponent = () => {
    const [state, cubit] = useBloc(PersistentCounterCubit);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="p-6 rounded-xl bg-gradient-to-br from-semantic-success-light/20 to-semantic-success-light/10 border-2 border-semantic-success/30"
      >
        <h4 className="font-semibold mb-3">Persistent Counter (Mount #{mountCount})</h4>
        <div className="flex items-center gap-4">
          <motion.span
            key={state}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="text-4xl font-bold text-semantic-success-dark"
          >
            {state}
          </motion.span>
          <div className="flex gap-2">
            <Button onClick={cubit.decrement} variant="outline" size="sm">-</Button>
            <Button onClick={cubit.increment} variant="primary" size="sm">+</Button>
            <Button onClick={cubit.reset} variant="ghost" size="sm">Reset</Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          This value persists even when the component unmounts!
        </p>
      </motion.div>
    );
  };

  const handleToggle = () => {
    if (showComponent) {
      setShowComponent(false);
    } else {
      setMountCount(prev => prev + 1);
      setShowComponent(true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Button
          onClick={handleToggle}
          variant={showComponent ? 'muted' : 'primary'}
          size="lg"
        >
          {showComponent ? 'Unmount Component' : 'Mount Component'}
        </Button>
        <span className="text-sm text-muted-foreground">
          Mount count: {mountCount}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {showComponent ? (
          <PersistentComponent key={`persistent-${mountCount}`} />
        ) : (
          <div className="p-6 rounded-xl border-2 border-dashed border-semantic-success/30 text-center text-semantic-success-dark">
            Component unmounted but state is preserved!
            <br />
            <span className="text-sm">Mount again to see the same value.</span>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function LifecycleEventLog() {
  const [logs, setLogs] = useState<string[]>([]);
  const pluginRef = useRef<LifecycleLoggerPlugin | null>(null);

  useEffect(() => {
    if (!pluginRef.current) {
      pluginRef.current = new LifecycleLoggerPlugin();
      pluginRef.current.setLogCallback(setLogs);
      Blac.instance.plugins.add(pluginRef.current);
    }

    return () => {
      if (pluginRef.current) {
        // Note: In production, you'd want to remove the plugin
        Blac.instance.plugins.remove(pluginRef.current.name);
      }
    };
  }, []);

  const clearLogs = () => {
    pluginRef.current?.clearLogs();
    setLogs([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Lifecycle Event Log</h4>
        <Button onClick={clearLogs} variant="outline" size="sm">Clear Log</Button>
      </div>
      <div className="bg-muted/30 rounded-lg p-3 max-h-60 overflow-y-auto font-mono text-xs">
        {logs.length === 0 ? (
          <p className="text-muted-foreground">No events yet. Interact with the demos above to see lifecycle events.</p>
        ) : (
          <AnimatePresence>
            {logs.map((log, index) => (
              <motion.div
                key={`${log}-${index}`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-1 border-b border-muted/50 last:border-0"
              >
                {log}
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

// ============= Demo Metadata =============
const demoMetadata = {
  id: 'lifecycle',
  title: 'Bloc Lifecycle Management',
  description: 'Understand the lifecycle of Blocs and Cubits: initialization, state updates, instance management, and disposal.',
  category: '02-core-concepts',
  difficulty: 'intermediate' as const,
  tags: ['bloc', 'cubit', 'lifecycle', 'instances', 'disposal', 'memory'],
  estimatedTime: 15,
  learningPath: {
    previous: 'computed-properties',
    next: 'async',
    sequence: 5,
  },
  theme: {
    primaryColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
};

// ============= Main Demo Component =============
export function LifecycleDemo() {
  return (
    <DemoArticle metadata={demoMetadata} showBlocGraph={true} hideNavigation={true}>
      {/* Introduction */}
      <ArticleSection theme="bloc" id="introduction">
        <Prose>
          <h2>Understanding Bloc Lifecycle</h2>
          <p>
            Every Bloc and Cubit in your application has a <strong>lifecycle</strong> - from creation
            to disposal. Understanding this lifecycle is crucial for building efficient, memory-safe applications.
          </p>
          <p>
            In this demo, you'll learn how BlaC manages instances, when they're created and destroyed,
            and how to control their behavior using <strong>instance patterns</strong> and <strong>lifecycle hooks</strong>.
          </p>
        </Prose>
      </ArticleSection>

      {/* Initialization & Constructor */}
      <ArticleSection id="initialization">
        <SectionHeader>Initialization & Constructor</SectionHeader>
        <Prose>
          <p>
            When a Bloc or Cubit is created, its constructor runs once. This is where you set up
            initial state, configure listeners, or perform any one-time setup.
          </p>
        </Prose>

        <CodePanel
          code={`class LifecycleCubit extends Cubit<LifecycleState> {
  private interval?: NodeJS.Timeout;

  constructor() {
    // Constructor runs once when instance is created
    const now = new Date().toISOString();
    super({
      createdAt: now,
      updateCount: 0,
      lastUpdate: now,
      status: 'idle',
    });

    // Perfect place for one-time setup
    console.log('[LifecycleCubit] Constructor called');
  }

  // Lifecycle hook - called when instance is disposed
  onDispose = () => {
    console.log('[LifecycleCubit] Disposing...');
    this.stopActivity();
    // Clean up resources, timers, subscriptions
  };
}`}
          language="typescript"
          title="LifecycleCubit.ts"
          showLineNumbers={true}
          highlightLines={[4, 5, 14, 18, 19, 20]}
          lineLabels={{
            4: 'Constructor runs once per instance',
            5: 'Initialize state in super() call',
            14: 'Log or perform setup tasks',
            18: 'onDispose lifecycle hook',
            20: 'Clean up resources here',
          }}
        />
      </ArticleSection>

      {/* Component Mounting */}
      <ArticleSection theme="cubit" id="component-mounting">
        <SectionHeader>Component Lifecycle</SectionHeader>
        <Prose>
          <p>
            See how Bloc instances are created when components mount and disposed when they unmount.
            Watch the lifecycle in action!
          </p>
        </Prose>

        <div className="my-8">
          <MountUnmountDemo />
        </div>

        <InfoCallout title="Instance Creation Timing">
          <p>
            By default, a Bloc/Cubit instance is created the first time <code>useBloc</code> is called.
            The instance lives until all components using it unmount.
          </p>
        </InfoCallout>
      </ArticleSection>

      {/* Shared Instances */}
      <ArticleSection theme="neutral" id="shared-instances">
        <SectionHeader>Shared Instances (Default)</SectionHeader>
        <Prose>
          <p>
            By default, all components using the same Bloc class share a <strong>single instance</strong>.
            This is perfect for global state that should be synchronized across your app.
          </p>
        </Prose>

        <div className="my-8">
          <SharedInstanceDemo />
        </div>

        <div className="my-8">
          <StateViewer bloc={SharedCounterCubit} title="Shared Counter State" />
        </div>

        <CodePanel
          code={`// Shared instance (default behavior)
class SharedCounterCubit extends Cubit<number> {
  // No special configuration needed
  // All components share one instance
}

// In Component A
function ComponentA() {
  const [state, cubit] = useBloc(SharedCounterCubit);
  // Gets the shared instance
}

// In Component B
function ComponentB() {
  const [state, cubit] = useBloc(SharedCounterCubit);
  // Gets the SAME instance as Component A
}`}
          language="typescript"
          showLineNumbers={true}
          highlightLines={[2, 9, 15]}
          lineLabels={{
            2: 'Default: shared instance',
            9: 'First component creates instance',
            15: 'Other components reuse it',
          }}
        />
      </ArticleSection>

      {/* Isolated Instances */}
      <ArticleSection theme="bloc" id="isolated-instances">
        <SectionHeader>Isolated Instances</SectionHeader>
        <Prose>
          <p>
            Sometimes you need each component to have its <strong>own isolated instance</strong>.
            Use the <code>static isolated = true</code> flag to enable this pattern.
          </p>
        </Prose>

        <div className="my-8">
          <IsolatedInstanceDemo />
        </div>

        <CodePanel
          code={`// Isolated instances - each component gets its own
class IsolatedCounterCubit extends Cubit<number> {
  static isolated = true; // Magic flag!

  constructor() {
    super(0);
    // This runs for EACH component
  }
}

// In Component A
function ComponentA() {
  const [state, cubit] = useBloc(IsolatedCounterCubit);
  // Gets its OWN instance
}

// In Component B
function ComponentB() {
  const [state, cubit] = useBloc(IsolatedCounterCubit);
  // Gets a DIFFERENT instance
}`}
          language="typescript"
          showLineNumbers={true}
          highlightLines={[3, 7, 13, 19]}
          lineLabels={{
            3: 'Enable isolated instances',
            7: 'Constructor runs per component',
            13: 'Component A gets instance #1',
            19: 'Component B gets instance #2',
          }}
        />

        <TipCallout title="When to Use Isolated Instances">
          <p>
            Use isolated instances for component-specific state like forms, modals, or any state
            that should be independent between component instances.
          </p>
        </TipCallout>
      </ArticleSection>

      {/* Keep Alive Pattern */}
      <ArticleSection theme="success" id="keep-alive">
        <SectionHeader>Keep Alive Pattern</SectionHeader>
        <Prose>
          <p>
            The <strong>keep alive pattern</strong> creates instances that persist even when all
            components unmount. Perfect for caching, user sessions, or background tasks.
          </p>
        </Prose>

        <div className="my-8">
          <KeepAliveDemo />
        </div>

        <CodePanel
          code={`// Persistent instances survive component unmounting
class PersistentCounterCubit extends Cubit<number> {
  static keepAlive = true; // Survives unmounting!

  constructor() {
    super(0);
    console.log('Created once, lives forever');
  }

  // Still has onDispose, but only called on manual disposal
  onDispose = () => {
    console.log('Only disposed manually');
  };
}

// Component can mount/unmount freely
function MyComponent() {
  const [state, cubit] = useBloc(PersistentCounterCubit);
  // State persists between mounts!
  return <div>{state}</div>;
}

// To manually dispose a keep-alive instance:
// Blac.dispose(PersistentCounterCubit);`}
          language="typescript"
          showLineNumbers={true}
          highlightLines={[3, 7, 11, 18, 23]}
          lineLabels={{
            3: 'Enable keep alive',
            7: 'Created once, persists',
            11: 'onDispose only on manual disposal',
            18: 'State preserved between mounts',
            23: 'Manual disposal when needed',
          }}
        />

        <WarningCallout title="Memory Management">
          <p>
            Keep-alive instances stay in memory until manually disposed. Use them sparingly
            for truly persistent state, not as a default pattern.
          </p>
        </WarningCallout>
      </ArticleSection>

      {/* Disposal & Cleanup */}
      <ArticleSection theme="warning" id="disposal">
        <SectionHeader>Disposal & Cleanup</SectionHeader>
        <Prose>
          <p>
            Proper cleanup is essential for preventing memory leaks. BlaC automatically manages
            disposal, but you can hook into the process with <code>onDispose</code>.
          </p>
        </Prose>

        <CodePanel
          code={`class ResourceCubit extends Cubit<State> {
  private subscription?: Subscription;
  private timer?: NodeJS.Timeout;
  private socket?: WebSocket;

  constructor() {
    super(initialState);

    // Set up resources
    this.subscription = eventBus.subscribe(this.handleEvent);
    this.timer = setInterval(this.tick, 1000);
    this.socket = new WebSocket('ws://example.com');
  }

  // CRITICAL: Clean up in onDispose
  onDispose = () => {
    // Unsubscribe from external events
    this.subscription?.unsubscribe();

    // Clear timers
    clearInterval(this.timer);

    // Close connections
    this.socket?.close();

    // Clear references
    this.subscription = undefined;
    this.timer = undefined;
    this.socket = undefined;

    console.log('All resources cleaned up');
  };
}`}
          language="typescript"
          title="ResourceCleanup.ts"
          showLineNumbers={true}
          highlightLines={[15, 17, 20, 23, 26, 27, 28]}
          lineLabels={{
            15: 'Always implement onDispose for cleanup',
            17: 'Unsubscribe from events',
            20: 'Clear timers and intervals',
            23: 'Close network connections',
            26: 'Clear references to help GC',
          }}
        />
      </ArticleSection>

      {/* Lifecycle Events */}
      <ArticleSection theme="info" id="lifecycle-events">
        <SectionHeader>Lifecycle Events</SectionHeader>
        <Prose>
          <p>
            BlaC emits lifecycle events that plugins can listen to. This is useful for debugging,
            analytics, or building developer tools. Try interacting with the demos above!
          </p>
        </Prose>

        <div className="my-8">
          <LifecycleEventLog />
        </div>

        <CodePanel
          code={`// Create a lifecycle monitoring plugin
class LifecycleLoggerPlugin implements BlacPlugin {
  name = 'LifecycleLogger';
  version = '1.0.0';

  onBlocCreated(bloc: BlocBase) {
    console.log(\`Created: \${bloc.constructor.name}\`);
  }

  onBlocDisposed(bloc: BlocBase) {
    console.log(\`Disposed: \${bloc.constructor.name}\`);
  }

  onStateChanged(bloc: BlocBase, previousState: any, currentState: any) {
    console.log(\`State changed in: \${bloc.constructor.name}\`);
  }

  // Optional: React adapter lifecycle hooks
  onAdapterMount(adapter: any, metadata: AdapterMetadata) {
    console.log(\`Component mounted using: \${metadata.blocInstance.constructor.name}\`);
  }

  onAdapterUnmount(adapter: any, metadata: AdapterMetadata) {
    console.log(\`Component unmounted from: \${metadata.blocInstance.constructor.name}\`);
  }
}

// Register the plugin globally
Blac.instance.plugins.add(new LifecycleLoggerPlugin());`}
          language="typescript"
          showLineNumbers={true}
          highlightLines={[4, 7, 11, 15, 20, 24, 29]}
          lineLabels={{
            4: 'Plugin version required',
            7: 'Instance created',
            11: 'Instance disposed',
            15: 'State updated',
            20: 'Component mounted',
            24: 'Component unmounted',
            29: 'Register plugin globally',
          }}
        />
      </ArticleSection>

      {/* Best Practices */}
      <ArticleSection theme="neutral" id="best-practices">
        <SectionHeader>Best Practices</SectionHeader>
        <Prose>
          <h3>Choose the Right Instance Pattern</h3>
          <ul>
            <li>
              <strong>Shared (default)</strong>: Use for app-wide state like user auth, theme, settings
            </li>
            <li>
              <strong>Isolated</strong>: Use for component-specific state like forms, modals, local UI state
            </li>
            <li>
              <strong>Keep Alive</strong>: Use sparingly for truly persistent state like cache or background tasks
            </li>
          </ul>

          <h3>Memory Management Tips</h3>
          <ul>
            <li>Always implement <code>onDispose</code> when using external resources</li>
            <li>Clear timers, subscriptions, and network connections</li>
            <li>Avoid keeping references to disposed Blocs</li>
            <li>Use WeakMap/WeakRef for caching when appropriate</li>
          </ul>

          <h3>Debugging Lifecycle Issues</h3>
          <ul>
            <li>Use lifecycle plugins to track instance creation/disposal</li>
            <li>Check React DevTools for unexpected remounts</li>
            <li>Monitor memory usage in Chrome DevTools</li>
            <li>Add console logs in constructor and onDispose during development</li>
          </ul>
        </Prose>
      </ArticleSection>

      {/* Key Takeaways */}
      <ArticleSection theme="success" id="takeaways">
        <SectionHeader>Key Takeaways</SectionHeader>
        <Prose>
          <ul>
            <li>
              <strong>Lifecycle stages</strong>: Creation → Active → Disposal
            </li>
            <li>
              <strong>Instance patterns</strong>: Shared (default), Isolated, and Keep Alive
            </li>
            <li>
              <strong>Automatic management</strong>: BlaC handles instance creation and disposal
            </li>
            <li>
              <strong>Clean up resources</strong>: Use onDispose for timers, subscriptions, connections
            </li>
            <li>
              <strong>Memory efficiency</strong>: Instances are disposed when no longer needed (except keep-alive)
            </li>
            <li>
              <strong>Lifecycle events</strong>: Plugins can monitor all lifecycle transitions
            </li>
          </ul>
        </Prose>
      </ArticleSection>

      {/* Next Steps */}
      <ArticleSection theme="info" id="next-steps">
        <SectionHeader>Next Steps</SectionHeader>
        <Prose>
          <p>
            Excellent work! You now understand how BlaC manages the lifecycle of your state containers.
            You've learned about instance patterns, disposal, and memory management.
          </p>
          <p>
            Next, you'll explore <strong>Async Operations</strong> - learn how to handle
            asynchronous data fetching, loading states, and error handling with Blocs and Cubits.
          </p>
        </Prose>
      </ArticleSection>
    </DemoArticle>
  );
}