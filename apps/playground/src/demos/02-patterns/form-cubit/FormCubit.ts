import { Cubit } from '@blac/core';

export interface FormState {
  name: string;
  email: string;
  isSubmitting: boolean;
  submitSuccess: boolean;
  submitError: string | null;
}

export class FormCubit extends Cubit<FormState> {
  constructor() {
    super({
      name: '',
      email: '',
      isSubmitting: false,
      submitSuccess: false,
      submitError: null,
    });
  }

  // Field setters using arrow functions for proper this binding
  setName = (name: string) => {
    this.emit({
      ...this.state,
      name,
      submitError: null, // Clear error on field change
    });
  };

  setEmail = (email: string) => {
    this.emit({
      ...this.state,
      email,
      submitError: null, // Clear error on field change
    });
  };

  // Validation getters
  get isNameValid(): boolean {
    return this.state.name.trim().length >= 2;
  }

  get isEmailValid(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.state.email);
  }

  get isFormValid(): boolean {
    return this.isNameValid && this.isEmailValid;
  }

  // Async submit with simulation
  submit = async () => {
    if (!this.isFormValid) {
      this.emit({
        ...this.state,
        submitError: 'Please fill in all fields correctly',
      });
      return;
    }

    // Start submission
    this.emit({
      ...this.state,
      isSubmitting: true,
      submitError: null,
      submitSuccess: false,
    });

    try {
      // Simulate API call
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // Simulate random failure for demonstration (10% chance)
          if (Math.random() < 0.1) {
            reject(new Error('Network error: Could not submit form'));
          } else {
            resolve(true);
          }
        }, 1500);
      });

      // Success state
      this.emit({
        ...this.state,
        isSubmitting: false,
        submitSuccess: true,
        submitError: null,
      });
    } catch (error) {
      // Error state
      this.emit({
        ...this.state,
        isSubmitting: false,
        submitSuccess: false,
        submitError: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  };

  // Reset form to initial state
  reset = () => {
    this.emit({
      name: '',
      email: '',
      isSubmitting: false,
      submitSuccess: false,
      submitError: null,
    });
  };
}