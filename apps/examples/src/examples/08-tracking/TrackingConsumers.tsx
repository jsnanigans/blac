import { useBloc } from '@blac/react';
import { RenderCounter } from '../../shared/components';
import { TrackingBloc } from './TrackingBloc';

interface ChipProps {
  title: string;
  reads: string;
  value: React.ReactNode;
  accent?: string;
}

function ConsumerChip({ title, reads, value, accent }: ChipProps) {
  return (
    <div
      style={{
        position: 'relative',
        padding: '8px 10px',
        paddingRight: 36,
        border: '1px solid var(--color-border)',
        borderLeft: `3px solid ${accent ?? 'var(--color-primary)'}`,
        borderRadius: 'var(--border-radius-sm)',
        background: 'var(--color-surface)',
        fontSize: 12,
        minHeight: 64,
      }}
    >
      <RenderCounter name={title} />
      <div style={{ fontWeight: 600, fontSize: 12, lineHeight: 1.2 }}>
        {title}
      </div>
      <code
        style={{
          display: 'block',
          fontSize: 10,
          color: 'var(--color-text-muted)',
          fontFamily: 'var(--font-mono)',
          marginTop: 2,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {reads}
      </code>
      <div style={{ fontSize: 13, fontWeight: 500, marginTop: 4 }}>{value}</div>
    </div>
  );
}

export function ColorConsumer({ label = 'color' }: { label?: string }) {
  const [state] = useBloc(TrackingBloc);
  return (
    <ConsumerChip
      title={label}
      reads="state.color"
      accent={state.color}
      value={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              display: 'inline-block',
              width: 12,
              height: 12,
              borderRadius: '50%',
              background: state.color,
            }}
          />
          <code style={{ fontSize: 11 }}>{state.color}</code>
        </span>
      }
    />
  );
}

export function ThemeConsumer() {
  const [state] = useBloc(TrackingBloc);
  return <ConsumerChip title="theme" reads="state.theme" value={state.theme} />;
}

export function VersionConsumer() {
  const [state] = useBloc(TrackingBloc);
  return (
    <ConsumerChip
      title="version"
      reads="state.version"
      value={`v${state.version}`}
    />
  );
}

export function UserNameConsumer() {
  const [state] = useBloc(TrackingBloc);
  return (
    <ConsumerChip
      title="user.name"
      reads="state.user.name"
      value={state.user.name}
    />
  );
}

export function UserEmailConsumer() {
  const [state] = useBloc(TrackingBloc);
  return (
    <ConsumerChip
      title="user.email"
      reads="state.user.email"
      value={state.user.email}
    />
  );
}

export function CityConsumer() {
  const [state] = useBloc(TrackingBloc);
  return (
    <ConsumerChip
      title="address.city"
      reads="state.user.address.city"
      value={state.user.address.city}
    />
  );
}

export function ZipConsumer() {
  const [state] = useBloc(TrackingBloc);
  return (
    <ConsumerChip
      title="address.zip"
      reads="state.user.address.zip"
      value={state.user.address.zip}
    />
  );
}

export function ProfileBioConsumer() {
  const [state] = useBloc(TrackingBloc);
  return (
    <ConsumerChip
      title="profile.bio"
      reads="state.profile?.bio"
      accent={state.profile ? 'var(--color-success)' : 'var(--color-danger)'}
      value={
        state.profile?.bio ?? (
          <em style={{ color: 'var(--color-text-muted)' }}>— null —</em>
        )
      }
    />
  );
}

export function ItemCountConsumer() {
  const [state] = useBloc(TrackingBloc);
  return (
    <ConsumerChip
      title="items.length"
      reads="state.items.length"
      value={state.items.length}
    />
  );
}

export function ItemTitleConsumer({ index }: { index: number }) {
  const [state] = useBloc(TrackingBloc);
  const item = state.items[index];
  return (
    <ConsumerChip
      title={`items[${index}].title`}
      reads={`state.items[${index}].title`}
      accent={item?.done ? 'var(--color-success)' : 'var(--color-primary)'}
      value={
        item ? (
          item.title
        ) : (
          <em style={{ color: 'var(--color-text-muted)' }}>— missing —</em>
        )
      }
    />
  );
}

export function ItemDoneConsumer({ index }: { index: number }) {
  const [state] = useBloc(TrackingBloc);
  const item = state.items[index];
  return (
    <ConsumerChip
      title={`items[${index}].done`}
      reads={`state.items[${index}].done`}
      accent={item?.done ? 'var(--color-success)' : 'var(--color-warning)'}
      value={
        item ? (
          String(item.done)
        ) : (
          <em style={{ color: 'var(--color-text-muted)' }}>— missing —</em>
        )
      }
    />
  );
}

export function ItemTitlesConsumer() {
  const [state] = useBloc(TrackingBloc);
  const titles = state.items.map((item) => item.title);
  return (
    <ConsumerChip
      title="items.map(titles)"
      reads="state.items.map(i => i.title)"
      accent="var(--color-secondary)"
      value={
        <span style={{ fontSize: 11, fontWeight: 400 }}>
          {titles.join(' · ')}
        </span>
      }
    />
  );
}

export function CompletedGetterConsumer() {
  const [, bloc] = useBloc(TrackingBloc);
  return (
    <ConsumerChip
      title="completedCount (getter)"
      reads="bloc.completedCount"
      accent="var(--color-secondary)"
      value={bloc.completedCount}
    />
  );
}

export function MatrixCellConsumer({ row, col }: { row: number; col: number }) {
  const [state] = useBloc(TrackingBloc);
  return (
    <ConsumerChip
      title={`matrix[${row}][${col}]`}
      reads={`state.matrix[${row}][${col}]`}
      value={state.matrix[row]?.[col] ?? '—'}
    />
  );
}

export function MatrixSumConsumer() {
  const [, bloc] = useBloc(TrackingBloc);
  return (
    <ConsumerChip
      title="matrixSum (getter)"
      reads="bloc.matrixSum"
      accent="var(--color-secondary)"
      value={bloc.matrixSum}
    />
  );
}

export function ActionsOnlyConsumer() {
  const [, bloc] = useBloc(TrackingBloc);
  void bloc;
  return (
    <ConsumerChip
      title="actions only"
      reads="// no state.* reads"
      accent="var(--color-warning)"
      value={
        <span style={{ color: 'var(--color-text-muted)' }}>— pinned —</span>
      }
    />
  );
}
