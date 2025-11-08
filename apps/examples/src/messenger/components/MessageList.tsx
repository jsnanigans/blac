import { useBloc } from '@blac/react';
import { useEffect, useRef } from 'react';
import { ChannelBloc } from '../blocs/ChannelBloc';
import { ContactsCubit } from '../blocs/ContactsCubit';
import { MessageItem } from './MessageItem';

interface MessageListProps {
  channelId: string;
  currentUserId: string;
}

/**
 * MessageList component - Displays all messages in a channel
 *
 * Demonstrates:
 * - Using ChannelBloc with isolated instances (each channel has its own state)
 * - Dependency tracking - only re-renders when messages change, not when typingUsers changes
 * - Auto-scrolling to latest message
 */
export function MessageList({ channelId, currentUserId }: MessageListProps) {
  // Get channel info from ContactsCubit
  const [contacts] = useBloc(ContactsCubit);
  const channelInfo = contacts.channels.find((c) => c.id === channelId);

  const [channel] = useBloc(ChannelBloc, {
    instanceId: channelId,
    staticProps: channelInfo ? { channel: channelInfo } : undefined,
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channel.messages.length]);

  if (channel.messages.length === 0) {
    return (
      <div className="message-list-empty">
        <p>No messages yet. Be the first to say something!</p>
      </div>
    );
  }

  return (
    <div className="message-list">
      {channel.messages.map((message) => (
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
