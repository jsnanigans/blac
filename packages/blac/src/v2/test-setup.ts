/**
 * Test setup for v2 implementation
 */

import { expect } from 'vitest';

// Add custom matchers if needed
expect.extend({
  toBeDisposed(received: any) {
    const pass = received.isDisposed === true;
    return {
      pass,
      message: () =>
        pass
          ? expect.formatMessage('Expected ${received} not to be disposed')
          : expect.formatMessage('Expected ${received} to be disposed'),
    };
  },

  toHaveVersion(received: any, expected: number) {
    const pass = received.version === expected;
    return {
      pass,
      message: () =>
        pass
          ? expect.formatMessage(
              `Expected version not to be ${expected}, but got ${received.version}`
            )
          : expect.formatMessage(
              `Expected version to be ${expected}, but got ${received.version}`
            ),
    };
  },
});

// Declare custom matchers for TypeScript
declare global {
  namespace Vi {
    interface Assertion {
      toBeDisposed(): void;
      toHaveVersion(version: number): void;
    }
  }
}