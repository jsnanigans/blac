import { ExampleLayout } from '../../shared/ExampleLayout';
import { SearchBar } from './SearchBar';
import { SearchFilters } from './SearchFilters';
import { SearchResults } from './SearchResults';
import { SearchHistory } from './SearchHistory';

/**
 * Live Search example demonstrating reactive patterns and computed properties.
 *
 * This example shows:
 * 1. Debounced search without external libraries
 * 2. Computed properties via getters (no useMemo needed!)
 * 3. Automatic dependency tracking
 * 4. Selective re-rendering
 */
export function SearchDemo() {
  return (
    <ExampleLayout
      title="Live Search"
      description="Real-time search with automatic optimization. No useMemo, no useCallback - just getters."
      features={[
        'Debounced search (300ms delay)',
        'Computed results via getters - no manual optimization',
        'Category filtering with facet counts',
        'Search history tracking',
        'Highlight matching terms',
        'Selective re-rendering demonstrated with RenderCounters',
      ]}
    >
      <section className="stack-lg">
        <div className="stack-sm">
          <h2>Product Search</h2>
          <p className="text-muted">
            Type to search across 50+ products. Watch the RenderCounters to see
            BlaC's automatic optimization in action.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-md">
          <div className="stack-md col-span-2">
            <SearchBar />
            <SearchResults />
          </div>

          <div className="stack-md">
            <SearchFilters />
            <SearchHistory />
          </div>
        </div>
      </section>

      <section className="stack-md">
        <h2>Key Concepts</h2>
        <div className="stack-xs text-small text-muted">
          <p>
            • <strong>Debouncing:</strong> Implemented directly in the Bloc
            without external libraries
          </p>
          <p>
            • <strong>Computed properties:</strong> The <code>results</code>,{' '}
            <code>resultCount</code>, and <code>categoryFacets</code> getters
            compute filtered data automatically
          </p>
          <p>
            • <strong>No manual optimization:</strong> In traditional React,
            you'd need useMemo for filtered results. With BlaC, getters are
            automatically tracked.
          </p>
          <p>
            • <strong>Selective re-rendering:</strong> SearchHistory only
            re-renders when searchHistory changes, not when query changes
          </p>
          <p>
            • <strong>Loading states:</strong> isSearching tracks the debounce
            period
          </p>
        </div>
      </section>

      <section className="stack-md">
        <h2>Traditional React vs BlaC</h2>
        <div className="grid grid-cols-2 gap-md">
          <div className="stack-xs">
            <h3 className="text-small">Traditional React</h3>
            <pre className="code-block">
              {`const results = useMemo(() => {
  return items.filter(item =>
    item.name.includes(query) &&
    (category === 'All' ||
     item.category === category)
  );
}, [query, category, items]);

const count = useMemo(() => {
  return results.length;
}, [results]);`}
            </pre>
            <p className="text-xs text-muted">
              Manual dependency tracking required
            </p>
          </div>

          <div className="stack-xs">
            <h3 className="text-small">With BlaC</h3>
            <pre className="code-block">
              {`get results() {
  return this.items.filter(item =>
    item.name.includes(this.state.query) &&
    (this.state.category === 'All' ||
     item.category === this.state.category)
  );
}

get count() {
  return this.results.length;
}`}
            </pre>
            <p className="text-xs text-muted">Automatic dependency tracking</p>
          </div>
        </div>
      </section>
    </ExampleLayout>
  );
}
