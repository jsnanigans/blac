import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import { motion } from 'framer-motion';
import { Filter, Zap, Target, AlertCircle } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

// ============================================================================
// Render Counter Utility
// ============================================================================

const RenderCounter: React.FC<{ label: string }> = ({ label }) => {
  const renderCount = useRef(0);
  useEffect(() => {
    renderCount.current++;
  });

  return (
    <span className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-mono">
      {label}: {renderCount.current}
    </span>
  );
};

// ============================================================================
// State and Cubit
// ============================================================================

interface AppState {
  user: {
    id: number;
    name: string;
    email: string;
    avatar: string;
  };
  cart: {
    items: Array<{ id: number; name: string; price: number; quantity: number }>;
    discount: number;
  };
  ui: {
    theme: 'light' | 'dark';
    sidebarOpen: boolean;
  };
  lastUpdated: number;
}

class AppCubit extends Cubit<AppState> {
  constructor() {
    super({
      user: {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        avatar: '👤',
      },
      cart: {
        items: [
          { id: 1, name: 'Widget', price: 29.99, quantity: 2 },
          { id: 2, name: 'Gadget', price: 49.99, quantity: 1 },
        ],
        discount: 0,
      },
      ui: {
        theme: 'light',
        sidebarOpen: false,
      },
      lastUpdated: Date.now(),
    });
  }

  updateUserName = (name: string) => {
    this.patch({
      user: { ...this.state.user, name },
      lastUpdated: Date.now(),
    });
  };

  addToCart = () => {
    const newItem = {
      id: Date.now(),
      name: `Item ${this.state.cart.items.length + 1}`,
      price: Math.floor(Math.random() * 50) + 10,
      quantity: 1,
    };
    this.patch({
      cart: {
        ...this.state.cart,
        items: [...this.state.cart.items, newItem],
      },
      lastUpdated: Date.now(),
    });
  };

  setDiscount = (discount: number) => {
    this.patch({
      cart: { ...this.state.cart, discount },
      lastUpdated: Date.now(),
    });
  };

  toggleTheme = () => {
    this.patch({
      ui: {
        ...this.state.ui,
        theme: this.state.ui.theme === 'light' ? 'dark' : 'light',
      },
      lastUpdated: Date.now(),
    });
  };

  toggleSidebar = () => {
    this.patch({
      ui: {
        ...this.state.ui,
        sidebarOpen: !this.state.ui.sidebarOpen,
      },
      lastUpdated: Date.now(),
    });
  };

  // Computed properties for selector comparison
  get cartTotal(): number {
    return this.state.cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
  }

  get cartTotalWithDiscount(): number {
    const subtotal = this.cartTotal;
    return subtotal - subtotal * (this.state.cart.discount / 100);
  }
}

// ============================================================================
// Demo 1: No Selector (Re-renders on ALL changes)
// ============================================================================

function NoSelectorComponent() {
  const [state] = useBloc(AppCubit);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-lg bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-2 border-red-200 dark:border-red-800"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-red-900 dark:text-red-100 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          No Selector (Unoptimized)
        </h4>
        <RenderCounter label="Renders" />
      </div>
      <div className="text-sm text-red-800 dark:text-red-200">
        <p>User: {state.user.name}</p>
        <p>Cart Items: {state.cart.items.length}</p>
      </div>
      <p className="text-xs text-red-600 dark:text-red-400 mt-2">
        ❌ Re-renders on EVERY state change
      </p>
    </motion.div>
  );
}

// ============================================================================
// Demo 2: Dependencies-based optimization (Re-renders only when dependencies change)
// ============================================================================

function BasicSelectorComponent() {
  const [state] = useBloc(AppCubit, {
    dependencies: (bloc) => [bloc.state.user.name],
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-2 border-green-200 dark:border-green-800"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-green-900 dark:text-green-100 flex items-center gap-2">
          <Target className="w-4 h-4" />
          Dependencies (userName only)
        </h4>
        <RenderCounter label="Renders" />
      </div>
      <div className="text-sm text-green-800 dark:text-green-200">
        <p className="font-medium">Hello, {state.user.name}!</p>
      </div>
      <p className="text-xs text-green-600 dark:text-green-400 mt-2">
        ✅ Only re-renders when user name changes
      </p>
    </motion.div>
  );
}

// ============================================================================
// Demo 3: Derived Value Dependencies (Cart summary)
// ============================================================================

function DerivedSelectorComponent() {
  const [state] = useBloc(AppCubit, {
    dependencies: (bloc) => [
      bloc.state.cart.items.length,
      bloc.state.cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    ],
  });

  const itemCount = state.cart.items.length;
  const total = state.cart.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-2 border-blue-200 dark:border-blue-800"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Derived Dependencies (Cart summary)
        </h4>
        <RenderCounter label="Renders" />
      </div>
      <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
        <p>Items: {itemCount}</p>
        <p>Total: ${total.toFixed(2)}</p>
      </div>
      <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
        ✅ Only re-renders when cart items change
      </p>
    </motion.div>
  );
}

// ============================================================================
// Demo 4: Multiple Dependencies (User profile)
// ============================================================================

function CustomEqualityComponent() {
  const [state] = useBloc(AppCubit, {
    dependencies: (bloc) => [bloc.state.user.name, bloc.state.user.email],
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-2 border-purple-200 dark:border-purple-800"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-purple-900 dark:text-purple-100 flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Multiple Dependencies (User profile)
        </h4>
        <RenderCounter label="Renders" />
      </div>
      <div className="text-sm text-purple-800 dark:text-purple-200 space-y-1">
        <p>Name: {state.user.name}</p>
        <p>Email: {state.user.email}</p>
      </div>
      <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
        ✅ Dependencies prevent unnecessary re-renders
      </p>
    </motion.div>
  );
}

// ============================================================================
// Demo 5: Computed Property Dependencies
// ============================================================================

function ComputedSelectorComponent() {
  const [, cubit] = useBloc(AppCubit, {
    dependencies: (bloc) => [
      bloc.cartTotal,
      bloc.state.cart.discount,
      bloc.cartTotalWithDiscount,
    ],
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="p-4 rounded-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 border-2 border-amber-200 dark:border-amber-800"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-amber-900 dark:text-amber-100">
          Computed Property Dependencies
        </h4>
        <RenderCounter label="Renders" />
      </div>
      <div className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
        <p>Subtotal: ${cubit.cartTotal.toFixed(2)}</p>
        <p>Discount: {cubit.state.cart.discount}%</p>
        <p className="font-semibold">Final: ${cubit.cartTotalWithDiscount.toFixed(2)}</p>
      </div>
      <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
        ✅ Tracks computed properties from getters
      </p>
    </motion.div>
  );
}

// ============================================================================
// Control Panel
// ============================================================================

function ControlPanel() {
  const [state, cubit] = useBloc(AppCubit);

  return (
    <div className="p-6 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border-2 border-slate-200 dark:border-slate-700">
      <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        Test Controls - Watch which components re-render
      </h4>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            User Actions
          </h5>
          <div className="space-y-2">
            <button
              onClick={() =>
                cubit.updateUserName(`User ${Math.floor(Math.random() * 1000)}`)
              }
              className="w-full px-3 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded-md transition-colors"
            >
              Change Name
            </button>
          </div>
        </div>

        <div>
          <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Cart Actions
          </h5>
          <div className="space-y-2">
            <button
              onClick={cubit.addToCart}
              className="w-full px-3 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors"
            >
              Add Item to Cart
            </button>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-600 dark:text-slate-400">
                Discount:
              </label>
              <input
                type="range"
                min="0"
                max="50"
                value={state.cart.discount}
                onChange={(e) => cubit.setDiscount(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-xs text-slate-600 dark:text-slate-400 w-8">
                {state.cart.discount}%
              </span>
            </div>
          </div>
        </div>

        <div>
          <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            UI Actions
          </h5>
          <div className="space-y-2">
            <button
              onClick={cubit.toggleTheme}
              className="w-full px-3 py-2 text-sm bg-indigo-500 hover:bg-indigo-600 text-white rounded-md transition-colors"
            >
              Toggle Theme
            </button>
            <button
              onClick={cubit.toggleSidebar}
              className="w-full px-3 py-2 text-sm bg-purple-500 hover:bg-purple-600 text-white rounded-md transition-colors"
            >
              Toggle Sidebar
            </button>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <div className="text-center">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
              Watch the render counters!
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Only components with matching selectors will re-render
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Export
// ============================================================================

export function CustomSelectorsInteractive() {
  return (
    <div className="my-8 space-y-4 not-prose">
      <NoSelectorComponent />
      <BasicSelectorComponent />
      <DerivedSelectorComponent />
      <CustomEqualityComponent />
      <ComputedSelectorComponent />
      <ControlPanel />

      <div className="relative overflow-hidden rounded-3xl border border-brand/30 bg-gradient-to-br from-brand/5 to-brand/10 p-4">
        <div className="relative">
          <p className="text-sm font-medium text-foreground mb-2">
            💡 Selector Performance Impact
          </p>
          <p className="text-sm text-muted-foreground">
            Notice how the red "No Selector" component re-renders on <strong>every</strong>{' '}
            action, while the others only re-render when their specific selected values
            change. In large applications with hundreds of components, this optimization is
            crucial for maintaining 60fps and responsive UIs.
          </p>
        </div>
      </div>
    </div>
  );
}
