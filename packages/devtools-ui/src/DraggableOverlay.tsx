/**
 * DraggableOverlay - Floating DevTools window that can be injected into any app
 * Toggle with Alt+D or custom event
 */

import React, { useState, useEffect } from 'react';
import { acquire } from '@blac/core';
import { DevToolsPanel } from './DevToolsPanel';
import {
  DevToolsInstancesBloc,
  DevToolsDiffBloc,
  DevToolsLogsBloc,
  DevToolsDependencyBloc,
  DevToolsMetricsBloc,
} from './blocs';

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
 * Helper function to process events into logs
 */
function processEventIntoLogs(event: any, logsBloc: DevToolsLogsBloc): void {
  switch (event.type) {
    case 'init': {
      const instances = Array.isArray(event.data) ? event.data : [];
      logsBloc.addLog('init', '__system__', 'System', 'DevTools', {
        instanceCount: instances.length,
      });
      break;
    }

    case 'instance-created': {
      logsBloc.addLog(
        'created',
        event.data.id,
        event.data.className,
        event.data.name,
        { initialState: event.data.state },
      );
      break;
    }

    case 'instance-disposed': {
      logsBloc.addLog(
        'disposed',
        event.data.id,
        event.data.className,
        event.data.name,
      );
      break;
    }

    case 'instance-updated': {
      const d = event.data;
      logsBloc.addLog(
        'state-changed',
        d.id,
        d.className,
        d.name,
        {
          previousState: d.previousState,
          newState: d.state ?? d.currentState,
        },
        d.callstack,
        d.trigger?.name,
      );
      break;
    }
  }
}

/**
 * Maps raw instance data from the plugin API to the InstanceData shape expected by the UI.
 * Handles both InstanceState (from getFullState) and InstanceMetadata (from getInstances).
 */
function toInstanceData(inst: any): import('./types').InstanceData {
  return {
    id: inst.id ?? '',
    className: inst.className ?? '',
    name: inst.name ?? inst.id ?? '',
    isDisposed: inst.isDisposed ?? false,
    state: inst.state ?? inst.currentState ?? null,
    lastStateChangeTimestamp:
      inst.lastStateChangeTimestamp ??
      (inst.history?.length
        ? inst.history[inst.history.length - 1].timestamp
        : (inst.createdAt ?? Date.now())),
    createdAt: inst.createdAt ?? Date.now(),
    hydrationStatus: inst.hydrationStatus,
    hydrationError: inst.hydrationError,
    dependencies: inst.dependencies,
    getters: inst.getters,
    consumers: inst.consumers,
    refIds: inst.refIds,
    refHolders: inst.refHolders,
    createdFrom: inst.createdFrom,
  };
}

function estimateStateSize(state: any): number {
  try {
    return JSON.stringify(state)?.length ?? 0;
  } catch {
    return 0;
  }
}

export const defaultDevToolsMount = (instancesBloc: DevToolsInstancesBloc) => {
  const api = (window as any as Record<string, any>).__BLAC_DEVTOOLS__;

  if (!api) {
    console.error('[BlaC DevTools] window.__BLAC_DEVTOOLS__ is undefined');
    return;
  }

  if (!api.isEnabled()) {
    console.warn('[BlaC DevTools] DevTools API is disabled');
    return;
  }

  const diffBloc = acquire(DevToolsDiffBloc);
  const logsBloc = acquire(DevToolsLogsBloc);
  const dependencyBloc = acquire(DevToolsDependencyBloc);
  const metricsBloc = acquire(DevToolsMetricsBloc);

  const fullState = api.getFullState?.();
  const rawInstances = fullState?.instances ?? api.getInstances() ?? [];
  const initialInstances = rawInstances.map(toInstanceData);
  instancesBloc.setConnected(true);
  instancesBloc.setAllInstances(initialInstances);

  // Load backend state history into DiffBloc
  for (const inst of rawInstances) {
    if (inst.history?.length) {
      diffBloc.loadInstanceHistory(inst.id, inst.history);
    }
  }

  // Load dependency graph
  const graph = api.getDependencyGraph?.();
  if (graph?.edges?.length) {
    dependencyBloc.setEdges(graph.edges);
  }

  const eventHistory = api.getEventHistory?.() ?? [];
  eventHistory.forEach((event: any) => {
    processEventIntoLogs(event, logsBloc);
  });

  const unsubscribe = api.subscribe((event: any) => {
    if (instancesBloc.isDisposed) return;

    const evt = event as Record<string, any> & {
      type: string;
      data?: any;
      timestamp?: number;
    };
    switch (evt.type) {
      case 'init': {
        diffBloc.clearAllPreviousStates();
        logsBloc.clearLogs();
        metricsBloc.clearAll();
        dependencyBloc.setEdges([]);
        const initInstances = (Array.isArray(evt.data) ? evt.data : []).map(
          (inst: any) =>
            toInstanceData({
              ...(inst as Record<string, any>),
              createdAt:
                (inst as Record<string, any>)?.createdAt ?? evt.timestamp,
            }),
        );
        instancesBloc.setAllInstances(initInstances);
        logsBloc.addLog('init', '__system__', 'System', 'DevTools', {
          instanceCount: initInstances.length,
        });
        break;
      }

      case 'instance-created': {
        const d = evt.data as Record<string, any>;
        instancesBloc.addInstance(
          toInstanceData({
            ...d,
            createdAt: (d?.createdAt ?? evt.timestamp) as number,
          }),
        );
        // Register dependency edges from this new instance
        if (d.dependencies?.length) {
          dependencyBloc.addEdgesForInstance(d.id, d.dependencies);
        }
        logsBloc.addLog('created', d.id, d.className, d.name, {
          initialState: d.state,
        });
        break;
      }

      case 'instance-disposed': {
        const d = evt.data as Record<string, any>;
        const disposedInstance = instancesBloc.getInstance(d.id as string);
        instancesBloc.removeInstance(d.id as string);
        diffBloc.clearPreviousState(d.id as string);
        dependencyBloc.removeEdgesForInstance(d.id as string);
        metricsBloc.removeInstance(d.id as string);
        if (disposedInstance) {
          logsBloc.addLog(
            'disposed',
            d.id,
            disposedInstance.className,
            disposedInstance.name,
          );
        }
        break;
      }

      case 'instance-updated': {
        const d = evt.data as Record<string, any>;
        const updatedState = (d.state ?? d.currentState) as any;
        const currentInstance = instancesBloc.getInstance(d.id as string);
        if (currentInstance) {
          diffBloc.storePreviousState(
            d.id as string,
            currentInstance.state,
            d.callstack as string | undefined,
            (d.trigger as Record<string, any>)?.name as string | undefined,
          );
        }
        instancesBloc.updateInstanceState(
          d.id as string,
          updatedState,
          d.getters,
        );
        metricsBloc.recordUpdate(
          d.id as string,
          d.className as string,
          estimateStateSize(updatedState),
        );
        logsBloc.addLog(
          'state-changed',
          d.id as string,
          d.className as string,
          d.name as string,
          { previousState: currentInstance?.state, newState: updatedState },
          d.callstack as string | undefined,
          (d.trigger as Record<string, any>)?.name as string | undefined,
        );
        break;
      }

      case 'consumers-changed': {
        const d = evt.data as Record<string, any>;
        instancesBloc.updateConsumers(
          d.instanceId as string,
          (d.consumers as import('./types').ConsumerInfo[]) ?? [],
          (d.refIds as string[]) ?? [],
          (d.refHolders as import('./types').RefHolderInfo[]) ?? undefined,
        );
        break;
      }
    }
  });

  return () => {
    unsubscribe();
  };
};

export function DraggableOverlay({ onMount }: DraggableOverlayProps = {}) {
  const [visible, setVisible] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        setVisible((v) => !v);
      }
      if (e.key === 'Escape' && visible) {
        setVisible(false);
      }
    };

    const handleToggleEvent = () => {
      setVisible((v) => !v);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('blac-devtools-toggle', handleToggleEvent);

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
        onClick={() => setVisible(true)}
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
          onMount={onMount ?? defaultDevToolsMount}
          onTimeTravel={(instanceId, state) =>
            (
              (window as any as Record<string, any>)
                .__BLAC_DEVTOOLS__ as Record<string, any>
            )?.timeTravel?.(instanceId, state)
          }
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
