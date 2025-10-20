import type { LogTopic } from './types';

/**
 * All available log topics
 */
export const allLogTopics: LogTopic[] = [
  'lifecycle',
  'state',
  'subscriptions',
  'performance',
];

/**
 * Check if a topic is enabled in the configuration
 * @param topic - The topic to check
 * @param enabled - The configured enabled topics or 'all'
 * @returns true if the topic is enabled
 */
export const isTopicEnabled = (
  topic: LogTopic,
  enabled: LogTopic[] | 'all',
): boolean => {
  if (enabled === 'all') return true;
  return enabled.includes(topic);
};

/**
 * Parse topics from string or array
 * @param value - The value to parse
 * @returns Array of log topics
 */
export const parseTopics = (value: string | string[]): LogTopic[] => {
  const values = Array.isArray(value) ? value : [value];
  const topics: LogTopic[] = [];

  for (const v of values) {
    const normalized = v.toLowerCase().trim();
    if (allLogTopics.includes(normalized as LogTopic)) {
      topics.push(normalized as LogTopic);
    }
  }

  return topics;
};
