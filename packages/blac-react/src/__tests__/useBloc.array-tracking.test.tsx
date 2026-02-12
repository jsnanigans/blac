/**
 * Array Tracking Tests
 *
 * Tests that verify components re-render correctly when array elements change.
 * This reproduces the use case from MessageList.tsx where we iterate over an
 * array and need to detect when individual items change.
 */

import { render, screen, act } from '@testing-library/react';
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

    render(<MessageList />);
    expect(renderCount).toBe(1);
    expect(screen.getByTestId('message-count')).toHaveTextContent('0');
    const initialRenderCount = renderCount;

    // Add first message
    const cubit = acquire(MessageListCubit);
    let msg1Id = '';
    act(() => {
      msg1Id = cubit.addMessage('Hello', 'user-1');
    });

    expect(renderCount).toBeGreaterThan(initialRenderCount);
    expect(screen.getByTestId('message-count')).toHaveTextContent('1');
    expect(screen.getByTestId(`message-${msg1Id}`)).toHaveTextContent(
      'Hello - sending',
    );

    // Add second message
    let msg2Id = '';
    act(() => {
      msg2Id = cubit.addMessage('World', 'user-2');
    });

    expect(renderCount).toBeGreaterThan(initialRenderCount);
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
    let msg1Id = '';
    let msg2Id = '';
    let msg3Id = '';
    act(() => {
      msg1Id = cubit.addMessage('Hello', 'user-1');
      msg2Id = cubit.addMessage('World', 'user-2');
      msg3Id = cubit.addMessage('Test', 'user-3');
    });

    render(<MessageList />);
    expect(renderCount).toBe(1);
    const initialRenderCount = renderCount;
    expect(screen.getByTestId(`status-${msg1Id}`)).toHaveTextContent('sending');
    expect(screen.getByTestId(`status-${msg2Id}`)).toHaveTextContent('sending');
    expect(screen.getByTestId(`status-${msg3Id}`)).toHaveTextContent('sending');

    // Update first message status
    act(() => {
      cubit.updateMessageStatus(msg1Id, 'sent');
    });

    expect(renderCount).toBeGreaterThan(initialRenderCount);
    expect(screen.getByTestId(`status-${msg1Id}`)).toHaveTextContent('sent');
    expect(screen.getByTestId(`status-${msg2Id}`)).toHaveTextContent('sending');
    expect(screen.getByTestId(`status-${msg3Id}`)).toHaveTextContent('sending');

    // Update second message status
    act(() => {
      cubit.updateMessageStatus(msg2Id, 'delivered');
    });

    expect(renderCount).toBeGreaterThan(initialRenderCount);
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
    act(() => {
      cubit.addMessage('Message 1', 'user-1');
      cubit.addMessage('Message 2', 'user-2');
    });
    let msg3Id = '';
    act(() => {
      msg3Id = cubit.addMessage('Message 3', 'user-3');
    });

    render(<MessageList />);
    expect(renderCount).toBe(1);
    const initialRenderCount = renderCount;
    expect(screen.getByTestId('last-message-status')).toHaveTextContent(
      'sending',
    );

    // Update the last message (which might be at a different index than initially tracked)
    act(() => {
      cubit.updateMessageStatus(msg3Id, 'delivered');
    });

    expect(renderCount).toBeGreaterThan(initialRenderCount);
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
    let msg1Id = '';
    let msg2Id = '';
    let msg3Id = '';
    act(() => {
      msg1Id = cubit.addMessage('Message 1', 'user-1');
      msg2Id = cubit.addMessage('Message 2', 'user-2');
      msg3Id = cubit.addMessage('Message 3', 'user-3');
    });

    render(<MessageList />);
    expect(renderCount).toBe(1);
    const initialRenderCount = renderCount;
    expect(screen.getByTestId('message-count')).toHaveTextContent('3');

    // Delete middle message
    act(() => {
      cubit.deleteMessage(msg2Id);
    });

    expect(renderCount).toBeGreaterThan(initialRenderCount);
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
    act(() => {
      cubit.addMessage('Message 1', 'user-1');
      cubit.addMessage('Message 2', 'user-2');
      cubit.addMessage('Message 3', 'user-3');
    });

    render(<MessageList />);
    expect(renderCount).toBe(1);
    const initialRenderCount = renderCount;
    expect(screen.getByTestId('first-message-text')).toHaveTextContent(
      'Message 1',
    );

    // Reverse the order
    act(() => {
      cubit.emit({
        messages: [...cubit.state.messages].reverse(),
      });
    });

    expect(renderCount).toBeGreaterThan(initialRenderCount);
    expect(screen.getByTestId('first-message-text')).toHaveTextContent(
      'Message 3',
    );
  });
});
