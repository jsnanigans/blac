import { useState } from 'react';
import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { Button } from '@/ui/Button';
import { StateViewer } from '@/components/shared/StateViewer';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

// Complex state for demonstration
interface UserProfile {
  name: string;
  age: number;
  email: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

class ProfileCubit extends Cubit<UserProfile> {
  constructor() {
    super({
      name: 'Alice',
      age: 28,
      email: 'alice@example.com',
      preferences: {
        theme: 'light',
        notifications: true,
      },
    });
  }

  // Using emit() - replaces entire state
  loadNewProfile = () => {
    this.emit({
      name: 'Bob',
      age: 35,
      email: 'bob@example.com',
      preferences: {
        theme: 'dark',
        notifications: false,
      },
    });
  };

  // Using patch() - shallow merge
  updateName = (name: string) => {
    this.patch({ name });
  };

  updateAge = (age: number) => {
    this.patch({ age });
  };

  reset = () => {
    this.emit({
      name: 'Alice',
      age: 28,
      email: 'alice@example.com',
      preferences: {
        theme: 'light',
        notifications: true,
      },
    });
  };
}

// Visual diff component
interface DiffDisplayProps {
  before: any;
  after: any;
  operation: string;
}

function DiffDisplay({ before, after, operation }: DiffDisplayProps) {
  const renderField = (key: string, beforeVal: any, afterVal: any) => {
    const changed = JSON.stringify(beforeVal) !== JSON.stringify(afterVal);
    const removed = beforeVal !== undefined && afterVal === undefined;

    return (
      <div
        key={key}
        className="flex items-center gap-3 py-1 text-xs sm:text-sm"
      >
        <span className="w-28 text-muted-foreground/80">{key}:</span>
        {removed && (
          <span className="font-mono text-rose-500 line-through">
            {JSON.stringify(beforeVal)}
          </span>
        )}
        {!removed && (
          <>
            {changed && (
              <>
                <span className="font-mono text-rose-400/80 line-through">
                  {JSON.stringify(beforeVal)}
                </span>
                <ArrowRight className="h-4 w-4 text-muted-foreground/70" />
              </>
            )}
            <span
              className={cn(
                'font-mono',
                changed && 'text-emerald-500 font-semibold',
              )}
            >
              {JSON.stringify(afterVal)}
            </span>
          </>
        )}
      </div>
    );
  };

  const renderDiff = (obj1: any, obj2: any, path = '') => {
    const keys = new Set([
      ...Object.keys(obj1 || {}),
      ...Object.keys(obj2 || {}),
    ]);

    return Array.from(keys).map((key) => {
      const val1 = obj1?.[key];
      const val2 = obj2?.[key];

      if (
        typeof val1 === 'object' &&
        typeof val2 === 'object' &&
        !Array.isArray(val1)
      ) {
        return (
          <div key={key} className="ml-4 mt-2">
            <div className="font-semibold text-sm text-foreground mb-1">
              {key}:
            </div>
            {renderDiff(val1, val2, `${path}.${key}`)}
          </div>
        );
      }

      return renderField(key, val1, val2);
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl border border-border/70 bg-surface px-4 py-5 shadow-subtle"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-emerald-200/25 dark:to-emerald-900/25 opacity-80" />
      <div className="relative flex items-center gap-2 pb-3">
        <span className="inline-flex items-center rounded-full bg-brand px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-brand-foreground">
          {operation}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          State changes
        </span>
      </div>
      <div className="relative space-y-2 font-mono text-xs">
        {renderDiff(before, after)}
      </div>
    </motion.div>
  );
}

// Interactive component for MDX
export function UpdatingStateInteractive() {
  const [state, cubit] = useBloc(ProfileCubit);
  const [beforeState, setBeforeState] = useState<UserProfile | null>(null);
  const [afterState, setAfterState] = useState<UserProfile | null>(null);
  const [lastOp, setLastOp] = useState('');

  const executeOp = (op: () => void, name: string) => {
    setBeforeState({ ...state });
    op();
    setTimeout(() => {
      setAfterState(cubit.state);
      setLastOp(name);
    }, 0);
  };

  return (
    <div className="my-8 space-y-6">
      {/* Controls */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface px-4 py-5 shadow-subtle">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-sky-400/15 via-transparent to-brand/25 opacity-90" />
          <h4 className="relative text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            emit() operations
          </h4>
          <div className="relative space-y-2">
            <Button
              onClick={() => executeOp(cubit.loadNewProfile, 'emit()')}
              variant="primary"
              size="sm"
              className="w-full"
            >
              Load New Profile (emit)
            </Button>
            <Button
              onClick={() => executeOp(cubit.reset, 'emit()')}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Reset (emit)
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Replaces entire state with new object
            </p>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface px-4 py-5 shadow-subtle">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-fuchsia-400/15 via-transparent to-purple-500/20 opacity-90" />
          <h4 className="relative text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            patch() operations
          </h4>
          <div className="relative space-y-2">
            <Button
              onClick={() =>
                executeOp(() => cubit.updateName('Charlie'), 'patch()')
              }
              variant="primary"
              size="sm"
              className="w-full"
            >
              Update Name (patch)
            </Button>
            <Button
              onClick={() => executeOp(() => cubit.updateAge(30), 'patch()')}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Update Age (patch)
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Only updates specified fields
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {beforeState && afterState && lastOp && (
          <DiffDisplay
            before={beforeState}
            after={afterState}
            operation={lastOp}
          />
        )}
      </AnimatePresence>

      {!beforeState && (
        <div className="rounded-3xl border border-dashed border-border/60 bg-surface px-4 py-6 text-center text-sm text-muted-foreground shadow-subtle">
          Click a button above to see how emit() and patch() differ
        </div>
      )}

      <div className="my-8">
        <StateViewer bloc={ProfileCubit} title="Current Profile State" />
      </div>
    </div>
  );
}
