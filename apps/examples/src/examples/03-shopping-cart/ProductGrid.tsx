import { useBloc } from '@blac/react';
import { PRODUCTS } from './mockData';
import { CartBloc } from './CartBloc';
import { ProductCard } from './ProductCard';

/**
 * Product grid displaying all available products.
 *
 * This component doesn't access CartBloc state, only its methods,
 * so it never re-renders when cart changes!
 */
export function ProductGrid() {
  const [, cart] = useBloc(CartBloc);

  console.log('[ProductGrid] Rendering - does NOT re-render on cart changes');

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>Products</h2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        {PRODUCTS.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={cart.addToCart}
          />
        ))}
      </div>
    </div>
  );
}
