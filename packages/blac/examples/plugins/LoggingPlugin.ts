import { BlacPlugin, ErrorContext, BlocBase, Bloc } from '@blac/core';

/**
 * Example system-wide logging plugin
 */
export class LoggingPlugin implements BlacPlugin {
  readonly name = 'logging';
  readonly version = '1.0.0';
  
  private readonly prefix: string;
  private readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  
  constructor(options: {
    prefix?: string;
    logLevel?: 'debug' | 'info' | 'warn' | 'error';
  } = {}) {
    this.prefix = options.prefix || '[BlaC]';
    this.logLevel = options.logLevel || 'info';
  }
  
  beforeBootstrap(): void {
    this.log('info', 'BlaC system bootstrapping...');
  }
  
  afterBootstrap(): void {
    this.log('info', 'BlaC system bootstrap complete');
  }
  
  onBlocCreated(bloc: BlocBase<any>): void {
    this.log('debug', `Bloc created: ${bloc._name}:${bloc._id}`);
  }
  
  onBlocDisposed(bloc: BlocBase<any>): void {
    this.log('debug', `Bloc disposed: ${bloc._name}:${bloc._id}`);
  }
  
  onStateChanged(bloc: BlocBase<any>, previousState: any, currentState: any): void {
    this.log('debug', `State changed in ${bloc._name}:${bloc._id}`, {
      previousState,
      currentState
    });
  }
  
  onEventAdded(bloc: Bloc<any, any>, event: any): void {
    this.log('debug', `Event added to ${bloc._name}:${bloc._id}`, { event });
  }
  
  onError(error: Error, bloc: BlocBase<unknown>, context: ErrorContext): void {
    this.log('error', `Error in ${bloc._name}:${bloc._id} during ${context.phase}`, {
      error: error.message,
      stack: error.stack,
      context
    });
  }
  
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any): void {
    const levels = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.logLevel);
    const messageLevelIndex = levels.indexOf(level);
    
    if (messageLevelIndex >= currentLevelIndex) {
      const timestamp = new Date().toISOString();
      const logMessage = `${this.prefix} [${timestamp}] ${message}`;
      
      switch (level) {
        case 'debug':
          console.debug(logMessage, data);
          break;
        case 'info':
          console.log(logMessage, data);
          break;
        case 'warn':
          console.warn(logMessage, data);
          break;
        case 'error':
          console.error(logMessage, data);
          break;
      }
    }
  }
}