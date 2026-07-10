export function measureEndToEnd(fn: () => void): Promise<number> {
  return new Promise((resolve) => {
    const mark = `bench-${performance.now()}`;
    performance.mark(`${mark}-start`);
    fn();
    requestAnimationFrame(() => {
      setTimeout(() => {
        performance.mark(`${mark}-end`);
        const measure = performance.measure(
          mark,
          `${mark}-start`,
          `${mark}-end`,
        );
        performance.clearMarks(`${mark}-start`);
        performance.clearMarks(`${mark}-end`);
        performance.clearMeasures(mark);
        resolve(measure.duration);
      }, 0);
    });
  });
}
