import { Vertex, BaseEvent } from '@blac/core';
import type { Message, Channel } from '../types';
import { persistenceService } from '../services/PersistenceService';
import { NotificationCubit } from './NotificationCubit';
import { UserCubit } from './UserCubit';
import { CURRENT_USER_ID, MOCK_USERS } from '../mockData';
import { ContactsCubit } from './ContactsCubit';
import { webSocket } from '../services/WebSocketMock';

// Events
export class SendMessageEvent implements BaseEvent {
  readonly type = 'send_message';
  readonly timestamp = Date.now();
  constructor(public readonly userId: string) {}
}

export class UpdateDraftMessageEvent implements BaseEvent {
  readonly type = 'update_draft_message';
  readonly timestamp = Date.now();
  constructor(public readonly draftText: string) {}
}

export class ReceiveMessageEvent implements BaseEvent {
  readonly type = 'receive_message';
  readonly timestamp = Date.now();
  constructor(public readonly message: Message) {}
}

export class UserTypingEvent implements BaseEvent {
  readonly type = 'user_typing';
  readonly timestamp = Date.now();
  constructor(
    public readonly userId: string,
    public readonly isTyping: boolean,
  ) {}
}

export class MarkAsReadEvent implements BaseEvent {
  readonly type = 'mark_as_read';
  readonly timestamp = Date.now();
  constructor() {}
}

export class UpdateMessageStatusEvent implements BaseEvent {
  readonly type = 'update_message_status';
  readonly timestamp = Date.now();
  constructor(
    public readonly messageId: string,
    public readonly status: Message['status'],
  ) {}
}

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
export class ChannelBloc extends Vertex<ChannelState> {
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
      UserCubit.resolve(userId, { user });
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

    // Register event handlers in constructor per Vertex pattern
    this.on(SendMessageEvent, (event, emit) => {
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
    });

    this.on(ReceiveMessageEvent, (event, emit) => {
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
    });

    this.on(UserTypingEvent, (event, emit) => {
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
    });

    this.on(MarkAsReadEvent, (_event, emit) => {
      // Clear unread count in NotificationCubit
      const notificationCubit = NotificationCubit.getSafe();
      if (!notificationCubit.error) {
        notificationCubit.instance.clearUnread(this.state.channel.id);
      }
    });

    this.on(UpdateMessageStatusEvent, (event, emit) => {
      const messages = this.state.messages.map((msg) =>
        msg.id === event.messageId ? { ...msg, status: event.status } : msg,
      );

      emit({
        ...this.state,
        messages,
      });
    });

    this.on(UpdateDraftMessageEvent, (event, emit) => {
      emit({
        ...this.state,
        draftMessage: event.draftText,
      });
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
}
