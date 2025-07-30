import { Cubit } from '@blac/core';
import { PersistencePlugin } from '@blac/plugin-persistence';

interface SecureSettings {
  apiKey: string;
  secretToken: string;
  userId: string;
}

// Simple encryption/decryption for demo purposes
// In production, use a proper encryption library
const simpleEncrypt = (text: string): string => {
  return btoa(text); // Base64 encode for demo
};

const simpleDecrypt = (encoded: string): string => {
  return atob(encoded); // Base64 decode for demo
};

export class EncryptedSettingsCubit extends Cubit<SecureSettings> {
  static plugins = [
    new PersistencePlugin<SecureSettings>({
      key: 'encryptedSettings',
      // Custom serialization with encryption
      serialize: (state) => {
        const encrypted = simpleEncrypt(JSON.stringify(state));
        return encrypted;
      },
      deserialize: (data) => {
        try {
          const decrypted = simpleDecrypt(data);
          return JSON.parse(decrypted);
        } catch {
          // Return default if decryption fails
          return {
            apiKey: '',
            secretToken: '',
            userId: '',
          };
        }
      },
      onError: (error, operation) => {
        console.error(`Encrypted persistence ${operation} failed:`, error);
      },
    }),
  ];

  constructor() {
    super({
      apiKey: '',
      secretToken: '',
      userId: '',
    });
  }

  setApiKey = (apiKey: string) => {
    this.patch({ apiKey });
  };

  setSecretToken = (token: string) => {
    this.patch({ secretToken: token });
  };

  setUserId = (userId: string) => {
    this.patch({ userId });
  };

  clearSecrets = () => {
    this.emit({
      apiKey: '',
      secretToken: '',
      userId: '',
    });
  };
}