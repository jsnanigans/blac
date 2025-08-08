/**
 * Enhanced Monaco configuration for proper TSX/TypeScript support
 */

import { PlaygroundFile } from '@/lib/types';

export function setupMonacoLanguageServices(
  monaco: any,
  files: PlaygroundFile[],
) {
  // Ensure TypeScript language features are available for all file types
  const tsWorkerSrc =
    'https://unpkg.com/monaco-editor@0.45.0/min/vs/language/typescript/tsWorker.js';

  // Configure the TypeScript worker
  (self as any).MonacoEnvironment = {
    getWorker: function (_: any, label: string) {
      if (label === 'typescript' || label === 'javascript') {
        return new Worker(tsWorkerSrc, { type: 'module' });
      }
      return new Worker(
        'https://unpkg.com/monaco-editor@0.45.0/min/vs/editor/editor.worker.js',
        { type: 'module' },
      );
    },
  };

  // Set up models for all files with proper language detection
  files.forEach((file) => {
    const uri = monaco.Uri.parse(`file:///${file.name}`);
    const existingModel = monaco.editor.getModel(uri);

    if (existingModel) {
      existingModel.dispose();
    }

    // Determine the correct language
    let language = 'typescript';
    if (file.name.endsWith('.tsx')) {
      language = 'typescriptreact';
    } else if (file.name.endsWith('.jsx')) {
      language = 'javascriptreact';
    } else if (file.name.endsWith('.js')) {
      language = 'javascript';
    }

    // Create the model with the correct language
    monaco.editor.createModel(file.content, language, uri);
  });

  // Enable TypeScript language features
  monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
  monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);

  // Set up module resolution
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
    ...monaco.languages.typescript.typescriptDefaults.getCompilerOptions(),
    paths: {
      '@blac/core': ['file:///node_modules/@blac/core/index.d.ts'],
      '@blac/react': ['file:///node_modules/@blac/react/index.d.ts'],
      react: ['file:///node_modules/react/index.d.ts'],
    },
    baseUrl: 'file:///',
  });
}

export function ensureTsxHighlighting(monaco: any) {
  // Register TSX token provider if not already registered
  if (
    !monaco.languages
      .getLanguages()
      .some((lang: any) => lang.id === 'typescriptreact')
  ) {
    monaco.languages.register({ id: 'typescriptreact', extensions: ['.tsx'] });
  }

  // Ensure syntax highlighting for JSX elements
  monaco.languages.setLanguageConfiguration('typescriptreact', {
    wordPattern:
      /(-?\d*\.\d\w*)|([^\`\~\!\@\#\%\^\&\*\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s]+)/g,
    comments: {
      lineComment: '//',
      blockComment: ['/*', '*/'],
    },
    brackets: [
      ['{', '}'],
      ['[', ']'],
      ['(', ')'],
      ['<', '>'],
    ],
    onEnterRules: [
      {
        beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
        afterText: /^\s*\*\/$/,
        action: {
          indentAction: monaco.languages.IndentAction.IndentOutdent,
          appendText: ' * ',
        },
      },
      {
        beforeText: /^\s*\/\*\*(?!\/)([^\*]|\*(?!\/))*$/,
        action: {
          indentAction: monaco.languages.IndentAction.None,
          appendText: ' * ',
        },
      },
      {
        beforeText: /^(\t|(\ \ ))*\ \*(\ ([^\*]|\*(?!\/))*)?$/,
        action: {
          indentAction: monaco.languages.IndentAction.None,
          appendText: '* ',
        },
      },
      {
        beforeText: /^(\t|(\ \ ))*\ \*\/\s*$/,
        action: {
          indentAction: monaco.languages.IndentAction.None,
          removeText: 1,
        },
      },
      {
        beforeText: /^(\t|(\ \ ))*\ \*[^/]*\*\/\s*$/,
        action: {
          indentAction: monaco.languages.IndentAction.None,
          removeText: 1,
        },
      },
      {
        beforeText: /<(\w+)([^>]*)>$/,
        afterText: /^<\/(\w+)>/,
        action: {
          indentAction: monaco.languages.IndentAction.IndentOutdent,
        },
      },
    ],
    autoClosingPairs: [
      { open: '{', close: '}' },
      { open: '[', close: ']' },
      { open: '(', close: ')' },
      { open: '"', close: '"', notIn: ['string'] },
      { open: "'", close: "'", notIn: ['string', 'comment'] },
      { open: '`', close: '`', notIn: ['string', 'comment'] },
      { open: '/**', close: ' */', notIn: ['string'] },
      { open: '<', close: '>' },
    ],
    folding: {
      markers: {
        start: new RegExp('^\\s*//\\s*#?region\\b'),
        end: new RegExp('^\\s*//\\s*#?endregion\\b'),
      },
    },
  });
}
