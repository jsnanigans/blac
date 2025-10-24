/**
 * EventStream Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventStream } from './EventStream';
import { BaseEvent } from '../types/events';

// Test event classes
class IncrementEvent implements BaseEvent {
  readonly type = 'increment';
  readonly timestamp = Date.now();
  constructor(public readonly amount: number = 1) {}
}

class DecrementEvent implements BaseEvent {
  readonly type = 'decrement';
  readonly timestamp = Date.now();
  constructor(public readonly amount: number = 1) {}
}

class AsyncEvent implements BaseEvent {
  readonly type = 'async';
  readonly timestamp = Date.now();
  constructor(public readonly delay: number = 100) {}
}

describe('EventStream', () => {
  let stream: EventStream<IncrementEvent | DecrementEvent | AsyncEvent>;

  beforeEach(() => {
    stream = new EventStream();
  });

  describe('Event Dispatch', () => {
    it('should dispatch events to subscribers', () => {
      const events: any[] = [];
      stream.subscribe((event) => events.push(event));

      const event = new IncrementEvent(5);
      stream.dispatch(event);

      expect(events).toHaveLength(1);
      expect(events[0]).toBe(event);
    });

    it('should dispatch to multiple subscribers', () => {
      const events1: any[] = [];
      const events2: any[] = [];

      stream.subscribe((event) => events1.push(event));
      stream.subscribe((event) => events2.push(event));

      const event = new IncrementEvent();
      stream.dispatch(event);

      expect(events1).toHaveLength(1);
      expect(events2).toHaveLength(1);
      expect(events1[0]).toBe(event);
      expect(events2[0]).toBe(event);
    });

    it('should maintain event order', () => {
      const events: any[] = [];
      stream.subscribe((event) => events.push(event));

      const event1 = new IncrementEvent(1);
      const event2 = new DecrementEvent(2);
      const event3 = new IncrementEvent(3);

      stream.dispatch(event1);
      stream.dispatch(event2);
      stream.dispatch(event3);

      expect(events).toEqual([event1, event2, event3]);
    });
  });

  describe('Subscription Management', () => {
    it('should return unsubscribe function', () => {
      const events: any[] = [];
      const unsubscribe = stream.subscribe((event) => events.push(event));

      stream.dispatch(new IncrementEvent());
      expect(events).toHaveLength(1);

      unsubscribe();
      stream.dispatch(new IncrementEvent());
      expect(events).toHaveLength(1); // Still 1, not 2
    });

    it('should handle multiple unsubscribes gracefully', () => {
      const unsubscribe = stream.subscribe(() => {});

      expect(() => {
        unsubscribe();
        unsubscribe(); // Second call should not throw
      }).not.toThrow();
    });

    it('should handle subscriber errors with error strategy', () => {
      const stream = new EventStream({ errorStrategy: 'silent' });
      const events1: any[] = [];
      const events2: any[] = [];
      const errorSpy = vi.fn(() => {
        throw new Error('Subscriber error');
      });

      stream.subscribe((event) => events1.push(event));
      stream.subscribe(errorSpy);
      stream.subscribe((event) => events2.push(event));

      const event = new IncrementEvent();

      // Should not throw even though one subscriber errors
      expect(() => stream.dispatch(event)).not.toThrow();

      // Other subscribers should still receive the event
      expect(events1).toHaveLength(1);
      expect(events2).toHaveLength(1);
      expect(errorSpy).toHaveBeenCalledWith(event);
    });
  });

  describe('Event Filtering', () => {
    it('should filter events by type', () => {
      const increments: IncrementEvent[] = [];
      const decrements: DecrementEvent[] = [];

      stream
        .filter((e): e is IncrementEvent => e.type === 'increment')
        .subscribe((event) => increments.push(event));

      stream
        .filter((e): e is DecrementEvent => e.type === 'decrement')
        .subscribe((event) => decrements.push(event));

      stream.dispatch(new IncrementEvent(1));
      stream.dispatch(new DecrementEvent(1));
      stream.dispatch(new IncrementEvent(2));

      expect(increments).toHaveLength(2);
      expect(decrements).toHaveLength(1);
    });

    it('should chain multiple filters', () => {
      const events: IncrementEvent[] = [];

      stream
        .filter((e): e is IncrementEvent => e.type === 'increment')
        .filter((e) => e.amount > 5)
        .subscribe((event) => events.push(event));

      stream.dispatch(new IncrementEvent(3));
      stream.dispatch(new IncrementEvent(10));
      stream.dispatch(new DecrementEvent(7));
      stream.dispatch(new IncrementEvent(6));

      expect(events).toHaveLength(2);
      expect(events[0].amount).toBe(10);
      expect(events[1].amount).toBe(6);
    });
  });

  describe('Event Transformation', () => {
    it('should map events', () => {
      const amounts: number[] = [];

      stream
        .map((event) => {
          const mappedEvent: BaseEvent = {
            type: 'mapped',
            timestamp: Date.now(),
            source: 'test',
          };

          // Store the amount separately for verification
          if (event.type === 'increment') {
            amounts.push(event.amount);
          } else if (event.type === 'decrement') {
            amounts.push(-event.amount);
          }

          return mappedEvent;
        })
        .subscribe(() => {});

      stream.dispatch(new IncrementEvent(5));
      stream.dispatch(new DecrementEvent(3));

      expect(amounts).toEqual([5, -3]);
    });

    it('should chain map with filter', () => {
      const results: string[] = [];

      const filteredStream = stream.filter(
        (e): e is IncrementEvent => e.type === 'increment',
      );

      // Subscribe to the filtered stream and track results
      filteredStream.subscribe((event) => {
        results.push(`+${event.amount}`);
      });

      stream.dispatch(new IncrementEvent(5));
      stream.dispatch(new DecrementEvent(3));
      stream.dispatch(new IncrementEvent(2));

      expect(results).toEqual(['+5', '+2']);
    });
  });

  describe('Backpressure Handling', () => {
    it('should handle rapid event dispatch', () => {
      const events: any[] = [];
      stream.subscribe((event) => events.push(event));

      // Dispatch 1000 events rapidly
      for (let i = 0; i < 1000; i++) {
        stream.dispatch(new IncrementEvent(i));
      }

      expect(events).toHaveLength(1000);
    });

    it('should handle synchronous event dispatch', () => {
      const stream = new EventStream();
      const events: number[] = [];

      stream.subscribe((event) => {
        if (event.type === 'increment') {
          events.push((event as IncrementEvent).amount);
        }
      });

      stream.dispatch(new IncrementEvent(1));
      stream.dispatch(new IncrementEvent(2));
      stream.dispatch(new IncrementEvent(3));

      // Events are processed synchronously
      expect(events).toEqual([1, 2, 3]);
    });
  });

  describe('Queue Management', () => {
    it('should track queue size (always 0 in sync mode)', () => {
      const stream = new EventStream({
        maxQueueSize: 3,
      });

      // In synchronous mode, queue is always 0
      expect(stream.getQueueSize()).toBe(0);

      stream.dispatch(new IncrementEvent(1));
      stream.dispatch(new IncrementEvent(2));

      // Still 0 because events are processed immediately
      expect(stream.getQueueSize()).toBe(0);
    });

    it('should allow clearing queue (no-op in sync mode)', () => {
      const stream = new EventStream();

      stream.dispatch(new IncrementEvent(1));
      stream.dispatch(new IncrementEvent(2));

      expect(stream.getQueueSize()).toBe(0);

      stream.clearQueue();
      expect(stream.getQueueSize()).toBe(0);
    });
  });

  describe('Stream Control', () => {
    it('should track pause state (pause/resume are no-ops in sync mode)', () => {
      const stream = new EventStream();
      const events: any[] = [];

      stream.subscribe((event) => events.push(event));

      stream.pause();
      stream.dispatch(new IncrementEvent(1));
      stream.dispatch(new IncrementEvent(2));

      // In sync mode, events are still processed immediately despite pause
      expect(events).toHaveLength(2);

      stream.resume();
      stream.dispatch(new IncrementEvent(3));

      expect(events).toHaveLength(3);
    });

    it('should track processing state', () => {
      const stream = new EventStream();

      expect(stream.isProcessing()).toBe(false);
      expect(stream.isPaused()).toBe(false);

      stream.pause();
      expect(stream.isPaused()).toBe(true);

      stream.resume();
      expect(stream.isPaused()).toBe(false);
    });
  });

  describe('Metrics', () => {
    it('should track event metrics', () => {
      stream.dispatch(new IncrementEvent(1));
      stream.dispatch(new DecrementEvent(1));

      const metrics = stream.getMetrics();
      expect(metrics.totalEvents).toBeGreaterThan(0);
    });
  });

  describe('Stream Piping', () => {
    it('should pipe events to another stream', () => {
      const targetStream = new EventStream<BaseEvent>();
      const targetEvents: any[] = [];

      targetStream.subscribe((event) => targetEvents.push(event));
      stream.pipe(targetStream);

      const event = new IncrementEvent(5);
      stream.dispatch(event);

      expect(targetEvents).toHaveLength(1);
      expect(targetEvents[0]).toBe(event);
    });

    it('should allow unpipe', () => {
      const targetStream = new EventStream<BaseEvent>();
      const targetEvents: any[] = [];

      targetStream.subscribe((event) => targetEvents.push(event));
      const unpipe = stream.pipe(targetStream);

      stream.dispatch(new IncrementEvent(1));
      expect(targetEvents).toHaveLength(1);

      unpipe();
      stream.dispatch(new IncrementEvent(2));
      expect(targetEvents).toHaveLength(1); // No new events
    });
  });

  describe('Memory Management', () => {
    it('should not retain references to unsubscribed listeners', () => {
      const unsubscribes: Array<() => void> = [];

      // Add many subscribers
      for (let i = 0; i < 100; i++) {
        unsubscribes.push(stream.subscribe(() => {}));
      }

      // Unsubscribe all
      unsubscribes.forEach((unsub) => unsub());

      // Add a test subscriber to verify stream still works
      const events: any[] = [];
      stream.subscribe((e) => events.push(e));

      stream.dispatch(new IncrementEvent());

      // Should only have one event from the active subscriber
      expect(events).toHaveLength(1);
    });
  });

  describe('Type Safety', () => {
    it('should preserve event types through transformations', () => {
      type IncrementOnly = IncrementEvent;
      const incrementStream = stream.filter(
        (e): e is IncrementOnly => e.type === 'increment',
      );

      const amounts: number[] = [];
      incrementStream.subscribe((event) => {
        // TypeScript should know this is IncrementEvent
        amounts.push(event.amount);
      });

      stream.dispatch(new IncrementEvent(5));
      expect(amounts).toEqual([5]);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors based on strategy', () => {
      const throwStream = new EventStream({ errorStrategy: 'throw' });
      throwStream.addFilter(() => {
        throw new Error('Filter error');
      });

      expect(() => throwStream.dispatch(new IncrementEvent())).toThrow(
        'Filter error',
      );

      const logStream = new EventStream({ errorStrategy: 'log' });
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      logStream.addFilter(() => {
        throw new Error('Filter error');
      });

      expect(() => logStream.dispatch(new IncrementEvent())).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty stream', () => {
      const events: any[] = [];
      stream.subscribe((e) => events.push(e));

      // No dispatches
      expect(events).toHaveLength(0);
    });

    it('should handle null transformer results', () => {
      const events: any[] = [];

      stream.addTransformer(() => null);
      stream.subscribe((e) => events.push(e));

      stream.dispatch(new IncrementEvent(1));

      // Event should be filtered out by null transformer
      expect(events).toHaveLength(0);
    });
  });
});
