import { Card } from '@/ui/Card';
import Editor from '@monaco-editor/react';
import {
  Activity,
  Download,
  PanelsLeftRight,
  Play,
  RotateCcw,
  Save,
  Share2,
} from 'lucide-react';
import React from 'react';
import { PerformanceMonitorPanel } from '../components/PerformanceMonitor';
import { FileTabs } from '../components/FileTabs';
import { configureMonaco } from '../core/utils/monacoConfig';
import { createSandbox } from '../lib/sandbox';
import { transpileMultipleFiles } from '../lib/transpiler';

import { 
  PlaygroundFile, 
  DEFAULT_FILES, 
  createFile, 
  getFileLanguage 
} from '../lib/types';

export function PlaygroundPageMultiFile() {
  const [files, setFiles] = React.useState<PlaygroundFile[]>(DEFAULT_FILES);
  const [activeFileId, setActiveFileId] = React.useState<string>(DEFAULT_FILES[0].id);
  const [output, setOutput] = React.useState<string[]>(['> Ready']);
  const [isRunning, setIsRunning] = React.useState(false);
  const [preview, setPreview] = React.useState<React.ReactNode>(null);
  const [theme, setTheme] = React.useState<'blac-dark' | 'light'>('blac-dark');
  const [activeTab, setActiveTab] = React.useState<'preview' | 'performance'>(
    'preview',
  );
  const [split, setSplit] = React.useState<number>(() => {
    const stored = localStorage.getItem('playground-split');
    return stored ? Number(stored) : 50;
  });
  const dragRef = React.useRef<HTMLDivElement | null>(null);
  const previewRef = React.useRef<HTMLDivElement>(null);
  const rootRef = React.useRef<any>(null);

  // Get active file
  const activeFile = React.useMemo(
    () => files.find(f => f.id === activeFileId) || files[0],
    [files, activeFileId]
  );

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

  const handleFileContentChange = (content: string) => {
    setFiles(prev => prev.map(f => 
      f.id === activeFileId ? { ...f, content } : f
    ));
  };

  const handleAddFile = () => {
    const fileCount = files.filter(f => f.name.startsWith('file')).length;
    const newFile = createFile(`file${fileCount + 1}.tsx`, '// New file\n');
    setFiles(prev => [...prev, newFile]);
    setActiveFileId(newFile.id);
  };

  const handleCloseFile = (fileId: string) => {
    if (files.length <= 1) return;
    
    const fileIndex = files.findIndex(f => f.id === fileId);
    const newFiles = files.filter(f => f.id !== fileId);
    setFiles(newFiles);
    
    if (activeFileId === fileId) {
      const newActiveIndex = Math.min(fileIndex, newFiles.length - 1);
      setActiveFileId(newFiles[newActiveIndex].id);
    }
  };

  const handleRenameFile = (fileId: string, newName: string) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId 
        ? { ...f, name: newName, language: getFileLanguage(newName) } 
        : f
    ));
  };

  const handleRun = async () => {
    setIsRunning(true);
    setOutput((prev) => [...prev, '> Running...']);

    try {
      // COMPLETE RESET - Clear everything from previous run
      
      // 1. Clear preview first
      setPreview(null);
      
      // 2. Unmount any existing React root
      if (rootRef.current) {
        rootRef.current.unmount();
        rootRef.current = null;
      }
      
      // 3. Clean up any existing BlaC instances
      if ((window as any).BlacCore?.Blac?.resetInstance) {
        (window as any).BlacCore.Blac.resetInstance();
        setOutput((prev) => [...prev, '> Cleaned up previous BlaC instances']);
      }
      
      // 4. Remove any injected styles from previous runs
      const existingStyles = document.querySelectorAll('style[data-playground]');
      existingStyles.forEach(style => style.remove());
      
      // 5. Clear any global window properties from previous runs
      const componentNames = ['Counter', 'App', 'Component', 'Demo', 'Example', 'Main', 
                              'TodoDemo', 'AsyncDemo', 'StreamDemo', 'SelectorsDemo'];
      componentNames.forEach(name => {
        if ((window as any)[name]) {
          delete (window as any)[name];
        }
      });
      
      // Transpile all files
      setOutput((prev) => [...prev, '> Transpiling files...']);
      const transpileResult = await transpileMultipleFiles(files);

      if (transpileResult.error) {
        setOutput((prev) => [
          ...prev,
          `✗ Transpilation error: ${transpileResult.error}`,
        ]);
        setIsRunning(false);
        return;
      }

      setOutput((prev) => [...prev, '✓ Transpilation successful']);

      // Execute in sandbox
      setOutput((prev) => [...prev, '> Executing code...']);
      const sandbox = createSandbox();
      const result = await sandbox.execute(
        transpileResult.code!,
        'preview-container',
      );

      // Add console logs to output
      result.logs.forEach((log) => {
        setOutput((prev) => [...prev, log]);
      });

      if (result.success) {
        setOutput((prev) => [...prev, '✓ Code executed successfully']);

        if (result.component) {
          setOutput((prev) => [
            ...prev,
            '✓ Component detected and rendering...',
          ]);

          // Force a new key to ensure complete re-render
          const Component = result.component;
          setPreview(
            <div key={Date.now()} ref={previewRef} className="w-full h-full">
              <Component />
            </div>,
          );
        } else {
          setOutput((prev) => [...prev, '⚠ No component found to render']);
          setPreview(
            <div className="text-center p-8">
              <p className="text-lg mb-4 text-green-600 dark:text-green-400">
                ✓ Code executed successfully!
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                No React component found. Export a component named: Counter,
                App, Component, Demo, Example, or Main.
              </p>
            </div>,
          );
        }
      } else {
        setOutput((prev) => [...prev, `✗ Execution error: ${result.error}`]);
        setPreview(
          <div className="text-center p-8">
            <p className="text-lg mb-4 text-red-600 dark:text-red-400">
              ✗ Execution failed
            </p>
            <p className="text-sm text-muted-foreground">{result.error}</p>
          </div>,
        );
      }

      sandbox.cleanup();
      setIsRunning(false);
    } catch (error) {
      setOutput((prev) => [...prev, `✗ Error: ${error}`]);
      setIsRunning(false);
    }
  };

  const handleReset = () => {
    setFiles(DEFAULT_FILES);
    setActiveFileId(DEFAULT_FILES[0].id);
    setOutput(['> Reset to default code']);
    setPreview(null);
  };

  const handleSave = () => {
    // Save to localStorage
    localStorage.setItem('playground-files', JSON.stringify(files));
    localStorage.setItem('playground-active-file', activeFileId);
    setOutput((prev) => [...prev, '> Files saved to browser storage']);
  };

  const handleShare = () => {
    // Create shareable link with all files
    const data = {
      files: files.map(f => ({ name: f.name, content: f.content })),
      activeFile: files.find(f => f.id === activeFileId)?.name,
    };
    const encoded = btoa(encodeURIComponent(JSON.stringify(data)));
    const url = `${window.location.origin}${window.location.pathname}?code=${encoded}`;
    navigator.clipboard.writeText(url);
    setOutput((prev) => [...prev, '> Share link copied to clipboard']);
  };

  const handleDownload = () => {
    // Download all files as a zip or the active file
    const activeFile = files.find(f => f.id === activeFileId);
    if (activeFile) {
      const blob = new Blob([activeFile.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = activeFile.name;
      a.click();
      URL.revokeObjectURL(url);
      setOutput((prev) => [...prev, `> Downloaded ${activeFile.name}`]);
    }
  };

  // Load saved files on mount
  React.useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const encoded = params.get('code');
      
      if (encoded) {
        try {
          const decoded = JSON.parse(decodeURIComponent(atob(encoded)));
          if (decoded.files && Array.isArray(decoded.files)) {
            const loadedFiles = decoded.files.map((f: any) => 
              createFile(f.name, f.content)
            );
            setFiles(loadedFiles);
            if (decoded.activeFile) {
              const activeFile = loadedFiles.find((f: PlaygroundFile) => f.name === decoded.activeFile);
              if (activeFile) {
                setActiveFileId(activeFile.id);
              }
            }
            setOutput(['> Loaded shared code']);
            return;
          }
        } catch (e) {
          console.error('Failed to load shared code:', e);
        }
      }

      // Try to load from localStorage
      const savedFiles = localStorage.getItem('playground-files');
      const savedActiveFile = localStorage.getItem('playground-active-file');
      
      if (savedFiles) {
        try {
          const parsed = JSON.parse(savedFiles);
          setFiles(parsed);
          if (savedActiveFile) {
            setActiveFileId(savedActiveFile);
          }
          setOutput(['> Loaded saved files from browser storage']);
        } catch (e) {
          console.error('Failed to load saved files:', e);
        }
      }
    })();
  }, []);

  // Draggable splitter
  React.useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const container = dragRef.current.parentElement as HTMLDivElement | null;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const percent = Math.min(
        80,
        Math.max(20, ((e.clientX - rect.left) / rect.width) * 100),
      );
      setSplit(percent);
      localStorage.setItem('playground-split', String(percent));
    };
    const stop = () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', stop);
      document.body.style.cursor = '';
    };
    const start = () => {
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', stop);
      document.body.style.cursor = 'col-resize';
    };
    const handle = dragRef.current;
    if (handle) handle.addEventListener('mousedown', start);
    return () => {
      if (handle) handle.removeEventListener('mousedown', start);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', stop);
    };
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
          <div className="text-xs text-muted-foreground hidden md:flex items-center gap-1 border rounded px-2 py-1">
            <PanelsLeftRight className="h-3.5 w-3.5" />
            Drag divider to resize
          </div>
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
        <div className="border-r flex flex-col" style={{ width: `${split}%` }}>
          {/* File Tabs */}
          <FileTabs
            files={files}
            activeFileId={activeFileId}
            onSelectFile={setActiveFileId}
            onAddFile={handleAddFile}
            onCloseFile={handleCloseFile}
            onRenameFile={handleRenameFile}
          />
          
          {/* Monaco Editor */}
          <div className="flex-1">
            <Editor
              height="100%"
              language={activeFile.language}
              path={activeFile.name}
              theme={theme}
              value={activeFile.content}
              onChange={(value) => handleFileContentChange(value || '')}
              beforeMount={(monaco) => {
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
        </div>

        {/* Drag handle */}
        <div
          ref={dragRef}
          className="w-1 cursor-col-resize bg-border hover:bg-primary/40 transition-colors"
        />

        {/* Preview & Console */}
        <div
          className="flex-1 flex flex-col"
          style={{ width: `${100 - split}%` }}
        >
          {/* Tab Navigation */}
          <div className="border-b px-4">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('preview')}
                className={`py-2 px-1 border-b-2 transition-colors ${
                  activeTab === 'preview'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                Preview
              </button>
              <button
                onClick={() => setActiveTab('performance')}
                className={`py-2 px-1 border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'performance'
                    ? 'border-primary text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <Activity className="h-4 w-4" />
                Performance
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto">
            {activeTab === 'preview' ? (
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">Preview</h3>
                  <p className="text-sm text-muted-foreground">
                    Your component will render here when you click Run.
                  </p>
                </div>

                <Card className="p-4 min-h-[200px]">
                  {preview || (
                    <p className="text-center text-muted-foreground">
                      Click "Run" to execute your code
                    </p>
                  )}
                </Card>
              </div>
            ) : (
              <div className="p-6">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold mb-2">
                    Performance Monitor
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Track state updates, render counts, and memory usage.
                  </p>
                </div>

                <PerformanceMonitorPanel />
              </div>
            )}
          </div>

          {/* Console */}
          <div className="border-t p-4">
            <h3 className="text-sm font-semibold mb-2">Console</h3>
            <div className="border rounded-lg p-3 h-32 overflow-y-auto bg-zinc-950 dark:bg-zinc-950 text-zinc-100 font-mono text-xs">
              {output.map((line, i) => (
                <div
                  key={i}
                  className={
                    line.startsWith('>')
                      ? 'text-zinc-500'
                      : line.startsWith('✓')
                        ? 'text-green-400'
                        : line.startsWith('✗')
                          ? 'text-red-400'
                          : 'text-zinc-100'
                  }
                >
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