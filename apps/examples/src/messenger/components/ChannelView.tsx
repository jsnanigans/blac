import { useBloc } from '@blac/react';
import { ChannelBloc } from '../blocs/ChannelBloc';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useEffect } from 'react';

interface ChannelViewProps {
  channelId: string;
  currentUserId: string;
}

/**
 * ChannelView component - Main view for a channel
 *
 * Demonstrates:
 * - Using ChannelBloc for channel-specific state
 * - Dependency tracking on specific properties (channel.name, typingIndicator)
 * - Side effects (marking as read when channel is viewed)
 */
export function ChannelView({ channelId, currentUserId }: ChannelViewProps) {
  const [channel, channelBloc] = useBloc(ChannelBloc, {
    instanceId: channelId,
    props: { channelId },
  });

  // Mark channel as read when it's viewed
  useEffect(() => {
    channelBloc.markAsRead();
  }, [channelId, channelBloc]);

  if (!channelBloc.channelInfo) {
    return <div>Channel not found</div>;
  }

  return (
    <div className="channel-view">
      {/* Channel Header */}
      <div className="channel-header">
        <div className="channel-info">
          <h2 className="channel-name">#{channel.channel.name}</h2>
          {channel.channel.description && (
            <p className="channel-description">{channel.channel.description}</p>
          )}
        </div>
        <div className="channel-meta">
          <span className="channel-members">
            {channel.channel.members.length} members
          </span>
        </div>
      </div>

      {/* Typing Indicator */}
      {channel.typingUsers.size > 0 && (
        <div className="typing-indicator">
          <span className="typing-dots">
            <span></span>
            <span></span>
            <span></span>
          </span>
          <span className="typing-text">{channelBloc.typingIndicator}</span>
        </div>
      )}

      {/* Messages */}
      <div className="channel-messages">
        <MessageList channelId={channelId} currentUserId={currentUserId} />
      </div>

      {/* Input */}
      <MessageInput channelId={channelId} currentUserId={currentUserId} />
    </div>
  );
}
