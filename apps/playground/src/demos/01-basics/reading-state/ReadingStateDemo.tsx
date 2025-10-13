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
      className="flex items-center gap-3 p-4 rounded-lg bg-concept-cubit/10 border border-concept-cubit/30"
    >
      <Eye className="w-5 h-5 text-concept-cubit" />
      <div>
        <p className="text-sm font-semibold text-concept-cubit">Header Component</p>
        <p className="text-foreground">{state.text}</p>
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
      className="flex items-center gap-3 p-4 rounded-lg bg-concept-bloc/10 border border-concept-bloc/30"
    >
      <Eye className="w-5 h-5 text-concept-bloc" />
      <div>
        <p className="text-sm font-semibold text-concept-bloc">Sidebar Component</p>
        <p className="text-foreground">{state.text}</p>
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
      className="flex items-center gap-3 p-4 rounded-lg bg-concept-event/10 border border-concept-event/30"
    >
      <Eye className="w-5 h-5 text-concept-event" />
      <div>
        <p className="text-sm font-semibold text-concept-event">Footer Component</p>
        <p className="text-foreground">{state.text}</p>
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
    <div className="flex flex-col gap-3 p-6 rounded-lg bg-gradient-to-br from-muted/50 to-muted/20 border border-border">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-5 h-5 text-muted-foreground" />
        <p className="font-semibold text-sm">Update Shared State</p>
      </div>
      <div className="grid grid-cols-2 gap-2">
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
  category: '01-fundamentals',
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
