import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Cubit } from '@blac/core';
import { useBloc } from '../useBloc';

interface Profile {
  id: string;
  name: string;
  active: boolean;
}

interface ProfileState {
  profiles: Profile[];
}

class ProfileCubit extends Cubit<
  ProfileState,
  { initialProfiles?: Profile[] }
> {
  constructor(props?: { initialProfiles?: Profile[] }) {
    super({ profiles: props?.initialProfiles || [] });
  }

  get filteredProfiles(): Profile[] {
    return this.state.profiles.filter((profile) => profile.active);
  }

  addProfile = (profile: Profile) => {
    this.emit({
      profiles: [...this.state.profiles, profile],
    });
  };

  updateProfiles = (profiles: Profile[]) => {
    this.emit({ profiles });
  };
}

describe('useBloc - filtered list with getter', () => {
  const initialProfiles: Profile[] = [
    { id: '1', name: 'Alice', active: true },
    { id: '2', name: 'Bob', active: true },
    { id: '3', name: 'Charlie', active: false },
  ];

  beforeEach(() => {
    // Clear any existing instances
    ProfileCubit.clear();
  });

  it('should return filtered profiles through getter', () => {
    let renderCount = 0;

    function TestComponent() {
      renderCount++;
      const [state, bloc] = useBloc(ProfileCubit, {
        props: { initialProfiles },
      });

      return (
        <div>
          <div data-testid="total-count">{state.profiles.length}</div>
          <div data-testid="filtered-count">{bloc.filteredProfiles.length}</div>
          <div data-testid="render-count">{renderCount}</div>
        </div>
      );
    }

    render(<TestComponent />);

    // Initial state: 3 total profiles, 2 active
    expect(screen.getByTestId('total-count').textContent).toBe('3');
    expect(screen.getByTestId('filtered-count').textContent).toBe('2');
    expect(renderCount).toBe(1);
  });

  it('should update getter when profiles are added', async () => {
    let renderCount = 0;

    function TestComponent() {
      renderCount++;
      const [state, bloc] = useBloc(ProfileCubit, {
        props: { initialProfiles },
      });

      return (
        <div>
          <div data-testid="total-count">{state.profiles.length}</div>
          <div data-testid="filtered-count">{bloc.filteredProfiles.length}</div>
          <div data-testid="render-count">{renderCount}</div>
          <button
            onClick={() => {
              bloc.addProfile({ id: '4', name: 'David', active: true });
              bloc.addProfile({ id: '5', name: 'Eve', active: false });
            }}
          >
            Add Profiles
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    // Initial state: 3 total, 2 active
    expect(screen.getByTestId('total-count').textContent).toBe('3');
    expect(screen.getByTestId('filtered-count').textContent).toBe('2');

    // Add profiles (1 active, 1 inactive)
    screen.getByText('Add Profiles').click();

    await waitFor(() => {
      expect(screen.getByTestId('total-count').textContent).toBe('5');
      expect(screen.getByTestId('filtered-count').textContent).toBe('3');
    });
  });

  it('should render filtered profiles in a list', async () => {
    let renderCount = 0;

    function ProfileList() {
      renderCount++;
      const [state, bloc] = useBloc(ProfileCubit, {
        props: { initialProfiles },
      });

      return (
        <div>
          <div data-testid="render-count">{renderCount}</div>
          <h2>Active Profiles ({bloc.filteredProfiles.length})</h2>
          <ul data-testid="profile-list">
            {bloc.filteredProfiles.map((profile) => (
              <li key={profile.id} data-testid={`profile-${profile.id}`}>
                {profile.name}
              </li>
            ))}
          </ul>
          <button
            onClick={() => {
              const newProfiles = [
                ...state.profiles,
                { id: '4', name: 'David', active: true },
                { id: '5', name: 'Eve', active: false },
              ];
              bloc.updateProfiles(newProfiles);
            }}
          >
            Add Profiles
          </button>
        </div>
      );
    }

    render(<ProfileList />);

    // Initial render: should show 2 active profiles
    expect(screen.getByText('Active Profiles (2)')).toBeInTheDocument();
    expect(screen.getByTestId('profile-1')).toHaveTextContent('Alice');
    expect(screen.getByTestId('profile-2')).toHaveTextContent('Bob');
    expect(screen.queryByTestId('profile-3')).not.toBeInTheDocument(); // Charlie is inactive
    expect(renderCount).toBe(1);

    // Add profiles
    screen.getByText('Add Profiles').click();

    await waitFor(() => {
      // Should now show 3 active profiles
      expect(screen.getByText('Active Profiles (3)')).toBeInTheDocument();
      expect(screen.getByTestId('profile-1')).toHaveTextContent('Alice');
      expect(screen.getByTestId('profile-2')).toHaveTextContent('Bob');
      expect(screen.getByTestId('profile-4')).toHaveTextContent('David');
      expect(screen.queryByTestId('profile-3')).not.toBeInTheDocument(); // Charlie still inactive
      expect(screen.queryByTestId('profile-5')).not.toBeInTheDocument(); // Eve is inactive
    });
  });

  it('should track getter and re-render when underlying data changes', async () => {
    let renderCount = 0;

    function TestComponent() {
      renderCount++;
      const [, bloc] = useBloc(ProfileCubit, {
        props: { initialProfiles },
      });

      return (
        <div>
          <div data-testid="render-count">{renderCount}</div>
          <div data-testid="filtered-count">{bloc.filteredProfiles.length}</div>
          <button
            onClick={() => {
              // Add only inactive profile - profiles array changes
              bloc.addProfile({ id: '4', name: 'David', active: false });
            }}
          >
            Add Inactive
          </button>
          <button
            onClick={() => {
              // Add active profile - both array and filtered result change
              bloc.addProfile({ id: '5', name: 'Eve', active: true });
            }}
          >
            Add Active
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(renderCount).toBe(1);
    expect(screen.getByTestId('filtered-count').textContent).toBe('2');

    // Add inactive profile - will trigger re-render since profiles array changed
    // Note: Getter tracking tracks the result, but re-renders when input changes
    screen.getByText('Add Inactive').click();

    await waitFor(() => {
      // Getter result is still 2 (only active profiles)
      expect(screen.getByTestId('filtered-count').textContent).toBe('2');
      // Re-render happened due to state change
      expect(renderCount).toBe(2);
    });

    // Add active profile - should trigger re-render
    screen.getByText('Add Active').click();

    await waitFor(() => {
      expect(screen.getByTestId('filtered-count').textContent).toBe('3');
      expect(renderCount).toBe(3);
    });
  });

  it('should track getter dependencies and re-render appropriately', async () => {
    let renderCount = 0;

    function TestComponent() {
      renderCount++;
      const [, bloc] = useBloc(ProfileCubit, {
        props: { initialProfiles },
      });

      // Only access the getter, not the full state.profiles array
      const filteredCount = bloc.filteredProfiles.length;

      return (
        <div>
          <div data-testid="render-count">{renderCount}</div>
          <div data-testid="filtered-count">{filteredCount}</div>
          <button
            onClick={() => {
              // Toggle active status of Charlie (currently inactive)
              const updated = [
                { id: '1', name: 'Alice', active: true },
                { id: '2', name: 'Bob', active: true },
                { id: '3', name: 'Charlie', active: true }, // Now active!
              ];
              bloc.updateProfiles(updated);
            }}
          >
            Activate Charlie
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(renderCount).toBe(1);
    expect(screen.getByTestId('filtered-count').textContent).toBe('2');

    // Activate Charlie - getter result changes from 2 to 3
    screen.getByText('Activate Charlie').click();

    await waitFor(() => {
      expect(screen.getByTestId('filtered-count').textContent).toBe('3');
      expect(renderCount).toBe(2);
    });
  });
});
