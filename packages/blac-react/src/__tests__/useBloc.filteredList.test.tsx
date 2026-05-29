import { describe, it, expect } from 'vite-plus/test';
import { render, screen, waitFor, act } from '@testing-library/react';
import { Cubit } from '@blac/core';
import { blacTestSetup } from '@blac/core/testing';
import { useBloc } from '../useBloc';

blacTestSetup();

interface Profile {
  id: string;
  name: string;
  active: boolean;
}

interface ProfileState {
  profiles: Profile[];
}

class ProfileCubit extends Cubit<ProfileState> {
  constructor() {
    super({ profiles: [] });
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

  initializeProfiles = (profiles: Profile[]) => {
    this.emit({ profiles });
  };
}

describe('useBloc - filtered list with getter', () => {
  const initialProfiles: Profile[] = [
    { id: '1', name: 'Alice', active: true },
    { id: '2', name: 'Bob', active: true },
    { id: '3', name: 'Charlie', active: false },
  ];

  // NOTE: The old getter-tracking model was deleted in C0/D0. The new
  // auto-track records paths via the state proxy only; accessing a bloc
  // getter like `bloc.filteredProfiles` does NOT register interest in the
  // underlying state path. These tests therefore access `state.profiles`
  // via the proxy (which records `profiles` as a tracked path) and only
  // then call the getter for the filtered result. The re-render contract
  // becomes: "filtered output stays current as long as the proxy touched
  // the source path that the getter reads from."

  it('should return filtered profiles through getter', async () => {
    function TestComponent() {
      const [state, bloc] = useBloc(ProfileCubit, {
        onMount: (cubit) => cubit.initializeProfiles(initialProfiles),
      });
      // Touch state.profiles via the proxy so the consumer wakes when it changes.
      const total = state.profiles.length;
      return (
        <div>
          <div data-testid="total-count">{total}</div>
          <div data-testid="filtered-count">{bloc.filteredProfiles.length}</div>
        </div>
      );
    }

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('total-count').textContent).toBe('3');
      expect(screen.getByTestId('filtered-count').textContent).toBe('2');
    });
  });

  it('should update getter when profiles are added', async () => {
    function TestComponent() {
      const [state, bloc] = useBloc(ProfileCubit, {
        onMount: (cubit) => cubit.initializeProfiles(initialProfiles),
      });
      const total = state.profiles.length;

      return (
        <div>
          <div data-testid="total-count">{total}</div>
          <div data-testid="filtered-count">{bloc.filteredProfiles.length}</div>
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

    await waitFor(() => {
      expect(screen.getByTestId('total-count').textContent).toBe('3');
      expect(screen.getByTestId('filtered-count').textContent).toBe('2');
    });

    await act(async () => {
      screen.getByText('Add Profiles').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('total-count').textContent).toBe('5');
      expect(screen.getByTestId('filtered-count').textContent).toBe('3');
    });
  });

  it('should render filtered profiles in a list', async () => {
    function ProfileList() {
      const [state, bloc] = useBloc(ProfileCubit, {
        onMount: (cubit) => cubit.initializeProfiles(initialProfiles),
      });
      const profiles = state.profiles;

      return (
        <div>
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
                ...profiles,
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

    await waitFor(() => {
      expect(screen.getByText('Active Profiles (2)')).toBeInTheDocument();
    });
    expect(screen.getByTestId('profile-1')).toHaveTextContent('Alice');
    expect(screen.getByTestId('profile-2')).toHaveTextContent('Bob');
    expect(screen.queryByTestId('profile-3')).not.toBeInTheDocument();

    await act(async () => {
      screen.getByText('Add Profiles').click();
    });

    await waitFor(() => {
      expect(screen.getByText('Active Profiles (3)')).toBeInTheDocument();
    });
    expect(screen.getByTestId('profile-1')).toHaveTextContent('Alice');
    expect(screen.getByTestId('profile-2')).toHaveTextContent('Bob');
    expect(screen.getByTestId('profile-4')).toHaveTextContent('David');
    expect(screen.queryByTestId('profile-3')).not.toBeInTheDocument();
    expect(screen.queryByTestId('profile-5')).not.toBeInTheDocument();
  });

  it('should track getter and re-render when underlying data changes', async () => {
    function TestComponent() {
      const [state, bloc] = useBloc(ProfileCubit, {
        onMount: (cubit) => cubit.initializeProfiles(initialProfiles),
      });
      void state.profiles;

      return (
        <div>
          <div data-testid="filtered-count">{bloc.filteredProfiles.length}</div>
          <button
            onClick={() => {
              bloc.addProfile({ id: '4', name: 'David', active: false });
            }}
          >
            Add Inactive
          </button>
          <button
            onClick={() => {
              bloc.addProfile({ id: '5', name: 'Eve', active: true });
            }}
          >
            Add Active
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    await waitFor(() => {
      expect(screen.getByTestId('filtered-count').textContent).toBe('2');
    });

    await act(async () => {
      screen.getByText('Add Inactive').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('filtered-count').textContent).toBe('2');
    });

    await act(async () => {
      screen.getByText('Add Active').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('filtered-count').textContent).toBe('3');
    });
  });

  it('should track getter dependencies and re-render appropriately', async () => {
    function TestComponent() {
      const [state, bloc] = useBloc(ProfileCubit, {
        onMount: (cubit) => cubit.initializeProfiles(initialProfiles),
      });
      void state.profiles;
      const filteredCount = bloc.filteredProfiles.length;

      return (
        <div>
          <div data-testid="filtered-count">{filteredCount}</div>
          <button
            onClick={() => {
              const updated = [
                { id: '1', name: 'Alice', active: true },
                { id: '2', name: 'Bob', active: true },
                { id: '3', name: 'Charlie', active: true },
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

    await waitFor(() => {
      expect(screen.getByTestId('filtered-count').textContent).toBe('2');
    });

    await act(async () => {
      screen.getByText('Activate Charlie').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('filtered-count').textContent).toBe('3');
    });
  });
});
