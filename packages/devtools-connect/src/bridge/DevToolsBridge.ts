import type {
  DevToolsMessage,
  WindowMessage,
  DevToolsMessageType,
} from '../protocol/messages';
import type { DevToolsStateManager } from '../state/DevToolsStateManager';

// Keep old types for backward compatibility (used by ReduxDevToolsAdapter)
import type { DevToolsCommand } from './types';

const MAX_MESSAGE_SIZE = 10_000_000;
const MAX_MESSAGES_PER_SECOND = 100;

export interface DevToolsBridgeConfig {
  enabled: boolean;
  maxMessageSize?: number;
  maxMessagesPerSecond?: number;
  stateManager?: DevToolsStateManager;
}

export class DevToolsBridge {
  private isConnected = false;
  private rateLimitCounter = 0;
  private rateLimitWindow = 1000;
  private maxMessagesPerSecond: number;
  private maxMessageSize: number;
  private stateManager?: DevToolsStateManager;
  private commandHandlers: Map<string, (command: DevToolsCommand) => void> =
    new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private lastHeartbeat = Date.now();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private connectedSince = 0;
  private rateLimitResetInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config: DevToolsBridgeConfig) {
    this.maxMessagesPerSecond =
      config.maxMessagesPerSecond ?? MAX_MESSAGES_PER_SECOND;
    this.maxMessageSize = config.maxMessageSize ?? MAX_MESSAGE_SIZE;
    this.stateManager = config.stateManager;

    if (!config.enabled || typeof window === 'undefined') {
      return;
    }

    this.isConnected = this.checkConnection();

    if (this.isConnected) {
      this.connectedSince = Date.now();
      this.setupListeners();
      this.startRateLimitReset();
      // Heartbeat disabled for now to reduce noise
      // this.startHeartbeat();
    }
  }

  private checkConnection(): boolean {
    return !!(window as any).__BLAC_DEVTOOLS__;
  }

  send(message: DevToolsMessage): void {
    if (!this.isConnected) return;

    if (this.rateLimitCounter >= this.maxMessagesPerSecond) {
      console.warn('[BlaC DevTools] Rate limit exceeded, dropping message');
      return;
    }

    const serialized = JSON.stringify(message);
    if (serialized.length > this.maxMessageSize) {
      console.error(
        `[BlaC DevTools] Message too large: ${serialized.length} bytes`,
      );
      return;
    }

    this.rateLimitCounter++;

    const windowMessage: WindowMessage = {
      source: 'blac-devtools-app',
      payload: message,
    };

    window.postMessage(windowMessage, window.location.origin);
  }

  onCommand(
    commandType: DevToolsCommand['type'],
    handler: (command: DevToolsCommand) => void,
  ): void {
    this.commandHandlers.set(commandType, handler);
  }

  private setupListeners(): void {
    window.addEventListener('message', (event: MessageEvent) => {
      if (event.source !== window) return;
      if (event.origin !== window.location.origin) return;

      const data = event.data as WindowMessage;
      if (!data || typeof data !== 'object') return;
      if (data.source !== 'blac-devtools-extension') return;

      const message = data.payload;

      // Update heartbeat timestamp on any message
      this.lastHeartbeat = Date.now();

      // Handle PANEL_CONNECT - send full state dump
      if (message.type === DevToolsMessageType.PANEL_CONNECT) {
        this.handlePanelConnect(message);
        return;
      }

      // Handle legacy commands (for backward compatibility with ReduxDevToolsAdapter)
      const command = message as DevToolsCommand;

      // Handle heartbeat acknowledgment
      if (command.type === 'HEARTBEAT_ACK') {
        this.reconnectAttempts = 0;
        return;
      }

      this.handleCommand(command);
    });

    // Listen for visibility changes to check connection
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !this.isConnected) {
        this.attemptReconnect();
      }
    });
  }

  private startHeartbeat(): void {
    // Send heartbeat every 5 seconds
    this.heartbeatInterval = setInterval(() => {
      if (!this.isConnected) return;

      this.send({
        type: 'HEARTBEAT',
        payload: {
          timestamp: Date.now(),
          connectedSince: this.connectedSince,
        },
      });

      // Check if we've received a heartbeat response recently
      const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat;
      if (timeSinceLastHeartbeat > 15000) {
        console.warn(
          '[BlaC DevTools] Heartbeat timeout, connection may be lost',
        );
        this.attemptReconnect();
      }
    }, 5000);
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(
        '[BlaC DevTools] Max reconnection attempts reached. DevTools may need to be reloaded.',
      );
      this.isConnected = false;
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * this.reconnectAttempts;

    setTimeout(() => {
      const wasConnected = this.isConnected;
      this.isConnected = this.checkConnection();

      if (this.isConnected && !wasConnected) {
        this.reconnectAttempts = 0;
        this.connectedSince = Date.now();

        this.send({
          type: 'RECONNECTED',
          payload: {
            timestamp: Date.now(),
            requestStateSync: true,
          },
        });
      } else if (!this.isConnected) {
        this.attemptReconnect();
      }
    }, delay);
  }

  private handleCommand(command: DevToolsCommand): void {
    const handler = this.commandHandlers.get(command.type);
    if (handler) {
      try {
        handler(command);
      } catch (error) {
        console.error(
          `[BlaC DevTools] Error handling command ${command.type}:`,
          error,
        );
      }
    }
  }

  private handlePanelConnect(message: DevToolsMessage): void {
    if (message.type !== DevToolsMessageType.PANEL_CONNECT) return;

    if (!this.stateManager) {
      console.warn(
        '[DevToolsBridge] No state manager configured, cannot send full state dump',
      );
      return;
    }

    // Get full state from state manager
    const fullState = this.stateManager.getFullState();

    // Send FULL_STATE_DUMP to the connecting panel
    this.send({
      type: DevToolsMessageType.FULL_STATE_DUMP,
      payload: fullState,
    });
  }

  private startRateLimitReset(): void {
    this.rateLimitResetInterval = setInterval(() => {
      this.rateLimitCounter = 0;
    }, this.rateLimitWindow);
  }

  disconnect(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.rateLimitResetInterval) {
      clearInterval(this.rateLimitResetInterval);
      this.rateLimitResetInterval = null;
    }

    this.isConnected = false;
    this.commandHandlers.clear();
  }

  getConnectionStatus(): {
    isConnected: boolean;
    connectedSince: number;
    lastHeartbeat: number;
    reconnectAttempts: number;
  } {
    return {
      isConnected: this.isConnected,
      connectedSince: this.connectedSince,
      lastHeartbeat: this.lastHeartbeat,
      reconnectAttempts: this.reconnectAttempts,
    };
  }
}
