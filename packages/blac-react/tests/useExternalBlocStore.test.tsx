import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { Cubit, Blac } from '@blac/core'
import { useExternalBlocStore } from '../src'

interface TestState {
  count: number
  lastAction: string
}

class TestCubit extends Cubit<TestState> {
  constructor() {
    super({ count: 0, lastAction: 'init' })
  }

  increment = () => {
    this.emit({ count: this.state.count + 1, lastAction: 'increment' })
  }

  decrement = () => {
    this.emit({ count: this.state.count - 1, lastAction: 'decrement' })
  }

  reset = () => {
    this.emit({ count: 0, lastAction: 'reset' })
  }
}

class IsolatedTestCubit extends TestCubit {
  static isolated = true
}

describe('useExternalBlocStore', () => {
  beforeEach(() => {
    Blac.resetInstance()
  })

  describe('Store Creation', () => {
    it('should create a store for bloc', () => {
      const { result } = renderHook(() => useExternalBlocStore(TestCubit))

      expect(result.current.externalStore).toBeDefined()
      expect(result.current.instance.current).toBeInstanceOf(TestCubit)
      expect(result.current.externalStore.getSnapshot()).toEqual({
        count: 0,
        lastAction: 'init'
      })
    })

    it('should work with selector function', () => {
      const selector = vi.fn((currentState: TestState) => [currentState.count])
      const { result } = renderHook(() => 
        useExternalBlocStore(TestCubit, { selector })
      )

      const unsubscribe = result.current.externalStore.subscribe(() => {})
      
      act(() => {
        result.current.instance.current?.increment()
      })

      expect(selector).toHaveBeenCalled()
      unsubscribe()
    })

    it('should create isolated bloc instance when isolated flag is set', () => {
      const { result: result1 } = renderHook(() => useExternalBlocStore(IsolatedTestCubit))
      const { result: result2 } = renderHook(() => useExternalBlocStore(IsolatedTestCubit))

      expect(result1.current.instance.current).not.toBe(result2.current.instance.current)
      expect(result1.current.instance.current?._id).not.toBe(result2.current.instance.current?._id)
    })
  })

  describe('Subscription', () => {
    it('should subscribe to state changes', () => {
      const { result } = renderHook(() => useExternalBlocStore(TestCubit))

      let notificationCount = 0
      const unsubscribe = result.current.externalStore.subscribe(() => {
        notificationCount++
      })

      act(() => {
        result.current.instance.current?.increment()
      })

      expect(notificationCount).toBe(1)
      expect(result.current.externalStore.getSnapshot()?.count).toBe(1)

      act(() => {
        result.current.instance.current?.increment()
      })

      expect(notificationCount).toBe(2)
      expect(result.current.externalStore.getSnapshot()?.count).toBe(2)

      unsubscribe()

      act(() => {
        result.current.instance.current?.increment()
      })

      expect(notificationCount).toBe(2)
    })

    it('should call selector on state changes', () => {
      const selector = vi.fn((currentState, previousState, instance) => {
        return [currentState.count]
      })

      const { result } = renderHook(() => 
        useExternalBlocStore(TestCubit, { selector })
      )

      const unsubscribe = result.current.externalStore.subscribe(() => {})

      act(() => {
        result.current.instance.current?.increment()
      })

      expect(selector).toHaveBeenCalledWith(
        { count: 1, lastAction: 'increment' },
        { count: 0, lastAction: 'init' },
        result.current.instance.current
      )

      unsubscribe()
    })
  })

  describe('Server Snapshot', () => {
    it('should provide server snapshot', () => {
      const { result } = renderHook(() => useExternalBlocStore(TestCubit))

      const serverSnapshot = result.current.externalStore.getServerSnapshot?.()
      expect(serverSnapshot).toEqual({
        count: 0,
        lastAction: 'init'
      })

      act(() => {
        result.current.instance.current?.increment()
      })

      // Server snapshot should remain the same
      expect(result.current.externalStore.getServerSnapshot?.()).toEqual({
        count: 1,
        lastAction: 'increment'
      })
    })
  })

  describe('Store Consistency', () => {
    it('should return same bloc instance for same constructor', () => {
      const { result: result1 } = renderHook(() => useExternalBlocStore(TestCubit))
      const { result: result2 } = renderHook(() => useExternalBlocStore(TestCubit))

      expect(result1.current.instance.current).toBe(result2.current.instance.current)
    })

    it('should return different instances for isolated blocs', () => {
      const { result: result1 } = renderHook(() => useExternalBlocStore(IsolatedTestCubit))
      const { result: result2 } = renderHook(() => useExternalBlocStore(IsolatedTestCubit))

      expect(result1.current.instance.current).not.toBe(result2.current.instance.current)
    })

    it('should use custom id when provided', () => {
      const { result } = renderHook(() => 
        useExternalBlocStore(IsolatedTestCubit, { id: 'custom-id' })
      )

      expect(result.current.instance.current?._id).toBe('custom-id')
    })
  })

  describe('Error Handling', () => {
    it('should handle listener errors gracefully', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      const { result } = renderHook(() => useExternalBlocStore(TestCubit))

      const errorListener = vi.fn(() => {
        throw new Error('Test error')
      })

      const unsubscribe = result.current.externalStore.subscribe(errorListener)

      act(() => {
        result.current.instance.current?.increment()
      })

      expect(errorListener).toHaveBeenCalled()
      expect(consoleError).toHaveBeenCalledWith(
        'Listener error in useExternalBlocStore:',
        expect.any(Error)
      )

      unsubscribe()
      consoleError.mockRestore()
    })

    it('should return undefined when no instance exists', () => {
      const { result } = renderHook(() => useExternalBlocStore(TestCubit))
      
      // Force instance to be null
      result.current.instance.current = null

      expect(result.current.externalStore.getSnapshot()).toBeUndefined()
      expect(result.current.externalStore.getServerSnapshot?.()).toBeUndefined()
    })
  })
})