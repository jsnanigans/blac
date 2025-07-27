import { FC, ReactNode } from 'react';
import { renderToString } from 'react-dom/server';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Blac, Cubit } from '../../blac/src';
import { useBloc } from '../src';

// Create a wrapper around renderToString for testing
const renderToStringWithMocks = (element: ReactNode) => {
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

// Another simple cubit
class MessageCubit extends Cubit<{ message: string }> {
  static isolated = true;
  constructor() {
    super({ message: 'Hello' });
  }

  setMessage = (message: string) => {
    this.patch({ message });
  };
}

// Define a test component using the useBloc hook
const CounterComponent: FC = () => {
  const [state] = useBloc(CounterCubit);
  // Note: React adds comments during SSR for certain elements/bindings
  return <div data-testid="counter">Count: {state.count}</div>;
};

// Component using multiple blocs
const MultiBlocComponent: FC = () => {
  const [counterState] = useBloc(CounterCubit);
  const [messageState] = useBloc(MessageCubit);
  return (
    <div>
      <span>Count: {counterState.count}</span>
      <span>Message: {messageState.message}</span>
    </div>
  );
};

describe('useBloc SSR compatibility', () => {
  beforeEach(() => {
    Blac.resetInstance();
    vi.restoreAllMocks(); // Use restoreAllMocks to ensure spies are cleaned up
  });

  test('should use initial state from constructor during SSR', () => {
    // This test confirms that in an SSR environment (window undefined),
    // the hook uses the initial state provided by the Cubit's constructor.
    const html = renderToStringWithMocks(<CounterComponent />);
    // Check for the state defined in CounterCubit constructor ({ count: 5 })
    expect(html).toContain('<div data-testid="counter">Count: <!-- -->5</div>');
  });

  test('should share blocs on SSR', () => {
    // Define a cubit that takes props
    class PropsCubit extends Cubit<{ value: string }> {
      constructor() {
        super({ value: 'initial' });
      }

      updateValue = (value: string) => {
        this.patch({ value });
      };
    }

    // Define a component that uses the cubit with props
    const PropsComponent: FC = () => {
      const [state] = useBloc(PropsCubit);

      return <>Value: {state.value}</>;
    };

    const html1 = renderToStringWithMocks(
      <PropsComponent />,
    );
    expect(html1).toContain('Value: <!-- -->initial');

    const bloc = Blac.getBloc(PropsCubit);
    bloc.updateValue('different');

    const html2 = renderToStringWithMocks(
      <PropsComponent />,
    );
    expect(html2).toContain('Value: <!-- -->different');

    const html3 = renderToStringWithMocks(
      <PropsComponent />,
    );
    expect(html3).toContain('Value: <!-- -->different');
  });

  test('should not share isolated blocs on SSR', () => {
    // Define a cubit that takes props
    class PropsCubit extends Cubit<{ value: string }, { initialValue: string }> {
      static isolated = true;
      constructor({ initialValue }: { initialValue: string }) {
        console.log('PropsCubit constructor', initialValue);
        super({ value: initialValue });
      }

      updateValue = (value: string) => {
        this.patch({ value });
      };
    }

    // Define a component that uses the cubit with props
    const PropsComponent: FC<{ initialValue: string }> = ({ initialValue }) => {
      const [state] = useBloc(PropsCubit, {
        props: { initialValue },
      });

      return <>Value: {state.value}</>;
    };

    // Render with one set of props
    const html1 = renderToStringWithMocks(
      <PropsComponent initialValue="initial" />,
    );
    expect(html1).toContain('Value: <!-- -->initial');

    const html2 = renderToStringWithMocks(
      <PropsComponent initialValue="different" />,
    );
    expect(html2).toContain('Value: <!-- -->different');
  });

  test('should handle multiple blocs in one component during SSR', () => {
    const html = renderToStringWithMocks(<MultiBlocComponent />);
    expect(html).toContain('<span>Count: <!-- -->5</span>');
    expect(html).toContain('<span>Message: <!-- -->Hello</span>');
  });
}); 