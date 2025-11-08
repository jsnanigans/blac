import { Vertex } from '@blac/core';
import type { Message, Channel } from '../types';

// Events
export class SendMessageEvent {
  constructor(
    public readonly text: string,
    public readonly userId: string,
  ) {}
}

export class ReceiveMessageEvent {
  constructor(public readonly message: Message) {}
}

export class UserTypingEvent {
  constructor(
    public readonly userId: string,
    public readonly isTyping: boolean,
  ) {}
}

export class MarkAsReadEvent {
  constructor() {}
}

export class UpdateMessageStatusEvent {
  constructor(
    public readonly messageId: string,
    public readonly status: Message['status'],
  ) {}
}

export type ChannelEvent =
  | SendMessageEvent
  | ReceiveMessageEvent
  | UserTypingEvent
  | MarkAsReadEvent
  | UpdateMessageStatusEvent;

export interface ChannelState {
  channel: Channel;
  messages: Message[];
  typingUsers: Set<string>;
  unreadCount: number;
}

/**
 * Channel state - isolated instances (one per channel)
 * instanceKey: channelId
 *
 * Demonstrates isolated instance pattern - each channel is completely
 * independent with its own state and lifecycle
 */
export class ChannelBloc extends Vertex<ChannelState, ChannelEvent> {
  static isolated = true;

  constructor(props?: { channel: Channel }) {
    if (!props?.channel) {
      throw new Error('ChannelBloc requires a channel to be passed via staticProps');
    }

    super({
      channel: props.channel,
      messages: [],
      typingUsers: new Set(),
      unreadCount: 0,
    });
  }

  protected on = (event: ChannelEvent) => {
    if (event instanceof SendMessageEvent) {
      return this.onSendMessage(event);
    }
    if (event instanceof ReceiveMessageEvent) {
      return this.onReceiveMessage(event);
    }
    if (event instanceof UserTypingEvent) {
      return this.onUserTyping(event);
    }
    if (event instanceof MarkAsReadEvent) {
      return this.onMarkAsRead(event);
    }
    if (event instanceof UpdateMessageStatusEvent) {
      return this.onUpdateMessageStatus(event);
    }
  };

  private onSendMessage = (event: SendMessageEvent) => {
    const message: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      channelId: this.state.channel.id,
      userId: event.userId,
      text: event.text,
      timestamp: Date.now(),
      status: 'sending',
    };

    this.emit({
      ...this.state,
      messages: [...this.state.messages, message],
    });

    // External system (WebSocketMock) will update status later
    return message;
  };

  private onReceiveMessage = (event: ReceiveMessageEvent) => {
    // Check if message already exists (avoid duplicates)
    const exists = this.state.messages.some((m) => m.id === event.message.id);
    if (exists) return;

    this.emit({
      ...this.state,
      messages: [...this.state.messages, event.message],
      unreadCount: this.state.unreadCount + 1,
    });
  };

  private onUserTyping = (event: UserTypingEvent) => {
    const newTypingUsers = new Set(this.state.typingUsers);

    if (event.isTyping) {
      newTypingUsers.add(event.userId);
    } else {
      newTypingUsers.delete(event.userId);
    }

    this.emit({
      ...this.state,
      typingUsers: newTypingUsers,
    });
  };

  private onMarkAsRead = (_event: MarkAsReadEvent) => {
    this.patch({ unreadCount: 0 });
  };

  private onUpdateMessageStatus = (event: UpdateMessageStatusEvent) => {
    const messages = this.state.messages.map((msg) =>
      msg.id === event.messageId ? { ...msg, status: event.status } : msg,
    );

    this.emit({
      ...this.state,
      messages,
    });
  };

  // Getter for typing indicator text
  get typingIndicator(): string {
    const typingCount = this.state.typingUsers.size;
    if (typingCount === 0) return '';
    if (typingCount === 1) return 'Someone is typing...';
    return `${typingCount} people are typing...`;
  }
}
