import { useBloc } from '@blac/react';
import { Bloc } from '@blac/core';
import { Button } from '@/ui/Button';
import { DemoArticle } from '@/components/demo-article/DemoArticle';
import { ArticleSection, SectionHeader } from '@/components/demo-article/ArticleSection';
import { Prose } from '@/components/demo-article/Prose';
import { CodePanel } from '@/components/demo-article/CodePanel';
import { StateViewer } from '@/components/shared/StateViewer';
import { ConceptCallout, TipCallout, WarningCallout, InfoCallout } from '@/components/shared/ConceptCallout';
import confetti from 'canvas-confetti';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

// ============= Basic Event-Driven Counter =============
// Event classes
class IncrementEvent {
  constructor(public readonly amount: number = 1) {}
}

class DecrementEvent {
  constructor(public readonly amount: number = 1) {}
}

class ResetEvent {}

interface CounterState {
  count: number;
  history: Array<{ event: string; timestamp: number }>;
}

class EventCounterBloc extends Bloc<CounterState, IncrementEvent | DecrementEvent | ResetEvent> {
  constructor() {
    super({ count: 0, history: [] });

    this.on(IncrementEvent, (event, emit) => {
      const newHistory = [
        { event: `Increment(${event.amount})`, timestamp: Date.now() },
        ...this.state.history,
      ].slice(0, 10);

      emit({
        count: this.state.count + event.amount,
        history: newHistory,
      });
    });

    this.on(DecrementEvent, (event, emit) => {
      const newHistory = [
        { event: `Decrement(${event.amount})`, timestamp: Date.now() },
        ...this.state.history,
      ].slice(0, 10);

      emit({
        count: this.state.count - event.amount,
        history: newHistory,
      });
    });

    this.on(ResetEvent, (event, emit) => {
      const newHistory = [
        { event: 'Reset', timestamp: Date.now() },
        ...this.state.history,
      ].slice(0, 10);

      emit({
        count: 0,
        history: newHistory,
      });
    });
  }

  // Helper methods
  increment = (amount = 1) => {
    this.add(new IncrementEvent(amount));
  };

  decrement = (amount = 1) => {
    this.add(new DecrementEvent(amount));
  };

  reset = () => {
    this.add(new ResetEvent());
  };
}

// ============= Form Validation Bloc =============
// Form events
class UpdateFieldEvent {
  constructor(
    public readonly field: string,
    public readonly value: string
  ) {}
}

class ValidateFieldEvent {
  constructor(public readonly field: string) {}
}

class SubmitFormEvent {}

class ResetFormEvent {}

interface FormField {
  value: string;
  error: string | null;
  touched: boolean;
}

interface FormState {
  fields: Record<string, FormField>;
  isSubmitting: boolean;
  isValid: boolean;
  submitCount: number;
}

class FormValidationBloc extends Bloc<FormState, UpdateFieldEvent | ValidateFieldEvent | SubmitFormEvent | ResetFormEvent> {
  constructor() {
    const initialState: FormState = {
      fields: {
        email: { value: '', error: null, touched: false },
        password: { value: '', error: null, touched: false },
        confirmPassword: { value: '', error: null, touched: false },
      },
      isSubmitting: false,
      isValid: false,
      submitCount: 0,
    };

    super(initialState);

    // Update field value
    this.on(UpdateFieldEvent, (event, emit) => {
      const updatedFields = {
        ...this.state.fields,
        [event.field]: {
          ...this.state.fields[event.field],
          value: event.value,
          touched: true,
        },
      };

      // Auto-validate on change
      const error = this.validateField(event.field, event.value, updatedFields);
      updatedFields[event.field].error = error;

      emit({
        ...this.state,
        fields: updatedFields,
        isValid: this.isFormValid(updatedFields),
      });
    });

    // Validate specific field
    this.on(ValidateFieldEvent, (event, emit) => {
      const error = this.validateField(event.field, this.state.fields[event.field].value, this.state.fields);

      emit({
        ...this.state,
        fields: {
          ...this.state.fields,
          [event.field]: {
            ...this.state.fields[event.field],
            error,
            touched: true,
          },
        },
      });
    });

    // Submit form
    this.on(SubmitFormEvent, async (event, emit) => {
      // Mark as submitting
      emit({ ...this.state, isSubmitting: true });

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Success!
      emit({
        ...this.state,
        isSubmitting: false,
        submitCount: this.state.submitCount + 1,
      });
    });

    // Reset form
    this.on(ResetFormEvent, (event, emit) => {
      emit({
        fields: {
          email: { value: '', error: null, touched: false },
          password: { value: '', error: null, touched: false },
          confirmPassword: { value: '', error: null, touched: false },
        },
        isSubmitting: false,
        isValid: false,
        submitCount: this.state.submitCount,
      });
    });
  }

  private validateField(field: string, value: string, allFields: Record<string, FormField>): string | null {
    switch (field) {
      case 'email':
        if (!value) return 'Email is required';
        if (!value.includes('@')) return 'Invalid email format';
        return null;

      case 'password':
        if (!value) return 'Password is required';
        if (value.length < 8) return 'Password must be at least 8 characters';
        return null;

      case 'confirmPassword':
        if (!value) return 'Please confirm password';
        if (value !== allFields.password.value) return 'Passwords do not match';
        return null;

      default:
        return null;
    }
  }

  private isFormValid(fields: Record<string, FormField>): boolean {
    return Object.values(fields).every(field =>
      field.value && !field.error
    );
  }

  // Helper methods
  updateField = (field: string, value: string) => {
    this.add(new UpdateFieldEvent(field, value));
  };

  validateSingleField = (field: string) => {
    this.add(new ValidateFieldEvent(field));
  };

  submit = () => {
    this.add(new SubmitFormEvent());
  };

  reset = () => {
    this.add(new ResetFormEvent());
  };
}

// ============= Async Event Handling =============
// API events
class FetchDataEvent {}

class RefreshDataEvent {}

class CancelFetchEvent {}

interface Post {
  id: number;
  title: string;
  body: string;
}

interface ApiState {
  data: Post[] | null;
  loading: boolean;
  error: string | null;
  refreshing: boolean;
  fetchCount: number;
}

class AsyncEventBloc extends Bloc<ApiState, FetchDataEvent | RefreshDataEvent | CancelFetchEvent> {
  private abortController?: AbortController;

  constructor() {
    super({
      data: null,
      loading: false,
      error: null,
      refreshing: false,
      fetchCount: 0,
    });

    // Fetch data event
    this.on(FetchDataEvent, async (event, emit) => {
      // Cancel any pending request
      this.abortController?.abort();
      this.abortController = new AbortController();

      emit({
        ...this.state,
        loading: true,
        error: null,
      });

      try {
        // Simulate API delay
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(resolve, 2000);
          this.abortController?.signal.addEventListener('abort', () => {
            clearTimeout(timeout);
            reject(new Error('Request cancelled'));
          });
        });

        // Simulate random failure
        if (Math.random() > 0.7) {
          throw new Error('Network error: Failed to fetch posts');
        }

        const mockData: Post[] = [
          { id: 1, title: 'First Post', body: 'This is the first post content' },
          { id: 2, title: 'Second Post', body: 'This is the second post content' },
          { id: 3, title: 'Third Post', body: 'This is the third post content' },
        ];

        emit({
          data: mockData,
          loading: false,
          error: null,
          refreshing: false,
          fetchCount: this.state.fetchCount + 1,
        });
      } catch (error) {
        if (error instanceof Error && error.message !== 'Request cancelled') {
          emit({
            ...this.state,
            loading: false,
            refreshing: false,
            error: error.message,
          });
        }
      }
    });

    // Refresh data event (keep existing data while loading)
    this.on(RefreshDataEvent, async (event, emit) => {
      if (this.state.loading || this.state.refreshing) return;

      emit({
        ...this.state,
        refreshing: true,
        error: null,
      });

      // Reuse fetch logic
      this.add(new FetchDataEvent());
    });

    // Cancel fetch event
    this.on(CancelFetchEvent, (event, emit) => {
      this.abortController?.abort();
      emit({
        ...this.state,
        loading: false,
        refreshing: false,
      });
    });
  }

  // Helper methods
  fetchData = () => {
    this.add(new FetchDataEvent());
  };

  refreshData = () => {
    this.add(new RefreshDataEvent());
  };

  cancelFetch = () => {
    this.add(new CancelFetchEvent());
  };
}

// ============= Event Transformation (Debounce) =============
// Search events
class SearchEvent {
  constructor(public readonly query: string) {}
}

class ClearSearchEvent {}

interface SearchResult {
  id: number;
  title: string;
  match: string;
}

interface SearchState {
  query: string;
  results: SearchResult[];
  isSearching: boolean;
  searchCount: number;
}

class SearchBloc extends Bloc<SearchState, SearchEvent | ClearSearchEvent> {
  private searchTimeout?: NodeJS.Timeout;

  constructor() {
    super({
      query: '',
      results: [],
      isSearching: false,
      searchCount: 0,
    });

    // Search with debounce
    this.on(SearchEvent, async (event, emit) => {
      // Clear previous timeout
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }

      // Update query immediately
      emit({
        ...this.state,
        query: event.query,
        isSearching: event.query.length > 0,
      });

      if (event.query.length === 0) {
        emit({
          ...this.state,
          query: '',
          results: [],
          isSearching: false,
        });
        return;
      }

      // Debounce the actual search
      await new Promise<void>((resolve) => {
        this.searchTimeout = setTimeout(() => {
          resolve();
        }, 500);
      });

      // Simulate search
      await new Promise(resolve => setTimeout(resolve, 300));

      // Generate mock results
      const mockResults: SearchResult[] = event.query.length > 0 ? [
        {
          id: 1,
          title: `Result for "${event.query}"`,
          match: `Found "${event.query}" in document 1`,
        },
        {
          id: 2,
          title: `Another match for "${event.query}"`,
          match: `The term "${event.query}" appears here`,
        },
        {
          id: 3,
          title: `Best match: ${event.query}`,
          match: `Highly relevant to "${event.query}"`,
        },
      ] : [];

      emit({
        query: event.query,
        results: mockResults,
        isSearching: false,
        searchCount: this.state.searchCount + 1,
      });
    });

    // Clear search
    this.on(ClearSearchEvent, (event, emit) => {
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }

      emit({
        query: '',
        results: [],
        isSearching: false,
        searchCount: this.state.searchCount,
      });
    });
  }

  // Helper methods
  search = (query: string) => {
    this.add(new SearchEvent(query));
  };

  clear = () => {
    this.add(new ClearSearchEvent());
  };

  // Cleanup
  override async dispose() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    return super.dispose();
  }
}

// ============= Helper Functions =============
const celebrate = () => {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
  });
};

// ============= Interactive Components =============
function BasicEventDemo() {
  const [state, bloc] = useBloc(EventCounterBloc);

  const handleIncrement = () => {
    bloc.increment();
    if (state.count === 9) {
      celebrate();
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 p-8 rounded-xl bg-gradient-to-br from-concept-bloc/10 to-concept-bloc/5 border-2 border-concept-bloc/20">
      <motion.div
        key={state.count}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
        className="text-6xl font-bold text-concept-bloc"
      >
        {state.count}
      </motion.div>

      <div className="flex gap-3">
        <Button onClick={() => bloc.decrement()} variant="outline" size="lg">
          Decrement
        </Button>
        <Button onClick={() => bloc.reset()} variant="ghost" size="lg">
          Reset
        </Button>
        <Button onClick={handleIncrement} variant="primary" size="lg">
          Increment
        </Button>
      </div>

      <div className="flex gap-2">
        <Button onClick={() => bloc.increment(5)} variant="outline" size="sm">
          +5
        </Button>
        <Button onClick={() => bloc.decrement(5)} variant="outline" size="sm">
          -5
        </Button>
      </div>

      {state.history.length > 0 && (
        <div className="w-full max-w-sm">
          <h4 className="text-sm font-semibold mb-2">Event History</h4>
          <div className="space-y-1 text-xs font-mono">
            {state.history.slice(0, 5).map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex justify-between p-2 rounded bg-background/50"
              >
                <span className="text-concept-bloc">{item.event}</span>
                <span className="text-muted-foreground">
                  {new Date(item.timestamp).toLocaleTimeString()}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FormValidationDemo() {
  const [state, bloc] = useBloc(FormValidationBloc);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.isValid && !state.isSubmitting) {
      bloc.submit();
    }
  };

  useEffect(() => {
    if (state.submitCount > 0 && !state.isSubmitting) {
      celebrate();
    }
  }, [state.submitCount, state.isSubmitting]);

  return (
    <div className="p-6 rounded-xl bg-gradient-to-br from-concept-bloc/10 to-concept-bloc/5 border-2 border-concept-bloc/20">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="text"
            value={state.fields.email.value}
            onChange={(e) => bloc.updateField('email', e.target.value)}
            onBlur={() => bloc.validateSingleField('email')}
            className={`w-full px-3 py-2 border rounded-md bg-background ${
              state.fields.email.error && state.fields.email.touched
                ? 'border-semantic-danger'
                : 'border-border'
            }`}
            placeholder="user@example.com"
          />
          {state.fields.email.error && state.fields.email.touched && (
            <p className="mt-1 text-sm text-semantic-danger">{state.fields.email.error}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            type="password"
            value={state.fields.password.value}
            onChange={(e) => bloc.updateField('password', e.target.value)}
            onBlur={() => bloc.validateSingleField('password')}
            className={`w-full px-3 py-2 border rounded-md bg-background ${
              state.fields.password.error && state.fields.password.touched
                ? 'border-semantic-danger'
                : 'border-border'
            }`}
            placeholder="Min 8 characters"
          />
          {state.fields.password.error && state.fields.password.touched && (
            <p className="mt-1 text-sm text-semantic-danger">{state.fields.password.error}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Confirm Password</label>
          <input
            type="password"
            value={state.fields.confirmPassword.value}
            onChange={(e) => bloc.updateField('confirmPassword', e.target.value)}
            onBlur={() => bloc.validateSingleField('confirmPassword')}
            className={`w-full px-3 py-2 border rounded-md bg-background ${
              state.fields.confirmPassword.error && state.fields.confirmPassword.touched
                ? 'border-semantic-danger'
                : 'border-border'
            }`}
            placeholder="Re-enter password"
          />
          {state.fields.confirmPassword.error && state.fields.confirmPassword.touched && (
            <p className="mt-1 text-sm text-semantic-danger">{state.fields.confirmPassword.error}</p>
          )}
        </div>

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            disabled={!state.isValid || state.isSubmitting}
          >
            {state.isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
          <Button type="button" variant="outline" onClick={() => bloc.reset()}>
            Reset
          </Button>
        </div>

        {state.submitCount > 0 && !state.isSubmitting && (
          <p className="text-sm text-semantic-success">
            Form submitted successfully! (Count: {state.submitCount})
          </p>
        )}
      </form>
    </div>
  );
}

function AsyncEventDemo() {
  const [state, bloc] = useBloc(AsyncEventBloc);

  return (
    <div className="p-6 rounded-xl bg-gradient-to-br from-concept-bloc/10 to-concept-bloc/5 border-2 border-concept-bloc/20">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold">Async Event Handling</h4>
        <div className="flex gap-2">
          <Button
            onClick={() => bloc.fetchData()}
            variant="primary"
            size="sm"
            disabled={state.loading}
          >
            {state.loading ? 'Loading...' : 'Fetch'}
          </Button>
          <Button
            onClick={() => bloc.refreshData()}
            variant="outline"
            size="sm"
            disabled={state.loading || state.refreshing || !state.data}
          >
            {state.refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <Button
            onClick={() => bloc.cancelFetch()}
            variant="ghost"
            size="sm"
            disabled={!state.loading && !state.refreshing}
          >
            Cancel
          </Button>
        </div>
      </div>

      {(state.loading || state.refreshing) && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-concept-bloc"></div>
        </div>
      )}

      {state.error && (
        <div className="p-4 rounded bg-semantic-danger-light/30 border border-semantic-danger text-semantic-danger-dark text-sm">
          {state.error}
        </div>
      )}

      {state.data && !state.loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: state.refreshing ? 0.5 : 1 }}
          className="space-y-2"
        >
          {state.data.map(post => (
            <div key={post.id} className="p-3 rounded bg-background/50">
              <h5 className="font-medium">{post.title}</h5>
              <p className="text-sm text-muted-foreground">{post.body}</p>
            </div>
          ))}
          <p className="text-xs text-muted-foreground mt-2">
            Fetched {state.fetchCount} time(s)
          </p>
        </motion.div>
      )}

      {!state.data && !state.loading && !state.error && (
        <p className="text-center text-muted-foreground py-8">
          Click "Fetch" to load data
        </p>
      )}
    </div>
  );
}

function SearchDemo() {
  const [state, bloc] = useBloc(SearchBloc);

  return (
    <div className="p-6 rounded-xl bg-gradient-to-br from-concept-bloc/10 to-concept-bloc/5 border-2 border-concept-bloc/20">
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Search (with debounce)</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={state.query}
            onChange={(e) => bloc.search(e.target.value)}
            placeholder="Type to search (500ms debounce)..."
            className="flex-1 px-3 py-2 border rounded-md bg-background"
          />
          <Button onClick={() => bloc.clear()} variant="outline" size="sm">
            Clear
          </Button>
        </div>
      </div>

      {state.isSearching && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-concept-bloc"></div>
          Searching...
        </div>
      )}

      {state.results.length > 0 && !state.isSearching && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-2"
        >
          {state.results.map((result: SearchResult) => (
            <div key={result.id} className="p-3 rounded bg-background/50">
              <h5 className="font-medium text-sm">{result.title}</h5>
              <p className="text-xs text-muted-foreground">{result.match}</p>
            </div>
          ))}
          <p className="text-xs text-muted-foreground mt-2">
            Search executed {state.searchCount} time(s)
          </p>
        </motion.div>
      )}

      {state.query && state.results.length === 0 && !state.isSearching && (
        <p className="text-sm text-muted-foreground">No results found</p>
      )}
    </div>
  );
}

// ============= Demo Metadata =============
const demoMetadata = {
  id: 'bloc-deep-dive',
  title: 'Bloc Deep Dive',
  description: 'Master event-driven state management with Blocs: event handling, async operations, transformations, and testing patterns.',
  category: '02-core-concepts',
  difficulty: 'intermediate' as const,
  tags: ['bloc', 'events', 'async', 'patterns', 'testing'],
  estimatedTime: 20,
  learningPath: {
    previous: 'cubit-deep-dive',
    next: 'bloc-vs-cubit',
    sequence: 2,
  },
  theme: {
    primaryColor: '#8b5cf6',
    accentColor: '#a78bfa',
  },
};

// ============= Main Demo Component =============
export function BlocDeepDiveDemo() {
  return (
    <DemoArticle metadata={demoMetadata} showBlocGraph={true} hideNavigation={true}>
      {/* Introduction */}
      <ArticleSection theme="bloc" id="introduction">
        <Prose>
          <h2>Event-Driven State Management</h2>
          <p>
            While Cubits provide <strong>simple, direct state updates</strong>, Blocs take a different approach:
            <strong> every state change is triggered by an event</strong>. This event-driven architecture brings
            powerful benefits for complex applications.
          </p>
          <p>
            In this deep dive, you'll master <strong>event handling patterns</strong>, <strong>async operations</strong>,
            <strong>event transformations</strong>, and learn when Blocs are the right choice for your state management needs.
          </p>
        </Prose>
      </ArticleSection>

      {/* Basic Event Pattern */}
      <ArticleSection id="basic-events">
        <SectionHeader>Basic Event Pattern</SectionHeader>
        <Prose>
          <p>
            In Bloc, <strong>events are classes</strong> that represent user actions or system triggers.
            Each event can carry data, and every state change is traceable to a specific event.
          </p>
        </Prose>

        <div className="my-8">
          <BasicEventDemo />
        </div>

        <div className="my-8">
          <StateViewer bloc={EventCounterBloc} title="Event Counter State" />
        </div>

        <CodePanel
          code={`// Define event classes
class IncrementEvent {
  constructor(public readonly amount: number = 1) {}
}

class DecrementEvent {
  constructor(public readonly amount: number = 1) {}
}

class ResetEvent {}

// Create event-driven Bloc
class EventCounterBloc extends Bloc<CounterState, IncrementEvent | DecrementEvent | ResetEvent> {
  constructor() {
    super({ count: 0, history: [] });

    // Register event handlers
    this.on(IncrementEvent, (event, emit) => {
      emit({
        count: this.state.count + event.amount,
        history: [...this.state.history,
          { event: 'Increment', timestamp: Date.now() }
        ],
      });
    });

    this.on(DecrementEvent, (event, emit) => {
      emit({
        count: this.state.count - event.amount,
        history: [...this.state.history,
          { event: 'Decrement', timestamp: Date.now() }
        ],
      });
    });

    this.on(ResetEvent, (event, emit) => {
      emit({ count: 0, history: [] });
    });
  }

  // Helper methods for dispatching events
  increment = (amount = 1) => {
    this.add(new IncrementEvent(amount));
  };
}`}
          language="typescript"
          showLineNumbers={true}
          highlightLines={[2, 3, 17, 18, 19, 40, 41]}
          lineLabels={{
            2: 'Events can carry data',
            17: 'Register handler for event type',
            19: 'Access event data in handler',
            40: 'Dispatch events with add()',
          }}
        />

        <TipCallout title="Why Events?">
          <p>
            Events provide a <strong>clear audit trail</strong> of what caused each state change.
            This is invaluable for debugging, testing, and implementing features like undo/redo or time-travel debugging.
          </p>
        </TipCallout>
      </ArticleSection>

      {/* Complex Event Handling */}
      <ArticleSection theme="neutral" id="complex-events">
        <SectionHeader>Complex Event Handling</SectionHeader>
        <Prose>
          <p>
            Events excel at handling <strong>complex business logic</strong>. Here's a form validation
            example that demonstrates field-level validation, error handling, and async submission.
          </p>
        </Prose>

        <div className="my-8">
          <FormValidationDemo />
        </div>

        <div className="my-8">
          <StateViewer bloc={FormValidationBloc} title="Form State" maxDepth={3} />
        </div>

        <CodePanel
          code={`// Form events with specific purposes
class UpdateFieldEvent {
  constructor(
    public readonly field: string,
    public readonly value: string
  ) {}
}

class ValidateFieldEvent {
  constructor(public readonly field: string) {}
}

class SubmitFormEvent {}

class FormValidationBloc extends Bloc<FormState, FormEvents> {
  constructor() {
    super(initialState);

    // Update and auto-validate
    this.on(UpdateFieldEvent, (event, emit) => {
      const updatedFields = {
        ...this.state.fields,
        [event.field]: {
          value: event.value,
          touched: true,
        },
      };

      // Validate on change
      const error = this.validateField(event.field, event.value);
      updatedFields[event.field].error = error;

      emit({
        ...this.state,
        fields: updatedFields,
        isValid: this.isFormValid(updatedFields),
      });
    });

    // Handle async submission
    this.on(SubmitFormEvent, async (event, emit) => {
      emit({ ...this.state, isSubmitting: true });

      try {
        await this.submitToAPI(this.state.fields);
        emit({ ...this.state, isSubmitting: false, submitCount: this.state.submitCount + 1 });
      } catch (error) {
        emit({ ...this.state, isSubmitting: false, error: error.message });
      }
    });
  }

  // Private validation logic
  private validateField(field: string, value: string): string | null {
    // Validation rules...
  }
}`}
          language="typescript"
          showLineNumbers={true}
          highlightLines={[2, 3, 4, 5, 19, 28, 29, 39, 40, 41]}
          lineLabels={{
            3: 'Events carry field name and value',
            19: 'Dynamic field updates',
            28: 'Validate during update',
            39: 'Async events supported',
            41: 'Emit intermediate states',
          }}
        />

        <InfoCallout title="Event Granularity">
          <p>
            Create separate event classes for different actions, even if they seem similar.
            <code>UpdateEmailEvent</code> and <code>UpdatePasswordEvent</code> are clearer than a generic <code>UpdateFieldEvent</code>,
            though both approaches work.
          </p>
        </InfoCallout>
      </ArticleSection>

      {/* Async Event Processing */}
      <ArticleSection theme="bloc" id="async-events">
        <SectionHeader>Async Event Processing</SectionHeader>
        <Prose>
          <p>
            Blocs handle <strong>asynchronous operations elegantly</strong>. You can emit multiple states
            during async processing, cancel operations, and handle errors gracefully.
          </p>
        </Prose>

        <div className="my-8">
          <AsyncEventDemo />
        </div>

        <div className="my-8">
          <StateViewer bloc={AsyncEventBloc} title="Async State" />
        </div>

        <CodePanel
          code={`class AsyncEventBloc extends Bloc<ApiState, FetchDataEvent | RefreshDataEvent | CancelFetchEvent> {
  private abortController?: AbortController;

  constructor() {
    super(initialState);

    this.on(FetchDataEvent, async (event, emit) => {
      // Cancel any pending request
      this.abortController?.abort();
      this.abortController = new AbortController();

      // Emit loading state
      emit({ ...this.state, loading: true, error: null });

      try {
        const data = await this.fetchFromAPI(this.abortController.signal);

        // Emit success state
        emit({
          data,
          loading: false,
          error: null,
          fetchCount: this.state.fetchCount + 1,
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          // Emit error state
          emit({
            ...this.state,
            loading: false,
            error: error.message,
          });
        }
      }
    });

    // Refresh keeps existing data
    this.on(RefreshDataEvent, async (event, emit) => {
      emit({ ...this.state, refreshing: true });
      // Reuse fetch logic
      this.add(new FetchDataEvent());
    });

    // Cancel ongoing operations
    this.on(CancelFetchEvent, (event, emit) => {
      this.abortController?.abort();
      emit({ ...this.state, loading: false, refreshing: false });
    });
  }
}`}
          language="typescript"
          showLineNumbers={true}
          highlightLines={[8, 9, 12, 17, 26, 37, 38, 44]}
          lineLabels={{
            8: 'Cancel previous requests',
            12: 'Emit loading state immediately',
            17: 'Emit success after async work',
            26: 'Handle errors gracefully',
            37: 'Keep data during refresh',
            44: 'Support cancellation',
          }}
        />

        <WarningCallout title="Cleanup on Dispose">
          <p>
            Always clean up async operations in the <code>dispose()</code> method.
            Cancel timers, abort requests, and close streams to prevent memory leaks.
          </p>
        </WarningCallout>
      </ArticleSection>

      {/* Event Transformation */}
      <ArticleSection theme="neutral" id="event-transformation">
        <SectionHeader>Event Transformation Patterns</SectionHeader>
        <Prose>
          <p>
            Transform events before processing them. Common patterns include <strong>debouncing</strong>
            (delay processing), <strong>throttling</strong> (limit frequency), and <strong>switching</strong>
            (cancel previous, start new).
          </p>
        </Prose>

        <div className="my-8">
          <SearchDemo />
        </div>

        <div className="my-8">
          <StateViewer bloc={SearchBloc} title="Search State" />
        </div>

        <CodePanel
          code={`class SearchBloc extends Bloc<SearchState, SearchEvent | ClearSearchEvent> {
  private searchTimeout?: NodeJS.Timeout;

  constructor() {
    super(initialState);

    this.on(SearchEvent, async (event, emit) => {
      // Clear previous timeout (debounce)
      if (this.searchTimeout) {
        clearTimeout(this.searchTimeout);
      }

      // Update query immediately for UI responsiveness
      emit({ ...this.state, query: event.query, isSearching: true });

      // Debounce the actual search
      await new Promise<void>((resolve) => {
        this.searchTimeout = setTimeout(() => resolve(), 500);
      });

      // Perform search
      const results = await this.performSearch(event.query);

      emit({
        query: event.query,
        results,
        isSearching: false,
        searchCount: this.state.searchCount + 1,
      });
    });
  }

  // Clean up timers on dispose
  override dispose() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    super.dispose();
  }
}

// Usage patterns
bloc.search('query');     // Debounced
bloc.search('updated');    // Cancels previous, starts new
bloc.clear();              // Immediate`}
          language="typescript"
          showLineNumbers={true}
          highlightLines={[7, 8, 9, 13, 16, 17, 33, 34, 35]}
          lineLabels={{
            8: 'Cancel previous debounce',
            13: 'Update UI immediately',
            16: 'Wait for debounce delay',
            33: 'Clean up on dispose',
          }}
        />

        <TipCallout title="Advanced Transformations">
          <p>
            For complex transformations, consider using RxJS operators or similar libraries.
            They provide operators like <code>debounceTime</code>, <code>throttleTime</code>,
            <code>switchMap</code>, and <code>exhaustMap</code> out of the box.
          </p>
        </TipCallout>
      </ArticleSection>

      {/* Testing & Debugging */}
      <ArticleSection theme="bloc" id="testing">
        <SectionHeader>Event Testing & Debugging</SectionHeader>
        <Prose>
          <p>
            Events make testing straightforward. You can test event handlers in isolation,
            verify state transitions, and even implement time-travel debugging.
          </p>
        </Prose>

        <CodePanel
          code={`// Testing event handlers
describe('CounterBloc', () => {
  let bloc: EventCounterBloc;

  beforeEach(() => {
    bloc = new EventCounterBloc();
  });

  it('should increment count on IncrementEvent', () => {
    // Dispatch event
    bloc.add(new IncrementEvent(5));

    // Verify state change
    expect(bloc.state.count).toBe(5);
    expect(bloc.state.history).toHaveLength(1);
    expect(bloc.state.history[0].event).toBe('Increment(5)');
  });

  it('should handle multiple events', () => {
    // Dispatch sequence of events
    bloc.add(new IncrementEvent(3));
    bloc.add(new DecrementEvent(1));
    bloc.add(new IncrementEvent(2));

    // Verify final state
    expect(bloc.state.count).toBe(4);
    expect(bloc.state.history).toHaveLength(3);
  });

  it('should handle async events', async () => {
    const apiBloc = new AsyncEventBloc();

    // Start fetch
    apiBloc.add(new FetchDataEvent());
    expect(apiBloc.state.loading).toBe(true);

    // Wait for completion
    await waitFor(() => !apiBloc.state.loading);

    // Verify result
    expect(apiBloc.state.data).toBeDefined();
    expect(apiBloc.state.error).toBeNull();
  });
});

// Event logging for debugging
class DebugBloc extends Bloc<State, Events> {
  constructor() {
    super(initialState);

    // Log all events
    this.onAny((event) => {
      console.log('[Event]', event.constructor.name, event);
    });
  }
}`}
          language="typescript"
          showLineNumbers={true}
          highlightLines={[10, 14, 15, 20, 21, 22, 33, 37, 51, 52]}
          lineLabels={{
            10: 'Dispatch test events',
            14: 'Verify state changes',
            20: 'Test event sequences',
            33: 'Test async events',
            51: 'Log events for debugging',
          }}
        />

        <InfoCallout title="Time-Travel Debugging">
          <p>
            Since every state change is triggered by an event, you can record all events
            and replay them to reproduce any state. This enables powerful debugging tools
            and even user-facing undo/redo functionality.
          </p>
        </InfoCallout>
      </ArticleSection>

      {/* Key Takeaways */}
      <ArticleSection theme="success" id="takeaways">
        <SectionHeader>Key Takeaways</SectionHeader>
        <Prose>
          <ul>
            <li>
              <strong>Events provide traceability</strong>: Every state change has a clear cause
            </li>
            <li>
              <strong>Event classes carry data</strong>: Type-safe way to pass information to handlers
            </li>
            <li>
              <strong>Async events are first-class</strong>: Emit multiple states during async operations
            </li>
            <li>
              <strong>Transform events as needed</strong>: Debounce, throttle, or cancel as required
            </li>
            <li>
              <strong>Testing is straightforward</strong>: Dispatch events, verify state changes
            </li>
            <li>
              <strong>Enable powerful debugging</strong>: Event logs, time-travel, and replay capabilities
            </li>
          </ul>

          <h3>When to Use Blocs vs Cubits</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="p-4 rounded-lg bg-concept-bloc/10 border border-concept-bloc/20">
              <h4 className="font-semibold mb-2">Use Blocs When:</h4>
              <ul className="text-sm space-y-1">
                <li>You need event traceability</li>
                <li>Complex business logic with multiple triggers</li>
                <li>Testing is a high priority</li>
                <li>You want time-travel debugging</li>
                <li>Multiple sources can trigger the same state change</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-concept-cubit/10 border border-concept-cubit/20">
              <h4 className="font-semibold mb-2">Use Cubits When:</h4>
              <ul className="text-sm space-y-1">
                <li>Simple, direct state updates</li>
                <li>UI state management (forms, toggles)</li>
                <li>Performance is critical</li>
                <li>Rapid prototyping</li>
                <li>State changes are straightforward</li>
              </ul>
            </div>
          </div>
        </Prose>
      </ArticleSection>

      {/* Next Steps */}
      <ArticleSection theme="info" id="next-steps">
        <SectionHeader>Next Steps</SectionHeader>
        <Prose>
          <p>
            You've mastered the event-driven architecture of Blocs! You understand how events
            provide structure, traceability, and testability to your state management.
          </p>
          <p>
            Next, we'll do a detailed comparison of <strong>Blocs vs Cubits</strong>, helping you
            choose the right tool for each situation in your applications.
          </p>
        </Prose>
      </ArticleSection>
    </DemoArticle>
  );
}