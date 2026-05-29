import { describe, it, expect, vi, beforeEach } from 'vite-plus/test';
import type { PluginContext, InstanceMetadata } from '@blac/core';
import { LoggingPlugin } from './LoggingPlugin';

// ALL_PATHS is Symbol.for('@dirtytalk/structural/ALL_PATHS') — use the symbol
// directly here to avoid a dist-level import gap (the re-export exists in
// @blac/core source but not yet in the published dist at lint time).
const ALL_PATHS: unique symbol = Symbol.for(
  '@dirtytalk/structural/ALL_PATHS',
) as any;

// ---------------------------------------------------------------------------
// Minimal test doubles
// ---------------------------------------------------------------------------

function makeInterner(paths: string[]): { lookup(id: number): string } {
  return {
    lookup(id: number): string {
      if (id < 0 || id >= paths.length) {
        throw new RangeError(`unknown PathId ${id}`);
      }
      return paths[id];
    },
  };
}

function makeMetadata(className = 'TestBloc', id = 'abc123'): InstanceMetadata {
  return {
    id,
    className,
    isDisposed: false,
    name: className,
    state: {},
    createdAt: Date.now(),
    hydrationStatus: 'idle',
    isHydrated: false,
    changedWhileHydrating: false,
  };
}

function makeCtx(
  metadata: InstanceMetadata,
  internerPaths: string[] = [],
): PluginContext {
  const interner = makeInterner(internerPaths);
  const instance: any = {
    interner,
  };
  return {
    container: instance,
    getInstanceMetadata: () => metadata,
    getState: () => metadata.state,
    getHydrationStatus: () => 'idle',
    startHydration: vi.fn(),
    applyHydratedState: vi.fn().mockReturnValue(true),
    finishHydration: vi.fn(),
    failHydration: vi.fn(),
    waitForHydration: vi.fn().mockResolvedValue(undefined),
    queryInstances: vi.fn().mockReturnValue([]),
    getAllTypes: vi.fn().mockReturnValue([]),
    getStats: vi.fn().mockReturnValue({
      registeredTypes: 0,
      totalInstances: 0,
      typeBreakdown: {},
    }),
    getRefIds: vi.fn().mockReturnValue([]),
  } as unknown as PluginContext;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('LoggingPlugin — onStateChange path decoding', () => {
  let logs: unknown[][];

  const makeLogger = () => ({
    log: (...args: unknown[]) => {
      logs.push(args);
    },
    warn: vi.fn(),
    error: vi.fn(),
    group: vi.fn(),
    groupEnd: vi.fn(),
    groupCollapsed: (...args: unknown[]) => {
      logs.push(['group:', ...args]);
    },
  });

  beforeEach(() => {
    logs = [];
  });

  it('logPaths: false (default) does not include Paths: line in output', () => {
    const logger = makeLogger();
    const plugin = new LoggingPlugin({ format: 'simple', logger });
    const metadata = makeMetadata();
    const internerPaths = ['alpha', 'beta'];
    const ctx = makeCtx(metadata, internerPaths);
    const paths = new Set([0, 1]);

    plugin.onStateChange(ctx, { x: 0 }, { x: 1 }, paths);

    const flatOutput = logs.map((row) => row.join(' ')).join('\n');
    // Path names must not appear (only decoded when logPaths: true)
    expect(flatOutput).not.toContain('alpha');
    expect(flatOutput).not.toContain('beta');
    expect(flatOutput).not.toContain('Paths:');
  });

  it('logPaths: true decodes path IDs using interner.lookup', () => {
    const logger = makeLogger();
    const plugin = new LoggingPlugin({
      format: 'simple',
      logger,
      logPaths: true,
    });
    const metadata = makeMetadata();
    const internerPaths = ['count', 'name'];
    const ctx = makeCtx(metadata, internerPaths);
    const paths = new Set([0, 1]);

    plugin.onStateChange(ctx, { count: 0 }, { count: 1 }, paths);

    const flatOutput = logs.map((row) => row.join(' ')).join('\n');
    expect(flatOutput).toContain('count');
    expect(flatOutput).toContain('name');
    expect(flatOutput).toContain('Paths:');
  });

  it('logPaths: true with ALL_PATHS emits <all>', () => {
    const logger = makeLogger();
    const plugin = new LoggingPlugin({
      format: 'simple',
      logger,
      logPaths: true,
    });
    const metadata = makeMetadata();
    const ctx = makeCtx(metadata, []);

    plugin.onStateChange(ctx, {}, {}, ALL_PATHS);

    const flatOutput = logs.map((row) => row.join(' ')).join('\n');
    expect(flatOutput).toContain('<all>');
  });

  it('logPaths: true with grouped format logs paths via logger.log', () => {
    const logger = makeLogger();
    const plugin = new LoggingPlugin({
      format: 'grouped',
      logger,
      logPaths: true,
    });
    const metadata = makeMetadata();
    const internerPaths = ['items'];
    const ctx = makeCtx(metadata, internerPaths);
    const paths = new Set([0]);

    plugin.onStateChange(ctx, {}, {}, paths);

    const pathsEntry = logs.find((row) => row[0] === 'Paths:');
    expect(pathsEntry).toBeDefined();
    expect(pathsEntry?.[1]).toEqual(['items']);
  });

  it('logPaths: false with ALL_PATHS does not log path info', () => {
    const logger = makeLogger();
    const plugin = new LoggingPlugin({
      format: 'simple',
      logger,
      logPaths: false,
    });
    const metadata = makeMetadata();
    const ctx = makeCtx(metadata, []);

    plugin.onStateChange(ctx, {}, {}, ALL_PATHS);

    const flatOutput = logs.map((row) => row.join(' ')).join('\n');
    expect(flatOutput).not.toContain('<all>');
    expect(flatOutput).not.toContain('Paths:');
  });
});
