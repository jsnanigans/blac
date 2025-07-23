import { globalComponentTracker } from '../src/ComponentDependencyTracker';

describe('Debug Component Dependencies', () => {
  beforeEach(() => {
    globalComponentTracker.cleanup();
  });

  it('should debug component dependency isolation', () => {
    // Simulate two components with different refs
    const componentRef1 = {};
    const componentRef2 = {};
    
    console.log('[Test] ComponentRef1:', componentRef1);
    console.log('[Test] ComponentRef2:', componentRef2);
    console.log('[Test] ComponentRef1 === ComponentRef2:', componentRef1 === componentRef2);
    
    // Register both components
    globalComponentTracker.registerComponent('comp1', componentRef1);
    globalComponentTracker.registerComponent('comp2', componentRef2);
    
    console.log('[Test] Registered both components');
    
    // Simulate component 1 accessing 'counter'
    globalComponentTracker.trackStateAccess(componentRef1, 'counter');
    console.log('[Test] Component 1 accessed counter');
    
    // Simulate component 2 accessing 'text'
    globalComponentTracker.trackStateAccess(componentRef2, 'text');
    console.log('[Test] Component 2 accessed text');
    
    // Check what each component has tracked
    const comp1StateAccess = globalComponentTracker.getStateAccess(componentRef1);
    const comp2StateAccess = globalComponentTracker.getStateAccess(componentRef2);
    
    console.log('[Test] Component 1 state access:', Array.from(comp1StateAccess));
    console.log('[Test] Component 2 state access:', Array.from(comp2StateAccess));
    
    // Test the dependency arrays for different states
    const initialState = { counter: 0, text: 'initial' };
    const counterUpdatedState = { counter: 1, text: 'initial' };
    const textUpdatedState = { counter: 0, text: 'updated' };
    
    console.log('[Test] Testing dependency arrays...');
    
    // Component 1 dependencies for initial state
    const comp1InitialDeps = globalComponentTracker.getComponentDependencies(
      componentRef1, initialState, {}
    );
    console.log('[Test] Component 1 initial dependencies:', comp1InitialDeps);
    
    // Component 1 dependencies for counter updated state
    const comp1CounterDeps = globalComponentTracker.getComponentDependencies(
      componentRef1, counterUpdatedState, {}
    );
    console.log('[Test] Component 1 counter updated dependencies:', comp1CounterDeps);
    
    // Component 1 dependencies for text updated state
    const comp1TextDeps = globalComponentTracker.getComponentDependencies(
      componentRef1, textUpdatedState, {}
    );
    console.log('[Test] Component 1 text updated dependencies:', comp1TextDeps);
    
    // Component 2 dependencies for initial state
    const comp2InitialDeps = globalComponentTracker.getComponentDependencies(
      componentRef2, initialState, {}
    );
    console.log('[Test] Component 2 initial dependencies:', comp2InitialDeps);
    
    // Component 2 dependencies for counter updated state
    const comp2CounterDeps = globalComponentTracker.getComponentDependencies(
      componentRef2, counterUpdatedState, {}
    );
    console.log('[Test] Component 2 counter updated dependencies:', comp2CounterDeps);
    
    // Component 2 dependencies for text updated state
    const comp2TextDeps = globalComponentTracker.getComponentDependencies(
      componentRef2, textUpdatedState, {}
    );
    console.log('[Test] Component 2 text updated dependencies:', comp2TextDeps);
    
    // Test dependency comparison manually
    console.log('[Test] === DEPENDENCY COMPARISON TESTS ===');
    
    // For component 1 (accesses counter):
    // - Initial: [[0], []]
    // - Counter updated: [[1], []]  <- should detect change
    // - Text updated: [[0], []]     <- should NOT detect change
    
    console.log('[Test] Component 1 - Counter change detected?', 
      !Object.is(comp1InitialDeps[0][0], comp1CounterDeps[0][0]));
    console.log('[Test] Component 1 - Text change detected?', 
      !Object.is(comp1InitialDeps[0][0], comp1TextDeps[0][0]));
    
    // For component 2 (accesses text):
    // - Initial: [['initial'], []]
    // - Counter updated: [['initial'], []]  <- should NOT detect change
    // - Text updated: [['updated'], []]     <- should detect change
    
    console.log('[Test] Component 2 - Counter change detected?', 
      !Object.is(comp2InitialDeps[0][0], comp2CounterDeps[0][0]));
    console.log('[Test] Component 2 - Text change detected?', 
      !Object.is(comp2InitialDeps[0][0], comp2TextDeps[0][0]));
  });

  it('should test the exact dependency comparison logic from useExternalBlocStore', () => {
    // Replicate the exact comparison logic
    function compareDepenedencies(lastDeps: unknown[][], currentDeps: unknown[][]): boolean {
      if (!lastDeps) {
        return true; // First time - dependencies changed
      }
      
      if (lastDeps.length !== currentDeps.length) {
        return true; // Array structure changed
      }
      
      // Compare each array (state and class dependencies)
      for (let arrayIndex = 0; arrayIndex < currentDeps.length; arrayIndex++) {
        const lastArray = lastDeps[arrayIndex] || [];
        const newArray = currentDeps[arrayIndex] || [];
        
        if (lastArray.length !== newArray.length) {
          console.log(`[Comparison] Array ${arrayIndex} length changed: ${lastArray.length} -> ${newArray.length}`);
          return true;
        }
        
        // Compare each dependency value using Object.is
        for (let i = 0; i < newArray.length; i++) {
          if (!Object.is(lastArray[i], newArray[i])) {
            console.log(`[Comparison] Array ${arrayIndex}[${i}] changed: ${lastArray[i]} -> ${newArray[i]}`);
            return true;
          }
        }
      }
      
      return false; // No changes detected
    }
    
    // Test the comparison logic
    const componentRef = {};
    globalComponentTracker.registerComponent('test', componentRef);
    globalComponentTracker.trackStateAccess(componentRef, 'counter');
    
    const initialState = { counter: 0, text: 'initial' };
    const counterUpdatedState = { counter: 1, text: 'initial' };
    const textUpdatedState = { counter: 0, text: 'updated' };
    
    const initialDeps = globalComponentTracker.getComponentDependencies(componentRef, initialState, {});
    const counterDeps = globalComponentTracker.getComponentDependencies(componentRef, counterUpdatedState, {});
    const textDeps = globalComponentTracker.getComponentDependencies(componentRef, textUpdatedState, {});
    
    console.log('[Test] Initial deps:', initialDeps);
    console.log('[Test] Counter updated deps:', counterDeps);
    console.log('[Test] Text updated deps:', textDeps);
    
    console.log('[Test] Counter change detected:', compareDepenedencies(initialDeps, counterDeps));
    console.log('[Test] Text change detected:', compareDepenedencies(initialDeps, textDeps));
  });
});