import type { Message } from '../types';

export interface PersistedChannelData {
  channelId: string;
  messages: Message[];
  unreadCount: number;
  lastUpdated: number;
}

/**
 * Service for persisting channel data to sessionStorage
 *
 * Allows us to dispose ChannelBloc instances without losing data.
 * When a channel is re-activated, we can restore its state from sessionStorage.
 */
class PersistenceService {
  private readonly STORAGE_PREFIX = 'blac_messenger_channel_';

  /**
   * Save channel data to sessionStorage
   */
  saveChannel(channelId: string, messages: Message[]): void {
    const data: PersistedChannelData = {
      channelId,
      messages,
      unreadCount: this.loadUnreadCount(channelId),
      lastUpdated: Date.now(),
    };

    try {
      sessionStorage.setItem(
        this.getStorageKey(channelId),
        JSON.stringify(data),
      );
    } catch (error) {
      console.warn(`Failed to persist channel ${channelId}:`, error);
    }
  }

  loadUnreadCount(channelId: string): number {
    try {
      const stored = sessionStorage.getItem(this.getStorageKey(channelId));
      if (!stored) return 0;

      const data = JSON.parse(stored) as PersistedChannelData;
      return data.unreadCount || 0;
    } catch (error) {
      console.warn(
        `Failed to load unread count for channel ${channelId}:`,
        error,
      );
      return 0;
    }
  }

  setUnreadCount(channelId: string, count: number): void {
    try {
      const stored = sessionStorage.getItem(this.getStorageKey(channelId));
      if (!stored) return;

      const data = JSON.parse(stored) as PersistedChannelData;
      data.unreadCount = count;
      data.lastUpdated = Date.now();

      sessionStorage.setItem(
        this.getStorageKey(channelId),
        JSON.stringify(data),
      );
    } catch (error) {
      console.warn(
        `Failed to set unread count for channel ${channelId}:`,
        error,
      );
    }
  }

  /**
   * Load channel data from sessionStorage
   */
  loadChannel(channelId: string): PersistedChannelData | null {
    try {
      const stored = sessionStorage.getItem(this.getStorageKey(channelId));
      if (!stored) return null;

      const data = JSON.parse(stored) as PersistedChannelData;

      // Convert Set types that were serialized to arrays
      return data;
    } catch (error) {
      console.warn(`Failed to load channel ${channelId}:`, error);
      return null;
    }
  }

  /**
   * Clear persisted data for a channel
   */
  clearChannel(channelId: string): void {
    try {
      sessionStorage.removeItem(this.getStorageKey(channelId));
    } catch (error) {
      console.warn(`Failed to clear channel ${channelId}:`, error);
    }
  }

  /**
   * Clear all persisted channel data
   */
  clearAll(): void {
    try {
      const keys = Object.keys(sessionStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.STORAGE_PREFIX)) {
          sessionStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear all channels:', error);
    }
  }

  private getStorageKey(channelId: string): string {
    return `${this.STORAGE_PREFIX}${channelId}`;
  }
}

// Export singleton instance
export const persistenceService = new PersistenceService();
