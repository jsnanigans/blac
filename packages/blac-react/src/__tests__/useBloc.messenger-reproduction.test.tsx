/**
 * Faithful Messenger Example Reproduction
 *
 * This exactly reproduces the structure from:
 * - apps/examples/src/messenger/components/MessageList.tsx
 * - apps/examples/src/messenger/components/MessageItem.tsx
 * - apps/examples/src/messenger/blocs/ChannelBloc.ts
 *
 * Key patterns:
 * 1. MessageList extracts messages from ChannelBloc
 * 2. MessageList maps messages and passes each to MessageItem
 * 3. MessageItem is a separate component receiving message as prop
 * 4. MessageItem displays message.status
 */

import { render, screen, act } from '@testing-library/react';
import { Cubit, StateContainer } from '@blac/core';
import { useBloc } from '../useBloc';
import { describe, it, expect, afterEach } from 'vitest';

// ============================================================================
// Types - Exactly as in messenger example
// ============================================================================

interface Message {
  id: string;
  text: string;
  status: 'sending' | 'sent' | 'delivered' | 'failed';
  userId: string;
  timestamp: number;
}

interface ChannelState {
  channelId: string;
  messages: Message[];
  typingUsers: string[];
}

interface UserState {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'away';
}

// ============================================================================
// Blocs - Similar to messenger example
// ============================================================================

class ChannelBloc extends Cubit<ChannelState> {
  constructor(channelId: string) {
    super({
      channelId,
      messages: [],
      typingUsers: [],
    });
  }

  addMessage = (text: string, userId: string) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      text,
      status: 'sending',
      userId,
      timestamp: Date.now(),
    };

    this.emit({
      ...this.state,
      messages: [...this.state.messages, newMessage],
    });

    return newMessage.id;
  };

  // THIS IS THE KEY METHOD - Like updateMessageStatusEvent handler
  updateMessageStatus = (messageId: string, status: Message['status']) => {
    this.emit({
      ...this.state,
      messages: this.state.messages.map((m) =>
        m.id === messageId ? { ...m, status } : m,
      ),
    });
  };
}

class UserCubit extends Cubit<UserState> {
  constructor(userId: string) {
    super({
      id: userId,
      name: `User ${userId}`,
      avatar: '👤',
      status: 'online',
    });
  }
}

// ============================================================================
// Components - Exact structure as messenger example
// ============================================================================

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
}

let _messageItemRenderCount = 0;

/**
 * MessageItem - Exactly like apps/examples/src/messenger/components/MessageItem.tsx
 *
 * Key behaviors:
 * - Receives message as prop (not extracted from bloc)
 * - Uses UserCubit to get user info
 * - Displays message.status with icon
 */
function MessageItem({ message, isOwn }: MessageItemProps) {
  _messageItemRenderCount++;

  const [user] = useBloc(UserCubit, {
    instanceId: message.userId,
    staticProps: { userId: message.userId },
  });

  const statusIcons = {
    sending: '⏳',
    sent: '✓',
    delivered: '✓✓',
    failed: '❌',
  };

  return (
    <div data-testid={`message-${message.id}`}>
      {!isOwn && <div data-testid="sender">{user.name}</div>}
      <div data-testid="text">{message.text}</div>
      {isOwn && (
        <span data-testid={`status-${message.id}`}>
          {statusIcons[message.status]}
        </span>
      )}
    </div>
  );
}

interface MessageListProps {
  channelId: string;
  currentUserId: string;
}

let messageListRenderCount = 0;

/**
 * MessageList - Exactly like apps/examples/src/messenger/components/MessageList.tsx
 *
 * Key behaviors:
 * - Extracts messages from ChannelBloc
 * - Maps over messages and passes each to MessageItem
 * - Tracks only messages (not typingUsers)
 */
function MessageList({ channelId, currentUserId }: MessageListProps) {
  messageListRenderCount++;

  // CRITICAL: Destructure messages from state
  // This is what determines dependency tracking
  const [{ messages }] = useBloc(ChannelBloc, {
    instanceId: channelId,
    staticProps: { channelId },
  });

  if (messages.length === 0) {
    return <div data-testid="empty">No messages yet</div>;
  }

  return (
    <div data-testid="message-list">
      <div data-testid="message-list-render-count">
        {messageListRenderCount}
      </div>
      <div data-testid="message-count">{messages.length}</div>
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          isOwn={message.userId === currentUserId}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Tests
// ============================================================================

afterEach(() => {
  StateContainer.clearAllInstances();
  messageListRenderCount = 0;
  _messageItemRenderCount = 0;
});

describe('Messenger Reproduction - Array Tracking', () => {
  it('should re-render MessageList when message status changes', () => {
    const channelId = 'channel-1';
    const currentUserId = 'user-me';

    // Setup: Add initial messages
    const channel = ChannelBloc.resolve(channelId, channelId);
    const msg1Id = channel.addMessage('Hello World', currentUserId);
    const msg2Id = channel.addMessage('this is that', currentUserId);
    const msg3Id = channel.addMessage('Good thanks', currentUserId);

    // Render MessageList
    render(<MessageList channelId={channelId} currentUserId={currentUserId} />);

    // Initial render
    expect(messageListRenderCount).toBe(1);
    screen.debug();
    expect(screen.getByTestId('message-count')).toHaveTextContent('3');

    // All messages should show 'sending' status
    expect(screen.getByTestId(`status-${msg1Id}`)).toHaveTextContent('⏳');
    expect(screen.getByTestId(`status-${msg2Id}`)).toHaveTextContent('⏳');
    expect(screen.getByTestId(`status-${msg3Id}`)).toHaveTextContent('⏳');

    // ============================================================================
    // CRITICAL TEST: Update message status (like updateMessageStatusEvent)
    // ============================================================================
    act(() => {
      channel.updateMessageStatus(msg1Id, 'sent');
    });

    // EXPECTATION: MessageList should re-render
    expect(messageListRenderCount).toBe(2);

    // EXPECTATION: Updated message should show new status
    expect(screen.getByTestId(`status-${msg1Id}`)).toHaveTextContent('✓');

    // EXPECTATION: Other messages unchanged
    expect(screen.getByTestId(`status-${msg3Id}`)).toHaveTextContent('⏳');
  });

  it('should re-render when message status changes to delivered', () => {
    const channelId = 'channel-2';
    const currentUserId = 'user-me';

    const channel = ChannelBloc.resolve(channelId, channelId);
    const msg1Id = channel.addMessage('Test message', currentUserId);

    render(<MessageList channelId={channelId} currentUserId={currentUserId} />);

    // Debug: Check what paths are being tracked
    const instance = ChannelBloc.get(channelId);
    const adapterStates = (instance as any).__blac__adapterStates;
    if (adapterStates && adapterStates.size > 0) {
      const firstAdapter = Array.from(adapterStates.values())[0] as any;
      console.log('\n=== TRACKED PATHS AFTER FIRST RENDER ===');
      console.log(
        'Current paths:',
        Array.from(firstAdapter.tracker.currentRenderPaths),
      );
      console.log(
        'Path cache:',
        Array.from(firstAdapter.tracker.pathCache.keys()),
      );
    }

    expect(screen.getByTestId(`status-${msg1Id}`)).toHaveTextContent('⏳');

    // sending → sent
    act(() => {
      channel.updateMessageStatus(msg1Id, 'sent');
    });

    console.log('\n=== AFTER STATUS UPDATE ===');
    console.log(
      'New messages:',
      JSON.stringify(channel.state.messages, null, 2),
    );

    expect(screen.getByTestId(`status-${msg1Id}`)).toHaveTextContent('✓');

    // sent → delivered
    act(() => {
      channel.updateMessageStatus(msg1Id, 'delivered');
    });
    expect(screen.getByTestId(`status-${msg1Id}`)).toHaveTextContent('✓✓');
  });

  it('should re-render when message in the middle of list changes', () => {
    const channelId = 'channel-3';
    const currentUserId = 'user-me';

    const channel = ChannelBloc.resolve(channelId, channelId);
    const msg1Id = channel.addMessage('Message 1', currentUserId);
    const msg2Id = channel.addMessage('Message 2', currentUserId);
    const msg3Id = channel.addMessage('Message 3', currentUserId);
    const msg4Id = channel.addMessage('Message 4', currentUserId);
    const msg5Id = channel.addMessage('Message 5', currentUserId);

    render(<MessageList channelId={channelId} currentUserId={currentUserId} />);

    expect(messageListRenderCount).toBe(1);

    // Update message in the middle
    act(() => {
      channel.updateMessageStatus(msg3Id, 'delivered');
    });

    // Should re-render
    expect(messageListRenderCount).toBe(2);

    // Check all statuses
    expect(screen.getByTestId(`status-${msg1Id}`)).toHaveTextContent('⏳');
    expect(screen.getByTestId(`status-${msg2Id}`)).toHaveTextContent('⏳');
    expect(screen.getByTestId(`status-${msg3Id}`)).toHaveTextContent('✓✓');
    expect(screen.getByTestId(`status-${msg4Id}`)).toHaveTextContent('⏳');
    expect(screen.getByTestId(`status-${msg5Id}`)).toHaveTextContent('⏳');
  });

  it('should re-render when last message status changes', () => {
    const channelId = 'channel-4';
    const currentUserId = 'user-me';

    const channel = ChannelBloc.resolve(channelId, channelId);
    channel.addMessage('Message 1', currentUserId);
    channel.addMessage('Message 2', currentUserId);
    const lastMsgId = channel.addMessage('Message 3', currentUserId);

    render(<MessageList channelId={channelId} currentUserId={currentUserId} />);

    expect(messageListRenderCount).toBe(1);
    expect(screen.getByTestId(`status-${lastMsgId}`)).toHaveTextContent('⏳');

    // Update last message
    act(() => {
      channel.updateMessageStatus(lastMsgId, 'sent');
    });

    expect(messageListRenderCount).toBe(2);
    expect(screen.getByTestId(`status-${lastMsgId}`)).toHaveTextContent('✓');
  });

  it('should NOT re-render MessageList when typingUsers changes', () => {
    const channelId = 'channel-5';
    const currentUserId = 'user-me';

    const channel = ChannelBloc.resolve(channelId, channelId);
    channel.addMessage('Hello', currentUserId);

    render(<MessageList channelId={channelId} currentUserId={currentUserId} />);

    expect(messageListRenderCount).toBe(1);

    // Update typingUsers (not messages)
    act(() => {
      channel.emit({
        ...channel.state,
        typingUsers: ['user-other'],
      });
    });

    // Should NOT re-render because MessageList only tracks messages
    expect(messageListRenderCount).toBe(1);
  });
});
