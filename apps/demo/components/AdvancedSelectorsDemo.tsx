import React, { useRef, useEffect, useState } from 'react';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

// Complex state shape
interface AppState {
  user: {
    id: string;
    name: string;
    preferences: {
      theme: 'light' | 'dark';
      language: string;
      notifications: boolean;
    };
  };
  products: Array<{
    id: string;
    name: string;
    price: number;
    inStock: boolean;
  }>;
  cart: Array<{
    productId: string;
    quantity: number;
  }>;
  ui: {
    loading: boolean;
    error: string | null;
    selectedProductId: string | null;
  };
}

class AppStateCubit extends Cubit<AppState> {
  constructor() {
    super({
      user: {
        id: '1',
        name: 'John Doe',
        preferences: {
          theme: 'light',
          language: 'en',
          notifications: true,
        },
      },
      products: [
        { id: 'p1', name: 'Laptop', price: 999, inStock: true },
        { id: 'p2', name: 'Mouse', price: 29, inStock: true },
        { id: 'p3', name: 'Keyboard', price: 79, inStock: false },
        { id: 'p4', name: 'Monitor', price: 299, inStock: true },
      ],
      cart: [
        { productId: 'p1', quantity: 1 },
        { productId: 'p2', quantity: 2 },
      ],
      ui: {
        loading: false,
        error: null,
        selectedProductId: null,
      },
    });
  }

  updateUserName = (name: string) => {
    this.emit({
      ...this.state,
      user: { ...this.state.user, name },
    });
  };

  toggleTheme = () => {
    this.emit({
      ...this.state,
      user: {
        ...this.state.user,
        preferences: {
          ...this.state.user.preferences,
          theme:
            this.state.user.preferences.theme === 'light' ? 'dark' : 'light',
        },
      },
    });
  };

  toggleNotifications = () => {
    this.emit({
      ...this.state,
      user: {
        ...this.state.user,
        preferences: {
          ...this.state.user.preferences,
          notifications: !this.state.user.preferences.notifications,
        },
      },
    });
  };

  updateProductPrice = (productId: string, price: number) => {
    this.emit({
      ...this.state,
      products: this.state.products.map((p) =>
        p.id === productId ? { ...p, price } : p,
      ),
    });
  };

  toggleProductStock = (productId: string) => {
    this.emit({
      ...this.state,
      products: this.state.products.map((p) =>
        p.id === productId ? { ...p, inStock: !p.inStock } : p,
      ),
    });
  };

  updateCartQuantity = (productId: string, quantity: number) => {
    this.emit({
      ...this.state,
      cart:
        quantity > 0
          ? this.state.cart.map((item) =>
              item.productId === productId ? { ...item, quantity } : item,
            )
          : this.state.cart.filter((item) => item.productId !== productId),
    });
  };

  selectProduct = (productId: string | null) => {
    this.emit({
      ...this.state,
      ui: { ...this.state.ui, selectedProductId: productId },
    });
  };

  setLoading = (loading: boolean) => {
    this.emit({
      ...this.state,
      ui: { ...this.state.ui, loading },
    });
  };

  // Computed getters
  get cartTotal(): number {
    return this.state.cart.reduce((total, item) => {
      const product = this.state.products.find((p) => p.id === item.productId);
      return total + (product ? product.price * item.quantity : 0);
    }, 0);
  }

  get availableProducts() {
    return this.state.products.filter((p) => p.inStock);
  }

  get cartItemCount() {
    return this.state.cart.reduce((sum, item) => sum + item.quantity, 0);
  }
}

// Component that only cares about user name
const UserNameDisplay: React.FC = () => {
  const [state] = useBloc(AppStateCubit, {
    selector: (state) => [state.user.name],
  });
  const renderCount = useRef(0);
  renderCount.current++;

  return (
    <div
      style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
    >
      <strong>User Name:</strong> {state.user.name}
      <span style={{ float: 'right', fontSize: '0.8em', color: '#666' }}>
        Renders: {renderCount.current}
      </span>
    </div>
  );
};

// Component that only cares about theme
const ThemeDisplay: React.FC = () => {
  const [state] = useBloc(AppStateCubit, {
    selector: (state) => [state.user.preferences.theme],
  });
  const renderCount = useRef(0);
  renderCount.current++;

  return (
    <div
      style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
    >
      <strong>Theme:</strong> {state.user.preferences.theme}
      <span style={{ float: 'right', fontSize: '0.8em', color: '#666' }}>
        Renders: {renderCount.current}
      </span>
    </div>
  );
};

// Component with complex selector
const CartSummary: React.FC = () => {
  const [state, cubit] = useBloc(AppStateCubit, {
    selector: (state, _prevState, instance) => {
      // Only re-render when cart items or their prices change
      const cartData = state.cart.map((item) => {
        const product = state.products.find((p) => p.id === item.productId);
        return {
          quantity: item.quantity,
          price: product?.price || 0,
        };
      });
      return [cartData, instance.cartTotal, instance.cartItemCount];
    },
  });
  const renderCount = useRef(0);
  renderCount.current++;

  return (
    <div
      style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
    >
      <strong>Cart Summary:</strong>
      <div>Items: {cubit.cartItemCount}</div>
      <div>Total: ${cubit.cartTotal.toFixed(2)}</div>
      <span style={{ float: 'right', fontSize: '0.8em', color: '#666' }}>
        Renders: {renderCount.current}
      </span>
    </div>
  );
};

// Component with multiple dependencies
const ProductList: React.FC = () => {
  const [state, cubit] = useBloc(AppStateCubit, {
    selector: (state, _prevState, instance) => [
      instance.availableProducts,
      state.ui.selectedProductId,
    ],
  });
  const renderCount = useRef(0);
  renderCount.current++;

  return (
    <div
      style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
    >
      <strong>Available Products:</strong>
      {cubit.availableProducts.map((product) => (
        <div
          key={product.id}
          style={{
            padding: '5px',
            backgroundColor:
              state.ui.selectedProductId === product.id
                ? '#e0f0ff'
                : 'transparent',
            cursor: 'pointer',
          }}
          onClick={() => cubit.selectProduct(product.id)}
        >
          {product.name} - ${product.price}
        </div>
      ))}
      <span style={{ float: 'right', fontSize: '0.8em', color: '#666' }}>
        Renders: {renderCount.current}
      </span>
    </div>
  );
};

// Component with conditional selector
const ConditionalDisplay: React.FC = () => {
  const [state] = useBloc(AppStateCubit, {
    selector: (state) => {
      // Different dependencies based on theme
      if (state.user.preferences.theme === 'dark') {
        return [
          state.user.preferences.theme,
          state.user.preferences.notifications,
        ];
      } else {
        return [state.user.preferences.theme, state.user.preferences.language];
      }
    },
  });
  const renderCount = useRef(0);
  renderCount.current++;

  return (
    <div
      style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
    >
      <strong>Conditional Display:</strong>
      <div>Theme: {state.user.preferences.theme}</div>
      {state.user.preferences.theme === 'dark' ? (
        <div>
          Notifications: {state.user.preferences.notifications ? 'ON' : 'OFF'}
        </div>
      ) : (
        <div>Language: {state.user.preferences.language}</div>
      )}
      <span style={{ float: 'right', fontSize: '0.8em', color: '#666' }}>
        Renders: {renderCount.current}
      </span>
    </div>
  );
};

const AdvancedSelectorsDemo: React.FC = () => {
  const [state, cubit] = useBloc(AppStateCubit);
  const [nameInput, setNameInput] = useState('');

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h4>Advanced Selector Patterns</h4>
        <p style={{ fontSize: '0.9em', color: '#666' }}>
          Each component tracks its render count. Components only re-render when
          their selected dependencies change.
        </p>
      </div>

      <div
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}
      >
        <div>
          <h5>Controls</h5>
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            <div>
              <Input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="New name"
                style={{ marginRight: '10px' }}
              />
              <Button onClick={() => cubit.updateUserName(nameInput)} size="sm">
                Update Name
              </Button>
            </div>

            <Button onClick={cubit.toggleTheme} size="sm">
              Toggle Theme
            </Button>

            <Button onClick={cubit.toggleNotifications} size="sm">
              Toggle Notifications
            </Button>

            <Button
              onClick={() =>
                cubit.updateProductPrice('p1', Math.floor(Math.random() * 1000))
              }
              size="sm"
            >
              Random Laptop Price
            </Button>

            <Button onClick={() => cubit.toggleProductStock('p3')} size="sm">
              Toggle Keyboard Stock
            </Button>

            <Button
              onClick={() =>
                cubit.updateCartQuantity('p1', Math.floor(Math.random() * 5))
              }
              size="sm"
            >
              Random Cart Quantity
            </Button>

            <Button
              onClick={() => cubit.setLoading(!state.ui.loading)}
              size="sm"
            >
              Toggle Loading
            </Button>
          </div>
        </div>

        <div>
          <h5>Components with Selectors</h5>
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
          >
            <UserNameDisplay />
            <ThemeDisplay />
            <CartSummary />
            <ProductList />
            <ConditionalDisplay />
          </div>
        </div>
      </div>

      <div
        style={{
          marginTop: '20px',
          padding: '15px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          fontSize: '0.85em',
        }}
      >
        <strong>Selector Patterns Demonstrated:</strong>
        <ul style={{ marginTop: '10px', paddingLeft: '20px' }}>
          <li>
            <strong>Simple path selector:</strong>{' '}
            <code>[state.user.name]</code> - Only re-renders on name change
          </li>
          <li>
            <strong>Nested path selector:</strong>{' '}
            <code>[state.user.preferences.theme]</code> - Deep property tracking
          </li>
          <li>
            <strong>Computed value selector:</strong> Using getters like{' '}
            <code>instance.cartTotal</code>
          </li>
          <li>
            <strong>Multiple dependencies:</strong>{' '}
            <code>[availableProducts, selectedProductId]</code>
          </li>
          <li>
            <strong>Conditional selector:</strong> Different dependencies based
            on state
          </li>
          <li>
            <strong>Complex computation:</strong> Transforming state before
            comparison
          </li>
        </ul>

        <strong style={{ display: 'block', marginTop: '15px' }}>
          Performance Tips:
        </strong>
        <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
          <li>Use selectors to minimize re-renders</li>
          <li>Select only the data your component needs</li>
          <li>Leverage getters for computed values</li>
          <li>Return arrays from selectors for shallow comparison</li>
          <li>Use memoization when selectors perform expensive computations</li>
        </ul>
      </div>
    </div>
  );
};

export default AdvancedSelectorsDemo;
