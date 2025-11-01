import { useRef, useEffect, useState } from 'react';

interface RenderCounterProps {
  name?: string;
  className?: string;
}

/**
 * Visual component to track and display render counts.
 * Flashes when it re-renders to make re-renders visually obvious.
 */
export function RenderCounter({ name, className = '' }: RenderCounterProps) {
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current++;

    // Flash effect on render
    // const timer = setTimeout(() => setFlash(false), 300);
    // return () => clearTimeout(timer);
  });

  return (
    <div
      className={`render-badge ${className}`}
      title={
        name
          ? `${name} renders: ${renderCount.current}`
          : `Renders: ${renderCount.current}`
      }
      style={{
        position: 'absolute',
        top: '4px',
        right: '4px',
        minWidth: '24px',
        height: '24px',
        borderRadius: '50%',
        backgroundColor: false ? '#f59e0b' : '#3b82f6',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        boxShadow: false
          ? '0 0 0 4px rgba(245, 158, 11, 0.3)'
          : '0 2px 4px rgba(0,0,0,0.1)',
        transition: false ? 'none' : 'all 0.3s ease',
        zIndex: 10,
      }}
    >
      {renderCount.current}
    </div>
  );
}
