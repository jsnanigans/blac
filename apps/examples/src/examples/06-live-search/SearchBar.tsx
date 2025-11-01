import { useBloc } from '@blac/react';
import { SearchBloc } from './SearchBloc';
import { RenderCounter } from '../../shared/components';

export function SearchBar() {
  const [state, search] = useBloc(SearchBloc);

  console.log('[SearchBar] Rendering');

  return (
    <div className="stack-sm">
      <div className="flex-between">
        <h3>Search</h3>
        <RenderCounter name="SearchBar" />
      </div>

      <div className="row-sm">
        <input
          type="text"
          value={state.query}
          onChange={(e) => search.setQuery(e.target.value)}
          placeholder="Search products..."
          className="search-input"
          aria-label="Search"
        />

        {state.query && (
          <button
            onClick={search.clearSearch}
            className="clear-button"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}

        {state.isSearching && (
          <span className="text-small text-muted">Searching...</span>
        )}
      </div>

      <p className="text-xs text-muted">
        💡 Search is debounced by 300ms. This component only re-renders when
        query or isSearching changes.
      </p>
    </div>
  );
}
