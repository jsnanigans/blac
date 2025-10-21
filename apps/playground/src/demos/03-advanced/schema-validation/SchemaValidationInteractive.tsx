import { useBloc } from '@blac/react';
import { Cubit, BlocValidationError } from '@blac/core';
import { z } from 'zod';
import { Button } from '@/ui/Button';
import { StateViewer } from '@/components/shared/StateViewer';
import { motion } from 'framer-motion';
import { useState } from 'react';
import confetti from 'canvas-confetti';
import { Badge } from '@/ui/Badge';

// ============= User Registration with Schema Validation =============

const UserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(20),
  email: z.string().email('Invalid email format'),
  age: z
    .number()
    .int('Age must be a whole number')
    .min(13, 'Must be at least 13')
    .max(120),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

type UserData = z.infer<typeof UserSchema>;

interface RegistrationState {
  userData: UserData | null;
  isSubmitting: boolean;
  successCount: number;
  lastError: string | null;
}

class RegistrationCubit extends Cubit<RegistrationState> {
  static schema = z.object({
    userData: UserSchema.nullable(),
    isSubmitting: z.boolean(),
    successCount: z.number(),
    lastError: z.string().nullable(),
  });

  constructor() {
    super({
      userData: null,
      isSubmitting: false,
      successCount: 0,
      lastError: null,
    });
  }

  // Validate and save user data from form submission
  registerUser = async (formData: unknown) => {
    this.patch({ isSubmitting: true, lastError: null });

    try {
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 800));

      // Validate the incoming data against schema
      const validatedUser = UserSchema.parse(formData);

      // If validation passes, save to state
      this.patch({
        userData: validatedUser,
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
        // Extract first error message
        const firstError = error.issues[0];
        this.patch({
          isSubmitting: false,
          lastError: firstError?.message || 'Validation failed',
        });
      } else {
        this.patch({
          isSubmitting: false,
          lastError: 'An unexpected error occurred',
        });
      }
    }
  };

  reset = () => {
    this.patch({
      userData: null,
      lastError: null,
    });
  };
}

// ============= Test Data Examples =============

const testCases = [
  {
    label: '✅ Valid User',
    data: {
      username: 'johndoe',
      email: 'john@example.com',
      age: 25,
      website: 'https://johndoe.com',
    },
    isValid: true,
  },
  {
    label: '❌ Invalid Email',
    data: {
      username: 'janedoe',
      email: 'not-an-email',
      age: 30,
      website: '',
    },
    isValid: false,
  },
  {
    label: '❌ Too Young',
    data: {
      username: 'kiddo',
      email: 'kid@example.com',
      age: 10,
      website: '',
    },
    isValid: false,
  },
  {
    label: '❌ Username Too Short',
    data: {
      username: 'ab',
      email: 'short@example.com',
      age: 25,
      website: '',
    },
    isValid: false,
  },
  {
    label: '❌ Invalid URL',
    data: {
      username: 'webmaster',
      email: 'web@example.com',
      age: 28,
      website: 'not-a-url',
    },
    isValid: false,
  },
  {
    label: '❌ Age Not Integer',
    data: {
      username: 'floaty',
      email: 'float@example.com',
      age: 25.5,
      website: '',
    },
    isValid: false,
  },
];

// ============= Interactive Component =============

export function SchemaValidationInteractive() {
  const [state, cubit] = useBloc(RegistrationCubit);
  const [selectedCase, setSelectedCase] = useState(0);

  const handleTestCase = (caseIndex: number) => {
    setSelectedCase(caseIndex);
    cubit.registerUser(testCases[caseIndex]!.data);
  };

  return (
    <div className="w-full space-y-6">
      {/* Test Cases */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Try These Examples
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {testCases.map((testCase, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              onClick={() => handleTestCase(idx)}
              disabled={state.isSubmitting}
              className={`justify-start text-xs ${
                !testCase.isValid
                  ? 'border-red-300 hover:border-red-500 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/30'
                  : 'border-green-300 hover:border-green-500 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950/30'
              } ${selectedCase === idx ? 'ring-2 ring-brand' : ''}`}
            >
              {testCase.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Current Test Data */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Current Test Data (Before Validation)
        </h3>
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <pre className="text-xs font-mono overflow-x-auto">
            {JSON.stringify(testCases[selectedCase]!.data, null, 2)}
          </pre>
        </div>
      </div>

      {/* Validation Result */}
      <motion.div
        key={state.successCount + (state.lastError || '')}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <h3 className="text-sm font-semibold text-foreground">
          Validation Result
        </h3>

        {state.isSubmitting && (
          <div className="rounded-lg border border-brand/50 bg-brand/5 p-4">
            <p className="text-sm text-muted-foreground">Validating...</p>
          </div>
        )}

        {!state.isSubmitting && state.lastError && (
          <div className="rounded-lg border border-red-500 bg-red-50 dark:bg-red-950/30 p-4">
            <div className="flex items-start gap-2">
              <span className="text-red-600 dark:text-red-400 text-lg">✗</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                  Validation Failed
                </p>
                <p className="text-xs text-red-700 dark:text-red-400 mt-1">
                  {state.lastError}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  State was NOT updated
                </p>
              </div>
            </div>
          </div>
        )}

        {!state.isSubmitting && !state.lastError && state.userData && (
          <div className="rounded-lg border border-green-500 bg-green-50 dark:bg-green-950/30 p-4">
            <div className="flex items-start gap-2">
              <span className="text-green-600 dark:text-green-400 text-lg">
                ✓
              </span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                  Validation Passed!
                </p>
                <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                  State updated with validated data
                </p>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      {/* Current Valid State */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            Cubit State (Always Valid)
          </h3>
          <Badge
            variant="outline"
            className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800"
          >
            Schema Protected
          </Badge>
        </div>
        <StateViewer bloc={RegistrationCubit} title="" />
      </div>

      {/* Helper Methods Demo */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Helper Methods
        </h3>
        <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
          <div className="text-xs space-y-2">
            <code className="bg-muted px-2 py-1 rounded font-mono">
              UserSchema.safeParse(data)
            </code>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-green-600 text-white">
                  Valid
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Returns success: true
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="border-red-500 text-red-700 dark:text-red-400"
                >
                  Invalid
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Returns success: false + errors
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Button */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={() => cubit.reset()}>
          Reset State
        </Button>
      </div>

      {/* Key Insight */}
      <div className="rounded-lg border border-brand/50 bg-brand/5 p-4">
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Key Insight:</strong> Schema
          validation prevents invalid data from ever entering your state. When
          validation fails, the state remains unchanged, guaranteeing data
          integrity throughout your application.
        </p>
      </div>
    </div>
  );
}
