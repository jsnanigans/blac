import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { Button } from '@/ui/Button';
import { StateViewer } from '@/components/shared/StateViewer';
import { motion } from 'framer-motion';
import { Eye, Users } from 'lucide-react';

// Shared message state
interface MessageState {
  text: string;
  timestamp: number;
}

class MessageCubit extends Cubit<MessageState> {
  constructor() {
    super({
      text: 'Welcome to BlaC!',
      timestamp: Date.now(),
    });
  }

  updateMessage = (newText: string) => {
    this.emit({
      text: newText,
      timestamp: Date.now(),
    });
  };
}

// Different components reading the same state
function HeaderDisplay() {
  const [state] = useBloc(MessageCubit);

  return (
    <motion.div
      key={state.timestamp}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface px-4 py-4 shadow-subtle"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-sky-400/20 via-transparent to-brand/15 opacity-90" />
      <div className="relative flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-brand/10 text-brand">
          <Eye className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Header component
          </p>
          <p className="text-sm text-foreground">{state.text}</p>
        </div>
      </div>
    </motion.div>
  );
}

function SidebarDisplay() {
  const [state] = useBloc(MessageCubit);

  return (
    <motion.div
      key={state.timestamp}
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface px-4 py-4 shadow-subtle"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-fuchsia-400/18 via-transparent to-purple-500/15 opacity-90" />
      <div className="relative flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/15 text-purple-500 dark:text-purple-300">
          <Eye className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Sidebar component
          </p>
          <p className="text-sm text-foreground">{state.text}</p>
        </div>
      </div>
    </motion.div>
  );
}

function FooterDisplay() {
  const [state] = useBloc(MessageCubit);

  return (
    <motion.div
      key={state.timestamp}
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface px-4 py-4 shadow-subtle"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-amber-400/18 via-transparent to-rose-400/15 opacity-90" />
      <div className="relative flex items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/15 text-amber-500 dark:text-amber-300">
          <Eye className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Footer component
          </p>
          <p className="text-sm text-foreground">{state.text}</p>
        </div>
      </div>
    </motion.div>
  );
}

// Control panel to update the shared state
function MessageControl() {
  const [, cubit] = useBloc(MessageCubit);

  const messages = [
    'Welcome to BlaC!',
    'State management made simple',
    'One state, many components',
    'Everything stays in sync',
  ];

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface px-6 py-6 shadow-subtle">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-sky-400/10 opacity-90" />
      <div className="relative flex items-center gap-2 pb-3">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 text-brand">
          <Users className="h-5 w-5" />
        </span>
        <p className="text-sm font-semibold text-foreground">
          Update shared state
        </p>
      </div>
      <div className="relative grid grid-cols-2 gap-2">
        {messages.map((msg) => (
          <Button
            key={msg}
            onClick={() => cubit.updateMessage(msg)}
            variant="outline"
            size="sm"
            className="text-xs"
          >
            {msg}
          </Button>
        ))}
      </div>
    </div>
  );
}

// Interactive demo component (extracted from full demo article)
export function ReadingStateInteractive() {
  return (
    <div className="my-8 space-y-4">
      <HeaderDisplay />
      <SidebarDisplay />
      <FooterDisplay />
      <MessageControl />
      <div className="my-8">
        <StateViewer bloc={MessageCubit} title="Shared Message State" />
      </div>
    </div>
  );
}
