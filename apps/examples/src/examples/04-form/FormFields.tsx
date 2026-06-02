import { FormField, TermsField, type FieldConfig } from './FormField';

// Each field declares which per-field error getter it tracks (if any). The
// container itself reads no state — every field re-renders independently.
const FIELDS: FieldConfig[] = [
  {
    field: 'name',
    label: 'Name',
    placeholder: 'Your name',
    error: (b) => b.nameError,
  },
  {
    field: 'email',
    label: 'Email',
    type: 'email',
    placeholder: 'you@example.com',
    error: (b) => b.emailError,
  },
  {
    field: 'password',
    label: 'Password',
    type: 'password',
    placeholder: 'At least 8 characters',
    error: (b) => b.passwordError,
  },
  {
    field: 'confirmPassword',
    label: 'Confirm Password',
    type: 'password',
    placeholder: 'Repeat password',
    error: (b) => b.confirmPasswordError,
  },
  {
    field: 'bio',
    label: 'Bio (optional)',
    placeholder: 'Tell us about yourself',
    multiline: true,
  },
];

export function FormFields({ formId }: { formId: string }) {
  return (
    <div className="form-grid">
      {FIELDS.map((config) => (
        <FormField key={config.field} formId={formId} config={config} />
      ))}
      <TermsField formId={formId} />
    </div>
  );
}
