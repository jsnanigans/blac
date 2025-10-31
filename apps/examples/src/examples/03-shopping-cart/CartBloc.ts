import { Vertex } from '@blac/core';
import { CartState, Product } from './types';
import {
  AddToCartEvent,
  RemoveFromCartEvent,
  UpdateQuantityEvent,
  CheckoutEvent,
  ClearCartEvent,
} from './CartEvents';

/**
 * Shopping cart Vertex using event-driven architecture.
 *
 * Demonstrates:
 * - Event-driven state management with Vertex
 * - Complex nested state (array of objects)
 * - Async operations (simulated checkout)
 * - Error handling
 * - Deep proxy tracking for cart items
 */
export class CartBloc extends Vertex<CartState> {
  constructor() {
    super({
      items: [],
      isCheckingOut: false,
      checkoutComplete: false,
      error: null,
    });

    // Register event handlers
    this.setupEventHandlers();

    // Lifecycle
    this.onMount = () => {
      console.log('[CartBloc] Mounted with', this.state.items.length, 'items');
    };

    this.onUnmount = () => {
      console.log('[CartBloc] Unmounted');
    };
  }

  private setupEventHandlers() {
    // Add product to cart
    this.on(AddToCartEvent, (event, emit) => {
      const existingItem = this.state.items.find(
        (item) => item.product.id === event.product.id,
      );

      if (existingItem) {
        // Increment quantity if already in cart
        emit({
          ...this.state,
          items: this.state.items.map((item) =>
            item.product.id === event.product.id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          ),
        });
      } else {
        // Add new item
        emit({
          ...this.state,
          items: [...this.state.items, { product: event.product, quantity: 1 }],
        });
      }
    });

    // Remove product from cart
    this.on(RemoveFromCartEvent, (event, emit) => {
      emit({
        ...this.state,
        items: this.state.items.filter(
          (item) => item.product.id !== event.productId,
        ),
      });
    });

    // Update quantity
    this.on(UpdateQuantityEvent, (event, emit) => {
      if (event.quantity <= 0) {
        // Remove if quantity is 0 or less
        emit({
          ...this.state,
          items: this.state.items.filter(
            (item) => item.product.id !== event.productId,
          ),
        });
      } else {
        emit({
          ...this.state,
          items: this.state.items.map((item) =>
            item.product.id === event.productId
              ? { ...item, quantity: event.quantity }
              : item,
          ),
        });
      }
    });

    // Checkout
    this.on(CheckoutEvent, (event, emit) => {
      // Start checkout
      emit({
        ...this.state,
        isCheckingOut: true,
        error: null,
      });

      // Simulate async checkout
      setTimeout(() => {
        // Simulate random success/failure
        const success = Math.random() > 0.2; // 80% success rate

        if (success) {
          this.emit({
            items: [],
            isCheckingOut: false,
            checkoutComplete: true,
            error: null,
          });

          // Reset completion flag after 3 seconds
          setTimeout(() => {
            this.emit({
              ...this.state,
              checkoutComplete: false,
            });
          }, 3000);
        } else {
          this.emit({
            ...this.state,
            isCheckingOut: false,
            error: 'Payment failed. Please try again.',
          });
        }
      }, 2000); // 2 second simulated delay
    });

    // Clear cart
    this.on(ClearCartEvent, (_, emit) => {
      emit({
        items: [],
        isCheckingOut: false,
        checkoutComplete: false,
        error: null,
      });
    });
  }

  // Public methods that dispatch events
  addToCart = (product: Product) => {
    this.add(new AddToCartEvent(product));
  };

  removeFromCart = (productId: string) => {
    this.add(new RemoveFromCartEvent(productId));
  };

  updateQuantity = (productId: string, quantity: number) => {
    this.add(new UpdateQuantityEvent(productId, quantity));
  };

  checkout = () => {
    if (this.state.items.length === 0) {
      return; // Can't checkout empty cart
    }
    this.add(new CheckoutEvent());
  };

  clearCart = () => {
    this.add(new ClearCartEvent());
  };

  // Computed properties
  getTotal = (): number => {
    return this.state.items.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0,
    );
  };

  getItemCount = (): number => {
    return this.state.items.reduce((sum, item) => sum + item.quantity, 0);
  };
}
