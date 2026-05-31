<!--
  BlacSandpack — an SSR-safe, reusable in-browser BlaC playground for the docs.

  LAYOUT:
  The demo opens showing ONLY the running result (preview) full-width. A "View
  code" toggle in the chrome bar reveals the editor and splits the body 50/50
  (editor left, preview right). This keeps pages calm by default while leaving
  the source one click away.

  WHY THIS SHAPE:
  VitePress statically server-renders every page. `sandpack-vue3` is
  browser-only (it touches window/document/self and bundles CodeMirror), so it
  must NEVER be imported or rendered during SSR or the build crashes. Two guards
  make this safe:
    1. defineAsyncComponent(() => import('sandpack-vue3')) — the modules are only
       fetched in the browser, never at the top level (no SSR-evaluated import).
    2. <ClientOnly> — VitePress skips this subtree on the server entirely.

  Rather than the high-level <Sandpack> (which hard-codes an editor+preview
  split), we compose the primitives — <SandpackProvider> + <SandpackCodeEditor>
  + <SandpackPreview> — so we control the chrome and the open/closed layout.

  THEME:
  The Sandpack `theme` object maps surfaces/accent to VitePress CSS variables
  (var(--vp-...)), so the embed automatically tracks the docs' light/dark mode
  and brand colour. Syntax colours can't come from VitePress (Shiki doesn't
  expose them), so they're a hand-tuned palette swapped on `isDark`.

  API (props): unchanged from before.
    - code?:  string                      Convenience: maps to /App.tsx.
    - files?: Record<string, string>      Multi-file demos. Keys are absolute
                                          sandbox paths (e.g. '/App.tsx').
                                          `files` wins over `code`.
    - activeFile?: string                 File opened in the editor. Default '/App.tsx'.
    - editorHeight?: number               Body height in px. Default 460.
    - showConsole?: boolean               Show the Sandpack console. Default false.
    - defaultOpen?: boolean               Start with the code editor revealed. Default false.

  Dependencies are pinned to the PUBLISHED packages so the embed resolves the
  real shipped API from Sandpack's CDN — not workspace builds.
-->
<template>
  <ClientOnly>
    <div class="blac-sp" :class="{ 'blac-sp--open': codeOpen }">
      <SandpackProvider
        template="react-ts"
        :files="resolvedFiles"
        :custom-setup="customSetup"
        :options="providerOptions"
        :theme="theme"
      >
        <div class="blac-sp__bar">
          <span class="blac-sp__label">
            <span class="blac-sp__pulse" aria-hidden="true" />
            Live example
          </span>
          <button
            class="blac-sp__toggle"
            type="button"
            :aria-expanded="codeOpen"
            @click="codeOpen = !codeOpen"
          >
            <svg
              class="blac-sp__code-icon"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <polyline points="16 18 22 12 16 6" />
              <polyline points="8 6 2 12 8 18" />
            </svg>
            {{ codeOpen ? 'Hide code' : 'View code' }}
          </button>
        </div>

        <div class="blac-sp__body">
          <SandpackCodeEditor
            v-if="codeOpen"
            class="blac-sp__pane blac-sp__editor"
            :style="{ height: editorHeight + 'px' }"
            :show-line-numbers="true"
            :show-inline-errors="true"
            :show-tabs="true"
            :wrap-content="true"
          />
          <SandpackPreview
            class="blac-sp__pane blac-sp__preview"
            :style="{ height: editorHeight + 'px' }"
            :show-open-in-code-sandbox="true"
            :show-refresh-button="true"
          />
        </div>

        <SandpackConsole v-if="showConsole" class="blac-sp__console" />
      </SandpackProvider>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, ref } from 'vue';
import { useData } from 'vitepress';

// Lazy, browser-only loads. The arrow bodies run only when the components mount
// in the browser (inside <ClientOnly>), so SSR never evaluates sandpack-vue3.
const SandpackProvider = defineAsyncComponent(() =>
  import('sandpack-vue3').then((m) => m.SandpackProvider),
);
const SandpackCodeEditor = defineAsyncComponent(() =>
  import('sandpack-vue3').then((m) => m.SandpackCodeEditor),
);
const SandpackPreview = defineAsyncComponent(() =>
  import('sandpack-vue3').then((m) => m.SandpackPreview),
);
const SandpackConsole = defineAsyncComponent(() =>
  import('sandpack-vue3').then((m) => m.SandpackConsole),
);

const props = withDefaults(
  defineProps<{
    code?: string;
    files?: Record<string, string>;
    activeFile?: string;
    editorHeight?: number;
    showConsole?: boolean;
    defaultOpen?: boolean;
  }>(),
  {
    code: undefined,
    files: undefined,
    activeFile: '/App.tsx',
    editorHeight: 460,
    showConsole: false,
    defaultOpen: false,
  },
);

// Open/closed state for the code editor. Closed shows preview-only.
const codeOpen = ref(props.defaultOpen);

// `files` wins over `code`; `code` is the single-file convenience that targets
// /App.tsx. At least one must be supplied.
const resolvedFiles = computed<Record<string, string>>(() => {
  if (props.files && Object.keys(props.files).length > 0) return props.files;
  if (props.code) return { '/App.tsx': props.code };
  return { '/App.tsx': '' };
});

// Pin the PUBLISHED package versions so the embed resolves the real shipped
// API from the Sandpack CDN.
const customSetup = {
  dependencies: {
    '@blac/core': '2.0.15',
    '@blac/react': '2.0.15',
    react: '^18.0.0',
    'react-dom': '^18.0.0',
  },
};

const providerOptions = computed(() => ({
  activeFile: props.activeFile,
}));

// Follow the docs' light/dark mode.
const { isDark } = useData();

// Syntax palettes — VitePress/Shiki don't expose token colours, so these are
// hand-tuned to read well against the VitePress surfaces in each mode.
const lightSyntax = {
  plain: '#3b3b3b',
  comment: { color: '#9aa0a6', fontStyle: 'italic' },
  keyword: '#9333ea',
  tag: '#0550ae',
  punctuation: '#6e7781',
  definition: '#7c3aed',
  property: '#0550ae',
  static: '#0a7c42',
  string: '#0a7c42',
};
const darkSyntax = {
  plain: '#d6deeb',
  comment: { color: '#637777', fontStyle: 'italic' },
  keyword: '#c792ea',
  tag: '#7fdbca',
  punctuation: '#a1aab8',
  definition: '#82aaff',
  property: '#addb67',
  static: '#ecc48d',
  string: '#ecc48d',
};

// Surfaces/accent map to VitePress CSS variables so the chrome tracks the docs
// theme automatically; syntax + font swap on isDark.
const theme = computed(() => ({
  colors: {
    surface1: 'var(--vp-c-bg)',
    surface2: 'var(--vp-c-bg-soft)',
    surface3: 'var(--vp-c-bg-alt)',
    base: 'var(--vp-c-text-1)',
    clickable: 'var(--vp-c-text-2)',
    disabled: 'var(--vp-c-text-3)',
    hover: 'var(--vp-c-brand-1)',
    accent: 'var(--vp-c-brand-1)',
    error: 'var(--vp-c-danger-1, #e45649)',
    errorSurface: 'var(--vp-c-danger-soft, rgba(228, 70, 73, 0.14))',
  },
  syntax: isDark.value ? darkSyntax : lightSyntax,
  font: {
    body: 'var(--vp-font-family-base)',
    mono: 'var(--vp-font-family-mono)',
    size: '13px',
    lineHeight: '1.6',
  },
}));
</script>

<style scoped>
.blac-sp {
  margin: 20px 0;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  overflow: hidden;
  background-color: var(--vp-c-bg);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

/* Chrome bar -------------------------------------------------------------- */
.blac-sp__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  background-color: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}

.blac-sp__label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--vp-c-text-2);
  text-transform: uppercase;
}

.blac-sp__pulse {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 0 var(--vp-c-brand-1);
  animation: blac-sp-pulse 2.4s ease-out infinite;
}

@keyframes blac-sp-pulse {
  0% {
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--vp-c-brand-1) 55%, transparent);
  }
  70% {
    box-shadow: 0 0 0 6px transparent;
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}

.blac-sp__toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  color: var(--vp-c-text-1);
  background-color: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  cursor: pointer;
  transition:
    color 0.2s,
    border-color 0.2s,
    background-color 0.2s;
}

.blac-sp__toggle:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
  background-color: var(--vp-c-bg-soft);
}

.blac-sp__code-icon {
  transition: transform 0.2s;
}

.blac-sp--open .blac-sp__code-icon {
  transform: rotate(90deg);
}

/* Body: preview-only by default, 50/50 split when the editor is revealed ---- */
.blac-sp__body {
  display: flex;
  align-items: stretch;
}

.blac-sp__pane {
  min-width: 0;
}

.blac-sp__editor {
  flex: 1 1 50%;
  border-right: 1px solid var(--vp-c-divider);
}

.blac-sp__preview {
  flex: 1 1 50%;
}

/* When closed the preview is the only child and fills the full width. */
.blac-sp:not(.blac-sp--open) .blac-sp__preview {
  flex-basis: 100%;
}

/* Make the Sandpack primitives fill our flex panes. */
.blac-sp :deep(.sp-stack),
.blac-sp :deep(.sp-wrapper),
.blac-sp :deep(.sp-layout) {
  height: 100%;
}

.blac-sp__console {
  border-top: 1px solid var(--vp-c-divider);
}

/* Stack editor over preview on narrow screens. */
@media (max-width: 640px) {
  .blac-sp--open .blac-sp__body {
    flex-direction: column;
  }
  .blac-sp__editor {
    border-right: none;
    border-bottom: 1px solid var(--vp-c-divider);
  }
}
</style>
