import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FormCubit } from './FormCubit';

describe('FormCubit', () => {
  let formCubit: FormCubit;

  beforeEach(() => {
    formCubit = new FormCubit();
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      expect(formCubit.state).toEqual({
        name: '',
        email: '',
        isSubmitting: false,
        submitSuccess: false,
        submitError: null,
      });
    });

    it('should have invalid form initially', () => {
      expect(formCubit.isFormValid).toBe(false);
      expect(formCubit.isNameValid).toBe(false);
      expect(formCubit.isEmailValid).toBe(false);
    });
  });

  describe('Field Updates', () => {
    it('should update name field', () => {
      formCubit.setName('John Doe');
      expect(formCubit.state.name).toBe('John Doe');
    });

    it('should update email field', () => {
      formCubit.setEmail('john@example.com');
      expect(formCubit.state.email).toBe('john@example.com');
    });

    it('should clear error when updating name', () => {
      // Set an error first
      formCubit.emit({ ...formCubit.state, submitError: 'Test error' });
      expect(formCubit.state.submitError).toBe('Test error');

      // Update name should clear error
      formCubit.setName('John');
      expect(formCubit.state.submitError).toBeNull();
    });

    it('should clear error when updating email', () => {
      // Set an error first
      formCubit.emit({ ...formCubit.state, submitError: 'Test error' });
      expect(formCubit.state.submitError).toBe('Test error');

      // Update email should clear error
      formCubit.setEmail('test@example.com');
      expect(formCubit.state.submitError).toBeNull();
    });
  });

  describe('Name Validation', () => {
    it('should validate empty name as invalid', () => {
      formCubit.setName('');
      expect(formCubit.isNameValid).toBe(false);
    });

    it('should validate whitespace-only name as invalid', () => {
      formCubit.setName('   ');
      expect(formCubit.isNameValid).toBe(false);
    });

    it('should validate non-empty name as valid', () => {
      formCubit.setName('John');
      expect(formCubit.isNameValid).toBe(true);
    });
  });

  describe('Email Validation', () => {
    it('should validate empty email as invalid', () => {
      formCubit.setEmail('');
      expect(formCubit.isEmailValid).toBe(false);
    });

    it('should validate invalid email format', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'user@',
        'user@.com',
        'user@example',
        'user example@test.com',
      ];

      invalidEmails.forEach((email) => {
        formCubit.setEmail(email);
        expect(formCubit.isEmailValid).toBe(false);
      });
    });

    it('should validate correct email format', () => {
      const validEmails = [
        'user@example.com',
        'john.doe@company.co.uk',
        'test+tag@email.org',
        'name123@test-domain.com',
      ];

      validEmails.forEach((email) => {
        formCubit.setEmail(email);
        expect(formCubit.isEmailValid).toBe(true);
      });
    });
  });

  describe('Form Validation', () => {
    it('should be invalid when both fields are empty', () => {
      expect(formCubit.isFormValid).toBe(false);
    });

    it('should be invalid when only name is valid', () => {
      formCubit.setName('John');
      expect(formCubit.isFormValid).toBe(false);
    });

    it('should be invalid when only email is valid', () => {
      formCubit.setEmail('john@example.com');
      expect(formCubit.isFormValid).toBe(false);
    });

    it('should be valid when both fields are valid', () => {
      formCubit.setName('John Doe');
      formCubit.setEmail('john@example.com');
      expect(formCubit.isFormValid).toBe(true);
    });
  });

  describe('Submit Flow', () => {
    beforeEach(() => {
      // Mock Math.random to control success/failure
      vi.spyOn(global.Math, 'random');
    });

    it('should not submit when form is invalid', async () => {
      // Form is invalid (empty fields)
      await formCubit.submit();

      expect(formCubit.state.submitError).toBe('Please fill in all fields correctly');
      expect(formCubit.state.isSubmitting).toBe(false);
      expect(formCubit.state.submitSuccess).toBe(false);
    });

    it('should handle successful submission', async () => {
      // Setup valid form
      formCubit.setName('John Doe');
      formCubit.setEmail('john@example.com');

      // Mock successful submission (Math.random returns 0.5)
      (Math.random as any).mockReturnValue(0.5);

      // Start submission
      const submitPromise = formCubit.submit();

      // Check loading state immediately
      expect(formCubit.state.isSubmitting).toBe(true);
      expect(formCubit.state.submitSuccess).toBe(false);
      expect(formCubit.state.submitError).toBeNull();

      // Wait for submission to complete
      await submitPromise;

      // Check success state
      expect(formCubit.state.isSubmitting).toBe(false);
      expect(formCubit.state.submitSuccess).toBe(true);
      expect(formCubit.state.submitError).toBeNull();
    });

    it('should handle submission failure', async () => {
      // Setup valid form
      formCubit.setName('John Doe');
      formCubit.setEmail('john@example.com');

      // Mock failed submission (Math.random returns 0.05 - less than 0.1)
      (Math.random as any).mockReturnValue(0.05);

      // Start submission
      const submitPromise = formCubit.submit();

      // Check loading state immediately
      expect(formCubit.state.isSubmitting).toBe(true);

      // Wait for submission to complete
      await submitPromise;

      // Check error state
      expect(formCubit.state.isSubmitting).toBe(false);
      expect(formCubit.state.submitSuccess).toBe(false);
      expect(formCubit.state.submitError).toBe('Network error: Could not submit form');
    });

    it('should clear previous success state when submitting again', async () => {
      // Setup valid form and simulate successful submission
      formCubit.setName('John Doe');
      formCubit.setEmail('john@example.com');
      (Math.random as any).mockReturnValue(0.5);
      await formCubit.submit();

      expect(formCubit.state.submitSuccess).toBe(true);

      // Submit again
      const submitPromise = formCubit.submit();

      // Success should be cleared immediately
      expect(formCubit.state.submitSuccess).toBe(false);
      expect(formCubit.state.isSubmitting).toBe(true);

      await submitPromise;
    });
  });

  describe('Reset Functionality', () => {
    it('should reset form to initial state', () => {
      // Set some values
      formCubit.setName('John Doe');
      formCubit.setEmail('john@example.com');
      formCubit.emit({
        ...formCubit.state,
        submitSuccess: true,
        submitError: 'Some error',
      });

      // Reset
      formCubit.reset();

      // Check all fields are reset
      expect(formCubit.state).toEqual({
        name: '',
        email: '',
        isSubmitting: false,
        submitSuccess: false,
        submitError: null,
      });
    });

    it('should reset validation states', () => {
      // Set valid values
      formCubit.setName('John Doe');
      formCubit.setEmail('john@example.com');
      expect(formCubit.isFormValid).toBe(true);

      // Reset
      formCubit.reset();

      // Check validation states
      expect(formCubit.isNameValid).toBe(false);
      expect(formCubit.isEmailValid).toBe(false);
      expect(formCubit.isFormValid).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle email with multiple @ symbols as invalid', () => {
      formCubit.setEmail('user@@example.com');
      expect(formCubit.isEmailValid).toBe(false);
    });

    it('should handle name with only spaces and tabs as invalid', () => {
      formCubit.setName('\t  \t');
      expect(formCubit.isNameValid).toBe(false);
    });

    it('should clear submitError when updating fields', () => {
      // Set initial state with error and success
      formCubit.emit({
        ...formCubit.state,
        submitError: 'Some error',
        submitSuccess: false,
      });

      // Update name
      formCubit.setName('New Name');

      // Check error is cleared
      expect(formCubit.state.submitError).toBeNull();
      // Other properties should be maintained
      expect(formCubit.state.isSubmitting).toBe(false);
    });
  });
});