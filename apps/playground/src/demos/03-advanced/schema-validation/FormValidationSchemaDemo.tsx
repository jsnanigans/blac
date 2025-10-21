import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { z } from 'zod';
import { Button } from '@/ui/Button';
import { Badge } from '@/ui/Badge';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useRef } from 'react';

// ============= Schema Definition =============

const RegistrationSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(20, 'Username too long'),
  email: z.string().email('Invalid email format'),
  age: z
    .number()
    .int('Age must be a whole number')
    .min(13, 'Must be at least 13 years old'),
  website: z
    .string()
    .transform((val) => (val === '' ? undefined : val))
    .pipe(z.string().url('Must be a valid URL').optional()),
});

type RegistrationData = z.infer<typeof RegistrationSchema>;

// ============= State Interface =============

interface FormState {
  data: RegistrationData | null;
  isSubmitting: boolean;
  error: string | null;
  fieldErrors: Record<string, string> | null;
  successCount: number;
}

// ============= Cubit =============

class RegistrationFormCubit extends Cubit<FormState> {
  constructor() {
    super({
      data: null,
      isSubmitting: false,
      error: null,
      fieldErrors: null,
      successCount: 0,
    });
  }

  submitForm = async (formInput: unknown) => {
    this.patch({ isSubmitting: true, error: null, fieldErrors: null });

    try {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Validate unknown form data
      const validated = RegistrationSchema.parse(formInput);

      // Simulate API call
      await fetch('/api/register', {
        method: 'POST',
        body: JSON.stringify(validated),
      }).catch(() => {
        // Mock API - just ignore the error
      });

      // Save validated data to state
      this.patch({
        data: validated,
        isSubmitting: false,
        successCount: this.state.successCount + 1,
      });

      // Celebrate!
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Map all validation errors to field names
        const fieldErrors: Record<string, string> = {};
        error.issues.forEach((issue) => {
          const field = issue.path[0]?.toString();
          if (field && !fieldErrors[field]) {
            fieldErrors[field] = issue.message;
          }
        });

        this.patch({
          isSubmitting: false,
          error: error.issues[0]?.message || 'Validation failed',
          fieldErrors,
        });
      } else {
        this.patch({
          isSubmitting: false,
          error: 'An unexpected error occurred',
          fieldErrors: null,
        });
      }
    }
  };

  reset = () => {
    this.patch({
      data: null,
      error: null,
      fieldErrors: null,
    });
  };
}

// ============= Helper Components =============

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <motion.p
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1"
    >
      <AlertCircle className="h-3 w-3" />
      {message}
    </motion.p>
  );
}

// ============= Form Component =============

export function FormValidationSchemaDemo() {
  const [state, cubit] = useBloc(RegistrationFormCubit);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    // Convert FormData to object (untrusted user input!)
    const rawData = {
      username: formData.get('username') as string,
      email: formData.get('email') as string,
      age: formData.get('age') ? Number(formData.get('age')) : undefined,
      website: (formData.get('website') as string) || '',
    };

    // Cubit validates this raw data
    cubit.submitForm(rawData);
  };

  const handleReset = () => {
    cubit.reset();
    formRef.current?.reset();
  };

  return (
    <div className="w-full space-y-6">
      {/* Form */}
      <div className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-4">
          <h3 className="text-sm font-semibold text-foreground">
            User Registration
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Form data is validated with Zod before entering state
          </p>
        </div>
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          className="p-4 space-y-4"
          noValidate
        >
          {/* Username */}
          <div className="space-y-1.5">
            <label
              htmlFor="username"
              className="text-sm font-medium text-foreground"
            >
              Username *
            </label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="johndoe"
              className={`w-full px-3 py-2 text-sm rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:border-transparent ${
                state.fieldErrors?.username
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-input focus:ring-brand'
              }`}
              disabled={state.isSubmitting}
            />
            <AnimatePresence mode="wait">
              {state.fieldErrors?.username ? (
                <FieldError key="error" message={state.fieldErrors.username} />
              ) : (
                <p key="hint" className="text-xs text-muted-foreground">
                  3-20 characters
                </p>
              )}
            </AnimatePresence>
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label
              htmlFor="email"
              className="text-sm font-medium text-foreground"
            >
              Email *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="john@example.com"
              className={`w-full px-3 py-2 text-sm rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:border-transparent ${
                state.fieldErrors?.email
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-input focus:ring-brand'
              }`}
              disabled={state.isSubmitting}
            />
            <AnimatePresence mode="wait">
              {state.fieldErrors?.email ? (
                <FieldError key="error" message={state.fieldErrors.email} />
              ) : (
                <p key="hint" className="text-xs text-muted-foreground">
                  Valid email format required
                </p>
              )}
            </AnimatePresence>
          </div>

          {/* Age */}
          <div className="space-y-1.5">
            <label
              htmlFor="age"
              className="text-sm font-medium text-foreground"
            >
              Age *
            </label>
            <input
              id="age"
              name="age"
              type="number"
              placeholder="25"
              className={`w-full px-3 py-2 text-sm rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:border-transparent ${
                state.fieldErrors?.age
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-input focus:ring-brand'
              }`}
              disabled={state.isSubmitting}
            />
            <AnimatePresence mode="wait">
              {state.fieldErrors?.age ? (
                <FieldError key="error" message={state.fieldErrors.age} />
              ) : (
                <p key="hint" className="text-xs text-muted-foreground">
                  Must be 13 or older
                </p>
              )}
            </AnimatePresence>
          </div>

          {/* Website */}
          <div className="space-y-1.5">
            <label
              htmlFor="website"
              className="text-sm font-medium text-foreground"
            >
              Website <span className="text-muted-foreground">(optional)</span>
            </label>
            <input
              id="website"
              name="website"
              type="url"
              placeholder="https://example.com"
              className={`w-full px-3 py-2 text-sm rounded-md border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:border-transparent ${
                state.fieldErrors?.website
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-input focus:ring-brand'
              }`}
              disabled={state.isSubmitting}
            />
            <AnimatePresence mode="wait">
              {state.fieldErrors?.website ? (
                <FieldError key="error" message={state.fieldErrors.website} />
              ) : (
                <p key="hint" className="text-xs text-muted-foreground">
                  Must be a valid URL if provided
                </p>
              )}
            </AnimatePresence>
          </div>

          {/* Submit Button */}
          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={state.isSubmitting}
              className="flex-1"
            >
              {state.isSubmitting ? 'Validating & Submitting...' : 'Register'}
            </Button>
            {state.data && (
              <Button
                type="button"
                variant="outline"
                onClick={handleReset}
                disabled={state.isSubmitting}
              >
                Reset
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Validation Result */}
      <AnimatePresence mode="wait">
        {state.error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-lg border border-red-500 bg-red-50 dark:bg-red-950/30 p-4"
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                  Validation Failed
                </p>
                {state.fieldErrors &&
                Object.keys(state.fieldErrors).length > 1 ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-red-700 dark:text-red-400">
                      {Object.keys(state.fieldErrors).length} fields have
                      errors:
                    </p>
                    <ul className="text-xs text-red-700 dark:text-red-400 list-disc list-inside space-y-0.5">
                      {Object.entries(state.fieldErrors).map(
                        ([field, error]) => (
                          <li key={field}>
                            <span className="font-medium capitalize">
                              {field}
                            </span>
                            : {error}
                          </li>
                        ),
                      )}
                    </ul>
                  </div>
                ) : (
                  <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                    {state.error}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  ⚠️ Form data was rejected - state was NOT updated
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {!state.error && state.data && (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-lg border border-green-500 bg-green-50 dark:bg-green-950/30 p-4"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                  Registration Successful!
                </p>
                <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                  Form data passed validation and was saved to state
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Current Valid State */}
      {state.data && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              Validated Data in State
            </h3>
            <Badge
              variant="outline"
              className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800"
            >
              ✓ Schema Validated
            </Badge>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <pre className="text-xs font-mono overflow-x-auto text-foreground">
              {JSON.stringify(state.data, null, 2)}
            </pre>
          </div>
        </div>
      )}

      {/* Quick Test Buttons */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Quick Tests</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              cubit.submitForm({
                username: 'johndoe',
                email: 'john@example.com',
                age: 25,
                website: 'https://johndoe.com',
              })
            }
            disabled={state.isSubmitting}
            className="justify-start text-xs border-green-300 hover:border-green-500 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950/30"
          >
            ✅ Valid Registration
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              cubit.submitForm({
                username: 'ab',
                email: 'john@example.com',
                age: 25,
                website: '',
              })
            }
            disabled={state.isSubmitting}
            className="justify-start text-xs border-red-300 hover:border-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
          >
            ❌ Username Too Short
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              cubit.submitForm({
                username: 'younguser',
                email: 'young@example.com',
                age: 12,
                website: '',
              })
            }
            disabled={state.isSubmitting}
            className="justify-start text-xs border-red-300 hover:border-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
          >
            ❌ Too Young (Age 12)
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              cubit.submitForm({
                username: 'testuser',
                email: 'not-an-email',
                age: 25,
                website: '',
              })
            }
            disabled={state.isSubmitting}
            className="justify-start text-xs border-red-300 hover:border-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
          >
            ❌ Invalid Email
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              cubit.submitForm({
                username: 'ab',
                email: 'not-an-email',
                age: 10,
                website: 'not-a-url',
              })
            }
            disabled={state.isSubmitting}
            className="justify-start text-xs border-red-300 hover:border-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30"
          >
            ❌ Multiple Errors (4 fields)
          </Button>
        </div>
      </div>

      {/* Key Insight */}
      <div className="rounded-lg border border-brand/50 bg-brand/5 p-4">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Pattern:</strong> Zod validates
          untrusted form data before it enters state. The Cubit rejects invalid
          data and provides field-level feedback. State is guaranteed to always
          contain valid, type-safe data that matches your schema. This creates a
          validation boundary that protects your business logic from malformed
          input.
        </p>
      </div>
    </div>
  );
}
