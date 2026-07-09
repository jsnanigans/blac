import { html, select } from '@blac/lit';
import { component } from '../dev/component';
import { RouterBloc, ROUTES } from './router.bloc';

export const Nav = component(RouterBloc, (r) => {
  return html`
    <nav class="nav">
      ${ROUTES.map(
        ({ path, label }) => html`
          <button
            class=${select(r, (s) =>
              s.path === path ? 'nav__link active' : 'nav__link',
            )}
            @click=${() => r.navigate(path)}
          >
            ${label}
          </button>
        `,
      )}
    </nav>
  `;
});
