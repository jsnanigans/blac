import { Cubit } from '@blac/core';
import type { Channel } from '../types';
import { MOCK_CHANNELS, MOCK_USERS } from '../mockData';

export interface ContactsState {
  users: string[]; // User IDs
  channels: Channel[];
  searchQuery: string;
}

/**
 * Contacts and channels list - shared single instance
 * Manages the list of available users and channels
 */
export class ContactsCubit extends Cubit<ContactsState> {
  constructor() {
    super({
      users: MOCK_USERS.map((u) => u.id),
      channels: MOCK_CHANNELS,
      searchQuery: '',
    });
  }

  setSearchQuery = (query: string) => {
    this.patch({ searchQuery: query });
  };

  addChannel = (channel: Channel) => {
    this.emit({
      ...this.state,
      channels: [...this.state.channels, channel],
    });
  };

  removeChannel = (channelId: string) => {
    this.emit({
      ...this.state,
      channels: this.state.channels.filter((c) => c.id !== channelId),
    });
  };

  // Filtered lists based on search query
  get filteredChannels(): Channel[] {
    const query = this.state.searchQuery.toLowerCase();
    if (!query) return this.state.channels;

    return this.state.channels.filter((channel) =>
      channel.name.toLowerCase().includes(query),
    );
  }

  get filteredUsers(): string[] {
    // In a real app, you'd filter users by name
    // For now, just return all users
    return this.state.users;
  }
}
