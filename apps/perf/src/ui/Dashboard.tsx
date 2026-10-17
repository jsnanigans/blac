import React, { useMemo, useRef, useState } from 'react';
import { ComparisonTable } from './ComparisonTable';
import {
  NO_RESULTS,
  SUITES,
  SUITE_KEYS,
  runSuite,
  type Results,
  type Selection,
  type SuiteKey,
} from './suites';
import {
  currentEnvironment,
  listTables,
  pureTables,
  rerenderTables,
  toMarkdown,
  type Table,
} from './tables';

type Tab = SuiteKey | 'report';

const initialSelection = (): Record<SuiteKey, Selection> => {
  const out = {} as Record<SuiteKey, Selection>;
  for (const key of SUITE_KEYS) {
    const s = SUITES[key];
    out[key] = {
      libs: new Set(s.libraries),
      items: new Set(s.items.map((i) => i.key)),
      config: s.defaults,
    };
  }
  return out;
};

const tablesFor = (r: Results): Record<SuiteKey, Table[]> => ({
  list: listTables(r.list),
  rerender: rerenderTables(r.rerender),
  pure: pureTables(r.pure, r.memory),
});

const toggled = (set: Set<string>, key: string): Set<string> => {
  const next = new Set(set);
  if (!next.delete(key)) next.add(key);
  return next;
};

function download(name: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function Checklist(props: {
  legend: string;
  options: { key: string; label: string }[];
  selected: Set<string>;
  disabled: boolean;
  onChange: (next: Set<string>) => void;
}) {
  return (
    <fieldset>
      <legend>{props.legend}</legend>
      {props.options.map((o) => (
        <label key={o.key} className="checkbox-label">
          <input
            type="checkbox"
            checked={props.selected.has(o.key)}
            disabled={props.disabled}
            onChange={() => props.onChange(toggled(props.selected, o.key))}
          />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}

function NumberInput(props: {
  label: string;
  value: number;
  min: number;
  disabled: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <label className="config-label">
      {props.label}
      <input
        type="number"
        min={props.min}
        value={props.value}
        disabled={props.disabled}
        onChange={(e) =>
          props.onChange(Math.max(props.min, Number(e.target.value) || 0))
        }
      />
    </label>
  );
}

export function Dashboard() {
  const [tab, setTab] = useState<Tab>('list');
  const [selection, setSelection] = useState(initialSelection);
  const [results, setResults] = useState<Results>(NO_RESULTS);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const hostRef = useRef<HTMLDivElement>(null);

  const tables = useMemo(() => tablesFor(results), [results]);
  const report = useMemo(
    () =>
      toMarkdown(
        currentEnvironment(),
        SUITE_KEYS.flatMap((k) => tables[k]),
      ),
    [tables],
  );

  const update = (key: SuiteKey, patch: Partial<Selection>) =>
    setSelection((s) => ({ ...s, [key]: { ...s[key], ...patch } }));

  const run = async (keys: SuiteKey[]) => {
    const host = hostRef.current;
    if (!host) return;
    setRunning(true);
    try {
      for (const key of keys) {
        const out = await runSuite(key, selection[key], host, setProgress);
        setResults((r) => ({ ...r, ...out }));
      }
      setProgress('');
      if (keys.length > 1) setTab('report');
    } catch (err) {
      console.error(err);
      setProgress(`Failed: ${String(err)}`);
    } finally {
      setRunning(false);
    }
  };

  const suite = tab === 'report' ? null : SUITES[tab];
  const sel = tab === 'report' ? null : selection[tab];

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>State management benchmarks</h1>
        {import.meta.env.DEV && (
          <p className="warning">
            Development build: React and Blac run their dev-only checks, which
            skews ratios. Use <code>pnpm --filter perf bench</code> for numbers.
          </p>
        )}
        <div className="tabs">
          {[...SUITE_KEYS, 'report' as const].map((t) => (
            <button
              key={t}
              className={`tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t === 'report' ? 'Report' : SUITES[t].label}
            </button>
          ))}
        </div>
      </header>

      <div className="controls">
        {suite && sel && tab !== 'report' && (
          <>
            <Checklist
              legend="Libraries"
              options={suite.libraries.map((l) => ({ key: l, label: l }))}
              selected={sel.libs}
              disabled={running}
              onChange={(libs) => update(tab, { libs })}
            />
            <Checklist
              legend={suite.itemsLabel}
              options={suite.items}
              selected={sel.items}
              disabled={running}
              onChange={(items) => update(tab, { items })}
            />
            <fieldset>
              <legend>Samples</legend>
              <NumberInput
                label="Warmup"
                min={0}
                value={sel.config.warmup}
                disabled={running}
                onChange={(warmup) =>
                  update(tab, { config: { ...sel.config, warmup } })
                }
              />
              <NumberInput
                label="Measured"
                min={1}
                value={sel.config.samples}
                disabled={running}
                onChange={(samples) =>
                  update(tab, { config: { ...sel.config, samples } })
                }
              />
            </fieldset>
          </>
        )}
        <div className="actions">
          {tab !== 'report' && (
            <button
              className="btn-run"
              disabled={running || sel?.libs.size === 0}
              onClick={() => void run([tab])}
            >
              {running ? 'Running…' : `Run ${SUITES[tab].label}`}
            </button>
          )}
          <button
            className="btn-run"
            disabled={running}
            onClick={() => void run(SUITE_KEYS)}
          >
            Run all
          </button>
          <button
            className="btn-export"
            onClick={() =>
              download(
                `benchmark-${Date.now()}.json`,
                JSON.stringify(
                  { env: currentEnvironment(), ...results },
                  null,
                  2,
                ),
                'application/json',
              )
            }
          >
            Export JSON
          </button>
        </div>
        {progress && <div className="progress-text">{progress}</div>}
      </div>

      {tab === 'report' ? (
        <div className="results-section">
          <button
            className="btn-export"
            onClick={() => void navigator.clipboard.writeText(report)}
          >
            Copy Markdown
          </button>
          <pre className="report">{report}</pre>
        </div>
      ) : (
        tables[tab].map((t) => <ComparisonTable key={t.title} table={t} />)
      )}

      <div ref={hostRef} className="bench-host" />
    </div>
  );
}
