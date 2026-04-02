import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_CONFIG,
  DEFAULT_PURE_CONFIG,
  runPureStateBenchmark,
  runReactBenchmark,
  type ProgressCallback,
  type PureStateRunConfig,
  type RunConfig,
} from '../harness/BenchmarkRunner';
import {
  ProfilerWrapper,
  type ProfilerHandle,
} from '../harness/ProfilerWrapper';
import {
  DEFAULT_RERENDER_CONFIG,
  runRerenderBenchmark,
  type RerenderRunConfig,
} from '../harness/RerenderRunner';
import { libraries } from '../libraries/registry';
import { rerenderLibraries } from '../libraries/rerender-registry';
import { ALL_RERENDER_SCENARIOS } from '../shared/rerender-scenarios';
import type {
  BenchmarkAPI,
  LibraryResults,
  OperationName,
  PureStateResult,
  RerenderBenchmarkAPI,
  RerenderLibraryResults,
  RerenderOperationResult,
  RerenderScenario,
} from '../shared/types';
import { OPERATION_LABELS, RERENDER_SCENARIO_LABELS } from '../shared/types';
import { BenchmarkReport } from './BenchmarkReport';
import { PureStateResults } from './PureStateResults';
import { RerenderResultsTable } from './RerenderResultsTable';
import { ResultsTable } from './ResultsTable';

type Tab = 'react' | 'rerender' | 'pure-state' | 'report';

export const Dashboard: React.FC = () => {
  const [tab, setTab] = useState<Tab>('react');
  const [selectedLibs, setSelectedLibs] = useState<Set<string>>(
    () => new Set(libraries.map((l) => l.name)),
  );
  const [selectedOps, setSelectedOps] = useState<Set<OperationName>>(
    () => new Set(DEFAULT_CONFIG.operations),
  );
  const [config, setConfig] = useState<RunConfig>(DEFAULT_CONFIG);
  const [pureConfig, setPureConfig] =
    useState<PureStateRunConfig>(DEFAULT_PURE_CONFIG);

  const allPureOps = useMemo(() => {
    const ops = new Set<string>();
    for (const lib of libraries) {
      for (const opName of Object.keys(lib.pureState.operations)) {
        ops.add(opName);
      }
    }
    return [...ops];
  }, []);

  const [selectedPureOps, setSelectedPureOps] = useState<Set<string>>(
    () => new Set(allPureOps),
  );

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState('');
  const [reactResults, setReactResults] = useState<LibraryResults[]>([]);
  const [pureResults, setPureResults] = useState<PureStateResult[]>([]);
  const [rerenderResults, setRerenderResults] = useState<
    RerenderLibraryResults[]
  >([]);
  const [selectedRerenderLibs, setSelectedRerenderLibs] = useState<Set<string>>(
    () => new Set(rerenderLibraries.map((l) => l.name)),
  );
  const [selectedScenarios, setSelectedScenarios] = useState<
    Set<RerenderScenario>
  >(() => new Set(ALL_RERENDER_SCENARIOS));
  const [rerenderConfig, setRerenderConfig] = useState<RerenderRunConfig>(
    DEFAULT_RERENDER_CONFIG,
  );

  const rerenderApiRef = useRef<RerenderBenchmarkAPI | null>(null);
  const [mountedRerender, setMountedRerender] = useState<{
    lib: string;
    scenario: RerenderScenario;
  } | null>(null);
  const mountedRerenderRef = useRef<{
    lib: string;
    scenario: RerenderScenario;
  } | null>(null);

  // refs for the currently mounted benchmark
  const apiRef = useRef<BenchmarkAPI | null>(null);
  const profilerRef = useRef<ProfilerHandle>(null);
  const [mountedLib, setMountedLib] = useState<string | null>(null);
  const mountedLibRef = useRef<string | null>(null);

  const toggleLib = (name: string) => {
    setSelectedLibs((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleOp = (op: OperationName) => {
    setSelectedOps((prev) => {
      const next = new Set(prev);
      if (next.has(op)) next.delete(op);
      else next.add(op);
      return next;
    });
  };

  const togglePureOp = (op: string) => {
    setSelectedPureOps((prev) => {
      const next = new Set(prev);
      if (next.has(op)) next.delete(op);
      else next.add(op);
      return next;
    });
  };

  const toggleRerenderLib = (name: string) => {
    setSelectedRerenderLibs((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleScenario = (scenario: RerenderScenario) => {
    setSelectedScenarios((prev) => {
      const next = new Set(prev);
      if (next.has(scenario)) next.delete(scenario);
      else next.add(scenario);
      return next;
    });
  };

  const onReady = useCallback((api: BenchmarkAPI) => {
    apiRef.current = api;
  }, []);

  const onProgress: ProgressCallback = (op, phase, current, total) => {
    setProgress(
      `${mountedLibRef.current}: ${OPERATION_LABELS[op]} — ${phase} ${current}/${total}`,
    );
  };

  const runReactBenchmarks = async () => {
    setRunning(true);
    setReactResults([]);
    const results: LibraryResults[] = [];

    const activeLibs = libraries.filter((l) => selectedLibs.has(l.name));
    const runConfig: RunConfig = {
      ...config,
      operations: [...selectedOps],
    };

    for (const lib of activeLibs) {
      mountedLibRef.current = lib.name;
      setMountedLib(lib.name);
      apiRef.current = null;

      // wait for component to mount and call onReady
      await new Promise<void>((resolve) => {
        const check = setInterval(() => {
          if (apiRef.current) {
            clearInterval(check);
            resolve();
          }
        }, 50);
      });

      if (!apiRef.current || !profilerRef.current) continue;

      setProgress(`Running ${lib.name}...`);
      const result = await runReactBenchmark(
        lib.name,
        apiRef.current,
        profilerRef.current,
        runConfig,
        onProgress,
      );
      results.push(result);
    }

    setMountedLib(null);
    setReactResults(results);
    setProgress('');
    setRunning(false);
  };

  const runRerenderBenchmarks = async () => {
    setRunning(true);
    setRerenderResults([]);
    const results: RerenderLibraryResults[] = [];

    const activeLibs = rerenderLibraries.filter((l) =>
      selectedRerenderLibs.has(l.name),
    );
    const activeScenarios = [...selectedScenarios];
    const runConfig: RerenderRunConfig = {
      ...rerenderConfig,
      scenarios: activeScenarios,
    };

    for (const lib of activeLibs) {
      const scenarioResults: RerenderOperationResult[] = [];

      for (const scenario of activeScenarios) {
        mountedRerenderRef.current = { lib: lib.name, scenario };
        setMountedRerender({ lib: lib.name, scenario });
        rerenderApiRef.current = null;

        await new Promise<void>((resolve) => {
          const check = setInterval(() => {
            if (rerenderApiRef.current) {
              clearInterval(check);
              resolve();
            }
          }, 50);
        });

        if (!rerenderApiRef.current || !profilerRef.current) continue;

        setProgress(`${lib.name}: ${RERENDER_SCENARIO_LABELS[scenario]}...`);
        const result = await runRerenderBenchmark(
          rerenderApiRef.current,
          profilerRef.current,
          scenario,
          runConfig,
          (s, phase, current, total) => {
            setProgress(
              `${lib.name}: ${RERENDER_SCENARIO_LABELS[s]} — ${phase} ${current}/${total}`,
            );
          },
        );
        scenarioResults.push(result);
      }

      results.push({
        library: lib.name,
        scenarios: scenarioResults,
        timestamp: Date.now(),
      });
    }

    setMountedRerender(null);
    setRerenderResults(results);
    setProgress('');
    setRunning(false);
  };

  const runPureBenchmarks = async () => {
    setRunning(true);
    setPureResults([]);
    const allResults: PureStateResult[] = [];

    const activeLibs = libraries.filter((l) => selectedLibs.has(l.name));

    const runConfig: PureStateRunConfig = {
      ...pureConfig,
      operations: selectedPureOps,
    };

    for (const lib of activeLibs) {
      const results = await runPureStateBenchmark(
        lib.pureState,
        runConfig,
        (op, phase, current, total) => {
          setProgress(`${lib.name}: ${op} — ${phase} ${current}/${total}`);
        },
      );
      allResults.push(...results);
    }

    setPureResults(allResults);
    setProgress('');
    setRunning(false);
  };

  const exportResults = () => {
    const data = {
      react: reactResults,
      rerender: rerenderResults,
      pureState: pureResults,
      config,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `benchmark-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const MountedComponent = mountedLib
    ? libraries.find((l) => l.name === mountedLib)?.Component
    : null;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <h1>React State Management Benchmarks</h1>
        <div className="tabs">
          <button
            className={`tab ${tab === 'react' ? 'active' : ''}`}
            onClick={() => setTab('react')}
          >
            React Benchmarks
          </button>
          <button
            className={`tab ${tab === 'rerender' ? 'active' : ''}`}
            onClick={() => setTab('rerender')}
          >
            Re-render Benchmarks
          </button>
          <button
            className={`tab ${tab === 'pure-state' ? 'active' : ''}`}
            onClick={() => setTab('pure-state')}
          >
            Pure State
          </button>
          <button
            className={`tab ${tab === 'report' ? 'active' : ''}`}
            onClick={() => setTab('report')}
          >
            Detailed Report
          </button>
        </div>
      </header>

      {tab !== 'report' && (
        <div className="controls">
          {(tab === 'react' || tab === 'pure-state') && (
            <fieldset>
              <legend>Libraries</legend>
              {libraries.map((lib) => (
                <label key={lib.name} className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={selectedLibs.has(lib.name)}
                    onChange={() => toggleLib(lib.name)}
                    disabled={running}
                  />
                  {lib.name}
                </label>
              ))}
            </fieldset>
          )}

          {tab === 'react' && (
            <>
              <fieldset>
                <legend>Operations</legend>
                {DEFAULT_CONFIG.operations.map((op) => (
                  <label key={op} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedOps.has(op)}
                      onChange={() => toggleOp(op)}
                      disabled={running}
                    />
                    {OPERATION_LABELS[op]}
                  </label>
                ))}
              </fieldset>

              <fieldset>
                <legend>Config</legend>
                <label className="config-label">
                  Warmup runs:
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={config.warmupRuns}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        warmupRuns: parseInt(e.target.value) || 0,
                      }))
                    }
                    disabled={running}
                  />
                </label>
                <label className="config-label">
                  Measured runs:
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={config.measuredRuns}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        measuredRuns: parseInt(e.target.value) || 1,
                      }))
                    }
                    disabled={running}
                  />
                </label>
              </fieldset>
            </>
          )}

          {tab === 'rerender' && (
            <>
              <fieldset>
                <legend>Libraries</legend>
                {rerenderLibraries.map((lib) => (
                  <label key={lib.name} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedRerenderLibs.has(lib.name)}
                      onChange={() => toggleRerenderLib(lib.name)}
                      disabled={running}
                    />
                    {lib.name}
                  </label>
                ))}
              </fieldset>

              <fieldset>
                <legend>Scenarios</legend>
                {ALL_RERENDER_SCENARIOS.map((scenario) => (
                  <label key={scenario} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedScenarios.has(scenario)}
                      onChange={() => toggleScenario(scenario)}
                      disabled={running}
                    />
                    {RERENDER_SCENARIO_LABELS[scenario]}
                  </label>
                ))}
              </fieldset>

              <fieldset>
                <legend>Config</legend>
                <label className="config-label">
                  Warmup runs:
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={rerenderConfig.warmupRuns}
                    onChange={(e) =>
                      setRerenderConfig((c) => ({
                        ...c,
                        warmupRuns: parseInt(e.target.value) || 0,
                      }))
                    }
                    disabled={running}
                  />
                </label>
                <label className="config-label">
                  Measured runs:
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={rerenderConfig.measuredRuns}
                    onChange={(e) =>
                      setRerenderConfig((c) => ({
                        ...c,
                        measuredRuns: parseInt(e.target.value) || 1,
                      }))
                    }
                    disabled={running}
                  />
                </label>
              </fieldset>
            </>
          )}

          {tab === 'pure-state' && (
            <>
              <fieldset>
                <legend>Operations</legend>
                {allPureOps.map((op) => (
                  <label key={op} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedPureOps.has(op)}
                      onChange={() => togglePureOp(op)}
                      disabled={running}
                    />
                    {op}
                  </label>
                ))}
              </fieldset>

              <fieldset>
                <legend>Config</legend>
                <label className="config-label">
                  Warmup iterations:
                  <input
                    type="number"
                    min={0}
                    max={500}
                    value={pureConfig.warmup}
                    onChange={(e) =>
                      setPureConfig((c) => ({
                        ...c,
                        warmup: parseInt(e.target.value) || 0,
                      }))
                    }
                    disabled={running}
                  />
                </label>
                <label className="config-label">
                  Measured iterations:
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={pureConfig.iterations}
                    onChange={(e) =>
                      setPureConfig((c) => ({
                        ...c,
                        iterations: parseInt(e.target.value) || 1,
                      }))
                    }
                    disabled={running}
                  />
                </label>
              </fieldset>
            </>
          )}

          <div className="actions">
            <button
              className="btn-run"
              onClick={
                tab === 'react'
                  ? runReactBenchmarks
                  : tab === 'rerender'
                    ? runRerenderBenchmarks
                    : runPureBenchmarks
              }
              disabled={
                running ||
                (tab === 'rerender'
                  ? selectedRerenderLibs.size === 0
                  : selectedLibs.size === 0)
              }
            >
              {running ? 'Running...' : 'Run Benchmarks'}
            </button>
            {(reactResults.length > 0 ||
              rerenderResults.length > 0 ||
              pureResults.length > 0) && (
              <button className="btn-export" onClick={exportResults}>
                Export JSON
              </button>
            )}
          </div>

          {progress && <div className="progress-text">{progress}</div>}
        </div>
      )}

      {tab === 'react' && (
        <>
          <ResultsTable results={reactResults} />
          {mountedLib && MountedComponent && (
            <div className="benchmark-viewport">
              <ProfilerWrapper id={mountedLib} ref={profilerRef}>
                <MountedComponent onReady={onReady} />
              </ProfilerWrapper>
            </div>
          )}
        </>
      )}

      {tab === 'rerender' && (
        <>
          <RerenderResultsTable results={rerenderResults} />
          {mountedRerender &&
            (() => {
              const RerenderComponent = rerenderLibraries.find(
                (l) => l.name === mountedRerender.lib,
              )?.Component;
              return RerenderComponent ? (
                <div className="benchmark-viewport">
                  <ProfilerWrapper
                    id={`${mountedRerender.lib}-${mountedRerender.scenario}`}
                    ref={profilerRef}
                  >
                    <RerenderComponent
                      scenario={mountedRerender.scenario}
                      onReady={(api) => {
                        rerenderApiRef.current = api;
                      }}
                    />
                  </ProfilerWrapper>
                </div>
              ) : null;
            })()}
        </>
      )}

      {tab === 'pure-state' && <PureStateResults results={pureResults} />}

      {tab === 'report' && (
        <BenchmarkReport
          pureResults={pureResults}
          reactResults={reactResults}
        />
      )}
    </div>
  );
};
