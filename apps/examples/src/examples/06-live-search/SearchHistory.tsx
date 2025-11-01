import { useBloc } from '@blac/react';
import { SearchBloc } from './SearchBloc';
import { Button, Card, RenderCounter } from '../../shared/components';

export function SearchHistory() {
  const [state, search] = useBloc(SearchBloc);

  console.log('[SearchHistory] Rendering');

  if (state.searchHistory.length === 0) {
    return null;
  }

  return (
    <Card>
      <div className="stack-sm">
        <div className="flex-between">
          <h3>Recent Searches</h3>
          <RenderCounter name="History" />
        </div>

        <div className="row-sm flex-wrap">
          {state.searchHistory.map((query, index) => (
            <Button
              key={index}
              variant="ghost"
              size="small"
              onClick={() => search.setQuery(query)}
            >
              {query}
            </Button>
          ))}
        </div>

        <Button variant="ghost" size="small" onClick={search.clearHistory}>
          Clear History
        </Button>

        <p className="text-xs text-muted">
          💡 Only re-renders when searchHistory changes
        </p>
      </div>
    </Card>
  );
}
