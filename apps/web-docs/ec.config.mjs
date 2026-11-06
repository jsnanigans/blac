// @ts-check
// Expressive Code options live here (not in astro.config) so the <Code>
// component can read them: they must be importable, not serialized.
import { defineEcConfig } from 'astro-expressive-code';
import ts from 'typescript';
import pluginTwoslash from 'expressive-code-twoslash';
import { blacDark, blacLight } from './src/styles/code-themes.mjs';

const twoslash = pluginTwoslash({
  // Only fences tagged `twoslash` are type-checked; plain ```ts stays fast.
  twoslashOptions: {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      jsxImportSource: 'react',
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      strict: true,
      esModuleInterop: true,
      allowSyntheticDefaultImports: true,
      skipLibCheck: true,
      lib: ['lib.dom.d.ts', 'lib.dom.iterable.d.ts', 'lib.esnext.d.ts'],
    },
  },
});

export default defineEcConfig({
  themes: [blacDark, blacLight],
  themeCssSelector: (theme) => `[data-theme='${theme.type}']`,
  useDarkModeMediaQuery: false,
  styleOverrides: {
    borderRadius: '10px',
    borderColor: 'var(--line)',
    codeFontFamily: 'var(--font-mono)',
    codeFontSize: '0.875rem',
    codeLineHeight: '1.7',
    codePaddingBlock: '1rem',
    codePaddingInline: '1.25rem',
    codeBackground: 'var(--code-bg)',
    uiFontFamily: 'var(--font-mono)',
    frames: {
      shadowColor: 'transparent',
      editorTabBarBackground: 'var(--panel)',
      editorActiveTabBackground: 'var(--code-bg)',
      editorActiveTabIndicatorTopColor: 'var(--lit)',
      terminalTitlebarBackground: 'var(--panel)',
      terminalBackground: 'var(--code-bg)',
      frameBoxShadowCssValue: 'none',
    },
  },
  // Type-only skew: the plugin's `@expressive-code/core` peer resolves to
  // 0.42 while astro-expressive-code ships 0.41. The runtime API matches.
  plugins: [/** @type {any} */ (twoslash)],
});
