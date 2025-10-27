import { useRef } from 'react';

interface MetricWidgetProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: string;
  color?: string;
  componentName: string;
}

/**
 * Reusable metric widget component with render counter.
 * The render counter makes it visually obvious when a component re-renders.
 */
export function MetricWidget({
  title,
  value,
  subtitle,
  icon = '📊',
  color = 'var(--primary)',
  componentName,
}: MetricWidgetProps) {
  const renderCount = useRef(0);
  renderCount.current++;

  console.log(`  ↳ [${componentName}] Rendered (${renderCount.current} times)`);

  return (
    <div className="card" style={{ position: 'relative', overflow: 'visible' }}>
      {/* Render counter badge */}
      <div
        style={{
          position: 'absolute',
          top: '-8px',
          right: '-8px',
          background: 'var(--secondary)',
          color: 'white',
          borderRadius: '50%',
          width: '28px',
          height: '28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          fontWeight: 'bold',
          boxShadow: 'var(--shadow)',
        }}
        title={`Rendered ${renderCount.current} times`}
      >
        {renderCount.current}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ fontSize: '2.5rem' }}>{icon}</div>
        <div style={{ flex: 1 }}>
          <div className="text-small text-muted" style={{ marginBottom: '0.25rem' }}>
            {title}
          </div>
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: color,
              lineHeight: 1,
            }}
          >
            {value}
          </div>
          {subtitle && (
            <div className="text-small text-muted" style={{ marginTop: '0.25rem' }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
