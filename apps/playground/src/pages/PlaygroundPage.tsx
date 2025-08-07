import React from 'react';
import Editor from '@monaco-editor/react';
import { Play, Save, Share2, Download, RotateCcw } from 'lucide-react';
import { configureMonaco } from '../core/utils/monacoConfig';
import { transpileTypeScript } from '../lib/transpiler';
import { createSandbox } from '../lib/sandbox';

export function PlaygroundPage() {
  const [code, setCode] = React.useState(`import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import React from 'react';

// Create your own Cubit
class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };

  decrement = () => {
    this.emit(this.state - 1);
  };

  reset = () => {
    this.emit(0);
  };
}

// Create a React component that uses the Cubit
export function Counter() {
  const [count, counterCubit] = useBloc(CounterCubit);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Counter: {count}</h2>
      <div className="flex gap-2">
        <button 
          onClick={counterCubit.increment}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Increment
        </button>
        <button 
          onClick={counterCubit.decrement}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Decrement
        </button>
        <button 
          onClick={counterCubit.reset}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Reset
        </button>
      </div>
    </div>
  );
}`);

  const [output, setOutput] = React.useState<string[]>(['> Ready']);
  const [isRunning, setIsRunning] = React.useState(false);
  const [preview, setPreview] = React.useState<React.ReactNode>(null);
  const [theme, setTheme] = React.useState<'blac-dark' | 'light'>('blac-dark');
  const previewRef = React.useRef<HTMLDivElement>(null);
  const rootRef = React.useRef<any>(null);

  // Check for dark mode
  React.useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'blac-dark' : 'light');

    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'blac-dark' : 'light');
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  const handleRun = async () => {
    setIsRunning(true);
    setOutput(prev => [...prev, '> Running...']);
    
    try {
      // Clean up any existing BlaC instances
      if ((window as any).BlacCore?.Blac?.reset) {
        (window as any).BlacCore.Blac.reset();
        setOutput(prev => [...prev, '> Cleaned up previous BlaC instances']);
      }
      // Step 1: Transpile TypeScript to JavaScript
      setOutput(prev => [...prev, '> Transpiling TypeScript...']);
      const transpileResult = await transpileTypeScript(code);
      
      if (transpileResult.error) {
        setOutput(prev => [...prev, `✗ Transpilation error: ${transpileResult.error}`]);
        setIsRunning(false);
        return;
      }
      
      setOutput(prev => [...prev, '✓ Transpilation successful']);
      
      // Step 2: Execute in sandbox
      setOutput(prev => [...prev, '> Executing code...']);
      const sandbox = createSandbox();
      const result = await sandbox.execute(transpileResult.code!, 'preview-container');
      
      // Add console logs to output
      result.logs.forEach(log => {
        setOutput(prev => [...prev, log]);
      });
      
      if (result.success) {
        setOutput(prev => [...prev, '✓ Code executed successfully']);
        
        // Check if a component was returned
        if (result.component) {
          setOutput(prev => [...prev, '✓ Component detected and rendering...']);
          
          // Clean up previous React root if it exists
          if (rootRef.current) {
            rootRef.current.unmount();
            rootRef.current = null;
          }
          
          // Render the component
          const Component = result.component;
          setPreview(
            <div ref={previewRef} className="w-full h-full">
              <Component />
            </div>
          );
        } else {
          // No component found, show success message with hint
          setOutput(prev => [...prev, '⚠ No component found to render']);
          setPreview(
            <div className="text-center p-8">
              <p className="text-lg mb-4 text-green-600 dark:text-green-400">
                ✓ Code executed successfully!
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                No React component found. Define a component named: Counter, App, Component, Demo, Example, or Main.
              </p>
              <div className="text-left bg-zinc-900 dark:bg-zinc-900 text-zinc-100 p-4 rounded-lg font-mono text-xs">
                <p className="text-zinc-400 mb-2">// Example:</p>
                <p>function Counter() {'{'}</p>
                <p className="ml-4">const [count, counterCubit] = useBloc(CounterCubit);</p>
                <p className="ml-4">return {'<div>Count: {count}</div>'};</p>
                <p>{'}'}</p>
              </div>
            </div>
          );
        }
      } else {
        setOutput(prev => [...prev, `✗ Execution error: ${result.error}`]);
        setPreview(
          <div className="text-center p-8">
            <p className="text-lg mb-4 text-red-600 dark:text-red-400">
              ✗ Execution failed
            </p>
            <p className="text-sm text-muted-foreground">
              {result.error}
            </p>
          </div>
        );
      }
      
      sandbox.cleanup();
      setIsRunning(false);
    } catch (error) {
      setOutput(prev => [...prev, `✗ Error: ${error}`]);
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setCode(`import { Cubit } from '@blac/core';
import { useBloc } from '@blac/react';
import React from 'react';

// Create your own Cubit
class CounterCubit extends Cubit<number> {
  constructor() {
    super(0);
  }

  increment = () => {
    this.emit(this.state + 1);
  };

  decrement = () => {
    this.emit(this.state - 1);
  };

  reset = () => {
    this.emit(0);
  };
}

// Create a React component that uses the Cubit
export function Counter() {
  const [count, counterCubit] = useBloc(CounterCubit);

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Counter: {count}</h2>
      <div className="flex gap-2">
        <button 
          onClick={counterCubit.increment}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Increment
        </button>
        <button 
          onClick={counterCubit.decrement}
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Decrement
        </button>
        <button 
          onClick={counterCubit.reset}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          Reset
        </button>
      </div>
    </div>
  );
}`);
    setOutput(['> Reset to default code']);
    setPreview(null);
  };

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('playground-code', code);
    setOutput(prev => [...prev, '> Code saved to browser storage']);
  };

  const handleShare = () => {
    // In a real implementation, this would create a shareable link
    setOutput(prev => [...prev, '> Share functionality coming soon']);
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'blac-playground.tsx';
    a.click();
    URL.revokeObjectURL(url);
    setOutput(prev => [...prev, '> Code downloaded']);
  };

  // Load saved code on mount
  React.useEffect(() => {
    const saved = localStorage.getItem('playground-code');
    if (saved) {
      setCode(saved);
      setOutput(['> Loaded saved code from browser storage']);
    }
  }, []);

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Toolbar */}
      <div className="border-b px-4 py-2 flex items-center justify-between bg-background">
        <div className="flex items-center gap-2">
          <button 
            onClick={handleRun}
            disabled={isRunning}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4"
          >
            <Play className="h-4 w-4 mr-2" />
            {isRunning ? 'Running...' : 'Run'}
          </button>
          <button 
            onClick={handleReset}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-input hover:bg-accent hover:text-accent-foreground h-9 px-4"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSave}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background hover:bg-accent hover:text-accent-foreground h-9 w-9"
          >
            <Save className="h-4 w-4" />
            <span className="sr-only">Save</span>
          </button>
          <button 
            onClick={handleShare}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background hover:bg-accent hover:text-accent-foreground h-9 w-9"
          >
            <Share2 className="h-4 w-4" />
            <span className="sr-only">Share</span>
          </button>
          <button 
            onClick={handleDownload}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background hover:bg-accent hover:text-accent-foreground h-9 w-9"
          >
            <Download className="h-4 w-4" />
            <span className="sr-only">Download</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Editor */}
        <div className="flex-1 border-r">
          <Editor
            height="100%"
            language="typescript"
            path="playground.tsx"
            theme={theme}
            value={code}
            onChange={(value) => setCode(value || '')}
            beforeMount={(monaco) => {
              // Initialize Monaco with BlaC types
              configureMonaco(monaco);
            }}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              roundedSelection: false,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on',
              padding: { top: 16, bottom: 16 },
            }}
          />
        </div>

        {/* Preview & Console */}
        <div className="flex-1 flex flex-col">
          {/* Preview */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Preview</h3>
              <p className="text-sm text-muted-foreground">
                Your component will render here when you click Run.
              </p>
            </div>
            
            <div className="border rounded-lg p-4 min-h-[200px] bg-card">
              {preview || (
                <p className="text-center text-muted-foreground">
                  Click "Run" to execute your code
                </p>
              )}
            </div>
          </div>

          {/* Console */}
          <div className="border-t p-4">
            <h3 className="text-sm font-semibold mb-2">Console</h3>
            <div className="border rounded-lg p-3 h-32 overflow-y-auto bg-zinc-950 dark:bg-zinc-950 text-zinc-100 font-mono text-xs">
              {output.map((line, i) => (
                <div key={i} className={line.startsWith('>') ? 'text-zinc-500' : line.startsWith('✓') ? 'text-green-400' : line.startsWith('✗') ? 'text-red-400' : 'text-zinc-100'}>
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}