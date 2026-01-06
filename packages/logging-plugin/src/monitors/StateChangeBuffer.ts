import type { InstanceMetadata } from '@blac/core';
import type { ResolvedConfig } from '../types';

interface BufferedStateChange {
  metadata: InstanceMetadata;
  initialState: unknown;
  finalState: unknown;
  changes: Array<{ previous: unknown; current: unknown; callstack?: string }>;
  firstTimestamp: number;
}

export class StateChangeBuffer {
  private buffer = new Map<string, BufferedStateChange>();
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private windowMs: number;
  private enabled: boolean;
  private onFlush: (
    metadata: InstanceMetadata,
    initialState: unknown,
    finalState: unknown,
    changes: Array<{ previous: unknown; current: unknown; callstack?: string }>,
  ) => void;

  constructor(
    config: ResolvedConfig,
    onFlush: (
      metadata: InstanceMetadata,
      initialState: unknown,
      finalState: unknown,
      changes: Array<{
        previous: unknown;
        current: unknown;
        callstack?: string;
      }>,
    ) => void,
  ) {
    this.windowMs = config.debounceWindowMs;
    this.enabled = config.debounceStateChanges;
    this.onFlush = onFlush;
  }

  add(
    metadata: InstanceMetadata,
    previousState: unknown,
    currentState: unknown,
    callstack: string | undefined,
  ): boolean {
    if (!this.enabled) {
      return false;
    }

    const key = metadata.id;
    const existing = this.buffer.get(key);

    if (existing) {
      existing.changes.push({
        previous: previousState,
        current: currentState,
        callstack,
      });
      existing.finalState = currentState;
    } else {
      this.buffer.set(key, {
        metadata,
        initialState: previousState,
        finalState: currentState,
        changes: [
          { previous: previousState, current: currentState, callstack },
        ],
        firstTimestamp: Date.now(),
      });

      const timer = setTimeout(() => {
        this.flush(key);
      }, this.windowMs);
      this.timers.set(key, timer);
    }

    return true;
  }

  flush(key: string): void {
    const buffered = this.buffer.get(key);
    if (!buffered) return;

    this.buffer.delete(key);
    const timer = this.timers.get(key);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(key);
    }

    this.onFlush(
      buffered.metadata,
      buffered.initialState,
      buffered.finalState,
      buffered.changes,
    );
  }

  flushAll(): void {
    for (const key of this.buffer.keys()) {
      this.flush(key);
    }
  }

  flushInstance(instanceId: string): void {
    if (this.buffer.has(instanceId)) {
      this.flush(instanceId);
    }
  }

  reset(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.buffer.clear();
    this.timers.clear();
  }
}
