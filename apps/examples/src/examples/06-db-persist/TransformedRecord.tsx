import { useBloc } from '@blac/react';
import { Card, RenderCounter } from '../../shared/components';
import { PersistedDraftCubit } from './PersistedDraftCubit';

/**
 * Shows the shape `stateToDb` persists. Reads `title`, `body`, and `tags` (not
 * `localEditCount`), so it re-renders only when one of the persisted fields
 * changes.
 */
export function TransformedRecord({ draftId }: { draftId: string }) {
  const [state] = useBloc(PersistedDraftCubit, { args: { id: draftId } });

  return (
    <Card>
      <div style={{ position: 'relative' }}>
        <RenderCounter name="TransformedRecord" />
        <h4>Transformed Record</h4>
        <div className="stack-xs text-small text-muted">
          <p>
            <code>stateToDb</code> stores tags as a comma-delimited string and
            omits <code>localEditCount</code>.
          </p>
          <p>
            <code>dbToState</code> parses the string back into an array and
            merges with the Cubit defaults.
          </p>
        </div>
        <pre className="code-block">
          {JSON.stringify(
            {
              title: state.title,
              body: state.body,
              tags: state.tags.join(','),
            },
            null,
            2,
          )}
        </pre>
      </div>
    </Card>
  );
}
