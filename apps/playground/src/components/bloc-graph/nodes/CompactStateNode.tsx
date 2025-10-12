/**
 * CompactStateNode Component
 *
 * Compact version of StateNode for tree layout visualization
 */

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface CompactStateNodeProps extends NodeProps {
  data: {
    type: 'state';
    displayValue: string;
    fullValue: string;
    isPrimitive: boolean;
    isExpandable: boolean;
    valueType: string;
    childCount?: number;
    hasChanged?: boolean;
  };
}

/**
 * Compact state node component for tree layout
 */
export function CompactStateNodeComponent({ data }: CompactStateNodeProps) {
  // Get color based on value type
  const getTypeColor = () => {
    switch (data.valueType) {
      case 'object':
        return 'bg-amber-500';
      case 'array':
        return 'bg-cyan-500';
      case 'number':
        return 'bg-green-500';
      case 'string':
        return 'bg-pink-500';
      case 'boolean':
        return 'bg-purple-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="relative">
      {/* Connection handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-gray-400 !border-gray-500 !w-2 !h-2"
      />

      <div
        className={`
          ${getTypeColor()}
          text-white rounded-md shadow-sm
          min-w-[140px] max-w-[180px]
          transition-all duration-200
          hover:shadow-md
          ${data.hasChanged ? 'ring-2 ring-white ring-opacity-50' : ''}
        `}
        title={data.fullValue}
      >
        {/* Compact content */}
        <div className="px-2 py-1.5">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[9px] font-semibold opacity-90 uppercase">State</span>
            <span className="text-[8px] opacity-75 uppercase px-1 py-0.5 bg-black/20 rounded">
              {data.valueType}
            </span>
          </div>
          <div className="text-xs font-mono break-words">
            {data.displayValue}
          </div>
        </div>
      </div>
    </div>
  );
}
