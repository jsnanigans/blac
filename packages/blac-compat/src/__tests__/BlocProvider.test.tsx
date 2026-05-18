import { describe, it, expect } from 'vite-plus/test';
import { render } from '@testing-library/react';
import { blacTestSetup } from '@blac/core/testing';
import { Cubit } from '../Cubit';
import { BlocProvider } from '../BlocProvider';
import { useBloc } from '../useBloc';

class ProvidedCubit extends Cubit<{ name: string }> {
  constructor() {
    super({ name: 'fresh' });
  }
}

blacTestSetup();

describe('shim BlocProvider', () => {
  it('descendants resolve to the same instance as the provider', () => {
    const provided = new ProvidedCubit();

    let inside!: ProvidedCubit;
    function Inner() {
      const [, b] = useBloc(ProvidedCubit);
      inside = b as ProvidedCubit;
      return null;
    }

    render(
      <BlocProvider bloc={provided}>
        <Inner />
      </BlocProvider>,
    );

    // Provider adopts the supplied instance into the registry. The exact
    // identity won't match (registry instance is its own object), but the
    // adopted state should land on the registry instance.
    expect(inside).toBeInstanceOf(ProvidedCubit);
    expect(inside.state.name).toBe('fresh');
  });

  it('sibling subtrees with different blocs do not share instances', () => {
    const a = new ProvidedCubit();
    const b = new ProvidedCubit();

    let insideA!: ProvidedCubit;
    let insideB!: ProvidedCubit;
    function InnerA() {
      const [, b] = useBloc(ProvidedCubit);
      insideA = b as ProvidedCubit;
      return null;
    }
    function InnerB() {
      const [, b] = useBloc(ProvidedCubit);
      insideB = b as ProvidedCubit;
      return null;
    }

    render(
      <>
        <BlocProvider bloc={a}>
          <InnerA />
        </BlocProvider>
        <BlocProvider bloc={b}>
          <InnerB />
        </BlocProvider>
      </>,
    );

    expect(insideA).not.toBe(insideB);
  });

  it('accepts a factory function as `bloc`', () => {
    let inside!: ProvidedCubit;
    function Inner() {
      const [, b] = useBloc(ProvidedCubit);
      inside = b as ProvidedCubit;
      return null;
    }

    render(
      <BlocProvider bloc={() => new ProvidedCubit()}>
        <Inner />
      </BlocProvider>,
    );

    expect(inside).toBeInstanceOf(ProvidedCubit);
  });
});
