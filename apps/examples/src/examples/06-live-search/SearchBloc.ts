import { Cubit } from '@blac/core';
import { SEARCH_DATA, CATEGORIES, type SearchItem } from './mockData';

interface SearchState {
  query: string;
  selectedCategory: string;
  searchHistory: string[];
  isSearching: boolean;
}

export class SearchBloc extends Cubit<SearchState> {
  private debounceTimer: NodeJS.Timeout | null = null;
  private allItems: SearchItem[] = SEARCH_DATA;

  constructor() {
    super({
      query: '',
      selectedCategory: 'All',
      searchHistory: [],
      isSearching: false,
    });

    this.onDispose = () => {
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
      }
      console.log('[SearchBloc] Disposed');
    };
  }

  // Actions
  setQuery = (query: string) => {
    // Cancel previous debounce
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set loading state immediately
    this.patch({ query, isSearching: true });

    // Debounce the search
    this.debounceTimer = setTimeout(() => {
      this.patch({ isSearching: false });

      // Add to history if not empty and not duplicate
      if (query.trim() && !this.state.searchHistory.includes(query)) {
        this.patch({
          searchHistory: [query, ...this.state.searchHistory].slice(0, 5),
        });
      }
    }, 300);
  };

  setCategory = (category: string) => {
    this.patch({ selectedCategory: category });
  };

  clearHistory = () => {
    this.patch({ searchHistory: [] });
  };

  clearSearch = () => {
    this.patch({ query: '', isSearching: false });
  };

  // Getters (computed properties)

  /**
   * Filtered results based on query and category
   * This is automatically tracked - components using this getter
   * will only re-render when query or selectedCategory changes
   */
  get results(): SearchItem[] {
    let filtered = this.allItems;

    // Filter by category
    if (this.state.selectedCategory !== 'All') {
      filtered = filtered.filter(
        (item) => item.category === this.state.selectedCategory,
      );
    }

    // Filter by search query
    if (this.state.query.trim()) {
      const query = this.state.query.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.tags.some((tag) => tag.toLowerCase().includes(query)),
      );
    }

    return filtered;
  }

  /**
   * Results count
   */
  get resultCount(): number {
    return this.results.length;
  }

  /**
   * Category facets (count per category)
   */
  get categoryFacets(): Record<string, number> {
    const facets: Record<string, number> = {};

    CATEGORIES.forEach((category) => {
      if (category === 'All') {
        facets[category] = this.allItems.length;
      } else {
        facets[category] = this.allItems.filter(
          (item) => item.category === category,
        ).length;
      }
    });

    return facets;
  }

  /**
   * Highlighted text helper
   * Returns parts of text with matching terms marked
   */
  highlightMatches = (text: string): { text: string; isMatch: boolean }[] => {
    if (!this.state.query.trim()) {
      return [{ text, isMatch: false }];
    }

    const query = this.state.query.toLowerCase();
    const parts: { text: string; isMatch: boolean }[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      const index = remaining.toLowerCase().indexOf(query);

      if (index === -1) {
        parts.push({ text: remaining, isMatch: false });
        break;
      }

      if (index > 0) {
        parts.push({ text: remaining.slice(0, index), isMatch: false });
      }

      parts.push({
        text: remaining.slice(index, index + query.length),
        isMatch: true,
      });

      remaining = remaining.slice(index + query.length);
    }

    return parts;
  };
}
