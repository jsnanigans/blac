/**
 * Global type declarations for BlaC DevTools Extension
 */

import { InstanceMetadata } from '@blac/core';
import type {
  DevToolsCallback,
} from '@blac/devtools-connect';

/**
 * DevTools API exposed on window by the DevToolsBrowserPlugin
 */
interface BlacDevToolsAPI {
  /**
   * Get all current BlaC instances
   */
  getInstances(): InstanceMetadata[];

  /**
   * Subscribe to instance lifecycle events
   * @returns Unsubscribe function
   */
  subscribe(callback: DevToolsCallback): () => void;

  /**
   * Get the DevTools plugin version
   */
  getVersion(): string;

  /**
   * Check if DevTools is enabled
   */
  isEnabled(): boolean;
}

/**
 * Window message event types
 */
interface DevToolsWindowMessage {
  source: 'blac-devtools-inject' | 'blac-devtools-content' | 'blac-devtools-app';
  type?: string;
  payload?: any;
  [key: string]: any;
}

// Augment the global Window interface
declare global {
  interface Window {
    /**
     * BlaC DevTools API - exposed by DevToolsBrowserPlugin
     */
    __BLAC_DEVTOOLS__?: BlacDevToolsAPI;
  }

  interface WindowEventMap {
    message: MessageEvent<DevToolsWindowMessage>;
  }
}

export {};
