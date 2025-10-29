// ExampleBloc state = { count: number; error: boolean; errorMessage: string }

function Comp() {
  // useBloc returns `state` as a proxy
  const [state, setState] = useBloc(ExampleBloc);

  // when component rerenders, we clear "reset" which fields are accessed, accessedList=[]

  useEffect(() => {
    // errorMessage is accessed here, but useEffect runs after render phase, so its not tracked
    // after jsx is returned we are done tracking state accesses for this render
    console.log('Component mounted', state.errorMessage);
  }, []);

  // adds `error` to accessedList. accessedList = ['error']
  if (state.error) {
    // adds `errorMessage` to accessedList. accessedList = ['error', 'errorMessage']
    // when this component will rerender only if `error` or `errorMessage` changes
    return <div>Error: {state.errorMessage}</div>;
  }

  // from somewhere else, we update the state, which makes the `error` falsy, which causes a rerender

  // adds `count` to accessedList. accessedList = ['error', 'count']
  // the errorMessage is not accessed, so changes to it will NOT cause rerender
  // after all the code runs we are done
  return <div>{state.count}</div>;
}

/*
during the render phase, we track which fields are accessed on the state proxy
┌─ RENDER PHASE (interruptible) ─────────────────────┐
│ 1. Function body executes                          │
│    - useState/useReducer (initialize)              │
│    - useContext (read)                             │
│    - useRef (create/return)                        │
│    - useMemo (compute)                             │
│    - useCallback (create)                          │
│    - useTransition (return state)                  │
│    - useDeferredValue (return value)               │
│    - useId (return ID)                             │
│    - useSyncExternalStore (subscribe)              │
│    - useOptimistic (return state) [React 19]       │
│    - useActionState (return state) [React 19]      │
│    - use (suspend or read) [React 19]              │
│    - useDebugValue (DevTools only)                 │
│ 2. Return JSX                                      │
└────────────────────────────────────────────────────┘

in the commit phase, we run effects and update the DOM, we do NOT track state accesses here
┌─ COMMIT PHASE (synchronous) ───────────────────────┐
│ 3. useInsertionEffect callbacks [React 18+]        │
│ 4. React commits to real DOM                       │
│ 5. useLayoutEffect callbacks                       │
│ 6. useImperativeHandle (expose refs)               │
└────────────────────────────────────────────────────┘

7. ═══ BROWSER PAINTS ═══

in the post-paint phase, we run effects that don't block painting, we do NOT track state accesses here
┌─ POST-PAINT (async) ───────────────────────────────┐
│ 8. useEffect callbacks                             │
└────────────────────────────────────────────────────┘

*/
