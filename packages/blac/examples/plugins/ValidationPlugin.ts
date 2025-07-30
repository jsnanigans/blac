import { BlocPlugin, PluginCapabilities, ErrorContext } from '@blac/core';

/**
 * Example validation plugin that prevents invalid state transitions
 */
export class ValidationPlugin<TState> implements BlocPlugin<TState> {
  readonly name = 'validation';
  readonly version = '1.0.0';
  readonly capabilities: PluginCapabilities = {
    readState: true,
    transformState: true,
    interceptEvents: false,
    persistData: false,
    accessMetadata: false
  };
  
  private validator: (state: TState) => boolean | string;
  
  constructor(validator: (state: TState) => boolean | string) {
    this.validator = validator;
  }
  
  transformState(previousState: TState, nextState: TState): TState {
    const result = this.validator(nextState);
    
    if (result === true) {
      // Valid state
      return nextState;
    } else if (result === false) {
      // Invalid state, reject change
      console.warn('State change rejected by validation plugin');
      return previousState;
    } else {
      // Validation error message
      console.error(`State validation failed: ${result}`);
      return previousState;
    }
  }
  
  onError(error: Error, context: ErrorContext): void {
    console.error(`Validation plugin error during ${context.phase}:`, error);
  }
}

/**
 * Example: Numeric range validation plugin
 */
export class RangeValidationPlugin implements BlocPlugin<number> {
  readonly name = 'range-validation';
  readonly version = '1.0.0';
  readonly capabilities: PluginCapabilities = {
    readState: true,
    transformState: true,
    interceptEvents: false,
    persistData: false,
    accessMetadata: false
  };
  
  constructor(
    private min: number,
    private max: number
  ) {}
  
  transformState(previousState: number, nextState: number): number {
    if (nextState < this.min) {
      console.warn(`Value ${nextState} is below minimum ${this.min}`);
      return this.min;
    }
    if (nextState > this.max) {
      console.warn(`Value ${nextState} is above maximum ${this.max}`);
      return this.max;
    }
    return nextState;
  }
}