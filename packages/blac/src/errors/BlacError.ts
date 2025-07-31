export enum ErrorCategory {
  LIFECYCLE = 'LIFECYCLE',
  STATE = 'STATE',
  PLUGIN = 'PLUGIN',
  VALIDATION = 'VALIDATION',
  DISPOSAL = 'DISPOSAL',
  CONSUMER = 'CONSUMER',
}

export enum ErrorSeverity {
  FATAL = 'FATAL', // System cannot continue
  ERROR = 'ERROR', // Operation failed but system continues
  WARNING = 'WARNING', // Potential issue but operation succeeded
  INFO = 'INFO', // Informational, not an error
}

export interface BlacErrorContext {
  blocName?: string;
  blocId?: string;
  consumerId?: string;
  pluginName?: string;
  operation?: string;
  metadata?: Record<string, unknown>;
}

export class BlacError extends Error {
  constructor(
    message: string,
    public readonly category: ErrorCategory,
    public readonly severity: ErrorSeverity,
    public readonly context?: BlacErrorContext,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'BlacError';

    // Ensure proper prototype chain
    Object.setPrototypeOf(this, BlacError.prototype);
  }

  toString(): string {
    const contextStr = this.context
      ? ` [${Object.entries(this.context)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ')}]`
      : '';

    return `${this.name} [${this.severity}/${this.category}]: ${this.message}${contextStr}`;
  }
}

export type ErrorHandler = (error: BlacError) => void;

export interface ErrorHandlingStrategy {
  shouldPropagate: (error: BlacError) => boolean;
  shouldLog: (error: BlacError) => boolean;
  handle: (error: BlacError) => void;
}

export const DefaultErrorStrategy: ErrorHandlingStrategy = {
  shouldPropagate: (error) => error.severity === ErrorSeverity.FATAL,
  shouldLog: (error) => error.severity !== ErrorSeverity.INFO,
  handle: (error) => {
    if (DefaultErrorStrategy.shouldLog(error)) {
      console.error(error.toString(), error.cause);
    }
  },
};
