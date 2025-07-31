import { Cubit } from '@blac/core';
import {
  PersistencePlugin,
  InMemoryStorageAdapter,
} from '@blac/plugin-persistence';

interface UserProfileV2 {
  version: number;
  firstName: string;
  lastName: string;
  email: string;
  preferences: {
    theme: 'light' | 'dark';
    language: string;
    emailNotifications: boolean;
    pushNotifications: boolean;
  };
}

// Simulate old data structure (V1)
interface UserProfileV1 {
  name: string; // Combined first and last name
  email: string;
  darkMode: boolean; // Old theme preference
  emailAlerts: boolean; // Old notification preference
}

export class MigratedDataCubit extends Cubit<UserProfileV2> {
  // Using InMemoryStorageAdapter for demo to avoid conflicts
  private static storage = new InMemoryStorageAdapter();

  static plugins = [
    new PersistencePlugin<UserProfileV2>({
      key: 'userProfile-v2',
      storage: MigratedDataCubit.storage,
      version: 2,
      migrations: [
        {
          from: 'userProfile-v1',
          transform: (oldData: UserProfileV1): UserProfileV2 => {
            // Split name into first and last
            const [firstName = '', lastName = ''] = oldData.name.split(' ');

            return {
              version: 2,
              firstName,
              lastName,
              email: oldData.email,
              preferences: {
                theme: oldData.darkMode ? 'dark' : 'light',
                language: 'en', // Default value for new field
                emailNotifications: oldData.emailAlerts,
                pushNotifications: false, // Default value for new field
              },
            };
          },
        },
      ],
      onError: (error, operation) => {
        console.error(`Migration ${operation} failed:`, error);
      },
    }),
  ];

  constructor() {
    super({
      version: 2,
      firstName: '',
      lastName: '',
      email: '',
      preferences: {
        theme: 'light',
        language: 'en',
        emailNotifications: true,
        pushNotifications: false,
      },
    });
  }

  // Simulate loading old data
  static simulateOldData() {
    const oldData: UserProfileV1 = {
      name: 'John Doe',
      email: 'john.doe@example.com',
      darkMode: true,
      emailAlerts: false,
    };

    // Store old data with old key
    this.storage.setItem('userProfile-v1', JSON.stringify(oldData));
  }

  updateName = (firstName: string, lastName: string) => {
    this.patch({ firstName, lastName });
  };

  updateEmail = (email: string) => {
    this.patch({ email });
  };

  updatePreferences = (preferences: Partial<UserProfileV2['preferences']>) => {
    this.patch({
      preferences: { ...this.state.preferences, ...preferences },
    });
  };
}
