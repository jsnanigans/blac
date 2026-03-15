import { useBloc } from '@blac/react';
import { ChannelBloc } from '../blocs/ChannelBloc';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { useEffect } from 'react';

interface ChannelViewProps {
  channelId: string;
  currentUserId: string;
}

export function ChannelView({ channelId, currentUserId }: ChannelViewProps) {
  const [channel, channelBloc] = useBloc(ChannelBloc, {
    instanceId: channelId,
  });

  useEffect(() => {
    channelBloc.init({ channelId });
    channelBloc.markAsRead();
  }, [channelId, channelBloc]);

  const channelInfo = channelBloc.channelInfo;
  if (!channelInfo) {
    return null;
  }

  return (
    <div className="channel-view">
      {/* Channel Header */}
      <div className="channel-header">
        <div className="channel-info">
          <h2 className="channel-name">#{channelInfo.name}</h2>
          {channelInfo.description && (
            <p className="channel-description">{channelInfo.description}</p>
          )}
        </div>
        <div className="channel-meta">
          <span className="channel-members">
            {channelInfo.members.length} members
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
