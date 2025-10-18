import { useBloc } from '@blac/react';
import { Cubit, Vertex } from '@blac/core';
import { DemoArticle } from '@/components/demo-article/DemoArticle';
import { ArticleSection, SectionHeader } from '@/components/demo-article/ArticleSection';
import { Prose } from '@/components/demo-article/Prose';
import { CodePanel } from '@/components/demo-article/CodePanel';
import { StateViewer } from '@/components/shared/StateViewer';
import { Button } from '@/ui/Button';
import { Card, CardContent } from '@/ui/Card';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { ConceptCallout } from '@/components/shared/ConceptCallout';
import confetti from 'canvas-confetti';

// ===== CUBIT IMPLEMENTATION =====
interface CounterState {
  count: number;
}

class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0 });
  }

  // Direct methods - simple and straightforward
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

// ===== BLOC IMPLEMENTATION =====

// Event classes - explicit actions
class IncrementEvent {
  constructor(public readonly amount: number = 1) {}
}

class DecrementEvent {
  constructor(public readonly amount: number = 1) {}
}

class ResetEvent {}

class CounterBloc extends Vertex<CounterState, IncrementEvent | DecrementEvent | ResetEvent> {
  constructor() {
    super({ count: 0 });

    // Register event handlers
    this.on(IncrementEvent, (event, emit) => {
      emit({ count: this.state.count + event.amount });
    });

    this.on(DecrementEvent, (event, emit) => {
      emit({ count: this.state.count - event.amount });
    });

    this.on(ResetEvent, (event, emit) => {
      emit({ count: 0 });
    });
  }

  // Helper methods dispatch events
  increment = (amount = 1) => {
    return this.add(new IncrementEvent(amount));
  };

  decrement = (amount = 1) => {
    return this.add(new DecrementEvent(amount));
  };

  reset = () => {
    return this.add(new ResetEvent());
  };
}

// ===== HELPER FUNCTIONS =====
const celebrate = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
  });
};

// ===== INTERACTIVE COMPONENTS =====
function InteractiveComparison() {
  const [activeImpl, setActiveImpl] = useState<'cubit' | 'bloc'>('cubit');
  const [cubitState, cubit] = useBloc(CounterCubit);
  const [blocState, bloc] = useBloc(CounterBloc);

  const state = activeImpl === 'cubit' ? cubitState : blocState;
  const controller = activeImpl === 'cubit' ? cubit : bloc;

  // Celebrate on milestone counts
  const handleIncrement = () => {
    controller.increment();
    const newCount = (activeImpl === 'cubit' ? cubitState.count : blocState.count) + 1;
    if (newCount > 0 && newCount % 10 === 0) {
      celebrate();
    }
  };

  return (
    <div className="space-y-6">
      {/* Implementation Switcher */}
      <div className="flex flex-col items-center gap-4 p-6 rounded-xl bg-gradient-to-br from-concept-bloc/10 to-concept-cubit/10 border-2 border-muted">
        <h3 className="text-lg font-semibold">Choose Implementation:</h3>
        <div className="flex gap-3">
          <Button
            onClick={() => setActiveImpl('cubit')}
            variant={activeImpl === 'cubit' ? 'primary' : 'outline'}
            size="lg"
          >
            Cubit (Simple)
          </Button>
          <Button
            onClick={() => setActiveImpl('bloc')}
            variant={activeImpl === 'bloc' ? 'primary' : 'outline'}
            size="lg"
          >
            Bloc (Event-Driven)
          </Button>
        </div>
      </div>

      {/* Side-by-Side Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cubit Side */}
        <div
          className={`rounded-xl border-2 p-6 transition-opacity ${
            activeImpl === 'cubit'
              ? 'border-concept-cubit bg-gradient-to-br from-concept-cubit/10 to-concept-cubit/5'
              : 'opacity-50 border-muted'
          }`}
        >
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-semibold">Cubit</h3>
              <span className="text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full">
                Simple
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Direct method calls</p>
          </div>

          <div className="text-center mb-8">
            <motion.div
              key={cubitState.count}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="text-7xl font-bold text-concept-cubit"
            >
              {cubitState.count}
            </motion.div>
          </div>

          <div className="flex justify-center gap-3 mb-6">
            <Button onClick={cubit.decrement} variant="outline" disabled={activeImpl !== 'cubit'}>
              -
            </Button>
            <Button onClick={cubit.reset} variant="ghost" disabled={activeImpl !== 'cubit'}>
              Reset
            </Button>
            <Button
              onClick={() => {
                cubit.increment();
                if ((cubitState.count + 1) % 10 === 0 && cubitState.count + 1 > 0) {
                  celebrate();
                }
              }}
              variant="primary"
              disabled={activeImpl !== 'cubit'}
            >
              +
            </Button>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-xs font-mono">
            <div className="text-muted-foreground mb-2">// Usage:</div>
            <div>cubit.increment()</div>
            <div>cubit.decrement()</div>
            <div>cubit.reset()</div>
          </div>
        </div>

        {/* Bloc Side */}
        <div
          className={`rounded-xl border-2 p-6 transition-opacity ${
            activeImpl === 'bloc'
              ? 'border-concept-bloc bg-gradient-to-br from-concept-bloc/10 to-concept-bloc/5'
              : 'opacity-50 border-muted'
          }`}
        >
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-semibold">Bloc</h3>
              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full">
                Event-Driven
              </span>
            </div>
            <p className="text-sm text-muted-foreground">Events trigger state changes</p>
          </div>

          <div className="text-center mb-8">
            <motion.div
              key={blocState.count}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              className="text-7xl font-bold text-concept-bloc"
            >
              {blocState.count}
            </motion.div>
          </div>

          <div className="flex justify-center gap-3 mb-6">
            <Button onClick={() => bloc.decrement()} variant="outline" disabled={activeImpl !== 'bloc'}>
              -
            </Button>
            <Button onClick={() => bloc.reset()} variant="ghost" disabled={activeImpl !== 'bloc'}>
              Reset
            </Button>
            <Button
              onClick={() => {
                bloc.increment();
                if ((blocState.count + 1) % 10 === 0 && blocState.count + 1 > 0) {
                  celebrate();
                }
              }}
              variant="primary"
              disabled={activeImpl !== 'bloc'}
            >
              +
            </Button>
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-xs font-mono">
            <div className="text-muted-foreground mb-2">// Usage:</div>
            <div>bloc.add(new IncrementEvent())</div>
            <div>bloc.add(new DecrementEvent())</div>
            <div>bloc.add(new ResetEvent())</div>
          </div>
        </div>
      </div>

      {/* State Viewers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StateViewer
          bloc={CounterCubit}
          title="Cubit State"
          defaultCollapsed={false}
        />
        <StateViewer
          bloc={CounterBloc}
          title="Bloc State"
          defaultCollapsed={false}
        />
      </div>
    </div>
  );
}

// ===== DEMO METADATA =====
const demoMetadata = {
  id: 'bloc-vs-cubit',
  title: 'Bloc vs Cubit: When to Use Which?',
  description: 'Understand the differences between Blocs and Cubits and learn when to use each pattern for your state management needs.',
  category: '02-patterns',
  difficulty: 'beginner' as const,
  tags: ['bloc', 'cubit', 'comparison', 'decision-making'],
  estimatedTime: 10,
  learningPath: {
    previous: 'bloc-deep-dive',
    next: 'computed-properties',
    sequence: 3,
  },
  theme: {
    primaryColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
};

// ===== MAIN DEMO COMPONENT =====
export function BlocVsCubitDemo() {
  return (
    <DemoArticle metadata={demoMetadata} showBlocGraph={false} hideNavigation={true}>
      {/* Introduction */}
      <ArticleSection theme="bloc" id="introduction">
        <Prose>
          <h2>What's the Difference?</h2>
          <p>
            <strong>BlaC provides two ways to manage state</strong>: Cubits and Blocs. They both solve the same
            problem—managing application state—but they do it in different ways.
          </p>
          <p>
            Think of it like choosing between a car and a motorcycle. Both get you where you need to go, but one
            is simpler and more direct, while the other has more features and capabilities. Let's explore which
            one is right for your needs.
          </p>
        </Prose>
      </ArticleSection>

      {/* Interactive Comparison */}
      <ArticleSection id="comparison">
        <SectionHeader>Side-by-Side Comparison</SectionHeader>
        <Prose>
          <p>
            Switch between Cubit and Bloc implementations below to see how they differ. Both counters work
            identically from the user's perspective, but the underlying code is quite different.
          </p>
        </Prose>
        <div className="my-8">
          <InteractiveComparison />
        </div>
      </ArticleSection>

      {/* Decision Matrix */}
      <ArticleSection theme="neutral" id="decision-matrix">
        <SectionHeader>When to Use Which?</SectionHeader>
        <Prose>
          <p>
            Here's a comprehensive comparison to help you decide between Cubit and Bloc for your use cases:
          </p>
        </Prose>

        <div className="my-8">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold">Criteria</th>
                  <th className="text-left p-3 font-semibold">Cubit</th>
                  <th className="text-left p-3 font-semibold">Bloc</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="p-3 font-medium">Complexity</td>
                  <td className="p-3 text-green-600 dark:text-green-400">YES: Simpler, less boilerplate</td>
                  <td className="p-3 text-yellow-600 dark:text-yellow-400">WARNING: More setup required</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium">Traceability</td>
                  <td className="p-3 text-red-600 dark:text-red-400">NO: Direct method calls</td>
                  <td className="p-3 text-green-600 dark:text-green-400">YES: Named events, clear history</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium">Debugging</td>
                  <td className="p-3 text-yellow-600 dark:text-yellow-400">WARNING: Standard debugging</td>
                  <td className="p-3 text-green-600 dark:text-green-400">YES: Event logs, time-travel</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium">Testing</td>
                  <td className="p-3 text-green-600 dark:text-green-400">YES: Test methods directly</td>
                  <td className="p-3 text-green-600 dark:text-green-400">YES: Test events & handlers</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium">Performance</td>
                  <td className="p-3 text-green-600 dark:text-green-400">YES: Slightly faster</td>
                  <td className="p-3 text-yellow-600 dark:text-yellow-400">WARNING: Event queue overhead</td>
                </tr>
                <tr className="border-b">
                  <td className="p-3 font-medium">Use Case</td>
                  <td className="p-3">Simple state, direct updates</td>
                  <td className="p-3">Complex logic, need tracking</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </ArticleSection>

      {/* Code Comparison */}
      <ArticleSection theme="cubit" id="code-comparison">
        <SectionHeader>Code Comparison</SectionHeader>
        <Prose>
          <p>
            Let's look at the actual implementation differences. Notice how Cubit is more concise,
            while Bloc is more explicit about what's happening:
          </p>
        </Prose>

        <div className="my-8 space-y-6">
          <div>
            <h4 className="text-lg font-semibold mb-4 text-concept-cubit">Cubit Implementation</h4>
            <CodePanel
              code={`class CounterCubit extends Cubit<CounterState> {
  constructor() {
    super({ count: 0 });
  }

  // Direct methods - simple and straightforward
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

// Usage
const [state, cubit] = useBloc(CounterCubit);
cubit.increment(); // Direct call`}
              language="typescript"
              highlightLines={[7, 8, 9, 20]}
              lineLabels={{
                2: 'Initialize with default state',
                7: 'Direct state update with patch()',
                20: 'Simple, direct method invocation',
              }}
            />
          </div>

          <div>
            <h4 className="text-lg font-semibold mb-4 text-concept-bloc">Bloc Implementation</h4>
            <CodePanel
              code={`// Event classes - explicit actions
class IncrementEvent {
  constructor(public readonly amount: number = 1) {}
}
class DecrementEvent {
  constructor(public readonly amount: number = 1) {}
}
class ResetEvent {}

class CounterBloc extends Vertex<CounterState, Events> {
  constructor() {
    super({ count: 0 });

    // Register event handlers
    this.on(IncrementEvent, (event, emit) => {
      emit({ count: this.state.count + event.amount });
    });

    this.on(DecrementEvent, (event, emit) => {
      emit({ count: this.state.count - event.amount });
    });

    this.on(ResetEvent, (event, emit) => {
      emit({ count: 0 });
    });
  }

  // Helper methods dispatch events
  increment = (amount = 1) => {
    return this.add(new IncrementEvent(amount));
  };
}

// Usage
const [state, bloc] = useBloc(CounterBloc);
bloc.add(new IncrementEvent()); // Explicit event`}
              language="typescript"
              highlightLines={[2, 15, 16, 30, 36]}
              lineLabels={{
                2: 'Events are first-class objects',
                15: 'Event handlers define state transitions',
                30: 'Helper methods create and dispatch events',
                36: 'Events can be logged and replayed',
              }}
            />
          </div>
        </div>
      </ArticleSection>

      {/* Decision Guide */}
      <ArticleSection theme="info" id="decision-guide">
        <SectionHeader>Decision Guide</SectionHeader>
        <Prose>
          <p>
            Still not sure which to choose? Here's a practical guide based on real-world scenarios:
          </p>
        </Prose>

        <div className="my-8 space-y-4">
          <ConceptCallout
            type="tip"
            title="Choose Cubit When:"
          >
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Simple state management (forms, toggles, counters)</li>
              <li>Direct, synchronous updates are sufficient</li>
              <li>No need for event tracking or history</li>
              <li>Prototyping or building small features</li>
              <li>Performance is absolutely critical</li>
            </ul>
            <p className="mt-3 text-sm font-semibold">
              Example: A search filter component, theme toggle, or pagination state
            </p>
          </ConceptCallout>

          <ConceptCallout
            type="tip"
            title="Choose Bloc When:"
          >
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Complex business logic with multiple steps</li>
              <li>Need event tracing, logging, or analytics</li>
              <li>Time-travel debugging would be valuable</li>
              <li>Multiple triggers for the same state change</li>
              <li>Need to replay or test event sequences</li>
            </ul>
            <p className="mt-3 text-sm font-semibold">
              Example: Authentication flow, shopping cart, or multi-step form wizard
            </p>
          </ConceptCallout>

          <ConceptCallout
            type="success"
            title="Pro Tip: Start Simple, Evolve When Needed"
          >
            <p className="text-sm">
              Start with Cubit for simplicity. You can always migrate to Bloc later when you need event
              tracking or complex logic. Since they share the same API (<code>useBloc</code> hook),
              migration is straightforward—just change the implementation, not the usage!
            </p>
          </ConceptCallout>
        </div>
      </ArticleSection>

      {/* Key Takeaways */}
      <ArticleSection theme="success" id="takeaways">
        <SectionHeader>Key Takeaways</SectionHeader>
        <Prose>
          <ul>
            <li>
              <strong>Cubit is simpler</strong>: Less code, direct method calls, perfect for straightforward state
            </li>
            <li>
              <strong>Bloc is more powerful</strong>: Event-driven, traceable, better for complex business logic
            </li>
            <li>
              <strong>Both are equally valid</strong>: Choose based on your needs, not on "best practices"
            </li>
            <li>
              <strong>Migration is easy</strong>: The same React API works with both, so you can change your mind later
            </li>
            <li>
              <strong>Performance difference is minimal</strong>: Don't choose based on performance unless you're
              building something extremely performance-critical
            </li>
          </ul>
        </Prose>
      </ArticleSection>

      {/* Next Steps */}
      <ArticleSection theme="neutral" id="next-steps">
        <SectionHeader>Next Steps</SectionHeader>
        <Prose>
          <p>
            Now that you understand the trade-offs between Cubit and Bloc, you're ready to make informed
            decisions about your state management architecture. Here's what to explore next:
          </p>
          <ul>
            <li>
              <strong>Computed Properties</strong>: Learn how to derive values from your state efficiently
            </li>
            <li>
              <strong>State Composition</strong>: Discover how to combine multiple Blocs and Cubits
            </li>
            <li>
              <strong>Testing Strategies</strong>: Master testing patterns for both approaches
            </li>
          </ul>
          <p className="mt-4">
            Remember: <strong>most applications benefit from using both patterns</strong>. Use Cubit for simple
            state and Bloc for complex flows. There's no need to choose just one!
          </p>
        </Prose>
      </ArticleSection>
    </DemoArticle>
  );
}

// Export code for display
export const blocVsCubitDemoCode = `
// ===== CUBIT: Simple and Direct =====
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
}

// ===== BLOC: Event-Driven and Traceable =====
class IncrementEvent {
  constructor(public readonly amount: number = 1) {}
}

class CounterBloc extends Vertex<CounterState, IncrementEvent> {
  constructor() {
    super({ count: 0 });

    this.on(IncrementEvent, (event, emit) => {
      emit({ count: this.state.count + event.amount });
    });
  }

  increment = (amount = 1) => {
    return this.add(new IncrementEvent(amount));
  };
}

// ===== USAGE: Same API for Both =====
function Counter() {
  // Can use either Cubit or Bloc with the same hook!
  const [state, controller] = useBloc(CounterCubit);
  // OR
  // const [state, controller] = useBloc(CounterBloc);

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={controller.increment}>+</button>
    </div>
  );
}
`;