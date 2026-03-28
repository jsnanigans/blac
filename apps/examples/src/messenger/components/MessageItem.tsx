import { useBloc } from '@blac/react';
import { UserCubit } from '../blocs/UserCubit';
import { UserAvatar } from './UserAvatar';
import type { Message } from '../types';

interface MessageItemProps {
  message: Message;
  isOwn: boolean;
}

/**
 * MessageItem component - Displays a single message
 *
 * Demonstrates:
 * - Using UserCubit to get sender information
 * - Fine-grained dependency tracking (only tracks user.name)
 */
export function MessageItem({ message, isOwn }: MessageItemProps) {
  const [user] = useBloc(UserCubit, {
    instanceId: message.userId,
    onMount: (bloc) => bloc.setUserId(message.userId),
  });

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const statusIcons = {
    sending: '⏳',
    sent: '✓',
    delivered: '✓✓',
    failed: '❌',
  };

  return (
    <div className={`message-item ${isOwn ? 'message-own' : 'message-other'}`}>
      {!isOwn && (
        <div className="message-avatar">
          <UserAvatar userId={message.userId} size="small" showStatus={false} />
        </div>
      )}

      <div className="message-content">
        {!isOwn && <div className="message-sender">{user.name}</div>}

        <div className="message-bubble">
          <div className="message-text">{message.text}</div>
          <div className="message-meta">
            <span className="message-time">
              {formatTime(message.timestamp)}
            </span>
            {isOwn && (
              <span className="message-status">
                {statusIcons[message.status]}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
