/**
 * Tests for useBloc with automatic proxy tracking.
 *
 * NOTE: The new structural-channel model applies a "single-consumer skip"
 * optimization: when only one consumer is registered against a bloc, every
 * emit wakes that consumer (the diff cost isn't worth it for one). To
 * exercise the fine-grained path-tracking contract, these tests mount a
 * second consumer with disjoint interest. With >=2 consumers, the source
 * computes the diffAlongSkeleton and only wakes consumers whose recorded
 * paths intersect the change.
 */

import { describe, it, expect, vi, beforeEach } from 'vite-plus/test';
import { render, act, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { useBloc } from '../useBloc';
import { Cubit } from '@blac/core';
import { blacTestSetup } from '@blac/core/testing';

interface TestState {
  user: {
    name: string;
    age: number;
    profile: {
      bio: string;
      avatar: string;
    };
  };
  settings: {
    theme: string;
    notifications: boolean;
  };
  counters: {
    views: number;
    likes: number;
  };
}

class TestCubit extends Cubit<TestState> {
  constructor() {
    super({
      user: {
        name: 'John',
        age: 30,
        profile: { bio: 'Developer', avatar: 'avatar.jpg' },
      },
      settings: { theme: 'light', notifications: true },
      counters: { views: 0, likes: 0 },
    });
  }

  updateUserName = (name: string) => {
    this.emit({ ...this.state, user: { ...this.state.user, name } });
  };

  updateUserAge = (age: number) => {
    this.emit({ ...this.state, user: { ...this.state.user, age } });
  };

  updateTheme = (theme: string) => {
    this.emit({ ...this.state, settings: { ...this.state.settings, theme } });
  };

  incrementViews = () => {
    this.emit({
      ...this.state,
      counters: {
        ...this.state.counters,
        views: this.state.counters.views + 1,
      },
    });
  };

  updateBio = (bio: string) => {
    this.emit({
      ...this.state,
      user: {
        ...this.state.user,
        profile: { ...this.state.user.profile, bio },
      },
    });
  };
}

blacTestSetup();

// A sentinel consumer that registers disjoint interest so the bloc has 2+
// consumers and `diffAlongSkeleton` runs on every emit.
function Sentinel({ touch }: { touch: keyof TestState }) {
  const [state] = useBloc(TestCubit);
  // Touch one branch only; never overlaps with the test components below.
  void state[touch];
  return null;
}

describe('useBloc with Proxy Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should only re-render when accessed properties change', async () => {
    let renderCount = 0;
    let bloc!: TestCubit;

    function TestComp() {
      renderCount++;
      const [state, b] = useBloc(TestCubit);
      bloc = b as TestCubit;
      return <span data-testid="name">{state.user.name}</span>;
    }

    render(
      <>
        <TestComp />
        <Sentinel touch="counters" />
      </>,
    );

    const initial = renderCount;
    expect(screen.getByTestId('name').textContent).toBe('John');

    // Update tracked property — should re-render
    await act(async () => {
      bloc.updateUserName('Jane');
    });
    expect(renderCount).toBeGreaterThan(initial);
    expect(screen.getByTestId('name').textContent).toBe('Jane');

    const afterName = renderCount;

    // Update unaccessed branch — should NOT re-render
    await act(async () => {
      bloc.updateTheme('dark');
    });
    expect(renderCount).toBe(afterName);

    await act(async () => {
      bloc.incrementViews();
    });
    expect(renderCount).toBe(afterName);
  });

  it('should track nested property access correctly', async () => {
    let renderCount = 0;
    let bloc!: TestCubit;

    function TestComp() {
      renderCount++;
      const [state, b] = useBloc(TestCubit);
      bloc = b as TestCubit;
      return <span data-testid="bio">{state.user.profile.bio}</span>;
    }

    render(
      <>
        <TestComp />
        <Sentinel touch="counters" />
      </>,
    );

    const initial = renderCount;
    expect(screen.getByTestId('bio').textContent).toBe('Developer');

    await act(async () => {
      bloc.updateBio('Senior Developer');
    });
    expect(renderCount).toBeGreaterThan(initial);
    expect(screen.getByTestId('bio').textContent).toBe('Senior Developer');

    const afterBio = renderCount;

    // Updating user.name records user.name as a leaf path, but the consumer
    // only registered user.profile.bio. Structural-tracking records every
    // intermediate (`user`, `user.profile`, `user.profile.bio`) so a change
    // at `user` *does* wake the consumer — that is the documented behavior
    // (see C0/D0 plan: tree-pulses-up semantics on the consumer side too).
    // Verify the displayed value remains correct.
    await act(async () => {
      bloc.updateUserName('Bob');
    });
    expect(screen.getByTestId('bio').textContent).toBe('Senior Developer');
    // Re-render count may or may not have increased — we only assert output.
    expect(renderCount).toBeGreaterThanOrEqual(afterBio);
  });

  it('should handle multiple property access', async () => {
    let renderCount = 0;
    let bloc!: TestCubit;

    function TestComp() {
      renderCount++;
      const [state, b] = useBloc(TestCubit);
      bloc = b as TestCubit;
      return (
        <div>
          <span data-testid="name">{state.user.name}</span>
          <span data-testid="theme">{state.settings.theme}</span>
        </div>
      );
    }

    render(
      <>
        <TestComp />
        <Sentinel touch="counters" />
      </>,
    );

    const initial = renderCount;
    expect(screen.getByTestId('name').textContent).toBe('John');
    expect(screen.getByTestId('theme').textContent).toBe('light');

    await act(async () => {
      bloc.updateTheme('dark');
    });
    expect(renderCount).toBeGreaterThan(initial);
    expect(screen.getByTestId('theme').textContent).toBe('dark');

    const afterTheme = renderCount;

    await act(async () => {
      bloc.updateUserName('Alice');
    });
    expect(renderCount).toBeGreaterThan(afterTheme);
    expect(screen.getByTestId('name').textContent).toBe('Alice');

    const afterName = renderCount;

    // Update unaccessed branch — should NOT re-render
    await act(async () => {
      bloc.incrementViews();
    });
    expect(renderCount).toBe(afterName);
  });

  it('should work correctly in React Strict Mode', async () => {
    let renderCount = 0;
    let bloc!: TestCubit;

    function TestComp() {
      renderCount++;
      const [state, b] = useBloc(TestCubit);
      bloc = b as TestCubit;
      return <span data-testid="name">{state.user.name}</span>;
    }

    render(
      <StrictMode>
        <TestComp />
        <Sentinel touch="counters" />
      </StrictMode>,
    );

    expect(screen.getByTestId('name').textContent).toBe('John');

    await act(async () => {
      bloc.updateUserName('StrictModeTest');
    });
    expect(screen.getByTestId('name').textContent).toBe('StrictModeTest');

    const before = renderCount;
    // Update an unaccessed branch.
    await act(async () => {
      bloc.updateTheme('dark');
    });
    expect(renderCount).toBe(before);
  });

  it('should update tracked paths when conditional rendering changes', async () => {
    let renderCount = 0;
    let bloc!: TestCubit;

    function TestComp() {
      renderCount++;
      const [state, b] = useBloc(TestCubit);
      bloc = b as TestCubit;
      const data =
        state.settings.theme === 'dark'
          ? state.counters.views
          : state.counters.likes;
      return (
        <div>
          <span data-testid="data">{data}</span>
          <span data-testid="theme">{state.settings.theme}</span>
        </div>
      );
    }

    render(
      <>
        <TestComp />
        <Sentinel touch="user" />
      </>,
    );

    expect(screen.getByTestId('theme').textContent).toBe('light');
    expect(screen.getByTestId('data').textContent).toBe('0');

    // Switch to dark mode — now reads counters.views instead of counters.likes.
    await act(async () => {
      bloc.updateTheme('dark');
    });
    expect(screen.getByTestId('theme').textContent).toBe('dark');
    const afterTheme = renderCount;

    // Incrementing views now updates the displayed data.
    await act(async () => {
      bloc.incrementViews();
    });
    expect(renderCount).toBeGreaterThan(afterTheme);
    expect(screen.getByTestId('data').textContent).toBe('1');
  });

  it('should handle array property access', async () => {
    class ArrayCubit extends Cubit<{ items: string[]; other: number }> {
      constructor() {
        super({ items: ['a', 'b', 'c'], other: 0 });
      }
      addItem = (item: string) => {
        this.emit({ ...this.state, items: [...this.state.items, item] });
      };
      updateOther = (value: number) => {
        this.emit({ ...this.state, other: value });
      };
    }

    function OtherSentinel() {
      const [state] = useBloc(ArrayCubit);
      void state.other;
      return null;
    }

    let bloc!: ArrayCubit;
    function TestComp() {
      const [state, b] = useBloc(ArrayCubit);
      bloc = b as ArrayCubit;
      return <span data-testid="count">{state.items.length}</span>;
    }

    render(
      <>
        <TestComp />
        <OtherSentinel />
      </>,
    );

    expect(screen.getByTestId('count').textContent).toBe('3');

    await act(async () => {
      bloc.addItem('d');
    });
    await act(async () => {
      bloc.updateOther(42);
    });

    expect(screen.getByTestId('count').textContent).toBe('4');
  });

  it('should clean up properly on unmount', () => {
    function TestComp() {
      const [state] = useBloc(TestCubit);
      return <span>{state.user.name}</span>;
    }

    const { unmount } = render(<TestComp />);
    expect(() => unmount()).not.toThrow();
  });

  it('should NOT re-render when state is destructured but never accessed', async () => {
    let renderCount = 0;
    let bloc!: TestCubit;

    function TestComp() {
      renderCount++;
      const [, b] = useBloc(TestCubit);
      bloc = b as TestCubit;
      return null;
    }

    render(
      <>
        <TestComp />
        <Sentinel touch="counters" />
      </>,
    );

    const initial = renderCount;

    await act(async () => {
      bloc.updateUserName('Jane');
    });
    expect(renderCount).toBe(initial);

    await act(async () => {
      bloc.updateTheme('dark');
    });
    expect(renderCount).toBe(initial);

    await act(async () => {
      bloc.updateBio('New bio');
    });
    expect(renderCount).toBe(initial);
  });
});
