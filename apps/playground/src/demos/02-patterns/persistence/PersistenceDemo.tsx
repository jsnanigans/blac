import React, { useState } from 'react';
import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { PersistencePlugin } from '@blac/plugin-persistence';

// Basic Persistent Settings Cubit
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

class PersistentSettingsCubit extends Cubit<SettingsState> {
  static plugins = [
    new PersistencePlugin<SettingsState>({
      key: 'playgroundSettings',
      debounceMs: 200,
      onError: (error, operation) => {
        console.error(`Persistence ${operation} failed:`, error);
      },
      version: 1,
    }),
  ];

  constructor() {
    super(initialSettings);
  }

  toggleTheme = () => {
    this.patch({ theme: this.state.theme === 'light' ? 'dark' : 'light' });
  };

  setNotifications = (enabled: boolean) => {
    this.patch({ notificationsEnabled: enabled });
  };

  setUserName = (name: string) => {
    this.patch({ userName: name });
  };

  resetToDefaults = () => {
    this.emit(initialSettings);
  };

  clearPersistedData = async () => {
    const plugin = (this._plugins as any).get(
      'persistence',
    ) as PersistencePlugin<SettingsState>;
    if (plugin) {
      await plugin.clear();
    }
  };
}

// Selective Persistence Cubit
interface SelectiveState {
  // Persisted
  theme: 'light' | 'dark';
  language: string;
  fontSize: number;
  user: {
    id: string;
    name: string;
    token?: string; // Not persisted
    lastSeen?: Date; // Not persisted
  } | null;
  // Not persisted
  isLoading: boolean;
  currentTab: string;
  temporaryMessage: string | null;
}

const initialSelectiveState: SelectiveState = {
  theme: 'light',
  language: 'en',
  fontSize: 16,
  user: null,
  isLoading: false,
  currentTab: 'home',
  temporaryMessage: null,
};

class SelectivePersistenceCubit extends Cubit<SelectiveState> {
  static plugins = [
    new PersistencePlugin<SelectiveState>({
      key: 'playgroundSelectiveState',
      // Only persist certain fields
      select: (state) => ({
        theme: state.theme,
        language: state.language,
        fontSize: state.fontSize,
        user: state.user
          ? {
              id: state.user.id,
              name: state.user.name,
            }
          : null,
      }),
      // Merge persisted data with default state
      merge: (persisted, current) => ({
        ...current,
        theme: persisted.theme || current.theme,
        language: persisted.language || current.language,
        fontSize: persisted.fontSize || current.fontSize,
        user: persisted.user
          ? {
              ...persisted.user,
              token: undefined,
              lastSeen: undefined,
            }
          : null,
      }),
    }),
  ];

  constructor() {
    super(initialSelectiveState);
  }

  setTheme = (theme: 'light' | 'dark') => {
    this.patch({ theme });
  };

  setLanguage = (language: string) => {
    this.patch({ language });
  };

  setFontSize = (fontSize: number) => {
    this.patch({ fontSize });
  };

  setLoading = (isLoading: boolean) => {
    this.patch({ isLoading });
  };

  setCurrentTab = (currentTab: string) => {
    this.patch({ currentTab });
  };

  showMessage = (message: string) => {
    this.patch({ temporaryMessage: message });
    setTimeout(() => {
      this.patch({ temporaryMessage: null });
    }, 3000);
  };

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

// Demo Component
export const PersistenceDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'basic' | 'selective'>('basic');
  const [settingsState, settings] = useBloc(PersistentSettingsCubit);
  const [selectiveState, selective] = useBloc(SelectivePersistenceCubit);

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('basic')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'basic'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Basic Persistence
          </button>
          <button
            onClick={() => setActiveTab('selective')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'selective'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
            }`}
          >
            Selective Persistence
          </button>
        </nav>
      </div>

      {activeTab === 'basic' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">
            Basic Persistent Settings
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Settings are automatically saved to localStorage and restored on
            page reload.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                User Name:
              </label>
              <input
                type="text"
                value={settingsState.userName}
                onChange={(e) => settings.setUserName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                placeholder="Enter your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Theme:</label>
              <button
                onClick={settings.toggleTheme}
                className={`px-4 py-2 rounded-md ${
                  settingsState.theme === 'dark'
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
                {settingsState.theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
              </button>
            </div>

            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={settingsState.notificationsEnabled}
                  onChange={(e) => settings.setNotifications(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium">
                  Enable notifications
                </span>
              </label>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                onClick={settings.resetToDefaults}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Reset to Defaults
              </button>
              <button
                onClick={settings.clearPersistedData}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Clear Storage
              </button>
            </div>

            <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
              <p className="text-sm font-mono mb-2">
                <strong>localStorage key:</strong> playgroundSettings
              </p>
              <p className="text-sm font-mono mb-2">
                <strong>Current State:</strong>
              </p>
              <pre className="text-xs overflow-auto">
                {JSON.stringify(settingsState, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'selective' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-2">Selective Persistence</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Only certain parts of the state are persisted. Session data and
            sensitive info are excluded.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 text-green-600 dark:text-green-400">
                ✅ Persisted Data
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Theme:
                  </label>
                  <button
                    onClick={() =>
                      selective.setTheme(
                        selectiveState.theme === 'dark' ? 'light' : 'dark',
                      )
                    }
                    className={`px-4 py-2 rounded-md ${
                      selectiveState.theme === 'dark'
                        ? 'bg-gray-800 text-white'
                        : 'bg-gray-200 text-gray-800'
                    }`}
                  >
                    {selectiveState.theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Language:
                  </label>
                  <select
                    value={selectiveState.language}
                    onChange={(e) => selective.setLanguage(e.target.value)}
                    className="px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Font Size: {selectiveState.fontSize}px
                  </label>
                  <input
                    type="range"
                    min="12"
                    max="24"
                    value={selectiveState.fontSize}
                    onChange={(e) =>
                      selective.setFontSize(Number(e.target.value))
                    }
                    className="w-full"
                  />
                </div>

                {selectiveState.user && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <strong className="text-sm">User (partial):</strong>
                    <div className="text-sm mt-1">
                      ID: {selectiveState.user.id}
                      <br />
                      Name: {selectiveState.user.name}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3 text-red-600 dark:text-red-400">
                ❌ Not Persisted
              </h4>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Loading State:
                  </label>
                  <button
                    onClick={() =>
                      selective.setLoading(!selectiveState.isLoading)
                    }
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  >
                    {selectiveState.isLoading ? 'Loading...' : 'Not Loading'}
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Current Tab:
                  </label>
                  <select
                    value={selectiveState.currentTab}
                    onChange={(e) => selective.setCurrentTab(e.target.value)}
                    className="px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="home">Home</option>
                    <option value="profile">Profile</option>
                    <option value="settings">Settings</option>
                  </select>
                </div>

                <div>
                  <button
                    onClick={() =>
                      selective.showMessage('This message will disappear!')
                    }
                    className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                  >
                    Show Temporary Message
                  </button>
                  {selectiveState.temporaryMessage && (
                    <div className="mt-2 p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded">
                      {selectiveState.temporaryMessage}
                    </div>
                  )}
                </div>

                {selectiveState.user && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded">
                    <strong className="text-sm">Sensitive User Data:</strong>
                    <div className="text-sm mt-1">
                      Token:{' '}
                      {selectiveState.user.token
                        ? '***' + selectiveState.user.token.slice(-4)
                        : 'None'}
                      <br />
                      Last Seen:{' '}
                      {selectiveState.user.lastSeen?.toLocaleTimeString() ||
                        'Never'}
                    </div>
                    <button
                      onClick={selective.updateLastSeen}
                      className="mt-2 px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                    >
                      Update Last Seen
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            {!selectiveState.user ? (
              <button
                onClick={() =>
                  selective.login('user123', 'John Doe', 'secret-token-xyz')
                }
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                Simulate Login
              </button>
            ) : (
              <button
                onClick={selective.logout}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Logout
              </button>
            )}
          </div>

          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
            <p className="text-sm mb-2">
              <strong>How it works:</strong>
            </p>
            <ul className="text-sm space-y-1 ml-4 list-disc">
              <li>The select function returns only the data to persist</li>
              <li>
                The merge function combines persisted data with current state
              </li>
              <li>
                Session data (loading, current tab, messages) is never saved
              </li>
              <li>Sensitive data (tokens, computed values) is excluded</li>
            </ul>
            <p className="text-sm font-mono mt-3">
              <strong>localStorage key:</strong> playgroundSelectiveState
            </p>
            <p className="text-sm font-mono mt-2">
              <strong>Persisted State:</strong>
            </p>
            <pre className="text-xs overflow-auto mt-1">
              {JSON.stringify(
                selectiveState.user
                  ? {
                      theme: selectiveState.theme,
                      language: selectiveState.language,
                      fontSize: selectiveState.fontSize,
                      user: {
                        id: selectiveState.user.id,
                        name: selectiveState.user.name,
                      },
                    }
                  : {
                      theme: selectiveState.theme,
                      language: selectiveState.language,
                      fontSize: selectiveState.fontSize,
                      user: null,
                    },
                null,
                2,
              )}
            </pre>
          </div>
        </div>
      )}

      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3">
          Plugin Features Demonstrated
        </h3>
        <ul className="space-y-2 text-sm">
          <li>
            <strong>Automatic Persistence:</strong> State changes are saved
            automatically
          </li>
          <li>
            <strong>Debouncing:</strong> Saves are debounced for performance
            (200ms)
          </li>
          <li>
            <strong>Error Handling:</strong> Graceful handling of storage errors
          </li>
          <li>
            <strong>Selective Persistence:</strong> Choose which parts of state
            to persist
          </li>
          <li>
            <strong>Version Support:</strong> Track data structure versions
          </li>
          <li>
            <strong>Multiple Storage Adapters:</strong> localStorage,
            sessionStorage, in-memory
          </li>
        </ul>
      </div>
    </div>
  );
};
