import { DemoArticle } from '@/components/demo-article/DemoArticle';
import { ArticleSection } from '@/components/demo-article/ArticleSection';
import { Prose } from '@/components/demo-article/Prose';
import { CodePanel } from '@/components/demo-article/CodePanel';
import { ConceptCallout } from '@/components/shared/ConceptCallout';
import { StateViewer } from '@/components/shared/StateViewer';
import { Button } from '@/ui/Button';
import { Cubit } from '@blac/core';
import { PersistencePlugin } from '@blac/plugin-persistence';
import { useBloc } from '@blac/react';
import { motion } from 'framer-motion';
import { Database, Save, Trash2, RefreshCw } from 'lucide-react';
import React, { useState } from 'react';

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
    <DemoArticle
      metadata={{
        id: 'persistence',
        title: 'State Persistence',
        description: 'Learn how to automatically save and restore Bloc state across browser sessions using the Persistence Plugin',
        category: '02-patterns',
        difficulty: 'intermediate',
        tags: ['persistence', 'localStorage', 'plugins', 'cubit'],
        estimatedTime: 12,
      }}
    >
      <ArticleSection theme="cubit" id="introduction">
        <Prose>
          <h2>Automatic State Persistence</h2>
          <p>
            The <strong>Persistence Plugin</strong> makes it effortless to save and restore Bloc state across browser sessions.
            Whether you're building user preferences, shopping carts, or form drafts, this plugin handles all the complexity
            of localStorage integration for you.
          </p>
          <p>
            In this demo, you'll learn how to persist entire state objects automatically, selectively persist only certain
            fields, and exclude sensitive data from storage.
          </p>
        </Prose>

        <ConceptCallout type="tip" title="Why Use the Persistence Plugin?">
          <p>
            Instead of manually calling <code>localStorage.setItem()</code> and <code>getItem()</code> throughout your code,
            the plugin handles everything automatically with debouncing, error handling, and version tracking built-in.
          </p>
        </ConceptCallout>
      </ArticleSection>

      <ArticleSection theme="cubit" id="demo">
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('basic')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'basic'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
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
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              <Save className="inline-block mr-2 w-4 h-4" />
              Selective Persistence
            </button>
          </nav>
        </div>

        {activeTab === 'basic' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Prose>
              <h3>Basic Persistent Settings</h3>
              <p>
                Try changing the settings below. Every change is automatically saved to <code>localStorage</code> and
                will be restored when you reload the page or return later.
              </p>
            </Prose>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  User Name:
                </label>
                <input
                  type="text"
                  value={settingsState.userName}
                  onChange={(e) => settings.setUserName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                    bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                    focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Enter your name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Theme:
                </label>
                <Button
                  onClick={settings.toggleTheme}
                  variant="secondary"
                  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
                >
                  {settingsState.theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
                </Button>
              </div>

              <div>
                <label className="flex items-center space-x-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={settingsState.notificationsEnabled}
                    onChange={(e) => settings.setNotifications(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 transition-all"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    Enable notifications
                  </span>
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button onClick={settings.resetToDefaults} variant="muted">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reset to Defaults
                </Button>
                <Button onClick={settings.clearPersistedData} variant="danger">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Storage
                </Button>
              </div>
            </div>

            <div className="mt-6">
              <StateViewer
                bloc={PersistentSettingsCubit}
                title="Current Persisted State"
              />
            </div>
          </motion.div>
        )}

        {activeTab === 'selective' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Prose>
              <h3>Selective Persistence</h3>
              <p>
                Sometimes you want to persist only certain parts of your state. Session data, loading states, and
                sensitive information like tokens should <strong>not</strong> be saved to localStorage.
              </p>
            </Prose>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-700 rounded-lg p-6">
                <h4 className="font-semibold text-lg mb-4 text-green-700 dark:text-green-300 flex items-center">
                  <Save className="w-5 h-5 mr-2" />
                  Persisted Data
                </h4>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Theme:
                    </label>
                    <Button
                      onClick={() => selective.setTheme(selectiveState.theme === 'dark' ? 'light' : 'dark')}
                      variant="secondary"
                      className="bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700"
                    >
                      {selectiveState.theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
                    </Button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Language:
                    </label>
                    <select
                      value={selectiveState.language}
                      onChange={(e) => selective.setLanguage(e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                        bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                        focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    >
                      <option value="en">English</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                      <option value="de">Deutsch</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Font Size: {selectiveState.fontSize}px
                    </label>
                    <input
                      type="range"
                      min="12"
                      max="24"
                      value={selectiveState.fontSize}
                      onChange={(e) => selective.setFontSize(Number(e.target.value))}
                      className="w-full accent-green-600"
                    />
                  </div>

                  {selectiveState.user && (
                    <div className="p-3 bg-white dark:bg-gray-800 rounded border border-green-300 dark:border-green-600">
                      <strong className="text-sm text-gray-700 dark:text-gray-300">User (partial):</strong>
                      <div className="text-sm mt-1 text-gray-600 dark:text-gray-400">
                        ID: {selectiveState.user.id}
                        <br />
                        Name: {selectiveState.user.name}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-2 border-red-200 dark:border-red-700 rounded-lg p-6">
                <h4 className="font-semibold text-lg mb-4 text-red-700 dark:text-red-300 flex items-center">
                  <Trash2 className="w-5 h-5 mr-2" />
                  Not Persisted
                </h4>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Loading State:
                    </label>
                    <Button
                      onClick={() => selective.setLoading(!selectiveState.isLoading)}
                      variant="secondary"
                      className="bg-gradient-to-r from-red-500 to-orange-600 text-white hover:from-red-600 hover:to-orange-700"
                    >
                      {selectiveState.isLoading ? 'Loading...' : 'Not Loading'}
                    </Button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                      Current Tab:
                    </label>
                    <select
                      value={selectiveState.currentTab}
                      onChange={(e) => selective.setCurrentTab(e.target.value)}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md
                        bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                        focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    >
                      <option value="home">Home</option>
                      <option value="profile">Profile</option>
                      <option value="settings">Settings</option>
                    </select>
                  </div>

                  <div>
                    <Button
                      onClick={() => selective.showMessage('This message will disappear!')}
                      className="bg-gradient-to-r from-yellow-500 to-amber-600 text-white hover:from-yellow-600 hover:to-amber-700"
                    >
                      Show Temporary Message
                    </Button>
                    {selectiveState.temporaryMessage && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="mt-2 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded border border-yellow-300 dark:border-yellow-600 text-gray-800 dark:text-gray-200"
                      >
                        {selectiveState.temporaryMessage}
                      </motion.div>
                    )}
                  </div>

                  {selectiveState.user && (
                    <div className="p-3 bg-white dark:bg-gray-800 rounded border border-red-300 dark:border-red-600">
                      <strong className="text-sm text-gray-700 dark:text-gray-300">Sensitive User Data:</strong>
                      <div className="text-sm mt-1 text-gray-600 dark:text-gray-400">
                        Token:{' '}
                        {selectiveState.user.token
                          ? '***' + selectiveState.user.token.slice(-4)
                          : 'None'}
                        <br />
                        Last Seen:{' '}
                        {selectiveState.user.lastSeen?.toLocaleTimeString() || 'Never'}
                      </div>
                      <Button
                        onClick={selective.updateLastSeen}
                        size="sm"
                        variant="muted"
                        className="mt-2"
                      >
                        Update Last Seen
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              {!selectiveState.user ? (
                <Button
                  onClick={() => selective.login('user123', 'John Doe', 'secret-token-xyz')}
                  variant="primary"
                  className="bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700"
                >
                  Simulate Login
                </Button>
              ) : (
                <Button onClick={selective.logout} variant="danger">
                  Logout
                </Button>
              )}
            </div>

            <div className="mt-6">
              <StateViewer
                bloc={SelectivePersistenceCubit}
                title="Full State (Selective Persistence)"
              />
            </div>
          </motion.div>
        )}
      </ArticleSection>

      <ArticleSection theme="cubit" id="implementation">
        <Prose>
          <h2>Implementation: Basic Persistence</h2>
          <p>
            Adding persistence to a Cubit is as simple as attaching the <code>PersistencePlugin</code> to the
            <code>static plugins</code> array. The plugin handles everything automatically.
          </p>
        </Prose>

        <CodePanel
          code={`class PersistentSettingsCubit extends Cubit<SettingsState> {
  static plugins = [
    new PersistencePlugin<SettingsState>({
      key: 'playgroundSettings',     // localStorage key
      debounceMs: 200,                // Wait 200ms before saving
      onError: (error, operation) => {
        console.error(\`Persistence \${operation} failed:\`, error);
      },
      version: 1,                     // Track data structure version
    }),
  ];

  constructor() {
    super(initialSettings);           // Plugin auto-loads from storage
  }

  toggleTheme = () => {
    this.patch({ theme: this.state.theme === 'light' ? 'dark' : 'light' });
    // Plugin automatically saves after 200ms debounce
  };

  clearPersistedData = async () => {
    const plugin = this._plugins.get('persistence') as PersistencePlugin;
    if (plugin) {
      await plugin.clear();           // Manually clear storage
    }
  };
}`}
          language="typescript"
          highlightLines={[2, 4, 5, 9, 13, 17]}
          lineLabels={{
            2: 'Attach plugin to Cubit',
            4: 'Configure storage key',
            5: 'Debounce saves for performance',
            9: 'Version tracking for migrations',
            13: 'Auto-loads on construction',
            17: 'Auto-saves on state change',
          }}
        />

        <ConceptCallout type="tip" title="Debouncing Saves">
          <p>
            The <code>debounceMs</code> option prevents excessive writes to localStorage during rapid state changes.
            Set it to 200-500ms for optimal performance.
          </p>
        </ConceptCallout>
      </ArticleSection>

      <ArticleSection theme="cubit" id="selective">
        <Prose>
          <h2>Implementation: Selective Persistence</h2>
          <p>
            For more control, use the <code>select</code> and <code>merge</code> options to choose exactly what
            gets saved and how it's restored.
          </p>
        </Prose>

        <CodePanel
          code={`class SelectivePersistenceCubit extends Cubit<SelectiveState> {
  static plugins = [
    new PersistencePlugin<SelectiveState>({
      key: 'playgroundSelectiveState',

      // Choose what to persist
      select: (state) => ({
        theme: state.theme,
        language: state.language,
        fontSize: state.fontSize,
        user: state.user ? {
          id: state.user.id,
          name: state.user.name,
          // Exclude token and lastSeen
        } : null,
      }),

      // Merge persisted data with defaults
      merge: (persisted, current) => ({
        ...current,                     // Start with defaults
        theme: persisted.theme || current.theme,
        language: persisted.language || current.language,
        fontSize: persisted.fontSize || current.fontSize,
        user: persisted.user ? {
          ...persisted.user,
          token: undefined,             // Never restore token
          lastSeen: undefined,          // Never restore lastSeen
        } : null,
      }),
    }),
  ];
}`}
          language="typescript"
          highlightLines={[7, 11, 19, 26]}
          lineLabels={{
            7: 'Select only what to save',
            11: 'Exclude sensitive fields',
            19: 'Custom merge logic',
            26: 'Explicitly exclude fields',
          }}
        />

        <ConceptCallout type="warning" title="Security: Never Persist Sensitive Data">
          <p>
            <strong>Never</strong> persist authentication tokens, passwords, API keys, or personal identification
            information in localStorage. These should only exist in memory or secure cookies.
          </p>
        </ConceptCallout>
      </ArticleSection>

      <ArticleSection theme="cubit" id="key-takeaways">
        <Prose>
          <h2>Key Takeaways</h2>
        </Prose>

        <ConceptCallout type="success" title="What You've Learned">
          <ul className="space-y-2 text-sm">
            <li>
              <strong>Automatic Persistence:</strong> Attach <code>PersistencePlugin</code> to save state changes automatically
            </li>
            <li>
              <strong>Debouncing:</strong> Use <code>debounceMs</code> to batch rapid saves for performance
            </li>
            <li>
              <strong>Selective Persistence:</strong> Use <code>select</code> to choose what gets saved
            </li>
            <li>
              <strong>Custom Merging:</strong> Use <code>merge</code> to control how persisted data combines with defaults
            </li>
            <li>
              <strong>Security:</strong> Never persist sensitive data like tokens or passwords
            </li>
            <li>
              <strong>Version Tracking:</strong> Use <code>version</code> for data structure migrations
            </li>
            <li>
              <strong>Error Handling:</strong> Provide <code>onError</code> callback for graceful failures
            </li>
          </ul>
        </ConceptCallout>

        <ConceptCallout type="info" title="Try This Challenge">
          <p>
            Reload the page and notice how both tabs remember their state. Try clearing storage and see the state
            reset to defaults. This is how real applications maintain user preferences across sessions!
          </p>
        </ConceptCallout>
      </ArticleSection>
    </DemoArticle>
  );
};
