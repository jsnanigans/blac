/**
 * Monaco Editor Worker Configuration
 * Ensures proper loading of TypeScript language services
 */

import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

// Configure Monaco Environment for proper worker loading
export function configureMonacoEnvironment() {
  // Use the bundled monaco-editor instead of CDN
  loader.config({ monaco });

  // Initialize the loader
  loader.init().then((monaco) => {
    console.log('Monaco Editor initialized with bundled version');

    // Verify TypeScript language service is available
    const languages = monaco.languages.getLanguages();
    const hasTypeScript = languages.some(
      (lang: any) => lang.id === 'typescript',
    );
    const hasTypeScriptReact = languages.some(
      (lang: any) => lang.id === 'typescriptreact',
    );

    console.log('TypeScript support:', hasTypeScript);
    console.log('TypeScriptReact support:', hasTypeScriptReact);

    if (!hasTypeScriptReact) {
      console.error('TypeScriptReact language not available!');
    }
  });
}

// Alternative: Configure workers manually
export function configureMonacoWorkers() {
  // This ensures TypeScript workers are properly loaded
  (self as any).MonacoEnvironment = {
    getWorker: function (_workerId: string, label: string) {
      console.log(`Loading worker for ${label}`);

      switch (label) {
        case 'typescript':
        case 'typescriptreact':
        case 'javascript':
        case 'javascriptreact':
          // Use TypeScript worker for all JS/TS variants
          return new Worker(
            new URL(
              'monaco-editor/esm/vs/language/typescript/ts.worker',
              import.meta.url,
            ),
            { type: 'module' },
          );
        case 'json':
          return new Worker(
            new URL(
              'monaco-editor/esm/vs/language/json/json.worker',
              import.meta.url,
            ),
            { type: 'module' },
          );
        case 'css':
        case 'scss':
        case 'less':
          return new Worker(
            new URL(
              'monaco-editor/esm/vs/language/css/css.worker',
              import.meta.url,
            ),
            { type: 'module' },
          );
        case 'html':
        case 'handlebars':
        case 'razor':
          return new Worker(
            new URL(
              'monaco-editor/esm/vs/language/html/html.worker',
              import.meta.url,
            ),
            { type: 'module' },
          );
        default:
          return new Worker(
            new URL(
              'monaco-editor/esm/vs/editor/editor.worker',
              import.meta.url,
            ),
            { type: 'module' },
          );
      }
    },
  };
}
