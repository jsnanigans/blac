import { useRef, KeyboardEvent } from 'react';
import { useBloc } from '@blac/react';
import { ChannelBloc } from '../blocs/ChannelBloc';

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
  const [{ draftMessage }, channelBloc] = useBloc(ChannelBloc, {
    instanceId: channelId,
    props: { channelId },
  });

  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    // Add event to ChannelBloc
    channelBloc.sendMessage(currentUserId);
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
        value={draftMessage}
        onChange={(e) => channelBloc.updateDraftMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        placeholder={`Message #${channelId}`}
        className="message-input-field"
      />
      <button
        onClick={handleSend}
        disabled={!draftMessage}
        className="message-send-button"
      >
        Send
      </button>
    </div>
  );
}
