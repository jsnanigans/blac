import { useBloc } from '@blac/react';
import { useEffect } from 'react';
import { AppCubit } from '../blocs/AppCubit';
import { ContactsCubit } from '../blocs/ContactsCubit';
import { NotificationCubit } from '../blocs/NotificationCubit';
import { UserCubit } from '../blocs/UserCubit';
import { UserAvatar } from './UserAvatar';

interface SidebarProps {
  currentUserId: string;
}

/**
 * Sidebar component - Channel list and user profile
 *
 * Demonstrates:
 * - Using multiple Blocs (AppCubit, ContactsCubit)
 * - Fine-grained dependency tracking on channel list
 */
export function Sidebar({ currentUserId }: SidebarProps) {
  const [appState, { setActiveChannel, setCurrentUserId }] = useBloc(AppCubit);
  const [contacts] = useBloc(ContactsCubit);
  const [currentUser, { setUserId }] = useBloc(UserCubit, {
    instanceId: currentUserId,
  });

  useEffect(() => {
    setCurrentUserId({ currentUserId });
  }, [currentUserId, setCurrentUserId]);

  useEffect(() => {
    setUserId(currentUserId);
  }, [currentUserId, setUserId]);

  return (
    <div className="sidebar">
      {/* Current User Profile */}
      <div className="sidebar-header">
        <UserAvatar userId={currentUserId} size="medium" showStatus={true} />
        <div className="user-info">
          <div className="user-name">{currentUser.name}</div>
          {currentUser.customStatus && (
            <div className="user-custom-status">{currentUser.customStatus}</div>
          )}
        </div>
      </div>

      {/* Channels Section */}
      <div className="sidebar-section">
        <div className="section-header">
          <h3>Channels</h3>
        </div>

        <div className="channel-list">
          {contacts.channels.map((channel) => (
            <ChannelListItem
              key={channel.id}
              channelId={channel.id}
              channelName={channel.name}
              isActive={appState.activeChannelId === channel.id}
              onClick={() => setActiveChannel(channel.id)}
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="app-info">
          <strong>BlaC Messenger Demo</strong>
          <small>Built with BlaC state management</small>
        </div>
      </div>
    </div>
  );
}

interface ChannelListItemProps {
  channelId: string;
  channelName: string;
  isActive: boolean;
  onClick: () => void;
}

/**
 * ChannelListItem - Individual channel in the sidebar
 *
 * Demonstrates:
 * - Using NotificationCubit to track unread counts WITHOUT keeping ChannelBloc alive
 * - Only re-renders when unread count changes
 * - ChannelBloc instances only exist for the active channel
 */
function ChannelListItem({
  channelId,
  channelName,
  isActive,
  onClick,
}: ChannelListItemProps) {
  // Use NotificationCubit to get unread count without creating ChannelBloc instance
  const [notifications] = useBloc(NotificationCubit);
  const unreadCount = notifications.unreadCounts.get(channelId) || 0;

  return (
    <div
      className={`channel-list-item ${isActive ? 'active' : ''}`}
      onClick={onClick}
    >
      <span className="channel-icon">#</span>
      <span className="channel-name">{channelName}</span>
      {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
    </div>
  );
}
