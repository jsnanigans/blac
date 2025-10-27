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
    <article className="card metric-card">
      <div className="render-badge" title={`Rendered ${renderCount.current} times`}>
        {renderCount.current}
      </div>

      <div className="metric-body">
        <div className="metric-icon">{icon}</div>
        <div className="metric-info">
          <span className="widget-subtitle">{title}</span>
          <span className="metric-value" style={{ color }}>
            {value}
          </span>
          {subtitle && <span className="metric-subtitle">{subtitle}</span>}
        </div>
      </div>
    </article>
  );
}
