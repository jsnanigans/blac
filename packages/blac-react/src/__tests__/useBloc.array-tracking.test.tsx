/**
 * Array Tracking Tests
 *
 * Tests that verify components re-render correctly when array elements change.
 * This reproduces the use case from MessageList.tsx where we iterate over an
 * array and need to detect when individual items change.
 */

import { render, screen } from '@testing-library/react';
import { Cubit, clearAll, acquire } from '@blac/core';
import { useBloc } from '../useBloc';
import { describe, it, expect } from 'vitest';

// Message type similar to the messenger example
interface Message {
  id: string;
  text: string;
  status: 'sending' | 'sent' | 'delivered';
  userId: string;
}

interface MessageListState {
  messages: Message[];
}

class MessageListCubit extends Cubit<MessageListState> {
  constructor() {
    super({ messages: [] });
  }

  addMessage = (text: string, userId: string) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      text,
      status: 'sending',
      userId,
    };

    this.emit({
      messages: [...this.state.messages, newMessage],
    });

    return newMessage.id;
  };

  updateMessageStatus = (messageId: string, status: Message['status']) => {
    this.emit({
      messages: this.state.messages.map((m) =>
        m.id === messageId ? { ...m, status } : m,
      ),
    });
  };

  deleteMessage = (messageId: string) => {
    this.emit({
      messages: this.state.messages.filter((m) => m.id !== messageId),
    });
  };
}

afterEach(() => {
  // Clear all bloc instances between tests
  clearAll();
});

describe('useBloc - Array Tracking (MessageList Use Case)', () => {
  it('should re-render when a new message is added to the array', () => {
    let renderCount = 0;

    function MessageList() {
      const [{ messages }] = useBloc(MessageListCubit);
      renderCount++;

      return (
        <div>
          <div data-testid="render-count">{renderCount}</div>
          <div data-testid="message-count">{messages.length}</div>
          <ul>
            {messages.map((message) => (
              <li key={message.id} data-testid={`message-${message.id}`}>
                {message.text} - {message.status}
              </li>
            ))}
          </ul>
        </div>
      );
    }

    const { rerender } = render(<MessageList />);
    expect(renderCount).toBe(1);
    expect(screen.getByTestId('message-count')).toHaveTextContent('0');

    // Add first message
    const cubit = acquire(MessageListCubit);
    const msg1Id = cubit.addMessage('Hello', 'user-1');

    rerender(<MessageList />);
    expect(renderCount).toBe(2); // ✅ Should re-render
    expect(screen.getByTestId('message-count')).toHaveTextContent('1');
    expect(screen.getByTestId(`message-${msg1Id}`)).toHaveTextContent(
      'Hello - sending',
    );

    // Add second message
    const msg2Id = cubit.addMessage('World', 'user-2');

    rerender(<MessageList />);
    expect(renderCount).toBe(3); // ✅ Should re-render again
    expect(screen.getByTestId('message-count')).toHaveTextContent('2');
    expect(screen.getByTestId(`message-${msg2Id}`)).toHaveTextContent(
      'World - sending',
    );
  });

  it('should re-render when a message status changes', () => {
    let renderCount = 0;

    function MessageList() {
      const [{ messages }] = useBloc(MessageListCubit);
      renderCount++;

      return (
        <div>
          <div data-testid="render-count">{renderCount}</div>
          <ul>
            {messages.map((message) => (
              <li key={message.id} data-testid={`status-${message.id}`}>
                {message.status}
              </li>
            ))}
          </ul>
        </div>
      );
    }

    // Setup: Add initial messages
    const cubit = acquire(MessageListCubit);
    const msg1Id = cubit.addMessage('Hello', 'user-1');
    const msg2Id = cubit.addMessage('World', 'user-2');
    const msg3Id = cubit.addMessage('Test', 'user-3');

    const { rerender } = render(<MessageList />);
    expect(renderCount).toBe(1);
    expect(screen.getByTestId(`status-${msg1Id}`)).toHaveTextContent('sending');
    expect(screen.getByTestId(`status-${msg2Id}`)).toHaveTextContent('sending');
    expect(screen.getByTestId(`status-${msg3Id}`)).toHaveTextContent('sending');

    // Update first message status
    cubit.updateMessageStatus(msg1Id, 'sent');

    rerender(<MessageList />);
    expect(renderCount).toBe(2); // ✅ Should re-render
    expect(screen.getByTestId(`status-${msg1Id}`)).toHaveTextContent('sent');
    expect(screen.getByTestId(`status-${msg2Id}`)).toHaveTextContent('sending');
    expect(screen.getByTestId(`status-${msg3Id}`)).toHaveTextContent('sending');

    // Update second message status
    cubit.updateMessageStatus(msg2Id, 'delivered');

    rerender(<MessageList />);
    expect(renderCount).toBe(3); // ✅ Should re-render
    expect(screen.getByTestId(`status-${msg1Id}`)).toHaveTextContent('sent');
    expect(screen.getByTestId(`status-${msg2Id}`)).toHaveTextContent(
      'delivered',
    );
    expect(screen.getByTestId(`status-${msg3Id}`)).toHaveTextContent('sending');
  });

  it('should re-render when a message at the end of the list changes', () => {
    let renderCount = 0;

    function MessageList() {
      const [{ messages }] = useBloc(MessageListCubit);
      renderCount++;

      return (
        <div>
          <div data-testid="render-count">{renderCount}</div>
          <div data-testid="last-message-status">
            {messages.length > 0
              ? messages[messages.length - 1].status
              : 'none'}
          </div>
        </div>
      );
    }

    // Setup: Add initial messages
    const cubit = acquire(MessageListCubit);
    cubit.addMessage('Message 1', 'user-1');
    cubit.addMessage('Message 2', 'user-2');
    const msg3Id = cubit.addMessage('Message 3', 'user-3');

    const { rerender } = render(<MessageList />);
    expect(renderCount).toBe(1);
    expect(screen.getByTestId('last-message-status')).toHaveTextContent(
      'sending',
    );

    // Update the last message (which might be at a different index than initially tracked)
    cubit.updateMessageStatus(msg3Id, 'delivered');

    rerender(<MessageList />);
    expect(renderCount).toBe(2); // ✅ Should re-render
    expect(screen.getByTestId('last-message-status')).toHaveTextContent(
      'delivered',
    );
  });

  it('should re-render when a message is deleted from the middle', () => {
    let renderCount = 0;

    function MessageList() {
      const [{ messages }] = useBloc(MessageListCubit);
      renderCount++;

      return (
        <div>
          <div data-testid="render-count">{renderCount}</div>
          <div data-testid="message-count">{messages.length}</div>
          <ul>
            {messages.map((message) => (
              <li key={message.id} data-testid={`message-${message.id}`}>
                {message.text}
              </li>
            ))}
          </ul>
        </div>
      );
    }

    // Setup: Add initial messages
    const cubit = acquire(MessageListCubit);
    const msg1Id = cubit.addMessage('Message 1', 'user-1');
    const msg2Id = cubit.addMessage('Message 2', 'user-2');
    const msg3Id = cubit.addMessage('Message 3', 'user-3');

    const { rerender } = render(<MessageList />);
    expect(renderCount).toBe(1);
    expect(screen.getByTestId('message-count')).toHaveTextContent('3');

    // Delete middle message
    cubit.deleteMessage(msg2Id);

    rerender(<MessageList />);
    expect(renderCount).toBe(2); // ✅ Should re-render
    expect(screen.getByTestId('message-count')).toHaveTextContent('2');
    expect(screen.getByTestId(`message-${msg1Id}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`message-${msg2Id}`)).not.toBeInTheDocument();
    expect(screen.getByTestId(`message-${msg3Id}`)).toBeInTheDocument();
  });

  it('should re-render when message order changes', () => {
    let renderCount = 0;

    function MessageList() {
      const [{ messages }] = useBloc(MessageListCubit);
      renderCount++;

      return (
        <div>
          <div data-testid="render-count">{renderCount}</div>
          <div data-testid="first-message-text">
            {messages.length > 0 ? messages[0].text : 'none'}
          </div>
        </div>
      );
    }

    // Setup: Add initial messages
    const cubit = acquire(MessageListCubit);
    cubit.addMessage('Message 1', 'user-1');
    cubit.addMessage('Message 2', 'user-2');
    cubit.addMessage('Message 3', 'user-3');

    const { rerender } = render(<MessageList />);
    expect(renderCount).toBe(1);
    expect(screen.getByTestId('first-message-text')).toHaveTextContent(
      'Message 1',
    );

    // Reverse the order
    cubit.emit({
      messages: [...cubit.state.messages].reverse(),
    });

    rerender(<MessageList />);
    expect(renderCount).toBe(2); // ✅ Should re-render
    expect(screen.getByTestId('first-message-text')).toHaveTextContent(
      'Message 3',
    );
  });
});
