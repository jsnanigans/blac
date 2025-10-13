import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { DemoArticle } from '@/components/demo-article/DemoArticle';
import { ArticleSection, SectionHeader } from '@/components/demo-article/ArticleSection';
import { Prose } from '@/components/demo-article/Prose';
import { CodePanel } from '@/components/demo-article/CodePanel';
import { StateViewer } from '@/components/shared/StateViewer';
import { ConceptCallout } from '@/components/shared/ConceptCallout';
import { Button } from '@/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useState } from 'react';

// ===== STATE & TYPES =====

interface ValidationError {
  field: string;
  message: string;
  type: 'sync' | 'async' | 'cross-field';
}

interface FormState {
  // Field values
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
  age: string;
  acceptTerms: boolean;

  // Validation states
  usernameValidating: boolean;
  usernameAvailable: boolean | null; // null = not checked yet

  // Submission states
  isSubmitting: boolean;
  submitSuccess: boolean;
  submitError: string | null;

  // Error tracking
  errors: ValidationError[];
}

// ===== CUBIT =====

class FormValidationCubit extends Cubit<FormState> {
  // Simulated taken usernames for async validation
  private takenUsernames = ['admin', 'user', 'test', 'demo', 'root'];

  constructor() {
    super({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      age: '',
      acceptTerms: false,
      usernameValidating: false,
      usernameAvailable: null,
      isSubmitting: false,
      submitSuccess: false,
      submitError: null,
      errors: [],
    });
  }

  // ===== FIELD SETTERS =====

  setUsername = (username: string) => {
    this.patch({
      username,
      usernameAvailable: null, // Reset async validation
      submitSuccess: false,
      submitError: null,
    });

    // Trigger async validation after short delay
    if (username.length >= 3) {
      this.validateUsernameAsync(username);
    }
  };

  setEmail = (email: string) => {
    this.patch({
      email,
      submitSuccess: false,
      submitError: null,
    });
  };

  setPassword = (password: string) => {
    this.patch({
      password,
      submitSuccess: false,
      submitError: null,
    });
  };

  setConfirmPassword = (confirmPassword: string) => {
    this.patch({
      confirmPassword,
      submitSuccess: false,
      submitError: null,
    });
  };

  setAge = (age: string) => {
    // Only allow numbers
    if (age === '' || /^\d+$/.test(age)) {
      this.patch({
        age,
        submitSuccess: false,
        submitError: null,
      });
    }
  };

  setAcceptTerms = (acceptTerms: boolean) => {
    this.patch({
      acceptTerms,
      submitSuccess: false,
      submitError: null,
    });
  };

  // ===== FIELD-LEVEL VALIDATION =====

  get isUsernameValid(): boolean {
    const { username } = this.state;
    return (
      username.length >= 3 &&
      username.length <= 20 &&
      /^[a-zA-Z0-9_]+$/.test(username)
    );
  }

  get usernameErrors(): string[] {
    const { username } = this.state;
    const errors: string[] = [];

    if (username.length > 0 && username.length < 3) {
      errors.push('Username must be at least 3 characters');
    }
    if (username.length > 20) {
      errors.push('Username must be 20 characters or less');
    }
    if (username.length > 0 && !/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.push('Username can only contain letters, numbers, and underscores');
    }

    return errors;
  }

  get isEmailValid(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.state.email);
  }

  get emailErrors(): string[] {
    const { email } = this.state;
    const errors: string[] = [];

    if (email.length > 0 && !this.isEmailValid) {
      errors.push('Please enter a valid email address');
    }

    return errors;
  }

  // Password strength validation
  get passwordStrength(): 'weak' | 'medium' | 'strong' | null {
    const { password } = this.state;
    if (password.length === 0) return null;

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return 'weak';
    if (strength <= 3) return 'medium';
    return 'strong';
  }

  get isPasswordValid(): boolean {
    return this.state.password.length >= 8 && this.passwordStrength !== 'weak';
  }

  get passwordErrors(): string[] {
    const { password } = this.state;
    const errors: string[] = [];

    if (password.length > 0 && password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (password.length > 0 && !/[a-z]/.test(password)) {
      errors.push('Password must contain lowercase letters');
    }
    if (password.length > 0 && !/[A-Z]/.test(password)) {
      errors.push('Password must contain uppercase letters');
    }
    if (password.length > 0 && !/[0-9]/.test(password)) {
      errors.push('Password should contain numbers');
    }
    if (password.length > 0 && !/[^a-zA-Z0-9]/.test(password)) {
      errors.push('Password should contain special characters');
    }

    return errors;
  }

  // ===== CROSS-FIELD VALIDATION =====

  get isConfirmPasswordValid(): boolean {
    const { password, confirmPassword } = this.state;
    return confirmPassword.length > 0 && password === confirmPassword;
  }

  get confirmPasswordErrors(): string[] {
    const { password, confirmPassword } = this.state;
    const errors: string[] = [];

    if (confirmPassword.length > 0 && password !== confirmPassword) {
      errors.push('Passwords do not match');
    }

    return errors;
  }

  get isAgeValid(): boolean {
    const age = parseInt(this.state.age);
    return !isNaN(age) && age >= 13 && age <= 120;
  }

  get ageErrors(): string[] {
    const { age } = this.state;
    const errors: string[] = [];
    const ageNum = parseInt(age);

    if (age.length > 0 && (isNaN(ageNum) || ageNum < 13)) {
      errors.push('You must be at least 13 years old');
    }
    if (age.length > 0 && ageNum > 120) {
      errors.push('Please enter a valid age');
    }

    return errors;
  }

  get isTermsAccepted(): boolean {
    return this.state.acceptTerms;
  }

  // ===== ASYNC VALIDATION =====

  private usernameCheckTimeout: NodeJS.Timeout | null = null;

  validateUsernameAsync = async (username: string) => {
    // Clear previous timeout
    if (this.usernameCheckTimeout) {
      clearTimeout(this.usernameCheckTimeout);
    }

    // Debounce: wait 500ms before checking
    this.usernameCheckTimeout = setTimeout(async () => {
      if (!this.isUsernameValid) return;

      this.patch({ usernameValidating: true });

      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 800));

        const available = !this.takenUsernames.includes(username.toLowerCase());

        this.patch({
          usernameValidating: false,
          usernameAvailable: available,
        });
      } catch (error) {
        this.patch({
          usernameValidating: false,
          usernameAvailable: null,
        });
      }
    }, 500);
  };

  // ===== FORM VALIDATION =====

  get isFormValid(): boolean {
    return (
      this.isUsernameValid &&
      this.state.usernameAvailable === true &&
      this.isEmailValid &&
      this.isPasswordValid &&
      this.isConfirmPasswordValid &&
      this.isAgeValid &&
      this.isTermsAccepted
    );
  }

  // Collect all validation errors
  get allErrors(): ValidationError[] {
    const errors: ValidationError[] = [];

    // Username errors
    this.usernameErrors.forEach((msg) => {
      errors.push({ field: 'username', message: msg, type: 'sync' });
    });
    if (this.isUsernameValid && this.state.usernameAvailable === false) {
      errors.push({
        field: 'username',
        message: 'Username is already taken',
        type: 'async',
      });
    }

    // Email errors
    this.emailErrors.forEach((msg) => {
      errors.push({ field: 'email', message: msg, type: 'sync' });
    });

    // Password errors
    this.passwordErrors.forEach((msg) => {
      errors.push({ field: 'password', message: msg, type: 'sync' });
    });

    // Confirm password errors
    this.confirmPasswordErrors.forEach((msg) => {
      errors.push({ field: 'confirmPassword', message: msg, type: 'cross-field' });
    });

    // Age errors
    this.ageErrors.forEach((msg) => {
      errors.push({ field: 'age', message: msg, type: 'sync' });
    });

    // Terms errors
    if (!this.isTermsAccepted) {
      errors.push({
        field: 'acceptTerms',
        message: 'You must accept the terms and conditions',
        type: 'sync',
      });
    }

    return errors;
  }

  // ===== SUBMISSION =====

  submit = async () => {
    if (!this.isFormValid) {
      this.patch({
        submitError: 'Please fix all validation errors before submitting',
      });
      return;
    }

    this.patch({
      isSubmitting: true,
      submitError: null,
      submitSuccess: false,
    });

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      this.patch({
        isSubmitting: false,
        submitSuccess: true,
      });
    } catch (error) {
      this.patch({
        isSubmitting: false,
        submitError: error instanceof Error ? error.message : 'An error occurred',
      });
    }
  };

  reset = () => {
    this.emit({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      age: '',
      acceptTerms: false,
      usernameValidating: false,
      usernameAvailable: null,
      isSubmitting: false,
      submitSuccess: false,
      submitError: null,
      errors: [],
    });
  };
}

// ===== HELPER COMPONENTS =====

function PasswordStrengthIndicator({ strength }: { strength: 'weak' | 'medium' | 'strong' | null }) {
  if (!strength) return null;

  const colors = {
    weak: 'bg-red-500',
    medium: 'bg-yellow-500',
    strong: 'bg-green-500',
  };

  const widths = {
    weak: 'w-1/3',
    medium: 'w-2/3',
    strong: 'w-full',
  };

  const labels = {
    weak: 'Weak',
    medium: 'Medium',
    strong: 'Strong',
  };

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium">Password Strength:</span>
        <span className={`text-xs font-semibold ${strength === 'weak' ? 'text-red-600' : strength === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}>
          {labels[strength]}
        </span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${colors[strength]}`}
          initial={{ width: 0 }}
          animate={{ width: widths[strength].replace('w-', '') }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}

function FieldError({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        className="mt-2 space-y-1"
      >
        {errors.map((error, idx) => (
          <p key={idx} className="text-xs text-red-500 flex items-start gap-1">
            <span>✗</span>
            <span>{error}</span>
          </p>
        ))}
      </motion.div>
    </AnimatePresence>
  );
}

function FieldSuccess({ message }: { message: string }) {
  return (
    <motion.p
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-xs text-green-600 mt-2 flex items-center gap-1"
    >
      <span>✓</span>
      <span>{message}</span>
    </motion.p>
  );
}

// ===== INTERACTIVE FORM =====

function ValidationForm() {
  const [state, formCubit] = useBloc(FormValidationCubit);
  const [touched, setTouched] = useState({
    username: false,
    email: false,
    password: false,
    confirmPassword: false,
    age: false,
  });

  const markTouched = (field: keyof typeof touched) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Mark all fields as touched on submit
    setTouched({
      username: true,
      email: true,
      password: true,
      confirmPassword: true,
      age: true,
    });

    await formCubit.submit();
    if (formCubit.state.submitSuccess) {
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#10b981', '#34d399', '#6ee7b7'],
      });
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="rounded-xl bg-gradient-to-br from-concept-cubit/10 to-concept-cubit/5 border-2 border-concept-cubit/20 p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username Field with Async Validation */}
          <div>
            <label htmlFor="username" className="block text-sm font-semibold mb-2">
              Username <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="username"
                type="text"
                value={state.username}
                onChange={(e) => formCubit.setUsername(e.target.value)}
                onBlur={() => markTouched('username')}
                disabled={state.isSubmitting}
                className={`w-full px-4 py-3 pr-12 rounded-lg border-2 focus:outline-none focus:ring-2 transition-colors ${
                  touched.username && formCubit.usernameErrors.length > 0
                    ? 'border-red-500 focus:ring-red-500'
                    : touched.username && formCubit.isUsernameValid && state.usernameAvailable === true
                      ? 'border-green-500 focus:ring-green-500'
                      : 'border-gray-300 dark:border-gray-600 focus:ring-concept-cubit'
                }`}
                placeholder="Choose a username"
              />
              {state.usernameValidating && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="animate-spin h-5 w-5 border-2 border-concept-cubit border-t-transparent rounded-full" />
                </div>
              )}
            </div>
            {touched.username && <FieldError errors={formCubit.usernameErrors} />}
            {touched.username && formCubit.isUsernameValid && state.usernameAvailable === true && (
              <FieldSuccess message="Username is available!" />
            )}
            {touched.username && formCubit.isUsernameValid && state.usernameAvailable === false && (
              <FieldError errors={['Username is already taken']} />
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
              onBlur={() => markTouched('email')}
              disabled={state.isSubmitting}
              className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 transition-colors ${
                touched.email && formCubit.emailErrors.length > 0
                  ? 'border-red-500 focus:ring-red-500'
                  : touched.email && formCubit.isEmailValid
                    ? 'border-green-500 focus:ring-green-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-concept-cubit'
              }`}
              placeholder="your.email@example.com"
            />
            {touched.email && <FieldError errors={formCubit.emailErrors} />}
            {touched.email && formCubit.isEmailValid && (
              <FieldSuccess message="Valid email" />
            )}
          </div>

          {/* Password Field with Strength Indicator */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold mb-2">
              Password <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              value={state.password}
              onChange={(e) => formCubit.setPassword(e.target.value)}
              onBlur={() => markTouched('password')}
              disabled={state.isSubmitting}
              className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 transition-colors ${
                touched.password && formCubit.passwordErrors.length > 0
                  ? 'border-red-500 focus:ring-red-500'
                  : touched.password && formCubit.isPasswordValid
                    ? 'border-green-500 focus:ring-green-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-concept-cubit'
              }`}
              placeholder="Create a strong password"
            />
            {state.password.length > 0 && (
              <PasswordStrengthIndicator strength={formCubit.passwordStrength} />
            )}
            {touched.password && <FieldError errors={formCubit.passwordErrors} />}
          </div>

          {/* Confirm Password Field (Cross-field validation) */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold mb-2">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={state.confirmPassword}
              onChange={(e) => formCubit.setConfirmPassword(e.target.value)}
              onBlur={() => markTouched('confirmPassword')}
              disabled={state.isSubmitting}
              className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 transition-colors ${
                touched.confirmPassword && formCubit.confirmPasswordErrors.length > 0
                  ? 'border-red-500 focus:ring-red-500'
                  : touched.confirmPassword && formCubit.isConfirmPasswordValid
                    ? 'border-green-500 focus:ring-green-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-concept-cubit'
              }`}
              placeholder="Confirm your password"
            />
            {touched.confirmPassword && <FieldError errors={formCubit.confirmPasswordErrors} />}
            {touched.confirmPassword && formCubit.isConfirmPasswordValid && (
              <FieldSuccess message="Passwords match" />
            )}
          </div>

          {/* Age Field */}
          <div>
            <label htmlFor="age" className="block text-sm font-semibold mb-2">
              Age <span className="text-red-500">*</span>
            </label>
            <input
              id="age"
              type="text"
              inputMode="numeric"
              value={state.age}
              onChange={(e) => formCubit.setAge(e.target.value)}
              onBlur={() => markTouched('age')}
              disabled={state.isSubmitting}
              className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 transition-colors ${
                touched.age && formCubit.ageErrors.length > 0
                  ? 'border-red-500 focus:ring-red-500'
                  : touched.age && formCubit.isAgeValid
                    ? 'border-green-500 focus:ring-green-500'
                    : 'border-gray-300 dark:border-gray-600 focus:ring-concept-cubit'
              }`}
              placeholder="Enter your age"
            />
            {touched.age && <FieldError errors={formCubit.ageErrors} />}
            {touched.age && formCubit.isAgeValid && (
              <FieldSuccess message="Valid age" />
            )}
          </div>

          {/* Terms Checkbox */}
          <div className="flex items-start gap-3">
            <input
              id="terms"
              type="checkbox"
              checked={state.acceptTerms}
              onChange={(e) => formCubit.setAcceptTerms(e.target.checked)}
              disabled={state.isSubmitting}
              className="mt-1 w-4 h-4 rounded border-gray-300 focus:ring-concept-cubit"
            />
            <label htmlFor="terms" className="text-sm">
              I accept the <a href="#" className="text-concept-cubit underline">terms and conditions</a>{' '}
              <span className="text-red-500">*</span>
            </label>
          </div>

          {/* Form Summary */}
          <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-4">
            <div className="text-sm font-semibold mb-3">Validation Summary:</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>Username: {formCubit.isUsernameValid && state.usernameAvailable === true ? '✓' : '○'}</div>
              <div>Email: {formCubit.isEmailValid ? '✓' : '○'}</div>
              <div>Password: {formCubit.isPasswordValid ? '✓' : '○'}</div>
              <div>Confirmation: {formCubit.isConfirmPasswordValid ? '✓' : '○'}</div>
              <div>Age: {formCubit.isAgeValid ? '✓' : '○'}</div>
              <div>Terms: {formCubit.isTermsAccepted ? '✓' : '○'}</div>
            </div>
            <div className="pt-3 mt-3 border-t border-gray-300 dark:border-gray-600">
              <strong>Form Status:</strong> {' '}
              <span className={formCubit.isFormValid ? 'text-green-600 font-semibold' : 'text-gray-500'}>
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
              {state.isSubmitting ? 'Submitting...' : 'Submit Registration'}
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
                ✓ Registration successful!
              </p>
              <p className="text-green-700 dark:text-green-300 text-sm mt-1">
                Welcome, {state.username}! Your account has been created.
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
              <p className="text-red-800 dark:text-red-200 font-semibold">✗ Error</p>
              <p className="text-red-700 dark:text-red-300 text-sm mt-1">{state.submitError}</p>
            </motion.div>
          )}
        </form>
      </div>
    </div>
  );
}

// ===== DEMO METADATA =====

const demoMetadata = {
  id: 'form-validation',
  title: 'Advanced Form Validation',
  description: 'Master complex validation patterns including field-level, cross-field, and async validation strategies.',
  category: '02-patterns' as const,
  difficulty: 'intermediate' as const,
  tags: ['cubit', 'forms', 'validation', 'async', 'advanced'],
  estimatedTime: 12,
  learningPath: {
    previous: 'simple-form',
    next: 'async-loading',
    sequence: 2,
  },
  theme: {
    primaryColor: '#3b82f6',
    accentColor: '#60a5fa',
  },
};

// ===== MAIN DEMO COMPONENT =====

export function FormValidationDemo() {
  return (
    <DemoArticle metadata={demoMetadata} showBlocGraph={true}>
      {/* Introduction */}
      <ArticleSection theme="cubit" id="introduction">
        <SectionHeader>Advanced Validation Strategies</SectionHeader>
        <Prose>
          <p>
            Form validation isn't just about checking if fields are filled out. <strong>Real-world forms</strong> need
            complex validation rules, async checks (like username availability), cross-field validation (like password
            confirmation), and clear user feedback at every step.
          </p>
          <p>
            In this demo, you'll learn how to build a <strong>production-ready validation system</strong> with BlaC
            Cubits that handles:
          </p>
          <ul>
            <li><strong>Field-level validation</strong>: Each field has its own validation rules</li>
            <li><strong>Async validation</strong>: Check username availability with simulated API calls</li>
            <li><strong>Cross-field validation</strong>: Ensure passwords match</li>
            <li><strong>Password strength</strong>: Visual feedback on password quality</li>
            <li><strong>Smart error display</strong>: Only show errors after users interact with fields</li>
          </ul>
        </Prose>
      </ArticleSection>

      {/* Interactive Demo */}
      <ArticleSection id="demo">
        <SectionHeader>Try It Yourself</SectionHeader>
        <Prose>
          <p>
            Fill out the registration form below. Notice how different validation strategies work together:
          </p>
          <ul>
            <li>Try usernames like "admin" or "test" (they're taken!)</li>
            <li>Watch the password strength indicator change as you type</li>
            <li>See how the confirm password field validates against your password</li>
            <li>All validation happens in real-time, but errors only show after you've touched a field</li>
          </ul>
        </Prose>

        <div className="my-8">
          <ValidationForm />
        </div>

        <div className="my-8">
          <StateViewer bloc={FormValidationCubit} title="Live Form State" maxDepth={2} />
        </div>
      </ArticleSection>

      {/* Validation Types */}
      <ArticleSection theme="neutral" id="validation-types">
        <SectionHeader>Three Types of Validation</SectionHeader>
        <Prose>
          <p>This demo showcases three distinct validation strategies:</p>
        </Prose>

        <div className="my-6 space-y-4">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800 p-4">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              1. Synchronous Field Validation
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Instant validation rules that run locally (email format, password strength, age range).
              These are computed properties (getters) that derive validation state from field values.
            </p>
          </div>

          <div className="rounded-lg bg-purple-50 dark:bg-purple-950/20 border-2 border-purple-200 dark:border-purple-800 p-4">
            <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
              2. Asynchronous Validation
            </h3>
            <p className="text-sm text-purple-800 dark:text-purple-200">
              Validation that requires server checks (username availability). Uses debouncing to avoid
              excessive API calls, and shows loading indicators while checking.
            </p>
          </div>

          <div className="rounded-lg bg-orange-50 dark:bg-orange-950/20 border-2 border-orange-200 dark:border-orange-800 p-4">
            <h3 className="font-semibold text-orange-900 dark:text-orange-100 mb-2">
              3. Cross-Field Validation
            </h3>
            <p className="text-sm text-orange-800 dark:text-orange-200">
              Validation that depends on multiple fields (password confirmation). These getters compare
              values across different fields to ensure consistency.
            </p>
          </div>
        </div>
      </ArticleSection>

      {/* Implementation */}
      <ArticleSection theme="neutral" id="implementation">
        <SectionHeader>How It Works</SectionHeader>
        <Prose>
          <p>Let's break down the key validation patterns:</p>
        </Prose>

        <CodePanel
          code={`class FormValidationCubit extends Cubit<FormState> {
  // Synchronous field validation
  get isUsernameValid(): boolean {
    const { username } = this.state;
    return (
      username.length >= 3 &&
      username.length <= 20 &&
      /^[a-zA-Z0-9_]+$/.test(username)
    );
  }

  // Collect all errors for a field
  get usernameErrors(): string[] {
    const { username } = this.state;
    const errors: string[] = [];

    if (username.length > 0 && username.length < 3) {
      errors.push('Username must be at least 3 characters');
    }
    if (username.length > 0 && !/^[a-zA-Z0-9_]+$/.test(username)) {
      errors.push('Only letters, numbers, and underscores');
    }

    return errors;
  }

  // Async validation with debouncing
  private usernameCheckTimeout: NodeJS.Timeout | null = null;

  validateUsernameAsync = async (username: string) => {
    // Clear previous timeout
    if (this.usernameCheckTimeout) {
      clearTimeout(this.usernameCheckTimeout);
    }

    // Debounce: wait 500ms before checking
    this.usernameCheckTimeout = setTimeout(async () => {
      if (!this.isUsernameValid) return;

      this.patch({ usernameValidating: true });

      try {
        await checkUsernameAPI(username);
        this.patch({
          usernameValidating: false,
          usernameAvailable: true
        });
      } catch (error) {
        this.patch({
          usernameValidating: false,
          usernameAvailable: false
        });
      }
    }, 500);
  };

  // Cross-field validation
  get isConfirmPasswordValid(): boolean {
    const { password, confirmPassword } = this.state;
    return confirmPassword.length > 0 && password === confirmPassword;
  }

  // Password strength calculation
  get passwordStrength(): 'weak' | 'medium' | 'strong' | null {
    const { password } = this.state;
    if (password.length === 0) return null;

    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return 'weak';
    if (strength <= 3) return 'medium';
    return 'strong';
  }

  // Overall form validation
  get isFormValid(): boolean {
    return (
      this.isUsernameValid &&
      this.state.usernameAvailable === true &&
      this.isEmailValid &&
      this.isPasswordValid &&
      this.isConfirmPasswordValid &&
      this.isAgeValid &&
      this.isTermsAccepted
    );
  }
}`}
          language="typescript"
          title="FormValidationCubit.ts"
          highlightLines={[2, 3, 4, 5, 6, 13, 14, 15, 28, 34, 36, 50, 51, 52, 59, 60, 61, 62, 63, 72, 73, 74, 82, 83, 84, 85, 86, 87]}
          lineLabels={{
            2: 'Boolean getter for valid/invalid',
            13: 'Collect specific error messages',
            28: 'Track timeout for debouncing',
            34: 'Clear previous check to debounce',
            36: 'Wait 500ms before API call',
            50: 'Compare two field values',
            59: 'Calculate strength from multiple criteria',
            82: 'Combine all validations',
          }}
        />

        <Prose>
          <h3>Key Patterns</h3>
          <ul>
            <li>
              <strong>Error arrays vs booleans</strong>: Use <code>usernameErrors: string[]</code> to provide
              specific feedback, and <code>isUsernameValid: boolean</code> for overall status
            </li>
            <li>
              <strong>Debouncing</strong>: Async validation waits 500ms after the user stops typing to avoid
              excessive API calls
            </li>
            <li>
              <strong>Loading states</strong>: Track <code>usernameValidating</code> to show spinners during
              async checks
            </li>
            <li>
              <strong>Nullable results</strong>: Use <code>usernameAvailable: boolean | null</code> to
              distinguish "not checked yet" from "checked and available/unavailable"
            </li>
          </ul>
        </Prose>
      </ArticleSection>

      {/* Comparison: Validation Strategies */}
      <ArticleSection theme="cubit" id="comparison">
        <SectionHeader>Validation Strategy Comparison</SectionHeader>

        <div className="grid md:grid-cols-2 gap-6 my-6">
          <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800 p-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 text-lg">
              Optimistic Validation
            </h3>
            <Prose>
              <p className="text-sm mb-3">
                <strong>Show errors only after user interaction</strong>
              </p>
              <ul className="text-sm space-y-2 list-none">
                <li>✓ Better UX - don't overwhelm users</li>
                <li>✓ Track "touched" state per field</li>
                <li>✓ Show errors onBlur or onSubmit</li>
                <li>✓ Less frustrating for users</li>
              </ul>
              <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900/30 rounded text-xs">
                <strong>When to use:</strong> Most forms, especially long registration forms
              </div>
            </Prose>
          </div>

          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border-2 border-yellow-200 dark:border-yellow-800 p-6">
            <h3 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-3 text-lg">
              Aggressive Validation
            </h3>
            <Prose>
              <p className="text-sm mb-3">
                <strong>Show errors immediately as user types</strong>
              </p>
              <ul className="text-sm space-y-2 list-none">
                <li>○ Can be frustrating</li>
                <li>○ Good for real-time feedback</li>
                <li>○ Show errors onChange</li>
                <li>✓ Useful for password strength</li>
              </ul>
              <div className="mt-4 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded text-xs">
                <strong>When to use:</strong> Password fields, search inputs, or when immediate feedback is critical
              </div>
            </Prose>
          </div>
        </div>
      </ArticleSection>

      {/* Best Practices */}
      <ArticleSection theme="info" id="best-practices">
        <SectionHeader>Validation Best Practices</SectionHeader>
        <Prose>
          <h3>DO ✓</h3>
          <ul>
            <li>Use getters for validation logic (stays in sync with state)</li>
            <li>Debounce async validation to reduce API calls</li>
            <li>Show loading indicators during async checks</li>
            <li>Provide specific, helpful error messages</li>
            <li>Only show errors after user has interacted with a field</li>
            <li>Use visual indicators (colors, icons) for validation status</li>
            <li>Disable submit button until form is valid</li>
          </ul>

          <h3>DON'T ✗</h3>
          <ul>
            <li>Store validation results in state (derive them from data instead)</li>
            <li>Validate on every keystroke without debouncing</li>
            <li>Show all errors immediately (wait for blur/submit)</li>
            <li>Use vague error messages like "Invalid input"</li>
            <li>Forget to validate on the backend too (never trust client-side validation alone)</li>
            <li>Make users submit to see cross-field validation errors</li>
          </ul>
        </Prose>

        <ConceptCallout type="warning" title="Security Note">
          <p>
            Client-side validation is for <strong>user experience</strong>, not security. Always validate
            and sanitize data on the server. Malicious users can bypass client-side checks.
          </p>
        </ConceptCallout>
      </ArticleSection>

      {/* Advanced Patterns */}
      <ArticleSection theme="neutral" id="advanced">
        <SectionHeader>Advanced Patterns</SectionHeader>
        <Prose>
          <h3>Conditional Validation</h3>
          <p>
            Sometimes fields are only required based on other fields. For example, if a user selects
            "Other" as their country, you might require a text input for the country name.
          </p>
        </Prose>

        <CodePanel
          code={`get isCountryNameRequired(): boolean {
  return this.state.country === 'other';
}

get isCountryNameValid(): boolean {
  // Only validate if it's required
  if (!this.isCountryNameRequired) return true;
  return this.state.countryName.length > 0;
}

get isFormValid(): boolean {
  return (
    this.isEmailValid &&
    this.isPasswordValid &&
    this.isCountryNameValid // Conditionally required
  );
}`}
          language="typescript"
          highlightLines={[1, 2, 3, 5, 6, 7, 8, 15]}
          lineLabels={{
            1: 'Conditional requirement logic',
            7: 'Skip validation if not required',
            15: 'Include in overall validation',
          }}
        />

        <Prose>
          <h3>Dependent Validation</h3>
          <p>
            Use cross-field validation when one field depends on another. Password confirmation is a classic
            example, but you might also validate that a "end date" is after a "start date", or that a
            "discount amount" doesn't exceed the "original price".
          </p>
        </Prose>
      </ArticleSection>

      {/* Key Takeaways */}
      <ArticleSection theme="success" id="takeaways">
        <SectionHeader>Key Takeaways</SectionHeader>
        <Prose>
          <ul>
            <li>
              <strong>Three validation types</strong>: Synchronous (instant), asynchronous (API calls), and
              cross-field (multiple field dependencies)
            </li>
            <li>
              <strong>Getters for validation</strong>: Derive validation state from field values using getters
              to keep logic in one place
            </li>
            <li>
              <strong>Debounce async validation</strong>: Wait for users to stop typing before making API calls
            </li>
            <li>
              <strong>Error arrays</strong>: Return arrays of specific error messages instead of just booleans
            </li>
            <li>
              <strong>Optimistic error display</strong>: Only show errors after users interact with fields
            </li>
            <li>
              <strong>Visual feedback</strong>: Use colors, icons, and loading indicators to communicate
              validation status
            </li>
          </ul>
        </Prose>
      </ArticleSection>

      {/* Next Steps */}
      <ArticleSection theme="info" id="next-steps">
        <SectionHeader>Next Steps</SectionHeader>
        <Prose>
          <p>
            You've mastered complex form validation! Ready for more patterns? The next demo covers{' '}
            <strong>async loading states and error handling</strong>, including:
          </p>
          <ul>
            <li>Loading, success, and error state management</li>
            <li>Visual loading indicators and skeletons</li>
            <li>Retry mechanisms for failed requests</li>
            <li>Error boundaries and graceful degradation</li>
          </ul>
          <p>
            Continue to the <strong>Async Loading States</strong> demo to learn these patterns!
          </p>
        </Prose>
      </ArticleSection>
    </DemoArticle>
  );
}
