import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Blac, Cubit, RerenderLogger } from '@blac/core';
import { RenderLoggingPlugin } from '@blac/plugin-render-logging';
import useBloc from '../useBloc';

class TestCubit extends Cubit<{ count: number; name: string }> {
  constructor() {
    super({ count: 0, name: 'test' });
  }

  increment = () => this.emit({ ...this.state, count: this.state.count + 1 });
  changeName = (name: string) => this.emit({ ...this.state, name });
  changeAll = () => this.emit({ count: this.state.count + 1, name: 'changed' });
}

describe('Rerender Logging', () => {
  let consoleSpy: any;
  let plugin: RenderLoggingPlugin;

  beforeEach(() => {
    Blac.resetInstance();
    RerenderLogger.clear();
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      group: vi.spyOn(console, 'group').mockImplementation(() => {}),
      groupEnd: vi.spyOn(console, 'groupEnd').mockImplementation(() => {}),
      table: vi.spyOn(console, 'table').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    consoleSpy.log.mockRestore();
    consoleSpy.group.mockRestore();
    consoleSpy.groupEnd.mockRestore();
    consoleSpy.table.mockRestore();
    // Remove plugin if it was added
    if (plugin) {
      Blac.getInstance().plugins.remove(plugin.name);
    }
  });

  it('should not log when rerender logging is disabled', () => {
    // No plugin registered
    const { result } = renderHook(() => useBloc(TestCubit));

    act(() => {
      result.current[1].increment();
    });

    expect(consoleSpy.log).not.toHaveBeenCalled();
  });

  it('should log rerenders when enabled with minimal level', () => {
    plugin = new RenderLoggingPlugin({ enabled: true, level: 'minimal' });
    Blac.getInstance().plugins.add(plugin);

    const { result } = renderHook(() => useBloc(TestCubit));

    // Clear logs from mount
    consoleSpy.log.mockClear();

    act(() => {
      result.current[1].increment();
    });

    expect(consoleSpy.log).toHaveBeenCalled();
    const logCall = consoleSpy.log.mock.calls[0][0];
    expect(logCall).toContain('#2'); // Second render (first is mount)
  });

  it('should log state changes with normal level', () => {
    plugin = new RenderLoggingPlugin({ enabled: true, level: 'normal' });
    Blac.getInstance().plugins.add(plugin);

    const { result } = renderHook(() => useBloc(TestCubit));

    // Clear logs from mount
    consoleSpy.log.mockClear();

    act(() => {
      result.current[1].increment();
    });

    expect(consoleSpy.log).toHaveBeenCalled();
    const logCall = consoleSpy.log.mock.calls[0];
    expect(logCall.join(' ')).toContain('State changed');
    expect(logCall.join(' ')).toContain('(entire state)'); // Without proxy tracking individual properties
  });

  it('should log detailed information with detailed level', () => {
    plugin = new RenderLoggingPlugin({ enabled: true, level: 'detailed' });
    Blac.getInstance().plugins.add(plugin);

    const { result } = renderHook(() => useBloc(TestCubit));

    // Clear logs from mount
    consoleSpy.log.mockClear();
    consoleSpy.group.mockClear();
    consoleSpy.table.mockClear();

    act(() => {
      result.current[1].increment();
    });

    expect(consoleSpy.group).toHaveBeenCalled();
    expect(consoleSpy.table).toHaveBeenCalled();

    const tableData = consoleSpy.table.mock.calls[0][0];
    // Since we haven't accessed specific properties, it shows '(entire state)'
    expect(tableData).toHaveProperty('(entire state)');
    expect(tableData['(entire state)']).toHaveProperty('old');
    expect(tableData['(entire state)']).toHaveProperty('new');
  });

  it('should track dependency changes when using manual dependencies', () => {
    plugin = new RenderLoggingPlugin({ enabled: true, level: 'normal' });
    Blac.getInstance().plugins.add(plugin);

    let depValue = 1;
    const { result, rerender } = renderHook(() =>
      useBloc(TestCubit, {
        dependencies: () => [depValue],
      }),
    );

    // Clear logs from mount
    consoleSpy.log.mockClear();

    // Change dependency
    depValue = 2;
    rerender();

    expect(consoleSpy.log).toHaveBeenCalled();
    const logCall = consoleSpy.log.mock.calls[0];
    const logMessage = logCall.join(' ');

    // The plugin logs "Manual dependencies changed" in the description
    expect(logMessage).toContain('Manual dependencies changed');
    // Verify it's logged as a dependency change (check for the emoji)
    expect(logMessage).toContain('🔗');
  });

  it('should respect filter function', () => {
    plugin = new RenderLoggingPlugin({
      enabled: true,
      filter: ({ blocName }) => blocName !== 'TestCubit',
    });
    Blac.getInstance().plugins.add(plugin);

    const { result } = renderHook(() => useBloc(TestCubit));

    act(() => {
      result.current[1].increment();
    });

    expect(consoleSpy.log).not.toHaveBeenCalled();
  });

  it('should group consecutive rerenders when groupRerenders is enabled', async () => {
    plugin = new RenderLoggingPlugin({
      enabled: true,
      groupRerenders: true,
    });
    Blac.getInstance().plugins.add(plugin);

    const { result } = renderHook(() => useBloc(TestCubit));

    // Clear logs from mount
    consoleSpy.log.mockClear();
    consoleSpy.group.mockClear();

    // Multiple rapid state changes - React may batch these
    act(() => {
      result.current[1].increment();
    });

    act(() => {
      result.current[1].increment();
    });

    act(() => {
      result.current[1].increment();
    });

    // Wait for debounce
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(consoleSpy.group).toHaveBeenCalled();
    const groupCall = consoleSpy.group.mock.calls[0][0];
    // Should have at least 2 renders (React may batch some updates)
    expect(groupCall).toMatch(/rendered \d+ times/);
    // Verify it grouped multiple renders
    expect(
      parseInt(groupCall.match(/rendered (\d+) times/)?.[1] || '0'),
    ).toBeGreaterThanOrEqual(2);
  });

  it('should track multiple state properties changes', () => {
    plugin = new RenderLoggingPlugin({ enabled: true, level: 'normal' });
    Blac.getInstance().plugins.add(plugin);

    const { result } = renderHook(() => useBloc(TestCubit));

    // Clear logs from mount
    consoleSpy.log.mockClear();

    // Change all properties
    act(() => {
      result.current[1].changeAll();
    });

    expect(consoleSpy.log).toHaveBeenCalled();
    const logCall = consoleSpy.log.mock.calls[0].join(' ');
    expect(logCall).toContain('(entire state)'); // Without proxy tracking, all properties changed
  });

  it('should show mount reason for first render', () => {
    plugin = new RenderLoggingPlugin({ enabled: true });
    Blac.getInstance().plugins.add(plugin);

    renderHook(() => useBloc(TestCubit));

    expect(consoleSpy.log).toHaveBeenCalled();
    const logCall = consoleSpy.log.mock.calls[0];
    expect(logCall.join(' ')).toContain('mount');
    expect(logCall.join(' ')).toContain('Component mounted');
  });

  it('should include stack trace in detailed mode when enabled', () => {
    plugin = new RenderLoggingPlugin({
      enabled: true,
      level: 'detailed',
      includeStackTrace: true,
    });
    Blac.getInstance().plugins.add(plugin);

    const { result } = renderHook(() => useBloc(TestCubit));

    // Clear logs from mount
    consoleSpy.log.mockClear();
    consoleSpy.group.mockClear();

    act(() => {
      result.current[1].increment();
    });

    // In detailed mode with stack trace, it logs the stack
    const logCalls = consoleSpy.log.mock.calls;
    const hasStackTrace = logCalls.some((call) =>
      call.some(
        (arg) => typeof arg === 'string' && arg.includes('Stack trace:'),
      ),
    );
    expect(hasStackTrace).toBe(true);
  });
});
