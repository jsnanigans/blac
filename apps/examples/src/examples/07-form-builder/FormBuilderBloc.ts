import { Cubit } from '@blac/core';
import type {
  FormBuilderState,
  FormField,
  FieldType,
  ValidationRule,
} from './types';

export class FormBuilderBloc extends Cubit<FormBuilderState> {
  constructor() {
    super({
      fields: [],
      selectedFieldId: null,
      mode: 'edit',
      previewValues: {},
      history: [[]],
      historyIndex: 0,
    });

    this.onDispose = () => {
      console.log('[FormBuilderBloc] Disposed');
    };
  }

  // Field Management

  addField = (type: FieldType) => {
    const newField: FormField = {
      id: crypto.randomUUID(),
      type,
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
      placeholder: '',
      validationRules: [],
    };

    const newFields = [...this.state.fields, newField];
    this.updateFieldsWithHistory(newFields);
    this.patch({ selectedFieldId: newField.id });
  };

  removeField = (fieldId: string) => {
    const newFields = this.state.fields.filter((f) => f.id !== fieldId);
    this.updateFieldsWithHistory(newFields);

    if (this.state.selectedFieldId === fieldId) {
      this.patch({ selectedFieldId: null });
    }
  };

  updateField = (fieldId: string, updates: Partial<FormField>) => {
    const newFields = this.state.fields.map((field) =>
      field.id === fieldId ? { ...field, ...updates } : field,
    );
    this.updateFieldsWithHistory(newFields);
  };

  moveField = (fromIndex: number, toIndex: number) => {
    const newFields = [...this.state.fields];
    const [movedField] = newFields.splice(fromIndex, 1);
    newFields.splice(toIndex, 0, movedField);
    this.updateFieldsWithHistory(newFields);
  };

  // Selection

  selectField = (fieldId: string | null) => {
    this.patch({ selectedFieldId: fieldId });
  };

  // Validation Rules

  addValidationRule = (fieldId: string, rule: ValidationRule) => {
    const field = this.state.fields.find((f) => f.id === fieldId);
    if (!field) return;

    this.updateField(fieldId, {
      validationRules: [...field.validationRules, rule],
    });
  };

  removeValidationRule = (fieldId: string, ruleIndex: number) => {
    const field = this.state.fields.find((f) => f.id === fieldId);
    if (!field) return;

    const newRules = field.validationRules.filter((_, i) => i !== ruleIndex);
    this.updateField(fieldId, { validationRules: newRules });
  };

  // Mode Management

  setMode = (mode: 'edit' | 'preview') => {
    this.patch({ mode });

    // Initialize preview values when entering preview mode
    if (mode === 'preview') {
      const previewValues: Record<string, any> = {};
      this.state.fields.forEach((field) => {
        previewValues[field.id] = field.defaultValue ?? '';
      });
      this.patch({ previewValues });
    }
  };

  updatePreviewValue = (fieldId: string, value: any) => {
    this.patch({
      previewValues: {
        ...this.state.previewValues,
        [fieldId]: value,
      },
    });
  };

  // History Management (Undo/Redo)

  private updateFieldsWithHistory = (newFields: FormField[]) => {
    // Truncate history after current index
    const newHistory = this.state.history.slice(0, this.state.historyIndex + 1);

    // Add new state to history
    newHistory.push(newFields);

    // Limit history size to 50 steps
    if (newHistory.length > 50) {
      newHistory.shift();
    }

    this.patch({
      fields: newFields,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    });
  };

  undo = () => {
    if (this.state.historyIndex > 0) {
      const newIndex = this.state.historyIndex - 1;
      this.patch({
        fields: this.state.history[newIndex],
        historyIndex: newIndex,
      });
    }
  };

  redo = () => {
    if (this.state.historyIndex < this.state.history.length - 1) {
      const newIndex = this.state.historyIndex + 1;
      this.patch({
        fields: this.state.history[newIndex],
        historyIndex: newIndex,
      });
    }
  };

  // Export/Import

  exportToJSON = (): string => {
    return JSON.stringify(
      {
        version: '1.0',
        fields: this.state.fields,
      },
      null,
      2,
    );
  };

  importFromJSON = (json: string) => {
    try {
      const data = JSON.parse(json);
      if (data.fields && Array.isArray(data.fields)) {
        this.updateFieldsWithHistory(data.fields);
      }
    } catch (error) {
      console.error('Failed to import JSON:', error);
    }
  };

  // Getters

  get selectedField(): FormField | null {
    if (!this.state.selectedFieldId) return null;
    return (
      this.state.fields.find((f) => f.id === this.state.selectedFieldId) ?? null
    );
  }

  get canUndo(): boolean {
    return this.state.historyIndex > 0;
  }

  get canRedo(): boolean {
    return this.state.historyIndex < this.state.history.length - 1;
  }

  get fieldCount(): number {
    return this.state.fields.length;
  }

  // Validation logic for preview mode
  validateField = (field: FormField, value: any): string[] => {
    const errors: string[] = [];

    field.validationRules.forEach((rule) => {
      switch (rule.type) {
        case 'required':
          if (!value || value === '') {
            errors.push(rule.message || 'This field is required');
          }
          break;

        case 'minLength':
          if (
            typeof value === 'string' &&
            value.length < (rule.value as number)
          ) {
            errors.push(
              rule.message || `Minimum length is ${rule.value} characters`,
            );
          }
          break;

        case 'maxLength':
          if (
            typeof value === 'string' &&
            value.length > (rule.value as number)
          ) {
            errors.push(
              rule.message || `Maximum length is ${rule.value} characters`,
            );
          }
          break;

        case 'pattern':
          if (typeof value === 'string' && rule.value) {
            const regex = new RegExp(rule.value as string);
            if (!regex.test(value)) {
              errors.push(rule.message || 'Invalid format');
            }
          }
          break;
      }
    });

    return errors;
  };

  get previewErrors(): Record<string, string[]> {
    const errors: Record<string, string[]> = {};

    this.state.fields.forEach((field) => {
      const value = this.state.previewValues[field.id];
      const fieldErrors = this.validateField(field, value);

      if (fieldErrors.length > 0) {
        errors[field.id] = fieldErrors;
      }
    });

    return errors;
  }
}
