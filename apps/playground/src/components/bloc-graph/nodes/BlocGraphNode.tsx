/**
 * BlocGraphNode Component
 *
 * Custom node component for React Flow graph visualization.
 * Displays Bloc/Cubit instances with their state, lifecycle, and metadata.
 */

import React, { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { BlocGraphNode as BlocGraphNodeData } from '@blac/plugin-graph';
import {
  getConceptBorder,
  getLifecycleBg,
  getLifecycleText,
  getInstanceText,
  type LifecycleState,
  type InstancePattern,
} from '../../../utils/design-tokens';

export interface BlocGraphNodeProps extends NodeProps {
  data: BlocGraphNodeData & Record<string, unknown> & {
    expanded?: boolean;
    onExpand?: (expanded: boolean) => void;
  };
}

/**
 * Custom node component for Bloc/Cubit visualization
 */
export function BlocGraphNodeComponent({ data }: BlocGraphNodeProps) {
  const [isExpanded, setIsExpanded] = useState(data.expanded ?? false);

  const handleToggleExpand = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    data.onExpand?.(newExpanded);
  };

  // Determine border color based on concept type
  const borderColorClass = getConceptBorder(data.type);

  // Get lifecycle indicator color
  const lifecycleColorClass = getLifecycleBg(data.lifecycle as LifecycleState);
  const lifecycleTextClass = getLifecycleText(data.lifecycle as LifecycleState);

  // Get instance pattern text color
  const getInstancePattern = (): InstancePattern => {
    if (data.keepAlive) return 'keepAlive';
    if (data.isIsolated) return 'isolated';
    return 'shared';
  };

  const instancePattern = getInstancePattern();
  const instanceTextClass = getInstanceText(instancePattern);

  return (
    <div
      className={`
        bg-white rounded-lg shadow-lg
        border-2 ${borderColorClass}
        min-w-[200px] max-w-[300px]
        transition-all duration-200
        hover:shadow-xl
      `}
    >
      {/* Connection handles */}
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <Handle type="source" position={Position.Bottom} className="opacity-0" />

      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b">
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm truncate" title={data.name}>
            {data.name}
          </div>
          <div className={`text-xs ${instanceTextClass} capitalize`}>
            {instancePattern}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Lifecycle indicator */}
          <div
            className={`
              w-3 h-3 rounded-full ${lifecycleColorClass}
              transition-colors duration-200
            `}
            title={`Lifecycle: ${data.lifecycle}`}
          />
          {/* Expand/collapse button */}
          <button
            onClick={handleToggleExpand}
            className="text-gray-600 hover:text-gray-900 w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 transition-colors"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? '−' : '+'}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-3">
        {/* Metadata */}
        <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
          <span>Consumers: {data.consumerCount}</span>
          <span className={lifecycleTextClass}>{data.lifecycle}</span>
        </div>

        {/* Instance ID */}
        {data.instanceId && (
          <div className="text-xs text-gray-500 mb-2 font-mono truncate" title={data.instanceId}>
            ID: {data.instanceId}
          </div>
        )}

        {/* Expanded details view */}
        {isExpanded && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
            <div className="font-bold mb-1">Details:</div>
            <div className="space-y-1">
              <div><span className="font-semibold">Type:</span> {data.type}</div>
              <div><span className="font-semibold">Shared:</span> {data.isShared ? 'Yes' : 'No'}</div>
              <div><span className="font-semibold">Isolated:</span> {data.isIsolated ? 'Yes' : 'No'}</div>
              <div><span className="font-semibold">Keep Alive:</span> {data.keepAlive ? 'Yes' : 'No'}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

