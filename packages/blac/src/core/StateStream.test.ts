/**
 * Tests for StateStream
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { StateStream } from './StateStream';
import { version } from '../types/branded';
import * as fc from 'fast-check';

describe('StateStream', () => {
  interface TestState {
    count: number;
    name: string;
    nested?: {
      value: number;
    };
  }

  let stream: StateStream<TestState>;
  const initialState: TestState = {
    count: 0,
    name: 'test',
    nested: { value: 42 },
  };

  beforeEach(() => {
    stream = new StateStream(initialState);
  });

  describe('initialization', () => {
    it('should initialize with the given state', () => {
      expect(stream.state).toEqual(initialState);
      expect(stream.state).not.toBe(initialState); // Should be cloned
    });

    it('should start with version 0', () => {
      expect(stream.version).toBe(0);
    });

    // it('should freeze state in development', () => {
    //   expect(() => {
    //     (stream.state as any).count = 999;
    //   }).toThrow();
    // });

    it('should maintain history', () => {
      const history = stream.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].state).toEqual(initialState);
    });
  });

  describe('state updates', () => {
    it('should update state with updater function', () => {
      stream.update((state) => ({ ...state, count: 1 }));

      expect(stream.state.count).toBe(1);
      expect(stream.state.name).toBe('test');
    });

    it('should increment version on update', () => {
      const v0 = stream.version;
      stream.update((state) => ({ ...state, count: 1 }));
      expect(stream.version).toBe(v0 + 1);
    });

    it('should not update if state is unchanged', () => {
      const v0 = stream.version;
      stream.update((state) => ({ ...state })); // Same values
      expect(stream.version).toBe(v0); // Version unchanged
    });

    it('should emit change events', () => {
      const handler = vi.fn();
      const unsubscribe = stream.subscribe(handler);

      stream.update((state) => ({ ...state, count: 1 }));

      expect(handler).toHaveBeenCalledTimes(1);
      const event = handler.mock.calls[0][0];
      expect(event.type).toBe('state-change');
      expect(event.previous.count).toBe(0);
      expect(event.current.count).toBe(1);
      expect(event.version).toBe(1);

      unsubscribe();
    });

    it('should support silent updates', () => {
      const handler = vi.fn();
      stream.subscribe(handler);

      stream.update((state) => ({ ...state, count: 1 }), { silent: true });

      expect(handler).not.toHaveBeenCalled();
      expect(stream.state.count).toBe(1); // State still updated
    });

    it('should include metadata in events', () => {
      const handler = vi.fn();
      stream.subscribe(handler);

      stream.update((state) => ({ ...state, count: 1 }), {
        source: 'test-update',
        metadata: { context: { user: 'alice' } },
      });

      const event = handler.mock.calls[0][0];
      expect(event.metadata.source).toBe('test-update');
      expect(event.metadata.context).toEqual({ user: 'alice' });
    });
  });

  describe('setState', () => {
    it('should replace state entirely', () => {
      const newState: TestState = { count: 99, name: 'replaced' };
      stream.setState(newState);

      expect(stream.state).toEqual(newState);
      expect(stream.state.nested).toBeUndefined();
    });
  });

  describe('history management', () => {
    it('should maintain history up to max size', () => {
      const smallStream = new StateStream(initialState, 3);

      smallStream.update((s) => ({ ...s, count: 1 }));
      smallStream.update((s) => ({ ...s, count: 2 }));
      smallStream.update((s) => ({ ...s, count: 3 }));
      smallStream.update((s) => ({ ...s, count: 4 }));

      const history = smallStream.getHistory();
      expect(history).toHaveLength(3); // Max size enforced
      expect(history[0].state.count).toBe(2); // Oldest kept
      expect(history[2].state.count).toBe(4); // Newest
    });

    it('should clear history on demand', () => {
      stream.update((s) => ({ ...s, count: 1 }));
      stream.update((s) => ({ ...s, count: 2 }));

      stream.clearHistory();
      const history = stream.getHistory();

      expect(history).toHaveLength(1);
      expect(history[0].state.count).toBe(2); // Only current
    });

    it('should limit returned history', () => {
      stream.update((s) => ({ ...s, count: 1 }));
      stream.update((s) => ({ ...s, count: 2 }));
      stream.update((s) => ({ ...s, count: 3 }));

      const limited = stream.getHistory(2);
      expect(limited).toHaveLength(2);
      expect(limited[0].state.count).toBe(2);
      expect(limited[1].state.count).toBe(3);
    });
  });

  describe('reset', () => {
    it('should reset to new initial state', () => {
      stream.update((s) => ({ ...s, count: 99 }));
      expect(stream.version).toBe(1);

      const resetState: TestState = { count: 0, name: 'reset' };
      stream.reset(resetState);

      expect(stream.state).toEqual(resetState);
      expect(stream.version).toBe(0);
      expect(stream.getHistory()).toHaveLength(1);
    });

    it('should emit reset event', () => {
      const handler = vi.fn();
      stream.subscribe(handler);

      stream.reset({ count: 0, name: 'reset' });

      expect(handler).toHaveBeenCalledTimes(1);
      const event = handler.mock.calls[0][0];
      expect(event.metadata.source).toBe('reset');
    });
  });

  describe('property-based tests', () => {
    it('should maintain version consistency', () => {
      fc.assert(
        fc.property(fc.array(fc.integer()), (values) => {
          const s = new StateStream({ value: 0 });
          let expectedVersion = 0;

          values.forEach((val) => {
            const prevVersion = s.version;
            const prevState = s.state.value;
            s.update(() => ({ value: val }));

            if (val !== prevState) {
              expectedVersion++;
              expect(s.version).toBe(expectedVersion);
            } else {
              expect(s.version).toBe(prevVersion);
            }
          });

          return true;
        }),
      );
    });

    it('should never lose state updates', () => {
      fc.assert(
        fc.property(
          fc.array(fc.record({ count: fc.integer(), name: fc.string() })),
          (states) => {
            const s = new StateStream({ count: 0, name: '' });

            states.forEach((state) => {
              s.setState(state);
              expect(s.state).toEqual(state);
            });

            if (states.length > 0) {
              expect(s.state).toEqual(states[states.length - 1]);
            }

            return true;
          },
        ),
      );
    });
  });
});
