import React, { useState } from 'react';
import { useBloc } from '@blac/react';
import { PersistentSettingsCubit } from '../blocs/PersistentSettingsCubit';
import { EncryptedSettingsCubit } from '../blocs/EncryptedSettingsCubit';
import { MigratedDataCubit } from '../blocs/MigratedDataCubit';
import { SelectivePersistenceCubit } from '../blocs/SelectivePersistenceCubit';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Label } from './ui/Label';

const PersistenceDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'basic' | 'encrypted' | 'migration' | 'selective'
  >('basic');
  const [settingsState, settings] = useBloc(PersistentSettingsCubit);
  const [encryptedState, encrypted] = useBloc(EncryptedSettingsCubit);
  const [migratedState, migrated] = useBloc(MigratedDataCubit);
  const [selectiveState, selective] = useBloc(SelectivePersistenceCubit);

  const tabStyle = (isActive: boolean) => ({
    padding: '0.5rem 1rem',
    backgroundColor: isActive ? '#007bff' : '#f0f0f0',
    color: isActive ? 'white' : 'black',
    border: 'none',
    cursor: 'pointer',
    marginRight: '0.5rem',
    borderRadius: '4px 4px 0 0',
  });

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <button
          style={tabStyle(activeTab === 'basic')}
          onClick={() => setActiveTab('basic')}
        >
          Basic Persistence
        </button>
        <button
          style={tabStyle(activeTab === 'encrypted')}
          onClick={() => setActiveTab('encrypted')}
        >
          Encrypted Storage
        </button>
        <button
          style={tabStyle(activeTab === 'migration')}
          onClick={() => setActiveTab('migration')}
        >
          Data Migration
        </button>
        <button
          style={tabStyle(activeTab === 'selective')}
          onClick={() => setActiveTab('selective')}
        >
          Selective Persistence
        </button>
      </div>

      {activeTab === 'basic' && (
        <Card>
          <h3>Basic Persistent Settings</h3>
          <p style={{ marginBottom: '1rem', color: '#666' }}>
            Settings are automatically saved to localStorage and restored on
            page reload.
          </p>

          <div style={{ marginBottom: '1rem' }}>
            <Label htmlFor="userName">User Name:</Label>
            <Input
              id="userName"
              type="text"
              value={settingsState.userName}
              onChange={(e) => settings.setUserName(e.target.value)}
              placeholder="Enter your name"
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <Label htmlFor="theme">Theme:</Label>
            <Button
              onClick={settings.toggleTheme}
              style={{
                marginLeft: '0.5rem',
                backgroundColor:
                  settingsState.theme === 'dark' ? '#333' : '#f0f0f0',
                color: settingsState.theme === 'dark' ? '#fff' : '#000',
              }}
            >
              {settingsState.theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
            </Button>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <Label>
              <input
                type="checkbox"
                checked={settingsState.notificationsEnabled}
                onChange={(e) => settings.setNotifications(e.target.checked)}
              />{' '}
              Enable notifications
            </Label>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <Button onClick={settings.resetToDefaults}>
              Reset to Defaults
            </Button>
            <Button
              onClick={settings.clearPersistedData}
              style={{ backgroundColor: '#e74c3c', color: 'white' }}
            >
              Clear Storage
            </Button>
          </div>

          <div
            style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}
          >
            <strong>localStorage key:</strong> <code>demoAppSettings</code>
            <br />
            <strong>Current State:</strong>
            <pre style={{ margin: '0.5rem 0 0 0' }}>
              {JSON.stringify(settingsState, null, 2)}
            </pre>
          </div>
        </Card>
      )}

      {activeTab === 'encrypted' && (
        <Card>
          <h3>Encrypted Storage</h3>
          <p style={{ marginBottom: '1rem', color: '#666' }}>
            Sensitive data is encrypted before being saved to localStorage.
          </p>

          <div style={{ marginBottom: '1rem' }}>
            <Label htmlFor="apiKey">API Key:</Label>
            <Input
              id="apiKey"
              type="password"
              value={encryptedState.apiKey}
              onChange={(e) => encrypted.setApiKey(e.target.value)}
              placeholder="Enter API key"
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <Label htmlFor="secretToken">Secret Token:</Label>
            <Input
              id="secretToken"
              type="password"
              value={encryptedState.secretToken}
              onChange={(e) => encrypted.setSecretToken(e.target.value)}
              placeholder="Enter secret token"
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <Label htmlFor="userId">User ID:</Label>
            <Input
              id="userId"
              type="text"
              value={encryptedState.userId}
              onChange={(e) => encrypted.setUserId(e.target.value)}
              placeholder="Enter user ID"
            />
          </div>

          <Button
            onClick={encrypted.clearSecrets}
            style={{ backgroundColor: '#e74c3c', color: 'white' }}
          >
            Clear All Secrets
          </Button>

          <div
            style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}
          >
            <strong>Note:</strong> Data is encrypted using Base64 encoding for
            demo purposes.
            <br />
            In production, use a proper encryption library!
            <br />
            <br />
            <strong>localStorage key:</strong> <code>encryptedSettings</code>
            <br />
            <strong>Raw stored value:</strong>
            <pre style={{ margin: '0.5rem 0 0 0', wordBreak: 'break-all' }}>
              {typeof window !== 'undefined' &&
                window.localStorage.getItem('encryptedSettings')}
            </pre>
          </div>
        </Card>
      )}

      {activeTab === 'migration' && (
        <Card>
          <h3>Data Migration</h3>
          <p style={{ marginBottom: '1rem', color: '#666' }}>
            Demonstrates automatic data migration from v1 to v2 format. The
            persistence plugin automatically detects old data formats and
            transforms them to the new structure, ensuring backwards
            compatibility when you update your state shape.
          </p>

          <div style={{ marginBottom: '1rem' }}>
            <Button
              onClick={() => {
                MigratedDataCubit.simulateOldData();
                window.location.reload();
              }}
              style={{ backgroundColor: '#27ae60', color: 'white' }}
            >
              Simulate Old Data & Reload
            </Button>
            <span
              style={{
                marginLeft: '1rem',
                fontSize: '0.875rem',
                color: '#666',
              }}
            >
              (This will create v1 data and reload to trigger migration)
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
            }}
          >
            <div>
              <Label>First Name:</Label>
              <Input
                type="text"
                value={migratedState.firstName}
                onChange={(e) =>
                  migrated.updateName(e.target.value, migratedState.lastName)
                }
              />
            </div>
            <div>
              <Label>Last Name:</Label>
              <Input
                type="text"
                value={migratedState.lastName}
                onChange={(e) =>
                  migrated.updateName(migratedState.firstName, e.target.value)
                }
              />
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <Label>Email:</Label>
            <Input
              type="email"
              value={migratedState.email}
              onChange={(e) => migrated.updateEmail(e.target.value)}
            />
          </div>

          <div style={{ marginTop: '1rem' }}>
            <h4>Preferences:</h4>
            <Label>
              <input
                type="checkbox"
                checked={migratedState.preferences.theme === 'dark'}
                onChange={(e) =>
                  migrated.updatePreferences({
                    theme: e.target.checked ? 'dark' : 'light',
                  })
                }
              />{' '}
              Dark Theme
            </Label>
            <br />
            <Label>
              <input
                type="checkbox"
                checked={migratedState.preferences.emailNotifications}
                onChange={(e) =>
                  migrated.updatePreferences({
                    emailNotifications: e.target.checked,
                  })
                }
              />{' '}
              Email Notifications
            </Label>
          </div>

          <div
            style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}
          >
            <strong>Migration Info:</strong>
            <br />• <strong>Old format (v1):</strong> Combined "name" field,
            darkMode as boolean
            <br />• <strong>New format (v2):</strong> Separate
            firstName/lastName, theme as string ('dark'/'light'), added language
            & push notifications preferences
            <br />• <strong>How it works:</strong> The migration config
            specifies the old storage key and a transform function that converts
            the old data structure to the new format
            <br />• <strong>Automatic:</strong> Migration happens automatically
            on first load when old data is detected
            <br />
            <br />
            <strong>Current State (v{migratedState.version}):</strong>
            <pre style={{ margin: '0.5rem 0 0 0' }}>
              {JSON.stringify(migratedState, null, 2)}
            </pre>
          </div>
        </Card>
      )}

      {activeTab === 'selective' && (
        <Card>
          <h3>Selective Persistence</h3>
          <p style={{ marginBottom: '1rem', color: '#666' }}>
            Only certain parts of the state are persisted. Session data and
            sensitive info are excluded.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '2rem',
            }}
          >
            <div>
              <h4>Persisted Data ✅</h4>

              <div style={{ marginBottom: '1rem' }}>
                <Label>Theme:</Label>
                <Button
                  onClick={() =>
                    selective.setTheme(
                      selectiveState.theme === 'dark' ? 'light' : 'dark',
                    )
                  }
                  style={{
                    marginLeft: '0.5rem',
                    backgroundColor:
                      selectiveState.theme === 'dark' ? '#333' : '#f0f0f0',
                    color: selectiveState.theme === 'dark' ? '#fff' : '#000',
                  }}
                >
                  {selectiveState.theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
                </Button>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <Label>Language:</Label>
                <select
                  value={selectiveState.language}
                  onChange={(e) => selective.setLanguage(e.target.value)}
                  style={{ marginLeft: '0.5rem', padding: '0.25rem' }}
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <Label>Font Size:</Label>
                <input
                  type="range"
                  min="12"
                  max="24"
                  value={selectiveState.fontSize}
                  onChange={(e) =>
                    selective.setFontSize(Number(e.target.value))
                  }
                  style={{ marginLeft: '0.5rem', width: '100px' }}
                />
                <span style={{ marginLeft: '0.5rem' }}>
                  {selectiveState.fontSize}px
                </span>
              </div>

              {selectiveState.user && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong>User (partial):</strong>
                  <div style={{ marginLeft: '1rem', fontSize: '0.9rem' }}>
                    ID: {selectiveState.user.id}
                    <br />
                    Name: {selectiveState.user.name}
                  </div>
                </div>
              )}
            </div>

            <div>
              <h4>Not Persisted ❌</h4>

              <div style={{ marginBottom: '1rem' }}>
                <Label>Loading State:</Label>
                <Button
                  onClick={() =>
                    selective.setLoading(!selectiveState.isLoading)
                  }
                  style={{ marginLeft: '0.5rem' }}
                >
                  {selectiveState.isLoading ? 'Loading...' : 'Not Loading'}
                </Button>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <Label>Current Tab:</Label>
                <select
                  value={selectiveState.currentTab}
                  onChange={(e) => selective.setCurrentTab(e.target.value)}
                  style={{ marginLeft: '0.5rem', padding: '0.25rem' }}
                >
                  <option value="home">Home</option>
                  <option value="profile">Profile</option>
                  <option value="settings">Settings</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <Button
                  onClick={() =>
                    selective.showMessage('This message will disappear!')
                  }
                >
                  Show Temporary Message
                </Button>
                {selectiveState.temporaryMessage && (
                  <div
                    style={{
                      marginTop: '0.5rem',
                      padding: '0.5rem',
                      backgroundColor: '#ffd700',
                      borderRadius: '4px',
                    }}
                  >
                    {selectiveState.temporaryMessage}
                  </div>
                )}
              </div>

              {selectiveState.user && (
                <div style={{ marginBottom: '1rem' }}>
                  <strong>Sensitive User Data:</strong>
                  <div style={{ marginLeft: '1rem', fontSize: '0.9rem' }}>
                    Token:{' '}
                    {selectiveState.user.token
                      ? '***' + selectiveState.user.token.slice(-4)
                      : 'None'}
                    <br />
                    Last Seen:{' '}
                    {selectiveState.user.lastSeen?.toLocaleTimeString() ||
                      'Never'}
                  </div>
                  <Button
                    onClick={selective.updateLastSeen}
                    style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}
                  >
                    Update Last Seen
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              marginTop: '1rem',
              borderTop: '1px solid #ddd',
              paddingTop: '1rem',
            }}
          >
            {!selectiveState.user ? (
              <Button
                onClick={() =>
                  selective.login('user123', 'John Doe', 'secret-token-xyz')
                }
                style={{ backgroundColor: '#27ae60', color: 'white' }}
              >
                Simulate Login
              </Button>
            ) : (
              <Button
                onClick={selective.logout}
                style={{ backgroundColor: '#e74c3c', color: 'white' }}
              >
                Logout
              </Button>
            )}
          </div>

          <div
            style={{
              marginTop: '1rem',
              padding: '1rem',
              backgroundColor: '#f5f5f5',
              borderRadius: '4px',
              fontSize: '0.875rem',
            }}
          >
            <strong>How it works:</strong>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.5rem' }}>
              <li>
                The <code>select</code> function returns only the data to
                persist
              </li>
              <li>
                The <code>merge</code> function combines persisted data with
                current state
              </li>
              <li>
                Session data (loading, current tab, messages) is never saved
              </li>
              <li>Sensitive data (tokens, computed values) is excluded</li>
            </ul>
            <br />
            <strong>localStorage key:</strong> <code>selectiveAppState</code>
            <br />
            <strong>Persisted State:</strong>
            <pre style={{ margin: '0.5rem 0 0 0' }}>
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
        </Card>
      )}

      <Card style={{ marginTop: '1rem' }}>
        <h3>Plugin Features Demonstrated</h3>
        <ul style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
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
            <strong>Custom Serialization:</strong> Encrypt/decrypt data before
            storage
          </li>
          <li>
            <strong>Data Migration:</strong> Automatically transform old data
            formats to new ones when storage keys or data structures change
          </li>
          <li>
            <strong>Version Support:</strong> Track data structure versions with
            metadata to handle compatibility
          </li>
          <li>
            <strong>Multiple Storage Adapters:</strong> localStorage,
            sessionStorage, in-memory, async
          </li>
          <li>
            <strong>Selective Persistence:</strong> Choose which parts of state
            to persist
          </li>
        </ul>
      </Card>
    </div>
  );
};

export default PersistenceDemo;
