import { useBloc } from '@blac/react';
import { WizardBloc } from '../WizardBloc';
import { UpdateDataEvent } from '../events';
import { Card } from '../../../shared/components';
import type { AccountType } from '../types';

export function StepAccountType() {
  const [state, wizard] = useBloc(WizardBloc);
  const { data, validationErrors } = state;

  const selectAccountType = (type: AccountType) => {
    wizard.add(new UpdateDataEvent({ accountType: type }));
  };

  return (
    <Card>
      <div className="stack-lg">
        <div>
          <h2>Account Type</h2>
          <p className="text-small text-muted">
            Choose the type of account you want to create.
          </p>
        </div>

        <div className="stack-md">
          <button
            className={`account-type-button ${
              data.accountType === 'personal' ? 'selected' : ''
            }`}
            onClick={() => selectAccountType('personal')}
          >
            <div className="account-type-icon">👤</div>
            <div className="account-type-content">
              <h3>Personal Account</h3>
              <p className="text-small text-muted">
                For individual use and personal projects
              </p>
            </div>
          </button>

          <button
            className={`account-type-button ${
              data.accountType === 'business' ? 'selected' : ''
            }`}
            onClick={() => selectAccountType('business')}
          >
            <div className="account-type-icon">🏢</div>
            <div className="account-type-content">
              <h3>Business Account</h3>
              <p className="text-small text-muted">
                For teams and organizations
              </p>
            </div>
          </button>

          {validationErrors.accountType && (
            <p className="text-small text-danger">
              {validationErrors.accountType[0]}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
