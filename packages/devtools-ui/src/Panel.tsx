import { useState, useSyncExternalStore } from 'react';
import type {
  ClientStatus,
  DevToolsClient,
  LogEntry,
} from '@blac/devtools-connect/client';
import { PROTOCOL_VERSION } from '@blac/devtools-connect/protocol';
import { Inspector } from './Inspector';
import { InstanceList } from './InstanceList';
import { LogView } from './LogView';
import { CSS } from './styles';

export interface PanelProps {
  client: DevToolsClient;
  theme?: 'auto' | 'light' | 'dark';
}

type Tab = 'instances' | 'log';

const STATUS_LABEL: Record<ClientStatus, string> = {
  connecting: 'Waiting for a BlaC app…',
  connected: 'Connected',
  incompatible: '',
  closed: 'Disconnected',
};

export function Panel({ client, theme = 'auto' }: PanelProps) {
  const state = useSyncExternalStore(client.subscribe, client.getSnapshot);
  const [tab, setTab] = useState<Tab>('instances');
  const [pick, setPick] = useState<{ id: string; version: number | null }>();
  const { status, selectedId } = state;
  const selected = state.instances.find((meta) => meta.id === selectedId);
  const pickedVersion = pick?.id === selectedId ? pick.version : null;

  const select = (id: string, version: number | null = null) => {
    client.select(id);
    setPick({ id, version });
  };

  const openLogEntry = (entry: LogEntry) => {
    select(entry.id, entry.kind === 'changed' ? (entry.version ?? null) : null);
    setTab('instances');
  };

  let body;
  if (status === 'incompatible') {
    body = (
      <p className="empty">
        agent v{state.agentProtocol} / panel v{PROTOCOL_VERSION} — update one of
        them
      </p>
    );
  } else if (tab === 'log') {
    body = (
      <LogView
        log={state.log}
        onOpen={openLogEntry}
        onClear={() => client.clearLog()}
      />
    );
  } else {
    body = (
      <div className="split">
        <InstanceList
          instances={state.instances}
          selectedId={selectedId}
          onSelect={select}
        />
        {selected ? (
          <Inspector
            key={selected.id}
            meta={selected}
            history={state.history}
            pickedVersion={pickedVersion}
            onPick={(version) => setPick({ id: selected.id, version })}
          />
        ) : (
          <p className="empty">Select an instance to inspect it.</p>
        )}
      </div>
    );
  }

  return (
    <div className="bd" data-theme={theme}>
      <style>{CSS}</style>
      {status !== 'incompatible' && (
        <nav>
          {(['instances', 'log'] as const).map((name) => (
            <button
              key={name}
              type="button"
              className={tab === name ? 'tab active' : 'tab'}
              aria-pressed={tab === name}
              onClick={() => setTab(name)}
            >
              {name === 'instances' ? 'Instances' : 'Log'}
            </button>
          ))}
          <span className="status">
            <span className={`dot ${status}`} />
            {STATUS_LABEL[status]}
          </span>
        </nav>
      )}
      {body}
    </div>
  );
}
