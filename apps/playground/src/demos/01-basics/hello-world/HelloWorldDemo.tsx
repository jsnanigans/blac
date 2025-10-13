import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { DemoArticle } from '@/components/demo-article/DemoArticle';
import { ArticleSection, SectionHeader } from '@/components/demo-article/ArticleSection';
import { Prose } from '@/components/demo-article/Prose';
import { CodePanel } from '@/components/demo-article/CodePanel';
import { StateViewer } from '@/components/shared/StateViewer';
import { TipCallout } from '@/components/shared/ConceptCallout';
import { motion } from 'framer-motion';

// The simplest possible Cubit
class GreetingCubit extends Cubit<string> {
  constructor() {
    super('Hello, World!');
  }

  updateGreeting = (name: string) => {
    this.emit(`Hello, ${name}!`);
  };
}

// Simple display component
function GreetingDisplay() {
  const [greeting] = useBloc(GreetingCubit);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center p-8 rounded-xl bg-gradient-to-br from-concept-cubit/10 to-concept-cubit/5 border-2 border-concept-cubit/20"
    >
      <motion.h2
        key={greeting}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 300 }}
        className="text-4xl font-bold text-concept-cubit mb-4"
      >
        {greeting}
      </motion.h2>
      <p className="text-sm text-muted-foreground">
        Your first BlaC state, live and reactive!
      </p>
    </motion.div>
  );
}

// Demo metadata
const demoMetadata = {
  id: 'hello-world',
  title: 'Hello World',
  description:
    'The absolute simplest BlaC application. Start here if you\'re completely new to BlaC!',
  category: '01-fundamentals',
  difficulty: 'beginner' as const,
  tags: ['cubit', 'basics', 'getting-started', 'beginner'],
  estimatedTime: 3,
  learningPath: {
    next: 'simple-counter',
    sequence: 0,
  },
  theme: {
    primaryColor: '#3b82f6',
    accentColor: '#60a5fa',
  },
};

// Main demo component
export function HelloWorldDemo() {
  return (
    <DemoArticle metadata={demoMetadata} showBlocGraph={true}>
      {/* Introduction */}
      <ArticleSection theme="cubit" id="introduction">
        <Prose>
          <h2>Your First BlaC Application</h2>
          <p>
            Welcome to BlaC! This is the simplest possible state management example. If you can
            understand this, you can build anything with BlaC.
          </p>
          <p>
            We're going to create a greeting message and display it. That's it. No complex setup,
            no configuration, just pure state management.
          </p>
        </Prose>

        <TipCallout title="New to State Management?">
          <p>
            State management is just a fancy way of saying "keeping track of data that can
            change." In this demo, our data is a greeting message.
          </p>
        </TipCallout>
      </ArticleSection>

      {/* Live Demo */}
      <ArticleSection id="demo">
        <SectionHeader>See It In Action</SectionHeader>
        <Prose>
          <p>
            Below is your greeting, stored and displayed using BlaC. The state updates
            automatically when changed!
          </p>
        </Prose>

        <div className="my-8">
          <GreetingDisplay />
        </div>

        <div className="my-8">
          <StateViewer bloc={GreetingCubit} title="Current Greeting State" />
        </div>
      </ArticleSection>

      {/* The Code */}
      <ArticleSection theme="neutral" id="the-code">
        <SectionHeader>The Complete Code</SectionHeader>
        <Prose>
          <p>
            Here's all the code you need. It's just <strong>10 lines</strong> of actual code!
          </p>
        </Prose>

        <CodePanel
          code={`import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';

// 1. Define your Cubit
class GreetingCubit extends Cubit<string> {
  constructor() {
    super('Hello, World!'); // Initial state
  }
}

// 2. Use it in React
function MyComponent() {
  const [greeting] = useBloc(GreetingCubit);

  return <h1>{greeting}</h1>;
}`}
          language="tsx"
          title="HelloWorld.tsx"
          showLineNumbers={true}
          highlightLines={[5, 7, 13, 15]}
          lineLabels={{
            5: 'Your state container',
            7: 'Initial state value',
            13: 'Get the state',
            15: 'Display it!',
          }}
        />

        <Prose>
          <h3>Let's Break It Down</h3>
          <ol>
            <li>
              <strong>Create a Cubit class</strong>: This holds your state (the greeting message)
            </li>
            <li>
              <strong>Set initial state</strong>: In the constructor, pass{' '}
              <code>'Hello, World!'</code> to <code>super()</code>
            </li>
            <li>
              <strong>Use in React</strong>: Call <code>useBloc(GreetingCubit)</code> to get the
              state
            </li>
            <li>
              <strong>Display it</strong>: Use the state value like any React variable
            </li>
          </ol>

          <p>That's the entire pattern. Everything else in BlaC builds on this foundation.</p>
        </Prose>
      </ArticleSection>

      {/* What's Happening */}
      <ArticleSection theme="info" id="whats-happening">
        <SectionHeader>What's Happening?</SectionHeader>
        <Prose>
          <p>When you call useBloc:</p>
          <ol>
            <li>
              <strong>BlaC creates an instance</strong> of your Cubit (or reuses existing one)
            </li>
            <li>
              <strong>Your component subscribes</strong> to state changes
            </li>
            <li>
              <strong>React re-renders</strong> whenever the state updates
            </li>
            <li>
              <strong>Everything stays in sync</strong> automatically
            </li>
          </ol>
        </Prose>

        <TipCallout title="One Instance, Many Components">
          <p>
            By default, BlaC shares one instance of your Cubit across all components. This means
            multiple components can display the same greeting, and they'll all update together.
          </p>
        </TipCallout>
      </ArticleSection>

      {/* Key Concepts */}
      <ArticleSection theme="success" id="key-concepts">
        <SectionHeader>Key Concepts</SectionHeader>
        <Prose>
          <ul>
            <li>
              <strong>Cubit</strong>: A simple state container that holds a single value
            </li>
            <li>
              <strong>State</strong>: The data you want to keep track of (our greeting message)
            </li>
            <li>
              <strong>useBloc hook</strong>: Connects your React component to the Cubit
            </li>
            <li>
              <strong>Automatic updates</strong>: React re-renders when state changes
            </li>
          </ul>
        </Prose>
      </ArticleSection>

      {/* Next Steps */}
      <ArticleSection theme="tip" id="next-steps">
        <SectionHeader>Ready for More?</SectionHeader>
        <Prose>
          <p>Now that you understand the basics, let's make it interactive!</p>
          <p>
            In the next demo, you'll learn how to <strong>change the state</strong> by adding
            buttons and user interactions. You'll build a simple counter and see how easy it is to
            update state in BlaC.
          </p>
        </Prose>
      </ArticleSection>
    </DemoArticle>
  );
}
