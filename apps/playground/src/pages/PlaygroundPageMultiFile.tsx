import { SplitPane } from '@/components/shared/SplitPane';
import {
  WorkspaceToolbar,
  WorkspaceToolbarGroup,
  WorkspaceToolbarLabel,
} from '@/components/workspace/WorkspaceToolbar';
import { Card } from '@/ui/Card';
import { cn } from '@/lib/utils';
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
import {
  setupMonacoForTypeScript,
  syncMonacoModels,
  debugMonacoState,
} from '../core/utils/monacoSetup';
import { createSandbox } from '../lib/sandbox';
import { transpileMultipleFiles } from '../lib/transpiler';
import { getDemoCode } from '../demos/demoCodeExports';
import { getDemoFiles } from '../demos/demoFileExports';

import {
  PlaygroundFile,
  DEFAULT_FILES,
  createFile,
  getFileLanguage,
} from '../lib/types';

export function PlaygroundPageMultiFile() {
  const [files, setFiles] = React.useState<PlaygroundFile[]>(DEFAULT_FILES);
  const [activeFileId, setActiveFileId] = React.useState<string>(
    DEFAULT_FILES[0].id,
  );
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
  const previewRef = React.useRef<HTMLDivElement>(null);
  const rootRef = React.useRef<any>(null);
  const monacoRef = React.useRef<any>(null);

  // Get active file
  const activeFile = React.useMemo(
    () => files.find((f) => f.id === activeFileId) || files[0],
    [files, activeFileId],
  );

  const consoleTimestamp = React.useMemo(
    () => new Date().toLocaleTimeString(),
    [output],
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

  // Sync Monaco models when files change
  React.useEffect(() => {
    if (monacoRef.current) {
      syncMonacoModels(monacoRef.current, files);
    }
  }, [files]);

  const handleFileContentChange = (content: string) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === activeFileId ? { ...f, content } : f)),
    );
  };

  const handleAddFile = () => {
    const fileCount = files.filter((f) => f.name.startsWith('file')).length;
    const newFile = createFile(`file${fileCount + 1}.tsx`, '// New file\n');
    setFiles((prev) => [...prev, newFile]);
    setActiveFileId(newFile.id);
  };

  const handleCloseFile = (fileId: string) => {
    if (files.length <= 1) return;

    const fileIndex = files.findIndex((f) => f.id === fileId);
    const newFiles = files.filter((f) => f.id !== fileId);
    setFiles(newFiles);

    if (activeFileId === fileId) {
      const newActiveIndex = Math.min(fileIndex, newFiles.length - 1);
      setActiveFileId(newFiles[newActiveIndex].id);
    }
  };

  const handleRenameFile = (fileId: string, newName: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? { ...f, name: newName, language: getFileLanguage(newName) }
          : f,
      ),
    );
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
      const existingStyles = document.querySelectorAll(
        'style[data-playground]',
      );
      existingStyles.forEach((style) => style.remove());

      // 5. Clear any global window properties from previous runs
      const componentNames = [
        'Counter',
        'App',
        'Component',
        'Demo',
        'Example',
        'Main',
        'TodoDemo',
        'AsyncDemo',
        'StreamDemo',
        'SelectorsDemo',
      ];
      componentNames.forEach((name) => {
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
      files: files.map((f) => ({ name: f.name, content: f.content })),
      activeFile: files.find((f) => f.id === activeFileId)?.name,
    };
    const encoded = btoa(encodeURIComponent(JSON.stringify(data)));
    const url = `${window.location.origin}${window.location.pathname}?code=${encoded}`;
    navigator.clipboard.writeText(url);
    setOutput((prev) => [...prev, '> Share link copied to clipboard']);
  };

  const handleDownload = () => {
    // Download all files as a zip or the active file
    const activeFile = files.find((f) => f.id === activeFileId);
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
      const demoId = params.get('demo');
      const encoded = params.get('code');

      // Handle demo parameter FIRST
      if (demoId) {
        try {
          // Try multi-file export first
          const multiFileDemo = getDemoFiles(demoId);
          if (multiFileDemo && multiFileDemo.length > 0) {
            setFiles(multiFileDemo);
            setActiveFileId(multiFileDemo[0].id);
            setOutput([
              `> Loaded demo: ${demoId} (${multiFileDemo.length} files)`,
            ]);
            return;
          }

          // Fallback to single-file export
          const singleFileCode = getDemoCode(demoId);
          if (singleFileCode) {
            const file = createFile('App.tsx', singleFileCode);
            setFiles([file]);
            setActiveFileId(file.id);
            setOutput([`> Loaded demo: ${demoId}`]);
            return;
          }

          setOutput([`> Demo not found: ${demoId}`]);
        } catch (e) {
          console.error('Failed to load demo:', e);
          setOutput([`> Error loading demo: ${e}`]);
        }
      }

      // Handle encoded parameter
      if (encoded) {
        try {
          const decoded = JSON.parse(decodeURIComponent(atob(encoded)));
          if (decoded.files && Array.isArray(decoded.files)) {
            const loadedFiles = decoded.files.map((f: any) =>
              createFile(f.name, f.content),
            );
            setFiles(loadedFiles);
            if (decoded.activeFile) {
              const activeFile = loadedFiles.find(
                (f: PlaygroundFile) => f.name === decoded.activeFile,
              );
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

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-background/40">
      <div className="border-b border-border bg-surface shadow-subtle">
        <div className="mx-auto w-full max-w-6xl px-4 py-4">
          <WorkspaceToolbar
            leading={
              <>
                <WorkspaceToolbarGroup className="gap-1 bg-surface-muted">
                  <button
                    onClick={handleRun}
                    disabled={isRunning}
                    className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-2 text-sm font-semibold text-brand-foreground transition-transform hover:-translate-y-0.5 hover:shadow-subtle disabled:pointer-events-none disabled:opacity-50"
                  >
                    <Play className="h-4 w-4" />
                    {isRunning ? 'Running…' : 'Run'}
                  </button>
                  <button
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </button>
                </WorkspaceToolbarGroup>
                <WorkspaceToolbarLabel className="hidden sm:inline-flex items-center gap-2 rounded-md bg-surface-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  <PanelsLeftRight className="h-3.5 w-3.5" />
                  Drag or use arrow keys to resize panels
                </WorkspaceToolbarLabel>
              </>
            }
            trailing={
              <WorkspaceToolbarGroup>
                <button
                  onClick={handleSave}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Save className="h-4 w-4" />
                  <span className="sr-only">Save to browser</span>
                </button>
                <button
                  onClick={handleShare}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Share2 className="h-4 w-4" />
                  <span className="sr-only">Share workspace</span>
                </button>
                <button
                  onClick={handleDownload}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Download className="h-4 w-4" />
                  <span className="sr-only">Download active file</span>
                </button>
              </WorkspaceToolbarGroup>
            }
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="mx-auto flex h-full w-full max-w-6xl flex-col gap-4 px-4 py-6">
          <SplitPane
            orientation="horizontal"
            initialPrimary={split}
            minPrimary={28}
            maxPrimary={72}
            onChange={(value) => {
              setSplit(value);
              localStorage.setItem('playground-split', String(value));
            }}
            className="flex-1 rounded-3xl border border-border bg-surface shadow-subtle"
            handleClassName="bg-surface-muted"
            primary={
              <div className="flex h-full flex-col">
                <div className="border-b border-border bg-surface-muted">
                  <FileTabs
                    files={files}
                    activeFileId={activeFileId}
                    onSelectFile={setActiveFileId}
                    onAddFile={handleAddFile}
                    onCloseFile={handleCloseFile}
                    onRenameFile={handleRenameFile}
                  />
                </div>
                <div className="flex-1 bg-surface">
                  <Editor
                    key={activeFile.id}
                    height="100%"
                    language={activeFile.language}
                    path={activeFile.name}
                    theme={theme}
                    value={activeFile.content}
                    onChange={(value) => handleFileContentChange(value || '')}
                    beforeMount={(monaco) => {
                      setupMonacoForTypeScript(monaco);
                      monacoRef.current = monaco;
                    }}
                    onMount={(editor, monaco) => {
                      syncMonacoModels(monaco, files);
                      debugMonacoState(monaco, editor);
                      const model = editor.getModel();
                      if (model) {
                        console.log(
                          'Editor mounted with language:',
                          model.getLanguageId(),
                        );
                        console.log('File extension:', activeFile.name);
                      }
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
            }
            secondary={
              <div className="flex h-full flex-col">
                <div className="border-b border-border bg-surface-muted px-4">
                  <div className="flex items-center gap-4 text-sm font-medium">
                    <button
                      onClick={() => setActiveTab('preview')}
                      className={cn(
                        'relative py-3 text-sm transition-colors',
                        activeTab === 'preview'
                          ? 'text-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      Preview
                      {activeTab === 'preview' && (
                        <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand" />
                      )}
                    </button>
                    <button
                      onClick={() => setActiveTab('performance')}
                      className={cn(
                        'relative inline-flex items-center gap-2 py-3 text-sm transition-colors',
                        activeTab === 'performance'
                          ? 'text-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <Activity className="h-4 w-4" />
                      Performance
                      {activeTab === 'performance' && (
                        <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-brand" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-auto bg-surface">
                  {activeTab === 'preview' ? (
                    <div className="flex h-full flex-col gap-4 p-6">
                      <header className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">
                            Preview
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Your component renders in a sandboxed React root.
                          </p>
                        </div>
                        <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs font-medium text-success">
                          Status · {isRunning ? 'Running' : 'Idle'}
                        </span>
                      </header>
                      <Card className="flex min-h-[240px] flex-1 items-center justify-center bg-surface-muted">
                        {preview || (
                          <p className="text-sm text-muted-foreground">
                            Click “Run” to execute the current files.
                          </p>
                        )}
                      </Card>
                    </div>
                  ) : (
                    <div className="flex h-full flex-col gap-4 p-6">
                      <header>
                        <h3 className="text-lg font-semibold text-foreground">
                          Performance Monitor
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Track state updates, render counts, and memory usage.
                        </p>
                      </header>
                      <PerformanceMonitorPanel />
                    </div>
                  )}
                </div>
                <div className="border-t border-border bg-surface-muted/80 p-4">
                  <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <span>Console</span>
                    <span>{consoleTimestamp}</span>
                  </div>
                  <div className="h-32 overflow-y-auto rounded-lg border border-border bg-zinc-950 text-zinc-100 shadow-inner">
                    <div className="space-y-1 p-3 font-mono text-xs">
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
            }
          />
        </div>
      </div>
    </div>
  );
}
