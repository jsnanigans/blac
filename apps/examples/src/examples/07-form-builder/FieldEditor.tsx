import { useBloc } from '@blac/react';
import { FormBuilderBloc } from './FormBuilderBloc';
import { Card, Button, Input, RenderCounter } from '../../shared/components';

export function FieldEditor() {
  const [state, formBuilder] = useBloc(FormBuilderBloc);

  console.log('[FieldEditor] Rendering');

  const selectedField = formBuilder.selectedField;

  if (!selectedField) {
    return (
      <Card>
        <div className="empty-state">Select a field to edit its properties</div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="stack-md">
        <div className="flex-between">
          <h2>Field Properties</h2>
          <RenderCounter name="Field Editor" />
        </div>

        <div className="stack-sm">
          {/* Label */}
          <Input
            label="Label"
            value={selectedField.label}
            onChange={(e) =>
              formBuilder.updateField(selectedField.id, {
                label: e.target.value,
              })
            }
          />

          {/* Placeholder */}
          <Input
            label="Placeholder"
            value={selectedField.placeholder || ''}
            onChange={(e) =>
              formBuilder.updateField(selectedField.id, {
                placeholder: e.target.value,
              })
            }
          />

          {/* Default Value */}
          <Input
            label="Default Value"
            value={String(selectedField.defaultValue || '')}
            onChange={(e) =>
              formBuilder.updateField(selectedField.id, {
                defaultValue: e.target.value,
              })
            }
          />

          {/* Validation Rules */}
          <div className="stack-sm">
            <h3 className="text-small">Validation Rules</h3>

            {selectedField.validationRules.length === 0 ? (
              <p className="text-small text-muted">No validation rules</p>
            ) : (
              <div className="stack-xs">
                {selectedField.validationRules.map((rule, index) => (
                  <div key={index} className="flex-between">
                    <span className="text-small">
                      {rule.type}
                      {rule.value && `: ${rule.value}`}
                    </span>
                    <Button
                      size="small"
                      variant="danger"
                      onClick={() =>
                        formBuilder.removeValidationRule(
                          selectedField.id,
                          index,
                        )
                      }
                    >
                      ✕
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="ghost"
              size="small"
              onClick={() =>
                formBuilder.addValidationRule(selectedField.id, {
                  type: 'required',
                  message: 'This field is required',
                })
              }
            >
              + Add "Required" Rule
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted">
          💡 Only re-renders when selected field changes
        </p>
      </div>
    </Card>
  );
}
