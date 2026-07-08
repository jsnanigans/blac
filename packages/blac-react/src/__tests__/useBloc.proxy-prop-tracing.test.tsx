/**
 * Proxy-prop tracing experiment.
 *
 * A parent component calls useBloc(DemoBloc) and passes a PROXY value
 * (state.data[i]) as a prop to a memoized child. The child does NOT call
 * useBloc — it reads the proxy prop directly. We install a tracker trace hook
 * (__setTrackTrace) and interleave it with React lifecycle logs into one
 * timeline, to observe:
 *   - WHEN state is read through the proxy (render vs effect vs post-commit),
 *   - WHICH trackRender instance (owner) each recorded path lands in, vs which
 *     component was rendering at the time (phase) — i.e. child reads polluting
 *     the parent's path set,
 *   - WHEN the disarm() freeze fires and turns later reads into pass-throughs.
 *
 * This is a documentation/observation test; assertions are intentionally light.
 */

import { writeFileSync } from 'node:fs';
import { render, act } from '@testing-library/react';
import React, { memo, useEffect, useLayoutEffect } from 'react';
import { Cubit } from '@blac/core';
import { useBloc } from '../useBloc';
import { describe, it, expect, beforeEach, afterEach } from 'vite-plus/test';
import { blacTestSetup } from '@blac/core/testing';
import { __setTrackTrace, type TrackTraceEvent } from '@dirtytalk/structural';

interface Item {
  id: number;
  label: string;
}
interface DemoState {
  data: Item[];
  selected: number | null;
}

class DemoBloc extends Cubit<DemoState> {
  constructor() {
    super({
      data: [
        { id: 1, label: 'one' },
        { id: 2, label: 'two' },
        { id: 3, label: 'three' },
      ],
      selected: null,
    });
  }

  renameFirst = (): void => {
    const data = this.state.data.slice();
    data[0] = { id: data[0].id, label: data[0].label + '!' };
    this.emit({ ...this.state, data });
  };
}

blacTestSetup();

// ---- shared timeline state ----
let seq = 0;
let phase = '(idle)';
const timeline: string[] = [];
const events: Array<{ phase: string; e: TrackTraceEvent; owner: string }> = [];
const instanceOwner = new Map<number, string>();

const rec = (msg: string): void => {
  timeline.push(`${String(++seq).padStart(3, ' ')} [${phase.padEnd(6)}] ${msg}`);
};

const onTrace = (e: TrackTraceEvent): void => {
  if (e.kind === 'root-wrap') instanceOwner.set(e.instance, phase);
  const owner = instanceOwner.get(e.instance) ?? '?';
  const loc =
    e.path ?? (e.key ? `${e.prefix}.${e.key}` : e.prefix === '' ? '(root)' : e.prefix);
  events.push({ phase, e, owner });
  rec(
    `PROXY  ${e.kind.padEnd(12)} inst#${e.instance}(owner=${owner}) ${loc} armed=${e.armed}`,
  );
};

// Latest proxy state captured from the parent's render, for a post-commit read.
let capturedState: DemoState | null = null;

const Child = memo(function Child({ item }: { item: Item }) {
  phase = 'Child';
  rec('RENDER Child begin');
  useLayoutEffect(() => {
    phase = 'Child';
    rec('Child layoutEffect mount');
    return () => rec('Child layoutEffect cleanup');
  }, []);
  useEffect(() => {
    phase = 'Child';
    rec('Child effect mount — reads item.label AFTER render');
    rec(`  -> item.label = ${item.label}`);
    return () => rec('Child effect cleanup');
  }, [item]);
  // Reads during render: item is the PARENT's proxy, so these record into the
  // parent's trackRender instance even though phase === 'Child'.
  const id = item.id;
  const label = item.label;
  rec(`RENDER Child end (read id=${id} label=${label})`);
  return <span data-testid={`child-${id}`}>{label}</span>;
});

function Parent(): React.ReactElement {
  phase = 'Parent';
  rec('RENDER Parent begin');
  const [state] = useBloc(DemoBloc);
  capturedState = state;
  useLayoutEffect(() => {
    phase = 'Parent';
    rec('Parent layoutEffect mount');
    return () => rec('Parent layoutEffect cleanup');
  }, []);
  useEffect(() => {
    phase = 'Parent';
    rec('Parent effect mount — reads state.data[0].label AFTER render');
    rec(`  -> state.data[0].label = ${state.data[0].label}`);
    return () => rec('Parent effect cleanup');
  }, [state]);
  rec(`RENDER Parent: mapping ${state.data.length} rows`);
  const rows = state.data.map((item) => <Child key={item.id} item={item} />);
  rec('RENDER Parent end');
  return <div>{rows}</div>;
}

describe('useBloc — proxy-prop tracing experiment', () => {
  beforeEach(() => {
    seq = 0;
    phase = '(idle)';
    timeline.length = 0;
    events.length = 0;
    instanceOwner.clear();
    capturedState = null;
    __setTrackTrace(onTrace);
  });

  afterEach(() => {
    __setTrackTrace(null);
  });

  it('logs proxy access + lifecycle interleaving for a proxy passed to a child', async () => {
    let bloc: DemoBloc | null = null;
    function Harness(): React.ReactElement {
      // second consumer only to grab the bloc handle for the update
      const [, b] = useBloc(DemoBloc);
      bloc = b;
      return <Parent />;
    }

    rec('=== INITIAL MOUNT ===');
    await act(async () => {
      render(<Harness />);
    });

    rec('=== FLUSH MICROTASKS (disarm fires here) ===');
    await act(async () => {
      await Promise.resolve();
    });

    phase = 'TEST';
    rec('=== POST-COMMIT READ of captured proxy (expect pass-through) ===');
    void capturedState!.data[0].label;

    rec('=== UPDATE: renameFirst() ===');
    await act(async () => {
      bloc!.renameFirst();
    });
    await act(async () => {
      await Promise.resolve();
    });

    rec('=== UNMOUNT ===');
    // (RTL cleanup handles unmount; log marker only)

    // Dump the unified timeline to a file (test-runner swallows console).
    writeFileSync(
      '/private/tmp/claude-502/-Users-brendanmullins-Projects-blac/dc0e3b22-5e20-4a91-a792-415b27758b16/scratchpad/timeline.txt',
      '================= TIMELINE =================\n' +
        timeline.join('\n') +
        '\n===========================================\n',
    );

    // Light assertions that document the key findings:
    // 1) The child's render recorded a path into the PARENT's proxy instance.
    const childPollutesParent = events.some(
      (x) =>
        x.phase === 'Child' && x.e.kind === 'record' && x.owner === 'Parent',
    );
    // 2) A read after disarm produced a pass-through (the freeze works).
    const sawPassThrough = events.some((x) => x.e.kind === 'pass-through');
    // 3) The proxy tree was frozen at least once.
    const sawDisarm = events.some((x) => x.e.kind === 'disarm');

    // eslint-disable-next-line no-console
    console.log('findings:', { childPollutesParent, sawPassThrough, sawDisarm });

    expect(sawDisarm).toBe(true);
    expect(childPollutesParent).toBe(true);
  });
});
