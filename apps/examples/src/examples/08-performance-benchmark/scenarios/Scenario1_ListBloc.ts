import { Cubit } from '@blac/core';
import type { ListItem } from '../types';

interface ListState {
  items: ListItem[];
}

/**
 * BlaC implementation for List Updates scenario.
 * Simple array-based state.
 */
export class ListBloc extends Cubit<ListState> {
  constructor(itemCount = 500) {
    super({
      items: Array.from({ length: itemCount }, (_, i) => ({
        id: `item-${i}`,
        value: Math.random() * 100,
        color: '#2563eb',
      })),
    });
  }

  updateRandomItem = () => {
    const randomIndex = Math.floor(Math.random() * this.state.items.length);
    this.update((current) => ({
      items: current.items.map((item, i) =>
        i === randomIndex
          ? {
              ...item,
              value: Math.random() * 100,
              color: `hsl(${Math.random() * 360}, 70%, 60%)`,
            }
          : item,
      ),
    }));
  };

  updateAllItems = () => {
    this.emit({
      items: this.state.items.map((item) => ({
        ...item,
        value: Math.random() * 100,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`,
      })),
    });
  };

  get averageValue(): number {
    return (
      this.state.items.reduce((sum, item) => sum + item.value, 0) /
      this.state.items.length
    );
  }

  reset = () => {
    this.emit({
      items: this.state.items.map((item, i) => ({
        id: `item-${i}`,
        value: 50,
        color: '#2563eb',
      })),
    });
  };
}
