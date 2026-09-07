/**
 * Regression: the layout-effect acquire must carry args, so a StrictMode
 * remount (or any re-create after disposal) re-runs init() with real args.
 */

/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect } from 'vite-plus/test';
import { render, screen } from '@testing-library/react';
import { StrictMode } from 'react';
import { Cubit } from '@blac/core';
import { useBloc } from '../useBloc';
import { blacTestSetup } from '@blac/core/testing';

blacTestSetup();

type Args = { userId: string };

class UserCubit extends Cubit<{ id: string }, Args> {
  static key = (a: Args) => a.userId;

  constructor() {
    super({ id: '' });
  }

  protected override init({ userId }: Args): void {
    this.emit({ id: userId });
  }
}

function User({ userId }: Args) {
  const [user] = useBloc(UserCubit, { args: { userId } });
  return <span>{user.id}</span>;
}

describe('useBloc args under StrictMode', () => {
  it('re-runs init with args after a StrictMode remount', () => {
    render(
      <StrictMode>
        <User userId="alice" />
      </StrictMode>,
    );
    expect(screen.getByText('alice')).toBeTruthy();
  });
});
