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

const meta = (id: string, className: string, name: string) => ({
  id,
  className,
  name,
  createdAt: 0,
  updatedAt: 0,
  version: 1,
});

const base: ClientState = {
  status: 'connected',
  instances: [
    meta('a', 'CounterBloc', 'main'),
    meta('b', 'CounterBloc', 'side'),
    meta('c', 'TodoBloc', 'todos'),
  ],
  selectedId: null,
  history: [],
  log: [],
};

vi.stubGlobal(
  'fetch',
  vi.fn(async () => Response.json({ version: '99.0.0' })),
);

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
  it('groups instances and filters by text', () => {
    render(base);
    expect(
      [...container.querySelectorAll('[data-row]')].map((r) =>
        r.textContent?.split(' · ').slice(0, -1).join(' · '),
      ),
    ).toEqual([
      'a · main · v1',
      'b · side · v1',
      'TOTodoBloc · c · todos · v1',
    ]);

    const header = container.querySelector('.group .row');
    expect(header?.textContent).toBe('COCounterBloc2');
    click(header);
    expect(container.querySelectorAll('[data-row]')).toHaveLength(1);
    click(header);

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
    expect(container.querySelectorAll('[data-row]')).toHaveLength(1);
  });

  it('selects an instance through the client', () => {
    const client = render(base);
    click(button('todos'));
    expect(client.select).toHaveBeenCalledWith('c');
  });

  it('diffs a chosen history entry against the one before', () => {
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
    click(button('Changes'));
    expect(container.querySelector('.changes')?.textContent).toContain('count');
    expect(container.textContent).toContain('v1 → v2');

    click(button('History'));
    click(
      [...container.querySelectorAll('.insp-body .row')].find((row) =>
        row.textContent?.startsWith('v1'),
      ),
    );
    click(button('Changes'));
    expect(container.textContent).toContain('v0 → v1');
    expect(container.textContent).toContain('Viewing v1');
  });

  it('moves through instances with j and switches tabs with 2', () => {
    const client = render(base);
    const row = button('main') as HTMLElement;
    const key = (k: string) =>
      act(() => {
        document.activeElement?.dispatchEvent(
          new KeyboardEvent('keydown', { key: k, bubbles: true }),
        );
      });
    row.focus();

    key('j');
    expect(client.select).toHaveBeenLastCalledWith('b');

    key('2');
    expect(container.textContent).toContain('No events yet');
  });

  it('shows the version mismatch only', () => {
    render({ ...base, status: 'incompatible', agentProtocol: 9 });
    expect(container.textContent).toContain('protocol v9, this panel v1');
    expect(container.textContent).toContain('Update @blac/devtools-ui.');
    expect(container.querySelector('.seg')).toBeNull();
  });

  it('warns which sides to update when versions differ', async () => {
    render({ ...base, agentVersion: '0.0.1' });
    expect(container.textContent).toContain(
      'Update @blac/devtools-connect in the app.',
    );
    expect(container.querySelector('.seg')).not.toBeNull();

    await act(async () => {});
    expect(container.textContent).toContain(
      'latest is v99.0.0. Update @blac/devtools-connect in the app and @blac/devtools-ui.',
    );
  });
});
