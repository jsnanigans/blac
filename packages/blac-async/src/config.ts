export interface AsyncContext {
  kind: 'resource' | 'mutation';
  /** The state slot the call writes to. */
  key: string;
  host: object;
}

export interface AsyncConfig {
  /** Runs for every failed call, unless the call's own `onError` returns `false`. */
  onError?: (error: unknown, ctx: AsyncContext) => void;
  /** Runs after a mutation that set `success`. */
  onSuccess?: (message: string, ctx: AsyncContext & { data: unknown }) => void;
}

let config: AsyncConfig = {};

export function configureAsync(next: AsyncConfig): void {
  config = { ...config, ...next };
}

export function resetAsyncConfig(): void {
  config = {};
}

export const getAsyncConfig = (): AsyncConfig => config;

export function reportError(
  error: unknown,
  ctx: AsyncContext,
  onError?: (error: unknown) => boolean | void,
): void {
  if (onError?.(error) === false) return;
  config.onError?.(error, ctx);
}
