import {
  useState,
  useSyncExternalStore,
  type HTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import type {
  ClientStatus,
  DevToolsClient,
  LogEntry,
} from '@blac/devtools-connect/client';
import { PROTOCOL_VERSION } from '@blac/devtools-connect/protocol';
import { Inspector, type View } from './Inspector';
import { InstanceList } from './InstanceList';
import { LogView } from './LogView';
import { CSS } from './styles';
import {
  Empty,
  Icon,
  Kbd,
  Notice,
  ResizeHandle,
  Segmented,
  useNow,
  useStoredWidth,
  type IconName,
  type Tone,
} from './ui';

export type Theme = 'auto' | 'light' | 'dark';

export interface PanelProps {
  client: DevToolsClient;
  theme?: Theme;
}

/** Window controls and drag handling the overlay adds to the header. */
export interface Chrome {
  actions?: ReactNode;
  headProps?: HTMLAttributes<HTMLElement>;
}

type Tab = 'instances' | 'log';

const TABS: readonly Tab[] = ['instances', 'log'];
const LIST_BOUNDS = { initial: 280, min: 200, max: 520 };

const STATUS: Record<
  ClientStatus,
  { tone: Tone; icon: IconName; label: string }
> = {
  connected: { tone: 'success', icon: 'dot', label: 'Connected' },
  connecting: { tone: 'warn', icon: 'loader', label: 'Waiting for the app' },
  incompatible: { tone: 'danger', icon: 'disposed', label: 'Incompatible' },
  closed: { tone: 'danger', icon: 'disposed', label: 'Disconnected' },
};

export function Shell({
  theme,
  status,
  center,
  chrome,
  children,
  onKeyDown,
}: {
  theme: Theme;
  status?: ClientStatus;
  center?: ReactNode;
  chrome?: Chrome;
  children: ReactNode;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
}) {
  const shown = status && STATUS[status];
  return (
    <div className="bd" data-theme={theme} onKeyDown={onKeyDown}>
      <style>{CSS}</style>
      <header
        className="head"
        data-drag={chrome?.headProps ? '' : undefined}
        {...chrome?.headProps}
      >
        <span className="brand">BlaC</span>
        {center}
        <span className="spacer" />
        {shown && (
          <span className="status" data-tone={shown.tone} title={shown.label}>
            <Icon
              name={shown.icon}
              size={14}
              className={status === 'connecting' ? 'spin' : undefined}
            />
            {status !== 'connected' && (
              <span className="label">{shown.label}</span>
            )}
          </span>
        )}
        {chrome?.actions}
      </header>
      {children}
    </div>
  );
}

export function Panel({
  client,
  theme = 'auto',
  chrome,
}: PanelProps & { chrome?: Chrome }) {
  const state = useSyncExternalStore(client.subscribe, client.getSnapshot);
  const now = useNow();
  const [tab, setTab] = useState<Tab>('instances');
  const [view, setView] = useState<View>('state');
  const [pick, setPick] = useState<{ id: string; version: number | null }>();
  const [listWidth, setListWidth] = useStoredWidth(
    'blac-devtools-list-width',
    LIST_BOUNDS,
  );
  const { status, selectedId, history } = state;
  const selected = state.instances.find((meta) => meta.id === selectedId);
  const pickedVersion = pick?.id === selectedId ? pick.version : null;

  const select = (id: string | null, version: number | null = null) => {
    client.select(id);
    if (id) setPick({ id, version });
  };

  const pickVersion = (version: number | null) => {
    if (selectedId) setPick({ id: selectedId, version });
  };

  const openLogEntry = (entry: LogEntry) => {
    const version = entry.kind === 'changed' ? (entry.version ?? null) : null;
    select(entry.id, version);
    setView(version === null ? 'state' : 'changes');
    setTab('instances');
  };

  const stepVersion = (by: number) => {
    if (history.length === 0) return;
    const current = history.findIndex((e) => e.version === pickedVersion);
    const index = current >= 0 ? current : history.length - 1;
    const next = Math.min(history.length - 1, Math.max(0, index + by));
    pickVersion(next === history.length - 1 ? null : history[next].version);
  };

  const moveInList = (e: KeyboardEvent<HTMLDivElement>, by: number) => {
    const target = e.target as HTMLElement;
    const list =
      target.closest<HTMLElement>('[data-list]') ??
      e.currentTarget.querySelector<HTMLElement>('[data-list]');
    if (!list) return;
    e.preventDefault();
    const rows = [...list.querySelectorAll<HTMLElement>('[data-row]')];
    const from =
      target.closest<HTMLElement>('[data-row]') ??
      list.querySelector<HTMLElement>('[data-row][aria-pressed="true"]');
    const index = from ? rows.indexOf(from) : -1;
    const next = rows[Math.min(rows.length - 1, Math.max(0, index + by))];
    if (!next || next === from) return;
    next.focus();
    if (list.dataset.list === 'select') next.click();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target as HTMLElement;
    if (e.key === 'Escape') {
      if (target.tagName === 'INPUT') target.blur();
      else if (pickedVersion !== null) pickVersion(null);
      else if (selectedId) select(null);
      return;
    }
    if (target.tagName === 'INPUT') return;
    const inspecting = tab === 'instances' && !!selected;
    switch (e.key) {
      case '/':
        e.preventDefault();
        e.currentTarget.querySelector<HTMLElement>('[data-filter]')?.focus();
        break;
      case '1':
        setTab('instances');
        break;
      case '2':
        setTab('log');
        break;
      case 'j':
      case 'ArrowDown':
        moveInList(e, 1);
        break;
      case 'k':
      case 'ArrowUp':
        moveInList(e, -1);
        break;
      case 's':
      case 'c':
      case 'h':
        if (inspecting) {
          setView(({ s: 'state', c: 'changes', h: 'history' } as const)[e.key]);
        }
        break;
      case '[':
        if (inspecting) stepVersion(-1);
        break;
      case ']':
        if (inspecting) stepVersion(1);
        break;
      case 'l':
        if (inspecting) pickVersion(null);
        break;
    }
  };

  const tabs = status !== 'incompatible' && (
    <Segmented
      label="View"
      options={TABS}
      value={tab}
      onChange={setTab}
      render={(name) => (
        <>
          {name === 'instances' ? 'Instances' : 'Log'}
          <span className="num">
            {name === 'instances' ? state.instances.length : state.log.length}
          </span>
        </>
      )}
    />
  );

  let body;
  if (status === 'incompatible') {
    body = (
      <Notice tone="danger" title="Version mismatch">
        The app's agent speaks protocol v{state.agentProtocol}, this panel v
        {PROTOCOL_VERSION}. Update <code>@blac/devtools-connect</code> or the
        extension so they match.
      </Notice>
    );
  } else if (status !== 'connected' && state.instances.length === 0) {
    body =
      status === 'closed' ? (
        <Notice tone="danger" title="Disconnected">
          Reopen the devtools to connect again.
        </Notice>
      ) : (
        <Notice tone="info" title="Waiting for a BlaC app">
          Install <code>createDevToolsAgent()</code> in the page, then reload
          it.
        </Notice>
      );
  } else if (tab === 'log') {
    body = (
      <div className="pane main-pane">
        <LogView
          log={state.log}
          onOpen={openLogEntry}
          onClear={() => client.clearLog()}
        />
      </div>
    );
  } else {
    body = (
      <div className="split" data-selected={selected ? '' : undefined}>
        <div className="pane list-pane" style={{ width: listWidth }}>
          <InstanceList
            instances={state.instances}
            selectedId={selectedId}
            onSelect={(id) => select(id)}
          />
        </div>
        <ResizeHandle
          label="Resize instance list"
          width={listWidth}
          onWidth={setListWidth}
          bounds={LIST_BOUNDS}
        />
        <div className="pane main-pane">
          {selected ? (
            <Inspector
              key={selected.id}
              meta={selected}
              history={history}
              pickedVersion={pickedVersion}
              onPick={pickVersion}
              view={view}
              onView={setView}
              onBack={() => select(null)}
              now={now}
            />
          ) : (
            <Empty
              title="Nothing selected"
              hint={
                <>
                  Pick an instance to see its state, changes and history. Use{' '}
                  <Kbd>j</Kbd>
                  <Kbd>k</Kbd> to move and <Kbd>/</Kbd> to filter.
                </>
              }
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <Shell
      theme={theme}
      status={status}
      center={tabs}
      chrome={chrome}
      onKeyDown={onKeyDown}
    >
      {body}
    </Shell>
  );
}
