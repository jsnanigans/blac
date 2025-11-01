export type AccountType = 'personal' | 'business';

export interface WizardData {
  // Step 1: Personal Info
  firstName: string;
  lastName: string;
  email: string;

  // Step 2: Account Type
  accountType: AccountType | null;

  // Step 3: Business Info (conditional)
  companyName?: string;
  taxId?: string;
  industry?: string;

  // Step 4: Preferences
  newsletter: boolean;
  notifications: boolean;
  theme: 'light' | 'dark' | 'system';
}

export interface WizardState {
  currentStep: number;
  data: WizardData;
  validationErrors: Record<string, string[]>;
  isSubmitting: boolean;
  submitSuccess: boolean;
  submitError: string | null;
}

export type StepId =
  | 'personal-info'
  | 'account-type'
  | 'business-info'
  | 'preferences'
  | 'review';
