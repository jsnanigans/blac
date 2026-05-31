/**
 * Showcase demo: Analytics dashboard
 *
 * Shows: multiple Cubits (StatsCubit + ActivityCubit) coordinated in the UI,
 * real-time simulation, formatted derived values, coexisting independent
 * state trees — all without a provider.
 *
 * All exports are plain strings (no runtime imports) so this module is
 * SSR-safe and can be imported anywhere in VitePress.
 */

export const statsCubitTs = `import { Cubit } from '@blac/core';

export interface StatsState {
  visitors: number;
  revenue: number;
  orders: number;
  running: boolean;
}

export class StatsCubit extends Cubit<StatsState> {
  private _timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    super({ visitors: 1_234, revenue: 48_250, orders: 312, running: false });
  }

  tick = () => {
    this.patch({
      visitors: this.state.visitors + Math.floor(Math.random() * 30 + 5),
      revenue: this.state.revenue + Math.floor(Math.random() * 400 + 50),
      orders: this.state.orders + Math.floor(Math.random() * 8 + 1),
    });
  };

  startLive = () => {
    if (this._timer !== null) return;
    this.patch({ running: true });
    this._timer = setInterval(this.tick, 1500);
  };

  stopLive = () => {
    if (this._timer !== null) {
      clearInterval(this._timer);
      this._timer = null;
    }
    this.patch({ running: false });
  };

  get formattedRevenue(): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(this.state.revenue);
  }
}
`;

export const activityCubitTs = `import { Cubit } from '@blac/core';

export interface ActivityEntry {
  id: string;
  message: string;
  time: string;
}

export interface ActivityState {
  entries: ActivityEntry[];
}

export class ActivityCubit extends Cubit<ActivityState> {
  constructor() {
    super({
      entries: [
        { id: '0', message: 'Dashboard initialized', time: new Date().toLocaleTimeString() },
      ],
    });
  }

  addEntry = (message: string) => {
    this.patch({
      entries: [
        ...this.state.entries,
        { id: crypto.randomUUID(), message, time: new Date().toLocaleTimeString() },
      ].slice(-8), // keep last 8
    });
  };
}
`;

export const appTsx = `import { useEffect } from 'react';
import { useBloc } from '@blac/react';
import { StatsCubit } from './StatsCubit';
import { ActivityCubit } from './ActivityCubit';
import './styles.css';

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-card">
      <span className="stat-label">{label}</span>
      <span className="stat-value">{value}</span>
    </div>
  );
}

function StatsRow() {
  const [state, cubit] = useBloc(StatsCubit);
  return (
    <div className="stats-row">
      <StatCard label="Visitors" value={state.visitors.toLocaleString()} />
      <StatCard label="Revenue" value={cubit.formattedRevenue} />
      <StatCard label="Orders" value={state.orders.toLocaleString()} />
    </div>
  );
}

function ActivityFeed() {
  const [state] = useBloc(ActivityCubit);
  return (
    <div className="activity">
      <h3 className="section-title">Activity log</h3>
      <ul className="activity-list">
        {[...state.entries].reverse().map((e) => (
          <li key={e.id} className="activity-item">
            <span className="activity-time">{e.time}</span>
            <span className="activity-msg">{e.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function App() {
  const [statsState, statsCubit] = useBloc(StatsCubit);
  const [, activityCubit] = useBloc(ActivityCubit);

  // Log to activity feed whenever stats update
  useEffect(() => {
    if (!statsState.running) return;
    activityCubit.addEntry(
      \`Stats refreshed — orders: \${statsState.orders.toLocaleString()}\`,
    );
  }, [statsState.visitors]);

  return (
    <div className="demo">
      <div className="header">
        <h2>Analytics dashboard</h2>
        <button
          className={\`live-btn\${statsState.running ? ' active' : ''}\`}
          onClick={statsState.running ? statsCubit.stopLive : statsCubit.startLive}
        >
          {statsState.running ? '⏸ Pause' : '▶ Go live'}
        </button>
      </div>
      <p className="hint">
        Two independent Cubits — <code>StatsCubit</code> and{' '}
        <code>ActivityCubit</code> — coordinated via React effects. No provider
        needed.
      </p>

      <StatsRow />
      <ActivityFeed />
    </div>
  );
}
`;

export const stylesCss = `* { box-sizing: border-box; }

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #ffffff;
  color: #1f2430;
}

.demo {
  padding: 20px;
  max-width: 520px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.header h2 { margin: 0; font-size: 20px; }

.hint {
  margin: 0 0 16px;
  font-size: 13px;
  color: #5a6373;
  line-height: 1.5;
}

.hint code {
  background: #eef0f4;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 12px;
}

.live-btn {
  appearance: none;
  border-radius: 8px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid #c8cdd8;
  background: #fff;
  color: #3a4054;
  transition: background 0.1s;
}

.live-btn:hover { background: #f2f4f8; }

.live-btn.active {
  background: #eef7f0;
  border-color: #38a169;
  color: #276749;
}

.live-btn.active:hover { background: #dcf0e4; }

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 16px;
}

.stat-card {
  border: 1px solid #e2e5ec;
  border-radius: 10px;
  padding: 14px;
  background: #fafbfc;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-label {
  font-size: 12px;
  color: #8890a0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-weight: 500;
}

.stat-value {
  font-size: 22px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #1f2430;
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 10px;
  color: #3a4054;
}

.activity {
  border: 1px solid #e2e5ec;
  border-radius: 10px;
  padding: 14px;
  background: #fafbfc;
}

.activity-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.activity-item {
  display: flex;
  gap: 10px;
  font-size: 13px;
}

.activity-time {
  color: #8890a0;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
  flex-shrink: 0;
}

.activity-msg { color: #1f2430; }
`;

/**
 * Pass directly to <BlacSandpack :files="dashboardShowcaseFiles" />.
 */
export const dashboardShowcaseFiles: Record<string, string> = {
  '/App.tsx': appTsx,
  '/StatsCubit.ts': statsCubitTs,
  '/ActivityCubit.ts': activityCubitTs,
  '/styles.css': stylesCss,
};
