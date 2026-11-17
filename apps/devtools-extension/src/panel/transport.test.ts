import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { PROTOCOL_VERSION } from '@blac/devtools-connect/protocol';
import { createPanelTransport } from './transport';

type Listener = (...args: unknown[]) => void;

const ports: Array<{
  postMessage: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  fire: (event: 'message' | 'disconnect', arg?: unknown) => void;
}> = [];

const event = (list: Listener[]) => ({
  addListener: (cb: Listener) => list.push(cb),
});

vi.stubGlobal('chrome', {
  runtime: {
    connect: () => {
      const message: Listener[] = [];
      const disconnect: Listener[] = [];
      const port = {
        postMessage: vi.fn(),
        disconnect: vi.fn(),
        onMessage: event(message),
        onDisconnect: event(disconnect),
        fire: (kind: 'message' | 'disconnect', arg?: unknown) =>
          (kind === 'message' ? message : disconnect).forEach((cb) => cb(arg)),
      };
      ports.push(port);
      return port;
    },
  },
});

afterEach(() => {
  ports.length = 0;
  vi.useRealTimers();
});

describe('createPanelTransport', () => {
  it('reconnects after the port drops and announces bye, then ready', () => {
    vi.useFakeTimers();
    const transport = createPanelTransport('blac-panel:1');
    const received = vi.fn();
    transport.onMessage(received);

    ports[0].fire('disconnect');
    expect(received).toHaveBeenLastCalledWith({ t: 'bye' });

    vi.advanceTimersByTime(500);
    expect(ports).toHaveLength(2);
    expect(received).toHaveBeenLastCalledWith({
      t: 'ready',
      protocol: PROTOCOL_VERSION,
    });

    transport.send({ t: 'snapshot' });
    expect(ports[1].postMessage).toHaveBeenCalledWith({ t: 'snapshot' });
  });

  it('stays closed once closed', () => {
    vi.useFakeTimers();
    const transport = createPanelTransport('blac-panel:1');
    transport.close();
    ports[0].fire('disconnect');
    vi.advanceTimersByTime(500);

    expect(ports).toHaveLength(1);
    expect(ports[0].disconnect).toHaveBeenCalled();
  });
});
