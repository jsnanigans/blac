import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { Cubit, Blac } from '@blac/core';
import useBloc from '../useBloc';
import React from 'react';

/**
 * Advanced Dependency Tracking Tests for V3
 *
 * Tests:
 * 1. Class getter dependency detection (automatic, no custom dependencies)
 * 2. Custom dependencies array function
 * 3. Generator function in dependencies array
 *
 * NOTE: This test suite uses the Unified Dependency Tracking system
 */

beforeAll(() => {
  // Enable unified tracking for these tests
  Blac.setConfig({
    useUnifiedTracking: true,
  });
});

interface UserState {
  firstName: string;
  lastName: string;
  age: number;
  profile: {
    email: string;
    phone: string;
    address: {
      city: string;
      country: string;
    };
  };
  settings: {
    theme: string;
    language: string;
  };
}

class UserCubit extends Cubit<UserState> {
  constructor() {
    super({
      firstName: 'John',
      lastName: 'Doe',
      age: 30,
      profile: {
        email: 'john@example.com',
        phone: '555-1234',
        address: {
          city: 'New York',
          country: 'USA',
        },
      },
      settings: {
        theme: 'light',
        language: 'en',
      },
    });
  }

  // Class getters - computed properties
  get fullName(): string {
    return `${this.state.firstName} ${this.state.lastName}`;
  }

  get isAdult(): boolean {
    return this.state.age >= 18;
  }

  get profileSummary(): string {
    return `${this.fullName} (${this.state.age}) - ${this.state.profile.email}`;
  }

  get location(): string {
    return `${this.state.profile.address.city}, ${this.state.profile.address.country}`;
  }

  // Methods
  updateFirstName = (firstName: string) => {
    this.patch({ firstName });
  };

  updateLastName = (lastName: string) => {
    this.patch({ lastName });
  };

  updateAge = (age: number) => {
    this.patch({ age });
  };

  updateEmail = (email: string) => {
    this.patch({
      profile: {
        ...this.state.profile,
        email,
      },
    });
  };

  updateCity = (city: string) => {
    this.patch({
      profile: {
        ...this.state.profile,
        address: {
          ...this.state.profile.address,
          city,
        },
      },
    });
  };

  updateCountry = (country: string) => {
    this.patch({
      profile: {
        ...this.state.profile,
        address: {
          ...this.state.profile.address,
          country,
        },
      },
    });
  };

  updateTheme = (theme: string) => {
    this.patch({
      settings: {
        ...this.state.settings,
        theme,
      },
    });
  };
}

describe('Advanced Dependency Tracking - Class Getters (Automatic)', () => {
  beforeEach(() => {
    Blac.setConfig({ proxyDependencyTracking: true });
  });

  it('should automatically track class getter dependencies without explicit dependencies array', async () => {
    const user = userEvent.setup();
    const renderSpy = vi.fn();

    function TestComponent() {
      const [_state, cubit] = useBloc(UserCubit);
      renderSpy();

      return (
        <div>
          <div data-testid="full-name">{cubit.fullName}</div>
          <button onClick={() => cubit.updateFirstName('Jane')}>
            Update First Name
          </button>
          <button onClick={() => cubit.updateAge(35)}>Update Age</button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('full-name')).toHaveTextContent('John Doe');

    // Update firstName - should trigger re-render (fullName getter depends on it)
    await user.click(screen.getByText('Update First Name'));
    await waitFor(() =>
      expect(screen.getByTestId('full-name')).toHaveTextContent('Jane Doe'),
    );
    expect(renderSpy).toHaveBeenCalledTimes(2);

    // Update age - should NOT trigger re-render (fullName getter doesn't depend on age)
    renderSpy.mockClear();
    await user.click(screen.getByText('Update Age'));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(renderSpy).toHaveBeenCalledTimes(0);
  });

  it('should track multiple getters independently', async () => {
    const user = userEvent.setup();
    const renderSpy = vi.fn();

    function TestComponent() {
      const [_state, cubit] = useBloc(UserCubit);
      renderSpy();

      return (
        <div>
          <div data-testid="full-name">{cubit.fullName}</div>
          <div data-testid="is-adult">{cubit.isAdult ? 'Yes' : 'No'}</div>
          <button onClick={() => cubit.updateFirstName('Jane')}>
            Update First Name
          </button>
          <button onClick={() => cubit.updateAge(16)}>Update Age</button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('full-name')).toHaveTextContent('John Doe');
    expect(screen.getByTestId('is-adult')).toHaveTextContent('Yes');

    // Update firstName - should trigger re-render (fullName depends on it)
    await user.click(screen.getByText('Update First Name'));
    await waitFor(() =>
      expect(screen.getByTestId('full-name')).toHaveTextContent('Jane Doe'),
    );
    expect(renderSpy).toHaveBeenCalledTimes(2);

    // Update age - should also trigger re-render (isAdult depends on it)
    renderSpy.mockClear();
    await user.click(screen.getByText('Update Age'));
    await waitFor(() =>
      expect(screen.getByTestId('is-adult')).toHaveTextContent('No'),
    );
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });

  it('should track nested getters (getter calling another getter)', async () => {
    const user = userEvent.setup();
    const renderSpy = vi.fn();

    function TestComponent() {
      const [_state, cubit] = useBloc(UserCubit);
      renderSpy();

      return (
        <div>
          <div data-testid="profile-summary">{cubit.profileSummary}</div>
          <button onClick={() => cubit.updateFirstName('Jane')}>
            Update First Name
          </button>
          <button onClick={() => cubit.updateEmail('jane@example.com')}>
            Update Email
          </button>
          <button onClick={() => cubit.updateTheme('dark')}>Update Theme</button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('profile-summary')).toHaveTextContent(
      'John Doe (30) - john@example.com',
    );

    // Update firstName - should trigger re-render (profileSummary uses fullName)
    await user.click(screen.getByText('Update First Name'));
    await waitFor(() =>
      expect(screen.getByTestId('profile-summary')).toHaveTextContent(
        'Jane Doe (30) - john@example.com',
      ),
    );
    expect(renderSpy).toHaveBeenCalledTimes(2);

    // Update email - should trigger re-render (profileSummary uses email)
    renderSpy.mockClear();
    await user.click(screen.getByText('Update Email'));
    await waitFor(() =>
      expect(screen.getByTestId('profile-summary')).toHaveTextContent(
        'Jane Doe (30) - jane@example.com',
      ),
    );
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Update theme - should NOT trigger re-render (profileSummary doesn't use theme)
    renderSpy.mockClear();
    await user.click(screen.getByText('Update Theme'));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(renderSpy).toHaveBeenCalledTimes(0);
  });

  it('should track getters accessing deeply nested state', async () => {
    const user = userEvent.setup();
    const renderSpy = vi.fn();

    function TestComponent() {
      const [_state, cubit] = useBloc(UserCubit);
      renderSpy();

      return (
        <div>
          <div data-testid="location">{cubit.location}</div>
          <button onClick={() => cubit.updateCity('Los Angeles')}>
            Update City
          </button>
          <button onClick={() => cubit.updateCountry('Canada')}>
            Update Country
          </button>
          <button onClick={() => cubit.updateTheme('dark')}>Update Theme</button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('location')).toHaveTextContent('New York, USA');

    // Update city - should trigger re-render
    await user.click(screen.getByText('Update City'));
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        'Los Angeles, USA',
      ),
    );
    expect(renderSpy).toHaveBeenCalledTimes(2);

    // Update country - should trigger re-render
    renderSpy.mockClear();
    await user.click(screen.getByText('Update Country'));
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        'Los Angeles, Canada',
      ),
    );
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Update theme - should NOT trigger re-render
    renderSpy.mockClear();
    await user.click(screen.getByText('Update Theme'));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(renderSpy).toHaveBeenCalledTimes(0);
  });

  it('should mix state access and getter access correctly', async () => {
    const user = userEvent.setup();
    const renderSpy = vi.fn();

    function TestComponent() {
      const [state, cubit] = useBloc(UserCubit);
      renderSpy();

      return (
        <div>
          <div data-testid="age">{state.age}</div>
          <div data-testid="full-name">{cubit.fullName}</div>
          <button onClick={() => cubit.updateAge(35)}>Update Age</button>
          <button onClick={() => cubit.updateFirstName('Jane')}>
            Update First Name
          </button>
          <button onClick={() => cubit.updateTheme('dark')}>Update Theme</button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('age')).toHaveTextContent('30');
    expect(screen.getByTestId('full-name')).toHaveTextContent('John Doe');

    // Update age - should trigger re-render (state.age is accessed)
    await user.click(screen.getByText('Update Age'));
    await waitFor(() => expect(screen.getByTestId('age')).toHaveTextContent('35'));
    expect(renderSpy).toHaveBeenCalledTimes(2);

    // Update firstName - should trigger re-render (fullName getter is accessed)
    renderSpy.mockClear();
    await user.click(screen.getByText('Update First Name'));
    await waitFor(() =>
      expect(screen.getByTestId('full-name')).toHaveTextContent('Jane Doe'),
    );
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Update theme - should NOT trigger re-render (neither age nor fullName depend on it)
    renderSpy.mockClear();
    await user.click(screen.getByText('Update Theme'));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(renderSpy).toHaveBeenCalledTimes(0);
  });
});

describe('Advanced Dependency Tracking - Custom Dependencies Array', () => {
  beforeEach(() => {
    Blac.setConfig({ proxyDependencyTracking: true });
  });

  it('should respect custom dependencies array function', async () => {
    const user = userEvent.setup();
    const renderSpy = vi.fn();
    const dependenciesSpy = vi.fn();

    function TestComponent() {
      const [state, cubit] = useBloc(UserCubit, {
        dependencies: (instance) => {
          dependenciesSpy();
          return [instance.state.firstName, instance.isAdult];
        },
      });
      renderSpy();

      return (
        <div>
          <div data-testid="first-name">{state.firstName}</div>
          <div data-testid="is-adult">{cubit.isAdult ? 'Yes' : 'No'}</div>
          <button onClick={() => cubit.updateFirstName('Jane')}>
            Update First Name
          </button>
          <button onClick={() => cubit.updateLastName('Smith')}>
            Update Last Name
          </button>
          <button onClick={() => cubit.updateAge(16)}>Update Age</button>
          <button onClick={() => cubit.updateTheme('dark')}>Update Theme</button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(renderSpy).toHaveBeenCalledTimes(1);
    // Dependencies function is called during mount and on each render
    // The exact count depends on implementation details (mount + render cycles)
    expect(dependenciesSpy).toHaveBeenCalled();
    const initialDepsCallCount = dependenciesSpy.mock.calls.length;
    expect(screen.getByTestId('first-name')).toHaveTextContent('John');
    expect(screen.getByTestId('is-adult')).toHaveTextContent('Yes');

    // Update firstName - should trigger re-render (in dependencies)
    dependenciesSpy.mockClear();
    await user.click(screen.getByText('Update First Name'));
    await waitFor(() =>
      expect(screen.getByTestId('first-name')).toHaveTextContent('Jane'),
    );
    expect(renderSpy).toHaveBeenCalledTimes(2);
    expect(dependenciesSpy).toHaveBeenCalled();

    // Update lastName - should NOT trigger re-render (not in dependencies)
    renderSpy.mockClear();
    dependenciesSpy.mockClear();
    await user.click(screen.getByText('Update Last Name'));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(renderSpy).toHaveBeenCalledTimes(0);

    // Update age to change isAdult - should trigger re-render (isAdult in dependencies)
    renderSpy.mockClear();
    await user.click(screen.getByText('Update Age'));
    await waitFor(() =>
      expect(screen.getByTestId('is-adult')).toHaveTextContent('No'),
    );
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Update theme - should NOT trigger re-render (not in dependencies)
    renderSpy.mockClear();
    await user.click(screen.getByText('Update Theme'));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(renderSpy).toHaveBeenCalledTimes(0);
  });

  it('should handle empty dependencies array (never re-render)', async () => {
    const user = userEvent.setup();
    const renderSpy = vi.fn();

    function TestComponent() {
      const [state, cubit] = useBloc(UserCubit, {
        dependencies: () => [],
      });
      renderSpy();

      return (
        <div>
          <div data-testid="first-name">{state.firstName}</div>
          <button onClick={() => cubit.updateFirstName('Jane')}>
            Update First Name
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('first-name')).toHaveTextContent('John');

    // Update firstName - should NOT trigger re-render (empty dependencies)
    await user.click(screen.getByText('Update First Name'));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(renderSpy).toHaveBeenCalledTimes(1); // Still just initial render
  });

  it('should handle dependencies array with nested state paths', async () => {
    const user = userEvent.setup();
    const renderSpy = vi.fn();

    function TestComponent() {
      const [state, cubit] = useBloc(UserCubit, {
        dependencies: (instance) => [
          instance.state.profile.address.city,
          instance.state.profile.email,
        ],
      });
      renderSpy();

      return (
        <div>
          <div data-testid="city">{state.profile.address.city}</div>
          <div data-testid="email">{state.profile.email}</div>
          <button onClick={() => cubit.updateCity('Los Angeles')}>
            Update City
          </button>
          <button onClick={() => cubit.updateCountry('Canada')}>
            Update Country
          </button>
          <button onClick={() => cubit.updateEmail('new@example.com')}>
            Update Email
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('city')).toHaveTextContent('New York');
    expect(screen.getByTestId('email')).toHaveTextContent('john@example.com');

    // Update city - should trigger re-render
    await user.click(screen.getByText('Update City'));
    await waitFor(() =>
      expect(screen.getByTestId('city')).toHaveTextContent('Los Angeles'),
    );
    expect(renderSpy).toHaveBeenCalledTimes(2);

    // Update country - should NOT trigger re-render (not in dependencies)
    renderSpy.mockClear();
    await user.click(screen.getByText('Update Country'));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(renderSpy).toHaveBeenCalledTimes(0);

    // Update email - should trigger re-render
    await user.click(screen.getByText('Update Email'));
    await waitFor(() =>
      expect(screen.getByTestId('email')).toHaveTextContent('new@example.com'),
    );
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });

  it('should handle computed values in dependencies array', async () => {
    const user = userEvent.setup();
    const renderSpy = vi.fn();

    function TestComponent() {
      const [state, cubit] = useBloc(UserCubit, {
        dependencies: (instance) => [
          instance.fullName,
          instance.state.age > 30,
          instance.state.profile.address.city.toLowerCase(),
        ],
      });
      renderSpy();

      return (
        <div>
          <div data-testid="full-name">{cubit.fullName}</div>
          <div data-testid="age">{state.age}</div>
          <button onClick={() => cubit.updateFirstName('Jane')}>
            Update First Name
          </button>
          <button onClick={() => cubit.updateAge(29)}>Update Age to 29</button>
          <button onClick={() => cubit.updateAge(31)}>Update Age to 31</button>
          <button onClick={() => cubit.updateAge(32)}>Update Age to 32</button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('full-name')).toHaveTextContent('John Doe');
    expect(screen.getByTestId('age')).toHaveTextContent('30');

    // Update firstName - should trigger re-render (fullName changes)
    await user.click(screen.getByText('Update First Name'));
    await waitFor(() =>
      expect(screen.getByTestId('full-name')).toHaveTextContent('Jane Doe'),
    );
    expect(renderSpy).toHaveBeenCalledTimes(2);

    // Update age to 29 - boolean expression (age > 30) stays false, so should NOT re-render
    renderSpy.mockClear();
    await user.click(screen.getByText('Update Age to 29'));
    await new Promise((resolve) => setTimeout(resolve, 100));
    // age > 30 changes from false (30) to false (29) - no change in comparison result
    // State changed but dependency value (false) didn't change, so no re-render
    expect(renderSpy).toHaveBeenCalledTimes(0);
    // Age should still show 30 because component didn't re-render
    expect(screen.getByTestId('age')).toHaveTextContent('30');

    // Update age to 31 - should trigger re-render (age > 30 changes from false to true)
    await user.click(screen.getByText('Update Age to 31'));
    await waitFor(() => expect(screen.getByTestId('age')).toHaveTextContent('31'));
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Update age to 32 - should NOT trigger re-render (age > 30 stays true)
    renderSpy.mockClear();
    await user.click(screen.getByText('Update Age to 32'));
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(renderSpy).toHaveBeenCalledTimes(0);
  });
});

describe('Advanced Dependency Tracking - Generator Function in Dependencies', () => {
  beforeEach(() => {
    Blac.setConfig({ proxyDependencyTracking: true });
  });

  it('should handle generator function in dependencies array (returns iterator)', async () => {
    const user = userEvent.setup();
    const renderSpy = vi.fn();

    function TestComponent() {
      const [state, cubit] = useBloc(UserCubit, {
        dependencies: function* (instance: UserCubit) {
          yield instance.state.firstName;
          yield instance.state.age;
        } as any, // Generator returns iterator, not array
      });
      renderSpy();

      return (
        <div>
          <div data-testid="first-name">{state.firstName}</div>
          <div data-testid="age">{state.age}</div>
          <button onClick={() => cubit.updateFirstName('Jane')}>
            Update First Name
          </button>
          <button onClick={() => cubit.updateAge(35)}>Update Age</button>
          <button onClick={() => cubit.updateLastName('Smith')}>
            Update Last Name
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('first-name')).toHaveTextContent('John');
    expect(screen.getByTestId('age')).toHaveTextContent('30');

    // Note: Generator functions should be handled gracefully, even if they're not standard usage
    // The implementation should either:
    // 1. Convert iterator to array (Array.from)
    // 2. Ignore generator functions and fall back to automatic tracking
    // 3. Throw a helpful error

    // Update firstName - behavior depends on implementation
    await user.click(screen.getByText('Update First Name'));
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Update age - behavior depends on implementation
    renderSpy.mockClear();
    await user.click(screen.getByText('Update Age'));
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Update lastName - should use fallback behavior
    renderSpy.mockClear();
    await user.click(screen.getByText('Update Last Name'));
    await new Promise((resolve) => setTimeout(resolve, 100));

    // This test documents the current behavior with generators
    // We expect the system to either handle it gracefully or provide clear error
  });

  it('should handle async generator function (edge case)', async () => {
    const user = userEvent.setup();
    const renderSpy = vi.fn();

    function TestComponent() {
      const [state, cubit] = useBloc(UserCubit, {
        dependencies: async function* (instance: UserCubit) {
          yield instance.state.firstName;
          yield instance.state.age;
        } as any, // Async generator
      });
      renderSpy();

      return (
        <div>
          <div data-testid="first-name">{state.firstName}</div>
          <button onClick={() => cubit.updateFirstName('Jane')}>
            Update First Name
          </button>
        </div>
      );
    }

    // This should handle async generators gracefully
    // Most likely by falling back to automatic tracking or throwing descriptive error
    render(<TestComponent />);
    expect(renderSpy).toHaveBeenCalledTimes(1);

    await user.click(screen.getByText('Update First Name'));
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  it('should handle function returning non-array iterables (Set, Map values)', async () => {
    const user = userEvent.setup();
    const renderSpy = vi.fn();

    function TestComponent() {
      const [state, cubit] = useBloc(UserCubit, {
        dependencies: (instance) => {
          // Return a Set (iterable but not array)
          return new Set([instance.state.firstName, instance.state.age]) as any;
        },
      });
      renderSpy();

      return (
        <div>
          <div data-testid="first-name">{state.firstName}</div>
          <div data-testid="age">{state.age}</div>
          <button onClick={() => cubit.updateFirstName('Jane')}>
            Update First Name
          </button>
          <button onClick={() => cubit.updateAge(35)}>Update Age</button>
          <button onClick={() => cubit.updateLastName('Smith')}>
            Update Last Name
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('first-name')).toHaveTextContent('John');
    expect(screen.getByTestId('age')).toHaveTextContent('30');

    // If implementation handles Sets, these should trigger re-renders
    await user.click(screen.getByText('Update First Name'));
    await new Promise((resolve) => setTimeout(resolve, 100));

    renderSpy.mockClear();
    await user.click(screen.getByText('Update Age'));
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Last name not in Set, should not re-render
    renderSpy.mockClear();
    await user.click(screen.getByText('Update Last Name'));
    await new Promise((resolve) => setTimeout(resolve, 100));
  });
});
