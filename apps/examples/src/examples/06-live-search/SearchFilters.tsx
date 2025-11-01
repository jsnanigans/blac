import { useBloc } from '@blac/react';
import { SearchBloc } from './SearchBloc';
import { Button, Badge, RenderCounter } from '../../shared/components';
import { CATEGORIES } from './mockData';

export function SearchFilters() {
  const [state, search] = useBloc(SearchBloc);

  console.log('[SearchFilters] Rendering');

  return (
    <div className="stack-sm">
      <div className="flex-between">
        <h3>Categories</h3>
        <RenderCounter name="Filters" />
      </div>

      <div className="row-sm flex-wrap">
        {CATEGORIES.map((category) => {
          const count = search.categoryFacets[category] || 0;
          const isSelected = state.selectedCategory === category;

          return (
            <Button
              key={category}
              variant={isSelected ? 'primary' : 'ghost'}
              onClick={() => search.setCategory(category)}
            >
              {category}
              <Badge variant={isSelected ? 'default' : 'default'}>
                {count}
              </Badge>
            </Button>
          );
        })}
      </div>

      <p className="text-xs text-muted">
        💡 Facet counts are computed via getter. This component re-renders when
        selectedCategory changes.
      </p>
    </div>
  );
}
