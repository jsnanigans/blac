import { Cubit, borrowSafe, acquire } from '@blac/core';
import type { Message, Channel } from '../types';
import { persistenceService } from '../services/PersistenceService';
import { NotificationCubit } from './NotificationCubit';
import { UserCubit } from './UserCubit';
import { CURRENT_USER_ID, MOCK_USERS } from '../mockData';
import { ContactsCubit } from './ContactsCubit';
import { webSocket } from '../services/WebSocketMock';

export interface ChannelState {
  channel: Channel | null;
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
export class ChannelBloc extends Cubit<ChannelState> {
  private _contactsDep = this.depend(ContactsCubit);
  private _notificationsDep = this.depend(NotificationCubit);

  private ensureUserCubit(userId: string): void {
    // Skip current user (always exists)
    if (userId === CURRENT_USER_ID) return;

    // Check if UserCubit already exists
    const result = borrowSafe(UserCubit, userId);
    if (!result.error) return; // Already exists

    // Create UserCubit on-demand
    const user = MOCK_USERS.find((u) => u.id === userId);
    if (user) {
      acquire(UserCubit, userId).setUserId(userId);
    }
  }

  constructor() {
    super({
      channel: null,
      messages: [],
      typingUsers: new Set(),
      unreadCount: 0,
      draftMessage: '',
    });

    this.setupDispose();
  }

  init = ({ channelId }: { channelId: string }) => {
    const channelInfo = this._contactsDep().state.channels.find(
      (c: Channel) => c.id === channelId,
    );
    if (!channelInfo) return;

    const persisted = persistenceService.loadChannel(channelInfo.id);
    this.emit({
      channel: channelInfo,
      messages: persisted?.messages || [],
      typingUsers: new Set(),
      unreadCount: 0,
      draftMessage: '',
    });
  };

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
      if (!this.state.channel) return;
      persistenceService.saveChannel(
        this.state.channel.id,
        this.state.messages,
      );
    });
  }

  get channelInfo(): Channel | null {
    return this.state.channel;
  }

  // Action methods
  sendMessage = (userId: string) => {
    if (!this.state.channel) return;
    const draft = this.state.draftMessage?.trim() || '';
    if (draft.length === 0) return; // Don't send empty messages

    const newMessage: Message = {
      id: Date.now().toString(),
      channelId: this.state.channel.id,
      userId: userId,
      text: this.state.draftMessage.trim(),
      timestamp: Date.now(),
      status: 'sent',
    };

    this.emit({
      ...this.state,
      messages: [...this.state.messages, newMessage],
      draftMessage: '',
    });

    // Send to WebSocket mock
    webSocket.send({
      type: 'send_message',
      channelId: this.state.channel.id,
      userId: userId,
      payload: newMessage,
    });
  };

  updateDraftMessage = (draftText: string) => {
    this.emit({
      ...this.state,
      draftMessage: draftText,
    });
  };

  receiveMessage = (message: Message) => {
    // Check if message already exists (avoid duplicates)
    const exists = this.state.messages.some((m) => m.id === message.id);
    if (exists) return;

    // Ensure UserCubit exists for the message sender (lazy creation)
    this.ensureUserCubit(message.userId);

    this.emit({
      ...this.state,
      messages: [...this.state.messages, message],
    });

    // Update notification cubit with unread count
    if (this.state.channel) {
      this._notificationsDep().incrementUnread(this.state.channel.id);
    }
  };

  userTyping = (userId: string, isTyping: boolean) => {
    const newTypingUsers = new Set(this.state.typingUsers);

    if (isTyping) {
      newTypingUsers.add(userId);
    } else {
      newTypingUsers.delete(userId);
    }

    this.emit({
      ...this.state,
      typingUsers: newTypingUsers,
    });
  };

  markAsRead = () => {
    if (!this.state.channel) return;
    this._notificationsDep().clearUnread(this.state.channel.id);
  };

  updateMessageStatus = (messageId: string, status: Message['status']) => {
    const messages = this.state.messages.map((msg) =>
      msg.id === messageId ? { ...msg, status: status } : msg,
    );

    this.emit({
      ...this.state,
      messages,
    });
  };
}
