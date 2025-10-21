import { useState, useEffect } from 'react';
import { useBloc } from '@blac/react';
import { Cubit } from '@blac/core';
import { Button } from '@/ui/Button';
import { StateViewer } from '@/components/shared/StateViewer';
import {
  Loader2,
  RefreshCw,
  Database,
  Clock,
  Zap,
  AlertCircle,
} from 'lucide-react';

// =================================================================
// Simple Cache Pattern Demo
// =================================================================

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
        {
          id: 1,
          name: 'Alice Johnson',
          email: 'alice@example.com',
          role: 'Admin',
        },
        { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'User' },
        {
          id: 3,
          name: 'Charlie Brown',
          email: 'charlie@example.com',
          role: 'User',
        },
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

// =================================================================
// Stale-While-Revalidate Pattern Demo
// =================================================================

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
    // If we have cached data, show it immediately and revalidate
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
        error:
          error instanceof Error ? error.message : 'Failed to fetch articles',
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

// =================================================================
// Pagination Pattern Demo
// =================================================================

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
      category: ['Electronics', 'Clothing', 'Books', 'Home'][
        Math.floor(Math.random() * 4)
      ],
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

// =================================================================
// Interactive Demos
// =================================================================

export function DataFetchingInteractive() {
  const [activeDemo, setActiveDemo] = useState<'cache' | 'swr' | 'pagination'>(
    'cache',
  );

  return (
    <div className="my-8 space-y-6">
      {/* Demo Switcher */}
      <div className="flex justify-center gap-3 flex-wrap">
        <Button
          onClick={() => setActiveDemo('cache')}
          variant={activeDemo === 'cache' ? 'primary' : 'outline'}
          size="sm"
        >
          Simple Cache
        </Button>
        <Button
          onClick={() => setActiveDemo('swr')}
          variant={activeDemo === 'swr' ? 'primary' : 'outline'}
          size="sm"
        >
          Stale-While-Revalidate
        </Button>
        <Button
          onClick={() => setActiveDemo('pagination')}
          variant={activeDemo === 'pagination' ? 'primary' : 'outline'}
          size="sm"
        >
          Pagination
        </Button>
      </div>

      {/* Demo Content */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-surface px-6 py-6 shadow-subtle">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand/10 via-transparent to-brand/5 opacity-90" />
          <div className="relative space-y-4">
            <h3 className="text-lg font-semibold mb-4">
              {activeDemo === 'cache' && 'Simple Time-Based Cache'}
              {activeDemo === 'swr' && 'Stale-While-Revalidate'}
              {activeDemo === 'pagination' && 'Pagination'}
            </h3>

            {activeDemo === 'cache' && <SimpleCacheDemo />}
            {activeDemo === 'swr' && <SWRDemo />}
            {activeDemo === 'pagination' && <PaginationDemo />}
          </div>
        </div>

        <div className="space-y-4">
          {activeDemo === 'cache' && (
            <StateViewer
              bloc={SimpleCacheCubit}
              title="Cache State"
              defaultCollapsed={false}
            />
          )}
          {activeDemo === 'swr' && (
            <StateViewer
              bloc={SWRCubit}
              title="SWR State"
              defaultCollapsed={false}
            />
          )}
          {activeDemo === 'pagination' && (
            <StateViewer
              bloc={PaginationCubit}
              title="Pagination State"
              defaultCollapsed={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function SimpleCacheDemo() {
  const [state, cubit] = useBloc(SimpleCacheCubit);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button
          onClick={cubit.fetchUsers}
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
              Fetch Users
            </>
          )}
        </Button>

        <Button
          onClick={cubit.invalidateCache}
          variant="outline"
          disabled={!state.cachedAt}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Invalidate
        </Button>

        {state.cachedAt && cubit.cacheAge !== null && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>
              Cached {cubit.cacheAge}s ago
              {cubit.cacheAge > 5 && (
                <span className="text-orange-600 dark:text-orange-400 ml-1">
                  (stale)
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {state.error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{state.error}</span>
          </div>
        </div>
      )}

      {state.data && (
        <div className="rounded-lg border-2 border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-muted">
              <tr>
                <th className="text-left py-2 px-3 font-semibold">Name</th>
                <th className="text-left py-2 px-3 font-semibold">Email</th>
                <th className="text-left py-2 px-3 font-semibold">Role</th>
              </tr>
            </thead>
            <tbody>
              {state.data.map((user) => (
                <tr key={user.id} className="border-t border-border">
                  <td className="py-2 px-3">{user.name}</td>
                  <td className="py-2 px-3 text-muted-foreground text-xs">
                    {user.email}
                  </td>
                  <td className="py-2 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${user.role === 'Admin' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'bg-surface-muted text-muted-foreground'}`}
                    >
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
        <div className="flex items-center justify-center h-[180px] border-2 border-dashed border-border rounded-lg">
          <p className="text-muted-foreground text-sm">
            Click "Fetch Users" to load data
          </p>
        </div>
      )}
    </div>
  );
}

function SWRDemo() {
  const [state, cubit] = useBloc(SWRCubit);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);

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

        <Button
          onClick={toggleAutoRefresh}
          variant={autoRefreshEnabled ? 'primary' : 'outline'}
          size="sm"
        >
          <Zap className="w-4 h-4 mr-2" />
          Auto: {autoRefreshEnabled ? 'ON' : 'OFF'}
        </Button>

        {state.revalidating && (
          <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Revalidating...</span>
          </div>
        )}

        {state.cachedAt && cubit.cacheAge !== null && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Updated {cubit.cacheAge}s ago</span>
          </div>
        )}
      </div>

      {state.error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{state.error}</span>
          </div>
        </div>
      )}

      {state.data && (
        <div className="space-y-2">
          {state.data.map((article) => (
            <div
              key={article.id}
              className="p-3 rounded-lg border-2 border-border bg-surface"
            >
              <h4 className="font-semibold text-sm mb-1">{article.title}</h4>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>By {article.author}</span>
                <span>•</span>
                <span>{article.date}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {!state.data && !state.loading && !state.error && (
        <div className="flex items-center justify-center h-[180px] border-2 border-dashed border-border rounded-lg">
          <p className="text-muted-foreground text-sm">
            Click "Fetch Articles" to load data
          </p>
        </div>
      )}
    </div>
  );
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
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />
            <span>{state.error}</span>
          </div>
        </div>
      )}

      {state.loading ? (
        <div className="flex items-center justify-center h-[250px] border-2 border-dashed border-border rounded-lg">
          <div className="flex items-center gap-3 text-blue-600 dark:text-blue-400">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-medium">Loading products...</span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {state.data.map((product) => (
            <div
              key={product.id}
              className="p-3 rounded-lg border-2 border-border bg-surface flex items-center justify-between"
            >
              <div>
                <h4 className="font-semibold text-sm">{product.name}</h4>
                <p className="text-xs text-muted-foreground">
                  {product.category}
                </p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-green-600 dark:text-green-400">
                  ${product.price}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {state.totalPages > 0 && (
        <div className="flex items-center justify-between pt-3 border-t-2 border-border">
          <Button
            onClick={cubit.prevPage}
            disabled={state.currentPage === 1 || state.loading}
            variant="outline"
            size="sm"
          >
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: state.totalPages }, (_, i) => i + 1).map(
              (page) => (
                <button
                  key={page}
                  onClick={() => cubit.goToPage(page)}
                  disabled={state.loading}
                  className={`w-7 h-7 rounded text-xs font-medium transition-all ${
                    page === state.currentPage
                      ? 'bg-brand text-white'
                      : 'bg-surface-muted hover:bg-surface-muted/70'
                  } disabled:opacity-50`}
                >
                  {page}
                </button>
              ),
            )}
          </div>

          <Button
            onClick={cubit.nextPage}
            disabled={state.currentPage === state.totalPages || state.loading}
            variant="outline"
            size="sm"
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
