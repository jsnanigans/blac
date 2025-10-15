import { useBloc } from '@blac/react';
import { Bloc } from '@blac/core';
import { Button } from '@/ui/Button';
import { StateViewer } from '@/components/shared/StateViewer';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';

// ============= Basic Event-Driven Counter =============
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
class UpdateFieldEvent {
  constructor(
    public readonly field: string,
    public readonly value: string
  ) {}
}

class SubmitFormEvent {}

class ResetFormEvent {}

interface FormField {
  value: string;
  error: string | null;
  touched: boolean;
}

interface FormState {
  emailValue: string;
  emailError: string | null;
  emailTouched: boolean;
  passwordValue: string;
  passwordError: string | null;
  passwordTouched: boolean;
  isSubmitting: boolean;
  isValid: boolean;
  submitCount: number;
}

class FormValidationBloc extends Bloc<FormState, UpdateFieldEvent | SubmitFormEvent | ResetFormEvent> {
  constructor() {
    const initialState: FormState = {
      emailValue: '',
      emailError: null,
      emailTouched: false,
      passwordValue: '',
      passwordError: null,
      passwordTouched: false,
      isSubmitting: false,
      isValid: false,
      submitCount: 0,
    };

    super(initialState);

    this.on(UpdateFieldEvent, (event, emit) => {
      let newState = { ...this.state };

      if (event.field === 'email') {
        newState.emailValue = event.value;
        newState.emailTouched = true;
        newState.emailError = this.validateEmail(event.value);
      } else if (event.field === 'password') {
        newState.passwordValue = event.value;
        newState.passwordTouched = true;
        newState.passwordError = this.validatePassword(event.value);
      }

      newState.isValid = !newState.emailError && !newState.passwordError &&
                         newState.emailValue.length > 0 && newState.passwordValue.length > 0;

      emit(newState);
    });

    this.on(SubmitFormEvent, async (event, emit) => {
      emit({ ...this.state, isSubmitting: true });

      await new Promise(resolve => setTimeout(resolve, 1500));

      emit({
        ...this.state,
        isSubmitting: false,
        submitCount: this.state.submitCount + 1,
      });
    });

    this.on(ResetFormEvent, (event, emit) => {
      emit({
        emailValue: '',
        emailError: null,
        emailTouched: false,
        passwordValue: '',
        passwordError: null,
        passwordTouched: false,
        isSubmitting: false,
        isValid: false,
        submitCount: this.state.submitCount,
      });
    });
  }

  private validateEmail(value: string): string | null {
    if (!value) return 'Email is required';
    if (!value.includes('@')) return 'Invalid email format';
    return null;
  }

  private validatePassword(value: string): string | null {
    if (!value) return 'Password is required';
    if (value.length < 8) return 'Password must be at least 8 characters';
    return null;
  }

  updateField = (field: string, value: string) => {
    this.add(new UpdateFieldEvent(field, value));
  };

  submit = () => {
    this.add(new SubmitFormEvent());
  };

  reset = () => {
    this.add(new ResetFormEvent());
  };
}

// ============= Async Event Handling =============
class FetchDataEvent {}

interface Post {
  id: number;
  title: string;
  body: string;
}

interface ApiState {
  data: Post[] | null;
  loading: boolean;
  error: string | null;
  fetchCount: number;
}

class AsyncEventBloc extends Bloc<ApiState, FetchDataEvent> {
  constructor() {
    super({
      data: null,
      loading: false,
      error: null,
      fetchCount: 0,
    });

    this.on(FetchDataEvent, async (event, emit) => {
      emit({
        ...this.state,
        loading: true,
        error: null,
      });

      try {
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (Math.random() > 0.7) {
          throw new Error('Network error: Failed to fetch posts');
        }

        const mockData: Post[] = [
          { id: 1, title: 'Understanding Blocs', body: 'Event-driven state management' },
          { id: 2, title: 'Async Operations', body: 'Handling async events with Blocs' },
          { id: 3, title: 'Best Practices', body: 'Tips for using Blocs effectively' },
        ];

        emit({
          data: mockData,
          loading: false,
          error: null,
          fetchCount: this.state.fetchCount + 1,
        });
      } catch (error) {
        emit({
          ...this.state,
          loading: false,
          error: error instanceof Error ? error.message : 'An error occurred',
        });
      }
    });
  }

  fetchData = () => {
    this.add(new FetchDataEvent());
  };

  reset = () => {
    this.emit({
      data: null,
      loading: false,
      error: null,
      fetchCount: 0,
    });
  };
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
    <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface px-6 py-6 shadow-subtle">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-400/10 via-transparent to-violet-500/15 opacity-90" />
      <div className="relative space-y-6">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Event-Driven Counter
        </h4>

        <motion.div
          key={state.count}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 25 }}
          className="text-center text-6xl font-bold text-brand"
        >
          {state.count}
        </motion.div>

        <div className="flex flex-wrap gap-2 justify-center">
          <Button onClick={() => bloc.decrement()} variant="outline" size="sm">
            Decrement
          </Button>
          <Button onClick={() => bloc.reset()} variant="outline" size="sm">
            Reset
          </Button>
          <Button onClick={handleIncrement} variant="primary" size="sm">
            Increment
          </Button>
        </div>

        <div className="flex gap-2 justify-center">
          <Button onClick={() => bloc.increment(5)} variant="outline" size="sm">
            +5
          </Button>
          <Button onClick={() => bloc.decrement(5)} variant="outline" size="sm">
            -5
          </Button>
        </div>

        {state.history.length > 0 && (
          <div className="mt-4">
            <h5 className="text-xs font-semibold mb-2 text-muted-foreground">Event History</h5>
            <div className="space-y-1 text-xs font-mono">
              {state.history.slice(0, 5).map((item, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex justify-between p-2 rounded bg-background/50"
                >
                  <span className="text-brand">{item.event}</span>
                  <span className="text-muted-foreground">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
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
    <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface px-6 py-6 shadow-subtle">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-400/10 via-transparent to-cyan-500/15 opacity-90" />
      <div className="relative">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-4">
          Form Validation with Events
        </h4>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="text"
              value={state.emailValue}
              onChange={(e) => bloc.updateField('email', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md bg-background ${
                state.emailError && state.emailTouched
                  ? 'border-red-500'
                  : 'border-border'
              }`}
              placeholder="user@example.com"
            />
            {state.emailError && state.emailTouched && (
              <p className="mt-1 text-sm text-red-500">{state.emailError}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={state.passwordValue}
              onChange={(e) => bloc.updateField('password', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md bg-background ${
                state.passwordError && state.passwordTouched
                  ? 'border-red-500'
                  : 'border-border'
              }`}
              placeholder="Min 8 characters"
            />
            {state.passwordError && state.passwordTouched && (
              <p className="mt-1 text-sm text-red-500">{state.passwordError}</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!state.isValid || state.isSubmitting}
            >
              {state.isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => bloc.reset()}>
              Reset
            </Button>
          </div>

          {state.submitCount > 0 && !state.isSubmitting && (
            <p className="text-sm text-green-600">
              Form submitted successfully! (Count: {state.submitCount})
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

function AsyncEventDemo() {
  const [state, bloc] = useBloc(AsyncEventBloc);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface px-6 py-6 shadow-subtle">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-emerald-400/10 via-transparent to-teal-500/15 opacity-90" />
      <div className="relative space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Async Event Handling
          </h4>
          <div className="flex gap-2">
            <Button
              onClick={() => bloc.fetchData()}
              variant="primary"
              size="sm"
              disabled={state.loading}
            >
              {state.loading ? 'Loading...' : 'Fetch Posts'}
            </Button>
            <Button onClick={() => bloc.reset()} variant="outline" size="sm">
              Reset
            </Button>
          </div>
        </div>

        {state.loading && (
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-brand"></div>
          </div>
        )}

        {state.error && (
          <div className="rounded border border-red-500 bg-red-100 p-4 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
            Error: {state.error}
          </div>
        )}

        {state.data && !state.loading && (
          <div className="space-y-2">
            {state.data.map((post) => (
              <div key={post.id} className="rounded bg-background/50 p-3">
                <p className="font-medium">{post.title}</p>
                <p className="text-sm text-muted-foreground">{post.body}</p>
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Fetched {state.fetchCount} time(s)
            </p>
          </div>
        )}

        {!state.data && !state.loading && !state.error && (
          <p className="py-8 text-center text-muted-foreground">
            Click "Fetch Posts" to load data
          </p>
        )}
      </div>
    </div>
  );
}

// ============= Main Interactive Component for MDX =============
export function BlocDeepDiveInteractive() {
  return (
    <div className="my-8 space-y-8">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Basic Event Pattern</h3>
        <BasicEventDemo />
        <StateViewer bloc={EventCounterBloc} title="Event Counter State" maxDepth={2} />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Form Validation</h3>
        <FormValidationDemo />
        <StateViewer bloc={FormValidationBloc} title="Form State" maxDepth={1} />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Async Operations</h3>
        <AsyncEventDemo />
        <StateViewer bloc={AsyncEventBloc} title="API State" />
      </div>
    </div>
  );
}
