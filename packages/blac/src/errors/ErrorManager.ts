import {
  BlacError,
  ErrorHandler,
  ErrorHandlingStrategy,
  DefaultErrorStrategy,
} from './BlacError';

export class ErrorManager {
  private static instance: ErrorManager;
  private handlers: Set<ErrorHandler> = new Set();
  private strategy: ErrorHandlingStrategy = DefaultErrorStrategy;

  static getInstance(): ErrorManager {
    if (!ErrorManager.instance) {
      ErrorManager.instance = new ErrorManager();
    }
    return ErrorManager.instance;
  }

  setStrategy(strategy: ErrorHandlingStrategy): void {
    this.strategy = strategy;
  }

  addHandler(handler: ErrorHandler): void {
    this.handlers.add(handler);
  }

  removeHandler(handler: ErrorHandler): void {
    this.handlers.delete(handler);
  }

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
