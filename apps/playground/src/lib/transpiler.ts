import * as esbuild from 'esbuild-wasm';
import { PlaygroundFile } from './types';

let isInitialized = false;

export async function initializeTranspiler() {
  if (isInitialized) return;

  await esbuild.initialize({
    wasmURL: 'https://unpkg.com/esbuild-wasm@0.25.8/esbuild.wasm',
  });

  isInitialized = true;
}

export interface TranspileResult {
  code?: string;
  error?: string;
}

export async function transpileTypeScript(
  code: string,
): Promise<TranspileResult> {
  try {
    await initializeTranspiler();

    // Remove import statements - they'll be provided by the sandbox
    let codeWithoutImports = code
      .replace(/import\s+\{[^}]+\}\s+from\s+['"]@blac\/core['"];?/g, '')
      .replace(/import\s+\{[^}]+\}\s+from\s+['"]@blac\/react['"];?/g, '')
      .replace(
        /import\s+\{[^}]+\}\s+from\s+['"]@blac\/plugin-[^'"\n]+['"];?/g,
        '',
      )
      .replace(/import\s+[^;]+from\s+['"]@\/[^'"\n]+['"];?/g, '')
      .replace(/import\s+.*?from\s+['"]react['"];?/g, '')
      .replace(/import\s+React\s+from\s+['"]react['"];?/g, '')
      .replace(/import\s+\*\s+as\s+React\s+from\s+['"]react['"];?/g, '')
      .replace(/export\s+function/g, 'function')
      .replace(/export\s+class/g, 'class')
      .replace(/export\s+const/g, 'const')
      .replace(/export\s+\{[^}]+\};?/g, '');

    // Inject shims for plugins if referenced
    const preludeLines: string[] = [];
    if (/\bPersistencePlugin\b/.test(codeWithoutImports)) {
      preludeLines.push(
        'const { PersistencePlugin } = (window as any).BlacPlugins || {};',
      );
    }

    // UI shims for '@/ui/*' components used in demos
    preludeLines.push(`
// --- UI Shims (for '@/ui/*' components) ---
const __cx = (a, b) => [a, b].filter(Boolean).join(' ');
function Card(props){ const {className, ...rest}=props; return React.createElement('div',{...rest,className:__cx('border rounded-md bg-white dark:bg-zinc-900',className)},props.children); }
function CardContent(props){ const {className, ...rest}=props; return React.createElement('div',{...rest,className:__cx('p-4',className)},props.children); }
function CardHeader(props){ const {className, ...rest}=props; return React.createElement('div',{...rest,className:__cx('p-4 border-b',className)},props.children); }
function CardTitle(props){ const {className, ...rest}=props; return React.createElement('h3',{...rest,className:__cx('text-lg font-semibold',className)},props.children); }
function Button(props){ const {className, ...rest}=props; return React.createElement('button',{...rest,className:__cx('px-3 py-1.5 rounded bg-gray-200 dark:bg-gray-700 hover:opacity-90',className)},props.children); }
function Badge(props){ const {className, ...rest}=props; return React.createElement('span',{...rest,className:__cx('inline-flex items-center px-2 py-0.5 text-xs rounded border',className)},props.children); }
function Callout(props){ const {className, title, ...rest}=props; return React.createElement('div',{...rest,className:__cx('p-3 rounded border bg-yellow-50 dark:bg-yellow-900/20',className)}, title?React.createElement('div',null,React.createElement('strong',null,title),props.children):props.children ); }
function Section(props){ const {className, ...rest}=props; return React.createElement('section',{...rest,className:__cx('space-y-2',className)},props.children); }
`);

    if (preludeLines.length > 0) {
      codeWithoutImports = `${preludeLines.join('\n')}\n\n${codeWithoutImports}`;
    }

    // Don't use IIFE format, just transform the syntax
    const result = await esbuild.transform(codeWithoutImports, {
      loader: 'tsx',
      target: 'es2020',
      jsx: 'transform',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
    });

    return { code: result.code };
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : 'Unknown transpilation error',
    };
  }
}

export async function bundleCode(code: string): Promise<TranspileResult> {
  try {
    await initializeTranspiler();

    const result = await esbuild.build({
      stdin: {
        contents: code,
        loader: 'tsx',
        resolveDir: '.',
      },
      bundle: true,
      format: 'esm',
      target: 'es2020',
      jsx: 'automatic',
      jsxImportSource: 'react',
      write: false,
      external: ['react', 'react-dom', '@blac/core', '@blac/react'],
    });

    const outputCode = result.outputFiles?.[0]?.text;
    if (!outputCode) {
      return { error: 'No output generated' };
    }

    return { code: outputCode };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown bundling error',
    };
  }
}

export async function transpileMultipleFiles(
  files: PlaygroundFile[],
): Promise<TranspileResult> {
  try {
    await initializeTranspiler();

    // Create a virtual file system for esbuild
    const virtualFiles: Record<string, string> = {};
    let mainFile = '';
    let cssContent = '';
    
    // First, collect all CSS content
    for (const file of files) {
      if (file.language === 'css') {
        cssContent += `\n/* ${file.name} */\n${file.content}\n`;
      }
    }
    
    // Process each file
    for (const file of files) {
      const fileName = file.name.startsWith('./') ? file.name : `./${file.name}`;
      
      if (file.language !== 'css') {
        // Process TypeScript/JavaScript files
        let processedContent = file.content;
        
        // Remove CSS imports since we'll inject CSS globally
        processedContent = processedContent
          .replace(/import\s+['"]\.\/[^'"]+\.css['"];?/g, '')
          .replace(/import\s+['"][^'"]+\.css['"];?/g, '');
        
        // Remove external imports that will be provided by sandbox
        processedContent = processedContent
          .replace(/import\s+\{[^}]+\}\s+from\s+['"]@blac\/core['"];?/g, '')
          .replace(/import\s+\{[^}]+\}\s+from\s+['"]@blac\/react['"];?/g, '')
          .replace(/import\s+\{[^}]+\}\s+from\s+['"]@blac\/plugin-[^'"\n]+['"];?/g, '')
          .replace(/import\s+.*?from\s+['"]react['"];?/g, '')
          .replace(/import\s+React\s+from\s+['"]react['"];?/g, '')
          .replace(/import\s+\*\s+as\s+React\s+from\s+['"]react['"];?/g, '');
        
        virtualFiles[fileName] = processedContent;
      }
      
      // Determine main file (first tsx/jsx file or App.tsx)
      if (!mainFile && (file.name.endsWith('.tsx') || file.name.endsWith('.jsx'))) {
        mainFile = fileName;
      }
      if (file.name === 'App.tsx' || file.name === 'App.jsx') {
        mainFile = fileName;
      }
    }

    if (!mainFile) {
      return { error: 'No main TypeScript/JavaScript file found' };
    }

    // Process main file to expose exports to window
    let mainContent = virtualFiles[mainFile];
    
    // Replace export statements to make components available globally
    mainContent = mainContent
      .replace(/export\s+function\s+(\w+)/g, 'function $1')
      .replace(/export\s+const\s+(\w+)/g, 'const $1')
      .replace(/export\s+class\s+(\w+)/g, 'class $1');
    
    // Add window assignments after function/class declarations
    const componentNames = mainContent.match(/(?:function|class)\s+(\w+)/g) || [];
    const windowAssignments = componentNames
      .map(match => {
        const name = match.replace(/(?:function|class)\s+/, '');
        return `window.${name} = ${name};`;
      })
      .join('\n');

    // Create entry point that imports all files
    const entryContent = `
// UI Shims
const __cx = (a, b) => [a, b].filter(Boolean).join(' ');
window.Card = function Card(props){ const {className, ...rest}=props; return React.createElement('div',{...rest,className:__cx('border rounded-md bg-white dark:bg-zinc-900',className)},props.children); }
window.CardContent = function CardContent(props){ const {className, ...rest}=props; return React.createElement('div',{...rest,className:__cx('p-4',className)},props.children); }
window.CardHeader = function CardHeader(props){ const {className, ...rest}=props; return React.createElement('div',{...rest,className:__cx('p-4 border-b',className)},props.children); }
window.CardTitle = function CardTitle(props){ const {className, ...rest}=props; return React.createElement('h3',{...rest,className:__cx('text-lg font-semibold',className)},props.children); }
window.Button = function Button(props){ const {className, ...rest}=props; return React.createElement('button',{...rest,className:__cx('px-3 py-1.5 rounded bg-gray-200 dark:bg-gray-700 hover:opacity-90',className)},props.children); }
window.Badge = function Badge(props){ const {className, ...rest}=props; return React.createElement('span',{...rest,className:__cx('inline-flex items-center px-2 py-0.5 text-xs rounded border',className)},props.children); }

${mainContent}

// Make components available globally
${windowAssignments}
`;

    // Build with esbuild using virtual file system
    const result = await esbuild.build({
      stdin: {
        contents: entryContent,
        loader: mainFile.endsWith('.tsx') ? 'tsx' : 'jsx',
        resolveDir: '.',
      },
      plugins: [
        {
          name: 'virtual-files',
          setup(build) {
            // Resolve virtual files
            build.onResolve({ filter: /^\.\/.*/ }, (args) => {
              // Skip CSS files
              if (args.path.endsWith('.css')) {
                return { path: args.path, external: true };
              }
              return {
                path: args.path,
                namespace: 'virtual',
              };
            });
            
            // Load virtual files
            build.onLoad({ filter: /.*/, namespace: 'virtual' }, (args) => {
              const content = virtualFiles[args.path];
              if (!content) {
                return { errors: [{ text: `File not found: ${args.path}` }] };
              }
              
              const loader = args.path.endsWith('.tsx') ? 'tsx' :
                           args.path.endsWith('.jsx') ? 'jsx' :
                           args.path.endsWith('.ts') ? 'ts' :
                           args.path.endsWith('.js') ? 'js' :
                           args.path.endsWith('.json') ? 'json' : 'text';
              
              return { contents: content, loader };
            });
          },
        },
      ],
      bundle: true,
      format: 'iife',
      target: 'es2020',
      jsx: 'transform',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
      write: false,
      minify: false,
    });

    const outputCode = result.outputFiles?.[0]?.text;
    if (!outputCode) {
      return { error: 'No output generated' };
    }

    // Inject CSS if any
    let finalCode = outputCode;
    if (cssContent) {
      finalCode = `
(function() {
  const style = document.createElement('style');
  style.textContent = ${JSON.stringify(cssContent)};
  document.head.appendChild(style);
})();
${outputCode}
`;
    }

    return { code: finalCode };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Unknown bundling error',
    };
  }
}
