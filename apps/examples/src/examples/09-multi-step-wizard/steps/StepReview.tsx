import { useBloc } from '@blac/react';
import { WizardBloc } from '../WizardBloc';
import { JumpToStepEvent } from '../events';
import { Card, Button } from '../../../shared/components';
import { FieldSummary } from '../components/FieldSummary';

export function StepReview() {
  const [state, wizard] = useBloc(WizardBloc);
  const { data } = state;
  const steps = wizard.steps;

  const editStep = (stepIndex: number) => {
    wizard.add(new JumpToStepEvent(stepIndex));
  };

  return (
    <Card>
      <div className="stack-lg">
        <div>
          <h2>Review Your Information</h2>
          <p className="text-small text-muted">
            Please review your information before submitting.
          </p>
        </div>

        <div className="stack-lg">
          {/* Personal Info */}
          <div className="review-section">
            <div className="review-section-header">
              <h3>Personal Information</h3>
              <Button
                variant="ghost"
                size="small"
                onClick={() => editStep(steps.indexOf('personal-info'))}
                aria-label="Edit personal information"
              >
                Edit
              </Button>
            </div>
            <dl className="field-summary-list">
              <FieldSummary label="First Name" value={data.firstName} />
              <FieldSummary label="Last Name" value={data.lastName} />
              <FieldSummary label="Email" value={data.email} />
            </dl>
          </div>

          {/* Account Type */}
          <div className="review-section">
            <div className="review-section-header">
              <h3>Account Type</h3>
              <Button
                variant="ghost"
                size="small"
                onClick={() => editStep(steps.indexOf('account-type'))}
                aria-label="Edit account type"
              >
                Edit
              </Button>
            </div>
            <dl className="field-summary-list">
              <FieldSummary
                label="Account Type"
                value={data.accountType ? data.accountType : null}
              />
            </dl>
          </div>

          {/* Business Info (conditional) */}
          {data.accountType === 'business' && (
            <div className="review-section">
              <div className="review-section-header">
                <h3>Business Information</h3>
                <Button
                  variant="ghost"
                  size="small"
                  onClick={() => editStep(steps.indexOf('business-info'))}
                  aria-label="Edit business information"
                >
                  Edit
                </Button>
              </div>
              <dl className="field-summary-list">
                <FieldSummary label="Company Name" value={data.companyName} />
                <FieldSummary label="Tax ID" value={data.taxId} />
                <FieldSummary label="Industry" value={data.industry} />
              </dl>
            </div>
          )}

          {/* Preferences */}
          <div className="review-section">
            <div className="review-section-header">
              <h3>Preferences</h3>
              <Button
                variant="ghost"
                size="small"
                onClick={() => editStep(steps.indexOf('preferences'))}
                aria-label="Edit preferences"
              >
                Edit
              </Button>
            </div>
            <dl className="field-summary-list">
              <FieldSummary label="Newsletter" value={data.newsletter} />
              <FieldSummary label="Notifications" value={data.notifications} />
              <FieldSummary label="Theme" value={data.theme} />
            </dl>
          </div>
        </div>
      </div>
    </Card>
  );
}
