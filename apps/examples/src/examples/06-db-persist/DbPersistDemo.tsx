import { useEffect, useState } from 'react';
import { getPluginManager } from '@blac/core';
import { useBloc } from '@blac/react';
import { ExampleLayout } from '../../shared/ExampleLayout';
import { Button, Card } from '../../shared/components';
import {
  DRAFT_INSTANCE_ID,
  DRAFT_PERSIST_KEY,
  draftPersistPlugin,
} from './persistPlugin';
import { PersistedDraftCubit } from './PersistedDraftCubit';

function DraftEditor() {
  const [state, bloc] = useBloc(PersistedDraftCubit, {
    instanceId: DRAFT_INSTANCE_ID,
  });
  const [persistStatus, setPersistStatus] = useState('hydrating');
  const [savedAt, setSavedAt] = useState<string>('not saved yet');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = draftPersistPlugin.subscribe((event) => {
      if (event.instance !== bloc) return;

      setPersistStatus(event.status.phase);
      setSavedAt(
        event.status.savedAt
          ? new Date(event.status.savedAt).toLocaleTimeString()
          : 'not saved yet',
      );
      setError(event.status.error?.message ?? null);
    });

    const currentStatus = draftPersistPlugin.getStatus(bloc);
    if (currentStatus) {
      setPersistStatus(currentStatus.phase);
      setSavedAt(
        currentStatus.savedAt
          ? new Date(currentStatus.savedAt).toLocaleTimeString()
          : 'not saved yet',
      );
      setError(currentStatus.error?.message ?? null);
    }

    return unsubscribe;
  }, [bloc]);

  return (
    <div className="grid grid-cols-2 gap-md">
      <Card>
        <div className="stack-md">
          <div className="stack-xs">
            <label className="text-small text-muted">Title</label>
            <input
              value={state.title}
              onChange={(e) => bloc.setTitle(e.target.value)}
              placeholder="Draft title"
            />
          </div>

          <div className="stack-xs">
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

          <div className="stack-xs">
            <label className="text-small text-muted">Body</label>
            <textarea
              value={state.body}
              onChange={(e) => bloc.setBody(e.target.value)}
              placeholder="Write something and remount the editor"
              rows={10}
            />
          </div>

          <div className="row-xs flex-wrap">
            <Button variant="ghost" onClick={bloc.resetDraft}>
              Reset in-memory state
            </Button>
          </div>
        </div>
      </Card>

      <div className="stack-md">
        <Card>
          <h4>Persistence Status</h4>
          <div className="stack-xs text-small text-muted">
            <p>
              <strong>Phase:</strong> <code>{persistStatus}</code>
            </p>
            <p>
              <strong>Last saved:</strong> <code>{savedAt}</code>
            </p>
            <p>
              <strong>Persist key:</strong> <code>{DRAFT_PERSIST_KEY}</code>
            </p>
            <p>
              <strong>Local edits:</strong> <code>{state.localEditCount}</code>
            </p>
            {error ? (
              <p>
                <strong>Error:</strong> <code>{error}</code>
              </p>
            ) : null}
          </div>
        </Card>

        <Card>
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
        </Card>
      </div>
    </div>
  );
}

export function DbPersistDemo() {
  const [pluginReady, setPluginReady] = useState(false);
  const [mounted, setMounted] = useState(true);
  const [dbMessage, setDbMessage] = useState<string | null>(null);

  useEffect(() => {
    const pm = getPluginManager();
    if (!pm.hasPlugin(draftPersistPlugin.name)) {
      pm.install(draftPersistPlugin);
    }
    setPluginReady(true);

    return () => {
      if (pm.hasPlugin(draftPersistPlugin.name)) {
        pm.uninstall(draftPersistPlugin.name);
      }
    };
  }, []);

  const clearDb = async () => {
    await draftPersistPlugin.clearRecord(DRAFT_PERSIST_KEY);
    setDbMessage('Persisted record cleared from IndexedDB');
  };

  return (
    <ExampleLayout
      title="IndexedDB Persistence"
      description="A basic IndexedDB-backed BlaC plugin that hydrates state asynchronously, persists updates automatically, and supports stateToDb/dbToState transforms."
      features={[
        'Plugin installs before the Cubit mounts so creation hydration is observed',
        'Native IndexedDB adapter with debounced writes',
        'stateToDb / dbToState transforms for record shaping',
        'Visible hydration and save status for debugging',
      ]}
    >
      <section className="stack-md">
        <Card>
          <div className="row-xs flex-wrap" style={{ justifyContent: 'space-between' }}>
            <div className="stack-xs">
              <h4>Debug Controls</h4>
              <p className="text-small text-muted">
                Type into the editor, unmount it, then mount it again to verify
                IndexedDB hydration.
              </p>
            </div>
            <div className="row-xs flex-wrap">
              <Button variant="ghost" onClick={() => setMounted((value) => !value)}>
                {mounted ? 'Unmount editor' : 'Mount editor'}
              </Button>
              <Button variant="ghost" onClick={clearDb}>
                Clear IndexedDB record
              </Button>
            </div>
          </div>
          {dbMessage ? <p className="text-small text-muted">{dbMessage}</p> : null}
        </Card>

        {pluginReady && mounted ? (
          <DraftEditor />
        ) : (
          <Card>
            <p className="text-small text-muted">
              {pluginReady
                ? 'Editor is unmounted. Mount it again to force a fresh Cubit instance and rehydrate from IndexedDB.'
                : 'Installing persistence plugin...'}
            </p>
          </Card>
        )}

        <Card>
          <h4>Known Limitation</h4>
          <p className="text-small text-muted">
            This first version hydrates asynchronously because IndexedDB reads
            are async. It does not yet block <code>acquire()</code> or React
            render on hydration.
          </p>
        </Card>
      </section>
    </ExampleLayout>
  );
}
