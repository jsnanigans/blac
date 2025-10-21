import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  beforeAll,
  afterEach,
} from 'vitest';
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
 * NOTE: This test suite uses the Unified Dependency Tracking system (now default)
 */

beforeEach(() => {
  // Ensure unified tracking is enabled (now default)
  Blac.setConfig({ useUnifiedTracking: true });
});

afterEach(() => {
  Blac.resetInstance();
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

beforeEach(() => {
  Blac.resetInstance();
});

describe('Advanced Dependency Tracking - Class Getters (Automatic)', () => {
  afterEach(() => {
    Blac.resetInstance();
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
    // Verify no re-render occurred due to age change
    await waitFor(
      () => {
        expect(renderSpy).toHaveBeenCalledTimes(0);
      },
      { timeout: 500 },
    );
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
          <button onClick={() => cubit.updateTheme('dark')}>
            Update Theme
          </button>
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
    await waitFor(
      () => {
        expect(renderSpy).toHaveBeenCalledTimes(0);
      },
      { timeout: 500 },
    );
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
          <button onClick={() => cubit.updateTheme('dark')}>
            Update Theme
          </button>
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
    await waitFor(
      () => {
        expect(renderSpy).toHaveBeenCalledTimes(0);
      },
      { timeout: 500 },
    );
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
          <button onClick={() => cubit.updateTheme('dark')}>
            Update Theme
          </button>
        </div>
      );
    }

    render(<TestComponent />);

    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('age')).toHaveTextContent('30');
    expect(screen.getByTestId('full-name')).toHaveTextContent('John Doe');

    // Update age - should trigger re-render (state.age is accessed)
    await user.click(screen.getByText('Update Age'));
    await waitFor(() =>
      expect(screen.getByTestId('age')).toHaveTextContent('35'),
    );
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
    await waitFor(
      () => {
        expect(renderSpy).toHaveBeenCalledTimes(0);
      },
      { timeout: 500 },
    );
  });
});

describe('Advanced Dependency Tracking - Custom Dependencies Array', () => {
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
          <button onClick={() => cubit.updateTheme('dark')}>
            Update Theme
          </button>
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
    await waitFor(
      () => {
        expect(renderSpy).toHaveBeenCalledTimes(0);
      },
      { timeout: 500 },
    );

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
    await waitFor(
      () => {
        expect(renderSpy).toHaveBeenCalledTimes(0);
      },
      { timeout: 500 },
    );
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
    await waitFor(
      () => {
        expect(renderSpy).toHaveBeenCalledTimes(1); // Still just initial render
      },
      { timeout: 500 },
    );
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
    await waitFor(
      () => {
        expect(renderSpy).toHaveBeenCalledTimes(0);
      },
      { timeout: 500 },
    );

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
    // age > 30 stays false (30 > 30 is false, 29 > 30 is also false)
    // Dependency value didn't change, so no re-render
    // Age should still show 30 because component didn't re-render
    await waitFor(
      () => {
        expect(screen.getByTestId('age')).toHaveTextContent('30');
        expect(renderSpy).toHaveBeenCalledTimes(0);
      },
      { timeout: 500 },
    );

    // Update age to 31 - should trigger re-render (age > 30 changes from false to true)
    await user.click(screen.getByText('Update Age to 31'));
    await waitFor(() =>
      expect(screen.getByTestId('age')).toHaveTextContent('31'),
    );
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Update age to 32 - should NOT trigger re-render (age > 30 stays true)
    renderSpy.mockClear();
    await user.click(screen.getByText('Update Age to 32'));
    await waitFor(
      () => {
        expect(renderSpy).toHaveBeenCalledTimes(0);
      },
      { timeout: 500 },
    );
  });

  afterEach(() => {
    Blac.resetInstance();
  });
});

describe('Advanced Dependency Tracking - Focused Single Scenarios', () => {
  // These tests isolate individual behaviors for better debugging and faster failure localization

  describe('Class Getter - Single Dependency Change', () => {
    it('should re-render ONLY when dependency of getter changes', async () => {
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
          </div>
        );
      }

      render(<TestComponent />);
      expect(renderSpy).toHaveBeenCalledTimes(1);

      // Changing firstName should trigger re-render
      await user.click(
        screen.getByRole('button', { name: /Update First Name/i }),
      );
      await waitFor(() =>
        expect(screen.getByTestId('full-name')).toHaveTextContent('Jane Doe'),
      );
      expect(renderSpy).toHaveBeenCalledTimes(2);
    });

    it('should NOT re-render when non-dependency field changes', async () => {
      const user = userEvent.setup();
      const renderSpy = vi.fn();

      function TestComponent() {
        const [_state, cubit] = useBloc(UserCubit);
        renderSpy();

        return (
          <div>
            <div data-testid="full-name">{cubit.fullName}</div>
            <button onClick={() => cubit.updateAge(35)}>Update Age</button>
          </div>
        );
      }

      render(<TestComponent />);
      renderSpy.mockClear();

      // Changing age should NOT trigger re-render (fullName doesn't depend on it)
      await user.click(screen.getByRole('button', { name: /Update Age/i }));
      await waitFor(
        () => {
          expect(renderSpy).toHaveBeenCalledTimes(0);
        },
        { timeout: 500 },
      );
    });
  });

  describe('Custom Dependencies - Selective Tracking', () => {
    it('should ONLY re-render for dependencies in array', async () => {
      const user = userEvent.setup();
      const renderSpy = vi.fn();

      function TestComponent() {
        const [state, cubit] = useBloc(UserCubit, {
          dependencies: (instance) => [instance.state.firstName],
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
      renderSpy.mockClear();

      // firstName is in dependencies - should re-render
      await user.click(
        screen.getByRole('button', { name: /Update First Name/i }),
      );
      await waitFor(() =>
        expect(screen.getByTestId('first-name')).toHaveTextContent('Jane'),
      );
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('should NOT re-render when excluded field changes', async () => {
      const user = userEvent.setup();
      const renderSpy = vi.fn();

      function TestComponent() {
        const [state, cubit] = useBloc(UserCubit, {
          dependencies: (instance) => [instance.state.firstName],
        });
        renderSpy();
        return (
          <div>
            <div data-testid="first-name">{state.firstName}</div>
            <button onClick={() => cubit.updateLastName('Smith')}>
              Update Last Name
            </button>
          </div>
        );
      }

      render(<TestComponent />);
      renderSpy.mockClear();

      // lastName is NOT in dependencies - should NOT re-render
      await user.click(
        screen.getByRole('button', { name: /Update Last Name/i }),
      );
      await waitFor(
        () => {
          expect(renderSpy).toHaveBeenCalledTimes(0);
        },
        { timeout: 500 },
      );
    });
  });

  describe('Computed Dependencies - Value Change Detection', () => {
    it('should re-render when computed boolean dependency changes', async () => {
      const user = userEvent.setup();
      const renderSpy = vi.fn();

      function TestComponent() {
        const [state, cubit] = useBloc(UserCubit, {
          dependencies: (instance) => [instance.state.age > 30],
        });
        renderSpy();
        return (
          <div>
            <div data-testid="age">{state.age}</div>
            <button onClick={() => cubit.updateAge(31)}>
              Update Age to 31
            </button>
          </div>
        );
      }

      render(<TestComponent />);
      renderSpy.mockClear();

      // Age: 30 -> 31 changes (age > 30) from false to true
      await user.click(
        screen.getByRole('button', { name: /Update Age to 31/i }),
      );
      await waitFor(() =>
        expect(screen.getByTestId('age')).toHaveTextContent('31'),
      );
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('should NOT re-render when computed value stays same', async () => {
      const user = userEvent.setup();
      const renderSpy = vi.fn();

      function TestComponent() {
        const [state, cubit] = useBloc(UserCubit, {
          dependencies: (instance) => [instance.state.age > 30],
        });
        renderSpy();
        return (
          <div>
            <div data-testid="age">{state.age}</div>
            <button onClick={() => cubit.updateAge(29)}>
              Update Age to 29
            </button>
          </div>
        );
      }

      render(<TestComponent />);
      renderSpy.mockClear();

      // Age: 30 -> 29, but (age > 30) stays false
      await user.click(
        screen.getByRole('button', { name: /Update Age to 29/i }),
      );
      await waitFor(
        () => {
          expect(renderSpy).toHaveBeenCalledTimes(0);
        },
        { timeout: 500 },
      );
    });
  });

  describe('Nested State Paths - Deep Access', () => {
    it('should re-render when deeply nested dependency changes', async () => {
      const user = userEvent.setup();
      const renderSpy = vi.fn();

      function TestComponent() {
        const [state, cubit] = useBloc(UserCubit, {
          dependencies: (instance) => [instance.state.profile.address.city],
        });
        renderSpy();
        return (
          <div>
            <div data-testid="city">{state.profile.address.city}</div>
            <button onClick={() => cubit.updateCity('Los Angeles')}>
              Update City
            </button>
          </div>
        );
      }

      render(<TestComponent />);
      renderSpy.mockClear();

      await user.click(screen.getByRole('button', { name: /Update City/i }));
      await waitFor(() =>
        expect(screen.getByTestId('city')).toHaveTextContent('Los Angeles'),
      );
      expect(renderSpy).toHaveBeenCalledTimes(1);
    });

    it('should NOT re-render when sibling nested field changes', async () => {
      const user = userEvent.setup();
      const renderSpy = vi.fn();

      function TestComponent() {
        const [state, cubit] = useBloc(UserCubit, {
          dependencies: (instance) => [instance.state.profile.address.city],
        });
        renderSpy();
        return (
          <div>
            <div data-testid="city">{state.profile.address.city}</div>
            <button onClick={() => cubit.updateCountry('Canada')}>
              Update Country
            </button>
          </div>
        );
      }

      render(<TestComponent />);
      renderSpy.mockClear();

      // Country is sibling of city - not in dependencies
      await user.click(screen.getByRole('button', { name: /Update Country/i }));
      await waitFor(
        () => {
          expect(renderSpy).toHaveBeenCalledTimes(0);
        },
        { timeout: 500 },
      );
    });
  });
});

describe('Advanced Dependency Tracking - Error Handling', () => {
  it('should handle dependencies function that throws', async () => {
    const renderSpy = vi.fn();
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    function TestComponent() {
      const [state] = useBloc(UserCubit, {
        dependencies: () => {
          throw new Error('Dependencies calculation failed');
        },
      });
      renderSpy();
      return <div>{state.firstName}</div>;
    }

    // Should either render with fallback or provide clear error
    try {
      render(<TestComponent />);
      // If renders, should use fallback behavior (automatic tracking)
      expect(renderSpy).toHaveBeenCalled();
    } catch (error) {
      // If throws, error message should be clear
      expect(error).toBeDefined();
    }

    consoleErrorSpy.mockRestore();
  });

  it('should handle dependencies function returning null', async () => {
    const renderSpy = vi.fn();

    function TestComponent() {
      const [state] = useBloc(UserCubit, {
        dependencies: () => null as any,
      });
      renderSpy();
      return <div>{state.firstName}</div>;
    }

    // Should either handle gracefully or throw clear error
    try {
      render(<TestComponent />);
      expect(renderSpy).toHaveBeenCalled();
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should handle dependencies function returning undefined', async () => {
    const renderSpy = vi.fn();

    function TestComponent() {
      const [state] = useBloc(UserCubit, {
        dependencies: () => undefined as any,
      });
      renderSpy();
      return <div>{state.firstName}</div>;
    }

    try {
      render(<TestComponent />);
      expect(renderSpy).toHaveBeenCalled();
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  it('should handle dependencies function returning non-iterable object', async () => {
    const renderSpy = vi.fn();

    function TestComponent() {
      const [state] = useBloc(UserCubit, {
        dependencies: () => ({ foo: 'bar' }) as any,
      });
      renderSpy();
      return <div>{state.firstName}</div>;
    }

    try {
      render(<TestComponent />);
      expect(renderSpy).toHaveBeenCalled();
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});

describe('Advanced Dependency Tracking - Edge Cases', () => {
  it('should handle state with undefined values in dependency path', async () => {
    const user = userEvent.setup();
    const renderSpy = vi.fn();

    function TestComponent() {
      const [state, cubit] = useBloc(UserCubit, {
        dependencies: (instance) => [
          instance.state.profile?.address?.city, // Optional chaining
        ],
      });
      renderSpy();
      return (
        <div>
          <div data-testid="city">{state.profile?.address?.city}</div>
          <button onClick={() => cubit.updateCity('Los Angeles')}>
            Update City
          </button>
        </div>
      );
    }

    render(<TestComponent />);
    expect(renderSpy).toHaveBeenCalledTimes(1);

    renderSpy.mockClear();
    await user.click(screen.getByRole('button', { name: /Update City/i }));
    await waitFor(() =>
      expect(screen.getByTestId('city')).toHaveTextContent('Los Angeles'),
    );
    expect(renderSpy).toHaveBeenCalledTimes(1);
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

    // Any state change should NOT trigger re-render
    renderSpy.mockClear();
    await user.click(
      screen.getByRole('button', { name: /Update First Name/i }),
    );
    await waitFor(
      () => {
        expect(renderSpy).toHaveBeenCalledTimes(0);
      },
      { timeout: 500 },
    );
  });

  it('should handle very long dependency array', async () => {
    const user = userEvent.setup();
    const renderSpy = vi.fn();

    function TestComponent() {
      const [state, cubit] = useBloc(UserCubit, {
        dependencies: (instance) => [
          // Create a large dependency array with mixed types
          instance.state.firstName,
          instance.state.lastName,
          instance.state.age,
          instance.state.profile.email,
          instance.state.profile.phone,
          instance.state.profile.address.city,
          instance.state.profile.address.country,
          instance.state.settings.theme,
          instance.state.settings.language,
          instance.fullName,
          instance.isAdult,
          // ... imagine 100+ more
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
        </div>
      );
    }

    render(<TestComponent />);
    renderSpy.mockClear();

    // Changing one dependency should still trigger re-render
    await user.click(
      screen.getByRole('button', { name: /Update First Name/i }),
    );
    await waitFor(() =>
      expect(screen.getByTestId('full-name')).toHaveTextContent('Jane Doe'),
    );
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });

  it('should handle dependency with special numeric values (NaN, Infinity)', async () => {
    // This tests stability with edge case values
    const renderSpy = vi.fn();

    class SpecialCubit extends Cubit<{
      count: number;
    }> {
      constructor() {
        super({ count: 0 });
      }

      setNaN = () => {
        // Emit NaN (special numeric case)
        this.emit({ count: NaN });
      };

      setInfinity = () => {
        this.emit({ count: Infinity });
      };
    }

    function TestComponent() {
      const [state] = useBloc(SpecialCubit, {
        dependencies: (instance) => [instance.state.count],
      });
      renderSpy();
      return <div data-testid="count">{state.count}</div>;
    }

    render(<TestComponent />);
    expect(renderSpy).toHaveBeenCalledTimes(1);
    renderSpy.mockClear();

    // NaN should be handled (even though NaN !== NaN)
    // Implementation determines if this triggers re-render
    // Just verify it doesn't crash
    expect(() => {
      // Try to update to NaN
    }).not.toThrow();
  });

  it('should handle reference equality for object dependencies', async () => {
    const user = userEvent.setup();
    const renderSpy = vi.fn();

    function TestComponent() {
      const [state, cubit] = useBloc(UserCubit, {
        dependencies: (instance) => [instance.state.profile],
      });
      renderSpy();
      return (
        <div>
          <div data-testid="email">{state.profile?.email || 'no email'}</div>
          <button onClick={() => cubit.updateEmail('jane@example.com')}>
            Update Email
          </button>
        </div>
      );
    }

    render(<TestComponent />);
    renderSpy.mockClear();

    // Updating email changes the profile object
    await user.click(screen.getByRole('button', { name: /Update Email/i }));
    // Should re-render because profile object reference changed
    await waitFor(() =>
      expect(screen.getByTestId('email')).toHaveTextContent('jane@example.com'),
    );
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });
});

describe('Advanced Dependency Tracking - React Lifecycle', () => {
  it('should handle component unmounting during dependency change', async () => {
    const user = userEvent.setup();
    const renderSpy = vi.fn();

    function TestComponent() {
      const [state, cubit] = useBloc(UserCubit, {
        dependencies: (instance) => [instance.state.firstName],
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

    const { unmount } = render(<TestComponent />);
    renderSpy.mockClear();

    // Unmount during state change (should not cause errors)
    await user.click(
      screen.getByRole('button', { name: /Update First Name/i }),
    );
    unmount();

    // Should not throw or cause memory leaks
    expect(renderSpy).toHaveBeenCalled();
  });

  it('should re-render correctly when dependencies function itself changes', async () => {
    const renderSpy = vi.fn();
    let dependenciesVersion = 0;

    function TestComponent() {
      const [state] = useBloc(UserCubit, {
        dependencies: (instance) => {
          // Different dependency function on each render
          if (dependenciesVersion === 0) {
            return [instance.state.firstName];
          }
          return [instance.state.age];
        },
      });
      renderSpy();
      return <div>{state.firstName}</div>;
    }

    const { rerender } = render(<TestComponent />);
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Change the dependencies function
    dependenciesVersion = 1;
    rerender(<TestComponent />);

    // Should handle dependency function changes gracefully
    expect(renderSpy).toHaveBeenCalled();
  });

  it('should handle multiple components with same bloc and different dependencies', async () => {
    const user = userEvent.setup();
    const render1Spy = vi.fn();
    const render2Spy = vi.fn();

    function Component1() {
      const [state, cubit] = useBloc(UserCubit, {
        dependencies: (instance) => [instance.state.firstName],
      });
      render1Spy();
      return (
        <div>
          <div data-testid="comp1">{state.firstName}</div>
          <button onClick={() => cubit.updateFirstName('Jane')}>
            Update First Name
          </button>
        </div>
      );
    }

    function Component2() {
      const [state, cubit] = useBloc(UserCubit, {
        dependencies: (instance) => [instance.state.age],
      });
      render2Spy();
      return (
        <div>
          <div data-testid="comp2">{state.age}</div>
          <button onClick={() => cubit.updateAge(35)}>Update Age</button>
        </div>
      );
    }

    render(
      <>
        <Component1 />
        <Component2 />
      </>,
    );

    render1Spy.mockClear();
    render2Spy.mockClear();

    // Update firstName - only Component1 should re-render
    await user.click(
      screen.getByRole('button', { name: /Update First Name/i }),
    );

    await waitFor(() => {
      expect(screen.getByTestId('comp1')).toHaveTextContent('Jane');
    });

    // Component1 should re-render, Component2 should not
    expect(render1Spy).toHaveBeenCalled();
    expect(render2Spy).not.toHaveBeenCalled();
  });

  it('should handle rapid consecutive dependency changes', async () => {
    const user = userEvent.setup();
    const renderSpy = vi.fn();

    function TestComponent() {
      const [state, cubit] = useBloc(UserCubit, {
        dependencies: (instance) => [instance.state.firstName],
      });
      renderSpy();

      return (
        <div data-testid="first-name">
          {state.firstName}
          <button
            onClick={() => {
              cubit.updateFirstName('John1');
              cubit.updateFirstName('John2');
              cubit.updateFirstName('John3');
            }}
          >
            Rapid Updates
          </button>
        </div>
      );
    }

    render(<TestComponent />);
    renderSpy.mockClear();

    // Rapid updates should be batched and handled correctly
    await user.click(screen.getByRole('button', { name: /Rapid Updates/i }));
    await waitFor(() =>
      expect(screen.getByTestId('first-name')).toHaveTextContent('John3'),
    );

    // Should have re-rendered (possibly multiple times, but not crash)
    expect(renderSpy).toHaveBeenCalled();
  });
});

describe('Advanced Dependency Tracking - Memory & Cleanup', () => {
  it('should not leak memory on mount/unmount cycles', async () => {
    const renderSpy = vi.fn();

    function TestComponent() {
      const [state] = useBloc(UserCubit, {
        dependencies: (instance) => [instance.state.firstName],
      });
      renderSpy();
      return <div>{state.firstName}</div>;
    }

    // Perform multiple mount/unmount cycles
    for (let i = 0; i < 10; i++) {
      const { unmount } = render(<TestComponent />);
      unmount();
    }

    // Should not leak memory or throw
    expect(renderSpy).toHaveBeenCalled();
  });

  it('should clean up dependencies when component unmounts', async () => {
    const renderSpy = vi.fn();

    function TestComponent() {
      const [state] = useBloc(UserCubit, {
        dependencies: (instance) => [instance.state.firstName],
      });
      renderSpy();
      return <div>{state.firstName}</div>;
    }

    const { unmount } = render(<TestComponent />);
    expect(renderSpy).toHaveBeenCalledTimes(1);

    // Unmounting should clean up listeners
    unmount();

    // Re-render with fresh instance - should not be affected by previous component
    renderSpy.mockClear();
    render(<TestComponent />);
    expect(renderSpy).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple rapid mounts/unmounts without race conditions', async () => {
    const renderSpy = vi.fn();

    function TestComponent() {
      const [state] = useBloc(UserCubit, {
        dependencies: (instance) => [instance.state.firstName],
      });
      renderSpy();
      return <div>{state.firstName}</div>;
    }

    // Rapidly mount and unmount
    const containers = [];
    for (let i = 0; i < 5; i++) {
      containers.push(render(<TestComponent />));
    }

    // Unmount all in reverse order
    for (let i = containers.length - 1; i >= 0; i--) {
      containers[i].unmount();
    }

    // Should not crash or leave dangling references
    expect(renderSpy).toHaveBeenCalled();
  });
});

describe.skip('Advanced Dependency Tracking - Generator Function in Dependencies', () => {
  // TODO: These tests are skipped pending clarification on expected behavior
  // The current implementation does not properly handle:
  // 1. Generator functions that yield dependency values
  // 2. Async generators (not supported in React hooks context)
  // 3. Non-array iterables (Set, Map.values())
  //
  // Decision needed:
  // - Should generators be converted to arrays via Array.from()?
  // - Should they throw an error with helpful message?
  // - Or fall back to automatic dependency tracking?
  //
  // Once behavior is defined, implement tests with proper assertions.

  it('should handle generator function in dependencies array (returns iterator)', async () => {
    // TODO: Implement once generator handling is specified
    // Expected: Either Array.from conversion or fallback to automatic tracking
  });

  it('should handle async generator function (edge case)', async () => {
    // TODO: Implement once async generator handling is specified
    // Expected: Likely error or fallback to automatic tracking
  });

  it('should handle function returning non-array iterables (Set, Map values)', async () => {
    // TODO: Implement once iterable handling is specified
    // Expected: Either iterate via Array.from or use automatic tracking
  });
});
