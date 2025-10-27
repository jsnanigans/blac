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
    <article className="product-card">
      <div className="product-emoji">{product.image}</div>
      <h3>{product.name}</h3>
      <p className="text-small text-muted">{product.category}</p>
      <div className="flex-between">
        <span className="price-tag">${product.price.toFixed(2)}</span>
        <button onClick={() => onAddToCart(product)}>Add to Cart</button>
      </div>
    </article>
  );
}
