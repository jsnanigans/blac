import { Cubit } from '@blac/core';

export type Route = 'basics' | 'market';

export const ROUTES: { path: Route; label: string }[] = [
  { path: 'basics', label: 'Basics' },
  { path: 'market', label: 'Live Market Board' },
];

interface RouterState {
  path: Route;
}

const read = (): Route => {
  const h = (location.hash.replace(/^#\/?/, '') || 'basics') as Route;
  return ROUTES.some((r) => r.path === h) ? h : 'basics';
};

export class RouterBloc extends Cubit<RouterState> {
  constructor() {
    super({ path: read() });
    window.addEventListener('hashchange', this._onHash);
  }

  private _onHash = () => this.emit({ path: read() });

  navigate = (path: Route) => {
    location.hash = `/${path}`;
  };
}
