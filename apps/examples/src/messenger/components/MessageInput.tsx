import { useState, useRef, KeyboardEvent } from 'react';
import { useBloc } from '@blac/react';
import { ChannelBloc, SendMessageEvent } from '../blocs/ChannelBloc';
import { ContactsCubit } from '../blocs/ContactsCubit';
import { webSocket } from '../services/WebSocketMock';

interface MessageInputProps {
  channelId: string;
  currentUserId: string;
}

/**
 * MessageInput component - Input for sending messages
 *
 * Demonstrates:
 * - Using ChannelBloc to send events
 * - Accessing the bloc instance directly for actions (not tracking state)
 * - Integration with WebSocket mock service
 */
export function MessageInput({ channelId, currentUserId }: MessageInputProps) {
  // Get channel info from ContactsCubit
  const [contacts] = useBloc(ContactsCubit);
  const channelInfo = contacts.channels.find((c) => c.id === channelId);

  const [, channelBloc] = useBloc(ChannelBloc, {
    instanceId: channelId,
    staticProps: channelInfo ? { channel: channelInfo } : undefined,
  });
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    const trimmedText = text.trim();
    if (!trimmedText) return;

    // Add event to ChannelBloc
    const message = channelBloc.add(
      new SendMessageEvent(trimmedText, currentUserId),
    );

    // Send to WebSocket (will update status asynchronously)
    webSocket.send({
      type: 'send_message',
      channelId,
      userId: currentUserId,
      payload: { messageId: message?.id, text: trimmedText },
    });

    // Clear input
    setText('');
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="message-input">
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={`Message #${channelId}`}
        className="message-input-field"
      />
      <button
        onClick={handleSend}
        disabled={!text.trim()}
        className="message-send-button"
      >
        Send
      </button>
    </div>
  );
}
