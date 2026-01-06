import { useBloc } from '@blac/react';
import { UserCubit } from '../blocs/UserCubit';

interface UserAvatarProps {
  userId: string;
  size?: 'small' | 'medium' | 'large';
  showStatus?: boolean;
}

/**
 * UserAvatar component - Demonstrates BlaC dependency tracking
 *
 * This component only tracks the specific user properties it needs (avatar, status).
 * It won't re-render when other user properties change (like customStatus).
 *
 * Multiple components can use the same UserCubit instance without duplication.
 */
export function UserAvatar({
  userId,
  size = 'medium',
  showStatus = true,
}: UserAvatarProps) {
  const [user] = useBloc(UserCubit, {
    instanceId: userId,
    props: { userId },
  });

  const sizeClasses = {
    small: 'avatar-small',
    medium: 'avatar-medium',
    large: 'avatar-large',
  };

  const statusColors = {
    online: '#4ade80',
    away: '#fbbf24',
    offline: '#94a3b8',
  };

  return (
    <div className={`user-avatar ${sizeClasses[size]}`}>
      <div className="avatar-icon">{user.avatar}</div>
      {showStatus && (
        <div
          className="status-indicator"
          style={{ backgroundColor: statusColors[user.status] }}
          title={user.status}
        />
      )}
    </div>
  );
}
