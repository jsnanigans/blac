import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import {
  AGENT_HOOK,
  WINDOW_AGENT_SOURCE,
} from '@blac/devtools-connect/protocol';
import { BlacDevtoolsUi } from './Overlay';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const g = globalThis as Record<symbol, unknown>;
let container: HTMLElement;
let root: Root;

const overlayText = () =>
  [...document.body.children]
    .map((el) => el.shadowRoot?.textContent ?? '')
    .join('');

beforeEach(() => {
  const store = new Map([['blac-devtools-open', '1']]);
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
  });
  container = document.body.appendChild(document.createElement('div'));
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  delete g[AGENT_HOOK];
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('BlacDevtoolsUi', () => {
  it('connects to an agent installed after it opened', async () => {
    await act(async () => root.render(<BlacDevtoolsUi />));
    expect(overlayText()).toContain('No devtools agent');

    const connect = vi.fn(() => () => {});
    g[AGENT_HOOK] = { connect };
    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { source: WINDOW_AGENT_SOURCE, msg: { t: 'ready' } },
        }),
      );
    });

    expect(connect).toHaveBeenCalledOnce();
    expect(overlayText()).not.toContain('No devtools agent');
  });

  it('renders nothing in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    await act(async () => root.render(<BlacDevtoolsUi />));

    expect(overlayText()).toBe('');
  });
});
