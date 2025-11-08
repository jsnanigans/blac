import type { OutgoingMessage, IncomingMessage, Message } from '../types';
import {
  ChannelBloc,
  ReceiveMessageEvent,
  UpdateMessageStatusEvent,
  UserTypingEvent,
} from '../blocs/ChannelBloc';
import { UserCubit } from '../blocs/UserCubit';

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
  private readonly BOT_USERS = ['bot-alice', 'bot-bob', 'bot-charlie'];

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
    const messageId = outgoing.payload.messageId;

    // Simulate network delay for "sent" status
    setTimeout(() => {
      try {
        const channel = ChannelBloc.getSafe(outgoing.channelId);
        if (!channel.error) {
          channel.instance.add(new UpdateMessageStatusEvent(messageId, 'sent'));
        }
      } catch (error) {
        console.error('[WebSocket] Failed to update message status:', error);
      }
    }, 200 + Math.random() * 300);

    // Simulate server processing delay for "delivered" status
    setTimeout(() => {
      try {
        const channel = ChannelBloc.getSafe(outgoing.channelId);
        if (!channel.error) {
          channel.instance.add(new UpdateMessageStatusEvent(messageId, 'delivered'));
        }

        // Emit confirmation to callbacks
        this.emit({
          type: 'message_delivered',
          payload: { messageId },
        });
      } catch (error) {
        console.error('[WebSocket] Failed to deliver message:', error);
      }
    }, 500 + Math.random() * 500);
  }

  /**
   * Simulate random incoming messages from bots
   */
  private startIncomingMessageSimulation() {
    const intervalId = window.setInterval(() => {
      if (!this.connected) return;

      // Random chance to send a message (20% per interval)
      if (Math.random() > 0.2) return;

      // Pick random bot and channel
      const botUserId = this.BOT_USERS[Math.floor(Math.random() * this.BOT_USERS.length)];
      const channels = ChannelBloc.getAll();

      if (channels.length === 0) return;

      const channel = channels[Math.floor(Math.random() * channels.length)];
      const messageText =
        this.SAMPLE_MESSAGES[Math.floor(Math.random() * this.SAMPLE_MESSAGES.length)];

      const message: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        channelId: channel.state.channel.id,
        userId: botUserId,
        text: messageText,
        timestamp: Date.now(),
        status: 'delivered',
      };

      console.log(`[WebSocket] Incoming message from ${botUserId}:`, messageText);

      try {
        channel.add(new ReceiveMessageEvent(message));
      } catch (error) {
        console.error('[WebSocket] Failed to add incoming message:', error);
      }
    }, 5000); // Check every 5 seconds

    this.simulationIntervals.push(intervalId);
  }

  /**
   * Simulate random typing indicators
   */
  private startTypingSimulation() {
    const intervalId = window.setInterval(() => {
      if (!this.connected) return;

      // Random chance to show typing indicator (15% per interval)
      if (Math.random() > 0.15) return;

      const botUserId = this.BOT_USERS[Math.floor(Math.random() * this.BOT_USERS.length)];
      const channels = ChannelBloc.getAll();

      if (channels.length === 0) return;

      const channel = channels[Math.floor(Math.random() * channels.length)];

      // Start typing
      channel.add(new UserTypingEvent(botUserId, true));

      // Stop typing after 2-4 seconds
      setTimeout(() => {
        try {
          const ch = ChannelBloc.getSafe(channel.instanceId);
          if (!ch.error) {
            ch.instance.add(new UserTypingEvent(botUserId, false));
          }
        } catch (error) {
          // Channel might be disposed, ignore
        }
      }, 2000 + Math.random() * 2000);
    }, 7000); // Check every 7 seconds

    this.simulationIntervals.push(intervalId);
  }

  /**
   * Update bot user statuses randomly
   */
  updateBotStatuses() {
    this.BOT_USERS.forEach((userId) => {
      try {
        const result = UserCubit.getSafe(userId);
        if (!result.error) {
          const statuses: Array<'online' | 'away' | 'offline'> = ['online', 'away', 'offline'];
          const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
          result.instance.setStatus(randomStatus);
        }
      } catch (error) {
        // User might not exist yet, ignore
      }
    }, 10000); // Update every 10 seconds
  }
}

// Export singleton instance
export const webSocket = new WebSocketMock();
