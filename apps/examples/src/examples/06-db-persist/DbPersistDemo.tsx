import { useEffect, useState } from 'react';
import { getPluginManager } from '@blac/core';
import { ExampleLayout } from '../../shared/ExampleLayout';
import { Button, Card } from '../../shared/components';
import {
  DRAFT_INSTANCE_ID,
  DRAFT_PERSIST_KEY,
  draftPersistPlugin,
} from './persistPlugin';
import { DraftForm } from './DraftForm';
import { PersistenceStatus } from './PersistenceStatus';
import { TransformedRecord } from './TransformedRecord';

function DraftEditor() {
  // Pure composition: three sibling components share the same draft instance by
  // args id, each reading its own slice. The editor shell holds no state.
  return (
    <div className="grid grid-cols-2 gap-md">
      <DraftForm draftId={DRAFT_INSTANCE_ID} />
      <div className="stack-md">
        <PersistenceStatus draftId={DRAFT_INSTANCE_ID} />
        <TransformedRecord draftId={DRAFT_INSTANCE_ID} />
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
          <div
            className="row-xs flex-wrap"
            style={{ justifyContent: 'space-between' }}
          >
            <div className="stack-xs">
              <h4>Debug Controls</h4>
              <p className="text-small text-muted">
                Type into the editor, unmount it, then mount it again to verify
                IndexedDB hydration.
              </p>
            </div>
            <div className="row-xs flex-wrap">
              <Button
                variant="ghost"
                onClick={() => setMounted((value) => !value)}
              >
                {mounted ? 'Unmount editor' : 'Mount editor'}
              </Button>
              <Button variant="ghost" onClick={clearDb}>
                Clear IndexedDB record
              </Button>
            </div>
          </div>
          {dbMessage ? (
            <p className="text-small text-muted">{dbMessage}</p>
          ) : null}
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
