import { PlaygroundFile } from '@/lib/types';

export function setupVirtualFileSystem(monaco: any, files: PlaygroundFile[]) {
  // Create models for all files
  files.forEach((file) => {
    const uri = monaco.Uri.parse(`file:///${file.name}`);
    let model = monaco.editor.getModel(uri);

    if (!model) {
      const languageId = getMonacoLanguage(file.name);
      model = monaco.editor.createModel(file.content, languageId, uri);
    } else {
      // Update existing model
      if (model.getValue() !== file.content) {
        model.setValue(file.content);
      }
    }
  });

  // Clean up models for deleted files
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

export function getMonacoLanguage(fileName: string): string {
  if (fileName.endsWith('.tsx')) return 'typescriptreact';
  if (fileName.endsWith('.ts')) return 'typescript';
  if (fileName.endsWith('.jsx')) return 'javascriptreact';
  if (fileName.endsWith('.js')) return 'javascript';
  if (fileName.endsWith('.json')) return 'json';
  if (fileName.endsWith('.css')) return 'css';
  if (fileName.endsWith('.html')) return 'html';
  if (fileName.endsWith('.md')) return 'markdown';
  return 'plaintext';
}

export function updateMonacoModels(monaco: any, files: PlaygroundFile[]) {
  setupVirtualFileSystem(monaco, files);
}
