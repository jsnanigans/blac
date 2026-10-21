import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type {
  ClientState,
  DevToolsClient,
} from '@blac/devtools-connect/client';
import { Panel } from './Panel';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const meta = (
  id: string,
  className: string,
  name: string,
  disposedAt?: number,
) => ({
  id,
  className,
  name,
  createdAt: 0,
  updatedAt: 0,
  version: 1,
  disposedAt,
});

const base: ClientState = {
  status: 'connected',
  instances: [
    meta('a', 'CounterBloc', 'main'),
    meta('b', 'CounterBloc', 'side'),
    meta('c', 'TodoBloc', 'todos'),
    meta('d', 'TodoBloc', 'old', 5),
  ],
  selectedId: null,
  history: [],
  log: [],
};

let container: HTMLElement;
let root: Root;

const render = (state: ClientState) => {
  const client = {
    subscribe: () => () => {},
    getSnapshot: () => state,
    select: vi.fn(),
    clearLog: vi.fn(),
  };
  act(() => {
    root.render(<Panel client={client as unknown as DevToolsClient} />);
  });
  return client;
};

const click = (el: Element | null | undefined) =>
  act(() => {
    el?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  });

const button = (text: string) =>
  [...container.querySelectorAll('button')].find((b) =>
    b.textContent?.includes(text),
  );

beforeEach(() => {
  container = document.body.appendChild(document.createElement('div'));
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe('Panel', () => {
  it('groups instances, hides disposed and filters by text', () => {
    render(base);
    expect(
      [...container.querySelectorAll('h3')].map((h) => h.textContent),
    ).toEqual(['CounterBloc 2', 'TodoBloc 1']);

    const input = container.querySelector(
      'input[type=search]',
    ) as HTMLInputElement;
    act(() => {
      Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        'value',
      )?.set?.call(input, 'side');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(container.querySelectorAll('.item')).toHaveLength(1);
  });

  it('selects an instance through the client', () => {
    const client = render(base);
    click(button('todos'));
    expect(client.select).toHaveBeenCalledWith('c');
  });

  it('shows state and the diff for a chosen history entry', () => {
    const entry = (version: number, count: number) => ({
      version,
      at: version,
      paths: ['count'],
      state: { count },
    });
    render({
      ...base,
      selectedId: 'a',
      history: [entry(0, 0), entry(1, 1), entry(2, 5)],
    });
    expect(container.textContent).toContain('Changes vs v1');

    click(button('v1'));
    expect(container.textContent).toContain('Changes vs v0');
    expect(container.querySelector('.changes')?.textContent).toContain('count');
  });

  it('shows the version mismatch only', () => {
    render({ ...base, status: 'incompatible', agentProtocol: 9 });
    expect(container.textContent).toContain('agent v9 / panel v1');
    expect(container.querySelector('nav')).toBeNull();
  });
});
