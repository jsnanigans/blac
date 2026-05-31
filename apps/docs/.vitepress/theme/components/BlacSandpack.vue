<!--
  BlacSandpack — an SSR-safe, reusable in-browser BlaC playground for the docs.

  WHY THIS SHAPE:
  VitePress statically server-renders every page. `sandpack-vue3` is
  browser-only (it touches window/document/self and bundles CodeMirror), so it
  must NEVER be imported or rendered during SSR or the build crashes. Two guards
  make this safe:
    1. defineAsyncComponent(() => import('sandpack-vue3')) — the module is only
       fetched in the browser, never at the top level (no SSR-evaluated import).
    2. <ClientOnly> — VitePress skips this subtree on the server entirely.

  API (props):
    - code?:  string                      Convenience: maps to /App.tsx. Use for
                                          single-file demos.
    - files?: Record<string, string>      Multi-file demos. Keys are absolute
                                          sandbox paths (e.g. '/App.tsx'). If
                                          both `code` and `files` are given,
                                          `files` wins (and `code` is ignored).
    - activeFile?: string                 Which file opens in the editor.
                                          Default: '/App.tsx'.
    - editorHeight?: number               Editor/preview height in px. Default 460.
    - showConsole?: boolean               Show the Sandpack console. Default false.

  Dependencies are pinned to the PUBLISHED packages so the embed resolves the
  real shipped API from Sandpack's CDN — not workspace builds:
      @blac/core 2.0.15, @blac/react 2.0.15, react ^18, react-dom ^18
-->
<template>
  <ClientOnly>
    <div class="blac-sandpack">
      <Sandpack
        template="react-ts"
        :files="resolvedFiles"
        :custom-setup="customSetup"
        :options="options"
        :theme="theme"
      />
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import { useData } from 'vitepress';

// Lazy, browser-only load. The arrow body runs only when the component mounts
// in the browser (inside <ClientOnly>), so SSR never evaluates sandpack-vue3.
const Sandpack = defineAsyncComponent(() =>
  import('sandpack-vue3').then((m) => m.Sandpack),
);

const props = withDefaults(
  defineProps<{
    code?: string;
    files?: Record<string, string>;
    activeFile?: string;
    editorHeight?: number;
    showConsole?: boolean;
  }>(),
  {
    code: undefined,
    files: undefined,
    activeFile: '/App.tsx',
    editorHeight: 460,
    showConsole: false,
  },
);

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

const options = computed(() => ({
  activeFile: props.activeFile,
  editorHeight: props.editorHeight,
  showLineNumbers: true,
  showInlineErrors: true,
  showTabs: true,
  showConsoleButton: true,
  showConsole: props.showConsole,
  wrapContent: true,
}));

// Follow the docs' light/dark mode.
const { isDark } = useData();
const theme = computed(() => (isDark.value ? 'dark' : 'light'));
</script>

<style scoped>
.blac-sandpack {
  margin: 16px 0;
}
</style>
