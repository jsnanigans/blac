import { useBloc } from '@blac/react';
import { Card, CardContent } from '@/ui/Card';
import { Button } from '@/ui/Button';
import { useState } from 'react';
import { FormCubit } from './FormCubit';

// ===== DEMO COMPONENT =====
export function FormCubitDemo() {
  const [state, formCubit] = useBloc(FormCubit);
  const [touched, setTouched] = useState({ name: false, email: false });

  const handleNameBlur = () => setTouched((t) => ({ ...t, name: true }));
  const handleEmailBlur = () => setTouched((t) => ({ ...t, email: true }));

  const showNameError = touched.name && !formCubit.isNameValid && state.name.length > 0;
  const showEmailError = touched.email && !formCubit.isEmailValid && state.email.length > 0;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Form Card */}
      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold mb-4">User Registration Form</h3>

          <div className="space-y-4">
            {/* Name Field */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                value={state.name}
                onChange={(e) => formCubit.setName(e.target.value)}
                onBlur={handleNameBlur}
                disabled={state.isSubmitting}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  showNameError
                    ? 'border-red-500 focus:ring-red-500'
                    : touched.name && formCubit.isNameValid
                      ? 'border-green-500 focus:ring-green-500'
                      : 'border-gray-300 focus:ring-primary'
                }`}
                placeholder="Enter your name"
              />
              {showNameError && (
                <p className="text-xs text-red-500 mt-1">Name must be at least 2 characters</p>
              )}
              {touched.name && formCubit.isNameValid && (
                <p className="text-xs text-green-600 mt-1">✓ Valid name</p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={state.email}
                onChange={(e) => formCubit.setEmail(e.target.value)}
                onBlur={handleEmailBlur}
                disabled={state.isSubmitting}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                  showEmailError
                    ? 'border-red-500 focus:ring-red-500'
                    : touched.email && formCubit.isEmailValid
                      ? 'border-green-500 focus:ring-green-500'
                      : 'border-gray-300 focus:ring-primary'
                }`}
                placeholder="Enter your email"
              />
              {showEmailError && (
                <p className="text-xs text-red-500 mt-1">Please enter a valid email address</p>
              )}
              {touched.email && formCubit.isEmailValid && (
                <p className="text-xs text-green-600 mt-1">✓ Valid email</p>
              )}
            </div>

            {/* Form Validation Status */}
            <div className="bg-muted/50 rounded p-3 text-sm">
              <div className="font-semibold mb-2">Form Validation Status:</div>
              <div className="space-y-1">
                <div>
                  Name valid: {' '}
                  <span className={formCubit.isNameValid ? 'text-green-600' : 'text-red-500'}>
                    {formCubit.isNameValid ? '✓' : '✗'}
                  </span>
                </div>
                <div>
                  Email valid: {' '}
                  <span className={formCubit.isEmailValid ? 'text-green-600' : 'text-red-500'}>
                    {formCubit.isEmailValid ? '✓' : '✗'}
                  </span>
                </div>
                <div className="font-semibold pt-1 border-t mt-2">
                  Form valid: {' '}
                  <span className={formCubit.isFormValid ? 'text-green-600' : 'text-red-500'}>
                    {formCubit.isFormValid ? '✓ Ready to submit' : '✗ Not ready'}
                  </span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-2">
              <Button
                onClick={formCubit.submit}
                disabled={!formCubit.isFormValid || state.isSubmitting}
                variant="primary"
                className="flex-1"
              >
                {state.isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
              <Button onClick={formCubit.reset} variant="outline">
                Reset
              </Button>
            </div>

            {/* Success Message */}
            {state.submitSuccess && (
              <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded p-3">
                <p className="text-green-800 dark:text-green-200 text-sm font-medium">
                  ✓ Form submitted successfully!
                </p>
                <p className="text-green-700 dark:text-green-300 text-xs mt-1">
                  Name: {state.name}, Email: {state.email}
                </p>
              </div>
            )}

            {/* Error Message */}
            {state.submitError && (
              <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded p-3">
                <p className="text-red-800 dark:text-red-200 text-sm font-medium">
                  ✗ Error submitting form
                </p>
                <p className="text-red-700 dark:text-red-300 text-xs mt-1">{state.submitError}</p>
                <Button onClick={formCubit.submit} variant="outline" className="mt-2 text-xs">
                  Retry
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pattern Explanation */}
      <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20">
        <CardContent>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className="text-2xl">📋</span>
            Form State Management Pattern
          </h3>
          <div className="space-y-3 text-sm">
            <div>
              <strong>Validation Getters:</strong>
              <ul className="list-disc list-inside ml-2 mt-1 text-muted-foreground">
                <li><code>isNameValid</code> - Checks name length ≥ 2</li>
                <li><code>isEmailValid</code> - Validates email format with regex</li>
                <li><code>isFormValid</code> - Combined validation (all fields valid)</li>
              </ul>
            </div>
            <div>
              <strong>State Updates:</strong>
              <ul className="list-disc list-inside ml-2 mt-1 text-muted-foreground">
                <li>Use <code>patch()</code> for partial updates (field changes)</li>
                <li>Use <code>emit()</code> for full reset</li>
                <li>Clear success/error messages on field change</li>
              </ul>
            </div>
            <div>
              <strong>Async Flow:</strong>
              <ul className="list-disc list-inside ml-2 mt-1 text-muted-foreground">
                <li>Set <code>isSubmitting: true</code> before async operation</li>
                <li>Disable form during submission</li>
                <li>Handle both success and error cases</li>
                <li>Update state after promise resolves/rejects</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Code Example */}
      <Card>
        <CardContent>
          <h3 className="text-lg font-semibold mb-3">Code Example</h3>
          <div className="bg-muted/50 rounded p-3 text-xs font-mono overflow-x-auto">
            <pre>{`class FormCubit extends Cubit<FormState> {
  setName = (name: string) => {
    this.patch({ name });
  };

  get isNameValid(): boolean {
    return this.state.name.trim().length >= 2;
  }

  get isFormValid(): boolean {
    return this.isNameValid && this.isEmailValid;
  }

  submit = async () => {
    if (!this.isFormValid) return;

    this.patch({ isSubmitting: true });
    try {
      await api.submitForm(this.state);
      this.patch({ submitSuccess: true });
    } catch (error) {
      this.patch({ submitError: error.message });
    } finally {
      this.patch({ isSubmitting: false });
    }
  };
}`}</pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
