import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

/**
 * Simple input component with optional label and error message.
 */
export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="stack-xs">
      {label && <label className="text-small text-bold">{label}</label>}
      <input className={className} {...props} />
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}

interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

/**
 * Simple textarea component with optional label and error message.
 */
export function Textarea({
  label,
  error,
  className = '',
  ...props
}: TextareaProps) {
  return (
    <div className="stack-xs">
      {label && <label className="text-small text-bold">{label}</label>}
      <textarea className={className} {...props} />
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string; label: string }>;
}

/**
 * Simple select component with optional label and error message.
 */
export function Select({
  label,
  error,
  options,
  className = '',
  ...props
}: SelectProps) {
  return (
    <div className="stack-xs">
      {label && <label className="text-small text-bold">{label}</label>}
      <select className={className} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
