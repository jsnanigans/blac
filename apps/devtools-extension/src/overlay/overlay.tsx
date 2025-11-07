/**
 * In-App Overlay - Floating DevTools window injected into the page
 * Toggle with Alt+D
 */

import ReactDOM from 'react-dom/client';
import { DevToolsPanel, LayoutBloc } from '@blac/devtools-ui';
import { useState, useEffect } from 'react';

function DraggableOverlay() {
  const [visible, setVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 800, height: 600 });

  // Keyboard shortcut: Alt+D and custom event listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        console.log('[BlaC Overlay] Alt+D pressed, toggling visibility');
        setVisible((v) => !v);
      }
      // Escape to close
      if (e.key === 'Escape' && visible) {
        console.log('[BlaC Overlay] Escape pressed, closing');
        setVisible(false);
      }
    };

    // Listen for custom event to toggle visibility
    const handleToggleEvent = () => {
      console.log('[BlaC Overlay] Toggle event received');
      setVisible((v) => !v);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blac-devtools-toggle', handleToggleEvent);

    console.log('[BlaC Overlay] Event listeners attached, visible:', visible);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('blac-devtools-toggle', handleToggleEvent);
    };
  }, [visible]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.blac-devtools-header')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset.x, dragOffset.y]);

  if (!visible) {
    return (
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          background: '#252526',
          color: '#ccc',
          padding: '8px 16px',
          borderRadius: '6px',
          fontSize: '12px',
          zIndex: 2147483646,
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          border: '1px solid #444',
          pointerEvents: 'auto',
        }}
        onClick={() => {
          console.log('[BlaC Overlay] Toggle button clicked');
          setVisible(true);
        }}
        title="Toggle BlaC DevTools (Alt+D)"
      >
        🔧 BlaC DevTools
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        background: '#1e1e1e',
        color: '#ccc',
        borderRadius: '8px',
        overflow: 'hidden',
        zIndex: 2147483647,
        boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
        border: '1px solid #444',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: 'auto',
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Custom Header with Drag Handle */}
      <div
        className="blac-devtools-header"
        style={{
          background: '#252526',
          padding: '8px 12px',
          borderBottom: '1px solid #444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>🔧</span>
          <span style={{ fontSize: '13px', fontWeight: 600 }}>
            BlaC DevTools (In-App)
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span
            style={{
              fontSize: '11px',
              color: '#888',
              cursor: 'default',
            }}
          >
            Alt+D
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setVisible(false);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              fontSize: '18px',
              padding: '0 4px',
              lineHeight: 1,
            }}
            title="Close (Esc)"
          >
            ×
          </button>
        </div>
      </div>

      {/* DevTools Panel */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <DevToolsPanel
          onMount={(bloc: LayoutBloc) => {
            const api = (window as any).__BLAC_DEVTOOLS__;
            if (!api || !api.isEnabled()) {
              console.warn('[BlaC Overlay] DevTools API not available');
              return;
            }

            console.log('[BlaC Overlay] Connected to API');

            // Initial state
            bloc.setInstances(api.getInstances());
            bloc.setConnected(true);

            // Subscribe to changes
            const unsubscribe = api.subscribe(() => {
              // Only update if bloc is not disposed
              if (!bloc.isDisposed) {
                bloc.setInstances(api.getInstances());
              }
            });

            // Cleanup on unmount
            return () => {
              unsubscribe();
            };
          }}
        />
      </div>

      {/* Resize Handle */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          width: '12px',
          height: '12px',
          cursor: 'nwse-resize',
          background:
            'linear-gradient(135deg, transparent 0%, transparent 50%, #444 50%, #444 100%)',
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          const startX = e.clientX;
          const startY = e.clientY;
          const startWidth = size.width;
          const startHeight = size.height;

          const handleResize = (e: MouseEvent) => {
            const newWidth = Math.max(400, startWidth + (e.clientX - startX));
            const newHeight = Math.max(300, startHeight + (e.clientY - startY));
            setSize({ width: newWidth, height: newHeight });
          };

          const handleResizeEnd = () => {
            window.removeEventListener('mousemove', handleResize);
            window.removeEventListener('mouseup', handleResizeEnd);
          };

          window.addEventListener('mousemove', handleResize);
          window.addEventListener('mouseup', handleResizeEnd);
        }}
      />
    </div>
  );
}

// Check if we're in the main world with access to __BLAC_DEVTOOLS__
if (typeof window !== 'undefined') {
  console.log('[BlaC Overlay] Initializing...');

  // Wait for DOM to be ready
  const initOverlay = () => {
    // Check if already initialized
    if (document.getElementById('blac-devtools-overlay-root')) {
      console.log('[BlaC Overlay] Already initialized');
      return;
    }

    // Create a container for the overlay
    const container = document.createElement('div');
    container.id = 'blac-devtools-overlay-root';
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 0;
      height: 0;
      z-index: 2147483647;
      pointer-events: none;
    `;
    document.body.appendChild(container);

    // Mount the overlay
    const root = ReactDOM.createRoot(container);
    root.render(<DraggableOverlay />);

    console.log('[BlaC Overlay] Ready! Press Alt+D to toggle');
  };

  // Initialize when DOM is ready
  if (document.body) {
    initOverlay();
  } else {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initOverlay);
    } else {
      // DOM is already ready but body doesn't exist yet? Wait a bit
      setTimeout(initOverlay, 100);
    }
  }
}
