import { ExampleLayout } from '../../shared/ExampleLayout';
import { ProductGrid } from './ProductGrid';
import { CartView } from './CartView';

/**
 * Shopping cart example demonstrating advanced BlaC patterns.
 *
 * This example shows:
 * 1. Event-driven architecture with Vertex
 * 2. Complex nested state (array of objects with nested properties)
 * 3. Async operations (simulated checkout)
 * 4. Computed values with getters
 * 5. Deep proxy tracking
 * 6. Error handling
 */
export function ShoppingDemo() {
  return (
    <ExampleLayout
      title="Shopping Cart"
      description="Event-driven state management with async operations and complex nested state"
      features={[
        'Vertex pattern - All actions go through typed events',
        'Async checkout simulation with loading states',
        'Computed values via getters (subtotal, tax, total)',
        'Deep proxy tracking - Nested objects automatically tracked',
        'Error handling - 20% failure rate demonstrates error states',
        'Selective re-rendering - ProductGrid never re-renders',
      ]}
    >
      <div className="grid grid-cols-2 gap-lg">
        <ProductGrid />
        <CartView />
      </div>

      <section className="stack-md">
        <h3>How It Works</h3>
        <div className="stack-sm">
          <p className="text-muted">
            This example uses <strong>Vertex</strong>, BlaC's event-driven
            pattern. All cart operations (add, remove, update quantity,
            checkout) are dispatched as typed events and processed through
            registered handlers. This provides a clear audit trail and makes
            complex async operations easier to manage.
          </p>
          <p className="text-muted">
            Watch the console logs to see events being processed. Notice how{' '}
            <strong>ProductGrid never re-renders</strong> when the cart changes,
            because it only accesses cart methods, not state. This is automatic
            optimization with BlaC.
          </p>
          <p className="text-muted">
            The checkout has a simulated <strong>20% failure rate</strong> to
            demonstrate error handling. Try adding items and checking out
            multiple times to see both success and error states.
          </p>
        </div>
      </section>

      <section className="stack-md">
        <h3>Key Concepts</h3>
        <ul className="stack-xs">
          <li className="text-small">
            <strong>Event-Driven State:</strong> AddToCartEvent, CheckoutEvent,
            etc. provide type-safe state transitions
          </li>
          <li className="text-small">
            <strong>Deep Tracking:</strong> Cart items are arrays of objects
            with nested product properties - all automatically tracked
          </li>
          <li className="text-small">
            <strong>Computed Getters:</strong> Subtotal, tax, and total are
            getters that BlaC tracks like state properties
          </li>
          <li className="text-small">
            <strong>Granular Re-renders:</strong> Components only re-render when
            they access state that changed
          </li>
          <li className="text-small">
            <strong>Async Operations:</strong> Checkout shows loading state
            during the 2-second simulated API call
          </li>
        </ul>
      </section>
    </ExampleLayout>
  );
}
