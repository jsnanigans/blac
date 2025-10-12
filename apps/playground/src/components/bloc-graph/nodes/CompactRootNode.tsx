/**
 * CompactRootNode Component
 *
 * Compact version of RootNode for tree layout visualization
 */

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface CompactRootNodeProps extends NodeProps {
  data: {
    type: 'root';
    stats: {
      totalBlocs: number;
      activeBlocs: number;
      disposedBlocs: number;
      totalConsumers: number;
      memoryStats: {
        registeredBlocs: number;
        isolatedBlocs: number;
        keepAliveBlocs: number;
      };
    };
  };
}

/**
 * Compact root node component showing Blac instance
 */
export function CompactRootNodeComponent({ data }: CompactRootNodeProps) {
  const stats = data.stats;

  return (
    <div
      className="
        bg-gradient-to-br from-purple-600 to-blue-600
        text-white rounded-md shadow-md
        border border-purple-700
        min-w-[180px]
        transition-all duration-200
        hover:shadow-lg
      "
    >
      {/* Connection handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-purple-300 !border-purple-400 !w-2 !h-2"
      />

      {/* Compact Header */}
      <div className="px-2 py-1.5 border-b border-white/20">
        <div className="font-bold text-sm">Blac</div>
        <div className="text-[9px] opacity-75">State Manager</div>
      </div>

      {/* Compact Stats */}
      <div className="px-2 py-1.5 text-[10px] space-y-0.5">
        <div className="flex justify-between">
          <span className="opacity-90">Blocs:</span>
          <span className="font-semibold">{stats.totalBlocs}</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-90">Active:</span>
          <span className="font-semibold">{stats.activeBlocs}</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-90">Consumers:</span>
          <span className="font-semibold">{stats.totalConsumers}</span>
        </div>
      </div>
    </div>
  );
}
