import React from 'react';
import { Bloc } from '@blac/core';
import { useBloc } from '@blac/react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

// State shape
interface ShoppingCartState {
  items: Array<{ id: string; name: string; quantity: number; price: number }>;
  discount: number;
  couponCode: string | null;
}

// Event classes
class AddItemEvent {
  constructor(
    public readonly id: string,
    public readonly name: string,
    public readonly price: number
  ) {}
}

class RemoveItemEvent {
  constructor(public readonly id: string) {}
}

class UpdateQuantityEvent {
  constructor(
    public readonly id: string,
    public readonly quantity: number
  ) {}
}

class ApplyCouponEvent {
  constructor(public readonly code: string) {}
}

class ClearCartEvent {}

type CartEvents = 
  | AddItemEvent 
  | RemoveItemEvent 
  | UpdateQuantityEvent 
  | ApplyCouponEvent 
  | ClearCartEvent;

// Reducer-style Bloc with pure functions for state transitions
class ShoppingCartBloc extends Bloc<ShoppingCartState, CartEvents> {
  constructor() {
    super({
      items: [],
      discount: 0,
      couponCode: null
    });

    // Register handlers using reducer-like pure functions
    this.on(AddItemEvent, this.handleAddItem);
    this.on(RemoveItemEvent, this.handleRemoveItem);
    this.on(UpdateQuantityEvent, this.handleUpdateQuantity);
    this.on(ApplyCouponEvent, this.handleApplyCoupon);
    this.on(ClearCartEvent, this.handleClearCart);
  }

  // Reducer-style handlers - pure functions that return new state
  private handleAddItem = (event: AddItemEvent, emit: (state: ShoppingCartState) => void) => {
    const existingItem = this.state.items.find(item => item.id === event.id);
    
    if (existingItem) {
      // Item exists, increment quantity
      emit({
        ...this.state,
        items: this.state.items.map(item =>
          item.id === event.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      });
    } else {
      // Add new item
      emit({
        ...this.state,
        items: [...this.state.items, {
          id: event.id,
          name: event.name,
          price: event.price,
          quantity: 1
        }]
      });
    }
  };

  private handleRemoveItem = (event: RemoveItemEvent, emit: (state: ShoppingCartState) => void) => {
    emit({
      ...this.state,
      items: this.state.items.filter(item => item.id !== event.id)
    });
  };

  private handleUpdateQuantity = (event: UpdateQuantityEvent, emit: (state: ShoppingCartState) => void) => {
    if (event.quantity <= 0) {
      // Remove item if quantity is 0 or less
      this.handleRemoveItem(new RemoveItemEvent(event.id), emit);
    } else {
      emit({
        ...this.state,
        items: this.state.items.map(item =>
          item.id === event.id
            ? { ...item, quantity: event.quantity }
            : item
        )
      });
    }
  };

  private handleApplyCoupon = (event: ApplyCouponEvent, emit: (state: ShoppingCartState) => void) => {
    // Simple coupon logic
    const discounts: Record<string, number> = {
      'SAVE10': 0.10,
      'SAVE20': 0.20,
      'HALFOFF': 0.50
    };

    const discount = discounts[event.code.toUpperCase()] || 0;
    
    emit({
      ...this.state,
      discount,
      couponCode: discount > 0 ? event.code.toUpperCase() : null
    });
  };

  private handleClearCart = (_event: ClearCartEvent, emit: (state: ShoppingCartState) => void) => {
    emit({
      items: [],
      discount: 0,
      couponCode: null
    });
  };

  // Helper methods for dispatching events
  addItem = (id: string, name: string, price: number) => {
    this.add(new AddItemEvent(id, name, price));
  };

  removeItem = (id: string) => {
    this.add(new RemoveItemEvent(id));
  };

  updateQuantity = (id: string, quantity: number) => {
    this.add(new UpdateQuantityEvent(id, quantity));
  };

  applyCoupon = (code: string) => {
    this.add(new ApplyCouponEvent(code));
  };

  clearCart = () => {
    this.add(new ClearCartEvent());
  };

  // Computed getters
  get subtotal(): number {
    return this.state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  }

  get discountAmount(): number {
    return this.subtotal * this.state.discount;
  }

  get total(): number {
    return this.subtotal - this.discountAmount;
  }

  get itemCount(): number {
    return this.state.items.reduce((sum, item) => sum + item.quantity, 0);
  }
}

// Sample products
const PRODUCTS = [
  { id: '1', name: 'Coffee', price: 4.99 },
  { id: '2', name: 'Sandwich', price: 8.99 },
  { id: '3', name: 'Salad', price: 7.99 },
  { id: '4', name: 'Cookie', price: 2.99 }
];

const BlocWithReducerDemo: React.FC = () => {
  const [state, bloc] = useBloc(ShoppingCartBloc);
  const [couponInput, setCouponInput] = React.useState('');

  return (
    <div style={{ display: 'flex', gap: '30px' }}>
      <div style={{ flex: 1 }}>
        <h4>Products</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {PRODUCTS.map(product => (
            <div key={product.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px',
              border: '1px solid #ddd',
              borderRadius: '4px'
            }}>
              <div>
                <strong>{product.name}</strong>
                <div style={{ fontSize: '0.9em', color: '#666' }}>
                  ${product.price.toFixed(2)}
                </div>
              </div>
              <Button 
                onClick={() => bloc.addItem(product.id, product.name, product.price)}
                size="sm"
              >
                Add to Cart
              </Button>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '20px' }}>
          <h4>Apply Coupon</h4>
          <div style={{ display: 'flex', gap: '10px' }}>
            <Input
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              placeholder="Enter code"
              style={{ flex: 1 }}
            />
            <Button onClick={() => {
              bloc.applyCoupon(couponInput);
              setCouponInput('');
            }}>
              Apply
            </Button>
          </div>
          <div style={{ fontSize: '0.8em', color: '#666', marginTop: '5px' }}>
            Try: SAVE10, SAVE20, or HALFOFF
          </div>
        </div>
      </div>

      <div style={{ flex: 1 }}>
        <h4>Shopping Cart ({bloc.itemCount} items)</h4>
        
        {state.items.length === 0 ? (
          <div style={{ 
            padding: '20px', 
            textAlign: 'center', 
            color: '#999',
            border: '1px dashed #ddd',
            borderRadius: '4px'
          }}>
            Cart is empty
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {state.items.map(item => (
                <div key={item.id} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px'
                }}>
                  <div>
                    <strong>{item.name}</strong>
                    <div style={{ fontSize: '0.9em', color: '#666' }}>
                      ${item.price.toFixed(2)} each
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Button 
                      onClick={() => bloc.updateQuantity(item.id, item.quantity - 1)}
                      size="sm"
                      variant="outline"
                    >
                      -
                    </Button>
                    <span style={{ minWidth: '30px', textAlign: 'center' }}>
                      {item.quantity}
                    </span>
                    <Button 
                      onClick={() => bloc.updateQuantity(item.id, item.quantity + 1)}
                      size="sm"
                      variant="outline"
                    >
                      +
                    </Button>
                    <Button 
                      onClick={() => bloc.removeItem(item.id)}
                      size="sm"
                      variant="destructive"
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              backgroundColor: '#f5f5f5',
              borderRadius: '4px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                <span>Subtotal:</span>
                <span>${bloc.subtotal.toFixed(2)}</span>
              </div>
              {state.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', color: '#28a745' }}>
                  <span>Discount ({state.couponCode}):</span>
                  <span>-${bloc.discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                fontWeight: 'bold',
                fontSize: '1.1em',
                borderTop: '1px solid #ddd',
                paddingTop: '5px'
              }}>
                <span>Total:</span>
                <span>${bloc.total.toFixed(2)}</span>
              </div>
            </div>

            <Button 
              onClick={bloc.clearCart}
              variant="destructive"
              style={{ width: '100%', marginTop: '10px' }}
            >
              Clear Cart
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default BlocWithReducerDemo;