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
    <section className="stack-md">
      <h2>Products</h2>
      <div className="product-grid">
        {PRODUCTS.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAddToCart={cart.addToCart}
          />
        ))}
      </div>
    </section>
  );
}
