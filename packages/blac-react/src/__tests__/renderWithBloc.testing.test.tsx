/**
 * Tests for renderWithBloc: args and deps support.
 */

/// <reference types="@testing-library/jest-dom" />
import { describe, it, expect } from 'vite-plus/test';
import { screen, waitFor } from '@testing-library/react';
import React from 'react';
import { Cubit } from '@blac/core';
import { useBloc } from '../useBloc';
import { blacTestSetup } from '@blac/core/testing';
import { renderWithBloc } from '../testing';

blacTestSetup();

// A bloc that requires args — init seeds state.
type BookArgs = { title: string };
type BookState = { title: string | null };

class BookBloc extends Cubit<BookState, BookArgs> {
  constructor() {
    super({ title: null });
  }

  protected init(a: BookArgs): void {
    this.emit({ title: a.title });
  }
}

// A bloc with deps — onDepsChanged reacts to injected handle.
type EditorDeps = { ref?: { id: number } };
type EditorState = { bound: boolean };

class EditorBloc extends Cubit<EditorState, void, EditorDeps> {
  depsChangedCallCount = 0;

  constructor() {
    super({ bound: false });
  }

  protected onDepsChanged(
    next: Readonly<EditorDeps>,
    _prev: Readonly<EditorDeps>,
  ): void {
    this.depsChangedCallCount++;
    if (next.ref) this.emit({ bound: true });
  }
}

// React components that consume the blocs.
function BookDisplay(): React.ReactElement {
  const [state] = useBloc(BookBloc);
  return <div data-testid="title">{state.title ?? 'no-title'}</div>;
}

function EditorDisplay(): React.ReactElement {
  const [state] = useBloc(EditorBloc);
  return <div data-testid="bound">{state.bound ? 'yes' : 'no'}</div>;
}

describe('renderWithBloc — args support', () => {
  it('seeds bloc state from args and the rendered component reflects it', () => {
    const { bloc } = renderWithBloc(<BookDisplay />, {
      bloc: BookBloc,
      args: { title: 'Pragmatic Programmer' },
    });

    expect(bloc.state.title).toBe('Pragmatic Programmer');
    expect(screen.getByTestId('title').textContent).toBe(
      'Pragmatic Programmer',
    );
  });

  it('no args leaves bloc at default state', () => {
    renderWithBloc(<BookDisplay />, { bloc: BookBloc });
    expect(screen.getByTestId('title').textContent).toBe('no-title');
  });
});

describe('renderWithBloc — deps support', () => {
  it('pre-wires a dep, fires onDepsChanged, and component reflects updated state', async () => {
    const ref = { id: 99 };
    const { bloc } = renderWithBloc(<EditorDisplay />, {
      bloc: EditorBloc,
      deps: { ref },
    });

    // onDepsChanged fired during createCubitStub (before render) → bound = true
    expect(bloc.depsChangedCallCount).toBeGreaterThan(0);
    expect(bloc.deps.ref).toBe(ref);

    await waitFor(() => {
      expect(screen.getByTestId('bound').textContent).toBe('yes');
    });
  });

  it('no deps leaves bloc with empty deps and bound = false', () => {
    renderWithBloc(<EditorDisplay />, { bloc: EditorBloc });
    expect(screen.getByTestId('bound').textContent).toBe('no');
  });
});
