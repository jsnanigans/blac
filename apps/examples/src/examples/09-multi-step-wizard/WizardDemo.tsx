import { useEffect } from 'react';
import { useBloc } from '@blac/react';
import { ExampleLayout } from '../../shared/ExampleLayout';
import { WizardBloc } from './WizardBloc';
import { StepIndicator } from './components/StepIndicator';
import { NavigationButtons } from './components/NavigationButtons';
import { ResumeDraftEvent, SaveDraftEvent, ResetWizardEvent } from './events';
import { Button, Alert } from '../../shared/components';

// Import step components
import { StepPersonalInfo } from './steps/StepPersonalInfo';
import { StepAccountType } from './steps/StepAccountType';
import { StepBusinessInfo } from './steps/StepBusinessInfo';
import { StepPreferences } from './steps/StepPreferences';
import { StepReview } from './steps/StepReview';

export function WizardDemo() {
  const [state, wizard] = useBloc(WizardBloc);

  // Check for saved draft on mount
  useEffect(() => {
    const hasDraft = localStorage.getItem('wizard-draft');
    if (hasDraft) {
      const resume = confirm('Resume your previous session?');
      if (resume) {
        wizard.add(new ResumeDraftEvent());
      }
    }
  }, [wizard]);

  // Auto-save on data changes
  useEffect(() => {
    const timer = setTimeout(() => {
      wizard.add(new SaveDraftEvent());
    }, 1000);

    return () => clearTimeout(timer);
  }, [state.data, wizard]);

  // Render current step
  const renderStep = () => {
    switch (wizard.currentStepId) {
      case 'personal-info':
        return <StepPersonalInfo />;
      case 'account-type':
        return <StepAccountType />;
      case 'business-info':
        return <StepBusinessInfo />;
      case 'preferences':
        return <StepPreferences />;
      case 'review':
        return <StepReview />;
      default:
        return null;
    }
  };

  return (
    <ExampleLayout
      title="Multi-Step Wizard"
      description="Event-driven state machine with conditional branching and validation."
      features={[
        'Vertex pattern for complex flow logic',
        'Conditional steps based on previous answers',
        'Per-step validation',
        'Auto-save draft functionality',
        'Review before submit',
        'Jump to any completed step',
      ]}
    >
      {state.submitSuccess ? (
        <section className="stack-lg">
          <Alert variant="success">
            <h2>Success!</h2>
            <p>Your submission has been received.</p>
          </Alert>

          <Button onClick={() => wizard.add(new ResetWizardEvent())}>
            Start New Wizard
          </Button>
        </section>
      ) : (
        <>
          {/* Progress Indicator */}
          <section>
            <StepIndicator />
          </section>

          {/* Current Step */}
          <section className="wizard-content">{renderStep()}</section>

          {/* Navigation */}
          <section>
            <NavigationButtons />
          </section>

          {/* Submit Error */}
          {state.submitError && (
            <section>
              <Alert variant="danger">{state.submitError}</Alert>
            </section>
          )}

          {/* Debug Info */}
          <section className="stack-sm">
            <details>
              <summary className="text-small">Debug Info</summary>
              <pre className="code-block">
                {JSON.stringify(
                  {
                    currentStep: wizard.currentStepId,
                    progress: `${wizard.progress.toFixed(0)}%`,
                    totalSteps: wizard.totalSteps,
                    canGoNext: wizard.canGoNext,
                    canGoPrevious: wizard.canGoPrevious,
                  },
                  null,
                  2,
                )}
              </pre>
            </details>
          </section>
        </>
      )}

      {/* Concepts */}
      <section className="stack-md">
        <h2>Key Concepts</h2>
        <div className="stack-xs text-small text-muted">
          <p>
            • <strong>Vertex pattern:</strong> Event-driven state machine
            perfect for wizards
          </p>
          <p>
            • <strong>Conditional branching:</strong> Business info step only
            appears if "business" is selected
          </p>
          <p>
            • <strong>Events:</strong> NextStepEvent, PreviousStepEvent,
            UpdateDataEvent, etc.
          </p>
          <p>
            • <strong>Validation:</strong> Each step validates independently
            before allowing navigation
          </p>
          <p>
            • <strong>Auto-save:</strong> Draft saved to localStorage on every
            change
          </p>
          <p>
            • <strong>State machine:</strong> Clear state transitions via events
          </p>
        </div>
      </section>
    </ExampleLayout>
  );
}
