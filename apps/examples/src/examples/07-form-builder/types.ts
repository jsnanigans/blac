export type FieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'select'
  | 'checkbox'
  | 'textarea';

export interface ValidationRule {
  type: 'required' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  value?: string | number;
  message: string;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  defaultValue?: string | number | boolean;
  options?: string[]; // For select fields
  validationRules: ValidationRule[];
  conditionalDisplay?: {
    fieldId: string;
    operator: 'equals' | 'notEquals' | 'contains';
    value: string | number | boolean;
  };
}

export interface FormBuilderState {
  fields: FormField[];
  selectedFieldId: string | null;
  mode: 'edit' | 'preview';
  previewValues: Record<string, any>;
  history: FormField[][];
  historyIndex: number;
}
