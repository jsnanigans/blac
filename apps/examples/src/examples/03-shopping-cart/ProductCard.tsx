import { Product } from './types';
import { Card, Button, Badge } from '../../shared/components';

interface ProductCardProps {
  product: Product;
  onAddToCart: (product: Product) => void;
  isDisabled?: boolean;
}

/**
 * Product card component using the new design system.
 * Simple presentational component with callback pattern.
 */
export function ProductCard({
  product,
  onAddToCart,
  isDisabled = false,
}: ProductCardProps) {
  return (
    <Card>
      <div className="stack-sm">
        {/* Product emoji as image placeholder */}
        <div
          style={{
            fontSize: '4rem',
            textAlign: 'center',
            padding: 'var(--space-lg)',
            backgroundColor: 'var(--color-surface)',
            borderRadius: 'var(--border-radius)',
          }}
        >
          {product.image}
        </div>

        {/* Product name and category */}
        <div className="flex-between">
          <h3>{product.name}</h3>
          <Badge>{product.category}</Badge>
        </div>

        {/* Price and add button */}
        <div className="flex-between" style={{ alignItems: 'center' }}>
          <span className="text-lg" style={{ fontWeight: 700 }}>
            ${product.price.toFixed(2)}
          </span>
          <Button
            variant="primary"
            onClick={() => onAddToCart(product)}
            disabled={isDisabled}
            aria-label={`Add ${product.name} to cart`}
          >
            Add to Cart
          </Button>
        </div>
      </div>
    </Card>
  );
}
