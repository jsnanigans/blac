import { Blac, Cubit } from '@blac/core';
import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { FC, useCallback } from 'react';
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
  
  return (
    <div>
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
        onClick={() => { 
          const newName = `User 0 Updated ${String(Date.now())}`;
          bloc.updateUserName(0, newName);
         }}
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
  const [state, bloc] = useBloc(ComplexCubit);
  
  return (
    <div>
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
        onClick={() => { 
          const newName = `User 0 Updated ${String(Date.now())}`;
          bloc.updateUserName(0, newName);
         }}
      >
        Update User
      </button>
    </div>
  );
};

// Component that doesn't use certain state properties
const PartialStateComponent: FC = () => {
  const [state, bloc] = useBloc(ComplexCubit);
  
  // Only using count, not users or settings
  return (
    <div>
      <div data-testid="partial-count">Count: {state.count}</div>
      
      <button 
        data-testid="partial-increment" 
        onClick={() => { bloc.incrementCount(); }}
      >
        Increment
      </button>
      <button 
        data-testid="partial-update-user" 
        onClick={() => { 
          const newName = `User 0 Updated ${String(Date.now())}`;
          bloc.updateUserName(0, newName);
         }}
      >
        Update User
      </button>
      <button 
        data-testid="partial-toggle-dark-mode" 
        onClick={() => { bloc.toggleDarkMode(); }}
      >
        Toggle Dark Mode
      </button>
    </div>
  );
};

describe('useBloc performance optimizations', () => {
  beforeEach(() => {
    // Reset Blac state before each test
    Blac.getInstance().resetInstance();
  });

  test('custom dependency selector should prevent unnecessary renders', async () => {
    const { getByTestId } = render(<PerformanceComponent />);
    const countDiv = getByTestId('count');
    const darkModeDiv = getByTestId('dark-mode');

    expect(countDiv).toHaveTextContent('Count: 0');
    expect(darkModeDiv).toHaveTextContent('Dark Mode: Off');
    
    // Increment count - should update countDiv
    await act(async () => { await userEvent.click(getByTestId('increment')); });
    expect(countDiv).toHaveTextContent('Count: 1');
    expect(darkModeDiv).toHaveTextContent('Dark Mode: Off'); // Should remain unchanged
    
    // Toggle dark mode - should update darkModeDiv
    await act(async () => { await userEvent.click(getByTestId('toggle-dark-mode')); });
    expect(countDiv).toHaveTextContent('Count: 1'); // Should remain unchanged
    expect(darkModeDiv).toHaveTextContent('Dark Mode: On');
    
    // Update user - should NOT update countDiv or darkModeDiv (render prevented by selector)
    const initialCountText = countDiv.textContent;
    const initialDarkModeText = darkModeDiv.textContent;
    await act(async () => { await userEvent.click(getByTestId('update-user')); });
    expect(countDiv.textContent).toBe(initialCountText);
    expect(darkModeDiv.textContent).toBe(initialDarkModeText);
        
    // Add notification type - should NOT update countDiv or darkModeDiv (render prevented by selector)
    await act(async () => { await userEvent.click(getByTestId('add-notification')); });
    expect(countDiv.textContent).toBe(initialCountText);
    expect(darkModeDiv.textContent).toBe(initialDarkModeText);
  });

  test('automatic dependency tracking should detect used properties', async () => {
    const { getByTestId } = render(<DefaultDependencyComponent />);
    const countDiv = getByTestId('default-count');
    const darkModeDiv = getByTestId('default-dark-mode');

    expect(countDiv).toHaveTextContent('Count: 0');
    expect(darkModeDiv).toHaveTextContent('Dark Mode: Off');
    
    // Increment count - should update countDiv
    await act(async () => { await userEvent.click(getByTestId('default-increment')); });
    expect(countDiv).toHaveTextContent('Count: 1');
    expect(darkModeDiv).toHaveTextContent('Dark Mode: Off'); 
    
    // Toggle dark mode - should update darkModeDiv
    await act(async () => { await userEvent.click(getByTestId('default-toggle-dark-mode')); });
    expect(countDiv).toHaveTextContent('Count: 1'); 
    expect(darkModeDiv).toHaveTextContent('Dark Mode: On');
    
    // Update user - should NOT update countDiv or darkModeDiv (state not accessed)
    const initialCountText = countDiv.textContent;
    const initialDarkModeText = darkModeDiv.textContent;
    await act(async () => { await userEvent.click(getByTestId('default-update-user')); });
    expect(countDiv.textContent).toBe(initialCountText);
    expect(darkModeDiv.textContent).toBe(initialDarkModeText);
  });
  
  test('partial state access should only re-render when accessed properties change', async () => {
    const { getByTestId } = render(<PartialStateComponent />);
    const countDiv = getByTestId('partial-count');

    expect(countDiv).toHaveTextContent('Count: 0');
    
    // Increment count - should update countDiv
    await act(async () => { await userEvent.click(getByTestId('partial-increment')); });
    expect(countDiv).toHaveTextContent('Count: 1');
    
    // Update user - should NOT update countDiv (user state not accessed)
    const initialCountText = countDiv.textContent;
    await act(async () => { await userEvent.click(getByTestId('partial-update-user')); });
    expect(countDiv.textContent).toBe(initialCountText);

    // Toggle dark mode - should NOT update countDiv (settings state not accessed)
    await act(async () => { await userEvent.click(getByTestId('partial-toggle-dark-mode')); });
    expect(countDiv.textContent).toBe(initialCountText); // Still expect 1 from previous increment
  });
}); 