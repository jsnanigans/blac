import { render, screen, act } from '@testing-library/react';
import useBloc from '../src/useBloc';
import { Cubit } from '@blac/core';
import React from 'react';
import { globalComponentTracker } from '../src/ComponentDependencyTracker';

interface SharedState {
  counter: number;
  text: string;
  flag: boolean;
  metadata: {
    timestamp: number;
    version: string;
  };
}

/**
 * Shared cubit instance - NOT isolated so all components use the same instance
 */
class SharedTestCubit extends Cubit<SharedState> {
  // No static isolated = true, so this is shared across components
  
  constructor() {
    super({
      counter: 0,
      text: 'initial',
      flag: false,
      metadata: {
        timestamp: Date.now(),
        version: '1.0.0'
      }
    });
  }

  incrementCounter = () => {
    this.patch({ counter: this.state.counter + 1 });
  };

  updateText = (newText: string) => {
    this.patch({ text: newText });
  };

  toggleFlag = () => {
    this.patch({ flag: !this.state.flag });
  };

  updateTimestamp = () => {
    this.patch({ 
      metadata: { 
        ...this.state.metadata, 
        timestamp: Date.now() 
      } 
    });
  };

  get textLength(): number {
    return this.state.text.length;
  }

  get formattedCounter(): string {
    return `Count: ${this.state.counter}`;
  }
}

describe('Multi-Component Shared Cubit Dependency Tracking', () => {
  beforeEach(() => {
    globalComponentTracker.cleanup();
  });

  it('should isolate re-renders when multiple components use same cubit but access different properties', () => {
    let counterOnlyRenders = 0;
    let textOnlyRenders = 0;
    let flagOnlyRenders = 0;
    let getterOnlyRenders = 0;
    let noStateRenders = 0;
    let multiplePropsRenders = 0;

    // Component that only accesses counter
    const CounterOnlyComponent: React.FC = React.memo(() => {
      counterOnlyRenders++;
      const [state] = useBloc(SharedTestCubit);
      return <span data-testid="counter-only">{state.counter}</span>;
    });

    // Component that only accesses text
    const TextOnlyComponent: React.FC = React.memo(() => {
      textOnlyRenders++;
      const [state] = useBloc(SharedTestCubit);
      return <span data-testid="text-only">{state.text}</span>;
    });

    // Component that only accesses flag
    const FlagOnlyComponent: React.FC = React.memo(() => {
      flagOnlyRenders++;
      const [state] = useBloc(SharedTestCubit);
      return <span data-testid="flag-only">{state.flag ? 'true' : 'false'}</span>;
    });

    // Component that only accesses a getter
    const GetterOnlyComponent: React.FC = React.memo(() => {
      getterOnlyRenders++;
      const [, cubit] = useBloc(SharedTestCubit);
      return <span data-testid="getter-only">{cubit.textLength}</span>;
    });

    // Component that doesn't access state at all
    const NoStateComponent: React.FC = React.memo(() => {
      noStateRenders++;
      const [, cubit] = useBloc(SharedTestCubit);
      return (
        <div>
          <span data-testid="no-state">No state accessed</span>
          <button data-testid="increment" onClick={cubit.incrementCounter}>
            Increment
          </button>
          <button data-testid="update-text" onClick={() => cubit.updateText('updated')}>
            Update Text
          </button>
          <button data-testid="toggle-flag" onClick={cubit.toggleFlag}>
            Toggle Flag
          </button>
        </div>
      );
    });

    // Component that accesses multiple properties
    const MultiplePropsComponent: React.FC = React.memo(() => {
      multiplePropsRenders++;
      const [state] = useBloc(SharedTestCubit);
      return (
        <span data-testid="multiple-props">
          {state.counter}-{state.text}
        </span>
      );
    });

    const App: React.FC = () => (
      <div>
        <CounterOnlyComponent />
        <TextOnlyComponent />
        <FlagOnlyComponent />
        <GetterOnlyComponent />
        <NoStateComponent />
        <MultiplePropsComponent />
      </div>
    );

    render(<App />);

    // Initial renders - all should render once
    expect(counterOnlyRenders).toBe(1);
    expect(textOnlyRenders).toBe(1);
    expect(flagOnlyRenders).toBe(1);
    expect(getterOnlyRenders).toBe(1);
    expect(noStateRenders).toBe(1);
    expect(multiplePropsRenders).toBe(1);

    // Test 1: Increment counter
    act(() => {
      screen.getByTestId('increment').click();
    });

    expect(screen.getByTestId('counter-only')).toHaveTextContent('1');
    expect(screen.getByTestId('multiple-props')).toHaveTextContent('1-initial');
    
    // Only components that access counter should re-render
    expect(counterOnlyRenders).toBe(2); // Should re-render
    expect(textOnlyRenders).toBe(1);    // Should NOT re-render
    expect(flagOnlyRenders).toBe(1);    // Should NOT re-render  
    expect(getterOnlyRenders).toBe(1);  // Should NOT re-render (getter doesn't depend on counter)
    expect(noStateRenders).toBe(1);     // Should NOT re-render
    expect(multiplePropsRenders).toBe(2); // Should re-render (accesses counter)

    // Test 2: Update text
    act(() => {
      screen.getByTestId('update-text').click();
    });

    expect(screen.getByTestId('text-only')).toHaveTextContent('updated');
    expect(screen.getByTestId('getter-only')).toHaveTextContent('7'); // 'updated' has 7 chars
    expect(screen.getByTestId('multiple-props')).toHaveTextContent('1-updated');

    // Only components that access text should re-render
    expect(counterOnlyRenders).toBe(2); // Should NOT re-render
    expect(textOnlyRenders).toBe(2);    // Should re-render
    expect(flagOnlyRenders).toBe(1);    // Should NOT re-render
    expect(getterOnlyRenders).toBe(2);  // Should re-render (getter depends on text)
    expect(noStateRenders).toBe(1);     // Should NOT re-render
    expect(multiplePropsRenders).toBe(3); // Should re-render (accesses text)

    // Test 3: Toggle flag
    act(() => {
      screen.getByTestId('toggle-flag').click();
    });

    expect(screen.getByTestId('flag-only')).toHaveTextContent('true');

    // Only components that access flag should re-render
    expect(counterOnlyRenders).toBe(2); // Should NOT re-render
    expect(textOnlyRenders).toBe(2);    // Should NOT re-render
    expect(flagOnlyRenders).toBe(2);    // Should re-render
    expect(getterOnlyRenders).toBe(2);  // Should NOT re-render
    expect(noStateRenders).toBe(1);     // Should NOT re-render
    expect(multiplePropsRenders).toBe(3); // Should NOT re-render (doesn't access flag)
  });

  it('should track nested property access correctly', () => {
    let metadataRenders = 0;
    let timestampRenders = 0;
    let versionRenders = 0;

    const MetadataComponent: React.FC = React.memo(() => {
      metadataRenders++;
      const [state] = useBloc(SharedTestCubit);
      return <span data-testid="metadata">{JSON.stringify(state.metadata)}</span>;
    });

    const TimestampOnlyComponent: React.FC = React.memo(() => {
      timestampRenders++;
      const [state] = useBloc(SharedTestCubit);
      return <span data-testid="timestamp">{state.metadata.timestamp}</span>;
    });

    const VersionOnlyComponent: React.FC = React.memo(() => {
      versionRenders++;
      const [state] = useBloc(SharedTestCubit);
      return <span data-testid="version">{state.metadata.version}</span>;
    });

    const Controller: React.FC = () => {
      const [, cubit] = useBloc(SharedTestCubit);
      return (
        <button data-testid="update-timestamp" onClick={cubit.updateTimestamp}>
          Update Timestamp
        </button>
      );
    };

    const App: React.FC = () => (
      <div>
        <MetadataComponent />
        <TimestampOnlyComponent />
        <VersionOnlyComponent />
        <Controller />
      </div>
    );

    render(<App />);

    // Initial renders
    expect(metadataRenders).toBe(1);
    expect(timestampRenders).toBe(1);
    expect(versionRenders).toBe(1);

    // Update timestamp - only components accessing timestamp should re-render
    act(() => {
      screen.getByTestId('update-timestamp').click();
    });

    // All components that access metadata or timestamp should re-render
    // Note: This test might reveal if the current implementation can handle 
    // fine-grained nested property dependency tracking
    expect(metadataRenders).toBe(2);    // Should re-render (accesses entire metadata object)
    expect(timestampRenders).toBe(2);   // Should re-render (accesses timestamp)
    expect(versionRenders).toBe(1);     // Should NOT re-render (only accesses version)
  });

  it('should handle components that destructure vs access properties', () => {
    let destructureRenders = 0;
    let propertyAccessRenders = 0;

    // Component that destructures specific properties
    const DestructureComponent: React.FC = React.memo(() => {
      destructureRenders++;
      const [{ counter, text }] = useBloc(SharedTestCubit);
      return <span data-testid="destructure">{counter}-{text}</span>;
    });

    // Component that accesses properties on the state object
    const PropertyAccessComponent: React.FC = React.memo(() => {
      propertyAccessRenders++;
      const [state] = useBloc(SharedTestCubit);
      return <span data-testid="property-access">{state.counter}-{state.text}</span>;
    });

    const Controller: React.FC = () => {
      const [, cubit] = useBloc(SharedTestCubit);
      return (
        <div>
          <button data-testid="increment" onClick={cubit.incrementCounter}>
            Increment
          </button>
          <button data-testid="toggle-flag" onClick={cubit.toggleFlag}>
            Toggle Flag
          </button>
        </div>
      );
    };

    const App: React.FC = () => (
      <div>
        <DestructureComponent />
        <PropertyAccessComponent />
        <Controller />
      </div>
    );

    render(<App />);

    // Initial renders
    expect(destructureRenders).toBe(1);
    expect(propertyAccessRenders).toBe(1);

    // Update counter - both should re-render
    act(() => {
      screen.getByTestId('increment').click();
    });

    expect(destructureRenders).toBe(2);      // Should re-render
    expect(propertyAccessRenders).toBe(2);   // Should re-render

    // Toggle flag - neither should re-render (they don't access flag)
    act(() => {
      screen.getByTestId('toggle-flag').click();
    });

    expect(destructureRenders).toBe(2);      // Should NOT re-render
    expect(propertyAccessRenders).toBe(2);   // Should NOT re-render
  });
});