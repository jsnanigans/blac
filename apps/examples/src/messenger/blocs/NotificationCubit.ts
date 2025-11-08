import { Cubit } from '@blac/core';

export interface NotificationState {
  /**
   * Map of channelId to unread count
   * Allows tracking unread counts without keeping ChannelBloc instances alive
   */
  unreadCounts: Map<string, number>;
}

/**
 * Notification state - shared single instance
 * Tracks lightweight notification data (unread counts) separately from heavy ChannelBloc instances
 *
 * This allows us to show unread badges in the sidebar without keeping all channel
 * instances alive in memory.
 */
export class NotificationCubit extends Cubit<NotificationState> {
  constructor() {
    super({
      unreadCounts: new Map(),
    });
  }

  /**
   * Increment unread count for a channel
   */
  incrementUnread = (channelId: string) => {
    const newCounts = new Map(this.state.unreadCounts);
    const current = newCounts.get(channelId) || 0;
    newCounts.set(channelId, current + 1);

    this.patch({ unreadCounts: newCounts });
  };

  /**
   * Clear unread count for a channel (when user views it)
   */
  clearUnread = (channelId: string) => {
    const newCounts = new Map(this.state.unreadCounts);
    newCounts.set(channelId, 0);

    this.patch({ unreadCounts: newCounts });
  };

  /**
   * Get unread count for a specific channel
   */
  getUnreadCount = (channelId: string): number => {
    return this.state.unreadCounts.get(channelId) || 0;
  };

  /**
   * Set unread count for a channel (e.g., when loading from persistence)
   */
  setUnread = (channelId: string, count: number) => {
    const newCounts = new Map(this.state.unreadCounts);
    newCounts.set(channelId, count);

    this.patch({ unreadCounts: newCounts });
  };
}
