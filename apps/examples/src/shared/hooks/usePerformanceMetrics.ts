import { useEffect, useRef, useState } from 'react';

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  fps: number;
  avgFps: number;
  memoryUsed: number; // MB
  renderTime: number; // ms
  renderCount: number;
}

/**
 * Hook for tracking real-time performance metrics.
 *
 * Tracks:
 * - FPS (frames per second)
 * - Average FPS over time
 * - Memory usage (if available)
 * - Render time
 * - Total render count
 *
 * @param enabled - Whether to enable performance tracking (default: true)
 * @returns Current performance metrics
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const metrics = usePerformanceMetrics();
 *   return <div>FPS: {metrics.fps}</div>;
 * }
 * ```
 */
export function usePerformanceMetrics(enabled = true): PerformanceMetrics {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    avgFps: 60,
    memoryUsed: 0,
    renderTime: 0,
    renderCount: 0,
  });

  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(performance.now());
  const renderCountRef = useRef<number>(0);
  const fpsHistoryRef = useRef<number[]>([]);
  const rafIdRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!enabled) return;

    const measurePerformance = () => {
      const now = performance.now();
      const delta = now - lastFrameTimeRef.current;
      lastFrameTimeRef.current = now;

      // Track frame times for accurate FPS calculation
      frameTimesRef.current.push(delta);
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift();
      }

      // Calculate current FPS
      const avgDelta =
        frameTimesRef.current.reduce((a, b) => a + b, 0) /
        frameTimesRef.current.length;
      const currentFps = Math.round(1000 / avgDelta);

      // Track FPS history for average
      fpsHistoryRef.current.push(currentFps);
      if (fpsHistoryRef.current.length > 120) {
        fpsHistoryRef.current.shift();
      }

      const avgFps = Math.round(
        fpsHistoryRef.current.reduce((a, b) => a + b, 0) /
          fpsHistoryRef.current.length,
      );

      // Get memory usage if available
      let memoryUsed = 0;
      if ('memory' in performance && (performance as any).memory) {
        const memory = (performance as any).memory;
        memoryUsed = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      }

      // Update metrics every 500ms to avoid excessive re-renders
      if (renderCountRef.current % 30 === 0) {
        setMetrics({
          fps: currentFps,
          avgFps,
          memoryUsed,
          renderTime: Math.round(avgDelta * 10) / 10,
          renderCount: renderCountRef.current,
        });
      }

      rafIdRef.current = requestAnimationFrame(measurePerformance);
    };

    rafIdRef.current = requestAnimationFrame(measurePerformance);
    renderCountRef.current++;

    return () => {
      if (rafIdRef.current !== undefined) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [enabled]);

  return metrics;
}

/**
 * Hook for measuring component render duration.
 * Useful for identifying performance bottlenecks.
 *
 * @returns Render duration in milliseconds
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const renderDuration = useRenderDuration();
 *   console.log(`Rendered in ${renderDuration}ms`);
 * }
 * ```
 */
export function useRenderDuration(): number {
  const startTimeRef = useRef<number>(performance.now());
  const [duration, setDuration] = useState<number>(0);

  useEffect(() => {
    const endTime = performance.now();
    const renderTime = endTime - startTimeRef.current;
    setDuration(renderTime);
    startTimeRef.current = performance.now();
  });

  return duration;
}
