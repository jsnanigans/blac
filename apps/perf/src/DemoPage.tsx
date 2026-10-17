import React, { useEffect, useRef, useState } from 'react';
import { measure } from './harness/measure';
import { mount, type Mounted } from './harness/mount';
import { listLibraries } from './libraries/registry';
import { LIST_OPS } from './shared/list';
import { formatMs } from './shared/stats';
import type { ListAPI } from './shared/types';
import './demo.css';

const MAX_LOG_ENTRIES = 8;

interface TimingEntry {
  label: string;
  time: number;
  render: number;
}

/**
 * Manual list demo, served at `/demo`: trigger each list op by hand on any
 * library and watch the table render. Not part of the benchmark suite.
 */
export function DemoPage() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [libName, setLibName] = useState(listLibraries[0].name);
  const [bench, setBench] = useState<Mounted<ListAPI> | null>(null);
  const [log, setLog] = useState<TimingEntry[]>([]);

  useEffect(() => {
    const host = hostRef.current;
    const lib = listLibraries.find((l) => l.name === libName);
    if (!host || !lib) return;
    let mounted: Mounted<ListAPI> | null = null;
    let cancelled = false;
    void mount<ListAPI>(host, (onReady) => (
      <lib.Component onReady={onReady} />
    )).then((m) => {
      if (cancelled) void m.unmount();
      else setBench((mounted = m));
    });
    return () => {
      cancelled = true;
      setBench(null);
      void mounted?.unmount();
    };
  }, [libName]);

  const runTimed = async (label: string, fn: (api: ListAPI) => void) => {
    if (!bench) return;
    bench.timer.reset();
    try {
      const time = await measure(() => fn(bench.api));
      const entry = { label, time, render: bench.timer.total };
      setLog((prev) => [entry, ...prev].slice(0, MAX_LOG_ENTRIES));
    } catch (err) {
      // e.g. "Select row" on an empty table.
      console.error(err);
    }
  };

  return (
    <div className="demo-page">
      <h1>List demo</h1>
      <p>
        Trigger the list operations by hand. Each runs from the current table,
        without the benchmark&apos;s setup step.
      </p>

      <div className="demo-controls">
        <select value={libName} onChange={(e) => setLibName(e.target.value)}>
          {listLibraries.map((l) => (
            <option key={l.name}>{l.name}</option>
          ))}
        </select>
        {Object.values(LIST_OPS).map((op) => (
          <button
            key={op.label}
            type="button"
            disabled={!bench}
            onClick={() => void runTimed(op.label, op.run)}
          >
            {op.label}
          </button>
        ))}
      </div>

      <div className="demo-stats">
        {log.length === 0 ? (
          <p className="stat-detail">Trigger an operation to see timing.</p>
        ) : (
          <table className="results-table">
            <thead>
              <tr>
                <th>Operation</th>
                <th>Trigger to committed DOM</th>
                <th>React render</th>
              </tr>
            </thead>
            <tbody>
              {log.map((entry, i) => (
                <tr key={i}>
                  <td>{entry.label}</td>
                  <td>{formatMs(entry.time)}</td>
                  <td>{formatMs(entry.render)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div ref={hostRef} />
    </div>
  );
}
