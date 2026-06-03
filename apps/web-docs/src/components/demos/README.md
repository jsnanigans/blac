# Interactive demo islands

Real, non-editable `@blac/react` demos rendered as **Astro React islands**. They
import the live `workspace:*` blac packages (`@blac/core` / `@blac/react`), so if
the public API breaks, the docs **build fails** — these demos defend the
library's claims. Do not pin/vendor a blac version in an island.

Editable in-browser playgrounds are a **separate, version-pinned** mechanism —
[`BlacSandpack`](#editable-playgrounds-blacsandpack) — for the build/tinker
pages only. See its own section below.

## The shared contract

| File                | Role                                                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `DemoFrame.tsx`     | Theme-synced bordered chrome with an optional label. Wrap every demo.                                            |
| `RenderCounter.tsx` | Counts real renders (increments a **ref in the render body**). The workhorse for proving re-render isolation.    |
| `demos.css`         | All chrome styles, keyed off Starlight's `--sl-*` theme variables (auto light/dark). Imported by the components. |
| `CounterDemo.tsx`   | The reference island. Copy its shape for new demos.                                                              |

### Authoring a new island

1. Put the `.tsx` in this directory.
2. Define (or import) a `Cubit`, drive it with `useBloc`, render inside
   `<DemoFrame label="…">`. Keep one **default-exported** top-level component
   per island file; helper components stay internal.
3. `useBloc` options are only `{ args, instanceId, select, onMount, onUnmount }`
   — instance identity is derived from `args`. For a per-mount private instance,
   pass a stable unique object: `{ args: { _id: useId() } }`.
4. `RenderCounter` increments a ref **in the render body**, never in
   `useEffect` — that is what makes it count actual renders. Don't change it.

## Embedding an island in a docs page

Starlight renders plain `.md` **without** component support, so a page that
embeds an island must be `.mdx`:

1. Rename the page `foo.md` → `foo.mdx`. Keep the frontmatter identical; the
   route is unchanged.
2. Import the island and mount it with a **lazy** hydration directive — never
   `client:load`:

   ```mdx
   ---
   title: My Page
   ---

   import CounterDemo from '../../../components/demos/CounterDemo.tsx';

   Some prose.

   <CounterDemo client:visible />
   ```

   Use `client:visible` (hydrate when scrolled into view) by default, or
   `client:idle` for an above-the-fold demo. The import path is relative from
   the page's location under `src/content/docs/…` to `src/components/demos/`.

## Why these conventions

- **Lazy hydration** keeps time-to-interactive low — most demos are below the
  fold, so `client:visible` defers their JS until needed.
- **SSR-safe:** islands render to static HTML on the server, then hydrate. The
  components here use only standard React hooks (`useRef`, and `useBloc`, which
  is SSR-safe), so they pre-render fine. Avoid touching `window`/`document` at
  module top-level or during the first render.
- **Verify with the build:** `pnpm -F @blac/web-docs build` is the oracle. It
  type-checks the islands against real blac and fails on any error.

## Editable playgrounds (`BlacSandpack`)

`BlacSandpack.tsx` is the **editable** counterpart to the islands above: an
in-browser [Sandpack](https://sandpack.codesandbox.io/) editor + live preview
where readers can change the source and watch it re-run. Use it **sparingly** —
only on build/tinker pages (currently the two tutorial checkpoints). The
tutorial's projects live in `tutorial-sandpack-files.ts` as plain strings.

How it differs from the islands — and why those differences are deliberate:

| Aspect      | Island (`DemoFrame`)          | `BlacSandpack`                                   |
| ----------- | ----------------------------- | ------------------------------------------------ |
| blac source | live `workspace:*`            | **pinned published** version, from Sandpack CDN  |
| Editable?   | no                            | yes (the point)                                  |
| Defends API | yes — breaks the build        | no — accepts version drift                       |
| Mount       | `client:visible` / `idle`     | **`client:only="react"`**                        |

Key rules:

1. **Mount with `client:only="react"`, never `client:visible`.**
   `@codesandbox/sandpack-react` is browser-only (bundles CodeMirror, touches
   `window`/`document` at import). `client:only` skips the server render so the
   import never leaks into SSR — the React/Astro equivalent of VitePress's
   `<ClientOnly>`.
2. **Version pin lives in one place** — the `BLAC_SANDPACK_VERSION` constant in
   `BlacSandpack.tsx`. Bump it on a published blac release.
3. **`files` modules must be SSR-safe** — plain string exports only, no runtime
   imports — so an `.mdx` page can import them at the top level.

Embedding (in an `.mdx` page):

```mdx
import BlacSandpack from '../../../components/demos/BlacSandpack.tsx';
import { tutorialInteractiveFiles } from '../../../components/demos/tutorial-sandpack-files.ts';

<BlacSandpack
  client:only="react"
  files={tutorialInteractiveFiles}
  activeFile="/TodoCubit.ts"
/>
```

Props: `files` (path → source map) or `code` (single-file shorthand for
`/App.tsx`); `activeFile`, `editorHeight`, `showConsole`, `defaultOpen`. The
chrome opens preview-only with a **View code** toggle, and theme-syncs to
Starlight's `--sl-color-*` variables.
