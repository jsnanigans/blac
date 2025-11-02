import { Cubit } from '@blac/core';

export type Item = {
  id: string;
  label: string;
};

export type GenericBlocState<T extends Item> = {
  selectedItem: T | null;
  items: T[];
};

/**
 * Generic Bloc to test type inference with generics
 */
export class GenericBloc<T extends Item> extends Cubit<GenericBlocState<T>> {
  static isolated = true;

  constructor(items: T[]) {
    super({
      selectedItem: null,
      items,
    });
  }

  selectItem = (item: T) => {
    this.emit({ ...this.state, selectedItem: item });
  };

  clearSelection = () => {
    this.emit({ ...this.state, selectedItem: null });
  };

  addItem = (item: T) => {
    this.emit({
      ...this.state,
      items: [...this.state.items, item],
    });
  };

  // Method that returns a property of the selected item
  // This tests if TypeScript correctly infers the generic type
  getSelectedLabel = (): string | null => {
    return this.state.selectedItem?.label ?? null;
  };
}
