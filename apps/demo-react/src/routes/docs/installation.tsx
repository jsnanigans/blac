import { createFileRoute } from '@tanstack/react-router';
import {
    DocCode,
    DocFeatureGrid,
    DocNote,
    DocSection,
} from '../../components/docs/DocComponents';

export const Route = createFileRoute('/docs/installation')({
  component: InstallationPage,
});

function InstallationPage() {
  return (
    <div className="prose prose-lg dark:prose-invert max-w-none">
      <DocSection title="Installation" tag="h1">
        <p className="text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
          Getting started with Blac is simple. This guide will walk you through
          installing and configuring the library in your project.
        </p>
      </DocSection>

      <DocSection title="Requirements">
        <p>
          Before you begin, make sure your project meets these requirements:
        </p>

        <ul className="space-y-2">
          <li className="flex items-center gap-2">
            <span className="text-green-500 dark:text-green-400">✓</span>
            <span>
              <strong>Node.js</strong> version 16 or higher
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500 dark:text-green-400">✓</span>
            <span>
              <strong>TypeScript</strong> version 5.0 or higher (recommended)
            </span>
          </li>
          <li className="flex items-center gap-2">
            <span className="text-green-500 dark:text-green-400">✓</span>
            <span>
              <strong>React</strong> version 18.0 or higher (for React
              integration)
            </span>
          </li>
        </ul>
      </DocSection>

      <DocSection title="Installation Options">
        <p>
          Blac is modular, allowing you to install only the packages you need.
          There are two main packages:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 not-prose">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 p-6 rounded-lg border border-blue-100 dark:border-blue-800">
            <h3 className="text-blue-800 dark:text-blue-300 text-lg font-bold">
              Core Package
            </h3>
            <div className="text-gray-700 dark:text-gray-300 text-sm mb-3">
              <p>
                <code>@blac/next</code> - The core state management package that
                can be used with any framework
              </p>
            </div>
            <div className="flex space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                Framework Agnostic
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                TypeScript
              </span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-900/10 dark:to-fuchsia-900/10 p-6 rounded-lg border border-purple-100 dark:border-purple-800">
            <h3 className="text-purple-800 dark:text-purple-300 text-lg font-bold">
              React Integration
            </h3>
            <div className="text-gray-700 dark:text-gray-300 text-sm mb-3">
              <p>
                <code>@blac/react</code> - React integration for Blac with hooks
                and components
              </p>
            </div>
            <div className="flex space-x-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                React
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                Hooks
              </span>
            </div>
          </div>
        </div>
      </DocSection>

      <DocSection title="1. Install Dependencies">
        <p>Choose the installation method that works best for your project:</p>

        <div className="space-y-6">
          <div>
            <h4 className="text-lg font-medium">npm</h4>
            <DocCode>
              {`# Install core package
npm install @blac/next

# If using React, also install React integration
npm install @blac/react`}
            </DocCode>
          </div>

          <div>
            <h4 className="text-lg font-medium">yarn</h4>
            <DocCode>
              {`# Install core package
yarn add @blac/next

# If using React, also install React integration
yarn add @blac/react`}
            </DocCode>
          </div>

          <div>
            <h4 className="text-lg font-medium">pnpm</h4>
            <DocCode>
              {`# Install core package
pnpm add @blac/next

# If using React, also install React integration
pnpm add @blac/react`}
            </DocCode>
          </div>
        </div>
      </DocSection>

      <DocSection title="2. TypeScript Configuration">
        <p>
          Blac is built with TypeScript and provides excellent type safety. For
          the best experience, make sure your <code>tsconfig.json</code>{' '}
          includes these recommended settings:
        </p>

        <DocCode title="tsconfig.json">
          {`{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ESNext", "DOM"],
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}`}
        </DocCode>

        <DocNote type="info">
          <p>
            While Blac works without TypeScript, using TypeScript provides
            additional benefits like autocompletion, type checking for state,
            and better IDE support.
          </p>
        </DocNote>
      </DocSection>

      <DocSection title="3. Basic Setup">
        <p>
          Here's how to set up a simple state container with Blac in a React
          application:
        </p>

        <DocCode title="counter.ts - Create a Cubit">
          {`import { Cubit } from '@blac/next';

// Create a simple counter state container
export class CounterCubit extends Cubit<number> {
  constructor() {
    super(0); // Initial state
  }

  increment = () => {
    this.emit(this.state + 1);
  }

  decrement = () => {
    this.emit(this.state - 1);
  }

  reset = () => {
    this.emit(0);
  }
}`}
        </DocCode>

        <DocCode title="CounterComponent.tsx - Use in React">
          {`import React from 'react';
import { useBloc } from '@blac/react';
import { CounterCubit } from './counter';

export function CounterComponent() {
  // Connect to the CounterCubit and get the current state
  const [count, counterCubit] = useBloc(CounterCubit);

  return (
    <div className="p-4 border rounded shadow-sm">
      <h2 className="text-lg font-bold mb-4">Counter: {count}</h2>
      <div className="flex space-x-2">
        <button 
          onClick={counterCubit.decrement}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          Decrement
        </button>
        <button
          onClick={counterCubit.reset}
          className="px-4 py-2 bg-gray-500 text-white rounded"
        >
          Reset
        </button>
        <button
          onClick={counterCubit.increment}
          className="px-4 py-2 bg-green-500 text-white rounded"
        >
          Increment
        </button>
      </div>
    </div>
  );
}`}
        </DocCode>
      </DocSection>

      <DocSection title="Optional: Additional Plugins">
        <p>
          Blac supports plugins that extend its functionality. Here are some
          popular plugins you might want to consider:
        </p>

        <DocFeatureGrid>
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-amber-600 dark:text-amber-400">
              Hydration Plugin
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Persist and rehydrate state across page reloads
            </p>
            <DocCode>{`npm install @blac/hydration-plugin`}</DocCode>
          </div>

          <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              DevTools Plugin
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Connect to Redux DevTools for debugging
            </p>
            <DocCode>{`npm install @blac/devtools-plugin`}</DocCode>
          </div>
        </DocFeatureGrid>

        <DocNote type="warning">
          <p>
            <strong>Note:</strong> Plugins are optional and can be added as
            needed. Don't over-complicate your setup with unnecessary plugins if
            you don't need their functionality.
          </p>
        </DocNote>
      </DocSection>

      <DocSection title="Next Steps">
        <p>Now that you've installed Blac, you're ready to:</p>

        <div className="not-prose grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center mb-2">
              <div className="bg-blue-100 dark:bg-blue-900/40 p-2 rounded-full mr-3">
                <svg
                  className="w-5 h-5 text-blue-500 dark:text-blue-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold">Learn Core Concepts</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Understand the fundamental building blocks of Blac and how they
              work together.
            </p>
            <a
              href="/docs/core-concepts"
              className="inline-block mt-4 text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
            >
              Read Core Concepts →
            </a>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center mb-2">
              <div className="bg-purple-100 dark:bg-purple-900/40 p-2 rounded-full mr-3">
                <svg
                  className="w-5 h-5 text-purple-500 dark:text-purple-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold">Explore Cubits</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Learn how to use Cubits for simple state management in your
              application.
            </p>
            <a
              href="/docs/blac/cubit"
              className="inline-block mt-4 text-purple-600 dark:text-purple-400 hover:underline text-sm font-medium"
            >
              Explore Cubits →
            </a>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center mb-2">
              <div className="bg-amber-100 dark:bg-amber-900/40 p-2 rounded-full mr-3">
                <svg
                  className="w-5 h-5 text-amber-500 dark:text-amber-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold">Master React Integration</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Learn how to integrate Blac with your React components
              efficiently.
            </p>
            <a
              href="/docs/blac-react/use-bloc"
              className="inline-block mt-4 text-amber-600 dark:text-amber-400 hover:underline text-sm font-medium"
            >
              Explore React Integration →
            </a>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center mb-2">
              <div className="bg-green-100 dark:bg-green-900/40 p-2 rounded-full mr-3">
                <svg
                  className="w-5 h-5 text-green-500 dark:text-green-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold">Advanced Patterns</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Explore advanced patterns and optimizations for complex
              applications.
            </p>
            <a
              href="/docs/advanced/performance"
              className="inline-block mt-4 text-green-600 dark:text-green-400 hover:underline text-sm font-medium"
            >
              Learn Advanced Techniques →
            </a>
          </div>
        </div>
      </DocSection>
    </div>
  );
}

