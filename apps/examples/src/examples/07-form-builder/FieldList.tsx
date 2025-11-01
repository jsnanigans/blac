import { useBloc } from '@blac/react';
import { FormBuilderBloc } from './FormBuilderBloc';
import { Button, Card, RenderCounter } from '../../shared/components';
import type { FieldType } from './types';

const FIELD_TYPES: { type: FieldType; label: string; icon: string }[] = [
  { type: 'text', label: 'Text', icon: '📝' },
  { type: 'email', label: 'Email', icon: '📧' },
  { type: 'number', label: 'Number', icon: '🔢' },
  { type: 'select', label: 'Select', icon: '📋' },
  { type: 'checkbox', label: 'Checkbox', icon: '☑️' },
  { type: 'textarea', label: 'Textarea', icon: '📄' },
];

export function FieldList() {
  const [state, formBuilder] = useBloc(FormBuilderBloc);

  console.log('[FieldList] Rendering');

  return (
    <Card>
      <div className="stack-md">
        <div className="flex-between">
          <h2>Form Fields ({formBuilder.fieldCount})</h2>
          <RenderCounter name="Field List" />
        </div>

        {/* Add field buttons */}
        <div className="stack-sm">
          <h3 className="text-small">Add Field</h3>
          <div className="grid grid-cols-3 gap-sm">
            {FIELD_TYPES.map(({ type, label, icon }) => (
              <Button
                key={type}
                variant="ghost"
                onClick={() => formBuilder.addField(type)}
              >
                {icon} {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Field list */}
        {state.fields.length === 0 ? (
          <div className="empty-state">
            No fields yet. Add a field to get started!
          </div>
        ) : (
          <div className="stack-sm">
            {state.fields.map((field, index) => (
              <div
                key={field.id}
                className={`field-item ${
                  state.selectedFieldId === field.id ? 'selected' : ''
                }`}
                onClick={() => formBuilder.selectField(field.id)}
              >
                <div className="flex-between">
                  <div className="stack-xs">
                    <strong>{field.label}</strong>
                    <span className="text-small text-muted">
                      {field.type}
                      {field.validationRules.length > 0 &&
                        ` • ${field.validationRules.length} rules`}
                    </span>
                  </div>

                  <div className="row-xs">
                    {/* Move buttons */}
                    {index > 0 && (
                      <Button
                        size="small"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          formBuilder.moveField(index, index - 1);
                        }}
                        aria-label="Move up"
                      >
                        ↑
                      </Button>
                    )}
                    {index < state.fields.length - 1 && (
                      <Button
                        size="small"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          formBuilder.moveField(index, index + 1);
                        }}
                        aria-label="Move down"
                      >
                        ↓
                      </Button>
                    )}
                    <Button
                      size="small"
                      variant="danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        formBuilder.removeField(field.id);
                      }}
                      aria-label="Delete field"
                    >
                      ✕
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted">
          💡 Click a field to edit its properties
        </p>
      </div>
    </Card>
  );
}
