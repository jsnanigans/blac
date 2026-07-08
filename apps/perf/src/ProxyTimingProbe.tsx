/**
 * Real-browser timing probe (NOT a benchmark).
 *
 * Rendered on the `/debug` page (e.g. http://localhost:3001/debug); reproduces
 * the parent→child proxy-prop scenario from
 * useBloc.proxy-prop-tracing.test.tsx, but in a real
 * browser event loop (no act(), no test-runner flush). Its purpose is to
 * answer: does the disarm() microtask fire BEFORE React's passive effects (a
 * MessageChannel macrotask) — i.e. are effect-time proxy reads actually frozen
 * in production, unlike under act()?
 *
 * Read the on-screen timeline (also mirrored to the console). Look at the order
 * of `disarm` vs the Child/Parent passive-effect reads:
 *   - disarm BEFORE effect reads -> effect reads log `pass-through armed=false` (frozen; browser-correct)
 *   - disarm AFTER  effect reads -> effect reads log `record armed=true`        (act() artifact)
 */
import { Cubit } from "@blac/core";
import { untracked, useBloc } from "@blac/react";
import { __setTrackTrace, type TrackTraceEvent } from "@dirtytalk/structural";
import React, { memo, useEffect, useLayoutEffect, useState } from "react";

interface Item {
  id: number;
  label: string;
}
interface DemoState {
  data: Item[];
  selected: number | null;
}

class ProbeBloc extends Cubit<DemoState> {
  constructor() {
    super({
      data: [
        { id: 1, label: "one" },
        { id: 2, label: "two" },
        { id: 3, label: "three" },
      ],
      selected: null,
    });
  }
  renameFirst = (): void => {
    const data = this.state.data.slice();
    data[0] = { id: data[0].id, label: data[0].label + "!" };
    this.emit({ ...this.state, data });
  };
}

// ---- timeline (module scope) ----
const timeline: string[] = [];
let seq = 0;
let phase = "idle";
const t0 = performance.now();
const instanceOwner = new Map<number, string>();

const rec = (msg: string): void => {
  const line = `${String(++seq).padStart(3, " ")} +${(performance.now() - t0)
    .toFixed(2)
    .padStart(8)}ms [${phase.padEnd(6)}] ${msg}`;
  timeline.push(line);
  // eslint-disable-next-line no-console
  console.log(line);
};

const onTrace = (e: TrackTraceEvent): void => {
  if (e.kind === "root-wrap") instanceOwner.set(e.instance, phase);
  const owner = instanceOwner.get(e.instance) ?? "?";
  const loc =
    e.path ??
    (e.key ? `${e.prefix}.${e.key}` : e.prefix === "" ? "(root)" : e.prefix);
  rec(
    `PROXY  ${e.kind.padEnd(12)} inst#${e.instance}(owner=${owner}) ${loc} armed=${e.armed}`,
  );
};

// Installed lazily, only when the probe first renders (see ProxyTimingProbe),
// so mounting the Dashboard never pays for global tracing.
let installed = false;

let capturedState: DemoState | null = null;

const Child = memo(function Child({ item }: { item: Item }) {
  phase = "Child";
  rec("RENDER Child begin");
  useLayoutEffect(() => {
    phase = "Child";
    rec("Child layoutEffect");
  }, []);
  useEffect(() => {
    phase = "Child";
    rec("Child passiveEffect — reading item.label:");
    void item.label;
    rec(`  (item.label = ${item.label})`);
  }, [item]);
  const id = item.id;
  const label = item.label;
  rec(`RENDER Child end (id=${id} label=${label})`);
  return (
    <tr>
      <td style={{ paddingRight: 12 }}>{id}</td>
      <td>{label}</td>
    </tr>
  );
});

const Scenario = memo(function Scenario() {
  phase = "Parent";
  rec("RENDER Parent begin");
  const [state] = useBloc(ProbeBloc);
  capturedState = state;
  useLayoutEffect(() => {
    phase = "Parent";
    rec("Parent layoutEffect");
  }, []);
  useEffect(() => {
    phase = "Parent";
    rec("Parent passiveEffect — reading state.data[0].label:");
    void state.data[0].label;
    rec(`  (state.data[0].label = ${state.data[0].label})`);
    // Anchor disarm relative to event-loop phases.
    queueMicrotask(() => {
      phase = "micro";
      rec("=== microtask checkpoint (post-commit) ===");
    });
    setTimeout(() => {
      phase = "macro";
      rec("=== setTimeout(0) macrotask ===");
      rec("post-commit read of captured proxy state.data[0].label:");
      void capturedState!.data[0].label;
      rec(`  (= ${capturedState!.data[0].label})`);
    }, 0);
  }, [state]);
  rec(`RENDER Parent: mapping ${state.data.length} rows`);
  const rows = state.data.map((item) => (
    <Child key={item.id} item={untracked(item)} />
  ));
  rec("RENDER Parent end");
  return (
    <table>
      <tbody>{rows}</tbody>
    </table>
  );
});

export const ProxyTimingProbe: React.FC = () => {
  // Install the trace hook synchronously in the parent's render body, before
  // React renders <Scenario/> in the same pass — guarantees the very first
  // trackRender is observed. Guarded so it only happens once.
  if (!installed) {
    installed = true;
    __setTrackTrace(onTrace);
    rec("=== trace installed (probe mounted) ===");
  }

  const [dump, setDump] = useState<string | null>(null);
  useEffect(() => {
    // Let microtasks + the setTimeout(0) macrotask settle, then snapshot.
    const id = setTimeout(() => setDump(timeline.join("\n")), 500);
    return () => {
      clearTimeout(id);
      __setTrackTrace(null);
    };
  }, []);

  return (
    <div style={{ fontFamily: "monospace", padding: 16, lineHeight: 1.4 }}>
      <h2>Proxy timing probe</h2>
      <p style={{ maxWidth: 720 }}>
        Scenario renders below; the timeline snapshot appears after ~500ms (also
        streamed to the console). Compare the position of <code>disarm</code>{" "}
        against the Child/Parent <code>passiveEffect</code> reads to see whether
        effect-time reads are frozen in a real browser.
      </p>
      <Scenario />
      {dump && (
        <pre
          style={{
            background: "#111",
            color: "#0f0",
            padding: 12,
            marginTop: 16,
            overflow: "auto",
            whiteSpace: "pre",
          }}
        >
          {dump}
        </pre>
      )}
    </div>
  );
};
