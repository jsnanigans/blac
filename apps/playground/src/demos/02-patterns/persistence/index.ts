import { DemoRegistry } from '@/core/utils/demoRegistry';
import { PersistenceDemo } from './PersistenceDemo';
// Inline actual source for code viewer and playground export
// eslint-disable-next-line import/no-unused-modules

// Read the source code
const demoCode = `import React, { useState } from 'react';
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
        console.error(\`Persistence \${operation} failed:\`, error);
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
    const plugin = (this._plugins as any).get('persistence') as PersistencePlugin<SettingsState>;
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

  // ... methods
}

// Demo Component
export const PersistenceDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'basic' | 'selective'>('basic');
  const [settingsState, settings] = useBloc(PersistentSettingsCubit);
  const [selectiveState, selective] = useBloc(SelectivePersistenceCubit);

  return (
    <div className="space-y-6">
      {/* Tab navigation */}
      {/* Basic persistence tab */}
      {/* Selective persistence tab */}
      {/* Features list */}
    </div>
  );
};`;

const testCode = `import { describe, it, expect, beforeEach } from 'vitest';
import { PersistentSettingsCubit, SelectivePersistenceCubit } from './PersistenceDemo';

describe('PersistenceDemo', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('PersistentSettingsCubit', () => {
    it('should persist state to localStorage', async () => {
      const cubit = new PersistentSettingsCubit();
      
      // Change state
      cubit.setUserName('John Doe');
      cubit.toggleTheme();
      
      // Wait for debounced save
      await new Promise(resolve => setTimeout(resolve, 250));
      
      // Check localStorage
      const stored = localStorage.getItem('playgroundSettings');
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.userName).toBe('John Doe');
      expect(parsed.theme).toBe('dark');
    });

    it('should restore state from localStorage', async () => {
      // Set initial data
      localStorage.setItem('playgroundSettings', JSON.stringify({
        theme: 'dark',
        notificationsEnabled: false,
        userName: 'Jane Doe'
      }));
      
      // Create new cubit - should restore from storage
      const cubit = new PersistentSettingsCubit();
      
      // Wait for async restoration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(cubit.state.userName).toBe('Jane Doe');
      expect(cubit.state.theme).toBe('dark');
      expect(cubit.state.notificationsEnabled).toBe(false);
    });

    it('should clear persisted data', async () => {
      const cubit = new PersistentSettingsCubit();
      cubit.setUserName('Test User');
      
      // Wait for save
      await new Promise(resolve => setTimeout(resolve, 250));
      expect(localStorage.getItem('playgroundSettings')).toBeTruthy();
      
      // Clear data
      await cubit.clearPersistedData();
      expect(localStorage.getItem('playgroundSettings')).toBeNull();
    });
  });

  describe('SelectivePersistenceCubit', () => {
    it('should only persist selected fields', async () => {
      const cubit = new SelectivePersistenceCubit();
      
      // Set various state properties
      cubit.setTheme('dark');
      cubit.setLanguage('es');
      cubit.setLoading(true);
      cubit.setCurrentTab('profile');
      cubit.login('user123', 'John', 'secret-token');
      
      // Wait for save
      await new Promise(resolve => setTimeout(resolve, 250));
      
      const stored = localStorage.getItem('playgroundSelectiveState');
      const parsed = JSON.parse(stored!);
      
      // Check persisted fields
      expect(parsed.theme).toBe('dark');
      expect(parsed.language).toBe('es');
      expect(parsed.user.id).toBe('user123');
      expect(parsed.user.name).toBe('John');
      
      // Check non-persisted fields are not saved
      expect(parsed.isLoading).toBeUndefined();
      expect(parsed.currentTab).toBeUndefined();
      expect(parsed.user.token).toBeUndefined();
    });

    it('should merge persisted data with defaults', async () => {
      // Set partial data
      localStorage.setItem('playgroundSelectiveState', JSON.stringify({
        theme: 'dark',
        language: 'fr'
      }));
      
      const cubit = new SelectivePersistenceCubit();
      
      // Wait for restoration
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check merged state
      expect(cubit.state.theme).toBe('dark');
      expect(cubit.state.language).toBe('fr');
      expect(cubit.state.fontSize).toBe(16); // Default
      expect(cubit.state.isLoading).toBe(false); // Default
      expect(cubit.state.currentTab).toBe('home'); // Default
    });
  });
});`;

DemoRegistry.register({
  id: 'persistence',
  title: 'Persistence Plugin',
  description:
    'Automatic state persistence with localStorage, selective persistence, and data migration',
  category: '02-patterns',
  difficulty: 'intermediate',
  tags: ['persistence', 'localStorage', 'plugins', 'state-management'],
  concepts: [
    'Automatic state persistence to localStorage',
    'Selective persistence (choose what to save)',
    'Debounced saves for performance',
    'Version tracking and data migration',
    'Error handling and recovery',
    'Multiple storage adapters support',
  ],
  component: PersistenceDemo,
  code: {
    demo: '',
  },
  prerequisites: ['keep-alive', 'props'],
  relatedDemos: ['keep-alive', 'props'],
});
