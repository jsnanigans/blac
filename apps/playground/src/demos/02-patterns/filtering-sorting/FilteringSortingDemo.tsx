import React, { useState } from 'react';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import { Search, SlidersHorizontal, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { DemoArticle } from '@/components/demo-article/DemoArticle';
import { ArticleSection, SectionHeader } from '@/components/demo-article/ArticleSection';
import { Prose } from '@/components/demo-article/Prose';
import { CodePanel } from '@/components/demo-article/CodePanel';
import { ConceptCallout } from '@/components/shared/ConceptCallout';
import { StateViewer } from '@/components/shared/StateViewer';
import { Button } from '@/ui/Button';

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

function ProductCatalogDemo() {
  const [state, cubit] = useBloc(ProductFilterCubit);

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={state.searchQuery}
          onChange={(e) => cubit.setSearchQuery(e.target.value)}
          placeholder="Search products..."
          className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
        />
      </div>

      {/* Filters */}
      <div className="grid md:grid-cols-2 gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
        {/* Category Filter */}
        <div>
          <label className="block text-sm font-medium mb-2">Category</label>
          <select
            value={state.categoryFilter}
            onChange={(e) => cubit.setCategoryFilter(e.target.value)}
            className="w-full px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
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
          <label className="block text-sm font-medium mb-2">
            Price Range: ${state.priceRange.min} - ${state.priceRange.max}
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
            className="w-4 h-4"
          />
          <label htmlFor="inStock" className="text-sm font-medium">
            In Stock Only
          </label>
        </div>

        {/* Sort Controls */}
        <div className="flex gap-2">
          <select
            value={state.sortBy}
            onChange={(e) => cubit.setSortBy(e.target.value as any)}
            className="flex-1 px-3 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700"
          >
            <option value="name">Sort by Name</option>
            <option value="price">Sort by Price</option>
            <option value="rating">Sort by Rating</option>
          </select>
          <Button onClick={cubit.toggleSortOrder} variant="outline">
            {state.sortOrder === 'asc' ? (
              <ArrowUp className="w-4 h-4" />
            ) : (
              <ArrowDown className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {cubit.filteredAndSortedProducts.length} products found
        </span>
        <Button onClick={cubit.resetFilters} variant="outline" size="sm">
          Reset Filters
        </Button>
      </div>

      {/* Product Grid */}
      {cubit.filteredAndSortedProducts.length === 0 ? (
        <div className="flex items-center justify-center h-[200px] border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">
            No products match your filters
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cubit.filteredAndSortedProducts.map((product) => (
            <div
              key={product.id}
              className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <h3 className="font-semibold mb-2">{product.name}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{product.category}</p>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  ${product.price.toFixed(2)}
                </span>
                <span className="text-sm">
                  ⭐ {product.rating.toFixed(1)}
                </span>
              </div>
              {!product.inStock && (
                <span className="inline-block mt-2 px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded">
                  Out of Stock
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <StateViewer bloc={ProductFilterCubit} title="Current State" maxDepth={1} />
    </div>
  );
}

// DEMO METADATA
const demoMetadata = {
  id: 'filtering-sorting',
  title: 'Filtering & Sorting',
  description: 'Master advanced filtering and sorting patterns for lists and catalogs with multiple criteria.',
  category: '02-patterns' as const,
  difficulty: 'intermediate' as const,
  tags: ['cubit', 'filtering', 'sorting', 'search', 'computed'],
  estimatedTime: 12,
  learningPath: {
    previous: 'list-management',
    next: 'persistence',
    sequence: 6,
  },
  theme: {
    primaryColor: '#f59e0b',
    accentColor: '#fbbf24',
  },
};

export function FilteringSortingDemo() {
  return (
    <DemoArticle metadata={demoMetadata} showBlocGraph={true}>
      <ArticleSection theme="cubit" id="introduction">
        <SectionHeader>Advanced Filtering & Sorting</SectionHeader>
        <Prose>
          <p>
            Search and filtering are essential for any data-heavy application. Users need to find
            what they're looking for quickly and efficiently.
          </p>
          <p>
            In this guide, you'll learn how to implement:
          </p>
          <ul>
            <li><strong>Text search</strong> across multiple fields</li>
            <li><strong>Multiple filter combinations</strong> (category, price, stock status)</li>
            <li><strong>Dynamic sorting</strong> with ascending/descending order</li>
            <li><strong>Computed properties</strong> for filtered results</li>
          </ul>
        </Prose>
      </ArticleSection>

      <ArticleSection id="demo">
        <SectionHeader>Interactive Product Catalog</SectionHeader>
        <Prose>
          <p>
            Try the filters below. Notice how all filters work together and the UI updates
            instantly as you change criteria.
          </p>
        </Prose>

        <div className="my-6">
          <ProductCatalogDemo />
        </div>
      </ArticleSection>

      <ArticleSection theme="neutral" id="implementation">
        <SectionHeader>Implementation</SectionHeader>
        <Prose>
          <p>
            The key insight: <strong>filtering and sorting are derived computations</strong>. We
            store the filter criteria in state, then compute the filtered/sorted results in a getter.
          </p>
        </Prose>

        <CodePanel
          language="typescript"
          title="ProductFilterCubit.ts"
          code={`interface ProductState {
  products: Product[];
  // Filter criteria (stored in state)
  searchQuery: string;
  categoryFilter: string;
  priceRange: { min: number; max: number };
  inStockOnly: boolean;
  sortBy: 'name' | 'price' | 'rating';
  sortOrder: 'asc' | 'desc';
}

class ProductFilterCubit extends Cubit<ProductState> {
  // Computed property: applies all filters and sorting
  get filteredAndSortedProducts(): Product[] {
    let results = [...this.state.products];

    // 1. Apply search filter
    if (this.state.searchQuery) {
      const query = this.state.searchQuery.toLowerCase();
      results = results.filter((p) =>
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query)
      );
    }

    // 2. Apply category filter
    if (this.state.categoryFilter !== 'all') {
      results = results.filter((p) => p.category === this.state.categoryFilter);
    }

    // 3. Apply price range filter
    results = results.filter(
      (p) => p.price >= this.state.priceRange.min &&
             p.price <= this.state.priceRange.max
    );

    // 4. Apply stock filter
    if (this.state.inStockOnly) {
      results = results.filter((p) => p.inStock);
    }

    // 5. Apply sorting
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
}`}
        />

        <ConceptCallout type="tip" title="Why Use a Getter?">
          <p>
            Getters compute results <strong>on-demand</strong>. This prevents storing duplicate
            data and ensures the filtered list is always in sync with the criteria.
          </p>
        </ConceptCallout>
      </ArticleSection>

      <ArticleSection id="best-practices">
        <SectionHeader>Best Practices</SectionHeader>
        <Prose>
          <h3>1. Debounce Search Inputs</h3>
        </Prose>
        <CodePanel
          language="typescript"
          code={`// In your component, not in the Cubit
const [debouncedSearch, setDebouncedSearch] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    cubit.setSearchQuery(debouncedSearch);
  }, 300); // Wait 300ms after typing stops

  return () => clearTimeout(timer);
}, [debouncedSearch]);`}
        />

        <Prose>
          <h3>2. Optimize Large Lists</h3>
          <p>
            For lists with 1000+ items, consider:
          </p>
          <ul>
            <li><strong>Virtual scrolling</strong>: Only render visible items</li>
            <li><strong>Web Workers</strong>: Move filtering to background thread</li>
            <li><strong>Pagination</strong>: Limit results per page</li>
          </ul>

          <h3>3. Persist Filter State</h3>
          <p>
            Save filter criteria to URL query params or localStorage so users can bookmark or share
            filtered views.
          </p>
        </Prose>
      </ArticleSection>

      <ArticleSection theme="success" id="summary">
        <SectionHeader>Summary</SectionHeader>
        <Prose>
          <p>
            You've learned how to implement production-ready filtering and sorting:
          </p>
          <ul>
            <li>Store filter <strong>criteria</strong> in state, not filtered results</li>
            <li>Use <strong>computed properties</strong> (getters) for derived data</li>
            <li>Combine multiple filters with <strong>logical AND</strong></li>
            <li>Implement <strong>bi-directional sorting</strong> (asc/desc)</li>
            <li>Provide <strong>reset functionality</strong> for user convenience</li>
          </ul>
        </Prose>
      </ArticleSection>
    </DemoArticle>
  );
}
