import type { User, Channel } from './types';

export const CURRENT_USER_ID = 'user-me';

export const MOCK_USERS: User[] = [
  {
    id: 'user-me',
    name: 'You',
    avatar: '👤',
    status: 'online',
    customStatus: 'Building with BlaC',
  },
  {
    id: 'bot-alice',
    name: 'Alice (Bot)',
    avatar: '🤖',
    status: 'online',
    customStatus: 'AI Assistant',
  },
  {
    id: 'bot-bob',
    name: 'Bob (Bot)',
    avatar: '🦾',
    status: 'away',
    customStatus: 'In a meeting',
  },
  {
    id: 'bot-charlie',
    name: 'Charlie (Bot)',
    avatar: '🚀',
    status: 'online',
    customStatus: 'Deploying to prod',
  },
];

export const MOCK_CHANNELS: Channel[] = [
  {
    id: 'general',
    name: 'general',
    description: 'Company-wide announcements and general chat',
    members: ['user-me', 'bot-alice', 'bot-bob', 'bot-charlie'],
    createdAt: Date.now() - 30 * 24 * 60 * 60 * 1000, // 30 days ago
  },
  {
    id: 'engineering',
    name: 'engineering',
    description: 'Engineering team discussions',
    members: ['user-me', 'bot-alice', 'bot-charlie'],
    createdAt: Date.now() - 15 * 24 * 60 * 60 * 1000, // 15 days ago
  },
  {
    id: 'random',
    name: 'random',
    description: 'Random stuff and off-topic chat',
    members: ['user-me', 'bot-bob', 'bot-charlie'],
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000, // 7 days ago
  },
  {
    id: 'blac-demo',
    name: 'blac-demo',
    description: 'Demonstrating BlaC state management',
    members: ['user-me', 'bot-alice', 'bot-bob'],
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
  },
];

/**
 * Get initial welcome messages for a channel
 */
export function getWelcomeMessages(channelId: string) {
  const welcomeMessages: Record<string, Array<{ userId: string; text: string }>> = {
    general: [
      {
        userId: 'bot-alice',
        text: 'Welcome to #general! This is where we share company-wide updates.',
      },
      {
        userId: 'bot-bob',
        text: 'Feel free to ask any questions here!',
      },
    ],
    engineering: [
      {
        userId: 'bot-charlie',
        text: 'Welcome to #engineering! Share your code, bugs, and victories here.',
      },
      {
        userId: 'bot-alice',
        text: "Don't forget to run the tests before pushing! 🧪",
      },
    ],
    random: [
      {
        userId: 'bot-bob',
        text: 'This is the random channel - anything goes! 🎉',
      },
    ],
    'blac-demo': [
      {
        userId: 'bot-alice',
        text: 'Welcome to the BlaC demo! Watch how messages update in real-time.',
      },
      {
        userId: 'bot-charlie',
        text: 'Notice how only the relevant components re-render thanks to dependency tracking!',
      },
      {
        userId: 'bot-bob',
        text: 'Try switching between channels - each one has its own isolated state.',
      },
    ],
  };

  return (welcomeMessages[channelId] || []).map((msg, index) => ({
    id: `welcome-${channelId}-${index}`,
    channelId,
    userId: msg.userId,
    text: msg.text,
    timestamp: Date.now() - (welcomeMessages[channelId]?.length || 0 - index) * 60000, // Spread over last few minutes
    status: 'delivered' as const,
  }));
}
