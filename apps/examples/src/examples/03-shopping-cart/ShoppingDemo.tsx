import { ExampleLayout } from '../../shared/ExampleLayout';
import { ProductGrid } from './ProductGrid';
import { CartView } from './CartView';

/**
 * Shopping cart example demonstrating advanced Blac patterns.
 *
 * This example shows:
 * 1. Event-driven architecture with Vertex
 * 2. Complex nested state (array of objects with nested properties)
 * 3. Async operations (simulated checkout)
 * 4. Error handling
 * 5. Deep proxy tracking
 */
export function ShoppingDemo() {
  return (
    <ExampleLayout
      title="Shopping Cart Example"
      description="Advanced event-driven architecture with complex state management"
      features={[
        'Event-driven Vertex pattern - all actions go through typed events',
        'Complex nested state - array of cart items with product objects',
        'Async operations - simulated checkout with loading states',
        'Deep proxy tracking - automatically tracks changes in nested objects',
        'Error handling - demonstrates error state management',
      ]}
    >
      <section className="stack-lg">
        <h2>Event-Driven Architecture</h2>
        <p className="text-muted">
          This example uses Vertex, which processes events through registered
          handlers. All cart actions (AddToCart, RemoveFromCart, UpdateQuantity,
          Checkout) are dispatched as events. Open the console to see event
          processing logs.
        </p>
      </section>

      <div className="panel-grid panel-grid--split">
        <ProductGrid />
        <div className="sticky-panel">
          <CartView />
        </div>
      </div>

      <section className="stack-lg">
        <h2>Key Takeaways</h2>
        <ul className="features-list">
          <li>
            <strong>Event-driven:</strong> All state changes go through typed
            events (AddToCartEvent, CheckoutEvent, etc.)
          </li>
          <li>
            <strong>Deep tracking:</strong> Cart items are deeply nested objects
            (array → item → product → properties), all automatically tracked
          </li>
          <li>
            <strong>Granular updates:</strong> ProductGrid never re-renders
            because it doesn't access cart state, only methods
          </li>
          <li>
            <strong>Async handling:</strong> Checkout simulates async operation
            with loading state - try checking out!
          </li>
          <li>
            <strong>Error states:</strong> 20% chance of checkout failure to
            demonstrate error handling
          </li>
          <li>
            <strong>Type safety:</strong> All events and handlers are fully
            typed for compile-time safety
          </li>
        </ul>
      </section>
    </ExampleLayout>
  );
}
