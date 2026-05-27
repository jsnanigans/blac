import { useState } from 'react';
import { ExampleLayout } from '../../shared/ExampleLayout';
import { UserCard } from './UserCard';
import { DepsView } from './DepsView';
import { MultiSourceTicker } from './MultiSourceTicker';

const USERS = ['alice', 'bob', 'carol'] as const;

type DemoSection = 'none' | 'args' | 'deps' | 'multi';

const SECTIONS: { id: DemoSection; label: string }[] = [
  { id: 'none', label: 'None (baseline)' },
  { id: 'args', label: '1 — args' },
  { id: 'deps', label: '2 — deps' },
  { id: 'multi', label: '3 — multi-source' },
];

/**
 * Demo for the three input lanes: args, deps, and multi-source deps.
 *
 * A submenu renders only ONE section at a time so each lane can be tested in
 * isolation — useful for pinning down which one causes a freeze. Defaults to
 * "None" so the page mounts with nothing running.
 */
export function InputPatternDemo() {
  const [selectedUser, setSelectedUser] = useState<string>('alice');
  const [section, setSection] = useState<DemoSection>('none');

  return (
    <ExampleLayout
      title="Args · Deps · onDepsChanged"
      description="Three lanes for feeding external data into cubits: args for identity-keyed instances, deps for non-serializable handles, and multi-source deps merged from multiple consumers."
      features={[
        'args: identity keying via static key()',
        'Two cards with the same userId share one instance',
        'deps: canvas ref wired to an animation loop',
        'onDepsChanged: start/stop when handle appears/disappears',
        'Multi-source deps: two components contribute partial slices',
      ]}
    >
      {/* Submenu — render only one section at a time to isolate the culprit */}
      <div
        className="card stack-sm"
        style={{ position: 'sticky', top: 0, zIndex: 1 }}
      >
        <span className="text-small text-muted">
          Show one section at a time (isolation):
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              className={section === s.id ? 'primary' : 'ghost'}
              onClick={() => setSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section 1 — args as identity */}
      {section === 'args' && (
      <section className="stack-lg">
        <div className="stack-sm">
          <h2>1 — args as identity</h2>
          <p className="text-muted">
            Select a user below. The selected card and the pinned secondary card
            both use{' '}
            <code>useBloc(UserCardCubit, {'{ args: { userId } }'})</code>.
            When they share the same <code>userId</code>, they share one cubit
            instance — likes and online status are reflected in both panels
            simultaneously.
          </p>
        </div>

        {/* User picker */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {USERS.map((id) => (
            <button
              key={id}
              className={selectedUser === id ? 'primary' : 'ghost'}
              onClick={() => setSelectedUser(id)}
            >
              {id}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-md">
          <div className="stack-sm">
            <span className="text-small text-muted">Selected user</span>
            <UserCard userId={selectedUser} label="primary mount" />
          </div>

          <div className="stack-sm">
            <span className="text-small text-muted">
              Pinned to <code>alice</code>
            </span>
            <UserCard userId="alice" label="secondary mount" />
            <p className="text-small text-muted">
              When primary is also <em>alice</em>, both cards are the same
              instance — editing one updates both instantly.
            </p>
          </div>
        </div>
      </section>
      )}

      {/* Section 2 — deps + onDepsChanged */}
      {section === 'deps' && (
      <section className="stack-lg">
        <div className="stack-sm">
          <h2>2 — deps + onDepsChanged</h2>
          <p className="text-muted">
            A DOM element ref is passed via{' '}
            <code>useBloc(TickerCubit, {'{ autoInstance: true, deps: { display } }'})</code>.
            <code>onDepsChanged</code> fires when the element appears or
            disappears; the cubit writes the tick count into it imperatively. The
            loop is opt-in (Start/Stop) and runs at a slow 500ms cadence.
          </p>
        </div>

        <DepsView />
      </section>
      )}

      {/* Section 3 — multi-source deps */}
      {section === 'multi' && (
      <section className="stack-lg">
        <div className="stack-sm">
          <h2>3 — multi-source deps</h2>
          <p className="text-muted">
            Three components share one cubit instance. <code>DisplayProvider</code>{' '}
            supplies <code>{'{ display }'}</code>, <code>TickLogger</code>{' '}
            supplies <code>{'{ onTick }'}</code>, and a controls panel drives
            start/stop/step. The core engine merges the slices. Removing{' '}
            <code>TickLogger</code> withdraws only its slice; the display keeps
            updating.
          </p>
        </div>

        <MultiSourceTicker />
      </section>
      )}

      {/* Concept summary */}
      <section className="stack-md">
        <h2>Key Concepts</h2>
        <div className="stack-xs text-small text-muted">
          <p>
            <strong>args:</strong> Serializable identity data. Different args
            values produce distinct instances; the same args key shares an
            instance (and its state) across all consumers. Override{' '}
            <code>static key(args)</code> for a stable string key; otherwise a
            structural hash is used.
          </p>
          <p>
            <strong>deps:</strong> Non-serializable handles (DOM refs,
            callbacks, controllers). Never affect instance identity. Each{' '}
            <code>useBloc</code> call contributes a partial slice; the core
            engine shallow-merges them per consumer.
          </p>
          <p>
            <strong>onDepsChanged(next, prev):</strong> Fires post-merge
            whenever the merged deps view changes. Use it to start/stop
            imperative loops, subscribe to controllers, or hold refs — all
            inside the cubit, keeping components thin.
          </p>
        </div>
      </section>
    </ExampleLayout>
  );
}
