/**
 * CompactBlocNode Component
 *
 * Compact version of BlocNode for tree layout visualization
 * Inspired by Redux DevTools chart view
 */

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { BlocGraphNode as BlocGraphNodeData } from '@blac/plugin-graph';
import {
  getConceptBorder,
  getLifecycleBg,
  type LifecycleState,
} from '../../../utils/design-tokens';

export interface CompactBlocNodeProps extends NodeProps {
  data: BlocGraphNodeData & Record<string, unknown>;
}

/**
 * Compact node component for Bloc/Cubit visualization in tree layout
 */
export function CompactBlocNodeComponent({ data }: CompactBlocNodeProps) {
  // Determine border color based on concept type
  const borderColorClass = getConceptBorder(data.type);

  // Get lifecycle indicator color
  const lifecycleColorClass = getLifecycleBg(data.lifecycle as LifecycleState);

  return (
    <div
      className={`
        bg-white rounded-md shadow-md
        border ${borderColorClass}
        min-w-[160px] max-w-[200px]
        transition-all duration-200
        hover:shadow-lg
      `}
    >
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-gray-400 !border-gray-500 !w-2 !h-2"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-gray-400 !border-gray-500 !w-2 !h-2"
      />

      {/* Compact Header */}
      <div className="flex items-center justify-between px-2 py-1.5">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-xs truncate" title={data.name}>
            {data.name}
          </div>
        </div>
        {/* Lifecycle indicator */}
        <div
          className={`
            w-2 h-2 rounded-full ${lifecycleColorClass}
            transition-colors duration-200 flex-shrink-0 ml-2
          `}
          title={`Lifecycle: ${data.lifecycle}`}
        />
      </div>

      {/* Metadata line */}
      <div className="px-2 pb-1.5 text-[10px] text-gray-500 flex items-center justify-between">
        <span>{data.type}</span>
        <span>{data.consumerCount} consumers</span>
      </div>
    </div>
  );
}
