import { Cubit } from '@blac/core';
import { PersistencePlugin } from '@blac/plugin-persistence';

interface AppState {
  // User preferences (persisted)
  theme: 'light' | 'dark';
  language: string;
  fontSize: number;

  // Session data (not persisted)
  isLoading: boolean;
  currentTab: string;
  temporaryMessage: string | null;

  // Mixed data
  user: {
    id: string; // persisted
    name: string; // persisted
    token?: string; // not persisted (sensitive)
    lastSeen?: Date; // not persisted (computed)
  } | null;
}

export class SelectivePersistenceCubit extends Cubit<AppState> {
  static plugins = [
    new PersistencePlugin<AppState>({
      key: 'selectiveAppState',
      debounceMs: 200,

      // Only persist specific parts of the state
      select: (state) => ({
        theme: state.theme,
        language: state.language,
        fontSize: state.fontSize,
        user: state.user
          ? {
              id: state.user.id,
              name: state.user.name,
              // Exclude token and lastSeen
            }
          : null,
      }),

      // Merge persisted state with current state
      merge: (persisted, current) => ({
        ...current,
        theme: persisted.theme ?? current.theme,
        language: persisted.language ?? current.language,
        fontSize: persisted.fontSize ?? current.fontSize,
        user: persisted.user
          ? {
              ...current.user,
              id: persisted.user.id,
              name: persisted.user.name,
              // Keep current token and lastSeen
              token: current.user?.token,
              lastSeen: current.user?.lastSeen,
            }
          : current.user,
      }),

      onError: (error, operation) => {
        console.error(`Selective persistence ${operation} failed:`, error);
      },
    }),
  ];

  constructor() {
    super({
      theme: 'light',
      language: 'en',
      fontSize: 16,
      isLoading: false,
      currentTab: 'home',
      temporaryMessage: null,
      user: null,
    });
  }

  // Preference updates (will be persisted)
  setTheme = (theme: 'light' | 'dark') => {
    this.patch({ theme });
  };

  setLanguage = (language: string) => {
    this.patch({ language });
  };

  setFontSize = (fontSize: number) => {
    this.patch({ fontSize });
  };

  // Session updates (won't be persisted)
  setLoading = (isLoading: boolean) => {
    this.patch({ isLoading });
  };

  setCurrentTab = (currentTab: string) => {
    this.patch({ currentTab });
  };

  showMessage = (message: string) => {
    this.patch({ temporaryMessage: message });
    // Auto-clear after 3 seconds
    setTimeout(() => {
      if (this.state.temporaryMessage === message) {
        this.patch({ temporaryMessage: null });
      }
    }, 3000);
  };

  // User updates (partially persisted)
  login = (id: string, name: string, token: string) => {
    this.patch({
      user: {
        id,
        name,
        token,
        lastSeen: new Date(),
      },
    });
  };

  updateLastSeen = () => {
    if (this.state.user) {
      this.patch({
        user: {
          ...this.state.user,
          lastSeen: new Date(),
        },
      });
    }
  };

  logout = () => {
    this.patch({ user: null });
  };
}
