import { Blac, Cubit } from 'blac-next';
import React, { FC } from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { useBloc } from '../src';

// Create a wrapper around renderToString for testing
const renderToStringWithMocks = (element: React.ReactElement) => {
  // Save original window
  const originalWindow = global.window;
  // Mock window as undefined to simulate server environment
  // @ts-expect-error - Deliberately setting window to undefined to simulate SSR
  global.window = undefined;

  try {
    return renderToString(element);
  } finally {
    // Restore original window
    global.window = originalWindow;
  }
};

// Define a simple counter cubit for testing
class CounterCubit extends Cubit<{ count: number }> {
  static isolated = true;
  
  constructor() {
    super({ count: 5 });
  }

  increment = () => {
    this.patch({ count: this.state.count + 1 });
  };
}

// Define a test component using the useBloc hook
const CounterComponent: FC = () => {
  const [state] = useBloc(CounterCubit);
  return <div data-testid="counter">Count: {state.count}</div>;
};

describe('useBloc SSR compatibility', () => {
  beforeEach(() => {
    Blac.resetInstance();
    vi.clearAllMocks();
  });

  test('should render correctly in a server environment', () => {
    // This test checks that the component can be rendered server-side without errors
    expect(() => {
      const html = renderToStringWithMocks(<CounterComponent />);
      expect(html).toContain('Count: 5');
    }).not.toThrow();
  });

  test('should use getServerSnapshot when available', () => {
    // Create a test component with the external store
    const TestComponent: FC = () => {
      // Mock useSyncExternalStore to simulate server environment
      vi.spyOn(React, 'useSyncExternalStore').mockImplementation(
        (subscribe, getSnapshot, getServerSnapshot) => {
          // Simulate being in a server environment
          if (getServerSnapshot) {
            return { count: 10 }; // Simulated server snapshot
          }
          return getSnapshot();
        }
      );
      
      const [state] = useBloc(CounterCubit);
      return <div>Count: {state.count}</div>;
    };
    
    // Render the component in a server environment
    const html = renderToStringWithMocks(<TestComponent />);
    
    // Verify that the server snapshot value was used
    expect(html).toContain('Count: 10');
  });
  
  test('should handle changes to props during SSR', () => {
    // Define a cubit that takes props
    class PropsCubit extends Cubit<{ value: string }, { initialValue: string }> {
      static isolated = true;
      
      constructor(props: { initialValue: string }) {
        super({ value: props.initialValue });
      }
      
      updateValue = (value: string) => {
        this.patch({ value });
      };
    }
    
    // Define a component that uses the cubit with props
    const PropsComponent: FC<{ initialValue: string }> = ({ initialValue }) => {
      const [state] = useBloc(PropsCubit, {
        props: { initialValue }
      });
      
      return <div>Value: {state.value}</div>;
    };
    
    // Render with one set of props
    const html1 = renderToStringWithMocks(<PropsComponent initialValue="initial" />);
    expect(html1).toContain('Value: initial');
    
    // Render with different props
    const html2 = renderToStringWithMocks(<PropsComponent initialValue="different" />);
    expect(html2).toContain('Value: different');
  });
}); 