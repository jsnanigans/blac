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
  ({ name, type }: { name: keyof FormData; type: string }) => {
    const [formData, { handleChange }] = useBloc(FormBloc);
    const renderCount = useRenderCount();

    return (
      <label className="block border border-black my-2 p-2">
        {name}
        <input
          type={type}
          name={name}
          value={String(formData[name])}
          onChange={handleChange}
          className="border border-black m-2 p-1"
        />
        (render count: {renderCount})
      </label>
    );
  },
);

function RouteComponent() {
  const renderCount = useRenderCount();
  const [{ showIsEmailValid }, bloc] = useBloc(FormBloc);
  return (
    <>
      <form
        className="block border border-black m-2 p-2"
        onSubmit={(e) => e.preventDefault()}
      >
        <h1>Form (render count: {renderCount})</h1>
        <button
          onClick={bloc.toggleShowEmailValid}
          className={[
            'border p-2',
            showIsEmailValid ? 'border-green-500' : 'border-red-500',
          ].join(' ')}
        >
          {showIsEmailValid ? (
            <>Email is valid: {bloc.emailIsValid ? 'true' : 'false'}</>
          ) : (
            <>Email is valid: (not listening)</>
          )}
        </button>
        <MyInput name="name" type="text" />
        <MyInput name="email" type="email" />
        <MyInput name="message" type="text" />
        <button
          type="button"
          onClick={bloc.reset}
          className="border border-black p-1"
        >
          reset
        </button>
      </form>
    </>
  );
}
