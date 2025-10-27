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

    // Set up lifecycle hooks
    this.onMount = () => {
      // Listen for browser back/forward navigation
      window.addEventListener('popstate', this.handlePopState);
      console.log('[RouterBloc] Mounted - listening to browser navigation');
    };

    this.onUnmount = () => {
      window.removeEventListener('popstate', this.handlePopState);
      console.log('[RouterBloc] Unmounted - cleaned up listeners');
    };
  }

  /**
   * Navigate to a new path programmatically
   */
  navigate = (path: string, params: Record<string, string> = {}) => {
    window.history.pushState({}, '', path);
    this.emit({ path, params });
    console.log(`[RouterBloc] Navigated to: ${path}`, params);
  };

  /**
   * Handle browser back/forward buttons
   */
  private handlePopState = () => {
    const path = window.location.pathname;
    this.emit({ ...this.state, path });
    console.log(`[RouterBloc] Browser navigation to: ${path}`);
  };
}
