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
 * Channel shell. Owns the instance + markAsRead effect (action only) and just
 * composes children. Because it reads no state, a typing-indicator tick or a
 * header change never re-renders the message list or input.
 */
export function ChannelView({ channelId, currentUserId }: ChannelViewProps) {
  const [, channelBloc] = useBloc(ChannelBloc, {
    args: { channelId },
    select: () => [],
  });

  useEffect(() => {
    channelBloc.markAsRead();
  }, [channelId, channelBloc]);

  return (
    <div className="channel-view">
      <ChannelHeader channelId={channelId} />
      <TypingIndicator channelId={channelId} />

      <div className="channel-messages">
        <MessageList channelId={channelId} currentUserId={currentUserId} />
      </div>

      <MessageInput channelId={channelId} currentUserId={currentUserId} />
    </div>
  );
}

/** Reads the (slow-changing) channel metadata via the `channelInfo` getter. */
function ChannelHeader({ channelId }: { channelId: string }) {
  const [, channelBloc] = useBloc(ChannelBloc, {
    args: { channelId },
    select: (_s, b) => [b.channelInfo],
  });
  const channelInfo = channelBloc.channelInfo;
  if (!channelInfo) return null;

  return (
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
  );
}

/** Reads only the typing state — the highest-churn slice — in isolation. */
function TypingIndicator({ channelId }: { channelId: string }) {
  const [channel, channelBloc] = useBloc(ChannelBloc, {
    args: { channelId },
  });
  if (channel.typingUsers.size === 0) return null;

  return (
    <div className="typing-indicator">
      <span className="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </span>
      <span className="typing-text">{channelBloc.typingIndicator}</span>
    </div>
  );
}
