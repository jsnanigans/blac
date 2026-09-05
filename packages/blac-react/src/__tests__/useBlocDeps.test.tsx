import { describe, it, expect } from 'vite-plus/test';
import { render, act } from '@testing-library/react';
import { Cubit } from '@blac/core';
import { blacTestSetup } from '@blac/core/testing';
import { useBloc } from '../useBloc';
import { useBlocDeps } from '../useBlocDeps';

class TickCubit extends Cubit<{ seen: number[] }, void, { n: number }> {
  constructor() {
    super({ seen: [] });
  }
  override onDepsChanged() {
    const { n } = this.deps;
    if (n !== undefined) this.patch({ seen: [...this.state.seen, n] });
  }
}

blacTestSetup();

describe('useBlocDeps', () => {
  it('applies on change and skips unchanged renders', () => {
    let bloc!: TickCubit;
    function View({ n }: { n: number }) {
      const [, b] = useBloc(TickCubit);
      bloc = b as TickCubit;
      useBlocDeps(b, { n });
      return null;
    }

    const view = render(<View n={1} />);
    expect(bloc.deps.n).toBe(1);

    act(() => view.rerender(<View n={2} />));
    act(() => view.rerender(<View n={2} />));
    // Re-rendering with an identical slice must not re-notify the bloc.
    expect(bloc.state.seen).toEqual([1, 2]);
  });

  it("withdraws only the unmounted owner's slice", () => {
    let bloc!: TickCubit;
    function Owner({ dep }: { dep: Record<string, number> }) {
      const [, b] = useBloc(TickCubit);
      bloc = b as TickCubit;
      useBlocDeps(b, dep);
      return null;
    }
    function Both({ withSecond }: { withSecond: boolean }) {
      return (
        <>
          <Owner dep={{ n: 1 }} />
          {withSecond ? <Owner dep={{ other: 2 } as never} /> : null}
        </>
      );
    }

    const view = render(<Both withSecond />);
    expect(bloc.deps).toMatchObject({ n: 1, other: 2 });

    // Second owner unmounts; the surviving owner keeps the bloc alive.
    act(() => view.rerender(<Both withSecond={false} />));
    expect(bloc.deps.n).toBe(1);
    // Dropped keys are reconciled to `undefined`, not deleted.
    expect((bloc.deps as Record<string, unknown>).other).toBeUndefined();
  });
});
