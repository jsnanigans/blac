import React from 'react';
import { useCubit } from '@blac/react';
import { FormCubit } from './FormCubit';

export const FormCubitDemo: React.FC = () => {
  const [state, formCubit] = useCubit(FormCubit);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    formCubit.submit();
  };

  // Determine field validation states
  const nameHasError = state.name && !formCubit.isNameValid;
  const emailHasError = state.email && !formCubit.isEmailValid;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Form with Validation</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          This demo shows form state management with real-time validation, async submission,
          and comprehensive error handling using a Cubit.
        </p>
      </div>

      {state.submitSuccess && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-800 dark:text-green-200 font-medium">
            ✅ Form submitted successfully!
          </p>
          <button
            onClick={formCubit.reset}
            className="mt-2 text-sm text-green-600 dark:text-green-400 hover:underline"
          >
            Submit another form
          </button>
        </div>
      )}

      {state.submitError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200 font-medium">
            ❌ {state.submitError}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={state.name}
            onChange={(e) => formCubit.setName(e.target.value)}
            className={`
              w-full px-3 py-2 rounded-md border transition-colors
              ${nameHasError
                ? 'border-red-500 focus:border-red-600 focus:ring-red-500'
                : state.name && formCubit.isNameValid
                  ? 'border-green-500 focus:border-green-600 focus:ring-green-500'
                  : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
              }
              bg-white dark:bg-gray-800
              focus:outline-none focus:ring-2 focus:ring-opacity-50
            `}
            placeholder="Enter your name"
            disabled={state.isSubmitting}
          />
          {nameHasError && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              Name is required
            </p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            value={state.email}
            onChange={(e) => formCubit.setEmail(e.target.value)}
            className={`
              w-full px-3 py-2 rounded-md border transition-colors
              ${emailHasError
                ? 'border-red-500 focus:border-red-600 focus:ring-red-500'
                : state.email && formCubit.isEmailValid
                  ? 'border-green-500 focus:border-green-600 focus:ring-green-500'
                  : 'border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500'
              }
              bg-white dark:bg-gray-800
              focus:outline-none focus:ring-2 focus:ring-opacity-50
            `}
            placeholder="Enter your email"
            disabled={state.isSubmitting}
          />
          {emailHasError && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              Please enter a valid email address
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={state.isSubmitting || !formCubit.isFormValid}
            className={`
              px-4 py-2 rounded-md font-medium transition-all
              ${state.isSubmitting || !formCubit.isFormValid
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
              }
            `}
          >
            {state.isSubmitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Submitting...
              </span>
            ) : (
              'Submit Form'
            )}
          </button>

          <button
            type="button"
            onClick={formCubit.reset}
            disabled={state.isSubmitting}
            className="px-4 py-2 rounded-md font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset
          </button>
        </div>
      </form>

      <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h3 className="font-semibold mb-2">Form State:</h3>
        <pre className="text-sm overflow-x-auto">
          {JSON.stringify(
            {
              ...state,
              isNameValid: formCubit.isNameValid,
              isEmailValid: formCubit.isEmailValid,
              isFormValid: formCubit.isFormValid,
            },
            null,
            2
          )}
        </pre>
      </div>
    </div>
  );
};