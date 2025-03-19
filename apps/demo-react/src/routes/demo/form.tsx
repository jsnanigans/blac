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
      <div className="mb-4 relative group">
        <div className={`flex ${isCheckbox ? 'flex-row items-center' : 'flex-col'}`}>
          <label className={`text-sm font-medium text-gradient-blue ${isCheckbox ? 'order-2 ml-2' : 'mb-1'}`}>
            {label || name}
          </label>
          <div className={isCheckbox ? 'order-1' : 'relative'}>
            {type === 'select' ? (
              <select
                name={name}
                value={String(value)}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-blue-300/30 dark:border-blue-600/30 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-foreground dark:text-gray-100 transition-all"
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
                className={`${isCheckbox ? 'h-5 w-5 accent-blue-500' : 'w-full px-3 py-2'} bg-white dark:bg-gray-800 border border-blue-300/30 dark:border-blue-600/30 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-foreground dark:text-gray-100 transition-all`}
                placeholder={`Enter your ${label?.toLowerCase() || name}...`}
              />
            )}
          </div>
        </div>
        <div className="render-badge">
          <span className="text-xs py-1 px-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full font-mono">
            Renders: {renderCount}
          </span>
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
    <div className="mt-6 relative">
      <div className="flex justify-between items-center mb-3">
        <div className="render-badge">
          <span className="text-xs py-1 px-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full font-mono">
            Renders: {renderCount}
          </span>
        </div>
        <div className="text-sm text-blue-600 dark:text-blue-300 italic">
          This component <span className="font-medium">never re-renders</span> on state changes
        </div>
      </div>
      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={bloc.reset}
          className="px-5 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-all border border-gray-300/30 dark:border-gray-600/30 shadow-sm"
        >
          Reset
        </button>
        <button 
          type="button"
          onClick={bloc.submitForm}
          className="btn-neon-blue px-5 py-2 rounded-md border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-all shadow-sm shadow-blue-500/20"
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
    <div className="card-neon-green p-5 mt-6 rounded-lg shadow-md shadow-green-500/20">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-bold text-gradient-green">Submission Statistics</h3>
        <div className="render-badge">
          <span className="text-xs py-1 px-2 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full font-mono">
            Renders: {renderCount}
          </span>
        </div>
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-300">
        <p>Submissions: <span className="font-medium">{formData.submissionCount}</span></p>
        {formData.lastSubmitted && (
          <p>Last submitted: <span className="font-medium">{new Date(formData.lastSubmitted).toLocaleString()}</span></p>
        )}
      </div>
      <div className="mt-3 text-sm text-green-600 dark:text-green-300 italic">
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
      <div className="mb-6 relative">
        <div className="flex justify-between items-center">
          <div className="px-3 py-1 rounded-md text-sm bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
            Email validation disabled
          </div>
          <div className="render-badge">
            <span className="text-xs py-1 px-2 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full font-mono">
              Renders: {renderCount}
            </span>
          </div>
        </div>
        <div className="mt-2 text-sm text-purple-600 dark:text-purple-300 italic">
          This component stopped tracking if the email is valid and will not re-render when the email changes
        </div>
      </div>
    );
  }
  
  return (
    <div className="mb-6 relative">
      <div className="flex justify-between items-center">
        <div className={`px-3 py-1 rounded-md text-sm ${
          bloc.emailIsValid 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
        }`}>
          {bloc.emailIsValid 
            ? 'Email is valid!' 
            : 'Please enter a valid email'}
        </div>
        <div className="render-badge">
          <span className="text-xs py-1 px-2 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full font-mono">
            Renders: {renderCount}
          </span>
        </div>
      </div>
      <div className="mt-2 text-sm text-purple-600 dark:text-purple-300 italic">
        This component only re-renders when the email validity changes
      </div>
    </div>
  );
});

// Component that shows real-time render counts for multiple properties
const RenderCountMonitor = memo(() => {
  const [{ name, email, message, marketingEmails, enableNotifications, themePreference }, bloc] = useBloc(FormBloc);
  const renderCount = useRenderCount();
  
  return (
    <div className="card-neon-cyan p-4 rounded-lg shadow-sm shadow-cyan-500/20 mt-6">
      <div className="flex justify-between items-center mb-3">
        <h4 className="text-sm font-bold text-gradient-cyan">Render Monitor</h4>
        <div className="render-badge">
          <span className="text-xs py-1 px-2 bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 rounded-full font-mono">
            Total Renders: {renderCount}
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-600 dark:text-gray-400">Name:</span>
          <span className="ml-2 font-medium text-cyan-700 dark:text-cyan-300">{name || '(empty)'}</span>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Email:</span>
          <span className="ml-2 font-medium text-cyan-700 dark:text-cyan-300">{email || '(empty)'}</span>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Message:</span>
          <span className="ml-2 font-medium text-cyan-700 dark:text-cyan-300">{message || '(empty)'}</span>
        </div>
        <div>
          <span className="text-gray-600 dark:text-gray-400">Marketing:</span>
          <span className="ml-2 font-medium text-cyan-700 dark:text-cyan-300">{marketingEmails ? 'Yes' : 'No'}</span>
        </div>
      </div>
      
      <div className="mt-2 text-xs text-cyan-600 dark:text-cyan-300 italic">
        This component accesses multiple properties but only re-renders when any of them change.
      </div>
    </div>
  );
});

// Component that accesses a single property
const NameOnlyMonitor = memo(() => {
  const [{ name }] = useBloc(FormBloc);
  const renderCount = useRenderCount();
  
  return (
    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200/30 dark:border-blue-700/30 mt-4">
      <div className="flex justify-between items-center">
        <div>
          <span className="text-xs text-gray-600 dark:text-gray-400">Name Value:</span>
          <span className="ml-2 text-sm font-medium text-blue-700 dark:text-blue-300">{name || '(empty)'}</span>
        </div>
        <div className="render-badge">
          <span className="text-xs py-1 px-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full font-mono">
            Renders: {renderCount}
          </span>
        </div>
      </div>
      <div className="mt-1 text-xs text-blue-600 dark:text-blue-300 italic">
        Only re-renders when name changes
      </div>
    </div>
  );
});

// Component that accesses a different single property
const EmailOnlyMonitor = memo(() => {
  const [{ email }] = useBloc(FormBloc);
  const renderCount = useRenderCount();
  
  return (
    <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200/30 dark:border-purple-700/30 mt-4">
      <div className="flex justify-between items-center">
        <div>
          <span className="text-xs text-gray-600 dark:text-gray-400">Email Value:</span>
          <span className="ml-2 text-sm font-medium text-purple-700 dark:text-purple-300">{email || '(empty)'}</span>
        </div>
        <div className="render-badge">
          <span className="text-xs py-1 px-2 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full font-mono">
            Renders: {renderCount}
          </span>
        </div>
      </div>
      <div className="mt-1 text-xs text-purple-600 dark:text-purple-300 italic">
        Only re-renders when email changes
      </div>
    </div>
  );
});

// Form validation toggle inside the form
const InlineValidationToggle = memo(() => {
  const [{ showIsEmailValid }, { toggleShowEmailValid }] = useBloc(FormBloc);
  const renderCount = useRenderCount();
  
  return (
    <div className="p-3 bg-fuchsia-50 dark:bg-fuchsia-900/20 rounded-lg border border-fuchsia-200/30 dark:border-fuchsia-700/30 mt-4">
      <div className="flex justify-between items-center">
        <button
          onClick={toggleShowEmailValid}
          className="text-sm text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-300/30 bg-fuchsia-500/5 hover:bg-fuchsia-500/10 px-3 py-1 rounded-md transition-all shadow-sm"
        >
          {showIsEmailValid ? 'Disable Validation' : 'Enable Validation'}
        </button>
        <div className="render-badge">
          <span className="text-xs py-1 px-2 bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-700 dark:text-fuchsia-300 rounded-full font-mono">
            Renders: {renderCount}
          </span>
        </div>
      </div>
      <div className="mt-1 text-xs text-fuchsia-600 dark:text-fuchsia-300 italic">
        Only re-renders when validation toggle changes
      </div>
    </div>
  );
});

// Component that compares Blac vs other state management
const ComparisonExample = memo(() => {
  return (
    <div className="mt-6 p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg border border-green-200/30 dark:border-green-700/30 shadow-md shadow-green-500/10">
      <h4 className="text-md font-bold text-gradient-green mb-3">Blac vs Other Libraries</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200/30 dark:border-green-700/30">
          <h5 className="text-sm font-bold text-green-800 dark:text-green-300 mb-2 flex items-center">
            <svg className="h-4 w-4 mr-1 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Blac (Automatic Dependency Detection)
          </h5>
          <CodeBlock code={`// No selectors needed
const [{ name, email }] = useBloc(FormBloc);

// Component only re-renders when name or email changes
return <div>{name} {email}</div>;`} />
          <p className="text-xs italic text-green-700 dark:text-green-300 mt-2">
            Blac automatically tracks which properties you use and only re-renders when those specific properties change.
          </p>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-900/20 p-3 rounded-lg border border-gray-200/30 dark:border-gray-700/30">
          <h5 className="text-sm font-bold text-gray-800 dark:text-gray-300 mb-2 flex items-center">
            <svg className="h-4 w-4 mr-1 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Other Libraries (Manual Selectors)
          </h5>
          <CodeBlock code={`// Must manually specify selectors
const name = useSelector(state => state.name);
const email = useSelector(state => state.email);

// Must define each selector separately or risk extra re-renders
return <div>{name} {email}</div>;`} />
          <p className="text-xs italic text-gray-700 dark:text-gray-300 mt-2">
            Other libraries require you to manually define selectors, which can be error-prone and verbose.
          </p>
        </div>
      </div>
    </div>
  );
});

// Component that uses the form and email validation
const MessageForm = memo(() => {
  const renderCount = useRenderCount();
  const [{ showIsEmailValid }] = useBloc(FormBloc);

  return (
    <div className="mb-4 bg-white/50 dark:bg-gray-800/50 rounded-lg p-5 border border-blue-200/30 dark:border-blue-700/30 shadow-lg shadow-blue-500/10">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold text-gradient-blue">Interactive Demo Form</h3>
        <div className="render-badge">
          <span className="text-xs py-1 px-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full font-mono">
            Form Renders: {renderCount}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Input fields with individual render tracking */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <FieldInput name="name" type="text" label="Name" />
            <NameOnlyMonitor />
          </div>
          <div>
            <FieldInput name="email" type="email" label="Email" />
            <EmailOnlyMonitor />
          </div>
        </div>
        
        <FieldInput name="message" type="text" label="Message" />
        
        {/* Duplicate email validation toggle inside the form */}
        <InlineValidationToggle />
        
        {/* Always show validation state (conditionally dependent on email) */}
        <EmailValidation />
        <FormStatus />
        
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200/30 dark:border-yellow-700/30 mt-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            <span className="font-bold">Pro Tip:</span> Try changing different fields and notice how only the components that use those fields re-render. The render count badges update only for affected components.
          </p>
        </div>
        
        <div className="space-y-3 mt-6">
          <h4 className="text-sm font-bold text-gradient-blue">Preferences</h4>
          
          <FieldInput 
            name="marketingEmails" 
            type="checkbox" 
            label="Receive marketing emails" 
          />
          
          <FieldInput 
            name="enableNotifications" 
            type="checkbox" 
            label="Enable notifications" 
          />
          
          <div className="pt-1">
            <FieldInput 
              name="themePreference" 
              type="select" 
              label="Theme preference" 
            />
          </div>
        </div>
      </div>
      
      {/* Monitor that shows values and re-renders for multiple properties */}
      <RenderCountMonitor />
      
      {/* Comparison with other libraries */}
      <ComparisonExample />
    </div>
  );
});

// Component with validation toggle - doesn't depend on email or its validity
const ValidationToggle = memo(() => {
  const [{ showIsEmailValid }, { toggleShowEmailValid }] = useBloc(FormBloc);
  const renderCount = useRenderCount();
  
  return (
    <div className="mb-6 relative">
      <div className="flex items-center justify-between">
        <button
          onClick={toggleShowEmailValid}
          className="btn-neon-purple px-4 py-1.5 rounded-md border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 transition-all shadow-sm shadow-purple-500/20 text-sm"
        >
          {showIsEmailValid ? 'Disable Email Validation' : 'Enable Email Validation'}
        </button>
        <div className="render-badge">
          <span className="text-xs py-1 px-2 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-full font-mono">
            Renders: {renderCount}
          </span>
        </div>
      </div>
      <div className="mt-2 text-sm text-purple-600 dark:text-purple-300 italic">
        This component only re-renders when the validation toggle changes
      </div>
    </div>
  );
});

// Component that uses isFormValid computed property
const FormStatus = memo(() => {
  const [, bloc] = useBloc(FormBloc);
  const renderCount = useRenderCount();
  
  return (
    <div className="mb-6 relative">
      <div className="flex justify-between items-center">
        <div className={`px-3 py-1 rounded-md text-sm ${
          bloc.isFormValid 
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
        }`}>
          {bloc.isFormValid 
            ? 'Form is valid and ready to submit!' 
            : 'Please fill out all required fields'}
        </div>
        <div className="render-badge">
          <span className="text-xs py-1 px-2 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full font-mono">
            Renders: {renderCount}
          </span>
        </div>
      </div>
      <div className="mt-2 text-sm text-blue-600 dark:text-blue-300 italic">
        This component uses the computed isFormValid property and re-renders when any validation changes
      </div>
    </div>
  );
});

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm shadow-inner">
      <code>{code}</code>
    </pre>
  );
}

function FeatureSection({ title, children, icon, color = 'blue' }: { 
  title: string; 
  children: React.ReactNode;
  icon: React.ReactNode;
  color?: 'blue' | 'green' | 'purple' | 'cyan';
}) {
  const [isOpen, setIsOpen] = useState(true);
  
  const colorClasses = {
    blue: {
      card: 'card-neon-blue shadow-blue-500/20',
      title: 'text-gradient-blue',
      badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
      button: 'text-blue-700 dark:text-blue-300 hover:bg-blue-100/50 dark:hover:bg-blue-900/20'
    },
    green: {
      card: 'card-neon-green shadow-green-500/20',
      title: 'text-gradient-green',
      badge: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300',
      button: 'text-green-700 dark:text-green-300 hover:bg-green-100/50 dark:hover:bg-green-900/20'
    },
    purple: {
      card: 'card-neon-fuchsia shadow-fuchsia-500/20',
      title: 'text-gradient-fuchsia',
      badge: 'bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-700 dark:text-fuchsia-300',
      button: 'text-fuchsia-700 dark:text-fuchsia-300 hover:bg-fuchsia-100/50 dark:hover:bg-fuchsia-900/20'
    },
    cyan: {
      card: 'card-neon-cyan shadow-cyan-500/20',
      title: 'text-gradient-cyan',
      badge: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300',
      button: 'text-cyan-700 dark:text-cyan-300 hover:bg-cyan-100/50 dark:hover:bg-cyan-900/20'
    }
  };
  
  return (
    <div className={`${colorClasses[color].card} p-5 rounded-xl mb-8 shadow-lg`}>
      <div className="flex items-center">
        <div className="mr-3 text-xl">{icon}</div>
        <h2 className={`text-xl font-bold ${colorClasses[color].title}`}>{title}</h2>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className={`ml-auto p-2 rounded-full transition-all ${colorClasses[color].button}`}
        >
          {isOpen ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 011.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </div>
      
      {isOpen && (
        <div className="mt-4">
          {children}
        </div>
      )}
    </div>
  );
}

function RouteComponent() {
  return (
    <div className="space-y-6">
      <section className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-6 text-gradient-multi animate-text-shimmer">
          Smart Form Management with Blac
        </h1>
        <p className="text-xl dark:text-cyan-100/90 text-slate-700 max-w-3xl mx-auto">
          Say goodbye to excessive re-renders and complex state management. Blac's intelligent dependency tracking makes form handling a breeze.
        </p>
      </section>
    
      <FeatureSection 
        title="Intelligent Re-rendering" 
        color="blue"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        }
      >
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          With Blac's granular dependency tracking, components only re-render when the specific data they use changes. This results in faster forms, smoother user experiences, and less wasted rendering cycles.
        </p>
        
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mb-4 border border-blue-200/30 dark:border-blue-800/30">
          <h3 className="text-md font-semibold text-blue-700 dark:text-blue-300 mb-2">No Manual Selectors Required</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
            Unlike other state management libraries, Blac doesn't require you to manually define selectors to prevent unnecessary re-renders. It automatically tracks which properties are used by each component.
          </p>
        </div>
        
        <CodeBlock code={`// With Blac: Component only re-renders when name changes
const [{ name }] = useBloc(FormBloc);
return <div>{name}</div>;

// With other libraries: Must manually define a selector
const name = useSelector(state => state.name); // Manual work required
return <div>{name}</div>;`}/>
      </FeatureSection>
      
      <FeatureSection 
        title="Computed Properties & Derived State"
        color="green"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        }
      >
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          Blac makes it easy to create computed properties that automatically update when their dependencies change. This eliminates manual state derivation and keeps your UI in sync with your data.
        </p>
        
        <CodeBlock code={`// Simple computed property in your Bloc
get emailIsValid() {
  return this.state.email.includes('@');
}

// More complex computed property that depends on multiple fields
get isFormValid() {
  return this.emailIsValid && this.nameIsValid && this.state.message.length > 0;
}`}/>
        
        <div className="mt-4">
          <FormStatus />
        </div>
      </FeatureSection>
      
      <FeatureSection 
        title="Try It Yourself" 
        color="cyan"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
          </svg>
        }
      >
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          Interact with the form below and watch how Blac intelligently manages re-renders. Notice that components only update when their specific dependencies change.
        </p>
        
        <MessageForm />
        <FormActions />
      </FeatureSection>
      
      <FeatureSection 
        title="Selective State Updates"
        color="purple"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-fuchsia-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        }
      >
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          Toggle features and watch how components respond only to relevant state changes. Blac's selective update system ensures components are only notified about changes they care about.
        </p>
        
        <div className="mt-4">
          <ValidationToggle />
        </div>
        
        <div className="bg-fuchsia-50 dark:bg-fuchsia-900/20 p-4 rounded-lg mt-4 border border-fuchsia-200/30 dark:border-fuchsia-800/30">
          <h3 className="text-md font-semibold text-fuchsia-700 dark:text-fuchsia-300 mb-2">How it works:</h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            When email validation is disabled, the validation component stops tracking the email field entirely. You can change the email field and the validation component won't re-render.
          </p>
        </div>
      </FeatureSection>
      
      <FeatureSection 
        title="Custom Dependency Selection"
        color="blue"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        }
      >
        <p className="mb-4 text-gray-600 dark:text-gray-300">
          For advanced cases, Blac still gives you explicit control with custom dependency selectors. This is rarely needed but available when you want complete control.
        </p>
        
        <CodeBlock code={`// Custom dependency selector for advanced use cases
const [formData] = useBloc(FormBloc, {
  dependencySelector: (state) => [
    [state.submissionCount, state.lastSubmitted]
  ]
});

// This component only re-renders when submission data changes`}/>
        
        <div className="mt-4">
          <SubmissionStats />
        </div>
      </FeatureSection>

      <section className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-6 rounded-xl border border-blue-200/30 dark:border-blue-800/30 mb-8">
        <h2 className="text-xl font-bold text-gradient-blue mb-3">Why Choose Blac for Forms?</h2>
        
        <ul className="space-y-3 mb-6">
          <li className="flex items-start">
            <svg className="h-5 w-5 text-blue-500 mr-2 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-700 dark:text-gray-300">
              <strong className="text-blue-700 dark:text-blue-300">Zero configuration selectors</strong>: Unlike other libraries that require manual selectors, Blac automatically tracks dependencies.
            </span>
          </li>
          <li className="flex items-start">
            <svg className="h-5 w-5 text-blue-500 mr-2 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-700 dark:text-gray-300">
              <strong className="text-blue-700 dark:text-blue-300">Clean architecture</strong>: Separate business logic from UI components with the Bloc pattern.
            </span>
          </li>
          <li className="flex items-start">
            <svg className="h-5 w-5 text-blue-500 mr-2 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-700 dark:text-gray-300">
              <strong className="text-blue-700 dark:text-blue-300">Built-in memoization</strong>: No need for manual useMemo or useCallback in most cases.
            </span>
          </li>
          <li className="flex items-start">
            <svg className="h-5 w-5 text-blue-500 mr-2 mt-0.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="text-gray-700 dark:text-gray-300">
              <strong className="text-blue-700 dark:text-blue-300">TypeScript integration</strong>: Full type safety for your form state and validation.
            </span>
          </li>
        </ul>
        
        <div className="flex justify-center mt-6">
          <a 
            href="https://github.com/jsnanigans/blac" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn-neon-blue px-5 py-2 rounded-md border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-all shadow-sm shadow-blue-500/20 inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.167 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.841-2.337 4.687-4.565 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
            </svg>
            Explore Blac on GitHub
          </a>
        </div>
      </section>

      <div className="form-demo-global-styles">
        <style dangerouslySetInnerHTML={{ __html: `
          .render-badge {
            position: relative;
            display: inline-block;
          }
        ` }} />
      </div>
    </div>
  );
}
