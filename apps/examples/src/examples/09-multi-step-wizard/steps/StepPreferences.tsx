import { useBloc } from '@blac/react';
import { WizardBloc } from '../WizardBloc';
import { UpdateDataEvent } from '../events';
import { Card } from '../../../shared/components';

export function StepPreferences() {
  const [state, wizard] = useBloc(WizardBloc);
  const { data } = state;

  return (
    <Card>
      <div className="stack-lg">
        <div>
          <h2>Preferences</h2>
          <p className="text-small text-muted">Customize your experience.</p>
        </div>

        <div className="stack-md">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={data.newsletter}
              onChange={(e) =>
                wizard.add(
                  new UpdateDataEvent({ newsletter: e.target.checked }),
                )
              }
            />
            <span>Subscribe to newsletter</span>
            <p className="text-small text-muted">
              Receive updates about new features and tips
            </p>
          </label>

          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={data.notifications}
              onChange={(e) =>
                wizard.add(
                  new UpdateDataEvent({ notifications: e.target.checked }),
                )
              }
            />
            <span>Enable notifications</span>
            <p className="text-small text-muted">
              Get notified about important account activity
            </p>
          </label>

          <div>
            <label className="label">Theme Preference</label>
            <div className="row-sm">
              {(['light', 'dark', 'system'] as const).map((theme) => (
                <label key={theme} className="radio-label">
                  <input
                    type="radio"
                    name="theme"
                    value={theme}
                    checked={data.theme === theme}
                    onChange={() => wizard.add(new UpdateDataEvent({ theme }))}
                  />
                  <span className="capitalize">{theme}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
