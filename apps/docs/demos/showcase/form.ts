/**
 * Showcase demo: Form with validation
 *
 * Shows: Cubit managing field values + touched state, derived getters for
 * per-field errors and overall validity, progress tracking.
 *
 * All exports are plain strings (no runtime imports) so this module is
 * SSR-safe and can be imported anywhere in VitePress.
 */

export const formCubitTs = `import { Cubit } from '@blac/core';

interface FieldState {
  value: string;
  touched: boolean;
}

export interface FormState {
  name: FieldState;
  email: FieldState;
  password: FieldState;
}

const field = (value = ''): FieldState => ({ value, touched: false });

export class FormCubit extends Cubit<FormState> {
  constructor() {
    super({
      name: field(),
      email: field(),
      password: field(),
    });
  }

  setField = (key: keyof FormState, value: string) => {
    this.patch({ [key]: { value, touched: this.state[key].touched } } as Partial<FormState>);
  };

  touchField = (key: keyof FormState) => {
    this.patch({ [key]: { ...this.state[key], touched: true } } as Partial<FormState>);
  };

  reset = () =>
    this.emit({ name: field(), email: field(), password: field() });

  get errors(): Partial<Record<keyof FormState, string>> {
    const { name, email, password } = this.state;
    const errs: Partial<Record<keyof FormState, string>> = {};

    if (!name.value.trim()) errs.name = 'Name is required';
    else if (name.value.trim().length < 2) errs.name = 'At least 2 characters';

    if (!email.value.trim()) errs.email = 'Email is required';
    else if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email.value))
      errs.email = 'Invalid email address';

    if (!password.value) errs.password = 'Password is required';
    else if (password.value.length < 8) errs.password = 'At least 8 characters';

    return errs;
  }

  get isValid(): boolean {
    return Object.keys(this.errors).length === 0;
  }

  get progress(): number {
    let filled = 0;
    if (this.state.name.value.trim()) filled++;
    if (this.state.email.value.trim()) filled++;
    if (this.state.password.value) filled++;
    return Math.round((filled / 3) * 100);
  }
}
`;

export const appTsx = `import { FormEvent } from 'react';
import { useBloc } from '@blac/react';
import { FormCubit, FormState } from './FormCubit';
import './styles.css';

function Field({
  label,
  fieldKey,
  type = 'text',
  placeholder,
}: {
  label: string;
  fieldKey: keyof FormState;
  type?: string;
  placeholder?: string;
}) {
  const [state, cubit] = useBloc(FormCubit);
  const field = state[fieldKey];
  const error = cubit.errors[fieldKey];
  const showError = field.touched && !!error;

  return (
    <div className="field">
      <label className="label">{label}</label>
      <input
        className={\`input\${showError ? ' input-error' : ''}\`}
        type={type}
        value={field.value}
        placeholder={placeholder}
        onChange={(e) => cubit.setField(fieldKey, e.target.value)}
        onBlur={() => cubit.touchField(fieldKey)}
      />
      {showError && <span className="error-msg">{error}</span>}
    </div>
  );
}

function ProgressBar() {
  const [, cubit] = useBloc(FormCubit);
  return (
    <div className="progress-wrap">
      <div className="progress-bar" style={{ width: \`\${cubit.progress}%\` }} />
    </div>
  );
}

export default function App() {
  const [, cubit] = useBloc(FormCubit);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    alert(cubit.isValid ? '✓ Form is valid — submitted!' : 'Please fix errors before submitting.');
  };

  return (
    <div className="demo">
      <h2>Registration form</h2>
      <p className="hint">
        <code>FormCubit</code> tracks field values, touched state, and
        validation. Errors appear only after a field is blurred.
      </p>

      <ProgressBar />

      <form onSubmit={onSubmit} noValidate>
        <Field label="Name" fieldKey="name" placeholder="Your name" />
        <Field label="Email" fieldKey="email" type="email" placeholder="you@example.com" />
        <Field label="Password" fieldKey="password" type="password" placeholder="8+ characters" />

        <div className="actions">
          <button type="button" className="btn-ghost" onClick={cubit.reset}>
            Reset
          </button>
          <button type="submit" className="btn-primary">
            Submit
          </button>
        </div>
      </form>
    </div>
  );
}
`;

export const stylesCss = `* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #ffffff;
  color: #1f2430;
}

.demo {
  padding: 20px;
  max-width: 400px;
  margin: 0 auto;
}

.demo h2 { margin: 0 0 6px; font-size: 20px; }

.hint {
  margin: 0 0 16px;
  font-size: 13px;
  color: #5a6373;
  line-height: 1.5;
}

.hint code {
  background: #eef0f4;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 12px;
}

.progress-wrap {
  height: 4px;
  background: #e2e5ec;
  border-radius: 2px;
  margin-bottom: 20px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: #3451b2;
  border-radius: 2px;
  transition: width 0.2s ease;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 14px;
}

.label {
  font-size: 13px;
  font-weight: 500;
  color: #3a4054;
}

.input {
  padding: 8px 12px;
  border: 1px solid #c8cdd8;
  border-radius: 8px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.15s;
}

.input:focus { border-color: #3451b2; }

.input-error { border-color: #e53e3e; }

.error-msg {
  font-size: 12px;
  color: #e53e3e;
}

.actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-top: 8px;
}

button {
  appearance: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
}

.btn-primary {
  background: #3451b2;
  color: #fff;
  border-color: #3451b2;
}

.btn-primary:hover { background: #2a3f8f; }

.btn-ghost {
  background: transparent;
  color: #5a6373;
  border-color: #e2e5ec;
}

.btn-ghost:hover { background: #f5f6f9; }
`;

/**
 * Pass directly to <BlacSandpack :files="formShowcaseFiles" />.
 */
export const formShowcaseFiles: Record<string, string> = {
  '/App.tsx': appTsx,
  '/FormCubit.ts': formCubitTs,
  '/styles.css': stylesCss,
};
