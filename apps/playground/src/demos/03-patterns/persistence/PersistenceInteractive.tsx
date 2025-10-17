import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { PersistencePlugin } from '@blac/plugin-persistence';
import { Button } from '@/ui/Button';
import { StateViewer } from '@/components/shared/StateViewer';
import { RefreshCw, Trash2, Database, Save } from 'lucide-react';
import { useState } from 'react';

// Basic Persistent Settings State
interface SettingsState {
  theme: 'light' | 'dark';
  notificationsEnabled: boolean;
  userName: string;
  fontSize: number;
}

const initialSettings: SettingsState = {
  theme: 'light',
  notificationsEnabled: true,
  userName: 'Guest',
  fontSize: 16,
};

/**
 * Basic Persistent Settings Cubit
 * Demonstrates automatic state persistence to localStorage
 */
class PersistentSettingsCubit extends Cubit<SettingsState> {
  static plugins = [
    new PersistencePlugin<SettingsState>({
      key: 'playgroundSettings', // localStorage key
      debounceMs: 200, // Wait 200ms before saving
      onError: (error, operation) => {
        console.error(`Persistence ${operation} failed:`, error);
      },
      version: 1, // Track data structure version
    }),
  ];

  constructor() {
    super(initialSettings); // Plugin auto-loads from storage
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

  setFontSize = (fontSize: number) => {
    this.patch({ fontSize });
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

// Selective Persistence State
interface UserData {
  id: string;
  name: string;
  token?: string; // Not persisted
  lastSeen?: Date; // Not persisted
}

interface SelectiveState {
  // Persisted
  theme: 'light' | 'dark';
  language: string;
  user: Pick<UserData, 'id' | 'name'> | null;
  // Not persisted
  isLoading: boolean;
  currentTab: string;
}

const initialSelectiveState: SelectiveState = {
  theme: 'light',
  language: 'en',
  user: null,
  isLoading: false,
  currentTab: 'home',
};

/**
 * Selective Persistence Cubit
 * Demonstrates persisting only certain fields (not tokens or session data)
 */
class SelectivePersistenceCubit extends Cubit<SelectiveState> {
  // Store full user data in memory, but only persist id/name
  private fullUserData: UserData | null = null;

  static plugins = [
    new PersistencePlugin<SelectiveState>({
      key: 'playgroundSelectiveState',
      // Only persist certain fields
      select: (state) => ({
        theme: state.theme,
        language: state.language,
        user: state.user
          ? {
              id: state.user.id,
              name: state.user.name,
              // Exclude token and lastSeen
            }
          : null,
      }),
      // Merge persisted data with default state
      merge: (persisted, current) => ({
        ...current,
        theme: persisted.theme || current.theme,
        language: persisted.language || current.language,
        user: persisted.user
          ? {
              id: persisted.user.id,
              name: persisted.user.name,
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

  setLoading = (isLoading: boolean) => {
    this.patch({ isLoading });
  };

  setCurrentTab = (currentTab: string) => {
    this.patch({ currentTab });
  };

  login = (id: string, name: string, token: string) => {
    // Store full data in memory
    this.fullUserData = {
      id,
      name,
      token,
      lastSeen: new Date(),
    };
    // Only persist id and name
    this.patch({
      user: {
        id,
        name,
      },
    });
  };

  updateLastSeen = () => {
    if (this.fullUserData) {
      this.fullUserData.lastSeen = new Date();
    }
  };

  logout = () => {
    this.fullUserData = null;
    this.patch({ user: null });
  };

  get userToken(): string | undefined {
    return this.fullUserData?.token;
  }

  get lastSeen(): Date | undefined {
    return this.fullUserData?.lastSeen;
  }
}

/**
 * Interactive Persistence demo component
 * Shows basic and selective persistence side by side
 */
export function PersistenceInteractive() {
  const [activeTab, setActiveTab] = useState<'basic' | 'selective'>('basic');
  const [settingsState, settings] = useBloc(PersistentSettingsCubit);
  const [selectiveState, selective] = useBloc(SelectivePersistenceCubit);

  return (
    <div className="my-8 space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('basic')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'basic'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Database className="inline-block mr-2 w-4 h-4" />
            Basic Persistence
          </button>
          <button
            onClick={() => setActiveTab('selective')}
            className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'selective'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Save className="inline-block mr-2 w-4 h-4" />
            Selective Persistence
          </button>
        </nav>
      </div>

      {/* Basic Persistence Tab */}
      {activeTab === 'basic' && (
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-3xl border-2 border-blue-400 dark:border-blue-600 bg-surface px-6 py-6 shadow-subtle">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-cyan-500/5 opacity-90" />
            <div className="relative space-y-6">
              <h4 className="font-semibold text-blue-700 dark:text-blue-300">
                Basic Persistent Settings
              </h4>
              <p className="text-sm text-muted-foreground">
                Try changing the settings below. Every change is automatically saved to{' '}
                <code className="text-xs">localStorage</code> and will be restored when you
                reload the page.
              </p>

              {/* User Name Input */}
              <div>
                <label className="block text-sm font-medium mb-2">User Name:</label>
                <input
                  type="text"
                  value={settingsState.userName}
                  onChange={(e) => settings.setUserName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-surface
                    focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter your name"
                />
              </div>

              {/* Theme Toggle */}
              <div>
                <label className="block text-sm font-medium mb-2">Theme:</label>
                <Button
                  onClick={settings.toggleTheme}
                  variant="primary"
                  className="bg-gradient-to-r from-blue-500 to-blue-600"
                >
                  {settingsState.theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
                </Button>
              </div>

              {/* Font Size Slider */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Font Size: {settingsState.fontSize}px
                </label>
                <input
                  type="range"
                  min="12"
                  max="24"
                  value={settingsState.fontSize}
                  onChange={(e) => settings.setFontSize(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              {/* Notifications Toggle */}
              <div>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsState.notificationsEnabled}
                    onChange={(e) => settings.setNotifications(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium">Enable notifications</span>
                </label>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-border">
                <Button onClick={settings.resetToDefaults} variant="outline" size="sm">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset to Defaults
                </Button>
                <Button onClick={settings.clearPersistedData} variant="danger" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Storage
                </Button>
              </div>
            </div>
          </div>

          {/* State Viewer */}
          <StateViewer
            bloc={PersistentSettingsCubit}
            title="Current Persisted State"
            defaultCollapsed={false}
            maxDepth={2}
          />
        </div>
      )}

      {/* Selective Persistence Tab */}
      {activeTab === 'selective' && (
        <div className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Sometimes you want to persist only certain parts of your state. Session data,
            loading states, and sensitive information like tokens should{' '}
            <strong>not</strong> be saved to localStorage.
          </p>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Persisted Data Column */}
            <div className="relative overflow-hidden rounded-3xl border-2 border-green-400 dark:border-green-600 bg-surface px-6 py-6 shadow-subtle">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-emerald-500/5 opacity-90" />
              <div className="relative space-y-4">
                <h4 className="font-semibold text-green-700 dark:text-green-300 flex items-center">
                  <Save className="w-5 h-5 mr-2" />
                  Persisted Data
                </h4>

                {/* Theme */}
                <div>
                  <label className="block text-sm font-medium mb-2">Theme:</label>
                  <Button
                    onClick={() =>
                      selective.setTheme(selectiveState.theme === 'dark' ? 'light' : 'dark')
                    }
                    variant="primary"
                    className="bg-gradient-to-r from-green-500 to-emerald-600"
                  >
                    {selectiveState.theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
                  </Button>
                </div>

                {/* Language */}
                <div>
                  <label className="block text-sm font-medium mb-2">Language:</label>
                  <select
                    value={selectiveState.language}
                    onChange={(e) => selective.setLanguage(e.target.value)}
                    className="px-3 py-2 border border-border rounded-md bg-surface
                      focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                  </select>
                </div>

                {/* User (partial) */}
                {selectiveState.user && (
                  <div className="p-3 bg-surface-muted rounded border border-green-300 dark:border-green-600">
                    <strong className="text-sm">User (partial):</strong>
                    <div className="text-sm mt-1 text-muted-foreground">
                      ID: {selectiveState.user.id}
                      <br />
                      Name: {selectiveState.user.name}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Not Persisted Data Column */}
            <div className="relative overflow-hidden rounded-3xl border-2 border-red-400 dark:border-red-600 bg-surface px-6 py-6 shadow-subtle">
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-orange-500/5 opacity-90" />
              <div className="relative space-y-4">
                <h4 className="font-semibold text-red-700 dark:text-red-300 flex items-center">
                  <Trash2 className="w-5 h-5 mr-2" />
                  Not Persisted
                </h4>

                {/* Loading State */}
                <div>
                  <label className="block text-sm font-medium mb-2">Loading State:</label>
                  <Button
                    onClick={() => selective.setLoading(!selectiveState.isLoading)}
                    variant="primary"
                    className="bg-gradient-to-r from-red-500 to-orange-600"
                  >
                    {selectiveState.isLoading ? 'Loading...' : 'Not Loading'}
                  </Button>
                </div>

                {/* Current Tab */}
                <div>
                  <label className="block text-sm font-medium mb-2">Current Tab:</label>
                  <select
                    value={selectiveState.currentTab}
                    onChange={(e) => selective.setCurrentTab(e.target.value)}
                    className="px-3 py-2 border border-border rounded-md bg-surface
                      focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  >
                    <option value="home">Home</option>
                    <option value="profile">Profile</option>
                    <option value="settings">Settings</option>
                  </select>
                </div>

                {/* Sensitive User Data */}
                {selectiveState.user && (
                  <div className="p-3 bg-surface-muted rounded border border-red-300 dark:border-red-600">
                    <strong className="text-sm">Sensitive User Data:</strong>
                    <div className="text-sm mt-1 text-muted-foreground">
                      Token:{' '}
                      {selective.userToken
                        ? '***' + selective.userToken.slice(-4)
                        : 'None'}
                      <br />
                      Last Seen: {selective.lastSeen?.toLocaleTimeString() || 'Never'}
                    </div>
                    <Button
                      onClick={selective.updateLastSeen}
                      size="sm"
                      variant="outline"
                      className="mt-2"
                    >
                      Update Last Seen
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Login/Logout Button */}
          <div className="flex justify-center">
            {!selectiveState.user ? (
              <Button
                onClick={() =>
                  selective.login('user123', 'John Doe', 'secret-token-xyz')
                }
                variant="primary"
                className="bg-gradient-to-r from-blue-500 to-blue-600"
              >
                Simulate Login
              </Button>
            ) : (
              <Button onClick={selective.logout} variant="danger">
                Logout
              </Button>
            )}
          </div>

          {/* State Viewer */}
          <StateViewer
            bloc={SelectivePersistenceCubit}
            title="Full State (Selective Persistence)"
            defaultCollapsed={false}
            maxDepth={2}
          />
        </div>
      )}

      {/* Explanation Panel */}
      <div className="p-6 rounded-3xl border border-border bg-surface space-y-3">
        <h4 className="font-semibold">How Persistence Works</h4>
        <div className="text-sm text-muted-foreground space-y-2">
          {activeTab === 'basic' ? (
            <>
              <p>
                <strong className="text-foreground">Automatic saving:</strong> Every state
                change is automatically saved to <code className="text-xs">localStorage</code>{' '}
                after a 200ms debounce.
              </p>
              <p>
                <strong className="text-foreground">Automatic loading:</strong> When the Cubit
                is created, it automatically loads saved state from localStorage.
              </p>
              <p>
                <strong className="text-foreground">Try it:</strong> Change some settings,
                reload the page, and see them restored!
              </p>
            </>
          ) : (
            <>
              <p>
                <strong className="text-foreground">Selective persistence:</strong> Only theme
                and language are saved. User ID and name are saved, but token and lastSeen are
                not.
              </p>
              <p>
                <strong className="text-foreground">Security:</strong> Sensitive data like
                tokens stay in memory only and are never written to localStorage.
              </p>
              <p>
                <strong className="text-foreground">Session data:</strong> Loading state and
                current tab are not persisted because they're temporary UI state.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
