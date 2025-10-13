import React, { useEffect } from 'react';
import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import { Loader2, RefreshCw, Database, Clock, Zap, AlertCircle } from 'lucide-react';
import { DemoArticle } from '@/components/demo-article/DemoArticle';
import { ArticleSection, SectionHeader } from '@/components/demo-article/ArticleSection';
import { Prose } from '@/components/demo-article/Prose';
import { CodePanel } from '@/components/demo-article/CodePanel';
import { ConceptCallout } from '@/components/shared/ConceptCallout';
import { StateViewer } from '@/components/shared/StateViewer';
import { Button } from '@/ui/Button';

// ============================================================================
// DEMO 1: Simple Cache Pattern
// ============================================================================

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface CachedState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  cachedAt: number | null;
}

class SimpleCacheCubit extends Cubit<CachedState<User[]>> {
  private cacheTimeout = 5000; // 5 seconds

  constructor() {
    super({
      data: null,
      loading: false,
      error: null,
      cachedAt: null,
    });
  }

  fetchUsers = async () => {
    // Check if we have fresh cached data
    if (this.isCacheFresh()) {
      console.log('[Cache] Using cached data');
      return;
    }

    this.patch({ loading: true, error: null });

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const users: User[] = [
        { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin' },
        { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'User' },
        { id: 3, name: 'Charlie Brown', email: 'charlie@example.com', role: 'User' },
      ];

      this.patch({
        data: users,
        loading: false,
        cachedAt: Date.now(),
      });
    } catch (error) {
      this.patch({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch users',
      });
    }
  };

  private isCacheFresh = (): boolean => {
    if (!this.state.cachedAt || !this.state.data) return false;
    const age = Date.now() - this.state.cachedAt;
    return age < this.cacheTimeout;
  };

  get cacheAge(): number | null {
    if (!this.state.cachedAt) return null;
    return Math.floor((Date.now() - this.state.cachedAt) / 1000);
  }

  invalidateCache = () => {
    this.patch({ cachedAt: null });
  };
}

function SimpleCacheDemo() {
  const [state, cubit] = useBloc(SimpleCacheCubit);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button onClick={cubit.fetchUsers} disabled={state.loading} variant="primary">
          {state.loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading...
            </>
          ) : (
            <>
              <Database className="w-4 h-4 mr-2" />
              Fetch Users
            </>
          )}
        </Button>

        <Button onClick={cubit.invalidateCache} variant="outline" disabled={!state.cachedAt}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Invalidate Cache
        </Button>

        {state.cachedAt && cubit.cacheAge !== null && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>Cached {cubit.cacheAge}s ago</span>
            {cubit.cacheAge > 5 && (
              <span className="text-orange-600 dark:text-orange-400">(stale)</span>
            )}
          </div>
        )}
      </div>

      {state.error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">{state.error}</span>
          </div>
        </div>
      )}

      {state.data && (
        <div className="rounded-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="text-left py-3 px-4 font-semibold">Name</th>
                <th className="text-left py-3 px-4 font-semibold">Email</th>
                <th className="text-left py-3 px-4 font-semibold">Role</th>
              </tr>
            </thead>
            <tbody>
              {state.data.map((user) => (
                <tr key={user.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="py-3 px-4">{user.name}</td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">{user.email}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      user.role === 'Admin'
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!state.data && !state.loading && !state.error && (
        <div className="flex items-center justify-center h-[200px] border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">
            Click "Fetch Users" to load data
          </p>
        </div>
      )}

      <StateViewer bloc={SimpleCacheCubit} title="Current State" />
    </div>
  );
}

// ============================================================================
// DEMO 2: Stale-While-Revalidate Pattern
// ============================================================================

interface Article {
  id: number;
  title: string;
  author: string;
  date: string;
}

interface SWRState {
  data: Article[] | null;
  loading: boolean;
  revalidating: boolean;
  error: string | null;
  cachedAt: number | null;
}

class SWRCubit extends Cubit<SWRState> {
  private cacheTimeout = 8000; // 8 seconds
  private autoRefreshInterval: NodeJS.Timeout | null = null;

  constructor() {
    super({
      data: null,
      loading: false,
      revalidating: false,
      error: null,
      cachedAt: null,
    });
  }

  fetchArticles = async (background = false) => {
    // If we have cached data, show it immediately and revalidate in background
    if (this.state.data && !background) {
      this.patch({ revalidating: true });
    } else if (!background) {
      this.patch({ loading: true, error: null });
    }

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const articles: Article[] = [
        {
          id: 1,
          title: 'Understanding BlaC State Management',
          author: 'Sarah Lee',
          date: new Date().toLocaleDateString(),
        },
        {
          id: 2,
          title: 'Advanced Caching Strategies',
          author: 'Mike Chen',
          date: new Date(Date.now() - 86400000).toLocaleDateString(),
        },
        {
          id: 3,
          title: 'Building Scalable React Apps',
          author: 'Emma Davis',
          date: new Date(Date.now() - 172800000).toLocaleDateString(),
        },
      ];

      this.patch({
        data: articles,
        loading: false,
        revalidating: false,
        cachedAt: Date.now(),
      });
    } catch (error) {
      this.patch({
        loading: false,
        revalidating: false,
        error: error instanceof Error ? error.message : 'Failed to fetch articles',
      });
    }
  };

  enableAutoRefresh = () => {
    this.disableAutoRefresh();
    this.autoRefreshInterval = setInterval(() => {
      console.log('[SWR] Auto-refreshing data...');
      this.fetchArticles(true);
    }, this.cacheTimeout);
  };

  disableAutoRefresh = () => {
    if (this.autoRefreshInterval) {
      clearInterval(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
  };

  get cacheAge(): number | null {
    if (!this.state.cachedAt) return null;
    return Math.floor((Date.now() - this.state.cachedAt) / 1000);
  }

  onDispose = () => {
    this.disableAutoRefresh();
  };
}

function SWRDemo() {
  const [state, cubit] = useBloc(SWRCubit);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = React.useState(false);

  const toggleAutoRefresh = () => {
    if (autoRefreshEnabled) {
      cubit.disableAutoRefresh();
      setAutoRefreshEnabled(false);
    } else {
      cubit.enableAutoRefresh();
      setAutoRefreshEnabled(true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={() => cubit.fetchArticles()}
          disabled={state.loading}
          variant="primary"
        >
          {state.loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading...
            </>
          ) : (
            <>
              <Database className="w-4 h-4 mr-2" />
              Fetch Articles
            </>
          )}
        </Button>

        <Button onClick={toggleAutoRefresh} variant={autoRefreshEnabled ? 'primary' : 'outline'}>
          <Zap className="w-4 h-4 mr-2" />
          Auto-Refresh: {autoRefreshEnabled ? 'ON' : 'OFF'}
        </Button>

        {state.revalidating && (
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Revalidating...</span>
          </div>
        )}

        {state.cachedAt && cubit.cacheAge !== null && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>Updated {cubit.cacheAge}s ago</span>
          </div>
        )}
      </div>

      {state.error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">{state.error}</span>
          </div>
        </div>
      )}

      {state.data && (
        <div className="space-y-3">
          {state.data.map((article) => (
            <div
              key={article.id}
              className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <h3 className="font-semibold text-lg mb-2">{article.title}</h3>
              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span>By {article.author}</span>
                <span>•</span>
                <span>{article.date}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!state.data && !state.loading && !state.error && (
        <div className="flex items-center justify-center h-[200px] border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">
            Click "Fetch Articles" to load data
          </p>
        </div>
      )}

      <StateViewer bloc={SWRCubit} title="Current State" />
    </div>
  );
}

// ============================================================================
// DEMO 3: Pagination Pattern
// ============================================================================

interface Product {
  id: number;
  name: string;
  price: number;
  category: string;
}

interface PaginatedState {
  data: Product[];
  currentPage: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
}

class PaginationCubit extends Cubit<PaginatedState> {
  private allProducts: Product[] = [];
  private pageSize = 5;

  constructor() {
    super({
      data: [],
      currentPage: 1,
      totalPages: 0,
      loading: false,
      error: null,
    });

    // Generate mock data
    this.allProducts = Array.from({ length: 23 }, (_, i) => ({
      id: i + 1,
      name: `Product ${i + 1}`,
      price: Math.floor(Math.random() * 100) + 10,
      category: ['Electronics', 'Clothing', 'Books', 'Home'][Math.floor(Math.random() * 4)],
    }));
  }

  loadPage = async (page: number) => {
    this.patch({ loading: true, error: null });

    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 800));

      const startIndex = (page - 1) * this.pageSize;
      const endIndex = startIndex + this.pageSize;
      const pageData = this.allProducts.slice(startIndex, endIndex);
      const totalPages = Math.ceil(this.allProducts.length / this.pageSize);

      this.patch({
        data: pageData,
        currentPage: page,
        totalPages,
        loading: false,
      });
    } catch (error) {
      this.patch({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load page',
      });
    }
  };

  nextPage = () => {
    if (this.state.currentPage < this.state.totalPages && !this.state.loading) {
      this.loadPage(this.state.currentPage + 1);
    }
  };

  prevPage = () => {
    if (this.state.currentPage > 1 && !this.state.loading) {
      this.loadPage(this.state.currentPage - 1);
    }
  };

  goToPage = (page: number) => {
    if (page >= 1 && page <= this.state.totalPages && !this.state.loading) {
      this.loadPage(page);
    }
  };
}

function PaginationDemo() {
  const [state, cubit] = useBloc(PaginationCubit);

  // Load first page on mount
  useEffect(() => {
    cubit.loadPage(1);
  }, []);

  return (
    <div className="space-y-4">
      {state.error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">{state.error}</span>
          </div>
        </div>
      )}

      {state.loading ? (
        <div className="flex items-center justify-center h-[300px] border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg">
          <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="font-medium">Loading products...</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {state.data.map((product) => (
            <div
              key={product.id}
              className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold mb-1">{product.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{product.category}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    ${product.price}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {state.totalPages > 0 && (
        <div className="flex items-center justify-between pt-4 border-t-2 border-gray-200 dark:border-gray-700">
          <Button
            onClick={cubit.prevPage}
            disabled={state.currentPage === 1 || state.loading}
            variant="outline"
          >
            Previous
          </Button>

          <div className="flex items-center gap-2">
            {Array.from({ length: state.totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => cubit.goToPage(page)}
                disabled={state.loading}
                className={`w-8 h-8 rounded ${
                  page === state.currentPage
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                } disabled:opacity-50 transition-all`}
              >
                {page}
              </button>
            ))}
          </div>

          <Button
            onClick={cubit.nextPage}
            disabled={state.currentPage === state.totalPages || state.loading}
            variant="outline"
          >
            Next
          </Button>
        </div>
      )}

      <StateViewer bloc={PaginationCubit} title="Current State" />
    </div>
  );
}

// ===== DEMO METADATA =====

const demoMetadata = {
  id: 'data-fetching',
  title: 'Data Fetching & Caching',
  description: 'Learn professional data fetching patterns including caching, stale-while-revalidate, and pagination.',
  category: '02-patterns' as const,
  difficulty: 'intermediate' as const,
  tags: ['cubit', 'async', 'caching', 'api', 'pagination', 'swr'],
  estimatedTime: 18,
  learningPath: {
    previous: 'async-loading',
    next: 'list-management',
    sequence: 4,
  },
  theme: {
    primaryColor: '#0ea5e9',
    accentColor: '#38bdf8',
  },
};

// ============================================================================
// Main Demo Component
// ============================================================================

export function DataFetchingDemo() {
  return (
    <DemoArticle metadata={demoMetadata} showBlocGraph={true}>
      {/* Introduction */}
      <ArticleSection theme="cubit" id="introduction">
        <SectionHeader>Professional Data Fetching</SectionHeader>
        <Prose>
          <p>
            Fetching data from APIs is one of the most common tasks in web development. But there's
            a huge difference between a <strong>naive implementation</strong> and a{' '}
            <strong>production-ready</strong> one.
          </p>
          <p>
            In this guide, you'll learn three battle-tested patterns used by companies like Vercel,
            Airbnb, and Facebook:
          </p>
          <ul>
            <li>
              <strong>Simple caching</strong>: Avoid redundant API calls with time-based cache
            </li>
            <li>
              <strong>Stale-While-Revalidate (SWR)</strong>: Show cached data instantly while
              updating in background
            </li>
            <li>
              <strong>Pagination</strong>: Handle large datasets efficiently
            </li>
          </ul>
        </Prose>
      </ArticleSection>

      {/* Demo 1: Simple Cache */}
      <ArticleSection id="simple-cache">
        <SectionHeader>Simple Time-Based Cache</SectionHeader>
        <Prose>
          <p>
            The simplest caching strategy: if we fetched data recently (within 5 seconds), reuse
            it. Otherwise, fetch fresh data.
          </p>
          <p>
            This pattern is perfect for data that doesn't change frequently, like user profiles or
            configuration settings.
          </p>
        </Prose>

        <CodePanel
          language="typescript"
          title="SimpleCacheCubit.ts"
          code={`interface CachedState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  cachedAt: number | null; // Timestamp
}

class SimpleCacheCubit extends Cubit<CachedState<User[]>> {
  private cacheTimeout = 5000; // 5 seconds

  fetchUsers = async () => {
    // Check if we have fresh cached data
    if (this.isCacheFresh()) {
      console.log('[Cache] Using cached data');
      return; // Skip API call
    }

    this.patch({ loading: true, error: null });

    try {
      const users = await api.getUsers();
      this.patch({
        data: users,
        loading: false,
        cachedAt: Date.now(), // Store cache timestamp
      });
    } catch (error) {
      this.patch({ loading: false, error: error.message });
    }
  };

  private isCacheFresh = (): boolean => {
    if (!this.state.cachedAt || !this.state.data) return false;
    const age = Date.now() - this.state.cachedAt;
    return age < this.cacheTimeout;
  };

  invalidateCache = () => {
    this.patch({ cachedAt: null }); // Force next fetch
  };
}`}
        />

        <Prose>
          <p>
            Notice the <code>isCacheFresh()</code> check at the start of <code>fetchUsers()</code>.
            This prevents unnecessary API calls and improves perceived performance.
          </p>
        </Prose>

        <div className="my-6">
          <SimpleCacheDemo />
        </div>

        <ConceptCallout type="tip" title="When to Use Simple Caching">
          <p>
            Simple caching works best for:
          </p>
          <ul>
            <li>Data that doesn't change often (user profiles, settings)</li>
            <li>Non-critical data where slight staleness is acceptable</li>
            <li>Reducing server load during rapid navigation</li>
          </ul>
        </ConceptCallout>
      </ArticleSection>

      {/* Demo 2: SWR Pattern */}
      <ArticleSection theme="neutral" id="swr-pattern">
        <SectionHeader>Stale-While-Revalidate (SWR)</SectionHeader>
        <Prose>
          <p>
            SWR is the secret sauce behind fast, responsive apps. The strategy:
          </p>
          <ol>
            <li>
              <strong>Return cached data immediately</strong> (even if stale)
            </li>
            <li>
              <strong>Fetch fresh data in the background</strong>
            </li>
            <li>
              <strong>Update UI when fresh data arrives</strong>
            </li>
          </ol>
          <p>
            This pattern gives users <strong>instant feedback</strong> with cached data, while
            ensuring they see fresh data moments later.
          </p>
        </Prose>

        <CodePanel
          language="typescript"
          title="SWRCubit.ts"
          code={`interface SWRState {
  data: Article[] | null;
  loading: boolean;
  revalidating: boolean; // Background refresh indicator
  error: string | null;
  cachedAt: number | null;
}

class SWRCubit extends Cubit<SWRState> {
  fetchArticles = async (background = false) => {
    // If we have cached data, show it immediately and revalidate
    if (this.state.data && !background) {
      this.patch({ revalidating: true }); // Background loading
    } else if (!background) {
      this.patch({ loading: true }); // Initial loading
    }

    try {
      const articles = await api.getArticles();
      this.patch({
        data: articles,
        loading: false,
        revalidating: false,
        cachedAt: Date.now(),
      });
    } catch (error) {
      this.patch({
        loading: false,
        revalidating: false,
        error: error.message,
      });
    }
  };

  enableAutoRefresh = () => {
    this.autoRefreshInterval = setInterval(() => {
      this.fetchArticles(true); // Background refresh
    }, 8000); // Every 8 seconds
  };
}`}
        />

        <div className="my-6">
          <SWRDemo />
        </div>

        <ConceptCallout type="tip" title="SWR in Production">
          <p>
            Libraries like <code>swr</code> and <code>react-query</code> implement this pattern
            with additional features:
          </p>
          <ul>
            <li>Focus revalidation (refetch when tab gains focus)</li>
            <li>Network revalidation (refetch when connection restored)</li>
            <li>Deduplication (prevent duplicate requests)</li>
            <li>Error retry with exponential backoff</li>
          </ul>
        </ConceptCallout>
      </ArticleSection>

      {/* Demo 3: Pagination */}
      <ArticleSection id="pagination">
        <SectionHeader>Pagination Pattern</SectionHeader>
        <Prose>
          <p>
            When dealing with large datasets (hundreds or thousands of items), loading everything
            at once is slow and wasteful. Pagination solves this by loading data in chunks.
          </p>
          <p>
            The key insight: <strong>page number</strong> and <strong>page size</strong> become
            part of your state, and you fetch data based on these values.
          </p>
        </Prose>

        <CodePanel
          language="typescript"
          title="PaginationCubit.ts"
          code={`interface PaginatedState {
  data: Product[];
  currentPage: number;
  totalPages: number;
  loading: boolean;
  error: string | null;
}

class PaginationCubit extends Cubit<PaginatedState> {
  private pageSize = 10;

  loadPage = async (page: number) => {
    this.patch({ loading: true, error: null });

    try {
      const response = await api.getProducts({
        page,
        pageSize: this.pageSize,
      });

      this.patch({
        data: response.data,
        currentPage: page,
        totalPages: response.totalPages,
        loading: false,
      });
    } catch (error) {
      this.patch({ loading: false, error: error.message });
    }
  };

  nextPage = () => {
    if (this.state.currentPage < this.state.totalPages) {
      this.loadPage(this.state.currentPage + 1);
    }
  };

  prevPage = () => {
    if (this.state.currentPage > 1) {
      this.loadPage(this.state.currentPage - 1);
    }
  };

  goToPage = (page: number) => {
    if (page >= 1 && page <= this.state.totalPages) {
      this.loadPage(page);
    }
  };
}`}
        />

        <div className="my-6">
          <PaginationDemo />
        </div>

        <ConceptCallout type="warning" title="Pagination vs Infinite Scroll">
          <p>
            <strong>Pagination</strong> is better when:
          </p>
          <ul>
            <li>Users need to reference specific items (e.g., search results)</li>
            <li>You want to reduce server load (user controls loading)</li>
            <li>Items have a clear ranking or order</li>
          </ul>
          <p>
            <strong>Infinite scroll</strong> is better when:
          </p>
          <ul>
            <li>Content is consumed continuously (social feeds, image galleries)</li>
            <li>Users rarely jump to specific items</li>
            <li>The goal is engagement and discovery</li>
          </ul>
        </ConceptCallout>
      </ArticleSection>

      {/* Pattern Comparison */}
      <ArticleSection theme="neutral" id="comparison">
        <SectionHeader>Pattern Comparison</SectionHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300 dark:border-gray-700">
                <th className="text-left py-3 px-4">Pattern</th>
                <th className="text-left py-3 px-4">Best For</th>
                <th className="text-left py-3 px-4">User Experience</th>
                <th className="text-left py-3 px-4">Server Load</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <td className="py-3 px-4 font-medium">Simple Cache</td>
                <td className="py-3 px-4">Static or slow-changing data</td>
                <td className="py-3 px-4">Fast on repeated visits</td>
                <td className="py-3 px-4 text-green-600 dark:text-green-400">Low</td>
              </tr>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <td className="py-3 px-4 font-medium">SWR</td>
                <td className="py-3 px-4">Frequently updated data</td>
                <td className="py-3 px-4">Instant + Fresh</td>
                <td className="py-3 px-4 text-yellow-600 dark:text-yellow-400">Medium</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Pagination</td>
                <td className="py-3 px-4">Large datasets</td>
                <td className="py-3 px-4">Controlled, predictable</td>
                <td className="py-3 px-4 text-green-600 dark:text-green-400">Low</td>
              </tr>
            </tbody>
          </table>
        </div>
      </ArticleSection>

      {/* Best Practices */}
      <ArticleSection id="best-practices">
        <SectionHeader>Best Practices</SectionHeader>
        <Prose>
          <h3>1. Cache Invalidation Strategies</h3>
        </Prose>
        <CodePanel
          language="typescript"
          code={`// Time-based invalidation
if (Date.now() - cachedAt > CACHE_TTL) {
  refetch();
}

// Manual invalidation after mutations
updateUser = async (user) => {
  await api.updateUser(user);
  this.invalidateCache(); // Force refetch on next access
};

// Event-based invalidation
onUserLogout = () => {
  this.clearAllCaches();
};`}
        />

        <Prose>
          <h3>2. Handle Race Conditions</h3>
        </Prose>
        <CodePanel
          language="typescript"
          code={`class SafeCubit extends Cubit<State> {
  private currentRequestId = 0;

  fetchData = async () => {
    const requestId = ++this.currentRequestId;

    const data = await api.getData();

    // Only update if this is still the latest request
    if (requestId === this.currentRequestId) {
      this.patch({ data });
    }
  };
}`}
        />

        <Prose>
          <h3>3. Progressive Enhancement</h3>
          <ul>
            <li>Show cached data immediately (SWR pattern)</li>
            <li>Display skeleton loaders for missing data</li>
            <li>Update smoothly when fresh data arrives</li>
            <li>Provide manual refresh option</li>
          </ul>

          <h3>4. Error Recovery</h3>
          <ul>
            <li>Keep showing stale data if refresh fails</li>
            <li>Implement retry with exponential backoff</li>
            <li>Provide clear error messages and retry buttons</li>
            <li>Log errors for debugging</li>
          </ul>
        </Prose>
      </ArticleSection>

      {/* Summary */}
      <ArticleSection theme="success" id="summary">
        <SectionHeader>Summary</SectionHeader>
        <Prose>
          <p>You've mastered three essential data fetching patterns:</p>
        </Prose>

        <div className="grid gap-4 my-6">
          <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold mb-2">Simple Cache</h4>
            <p className="text-sm">
              Time-based caching to avoid redundant API calls. Perfect for static or slow-changing
              data where freshness isn't critical.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-cyan-50 dark:bg-cyan-950/20 border-2 border-cyan-200 dark:border-cyan-800">
            <h4 className="font-semibold mb-2">Stale-While-Revalidate</h4>
            <p className="text-sm">
              Show cached data instantly while fetching fresh data in the background. The gold
              standard for responsive, up-to-date UIs.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border-2 border-green-200 dark:border-green-800">
            <h4 className="font-semibold mb-2">Pagination</h4>
            <p className="text-sm">
              Load large datasets in chunks for better performance and UX. Essential for search
              results, product catalogs, and data tables.
            </p>
          </div>
        </div>

        <ConceptCallout type="tip" title="Next Steps">
          <p>
            These patterns are the foundation of professional data fetching. Consider exploring:
          </p>
          <ul>
            <li>
              <strong>Optimistic updates</strong>: Update UI immediately, sync with server later
            </li>
            <li>
              <strong>Infinite scroll</strong>: Load more data as user scrolls
            </li>
            <li>
              <strong>Prefetching</strong>: Load data before user needs it
            </li>
            <li>
              <strong>Request deduplication</strong>: Prevent duplicate simultaneous requests
            </li>
          </ul>
        </ConceptCallout>
      </ArticleSection>
    </DemoArticle>
  );
}
