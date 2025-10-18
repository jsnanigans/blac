import React from 'react';

interface ComponentCardProps {
  icon: string;
  title: string;
  renderCount: number;
  justRendered: boolean;
  trackedProperties: string;
  children: React.ReactNode;
  variant?: 'default' | 'warning';
}

export function ComponentCard({
  icon,
  title,
  renderCount,
  justRendered,
  trackedProperties,
  children,
  variant = 'default',
}: ComponentCardProps) {
  const badgeColor =
    renderCount <= 3
      ? 'bg-green-500'
      : renderCount <= 10
        ? 'bg-yellow-500'
        : 'bg-red-500';

  return (
    <div
      className={`
        relative p-4 border-2 rounded-lg transition-all duration-300
        ${justRendered ? 'border-blue-500 shadow-lg shadow-blue-200' : 'border-gray-200'}
        ${variant === 'warning' ? 'bg-orange-50' : 'bg-white'}
      `}
      style={{
        animation: justRendered ? 'flash 600ms ease-in-out' : undefined,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl" role="img" aria-label={title}>
            {icon}
          </span>
          <h3 className="font-semibold text-gray-800">{title}</h3>
        </div>
        <span
          className={`px-2 py-1 rounded-full text-white text-xs font-bold ${badgeColor}`}
          aria-label={`Render count: ${renderCount}`}
        >
          {renderCount}
        </span>
      </div>

      {/* Tracked Properties */}
      <div className="mb-3 p-2 bg-gray-100 rounded text-xs font-mono">
        <span className="text-gray-600">Tracks:</span>{' '}
        <span className="text-gray-800">{trackedProperties}</span>
      </div>

      {/* Content */}
      <div className="mt-2">{children}</div>
    </div>
  );
}
