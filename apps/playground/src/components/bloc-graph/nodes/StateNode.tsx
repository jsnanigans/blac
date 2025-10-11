/**
 * StateNode Component
 *
 * Displays the current state value of a Bloc/Cubit
 */

import React, { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface StateNodeProps extends NodeProps {
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
 * State node component showing serialized state
 */
export function StateNodeComponent({ data }: StateNodeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  // Get color based on value type
  const getTypeColor = () => {
    switch (data.valueType) {
      case 'object':
        return 'from-amber-500 to-orange-500';
      case 'array':
        return 'from-cyan-500 to-blue-500';
      case 'number':
        return 'from-green-500 to-emerald-500';
      case 'string':
        return 'from-pink-500 to-rose-500';
      case 'boolean':
        return 'from-purple-500 to-violet-500';
      default:
        return 'from-gray-500 to-slate-500';
    }
  };

  return (
    <div className="relative">
      {/* Connection handle */}
      <Handle type="target" position={Position.Top} className="opacity-0" />

      <div
        className={`
          bg-gradient-to-br ${getTypeColor()}
          text-white rounded-lg shadow-md
          border border-white/30
          min-w-[180px] max-w-[250px]
          transition-all duration-200
          hover:shadow-lg
          ${data.hasChanged ? 'animate-pulse' : ''}
        `}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-white/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold opacity-90">State</span>
            <span className="text-[10px] opacity-75 uppercase px-1.5 py-0.5 bg-black/20 rounded">
              {data.valueType}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          <div className="text-sm font-mono break-words">
            {data.displayValue}
          </div>
          {data.isExpandable && data.childCount !== undefined && (
            <div className="text-xs opacity-75 mt-1">
              {data.childCount} {data.valueType === 'array' ? 'items' : 'keys'}
            </div>
          )}
        </div>
      </div>

      {/* Tooltip with full value */}
      {showTooltip && data.displayValue !== data.fullValue && (
        <div className="absolute z-50 left-full ml-2 top-0 bg-gray-900 text-white p-3 rounded-lg shadow-xl max-w-md">
          <div className="text-xs font-bold mb-1">Full Value:</div>
          <pre className="text-xs font-mono whitespace-pre-wrap max-h-[300px] overflow-auto">
            {data.fullValue}
          </pre>
        </div>
      )}
    </div>
  );
}
