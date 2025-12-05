import { Vertex } from '@blac/core';
import type { Message, Channel } from '../types';
import { persistenceService } from '../services/PersistenceService';
import { NotificationCubit } from './NotificationCubit';
import { UserCubit } from './UserCubit';
import { CURRENT_USER_ID, MOCK_USERS } from '../mockData';
import { ContactsCubit } from './ContactsCubit';
import { webSocket } from '../services/WebSocketMock';

// Events as discriminated union
export type ChannelEvent =
  | { type: 'sendMessage'; userId: string }
  | { type: 'updateDraftMessage'; draftText: string }
  | { type: 'receiveMessage'; message: Message }
  | { type: 'userTyping'; userId: string; isTyping: boolean }
  | { type: 'markAsRead' }
  | { type: 'updateMessageStatus'; messageId: string; status: Message['status'] };

export interface ChannelState {
  channel: Channel;
  messages: Message[];
  typingUsers: Set<string>;
  unreadCount: number;
  draftMessage: string;
}

/**
 * Channel state - shared instances (one per channel)
 * instanceKey: channelId
 *
 * Demonstrates shared instance pattern - multiple components can access
 * the same channel instance using instanceId. Each channel is completely
 * independent with its own state and lifecycle.
 */
export class ChannelBloc extends Vertex<ChannelState, ChannelEvent> {
  /**
   * Ensure UserCubit exists for a given user (lazy creation)
   * This is called when messages are received to ensure we can render user info
   */
  private ensureUserCubit(userId: string): void {
    // Skip current user (always exists)
    if (userId === CURRENT_USER_ID) return;

    // Check if UserCubit already exists
    const result = UserCubit.getSafe(userId);
    if (!result.error) return; // Already exists

    // Create UserCubit on-demand
    const user = MOCK_USERS.find((u) => u.id === userId);
    if (user) {
      UserCubit.resolve(userId, { props: { user } });
      console.log(`[ChannelBloc] Created UserCubit for ${userId} on-demand`);
    }
  }

  constructor(props?: { channelId: string }) {
    const channelInfo = ContactsCubit.get().state.channels.find(
      (c) => c.id === props?.channelId,
    );
    if (!channelInfo) {
      throw new Error('ChannelBloc requires a channel to be passed via props');
    }

    // Try to load persisted data
    const persisted = persistenceService.loadChannel(channelInfo.id);

    super({
      channel: channelInfo,
      messages: persisted?.messages || [],
      typingUsers: new Set(),
      unreadCount: 0, // Unread count is managed by NotificationCubit now
      draftMessage: '',
    });

    // Register all event handlers with exhaustive type checking
    this.createHandlers({
      sendMessage: (event, emit) => {
        const draft = this.state.draftMessage?.trim() || '';
        if (draft.length === 0) return; // Don't send empty messages

        const newMessage: Message = {
          id: Date.now().toString(),
          channelId: this.state.channel.id,
          userId: event.userId,
          text: this.state.draftMessage.trim(),
          timestamp: Date.now(),
          status: 'sent',
        };

        emit({
          ...this.state,
          messages: [...this.state.messages, newMessage],
          draftMessage: '',
        });

        // Send to WebSocket mock
        webSocket.send({
          type: 'send_message',
          channelId: this.state.channel.id,
          userId: event.userId,
          payload: newMessage,
        });
      },

      receiveMessage: (event, emit) => {
        // Check if message already exists (avoid duplicates)
        const exists = this.state.messages.some((m) => m.id === event.message.id);
        if (exists) return;

        // Ensure UserCubit exists for the message sender (lazy creation)
        this.ensureUserCubit(event.message.userId);

        emit({
          ...this.state,
          messages: [...this.state.messages, event.message],
        });

        // Update notification cubit with unread count
        const notificationCubit = NotificationCubit.getSafe();
        if (!notificationCubit.error) {
          notificationCubit.instance.incrementUnread(this.state.channel.id);
        }
      },

      userTyping: (event, emit) => {
        const newTypingUsers = new Set(this.state.typingUsers);

        if (event.isTyping) {
          newTypingUsers.add(event.userId);
        } else {
          newTypingUsers.delete(event.userId);
        }

        emit({
          ...this.state,
          typingUsers: newTypingUsers,
        });
      },

      markAsRead: (_, _emit) => {
        // Clear unread count in NotificationCubit
        const notificationCubit = NotificationCubit.getSafe();
        if (!notificationCubit.error) {
          notificationCubit.instance.clearUnread(this.state.channel.id);
        }
      },

      updateMessageStatus: (event, emit) => {
        const messages = this.state.messages.map((msg) =>
          msg.id === event.messageId ? { ...msg, status: event.status } : msg,
        );

        emit({
          ...this.state,
          messages,
        });
      },

      updateDraftMessage: (event, emit) => {
        emit({
          ...this.state,
          draftMessage: event.draftText,
        });
      },
    });

    // Setup dispose handler
    this.setupDispose();
  }

  // Getter for typing indicator text
  get typingIndicator(): string {
    const typingCount = this.state.typingUsers.size;
    if (typingCount === 0) return '';
    if (typingCount === 1) return 'Someone is typing...';
    return `${typingCount} people are typing...`;
  }

  /**
   * Persist channel data before disposal
   */
  private setupDispose() {
    this.onSystemEvent('dispose', () => {
      // Save messages to sessionStorage so they can be restored later
      persistenceService.saveChannel(
        this.state.channel.id,
        this.state.messages,
      );

      console.log(
        `[ChannelBloc] Persisted ${this.state.messages.length} messages for channel ${this.state.channel.id}`,
      );
    });
  }

  get channelInfo(): Channel | null {
    return this.state.channel || null;
  }

  // Convenience methods for dispatching events
  sendMessage = (userId: string) => {
    this.add({ type: 'sendMessage', userId });
  };

  updateDraftMessage = (draftText: string) => {
    this.add({ type: 'updateDraftMessage', draftText });
  };

  receiveMessage = (message: Message) => {
    this.add({ type: 'receiveMessage', message });
  };

  userTyping = (userId: string, isTyping: boolean) => {
    this.add({ type: 'userTyping', userId, isTyping });
  };

  markAsRead = () => {
    this.add({ type: 'markAsRead' });
  };

  updateMessageStatus = (messageId: string, status: Message['status']) => {
    this.add({ type: 'updateMessageStatus', messageId, status });
  };
}
