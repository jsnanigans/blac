import { Vertex } from '@blac/core';
import type { WizardState, WizardData, StepId } from './types';
import {
  NextStepEvent,
  PreviousStepEvent,
  JumpToStepEvent,
  UpdateDataEvent,
  SubmitWizardEvent,
  SaveDraftEvent,
  ResumeDraftEvent,
  ResetWizardEvent,
} from './events';

const STORAGE_KEY = 'wizard-draft';

const initialData: WizardData = {
  firstName: '',
  lastName: '',
  email: '',
  accountType: null,
  newsletter: false,
  notifications: true,
  theme: 'system',
};

export class WizardBloc extends Vertex<WizardState> {
  constructor() {
    super({
      currentStep: 0,
      data: initialData,
      validationErrors: {},
      isSubmitting: false,
      submitSuccess: false,
      submitError: null,
    });

    // Register event handlers
    this.on(NextStepEvent, this.handleNextStep);
    this.on(PreviousStepEvent, this.handlePreviousStep);
    this.on(JumpToStepEvent, this.handleJumpToStep);
    this.on(UpdateDataEvent, this.handleUpdateData);
    this.on(SubmitWizardEvent, this.handleSubmit);
    this.on(SaveDraftEvent, this.handleSaveDraft);
    this.on(ResumeDraftEvent, this.handleResumeDraft);
    this.on(ResetWizardEvent, this.handleReset);

    this.onDispose = () => {
      console.log('[WizardBloc] Disposed');
    };
  }

  // Getters

  /**
   * Get list of step IDs based on current data
   * (Business info step only appears if accountType is 'business')
   */
  get steps(): StepId[] {
    const steps: StepId[] = ['personal-info', 'account-type'];

    if (this.state.data.accountType === 'business') {
      steps.push('business-info');
    }

    steps.push('preferences', 'review');

    return steps;
  }

  get currentStepId(): StepId {
    return this.steps[this.state.currentStep];
  }

  get totalSteps(): number {
    return this.steps.length;
  }

  get progress(): number {
    return ((this.state.currentStep + 1) / this.totalSteps) * 100;
  }

  get canGoNext(): boolean {
    return (
      this.state.currentStep < this.totalSteps - 1 &&
      this.isStepValid(this.currentStepId)
    );
  }

  get canGoPrevious(): boolean {
    return this.state.currentStep > 0;
  }

  get isReviewStep(): boolean {
    return this.currentStepId === 'review';
  }

  // Validation

  private validateStep = (stepId: StepId): Record<string, string[]> => {
    const errors: Record<string, string[]> = {};
    const { data } = this.state;

    switch (stepId) {
      case 'personal-info':
        if (!data.firstName.trim()) {
          errors.firstName = ['First name is required'];
        }
        if (!data.lastName.trim()) {
          errors.lastName = ['Last name is required'];
        }
        if (!data.email.trim()) {
          errors.email = ['Email is required'];
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
          errors.email = ['Invalid email format'];
        }
        break;

      case 'account-type':
        if (!data.accountType) {
          errors.accountType = ['Please select an account type'];
        }
        break;

      case 'business-info':
        if (data.accountType === 'business') {
          if (!data.companyName?.trim()) {
            errors.companyName = ['Company name is required'];
          }
          if (!data.taxId?.trim()) {
            errors.taxId = ['Tax ID is required'];
          }
        }
        break;

      case 'preferences':
        // No validation needed - all fields have defaults
        break;

      case 'review':
        // Validate all previous steps
        this.steps.slice(0, -1).forEach((step) => {
          Object.assign(errors, this.validateStep(step));
        });
        break;
    }

    return errors;
  };

  private isStepValid = (stepId: StepId): boolean => {
    const errors = this.validateStep(stepId);
    return Object.keys(errors).length === 0;
  };

  // Event Handlers

  private handleNextStep = (event: NextStepEvent) => {
    const errors = this.validateStep(this.currentStepId);

    if (Object.keys(errors).length > 0) {
      this.emit({
        ...this.state,
        validationErrors: errors,
      });
      return;
    }

    // Clear errors and move to next step
    this.emit({
      ...this.state,
      currentStep: this.state.currentStep + 1,
      validationErrors: {},
    });

    // Auto-save draft
    this.handleSaveDraft(new SaveDraftEvent());
  };

  private handlePreviousStep = (event: PreviousStepEvent) => {
    if (this.canGoPrevious) {
      this.emit({
        ...this.state,
        currentStep: this.state.currentStep - 1,
        validationErrors: {},
      });
    }
  };

  private handleJumpToStep = (event: JumpToStepEvent) => {
    // Validate all steps up to target
    const targetIndex = event.stepIndex;

    for (let i = 0; i < targetIndex; i++) {
      const stepId = this.steps[i];
      if (!this.isStepValid(stepId)) {
        console.error(
          `Cannot jump to step ${targetIndex} - step ${i} is invalid`,
        );
        return;
      }
    }

    this.emit({
      ...this.state,
      currentStep: targetIndex,
      validationErrors: {},
    });
  };

  private handleUpdateData = (event: UpdateDataEvent) => {
    this.emit({
      ...this.state,
      data: {
        ...this.state.data,
        ...event.updates,
      },
      validationErrors: {},
    });
  };

  private handleSubmit = async (event: SubmitWizardEvent) => {
    // Validate all steps
    const errors = this.validateStep('review');

    if (Object.keys(errors).length > 0) {
      this.emit({
        ...this.state,
        validationErrors: errors,
      });
      return;
    }

    // Set submitting state
    this.emit({
      ...this.state,
      isSubmitting: true,
      submitSuccess: false,
      submitError: null,
    });

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      console.log('Wizard submitted:', this.state.data);

      // Success
      this.emit({
        ...this.state,
        isSubmitting: false,
        submitSuccess: true,
      });

      // Clear draft
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // Error
      this.emit({
        ...this.state,
        isSubmitting: false,
        submitError: 'Failed to submit. Please try again.',
      });
    }
  };

  private handleSaveDraft = (event: SaveDraftEvent) => {
    const draft = {
      currentStep: this.state.currentStep,
      data: this.state.data,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    console.log('[WizardBloc] Draft saved');
  };

  private handleResumeDraft = (event: ResumeDraftEvent) => {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      try {
        const draft = JSON.parse(stored);
        this.emit({
          ...this.state,
          currentStep: draft.currentStep || 0,
          data: { ...initialData, ...draft.data },
        });
        console.log('[WizardBloc] Draft resumed');
      } catch (error) {
        console.error('Failed to resume draft:', error);
      }
    }
  };

  private handleReset = (event: ResetWizardEvent) => {
    this.emit({
      currentStep: 0,
      data: initialData,
      validationErrors: {},
      isSubmitting: false,
      submitSuccess: false,
      submitError: null,
    });

    localStorage.removeItem(STORAGE_KEY);
    console.log('[WizardBloc] Wizard reset');
  };
}
