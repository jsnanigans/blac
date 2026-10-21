import { useEffect, useState, type PointerEvent } from 'react';
import { createRoot } from 'react-dom/client';
import {
  connectInPage,
  type DevToolsClient,
} from '@blac/devtools-connect/client';
import { Panel, type PanelProps } from './Panel';
import { CSS } from './styles';

export interface BlacDevtoolsUiProps {
  theme?: PanelProps['theme'];
}

const OPEN_KEY = 'blac-devtools-open';
const HEIGHT_KEY = 'blac-devtools-height';
const TOGGLE_EVENT = 'blac-devtools-toggle';
const MIN_HEIGHT = 120;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage unavailable
  }
}

const clampHeight = (height: number) =>
  Math.min(Math.max(height, MIN_HEIGHT), window.innerHeight - 40);

function Dock({
  client,
  theme,
  onClose,
}: {
  client: DevToolsClient | undefined;
  theme: PanelProps['theme'];
  onClose: () => void;
}) {
  const [height, setHeight] = useState(() =>
    clampHeight(Number(read(HEIGHT_KEY)) || 320),
  );
  useEffect(() => write(HEIGHT_KEY, String(height)), [height]);

  const resize = (e: PointerEvent<HTMLDivElement>) => {
    if (e.buttons === 1) setHeight(clampHeight(window.innerHeight - e.clientY));
  };

  return (
    <div className="bd-dock" data-theme={theme} style={{ height }}>
      <div
        className="bd-resize"
        role="separator"
        aria-orientation="horizontal"
        onPointerDown={(e) => e.currentTarget.setPointerCapture(e.pointerId)}
        onPointerMove={resize}
      />
      <button
        type="button"
        className="bd-close"
        aria-label="Close"
        onClick={onClose}
      >
        ×
      </button>
      {client ? (
        <Panel client={client} theme={theme} />
      ) : (
        <div className="bd" data-theme={theme}>
          <style>{CSS}</style>
          <p className="empty">
            No BlaC DevTools agent in this page. Install createDevToolsAgent()
            and reload.
          </p>
        </div>
      )}
    </div>
  );
}

export function BlacDevtoolsUi({ theme = 'auto' }: BlacDevtoolsUiProps) {
  const [open, setOpen] = useState(() => read(OPEN_KEY) === '1');

  useEffect(() => {
    const toggle = () => setOpen((value) => !value);
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && e.code === 'KeyD') toggle();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener(TOGGLE_EVENT, toggle);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(TOGGLE_EVENT, toggle);
    };
  }, []);

  useEffect(() => write(OPEN_KEY, open ? '1' : '0'), [open]);

  useEffect(() => {
    if (!open) return;
    const host = document.createElement('div');
    host.style.cssText =
      'position:fixed;left:0;right:0;bottom:0;z-index:2147483647';
    const mount = document.createElement('div');
    host.attachShadow({ mode: 'open' }).append(mount);
    document.body.append(host);

    const client = connectInPage();
    const root = createRoot(mount);
    root.render(
      <Dock client={client} theme={theme} onClose={() => setOpen(false)} />,
    );
    return () => {
      client?.close();
      host.remove();
      queueMicrotask(() => root.unmount());
    };
  }, [open, theme]);

  return null;
}
