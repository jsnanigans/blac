import { usePerformanceMetrics } from '../hooks/usePerformanceMetrics';

interface PerformanceOverlayProps {
  /**
   * Whether to show the overlay (default: true)
   */
  enabled?: boolean;
  /**
   * Position of the overlay (default: 'top-right')
   */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /**
   * Show detailed metrics (default: false)
   */
  detailed?: boolean;
  /**
   * Custom className for styling
   */
  className?: string;
}

/**
 * Performance metrics overlay component.
 * Displays real-time FPS, memory usage, and render counts.
 *
 * @example
 * ```tsx
 * <PerformanceOverlay position="top-right" detailed />
 * ```
 */
export function PerformanceOverlay({
  enabled = true,
  position = 'top-right',
  detailed = false,
  className = '',
}: PerformanceOverlayProps) {
  const metrics = usePerformanceMetrics(enabled);

  if (!enabled) return null;

  const positionStyles: Record<string, React.CSSProperties> = {
    'top-left': { top: '8px', left: '8px' },
    'top-right': { top: '8px', right: '8px' },
    'bottom-left': { bottom: '8px', left: '8px' },
    'bottom-right': { bottom: '8px', right: '8px' },
  };

  const getFpsColor = (fps: number): string => {
    if (fps >= 55) return 'var(--color-success)';
    if (fps >= 30) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  return (
    <div
      className={`performance-overlay ${className}`}
      style={{
        position: 'fixed',
        ...positionStyles[position],
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          color: 'white',
          padding: 'var(--space-sm) var(--space-md)',
          borderRadius: 'var(--border-radius)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.75rem',
          lineHeight: 1.4,
          minWidth: '120px',
        }}
      >
        {/* FPS - Always shown */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 'var(--space-md)',
          }}
        >
          <span>FPS:</span>
          <span style={{ fontWeight: 'bold', color: getFpsColor(metrics.fps) }}>
            {metrics.fps}
          </span>
        </div>

        {detailed && (
          <>
            {/* Average FPS */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 'var(--space-md)',
              }}
            >
              <span>Avg FPS:</span>
              <span
                style={{
                  fontWeight: 'bold',
                  color: getFpsColor(metrics.avgFps),
                }}
              >
                {metrics.avgFps}
              </span>
            </div>

            {/* Memory (if available) */}
            {metrics.memoryUsed > 0 && (
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 'var(--space-md)',
                }}
              >
                <span>Memory:</span>
                <span style={{ fontWeight: 'bold' }}>
                  {metrics.memoryUsed} MB
                </span>
              </div>
            )}

            {/* Render time */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 'var(--space-md)',
              }}
            >
              <span>Render:</span>
              <span style={{ fontWeight: 'bold' }}>
                {metrics.renderTime} ms
              </span>
            </div>

            {/* Render count */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 'var(--space-md)',
                marginTop: 'var(--space-xs)',
                paddingTop: 'var(--space-xs)',
                borderTop: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <span>Renders:</span>
              <span style={{ fontWeight: 'bold' }}>{metrics.renderCount}</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Simplified FPS counter component.
 * Just shows the current FPS in a minimal badge.
 *
 * @example
 * ```tsx
 * <FpsCounter />
 * ```
 */
export function FpsCounter({ enabled = true }: { enabled?: boolean }) {
  const metrics = usePerformanceMetrics(enabled);

  if (!enabled) return null;

  const getFpsColor = (fps: number): string => {
    if (fps >= 55) return 'var(--color-success)';
    if (fps >= 30) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--space-xs)',
        padding: 'var(--space-xs) var(--space-sm)',
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        color: 'white',
        borderRadius: 'var(--border-radius)',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.75rem',
        fontWeight: 'bold',
      }}
    >
      <span style={{ color: getFpsColor(metrics.fps) }}>{metrics.fps}</span>
      <span style={{ opacity: 0.7 }}>fps</span>
    </div>
  );
}
