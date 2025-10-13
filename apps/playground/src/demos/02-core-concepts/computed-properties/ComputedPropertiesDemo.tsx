import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { Button } from '@/ui/Button';
import { DemoArticle } from '@/components/demo-article/DemoArticle';
import { ArticleSection, SectionHeader } from '@/components/demo-article/ArticleSection';
import { Prose } from '@/components/demo-article/Prose';
import { CodePanel } from '@/components/demo-article/CodePanel';
import { StateViewer } from '@/components/shared/StateViewer';
import { ConceptCallout, TipCallout, WarningCallout, InfoCallout } from '@/components/shared/ConceptCallout';
import { InteractionFeedback, useInteractionFeedback, celebrations } from '@/components/shared/InteractionFeedback';
import { motion } from 'framer-motion';

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
      shippingCost: 0, // Free shipping over $100
    });
  }

  // ========== Simple Getters ==========
  // Basic calculation - derive subtotal from items
  get subtotal(): number {
    return this.state.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
  }

  // Item count getter
  get itemCount(): number {
    return this.state.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  // ========== Boolean Getters ==========
  // Check if cart is empty
  get isEmpty(): boolean {
    return this.state.items.length === 0;
  }

  // Check if eligible for free shipping
  get hasFreeShipping(): boolean {
    return this.subtotal >= 100;
  }

  // ========== Formatted Getters ==========
  // Format currency for display
  get displaySubtotal(): string {
    return `$${this.subtotal.toFixed(2)}`;
  }

  // Cart summary string
  get summary(): string {
    if (this.isEmpty) return 'Your cart is empty';
    return `${this.itemCount} item${this.itemCount !== 1 ? 's' : ''} • ${this.displayTotal}`;
  }

  // ========== Complex/Chained Getters ==========
  // Discount amount (uses subtotal getter)
  get discountAmount(): number {
    return this.subtotal * (this.state.discountPercent / 100);
  }

  // Shipping cost (uses subtotal getter)
  get calculatedShipping(): number {
    return this.hasFreeShipping ? 0 : this.state.shippingCost;
  }

  // Tax amount (uses subtotal and discount getters)
  get taxAmount(): number {
    const taxableAmount = this.subtotal - this.discountAmount;
    return taxableAmount * this.state.taxRate;
  }

  // Total (uses multiple getters)
  get total(): number {
    return this.subtotal - this.discountAmount + this.taxAmount + this.calculatedShipping;
  }

  // Formatted total
  get displayTotal(): string {
    return `$${this.total.toFixed(2)}`;
  }

  // Savings amount
  get totalSavings(): number {
    return this.discountAmount + (this.hasFreeShipping ? this.state.shippingCost : 0);
  }

  // ========== Statistics Getters ==========
  // Most expensive item
  get mostExpensiveItem(): string {
    if (this.isEmpty) return 'N/A';
    const item = [...this.state.items].sort((a, b) => b.price - a.price)[0];
    return item.name;
  }

  // Average item price
  get averageItemPrice(): number {
    if (this.isEmpty) return 0;
    const totalValue = this.state.items.reduce((sum, item) => sum + item.price, 0);
    return totalValue / this.state.items.length;
  }

  // Categories in cart
  get categories(): string[] {
    return [...new Set(this.state.items.map(item => item.category))];
  }

  // Cart breakdown by category
  get categoryBreakdown(): Record<string, { count: number; total: number }> {
    return this.state.items.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = { count: 0, total: 0 };
      }
      acc[item.category].count += item.quantity;
      acc[item.category].total += item.price * item.quantity;
      return acc;
    }, {} as Record<string, { count: number; total: number }>);
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
      className="p-3 bg-background/50 rounded-lg flex justify-between items-center"
    >
      <div className="flex-1">
        <div className="font-semibold">{item.name}</div>
        <div className="text-sm text-muted-foreground">
          ${item.price.toFixed(2)} each • {item.category}
        </div>
      </div>
      <div className="flex items-center gap-2">
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

// ============= Interactive Shopping Cart Component =============
function InteractiveShoppingCart() {
  const [state, cubit] = useBloc(ShoppingCartCubit);
  const { celebrate } = useInteractionFeedback();

  const handleAddItem = () => {
    cubit.addItem();

    // Celebrate milestones
    if (cubit.total > 1000 && state.items.length === 3) {
      celebrate('confetti', 'milestone');
    } else if (cubit.itemCount === 10) {
      celebrate('sparkles');
    }
  };

  const handleClearCart = () => {
    if (!cubit.isEmpty) {
      cubit.clearCart();
    }
  };

  return (
    <InteractionFeedback>
      <div className="grid md:grid-cols-2 gap-6">
        {/* Cart Items */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-lg">Shopping Cart</h4>
            <div className="flex gap-2">
              <Button onClick={handleAddItem} variant="primary" size="sm">
                Add Random Item
              </Button>
              <Button onClick={handleClearCart} variant="outline" size="sm" disabled={cubit.isEmpty}>
                Clear Cart
              </Button>
            </div>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {state.items.map((item) => (
              <CartItem key={item.id} item={item} cubit={cubit} />
            ))}
            {cubit.isEmpty && (
              <div className="text-center py-8 text-muted-foreground">
                Your cart is empty. Add some items to see computed properties in action!
              </div>
            )}
          </div>

          {/* Controls */}
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
        </div>

        {/* Computed Values Display */}
        <div className="space-y-4">
          <h4 className="font-semibold text-lg">Computed Properties</h4>

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
              className="p-4 bg-gradient-to-r from-concept-cubit to-concept-cubit/80 text-white rounded-lg"
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
            <h5 className="font-medium mb-2">Cart Statistics</h5>
            <div className="flex justify-between">
              <span>Items in cart:</span>
              <strong>{cubit.itemCount}</strong>
            </div>
            <div className="flex justify-between">
              <span>Cart empty:</span>
              <strong>{cubit.isEmpty ? 'Yes' : 'No'}</strong>
            </div>
            <div className="flex justify-between">
              <span>Most expensive:</span>
              <strong>{cubit.mostExpensiveItem}</strong>
            </div>
            <div className="flex justify-between">
              <span>Average price:</span>
              <strong>${cubit.averageItemPrice.toFixed(2)}</strong>
            </div>
            <div className="flex justify-between">
              <span>Categories:</span>
              <strong>{cubit.categories.join(', ') || 'None'}</strong>
            </div>
            <div className="pt-2 border-t">
              <span className="text-xs text-muted-foreground">Summary:</span>
              <div className="font-medium">{cubit.summary}</div>
            </div>
          </div>
        </div>
      </div>
    </InteractionFeedback>
  );
}

// ============= Demo Metadata =============
const demoMetadata = {
  id: 'computed-properties',
  title: 'Computed Properties with Getters',
  description: 'Learn how to use TypeScript getters to create computed properties that derive values from state automatically.',
  category: '02-core-concepts',
  difficulty: 'beginner' as const,
  tags: ['cubit', 'getters', 'computed', 'derived-state'],
  estimatedTime: 10,
  learningPath: {
    previous: 'event-design',
    next: 'lifecycle',
    sequence: 4,
  },
  theme: {
    primaryColor: '#3b82f6',
    accentColor: '#60a5fa',
  },
};

// ============= Main Demo Component =============
export function ComputedPropertiesDemo() {
  return (
    <DemoArticle metadata={demoMetadata} showBlocGraph={true}>
      {/* Introduction */}
      <ArticleSection theme="cubit" id="introduction">
        <Prose>
          <h2>What Are Computed Properties?</h2>
          <p>
            Have you ever needed to calculate values based on your state? Maybe a shopping cart total,
            a filtered list, or a formatted display string? <strong>Computed properties</strong> using
            TypeScript getters are the perfect solution!
          </p>
          <p>
            Instead of storing redundant calculated values in your state, getters let you
            <strong> derive values on-the-fly</strong>. They automatically update whenever the
            underlying state changes, keeping your state minimal and your calculations always correct.
          </p>
        </Prose>
      </ArticleSection>

      {/* Interactive Shopping Cart */}
      <ArticleSection id="interactive-demo">
        <SectionHeader>Interactive Shopping Cart</SectionHeader>
        <Prose>
          <p>
            Explore a real-world shopping cart that uses computed properties for everything from
            subtotals to shipping calculations. Try adding items, adjusting discounts, and watch
            how all values update automatically!
          </p>
        </Prose>

        <div className="my-8">
          <InteractiveShoppingCart />
        </div>

        <div className="my-8">
          <StateViewer bloc={ShoppingCartCubit} title="Shopping Cart State (Raw)" maxDepth={2} />
        </div>
      </ArticleSection>

      {/* How Getters Work */}
      <ArticleSection theme="neutral" id="how-getters-work">
        <SectionHeader>How Getters Work</SectionHeader>
        <Prose>
          <p>
            TypeScript getters are special methods that act like properties. They're called
            automatically when you access them, calculating their value based on the current state.
          </p>
        </Prose>

        <CodePanel
          code={`class ShoppingCartCubit extends Cubit<ShoppingCartState> {
  // Regular state property
  state = {
    items: [{ price: 10, quantity: 2 }, { price: 20, quantity: 1 }],
    taxRate: 0.08
  };

  // Getter - calculates value when accessed
  get subtotal(): number {
    return this.state.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }

  // Getters can use other getters!
  get tax(): number {
    return this.subtotal * this.state.taxRate;
  }

  get total(): number {
    return this.subtotal + this.tax;
  }
}

// In your component:
const [state, cubit] = useBloc(ShoppingCartCubit);

// Access like a regular property (no parentheses!)
console.log(cubit.subtotal); // 40
console.log(cubit.tax);      // 3.2
console.log(cubit.total);    // 43.2`}
          language="typescript"
          title="Basic Getter Pattern"
          showLineNumbers={true}
          highlightLines={[8, 9, 10, 11, 12, 16, 21, 27, 28, 29]}
          lineLabels={{
            8: 'Define getter with get keyword',
            9: 'Calculate value from state',
            16: 'Getters can reference other getters',
            21: 'Chain getters for complex calculations',
            27: 'Access without parentheses',
          }}
        />

        <ConceptCallout type="info" title="Key Insight">
          <p>
            Getters are <strong>computed on every access</strong>. They don't store values—they
            calculate them fresh each time. This ensures they're always up-to-date with the
            current state!
          </p>
        </ConceptCallout>
      </ArticleSection>

      {/* Getter Types */}
      <ArticleSection theme="cubit" id="getter-types">
        <SectionHeader>Types of Getters</SectionHeader>
        <Prose>
          <p>
            Getters can return any type of value. Here are the most common patterns you'll use
            in your Cubits and Blocs:
          </p>
        </Prose>

        <CodePanel
          code={`class ExampleCubit extends Cubit<State> {
  // 1. Simple Calculations
  get itemCount(): number {
    return this.state.items.length;
  }

  // 2. Boolean Flags
  get isEmpty(): boolean {
    return this.state.items.length === 0;
  }

  get isLoading(): boolean {
    return this.state.status === 'loading';
  }

  get canSubmit(): boolean {
    return this.isValid && !this.isLoading && this.hasChanges;
  }

  // 3. Formatted Values
  get displayPrice(): string {
    return \`$\${this.state.price.toFixed(2)}\`;
  }

  get summary(): string {
    if (this.isEmpty) return 'No items';
    return \`\${this.itemCount} items • \${this.displayPrice}\`;
  }

  // 4. Filtered/Transformed Data
  get activeItems(): Item[] {
    return this.state.items.filter(item => item.active);
  }

  get sortedItems(): Item[] {
    return [...this.state.items].sort((a, b) => a.name.localeCompare(b.name));
  }

  // 5. Complex Objects
  get statistics(): Stats {
    return {
      total: this.itemCount,
      active: this.activeItems.length,
      averagePrice: this.totalPrice / this.itemCount,
      categories: [...new Set(this.state.items.map(i => i.category))],
    };
  }

  // 6. Memoized Values (careful with this pattern!)
  private _expensiveCalculation?: number;
  get expensiveValue(): number {
    if (this._expensiveCalculation === undefined) {
      this._expensiveCalculation = this.performExpensiveCalculation();
    }
    return this._expensiveCalculation;
  }
}`}
          language="typescript"
          title="Common Getter Patterns"
          showLineNumbers={true}
          highlightLines={[3, 8, 15, 20, 30, 39, 48]}
          lineLabels={{
            3: 'Simple numeric calculations',
            8: 'Boolean conditions',
            15: 'Combine multiple conditions',
            20: 'Format for display',
            30: 'Filter arrays',
            39: 'Return complex objects',
            48: 'Manual memoization (use sparingly)',
          }}
        />

        <TipCallout title="Best Practice">
          <p>
            Keep getters <strong>pure and side-effect free</strong>. They should only read state
            and return values, never modify state or trigger external actions.
          </p>
        </TipCallout>
      </ArticleSection>

      {/* Performance Considerations */}
      <ArticleSection theme="warning" id="performance">
        <SectionHeader>Performance Considerations</SectionHeader>
        <Prose>
          <p>
            While getters are powerful, it's important to understand their performance characteristics.
            Since they recalculate on every access, expensive operations can impact performance.
          </p>
        </Prose>

        <CodePanel
          code={`class PerformanceCubit extends Cubit<State> {
  // ❌ BAD: Expensive calculation in getter
  get expensiveFilter(): Item[] {
    console.log('Filtering...'); // This runs EVERY access!
    return this.state.items
      .filter(complexFilter)
      .map(expensiveTransform)
      .sort(complexSort);
  }

  // ✅ GOOD: Store expensive results in state
  private updateFilteredItems = () => {
    const filtered = this.state.items
      .filter(complexFilter)
      .map(expensiveTransform)
      .sort(complexSort);

    this.patch({ filteredItems: filtered });
  };

  // ✅ GOOD: Simple getter for stored value
  get filteredItems(): Item[] {
    return this.state.filteredItems;
  }

  // ✅ GOOD: Light calculations are fine
  get itemCount(): number {
    return this.state.items.length; // O(1) - instant!
  }

  // ✅ OK: Moderate calculations for derived state
  get categoryStats(): Map<string, number> {
    // O(n) but usually acceptable for reasonable n
    const stats = new Map<string, number>();
    for (const item of this.state.items) {
      stats.set(item.category, (stats.get(item.category) || 0) + 1);
    }
    return stats;
  }
}`}
          language="typescript"
          title="Performance Patterns"
          showLineNumbers={true}
          highlightLines={[3, 12, 21, 26, 31]}
          lineLabels={{
            3: 'Runs on every access - bad for expensive operations',
            12: 'Calculate once and store in state',
            21: 'Simple getter for pre-calculated value',
            26: 'Cheap operations are perfect for getters',
            31: 'Moderate complexity is usually fine',
          }}
        />

        <WarningCallout title="Performance Tips">
          <ul>
            <li>Use getters for <strong>simple calculations</strong> that run quickly</li>
            <li>For expensive operations, calculate during state updates and store the result</li>
            <li>Profile your app if you notice performance issues with complex getters</li>
            <li>Consider memoization libraries if you need cached computed values</li>
          </ul>
        </WarningCallout>
      </ArticleSection>

      {/* Getters in Selectors */}
      <ArticleSection theme="cubit" id="selectors">
        <SectionHeader>Using Getters in Selectors</SectionHeader>
        <Prose>
          <p>
            One of the most powerful features of BlaC is using getters with selectors for
            <strong> optimized re-renders</strong>. Components only update when the specific
            computed values they depend on change.
          </p>
        </Prose>

        <CodePanel
          code={`// Define your Cubit with getters
class TodoCubit extends Cubit<TodoState> {
  get completedTodos(): Todo[] {
    return this.state.todos.filter(t => t.completed);
  }

  get activeTodos(): Todo[] {
    return this.state.todos.filter(t => !t.completed);
  }

  get progress(): number {
    const total = this.state.todos.length;
    return total > 0 ? (this.completedTodos.length / total) * 100 : 0;
  }
}

// Component that only cares about progress
function ProgressBar() {
  const [state, cubit] = useBloc(TodoCubit, {
    // Only re-render when progress changes!
    selector: (state, prev, instance) => [instance.progress]
  });

  return <div>Progress: {cubit.progress.toFixed(0)}%</div>;
}

// Component that only cares about active todos
function ActiveTodoList() {
  const [state, cubit] = useBloc(TodoCubit, {
    // Only re-render when active todos change
    selector: (state, prev, instance) => [instance.activeTodos]
  });

  return (
    <ul>
      {cubit.activeTodos.map(todo => (
        <li key={todo.id}>{todo.text}</li>
      ))}
    </ul>
  );
}

// Component with multiple dependencies
function TodoSummary() {
  const [state, cubit] = useBloc(TodoCubit, {
    selector: (state, prev, instance) => [
      instance.completedTodos.length,  // Just the count
      instance.activeTodos.length,      // Just the count
      instance.progress,                 // The percentage
    ]
  });

  return (
    <div>
      <p>Completed: {cubit.completedTodos.length}</p>
      <p>Active: {cubit.activeTodos.length}</p>
      <p>Progress: {cubit.progress}%</p>
    </div>
  );
}`}
          language="typescript"
          title="Getters with Selectors"
          showLineNumbers={true}
          highlightLines={[20, 21, 30, 31, 46, 47, 48, 49, 50]}
          lineLabels={{
            20: 'Selector uses getter for dependencies',
            21: 'Component only updates when progress changes',
            30: 'Different component, different dependencies',
            46: 'Multiple getter dependencies',
            49: 'Fine-grained control over re-renders',
          }}
        />

        <InfoCallout title="Pro Tip">
          <p>
            When using getters in selectors, you're essentially creating a
            <strong> computed dependency graph</strong>. React components only re-render when
            their specific computed values change, not on every state update!
          </p>
        </InfoCallout>
      </ArticleSection>

      {/* Key Takeaways */}
      <ArticleSection theme="success" id="takeaways">
        <SectionHeader>Key Takeaways</SectionHeader>
        <Prose>
          <ul>
            <li>
              <strong>Getters derive values from state</strong> without storing redundant data
            </li>
            <li>
              <strong>Access getters like properties</strong>, not methods (no parentheses)
            </li>
            <li>
              <strong>Getters can use other getters</strong> to build complex calculations
            </li>
            <li>
              <strong>Keep getters pure</strong>—no side effects or state modifications
            </li>
            <li>
              <strong>Use getters in selectors</strong> for optimized React re-renders
            </li>
            <li>
              <strong>Consider performance</strong>—expensive calculations might need caching
            </li>
          </ul>
        </Prose>
      </ArticleSection>

      {/* Next Steps */}
      <ArticleSection theme="info" id="next-steps">
        <SectionHeader>Next Steps</SectionHeader>
        <Prose>
          <p>
            Excellent work! You've mastered computed properties with getters, a fundamental
            pattern for keeping your state lean and your calculations automatic.
          </p>
          <p>
            Next, you'll explore the <strong>Bloc lifecycle</strong>—understanding how Blocs
            and Cubits are created, maintained, and disposed of in your application.
          </p>
        </Prose>
      </ArticleSection>
    </DemoArticle>
  );
}