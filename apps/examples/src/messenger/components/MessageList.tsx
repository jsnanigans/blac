import { useBloc } from '@blac/react';
import { useEffect, useRef } from 'react';
import { ChannelBloc } from '../blocs/ChannelBloc';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  channelId: string;
  currentUserId: string;
}

export function MessageList({ channelId, currentUserId }: MessageListProps) {
  const [{ messages }] = useBloc(ChannelBloc, {
    instanceId: channelId,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="message-list-empty">
        <p>No messages yet. Be the first to say something!</p>
      </div>
    );
  }

  return (
    <div className="message-list">
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          isOwn={message.userId === currentUserId}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
