import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { Button } from '@/ui/Button';
import { StateViewer } from '@/components/shared/StateViewer';
import { Search, ArrowUp, ArrowDown } from 'lucide-react';

// Product data types
interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  rating: number;
  inStock: boolean;
}

interface ProductState {
  products: Product[];
  searchQuery: string;
  categoryFilter: string;
  priceRange: { min: number; max: number };
  inStockOnly: boolean;
  sortBy: 'name' | 'price' | 'rating';
  sortOrder: 'asc' | 'desc';
}

// Mock product data
const mockProducts: Product[] = [
  { id: 1, name: 'Wireless Mouse', category: 'Electronics', price: 29.99, rating: 4.5, inStock: true },
  { id: 2, name: 'Mechanical Keyboard', category: 'Electronics', price: 89.99, rating: 4.8, inStock: true },
  { id: 3, name: 'USB-C Cable', category: 'Accessories', price: 12.99, rating: 4.2, inStock: false },
  { id: 4, name: 'Laptop Stand', category: 'Accessories', price: 45.99, rating: 4.6, inStock: true },
  { id: 5, name: 'Desk Lamp', category: 'Furniture', price: 34.99, rating: 4.3, inStock: true },
  { id: 6, name: 'Office Chair', category: 'Furniture', price: 199.99, rating: 4.7, inStock: false },
  { id: 7, name: 'Monitor', category: 'Electronics', price: 249.99, rating: 4.9, inStock: true },
  { id: 8, name: 'Webcam', category: 'Electronics', price: 79.99, rating: 4.4, inStock: true },
  { id: 9, name: 'Phone Charger', category: 'Accessories', price: 19.99, rating: 4.1, inStock: true },
  { id: 10, name: 'Desk Organizer', category: 'Accessories', price: 24.99, rating: 4.0, inStock: false },
];

class ProductFilterCubit extends Cubit<ProductState> {
  constructor() {
    super({
      products: mockProducts,
      searchQuery: '',
      categoryFilter: 'all',
      priceRange: { min: 0, max: 300 },
      inStockOnly: false,
      sortBy: 'name',
      sortOrder: 'asc',
    });
  }

  setSearchQuery = (query: string) => {
    this.patch({ searchQuery: query });
  };

  setCategoryFilter = (category: string) => {
    this.patch({ categoryFilter: category });
  };

  setPriceRange = (min: number, max: number) => {
    this.patch({ priceRange: { min, max } });
  };

  toggleInStockOnly = () => {
    this.patch({ inStockOnly: !this.state.inStockOnly });
  };

  setSortBy = (sortBy: 'name' | 'price' | 'rating') => {
    this.patch({ sortBy });
  };

  toggleSortOrder = () => {
    this.patch({ sortOrder: this.state.sortOrder === 'asc' ? 'desc' : 'asc' });
  };

  resetFilters = () => {
    this.patch({
      searchQuery: '',
      categoryFilter: 'all',
      priceRange: { min: 0, max: 300 },
      inStockOnly: false,
      sortBy: 'name',
      sortOrder: 'asc',
    });
  };

  get filteredAndSortedProducts(): Product[] {
    let results = [...this.state.products];

    // Apply search filter
    if (this.state.searchQuery) {
      const query = this.state.searchQuery.toLowerCase();
      results = results.filter((p) =>
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (this.state.categoryFilter !== 'all') {
      results = results.filter((p) => p.category === this.state.categoryFilter);
    }

    // Apply price range filter
    results = results.filter(
      (p) => p.price >= this.state.priceRange.min && p.price <= this.state.priceRange.max
    );

    // Apply stock filter
    if (this.state.inStockOnly) {
      results = results.filter((p) => p.inStock);
    }

    // Apply sorting
    results.sort((a, b) => {
      let comparison = 0;

      switch (this.state.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'rating':
          comparison = a.rating - b.rating;
          break;
      }

      return this.state.sortOrder === 'asc' ? comparison : -comparison;
    });

    return results;
  }

  get categories(): string[] {
    return Array.from(new Set(this.state.products.map((p) => p.category)));
  }

  get priceStats() {
    const prices = this.state.products.map((p) => p.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: prices.reduce((sum, p) => sum + p, 0) / prices.length,
    };
  }
}

export function FilteringSortingInteractive() {
  const [state, cubit] = useBloc(ProductFilterCubit);

  return (
    <div className="my-8 space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface px-6 py-6 shadow-subtle">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-brand/5 opacity-90" />
          <div className="relative space-y-4">
            <h3 className="text-lg font-semibold mb-4">Product Catalog</h3>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={state.searchQuery}
                onChange={(e) => cubit.setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full pl-10 pr-3 py-2 border-2 border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand bg-background text-sm"
              />
            </div>

            {/* Filters */}
            <div className="space-y-3 p-3 bg-surface-muted rounded-lg">
              {/* Category Filter */}
              <div>
                <label className="block text-xs font-medium mb-1">Category</label>
                <select
                  value={state.categoryFilter}
                  onChange={(e) => cubit.setCategoryFilter(e.target.value)}
                  className="w-full px-2 py-1.5 border-2 border-border rounded-lg bg-background text-sm"
                >
                  <option value="all">All Categories</option>
                  {cubit.categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-xs font-medium mb-1">
                  Price: ${state.priceRange.min} - ${state.priceRange.max}
                </label>
                <div className="flex gap-2">
                  <input
                    type="range"
                    min={cubit.priceStats.min}
                    max={cubit.priceStats.max}
                    value={state.priceRange.min}
                    onChange={(e) => cubit.setPriceRange(Number(e.target.value), state.priceRange.max)}
                    className="flex-1"
                  />
                  <input
                    type="range"
                    min={cubit.priceStats.min}
                    max={cubit.priceStats.max}
                    value={state.priceRange.max}
                    onChange={(e) => cubit.setPriceRange(state.priceRange.min, Number(e.target.value))}
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Stock Filter */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="inStock"
                  checked={state.inStockOnly}
                  onChange={cubit.toggleInStockOnly}
                  className="w-3 h-3 cursor-pointer"
                />
                <label htmlFor="inStock" className="text-xs font-medium cursor-pointer">
                  In Stock Only
                </label>
              </div>

              {/* Sort Controls */}
              <div className="flex gap-2">
                <select
                  value={state.sortBy}
                  onChange={(e) => cubit.setSortBy(e.target.value as any)}
                  className="flex-1 px-2 py-1.5 border-2 border-border rounded-lg bg-background text-xs"
                >
                  <option value="name">Sort by Name</option>
                  <option value="price">Sort by Price</option>
                  <option value="rating">Sort by Rating</option>
                </select>
                <Button onClick={cubit.toggleSortOrder} variant="outline" size="sm" className="px-2">
                  {state.sortOrder === 'asc' ? (
                    <ArrowUp className="w-3 h-3" />
                  ) : (
                    <ArrowDown className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {cubit.filteredAndSortedProducts.length} products
              </span>
              <Button onClick={cubit.resetFilters} variant="outline" size="sm" className="text-xs px-2 py-1">
                Reset
              </Button>
            </div>

            {/* Product Grid */}
            {cubit.filteredAndSortedProducts.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] border-2 border-dashed border-border rounded-lg">
                <p className="text-muted-foreground text-xs">
                  No products match your filters
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {cubit.filteredAndSortedProducts.map((product) => (
                  <div
                    key={product.id}
                    className="p-3 rounded-lg border-2 border-border bg-surface"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{product.name}</h4>
                        <p className="text-xs text-muted-foreground">{product.category}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-green-600 dark:text-green-400">
                          ${product.price.toFixed(2)}
                        </span>
                        <p className="text-xs">
                          ⭐ {product.rating.toFixed(1)}
                        </p>
                      </div>
                    </div>
                    {!product.inStock && (
                      <span className="inline-block mt-1 px-1.5 py-0.5 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
                        Out of Stock
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <StateViewer
            bloc={ProductFilterCubit}
            title="Filter State"
            defaultCollapsed={false}
            maxDepth={2}
          />
        </div>
      </div>
    </div>
  );
}
