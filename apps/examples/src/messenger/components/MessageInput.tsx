import { useRef, KeyboardEvent } from 'react';
import { useBloc } from '@blac/react';
import { ChannelBloc } from '../blocs/ChannelBloc';

interface MessageInputProps {
  channelId: string;
  currentUserId: string;
}

export function MessageInput({ channelId, currentUserId }: MessageInputProps) {
  const [{ draftMessage }, channelBloc] = useBloc(ChannelBloc, {
    instanceId: channelId,
  });

  const inputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    channelBloc.sendMessage(currentUserId);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
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
        onKeyDown={handleKeyDown}
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
