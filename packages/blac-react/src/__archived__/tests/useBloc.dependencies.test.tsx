import { Cubit, Blac } from '@blac/core';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import useBloc from '../useBloc';

interface User {
  id: number;
  name: string;
  age: number;
}

interface AppState {
  users: User[];
  selectedId: number | null;
  count: number;
}

class AppCubit extends Cubit<AppState> {
  constructor() {
    super({
      users: [
        { id: 1, name: 'Alice', age: 25 },
        { id: 2, name: 'Bob', age: 30 },
      ],
      selectedId: null,
      count: 0,
    });
  }

  updateUserName = (id: number, name: string) => {
    this.patch({
      users: this.state.users.map((u) => (u.id === id ? { ...u, name } : u)),
    });
  };

  selectUser = (id: number) => {
    this.patch({ selectedId: id });
  };

  incrementCount = () => {
    this.patch({ count: this.state.count + 1 });
  };
}

describe('useBloc dependencies option', () => {
  beforeEach(() => {
    // Clear any existing instances
    (AppCubit as any).isolated = false;
  });

  afterEach(() => {
    Blac.resetInstance();
  });

  it('should only re-render when dependency values change', async () => {
    let renderCount = 0;

    const UserRow = React.memo(({ userId }: { userId: number }) => {
      const [state] = useBloc(AppCubit, {
        dependencies: (bloc) => {
          const user = bloc.state.users.find((u) => u.id === userId);
          return [user?.name, user?.age];
        },
      });

      renderCount++;

      const user = state.users.find((u) => u.id === userId);

      return (
        <div>
          <div data-testid={`user-${userId}`}>
            {user?.name} - {user?.age}
          </div>
          <div data-testid="render-count">{renderCount}</div>
        </div>
      );
    });

    function App() {
      const [, bloc] = useBloc(AppCubit);

      return (
        <div>
          <UserRow userId={1} />
          <button onClick={() => bloc.updateUserName(2, 'Charlie')}>
            Update User 2
          </button>
          <button onClick={() => bloc.incrementCount()}>Increment Count</button>
        </div>
      );
    }

    render(<App />);

    // Initial render
    expect(screen.getByTestId('user-1')).toHaveTextContent('Alice - 25');
    expect(screen.getByTestId('render-count')).toHaveTextContent('1');

    // Update user 2 (should NOT trigger re-render of UserRow userId=1)
    screen.getByText('Update User 2').click();
    await waitFor(() => {
      expect(screen.getByTestId('render-count')).toHaveTextContent('1'); // Should still be 1
    });

    // Increment count (should NOT trigger re-render of UserRow)
    screen.getByText('Increment Count').click();
    await waitFor(() => {
      expect(screen.getByTestId('render-count')).toHaveTextContent('1'); // Should still be 1
    });
  });

  it('should re-render when dependency values actually change', async () => {
    let renderCount = 0;

    function UserRow({ userId }: { userId: number }) {
      const [state] = useBloc(AppCubit, {
        dependencies: (bloc) => {
          const user = bloc.state.users.find((u) => u.id === userId);
          return [user?.name, user?.age];
        },
      });

      renderCount++;

      const user = state.users.find((u) => u.id === userId);

      return (
        <div>
          <div data-testid={`user-${userId}`}>
            {user?.name} - {user?.age}
          </div>
          <div data-testid="render-count">{renderCount}</div>
        </div>
      );
    }

    function App() {
      const [, bloc] = useBloc(AppCubit);

      return (
        <div>
          <UserRow userId={1} />
          <button onClick={() => bloc.updateUserName(1, 'Alicia')}>
            Update User 1
          </button>
        </div>
      );
    }

    render(<App />);

    // Initial render
    expect(screen.getByTestId('user-1')).toHaveTextContent('Alice - 25');
    expect(screen.getByTestId('render-count')).toHaveTextContent('1');

    // Update user 1 (SHOULD trigger re-render)
    screen.getByText('Update User 1').click();
    await waitFor(() => {
      expect(screen.getByTestId('user-1')).toHaveTextContent('Alicia - 25');
      expect(screen.getByTestId('render-count')).toHaveTextContent('2');
    });
  });

  it('should not re-render when returning same object reference', async () => {
    let renderCount = 0;

    function UserRow({ userId }: { userId: number }) {
      const [state] = useBloc(AppCubit, {
        dependencies: (bloc) => {
          // Return the actual user object
          const user = bloc.state.users.find((u) => u.id === userId);
          return [user];
        },
      });

      renderCount++;

      const user = state.users.find((u) => u.id === userId);

      return (
        <div>
          <div data-testid={`user-${userId}`}>
            {user?.name} - {user?.age}
          </div>
          <div data-testid="render-count">{renderCount}</div>
        </div>
      );
    }

    function App() {
      const [, bloc] = useBloc(AppCubit);

      return (
        <div>
          <UserRow userId={1} />
          <button onClick={() => bloc.incrementCount()}>Increment Count</button>
        </div>
      );
    }

    render(<App />);

    // Initial render
    expect(screen.getByTestId('user-1')).toHaveTextContent('Alice - 25');
    expect(screen.getByTestId('render-count')).toHaveTextContent('1');

    // Increment count (user object reference unchanged, should NOT re-render)
    screen.getByText('Increment Count').click();
    await waitFor(() => {
      expect(screen.getByTestId('render-count')).toHaveTextContent('1');
    });
  });

  it('should re-render when object reference changes', async () => {
    let renderCount = 0;

    function UserRow({ userId }: { userId: number }) {
      const [state] = useBloc(AppCubit, {
        dependencies: (bloc) => {
          // Return the actual user object
          const user = bloc.state.users.find((u) => u.id === userId);
          return [user];
        },
      });

      renderCount++;

      const user = state.users.find((u) => u.id === userId);

      return (
        <div>
          <div data-testid={`user-${userId}`}>
            {user?.name} - {user?.age}
          </div>
          <div data-testid="render-count">{renderCount}</div>
        </div>
      );
    }

    function App() {
      const [, bloc] = useBloc(AppCubit);

      return (
        <div>
          <UserRow userId={1} />
          <button onClick={() => bloc.updateUserName(1, 'Alicia')}>
            Update User 1
          </button>
        </div>
      );
    }

    render(<App />);

    // Initial render
    expect(screen.getByTestId('user-1')).toHaveTextContent('Alice - 25');
    expect(screen.getByTestId('render-count')).toHaveTextContent('1');

    // Update user 1 (object reference changes, SHOULD re-render)
    screen.getByText('Update User 1').click();
    await waitFor(() => {
      expect(screen.getByTestId('user-1')).toHaveTextContent('Alicia - 25');
      expect(screen.getByTestId('render-count')).toHaveTextContent('2');
    });
  });
});
