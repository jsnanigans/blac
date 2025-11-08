/**
 * DraggableOverlay - Floating DevTools window that can be injected into any app
 * Toggle with Alt+D or custom event
 */

import React, { useState, useEffect } from 'react';
import { DevToolsPanel } from './DevToolsPanel';
import { DevToolsInstancesBloc, DevToolsDiffBloc } from './blocs';

export interface DraggableOverlayProps {
  /**
   * Optional custom mount handler for the DevToolsPanel.
   * If not provided, will attempt to use window.__BLAC_DEVTOOLS__ API.
   *
   * @param instancesBloc - The instances bloc for managing instance data
   * @returns Optional cleanup function
   */
  onMount?: (instancesBloc: DevToolsInstancesBloc) => void | (() => void);
}

/**
 * Default mount handler that connects to window.__BLAC_DEVTOOLS__ API
 * Now uses atomic updates for better performance
 */
export const defaultDevToolsMount = (instancesBloc: DevToolsInstancesBloc) => {
  console.log('[BlaC Overlay] DevToolsPanel mounted, connecting to API...');
  const api = (window as any).__BLAC_DEVTOOLS__;

  if (!api) {
    console.error('[BlaC Overlay] window.__BLAC_DEVTOOLS__ is undefined');
    return;
  }

  if (!api.isEnabled()) {
    console.warn('[BlaC Overlay] DevTools API is disabled');
    return;
  }

  console.log('[BlaC Overlay] API is available and enabled');

  // Get the DiffBloc to store previous states
  const diffBloc: DevToolsDiffBloc = DevToolsDiffBloc.resolve();

  // Initial state (fetch all instances on mount)
  console.log('[BlaC Overlay] Fetching initial instances...');
  const initialInstances = api.getInstances();
  console.log(
    `[BlaC Overlay] Initial instances (${initialInstances.length}):`,
    initialInstances.map((i: any) => `${i.className}#${i.id}`),
  );
  instancesBloc.setConnected(true);
  instancesBloc.setAllInstances(initialInstances);

  // Subscribe to atomic updates
  console.log(
    '[BlaC Overlay] Subscribing to DevTools events (atomic updates)...',
  );
  const unsubscribe = api.subscribe((event: any) => {
    // Only update if bloc is not disposed
    if (!instancesBloc.isDisposed) {
      console.log(`[BlaC Overlay] Atomic event received: ${event.type}`, {
        instanceId: event.data.id,
        className: event.data.className,
        timestamp: new Date(event.timestamp).toISOString(),
      });

      // Handle atomic updates based on event type
      switch (event.type) {
        case 'instance-created':
          console.log(
            `[BlaC Overlay] Adding instance: ${event.data.className}#${event.data.id}`,
          );
          instancesBloc.addInstance({
            id: event.data.id,
            className: event.data.className,
            name: event.data.name,
            isDisposed: event.data.isDisposed,
            state: event.data.state,
            lastStateChangeTimestamp: event.timestamp,
            createdAt: event.timestamp,
          });
          break;

        case 'instance-disposed':
          console.log(`[BlaC Overlay] Removing instance: ${event.data.id}`);
          instancesBloc.removeInstance(event.data.id);
          // Clear previous state as well
          diffBloc.clearPreviousState(event.data.id);
          break;

        case 'instance-updated':
          console.log(
            `[BlaC Overlay] Updating instance state: ${event.data.className}#${event.data.id}`,
          );
          // Get current instance to capture previous state
          const currentInstance = instancesBloc.getInstance(event.data.id);
          if (currentInstance) {
            // Store previous state in DiffBloc
            diffBloc.storePreviousState(event.data.id, currentInstance.state);
          }
          // Update instance with new state
          instancesBloc.updateInstanceState(event.data.id, event.data.state);
          break;

        default:
          console.warn(`[BlaC Overlay] Unknown event type: ${event.type}`);
      }
    } else {
      console.warn(
        '[BlaC Overlay] Event received but bloc is disposed, ignoring',
      );
    }
  });
  console.log(
    '[BlaC Overlay] Successfully subscribed to DevTools events (atomic mode)',
  );

  // Cleanup on unmount
  return () => {
    console.log('[BlaC Overlay] DevToolsPanel unmounting, unsubscribing...');
    unsubscribe();
  };
};

export function DraggableOverlay({ onMount }: DraggableOverlayProps = {}) {
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
        <DevToolsPanel onMount={onMount ?? defaultDevToolsMount} />
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
