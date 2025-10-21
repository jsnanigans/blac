import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { DemoArticle } from '@/components/demo-article/DemoArticle';
import {
  ArticleSection,
  SectionHeader,
} from '@/components/demo-article/ArticleSection';
import { Prose } from '@/components/demo-article/Prose';
import { CodePanel } from '@/components/demo-article/CodePanel';
import { StateViewer } from '@/components/shared/StateViewer';
import { ConceptCallout } from '@/components/shared/ConceptCallout';
import { Button } from '@/ui/Button';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useState } from 'react';

// ===== STATE & CUBIT =====

interface FormState {
  name: string;
  email: string;
  isSubmitting: boolean;
  submitSuccess: boolean;
  submitError: string | null;
}

class SimpleFormCubit extends Cubit<FormState> {
  constructor() {
    super({
      name: '',
      email: '',
      isSubmitting: false,
      submitSuccess: false,
      submitError: null,
    });
  }

  // Field setters - use patch() for partial updates
  setName = (name: string) => {
    this.patch({
      name,
      submitError: null, // Clear errors when user starts typing
      submitSuccess: false,
    });
  };

  setEmail = (email: string) => {
    this.patch({
      email,
      submitError: null,
      submitSuccess: false,
    });
  };

  // Validation getters - computed properties that don't trigger re-renders
  get isNameValid(): boolean {
    return this.state.name.trim().length >= 2;
  }

  get isEmailValid(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.state.email);
  }

  get isFormValid(): boolean {
    return this.isNameValid && this.isEmailValid;
  }

  // Async submit handler
  submit = async () => {
    if (!this.isFormValid) {
      this.patch({
        submitError: 'Please fill in all fields correctly',
      });
      return;
    }

    // Set loading state
    this.patch({
      isSubmitting: true,
      submitError: null,
      submitSuccess: false,
    });

    try {
      // Simulate API call
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // 90% success rate for demo purposes
          if (Math.random() < 0.9) {
            resolve(true);
          } else {
            reject(new Error('Network error: Could not submit form'));
          }
        }, 1500);
      });

      // Success!
      this.patch({
        isSubmitting: false,
        submitSuccess: true,
      });
    } catch (error) {
      // Handle errors
      this.patch({
        isSubmitting: false,
        submitError:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      });
    }
  };

  // Reset form to initial state
  reset = () => {
    this.emit({
      name: '',
      email: '',
      isSubmitting: false,
      submitSuccess: false,
      submitError: null,
    });
  };
}

// ===== HELPER FUNCTIONS =====

const celebrateSubmit = () => {
  confetti({
    particleCount: 150,
    spread: 80,
    origin: { y: 0.6 },
    colors: ['#10b981', '#34d399', '#6ee7b7'],
  });
};

// ===== INTERACTIVE COMPONENTS =====

function InteractiveForm() {
  const [state, formCubit] = useBloc(SimpleFormCubit);
  const [touched, setTouched] = useState({ name: false, email: false });

  const handleNameBlur = () => setTouched((t) => ({ ...t, name: true }));
  const handleEmailBlur = () => setTouched((t) => ({ ...t, email: true }));

  const showNameError =
    touched.name && !formCubit.isNameValid && state.name.length > 0;
  const showEmailError =
    touched.email && !formCubit.isEmailValid && state.email.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await formCubit.submit();
    if (formCubit.state.submitSuccess) {
      celebrateSubmit();
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-xl bg-gradient-to-br from-concept-cubit/10 to-concept-cubit/5 border-2 border-concept-cubit/20 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name Field */}
          <div>
            <label htmlFor="name" className="block text-sm font-semibold mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={state.name}
              onChange={(e) => formCubit.setName(e.target.value)}
              onBlur={handleNameBlur}
              disabled={state.isSubmitting}
              className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 transition-colors ${
                showNameError
                  ? 'border-red-500 focus:ring-red-500'
                  : touched.name && formCubit.isNameValid
                    ? 'border-green-500 focus:ring-green-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-concept-cubit'
              }`}
              placeholder="Enter your name"
            />
            {showNameError && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-500 mt-2"
              >
                ✗ Name must be at least 2 characters
              </motion.p>
            )}
            {touched.name && formCubit.isNameValid && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-green-600 mt-2"
              >
                ✓ Valid name
              </motion.p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={state.email}
              onChange={(e) => formCubit.setEmail(e.target.value)}
              onBlur={handleEmailBlur}
              disabled={state.isSubmitting}
              className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 transition-colors ${
                showEmailError
                  ? 'border-red-500 focus:ring-red-500'
                  : touched.email && formCubit.isEmailValid
                    ? 'border-green-500 focus:ring-green-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-concept-cubit'
              }`}
              placeholder="Enter your email"
            />
            {showEmailError && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-500 mt-2"
              >
                ✗ Please enter a valid email address
              </motion.p>
            )}
            {touched.email && formCubit.isEmailValid && (
              <motion.p
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-green-600 mt-2"
              >
                ✓ Valid email
              </motion.p>
            )}
          </div>

          {/* Validation Status */}
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4 text-sm space-y-2">
            <div className="font-semibold mb-3">Form Validation Status:</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                Name:{' '}
                <span
                  className={
                    formCubit.isNameValid ? 'text-green-600' : 'text-gray-400'
                  }
                >
                  {formCubit.isNameValid ? '✓' : '○'}
                </span>
              </div>
              <div>
                Email:{' '}
                <span
                  className={
                    formCubit.isEmailValid ? 'text-green-600' : 'text-gray-400'
                  }
                >
                  {formCubit.isEmailValid ? '✓' : '○'}
                </span>
              </div>
            </div>
            <div className="pt-3 border-t border-gray-300 dark:border-gray-600">
              <strong>Form Status:</strong>{' '}
              <span
                className={
                  formCubit.isFormValid
                    ? 'text-green-600 font-semibold'
                    : 'text-gray-500'
                }
              >
                {formCubit.isFormValid ? '✓ Ready to submit' : '○ Not ready'}
              </span>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={!formCubit.isFormValid || state.isSubmitting}
              variant="primary"
              className="flex-1"
            >
              {state.isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  Submitting...
                </span>
              ) : (
                'Submit'
              )}
            </Button>
            <Button
              type="button"
              onClick={formCubit.reset}
              variant="outline"
              disabled={state.isSubmitting}
            >
              Reset
            </Button>
          </div>

          {/* Success Message */}
          {state.submitSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-green-50 dark:bg-green-950 border-2 border-green-500 rounded-lg p-4"
            >
              <p className="text-green-800 dark:text-green-200 font-semibold">
                ✓ Form submitted successfully!
              </p>
              <p className="text-green-700 dark:text-green-300 text-sm mt-1">
                Name: {state.name}, Email: {state.email}
              </p>
            </motion.div>
          )}

          {/* Error Message */}
          {state.submitError && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 dark:bg-red-950 border-2 border-red-500 rounded-lg p-4"
            >
              <p className="text-red-800 dark:text-red-200 font-semibold">
                ✗ Error submitting form
              </p>
              <p className="text-red-700 dark:text-red-300 text-sm mt-1">
                {state.submitError}
              </p>
              <Button
                onClick={formCubit.submit}
                variant="outline"
                className="mt-3 text-sm"
              >
                Retry
              </Button>
            </motion.div>
          )}
        </form>
      </div>
    </div>
  );
}

// ===== DEMO METADATA =====

const demoMetadata = {
  id: 'simple-form',
  title: 'Simple Form Handling',
  description:
    'Learn how to manage form state, validation, and submission with BlaC Cubits.',
  category: '02-patterns' as const,
  difficulty: 'beginner' as const,
  tags: ['cubit', 'forms', 'validation', 'async'],
  estimatedTime: 8,
  learningPath: {
    previous: 'instance-management',
    next: 'form-validation',
    sequence: 1,
  },
  theme: {
    primaryColor: '#3b82f6',
    accentColor: '#60a5fa',
  },
};

// ===== MAIN DEMO COMPONENT =====

export function SimpleFormDemo() {
  return (
    <DemoArticle metadata={demoMetadata} showBlocGraph={true}>
      {/* Introduction */}
      <ArticleSection theme="cubit" id="introduction">
        <SectionHeader>Form State Management Made Simple</SectionHeader>
        <Prose>
          <p>
            Forms are everywhere in web applications. Whether it's a login
            screen, a search box, or a complex multi-step wizard, you need to
            manage <strong>field values</strong>,<strong>validation</strong>,
            and <strong>submission states</strong>.
          </p>
          <p>
            BlaC Cubits provide a clean, predictable way to handle form state.
            Instead of juggling multiple <code>useState</code> hooks and prop
            drilling, you centralize all form logic in a single, testable class.
          </p>
          <p>
            In this demo, you'll learn how to build a registration form with
            real-time validation and async submission handling.
          </p>
        </Prose>
      </ArticleSection>

      {/* Interactive Demo */}
      <ArticleSection id="demo">
        <SectionHeader>Try It Yourself</SectionHeader>
        <Prose>
          <p>
            Fill out the form below. Notice how validation happens in real-time,
            and the submit button only enables when all fields are valid. Try
            submitting the form (it has a 90% success rate to demonstrate error
            handling).
          </p>
        </Prose>

        <div className="my-8">
          <InteractiveForm />
        </div>

        <div className="my-8">
          <StateViewer bloc={SimpleFormCubit} title="Live Form State" />
        </div>
      </ArticleSection>

      {/* Pattern Explanation */}
      <ArticleSection theme="neutral" id="pattern">
        <SectionHeader>The Form Management Pattern</SectionHeader>
        <Prose>
          <h3>Key Components</h3>
          <p>A well-structured form Cubit has three main responsibilities:</p>
          <ul>
            <li>
              <strong>Field Updates</strong>: Methods to update individual
              fields (<code>setName</code>,<code>setEmail</code>) using{' '}
              <code>patch()</code> for partial updates
            </li>
            <li>
              <strong>Validation</strong>: Computed properties (getters) that
              validate fields without triggering unnecessary re-renders
            </li>
            <li>
              <strong>Submission</strong>: Async handler that manages loading
              states, success, and error handling
            </li>
          </ul>

          <h3>Why Use patch() vs emit()?</h3>
          <p>
            When a user types in a field, you only want to update{' '}
            <em>that specific field</em> and maybe clear error messages. Using{' '}
            <code>patch()</code> lets you update just those properties without
            recreating the entire state object.
          </p>
          <p>
            Use <code>emit()</code> when you want to completely replace the
            state, like when resetting the form.
          </p>
        </Prose>

        <ConceptCallout type="tip" title="Pro Tip: Validation Getters">
          <p>
            Validation logic lives in <strong>getters</strong> (
            <code>get isNameValid()</code>) rather than in state. This keeps
            your validation logic in one place and prevents stale validation
            state from getting out of sync with field values.
          </p>
        </ConceptCallout>
      </ArticleSection>

      {/* Implementation */}
      <ArticleSection theme="neutral" id="implementation">
        <SectionHeader>How It Works</SectionHeader>
        <Prose>
          <p>Let's break down the SimpleFormCubit implementation:</p>
        </Prose>

        <CodePanel
          code={`interface FormState {
  name: string;
  email: string;
  isSubmitting: boolean;
  submitSuccess: boolean;
  submitError: string | null;
}

class SimpleFormCubit extends Cubit<FormState> {
  constructor() {
    super({
      name: '',
      email: '',
      isSubmitting: false,
      submitSuccess: false,
      submitError: null,
    });
  }

  // Use patch() for partial updates
  setName = (name: string) => {
    this.patch({
      name,
      submitError: null, // Clear errors
      submitSuccess: false,
    });
  };

  // Validation getters - computed properties
  get isNameValid(): boolean {
    return this.state.name.trim().length >= 2;
  }

  get isEmailValid(): boolean {
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    return emailRegex.test(this.state.email);
  }

  get isFormValid(): boolean {
    return this.isNameValid && this.isEmailValid;
  }

  // Async submit with loading states
  submit = async () => {
    if (!this.isFormValid) return;

    this.patch({ isSubmitting: true });
    try {
      await api.submitForm(this.state);
      this.patch({
        isSubmitting: false,
        submitSuccess: true
      });
    } catch (error) {
      this.patch({
        isSubmitting: false,
        submitError: error.message
      });
    }
  };

  // Use emit() for full reset
  reset = () => {
    this.emit({
      name: '',
      email: '',
      isSubmitting: false,
      submitSuccess: false,
      submitError: null,
    });
  };
}`}
          language="typescript"
          title="SimpleFormCubit.ts"
          highlightLines={[
            20, 23, 24, 25, 29, 30, 31, 32, 38, 39, 40, 45, 49, 53, 54, 56, 57,
            61, 62,
          ]}
          lineLabels={{
            20: 'Use patch() to update specific fields',
            23: 'Clear errors when user starts typing',
            29: 'Getters provide computed validation',
            38: 'Combine validations',
            45: 'Guard against invalid submissions',
            47: 'Set loading state before async operation',
            53: 'Handle success state',
            56: 'Handle error state',
            64: 'Use emit() to completely reset state',
          }}
        />

        <Prose>
          <h3>Key Concepts</h3>
          <ul>
            <li>
              <strong>Arrow functions</strong>: All methods use arrow function
              syntax for proper
              <code>this</code> binding in React
            </li>
            <li>
              <strong>Partial updates</strong>: <code>patch()</code> merges
              changes into existing state efficiently
            </li>
            <li>
              <strong>Computed properties</strong>: Getters derive values from
              state without storing them
            </li>
            <li>
              <strong>Async handling</strong>: Loading states provide feedback
              during API calls
            </li>
            <li>
              <strong>Error clearing</strong>: Errors automatically clear when
              users modify fields
            </li>
          </ul>
        </Prose>
      </ArticleSection>

      {/* React Integration */}
      <ArticleSection theme="cubit" id="react-integration">
        <SectionHeader>Using in React</SectionHeader>
        <Prose>
          <p>
            Integrating the form Cubit in React is straightforward with the{' '}
            <code>useBloc</code> hook:
          </p>
        </Prose>

        <CodePanel
          code={`function RegistrationForm() {
  const [state, formCubit] = useBloc(SimpleFormCubit);
  const [touched, setTouched] = useState({ name: false, email: false });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await formCubit.submit();
    if (formCubit.state.submitSuccess) {
      // Show success animation
      confetti({ particleCount: 150 });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={state.name}
        onChange={(e) => formCubit.setName(e.target.value)}
        onBlur={() => setTouched(t => ({ ...t, name: true }))}
      />

      {touched.name && !formCubit.isNameValid && (
        <p className="text-red-500">Name must be at least 2 characters</p>
      )}

      <button
        type="submit"
        disabled={!formCubit.isFormValid || state.isSubmitting}
      >
        {state.isSubmitting ? 'Submitting...' : 'Submit'}
      </button>
    </form>
  );
}`}
          language="tsx"
          highlightLines={[2, 7, 18, 22, 28]}
          lineLabels={{
            2: 'Get state and cubit instance',
            7: 'Call async submit method',
            18: 'Bind input to cubit methods',
            22: 'Check validation getters',
            28: 'Disable while submitting',
          }}
        />

        <Prose>
          <p>
            Notice how the component stays clean and focused on{' '}
            <em>rendering</em>, while all the business logic lives in the Cubit.
            This separation makes both easier to test and maintain.
          </p>
        </Prose>

        <ConceptCallout type="info" title="Validation Timing">
          <p>
            We track which fields have been "touched" in component state (
            <code>touched</code>) to avoid showing errors immediately. This
            provides a better user experience—errors only appear after the user
            has interacted with a field.
          </p>
        </ConceptCallout>
      </ArticleSection>

      {/* Best Practices */}
      <ArticleSection theme="info" id="best-practices">
        <SectionHeader>Best Practices</SectionHeader>
        <Prose>
          <h3>DO ✓</h3>
          <ul>
            <li>
              Use <code>patch()</code> for field updates (partial state changes)
            </li>
            <li>Put validation logic in getters so it's always in sync</li>
            <li>Clear errors when users modify fields</li>
            <li>
              Set <code>isSubmitting: true</code> before async operations
            </li>
            <li>Handle both success and error cases explicitly</li>
            <li>
              Use <code>emit()</code> for full state resets
            </li>
          </ul>

          <h3>DON'T ✗</h3>
          <ul>
            <li>Store validation results in state (use getters instead)</li>
            <li>Forget to set loading states during async operations</li>
            <li>Leave error messages visible after user fixes the issue</li>
            <li>Allow submission when form is invalid</li>
            <li>
              Use regular functions (use arrow functions for proper{' '}
              <code>this</code> binding)
            </li>
          </ul>
        </Prose>
      </ArticleSection>

      {/* Key Takeaways */}
      <ArticleSection theme="success" id="takeaways">
        <SectionHeader>Key Takeaways</SectionHeader>
        <Prose>
          <ul>
            <li>
              <strong>Centralized form logic</strong>: All form state,
              validation, and submission logic lives in one testable Cubit
            </li>
            <li>
              <strong>patch() for updates</strong>: Use <code>patch()</code> to
              update individual fields efficiently
            </li>
            <li>
              <strong>Getters for validation</strong>: Computed properties keep
              validation in sync without storing derived state
            </li>
            <li>
              <strong>Loading states</strong>: Always manage{' '}
              <code>isSubmitting</code> for better UX
            </li>
            <li>
              <strong>Error handling</strong>: Handle both success and failure
              cases with clear user feedback
            </li>
          </ul>
        </Prose>
      </ArticleSection>

      {/* Next Steps */}
      <ArticleSection theme="info" id="next-steps">
        <SectionHeader>Next Steps</SectionHeader>
        <Prose>
          <p>
            You've learned the basics of form handling with BlaC. Ready to level
            up? The next demo covers <strong>advanced form validation</strong>,
            including:
          </p>
          <ul>
            <li>Field-level vs form-level validation</li>
            <li>Async validation (checking username availability, etc.)</li>
            <li>Complex validation rules with dependencies between fields</li>
            <li>Custom error messages and validation strategies</li>
          </ul>
          <p>
            Continue to the <strong>Form Validation</strong> demo to explore
            these advanced patterns!
          </p>
        </Prose>
      </ArticleSection>
    </DemoArticle>
  );
}
