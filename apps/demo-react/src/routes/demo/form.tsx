import { useBloc } from '@blac/react';
import { createFileRoute } from '@tanstack/react-router';
import { useRenderCount } from '@uidotdev/usehooks';
import { Cubit } from 'blac-next';
import { memo } from 'react';

export const Route = createFileRoute('/demo/form')({
  component: RouteComponent,
});

type FormData = {
  message: string;
  name: string;
  email: string;
  showIsEmailValid: boolean;
};

class FormBloc extends Cubit<FormData> {
  constructor() {
    super({ message: 'Hi mom', name: '', email: '', showIsEmailValid: true });
  }

  handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    if (name in this.state) {
      this.patch({ [name]: value });
    }
  };

  reset = () => {
    this.patch({ message: '', name: '', email: '' });
  };

  toggleShowEmailValid = () => {
    this.patch({ showIsEmailValid: !this.state.showIsEmailValid });
  };

  get emailIsValid() {
    return this.state.email.includes('@');
  }
}

const MyInput = memo(
  ({ name, type, label }: { name: keyof FormData; type: string; label?: string }) => {
    const [formData, { handleChange }] = useBloc(FormBloc);
    const renderCount = useRenderCount();

    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-foreground dark:text-gray-100 mb-1">
          {label || name}
        </label>
        <div className="relative">
          <input
            type={type}
            name={name}
            value={String(formData[name])}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-border dark:border-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-accent/50 text-foreground dark:text-gray-100"
          />
        </div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Render count: {renderCount}
        </div>
      </div>
    );
  },
);

function RouteComponent() {
  const renderCount = useRenderCount();
  const [{ showIsEmailValid }, bloc] = useBloc(FormBloc);
  
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 text-foreground dark:text-gray-100">Form Demo</h1>
        <p className="text-gray-600 dark:text-gray-300">
          This form demonstrates how blac optimizes component rendering. Each field only re-renders when its own value changes.
        </p>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          Form component render count: {renderCount}
        </div>
      </div>
      
      <form 
        className="card" 
        onSubmit={(e) => e.preventDefault()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-foreground dark:text-gray-100">Contact Form</h2>
          <button
            type="button"
            onClick={bloc.toggleShowEmailValid}
            className={showIsEmailValid 
              ? 'px-3 py-1 text-sm rounded-md bg-green-100 text-green-800 border border-green-200 dark:bg-green-900 dark:text-green-100 dark:border-green-800' 
              : 'px-3 py-1 text-sm rounded-md bg-gray-100 text-gray-800 border border-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600'
            }
          >
            {showIsEmailValid ? (
              <>Email Validation: {bloc.emailIsValid ? 'Valid ✓' : 'Invalid ✗'}</>
            ) : (
              <>Email Validation: Disabled</>
            )}
          </button>
        </div>
        
        <div className="space-y-4">
          <MyInput name="name" type="text" label="Full Name" />
          <MyInput name="email" type="email" label="Email Address" />
          <MyInput name="message" type="text" label="Message" />
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={bloc.reset}
            className="btn btn-outline mr-2"
          >
            Reset
          </button>
          <button type="submit" className="btn btn-primary">
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}
