import { Cubit } from '@blac/core';

interface FieldState {
  value: string;
  touched: boolean;
}

export interface FormState {
  name: FieldState;
  email: FieldState;
  password: FieldState;
  confirmPassword: FieldState;
  bio: FieldState;
  agreeToTerms: boolean;
}

const emptyField = (): FieldState => ({ value: '', touched: false });

const initialState: FormState = {
  name: emptyField(),
  email: emptyField(),
  password: emptyField(),
  confirmPassword: emptyField(),
  bio: emptyField(),
  agreeToTerms: false,
};

type FieldName = 'name' | 'email' | 'password' | 'confirmPassword' | 'bio';

export class FormCubit extends Cubit<FormState> {
  constructor() {
    super({ ...initialState });
  }

  setField = (field: FieldName, value: string) => {
    this.patch({
      [field]: { value, touched: this.state[field].touched },
    } as Partial<FormState>);
  };

  touchField = (field: FieldName) => {
    this.patch({
      [field]: { ...this.state[field], touched: true },
    } as Partial<FormState>);
  };

  toggleTerms = () => {
    this.patch({ agreeToTerms: !this.state.agreeToTerms });
  };

  reset = () => {
    this.emit({ ...initialState });
  };

  get errors(): Record<string, string> {
    const s = this.state;
    const errs: Record<string, string> = {};

    if (!s.name.value.trim()) errs.name = 'Name is required';
    else if (s.name.value.trim().length < 2)
      errs.name = 'Name must be at least 2 characters';

    if (!s.email.value.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.email.value))
      errs.email = 'Invalid email address';

    if (!s.password.value) errs.password = 'Password is required';
    else if (s.password.value.length < 8)
      errs.password = 'Password must be at least 8 characters';

    if (s.confirmPassword.value !== s.password.value)
      errs.confirmPassword = 'Passwords do not match';

    if (!s.agreeToTerms) errs.terms = 'You must agree to the terms';

    return errs;
  }

  get isValid(): boolean {
    return Object.keys(this.errors).length === 0;
  }

  get completionPercent(): number {
    let filled = 0;
    const total = 6; // 5 fields + terms checkbox
    if (this.state.name.value.trim()) filled++;
    if (this.state.email.value.trim()) filled++;
    if (this.state.password.value) filled++;
    if (this.state.confirmPassword.value) filled++;
    if (this.state.bio.value.trim()) filled++;
    if (this.state.agreeToTerms) filled++;
    return Math.round((filled / total) * 100);
  }
}
