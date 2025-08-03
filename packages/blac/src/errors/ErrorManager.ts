import {
  BlacError,
  ErrorHandler,
  ErrorHandlingStrategy,
  DefaultErrorStrategy,
} from './BlacError';

/**
 * Centralized error management system for BlaC framework.
 * Handles error processing, logging, and propagation strategies.
 */
export class ErrorManager {
  private static instance: ErrorManager;
  private handlers: Set<ErrorHandler> = new Set();
  private strategy: ErrorHandlingStrategy = DefaultErrorStrategy;

  /**
   * Get the singleton instance of ErrorManager
   */
  static getInstance(): ErrorManager {
    if (!ErrorManager.instance) {
      ErrorManager.instance = new ErrorManager();
    }
    return ErrorManager.instance;
  }

  /**
   * Set a custom error handling strategy
   */
  setStrategy(strategy: ErrorHandlingStrategy): void {
    this.strategy = strategy;
  }

  /**
   * Add a custom error handler that will be called for all errors
   */
  addHandler(handler: ErrorHandler): void {
    this.handlers.add(handler);
  }

  /**
   * Remove a previously added error handler
   */
  removeHandler(handler: ErrorHandler): void {
    this.handlers.delete(handler);
  }

  /**
   * Process an error through all handlers and apply the configured strategy
   */
  handle(error: BlacError): void {
    // Always notify handlers first
    this.handlers.forEach((handler) => {
      try {
        handler(error);
      } catch (handlerError) {
        // Prevent handler errors from breaking error handling
        console.error('Error in error handler:', handlerError);
      }
    });

    // Apply strategy
    this.strategy.handle(error);

    // Propagate if needed
    if (this.strategy.shouldPropagate(error)) {
      throw error;
    }
  }

  /**
   * Convenience method for wrapping operations with error handling
   */
  wrap<T>(operation: () => T, errorFactory: (error: unknown) => BlacError): T {
    try {
      return operation();
    } catch (error) {
      const blacError = errorFactory(error);
      this.handle(blacError);
      // Will only reach here if strategy says not to propagate
      return undefined as T;
    }
  }

  /**
   * Async version of wrap
   */
  async wrapAsync<T>(
    operation: () => Promise<T>,
    errorFactory: (error: unknown) => BlacError,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const blacError = errorFactory(error);
      this.handle(blacError);
      // Will only reach here if strategy says not to propagate
      return undefined as T;
    }
  }
}
