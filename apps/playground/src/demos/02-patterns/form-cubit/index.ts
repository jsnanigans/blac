import { DemoRegistry } from '@/core/utils/demoRegistry';
import { FormCubitDemo } from './FormCubitDemo';

DemoRegistry.register({
  id: 'form-cubit',
  title: 'Form with Validation',
  category: '02-patterns',
  difficulty: 'intermediate',
  prerequisites: ['counter', 'emit-patch', 'getters'],
  relatedDemos: ['loading-states', 'simple-async'],
  tags: ['forms', 'validation', 'cubit', 'patterns', 'real-world'],
  concepts: ['form state management', 'validation', 'async operations', 'error handling'],
  description: 'Form state management with real-time validation and async submission',
  component: FormCubitDemo,
  code: {
    demo: '', // Code will be provided by demoCodeExports.ts
  },
  documentation: `
    # Form State Management with Cubit

    This demo showcases a comprehensive form management pattern using BlaC's Cubit, demonstrating
    real-time validation, async submission handling, and proper UX feedback patterns.

    ## Key Concepts

    ### 1. Form State Structure

    A well-designed form state should include all necessary fields and UI states:

    \`\`\`typescript
    interface FormState {
      // Form fields
      name: string;
      email: string;

      // UI states
      isSubmitting: boolean;
      submitSuccess: boolean;
      submitError: string | null;
    }
    \`\`\`

    ### 2. Validation with Getters

    Using getters provides computed validation state without storing it:

    \`\`\`typescript
    class FormCubit extends Cubit<FormState> {
      get isNameValid(): boolean {
        return this.state.name.trim().length > 0;
      }

      get isEmailValid(): boolean {
        const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
        return emailRegex.test(this.state.email);
      }

      get isFormValid(): boolean {
        return this.isNameValid && this.isEmailValid;
      }
    }
    \`\`\`

    **Benefits of getter-based validation:**
    - No redundant state storage
    - Always computed from current state
    - Easy to test and reason about
    - Can combine multiple validations easily

    ### 3. Real-time Validation UI

    Provide immediate visual feedback as users type:

    \`\`\`typescript
    const nameHasError = state.name && !formCubit.isNameValid;
    const emailHasError = state.email && !formCubit.isEmailValid;

    // Apply conditional styling
    className={nameHasError
      ? 'border-red-500'
      : state.name && formCubit.isNameValid
        ? 'border-green-500'
        : 'border-gray-300'}
    \`\`\`

    **UX Best Practices:**
    - Don't show errors on pristine fields (check if field has value)
    - Show success state (green border) for valid fields
    - Clear error messages when user starts typing
    - Disable submit button when form is invalid

    ### 4. Async Submission Pattern

    Handle the full submission lifecycle:

    \`\`\`typescript
    submit = async () => {
      // Pre-flight validation
      if (!this.isFormValid) {
        this.emit({ ...this.state, submitError: 'Please fill in all fields' });
        return;
      }

      // Start submission
      this.emit({ ...this.state, isSubmitting: true, submitError: null });

      try {
        await apiCall();
        // Success
        this.emit({ ...this.state, isSubmitting: false, submitSuccess: true });
      } catch (error) {
        // Error
        this.emit({ ...this.state, isSubmitting: false, submitError: error.message });
      }
    };
    \`\`\`

    ### 5. Error Handling Strategy

    Clear errors at appropriate times:
    - When user modifies a field (shows they're addressing the issue)
    - When starting a new submission attempt
    - When resetting the form

    ### 6. Loading States

    Provide clear feedback during async operations:
    - Disable form inputs during submission
    - Show spinner in submit button
    - Change button text to indicate action ("Submitting...")
    - Prevent multiple simultaneous submissions

    ## Common Patterns

    ### Field-Level Error Messages

    \`\`\`typescript
    interface FieldError {
      field: string;
      message: string;
    }

    interface FormState {
      // ...
      fieldErrors: FieldError[];
    }
    \`\`\`

    ### Touched Fields Tracking

    Only show validation after user interaction:

    \`\`\`typescript
    interface FormState {
      // ...
      touched: {
        name: boolean;
        email: boolean;
      };
    }

    const showNameError = state.touched.name && !formCubit.isNameValid;
    \`\`\`

    ### Form Dirty State

    Track if form has been modified:

    \`\`\`typescript
    get isDirty(): boolean {
      return this.state.name !== '' || this.state.email !== '';
    }
    \`\`\`

    ## Testing Strategies

    ### 1. Test Initial State
    - Verify all fields start empty
    - Check validation states are correct
    - Ensure no errors are shown

    ### 2. Test Field Updates
    - Verify state updates correctly
    - Check error clearing behavior
    - Test validation state changes

    ### 3. Test Validation Logic
    - Test valid and invalid cases
    - Check edge cases (empty strings, whitespace)
    - Verify combined validation (isFormValid)

    ### 4. Test Async Submission
    - Mock API calls
    - Test success flow
    - Test error handling
    - Verify loading states

    ### 5. Test Reset Functionality
    - Ensure all fields clear
    - Check validation states reset
    - Verify errors are cleared

    ## Performance Considerations

    1. **Validation Memoization**: For complex validation, consider memoizing results
    2. **Debounced Validation**: For async validation (e.g., checking username availability)
    3. **Selective Re-renders**: Use React.memo for form field components

    ## Accessibility

    - Always associate labels with inputs
    - Provide clear error messages
    - Use proper ARIA attributes for validation states
    - Ensure keyboard navigation works properly
    - Announce form submission results to screen readers

    ## Security Considerations

    1. **Client-side validation is for UX only** - always validate on server
    2. **Sanitize inputs** before submission
    3. **Rate limit** form submissions
    4. **CSRF protection** for form endpoints
    5. **Never trust client state** for authorization

    ## Advanced Patterns

    ### Multi-Step Forms

    \`\`\`typescript
    interface MultiStepFormState {
      currentStep: number;
      steps: {
        personal: PersonalInfo;
        address: AddressInfo;
        payment: PaymentInfo;
      };
      // ...
    }
    \`\`\`

    ### Dynamic Form Fields

    \`\`\`typescript
    interface DynamicFormState {
      fields: Array<{
        id: string;
        type: 'text' | 'email' | 'number';
        value: string;
        validation?: (value: string) => boolean;
      }>;
    }
    \`\`\`

    ### Form Arrays

    \`\`\`typescript
    interface FormWithArrayState {
      items: Array<{
        id: string;
        name: string;
        quantity: number;
      }>;
    }

    addItem = () => {
      this.emit({
        ...this.state,
        items: [...this.state.items, { id: uuid(), name: '', quantity: 1 }]
      });
    };
    \`\`\`

    ## Summary

    This pattern provides:
    - **Clear separation of concerns** between UI and business logic
    - **Predictable state updates** through immutable patterns
    - **Excellent testability** with pure validation functions
    - **Great UX** with real-time feedback and proper error handling
    - **Type safety** throughout the form lifecycle

    The Cubit pattern is ideal for forms because it provides a simple, synchronous API
    for field updates while still supporting async operations like submission.
  `,
});