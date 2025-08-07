import React from 'react';
import { Play, Save, Share2, Download, RotateCcw } from 'lucide-react';

export function PlaygroundPage() {
  const [code, setCode] = React.useState(`import { Cubit } from '@blac/core';

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
}

// Export for use in the preview
export default CounterCubit;`);

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col">
      {/* Toolbar */}
      <div className="border-b px-4 py-2 flex items-center justify-between bg-background">
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4">
            <Play className="h-4 w-4 mr-2" />
            Run
          </button>
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background border border-input hover:bg-accent hover:text-accent-foreground h-9 px-4">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background hover:bg-accent hover:text-accent-foreground h-9 w-9">
            <Save className="h-4 w-4" />
            <span className="sr-only">Save</span>
          </button>
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background hover:bg-accent hover:text-accent-foreground h-9 w-9">
            <Share2 className="h-4 w-4" />
            <span className="sr-only">Share</span>
          </button>
          <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background hover:bg-accent hover:text-accent-foreground h-9 w-9">
            <Download className="h-4 w-4" />
            <span className="sr-only">Download</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Editor */}
        <div className="flex-1 border-r">
          <div className="h-full bg-zinc-950 p-4">
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full h-full bg-transparent text-zinc-100 font-mono text-sm resize-none focus:outline-none"
              placeholder="Write your BlaC code here..."
              spellCheck={false}
            />
          </div>
        </div>

        {/* Preview */}
        <div className="flex-1">
          <div className="h-full p-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Preview</h3>
              <p className="text-sm text-muted-foreground">
                Your component will render here when you click Run.
              </p>
            </div>
            
            <div className="border rounded-lg p-4 min-h-[200px] bg-card">
              <p className="text-center text-muted-foreground">
                Click "Run" to execute your code
              </p>
            </div>

            {/* Console */}
            <div className="mt-6">
              <h3 className="text-sm font-semibold mb-2">Console</h3>
              <div className="border rounded-lg p-3 min-h-[100px] bg-zinc-950 text-zinc-100 font-mono text-xs">
                <div className="text-zinc-500">{'>'} Ready</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}