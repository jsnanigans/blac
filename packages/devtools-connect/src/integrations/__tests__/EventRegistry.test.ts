import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventRegistry, DevToolsEvent } from '../EventRegistry';

describe('EventRegistry', () => {
  beforeEach(() => {
    EventRegistry.clear();
  });

  describe('register', () => {
    it('should register an event with parameter names', () => {
      class TestEvent {
        constructor(public value: number) {}
      }

      EventRegistry.register('TestEvent', TestEvent, {
        parameterNames: ['value'],
      });

      expect(EventRegistry.has('TestEvent')).toBe(true);
      const metadata = EventRegistry.get('TestEvent');
      expect(metadata).toBeDefined();
      expect(metadata?.constructor).toBe(TestEvent);
      expect(metadata?.parameterNames).toEqual(['value']);
    });

    it('should warn when registering duplicate events', () => {
      class TestEvent {
        constructor() {}
      }

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      EventRegistry.register('TestEvent', TestEvent);
      EventRegistry.register('TestEvent', TestEvent);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('already registered'),
      );

      consoleSpy.mockRestore();
    });

    it('should register with custom deserializer', () => {
      class TestEvent {
        constructor(public data: any) {}
      }

      const customDeserializer = (payload: any) =>
        new TestEvent({ custom: payload.value });

      EventRegistry.register('TestEvent', TestEvent, {
        parameterNames: ['data'],
        deserialize: customDeserializer,
      });

      const metadata = EventRegistry.get('TestEvent');
      expect(metadata?.deserialize).toBe(customDeserializer);
    });
  });

  describe('deserializeEvent', () => {
    it('should deserialize event with no parameters', () => {
      class SimpleEvent {}

      EventRegistry.register('SimpleEvent', SimpleEvent);

      const event = EventRegistry.deserializeEvent('SimpleEvent', {});
      expect(event).toBeInstanceOf(SimpleEvent);
    });

    it('should deserialize event with single parameter', () => {
      class IncrementEvent {
        constructor(public amount: number = 1) {}
      }

      EventRegistry.register('IncrementEvent', IncrementEvent, {
        parameterNames: ['amount'],
      });

      const event = EventRegistry.deserializeEvent('IncrementEvent', {
        amount: 5,
      });
      expect(event).toBeInstanceOf(IncrementEvent);
      expect(event.amount).toBe(5);
    });

    it('should deserialize event with multiple parameters', () => {
      class UpdateUserEvent {
        constructor(
          public id: string,
          public name: string,
        ) {}
      }

      EventRegistry.register('UpdateUserEvent', UpdateUserEvent, {
        parameterNames: ['id', 'name'],
      });

      const event = EventRegistry.deserializeEvent('UpdateUserEvent', {
        id: '123',
        name: 'Alice',
      });
      expect(event).toBeInstanceOf(UpdateUserEvent);
      expect(event.id).toBe('123');
      expect(event.name).toBe('Alice');
    });

    it('should use custom deserializer when provided', () => {
      class ComplexEvent {
        constructor(public data: { value: number; doubled: number }) {}
      }

      EventRegistry.register('ComplexEvent', ComplexEvent, {
        deserialize: (payload) =>
          new ComplexEvent({
            value: payload.value,
            doubled: payload.value * 2,
          }),
      });

      const event = EventRegistry.deserializeEvent('ComplexEvent', {
        value: 10,
      });
      expect(event).toBeInstanceOf(ComplexEvent);
      expect(event.data.value).toBe(10);
      expect(event.data.doubled).toBe(20);
    });

    it('should throw error for unregistered event', () => {
      expect(() => {
        EventRegistry.deserializeEvent('UnknownEvent', {});
      }).toThrow('Unknown event: "UnknownEvent"');
    });

    it('should handle null/undefined payload', () => {
      class DefaultEvent {
        constructor(public value: number = 42) {}
      }

      EventRegistry.register('DefaultEvent', DefaultEvent, {
        parameterNames: ['value'],
      });

      const event1 = EventRegistry.deserializeEvent('DefaultEvent', null);
      expect(event1).toBeInstanceOf(DefaultEvent);

      const event2 = EventRegistry.deserializeEvent('DefaultEvent', undefined);
      expect(event2).toBeInstanceOf(DefaultEvent);
    });
  });

  describe('getRegisteredEvents', () => {
    it('should return empty array when no events registered', () => {
      expect(EventRegistry.getRegisteredEvents()).toEqual([]);
    });

    it('should return all registered event names', () => {
      class Event1 {}
      class Event2 {}
      class Event3 {}

      EventRegistry.register('Event1', Event1);
      EventRegistry.register('Event2', Event2);
      EventRegistry.register('Event3', Event3);

      const events = EventRegistry.getRegisteredEvents();
      expect(events).toContain('Event1');
      expect(events).toContain('Event2');
      expect(events).toContain('Event3');
      expect(events).toHaveLength(3);
    });
  });

  describe('@DevToolsEvent decorator', () => {
    it('should register event with decorator', () => {
      @DevToolsEvent({ params: ['value'] })
      class _DecoratedEvent {
        constructor(public value: number) {}
      }

      expect(EventRegistry.has('_DecoratedEvent')).toBe(true);
      const metadata = EventRegistry.get('_DecoratedEvent');
      expect(metadata?.parameterNames).toEqual(['value']);
    });

    it('should use custom name when provided', () => {
      @DevToolsEvent({ name: 'CustomName', params: ['id'] })
      class _SomeEvent {
        constructor(public id: string) {}
      }

      expect(EventRegistry.has('CustomName')).toBe(true);
      expect(EventRegistry.has('_SomeEvent')).toBe(false);
    });

    it('should register with custom deserializer', () => {
      @DevToolsEvent({
        params: ['data'],
        deserialize: (payload) => {
          const instance = new CustomEvent({ transformed: payload.value });
          return instance;
        },
      })
      class CustomEvent {
        constructor(public data: any) {}
      }

      const event = EventRegistry.deserializeEvent('CustomEvent', {
        value: 100,
      });
      expect(event).toBeInstanceOf(CustomEvent);
      expect(event.data.transformed).toBe(100);
    });

    it('should work with no parameters', () => {
      @DevToolsEvent()
      class NoParamsEvent {}

      expect(EventRegistry.has('NoParamsEvent')).toBe(true);
      const event = EventRegistry.deserializeEvent('NoParamsEvent', {});
      expect(event).toBeInstanceOf(NoParamsEvent);
    });
  });
});
