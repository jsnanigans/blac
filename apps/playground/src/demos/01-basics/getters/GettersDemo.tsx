import React from 'react';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';

interface ShoppingCartState {
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  taxRate: number;
  discountPercent: number;
}

class ShoppingCartCubit extends Cubit<ShoppingCartState> {
  constructor() {
    super({
      items: [
        { id: '1', name: 'Laptop', price: 999.99, quantity: 1 },
        { id: '2', name: 'Mouse', price: 29.99, quantity: 2 },
        { id: '3', name: 'Keyboard', price: 79.99, quantity: 1 },
      ],
      taxRate: 0.08, // 8%
      discountPercent: 10, // 10% off
    });
  }

  // Computed getter - calculates subtotal
  get subtotal(): number {
    return this.state.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
  }

  // Computed getter - calculates discount amount
  get discountAmount(): number {
    return this.subtotal * (this.state.discountPercent / 100);
  }

  // Computed getter - calculates tax
  get taxAmount(): number {
    const afterDiscount = this.subtotal - this.discountAmount;
    return afterDiscount * this.state.taxRate;
  }

  // Computed getter - calculates total
  get total(): number {
    return this.subtotal - this.discountAmount + this.taxAmount;
  }

  // Computed getter - item count
  get itemCount(): number {
    return this.state.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  // Computed getter - checks if cart is empty
  get isEmpty(): boolean {
    return this.state.items.length === 0;
  }

  // Computed getter - most expensive item
  get mostExpensiveItem(): string {
    if (this.isEmpty) return 'N/A';
    const item = [...this.state.items].sort((a, b) => b.price - a.price)[0];
    return item.name;
  }

  // Computed getter - formatted summary
  get summary(): string {
    return `${this.itemCount} items, Total: $${this.total.toFixed(2)}`;
  }

  // Methods to update state
  updateQuantity = (id: string, quantity: number) => {
    this.patch({
      items: this.state.items.map((item) =>
        item.id === id ? { ...item, quantity: Math.max(0, quantity) } : item,
      ),
    });
  };

  removeItem = (id: string) => {
    this.patch({
      items: this.state.items.filter((item) => item.id !== id),
    });
  };

  updateDiscount = (percent: number) => {
    this.patch({ discountPercent: Math.max(0, Math.min(100, percent)) });
  };

  updateTaxRate = (rate: number) => {
    this.patch({ taxRate: Math.max(0, rate) });
  };

  addItem = () => {
    const newItem = {
      id: Date.now().toString(),
      name: `Item ${this.state.items.length + 1}`,
      price: Math.random() * 100,
      quantity: 1,
    };
    this.patch({
      items: [...this.state.items, newItem],
    });
  };

  clearCart = () => {
    this.patch({ items: [] });
  };
}

export const GettersDemo: React.FC = () => {
  const [state, cubit] = useBloc(ShoppingCartCubit);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-6">
        <h3 className="text-xl font-bold mb-2">Computed Getters</h3>
        <p className="text-gray-600 dark:text-gray-400">
          Getters provide computed properties derived from state, automatically
          updating when state changes.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h4 className="font-semibold mb-3">Shopping Cart Items</h4>
          <div className="space-y-2">
            {state.items.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg flex justify-between items-center"
              >
                <div>
                  <div className="font-semibold">{item.name}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    ${item.price.toFixed(2)} each
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      cubit.updateQuantity(item.id, item.quantity - 1)
                    }
                    className="px-2 py-1 bg-gray-300 dark:bg-gray-600 rounded"
                  >
                    -
                  </button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <button
                    onClick={() =>
                      cubit.updateQuantity(item.id, item.quantity + 1)
                    }
                    className="px-2 py-1 bg-gray-300 dark:bg-gray-600 rounded"
                  >
                    +
                  </button>
                  <button
                    onClick={() => cubit.removeItem(item.id)}
                    className="px-2 py-1 bg-red-500 text-white rounded ml-2"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
            {cubit.isEmpty && (
              <p className="text-gray-500 text-center py-4">Cart is empty</p>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={cubit.addItem}
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Add Random Item
            </button>
            <button
              onClick={cubit.clearCart}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Clear Cart
            </button>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Computed Values (Getters)</h4>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Subtotal
              </div>
              <div className="text-xl font-bold">
                ${cubit.subtotal.toFixed(2)}
              </div>
            </div>

            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Discount ({state.discountPercent}%)
              </div>
              <div className="text-xl font-bold">
                -${cubit.discountAmount.toFixed(2)}
              </div>
              <input
                type="range"
                min="0"
                max="50"
                value={state.discountPercent}
                onChange={(e) => cubit.updateDiscount(Number(e.target.value))}
                className="w-full mt-2"
              />
            </div>

            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Tax ({(state.taxRate * 100).toFixed(1)}%)
              </div>
              <div className="text-xl font-bold">
                +${cubit.taxAmount.toFixed(2)}
              </div>
              <input
                type="range"
                min="0"
                max="20"
                step="0.5"
                value={state.taxRate * 100}
                onChange={(e) =>
                  cubit.updateTaxRate(Number(e.target.value) / 100)
                }
                className="w-full mt-2"
              />
            </div>

            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Total
              </div>
              <div className="text-2xl font-bold">
                ${cubit.total.toFixed(2)}
              </div>
            </div>

            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Item Count:</span>
                <strong>{cubit.itemCount}</strong>
              </div>
              <div className="flex justify-between">
                <span>Is Empty:</span>
                <strong>{cubit.isEmpty ? 'Yes' : 'No'}</strong>
              </div>
              <div className="flex justify-between">
                <span>Most Expensive:</span>
                <strong>{cubit.mostExpensiveItem}</strong>
              </div>
              <div className="flex justify-between">
                <span>Summary:</span>
                <strong>{cubit.summary}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg">
        <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">
          How Getters Work
        </h4>
        <ul className="text-sm space-y-1 text-gray-700 dark:text-gray-300">
          <li>
            • Getters are computed properties that derive values from state
          </li>
          <li>
            • They automatically recalculate when the underlying state changes
          </li>
          <li>
            • Access them like regular properties: <code>cubit.total</code>
          </li>
          <li>• Perfect for calculations, formatting, and derived state</li>
          <li>• Can be used in selectors for optimized re-renders</li>
        </ul>
      </div>
    </div>
  );
};

export const gettersCode = {
  usage: `import { Cubit } from '@blac/core';

class ShoppingCartCubit extends Cubit<CartState> {
  // Computed getter - automatically updates
  get total(): number {
    return this.state.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }

  // Boolean getter
  get isEmpty(): boolean {
    return this.state.items.length === 0;
  }

  // Formatted getter
  get displayTotal(): string {
    return \`$\${this.total.toFixed(2)}\`;
  }

  // Complex computation
  get statistics() {
    return {
      itemCount: this.state.items.length,
      total: this.total,
      average: this.total / this.state.items.length
    };
  }
}

// Usage in component
function Cart() {
  const [state, cubit] = useBloc(ShoppingCartCubit);
  
  return (
    <div>
      <p>Total: {cubit.displayTotal}</p>
      <p>Empty: {cubit.isEmpty ? 'Yes' : 'No'}</p>
      <p>Stats: {JSON.stringify(cubit.statistics)}</p>
    </div>
  );
}`,
  bloc: `// Getters can be used in selectors
const [state, cubit] = useBloc(CartCubit, {
  dependencies: (c) => [
    c.total,        // Re-render when total changes
    c.isEmpty,      // Re-render when empty status changes
    c.statistics    // Re-render when stats change
  ]
});

// Getters are reactive
class DataCubit extends Cubit<DataState> {
  // This getter updates automatically
  get isLoading() {
    return this.state.status === 'loading';
  }
  
  get hasError() {
    return this.state.error !== null;
  }
  
  get isReady() {
    return !this.isLoading && !this.hasError;
  }
  
  // Getters can use other getters
  get statusMessage() {
    if (this.isLoading) return 'Loading...';
    if (this.hasError) return \`Error: \${this.state.error}\`;
    if (this.isReady) return 'Ready';
    return 'Unknown';
  }
}`,
};
