import { Cubit } from '@blac/core';

export interface RouterState {
  path: string;
  params: Record<string, string>;
}

/**
 * Custom router implementation using Blac's Cubit.
 * Demonstrates using Blac for general application state beyond just UI.
 */
export class RouterBloc extends Cubit<RouterState> {
  constructor() {
    super({
      path: window.location.pathname,
      params: {},
    });

    // Listen for browser back/forward navigation
    window.addEventListener('popstate', this.handlePopState);

    // Cleanup on dispose
    this.onSystemEvent('dispose', () => {
      window.removeEventListener('popstate', this.handlePopState);
    });
  }

  /**
   * Navigate to a new path programmatically
   */
  navigate = (path: string, params: Record<string, string> = {}) => {
    window.history.pushState({}, '', path);
    this.emit({ path, params });
  };

  /**
   * Handle browser back/forward buttons
   */
  private handlePopState = () => {
    const path = window.location.pathname;
    this.emit({ ...this.state, path });
  };
}
