import { useEffect, useRef, useState, type PointerEvent } from 'react';
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

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface PictureInPicture {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
}

const OPEN_KEY = 'blac-devtools-open';
const BOX_KEY = 'blac-devtools-box';
const TOGGLE_EVENT = 'blac-devtools-toggle';
const MIN_W = 320;
const MIN_H = 160;

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

const pictureInPicture = () =>
  (window as { documentPictureInPicture?: PictureInPicture })
    .documentPictureInPicture;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

function clampBox({ x, y, w, h }: Box): Box {
  const width = clamp(w, MIN_W, window.innerWidth);
  const height = clamp(h, MIN_H, window.innerHeight);
  return {
    w: width,
    h: height,
    x: clamp(x, 0, window.innerWidth - width),
    y: clamp(y, 0, window.innerHeight - height),
  };
}

function readBox(): Box {
  const stored = read(BOX_KEY);
  const fallback = { x: Infinity, y: Infinity, w: 560, h: 360 };
  try {
    return clampBox({ ...fallback, ...(stored ? JSON.parse(stored) : {}) });
  } catch {
    return clampBox(fallback);
  }
}

function Content({
  client,
  theme,
}: {
  client: DevToolsClient | undefined;
  theme: PanelProps['theme'];
}) {
  if (client) return <Panel client={client} theme={theme} />;
  return (
    <div className="bd" data-theme={theme}>
      <style>{CSS}</style>
      <p className="empty">
        No BlaC DevTools agent in this page. Install createDevToolsAgent() and
        reload.
      </p>
    </div>
  );
}

function FloatingWindow({
  client,
  theme,
  onPopOut,
  onClose,
}: {
  client: DevToolsClient | undefined;
  theme: PanelProps['theme'];
  onPopOut: (box: Box) => void;
  onClose: () => void;
}) {
  const [box, setBox] = useState(readBox);
  const gesture = useRef<{ resize: boolean; x: number; y: number; box: Box }>(
    undefined,
  );
  useEffect(() => write(BOX_KEY, JSON.stringify(box)), [box]);

  const begin = (resize: boolean) => (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    gesture.current = { resize, x: e.clientX, y: e.clientY, box };
  };

  const track = (e: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current;
    if (!start || e.buttons !== 1) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    setBox(
      clampBox(
        start.resize
          ? { ...start.box, w: start.box.w + dx, h: start.box.h + dy }
          : { ...start.box, x: start.box.x + dx, y: start.box.y + dy },
      ),
    );
  };

  return (
    <div
      className="bd-float"
      data-theme={theme}
      style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
    >
      <div
        className="bd-bar"
        onPointerDown={begin(false)}
        onPointerMove={track}
      >
        <span className="bd-title">BlaC DevTools</span>
        {pictureInPicture() && (
          <button
            type="button"
            aria-label="Pop out"
            title="Pop out (Picture-in-Picture)"
            onClick={() => onPopOut(box)}
          >
            ⧉
          </button>
        )}
        <button type="button" aria-label="Close" onClick={onClose}>
          ×
        </button>
      </div>
      <div className="bd-body">
        <Content client={client} theme={theme} />
      </div>
      <div
        className="bd-grip"
        role="separator"
        onPointerDown={begin(true)}
        onPointerMove={track}
      />
    </div>
  );
}

export function BlacDevtoolsUi({ theme = 'auto' }: BlacDevtoolsUiProps) {
  const [open, setOpen] = useState(() => read(OPEN_KEY) === '1');
  const [pip, setPip] = useState<Window>();

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
    if (!open) pip?.close();
  }, [open, pip]);

  const popOut = async ({ w, h }: Box) => {
    const win = await pictureInPicture()?.requestWindow({
      width: w,
      height: h,
    });
    if (!win) return;
    win.addEventListener('pagehide', () => setPip(undefined));
    setPip(win);
  };

  useEffect(() => {
    if (!open) return;
    const doc = pip?.document ?? document;
    const host = doc.createElement('div');
    host.style.cssText = pip
      ? 'height:100vh'
      : 'position:fixed;inset:0;pointer-events:none;z-index:2147483647';
    if (pip) doc.body.style.margin = '0';
    const mount = doc.createElement('div');
    mount.style.height = '100%';
    host.attachShadow({ mode: 'open' }).append(mount);
    doc.body.append(host);

    const client = connectInPage();
    const root = createRoot(mount);
    root.render(
      pip ? (
        <div className="bd-pip" data-theme={theme}>
          <Content client={client} theme={theme} />
        </div>
      ) : (
        <FloatingWindow
          client={client}
          theme={theme}
          onPopOut={popOut}
          onClose={() => setOpen(false)}
        />
      ),
    );
    return () => {
      client?.close();
      host.remove();
      queueMicrotask(() => root.unmount());
    };
  }, [open, theme, pip]);

  return null;
}
