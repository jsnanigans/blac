import { useBloc } from '@blac/react';
import { WizardBloc } from '../WizardBloc';
import { NextStepEvent, PreviousStepEvent, SubmitWizardEvent } from '../events';
import { Button } from '../../../shared/components';

export function NavigationButtons() {
  const [state, wizard] = useBloc(WizardBloc);

  return (
    <div className="wizard-navigation">
      <div className="row-md">
        <Button
          variant="ghost"
          onClick={() => wizard.add(new PreviousStepEvent())}
          disabled={!wizard.canGoPrevious || state.isSubmitting}
          aria-label="Previous step"
        >
          ← Previous
        </Button>

        {wizard.isReviewStep ? (
          <Button
            variant="primary"
            onClick={() => wizard.add(new SubmitWizardEvent())}
            disabled={state.isSubmitting}
            aria-label="Submit wizard"
          >
            {state.isSubmitting ? 'Submitting...' : 'Submit'}
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={() => wizard.add(new NextStepEvent())}
            disabled={!wizard.canGoNext}
            aria-label="Next step"
          >
            Next →
          </Button>
        )}
      </div>

      {Object.keys(state.validationErrors).length > 0 && (
        <p className="text-small text-danger">
          Please fix validation errors to continue
        </p>
      )}
    </div>
  );
}
