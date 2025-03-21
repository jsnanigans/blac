import { createFileRoute } from '@tanstack/react-router'
import { DocSection, DocNote, DocCode, DocFeatureGrid, DocFeature, CyberpunkStyles } from '../../../components/docs/DocComponents'

export const Route = createFileRoute('/docs/blac-next/bloc')({
  component: BlocPage,
})

function BlocPage() {
  return (
    <div className="prose prose-lg dark:prose-invert max-w-none">
      <CyberpunkStyles />
      
      <DocSection title="Bloc" tag="h1">
        <p className="text-xl text-gray-700 dark:text-gray-300 leading-relaxed">
          A Bloc is a powerful state container in Blac that handles events and transforms them into states, providing a structured way to manage complex state logic.
        </p>
      </DocSection>

      <DocSection title="Introduction to Blocs">
        <p>
          Blocs are more advanced state containers in Blac that extend the <code>BlocBase</code> class. Unlike Cubits, which directly emit new states, 
          Blocs follow an event-driven architecture that transforms events into states. This pattern is ideal for more complex state management scenarios.
        </p>

        <DocFeatureGrid>
          <DocFeature 
            title="What is a Bloc?"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
            color="blue"
          >
            <p>
              A Bloc implements an event-driven architecture with the following components:
            </p>
            <ul className="space-y-1 list-disc pl-5">
              <li>Events - External triggers that the Bloc responds to</li>
              <li>States - Representations of application state at a specific point in time</li>
              <li>EventHandlers - Methods that process events and emit states</li>
              <li>Transitions - The process of moving from one state to another</li>
            </ul>
          </DocFeature>
          
          <DocFeature 
            title="When to Use Blocs"
            icon={
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            color="green"
          >
            <p>Blocs are ideal for:</p>
            <ul className="space-y-1 list-disc pl-5">
              <li>Complex state management with multiple transitions</li>
              <li>When actions need to trigger multiple state changes</li>
              <li>When you need predictable state transitions</li>
              <li>When you want to separate event handling from state emission</li>
              <li>Complex forms, multi-step workflows, and authentication flows</li>
            </ul>
          </DocFeature>
        </DocFeatureGrid>
      </DocSection>

      <DocSection title="Bloc vs Cubit">
        <p>
          Before diving into Blocs, it's important to understand how they differ from Cubits. Here's a comparison:
        </p>

        <div className="overflow-x-auto my-6 rounded-lg">
          <table className="min-w-full border-collapse border border-gray-200 dark:border-gray-700 rounded-lg">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Feature</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Cubit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Bloc</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Complexity</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Lower</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Higher</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">API</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Methods directly emit states</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Events are transformed into states</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Event Traceability</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Limited</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Full event history</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">State Changes</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Direct</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">In response to events</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">Recommended For</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Simple use cases</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">Complex workflows</td>
              </tr>
            </tbody>
          </table>
        </div>

        <DocNote>
          <p>
            <strong>Rule of thumb:</strong> Start with a Cubit for simplicity, and migrate to a Bloc if you need more complex state management, 
            better traceability, or event-driven architecture.
          </p>
        </DocNote>
      </DocSection>

      <DocSection title="Creating a Bloc">
        <p>
          Creating a Bloc involves defining events, states, and the logic that transforms events into states. Here's a basic example:
        </p>

        <DocCode title="Basic Bloc Example">
{`import { Bloc } from '@blac/next';

// 1. Define Events
abstract class CounterEvent {}
class IncrementPressed extends CounterEvent {}
class DecrementPressed extends CounterEvent {}
class ResetPressed extends CounterEvent {}

// 2. Define State
interface CounterState {
  count: number;
}

// 3. Create the Bloc
class CounterBloc extends Bloc<CounterEvent, CounterState> {
  constructor() {
    super({ count: 0 }); // Initial state
    
    // 4. Register event handlers
    this.on(IncrementPressed, this.increment);
    this.on(DecrementPressed, this.decrement);
    this.on(ResetPressed, this.reset);
  }

  // 5. Define event handlers
  increment = (event: IncrementPressed) => {
    this.emit({ count: this.state.count + 1 });
  }

  decrement = (event: DecrementPressed) => {
    this.emit({ count: Math.max(0, this.state.count - 1) });
  }

  reset = (event: ResetPressed) => {
    this.emit({ count: 0 });
  }
}`}
        </DocCode>

        <p className="mt-4">In this example:</p>
        <ol className="space-y-2">
          <li>We define an abstract <code>CounterEvent</code> class and concrete event classes that extend it</li>
          <li>We define a <code>CounterState</code> interface to represent the bloc's state</li>
          <li>We create a <code>CounterBloc</code> class that extends <code>Bloc&lt;CounterEvent, CounterState&gt;</code></li>
          <li>In the constructor, we register event handlers using the <code>on</code> method</li>
          <li>We implement event handler methods that process events and emit new states</li>
        </ol>
      </DocSection>

      <DocSection title="Using a Bloc in a Component">
        <p>
          Using a Bloc in a React component is similar to using a Cubit. You use the <code>useBloc</code> hook from <code>@blac/react</code>:
        </p>

        <DocCode title="Using a Bloc in a React Component">
{`import React from 'react';
import { useBloc } from '@blac/react';
import { CounterBloc, IncrementPressed, DecrementPressed, ResetPressed } from '../blocs/counter.bloc';

function Counter() {
  const [state, counterBloc] = useBloc(CounterBloc);

  return (
    <div>
      <p>Count: {state.count}</p>
      <button onClick={() => counterBloc.add(new IncrementPressed())}>+</button>
      <button onClick={() => counterBloc.add(new DecrementPressed())}>-</button>
      <button onClick={() => counterBloc.add(new ResetPressed())}>Reset</button>
    </div>
  );
}`}
        </DocCode>

        <DocNote>
          <p>
            Notice that instead of calling bloc methods directly, we use the <code>add</code> method to send events to the bloc.
            This is the key difference between using a Bloc and a Cubit.
          </p>
        </DocNote>
      </DocSection>

      <DocSection title="Advanced Event Handling">
        <p>
          One of the advantages of the Bloc pattern is the ability to handle events in more complex ways, such as:
        </p>

        <div className="space-y-8 my-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/10 dark:to-blue-800/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800/30">
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 dark:bg-blue-800/30 p-2 rounded-md mr-3">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-blue-800 dark:text-blue-300">Sequential Processing</h3>
            </div>
            <p className="mb-4">
              Events are processed one at a time in the order they are received. This is the default behavior.
            </p>
            <DocCode language="typescript" showLineNumbers={false}>
{`// Events will be processed in order
bloc.add(new FirstEvent());
bloc.add(new SecondEvent()); // Processed after FirstEvent
bloc.add(new ThirdEvent());  // Processed after SecondEvent`}
            </DocCode>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/10 dark:to-green-800/20 p-6 rounded-lg border border-green-200 dark:border-green-800/30">
            <div className="flex items-center mb-4">
              <div className="bg-green-100 dark:bg-green-800/30 p-2 rounded-md mr-3">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-green-800 dark:text-green-300">Concurrent Processing</h3>
            </div>
            <p className="mb-4">
              Enable concurrent event processing for events that don't depend on each other:
            </p>
            <DocCode language="typescript" showLineNumbers={false}>
{`class DataBloc extends Bloc<DataEvent, DataState> {
  constructor() {
    super(initialState);
    
    // Enable concurrent event processing
    this.concurrentEventProcessing = true;
    
    this.on(LoadUserEvent, this.loadUser);
    this.on(LoadPostsEvent, this.loadPosts);
  }
}`}
            </DocCode>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/10 dark:to-purple-800/20 p-6 rounded-lg border border-purple-200 dark:border-purple-800/30">
            <div className="flex items-center mb-4">
              <div className="bg-purple-100 dark:bg-purple-800/30 p-2 rounded-md mr-3">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-purple-800 dark:text-purple-300">Event Transformation</h3>
            </div>
            <p className="mb-4">
              Transform events before they're handled:
            </p>
            <DocCode language="typescript" showLineNumbers={false}>
{`class SearchBloc extends Bloc<SearchEvent, SearchState> {
  constructor() {
    super(initialState);
    
    // Transform SearchQueryChanged events
    this.transform(SearchQueryChanged, events => 
      events.pipe(
        debounceTime(300),
        distinctUntilChanged((prev, curr) => prev.query === curr.query)
      )
    );
    
    this.on(SearchQueryChanged, this.handleSearchQueryChanged);
  }
}`}
            </DocCode>
          </div>
        </div>
      </DocSection>

      <DocSection title="Complex Bloc Example">
        <p>
          Let's look at a more complex example of a Bloc for an authentication flow:
        </p>

        <DocCode title="Authentication Bloc Example">
{`import { Bloc } from '@blac/next';
import { authApi } from '../api/auth-api';

// 1. Define Events
abstract class AuthEvent {}

class LoginSubmitted extends AuthEvent {
  constructor(public username: string, public password: string) {
    super();
  }
}

class LogoutRequested extends AuthEvent {}

class SessionExpired extends AuthEvent {}

class RefreshTokenRequested extends AuthEvent {}

// 2. Define State
type AuthStatus = 'initial' | 'authenticating' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthState {
  status: AuthStatus;
  user: User | null;
  token: string | null;
  error: string | null;
}

// 3. Create the Bloc
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  constructor() {
    super({
      status: 'initial',
      user: null,
      token: null,
      error: null
    });

    // 4. Register event handlers
    this.on(LoginSubmitted, this.handleLogin);
    this.on(LogoutRequested, this.handleLogout);
    this.on(SessionExpired, this.handleSessionExpired);
    this.on(RefreshTokenRequested, this.handleRefreshToken);
    
    // 5. Check for existing session on init
    this.init();
  }
  
  private init = async () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        this.emit({ ...this.state, status: 'authenticating' });
        const user = await authApi.getUser(token);
        this.emit({
          status: 'authenticated',
          user,
          token,
          error: null
        });
      } catch (error) {
        // Token invalid or expired
        localStorage.removeItem('auth_token');
        this.emit({
          status: 'unauthenticated',
          user: null,
          token: null,
          error: null
        });
      }
    } else {
      this.emit({
        ...this.state,
        status: 'unauthenticated'
      });
    }
  }

  handleLogin = async (event: LoginSubmitted) => {
    try {
      // Update state to show loading
      this.emit({
        ...this.state,
        status: 'authenticating',
        error: null
      });

      // Perform login API call
      const { user, token } = await authApi.login(
        event.username,
        event.password
      );

      // Save token to localStorage
      localStorage.setItem('auth_token', token);

      // Update state with user data
      this.emit({
        status: 'authenticated',
        user,
        token,
        error: null
      });
    } catch (error) {
      // Handle login error
      this.emit({
        ...this.state,
        status: 'error',
        error: error instanceof Error ? error.message : 'Login failed'
      });
    }
  }

  handleLogout = () => {
    // Clear token from localStorage
    localStorage.removeItem('auth_token');
    
    // Update state to unauthenticated
    this.emit({
      status: 'unauthenticated',
      user: null,
      token: null,
      error: null
    });
  }

  handleSessionExpired = () => {
    // Clear token from localStorage
    localStorage.removeItem('auth_token');
    
    // Update state to show session expired error
    this.emit({
      status: 'unauthenticated',
      user: null,
      token: null,
      error: 'Your session has expired. Please log in again.'
    });
  }

  handleRefreshToken = async () => {
    if (!this.state.token) {
      return;
    }
    
    try {
      const { token } = await authApi.refreshToken(this.state.token);
      
      // Save new token to localStorage
      localStorage.setItem('auth_token', token);
      
      // Update state with new token
      this.emit({
        ...this.state,
        token
      });
    } catch (error) {
      // Handle refresh error - session expired
      this.add(new SessionExpired());
    }
  }
}`}
        </DocCode>

        <p className="mt-4">
          In a React application, you would use this AuthBloc like this:
        </p>

        <DocCode title="Using the Authentication Bloc">
{`import React, { useState } from 'react';
import { useBloc } from '@blac/react';
import { AuthBloc, LoginSubmitted, LogoutRequested } from '../blocs/auth.bloc';

function LoginForm() {
  const [state, authBloc] = useBloc(AuthBloc);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    authBloc.add(new LoginSubmitted(username, password));
  };

  if (state.status === 'authenticated') {
    return (
      <div>
        <p>Welcome, {state.user?.name}!</p>
        <button onClick={() => authBloc.add(new LogoutRequested())}>
          Logout
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {state.error && <div className="error">{state.error}</div>}
      
      <div className="form-group">
        <label htmlFor="username">Username</label>
        <input
          id="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={state.status === 'authenticating'}
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={state.status === 'authenticating'}
        />
      </div>
      
      <button type="submit" disabled={state.status === 'authenticating'}>
        {state.status === 'authenticating' ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}`}
        </DocCode>
      </DocSection>

      <DocSection title="Event Handling Strategies">
        <p>
          Blocs offer different strategies for handling events, depending on your needs:
        </p>

        <div className="space-y-8 my-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/10 dark:to-blue-800/20 p-6 rounded-lg border border-blue-200 dark:border-blue-800/30">
            <div className="flex items-center mb-4">
              <div className="bg-blue-100 dark:bg-blue-800/30 p-2 rounded-md mr-3">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-blue-800 dark:text-blue-300">Sequential Processing</h3>
            </div>
            <p className="mb-4">
              Events are processed one at a time in the order they are received. This is the default behavior.
            </p>
            <DocCode language="typescript" showLineNumbers={false}>
{`// Events will be processed in order
bloc.add(new FirstEvent());
bloc.add(new SecondEvent()); // Processed after FirstEvent
bloc.add(new ThirdEvent());  // Processed after SecondEvent`}
            </DocCode>
          </div>
          
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/10 dark:to-green-800/20 p-6 rounded-lg border border-green-200 dark:border-green-800/30">
            <div className="flex items-center mb-4">
              <div className="bg-green-100 dark:bg-green-800/30 p-2 rounded-md mr-3">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-green-800 dark:text-green-300">Concurrent Processing</h3>
            </div>
            <p className="mb-4">
              Enable concurrent event processing for events that don't depend on each other:
            </p>
            <DocCode language="typescript" showLineNumbers={false}>
{`class DataBloc extends Bloc<DataEvent, DataState> {
  constructor() {
    super(initialState);
    
    // Enable concurrent event processing
    this.concurrentEventProcessing = true;
    
    this.on(LoadUserEvent, this.loadUser);
    this.on(LoadPostsEvent, this.loadPosts);
  }
}`}
            </DocCode>
          </div>
          
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/10 dark:to-purple-800/20 p-6 rounded-lg border border-purple-200 dark:border-purple-800/30">
            <div className="flex items-center mb-4">
              <div className="bg-purple-100 dark:bg-purple-800/30 p-2 rounded-md mr-3">
                <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-purple-800 dark:text-purple-300">Event Transformation</h3>
            </div>
            <p className="mb-4">
              Transform events before they're handled:
            </p>
            <DocCode language="typescript" showLineNumbers={false}>
{`class SearchBloc extends Bloc<SearchEvent, SearchState> {
  constructor() {
    super(initialState);
    
    // Transform SearchQueryChanged events
    this.transform(SearchQueryChanged, events => 
      events.pipe(
        debounceTime(300),
        distinctUntilChanged((prev, curr) => prev.query === curr.query)
      )
    );
    
    this.on(SearchQueryChanged, this.handleSearchQueryChanged);
  }
}`}
            </DocCode>
          </div>
        </div>
      </DocSection>

      <DocSection title="Best Practices">
        <p>
          Here are some best practices for working with Blocs:
        </p>

        <DocFeatureGrid>
          <DocFeature 
            title="Naming Conventions"
            color="blue"
          >
            <ul className="space-y-1 list-disc pl-5">
              <li>Name event classes with verbs in past tense (e.g., <code>LoginSubmitted</code>)</li>
              <li>Name state properties with adjectives or nouns</li>
              <li>Name event handlers with the prefix "handle" (e.g., <code>handleLogin</code>)</li>
            </ul>
          </DocFeature>
          
          <DocFeature 
            title="Keep States Immutable"
            color="green"
          >
            <ul className="space-y-1 list-disc pl-5">
              <li>Always create new state objects, never modify existing ones</li>
              <li>Use the spread operator or Object.assign for partial updates</li>
              <li>Consider using libraries like Immer for complex nested state updates</li>
            </ul>
          </DocFeature>
          
          <DocFeature 
            title="Testing"
            color="purple"
          >
            <ul className="space-y-1 list-disc pl-5">
              <li>Test event handlers individually</li>
              <li>Test state transitions with sequences of events</li>
              <li>Mock dependencies (APIs, services) for predictable testing</li>
            </ul>
          </DocFeature>
          
          <DocFeature 
            title="Architecture"
            color="amber"
          >
            <ul className="space-y-1 list-disc pl-5">
              <li>Keep Blocs focused on a single concern</li>
              <li>Compose complex flows from multiple Blocs</li>
              <li>Move business logic to repositories or services, not in the Bloc</li>
            </ul>
          </DocFeature>
        </DocFeatureGrid>
      </DocSection>

      <DocSection title="Next Steps">
        <p>
          Now that you understand the basics of Blocs, you can:
        </p>
        
        <ul className="space-y-2">
          <li>Create a complex workflow using the Bloc pattern</li>
          <li>Convert existing Cubits to Blocs for more event-driven architecture</li>
          <li>Explore event transformation for more advanced patterns</li>
          <li>Check out the example applications to see Blocs in action</li>
        </ul>
        
        <DocNote>
          <p>
            Remember that Blocs are more complex than Cubits, so only use them when you need the added structure and traceability they provide.
            For simpler use cases, Cubits are often sufficient.
          </p>
        </DocNote>
      </DocSection>
    </div>
  );
} 