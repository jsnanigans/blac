import { useEffect, useState } from 'react';
import {
  SandpackProvider,
  SandpackCodeEditor,
  SandpackPreview,
  SandpackConsole,
  type SandpackTheme,
} from '@codesandbox/sandpack-react';
import './blac-sandpack.css';

/**
 * BlacSandpack — an editable, in-browser BlaC playground for the Starlight docs.
 *
 * This is the React/Astro port of the original VitePress `BlacSandpack.vue`. It
 * is the deliberately *editable* counterpart to the `DemoFrame` islands: those
 * islands run the live `workspace:*` blac and defend the API at build time;
 * this runs a **pinned, published** blac from Sandpack's CDN (accepted version
 * drift) so readers can edit the source and watch the preview re-run. Reserve
 * it for the build/tinker pages (the tutorial checkpoints).
 *
 * MOUNTING — `client:only="react"`, NOT `client:visible`:
 * `@codesandbox/sandpack-react` is browser-only (it bundles CodeMirror and
 * touches `window`/`document` at import) and must never be evaluated during
 * Astro's SSR build. `client:only` skips the server render entirely, which is
 * the React/Astro equivalent of VitePress's `<ClientOnly>` guard.
 *
 * LAYOUT:
 * Opens showing only the running preview full-width. A "View code" toggle
 * reveals the editor and splits the body 50/50 (editor left, preview right) —
 * calm by default, source one click away.
 *
 * THEME:
 * Surfaces/accent map to Starlight's `--sl-color-*` variables so the chrome
 * tracks light/dark automatically. Syntax token colours can't come from those
 * variables, so they are a hand-tuned palette swapped on the active theme,
 * which we read from `document.documentElement.dataset.theme` (set by
 * Starlight's ThemeProvider) and keep in sync via a MutationObserver.
 */
export interface BlacSandpackProps {
  /** Convenience for single-file demos: maps to `/App.tsx`. */
  code?: string;
  /**
   * Multi-file demos. Keys are absolute sandbox paths (e.g. `/App.tsx`).
   * `files` wins over `code`.
   */
  files?: Record<string, string>;
  /** File opened in the editor. Default `/App.tsx`. */
  activeFile?: string;
  /** Body height in px. Default 460. */
  editorHeight?: number;
  /** Show the Sandpack console. Default false. */
  showConsole?: boolean;
  /** Start with the code editor revealed. Default false. */
  defaultOpen?: boolean;
}

// Pin the PUBLISHED packages so the embed resolves the real shipped API from
// Sandpack's CDN — not the workspace build. Bump on a published blac release.
const BLAC_SANDPACK_VERSION = '2.0.17';

const CUSTOM_SETUP = {
  dependencies: {
    '@blac/core': BLAC_SANDPACK_VERSION,
    '@blac/react': BLAC_SANDPACK_VERSION,
    react: '^18.0.0',
    'react-dom': '^18.0.0',
  },
};

// Syntax palettes — Starlight/Shiki don't expose token colours, so these are
// hand-tuned to read well against the Starlight surfaces in each mode.
const LIGHT_SYNTAX = {
  plain: '#3b3b3b',
  comment: { color: '#9aa0a6', fontStyle: 'italic' as const },
  keyword: '#9333ea',
  tag: '#0550ae',
  punctuation: '#6e7781',
  definition: '#7c3aed',
  property: '#0550ae',
  static: '#0a7c42',
  string: '#0a7c42',
};

const DARK_SYNTAX = {
  plain: '#d6deeb',
  comment: { color: '#637777', fontStyle: 'italic' as const },
  keyword: '#c792ea',
  tag: '#7fdbca',
  punctuation: '#a1aab8',
  definition: '#82aaff',
  property: '#addb67',
  static: '#ecc48d',
  string: '#ecc48d',
};

/** Tracks Starlight's active theme via the `data-theme` attribute on `<html>`. */
function useStarlightTheme(): 'light' | 'dark' {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const root = document.documentElement;
    const read = () =>
      setTheme(root.dataset.theme === 'light' ? 'light' : 'dark');
    read();
    const observer = new MutationObserver(read);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  return theme;
}

function buildTheme(mode: 'light' | 'dark'): SandpackTheme {
  return {
    colors: {
      surface1: 'var(--sl-color-bg)',
      surface2: 'var(--sl-color-bg-nav, var(--sl-color-gray-6))',
      surface3: 'var(--sl-color-gray-6)',
      base: 'var(--sl-color-white)',
      clickable: 'var(--sl-color-gray-3)',
      disabled: 'var(--sl-color-gray-4)',
      hover: 'var(--sl-color-text-accent)',
      accent: 'var(--sl-color-text-accent)',
      error: 'var(--sl-color-red, #e45649)',
      errorSurface: 'var(--sl-color-red-low, rgba(228, 70, 73, 0.14))',
    },
    syntax: mode === 'dark' ? DARK_SYNTAX : LIGHT_SYNTAX,
    font: {
      body: 'var(--sl-font, sans-serif)',
      mono: 'var(--sl-font-mono, monospace)',
      size: '13px',
      lineHeight: '1.6',
    },
  };
}

export function BlacSandpack({
  code,
  files,
  activeFile = '/App.tsx',
  editorHeight = 460,
  showConsole = false,
  defaultOpen = false,
}: BlacSandpackProps) {
  const [codeOpen, setCodeOpen] = useState(defaultOpen);
  const mode = useStarlightTheme();

  // `files` wins over `code`; `code` is the single-file convenience targeting
  // /App.tsx. At least one must be supplied.
  const resolvedFiles =
    files && Object.keys(files).length > 0
      ? files
      : { '/App.tsx': code ?? '' };

  return (
    <div className={`blac-sp${codeOpen ? ' blac-sp--open' : ''} not-content`}>
      <SandpackProvider
        template="react-ts"
        files={resolvedFiles}
        customSetup={CUSTOM_SETUP}
        options={{ activeFile }}
        theme={buildTheme(mode)}
      >
        <div className="blac-sp__bar">
          <span className="blac-sp__label">
            <span className="blac-sp__pulse" aria-hidden="true" />
            Live example
          </span>
          <button
            className="blac-sp__toggle"
            type="button"
            aria-expanded={codeOpen}
            onClick={() => setCodeOpen((v) => !v)}
          >
            <svg
              className="blac-sp__code-icon"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            {codeOpen ? 'Hide code' : 'View code'}
          </button>
        </div>

        <div className="blac-sp__body">
          {codeOpen && (
            <SandpackCodeEditor
              className="blac-sp__pane blac-sp__editor"
              style={{ height: editorHeight }}
              showLineNumbers
              showInlineErrors
              showTabs
              wrapContent
            />
          )}
          <SandpackPreview
            className="blac-sp__pane blac-sp__preview"
            style={{ height: editorHeight }}
            showOpenInCodeSandbox
            showRefreshButton
          />
        </div>

        {showConsole && <SandpackConsole className="blac-sp__console" />}
      </SandpackProvider>
    </div>
  );
}

export default BlacSandpack;
