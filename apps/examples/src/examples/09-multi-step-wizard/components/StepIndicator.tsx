import { useBloc } from '@blac/react';
import { WizardBloc } from '../WizardBloc';
import { JumpToStepEvent } from '../events';

export function StepIndicator() {
  const [state, wizard] = useBloc(WizardBloc);

  const steps = wizard.steps;
  const currentStep = state.currentStep;

  return (
    <div className="step-indicator">
      <div className="progress-bar">
        <div
          className="progress-bar-fill"
          style={{ width: `${wizard.progress}%` }}
        />
      </div>

      <div className="steps-list">
        {steps.map((stepId, index) => {
          const isActive = index === currentStep;
          const isComplete = index < currentStep;
          const isAccessible = index <= currentStep;

          return (
            <button
              key={stepId}
              className={`step-button ${isActive ? 'active' : ''} ${
                isComplete ? 'complete' : ''
              }`}
              onClick={() => {
                if (isAccessible) {
                  wizard.add(new JumpToStepEvent(index));
                }
              }}
              disabled={!isAccessible}
              aria-label={`Step ${index + 1}: ${stepId.split('-').join(' ')}`}
            >
              <div className="step-number">{isComplete ? '✓' : index + 1}</div>
              <div className="step-label">{stepId.split('-').join(' ')}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
