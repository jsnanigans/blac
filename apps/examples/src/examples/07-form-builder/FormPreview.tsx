import { useBloc } from '@blac/react';
import { FormBuilderBloc } from './FormBuilderBloc';
import {
  Card,
  Button,
  Input,
  Alert,
  RenderCounter,
} from '../../shared/components';

export function FormPreview() {
  const [state, formBuilder] = useBloc(FormBuilderBloc);

  console.log('[FormPreview] Rendering');

  const errors = formBuilder.previewErrors;
  const hasErrors = Object.keys(errors).length > 0;

  return (
    <Card>
      <div className="stack-md">
        <div className="flex-between">
          <h2>Form Preview</h2>
          <RenderCounter name="Preview" />
        </div>

        {state.fields.length === 0 ? (
          <div className="empty-state">Add fields to see preview</div>
        ) : (
          <form className="stack-md">
            {state.fields.map((field) => {
              const value = state.previewValues[field.id] ?? '';
              const fieldErrors = errors[field.id] || [];

              return (
                <div key={field.id} className="stack-xs">
                  <Input
                    label={field.label}
                    type={field.type as any}
                    placeholder={field.placeholder}
                    value={value}
                    onChange={(e) =>
                      formBuilder.updatePreviewValue(field.id, e.target.value)
                    }
                    error={fieldErrors[0]}
                  />

                  {fieldErrors.length > 1 && (
                    <div className="stack-xs">
                      {fieldErrors.slice(1).map((err, i) => (
                        <p key={i} className="text-xs text-danger">
                          {err}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            <Button type="button" variant="primary" disabled={hasErrors}>
              Submit (Validation: {hasErrors ? 'Failed' : 'Passed'})
            </Button>

            {hasErrors && (
              <Alert variant="danger">
                Please fix {Object.keys(errors).length} field error(s)
              </Alert>
            )}
          </form>
        )}

        <p className="text-xs text-muted">
          💡 Validation is computed via getter - no manual optimization needed
        </p>
      </div>
    </Card>
  );
}
