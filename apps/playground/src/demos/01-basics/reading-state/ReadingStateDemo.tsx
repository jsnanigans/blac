import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { Button } from '@/ui/Button';
import { DemoArticle } from '@/components/demo-article/DemoArticle';
import { ArticleSection, SectionHeader } from '@/components/demo-article/ArticleSection';
import { Prose } from '@/components/demo-article/Prose';
import { CodePanel } from '@/components/demo-article/CodePanel';
import { StateViewer } from '@/components/shared/StateViewer';
import { TipCallout, InfoCallout } from '@/components/shared/ConceptCallout';
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
        <p className="text-sm font-semibold text-foreground">Update shared state</p>
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

// Demo metadata
const demoMetadata = {
  id: 'reading-state',
  title: 'Reading State',
  description:
    'Learn how multiple components can read and display the same state. See the power of shared state management!',
  category: '01-basics',
  difficulty: 'beginner' as const,
  tags: ['cubit', 'state', 'useBloc', 'shared-state'],
  estimatedTime: 5,
  learningPath: {
    previous: 'simple-counter',
    next: 'updating-state',
    sequence: 2,
  },
  theme: {
    primaryColor: '#3b82f6',
    accentColor: '#60a5fa',
  },
};

// Main demo component
export function ReadingStateDemo() {
  return (
    <DemoArticle metadata={demoMetadata} showBlocGraph={true} hideNavigation={true}>
      {/* Introduction */}
      <ArticleSection theme="cubit" id="introduction">
        <Prose>
          <h2>One State, Many Observers</h2>
          <p>
            One of BlaC's superpowers is <strong>shared state</strong>. Multiple components can
            read from the same state, and they all stay perfectly synchronized. No prop drilling,
            no context complexity—just simple, direct access.
          </p>
          <p>
            In this demo, you'll see three different components (Header, Sidebar, Footer) all
            displaying the same message. When you update the state, all three update instantly!
          </p>
        </Prose>

        <TipCallout title="The Magic of Shared State">
          <p>
            By default, BlaC creates <strong>one instance</strong> of your Cubit that's shared
            across all components. This makes state management incredibly simple—no additional
            setup required!
          </p>
        </TipCallout>
      </ArticleSection>

      {/* Interactive Demo */}
      <ArticleSection id="demo">
        <SectionHeader>Try It Yourself</SectionHeader>
        <Prose>
          <p>
            Click the buttons below to update the message. Watch how all three components update
            together, even though they're completely separate!
          </p>
        </Prose>

        <div className="my-8 space-y-4">
          <HeaderDisplay />
          <SidebarDisplay />
          <FooterDisplay />
          <MessageControl />
        </div>

        <div className="my-8">
          <StateViewer bloc={MessageCubit} title="Shared Message State" />
        </div>

        <InfoCallout title="What You're Seeing">
          <p>
            All three components (Header, Sidebar, Footer) are reading from the{' '}
            <strong>same MessageCubit instance</strong>. When the state updates, BlaC notifies all
            subscribers, and React re-renders each component automatically.
          </p>
        </InfoCallout>
      </ArticleSection>

      {/* How It Works */}
      <ArticleSection theme="neutral" id="how-it-works">
        <SectionHeader>How Does This Work?</SectionHeader>
        <Prose>
          <p>Each component uses the same simple pattern:</p>
        </Prose>

        <CodePanel
          code={`function HeaderDisplay() {
  const [state] = useBloc(MessageCubit);

  return <div>{state.text}</div>;
}

function SidebarDisplay() {
  const [state] = useBloc(MessageCubit);

  return <div>{state.text}</div>;
}

function FooterDisplay() {
  const [state] = useBloc(MessageCubit);

  return <div>{state.text}</div>;
}`}
          language="tsx"
          title="MultipleComponents.tsx"
          showLineNumbers={true}
          highlightLines={[2, 7, 12]}
          lineLabels={{
            2: 'All call the same useBloc',
            7: 'All get the same state',
            12: 'All stay synchronized',
          }}
        />

        <Prose>
          <h3>The useBloc Hook</h3>
          <p>
            Every time you call <code>useBloc(MessageCubit)</code>, BlaC:
          </p>
          <ol>
            <li>
              <strong>Finds or creates</strong> the single shared instance
            </li>
            <li>
              <strong>Subscribes</strong> your component to state changes
            </li>
            <li>
              <strong>Returns</strong> the current state
            </li>
            <li>
              <strong>Re-renders</strong> your component when state updates
            </li>
          </ol>
        </Prose>
      </ArticleSection>

      {/* The Cubit */}
      <ArticleSection theme="cubit" id="the-cubit">
        <SectionHeader>The MessageCubit</SectionHeader>
        <Prose>
          <p>Here's the Cubit that manages our shared message state:</p>
        </Prose>

        <CodePanel
          code={`interface MessageState {
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
}`}
          language="typescript"
          title="MessageCubit.ts"
          showLineNumbers={true}
          highlightLines={[1, 8, 14]}
          lineLabels={{
            1: 'Define your state shape',
            8: 'Initial state',
            14: 'Method to update state',
          }}
        />

        <Prose>
          <p>
            Notice how we use <code>emit()</code> to replace the entire state object. When we do
            this, BlaC notifies all subscribed components, triggering their re-renders.
          </p>
        </Prose>
      </ArticleSection>

      {/* Key Takeaways */}
      <ArticleSection theme="success" id="takeaways">
        <SectionHeader>Key Takeaways</SectionHeader>
        <Prose>
          <ul>
            <li>
              <strong>Shared by default</strong>: One Cubit instance is shared across all
              components
            </li>
            <li>
              <strong>Automatic synchronization</strong>: All components update together when state
              changes
            </li>
            <li>
              <strong>No prop drilling</strong>: Components can access state directly without
              passing props through layers
            </li>
            <li>
              <strong>Clean separation</strong>: State logic lives in the Cubit, UI logic in
              components
            </li>
            <li>
              <strong>Type-safe</strong>: TypeScript ensures you're accessing the right state
              properties
            </li>
          </ul>
        </Prose>
      </ArticleSection>

      {/* Next Steps */}
      <ArticleSection theme="info" id="next-steps">
        <SectionHeader>What's Next?</SectionHeader>
        <Prose>
          <p>
            You've seen how multiple components can <strong>read</strong> state. But what about
            updating it from different places?
          </p>
          <p>
            In the next demo, you'll learn about <code>emit()</code> and <code>patch()</code>—the
            two ways to update state in BlaC, and when to use each one.
          </p>
        </Prose>
      </ArticleSection>
    </DemoArticle>
  );
}
