/**
 * Expose DevTools API globally for browser extension access
 *
 * This module exposes the BlaC DevTools API on the window object
 * for the browser extension to access instance data.
 */

import { devToolsAPI } from './DevToolsAPI';
import type { InstanceData, DevToolsEvent } from './DevToolsAPI';
// We'll get StateContainer lazily to avoid circular deps
let StateContainer: any = null;

declare global {
  interface Window {
    __BLAC_DEVTOOLS__?: {
      getInstances(): InstanceData[];
      subscribe(callback: (event: DevToolsEvent) => void): () => void;
      getVersion(): string;
      isEnabled(): boolean;
    };
  }
}

/**
 * Expose the DevTools API on the window object in development mode
 */
export function exposeDevToolsAPI(): void {
  // Only expose in development mode and in browser environments
  if (typeof window === 'undefined') return;

  // Check if we're in development mode
  const isDevelopment = typeof process !== 'undefined'
    ? process.env.NODE_ENV === 'development'
    : true; // Default to enabled in browser for now

  if (!isDevelopment) return;

  // Create the global API
  window.__BLAC_DEVTOOLS__ = {
    /**
     * Get all current instances
     */
    getInstances(): InstanceData[] {
      // Lazy load StateContainer to scan for instances
      if (!StateContainer) {
        try {
          StateContainer = require('../core/StateContainer').StateContainer;
          devToolsAPI.scanForInstances(StateContainer);
        } catch (e) {
          // StateContainer not available yet
        }
      }
      return devToolsAPI.getInstances();
    },

    /**
     * Subscribe to DevTools events
     */
    subscribe(callback: (event: DevToolsEvent) => void): () => void {
      return devToolsAPI.subscribe(callback);
    },

    /**
     * Get version information
     */
    getVersion(): string {
      return devToolsAPI.getVersion();
    },

    /**
     * Check if DevTools is enabled
     */
    isEnabled(): boolean {
      return devToolsAPI.enabled;
    },
  };

  // Log that DevTools API is available
  if (devToolsAPI.enabled) {
    console.log(
      '%c[BlaC DevTools] API exposed at window.__BLAC_DEVTOOLS__',
      'color: #4CAF50; font-weight: bold'
    );
  }
}

// Auto-expose when this module is imported
if (typeof window !== 'undefined') {
  // Use setTimeout to ensure this runs after all modules are loaded
  setTimeout(() => {
    exposeDevToolsAPI();
  }, 0);
}