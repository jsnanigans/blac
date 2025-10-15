import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { Button } from '@/ui/Button';
import { StateViewer } from '@/components/shared/StateViewer';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';

// ============= Shopping Cart State & Cubit =============
interface ShoppingCartState {
  items: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    category: string;
  }>;
  taxRate: number;
  discountPercent: number;
  shippingCost: number;
}

class ShoppingCartCubit extends Cubit<ShoppingCartState> {
  constructor() {
    super({
      items: [
        { id: '1', name: 'MacBook Pro', price: 2499.99, quantity: 1, category: 'Electronics' },
        { id: '2', name: 'Magic Mouse', price: 79.99, quantity: 2, category: 'Electronics' },
        { id: '3', name: 'TypeScript Book', price: 39.99, quantity: 1, category: 'Books' },
      ],
      taxRate: 0.08, // 8%
      discountPercent: 10, // 10% off
      shippingCost: 15, // Base shipping cost
    });
  }

  // ========== Simple Getters ==========
  get subtotal(): number {
    return this.state.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
  }

  get itemCount(): number {
    return this.state.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  // ========== Boolean Getters ==========
  get isEmpty(): boolean {
    return this.state.items.length === 0;
  }

  get hasFreeShipping(): boolean {
    return this.subtotal >= 100;
  }

  // ========== Formatted Getters ==========
  get displaySubtotal(): string {
    return `$${this.subtotal.toFixed(2)}`;
  }

  get summary(): string {
    if (this.isEmpty) return 'Your cart is empty';
    return `${this.itemCount} item${this.itemCount !== 1 ? 's' : ''} • ${this.displayTotal}`;
  }

  // ========== Complex/Chained Getters ==========
  get discountAmount(): number {
    return this.subtotal * (this.state.discountPercent / 100);
  }

  get calculatedShipping(): number {
    return this.hasFreeShipping ? 0 : this.state.shippingCost;
  }

  get taxAmount(): number {
    const taxableAmount = this.subtotal - this.discountAmount;
    return taxableAmount * this.state.taxRate;
  }

  get total(): number {
    return this.subtotal - this.discountAmount + this.taxAmount + this.calculatedShipping;
  }

  get displayTotal(): string {
    return `$${this.total.toFixed(2)}`;
  }

  get totalSavings(): number {
    return this.discountAmount + (this.hasFreeShipping ? this.state.shippingCost : 0);
  }

  // ========== Statistics Getters ==========
  get mostExpensiveItem(): string {
    if (this.isEmpty) return 'N/A';
    const item = [...this.state.items].sort((a, b) => b.price - a.price)[0];
    return item.name;
  }

  get averageItemPrice(): number {
    if (this.isEmpty) return 0;
    const totalValue = this.state.items.reduce((sum, item) => sum + item.price, 0);
    return totalValue / this.state.items.length;
  }

  get categories(): string[] {
    return [...new Set(this.state.items.map(item => item.category))];
  }

  // ========== State Update Methods ==========
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

  updateShippingCost = (cost: number) => {
    this.patch({ shippingCost: Math.max(0, cost) });
  };

  addItem = () => {
    const items = [
      { name: 'iPhone 15 Pro', price: 999.99, category: 'Electronics' },
      { name: 'AirPods Pro', price: 249.99, category: 'Electronics' },
      { name: 'Design Patterns Book', price: 49.99, category: 'Books' },
      { name: 'Coffee Mug', price: 15.99, category: 'Home' },
      { name: 'Mechanical Keyboard', price: 149.99, category: 'Electronics' },
    ];

    const randomItem = items[Math.floor(Math.random() * items.length)];
    const newItem = {
      id: Date.now().toString(),
      ...randomItem,
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

// ============= Helper Components =============
function CartItem({ item, cubit }: { item: any; cubit: ShoppingCartCubit }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="p-3 bg-background/50 rounded-lg flex justify-between items-center gap-3"
    >
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate">{item.name}</div>
        <div className="text-sm text-muted-foreground">
          ${item.price.toFixed(2)} each • {item.category}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <Button
          onClick={() => cubit.updateQuantity(item.id, item.quantity - 1)}
          variant="outline"
          size="sm"
        >
          -
        </Button>
        <span className="w-8 text-center font-medium">{item.quantity}</span>
        <Button
          onClick={() => cubit.updateQuantity(item.id, item.quantity + 1)}
          variant="outline"
          size="sm"
        >
          +
        </Button>
        <Button
          onClick={() => cubit.removeItem(item.id)}
          variant="danger"
          size="sm"
          className="ml-2"
        >
          ×
        </Button>
      </div>
    </motion.div>
  );
}

// ============= Main Interactive Component for MDX =============
export function ComputedPropertiesInteractive() {
  const [state, cubit] = useBloc(ShoppingCartCubit);

  const handleAddItem = () => {
    cubit.addItem();
    if (cubit.itemCount === 10) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });
    }
  };

  return (
    <div className="my-8 space-y-8">
      <div className="grid md:grid-cols-2 gap-6">
        {/* Cart Items */}
        <div className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h3 className="font-semibold text-lg">Shopping Cart</h3>
            <div className="flex gap-2">
              <Button onClick={handleAddItem} variant="primary" size="sm">
                Add Item
              </Button>
              <Button onClick={() => cubit.clearCart()} variant="outline" size="sm" disabled={cubit.isEmpty}>
                Clear
              </Button>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {state.items.map((item) => (
              <CartItem key={item.id} item={item} cubit={cubit} />
            ))}
            {cubit.isEmpty && (
              <div className="text-center py-8 text-muted-foreground">
                Your cart is empty. Add items to see computed properties in action!
              </div>
            )}
          </div>

          {/* Controls */}
          {!cubit.isEmpty && (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
              <div>
                <label className="text-sm font-medium">
                  Discount: {state.discountPercent}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  value={state.discountPercent}
                  onChange={(e) => cubit.updateDiscount(Number(e.target.value))}
                  className="w-full mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Tax Rate: {(state.taxRate * 100).toFixed(1)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="0.5"
                  value={state.taxRate * 100}
                  onChange={(e) => cubit.updateTaxRate(Number(e.target.value) / 100)}
                  className="w-full mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">
                  Shipping Cost: ${state.shippingCost.toFixed(2)}
                  {cubit.hasFreeShipping && ' (Free shipping applied!)'}
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={state.shippingCost}
                  onChange={(e) => cubit.updateShippingCost(Number(e.target.value))}
                  className="w-full mt-1"
                />
              </div>
            </div>
          )}
        </div>

        {/* Computed Values Display */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Computed Properties</h3>

          {cubit.isEmpty ? (
            <div className="text-center py-12 text-muted-foreground">
              Add items to see computed properties
            </div>
          ) : (
            <>
              {/* Price Breakdown */}
              <div className="space-y-2">
                <motion.div
                  key={`subtotal-${cubit.subtotal}`}
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="p-3 bg-gradient-to-r from-blue-500/10 to-blue-500/5 rounded-lg border border-blue-500/20"
                >
                  <div className="text-sm text-muted-foreground">Subtotal</div>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {cubit.displaySubtotal}
                  </div>
                </motion.div>

                {state.discountPercent > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-3 bg-gradient-to-r from-green-500/10 to-green-500/5 rounded-lg border border-green-500/20"
                  >
                    <div className="text-sm text-muted-foreground">
                      Discount ({state.discountPercent}%)
                    </div>
                    <div className="text-xl font-bold text-green-600 dark:text-green-400">
                      -${cubit.discountAmount.toFixed(2)}
                    </div>
                  </motion.div>
                )}

                <div className="p-3 bg-gradient-to-r from-orange-500/10 to-orange-500/5 rounded-lg border border-orange-500/20">
                  <div className="text-sm text-muted-foreground">
                    Tax ({(state.taxRate * 100).toFixed(1)}%)
                  </div>
                  <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                    +${cubit.taxAmount.toFixed(2)}
                  </div>
                </div>

                <div className="p-3 bg-gradient-to-r from-purple-500/10 to-purple-500/5 rounded-lg border border-purple-500/20">
                  <div className="text-sm text-muted-foreground">
                    Shipping {cubit.hasFreeShipping && '(FREE!)'}
                  </div>
                  <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    ${cubit.calculatedShipping.toFixed(2)}
                  </div>
                </div>

                <motion.div
                  key={`total-${cubit.total}`}
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  className="p-4 bg-gradient-to-r from-brand to-brand/80 text-white rounded-lg"
                >
                  <div className="text-sm opacity-90">Total</div>
                  <div className="text-3xl font-bold">{cubit.displayTotal}</div>
                  {cubit.totalSavings > 0 && (
                    <div className="text-sm opacity-90 mt-1">
                      You saved ${cubit.totalSavings.toFixed(2)}!
                    </div>
                  )}
                </motion.div>
              </div>

              {/* Statistics */}
              <div className="p-4 bg-muted/30 rounded-lg space-y-2 text-sm">
                <h4 className="font-medium mb-2">Cart Statistics</h4>
                <div className="flex justify-between">
                  <span>Items in cart:</span>
                  <strong>{cubit.itemCount}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Most expensive:</span>
                  <strong className="truncate ml-2">{cubit.mostExpensiveItem}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Average price:</span>
                  <strong>${cubit.averageItemPrice.toFixed(2)}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Categories:</span>
                  <strong className="truncate ml-2">{cubit.categories.join(', ')}</strong>
                </div>
                <div className="pt-2 border-t">
                  <span className="text-xs text-muted-foreground">Summary:</span>
                  <div className="font-medium">{cubit.summary}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* State Viewer */}
      <StateViewer bloc={ShoppingCartCubit} title="Shopping Cart State" defaultCollapsed={false} maxDepth={2} />
    </div>
  );
}
