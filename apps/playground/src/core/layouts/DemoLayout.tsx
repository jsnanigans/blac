import React from 'react';
import { BlocGraphVisualizer } from '@/components/bloc-graph';

export interface DemoLayoutProps {
  /** The main demo content */
  children: React.ReactNode;
  /** Whether to show the graph visualizer (default: true) */
  showGraph?: boolean;
}

/**
 * Standard layout for demo pages with graph visualization
 *
 * Layout structure:
 * - Demo content: ~60% width, scrollable
 * - Graph: ~40% width, sticky, fits viewport
 */
export function DemoLayout({ children, showGraph = true }: DemoLayoutProps) {
  const [containerSize, setContainerSize] = React.useState({ width: 600, height: 800 });
  const graphContainerRef = React.useRef<HTMLDivElement>(null);

  // Update graph dimensions based on container size
  React.useEffect(() => {
    if (!graphContainerRef.current || !showGraph) return;

    const updateSize = () => {
      if (graphContainerRef.current) {
        const rect = graphContainerRef.current.getBoundingClientRect();
        setContainerSize({
          width: rect.width,
          height: rect.height,
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [showGraph]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Demo Content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-6 py-4" style={{ flex: '0 0 60%' }}>
        {children}
      </div>

      {/* Graph Visualization - Sticky, Fixed to Viewport */}
      {showGraph && (
        <div
          ref={graphContainerRef}
          className="sticky top-0 h-[calc(100vh-3.5rem)] border-l border-border bg-background"
          style={{ flex: '0 0 40%' }}
        >
          <BlocGraphVisualizer
            width={containerSize.width}
            height={containerSize.height}
          />
        </div>
      )}
    </div>
  );
}
