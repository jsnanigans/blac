import { Cubit } from '@blac/core';
import { PersistencePlugin } from '@blac/plugin-persistence';

interface SettingsState {
  theme: 'light' | 'dark';
  notificationsEnabled: boolean;
  userName: string;
}

const initialSettings: SettingsState = {
  theme: 'light',
  notificationsEnabled: true,
  userName: 'Guest',
};

export class PersistentSettingsCubit extends Cubit<SettingsState> {
  // Use the new official persistence plugin
  static plugins = [
    new PersistencePlugin<SettingsState>({
      key: 'demoAppSettings',
      // Optional: debounce saves for better performance
      debounceMs: 200,
      // Optional: handle errors
      onError: (error, operation) => {
        console.error(`Persistence ${operation} failed:`, error);
      },
      // Optional: version your persisted data
      version: 1,
    }),
  ];

  constructor() {
    // The PersistencePlugin will automatically restore state from localStorage
    // If not found, it will use this initial state
    super(initialSettings);
    console.log(
      'PersistentSettingsCubit initialized. Current state:',
      this.state,
    );
  }

  toggleTheme = () => {
    this.patch({ theme: this.state.theme === 'light' ? 'dark' : 'light' });
    console.log(
      'Theme toggled to:',
      this.state.theme === 'light' ? 'dark' : 'light',
    );
  };

  setNotifications = (enabled: boolean) => {
    this.patch({ notificationsEnabled: enabled });
  };

  setUserName = (name: string) => {
    this.patch({ userName: name });
  };

  resetToDefaults = () => {
    this.emit(initialSettings);
    console.log('Settings reset to defaults and persisted.');
  };

  // Method to clear persisted data
  clearPersistedData = async () => {
    const plugin = this.getPlugin(
      'persistence',
    ) as PersistencePlugin<SettingsState>;
    if (plugin) {
      await plugin.clear();
      console.log('Persisted data cleared from storage');
    }
  };
}
