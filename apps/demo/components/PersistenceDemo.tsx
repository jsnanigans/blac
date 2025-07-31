import React, { useState } from 'react';
import { useBloc } from '@blac/react';
import { PersistentSettingsCubit } from '../blocs/PersistentSettingsCubit';
import { EncryptedSettingsCubit } from '../blocs/EncryptedSettingsCubit';
import { MigratedDataCubit } from '../blocs/MigratedDataCubit';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { Input } from './ui/Input';
import { Label } from './ui/Label';

const PersistenceDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'basic' | 'encrypted' | 'migration'
  >('basic');
  const settings = useBloc(PersistentSettingsCubit);
  const encrypted = useBloc(EncryptedSettingsCubit);
  const migrated = useBloc(MigratedDataCubit);

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
              value={settings.state.userName}
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
                  settings.state.theme === 'dark' ? '#333' : '#f0f0f0',
                color: settings.state.theme === 'dark' ? '#fff' : '#000',
              }}
            >
              {settings.state.theme === 'dark' ? '🌙 Dark' : '☀️ Light'}
            </Button>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <Label>
              <input
                type="checkbox"
                checked={settings.state.notificationsEnabled}
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
              {JSON.stringify(settings.state, null, 2)}
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
              value={encrypted.state.apiKey}
              onChange={(e) => encrypted.setApiKey(e.target.value)}
              placeholder="Enter API key"
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <Label htmlFor="secretToken">Secret Token:</Label>
            <Input
              id="secretToken"
              type="password"
              value={encrypted.state.secretToken}
              onChange={(e) => encrypted.setSecretToken(e.target.value)}
              placeholder="Enter secret token"
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <Label htmlFor="userId">User ID:</Label>
            <Input
              id="userId"
              type="text"
              value={encrypted.state.userId}
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
            Demonstrates automatic data migration from v1 to v2 format.
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
                value={migrated.state.firstName}
                onChange={(e) =>
                  migrated.updateName(e.target.value, migrated.state.lastName)
                }
              />
            </div>
            <div>
              <Label>Last Name:</Label>
              <Input
                type="text"
                value={migrated.state.lastName}
                onChange={(e) =>
                  migrated.updateName(migrated.state.firstName, e.target.value)
                }
              />
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <Label>Email:</Label>
            <Input
              type="email"
              value={migrated.state.email}
              onChange={(e) => migrated.updateEmail(e.target.value)}
            />
          </div>

          <div style={{ marginTop: '1rem' }}>
            <h4>Preferences:</h4>
            <Label>
              <input
                type="checkbox"
                checked={migrated.state.preferences.theme === 'dark'}
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
                checked={migrated.state.preferences.emailNotifications}
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
            <br />
            • Old format (v1): Combined name, darkMode boolean
            <br />
            • New format (v2): Separate first/last name, theme string, added
            language & push notifications
            <br />
            <br />
            <strong>Current State (v{migrated.state.version}):</strong>
            <pre style={{ margin: '0.5rem 0 0 0' }}>
              {JSON.stringify(migrated.state, null, 2)}
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
            <strong>Data Migration:</strong> Transform old data formats to new
            ones
          </li>
          <li>
            <strong>Version Support:</strong> Track data structure versions
          </li>
          <li>
            <strong>Multiple Storage Adapters:</strong> localStorage,
            sessionStorage, in-memory, async
          </li>
        </ul>
      </Card>
    </div>
  );
};

export default PersistenceDemo;
