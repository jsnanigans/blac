import { useState } from 'react';
import { ExampleLayout } from '../../shared/ExampleLayout';
import { UserCard } from './UserCard';
import { CanvasView } from './CanvasView';
import { MultiSourceCanvas } from './MultiSourceCanvas';

const USERS = ['alice', 'bob', 'carol'] as const;

/**
 * Demo for the three input lanes: args, deps, and multi-source deps.
 */
export function InputPatternDemo() {
  const [selectedUser, setSelectedUser] = useState<string>('alice');

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
      {/* Section 1 — args as identity */}
      <section className="stack-lg">
        <div className="stack-sm">
          <h2>1 — args as identity</h2>
          <p className="text-muted">
            Select a user below. The selected card and the pinned secondary card
            both use{' '}
            <code>useBloc(UserCardCubit, {'{ args: { userId } }'})</code>. When
            they share the same <code>userId</code>, they share one cubit
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

      {/* Section 2 — deps + onDepsChanged */}
      <section className="stack-lg">
        <div className="stack-sm">
          <h2>2 — deps + onDepsChanged</h2>
          <p className="text-muted">
            A canvas element ref is passed via{' '}
            <code>
              useBloc(CanvasCubit, {'{ autoInstance: true, deps: { canvas } }'})
            </code>
            .<code>onDepsChanged</code> fires when the canvas appears (starts
            the loop) or disappears (stops it). Unmounting the canvas element is
            enough to halt the RAF loop — no cleanup code needed in the
            component.
          </p>
        </div>

        <CanvasView />
      </section>

      {/* Section 3 — multi-source deps */}
      <section className="stack-lg">
        <div className="stack-sm">
          <h2>3 — multi-source deps</h2>
          <p className="text-muted">
            Two components contribute partial slices to the same cubit's deps.{' '}
            <code>CanvasProvider</code> supplies <code>{'{ canvas }'}</code> and{' '}
            <code>TickLogger</code> supplies <code>{'{ onTick }'}</code>. The
            core engine merges them. Removing <code>TickLogger</code> withdraws
            only its slice; the canvas animation continues unaffected.
          </p>
        </div>

        <MultiSourceCanvas />
      </section>

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
