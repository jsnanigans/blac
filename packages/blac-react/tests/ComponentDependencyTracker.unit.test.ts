import { describe, it, expect, beforeEach } from 'vitest';
import { ComponentDependencyTracker } from '../src/ComponentDependencyTracker';

describe('ComponentDependencyTracker Unit Tests', () => {
  let tracker: ComponentDependencyTracker;
  let componentRef1: object;
  let componentRef2: object;

  beforeEach(() => {
    tracker = new ComponentDependencyTracker();
    componentRef1 = {};
    componentRef2 = {};
  });

  describe('Component Registration', () => {
    it('should register components successfully', () => {
      tracker.registerComponent('comp1', componentRef1);
      tracker.registerComponent('comp2', componentRef2);

      const metrics = tracker.getMetrics();
      expect(metrics.totalComponents).toBe(2);
    });

  });

  describe('Dependency Tracking', () => {
    beforeEach(() => {
      tracker.registerComponent('comp1', componentRef1);
      tracker.registerComponent('comp2', componentRef2);
    });

    it('should track state access per component', () => {
      tracker.trackStateAccess(componentRef1, 'counter');
      tracker.trackStateAccess(componentRef1, 'text');
      tracker.trackStateAccess(componentRef2, 'counter');

      const comp1StateAccess = tracker.getStateAccess(componentRef1);
      const comp2StateAccess = tracker.getStateAccess(componentRef2);

      expect(comp1StateAccess).toEqual(new Set(['counter', 'text']));
      expect(comp2StateAccess).toEqual(new Set(['counter']));
    });

    it('should track class access per component', () => {
      tracker.trackClassAccess(componentRef1, 'textLength');
      tracker.trackClassAccess(componentRef2, 'uppercaseText');

      const comp1ClassAccess = tracker.getClassAccess(componentRef1);
      const comp2ClassAccess = tracker.getClassAccess(componentRef2);

      expect(comp1ClassAccess).toEqual(new Set(['textLength']));
      expect(comp2ClassAccess).toEqual(new Set(['uppercaseText']));
    });

    it('should not duplicate access tracking', () => {
      tracker.trackStateAccess(componentRef1, 'counter');
      tracker.trackStateAccess(componentRef1, 'counter'); // Duplicate

      const stateAccess = tracker.getStateAccess(componentRef1);
      expect(stateAccess).toEqual(new Set(['counter']));

      const metrics = tracker.getMetrics();
      expect(metrics.totalStateAccess).toBe(1);
    });
  });

  describe('Notification Logic', () => {
    beforeEach(() => {
      tracker.registerComponent('comp1', componentRef1);
      tracker.registerComponent('comp2', componentRef2);

      // Component 1 accesses counter
      tracker.trackStateAccess(componentRef1, 'counter');
      // Component 2 accesses text and textLength getter
      tracker.trackStateAccess(componentRef2, 'text');
      tracker.trackClassAccess(componentRef2, 'textLength');
    });

    it('should correctly determine which components need notification', () => {
      const counterChanged = new Set(['counter']);
      const textChanged = new Set(['text']);
      const bothChanged = new Set(['counter', 'text']);

      // Only counter changed - comp1 should be notified
      expect(tracker.shouldNotifyComponent(componentRef1, counterChanged, new Set())).toBe(true);
      expect(tracker.shouldNotifyComponent(componentRef2, counterChanged, new Set())).toBe(false);

      // Only text changed - comp2 should be notified
      expect(tracker.shouldNotifyComponent(componentRef1, textChanged, new Set())).toBe(false);
      expect(tracker.shouldNotifyComponent(componentRef2, textChanged, new Set())).toBe(true);

      // Both changed - both should be notified
      expect(tracker.shouldNotifyComponent(componentRef1, bothChanged, new Set())).toBe(true);
      expect(tracker.shouldNotifyComponent(componentRef2, bothChanged, new Set())).toBe(true);
    });

    it('should handle class property notifications', () => {
      const textLengthChanged = new Set(['textLength']);

      // textLength getter changed - comp2 should be notified
      expect(tracker.shouldNotifyComponent(componentRef1, new Set(), textLengthChanged)).toBe(false);
      expect(tracker.shouldNotifyComponent(componentRef2, new Set(), textLengthChanged)).toBe(true);
    });
  });

  describe('Dependency Array Generation', () => {
    beforeEach(() => {
      tracker.registerComponent('comp1', componentRef1);
      tracker.registerComponent('comp2', componentRef2);
    });

    it('should generate correct dependency arrays for each component', () => {
      const state = { counter: 5, text: 'hello' };
      const classInstance = { textLength: 5, uppercaseText: 'HELLO' };

      // Component 1 accesses counter
      tracker.trackStateAccess(componentRef1, 'counter');
      // Component 2 accesses text and textLength
      tracker.trackStateAccess(componentRef2, 'text');
      tracker.trackClassAccess(componentRef2, 'textLength');

      const comp1Deps = tracker.getComponentDependencies(componentRef1, state, classInstance);
      const comp2Deps = tracker.getComponentDependencies(componentRef2, state, classInstance);

      // Component 1: [counter], []
      expect(comp1Deps).toEqual([[5], []]);

      // Component 2: [text], [textLength]
      expect(comp2Deps).toEqual([['hello'], [5]]);
    });

    it('should return empty arrays for unregistered components', () => {
      const unregisteredRef = {};
      const deps = tracker.getComponentDependencies(unregisteredRef, {}, {});
      expect(deps).toEqual([[], []]);
    });

  });

  describe('Component Cleanup', () => {
    it('should reset component dependencies', () => {
      tracker.registerComponent('comp1', componentRef1);
      tracker.trackStateAccess(componentRef1, 'counter');
      tracker.trackClassAccess(componentRef1, 'textLength');

      expect(tracker.getStateAccess(componentRef1).size).toBe(1);
      expect(tracker.getClassAccess(componentRef1).size).toBe(1);

      tracker.resetComponent(componentRef1);

      expect(tracker.getStateAccess(componentRef1).size).toBe(0);
      expect(tracker.getClassAccess(componentRef1).size).toBe(0);
    });

  });

  describe('Metrics', () => {
    it('should provide accurate metrics', () => {
      tracker.registerComponent('comp1', componentRef1);
      tracker.registerComponent('comp2', componentRef2);

      tracker.trackStateAccess(componentRef1, 'counter');
      tracker.trackStateAccess(componentRef1, 'text');
      tracker.trackStateAccess(componentRef2, 'counter');

      tracker.trackClassAccess(componentRef1, 'textLength');

      const metrics = tracker.getMetrics();

      expect(metrics.totalComponents).toBe(2);
      expect(metrics.totalStateAccess).toBe(3);
      expect(metrics.totalClassAccess).toBe(1);
      expect(metrics.averageAccessPerComponent).toBe(2); // (3 + 1) / 2
      expect(metrics.memoryUsageKB).toBeGreaterThanOrEqual(0);
    });
  });
});