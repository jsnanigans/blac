/**
 * Complete Monaco setup for TypeScript/TSX support
 */

import { PlaygroundFile } from '@/lib/types';

// Import the type definitions
import {
  blacCoreTypes,
  blacReactTypes,
  reactTypes,
} from './monacoConfigWithTypes';

export function setupMonacoForTypeScript(monaco: any) {
  // Ensure TypeScript language is registered (Monaco uses 'typescript' for both .ts and .tsx)
  if (
    !monaco.languages
      .getLanguages()
      .some((lang: any) => lang.id === 'typescript')
  ) {
    console.error('TypeScript language not registered in Monaco');
    return;
  }

  // Configure compiler options FIRST before adding any type definitions
  const compilerOptions = {
    target: monaco.languages.typescript.ScriptTarget.ES2020,
    module: monaco.languages.typescript.ModuleKind.ESNext,
    lib: ['es2020', 'dom', 'dom.iterable', 'esnext'],
    jsx: monaco.languages.typescript.JsxEmit.React,
    jsxFactory: 'React.createElement',
    jsxFragmentFactory: 'React.Fragment',
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    allowNonTsExtensions: true,
    noEmit: true,
    skipLibCheck: true,
    allowJs: true,
    strict: false,
    resolveJsonModule: true,
    isolatedModules: true,
    noUnusedLocals: false,
    noUnusedParameters: false,
    noImplicitAny: false,
    strictNullChecks: false,
    forceConsistentCasingInFileNames: true,
    paths: {
      '@blac/core': ['file:///node_modules/@blac/core/index.d.ts'],
      '@blac/react': ['file:///node_modules/@blac/react/index.d.ts'],
      react: ['file:///node_modules/react/index.d.ts'],
    },
  };

  // Set compiler options BEFORE adding type definitions
  monaco.languages.typescript.typescriptDefaults.setCompilerOptions(
    compilerOptions,
  );
  monaco.languages.typescript.javascriptDefaults.setCompilerOptions(
    compilerOptions,
  );

  // Add type definitions
  const typeDefinitions = [
    {
      content: blacCoreTypes,
      filePath: 'file:///node_modules/@blac/core/index.d.ts',
    },
    {
      content: blacReactTypes,
      filePath: 'file:///node_modules/@blac/react/index.d.ts',
    },
    { content: reactTypes, filePath: 'file:///node_modules/react/index.d.ts' },
  ];

  typeDefinitions.forEach((lib) => {
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      lib.content,
      lib.filePath,
    );
    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      lib.content,
      lib.filePath,
    );
  });

  // Enable diagnostics
  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false,
  });

  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false,
  });

  // Set eager model sync for better performance
  monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);
  monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);

  // Define custom theme
  monaco.editor.defineTheme('blac-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: {
      'editor.background': '#09090b',
    },
  });

  console.log('Monaco TypeScript setup complete');
}

export function createMonacoModel(monaco: any, file: PlaygroundFile) {
  const uri = monaco.Uri.parse(`file:///${file.name}`);

  // Dispose existing model if it exists
  const existingModel = monaco.editor.getModel(uri);
  if (existingModel) {
    existingModel.dispose();
  }

  // Determine the correct language ID
  // IMPORTANT: Use 'typescript' for both .ts and .tsx files
  // Monaco determines JSX support from the file extension, not the language ID
  let languageId = 'plaintext';
  const ext = file.name.split('.').pop()?.toLowerCase();

  switch (ext) {
    case 'ts':
    case 'tsx':
      languageId = 'typescript';
      break;
    case 'js':
    case 'jsx':
      languageId = 'javascript';
      break;
    case 'json':
      languageId = 'json';
      break;
    case 'css':
      languageId = 'css';
      break;
    case 'html':
      languageId = 'html';
      break;
  }

  // Create the model with the correct language
  const model = monaco.editor.createModel(file.content, languageId, uri);

  console.log(
    `Created Monaco model for ${file.name} with language: ${languageId}`,
  );

  return model;
}

export function syncMonacoModels(monaco: any, files: PlaygroundFile[]) {
  // Create or update models for all files
  files.forEach((file) => {
    const uri = monaco.Uri.parse(`file:///${file.name}`);
    const existingModel = monaco.editor.getModel(uri);

    if (existingModel) {
      // Update content if it changed
      if (existingModel.getValue() !== file.content) {
        existingModel.setValue(file.content);
      }
    } else {
      // Create new model
      createMonacoModel(monaco, file);
    }
  });

  // Remove models for deleted files
  monaco.editor.getModels().forEach((model: any) => {
    const uri = model.uri.toString();
    if (uri.startsWith('file:///')) {
      const fileName = uri.replace('file:///', '');
      if (!files.find((f) => f.name === fileName)) {
        model.dispose();
      }
    }
  });
}

// Debug helper to check Monaco state
export function debugMonacoState(monaco: any, editorInstance: any) {
  const model = editorInstance.getModel();
  if (model) {
    const language = model.getLanguageId();
    const uri = model.uri.toString();
    console.log('Current editor state:', {
      language,
      uri,
      availableLanguages: monaco.languages.getLanguages().map((l: any) => l.id),
      typescriptDefaults: {
        compilerOptions:
          monaco.languages.typescript.typescriptDefaults.getCompilerOptions(),
        extraLibs:
          monaco.languages.typescript.typescriptDefaults.getExtraLibs(),
      },
    });
  }
}
