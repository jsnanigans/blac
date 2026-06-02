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

export type FormArgs = { id: string };

export class FormCubit extends Cubit<FormState, FormArgs> {
  static key = (a: FormArgs) => a.id;

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

  // Per-field error getters. Each reads only the field(s) it validates, so a
  // FormField component reading `bloc.nameError` re-renders only when `name`
  // changes — confirmPassword re-renders when either it or `password` changes.
  // (A method like `errorFor(field)` would NOT work for tracking: methods read
  // live untracked state, whereas getters run through the render tracking proxy.)
  get nameError(): string | undefined {
    const v = this.state.name.value;
    if (!v.trim()) return 'Name is required';
    if (v.trim().length < 2) return 'Name must be at least 2 characters';
    return undefined;
  }

  get emailError(): string | undefined {
    const v = this.state.email.value;
    if (!v.trim()) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Invalid email address';
    return undefined;
  }

  get passwordError(): string | undefined {
    const v = this.state.password.value;
    if (!v) return 'Password is required';
    if (v.length < 8) return 'Password must be at least 8 characters';
    return undefined;
  }

  get confirmPasswordError(): string | undefined {
    if (this.state.confirmPassword.value !== this.state.password.value)
      return 'Passwords do not match';
    return undefined;
  }

  get errors(): Record<string, string> {
    const errs: Record<string, string> = {};
    if (this.nameError) errs.name = this.nameError;
    if (this.emailError) errs.email = this.emailError;
    if (this.passwordError) errs.password = this.passwordError;
    if (this.confirmPasswordError)
      errs.confirmPassword = this.confirmPasswordError;
    if (!this.state.agreeToTerms) errs.terms = 'You must agree to the terms';
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
