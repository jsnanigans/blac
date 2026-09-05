import { describe, it, expect } from 'vite-plus/test';
import { render } from '@testing-library/react';
import { Cubit } from '@blac/core';
import { blacTestSetup } from '@blac/core/testing';
import { useBloc } from '../useBloc';

class PrivateBloc extends Cubit<{ items: number[] }> {
  #hidden = 3;
  constructor() {
    super({ items: [1, 2] });
  }
  get total() {
    return this.state.items.length + this.#hidden;
  }
  bump() {
    this.patch({ items: [...this.state.items, 0] });
  }
  readHidden() {
    return this.#hidden;
  }
}

blacTestSetup();

describe('ES #private in user blocs', () => {
  it('reads a #private field from a getter during render', () => {
    let total: number | undefined;
    function View() {
      const [, bloc] = useBloc(PrivateBloc);
      total = bloc.total;
      return null;
    }
    render(<View />);
    expect(total).toBe(5);
  });

  it('reads a #private field from a method called through the proxy', () => {
    let hidden: number | undefined;
    function View() {
      const [, bloc] = useBloc(PrivateBloc);
      hidden = bloc.readHidden();
      return null;
    }
    render(<View />);
    expect(hidden).toBe(3);
  });
});
