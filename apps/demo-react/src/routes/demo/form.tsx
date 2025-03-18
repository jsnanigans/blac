import { useBloc } from '@blac/react';
import { createFileRoute } from '@tanstack/react-router';
import { useRenderCount } from '@uidotdev/usehooks';
import { Cubit } from 'blac-next';
import { memo, useRef, useState } from 'react';

export const Route = createFileRoute('/demo/form')({
  component: RouteComponent,
});

// Enhanced form data type to demonstrate more complex state
type FormData = {
  message: string;
  name: string;
  email: string;
  showIsEmailValid: boolean;
  // Moved preferences to root level
  marketingEmails: boolean;
  enableNotifications: boolean;
  themePreference: 'light' | 'dark' | 'system';
  // Added for custom dependency selector demo
  submissionCount: number;
  lastSubmitted: string | null;
};

class FormBloc extends Cubit<FormData> {
  constructor() {
    super({ 
      message: 'Hi mom', 
      name: '', 
      email: '', 
      showIsEmailValid: true,
      // Moved to root level
      marketingEmails: false,
      enableNotifications: true,
      themePreference: 'system',
      submissionCount: 0,
      lastSubmitted: null
    });
  }

  handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target as HTMLInputElement;
    
    // Handle all properties at root level
    if (name in this.state) {
      // Handle properties
      const newValue = type === 'checkbox' 
        ? (event.target as HTMLInputElement).checked 
        : value;
      
      this.patch({ [name]: newValue });
    }
  };

  reset = () => {
    this.patch({ 
      message: '', 
      name: '', 
      email: '',
      // Reset preferences at root level
      marketingEmails: false,
      enableNotifications: true
    });
  };

  toggleShowEmailValid = () => {
    this.patch({ showIsEmailValid: !this.state.showIsEmailValid });
  };

  submitForm = () => {
    // Simulate form submission
    const formData = {
      name: this.state.name,
      email: this.state.email,
      message: this.state.message,
      preferences: {
        marketingEmails: this.state.marketingEmails,
        enableNotifications: this.state.enableNotifications,
        themePreference: this.state.themePreference
      }
    };
    
    console.log('Form submitted:', formData);
    
    // Update submission stats without triggering re-renders in components
    // that don't access these properties
    this.patch({ 
      submissionCount: this.state.submissionCount + 1,
      lastSubmitted: new Date().toISOString()
    });
  };

  // Computed property - will trigger re-renders only when email changes
  get emailIsValid() {
    return this.state.email.includes('@');
  }

  // Another computed property - will trigger re-renders only when name changes
  get nameIsValid() {
    return this.state.name.length >= 3;
  }

  // Computed property that depends on multiple fields
  get isFormValid() {
    return this.emailIsValid && this.nameIsValid && this.state.message.length > 0;
  }
}

// Component that only accesses a single field
const FieldInput = memo(
  ({ name, type, label }: { name: string; type: string; label?: string }) => {
    const [formData, { handleChange }] = useBloc(FormBloc);
    const renderCount = useRenderCount();
    
    // All properties are at root level now
    const value = formData[name as keyof FormData];
    const isCheckbox = type === 'checkbox';

    return (
      <div className="mb-4">
        <div className={`flex ${isCheckbox ? 'flex-row items-center' : 'flex-col'}`}>
          <label className={`text-sm font-medium text-foreground dark:text-gray-100 ${isCheckbox ? 'order-2 ml-2' : 'mb-1'}`}>
            {label || name}
          </label>
          <div className={isCheckbox ? 'order-1' : 'relative'}>
            {type === 'select' ? (
              <select
                name={name}
                value={String(value)}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground dark:text-gray-100"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            ) : (
              <input
                type={type}
                name={name}
                checked={isCheckbox ? Boolean(value) : undefined}
                value={isCheckbox ? undefined : String(value || '')}
                onChange={handleChange}
                className={`${isCheckbox ? 'h-4 w-4' : 'w-full px-3 py-2'} bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground dark:text-gray-100`}
              />
            )}
          </div>
        </div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 ml-auto text-right">
          Renders: {renderCount}
        </div>
      </div>
    );
  },
);

// Component that only uses the form methods without accessing state
const FormActions = memo(() => {
  const [, bloc] = useBloc(FormBloc);
  const renderCount = useRenderCount();
  
  return (
    <div className="mt-6">
      <div className="flex justify-between items-center mb-2">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Form Actions Render Count: {renderCount}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          <span className="font-medium">Note:</span> This component <span className="font-medium">never re-renders</span> on state changes
        </div>
      </div>
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={bloc.reset}
          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Reset
        </button>
        <button 
          type="button"
          onClick={bloc.submitForm}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
        >
          Submit
        </button>
      </div>
    </div>
  );
});

// Component with custom dependency selector
const SubmissionStats = memo(() => {
  const renderCount = useRenderCount();
  // Using a custom dependency selector to only re-render when these specific properties change
  const [formData] = useBloc(FormBloc, {
    dependencySelector: (state) => [[state.submissionCount, state.lastSubmitted]]
  });
  
  return (
    <div className="p-4 mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-md font-medium text-blue-800 dark:text-blue-200">Submission Statistics</h3>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Render Count: {renderCount}
        </div>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-300">
        <p>Submissions: <span className="font-medium">{formData.submissionCount}</span></p>
        {formData.lastSubmitted && (
          <p>Last submitted: <span className="font-medium">{new Date(formData.lastSubmitted).toLocaleString()}</span></p>
        )}
      </div>
      <div className="mt-2 text-xs text-blue-600 dark:text-blue-300">
        Only re-renders when submission data changes, not when form fields change.
      </div>
    </div>
  );
});

// Component that accesses a computed property with conditional dependency tracking
const EmailValidation = memo(() => {
  const [{ showIsEmailValid }, bloc] = useBloc(FormBloc);
  const renderCount = useRenderCount();
  
  // When the validation is disabled, the component won't depend on email or emailIsValid anymore
  if (!showIsEmailValid) {
    return (
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div className="px-3 py-1 rounded-md text-sm bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            Email validation disabled
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Renders: {renderCount}
          </div>
        </div>
        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          This component stopped tracking if the email is valid and will not re-render when the email changes
        </div>
      </div>
    );
  }
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center">
        <div className={`px-3 py-1 rounded-md text-sm ${
          bloc.emailIsValid 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' 
            : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200'
        }`}>
          Email: {bloc.emailIsValid ? 'Valid ✓' : 'Invalid ✗'}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Renders: {renderCount}
        </div>
      </div>
      <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
        This component only re-renders when the email validity changes, because it only accesses the computed emailIsValid property.
      </div>
    </div>
  );
});

// New component for toggling email validation
const ValidationToggle = memo(() => {
  const [{ showIsEmailValid }, bloc] = useBloc(FormBloc);
  const renderCount = useRenderCount();

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center">
        <button
          onClick={bloc.toggleShowEmailValid}
          className={`px-3 py-1 text-sm rounded-md flex items-center ${
            showIsEmailValid 
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200' 
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }`}
        >
          <span className={`inline-block w-4 h-4 rounded-full mr-2 ${
            showIsEmailValid 
              ? 'bg-blue-500 dark:bg-blue-400' 
              : 'bg-gray-400 dark:bg-gray-500'
          }`}></span>
          {showIsEmailValid ? 'Validation Enabled' : 'Validation Disabled'}
        </button>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Renders: {renderCount}
        </div>
      </div>
      <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
        This component only depends on the showIsEmailValid property
      </div>
    </div>
  );
});

// Component that accesses another computed property
const FormValidator = memo(() => {
  const [, bloc] = useBloc(FormBloc);
  const renderCount = useRenderCount();
  
  return (
    <div className="my-4 flex items-center justify-between">
      <div className={`px-3 py-1 rounded-md text-sm ${
        bloc.isFormValid 
          ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-200' 
          : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200'
      }`}>
        Form is {bloc.isFormValid ? 'valid ✓' : 'incomplete ⚠'}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400">
        Renders: {renderCount}
      </div>
    </div>
  );
});

function RouteComponent() {
  const renderCount = useRenderCount();
  const formRef = useRef<HTMLFormElement>(null);
  
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-3xl font-bold mb-2 text-foreground dark:text-gray-100">
          Blac's Intelligent Dependency Tracking
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          This form demonstrates how Blac optimizes rendering by tracking exactly which state properties 
          are accessed by each component. Components only re-render when the specific data they use changes.
        </p>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Root component render count: {renderCount}
        </div>
        
        <div className="flex items-center mt-4">
          <a 
            href="https://github.com/jsnanigans/blac/tree/v1/apps/demo-react/src/routes/demo/form.tsx" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.841-2.337 4.687-4.565 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
            </svg>
            View Form Source
          </a>
        </div>
      </section>

      <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <h2 className="text-xl font-semibold mb-6 text-foreground dark:text-gray-100">Dependency Tracking Demo</h2>
        
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-md border border-indigo-200 dark:border-indigo-800 mb-6">
          <h3 className="text-lg font-medium text-indigo-800 dark:text-indigo-200 mb-2">How Blac Dependency Tracking Works</h3>
          <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-300">
            <li>
              <span className="font-medium">Automatic Property Tracking:</span> Blac records which state properties and getters each component accesses
            </li>
            <li>
              <span className="font-medium">Optimized Re-renders:</span> Components only re-render when their used properties change
            </li>
            <li>
              <span className="font-medium">Dynamic Dependency Adjustment:</span> Blac automatically detects when a component stops using a property and removes that dependency
            </li>
            <li>
              <span className="font-medium">Method-Only Components:</span> Components that only call methods never re-render on state changes
            </li>
            <li>
              <span className="font-medium">Computed Properties:</span> Components using computed properties only re-render when the source data changes
            </li>
            <li>
              <span className="font-medium">Custom Dependency Selectors:</span> For advanced cases, you can explicitly define dependencies
            </li>
            <li className="text-amber-700 dark:text-amber-400">
              <span className="font-medium">Important Limitation:</span> Automatic dependency tracking only works for root-level properties. Nested objects should be accessed with getters or custom dependency selectors
            </li>
          </ul>
          <pre className="mt-4 p-3 bg-gray-800 text-gray-100 rounded-md overflow-x-auto text-sm">
{`// Components using useBloc automatically track dependencies
const [state, bloc] = useBloc(FormBloc);

// For custom dependency control:
const [state, bloc] = useBloc(FormBloc, {
  dependencySelector: (state) => [[state.someField, state.anotherField]]
});

// For method-only access (no re-renders on state changes):
const [, bloc] = useBloc(FormBloc); // Don't access state

// For nested objects, prefer getters or flatten your state:
get userProfile() { // This properly tracks dependencies
  return { name: this.state.name, email: this.state.email };
}`}
          </pre>
        </div>
        
        <form 
          ref={formRef}
          className="space-y-6" 
          onSubmit={(e) => e.preventDefault()}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
            <div>
              <h3 className="text-lg font-medium mb-4 text-foreground dark:text-gray-100">Contact Information</h3>
              <FieldInput name="name" type="text" label="Full Name" />
              <ValidationToggle />
              <FieldInput name="email" type="email" label="Email Address" />
              <EmailValidation />
              <FieldInput name="message" type="text" label="Message" />
              
              <div className="mt-6 bg-green-50 dark:bg-green-900/20 p-4 rounded-md border border-green-200 dark:border-green-800">
                <h4 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">Dynamic Dependency Tracking</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  Try toggling the validation status and watch the EmailValidation component's behavior:
                </p>
                <ul className="list-disc pl-5 text-xs text-gray-700 dark:text-gray-300">
                  <li><span className="font-medium">When enabled:</span> The component depends on email state and emailIsValid getter</li>
                  <li><span className="font-medium">When disabled:</span> These dependencies are automatically removed</li>
                  <li><span className="font-medium">Result:</span> When disabled, changing the email won't trigger re-renders</li>
                </ul>
                <p className="text-xs text-gray-700 dark:text-gray-300 mt-2">
                  This demonstrates how blac intelligently manages dependencies based on the actual code paths executed in your components!
                </p>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-4 text-foreground dark:text-gray-100">Preferences</h3>
              <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
                <FieldInput name="marketingEmails" type="checkbox" label="Receive marketing emails" />
                <FieldInput name="enableNotifications" type="checkbox" label="Enable notifications" />
                <FieldInput name="themePreference" type="select" label="Theme preference" />
              </div>
              
              <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md border border-yellow-200 dark:border-yellow-800">
                <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">State Structure Best Practice</h4>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
                  Notice how preferences are now at the root level of state. This is because blac's automatic dependency tracking only works for root-level properties.
                  For nested objects, you should either:
                </p>
                <ul className="list-disc pl-5 text-xs text-gray-700 dark:text-gray-300">
                  <li>Flatten your state structure (recommended for best performance)</li>
                  <li>Use getters to expose nested data</li>
                  <li>Use custom dependency selectors</li>
                </ul>
              </div>
              
              <FormValidator />
              <SubmissionStats />
            </div>
          </div>
          
          <FormActions />
        </form>
      </div>
    </div>
  );
}
