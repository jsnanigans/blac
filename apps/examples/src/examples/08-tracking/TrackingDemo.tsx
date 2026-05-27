import { ExampleLayout } from '../../shared/ExampleLayout';
import { TrackingControls } from './TrackingControls';
import {
  ActionsOnlyConsumer,
  CityConsumer,
  ColorConsumer,
  CompletedGetterConsumer,
  ItemCountConsumer,
  ItemDoneConsumer,
  ItemTitleConsumer,
  ItemTitlesConsumer,
  MatrixCellConsumer,
  MatrixSumConsumer,
  ProfileBioConsumer,
  ThemeConsumer,
  UserEmailConsumer,
  UserNameConsumer,
  VersionConsumer,
  ZipConsumer,
} from './TrackingConsumers';

function ConsumerGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: 'var(--color-text-muted)',
        }}
      >
        {label}
      </span>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: 6,
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function TrackingDemo() {
  return (
    <ExampleLayout
      title="Tracking Lab"
      description="Single bloc · many consumers · one mutation at a time. Click any button on the left — only the chips on the right that read the touched path should tick their render counter. Doubles as a manual regression harness for the proxy auto-tracker."
      features={[
        'Nested paths (object → object → object)',
        'Array indices + bound .map()',
        'Nullable nested object (null ↔ object)',
        'Computed getter capture',
        'Per-consumer tracker isolation',
      ]}
    >
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 360px) 1fr',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <div style={{ position: 'sticky', top: 16 }}>
          <TrackingControls />
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            padding: 12,
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--border-radius)',
            background: 'var(--color-surface-hover)',
          }}
        >
          <div style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
            <strong style={{ color: 'var(--color-text)' }}>Consumers.</strong>{' '}
            Each chip is its own React component reading exactly one slice of
            the same shared <code>TrackingBloc</code>. The number in the corner
            is total renders for that component; it flashes amber on each tick.
          </div>

          <ConsumerGroup label="top-level">
            <ColorConsumer label="color (A)" />
            <ColorConsumer label="color (B)" />
            <ThemeConsumer />
            <VersionConsumer />
            <ActionsOnlyConsumer />
          </ConsumerGroup>

          <ConsumerGroup label="user.* (nested object)">
            <UserNameConsumer />
            <UserEmailConsumer />
            <CityConsumer />
            <ZipConsumer />
          </ConsumerGroup>

          <ConsumerGroup label="profile (nullable)">
            <ProfileBioConsumer />
          </ConsumerGroup>

          <ConsumerGroup label="items[] (array + indices + map)">
            <ItemCountConsumer />
            <ItemTitleConsumer index={0} />
            <ItemTitleConsumer index={1} />
            <ItemTitleConsumer index={2} />
            <ItemDoneConsumer index={0} />
            <ItemDoneConsumer index={1} />
            <ItemDoneConsumer index={2} />
            <ItemTitlesConsumer />
            <CompletedGetterConsumer />
          </ConsumerGroup>

          <ConsumerGroup label="matrix[][] (nested array)">
            <MatrixCellConsumer row={0} col={0} />
            <MatrixCellConsumer row={1} col={1} />
            <MatrixCellConsumer row={2} col={3} />
            <MatrixSumConsumer />
          </ConsumerGroup>
        </div>
      </section>

      <section className="stack-md" style={{ marginTop: 24 }}>
        <h2>What this lab proves</h2>
        <div className="stack-xs text-small text-muted">
          <p>
            • <strong>Per-consumer tracker:</strong> the two{' '}
            <code>color</code> chips each track their own paths via separate{' '}
            <code>useBloc</code> calls. One re-rendering doesn&rsquo;t leak the
            other&rsquo;s state.
          </p>
          <p>
            • <strong>Nested path swap:</strong> &ldquo;swap entire address
            obj&rdquo; replaces <code>user.address</code> wholesale — the{' '}
            <code>address.city</code> and <code>address.zip</code> chips still
            re-evaluate against the new sub-object.
          </p>
          <p>
            • <strong>Array index tracking:</strong> editing{' '}
            <code>items[1].title</code> only wakes the[1] chips. Reversing the
            list wakes every index chip because the value at each index
            actually changed.
          </p>
          <p>
            • <strong>Bound .map() cache:</strong> the{' '}
            <code>items.map(titles)</code> chip survives reorders / edits
            without binding <code>map</code> to a stale array.
          </p>
          <p>
            • <strong>Null transitions:</strong> flipping <code>profile</code>{' '}
            between an object and <code>null</code> still wakes the bio chip
            (used to silently drop the re-render).
          </p>
          <p>
            • <strong>Pinned consumer:</strong> the &ldquo;actions only&rdquo;
            chip reads no state and must never tick, regardless of which button
            you press.
          </p>
        </div>
      </section>
    </ExampleLayout>
  );
}
