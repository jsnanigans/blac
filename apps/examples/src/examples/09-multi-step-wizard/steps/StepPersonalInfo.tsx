import { useBloc } from '@blac/react';
import { WizardBloc } from '../WizardBloc';
import { UpdateDataEvent } from '../events';
import { Card, Input } from '../../../shared/components';

export function StepPersonalInfo() {
  const [state, wizard] = useBloc(WizardBloc);
  const { data, validationErrors } = state;

  return (
    <Card>
      <div className="stack-lg">
        <div>
          <h2>Personal Information</h2>
          <p className="text-small text-muted">
            Let's start with some basic information about you.
          </p>
        </div>

        <div className="stack-md">
          <Input
            label="First Name"
            value={data.firstName}
            onChange={(e) =>
              wizard.add(new UpdateDataEvent({ firstName: e.target.value }))
            }
            error={validationErrors.firstName?.[0]}
            placeholder="John"
            autoFocus
          />

          <Input
            label="Last Name"
            value={data.lastName}
            onChange={(e) =>
              wizard.add(new UpdateDataEvent({ lastName: e.target.value }))
            }
            error={validationErrors.lastName?.[0]}
            placeholder="Doe"
          />

          <Input
            label="Email"
            type="email"
            value={data.email}
            onChange={(e) =>
              wizard.add(new UpdateDataEvent({ email: e.target.value }))
            }
            error={validationErrors.email?.[0]}
            placeholder="john.doe@example.com"
          />
        </div>
      </div>
    </Card>
  );
}
