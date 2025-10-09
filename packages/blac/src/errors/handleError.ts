import {
  BlacError,
  ErrorCategory,
  ErrorSeverity,
  BlacErrorContext,
} from './BlacError';
import { ErrorManager } from './ErrorManager';

/**
 * Standard error handling helper for BlaC
 *
 * Usage:
 * - For fatal errors that should propagate: handleError.fatal(...)
 * - For recoverable errors: handleError.error(...)
 * - For warnings: handleError.warn(...)
 */
export const handleError = {
  fatal: (
    message: string,
    category: ErrorCategory,
    context?: BlacErrorContext,
    cause?: unknown,
  ): never => {
    const error = new BlacError(
      message,
      category,
      ErrorSeverity.FATAL,
      context,
      cause,
    );
    ErrorManager.getInstance().handle(error);
    // This will always throw due to FATAL severity
    throw error;
  },

  error: (
    message: string,
    category: ErrorCategory,
    context?: BlacErrorContext,
    cause?: unknown,
  ): void => {
    const error = new BlacError(
      message,
      category,
      ErrorSeverity.ERROR,
      context,
      cause,
    );
    ErrorManager.getInstance().handle(error);
  },

  warn: (
    message: string,
    category: ErrorCategory,
    context?: BlacErrorContext,
    cause?: unknown,
  ): void => {
    const error = new BlacError(
      message,
      category,
      ErrorSeverity.WARNING,
      context,
      cause,
    );
    ErrorManager.getInstance().handle(error);
  },

  info: (
    message: string,
    category: ErrorCategory,
    context?: BlacErrorContext,
  ): void => {
    const error = new BlacError(message, category, ErrorSeverity.INFO, context);
    ErrorManager.getInstance().handle(error);
  },

  /**
   * Wraps a function to catch and handle errors
   */
  wrap: <T>(
    fn: () => T,
    category: ErrorCategory,
    context?: BlacErrorContext,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
  ): T | undefined => {
    try {
      return fn();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      const error = new BlacError(message, category, severity, context, cause);
      ErrorManager.getInstance().handle(error);
      return undefined;
    }
  },

  /**
   * Wraps an async function to catch and handle errors
   */
  wrapAsync: async <T>(
    fn: () => Promise<T>,
    category: ErrorCategory,
    context?: BlacErrorContext,
    severity: ErrorSeverity = ErrorSeverity.ERROR,
  ): Promise<T | undefined> => {
    try {
      return await fn();
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : String(cause);
      const error = new BlacError(message, category, severity, context, cause);
      ErrorManager.getInstance().handle(error);
      return undefined;
    }
  },
};
