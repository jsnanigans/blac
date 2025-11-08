import { Cubit } from '@blac/core';

export interface AppState {
  currentUserId: string;
  activeChannelId: string | null;
  activeThreadId: string | null;
  sidebarOpen: boolean;
}

/**
 * Global app state - shared single instance
 * Manages current user, active channel/thread, and UI state
 */
export class AppCubit extends Cubit<AppState> {
  constructor(props?: { currentUserId: string }) {
    if (!props?.currentUserId) {
      throw new Error('AppCubit requires currentUserId to be passed via staticProps');
    }

    super({
      currentUserId: props.currentUserId,
      activeChannelId: null,
      activeThreadId: null,
      sidebarOpen: true,
    });
  }

  setActiveChannel = (channelId: string | null) => {
    this.patch({
      activeChannelId: channelId,
      activeThreadId: null, // Clear thread when switching channels
    });
  };

  setActiveThread = (threadId: string | null) => {
    this.patch({ activeThreadId: threadId });
  };

  toggleSidebar = () => {
    this.patch({ sidebarOpen: !this.state.sidebarOpen });
  };
}
