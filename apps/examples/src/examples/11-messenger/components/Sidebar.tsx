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
 * Sidebar shell. Owns the current-user-id effect (action only) but reads no
 * state itself — the profile and the channel list each read their own slice
 * through their own useBloc calls, so a channel switch or unread-count change
 * only re-renders the affected child.
 */
export function Sidebar({ currentUserId }: SidebarProps) {
  const [, { setCurrentUserId }] = useBloc(AppCubit, { select: () => [] });

  useEffect(() => {
    setCurrentUserId({ currentUserId });
  }, [currentUserId, setCurrentUserId]);

  return (
    <div className="sidebar">
      <CurrentUserProfile currentUserId={currentUserId} />

      <div className="sidebar-section">
        <div className="section-header">
          <h3>Channels</h3>
        </div>
        <ChannelList />
      </div>

      <div className="sidebar-footer">
        <div className="app-info">
          <strong>BlaC Messenger Demo</strong>
          <small>Built with BlaC state management</small>
        </div>
      </div>
    </div>
  );
}

/** Reads only the current user's profile slice. */
function CurrentUserProfile({ currentUserId }: { currentUserId: string }) {
  const [currentUser] = useBloc(UserCubit, {
    args: { userId: currentUserId },
  });

  return (
    <div className="sidebar-header">
      <UserAvatar userId={currentUserId} size="medium" showStatus={true} />
      <div className="user-info">
        <div className="user-name">{currentUser.name}</div>
        {currentUser.customStatus && (
          <div className="user-custom-status">{currentUser.customStatus}</div>
        )}
      </div>
    </div>
  );
}

/** Reads the channel list from ContactsCubit; rows track their own state. */
function ChannelList() {
  const [contacts] = useBloc(ContactsCubit);

  return (
    <div className="channel-list">
      {contacts.channels.map((channel) => (
        <ChannelListItem
          key={channel.id}
          channelId={channel.id}
          channelName={channel.name}
        />
      ))}
    </div>
  );
}

interface ChannelListItemProps {
  channelId: string;
  channelName: string;
}

/**
 * Individual channel row. Reads its own `isActive` from AppCubit and its unread
 * count from NotificationCubit — no `isActive` prop drilled from the parent — so
 * it re-renders only when the active channel or its own unread count changes.
 */
function ChannelListItem({ channelId, channelName }: ChannelListItemProps) {
  const [appState, { setActiveChannel }] = useBloc(AppCubit, {
    select: (s) => [s.activeChannelId === channelId],
  });
  const [notifications] = useBloc(NotificationCubit);
  const unreadCount = notifications.unreadCounts.get(channelId) || 0;
  const isActive = appState.activeChannelId === channelId;

  return (
    <div
      className={`channel-list-item ${isActive ? 'active' : ''}`}
      onClick={() => setActiveChannel(channelId)}
    >
      <span className="channel-icon">#</span>
      <span className="channel-name">{channelName}</span>
      {unreadCount > 0 && <span className="unread-badge">{unreadCount}</span>}
    </div>
  );
}
