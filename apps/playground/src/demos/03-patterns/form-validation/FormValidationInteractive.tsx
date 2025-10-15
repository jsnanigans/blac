import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { Button } from '@/ui/Button';
import { StateViewer } from '@/components/shared/StateViewer';
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

  onDispose = () => {
    // Clean up timeout
    if (this.usernameCheckTimeout) {
      clearTimeout(this.usernameCheckTimeout);
      this.usernameCheckTimeout = null;
    }
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
    <div className="space-y-6">
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
              className={`w-full px-4 py-3 pr-12 rounded-lg border-2 focus:outline-none focus:ring-2 transition-colors bg-background ${
                touched.username && formCubit.usernameErrors.length > 0
                  ? 'border-red-500 focus:ring-red-500'
                  : touched.username && formCubit.isUsernameValid && state.usernameAvailable === true
                    ? 'border-green-500 focus:ring-green-500'
                    : 'border-border focus:ring-brand'
              }`}
              placeholder="Choose a username"
            />
            {state.usernameValidating && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="animate-spin h-5 w-5 border-2 border-brand border-t-transparent rounded-full" />
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
            className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 transition-colors bg-background ${
              touched.email && formCubit.emailErrors.length > 0
                ? 'border-red-500 focus:ring-red-500'
                : touched.email && formCubit.isEmailValid
                  ? 'border-green-500 focus:ring-green-500'
                  : 'border-border focus:ring-brand'
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
            className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 transition-colors bg-background ${
              touched.password && formCubit.passwordErrors.length > 0
                ? 'border-red-500 focus:ring-red-500'
                : touched.password && formCubit.isPasswordValid
                  ? 'border-green-500 focus:ring-green-500'
                  : 'border-border focus:ring-brand'
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
            className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 transition-colors bg-background ${
              touched.confirmPassword && formCubit.confirmPasswordErrors.length > 0
                ? 'border-red-500 focus:ring-red-500'
                : touched.confirmPassword && formCubit.isConfirmPasswordValid
                  ? 'border-green-500 focus:ring-green-500'
                  : 'border-border focus:ring-brand'
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
            className={`w-full px-4 py-3 rounded-lg border-2 focus:outline-none focus:ring-2 transition-colors bg-background ${
              touched.age && formCubit.ageErrors.length > 0
                ? 'border-red-500 focus:ring-red-500'
                : touched.age && formCubit.isAgeValid
                  ? 'border-green-500 focus:ring-green-500'
                  : 'border-border focus:ring-brand'
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
            className="mt-1 w-4 h-4 rounded border-gray-300 focus:ring-brand cursor-pointer"
          />
          <label htmlFor="terms" className="text-sm cursor-pointer">
            I accept the <span className="text-brand underline">terms and conditions</span>{' '}
            <span className="text-red-500">*</span>
          </label>
        </div>

        {/* Form Summary */}
        <div className="bg-muted rounded-lg p-4 border border-border">
          <div className="text-sm font-semibold mb-3">Validation Summary:</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>Username: {formCubit.isUsernameValid && state.usernameAvailable === true ? '✓' : '○'}</div>
            <div>Email: {formCubit.isEmailValid ? '✓' : '○'}</div>
            <div>Password: {formCubit.isPasswordValid ? '✓' : '○'}</div>
            <div>Confirmation: {formCubit.isConfirmPasswordValid ? '✓' : '○'}</div>
            <div>Age: {formCubit.isAgeValid ? '✓' : '○'}</div>
            <div>Terms: {formCubit.isTermsAccepted ? '✓' : '○'}</div>
          </div>
          <div className="pt-3 mt-3 border-t border-border">
            <strong>Form Status:</strong> {' '}
            <span className={formCubit.isFormValid ? 'text-green-600 font-semibold' : 'text-muted-foreground'}>
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
  );
}

// ===== MAIN INTERACTIVE COMPONENT FOR MDX =====

export function FormValidationInteractive() {
  return (
    <div className="my-8 space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface px-6 py-6 shadow-subtle">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-brand/5 opacity-90" />
          <div className="relative">
            <h3 className="text-lg font-semibold mb-4">Registration Form</h3>
            <ValidationForm />
          </div>
        </div>

        <div className="space-y-4">
          <StateViewer
            bloc={FormValidationCubit}
            title="Form Validation State"
            defaultCollapsed={false}
          />
        </div>
      </div>
    </div>
  );
}
