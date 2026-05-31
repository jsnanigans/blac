# WebSocket Subscription

**Use when:** you need a persistent, server-pushed connection — a live chat feed,
real-time dashboard, presence indicators, or a collaborative document.
**Don't use when:** you only need server-sent data occasionally and polling would
suffice; a persistent socket has reconnect overhead and connection limits.

## Pattern

Open the socket in `init`, push received messages into state with `patch`, and
close the socket in the `dispose` system event so it is always cleaned up.

```ts twoslash
import { Cubit } from '@blac/core';

interface ChatMessage {
  id: string;
  author: string;
  text: string;
  timestamp: number;
}

interface ChatState {
  messages: ChatMessage[];
  connected: boolean;
  error: string | null;
}

// Minimal WebSocket-like interface for illustration.
declare class ReconnectingWebSocket {
  constructor(url: string);
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onerror: ((e: Event) => void) | null;
  onmessage: ((e: { data: string }) => void) | null;
  send(data: string): void;
  close(): void;
}

declare const WS_URL: string;
// ---cut---
class ChatCubit extends Cubit<ChatState, { channelId: string }> {
  private socket: ReconnectingWebSocket | null = null;

  constructor() {
    super({ messages: [], connected: false, error: null });

    this.onSystemEvent('dispose', () => {
      // Always close on disposal — avoid orphaned connections.
      this.socket?.close();
      this.socket = null;
    });
  }

  protected override init({ channelId }: { channelId: string }) {
    this.connect(channelId);
  }

  private connect(channelId: string) {
    const ws = new ReconnectingWebSocket(`${WS_URL}/chat/${channelId}`);
    this.socket = ws;

    ws.onopen = () => {
      this.patch({ connected: true, error: null });
    };

    ws.onclose = () => {
      this.patch({ connected: false });
    };

    ws.onerror = (e) => {
      // ⚠️ Never forward raw WebSocket error events to an analytics sink —
      // they may contain auth tokens present in the connection URL.
      this.patch({ connected: false, error: 'Connection error' });
    };

    ws.onmessage = ({ data }) => {
      // Parse incoming data defensively — the server may send system frames.
      let message: ChatMessage;
      try {
        message = JSON.parse(data) as ChatMessage;
      } catch {
        return; // ignore malformed frames
      }
      this.patch({
        messages: [...this.state.messages, message],
      });
    };
  }

  sendMessage = (text: string) => {
    if (!this.state.connected || !this.socket) return;
    this.socket.send(JSON.stringify({ text }));
  };
}
```

```tsx
function ChatRoom({ channelId }: { channelId: string }) {
  // args: { channelId } both seeds init() and keys the instance — one per channel
  const [state, chat] = useBloc(ChatCubit, {
    args: { channelId },
  });

  return (
    <div>
      <span>{state.connected ? '🟢 Connected' : '🔴 Disconnected'}</span>
      <ul>
        {state.messages.map((m) => (
          <li key={m.id}>
            <strong>{m.author}</strong>: {m.text}
          </li>
        ))}
      </ul>
      <MessageInput onSend={chat.sendMessage} disabled={!state.connected} />
    </div>
  );
}
```

::: danger Orphaned connections
If the socket outlives the Cubit it will fire `onmessage` on a disposed container
and throw. The `onSystemEvent('dispose', …)` cleanup above prevents this. Do not
skip it.
:::

::: tip Per-channel instances
`channelId` lives in `args`, which both seeds `init()` and keys the instance.
Multiple `<ChatRoom>` components with different `channelId` values each get their
own Cubit (and socket); the same `channelId` reuses a shared instance. When all
consumers of a channel unmount, the instance is disposed and the socket is closed
automatically.
:::

::: warning Message volume
High-frequency feeds (>10 messages/sec) that call `patch` on every frame will
saturate the emit-rate circuit breaker. Batch incoming messages before applying
them — accumulate in a local buffer and flush on a 16 ms `setTimeout`, or sample
at the cadence your UI needs.
:::

## See also

- [System Events](/core/system-events) — `dispose` event for cleanup
- [Instance Management](/core/instance-management) — ref-counting and per-channel instances
- [Async](/guide/async) — cancellation on disposal
