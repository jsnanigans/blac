// Core domain types for the messenger example

export interface Message {
  id: string;
  channelId: string;
  userId: string;
  text: string;
  timestamp: number;
  status: 'sending' | 'sent' | 'delivered' | 'failed';
  threadId?: string; // If this message is in a thread
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  members: string[];
  createdAt: number;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'away' | 'offline';
  customStatus?: string;
}

// WebSocket message types
export type OutgoingMessageType =
  | 'send_message'
  | 'typing_start'
  | 'typing_stop'
  | 'mark_read';
export type IncomingMessageType =
  | 'message_received'
  | 'message_delivered'
  | 'user_typing'
  | 'user_status_changed';

export interface OutgoingMessage {
  type: OutgoingMessageType;
  channelId: string;
  userId: string;
  payload: any;
}

export interface IncomingMessage {
  type: IncomingMessageType;
  payload: any;
}
