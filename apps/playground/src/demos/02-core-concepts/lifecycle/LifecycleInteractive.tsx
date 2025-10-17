import { useBloc } from '@blac/react';
import { Cubit, Bloc, Blac, type BlacPlugin } from '@blac/core';
import { Button } from '@/ui/Button';
import { StateViewer } from '@/components/shared/StateViewer';
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
  static isolated = true;

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
  static keepAlive = true;

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
    // Skip state changes to reduce noise
  }

  private addLog(log: string) {
    this.logs.push(log);
    if (this.logs.length > 20) {
      this.logs.shift();
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

// ============= Individual Demo Components =============
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
        className="p-6 rounded-xl bg-gradient-to-br from-brand/10 to-brand/5 border-2 border-brand/20"
      >
        <h4 className="font-semibold mb-3">Component Lifecycle</h4>
        <div className="space-y-2 text-sm">
          <p>Created: {new Date(state.createdAt).toLocaleTimeString()}</p>
          <p>Updates: {state.updateCount}</p>
          <p>Last Update: {new Date(state.lastUpdate).toLocaleTimeString()}</p>
          <p>Status: <span className={state.status === 'active' ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}>{state.status}</span></p>
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
        className="p-4 rounded-lg bg-brand/10 border border-brand/30"
      >
        <h5 className="font-medium mb-2">Component A</h5>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-brand">{state}</span>
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
        className="p-4 rounded-lg bg-brand/10 border border-brand/30"
      >
        <h5 className="font-medium mb-2">Component B</h5>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-brand">{state}</span>
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
        className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30"
      >
        <h5 className="font-medium mb-2">Component A (Isolated)</h5>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{state}</span>
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
        className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30"
      >
        <h5 className="font-medium mb-2">Component B (Isolated)</h5>
        <div className="flex items-center gap-3">
          <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{state}</span>
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
        className="p-6 rounded-xl bg-gradient-to-br from-green-500/20 to-green-500/10 border-2 border-green-500/30"
      >
        <h4 className="font-semibold mb-3">Persistent Counter (Mount #{mountCount})</h4>
        <div className="flex items-center gap-4">
          <motion.span
            key={state}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="text-4xl font-bold text-green-600 dark:text-green-400"
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
          <div className="p-6 rounded-xl border-2 border-dashed border-green-500/30 text-center text-green-600 dark:text-green-400">
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

// ============= Main Interactive Component for MDX =============
export function LifecycleInteractive() {
  return (
    <div className="my-8 space-y-12">
      {/* Mount/Unmount Demo */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Component Mounting</h3>
        <MountUnmountDemo />
      </div>

      {/* Shared Instance Demo */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Shared Instances (Default)</h3>
        <SharedInstanceDemo />
        <StateViewer bloc={SharedCounterCubit} title="Shared Counter State" />
      </div>

      {/* Isolated Instance Demo */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Isolated Instances</h3>
        <IsolatedInstanceDemo />
      </div>

      {/* Keep Alive Demo */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Keep Alive Pattern</h3>
        <KeepAliveDemo />
      </div>

      {/* Lifecycle Event Log */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Lifecycle Events</h3>
        <LifecycleEventLog />
      </div>
    </div>
  );
}
