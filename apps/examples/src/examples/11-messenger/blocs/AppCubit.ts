import { Cubit, acquire } from '@blac/core';
import { NotificationCubit } from './NotificationCubit';
import { getWelcomeMessages, MOCK_CHANNELS } from '../mockData';
import { persistenceService } from '../services/PersistenceService';

export interface AppState {
  currentUserId: string | null;
  activeChannelId: string | null;
  activeThreadId: string | null;
  sidebarOpen: boolean;
}

/**
 * Global app state - shared single instance
 * Manages current user, active channel/thread, and UI state
 */
export class AppCubit extends Cubit<AppState> {
  notificationCubit = acquire(NotificationCubit);

  constructor() {
    super({
      currentUserId: null,
      activeChannelId: null,
      activeThreadId: null,
      sidebarOpen: true,
    });

    this.setupApp();
  }

  setCurrentUserId = (data: { currentUserId: string }) => {
    this.patch({ currentUserId: data.currentUserId });
  };

  private setupApp() {
    MOCK_CHANNELS.forEach((channel) => {
      // Check if channel already has persisted data
      const persisted = persistenceService.loadChannel(channel.id);

      if (!persisted) {
        // No persisted data - initialize with welcome messages
        const welcomeMessages = getWelcomeMessages(channel.id);
        persistenceService.saveChannel(channel.id, welcomeMessages);
      } else {
        // Load persisted unread count into NotificationCubit
        this.notificationCubit.setUnread(channel.id, persisted.unreadCount);
      }
    });
  }

  setActiveChannel = (channelId: string | null) => {
    if (channelId) {
      persistenceService.setUnreadCount(channelId, 0);
    }
    this.patch({
      activeChannelId: channelId,
      activeThreadId: null, // Clear thread when switching channels
    });
  };

  setActiveThread = (threadId: string | null) => {
    this.patch({ activeThreadId: threadId });
  };

  toggleSidebar = () => {
    this.patch({ sidebarOpen: !this.state.sidebarOpen });
  };
}
