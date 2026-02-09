import { useBloc } from '@blac/react';
import { FormCubit } from './FormCubit';
import { Button, RenderCounter } from '../../shared/components';

export function FormSummary({ instanceId }: { instanceId: string }) {
  const [, bloc] = useBloc(FormCubit, {
    instanceId,
    dependencies: (_state, b) => [b.isValid, b.errors],
  });

  const errors = bloc.errors;
  const errorEntries = Object.entries(errors);
  const isValid = bloc.isValid;

  return (
    <div style={{ position: 'relative' }}>
      <RenderCounter name="FormSummary" />
      <div className="stack-sm">
        <h4>Validation</h4>
        <div className="validation-summary">
          {errorEntries.length > 0 ? (
            errorEntries.map(([key, msg]) => (
              <div key={key} className="error-item">
                {msg}
              </div>
            ))
          ) : (
            <div className="valid-item">All fields are valid</div>
          )}
        </div>
        <Button
          variant="primary"
          disabled={!isValid}
          onClick={() => {
            alert('Form submitted!');
            bloc.reset();
          }}
          style={{ alignSelf: 'flex-start' }}
        >
          Submit
        </Button>
      </div>
    </div>
  );
}
