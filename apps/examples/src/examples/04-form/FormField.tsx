import { useBloc } from '@blac/react';
import { FormCubit } from './FormCubit';
import { Input, Textarea, RenderCounter } from '../../shared/components';

type TextFieldName = 'name' | 'email' | 'password' | 'confirmPassword' | 'bio';

/** The (readonly) bloc handle `useBloc` returns for FormCubit. */
type FormBloc = ReturnType<typeof useBloc<typeof FormCubit>>[1];

export interface FieldConfig {
  field: TextFieldName;
  label: string;
  type?: 'text' | 'email' | 'password';
  placeholder?: string;
  multiline?: boolean;
  /**
   * Reads a per-field error *getter* off the bloc (e.g. `b.nameError`). Getters
   * run through the render tracking proxy, so the field only re-renders when
   * the slice that getter reads actually changes. Optional fields (bio) omit it.
   */
  error?: (bloc: FormBloc) => string | undefined;
}

/**
 * One form field = one component = one `useBloc` call reading only that field's
 * slice. Typing in "name" re-renders the Name field alone — Email, Password,
 * progress, and summary all stay still (watch the RenderCounter badges).
 */
export function FormField({
  formId,
  config,
}: {
  formId: string;
  config: FieldConfig;
}) {
  const [state, bloc] = useBloc(FormCubit, { args: { id: formId } });
  const fieldState = state[config.field];
  const error =
    config.error && fieldState.touched ? config.error(bloc) : undefined;

  return (
    <div style={{ position: 'relative' }}>
      <RenderCounter name={`Field:${config.field}`} />
      {config.multiline ? (
        <Textarea
          label={config.label}
          value={fieldState.value}
          placeholder={config.placeholder}
          rows={3}
          onChange={(e) => bloc.setField(config.field, e.target.value)}
          onBlur={() => bloc.touchField(config.field)}
        />
      ) : (
        <Input
          label={config.label}
          type={config.type}
          value={fieldState.value}
          placeholder={config.placeholder}
          error={error}
          onChange={(e) => bloc.setField(config.field, e.target.value)}
          onBlur={() => bloc.touchField(config.field)}
        />
      )}
    </div>
  );
}

/**
 * The terms checkbox reads only `state.agreeToTerms`, isolated from the text
 * fields above it.
 */
export function TermsField({ formId }: { formId: string }) {
  const [state, bloc] = useBloc(FormCubit, { args: { id: formId } });
  return (
    <div style={{ position: 'relative' }}>
      <RenderCounter name="Field:terms" />
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '0.875rem',
        }}
      >
        <input
          type="checkbox"
          checked={state.agreeToTerms}
          onChange={bloc.toggleTerms}
          style={{ width: 'auto' }}
        />
        I agree to the terms and conditions
      </label>
    </div>
  );
}
