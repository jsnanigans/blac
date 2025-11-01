import { useBloc } from '@blac/react';
import { WizardBloc } from '../WizardBloc';
import { UpdateDataEvent } from '../events';
import { Card, Input } from '../../../shared/components';

export function StepBusinessInfo() {
  const [state, wizard] = useBloc(WizardBloc);
  const { data, validationErrors } = state;

  return (
    <Card>
      <div className="stack-lg">
        <div>
          <h2>Business Information</h2>
          <p className="text-small text-muted">Tell us about your business.</p>
        </div>

        <div className="stack-md">
          <Input
            label="Company Name"
            value={data.companyName || ''}
            onChange={(e) =>
              wizard.add(new UpdateDataEvent({ companyName: e.target.value }))
            }
            error={validationErrors.companyName?.[0]}
            placeholder="Acme Inc."
            autoFocus
          />

          <Input
            label="Tax ID / EIN"
            value={data.taxId || ''}
            onChange={(e) =>
              wizard.add(new UpdateDataEvent({ taxId: e.target.value }))
            }
            error={validationErrors.taxId?.[0]}
            placeholder="12-3456789"
          />

          <div>
            <label className="label">
              Industry <span className="text-muted">(optional)</span>
            </label>
            <select
              className="input"
              value={data.industry || ''}
              onChange={(e) =>
                wizard.add(new UpdateDataEvent({ industry: e.target.value }))
              }
            >
              <option value="">Select an industry</option>
              <option value="technology">Technology</option>
              <option value="finance">Finance</option>
              <option value="healthcare">Healthcare</option>
              <option value="retail">Retail</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="education">Education</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>
    </Card>
  );
}
