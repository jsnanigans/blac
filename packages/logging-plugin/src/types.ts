import type { StateContainer } from '@blac/core';

export type LogLevel = 'minimal' | 'info' | 'debug' | 'verbose';

export type LogFormat = 'simple' | 'grouped';

export interface Logger {
  log(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  group?(label: string): void;
  groupEnd?(): void;
  groupCollapsed?(label: string): void;
}

export interface FilterContext {
  instance: StateContainer<any>;
  className: string;
  instanceId: string;
  isIsolated: boolean;
}

export type FilterFn = (ctx: FilterContext) => boolean;

export interface LoggingPluginConfig {
  /** Log verbosity level (default: 'info') */
  level?: LogLevel;

  /** Output format (default: 'grouped') */
  format?: LogFormat;

  /** Custom logger implementation (default: console) */
  logger?: Logger;

  /** Filter which instances to log */
  filter?: FilterFn;

  /** Include class names to log (whitelist) */
  include?: string[];

  /** Exclude class names from logging (blacklist) */
  exclude?: string[];

  /** Log instance creation/disposal (default: true) */
  logLifecycle?: boolean;

  /** Log state changes (default: true) */
  logStateChanges?: boolean;

  /** Log Vertex events (default: true) */
  logEvents?: boolean;

  /** Include callstack in state change logs (default: false) */
  includeCallstack?: boolean;

  /** Warn when instance count exceeds threshold (default: 50) */
  instanceCountWarningThreshold?: number;

  /** Warn on rapid init/dispose cycles (default: true) */
  detectRapidLifecycles?: boolean;

  /** Time window for rapid lifecycle detection in ms (default: 1000) */
  rapidLifecycleWindowMs?: number;

  /** Number of cycles in window to trigger warning (default: 5) */
  rapidLifecycleThreshold?: number;

  /** Log prefix (default: '[BlaC]') */
  prefix?: string;
}

export interface ResolvedConfig {
  level: LogLevel;
  format: LogFormat;
  logger: Logger;
  filter: FilterFn | undefined;
  include: string[] | undefined;
  exclude: string[] | undefined;
  logLifecycle: boolean;
  logStateChanges: boolean;
  logEvents: boolean;
  includeCallstack: boolean;
  instanceCountWarningThreshold: number;
  detectRapidLifecycles: boolean;
  rapidLifecycleWindowMs: number;
  rapidLifecycleThreshold: number;
  prefix: string;
}

export function resolveConfig(
  config: LoggingPluginConfig = {},
): ResolvedConfig {
  return {
    level: config.level ?? 'info',
    format: config.format ?? 'grouped',
    logger: config.logger ?? console,
    filter: config.filter,
    include: config.include,
    exclude: config.exclude,
    logLifecycle: config.logLifecycle ?? true,
    logStateChanges: config.logStateChanges ?? true,
    logEvents: config.logEvents ?? true,
    includeCallstack: config.includeCallstack ?? false,
    instanceCountWarningThreshold: config.instanceCountWarningThreshold ?? 50,
    detectRapidLifecycles: config.detectRapidLifecycles ?? true,
    rapidLifecycleWindowMs: config.rapidLifecycleWindowMs ?? 1000,
    rapidLifecycleThreshold: config.rapidLifecycleThreshold ?? 5,
    prefix: config.prefix ?? '[BlaC]',
  };
}
