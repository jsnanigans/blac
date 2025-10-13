import { useState } from 'react';
import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { Button } from '@/ui/Button';
import { DemoArticle } from '@/components/demo-article/DemoArticle';
import { ArticleSection, SectionHeader } from '@/components/demo-article/ArticleSection';
import { Prose } from '@/components/demo-article/Prose';
import { CodePanel } from '@/components/demo-article/CodePanel';
import { StateViewer } from '@/components/shared/StateViewer';
import { ComparisonPanel } from '@/components/shared/ComparisonPanel';
import { WarningCallout, TipCallout, InfoCallout } from '@/components/shared/ConceptCallout';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

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

  // WRONG way to update nested field
  toggleThemeWrong = () => {
    this.patch({
      preferences: {
        theme: this.state.preferences.theme === 'light' ? 'dark' : 'light',
      } as any, // This loses notifications!
    });
  };

  // CORRECT way to update nested field
  toggleThemeCorrect = () => {
    this.patch({
      preferences: {
        ...this.state.preferences,
        theme: this.state.preferences.theme === 'light' ? 'dark' : 'light',
      },
    });
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
      <div key={key} className="flex items-center gap-2 py-1">
        <span className="text-muted-foreground w-24">{key}:</span>
        {removed && (
          <span className="line-through text-red-500">{JSON.stringify(beforeVal)}</span>
        )}
        {!removed && (
          <>
            {changed && (
              <>
                <span className="line-through text-red-500/60">
                  {JSON.stringify(beforeVal)}
                </span>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </>
            )}
            <span className={changed ? 'text-green-600 font-semibold' : ''}>
              {JSON.stringify(afterVal)}
            </span>
          </>
        )}
      </div>
    );
  };

  const renderDiff = (obj1: any, obj2: any, path = '') => {
    const keys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);

    return Array.from(keys).map((key) => {
      const val1 = obj1?.[key];
      const val2 = obj2?.[key];

      if (typeof val1 === 'object' && typeof val2 === 'object' && !Array.isArray(val1)) {
        return (
          <div key={key} className="ml-4 mt-2">
            <div className="font-semibold text-sm text-foreground mb-1">{key}:</div>
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
      className="p-4 rounded-lg bg-muted/50 border border-border"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="px-2 py-1 rounded bg-concept-cubit text-white text-xs font-semibold">
          {operation}
        </span>
        <span className="text-sm text-muted-foreground">State Changes</span>
      </div>
      <div className="font-mono text-sm">{renderDiff(before, after)}</div>
    </motion.div>
  );
}

// Interactive comparison demo
function InteractiveComparison() {
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
    <div className="space-y-6">
      {/* Controls */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* emit() operations */}
        <div className="p-4 rounded-lg bg-concept-cubit/10 border-2 border-concept-cubit/30">
          <h4 className="font-semibold text-concept-cubit mb-3">emit() Operations</h4>
          <div className="space-y-2">
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

        {/* patch() operations */}
        <div className="p-4 rounded-lg bg-semantic-success-light/30 border-2 border-semantic-success">
          <h4 className="font-semibold text-semantic-success-dark mb-3">patch() Operations</h4>
          <div className="space-y-2">
            <Button
              onClick={() => executeOp(() => cubit.updateName('Charlie'), 'patch()')}
              variant="primary"
              size="sm"
              className="w-full bg-semantic-success hover:bg-semantic-success-dark"
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
            <p className="text-xs text-muted-foreground mt-2">Only updates specified fields</p>
          </div>
        </div>
      </div>

      {/* Diff display */}
      <AnimatePresence mode="wait">
        {beforeState && afterState && lastOp && (
          <DiffDisplay before={beforeState} after={afterState} operation={lastOp} />
        )}
      </AnimatePresence>

      {!beforeState && (
        <div className="p-4 text-center text-muted-foreground bg-muted/30 rounded-lg border border-dashed border-border">
          Click a button above to see how emit() and patch() differ
        </div>
      )}
    </div>
  );
}

// Demo metadata
const demoMetadata = {
  id: 'updating-state',
  title: 'Updating State: emit() vs patch()',
  description:
    'Learn the two ways to update state in BlaC and when to use each one. Master emit() for full replacements and patch() for partial updates.',
  category: '01-fundamentals',
  difficulty: 'beginner' as const,
  tags: ['cubit', 'emit', 'patch', 'state-updates'],
  estimatedTime: 8,
  learningPath: {
    previous: 'reading-state',
    next: 'multiple-components',
    sequence: 3,
  },
  theme: {
    primaryColor: '#3b82f6',
    accentColor: '#10b981',
  },
};

// Main demo component
export function UpdatingStateDemo() {
  return (
    <DemoArticle metadata={demoMetadata} showBlocGraph={true}>
      {/* Introduction */}
      <ArticleSection theme="cubit" id="introduction">
        <Prose>
          <h2>Two Ways to Update State</h2>
          <p>
            In BlaC, you have two methods to update state: <code>emit()</code> and{' '}
            <code>patch()</code>. They look similar but behave very differently. Understanding
            when to use each one is key to mastering BlaC.
          </p>
          <p>
            Think of <code>emit()</code> as <strong>"replace everything"</strong> and{' '}
            <code>patch()</code> as <strong>"update specific fields"</strong>.
          </p>
        </Prose>

        <TipCallout title="Quick Summary">
          <ul>
            <li>
              <strong>emit()</strong>: Replaces the entire state object. You must provide all
              fields.
            </li>
            <li>
              <strong>patch()</strong>: Merges new values with existing state. Only provide fields
              you want to change.
            </li>
          </ul>
        </TipCallout>
      </ArticleSection>

      {/* Interactive Demo */}
      <ArticleSection id="demo">
        <SectionHeader>See The Difference</SectionHeader>
        <Prose>
          <p>
            Try both operations below. Watch how <code>emit()</code> replaces everything while{' '}
            <code>patch()</code> only updates specific fields.
          </p>
        </Prose>

        <div className="my-8">
          <InteractiveComparison />
        </div>

        <div className="my-8">
          <StateViewer bloc={ProfileCubit} title="Current Profile State" />
        </div>
      </ArticleSection>

      {/* emit() Deep Dive */}
      <ArticleSection theme="cubit" id="emit">
        <SectionHeader>emit(): Complete Replacement</SectionHeader>
        <Prose>
          <p>
            <code>emit()</code> replaces the <strong>entire state</strong> with a new object. You
            must provide all fields, even if they haven't changed.
          </p>
        </Prose>

        <CodePanel
          code={`class ProfileCubit extends Cubit<UserProfile> {
  loadNewProfile = () => {
    this.emit({
      name: 'Bob',         // Must provide all fields
      age: 35,
      email: 'bob@example.com',
      preferences: {
        theme: 'dark',
        notifications: false,
      },
    });
  };

  reset = () => {
    this.emit(initialState); // Perfect for resets!
  };
}`}
          language="typescript"
          title="Using emit()"
          showLineNumbers={true}
          highlightLines={[3, 13]}
          lineLabels={{
            3: 'Complete state object required',
            13: 'Great for resetting to defaults',
          }}
        />

        <Prose>
          <h3>When to use emit()</h3>
          <ul>
            <li>
              <strong>Loading data from API</strong>: When you receive a complete new state object
            </li>
            <li>
              <strong>Resetting state</strong>: Return to initial or default values
            </li>
            <li>
              <strong>Complete transformations</strong>: When you're rebuilding the entire state
            </li>
          </ul>
        </Prose>
      </ArticleSection>

      {/* patch() Deep Dive */}
      <ArticleSection theme="success" id="patch">
        <SectionHeader>patch(): Partial Updates</SectionHeader>
        <Prose>
          <p>
            <code>patch()</code> performs a <strong>shallow merge</strong>. It only updates the
            fields you specify, leaving everything else unchanged.
          </p>
        </Prose>

        <CodePanel
          code={`class ProfileCubit extends Cubit<UserProfile> {
  updateName = (name: string) => {
    this.patch({ name }); // Only updates name
    // age, email, preferences stay the same
  };

  updateAge = (age: number) => {
    this.patch({ age }); // Only updates age
  };

  updateMultiple = () => {
    this.patch({
      name: 'Charlie',
      age: 30,
    }); // Updates multiple fields
  };
}`}
          language="typescript"
          title="Using patch()"
          showLineNumbers={true}
          highlightLines={[3, 8, 12]}
          lineLabels={{
            3: 'Only specify what changes',
            8: 'Other fields untouched',
            12: 'Can update multiple fields',
          }}
        />

        <Prose>
          <h3>When to use patch()</h3>
          <ul>
            <li>
              <strong>Form inputs</strong>: Update individual fields as user types
            </li>
            <li>
              <strong>Toggles and flags</strong>: Change single boolean or status values
            </li>
            <li>
              <strong>Incremental updates</strong>: Modify specific properties without touching
              others
            </li>
          </ul>
        </Prose>
      </ArticleSection>

      {/* Nested Objects Warning */}
      <ArticleSection theme="danger" id="nested-warning">
        <SectionHeader>⚠️ Important: patch() is Shallow</SectionHeader>
        <Prose>
          <p>
            This is the most common mistake with <code>patch()</code>: it only merges at the{' '}
            <strong>top level</strong>. For nested objects, you need to use the spread operator.
          </p>
        </Prose>

        <ComparisonPanel>
          <ComparisonPanel.Left title="❌ Wrong" color="danger">
            <CodePanel
              code={`// This LOSES notifications!
this.patch({
  preferences: {
    theme: 'dark',
    // notifications is now undefined!
  }
});`}
              language="typescript"
              showLineNumbers={false}
            />
            <WarningCallout title="Data Loss!">
              <p>
                This replaces the entire <code>preferences</code> object, losing the{' '}
                <code>notifications</code> field.
              </p>
            </WarningCallout>
          </ComparisonPanel.Left>

          <ComparisonPanel.Right title="✅ Correct" color="success">
            <CodePanel
              code={`// Spread to preserve other fields
this.patch({
  preferences: {
    ...this.state.preferences,
    theme: 'dark',
    // notifications preserved!
  }
});`}
              language="typescript"
              showLineNumbers={false}
            />
            <TipCallout title="Always Spread">
              <p>
                Use the spread operator <code>...</code> to keep existing nested fields intact.
              </p>
            </TipCallout>
          </ComparisonPanel.Right>
        </ComparisonPanel>
      </ArticleSection>

      {/* Side-by-Side Comparison */}
      <ArticleSection theme="info" id="comparison">
        <SectionHeader>Quick Reference</SectionHeader>

        <ComparisonPanel orientation="vertical">
          <ComparisonPanel.Left title="emit()" color="cubit">
            <Prose size="sm">
              <ul>
                <li>✅ Replaces entire state</li>
                <li>✅ Must provide all fields</li>
                <li>✅ Perfect for resets</li>
                <li>✅ Good for API loads</li>
                <li>❌ Verbose for small changes</li>
              </ul>
            </Prose>
          </ComparisonPanel.Left>

          <ComparisonPanel.Right title="patch()" color="success">
            <Prose size="sm">
              <ul>
                <li>✅ Updates specific fields</li>
                <li>✅ Only provide changed fields</li>
                <li>✅ Perfect for forms</li>
                <li>✅ Good for toggles</li>
                <li>⚠️ Shallow merge only</li>
              </ul>
            </Prose>
          </ComparisonPanel.Right>
        </ComparisonPanel>
      </ArticleSection>

      {/* Key Takeaways */}
      <ArticleSection theme="success" id="takeaways">
        <SectionHeader>Key Takeaways</SectionHeader>
        <Prose>
          <ul>
            <li>
              <strong>emit()</strong> replaces everything—great for resets and complete updates
            </li>
            <li>
              <strong>patch()</strong> merges at top level—perfect for individual field updates
            </li>
            <li>
              <strong>Nested objects need spreading</strong> with patch() to preserve other fields
            </li>
            <li>
              <strong>Choose based on context</strong>: How much of the state are you changing?
            </li>
            <li>
              <strong>Both trigger re-renders</strong>: React components update automatically
            </li>
          </ul>
        </Prose>

        <InfoCallout title="Pro Tip">
          <p>
            In practice, you'll use <code>patch()</code> much more often than <code>emit()</code>.
            Most updates only change a few fields, not the entire state.
          </p>
        </InfoCallout>
      </ArticleSection>

      {/* Next Steps */}
      <ArticleSection theme="tip" id="next-steps">
        <SectionHeader>What's Next?</SectionHeader>
        <Prose>
          <p>
            Now you know how to update state! Next, you'll learn about sharing state across
            multiple components in more complex scenarios, including parent-child relationships.
          </p>
        </Prose>
      </ArticleSection>
    </DemoArticle>
  );
}
