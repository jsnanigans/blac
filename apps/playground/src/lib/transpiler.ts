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

export async function transpileTypeScript(code: string): Promise<TranspileResult> {
  try {
    await initializeTranspiler();
    
    // Remove import statements - they'll be provided by the sandbox
    const codeWithoutImports = code
      .replace(/import\s+\{[^}]+\}\s+from\s+['"]@blac\/core['"];?/g, '')
      .replace(/import\s+\{[^}]+\}\s+from\s+['"]@blac\/react['"];?/g, '')
      .replace(/import\s+.*?from\s+['"]react['"];?/g, '')
      .replace(/import\s+React\s+from\s+['"]react['"];?/g, '')
      .replace(/import\s+\*\s+as\s+React\s+from\s+['"]react['"];?/g, '')
      .replace(/export\s+function/g, 'function')
      .replace(/export\s+class/g, 'class')
      .replace(/export\s+const/g, 'const')
      .replace(/export\s+\{[^}]+\};?/g, '');
    
    const result = await esbuild.transform(codeWithoutImports, {
      loader: 'tsx',
      format: 'iife',
      target: 'es2020',
      jsx: 'transform',
      jsxFactory: 'React.createElement',
      jsxFragment: 'React.Fragment',
    });
    
    return { code: result.code };
  } catch (error) {
    return { 
      error: error instanceof Error ? error.message : 'Unknown transpilation error' 
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
      error: error instanceof Error ? error.message : 'Unknown bundling error' 
    };
  }
}