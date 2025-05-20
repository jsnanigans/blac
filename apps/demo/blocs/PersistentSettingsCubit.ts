import { Cubit, Persist, Blac } from '@blac/core';

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
  // Configure the Persist addon
  // This will automatically save/load state to/from localStorage
  static addons = [
    Persist({
      keyName: 'demoAppSettings', // The key used in localStorage
      defaultValue: {
        theme: 'light',
        notificationsEnabled: true,
        userName: 'Guest',
      },
      // initialState: initialSettings, // The addon can take an initial state too, useful if Cubit's super(initialState) is different or complex
      // storage: sessionStorage, // To use sessionStorage instead of localStorage (default)
      // serialize: (state) => JSON.stringify(state), // Custom serialize function
      // deserialize: (jsonString) => JSON.parse(jsonString), // Custom deserialize function
    }),
  ];

  constructor() {
    // The Persist addon will attempt to load from localStorage first.
    // If not found, or if loading fails, it will use this initial state.
    super(initialSettings);
    Blac.log(
      'PersistentSettingsCubit CONSTRUCTED. Initial state (after potential load):',
      this.state,
    );
  }

  toggleTheme = () => {
    this.patch({ theme: this.state.theme === 'light' ? 'dark' : 'light' });
    Blac.log('Theme toggled to:', this.state.theme === 'light' ? 'dark' : 'light');
  };

  setNotifications = (enabled: boolean) => {
    this.patch({ notificationsEnabled: enabled });
  };

  setUserName = (name: string) => {
    this.patch({ userName: name });
  }

  resetToDefaults = () => {
    this.emit(initialSettings); // This will also be persisted
    Blac.log('Settings reset to defaults and persisted.');
  }

  // No onDispose needed here for linter sanity
} 