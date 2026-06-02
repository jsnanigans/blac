import { useBloc } from '@blac/react';
import { Button, Card, RenderCounter } from '../../shared/components';
import { PersistedDraftCubit } from './PersistedDraftCubit';

/**
 * Each field is its own component reading a single slice of the shared draft
 * Cubit (keyed by `draftId`). Typing in the title re-renders only the Title
 * field — body and tags stay still (watch the RenderCounter badges).
 */
function TitleField({ draftId }: { draftId: string }) {
  const [state, bloc] = useBloc(PersistedDraftCubit, { args: { id: draftId } });
  return (
    <div className="stack-xs" style={{ position: 'relative' }}>
      <RenderCounter name="TitleField" />
      <label className="text-small text-muted">Title</label>
      <input
        value={state.title}
        onChange={(e) => bloc.setTitle(e.target.value)}
        placeholder="Draft title"
      />
    </div>
  );
}

function TagsField({ draftId }: { draftId: string }) {
  const [state, bloc] = useBloc(PersistedDraftCubit, { args: { id: draftId } });
  return (
    <div className="stack-xs" style={{ position: 'relative' }}>
      <RenderCounter name="TagsField" />
      <label className="text-small text-muted">Tags</label>
      <input
        value={state.tags.join(', ')}
        onChange={(e) =>
          bloc.setTags(
            e.target.value
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean),
          )
        }
        placeholder="tag-one, tag-two"
      />
    </div>
  );
}

function BodyField({ draftId }: { draftId: string }) {
  const [state, bloc] = useBloc(PersistedDraftCubit, { args: { id: draftId } });
  return (
    <div className="stack-xs" style={{ position: 'relative' }}>
      <RenderCounter name="BodyField" />
      <label className="text-small text-muted">Body</label>
      <textarea
        value={state.body}
        onChange={(e) => bloc.setBody(e.target.value)}
        placeholder="Write something and remount the editor"
        rows={10}
      />
    </div>
  );
}

export function DraftForm({ draftId }: { draftId: string }) {
  // Action-only: owns no tracked state, so the reset button never re-renders
  // from edits.
  const [, bloc] = useBloc(PersistedDraftCubit, {
    args: { id: draftId },
    select: () => [],
  });

  return (
    <Card>
      <div className="stack-md">
        <TitleField draftId={draftId} />
        <TagsField draftId={draftId} />
        <BodyField draftId={draftId} />
        <div className="row-xs flex-wrap">
          <Button variant="ghost" onClick={bloc.resetDraft}>
            Reset in-memory state
          </Button>
        </div>
      </div>
    </Card>
  );
}
