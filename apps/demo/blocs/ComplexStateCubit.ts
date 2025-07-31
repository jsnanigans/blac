import { Cubit } from '@blac/core';

export interface ComplexDemoState {
  counter: number;
  text: string;
  flag: boolean;
  nested: {
    value: number;
    deepValue: string;
  };
  items: string[];
  anotherCounter: number;
}

export class ComplexStateCubit extends Cubit<ComplexDemoState> {
  constructor() {
    super({
      counter: 0,
      text: 'Initial Text',
      flag: false,
      nested: {
        value: 100,
        deepValue: 'Deep initial',
      },
      items: ['A', 'B', 'C'],
      anotherCounter: 0,
    });
  }

  incrementCounter = () => {
    this.patch({ counter: this.state.counter + 1 });
  };
  incrementAnotherCounter = () => {
    this.patch({ anotherCounter: this.state.anotherCounter + 1 });
  };
  updateText = (newText: string) => this.patch({ text: newText });
  toggleFlag = () => this.patch({ flag: !this.state.flag });
  updateNestedValue = (newValue: number) =>
    this.patch({ nested: { ...this.state.nested, value: newValue } });
  updateDeepValue = (newDeepValue: string) =>
    this.patch({ nested: { ...this.state.nested, deepValue: newDeepValue } });
  addItem = (item: string) =>
    this.patch({ items: [...this.state.items, item] });
  updateItem = (index: number, item: string) => {
    const newItems = [...this.state.items];
    if (index >= 0 && index < newItems.length) {
      newItems[index] = item;
      this.patch({ items: newItems });
    }
  };
  resetState = () =>
    this.emit({
      counter: 0,
      text: 'Initial Text',
      flag: false,
      nested: {
        value: 100,
        deepValue: 'Deep initial',
      },
      items: ['A', 'B', 'C'],
      anotherCounter: 0,
    });

  // Example of a getter that could be tracked
  get textLength(): number {
    return this.state.text.length;
  }

  get uppercasedText(): string {
    return this.state.text.toUpperCase();
  }
}
