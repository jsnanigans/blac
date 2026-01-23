/**
 * Stack trace utilities for DevTools
 */

/**
 * Capture and parse the current call stack
 * Filters out internal BlaC framework calls to show only user code
 */
export function captureStackTrace(): string {
  const error = new Error();
  const stack = error.stack || '';

  // Parse stack trace lines
  const lines = stack.split('\n');

  // Skip the first line (Error message) and this function's frame
  const relevantLines = lines.slice(1);

  // Filter out internal BlaC framework calls
  const userCodeLines = relevantLines.filter((line) => {
    // Skip if line is empty
    if (!line.trim()) return false;

    // Skip internal BlaC calls (StateContainer.emit, update, etc.)
    if (
      line.includes('StateContainer.emit') ||
      line.includes('StateContainer.update') ||
      line.includes('Cubit.patch') ||
      line.includes('captureStackTrace')
    ) {
      return false;
    }

    return true;
  });

  // Return cleaned stack trace
  return userCodeLines.join('\n').trim();
}

/**
 * Parse a stack trace string into structured data
 */
export interface StackFrame {
  functionName: string;
  fileName: string;
  lineNumber: number | null;
  columnNumber: number | null;
}

export function parseStackTrace(stack: string): StackFrame[] {
  const lines = stack.split('\n');
  const frames: StackFrame[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Chrome/V8 format: "    at functionName (file:line:col)"
    // Firefox format: "functionName@file:line:col"
    const chromeMatch = trimmed.match(
      /at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?/,
    );
    const firefoxMatch = trimmed.match(/(.+?)@(.+?):(\d+):(\d+)/);

    if (chromeMatch) {
      frames.push({
        functionName: chromeMatch[1] || '<anonymous>',
        fileName: chromeMatch[2],
        lineNumber: parseInt(chromeMatch[3], 10),
        columnNumber: parseInt(chromeMatch[4], 10),
      });
    } else if (firefoxMatch) {
      frames.push({
        functionName: firefoxMatch[1] || '<anonymous>',
        fileName: firefoxMatch[2],
        lineNumber: parseInt(firefoxMatch[3], 10),
        columnNumber: parseInt(firefoxMatch[4], 10),
      });
    }
  }

  return frames;
}
