import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { Button } from '@/ui/Button';
import { DemoArticle } from '@/components/demo-article/DemoArticle';
import {
  ArticleSection,
  SectionHeader,
} from '@/components/demo-article/ArticleSection';
import { Prose } from '@/components/demo-article/Prose';
import { CodePanel } from '@/components/demo-article/CodePanel';
import { StateViewer } from '@/components/shared/StateViewer';
import {
  TipCallout,
  InfoCallout,
  WarningCallout,
  ComparisonPanel,
} from '@/components/shared';
import { motion } from 'framer-motion';
import { Users, User, Share2, Lock } from 'lucide-react';

// Counter state
interface CounterState {
  count: number;
}

// Shared counter - default behavior
class SharedCounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.patch({ count: this.state.count - 1 });
  };

  reset = () => {
    this.patch({ count: 0 });
  };
}

// Isolated counter - each component gets its own
class IsolatedCounterCubit extends Cubit<CounterState> {
  static isolated = true; // This is the magic!

  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.patch({ count: this.state.count - 1 });
  };

  reset = () => {
    this.patch({ count: 0 });
  };
}

// Shared counter component
function SharedCounterCard({ label }: { label: string }) {
  const [state, cubit] = useBloc(SharedCounterCubit);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg bg-concept-cubit/10 border-2 border-concept-cubit/30"
    >
      <div className="flex items-center gap-2 mb-3">
        <Share2 className="w-4 h-4 text-concept-cubit" />
        <h4 className="font-semibold text-concept-cubit">{label}</h4>
      </div>

      <div className="text-3xl font-bold text-center my-4">{state.count}</div>

      <div className="flex gap-2">
        <Button
          onClick={cubit.decrement}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          -
        </Button>
        <Button onClick={cubit.increment} size="sm" className="flex-1">
          +
        </Button>
        <Button onClick={cubit.reset} variant="ghost" size="sm">
          Reset
        </Button>
      </div>
    </motion.div>
  );
}

// Isolated counter component
function IsolatedCounterCard({ label }: { label: string }) {
  const [state, cubit] = useBloc(IsolatedCounterCubit);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg bg-concept-bloc/10 border-2 border-concept-bloc/30"
    >
      <div className="flex items-center gap-2 mb-3">
        <Lock className="w-4 h-4 text-concept-bloc" />
        <h4 className="font-semibold text-concept-bloc">{label}</h4>
      </div>

      <div className="text-3xl font-bold text-center my-4">{state.count}</div>

      <div className="flex gap-2">
        <Button
          onClick={cubit.decrement}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          -
        </Button>
        <Button onClick={cubit.increment} size="sm" className="flex-1">
          +
        </Button>
        <Button onClick={cubit.reset} variant="ghost" size="sm">
          Reset
        </Button>
      </div>
    </motion.div>
  );
}

// Demo metadata
const demoMetadata = {
  id: 'instance-management',
  title: 'Instance Management',
  description:
    'Learn the difference between shared and isolated instances. Control whether your state is shared across all components or isolated to each one.',
  category: '01-basics',
  difficulty: 'beginner' as const,
  tags: ['cubit', 'instances', 'shared', 'isolated', 'lifecycle'],
  estimatedTime: 8,
  learningPath: {
    previous: 'multiple-components',
    next: 'bloc-basics',
    sequence: 6,
  },
  theme: {
    primaryColor: '#3b82f6',
    accentColor: '#60a5fa',
  },
};

// Main demo component
export function InstanceManagementDemo() {
  return (
    <DemoArticle
      metadata={demoMetadata}
      showBlocGraph={true}
      hideNavigation={true}
    >
      {/* Introduction */}
      <ArticleSection theme="cubit" id="introduction">
        <Prose>
          <h2>Shared vs Isolated Instances</h2>
          <p>
            So far, you've seen how multiple components can share the same
            state. But sometimes you want{' '}
            <strong>multiple independent instances</strong> of the same
            Cubit—each with its own isolated state.
          </p>
          <p>
            BlaC gives you complete control over instance management with a
            simple pattern: the <code>static isolated</code> property.
          </p>
        </Prose>

        <TipCallout title="Two Instance Patterns">
          <p>
            <strong>Shared (default):</strong> One instance shared across all
            components
            <br />
            <strong>Isolated:</strong> Each component gets its own independent
            instance
          </p>
        </TipCallout>
      </ArticleSection>

      {/* Interactive Comparison */}
      <ArticleSection id="demo">
        <SectionHeader>See the Difference</SectionHeader>
        <Prose>
          <p>
            Try clicking the buttons below. The <strong>shared counters</strong>{' '}
            all stay in sync (they share one instance), while the{' '}
            <strong>isolated counters</strong> are completely independent (each
            has its own instance).
          </p>
        </Prose>

        <ComparisonPanel orientation="vertical">
          <ComparisonPanel.Left title="Shared Counters" color="cubit">
            <div className="space-y-3 mb-4">
              <SharedCounterCard label="Counter A" />
              <SharedCounterCard label="Counter B" />
              <SharedCounterCard label="Counter C" />
            </div>

            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-semibold">How it works</p>
              </div>
              <p className="text-xs text-muted-foreground">
                All three components call{' '}
                <code>useBloc(SharedCounterCubit)</code>. BlaC returns the same
                instance to all of them. When one changes, they all update.
              </p>
            </div>
          </ComparisonPanel.Left>

          <ComparisonPanel.Right title="Isolated Counters" color="bloc">
            <div className="space-y-3 mb-4">
              <IsolatedCounterCard label="Counter A" />
              <IsolatedCounterCard label="Counter B" />
              <IsolatedCounterCard label="Counter C" />
            </div>

            <div className="p-3 rounded-lg bg-muted/30 border border-border">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <p className="text-sm font-semibold">How it works</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Each component calls <code>useBloc(IsolatedCounterCubit)</code>.
                BlaC creates a new instance for each. They're completely
                independent.
              </p>
            </div>
          </ComparisonPanel.Right>
        </ComparisonPanel>

        <div className="my-8 grid md:grid-cols-2 gap-4">
          <StateViewer bloc={SharedCounterCubit} title="Shared Counter State" />
          <div className="p-4 rounded-lg bg-muted/20 border border-border">
            <p className="text-sm font-semibold mb-2">Isolated Counter State</p>
            <p className="text-xs text-muted-foreground">
              Each isolated counter has its own state that can't be viewed in a
              single StateViewer. They're truly independent!
            </p>
          </div>
        </div>

        <InfoCallout title="What's Happening?">
          <p>
            The <code>static isolated = true</code> property tells BlaC to
            create a separate instance for each component that uses it. Without
            this property, all components share the same instance.
          </p>
        </InfoCallout>
      </ArticleSection>

      {/* The Code */}
      <ArticleSection theme="neutral" id="the-code">
        <SectionHeader>How to Create Isolated Instances</SectionHeader>
        <Prose>
          <p>
            The difference between shared and isolated is just{' '}
            <strong>one line of code</strong>:
          </p>
        </Prose>

        <CodePanel
          code={`// Shared instance (default)
class SharedCounterCubit extends Cubit<CounterState> {
  // No static isolated property = shared by default
  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };
}

// Isolated instance
class IsolatedCounterCubit extends Cubit<CounterState> {
  static isolated = true; // This is the only difference!

  constructor() {
    super({ count: 0 });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };
}

// Usage is exactly the same
function MyComponent() {
  const [sharedState] = useBloc(SharedCounterCubit);
  const [isolatedState] = useBloc(IsolatedCounterCubit);

  // sharedState is the same across all components
  // isolatedState is unique to this component
}`}
          language="tsx"
          title="InstanceTypes.tsx"
          showLineNumbers={true}
          highlightLines={[3, 14, 28, 29]}
          lineLabels={{
            3: 'Shared by default',
            14: 'Makes it isolated!',
            28: 'Shared across components',
            29: 'Unique to this component',
          }}
        />
      </ArticleSection>

      {/* When to Use Each */}
      <ArticleSection theme="info" id="when-to-use">
        <SectionHeader>When to Use Shared vs Isolated</SectionHeader>

        <div className="grid md:grid-cols-2 gap-6 my-6">
          <div className="p-6 rounded-lg bg-concept-cubit/5 border-2 border-concept-cubit/30">
            <div className="flex items-center gap-2 mb-4">
              <Share2 className="w-5 h-5 text-concept-cubit" />
              <h3 className="font-semibold text-lg text-concept-cubit">
                Shared Instances
              </h3>
            </div>

            <Prose>
              <p className="text-sm mb-3">Use shared instances when:</p>
              <ul className="text-sm space-y-2">
                <li>You want global or app-wide state</li>
                <li>Multiple components need to stay synchronized</li>
                <li>
                  You have a single source of truth (user auth, theme, etc.)
                </li>
                <li>You want centralized control</li>
              </ul>

              <p className="text-sm mt-4 font-semibold">Examples:</p>
              <ul className="text-sm">
                <li>User authentication state</li>
                <li>Application theme/settings</li>
                <li>Shopping cart</li>
                <li>Notification center</li>
              </ul>
            </Prose>
          </div>

          <div className="p-6 rounded-lg bg-concept-bloc/5 border-2 border-concept-bloc/30">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-5 h-5 text-concept-bloc" />
              <h3 className="font-semibold text-lg text-concept-bloc">
                Isolated Instances
              </h3>
            </div>

            <Prose>
              <p className="text-sm mb-3">Use isolated instances when:</p>
              <ul className="text-sm space-y-2">
                <li>Each component needs its own independent state</li>
                <li>You have multiple instances of the same UI pattern</li>
                <li>You want component-local state management</li>
                <li>Instances shouldn't affect each other</li>
              </ul>

              <p className="text-sm mt-4 font-semibold">Examples:</p>
              <ul className="text-sm">
                <li>Form fields with validation</li>
                <li>Individual accordion items</li>
                <li>List items with independent controls</li>
                <li>Reusable widget components</li>
              </ul>
            </Prose>
          </div>
        </div>

        <WarningCallout title="Memory Management">
          <p>
            Isolated instances are automatically cleaned up when their
            components unmount. Shared instances persist until you manually
            dispose of them or the app closes.
          </p>
        </WarningCallout>
      </ArticleSection>

      {/* Advanced Pattern */}
      <ArticleSection theme="cubit" id="advanced">
        <SectionHeader>Advanced: Instance IDs</SectionHeader>
        <Prose>
          <p>
            You can also create isolated instances of shared Cubits by passing
            an <code>id</code> option:
          </p>
        </Prose>

        <CodePanel
          code={`// This Cubit is normally shared
class FormCubit extends Cubit<FormState> {
  constructor() {
    super({ name: '', email: '' });
  }
}

// But you can create isolated instances with IDs
function LoginForm() {
  const [state, cubit] = useBloc(FormCubit, {
    id: 'login-form' // Unique ID creates isolated instance
  });
}

function SignupForm() {
  const [state, cubit] = useBloc(FormCubit, {
    id: 'signup-form' // Different ID = different instance
  });
}

// Each form now has its own independent state!`}
          language="tsx"
          title="InstanceIds.tsx"
          showLineNumbers={true}
          highlightLines={[10, 16]}
          lineLabels={{
            10: 'Custom ID for isolation',
            16: 'Different ID = different instance',
          }}
        />

        <Prose>
          <p>
            This pattern is useful when you want{' '}
            <strong>dynamic isolation</strong>—creating instances based on
            props, routes, or user actions.
          </p>
        </Prose>
      </ArticleSection>

      {/* Key Takeaways */}
      <ArticleSection theme="success" id="takeaways">
        <SectionHeader>Key Takeaways</SectionHeader>
        <Prose>
          <ul>
            <li>
              <strong>Shared instances (default)</strong>: All components use
              the same state
            </li>
            <li>
              <strong>Isolated instances</strong>: Each component gets its own
              independent state
            </li>
            <li>
              <strong>One line difference</strong>:{' '}
              <code>static isolated = true</code>
            </li>
            <li>
              <strong>Choose based on need</strong>: Global state vs.
              component-local state
            </li>
            <li>
              <strong>Custom IDs</strong>: Create dynamic isolated instances
              when needed
            </li>
            <li>
              <strong>Automatic cleanup</strong>: Isolated instances dispose
              when components unmount
            </li>
          </ul>
        </Prose>
      </ArticleSection>

      {/* Next Steps */}
      <ArticleSection theme="tip" id="next-steps">
        <SectionHeader>What's Next?</SectionHeader>
        <Prose>
          <p>
            You now understand the fundamentals of BlaC: state, updates,
            sharing, and instance management. You're ready to move beyond
            Cubits!
          </p>
          <p>
            In the next section, you'll learn about <strong>Blocs</strong>
            —event-driven state containers that give you even more power for
            complex state logic.
          </p>
        </Prose>
      </ArticleSection>
    </DemoArticle>
  );
}
