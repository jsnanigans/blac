import { useBloc } from '@blac/react';
import { SearchBloc } from './SearchBloc';
import { Card, RenderCounter, Badge } from '../../shared/components';

export function SearchResults() {
  const [state, search] = useBloc(SearchBloc);

  console.log('[SearchResults] Rendering');

  const results = search.results; // Access getter
  const count = search.resultCount;

  if (results.length === 0 && state.query.trim()) {
    return (
      <Card>
        <div className="stack-sm">
          <div className="flex-between">
            <h3>Results</h3>
            <RenderCounter name="Results" />
          </div>
          <div className="empty-state">
            No results found for "{state.query}"
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="stack-md">
        <div className="flex-between">
          <h3>Results ({count})</h3>
          <RenderCounter name="Results" />
        </div>

        <div className="stack-sm">
          {results.map((item) => {
            const nameParts = search.highlightMatches(item.name);
            const descParts = search.highlightMatches(item.description);

            return (
              <div key={item.id} className="search-result-item">
                <div className="stack-xs">
                  <div className="flex-between">
                    <h4>
                      {nameParts.map((part, i) => (
                        <span
                          key={i}
                          className={part.isMatch ? 'highlight' : ''}
                        >
                          {part.text}
                        </span>
                      ))}
                    </h4>
                    <Badge variant="default">{item.category}</Badge>
                  </div>

                  <p className="text-small text-muted">
                    {descParts.map((part, i) => (
                      <span key={i} className={part.isMatch ? 'highlight' : ''}>
                        {part.text}
                      </span>
                    ))}
                  </p>

                  <div className="row-xs">
                    {item.tags.map((tag) => (
                      <span key={tag} className="tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted">
          💡 Results computed via getter. No useMemo needed - BlaC tracks
          dependencies automatically!
        </p>
      </div>
    </Card>
  );
}
