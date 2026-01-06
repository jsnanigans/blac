import type { OutgoingMessage, IncomingMessage, Message } from '../types';
import { borrowSafe, getAll } from '@blac/core';
import { ChannelBloc } from '../blocs/ChannelBloc';
import { UserCubit } from '../blocs/UserCubit';
import { NotificationCubit } from '../blocs/NotificationCubit';
import { persistenceService } from './PersistenceService';

/**
 * Mock WebSocket service that simulates a real-time server
 *
 * Features:
 * - Simulates message delivery with realistic delays
 * - Randomly generates incoming messages
 * - Simulates typing indicators
 * - Updates user online status
 */
export class WebSocketMock {
  private connected = false;
  private messageCallbacks: Array<(msg: IncomingMessage) => void> = [];
  private simulationIntervals: number[] = [];
  private currentUserId: string | null = null;

  // Bot users that will send random messages
  private readonly BOT_USERS = [
    'bot-alice',
    'bot-bob',
    'bot-charlie',
    'bot-diana',
    'bot-evan',
    'bot-fiona',
  ];

  // All channel IDs (passed from app initialization)
  private allChannelIds: string[] = [];

  private readonly SAMPLE_MESSAGES = [
    'Hey team! How is everyone doing?',
    'Just finished the new feature, ready for review!',
    "I'll be AFK for lunch, back in 30 mins",
    'Great work on the presentation today!',
    'Anyone available for a quick sync?',
    'The build is passing now 🎉',
    'Meeting starts in 5 minutes',
    'Can someone help me debug this issue?',
    "I'm looking into the performance problem",
    'Thanks for the quick turnaround!',
  ];

  /**
   * Set all channel IDs (called during app initialization)
   */
  setChannels(channelIds: string[]) {
    this.allChannelIds = channelIds;
  }

  connect(userId: string) {
    if (this.connected) {
      console.warn('WebSocket already connected');
      return;
    }

    this.connected = true;
    this.currentUserId = userId;
    console.log(`[WebSocket] Connected as user: ${userId}`);

    // Start simulations
    this.startIncomingMessageSimulation();
    this.startTypingSimulation();
    this.startBotStatusSimulation();
  }

  disconnect() {
    if (!this.connected) return;

    this.connected = false;
    this.currentUserId = null;

    // Clear all simulation intervals
    this.simulationIntervals.forEach((id) => clearInterval(id));
    this.simulationIntervals = [];

    console.log('[WebSocket] Disconnected');
  }

  /**
   * Send an outgoing message (from user to server)
   */
  send(message: OutgoingMessage) {
    if (!this.connected) {
      console.error('[WebSocket] Cannot send - not connected');
      return;
    }

    console.log('[WebSocket] Sending:', message);

    // Simulate different message types
    switch (message.type) {
      case 'send_message':
        this.simulateMessageDelivery(message);
        break;
      case 'typing_start':
      case 'typing_stop':
        // In a real app, this would notify other users
        break;
      case 'mark_read':
        // In a real app, this would update server-side read status
        break;
    }
  }

  /**
   * Register callback for incoming messages
   */
  onMessage(callback: (msg: IncomingMessage) => void) {
    this.messageCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.messageCallbacks.indexOf(callback);
      if (index !== -1) {
        this.messageCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Emit message to all registered callbacks
   */
  private emit(message: IncomingMessage) {
    this.messageCallbacks.forEach((callback) => callback(message));
  }

  /**
   * Simulate message delivery confirmation
   */
  private simulateMessageDelivery(outgoing: OutgoingMessage) {
    const messageId = outgoing.payload.id;

    // Simulate network delay for "sent" status
    setTimeout(
      () => {
        try {
          const channel = borrowSafe(ChannelBloc, outgoing.channelId);
          if (!channel.error) {
            channel.instance.updateMessageStatus(messageId, 'sent');
          }
        } catch (error) {
          console.error('[WebSocket] Failed to update message status:', error);
        }
      },
      200 + Math.random() * 300,
    );

    // Simulate server processing delay for "delivered" status
    setTimeout(
      () => {
        try {
          const channel = borrowSafe(ChannelBloc, outgoing.channelId);
          if (!channel.error) {
            channel.instance.updateMessageStatus(messageId, 'delivered');
          }

          // Emit confirmation to callbacks
          this.emit({
            type: 'message_delivered',
            payload: { messageId },
          });
        } catch (error) {
          console.error('[WebSocket] Failed to deliver message:', error);
        }
      },
      500 + Math.random() * 500,
    );
  }

  /**
   * Simulate random incoming messages from bots
   * Works with lazy loading - sends to active ChannelBloc or saves to persistence
   */
  private startIncomingMessageSimulation() {
    const intervalId = window.setInterval(() => {
      if (!this.connected || this.allChannelIds.length === 0) return;

      // Random chance to send a message (20% per interval)
      if (Math.random() > 0.2) return;

      // Pick random bot and channel
      const botUserId =
        this.BOT_USERS[Math.floor(Math.random() * this.BOT_USERS.length)];
      const channelId =
        this.allChannelIds[
          Math.floor(Math.random() * this.allChannelIds.length)
        ];

      const messageText =
        this.SAMPLE_MESSAGES[
          Math.floor(Math.random() * this.SAMPLE_MESSAGES.length)
        ];

      const message: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        channelId,
        userId: botUserId,
        text: messageText,
        timestamp: Date.now(),
        status: 'delivered',
      };

      console.log(
        `[WebSocket] Incoming message from ${botUserId} to ${channelId}:`,
        messageText,
      );

      // Try to send to active ChannelBloc, otherwise save to persistence
      const channelResult = borrowSafe(ChannelBloc, channelId);

      if (!channelResult.error) {
        // Channel is active - send event directly
        try {
          channelResult.instance.receiveMessage(message);
        } catch (error) {
          console.error('[WebSocket] Failed to add incoming message:', error);
        }
      } else {
        // Channel is not active - save to persistence and update notification
        const persisted = persistenceService.loadChannel(channelId);
        const existingMessages = persisted?.messages || [];

        persistenceService.saveChannel(channelId, [
          ...existingMessages,
          message,
        ]);

        // Update notification cubit
        const notificationResult = borrowSafe(NotificationCubit);
        if (!notificationResult.error) {
          notificationResult.instance.incrementUnread(channelId);
        }

        console.log(
          `[WebSocket] Saved message to persistence for inactive channel ${channelId}`,
        );
      }
    }, 5000); // Check every 5 seconds

    this.simulationIntervals.push(intervalId);
  }

  /**
   * Simulate random typing indicators
   * Only works with active channels (typing indicators don't matter for inactive channels)
   */
  private startTypingSimulation() {
    const intervalId = window.setInterval(() => {
      if (!this.connected || this.allChannelIds.length === 0) return;

      // Random chance to show typing indicator (15% per interval)
      if (Math.random() > 0.15) return;

      const botUserId =
        this.BOT_USERS[Math.floor(Math.random() * this.BOT_USERS.length)];

      // Get active channels only
      const activeChannels = getAll(ChannelBloc);
      if (activeChannels.length === 0) return;

      const channel =
        activeChannels[Math.floor(Math.random() * activeChannels.length)];

      // Start typing
      channel.userTyping(botUserId, true);

      // Stop typing after 2-4 seconds
      setTimeout(
        () => {
          try {
            const ch = borrowSafe(ChannelBloc, channel.instanceId);
            if (!ch.error) {
              ch.instance.userTyping(botUserId, false);
            }
          } catch (error) {
            // Channel might be disposed, ignore
          }
        },
        2000 + Math.random() * 2000,
      );
    }, 7000); // Check every 7 seconds

    this.simulationIntervals.push(intervalId);
  }

  /**
   * Update bot user statuses randomly
   * Only updates users that are currently active (part of active channel)
   */
  private startBotStatusSimulation() {
    const intervalId = window.setInterval(() => {
      if (!this.connected) return;

      // Get all active UserCubit instances
      const activeUsers = getAll(UserCubit);

      this.BOT_USERS.forEach((userId) => {
        // Only update if this bot user is currently active
        const isActive = activeUsers.some((u) => u.instanceId === userId);
        if (!isActive) return;

        try {
          const result = borrowSafe(UserCubit, userId);
          if (!result.error) {
            const statuses: Array<'online' | 'away' | 'offline'> = [
              'online',
              'away',
              'offline',
            ];
            const randomStatus =
              statuses[Math.floor(Math.random() * statuses.length)];
            result.instance.setStatus(randomStatus);
          }
        } catch (error) {
          // User might be disposed, ignore
        }
      });
    }, 10000); // Update every 10 seconds

    this.simulationIntervals.push(intervalId);
  }
}

// Export singleton instance
export const webSocket = new WebSocketMock();
