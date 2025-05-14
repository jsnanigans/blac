import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Blac, Cubit } from '../../blac/src';
import { useBloc } from '../src';

// Define a simple counter cubit for testing
class TestCubitIsolated extends Cubit<{ count: number }> {
  static isolated = true;
  
  constructor() {
    super({ count: 0 });
    this.isDisposed = false;
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };

  // We need to override _dispose to track when it's called
  _dispose() {
    // Set the flag before calling super._dispose
    this.isDisposed = true;
    // Important to call the parent implementation
    super._dispose();
  }

  isDisposed = false;
}

// Shared cubit for non-isolated tests
class TestCubit extends Cubit<{ count: number }> {
  // Not isolated
  
  constructor() {
    super({ count: 0 });
    this.isDisposed = false;
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };

  // Override _dispose to track when it's called
  _dispose() {
    // Set the flag before calling super._dispose
    this.isDisposed = true;
    // Important to call the parent implementation
    super._dispose();
  }

  isDisposed = false;
}

describe('useBloc cleanup and resource management', () => {
  beforeEach(() => {
    Blac.resetInstance();
    vi.clearAllMocks();
  });

  test('should properly register and cleanup consumers when components mount and unmount', async () => {
    // Use renderHook to test the hook directly
    const { unmount, result } = renderHook(() => useBloc(TestCubit));
    
    // Verify the hook returns a state and a bloc instance
    expect(result.current[0]).toEqual({ count: 0 });
    expect(result.current[1]).toBeInstanceOf(TestCubit);
    
    // Get the bloc instance from the hook result
    const bloc = result.current[1];
    
    // Wait for consumer registration to complete
    await waitFor(() => {
      expect(bloc._consumers.size).toBeGreaterThan(0);
    });
    
    // Unmount the hook
    unmount();
    
    // Wait for cleanup to complete
    await waitFor(() => {
      // Now the consumers should be empty 
      expect(bloc._consumers.size).toBe(0);
      
      // And the bloc should be disposed 
      expect(bloc.isDisposed).toBe(true);
    });
  });

  test('should dispose isolated bloc when all consumers are gone', async () => {
    // Use renderHook to test the hook directly
    const { unmount, result } = renderHook(() => useBloc(TestCubitIsolated));
    
    // Get the bloc instance from the hook result
    const bloc: TestCubit = result.current[1];
    
    // Wait for consumer registration to complete
    await waitFor(() => {
      expect(bloc._consumers.size).toBeGreaterThan(0);
    });
    
    // Unmount the hook
    unmount();
    
    // Wait for cleanup to complete
    await waitFor(() => {
      // Verify the bloc was disposed
      expect(bloc.isDisposed).toBe(true);
    });
  });

  test('should not dispose shared bloc when some consumers remain', async () => {
    // Use renderHook to test the hook directly with shared ID
    const { unmount: unmount1 } = renderHook(() => useBloc(TestCubit, { id: 'shared-cubit' }));
    
    const { unmount: unmount2, result } = renderHook(() => useBloc(TestCubit, { id: 'shared-cubit' }));
    
    // Get the bloc instance from the second hook result
    const bloc: TestCubit = result.current[1];
    
    // Wait for both consumers to be registered
    await waitFor(() => {
      expect(bloc._consumers.size).toBe(2);
    });
    
    // Unmount the first hook
    unmount1();
    
    // Wait for first consumer to be removed
    await waitFor(() => {
      // The bloc should still have one consumer and not be disposed
      expect(bloc._consumers.size).toBe(1);
      expect(bloc.isDisposed).toBe(false);
    });
    
    // Unmount the second hook
    unmount2();
    
    // Wait for second consumer to be removed and bloc to be disposed
    await waitFor(() => {
      // Now the bloc should have no consumers and be disposed
      expect(bloc._consumers.size).toBe(0);
      expect(bloc.isDisposed).toBe(true);
    });
  });

  test('should call onMount when the component mounts', () => {
    const onMountMock = vi.fn();
    
    renderHook(() => useBloc(TestCubit, { onMount: onMountMock }));
    
    // Verify onMount was called
    expect(onMountMock).toHaveBeenCalledTimes(1);
    expect(onMountMock).toHaveBeenCalledWith(expect.any(TestCubit));
  });

  test('should properly clean up when components conditionally render', async () => {
    // First render to create the first bloc
    const { unmount: unmountFirst, result: firstResult } = renderHook(() => useBloc(TestCubit));
    
    // Get the first bloc instance
    const firstBloc: TestCubit = firstResult.current[1];
    
    // Wait for consumer registration to complete
    await waitFor(() => {
      expect(firstBloc._consumers.size).toBeGreaterThan(0);
    });
    
    // Unmount to simulate component being conditionally removed 
    unmountFirst();
    
    // Wait for cleanup to complete
    await waitFor(() => {
      // Verify the first bloc was disposed
      expect(firstBloc.isDisposed).toBe(true);
    });
    
    // Create a new instance to simulate component being conditionally added back
    const { result: secondResult } = renderHook(() => useBloc(TestCubit));
    
    // Get the second bloc instance
    const secondBloc: TestCubit = secondResult.current[1];
    
    // Verify a new bloc instance was created
    expect(secondBloc).not.toBe(firstBloc);
    
    // Wait for new consumer registration
    await waitFor(() => {
      expect(secondBloc._consumers.size).toBeGreaterThan(0);
    });
  });
}); 