import { useEffect, useMemo, useState } from 'react';
import { ensure } from '@blac/core';
import { useBloc } from '@blac/react';
import { Card, RenderCounter } from '../../shared/components';
import { DRAFT_PERSIST_KEY, draftPersistPlugin } from './persistPlugin';
import { PersistedDraftCubit } from './PersistedDraftCubit';

/**
 * Persistence diagnostics. Owns the plugin subscription and hydration probes,
 * and reads only `state.localEditCount` from the draft Cubit — so it ticks on
 * edits but never re-renders the form fields beside it.
 */
export function PersistenceStatus({ draftId }: { draftId: string }) {
  const [state] = useBloc(PersistedDraftCubit, {
    args: { id: draftId },
    select: (s) => [s.localEditCount],
  });
  const actualBloc = useMemo(
    () => ensure(PersistedDraftCubit, { args: { id: draftId } }),
    [draftId],
  );
  const [persistStatus, setPersistStatus] = useState('hydrating');
  const [savedAt, setSavedAt] = useState<string>('not saved yet');
  const [hydrationReady, setHydrationReady] = useState('pending');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = draftPersistPlugin.subscribe((event) => {
      if ((event.instance as unknown) !== actualBloc) return;

      setPersistStatus(event.status.phase);
      setSavedAt(
        event.status.savedAt
          ? new Date(event.status.savedAt).toLocaleTimeString()
          : 'not saved yet',
      );
      setError(event.status.error?.message ?? null);
    });

    const currentStatus = draftPersistPlugin.getStatus(actualBloc as never);
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
  }, [actualBloc]);

  useEffect(() => {
    let cancelled = false;

    setHydrationReady('pending');
    void actualBloc.$blac.hydration
      .wait()
      .then(() => {
        if (!cancelled) {
          setHydrationReady('ready');
        }
      })
      .catch((nextError) => {
        if (!cancelled) {
          setHydrationReady('error');
          setError(
            nextError instanceof Error ? nextError.message : String(nextError),
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [actualBloc]);

  return (
    <Card>
      <div style={{ position: 'relative' }}>
        <RenderCounter name="PersistenceStatus" />
        <h4>Persistence Status</h4>
        <div className="stack-xs text-small text-muted">
          <p>
            <strong>Plugin phase:</strong> <code>{persistStatus}</code>
          </p>
          <p>
            <strong>Core hydration:</strong>{' '}
            <code>{actualBloc.$blac.hydration.status}</code>
          </p>
          <p>
            <strong>waitForHydration():</strong> <code>{hydrationReady}</code>
          </p>
          <p>
            <strong>Hydrated:</strong>{' '}
            <code>
              {actualBloc.$blac.hydration.isHydrated ? 'true' : 'false'}
            </code>
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
      </div>
    </Card>
  );
}
