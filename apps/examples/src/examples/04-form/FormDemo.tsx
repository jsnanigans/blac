import { ExampleLayout } from '../../shared/ExampleLayout';
import { Card } from '../../shared/components';
import { FormFields } from './FormFields';
import { FormProgress } from './FormProgress';
import { FormSummary } from './FormSummary';

function SingleForm({ label, formId }: { label: string; formId: string }) {
  return (
    <Card>
      <div className="stack-md">
        <h3>{label}</h3>
        <FormProgress formId={formId} />
        <FormFields formId={formId} />
        <FormSummary formId={formId} />
      </div>
    </Card>
  );
}

export function FormDemo() {
  return (
    <ExampleLayout
      title="Form Validation"
      description="Two independent forms side by side, each keyed by a distinct formId in args to create separate state per form. Getter-based tracking ensures components only re-render when computed values actually change."
      features={[
        'args-keyed identity — each form gets its own independent Cubit instance',
        'Getter tracking: completionPercent, isValid, errors',
        'FormProgress only re-renders when percentage changes',
        'FormSummary only re-renders when validation result changes',
      ]}
    >
      <section className="stack-lg">
        <div className="form-pair">
          <SingleForm label="Form A" formId="form-a" />
          <SingleForm label="Form B" formId="form-b" />
        </div>
      </section>

      <section className="stack-md">
        <Card>
          <h4>Key Concepts</h4>
          <div className="stack-xs text-small text-muted">
            <p>
              <strong>Instance isolation via args:</strong> Each form passes a
              unique <code>id</code> in{' '}
              <code>useBloc(FormCubit, {'{ args: { id } }'})</code>, so Form A
              and Form B get completely independent state. All components within
              the same form share one instance.
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
