import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { Button } from '@/ui/Button';
import { DemoArticle } from '@/components/demo-article/DemoArticle';
import { ArticleSection, SectionHeader } from '@/components/demo-article/ArticleSection';
import { Prose } from '@/components/demo-article/Prose';
import { CodePanel } from '@/components/demo-article/CodePanel';
import { StateViewer } from '@/components/shared/StateViewer';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';

// Counter state and Cubit
interface CounterState {
  count: number;
}

class CounterCubit extends Cubit<CounterState> {
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
    this.emit({ count: 0 });
  };
}

// Celebration trigger for milestone counts
const celebrate = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
  });
};

// Interactive counter component
function InteractiveCounter() {
  const [state, cubit] = useBloc(CounterCubit);

  const handleIncrement = () => {
    cubit.increment();
    // Celebrate milestones
    if ((state.count + 1) % 10 === 0) {
      celebrate();
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-8 rounded-xl bg-gradient-to-br from-concept-cubit/10 to-concept-cubit/5 border-2 border-concept-cubit/20">
      {/* Count Display */}
      <motion.div
        key={state.count}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        className="text-8xl font-bold text-concept-cubit"
      >
        {state.count}
      </motion.div>

      {/* Control Buttons */}
      <div className="flex gap-3">
        <Button onClick={cubit.decrement} variant="outline" size="lg">
          Decrement
        </Button>
        <Button onClick={cubit.reset} variant="muted" size="lg">
          Reset
        </Button>
        <Button onClick={handleIncrement} variant="primary" size="lg">
          Increment
        </Button>
      </div>

      {/* Milestone hint */}
      {state.count % 10 !== 0 && state.count > 0 && (
        <p className="text-sm text-muted-foreground">
          {10 - (state.count % 10)} more to reach {Math.floor(state.count / 10 + 1) * 10}! 🎉
        </p>
      )}
    </div>
  );
}

// Demo metadata
const demoMetadata = {
  id: 'simple-counter',
  title: 'Simple Counter',
  description:
    'Your first BlaC application: a simple counter that demonstrates the core concepts of state management with Cubits.',
  category: '01-fundamentals',
  difficulty: 'beginner' as const,
  tags: ['cubit', 'state', 'basics', 'getting-started'],
  estimatedTime: 5,
  learningPath: {
    next: 'reading-state',
    sequence: 1,
  },
  theme: {
    primaryColor: '#3b82f6',
    accentColor: '#60a5fa',
  },
};

// Demo component
export function CounterDemo() {
  return (
    <DemoArticle metadata={demoMetadata} showBlocGraph={true}>
      {/* Introduction */}
      <ArticleSection theme="cubit" id="introduction">
        <Prose>
          <h2>Welcome to BlaC!</h2>
          <p>
            Let's start with the simplest possible state management example: a counter. This demo
            will teach you the fundamental concepts of BlaC through hands-on interaction.
          </p>
          <p>
            A <strong>Cubit</strong> is the simplest form of state management in BlaC. It holds
            state and provides methods to update that state. That's it!
          </p>
        </Prose>
      </ArticleSection>

      {/* Interactive Demo */}
      <ArticleSection id="demo">
        <SectionHeader>Try It Yourself</SectionHeader>
        <Prose>
          <p>
            Click the buttons below to see state management in action. The counter updates
            immediately, and you'll see the state visualized in real-time below the demo.
          </p>
          <p className="text-sm text-muted-foreground italic">
            💡 Tip: Try reaching a multiple of 10 for a surprise!
          </p>
        </Prose>

        <div className="my-8">
          <InteractiveCounter />
        </div>

        <div className="my-8">
          <StateViewer bloc={CounterCubit} title="Live Counter State" />
        </div>
      </ArticleSection>

      {/* Implementation */}
      <ArticleSection theme="neutral" id="implementation">
        <SectionHeader>How It Works</SectionHeader>
        <Prose>
          <p>
            Let's look at the code behind this counter. First, we define our state interface and
            create a Cubit class:
          </p>
        </Prose>

        <CodePanel
          code={`interface CounterState {
  count: number;
}

class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0 }); // Initial state
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };

  decrement = () => {
    this.patch({ count: this.state.count - 1 });
  };

  reset = () => {
    this.emit({ count: 0 });
  };
}`}
          language="typescript"
          title="CounterCubit.ts"
          showLineNumbers={true}
          highlightLines={[2, 6, 10, 14, 18]}
          lineLabels={{
            2: 'Define your state shape',
            6: 'Initialize with default state',
            10: 'Update state with patch()',
            14: 'patch() merges partial state',
            18: 'emit() replaces entire state',
          }}
        />

        <Prose>
          <h3>Key Concepts</h3>
          <ul>
            <li>
              <strong>State Interface</strong>: Define the shape of your state with TypeScript
            </li>
            <li>
              <strong>Constructor</strong>: Initialize your Cubit with a default state
            </li>
            <li>
              <strong>Arrow Functions</strong>: Use arrow functions for methods (required for
              React)
            </li>
            <li>
              <strong>patch()</strong>: Update part of the state (shallow merge)
            </li>
            <li>
              <strong>emit()</strong>: Replace the entire state with a new value
            </li>
          </ul>
        </Prose>
      </ArticleSection>

      {/* React Integration */}
      <ArticleSection theme="cubit" id="react-integration">
        <SectionHeader>Using in React</SectionHeader>
        <Prose>
          <p>
            Connecting your Cubit to a React component is simple with the <code>useBloc</code>{' '}
            hook:
          </p>
        </Prose>

        <CodePanel
          code={`function CounterDemo() {
  const [state, cubit] = useBloc(CounterCubit);

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={cubit.increment}>+</button>
      <button onClick={cubit.decrement}>-</button>
      <button onClick={cubit.reset}>Reset</button>
    </div>
  );
}`}
          language="tsx"
          title="CounterDemo.tsx"
          showLineNumbers={true}
          highlightLines={[2, 6, 7]}
          lineLabels={{
            2: 'useBloc returns [state, instance]',
            6: 'Access state properties directly',
            7: 'Call methods on the instance',
          }}
        />

        <Prose>
          <p>
            The <code>useBloc</code> hook does two things:
          </p>
          <ol>
            <li>
              Creates or retrieves an instance of your Cubit (by default, instances are shared
              across components)
            </li>
            <li>Subscribes to state changes and re-renders when state updates</li>
          </ol>
        </Prose>
      </ArticleSection>

      {/* Key Takeaways */}
      <ArticleSection theme="success" id="takeaways">
        <SectionHeader>Key Takeaways</SectionHeader>
        <Prose>
          <ul>
            <li>
              <strong>Cubits are simple</strong>: Just a class that holds state and provides
              methods to update it
            </li>
            <li>
              <strong>Type-safe</strong>: Define your state shape with TypeScript interfaces
            </li>
            <li>
              <strong>React integration is easy</strong>: Use the <code>useBloc</code> hook
            </li>
            <li>
              <strong>Immediate updates</strong>: State changes trigger re-renders automatically
            </li>
            <li>
              <strong>Shared by default</strong>: One instance is shared across all components
              (you'll learn about isolated instances later)
            </li>
          </ul>
        </Prose>
      </ArticleSection>

      {/* Next Steps */}
      <ArticleSection theme="info" id="next-steps">
        <SectionHeader>Next Steps</SectionHeader>
        <Prose>
          <p>Now that you understand the basics of Cubits, you're ready to learn more!</p>
          <p>
            In the next demo, you'll learn how multiple components can read and display the same
            state, demonstrating BlaC's powerful state sharing capabilities.
          </p>
        </Prose>
      </ArticleSection>
    </DemoArticle>
  );
}

// Export code for display
export const counterDemoCode = {
  cubit: `class CounterCubit extends Cubit<CounterState> {
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
    this.emit({ count: 0 });
  };
}`,
  usage: `function CounterDemo() {
  const [state, cubit] = useBloc(CounterCubit);

  return (
    <div>
      <div>{state.count}</div>
      <button onClick={cubit.increment}>+</button>
      <button onClick={cubit.decrement}>-</button>
    </div>
  );
}`,
};
