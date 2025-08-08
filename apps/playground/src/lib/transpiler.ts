import * as esbuild from 'esbuild-wasm';

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
