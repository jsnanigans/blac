/**
 * RootNode Component
 *
 * Displays the Blac instance root node with global statistics
 */

import React from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export interface RootNodeProps extends NodeProps {
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
 * Root node component showing Blac instance statistics
 */
export function RootNodeComponent({ data }: RootNodeProps) {
  const stats = data.stats;

  return (
    <div
      className="
        bg-gradient-to-br from-purple-600 to-blue-600
        text-white rounded-lg shadow-lg
        border-2 border-purple-700
        min-w-[250px]
        transition-all duration-200
        hover:shadow-xl
      "
    >
      {/* Connection handle */}
      <Handle type="source" position={Position.Bottom} className="opacity-0" />

      {/* Header */}
      <div className="p-3 border-b border-white/20">
        <div className="font-bold text-lg">Blac Instance</div>
        <div className="text-xs opacity-80">Global State Manager</div>
      </div>

      {/* Stats */}
      <div className="p-3 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="opacity-90">Total Blocs:</span>
          <span className="font-bold">{stats.totalBlocs}</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-90">Active:</span>
          <span className="font-bold text-green-300">{stats.activeBlocs}</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-90">Disposed:</span>
          <span className="font-bold text-red-300">{stats.disposedBlocs}</span>
        </div>
        <div className="flex justify-between">
          <span className="opacity-90">Consumers:</span>
          <span className="font-bold">{stats.totalConsumers}</span>
        </div>

        <div className="pt-2 border-t border-white/20 mt-2">
          <div className="text-xs opacity-75 mb-1">Memory:</div>
          <div className="grid grid-cols-3 gap-1 text-xs">
            <div className="text-center">
              <div className="font-bold">
                {stats.memoryStats.registeredBlocs}
              </div>
              <div className="opacity-75 text-[10px]">Registered</div>
            </div>
            <div className="text-center">
              <div className="font-bold">{stats.memoryStats.isolatedBlocs}</div>
              <div className="opacity-75 text-[10px]">Isolated</div>
            </div>
            <div className="text-center">
              <div className="font-bold">
                {stats.memoryStats.keepAliveBlocs}
              </div>
              <div className="opacity-75 text-[10px]">KeepAlive</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
