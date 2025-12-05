/**
 * Debug logging utility for DevTools UI
 *
 * Controlled by localStorage flag: BLAC_DEVTOOLS_DEBUG
 *
 * Usage:
 *   localStorage.setItem('BLAC_DEVTOOLS_DEBUG', 'true')
 *   // or in browser console:
 *   window.__BLAC_DEVTOOLS_DEBUG__ = true
 */

const isDebugEnabled = (): boolean => {
  if (typeof window === 'undefined') return false;

  // Check global flag first (for runtime toggling)
  if ((window as any).__BLAC_DEVTOOLS_DEBUG__) return true;

  // Check localStorage
  try {
    return localStorage.getItem('BLAC_DEVTOOLS_DEBUG') === 'true';
  } catch {
    return false;
  }
};

export const debug = {
  log: (...args: unknown[]): void => {
    if (isDebugEnabled()) {
      console.log('[DevTools]', ...args);
    }
  },

  warn: (...args: unknown[]): void => {
    if (isDebugEnabled()) {
      console.warn('[DevTools]', ...args);
    }
  },

  error: (...args: unknown[]): void => {
    // Always log errors
    console.error('[DevTools]', ...args);
  },

  group: (label: string): void => {
    if (isDebugEnabled()) {
      console.group(`[DevTools] ${label}`);
    }
  },

  groupEnd: (): void => {
    if (isDebugEnabled()) {
      console.groupEnd();
    }
  },
};
