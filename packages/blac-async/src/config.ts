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
  /** Return `true` to retry a failed call once, e.g. after a token refresh. */
  retryOn?: (error: unknown, ctx: AsyncContext) => boolean | Promise<boolean>;
}

let config: AsyncConfig = {};

export function configureAsync(next: AsyncConfig): void {
  config = { ...config, ...next };
}

export function resetAsyncConfig(): void {
  config = {};
}

export const getAsyncConfig = (): AsyncConfig => config;

export async function callWithRetry<T>(
  call: () => Promise<T>,
  ctx: AsyncContext,
): Promise<T> {
  try {
    return await call();
  } catch (error) {
    if (!(await config.retryOn?.(error, ctx))) throw error;
    return call();
  }
}

export function reportError(
  error: unknown,
  ctx: AsyncContext,
  onError?: (error: unknown) => boolean | void,
): void {
  if (onError?.(error) === false) return;
  config.onError?.(error, ctx);
}
