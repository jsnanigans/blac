import { useRef, useEffect } from 'react';

interface RenderCounterProps {
  name?: string;
  className?: string;
}

export function RenderCounter({ name, className = '' }: RenderCounterProps) {
  const renderCount = useRef(0);
  const badgeRef = useRef<HTMLDivElement>(null);

  // Increment on every render (in render body, not effect)
  renderCount.current++;

  useEffect(() => {
    const el = badgeRef.current;
    if (!el) return;
    el.style.backgroundColor = '#f59e0b';
    el.style.boxShadow = '0 0 0 4px rgba(245, 158, 11, 0.3)';
    el.style.transition = 'none';
    const timer = setTimeout(() => {
      el.style.transition = 'all 0.3s ease';
      el.style.backgroundColor = '#3b82f6';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
    }, 16);
    return () => clearTimeout(timer);
  });

  return (
    <div
      ref={badgeRef}
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
        backgroundColor: '#3b82f6',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.75rem',
        fontWeight: 'bold',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        transition: 'all 0.3s ease',
        zIndex: 10,
      }}
    >
      {renderCount.current}
    </div>
  );
}
