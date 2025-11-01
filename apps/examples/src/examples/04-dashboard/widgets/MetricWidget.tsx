import { Card, RenderCounter } from '../../../shared/components';

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
 * Uses the shared RenderCounter component to visualize re-renders.
 */
export function MetricWidget({
  title,
  value,
  subtitle,
  icon = '📊',
  color = 'var(--color-primary)',
  componentName,
}: MetricWidgetProps) {
  console.log(`  ↳ [${componentName}] Rendered`);

  return (
    <Card>
      <div className="stack-sm" style={{ position: 'relative' }}>
        <RenderCounter name={componentName} />

        <div className="row-sm">
          <div style={{ fontSize: '2rem' }}>{icon}</div>
          <div className="stack-xs" style={{ flex: 1 }}>
            <span className="text-small text-muted">{title}</span>
            <span className="text-2xl" style={{ fontWeight: 700, color }}>
              {value}
            </span>
            {subtitle && <span className="text-xs text-muted">{subtitle}</span>}
          </div>
        </div>
      </div>
    </Card>
  );
}
