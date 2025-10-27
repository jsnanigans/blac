import { Product } from './types';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
}

/**
 * Product card component.
 * Uses callback pattern - no direct Blac usage here.
 */
export function ProductCard({ product, onAddToCart }: ProductCardProps) {
  return (
    <div className="card">
      <div style={{ fontSize: '3rem', textAlign: 'center', marginBottom: '1rem' }}>
        {product.image}
      </div>
      <h3 style={{ marginBottom: '0.5rem' }}>{product.name}</h3>
      <p className="text-small text-muted" style={{ marginBottom: '0.5rem' }}>
        {product.category}
      </p>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>
          ${product.price.toFixed(2)}
        </span>
        <button onClick={() => onAddToCart(product)}>Add to Cart</button>
      </div>
    </div>
  );
}
