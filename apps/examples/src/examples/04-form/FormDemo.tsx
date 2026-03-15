import { ExampleLayout } from '../../shared/ExampleLayout';
import { Card } from '../../shared/components';
import { FormFields } from './FormFields';
import { FormProgress } from './FormProgress';
import { FormSummary } from './FormSummary';

function SingleForm({
  label,
  instanceId,
}: {
  label: string;
  instanceId: string;
}) {
  return (
    <Card>
      <div className="stack-md">
        <h3>{label}</h3>
        <FormProgress instanceId={instanceId} />
        <FormFields instanceId={instanceId} />
        <FormSummary instanceId={instanceId} />
      </div>
    </Card>
  );
}

export function FormDemo() {
  return (
    <ExampleLayout
      title="Form Validation"
      description="Two independent forms side by side using instanceId to create separate state per form. Getter-based tracking ensures components only re-render when computed values actually change."
      features={[
        'instanceId — each form gets its own independent Cubit instance',
        'Getter tracking: completionPercent, isValid, errors',
        'FormProgress only re-renders when percentage changes',
        'FormSummary only re-renders when validation result changes',
      ]}
    >
      <section className="stack-lg">
        <div className="form-pair">
          <SingleForm label="Form A" instanceId="form-a" />
          <SingleForm label="Form B" instanceId="form-b" />
        </div>
      </section>

      <section className="stack-md">
        <Card>
          <h4>Key Concepts</h4>
          <div className="stack-xs text-small text-muted">
            <p>
              <strong>Instance isolation via instanceId:</strong> Each form
              passes a unique <code>instanceId</code> to{' '}
              <code>useBloc(FormCubit)</code>, so Form A and Form B get
              completely independent state. All components within the same form
              share one instance.
            </p>
            <p>
              <strong>Getter tracking:</strong> Getters like{' '}
              <code>completionPercent</code>, <code>isValid</code>, and{' '}
              <code>errors</code> are computed from state. BlaC tracks which
              getters a component accesses and only re-renders when the getter
              return value changes.
            </p>
            <p>
              <strong>Granular updates:</strong> Watch the RenderCounter badges
              — FormProgress only updates when the percentage crosses a
              boundary, not on every keystroke. FormSummary only updates when
              the set of validation errors changes.
            </p>
          </div>
        </Card>
      </section>
    </ExampleLayout>
  );
}
