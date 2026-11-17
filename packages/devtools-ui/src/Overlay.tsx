import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { createRoot } from 'react-dom/client';
import {
  connectInPage,
  type DevToolsClient,
} from '@blac/devtools-connect/client';
import { WINDOW_AGENT_SOURCE } from '@blac/devtools-connect/protocol';
import { Panel, Shell, type Chrome, type Theme } from './Panel';
import { Icon, Notice, read, write } from './ui';

export interface BlacDevtoolsUiProps {
  theme?: Theme;
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

declare const process: { env: Record<string, string | undefined> };

/** Literal `process.env.NODE_ENV` so bundler defines replace it. */
function isProduction(): boolean {
  try {
    return process.env.NODE_ENV === 'production';
  } catch {
    return false;
  }
}

/** Typing Alt+D in a field (∂ on macOS) shouldn't toggle the overlay. */
function isEditable(e: KeyboardEvent): boolean {
  const el = e.composedPath()[0] as HTMLElement | undefined;
  return (
    !!el?.isContentEditable ||
    /^(INPUT|TEXTAREA|SELECT)$/.test(el?.tagName ?? '')
  );
}

/**
 * Connects to the in-page agent, and (re)connects whenever an agent announces
 * itself — e.g. one installed after the overlay opened, or after HMR.
 */
function useInPageClient(): DevToolsClient | undefined {
  const [client, setClient] = useState<DevToolsClient>();
  useEffect(() => {
    let current: DevToolsClient | undefined;
    const connect = () => {
      current?.close();
      current = connectInPage();
      setClient(current);
    };
    const onMessage = (e: MessageEvent) => {
      const data = e.data as { source?: string; msg?: { t?: string } } | null;
      if (data?.source === WINDOW_AGENT_SOURCE && data.msg?.t === 'ready') {
        connect();
      }
    };
    connect();
    window.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('message', onMessage);
      current?.close();
    };
  }, []);
  return client;
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
  const fallback = { x: Infinity, y: Infinity, w: 720, h: 440 };
  try {
    return clampBox({ ...fallback, ...(stored ? JSON.parse(stored) : {}) });
  } catch {
    return clampBox(fallback);
  }
}

function Content({ theme, chrome }: { theme: Theme; chrome?: Chrome }) {
  const client = useInPageClient();
  if (client) return <Panel client={client} theme={theme} chrome={chrome} />;
  return (
    <Shell theme={theme} chrome={chrome}>
      <Notice tone="info" title="No devtools agent in this page">
        Install <code>createDevToolsAgent()</code>, then reload.
      </Notice>
    </Shell>
  );
}

function FloatingWindow({
  theme,
  onPopOut,
  onClose,
}: {
  theme: Theme;
  onPopOut: (box: Box) => void;
  onClose: () => void;
}) {
  const [box, setBox] = useState(readBox);
  const gesture = useRef<{ resize: boolean; x: number; y: number; box: Box }>(
    undefined,
  );
  useEffect(() => write(BOX_KEY, JSON.stringify(box)), [box]);

  const begin = (resize: boolean) => (e: PointerEvent<HTMLElement>) => {
    if ((e.target as Element).closest('button, input')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    gesture.current = { resize, x: e.clientX, y: e.clientY, box };
  };

  const track = (e: PointerEvent<HTMLElement>) => {
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

  const chrome: Chrome = {
    headProps: { onPointerDown: begin(false), onPointerMove: track },
    actions: (
      <>
        {pictureInPicture() && (
          <button
            type="button"
            className="icon-btn"
            aria-label="Pop out"
            title="Pop out into its own window"
            onClick={() => onPopOut(box)}
          >
            <Icon name="pip" size={15} />
          </button>
        )}
        <button
          type="button"
          className="icon-btn"
          aria-label="Close"
          title="Close (Alt+D)"
          onClick={onClose}
        >
          <Icon name="x" size={16} />
        </button>
      </>
    ),
  };

  return (
    <div
      className="bd-float"
      data-theme={theme}
      style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
    >
      <Content theme={theme} chrome={chrome} />
      <div
        className="bd-grip"
        role="separator"
        aria-label="Resize"
        onPointerDown={begin(true)}
        onPointerMove={track}
      />
    </div>
  );
}

/** Renders nothing in production builds. */
export function BlacDevtoolsUi(props: BlacDevtoolsUiProps) {
  return isProduction() ? null : <Overlay {...props} />;
}

function Overlay({ theme = 'auto' }: BlacDevtoolsUiProps) {
  const [open, setOpen] = useState(() => read(OPEN_KEY) === '1');
  const [pip, setPip] = useState<Window>();

  useEffect(() => {
    const toggle = () => setOpen((value) => !value);
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.code !== 'KeyD' || isEditable(e)) return;
      e.preventDefault();
      toggle();
    };
    const targets = pip ? [window, pip] : [window];
    for (const target of targets) target.addEventListener('keydown', onKey);
    window.addEventListener(TOGGLE_EVENT, toggle);
    return () => {
      for (const target of targets) {
        target.removeEventListener('keydown', onKey);
      }
      window.removeEventListener(TOGGLE_EVENT, toggle);
    };
  }, [pip]);

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

    const root = createRoot(mount);
    root.render(
      pip ? (
        <div className="bd-pip" data-theme={theme}>
          <Content theme={theme} />
        </div>
      ) : (
        <FloatingWindow
          theme={theme}
          onPopOut={popOut}
          onClose={() => setOpen(false)}
        />
      ),
    );
    return () => {
      host.remove();
      queueMicrotask(() => root.unmount());
    };
  }, [open, theme, pip]);

  return null;
}
