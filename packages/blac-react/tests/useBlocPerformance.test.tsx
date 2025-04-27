import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Blac, Cubit } from 'blac-next';
import React, { FC, useCallback, useState } from 'react';
import { beforeEach, describe, expect, test } from 'vitest';
import { useBloc } from '../src';

// Define a complex state structure for testing
interface ComplexState {
  count: number;
  users: {
    id: number;
    name: string;
    status: 'active' | 'inactive';
  }[];
  settings: {
    darkMode: boolean;
    notifications: {
      enabled: boolean;
      types: string[];
    };
  };
}

// Create a cubit with many state properties to test selector performance
class ComplexCubit extends Cubit<ComplexState> {
  static isolated = true;
  
  constructor() {
    super({
      count: 0,
      users: Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `User ${String(i)}`,
        status: i % 2 === 0 ? 'active' : 'inactive'
      })),
      settings: {
        darkMode: false,
        notifications: {
          enabled: true,
          types: ['email', 'push', 'sms']
        }
      }
    });
  }

  incrementCount = () => {
    this.patch({ count: this.state.count + 1 });
  };
  
  toggleDarkMode = () => {
    this.patch({
      settings: {
        ...this.state.settings,
        darkMode: !this.state.settings.darkMode
      }
    });
  };
  
  updateUserName = (id: number, name: string) => {
    this.patch({
      users: this.state.users.map(user => 
        user.id === id ? { ...user, name } : user
      )
    });
  };
  
  addNotificationType = (type: string) => {
    this.patch({
      settings: {
        ...this.state.settings,
        notifications: {
          ...this.state.settings.notifications,
          types: [...this.state.settings.notifications.types, type]
        }
      }
    });
  };
}

// Test component with custom dependency selector
const PerformanceComponent: FC = () => {
  const [renderCount, setRenderCount] = useState(0);
  
  // Use custom dependency selector to optimize rendering
  const dependencySelector = useCallback((newState: ComplexState) => {
    return [
      [newState.count],
      [newState.settings.darkMode]
    ];
  }, []);
  
  const [state, bloc] = useBloc(ComplexCubit, {
    dependencySelector
  });
  
  // Increment render count on each render
  React.useEffect(() => {
    setRenderCount(prev => prev + 1);
  }, []);
  
  return (
    <div>
      <div data-testid="render-count">Renders: {renderCount}</div>
      <div data-testid="count">Count: {state.count}</div>
      <div data-testid="dark-mode">
        Dark Mode: {state.settings.darkMode ? 'On' : 'Off'}
      </div>
      <button 
        data-testid="increment" 
        onClick={() => { bloc.incrementCount(); }}
      >
        Increment
      </button>
      <button 
        data-testid="toggle-dark-mode" 
        onClick={() => { bloc.toggleDarkMode(); }}
      >
        Toggle Dark Mode
      </button>
      <button 
        data-testid="update-user" 
        onClick={() => { bloc.updateUserName(0, `User 0 Updated ${String(Date.now())}`); }}
      >
        Update User
      </button>
      <button 
        data-testid="add-notification" 
        onClick={() => { bloc.addNotificationType(`notification-${String(Date.now())}`); }}
      >
        Add Notification
      </button>
    </div>
  );
};

// Regular component with default dependency tracking
const DefaultDependencyComponent: FC = () => {
  const [renderCount, setRenderCount] = useState(0);
  
  const [state, bloc] = useBloc(ComplexCubit);
  
  // Increment render count on each render
  React.useEffect(() => {
    setRenderCount(prev => prev + 1);
  }, []);
  
  return (
    <div>
      <div data-testid="default-render-count">Renders: {renderCount}</div>
      <div data-testid="default-count">Count: {state.count}</div>
      <div data-testid="default-dark-mode">
        Dark Mode: {state.settings.darkMode ? 'On' : 'Off'}
      </div>
      <button 
        data-testid="default-increment" 
        onClick={() => { bloc.incrementCount(); }}
      >
        Increment
      </button>
      <button 
        data-testid="default-toggle-dark-mode" 
        onClick={() => { bloc.toggleDarkMode(); }}
      >
        Toggle Dark Mode
      </button>
      <button 
        data-testid="default-update-user" 
        onClick={() => { bloc.updateUserName(0, `User 0 Updated ${String(Date.now())}`); }}
      >
        Update User
      </button>
    </div>
  );
};

// Component that doesn't use certain state properties
const PartialStateComponent: FC = () => {
  const [renderCount, setRenderCount] = useState(0);
  
  const [state, bloc] = useBloc(ComplexCubit);
  
  // Increment render count on each render
  React.useEffect(() => {
    setRenderCount(prev => prev + 1);
  }, []);
  
  // Only using count, not users or settings
  return (
    <div>
      <div data-testid="partial-render-count">Renders: {renderCount}</div>
      <div data-testid="partial-count">Count: {state.count}</div>
      
      <button 
        data-testid="partial-increment" 
        onClick={() => { bloc.incrementCount(); }}
      >
        Increment
      </button>
      <button 
        data-testid="partial-update-user" 
        onClick={() => { bloc.updateUserName(0, `User 0 Updated ${String(Date.now())}`); }}
      >
        Update User
      </button>
    </div>
  );
};

describe('useBloc performance optimizations', () => {
  beforeEach(() => {
    Blac.resetInstance();
  });

  test('custom dependency selector should prevent unnecessary renders', async () => {
    const { getByTestId } = render(<PerformanceComponent />);
    
    // Get initial render count
    const initialRenderCount = Number(getByTestId('render-count').textContent?.match(/\d+/)?.[0] || '0');
    
    // Increment count - should cause a re-render since it's in dependency array
    await userEvent.click(getByTestId('increment'));
    
    let newRenderCount = Number(getByTestId('render-count').textContent?.match(/\d+/)?.[0] || '0');
    expect(newRenderCount).toBe(initialRenderCount + 1);
    
    // Toggle dark mode - should cause a re-render since it's in dependency array
    await userEvent.click(getByTestId('toggle-dark-mode'));
    
    newRenderCount = Number(getByTestId('render-count').textContent?.match(/\d+/)?.[0] || '0');
    expect(newRenderCount).toBe(initialRenderCount + 2);
    
    // Update user - should NOT cause a re-render since it's not in dependency array
    await userEvent.click(getByTestId('update-user'));
    
    newRenderCount = Number(getByTestId('render-count').textContent?.match(/\d+/)?.[0] || '0');
    expect(newRenderCount).toBe(initialRenderCount + 2);
    
    // Add notification - should NOT cause a re-render since it's not in dependency array
    await userEvent.click(getByTestId('add-notification'));
    
    newRenderCount = Number(getByTestId('render-count').textContent?.match(/\d+/)?.[0] || '0');
    expect(newRenderCount).toBe(initialRenderCount + 2);
  });

  test('automatic dependency tracking should detect used properties', async () => {
    const { getByTestId } = render(<DefaultDependencyComponent />);
    
    // Get initial render count
    const initialRenderCount = Number(getByTestId('default-render-count').textContent?.match(/\d+/)?.[0] || '0');
    
    // Increment count - should cause a re-render since it's used in the component
    await userEvent.click(getByTestId('default-increment'));
    
    let newRenderCount = Number(getByTestId('default-render-count').textContent?.match(/\d+/)?.[0] || '0');
    expect(newRenderCount).toBe(initialRenderCount + 1);
    
    // Toggle dark mode - should cause a re-render since darkMode is used in the component
    await userEvent.click(getByTestId('default-toggle-dark-mode'));
    
    newRenderCount = Number(getByTestId('default-render-count').textContent?.match(/\d+/)?.[0] || '0');
    expect(newRenderCount).toBe(initialRenderCount + 2);
    
    // Update user - should NOT cause a re-render since individual users aren't accessed in the component
    await userEvent.click(getByTestId('default-update-user'));
    
    newRenderCount = Number(getByTestId('default-render-count').textContent?.match(/\d+/)?.[0] || '0');
    expect(newRenderCount).toBe(initialRenderCount + 2);
  });

  test('partial state access should only re-render when accessed properties change', async () => {
    const { getByTestId } = render(<PartialStateComponent />);
    
    // Get initial render count
    const initialRenderCount = Number(getByTestId('partial-render-count').textContent?.match(/\d+/)?.[0] || '0');
    
    // Increment count - should cause a re-render since count is used in the component
    await userEvent.click(getByTestId('partial-increment'));
    
    let newRenderCount = Number(getByTestId('partial-render-count').textContent?.match(/\d+/)?.[0] || '0');
    expect(newRenderCount).toBe(initialRenderCount + 1);
    
    // Update user - should NOT cause a re-render since individual users aren't accessed
    await userEvent.click(getByTestId('partial-update-user'));
    
    newRenderCount = Number(getByTestId('partial-render-count').textContent?.match(/\d+/)?.[0] || '0');
    expect(newRenderCount).toBe(initialRenderCount + 1);
    
    // Get the bloc instance and directly modify settings
    const bloc = Blac.getBloc(ComplexCubit);
    bloc.toggleDarkMode();
    
    // Component shouldn't re-render since settings aren't used
    newRenderCount = Number(getByTestId('partial-render-count').textContent?.match(/\d+/)?.[0] || '0');
    expect(newRenderCount).toBe(initialRenderCount + 1);
  });
}); 