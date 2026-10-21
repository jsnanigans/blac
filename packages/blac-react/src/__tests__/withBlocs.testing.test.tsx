import { describe, it, expect } from 'vite-plus/test';
import { render, screen } from '@testing-library/react';
import { Cubit } from '@blac/core';
import { blacTestSetup } from '@blac/core/testing';
import { useBloc } from '../useBloc';
import { renderWithBlocs, withBlocs } from '../testing';

blacTestSetup();

class UserCubit extends Cubit<{ name: string }, { id: string }> {
  static key = (a?: { id: string }) => a?.id ?? 'default';
  constructor() {
    super({ name: '' });
  }
}

class ThemeCubit extends Cubit<{ mode: string }> {
  constructor() {
    super({ mode: 'light' });
  }
}

function Panel() {
  const [user] = useBloc(UserCubit, { args: { id: 'u1' } });
  const [theme] = useBloc(ThemeCubit);
  return (
    <span data-testid="out">
      {user.name}:{theme.mode}
    </span>
  );
}

describe('renderWithBlocs', () => {
  it('seeds every bloc, honouring args and default state', () => {
    renderWithBlocs(<Panel />, [
      [UserCubit, { args: { id: 'u1' }, state: { name: 'Ada' } }],
      [ThemeCubit],
    ]);

    expect(screen.getByTestId('out').textContent).toBe('Ada:light');
  });

  it('type-checks seed options against each class', () => {
    renderWithBlocs(<Panel />, [
      // @ts-expect-error mode is not part of UserCubit's state
      [UserCubit, { args: { id: 'u1' }, state: { mode: 'dark' } }],
    ]);
  });
});

describe('withBlocs', () => {
  it('wraps a story in its own seeded registry', () => {
    const decorate = withBlocs([
      [UserCubit, { args: { id: 'u1' }, state: { name: 'Grace' } }],
      [ThemeCubit, { state: { mode: 'dark' } }],
    ]);

    render(decorate(Panel));

    expect(screen.getByTestId('out').textContent).toBe('Grace:dark');
  });

  it('keeps the same instances across re-renders', () => {
    const decorate = withBlocs([[ThemeCubit, { state: { mode: 'dark' } }]]);
    const Mode = () => (
      <span data-testid="m">{useBloc(ThemeCubit)[0].mode}</span>
    );

    const { rerender } = render(decorate(Mode));
    rerender(decorate(Mode));

    expect(screen.getByTestId('m').textContent).toBe('dark');
  });
});
