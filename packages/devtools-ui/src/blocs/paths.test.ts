import { describe, it, expect, beforeEach } from 'vitest';
import { DevToolsDiffBloc } from './DevToolsDiffBloc';
import { DevToolsLogsBloc } from './DevToolsLogsBloc';

// ---------------------------------------------------------------------------
// DevToolsDiffBloc — paths field on StateSnapshot
// ---------------------------------------------------------------------------

describe('DevToolsDiffBloc.storePreviousState — paths', () => {
  let bloc: DevToolsDiffBloc;

  beforeEach(() => {
    bloc = new DevToolsDiffBloc();
  });

  it('stores paths: string[] on the snapshot', () => {
    bloc.storePreviousState('inst-1', { count: 0 }, undefined, undefined, [
      'count',
    ]);
    const [snapshot] = bloc.getHistory('inst-1');
    expect(snapshot.paths).toEqual(['count']);
  });

  it('stores paths: "all" on the snapshot', () => {
    bloc.storePreviousState(
      'inst-1',
      { count: 0 },
      undefined,
      undefined,
      'all',
    );
    const [snapshot] = bloc.getHistory('inst-1');
    expect(snapshot.paths).toBe('all');
  });

  it('omits paths field when not provided', () => {
    bloc.storePreviousState('inst-1', { count: 0 });
    const [snapshot] = bloc.getHistory('inst-1');
    expect(snapshot).not.toHaveProperty('paths');
  });
});

describe('DevToolsDiffBloc.loadInstanceHistory — paths', () => {
  let bloc: DevToolsDiffBloc;

  beforeEach(() => {
    bloc = new DevToolsDiffBloc();
  });

  it('carries paths from loaded snapshots', () => {
    bloc.loadInstanceHistory('inst-1', [
      { state: { count: 0 }, timestamp: 1000, paths: ['count'] },
      { state: { count: 1 }, timestamp: 2000, paths: 'all' },
    ]);
    const history = bloc.getHistory('inst-1');
    // loadInstanceHistory reverses (newest first), so index 0 = timestamp 2000
    expect(history[0].paths).toBe('all');
    expect(history[1].paths).toEqual(['count']);
  });

  it('omits paths when source snapshot has none', () => {
    bloc.loadInstanceHistory('inst-1', [
      { state: { count: 0 }, timestamp: 1000 },
    ]);
    const [snapshot] = bloc.getHistory('inst-1');
    expect(snapshot).not.toHaveProperty('paths');
  });
});

// ---------------------------------------------------------------------------
// DevToolsLogsBloc — paths field on LogEntry
// ---------------------------------------------------------------------------

describe('DevToolsLogsBloc.addLog — paths', () => {
  let bloc: DevToolsLogsBloc;

  beforeEach(() => {
    bloc = new DevToolsLogsBloc();
  });

  it('stores paths: string[] on the log entry', () => {
    bloc.addLog(
      'state-changed',
      'inst-1',
      'CounterCubit',
      undefined,
      undefined,
      undefined,
      undefined,
      ['count', 'user.name'],
    );
    const [entry] = bloc.state.logs;
    expect(entry.paths).toEqual(['count', 'user.name']);
  });

  it('stores paths: "all" on the log entry', () => {
    bloc.addLog(
      'state-changed',
      'inst-1',
      'CounterCubit',
      undefined,
      undefined,
      undefined,
      undefined,
      'all',
    );
    const [entry] = bloc.state.logs;
    expect(entry.paths).toBe('all');
  });

  it('omits paths when not provided', () => {
    bloc.addLog('state-changed', 'inst-1', 'CounterCubit');
    const [entry] = bloc.state.logs;
    expect(entry).not.toHaveProperty('paths');
  });
});
