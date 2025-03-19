import { useBloc } from '@blac/react';
import { createFileRoute } from '@tanstack/react-router';
import { useRenderCount } from '@uidotdev/usehooks';
import { Cubit } from 'blac-next';
import { useEffect, useMemo, useRef } from 'react';
import CodeHighlighter from '../../components/CodeHighlighter';
import { memo } from 'react';

export const Route = createFileRoute('/demo/dependency-tracking')({
  component: DependencyTrackingDemo,
});

// Complex state with multiple properties to demonstrate dependency tracking
interface UserPreferencesState {
  // Basic settings
  theme: 'light' | 'dark';
  fontSize: number;
  language: string;
  refreshRate: number;

  // Notifications (flattened from nested object)
  notificationsEmail: boolean;
  notificationsPush: boolean;
  notificationsSms: boolean;

  // Password management
  password: string;
  showPassword: boolean;

  // User profile (flattened from nested object)
  username: string;
  email: string;
  avatar: number;

  // Filter options (flattened from nested object)
  filterCategory: string;
  filterMinPrice: number;
  filterMaxPrice: number;
  filterInStock: boolean;

  // Product data
  products: Product[];
}

// Define interface for product type
interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
  inStock: boolean;
}

// Cubit to manage the complex state
class UserPreferencesCubit extends Cubit<UserPreferencesState> {
  constructor() {
    super({
      // Basic settings
      theme: 'light',
      fontSize: 16,
      language: 'en',
      refreshRate: 60,

      // Notifications (flattened)
      notificationsEmail: true,
      notificationsPush: true,
      notificationsSms: false,

      // Password management
      password: '',
      showPassword: false,

      // User profile (flattened)
      username: 'cyber_user',
      email: 'user@cyber.io',
      avatar: 1,

      // Filter options (flattened)
      filterCategory: 'all',
      filterMinPrice: 0,
      filterMaxPrice: 1000,
      filterInStock: true,

      // Product data
      products: [
        {
          id: 1,
          name: 'Neon Sunglasses',
          price: 120,
          category: 'accessories',
          inStock: true,
        },
        {
          id: 2,
          name: 'Holographic Jacket',
          price: 350,
          category: 'clothing',
          inStock: true,
        },
        {
          id: 3,
          name: 'Digital Sneakers',
          price: 220,
          category: 'footwear',
          inStock: false,
        },
        {
          id: 4,
          name: 'LED Backpack',
          price: 180,
          category: 'accessories',
          inStock: true,
        },
        {
          id: 5,
          name: 'Smart Bracelet',
          price: 90,
          category: 'gadgets',
          inStock: true,
        },
        {
          id: 6,
          name: 'AR Visor',
          price: 450,
          category: 'gadgets',
          inStock: false,
        },
      ],
    });
  }

  setTheme(theme: 'light' | 'dark') {
    this.patch({ theme });
  }

  setFontSize(fontSize: number) {
    this.patch({ fontSize });
  }

  toggleEmailNotifications() {
    this.patch({
      notificationsEmail: !this.state.notificationsEmail,
    });
  }

  togglePushNotifications() {
    this.patch({
      notificationsPush: !this.state.notificationsPush,
    });
  }

  toggleSmsNotifications() {
    this.patch({
      notificationsSms: !this.state.notificationsSms,
    });
  }

  setLanguage(language: string) {
    this.patch({ language });
  }

  setRefreshRate(refreshRate: number) {
    this.patch({ refreshRate });
  }

  setPassword(password: string) {
    this.patch({ password });
  }

  toggleShowPassword() {
    this.patch({ showPassword: !this.state.showPassword });
  }

  updateUsername(username: string) {
    this.patch({ username });
  }

  updateEmail(email: string) {
    this.patch({ email });
  }

  changeAvatar(avatar: number) {
    this.patch({ avatar });
  }

  setCategory(category: string) {
    this.patch({ filterCategory: category });
  }

  setMinPrice(minPrice: number) {
    this.patch({ filterMinPrice: minPrice });
  }

  setMaxPrice(maxPrice: number) {
    this.patch({ filterMaxPrice: maxPrice });
  }

  toggleInStock() {
    this.patch({ filterInStock: !this.state.filterInStock });
  }

  // Computed properties
  get filteredItems() {
    // Simulate a computation that would depend on filter options
    return ['Item A', 'Item B', 'Item C'].filter(
      () => this.state.filterInStock,
    );
  }

  get userInitials() {
    return this.state.username.substring(0, 2).toUpperCase();
  }

  // Filtered products getter - demonstrates conditional dependency tracking
  previouslyFilteredProducts: null | number[] = null;

  // Computed property that filters products
  get filteredProducts() {
    // Get IDs of filtered products instead of product objects
    const filteredIds = this.state.products
      .filter((product) => {
        const categoryMatch =
          this.state.filterCategory === 'all' ||
          product.category === this.state.filterCategory;

        const priceMatch =
          product.price >= this.state.filterMinPrice &&
          product.price <= this.state.filterMaxPrice;

        // This condition means we only check inStock when the filter is enabled
        // This is the key to conditional dependency tracking!
        const stockMatch = !this.state.filterInStock || product.inStock;

        return categoryMatch && priceMatch && stockMatch;
      })
      .map((product) => product.id);

    // Perform manual equality check to avoid unnecessary re-renders
    // For arrays and objects, Blac uses Object.is() for equality checks (same as React)
    if (
      this.previouslyFilteredProducts !== null &&
      this.previouslyFilteredProducts.length === filteredIds.length &&
      this.previouslyFilteredProducts.every((val, i) =>
        Object.is(val, filteredIds[i]),
      )
    ) {
      return this.previouslyFilteredProducts;
    }

    // Store the new result for future comparisons
    this.previouslyFilteredProducts = filteredIds;
    return filteredIds;
  }

  // Get a single product by ID
  getProduct(id: number): Product | undefined {
    return this.state.products.find((p) => p.id === id);
  }

  // Add or update a product
  setProduct(product: Product) {
    const index = this.state.products.findIndex((p) => p.id === product.id);
    const newProducts = [...this.state.products];

    if (index >= 0) {
      newProducts[index] = product;
    } else {
      newProducts.push(product);
    }

    this.patch({ products: newProducts });
  }

  // Toggle a product's in-stock status
  toggleProductStock(productId: number) {
    const product = this.getProduct(productId);
    if (product) {
      this.setProduct({
        ...product,
        inStock: !product.inStock,
      });
    }
  }

  // Helper method for array comparison
  private arraysEqual(a: number[] | null, b: number[]): boolean {
    if (a === null) return false;
    if (a.length !== b.length) return false;
    return a.every((val, idx) => Object.is(val, b[idx]));
  }
}

// Component that only renders when theme changes
function ThemeComponent() {
  const renderCount = useRef(0);
  const [{ theme }, prefsCubit] = useBloc(UserPreferencesCubit);

  useEffect(() => {
    renderCount.current += 1;
  });

  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg relative mb-4 bg-white dark:bg-gray-800 shadow-lg">
      <span className="render-badge px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
        Renders: {renderCount.current}
      </span>
      <h3 className="font-bold mb-3 text-xl text-blue-700 dark:text-blue-300">
        Theme Component
      </h3>
      <p className="mb-3 text-gray-700 dark:text-gray-300">
        This component only uses the <code>theme</code> property.
      </p>
      <div
        className={`p-4 rounded-lg mb-4 flex items-center ${theme === 'light' ? 'bg-yellow-100 text-gray-800' : 'bg-indigo-900 text-white'}`}
      >
        <div
          className="w-10 h-10 rounded-full mr-4 flex items-center justify-center"
          style={{
            backgroundColor: theme === 'light' ? '#facc15' : '#6366f1',
          }}
        >
          {theme === 'light' ? '☀️' : '🌙'}
        </div>
        <span className="text-lg">
          Current theme: <strong>{theme}</strong>
        </span>
      </div>
      <button
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-300"
        onClick={() =>
          prefsCubit.setTheme(theme === 'light' ? 'dark' : 'light')
        }
      >
        Toggle Theme
      </button>
    </div>
  );
}

// Component that only renders when font size changes
function FontSizeComponent() {
  const renderCount = useRef(0);
  const [{ fontSize }, prefsCubit] = useBloc(UserPreferencesCubit);

  useEffect(() => {
    renderCount.current += 1;
  });

  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg relative mb-4 bg-white dark:bg-gray-800 shadow-lg">
      <span className="render-badge px-2 py-1 bg-green-600 text-white text-xs rounded-full">
        Renders: {renderCount.current}
      </span>
      <h3 className="font-bold mb-3 text-xl text-green-700 dark:text-green-300">
        Font Size Component
      </h3>
      <p className="mb-3 text-gray-700 dark:text-gray-300">
        This component only uses the <code>fontSize</code> property.
      </p>
      <p
        className="mb-4 bg-green-100 dark:bg-green-800 text-gray-800 dark:text-gray-100 p-4 rounded-lg"
        style={{ fontSize: `${fontSize}px` }}
      >
        The quick brown fox jumps over the lazy dog
      </p>
      <p className="mb-4 text-gray-700 dark:text-gray-300">
        Current font size: <strong>{fontSize}px</strong>
      </p>
      <div className="flex gap-3">
        <button
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-300"
          onClick={() => prefsCubit.setFontSize(Math.max(10, fontSize - 2))}
        >
          Decrease
        </button>
        <button
          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-300"
          onClick={() => prefsCubit.setFontSize(Math.min(24, fontSize + 2))}
        >
          Increase
        </button>
      </div>
    </div>
  );
}

// Password display component with its own render counter
function PasswordDisplay() {
  const [state] = useBloc(UserPreferencesCubit);
  const renderCount = useRenderCount();

  return (
    <div className="h-14 px-4 py-3 bg-pink-100 dark:bg-pink-800 text-gray-800 dark:text-gray-100 rounded-lg overflow-hidden relative">
      <span className="render-badge-inner px-2 py-1 bg-pink-600 text-white text-xs rounded-full">
        Renders: {renderCount}
      </span>

      {state.showPassword && (
        <div className="pt-1">Password: {state.password || '(empty)'}</div>
      )}
      {!state.showPassword && <div className="pt-1">Password is hidden</div>}
    </div>
  );
}

const PasswordInput = () => {
  const [state, prefsCubit] = useBloc(UserPreferencesCubit);

  return (
    <>
      <input
        type={state.showPassword ? 'text' : 'password'}
        value={state.password}
        onChange={(e) => prefsCubit.setPassword(e.target.value)}
        placeholder="Enter password"
        className="flex-grow px-4 py-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
      />
      <button
        className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-r focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 transition-colors duration-300"
        onClick={() => prefsCubit.toggleShowPassword()}
      >
        {state.showPassword ? 'Hide' : 'Show'}
      </button>
    </>
  );
};

// Password visibility component - demonstrates conditional dependency tracking
function PasswordComponent() {
  const renderCount = useRenderCount();

  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg relative mb-4 bg-white dark:bg-gray-800 shadow-lg">
      <span className="render-badge px-2 py-1 bg-pink-600 text-white text-xs rounded-full">
        Renders: {renderCount}
      </span>
      <h3 className="font-bold mb-3 text-xl text-pink-700 dark:text-pink-300">
        Password Component
      </h3>
      <p className="mb-3 text-gray-700 dark:text-gray-300">
        <strong>Reactive Dependency Tracking Demo:</strong> The password state
        is only used when
        <code> showPassword</code> is true, so changing the password won't cause
        re-renders when the password is hidden!
      </p>

      <div className="mb-4">
        <div className="flex mb-3">
          <PasswordInput />
        </div>

        <PasswordDisplay />
      </div>

      <CodeHighlighter
        code={`
// Access the raw state instead of destructuring
const [state, prefsCubit] = useBloc(UserPreferencesCubit);

// Later in JSX - only access state.password conditionally
{state.showPassword && (
  <div>Password: {state.password}</div>
)}

// Since state.password is only accessed inside the condition,
// changes to password won't cause re-renders when the password is hidden!
`}
        language="jsx"
        showLineNumbers={true}
        className="mt-2 text-xs"
      />
    </div>
  );
}

// Product filter category selector with render counter
const CategorySelector = () => {
  const renderCount = useRenderCount();
  const [state, prefsCubit] = useBloc(UserPreferencesCubit);
  const categories = ['all', 'accessories', 'clothing', 'footwear', 'gadgets'];

  return (
    <div className="relative bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
      <span className="render-badge-inner px-2 py-1 bg-cyan-600 text-white text-xs rounded-full">
        Renders: {renderCount}
      </span>
      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
        Category
      </label>
      <select
        value={state.filterCategory}
        onChange={(e) => prefsCubit.setCategory(e.target.value)}
        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600"
      >
        {categories.map((category: string) => (
          <option key={category} value={category}>
            {category.charAt(0).toUpperCase() + category.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
};

// Price range input with render counter
const MinPriceRangeInput = () => {
  const renderCount = useRenderCount();
  const [state, prefsCubit] = useBloc(UserPreferencesCubit);

  return (
    <div className="relative bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
      <span className="render-badge-inner px-2 py-1 bg-cyan-600 text-white text-xs rounded-full">
        Renders: {renderCount}
      </span>
      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
        Min Price: <span className="font-bold">${state.filterMinPrice}</span>
      </label>
      <input
        type="range"
        min="0"
        max="500"
        step="10"
        value={state.filterMinPrice}
        onChange={(e) => prefsCubit.setMinPrice(Number(e.target.value))}
        className="w-full accent-cyan-600"
      />
    </div>
  );
};

// Price range input with render counter
const MaxPriceRangeInput = () => {
  const renderCount = useRenderCount();
  const [state, prefsCubit] = useBloc(UserPreferencesCubit);

  return (
    <div className="relative bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600">
      <span className="render-badge-inner px-2 py-1 bg-cyan-600 text-white text-xs rounded-full">
        Renders: {renderCount}
      </span>
      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-200">
        Max Price: <span className="font-bold">${state.filterMaxPrice}</span>
      </label>
      <input
        type="range"
        min="0"
        max="500"
        step="10"
        value={state.filterMaxPrice}
        onChange={(e) => prefsCubit.setMaxPrice(Number(e.target.value))}
        className="w-full accent-cyan-600"
      />
    </div>
  );
};

// Stock checkbox with render counter
const StockCheckbox = () => {
  const renderCount = useRenderCount();
  const [state, prefsCubit] = useBloc(UserPreferencesCubit);

  return (
    <div className="relative bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm flex items-center h-full border border-gray-200 dark:border-gray-600">
      <span className="render-badge-inner px-2 py-1 bg-cyan-600 text-white text-xs rounded-full">
        Renders: {renderCount}
      </span>
      <label className="flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={state.filterInStock}
          onChange={() => prefsCubit.toggleInStock()}
          className="mr-3 h-5 w-5 text-cyan-600 focus:ring-cyan-500 rounded border-gray-300 dark:border-gray-600"
        />
        <span className="text-gray-700 dark:text-gray-200">In Stock Only</span>
      </label>
    </div>
  );
};

// Toggle in-stock status button
const StockToggle = ({ productId }: { productId: number }) => {
  const renderCount = useRenderCount();
  const [, prefsCubit] = useBloc(UserPreferencesCubit, {});
  const product = useMemo(() => prefsCubit.getProduct(productId), [productId]);

  if (!product) return null;

  return (
    <button
      onClick={() => prefsCubit.toggleProductStock(productId)}
      className={`text-xs font-medium mt-2 py-1.5 px-3 rounded ${
        product.inStock
          ? 'bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-800 dark:text-green-100 dark:hover:bg-green-700'
          : 'bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-800 dark:text-red-100 dark:hover:bg-red-700'
      }`}
    >
      <span className="render-badge-mini px-1 py-0.5 bg-cyan-600 text-white text-xs rounded-full mr-1">
        {renderCount}
      </span>
      {product.inStock ? 'In Stock' : 'Out of Stock'} (Click to toggle)
    </button>
  );
};

// Product card with render counter
const ProductCard = memo(({ productId }: { productId: number }) => {
  const renderCount = useRenderCount();
  const [, prefsCubit] = useBloc(UserPreferencesCubit, {});

  // Get product directly from the BLoC
  const product = useMemo(() => prefsCubit.getProduct(productId), [productId]);
  if (!product) return null;

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm relative border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-300">
      <span className="render-badge-inner px-2 py-1 bg-cyan-600 text-white text-xs rounded-full">
        Renders: {renderCount}
      </span>
      <div className="font-medium text-lg text-gray-900 dark:text-gray-100">
        {product.name}
      </div>
      <div className="flex justify-between items-center mt-3">
        <span className="text-cyan-700 dark:text-cyan-300 font-bold">
          ${product.price}
        </span>
        <span className="ml-1 capitalize px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm text-gray-700 dark:text-gray-300">
          {product.category}
        </span>
      </div>
      <div className="mt-3">
        <StockToggle productId={productId} />
      </div>
    </div>
  );
});

// FilteredProductsList component with render counter
const FilteredProductsList = () => {
  const renderCount = useRenderCount();
  const [, prefsCubit] = useBloc(UserPreferencesCubit, {});

  // Get filtered products directly from the BLoC's getter
  const filteredProducts = prefsCubit.filteredProducts;

  return (
    <div className="bg-cyan-50 dark:bg-cyan-900 p-5 rounded-lg relative border border-cyan-200 dark:border-cyan-800">
      <span className="render-badge-inner px-2 py-1 bg-cyan-600 text-white text-xs rounded-full">
        Renders: {renderCount}
      </span>
      <h4 className="font-bold mb-5 mt-2 text-xl flex items-center text-gray-900 dark:text-white">
        <span className="mr-3">Filtered Products</span>
        <span className="bg-cyan-600 text-white px-3 py-1 rounded-full text-sm">
          {filteredProducts.length}
        </span>
      </h4>
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((productId) => (
            <ProductCard key={`product-${productId}`} productId={productId} />
          ))}
        </div>
      ) : (
        <div className="p-8 text-center text-gray-600 dark:text-gray-300">
          No products match your filter criteria.
        </div>
      )}
    </div>
  );
};

// Component that demonstrates conditional filtering
function ProductFilterComponent() {
  const renderCount = useRenderCount();

  return (
    <div className="p-5 border border-gray-200 dark:border-gray-700 rounded-lg relative mb-4 bg-white dark:bg-gray-800 shadow-lg col-span-full">
      <span className="render-badge px-2 py-1 bg-cyan-600 text-white text-xs rounded-full">
        Renders: {renderCount}
      </span>
      <h3 className="font-bold mb-3 text-xl text-cyan-700 dark:text-cyan-300">
        Product Filter Component
      </h3>
      <p className="mb-6 text-gray-700 dark:text-gray-300">
        <strong>Advanced Dependency Demo:</strong> This component demonstrates
        how conditional filtering only triggers re-renders when relevant filter
        options change. Each sub-component directly accesses the BloC!
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <CategorySelector />
        <MinPriceRangeInput />
        <MaxPriceRangeInput />
        <StockCheckbox />
      </div>

      <FilteredProductsList />

      <div className="mt-8 bg-gray-50 dark:bg-gray-900 p-5 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="font-bold mb-3 text-cyan-700 dark:text-cyan-300">
          Important Note About Dependency Tracking
        </h4>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
          Blac's automatic dependency tracking is optimized for the first level
          of state properties. Nested properties won't be tracked with the same
          granularity, which is why we've flattened all nested objects in this
          example.
        </p>
        <CodeHighlighter
          code={`
// ❌ Nested properties aren't tracked independently
interface UserState {
  profile: {
    name: string;
    email: string;
  }
}

// ✅ Flattened properties are tracked independently
interface UserState {
  profileName: string;
  profileEmail: string;
}
`}
          language="typescript"
          showLineNumbers={false}
          className="mt-3 text-xs"
        />
      </div>

      <div className="mt-8 bg-gray-50 dark:bg-gray-900 p-5 rounded-lg border border-gray-200 dark:border-gray-700">
        <h4 className="font-bold mb-3 text-cyan-700 dark:text-cyan-300">
          Getter Value Equality and Re-Rendering
        </h4>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
          Blac performs an equality check using Object.is() on getter return
          values to determine if components should re-render. For objects and
          arrays, this means reference equality is used. This has important
          implications:
        </p>
        <ul className="list-disc pl-5 text-sm text-gray-700 dark:text-gray-300 mb-3 space-y-2 leading-relaxed">
          <li>
            <strong>Return new objects only when necessary</strong> - If a
            getter returns a new object or array on each call, it will always
            trigger re-renders, even if the contents are identical.
          </li>
          <li>
            <strong>Prefer primitive values</strong> - When possible, return
            primitives like numbers, strings, or booleans from getters.
          </li>
          <li>
            <strong>Memoize complex results</strong> - For operations like
            filtering that return collections, either memoize the result or
            perform your own equality check.
          </li>
        </ul>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
          <a
            href="https://blacjs.dev/docs/react/getters-equality"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            Read more in the official Blac docs on Getter Equality
          </a>
        </p>
        <blockquote className="border-l-4 border-cyan-600 pl-4 py-1 mb-3 text-sm italic text-gray-700 dark:text-gray-300">
          "Blac uses Object.is() to detect changes in getter values. For
          primitive values like numbers, strings, and booleans, this works
          perfectly. But for objects and arrays, this checks reference equality.
          This means you need to manually handle caching for complex return
          values to avoid unnecessary re-renders."
          <footer className="text-xs mt-1 text-gray-500 dark:text-gray-400">
            — Blac.js Documentation
          </footer>
        </blockquote>
        <CodeHighlighter
          code={`
// Filtered products getter - demonstrates proper caching
previouslyFilteredProducts: null | number[] = null;
get filteredProducts() {
  // Map to primitive IDs instead of returning objects
  const filteredIds = this.state.products
    .filter(product => {
      // ...filtering logic
    })
    .map(product => product.id);
  
  // Perform manual equality check for arrays
  if (
    this.previouslyFilteredProducts !== null &&
    this.previouslyFilteredProducts.length === filteredIds.length &&
    this.previouslyFilteredProducts.every((val, i) => Object.is(val, filteredIds[i]))
  ) {
    return this.previouslyFilteredProducts;
  }
  
  // Store the new result for future comparisons
  this.previouslyFilteredProducts = filteredIds;
  return filteredIds;
}

// Similar to React's useMemo dependency array behavior
`}
          language="typescript"
          showLineNumbers={true}
          className="mt-3 text-xs"
        />
      </div>

      <div className="mt-8">
        <CodeHighlighter
          code={`
// The BLoC contains the filtering logic in a getter
class UserPreferencesCubit extends Cubit<UserPreferencesState> {
  // Flattened state for optimal reactivity
  interface UserPreferencesState {
    filterCategory: string;
    filterMinPrice: number;
    filterMaxPrice: number;
    filterInStock: boolean;
    products: Product[];
    // ...other root-level properties
  }

  // Cache for memoization
  previouslyFilteredProducts: null | number[] = null;

  // Computed property that filters products
  get filteredProducts() {
    // Return primitive values (IDs) instead of objects
    const filteredIds = this.state.products
      .filter((product) => {
        const categoryMatch = 
          this.state.filterCategory === 'all' ||
          product.category === this.state.filterCategory;
        
        const priceMatch =
          product.price >= this.state.filterMinPrice &&
          product.price <= this.state.filterMaxPrice;

        // Conditional dependency tracking happens here:
        const stockMatch = !this.state.filterInStock || product.inStock;

        return categoryMatch && priceMatch && stockMatch;
      })
      .map(product => product.id);
    
    // Manual equality check for array values - similar to how React checks dependency arrays
    if (this.arraysEqual(this.previouslyFilteredProducts, filteredIds)) {
      return this.previouslyFilteredProducts;
    }
    
    this.previouslyFilteredProducts = filteredIds;
    return filteredIds;
  }

  // Helper method for array comparison
  private arraysEqual(a: number[] | null, b: number[]): boolean {
    if (a === null) return false;
    if (a.length !== b.length) return false;
    return a.every((val, idx) => Object.is(val, b[idx]));
  }
}
`}
          language="typescript"
          showLineNumbers={true}
          className="mt-3 text-xs"
        />
      </div>
    </div>
  );
}

// Component showing all state for reference
function StateInspector() {
  const [state] = useBloc(UserPreferencesCubit);

  return (
    <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg mb-6 bg-white dark:bg-gray-800 shadow-lg">
      <h3 className="font-bold mb-3 text-xl text-purple-700 dark:text-purple-300">
        Current State
      </h3>
      <div className="relative">
        <CodeHighlighter
          code={JSON.stringify(state, null, 2)}
          language="json"
          showLineNumbers={false}
          className="mt-0 max-h-60 overflow-y-auto"
        />
        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-white dark:from-gray-800 to-transparent pointer-events-none"></div>
      </div>
    </div>
  );
}

// Main demo component
function DependencyTrackingDemo() {
  return (
    <div className="dependency-tracking-demo p-4 sm:p-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-4 text-purple-700 dark:text-purple-300">
          Dependency Tracking Demo
        </h1>

        <div className="mb-8 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900 dark:to-blue-900 p-4 rounded-lg shadow-md">
          <h2 className="text-lg sm:text-xl font-bold mb-3 text-gray-900 dark:text-white">
            What is Reactive Dependency Tracking?
          </h2>
          <p className="mb-3 text-gray-800 dark:text-gray-200">
            Blac's automatic dependency tracking ensures components only
            re-render when the specific pieces of state they use change. Each
            component below shows a <strong>render count</strong> to illustrate
            this.
          </p>
          <p className="font-bold text-gray-900 dark:text-white">
            The real magic? Conditional dependencies! If a piece of state is
            only used when a condition is true, changing that state won't
            trigger re-renders when the condition is false.
          </p>
        </div>
      </div>

      <div className="mb-8">
        <StateInspector />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        <ThemeComponent />
        <FontSizeComponent />
        <PasswordComponent />
        <ProductFilterComponent />
      </div>

      <style>{`
        .dependency-tracking-demo .render-badge {
          position: absolute;
          right: 10px;
          top: 0;
          transform: translateY(-50%);
          display: inline-block;
          z-index: 10;
        }
        
        .dependency-tracking-demo .render-badge-inner {
          position: absolute;
          right: 10px;
          top: 10px;
          display: inline-block;
          z-index: 10;
        }

        .dependency-tracking-demo .render-badge-mini {
          display: inline-block;
          font-size: 10px;
        }

        @media (max-width: 640px) {
          .dependency-tracking-demo .render-badge,
          .dependency-tracking-demo .render-badge-inner {
            font-size: 9px;
            padding: 2px 6px;
          }
        }
      `}</style>
    </div>
  );
}
